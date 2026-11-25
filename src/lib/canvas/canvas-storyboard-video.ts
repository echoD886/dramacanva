import { buildGenerationConfig, resolveCanvasGenerationModel } from "@/lib/canvas/canvas-project-generation";
import { buildOrderedCanvasResourceReferences } from "@/lib/canvas/canvas-resource-references";
import { canonicalGenerationMetadata, readNodeGenerationSpec, resolveGenerationSelection, synchronizeGenerationSpec } from "@/lib/canvas/generation-contract";
import { modelCompatibilityError, modelRequestOptions, resolveCompatibleModelInSameGroup, resolveModelGenerationDefaults, type ModelRequirements } from "@/lib/model-selection";
import { type AiConfig } from "@/stores/use-config-store";
import { CanvasNodeType, type CanvasNodeData, type CanvasConnection } from "@/types/canvas";
import { modelCapabilityConfigFor } from "@/lib/model-capabilities";
import { directorPrevisReference } from "@/lib/canvas/director/director-previs-cache";
import { selectDirectorReferenceItems } from "@/lib/canvas/director/director-reference-plan";
import { economicalVideoSettings, upstreamVideoRatio } from "./canvas-video-defaults";

export function storyboardDirectorReferences(config: AiConfig, references: CanvasNodeData[], existing?: CanvasNodeData, allNodes: CanvasNodeData[] = references) {
    references = references.map(directorPrevisReference).filter((node) => !node.metadata?.directorSceneId || node.metadata.directorOutputKind === "clay");
    const spec = existing && readNodeGenerationSpec(existing);
    const selected = spec?.modelSelection ? resolveGenerationSelection(config, spec.modelSelection) : existing && canonicalGenerationMetadata(existing, "video").model;
    const preferred = resolveCanvasGenerationModel(config, selected || config.videoModel || config.model, "video");
    const limits = preferred ? modelCapabilityConfigFor(config, preferred).video?.references : undefined;
    if (limits) {
        const images = references.filter((node) => node.type === CanvasNodeType.Image);
        const selected = new Set(selectDirectorReferenceItems(images, limits.maxImages, allNodes).map((node) => node.id));
        references = references.filter((node) => node.type !== CanvasNodeType.Image || selected.has(node.id));
    }
    if (limits?.maxVideos) {
        const videos = references.filter((node) => node.type === CanvasNodeType.Video);
        const selected = new Set(selectDirectorReferenceItems(videos, limits.maxVideos, allNodes).map((node) => node.id));
        return references.filter((node) => node.type !== CanvasNodeType.Video || selected.has(node.id));
    }
    // Only director clay is optional. Other unsupported references still fail normal compatibility checks.
    const clayIds = new Set(allNodes.map((node) => node.metadata?.directorClayVideoNodeId).filter(Boolean));
    return references.filter((node) => node.metadata?.directorOutputKind !== "clay" && !clayIds.has(node.id));
}

export function storyboardVideoRatio(script: CanvasNodeData, references: CanvasNodeData[], fallback: string) {
    const context = [script, ...references]
        .filter((node) => node.type === CanvasNodeType.Text || node.type === CanvasNodeType.Script || node.metadata?.workflowKind === "styleboard")
        .map((node) => `${node.metadata?.content || ""} ${node.metadata?.prompt || ""} ${node.metadata?.composerContent || ""}`)
        .join("\n");
    const contextRatio = /16\s*[:：]\s*9|横屏|landscape/i.test(context) ? "16:9" : /9\s*[:：]\s*16|竖屏|portrait/i.test(context) ? "9:16" : undefined;
    const ratio = upstreamVideoRatio(script, contextRatio || fallback);
    return /vertical|portrait|竖屏/i.test(ratio) ? "9:16" : /horizontal|landscape|横屏/i.test(ratio) ? "16:9" : ratio;
}

export function storyboardVideoScript(script: CanvasNodeData, nodes: CanvasNodeData[], connections: CanvasConnection[], fallback: string) {
    const ids = new Set([...(script.metadata?.storyboard?.referenceNodeIds || []), ...connections.filter((connection) => connection.toNodeId === script.id).map((connection) => connection.fromNodeId)]);
    const size = storyboardVideoRatio(
        script,
        nodes.filter((node) => ids.has(node.id)),
        fallback,
    );
    return { ...script, metadata: { ...script.metadata, size } };
}

export function storyboardVideoSettings(config: AiConfig, script: CanvasNodeData, references: CanvasNodeData[], seconds: number, existing?: CanvasNodeData, projectRatio?: string, explicitModel?: string) {
    const ratio = (existing && canonicalGenerationMetadata(existing, "video").size) || storyboardVideoRatio(script, references, projectRatio || config.size);
    const size = /vertical|portrait|竖屏/i.test(ratio) ? "9:16" : /horizontal|landscape|横屏/i.test(ratio) ? "16:9" : ratio;
    references = storyboardDirectorReferences(config, references, existing);
    const requirements = storyboardVideoRequirements(references);
    const metadata = existing ? canonicalGenerationMetadata(existing, "video") : undefined;
    const spec = existing && readNodeGenerationSpec(existing);
    const selected = explicitModel || (spec?.modelSelection ? resolveGenerationSelection(config, spec.modelSelection) : metadata?.model);
    if (spec?.modelSelection && !selected) throw new Error("所选视频模型已不可用，请重新选择");
    const preferred = selected ? resolveCanvasGenerationModel(config, selected, "video") || selected : economicalVideoSettings(config, size, requirements, seconds).model;
    // The row's visible duration is the submitted duration.
    const defaults = resolveModelGenerationDefaults(config, preferred, "video", { size, videoSeconds: String(seconds), vquality: metadata?.vquality, videoGenerateAudio: metadata?.generateAudio, videoWatermark: metadata?.watermark });
    const options = { size, videoSeconds: seconds, vquality: defaults.vquality, videoGenerateAudio: defaults.videoGenerateAudio, videoWatermark: defaults.videoWatermark };
    const model = resolveCompatibleModelInSameGroup(config, preferred, { ...requirements, options });
    if (!model) throw new Error(`没有同组兼容视频模型：${modelCompatibilityError(config, preferred, { ...requirements, options })}`);
    const patch = { model, size, seconds: String(seconds), vquality: defaults.vquality, generateAudio: defaults.videoGenerateAudio, watermark: defaults.videoWatermark };
    const draft = synchronizeGenerationSpec(existing || { id: "storyboard-video", type: CanvasNodeType.Video, title: "", position: { x: 0, y: 0 }, width: 1, height: 1 }, patch);
    const resolved = buildGenerationConfig(config, draft, "video", requirements);
    const actualRequirements = { ...requirements, options: { ...modelRequestOptions(resolved, "video"), size, videoSeconds: seconds } };
    const error = modelCompatibilityError(config, resolved.model, actualRequirements);
    if (error) throw new Error(`没有同组兼容视频模型：${error}`);
    if (resolved.model !== model || resolved.size !== size || resolved.videoSeconds !== String(seconds)) throw new Error("视频设置发生变化，请重新选择模型或视频参数");
    return patch;
}

export function storyboardVideoRequirements(references: CanvasNodeData[]): ModelRequirements {
    const inputs = buildOrderedCanvasResourceReferences(references);
    return {
        capability: "video",
        input: {
            textCount: 1,
            imageCount: inputs.filter((item) => item.kind === "image").length,
            characterCount: inputs.filter((item) => item.kind === "character").length,
            videoCount: inputs.filter((item) => item.kind === "video").length,
            audioCount: inputs.filter((item) => item.kind === "audio").length,
        },
    };
}
