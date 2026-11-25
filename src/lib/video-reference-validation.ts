const reviewed = {};
import { modelCapabilityConfigFor } from "@/lib/model-capabilities";
import { compatibleModelInGroup, modelRequestOptions, type ModelRequirements } from "@/lib/model-selection";
import { modelOptionName, selectableModelsByCapability, useConfigStore, type AiConfig } from "@/stores/use-config-store";
import { showVideoReferenceWarning, type VideoReferenceIssue, type VideoReferenceWarning } from "./video-reference-issue";

type Video = { durationMs?: number; bytes?: number };
// The reviewed intersection is shared with admission; unknown models continue
// to use their explicit capability contract. Server probes remain authoritative.
function limitsFor(config: AiConfig, model: string) {
    const name = modelOptionName(model).toLowerCase().replaceAll("_", "-");
    const family = name.includes("motion-control")
        ? "kling-motion-control"
        : name === "kling-video-v4" || name === "kling-4"
          ? "kling-4"
        : name.includes("kling-o1")
          ? "kling-o1"
          : name.includes("kling-o3")
            ? "kling-o3"
            : name.includes("wan3.0") || name.includes("wan-3")
              ? "wan-3.0"
              : (name.includes("seedance") && name.includes("mini")) || name.includes("sd-mini")
                ? "seedance-2.0-mini"
                : (name.includes("seedance") && (name.includes("2.5") || name.includes("2-5"))) || name.includes("sd-2.5")
                  ? "seedance-2.5"
                  : (name.includes("seedance") && (name.includes("2.0") || name.includes("2-0"))) || name.includes("sd2.0")
                    ? "seedance-2.0"
                    : Object.keys(reviewed).find((key) => name.includes(key)) || (name.includes("kling-v3") ? "kling-3.0" : name.includes("veo-3-1") ? "veo-3.1" : "");
    const table = reviewed as Record<string, { video?: { maxCount?: number; minDuration?: number; maxDuration?: number; maxTotalDuration?: number }; maxReferenceAndOutputDuration?: number }>;
    const entry = table[family];
    const fallback = modelCapabilityConfigFor(config, model).video?.references;
    const explicit = config.channels.some((channel) => channel.modelCosts?.some((cost) => cost.model === modelOptionName(model) && cost.capabilityConfig));
    return {
        known: Boolean(entry || explicit),
        maxCount: entry ? entry.video?.maxCount || 0 : fallback?.maxVideos || 0,
        min: entry?.video?.minDuration || 0,
        max: entry?.video?.maxDuration || fallback?.maxVideoDurationSeconds || 0,
        total: entry?.video?.maxTotalDuration || 0,
        combined: entry?.maxReferenceAndOutputDuration || 0,
    };
}

export function videoReferenceIssue(config: AiConfig, videos: Video[], model = config.model): VideoReferenceIssue | undefined {
    if (!videos.length || (config.taskWorkflowProvider && config.taskWorkflowProvider !== "model")) return;
    const limits = limitsFor(config, model);
    if (!limits.known) return;
    if (!limits.maxCount) return { subtype: "video_unsupported", seconds: 0, limit: 0 };
    for (const video of videos) {
        const seconds = (video.durationMs || 0) / 1000;
        if (seconds > 180 || (video.bytes || 0) > 200 * 1024 * 1024) return { subtype: "video_upload_limit", seconds, limit: 180 };
        if (limits.max && seconds > limits.max) return { subtype: "video_too_long", seconds, limit: limits.max };
        // Missing metadata is probed by the server, never guessed as zero.
        if (seconds > 0 && limits.min && seconds < limits.min) return { subtype: "video_too_short", seconds, limit: limits.min };
    }
    const total = videos.reduce((sum, video) => sum + (video.durationMs || 0) / 1000, 0);
    const max = limits.combined ? Math.min(limits.total || Infinity, Math.max(0, limits.combined - Number(config.videoSeconds || 0))) : limits.total;
    if ((limits.total || limits.combined) && total > max) return { subtype: "video_total_too_long", seconds: total, limit: max };
}

export function supportedVideoReferenceModel(config: AiConfig, videos: Video[], requirements?: ModelRequirements) {
    const candidates = selectableModelsByCapability(config, "video").filter((model) => !videoReferenceIssue(config, videos, model) && videos.length <= limitsFor(config, model).maxCount);
    return compatibleModelInGroup(config, candidates, requirements);
}

export function guardVideoReferences(config: AiConfig, videos: Video[], actions: { onReplace?: () => void; onModelChange?: (model: string) => void; requirements?: ModelRequirements } = {}) {
    const issue = videoReferenceIssue(config, videos);
    if (!issue) return true;
    const model = issue.subtype === "video_unsupported" ? supportedVideoReferenceModel(config, videos, actions.requirements) : "";
    const warning: VideoReferenceWarning = { issue, onReplace: actions.onReplace, onSwitch: model && actions.onModelChange ? () => actions.onModelChange!(model) : undefined };
    showVideoReferenceWarning(warning);
    return false;
}

export const VIDEO_REFERENCE_ACTION_EVENT = "canvas:video-reference-action";
export function videoReferenceActions(config: AiConfig, videos: Video[], nodeId?: string, counts?: { imageCount: number; audioCount: number }) {
    const action = (kind: "replace" | "model", model?: string) => {
        if (!nodeId && model) useConfigStore.getState().updateConfig("videoModel", model);
        window.dispatchEvent(new CustomEvent(VIDEO_REFERENCE_ACTION_EVENT, { detail: { nodeId, kind, model } }));
    };
    return {
        onReplace: () => action("replace"),
        onModelChange: (model: string) => action("model", model),
        requirements: {
            capability: "video" as const,
            videoSeconds: config.videoSeconds,
            options: modelRequestOptions(config, "video"),
            input: { textCount: 1, imageCount: counts?.imageCount || 0, videoCount: videos.length, audioCount: counts?.audioCount || 0, characterCount: 0 },
        },
    };
}
