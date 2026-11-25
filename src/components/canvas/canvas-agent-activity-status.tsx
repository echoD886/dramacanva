import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/use-i18n";
import { createCanvasAgentActivity } from "@/services/canvas-agent-activity";
import { acquireCanvasAgentSync } from "@/services/canvas-agent-sync-session";
import { getCanvasAgentActivity, subscribeAgentEvents } from "@/services/api/agent";
import { applyAgentCanvasPatches, refreshCanvasAfterAgent } from "@/services/user-data-sync";
import { useCanvasStore } from "@/stores/canvas/use-canvas-store";
import { useUserStore } from "@/stores/use-user-store";

/** Mounted with the editor, independently of the Agent panel's conversation. */
export function CanvasAgentActivityStatus({ canvasId, ready }: { canvasId: string; ready: boolean }) {
    const { t } = useI18n();
    const userId = useUserStore((state) => state.user?.id);
    const hydrated = useUserStore((state) => state.hydrated);
    const [editing, setEditing] = useState(false);
    useEffect(() => {
        if (!ready || !hydrated || !userId) return;
        const sync = acquireCanvasAgentSync({
            canvasId,
            applyPatches: (patches) => applyAgentCanvasPatches(canvasId, patches),
            refresh: () => refreshCanvasAfterAgent(canvasId),
            // Existing sync progress UI retains and explains conflicting drafts.
            onError: () => undefined,
        });
        const activity = createCanvasAgentActivity({
            discover: (after, signal) => getCanvasAgentActivity(canvasId, after, signal),
            subscribe: subscribeAgentEvents,
            sync,
            revision: () => useCanvasStore.getState().openProject(canvasId)?.revision,
            onEditing: setEditing,
            onError: () => undefined,
            visible: () => document.visibilityState !== "hidden",
            onVisibility: (listener) => {
                document.addEventListener("visibilitychange", listener);
                return () => document.removeEventListener("visibilitychange", listener);
            },
        });
        // Stop synchronously when identity becomes uncertain, before React commits.
        const unsubscribe = useUserStore.subscribe((state) => {
            if (!state.hydrated || state.user?.id !== userId) {
                activity.dispose();
                sync.dispose();
            }
        });
        return () => {
            unsubscribe();
            activity.dispose();
            sync.dispose();
        };
    }, [canvasId, ready, hydrated, userId]);
    if (!editing || !ready || !hydrated) return null;
    return (
        <div
            role="status"
            aria-live="polite"
            className="pointer-events-none absolute top-20 left-1/2 -translate-x-1/2 px-3 py-1 text-xs"
            style={{ color: "var(--foreground)", background: "var(--workspace-overlay-bg-strong)", borderRadius: "var(--r-lg)", zIndex: "var(--z-toolbar)" }}
        >
            {t("canvasCloudAgent.externalEditing")}
        </div>
    );
}
