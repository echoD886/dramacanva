import { registerUnloadGuard } from "@/stores/use-sync-progress-store";

const pending = new Set<() => void>();
registerUnloadGuard(hasPendingCanvasTextEdits);

export function hasPendingCanvasTextEdits() {
    return pending.size > 0;
}

// Gestures can pan a focused node out of the mounted viewport or replace it.
// Commit the pending cell before those commands change its owner.
if (typeof window !== "undefined") {
    window.addEventListener("pointerdown", flushCanvasTextEdits, true);
    window.addEventListener("wheel", flushCanvasTextEdits, { capture: true, passive: true });
}

export function queueCanvasTextEdit(flush: () => void) {
    pending.add(flush);
}

export function finishCanvasTextEdit(flush: () => void) {
    pending.delete(flush);
}

/** User commands and page lifecycle saves read the latest refs, including buffered cells. */
export function flushCanvasTextEdits() {
    for (const flush of [...pending]) flush();
}
