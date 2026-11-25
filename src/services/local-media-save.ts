import localforage from "localforage";
import { getActiveUserScope } from "@/lib/user-scope";
import { getAuthIdentityGeneration, isAuthIdentityChanging } from "@/services/api/auth";
import { localMediaManifest, pendingLocalMedia, sendLocalMediaReceipt, type LocalMediaItem } from "@/services/api/local-media";
import { resourceFileUrl, refreshResource } from "@/services/api/resources";
import { apiClient, request } from "@/services/api/request";
import { currentLocaleText } from "@/i18n/current-locale-text";
import { authorizedLocalMediaDirectory } from "@/services/local-workspace-storage";
import { assertMediaDigest, digestMediaStream, verifyMediaFile } from "@/services/local-media-stream";
import { withLocalMediaLock } from "@/services/local-media-lock";
import { waitForLocalMedia } from "@/services/local-media-wait";

type SavedMedia = { scope: string; deviceId: string; directory: FileSystemDirectoryHandle; item: LocalMediaItem; paths: Record<string, string>; stage: "downloading" | "verifying" | "indexed" | "receipted"; verifiedAt?: string };
export type LocalMediaRead = { status: "available"; file: File } | { status: "needs_permission" | "missing" | "index_lost" | "unknown" };
// localforage shares initialization/dbReady across stores of the same database.
// A media index upgrade must never hold up Agent history or canvas persistence.
const mappingStore = localforage.createInstance({ name: "dramacanva-public-local-media", storeName: "local_media_mappings" });
const mappings = {
    keys: () => waitForLocalMedia(mappingStore.keys()),
    getItem: <T>(key: string) => waitForLocalMedia(mappingStore.getItem<T>(key)),
    setItem: (key: string, value: SavedMedia) => waitForLocalMedia(mappingStore.setItem(key, value)),
};
const urls = new Map<string, { file: File; url: string }>();

export function clearLocalMediaURLs() {
    for (const entry of urls.values()) URL.revokeObjectURL(entry.url);
    urls.clear();
}

export async function hasLocalMediaMappings() {
    if (typeof window === "undefined" || typeof localStorage === "undefined") return false;
    if (!(await waitForLocalMedia(authorizedLocalMediaDirectory()).catch(() => null))) return false;
    const prefix = `${getActiveUserScope()}:${deviceId()}:`;
    return (await waitForLocalMedia(mappings.keys()).catch(() => [])).some((key) => key.startsWith(prefix));
}

function identity() {
    return `${getActiveUserScope()}:${getAuthIdentityGeneration()}`;
}
function deviceId() {
    const key = `dramacanva-public-local-media-device:${getActiveUserScope()}`;
    let value = localStorage.getItem(key);
    if (!value) {
        value = crypto.randomUUID();
        localStorage.setItem(key, value);
    }
    return value;
}
function mappingKey(scope: string, device: string, id: string, version: number) {
    return `${scope}:${device}:${id}:v${version}`;
}
async function latestMapping(scope: string, device: string, id: string) {
    const prefix = `${scope}:${device}:${id}:v`;
    const keys = (await mappings.keys()).filter((key) => key.startsWith(prefix)).sort((a, b) => Number(b.slice(prefix.length)) - Number(a.slice(prefix.length)));
    for (const key of keys) {
        const saved = await mappings.getItem<SavedMedia>(key);
        if (saved && ["indexed", "receipted"].includes(saved.stage)) return saved;
    }
    return null;
}
function mediaFilename(item: LocalMediaItem, variant: LocalMediaItem["variants"][number]) {
    if (!Number.isSafeInteger(item.objectVersion) || item.objectVersion < 1 || !/^[a-f0-9]{64}$/.test(variant.sha256)) throw new Error("LOCAL_MEDIA_MANIFEST_INVALID");
    return `${safeId(item.resourceId)}-v${item.objectVersion}-${variant.variant}-${variant.sha256}.media`;
}
function safeId(id: string) {
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) throw new Error("LOCAL_MEDIA_INVALID_ID");
    return id;
}

async function mediaFolder(directory: FileSystemDirectoryHandle, scope: string, create = false) {
    const root = await directory.getDirectoryHandle("dramacanva-public-generated", { create });
    return root.getDirectoryHandle(safeId(scope), { create });
}

async function persistManifest(folder: FileSystemDirectoryHandle, saved: SavedMedia) {
    const handle = await folder.getFileHandle(`${safeId(saved.item.resourceId)}-v${saved.item.objectVersion}.json`, { create: true });
    const prior = await handle.getFile();
    if (prior.size > 0) {
        if (prior.size > 64 * 1024) throw new Error("LOCAL_MEDIA_MANIFEST_INVALID");
        const value = JSON.parse(await prior.text()) as { format?: number; scope?: string; item?: LocalMediaItem };
        if (value.format !== 1 || value.scope !== saved.scope || value.item?.resourceId !== saved.item.resourceId || value.item?.objectVersion !== saved.item.objectVersion) throw new Error("LOCAL_MEDIA_MANIFEST_INVALID");
    }
    const content = JSON.stringify({ format: 1, scope: saved.scope, item: saved.item, paths: saved.paths });
    const writer = await handle.createWritable();
    try {
        await writer.write(content);
        await writer.close();
        if ((await (await handle.getFile()).text()) !== content) throw new Error("LOCAL_MEDIA_MANIFEST_WRITE_FAILED");
    } catch (error) {
        await writer.abort().catch(() => undefined);
        throw error;
    }
}

async function verifySaved(folder: FileSystemDirectoryHandle, saved: SavedMedia, signal?: AbortSignal) {
    for (const variant of saved.item.variants) {
        const name = saved.paths[variant.variant];
        if (name !== mediaFilename(saved.item, variant)) throw new Error("LOCAL_MEDIA_INVALID_PATH");
        const handle = await folder.getFileHandle(name);
        await verifyMediaFile(await handle.getFile(), variant, signal);
    }
}

async function saveItem(item: LocalMediaItem, directory: FileSystemDirectoryHandle, scope: string, device: string, signal: AbortSignal, assertHeld: () => Promise<void>) {
    const folder = await mediaFolder(directory, scope, true);
    const key = mappingKey(scope, device, item.resourceId, item.objectVersion);
    const saved: SavedMedia = { scope, deviceId: device, directory, item, paths: {}, stage: "downloading" };
    if (!item.variants.some((v) => v.variant === "original")) throw new Error("LOCAL_MEDIA_MANIFEST_EMPTY");
    for (const variant of item.variants) {
        signal.throwIfAborted();
        if (!/^[a-f0-9]{64}$/.test(variant.sha256) || !["original", "playback"].includes(variant.variant)) throw new Error("LOCAL_MEDIA_MANIFEST_INVALID");
        const name = mediaFilename(item, variant);
        saved.paths[variant.variant] = name;
        let existing: FileSystemFileHandle | undefined;
        try {
            existing = await folder.getFileHandle(name);
        } catch (error) {
            if ((error as DOMException).name !== "NotFoundError") throw error;
        }
        if (existing) {
            // Never overwrite a file whose contents no longer match its name.
            await verifyMediaFile(await existing.getFile(), variant, signal);
            continue;
        }
        await mappings.setItem(key, saved);
        const temporaryName = `${name}.${crypto.randomUUID()}.partial`;
        const temporary = await folder.getFileHandle(temporaryName, { create: true });
        try {
            const response = await fetch(`${resourceFileUrl(item.resourceId)}?proxy=1&variant=${variant.variant}`, { credentials: "include", signal });
            if (!response.ok || !response.body) throw new Error(`LOCAL_MEDIA_DOWNLOAD_${response.status}`);
            const writer = await temporary.createWritable();
            try {
                const digest = await digestMediaStream(response.body, signal, async (chunk) => {
                    await writer.write(chunk as Uint8Array<ArrayBuffer>);
                });
                assertMediaDigest(digest, variant);
                await writer.close();
            } catch (error) {
                await writer.abort().catch(() => undefined);
                throw error;
            }
            saved.stage = "verifying";
            await mappings.setItem(key, saved);
            await verifyMediaFile(await temporary.getFile(), variant, signal);
            signal.throwIfAborted();
            await assertHeld();
            const final = await folder.getFileHandle(name, { create: true });
            const finalWriter = await final.createWritable();
            try {
                await digestMediaStream((await temporary.getFile()).stream(), signal, async (chunk) => {
                    await finalWriter.write(chunk as Uint8Array<ArrayBuffer>);
                });
                await finalWriter.close();
                await verifyMediaFile(await final.getFile(), variant, signal);
            } catch (error) {
                await finalWriter.abort().catch(() => undefined);
                // An expired lease must never delete a successor's published file.
                try {
                    await assertHeld();
                    await folder.removeEntry(name);
                } catch {
                    /* Preserve for diagnosis when ownership is uncertain. */
                }
                throw error;
            }
        } finally {
            await folder.removeEntry(temporaryName).catch(() => undefined);
        }
    }
    signal.throwIfAborted();
    await assertHeld();
    saved.stage = "indexed";
    saved.verifiedAt = new Date().toISOString();
    await persistManifest(folder, saved);
    await mappings.setItem(key, saved);
    // Recheck final files before a lost-response retry or first receipt alike.
    await verifySaved(folder, saved, signal);
    await assertHeld();
    signal.throwIfAborted();
    await sendLocalMediaReceipt(item, device, signal);
    saved.stage = "receipted";
    await mappings.setItem(key, saved);
}

export async function collectLocalMedia(signal?: AbortSignal, resourceId?: string, explicit = false) {
    if (typeof navigator === "undefined" || (!navigator.locks && !explicit) || isAuthIdentityChanging()) return;
    const scope = getActiveUserScope();
    const capturedIdentity = identity();
    const device = deviceId();
    const directory = await waitForLocalMedia(authorizedLocalMediaDirectory(scope), 1_000, signal);
    if (!directory) return;
    const controller = new AbortController();
    const stop = () => controller.abort();
    const checkIdentity = () => {
        if (identity() !== capturedIdentity || isAuthIdentityChanging()) stop();
    };
    signal?.addEventListener("abort", stop, { once: true });
    if (signal?.aborted) stop();
    window.addEventListener("dramacanva-public-local-workspace-change", stop);
    const timer = window.setInterval(checkIdentity, 100);
    try {
        // Discovery and index readiness run outside the exclusive file writer.
        const firstPage = resourceId ? { items: [await localMediaManifest(resourceId, controller.signal)], nextCursor: "" } : await pendingLocalMedia(device, "", controller.signal);
        const journalKeys = (await waitForLocalMedia(mappings.keys(), null, controller.signal)).filter((key) => key.startsWith(`${scope}:${device}:`));
        if (!firstPage.items.length && !firstPage.nextCursor && !journalKeys.length) return;
        controller.signal.throwIfAborted();
        await withLocalMediaLock(scope, explicit, controller, async (assertHeld) => {
            const failures = new Map<string, unknown>();
            const recovered = new Set<string>();
            // Pending excludes accepted receipts, even when their response was lost.
            // Reconcile the durable local journal independently of discovery.
            for (const key of journalKeys) {
                const saved = await mappings.getItem<SavedMedia>(key);
                if (!saved || saved.stage !== "indexed" || (resourceId && resourceId !== saved.item.resourceId)) continue;
                try {
                    if (!(await directory.isSameEntry(saved.directory))) continue;
                    await verifySaved(await mediaFolder(directory, scope), saved, controller.signal);
                    checkIdentity();
                    controller.signal.throwIfAborted();
                    await assertHeld();
                    await sendLocalMediaReceipt(saved.item, device, controller.signal);
                    saved.stage = "receipted";
                    await mappings.setItem(key, saved);
                    recovered.add(saved.item.resourceId);
                } catch (error) {
                    if (controller.signal.aborted) throw error;
                    failures.set(saved.item.resourceId, error);
                }
            }
            let cursor = "";
            do {
                checkIdentity();
                controller.signal.throwIfAborted();
                const page = cursor ? await pendingLocalMedia(device, cursor, controller.signal) : firstPage;
                for (const item of page.items) {
                    if (recovered.has(item.resourceId)) continue;
                    if (resourceId && item.resourceId !== resourceId) continue;
                    checkIdentity();
                    controller.signal.throwIfAborted();
                    if (!["available_unclaimed", "available_confirmed"].includes(item.serverCopyState)) {
                        if (explicit) failures.set(item.resourceId, new Error("LOCAL_MEDIA_SERVER_COPY_UNAVAILABLE"));
                        continue;
                    }
                    try {
                        await saveItem(item, directory, scope, device, controller.signal, async () => {
                            checkIdentity();
                            controller.signal.throwIfAborted();
                            await assertHeld();
                        });
                        failures.delete(item.resourceId);
                    } catch (error) {
                        if (controller.signal.aborted) throw error;
                        failures.set(item.resourceId, error);
                        window.dispatchEvent(new CustomEvent("dramacanva-public-local-media-error", { detail: { resourceId: item.resourceId, error } }));
                    }
                }
                cursor = page.nextCursor;
            } while (cursor);
            if (explicit && failures.size) throw failures.values().next().value;
        });
    } finally {
        window.clearInterval(timer);
        window.removeEventListener("dramacanva-public-local-workspace-change", stop);
        signal?.removeEventListener("abort", stop);
    }
}

export async function readLocalMedia(resourceId: string, variant = "original"): Promise<LocalMediaRead> {
    if (typeof window === "undefined" || typeof localStorage === "undefined" || isAuthIdentityChanging()) return { status: "unknown" };
    try {
        return await readMappedLocalMedia(resourceId, variant);
    } catch {
        return { status: "unknown" };
    }
}

async function readMappedLocalMedia(resourceId: string, variant: string): Promise<LocalMediaRead> {
    const scope = getActiveUserScope();
    const capturedIdentity = identity();
    const directory = await waitForLocalMedia(authorizedLocalMediaDirectory(scope));
    if (!directory) return { status: "needs_permission" };
    const saved = await latestMapping(scope, deviceId(), resourceId);
    if (!saved || !["indexed", "receipted"].includes(saved.stage)) return { status: "unknown" };
    if (!(await waitForLocalMedia(directory.isSameEntry(saved.directory)))) return { status: "index_lost" };
    try {
        const folder = await mediaFolder(directory, scope);
        const entry = saved.item.variants.find((v) => v.variant === variant);
        if (!entry || !saved.paths[variant]) return { status: "unknown" };
        if (saved.paths[variant] !== mediaFilename(saved.item, entry)) return { status: "index_lost" };
        const file = await (await folder.getFileHandle(saved.paths[variant])).getFile();
        await verifyMediaFile(file, entry);
        if (identity() !== capturedIdentity || isAuthIdentityChanging()) return { status: "unknown" };
        return { status: "available", file: new File([file], file.name, { type: variant === "playback" ? "video/mp4" : saved.item.mimeType, lastModified: file.lastModified }) };
    } catch (error) {
        return { status: (error as DOMException).name === "NotAllowedError" ? "needs_permission" : "missing" };
    }
}

export async function localMediaBlob(resourceId: string) {
    const result = await readLocalMedia(resourceId);
    return result.status === "available" ? result.file : null;
}

export async function localMediaURL(resourceId: string, playback = false) {
    let result = playback ? await readLocalMedia(resourceId, "playback") : await readLocalMedia(resourceId);
    if (playback && result.status !== "available") result = await readLocalMedia(resourceId);
    if (result.status !== "available") return "";
    const key = `${identity()}:${resourceId}:${playback}`;
    const previous = urls.get(key);
    if (previous && previous.file.size === result.file.size && previous.file.lastModified === result.file.lastModified) return previous.url;
    if (previous) URL.revokeObjectURL(previous.url);
    const url = URL.createObjectURL(result.file);
    urls.set(key, { file: result.file, url });
    return url;
}

export async function restoreLocalMediaIndex() {
    const scope = getActiveUserScope();
    const capturedIdentity = identity();
    const directory = await authorizedLocalMediaDirectory(scope);
    if (!directory) throw new Error("LOCAL_MEDIA_NEEDS_PERMISSION");
    const folder = await mediaFolder(directory, scope);
    const entries = (folder as FileSystemDirectoryHandle & { values(): AsyncIterableIterator<FileSystemHandle> }).values();
    for await (const entry of entries) {
        if (identity() !== capturedIdentity || isAuthIdentityChanging()) throw new DOMException("Account changed", "AbortError");
        if (entry.kind !== "file" || !entry.name.endsWith(".json")) continue;
        const file = await (entry as FileSystemFileHandle).getFile();
        if (file.size > 64 * 1024) continue;
        try {
            const manifest = JSON.parse(await file.text()) as { format: number; scope: string; item: LocalMediaItem; paths: Record<string, string> };
            if (manifest.format !== 1 || manifest.scope !== scope || !manifest.item.variants.some((variant) => variant.variant === "original")) continue;
            const saved: SavedMedia = { ...manifest, deviceId: deviceId(), directory, stage: "indexed", verifiedAt: new Date().toISOString() };
            await verifySaved(folder, saved);
            if (capturedIdentity !== identity()) throw new DOMException("Account changed", "AbortError");
            await mappings.setItem(mappingKey(scope, saved.deviceId, saved.item.resourceId, saved.item.objectVersion), saved);
        } catch (error) {
            window.dispatchEvent(new CustomEvent("dramacanva-public-local-media-error", { detail: { filename: entry.name, error } }));
        }
    }
}

// Only an explicit model/share/Agent operation invokes this upload path.
export async function ensureLocalMediaServerCopy(resourceId: string) {
    if (typeof window === "undefined" || typeof localStorage === "undefined") return;
    const scope = getActiveUserScope();
    const capturedIdentity = identity();
    if (!(await waitForLocalMedia(authorizedLocalMediaDirectory(scope)).catch(() => null))) return;
    const saved = await latestMapping(scope, deviceId(), resourceId);
    if (!saved) return;
    const resource = await refreshResource(resourceId);
    const state = (resource as typeof resource & { serverCopyState?: string }).serverCopyState;
    if (state !== "file_removed_local_only" && state !== "expired_unclaimed") return;
    const form = new FormData();
    form.append("objectVersion", String((resource as typeof resource & { objectVersion: number }).objectVersion));
    for (const variant of saved.item.variants) {
        const result = await readLocalMedia(resourceId, variant.variant);
        if (result.status !== "available") throw new Error(currentLocaleText("localMedia.missing"));
        form.append(variant.variant, result.file);
    }
    if (capturedIdentity !== identity() || isAuthIdentityChanging()) throw new DOMException("Account changed", "AbortError");
    await request(apiClient.post(`/resources/${encodeURIComponent(resourceId)}/local-restore`, form));
    await refreshResource(resourceId);
}
