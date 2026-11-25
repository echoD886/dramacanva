import type { CanvasStylePreset } from "./canvas-style-system";
import { scopedLocalStorage } from "../user-scope";

export const STYLE_FAVORITES_KEY = "canvas:style-library:favorites";
export const STYLE_RECENT_KEY = "canvas:style-library:recent";

export function readStyleIds(key: string): string[] {
    try {
        const parsed = JSON.parse(scopedLocalStorage.getItem(key) || "[]");
        return Array.isArray(parsed) ? [...new Set(parsed.filter((value): value is string => typeof value === "string"))].slice(0, 100) : [];
    } catch {
        return [];
    }
}

export function uniquePublicStyles(presets: CanvasStylePreset[]) {
    const ids = new Set<string>();
    const prompts = new Set<string>();
    return presets.filter((preset) => {
        if (ids.has(preset.id) || prompts.has(preset.prompt)) return false;
        ids.add(preset.id);
        prompts.add(preset.prompt);
        return true;
    });
}

type Rect = { top: number; right: number; bottom: number; left: number };

/** Place outside the whole composer, including when the top placement flips. */
export function stylePopoverPosition(anchor: Rect, composer: Rect, viewport: { width: number; height: number }) {
    const margin = 12;
    const gap = 8;
    const width = Math.min(640, viewport.width - margin * 2);
    const above = Math.max(0, Math.min(anchor.top, composer.top) - margin - gap);
    const below = Math.max(0, viewport.height - Math.max(anchor.bottom, composer.bottom) - margin - gap);
    const height = Math.min(440, Math.max(above, below));
    const topPlacement = above >= 320 || above >= below;
    // A tall composer near the centre can leave more space beside it than above it.
    const sideSpace = Math.max(composer.left - margin - gap, viewport.width - composer.right - margin - gap);
    if (height < 220 && sideSpace >= 280) {
        const sideWidth = Math.min(width, sideSpace);
        return {
            left: composer.left - margin - gap >= sideWidth ? composer.left - gap - sideWidth : composer.right + gap,
            top: Math.max(margin, Math.min(anchor.top, viewport.height - 440 - margin)),
            width: sideWidth,
            height: Math.min(440, viewport.height - margin * 2),
        };
    }
    return {
        left: Math.max(margin, Math.min(anchor.right - width, viewport.width - width - margin)),
        top: topPlacement ? Math.min(anchor.top, composer.top) - gap - Math.min(440, above) : Math.max(anchor.bottom, composer.bottom) + gap,
        width,
        height: Math.min(440, topPlacement ? above : below),
    };
}
