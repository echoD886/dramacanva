import { canonicalize } from "json-canonicalize";
import { buildGenerationConfig, resolveCanvasGenerationModel } from "./canvas-project-generation";
import { storyboardRowReferenceNodeIds } from "./canvas-storyboard-materializer";
import { canonicalGenerationMetadata, synchronizeGenerationSpec } from "./generation-contract";
import { storyboardVideoSettings, storyboardVideoRequirements } from "./canvas-storyboard-video";
import { buildOrderedCanvasResourceReferences } from "./canvas-resource-references";
import { modelCompatibilityError, modelRequestOptions, type ModelRequirements } from "@/lib/model-selection";
import { selectableModelsByCapability, type AiConfig } from "@/stores/use-config-store";
import type { CanvasConnection, CanvasNodeData } from "@/types/canvas";

export type StoryboardVideoSelectionInput = { rowId: string; references: CanvasNodeData[]; seconds: number; existing?: CanvasNodeData };

// Every model must preserve the visible row duration, aspect and reference inputs.
export function storyboardVideoModelChoices(config: AiConfig, script: CanvasNodeData, inputs: StoryboardVideoSelectionInput[], projectRatio?: string) {
    return selectableModelsByCapability(config, "video").flatMap((model) => {
        try {
            const rows = inputs.map((input) => {
                const existing = input.existing && synchronizeGenerationSpec(input.existing, { model });
                const selectedConfig = { ...config, model, videoModel: model };
                const settings = storyboardVideoSettings(selectedConfig, script, input.references, input.seconds, existing, projectRatio, model);
                if (settings.model !== model) throw new Error("模型不兼容");
                const draft = synchronizeGenerationSpec(existing || { id: "preview", type: "video", title: "", position: { x: 0, y: 0 }, width: 1, height: 1 }, settings);
                const requirements = storyboardVideoRequirements(input.references);
                return { rowId: input.rowId, settings, config: buildGenerationConfig(selectedConfig, draft, "video", requirements), requirements };
            });
            return [{ model, rows }];
        } catch {
            return [];
        }
    });
}

// Only public submission parameters travel with the batch, never channel credentials.
export type ConfirmedStoryboardVideoSettings = Pick<AiConfig, "model" | "size" | "videoSeconds" | "vquality" | "videoGenerateAudio" | "videoWatermark" | "modelParameters" | "videoArkPrivateAssetUpload" | "count">;

export function confirmedStoryboardVideoSettings(config: AiConfig): ConfirmedStoryboardVideoSettings {
    const { model, size, videoSeconds, vquality, videoGenerateAudio, videoWatermark, modelParameters, videoArkPrivateAssetUpload, count } = config;
    return structuredClone({ model, size, videoSeconds, vquality, videoGenerateAudio, videoWatermark, modelParameters, videoArkPrivateAssetUpload, count });
}

export function buildConfirmedStoryboardVideoConfig(config: AiConfig, node: CanvasNodeData | undefined, confirmed: ConfirmedStoryboardVideoSettings, requirements?: ModelRequirements): AiConfig {
    const error = "已确认的视频模型或参数已变化、不可用或不兼容，请重新确认视频批次";
    try {
        const resolved = buildGenerationConfig(config, node, "video", requirements);
        const locked = { ...resolved, ...confirmed };
        if (
            resolveCanvasGenerationModel(config, confirmed.model, "video") !== confirmed.model ||
            resolved.model !== confirmed.model ||
            canonicalize(confirmedStoryboardVideoSettings(resolved)) !== canonicalize(confirmed) ||
            modelCompatibilityError(locked, confirmed.model, { ...requirements, capability: "video", options: modelRequestOptions(locked, "video") })
        )
            throw new Error(error);
        return locked;
    } catch {
        throw new Error(error);
    }
}

export function storyboardVideoBatchSnapshot(scriptId: string, rowIds: string[], nodes: CanvasNodeData[], connections: CanvasConnection[], includeFirstFrame: boolean, projectRatio?: string) {
    const script = nodes.find((node) => node.id === scriptId);
    if (!script) return canonicalize(null);
    return canonicalize({
        scriptType: script.type,
        size: script.metadata?.size,
        projectRatio,
        rows: rowIds.map((id) => {
            const row = script.metadata?.storyboard?.rows.find((item) => item.id === id);
            if (!row) return null;
            const target = nodes.find((node) => node.id === row.videoNodeId);
            const targetMetadata = target && canonicalGenerationMetadata(target, "video");
            const referenceIds = storyboardRowReferenceNodeIds(script, row, nodes, connections, includeFirstFrame, target?.id);
            const references = referenceIds.flatMap((refId) => nodes.find((node) => node.id === refId) || []);
            return {
                input: {
                    id: row.id,
                    shotNumber: row.shotNumber,
                    durationSeconds: row.durationSeconds,
                    videoMotionPrompt: row.videoMotionPrompt,
                    plotDescription: row.plotDescription,
                    videoPromptTemplateVariables: row.videoPromptTemplateVariables,
                    characters: row.characters,
                    assetBindings: row.assetBindings,
                    imageNodeId: row.imageNodeId,
                    videoNodeId: row.videoNodeId,
                },
                referenceIds,
                resources: buildOrderedCanvasResourceReferences(references),
                referenceInputs: references.map((node) => ({
                    id: node.id,
                    type: node.type,
                    content: node.metadata?.content,
                    storageKey: node.metadata?.storageKey,
                    characterAssetId: node.metadata?.characterAssetId,
                    characterVersionPolicy: node.metadata?.characterVersionPolicy,
                    characterVersionId: node.metadata?.characterVersionId,
                    videoPreview: node.metadata?.videoPreview,
                })),
                target: target && {
                    id: target.id,
                    type: target.type,
                    settings: {
                        model: targetMetadata?.model,
                        size: targetMetadata?.size,
                        seconds: targetMetadata?.seconds,
                        vquality: targetMetadata?.vquality,
                        generateAudio: targetMetadata?.generateAudio,
                        watermark: targetMetadata?.watermark,
                        arkPrivateAssetUpload: targetMetadata?.arkPrivateAssetUpload,
                        count: targetMetadata?.count,
                        modelParameters: targetMetadata?.modelParameters,
                        cameraControl: targetMetadata?.cameraControl,
                    },
                    content: target.metadata?.content,
                    storageKey: target.metadata?.storageKey,
                    status: target.metadata?.status,
                    taskId: target.metadata?.taskId,
                    composerContent: target.metadata?.composerContent,
                    composerAttachments: target.metadata?.composerAttachments,
                },
            };
        }),
    });
}

export function storyboardVideoTotalMessageKey(charges: { external: boolean }[]) {
    return charges.every((charge) => charge.external) ? "canvasExtra.storyboard.confirmExternal" : "canvasExtra.storyboard.confirmPriced";
}
