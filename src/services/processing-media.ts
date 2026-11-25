import { getProcessingReference, resourceFileUrl, resourceIdFromStorageKey, resourceIdFromUrl, resourceStorageKey, type RemoteResource } from "@/services/api/resources";
import type { UploadedImage } from "@/services/image-storage";

export function processedImageResource(resource: RemoteResource): UploadedImage {
    return { storageKey: resourceStorageKey(resource.id), url: resourceFileUrl(resource.id), width: resource.width || 1, height: resource.height || 1, bytes: resource.size, mimeType: resource.mimeType };
}

export function processingSourceIds(...keys: Array<string | undefined>) {
    return [
        ...new Set(
            keys.flatMap((key) => {
                const id = resourceIdFromStorageKey(key || "") || resourceIdFromUrl(key);
                return id ? [id] : [];
            }),
        ),
    ];
}

/** Ephemeral master input for platform processing; never use a branded fallback. */
export async function processingImage(input: { dataUrl: string; storageKey?: string }) {
    const resourceId = resourceIdFromStorageKey(input.storageKey) || resourceIdFromUrl(input.dataUrl);
    const key = resourceId ? resourceStorageKey(resourceId) : input.storageKey;
    const blob = key ? await getProcessingReference(key, "image-compose") : null;
    if (!blob) return input;
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
    return { ...input, storageKey: undefined, dataUrl };
}
