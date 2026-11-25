export type DirectorWindowBounds = { x: number; y: number; width: number; height: number };
export type DirectorWindowViewport = { width: number; height: number };
export type DirectorWindowEdge = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

export const DIRECTOR_WINDOW_EDGES: DirectorWindowEdge[] = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

/** Keep every edge and the title bar reachable after monitor/viewport changes. */
export function constrainDirectorWindow(bounds: DirectorWindowBounds, viewport: DirectorWindowViewport): DirectorWindowBounds {
    const width = clamp(bounds.width, Math.min(720, viewport.width), viewport.width);
    const height = clamp(bounds.height, Math.min(480, viewport.height), viewport.height);
    return { width, height, x: clamp(bounds.x, 0, viewport.width - width), y: clamp(bounds.y, 0, viewport.height - height) };
}

export function defaultDirectorWindow(viewport: DirectorWindowViewport): DirectorWindowBounds {
    const bounds = constrainDirectorWindow({ x: 0, y: 0, width: Math.round(viewport.width * 0.82), height: Math.round(viewport.height * 0.78) }, viewport);
    return { ...bounds, x: (viewport.width - bounds.width) / 2, y: (viewport.height - bounds.height) / 2 };
}

export function resizeDirectorWindow(start: DirectorWindowBounds, edge: DirectorWindowEdge, dx: number, dy: number, viewport: DirectorWindowViewport): DirectorWindowBounds {
    const right = start.x + start.width;
    const bottom = start.y + start.height;
    const x = edge.includes("w") ? clamp(start.x + dx, 0, right - Math.min(720, viewport.width)) : start.x;
    const y = edge.includes("n") ? clamp(start.y + dy, 0, bottom - Math.min(480, viewport.height)) : start.y;
    const width = edge.includes("w") ? right - x : edge.includes("e") ? clamp(start.width + dx, Math.min(720, viewport.width), viewport.width - x) : start.width;
    const height = edge.includes("n") ? bottom - y : edge.includes("s") ? clamp(start.height + dy, Math.min(480, viewport.height), viewport.height - y) : start.height;
    return constrainDirectorWindow({ x, y, width, height }, viewport);
}

export function directorWindowStorageKey(scope: string) {
    return scope.trim() ? `infinite-canvas:director-window:user:${encodeURIComponent(scope.trim())}` : null;
}

export function readDirectorWindow(scope: string, viewport: DirectorWindowViewport, storage?: Pick<Storage, "getItem">): DirectorWindowBounds {
    const fallback = defaultDirectorWindow(viewport);
    try {
        const key = directorWindowStorageKey(scope);
        if (!key) return fallback;
        const value = JSON.parse((storage || localStorage).getItem(key) || "null");
        if (!value || ![value.x, value.y, value.width, value.height].every(Number.isFinite) || value.width <= 0 || value.height <= 0) return fallback;
        return constrainDirectorWindow(value, viewport);
    } catch {
        return fallback;
    }
}

export function rememberDirectorWindow(scope: string, bounds: DirectorWindowBounds, storage?: Pick<Storage, "setItem">) {
    try {
        const key = directorWindowStorageKey(scope);
        if (key) (storage || localStorage).setItem(key, JSON.stringify(bounds));
    } catch {
        // Preferences are optional when storage is blocked or full.
    }
}
