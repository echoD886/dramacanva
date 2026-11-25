import { classifyGenerationError, generationFailurePresentation, type GenerationErrorCode } from "@/lib/generation-failure";
import { ApiError } from "@/services/api/request";
import type { MessageKey } from "@/i18n/messages";
import { agentToolText, agentToolStatus } from "@/lib/canvas/agent-tool-presentation";
import { b2Text } from "@/i18n/upstream-b2";

export type AgentErrorCategory = "credits" | "auth" | "permission" | "moderation" | "model" | "network" | "argument" | "unknown";
const record = (value: unknown): Record<string, unknown> => (value && typeof value === "object" ? (value as Record<string, unknown>) : {});
function errorStatus(data: Record<string, unknown>) {
    const result = record(data.result);
    return Number(data.httpStatus || record(data.detail).httpStatus || (typeof data.status === "number" ? data.status : undefined) || result.httpStatus || result.status);
}

export function isRecoverableAgentToolError(detail: unknown) {
    const result = record(record(detail).result);
    return classifyAgentError(detail) === "argument" || (result.retryable === true && result.noSideEffects === true);
}

/** Tool failures belong to the runtime until it reports a terminal run failure. */
export function isHiddenAgentToolStep(title: string, text: string, detail: unknown) {
    return isRecoverableAgentToolError(detail) || agentToolStatus(title, text, detail) === "failed" || /^(tool_retry|tool_retrying|tool_route_switched)$/.test(String(record(detail).eventType));
}

/** Agent categories are a legacy projection of the shared generation contract. */
export function classifyAgentError(cause: unknown): AgentErrorCategory {
    const code = classifyGenerationError(cause);
    if (errorStatus(record(cause)) === 404 || errorStatus(record(cause)) === 501) return "unknown";
    const categories: Record<GenerationErrorCode, AgentErrorCategory> = {
        content_review_pending: "moderation",
        premium_capability_required: "permission",
        content_policy_prompt: "moderation",
        content_policy_input_media: "moderation",
        content_policy_output: "moderation",
        upstream_unstable: "model",
        upstream_timeout: "network",
        model_submission_uncertain: "model",
        model_unavailable: "model",
        invalid_input: "argument",
        reference_fetch_failed: "argument",
        result_media_unavailable: "model",
        insufficient_credits: "credits",
        quota_or_rate_limit_user: "model",
        auth_expired: "auth",
        network: "network",
        permission_denied: "permission",
        unknown: "unknown",
    };
    return categories[code];
}

export function agentErrorPresentation(cause: unknown, fallback?: string | MessageKey, translate = agentToolText) {
    const error = generationFailurePresentation(cause, translate);
    const data = record(cause);
    const status = errorStatus(data);
    const reason = data.reason || record(data.detail).reason;
    const limitText = reason === "agent_run_limit" ? b2Text("agent.limit.concurrent") : reason === "agent_history_capacity" ? b2Text("agent.limit.history") : undefined;
    const contextKey = record(data.detail).contextKey || (fallback?.includes(".") && !fallback.includes(" ") ? fallback : undefined);
    return {
        ...error,
        title: status === 404 ? translate("agentErrors.notFoundTitle") : status === 501 ? translate("agentErrors.notOpenTitle") : error.title,
        text: limitText || (status === 404 ? translate("agentErrors.notFoundText") : status === 501 ? translate("agentErrors.notOpenText") : error.text),
        errorCategory: classifyAgentError(cause),
        detail: { ...error.detail, contextKey, httpStatus: status || undefined },
    };
}

export function agentSubmissionErrorTitle(cause: unknown, accepted: boolean): string {
    if (accepted) return agentToolText("agentErrors.submitAcceptedCleanupFailed");
    const status = cause instanceof ApiError ? cause.status : undefined;
    if ((cause instanceof ApiError && cause.reason === "content_review_pending") || (status && [400, 401, 403, 404, 422].includes(status))) return agentToolText("agentErrors.submitRejected");
    if (status) return agentToolText("agentErrors.submitServerError");
    return agentToolText("agentErrors.submitUnconfirmed");
}
