import { currentLocaleText as t } from "@/i18n/current-locale-text";
import { imageToDataUrl } from "@/services/image-storage";
import { modelOptionName } from "@/stores/use-config-store";
import { isPublicMediaUrl } from "./video-validation";
import { normalizeSeedanceDuration } from "@/lib/seedance-video";
import type { ReferenceImage } from "@/types/image";
import type { ReferenceAudio, ReferenceVideo } from "@/types/media";

import type { RequestOptions, ResolvedAiConfig, VideoGenerationTask } from "./video-contracts";
import type { VideoProviderDeps } from "./video-provider-deps";

export async function createNovitaVideoTask(deps: VideoProviderDeps, config: ResolvedAiConfig, model: string, prompt: string, references: ReferenceImage[], videoReferences: ReferenceVideo[], audioReferences: ReferenceAudio[], options?: RequestOptions): Promise<VideoGenerationTask> {
    if (references.length > 1 || videoReferences.length || audioReferences.length) throw new Error(t("creationRuntime.providerStartImageOnly", { provider: "Novita" }));
    if (references.length && options?.videoEditOperation === "reference_to_video") throw new Error(t("creationRuntime.providerReferenceModeUnsupported", { provider: "Novita" }));
    const payload: Record<string, unknown> = {
        model: modelOptionName(model),
        prompt: prompt.trim(),
        duration: normalizeNovitaVideoDuration(config.videoSeconds),
    };
    if (references[0]) {
        payload.image = isPublicMediaUrl(references[0].url || "") ? references[0].url : await imageToDataUrl(references[0]);
    } else {
        payload.aspect_ratio = normalizeNovitaVideoRatio(config.size);
    }
    try {
        const created = await deps.transport.post<{ task_id?: string }>(novitaVideoUrl(config, "/video/create"), payload, options);
        if (!created.task_id) throw new Error(t("creationRuntime.providerTaskIdMissing", { provider: "Novita" }));
        return { id: created.task_id, provider: "novita", model };
    } catch (error) {
        throw new Error(deps.response.readAxiosError(error, t("creationRuntime.providerCreateFailed", { provider: "Novita" })));
    }
}

function novitaVideoUrl(config: ResolvedAiConfig, path: string) {
    return `${config.baseUrl.replace(/\/+$/, "")}${path}`;
}

function normalizeNovitaVideoDuration(value: string) {
    return normalizeSeedanceDuration(value) >= 8 ? "10" : "5";
}

function normalizeNovitaVideoRatio(value: string) {
    return value === "16:9" || value === "9:16" || value === "1:1" ? value : "16:9";
}
