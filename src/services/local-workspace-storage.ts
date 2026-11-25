import localforage from "localforage";

import { getActiveUserScope } from "@/lib/user-scope";
import { createScopedInflightRead } from "@/lib/scoped-inflight-read";
import { currentLocaleText } from "@/i18n/current-locale-text";

export type LocalWorkspaceMode = "unconfigured" | "directory" | "browser";
export type LocalWorkspacePermission = "granted" | "prompt" | "denied" | "unsupported";

export type LocalWorkspaceState = {
    mode: LocalWorkspaceMode;
    directoryName: string;
    permission: LocalWorkspacePermission;
    supported: boolean;
    recordedBytes: number;
};

type StoredWorkspacePreference = {
    mode: Exclude<LocalWorkspaceMode, "unconfigured">;
    directoryName?: string;
    updatedAt: string;
};

type StoredLocalFile = {
    key: string;
    scope: string;
    path: string[];
    bytes: number;
    mimeType: string;
    updatedAt: string;
};

type PermissionDescriptor = { mode?: "read" | "readwrite" };
type PermissionAwareDirectoryHandle = FileSystemDirectoryHandle & {
    queryPermission?: (descriptor?: PermissionDescriptor) => Promise<PermissionState>;
    requestPermission?: (descriptor?: PermissionDescriptor) => Promise<PermissionState>;
};
type DirectoryPickerWindow = Window & {
    showDirectoryPicker?: (options?: { id?: string; mode?: "read" | "readwrite"; startIn?: string | FileSystemHandle }) => Promise<FileSystemDirectoryHandle>;
};

const settingsStore = localforage.createInstance({ name: "dramacanva-public", storeName: "local_workspace" });
const filesStore = localforage.createInstance({ name: "dramacanva-public", storeName: "local_workspace_files" });
const WORKSPACE_CHANGE_EVENT = "dramacanva-public-local-workspace-change";
const OPEN_WORKSPACE_EVENT = "dramacanva-public-open-local-workspace";
const stateReads = createScopedInflightRead<LocalWorkspaceState>();
const byteReads = createScopedInflightRead<number>();
// Background collection must not initialize another store in the app_state
// database. The existing workspace hydration publishes authorized handles here.
const mediaDirectories = new Map<string, PermissionAwareDirectoryHandle>();
let workspaceGeneration = 0;

function preferenceKey(scope = getActiveUserScope()) {
    return `preference:${scope}`;
}

function handleKey(scope = getActiveUserScope()) {
    return `directory-handle:${scope}`;
}

function fileKey(storageKey: string) {
    return `file:${storageKey}`;
}

export function supportsLocalDirectoryWorkspace() {
    return typeof window !== "undefined" && typeof (window as DirectoryPickerWindow).showDirectoryPicker === "function";
}

export function getLocalWorkspaceState(scope = getActiveUserScope()): Promise<LocalWorkspaceState> {
    return stateReads.read(scope, () => readLocalWorkspaceState(scope));
}

async function readLocalWorkspaceState(scope: string): Promise<LocalWorkspaceState> {
    const generation = workspaceGeneration;
    const supported = supportsLocalDirectoryWorkspace();
    const [preference, recordedBytes] = await Promise.all([settingsStore.getItem<StoredWorkspacePreference>(preferenceKey(scope)), recordedLocalWorkspaceBytes(scope)]);
    if (generation === workspaceGeneration) mediaDirectories.delete(scope);
    if (!preference) return { mode: "unconfigured", directoryName: "", permission: supported ? "prompt" : "unsupported", supported, recordedBytes };
    if (preference.mode === "browser") return { mode: "browser", directoryName: currentLocaleText("runtimeSafety.browserStorage"), permission: "granted", supported, recordedBytes };
    const handle = await settingsStore.getItem<PermissionAwareDirectoryHandle>(handleKey(scope));
    if (!handle) return { mode: "unconfigured", directoryName: "", permission: supported ? "prompt" : "unsupported", supported, recordedBytes };
    const permission = await queryDirectoryPermission(handle);
    if (permission === "granted" && generation === workspaceGeneration) mediaDirectories.set(scope, handle);
    return {
        mode: "directory",
        directoryName: handle.name || preference.directoryName || currentLocaleText("runtimeSafety.localFolder"),
        permission,
        supported,
        recordedBytes,
    };
}

export async function chooseLocalWorkspaceDirectory(scope = getActiveUserScope()) {
    const picker = (window as DirectoryPickerWindow).showDirectoryPicker;
    if (!picker) throw new Error(currentLocaleText("runtimeSafety.folderUnsupported"));
    const handle = (await picker({ id: "dramacanva-public-local-assets", mode: "readwrite", startIn: "documents" })) as PermissionAwareDirectoryHandle;
    const permission = await requestDirectoryPermission(handle);
    if (permission !== "granted") throw new Error(currentLocaleText("runtimeSafety.folderPermissionDenied"));
    await settingsStore.setItem(handleKey(scope), handle);
    await settingsStore.setItem<StoredWorkspacePreference>(preferenceKey(scope), { mode: "directory", directoryName: handle.name, updatedAt: new Date().toISOString() });
    emitWorkspaceChange();
    return getLocalWorkspaceState(scope);
}

export async function useBrowserLocalWorkspace(scope = getActiveUserScope()) {
    await settingsStore.setItem<StoredWorkspacePreference>(preferenceKey(scope), { mode: "browser", updatedAt: new Date().toISOString() });
    if (navigator.storage?.persist) await navigator.storage.persist().catch(() => false);
    emitWorkspaceChange();
    return getLocalWorkspaceState(scope);
}

export async function reconnectLocalWorkspace(scope = getActiveUserScope()) {
    const handle = await settingsStore.getItem<PermissionAwareDirectoryHandle>(handleKey(scope));
    if (!handle) return chooseLocalWorkspaceDirectory(scope);
    const permission = await requestDirectoryPermission(handle);
    if (permission !== "granted") throw new Error(currentLocaleText("runtimeSafety.folderPermissionDenied"));
    emitWorkspaceChange();
    return getLocalWorkspaceState(scope);
}

// Never prompts: directory authorization remains a user-gesture operation.
export async function authorizedLocalMediaDirectory(scope = getActiveUserScope()) {
    // Allow the normal onboarding effect to publish its in-flight hydration;
    // joining it is safe, starting another IndexedDB read here is not.
    await Promise.resolve();
    await stateReads.peek(scope);
    const handle = mediaDirectories.get(scope);
    if (!handle || (await queryDirectoryPermission(handle)) !== "granted") return null;
    return handle;
}

/** 本地媒体 key 属于其他账号。调用方不得把它当作“文件夹不可用”而改写进浏览器存储。 */
export class LocalWorkspaceScopeError extends Error {}

export function assertLocalStorageKeyScope(storageKey: string) {
    if (storageScope(storageKey) !== getActiveUserScope()) throw new LocalWorkspaceScopeError(currentLocaleText("runtimeSafety.otherAccountStorage"));
}

/** 导入包里的本地 key 可能来自其他账号：换成当前账号的同名 key，内容才归当前账号所有、可被其清理和同步。 */
export function rescopeLocalStorageKey(storageKey: string, scope = getActiveUserScope()) {
    const parts = storageKey.split(":");
    if (storageKey.startsWith("resource:") || parts.length < 3 || parts[1] === scope) return storageKey;
    parts[1] = scope;
    return parts.join(":");
}

export async function writeLocalWorkspaceBlob(storageKey: string, blob: Blob, options?: { fileName?: string; category?: string }) {
    const scope = storageScope(storageKey);
    assertLocalStorageKeyScope(storageKey);
    const preference = await settingsStore.getItem<StoredWorkspacePreference>(preferenceKey(scope));
    if (preference?.mode !== "directory") return false;
    const handle = await settingsStore.getItem<PermissionAwareDirectoryHandle>(handleKey(scope));
    if (!handle || (await queryDirectoryPermission(handle)) !== "granted") return false;
    const category = safePathSegment(options?.category || categoryForMimeType(blob.type));
    const extension = extensionForBlob(blob, options?.fileName);
    const uniqueId = safePathSegment(storageKey.split(":").at(-1) || crypto.randomUUID()).slice(-24);
    const baseName = safeFileBase(options?.fileName) || "素材";
    const fileName = `${baseName}-${uniqueId}${extension}`;
    const folder = await handle.getDirectoryHandle(category, { create: true });
    const fileHandle = await folder.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    await filesStore.setItem<StoredLocalFile>(fileKey(storageKey), {
        key: storageKey,
        scope,
        path: [category, fileName],
        bytes: blob.size,
        mimeType: blob.type || "application/octet-stream",
        updatedAt: new Date().toISOString(),
    });
    emitWorkspaceChange();
    return true;
}

export async function readLocalWorkspaceBlob(storageKey: string) {
    const metadata = await filesStore.getItem<StoredLocalFile>(fileKey(storageKey));
    if (!metadata) return null;
    if (metadata.key !== storageKey || metadata.scope !== storageScope(storageKey) || metadata.scope !== getActiveUserScope()) return null;
    const handle = await settingsStore.getItem<PermissionAwareDirectoryHandle>(handleKey(metadata.scope));
    if (!handle || (await queryDirectoryPermission(handle)) !== "granted") return null;
    try {
        const folder = await handle.getDirectoryHandle(metadata.path[0]);
        const fileHandle = await folder.getFileHandle(metadata.path[1]);
        return await fileHandle.getFile();
    } catch {
        return null;
    }
}

export async function deleteLocalWorkspaceBlob(storageKey: string) {
    const metadata = await filesStore.getItem<StoredLocalFile>(fileKey(storageKey));
    if (!metadata) return false;
    if (metadata.key !== storageKey || metadata.scope !== storageScope(storageKey) || metadata.scope !== getActiveUserScope()) return false;
    const handle = await settingsStore.getItem<PermissionAwareDirectoryHandle>(handleKey(metadata.scope));
    if (handle && (await queryDirectoryPermission(handle)) === "granted") {
        try {
            const folder = await handle.getDirectoryHandle(metadata.path[0]);
            await folder.removeEntry(metadata.path[1]);
        } catch {
            // The user may already have removed or moved the file outside the app.
        }
    }
    await filesStore.removeItem(fileKey(storageKey));
    emitWorkspaceChange();
    return true;
}

export function recordedLocalWorkspaceBytes(scope = getActiveUserScope()) {
    return byteReads.read(scope, async () => {
        let bytes = 0;
        await filesStore.iterate<StoredLocalFile, void>((item) => {
            if (item?.scope === scope) bytes += Math.max(0, Number(item.bytes) || 0);
        });
        return bytes;
    });
}

export async function listLocalWorkspaceKeys(scope = getActiveUserScope()) {
    const keys: string[] = [];
    await filesStore.iterate<StoredLocalFile, void>((item) => {
        if (item?.scope === scope && item.key) keys.push(item.key);
    });
    return keys;
}

export function openLocalWorkspaceManager() {
    window.dispatchEvent(new Event(OPEN_WORKSPACE_EVENT));
}

export function onLocalWorkspaceChange(listener: () => void) {
    window.addEventListener(WORKSPACE_CHANGE_EVENT, listener);
    return () => window.removeEventListener(WORKSPACE_CHANGE_EVENT, listener);
}

export function onOpenLocalWorkspaceManager(listener: () => void) {
    window.addEventListener(OPEN_WORKSPACE_EVENT, listener);
    return () => window.removeEventListener(OPEN_WORKSPACE_EVENT, listener);
}

function emitWorkspaceChange() {
    // Mutations must not let new readers join an older in-flight snapshot.
    workspaceGeneration++;
    mediaDirectories.clear();
    stateReads.invalidate();
    byteReads.invalidate();
    window.dispatchEvent(new Event(WORKSPACE_CHANGE_EVENT));
}

async function queryDirectoryPermission(handle: PermissionAwareDirectoryHandle): Promise<LocalWorkspacePermission> {
    if (!handle.queryPermission) return "prompt";
    return (await handle.queryPermission({ mode: "readwrite" }).catch(() => "denied")) as LocalWorkspacePermission;
}

async function requestDirectoryPermission(handle: PermissionAwareDirectoryHandle): Promise<LocalWorkspacePermission> {
    const current = await queryDirectoryPermission(handle);
    if (current === "granted") return current;
    if (!handle.requestPermission) return current;
    return (await handle.requestPermission({ mode: "readwrite" }).catch(() => "denied")) as LocalWorkspacePermission;
}

function storageScope(storageKey: string) {
    const parts = storageKey.split(":");
    return parts.length >= 3 ? parts[1] : getActiveUserScope();
}

function categoryForMimeType(mimeType: string) {
    if (mimeType.startsWith("image/")) return "图片";
    if (mimeType.startsWith("video/")) return "视频";
    if (mimeType.startsWith("audio/")) return "音频";
    return "文件";
}

function safePathSegment(value: string) {
    return value.replace(/[\\/:*?"<>|]/g, "-").trim() || "文件";
}

function safeFileBase(value?: string) {
    const fileName = (value || "").split(/[\\/]/).at(-1) || "";
    const base = fileName.replace(/\.[a-z0-9]{1,10}$/i, "");
    if (!base.trim()) return "";
    return safePathSegment(base).slice(0, 96);
}

function extensionForBlob(blob: Blob, fileName?: string) {
    const named = (fileName || "").match(/(\.[a-z0-9]{1,10})$/i)?.[1];
    if (named) return named.toLowerCase();
    const known: Record<string, string> = {
        "image/png": ".png",
        "image/jpeg": ".jpg",
        "image/webp": ".webp",
        "image/gif": ".gif",
        "video/mp4": ".mp4",
        "video/quicktime": ".mov",
        "audio/mpeg": ".mp3",
        "audio/wav": ".wav",
        "application/pdf": ".pdf",
    };
    return known[blob.type] || ".bin";
}
