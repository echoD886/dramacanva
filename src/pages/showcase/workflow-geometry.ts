import { nodeDimensions, type ShowcaseGraph, type ShowcaseGraphEdge, type ShowcaseGraphNode } from "./data";

export interface LaidOutNode {
    node: ShowcaseGraphNode;
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface GraphBounds {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
}

export function layoutGraphNodes(graph: ShowcaseGraph) {
    const sourceById = new Map(graph.nodes.map((node) => [node.id, node]));
    const positioned = new Map<string, LaidOutNode>();

    const resolve = (node: ShowcaseGraphNode, trail = new Set<string>()): LaidOutNode => {
        const cached = positioned.get(node.id);
        if (cached) return cached;
        const { width, height } = nodeDimensions(node);
        let x = Number(node.position?.x || 0);
        let y = Number(node.position?.y || 0);
        if (node.parentId && !trail.has(node.parentId)) {
            const parent = sourceById.get(node.parentId);
            if (parent) {
                const nextTrail = new Set(trail);
                nextTrail.add(node.id);
                const parentLayout = resolve(parent, nextTrail);
                x += parentLayout.x;
                y += parentLayout.y;
            }
        }
        const layout = { node, x, y, width, height };
        positioned.set(node.id, layout);
        return layout;
    };

    for (const node of graph.nodes) resolve(node);
    return positioned;
}

export function graphBounds(nodes: Iterable<LaidOutNode>): GraphBounds {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const item of nodes) {
        minX = Math.min(minX, item.x);
        minY = Math.min(minY, item.y);
        maxX = Math.max(maxX, item.x + item.width);
        maxY = Math.max(maxY, item.y + item.height);
    }
    if (!Number.isFinite(minX)) return { minX: 0, minY: 0, maxX: 1, maxY: 1, width: 1, height: 1 };
    return { minX, minY, maxX, maxY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
}

function edgeSegment(edge: ShowcaseGraphEdge, nodes: Map<string, LaidOutNode>) {
    const source = nodes.get(edge.source);
    const target = nodes.get(edge.target);
    if (!source || !target) return "";
    const sourceX = source.x + source.width;
    const sourceY = source.y + source.height / 2;
    const targetX = target.x;
    const targetY = target.y + target.height / 2;
    const control = Math.max(80, Math.abs(targetX - sourceX) * 0.44);
    const sourceControlX = sourceX + (targetX >= sourceX ? control : -control);
    const targetControlX = targetX - (targetX >= sourceX ? control : -control);
    return `M${round(sourceX)} ${round(sourceY)}C${round(sourceControlX)} ${round(sourceY)} ${round(targetControlX)} ${round(targetY)} ${round(targetX)} ${round(targetY)}`;
}

export function buildCombinedEdgePath(edges: ShowcaseGraphEdge[], nodes: Map<string, LaidOutNode>) {
    const segments = edges.map((edge) => edgeSegment(edge, nodes)).filter(Boolean);
    return { d: segments.join(""), renderedCount: segments.length };
}

function round(value: number) {
    return Math.round(value * 100) / 100;
}
