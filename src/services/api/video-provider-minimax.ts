import { currentLocaleText as t } from "@/i18n/current-locale-text";
import { getMediaBlob } from "@/services/file-storage";
import { imageToDataUrl } from "@/services/image-storage";
import { boolConfig } from "@/lib/seedance-video";
import { modelOptionName } from "@/stores/use-config-store";
import { isPublicMediaUrl } from "./video-validation";
import { blobToDataUrl } from "./video-response";
import type { ReferenceImage } from "@/types/image";
import type { ReferenceAudio, ReferenceVideo } from "@/types/media";

import type { MiniMaxVideoCreateResponse, RequestOptions, ResolvedAiConfig, VideoGenerationTask } from "./video-contracts";
import type { VideoProviderDeps } from "./video-provider-deps";
import { resolveVideoImageReferences } from "./video-reference-roles";

export async function createMiniMaxVideoTask(deps: VideoProviderDeps, config: ResolvedAiConfig, model: string, prompt: string, references: ReferenceImage[], videoReferences: ReferenceVideo[], audioReferences: ReferenceAudio[], options?: RequestOptions): Promise<VideoGenerationTask> {
    const imageUrls = await Promise.all(references.slice(0, 9).map((image) => resolveMiniMaxImageUrl(image)));
    const videoUrls = await Promise.all(videoReferences.slice(0, 3).map((video) => resolveMiniMaxMediaUrl(video)));
    const audioUrls = await Promise.all(audioReferences.slice(0, 3).map((audio) => resolveMiniMaxMediaUrl(audio)));
    const content: Array<Record<string, unknown>> = [{ type: "text", text: prompt.trim() }];
    const imagePlan = resolveVideoImageReferences(references.slice(0, 9), options, { videoCount: videoUrls.length, audioCount: audioUrls.length });
    const frameMode = imagePlan.some(({ role }) => role === "first_frame" || role === "last_frame");
    imageUrls.forEach((url, index) => {
        const role = imagePlan[index]?.role || "reference_image";
        if (frameMode && role === "reference_image") throw new Error(t("creationRuntime.minimaxMixedFrames"));
        content.push({ type: "image_url", image_url: { url }, role });
    });
    videoUrls.forEach((url) => content.push({ type: "video_url", video_url: { url }, role: "reference_video" }));
    audioUrls.forEach((url) => content.push({ type: "audio_url", audio_url: { url }, role: "reference_audio" }));
    const payload = {
        model: modelOptionName(model),
        content,
        resolution: normalizeMiniMaxResolution(config.vquality),
        duration: normalizeMiniMaxDuration(config.videoSeconds),
        ratio: normalizeMiniMaxRatio(config.size, frameMode),
        aigc_watermark: boolConfig(config.videoWatermark, false),
    };
    try {
        const created = await deps.transport.post<MiniMaxVideoCreateResponse>(miniMaxVideoUrl(config, "/video_generation"), payload, options);
        const id = created.task_id || created.request_id || created.data?.task_id || created.data?.id || "";
        if (!id) throw new Error(t("creationRuntime.providerTaskIdMissing", { provider: "MiniMax" }));
        return { id, provider: "minimax", model };
    } catch (error) {
        throw new Error(deps.response.readAxiosError(error, t("creationRuntime.providerCreateFailed", { provider: "MiniMax" })));
    }
}

function miniMaxVideoUrl(config: ResolvedAiConfig, path: string) {
    const base = config.baseUrl.replace(/\/+$/, "");
    return /\/v2$/i.test(base) ? `${base}${path}` : `${base}/v2${path}`;
}

function normalizeMiniMaxResolution(value: string) {
    const normalized = value.trim().toLowerCase();
    return ["2k", "4k", "high", "1080", "1080p", "1440p", "2160p"].includes(normalized) ? "2K" : "768P";
}

function normalizeMiniMaxDuration(value: string) {
    const seconds = Math.floor(Number(value) || 5);
    return Math.max(4, Math.min(15, seconds));
}

function normalizeMiniMaxRatio(value: string, frameMode: boolean) {
    if (frameMode) return "adaptive";
    return ["adaptive", "21:9", "16:9", "4:3", "1:1", "3:4", "9:16"].includes(value) ? value : "16:9";
}

async function resolveMiniMaxImageUrl(image: ReferenceImage) {
    const directUrl = image.url || image.dataUrl;
    if (isPublicMediaUrl(directUrl) || directUrl.startsWith("data:")) return directUrl;
    const dataUrl = await imageToDataUrl(image);
    if (!dataUrl) throw new Error(t("creationRuntime.referenceReadFailed"));
    return dataUrl;
}

async function resolveMiniMaxMediaUrl(media: ReferenceVideo | ReferenceAudio) {
    if (isPublicMediaUrl(media.url) || media.url?.startsWith("data:")) return media.url;
    let blob: Blob | null = null;
    if (media.storageKey) blob = await getMediaBlob(media.storageKey);
    if (!blob && media.url?.startsWith("blob:")) blob = await (await fetch(media.url)).blob();
    if (!blob) throw new Error(t("creationRuntime.referenceReadFailed"));
    return blobToDataUrl(blob);
}
