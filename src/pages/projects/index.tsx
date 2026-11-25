import "@/styles/projects-route.css";
import { formatFullTime, formatRelativeTime } from "@/lib/display-format";
import { projectWorkspaceHref } from "@/lib/project-workspace-href";
import { useI18n } from "@/i18n/use-i18n";
import { styleDisplayMetadata } from "@/i18n/style-metadata";
import { resolveAppLocale, type AppLocale } from "@/i18n/app-locale";
import { translateMessage } from "@/i18n/messages";
import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { App, Button, Dropdown, type MenuProps } from "antd";
import { ArrowRight, BookOpenText, Clapperboard, Lock, MoreHorizontal, Plus, Search, Trash2 } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router";

import { WorkspacePage } from "@/components/layout/workspace-page";
import { WorkspaceErrorState, WorkspaceLoadingState, WorkspaceState } from "@/components/layout/workspace-state";
import { resolveCanvasStylePreset, resolveProjectCanvasStyle } from "@/components/canvas/canvas-style-picker-modal";
import { resourceFileUrl } from "@/services/api/resources";
import { parseStyleProfile } from "@/lib/canvas/style-profile";
import { deleteProject, listProjects, type ProjectSummary } from "@/services/api/projects";
import { deleteGuestProject, listGuestProjects, type GuestProjectSummary } from "@/services/guest-projects";
import { useUserStore } from "@/stores/use-user-store";
import { projectsPageQueryKey } from "@/lib/bootstrap-cache";

import { WESTERN_HOME_SHOWS } from "../home/western-opening-works";
import "./projects-figma-gallery.css";

export default function ProjectsPage() {
    const { t, number, locale } = useI18n();
    const navigate = useNavigate();
    const signedIn = useUserStore((state) => Boolean(state.user?.id));
    const queryClient = useQueryClient();
    const { message, modal } = App.useApp();
    const [searchParams] = useSearchParams();
    const [keyword, setKeyword] = useState("");
    const [status, setStatus] = useState<"all" | "active" | "completed">("all");
    const [dragging, setDragging] = useState(false);

    useEffect(() => {
        if (searchParams.get("create") === "1") {
            navigate("/projects/create", { replace: true });
        }
    }, [searchParams, navigate]);

    const loadMoreRef = useRef<HTMLDivElement>(null);
    const query = useInfiniteQuery({
        queryKey: projectsPageQueryKey(signedIn),
        queryFn: ({ pageParam }) => (signedIn ? listProjects({ page: pageParam, pageSize: 50 }) : listGuestProjects()),
        initialPageParam: 1,
        getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            if (signedIn) await deleteProject(id);
            else await deleteGuestProject(id);
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["projects"] });
            message.success(t("projectLibrary.deleted"));
        },
        onError: (error) => message.error(error instanceof Error ? error.message : t("projectLibrary.deleteFailed")),
    });

    const confirmDeleteProject = (projectId: string, name: string) => {
        modal.confirm({
            title: t("projectLibrary.delete"),
            content: t("projectLibrary.deleteConfirm", { name }),
            okText: t("common.delete"),
            okButtonProps: { danger: true, loading: deleteMutation.isPending },
            cancelText: t("common.cancel"),
            onOk: () => deleteMutation.mutate(projectId),
        });
    };

    const allProjects = useMemo(() => query.data?.pages.flatMap((page) => page.projects) || [], [query.data]);
    const rows = useMemo(() => {
        const normalizedKeyword = keyword.trim().toLowerCase();
        return [...allProjects]
            .filter((row) => {
                const isCompleted = row.project.status === "archived" || (row.completedUnitCount >= row.unitCount && row.unitCount > 0);
                if (status === "active") return !isCompleted;
                if (status === "completed") return isCompleted;
                return true;
            })
            .filter(({ project }) => {
                if (!normalizedKeyword) return true;
                const styleTitle = parseStyleProfile(project.styleProfileJson)?.title || resolveCanvasStylePreset(project.stylePresetId)?.title || "";
                const style = resolveProjectCanvasStyle(project.stylePresetId, project.styleProfileJson);
                const displayTitle = style ? styleDisplayMetadata(style, t, locale).title : "";
                const searchable = `${project.name} ${project.description || ""} ${project.stylePresetId || ""} ${styleTitle} ${displayTitle}`.toLowerCase();
                return searchable.includes(normalizedKeyword);
            })
            .sort((left, right) => right.project.updatedAt.localeCompare(left.project.updatedAt));
    }, [allProjects, keyword, status, t, locale]);

    const totalProjectCount = query.data?.pages[0]?.total ?? allProjects.length;

    useEffect(() => {
        const node = loadMoreRef.current;
        if (!node || !query.hasNextPage || query.isError) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry?.isIntersecting && !query.isFetchingNextPage) void query.fetchNextPage();
            },
            { rootMargin: "600px" },
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, [query.fetchNextPage, query.hasNextPage, query.isError, query.isFetchingNextPage]);

    const hasInitialError = query.isError && !query.data;

    const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setDragging(false);
        const file = event.dataTransfer.files?.[0];
        if (file) {
            navigate("/projects/create", { state: { file } });
        }
    };

    return (
        <WorkspacePage className="project-drama-page">
            <div
                className={`w-full min-h-full ${dragging ? "is-drag-over" : ""}`}
                onDragOver={(event: React.DragEvent<HTMLDivElement>) => {
                    event.preventDefault();
                    setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
            >
                <header className="drama-gallery-header">
                    <div className="drama-gallery-title-wrap">
                        <h1>{t("projectLibrary.title")}</h1>
                        <p>{t("projectLibrary.subtitle")}</p>
                    </div>
                    <div className="drama-gallery-header-actions">
                        <button type="button" className="drama-gallery-create-btn" onClick={() => navigate("/projects/create")}>
                            <Plus className="size-4" />
                            <span>{t("projectLibrary.create")}</span>
                        </button>
                    </div>
                </header>

                <div className="drama-gallery-toolbar">
                    <div className="drama-gallery-filter-segment" role="tablist" aria-label={t("projectLibrary.filter")}>
                        <button type="button" className={`drama-gallery-filter-btn ${status === "all" ? "is-active" : ""}`} onClick={() => setStatus("all")}>
                            {t("projectLibrary.all")}
                        </button>
                        <button type="button" className={`drama-gallery-filter-btn ${status === "active" ? "is-active" : ""}`} onClick={() => setStatus("active")}>
                            {t("projectLibrary.active")}
                        </button>
                        <button type="button" className={`drama-gallery-filter-btn ${status === "completed" ? "is-active" : ""}`} onClick={() => setStatus("completed")}>
                            {t("tasks.done")}
                        </button>
                    </div>

                    <div className="drama-gallery-search-shell">
                        <Search className="size-4 text-foreground/40 shrink-0" />
                        <input type="text" className="drama-gallery-search-input" value={keyword} placeholder={t("projectLibrary.search")} onChange={(event) => setKeyword(event.target.value)} />
                    </div>
                </div>

                {hasInitialError ? <WorkspaceErrorState description={query.error instanceof Error ? query.error.message : t("projectLibrary.loadFailed")} onRetry={() => void query.refetch()} /> : null}

                {query.isLoading ? <WorkspaceLoadingState label={t("projectLibrary.loading")} detail={t("projectLibrary.loadingDetail")} /> : null}

                {!query.isLoading && !hasInitialError && (
                    <div className="drama-gallery-grid">
                        <div
                            className="drama-card-dashed-create"
                            onClick={() => navigate("/projects/create")}
                            role="button"
                            tabIndex={0}
                            aria-label={t("projectLibrary.create")}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") navigate("/projects/create");
                            }}
                        >
                            <div className="drama-dashed-create-icon">
                                <Plus className="size-6" />
                            </div>
                            <div className="drama-dashed-create-title">{t("projectLibrary.create")}</div>
                            <div className="drama-dashed-create-desc">{t("projectLibrary.createHelp")}</div>
                        </div>

                        {rows.map((row) => (
                            <ProjectDramaCard key={row.project.id} row={row} onDelete={() => confirmDeleteProject(row.project.id, row.project.name)} />
                        ))}
                    </div>
                )}

                {!query.isLoading && !hasInitialError && rows.length === 0 && (keyword || status !== "all") ? (
                    <WorkspaceState
                        icon="projects"
                        title={t("projectLibrary.noMatch")}
                        description={t("projectLibrary.adjustSearch")}
                        action={
                            <Button
                                type="default"
                                onClick={() => {
                                    setKeyword("");
                                    setStatus("all");
                                }}
                            >
                                {t("projectLibrary.clearFilters")}
                            </Button>
                        }
                    />
                ) : null}

                {!query.isLoading && !hasInitialError ? (
                    <div ref={loadMoreRef} className="library-load-more" aria-live="polite">
                        {query.isFetchingNextPage ? (
                            t("projectLibrary.loadingMore")
                        ) : query.isError ? (
                            <button type="button" onClick={() => void query.fetchNextPage()}>
                                {t("projectLibrary.retryMore")}
                            </button>
                        ) : query.hasNextPage ? (
                            t("projectLibrary.scrollMore")
                        ) : allProjects.length > 4 ? (
                            t("projectLibrary.allLoaded", { count: number(totalProjectCount) })
                        ) : null}
                    </div>
                ) : null}

                <div className="project-library-lock-notice">
                    <Lock className="size-3.5" aria-hidden />
                    <span>{t("projectLibrary.isolation")}</span>
                </div>

                {!keyword && status === "all" ? <CaseProjectLibrary /> : null}
            </div>
        </WorkspacePage>
    );
}

function ProjectDramaCard({ row, onDelete }: { row: ProjectSummary | GuestProjectSummary; onDelete: () => void }) {
    const { t, locale, number } = useI18n();
    const navigate = useNavigate();
    const project = row.project;
    const isPipeline = project.type === "drama-pipeline";
    const guestCanvasHref = "canvasId" in row ? `/canvas/${row.canvasId}` : "";
    const projectStyle = resolveProjectCanvasStyle(project.stylePresetId, project.styleProfileJson);
    const coverUrl = project.coverResourceId ? resourceFileUrl(project.coverResourceId) : projectStyle?.imageUrl;

    const isCompleted = project.status === "archived" || (row.completedUnitCount >= row.unitCount && row.unitCount > 0);
    const totalUnits = row.unitCount;
    const completedUnits = Math.min(row.completedUnitCount, totalUnits);
    const progressPercent = totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;
    const timeFormatted = formatProjectRelativeTime(project.updatedAt, locale);
    const primaryHref = guestCanvasHref || projectWorkspaceHref(project, isPipeline ? "overview" : "chapters");

    const menuItems: MenuProps["items"] = [
        {
            key: "overview",
            icon: <ArrowRight className="size-3.5" />,
            label: t("projectLibrary.overview"),
            onClick: () => navigate(guestCanvasHref || projectWorkspaceHref(project, "overview")),
        },
        {
            key: "chapters",
            icon: <BookOpenText className="size-3.5" />,
            label: t("projectLibrary.chapters"),
            onClick: () => navigate(guestCanvasHref || projectWorkspaceHref(project, "chapters")),
        },
        {
            type: "divider",
        },
        {
            key: "delete",
            icon: <Trash2 className="size-3.5" />,
            label: t("projectLibrary.delete"),
            danger: true,
            onClick: onDelete,
        },
    ];

    const styleTitle = projectStyle ? styleDisplayMetadata(projectStyle, t, locale).title : t("projectLibrary.noStyle");
    const premiseText = project.description || t("projectLibrary.noPremise");

    return (
        <article className="drama-gallery-card">
            <Link to={primaryHref} className="drama-card-poster-area" aria-label={project.name}>
                {coverUrl ? (
                    <img className="drama-card-poster-img" src={coverUrl} alt="" loading="lazy" />
                ) : (
                    <div className="project-drama-cover-placeholder">
                        <Clapperboard className="size-8" />
                        <span className="text-xs font-mono">{project.aspectRatio || "9:16"}</span>
                    </div>
                )}
                <div className="drama-card-poster-overlay" />
                <span className="drama-card-tag-genre">{styleTitle}</span>
                <span className="drama-card-tag-aspect">{project.aspectRatio || "9:16"}</span>
            </Link>

            <div className="drama-card-meta-body">
                <div>
                    <div className="drama-card-header-row">
                        <Link to={primaryHref} className="drama-card-title" title={project.name}>
                            {project.name}
                        </Link>
                        <Dropdown menu={{ items: menuItems }} trigger={["click"]} placement="bottomRight">
                            <button type="button" className="project-drama-more-btn" aria-label={t("projectLibrary.actions", { name: project.name })}>
                                <MoreHorizontal className="size-4" />
                            </button>
                        </Dropdown>
                    </div>

                    <p className="drama-card-synopsis">{premiseText}</p>
                </div>

                <div>
                    <div className="drama-card-progress-box">
                        <div className="drama-card-progress-labels">
                            <span>{t("projectLibrary.progress")}</span>
                            <strong>{totalUnits > 0 ? t("projectLibrary.completed", { completed: number(completedUnits), total: number(totalUnits) }) : t("projectLibrary.noChapters")}</strong>
                        </div>
                        <div className="drama-card-progress-track">
                            <div className={`drama-card-progress-bar ${isCompleted ? "is-completed" : ""}`} style={{ width: `${progressPercent}%` }} />
                        </div>
                    </div>

                    <div className="drama-card-foot-row">
                        <time dateTime={project.updatedAt} title={formatFullTime(project.updatedAt, locale)}>
                            {timeFormatted}
                        </time>
                        <Link to={primaryHref} className="drama-card-enter-action">
                            {isCompleted ? t("projectLibrary.view") : t("projectLibrary.enter")}
                        </Link>
                    </div>
                </div>
            </div>
        </article>
    );
}

export function formatProjectRelativeTime(dateString: string, locale: AppLocale = resolveAppLocale()): string {
    const t = (key: Parameters<typeof translateMessage>[1], values?: Parameters<typeof translateMessage>[2]) => translateMessage(locale, key, values);
    if (!dateString) return t("projectLibrary.justNow");
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return t("projectLibrary.justNow");
    return formatRelativeTime(date, locale);
}

const FEATURED_CASES = WESTERN_HOME_SHOWS.filter((show) => show.categories.includes("专业影视") || show.categories.includes("短剧漫剧")).slice(0, 4);

function CaseProjectLibrary() {
    const { t } = useI18n();
    return (
        <section className="project-case-library" aria-labelledby="project-case-library-title">
            <header className="project-case-library-head">
                <div>
                    <span>{t("projectLibrary.cases")}</span>
                    <h2 id="project-case-library-title">{t("projectLibrary.casesTitle")}</h2>
                    <p>{t("projectLibrary.casesHelp")}</p>
                </div>
                <Link to="/home" className="project-case-library-more">
                    {t("projectLibrary.allCases")}
                    <ArrowRight className="size-3.5" />
                </Link>
            </header>
            <div className="project-case-grid">
                {FEATURED_CASES.map((show) => (
                    <Link key={show.templateUuid} to={show.detailHref} className="project-case-card">
                        <span className="project-case-cover">
                            <img src={show.cardSrc} alt="" loading="lazy" decoding="async" />
                            <span className="project-case-cover-scrim" />
                            <span className="project-case-cover-tag">{show.categories[0] || t("projectLibrary.publicCase")}</span>
                        </span>
                        <span className="project-case-body">
                            <strong title={show.title}>{show.title}</strong>
                            <small>{show.description || t("projectLibrary.caseFallback")}</small>
                            <span className="project-case-meta">
                                {t("projectLibrary.caseAction", { author: show.author || "LibTV 公开作品" })}
                                <ArrowRight className="size-3.5" />
                            </span>
                        </span>
                    </Link>
                ))}
            </div>
        </section>
    );
}
