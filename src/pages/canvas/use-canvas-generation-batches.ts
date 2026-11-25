import { nodeGenerationPrompt } from "@/lib/canvas/generation-contract";
import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { App } from "antd";
import { nanoid } from "nanoid";

import { useI18n } from "@/i18n/use-i18n";
import { GENERATION_CAPACITY_WAIT, generationBatchStatus, isGenerationCostUncertainError } from "@/lib/canvas/canvas-generation-batch";
import { buildGenerationConfig, createGenerationRetryContext, generationTaskMetadata, resetGenerationTaskMetadata } from "@/lib/canvas/canvas-project-generation";
import { unchangedModeratedPrompt, generationFailureMetadata } from "@/lib/generation-error";
import { listGenerationTasks } from "@/services/api/task-center";
import { preflightBackendVideoReferences } from "@/services/api/generation-task";
import { buildNodeGenerationContext } from "@/components/canvas/canvas-node-generation";
import { buildConfirmedStoryboardVideoConfig } from "@/lib/canvas/storyboard-video-confirmation";
import type { Asset } from "@/stores/use-asset-store";
import type { CanvasConnection } from "@/types/canvas";
import { useConfigStore, useEffectiveConfig } from "@/stores/use-config-store";
import { useUserStore } from "@/stores/use-user-store";
import type { CanvasGenerationBatch, CanvasGenerationBatchItem, CanvasGenerationBatchMode, CanvasNodeData } from "@/types/canvas";

import type { CanvasNodeGenerationOptions } from "./use-canvas-generation-executor";
import type { CanvasNodeGenerationMode } from "@/components/canvas/canvas-node-prompt-panel";

const SCHEDULER_INTERVAL_MS = 2_000;
const MAX_BATCH_HISTORY = 20;

type BatchTarget = Pick<CanvasGenerationBatchItem, "rowId" | "nodeId" | "confirmedVideoSettings">;

type UseCanvasGenerationBatchesOptions = {
    projectId: string;
    projectLoaded: boolean;
    nodes: CanvasNodeData[];
    nodesRef: { current: CanvasNodeData[] };
    connectionsRef: { current: CanvasConnection[] };
    assets: Asset[];
    setNodes: Dispatch<SetStateAction<CanvasNodeData[]>>;
    handleGenerateNode: (nodeId: string, mode: CanvasNodeGenerationMode, prompt: string, options?: CanvasNodeGenerationOptions) => Promise<void>;
};

export function useCanvasGenerationBatches({ projectId, projectLoaded, nodes, nodesRef, connectionsRef, assets, setNodes, handleGenerateNode }: UseCanvasGenerationBatchesOptions) {
    const { message, modal } = App.useApp();
    const { t } = useI18n();
    const effectiveConfig = useEffectiveConfig();
    const isAiConfigReady = useConfigStore((state) => state.isAiConfigReady);
    const activeTaskLimit = useUserStore((state) => state.runtimeLimits.activeTaskLimit);
    const schedulingRef = useRef(false);
    const controllersRef = useRef(new Map<string, AbortController>());
    const referencePreflightsRef = useRef(new Map<string, string>());
    useEffect(() => {
        referencePreflightsRef.current.clear();
    }, [projectId]);
    // 每一项最近一次提交的结果。提交结束后节点既没绑定任务也没出结果时，只有“等待并发名额”可以回到等待队列；
    // 其余情况（参数校验失败、模型不可用、结果落到了别的节点等）标为失败，避免每 2 秒重复提交、重复扣费。
    const outcomesRef = useRef(new Map<string, unknown>());

    const updateBatch = useCallback(
        (sourceNodeId: string, batchId: string, updater: (batch: CanvasGenerationBatch) => CanvasGenerationBatch) => {
            setNodes((current) => {
                let changed = false;
                const next = current.map((node) => {
                    if (node.id !== sourceNodeId || !node.metadata?.generationBatches?.length) return node;
                    const batches = node.metadata.generationBatches.map((batch) => {
                        if (batch.id !== batchId) return batch;
                        const updated = updater(batch);
                        if (updated !== batch) changed = true;
                        return updated;
                    });
                    return changed ? { ...node, metadata: { ...node.metadata, generationBatches: batches } } : node;
                });
                return changed ? next : current;
            });
        },
        [setNodes],
    );

    const enqueueGenerationBatch = useCallback(
        (sourceNodeId: string, mode: CanvasGenerationBatchMode, targets: BatchTarget[], options?: { concurrency?: number }) => {
            const sourceNode = nodesRef.current.find((node) => node.id === sourceNodeId);
            if (!sourceNode || !targets.length) return;
            const activeNodeIds = new Set((sourceNode.metadata?.generationBatches || []).flatMap((batch) => batch.items.filter((item) => ["waiting", "submitting", "queued", "running"].includes(item.status)).map((item) => item.nodeId)));
            const availableTargets = targets.filter((target) => !activeNodeIds.has(target.nodeId));
            if (!availableTargets.length) {
                message.info(t("canvasRuntime.batch.alreadyQueued"));
                return;
            }
            const now = new Date().toISOString();
            const batch: CanvasGenerationBatch = {
                id: nanoid(),
                projectId,
                sourceNodeId,
                mode,
                status: "queued",
                items: availableTargets.map((target) => ({ id: nanoid(), ...target, status: "waiting", retryCount: 0 })),
                concurrency: options?.concurrency ? Math.max(1, Math.min(10, Math.floor(options.concurrency))) : undefined,
                createdAt: now,
                updatedAt: now,
            };
            setNodes((current) =>
                current.map((node) =>
                    node.id === sourceNodeId
                        ? {
                              ...node,
                              metadata: {
                                  ...node.metadata,
                                  generationBatches: [...(node.metadata?.generationBatches || []), batch].slice(-MAX_BATCH_HISTORY),
                              },
                          }
                        : node,
                ),
            );
            return batch.id;
        },
        [message, nodesRef, projectId, setNodes, t],
    );

    const reconcileBatches = useCallback(() => {
        setNodes((current) => {
            const nodeById = new Map(current.map((node) => [node.id, node]));
            let changed = false;
            const nextNodes = current.map((sourceNode) => {
                const batches = sourceNode.metadata?.generationBatches;
                if (!batches?.length) return sourceNode;
                let sourceChanged = false;
                const nextBatches = batches.map((batch) => {
                    if (batch.projectId !== projectId) return batch;
                    let batchChanged = false;
                    const nextItems = batch.items.map((item) => {
                        if (item.status === "succeeded" || item.status === "failed" || item.status === "cancelled") return item;
                        const node = nodeById.get(item.nodeId);
                        let patch: Partial<CanvasGenerationBatchItem> | null = null;
                        if (!node) {
                            patch = { status: "failed", errorDetails: t("canvasRuntime.batch.nodeMissing") };
                        } else if (node.metadata?.status === "success" && node.metadata.content) {
                            patch = { status: "succeeded", taskId: node.metadata.taskId, errorDetails: undefined, costUncertain: false };
                        } else if (node.metadata?.status === "error") {
                            const errorDetails = node.metadata.errorDetails || t("canvasRuntime.batch.failed");
                            patch = {
                                status: node.metadata.taskStatus === "cancelled" ? "cancelled" : "failed",
                                taskId: node.metadata.taskId,
                                errorDetails,
                                generationErrorCode: node.metadata.generationErrorCode || node.metadata.taskErrorCode,
                                taskBilling: node.metadata.taskBilling,
                                costUncertain: isGenerationCostUncertainError(new Error(errorDetails)),
                            };
                        } else if (node.metadata?.taskId) {
                            const taskStatus = node.metadata.taskStatus;
                            patch = {
                                taskId: node.metadata.taskId,
                                // 后端成功后还要下载并写入媒体，节点真正拿到内容才算批次成功。
                                status: taskStatus === "queued" ? "queued" : taskStatus === "failed" ? "failed" : taskStatus === "cancelled" ? "cancelled" : "running",
                                errorDetails: undefined,
                            };
                        } else if (item.status === "submitting" && !controllersRef.current.has(batchItemKey(batch.id, item.id))) {
                            const key = batchItemKey(batch.id, item.id);
                            const recorded = outcomesRef.current.has(key);
                            const outcome = outcomesRef.current.get(key);
                            outcomesRef.current.delete(key);
                            patch =
                                !recorded || outcome === GENERATION_CAPACITY_WAIT
                                    ? { status: "waiting", errorDetails: undefined }
                                    : { status: "failed", ...(outcome === "finished" ? { errorDetails: t("canvasRuntime.batch.notSubmitted") } : generationFailureMetadata(outcome, node?.metadata?.prompt || "")) };
                        }
                        if (!patch || !itemChanged(item, patch)) return item;
                        batchChanged = true;
                        return { ...item, ...patch };
                    });
                    const nextBatch = batchChanged ? { ...batch, items: nextItems } : batch;
                    const status = generationBatchStatus(nextBatch);
                    if (!batchChanged && status === batch.status) return batch;
                    sourceChanged = true;
                    return { ...nextBatch, status, updatedAt: new Date().toISOString() };
                });
                if (!sourceChanged) return sourceNode;
                changed = true;
                return { ...sourceNode, metadata: { ...sourceNode.metadata, generationBatches: nextBatches } };
            });
            return changed ? nextNodes : current;
        });
    }, [projectId, setNodes, t]);

    // 仅查询当前画布的活跃任务来安排批次，跨画布并发仍由后端创建任务时原子校验。
    const scheduleWaitingItems = useCallback(async () => {
        if (!projectLoaded || schedulingRef.current) return;
        schedulingRef.current = true;
        try {
            const currentNodes = nodesRef.current;
            // 没有当前画布的等待项时无需查询任务中心，避免空画布持续轮询。
            const hasWaitingItems = currentNodes.some((sourceNode) =>
                (sourceNode.metadata?.generationBatches || []).some((batch) => batch.projectId === projectId && batch.status !== "completed" && batch.status !== "cancelled" && batch.items.some((item) => item.status === "waiting")),
            );
            if (!hasWaitingItems) return;

            // Include items beyond this scheduler's capacity window: otherwise
            // an invalid later row could be discovered only after earlier charges.
            for (const source of currentNodes) {
                for (const batch of source.metadata?.generationBatches || []) {
                    if (batch.projectId !== projectId || batch.mode !== "storyboard_video" || ["completed", "cancelled"].includes(batch.status)) continue;
                    try {
                        for (const item of batch.items.filter((item) => item.status === "waiting")) {
                            const node = currentNodes.find((node) => node.id === item.nodeId);
                            if (!node || node.metadata?.taskId) continue;
                            const config = item.confirmedVideoSettings ? buildConfirmedStoryboardVideoConfig(effectiveConfig, node, item.confirmedVideoSettings) : buildGenerationConfig(effectiveConfig, node, "video");
                            const context = buildNodeGenerationContext(node.id, currentNodes, connectionsRef.current, nodeGenerationPrompt(node), assets, true, config);
                            const key = batchItemKey(batch.id, item.id);
                            const fingerprint = JSON.stringify({ config, images: context.referenceImages, videos: context.referenceVideos, audios: context.referenceAudios });
                            if (referencePreflightsRef.current.get(key) === fingerprint) continue;
                            await preflightBackendVideoReferences({
                                projectId,
                                mode: "video",
                                prompt: context.prompt,
                                config,
                                referenceImages: context.referenceImages,
                                referenceVideos: context.referenceVideos,
                                referenceAudios: context.referenceAudios,
                                metadata: { nodeId: node.id },
                            });
                            referencePreflightsRef.current.set(key, fingerprint);
                        }
                    } catch (error) {
                        updateBatch(batch.sourceNodeId, batch.id, (current) => ({
                            ...current,
                            items: current.items.map((item) => (item.status === "waiting" ? { ...item, status: "failed", ...generationFailureMetadata(error, "") } : item)),
                            updatedAt: new Date().toISOString(),
                        }));
                        return;
                    }
                }
            }
            if (nodesRef.current !== currentNodes) return;

            const tasks = await listGenerationTasks(100, { projectId, activeOnly: true }).catch(() => null);
            if (!tasks) return;
            const activeTaskCount = tasks.filter((task) => task.status === "queued" || task.status === "running").length;
            const nodeById = new Map(currentNodes.map((node) => [node.id, node]));
            const pendingReservations = [...controllersRef.current.keys()].filter((key) => {
                const [, itemId] = key.split(":");
                const item = currentNodes
                    .flatMap((node) => node.metadata?.generationBatches || [])
                    .flatMap((batch) => batch.items)
                    .find((candidate) => candidate.id === itemId);
                return item ? !nodeById.get(item.nodeId)?.metadata?.taskId : false;
            }).length;
            let availableSlots = Math.max(0, activeTaskLimit - activeTaskCount - pendingReservations);
            if (!availableSlots) return;

            const candidates: Array<{ batch: CanvasGenerationBatch; item: CanvasGenerationBatchItem; node: CanvasNodeData }> = [];
            for (const sourceNode of currentNodes) {
                for (const batch of sourceNode.metadata?.generationBatches || []) {
                    if (batch.projectId !== projectId || batch.status === "completed" || batch.status === "cancelled") continue;
                    let batchAvailableSlots = batch.concurrency ? Math.max(0, batch.concurrency - batch.items.filter((item) => ["submitting", "queued", "running"].includes(item.status)).length) : Number.POSITIVE_INFINITY;
                    for (const item of batch.items) {
                        if (item.status !== "waiting" || availableSlots <= 0 || batchAvailableSlots <= 0) continue;
                        const node = nodeById.get(item.nodeId);
                        if (!node) continue;
                        // 已绑定任务或已有成品的节点交给恢复/对账链路处理，绝不重复提交。
                        if (node.metadata?.taskId || (node.metadata?.status === "success" && node.metadata.content)) continue;
                        candidates.push({ batch, item, node });
                        availableSlots -= 1;
                        batchAvailableSlots -= 1;
                    }
                }
            }

            for (const { batch, item, node } of candidates) {
                const key = batchItemKey(batch.id, item.id);
                if (controllersRef.current.has(key)) continue;
                const generationMode: CanvasNodeGenerationMode = batch.mode === "storyboard_video" ? "video" : "image";
                const generationConfig = item.confirmedVideoSettings ? undefined : buildGenerationConfig(effectiveConfig, node, generationMode);
                if (generationConfig && !isAiConfigReady(generationConfig, generationConfig.model)) {
                    updateBatch(batch.sourceNodeId, batch.id, (current) => withUpdatedItem(current, item.id, { status: "failed", errorDetails: t("canvasRuntime.batch.modelNotConfigured") }));
                    continue;
                }
                const prompt = nodeGenerationPrompt(node).trim();
                if (!prompt) {
                    updateBatch(batch.sourceNodeId, batch.id, (current) => withUpdatedItem(current, item.id, { status: "failed", errorDetails: t("canvasRuntime.batch.promptEmpty") }));
                    continue;
                }
                const controller = new AbortController();
                controllersRef.current.set(key, controller);
                updateBatch(batch.sourceNodeId, batch.id, (current) => withUpdatedItem(current, item.id, { status: "submitting", errorDetails: undefined }));
                void handleGenerateNode(node.id, generationMode, prompt, {
                    controller,
                    waitForTaskCapacity: true,
                    onCapacityWait: () => outcomesRef.current.set(key, GENERATION_CAPACITY_WAIT),
                    skipDuplicateConfirmation: true,
                    confirmedVideoSettings: item.confirmedVideoSettings,
                    retryContext:
                        node.metadata?.retryOf && node.metadata.attemptGroupId && node.metadata.taskClientOperationId
                            ? { retryOf: node.metadata.retryOf, attemptGroupId: node.metadata.attemptGroupId, clientOperationId: node.metadata.taskClientOperationId }
                            : undefined,
                })
                    .catch((error) => outcomesRef.current.set(key, error))
                    .finally(() => {
                        if (!outcomesRef.current.has(key)) outcomesRef.current.set(key, "finished");
                        controllersRef.current.delete(key);
                        reconcileBatches();
                    });
            }
        } finally {
            schedulingRef.current = false;
        }
    }, [activeTaskLimit, effectiveConfig, handleGenerateNode, isAiConfigReady, nodesRef, connectionsRef, assets, projectId, projectLoaded, reconcileBatches, t, updateBatch]);

    const retryFailedBatchItems = useCallback(
        (sourceNodeId: string, batchId: string, itemId?: string) => {
            const batch = findBatch(nodesRef.current, sourceNodeId, batchId);
            if (!batch) return;
            const failedItems = batch.items.filter((item) => item.status === "failed" && (!itemId || item.id === itemId));
            if (!failedItems.length) return message.info(t("canvasRuntime.batch.noFailedItems"));
            const nodeById = new Map(nodesRef.current.map((node) => [node.id, node]));
            const blockedItems = failedItems.filter((item) => {
                const node = nodeById.get(item.nodeId);
                return unchangedModeratedPrompt(node?.metadata, node ? nodeGenerationPrompt(node) : "");
            });
            const retryableItems = failedItems.filter((item) => !blockedItems.includes(item));
            if (blockedItems.length) message.warning(t("canvasRuntime.batch.moderated", { count: blockedItems.length }));
            if (!retryableItems.length) return;
            const retry = async () => {
                const retryContexts = new Map<string, Awaited<ReturnType<typeof createGenerationRetryContext>>>();
                await Promise.all(
                    retryableItems.map(async (item) => {
                        const retryNode = nodeById.get(item.nodeId);
                        if (!retryNode?.metadata?.taskId) return;
                        retryContexts.set(item.nodeId, await createGenerationRetryContext(retryNode.metadata.taskId, retryNode.metadata.attemptGroupId));
                    }),
                );
                const retryItemIds = new Set(retryableItems.map((item) => item.id));
                const retryNodeIds = new Set(retryableItems.map((item) => item.nodeId));
                setNodes((current) =>
                    current.map((node) => {
                        if (node.id === sourceNodeId) {
                            const batches = (node.metadata?.generationBatches || []).map((currentBatch) => {
                                if (currentBatch.id !== batchId) return currentBatch;
                                const items = currentBatch.items.map((item) =>
                                    retryItemIds.has(item.id) ? { ...item, status: "waiting" as const, taskId: undefined, errorDetails: undefined, costUncertain: false, retryCount: item.retryCount + 1 } : item,
                                );
                                const nextBatch = { ...currentBatch, items, updatedAt: new Date().toISOString() };
                                return { ...nextBatch, status: generationBatchStatus(nextBatch) };
                            });
                            return { ...node, metadata: { ...node.metadata, generationBatches: batches } };
                        }
                        if (!retryNodeIds.has(node.id)) return node;
                        const retryContext = retryContexts.get(node.id);
                        return {
                            ...node,
                            metadata: {
                                ...resetGenerationTaskMetadata(node.metadata),
                                ...(retryContext
                                    ? {
                                          retryOf: retryContext.retryOf,
                                          attemptGroupId: retryContext.attemptGroupId,
                                          taskClientOperationId: retryContext.clientOperationId,
                                      }
                                    : {}),
                            },
                        };
                    }),
                );
                message.success(t("canvasRuntime.batch.retryQueued", { count: retryableItems.length }));
            };
            retry();
        },
        [message, modal, nodesRef, setNodes, t],
    );

    const stopRemainingBatchItems = useCallback(
        (sourceNodeId: string, batchId: string) => {
            const batch = findBatch(nodesRef.current, sourceNodeId, batchId);
            if (!batch) return;
            const nodeById = new Map(nodesRef.current.map((node) => [node.id, node]));
            // 只允许停止还在本地等待队列中的项目。进入 submitting 后请求可能已经被服务端接收，
            // 即使前端尚未拿到 taskId 也不能再把它标成取消，避免隐藏已计费任务。
            const stoppableItems = batch.items.filter((item) => item.status === "waiting" && !nodeById.get(item.nodeId)?.metadata?.taskId);
            if (!stoppableItems.length) return message.info(t("canvasRuntime.batch.noUnsubmitted"));
            modal.confirm({
                title: t("canvasRuntime.batch.stopTitle"),
                content: t("canvasRuntime.batch.stopContent", { count: stoppableItems.length }),
                okText: t("canvasRuntime.batch.stopRemaining"),
                cancelText: t("canvasRuntime.batch.continueGenerating"),
                okButtonProps: { danger: true },
                onOk: () => {
                    const latestNodeById = new Map(nodesRef.current.map((node) => [node.id, node]));
                    const latestBatch = findBatch(nodesRef.current, sourceNodeId, batchId);
                    const latestStoppableItems = latestBatch ? latestBatch.items.filter((item) => item.status === "waiting" && stoppableItems.some((candidate) => candidate.id === item.id) && !latestNodeById.get(item.nodeId)?.metadata?.taskId) : [];
                    const stoppableIds = new Set(latestStoppableItems.map((item) => item.id));
                    updateBatch(sourceNodeId, batchId, (current) => {
                        const items = current.items.map((item) => (stoppableIds.has(item.id) ? { ...item, status: "cancelled" as const, errorDetails: undefined } : item));
                        const nextBatch = { ...current, items, updatedAt: new Date().toISOString() };
                        return { ...nextBatch, status: generationBatchStatus(nextBatch) };
                    });
                },
            });
        },
        [message, modal, nodesRef, t, updateBatch],
    );

    useEffect(() => {
        if (!projectLoaded) return;
        reconcileBatches();
    }, [nodes, projectLoaded, reconcileBatches]);

    useEffect(() => {
        if (!projectLoaded) return;
        void scheduleWaitingItems();
        const timer = window.setInterval(() => {
            reconcileBatches();
            void scheduleWaitingItems();
        }, SCHEDULER_INTERVAL_MS);
        return () => window.clearInterval(timer);
    }, [projectLoaded, reconcileBatches, scheduleWaitingItems]);

    return {
        enqueueGenerationBatch,
        retryFailedBatchItems,
        stopRemainingBatchItems,
    };
}

function batchItemKey(batchId: string, itemId: string) {
    return `${batchId}:${itemId}`;
}

function itemChanged(item: CanvasGenerationBatchItem, patch: Partial<CanvasGenerationBatchItem>) {
    return Object.entries(patch).some(([key, value]) => item[key as keyof CanvasGenerationBatchItem] !== value);
}

function withUpdatedItem(batch: CanvasGenerationBatch, itemId: string, patch: Partial<CanvasGenerationBatchItem>) {
    const items = batch.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item));
    const nextBatch = { ...batch, items, updatedAt: new Date().toISOString() };
    return { ...nextBatch, status: generationBatchStatus(nextBatch) };
}

function findBatch(nodes: CanvasNodeData[], sourceNodeId: string, batchId: string) {
    return nodes.find((node) => node.id === sourceNodeId)?.metadata?.generationBatches?.find((batch) => batch.id === batchId);
}
