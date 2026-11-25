import type { CanvasNodeData } from "@/types/canvas";

export function canvasCoverViewport(nodes: CanvasNodeData[], width: number, height: number) {
    if (!nodes.length || width <= 0 || height <= 0) return null;
    let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
    for (const node of nodes) {
        if (![node.position.x, node.position.y, node.width, node.height].every(Number.isFinite)) return null;
        left = Math.min(left, node.position.x);
        top = Math.min(top, node.position.y);
        right = Math.max(right, node.position.x + Math.max(1, node.width));
        bottom = Math.max(bottom, node.position.y + Math.max(1, node.height));
    }
    const k = Math.min(width * .88 / Math.max(1, right - left), height * .88 / Math.max(1, bottom - top));
    return { x: width / 2 - (left + right) / 2 * k, y: height / 2 - (top + bottom) / 2 * k, k };
}
