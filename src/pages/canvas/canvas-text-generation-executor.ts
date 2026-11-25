import { nanoid } from "nanoid";
import { currentLocaleText } from "@/i18n/current-locale-text";

import { NODE_DEFAULT_SIZE } from "@/constant/canvas";
import { appendNodesWithoutOverlap } from "@/lib/canvas/canvas-generation-layout";
import { getGenerationCount, isGenerationCanceled, runCanvasGenerationTaskToConsumer } from "@/lib/canvas/canvas-project-generation";
import { canvasGenerationPromptMetadata } from "@/lib/canvas/canvas-generation-submission";
import { generationFailureMetadata } from "@/lib/generation-error";
import { CanvasNodeType, type CanvasNodeData } from "@/types/canvas";

import type { CanvasGenerationExecution } from "./canvas-generation-executor-types";

const NODE_STATUS_LOADING = "loading" as const;
const NODE_STATUS_SUCCESS = "success" as const;
const NODE_STATUS_ERROR = "error" as const;

export async function executeTextGeneration({
    nodeId,
    sourceNode,
    prompt,
    effectivePrompt,
    displayPrompt = effectivePrompt,
    generationConfig,
    generationContext,
    controller,
    editingTextNode,
    projectId,
    setNodes,
    setConnections,
    startGenerationRequest,
    finishGenerationRequest,
    bindGenerationTask,
    applyGenerationTaskResult,
    registerPendingNodeIds,
    taskContext,
    skillMetadata,
    retryContext,
    showError,
}: CanvasGenerationExecution) {
    const isConfigNode = sourceNode?.type === CanvasNodeType.Config;
    const isDirectTextTarget = sourceNode?.type === CanvasNodeType.Text && !sourceNode.metadata?.content?.trim() && !editingTextNode;
    // 独立文本份数（textCount），默认 1，不再复用餐图片数量 count（对齐上游 v0.16 语义）
    const textCount = getGenerationCount(String(sourceNode?.metadata?.textCount ?? 1));
    const parentConfig = NODE_DEFAULT_SIZE[isConfigNode ? CanvasNodeType.Config : CanvasNodeType.Text];
    const textConfig = NODE_DEFAULT_SIZE[CanvasNodeType.Text];
    const parentPosition = sourceNode?.position || { x: 0, y: 0 };
    const generateInPlace = !isConfigNode && !editingTextNode;
    if (generateInPlace) {
        setNodes((current) =>
            current.map((node) =>
                node.id === nodeId ? { ...node, metadata: { ...node.metadata, model: generationConfig.model, textThinking: generationConfig.textThinking, textStream: generationConfig.textStream, systemPrompt: generationConfig.systemPrompt } } : node,
            ),
        );
    }
    const childIds = Array.from({ length: generateInPlace ? Math.max(0, textCount - 1) : textCount }, () => nanoid());
    registerPendingNodeIds(childIds);
    if (childIds.length) {
        const childNodes: CanvasNodeData[] = childIds.map((id, index) => ({
            id,
            type: CanvasNodeType.Text,
            title: displayPrompt.slice(0, 32) || currentLocaleText("canvasExtra.autoTitle.generatedText"),
            position: {
                x: parentPosition.x + parentConfig.width + 96,
                y: parentPosition.y + parentConfig.height / 2 - textConfig.height / 2 + (index - (childIds.length - 1) / 2) * (textConfig.height + 36),
            },
            width: textConfig.width,
            height: textConfig.height,
            metadata: {
                ...canvasGenerationPromptMetadata(prompt, displayPrompt),
                composerAttachments: sourceNode?.metadata?.composerAttachments,
                model: generationConfig.model,
                textThinking: generationConfig.textThinking,
                textStream: generationConfig.textStream,
                systemPrompt: generationConfig.systemPrompt,
                status: NODE_STATUS_LOADING,
                fontSize: 14,
                ...skillMetadata,
            },
        }));
        setNodes((current) =>
            appendNodesWithoutOverlap(
                current.map((node) => (node.id === nodeId && isConfigNode ? { ...node, metadata: { ...node.metadata, ...canvasGenerationPromptMetadata(prompt, displayPrompt), status: NODE_STATUS_LOADING, errorDetails: undefined } } : node)),
                childNodes,
            ),
        );
        setConnections((current) => [...current, ...childIds.map((childId) => ({ id: nanoid(), fromNodeId: nodeId, toNodeId: childId }))]);
    }

    const textTargetIds = generateInPlace ? [nodeId, ...childIds] : childIds;
    textTargetIds.forEach((targetNodeId) => startGenerationRequest(targetNodeId, nodeId, nodeId, controller));
    const textSourceMetadata = sourceNode?.metadata as Record<string, unknown> | undefined;
    const roleReferences = Array.from(new Set([
        ...(Array.isArray(textSourceMetadata?.roleReferences) ? (textSourceMetadata.roleReferences as unknown[]) : []),
        ...(generationContext.characterReferences ?? []).map((ref) => ref.assetId),
    ])).filter((id): id is string => typeof id === "string" && id.length > 0);
    const outputCategory = (typeof textSourceMetadata?.outputCategory === "string" ? textSourceMetadata.outputCategory : undefined) || (sourceNode?.metadata?.workflowKind === "character" ? "character" : undefined);
    const sourceCode = (taskContext as { sourceCode?: import("@/types/asset-archive").AssetSourceCode })?.sourceCode || (taskContext?.conversationId ? "cloud-agent" : "canvas-generation");
    // 多份文本互相独立：一份失败不能把已成功或仍在生成的兄弟节点一并标为失败。
    const results = await Promise.allSettled(
        textTargetIds.map((targetNodeId) =>
            runCanvasGenerationTaskToConsumer(
                {
                    projectId,
                    nodeId: targetNodeId,
                    ...retryContext,
                    mode: "text",
                    prompt: effectivePrompt,
                    config: generationConfig,
                    referenceImages: generationContext.referenceImages,
                    referenceVideos: generationContext.referenceVideos,
                    signal: controller.signal,
                    metadata: {
                        sourceNodeId: nodeId,
                        canvasId: projectId,
                        sourceCode,
                        ...(roleReferences.length ? { roleReferences } : {}),
                        ...(outputCategory ? { outputCategory } : {}),
                        ...(sourceNode?.metadata?.assetCategory ? { assetCategory: sourceNode.metadata.assetCategory } : {}),
                        ...(sourceNode?.metadata?.workflowKind ? { workflowKind: sourceNode.metadata.workflowKind } : {}),
                        ...taskContext,
                        resolvedCharacterVersions: generationContext.resolvedCharacterVersions,
                        ...skillMetadata,
                    },
                },
                {
                    bindTask: (task) => bindGenerationTask(targetNodeId, task),
                    consumeTask: (task) => applyGenerationTaskResult(targetNodeId, task),
                },
            )
                .then(() => ({ nodeId: targetNodeId }))
                .finally(() => finishGenerationRequest(targetNodeId, controller)),
        ),
    );
    if (controller.signal.aborted) return;
    const failures = results.flatMap((result, index) => (result.status === "rejected" && !isGenerationCanceled(result.reason) ? [{ targetNodeId: textTargetIds[index], error: result.reason as unknown }] : []));
    // 全部失败时沿用执行器的统一失败处理（含并发名额等待）。
    if (failures.length && failures.length === textTargetIds.length) throw failures[0].error;
    if (failures.length) {
        const failureByNodeId = new Map(failures.map(({ targetNodeId, error }) => [targetNodeId, generationFailureMetadata(error, prompt)]));
        setNodes((current) =>
            current.map((node) => {
                const failure = failureByNodeId.get(node.id);
                return failure ? { ...node, metadata: { ...node.metadata, status: NODE_STATUS_ERROR, ...failure } } : node;
            }),
        );
        showError(failureByNodeId.get(failures[0].targetNodeId)!.errorDetails);
    }
    if (isConfigNode) {
        setNodes((current) =>
            current.map((node) =>
                node.id === nodeId ? { ...node, metadata: { ...node.metadata, status: NODE_STATUS_SUCCESS, errorDetails: undefined, generationErrorCode: undefined, resourceReloadAvailable: undefined, failedPromptFingerprint: undefined } } : node,
            ),
        );
    }
}
