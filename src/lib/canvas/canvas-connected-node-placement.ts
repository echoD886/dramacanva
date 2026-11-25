import type { CanvasNodeData, Position, ViewportTransform } from "@/types/canvas";

type NodeSize = {
    width: number;
    height: number;
};

export function connectedNodeCenterFromEdgeDrop(dropPosition: Position, nodeSize: NodeSize, handleType: "source" | "target"): Position {
    return {
        x: dropPosition.x + (handleType === "source" ? nodeSize.width / 2 : -nodeSize.width / 2),
        y: dropPosition.y,
    };
}

export function viewportForCreatedNode(node: CanvasNodeData, viewport: ViewportTransform, area: { left: number; top: number; right: number; bottom: number }, composerHeight = 0): ViewportTransform {
    const gap = composerHeight > 0 ? 10 : 0;
    const width = Math.max(1, area.right - area.left);
    const height = Math.max(1, area.bottom - area.top - composerHeight - gap);
    const k = Math.min(viewport.k, width / node.width, height / node.height);
    const nodeWidth = node.width * k;
    const nodeHeight = node.height * k;
    const left = Math.max(area.left, Math.min(area.right - nodeWidth, viewport.x + node.position.x * k));
    const top = viewport.y + node.position.y * k;
    // New nodes keep their composer below, leaving the external title/rename
    // controls above the card unobscured as well as the card itself.
    const y = Math.max(area.top, Math.min(area.bottom - composerHeight - gap - nodeHeight, top));
    const next = { x: left - node.position.x * k, y: y - node.position.y * k, k };
    return Math.abs(next.x - viewport.x) < 0.01 && Math.abs(next.y - viewport.y) < 0.01 && next.k === viewport.k ? viewport : next;
}
