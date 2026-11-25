import { create } from "zustand";
import { persist, type PersistStorage, type StorageValue } from "zustand/middleware";

import { nanoid } from "nanoid";
import { generationAssetId } from "@/lib/generation-asset-id";
import { defaultAssetCategoryForKind } from "@/lib/asset-category";
import { parseAssetRecord } from "@/lib/asset-record";
import { mergeProtectedFields, resolvePrimaryLocation, type AssetArchiveCategory as AssetCategory, type AssetCategorySource, type AssetSourceCode } from "@/types/asset-archive";
import { mergeAssetContent, normalizeAssetRecord, parseAssetStorageDocument, rebaseAssetSnapshot, serializeAssetStorageDocument, shareUnchangedAssets, type AssetStorageDocument } from "@/lib/asset-storage-revision";
import { parseCanvasStorageDocument } from "@/lib/canvas/canvas-storage-revision";
import { localForageStorageForScope } from "@/lib/localforage-storage";
import { getActiveUserScope } from "@/lib/user-scope";
import { resourceFileUrl, resourceIdFromStorageKey } from "@/services/api/resources";
import { cleanupUnusedImages, collectImageStorageKeys, resolveImageUrl } from "@/services/image-storage";
import { cleanupUnusedMedia, collectMediaStorageKeys, resolveMediaUrl } from "@/services/file-storage";
import { flushGenerationAssetStorageLocks, insertOrReturnGenerationAsset, withGenerationArtifactCommitLock, withGenerationAssetStorageLock } from "@/services/generation-asset-repository";
import { CANVAS_STORE_KEY, commitPendingCanvasStorePersistenceLocked, pendingCanvasStorePersistence, useCanvasStore, withCanvasStorePersistenceLock } from "@/stores/canvas/use-canvas-store";
import { currentLocaleText } from "@/i18n/current-locale-text";
import { readAllCanvasSyncDrafts } from "@/services/canvas-sync-drafts";
import { loadCreationConversations } from "@/services/creation-conversation-store";

export type AssetKind = "text" | "image" | "video" | "audio" | "model" | "entity";
export type { AssetArchiveCategory as AssetCategory } from "@/types/asset-archive";
export type AssetStatus = "draft" | "review" | "confirmed" | "archived";
export type TextAsset = AssetBase<"text"> & { data: { content: string } };
export type ImageAsset = AssetBase<"image"> & { data: { dataUrl: string; storageKey?: string; width: number; height: number; bytes: number; mimeType: string } };
export type VideoAsset = AssetBase<"video"> & { data: { url: string; storageKey?: string; width: number; height: number; durationMs?: number; hasAudio?: boolean; bytes: number; mimeType: string } };
export type AudioAsset = AssetBase<"audio"> & { data: { url: string; storageKey?: string; durationMs?: number; bytes: number; mimeType: string } };
export type ModelAsset = AssetBase<"model"> & { data: { url: string; storageKey?: string; bytes: number; mimeType: string; fileName: string } };
export type EntityAsset = AssetBase<"entity"> & { data: { definition: Record<string, unknown> } };
export type Asset = TextAsset | ImageAsset | VideoAsset | AudioAsset | ModelAsset | EntityAsset;
export type NewAsset =
    | Omit<TextAsset, "id" | "createdAt" | "updatedAt">
    | Omit<ImageAsset, "id" | "createdAt" | "updatedAt">
    | Omit<VideoAsset, "id" | "createdAt" | "updatedAt">
    | Omit<AudioAsset, "id" | "createdAt" | "updatedAt">
    | Omit<ModelAsset, "id" | "createdAt" | "updatedAt">
    | Omit<EntityAsset, "id" | "createdAt" | "updatedAt">;

type AssetBase<T extends AssetKind> = {
    id: string;
    kind: T;
    title: string;
    coverUrl: string;
    tags: string[];
    folderId?: string | null;
    archiveCanvasId?: string | null;
    originCanvasId?: string | null;
    categorySource?: AssetCategorySource | null;
    sourceCode?: AssetSourceCode;
    category?: AssetCategory | null;
    status?: AssetStatus;
    primaryVersionId?: string;
    source?: string;
    note?: string;
    arkAssetId?: string;
    portraitCertified?: boolean;
    createdAt: string;
    updatedAt: string;
    metadata?: Record<string, unknown>;
};

type AssetStore = {
    hydrated: boolean;
    /** Runtime visibility only; never discard a durable locator for an unreadable local directory. */
    unavailableImageIds: string[];
    assets: Asset[];
    addAsset: (asset: NewAsset) => string;
    addGenerationAsset: (effectKey: string, asset: NewAsset, signal?: AbortSignal) => Promise<string>;
    /** False means the entire edit was not applied; protected changes need a dedicated command. */
    updateAsset: (id: string, patch: Partial<Omit<Asset, "id" | "createdAt">>) => boolean;
    removeAsset: (id: string) => Promise<void>;
    /** False means no records were replaced because a protected change was requested. */
    replaceAssets: (assets: Asset[]) => boolean;
    cleanupImages: (extra?: unknown) => Promise<void>;
};

export const ASSET_STORE_KEY = "infinite-canvas:asset_store";

type PersistedAssetState = Pick<AssetStore, "assets">;

function protectedFieldsChanged(current: Asset, patch: Partial<Pick<Asset, "folderId" | "archiveCanvasId" | "originCanvasId" | "category" | "categorySource">>) {
    return (["folderId", "archiveCanvasId", "originCanvasId", "category", "categorySource"] as const)
        .some(key => Object.hasOwn(patch, key) && (!Object.hasOwn(current, key) || !Object.is(current[key], patch[key])));
}

function prepareNewAsset(asset: NewAsset): NewAsset {
    asset = { ...asset, category: asset.category ?? defaultAssetCategoryForKind(asset.kind) };
    const location = resolvePrimaryLocation(asset);
    if ("reason" in location) throw Object.assign(new Error(currentLocaleText("canvasExtra.cloudSync.syncFailedRetry")), { reason: location.reason });
    // Incremental account sessions may not have loaded a valid remote canvas yet.
    if (getActiveUserScope() !== "guest" || !asset.archiveCanvasId || useCanvasStore.getState().projects.some(project => project.id === asset.archiveCanvasId)) return asset;
    const next = { ...asset };
    delete next.archiveCanvasId;
    return next;
}
type ObservedAssetPersist = {
    assets: Asset[];
    revision: number;
};

type QueuedAssetPersist = {
    name: string;
    scope: string;
    baseAssets: Asset[];
    baseRevision: number;
    assets: Asset[];
    token: number;
};

let suppressAssetStorePersistence = 0;
const assetMemoryStates = new Map<string, PersistedAssetState>();
const observedAssetPersists = new Map<string, ObservedAssetPersist>();
const queuedAssetPersists = new Map<string, QueuedAssetPersist>();
const assetPersistTokens = new Map<string, number>();
const assetOperations = new Set<Promise<unknown>>();
const generationAssetFailures = new Map<string, unknown>();

function recordAssetStorageDocument(scope: string, document: AssetStorageDocument) {
    observedAssetPersists.set(scope, {
        assets: document.state.assets,
        revision: document.storageRevision,
    });
}

export function withAssetStorePersistenceSuppressed<T>(operation: () => T) {
    suppressAssetStorePersistence += 1;
    try {
        return operation();
    } finally {
        suppressAssetStorePersistence -= 1;
    }
}

async function commitPendingAssetStorePersistenceLocked(scope: string) {
    const storage = localForageStorageForScope(scope);
    let committed: AssetStorageDocument | null = null;

    while (true) {
        const queued = queuedAssetPersists.get(scope);
        if (!queued) return committed;

        const durable = parseAssetStorageDocument(await storage.getItem(queued.name), queued.baseAssets);
        const rebased = rebaseAssetSnapshot({
            document: durable,
            baseAssets: queued.baseAssets,
            localAssets: queued.assets,
            baseRevision: queued.baseRevision,
        });
        await storage.setItem(queued.name, serializeAssetStorageDocument(rebased));
        committed = rebased;
        recordAssetStorageDocument(scope, rebased);

        const latest = queuedAssetPersists.get(scope);
        if (!latest || latest.token === queued.token) {
            if (latest?.token === queued.token) queuedAssetPersists.delete(scope);
            return committed;
        }

        latest.baseAssets = queued.assets;
        latest.baseRevision = rebased.storageRevision;
    }
}

async function writeQueuedAssetPersist(scope: string, _token: number) {
    await withGenerationAssetStorageLock(scope, () => commitPendingAssetStorePersistenceLocked(scope));
}

async function readPersistedAssetDocumentForScope(scope: string) {
    return parseAssetStorageDocument(await localForageStorageForScope(scope).getItem(ASSET_STORE_KEY));
}

function trackAssetOperation<T>(operation: Promise<T>) {
    assetOperations.add(operation);
    void operation.finally(() => assetOperations.delete(operation)).catch(() => undefined);
    return operation;
}

function persistAssetState(name: string, value: StorageValue<AssetStore>) {
    const scope = getActiveUserScope();
    const nextAssets = value.state.assets.map(normalizeAssetRecord);
    const queued = queuedAssetPersists.get(scope);
    const observed = observedAssetPersists.get(scope);
    const baseAssets = assetMemoryStates.get(scope)?.assets ?? observed?.assets ?? [];
    assetMemoryStates.set(scope, { assets: nextAssets });
    if (suppressAssetStorePersistence) return;

    const token = (assetPersistTokens.get(scope) ?? 0) + 1;
    assetPersistTokens.set(scope, token);
    queuedAssetPersists.set(scope, {
        name,
        scope,
        baseAssets: queued?.baseAssets ?? baseAssets,
        baseRevision: queued?.baseRevision ?? observed?.revision ?? 0,
        assets: nextAssets,
        token,
    });
    return trackAssetOperation(writeQueuedAssetPersist(scope, token));
}

function generationAssetFailureKey(scope: string, effectKey: string) {
    return `${scope}\0${effectKey}`;
}

function trackGenerationAssetOperation<T>(scope: string, effectKey: string, operation: Promise<T>) {
    const failureKey = generationAssetFailureKey(scope, effectKey);
    return trackAssetOperation(
        operation.then(
            (value) => {
                generationAssetFailures.delete(failureKey);
                return value;
            },
            (error) => {
                throw error;
            },
        ),
    );
}

export async function flushAssetStorePersistence() {
    while (true) {
        if (assetOperations.size) {
            await Promise.all([...assetOperations]);
            continue;
        }

        const writes = [...queuedAssetPersists.values()].map(({ scope, token }) => writeQueuedAssetPersist(scope, token));
        if (writes.length) {
            await Promise.all(writes);
            continue;
        }

        await flushGenerationAssetStorageLocks();
        if (!assetOperations.size && !queuedAssetPersists.size) break;
    }

    // 生成素材写入失败只上报一次：重试由生成任务的同一 effectKey 负责（失败时 claim 已释放）。
    // 若别的标签页已完成该 effect，本页不会再用同一 key 重试；常驻的失败会让之后每次 flush
    // （包括切换账号、登出）都永久失败。
    const failure = generationAssetFailures.entries().next();
    if (!failure.done) {
        generationAssetFailures.delete(failure.value[0]);
        throw failure.value[1];
    }
}

/** Dedicated commands share the ordinary writer's scope lock and tombstones. */
export async function commitAssetArchiveCommand<T>(operation: (assets: Asset[]) => { assets: Asset[]; result: T }, scope = getActiveUserScope()): Promise<T> {
    return withGenerationAssetStorageLock(scope, async () => {
        if (scope !== getActiveUserScope()) throw new DOMException("Account changed", "AbortError");
        await commitPendingAssetStorePersistenceLocked(scope);
        const durable = await readPersistedAssetDocumentForScope(scope);
        const publicationBase = durable.state.assets;
        const { assets, result } = operation(durable.state.assets);
        const document = { ...durable, state: { assets }, storageRevision: durable.storageRevision + 1 };
        await localForageStorageForScope(scope).setItem(ASSET_STORE_KEY, serializeAssetStorageDocument(document));
        if (scope !== getActiveUserScope()) throw new DOMException("Account changed", "AbortError");
        const localAssets = useAssetStore.getState().assets.filter(asset => !document.tombstones.assets[asset.id]);
        const published = rebaseAssetSnapshot({ document, baseAssets: publicationBase, localAssets, baseRevision: durable.storageRevision });
        recordAssetStorageDocument(scope, document);
        const previous = useAssetStore.getState().assets;
        const next = shareUnchangedAssets(previous, published.state.assets);
        if (next !== previous) withAssetStorePersistenceSuppressed(() => useAssetStore.setState({ assets: next }));
        // Memory-only records still need their first ordinary durable write.
        assetMemoryStates.set(scope, { assets: document.state.assets });
        return result;
    });
}

/** Old servers return summaries: only explicitly present protected fields are authoritative. */
export function mergeRemoteAssetRecord(record: unknown, local: Asset, base: Asset = local, preserveLocalMedia = false): Asset {
    let remote: Asset;
    try { remote = parseAssetRecord(record); }
    catch {
        if (!record || typeof record !== "object") return local;
        const next = { ...local };
        for (const key of ["folderId", "archiveCanvasId", "originCanvasId", "category", "categorySource"] as const) {
            if (Object.hasOwn(record, key)) Object.assign(next, { [key]: (record as Record<string, unknown>)[key] });
        }
        // Summary responses have no content contract. Validate only their protected
        // fields; upload payloads may intentionally omit local-only media locators.
        const validated = parseAssetRecord({ ...next, kind: "text", data: { content: "" }, coverUrl: "", tags: [] });
        for (const key of ["folderId", "archiveCanvasId", "originCanvasId", "category", "categorySource"] as const) {
            delete next[key];
            if (Object.hasOwn(validated, key)) Object.assign(next, { [key]: validated[key] });
        }
        return next;
    }
    if (preserveLocalMedia) remote = { ...remote, data: local.data, coverUrl: local.coverUrl, primaryVersionId: local.primaryVersionId } as Asset;
    return mergeAssetContent(base, local, remote);
}

export async function applyRemoteAssetRecords(records: unknown[], scope = getActiveUserScope(), baseAssets?: readonly Asset[], preserveLocalMedia = false) {
    const bases = new Map(baseAssets?.map(asset => [asset.id, asset]));
    await commitAssetArchiveCommand((assets) => {
        const current = new Map(assets.map(asset => [asset.id, asset]));
        for (const record of records) {
            if (!record || typeof record !== "object" || !("id" in record) || typeof record.id !== "string") continue;
            // A remote response cannot revive an asset removed while it was in flight.
            const local = current.get(record.id);
            if (!local || !useAssetStore.getState().assets.some(asset => asset.id === record.id)) continue;
            current.set(record.id, mergeRemoteAssetRecord(record, local, bases.get(record.id) ?? local, preserveLocalMedia));
        }
        return { assets: [...current.values()], result: undefined };
    }, scope);
}

export async function assertAssetNotUsedAsCanvasCover(id: string) {
    const scope = getActiveUserScope();
    if (scope !== "guest") return; // The server checks references across unloaded canvases.
    const durableCanvas = parseCanvasStorageDocument(await localForageStorageForScope(scope).getItem(CANVAS_STORE_KEY)).state.projects;
    if (scope !== getActiveUserScope()) throw new DOMException("Account changed", "AbortError");
    if ([...useCanvasStore.getState().projects, ...durableCanvas].some(project => project.folderPresentation?.cover?.assetId === id)) throw new Error(currentLocaleText("canvasExtra.cloudSync.syncFailedRetry"));
}

const assetStorage: PersistStorage<AssetStore> = {
    getItem: async (name) => {
        const scope = getActiveUserScope();
        const value = await localForageStorageForScope(scope).getItem(name);
        if (!value) {
            assetMemoryStates.set(scope, { assets: [] });
            observedAssetPersists.set(scope, { assets: [], revision: 0 });
            return { state: { assets: [], unavailableImageIds: [] }, version: 0 } as unknown as StorageValue<AssetStore>;
        }
        const document = parseAssetStorageDocument(value);
        // 持久化恢复只恢复结构化记录，不能为每个 resource: key 逐条读取资源元数据或 Blob。
        // 远程资源直接使用受鉴权的 file URL；本地 legacy key 仍恢复为 Blob URL，避免兼容性回归。
        const restored = await Promise.all(document.state.assets.map((asset) => normalizePersistedAsset(asset)));
        const assets = restored.map((asset, index) => asset ?? document.state.assets[index]);
        const unavailableImageIds = document.state.assets.filter((_asset, index) => restored[index] === null).map(asset => asset.id);
        const hydratedDocument = { ...document, state: { assets, unavailableImageIds } };
        assetMemoryStates.set(scope, { assets });
        recordAssetStorageDocument(scope, hydratedDocument);
        return hydratedDocument as unknown as StorageValue<AssetStore>;
    },
    setItem: persistAssetState,
    removeItem: (name) => {
        const scope = getActiveUserScope();
        return localForageStorageForScope(scope).removeItem(name);
    },
};

async function normalizePersistedAsset(asset: Asset): Promise<Asset | null> {
    asset = normalizeAssetRecord(asset);
    const storageKey = "data" in asset && asset.data && "storageKey" in asset.data ? asset.data.storageKey : undefined;
    const resourceId = resourceIdFromStorageKey(storageKey);
    if (resourceId) {
        const url = resourceFileUrl(resourceId);
        if (asset.kind === "video" || asset.kind === "audio" || asset.kind === "model") return { ...asset, data: { ...asset.data, url } } as Asset;
        if (asset.kind === "image") return { ...asset, coverUrl: asset.coverUrl.startsWith("blob:") ? url : asset.coverUrl, data: { ...asset.data, dataUrl: url } };
    }

    // 非 resource: key 是早期本地存储格式，必须继续从 localForage 恢复，
    // 但只在确有本地 key 时读取，不让远程资源重新走逐条网络查询。
    if (asset.kind === "video" && storageKey) return { ...asset, data: { ...asset.data, url: await resolveMediaUrl(storageKey, asset.data.url) } };
    if (asset.kind === "audio" && storageKey) return { ...asset, data: { ...asset.data, url: await resolveMediaUrl(storageKey, asset.data.url) } };
    if (asset.kind === "model" && storageKey) return { ...asset, data: { ...asset.data, url: await resolveMediaUrl(storageKey, asset.data.url) } };
    if (asset.kind !== "image") return asset;
    if (storageKey) {
        const localUrl = await resolveImageUrl(storageKey, "");
        if (!localUrl && storageKey.startsWith("image:")) {
            if (asset.data.dataUrl.startsWith("data:image/")) return normalizePersistedAsset({ ...asset, data: { ...asset.data, storageKey: undefined } });
            if (!/^(https?:\/\/|\/api\/resources\/|\/liblib-clone\/)/.test(asset.data.dataUrl)) return null;
        }
        return {
            ...asset,
            coverUrl: asset.coverUrl.startsWith("blob:") ? localUrl || asset.coverUrl : asset.coverUrl,
            data: { ...asset.data, dataUrl: localUrl || asset.data.dataUrl },
        };
    }
    // Inline originals are already durable. Decode and migrate them only in the
    // idle recovery queue, so hydration performs neither uploads nor Blob writes.
    return asset;
}

export const useAssetStore = create<AssetStore>()(
    persist(
        (set, get) => ({
            hydrated: false,
            unavailableImageIds: [],
            assets: [],
            addAsset: (asset) => {
                asset = prepareNewAsset(asset);
                const now = new Date().toISOString();
                const id = nanoid();
                set((state) => ({ assets: [normalizeAssetRecord({ ...asset, id, createdAt: now, updatedAt: now } as Asset), ...state.assets] }));
                return id;
            },
            addGenerationAsset: (effectKey, asset, signal) => {
                const scope = getActiveUserScope();
                const publicationBase = observedAssetPersists.get(scope) ?? { assets: get().assets, revision: 0 };
                return trackGenerationAssetOperation(
                    scope,
                    effectKey,
                    (async () => {
                        const id = await generationAssetId(effectKey);
                        let persistedDocument: AssetStorageDocument | null = null;
                        return insertOrReturnGenerationAsset<Asset>({
                            storageScope: scope,
                            effectKey,
                            assetId: id,
                            createAsset: () => {
                                const now = new Date().toISOString();
                                return normalizeAssetRecord({
                                    ...prepareNewAsset(asset),
                                    id,
                                    createdAt: now,
                                    updatedAt: now,
                                    metadata: { ...asset.metadata, generationEffectKey: effectKey },
                                } as Asset);
                            },
                            updateAssets: (updater) => {
                                withAssetStorePersistenceSuppressed(() => {
                                    set((state) => {
                                        if (!persistedDocument) return { assets: updater(state.assets) };
                                        const liveDocument = rebaseAssetSnapshot({
                                            document: persistedDocument,
                                            baseAssets: publicationBase.assets,
                                            localAssets: state.assets,
                                            baseRevision: publicationBase.revision,
                                        });
                                        const generationAssets = updater(persistedDocument.state.assets);
                                        const published = rebaseAssetSnapshot({
                                            document: liveDocument,
                                            baseAssets: persistedDocument.state.assets,
                                            localAssets: generationAssets,
                                            baseRevision: persistedDocument.storageRevision,
                                        });
                                        return { assets: published.state.assets };
                                    });
                                });
                            },
                            readAssets: () => get().assets,
                            readPersistedAssets: async () => {
                                try {
                                    await commitPendingAssetStorePersistenceLocked(scope);
                                    persistedDocument = await readPersistedAssetDocumentForScope(scope);
                                    recordAssetStorageDocument(scope, persistedDocument);
                                    return persistedDocument.state.assets;
                                } catch (error) {
                                    generationAssetFailures.set(generationAssetFailureKey(scope, effectKey), error);
                                    throw error;
                                }
                            },
                            isAssetDeleted: () => Boolean(persistedDocument?.tombstones.assets[id]),
                            requireCrossRealmLock: true,
                            signal,
                            persistAssets: async (assets) => {
                                const durable = persistedDocument ?? (await readPersistedAssetDocumentForScope(scope));
                                const nextDocument: AssetStorageDocument = {
                                    ...durable,
                                    state: { assets },
                                    storageRevision: durable.storageRevision + 1,
                                };
                                try {
                                    await localForageStorageForScope(scope).setItem(ASSET_STORE_KEY, serializeAssetStorageDocument(nextDocument));
                                } catch (error) {
                                    generationAssetFailures.set(generationAssetFailureKey(scope, effectKey), error);
                                    throw error;
                                }
                                persistedDocument = nextDocument;
                                recordAssetStorageDocument(scope, nextDocument);
                            },
                        });
                    })(),
                );
            },
            updateAsset: (id, patch) => {
                const current = get().assets.find(asset => asset.id === id);
                if (!current) return false;
                if (protectedFieldsChanged(current, patch)) return false;
                set((state) => ({
                    assets: state.assets.map((asset) => (asset.id === id ? normalizeAssetRecord(mergeProtectedFields(asset as unknown as Record<string, unknown>, { ...asset, ...patch, updatedAt: new Date().toISOString() }) as Asset) : asset)),
                }));
                return true;
            },
            removeAsset: async (id) => {
                await assertAssetNotUsedAsCanvasCover(id);
                let remainingAssets: Asset[] = [];
                let removedAsset: Asset | undefined;
                set((state) => {
                    removedAsset = state.assets.find((asset) => asset.id === id);
                    const assets = state.assets.filter((asset) => asset.id !== id);
                    remainingAssets = assets;
                    return { assets };
                });
                // 没有本地媒体定位时没有需要由该删除动作回收的 Blob；跳过全库扫描，
                // 避免纯文本/远程资源删除依赖浏览器 IndexedDB 驱动。
                if (!removedAsset || (!collectImageStorageKeys(removedAsset).size && !collectMediaStorageKeys(removedAsset).size)) return;
                await get().cleanupImages({ assets: remainingAssets });
            },
            replaceAssets: (assets) => {
                const current = new Map(get().assets.map(asset => [asset.id, asset]));
                if (assets.some(asset => current.has(asset.id) && protectedFieldsChanged(current.get(asset.id)!, asset))) return false;
                set({ assets: assets.map(asset => normalizeAssetRecord(current.has(asset.id) ? mergeProtectedFields(current.get(asset.id)! as unknown as Record<string, unknown>, asset as unknown as Record<string, unknown>) as Asset : asset)) });
                return true;
            },
            cleanupImages: async (extra) => {
                const scope = getActiveUserScope();
                const frozenExtraImageKeys = collectImageStorageKeys(extra);
                const frozenExtraMediaKeys = collectMediaStorageKeys(extra);
                await new Promise<void>((resolve, reject) => {
                    window.setTimeout(() =>
                        withGenerationArtifactCommitLock(scope, async () => {
                            const syncDrafts = await readAllCanvasSyncDrafts(scope);
                            // 创作对话附件只由对话本身引用；读不到对话时宁可跳过清理也不能误删。
                            const creationConversations = await loadCreationConversations(scope).catch((error) => {
                                console.warn("创作对话读取失败，已跳过本地媒体清理", { scope, error });
                                return undefined;
                            });
                            if (creationConversations === undefined) return;
                            // 固定锁序：artifact -> Canvas（释放）-> Asset，避免跨 store 锁重入。
                            const canvasProjects = await withCanvasStorePersistenceLock(scope, async () => {
                                await commitPendingCanvasStorePersistenceLocked(scope);
                                const durableCanvas = parseCanvasStorageDocument(await localForageStorageForScope(scope).getItem(CANVAS_STORE_KEY));
                                return pendingCanvasStorePersistence(scope)?.projects ?? durableCanvas.state.projects;
                            });
                            await withGenerationAssetStorageLock(scope, async () => {
                                await commitPendingAssetStorePersistenceLocked(scope);
                                const durableAssets = (await readPersistedAssetDocumentForScope(scope)).state.assets;
                                const references = { projects: canvasProjects, assets: durableAssets, syncDrafts, creationConversations: creationConversations || [] };
                                const imageKeys = new Set([...frozenExtraImageKeys, ...collectImageStorageKeys(references)]);
                                const mediaKeys = new Set([...frozenExtraMediaKeys, ...collectMediaStorageKeys(references)]);
                                await cleanupUnusedImages(
                                    [...imageKeys].map((storageKey) => ({ storageKey })),
                                    scope,
                                );
                                await cleanupUnusedMedia(
                                    [...mediaKeys].map((storageKey) => ({ storageKey })),
                                    scope,
                                );
                            });
                        }).then(resolve, reject),
                    );
                });
            },
        }),
        {
            name: ASSET_STORE_KEY,
            storage: assetStorage,
            partialize: (state) => ({ assets: state.assets }) as StorageValue<AssetStore>["state"],
            onRehydrateStorage: () => () => {
                useAssetStore.setState({ hydrated: true });
            },
        },
    ),
);
