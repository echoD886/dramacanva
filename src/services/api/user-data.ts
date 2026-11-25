import type { Asset } from "@/stores/use-asset-store";
import type { CanvasProject } from "@/stores/canvas/use-canvas-store";
import { ApiError, apiClient, compactApiParams, request } from "@/services/api/request";
import { assertCanvasEditsReady, canvasEditProofs } from "@/services/canvas-edit-leases";
import type { AssetArchiveMoveRequest, AssetArchiveMoveResponse, AssetArchivePreviewResponse, AssetArchiveCommitRequest, CanvasDeletePreflightRequest, CanvasDeletePreflightResponse, AssetClassificationFields, AssetArchiveCategory, AssetArchiveFields, AssetSection, FolderPresentationView, FolderPreviewItems } from "@/types/asset-archive";

const api = apiClient;

export type RemoteUserDataSummary = AssetArchiveFields & {
    id: string;
    folderId?: string;
    kind?: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    revision?: number;
};

export type RemoteAssetPage = {
    assets: Asset[];
    kindCounts: Record<string, number>;
    categoryCounts: Record<string, number>;
    folderCounts: Record<string, number>;
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
};

export type RemoteUserDataSnapshot = {
    assets: Asset[];
    projects: CanvasProject[];
};

export type CanvasLibrarySummary = Pick<CanvasProject, "id" | "projectId" | "title" | "revision" | "createdAt" | "updatedAt" | "importSource" | "coverSnapshot"> & {
    folderPresentation?: FolderPresentationView;
    archivedAssetCount?: number;
    coverUrl?: string;
    previewItems: FolderPreviewItems;
    nodeCount: number;
};

export function listRemoteCanvasProjectsPage(options: { page: number; pageSize: number; projectId?: string; query?: string; sort?: string; assetsOnly?: boolean; signal?: AbortSignal }) {
    return request<{ projects: CanvasLibrarySummary[]; page: number; pageSize: number; total: number; hasMore: boolean }>(
        api.get("/canvas-projects", {
            signal: options.signal,
            params: compactApiParams({ page: options.page, page_size: options.pageSize, project_id: options.projectId, q: options.query, sort: options.sort, assets_only: options.assetsOnly ? 1 : undefined }),
        }),
    );
}

export function getRemoteUserDataSnapshot(signal?: AbortSignal) {
    return request<RemoteUserDataSnapshot>(api.get("/user-data/snapshot", { signal }));
}

export function listRemoteAssetsPage(options: { page: number; pageSize: number; kind?: string; category?: string; folderId?: string; archiveCanvasId?: string; unfiled?: boolean; section?: AssetSection; review?: "pending"; uncategorized?: boolean; status?: string; query?: string; signal?: AbortSignal }) {
    return request<RemoteAssetPage>(
        api.get("/assets", {
            signal: options.signal,
            params: compactApiParams({
                page: options.page,
                page_size: options.pageSize,
                kind: options.kind,
                category: options.category,
                folder_id: options.folderId,
                archive_canvas_id: options.archiveCanvasId,
                unfiled: options.unfiled ? 1 : undefined,
                section: options.section,
                review: options.review,
                uncategorized: options.uncategorized ? 1 : undefined,
                status: options.status,
                q: options.query,
            }),
        }),
    );
}

export function getRemoteAsset(id: string) {
    return request<{ asset: Asset }>(api.get(`/assets/${encodeURIComponent(id)}`));
}

export function getRemoteAssetsByIds(ids: string[], signal?: AbortSignal) {
    return request<{ assets: Asset[] }>(api.post("/assets/batch", { ids }, { signal }));
}

export function upsertRemoteAsset(asset: Asset) {
    return request<{ asset?: Asset | RemoteUserDataSummary }>(api.put(`/assets/${encodeURIComponent(asset.id)}`, { asset }));
}

/** 单次批量写入上限，与后端 MaxAssetBatchUpsert 一致。 */
export const REMOTE_ASSET_BATCH_SIZE = 50;

/** 批量写入素材；整批只占一次素材写入频控。旧后端没有该接口时返回 404/405，由调用方回退逐条写入。 */
export function upsertRemoteAssets(assets: Asset[]) {
    return request<{ assets: (Asset | RemoteUserDataSummary)[] }>(api.put("/assets", { assets }));
}

export function deleteRemoteAsset(id: string) {
    return request<{ id: string }>(api.delete(`/assets/${encodeURIComponent(id)}`));
}

// knownProject 是客户端已核对过的云端版本：带上 If-None-Match，版本未变时服务端返回 304，直接复用它。
export async function getRemoteCanvasProject(id: string, knownProject?: CanvasProject): Promise<{ project: CanvasProject; notModified: boolean }> {
    const url = `/canvas-projects/${encodeURIComponent(id)}`;
    if (!knownProject || knownProject.id !== id || !Number.isSafeInteger(knownProject.revision)) {
        return { ...(await request<{ project: CanvasProject }>(api.get(url))), notModified: false };
    }
    const result = await request<{ project: CanvasProject } | { notModified: true }>(
        api.get(url, {
            headers: { "If-None-Match": `"canvas-${knownProject.revision}"` },
            validateStatus: (status) => (status >= 200 && status < 300) || status === 304,
        }),
        { allowNotModified: true },
    );
    return "notModified" in result ? { project: knownProject, notModified: true } : { ...result, notModified: false };
}

// A large canvas is mostly repeated JSON keys (~7x smaller gzipped); uplinks abroad are slow.
const GZIP_CANVAS_MIN_CHARS = 64 * 1024;
let gzipCanvasUploads = typeof CompressionStream === "function";

async function gzipJSONBody(body: unknown) {
    const text = JSON.stringify(body);
    if (text.length < GZIP_CANVAS_MIN_CHARS) return undefined;
    const stream = new Blob([text], { type: "application/json" }).stream().pipeThrough(new CompressionStream("gzip"));
    return new Blob([await new Response(stream).arrayBuffer()], { type: "application/json" });
}

export async function upsertRemoteCanvasProject(project: CanvasProject, options?: { repairMissingResources?: boolean }) {
    assertCanvasEditsReady(project.id);
    const { viewport: _viewport, remoteContentHash: _hash, coverSnapshot: _legacyCover, ...content } = project;
    const url = `/canvas-projects/${encodeURIComponent(project.id)}`;
    const body = { project: { ...content, editProofs: canvasEditProofs(project.id) }, ...(options?.repairMissingResources ? { repairMissingResources: true } : {}) };
    const compressed = gzipCanvasUploads ? await gzipJSONBody(body).catch(() => undefined) : undefined;
    assertCanvasEditsReady(project.id);
    if (compressed) {
        try {
            return await request<{ project: RemoteUserDataSummary & { revision: number } }>(api.put(url, compressed, { headers: { "Content-Type": "application/json", "Content-Encoding": "gzip" } }));
        } catch (error) {
            // A backend without compressed-body support answers 415 (or 400 before it learned the header): resend as plain JSON.
            if (!(error instanceof ApiError) || (error.status !== 415 && error.status !== 400)) throw error;
            const result = await request<{ project: RemoteUserDataSummary & { revision: number } }>(api.put(url, body));
            gzipCanvasUploads = false;
            return result;
        }
    }
    return request<{ project: RemoteUserDataSummary & { revision: number } }>(api.put(url, body));
}

export function deleteRemoteCanvasProject(id: string) {
    return request<{ id: string } & CanvasDeletePreflightResponse>(api.delete(`/canvas-projects/${encodeURIComponent(id)}`, { data: { editProofs: canvasEditProofs(id) } }));
}

export function moveRemoteAssets(input: AssetArchiveMoveRequest) {
    return request<AssetArchiveMoveResponse>(api.patch("/assets/folder", input));
}

export type AssetCategoryRequest = { items: { assetId: string; category: AssetArchiveCategory; expectedClassification: AssetClassificationFields }[] };
export type AssetCategoryResponse = { results: ({ assetId: string; outcome: "success" | "conflict"; asset: Asset } | { assetId: string; outcome: "failed"; reason: string })[]; successCount: number; conflictCount: number; failedCount: number };
export function classifyRemoteAssets(input: AssetCategoryRequest) {
    return request<AssetCategoryResponse>(api.patch("/assets/category", input));
}

export function previewRemoteAssetArchive(signal?: AbortSignal) {
    return request<AssetArchivePreviewResponse>(api.post("/assets/archive/preview", {}, { signal }));
}

export function commitRemoteAssetArchive(input: AssetArchiveCommitRequest) {
    return request<AssetArchiveMoveResponse>(api.post("/assets/archive/commit", input));
}

export function preflightRemoteCanvasDelete(input: CanvasDeletePreflightRequest, signal?: AbortSignal) {
    return request<CanvasDeletePreflightResponse>(api.post("/canvas-projects/delete-preflight", input, { signal }));
}

export type CanvasHistoryEntry = {
    id: string;
    canvasId: string;
    revision: number;
    title: string;
    nodeCount: number;
    connectionCount: number;
    payloadBytes: number;
    reason: "automatic" | "before_restore";
    createdAt: string;
    contentUpdatedAt: string;
};

export function listCanvasHistory(id: string, signal?: AbortSignal) {
    return request<{ snapshots: CanvasHistoryEntry[]; currentRevision: number }>(api.get(`/canvas-projects/${encodeURIComponent(id)}/history`, { signal }));
}

export function getCanvasHistoryEntry(id: string, snapshotId: string, signal?: AbortSignal) {
    return request<{ snapshot: CanvasHistoryEntry; project: CanvasProject }>(api.get(`/canvas-projects/${encodeURIComponent(id)}/history/${encodeURIComponent(snapshotId)}`, { signal }));
}

export function restoreRemoteCanvasHistory(id: string, snapshotId: string, revision: number) {
    return request<{ project: RemoteUserDataSummary & { revision: number } }>(api.post(`/canvas-projects/${encodeURIComponent(id)}/history/${encodeURIComponent(snapshotId)}/restore`, { revision }));
}
