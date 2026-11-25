import { canonicalGenerationMetadata, readNodeGenerationSpec, resolveGenerationSelection } from "./generation-contract";
import { modelCapabilityConfigFor } from "@/lib/model-capabilities";
import { resolveModelGenerationDefaults } from "@/lib/model-selection";
import { modelOptionName, PUBLIC_MODEL_CATALOG_ID, resolveModelChannel, selectableModelsByCapability, type AiConfig } from "@/stores/use-config-store";
import type { CanvasNodeData } from "@/types/canvas";

export function nodeModelRemoved(config: AiConfig, node: CanvasNodeData) {
    if (!config.channels.some((channel) => channel.scope === "system" && channel.enabled !== false)) return false;
    const selection = readNodeGenerationSpec(node)?.modelSelection;
    if (selection?.kind === "logical") return !resolveGenerationSelection(config, selection);
    if (selection?.kind === "channel" && selection.channelId === PUBLIC_MODEL_CATALOG_ID) return !resolveGenerationSelection(config, selection);
    const stored = node.metadata?.model || "";
    return /^kling-o1(?:-|$)/i.test(stored) && !selectableModelsByCapability(config, "video").some((value) => modelOptionName(value) === stored);
}

export function kling4Replacement(config: AiConfig, node: CanvasNodeData) {
    const model = selectableModelsByCapability(config, "video").find((value) => {
        const channel = resolveModelChannel(config, value);
        const cost = channel.modelCosts?.find((item) => item.model === modelOptionName(value));
        return channel.scope === "system" && cost?.logicalAvailable !== false && (modelOptionName(value) === "kling-4" || cost?.displayName === "Kling 4");
    });
    if (!model) return undefined;
    const old = canonicalGenerationMetadata(node, "video");
    const profile = modelCapabilityConfigFor(config, model).video!;
    const requestedResolution = Number(String(old.vquality || "").replace(/p$/i, ""));
    const nearest = [...profile.resolutions].sort((left, right) => Math.abs(Number(left.replace(/p$/i, "")) - requestedResolution) - Math.abs(Number(right.replace(/p$/i, "")) - requestedResolution))[0];
    const defaults = resolveModelGenerationDefaults(config, model, "video", {
        videoSeconds: old.seconds, size: old.size,
        vquality: requestedResolution > 0 ? nearest : undefined,
    });
    return { model, seconds: defaults.videoSeconds, size: defaults.size, vquality: defaults.vquality,
        generateAudio: defaults.videoGenerateAudio, watermark: defaults.videoWatermark, modelParameters: "" };
}
