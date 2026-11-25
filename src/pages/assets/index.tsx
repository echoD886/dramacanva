import "@/styles/assets-route.css";
import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Dropdown, Input, Select, Drawer } from "antd";
import {
    FolderPlus,
    Upload,
    MoreHorizontal,
    Search,
    Inbox,
    Trash2,
    Folder,
    Plus,
    Package,
    Download,
    ExternalLink,
    CheckSquare,
    SlidersHorizontal,
    ArrowUpDown,
    Check,
} from "lucide-react";

import { useI18n } from "@/i18n/use-i18n";
import { useUserStore } from "@/stores/use-user-store";
import { useCanvasStore, flushCanvasStorePersistence } from "@/stores/canvas/use-canvas-store";
import { useAssetStore, flushAssetStorePersistence, type Asset } from "@/stores/use-asset-store";
import { useCanvasUiStore } from "@/stores/canvas/use-canvas-ui-store";
import { localCanvasLibrarySummaries, resolveAssetIngest } from "@/services/asset-archive";
import { type CanvasLibrarySummary } from "@/services/api/user-data";
import { assetHubFoldersQueryOptions, assetHubTotalsQueryOptions } from "@/lib/asset-hub-queries";
import { loadCanvasProjectForEditing, saveRemoteUserDataNow } from "@/services/user-data-sync";
import { creationCanvasHandoffPath } from "@/lib/canvas/canvas-asset-handoff";
import { ProjectFolderCard } from "@/components/canvas/project-folder-card";

import { getHubText, type HubMessageKey } from "@/components/canvas/project-folder-i18n";
import { AssetStorageUsage } from "./asset-storage-usage";
import { AssetFolderDetail, type LibraryAsset } from "./asset-folder-detail";
import { exportAssets, readAssetPackage } from "./asset-transfer";
import { uploadLibraryAsset } from "@/services/library-upload";
import { visibleAssetLibraryRecords } from "@/lib/asset-remote-sync";
import { cn } from "@/lib/utils";
import { DEFAULT_FOLDER_THEME } from "@/types/asset-archive";
import { AssetArchiveWizardModal } from "./asset-archive-wizard-modal";
import "./asset-hub.css";

type SortOption = "updated" | "name" | "assetCount";

const loadCreateDialog = () => import("@/components/canvas/canvas-folder-create-dialog");
const CanvasFolderCreateDialog = React.lazy(() => loadCreateDialog().then(module => ({ default: module.CanvasFolderCreateDialog })));

export default function AssetsPage() {
    const { t, locale, number } = useI18n();
    const { message } = App.useApp();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const user = useUserStore((state) => state.user);
    const canvasProjects = useCanvasStore((state) => state.projects);
    const renameProject = useCanvasStore((state) => state.renameProject);
    const setDeleteIds = useCanvasUiStore((state) => state.setDeleteProjectIds);

    const assetRecords = useAssetStore((state) => state.assets);
    const unavailableImageIds = useAssetStore((state) => state.unavailableImageIds);
    const assets = useMemo(() => visibleAssetLibraryRecords(assetRecords, unavailableImageIds), [assetRecords, unavailableImageIds]);
    const addAsset = useAssetStore((state) => state.addAsset);

    // Route params
    const folderId = searchParams.get("folder") || searchParams.get("folderId") || undefined;
    const view = searchParams.get("view"); // "unfiled" | "trash" | null

    const [keyword, setKeyword] = useState("");
    const [sort, setSort] = useState<SortOption>("updated");
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [batchMode, setBatchMode] = useState(false);
    const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);
    const [sortSheetOpen, setSortSheetOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const [archiveWizardOpen, setArchiveWizardOpen] = useState(false);
    useEffect(() => {
        setScrolled(false);
        const scroll = scrollRef.current;
        if (!scroll) return;
        // scrollTo also synchronously measures overflow. Let native layout
        // finish before resetting a newly mounted or replaced results pane.
        const observer = new ResizeObserver(() => {
            observer.disconnect();
            scroll.scrollTo({ top: 0 });
        });
        observer.observe(scroll);
        return () => observer.disconnect();
    }, [folderId, view]);

    const uploadInputRef = useRef<HTMLInputElement>(null);
    const packageInputRef = useRef<HTMLInputElement>(null);
    const loadMoreSentinelRef = useRef<HTMLDivElement>(null);

    // Non-entity assets
    const validAssets = useMemo(() => {
        return assets.filter((a): a is LibraryAsset => a.kind !== "entity");
    }, [assets]);

    // Unfiled and Recycle Bin counts
    const unfiledAssets = useMemo(() => {
        return validAssets.filter((a) => !a.archiveCanvasId && !a.folderId && a.status !== "archived");
    }, [validAssets]);

    const trashAssets = useMemo(() => {
        return validAssets.filter((a) => a.status === "archived");
    }, [validAssets]);

    // Compute library summaries (visitor or logged-in local)
    const localSummaries = useMemo(() => {
        return localCanvasLibrarySummaries(canvasProjects, assets, true);
    }, [canvasProjects, assets]);

    const queryClient = useQueryClient();
    const [debouncedKeyword, setDebouncedKeyword] = useState("");
    useEffect(() => {
        const timer = window.setTimeout(() => setDebouncedKeyword(keyword.trim()), 250);
        return () => window.clearTimeout(timer);
    }, [keyword]);

    // Remote query with infinite pagination if logged in
    const remoteQuery = useInfiniteQuery(assetHubFoldersQueryOptions(user?.id, sort, debouncedKeyword));

    const assetTotals = useQuery(assetHubTotalsQueryOptions(user?.id));
    const unfiledCount = assetTotals.data?.unfiled ?? unfiledAssets.length;
    const trashCount = assetTotals.data?.trash ?? trashAssets.length;

    const remoteProjects = useMemo(() => {
        return remoteQuery.data?.pages.flatMap((page) => page.projects) ?? [];
    }, [remoteQuery.data]);

    const projectSummaries: CanvasLibrarySummary[] = useMemo(() => {
        if (user?.id) {
            if (remoteProjects.length > 0 || remoteQuery.isSuccess) {
                const localById = new Map(localSummaries.map(project => [project.id, project]));
                return remoteProjects.map(project => {
                    const local = localById.get(project.id);
                    return project.previewItems?.length || !local?.previewItems?.length ? project : {
                        ...project, previewItems: local.previewItems,
                    };
                });
            }
        }
        return localSummaries;
    }, [user?.id, remoteProjects, remoteQuery.isSuccess, localSummaries]);

    // Filter projects by search keyword and sort
    const filteredProjects = useMemo(() => {
        let list = [...projectSummaries];
        const query = debouncedKeyword.toLowerCase();
        if (query) {
            list = list.filter((p) => p.title.toLowerCase().includes(query));
        }
        list.sort((a, b) => {
            if (sort === "name") {
                return a.title.localeCompare(b.title, locale);
            }
            if (sort === "assetCount") {
                return (b.archivedAssetCount ?? 0) - (a.archivedAssetCount ?? 0);
            }
            return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
        });
        return list;
    }, [projectSummaries, debouncedKeyword, sort, locale]);

    // IntersectionObserver for infinite scrolling
    useEffect(() => {
        const node = loadMoreSentinelRef.current;
        if (!node || !user?.id || !remoteQuery.hasNextPage) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry?.isIntersecting && !remoteQuery.isFetchingNextPage) {
                    void remoteQuery.fetchNextPage();
                }
            },
            { root: scrollRef.current, rootMargin: "400px" },
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, [user?.id, remoteQuery.hasNextPage, remoteQuery.isFetchingNextPage, remoteQuery.fetchNextPage, folderId, view]);

    // Handle Uploading file to Unfiled
    const handleUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        const hideUploading = message.loading(t("assetPicker.uploading", { count: files.length }), 0);
        try {
            for (const file of files) {
                const newAsset = await uploadLibraryAsset(file);
                addAsset(resolveAssetIngest(newAsset, { sourceCode: "manual", target: { kind: "unfiled" } }));
            }
            await flushAssetStorePersistence();
            setSearchParams({ view: "unfiled" });
            message.success(t("assets.imported", { count: number(files.length) }));
        } catch (error) {
            message.error(error instanceof Error ? error.message : t("archiveError.generic"));
        } finally {
            hideUploading();
            if (uploadInputRef.current) uploadInputRef.current.value = "";
        }
    };

    // Handle Importing Package
    const handleImportPackage = async (file?: File) => {
        if (!file) return;
        try {
            const imported = await readAssetPackage(file);
            for (const asset of imported) {
                addAsset(resolveAssetIngest(asset, { sourceCode: "external-import", target: { kind: "unfiled" } }));
            }
            setSearchParams({ view: "unfiled" });
            message.success(t("assets.imported", { count: number(imported.length) }));
        } catch (error) {
            message.error(error instanceof Error ? error.message : t("archiveError.generic"));
        } finally {
            if (packageInputRef.current) packageInputRef.current.value = "";
        }
    };

    // "用到画布" for unfiled assets: "新建画布并使用"
    const handleUnfiledHandoff = useCallback(
        (e?: React.MouseEvent) => {
            e?.stopPropagation();
            const unfiledIds = unfiledAssets.map((a) => a.id);
            if (unfiledIds.length > 0) {
                const handoffUrl = creationCanvasHandoffPath(unfiledIds.slice(0, 10));
                if (handoffUrl) {
                    navigate(handoffUrl);
                    return;
                }
            }
            setSearchParams({ view: "unfiled" });
        },
        [navigate, setSearchParams, unfiledAssets],
    );

    const handleEnterFolder = useCallback(
        (id: string) => setSearchParams({ folder: id }),
        [setSearchParams],
    );

    // Multi-select actions
    const toggleSelectFolder = (id: string, sel: boolean) => {
        setSelectedFolderIds((prev) => (sel ? [...new Set([...prev, id])] : prev.filter((item) => item !== id)));
    };

    const handleSelectAllOnPage = () => {
        if (selectedFolderIds.length === filteredProjects.length) {
            setSelectedFolderIds([]);
        } else {
            setSelectedFolderIds(filteredProjects.map((p) => p.id));
        }
    };

    const handleBatchExport = () => {
        const folderIdsSet = new Set(selectedFolderIds);
        const targetAssets = validAssets.filter((a) => a.archiveCanvasId && folderIdsSet.has(a.archiveCanvasId));
        void exportAssets(targetAssets);
    };

    const handleBatchDelete = () => {
        setDeleteIds(selectedFolderIds);
    };

    // If viewing folder detail, unfiled view, or trash view:
    if (folderId) {
        return (
            <div ref={scrollRef} className="assets-hub-scroll" onScroll={(event) => setScrolled(event.currentTarget.scrollTop > 40)}>
                <AssetFolderDetail
                    mode="folder"
                    folderId={folderId}
                    onBack={() => setSearchParams({})}
                    onOpenCanvas={(id) => navigate(`/canvas/${id}`)}
                />
            </div>
        );
    }

    if (view === "unfiled") {
        return (
            <div ref={scrollRef} className="assets-hub-scroll" onScroll={(event) => setScrolled(event.currentTarget.scrollTop > 40)}>
                <AssetFolderDetail
                    mode="unfiled"
                    onBack={() => setSearchParams({})}
                    onOpenRecycleBin={() => setSearchParams({ view: "trash" })}
                />
            </div>
        );
    }

    if (view === "trash") {
        return (
            <div ref={scrollRef} className="assets-hub-scroll" onScroll={(event) => setScrolled(event.currentTarget.scrollTop > 40)}>
                <AssetFolderDetail
                    mode="trash"
                    onBack={() => setSearchParams({})}
                />
            </div>
        );
    }

    // Top Right More Menu items
    const moreMenuItems = [
        {
            key: "archivePreview",
            icon: <Folder className="size-3.5" />,
            label: t("archiveWizard.title"),
            onClick: () => setArchiveWizardOpen(true),
        },
        {
            key: "importPackage",
            icon: <Package className="size-3.5" />,
            label: t("assets.importPackage"),
            onClick: () => packageInputRef.current?.click(),
        },
        {
            key: "exportAll",
            icon: <Download className="size-3.5" />,
            label: t("assets.exportAllAria"),
            onClick: () => void exportAssets(validAssets),
        },
        {
            key: "eagle",
            icon: <ExternalLink className="size-3.5" />,
            label: t("assets.eagleLibrary"),
            onClick: () => navigate("/plugins/eagle"),
        },
    ];

    const sortOptionsList: Array<{ value: SortOption; label: string }> = [
        { value: "updated", label: getHubText(locale, "assetHub.sort.updated") },
        { value: "name", label: getHubText(locale, "assetHub.sort.name") },
        { value: "assetCount", label: getHubText(locale, "assetHub.sort.assetCount") },
    ];

    // ==========================================================
    // MAIN ASSET HUB (Homepage with Apple-Style Project Folders)
    // ==========================================================

    return (
        <div ref={scrollRef} className="assets-hub-scroll assets-hub-with-create" onScroll={(event) => setScrolled(event.currentTarget.scrollTop > 40)}>
            {/* TopBar (Desktop Header with Summary & Actions) */}
            <header className="assets-hub-header">
                <div>
                    <div className="flex items-baseline gap-3">
                        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                            {t("projectAssetFolder.library")}
                        </h1>
                        <span className="text-xs text-muted-foreground tabular-nums">
                            {t("assets.hubSummary", {
                                projects: user?.id && !remoteQuery.data ? "—" : number(remoteQuery.data?.pages[0]?.total ?? projectSummaries.length),
                                assets: user?.id && !assetTotals.data ? "—" : number(assetTotals.data?.total ?? validAssets.filter(asset => asset.status !== "archived").length),
                            })}
                        </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{t("assets.hubSubtitle")}</p>
                    <p className="assets-local-library-hint">{getHubText(locale, "assetHub.localLibraryHint")}</p>
                </div>

                {/* Center / Right controls */}
                <div className="assets-hub-header-tools">
                    <div className="assets-hub-header-actions">
                        {/* Desktop Search Input */}
                        <div className="hidden sm:relative sm:block sm:w-60">
                            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder={t("assets.searchPlaceholder")}
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                allowClear
                                className="h-9 pl-8 text-xs"
                            />
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-2">
                            <Button
                                type="primary"
                                icon={<FolderPlus className="size-4" />}
                                className="assets-hub-create-desktop h-9"
                                onPointerEnter={() => void loadCreateDialog()}
                                onFocus={() => void loadCreateDialog()}
                                onClick={() => setCreateDialogOpen(true)}
                            >
                                {t("projectAssetFolder.createTitle")}
                            </Button>

                            <Button
                                className={cn("h-9", batchMode && "border-foreground bg-accent")}
                                icon={<CheckSquare className="size-4" />}
                                aria-pressed={batchMode}
                                onClick={() => {
                                    setBatchMode(!batchMode);
                                    if (batchMode) {
                                        setSelectedFolderIds([]);
                                    }
                                }}
                            >
                                <span className="hidden sm:inline">
                                    {batchMode ? getHubText(locale, "assetHub.batchDone") : getHubText(locale, "assetHub.batchManage")}
                                </span>
                            </Button>

                            <Button
                                icon={<Upload className="size-4" />}
                                className="h-9"
                                onClick={() => uploadInputRef.current?.click()}
                                title={t("assets.upload")}
                                aria-label={t("assets.upload")}
                            >
                                <span className="hidden sm:inline">{t("assets.upload")}</span>
                            </Button>

                            <Dropdown menu={{ items: moreMenuItems }} trigger={["click"]} placement="bottomRight">
                                <Button
                                    icon={<MoreHorizontal className="size-4" />}
                                    className="h-9"
                                    title={t("assets.moreActions")}
                                    aria-label={t("assets.moreActions")}
                                />
                            </Dropdown>
                        </div>
                    </div>

                    <AssetStorageUsage />
                </div>
            </header>

            {/* Sticky Search & Filter Bar (Mobile Only: Sticky at top) */}
            <div className="sticky top-0 z-20 -mx-4 mb-3 px-4 py-2 backdrop-blur-xl bg-background/85 border-b border-border/60 sm:hidden">
                {scrolled ? (
                    <div className="text-center font-semibold text-sm text-foreground pb-1.5 animate-in fade-in duration-200">
                        {getHubText(locale, "assetHub.compactTitle")}
                    </div>
                ) : null}
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder={t("assets.searchPlaceholder")}
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            allowClear
                            className="h-9 pl-8 text-xs"
                        />
                    </div>
                    {/* Mobile Sort Button */}
                    <Button
                        className="flex h-9 shrink-0 items-center justify-center px-3"
                        icon={<SlidersHorizontal className="size-4" />}
                        onClick={() => setSortSheetOpen(true)}
                        aria-label={getHubText(locale, "assetHub.sort.title")}
                    />
                </div>
            </div>

            {/* Hidden File Inputs */}
            <input
                ref={uploadInputRef}
                type="file"
                multiple
                accept="image/*,video/*,audio/*"
                className="hidden"
                onChange={(e) => void handleUploadFiles(e)}
            />
            <input
                ref={packageInputRef}
                type="file"
                accept=".zip,application/zip"
                className="hidden"
                onChange={(e) => void handleImportPackage(e.target.files?.[0])}
            />

            {/* System Fixed Entries Bar (Unfiled & Recycle Bin, Compact 48px capsules on mobile) */}
            <section className="my-3 grid grid-cols-2 gap-2 sm:my-6 sm:gap-4" aria-label="System Entries">
                {/* 1. Unfiled Card */}
                <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setSearchParams({ view: "unfiled" })}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") setSearchParams({ view: "unfiled" });
                    }}
                    className="group flex h-12 sm:h-[72px] cursor-pointer items-center justify-between rounded-xl sm:rounded-2xl border border-border/80 bg-card px-2.5 py-1.5 sm:p-4 transition-all hover:border-foreground/20 hover:shadow-xs focus-visible:ring-2 focus-visible:ring-foreground outline-none min-w-0"
                >
                    <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
                        <div className="flex size-7 sm:size-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-accent text-foreground transition-transform group-hover:scale-105">
                            <Inbox className="size-3.5 sm:size-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs sm:text-sm font-semibold text-foreground truncate">
                                    {t("assets.unfiledTitle")}
                                </span>
                            </div>
                            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground truncate">
                                <span>{getHubText(locale, "assetHub.unfiledCountHint", { count: number(unfiledCount) })}</span>
                                <button
                                    type="button"
                                    onClick={handleUnfiledHandoff}
                                    className="font-medium text-foreground underline-offset-2 hover:underline cursor-pointer"
                                >
                                    {getHubText(locale, "assetHub.quickHandoff")} &rarr;
                                </button>
                            </div>
                        </div>
                    </div>

                    <span className="flex shrink-0 items-center justify-center rounded-full bg-accent px-2 py-0.5 sm:px-3 sm:py-1 text-[11px] sm:text-xs font-semibold tabular-nums text-muted-foreground group-hover:text-foreground ml-1">
                        {number(unfiledCount)}
                    </span>
                </div>

                {/* 2. Recycle Bin Card */}
                <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setSearchParams({ view: "trash" })}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") setSearchParams({ view: "trash" });
                    }}
                    className="group flex h-12 sm:h-[72px] cursor-pointer items-center justify-between rounded-xl sm:rounded-2xl border border-border/80 bg-card px-2.5 py-1.5 sm:p-4 transition-all hover:border-foreground/20 hover:shadow-xs focus-visible:ring-2 focus-visible:ring-foreground outline-none min-w-0"
                >
                    <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
                        <div className="flex size-7 sm:size-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-accent text-foreground transition-transform group-hover:scale-105">
                            <Trash2 className="size-3.5 sm:size-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs sm:text-sm font-semibold text-foreground truncate">
                                    {t("assets.recycleBin")}
                                </span>
                            </div>
                            <p className="hidden sm:block truncate text-xs text-muted-foreground">
                                {getHubText(locale, "assetHub.trashHint")}
                            </p>
                        </div>
                    </div>

                    <span className="flex shrink-0 items-center justify-center rounded-full bg-accent px-2 py-0.5 sm:px-3 sm:py-1 text-[11px] sm:text-xs font-semibold tabular-nums text-muted-foreground group-hover:text-foreground ml-1">
                        {number(trashCount)}
                    </span>
                </div>
            </section>

            {/* Batch Action Bar (When Batch Mode is active or folders are selected) */}
            {(batchMode || selectedFolderIds.length > 0) ? (
                <div className="my-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-accent/40 p-3 text-xs">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                            {t("assets.selected")} <strong className="tabular-nums">{selectedFolderIds.length}</strong> {t("assets.assetUnit")}
                        </span>
                        <Button size="small" onClick={handleSelectAllOnPage}>
                            {getHubText(locale, "assetHub.selectAll")}
                        </Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            size="small"
                            icon={<Download className="size-3.5" />}
                            disabled={selectedFolderIds.length === 0}
                            onClick={handleBatchExport}
                        >
                            {t("assets.export")}
                        </Button>
                        <Button
                            size="small"
                            danger
                            icon={<Trash2 className="size-3.5" />}
                            disabled={selectedFolderIds.length === 0}
                            onClick={handleBatchDelete}
                        >
                            {t("common.delete")}
                        </Button>
                        <Button
                            size="small"
                            type="primary"
                            onClick={() => {
                                setBatchMode(false);
                                setSelectedFolderIds([]);
                            }}
                        >
                            {getHubText(locale, "assetHub.batchDone")}
                        </Button>
                    </div>
                </div>
            ) : null}

            {/* Project Folders Grid Section */}
            <section className="mt-8 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h2 className="text-base font-semibold text-foreground">
                            {t("assetMove.canvasProjectsGroup")}
                        </h2>
                        <span className="text-xs text-muted-foreground tabular-nums">
                            ({number(filteredProjects.length)})
                        </span>
                    </div>

                    {/* Desktop Sort Selector */}
                    <div className="hidden sm:block w-44">
                        <Select
                            size="small"
                            value={sort}
                            onChange={(val) => setSort(val as SortOption)}
                            className="w-full"
                            options={sortOptionsList}
                        />
                    </div>
                </div>

                {filteredProjects.length > 0 ? (
                    <div className="assets-hub-folders">
                        {filteredProjects.map((project) => (
                            <ProjectFolderCard
                                key={project.id}
                                project={project}
                                semanticMode="assetsHub"
                                selected={selectedFolderIds.includes(project.id)}
                                showSelectCheckbox={batchMode || selectedFolderIds.length > 0}
                                onToggleSelect={(sel) => toggleSelectFolder(project.id, sel)}
                                onEnterFolder={() => handleEnterFolder(project.id)}
                                onOpenCanvas={() => project.folderPresentation?.source === "manual" && !project.nodeCount ? handleEnterFolder(project.id) : navigate(`/canvas/${project.id}`)}
                                onRename={async (newTitle) => {
                                    try {
                                        await loadCanvasProjectForEditing(project.id);
                                        renameProject(project.id, newTitle);
                                        await saveRemoteUserDataNow(project.id);
                                        void queryClient.invalidateQueries({ queryKey: ["canvas-library"] });
                                    } catch (error) {
                                        message.error(error instanceof Error ? error.message : t("canvasCard.renameFailed"));
                                    }
                                }}
                                onStyleChange={async (style) => {
                                    try {
                                        await loadCanvasProjectForEditing(project.id);
                                        const current = useCanvasStore.getState().projects.find(item => item.id === project.id);
                                        if (!current) throw new Error(t("canvasExtra.cloudSync.syncFailedRetry"));
                                        useCanvasStore.getState().updateProject(project.id, {
                                            folderPresentation: { ...current.folderPresentation, style, theme: current.folderPresentation?.theme ?? DEFAULT_FOLDER_THEME },
                                        });
                                        await flushCanvasStorePersistence();
                                        if (user?.id) await saveRemoteUserDataNow(project.id);
                                        await Promise.all([
                                            queryClient.invalidateQueries({ queryKey: ["canvas-library-assets-hub"] }),
                                            queryClient.invalidateQueries({ queryKey: ["canvas-library"] }),
                                        ]);
                                    } catch (error) {
                                        message.error(error instanceof Error ? error.message : t("canvasExtra.cloudSync.syncFailedRetry"));
                                    }
                                }}
                                onExport={() => {
                                    const folderAssets = validAssets.filter((a) => a.archiveCanvasId === project.id);
                                    void exportAssets(folderAssets);
                                }}
                                onDelete={() => setDeleteIds([project.id])}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border py-20 text-center">
                        <Folder className="mb-3 size-12 opacity-30 stroke-[1.2]" />
                        <h3 className="text-sm font-semibold text-foreground">
                            {keyword ? t("canvasExtra.library.noMatches") : getHubText(locale, "assetHub.emptyFolder")}
                        </h3>
                        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                            {keyword ? t("canvasExtra.library.noMatchesHint") : t("canvasExtra.library.emptyDescription")}
                        </p>
                        {!keyword ? (
                            <Button
                                type="primary"
                                icon={<Plus className="size-3.5" />}
                                className="mt-4"
                                onClick={() => setCreateDialogOpen(true)}
                            >
                                {t("projectAssetFolder.createTitle")}
                            </Button>
                        ) : null}
                    </div>
                )}

                {/* Infinite scroll sentinel & Load More button */}
                <div ref={loadMoreSentinelRef} className="py-2" />
                {user?.id && remoteQuery.hasNextPage ? (
                    <div className="mt-6 flex justify-center">
                        <Button
                            loading={remoteQuery.isFetchingNextPage}
                            onClick={() => void remoteQuery.fetchNextPage()}
                        >
                            {getHubText(locale, "assetHub.loadMore")}
                        </Button>
                    </div>
                ) : filteredProjects.length > 0 ? (
                    <div className="mt-6 text-center text-xs text-muted-foreground/60">
                        {getHubText(locale, "assetHub.allFoldersLoaded", { count: filteredProjects.length })}
                    </div>
                ) : null}
            </section>

            {/* Mobile creation stays in the reserved safe area below the list. */}
            <div className="assets-hub-create-mobile">
                <button
                    type="button"
                    className="flex h-11 items-center gap-2 rounded-full px-4 text-xs font-semibold shadow-lg transition-transform active:scale-95 cursor-pointer"
                    style={{
                        backgroundColor: "var(--primary)",
                        color: "var(--primary-foreground)",
                        boxShadow: "var(--shadow-lg)",
                    }}
                    onClick={() => setCreateDialogOpen(true)}
                    aria-label={getHubText(locale, "assetHub.fabNewFolder")}
                >
                    <Plus className="size-4 stroke-[2.5] text-current" />
                    <span className="text-current font-semibold">{getHubText(locale, "assetHub.fabNewFolder")}</span>
                </button>
            </div>

            <AssetArchiveWizardModal
                open={archiveWizardOpen}
                onClose={() => setArchiveWizardOpen(false)}
                onSuccess={() => {
                    void queryClient.invalidateQueries({ queryKey: ["canvas-library"] });
                }}
            />

            {/* Mobile Sort Action Sheet (Bottom Drawer) */}
            <Drawer
                placement="bottom"
                open={sortSheetOpen}
                onClose={() => setSortSheetOpen(false)}
                height="auto"
                title={getHubText(locale, "assetHub.sort.title")}
                styles={{
                    body: { padding: "12px 16px 24px" },
                }}
            >
                <div className="space-y-2">
                    {sortOptionsList.map((item) => {
                        const isSelected = sort === item.value;
                        return (
                            <button
                                key={item.value}
                                type="button"
                                className={cn(
                                    "flex w-full items-center justify-between rounded-xl p-3 text-sm font-medium transition-colors cursor-pointer",
                                    isSelected
                                        ? "bg-accent text-foreground font-semibold"
                                        : "hover:bg-accent/50 text-muted-foreground",
                                )}
                                onClick={() => {
                                    setSort(item.value);
                                    setSortSheetOpen(false);
                                }}
                            >
                                <span>{item.label}</span>
                                {isSelected ? <Check className="size-4 text-foreground" /> : null}
                            </button>
                        );
                    })}
                    <div className="pt-2">
                        <Button block className="h-10" onClick={() => setSortSheetOpen(false)}>
                            {getHubText(locale, "assetHub.sort.cancel")}
                        </Button>
                    </div>
                </div>
            </Drawer>

            {/* Single-Page 2-Column New Canvas/Folder Dialog */}
            {createDialogOpen && <React.Suspense fallback={null}><CanvasFolderCreateDialog
                open={createDialogOpen}
                onClose={() => setCreateDialogOpen(false)}
                onCreated={(id) => {
                    handleEnterFolder(id);
                }}
            /></React.Suspense>}

        </div>
    );
}
