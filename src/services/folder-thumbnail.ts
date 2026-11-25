import localforage from "localforage";
import { getActiveUserScope } from "@/lib/user-scope";

const cache = localforage.createInstance({ name: "dramacanva-public", storeName: "folder_thumbnails_v1" });
const apiBase = ("/api").replace(/\/$/, "");
const cacheBudget = 2 * 1024 * 1024;
const memory = new Map<string, Blob>();
const pending = new Map<string, { promise: Promise<Blob>; controller: AbortController; users: number }>();
let workers = 0;
const waiting: (() => void)[] = [];

/** Only known derivative routes may become an img src. Never fall back to an original. */
export function folderThumbnailURL(source: string): string {
    const starterPoster = source.match(/^\/examples\/(spring-record\/(?:film|previs|result-[149])|depth-capture\/(?:source|depth))\.(?:jpg|mp4)$/);
    if (starterPoster) return `/examples/${starterPoster[1]}.jpg`;
    if (/^\/images\/folders\/previews\/(character|lighting|blocking|canyon|mountain|dunes)\.webp$/.test(source)) return source;
    if (/^\/liblib-clone\/(?!.*(?:\.\.|[?#]))[^\\]+$/.test(source)) {
        if (source.startsWith("/liblib-clone/folder-thumbnails/")) return source;
        return source.replace("/liblib-clone/", "/liblib-clone/folder-thumbnails/") + ".webp";
    }
    const resource = source.match(/^(?:resource:|\/api\/resources\/)([^/?#]+)(?:\/file(?:\?[^#]*)?)?$/);
    if (resource) return `${apiBase}/resources/${resource[1]}/file?variant=thumbnail&folder=1`;
    // Absolute resource URLs must belong to this configured backend, never a third-party host.
    if (typeof location !== "undefined" && /^https?:\/\//i.test(source)) {
        try {
            const url = new URL(source, location.origin);
            const base = new URL(apiBase + "/", location.origin);
            if (url.origin === base.origin && url.pathname.startsWith(base.pathname + "resources/")) {
                return folderThumbnailURL("/api/" + url.pathname.slice(base.pathname.length) + url.search);
            }
        } catch { /* Unrecognized sources are resolved as blobs below. */ }
    }
    return "";
}

export function folderThumbnailSize(width: number, height: number) {
    const ratio = Math.min(1, 180 / width, 240 / height);
    return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
}

async function resizeLocal(source: string, signal: AbortSignal) {
    if (workers >= 2) await new Promise<void>(resolve => waiting.push(resolve));
    else workers++;
    try {
        signal.throwIfAborted();
        let blob: Blob | null;
        if (source.startsWith("image:")) {
            const [{ getImageBlob }, { assertLocalStorageKeyScope }] = await Promise.all([
                import("@/services/image-storage"), import("@/services/local-workspace-storage"),
            ]);
            assertLocalStorageKeyScope(source);
            blob = await getImageBlob(source);
        } else {
            const response = await fetch(source, { signal, credentials: "same-origin" });
            if (!response.ok) throw new Error("Folder preview unavailable");
            blob = await response.blob();
        }
        if (!blob) throw new Error("Folder preview unavailable");
        const bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
        try {
            signal.throwIfAborted();
            const size = folderThumbnailSize(bitmap.width, bitmap.height);
            const canvas = document.createElement("canvas");
            canvas.width = size.width;
            canvas.height = size.height;
            canvas.getContext("2d")!.drawImage(bitmap, 0, 0, size.width, size.height);
            const result = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", .72));
            if (!result) throw new Error("Folder preview unavailable");
            return result;
        } finally { bitmap.close(); }
    } finally {
        const next = waiting.shift();
        if (next) next();
        else workers--;
    }
}

/** Derived blobs are scoped, bounded, and persistent; object URLs belong to the mounted image. */
export async function loadFolderThumbnail(source: string, signal: AbortSignal): Promise<Blob> {
    const scope = getActiveUserScope();
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
    const key = `${scope}:${Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("")}`;
    const cached = memory.get(key) || await cache.getItem<Blob>(key).catch(() => null);
    signal.throwIfAborted();
    if (scope !== getActiveUserScope()) throw new DOMException("Account changed", "AbortError");
    if (cached) return cached;
    let entry = pending.get(key);
    if (!entry || entry.controller.signal.aborted) {
        const controller = new AbortController();
        entry = { controller, users: 0, promise: generateFolderThumbnail(source, scope, key, controller.signal) };
        pending.set(key, entry);
        const current = entry;
        void entry.promise.finally(() => { if (pending.get(key) === current) pending.delete(key); }).catch(() => undefined);
    }
    entry.users++;
    let released = false;
    const release = () => {
        if (released) return;
        released = true;
        if (--entry.users === 0) entry.controller.abort();
    };
    signal.addEventListener("abort", release, { once: true });
    try {
        const blob = await entry.promise;
        signal.throwIfAborted();
        if (scope !== getActiveUserScope()) throw new DOMException("Account changed", "AbortError");
        return blob;
    } finally { signal.removeEventListener("abort", release); release(); }
}

async function generateFolderThumbnail(source: string, scope: string, key: string, signal: AbortSignal) {
    let blob: Blob;
    if (/^(blob:|data:image\/|image:)/.test(source)) {
        blob = await resizeLocal(source, signal);
    } else if (/^https?:\/\//i.test(source)) {
        const response = await fetch(`${apiBase}/assets/folder-thumbnail`, {
            method: "POST", credentials: "include", signal,
            headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source }),
        });
        if (!response.ok) throw new Error("Folder preview unavailable");
        blob = await response.blob();
    } else throw new Error("Folder preview source unsupported");
    signal.throwIfAborted();
    if (scope !== getActiveUserScope()) throw new DOMException("Account changed", "AbortError");
    memory.set(key, blob);
    while ([...memory.values()].reduce((sum, item) => sum + item.size, 0) > cacheBudget) memory.delete(memory.keys().next().value!);
    // Cache persistence is disposable: an IndexedDB failure must not hide a decoded preview.
    await cache.setItem(key, blob).catch(() => undefined);
    const keys = await cache.keys().catch(() => []);
    if (keys.length > 180) await Promise.all(keys.filter(item => item !== key).slice(0, keys.length - 180).map(item => cache.removeItem(item).catch(() => undefined)));
    return blob;
}
