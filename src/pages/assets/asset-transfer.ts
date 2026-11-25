import { saveAs } from "file-saver";

import { createZip, readZip } from "@/lib/zip";
import { setMediaBlob } from "@/services/file-storage";
import { setImageBlob } from "@/services/image-storage";
import { readAssetOriginal } from "@/services/asset-original";
import { sniffImageMime } from "@/lib/image-mime";
import { rescopeLocalStorageKey } from "@/services/local-workspace-storage";
import type { Asset } from "@/stores/use-asset-store";

type AssetExportFile = {
    app: "infinite-canvas";
    version: 1;
    exportedAt: string;
    assets: Asset[];
    files: AssetExportItem[];
};

type AssetExportItem = {
    storageKey: string;
    path: string;
    mimeType: string;
    bytes: number;
};

export async function exportAssets(assets: Asset[]) {
    const files: AssetExportItem[] = [];
    const zipFiles: { name: string; data: BlobPart }[] = [];

    await Promise.all(
        assets.map(async (asset) => {
            if (asset.kind !== "image" && asset.kind !== "video" && asset.kind !== "audio" && asset.kind !== "model") return;
            const storageKey = asset.data.storageKey;
            if (!storageKey) return;
            const blob = await readAssetOriginal(asset);
            if (!blob) return;
            const detected = asset.kind === "image" ? sniffImageMime(new Uint8Array(await blob.slice(0, 12).arrayBuffer())) : undefined;
            const mimeType = detected || blob.type || asset.data.mimeType;
            const path = `files/${safeFileName(storageKey)}.${fileExtension(mimeType, asset.kind)}`;
            files.push({ storageKey, path, mimeType, bytes: blob.size });
            zipFiles.push({ name: path, data: blob });
        }),
    );

    const data: AssetExportFile = { app: "infinite-canvas", version: 1, exportedAt: new Date().toISOString(), assets, files };
    const zip = await createZip([{ name: "assets.json", data: JSON.stringify(data, null, 2) }, ...zipFiles]);
    saveAs(zip, "我的素材.zip");
}

export async function readAssetPackage(file: File) {
    const zip = await readZip(file);
    const assetFile = zip.get("assets.json");
    if (!assetFile) throw new Error("missing assets.json");
    const data = JSON.parse(await assetFile.text()) as AssetExportFile;
    await Promise.all(
        data.files.map(async (item) => {
            const blob = zip.get(item.path);
            if (!blob) return;
            const typedBlob = blob.type ? blob : blob.slice(0, blob.size, item.mimeType);
            const storageKey = rescopeLocalStorageKey(item.storageKey);
            await (storageKey.startsWith("image:") ? setImageBlob(storageKey, typedBlob) : setMediaBlob(storageKey, typedBlob));
        }),
    );
    // 素材包可能来自其他账号：本地媒体 key 一并换成当前账号的 key。
    return data.assets.map((asset) => {
        const storageKey = "data" in asset && asset.data && "storageKey" in asset.data ? asset.data.storageKey : undefined;
        if (!storageKey || rescopeLocalStorageKey(storageKey) === storageKey) return asset;
        return { ...asset, data: { ...asset.data, storageKey: rescopeLocalStorageKey(storageKey) } } as Asset;
    });
}

function safeFileName(value: string) {
    return value.replace(/[\\/:*?"<>|]/g, "_");
}

function fileExtension(mimeType: string, kind: Asset["kind"]) {
    if (mimeType.includes("png")) return "png";
    if (mimeType.includes("jpeg")) return "jpg";
    if (mimeType.includes("webp")) return "webp";
    if (mimeType.includes("gif")) return "gif";
    if (mimeType.includes("mp4")) return "mp4";
    if (mimeType.includes("webm")) return "webm";
    if (mimeType.includes("mpeg")) return "mp3";
    if (mimeType.includes("wav")) return "wav";
    if (mimeType.includes("gltf-binary")) return "glb";
    if (mimeType.includes("gltf+json") || mimeType.includes("json")) return "gltf";
    return kind === "image" ? "png" : "bin";
}
