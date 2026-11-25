import { synchronizeGenerationSpec } from "@/lib/canvas/generation-contract";
import {
    filterActiveCanvasAudioVoiceBindings,
    normalizeCanvasAudioVoiceBindings,
    resolveCompiledAudioVoiceBindingsPrompt,
    restoreConnectedAudioReferences,
    stripCanvasAudioVoiceBindingLines,
    trimAudioGenerationContext,
    type CanvasAudioVoiceBinding,
} from "@/lib/canvas/canvas-audio-voice-bindings";
import { matchAudioValidationMessageKey } from "@/i18n/ddcat-updates";
import { buildNodeMentionReferences } from "@/lib/canvas/canvas-resource-references";
import { buildConfirmedStoryboardVideoConfig, type ConfirmedStoryboardVideoSettings } from "@/lib/canvas/storyboard-video-confirmation";
import { isCanvasNodeGenerating } from "@/lib/canvas/canvas-node-task-state";
import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { App } from "antd";
import { useLocation, useNavigate } from "react-router";
import { guestCanvasLoginPath } from "@/lib/canvas/guest-canvas-navigation";

import { useI18n } from "@/i18n/use-i18n";
import { localizedGenerationError } from "@/i18n/generation-error";
import { buildNodeGenerationContext, buildNodeGenerationEffectivePrompt, buildNodeGenerationInputs, hydrateNodeGenerationContext, nodeGenerationReferencePromptLimit } from "@/components/canvas/canvas-node-generation";
import type { CanvasNodeGenerationMode } from "@/components/canvas/canvas-node-prompt-panel";
import { buildGenerationConfig, isGenerationCanceled } from "@/lib/canvas/canvas-project-generation";
import { canvasGenerationPromptMetadata, canvasGenerationRequestFingerprint, runCanvasGenerationSubmissionOnce } from "@/lib/canvas/canvas-generation-submission";
import { isGenerationTaskCapacityError } from "@/lib/canvas/canvas-generation-batch";
import { buildPortraitTexturePrompt } from "@/lib/canvas/canvas-portrait-texture";
import { appendCameraPrompt } from "@/lib/canvas/camera-prompt-library";
import { buildTextRewritePrompt } from "@/lib/prompts";
import { resolveCanvasStyleExecution } from "@/lib/canvas/canvas-style-execution";
import { generationErrorMessage, generationFailureMetadata } from "@/lib/generation-error";
import { effectiveAudioMode, modelCompatibilityError, modelGroupReferenceLimits, modelPromptLengthError, modelRequestOptions, type ModelRequirements } from "@/lib/model-selection";
import { guardVideoReferences, videoReferenceActions } from "@/lib/video-reference-validation";
import { navigateToSettings } from "@/lib/settings-navigation";
import type { Skill } from "@/services/api/skills";
import { skillRuntime } from "@/services/skill-runtime";
import type { GenerationTask } from "@/services/api/task-center";
import { useConfigStore, useEffectiveConfig } from "@/stores/use-config-store";
import { useUserStore } from "@/stores/use-user-store";
import { selectDirectorPrevisV2 } from "@/hooks/use-director-previs-v2";
import { stageGuestCanvasForSignIn } from "@/services/guest-canvas-handoff";
import type { PreparedDirectorReference } from "@/services/director-downstream";
import { DirectorReferenceError, directorDownstreamOwner, directorOutputIds, materializeDirectorDownstreamGroups } from "@/lib/canvas/director/director-downstream";
import { useCanvasStore } from "@/stores/canvas/use-canvas-store";
import { getActiveUserScope } from "@/lib/user-scope";
import type { Asset } from "@/stores/use-asset-store";
import { CanvasNodeType, type CanvasConnection, type CanvasNodeData } from "@/types/canvas";

import { executeImageGeneration } from "./canvas-image-generation-executor";
import { executeAudioGeneration, executeVideoGeneration } from "./canvas-media-generation-executors";
import { executeTextGeneration } from "./canvas-text-generation-executor";

type UseCanvasGenerationExecutorOptions = {
    projectId: string;
    domainProjectId?: string;
    addedSkills: Skill[];
    assets: Asset[];
    nodesRef: { current: CanvasNodeData[] };
    connectionsRef: { current: CanvasConnection[] };
    setNodes: Dispatch<SetStateAction<CanvasNodeData[]>>;
    setConnections: Dispatch<SetStateAction<CanvasConnection[]>>;
    setSelectedNodeIds: Dispatch<SetStateAction<Set<string>>>;
    setSelectedConnectionId: Dispatch<SetStateAction<string | null>>;
    setDialogNodeId: Dispatch<SetStateAction<string | null>>;
    setRunningNodeId: Dispatch<SetStateAction<string | null>>;
    startGenerationRequest: (targetNodeId: string, originNodeId: string, runningId?: string, controller?: AbortController) => AbortController;
    finishGenerationRequest: (targetNodeId: string, controller: AbortController) => void;
    bindGenerationTask: (targetNodeId: string, task: GenerationTask) => void;
    applyGenerationTaskResult: (targetNodeId: string, task: GenerationTask) => Promise<void>;
    onRequireSignIn?: (proceed: () => Promise<void>) => void;
};

const NODE_STATUS_IDLE = "idle" as const;
const NODE_STATUS_LOADING = "loading" as const;
const NODE_STATUS_ERROR = "error" as const;

const loadDirectorDownstream = () => import("@/services/director-downstream");

export type CanvasNodeGenerationOptions = {
    confirmedVideoSettings?: ConfirmedStoryboardVideoSettings;
    controller?: AbortController;
    waitForTaskCapacity?: boolean;
    /** 后端并发名额已满、节点已重置为待生成时调用；批次调度据此把这一项放回等待队列。 */
    onCapacityWait?: () => void;
    context?: { conversationId?: string; messageId?: string; sourceCode?: import("@/types/asset-archive").AssetSourceCode };
    retryContext?: { retryOf: string; attemptGroupId: string; clientOperationId: string };
    onTaskUpdate?: (task: GenerationTask) => void;
    skipDuplicateConfirmation?: boolean;
};

type DirectorGenerationOptions = CanvasNodeGenerationOptions & { directorReference?: PreparedDirectorReference; onDirectorCompleted?: () => void; assertDirectorCurrent?: () => void };

export function useCanvasGenerationExecutor({
    projectId,
    domainProjectId,
    addedSkills,
    assets,
    nodesRef,
    connectionsRef,
    setNodes,
    setConnections,
    setSelectedNodeIds,
    setSelectedConnectionId,
    setDialogNodeId,
    setRunningNodeId,
    startGenerationRequest,
    finishGenerationRequest,
    bindGenerationTask,
    applyGenerationTaskResult,
    onRequireSignIn,
}: UseCanvasGenerationExecutorOptions) {
    const { message, modal } = App.useApp();
    const navigate = useNavigate();
    const { search } = useLocation();
    const signedIn = useUserStore((state) => Boolean(state.user?.id));
    const { t } = useI18n();
    const effectiveConfig = useEffectiveConfig();
    const isAiConfigReady = useConfigStore((state) => state.isAiConfigReady);
    const submissionLocksRef = useRef(new Map<string, Promise<unknown>>());
    const directorControllersRef = useRef(new Set<AbortController>());
    useEffect(
        () => () => {
            for (const controller of directorControllersRef.current) controller.abort();
            directorControllersRef.current.clear();
        },
        [projectId],
    );
    const confirmDuplicateSubmission = useCallback(
        () =>
            new Promise<boolean>((resolve) => {
                modal.confirm({
                    title: t("canvasRuntime.generation.duplicateTitle"),
                    content: t("canvasRuntime.generation.duplicateContent"),
                    okText: t("canvasRuntime.generation.continue"),
                    cancelText: t("canvasRuntime.generation.cancel"),
                    centered: true,
                    onOk: () => resolve(true),
                    onCancel: () => resolve(false),
                });
            }),
        [modal, t],
    );

    const generate = useCallback(
        (nodeId: string, mode: CanvasNodeGenerationMode, prompt: string, options?: DirectorGenerationOptions) =>
            runCanvasGenerationSubmissionOnce(
                submissionLocksRef.current,
                nodeId,
                async () => {
                    if (!signedIn) {
                        const proceedToLogin = async () => {
                            try {
                                const token = await stageGuestCanvasForSignIn(projectId);
                                navigate(guestCanvasLoginPath(token, search));
                            } catch (error) {
                                message.error(error instanceof Error ? error.message : t("canvasExtra.library.cloudSyncFailed"));
                            }
                        };
                        if (onRequireSignIn) {
                            onRequireSignIn(proceedToLogin);
                            return;
                        }
                        await proceedToLogin();
                        return;
                    }
                    const sourceNode = nodesRef.current.find((node) => node.id === nodeId);
                    if (isCanvasNodeGenerating(sourceNode)) {
                        message.info(t("canvasRuntime.generation.nodeRunning"));
                        return;
                    }
                    if (sourceNode?.type === CanvasNodeType.Video && sourceNode.metadata?.videoEditOperation === "concat") {
                        message.info(t("canvasRuntime.generation.concatRegenerate"));
                        return;
                    }
                    const resolveExecutionConfig = (requirements?: ModelRequirements) =>
                        options?.directorReference
                            ? options.directorReference.config
                            : mode === "video" && options?.confirmedVideoSettings
                              ? buildConfirmedStoryboardVideoConfig(effectiveConfig, sourceNode, options.confirmedVideoSettings, requirements)
                              : buildGenerationConfig(effectiveConfig, sourceNode, mode, requirements);
                    let generationConfig;
                    try {
                        generationConfig = resolveExecutionConfig();
                    } catch (error) {
                        message.error(generationErrorMessage(error));
                        throw error;
                    }
                    const hasLiveBatchChildren =
                        sourceNode?.type === CanvasNodeType.Image && (sourceNode.metadata?.batchChildIds || []).some((childId) => nodesRef.current.some((node) => node.id === childId && node.metadata?.batchRootId === sourceNode.id));
                    const hasStaleImageBatchState =
                        mode === "image" && sourceNode?.type === CanvasNodeType.Image && !sourceNode.metadata?.content && Boolean(sourceNode.metadata?.isBatchRoot || sourceNode.metadata?.batchChildIds?.length) && !hasLiveBatchChildren;
                    if (hasStaleImageBatchState) {
                        setNodes((current) =>
                            current.map((node) => {
                                if (node.id !== sourceNode.id) return node;
                                const metadata = { ...node.metadata };
                                delete metadata.isBatchRoot;
                                delete metadata.batchChildIds;
                                delete metadata.primaryImageId;
                                delete metadata.imageBatchExpanded;
                                delete metadata.batchUsesReferenceImages;
                                return { ...node, metadata };
                            }),
                        );
                    }
                    if (!isAiConfigReady(generationConfig, generationConfig.model)) {
                        if (options?.confirmedVideoSettings) throw new Error("已确认的视频模型配置不可用，请重新确认视频批次");
                        navigateToSettings({ continueCreation: true });
                        return;
                    }

                    const sourceTextContent = sourceNode?.type === CanvasNodeType.Text ? sourceNode.metadata?.content?.trim() || "" : "";
                    const editingTextNode = mode === "text" && Boolean(sourceTextContent);
                    let generationPrompt = mode === "image" && sourceNode?.metadata?.portraitTexture ? buildPortraitTexturePrompt(prompt, sourceNode.metadata.portraitTexture) : prompt;
                    if (mode === "audio") generationPrompt = stripCanvasAudioVoiceBindingLines(generationPrompt);
                    if (options?.directorReference) generationPrompt = [generationPrompt, options.directorReference.prompt].filter(Boolean).join("\n\n");
                    generationPrompt = appendCameraPrompt(generationPrompt, mode, sourceNode?.metadata?.cameraControl);
                    const isPreparingEmptyImage = mode === "image" && sourceNode?.type === CanvasNodeType.Image && !sourceNode.metadata?.content;

                    let rawGenerationContext: Awaited<ReturnType<typeof hydrateNodeGenerationContext>>;
                    let executionSourceNode = sourceNode;
                    let hasAudioSpeechPrompt = true;
                    // AutoDL/其他声明式视频协议需要结构化参考素材；只有普通
                    // 模型视频接口才把提示词视为纯文本输入。
                    const usesWorkflowProvider = Boolean(mode !== "text" && generationConfig.taskWorkflowProvider && generationConfig.taskWorkflowProvider !== "model");
                    // 普通视频协议只保留输入框文本（显式 @文本 引用仍会展开为真实内容）；声明式工作流还要保留连接媒体。
                    const promptOnly = mode === "video" && !usesWorkflowProvider;
                    try {
                        let activeAudioVoiceBindings: CanvasAudioVoiceBinding[] = [];
                        let audioMentionReferences = sourceNode && mode === "audio" ? buildNodeMentionReferences(sourceNode, nodesRef.current, connectionsRef.current) : [];
                        if (mode === "audio" && sourceNode) {
                            const normalizedBindings = normalizeCanvasAudioVoiceBindings(sourceNode.metadata?.audioVoiceBindings);
                            activeAudioVoiceBindings = filterActiveCanvasAudioVoiceBindings(normalizedBindings, audioMentionReferences);
                            if (sourceNode.metadata?.audioVoiceBindings?.length && activeAudioVoiceBindings.length !== normalizedBindings.length) {
                                const cleanedBindings = activeAudioVoiceBindings.length ? activeAudioVoiceBindings : undefined;
                                const targetId = sourceNode.id;
                                executionSourceNode = { ...sourceNode, metadata: { ...sourceNode.metadata, audioVoiceBindings: cleanedBindings } };
                                setNodes((current) => current.map((item) => (item.id === targetId ? { ...item, metadata: { ...item.metadata, audioVoiceBindings: cleanedBindings } } : item)));
                            }
                        }
                        const directorReference = options?.directorReference;
                        if (directorReference?.firstFrameNodeId && sourceNode) {
                            executionSourceNode = { ...sourceNode, metadata: { ...sourceNode.metadata, videoStartFrameNodeId: directorReference.firstFrameNodeId, videoEndFrameNodeId: undefined } };
                        }
                        const owner = nodesRef.current.find((node) => node.id === sourceNode?.metadata?.directorDownstream?.sourceNodeId);
                        const appearanceMentions =
                            directorReference?.appearances.flatMap((item) =>
                                item.referenceNodeId && nodesRef.current.some((node) => node.id === item.referenceNodeId) ? t("directorDownstream.appearance", { name: item.actorName, reference: `@[node:${item.referenceNodeId}]` }) : [],
                            ) || [];
                        let baseContext = buildNodeGenerationContext(
                            nodeId,
                            nodesRef.current,
                            connectionsRef.current,
                            editingTextNode ? buildTextRewritePrompt(sourceTextContent, prompt) : [generationPrompt, ...appearanceMentions].join("\n"),
                            assets,
                            promptOnly,
                            mode === "video" && !directorReference ? generationConfig : undefined,
                        );
                        if (mode === "audio" && !usesWorkflowProvider && effectiveAudioMode(generationConfig, generationConfig.model) === "unified_edit") {
                            baseContext = restoreConnectedAudioReferences(baseContext, buildNodeGenerationInputs(nodeId, nodesRef.current, connectionsRef.current), activeAudioVoiceBindings);
                        }
                        if (directorReference) {
                            const { applyDirectorDownstreamReference } = await loadDirectorDownstream();
                            baseContext = applyDirectorDownstreamReference(baseContext, directorReference, owner ? [owner.id, ...directorOutputIds(owner)] : []);
                        }
                        const requirements = generationModelRequirements(mode, baseContext, sourceNode, generationConfig, true);
                        if (mode === "video" && !guardVideoReferences(generationConfig, baseContext.referenceVideos, { ...videoReferenceActions(generationConfig, baseContext.referenceVideos, nodeId), requirements })) return;
                        generationConfig = resolveExecutionConfig(requirements);
                        const compatibilityError = usesWorkflowProvider ? "" : modelCompatibilityError(generationConfig, generationConfig.model, requirements);
                        if (compatibilityError) {
                            const audioValidationKey = matchAudioValidationMessageKey(compatibilityError);
                            throw Object.assign(new Error(audioValidationKey ? compatibilityError : t("canvasRuntime.generation.modelUnsupported", { details: compatibilityError })), audioValidationKey ? { code: "invalid_input" as const } : {});
                        }
                        const resolvedAudioMode = mode === "audio" ? effectiveAudioMode(generationConfig, generationConfig.model) : undefined;
                        const referenceLimits = usesWorkflowProvider ? undefined : modelGroupReferenceLimits(effectiveConfig, generationConfig.model, mode, requirements);
                        const hydrateInputContext = mode === "audio" && resolvedAudioMode === "unified_edit" ? { ...baseContext, characterReferences: [] } : baseContext;
                        rawGenerationContext = await hydrateNodeGenerationContext(hydrateInputContext, projectId, domainProjectId, mode, mode === "video" && Boolean(referenceLimits?.maxAudios), mode !== "audio" && !promptOnly, referenceLimits);
                        if (mode === "audio") {
                            rawGenerationContext = trimAudioGenerationContext(rawGenerationContext, resolvedAudioMode, usesWorkflowProvider);
                            hasAudioSpeechPrompt = Boolean(rawGenerationContext.prompt.trim());
                            if (!usesWorkflowProvider && resolvedAudioMode === "unified_edit" && sourceNode) {
                                audioMentionReferences = buildNodeMentionReferences(sourceNode, nodesRef.current, connectionsRef.current);
                                rawGenerationContext = {
                                    ...rawGenerationContext,
                                    prompt: resolveCompiledAudioVoiceBindingsPrompt(rawGenerationContext.prompt, activeAudioVoiceBindings, audioMentionReferences, rawGenerationContext.referenceAudios),
                                };
                            }
                        }
                        const hydratedRequirements = generationModelRequirements(mode, rawGenerationContext, sourceNode, generationConfig);
                        generationConfig = resolveExecutionConfig(hydratedRequirements);
                        const hydratedCompatibilityError = usesWorkflowProvider ? "" : modelCompatibilityError(generationConfig, generationConfig.model, hydratedRequirements);
                        if (hydratedCompatibilityError) {
                            const audioValidationKey = matchAudioValidationMessageKey(hydratedCompatibilityError);
                            throw Object.assign(
                                new Error(audioValidationKey ? hydratedCompatibilityError : t("canvasRuntime.generation.modelUnsupported", { details: hydratedCompatibilityError })),
                                audioValidationKey ? { code: "invalid_input" as const } : {},
                            );
                        }
                    } catch (error) {
                        message.error(error instanceof DirectorReferenceError ? error.message : localizedGenerationError(error, t));
                        if (options?.confirmedVideoSettings) throw error;
                        return;
                    }

                    let skillExecution: Awaited<ReturnType<typeof skillRuntime.prepare<"canvas">>>;
                    try {
                        skillExecution = await skillRuntime.prepare({ profile: "canvas", prompt: rawGenerationContext.prompt, skills: addedSkills });
                    } catch (error) {
                        message.error(error instanceof Error ? error.message : t("canvasRuntime.generation.skillLoadFailed"));
                        return;
                    }
                    let effectivePrompt = skillExecution.prompt.trim();
                    let styleMetadata = {};
                    if (mode === "image") {
                        try {
                            const styleRuntime = resolveCanvasStyleExecution(nodesRef.current, sourceNode, effectivePrompt, generationConfig, mode);
                            if (styleRuntime) {
                                effectivePrompt = styleRuntime.prompt;
                                styleMetadata = { styleProfileJson: styleRuntime.profileJson, styleExecutionPlan: styleRuntime.plan };
                            }
                        } catch (error) {
                            const errorDetails = generationErrorMessage(error);
                            message.error(localizedGenerationError(errorDetails, t));
                            return;
                        }
                    }
                    const displayPrompt = effectivePrompt;
                    if (mode !== "audio") {
                        try {
                            effectivePrompt = buildNodeGenerationEffectivePrompt(effectivePrompt, rawGenerationContext, nodeGenerationReferencePromptLimit(generationConfig, mode), prompt);
                        } catch (error) {
                            message.error(localizedGenerationError(error, t));
                            return;
                        }
                    }
                    const promptLengthError = mode === "video" ? modelPromptLengthError(generationConfig, generationConfig.model, mode, effectivePrompt) : "";
                    if (promptLengthError) {
                        message.error(promptLengthError);
                        return;
                    }
                    const generationContext = { ...rawGenerationContext, prompt: effectivePrompt };
                    options?.assertDirectorCurrent?.();
                    if (mode === "audio" && effectiveAudioMode(generationConfig, generationConfig.model) !== "unified_edit" && generationContext.characterReferences.length) {
                        if (generationContext.characterReferences.length !== 1) {
                            message.error(t("canvasRuntime.generation.voiceSingle"));
                            return;
                        }
                        const voice = generationContext.resolvedCharacterVoices[0];
                        if (!voice) {
                            message.error(t("canvasRuntime.generation.voiceMissing"));
                            return;
                        }
                        generationConfig = { ...generationConfig, audioVoice: voice.voiceKey, audioInstructions: [voice.instructions, generationConfig.audioInstructions].filter(Boolean).join("；") };
                    }
                    if ((!displayPrompt && (mode === "text" || mode === "audio")) || (mode === "audio" && !hasAudioSpeechPrompt)) {
                        return;
                    }

                    const requestFingerprint = canvasGenerationRequestFingerprint({
                        nodeId,
                        mode,
                        prompt: effectivePrompt,
                        model: generationConfig.model,
                        options: modelRequestOptions(generationConfig, mode),
                        workflow:
                            generationConfig.taskWorkflowProvider && generationConfig.taskWorkflowProvider !== "model"
                                ? {
                                      provider: generationConfig.taskWorkflowProvider,
                                      workflowId: generationConfig.runningHub.workflowId,
                                      workflowKind: generationConfig.runningHub.selectedKind,
                                      parameters: sourceNode?.metadata?.workflowParameters,
                                  }
                                : undefined,
                        operation: sourceNode?.metadata?.videoEditOperation,
                        audioInstructions: generationConfig.audioInstructions,
                        promptTemplateOperation: sourceNode?.metadata?.promptTemplateOperation,
                        promptTemplateVariables: sourceNode?.metadata?.promptTemplateVariables,
                        context: generationContext,
                    });
                    const duplicateConfirmationRequired = !options?.skipDuplicateConfirmation && !options?.retryContext && sourceNode?.metadata?.lastGenerationRequestFingerprint === requestFingerprint;
                    if (duplicateConfirmationRequired && !(await confirmDuplicateSubmission())) return;

                    setRunningNodeId(nodeId);
                    const controller = startGenerationRequest(nodeId, nodeId, nodeId, options?.controller);
                    if (controller.signal.aborted) {
                        finishGenerationRequest(nodeId, controller);
                        setRunningNodeId(null);
                        return;
                    }
                    if (isPreparingEmptyImage) {
                        setNodes((current) =>
                            current.map((node) =>
                                node.id === nodeId
                                    ? synchronizeGenerationSpec(node, {
                                          prompt,
                                          composerContent: prompt,
                                          status: NODE_STATUS_LOADING,
                                          taskStage: t("canvasRuntime.generation.preparingTask"),
                                          taskProgress: 0,
                                          taskCreatedAt: new Date().toISOString(),
                                          errorDetails: undefined,
                                          generationErrorCode: undefined,
                                          resourceReloadAvailable: undefined,
                                          failedPromptFingerprint: undefined,
                                      })
                                    : node,
                            ),
                        );
                    }

                    // 已有内容节点只是本次生成的来源；任务状态归新目标所有，不能覆盖已成功结果。
                    const markSourceStatus = !sourceNode?.metadata?.content && !editingTextNode;
                    const statusPrompt = sourceNode?.type === CanvasNodeType.Config ? displayPrompt : prompt;
                    if (markSourceStatus)
                        setNodes((current) =>
                            current.map((node) =>
                                node.id === nodeId
                                    ? synchronizeGenerationSpec(node, {
                                          ...canvasGenerationPromptMetadata(prompt, statusPrompt),
                                          status: NODE_STATUS_LOADING,
                                          errorDetails: undefined,
                                          generationErrorCode: undefined,
                                          resourceReloadAvailable: undefined,
                                          failedPromptFingerprint: undefined,
                                      })
                                    : node,
                            ),
                        );

                    let pendingNodeIds: string[] = [];
                    const execution = {
                        projectId,
                        nodeId,
                        sourceNode: executionSourceNode,
                        canvasNodes: nodesRef.current,
                        canvasConnections: connectionsRef.current,
                        prompt,
                        effectivePrompt,
                        displayPrompt,
                        generationConfig,
                        generationContext,
                        controller,
                        editingTextNode,
                        styleMetadata,
                        skillMetadata: skillExecution.metadata,
                        taskContext: { ...options?.context, ...(options?.directorReference ? { directorReferenceGroup: options.directorReference.group, directorAppearanceReferences: options.directorReference.appearances } : {}) },
                        retryContext: options?.retryContext,
                        waitForTaskCapacity: options?.waitForTaskCapacity,
                        setNodes,
                        setConnections,
                        setSelectedNodeIds,
                        setSelectedConnectionId,
                        setDialogNodeId,
                        startGenerationRequest,
                        finishGenerationRequest,
                        bindGenerationTask: (targetNodeId: string, task: GenerationTask) => {
                            bindGenerationTask(targetNodeId, task);
                            setNodes((current) => {
                                const source = current.find((node) => node.id === nodeId);
                                if (!source || source.metadata?.lastGenerationRequestFingerprint === requestFingerprint) return current;
                                return current.map((node) => (node.id === nodeId ? { ...node, metadata: { ...node.metadata, lastGenerationRequestFingerprint: requestFingerprint } } : node));
                            });
                            options?.onTaskUpdate?.(task);
                        },
                        applyGenerationTaskResult,
                        showError: (content: string) => message.error(content),
                        registerPendingNodeIds: (nodeIds: string[]) => {
                            pendingNodeIds = nodeIds;
                        },
                    };

                    try {
                        if (mode === "image") await executeImageGeneration(execution);
                        else if (mode === "video") await executeVideoGeneration(execution);
                        else if (mode === "audio") await executeAudioGeneration(execution);
                        else await executeTextGeneration(execution);
                        options?.onDirectorCompleted?.();
                    } catch (error) {
                        if (isGenerationCanceled(error)) return;
                        const failure = generationFailureMetadata(error, prompt);
                        if (options?.waitForTaskCapacity && isGenerationTaskCapacityError(error)) {
                            setNodes((current) =>
                                current.map((node) => {
                                    if (node.id !== nodeId && !pendingNodeIds.includes(node.id)) return node;
                                    const metadata = { ...(node.metadata || {}), status: NODE_STATUS_IDLE, errorDetails: undefined };
                                    delete metadata.taskId;
                                    delete metadata.taskStatus;
                                    delete metadata.taskProgress;
                                    delete metadata.taskStage;
                                    delete metadata.taskCreatedAt;
                                    delete metadata.taskUpdatedAt;
                                    delete metadata.taskStartedAt;
                                    delete metadata.taskCompletedAt;
                                    delete metadata.taskDurationMs;
                                    return { ...node, metadata };
                                }),
                            );
                            // 告诉批次调度器这是“等待并发名额”，应回到等待队列，而不是提交失败。
                            options.onCapacityWait?.();
                            return;
                        }
                        message.error(failure.errorDetails);
                        setNodes((current) =>
                            current.map((node) => (node.id === nodeId || pendingNodeIds.includes(node.id) ? (node.id === nodeId && !markSourceStatus ? node : { ...node, metadata: { ...node.metadata, status: NODE_STATUS_ERROR, ...failure } }) : node)),
                        );
                    } finally {
                        finishGenerationRequest(nodeId, controller);
                        setRunningNodeId(null);
                    }
                },
                () => {
                    if (!signedIn) return;
                    message.info({ key: `canvas-generation-submission-${nodeId}`, content: t("canvasRuntime.generation.submissionInProgress") });
                },
            ),
        [
            addedSkills,
            applyGenerationTaskResult,
            bindGenerationTask,
            confirmDuplicateSubmission,
            domainProjectId,
            effectiveConfig,
            finishGenerationRequest,
            isAiConfigReady,
            message,
            navigate,
            nodesRef,
            connectionsRef,
            projectId,
            setConnections,
            setDialogNodeId,
            setNodes,
            setRunningNodeId,
            setSelectedConnectionId,
            setSelectedNodeIds,
            startGenerationRequest,
            signedIn,
            search,
            t,
        ],
    );

    return useCallback(
        (nodeId: string, mode: CanvasNodeGenerationMode, prompt: string, options?: CanvasNodeGenerationOptions) => {
            const target = nodesRef.current.find((node) => node.id === nodeId);
            const binding = target?.metadata?.directorDownstream;
            if (mode !== "video" || !target || !signedIn) return generate(nodeId, mode, prompt, options);
            let owner;
            try {
                owner = directorDownstreamOwner(target, nodesRef.current, connectionsRef.current);
            } catch (error) {
                message.error(localizedGenerationError(error, t));
                return Promise.reject(error);
            }
            if (!owner) return generate(nodeId, mode, prompt, options);
            return runCanvasGenerationSubmissionOnce(submissionLocksRef.current, `director:${nodeId}`, async () => {
                const project = useCanvasStore.getState().projects.find((item) => item.id === projectId);
                const scene = project?.directorScenes?.find((item) => item.id === owner.metadata?.directorSceneId);
                if (!scene) {
                    message.error(t("directorDownstream.changed"));
                    return;
                }
                if (scene.previs && !scene.worldEngine && !selectDirectorPrevisV2(useUserStore.getState())) return generate(nodeId, mode, prompt, options);
                const scope = getActiveUserScope();
                const snapshot = JSON.stringify(scene);
                const assertCurrent = () => {
                    const live = useCanvasStore.getState().projects.find((item) => item.id === projectId);
                    if (getActiveUserScope() !== scope || JSON.stringify(live?.directorScenes?.find((item) => item.id === scene.id)) !== snapshot || !nodesRef.current.some((node) => node.id === target.id && !node.metadata?.locked))
                        throw new Error(t("directorDownstream.changed"));
                };
                const controller = options?.controller ?? new AbortController();
                directorControllersRef.current.add(controller);
                try {
                    if (target.metadata?.locked || isCanvasNodeGenerating(target)) return;
                    const config = options?.confirmedVideoSettings ? buildConfirmedStoryboardVideoConfig(effectiveConfig, target, options.confirmedVideoSettings) : buildGenerationConfig(effectiveConfig, target, "video");
                    const { prepareDirectorDownstreamReferences } = await loadDirectorDownstream();
                    controller.signal.throwIfAborted();
                    assertCurrent();
                    const prepared = await prepareDirectorDownstreamReferences({
                        scene,
                        shotId: binding?.shotId || owner.metadata?.directorShotId,
                        recording: owner.metadata?.directorWorldRecording,
                        firstFrameNodeId: target.metadata?.videoStartFrameNodeId,
                        config,
                        segmentIds: binding?.segmentIds,
                        signal: controller.signal,
                        assertCurrent,
                        onDiagnostic: (content) => message.info(content),
                    });
                    assertCurrent();
                    const materialized = materializeDirectorDownstreamGroups(
                        nodesRef.current,
                        connectionsRef.current,
                        nodeId,
                        owner.id,
                        prepared.map((item) => item.group),
                    );
                    nodesRef.current = materialized.nodes;
                    connectionsRef.current = materialized.connections;
                    setNodes(materialized.nodes);
                    setConnections(materialized.connections);
                    for (const [index, reference] of prepared.entries()) {
                        controller.signal.throwIfAborted();
                        assertCurrent();
                        let completed = false;
                        await generate(materialized.targets[index].id, mode, prompt, {
                            ...options,
                            controller,
                            directorReference: reference,
                            assertDirectorCurrent: assertCurrent,
                            onDirectorCompleted: () => {
                                completed = true;
                            },
                        });
                        if (!completed) break;
                    }
                } catch (error) {
                    if (isGenerationCanceled(error)) return;
                    message.error(error instanceof DirectorReferenceError ? error.message : localizedGenerationError(error, t));
                    if (options?.confirmedVideoSettings) throw error;
                } finally {
                    directorControllersRef.current.delete(controller);
                }
            });
        },
        [generate, nodesRef, connectionsRef, projectId, signedIn, effectiveConfig, message, t, setNodes, setConnections],
    );
}

function generationModelRequirements(
    mode: CanvasNodeGenerationMode,
    input: Pick<Awaited<ReturnType<typeof hydrateNodeGenerationContext>>, "textCount" | "imageCount" | "videoCount" | "audioCount" | "characterReferences">,
    sourceNode: CanvasNodeData | undefined,
    config: ReturnType<typeof useEffectiveConfig>,
    includeCharacterMinimum = false,
): ModelRequirements {
    return {
        capability: mode,
        input: {
            textCount: input.textCount,
            imageCount: input.imageCount,
            videoCount: input.videoCount,
            audioCount: input.audioCount,
            characterCount: includeCharacterMinimum ? input.characterReferences.length : 0,
        },
        videoOperation: sourceNode?.metadata?.videoEditOperation,
        videoSeconds: config.videoSeconds,
        options: config.taskWorkflowProvider === "model" ? modelRequestOptions(config, mode) : undefined,
    };
}
