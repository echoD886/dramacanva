import localforage from "localforage";
import { nanoid } from "nanoid";
import { currentLocaleText } from "@/i18n/current-locale-text";

import { getActiveUserScope, GUEST_SCOPE } from "@/lib/user-scope";
import { captureVideoPoster, detectVideoAudioTrackFromBlob } from "@/lib/video-poster";
import { resourceFileUrl, resourceIdFromStorageKey, resourceStorageKey, ResourceUploadError, uploadResourceFile } from "@/services/api/resources";
import { getImageBlob, resolveImageUrl, uploadImage, type UploadedImage } from "@/services/image-storage";
import { getCachedResourceBlob, getCachedResourceObjectUrl, primeResourceBlobCache } from "@/services/resource-blob-cache";
import { assertLocalStorageKeyScope, deleteLocalWorkspaceBlob, readLocalWorkspaceBlob, writeLocalWorkspaceBlob } from "@/services/local-workspace-storage";

export type UploadedFile = {
    url: string;
    storageKey: string;
    bytes: number;
    mimeType: string;
    width?: number;
    height?: number;
    durationMs?: number;
    hasAudio?: boolean;
    preview?: UploadedImage;
    /**
     * true 表示直传失败、文件当前只存在于本机 IndexedDB。语义与 UploadedImage 一致：
     * 云端数据同步会用同一幂等键重传，但在那之前 `url` 是页面级 objectURL，刷新即失效。
     */
    pendingRemoteUpload?: boolean;
    /** 直传失败原因，仅在 pendingRemoteUpload 为 true 时有值。 */
    remoteUploadError?: string;
};

const store = localforage.createInstance({ name: "dramacanva-public", storeName: "media_files" });
const objectUrls = new Map<string, string>();

export async function uploadMediaFile(input: Blob, prefix = "file", onProgress?: (uploadedBytes: number, totalBytes: number) => void): Promise<UploadedFile> {
    if (input.type.startsWith("video/") && input.size > 200 * 1024 * 1024) throw videoUploadLimitError(0);
    // 直传和失败后的本地同步必须复用同一上传身份，避免响应丢失后创建第二个对象。
    const storageKey = `${prefix}:${getActiveUserScope()}:${nanoid()}`;
    const blob = input;
    const previewUrl = URL.createObjectURL(blob);
    let retainPreviewUrl = false;

    try {
        let captured: Awaited<ReturnType<typeof captureVideoPoster>> | undefined;
        if (blob.type.startsWith("video/")) {
            try {
                captured = await captureVideoPoster(previewUrl);
            } catch (error) {
                // 封面和轨道信息属于展示增强：失败不阻断原文件上传，但必须留下可诊断信号。
                console.warn("读取视频封面与媒体信息失败，继续上传原文件", { mimeType: blob.type, bytes: blob.size, error });
            }
        }

        if (captured && (captured.durationMs || 0) > 180000) throw videoUploadLimitError((captured.durationMs || 0) / 1000);

        // 浏览器轨道探测对部分 MP4/MOV 会误报；只有未确认存在音轨时才做二次解析，
        // 避免正常上传重复读取整个文件。
        let parsedHasAudio: boolean | undefined;
        if (blob.type.startsWith("video/") && captured?.hasAudio !== true) {
            try {
                parsedHasAudio = await detectVideoAudioTrackFromBlob(blob);
            } catch (error) {
                console.warn("解析视频音轨失败，继续上传但不写入音轨结论", { mimeType: blob.type, bytes: blob.size, error });
            }
        }
        const resolvedHasAudio = parsedHasAudio ?? (captured?.hasAudio === false ? undefined : captured?.hasAudio);

        let meta: { width?: number; height?: number; durationMs?: number; hasAudio?: boolean };
        if (captured) {
            meta = { width: captured.width, height: captured.height, durationMs: captured.durationMs, hasAudio: resolvedHasAudio };
        } else if (blob.type.startsWith("audio/")) {
            try {
                meta = await readAudioMeta(previewUrl);
            } catch (error) {
                console.warn("读取音频时长失败，继续上传原文件", { mimeType: blob.type, bytes: blob.size, error });
                meta = {};
            }
        } else {
            meta = { hasAudio: resolvedHasAudio };
        }

        let poster: UploadedImage | undefined;
        if (captured?.poster) {
            try {
                poster = await uploadImage(captured.poster);
            } catch (error) {
                // 预览图失败不应把已经可用的视频降级成本地文件；视频本体仍按强校验上传。
                console.warn("上传视频预览图失败，继续保存视频本体", { mimeType: blob.type, bytes: blob.size, error });
            }
        }

        // Guests keep media in this browser until they sign in; server-side rendering and tests take the direct-upload path.
        if (typeof window !== "undefined" && getActiveUserScope() === GUEST_SCOPE) {
            await store.setItem(storageKey, blob);
            retainPreviewUrl = true;
            objectUrls.set(storageKey, previewUrl);
            return { url: previewUrl, storageKey, bytes: blob.size, mimeType: blob.type || "application/octet-stream", ...meta, preview: poster };
        }

        let remoteUploadError = "";
        try {
            const kind = blob.type.startsWith("video/") ? "video" : blob.type.startsWith("audio/") ? "audio" : "file";
            const resource = await uploadResourceFile(blob, kind, { ...meta, fileName: input instanceof File ? input.name : undefined, idempotencyKey: storageKey }, onProgress);
            try {
                await primeResourceBlobCache(resourceStorageKey(resource.id), blob);
            } catch (error) {
                // 缓存只影响后续读取性能，服务端资源已经成功落盘，不得把缓存失败误报为上传失败。
                console.warn("预热媒体缓存失败，服务端资源已保存", { resourceId: resource.id, error });
            }
            return {
                url: resource.publicUrl || resourceFileUrl(resource.id),
                storageKey: resourceStorageKey(resource.id),
                bytes: resource.size || blob.size,
                mimeType: resource.mimeType || blob.type || "application/octet-stream",
                width: resource.width || meta.width,
                height: resource.height || meta.height,
                durationMs: resource.durationMs || meta.durationMs,
                hasAudio: meta.hasAudio,
                preview: poster,
            };
        } catch (error) {
            // 与图片上传同一套判定：永久性失败必须当场暴露，不能混进“稍后自动同步”。
            if (error instanceof ResourceUploadError && error.permanent) throw error;
            // Unknown browser duration needs the server's probe. A failed upload
            // cannot authorize a possibly overlong local-only video.
            if (blob.type.startsWith("video/") && !captured?.durationMs) throw error;
            remoteUploadError = error instanceof Error ? error.message : "媒体直传失败";
        }

        // 瞬时失败退回本机：文件仍可用，且云端数据同步会用同一幂等键重传。
        await store.setItem(storageKey, blob);
        retainPreviewUrl = true;
        objectUrls.set(storageKey, previewUrl);
        return { url: previewUrl, storageKey, bytes: blob.size, mimeType: blob.type || "application/octet-stream", ...meta, preview: poster, pendingRemoteUpload: true, remoteUploadError };
    } finally {
        // 只有本地降级结果需要把 objectURL 留给页面；成功上传和所有异常路径都及时释放。
        if (!retainPreviewUrl) URL.revokeObjectURL(previewUrl);
    }
}

function videoUploadLimitError(seconds: number) {
    return new ResourceUploadError(currentLocaleText("generationFailure.video.video_upload_limit"), { permanent: true, reason: "invalid_input", details: { subtype: "video_upload_limit", seconds, limit: 180 } });
}

export async function resolveMediaUrl(storageKey?: string, fallback = "") {
    if (!storageKey) return fallback;
    if (storageKey.startsWith("image:")) return resolveImageUrl(storageKey, fallback);
    const resourceId = resourceIdFromStorageKey(storageKey);
    if (resourceId) {
        const cached = await getCachedResourceObjectUrl(storageKey).catch(() => "");
        return cached || resourceFileUrl(resourceId);
    }
    const cached = objectUrls.get(storageKey);
    if (cached) return cached;
    const blob = (await store.getItem<Blob>(storageKey)) || (await readLocalWorkspaceBlob(storageKey));
    if (!blob) return fallback;
    const url = URL.createObjectURL(blob);
    objectUrls.set(storageKey, url);
    return url;
}

export async function getMediaBlob(storageKey: string) {
    if (storageKey.startsWith("image:")) return getImageBlob(storageKey);
    const resourceId = resourceIdFromStorageKey(storageKey);
    if (resourceId) return getCachedResourceBlob(storageKey);
    return (await store.getItem<Blob>(storageKey)) || readLocalWorkspaceBlob(storageKey);
}

/** Discard an unpublished local recording, never a server resource. */
export async function discardLocalMedia(storageKey: string) {
    if (resourceIdFromStorageKey(storageKey)) return;
    assertLocalStorageKeyScope(storageKey);
    const url = objectUrls.get(storageKey);
    if (url) URL.revokeObjectURL(url);
    objectUrls.delete(storageKey);
    await deleteLocalWorkspaceBlob(storageKey);
    await store.removeItem(storageKey);
}

export async function setMediaBlob(storageKey: string, blob: Blob) {
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

/**
 * 创作对话/首页 Agent 的附件（尤其是文档）只保存在本机，可能尚在输入框或 URL 交接中，
 * 还没有写进任何持久引用；画布/素材的无引用清理不能回收这些前缀。
 */
export const CLEANUP_PROTECTED_MEDIA_PREFIXES: readonly string[] = ["create-upload", "home-agent-document"];

export async function cleanupUnusedMedia(usedData: unknown, scope = getActiveUserScope()) {
    const usedKeys = collectMediaStorageKeys(usedData);
    const currentScope = scope;
    const unused: string[] = [];
    await store.iterate((_value, key) => {
        const parts = key.split(":");
        if (parts.length >= 3 && parts[1] === currentScope && !CLEANUP_PROTECTED_MEDIA_PREFIXES.includes(parts[0]) && !usedKeys.has(key)) unused.push(key);
    });
    await Promise.all(
        unused.map((key) => {
            const url = objectUrls.get(key);
            if (url) URL.revokeObjectURL(url);
            objectUrls.delete(key);
            return store.removeItem(key);
        }),
    );
}

export function collectMediaStorageKeys(value: unknown, keys = new Set<string>()) {
    if (!value || typeof value !== "object") return keys;
    if ("storageKey" in value && typeof value.storageKey === "string" && (value.storageKey.includes(":") || resourceIdFromStorageKey(value.storageKey))) keys.add(value.storageKey);
    Object.values(value).forEach((item) => (Array.isArray(item) ? item.forEach((child) => collectMediaStorageKeys(child, keys)) : collectMediaStorageKeys(item, keys)));
    return keys;
}

function readAudioMeta(url: string) {
    return new Promise<{ durationMs?: number }>((resolve) => {
        const audio = document.createElement("audio");
        const done = () => resolve({ durationMs: Number.isFinite(audio.duration) ? Math.round(audio.duration * 1000) : undefined });
        audio.onloadedmetadata = done;
        audio.onerror = done;
        audio.src = url;
    });
}
