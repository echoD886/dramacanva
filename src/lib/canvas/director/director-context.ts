import type { CanvasConnection, CanvasNodeData } from "@/types/canvas";

export function directorUpstreamNodes(nodes: CanvasNodeData[], connections: CanvasConnection[], targetId?: string) {
    const ids = new Set(targetId ? [targetId] : []);
    for (let depth = 0; depth < 8; depth++) {
        let changed = false;
        for (const edge of connections) if (ids.has(edge.toNodeId) && !ids.has(edge.fromNodeId)) { ids.add(edge.fromNodeId); changed = true; }
        if (!changed) break;
    }
    return nodes.filter((node) => node.id !== targetId && ids.has(node.id));
}
