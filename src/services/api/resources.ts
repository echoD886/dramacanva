import { currentLocaleText as t } from "@/i18n/current-locale-text";
import { getActiveUserScope } from "@/lib/user-scope";
import { nanoid } from "nanoid";
import axios from "axios";
import { ApiError, apiBaseURL, apiClient, request, type BackendEnvelope } from "@/services/api/request";
import { getAuthIdentityGeneration, isAuthIdentityChanging } from "@/services/api/auth";
import type { OSSConnectionTestInput, OSSConnectionTestResult, OSSProvider, S3Preset } from "@/lib/oss-settings";

export type RemoteResource = {
    /** Public delivery state; policy reasons remain admin-only. */
    deliveryVersion?: string;
    watermarked?: boolean;
    watermarkState?: string;
    privateCreative?: boolean;
    policyVersion?: number;
    objectVersion?: number;
    serverCopyState?: string;
    eligibleAt?: string | null;
    retainUntil?: string;
    id: string;
    userId: string;
    kind: "image" | "video" | "audio" | "file" | string;
    status: "pending" | "ready" | "failed" | "deleted" | string;
    provider: string;
    endpoint: string;
    bucket: string;
    objectKey: string;
    publicUrl: string;
    mimeType: string;
    size: number;
    width?: number;
    height?: number;
    durationMs?: number;
    etag?: string;
    playbackStatus?: string;
    playbackObjectKey?: string;
    playbackError?: string;
    error?: string;
    createdAt: string;
    updatedAt: string;
};

export type UserOSSSetting = {
    enabled: boolean;
    provider: OSSProvider;
    s3Preset: S3Preset;
    region: string;
    endpoint: string;
    cdnBaseUrl: string;
    bucket: string;
    accessKeyId: string;
    hasAccessKeySecret: boolean;
    sessionToken?: string;
    hasSessionToken: boolean;
    pathStyle: boolean;
    allowUserS3: boolean;
    publicBaseUrl: string;
    pathPrefix: string;
    testedAt?: string;
    testedDigest?: string;
    historyCount?: number;
    referencedResourceCount?: number;
    updatedAt?: string;
};

export type UserOSSSettingInput = Pick<UserOSSSetting, "enabled" | "provider" | "s3Preset" | "region" | "endpoint" | "cdnBaseUrl" | "bucket" | "accessKeyId" | "pathPrefix" | "pathStyle"> & {
    accessKeySecret?: string;
    sessionToken?: string;
};

export type AccountFileStorageUsage = {
    usedBytes: number;
    totalBytes: number;
};

export type ArkPrivateAssetSync = {
    resourceId: string;
    status: "active" | string;
};

export type ResourceUploadMeta = {
    processingSources?: string[];
    width?: number;
    height?: number;
    durationMs?: number;
    fileName?: string;
    idempotencyKey?: string;
};

const api = apiClient;
const resourceCache = new Map<string, RemoteResource>();
const resourceRequests = new Map<string, Promise<RemoteResource>>();
const missingResourceIds = new Set<string>();
let cachedIdentity = "";
const processingReceipts = new Map<string, string>();

export function resourceStorageKey(id: string) {
    return `resource:${id}`;
}

export function getUserOSSSetting() {
    return request<{ setting: UserOSSSetting }>(api.get("/settings/oss"));
}

export function updateUserOSSSetting(input: UserOSSSettingInput) {
    return request<{ setting: UserOSSSetting }>(api.patch("/settings/oss", input));
}

export function testUserOSSConnection(input: OSSConnectionTestInput) {
    return request<OSSConnectionTestResult>(api.post("/settings/oss/test", input));
}

export async function getAccountFileStorageUsage() {
    const data = await request<{ usage: AccountFileStorageUsage }>(api.get("/resources/storage-usage"));
    return data.usage;
}

export async function syncResourceToArkPrivateAsset(id: string) {
    const data = await request<{ sync: ArkPrivateAssetSync }>(api.post(`/resources/${encodeURIComponent(id)}/ark-private-asset`));
    return data.sync;
}

export function resourceIdFromStorageKey(storageKey?: string) {
    return storageKey?.startsWith("resource:") ? storageKey.slice("resource:".length) : "";
}

export function isResourceUrl(url?: string) {
    const base = String(apiBaseURL).replace(/\/+$/, "");
    const path = url?.split(/[?#]/, 1)[0] || "";
    return path.startsWith(`${base}/resources/`) && path.endsWith("/file");
}

export function resourceIdFromUrl(value?: string) {
    if (!value) return "";
    if (!/^(?:https?:\/\/|\/)/i.test(value)) return "";
    const base = new URL(String(apiBaseURL), globalThis.location?.origin || "https://canvas.invalid");
    const url = new URL(value, base.origin);
    if (url.origin !== base.origin) return "";
    const prefix = `${base.pathname.replace(/\/+$/, "")}/`;
    if (!url.pathname.startsWith(prefix)) return "";
    return url.pathname.slice(prefix.length).match(/^(?:public\/)?resources\/([A-Za-z0-9_-]+)\/file(?:\/[^/]+)?$/)?.[1] || "";
}

// 超过该阈值（与后端单请求 multipart 上限 50MB 一致）的本地媒体走分片上传，避免大视频导入失败。
const CHUNK_UPLOAD_THRESHOLD = 50 << 20;
const CHUNK_UPLOAD_RETRIES = 2;

export async function uploadResourceFile(file: Blob, kind: "image" | "video" | "audio" | "file", meta?: ResourceUploadMeta, onProgress?: (uploadedBytes: number, totalBytes: number) => void, signal?: AbortSignal): Promise<RemoteResource> {
    signal?.throwIfAborted();
    if ((kind === "video" || file.type.startsWith("video/")) && (file.size > 200 * 1024 * 1024 || (meta?.durationMs || 0) > 180000))
        throw new ResourceUploadError(t("generationFailure.video.video_upload_limit"), { permanent: true, reason: "invalid_input", details: { subtype: "video_upload_limit", seconds: (meta?.durationMs || 0) / 1000, limit: 180 } });
    const scope = resourceIdentity();
    const name = meta?.fileName || (file instanceof File ? file.name : `${kind}.${extensionFromMime(file.type, kind)}`);
    if (file.size > CHUNK_UPLOAD_THRESHOLD && !meta?.processingSources?.length) {
        const resource = await uploadFileInChunks(file, name, kind, meta, onProgress, signal);
        assertResourceScope(scope);
        resourceCache.set(resourceCacheKey(resource.id), resource);
        return resource;
    }
    const formData = new FormData();
    formData.append("kind", kind);
    formData.append("file", file, name);
    if (meta?.processingSources?.length) formData.append("processingSources", JSON.stringify(meta.processingSources));
    if (meta?.processingSources?.length)
        formData.append(
            "processingReceipts",
            JSON.stringify(
                meta.processingSources.flatMap((id) => {
                    const token = processingReceipts.get(`${scope}:${id}`);
                    return token ? [token] : [];
                }),
            ),
        );
    if (meta?.width) formData.append("width", String(Math.round(meta.width)));
    if (meta?.height) formData.append("height", String(Math.round(meta.height)));
    if (meta?.durationMs) formData.append("durationMs", String(Math.round(meta.durationMs)));
    try {
        const data = await request<{ resource: RemoteResource }>(api.post("/resources", formData, { ...uploadRequestConfig(meta?.idempotencyKey), timeout: uploadTimeoutMs(file.size), signal }));
        signal?.throwIfAborted();
        assertResourceScope(scope);
        resourceCache.set(resourceCacheKey(data.resource.id), data.resource);
        return data.resource;
    } catch (error) {
        if (signal?.aborted || axios.isCancel(error)) throw new DOMException("Aborted", "AbortError");
        throw normalizeUploadError(error);
    }
}

// 分片上传：POST 开始会话 → 逐片 PUT 原始二进制（每片 8MB）→ POST 合并落库。
// 单请求体积小、可断点续传/失败重试；单文件不再受 50MB 限制（仅日/总量配额约束）。
async function uploadFileInChunks(file: Blob, name: string, kind: "image" | "video" | "audio" | "file", meta: ResourceUploadMeta | undefined, onProgress?: (uploadedBytes: number, totalBytes: number) => void, signal?: AbortSignal) {
    const scope = resourceIdentity();
    const operationMeta = { ...meta, idempotencyKey: meta?.idempotencyKey?.trim() || `upload-${nanoid()}` };
    // 片级失败通常意味着会话过期/网络抖动：整体重开一次会话重传（整传重试）。
    for (let attempt = 0; attempt < CHUNK_UPLOAD_RETRIES; attempt++) {
        try {
            signal?.throwIfAborted();
            assertResourceScope(scope);
            return await runChunkedUpload(file, name, kind, operationMeta, scope, onProgress, signal);
        } catch (error) {
            if (signal?.aborted || axios.isCancel(error)) throw new DOMException("Aborted", "AbortError");
            assertResourceScope(scope);
            if ((error as { name?: string })?.name === "AbortError" || (error instanceof ApiError && error.status && error.status >= 400 && error.status < 500 && ![404, 408, 409].includes(error.status))) throw error;
            if (attempt === CHUNK_UPLOAD_RETRIES - 1) throw error;
        }
    }
    throw new Error(t("assetPicker.uploadError"));
}

async function runChunkedUpload(file: Blob, name: string, kind: "image" | "video" | "audio" | "file", meta: ResourceUploadMeta, scope: string, onProgress?: (uploadedBytes: number, totalBytes: number) => void, signal?: AbortSignal) {
    const session = await request<{ uploadId: string; chunkSize: number; chunkCount: number }>(
        api.post("/resources/uploads", { fileName: name, kind, size: file.size, width: meta?.width, height: meta?.height, durationMs: meta?.durationMs }, { ...uploadRequestConfig(meta?.idempotencyKey), signal }),
    );
    try {
        assertResourceScope(scope);
        if (!session.uploadId || !Number.isSafeInteger(session.chunkSize) || session.chunkSize <= 0 || session.chunkSize > 8 << 20 || session.chunkCount !== Math.ceil(file.size / session.chunkSize))
            throw new Error(t("creationRuntime.uploadChunksInvalid"));
        for (let index = 0; index < session.chunkCount; index++) {
            assertResourceScope(scope);
            const start = index * session.chunkSize;
            const end = Math.min(file.size, start + session.chunkSize);
            const blob = file.slice(start, end);
            // raw 二进制直传，与后端按裸 body 逐片落盘对齐（勿设手动 Content-Type，让 axios 处理）。
            await request<{ index: number }>(api.put(`/resources/uploads/${encodeURIComponent(session.uploadId)}/chunks/${index}`, blob, { headers: { "Content-Type": "application/octet-stream" }, timeout: uploadTimeoutMs(blob.size), signal }));
            assertResourceScope(scope);
            onProgress?.(Math.min(end, file.size), file.size);
        }
        const complete = await request<{ resource: RemoteResource }>(api.post(`/resources/uploads/${encodeURIComponent(session.uploadId)}/complete`, undefined, { timeout: uploadTimeoutMs(file.size), signal }));
        assertResourceScope(scope);
        return complete.resource;
    } finally {
        // Cleanup is best effort and cannot turn a successful upload into a
        // failed operation. Never issue a stale account's cleanup as a new user.
        if (!isAuthIdentityChanging() && resourceIdentity() === scope && session.uploadId) {
            await request(api.delete(`/resources/uploads/${encodeURIComponent(session.uploadId)}`, { timeout: 5_000 })).catch(() => undefined);
        }
    }
}

function assertResourceScope(scope: string) {
    if (isAuthIdentityChanging() || resourceIdentity() !== scope) throw new DOMException("账号已切换，已停止旧账号的资源操作", "AbortError");
}

function resourceIdentity() {
    if (isAuthIdentityChanging()) throw new DOMException("身份正在切换，请稍后重试", "AbortError");
    return `${getActiveUserScope()}:${getAuthIdentityGeneration()}`;
}

/**
 * 资源直传失败。
 *
 * `permanent` 是这条边界上唯一重要的信息：媒体直传失败后，调用方默认会把文件留在本机
 * IndexedDB，并由云端数据同步用同一幂等键重传（见 user-data-sync 的 uploadLocalStorageKey）。
 * 但鉴权失效、越权、请求本身不合法这几类失败重传多少次都是同样结果，把它们也归入
 * "稍后自动同步" 等于向用户撒谎，必须当场抛出。
 */
export class ResourceUploadError extends Error {
    readonly status?: number;
    readonly reason?: string;
    readonly details?: Record<string, unknown>;
    /** true 表示重试不会自愈，调用方不得降级为本地暂存。 */
    readonly permanent: boolean;

    constructor(message: string, options: { status?: number; permanent: boolean; cause?: unknown; reason?: string; details?: Record<string, unknown> }) {
        super(message, options.cause === undefined ? undefined : { cause: options.cause });
        this.name = "ResourceUploadError";
        this.status = options.status;
        this.reason = options.reason;
        this.details = options.details;
        this.permanent = options.permanent;
    }
}

function normalizeUploadError(error: unknown): Error {
    // Account switches are cancellation, not a retryable upload failure.
    if (error instanceof Error && error.name === "AbortError") return error;
    if (error instanceof ApiError)
        return new ResourceUploadError(error.reason === "WATERMARK_SOURCE_CONFLICT" ? t("watermark.sourceConflict") : error.details?.subtype === "video_upload_limit" ? t("generationFailure.video.video_upload_limit") : error.message, {
            status: error.status,
            permanent: Boolean(error.status && error.status < 500),
            cause: error,
            reason: error.reason,
            details: error.details,
        });
    // 兜底：即使误超 50MB multipart 上限（http.MaxBytesError），也给出可读中文而非英文裸错。
    if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data as { msg?: string } | undefined;
        const msg = message?.msg || "";
        if (status === 400 && /body too large|MaxBytes/i.test(msg)) {
            return new ResourceUploadError("文件过大，请使用小于 50MB 的文件或稍后重试", { status, permanent: true, cause: error });
        }
        if (msg) return new ResourceUploadError(msg, { status, permanent: status !== undefined && status < 500, cause: error });
        if (status === 413) return new ResourceUploadError("文件过大，无法上传", { status, permanent: true, cause: error });
    }
    return new ResourceUploadError(error instanceof Error ? error.message : t("assetPicker.uploadError"), { permanent: false, cause: error });
}

export async function importResourceFromUrl(url: string, kind: "image" | "video" | "audio" | "file", meta?: Omit<ResourceUploadMeta, "fileName">) {
    const scope = resourceIdentity();
    const data = await request<{ resource: RemoteResource }>(api.post("/resources/import", { url, kind, width: meta?.width, height: meta?.height, durationMs: meta?.durationMs }, uploadRequestConfig(meta?.idempotencyKey)));
    assertResourceScope(scope);
    resourceCache.set(resourceCacheKey(data.resource.id), data.resource);
    return data.resource;
}

function uploadRequestConfig(idempotencyKey?: string) {
    const value = idempotencyKey?.trim();
    return value ? { headers: { "X-Idempotency-Key": value } } : undefined;
}

export function uploadTimeoutMs(bytes: number) {
    // Allow slow mobile uplinks (about 0.5 Mbps), keeping the existing hard cap.
    return Math.min(15 * 60_000, Math.max(60_000, 30_000 + Math.ceil(bytes / (64 * 1024)) * 1000));
}

export function getResource(id: string): Promise<RemoteResource> {
    let scope: string;
    try {
        scope = resourceIdentity();
    } catch (error) {
        return Promise.reject(error);
    }
    const cacheKey = resourceCacheKey(id);
    const cached = resourceCache.get(cacheKey);
    if (cached) return Promise.resolve(cached);
    if (missingResourceIds.has(cacheKey)) return Promise.reject(new Error(t("creationRuntime.resourceMissing")));
    const pending = resourceRequests.get(cacheKey);
    if (pending) return pending;
    const task = batchedResourceMetadata(id)
        .then((resource) => {
            assertResourceScope(scope);
            resourceCache.set(cacheKey, resource);
            return resource;
        })
        .catch((error) => {
            assertResourceScope(scope);
            if ((error instanceof ApiError && error.status === 404) || (axios.isAxiosError(error) && error.response?.status === 404)) missingResourceIds.add(cacheKey);
            throw error;
        })
        .finally(() => {
            if (resourceRequests.get(cacheKey) === task) resourceRequests.delete(cacheKey);
        });
    resourceRequests.set(cacheKey, task);
    return task;
}

const singleResourceMetadata = (id: string) => request<{ resource: RemoteResource }>(api.get(`/resources/${encodeURIComponent(id)}`)).then((data) => data.resource);
const RESOURCE_BATCH_WINDOW_MS = 16;
const RESOURCE_BATCH_MAX = 50;
let resourceBatch: { id: string; resolve: (resource: RemoteResource) => void; reject: (error: unknown) => void }[] = [];
let resourceBatchTimer: ReturnType<typeof setTimeout> | undefined;

// Thumbnails mount together (task center, canvas cards): their lookups become one request instead of one each.
// Ids the batch does not return, or a failed batch (e.g. an older backend mid-deploy), fall back to the single
// lookup so 404/permission errors keep their exact behaviour.
function batchedResourceMetadata(id: string): Promise<RemoteResource> {
    return new Promise((resolve, reject) => {
        resourceBatch.push({ id, resolve, reject });
        if (resourceBatch.length >= RESOURCE_BATCH_MAX) flushResourceBatch();
        else resourceBatchTimer ??= setTimeout(flushResourceBatch, RESOURCE_BATCH_WINDOW_MS);
    });
}

function flushResourceBatch() {
    clearTimeout(resourceBatchTimer);
    resourceBatchTimer = undefined;
    const pending = resourceBatch;
    resourceBatch = [];
    if (!pending.length) return;
    const settle = (entry: (typeof pending)[number], found?: RemoteResource) => (found ? entry.resolve(found) : singleResourceMetadata(entry.id).then(entry.resolve, entry.reject));
    if (pending.length === 1) return settle(pending[0]);
    const ids = [...new Set(pending.map((entry) => entry.id))];
    request<{ resources: Record<string, RemoteResource> }>(api.get("/resources/batch", { params: { ids: ids.join(",") } })).then(
        ({ resources }) => pending.forEach((entry) => settle(entry, resources?.[entry.id])),
        () => pending.forEach((entry) => settle(entry)),
    );
}

// refreshResource 绕过缓存强制拉取资源最新状态（转码副本就绪轮询用），并回写缓存。
export function refreshResource(id: string): Promise<RemoteResource> {
    let scope: string;
    try {
        scope = resourceIdentity();
    } catch (error) {
        return Promise.reject(error);
    }
    const cacheKey = resourceCacheKey(id);
    const pending = resourceRequests.get(cacheKey);
    if (pending) return pending;
    const task = request<{ resource: RemoteResource }>(api.get(`/resources/${encodeURIComponent(id)}`))
        .then((data) => {
            assertResourceScope(scope);
            resourceCache.set(cacheKey, data.resource);
            missingResourceIds.delete(cacheKey);
            return data.resource;
        })
        .finally(() => {
            if (resourceRequests.get(cacheKey) === task) resourceRequests.delete(cacheKey);
        });
    resourceRequests.set(cacheKey, task);
    return task;
}

export async function getResourceOSSUrl(storageKey?: string) {
    const scope = resourceIdentity();
    const id = resourceIdFromStorageKey(storageKey);
    if (!id) throw new Error(t("creationRuntime.resourceNotUploaded"));
    try {
        const data = await request<{ url: string }>(api.get(`/resources/${encodeURIComponent(id)}/oss-url`));
        assertResourceScope(scope);
        if (!data.url) throw new Error(t("creationRuntime.storageURLMissing"));
        return data.url;
    } catch (error) {
        if (axios.isAxiosError<BackendEnvelope<unknown>>(error)) throw new Error(error.response?.data.msg || error.message || t("creationRuntime.storageURLFailed"));
        throw error;
    }
}

function resourceCacheKey(id: string) {
    const identity = resourceIdentity();
    if (identity !== cachedIdentity) {
        resourceCache.clear();
        resourceRequests.clear();
        missingResourceIds.clear();
        cachedIdentity = identity;
    }
    return `${identity}:${id}`;
}

export function resourceFileUrl(id: string) {
    const base = String(apiBaseURL).replace(/\/+$/, "");
    return `${base}/resources/${encodeURIComponent(id)}/file`;
}

export function resourceProxyFileUrl(id: string) {
    const base = String(apiBaseURL).replace(/\/+$/, "");
    return `${base}/resources/${encodeURIComponent(id)}/file?proxy=1`;
}

export function resourceThumbnailUrl(id: string) {
    return `${resourceProxyFileUrl(id)}&variant=thumbnail`;
}

// playbackVariantUrl 返回浏览器兼容播放副本 URL（H.265→H.264 转码结果）。
// 副本就绪前由后端回退原件，调用方再按需降级。
export function playbackVariantUrl(id: string) {
    const base = String(apiBaseURL).replace(/\/+$/, "");
    return `${base}/resources/${encodeURIComponent(id)}/file?variant=playback`;
}

export type ResourceImageVariant = "original" | "thumbnail";

export function resolveResourceVariantUrl(key: string, variant: ResourceImageVariant) {
    const id = resourceIdFromStorageKey(key) || key;
    return variant === "thumbnail" ? resourceThumbnailUrl(id) : resourceProxyFileUrl(id);
}

/** One-shot, no-store image input. Keep receipts only in memory for derived uploads. */
export async function getProcessingReference(storageKey: string, purpose: "image-compose") {
    const id = resourceIdFromStorageKey(storageKey);
    if (!id) return null;
    const scope = resourceIdentity();
    const capability = await request<{ token: string }>(api.post(`/resources/${encodeURIComponent(id)}/processing-capability`, { purpose }));
    assertResourceScope(scope);
    const response = await fetch(`${String(apiBaseURL).replace(/\/+$/, "")}/resources/${encodeURIComponent(id)}/processing-reference?purpose=${purpose}`, {
        credentials: "include",
        cache: "no-store",
        headers: capability ? { "X-Processing-Capability": capability.token } : undefined,
    });
    if (!response.ok) throw new Error(t("watermark.useTaskResult"));
    const blob = await response.blob();
    assertResourceScope(scope);
    if (capability) processingReceipts.set(`${scope}:${id}`, capability.token);
    return blob;
}

export async function extractResourceFrames(storageKey: string, timesMs: number[]) {
    const scope = resourceIdentity();
    const id = resourceIdFromStorageKey(storageKey);
    if (!id) throw new Error(t("creationRuntime.resourceNotUploaded"));
    const result = await request<{ frames: Array<{ timeMs: number; resource: RemoteResource }>; failures: Array<{ timeMs: number }> }>(api.post(`/resources/${encodeURIComponent(id)}/frames`, { timesMs }, { timeout: 10 * 60 * 1000 }));
    assertResourceScope(scope);
    for (const frame of result.frames) resourceCache.set(resourceCacheKey(frame.resource.id), frame.resource);
    return result;
}

export async function transformResourceImage(
    storageKey: string,
    input: { operation: "crop"; crop: { x: number; y: number; width: number; height: number } } | { operation: "split"; rows: number; columns: number } | { operation: "resize"; targetLongEdge: number; algorithm: "nearest" | "bilinear" | "high" },
) {
    const scope = resourceIdentity();
    const id = resourceIdFromStorageKey(storageKey);
    if (!id) throw new Error(t("creationRuntime.resourceNotUploaded"));
    const data = await request<{ resources: RemoteResource[] }>(api.post(`/resources/${encodeURIComponent(id)}/image-transform`, input, { timeout: 5 * 60 * 1000 }));
    assertResourceScope(scope);
    for (const resource of data.resources) resourceCache.set(resourceCacheKey(resource.id), resource);
    return data.resources;
}

export async function getResourceBlob(storageKey: string, variant: ResourceImageVariant = "original", signal?: AbortSignal) {
    const scope = resourceIdentity();
    const id = resourceIdFromStorageKey(storageKey);
    if (!id) return null;
    const url = resourceProxyFileUrl(id) + (variant === "thumbnail" ? "&variant=thumbnail" : "");
    const response = await fetch(url, { credentials: isResourceUrl(url) ? "include" : "same-origin", signal });
    assertResourceScope(scope);
    if (!response.ok) return null;
    const blob = await response.blob();
    assertResourceScope(scope);
    return blob;
}

function extensionFromMime(mimeType: string, kind: string) {
    if (mimeType.includes("png")) return "png";
    if (mimeType.includes("jpeg")) return "jpg";
    if (mimeType.includes("webp")) return "webp";
    if (mimeType.includes("gif")) return "gif";
    if (mimeType.includes("mp4")) return "mp4";
    if (mimeType.includes("webm")) return "webm";
    if (mimeType.includes("mpeg")) return "mp3";
    if (mimeType.includes("wav")) return "wav";
    return kind === "image" ? "png" : "bin";
}
