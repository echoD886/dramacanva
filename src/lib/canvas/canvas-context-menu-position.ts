type Point = { left: number; top: number };
type Viewport = { width: number; height: number };

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function positionCanvasSubmenu(parent: Point, viewport: Viewport) {
    const width = Math.min(360, Math.max(0, viewport.width - 24));
    const height = Math.min(360, Math.max(0, viewport.height - 24));
    const top = clamp(parent.top, 12, Math.max(12, viewport.height - height - 12));
    const right = parent.left + 232;
    if (right + width <= viewport.width - 12) return { left: right, top, width };
    const left = parent.left - width - 8;
    if (left >= 12) return { left, top, width };
    const below = parent.top + 258;
    return {
        left: clamp(parent.left, 12, Math.max(12, viewport.width - width - 12)),
        top: below + height <= viewport.height - 12 ? below : top,
        width,
    };
}
