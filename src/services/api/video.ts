import { currentLocaleText as t } from "@/i18n/current-locale-text";
import { modelCapabilityConfigFor } from "@/lib/model-capabilities";
import { uploadMediaFile, type UploadedFile } from "@/services/file-storage";
import { resolveModelRequestConfig, type AiConfig } from "@/stores/use-config-store";
import type { ReferenceImage } from "@/types/image";
import type { ReferenceAudio, ReferenceVideo } from "@/types/media";

import { assertVideoCapability, assertVideoConfig } from "./video-validation";
import type { RequestOptions, VideoGenerationResult, VideoGenerationTask, VideoGenerationTaskState } from "./video-contracts";
import { videoResponseTools } from "./video-response";
import type { VideoProviderDeps } from "./video-provider-deps";
import { createAgnesVideoTask, isAgnesConfig } from "./video-provider-agnes";
import { createGeminiVeoTask } from "./video-provider-gemini";
import { createMiniMaxVideoTask } from "./video-provider-minimax";
import { createVideoGenerationsTask } from "./video-provider-newapi";
import { createNovitaVideoTask } from "./video-provider-novita";
import { createOpenAIVideoTask } from "./video-provider-openai";
import { createSeedanceTask, isSeedanceConfig } from "./video-provider-seedance";
import { createVideoTransport } from "./video-transport";

export type { VideoGenerationResult, VideoGenerationTask, VideoGenerationTaskState } from "./video-contracts";

export async function createVideoGenerationTask(config: AiConfig, prompt: string, references: ReferenceImage[] = [], videoReferences: ReferenceVideo[] = [], audioReferences: ReferenceAudio[] = [], options?: RequestOptions): Promise<VideoGenerationTask> {
    const selectedModel = (config.model || config.videoModel).trim();
    const requestConfig = resolveModelRequestConfig(config, selectedModel);
    assertVideoConfig(requestConfig, requestConfig.model);
    assertVideoCapability(modelCapabilityConfigFor(config, selectedModel).video!, references, videoReferences, audioReferences, config.videoSeconds);
    const deps: VideoProviderDeps = { transport: createVideoTransport(requestConfig), response: videoResponseTools };
    if (requestConfig.interfaceType === "newapi-channel-2") return createVideoGenerationsTask(deps, requestConfig, selectedModel, prompt, references, videoReferences, audioReferences, options);
    if (requestConfig.interfaceType === "gemini-veo") return createGeminiVeoTask(deps, requestConfig, selectedModel, prompt, references, videoReferences, audioReferences, options);
    if (requestConfig.interfaceType === "novita-video") return createNovitaVideoTask(deps, requestConfig, selectedModel, prompt, references, videoReferences, audioReferences, options);
    if (requestConfig.interfaceType === "minimax-video") return createMiniMaxVideoTask(deps, requestConfig, selectedModel, prompt, references, videoReferences, audioReferences, options);
    if (isAgnesConfig(requestConfig)) return createAgnesVideoTask(deps, requestConfig, selectedModel, prompt, references, videoReferences, audioReferences, options);
    if (requestConfig.interfaceType !== "newapi" && isSeedanceConfig(requestConfig)) return createSeedanceTask(deps, requestConfig, selectedModel, prompt, references, videoReferences, audioReferences, options);
    if (videoReferences.length || audioReferences.length) throw new Error(t("creationRuntime.videoReferenceProtocolUnsupported"));
    return createOpenAIVideoTask(deps, requestConfig, selectedModel, prompt, references, options);
}

export async function storeGeneratedVideo(result: VideoGenerationResult): Promise<UploadedFile> {
    if (result.blob) return uploadMediaFile(result.blob, "video");
    if (result.url) return { url: result.url, storageKey: "", bytes: 0, mimeType: result.mimeType || "video/mp4" };
    throw new Error(t("creationRuntime.videoMissing"));
}

export type { VideoProviderDeps } from "./video-provider-deps";
