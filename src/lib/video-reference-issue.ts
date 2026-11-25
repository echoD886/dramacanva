import type { MessageKey, MessageValues } from "@/i18n/messages";

export type VideoReferenceIssue = { subtype: "video_too_long" | "video_too_short" | "video_total_too_long" | "video_unsupported" | "video_upload_limit"; seconds: number; limit: number };
const subtypes = ["video_too_long", "video_too_short", "video_total_too_long", "video_unsupported", "video_upload_limit"];

export function videoReferenceIssueFromError(error: unknown): VideoReferenceIssue | undefined {
    if (!error || typeof error !== "object") return;
    const data = error as Record<string, unknown>;
    for (const item of [data.details, data.detail, data.result, data]) {
        if (!item || typeof item !== "object") continue;
        const value = item as VideoReferenceIssue;
        if (subtypes.includes(value.subtype) && Number.isFinite(value.seconds) && value.seconds >= 0 && Number.isFinite(value.limit) && value.limit >= 0) return value;
    }
}

export function videoReferenceIssueText(issue: VideoReferenceIssue, t: (key: MessageKey, values?: MessageValues) => string) {
    return t(`generationFailure.video.${issue.subtype}`, { seconds: Number(issue.seconds.toFixed(3)), limit: Number(issue.limit.toFixed(3)) });
}

export type VideoReferenceWarning = { issue: VideoReferenceIssue; onReplace?: () => void; onSwitch?: () => void };
export const VIDEO_REFERENCE_WARNING_EVENT = "canvas:video-reference-warning";
export function showVideoReferenceWarning(warning: VideoReferenceWarning) {
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(VIDEO_REFERENCE_WARNING_EVENT, { detail: warning }));
}
