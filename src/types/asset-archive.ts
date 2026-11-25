import type { CanvasFolderStyle, CanvasFolderTheme } from "./canvas";

export const ASSET_ARCHIVE_BATCH_MAX = 200;
export const ASSET_ARCHIVE_PROTECTED_FIELDS = ["archiveCanvasId", "folderId", "originCanvasId", "category", "categorySource"] as const;
// Frozen wire values; runtime category parsers are extended by T4 before rollout.
export const ASSET_ARCHIVE_CATEGORIES = ["character", "environment", "prop", "material", "other", "shot", "wardrobe", "weapon", "style"] as const;
export type AssetArchiveCategory = typeof ASSET_ARCHIVE_CATEGORIES[number];
export const ASSET_CATEGORY_SOURCES = ["context", "ai", "ai_pending", "user"] as const;
export type AssetCategorySource = typeof ASSET_CATEGORY_SOURCES[number];
export const ASSET_SECTIONS = ["all", "character", "environment", "prop", "shot", "audio", "other"] as const;
export type AssetSection = typeof ASSET_SECTIONS[number];
// Pending is a review filter within all, not an eighth section or a stored category.
export type AssetSectionResult = Exclude<AssetSection, "all"> | "pending";
export type AssetClassificationFields = { category?: AssetArchiveCategory | null; categorySource?: AssetCategorySource | null };
export type AssetClassificationSuggestion = {
    category: AssetArchiveCategory;
    categorySource: Exclude<AssetCategorySource, "user">;
    confidence?: number; // AI only, finite 0..1; high confidence >= 0.85.
};

export function sectionOf(asset: AssetClassificationFields & { kind?: string | null }): AssetSectionResult {
    if (asset.categorySource === "ai_pending") return "pending";
    if (asset.kind === "audio") return "audio";
    if (asset.kind === "video" && asset.categorySource !== "user") return "shot";
    switch (asset.category) {
        case "character": return "character";
        case "environment": return "environment";
        case "prop": case "wardrobe": case "weapon": return "prop";
        case "shot": return "shot";
        case "material": return "pending";
        default: return "other";
    }
}
export const ASSET_SOURCE_CODES = [
    "unknown", "manual", "canvas-manual", "canvas-upload", "canvas-generation",
    "generation-task", "create-page", "create-upload", "short-drama-workflow",
    "short-drama-chapter-storyboard", "art-critique", "cloud-agent", "tasks-page",
    "eagle-import", "external-import", "editor-upload", "project-upload", "deleted-canvas",
] as const;
export type AssetSourceCode = typeof ASSET_SOURCE_CODES[number];

export type AssetPrimaryLocation =
    | { kind: "canvas"; canvasId: string }
    | { kind: "folder"; folderId: string }
    | { kind: "unfiled" };
export type AssetArchiveFields = AssetClassificationFields & {
    archiveCanvasId?: string | null;
    folderId?: string | null;
    originCanvasId?: string | null;
    sourceCode?: AssetSourceCode;
};
export type AssetArchiveRecord = AssetArchiveFields & { id: string; status?: string; [key: string]: unknown };

// Only explicit covers are persisted; the read model may describe auto mode.
export type FolderCover =
    | { mode: "upload"; storageKey: string; assetId?: string }
    | { mode: "asset"; assetId: string };
export type FolderPresentation = { style: CanvasFolderStyle; theme?: CanvasFolderTheme; source?: "manual"; cover?: FolderCover };
export type FolderPresentationView = Omit<FolderPresentation, "cover"> & { cover: FolderCover | { mode: "auto" } };
// Summary-only thumbnails; never original media. durationMs is video-only.
export type FolderPreviewItem = { assetId: string; thumbnailUrl: string; count?: number } & (
    | { kind: "image"; durationMs?: never }
    | { kind: "video"; durationMs?: number }
);
export type FolderPreviewItems = [] | [FolderPreviewItem] | [FolderPreviewItem, FolderPreviewItem] | [FolderPreviewItem, FolderPreviewItem, FolderPreviewItem];
export type FolderContentPreview = { previewItems: FolderPreviewItems };
export const DEFAULT_FOLDER_STYLE: CanvasFolderStyle = "glass-dark";
export const DEFAULT_FOLDER_THEME: CanvasFolderTheme = "aurora";

export type AssetIngestContext = {
    canvasId?: string;
    domainProjectId?: string;
    target?: AssetPrimaryLocation;
    sourceCode: AssetSourceCode;
    taskId?: string;
    nodeId?: string;
};

export const ASSET_ARCHIVE_ERROR_REASONS = [
    "invalid-location", "dual-primary-location", "invalid-batch", "duplicate-asset",
    "expected-location-required", "asset-not-found", "target-not-found", "target-forbidden",
    "location-conflict", "evidence-changed", "asset-archived", "offline",
    "sync-required", "media-unavailable", "media-registration-failed", "storage-failed", "internal-error",
    "invalid-category", "classification-conflict",
] as const;
export type AssetArchiveErrorReason = typeof ASSET_ARCHIVE_ERROR_REASONS[number];
export const ASSET_ARCHIVE_SUCCESS_REASONS = ["moved", "already-at-target", "target-missing-unfiled"] as const;
export type AssetArchiveSuccessReason = typeof ASSET_ARCHIVE_SUCCESS_REASONS[number];
export const ASSET_ARCHIVE_RETAIN_REASONS = [
    "existing-location", "recycle-bin", "conflicting-evidence", "target-missing",
    "target-forbidden", "multiple-references", "no-evidence",
] as const;
export type AssetArchiveRetainReason = typeof ASSET_ARCHIVE_RETAIN_REASONS[number];
export const ASSET_ARCHIVE_EVIDENCE = ["metadata-canvas", "task-context", "production-task-link", "unique-reference"] as const;
export type AssetArchiveEvidence = typeof ASSET_ARCHIVE_EVIDENCE[number];

// assetIds must be distinct, 1..200, with exactly one expectedLocations entry per ID.
export type AssetArchiveMoveRequest = {
    assetIds: string[];
    target: AssetPrimaryLocation;
    expectedLocations: Record<string, AssetPrimaryLocation>;
};
export type AssetArchiveItemResult<T extends AssetArchiveRecord = AssetArchiveRecord> =
    | { assetId: string; outcome: "success"; reason: AssetArchiveSuccessReason; asset: T }
    | { assetId: string; outcome: "conflict"; reason: "location-conflict" | "evidence-changed"; asset: T }
    | { assetId: string; outcome: "failed"; reason: AssetArchiveErrorReason };
// This is envelope.data; item failures do not make the accepted batch an HTTP failure.
export type AssetArchiveMoveResponse<T extends AssetArchiveRecord = AssetArchiveRecord> = {
    results: AssetArchiveItemResult<T>[];
    successCount: number;
    conflictCount: number;
    failedCount: number;
};
export type AssetArchiveError = { reason: AssetArchiveErrorReason };

export type CanvasDeletePreflightRequest = { canvasIds: string[] };
export type CanvasDeletePreflightResponse = {
    archivedAssetCount: number;
    unregisteredMediaCount: number;
    toUnfiledCount: number;
    blocked: { canvasId: string; nodeId: string; reason: "media-unavailable" | "media-registration-failed" }[];
};
export type AssetArchiveCandidate = {
    assetId: string;
    tier: "trusted" | "suggested";
    target: Extract<AssetPrimaryLocation, { kind: "canvas" }>;
    expectedLocation: AssetPrimaryLocation;
    evidence: AssetArchiveEvidence[];
    classification?: AssetClassificationSuggestion;
};
export type AssetArchivePreviewItem = AssetArchiveCandidate | {
    assetId: string; tier: "retained"; reason: AssetArchiveRetainReason; classification?: AssetClassificationSuggestion;
};
export type AssetArchivePreviewRequest = Record<string, never>;
export type AssetArchivePreviewResponse = {
    items: AssetArchivePreviewItem[];
    scannedCount: number;
    trustedCount: number;
    suggestedCount: number;
    retainedCount: number;
    suspectedDeletedCanvasCount: number;
    nearingExpiryCount: number;
};
// Only explicitly confirmed candidates, 1..200; service revalidates evidence.
// Suggested candidates never populate originCanvasId; trusted may only fill an empty origin.
export type AssetArchiveCommitRequest = { items: AssetArchiveCandidate[] };
export type AssetArchiveCommitResponse<T extends AssetArchiveRecord = AssetArchiveRecord> = AssetArchiveMoveResponse<T>;

export function isValidPrimaryLocation(location: AssetPrimaryLocation): boolean {
    if (!location || typeof location !== "object") return false;
    const value = location as { kind: string; canvasId?: string; folderId?: string };
    if (value.kind === "canvas") return typeof value.canvasId === "string" && value.canvasId.length > 0 && !value.folderId;
    if (value.kind === "folder") return typeof value.folderId === "string" && value.folderId.length > 0 && !value.canvasId;
    return value.kind === "unfiled" && !value.canvasId && !value.folderId;
}

// Structural validation only; permission, target lookup and conditional update belong to the caller.
export function validateAssetArchiveMoveRequest(request: AssetArchiveMoveRequest): AssetArchiveErrorReason | undefined {
    if (request.assetIds.length < 1 || request.assetIds.length > ASSET_ARCHIVE_BATCH_MAX || request.assetIds.some(id => !id)) return "invalid-batch";
    if (new Set(request.assetIds).size !== request.assetIds.length) return "duplicate-asset";
    if (!isValidPrimaryLocation(request.target)) return "invalid-location";
    if (Object.keys(request.expectedLocations).length !== request.assetIds.length || request.assetIds.some(id => !Object.hasOwn(request.expectedLocations, id))) return "expected-location-required";
    if (request.assetIds.some(id => !isValidPrimaryLocation(request.expectedLocations[id]))) return "invalid-location";
    return undefined;
}

export function validateAssetArchiveCommitRequest(request: AssetArchiveCommitRequest): AssetArchiveErrorReason | undefined {
    const moveReason = validateAssetArchiveMoveRequest({
        assetIds: request.items.map(item => item.assetId),
        target: { kind: "unfiled" },
        expectedLocations: Object.fromEntries(request.items.map(item => [item.assetId, item.expectedLocation])),
    });
    if (moveReason) return moveReason;
    for (const item of request.items) {
        if (!isValidPrimaryLocation(item.target) || item.target.kind !== "canvas") return "invalid-location";
        const trustedEvidence = ASSET_ARCHIVE_EVIDENCE.slice(0, 3);
        if (!item.evidence.length || (item.tier !== "trusted" && item.tier !== "suggested")) return "evidence-changed";
        if (item.tier === "trusted" && item.evidence.some(value => !trustedEvidence.includes(value))) return "evidence-changed";
        if (item.tier === "suggested" && (item.evidence.length !== 1 || item.evidence[0] !== "unique-reference")) return "evidence-changed";
    }
    return undefined;
}

export function isValidFolderCover(cover?: FolderCover): boolean {
    if (!cover) return true;
    if (cover.mode === "upload") return typeof cover.storageKey === "string" && cover.storageKey.length > 0;
    return cover.mode === "asset" && typeof cover.assetId === "string" && cover.assetId.length > 0 && !(cover as { storageKey?: string }).storageKey;
}

export type ResolvePrimaryLocationResult =
    | { location: AssetPrimaryLocation }
    | { reason: "dual-primary-location" };

// IDs are opaque. Missing, null and empty string are empty; this performs no ownership lookup.
export function resolvePrimaryLocation(input: Pick<AssetArchiveFields, "archiveCanvasId" | "folderId">): ResolvePrimaryLocationResult {
    if (input.archiveCanvasId && input.folderId) return { reason: "dual-primary-location" };
    if (input.archiveCanvasId) return { location: { kind: "canvas", canvasId: input.archiveCanvasId } };
    if (input.folderId) return { location: { kind: "folder", folderId: input.folderId } };
    return { location: { kind: "unfiled" } };
}

// Shallow ordinary-content merge; protected keys retain their exact stored presence/value.
export function mergeProtectedFields(existing: Record<string, unknown>, incoming: Record<string, unknown>): Record<string, unknown> {
    const merged = { ...existing, ...incoming };
    for (const key of ASSET_ARCHIVE_PROTECTED_FIELDS) {
        if (Object.hasOwn(existing, key)) merged[key] = existing[key];
        else delete merged[key];
    }
    return merged;
}

export function isUnfiled(asset: Pick<AssetArchiveFields, "archiveCanvasId" | "folderId"> & { status?: string | null }): boolean {
    return !asset.archiveCanvasId && !asset.folderId && asset.status !== "archived";
}
