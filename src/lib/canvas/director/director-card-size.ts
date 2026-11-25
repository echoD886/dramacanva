import { resolveDirectorAspectRatio } from "./director-scene-data";
import type { DirectorAspectRatio } from "@/types/director";

/** 画布使用世界坐标；可用屏幕高度先按缩放换算，控制区不占用画面。 */
export function directorCardSize(aspect?: DirectorAspectRatio, { availableHeight = Infinity, scale = 1, controlsHeight }: { availableHeight?: number; scale?: number; controlsHeight?: number } = {}) {
    const ratio = resolveDirectorAspectRatio(aspect);
    const chromeHeight = controlsHeight ?? (ratio < 1 ? 188 : 156);
    const maxHeight = Math.max(chromeHeight + 1, Math.floor(availableHeight / Math.max(0.05, scale)));
    const width = ratio < 1 ? Math.min(300, (maxHeight - chromeHeight) * ratio + 24) : 640;
    return { width, height: Math.ceil((width - 24) / ratio) + chromeHeight };
}
