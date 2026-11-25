import "@/styles/canvas-list-route.css";
import { buildModelStarter, isModelStarterKey } from "../showcase/model-starters";
import { loadMessages } from "@/i18n/messages";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createToolboxInitialContent, toolboxPreset, toolboxToolFromParams, toolboxViewport } from "@/pages/workbench/toolbox-groups";
import { productionToolName } from "@/pages/workbench/catalog";
import { displayedShowcaseProjectTitle } from "../showcase/imported-project-title";
import { useNavigate, useSearchParams } from "react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { App, Button, Dropdown, Modal } from "antd";
import { Select } from "@/components/ui/base/select";
import { ArrowDownAZ, CheckSquare, Clock3, Download, FileUp, History, ListFilter, MoreHorizontal, Plus, Search, SlidersHorizontal, Trash2, X } from "lucide-react";

import { CollectionGrid, PageHeader, WorkspacePage } from "@/components/layout/workspace-page";
import { WorkspaceLoadingState, WorkspaceState } from "@/components/layout/workspace-state";

import { readZip } from "@/lib/zip";
import { setMediaBlob } from "@/services/file-storage";
import { setImageBlob } from "@/services/image-storage";
import { rescopeLocalStorageKey } from "@/services/local-workspace-storage";
import { CanvasFolderCard } from "@/components/canvas/canvas-folder-card";
import { CanvasCreateCard } from "@/components/canvas/canvas-project-card";
import { CanvasHistoryDrawer } from "@/components/canvas/canvas-history-drawer";
import type { CanvasExportFile } from "@/types/canvas-export";
import { CanvasNodeType, type CanvasNodeData } from "@/types/canvas";
import { flushCanvasStorePersistence, useCanvasStore } from "@/stores/canvas/use-canvas-store";
import { useCanvasUiStore } from "@/stores/canvas/use-canvas-ui-store";
import { exportCanvasProjects } from "@/lib/canvas/canvas-export";
import { saveCanvasDrawing, type CanvasDrawingRenderDraft } from "@/lib/canvas/canvas-drawing-storage";
import {
    createCanvasProjectWithDeferredRemoteSync,
    createCanvasProjectWithRemoteSync,
    hasRemoteUserDataSyncSession,
    loadCanvasProjectForEditing,
    saveRemoteUserDataNow,
    scheduleRemoteUserDataSync,
    openOrCreateBlankCanvas,
} from "@/services/user-data-sync";
import { localCanvasLibrarySummaries } from "@/services/asset-archive";
import { useAssetStore } from "@/stores/use-asset-store";
import { listRemoteCanvasProjectsPage, type CanvasLibrarySummary } from "@/services/api/user-data";
import { useUserStore } from "@/stores/use-user-store";
import { listProjects } from "@/services/api/projects";
import { loadCanvasProjectPage } from "@/lib/workspace-route-modules";
import { resourceFileUrl, resourceStorageKey, uploadResourceFile } from "@/services/api/resources";
import { primeResourceBlobCache } from "@/services/resource-blob-cache";
import { useSyncProgressStore } from "@/stores/use-sync-progress-store";
import { ensureCanvasNodeAsset } from "@/services/project-asset-sync";
import { CanvasSyncDraftMenu } from "./canvas-sync-status";
import { useAppearanceStore } from "@/stores/use-appearance-store";
import { useI18n } from "@/i18n/use-i18n";
import { currentLocaleText } from "@/i18n/current-locale-text";
import { selectableModelsByCapability, useConfigStore } from "@/stores/use-config-store";
import { getActiveUserScope } from "@/lib/user-scope";
import { clearOnboardingProgress } from "@/lib/canvas/canvas-onboarding-template";
import { ensureShowcaseCanvasProject } from "@/pages/showcase/import-to-canvas";
import { useArchivedShowcaseCase } from "@/pages/showcase/use-archived-case";
import { showcaseCaseNeedsManifest } from "@/pages/showcase/remote-assets";
import { useManifestAssets } from "@/pages/showcase/use-manifest-assets";
import { ensureLibTVStarterCanvasProject, getLibTVStarter } from "@/pages/showcase/libtv-starters";
import { importStagedGuestCanvas } from "@/services/guest-canvas-handoff";
import { importedGuestCanvasPath } from "@/lib/canvas/guest-canvas-navigation";


// 案例/起步画布导入：必须先在服务端建好画布记录再打开编辑器。
// 以前先跳转、后台再同步，同步失败时用户在一张云端不存在的画布上继续编辑，刷新后整张画布消失。
// 登录用户同步失败时撤掉本地副本并抛错，由调用方提示并返回画布列表；访客没有云端会话，保留本地画布。
async function createImportedCanvasProject(title: string, content: Parameters<typeof createCanvasProjectWithRemoteSync>[2]) {
    const { id, syncError } = await createCanvasProjectWithRemoteSync(title, undefined, content);
    if (syncError) {
        useCanvasStore.getState().deleteProjects([id]);
        throw syncError;
    }
    return { id };
}

export default function CanvasPage() {
    const { message } = App.useApp();
    const { t, number, locale } = useI18n();
    const brandName = useAppearanceStore((state) => state.appearance.brandName);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const inputRef = useRef<HTMLInputElement>(null);
    const autoOpenRef = useRef(false);
    const guestHandoffStartedRef = useRef(false);
    const [keyword, setKeyword] = useState("");
    const [sort, setSort] = useState<"updated" | "name" | "nodes">("updated");
    const [projectFilter, setProjectFilter] = useState("all");
    const loadMoreRef = useRef<HTMLDivElement>(null);
    const [loadedProjectCount, setLoadedProjectCount] = useState(50);
    const [openingProjectId, setOpeningProjectId] = useState("");
    const openingProjectIdRef = useRef("");
    const hydrated = useCanvasStore((state) => state.hydrated);
    const localProjects = useCanvasStore((state) => state.projects);
    const userId = useUserStore((state) => state.user?.id);
    const sessionHydrated = useUserStore((state) => state.hydrated);
    const showcaseTemplateUuid = searchParams.get("import") === "liblib" ? searchParams.get("templateUuid") || "" : "";
    const starterKey = ["libtv-starter", "model-starter"].includes(searchParams.get("import") || "") ? searchParams.get("starter") || "" : "";
    const starter = starterKey ? getLibTVStarter(starterKey) : undefined;
    const mode = searchParams.get("mode");
    const guestCanvasToken = searchParams.get("guestCanvas") || "";
    const guestHandoffSearch = searchParams.toString();
    const [guestHandoffPending, setGuestHandoffPending] = useState(Boolean(guestCanvasToken));
    const needsCanvasLibrary = !starterKey && mode !== "new" && mode !== "handoff";
    const { data: showcaseCase, loading: showcaseLoading, error: showcaseError } = useArchivedShowcaseCase(showcaseTemplateUuid);
    // Archived cases already carry local media paths; only fetch the all-case manifest when one does not.
    const showcaseNeedsManifest = useMemo(() => Boolean(showcaseCase && showcaseCaseNeedsManifest(showcaseCase)), [showcaseCase]);
    const { index: showcaseAssets, error: showcaseAssetsError, loading: showcaseAssetsLoading } = useManifestAssets(showcaseNeedsManifest);
    const [debouncedKeyword, setDebouncedKeyword] = useState("");
    useEffect(() => {
        const timer = window.setTimeout(() => setDebouncedKeyword(keyword.trim()), 250);
        return () => window.clearTimeout(timer);
    }, [keyword]);
    const libraryQuery = useInfiniteQuery({
        queryKey: ["canvas-library", userId, projectFilter, sort, debouncedKeyword],
        queryFn: ({ pageParam, signal }) => listRemoteCanvasProjectsPage({ page: pageParam, pageSize: 40, projectId: projectFilter, sort, query: debouncedKeyword, signal }),
        initialPageParam: 1,
        getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
        // Share the freshly discovered first page across startup mounts.
        // Focus/reconnect and mutations continue to revalidate immediately.
        staleTime: 5_000,
        refetchOnMount: true,
        refetchOnWindowFocus: "always",
        refetchOnReconnect: "always",
        enabled: Boolean(userId) && sessionHydrated && needsCanvasLibrary,
    });
    const assets = useAssetStore((state) => state.assets);
    const projects = useMemo<CanvasLibrarySummary[]>(() => (userId
        ? libraryQuery.data?.pages.flatMap((page) => page.projects) || []
        : localCanvasLibrarySummaries(localProjects, assets)).filter(project => project.folderPresentation?.source !== "manual" || project.nodeCount > 0), [libraryQuery.data, localProjects, userId, assets]);
    const totalProjects = userId ? libraryQuery.data?.pages[0]?.total || 0 : projects.length;
    const importProject = useCanvasStore((state) => state.importProject);
    const selectedIds = useCanvasUiStore((state) => state.selectedProjectIds);
    const setDeleteIds = useCanvasUiStore((state) => state.setDeleteProjectIds);
    const updateProject = useCanvasStore((state) => state.updateProject);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [associationOpen, setAssociationOpen] = useState(false);
    const [associationProjectId, setAssociationProjectId] = useState("");
    const projectQuery = useQuery({ queryKey: ["projects"], queryFn: () => listProjects(), enabled: needsCanvasLibrary });

    const agentMode = mode === "new" || mode === "recent" || mode === "choose";
    const handoffMode = mode === "handoff";
    const forwardedQuery = agentMode || handoffMode || searchParams.get("agent") === "1" ? `?${searchParams.toString()}` : "";
    const preloadProject = useCallback(() => {
        void loadCanvasProjectPage();
    }, []);
    // A case or starter import always ends in the editor; fetch it while the import is saved.
    useEffect(() => {
        if (showcaseTemplateUuid || starterKey) preloadProject();
    }, [preloadProject, showcaseTemplateUuid, starterKey]);
    const enterProject = useCallback(
        (id: string) => {
            if (openingProjectIdRef.current) return;
            openingProjectIdRef.current = id;
            setOpeningProjectId(id);
            preloadProject();
            navigate(`/canvas/${id}${forwardedQuery}`);
        },
        [forwardedQuery, navigate, preloadProject],
    );
    const createAndEnter = (fresh = false) => {
        if (openingProjectIdRef.current) return;
        const title = currentLocaleText("canvasExtra.library.freeCanvasName", { number: Math.max(projects.length, localProjects.length) + 1 });
        // The guide starts on a blank canvas and creates each node through its real control.
        const activeConfig = useConfigStore.getState().config;
        const defaultTextModel = activeConfig.textModel || selectableModelsByCapability(activeConfig, "text")[0] || "";
        const toolboxTool = toolboxToolFromParams(searchParams);
        const toolboxContent = toolboxTool
            ? createToolboxInitialContent(toolboxTool, locale, toolboxPreset(searchParams.get("preset")), {
                  image: activeConfig.imageModel || selectableModelsByCapability(activeConfig, "image")[0] || "",
                  video: activeConfig.videoModel || selectableModelsByCapability(activeConfig, "video")[0] || "",
              })
            : undefined;
        const { id, sync } = toolboxTool && toolboxContent
            ? createCanvasProjectWithDeferredRemoteSync(productionToolName(toolboxTool, locale), undefined, {
                  ...toolboxContent,
                  viewport: toolboxViewport(toolboxContent.nodes, window.innerWidth, window.innerHeight),
                  starterMode: "freeform",
              })
            : fresh ? createCanvasProjectWithDeferredRemoteSync(title, undefined, { starterMode: "freeform" }) : openOrCreateBlankCanvas(title);
        if (searchParams.get("tour") === "1") clearOnboardingProgress(id);
        enterProject(id);
        void sync.then(({ syncError }) => {
            if (syncError) message.warning(syncError instanceof Error ? currentLocaleText("canvasExtra.library.cloudSyncFailedWithReason", { reason: syncError.message }) : currentLocaleText("canvasExtra.library.cloudSyncFailed"));
        });
    };
    useEffect(() => {
        if (!guestCanvasToken || !hydrated || !sessionHydrated || !userId || guestHandoffStartedRef.current) return;
        let attempts = 0;
        const timer = window.setInterval(() => {
            if (!hasRemoteUserDataSyncSession()) {
                if (++attempts < 120) return;
                window.clearInterval(timer);
                setGuestHandoffPending(false);
                message.error(t("canvasExtra.library.cloudSyncFailed"));
                return;
            }
            window.clearInterval(timer);
            guestHandoffStartedRef.current = true;
            void importStagedGuestCanvas(guestCanvasToken)
                .then(({ id, syncError }) => {
                    if (syncError) message.warning(syncError instanceof Error ? syncError.message : t("canvasExtra.library.cloudSyncFailed"));
                    navigate(importedGuestCanvasPath(id, guestHandoffSearch), { replace: true });
                })
                .catch((error: unknown) => {
                    setGuestHandoffPending(false);
                    message.error(error instanceof Error ? error.message : t("canvasExtra.library.importFailed"));
                });
        }, 250);
        return () => window.clearInterval(timer);
    }, [guestCanvasToken, guestHandoffSearch, hydrated, message, navigate, sessionHydrated, t, userId]);
    useEffect(() => {
        if (!starterKey || !hydrated || !sessionHydrated || autoOpenRef.current) return;
        autoOpenRef.current = true;
        if (searchParams.get("import") === "model-starter" && isModelStarterKey(starterKey)) {
            void loadMessages(locale).then(() => {
                const imported = buildModelStarter(starterKey, t, window.innerWidth, window.innerHeight);
                return createImportedCanvasProject(imported.title, { ...imported, starterMode: "freeform" });
            }).then(result => navigate(`/canvas/${result.id}`, { replace: true })).catch(error => {
                message.error(t("canvasLibrary.starterFailedDetail", { detail: error instanceof Error ? error.message : String(error) }));
                navigate("/canvas", { replace: true });
            });
            return;
        }
        if (!starter) {
            message.error(t("canvasLibrary.starterMissing"));
            navigate("/canvas", { replace: true });
            return;
        }
        void loadMessages(locale).then(() => ensureLibTVStarterCanvasProject(starter, {
            translator: t,
            scopeKey: getActiveUserScope(),
            getProjects: () => useCanvasStore.getState().projects,
            viewportSize: { width: window.innerWidth, height: window.innerHeight },
            createProject: (imported) =>
                createImportedCanvasProject(imported.title, {
                    importSource: imported.importSource,
                    nodes: imported.nodes,
                    connections: imported.connections,
                    viewport: imported.viewport,
                    starterMode: "freeform",
                    directorScenes: imported.directorScenes,
                    ...(["director", "depth-capture"].includes(starter.key) ? { appearance: { mode: "dark" as const }, backgroundMode: "dots" as const } : {}),
                }),
        }))
            .then((result) => {
                if (result.created) message.success(t("canvasLibrary.starterImported", { nodes: number(result.imported.nodes.length), connections: number(result.imported.connections.length) }));
                navigate(`/canvas/${result.id}`, { replace: true });
            })
            .catch((error: unknown) => {
                message.error(t("canvasLibrary.starterFailedDetail", { detail: error instanceof Error ? error.message : String(error) }));
                navigate("/canvas", { replace: true });
            });
    }, [hydrated, message, navigate, number, sessionHydrated, starter, starterKey, t, locale]);
    useEffect(() => {
        if (!showcaseTemplateUuid || !hydrated || !sessionHydrated || (userId && !libraryQuery.isSuccess) || autoOpenRef.current || showcaseLoading || showcaseAssetsLoading) return;
        autoOpenRef.current = true;
        if (!showcaseCase || showcaseError || showcaseAssetsError) {
            message.error(t("canvasLibrary.showcaseMissing"));
            navigate("/canvas", { replace: true });
            return;
        }
        void ensureShowcaseCanvasProject(showcaseCase, showcaseAssets, {
            locale,
            scopeKey: getActiveUserScope(),
            getProjects: () => useCanvasStore.getState().projects,
            viewportSize: { width: window.innerWidth, height: window.innerHeight },
            createProject: (imported) =>
                createImportedCanvasProject(imported.title, {
                    importSource: imported.importSource,
                    nodes: imported.nodes,
                    connections: imported.connections,
                    viewport: imported.viewport,
                    starterMode: "freeform",
                }),
        })
            .then((result) => {
                if (result.created && result.syncError) message.warning(t("canvasLibrary.showcaseLocal"));
                else if (result.created) message.success(t("canvasLibrary.showcaseImported", { nodes: number(result.imported.nodes.length), connections: number(result.imported.connections.length) }));
                navigate(`/canvas/${result.id}`, { replace: true });
            })
            .catch((error: unknown) => {
                message.error(t("canvasLibrary.showcaseFailedDetail", { detail: error instanceof Error ? error.message : String(error) }));
                navigate("/canvas", { replace: true });
            });
    }, [hydrated, libraryQuery.isSuccess, locale, message, navigate, number, sessionHydrated, showcaseAssets, showcaseAssetsError, showcaseAssetsLoading, showcaseCase, showcaseError, showcaseLoading, showcaseTemplateUuid, t, userId]);
    const filteredProjects = useMemo(() => {
        if (userId) return projects;
        const query = keyword.trim().toLowerCase();
        const scoped = projects.filter((project) => projectFilter === "all" || (projectFilter === "independent" ? !project.projectId : project.projectId === projectFilter));
        const values = query ? scoped.filter((project) => `${project.title} ${displayedShowcaseProjectTitle(project, locale)}`.toLowerCase().includes(query)) : [...scoped];
        values.sort((a, b) =>
            sort === "name" ? displayedShowcaseProjectTitle(a, locale).localeCompare(displayedShowcaseProjectTitle(b, locale), locale) : sort === "nodes" ? b.nodeCount - a.nodeCount : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
        return values;
    }, [keyword, locale, projectFilter, projects, sort, userId]);
    const projectNames = useMemo(() => new Map((projectQuery.data?.projects || []).map(({ project }) => [project.id, project.name])), [projectQuery.data]);
    const visibleProjects = userId ? filteredProjects : filteredProjects.slice(0, loadedProjectCount);
    const hasMore = userId ? libraryQuery.hasNextPage : visibleProjects.length < filteredProjects.length;
    const selectedProjects = projects.filter((project) => selectedIds.includes(project.id));
    const projectFilterLabel = projectFilter === "all" ? t("canvasExtra.library.allCanvases") : projectFilter === "independent" ? t("canvasExtra.library.freeCanvases") : projectNames.get(projectFilter) || t("canvasExtra.canvas.projectCanvas");
    const sortLabel = sort === "name" ? t("canvasExtra.library.byName") : sort === "nodes" ? t("canvasExtra.library.byNodes") : t("canvasExtra.library.recentlyUpdated");
    const projectFilterItems = useMemo(
        () => [{ key: "all", label: t("canvasExtra.library.allCanvases") }, { key: "independent", label: t("canvasExtra.library.freeCanvases") }, ...(projectQuery.data?.projects || []).map(({ project }) => ({ key: project.id, label: project.name }))],
        [projectQuery.data, t],
    );
    const sortItems = [
        { key: "updated", label: t("canvasExtra.library.recentlyUpdated"), icon: <Clock3 className="size-3.5" /> },
        { key: "name", label: t("canvasExtra.library.byName"), icon: <ArrowDownAZ className="size-3.5" /> },
        { key: "nodes", label: t("canvasExtra.library.byNodeCount"), icon: <ListFilter className="size-3.5" /> },
    ];
    useEffect(() => {
        setLoadedProjectCount(50);
    }, [keyword, projectFilter, sort]);
    useEffect(() => {
        const node = loadMoreRef.current;
        if (!node || !hasMore) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry?.isIntersecting) return;
                if (userId) {
                    if (!libraryQuery.isFetchingNextPage && !libraryQuery.isFetchNextPageError) void libraryQuery.fetchNextPage();
                } else setLoadedProjectCount((count) => Math.min(count + 50, filteredProjects.length));
            },
            { rootMargin: "600px" },
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, [filteredProjects.length, visibleProjects.length, hasMore, userId, libraryQuery.fetchNextPage, libraryQuery.isFetchingNextPage, libraryQuery.isFetchNextPageError]);
    const associateSelected = async (nextProjectId = associationProjectId) => {
        const projectId = nextProjectId || undefined;
        try {
            for (const id of selectedIds) await loadCanvasProjectForEditing(id);
            selectedIds.forEach((id) => updateProject(id, { projectId }));
            await saveRemoteUserDataNow();
            message.success(projectId ? currentLocaleText("canvasExtra.library.addedToProject") : currentLocaleText("canvasExtra.library.removedFromProject"));
            setAssociationOpen(false);
        } catch (error) {
            message.error(error instanceof Error ? currentLocaleText("canvasExtra.library.associationFailedWithReason", { reason: error.message }) : currentLocaleText("canvasExtra.library.associationFailed"));
        }
    };
    const exportSelected = async () => {
        try {
            const selected = [];
            for (const id of selectedIds) {
                const project = await loadCanvasProjectForEditing(id);
                if (!project) throw new Error(currentLocaleText("canvasExtra.library.exportMissingCanvas"));
                selected.push(project);
            }
            await exportCanvasProjects(selected, currentLocaleText("canvasExtra.library.exportFileName", { brand: brandName, count: selected.length }));
        } catch (error) {
            message.error(error instanceof Error ? error.message : currentLocaleText("canvasExtra.library.exportFailed"));
        }
    };
    const importCanvas = async (file?: File) => {
        if (!file) return;
        const hideLoading = message.loading({ content: currentLocaleText("canvasExtra.library.preparingImport"), duration: 0 });
        try {
            const zip = await readZip(file);
            const projectFile = zip.get("projects.json");
            if (!projectFile) throw new Error(currentLocaleText("canvasExtra.library.missingMetadata"));
            const data = JSON.parse(await projectFile.text()) as CanvasExportFile;
            if (!Array.isArray(data.projects)) throw new Error(currentLocaleText("canvasExtra.library.missingCanvasList"));
            for (const item of data.projects) {
                if (!Array.isArray(item.files)) throw new Error(currentLocaleText("canvasExtra.library.invalidMediaList", { title: item.project?.title || currentLocaleText("canvasExtra.canvas.unnamedCanvas") }));
                const missing = item.files.find((entry) => !zip.get(entry.path));
                if (missing) throw new Error(currentLocaleText("canvasExtra.library.missingMediaFile", { path: missing.path }));
            }
            hideLoading();
            const remoteSyncEnabled = hasRemoteUserDataSyncSession();
            let remoteSyncWarning: unknown;

            for (const item of data.projects) {
                const totalFiles = item.files.length;
                const importedProjectId = importProject({
                    ...item.project,
                    title: item.project.title || currentLocaleText("canvasExtra.library.importedCanvas"),
                    nodes: item.project.nodes || [],
                });

                if (totalFiles > 0) {
                    useSyncProgressStore.getState().setProjectProgress(importedProjectId, {
                        projectId: importedProjectId,
                        total: totalFiles,
                        completed: 0,
                        phase: "uploading",
                        message: currentLocaleText("canvasExtra.library.uploadingMedia"),
                    });
                }

                try {
                    const storageKeyMap = new Map<string, { storageKey: string; url: string }>();
                    const concurrency = 4;
                    let fileIndex = 0;
                    const workers = new Array(Math.min(item.files.length, concurrency)).fill(null).map(async () => {
                        while (fileIndex < item.files.length) {
                            const current = fileIndex++;
                            const fileItem = item.files[current];
                            const blob = zip.get(fileItem.path)!;
                            const mime = fileItem.mimeType || blob.type || "image/png";
                            const typedBlob = blob.type ? blob : blob.slice(0, blob.size, mime);
                            const kind: "image" | "video" | "audio" | "file" = mime.startsWith("image/") ? "image" : mime.startsWith("video/") ? "video" : mime.startsWith("audio/") ? "audio" : "file";

                            try {
                                const resource = await uploadResourceFile(typedBlob, kind, { fileName: fileItem.path.split("/").pop() });
                                const newStorageKey = resourceStorageKey(resource.id);
                                const newUrl = resourceFileUrl(resource.id);
                                await primeResourceBlobCache(newStorageKey, typedBlob).catch(() => "");
                                storageKeyMap.set(fileItem.storageKey, { storageKey: newStorageKey, url: newUrl });
                            } catch (uploadErr) {
                                console.warn("上传资源到后端失败，降级保存本地", uploadErr);
                                const localKey = rescopeLocalStorageKey(fileItem.storageKey);
                                const localUrl = await (localKey.startsWith("image:") ? setImageBlob(localKey, typedBlob) : setMediaBlob(localKey, typedBlob));
                                if (localUrl) {
                                    storageKeyMap.set(fileItem.storageKey, { storageKey: localKey, url: localUrl });
                                }
                            } finally {
                                useSyncProgressStore.getState().incrementProjectCompleted(importedProjectId);
                            }
                        }
                    });
                    await Promise.all(workers);

                    const drawingEngineById = new Map((item.drawingDocuments || []).map((document) => [document.drawingId, document.engine || "tldraw"]));
                    const remapNodeMedia = (node: CanvasNodeData): CanvasNodeData => {
                        const oldKey = node.metadata?.storageKey;
                        const mapped = oldKey ? storageKeyMap.get(oldKey) : undefined;
                        const isDeadBlob = (val?: string) => typeof val === "string" && val.startsWith("blob:");
                        const nextStorageKey = mapped ? mapped.storageKey : oldKey && !isDeadBlob(oldKey) ? oldKey : undefined;
                        const content = mapped ? mapped.url : isDeadBlob(node.metadata?.content) ? "" : node.metadata?.content;
                        const previewContent = mapped ? mapped.url : isDeadBlob(node.metadata?.previewContent) ? "" : node.metadata?.previewContent;
                        return {
                            ...node,
                            metadata: {
                                ...node.metadata,
                                ...(nextStorageKey !== undefined ? { storageKey: nextStorageKey } : {}),
                                ...(content !== undefined ? { content } : {}),
                                ...(previewContent !== undefined ? { previewContent } : {}),
                                drawingEngine: node.type === "drawing" && node.metadata?.drawingId ? drawingEngineById.get(node.metadata.drawingId) || node.metadata.drawingEngine || "tldraw" : node.metadata?.drawingEngine,
                            },
                        };
                    };

                    let remappedNodes = (item.project.nodes || []).map(remapNodeMedia);
                    let remappedTimeline = item.project.timeline
                        ? {
                              ...item.project.timeline,
                              clips: item.project.timeline.clips.map((clip) => {
                                  const directMedia = clip.directMedia;
                                  if (!directMedia?.storageKey) return clip;
                                  const mapped = storageKeyMap.get(directMedia.storageKey);
                                  return mapped
                                      ? {
                                            ...clip,
                                            directMedia: { ...directMedia, storageKey: mapped.storageKey, url: mapped.url, dataUrl: directMedia.dataUrl ? mapped.url : directMedia.dataUrl, content: directMedia.content ? mapped.url : directMedia.content },
                                        }
                                      : clip;
                              }),
                          }
                        : undefined;
                    updateProject(importedProjectId, { nodes: remappedNodes, timeline: remappedTimeline });

                    const assetIdByStorageKey = new Map<string, string>();
                    for (let index = 0; index < remappedNodes.length; index += 1) {
                        const node = remappedNodes[index];
                        const isMedia = node.type === CanvasNodeType.Image || node.type === CanvasNodeType.Video || node.type === CanvasNodeType.Audio;
                        if (!isMedia || !node.metadata?.content) continue;
                        const storageKey = node.metadata.storageKey || "";
                        let assetId = storageKey ? assetIdByStorageKey.get(storageKey) : undefined;
                        if (!assetId) {
                            const result = await ensureCanvasNodeAsset({ canvasId: importedProjectId, domainProjectId: item.project.projectId, node, source: "canvas-upload" });
                            assetId = result.assetId;
                            if (storageKey) assetIdByStorageKey.set(storageKey, assetId);
                        }
                        remappedNodes[index] = { ...node, metadata: { ...node.metadata, assetId } };
                    }
                    if (remappedTimeline) {
                        const clips: typeof remappedTimeline.clips = [];
                        for (const clip of remappedTimeline.clips) {
                            const media = clip.directMedia;
                            const content = media?.url || media?.dataUrl || media?.content || "";
                            if (!media || media.assetId || !media.storageKey || !content || media.kind === "text") {
                                clips.push(clip);
                                continue;
                            }
                            let assetId = assetIdByStorageKey.get(media.storageKey);
                            if (!assetId) {
                                const type = media.kind === "audio" ? CanvasNodeType.Audio : media.kind === "video" ? CanvasNodeType.Video : CanvasNodeType.Image;
                                const node: CanvasNodeData = {
                                    id: media.id,
                                    type,
                                    title: media.title,
                                    position: { x: 0, y: 0 },
                                    width: media.width || 320,
                                    height: media.height || (type === CanvasNodeType.Audio ? 120 : 240),
                                    metadata: { content, storageKey: media.storageKey, naturalWidth: media.width, naturalHeight: media.height, durationMs: media.durationMs, bytes: media.bytes, mimeType: media.mimeType },
                                };
                                const result = await ensureCanvasNodeAsset({ canvasId: importedProjectId, domainProjectId: item.project.projectId, node, source: "canvas-upload" });
                                assetId = result.assetId;
                                assetIdByStorageKey.set(media.storageKey, assetId);
                            }
                            clips.push({ ...clip, directMedia: { ...media, assetId } });
                        }
                        remappedTimeline = { ...remappedTimeline, clips };
                    }
                    updateProject(importedProjectId, { nodes: remappedNodes, timeline: remappedTimeline });

                    await Promise.all(
                        (item.drawingDocuments || []).map((document) => {
                            const previewFile = document.previewPath ? zip.get(document.previewPath) : undefined;
                            const preview = previewFile && !previewFile.type ? previewFile.slice(0, previewFile.size, "image/png") : previewFile;
                            const renderFile = document.generationRender?.path ? zip.get(document.generationRender.path) : undefined;
                            const renderBlob = renderFile && !renderFile.type ? renderFile.slice(0, renderFile.size, document.generationRender?.mimeType || "image/png") : renderFile;
                            const render =
                                renderBlob && document.generationRender
                                    ? ({
                                          blob: renderBlob,
                                          pageId: document.generationRender.pageId,
                                          width: document.generationRender.width,
                                          height: document.generationRender.height,
                                          mimeType: document.generationRender.mimeType,
                                          background: document.generationRender.background,
                                      } satisfies CanvasDrawingRenderDraft)
                                    : undefined;
                            const engine = document.engine || "tldraw";
                            return saveCanvasDrawing(
                                importedProjectId,
                                document.drawingId,
                                engine,
                                document.snapshot,
                                {
                                    version: 2,
                                    engine,
                                    snapshot: document.snapshot,
                                    revision: Math.max(0, document.revision - 1),
                                    updatedAt: document.updatedAt,
                                    shapeCount: document.shapeCount,
                                    pageCount: document.pageCount,
                                },
                                preview,
                                render,
                            );
                        }),
                    );

                    useSyncProgressStore.getState().setProjectProgress(importedProjectId, {
                        phase: "saving",
                        message: remoteSyncEnabled ? currentLocaleText("canvasExtra.library.savingStructure") : currentLocaleText("canvasExtra.library.savingLocal"),
                    });
                    await flushCanvasStorePersistence();
                    if (remoteSyncEnabled) {
                        try {
                            await saveRemoteUserDataNow(importedProjectId);
                        } catch (syncError) {
                            remoteSyncWarning ||= syncError;
                            scheduleRemoteUserDataSync();
                            console.warn("导入画布云端同步失败，等待自动重试", syncError);
                        }
                    }
                } catch (error) {
                    useSyncProgressStore.getState().setProjectProgress(importedProjectId, {
                        phase: "error",
                        message: error instanceof Error ? error.message : currentLocaleText("canvasExtra.cloudSync.importIncomplete"),
                    });
                    throw error;
                } finally {
                    if (!remoteSyncEnabled) useSyncProgressStore.getState().setProjectProgress(importedProjectId, null);
                }
            }

            await flushCanvasStorePersistence();
            if (remoteSyncWarning) {
                message.warning(currentLocaleText("canvasExtra.library.importedSyncPending", { count: data.projects.length }));
            } else {
                message.success(remoteSyncEnabled ? currentLocaleText("canvasExtra.library.importedSynced", { count: data.projects.length }) : currentLocaleText("canvasExtra.library.importedLocal", { count: data.projects.length }));
            }
        } catch (error) {
            hideLoading();
            console.error("导入画布失败", error);
            message.error(error instanceof Error ? currentLocaleText("canvasExtra.library.importFailedWithReason", { reason: error.message }) : currentLocaleText("canvasExtra.library.importFailed"));
        } finally {
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    useEffect(() => {
        if (!hydrated || !sessionHydrated || (mode === "recent" && userId && !libraryQuery.isSuccess) || autoOpenRef.current || (mode !== "new" && mode !== "recent" && mode !== "handoff")) return;
        autoOpenRef.current = true;
        if (mode === "recent" && projects[0]?.id) {
            enterProject(projects[0].id);
            return;
        }
        createAndEnter();
    }, [hydrated, message, mode, projects, sessionHydrated, userId, libraryQuery.isSuccess]);

    if (hydrated && !libraryQuery.isError && (guestHandoffPending || mode === "new" || mode === "recent" || mode === "handoff" || showcaseTemplateUuid || starterKey))
        return <main className="flex h-full items-center justify-center bg-background text-sm text-stone-500">{t("canvasExtra.library.opening")}</main>;

    return (
        <WorkspacePage grid className="canvas-library-page">
            <div className="studio-band">
                <PageHeader
                    title={t("canvasExtra.library.title")}
                    description={t("canvasExtra.library.description")}
                    meta={<span className="app-projects-header-meta">{t("canvasExtra.library.count", { count: totalProjects })}</span>}
                    actions={
                        <div className="canvas-library-header-actions">
                            <Button className="canvas-library-header-action is-primary library-primary-action" type="primary" disabled={!hydrated} icon={<Plus className="size-3.5" />} onClick={() => createAndEnter(true)}>
                                {t("canvasExtra.library.newCanvas")}
                            </Button>
                            {projects.length ? (
                                <Button
                                    className="canvas-library-header-action"
                                    disabled={!hydrated}
                                    icon={<CheckSquare className="size-3.5" />}
                                    onClick={() => {
                                        if (selectedIds.length > 0) {
                                            useCanvasUiStore.setState({ selectedProjectIds: [] });
                                        } else {
                                            useCanvasUiStore.setState({ selectedProjectIds: visibleProjects.map((p) => p.id) });
                                        }
                                    }}
                                >
                                    {selectedIds.length > 0 ? t("assets.clearSelection") : t("assets.selectAll")}
                                </Button>
                            ) : null}
                            {projects.length ? (
                                <Dropdown
                                    menu={{
                                        classNames: { root: "canvas-library-actions-menu", item: "canvas-library-actions-menu-item" },
                                        items: [
                                            {
                                                key: "select-all",
                                                icon: <CheckSquare className="size-3.5" />,
                                                label: t("assets.selectAll"),
                                                onClick: () => {
                                                    useCanvasUiStore.setState({ selectedProjectIds: visibleProjects.map((p) => p.id) });
                                                },
                                            },
                                            {
                                                key: "clear-selection",
                                                label: t("assets.clearSelection"),
                                                disabled: selectedIds.length === 0,
                                                onClick: () => {
                                                    useCanvasUiStore.setState({ selectedProjectIds: [] });
                                                },
                                            },
                                            { type: "divider" },
                                            { key: "delete-loaded", danger: true, icon: <Trash2 className="size-3.5" />, label: t("canvasExtra.library.deleteLoaded"), onClick: () => setDeleteIds(projects.map((project) => project.id)) },
                                        ],
                                    }}
                                    openClassName="is-open"
                                    placement="bottomRight"
                                    trigger={["click"]}
                                >
                                    <Button className="canvas-library-header-action is-icon" type="text" aria-label={t("canvasExtra.library.moreCanvasActions")} title={t("canvasExtra.library.moreActions")} icon={<MoreHorizontal className="size-4" />} />
                                </Dropdown>
                            ) : null}
                            <Button className="canvas-library-header-action" disabled={!hydrated} icon={<FileUp className="size-3.5" />} onClick={() => inputRef.current?.click()}>
                                {t("canvasExtra.library.import")}
                            </Button>
                            <CanvasSyncDraftMenu className="canvas-library-header-action" />
                        </div>
                    }
                />

                <section className="canvas-library-discovery" aria-label={t("canvasExtra.library.browseTools")}>
                    <div className="canvas-library-search">
                        <Search aria-hidden="true" />
                        <input value={keyword} placeholder={t("canvasExtra.library.search")} aria-label={t("canvasExtra.library.search")} onChange={(event) => setKeyword(event.target.value)} />
                        {keyword ? (
                            <button type="button" aria-label={t("canvasLibrary.clearSearch")} onClick={() => setKeyword("")}>
                                <X />
                            </button>
                        ) : null}
                    </div>
                    <div className="canvas-library-filters">
                        <Dropdown trigger={["click"]} placement="bottomLeft" menu={{ items: projectFilterItems, selectedKeys: [projectFilter], onClick: ({ key }) => setProjectFilter(String(key)) }}>
                            <button type="button" className={`canvas-library-filter${projectFilter !== "all" ? " is-active" : ""}`} aria-label={t("canvasExtra.library.filterByProject")}>
                                <SlidersHorizontal />
                                <span>{projectFilterLabel}</span>
                            </button>
                        </Dropdown>
                        <Dropdown trigger={["click"]} placement="bottomLeft" menu={{ items: sortItems, selectedKeys: [sort], onClick: ({ key }) => setSort(key as typeof sort) }}>
                            <button type="button" className={`canvas-library-filter${sort !== "updated" ? " is-active" : ""}`} aria-label={t("canvasExtra.library.sortCanvases")}>
                                {sort === "updated" ? <Clock3 /> : sort === "name" ? <ArrowDownAZ /> : <ListFilter />}
                                <span>{sortLabel}</span>
                            </button>
                        </Dropdown>
                        <button type="button" className="canvas-library-filter" onClick={() => setHistoryOpen(true)}>
                            <History />
                            <span>{t("canvasExtra.library.history")}</span>
                        </button>
                        {keyword || projectFilter !== "all" || sort !== "updated" ? (
                            <button
                                type="button"
                                className="canvas-library-reset"
                                onClick={() => {
                                    setKeyword("");
                                    setProjectFilter("all");
                                    setSort("updated");
                                }}
                            >
                                {t("common.reset")}
                            </button>
                        ) : null}
                    </div>
                    <span className="canvas-library-count">
                        <strong>{number(visibleProjects.length, { minimumIntegerDigits: 2, useGrouping: false })}</strong>
                        <span>
                            / {number(totalProjects, { minimumIntegerDigits: 2, useGrouping: false })} {t("nav.canvas")}
                        </span>
                    </span>
                </section>
            </div>

            <div className="canvas-library-frame">
                {selectedIds.length ? (
                    <div className="app-canvas-selection-toolbar mt-2 flex min-h-10 flex-wrap items-center gap-2 rounded-md border px-3 py-1.5 text-xs">
                        <strong className="mr-auto font-medium">{t("canvasExtra.library.selectedCount", { count: selectedIds.length })}</strong>
                        <Button size="small" onClick={() => useCanvasUiStore.setState({ selectedProjectIds: [] })}>
                            {t("assets.clearSelection")}
                        </Button>
                        <Button
                            size="small"
                            disabled={!hydrated || projectQuery.isLoading}
                            onClick={() => {
                                setAssociationProjectId(selectedProjects[0]?.projectId || "");
                                setAssociationOpen(true);
                            }}
                        >
                            {t("canvasExtra.library.addToProject")}
                        </Button>
                        {selectedProjects.some((project) => project.projectId) ? (
                            <Button
                                size="small"
                                disabled={!hydrated}
                                onClick={() => {
                                    setAssociationProjectId("");
                                    void associateSelected("");
                                }}
                            >
                                {t("canvasExtra.library.removeFromProject")}
                            </Button>
                        ) : null}
                        <Button size="small" disabled={!hydrated} icon={<Download className="size-3.5" />} onClick={() => void exportSelected()}>
                            {t("canvasExtra.library.export")}
                        </Button>
                        <Button size="small" danger disabled={!hydrated} onClick={() => setDeleteIds(selectedIds)}>
                            {t("canvasExtra.library.delete")}
                        </Button>
                    </div>
                ) : null}

                {userId && libraryQuery.isError ? (
                    <div role="alert">
                        {t("canvasExtra.library.loadFailed")}
                        <Button onClick={() => void libraryQuery.refetch()}>{t("canvasExtra.library.retry")}</Button>
                    </div>
                ) : !hydrated || (userId && libraryQuery.isPending) ? (
                    <WorkspaceLoadingState label={t("canvasExtra.library.restoring")} detail={t("canvasExtra.library.readingSyncState")} />
                ) : (!keyword.trim() && projectFilter === "all") || visibleProjects.length ? (
                    <CollectionGrid className="canvas-library-grid">
                        {!keyword.trim() && projectFilter === "all" ? <CanvasCreateCard disabled={!hydrated} onClick={() => createAndEnter(true)} /> : null}
                        {visibleProjects.map((project) => (
                            <CanvasFolderCard
                                key={project.id}
                                project={project}
                                displayTitle={displayedShowcaseProjectTitle(project, locale)}
                                projectName={project.projectId ? projectNames.get(project.projectId) || t("canvasExtra.library.unsyncedProject") : undefined}
                                onClick={enterProject}
                                onPrefetch={preloadProject}
                                opening={openingProjectId === project.id}
                            />
                        ))}
                    </CollectionGrid>
                ) : (
                    <WorkspaceState icon="canvas" title={keyword || projectFilter !== "all" ? t("canvasExtra.library.noMatches") : t("canvasExtra.library.emptyTitle")} description={keyword || projectFilter !== "all" ? t("canvasExtra.library.noMatchesHint") : t("canvasExtra.library.emptyDescription")} action={!keyword && projectFilter === "all" ? <Button type="primary" icon={<Plus />} disabled={!hydrated} onClick={() => createAndEnter(true)}>{t("canvasExtra.library.newCanvas")}</Button> : undefined} />
                )}
                {hydrated && visibleProjects.length ? (
                    <div ref={loadMoreRef} className="library-load-more" aria-live="polite">
                        {libraryQuery.isFetchNextPageError ? (
                            <Button onClick={() => void libraryQuery.fetchNextPage()}>{t("canvasExtra.library.loadMoreFailed")}</Button>
                        ) : hasMore ? (
                            t("canvasExtra.library.scrollForMore")
                        ) : (
                            t("canvasExtra.library.allLoaded", { count: filteredProjects.length })
                        )}
                    </div>
                ) : null}
            </div>

            <input ref={inputRef} type="file" accept="application/zip,.zip" className="hidden" onChange={(event) => void importCanvas(event.target.files?.[0])} />
            <Modal
                title={t("canvasExtra.library.addToProject")}
                open={associationOpen}
                okText={t("canvasExtra.library.saveAssociation")}
                cancelText={t("canvasExtra.deleteProjects.cancel")}
                okButtonProps={{ disabled: !associationProjectId, loading: projectQuery.isFetching }}
                onCancel={() => setAssociationOpen(false)}
                onOk={() => void associateSelected()}
            >
                <p className="mb-3 text-sm text-foreground/60">{t("canvasExtra.library.associationHint")}</p>
                <Select
                    className="w-full"
                    value={associationProjectId || undefined}
                    placeholder={t("canvasExtra.library.selectProject")}
                    options={(projectQuery.data?.projects || []).map((item) => ({ label: item.project.name, value: item.project.id }))}
                    onChange={setAssociationProjectId}
                />
            </Modal>
            <CanvasHistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} />
        </WorkspacePage>
    );
}
