import { currentLocaleText as t } from "@/i18n/current-locale-text";
import { imageToDataUrl } from "@/services/image-storage";
import { modelOptionName } from "@/stores/use-config-store";
import type { ReferenceImage } from "@/types/image";
import type { ReferenceAudio, ReferenceVideo } from "@/types/media";

import { normalizeVideoResolution, normalizeVideoSeconds, normalizeVideoSize } from "./video-validation";
import type { RequestOptions, ResolvedAiConfig, VideoGenerationTask } from "./video-contracts";
import type { VideoProviderDeps } from "./video-provider-deps";

type GeminiVeoOperation = {
    name?: string;
    done?: boolean;
    error?: { message?: string };
    response?: Record<string, unknown>;
};

export async function createGeminiVeoTask(deps: VideoProviderDeps, config: ResolvedAiConfig, model: string, prompt: string, references: ReferenceImage[], videoReferences: ReferenceVideo[], audioReferences: ReferenceAudio[], options?: RequestOptions): Promise<VideoGenerationTask> {
    if (references.length > 1 || videoReferences.length || audioReferences.length) throw new Error(t("creationRuntime.providerStartImageOnly", { provider: "Gemini Veo" }));
    if (references.length && options?.videoEditOperation === "reference_to_video") throw new Error(t("creationRuntime.providerReferenceModeUnsupported", { provider: "Gemini Veo" }));
    const instance: Record<string, unknown> = { prompt: prompt.trim() };
    if (references[0]) {
        const dataUrl = await imageToDataUrl(references[0]);
        const matched = /^data:([^;,]+);base64,(.+)$/s.exec(dataUrl);
        if (!matched) throw new Error(t("creationRuntime.referenceReadFailed"));
        instance.image = { bytesBase64Encoded: matched[2], mimeType: matched[1] };
    }
    const payload = {
        instances: [instance],
        parameters: {
            aspectRatio: normalizeVideoSize(config.size) || "16:9",
            durationSeconds: Number.parseInt(normalizeVideoSeconds(config.videoSeconds), 10) || 6,
            resolution: normalizeVideoResolution(config.vquality),
            sampleCount: 1,
        },
    };
    try {
        const response = await deps.transport.post<GeminiVeoOperation>(geminiVeoCreateUrl(config, modelOptionName(model)), payload, options);
        if (!response.name) throw new Error(t("creationRuntime.providerTaskIdMissing", { provider: "Gemini Veo" }));
        return { id: response.name, provider: "gemini-veo", model };
    } catch (error) {
        throw new Error(deps.response.readAxiosError(error, t("creationRuntime.providerCreateFailed", { provider: "Gemini Veo" })));
    }
}

function geminiVeoCreateUrl(config: ResolvedAiConfig, model: string) {
    return `${geminiVeoBaseUrl(config)}/models/${encodeURIComponent(model)}:predictLongRunning`;
}

function geminiVeoBaseUrl(config: ResolvedAiConfig) {
    const base = config.baseUrl.replace(/\/+$/, "");
    return /\/v1beta$/i.test(base) ? base : `${base}/v1beta`;
}

function findGeminiVideoURL(value: unknown): string {
    if (!value || typeof value !== "object") return "";
    if (Array.isArray(value)) {
        for (const item of value) {
            const found = findGeminiVideoURL(item);
            if (found) return found;
        }
        return "";
    }
    const record = value as Record<string, unknown>;
    for (const key of ["uri", "url", "videoUri", "video_url"]) {
        if (typeof record[key] === "string" && /^https?:\/\//i.test(record[key])) return record[key];
    }
    for (const child of Object.values(record)) {
        const found = findGeminiVideoURL(child);
        if (found) return found;
    }
    return "";
}
