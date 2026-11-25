import React, { startTransition, useState, useMemo, useEffect, useRef, useCallback } from "react";
import { App, Button, Modal } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { useNavigate } from "react-router";

import { useAssetStore, flushAssetStorePersistence, type Asset, type AssetCategory, type AssetKind } from "@/stores/use-asset-store";
import { useCanvasStore, type CanvasProject } from "@/stores/canvas/use-canvas-store";
import { useUserStore } from "@/stores/use-user-store";
import {
    classifyAssets,
    moveAssets,
    primaryLocationOf,
    resolveAssetIngest,
    localCanvasLibrarySummaries,
    previewAssetArchive,
    previewLocalAssetArchive,
} from "@/services/asset-archive";
import type { AssetSection } from "@/types/asset-archive";
import { ASSET_ARCHIVE_BATCH_MAX, ASSET_SECTIONS, sectionOf } from "@/types/asset-archive";
import {
    translateArchiveError,
    translateArchiveErrorAction,
} from "@/i18n/asset-archive-messages";
import { deleteAssetWithRemoteSync, loadCanvasProjectForEditing, saveRemoteUserDataNow } from "@/services/user-data-sync";
import { uploadLibraryAsset } from "@/services/library-upload";
import { visibleAssetLibraryRecords } from "@/lib/asset-remote-sync";
import { creationCanvasHandoffPath } from "@/lib/canvas/canvas-asset-handoff";
import { formatCardRelativeTime } from "@/lib/relative-time";

import { useDetailI18n } from "./folder-detail-i18n";
import { FolderDetailHero } from "./folder-detail-hero";
import { FolderDetailTabs } from "./folder-detail-tabs";
import { FolderDetailCard, type LibraryAsset } from "./folder-detail-card";
import { loadAssetDetailPages, waitForAssetDetailIdle } from "./asset-detail-loading";
import { FolderDetailDock } from "./folder-detail-dock";
import {
    FolderDetailEmpty,
    FolderDetailSkeletonGrid,
    FolderDetailErrorRecovery,
} from "./folder-detail-empty";
import { AssetMoveModal } from "./asset-move-modal";
import { AssetArchiveWizardModal } from "./asset-archive-wizard-modal";
import { AssetViewerLightbox } from "./asset-viewer-lightbox";

import "./folder-detail.css";

export type { LibraryAsset };

export type AssetFolderDetailProps = {
    mode: "folder" | "unfiled" | "trash";
    folderId?: string; // canvasId when mode === 'folder'
    onBack: () => void;
    onOpenCanvas?: (canvasId: string) => void;
    onOpenRecycleBin?: () => void;
};

export function AssetFolderDetail({
    mode,
    folderId,
    onBack,
    onOpenCanvas,
    onOpenRecycleBin,
}: AssetFolderDetailProps) {
    const { t, dt, number, locale } = useDetailI18n();
    const { message } = App.useApp();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const userId = useUserStore(state => state.user?.id);
    const assetsHydrated = useAssetStore(state => state.hydrated);
    const remoteAssets = useQuery({
        queryKey: ["asset-library", "detail", userId, mode, folderId],
        queryFn: ({ signal }) => loadAssetDetailPages({ signal,
            archiveCanvasId: mode === "folder" ? folderId : undefined,
            unfiled: mode === "unfiled", status: mode === "trash" ? "archived" : "active" }),
        enabled: Boolean(userId && assetsHydrated && (mode !== "folder" || folderId)),
        staleTime: 5 * 60_000,
    });

    const assetRecords = useAssetStore((state) => state.assets);
    const unavailableImageIds = useAssetStore((state) => state.unavailableImageIds);
    const assets = useMemo(() => visibleAssetLibraryRecords(assetRecords, unavailableImageIds), [assetRecords, unavailableImageIds]);
    const addAsset = useAssetStore((state) => state.addAsset);
    const removeAsset = deleteAssetWithRemoteSync;
    const projects = useCanvasStore((state) => state.projects);
    const renameProject = useCanvasStore((state) => state.renameProject);

    const uploadInputRef = useRef<HTMLInputElement>(null);

    // Filter states
    const [currentSection, setCurrentSection] = useState<AssetSection | "pending">("all");
    const [kindFilter, setKindFilter] = useState<AssetKind | "all">("all");
    const [keyword, setKeyword] = useState("");

    // Selection states
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
    const [isSelectMode, setIsSelectMode] = useState(false);

    // Modal & Viewer states
    const [moveModalOpen, setMoveModalOpen] = useState(false);
    const [wizardOpen, setWizardOpen] = useState(false);
    const [viewerIndex, setViewerIndex] = useState<number | null>(null);
    const [activeErrorReason, setActiveErrorReason] = useState<string | null>(null);

    // Current Project resolution (folder mode)
    const currentProject = useMemo(() => {
        if (mode !== "folder" || !folderId) return null;
        return projects.find((p) => p.id === folderId) || null;
    }, [mode, folderId, projects]);

    useEffect(() => {
        if (mode === "folder" && folderId && !projects.some((p) => p.id === folderId)) {
            void loadCanvasProjectForEditing(folderId).catch(() => undefined);
        }
    }, [mode, folderId, projects]);

    // Cover URL for ambient glow hero (folder cover or first asset, saturated and vivid)
    const coverUrl = useMemo(() => {
        if (mode === "folder" && folderId) {
            const summaries = localCanvasLibrarySummaries(projects, assets);
            const currentSummary = summaries.find((s) => s.id === folderId);
            if (currentSummary?.coverUrl) return currentSummary.coverUrl;

            // Fallback: first confirmed image asset in folder
            const firstImg = assets.find(
                (a) => a.archiveCanvasId === folderId && a.kind === "image" && a.status !== "archived" && a.coverUrl,
            );
            return firstImg?.coverUrl;
        }
        if (mode === "unfiled") {
            const firstImg = assets.find(
                (a) => !a.archiveCanvasId && !a.folderId && a.kind === "image" && a.status !== "archived" && a.coverUrl,
            );
            return firstImg?.coverUrl;
        }
        if (mode === "trash") {
            const firstImg = assets.find((a) => a.status === "archived" && a.kind === "image" && a.coverUrl);
            return firstImg?.coverUrl;
        }
        return undefined;
    }, [mode, folderId, projects, assets]);

    // Title editing commit
    const handleCommitRename = async (nextTitle: string) => {
        if (!folderId || !nextTitle.trim() || nextTitle.trim() === currentProject?.title) return;
        try {
            await loadCanvasProjectForEditing(folderId);
            renameProject(folderId, nextTitle.trim());
            await saveRemoteUserDataNow();
            void queryClient.invalidateQueries({ queryKey: ["canvas-library"] });
            message.success(t("common.save"));
        } catch (error) {
            const reason = (error as { reason?: string })?.reason || (error instanceof Error ? error.message : undefined);
            setActiveErrorReason(typeof reason === "string" ? reason : "generic");
            message.error(error instanceof Error ? error.message : t("canvasCard.renameFailed"));
        }
    };

    // Filter non-entity assets for current mode
    const modeAssets = useMemo(() => {
        const nonEntities = assets.filter((a): a is LibraryAsset => a.kind !== "entity");
        if (mode === "trash") {
            return nonEntities.filter((a) => a.status === "archived");
        }
        if (mode === "unfiled") {
            return nonEntities.filter((a) => !a.archiveCanvasId && !a.folderId && a.status !== "archived");
        }
        // mode === 'folder'
        return nonEntities.filter((a) => a.archiveCanvasId === folderId && a.status !== "archived");
    }, [assets, mode, folderId]);

    // Legacy in-category assets (only displayed in unfiled mode as separate read-only grouping)
    const inCategoryAssets = useMemo(() => {
        if (mode !== "unfiled") return [];
        return assets.filter(
            (a): a is LibraryAsset =>
                a.kind !== "entity" && Boolean(a.folderId) && !a.archiveCanvasId && a.status !== "archived",
        );
    }, [assets, mode]);

    // Unified selectable assets to prevent export/move leaks (V5 fix)
    const allSelectableAssets = useMemo(() => {
        return [...modeAssets, ...inCategoryAssets];
    }, [modeAssets, inCategoryAssets]);

    // Section counts
    const sectionCounts = useMemo(() => {
        const counts: Record<string, number> = { all: modeAssets.length, pending: 0 };
        for (const s of ASSET_SECTIONS) counts[s] = 0;
        counts.all = modeAssets.length;
        for (const a of modeAssets) {
            const sec = sectionOf(a);
            if (sec === "pending") counts.pending = (counts.pending || 0) + 1;
            else counts[sec] = (counts[sec] || 0) + 1;
        }
        return counts;
    }, [modeAssets]);

    // Kind counts
    const kindCounts = useMemo(() => {
        const counts: Record<string, number> = { all: modeAssets.length, image: 0, video: 0, audio: 0, text: 0, model: 0 };
        for (const a of modeAssets) {
            counts[a.kind] = (counts[a.kind] || 0) + 1;
        }
        return counts;
    }, [modeAssets]);

    // Filtered assets
    const filteredAssets = useMemo(() => {
        const query = keyword.trim().toLowerCase();
        return modeAssets.filter((asset) => {
            // Section filter
            if (currentSection === "pending") {
                if (sectionOf(asset) !== "pending") return false;
            } else if (currentSection !== "all") {
                if (sectionOf(asset) !== currentSection) return false;
            }

            // Kind filter
            if (kindFilter !== "all" && asset.kind !== kindFilter) return false;

            // Search query
            if (query) {
                const text = [asset.title, ...(asset.tags || []), asset.source || ""].join(" ").toLowerCase();
                if (!text.includes(query)) return false;
            }

            return true;
        });
    }, [modeAssets, currentSection, kindFilter, keyword]);

    // Warm caches also contain the full library. Mount only the first screen
    // synchronously, then finish both grids without changing filtering/selection.
    const cardLocation = `${userId}:${mode}:${folderId ?? ""}`;
    const [cardWindow, setCardWindow] = useState({ location: cardLocation, limit: 24 });
    const cardLimit = cardWindow.location === cardLocation ? cardWindow.limit : 24;
    const cardTotal = Math.max(filteredAssets.length, inCategoryAssets.length);
    const viewerOpen = viewerIndex !== null;
    useEffect(() => {
        if (viewerOpen || cardLimit >= cardTotal) return;
        const controller = new AbortController();
        void waitForAssetDetailIdle(controller.signal).then(() => {
            startTransition(() => setCardWindow({ location: cardLocation, limit: cardLimit + 12 }));
        }, () => undefined);
        return () => controller.abort();
    }, [cardLocation, cardLimit, cardTotal, viewerOpen]);

    // Unfiled matchable count for smart archival wizard (queried via preview interface)
    const [previewMatchableCount, setPreviewMatchableCount] = useState<number>(0);

    useEffect(() => {
        if (mode !== "unfiled") {
            setPreviewMatchableCount(0);
            return;
        }

        // Fast local calculation as immediate optimistic count
        try {
            const local = previewLocalAssetArchive(assets, projects);
            setPreviewMatchableCount(local.trustedCount + local.suggestedCount);
        } catch {
            // ignore
        }

        let active = true;
        void previewAssetArchive()
            .then((res) => {
                if (active && res) {
                    setPreviewMatchableCount(res.trustedCount + res.suggestedCount);
                }
            })
            .catch(() => {
                // Keep local preview count
            });

        return () => {
            active = false;
        };
    }, [mode, assets, projects]);

    // Selection handlers (Desktop Shift Range & Single Toggle)
    const handleToggleSelect = useCallback((id: string) => {
        setSelectedIds((prev) => {
            const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
            if (next.length === 0) setIsSelectMode(false);
            return next;
        });
        setLastSelectedId(id);
    }, []);

    const handleShiftSelect = useCallback((asset: LibraryAsset) => {
        if (!lastSelectedId) {
            handleToggleSelect(asset.id);
            return;
        }
        const lastIdx = filteredAssets.findIndex((a) => a.id === lastSelectedId);
        const currIdx = filteredAssets.findIndex((a) => a.id === asset.id);
        if (lastIdx === -1 || currIdx === -1) {
            handleToggleSelect(asset.id);
            return;
        }
        const start = Math.min(lastIdx, currIdx);
        const end = Math.max(lastIdx, currIdx);
        const rangeIds = filteredAssets.slice(start, end + 1).map((a) => a.id);
        setSelectedIds((prev) => Array.from(new Set([...prev, ...rangeIds])));
        setLastSelectedId(asset.id);
    }, [lastSelectedId, filteredAssets, handleToggleSelect]);

    const handleClearSelection = () => {
        setSelectedIds([]);
        setLastSelectedId(null);
        setIsSelectMode(false);
    };

    // Mobile long-press enters multi-select mode
    const handleMobileLongPress = useCallback((id: string) => {
        setIsSelectMode(true);
        setSelectedIds((prev) => prev.includes(id) ? prev : [...prev, id]);
        setLastSelectedId(id);
    }, []);

    // Card click opens lightbox
    const handleCardClick = useCallback((asset: LibraryAsset, index: number) => {
        setViewerIndex(index);
    }, []);

    // Direct Upload to Folder or Unfiled
    const handleTriggerUpload = () => {
        uploadInputRef.current?.click();
    };

    const handleUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        const hideUploading = message.loading(t("assetPicker.uploading", { count: files.length }), 0);
        try {
            for (const file of files) {
                const newAsset = await uploadLibraryAsset(file);
                const ingested = resolveAssetIngest(newAsset, {
                    sourceCode: "manual",
                    target: mode === "folder" && folderId ? { kind: "canvas", canvasId: folderId } : { kind: "unfiled" },
                });
                await addAsset(ingested);
            }
            await flushAssetStorePersistence();
            if (userId) void saveRemoteUserDataNow().then(() => queryClient.invalidateQueries({ queryKey: ["canvas-library"] })).catch(error => message.error(error instanceof Error ? error.message : t("archiveError.generic")));
            message.success(t("assets.imported", { count: files.length }));
        } catch (error) {
            message.error(error instanceof Error ? error.message : t("archiveError.generic"));
        } finally {
            hideUploading();
            if (e.target) e.target.value = "";
        }
    };

    // "用到画布" / Use in Canvas Command
    const handleUseInCanvas = () => {
        if (!selectedIds.length) return;
        if (mode === "folder" && folderId) {
            const params = new URLSearchParams({ mode: "handoff" });
            selectedIds.forEach((id) => params.append("asset", id));
            navigate(`/canvas/${folderId}?${params.toString()}`);
        } else {
            const handoff = creationCanvasHandoffPath(selectedIds);
            if (handoff) navigate(handoff);
            else navigate("/canvas");
        }
    };

    // Batch Move to Unfiled with >200 batching and real outcome reporting (V5 fix)
    const handleMoveOutToUnfiled = async () => {
        if (!selectedIds.length) return;
        try {
            const expectedLocations: Record<string, ReturnType<typeof primaryLocationOf>> = {};
            for (const id of selectedIds) {
                const asset = allSelectableAssets.find((a) => a.id === id);
                if (asset) expectedLocations[id] = primaryLocationOf(asset);
            }

            const aggregated = {
                results: [] as Awaited<ReturnType<typeof moveAssets>>["results"],
                successCount: 0,
                conflictCount: 0,
                failedCount: 0,
            };

            for (let i = 0; i < selectedIds.length; i += ASSET_ARCHIVE_BATCH_MAX) {
                const chunkIds = selectedIds.slice(i, i + ASSET_ARCHIVE_BATCH_MAX);
                const chunkExpected: Record<string, ReturnType<typeof primaryLocationOf>> = {};
                for (const id of chunkIds) {
                    if (expectedLocations[id]) chunkExpected[id] = expectedLocations[id];
                }
                const res = await moveAssets({
                    assetIds: chunkIds,
                    target: { kind: "unfiled" },
                    expectedLocations: chunkExpected,
                });
                aggregated.results.push(...res.results);
                aggregated.successCount += res.successCount;
                aggregated.conflictCount += res.conflictCount;
                aggregated.failedCount += res.failedCount;
            }

            const successfulIds = new Set(
                aggregated.results.filter((r) => r.outcome === "success").map((r) => r.assetId),
            );
            setSelectedIds((prev) => prev.filter((id) => !successfulIds.has(id)));

            if (aggregated.conflictCount === aggregated.results.length) {
                message.warning(t("assetMove.allConflict"));
            } else if (aggregated.conflictCount > 0 || aggregated.failedCount > 0) {
                message.info(
                    t("assetMove.partialSuccess", {
                        success: number(aggregated.successCount),
                        conflict: number(aggregated.conflictCount),
                        failed: number(aggregated.failedCount),
                    }),
                );
            } else {
                message.success(t("assetMove.success", { count: number(aggregated.successCount) }));
            }
        } catch (error) {
            const reason = (error as { reason?: string })?.reason || (error instanceof Error ? error.message : undefined);
            setActiveErrorReason(typeof reason === "string" ? reason : "generic");
            const errText = translateArchiveError(reason, t);
            const actionText = translateArchiveErrorAction(reason, t);
            message.error(`${errText} (${actionText})`);
        }
    };

    // Single Delete with confirmation & error translation (V5 fix)
    const handleDeleteSingle = useCallback((asset: LibraryAsset) => {
        Modal.confirm({
            title: dt("assetDetail.singleDeleteConfirmTitle"),
            content: dt("assetDetail.singleDeleteConfirmContent", { name: asset.title || t("folderPreview.unnamed") }),
            okText: t("common.delete"),
            okButtonProps: { danger: true },
            cancelText: t("projectAssetFolder.cancel"),
            onOk: async () => {
                try {
                    await removeAsset(asset.id);
                    message.success(t("common.delete"));
                    setSelectedIds((prev) => prev.filter((id) => id !== asset.id));
                    setViewerIndex((index) => (index !== null && filteredAssets[index]?.id === asset.id ? null : index));
                } catch (error) {
                    const reason = (error as { reason?: string })?.reason || (error instanceof Error ? error.message : undefined);
                    setActiveErrorReason(typeof reason === "string" ? reason : "generic");
                    const errText = translateArchiveError(reason, t);
                    const actionText = translateArchiveErrorAction(reason, t);
                    message.error(`${errText} (${actionText})`);
                }
            },
        });
    }, [dt, t, message, removeAsset, filteredAssets]);

    const renderCard = useCallback((asset: LibraryAsset, index: number) => (
        <FolderDetailCard
            key={asset.id}
            asset={asset}
            index={index}
            selected={selectedIds.includes(asset.id)}
            isSelectMode={isSelectMode}
            onToggleSelect={() => handleToggleSelect(asset.id)}
            onShiftSelect={() => handleShiftSelect(asset)}
            onClick={() => handleCardClick(asset, index)}
            onLongPress={() => handleMobileLongPress(asset.id)}
            onMoveSingle={() => {
                setSelectedIds([asset.id]);
                setMoveModalOpen(true);
            }}
            onDeleteSingle={() => handleDeleteSingle(asset)}
        />
    ), [selectedIds, isSelectMode, handleToggleSelect, handleShiftSelect, handleCardClick, handleMobileLongPress, handleDeleteSingle]);
    // Query status and preview counters can reuse cards; later clock-label changes cannot.
    const relativeTimeKey = filteredAssets.slice(0, cardLimit).concat(inCategoryAssets.slice(0, cardLimit)).map(asset => formatCardRelativeTime(asset.updatedAt, locale)).join("\0");
    const assetCards = useMemo(() => filteredAssets.slice(0, cardLimit).map(renderCard), [filteredAssets, cardLimit, renderCard, relativeTimeKey]);
    const categoryCards = useMemo(() => inCategoryAssets.slice(0, cardLimit).map(renderCard), [inCategoryAssets, cardLimit, renderCard, relativeTimeKey]);

    // Batch Delete with confirmation, atomic try/catch, and accurate feedback (V5 fix)
    const handleBatchDelete = () => {
        if (!selectedIds.length) return;
        Modal.confirm({
            title: dt("assetDetail.batchDeleteConfirmTitle"),
            content: dt("assetDetail.batchDeleteConfirmContent", { count: selectedIds.length }),
            okText: t("common.delete"),
            okButtonProps: { danger: true },
            cancelText: t("projectAssetFolder.cancel"),
            onOk: async () => {
                const successfulIds: string[] = [];
                const failedIds: string[] = [];
                for (const id of selectedIds) {
                    try {
                        await removeAsset(id);
                        successfulIds.push(id);
                    } catch {
                        failedIds.push(id);
                    }
                }
                if (successfulIds.length > 0) {
                    setSelectedIds((prev) => prev.filter((id) => !successfulIds.includes(id)));
                }
                if (failedIds.length === 0) {
                    message.success(t("common.delete"));
                    setIsSelectMode(false);
                } else if (successfulIds.length > 0) {
                    message.warning(
                        t("assetMove.partialSuccess", {
                            success: number(successfulIds.length),
                            conflict: 0,
                            failed: number(failedIds.length),
                        }),
                    );
                } else {
                    message.error(t("archiveError.generic"));
                }
            },
        });
    };

    // Batch Export without leaking items (V5 fix)
    const handleBatchExport = async () => {
        const selectedRecords = allSelectableAssets.filter((a) => selectedIds.includes(a.id));
        if (!selectedRecords.length) return;
        try {
            const { exportAssets } = await import("./asset-transfer");
            await exportAssets(selectedRecords);
        } catch (error) {
            message.error(error instanceof Error ? error.message : t("canvasCard.exportFailed"));
        }
    };

    return (
        <div className="flex flex-col gap-4 py-2">
            {/* Hidden File Input for Direct Upload */}
            <input
                ref={uploadInputRef}
                type="file"
                multiple
                accept="image/*,video/*,audio/*"
                className="hidden"
                onChange={(e) => void handleUploadFiles(e)}
            />

            {/* Hero Ambient Glow Header (Design D) */}
            <FolderDetailHero
                mode={mode}
                folderId={folderId}
                project={currentProject}
                coverUrl={coverUrl}
                sectionCounts={sectionCounts}
                totalAssetsCount={modeAssets.length}
                selectedIds={selectedIds}
                onBack={onBack}
                onOpenCanvas={onOpenCanvas}
                onUpload={handleTriggerUpload}
                folderAssetIds={modeAssets.map(asset => asset.id)}
                onCommitRename={handleCommitRename}
            />

            {/* Error Recovery Banner if reason code active (Design G.3) */}
            {activeErrorReason ? (
                <FolderDetailErrorRecovery
                    reason={activeErrorReason}
                    onRetry={() => setActiveErrorReason(null)}
                    onRefresh={() => {
                        setActiveErrorReason(null);
                        void queryClient.invalidateQueries();
                    }}
                    onReturn={onBack}
                />
            ) : null}

            {/* Smart Archival Banner in Unfiled Mode: "{N} 个素材可以放回它们的画布 · 查看并整理" */}
            {mode === "unfiled" && previewMatchableCount > 0 ? (
                <div
                    data-testid="unfiled-organize-banner"
                    role="button"
                    tabIndex={0}
                    onClick={() => setWizardOpen(true)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setWizardOpen(true);
                        }
                    }}
                    className="group flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-primary/25 bg-primary/10 hover:bg-primary/15 px-4 py-3 transition-all backdrop-blur-md"
                >
                    <div className="flex items-center gap-2.5 min-w-0">
                        <Sparkles className="size-4 shrink-0 text-primary" />
                        <span className="text-xs sm:text-sm font-medium text-foreground truncate">
                            {dt("assetDetail.unfiledOrganizeBanner", { count: number(previewMatchableCount) })}
                        </span>
                    </div>
                    <Button
                        type="primary"
                        size="small"
                        onClick={(e) => {
                            e.stopPropagation();
                            setWizardOpen(true);
                        }}
                        className="shrink-0 font-medium text-xs shadow-sm"
                    >
                        {dt("assetDetail.unfiledOrganizeAction")}
                    </Button>
                </div>
            ) : null}

            {/* Sticky Section Tabs & Kind/Search Filter (Design D.4) */}
            <FolderDetailTabs
                currentSection={currentSection}
                onSectionChange={setCurrentSection}
                sectionCounts={sectionCounts}
                kindFilter={kindFilter}
                onKindChange={setKindFilter}
                kindCounts={kindCounts}
                keyword={keyword}
                onKeywordChange={setKeyword}
            />

            {remoteAssets.isPending && remoteAssets.isFetching && !modeAssets.length ? <FolderDetailSkeletonGrid /> : null}
            {remoteAssets.isError && userId ? (
                <div role="status" className="flex items-center gap-2 text-sm">
                    <span>{remoteAssets.error instanceof Error ? remoteAssets.error.message : t("archiveError.generic")}</span>
                    <Button loading={remoteAssets.isFetching} onClick={() => void remoteAssets.refetch()}>{t("common.retry")}</Button>
                </div>
            ) : null}
            {/* 3:4 Vertical Media Grid (Design D.5) or Empty States (Design G.1) */}
            {filteredAssets.length > 0 ? (
                <div
                    data-testid="folder-detail-asset-grid"
                    aria-busy={cardLimit < filteredAssets.length}
                    className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
                >
                    {assetCards}
                </div>
            ) : !remoteAssets.isFetching && !remoteAssets.isError ? (
                <FolderDetailEmpty
                    type={
                        keyword
                            ? "search"
                            : currentSection !== "all"
                            ? "section"
                            : mode === "unfiled"
                            ? "unfiled"
                            : "folder"
                    }
                    searchQuery={keyword}
                    section={currentSection}
                    onUpload={handleTriggerUpload}
                    onOpenCanvas={() => {
                        if (mode === "folder" && folderId && onOpenCanvas) onOpenCanvas(folderId);
                        else navigate("/canvas");
                    }}
                    onClearSearch={() => setKeyword("")}
                />
            ) : null}

            {/* Read-Only In-Category Assets Section (Unfiled mode only) */}
            {mode === "unfiled" && inCategoryAssets.length > 0 && !keyword && currentSection === "all" ? (
                <div className="mt-8 rounded-2xl border border-border bg-card p-5">
                    <div className="mb-3">
                        <h2 className="text-sm font-semibold text-foreground">
                            {t("assets.inCategoryTitle")} ({number(inCategoryAssets.length)})
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">{t("assets.inCategoryDesc")}</p>
                    </div>

                    <div aria-busy={cardLimit < inCategoryAssets.length} className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                        {categoryCards}
                    </div>
                </div>
            ) : null}

            {/* Batch Floating Action Bar (Design D.7) */}
            <FolderDetailDock
                mode={mode}
                selectedCount={selectedIds.length}
                onUseInCanvas={handleUseInCanvas}
                onOpenMoveModal={() => setMoveModalOpen(true)}
                onBatchExport={() => void handleBatchExport()}
                onMoveOutToUnfiled={mode === "folder" ? () => void handleMoveOutToUnfiled() : undefined}
                onBatchDelete={handleBatchDelete}
                onClearSelection={handleClearSelection}
            />

            {/* Fullscreen Cinema Lightbox (Viewer Component Integration) */}
            {viewerIndex !== null && (
                <AssetViewerLightbox
                    assets={filteredAssets}
                    index={viewerIndex}
                    folderCanvasId={mode === "folder" ? folderId : undefined}
                    onIndexChange={(newIndex) => setViewerIndex(newIndex)}
                    onClose={() => setViewerIndex(null)}
                    onMove={(asset) => {
                        setSelectedIds([asset.id]);
                        setMoveModalOpen(true);
                    }}
                    onDelete={(asset) => {
                        const target = filteredAssets.find((a) => a.id === asset.id);
                        if (target) handleDeleteSingle(target);
                    }}
                />
            )}

            {/* Batch Move Modal */}
            <AssetMoveModal
                open={moveModalOpen}
                assetIds={selectedIds}
                onClose={() => setMoveModalOpen(false)}
                onSuccess={() => {
                    setSelectedIds([]);
                    setIsSelectMode(false);
                }}
            />

            {/* Archival Wizard Modal */}
            <AssetArchiveWizardModal
                open={wizardOpen}
                onClose={() => setWizardOpen(false)}
                onSuccess={() => {
                    setSelectedIds([]);
                    setIsSelectMode(false);
                }}
                onOpenRecycleBin={onOpenRecycleBin}
            />
        </div>
    );
}

// Backwards-compatible export for external consumers or tests
export { FolderDetailCard as AssetCard3x4 };
