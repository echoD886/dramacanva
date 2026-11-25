import localforage from "localforage";

import { nanoid } from "nanoid";
import { currentLocaleText } from "@/i18n/current-locale-text";
import { readImageMeta } from "@/lib/image-utils";
import { getActiveUserScope, GUEST_SCOPE } from "@/lib/user-scope";
import { importResourceFromUrl, isResourceUrl, resourceFileUrl, resourceIdFromStorageKey, resourceStorageKey, ResourceUploadError, uploadResourceFile } from "@/services/api/resources";
import { cacheResourceObjectUrl, getCachedResourceBlob, getCachedResourceObjectUrl, primeResourceBlobCache } from "@/services/resource-blob-cache";
import { assertLocalStorageKeyScope, deleteLocalWorkspaceBlob, readLocalWorkspaceBlob, writeLocalWorkspaceBlob } from "@/services/local-workspace-storage";

export type UploadedImage = {
    url: string;
    storageKey: string;
    width: number;
    height: number;
    bytes: number;
    mimeType: string;
    /**
     * true 表示直传失败、文件当前只存在于本机 IndexedDB。
     * 云端数据同步会用同一幂等键重传，但在那之前它不是一份已持久化的服务端资源：
     * `url` 是页面级 objectURL，刷新后从本地原图恢复。UI 可以报告导入成功，不能声称云端已确认。
     */
    pendingRemoteUpload?: boolean;
    /** 直传失败原因，仅作内部诊断；后台静默重试，不向用户显示。 */
    remoteUploadError?: string;
};

const store = localforage.createInstance({ name: "dramacanva-public", storeName: "image_files" });
const objectUrls = new Map<string, string>();

export async function uploadImage(input: string | Blob, onProgress?: (uploadedBytes: number, totalBytes: number) => void, processingSources?: string[], knownSize?: { width: number; height: number }): Promise<UploadedImage> {
    // 同一个逻辑上传在直传失败后会退回 IndexedDB，并由云端数据同步再次提交。
    // 提前生成本地 key，确保两条路径向后端发送相同的幂等标识。
    const storageKey = `image:${getActiveUserScope()}:${nanoid()}`;
    if (!processingSources?.length && typeof input === "string" && shouldImportRemoteImage(input)) {
        try {
            const resource = await importResourceFromUrl(input, "image", { idempotencyKey: storageKey });
            return {
                url: resource.publicUrl || resourceFileUrl(resource.id),
                storageKey: resourceStorageKey(resource.id),
                width: resource.width || 1024,
                height: resource.height || 1024,
                bytes: resource.size || 0,
                mimeType: resource.mimeType || "image/png",
            };
        } catch {
            // Keep the browser-side path as a fallback for CORS-enabled HTTPS images.
        }
    }
    const blob = typeof input === "string" ? await fetchImageBlob(input) : input;
    const previewUrl = URL.createObjectURL(blob);
    // 只有本地降级结果把 objectURL 交给页面持有；成功直传和所有异常路径都在 finally 释放。
    let retainPreviewUrl = false;
    try {
        const meta = knownSize?.width && knownSize.height ? { ...knownSize, mimeType: blob.type } : await readImageMeta(previewUrl);
        // Guests keep media in this browser until they sign in; server-side rendering and tests take the direct-upload path.
        if (typeof window !== "undefined" && getActiveUserScope() === GUEST_SCOPE) {
            await store.setItem(storageKey, blob);
            objectUrls.set(storageKey, previewUrl);
            retainPreviewUrl = true;
            return { url: previewUrl, storageKey, width: meta.width, height: meta.height, bytes: blob.size, mimeType: blob.type || meta.mimeType };
        }
        let remoteUploadError = "";
        try {
            const resource = await uploadResourceFile(blob, "image", { processingSources, width: meta.width, height: meta.height, fileName: input instanceof File ? input.name : undefined, idempotencyKey: storageKey }, onProgress);
            await primeResourceBlobCache(resourceStorageKey(resource.id), blob).catch(() => "");
            return {
                url: resource.publicUrl || resourceFileUrl(resource.id),
                storageKey: resourceStorageKey(resource.id),
                width: resource.width || meta.width,
                height: resource.height || meta.height,
                bytes: resource.size || blob.size,
                mimeType: resource.mimeType || blob.type || meta.mimeType,
            };
        } catch (error) {
            if (processingSources?.length) throw error;
            // 鉴权失效、越权、体积超限这类失败重传也是同样结果，不能退化成"稍后自动同步"。
            if (error instanceof ResourceUploadError && error.permanent) throw error;
            remoteUploadError = error instanceof Error ? error.message : "图片直传失败";
        }
        // 瞬时失败退回本机：文件仍可用，且云端数据同步会用同一幂等键重传。
        await store.setItem(storageKey, blob);
        objectUrls.set(storageKey, previewUrl);
        retainPreviewUrl = true;
        return { url: previewUrl, storageKey, width: meta.width, height: meta.height, bytes: blob.size, mimeType: blob.type || meta.mimeType, pendingRemoteUpload: true, remoteUploadError };
    } finally {
        if (!retainPreviewUrl) URL.revokeObjectURL(previewUrl);
    }
}

async function fetchImageBlob(url: string) {
    const response = await fetch(url);
    // HTTP 错误页不能当作图片 Blob 存进本地或上传。
    if (!response.ok) throw new Error(currentLocaleText("canvasExtra.canvas.imageReadFailed", { status: response.status }));
    return response.blob();
}

function shouldImportRemoteImage(input: string) {
    return /^https?:\/\//i.test(input) && !isResourceUrl(input);
}

export async function resolveImageUrl(storageKey?: string, fallback = "", options?: { cacheMiss?: boolean }) {
    if (!storageKey) return fallback;
    const resourceId = resourceIdFromStorageKey(storageKey);
    if (resourceId) {
        const cached = await getCachedResourceObjectUrl(storageKey).catch(() => "");
        if (cached) return cached;
        if (options?.cacheMiss) {
            const populated = await cacheResourceObjectUrl(storageKey).catch(() => "");
            if (populated) return populated;
        }
        return resourceFileUrl(resourceId);
    }
    const cached = objectUrls.get(storageKey);
    if (cached) return cached;
    const blob = (await store.getItem<Blob>(storageKey)) || (await readLocalWorkspaceBlob(storageKey));
    if (!blob) return fallback;
    const url = URL.createObjectURL(blob);
    objectUrls.set(storageKey, url);
    return url;
}

export async function getImageBlob(storageKey: string) {
    const resourceId = resourceIdFromStorageKey(storageKey);
    if (resourceId) return getCachedResourceBlob(storageKey);
    return (await store.getItem<Blob>(storageKey)) || readLocalWorkspaceBlob(storageKey);
}

export async function setImageBlob(storageKey: string, blob: Blob) {
    if (resourceIdFromStorageKey(storageKey)) return primeResourceBlobCache(storageKey, blob);
    // 用户选择了本地素材文件夹时，本地媒体写进该文件夹（读取端已会回落到文件夹）；
    // 未选择、未授权或浏览器不支持时照常存浏览器 IndexedDB。此前一次上游合并误删了这一步，
    // 导致“本地文件夹”只在界面上存在，素材从未真正写入。
    // 其他账号的 key 不能退回写进共享的浏览器存储：那会覆盖或混入另一个账号的本地媒体。
    assertLocalStorageKeyScope(storageKey);
    const persistedToDirectory = await writeLocalWorkspaceBlob(storageKey, blob).catch(() => false);
    if (persistedToDirectory) await store.removeItem(storageKey);
    else {
        await deleteLocalWorkspaceBlob(storageKey).catch(() => undefined);
        await store.setItem(storageKey, blob);
    }
    const url = URL.createObjectURL(blob);
    const previousUrl = objectUrls.get(storageKey);
    if (previousUrl) URL.revokeObjectURL(previousUrl);
    objectUrls.set(storageKey, url);
    return url;
}

export async function imageToDataUrl(image: { url?: string; dataUrl?: string; storageKey?: string; name?: string; type?: string; mimeType?: string }) {
    if (image.storageKey) {
        const blob = await getImageBlob(image.storageKey);
        if (blob) return blobToDataUrl(await normalizeImageBlob(blob, image.name || image.url));
    }
    const url = image.dataUrl || (await resolveImageUrl(image.storageKey, image.url || ""));
    if (!url) return url;
    if (url.startsWith("data:image/")) return url;
    if (url.startsWith("data:")) return blobToDataUrl(await normalizeImageBlob(await (await fetch(url)).blob(), image.name));
    const blob = await (await fetch(url, { credentials: isResourceUrl(url) ? "include" : "same-origin" })).blob();
    return blobToDataUrl(await normalizeImageBlob(blob, image.name || url));
}

export async function deleteStoredImages(keys: Iterable<string>) {
    await Promise.all(
        Array.from(new Set(keys)).map(async (key) => {
            if (resourceIdFromStorageKey(key)) return;
            const url = objectUrls.get(key);
            if (url) URL.revokeObjectURL(url);
            objectUrls.delete(key);
            await deleteLocalWorkspaceBlob(key);
            await store.removeItem(key);
        }),
    );
}

export async function cleanupUnusedImages(usedData: unknown, scope = getActiveUserScope()) {
    const usedKeys = collectImageStorageKeys(usedData);
    const currentPrefixes = [`image:${scope}:`, `generation-image:${scope}:`];
    const unused: string[] = [];
    await store.iterate((_value, key) => {
        if (currentPrefixes.some((prefix) => key.startsWith(prefix)) && !usedKeys.has(key)) unused.push(key);
    });
    await deleteStoredImages(unused);
}

export function collectImageStorageKeys(value: unknown, keys = new Set<string>()) {
    if (!value || typeof value !== "object") return keys;
    if ("storageKey" in value && typeof value.storageKey === "string" && (value.storageKey.startsWith("image:") || value.storageKey.startsWith("generation-image:") || resourceIdFromStorageKey(value.storageKey))) keys.add(value.storageKey);
    Object.values(value).forEach((item) => (Array.isArray(item) ? item.forEach((child) => collectImageStorageKeys(child, keys)) : collectImageStorageKeys(item, keys)));
    return keys;
}

function blobToDataUrl(blob: Blob) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error(currentLocaleText("canvasExtra.localAgent.imageReadFailed")));
        reader.readAsDataURL(blob);
    });
}

async function normalizeImageBlob(blob: Blob, sourceName = "") {
    if (blob.type.startsWith("image/")) return blob;
    const bytes = new Uint8Array(await blob.slice(0, 32).arrayBuffer());
    const mimeType = detectImageMimeType(bytes) || imageMimeTypeFromName(sourceName);
    if (!mimeType) throw new Error(currentLocaleText("generationFailure.reference"));
    return blob.slice(0, blob.size, mimeType);
}

function detectImageMimeType(bytes: Uint8Array) {
    if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
    if (bytes.length >= 6 && String.fromCharCode(...bytes.slice(0, 6)).startsWith("GIF8")) return "image/gif";
    if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
    if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) return "image/bmp";
    return "";
}

function imageMimeTypeFromName(value: string) {
    const path = value.toLowerCase().split(/[?#]/)[0];
    if (path.endsWith(".png")) return "image/png";
    if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
    if (path.endsWith(".webp")) return "image/webp";
    if (path.endsWith(".gif")) return "image/gif";
    if (path.endsWith(".bmp")) return "image/bmp";
    return "";
}
