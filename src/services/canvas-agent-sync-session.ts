import { getActiveUserScope } from "@/lib/user-scope";
import { useUserStore } from "@/stores/use-user-store";
import { createAgentCanvasSync } from "./agent-canvas-sync";
import { createAgentCanvasSyncRegistry } from "./shared-agent-canvas-sync";

const registry = createAgentCanvasSyncRegistry();
// Invalidate queued work synchronously, before account stores are rehydrated.
useUserStore.subscribe((state, previous) => {
    if (!state.hydrated || state.user?.id !== previous.user?.id) registry.clear();
});

export function acquireCanvasAgentSync(options: Parameters<typeof createAgentCanvasSync>[0]) {
    return registry.acquire(getActiveUserScope(), options);
}
