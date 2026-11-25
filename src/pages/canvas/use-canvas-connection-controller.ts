import { findAvailableGenerationGroupPosition } from "@/lib/canvas/canvas-generation-layout";
import { connectDirectorDownstream } from "@/lib/canvas/director/director-downstream";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type Dispatch, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type SetStateAction } from "react";
import { App } from "antd";
import { nanoid } from "nanoid";
import { currentLocaleText } from "@/i18n/current-locale-text";
import { localizedNodeLabel } from "@/i18n/canvas-node-label";
import { localizedConnectionError } from "@/i18n/connection-error";
import { resolveAppLocale } from "@/i18n/app-locale";
import { latchCanvasConnectionApproach, type CanvasConnectionApproach } from "@/lib/canvas/canvas-connection-tilt";

import type { PendingConnectionCreate } from "@/components/canvas/canvas-workspace-overlays";
import { getNodeSpec } from "@/constant/canvas";
import { batchSourceRestriction, buildBatchConnectionCreateRequest, hasBatchConnectionCandidate, planBatchConnections, type CanvasBatchConnectionPreview } from "@/lib/canvas/canvas-batch-connection";
import { batchReferenceHandleAtY } from "@/lib/canvas/canvas-batch-table";
import { connectedNodeCenterFromEdgeDrop } from "@/lib/canvas/canvas-connected-node-placement";
import { canvasConnectionError } from "@/lib/canvas/canvas-connection-policy";
import { getGenerationResourceNodes, prefillCanvasConnectedMediaPrompt } from "@/lib/canvas/canvas-resource-references";
import { economicalVideoSettings, upstreamVideoRatio } from "@/lib/canvas/canvas-video-defaults";
import { isDepthReferenceVideo } from "@/lib/media-conversion/contracts";
import { storyboardVideoRequirements } from "@/lib/canvas/canvas-storyboard-video";
import { attachNodeToStoryboardRow, createCanvasNode, getConnectionTargetAnchor, isHiddenBatchChild, normalizeConnection, storyboardPromptTemplateMetadata, storyboardRowFromHandle } from "@/lib/canvas/canvas-project-domain";
import { createCanvasDrawingFromImage } from "@/lib/canvas/canvas-drawing-storage";
import { isDrawingEngineAvailable, type CanvasDrawingEngine } from "@/lib/canvas/canvas-drawing-engine";
import { isFrameNode, isNodeHiddenByCollapsedFrame } from "@/lib/canvas/canvas-frame";
import { normalizeRunningHubCapability, type AiConfig } from "@/stores/use-config-store";
import { useUserStore } from "@/stores/use-user-store";
import { CanvasNodeType, type CanvasConnection, type CanvasNodeData, type CanvasNodeMetadata, type ConnectionHandle, type ContextMenuState, type Position, type ViewportTransform } from "@/types/canvas";
import { workflowProviderPluginEnabled } from "@/lib/plugins/builtin/workflows";
import { usePluginStore } from "@/stores/use-plugin-store";

function connectionReason(reason: string) {
    return localizedConnectionError(reason, currentLocaleText, (value) => new Intl.NumberFormat(resolveAppLocale()).format(value));
}

type UseCanvasConnectionControllerOptions = {
    projectId: string;
    config: AiConfig;
    defaultDrawingEngine: CanvasDrawingEngine;
    nodesRef: { current: CanvasNodeData[] };
    connectionsRef: { current: CanvasConnection[] };
    viewportRef: { current: ViewportTransform };
    scriptScrollTopById: Record<string, number>;
    screenToCanvas: (clientX: number, clientY: number) => Position;
    revealCreatedNode: (node: CanvasNodeData, opensComposer: boolean) => void;
    setNodes: Dispatch<SetStateAction<CanvasNodeData[]>>;
    setConnections: Dispatch<SetStateAction<CanvasConnection[]>>;
    setSelectedNodeIds: Dispatch<SetStateAction<Set<string>>>;
    setSelectedConnectionId: Dispatch<SetStateAction<string | null>>;
    setContextMenu: Dispatch<SetStateAction<ContextMenuState | null>>;
    setDialogNodeId: Dispatch<SetStateAction<string | null>>;
    setDrawingNodeId: Dispatch<SetStateAction<string | null>>;
    onReplaceReference?: (targetNodeId: string, oldReference: { id: string; nodeId?: string; label?: string; title?: string }, sourceNodeId: string) => void;
};

export type ConnectionReplaceHover = {
    targetNodeId: string;
    referenceLabel: string;
    clientX: number;
    clientY: number;
};

type ConnectionDropTarget = {
    nodeId: string | null;
    handleId?: string;
    anchorRatio?: number;
    isNearNode: boolean;
};

type BatchConnectionDropTarget = ConnectionDropTarget & { rejection?: string };

// LibTV's 80px world-space quick-add zone renders at roughly 110px on the
// reference canvas. Use the same generous 112px screen-space diameter here,
// while retaining a circular boundary around the corresponding side anchor.
const CONNECTION_SNAP_RADIUS = 56;
const BATCH_PRESS_GUARD_MS = 500;
const BATCH_OVERLAY_SELECTOR = '[data-canvas-node-panel], [data-connection-create-menu], .ant-modal, .ant-popover, .ant-dropdown, .ant-select-dropdown, [role="dialog"], [role="menu"], [role="listbox"]';
const NODE_STATUS_IDLE = "idle" as const;

function selectRunningHubWorkflow(config: AiConfig) {
    const capability = normalizeRunningHubCapability(config.runningHub.capability);
    return (
        config.runningHub.workflows.find((item) => item.workflowId.trim() === config.runningHub.workflowId.trim() && (item.kind === "app" ? "app" : "workflow") === config.runningHub.selectedKind) ||
        config.runningHub.workflows.find((item) => normalizeRunningHubCapability(item.capability, capability) === capability) ||
        config.runningHub.workflows[0]
    );
}

export function useCanvasConnectionController({
    projectId,
    config,
    defaultDrawingEngine,
    nodesRef,
    connectionsRef,
    viewportRef,
    scriptScrollTopById,
    screenToCanvas,
    revealCreatedNode,
    setNodes,
    setConnections,
    setSelectedNodeIds,
    setSelectedConnectionId,
    setContextMenu,
    setDialogNodeId,
    setDrawingNodeId,
    onReplaceReference,
}: UseCanvasConnectionControllerOptions) {
    const { message } = App.useApp();
    const tldrawLicenseKey = useUserStore((state) => state.drawingEngine.tldrawLicenseKey);
    const runtimeStatuses = usePluginStore((state) => state.runtimeStatuses);
    const [connectingParams, setConnectingParams] = useState<ConnectionHandle | null>(null);
    const [connectionTargetNodeId, setConnectionTargetNodeId] = useState<string | null>(null);
    const [connectionApproach, setConnectionApproach] = useState<CanvasConnectionApproach>(null);
    const [connectionTargetAnchorRatio, setConnectionTargetAnchorRatio] = useState<number | undefined>();
    const [connectionReplaceHover, setConnectionReplaceHover] = useState<ConnectionReplaceHover | null>(null);
    const [pendingConnectionCreate, setPendingConnectionCreate] = useState<PendingConnectionCreate | null>(null);
    const [batchConnectionPreview, setBatchConnectionPreview] = useState<CanvasBatchConnectionPreview | null>(null);
    const [mouseWorld, setMouseWorld] = useState<Position>({ x: 0, y: 0 });
    const connectingParamsRef = useRef(connectingParams);
    const connectingPointerIdRef = useRef<number | null>(null);
    const connectingPointerStartRef = useRef<Position | null>(null);
    const pendingConnectionCreateRef = useRef(pendingConnectionCreate);
    const batchConnectionPreviewRef = useRef<CanvasBatchConnectionPreview | null>(null);
    const batchConnectionPointerIdRef = useRef<number | null>(null);
    const pointerMoveFrameRef = useRef<number | null>(null);
    const latestPointerMoveRef = useRef<PointerEvent | null>(null);
    const hoveredReplaceElRef = useRef<HTMLElement | null>(null);
    const batchPressGuardRef = useRef<{ pointerId: number; timer: number | null } | null>(null);

    const releaseBatchPressGuard = useCallback(() => {
        const guard = batchPressGuardRef.current;
        if (!guard) return;
        if (guard.timer !== null) window.clearTimeout(guard.timer);
        batchPressGuardRef.current = null;
    }, []);



    const updateConnectionReplaceHover = useCallback((element: HTMLElement | null, clientX = 0, clientY = 0) => {
        if (hoveredReplaceElRef.current === element) {
            if (element) {
                setConnectionReplaceHover((prev) => (prev ? { ...prev, clientX, clientY } : null));
            }
            return;
        }
        if (hoveredReplaceElRef.current) {
            hoveredReplaceElRef.current.removeAttribute("data-connection-hover-replace");
        }
        hoveredReplaceElRef.current = element;
        if (element) {
            element.setAttribute("data-connection-hover-replace", "true");
            const targetNodeId = element.getAttribute("data-target-node-id") || "";
            const referenceLabel = element.getAttribute("data-reference-label") || currentLocaleText("canvasExtra.conn.sourceImage");
            setConnectionReplaceHover({ targetNodeId, referenceLabel, clientX, clientY });
        } else {
            setConnectionReplaceHover(null);
        }
    }, []);

    useLayoutEffect(() => {
        connectingParamsRef.current = connectingParams;
        pendingConnectionCreateRef.current = pendingConnectionCreate;
    }, [connectingParams, pendingConnectionCreate]);

    const updateBatchConnectionPreview = useCallback((next: CanvasBatchConnectionPreview | null) => {
        batchConnectionPreviewRef.current = next;
        setBatchConnectionPreview(next);
        setConnectionApproach((previous) => latchCanvasConnectionApproach(previous, next && next.status !== "invalid" ? next.targetNodeId : null, next?.mouseWorld || { x: 0, y: 0 }));
    }, []);

    const clearBatchConnection = useCallback(() => {
        batchConnectionPointerIdRef.current = null;
        updateBatchConnectionPreview(null);
    }, [updateBatchConnectionPreview]);

    const setConnecting = useCallback(
        (next: ConnectionHandle | null) => {
            connectingParamsRef.current = next;
            setConnectingParams(next);
            if (!next) {
                updateConnectionReplaceHover(null);
                setConnectionApproach(null);
                connectingPointerIdRef.current = null;
                connectingPointerStartRef.current = null;
                setConnectionTargetNodeId(null);
                setConnectionTargetAnchorRatio(undefined);
            }
        },
        [updateConnectionReplaceHover],
    );

    const closeConnectionCreateMenu = useCallback(() => {
        pendingConnectionCreateRef.current = null;
        setPendingConnectionCreate(null);
    }, []);

    const openTourConnectionCreateMenu = useCallback(
        (nodeId: string) => {
            const node = nodesRef.current.find((item) => item.id === nodeId);
            if (!node) return;
            const pending: PendingConnectionCreate = {
                connection: { nodeId, handleType: "source", anchorRatio: 0.5 },
                position: { x: node.position.x + node.width + 80, y: node.position.y + node.height / 2 },
                quick: true,
            };
            pendingConnectionCreateRef.current = pending;
            setPendingConnectionCreate(pending);
        },
        [nodesRef],
    );

    const cancelPendingConnectionCreate = useCallback(() => {
        closeConnectionCreateMenu();
        setConnecting(null);
        clearBatchConnection();
    }, [clearBatchConnection, closeConnectionCreateMenu, setConnecting]);

    const previewBatchConnection = useCallback(
        (sourceNodeIds: string[], targetNodeId: string | null, targetHandleId: string | undefined, targetAnchorRatio: number | undefined, mouseWorld: Position) => {
            const plan = targetNodeId ? planBatchConnections({ sourceNodeIds, targetNodeId, targetHandleId, targetAnchorRatio, nodes: nodesRef.current, connections: connectionsRef.current, config }) : null;
            const eligibleSourceCount = sourceNodeIds.filter((id) => {
                const node = nodesRef.current.find((item) => item.id === id);
                return Boolean(node && !batchSourceRestriction(node));
            }).length;
            const status = !targetNodeId || !plan ? "idle" : plan.connections.length === eligibleSourceCount ? "valid" : plan.connections.length ? "partial" : "invalid";
            updateBatchConnectionPreview({ sourceNodeIds, targetNodeId, targetHandleId, targetAnchorRatio, mouseWorld, status });
            return plan;
        },
        [config, connectionsRef, nodesRef, updateBatchConnectionPreview],
    );

    const commitBatchConnection = useCallback(
        (sourceNodeIds: string[], targetNodeId: string, targetHandleId?: string, targetAnchorRatio?: number) => {
            const plan = planBatchConnections({ sourceNodeIds, targetNodeId, targetHandleId, targetAnchorRatio, nodes: nodesRef.current, connections: connectionsRef.current, config });
            if (!plan.connections.length) {
                const reason = plan.skipped[0]?.reason ? connectionReason(plan.skipped[0].reason) : currentLocaleText(plan.duplicates.length ? "canvasExtra.ap.noopAlreadyConnected" : "canvasExtra.conn.noConnectable");
                message.warning(reason);
                return plan;
            }
            setNodes((currentNodes) =>
                prefillCanvasConnectedMediaPrompt(
                    plan.connections.reduce((current, connection) => attachNodeToStoryboardRow(current, connection), currentNodes),
                    [...connectionsRef.current, ...plan.connections],
                    targetNodeId,
                ),
            );
            setConnections((currentConnections) => [...currentConnections, ...plan.connections]);
            setContextMenu(null);
            const skippedCount = plan.skipped.length;
            const duplicateCount = plan.duplicates.length;
            const suffix = skippedCount || duplicateCount ? currentLocaleText("canvasExtra.conn.skipSuffix", { count: skippedCount + duplicateCount }) : "";
            if (skippedCount) message.warning(currentLocaleText("canvasExtra.conn.connectedWithSkip", { count: plan.connected.length, suffix, reason: connectionReason(plan.skipped[0].reason) }));
            else message.success(currentLocaleText("canvasExtra.conn.connected", { count: plan.connected.length, suffix }));
            return plan;
        },
        [config, connectionsRef, message, nodesRef, setConnections, setContextMenu, setNodes],
    );

    const connectNodes = useCallback(
        (current: ConnectionHandle, targetNodeId: string, targetHandleId?: string, targetAnchorRatio?: number) => {
            if (current.nodeId === targetNodeId) return;
            const connection = normalizeConnection(current.nodeId, targetNodeId, nodesRef.current, current.handleType);
            if (!connection) {
                message.warning(currentLocaleText("canvasExtra.conn.configNodesCannotConnect"));
                return;
            }
            const { fromNodeId, toNodeId } = connection;
            const fromHandleId = fromNodeId === current.nodeId ? current.handleId : targetHandleId;
            const toHandleId = toNodeId === current.nodeId ? current.handleId : targetHandleId;
            const fromAnchorRatio = fromNodeId === current.nodeId ? current.anchorRatio : targetAnchorRatio;
            const toAnchorRatio = toNodeId === current.nodeId ? current.anchorRatio : targetAnchorRatio;
            let directorPlan;
            try {
                directorPlan = connectDirectorDownstream(nodesRef.current, connectionsRef.current, fromNodeId, { nodeId: toNodeId, rowId: toHandleId?.startsWith("row:") ? toHandleId.slice(4) : undefined, label: "" }, config);
            } catch (error) {
                message.warning(connectionReason(error instanceof Error ? error.message : String(error)));
                return;
            }
            if (directorPlan.nodes !== nodesRef.current) {
                setNodes(directorPlan.nodes);
                setConnections(directorPlan.connections);
                setContextMenu(null);
                return;
            }
            const policyError = canvasConnectionError(config, nodesRef.current, connectionsRef.current, { fromNodeId, toNodeId });
            if (policyError) {
                message.warning(connectionReason(policyError));
                return;
            }
            const exists = connectionsRef.current.find((item) => item.fromNodeId === fromNodeId && item.toNodeId === toNodeId && item.fromHandleId === fromHandleId && item.toHandleId === toHandleId);
            if (exists) {
                setConnections((currentConnections) => currentConnections.map((item) => (item.id === exists.id ? { ...item, fromAnchorRatio, toAnchorRatio } : item)));
            } else {
                setConnections((currentConnections) => [...currentConnections, { id: `conn-${Date.now()}`, fromNodeId, toNodeId, fromHandleId, toHandleId, fromAnchorRatio, toAnchorRatio }]);
                setNodes((currentNodes) => prefillCanvasConnectedMediaPrompt(attachNodeToStoryboardRow(currentNodes, { fromNodeId, toNodeId, fromHandleId, toHandleId }), [...connectionsRef.current, { id: "pending", fromNodeId, toNodeId }], toNodeId));
            }
            setContextMenu(null);
        },
        [config, connectionsRef, message, nodesRef, setConnections, setContextMenu, setNodes],
    );

    const createConnectedNode = useCallback(
        async (
            type: CanvasNodeType.Image | CanvasNodeType.Text | CanvasNodeType.Script | CanvasNodeType.BatchTable | CanvasNodeType.Video | CanvasNodeType.Audio | CanvasNodeType.Drawing | CanvasNodeType.Config | CanvasNodeType.MediaConversion | "depth-capture",
            pending: PendingConnectionCreate,
            workflowProvider?: "runninghub",
        ) => {
            const depthCapture = type === "depth-capture";
            const nodeType = depthCapture ? CanvasNodeType.MediaConversion : type;
            if (nodeType === CanvasNodeType.Drawing && !isDrawingEngineAvailable(defaultDrawingEngine, tldrawLicenseKey)) {
                message.error(currentLocaleText("canvasExtra.nodeOps.tldrawLicenseMissing"));
                closeConnectionCreateMenu();
                setConnecting(null);
                return;
            }
            const batchSourceNodeIds = pending.batchSourceNodeIds?.length ? Array.from(new Set(pending.batchSourceNodeIds)) : [];
            const batchSourceNodes = batchSourceNodeIds.map((nodeId) => nodesRef.current.find((node) => node.id === nodeId)).filter((node): node is CanvasNodeData => Boolean(node));
            const storyboardRow = batchSourceNodeIds.length ? undefined : nodeType === CanvasNodeType.Video ? storyboardRowFromHandle(nodesRef.current, pending.connection.nodeId, pending.connection.handleId) : undefined;
            const videoPrompt = storyboardRow ? (storyboardRow.videoMotionPrompt || storyboardRow.plotDescription).trim() : "";
            const sourceNode = pending.connection.handleType === "source" ? nodesRef.current.find((node) => node.id === pending.connection.nodeId) : undefined;
            const batchScriptPrompt = batchSourceNodes
                .filter((node) => node.type === CanvasNodeType.Text)
                .map((node) => (node.metadata?.content || node.metadata?.prompt || "").trim())
                .filter(Boolean)
                .join("\n\n");
            const scriptPrompt = nodeType === CanvasNodeType.Script ? (batchSourceNodeIds.length ? batchScriptPrompt : sourceNode?.type === CanvasNodeType.Text ? (sourceNode.metadata?.content || sourceNode.metadata?.prompt || "").trim() : "") : "";
            const selectedWorkflowProvider = nodeType === CanvasNodeType.Config ? workflowProvider || (workflowProviderPluginEnabled(runtimeStatuses, "runninghub") ? "runninghub" : undefined) : undefined;
            if (selectedWorkflowProvider && !workflowProviderPluginEnabled(runtimeStatuses, selectedWorkflowProvider)) {
                message.error(currentLocaleText("canvasExtra.nodeOps.workflowPluginDisabled", { provider: "RunningHub" }));
                closeConnectionCreateMenu();
                setConnecting(null);
                return;
            }
            const runningHubWorkflow = selectedWorkflowProvider === "runninghub" ? selectRunningHubWorkflow(config) : undefined;
            const workflowCapability = normalizeRunningHubCapability(runningHubWorkflow?.capability, normalizeRunningHubCapability(config.runningHub.capability));
            const metadata: CanvasNodeMetadata | undefined =
                depthCapture ? { mediaConversion: { schemaVersion: 1, operation: "depth", videoDepthOnly: true, status: "idle" } } : nodeType === CanvasNodeType.Config
                    ? {
                          generationMode: selectedWorkflowProvider ? (workflowCapability === "video" ? ("video" as const) : workflowCapability === "audio" ? ("audio" as const) : ("image" as const)) : ("image" as const),
                          workflowProvider: selectedWorkflowProvider || "model",
                          status: NODE_STATUS_IDLE,
                          ...(selectedWorkflowProvider === "runninghub"
                              ? {
                                    workflowTitle: "RunningHub 工作流",
                                    ...(runningHubWorkflow ? { runningHubWorkflowId: runningHubWorkflow.workflowId, runningHubWorkflowKind: runningHubWorkflow.kind === "app" ? ("app" as const) : ("workflow" as const) } : {}),
                                }
                              : {}),
                      }
                    : nodeType === CanvasNodeType.Drawing
                      ? { drawingEngine: defaultDrawingEngine }
                      : nodeType === CanvasNodeType.Script && scriptPrompt
                        ? { prompt: scriptPrompt, composerContent: scriptPrompt }
                        : nodeType === CanvasNodeType.Video && storyboardRow
                          ? {
                                prompt: videoPrompt,
                                composerContent: videoPrompt,
                                ...storyboardPromptTemplateMetadata(storyboardRow, "video"),
                                generationMode: "video" as const,
                                videoEditOperation: "text_to_video" as const,
                                workflowKind: "shot" as const,
                                workflowTitle: currentLocaleText("canvasExtra.conn.shotVideoTitle", { number: storyboardRow.shotNumber }),
                                shotIndex: storyboardRow.shotNumber,
                                seconds: String(storyboardRow.durationSeconds),
                                status: NODE_STATUS_IDLE,
                            }
                          : undefined;
            const sourceNodeForQuickCreate = pending.quick ? nodesRef.current.find((node) => node.id === pending.connection.nodeId) : undefined;
            const spec = getNodeSpec(nodeType);
            const anchorY = sourceNodeForQuickCreate ? sourceNodeForQuickCreate.position.y + sourceNodeForQuickCreate.height * (pending.connection.anchorRatio ?? 0.5) : pending.position.y;
            const position = sourceNodeForQuickCreate
                ? {
                      x: pending.connection.handleType === "source" ? sourceNodeForQuickCreate.position.x + sourceNodeForQuickCreate.width + 96 + spec.width / 2 : sourceNodeForQuickCreate.position.x - 96 - spec.width / 2,
                      y: anchorY,
                  }
                : batchSourceNodeIds.length
                  ? pending.position
                  : connectedNodeCenterFromEdgeDrop(pending.position, spec, pending.connection.handleType);
            let videoDefaults: Partial<CanvasNodeMetadata> = {};
            if (nodeType === CanvasNodeType.Video && sourceNode && (sourceNode.type === CanvasNodeType.Image || storyboardRow || isDepthReferenceVideo(sourceNode))) {
                const draft = createCanvasNode(nodeType, position, metadata);
                const edge = { id: "video-defaults", fromNodeId: sourceNode.id, toNodeId: draft.id, fromHandleId: pending.connection.handleId };
                const inputs = getGenerationResourceNodes(draft.id, [...nodesRef.current, draft], [...connectionsRef.current, edge]);
                try {
                    videoDefaults = economicalVideoSettings(config, upstreamVideoRatio(sourceNode, config.size), storyboardVideoRequirements(inputs), storyboardRow?.durationSeconds);
                } catch (error) {
                    message.warning(error instanceof Error ? error.message : currentLocaleText("canvasExtra.conn.cannotConnect"));
                    return;
                }
            }
            const newNode = createCanvasNode(nodeType, position, { ...metadata, ...videoDefaults });
            const opensComposer = nodeType !== CanvasNodeType.Script && nodeType !== CanvasNodeType.Text && nodeType !== CanvasNodeType.BatchTable && nodeType !== CanvasNodeType.Audio && nodeType !== CanvasNodeType.MediaConversion && nodeType !== CanvasNodeType.Drawing;
            // 相邻节点间距较小时，默认落点会压在已有节点上（例如在两个节点之间创建上游节点）；按最近空位让开。
            newNode.position = findAvailableGenerationGroupPosition(nodesRef.current, newNode.position, { width: newNode.width, height: newNode.height });
            if (nodeType === CanvasNodeType.BatchTable || nodeType === CanvasNodeType.MediaConversion) newNode.title = localizedNodeLabel(nodeType, currentLocaleText);
            if (nodeType === CanvasNodeType.Config && selectedWorkflowProvider) newNode.title = currentLocaleText("canvasExtra.configNode.runningHubWorkflowTitle");
            if (depthCapture) newNode.title = currentLocaleText("canvasExtra.tool.depthCapture");
            if (storyboardRow) newNode.title = currentLocaleText("canvasExtra.conn.shotVideoNodeTitle", { number: storyboardRow.shotNumber });
            if (batchSourceNodeIds.length && nodeType === CanvasNodeType.Drawing) {
                message.error(currentLocaleText("canvasExtra.conn.batchDrawingUnsupported"));
                closeConnectionCreateMenu();
                setConnecting(null);
                return;
            }
            const batchPlan = batchSourceNodeIds.length
                ? planBatchConnections({ sourceNodeIds: batchSourceNodeIds, targetNodeId: newNode.id, nodes: [...nodesRef.current, newNode], connections: connectionsRef.current, config, allowCapacityOverflow: true })
                : null;
            if (batchPlan) {
                if (!batchPlan.connections.length) {
                    const detail = batchPlan.skipped
                        .slice(0, 3)
                        .map((item) => item.reason)
                        .join("；");
                    message.warning(detail ? currentLocaleText("canvasExtra.conn.noConnectableDetail", { detail }) : currentLocaleText("canvasExtra.conn.noConnectable"));
                    closeConnectionCreateMenu();
                    setConnecting(null);
                    return;
                }
                const nextConnections = [...connectionsRef.current, ...batchPlan.connections];
                const nextNodes = prefillCanvasConnectedMediaPrompt(
                    batchPlan.connections.reduce((currentNodes, connection) => attachNodeToStoryboardRow(currentNodes, connection), [...nodesRef.current, newNode]),
                    nextConnections,
                    newNode.id,
                );
                nodesRef.current = nextNodes;
                connectionsRef.current = nextConnections;
                setNodes(nextNodes);
                setConnections(nextConnections);
                setSelectedNodeIds(new Set([newNode.id]));
                setSelectedConnectionId(null);
                setDialogNodeId(opensComposer ? newNode.id : null);
                revealCreatedNode(newNode, opensComposer);
                const skippedCount = batchPlan.skipped.length;
                const duplicateCount = batchPlan.duplicates.length;
                const suffix = skippedCount || duplicateCount ? currentLocaleText("canvasExtra.conn.skipSuffix", { count: skippedCount + duplicateCount }) : "";
                if (skippedCount) message.warning(currentLocaleText("canvasExtra.conn.createdAndConnectedWithSkip", { count: batchPlan.connections.length, suffix, reason: batchPlan.skipped[0].reason }));
                else message.success(currentLocaleText("canvasExtra.conn.createdAndConnected", { count: batchPlan.connections.length, suffix }));
                closeConnectionCreateMenu();
                setConnecting(null);
                return;
            }
            const connection = normalizeConnection(pending.connection.nodeId, newNode.id, [...nodesRef.current, newNode], pending.connection.handleType);
            if (!connection) {
                message.warning(currentLocaleText("canvasExtra.conn.cannotConnect"));
                closeConnectionCreateMenu();
                setConnecting(null);
                return;
            }
            const policyError = canvasConnectionError(config, [...nodesRef.current, newNode], connectionsRef.current, connection);
            if (policyError) {
                message.warning(connectionReason(policyError));
                closeConnectionCreateMenu();
                setConnecting(null);
                return;
            }
            if (nodeType === CanvasNodeType.Drawing) {
                const drawingSourceNode = nodesRef.current.find((node) => node.id === pending.connection.nodeId);
                const sourceUrl = drawingSourceNode?.type === CanvasNodeType.Image ? drawingSourceNode.metadata?.content : "";
                if (pending.connection.handleType !== "source" || !drawingSourceNode || !sourceUrl || !newNode.metadata?.drawingId) {
                    message.error(currentLocaleText("canvasExtra.conn.drawingNeedsImageOutput"));
                    closeConnectionCreateMenu();
                    setConnecting(null);
                    return;
                }
                closeConnectionCreateMenu();
                setConnecting(null);
                try {
                    const saved = await createCanvasDrawingFromImage(projectId, newNode.metadata.drawingId, defaultDrawingEngine, {
                        url: sourceUrl,
                        storageKey: drawingSourceNode.metadata?.storageKey,
                        name: drawingSourceNode.title || currentLocaleText("canvasExtra.conn.sourceImage"),
                        mimeType: drawingSourceNode.metadata?.mimeType,
                    });
                    newNode.title = `${drawingSourceNode.title || currentLocaleText("canvasExtra.conn.sourceImage")}${currentLocaleText("canvasExtra.conn.drawingSuffix")}`;
                    newNode.metadata = {
                        ...newNode.metadata,
                        drawingEngine: saved.engine,
                        drawingRevision: saved.revision,
                        drawingUpdatedAt: saved.updatedAt,
                        drawingShapeCount: saved.shapeCount,
                        drawingPageCount: saved.pageCount,
                    };
                } catch (error) {
                    message.error(error instanceof Error ? currentLocaleText("canvasExtra.conn.drawingCreateFailedDetail", { message: error.message }) : currentLocaleText("canvasExtra.conn.drawingCreateFailed"));
                    return;
                }
            }
            const fromHandleId = connection.fromNodeId === pending.connection.nodeId ? pending.connection.handleId : undefined;
            const toHandleId = connection.toNodeId === pending.connection.nodeId ? pending.connection.handleId : undefined;
            const fromAnchorRatio = connection.fromNodeId === pending.connection.nodeId ? pending.connection.anchorRatio : 0.5;
            const toAnchorRatio = connection.toNodeId === pending.connection.nodeId ? pending.connection.anchorRatio : 0.5;
            const connected = { ...connection, fromHandleId, toHandleId, fromAnchorRatio, toAnchorRatio };
            setNodes((currentNodes) => prefillCanvasConnectedMediaPrompt(attachNodeToStoryboardRow([...currentNodes, newNode], connected), [...connectionsRef.current, { id: "pending", ...connected }], connected.toNodeId));
            setConnections((currentConnections) => [...currentConnections, { id: nanoid(), ...connected }]);
            setSelectedNodeIds(new Set([newNode.id]));
            setSelectedConnectionId(null);
            if (nodeType === CanvasNodeType.Drawing) setDrawingNodeId(newNode.id);
            setDialogNodeId(opensComposer ? newNode.id : null);
            revealCreatedNode(newNode, opensComposer);
            closeConnectionCreateMenu();
            setConnecting(null);
        },
        [
            closeConnectionCreateMenu,
            config,
            connectionsRef,
            defaultDrawingEngine,
            message,
            nodesRef,
            projectId,
            revealCreatedNode,
            runtimeStatuses,
            setConnecting,
            setConnections,
            setDialogNodeId,
            setDrawingNodeId,
            setNodes,
            setSelectedConnectionId,
            setSelectedNodeIds,
            tldrawLicenseKey,
        ],
    );

    const getConnectionCreateDisabledReason = useCallback(
        (
            type: CanvasNodeType.Image | CanvasNodeType.Text | CanvasNodeType.Script | CanvasNodeType.BatchTable | CanvasNodeType.Video | CanvasNodeType.Audio | CanvasNodeType.Drawing | CanvasNodeType.Config | CanvasNodeType.MediaConversion | "depth-capture",
            pending: PendingConnectionCreate,
            workflowProvider?: "runninghub",
        ) => {
            const depthCapture = type === "depth-capture";
            const nodeType = depthCapture ? CanvasNodeType.MediaConversion : type;
            if (depthCapture && (pending.connection.handleType !== "source" || pending.batchSourceNodeIds?.length || nodesRef.current.find(node => node.id === pending.connection.nodeId)?.type !== CanvasNodeType.Video)) {
                return currentLocaleText("canvasExtra.mediaConv.depthVideoHint");
            }
            if (nodeType === CanvasNodeType.Config) {
                if (workflowProvider && !workflowProviderPluginEnabled(runtimeStatuses, workflowProvider)) return currentLocaleText("canvasExtra.nodeOps.workflowPluginDisabled", { provider: "RunningHub" });
            }
            if (pending.batchSourceNodeIds?.length) {
                if (nodeType === CanvasNodeType.Drawing || nodeType === CanvasNodeType.Config) return currentLocaleText("canvasExtra.conn.batchTypeUnsupported");
                const pendingNode: CanvasNodeData = { id: "__pending-connection-node__", type: nodeType, title: "", position: pending.position, width: getNodeSpec(nodeType).width, height: getNodeSpec(nodeType).height };
                const plan = planBatchConnections({ sourceNodeIds: pending.batchSourceNodeIds, targetNodeId: pendingNode.id, nodes: [...nodesRef.current, pendingNode], connections: connectionsRef.current, config, allowCapacityOverflow: true });
                return plan.connections.length ? "" : plan.skipped[0]?.reason ? connectionReason(plan.skipped[0].reason) : currentLocaleText("canvasExtra.conn.selectedCannotConnectToType");
            }
            const spec = getNodeSpec(nodeType);
            const pendingNode: CanvasNodeData = { id: "__pending-connection-node__", type: nodeType, title: "", position: pending.position, width: spec.width, height: spec.height };
            const pendingNodes = [...nodesRef.current, pendingNode];
            const connection = normalizeConnection(pending.connection.nodeId, pendingNode.id, pendingNodes, pending.connection.handleType);
            if (!connection) return currentLocaleText("canvasExtra.conn.nodeTypeCannotConnectThisWay");
            return connectionReason(canvasConnectionError(config, pendingNodes, connectionsRef.current, connection));
        },
        [config, connectionsRef, nodesRef, runtimeStatuses],
    );

    const getConnectionDropTarget = useCallback(
        (clientX: number, clientY: number, current: ConnectionHandle): ConnectionDropTarget => {
            const hitElement = document.elementFromPoint(clientX, clientY);
            if (hitElement?.closest('[data-canvas-node-panel], [data-connection-create-menu], .ant-modal, .ant-popover, .ant-dropdown, [role="dialog"]')) return { nodeId: null, isNearNode: true };
            const hitNodeId = hitElement?.closest<HTMLElement>("[data-node-id]")?.dataset.nodeId;
            const explicitStoryboardHandle = hitElement?.closest<HTMLElement>("[data-storyboard-handle-id]");
            const world = screenToCanvas(clientX, clientY);
            const scale = Math.max(viewportRef.current.k, 0.05);
            const handleRadius = CONNECTION_SNAP_RADIUS / scale;
            let isNearNode = false;
            let bestNodeId: string | null = null;
            let bestHandleId: string | undefined;
            let bestAnchorRatio: number | undefined;
            let bestPriority = Number.POSITIVE_INFINITY;

            [...nodesRef.current]
                .filter((node) => !isHiddenBatchChild(node, nodesRef.current) && !isNodeHiddenByCollapsedFrame(node, nodesRef.current) && !isFrameNode(node))
                .reverse()
                .forEach((node) => {
                    if (hitNodeId && hitNodeId !== node.id) return;
                    const scrollTop = scriptScrollTopById[node.id] || 0;
                    const hitsNodeBody = hitNodeId === node.id && world.x >= node.position.x && world.x <= node.position.x + node.width && world.y >= node.position.y && world.y <= node.position.y + node.height;
                    const nodeAnchor = getConnectionTargetAnchor(node, current);
                    const hitsStoryboardInput = node.type === CanvasNodeType.Script && Math.hypot(world.x - nodeAnchor.x, world.y - nodeAnchor.y) <= handleRadius;
                    const explicitHandleId = explicitStoryboardHandle?.dataset.storyboardNodeId === node.id ? explicitStoryboardHandle.dataset.storyboardHandleId : undefined;
                    // Only a real row pin binds a row; body/input drops are global.
                    const targetHandleId = node.type === CanvasNodeType.Script ? explicitHandleId || "storyboard:context" : node.type === CanvasNodeType.BatchTable ? batchReferenceHandleAtY(node, world.y, handleRadius) : undefined;
                    if ((node.type === CanvasNodeType.Script || node.type === CanvasNodeType.BatchTable) && !targetHandleId) return;
                    // Ordinary nodes expose one centered input/output port. Only
                    // storyboard rows have a meaningful vertical target position.
                    const targetAnchorRatio = undefined;
                    const anchor = getConnectionTargetAnchor(node, current, targetHandleId, scrollTop);
                    const dx = world.x - anchor.x;
                    const dy = world.y - anchor.y;
                    const hitsSnapZone = Boolean(explicitHandleId) || hitsNodeBody || hitsStoryboardInput || dx * dx + dy * dy <= handleRadius * handleRadius;
                    if (!hitsSnapZone) return;
                    isNearNode = true;
                    const normalized = node.id === current.nodeId ? null : normalizeConnection(current.nodeId, node.id, nodesRef.current, current.handleType);
                    if (!normalized || canvasConnectionError(config, nodesRef.current, connectionsRef.current, normalized)) return;
                    if (1 < bestPriority) {
                        bestNodeId = node.id;
                        bestHandleId = targetHandleId;
                        bestAnchorRatio = targetAnchorRatio;
                        bestPriority = 1;
                    }
                });
            return { nodeId: bestNodeId, handleId: bestHandleId, anchorRatio: bestAnchorRatio, isNearNode };
        },
        [config, connectionsRef, nodesRef, screenToCanvas, scriptScrollTopById, viewportRef],
    );

    const getBatchConnectionDropTarget = useCallback(
        (clientX: number, clientY: number, sourceNodeIds: string[]): BatchConnectionDropTarget => {
            const hitElement = document.elementFromPoint(clientX, clientY);
            if (hitElement?.closest(BATCH_OVERLAY_SELECTOR)) return { nodeId: null, isNearNode: true };
            const hitNodeId = hitElement?.closest<HTMLElement>("[data-node-id]")?.dataset.nodeId;
            const explicitStoryboardHandle = hitElement?.closest<HTMLElement>("[data-storyboard-handle-id]");
            const source = sourceNodeIds.map((id) => nodesRef.current.find((node) => node.id === id)).find((node): node is CanvasNodeData => Boolean(node && !batchSourceRestriction(node)));
            if (!source) return { nodeId: null, isNearNode: false };

            const world = screenToCanvas(clientX, clientY);
            const scale = Math.max(viewportRef.current.k, 0.05);
            const handleRadius = CONNECTION_SNAP_RADIUS / scale;
            let isNearNode = false;
            let rejection: string | undefined;
            let bestNodeId: string | null = null;
            let bestHandleId: string | undefined;
            let bestAnchorRatio: number | undefined;
            let bestPriority = Number.POSITIVE_INFINITY;
            const current: ConnectionHandle = { nodeId: source.id, handleType: "source" };

            [...nodesRef.current]
                .filter((node) => !isHiddenBatchChild(node, nodesRef.current) && !isNodeHiddenByCollapsedFrame(node, nodesRef.current) && !isFrameNode(node))
                .reverse()
                .forEach((node) => {
                    if (hitNodeId && hitNodeId !== node.id) return;
                    const scrollTop = scriptScrollTopById[node.id] || 0;
                    const hitsNodeBody = hitNodeId === node.id;
                    const nodeAnchor = getConnectionTargetAnchor(node, current);
                    const hitsStoryboardInput = node.type === CanvasNodeType.Script && Math.hypot(world.x - nodeAnchor.x, world.y - nodeAnchor.y) <= handleRadius;
                    const explicitHandleId = explicitStoryboardHandle?.dataset.storyboardNodeId === node.id ? explicitStoryboardHandle.dataset.storyboardHandleId : undefined;
                    const targetHandleId = node.type === CanvasNodeType.Script ? explicitHandleId || "storyboard:context" : node.type === CanvasNodeType.BatchTable ? batchReferenceHandleAtY(node, world.y, handleRadius) : undefined;
                    if (node.type === CanvasNodeType.BatchTable && !targetHandleId) {
                        if (hitsNodeBody) {
                            isNearNode = true;
                            rejection = currentLocaleText("canvasExtra.conn.tablePort");
                        }
                        return;
                    }
                    const targetAnchorRatio = undefined;
                    const anchor = getConnectionTargetAnchor(node, current, targetHandleId, scrollTop);
                    const dx = world.x - anchor.x;
                    const dy = world.y - anchor.y;
                    const hitsSnapZone = Boolean(explicitHandleId) || hitsNodeBody || hitsStoryboardInput || dx * dx + dy * dy <= handleRadius * handleRadius;
                    if (!hitsSnapZone) return;
                    isNearNode = true;
                    if (!hasBatchConnectionCandidate(sourceNodeIds, node.id, nodesRef.current)) {
                        const plan = planBatchConnections({ sourceNodeIds, targetNodeId: node.id, targetHandleId, nodes: nodesRef.current, connections: connectionsRef.current, config });
                        rejection ??= plan.skipped.length ? connectionReason(plan.skipped[0].reason) : currentLocaleText("canvasExtra.conn.noConnectable");
                        return;
                    }
                    if (1 < bestPriority) {
                        bestNodeId = node.id;
                        bestHandleId = targetHandleId;
                        bestAnchorRatio = targetAnchorRatio;
                        bestPriority = 1;
                    }
                });
            return { nodeId: bestNodeId, handleId: bestHandleId, anchorRatio: bestAnchorRatio, rejection, isNearNode };
        },
        [config, connectionsRef, nodesRef, screenToCanvas, scriptScrollTopById, viewportRef],
    );

    const startBatchConnection = useCallback(
        (event: ReactPointerEvent, sourceNodeIds: string[]) => {
            const eligible = sourceNodeIds.filter((id) => {
                const node = nodesRef.current.find((item) => item.id === id);
                return Boolean(node && !batchSourceRestriction(node));
            });
            if (!eligible.length) {
                message.warning(currentLocaleText("canvasExtra.conn.noSourceInSelection"));
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            batchConnectionPointerIdRef.current = event.pointerId;
            setSelectedConnectionId(null);
            const mouseWorld = screenToCanvas(event.clientX, event.clientY);
            previewBatchConnection(eligible, null, undefined, undefined, mouseWorld);
        },
        [message, nodesRef, previewBatchConnection, screenToCanvas, setSelectedConnectionId],
    );

    const beginBatchConnectionMode = useCallback(
        (sourceNodeIds: string[]) => {
            const eligible = sourceNodeIds.filter((id) => {
                const node = nodesRef.current.find((item) => item.id === id);
                return Boolean(node && !batchSourceRestriction(node));
            });
            const source = eligible.map((id) => nodesRef.current.find((node) => node.id === id)).find((node): node is CanvasNodeData => Boolean(node));
            if (!source) {
                message.warning(currentLocaleText("canvasExtra.conn.noSourceInSelection"));
                return;
            }
            previewBatchConnection(eligible, null, undefined, undefined, { x: source.position.x + source.width, y: source.position.y + source.height / 2 });
            setSelectedConnectionId(null);
        },
        [message, nodesRef, previewBatchConnection, setSelectedConnectionId],
    );

    const submitBatchConnection = useCallback((sourceNodeIds: string[], target: BatchConnectionDropTarget, options: { keepPreviewOnReject?: boolean } = {}) => {
        if (target.nodeId) {
            const plan = commitBatchConnection(sourceNodeIds, target.nodeId, target.handleId, target.anchorRatio);
            if (plan.connections.length || !options.keepPreviewOnReject) clearBatchConnection();
            return true;
        }
        if (!target.isNearNode) return false;
        if (target.rejection) message.warning(target.rejection);
        if (!options.keepPreviewOnReject) clearBatchConnection();
        return true;
    }, [clearBatchConnection, commitBatchConnection, message]);

    const openBatchConnectionCreateMenu = useCallback(
        (clientX: number, clientY: number) => {
            const batch = batchConnectionPreviewRef.current;
            if (!batch) return false;
            const position = screenToCanvas(clientX, clientY);
            const request = buildBatchConnectionCreateRequest(batch.sourceNodeIds, nodesRef.current, position);
            if (!request) {
                clearBatchConnection();
                message.warning(currentLocaleText("canvasExtra.conn.noSourceInSelection"));
                return false;
            }
            const pending: PendingConnectionCreate = request;
            pendingConnectionCreateRef.current = pending;
            setPendingConnectionCreate(pending);
            setMouseWorld(position);
            clearBatchConnection();
            return true;
        },
        [clearBatchConnection, message, nodesRef, screenToCanvas],
    );

    const handleBatchConnectionTargetClick = useCallback(
        (event: ReactPointerEvent | ReactMouseEvent) => {
            if (!batchConnectionPreviewRef.current) return false;
            const ids = batchConnectionPreviewRef.current.sourceNodeIds;
            const completed = submitBatchConnection(ids, getBatchConnectionDropTarget(event.clientX, event.clientY, ids), { keepPreviewOnReject: true });
            if (!completed) message.warning(currentLocaleText("canvasExtra.conn.clickTargetInput"));
            return true;
        },
        [getBatchConnectionDropTarget, submitBatchConnection, message],
    );

    const finishConnection = useCallback(
        (clientX: number, clientY: number) => {
            updateConnectionReplaceHover(null);
            if (pendingConnectionCreateRef.current) return;
            const currentConnection = connectingParamsRef.current;
            if (!currentConnection) return;

            // 1. 如果是从输出端（source）拖出的连线，检查是否拖到了参考图卡片或参考区上进行替换
            if (currentConnection.handleType === "source" && typeof document !== "undefined") {
                const hitElement = document.elementFromPoint(clientX, clientY);
                if (hitElement) {
                    // A) 直接释放在提示词面板的参考图卡片上
                    const refChip = hitElement.closest<HTMLElement>("[data-reference-chip]");
                    if (refChip) {
                        const targetNodeId = refChip.getAttribute("data-target-node-id");
                        const oldNodeId = refChip.getAttribute("data-reference-node-id");
                        const oldLabel = refChip.getAttribute("data-reference-label") || "";
                        const oldRefId = refChip.getAttribute("data-reference-id") || "";
                        const oldTitle = refChip.getAttribute("data-reference-title") || oldLabel;
                        if (targetNodeId && oldNodeId && targetNodeId !== currentConnection.nodeId && onReplaceReference) {
                            if (oldNodeId === currentConnection.nodeId) {
                                setConnecting(null);
                                return;
                            }
                            onReplaceReference(targetNodeId, { id: oldRefId, nodeId: oldNodeId, label: oldLabel, title: oldTitle }, currentConnection.nodeId);
                            setConnecting(null);
                            return;
                        }
                    }

                    // B) 释放在提示词参考架容器内（自动就近匹配最近的参考卡片）
                    const refShelf = hitElement.closest<HTMLElement>(".canvas-node-composer-references");
                    if (refShelf) {
                        const chips = Array.from(refShelf.querySelectorAll<HTMLElement>("[data-reference-chip]"));
                        let closestChip: HTMLElement | null = null;
                        let minDistance = Number.POSITIVE_INFINITY;
                        chips.forEach((chip) => {
                            const rect = chip.getBoundingClientRect();
                            const centerX = rect.left + rect.width / 2;
                            const dist = Math.abs(clientX - centerX);
                            if (dist < minDistance) {
                                minDistance = dist;
                                closestChip = chip;
                            }
                        });
                        if (closestChip) {
                            const targetNodeId = (closestChip as HTMLElement).getAttribute("data-target-node-id");
                            const oldNodeId = (closestChip as HTMLElement).getAttribute("data-reference-node-id");
                            const oldLabel = (closestChip as HTMLElement).getAttribute("data-reference-label") || "";
                            const oldRefId = (closestChip as HTMLElement).getAttribute("data-reference-id") || "";
                            const oldTitle = (closestChip as HTMLElement).getAttribute("data-reference-title") || oldLabel;
                            if (targetNodeId && oldNodeId && targetNodeId !== currentConnection.nodeId && onReplaceReference) {
                                if (oldNodeId === currentConnection.nodeId) {
                                    setConnecting(null);
                                    return;
                                }
                                onReplaceReference(targetNodeId, { id: oldRefId, nodeId: oldNodeId, label: oldLabel, title: oldTitle }, currentConnection.nodeId);
                                setConnecting(null);
                                return;
                            }
                        }
                    }
                }
            }

            const dropTarget = getConnectionDropTarget(clientX, clientY, currentConnection);
            if (dropTarget.nodeId) {
                connectNodes(currentConnection, dropTarget.nodeId, dropTarget.handleId, dropTarget.anchorRatio);
                setConnecting(null);
            } else if (dropTarget.isNearNode) {
                setConnecting(null);
            } else {
                const position = screenToCanvas(clientX, clientY);
                setMouseWorld(position);
                const pending = { connection: currentConnection, position };
                pendingConnectionCreateRef.current = pending;
                setPendingConnectionCreate(pending);
            }
        },
        [connectNodes, getConnectionDropTarget, onReplaceReference, screenToCanvas, setConnecting, updateConnectionReplaceHover],
    );

    const handleConnectStart = useCallback(
        (event: ReactPointerEvent, nodeId: string, handleType: "source" | "target", handleId?: string, anchorRatio?: number) => {
            event.preventDefault();
            event.stopPropagation();
            // A new pin interaction always starts a fresh session. Without this
            // reset, an old quick-create menu can coexist with the new draft line;
            // pointerup then sees the stale pending menu and silently aborts.
            if (pendingConnectionCreateRef.current) closeConnectionCreateMenu();
            if (batchConnectionPreviewRef.current && handleType === "target") {
                commitBatchConnection(batchConnectionPreviewRef.current.sourceNodeIds, nodeId, handleId, anchorRatio);
                clearBatchConnection();
                return;
            }
            // A batch table exposes real target pins inside its content. When a normal
            // image output is dragged onto one, commit that active connection instead
            // of starting a new connection session from the target pin.
            const activeConnection = connectingParamsRef.current;
            if (activeConnection && handleType === "target" && activeConnection.nodeId !== nodeId) {
                connectNodes(activeConnection, nodeId, handleId, anchorRatio);
                setConnecting(null);
                return;
            }
            if (activeConnection) setConnecting(null);
            if (batchConnectionPreviewRef.current) clearBatchConnection();
            connectingPointerIdRef.current = event.pointerId;
            connectingPointerStartRef.current = { x: event.clientX, y: event.clientY };
            setMouseWorld(screenToCanvas(event.clientX, event.clientY));
            setConnecting({ nodeId, handleType, handleId, anchorRatio });
            setConnectionTargetNodeId(null);
            setConnectionTargetAnchorRatio(undefined);
            setSelectedConnectionId(null);
        },
        [clearBatchConnection, closeConnectionCreateMenu, commitBatchConnection, connectNodes, screenToCanvas, setConnecting, setSelectedConnectionId],
    );

    const handleConnectDrop = useCallback(
        (event: ReactPointerEvent, nodeId: string, handleId?: string) => {
            event.preventDefault();
            event.stopPropagation();
            if (batchConnectionPreviewRef.current) {
                commitBatchConnection(batchConnectionPreviewRef.current.sourceNodeIds, nodeId, handleId);
                clearBatchConnection();
                return;
            }
            const current = connectingParamsRef.current;
            if (!current || current.nodeId === nodeId) return;
            connectNodes(current, nodeId, handleId);
            setConnecting(null);
        },
        [clearBatchConnection, commitBatchConnection, connectNodes, setConnecting],
    );

    useEffect(() => {
        const cancelPendingPointerMove = () => {
            latestPointerMoveRef.current = null;
            if (pointerMoveFrameRef.current !== null) window.cancelAnimationFrame(pointerMoveFrameRef.current);
            pointerMoveFrameRef.current = null;
        };
        const flushPointerMove = () => {
            pointerMoveFrameRef.current = null;
            const event = latestPointerMoveRef.current;
            latestPointerMoveRef.current = null;
            if (!event) return;
            const batch = batchConnectionPreviewRef.current;
            if (batch && (batchConnectionPointerIdRef.current === null || batchConnectionPointerIdRef.current === event.pointerId)) {
                const target = getBatchConnectionDropTarget(event.clientX, event.clientY, batch.sourceNodeIds);
                const mouseWorld = screenToCanvas(event.clientX, event.clientY);
                previewBatchConnection(batch.sourceNodeIds, target.nodeId, target.handleId, target.anchorRatio, mouseWorld);
                return;
            }
            const current = connectingParamsRef.current;
            if (!current || connectingPointerIdRef.current !== event.pointerId || pendingConnectionCreateRef.current) return;
            if (current.handleType === "source" && typeof document !== "undefined") {
                const el = document.elementFromPoint(event.clientX, event.clientY);
                let chip = el?.closest<HTMLElement>("[data-reference-chip]");
                if (!chip) {
                    const shelf = el?.closest<HTMLElement>(".canvas-node-composer-references");
                    if (shelf) {
                        const chips = Array.from(shelf.querySelectorAll<HTMLElement>("[data-reference-chip]"));
                        let closestChip: HTMLElement | null = null;
                        let minDistance = Number.POSITIVE_INFINITY;
                        chips.forEach((c) => {
                            const rect = c.getBoundingClientRect();
                            const dist = Math.abs(event.clientX - (rect.left + rect.width / 2));
                            if (dist < minDistance) {
                                minDistance = dist;
                                closestChip = c;
                            }
                        });
                        chip = closestChip;
                    }
                }
                updateConnectionReplaceHover(chip || null, event.clientX, event.clientY);
            } else {
                updateConnectionReplaceHover(null);
            }
            const dropTarget = getConnectionDropTarget(event.clientX, event.clientY, current);
            const point = screenToCanvas(event.clientX, event.clientY);
            setConnectionApproach((previous) => latchCanvasConnectionApproach(previous, dropTarget.nodeId, point));
            setConnectionTargetNodeId(dropTarget.nodeId);
            setConnectionTargetAnchorRatio(dropTarget.anchorRatio);
            setMouseWorld(point);
        };
        const handlePointerMove = (event: PointerEvent) => {
            // Pointer events can arrive faster than the canvas can paint. Keep
            // only the latest position and update the preview once per frame,
            // which prevents redundant React/Leafer work and visible jitter.
            latestPointerMoveRef.current = event;
            if (pointerMoveFrameRef.current === null) pointerMoveFrameRef.current = window.requestAnimationFrame(flushPointerMove);
        };
        const handlePointerUp = (event: PointerEvent) => {
            latestPointerMoveRef.current = null;
            if (pointerMoveFrameRef.current !== null) {
                window.cancelAnimationFrame(pointerMoveFrameRef.current);
                pointerMoveFrameRef.current = null;
            }
            if (batchConnectionPointerIdRef.current === event.pointerId) {
                const batch = batchConnectionPreviewRef.current;
                if (batch && !submitBatchConnection(batch.sourceNodeIds, getBatchConnectionDropTarget(event.clientX, event.clientY, batch.sourceNodeIds))) {
                    openBatchConnectionCreateMenu(event.clientX, event.clientY);
                }
                return;
            }
            if (connectingPointerIdRef.current !== event.pointerId) return;
            const start = connectingPointerStartRef.current;
            if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 5) {
                const current = connectingParamsRef.current;
                if (current) {
                    const pending = { connection: current, position: screenToCanvas(event.clientX, event.clientY), quick: true };
                    pendingConnectionCreateRef.current = pending;
                    setPendingConnectionCreate(pending);
                    setConnecting(null);
                    return;
                }
            }
            finishConnection(event.clientX, event.clientY);
        };
        const handlePointerCancel = (event: PointerEvent) => {
            cancelPendingPointerMove();
            updateConnectionReplaceHover(null);
            if (batchConnectionPointerIdRef.current === event.pointerId) {
                clearBatchConnection();
                return;
            }
            if (connectingPointerIdRef.current === event.pointerId) setConnecting(null);
        };
        const cancel = () => {
            releaseBatchPressGuard();
            cancelPendingPointerMove();
            updateConnectionReplaceHover(null);
            if (connectingParamsRef.current) setConnecting(null);
            if (batchConnectionPreviewRef.current) clearBatchConnection();
        };
        const handleBatchPressCapture = (event: PointerEvent) => {
            releaseBatchPressGuard();
            const batch = batchConnectionPreviewRef.current;
            if (!batch || batchConnectionPointerIdRef.current !== null || event.button !== 0) return;
            const element = event.target instanceof Element ? event.target : null;
            if (!element?.closest("[data-canvas-viewport]")) return;
            // 节点里弹出的浮层（设置气泡、下拉、颜色选择、新建菜单）照常交给浮层自己处理，不当成连接。
            if (element.closest(BATCH_OVERLAY_SELECTOR)) return;
            const inNode = Boolean(element.closest(".node-element[data-node-id]"));
            // 吸附圈（56 屏幕像素）总有一部分落在画布底面上，缩小画布时更大。
            // 底面只在悬停已高亮同一目标时接管，其余空白、平移和框选照旧交给视口。
            const onBackground = !inNode && (element.matches("[data-canvas-viewport],[data-canvas-world-layer],[data-canvas-world-raster-layer]") || Boolean(element.closest("[data-connection-id]")));
            if (!inNode && !onBackground) return;
            const target = getBatchConnectionDropTarget(event.clientX, event.clientY, batch.sourceNodeIds);
            if (inNode && !target.nodeId && !target.isNearNode) return;
            if (onBackground && (!target.nodeId || target.nodeId !== batch.targetNodeId)) return;
            event.preventDefault();
            event.stopPropagation();
            cancelPendingPointerMove();
            batchPressGuardRef.current = { pointerId: event.pointerId, timer: null };
            // 右键菜单靠 window 冒泡阶段的 pointerdown 关闭，这次按下到不了那里。
            setContextMenu(null);
            submitBatchConnection(batch.sourceNodeIds, target, { keepPreviewOnReject: true });
        };
        // 同一次操作随后的兼容鼠标事件和 click 也不交给节点，避免改名、点按钮、选图。
        const swallowGuardedMouse = (event: MouseEvent) => {
            if (!batchPressGuardRef.current || !(event.target instanceof Element) || !event.target.closest("[data-canvas-viewport]")) return;
            event.preventDefault();
            event.stopPropagation();
            if (event.type === "click") releaseBatchPressGuard();
        };
        const scheduleBatchPressGuardRelease = (event: PointerEvent) => {
            const guard = batchPressGuardRef.current;
            if (!guard || guard.pointerId !== event.pointerId || guard.timer !== null) return;
            guard.timer = window.setTimeout(() => {
                if (batchPressGuardRef.current === guard) batchPressGuardRef.current = null;
            }, BATCH_PRESS_GUARD_MS);
        };
        const releaseGuardForPointer = (event: PointerEvent) => {
            if (batchPressGuardRef.current?.pointerId === event.pointerId) releaseBatchPressGuard();
        };
        document.addEventListener("pointerdown", handleBatchPressCapture, true);
        document.addEventListener("mousedown", swallowGuardedMouse, true);
        document.addEventListener("mouseup", swallowGuardedMouse, true);
        document.addEventListener("click", swallowGuardedMouse, true);
        document.addEventListener("pointerup", scheduleBatchPressGuardRelease, true);
        document.addEventListener("pointercancel", releaseGuardForPointer, true);
        document.addEventListener("keydown", releaseBatchPressGuard, true);
        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
        window.addEventListener("pointercancel", handlePointerCancel);
        window.addEventListener("blur", cancel);
        return () => {
            document.removeEventListener("pointerdown", handleBatchPressCapture, true);
            document.removeEventListener("mousedown", swallowGuardedMouse, true);
            document.removeEventListener("mouseup", swallowGuardedMouse, true);
            document.removeEventListener("click", swallowGuardedMouse, true);
            document.removeEventListener("pointerup", scheduleBatchPressGuardRelease, true);
            document.removeEventListener("pointercancel", releaseGuardForPointer, true);
            document.removeEventListener("keydown", releaseBatchPressGuard, true);
            cancelPendingPointerMove();
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
            window.removeEventListener("pointercancel", handlePointerCancel);
            window.removeEventListener("blur", cancel);
        };
    }, [clearBatchConnection, releaseBatchPressGuard, setContextMenu, updateConnectionReplaceHover, submitBatchConnection, finishConnection, getBatchConnectionDropTarget, getConnectionDropTarget, openBatchConnectionCreateMenu, previewBatchConnection, screenToCanvas, setConnecting]);

    useEffect(() => releaseBatchPressGuard, [releaseBatchPressGuard]);

    return {
        cancelPendingConnectionCreate,
        closeConnectionCreateMenu,
        openTourConnectionCreateMenu,
        connectionTargetNodeId,
        connectionApproach,
        connectionTargetAnchorRatio,
        connectionReplaceHover,
        connectingParams,
        createConnectedNode,
        getConnectionCreateDisabledReason,
        handleConnectStart,
        handleConnectDrop,
        handleBatchConnectionTargetClick,
        batchConnectionPreview,
        beginBatchConnectionMode,
        startBatchConnection,
        mouseWorld,
        pendingConnectionCreate,
        setConnecting,
    };
}
