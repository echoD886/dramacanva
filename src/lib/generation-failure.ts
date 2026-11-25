import { matchAudioValidationMessageKey } from "@/i18n/ddcat-updates";
import type { MessageKey, MessageValues } from "@/i18n/messages";
import { videoReferenceIssueFromError, videoReferenceIssueText } from "@/lib/video-reference-issue";

export const GENERATION_ERROR_CODES = [
    "content_review_pending",
    "premium_capability_required",
    "content_policy_prompt",
    "content_policy_input_media",
    "content_policy_output",
    "upstream_unstable",
    "model_submission_uncertain",
    "upstream_timeout",
    "model_unavailable",
    "invalid_input",
    "reference_fetch_failed",
    "result_media_unavailable",
    "insufficient_credits",
    "quota_or_rate_limit_user",
    "auth_expired",
    "network",
    "permission_denied",
    "unknown",
] as const;
export type GenerationErrorCode = (typeof GENERATION_ERROR_CODES)[number];
export type GenerationErrorAction = "prompt" | "reference" | "model" | "parameters" | "credits" | "login" | "retry" | "permission" | "upgrade" | "inspectTask";
export const GENERATION_ERROR_ACTIONS: Record<GenerationErrorCode, GenerationErrorAction> = {
    content_review_pending: "retry",
    premium_capability_required: "upgrade",
    content_policy_prompt: "prompt",
    content_policy_input_media: "reference",
    content_policy_output: "prompt",
    upstream_unstable: "retry",
    upstream_timeout: "retry",
    model_submission_uncertain: "inspectTask",
    model_unavailable: "model",
    invalid_input: "parameters",
    reference_fetch_failed: "reference",
    result_media_unavailable: "inspectTask",
    insufficient_credits: "credits",
    quota_or_rate_limit_user: "retry",
    auth_expired: "login",
    network: "retry",
    permission_denied: "permission",
    unknown: "retry",
};
const record = (value: unknown): Record<string, unknown> => (value && typeof value === "object" ? (value as Record<string, unknown>) : {});
export function isGenerationErrorCode(value: unknown): value is GenerationErrorCode {
    return GENERATION_ERROR_CODES.includes(value as GenerationErrorCode);
}

/** Structured public codes win. Legacy normalization is confined to this boundary,
 * never performed by individual cards. Raw upstream messages are not presentation. */
export function classifyGenerationError(error: unknown): GenerationErrorCode {
    const queue: unknown[] = [error];
    const visited = new Set<object>();
    let legacy = typeof error === "string" ? error : "";
    let status = 0;
    for (let i = 0; i < queue.length && i < 24; i++) {
        const item = queue[i];
        if (!item || typeof item !== "object" || visited.has(item)) continue;
        visited.add(item);
        const data = record(item);
        for (const key of ["errorCode", "generationErrorCode", "taskErrorCode", "reason", "code"]) if (isGenerationErrorCode(data[key])) return data[key];
        if (matchAudioValidationMessageKey(data)) return "invalid_input";
        legacy += ` ${data.reason || ""} ${data.code || data.errorCode || data.generationErrorCode || data.taskErrorCode || ""} ${data.recoveryAction || data.requiredAction || ""} ${data.message || data.errorDetails || data.text || data.error || ""}`;
        status ||= Number(data.httpStatus || data.status || 0);
        queue.push(data.result, data.detail, data.details, data.cause, data.response, data.data, data.error);
    }
    const category = record(error).errorCategory;
    const aliases: Record<string, GenerationErrorCode> = {
        credits: "insufficient_credits",
        auth: "auth_expired",
        permission: "permission_denied",
        moderation: "content_policy_prompt",
        model: "upstream_unstable",
        network: "network",
        argument: "invalid_input",
        unknown: "unknown",
    };
    if (typeof category === "string" && aliases[category]) return aliases[category];
    if (matchAudioValidationMessageKey(error)) return "invalid_input";
    const s = legacy.toLowerCase();
    if (/积分不足|積分不足|insufficient[_ ]credits|not enough credits/.test(s) || status === 402) return "insufficient_credits";
    if (/unauthorized|session_expired|authentication_required|session.*expired|登录|登入/.test(s) || status === 401) return "auth_expired";
    if (/privacyinformation|input(?:image|video|audio).*sensitive/.test(s)) return "content_policy_input_media";
    if (/(?:output|generated).*(?:policy|moderation|blocked)/.test(s)) return "content_policy_output";
    if (/sensitive_words_detected|content[_ ]policy|content violates policy|\b1026\b|moderation|content.?filter|safety|nsfw|审核|審核/.test(s)) return "content_policy_prompt";
    if (/asset_ref_invalid|reference_fetch|参考(?:素材|图片).*上传|reference.*expired/.test(s)) return "reference_fetch_failed";
    if (/tool_argument|fix_arguments|invalid_request|invalid_parameter|requestparameteriswrong|metaso_video_selection_invalid|时长必须为整数|参数|參數|arguments?|schema/.test(s) || status === 400 || status === 422) return "invalid_input";
    if (/quota_exceeded|rate_limited|active_task_limit/.test(s)) return "quota_or_rate_limit_user";
    if (/timeout|timed out|超时|逾時/.test(s) || [408, 504, 524].includes(status)) return "upstream_timeout";
    if (/network|disconnect|connection reset|failed to fetch|连接|連線|网络异常/.test(s) || error instanceof TypeError) return "network";
    if (/forbidden|access denied|权限|權限/.test(s) || status === 403) return "permission_denied";
    if (/model_route_unavailable|model_catalog_mismatch|invalid_model_selection|model_price_not_configured|model_not_found|model_access_denied/.test(s) || status === 404) return "model_unavailable";
    if (/upstream_error|do_request_failed|rate_limit_exceeded|internal_error|provider|channel|模型|渠道|model/.test(s) || status === 429 || status >= 500) return "upstream_unstable";
    return "unknown";
}

export function generationFailurePresentation(error: unknown, t: (key: MessageKey, values?: MessageValues) => string) {
    const code = classifyGenerationError(error);
    const data = record(error),
        detail = record(data.detail),
        result = record(data.result);
    const amounts = { ...detail, ...record(data.details), ...result, ...data };
    const amount = (key: string) => (typeof amounts[key] === "number" && Number.isFinite(amounts[key]) && Number(amounts[key]) >= 0 ? Number(amounts[key]) : undefined);
    const billing = record(data.billing || data.taskBilling || detail.billing || result.billing);
    const field = String(data.errorField || data.taskErrorField || detail.errorField || "");
    const fields = ["duration", "resolution", "aspect_ratio", "reference_count", "image_size", "format", "prompt_length"];
    const fieldHint = code === "invalid_input" && fields.includes(field) ? t("generationFailure.fieldHint", { field: t(`generationFailure.field.${field}` as MessageKey) }) : undefined;
    const plan = typeof amounts.upgradePlanName === "string" ? amounts.upgradePlanName.trim().slice(0, 160) : "";
    const videoIssue = code === "invalid_input" ? videoReferenceIssueFromError(error) : undefined;
    const audioValidationKey = code === "invalid_input" ? matchAudioValidationMessageKey(error) : undefined;
    return {
        code,
        action: GENERATION_ERROR_ACTIONS[code],
        title: videoIssue ? t("generationFailure.video.title") : t(`generationFailure.${code === "result_media_unavailable" ? "unknown" : code}.title` as MessageKey),
        text: videoIssue
            ? videoReferenceIssueText(videoIssue, t)
            : audioValidationKey
              ? t(audioValidationKey)
              : code === "premium_capability_required" && plan
                ? t("generationFailure.premium_capability_required.planText", { plan })
                : fieldHint || t(code === "result_media_unavailable" ? "canvasExtra.versions.downloadFailed" : (`generationFailure.${code}.text` as MessageKey)),
        detail: {
            code,
            taskId: typeof data.taskId === "string" ? data.taskId : typeof data.id === "string" && typeof data.status === "string" ? data.id : typeof detail.taskId === "string" ? detail.taskId : undefined,
            requiredMicrocredits: amount("requiredMicrocredits"),
            availableMicrocredits: amount("availableMicrocredits"),
            refundedMicrocredits: billing.status === "refunded" && typeof billing.amountMicrocredits === "number" && Number.isFinite(billing.amountMicrocredits) && billing.amountMicrocredits > 0 ? billing.amountMicrocredits : undefined,
            retryAfterMs: amount("retryAfterMs"),
        },
    };
}

export class GenerationTaskFailure extends Error {
    readonly code: GenerationErrorCode;
    readonly taskId: string;
    readonly errorField?: string;
    readonly requiredMicrocredits?: number;
    readonly availableMicrocredits?: number;
    readonly billing?: { status: string; amountMicrocredits: number };
    constructor(task: {
        id: string;
        errorCode?: string;
        errorField?: string;
        error?: string;
        requiredMicrocredits?: number;
        availableMicrocredits?: number;
        billing?: { status: string; amountMicrocredits: number };
        taskBilling?: { status: string; amountMicrocredits: number };
    }) {
        super(task.error || "Generation failed");
        this.name = "GenerationTaskFailure";
        this.code = classifyGenerationError(task);
        this.taskId = task.id;
        this.errorField = task.errorField;
        this.requiredMicrocredits = task.requiredMicrocredits;
        this.availableMicrocredits = task.availableMicrocredits;
        this.billing = task.billing || task.taskBilling;
    }
}
