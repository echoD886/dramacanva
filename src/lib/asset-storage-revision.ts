import { parseAssetRecord } from "@/lib/asset-record";
import type { Asset } from "@/stores/use-asset-store";
import { defaultAssetCategoryForKind, normalizeAssetCategory } from "@/lib/asset-category";

import { isRecord } from "@/lib/utils";
import { mergeProtectedFields } from "@/types/asset-archive";
export type AssetStorageDocument = {
    state: { assets: Asset[] };
    version: number;
    storageRevision: number;
    tombstones: { assets: Record<string, number> };
};

export function normalizeAssetRecord(asset: Asset): Asset {
    if (asset.kind === "image" && asset.sourceCode === "manual" && /^(video|audio)\//.test(asset.data?.mimeType || "")) return parseAssetRecord(asset);
    const category = asset.category === "shot" || asset.category == null ? asset.category : normalizeAssetCategory(asset.category, defaultAssetCategoryForKind(asset.kind));
    const normalizedData = normalizeAssetData(asset);
    const arkAssetId = asset.kind === "image" && typeof asset.arkAssetId === "string" && /^asset-[A-Za-z0-9-]+$/.test(asset.arkAssetId.trim()) ? asset.arkAssetId.trim() : undefined;
    const portraitCertified = asset.kind === "image" && asset.portraitCertified === true ? true : undefined;
    if (Array.isArray(asset.tags) && asset.tags.every((tag) => typeof tag === "string") && asset.category === category && normalizedData === asset.data && arkAssetId === asset.arkAssetId && portraitCertified === asset.portraitCertified) return asset;
    return {
        ...asset,
        tags: Array.isArray(asset.tags) ? asset.tags.filter((tag): tag is string => typeof tag === "string") : [],
        ...(Object.hasOwn(asset, "category") ? { category } : {}),
        data: normalizedData,
        arkAssetId,
        portraitCertified,
    } as Asset;
}

function normalizeAssetData(asset: Asset): Asset["data"] {
    const raw = asset.data && typeof asset.data === "object" ? (asset.data as Record<string, unknown>) : {};
    const numberValue = (value: unknown) => (typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0);
    if (asset.kind === "text") return typeof raw.content === "string" ? asset.data : { content: "" };
    if (asset.kind === "image") {
        if (typeof raw.dataUrl === "string" && typeof raw.width === "number" && typeof raw.height === "number") return asset.data;
        return {
            dataUrl: typeof raw.dataUrl === "string" ? raw.dataUrl : asset.coverUrl || "",
            storageKey: typeof raw.storageKey === "string" ? raw.storageKey : undefined,
            width: numberValue(raw.width),
            height: numberValue(raw.height),
            bytes: numberValue(raw.bytes),
            mimeType: typeof raw.mimeType === "string" ? raw.mimeType : "image/*",
        };
    }
    if (asset.kind === "video") {
        if (typeof raw.url === "string" && typeof raw.width === "number" && typeof raw.height === "number") return asset.data;
        return {
            url: typeof raw.url === "string" ? raw.url : asset.coverUrl || "",
            storageKey: typeof raw.storageKey === "string" ? raw.storageKey : undefined,
            width: numberValue(raw.width),
            height: numberValue(raw.height),
            durationMs: numberValue(raw.durationMs),
            hasAudio: raw.hasAudio === true,
            bytes: numberValue(raw.bytes),
            mimeType: typeof raw.mimeType === "string" ? raw.mimeType : "video/*",
        };
    }
    if (asset.kind === "audio") {
        if (typeof raw.url === "string") return asset.data;
        return { url: "", storageKey: typeof raw.storageKey === "string" ? raw.storageKey : undefined, durationMs: numberValue(raw.durationMs), bytes: numberValue(raw.bytes), mimeType: typeof raw.mimeType === "string" ? raw.mimeType : "audio/*" };
    }
    if (asset.kind === "model") {
        if (typeof raw.url === "string" && typeof raw.fileName === "string") return asset.data;
        return {
            url: "",
            storageKey: typeof raw.storageKey === "string" ? raw.storageKey : undefined,
            bytes: numberValue(raw.bytes),
            mimeType: typeof raw.mimeType === "string" ? raw.mimeType : "model/*",
            fileName: typeof raw.fileName === "string" ? raw.fileName : asset.title || "未命名模型",
        };
    }
    return asset.data;
}

function normalizeAssets(assets: Asset[]) {
    return assets.map(normalizeAssetRecord);
}

export function parseAssetStorageDocument(value: string | null, fallback: Asset[] = []): AssetStorageDocument {
    if (!value) {
        return {
            state: { assets: normalizeAssets(fallback) },
            version: 0,
            storageRevision: 0,
            tombstones: { assets: {} },
        };
    }
    const parsed = JSON.parse(value) as {
        state?: { assets?: unknown };
        version?: unknown;
        storageRevision?: unknown;
        tombstones?: { assets?: unknown };
    };
    if (!Array.isArray(parsed.state?.assets)) throw new Error("素材持久状态无效");
    const rawTombstones = parsed.tombstones?.assets;
    const tombstones =
        rawTombstones && typeof rawTombstones === "object" && !Array.isArray(rawTombstones) ? Object.fromEntries(Object.entries(rawTombstones).filter((entry): entry is [string, number] => typeof entry[1] === "number" && Number.isFinite(entry[1]))) : {};
    return {
        state: { assets: normalizeAssets(parsed.state.assets as Asset[]) },
        version: typeof parsed.version === "number" ? parsed.version : 0,
        storageRevision: typeof parsed.storageRevision === "number" && Number.isFinite(parsed.storageRevision) ? parsed.storageRevision : 0,
        tombstones: { assets: tombstones },
    };
}

export function serializeAssetStorageDocument(document: AssetStorageDocument) {
    return JSON.stringify(document);
}

function deepEqual(left: unknown, right: unknown) {
    if (Object.is(left, right)) return true;
    return JSON.stringify(left) === JSON.stringify(right);
}

/** Preserve subscribers' references when a read-only refresh changes no content. */
export function shareUnchangedAssets(current: Asset[], incoming: Asset[]): Asset[] {
    const byId = new Map(current.map(asset => [asset.id, asset]));
    const shared = incoming.map(asset => {
        const previous = byId.get(asset.id);
        return previous && deepEqual(previous, asset) ? previous : asset;
    });
    return shared.length === current.length && shared.every((asset, index) => asset === current[index]) ? current : shared;
}


function mergeValue(base: unknown, local: unknown, durable: unknown): unknown {
    if (deepEqual(local, base)) return durable;
    if (deepEqual(durable, base)) return local;
    if (isRecord(base) && isRecord(local) && isRecord(durable)) return mergeRecord(base, local, durable);
    if (!isRecord(base) && isRecord(local) && isRecord(durable)) return mergeRecord({}, local, durable);
    return durable;
}

function mergeRecord(base: Record<string, unknown>, local: Record<string, unknown>, durable: Record<string, unknown>) {
    const merged: Record<string, unknown> = {};
    for (const key of new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(durable)])) {
        const baseHas = Object.prototype.hasOwnProperty.call(base, key);
        const localHas = Object.prototype.hasOwnProperty.call(local, key);
        const durableHas = Object.prototype.hasOwnProperty.call(durable, key);
        if (!localHas && baseHas) {
            if (durableHas && !deepEqual(durable[key], base[key])) merged[key] = durable[key];
            continue;
        }
        if (!localHas) {
            if (durableHas) merged[key] = durable[key];
            continue;
        }
        if (!baseHas) {
            merged[key] = durableHas ? mergeValue(undefined, local[key], durable[key]) : local[key];
            continue;
        }
        if (!durableHas) {
            if (!deepEqual(local[key], base[key])) merged[key] = local[key];
            continue;
        }
        merged[key] = mergeValue(base[key], local[key], durable[key]);
    }
    return merged;
}

// Ordinary edits never acquire permission to change location or classification.
// Dedicated commands write these groups under the same storage lock instead.
export function mergeAssetContent(base: Asset | undefined, local: Asset, durable: Asset): Asset {
    const merged = mergeRecord((base || {}) as unknown as Record<string, unknown>, local as unknown as Record<string, unknown>, durable as unknown as Record<string, unknown>);
    return mergeProtectedFields(durable as unknown as Record<string, unknown>, merged) as unknown as Asset;
}

export function rebaseAssetSnapshot(input: { document: AssetStorageDocument; baseAssets: Asset[]; localAssets: Asset[]; baseRevision: number }) {
    const nextRevision = input.document.storageRevision + 1;
    const tombstones = { assets: { ...input.document.tombstones.assets } };
    const baseById = new Map(input.baseAssets.map((asset) => [asset.id, asset]));
    const localById = new Map(input.localAssets.map((asset) => [asset.id, asset]));
    const durableById = new Map(input.document.state.assets.map((asset) => [asset.id, asset]));
    const assets = [...input.document.state.assets];
    const positions = new Map(assets.map((asset, index) => [asset.id, index]));

    const remove = (id: string) => {
        const index = positions.get(id);
        if (index === undefined) return;
        assets.splice(index, 1);
        positions.clear();
        assets.forEach((asset, position) => positions.set(asset.id, position));
    };
    const set = (asset: Asset) => {
        const index = positions.get(asset.id);
        if (index === undefined) {
            positions.set(asset.id, assets.length);
            assets.push(asset);
        } else {
            assets[index] = asset;
        }
    };

    for (const id of new Set([...baseById.keys(), ...localById.keys()])) {
        const base = baseById.get(id);
        const local = localById.get(id);
        const durable = durableById.get(id);

        if (base && !local) {
            remove(id);
            tombstones.assets[id] = nextRevision;
            continue;
        }
        if (!local || (base && deepEqual(base, local))) continue;
        if (!durable) {
            if (base || (tombstones.assets[id] ?? 0) > input.baseRevision) continue;
            delete tombstones.assets[id];
            set(local);
            continue;
        }
        delete tombstones.assets[id];
        set(mergeAssetContent(base, local, durable));
    }

    return {
        state: { assets },
        version: input.document.version,
        storageRevision: nextRevision,
        tombstones,
    } satisfies AssetStorageDocument;
}
