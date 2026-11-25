import type { NewAsset } from "@/stores/use-asset-store";
import { uploadImage } from "@/services/image-storage";
import { uploadMediaFile } from "@/services/file-storage";

export async function uploadLibraryAsset(file: File): Promise<NewAsset> {
    const base = { title: file.name, tags: [] };
    if (file.type.startsWith("video/") || file.type.startsWith("audio/")) {
        const kind = file.type.startsWith("video/") ? "video" : "audio";
        const { url, storageKey, durationMs, bytes, mimeType, width, height, hasAudio, preview } = await uploadMediaFile(file, kind);
        const data = { url, storageKey, durationMs, bytes, mimeType };
        if (kind === "audio") return { ...base, kind, coverUrl: "", data };
        return { ...base, kind, coverUrl: preview?.url || "", metadata: { posterStorageKey: preview?.storageKey }, data: { ...data, width: width || 0, height: height || 0, hasAudio } };
    }
    const { url, storageKey, mimeType, width, height, bytes } = await uploadImage(file);
    return { ...base, kind: "image", coverUrl: url, data: { dataUrl: url, storageKey, mimeType, width, height, bytes } };
}
