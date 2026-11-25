import { nanoid } from "nanoid";

import { canvasAgentText } from "./canvas-agent-text";
import { CanvasNodeType, type CanvasNodeTypeId, type CanvasConnection, type CanvasNodeData, type CanvasNodeMetadata, type ViewportTransform } from "@/types/canvas";

export type CanvasAgentOp =
    | { type: "add_node"; id?: string; nodeType?: CanvasNodeTypeId; title?: string; position?: { x: number; y: number }; x?: number; y?: number; width?: number; height?: number; metadata?: CanvasNodeMetadata }
    | { type: "update_node"; id: string; patch?: Partial<CanvasNodeData>; metadata?: CanvasNodeMetadata }
    | { type: "delete_node"; id?: string; ids?: string[]; nodeType?: CanvasNodeType }
    | { type: "delete_connections"; id?: string; ids?: string[]; all?: boolean }
    | { type: "connect_nodes"; id?: string; fromNodeId: string; toNodeId: string; fromHandleId?: string; toHandleId?: string }
    | { type: "set_viewport"; viewport: ViewportTransform }
    | { type: "select_nodes"; ids: string[] }
    | { type: "run_generation"; nodeId: string; mode?: "text" | "image" | "video" | "audio"; prompt?: string; retry?: boolean };

export type CanvasAgentSnapshot = {
    projectId: string;
    domainProjectId?: string;
    title: string;
    nodes: CanvasNodeData[];
    connections: CanvasConnection[];
    selectedNodeIds: string[];
    viewport: ViewportTransform;
    revision?: number;
    stateHash?: string;
};

export type CanvasAgentGenerationVerification = {
    nodeId: string;
    taskId?: string;
    taskStatus?: string;
    officialStatus?: string;
    outcome: "not_started" | "queued" | "running" | "succeeded" | "failed" | "cancelled" | "unknown";
    resourceReady: boolean;
    message: string;
};

export type CanvasAgentPostcondition = {
    ok: boolean;
    changed: boolean;
    ranGeneration: boolean;
    createdNodeIds: string[];
    createdConnectionIds: string[];
    connectionCount: number;
    expectedConnectionCount: number;
    removedNodeIds: string[];
    affectedNodeIds: string[];
    missingNodeIds: string[];
    missingConnectionIds: string[];
    generation: CanvasAgentGenerationVerification[];
    warnings: string[];
    overlapWarnings: string[];
    beforeStateHash: string;
    afterStateHash: string;
    hashSource: "browser-local";
};

/**
 * Verify the observable postcondition after a batch has been applied.
 *
 * This is intentionally separate from validation: validation answers whether
 * an operation is safe to attempt, while this function answers whether the
 * browser actually produced the state the Agent asked for. Generation is
 * reported as submitted/running/succeeded rather than being collapsed into
 * a misleading boolean "completed".
 */
export function verifyCanvasAgentOps(before: CanvasAgentSnapshot, after: CanvasAgentSnapshot, ops: CanvasAgentOp[]): CanvasAgentPostcondition {
    const beforeNodeIds = new Set(before.nodes.map((node) => node.id));
    const afterNodeIds = new Set(after.nodes.map((node) => node.id));
    const beforeConnectionIds = new Set(before.connections.map((connection) => connection.id));
    const afterConnectionIds = new Set(after.connections.map((connection) => connection.id));
    const createdNodeIds = after.nodes.filter((node) => !beforeNodeIds.has(node.id)).map((node) => node.id);
    const createdConnectionIds = after.connections.filter((connection) => !beforeConnectionIds.has(connection.id)).map((connection) => connection.id);
    const expectedConnectionCount = ops.filter((op) => op.type === "connect_nodes").length;
    const removedNodeIds = before.nodes.filter((node) => !afterNodeIds.has(node.id)).map((node) => node.id);
    const affectedNodeIds = new Set<string>();
    const missingNodeIds = new Set<string>();
    const missingConnectionIds = new Set<string>();
    const failedPostconditions = new Set<string>();
    const warnings: string[] = [];
    const overlapWarnings = findCanvasNodeOverlaps(after.nodes, createdNodeIds);
    if (overlapWarnings.length) warnings.push(...overlapWarnings);
    const generation: CanvasAgentGenerationVerification[] = [];
    const addNodeCount = ops.filter((op) => op.type === "add_node").length;
    if (createdNodeIds.length < addNodeCount) {
        failedPostconditions.add("add_node:count");
        warnings.push(canvasAgentText("canvasAgent.ops.expectedNodeCountMissing", { expected: addNodeCount, actual: createdNodeIds.length }));
    }

    const requireAfterNode = (nodeId: string) => {
        affectedNodeIds.add(nodeId);
        if (!afterNodeIds.has(nodeId)) missingNodeIds.add(nodeId);
    };
    const connectionExists = (op: Extract<CanvasAgentOp, { type: "connect_nodes" }>) => after.connections.some((connection) => connection.fromNodeId === op.fromNodeId
        && connection.toNodeId === op.toNodeId
        && connection.fromHandleId === op.fromHandleId
        && connection.toHandleId === op.toHandleId);

    for (const op of ops) {
        if (op.type === "add_node") {
            if (op.id && !afterNodeIds.has(op.id)) missingNodeIds.add(op.id);
            continue;
        }
        if (op.type === "update_node") {
            requireAfterNode(op.id);
            const beforeNode = before.nodes.find((node) => node.id === op.id);
            const afterNode = after.nodes.find((node) => node.id === op.id);
            if (beforeNode && afterNode && op.patch) {
                const patch = op.patch as Record<string, unknown>;
                for (const key of ["title", "x", "y", "width", "height", "position", "parentId"]) {
                    if (!(key in patch) || JSON.stringify(afterNode[key as keyof typeof afterNode]) === JSON.stringify(patch[key])) continue;
                    failedPostconditions.add(`${op.id}:${key}`);
                    warnings.push(canvasAgentText("canvasAgent.ops.fieldNotApplied", { node: afterNode.title || op.id, field: key }));
                }
                if ((patch.metadata && typeof patch.metadata === "object" && !Array.isArray(patch.metadata)) || op.metadata) {
                    const expectedMetadata = { ...beforeNode.metadata, ...(patch.metadata as Record<string, unknown> || {}), ...(op.metadata || {}) };
                    if (JSON.stringify(afterNode.metadata || {}) !== JSON.stringify(expectedMetadata)) {
                        failedPostconditions.add(`${op.id}:metadata`);
                        warnings.push(canvasAgentText("canvasAgent.ops.metadataNotApplied", { node: afterNode.title || op.id }));
                    }
                }
            }
            continue;
        }
        if (op.type === "delete_node") {
            const ids = op.ids || (op.id ? [op.id] : op.nodeType ? before.nodes.filter((node) => node.type === op.nodeType).map((node) => node.id) : []);
            ids.forEach((id) => {
                affectedNodeIds.add(id);
                if (afterNodeIds.has(id)) missingNodeIds.add(id);
            });
            continue;
        }
        if (op.type === "delete_connections") {
            const ids = op.all ? before.connections.map((connection) => connection.id) : op.ids || (op.id ? [op.id] : []);
            ids.forEach((id) => {
                if (afterConnectionIds.has(id)) missingConnectionIds.add(id);
            });
            continue;
        }
        if (op.type === "connect_nodes") {
            affectedNodeIds.add(op.fromNodeId);
            affectedNodeIds.add(op.toNodeId);
            if (!connectionExists(op)) missingConnectionIds.add(op.id || `${op.fromNodeId}->${op.toNodeId}`);
            continue;
        }
        if (op.type === "select_nodes") {
            op.ids.forEach((id) => {
                affectedNodeIds.add(id);
                if (afterNodeIds.has(id) && !after.selectedNodeIds.includes(id)) warnings.push(canvasAgentText("canvasAgent.ops.nodeNotInSelection", { node: id }));
            });
            continue;
        }
        if (op.type === "run_generation") {
            requireAfterNode(op.nodeId);
            const node = after.nodes.find((item) => item.id === op.nodeId);
            const metadata = node?.metadata || {};
            const taskId = typeof metadata.taskId === "string" && metadata.taskId ? metadata.taskId : undefined;
            const taskStatus = typeof metadata.taskStatus === "string" ? metadata.taskStatus : undefined;
            const officialStatus = typeof metadata.taskOfficialStatus === "string" ? metadata.taskOfficialStatus : undefined;
            const resourceReady = metadata.status === "success" && Boolean(metadata.storageKey || metadata.primaryImageId || (metadata as Record<string, unknown>).resourceId);
            const outcome = generationOutcome(taskStatus, officialStatus, taskId);
            const message = generationVerificationMessage(outcome, resourceReady);
            generation.push({ nodeId: op.nodeId, ...(taskId ? { taskId } : {}), ...(taskStatus ? { taskStatus } : {}), ...(officialStatus ? { officialStatus } : {}), outcome, resourceReady, message });
            const nodeLabel = node?.title || op.nodeId;
            if (outcome === "not_started") warnings.push(canvasAgentText("canvasAgent.ops.generationNotSubmitted", { node: nodeLabel }));
            else if (outcome === "failed" || outcome === "cancelled") warnings.push(canvasAgentText("canvasAgent.ops.generationTaskFailed", { node: nodeLabel, message }));
            else if (outcome === "succeeded" && !resourceReady) warnings.push(canvasAgentText("canvasAgent.ops.generationResourcePending", { node: nodeLabel }));
            continue;
        }
    }

    const ranGeneration = generation.length > 0;
    const changed = hashCanvasAgentSnapshot(before) !== hashCanvasAgentSnapshot(after) || ranGeneration;
    const generationFailed = generation.some((item) => item.outcome === "not_started" || item.outcome === "failed" || item.outcome === "cancelled");
    return {
        ok: missingNodeIds.size === 0 && missingConnectionIds.size === 0 && failedPostconditions.size === 0 && !generationFailed && overlapWarnings.length === 0,
        changed,
        ranGeneration,
        createdNodeIds,
        createdConnectionIds,
        connectionCount: after.connections.length,
        expectedConnectionCount,
        removedNodeIds,
        affectedNodeIds: [...affectedNodeIds],
        missingNodeIds: [...missingNodeIds],
        missingConnectionIds: [...missingConnectionIds],
        generation,
        warnings: [...new Set(warnings)],
        overlapWarnings,
        beforeStateHash: hashCanvasAgentSnapshot(before),
        afterStateHash: hashCanvasAgentSnapshot(after),
        hashSource: "browser-local",
    };
}

export function findCanvasNodeOverlaps(nodes: CanvasNodeData[], onlyIds?: string[]) {
    const filter = onlyIds ? new Set(onlyIds) : null;
    const candidates = nodes.filter((node) => !filter || filter.has(node.id));
    const overlaps: string[] = [];
    for (let index = 0; index < candidates.length; index += 1) {
        for (let next = index + 1; next < candidates.length; next += 1) {
            const left = candidates[index];
            const right = candidates[next];
            if (left.position.x >= right.position.x + right.width || right.position.x >= left.position.x + left.width || left.position.y >= right.position.y + right.height || right.position.y >= left.position.y + left.height) continue;
            overlaps.push(canvasAgentText("canvasAgent.ops.nodeOverlap", { left: left.title || left.id, right: right.title || right.id }));
        }
    }
    return overlaps;
}

export function canvasAgentPostconditionMessage(result: CanvasAgentPostcondition) {
    const nodeSummary = result.createdNodeIds.length
        ? canvasAgentText("canvasAgent.ops.nodesCreated", { count: result.createdNodeIds.length })
        : result.changed
          ? canvasAgentText("canvasAgent.ops.canvasUpdated")
          : canvasAgentText("canvasAgent.ops.canvasUnchanged");
    const connectionSummary = result.expectedConnectionCount
        ? canvasAgentText("canvasAgent.ops.connectionsExpected", { expected: result.expectedConnectionCount, created: result.createdConnectionIds.length, total: result.connectionCount })
        : canvasAgentText("canvasAgent.ops.connectionsTotal", { count: result.connectionCount });
    if (!result.ok) {
        if (result.generation.some((item) => item.outcome === "failed" || item.outcome === "cancelled")) return result.generation.map((item) => item.message).join("；");
        if (result.generation.some((item) => item.outcome === "not_started")) return canvasAgentText("canvasAgent.ops.reviewGenerationNotSubmitted");
        const details = [...result.overlapWarnings, ...result.warnings].filter(Boolean).slice(0, 2).join("；");
        return canvasAgentText("canvasAgent.ops.reviewFailed", {
            summary: nodeSummary,
            details: details || canvasAgentText("canvasAgent.ops.reviewNoExpectedState"),
            connections: result.expectedConnectionCount ? ` ${canvasAgentText("canvasAgent.ops.connectionsExpected", { expected: result.expectedConnectionCount, created: result.createdConnectionIds.length, total: result.connectionCount })}.` : "",
        });
    }
    if (result.generation.some((item) => item.outcome === "queued" || item.outcome === "running")) return canvasAgentText("canvasAgent.ops.reviewGenerationRunning", { summary: nodeSummary, connections: connectionSummary, statuses: result.generation.map((item) => item.message).join("、") });
    if (result.generation.some((item) => item.outcome === "succeeded" && !item.resourceReady)) return canvasAgentText("canvasAgent.ops.reviewResourcePending", { summary: nodeSummary, connections: connectionSummary });
    if (result.generation.some((item) => item.outcome === "succeeded" && item.resourceReady)) return canvasAgentText("canvasAgent.ops.reviewGenerationDone", { summary: nodeSummary, connections: connectionSummary });
    return canvasAgentText("canvasAgent.ops.reviewOk", { summary: nodeSummary, connections: connectionSummary });
}

export function hashCanvasAgentSnapshot(snapshot: CanvasAgentSnapshot) {
    let hash = 2166136261;
    const text = JSON.stringify({ projectId: snapshot.projectId, domainProjectId: snapshot.domainProjectId, title: snapshot.title, nodes: snapshot.nodes, connections: snapshot.connections, selectedNodeIds: snapshot.selectedNodeIds, viewport: snapshot.viewport });
    for (let index = 0; index < text.length; index += 1) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
    return (hash >>> 0).toString(16).padStart(8, "0");
}

function generationOutcome(taskStatus?: string, officialStatus?: string, taskId?: string): CanvasAgentGenerationVerification["outcome"] {
    if (!taskId) return "not_started";
    const status = taskStatus || officialStatus;
    if (status === "queued" || status === "pending" || officialStatus === "pending") return "queued";
    if (status === "running" || status === "processing" || officialStatus === "processing") return "running";
    if (status === "succeeded" || status === "completed" || officialStatus === "completed") return "succeeded";
    if (status === "failed" || officialStatus === "failed") return "failed";
    if (status === "cancelled" || status === "canceled" || officialStatus === "cancelled") return "cancelled";
    return "unknown";
}

function generationVerificationMessage(outcome: CanvasAgentGenerationVerification["outcome"], resourceReady: boolean) {
    if (outcome === "not_started") return canvasAgentText("canvasAgent.ops.outcome.notStarted");
    if (outcome === "queued") return canvasAgentText("canvasAgent.ops.outcome.queued");
    if (outcome === "running") return canvasAgentText("canvasAgent.ops.outcome.running");
    if (outcome === "failed") return canvasAgentText("canvasAgent.ops.outcome.failed");
    if (outcome === "cancelled") return canvasAgentText("canvasAgent.ops.outcome.cancelled");
    if (outcome === "succeeded" && resourceReady) return canvasAgentText("canvasAgent.ops.outcome.succeededReady");
    if (outcome === "succeeded") return canvasAgentText("canvasAgent.ops.outcome.succeeded");
    return canvasAgentText("canvasAgent.ops.outcome.unknown");
}
