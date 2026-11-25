import { currentLocaleText } from "@/i18n/current-locale-text";
import { matchAudioValidationMessageKey } from "@/i18n/ddcat-updates";
import { classifyGenerationError, generationFailurePresentation, isGenerationErrorCode } from "@/lib/generation-failure";

export const CONTENT_MODERATION_ERROR_CODE = "sensitive_words_detected";

export const CONTENT_MODERATION_MESSAGE = "提示词未通过审核。调整描述后再生成。";

const DEFAULT_GENERATION_ERROR_MESSAGE = "生成失败，请稍后重试。";
const NETWORK_ERROR_MESSAGE = "网络异常。";

export type GenerationFailureMetadata = {
    errorDetails: string;
    generationErrorCode?: string;
    failedPromptFingerprint?: string;
    taskBilling?: { status: string; amountMicrocredits: number };
    taskErrorField?: string;
    requiredMicrocredits?: number;
    availableMicrocredits?: number;
};

export function generationFailureMetadata(error: unknown, prompt: string): GenerationFailureMetadata {
    const code = classifyGenerationError(error);
    const detail = generationFailurePresentation(error, currentLocaleText).detail;
    const amounts = { requiredMicrocredits: detail.requiredMicrocredits, availableMicrocredits: detail.availableMicrocredits };
    const data = error && typeof error === "object" ? (error as Record<string, unknown>) : {};
    const nested = (data.detail || data.result || {}) as Record<string, unknown>;
    const billing = (data.billing || data.taskBilling || nested.billing || nested.taskBilling) as GenerationFailureMetadata["taskBilling"];
    const field = typeof (data.errorField || data.taskErrorField || nested.errorField) === "string" ? String(data.errorField || data.taskErrorField || nested.errorField) : undefined;
    if (!code.startsWith("content_policy_")) return { ...amounts, errorDetails: generationErrorMessage(error), generationErrorCode: code, taskBilling: billing, taskErrorField: field };
    return {
        ...amounts,
        errorDetails: generationErrorMessage(error),
        generationErrorCode: code,
        taskBilling: billing,
        failedPromptFingerprint: generationPromptFingerprint(prompt),
    };
}

export function generationErrorMessage(error: unknown) {
    // Exact application-owned sentinels retain recovery instructions; never pass through arbitrary diagnostics.
    const message = error instanceof Error ? error.message : typeof error === "string" ? error : (error as { message?: unknown } | null)?.message;
    if (message === "当前方案支持一个自有渠道，请在创作主场更换绑定渠道后重试" || message === "创作主场服务未生效或已到期，请前往独立栏目开通或续费") return message;
    const audioValidationKey = matchAudioValidationMessageKey(error);
    if (audioValidationKey) return currentLocaleText(audioValidationKey);
    const stableCode = generationErrorCode(error);
    // Local CLI receipts describe uncertainty, not a failed backend generation.
    if (stableCode && DREAMINA_SUBMIT_ERROR_MESSAGES[stableCode]) return DREAMINA_SUBMIT_ERROR_MESSAGES[stableCode];
    return generationFailurePresentation(error, currentLocaleText).text;
}

export const GENERATION_REASON_MESSAGES: Record<string, string> = {
    model_price_not_configured: "模型价格尚未配置，请选择其他模型。",
    model_route_unavailable: "当前模型没有可用线路，请选择其他模型或稍后重试。",
    model_catalog_mismatch: "模型目录已更新，请重新选择模型。",
    invalid_model_selection: "模型选择无效，请重新选择模型。",
    quota_exceeded: "已达到使用额度，请检查额度后重试。",
    rate_limited: "请求过于频繁，请稍后重试。",
    timeout: "生成请求超时，请先查看任务状态再决定是否重试。",
    bad_gateway: "上游服务暂时不可用，请稍后重试。",
    unavailable: "上游服务暂时不可用，请稍后重试。",
    upstream_dns_failed: NETWORK_ERROR_MESSAGE,
    unauthorized: "生成服务鉴权失败，请检查渠道配置。",
    forbidden: "没有执行该生成操作的权限。",
    failed_precondition: "生成条件不满足，请检查参数和参考素材。",
    conflict: "任务状态已变化，请刷新后重试。",
    internal: DEFAULT_GENERATION_ERROR_MESSAGE,
};

export const DREAMINA_SUBMIT_ERROR_MESSAGES: Record<string, string> = {
    dreamina_submit_spawn_failed: "无法启动官方即梦 CLI，任务尚未提交。",
    dreamina_submit_exit_nonzero: "官方即梦 CLI 未接受本次提交，任务没有自动重试。",
    dreamina_submit_timeout: "等待官方即梦 CLI 确认提交超时，为避免重复扣费，任务没有自动重试。",
    dreamina_submit_receipt_missing: "官方即梦 CLI 未返回任务凭证，为避免重复扣费，任务没有自动重试。",
    dreamina_submission_unknown: "提交结果待确认，为避免重复扣费未自动重试。",
};

export function generationErrorCode(error: unknown) {
    if (isGenerationErrorCode(error)) return error;
    if (error && typeof error === "object" && "code" in error && typeof (error as { code?: unknown }).code === "string") {
        const code = (error as { code: string }).code;
        if (isGenerationErrorCode(code) || /^(?:dreamina|local_generation|origin)_[a-z0-9_]{2,80}$/.test(code)) return code;
    }
    return undefined;
}

/** 余额不足：重新生成必然再次失败，界面应引导购买积分而不是重试。 */
export function isInsufficientCreditsError(value: unknown) {
    const text = value instanceof Error ? value.message : String(value || "");
    return text.includes("积分不足") || /insufficient[_ ]credits/i.test(text);
}

export function isContentModerationError(value: unknown) {
    return classifyGenerationError(value).startsWith("content_policy_");
}

export function unchangedModeratedPrompt(metadata: { errorDetails?: string; generationErrorCode?: string; failedPromptFingerprint?: string } | undefined, prompt: string) {
    if (metadata?.generationErrorCode === "content_policy_input_media") return false;
    const moderationFailure = metadata?.generationErrorCode?.startsWith("content_policy_") || metadata?.generationErrorCode === CONTENT_MODERATION_ERROR_CODE || isContentModerationError(metadata?.errorDetails);
    if (!moderationFailure) return false;
    if (!metadata?.failedPromptFingerprint) return true;
    return metadata.failedPromptFingerprint === generationPromptFingerprint(prompt);
}

// 指纹只用于识别“原样重试”，不是安全或鉴权用途。
export function generationPromptFingerprint(value: string) {
    const normalized = value.trim().replace(/\s+/g, " ");
    let hash = 2166136261;
    for (let index = 0; index < normalized.length; index += 1) {
        hash ^= normalized.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return `${normalized.length}:${(hash >>> 0).toString(36)}`;
}
