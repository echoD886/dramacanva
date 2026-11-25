import { currentLocaleText as t } from "@/i18n/current-locale-text";
import { modelCapabilityConfigFor } from "@/lib/model-capabilities";
import { boolConfig, buildSeedancePromptText, isArkPlanBaseUrl, isSeedanceVideoConfig, normalizeSeedanceDuration, normalizeSeedanceRatio, normalizeSeedanceResolution, seedanceVideoReferenceError, SEEDANCE_REFERENCE_LIMITS } from "@/lib/seedance-video";
import { getResourceOSSUrl } from "@/services/api/resources";
import { getMediaBlob } from "@/services/file-storage";
import { imageToDataUrl } from "@/services/image-storage";
import { buildApiUrl, modelOptionName, type AiConfig } from "@/stores/use-config-store";
import type { ReferenceImage } from "@/types/image";
import type { ReferenceAudio, ReferenceVideo } from "@/types/media";

import { isPublicMediaUrl } from "./video-validation";
import type { ApiEnvelope, RequestOptions, ResolvedAiConfig, SeedanceTask, VideoGenerationTask } from "./video-contracts";
import type { VideoProviderDeps } from "./video-provider-deps";
import { hasExplicitVideoFrames, resolveVideoImageReferences } from "./video-reference-roles";

export function isSeedanceConfig(config: ResolvedAiConfig) {
    return config.interfaceType === "volcengine-ark-video" || isSeedanceVideoConfig(config);
}

export async function createSeedanceTask(deps: VideoProviderDeps, config: ResolvedAiConfig, model: string, prompt: string, references: ReferenceImage[], videoReferences: ReferenceVideo[], audioReferences: ReferenceAudio[], options?: RequestOptions): Promise<VideoGenerationTask> {
    assertSeedanceVideoReferences(videoReferences);
    assertSeedanceAudioReferences(audioReferences);
    const isVolcengineArk = config.interfaceType === "volcengine-ark-video";
    const payload = isVolcengineArk || isArkPlanBaseUrl(config.baseUrl)
        ? await buildSeedanceAgentPlanPayload(config, model, prompt, references, videoReferences, audioReferences, deps, options)
        : await buildSeedanceVideosPayload(config, model, prompt, references, videoReferences, audioReferences, deps, options);

    try {
        const raw = await deps.transport.post<ApiEnvelope<SeedanceTask>>(seedanceApiUrl(config), payload, options);
        const created = deps.response.unwrapSeedanceTask(raw);
        const id = created.id || created.task_id;
        if (!id) throw new Error(t("creationRuntime.providerTaskIdMissing", { provider: "Seedance" }));
        return { id, provider: "seedance", model };
    } catch (error) {
        throw new Error(deps.response.readAxiosError(error, t("creationRuntime.providerCreateFailed", { provider: "Seedance" })));
    }
}

function assertSeedanceVideoReferences(videoReferences: ReferenceVideo[]) {
    const error = seedanceVideoReferenceError(videoReferences);
    if (error) throw new Error(error);
    let total = 0;
    for (const video of videoReferences) {
        if (!video.durationMs) continue;
        if (video.durationMs < 2000 || video.durationMs > 15000) throw new Error(t("creationRuntime.seedanceReferenceDuration"));
        total += video.durationMs;
    }
    if (total > 15000) throw new Error(t("creationRuntime.seedanceReferenceDuration"));
}

function assertSeedanceAudioReferences(audioReferences: ReferenceAudio[]) {
    let total = 0;
    for (const audio of audioReferences) {
        if (!audio.durationMs) continue;
        if (audio.durationMs < 2000 || audio.durationMs > 15000) throw new Error(t("creationRuntime.seedanceReferenceDuration"));
        total += audio.durationMs;
    }
    if (total > 15000) throw new Error(t("creationRuntime.seedanceReferenceDuration"));
}

function seedanceApiUrl(config: ResolvedAiConfig, taskId?: string) {
    if (config.interfaceType === "volcengine-ark-video" || isArkPlanBaseUrl(config.baseUrl)) return buildApiUrl(config.baseUrl, `/contents/generations/tasks${taskId ? `/${encodeURIComponent(taskId)}` : ""}`);
    return buildApiUrl(config.baseUrl, `/videos${taskId ? `/${encodeURIComponent(taskId)}` : ""}`);
}

async function buildSeedanceAgentPlanPayload(config: ResolvedAiConfig, model: string, prompt: string, references: ReferenceImage[], videoReferences: ReferenceVideo[], audioReferences: ReferenceAudio[], deps: VideoProviderDeps, options?: RequestOptions) {
    if (audioReferences.length && !references.length && !videoReferences.length) {
        throw new Error(config.interfaceType === "volcengine-ark-video" ? t("creationRuntime.audioReferenceNeedsVisual") : t("creationRuntime.audioReferenceNeedsVisual"));
    }
    const content = config.interfaceType === "volcengine-ark-video"
        ? await buildVolcengineArkContent(prompt, references, videoReferences, audioReferences, options)
        : await buildSeedanceContent(config, prompt, references, videoReferences, audioReferences, deps, options);
    if (!content.length) throw new Error(t("creationRuntime.videoPromptOrReference"));
    const profile = modelCapabilityConfigFor(config, model).video!;
    return {
        model: modelOptionName(model),
        content,
        ratio: normalizeSeedanceRatio(config.size),
        resolution: normalizeSeedanceResolution(config.vquality, modelOptionName(model)),
        duration: normalizeSeedanceDuration(config.videoSeconds),
        ...(profile.generateAudio.supported ? { generate_audio: boolConfig(config.videoGenerateAudio, profile.generateAudio.default) } : {}),
        ...(profile.watermark.supported ? { watermark: boolConfig(config.videoWatermark, profile.watermark.default) } : {}),
    };
}

async function buildVolcengineArkContent(prompt: string, references: ReferenceImage[], videoReferences: ReferenceVideo[], audioReferences: ReferenceAudio[], options?: RequestOptions) {
    const content: Array<Record<string, unknown>> = [];
    const imagePlan = resolveVideoImageReferences(references.slice(0, SEEDANCE_REFERENCE_LIMITS.images), options, { videoCount: videoReferences.length, audioCount: audioReferences.length });
    if (prompt.trim()) content.push({ type: "text", text: prompt.trim() });
    for (const { image, role } of imagePlan) {
        content.push({ type: "image_url", image_url: { url: await resolveVolcengineArkReferenceUrl(image.arkAssetId ? `asset://${image.arkAssetId}` : image.url || image.dataUrl, image.storageKey) }, role });
    }
    for (const video of videoReferences.slice(0, SEEDANCE_REFERENCE_LIMITS.videos)) {
        content.push({ type: "video_url", video_url: { url: await resolveVolcengineArkReferenceUrl(video.url, video.storageKey) }, role: "reference_video" });
    }
    for (const audio of audioReferences.slice(0, SEEDANCE_REFERENCE_LIMITS.audios)) {
        content.push({ type: "audio_url", audio_url: { url: await resolveVolcengineArkReferenceUrl(audio.url, audio.storageKey) }, role: "reference_audio" });
    }
    return content;
}

async function resolveVolcengineArkReferenceUrl(value: string | undefined, storageKey?: string) {
    // 已录入的方舟素材 ID 优先：已过审或被授权的素材直接引用，无需再换对象存储地址。
    if (String(value || "").startsWith("asset://")) return String(value);
    if (storageKey?.startsWith("resource:")) return getResourceOSSUrl(storageKey);
    if (isPublicMediaUrl(value || "")) return String(value);
    throw new Error(t("creationRuntime.arkReferenceURL"));
}

async function buildSeedanceVideosPayload(config: AiConfig, model: string, prompt: string, references: ReferenceImage[], videoReferences: ReferenceVideo[], audioReferences: ReferenceAudio[], deps: VideoProviderDeps, options?: RequestOptions) {
    if ((videoReferences.length || audioReferences.length) && !references.length) {
        throw new Error(t("creationRuntime.seedanceMainImage"));
    }
    const imageUrls = await Promise.all(references.slice(0, SEEDANCE_REFERENCE_LIMITS.images).map(resolveSeedanceVideosImageUrl));
    const imagePlan = resolveVideoImageReferences(references.slice(0, SEEDANCE_REFERENCE_LIMITS.images), options, { videoCount: videoReferences.length, audioCount: audioReferences.length });
    const videoUrls = await Promise.all(videoReferences.slice(0, SEEDANCE_REFERENCE_LIMITS.videos).map((media) => resolveSeedanceVideosMediaUrl(media, deps)));
    const audioUrls = await Promise.all(audioReferences.slice(0, SEEDANCE_REFERENCE_LIMITS.audios).map((media) => resolveSeedanceVideosMediaUrl(media, deps)));
    const ratio = normalizeSeedanceRatio(config.size);
    const duration = normalizeSeedanceDuration(config.videoSeconds);
    const profile = modelCapabilityConfigFor(config, model).video!;
    const imagePayload: Record<string, unknown> = {};
    if (options?.videoEditOperation === "reference_to_video") {
        if (imageUrls.length) imagePayload.reference_image_urls = imageUrls;
    } else if (hasExplicitVideoFrames(options)) {
        imagePayload.image_urls = orderedImageUrls(imageUrls, imagePlan.map(({ role }) => role));
    } else if (imageUrls.length) {
        imagePayload.image_url = imageUrls[0];
        if (imageUrls.length > 1) imagePayload.reference_image_urls = imageUrls.slice(1);
    }
    return {
        model: modelOptionName(model),
        prompt: prompt.trim(),
        aspect_ratio: ratio === "adaptive" ? "16:9" : ratio,
        duration,
        ...(profile.generateAudio.supported ? { generate_audio: boolConfig(config.videoGenerateAudio, profile.generateAudio.default) } : {}),
        ...imagePayload,
        ...(videoUrls.length ? { reference_videos: videoUrls } : {}),
        ...(audioUrls.length ? { reference_audios: audioUrls } : {}),
    };
}

async function buildSeedanceContent(config: AiConfig, prompt: string, references: ReferenceImage[], videoReferences: ReferenceVideo[], audioReferences: ReferenceAudio[], deps: VideoProviderDeps, options?: RequestOptions) {
    const content: Array<Record<string, unknown>> = [];
    const imagePlan = resolveVideoImageReferences(references.slice(0, SEEDANCE_REFERENCE_LIMITS.images), options, { videoCount: videoReferences.length, audioCount: audioReferences.length });
    const text = buildSeedancePromptText(prompt, references, videoReferences, audioReferences);
    if (text) content.push({ type: "text", text });
    for (const { image, role } of imagePlan) {
        content.push({ type: "image_url", image_url: { url: await resolveSeedanceImageUrl(image) }, role });
    }
    for (const video of videoReferences.slice(0, SEEDANCE_REFERENCE_LIMITS.videos)) {
        content.push({ type: "video_url", video_url: { url: await resolveSeedanceMediaUrl(video, deps) }, role: "reference_video" });
    }
    for (const audio of audioReferences.slice(0, SEEDANCE_REFERENCE_LIMITS.audios)) {
        content.push({ type: "audio_url", audio_url: { url: await resolveSeedanceMediaUrl(audio, deps) }, role: "reference_audio" });
    }
    return content;
}

function orderedImageUrls(imageUrls: string[], roles: Array<"first_frame" | "last_frame" | "reference_image">) {
    return ["first_frame", "last_frame", "reference_image"].flatMap((role) => imageUrls.filter((_, index) => roles[index] === role));
}

async function resolveSeedanceImageUrl(image: ReferenceImage) {
    const directUrl = image.url || image.dataUrl;
    if (isPublicMediaUrl(directUrl) || directUrl.startsWith("asset://")) return directUrl;
    const dataUrl = await imageToDataUrl(image);
    if (!dataUrl) throw new Error(t("creationRuntime.referenceReadFailed"));
    return dataUrl;
}

async function resolveSeedanceVideosImageUrl(image: ReferenceImage) {
    const directUrl = image.url || image.dataUrl;
    if (isPublicMediaUrl(directUrl) || directUrl.startsWith("data:")) return directUrl;
    const dataUrl = await imageToDataUrl(image);
    if (!dataUrl) throw new Error(t("creationRuntime.referenceReadFailed"));
    return dataUrl;
}

async function resolveSeedanceMediaUrl(media: ReferenceVideo | ReferenceAudio, deps: VideoProviderDeps) {
    if (isPublicMediaUrl(media.url) || media.url.startsWith("asset://")) return media.url;
    let blob: Blob | null = null;
    if (media.storageKey) blob = await getMediaBlob(media.storageKey);
    if (!blob && media.url?.startsWith("blob:")) blob = await (await fetch(media.url)).blob();
    if (!blob) throw new Error(t("creationRuntime.referenceSourceURL"));
    return deps.response.blobToDataUrl(blob);
}

async function resolveSeedanceVideosMediaUrl(media: ReferenceVideo | ReferenceAudio, deps: VideoProviderDeps) {
    if (isPublicMediaUrl(media.url) || media.url?.startsWith("data:")) return media.url;
    let blob: Blob | null = null;
    if (media.storageKey) blob = await getMediaBlob(media.storageKey);
    if (!blob && media.url?.startsWith("blob:")) blob = await (await fetch(media.url)).blob();
    if (!blob) throw new Error(t("creationRuntime.referenceSourceURL"));
    return deps.response.blobToDataUrl(blob);
}
