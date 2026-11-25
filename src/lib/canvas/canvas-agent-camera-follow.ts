import { useSyncExternalStore } from "react";
import { getActiveUserScope } from "@/lib/user-scope";
const listeners = new Set<() => void>();
export function readCanvasAgentCameraFollow() {
    try {
        return localStorage.getItem(`canvas-agent-follow:${getActiveUserScope()}`) !== "off";
    } catch {
        return true;
    }
}
export function persistCanvasAgentCameraFollow(value: boolean) {
    try {
        localStorage.setItem(`canvas-agent-follow:${getActiveUserScope()}`, value ? "on" : "off");
    } catch {
        /* Keep the existing preference if storage is unavailable. */
    }
    for (const listener of listeners) listener();
}
export function useCanvasAgentCameraFollow() {
    return useSyncExternalStore(
        (callback) => {
            listeners.add(callback);
            return () => {
                listeners.delete(callback);
            };
        },
        readCanvasAgentCameraFollow,
        () => true,
    );
}
