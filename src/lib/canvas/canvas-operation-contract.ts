import { nanoid } from "nanoid";
import { currentLocaleText } from "@/i18n/current-locale-text";
import type { MessageKey } from "@/i18n/messages";

import { getNodeSpec } from "@/constant/canvas";
import { getNodeDefinition } from "./node-registry";
import { isPluginEffectivelyEnabled } from "@/stores/use-plugin-store";
import { CanvasNodeType, type CanvasNodeTypeId, type CanvasConnection, type CanvasNodeData, type CanvasNodeMetadata, type ViewportTransform } from "@/types/canvas";

export type CanvasOperation =
    | { type: "add_node"; id?: string; nodeType?: CanvasNodeTypeId; title?: string; position?: { x: number; y: number }; x?: number; y?: number; width?: number; height?: number; metadata?: CanvasNodeMetadata }
    | { type: "update_node"; id: string; patch?: Partial<CanvasNodeData>; metadata?: CanvasNodeMetadata }
    | { type: "delete_node"; id?: string; ids?: string[]; nodeType?: CanvasNodeTypeId }
    | { type: "delete_connections"; id?: string; ids?: string[]; all?: boolean }
    | { type: "connect_nodes"; id?: string; fromNodeId: string; toNodeId: string; fromHandleId?: string; toHandleId?: string }
    | { type: "set_viewport"; viewport: ViewportTransform }
    | { type: "select_nodes"; ids: string[] }
    | { type: "run_generation"; nodeId: string; mode?: "text" | "image" | "video" | "audio"; prompt?: string; retry?: boolean };

export type CanvasSnapshot = {
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

export function findCanvasNodeOverlaps(nodes: CanvasNodeData[], onlyIds?: string[]) {
    const filter = onlyIds ? new Set(onlyIds) : null;
    const candidates = nodes.filter((node) => !filter || filter.has(node.id));
    const overlaps: string[] = [];
    for (let index = 0; index < candidates.length; index += 1) {
        for (let next = index + 1; next < candidates.length; next += 1) {
            const left = candidates[index];
            const right = candidates[next];
            if (left.position.x >= right.position.x + right.width || right.position.x >= left.position.x + left.width || left.position.y >= right.position.y + right.height || right.position.y >= left.position.y + left.height) continue;
            overlaps.push(`节点「${left.title || left.id}」与「${right.title || right.id}」发生重叠`);
        }
    }
    return overlaps;
}

export function summarizeCanvasOperations(ops?: CanvasOperation[]) {
    const counts = (Array.isArray(ops) ? ops : []).reduce<Record<string, number>>((acc, op) => {
        if (!op?.type) return acc;
        acc[op.type] = (acc[op.type] || 0) + 1;
        return acc;
    }, {});
    return Object.entries(counts)
        .map(([type, count]) => `${opLabel(type)} ${count}`)
        .join(currentLocaleText("canvasExtra.operations.separator"));
}

export function applyCanvasOperations(snapshot: CanvasSnapshot, ops?: CanvasOperation[]) {
    let nodes = snapshot.nodes;
    let connections = snapshot.connections;
    let selectedNodeIds = snapshot.selectedNodeIds;
    let viewport = snapshot.viewport;

    (Array.isArray(ops) ? ops : []).forEach((op, index) => {
        if (!op?.type) return;
        if (op.type === "add_node") {
            const nodeType = op.nodeType || CanvasNodeType.Text;
            const definition = getNodeDefinition(nodeType);
            if (!definition || (definition.plugin && !isPluginEffectivelyEnabled(definition.plugin.pluginId))) throw new Error(`节点类型未注册或插件不可用：${nodeType}`);
            const spec = getNodeSpec(nodeType as CanvasNodeType) || { title: definition.defaultTitle, ...definition.defaultSize, metadata: definition.defaultMetadata };
            const node: CanvasNodeData = {
                id: op.id || `${nodeType}-${Date.now()}-${index}`,
                type: nodeType,
                title: op.title || spec.title,
                position: op.position || { x: op.x ?? index * 36, y: op.y ?? index * 36 },
                width: op.width || spec.width,
                height: op.height || spec.height,
                metadata: { ...spec.metadata, ...op.metadata, ...(definition.plugin ? { pluginId: definition.plugin.pluginId, pluginNodeId: nodeType } : {}) },
            };
            nodes = [...nodes, node];
            selectedNodeIds = [node.id];
        }
        if (op.type === "update_node") {
            if (!op.id) return;
            const current = nodes.find((node) => node.id === op.id);
            const nextPosition = op.patch?.position;
            const dx = current?.type === CanvasNodeType.Frame && nextPosition ? nextPosition.x - current.position.x : 0;
            const dy = current?.type === CanvasNodeType.Frame && nextPosition ? nextPosition.y - current.position.y : 0;
            nodes = nodes.map((node) => {
                if (node.id === op.id) return { ...node, ...op.patch, metadata: { ...node.metadata, ...op.patch?.metadata, ...op.metadata } };
                if (node.parentId === op.id && (dx || dy)) return { ...node, position: { x: node.position.x + dx, y: node.position.y + dy } };
                return node;
            });
        }
        if (op.type === "delete_node") {
            const ids = new Set(op.ids || (op.id ? [op.id] : op.nodeType ? nodes.filter((node) => node.type === op.nodeType).map((node) => node.id) : []));
            nodes = nodes.filter((node) => !ids.has(node.id)).map((node) => (node.parentId && ids.has(node.parentId) ? { ...node, parentId: undefined } : node));
            connections = connections.filter((conn) => !ids.has(conn.fromNodeId) && !ids.has(conn.toNodeId));
            selectedNodeIds = selectedNodeIds.filter((id) => !ids.has(id));
        }
        if (op.type === "delete_connections") {
            const ids = new Set(op.ids || (op.id ? [op.id] : []));
            connections = op.all ? [] : connections.filter((conn) => !ids.has(conn.id));
        }
        if (op.type === "connect_nodes") {
            if (!op.fromNodeId || !op.toNodeId) return;
            const exists = connections.some((conn) => conn.fromNodeId === op.fromNodeId && conn.toNodeId === op.toNodeId && conn.fromHandleId === op.fromHandleId && conn.toHandleId === op.toHandleId);
            const from = nodes.find((node) => node.id === op.fromNodeId);
            const to = nodes.find((node) => node.id === op.toNodeId);
            const hasNodes = Boolean(from && to && from.type !== CanvasNodeType.Frame && to.type !== CanvasNodeType.Frame);
            if (!exists && hasNodes) connections = [...connections, { id: op.id || nanoid(), fromNodeId: op.fromNodeId, toNodeId: op.toNodeId, fromHandleId: op.fromHandleId, toHandleId: op.toHandleId }];
        }
        if (op.type === "set_viewport" && op.viewport) viewport = op.viewport;
        if (op.type === "select_nodes") selectedNodeIds = (op.ids || []).filter((id) => nodes.some((node) => node.id === id));
    });

    return { ...snapshot, nodes, connections, selectedNodeIds, viewport };
}

function opLabel(type: string) {
    if (["add_node", "update_node", "delete_node", "delete_connections", "connect_nodes", "set_viewport", "select_nodes", "run_generation"].includes(type)) return currentLocaleText(`canvasExtra.operations.${type}` as MessageKey);
    return type;
}

