import { demoAxiosAdapter } from "@/demo/transport";
import axios, { type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { getActiveUserScope } from "@/lib/user-scope";
import { getActiveTeamContext } from "@/lib/team-context";
import { currentLocaleText } from "@/i18n/current-locale-text";
import { upstreamAPIMessage } from "@/i18n/upstream-errors";
import { mediaRecoveryAPIMessage } from "@/i18n/media-recovery";
import { refreshByokAfterConflict } from "@/lib/byok-conflict";
import { resolveAppLocale } from "@/i18n/app-locale";
import { productionText } from "@/i18n/production-tools";

export type ApiParams = Record<string, string | string[] | number | number[] | undefined>;

export type BackendEnvelope<T> = {
    code: number;
    data: T;
    msg: string;
    reason?: string;
    details?: Record<string, unknown>;
};

/**
 * 业务错误的统一载体：HTTP 200 只代表传输完成，code/reason 才决定业务是否成功。
 * 调用方应依赖机器可读字段做分支，message 仅用于向用户展示，避免把后端文案当协议解析。
 */

export class ApiError extends Error {
    readonly status?: number;
    readonly code?: number;
    readonly reason?: string;
    readonly details?: Record<string, unknown>;
    readonly retryable: boolean;
    readonly retryAfterMs?: number;
    readonly cause?: unknown;

    constructor(message: string, options: { status?: number; code?: number; reason?: string; details?: Record<string, unknown>; retryable?: boolean; retryAfterMs?: number; cause?: unknown } = {}) {
        super(
            message === "canvas_edit_lease_conflict"
                ? productionText(resolveAppLocale(), 23)
                : options.reason === "promotion_unavailable"
                  ? currentLocaleText("pricing.promoUnavailable")
                  : options.reason === "promotion_invalid"
                    ? currentLocaleText(promotionErrorKey(String(options.details?.reason || "invalid")))
                    : options.reason === "resource_url_ttl_invalid"
                      ? currentLocaleText("runtimeSafety.resourceTTLInvalid")
                      : upstreamAPIMessage(mediaRecoveryAPIMessage(options.reason, message)),
        );
        this.name = "ApiError";
        this.status = options.status;
        this.code = options.code;
        this.reason = options.reason;
        this.details = options.details;
        this.retryable = options.retryable ?? isRetryableStatus(options.status ?? options.code);
        this.retryAfterMs = options.retryAfterMs;
        this.cause = options.cause;
    }
}

function promotionErrorKey(reason: string) {
    const keys = {
        invalid: "pricing.promoInvalid",
        expired: "pricing.promoExpired",
        customer: "pricing.promoCustomer",
        minimum: "pricing.promoMinimum",
        first_order: "pricing.promoFirstOrder",
        product: "pricing.promoProduct",
        subscription_duration: "pricing.promoSubscriptionDuration",
        currency: "pricing.promoCurrency",
    } as const;
    return keys[reason as keyof typeof keys] || keys.invalid;
}

// 所有后端 JSON 请求共用同一实例，避免认证、Base URL 和错误语义在模块间漂移。
export const apiBaseURL = "/api";
export const apiClient = axios.create({ baseURL: apiBaseURL, withCredentials: false, adapter: demoAxiosAdapter });

const initiatingScope = Symbol("initiating-user-scope");
type ScopedRequestConfig = InternalAxiosRequestConfig & { [initiatingScope]?: string };

function isIdentityDiscoveryRequest(config: AxiosRequestConfig) {
    const path = new URL(config.url || "", "https://local.invalid").pathname;
    // Public login settings must survive session recovery changing an expired user scope to guest.
    return /(?:^|\/)auth\/(?:session|login|settings)$/.test(path) || path === "/bootstrap";
}

// Request interceptors are synchronous so the scope is captured before another
// account switch can occur while Axios schedules the adapter.
apiClient.interceptors.request.use(
    (config) => {
        config.headers.delete("X-Canvas-User-Scope");
        config.headers.delete("X-Canvas-Team-Id");
        if (isIdentityDiscoveryRequest(config)) return config;

        const scope = getActiveUserScope();
        (config as ScopedRequestConfig)[initiatingScope] = scope;
        config.headers.set("X-Canvas-User-Scope", scope);
        const activeTeamId = getActiveTeamContext();
        if (activeTeamId) config.headers.set("X-Canvas-Team-Id", activeTeamId);
        return config;
    },
    (error) => {
        throw error;
    },
    { synchronous: true },
);

apiClient.interceptors.response.use(
    (response) => {
        const scope = (response.config as ScopedRequestConfig)[initiatingScope];
        if (scope && scope !== getActiveUserScope()) throw new DOMException(currentLocaleText("runtimeSafety.accountChanged"), "AbortError");
        return response;
    },
    (error) => {
        const scope = (error as { config?: ScopedRequestConfig })?.config?.[initiatingScope];
        if (scope && scope !== getActiveUserScope()) throw new DOMException(currentLocaleText("runtimeSafety.accountChanged"), "AbortError");
        return Promise.reject(error);
    },
);

/**
 * 解包后端业务信封的唯一边界。这里把非零业务 code 转成 ApiError，保留 reason、重试语义和 Retry-After；
 * 取消请求必须继续抛出 AbortError，不能被包装成普通失败，否则页面切换会被误报为错误。
 */

export async function request<T>(promise: Promise<{ data: BackendEnvelope<T>; status?: number; headers?: unknown }>, options: { allowNotModified?: boolean } = {}) {
    try {
        const response = await promise;
        // 条件读取命中时 304 没有业务信封，交给调用方用自己持有的同版本数据。
        if (response.status === 304 && options.allowNotModified) return { notModified: true } as T;
        if (response.data.code !== 0) {
            refreshByokAfterConflict(response.data.code, response.data.msg);
            throw new ApiError(response.data.msg || currentLocaleText("common.requestFailed"), {
                status: response.status,
                code: response.data.code,
                reason: response.data.reason,
                details: response.data.details,
                retryable: isRetryableStatus(response.status) || isRetryableStatus(response.data.code),
                retryAfterMs: retryAfterMilliseconds(response.headers),
            });
        }
        return response.data.data;
    } catch (error) {
        throw unwrapTransportError(error);
    }
}

function unwrapTransportError(error: unknown): never {
    if (error instanceof ApiError || (error instanceof DOMException && error.name === "AbortError")) {
        throw error;
    }
    if (axios.isCancel(error) || (axios.isAxiosError(error) && error.code === axios.AxiosError.ERR_CANCELED)) {
        throw new DOMException(currentLocaleText("common.requestCancelled"), "AbortError");
    }
    if (axios.isAxiosError<BackendEnvelope<unknown>>(error)) {
        const status = error.response?.status;
        const code = error.response?.data?.code;
        refreshByokAfterConflict(status, error.response?.data?.msg);
        throw new ApiError(error.response?.data?.msg || transportFailureMessage(status, error.message), {
            status,
            code,
            reason: error.response?.data?.reason,
            details: error.response?.data?.details,
            retryable: isRetryableStatus(status) || isRetryableStatus(code),
            retryAfterMs: retryAfterMilliseconds(error.response?.headers),
            cause: error,
        });
    }
    throw error;
}

function transportFailureMessage(status?: number, fallback?: string) {
    switch (status) {
        case 502:
            return currentLocaleText("runtimeSafety.backendUnavailable");
        case 503:
            return currentLocaleText("runtimeSafety.serviceUnavailable");
        case 504:
            return currentLocaleText("runtimeSafety.timeout");
        default:
            return fallback || currentLocaleText("common.requestFailed");
    }
}

function isRetryableStatus(status?: number) {
    return status === 408 || status === 425 || status === 429 || (status !== undefined && status >= 500 && status <= 599);
}

function retryAfterMilliseconds(headers: unknown) {
    if (!headers || typeof headers !== "object") return undefined;
    const headerBag = headers as { get?: (name: string) => unknown; [key: string]: unknown };
    const rawValue = headerBag.get?.("retry-after") ?? headerBag["retry-after"] ?? headerBag["Retry-After"];
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    if (value === undefined || value === null) return undefined;
    const text = String(value).trim();
    if (!text) return undefined;
    const seconds = Number(text);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds * 1000);
    const retryAt = Date.parse(text);
    if (!Number.isFinite(retryAt)) return undefined;
    return Math.max(0, retryAt - Date.now());
}

export type HttpRequestConfig = Omit<AxiosRequestConfig, "method" | "url" | "data" | "baseURL">;

async function send<T>(method: string, url: string, data?: unknown, config?: HttpRequestConfig) {
    return request<T>(apiClient.request<BackendEnvelope<T>>({ method, url, data, ...config }));
}

/**
 * 业务 JSON 的唯一调用入口。模块不要再写 `request(apiClient.get(...))`，也不要再 `axios.create`。
 * 拦截器仍挂在 `apiClient` 上；流式 fetch、媒体 blob 和渠道中转走各自边界。
 */
export const http = {
    get: <T>(url: string, config?: HttpRequestConfig) => send<T>("get", url, undefined, config),
    post: <T>(url: string, data?: unknown, config?: HttpRequestConfig) => send<T>("post", url, data, config),
    put: <T>(url: string, data?: unknown, config?: HttpRequestConfig) => send<T>("put", url, data, config),
    patch: <T>(url: string, data?: unknown, config?: HttpRequestConfig) => send<T>("patch", url, data, config),
    delete: <T>(url: string, config?: HttpRequestConfig) => send<T>("delete", url, undefined, config),
    deleteWithBody: <T>(url: string, data: unknown) => send<T>("delete", url, data),
    async raw<T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        try {
            return await apiClient.request<T>(config);
        } catch (error) {
            throw unwrapTransportError(error);
        }
    },
};

export function compactApiParams(params: ApiParams) {
    return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== "" && value !== undefined && (!Array.isArray(value) || value.length > 0))) as ApiParams;
}

export function serializeApiParams(params?: ApiParams) {
    const queryParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params || {})) {
        if (value === undefined) continue;
        if (Array.isArray(value)) value.forEach((item) => queryParams.append(key, String(item)));
        else queryParams.set(key, String(value));
    }
    return queryParams;
}
