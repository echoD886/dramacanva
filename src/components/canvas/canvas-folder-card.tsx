import { App, Dropdown, Input } from "antd";
import { Download, LoaderCircle, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { memo, useEffect, useRef, type FocusEvent, type KeyboardEvent, type PointerEvent } from "react";

import { ProjectPreview } from "@/components/canvas/canvas-project-card";
import { exportCanvasProjects } from "@/lib/canvas/canvas-export";
import { useCanvasStore } from "@/stores/canvas/use-canvas-store";
import type { CanvasLibrarySummary } from "@/services/api/user-data";
import { loadCanvasProjectForEditing, saveRemoteUserDataNow } from "@/services/user-data-sync";
import { useCanvasUiStore } from "@/stores/canvas/use-canvas-ui-store";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/use-i18n";
import { resolveAppLocale, type AppLocale } from "@/i18n/app-locale";
import { translateMessage } from "@/i18n/messages";

type CanvasFolderCardProps = {
    project: CanvasLibrarySummary;
    displayTitle?: string;
    projectName?: string;
    onClick: (id: string) => void;
    onPrefetch?: () => void;
    opening?: boolean;
};

let lastCanvasListWheel = 0;

/** Canvas thumbnails stay independent of the asset library's folder presentation. */
export const CanvasFolderCard = memo(function CanvasFolderCard({ project, displayTitle = project.title, projectName, onClick, onPrefetch, opening = false }: CanvasFolderCardProps) {
    const { t, locale, number } = useI18n();
    const { message } = App.useApp();
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
    const prefetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cancelPrefetch = () => {
        if (prefetchTimer.current) clearTimeout(prefetchTimer.current);
        prefetchTimer.current = null;
    };
    const schedulePrefetch = (event: PointerEvent) => {
        cancelPrefetch();
        if (event.pointerType === "touch") return;
        if (Date.now() - lastCanvasListWheel < 300) return;
        if (onPrefetch) prefetchTimer.current = setTimeout(onPrefetch, 180);
    };
    const handleWheel = () => {
        lastCanvasListWheel = Date.now();
        cancelPrefetch();
    };
    useEffect(() => cancelPrefetch, []);
    const handlePrefetchFocus = (event: FocusEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget && event.currentTarget.matches(":focus-visible")) onPrefetch?.();
    };

    const saveTitle = async () => {
        if (!editing) return;
        stopEditing();
        if (editingTitle.trim() === displayTitle) return;
        try {
            await loadCanvasProjectForEditing(project.id);
            renameProject(project.id, editingTitle);
            await saveRemoteUserDataNow(project.id);
        } catch (error) { message.error(error instanceof Error ? error.message : t("canvasCard.renameFailed")); }
    };
    const exportProject = async () => {
        try {
            const fullProject = await loadCanvasProjectForEditing(project.id);
            if (!fullProject) throw new Error(t("canvasCard.missing"));
            await exportCanvasProjects([fullProject], displayTitle || t("canvasCard.canvas"));
        } catch (error) { message.error(error instanceof Error ? error.message : t("canvasCard.exportFailed")); }
    };

    const handleOpenKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (!editing && !opening) onClick(project.id);
        }
    };

    return (
        <article className={cn("canvas-folder-card", selected && "is-selected", editing && "is-editing", opening && "is-opening")}>
            <div className="canvas-folder-open" role="button" tabIndex={0} aria-label={t("canvasCard.open", { title: displayTitle })} aria-busy={opening} onPointerEnter={schedulePrefetch} onPointerLeave={cancelPrefetch} onWheel={handleWheel} onPointerDown={event => { if (event.pointerType !== "touch") onPrefetch?.(); }} onFocus={handlePrefetchFocus} onClick={() => !editing && !opening && onClick(project.id)} onKeyDown={handleOpenKeyDown}>
                <div className="canvas-folder-preview" aria-hidden="true">
                    <ProjectPreview project={project} />
                    {opening ? <div className="absolute inset-0 flex items-center justify-center gap-2 bg-background/75 text-sm"><LoaderCircle className="size-5 animate-spin" /><span>{t("canvasCard.opening")}</span></div> : null}
                </div>
                <div className="canvas-folder-body">
                    <div className="canvas-folder-heading-row">
                        {editing ? (
                            <Input
                                className="canvas-folder-title-input"
                                value={editingTitle}
                                onChange={(event) => setEditingTitle(event.target.value)}
                                onClick={(event) => event.stopPropagation()}
                                onBlur={saveTitle}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") saveTitle();
                                    if (event.key === "Escape") stopEditing();
                                }}
                                autoFocus
                            />
                        ) : (
                            <span className="canvas-folder-title">{displayTitle}</span>
                        )}
                    </div>
                    <div className="canvas-folder-meta">
                        <span className="canvas-folder-meta-item">{projectName ? t("canvasCard.project", { name: projectName }) : t("canvasCard.free")}</span>
                        <span className="canvas-folder-meta-separator" aria-hidden="true">·</span>
                        <span className="canvas-folder-meta-item">{t("canvasCard.nodes", { count: number(project.nodeCount) })}</span>
                    </div>
                    <div className="canvas-folder-dates"><span><small>{t("canvasCard.updated")}</small><time dateTime={project.updatedAt}>{formatCanvasDate(project.updatedAt, locale)}</time></span></div>
                </div>
            </div>

            <span className={cn("canvas-folder-select", selected && "is-visible")} onClick={(event) => event.stopPropagation()}>
                <input
                    type="checkbox"
                    checked={selected}
                    onChange={(event) => toggleSelected(project.id, event.target.checked)}
                    aria-label={t("canvasCard.select", { title: displayTitle })}
                />
            </span>

            <div className="canvas-folder-actions" onClick={(event) => event.stopPropagation()}>
                {!editing ? (
                    <button
                        type="button"
                        className="canvas-folder-rename"
                        aria-label={t("canvasCard.renameTitle", { title: displayTitle })}
                        title={t("canvasCard.rename")}
                        onClick={(event) => {
                            event.stopPropagation();
                            startEditing(project.id, displayTitle);
                        }}
                    >
                        <Pencil />
                    </button>
                ) : null}

                <Dropdown
                    trigger={["click"]}
                    placement="bottomRight"
                    menu={{
                        onClick: ({ domEvent }) => domEvent.stopPropagation(),
                        items: [
                            { key: "export", icon: <Download className="size-3.5" />, label: t("canvasCard.export"), onClick: () => void exportProject() },
                            { type: "divider" },
                            { key: "delete", danger: true, icon: <Trash2 className="size-3.5" />, label: t("common.delete"), onClick: () => setDeleteIds([project.id]) },
                        ],
                    }}
                >
                    <button type="button" className="canvas-folder-more" aria-label={t("canvasCard.actions", { title: displayTitle })} title={t("canvasCard.more")} onClick={(event) => event.stopPropagation()}>
                        <MoreHorizontal />
                    </button>
                </Dropdown>
            </div>
        </article>
    );
}, (previous, next) => previous.onClick === next.onClick && previous.onPrefetch === next.onPrefetch && previous.opening === next.opening && previous.displayTitle === next.displayTitle && previous.projectName === next.projectName && previous.project.id === next.project.id && previous.project.title === next.project.title && previous.project.nodeCount === next.project.nodeCount && previous.project.coverSnapshot === next.project.coverSnapshot && previous.project.createdAt === next.project.createdAt && previous.project.updatedAt === next.project.updatedAt && previous.project.revision === next.project.revision);

function formatCanvasDate(value: string, locale: AppLocale = resolveAppLocale()) {
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp)
        ? new Date(timestamp).toLocaleString(locale, {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
          })
        : translateMessage(locale, "canvasCard.timeUnavailable");
}
