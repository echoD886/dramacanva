import localforage from "localforage";
import { currentLocaleText } from "@/i18n/current-locale-text";
import { clearLocalMediaURLs, localMediaBlob, localMediaURL } from "@/services/local-media-save";

import { getActiveUserScope } from "@/lib/user-scope";
import { getResource, refreshResource, getResourceBlob, resourceIdFromStorageKey, type ResourceImageVariant } from "@/services/api/resources";

type ResourceCacheMeta = {
    controlled?: boolean;
    key: string;
    userScope: string;
    resourceId: string;
    version: string;
    size: number;
    mimeType: string;
    lastAccessedAt: number;
};

const blobStore = localforage.createInstance({ name: "dramacanva-public", storeName: "resource_blobs" });
const metaStore = localforage.createInstance({ name: "dramacanva-public", storeName: "resource_blob_meta" });
const objectUrls = new Map<string, string>();
const synchronousUploadTargets = new Map<string, string>();
const sessionBlobs = new Map<string, Blob>();
const inFlight = new Map<string, Promise<string>>();
const scheduled = new Set<string>();
const downloadQueue: Array<() => void> = [];
let activeDownloads = 0;
let persistQueue: Promise<void> = Promise.resolve();
const MAX_CACHE_BYTES = 2 * 1024 * 1024 * 1024;
const FALLBACK_CACHE_BYTES = 512 * 1024 * 1024;
const MIN_CACHE_BYTES = 64 * 1024 * 1024;
const MAX_CACHE_ENTRIES = 500;
const TOUCH_INTERVAL_MS = 10 * 60 * 1000;
const MAX_CONCURRENT_DOWNLOADS = 4;
let cacheGeneration = 0;
let deliveryInvalidation: Promise<void> = Promise.resolve();

export function invalidateResourceDeliveryCache() {
    clearResourceBlobCache();
    deliveryInvalidation = deliveryInvalidation.then(async () => {
        await persistQueue;
        const entries: ResourceCacheMeta[] = [];
        await metaStore.iterate<ResourceCacheMeta, void>((meta) => {
            if (meta?.controlled) entries.push(meta);
        });
        for (const meta of entries) await removeCacheEntry(meta);
    });
    return deliveryInvalidation;
}

/** Release session-only byte resources during account/logout transitions. */
export function clearResourceBlobCache() {
    clearLocalMediaURLs();
    cacheGeneration += 1;
    objectUrls.forEach((url) => URL.revokeObjectURL(url));
    objectUrls.clear();
    synchronousUploadTargets.clear();
    sessionBlobs.clear();
    inFlight.clear();
}

/** Synchronous memory hit only; never performs I/O or crosses the active account boundary. */
export function peekCachedResourceObjectUrl(storageKey: string) {
    const resourceId = resourceIdFromStorageKey(storageKey);
    const scope = getActiveUserScope();
    if (!resourceId || scope === "guest") return "";
    // Only a metadata-confirmed upload can use a synchronous byte cache.
    const target = synchronousUploadTargets.get(`${scope}:${resourceId}`);
    return target ? objectUrls.get(target) || "" : "";
}

export async function getCachedResourceObjectUrl(storageKey: string) {
    const target = await cacheTarget(storageKey);
    if (!target) return "";
    const resourceId = resourceIdFromStorageKey(storageKey);
    if (resourceId && !target.controlled) {
        const local = await localMediaURL(resourceId);
        if (local) return local;
    }
    return readCachedObjectUrl(target);
}

export async function cacheResourceObjectUrl(storageKey: string, variant: ResourceImageVariant = "original") {
    const target = await cacheTarget(storageKey, variant);
    if (!target) return "";
    return populateResourceObjectUrl(storageKey, target, variant);
}

async function populateResourceObjectUrl(storageKey: string, target: ResourceCacheMeta, variant: ResourceImageVariant = "original", skipLocal = false) {
    const resourceId = resourceIdFromStorageKey(storageKey);
    if (!skipLocal && resourceId && variant === "original" && !target.controlled) {
        const local = await localMediaURL(resourceId);
        if (local) return local;
    }
    const cached = await readCachedObjectUrl(target);
    if (cached) return cached;
    const pending = inFlight.get(target.key);
    if (pending) return pending;

    const generation = cacheGeneration;
    const task: Promise<string> = withDownloadSlot(() => downloadAndCacheResource(storageKey, target, generation)).finally(() => {
        if (inFlight.get(target.key) === task) inFlight.delete(target.key);
    });
    inFlight.set(target.key, task);
    return task;
}

/** Recover a mounted preview whose cached object URL or remote signature failed. */
export async function refreshResourceObjectUrl(storageKey: string) {
    const id = resourceIdFromStorageKey(storageKey);
    if (!id) return "";
    const prefix = `${getActiveUserScope()}:${id}:`;
    await persistQueue;
    const target = await cacheTarget(storageKey);
    for (const key of new Set([...objectUrls.keys(), ...sessionBlobs.keys(), ...(target ? [target.key] : [])])) {
        if (key.startsWith(prefix)) await removeCacheEntry({ key } as ResourceCacheMeta);
    }
    return target ? populateResourceObjectUrl(storageKey, target, "original", true) : "";
}

/**
 * 播放器先使用支持 Range 的资源 URL 起播；确认用户实际播放后，再延迟下载完整 Blob。
 * 这样不会让 IndexedDB 缓存阻塞首帧，同时后续打开可直接复用本地 Object URL。
 */
export function scheduleResourceBlobCache(storageKey: string, delayMs = 4_000) {
    if (!resourceIdFromStorageKey(storageKey) || scheduled.has(storageKey)) return;
    scheduled.add(storageKey);
    const run = () => {
        void cacheResourceObjectUrl(storageKey)
            .catch(() => "")
            .finally(() => scheduled.delete(storageKey));
    };
    if (typeof window === "undefined") {
        run();
        return;
    }
    window.setTimeout(run, Math.max(0, delayMs));
}

function withDownloadSlot<T>(task: () => Promise<T>) {
    return new Promise<T>((resolve, reject) => {
        downloadQueue.push(() => {
            activeDownloads += 1;
            task()
                .then(resolve, reject)
                .finally(() => {
                    activeDownloads -= 1;
                    runDownloadQueue();
                });
        });
        runDownloadQueue();
    });
}

function runDownloadQueue() {
    while (activeDownloads < MAX_CONCURRENT_DOWNLOADS && downloadQueue.length) downloadQueue.shift()?.();
}

export async function primeResourceBlobCache(storageKey: string, blob: Blob) {
    const target = await cacheTarget(storageKey);
    if (!target) return "";
    // A caller-provided Blob may be an old master or local edit. Controlled
    // delivery bytes enter this cache only through the authenticated endpoint.
    if (target.controlled) return "";
    sessionBlobs.set(target.key, blob);
    const url = objectUrl(target.key, blob);
    if (blob.size <= MAX_CACHE_BYTES) void enqueuePersist(target, blob);
    return url;
}

export async function getCachedResourceBlob(storageKey: string) {
    const target = await cacheTarget(storageKey);
    if (!target) return null;
    const resourceId = resourceIdFromStorageKey(storageKey);
    if (resourceId && !target.controlled) {
        const local = await localMediaBlob(resourceId);
        if (local) return local;
    }
    const cached = await blobStore.getItem<Blob>(target.key);
    if (cached) {
        void touchCacheMeta(target).catch(() => undefined);
        return cached;
    }
    const sessionBlob = sessionBlobs.get(target.key);
    if (sessionBlob) return sessionBlob;
    const pending = inFlight.get(target.key);
    if (pending) {
        await pending;
        return sessionBlobs.get(target.key) || blobStore.getItem<Blob>(target.key);
    }
    await cacheResourceObjectUrl(storageKey);
    return sessionBlobs.get(target.key) || blobStore.getItem<Blob>(target.key);
}

async function downloadAndCacheResource(storageKey: string, target: ResourceCacheMeta, generation: number) {
    const blob = await downloadResourceBlob(storageKey, target, generation);
    if (!blob || generation !== cacheGeneration) return "";
    return objectUrl(target.key, blob);
}

async function downloadResourceBlob(storageKey: string, target: ResourceCacheMeta, generation = cacheGeneration) {
    const blob = await getResourceBlob(storageKey, target.version.startsWith("thumbnail-v2:") ? "thumbnail" : "original");
    // A download that finished after an account switch must not repopulate any cache.
    if (!blob || generation !== cacheGeneration) return null;
    sessionBlobs.set(target.key, blob);
    if (blob.size <= MAX_CACHE_BYTES) await enqueuePersist(target, blob);
    return blob;
}

function enqueuePersist(target: ResourceCacheMeta, blob: Blob) {
    const task = persistQueue.then(() => persistBlob(target, blob));
    persistQueue = task.catch(() => undefined);
    return task.catch(() => undefined);
}

async function persistBlob(target: ResourceCacheMeta, blob: Blob) {
    // 不尝试写入超过当前缓存预算的单个媒体，避免触发浏览器配额异常和无效的全量淘汰。
    if (blob.size > (await cacheBudget())) return;
    await evictFor(blob.size, target.key);
    try {
        await blobStore.setItem(target.key, blob);
        await metaStore.setItem(target.key, { ...target, size: blob.size, mimeType: blob.type || target.mimeType, lastAccessedAt: Date.now() });
    } catch (error) {
        await evictFor(blob.size, target.key, true);
        try {
            await blobStore.setItem(target.key, blob);
            await metaStore.setItem(target.key, { ...target, size: blob.size, mimeType: blob.type || target.mimeType, lastAccessedAt: Date.now() });
        } catch {
            await blobStore.removeItem(target.key);
            await metaStore.removeItem(target.key);
            throw error;
        }
    }
}

async function readCachedObjectUrl(target: ResourceCacheMeta) {
    const existing = objectUrls.get(target.key);
    if (existing) {
        void touchCacheMeta(target).catch(() => undefined);
        return existing;
    }
    const blob = await blobStore.getItem<Blob>(target.key);
    if (!blob) return "";
    void touchCacheMeta(target).catch(() => undefined);
    return objectUrl(target.key, blob);
}

async function cacheTarget(storageKey: string, variant: ResourceImageVariant = "original"): Promise<ResourceCacheMeta | null> {
    await deliveryInvalidation;
    const resourceId = resourceIdFromStorageKey(storageKey);
    if (!resourceId) return null;
    const userScope = getActiveUserScope();
    if (userScope === "guest") throw new Error("游客不能读取远程媒体缓存");
    let resource = await getResource(resourceId);
    if (resource.deliveryVersion) resource = await refreshResource(resourceId);
    const prefix = `${userScope}:${resourceId}:`;
    const delivery = resource.deliveryVersion || "upload";
    const obsolete = new Set<string>();
    for (const key of [...objectUrls.keys(), ...sessionBlobs.keys()]) if (key.startsWith(prefix) && !key.endsWith(`:${delivery}`)) obsolete.add(key);
    if (resource.deliveryVersion)
        await metaStore.iterate<ResourceCacheMeta, void>((meta) => {
            if (meta?.key?.startsWith(prefix) && !meta.key.endsWith(`:${delivery}`)) obsolete.add(meta.key);
        });
    for (const key of obsolete) await removeCacheEntry({ key } as ResourceCacheMeta);
    if (resource.watermarked && resource.watermarkState !== "ready") throw new Error(currentLocaleText("watermark.processing"));
    const version = `${variant === "thumbnail" ? "thumbnail-v2" : "file-v2"}:${resource.deliveryVersion || "upload"}`;
    if (variant === "original") {
        const identity = `${userScope}:${resourceId}`;
        if (resource.deliveryVersion) synchronousUploadTargets.delete(identity);
        else synchronousUploadTargets.set(identity, `${identity}:${version}`);
    }
    return {
        controlled: Boolean(resource.deliveryVersion),
        key: `${userScope}:${resourceId}:${version}`,
        userScope,
        resourceId,
        version,
        size: 0,
        mimeType: "application/octet-stream",
        lastAccessedAt: Date.now(),
    };
}

async function touchCacheMeta(target: ResourceCacheMeta) {
    const current = await metaStore.getItem<ResourceCacheMeta>(target.key);
    if (!current || Date.now() - current.lastAccessedAt < TOUCH_INTERVAL_MS) return;
    await metaStore.setItem(target.key, { ...current, lastAccessedAt: Date.now() });
}

async function evictFor(incomingBytes: number, protectedKey: string, aggressive = false) {
    const metas: ResourceCacheMeta[] = [];
    await metaStore.iterate<ResourceCacheMeta, void>((value) => {
        if (value?.key) metas.push(value);
    });
    const budget = aggressive ? Math.max(MIN_CACHE_BYTES, (await cacheBudget()) / 2) : await cacheBudget();
    let total = metas.reduce((sum, item) => sum + Math.max(0, item.size || 0), 0);
    let count = metas.length;
    // 当前页面正在使用的 Blob URL 不能在 LRU 清理时撤销，否则已渲染节点会立即变成失效资源。
    const candidates = metas.filter((item) => item.key !== protectedKey && !objectUrls.has(item.key) && !sessionBlobs.has(item.key)).sort((a, b) => a.lastAccessedAt - b.lastAccessedAt);
    for (const candidate of candidates) {
        if (total + incomingBytes <= budget && count < MAX_CACHE_ENTRIES) break;
        await removeCacheEntry(candidate);
        total -= Math.max(0, candidate.size || 0);
        count -= 1;
    }
}

async function removeCacheEntry(meta: ResourceCacheMeta) {
    const url = objectUrls.get(meta.key);
    if (url) URL.revokeObjectURL(url);
    objectUrls.delete(meta.key);
    sessionBlobs.delete(meta.key);
    await Promise.all([blobStore.removeItem(meta.key), metaStore.removeItem(meta.key)]);
}

async function cacheBudget() {
    if (!navigator.storage?.estimate) return FALLBACK_CACHE_BYTES;
    const estimate = await navigator.storage.estimate().catch(() => null);
    if (!estimate?.quota) return FALLBACK_CACHE_BYTES;
    return Math.min(MAX_CACHE_BYTES, Math.max(MIN_CACHE_BYTES, Math.floor(estimate.quota * 0.2)));
}

function objectUrl(key: string, blob: Blob) {
    const existing = objectUrls.get(key);
    if (existing) return existing;
    const url = URL.createObjectURL(blob);
    objectUrls.set(key, url);
    return url;
}

if (typeof window !== "undefined") {
    // Spending or refunding credits never changes watermark eligibility; only
    // recharges, plan changes and team moves do. Clearing on every task would
    // revoke object URLs that mounted reference thumbnails are still showing.
    window.addEventListener("wallet:updated", (event) => {
        if (isWalletUsageEvent(event)) return;
        void invalidateResourceDeliveryCache();
    });
    window.addEventListener("subscription:updated", () => {
        void invalidateResourceDeliveryCache();
    });
    window.addEventListener("pagehide", (event) => {
        if (event.persisted) return;
        objectUrls.forEach((url) => URL.revokeObjectURL(url));
        objectUrls.clear();
        sessionBlobs.clear();
    });
}

export function isWalletUsageEvent(event: Event) {
    return (event as CustomEvent<{ reason?: string } | undefined>).detail?.reason === "usage";
}
