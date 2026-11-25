import "@/styles/projects-route.css";
import type { MessageKey } from "@/i18n/messages";
import { useI18n } from "@/i18n/use-i18n";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Tooltip } from "antd";
import { ArrowLeft, BookOpenText, Clapperboard, Images, LayoutDashboard, LayoutGrid, Plus, Settings2, type LucideIcon } from "lucide-react";
import { Link, Navigate, useNavigate, useParams } from "react-router";

import { createCanvasProjectWithRemoteSync } from "@/services/user-data-sync";
import { guestProjectCanvasId } from "@/services/guest-projects";
import { useUserStore } from "@/stores/use-user-store";
import { lazy, Suspense, useEffect } from "react";
import { getProjectCore, getProjectOverview, getProjectUnitWorkspace, linkCanvasUnit, listProjectUnits } from "@/services/api/projects";
import { WorkspacePage } from "@/components/layout/workspace-page";
import { WorkspaceErrorState, WorkspaceLoadingState } from "@/components/layout/workspace-state";
import { useWorkspaceTopBarExtension } from "@/components/layout/workspace-top-bar-extension";
import { upsertProjectChapterStoryboard } from "@/lib/canvas/project-chapter-storyboard";
import type { ProjectDetail } from "@/services/api/projects";

import ProjectAssetsView from "./detail/assets";
import ProjectCanvasesView from "./detail/canvases";
import ProjectChaptersView from "./detail/chapters";
import ProjectOverviewView from "./detail/overview";
import ProjectSettingsView from "./detail/settings";
import ProjectWorkflowView from "./detail/workflow";
import { WorkflowChapterNavigator } from "./detail/workflow-chapter-navigator";

const DramaStudioPage = lazy(() => import("@/pages/drama/route-loader").then((m) => m.loadDramaStudioPage()));

type DetailView = "overview" | "chapters" | "workflow" | "canvases" | "assets" | "settings";

const views: Array<{ key: DetailView; label: MessageKey; shortLabel: MessageKey; icon: LucideIcon }> = [
    { key: "overview", label: "projectDetail.overview", shortLabel: "projectDetail.overviewShort", icon: LayoutDashboard },
    { key: "chapters", label: "projectDetail.chapters", shortLabel: "projectDetail.chaptersShort", icon: BookOpenText },
    { key: "workflow", label: "projectDetail.workflow", shortLabel: "projectDetail.workflowShort", icon: Clapperboard },
    { key: "canvases", label: "projectDetail.canvases", shortLabel: "projectDetail.canvasesShort", icon: LayoutGrid },
    { key: "assets", label: "projectDetail.assets", shortLabel: "projectDetail.assetsShort", icon: Images },
    { key: "settings", label: "projectDetail.settings", shortLabel: "projectDetail.settingsShort", icon: Settings2 },
];

export default function ProjectDetailPage() {
    const signedIn = useUserStore((state) => Boolean(state.user?.id));
    return signedIn ? <SignedInProjectDetailPage /> : <GuestProjectDetailRedirect />;
}

function GuestProjectDetailRedirect() {
    const { projectId = "" } = useParams();
    const navigate = useNavigate();
    useEffect(() => {
        void guestProjectCanvasId(projectId)
            .then((canvasId) => navigate(canvasId ? `/canvas/${canvasId}` : "/projects", { replace: true }))
            .catch(() => navigate("/projects", { replace: true }));
    }, [navigate, projectId]);
    return null;
}

function SignedInProjectDetailPage() {
    const { projectId = "", view, chapterId, unitId, stage, episodeId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { t, number } = useI18n();
    const { message } = App.useApp();
    const activeView: DetailView = unitId || view === "workflow" ? "workflow" : chapterId ? "chapters" : views.some((item) => item.key === view) ? (view as DetailView) : "overview";
    const coreQuery = useQuery({
        queryKey: ["project", projectId, "core"],
        queryFn: () => getProjectCore(projectId),
        enabled: Boolean(projectId),
        refetchOnMount: "always",
    });
    const isDramaPipeline = coreQuery.data?.project.type === "drama-pipeline" || Boolean(episodeId);
    const unitsQuery = useQuery({ queryKey: ["project", projectId, "units"], queryFn: () => listProjectUnits(projectId), enabled: Boolean(projectId) && !isDramaPipeline });
    const units = unitsQuery.data?.units || [];
    const firstUnitId = units.slice().sort((left, right) => left.position - right.position)[0]?.id || "";
    const requestedUnitId = chapterId || unitId || "";
    const activeUnitId = units.some((unit) => unit.id === requestedUnitId) ? requestedUnitId : firstUnitId;
    const overviewQuery = useQuery({ queryKey: ["project", projectId, "overview"], queryFn: () => getProjectOverview(projectId), enabled: Boolean(projectId) && activeView === "overview" && !isDramaPipeline });
    const workspaceQuery = useQuery({
        queryKey: ["project", projectId, "unit-workspace", activeUnitId],
        queryFn: () => getProjectUnitWorkspace(projectId, activeUnitId),
        enabled: Boolean(projectId && activeUnitId) && (activeView === "chapters" || activeView === "workflow") && !isDramaPipeline,
        refetchInterval: (query) => ((query.state.data?.tasks || []).some((task) => task.clientContext?.shotId && (task.status === "queued" || task.status === "running")) ? 2_000 : false),
    });
    const project = coreQuery.data?.project;
    const workspace = workspaceQuery.data;
    const detail: ProjectDetail | undefined =
        project && !isDramaPipeline
            ? {
                  project,
                  units: workspace?.unit ? units.map((unit) => (unit.id === workspace.unit.id ? workspace.unit : unit)) : units,
                  canvases: [],
                  canvasUnitLinks: [],
                  unitCanvasCounts: unitsQuery.data?.canvasCounts || {},
                  assets: workspace?.assets || [],
                  assetFolders: [],
                  workflows: workspace?.workflows || [],
                  shots: workspace?.shots || [],
                  shotRevisions: workspace?.shotRevisions || [],
                  shotArtifacts: workspace?.shotArtifacts || [],
                  shotReferences: workspace?.shotReferences || [],
                  assetCandidates: workspace?.assetCandidates || [],
                  tasks: workspace?.tasks || [],
              }
            : undefined;
    const refreshProject = () => {
        void queryClient.invalidateQueries({ queryKey: ["project", projectId] });
        void queryClient.invalidateQueries({ queryKey: ["projects"] });
    };
    const createCanvas = () => {
        if (detail?.project.status === "archived") {
            message.warning(t("projectDetail.archivedRestore"));
            return;
        }
        const activeChapterId = chapterId || sessionStorage.getItem(`project-active-chapter:${projectId}`) || "";
        const unit = activeView === "chapters" ? detail?.units.find((item) => item.id === activeChapterId) || detail?.units.slice().sort((left, right) => left.position - right.position)[0] : undefined;
        const shots = unit ? detail?.shots.filter((shot) => shot.unitId === unit.id) || [] : [];
        const seed = unit && shots.length ? upsertProjectChapterStoryboard([], [], { unit, shots }) : undefined;
        const initialContent = seed ? { nodes: seed.nodes, connections: seed.connections } : undefined;
        const title = unit ? t(shots.length ? "projectDetail.chapterStoryboardName" : "projectDetail.chapterCanvasName", { title: unit.title }) : t("projectDetail.projectCanvasName", { title: detail?.project.name || t("projectDetail.projectFallback") });
        void createCanvasProjectWithRemoteSync(title, projectId, initialContent)
            .then(async ({ id, syncError }) => {
                if (syncError) {
                    message.warning(syncError instanceof Error ? t("projectDetail.localSavedDetail", { detail: syncError.message }) : t("projectDetail.localSaved"));
                    navigate(`/canvas/${id}`);
                    return;
                }
                if (unit) {
                    try {
                        await linkCanvasUnit(projectId, { canvasId: id, unitId: unit.id, role: "storyboard" });
                    } catch (error) {
                        refreshProject();
                        message.error(error instanceof Error ? t("projectDetail.linkFailedDetail", { detail: error.message }) : t("projectDetail.linkFailed"));
                        return;
                    }
                }
                refreshProject();
                message.success(unit && shots.length ? t("projectDetail.importedShots", { count: number(shots.length) }) : unit ? t("projectDetail.chapterCreated") : t("projectDetail.projectCreated"));
                navigate(`/canvas/${id}`);
            })
            .catch((error) => message.error(error instanceof Error ? error.message : t("projectDetail.createFailed")));
    };
    const chapterHref = detail ? projectChapterHref(detail.units, projectId, chapterId) : `/projects/${projectId}/chapters`;
    const workflowHref = detail ? projectWorkflowHref(detail.units, projectId, unitId, stage) : `/projects/${projectId}/workflow`;
    useWorkspaceTopBarExtension(detail ? <ProjectWorkspaceTopBar detail={detail} projectId={projectId} activeView={activeView} unitId={unitId} stage={stage} chapterHref={chapterHref} workflowHref={workflowHref} onCreateCanvas={createCanvas} /> : null);
    if (isDramaPipeline)
        return (
            <Suspense
                fallback={
                    <WorkspacePage>
                        <WorkspaceLoadingState label={t("projectDetail.loading")} detail={t("projectDetail.loadingIndex")} />
                    </WorkspacePage>
                }
            >
                <DramaStudioPage />
            </Suspense>
        );
    if (coreQuery.isLoading || unitsQuery.isLoading)
        return (
            <WorkspacePage>
                <WorkspaceLoadingState label={t("projectDetail.loading")} detail={t("projectDetail.loadingIndex")} />
            </WorkspacePage>
        );
    if (coreQuery.isError || unitsQuery.isError || !detail)
        return (
            <WorkspacePage>
                <WorkspaceErrorState title={t("projectDetail.unavailable")} description={t("projectDetail.unavailableHelp")} actionLabel={t("projectDetail.backCenter")} onRetry={() => navigate("/projects")} />
            </WorkspacePage>
        );
    if (!chapterId && !unitId && (!view || !views.some((item) => item.key === view))) return <Navigate to={`/projects/${projectId}/overview`} replace />;
    if (chapterId && !units.some((unit) => unit.id === chapterId)) return <Navigate to={firstUnitId ? `/projects/${projectId}/chapters/${firstUnitId}` : `/projects/${projectId}/chapters`} replace />;
    if (unitId && !units.some((unit) => unit.id === unitId)) return <Navigate to={firstUnitId ? `/projects/${projectId}/workflow/${firstUnitId}/${stage || "video"}` : `/projects/${projectId}/workflow`} replace />;
    if (activeView === "workflow" && !unitId && detail.units.length) return <Navigate to={`/projects/${projectId}/workflow/${detail.units.slice().sort((left, right) => left.position - right.position)[0].id}/video`} replace />;
    return (
        <WorkspacePage className="project-workbench-page !overflow-hidden" fluid>
            <div className="flex h-full min-h-0 flex-col">
                {detail.project.status === "archived" ? <Alert type="warning" showIcon banner message={t("projectDetail.archivedBanner")} className="!border-x-0 !border-t-0" /> : null}
                <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                    <div className={activeView === "chapters" || activeView === "workflow" ? "min-h-0 flex-1" : "thin-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-5 lg:px-8 lg:py-7"}>
                        <div className={activeView === "overview" ? "w-full" : activeView === "chapters" || activeView === "workflow" ? "h-full w-full" : "w-full"}>
                            {activeView === "overview" ? (
                                overviewQuery.isLoading ? (
                                    <WorkspaceLoadingState label={t("projectDetail.loadingProgress")} detail={t("projectDetail.aggregateOnly")} />
                                ) : overviewQuery.data ? (
                                    <ProjectOverviewView detail={detail} overview={overviewQuery.data} refreshProject={refreshProject} onCreateCanvas={createCanvas} />
                                ) : (
                                    <WorkspaceErrorState title={t("projectDetail.overviewFailed")} description={t("projectDetail.retryLater")} onRetry={() => void overviewQuery.refetch()} />
                                )
                            ) : null}
                            {activeView === "chapters" ? (
                                workspaceQuery.isLoading ? (
                                    <WorkspaceLoadingState label={t("projectDetail.loadingChapter")} detail={t("projectDetail.byChapter")} />
                                ) : workspaceQuery.isError ? (
                                    <WorkspaceErrorState title={t("projectDetail.chapterFailed")} description={t("projectDetail.chapterUnavailable")} onRetry={() => void workspaceQuery.refetch()} />
                                ) : (
                                    <ProjectChaptersView detail={detail} refreshProject={refreshProject} onCreateCanvas={createCanvas} />
                                )
                            ) : null}
                            {activeView === "workflow" ? (
                                workspaceQuery.isLoading ? (
                                    <WorkspaceLoadingState label={t("projectDetail.loadingShots")} detail={t("projectDetail.chapterOnly")} />
                                ) : workspaceQuery.isError ? (
                                    <WorkspaceErrorState title={t("projectDetail.workflowFailed")} description={t("projectDetail.workflowUnavailable")} onRetry={() => void workspaceQuery.refetch()} />
                                ) : (
                                    <ProjectWorkflowView detail={detail} projectId={projectId} unitId={unitId || ""} stage={stage || "video"} />
                                )
                            ) : null}
                            {activeView === "canvases" ? <ProjectCanvasesView detail={detail} refreshProject={refreshProject} onCreateCanvas={createCanvas} /> : null}
                            {activeView === "assets" ? <ProjectAssetsView detail={detail} refreshProject={refreshProject} onCreateCanvas={createCanvas} /> : null}
                            {activeView === "settings" ? <ProjectSettingsView detail={detail} refreshProject={refreshProject} onCreateCanvas={createCanvas} /> : null}
                        </div>
                    </div>
                </main>
            </div>
        </WorkspacePage>
    );
}

function ProjectWorkspaceTopBar({
    detail,
    projectId,
    activeView,
    unitId,
    stage,
    chapterHref,
    workflowHref,
    onCreateCanvas,
}: {
    detail: ProjectDetail;
    projectId: string;
    activeView: DetailView;
    unitId?: string;
    stage?: string;
    chapterHref: string;
    workflowHref: string;
    onCreateCanvas: () => void;
}) {
    const { t } = useI18n();
    const navigate = useNavigate();
    return (
        <div className="project-workspace-topbar flex min-w-0 items-center gap-2">
            <button
                type="button"
                onClick={() => navigate("/projects")}
                className="grid size-8 shrink-0 place-items-center rounded-md text-foreground/42 transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={t("projectDetail.back")}
                title={t("projectDetail.back")}
            >
                <ArrowLeft className="size-4" />
            </button>
            <div className="hidden min-w-0 items-center gap-2 md:flex lg:w-44 xl:w-56">
                <h1 className="min-w-0 truncate text-[var(--fs-caption)] font-semibold text-foreground/90">{detail.project.name}</h1>
                <span className={`size-1.5 shrink-0 rounded-full ${detail.project.status === "archived" ? "bg-foreground/30" : "bg-[var(--workspace-accent)]"}`} />
                <span className="hidden shrink-0 text-[var(--fs-tiny)] text-foreground/42 xl:inline">{detail.project.status === "archived" ? t("projectDetail.archived") : t("projectDetail.active")}</span>
            </div>
            <nav className="thin-scrollbar flex h-11 min-w-0 flex-1 items-center gap-0.5 overflow-x-auto" aria-label={t("projectDetail.navigation")}>
                {views.map((item) => {
                    const Icon = item.icon;
                    const active = item.key === activeView;
                    const href = item.key === "chapters" ? chapterHref : item.key === "workflow" ? workflowHref : `/projects/${projectId}/${item.key}`;
                    return (
                        <Link
                            key={item.key}
                            to={href}
                            className={`relative flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-[var(--fs-caption)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring xl:px-2.5 ${active ? "bg-[var(--workspace-accent-soft)] font-medium text-foreground after:absolute after:inset-x-2.5 after:bottom-0 after:h-0.5 after:rounded-full after:bg-[var(--workspace-accent)]" : "text-foreground/52 hover:bg-surface-hover hover:text-foreground"}`}
                            aria-current={active ? "page" : undefined}
                        >
                            <Icon className={`size-3.5 shrink-0 ${active ? "text-[var(--workspace-accent)]" : "text-foreground/45"}`} />
                            <span className="xl:hidden">{t(item.shortLabel)}</span>
                            <span className="hidden xl:inline">{t(item.label)}</span>
                        </Link>
                    );
                })}
            </nav>
            {activeView === "workflow" ? (
                <WorkflowChapterNavigator projectId={projectId} units={detail.units} unitId={unitId} stage={stage} />
            ) : (
                <Tooltip title={activeView === "chapters" && detail.units.length ? t("projectDetail.newChapterCanvas") : t("projectDetail.newProjectCanvas")}>
                    <Button
                        size="small"
                        className="!h-8 !shrink-0 !px-2 xl:!px-3"
                        icon={<Plus className="size-3.5" />}
                        onClick={onCreateCanvas}
                        aria-label={activeView === "chapters" && detail.units.length ? t("projectDetail.newChapterCanvas") : t("projectDetail.newProjectCanvas")}
                    >
                        <span className="hidden xl:inline">{t("projectDetail.newCanvas")}</span>
                    </Button>
                </Tooltip>
            )}
        </div>
    );
}

function projectWorkflowHref(units: Array<{ id: string; position: number }>, projectId: string, routeUnitId?: string, routeStage?: string) {
    const targetId = [routeUnitId, sessionStorage.getItem(`project-active-chapter:${projectId}`) || ""].find((id) => id && units.some((unit) => unit.id === id)) || units.slice().sort((left, right) => left.position - right.position)[0]?.id;
    return targetId ? `/projects/${projectId}/workflow/${targetId}/${routeStage || "video"}` : `/projects/${projectId}/workflow`;
}

function projectChapterHref(units: Array<{ id: string; position: number }>, projectId: string, routeChapterId?: string) {
    const rememberedId = sessionStorage.getItem(`project-active-chapter:${projectId}`) || "";
    const targetId = [routeChapterId, rememberedId].find((id) => id && units.some((unit) => unit.id === id)) || units.slice().sort((left, right) => left.position - right.position)[0]?.id;
    return targetId ? `/projects/${projectId}/chapters/${targetId}` : `/projects/${projectId}/chapters`;
}
