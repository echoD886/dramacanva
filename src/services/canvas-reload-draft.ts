import { localForageStorageForScope, preparePageHideStorage, writePageHideStorage } from "@/lib/localforage-storage";
import { sameCanvasContent } from "@/lib/canvas/canvas-content";
import type { CanvasProject } from "@/stores/canvas/use-canvas-store";
import { canvasEditorSessionId, prepareCanvasEditorSession } from "./canvas-editor-session";

export type CanvasReloadDraft = { project: CanvasProject; baseline?: CanvasProject; nodeIds: string[] };
const versions = new Map<string, number>();
const keyFor = (id: string) => `infinite-canvas:reload-draft:${canvasEditorSessionId()}:${id}`;

export async function readCanvasReloadDraft(id: string, scope: string): Promise<CanvasReloadDraft | undefined> {
    await prepareCanvasEditorSession();
    await preparePageHideStorage();
    const raw = await localForageStorageForScope(scope).getItem(keyFor(id));
    return raw ? JSON.parse(raw) : undefined;
}

export function writeCanvasReloadDraft(draft: CanvasReloadDraft, scope: string) {
    const key = keyFor(draft.project.id);
    versions.set(key, (versions.get(key) || 0) + 1);
    // A dedicated record has no cross-tab read/merge/lock round trip at pagehide.
    // localforage is already open by the time the editor is ready for input.
    return writePageHideStorage(key, JSON.stringify(draft), scope);
}

export async function clearCanvasReloadDraft(id: string, saved: CanvasProject, scope: string) {
    const key = keyFor(id), version = versions.get(key);
    const storage = localForageStorageForScope(scope);
    const raw = await storage.getItem(key);
    if (versions.get(key) === version && raw && sameCanvasContent((JSON.parse(raw) as CanvasReloadDraft).project, saved)) await storage.removeItem?.(key);
}
