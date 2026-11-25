import { generationSpecMetadata, readNodeGenerationSpec, specFromConfig } from "@/lib/canvas/generation-contract";
import { nanoid } from "nanoid";
import { currentLocaleText } from "@/i18n/current-locale-text";

import { NODE_DEFAULT_SIZE } from "@/constant/canvas";
import { appendNodesWithoutOverlap, canGenerateMediaInPlace } from "@/lib/canvas/canvas-generation-layout";
import { nodeSizeFromRatio } from "@/lib/canvas/canvas-node-size";
import { nextCanvasVersionLabel } from "@/lib/canvas/canvas-layout";
import { buildAudioGenerationMetadata, buildVideoGenerationMetadata, generationReferenceUrls, runCanvasGenerationTaskToConsumer } from "@/lib/canvas/canvas-project-generation";
import { imageGenerationReferenceConnections } from "@/lib/canvas/canvas-resource-references";
import { buildMediaGenerationNodeTitle, manualNodeTitle } from "@/lib/canvas/canvas-generation-title";
import { canvasGenerationPromptMetadata } from "@/lib/canvas/canvas-generation-submission";
import { CanvasNodeType, type CanvasNodeData } from "@/types/canvas";

import type { CanvasGenerationExecution } from "./canvas-generation-executor-types";

const NODE_STATUS_LOADING = "loading" as const;
const NODE_STATUS_SUCCESS = "success" as const;

export async function executeVideoGeneration(
    {
        nodeId,
        sourceNode,
        prompt,
        effectivePrompt,
        displayPrompt = effectivePrompt,
        generationConfig,
        generationContext,
        controller,
        projectId,
        canvasConnections,
        setNodes,
        setConnections,
        startGenerationRequest,
        finishGenerationRequest,
        bindGenerationTask,
        applyGenerationTaskResult,
        registerPendingNodeIds,
        styleMetadata,
        skillMetadata,
        taskContext,
        retryContext,
    }: CanvasGenerationExecution,
    runVideoTask = runCanvasGenerationTaskToConsumer,
) {
    if (sourceNode?.metadata?.videoRemake && (!generationContext.referenceImages.length || !generationContext.referenceVideos.length)) {
        throw new Error(currentLocaleText("canvasNov21.remake.inputs"));
    }
    const spec = nodeSizeFromRatio(generationConfig.size, NODE_DEFAULT_SIZE[CanvasNodeType.Video].width, NODE_DEFAULT_SIZE[CanvasNodeType.Video].height) || NODE_DEFAULT_SIZE[CanvasNodeType.Video];
    const hasDirectorResult = Boolean(sourceNode?.metadata?.directorDownstream && (sourceNode.metadata.content || sourceNode.metadata.storageKey));
    const reuseSourceNode = !hasDirectorResult && canGenerateMediaInPlace(sourceNode, CanvasNodeType.Video);
    const isExistingVideoNode = sourceNode?.type === CanvasNodeType.Video && Boolean(sourceNode.metadata?.content || hasDirectorResult) && !reuseSourceNode;
    const videoId = reuseSourceNode ? nodeId : nanoid();
    const versionRootId = isExistingVideoNode && sourceNode ? sourceNode.metadata?.versionOfNodeId || sourceNode.id : undefined;
    const parent = sourceNode?.position || { x: 0, y: 0 };
    const videoGenerationMetadata = buildVideoGenerationMetadata(sourceNode, generationContext, generationConfig);
    const videoNode: CanvasNodeData = {
        id: videoId,
        type: CanvasNodeType.Video,
        title: (reuseSourceNode ? manualNodeTitle(sourceNode) : undefined) ?? buildMediaGenerationNodeTitle(prompt, "video", sourceNode),
        position: reuseSourceNode ? sourceNode!.position : { x: parent.x + (sourceNode?.width || spec.width) + 96, y: parent.y },
        width: reuseSourceNode ? sourceNode!.width : spec.width,
        height: reuseSourceNode ? sourceNode!.height : spec.height,
        metadata: {
            ...(reuseSourceNode ? sourceNode?.metadata || {} : {}),
            ...canvasGenerationPromptMetadata(prompt, displayPrompt),
            status: NODE_STATUS_LOADING,
            errorDetails: undefined,
            generationErrorCode: undefined,
            resourceReloadAvailable: undefined,
            failedPromptFingerprint: undefined,
            model: generationConfig.model,
            size: generationConfig.size,
            seconds: generationConfig.videoSeconds,
            vquality: generationConfig.vquality,
            generateAudio: generationConfig.videoGenerateAudio,
            watermark: generationConfig.videoWatermark,
            references: generationReferenceUrls(generationContext),
            ...videoGenerationMetadata,
            directorDownstream: sourceNode?.metadata?.directorDownstream,
            composerAttachments: sourceNode?.metadata?.composerAttachments,
            ...generationSpecMetadata(specFromConfig("video", prompt, generationConfig, sourceNode ? readNodeGenerationSpec(sourceNode)?.referenceBindings : [])),
            ...styleMetadata,
            ...skillMetadata,
        },
    };
    registerPendingNodeIds([videoId]);
    // 待生成版本先加入版本族，但只有成功结果才能替换当前主版本。
    setNodes((current) => {
        if (reuseSourceNode) return current.map((node) => (node.id === nodeId ? { ...node, ...videoNode } : node));
        if (!isExistingVideoNode || !sourceNode)
            return appendNodesWithoutOverlap(
                current.map((node) => (node.id === nodeId ? { ...node, metadata: { ...node.metadata, status: NODE_STATUS_SUCCESS } } : node)),
                [videoNode],
            );
        const rootId = versionRootId!;
        const nextLabel = nextCanvasVersionLabel(rootId, current);
        const hasPrimaryVersion = current.some((node) => (node.metadata?.versionOfNodeId || node.id) === rootId && node.metadata?.versionPrimary);
        return appendNodesWithoutOverlap(
            current.map((node) => {
                if ((node.metadata?.versionOfNodeId || node.id) !== rootId) return node;
                return {
                    ...node,
                    metadata: {
                        ...node.metadata,
                        versionOfNodeId: rootId,
                        versionLabel: node.metadata?.versionLabel || "A",
                        versionPrimary: node.metadata?.versionPrimary || (!hasPrimaryVersion && node.id === sourceNode.id),
                        status: node.id === nodeId ? NODE_STATUS_SUCCESS : node.metadata?.status,
                    },
                };
            }),
            [{ ...videoNode, metadata: { ...videoNode.metadata, versionOfNodeId: rootId, versionLabel: nextLabel, versionPrimary: false } }],
        );
    });
    // 重新生成已有视频时，新节点继承源视频的上游连接，与源视频保持并行关系，而不是作为其下游子节点。
    if (!reuseSourceNode) {
        setConnections((current) => {
            if (!isExistingVideoNode) return [...current, { id: nanoid(), fromNodeId: nodeId, toNodeId: videoId }];
            return [...current, ...canvasConnections.filter((connection) => connection.toNodeId === nodeId).map((connection) => ({ ...connection, id: nanoid(), toNodeId: videoId }))];
        });
    }

    startGenerationRequest(videoId, nodeId, nodeId, controller);
    const sourceMetadata = sourceNode?.metadata as Record<string, unknown> | undefined;
    const roleReferences = Array.from(new Set([...(Array.isArray(sourceMetadata?.roleReferences) ? (sourceMetadata.roleReferences as unknown[]) : []), ...(generationContext.characterReferences ?? []).map((ref) => ref.assetId)])).filter(
        (id): id is string => typeof id === "string" && id.length > 0,
    );
    const outputCategory = (typeof sourceMetadata?.outputCategory === "string" ? sourceMetadata.outputCategory : undefined) || (sourceNode?.metadata?.workflowKind === "character" ? "character" : undefined);
    const sourceCode = (taskContext as { sourceCode?: import("@/types/asset-archive").AssetSourceCode })?.sourceCode || (taskContext?.conversationId ? "cloud-agent" : "canvas-generation");
    try {
        await runVideoTask(
            {
                projectId,
                nodeId: videoId,
                ...retryContext,
                mode: "video",
                prompt: effectivePrompt,
                config: generationConfig,
                referenceImages: generationContext.referenceImages,
                referenceVideos: generationContext.referenceVideos,
                referenceAudios: generationContext.referenceAudios,
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
                    resolvedCharacterVoices: generationContext.resolvedCharacterVoices,
                    promptTemplateOperation: sourceNode?.metadata?.promptTemplateOperation,
                    promptTemplateVariables: sourceNode?.metadata?.promptTemplateVariables,
                    ...videoGenerationMetadata,
                    ...styleMetadata,
                    ...skillMetadata,
                },
            },
            {
                bindTask: (task) => bindGenerationTask(videoId, task),
                consumeTask: (task) => applyGenerationTaskResult(videoId, task),
            },
        );
    } finally {
        finishGenerationRequest(videoId, controller);
    }
}

export async function executeAudioGeneration({
    nodeId,
    sourceNode,
    canvasNodes,
    canvasConnections,
    prompt,
    effectivePrompt,
    displayPrompt = effectivePrompt,
    generationConfig,
    generationContext,
    controller,
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
}: CanvasGenerationExecution) {
    const spec = NODE_DEFAULT_SIZE[CanvasNodeType.Audio];
    const isEmptyAudioNode = sourceNode?.type === CanvasNodeType.Audio && !sourceNode.metadata?.content;
    const isExistingAudioNode = sourceNode?.type === CanvasNodeType.Audio && Boolean(sourceNode.metadata?.content);
    const audioId = isEmptyAudioNode ? nodeId : nanoid();
    const parent = sourceNode?.position || { x: 0, y: 0 };
    const audioNode: CanvasNodeData = {
        id: audioId,
        type: CanvasNodeType.Audio,
        title: displayPrompt.slice(0, 32) || currentLocaleText("canvasExtra.autoTitle.generatedAudio"),
        position: isEmptyAudioNode ? sourceNode.position : { x: parent.x + (sourceNode?.width || spec.width) + 96, y: parent.y + ((sourceNode?.height || spec.height) - spec.height) / 2 },
        width: isEmptyAudioNode ? sourceNode.width : spec.width,
        height: isEmptyAudioNode ? sourceNode.height : spec.height,
        metadata: {
            ...canvasGenerationPromptMetadata(prompt, displayPrompt),
            composerAttachments: sourceNode?.metadata?.composerAttachments,
            status: NODE_STATUS_LOADING,
            ...buildAudioGenerationMetadata(generationConfig),
            audioVoiceBindings: sourceNode?.metadata?.audioVoiceBindings,
            ...(isEmptyAudioNode ? {} : { sourceNodeId: nodeId }),
            ...generationSpecMetadata(specFromConfig("audio", prompt, generationConfig, sourceNode ? readNodeGenerationSpec(sourceNode)?.referenceBindings : [], "append-sources")),
            ...skillMetadata,
        },
    };
    registerPendingNodeIds([audioId]);
    setNodes((current) =>
        isEmptyAudioNode
            ? current.map((node) => (node.id === nodeId ? { ...node, ...audioNode } : node))
            : appendNodesWithoutOverlap(
                  current.map((node) => (node.id === nodeId ? { ...node, metadata: { ...node.metadata, status: NODE_STATUS_SUCCESS } } : node)),
                  [audioNode],
              ),
    );
    if (!isEmptyAudioNode) {
        setConnections((current) => {
            if (isExistingAudioNode) {
                return [...current, ...canvasConnections.filter((connection) => connection.toNodeId === nodeId).map((connection) => ({ ...connection, id: nanoid(), toNodeId: audioId }))];
            }
            const referenceEdges = sourceNode?.type === CanvasNodeType.Config ? [] : imageGenerationReferenceConnections(nodeId, audioId, canvasNodes, current, nanoid);
            const hasDirectEdge = current.some((connection) => connection.fromNodeId === nodeId && connection.toNodeId === audioId) || referenceEdges.some((connection) => connection.fromNodeId === nodeId);
            return [...current, ...referenceEdges, ...(hasDirectEdge ? [] : [{ id: nanoid(), fromNodeId: nodeId, toNodeId: audioId }])];
        });
    }

    startGenerationRequest(audioId, nodeId, nodeId, controller);
    const audioSourceMetadata = sourceNode?.metadata as Record<string, unknown> | undefined;
    const roleReferences = Array.from(new Set([...(Array.isArray(audioSourceMetadata?.roleReferences) ? (audioSourceMetadata.roleReferences as unknown[]) : []), ...(generationContext.characterReferences ?? []).map((ref) => ref.assetId)])).filter(
        (id): id is string => typeof id === "string" && id.length > 0,
    );
    const outputCategory = (typeof audioSourceMetadata?.outputCategory === "string" ? audioSourceMetadata.outputCategory : undefined) || (sourceNode?.metadata?.workflowKind === "character" ? "character" : undefined);
    const sourceCode = (taskContext as { sourceCode?: import("@/types/asset-archive").AssetSourceCode })?.sourceCode || (taskContext?.conversationId ? "cloud-agent" : "canvas-generation");
    try {
        await runCanvasGenerationTaskToConsumer(
            {
                projectId,
                nodeId: audioId,
                ...retryContext,
                mode: "audio",
                prompt: effectivePrompt,
                config: generationConfig,
                referenceAudios: generationContext.referenceAudios,
                referenceImages: generationContext.referenceImages,
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
                    resolvedCharacterVoiceKey: generationContext.resolvedCharacterVoices[0]?.voiceKey,
                    audioVoiceBindings: sourceNode?.metadata?.audioVoiceBindings,
                    ...skillMetadata,
                },
            },
            {
                bindTask: (task) => bindGenerationTask(audioId, task),
                consumeTask: (task) => applyGenerationTaskResult(audioId, task),
            },
        );
    } finally {
        finishGenerationRequest(audioId, controller);
    }
}
