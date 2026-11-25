import type { CoachRect } from "./coach-mark-layout";

// One snapshot per measure pass: visibility, holes and touch scaling share reads.
// Discard it before applying DOM writes or moving the viewport.
export function createCoachGeometrySnapshot() {
    const entries = new Map<HTMLElement, { rect: DOMRect; bounds: CoachRect; visible: boolean; scale: number }>();
    const read = (element: HTMLElement) => {
        const cached = entries.get(element);
        if (cached) return cached;
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        const offsetWidth = element.offsetWidth;
        const scale = offsetWidth ? rect.width / offsetWidth : 1;
        const radius = style.borderTopLeftRadius;
        const entry = {
            rect,
            scale,
            visible: (rect.width > 0 || rect.height > 0) && style.visibility !== "hidden",
            bounds: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, radius: radius.endsWith("%") ? Math.min(rect.width, rect.height) * parseFloat(radius) / 100 : (parseFloat(radius) || 0) * scale },
        };
        entries.set(element, entry);
        return entry;
    };
    return {
        visible: (element: HTMLElement) => read(element).visible,
        bounds: (element: HTMLElement) => read(element).bounds,
        rect: (element: HTMLElement) => read(element).rect,
        scale: (element: HTMLElement) => read(element).scale,
    };
}
