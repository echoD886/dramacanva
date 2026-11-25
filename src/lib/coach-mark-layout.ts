export type CoachRect = { x: number; y: number; width: number; height: number; radius?: number };
export type CoachPlacement = "top" | "bottom" | "left" | "right" | "center" | "drawer";

// Refocus changed geometry on the next measured frame, but do not keep retrying
// an unchanged oversized target that cannot fit inside the available area.
export function createCoachRevealTracker<T>() {
    let previous: T | undefined;
    let geometry = "";
    return (target: T, nextGeometry: string, outside: boolean) => {
        if (previous === target && (!outside || geometry === nextGeometry)) return false;
        previous = target;
        geometry = nextGeometry;
        return true;
    };
}

// SVG even-odd hit regions must not overlap: an overlapping cutout becomes solid.
export function mergeCoachHoles(rects: CoachRect[]): CoachRect[] {
    const result: CoachRect[] = [];
    for (const rect of rects) {
        let merged = { ...rect };
        for (let i = 0; i < result.length;) {
            const other = result[i];
            if (merged.x >= other.x + other.width || other.x >= merged.x + merged.width || merged.y >= other.y + other.height || other.y >= merged.y + merged.height) {
                i++;
                continue;
            }
            const x = Math.min(merged.x, other.x),
                y = Math.min(merged.y, other.y);
            merged = { x, y, width: Math.max(merged.x + merged.width, other.x + other.width) - x, height: Math.max(merged.y + merged.height, other.y + other.height) - y, radius: Math.min(merged.radius || 12, other.radius || 12) };
            result.splice(i, 1);
            i = 0;
        }
        result.push(merged);
    }
    return result;
}

export function unionCoachRects(rects: CoachRect[]): CoachRect | undefined {
    if (!rects.length) return undefined;
    const x = Math.min(...rects.map((r) => r.x)), y = Math.min(...rects.map((r) => r.y));
    return { x, y, width: Math.max(...rects.map((r) => r.x + r.width)) - x, height: Math.max(...rects.map((r) => r.y + r.height)) - y };
}

export function expandCoachRect(rect: CoachRect, padding = 10): CoachRect {
    return { x: rect.x - padding, y: rect.y - padding, width: rect.width + padding * 2, height: rect.height + padding * 2, radius: Math.min(rect.radius || 0, rect.width / 2, rect.height / 2) + padding };
}

export function placeCoachCard(target: CoachRect | undefined, viewport: { width: number; height: number }, card: { width: number; height: number }, options: { avoid?: CoachRect[]; vertical?: boolean; center?: boolean } = {}) {
    const inset = 16;
    const gap = 24;
    const clamp = (value: number, max: number) => Math.max(inset, Math.min(value, max - inset));
    if (viewport.width <= 640) return { x: 0, y: viewport.height - card.height, placement: "drawer" as CoachPlacement };
    if (options.center) return { x: (viewport.width - card.width) / 2, y: (viewport.height - card.height) / 2, placement: "center" as CoachPlacement };
    if (!target) return { x: (viewport.width - card.width) / 2, y: (viewport.height - card.height) / 2, placement: "center" as CoachPlacement };
    const cx = clamp(target.x + (target.width - card.width) / 2, viewport.width - card.width);
    const cy = clamp(target.y + (target.height - card.height) / 2, viewport.height - card.height);
    const obstacles = options.avoid || [];
    const fits = ({ x, y }: { x: number; y: number }) => x >= inset && y >= inset && x + card.width <= viewport.width - inset && y + card.height <= viewport.height - inset && obstacles.every((r) => x + card.width + 12 <= r.x || r.x + r.width + 12 <= x || y + card.height + 12 <= r.y || r.y + r.height + 12 <= y);
    const choices: Array<{ x: number; y: number; placement: CoachPlacement }> = [
        { x: target.x + target.width + gap, y: cy, placement: "right" },
        { x: target.x - card.width - gap, y: cy, placement: "left" },
        { x: cx, y: target.y + target.height + gap, placement: "bottom" },
        { x: cx, y: target.y - card.height - gap, placement: "top" },
    ];
    if (options.vertical) choices.unshift(...choices.splice(2));
    // Slide along the target's edge before giving up the nearby arrow placement.
    for (const choice of choices) {
        const horizontal = choice.placement === "left" || choice.placement === "right";
        const candidates = [choice, ...obstacles.flatMap((r) => horizontal
            ? [{ ...choice, y: r.y - card.height - 12 }, { ...choice, y: r.y + r.height + 12 }]
            : [{ ...choice, x: r.x - card.width - 12 }, { ...choice, x: r.x + r.width + 12 }])];
        const nearby = candidates.find((p) => fits(p) && coachArrowOffset(target, { ...p, ...card }, p.placement) !== undefined);
        if (nearby) return nearby;
    }
    const context = unionCoachRects([target, ...obstacles])!;
    const fallbacks = [
        { x: cx, y: context.y + context.height + gap },
        { x: cx, y: context.y - card.height - gap },
        { x: context.x + context.width + gap, y: cy },
        { x: context.x - card.width - gap, y: cy },
        ...[inset, viewport.width - card.width - inset].flatMap((x) => [inset, viewport.height - card.height - inset].map((y) => ({ x, y }))),
    ];
    return { ...(fallbacks.find(fits) || { x: inset, y: viewport.height - card.height - inset }), placement: "drawer" as CoachPlacement };
}

// An arrow is useful only when it can point straight at the target, across a short gap.
export function coachArrowOffset(anchor: CoachRect | undefined, card: CoachRect, placement: CoachPlacement): number | undefined {
    if (!anchor || placement === "center" || placement === "drawer") return undefined;
    const horizontal = placement === "left" || placement === "right";
    const offset = horizontal ? anchor.y + anchor.height / 2 - card.y : anchor.x + anchor.width / 2 - card.x;
    const gap = placement === "right" ? card.x - anchor.x - anchor.width : placement === "left" ? anchor.x - card.x - card.width : placement === "bottom" ? card.y - anchor.y - anchor.height : anchor.y - card.y - card.height;
    return offset >= 24 && offset <= (horizontal ? card.height : card.width) - 24 && gap >= 16 && gap <= 24.01 ? offset - 7 : undefined;
}

export function placeCoachHand(target: CoachRect, card: CoachRect, viewport: { width: number; height: number }): CoachRect | undefined {
    if (Math.min(target.width, target.height) < 64) return undefined;
    const size = 22;
    // Keep the complete painted hand outside the target, including edge content.
    const hand = { x: target.x + target.width + 2, y: target.y + target.height + 2, width: size, height: size };
    return hand.x >= 0 && hand.y >= 0 && hand.x + size <= viewport.width && hand.y + size <= viewport.height && (hand.x + size <= card.x || card.x + card.width <= hand.x || hand.y + size <= card.y || card.y + card.height <= hand.y) ? hand : undefined;
}

export function clipCoachRect(rect: CoachRect, clip: CoachRect, insetX = 0): CoachRect | undefined {
    const x = Math.max(rect.x, clip.x + insetX), y = Math.max(rect.y, clip.y);
    const right = Math.min(rect.x + rect.width, clip.x + clip.width - insetX), bottom = Math.min(rect.y + rect.height, clip.y + clip.height);
    return right > x && bottom > y ? { ...rect, x, y, width: right - x, height: bottom - y } : undefined;
}

export function roundedCoachPath({ x, y, width: w, height: h, radius = 12 }: CoachRect) {
    const r = Math.min(radius, w / 2, h / 2);
    return `M${x + r},${y}H${x + w - r}A${r},${r} 0 0 1 ${x + w},${y + r}V${y + h - r}A${r},${r} 0 0 1 ${x + w - r},${y + h}H${x + r}A${r},${r} 0 0 1 ${x},${y + h - r}V${y + r}A${r},${r} 0 0 1 ${x + r},${y}Z`;
}
