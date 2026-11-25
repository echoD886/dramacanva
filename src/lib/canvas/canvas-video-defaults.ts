import { canonicalGenerationMetadata } from "./generation-contract";
import { normalizeSeedanceRatio } from "@/lib/seedance-video";
import { modelCompatibilityError, modelRequestOptions, resolveModelGenerationDefaults, type ModelRequirements } from "@/lib/model-selection";
import { requestCreditCost } from "@/lib/model-pricing";
import { modelOptionName, resolveModelChannel, selectableModelsByCapability, starterModelForCapability, type AiConfig } from "@/stores/use-config-store";
import type { CanvasNodeData } from "@/types/canvas";

export function upstreamVideoRatio(source: CanvasNodeData, fallback: string) {
    const size = canonicalGenerationMetadata(source, source.type === "video" ? "video" : "image").size || source.metadata?.size;
    if (size && size !== "auto" && size !== "adaptive") {
        if (/vertical|portrait|竖屏/i.test(size)) return "9:16";
        if (/horizontal|landscape|横屏/i.test(size)) return "16:9";
        return size.includes("x") ? normalizeSeedanceRatio(size) : size;
    }
    const width = source.metadata?.naturalWidth;
    const height = source.metadata?.naturalHeight;
    return width && height ? normalizeSeedanceRatio(`${width}x${height}`) : fallback;
}

/** Compare the actual configured request price, including duration and channel tiers. */
export function economicalVideoSettings(config: AiConfig, size: string, requirements: ModelRequirements, seconds?: number) {
    const preferred = config.videoModel || config.model;
    const starter = starterModelForCapability(config, "video");
    const candidates = selectableModelsByCapability(config, "video").flatMap((model) => {
        const defaults = resolveModelGenerationDefaults(config, model, "video", { size, ...(seconds ? { videoSeconds: String(seconds) } : {}) });
        const selected = { ...config, ...defaults, model, size, videoSeconds: seconds ? String(seconds) : defaults.videoSeconds || config.videoSeconds };
        const request = { ...requirements, options: modelRequestOptions(selected, "video") };
        if (modelCompatibilityError(config, model, request)) return [];
        const channel = resolveModelChannel(config, model);
        const price = requestCreditCost({ channelMode: "remote", modelCosts: channel.modelCosts, model: modelOptionName(model), seconds: selected.videoSeconds, capability: "video", config: selected, requirements: request });
        return [{ model, selected, price }];
    });
    candidates.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity) || Number(b.model === preferred) - Number(a.model === preferred));
    const candidate = (preferred === starter && candidates.find((item) => item.model === starter)) || candidates[0];
    if (!candidate) throw new Error("没有支持上游画幅、时长和参考素材的视频模型");
    const selected = candidate.selected;
    return { model: candidate.model, size, seconds: selected.videoSeconds, vquality: selected.vquality, generateAudio: selected.videoGenerateAudio, watermark: selected.videoWatermark };
}
