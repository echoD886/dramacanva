import { currentLocaleText } from "@/i18n/current-locale-text";
import { getActiveUserScope } from "@/lib/user-scope";
import { flushAssetStorePersistence, useAssetStore, type NewAsset } from "@/stores/use-asset-store";
import { flushCanvasStorePersistence, useCanvasStore } from "@/stores/canvas/use-canvas-store";
import { hasRemoteUserDataSyncSession, saveRemoteAssetNow, saveRemoteUserDataNow } from "@/services/user-data-sync";
import { resolveAssetIngest } from "@/services/asset-archive";
import { DEFAULT_FOLDER_STYLE, DEFAULT_FOLDER_THEME, isValidFolderCover, type FolderPresentation } from "@/types/asset-archive";

export type CanvasFolderCreateInput = {
    title: string;
    projectId?: string;
    folderPresentation?: FolderPresentation;
    uploadedCover?: NewAsset;
};

/** Keep one command for the dialog draft: double submit and retries share its ID. */
export function createCanvasFolderCommand(input: CanvasFolderCreateInput) {
    const scope = getActiveUserScope();
    let id: string | undefined;
    let coverAssetId: string | undefined;
    let pending: Promise<{ id: string; savedTo: "local" | "remote" }> | undefined;
    const title = input.title.trim();
    const presentation: FolderPresentation = { ...structuredClone(input.folderPresentation ?? { style: DEFAULT_FOLDER_STYLE, theme: DEFAULT_FOLDER_THEME }), source: "manual" };
    function assertScope() {
        if (scope !== getActiveUserScope()) throw new DOMException("Account changed", "AbortError");
    }
    async function execute() {
        assertScope();
        if (!title || !isValidFolderCover(presentation.cover) || (presentation.cover?.mode === "upload" && /^(blob:|data:|https?:)/.test(presentation.cover.storageKey))) throw new Error(currentLocaleText("canvasExtra.cloudSync.syncFailedRetry"));
        if (!id) {
            id = useCanvasStore.getState().createProject(title, input.projectId);
            useCanvasStore.getState().updateProject(id, { folderPresentation: presentation });
        }
        if (input.uploadedCover && !coverAssetId) {
            coverAssetId = useAssetStore.getState().addAsset(resolveAssetIngest(input.uploadedCover, { canvasId: id, sourceCode: "canvas-upload" }));
            if (presentation.cover?.mode === "upload") useCanvasStore.getState().updateProject(id, { folderPresentation: { ...presentation, cover: { ...presentation.cover, assetId: coverAssetId } } });
        }
        await Promise.all([flushCanvasStorePersistence(), flushAssetStorePersistence()]);
        assertScope();
        if (scope === "guest") return { id, savedTo: "local" as const };
        if (!hasRemoteUserDataSyncSession()) throw Object.assign(new Error(currentLocaleText("canvasExtra.cloudSync.noSession")), { reason: "no-session" });
        if (coverAssetId) await saveRemoteAssetNow(coverAssetId);
        await saveRemoteUserDataNow(id);
        assertScope();
        return { id, savedTo: "remote" as const };
    }
    return {
        get id() { return id; },
        create() {
            if (!pending) {
                pending = execute().catch(error => {
                    if (error instanceof DOMException && error.name === "AbortError") throw error;
                    if (error instanceof Error && "reason" in error && error.reason === "no-session") throw error;
                    throw new Error(currentLocaleText("canvasExtra.cloudSync.syncFailedRetry"));
                });
                void pending.finally(() => { pending = undefined; }).catch(() => undefined);
            }
            return pending;
        },
    };
}
