import { currentLocaleText } from "@/i18n/current-locale-text";
import { ApiError } from "@/services/api/request";
import { getActiveUserScope } from "@/lib/user-scope";
import { appQueryClient } from "@/lib/query-client";
import { parseAssetRecord, parseAssetRecordList } from "@/lib/asset-record";
import { canvasNodeResourceIdentity, canvasNodeToAsset, findCanvasNodeAsset, requiresMaterializedCanvasAsset } from "@/lib/canvas/canvas-node-asset";
import { timelineMediaNode } from "@/services/canvas-asset-repair";
import { isPublicCaseReference } from "@/lib/canvas/public-case-reference";
import { applyRemoteAssetRecords, commitAssetArchiveCommand, useAssetStore, type Asset, type NewAsset } from "@/stores/use-asset-store";
import { useCanvasStore, type CanvasProject } from "@/stores/canvas/use-canvas-store";
import { classifyRemoteAssets, commitRemoteAssetArchive, moveRemoteAssets, preflightRemoteCanvasDelete, previewRemoteAssetArchive, type AssetCategoryRequest, type AssetCategoryResponse, type CanvasLibrarySummary } from "@/services/api/user-data";
import {
    ASSET_ARCHIVE_CATEGORIES, ASSET_ARCHIVE_BATCH_MAX, ASSET_ARCHIVE_ERROR_REASONS, DEFAULT_FOLDER_STYLE, DEFAULT_FOLDER_THEME, isValidPrimaryLocation, resolvePrimaryLocation, sectionOf, validateAssetArchiveCommitRequest, validateAssetArchiveMoveRequest,
    type AssetArchiveCommitRequest, type AssetArchiveErrorReason, type AssetArchiveFields, type AssetArchiveItemResult, type AssetArchiveMoveRequest, type AssetArchiveMoveResponse,
    type AssetArchivePreviewResponse, type AssetIngestContext, type AssetPrimaryLocation, type CanvasDeletePreflightResponse,
} from "@/types/asset-archive";

export class AssetArchiveCommandError extends Error {
    constructor(public readonly reason: AssetArchiveErrorReason) {
        super(currentLocaleText("canvasExtra.cloudSync.syncFailedRetry"));
    }
}

async function archiveRequest<T>(operation: () => Promise<T>): Promise<T> {
    try { return await operation(); }
    catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") throw error;
        const reason = error instanceof ApiError ? error.reason ?? error.details?.reason : undefined;
        throw new AssetArchiveCommandError((ASSET_ARCHIVE_ERROR_REASONS as readonly unknown[]).includes(reason) ? reason as AssetArchiveErrorReason : "internal-error");
    }
}

export function primaryLocationOf(asset: AssetArchiveFields): AssetPrimaryLocation {
    const resolved = resolvePrimaryLocation(asset);
    if ("reason" in resolved) throw new AssetArchiveCommandError(resolved.reason);
    return resolved.location;
}

export function samePrimaryLocation(left: AssetPrimaryLocation, right: AssetPrimaryLocation) {
    return left.kind === right.kind && (left.kind === "canvas" ? right.kind === "canvas" && left.canvasId === right.canvasId : left.kind === "folder" ? right.kind === "folder" && left.folderId === right.folderId : true);
}

export function setAssetPrimaryLocation<T extends AssetArchiveFields>(asset: T, target: AssetPrimaryLocation): T {
    const next = { ...asset };
    delete next.archiveCanvasId;
    delete next.folderId;
    if (target.kind === "canvas") next.archiveCanvasId = target.canvasId;
    if (target.kind === "folder") next.folderId = target.folderId;
    return next;
}

/** Metadata-only read model: never reads a media Blob or writes a canvas revision. */
export function localCanvasLibrarySummaries(projects: CanvasProject[], assets: Asset[], assetsOnly = false): CanvasLibrarySummary[] {
    const compareIds = (left: Asset, right: Asset) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
    const byCanvas = new Map<string, Asset[]>();
    const byId = new Map(assets.map(asset => [asset.id, asset]));
    for (const asset of assets) {
        if (!asset.archiveCanvasId || asset.status === "archived" || asset.kind === "entity") continue;
        const items = byCanvas.get(asset.archiveCanvasId) ?? [];
        items.push(asset);
        byCanvas.set(asset.archiveCanvasId, items);
    }
    return projects.filter(project => !assetsOnly || byCanvas.has(project.id) || project.folderPresentation?.source === "manual").map(project => {
        const items = byCanvas.get(project.id) ?? [];
        // Only three thumbnails and the oldest confirmed image are needed for the folder card.
        const newest: { asset: Asset; time: number; thumbnail: string }[] = [];
        let auto: Asset | undefined;
        let oldestTime = Infinity;
        for (const asset of items) {
            if (asset.kind === "image" && asset.status === "confirmed" && asset.coverUrl) {
                const created = Date.parse(asset.createdAt);
                if (!auto || created < oldestTime || (created === oldestTime && compareIds(asset, auto) < 0)) {
                    auto = asset;
                    oldestTime = created;
                }
            }
            const thumbnail = folderAssetThumbnail(asset);
            if (!thumbnail) continue;
            const time = Date.parse(asset.updatedAt);
            let position = 0;
            while (position < newest.length && ((newest[position].time - time) || compareIds(asset, newest[position].asset)) >= 0) position++;
            if (position < 3) {
                newest.splice(position, 0, { asset, time, thumbnail });
                if (newest.length > 3) newest.pop();
            }
        }
        const preview = newest.map(({ asset, thumbnail }) => asset.kind === "video" ? { assetId: asset.id, kind: "video" as const, thumbnailUrl: thumbnail, ...(typeof asset.data.durationMs === "number" && Number.isSafeInteger(asset.data.durationMs) && asset.data.durationMs >= 0 ? { durationMs: asset.data.durationMs } : {}) } : { assetId: asset.id, kind: "image" as const, thumbnailUrl: thumbnail });
        const presentation = project.folderPresentation ?? { style: DEFAULT_FOLDER_STYLE, theme: DEFAULT_FOLDER_THEME };
        const cover = presentation.cover;
        const explicit = cover?.assetId ? byId.get(cover.assetId) : undefined;
        return { id: project.id, projectId: project.projectId, title: project.title, revision: project.revision, createdAt: project.createdAt, updatedAt: project.updatedAt, importSource: project.importSource, nodeCount: project.nodes.length, coverSnapshot: project.coverSnapshot, archivedAssetCount: items.length, folderPresentation: { ...presentation, cover: cover ?? { mode: "auto" } }, coverUrl: cover ? explicit?.status !== "archived" ? explicit?.coverUrl : undefined : auto?.coverUrl, previewItems: preview as CanvasLibrarySummary["previewItems"] };
    });
}

function folderAssetThumbnail(asset: Asset): string {
    if (asset.kind === "image") return typeof asset.data.storageKey === "string" && /^(image:|resource:)/.test(asset.data.storageKey) ? asset.data.storageKey : asset.coverUrl || "";
    if (asset.kind !== "video") return "";
    if (typeof asset.metadata?.posterStorageKey === "string") return asset.metadata.posterStorageKey;
    const videoPreview = asset.metadata?.videoPreview as { content?: unknown } | undefined;
    const poster = videoPreview?.content ?? asset.coverUrl;
    // A video URL cannot be decoded by <img>; only use a distinct poster.
    return typeof poster === "string" && poster !== asset.data.url && !/\.(mp4|webm|mov)(?:[?#]|$)/i.test(poster) ? poster : "";
}

/** First creation only. Replays must return the existing asset without this resolver. */
export function resolveAssetIngest<T extends NewAsset>(asset: T, context: AssetIngestContext, canvasIds?: Set<string>): T {
    primaryLocationOf(asset);
    const knownIds = canvasIds ?? (getActiveUserScope() === "guest" ? new Set(useCanvasStore.getState().projects.map(project => project.id)) : undefined);
    let target = context.target ?? (context.canvasId ? { kind: "canvas" as const, canvasId: context.canvasId } : primaryLocationOf(asset));
    if (!isValidPrimaryLocation(target)) throw new AssetArchiveCommandError("invalid-location");
    if (target.kind === "canvas" && knownIds && !knownIds.has(target.canvasId)) target = { kind: "unfiled" };
    return { ...setAssetPrimaryLocation(asset, target), ...(context.canvasId ? { originCanvasId: context.canvasId } : {}), sourceCode: context.sourceCode };
}

function summarize(results: AssetArchiveItemResult[]): AssetArchiveMoveResponse {
    return { results, successCount: results.filter(item => item.outcome === "success").length, conflictCount: results.filter(item => item.outcome === "conflict").length, failedCount: results.filter(item => item.outcome === "failed").length };
}

export function moveLocalAssets(assets: Asset[], input: AssetArchiveMoveRequest, canvasIds: Set<string>) {
    const invalid = validateAssetArchiveMoveRequest(input);
    if (invalid) throw new AssetArchiveCommandError(invalid);
    const current = new Map(assets.map(asset => [asset.id, asset]));
    const results: AssetArchiveItemResult[] = input.assetIds.map(assetId => {
        const asset = current.get(assetId);
        if (!asset) return { assetId, outcome: "failed", reason: "asset-not-found" };
        if (asset.status === "archived") return { assetId, outcome: "failed", reason: "asset-archived" };
        const location = primaryLocationOf(asset);
        if (samePrimaryLocation(location, input.target)) return { assetId, outcome: "success", reason: "already-at-target", asset };
        if (!samePrimaryLocation(location, input.expectedLocations[assetId])) return { assetId, outcome: "conflict", reason: "location-conflict", asset };
        // Guest has no parallel local classification-folder system.
        if (input.target.kind === "folder") return { assetId, outcome: "failed", reason: "target-not-found" };
        const missing = input.target.kind === "canvas" && !canvasIds.has(input.target.canvasId);
        const next = setAssetPrimaryLocation(asset, missing ? { kind: "unfiled" } : input.target);
        current.set(assetId, next);
        return { assetId, outcome: "success", reason: missing ? "target-missing-unfiled" : "moved", asset: next };
    });
    return { assets: [...current.values()], result: summarize(results) };
}

async function requireOnline(scope: string) {
    if (scope === "guest") return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) throw new AssetArchiveCommandError("offline");
    const sync = await import("@/services/user-data-sync");
    if (!sync.hasRemoteUserDataSyncSession()) throw new AssetArchiveCommandError("sync-required");
}

function assertScope(scope: string) {
    if (scope !== getActiveUserScope()) throw new DOMException("Account changed", "AbortError");
}

async function acceptCommandResult<T extends { results: { outcome: string; asset?: unknown }[] }>(result: T, scope: string, bases: Asset[]): Promise<T> {
    assertScope(scope);
    let records: Asset[];
    try { records = parseAssetRecordList(result.results.filter(item => item.outcome !== "failed").map(item => item.asset)); }
    catch { throw new AssetArchiveCommandError("internal-error"); }
    await applyRemoteAssetRecords(records, scope, bases);
    assertScope(scope);
    void appQueryClient.invalidateQueries({ queryKey: ["asset-library"] });
    void appQueryClient.invalidateQueries({ queryKey: ["canvas-library"] });
    return result;
}

export async function moveAssets(input: AssetArchiveMoveRequest) {
    const invalid = validateAssetArchiveMoveRequest(input);
    if (invalid) throw new AssetArchiveCommandError(invalid);
    const scope = getActiveUserScope();
    const bases = useAssetStore.getState().assets;
    await requireOnline(scope);
    assertScope(scope);
    if (scope !== "guest") return acceptCommandResult(await archiveRequest(() => moveRemoteAssets(input)), scope, bases);
    return commitAssetArchiveCommand(assets => moveLocalAssets(assets, input, new Set(useCanvasStore.getState().projects.map(project => project.id))), scope);
}

function sameClassification(asset: Asset, expected: AssetCategoryRequest["items"][number]["expectedClassification"]) {
    return (["category", "categorySource"] as const).every(key => Object.hasOwn(asset, key) === Object.hasOwn(expected, key) && Object.is(asset[key], expected[key]));
}

export async function classifyAssets(input: AssetCategoryRequest): Promise<AssetCategoryResponse> {
    if (!input.items.length || input.items.length > ASSET_ARCHIVE_BATCH_MAX || input.items.some(item => !item.assetId || !item.expectedClassification || !ASSET_ARCHIVE_CATEGORIES.includes(item.category)) || new Set(input.items.map(item => item.assetId)).size !== input.items.length) throw new AssetArchiveCommandError("invalid-batch");
    const scope = getActiveUserScope();
    const bases = useAssetStore.getState().assets;
    await requireOnline(scope);
    assertScope(scope);
    if (scope !== "guest") return acceptCommandResult(await archiveRequest(() => classifyRemoteAssets(input)), scope, bases);
    return commitAssetArchiveCommand(assets => {
        const current = new Map(assets.map(asset => [asset.id, asset]));
        const results: AssetCategoryResponse["results"] = input.items.map(item => {
            const asset = current.get(item.assetId);
            if (!asset || asset.kind === "entity" || asset.kind === "audio" || asset.status === "archived") return { assetId: item.assetId, outcome: "failed", reason: asset ? "invalid-location" : "asset-not-found" };
            if (!sameClassification(asset, item.expectedClassification)) return { assetId: item.assetId, outcome: "conflict", asset };
            const next: Asset = { ...asset, category: item.category, categorySource: "user" };
            current.set(asset.id, next);
            return { assetId: asset.id, outcome: "success", asset: next };
        });
        return { assets: [...current.values()], result: { results, successCount: results.filter(item => item.outcome === "success").length, conflictCount: results.filter(item => item.outcome === "conflict").length, failedCount: results.filter(item => item.outcome === "failed").length } };
    }, scope);
}

export function previewLocalAssetArchive(assets: Asset[], projects: CanvasProject[]): AssetArchivePreviewResponse {
    const canvasIds = new Set(projects.map(project => project.id));
    const references = new Map<string, Set<string>>();
    for (const project of projects) for (const node of [...project.nodes, ...(project.timeline?.clips.flatMap(clip => clip.directMedia ? [timelineMediaNode(clip.directMedia)] : []) || [])]) {
        const asset = findCanvasNodeAsset(assets, node, project.id);
        if (!asset) continue;
        const ids = references.get(asset.id) ?? new Set<string>();
        ids.add(project.id);
        references.set(asset.id, ids);
    }
    const items: AssetArchivePreviewResponse["items"] = assets.map(asset => {
        const retained = (reason: "existing-location" | "recycle-bin" | "conflicting-evidence" | "target-missing" | "multiple-references" | "no-evidence") => ({ assetId: asset.id, tier: "retained" as const, reason });
        if (asset.archiveCanvasId || asset.folderId) return retained("existing-location");
        if (asset.status === "archived") return retained("recycle-bin");
        const evidenceIds = [...new Set([asset.originCanvasId, typeof asset.metadata?.canvasId === "string" ? asset.metadata.canvasId : undefined].filter((id): id is string => Boolean(id)))];
        if (evidenceIds.length > 1) return retained("conflicting-evidence");
        if (evidenceIds.length === 1 && typeof asset.metadata?.canvasId === "string" && asset.metadata.canvasId) {
            if (!canvasIds.has(evidenceIds[0])) return retained("target-missing");
            return { assetId: asset.id, tier: "trusted", target: { kind: "canvas", canvasId: evidenceIds[0] }, expectedLocation: primaryLocationOf(asset), evidence: ["metadata-canvas"] };
        }
        const ids = [...(references.get(asset.id) ?? [])];
        if (ids.length > 1) return retained("multiple-references");
        if (ids.length === 1) return { assetId: asset.id, tier: "suggested", target: { kind: "canvas", canvasId: ids[0] }, expectedLocation: primaryLocationOf(asset), evidence: ["unique-reference"] };
        return retained("no-evidence");
    });
    return { items, scannedCount: items.length, trustedCount: items.filter(item => item.tier === "trusted").length, suggestedCount: items.filter(item => item.tier === "suggested").length, retainedCount: items.filter(item => item.tier === "retained").length, suspectedDeletedCanvasCount: assets.filter(asset => asset.status === "archived" && (asset.source?.startsWith("已删除画布：") || asset.metadata?.sourceNodeId)).length, nearingExpiryCount: 0 };
}

async function flushArchiveBaseline(scope: string) {
    await requireOnline(scope);
    if (scope !== "guest") {
        try { await (await import("@/services/user-data-sync")).saveRemoteUserDataNow(); }
        catch { throw new AssetArchiveCommandError("sync-required"); }
    }
    assertScope(scope);
}

export async function previewAssetArchive(signal?: AbortSignal) {
    if (signal?.aborted) throw new DOMException("The operation was aborted", "AbortError");
    const scope = getActiveUserScope();
    // Opening a preview must not upload local data or mutate remote records.
    await requireOnline(scope);
    if (signal?.aborted) throw new DOMException("The operation was aborted", "AbortError");
    assertScope(scope);
    if (scope === "guest") return previewLocalAssetArchive(useAssetStore.getState().assets, useCanvasStore.getState().projects);
    const result = await archiveRequest(() => previewRemoteAssetArchive(signal));
    if (signal?.aborted) throw new DOMException("The operation was aborted", "AbortError");
    assertScope(scope);
    return result;
}

export async function commitAssetArchive(input: AssetArchiveCommitRequest) {
    const invalid = validateAssetArchiveCommitRequest(input);
    if (invalid) throw new AssetArchiveCommandError(invalid);
    const scope = getActiveUserScope();
    await flushArchiveBaseline(scope);
    const bases = useAssetStore.getState().assets;
    if (scope !== "guest") return acceptCommandResult(await archiveRequest(() => commitRemoteAssetArchive(input)), scope, bases);
    return commitAssetArchiveCommand(assets => {
        const projects = useCanvasStore.getState().projects;
        const preview = previewLocalAssetArchive(assets, projects);
        const current = new Map(assets.map(asset => [asset.id, asset]));
        const results: AssetArchiveItemResult[] = input.items.map(item => {
            const asset = current.get(item.assetId);
            if (!asset) return { assetId: item.assetId, outcome: "failed", reason: "asset-not-found" };
            if (asset.status === "archived") return { assetId: item.assetId, outcome: "failed", reason: "asset-archived" };
            if (!projects.some(project => project.id === item.target.canvasId)) return { assetId: item.assetId, outcome: "conflict", reason: "evidence-changed", asset };
            if (samePrimaryLocation(primaryLocationOf(asset), item.target)) return { assetId: asset.id, outcome: "success", reason: "already-at-target", asset };
            const candidate = preview.items.find(candidate => candidate.assetId === item.assetId);
            if (!candidate || candidate.tier === "retained" || candidate.tier !== item.tier || !samePrimaryLocation(candidate.target, item.target) || JSON.stringify(candidate.evidence) !== JSON.stringify(item.evidence)) return { assetId: asset.id, outcome: "conflict", reason: "evidence-changed", asset };
            const moved = moveLocalAssets([...current.values()], { assetIds: [asset.id], target: item.target, expectedLocations: { [asset.id]: item.expectedLocation } }, new Set(projects.map(project => project.id))).result.results[0];
            if (moved.outcome === "success") {
                const next = { ...moved.asset, ...(item.tier === "trusted" && !asset.originCanvasId ? { originCanvasId: item.target.canvasId } : {}) } as Asset;
                current.set(asset.id, next);
                return { ...moved, asset: next };
            }
            return moved;
        });
        return { assets: [...current.values()], result: summarize(results) };
    }, scope);
}

export function localCanvasDeletePlan(canvasIds: string[], projects: CanvasProject[], assets: Asset[]) {
    const ids = new Set(canvasIds);
    const archived = new Set(assets.filter(asset => asset.status !== "archived" && asset.archiveCanvasId && ids.has(asset.archiveCanvasId)).map(asset => asset.id));
    const media = new Map<string, { canvasId: string; nodeId: string; asset: NewAsset }>();
    const blocked: CanvasDeletePreflightResponse["blocked"] = [];
    for (const project of projects) {
        if (!ids.has(project.id)) continue;
        const nodes = [...project.nodes, ...(project.timeline?.clips.flatMap(clip => clip.directMedia ? [timelineMediaNode(clip.directMedia)] : []) || [])];
        for (const node of nodes) {
            if (isPublicCaseReference(node)) continue;
            if (!["image", "video", "audio"].includes(node.type) || findCanvasNodeAsset(assets, node, project.id)) continue;
            const identity = canvasNodeResourceIdentity(node) || (/^(https?:|data:)/.test(node.metadata?.content || "") ? node.metadata?.content : undefined);
            const asset = canvasNodeToAsset(node, { canvasId: project.id, source: "canvas-manual" });
            // Empty, failed and still-generating placeholders have no media to preserve.
            if (!identity && !/^(blob:|https?:|data:)/.test(node.metadata?.content || "")) continue;
            if (!asset || requiresMaterializedCanvasAsset(node) || !identity || identity.startsWith("blob:")) {
                blocked.push({ canvasId: project.id, nodeId: node.id, reason: "media-unavailable" });
                continue;
            }
            try { parseAssetRecord({ ...asset, id: "preflight", createdAt: "", updatedAt: "" }); }
            catch {
                blocked.push({ canvasId: project.id, nodeId: node.id, reason: "media-registration-failed" });
                continue;
            }
            if (!media.has(identity)) media.set(identity, { canvasId: project.id, nodeId: node.id, asset: { ...setAssetPrimaryLocation(asset, { kind: "unfiled" }), originCanvasId: project.id, sourceCode: "deleted-canvas" } });
        }
    }
    return { media: [...media.values()], counts: { archivedAssetCount: archived.size, unregisteredMediaCount: media.size, toUnfiledCount: archived.size + media.size, blocked } satisfies CanvasDeletePreflightResponse };
}

export async function preflightCanvasDelete(canvasIds: string[], signal?: AbortSignal): Promise<CanvasDeletePreflightResponse> {
    const scope = getActiveUserScope();
    await requireOnline(scope);
    if (scope === "guest") return localCanvasDeletePlan([...new Set(canvasIds)], useCanvasStore.getState().projects, useAssetStore.getState().assets).counts;
    const result = await archiveRequest(() => preflightRemoteCanvasDelete({ canvasIds: [...new Set(canvasIds)] }, signal));
    assertScope(scope);
    return result;
}
