import { createAgentCanvasSync } from "./agent-canvas-sync";
import type { AgentEvent } from "./api/agent";

type Options = Parameters<typeof createAgentCanvasSync>[0];
type Entry = {
    sync: ReturnType<typeof createAgentCanvasSync>;
    cursors: Map<string, number>;
    errors: Set<Options["onError"]>;
};

/** A canvas has one serialized patch queue even when panel and discovery overlap. */
export function createAgentCanvasSyncRegistry() {
    const entries = new Map<string, Entry>();
    return {
        acquire(scope: string, options: Options) {
            const key = JSON.stringify([scope, options.canvasId]);
            let entry = entries.get(key);
            if (!entry) {
                const errors = new Set<Options["onError"]>();
                entry = { errors, cursors: new Map(), sync: createAgentCanvasSync({ ...options, onError: (error) => errors.forEach((listener) => listener(error)) }) };
                entries.set(key, entry);
            }
            const shared = entry;
            // Each lease owns a listener, even when callers pass the same function.
            const onError = (error: unknown) => options.onError(error);
            shared.errors.add(onError);
            let disposed = false;
            const live = () => !disposed && entries.get(key) === shared;
            return {
                receive(event: AgentEvent) {
                    if (!live()) return;
                    if (event.seq > 0) {
                        const previous = shared.cursors.get(event.runId) || 0;
                        if (event.seq <= previous) return;
                        if (event.seq > previous + 1) shared.sync.reconcile();
                        shared.cursors.delete(event.runId);
                        shared.cursors.set(event.runId, event.seq);
                        if (shared.cursors.size > 1000) shared.cursors.delete(shared.cursors.keys().next().value!);
                    }
                    shared.sync.receive(event);
                },
                reconcile() {
                    if (live()) shared.sync.reconcile();
                },
                dispose() {
                    if (disposed) return;
                    disposed = true;
                    shared.errors.delete(onError);
                    if (!shared.errors.size) {
                        shared.sync.dispose();
                        if (entries.get(key) === shared) entries.delete(key);
                    }
                },
            };
        },
        clear() {
            entries.forEach((entry) => entry.sync.dispose());
            entries.clear();
        },
    };
}
