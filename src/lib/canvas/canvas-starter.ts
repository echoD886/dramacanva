import { scopedStorageKey } from "@/lib/user-scope";

export type CanvasStarterMode = "guided" | "freeform";

export type CanvasEmptyStateKind = "none" | "guided" | "freeform" | "linked";

export function resolveCanvasEmptyStateKind({
    nodeCount,
    shortDramaEnabled,
    isProjectLinked,
    starterMode,
}: {
    nodeCount: number;
    shortDramaEnabled: boolean;
    isProjectLinked: boolean;
    starterMode?: CanvasStarterMode;
}): CanvasEmptyStateKind {
    if (nodeCount > 0) return "none";
    if (!shortDramaEnabled) return "freeform";
    if (isProjectLinked) return "linked";
    return starterMode === "freeform" ? "freeform" : "guided";
}

// 用户选过一次“空白画布”后，之后新建的画布直接进入空白模式，不再每次弹“从哪里开始”三选一。
const DEFAULT_STARTER_KEY = "canvas-default-starter";

export function rememberFreeformStarter() {
    try {
        window.localStorage.setItem(scopedStorageKey(DEFAULT_STARTER_KEY), "freeform");
    } catch {
        /* 存储不可用时下次仍显示选择。 */
    }
}

export function preferredStarterMode(): CanvasStarterMode | undefined {
    try {
        return window.localStorage.getItem(scopedStorageKey(DEFAULT_STARTER_KEY)) === "freeform" ? "freeform" : undefined;
    } catch {
        return undefined;
    }
}
