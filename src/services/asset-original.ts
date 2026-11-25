import { saveAs } from "file-saver";
import { mediaDownloadFilename } from "@/lib/image-mime";
import { getResourceBlob, resourceIdFromStorageKey } from "@/services/api/resources";
import { getMediaBlob } from "@/services/file-storage";
import { getImageBlob } from "@/services/image-storage";
import type { Asset } from "@/stores/use-asset-store";

export async function readAssetOriginal(asset: Asset) {
    if (!("storageKey" in asset.data) || !asset.data.storageKey) return null;
    const key = asset.data.storageKey;
    if (resourceIdFromStorageKey(key)) return getResourceBlob(key);
    return asset.kind === "image" ? getImageBlob(key) : getMediaBlob(key);
}

export async function downloadAssetOriginal(asset: Asset, fallback?: string) {
    let original = await readAssetOriginal(asset);
    if (!original && asset.kind === "image" && fallback && /^(blob:|data:)/.test(fallback)) {
        const response = await fetch(fallback);
        if (response.ok) original = await response.blob();
    }
    const name = asset.title || "asset";
    if (original) saveAs(original, await mediaDownloadFilename(original, name));
    else if (fallback) saveAs(fallback, name);
    return Boolean(original || fallback);
}
