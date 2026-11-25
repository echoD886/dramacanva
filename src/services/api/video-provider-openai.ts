import { currentLocaleText as t } from "@/i18n/current-locale-text";
import { dataUrlToFile } from "@/lib/image-utils";
import { modelCapabilityConfigFor, videoResolutionRequest } from "@/lib/model-capabilities";
import { imageToDataUrl } from "@/services/image-storage";
import { modelOptionName } from "@/stores/use-config-store";
import type { ReferenceImage } from "@/types/image";

import { normalizeVideoSeconds, normalizeVideoSize } from "./video-validation";
import type { RequestOptions, ResolvedAiConfig, ApiVideoResponse, VideoGenerationTask } from "./video-contracts";
import type { VideoProviderDeps } from "./video-provider-deps";

export async function createOpenAIVideoTask(deps: VideoProviderDeps, config: ResolvedAiConfig, model: string, prompt: string, references: ReferenceImage[], options?: RequestOptions): Promise<VideoGenerationTask> {
    const modelName = modelOptionName(model);
    if (config.interfaceType === "xai-video" || (config.interfaceType !== "newapi" && modelName.toLowerCase().includes("grok"))) {
        const images = await Promise.all(references.slice(0, 7).map((image) => imageToDataUrl(image)));
        const seconds = normalizeVideoSeconds(config.videoSeconds);
        const referenceMode = options?.videoEditOperation === "reference_to_video";
        const explicitFrameMode = !referenceMode && Boolean(options?.videoStartFrameNodeId || options?.videoEndFrameNodeId);
        if (config.interfaceType === "xai-video" && explicitFrameMode && (images.length > 1 || options?.videoEndFrameNodeId)) throw new Error(t("creationRuntime.xaiFrames"));
        const imagePayload =
            config.interfaceType === "xai-video" ? (referenceMode && images.length ? { reference_images: images.map((url) => ({ url })) } : images.length ? { image: { url: images[0] } } : {}) : images.length ? { image: images[0], images } : {};
        const payload = {
            model: modelName,
            prompt,
            duration: Number.parseInt(seconds, 10) || 6,
            seconds,
            ...(normalizeVideoSize(config.size) ? { size: normalizeVideoSize(config.size) } : {}),
            ...imagePayload,
        };
        try {
            const createPath = config.interfaceType === "xai-video" ? "/videos/generations" : "/videos";
            const created = deps.response.unwrapVideoResponse(await deps.transport.post<ApiVideoResponse>(deps.transport.apiUrl(createPath), payload, options));
            const id = deps.response.videoTaskId(created);
            if (!id) throw new Error(t("creationRuntime.providerTaskIdMissing", { provider: "Video" }));
            return { id, provider: "openai", model };
        } catch (error) {
            throw new Error(deps.response.readAxiosError(error, t("creationRuntime.providerCreateFailed", { provider: "Video" })));
        }
    }
    const body = new FormData();
    body.append("model", modelName);
    body.append("prompt", prompt);
    body.append("seconds", normalizeVideoSeconds(config.videoSeconds));
    if (normalizeVideoSize(config.size)) body.append("size", normalizeVideoSize(config.size)!);
    const resolution = videoResolutionRequest(modelCapabilityConfigFor(config, model).video!, config.vquality);
    if (resolution) body.append("resolution_name", resolution);
    body.append("preset", "normal");
    if (config.interfaceType === "newapi") {
        const profile = modelCapabilityConfigFor(config, model).video!;
        const operation = options?.videoEditOperation || (references.length ? "image_to_video" : profile.defaultOperation);
        if (!profile.operations.includes(operation)) throw new Error(t("modelValidation.current", { label: t("modelValidation.mode") }));
        const capacity = operation === "reference_to_video" ? profile.references.maxImages : operation === "image_to_video" ? Math.min(1, profile.references.maxImages) : 0;
        if (references.length > capacity) throw new Error(t("modelValidation.maxImages", { count: capacity }));
    }
    const inputs = config.interfaceType === "newapi" ? references : references.slice(0, 7);
    const files = await Promise.all(inputs.map(async (image) => dataUrlToFile({ ...image, dataUrl: await imageToDataUrl(image) })));
    const field = config.interfaceType === "newapi" && files.length === 1 ? "input_reference" : "input_reference[]";
    files.forEach((file) => body.append(field, file));
    try {
        const created = deps.response.unwrapVideoResponse(await deps.transport.postForm<ApiVideoResponse>(deps.transport.apiUrl("/videos"), body, options));
        if (!created.id) throw new Error(t("creationRuntime.providerTaskIdMissing", { provider: "Video" }));
        return { id: created.id, provider: "openai", model };
    } catch (error) {
        throw new Error(deps.response.readAxiosError(error, t("creationRuntime.providerCreateFailed", { provider: "Video" })));
    }
}
