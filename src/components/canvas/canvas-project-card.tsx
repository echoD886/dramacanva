import { Check, CloudUpload, Download, MoreHorizontal, Pencil, Plus, Trash2, X } from "lucide-react";
import { type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Dropdown, Input } from "antd";

import { useCanvasStore, type CanvasProject } from "@/stores/canvas/use-canvas-store";
import { useCanvasUiStore } from "@/stores/canvas/use-canvas-ui-store";
import { exportCanvasProjects } from "@/lib/canvas/canvas-export";
import { CachedResourceImage } from "@/components/cached-resource-image";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/use-i18n";
import { resolveAppLocale, type AppLocale } from "@/i18n/app-locale";
import { translateMessage } from "@/i18n/messages";
import { useSyncProgressStore } from "@/stores/use-sync-progress-store";
import { CanvasCoverPreview, coverVisibleNodes } from "./canvas-cover-preview";
import { getResource, resourceIdFromStorageKey, resourceIdFromUrl } from "@/services/api/resources";
import { CanvasNodeType } from "@/types/canvas";
import { useResourceDelivery } from "@/hooks/use-resource-delivery";
import { useCoverVisible } from "./use-cover-visible";
import type { CanvasLibrarySummary } from "@/services/api/user-data";
export { projectPreviewMedia } from "./canvas-cover-preview";

type PreviewProject = Pick<CanvasProject, "id"> & Partial<Pick<CanvasProject, "nodes" | "connections" | "appearance" | "backgroundMode">> & Partial<Pick<CanvasLibrarySummary, "previewItems" | "coverUrl">> & { nodeCount: number };

function privatePreviewResourceId(url: string) {
    return url.includes("/public/resources/") ? "" : resourceIdFromUrl(url);
}

function SummaryPreviewImage({ url }: { url: string }) {
    const id = privatePreviewResourceId(url);
    const delivery = useResourceDelivery(id ? `resource:${id}` : "", Boolean(id), "thumbnail");
    // Keep the summary's existing img markup while sharing the full cover's
    // private Blob read; passing storageKey would introduce a layout wrapper.
    return <CachedResourceImage variant="thumbnail" src={id ? delivery.url : url} alt="" className="min-w-0 flex-1 object-contain" />;
}

export function CanvasCreateCard({ disabled, onClick }: { disabled?: boolean; onClick: () => void }) {
    const { t } = useI18n();
    return (
        <button type="button" className="app-canvas-create-card" disabled={disabled} onClick={onClick}>
            <span className="app-canvas-create-preview">
                <Plus className="app-canvas-create-icon" />
            </span>
            <span className="app-canvas-create-title">{t("canvasCard.create")}</span>
            <span className="app-canvas-create-meta">{t("canvasCard.startBlank")}</span>
        </button>
    );
}

export function CanvasProjectCard({ project, projectName, variant = "library", readOnly = false, footer }: { project: CanvasProject; projectName?: string; variant?: "library" | "recent"; readOnly?: boolean; footer?: ReactNode }) {
    const { t, locale, number } = useI18n();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const renameProject = useCanvasStore((state) => state.renameProject);
    const selectedIds = useCanvasUiStore((state) => state.selectedProjectIds);
    const editingId = useCanvasUiStore((state) => state.editingProjectId);
    const editingTitle = useCanvasUiStore((state) => state.editingProjectTitle);
    const startEditing = useCanvasUiStore((state) => state.startEditingProject);
    const setEditingTitle = useCanvasUiStore((state) => state.setEditingProjectTitle);
    const stopEditing = useCanvasUiStore((state) => state.stopEditingProject);
    const toggleSelected = useCanvasUiStore((state) => state.toggleSelectedProjectId);
    const setDeleteIds = useCanvasUiStore((state) => state.setDeleteProjectIds);
    const editing = editingId === project.id;
    const selected = selectedIds.includes(project.id);
    const open = () => navigate(`/canvas/${project.id}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`);
    const saveTitle = () => {
        renameProject(project.id, editingTitle);
        stopEditing();
    };

    const compact = variant === "recent";
    return (
        <article className={cn("app-canvas-project-card group h-full cursor-pointer", compact ? "is-recent" : "is-library", selected && "is-selected")} onClick={() => (!editing || readOnly) && open()}>
            <div className="app-canvas-project-preview relative">
                <button
                    type="button"
                    className={cn("canvas-project-preview-button block w-full overflow-hidden text-left", compact ? "aspect-[16/10]" : "aspect-video")}
                    onClick={(event) => {
                        event.stopPropagation();
                        open();
                    }}
                >
                    <ProjectPreview project={{ ...project, nodeCount: project.nodes.length }} />
                </button>
                {!compact && !readOnly ? (
                    <span className={`canvas-project-select ${selected ? "is-visible" : ""}`} onClick={(event) => event.stopPropagation()}>
                        <input type="checkbox" checked={selected} onChange={(event) => toggleSelected(project.id, event.target.checked)} className="app-canvas-project-checkbox" aria-label={t("canvasCard.select", { title: project.title })} />
                    </span>
                ) : null}
                <div className="canvas-project-cover-meta" aria-hidden="true">
                    <span className="canvas-project-node-count">{t("canvasCard.nodes", { count: number(project.nodes.length) })}</span>
                </div>
            </div>

            <div className={cn("app-canvas-project-body", compact ? "is-compact" : "")}>
                <div className="canvas-project-heading-row">
                    {editing && !readOnly ? (
                        <Input
                            className="canvas-project-title-input"
                            value={editingTitle}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => setEditingTitle(event.target.value)}
                            onKeyDown={(event) => event.key === "Enter" && saveTitle()}
                            autoFocus
                        />
                    ) : (
                        <button
                            type="button"
                            className="canvas-project-title-button"
                            onClick={(event) => {
                                event.stopPropagation();
                                open();
                            }}
                        >
                            <h2>{project.title}</h2>
                        </button>
                    )}
                    {editing && !readOnly ? (
                        <div className="canvas-project-actions" onClick={(event) => event.stopPropagation()}>
                            <button type="button" onClick={saveTitle} aria-label={t("canvasCard.saveName")}>
                                <Check className="size-3.5" />
                            </button>
                            <button type="button" onClick={stopEditing} aria-label={t("canvasCard.cancelRename")}>
                                <X className="size-3.5" />
                            </button>
                        </div>
                    ) : !readOnly ? (
                        <div className="canvas-project-actions" onClick={(event) => event.stopPropagation()}>
                            <button type="button" onClick={() => startEditing(project.id, project.title)} aria-label={t("canvasCard.renameTitle", { title: project.title })} title={t("canvasCard.rename")}>
                                <Pencil className="size-3.5" />
                            </button>
                            <Dropdown
                                trigger={["click"]}
                                menu={{
                                    onClick: ({ domEvent }) => domEvent.stopPropagation(),
                                    items: [
                                        { key: "export", icon: <Download className="size-3.5" />, label: t("canvasCard.export"), onClick: () => void exportCanvasProjects([project], project.title || t("canvasCard.canvas")) },
                                        { type: "divider" },
                                        { key: "delete", danger: true, icon: <Trash2 className="size-3.5" />, label: t("common.delete"), onClick: () => setDeleteIds([project.id]) },
                                    ],
                                }}
                            >
                                <button type="button" aria-label={t("canvasCard.actions", { title: project.title })} title={t("canvasCard.more")}>
                                    <MoreHorizontal className="size-4" />
                                </button>
                            </Dropdown>
                        </div>
                    ) : null}
                </div>
                <div className="canvas-project-stats">
                    <span>{projectName || t("canvasCard.free")}</span>
                    <span aria-hidden="true">·</span>
                    <time dateTime={project.updatedAt}>{formatProjectTime(project.updatedAt, locale)}</time>
                </div>
                {footer ? (
                    <div className="canvas-project-card-footer" onClick={(event) => event.stopPropagation()}>
                        {footer}
                    </div>
                ) : null}
            </div>
        </article>
    );
}

export function ProjectPreview({ project }: { project: PreviewProject }) {
    const { ref, visible } = useCoverVisible(() => {
        const nodes = useCanvasStore.getState().openProject(project.id)?.nodes || project.nodes;
        const ids = new Set((nodes
            ? coverVisibleNodes(nodes).filter(node => node.type === CanvasNodeType.Image).map(node => resourceIdFromStorageKey(node.metadata?.storageKey))
            : (project.previewItems || []).map(item => privatePreviewResourceId(item.thumbnailUrl))).filter(Boolean));
        for (const id of ids) void getResource(id).catch(() => undefined);
    });
    return <div ref={ref} className="absolute inset-0 overflow-hidden canvas-project-mapping" style={{ contentVisibility: "auto", containIntrinsicSize: "320px 180px" }}>{visible ? <VisibleProjectPreview project={project} /> : null}</div>;
}

function VisibleProjectPreview({ project }: { project: PreviewProject }) {
    const { t, number } = useI18n();
    const local = useCanvasStore(state => state.projects.find(p => p.id === project.id));
    const nodes = local?.nodes || project.nodes;
    const nodeCount = nodes ? nodes.length : project.nodeCount;
    const syncProgress = useSyncProgressStore((state) => state.syncingProjects[project.id]);
    const isSyncing = Boolean(syncProgress && (syncProgress.phase === "uploading" || syncProgress.phase === "saving"));
    const content = nodeCount ? nodes?.length ? <CanvasCoverPreview nodes={nodes} connections={local?.connections || project.connections} appearance={local?.appearance || project.appearance} backgroundMode={local?.backgroundMode || project.backgroundMode} /> : project.previewItems?.length ? <div className="flex size-full" data-cover-summary>{project.previewItems.map(item => <SummaryPreviewImage key={item.assetId} url={item.thumbnailUrl} />)}</div> : <div className="canvas-project-loading size-full" aria-busy="true" /> : <div className="canvas-project-empty size-full"><Plus className="canvas-project-empty-icon" /><span>{t("canvasCard.empty")}</span></div>;

    return (
        <div className="absolute inset-0 overflow-hidden">
            {content}
            {isSyncing && syncProgress ? (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-stone-950/75 p-3 text-center backdrop-blur-sm transition-all duration-300 pointer-events-none select-none" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5 text-amber-400">
                        <CloudUpload className="size-4 animate-bounce" />
                        <span className="text-xs font-medium tracking-wide">{t("canvasCard.syncing")}</span>
                    </div>
                    <div className="w-full max-w-[150px] space-y-1">
                        {syncProgress.total > 0 ? (
                            <>
                                <div className="flex items-center justify-between text-[10px] text-white/80">
                                    <span>{t("canvasCard.uploading")}</span>
                                    <span className="font-mono text-amber-300">
                                        {number(syncProgress.completed)}/{number(syncProgress.total)}
                                    </span>
                                </div>
                                <div className="h-1 w-full overflow-hidden rounded-full bg-white/20">
                                    <div
                                        className="h-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-200"
                                        style={{
                                            width: `${Math.max(8, Math.round((syncProgress.completed / syncProgress.total) * 100))}%`,
                                        }}
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="text-[10px] text-white/80">{t("canvasCard.saving")}</div>
                        )}
                        <div className="text-[9px] text-white/60">{t("canvasCard.keepOpen")}</div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

export function formatProjectTime(value: string, locale: AppLocale = resolveAppLocale()) {
    const timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp)) return translateMessage(locale, "canvasCard.justModified");
    const elapsed = Math.max(0, Date.now() - timestamp);
    const minutes = Math.floor(elapsed / 60000);
    if (minutes < 1) return translateMessage(locale, "canvasCard.justModified");
    const relative = (value: number, unit: Intl.RelativeTimeFormatUnit) => translateMessage(locale, "canvasCard.modifiedRelative", { time: new Intl.RelativeTimeFormat(locale, { numeric: "always" }).format(-value, unit) });
    if (minutes < 60) return relative(minutes, "minute");
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return relative(hours, "hour");
    const days = Math.floor(hours / 24);
    if (days < 7) return relative(days, "day");
    return translateMessage(locale, "canvasCard.modifiedDate", { date: new Date(value).toLocaleDateString(locale, { month: "numeric", day: "numeric" }) });
}
