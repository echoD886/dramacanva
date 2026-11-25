import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { lastCanvasImageSettings } from "@/lib/canvas/canvas-image-defaults";
import { App } from "antd";
import { confirmedStoryboardVideoSettings, storyboardVideoModelChoices, storyboardVideoBatchSnapshot, type ConfirmedStoryboardVideoSettings } from "@/lib/canvas/storyboard-video-confirmation";
import { useI18n } from "@/i18n/use-i18n";
import { invalidateEditedPromptVariables } from "@/lib/canvas/canvas-storyboard-edit";
import { localizedGenerationError } from "@/i18n/generation-error";
import { nanoid } from "nanoid";

import { NODE_DEFAULT_SIZE } from "@/constant/canvas";
import { findAvailableGenerationGroupPosition } from "@/lib/canvas/canvas-generation-layout";
import { storyboardDirectorReferences, storyboardVideoSettings, storyboardVideoRequirements, storyboardVideoScript } from "@/lib/canvas/canvas-storyboard-video";
import { synchronizeGenerationSpec } from "@/lib/canvas/generation-contract";
import { backendProviderConfig, buildGenerationConfig, generationTaskMetadata, resetGenerationTaskMetadata, logicalModelIDForConfig } from "@/lib/canvas/canvas-project-generation";
import { cinematicStoryboardColumns, createCanvasNode, createStoryboardRow, expandStoryboardTextMentions, storyboardRowsFromTask, storyboardPromptTemplateMetadata } from "@/lib/canvas/canvas-project-domain";
import { buildNodeMentionReferences } from "@/lib/canvas/canvas-resource-references";
import { buildStoryboardAssetCatalog } from "@/lib/canvas/canvas-storyboard-assets";
import { resolveStoryboardGenerationContext } from "@/lib/canvas/canvas-storyboard-context";
import { reconcileStoryboardTargetConnections, storyboardComposerContent, storyboardRowReferenceNodeIds } from "@/lib/canvas/canvas-storyboard-materializer";
import { generationErrorMessage, generationFailureMetadata } from "@/lib/generation-error";
import { navigateToSettings } from "@/lib/settings-navigation";
import type { Skill } from "@/services/api/skills";
import { waitForGenerationTask } from "@/services/api/task-center";
import { skillRuntime } from "@/services/skill-runtime";
import { submitStoryboardTask } from "@/services/storyboard-submission";
import { getActiveUserScope } from "@/lib/user-scope";
import { requireCanvasGenerationAccount } from "@/services/guest-canvas-handoff";
import { modelDisplayName, useConfigStore, useEffectiveConfig } from "@/stores/use-config-store";
import { CanvasNodeType, type CanvasConnection, type CanvasGenerationBatchMode, type CanvasNodeData, type StoryboardRow } from "@/types/canvas";

type UseCanvasStoryboardOptions = {
    projectId: string;
    projectAspectRatio?: string;
    addedSkills: Skill[];
    nodesRef: { current: CanvasNodeData[] };
    connectionsRef: { current: CanvasConnection[] };
    setNodes: Dispatch<SetStateAction<CanvasNodeData[]>>;
    setConnections: Dispatch<SetStateAction<CanvasConnection[]>>;
    setSelectedNodeIds: Dispatch<SetStateAction<Set<string>>>;
    enqueueGenerationBatch: (sourceNodeId: string, mode: CanvasGenerationBatchMode, targets: Array<{ rowId: string; nodeId: string; confirmedVideoSettings?: ConfirmedStoryboardVideoSettings }>) => string | undefined;
    /** 缺少项目画风时打开画风选择，而不是只闪一条 3 秒的提示。 */
    onStyleRequired?: () => void;
};

const NODE_STATUS_IDLE = "idle" as const;
const NODE_STATUS_LOADING = "loading" as const;
const NODE_STATUS_SUCCESS = "success" as const;
const NODE_STATUS_ERROR = "error" as const;

export function useCanvasStoryboard({ projectId, projectAspectRatio, addedSkills, nodesRef, connectionsRef, setNodes, setConnections, setSelectedNodeIds, enqueueGenerationBatch, onStyleRequired }: UseCanvasStoryboardOptions) {
    const { message } = App.useApp();
    const { t } = useI18n();
    const effectiveConfig = useEffectiveConfig();
    const isAiConfigReady = useConfigStore((state) => state.isAiConfigReady);
    const storyboardRequests = useRef(new Set<string>());
    const storyboardLifetime = useRef(new AbortController());
    useEffect(() => {
        const controller = new AbortController();
        storyboardLifetime.current = controller;
        return () => controller.abort();
    }, [projectId]);

    const updateScriptRows = useCallback(
        (nodeId: string, updater: (rows: StoryboardRow[]) => StoryboardRow[]) => {
            setNodes((current) =>
                current.map((node) =>
                    node.id === nodeId
                        ? {
                              ...node,
                              metadata: {
                                  ...node.metadata,
                                  storyboard: {
                                      rows: updater(node.metadata?.storyboard?.rows || []),
                                      visibleColumns: node.metadata?.storyboard?.visibleColumns || ["shotNumber", "durationSeconds", "videoMotionPrompt", "dialogue", "assets"],
                                      referenceNodeIds: node.metadata?.storyboard?.referenceNodeIds || [],
                                  },
                              },
                          }
                        : node,
                ),
            );
        },
        [setNodes],
    );

    const replaceScriptRows = useCallback(
        (nodeId: string, rows: StoryboardRow[]) => {
            const rowIds = new Set(rows.map((row) => `row:${row.id}`));
            const storyboardRowIds = new Set(rows.map((row) => row.id));
            const previousRows = new Map((nodesRef.current.find((node) => node.id === nodeId)?.metadata?.storyboard?.rows || []).map((row) => [row.id, row]));
            const nextRows = rows.map((row) => invalidateEditedPromptVariables(previousRows.get(row.id), row));
            setConnections((current) =>
                current
                    .filter((connection) => (connection.fromNodeId !== nodeId && connection.toNodeId !== nodeId) || !connection.storyboardRowId || storyboardRowIds.has(connection.storyboardRowId))
                    .filter((connection) => connection.fromNodeId !== nodeId || !connection.fromHandleId?.startsWith("row:") || rowIds.has(connection.fromHandleId))
                    .filter((connection) => connection.toNodeId !== nodeId || !connection.toHandleId?.startsWith("row:") || rowIds.has(connection.toHandleId)),
            );
            updateScriptRows(nodeId, () => nextRows);
        },
        [nodesRef, setConnections, updateScriptRows],
    );

    const addScriptRow = useCallback(
        (nodeId: string) => {
            updateScriptRows(nodeId, (rows) => [...rows, createStoryboardRow(rows.length + 1)]);
        },
        [updateScriptRows],
    );

    const updateScriptRow = useCallback(
        (nodeId: string, rowId: string, patch: Partial<StoryboardRow>) => {
            updateScriptRows(nodeId, (rows) => rows.map((row) => (row.id === rowId ? invalidateEditedPromptVariables(row, { ...row, ...patch }) : row)));
        },
        [updateScriptRows],
    );

    const removeScriptRow = useCallback(
        (nodeId: string, rowId: string) => {
            const node = nodesRef.current.find((item) => item.id === nodeId);
            const rows = (node?.metadata?.storyboard?.rows || []).filter((row) => row.id !== rowId).map((row, index) => ({ ...row, shotNumber: index + 1 }));
            replaceScriptRows(nodeId, rows);
        },
        [nodesRef, replaceScriptRows],
    );

    const generateScriptRows = useCallback(
        async (nodeId: string, prompt: string, callerSignal?: AbortSignal) => {
            const scriptNode = nodesRef.current.find((node) => node.id === nodeId && node.type === CanvasNodeType.Script);
            if (!scriptNode || !prompt.trim()) return;
            try {
                if (!(await requireCanvasGenerationAccount(projectId))) return;
            } catch (error) {
                message.error(error instanceof Error ? error.message : t("miscPages.guestPrepareFailed"));
                return;
            }
            if (storyboardRequests.current.has(nodeId) || scriptNode.metadata?.status === NODE_STATUS_LOADING) {
                message.warning(t("canvasExtra.storyboard.processing"));
                return false;
            }
            const lifetimeSignal = storyboardLifetime.current.signal;
            const signal = callerSignal ? AbortSignal.any([lifetimeSignal, callerSignal]) : lifetimeSignal;
            const scope = getActiveUserScope();
            const originalRows = JSON.stringify(scriptNode.metadata?.storyboard?.rows || []);
            const assertCurrent = () => {
                signal.throwIfAborted();
                const current = nodesRef.current.find((node) => node.id === nodeId);
                if (getActiveUserScope() !== scope || !current || JSON.stringify(current.metadata?.storyboard?.rows || []) !== originalRows) throw new Error(t("canvasExtra.storyboard.contextChanged"));
            };
            let storyboardContext: ReturnType<typeof resolveStoryboardGenerationContext>;
            try {
                storyboardContext = resolveStoryboardGenerationContext(nodesRef.current);
            } catch (error) {
                message.warning(error instanceof Error ? error.message : t("canvasExtra.storyboard.contextIncomplete"));
                if (error instanceof Error && error.message === t("canvasExtra.storyboardContext.styleRequired")) onStyleRequired?.();
                return;
            }
            const shotDuration = scriptNode.metadata?.storyboardShotDuration || "auto";
            const shotDurationSeconds = shotDuration === "auto" ? 0 : Number(shotDuration);
            const shotCount = scriptNode.metadata?.storyboardShotCount || "auto";
            const requestedShotCount = shotCount === "auto" ? 0 : Number(shotCount);
            const expandedPrompt = expandStoryboardTextMentions(prompt, buildNodeMentionReferences(scriptNode, nodesRef.current, connectionsRef.current));
            const generationConfig = buildGenerationConfig(effectiveConfig, scriptNode, "text");
            if (!isAiConfigReady(generationConfig, generationConfig.model)) {
                navigateToSettings({ continueCreation: true });
                return;
            }
            storyboardRequests.current.add(nodeId);
            try {
                const skillExecution = await skillRuntime.prepare({
                    profile: "shortDrama",
                    prompt: expandedPrompt,
                    skills: addedSkills,
                });
                assertCurrent();
                setNodes((current) =>
                    current.map((node) =>
                        node.id === nodeId
                            ? { ...node, metadata: { ...node.metadata, composerContent: prompt, status: NODE_STATUS_LOADING, taskStage: t("canvasExtra.storyboard.creatingTask"), taskProgress: 0, errorDetails: undefined, ...skillExecution.metadata } }
                            : node,
                    ),
                );
                assertCurrent();
                const request = {
                    projectId,
                    // 必须走后端分镜流水线（agent_storyboard_rows）：由服务端拼装含画风、角色、素材和 JSON 契约的规划提示词，
                    // 并校验、修复模型输出。canvas_text 只会把用户一句话原样发给模型，返回散文而不是镜头行。
                    type: "agent_storyboard_rows",
                    operation: "storyboard",
                    prompt: skillExecution.prompt,
                    model: generationConfig.model,
                    ...(logicalModelIDForConfig(generationConfig) ? { logicalModelId: logicalModelIDForConfig(generationConfig) } : {}),
                    input: {
                        mode: "text",
                        prompt: skillExecution.prompt,
                        canvasAssets: buildStoryboardAssetCatalog(nodesRef.current),
                        requirements: `输出可直接编辑并用于批量生成图片和视频的分镜表。\n用户要求：${prompt}`,
                        projectStyle: storyboardContext.projectStyle,
                        characters: storyboardContext.characters,
                        shotDurationSeconds,
                        shotCount: requestedShotCount,
                        config: backendProviderConfig(generationConfig, "text"),
                        metadata: { nodeId, ...skillExecution.metadata },
                    },
                };
                const task = await submitStoryboardTask(request, { signal, assertCurrent });
                if (!task) {
                    if (!signal.aborted && scope === getActiveUserScope())
                        setNodes((current) => current.map((node) => (node.id === nodeId ? { ...node, metadata: { ...node.metadata, status: scriptNode.metadata?.status || NODE_STATUS_IDLE, taskStage: undefined } } : node)));
                    return false;
                }
                assertCurrent();
                setNodes((current) => current.map((node) => (node.id === nodeId ? { ...node, metadata: { ...node.metadata, ...generationTaskMetadata(task), status: NODE_STATUS_LOADING } } : node)));
                const completed = await waitForGenerationTask(task.id, {
                    initialTask: task,
                    signal,
                    useTextEvents: true,
                    onTaskUpdate: (next) => {
                        if (!signal.aborted && scope === getActiveUserScope())
                            setNodes((current) => current.map((node) => (node.id === nodeId ? { ...node, metadata: { ...node.metadata, ...generationTaskMetadata(next), status: NODE_STATUS_LOADING } } : node)));
                    },
                });
                const result = storyboardRowsFromTask(completed);
                assertCurrent();
                replaceScriptRows(nodeId, result.rows);
                setNodes((current) =>
                    current.map((node) =>
                        node.id === nodeId
                            ? {
                                  ...node,
                                  title: result.title || node.title,
                                  metadata: {
                                      ...node.metadata,
                                      status: NODE_STATUS_SUCCESS,
                                      errorDetails: undefined,
                                      ...generationTaskMetadata(completed),
                                      storyboard: {
                                          rows: result.rows,
                                          visibleColumns: cinematicStoryboardColumns(node.metadata?.storyboard?.visibleColumns),
                                          referenceNodeIds: node.metadata?.storyboard?.referenceNodeIds || [],
                                      },
                                  },
                              }
                            : node,
                    ),
                );
                message.success(t("canvasExtra.storyboard.rowsGenerated", { count: result.rows.length }));
                return true;
            } catch (error) {
                if (signal.aborted || scope !== getActiveUserScope()) return false;
                setNodes((current) => current.map((node) => (node.id === nodeId ? { ...node, metadata: { ...node.metadata, status: NODE_STATUS_ERROR, ...generationFailureMetadata(error, node.metadata?.prompt || "") } } : node)));
                message.error(localizedGenerationError(error, t));
                return false;
            } finally {
                if (signal.aborted && !lifetimeSignal.aborted && scope === getActiveUserScope())
                    setNodes((current) =>
                        current.map((node) => {
                            if (node.id !== nodeId) return node;
                            const active = node.metadata?.taskStatus === "queued" || node.metadata?.taskStatus === "running";
                            return { ...node, metadata: { ...node.metadata, status: active ? NODE_STATUS_LOADING : NODE_STATUS_IDLE, taskStage: active ? t("canvasExtra.storyboard.waitingForTask") : undefined } };
                        }),
                    );
                storyboardRequests.current.delete(nodeId);
            }
        },
        [addedSkills, connectionsRef, effectiveConfig, isAiConfigReady, message, nodesRef, onStyleRequired, projectId, replaceScriptRows, setNodes, t],
    );

    const ensureScriptImageNodes = useCallback(
        (nodeId: string, rowIds: string[]) => {
            const scriptNode = nodesRef.current.find((node) => node.id === nodeId && node.type === CanvasNodeType.Script);
            const rows = (scriptNode?.metadata?.storyboard?.rows || []).filter((row) => rowIds.includes(row.id));
            if (!scriptNode || !rows.length) return [];
            const imageSpec = NODE_DEFAULT_SIZE[CanvasNodeType.Image];
            const startX = scriptNode.position.x + scriptNode.width + 120;
            const nextNodes = [...nodesRef.current];
            let nextConnections = [...connectionsRef.current];
            const targets: Array<{ row: StoryboardRow; node: CanvasNodeData; prompt: string }> = [];
            rows.forEach((row, index) => {
                const prompt = (row.imageGenerationPrompt || row.plotDescription).trim();
                const existing = row.imageNodeId ? nextNodes.find((node) => node.id === row.imageNodeId && node.type === CanvasNodeType.Image) : undefined;
                const existingMetadata = existing?.metadata?.content ? existing.metadata : resetGenerationTaskMetadata(existing?.metadata);
                const referenceIds = storyboardRowReferenceNodeIds(scriptNode, row, nextNodes, nextConnections, false, existing?.id);
                const composerContent = storyboardComposerContent(prompt, referenceIds, nextNodes);
                const imageNode = existing
                    ? {
                          ...existing,
                          metadata: {
                              ...existingMetadata,
                              prompt,
                              composerContent,
                              ...storyboardPromptTemplateMetadata(row, "image"),
                              workflowKind: "shot" as const,
                              workflowTitle: t("canvasExtra.storyboard.shotImageWorkflowTitle", { shot: row.shotNumber }),
                              shotIndex: row.shotNumber,
                          },
                      }
                    : createCanvasNode(
                          CanvasNodeType.Image,
                          { x: startX + imageSpec.width / 2, y: scriptNode.position.y + index * (imageSpec.height + 36) + imageSpec.height / 2 },
                          {
                              ...lastCanvasImageSettings(nodesRef.current),
                              prompt,
                              composerContent,
                              ...storyboardPromptTemplateMetadata(row, "image"),
                              workflowKind: "shot",
                              workflowTitle: t("canvasExtra.storyboard.shotImageWorkflowTitle", { shot: row.shotNumber }),
                              shotIndex: row.shotNumber,
                              status: NODE_STATUS_IDLE,
                          },
                      );
                if (!existing) {
                    imageNode.position = findAvailableGenerationGroupPosition(nextNodes, imageNode.position, imageNode);
                    imageNode.title = t("canvasExtra.storyboard.imageNodeTitle", { shot: row.shotNumber });
                    nextNodes.push(imageNode);
                } else {
                    const existingIndex = nextNodes.findIndex((node) => node.id === existing.id);
                    nextNodes[existingIndex] = imageNode;
                }
                nextConnections = reconcileStoryboardTargetConnections(nextConnections, scriptNode, row, imageNode.id, referenceIds);
                targets.push({ row, node: imageNode, prompt });
            });
            const imageNodeByRowId = new Map(targets.map((target) => [target.row.id, target.node.id]));
            const scriptIndex = nextNodes.findIndex((node) => node.id === scriptNode.id);
            nextNodes[scriptIndex] = {
                ...scriptNode,
                metadata: {
                    ...scriptNode.metadata,
                    storyboard: {
                        rows: (scriptNode.metadata?.storyboard?.rows || []).map((row) => ({ ...row, imageNodeId: imageNodeByRowId.get(row.id) || row.imageNodeId })),
                        visibleColumns: scriptNode.metadata?.storyboard?.visibleColumns || ["shotNumber", "durationSeconds", "videoMotionPrompt", "dialogue", "assets"],
                        referenceNodeIds: scriptNode.metadata?.storyboard?.referenceNodeIds || [],
                    },
                },
            };
            nodesRef.current = nextNodes;
            connectionsRef.current = nextConnections;
            setNodes(nextNodes);
            setConnections(nextConnections);
            return targets;
        },
        [connectionsRef, nodesRef, setConnections, setNodes, t],
    );

    const createScriptImageNodes = useCallback(
        (nodeId: string, rowIds?: string[]) => {
            const scriptNode = nodesRef.current.find((node) => node.id === nodeId && node.type === CanvasNodeType.Script);
            const rows = scriptNode?.metadata?.storyboard?.rows || [];
            const selectedRows = rowIds?.length ? rows.filter((row) => rowIds.includes(row.id)) : rows;
            if (!scriptNode || !selectedRows.length) return;
            const missing = selectedRows.filter((row) => !(row.imageGenerationPrompt || row.plotDescription).trim());
            if (missing.length) return message.warning(t("canvasExtra.storyboard.missingDescription", { count: missing.length }));
            const createdCount = selectedRows.filter((row) => !row.imageNodeId || !nodesRef.current.some((node) => node.id === row.imageNodeId && node.type === CanvasNodeType.Image)).length;
            ensureScriptImageNodes(
                nodeId,
                selectedRows.map((row) => row.id),
            );
            message.success(createdCount ? t("canvasExtra.storyboard.imageNodesCreated", { count: createdCount }) : t("canvasExtra.storyboard.imageNodesSynced"));
        },
        [ensureScriptImageNodes, message, nodesRef, t],
    );

    const generateScriptImages = useCallback(
        async (nodeId: string, rowIds: string[]) => {
            const scriptNode = nodesRef.current.find((node) => node.id === nodeId && node.type === CanvasNodeType.Script);
            const rows = (scriptNode?.metadata?.storyboard?.rows || []).filter((row) => rowIds.includes(row.id));
            if (!scriptNode || !rows.length) return;
            try {
                if (!(await requireCanvasGenerationAccount(projectId))) return;
            } catch (error) {
                message.error(error instanceof Error ? error.message : t("miscPages.guestPrepareFailed"));
                return;
            }
            const missing = rows.filter((row) => !(row.imageGenerationPrompt || row.plotDescription).trim());
            if (missing.length) return message.warning(t("canvasExtra.storyboard.missingDescription", { count: missing.length }));
            const imageModel = effectiveConfig.imageModel || effectiveConfig.model;
            if (!isAiConfigReady(effectiveConfig, imageModel)) {
                navigateToSettings({ continueCreation: true });
                return;
            }
            const activeNodeIds = activeGenerationBatchNodeIds(scriptNode, "storyboard_image");
            const targetRows = rows.filter((row) => {
                const imageNode = row.imageNodeId ? nodesRef.current.find((node) => node.id === row.imageNodeId && node.type === CanvasNodeType.Image) : undefined;
                return !imageNode?.metadata?.content && (!imageNode || !activeNodeIds.has(imageNode.id));
            });
            if (!targetRows.length) return message.info(t("canvasExtra.storyboard.imagesGeneratedOrRunning"));
            const targets = ensureScriptImageNodes(
                nodeId,
                targetRows.map((row) => row.id),
            );
            if (
                enqueueGenerationBatch(
                    nodeId,
                    "storyboard_image",
                    targets.map((target) => ({ rowId: target.row.id, nodeId: target.node.id })),
                )
            )
                message.success(t("canvasExtra.storyboard.imagesQueued"));
        },
        [effectiveConfig, enqueueGenerationBatch, ensureScriptImageNodes, isAiConfigReady, message, nodesRef, projectId, t],
    );

    const createScriptVideoNodes = useCallback(
        (nodeId: string, silent = false, rowIds?: string[], plannedSettings?: Map<string, ReturnType<typeof storyboardVideoSettings>>) => {
            const scriptNode = nodesRef.current.find((node) => node.id === nodeId && node.type === CanvasNodeType.Script);
            const allRows = scriptNode?.metadata?.storyboard?.rows || [];
            const rows = rowIds?.length ? allRows.filter((row) => rowIds.includes(row.id)) : allRows;
            if (!scriptNode || !rows.length) return;
            let resolvedSettings = plannedSettings;
            if (!resolvedSettings) {
                try {
                    resolvedSettings = new Map(
                        rows.map((row) => {
                            const existing = nodesRef.current.find((node) => node.id === row.videoNodeId && node.type === CanvasNodeType.Video);
                            const ids = storyboardRowReferenceNodeIds(scriptNode, row, nodesRef.current, connectionsRef.current, false, existing?.id);
                            return [
                                row.id,
                                storyboardVideoSettings(
                                    effectiveConfig,
                                    storyboardVideoScript(scriptNode, nodesRef.current, connectionsRef.current, projectAspectRatio || effectiveConfig.size),
                                    nodesRef.current.filter((node) => ids.includes(node.id)),
                                    row.durationSeconds,
                                    existing,
                                    projectAspectRatio,
                                ),
                            ];
                        }),
                    );
                } catch (error) {
                    message.error(generationErrorMessage(error));
                    return;
                }
            }
            const videoSpec = NODE_DEFAULT_SIZE[CanvasNodeType.Video];
            const startLeft = scriptNode.position.x + scriptNode.width + 120;
            const nextNodes = [...nodesRef.current];
            let nextConnections = [...connectionsRef.current];
            const videoNodeByRowId = new Map<string, string>();
            let createdCount = 0;
            rows.forEach((row, index) => {
                const prompt = (row.videoMotionPrompt || row.plotDescription).trim();
                const existingIndex = row.videoNodeId ? nextNodes.findIndex((node) => node.id === row.videoNodeId && node.type === CanvasNodeType.Video) : -1;
                const existing = existingIndex >= 0 ? nextNodes[existingIndex] : undefined;
                const referenceIds = storyboardRowReferenceNodeIds(scriptNode, row, nextNodes, nextConnections, false, existing?.id);
                const composerContent = storyboardComposerContent(prompt, referenceIds, nextNodes);
                const videoSettings = resolvedSettings!.get(row.id)!;
                const videoModel = videoSettings.model;
                if (existingIndex >= 0) {
                    const existing = nextNodes[existingIndex];
                    const existingMetadata = existing.metadata?.content ? existing.metadata : resetGenerationTaskMetadata(existing.metadata);
                    nextNodes[existingIndex] = {
                        ...existing,
                        metadata: {
                            ...existingMetadata,
                            prompt,
                            composerContent,
                            ...videoSettings,
                            ...storyboardPromptTemplateMetadata(row, "video"),
                            shotIndex: row.shotNumber,
                            workflowKind: "shot",
                            workflowTitle: t("canvasExtra.storyboard.shotVideoWorkflowTitle", { shot: row.shotNumber }),
                            generationMode: "video",
                            videoEditOperation: existing.metadata?.videoEditOperation || "text_to_video",
                        },
                    };
                    nextNodes[existingIndex] = synchronizeGenerationSpec(nextNodes[existingIndex], { ...videoSettings, prompt, composerContent });
                    nextConnections = reconcileStoryboardTargetConnections(nextConnections, scriptNode, row, existing.id, referenceIds);
                    videoNodeByRowId.set(row.id, existing.id);
                    return;
                }
                const videoNode = createCanvasNode(
                    CanvasNodeType.Video,
                    { x: startLeft + videoSpec.width / 2, y: scriptNode.position.y + index * (videoSpec.height + 36) + videoSpec.height / 2 },
                    {
                        prompt,
                        composerContent,
                        model: videoModel,
                        ...storyboardPromptTemplateMetadata(row, "video"),
                        workflowKind: "shot",
                        workflowTitle: t("canvasExtra.storyboard.shotVideoWorkflowTitle", { shot: row.shotNumber }),
                        shotIndex: row.shotNumber,
                        generationMode: "video",
                        videoEditOperation: "text_to_video",
                        status: NODE_STATUS_IDLE,
                        seconds: String(row.durationSeconds),
                    },
                );
                videoNode.title = t("canvasExtra.storyboard.videoNodeTitle", { shot: row.shotNumber });
                videoNode.metadata = synchronizeGenerationSpec(videoNode, { ...videoSettings, prompt, composerContent }).metadata;
                videoNode.position = findAvailableGenerationGroupPosition(nextNodes, videoNode.position, videoNode);
                nextNodes.push(videoNode);
                nextConnections = reconcileStoryboardTargetConnections(nextConnections, scriptNode, row, videoNode.id, referenceIds);
                videoNodeByRowId.set(row.id, videoNode.id);
                createdCount += 1;
            });
            const scriptIndex = nextNodes.findIndex((node) => node.id === scriptNode.id);
            nextNodes[scriptIndex] = {
                ...scriptNode,
                metadata: {
                    ...scriptNode.metadata,
                    storyboard: {
                        rows: allRows.map((row) => ({ ...row, videoNodeId: videoNodeByRowId.get(row.id) || row.videoNodeId, durationSeconds: Number(resolvedSettings!.get(row.id)?.seconds || row.durationSeconds) })),
                        visibleColumns: scriptNode.metadata?.storyboard?.visibleColumns || ["shotNumber", "durationSeconds", "videoMotionPrompt", "dialogue", "assets"],
                        referenceNodeIds: scriptNode.metadata?.storyboard?.referenceNodeIds || [],
                    },
                },
            };
            nodesRef.current = nextNodes;
            connectionsRef.current = nextConnections;
            setNodes(nextNodes);
            setConnections(nextConnections);
            if (!silent) message.success(createdCount ? t("canvasExtra.storyboard.videoNodesCreated", { count: createdCount }) : t("canvasExtra.storyboard.videoNodesSynced"));
        },
        [connectionsRef, effectiveConfig, message, nodesRef, projectAspectRatio, setConnections, setNodes, t],
    );

    const confirmVideoRows = useCallback(
        async (script: CanvasNodeData, rows: StoryboardRow[], includeFirstFrame: boolean) => {
            const snapshotNodes = nodesRef.current;
            const snapshotConnections = connectionsRef.current;
            const rowIds = rows.map((row) => row.id);
            const snapshot = storyboardVideoBatchSnapshot(script.id, rowIds, snapshotNodes, snapshotConnections, includeFirstFrame, projectAspectRatio);
            const signal = storyboardLifetime.current.signal;
            try {
                const inputs = rows.map((row) => {
                    const existing = snapshotNodes.find((node) => node.id === row.videoNodeId && node.type === CanvasNodeType.Video);
                    const ids = storyboardRowReferenceNodeIds(script, row, snapshotNodes, snapshotConnections, includeFirstFrame, existing?.id);
                    const references = storyboardDirectorReferences(
                        effectiveConfig,
                        snapshotNodes.filter((node) => ids.includes(node.id)),
                        existing,
                        snapshotNodes,
                    );

                    return { rowId: row.id, references, seconds: row.durationSeconds, existing };
                });
                const choices = storyboardVideoModelChoices(effectiveConfig, storyboardVideoScript(script, snapshotNodes, snapshotConnections, projectAspectRatio || effectiveConfig.size), inputs, projectAspectRatio).filter((choice) =>
                    choice.rows.every((plan) => isAiConfigReady(plan.config, plan.config.model)),
                );
                if (!choices.length) throw new Error("没有兼容所有分镜时长、比例及参考输入的视频模型，请调整分镜或模型设置");
                const selected = choices.find((choice) => choice.model === (effectiveConfig.videoModel || effectiveConfig.model));
                // Never swap the creator's model silently; name the models that fit and let them choose.
                if (!selected) throw new Error(`当前视频模型不支持这批分镜的时长、比例或参考素材，可换用：${choices.map((choice) => modelDisplayName(effectiveConfig, choice.model)).join("、")}`);
                // Task creation obtains and attaches the authoritative price voucher.
                signal.throwIfAborted();
                if (snapshot !== storyboardVideoBatchSnapshot(script.id, rowIds, nodesRef.current, connectionsRef.current, includeFirstFrame, projectAspectRatio)) throw new Error("分镜或参考已变化，请重新生成视频批次");
                const plans = selected.rows;
                const settings = new Map(plans.map((plan) => [plan.rowId, plan.settings]));
                return { settings, confirmedSettings: new Map(plans.map((plan) => [plan.rowId, confirmedStoryboardVideoSettings(plan.config)])) };
            } catch (error) {
                message.error(generationErrorMessage(error));
            }
        },
        [connectionsRef, effectiveConfig, isAiConfigReady, message, nodesRef, projectAspectRatio, t],
    );

    const createAndGenerateScriptVideos = useCallback(
        async (nodeId: string, rowIds?: string[]) => {
            try {
                if (!(await requireCanvasGenerationAccount(projectId))) return;
            } catch (error) {
                message.error(error instanceof Error ? error.message : t("miscPages.guestPrepareFailed"));
                return;
            }
            let scriptNode = nodesRef.current.find((node) => node.id === nodeId && node.type === CanvasNodeType.Script);
            const allRows = scriptNode?.metadata?.storyboard?.rows || [];
            const rows = rowIds?.length ? allRows.filter((row) => rowIds.includes(row.id)) : allRows;
            const describedRows = rows.filter((row) => Boolean((row.videoMotionPrompt || row.plotDescription).trim()));
            const activeNodeIds = scriptNode ? activeGenerationBatchNodeIds(scriptNode, "storyboard_video") : new Set<string>();
            const targetRows = describedRows.filter((row) => {
                const videoNode = row.videoNodeId ? nodesRef.current.find((node) => node.id === row.videoNodeId && node.type === CanvasNodeType.Video) : undefined;
                return !videoNode?.metadata?.content && (!videoNode || !activeNodeIds.has(videoNode.id));
            });
            if (!targetRows.length) {
                if (describedRows.some((row) => row.videoNodeId && nodesRef.current.some((node) => node.id === row.videoNodeId && Boolean(node.metadata?.content)))) message.info(t("canvasExtra.storyboard.shotVideoExists"));
                else message.warning(t("canvasExtra.storyboard.addDescriptionFirst"));
                return;
            }
            if (!scriptNode) return;
            const plannedSettings = await confirmVideoRows(scriptNode, targetRows, false);
            if (!plannedSettings) return;
            createScriptVideoNodes(
                nodeId,
                true,
                targetRows.map((row) => row.id),
                plannedSettings.settings,
            );
            scriptNode = nodesRef.current.find((node) => node.id === nodeId && node.type === CanvasNodeType.Script);
            const targetRowIds = new Set(targetRows.map((row) => row.id));
            const targets = rows.flatMap((row) => {
                if (!targetRowIds.has(row.id)) return [];
                const currentRow = scriptNode?.metadata?.storyboard?.rows.find((item) => item.id === row.id) || row;
                const videoNode = currentRow.videoNodeId ? nodesRef.current.find((node) => node.id === currentRow.videoNodeId && node.type === CanvasNodeType.Video) : undefined;
                if (!videoNode || videoNode.metadata?.content) return [];
                const prompt = (currentRow.videoMotionPrompt || currentRow.plotDescription).trim();
                if (!prompt) return [];
                return [{ row: currentRow, videoNode, prompt }];
            });
            const targetById = new Map(targets.map((target) => [target.videoNode.id, target]));
            const nextNodes = nodesRef.current.map((node) => {
                const target = targetById.get(node.id);
                return target
                    ? {
                          ...node,
                          metadata: {
                              ...node.metadata,
                              prompt: target.prompt,
                              composerContent: target.videoNode.metadata?.composerContent || target.prompt,
                              ...storyboardPromptTemplateMetadata(target.row, "video"),
                              generationMode: "video" as const,
                              videoEditOperation: "text_to_video" as const,
                              videoStartFrameNodeId: undefined,
                          },
                      }
                    : node;
            });
            const nextConnections = connectionsRef.current;
            nodesRef.current = nextNodes;
            connectionsRef.current = nextConnections;
            setNodes(nextNodes);
            setConnections(nextConnections);
            setSelectedNodeIds(new Set(targets.map((target) => target.videoNode.id)));
            if (
                enqueueGenerationBatch(
                    nodeId,
                    "storyboard_video",
                    targets.map((target) => ({ rowId: target.row.id, nodeId: target.videoNode.id, confirmedVideoSettings: plannedSettings.confirmedSettings.get(target.row.id)! })),
                )
            )
                message.success(t("canvasExtra.storyboard.videosQueued"));
        },
        [connectionsRef, confirmVideoRows, createScriptVideoNodes, effectiveConfig, enqueueGenerationBatch, isAiConfigReady, message, nodesRef, projectId, setConnections, setNodes, setSelectedNodeIds, t],
    );

    const createScriptActionBoards = useCallback(
        async (nodeId: string) => {
            const scriptNode = nodesRef.current.find((node) => node.id === nodeId && node.type === CanvasNodeType.Script);
            const rows = scriptNode?.metadata?.storyboard?.rows || [];
            if (!scriptNode || !rows.length) return;
            try {
                if (!(await requireCanvasGenerationAccount(projectId))) return;
            } catch (error) {
                message.error(error instanceof Error ? error.message : t("miscPages.guestPrepareFailed"));
                return;
            }
            const imageModel = effectiveConfig.imageModel || effectiveConfig.model;
            if (!isAiConfigReady(effectiveConfig, imageModel)) {
                navigateToSettings({ continueCreation: true });
                return;
            }
            const actionBoardRows = rows.filter(
                (row) => !nodesRef.current.some((node) => node.type === CanvasNodeType.Image && node.metadata?.workflowKind === "action_board" && node.metadata.shotIndex === row.shotNumber && Boolean(node.metadata.content)),
            );
            if (!actionBoardRows.length) {
                message.info(t("canvasExtra.storyboard.actionBoardExists"));
                return;
            }
            const imageSpec = NODE_DEFAULT_SIZE[CanvasNodeType.Image];
            const startX = scriptNode.position.x + scriptNode.width + 120;
            const nextNodes = [...nodesRef.current];
            const nextConnections = [...connectionsRef.current];
            const targets: Array<{ row: StoryboardRow; node: CanvasNodeData; prompt: string }> = [];
            actionBoardRows.forEach((row, index) => {
                const prompt = [
                    "生成一张电影动作拆分 12 宫格参考图，严格 3 列 4 行，12 个格子清晰分隔，保持同一角色、服装、场景和光线连续。",
                    `镜头 ${row.shotNumber}：${row.plotDescription || row.videoMotionPrompt || "根据镜头剧情补全动作"}`,
                    row.characters.length ? `角色：${row.characters.map((item) => item.characterName).join("、")}` : "",
                    "按时间顺序展示动作起势、推进、转折、落点和结束姿态，不要添加文字、边框标题或额外画面。",
                ]
                    .filter(Boolean)
                    .join("\n");
                const existingIndex = nextNodes.findIndex((node) => node.type === CanvasNodeType.Image && node.metadata?.workflowKind === "action_board" && node.metadata.shotIndex === row.shotNumber);
                if (existingIndex >= 0 && nextNodes[existingIndex].metadata?.content) return;
                const imageNode =
                    existingIndex >= 0
                        ? { ...nextNodes[existingIndex], metadata: { ...resetGenerationTaskMetadata(nextNodes[existingIndex].metadata), prompt } }
                        : createCanvasNode(
                              CanvasNodeType.Image,
                              { x: startX + imageSpec.width / 2, y: scriptNode.position.y + index * (imageSpec.height + 36) + imageSpec.height / 2 },
                              {
                                  prompt,
                                  workflowKind: "action_board",
                                  workflowTitle: t("canvasExtra.storyboard.actionBoardWorkflowTitle", { shot: row.shotNumber }),
                                  shotIndex: row.shotNumber,
                                  actionBoardRows: 4,
                                  actionBoardColumns: 3,
                                  status: NODE_STATUS_IDLE,
                              },
                          );
                imageNode.title = t("canvasExtra.storyboard.actionBoardNodeTitle", { shot: row.shotNumber });
                if (existingIndex >= 0) nextNodes[existingIndex] = imageNode;
                else {
                    nextNodes.push(imageNode);
                    nextConnections.push({ id: nanoid(), fromNodeId: scriptNode.id, toNodeId: imageNode.id, fromHandleId: `row:${row.id}` });
                }
                targets.push({ row, node: imageNode, prompt });
            });
            nodesRef.current = nextNodes;
            connectionsRef.current = nextConnections;
            setNodes(nextNodes);
            setConnections(nextConnections);
            if (
                enqueueGenerationBatch(
                    nodeId,
                    "action_board",
                    targets.map((target) => ({ rowId: target.row.id, nodeId: target.node.id })),
                )
            )
                message.success(t("canvasExtra.storyboard.actionBoardsQueued"));
        },
        [connectionsRef, effectiveConfig, enqueueGenerationBatch, isAiConfigReady, message, nodesRef, projectId, setConnections, setNodes, t],
    );

    const generateScriptVideos = useCallback(
        async (nodeId: string, rowIds: string[]) => {
            let scriptNode = nodesRef.current.find((node) => node.id === nodeId && node.type === CanvasNodeType.Script);
            const rows = (scriptNode?.metadata?.storyboard?.rows || []).filter((row) => rowIds.includes(row.id));
            if (!scriptNode || !rows.length) return;
            try {
                if (!(await requireCanvasGenerationAccount(projectId))) return;
            } catch (error) {
                message.error(error instanceof Error ? error.message : t("miscPages.guestPrepareFailed"));
                return;
            }
            const readyRows = rows.filter((row) => row.imageNodeId && nodesRef.current.some((node) => node.id === row.imageNodeId && node.type === CanvasNodeType.Image && node.metadata?.content));
            if (!readyRows.length) return message.warning(t("canvasExtra.storyboard.generateFirstFrameFirst"));
            if (readyRows.length !== rows.length) return message.warning(t("canvasExtra.storyboard.framesNotReady", { count: rows.length - readyRows.length }));
            const activeNodeIds = activeGenerationBatchNodeIds(scriptNode, "storyboard_video");
            const targetRows = readyRows.filter((row) => {
                const videoNode = row.videoNodeId ? nodesRef.current.find((node) => node.id === row.videoNodeId && node.type === CanvasNodeType.Video) : undefined;
                return !videoNode?.metadata?.content && (!videoNode || !activeNodeIds.has(videoNode.id));
            });
            if (!targetRows.length) return message.info(t("canvasExtra.storyboard.shotVideosGeneratedOrRunning"));
            const plannedSettings = await confirmVideoRows(scriptNode, targetRows, true);
            if (!plannedSettings) return;
            createScriptVideoNodes(
                nodeId,
                true,
                targetRows.map((row) => row.id),
                plannedSettings.settings,
            );
            scriptNode = nodesRef.current.find((node) => node.id === nodeId && node.type === CanvasNodeType.Script);
            if (!scriptNode) return;
            const currentScriptNode = scriptNode;
            const videoSpec = NODE_DEFAULT_SIZE[CanvasNodeType.Video];
            const currentRows = targetRows.map((row) => currentScriptNode.metadata?.storyboard?.rows.find((item) => item.id === row.id) || row);
            const startX = Math.max(...currentRows.map((row) => nodesRef.current.find((node) => node.id === row.imageNodeId)?.position.x || currentScriptNode.position.x + currentScriptNode.width)) + videoSpec.width + 120;
            const nextNodes = [...nodesRef.current];
            let nextConnections = [...connectionsRef.current];
            const targets: Array<{ row: StoryboardRow; node: CanvasNodeData; prompt: string }> = [];
            currentRows.forEach((row, index) => {
                const prompt = (row.videoMotionPrompt || row.plotDescription).trim();
                const existing = row.videoNodeId ? nextNodes.find((node) => node.id === row.videoNodeId && node.type === CanvasNodeType.Video) : undefined;
                const referenceIds = storyboardRowReferenceNodeIds(currentScriptNode, row, nextNodes, nextConnections, true, existing?.id);
                const composerContent = storyboardComposerContent(prompt, referenceIds, nextNodes);
                const videoSettings = plannedSettings.settings.get(row.id)!;
                const existingMetadata = existing?.metadata?.content ? existing.metadata : resetGenerationTaskMetadata(existing?.metadata);
                const videoNode = existing
                    ? {
                          ...existing,
                          metadata: {
                              ...existingMetadata,
                              prompt,
                              composerContent,
                              model: videoSettings.model,
                              ...storyboardPromptTemplateMetadata(row, "video"),
                              workflowKind: "shot" as const,
                              workflowTitle: t("canvasExtra.storyboard.shotVideoWorkflowTitle", { shot: row.shotNumber }),
                              shotIndex: row.shotNumber,
                              generationMode: "video" as const,
                              videoEditOperation: "image_to_video" as const,
                              videoStartFrameNodeId: row.imageNodeId,
                              seconds: String(row.durationSeconds),
                          },
                      }
                    : createCanvasNode(
                          CanvasNodeType.Video,
                          { x: startX, y: currentScriptNode.position.y + index * (videoSpec.height + 36) + videoSpec.height / 2 },
                          {
                              prompt,
                              composerContent,
                              model: videoSettings.model,
                              ...storyboardPromptTemplateMetadata(row, "video"),
                              workflowKind: "shot",
                              workflowTitle: t("canvasExtra.storyboard.shotVideoWorkflowTitle", { shot: row.shotNumber }),
                              shotIndex: row.shotNumber,
                              generationMode: "video",
                              videoEditOperation: "image_to_video",
                              videoStartFrameNodeId: row.imageNodeId,
                              status: NODE_STATUS_IDLE,
                              seconds: String(row.durationSeconds),
                          },
                      );
                videoNode.metadata = synchronizeGenerationSpec(videoNode, { ...videoSettings, prompt, composerContent }).metadata;
                if (!existing) {
                    videoNode.position = findAvailableGenerationGroupPosition(nextNodes, videoNode.position, videoNode);
                    videoNode.title = t("canvasExtra.storyboard.videoNodeTitle", { shot: row.shotNumber });
                    nextNodes.push(videoNode);
                } else {
                    const existingIndex = nextNodes.findIndex((node) => node.id === existing.id);
                    nextNodes[existingIndex] = videoNode;
                }
                nextConnections = reconcileStoryboardTargetConnections(nextConnections, currentScriptNode, row, videoNode.id, referenceIds);
                targets.push({ row, node: videoNode, prompt });
            });
            nodesRef.current = nextNodes;
            connectionsRef.current = nextConnections;
            setNodes(nextNodes);
            setConnections(nextConnections);
            if (
                enqueueGenerationBatch(
                    nodeId,
                    "storyboard_video",
                    targets.map((target) => ({ rowId: target.row.id, nodeId: target.node.id, confirmedVideoSettings: plannedSettings.confirmedSettings.get(target.row.id)! })),
                )
            )
                message.success(t("canvasExtra.storyboard.videosQueued"));
        },
        [connectionsRef, confirmVideoRows, createScriptVideoNodes, effectiveConfig, enqueueGenerationBatch, isAiConfigReady, message, nodesRef, projectId, setConnections, setNodes, t],
    );

    return {
        addScriptRow,
        createAndGenerateScriptVideos,
        createScriptActionBoards,
        createScriptImageNodes,
        createScriptVideoNodes,
        generateScriptImages,
        generateScriptRows,
        generateScriptVideos,
        removeScriptRow,
        replaceScriptRows,
        updateScriptRow,
        updateScriptRows,
    };
}

function activeGenerationBatchNodeIds(node: CanvasNodeData, mode: CanvasGenerationBatchMode) {
    return new Set(
        (node.metadata?.generationBatches || [])
            .filter((batch) => batch.mode === mode)
            .flatMap((batch) => batch.items.filter((item) => item.status === "waiting" || item.status === "submitting" || item.status === "queued" || item.status === "running").map((item) => item.nodeId)),
    );
}
