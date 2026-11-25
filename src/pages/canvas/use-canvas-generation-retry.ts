import { currentLocaleText as upstreamText } from "@/i18n/current-locale-text";
import { normalizeCanvasAudioVoiceBindings, resolveCompiledAudioVoiceBindingsPrompt, restoreConnectedAudioReferences, stripCanvasAudioVoiceBindingLines, trimAudioGenerationContext } from "@/lib/canvas/canvas-audio-voice-bindings";
import { buildNodeMentionReferences } from "@/lib/canvas/canvas-resource-references";
import { resolveImageRequestSize } from "@/services/api/image-validation";
import { ensureCanvasNodeAsset } from "@/services/project-asset-sync";
import { buildSourceImageLayerNodeResult } from "@/lib/canvas/canvas-generation-task-sync";
import { extractImageLayerFromSource } from "@/services/canvas-image-layer-source";
import { imageLayerOutputSize, imageLayerRemovalPrompt } from "@/lib/canvas/canvas-image-layer-plan";
import { imageLayerProviderMetadata, layerDecompositionConfig, supportsExperimentalLayerExtraction, supportsLayerDecomposition } from "@/lib/canvas/canvas-image-layers";
import { generationSpecMetadata, nodeGenerationPrompt, readNodeGenerationSpec, specFromConfig } from "@/lib/canvas/generation-contract";
import { useCallback, useRef, type Dispatch, type SetStateAction } from "react";
import { App } from "antd";

import { useI18n } from "@/i18n/use-i18n";
import { localizedGenerationError } from "@/i18n/generation-error";
import { buildNodeGenerationContext, buildNodeGenerationEffectivePrompt, buildNodeGenerationInputs, hydrateNodeGenerationContext, nodeGenerationReferencePromptLimit } from "@/components/canvas/canvas-node-generation";
import type { CanvasNodeGenerationMode } from "@/components/canvas/canvas-node-prompt-panel";
import { buildEmotionImageArtifacts, emotionGenerationSize, emotionProviderMask, normalizeEmotionPromptForProvider, resolveEmotionEditPlan } from "@/lib/canvas/canvas-emotion";
import {
    buildAudioGenerationMetadata,
    buildGenerationConfig,
    buildImageGenerationMetadata,
    buildVideoGenerationMetadata,
    createGenerationRetryContext,
    findRetrySourceNode,
    type GenerationRetryContext,
    generationReferenceUrls,
    generationWorkflowMetadata,
    isGenerationCanceled,
    canvasImageReferenceLimitError,
    resolveMetadataReferences,
    resolveStoredReferenceImages,
    runBackendCanvasGenerationTask,
    runCanvasGenerationTaskToConsumer,
    sourceNodeReferenceImages,
} from "@/lib/canvas/canvas-project-generation";
import { isCanvasWorkflowProvider } from "@/lib/canvas/canvas-workflow";
import { runCanvasGenerationSubmissionOnce } from "@/lib/canvas/canvas-generation-submission";
import { buildPortraitTexturePrompt } from "@/lib/canvas/canvas-portrait-texture";
import { resolveCanvasStyleExecution } from "@/lib/canvas/canvas-style-execution";
import { generationErrorMessage, generationFailureMetadata, unchangedModeratedPrompt } from "@/lib/generation-error";
import { modelCapabilityConfigFor } from "@/lib/model-capabilities";
import { effectiveAudioMode, modelGroupReferenceLimits, modelRequestOptions } from "@/lib/model-selection";
import { navigateToSettings } from "@/lib/settings-navigation";
import type { Skill } from "@/services/api/skills";
import { skillRuntime, type SkillRuntimeMetadata } from "@/services/skill-runtime";
import { queryGenerationTask, recoverMediaTask, waitForGenerationTask, type GenerationTask } from "@/services/api/task-center";
import { resolveImageUrl } from "@/services/image-storage";
import { resolveModelRequestConfig, useConfigStore, useEffectiveConfig } from "@/stores/use-config-store";
import type { Asset } from "@/stores/use-asset-store";
import { CanvasNodeType, type CanvasConnection, type CanvasNodeData, type CanvasNodeTypeId } from "@/types/canvas";
import type { ReferenceImage } from "@/types/image";

type UseCanvasGenerationRetryOptions = {
    projectId: string;
    domainProjectId?: string;
    addedSkills: Skill[];
    assets: Asset[];
    nodesRef: { current: CanvasNodeData[] };
    connectionsRef: { current: CanvasConnection[] };
    setNodes: Dispatch<SetStateAction<CanvasNodeData[]>>;
    setRunningNodeId: Dispatch<SetStateAction<string | null>>;
    startGenerationRequest: (targetNodeId: string, originNodeId: string, runningId?: string, controller?: AbortController) => AbortController;
    finishGenerationRequest: (targetNodeId: string, controller: AbortController) => void;
    bindGenerationTask: (targetNodeId: string, task: GenerationTask) => void;
    applyGenerationTaskResult: (targetNodeId: string, task: GenerationTask) => Promise<void>;
};

const NODE_STATUS_LOADING = "loading" as const;
const NODE_STATUS_ERROR = "error" as const;

export function useCanvasGenerationRetry({
    projectId,
    domainProjectId,
    addedSkills,
    assets,
    nodesRef,
    connectionsRef,
    setNodes,
    setRunningNodeId,
    startGenerationRequest,
    finishGenerationRequest,
    bindGenerationTask,
    applyGenerationTaskResult,
}: UseCanvasGenerationRetryOptions) {
    const { message } = App.useApp();
    const { t } = useI18n();
    const effectiveConfig = useEffectiveConfig();
    const isAiConfigReady = useConfigStore((state) => state.isAiConfigReady);
    const retryLocksRef = useRef(new Map<string, Promise<unknown>>());

    const runRetry = useCallback(
        async (node: CanvasNodeData) => {
            if (node.metadata?.experimentalLayerPlan || node.metadata?.layerExtraction || node.metadata?.layerDecomposition) {
                let sourceTask: GenerationTask | undefined;
                if (node.metadata?.experimentalLayerPlan) {
                    const complete = node.metadata.experimentalLayerPlan.requests.every((request) => {
                        const child = nodesRef.current.find((item) => item.id === request.nodeId);
                        return child?.metadata?.status === "success" && Boolean(child.metadata.content);
                    });
                    if (!complete) {
                        message.info(upstreamText("upstream.v165.message052"));
                        return;
                    }
                    setNodes((current) =>
                        current.map((item) =>
                            item.id === node.id && item.metadata?.experimentalLayerPlan
                                ? { ...item, metadata: { ...item.metadata, status: "loading", errorDetails: undefined, experimentalLayerPlan: { ...item.metadata.experimentalLayerPlan, errorSignature: undefined, composedSignature: undefined } } }
                                : item,
                        ),
                    );
                    return;
                }
                const localExtraction = node.metadata?.layerExtraction;
                if (localExtraction?.strategy && localExtraction.strategy.method !== "generate") {
                    if (!localExtraction.source || !localExtraction.canvas) {
                        message.error(upstreamText("upstream.v165.message053"));
                        return;
                    }
                    const controller = startGenerationRequest(node.id, localExtraction.sourceNodeId, node.id);
                    setRunningNodeId(node.id);
                    setNodes((current) => current.map((item) => (item.id === node.id ? { ...item, metadata: { ...item.metadata, status: "loading", errorDetails: undefined } } : item)));
                    try {
                        const image = await extractImageLayerFromSource(localExtraction.source, localExtraction.strategy, localExtraction.canvas);
                        const completed = await buildSourceImageLayerNodeResult(node, image, controller.signal);
                        if (!nodesRef.current.some((item) => item.id === node.id)) return;
                        setNodes((current) => current.map((item) => (item.id === node.id ? completed : item)));
                        try {
                            const asset = await ensureCanvasNodeAsset({ canvasId: projectId, domainProjectId, node: completed, source: "canvas-manual" });
                            if (!controller.signal.aborted)
                                setNodes((current) => current.map((item) => (item.id === node.id && item.metadata?.storageKey === completed.metadata?.storageKey ? { ...item, metadata: { ...item.metadata, assetId: asset.assetId } } : item)));
                        } catch (error) {
                            message.warning(upstreamText("upstream.v165.message054", { p0: generationErrorMessage(error) }));
                        }
                    } catch (error) {
                        const failure = generationFailureMetadata(error, node.metadata?.prompt || "");
                        const details = failure.errorDetails;
                        if (!controller.signal.aborted) message.error(details);
                        setNodes((current) => current.map((item) => (item.id === node.id ? { ...item, metadata: { ...item.metadata, status: "error", ...failure } } : item)));
                    } finally {
                        finishGenerationRequest(node.id, controller);
                        setRunningNodeId((current) => (current === node.id ? null : current));
                    }
                    return;
                }
                if (node.metadata?.taskId) {
                    try {
                        sourceTask = await queryGenerationTask(node.metadata.taskId);
                    } catch (error) {
                        message.error(error instanceof Error ? error.message : upstreamText("upstream.v165.message056"));
                        return;
                    }
                }
                // Recover the already billed provider result before another layer submission.
                if (sourceTask && (sourceTask.canRecoverMedia || (sourceTask.mediaStage && sourceTask.status !== "succeeded"))) {
                    const controller = startGenerationRequest(node.id, node.id, node.id);
                    setRunningNodeId(node.id);
                    try {
                        const recovering = await recoverMediaTask(sourceTask.id);
                        bindGenerationTask(node.id, recovering);
                        const completed = await waitForGenerationTask(sourceTask.id, { signal: controller.signal, initialTask: recovering, onTaskUpdate: (task) => bindGenerationTask(node.id, task) });
                        await applyGenerationTaskResult(node.id, completed);
                    } catch (error) {
                        if (!isGenerationCanceled(error)) message.error(localizedGenerationError(error, t));
                    } finally {
                        finishGenerationRequest(node.id, controller);
                        setRunningNodeId((current) => (current === node.id ? null : current));
                    }
                    return;
                }
                if (
                    (node.metadata?.layerDecomposition || node.metadata?.layerExtraction) &&
                    sourceTask?.status === "succeeded" &&
                    node.metadata?.layerExtraction?.rejectedTaskId !== sourceTask.id &&
                    node.metadata?.layerExtraction?.phase !== "background-removal-required"
                ) {
                    try {
                        await applyGenerationTaskResult(node.id, sourceTask);
                    } catch (error) {
                        message.error(error instanceof Error ? error.message : upstreamText("upstream.v165.message057"));
                    }
                    return;
                }
                if (node.metadata?.layerExtraction) {
                    const extraction = node.metadata.layerExtraction;
                    const removing = extraction.phase === "background-removal-required" || extraction.phase === "remove-background";
                    const source = removing ? node : nodesRef.current.find((item) => item.id === extraction.sourceNodeId);
                    if ((!source?.metadata?.content && (removing || !extraction.source)) || !extraction.canvas) {
                        message.error(upstreamText("upstream.v165.message058"));
                        return;
                    }
                    const model = removing ? extraction.backgroundRemovalModel || node.metadata.model : node.metadata.model;
                    if (!model) {
                        message.error(upstreamText("upstream.v165.message059"));
                        return;
                    }
                    const config = layerDecompositionConfig(buildGenerationConfig(effectiveConfig, node, "image"), model, { size: imageLayerOutputSize(effectiveConfig, model, extraction.canvas) });
                    config.transparentBackground = extraction.index > 0 ? "true" : "false";
                    if (!config.size || !supportsExperimentalLayerExtraction(config, model) || !isAiConfigReady(config, model)) {
                        message.error(upstreamText("upstream.v165.message060"));
                        return;
                    }
                    try {
                        const profile = modelCapabilityConfigFor(config, model).image;
                        if (profile) config.size = resolveImageRequestSize(profile, config.quality, config.size)?.value || "auto";
                    } catch (error) {
                        message.error(error instanceof Error ? error.message : upstreamText("upstream.v165.message061"));
                        return;
                    }
                    const parent = nodesRef.current.find((item) => item.id === extraction.groupId);
                    const target = parent?.metadata?.experimentalLayerPlan?.requests.find((request) => request.nodeId === node.id)?.target || node.title;
                    const prompt = removing ? imageLayerRemovalPrompt(target) : nodeGenerationPrompt(node);
                    const reference =
                        !removing && extraction.source
                            ? { id: extraction.sourceNodeId, name: upstreamText("canvasDialog.split.original"), type: extraction.source.mimeType || "image/png", ...extraction.source }
                            : { id: source!.id, name: `${source!.title || upstreamText("upstream.v165.message062")}.png`, type: source!.metadata!.mimeType || "image/png", dataUrl: source!.metadata!.content!, storageKey: source!.metadata!.storageKey };
                    const controller = startGenerationRequest(node.id, extraction.sourceNodeId, node.id);
                    setRunningNodeId(node.id);
                    try {
                        if (sourceTask && (sourceTask.status === "queued" || sourceTask.status === "running")) {
                            bindGenerationTask(node.id, sourceTask);
                            const completed = await waitForGenerationTask(sourceTask.id, { initialTask: sourceTask, signal: controller.signal, timeoutMs: 25 * 60_000, onTaskUpdate: (task) => bindGenerationTask(node.id, task) });
                            await applyGenerationTaskResult(node.id, completed);
                            return;
                        }
                        setNodes((current) =>
                            current.map((item) =>
                                item.id === node.id
                                    ? {
                                          ...item,
                                          metadata: {
                                              ...item.metadata,
                                              ...buildImageGenerationMetadata("edit", config, 1, [reference]),
                                              prompt,
                                              status: "loading",
                                              errorDetails: undefined,
                                              taskId: undefined,
                                              layerExtraction: { ...extraction, phase: removing ? "remove-background" : "extract", rejectedTaskId: undefined },
                                          },
                                      }
                                    : item,
                            ),
                        );
                        const retryContext = sourceTask ? await createGenerationRetryContext(sourceTask.id, node.metadata.attemptGroupId) : {};
                        await runCanvasGenerationTaskToConsumer(
                            {
                                projectId,
                                nodeId: node.id,
                                mode: "image",
                                prompt: buildNodeGenerationEffectivePrompt(prompt, { referenceImages: [reference], referenceVideos: [], referenceAudios: [] }, nodeGenerationReferencePromptLimit(config, "image"), nodeGenerationPrompt(node)),
                                config,
                                referenceImages: [reference],
                                signal: controller.signal,
                                ...retryContext,
                                metadata: { retry: true, sourceNodeId: extraction.sourceNodeId, edit: removing ? "layer-background-removal" : "layer-extraction", ...imageLayerProviderMetadata(config, extraction.index) },
                            },
                            { bindTask: (task) => bindGenerationTask(node.id, task), consumeTask: (task) => applyGenerationTaskResult(node.id, task) },
                        );
                        // 刷新后的手动恢复一次只发起一项付费调用，后续去背景由用户继续。
                        setNodes((current) =>
                            current.map((item) =>
                                item.id === node.id && item.metadata?.layerExtraction?.phase === "background-removal-required" ? { ...item, metadata: { ...item.metadata, status: "error", errorDetails: upstreamText("upstream.v165.message063") } } : item,
                            ),
                        );
                    } catch (error) {
                        const failure = generationFailureMetadata(error, node.metadata?.prompt || "");
                        const details = failure.errorDetails;
                        message.error(details);
                        setNodes((current) =>
                            current.map((item) => (item.id === node.id ? { ...item, metadata: { ...item.metadata, status: "error", ...failure, layerExtraction: { ...item.metadata!.layerExtraction!, rejectedTaskId: item.metadata?.taskId } } } : item)),
                        );
                    } finally {
                        finishGenerationRequest(node.id, controller);
                    }
                    return;
                }
            }
            // Read the server state before rebuilding prompts or reserving a new
            // generation: an old canvas snapshot may lack the recovery flag.
            if (node.metadata?.taskId) {
                try {
                    const original = await queryGenerationTask(node.metadata.taskId);
                    if (original.canRecoverMedia || (original.mediaStage && original.status !== "succeeded")) {
                        const controller = startGenerationRequest(node.id, node.id, node.id);
                        setRunningNodeId(node.id);
                        try {
                            const recovering = await recoverMediaTask(original.id);
                            bindGenerationTask(node.id, recovering);
                            const completed = await waitForGenerationTask(original.id, { signal: controller.signal, initialTask: recovering, onTaskUpdate: (task) => bindGenerationTask(node.id, task) });
                            await applyGenerationTaskResult(node.id, completed);
                        } finally {
                            finishGenerationRequest(node.id, controller);
                            setRunningNodeId(null);
                        }
                        return;
                    }
                } catch (error) {
                    if (!isGenerationCanceled(error)) message.error(localizedGenerationError(error, t));
                    return;
                }
            }
            const retryMode = retryModeForNode(node.type);
            if (!retryMode) {
                message.warning(t("canvasRuntime.retry.unsupported"));
                return;
            }
            const sourceNode = findRetrySourceNode(node.id, nodesRef.current, connectionsRef.current) || (retryMode === "audio" && node.metadata?.sourceNodeId ? nodesRef.current.find((item) => item.id === node.metadata?.sourceNodeId) : undefined) || node;
            const batchRoot = node.metadata?.batchRootId ? nodesRef.current.find((item) => item.id === node.metadata?.batchRootId) : null;
            const savedImageMetadata = node.type === CanvasNodeType.Image ? { ...batchRoot?.metadata, ...node.metadata } : undefined;
            const hasSavedImageMetadata = Boolean(savedImageMetadata?.generationType);
            const generationSourceNode =
                hasSavedImageMetadata && savedImageMetadata ? { ...node, metadata: savedImageMetadata } : (node.type === CanvasNodeType.Config && isCanvasWorkflowProvider(node.metadata)) || node.metadata?.workflowProvider === "model" ? node : sourceNode;
            const sourceGenerationConfig = buildGenerationConfig(effectiveConfig, generationSourceNode, retryMode);
            let generationConfig = { ...sourceGenerationConfig, count: "1" };
            if (node.metadata?.layerDecomposition) {
                generationConfig = layerDecompositionConfig(generationConfig, generationConfig.model);
                if (!supportsLayerDecomposition(generationConfig, generationConfig.model)) {
                    message.error(upstreamText("upstream.v165.message065"));
                    return;
                }
            }
            if (!isAiConfigReady(generationConfig, generationConfig.model)) {
                navigateToSettings({ continueCreation: true });
                return;
            }

            const retryPromptSource = nodeGenerationPrompt(node) || nodeGenerationPrompt(sourceNode);
            const savedSpec = readNodeGenerationSpec(generationSourceNode);
            const retrySpecMetadata = (mode: "image" | "video" | "audio", config: typeof generationConfig) =>
                generationSpecMetadata(specFromConfig(mode, retryPromptSource, config, savedSpec?.referenceBindings || [], savedSpec?.textInputMode || (mode === "video" ? "prompt-only" : "append-sources")));
            const retryContextPrompt = retryMode === "image" && sourceNode.metadata?.portraitTexture ? buildPortraitTexturePrompt(retryPromptSource, sourceNode.metadata.portraitTexture) : retryPromptSource;
            if (unchangedModeratedPrompt(node.metadata, retryPromptSource)) {
                message.warning(t("canvasRuntime.retry.moderated"));
                return;
            }
            const failBeforeSubmit = (error: unknown) => {
                const failure = generationFailureMetadata(error, retryPromptSource);
                message.error(failure.errorDetails);
                setNodes((current) => current.map((item) => (item.id === node.id ? { ...item, metadata: { ...item.metadata, status: NODE_STATUS_ERROR, ...failure } } : item)));
            };
            let rawContext: Awaited<ReturnType<typeof hydrateNodeGenerationContext>> | null;
            try {
                const promptOnly = retryMode === "video";
                // 结果节点拥有自己的附件快照，重试不读取后来被编辑过的源节点附件。
                const contextNodes =
                    node.metadata?.composerAttachments !== undefined
                        ? nodesRef.current.map((item) => (item.id === sourceNode.id ? { ...item, metadata: { ...item.metadata, composerAttachments: node.metadata!.composerAttachments } } : item))
                        : nodesRef.current;
                const usesWorkflowProvider = Boolean(retryMode !== "text" && generationConfig.taskWorkflowProvider && generationConfig.taskWorkflowProvider !== "model");
                const resolvedRetryAudioMode = retryMode === "audio" ? effectiveAudioMode(generationConfig, generationConfig.model) : undefined;
                const retryBindings = normalizeCanvasAudioVoiceBindings(node.metadata?.audioVoiceBindings);
                const cleanRetryPrompt = retryMode === "audio" ? stripCanvasAudioVoiceBindingLines(retryContextPrompt) : retryContextPrompt;
                let baseContext = buildNodeGenerationContext(sourceNode.id, contextNodes, connectionsRef.current, cleanRetryPrompt, assets, promptOnly, retryMode === "video" ? generationConfig : undefined);
                if (retryMode === "audio" && !usesWorkflowProvider && resolvedRetryAudioMode === "unified_edit") {
                    baseContext = restoreConnectedAudioReferences(baseContext, buildNodeGenerationInputs(sourceNode.id, contextNodes, connectionsRef.current), retryBindings);
                }
                const retryVideoReferenceLimits =
                    retryMode === "video" && !usesWorkflowProvider
                        ? modelGroupReferenceLimits(effectiveConfig, generationConfig.model, "video", {
                              capability: "video",
                              input: {
                                  textCount: baseContext.textCount,
                                  imageCount: baseContext.imageCount,
                                  videoCount: baseContext.videoCount,
                                  audioCount: baseContext.audioCount,
                                  characterCount: baseContext.characterReferences.length,
                              },
                              videoOperation: sourceNode.metadata?.videoEditOperation,
                              videoSeconds: generationConfig.videoSeconds,
                              options: generationConfig.taskWorkflowProvider === "model" ? modelRequestOptions(generationConfig, "video") : undefined,
                          })
                        : undefined;
                const hydrateInputContext = retryMode === "audio" && resolvedRetryAudioMode === "unified_edit" ? { ...baseContext, characterReferences: [] } : baseContext;
                rawContext =
                    hasSavedImageMetadata && !baseContext.characterReferences.length
                        ? null
                        : await hydrateNodeGenerationContext(
                              hydrateInputContext,
                              projectId,
                              domainProjectId,
                              retryMode,
                              retryMode === "video" && Boolean(retryVideoReferenceLimits?.maxAudios),
                              retryMode !== "audio" && !promptOnly,
                              retryVideoReferenceLimits,
                          );
                if (retryMode === "audio" && rawContext) {
                    rawContext = trimAudioGenerationContext(rawContext, resolvedRetryAudioMode, usesWorkflowProvider);
                    if (!usesWorkflowProvider && resolvedRetryAudioMode === "unified_edit") {
                        rawContext = {
                            ...rawContext,
                            prompt: resolveCompiledAudioVoiceBindingsPrompt(rawContext.prompt, retryBindings, buildNodeMentionReferences(sourceNode, contextNodes, connectionsRef.current), rawContext.referenceAudios),
                        };
                    }
                }
            } catch (error) {
                failBeforeSubmit(error);
                return;
            }
            let skillMetadata: SkillRuntimeMetadata = {
                skillIds: node.metadata?.skillIds || [],
                skillVersions: node.metadata?.skillVersions || [],
                skillFiles: node.metadata?.skillFiles || [],
            };
            let context = rawContext;
            if (rawContext) {
                try {
                    const skillExecution = await skillRuntime.prepare({ profile: "canvas", prompt: rawContext.prompt, skills: addedSkills });
                    context = { ...rawContext, prompt: skillExecution.prompt };
                    skillMetadata = skillExecution.metadata;
                } catch (error) {
                    message.error(t("canvasRuntime.retry.skillLoadFailed"));
                    return;
                }
            }
            const prompt = (context?.characterReferences.length ? context.prompt : savedImageMetadata?.prompt || context?.prompt || "").trim();
            if (!prompt) {
                message.warning(t("canvasRuntime.retry.promptMissing"));
                return;
            }
            let mediaPrompt = prompt;
            let styleMetadata = {};
            if (node.type === CanvasNodeType.Image) {
                try {
                    const runtime = resolveCanvasStyleExecution(nodesRef.current, sourceNode, prompt, generationConfig, "image");
                    if (runtime) {
                        mediaPrompt = runtime.prompt;
                        styleMetadata = { styleProfileJson: runtime.profileJson, styleExecutionPlan: runtime.plan };
                    }
                } catch (error) {
                    message.error(error instanceof Error ? error.message : t("canvasRuntime.retry.styleIncompatible"));
                    return;
                }
            }
            if (retryMode === "audio" && effectiveAudioMode(generationConfig, generationConfig.model) !== "unified_edit" && context?.characterReferences.length) {
                if (context.characterReferences.length !== 1) {
                    message.error(t("canvasRuntime.retry.voiceSingle"));
                    return;
                }
                const voice = context.resolvedCharacterVoices[0];
                if (!voice) {
                    message.error(t("canvasRuntime.retry.voiceMissing"));
                    return;
                }
                generationConfig = { ...generationConfig, audioVoice: voice.voiceKey, audioInstructions: [voice.instructions, generationConfig.audioInstructions].filter(Boolean).join("；") };
            }
            const generationType = savedImageMetadata?.generationType;
            const isEmotionRetry = Boolean(node.metadata?.emotionEdit);
            if (isEmotionRetry && resolveModelRequestConfig(generationConfig, generationConfig.model).interfaceType !== "openai-image") {
                message.error(t("canvasRuntime.retry.emotionProvider"));
                return;
            }
            const useReferenceImages = isEmotionRetry ? false : context?.characterReferences.length ? true : generationType ? generationType === "edit" : Boolean(context?.referenceImages.length);
            let retryReferenceImages: ReferenceImage[] | null;
            try {
                retryReferenceImages = isEmotionRetry
                    ? []
                    : hasSavedImageMetadata && savedImageMetadata && !context?.characterReferences.length
                      ? await resolveMetadataReferences(savedImageMetadata)
                      : useReferenceImages
                        ? context?.referenceImages.length
                            ? context.referenceImages
                            : sourceNodeReferenceImages(batchRoot || sourceNode)
                        : [];
            } catch (error) {
                failBeforeSubmit(error);
                return;
            }
            if (useReferenceImages && !retryReferenceImages) {
                markMissingReferences(node.id, setNodes, t("canvasRuntime.retry.referencesMissing"));
                message.error(t("canvasRuntime.retry.referencesMissing"));
                return;
            }
            const retryImages = retryReferenceImages || [];
            if (retryMode === "image") {
                const referenceLimitError = canvasImageReferenceLimitError(generationConfig, retryImages);
                if (referenceLimitError) {
                    message.error(referenceLimitError);
                    return;
                }
            }
            let storedVideoImages: ReferenceImage[] | null;
            try {
                storedVideoImages = node.type === CanvasNodeType.Video && !context?.referenceImages.length ? await resolveStoredReferenceImages(node.metadata?.references) : [];
            } catch (error) {
                failBeforeSubmit(error);
                return;
            }
            if (storedVideoImages === null) {
                markMissingReferences(node.id, setNodes, t("canvasRuntime.retry.referencesMissing"));
                message.error(t("canvasRuntime.retry.referencesMissing"));
                return;
            }
            const videoReferenceImages = context?.referenceImages.length ? context.referenceImages : storedVideoImages;
            const videoContext =
                node.type === CanvasNodeType.Video
                    ? {
                          prompt,
                          referenceImages: videoReferenceImages,
                          referenceVideos: context?.referenceVideos || [],
                          referenceAudios: context?.referenceAudios || [],
                          textCount: context?.textCount || 0,
                          imageCount: videoReferenceImages.length,
                          videoCount: context?.referenceVideos.length || 0,
                          audioCount: context?.referenceAudios.length || 0,
                      }
                    : undefined;

            setRunningNodeId(node.id);
            setNodes((current) =>
                current.map((item) =>
                    item.id === node.id ? { ...item, metadata: { ...item.metadata, status: NODE_STATUS_LOADING, errorDetails: undefined, generationErrorCode: undefined, resourceReloadAvailable: undefined, failedPromptFingerprint: undefined } } : item,
                ),
            );
            const controller = startGenerationRequest(node.id, sourceNode.id, node.id);
            let retryContext: Partial<GenerationRetryContext> = {};
            const runAndConsumeRetry = async (input: Parameters<typeof runBackendCanvasGenerationTask>[0]) => {
                const effectivePrompt =
                    input.mode === "audio"
                        ? input.prompt
                        : buildNodeGenerationEffectivePrompt(
                              input.prompt,
                              { referenceImages: input.referenceImages || [], referenceVideos: input.referenceVideos || [], referenceAudios: input.referenceAudios || [] },
                              nodeGenerationReferencePromptLimit(input.config, input.mode),
                              retryPromptSource,
                          );
                await runCanvasGenerationTaskToConsumer(
                    { ...input, ...retryContext, prompt: effectivePrompt },
                    {
                        bindTask: (task) => bindGenerationTask(node.id, task),
                        consumeTask: (task) => applyGenerationTaskResult(node.id, task),
                    },
                );
            };

            try {
                // 节点已标为生成中：这里失败（如非 HTTPS 下没有 crypto.subtle）也必须走下方失败处理，不能卡在生成中。
                if (node.metadata?.taskId) retryContext = await createGenerationRetryContext(node.metadata.taskId, node.metadata.attemptGroupId);
                if (node.type === CanvasNodeType.Text) {
                    if (!context) return;
                    await runAndConsumeRetry({
                        projectId,
                        nodeId: node.id,
                        mode: "text",
                        prompt,
                        config: generationConfig,
                        referenceImages: context.referenceImages,
                        referenceVideos: context.referenceVideos,
                        signal: controller.signal,
                        metadata: { retry: true, sourceNodeId: sourceNode.id, resolvedCharacterVersions: context.resolvedCharacterVersions },
                    });
                    return;
                }
                if (node.type === CanvasNodeType.Video) {
                    const videoGenerationMetadata = buildVideoGenerationMetadata(node, videoContext, generationConfig);
                    setNodes((current) =>
                        current.map((item) =>
                            item.id === node.id
                                ? {
                                      ...item,
                                      metadata: {
                                          ...item.metadata,
                                          prompt: mediaPrompt,
                                          model: generationConfig.model,
                                          size: generationConfig.size,
                                          seconds: generationConfig.videoSeconds,
                                          vquality: generationConfig.vquality,
                                          generateAudio: generationConfig.videoGenerateAudio,
                                          watermark: generationConfig.videoWatermark,
                                          ...videoGenerationMetadata,
                                          ...retrySpecMetadata("video", generationConfig),
                                          ...styleMetadata,
                                          ...skillMetadata,
                                          references: videoContext ? generationReferenceUrls(videoContext) : item.metadata?.references,
                                      },
                                  }
                                : item,
                        ),
                    );
                    await runAndConsumeRetry({
                        projectId,
                        nodeId: node.id,
                        mode: "video",
                        prompt: mediaPrompt,
                        config: generationConfig,
                        referenceImages: videoContext?.referenceImages || [],
                        referenceVideos: videoContext?.referenceVideos || [],
                        referenceAudios: videoContext?.referenceAudios || [],
                        signal: controller.signal,
                        metadata: {
                            retry: true,
                            sourceNodeId: sourceNode.id,
                            resolvedCharacterVersions: context?.resolvedCharacterVersions || [],
                            resolvedCharacterVoices: context?.resolvedCharacterVoices || [],
                            promptTemplateOperation: node.metadata?.promptTemplateOperation,
                            promptTemplateVariables: node.metadata?.promptTemplateVariables,
                            ...videoGenerationMetadata,
                            ...styleMetadata,
                            ...skillMetadata,
                        },
                    });
                    return;
                }
                if (node.type === CanvasNodeType.Audio) {
                    setNodes((current) => current.map((item) => (item.id === node.id ? { ...item, metadata: { ...item.metadata, prompt, ...buildAudioGenerationMetadata(generationConfig), ...retrySpecMetadata("audio", generationConfig) } } : item)));
                    await runAndConsumeRetry({
                        projectId,
                        nodeId: node.id,
                        mode: "audio",
                        prompt,
                        config: generationConfig,
                        referenceAudios: context?.referenceAudios || [],
                        referenceImages: context?.referenceImages || [],
                        signal: controller.signal,
                        metadata: {
                            retry: true,
                            sourceNodeId: sourceNode.id,
                            audioVoiceBindings: node.metadata?.audioVoiceBindings,
                            resolvedCharacterVersions: context?.resolvedCharacterVersions || [],
                            resolvedCharacterVoiceKey: context?.resolvedCharacterVoices[0]?.voiceKey,
                        },
                    });
                    return;
                }

                const emotionEdit = node.metadata?.emotionEdit;
                if (emotionEdit) {
                    const emotionSource = nodesRef.current.find((item) => item.id === emotionEdit.sourceNodeId);
                    if (!emotionSource?.metadata?.content) throw new Error(t("canvasRuntime.retry.emotionSourceDeleted"));
                    const sourceDataUrl = await resolveImageUrl(emotionSource.metadata.storageKey, emotionSource.metadata.content, { cacheMiss: true });
                    if (!sourceDataUrl) throw new Error(t("canvasRuntime.retry.emotionSourceUnreadable"));
                    const artifacts = await buildEmotionImageArtifacts(sourceDataUrl, emotionEdit.faceBox, emotionSource.metadata.naturalWidth || 0, emotionSource.metadata.naturalHeight || 0);
                    const emotionConfig = { ...generationConfig, size: emotionGenerationSize(artifacts.editRegion), quality: !generationConfig.quality || generationConfig.quality === "auto" ? "high" : generationConfig.quality };
                    const imageProfile = modelCapabilityConfigFor(emotionConfig, emotionConfig.model).image!;
                    const editPlan = resolveEmotionEditPlan(imageProfile.references.maskSupported);
                    const sourceReference = sourceNodeReferenceImages(emotionSource)[0];
                    if (!sourceReference) throw new Error(t("canvasRuntime.retry.emotionSourceUnavailable"));
                    const editReference = { id: `${emotionSource.id}-${emotionEdit.presetId}-edit-region`, name: "emotion-edit-region.png", type: "image/png", dataUrl: artifacts.sourceDataUrl };
                    const characterReference = { id: `${emotionSource.id}-${emotionEdit.presetId}-character`, name: `${emotionEdit.characterName}-face.jpg`, type: "image/jpeg", dataUrl: artifacts.characterDataUrl };
                    const nextEmotionEdit = { ...emotionEdit, editRegion: artifacts.editRegion, sourceWidth: artifacts.imageWidth, sourceHeight: artifacts.imageHeight, providerSize: emotionConfig.size, editMode: editPlan.mode };
                    const providerPrompt = normalizeEmotionPromptForProvider(mediaPrompt);
                    const mask = emotionProviderMask(editPlan, { id: `${emotionSource.id}-emotion-mask`, name: "emotion-mask.png", type: "image/png", dataUrl: artifacts.maskDataUrl });
                    if (editPlan.notice) message.info(editPlan.notice);
                    const generationMetadata = { ...buildImageGenerationMetadata("edit", emotionConfig, 1, [sourceReference]), size: `${artifacts.imageWidth}x${artifacts.imageHeight}` };
                    setNodes((current) =>
                        current.map((item) =>
                            item.id === node.id
                                ? {
                                      ...item,
                                      metadata: { ...item.metadata, prompt: providerPrompt, ...generationMetadata, ...retrySpecMetadata("image", emotionConfig), ...styleMetadata, ...skillMetadata, emotionEdit: nextEmotionEdit },
                                  }
                                : item,
                        ),
                    );
                    await runAndConsumeRetry({
                        projectId,
                        nodeId: node.id,
                        mode: "image",
                        prompt: providerPrompt,
                        config: emotionConfig,
                        referenceImages: [editReference, characterReference],
                        mask,
                        signal: controller.signal,
                        metadata: {
                            retry: true,
                            sourceNodeId: emotionSource.id,
                            edit: "emotion",
                            emotionEditMode: editPlan.mode,
                            emotion: nextEmotionEdit,
                            resolvedCharacterVersions: context?.resolvedCharacterVersions || [],
                            ...styleMetadata,
                            ...skillMetadata,
                        },
                    });
                    return;
                }

                const generationMetadata = savedImageMetadata?.generationType
                    ? {
                          generationType: savedImageMetadata.generationType,
                          model: generationConfig.model,
                          size: generationConfig.size,
                          quality: generationConfig.quality,
                          transparentBackground: generationConfig.transparentBackground,
                          count: savedImageMetadata.count || 1,
                          references: savedImageMetadata.references,
                          ...generationWorkflowMetadata(generationConfig),
                      }
                    : buildImageGenerationMetadata(useReferenceImages ? "edit" : "generation", generationConfig, 1, retryImages);
                setNodes((current) =>
                    current.map((item) =>
                        item.id === node.id
                            ? {
                                  ...item,
                                  metadata: { ...item.metadata, prompt: mediaPrompt, ...generationMetadata, ...retrySpecMetadata("image", generationConfig), ...styleMetadata, ...skillMetadata },
                              }
                            : item,
                    ),
                );
                await runAndConsumeRetry({
                    projectId,
                    nodeId: node.id,
                    mode: "image",
                    prompt: mediaPrompt,
                    config: generationConfig,
                    referenceImages: useReferenceImages ? retryImages : [],
                    signal: controller.signal,
                    metadata: {
                        retry: true,
                        sourceNodeId: sourceNode.id,
                        layerDecomposition: Boolean(node.metadata?.layerDecomposition),
                        resolvedCharacterVersions: context?.resolvedCharacterVersions || [],
                        promptTemplateOperation: node.metadata?.promptTemplateOperation,
                        promptTemplateVariables: node.metadata?.promptTemplateVariables,
                        ...styleMetadata,
                        ...skillMetadata,
                    },
                });
            } catch (error) {
                if (isGenerationCanceled(error)) return;
                const failure = generationFailureMetadata(error, retryPromptSource);
                message.error(failure.errorDetails);
                setNodes((current) => current.map((item) => (item.id === node.id ? { ...item, metadata: { ...item.metadata, status: NODE_STATUS_ERROR, ...failure } } : item)));
            } finally {
                finishGenerationRequest(node.id, controller);
                setRunningNodeId(null);
            }
        },
        [addedSkills, applyGenerationTaskResult, assets, bindGenerationTask, connectionsRef, domainProjectId, effectiveConfig, finishGenerationRequest, isAiConfigReady, message, nodesRef, projectId, setNodes, setRunningNodeId, startGenerationRequest, t],
    );

    // 重试准备阶段（解析参考图、加载技能）节点仍显示失败和重试按钮；同一节点只允许一个重试在途，
    // 否则连点会重复提交扣费，后一次还会中止前一次的请求。
    return useCallback(
        (node: CanvasNodeData) =>
            runCanvasGenerationSubmissionOnce(
                retryLocksRef.current,
                node.id,
                () => runRetry(node),
                () => message.info({ key: `canvas-generation-submission-${node.id}`, content: t("canvasRuntime.generation.submissionInProgress") }),
            ),
        [message, runRetry, t],
    );
}

// 生成类型必须由明确的节点契约决定，未知节点不能降级成图片任务。
function retryModeForNode(type: CanvasNodeTypeId): CanvasNodeGenerationMode | null {
    if (type === CanvasNodeType.Text) return "text";
    if (type === CanvasNodeType.Image) return "image";
    if (type === CanvasNodeType.Video) return "video";
    if (type === CanvasNodeType.Audio) return "audio";
    return null;
}

function markMissingReferences(nodeId: string, setNodes: Dispatch<SetStateAction<CanvasNodeData[]>>, errorDetails: string) {
    setNodes((current) => current.map((item) => (item.id === nodeId ? { ...item, metadata: { ...item.metadata, status: NODE_STATUS_ERROR, errorDetails } } : item)));
}
