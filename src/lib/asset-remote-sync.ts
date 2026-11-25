import type { Asset } from "@/stores/use-asset-store";
import { parseAssetRecord } from "@/lib/asset-record";

const PRIMARY_VERSION_ID_MAX_LENGTH = 36;

/** Hidden local originals keep their durable locator for a later permission/retry recovery. */
export function visibleAssetLibraryRecords(assets: Asset[], unavailableImageIds: readonly string[]) {
    if (!unavailableImageIds.length) return assets;
    const unavailable = new Set(unavailableImageIds);
    return assets.filter((asset) => asset.kind !== "image" || !unavailable.has(asset.id) || asset.data.storageKey?.startsWith("resource:") || /^(https?:\/\/|\/api\/resources\/|\/liblib-clone\/)/.test(asset.data.dataUrl));
}

/** Cloud metadata for local media must never replace the device's only locator. */
export function resolveRemoteAssetPage(records: unknown[], localAssets: readonly Asset[], onInvalid?: (error: Error) => void) {
    const local = new Map(localAssets.map((asset) => [asset.id, asset]));
    const assets: Asset[] = [];
    for (const record of records) {
        try {
            const candidate = record as Record<string, unknown> | null;
            const data = candidate?.data as Record<string, unknown> | undefined;
            const localOnly = candidate?.localOnly === true || data?.localOnly === true;
            const existing = typeof candidate?.id === "string" ? local.get(candidate.id) : undefined;
            const remoteLocator = [data?.storageKey, data?.dataUrl, data?.url].some((value) => typeof value === "string" && /^(resource:|https?:\/\/|\/api\/resources\/|\/liblib-clone\/)/.test(value));
            if (localOnly && !remoteLocator) {
                if (!existing || existing.kind !== candidate?.kind) {
                    continue;
                }
                try {
                    parseAssetRecord(existing);
                } catch {
                    continue;
                }
                assets.push(parseAssetRecord({ ...candidate, data: existing.data, coverUrl: existing.coverUrl }));
            } else assets.push(parseAssetRecord(record));
        } catch (error) {
            if (!onInvalid) throw error;
            onInvalid(error instanceof Error ? error : new Error(String(error)));
        }
    }
    return { assets };
}

export function assetForRemoteSync(asset: Asset): Asset {
    const primaryVersionId = asset.primaryVersionId?.trim();
    if (!primaryVersionId || [...primaryVersionId].length <= PRIMARY_VERSION_ID_MAX_LENGTH) return asset;

    const { primaryVersionId: _invalidPrimaryVersionId, ...remoteAsset } = asset;
    return remoteAsset as Asset;
}
