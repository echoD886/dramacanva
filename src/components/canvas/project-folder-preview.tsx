import React, { useState, useRef, useEffect, type ReactNode, type KeyboardEvent, type CSSProperties } from "react";
import { Dropdown } from "antd";
import { ExternalLink, Folder, MoreHorizontal, Pencil, Video, Download, Trash2, LoaderCircle } from "lucide-react";

import type { CanvasFolderStyle, CanvasFolderTheme } from "@/types/canvas";
import type { CanvasLibrarySummary } from "@/services/api/user-data";
import type { FolderPreviewItem } from "@/types/asset-archive";
import { resolveCanvasFolderTheme } from "@/lib/canvas/canvas-folder-theme";
import { FOLDER_STYLES, FOLDER_SKIN_ASSETS, FOLDER_GEOMETRY, resolveFolderStyle, type FolderStyle } from "@/lib/canvas/folder-presentation";
import { getHubText } from "./project-folder-i18n";
import { useI18n } from "@/i18n/use-i18n";
import { formatCardRelativeTime } from "@/lib/relative-time";
import { formatFullTime } from "@/lib/display-format";
import { cn } from "@/lib/utils";
import { folderThumbnailURL, loadFolderThumbnail } from "@/services/folder-thumbnail";
import { useFolderVisibility } from "./use-folder-visibility";

import "./project-folder-preview.css";

// Card positions are measured at the midpoint of the tilted top edge on each reference board.
type CardPose = readonly [centerX: number, topY: number, width: number, height: number, angle: number];
function cardStyles(boardWidth: number, boardHeight: number, poses: Record<"default" | "hover" | "click", CardPose[]>) {
    return poses.default.map((_, index) => {
        const style: Record<string, string> = {};
        for (const state of ["default", "hover", "click"] as const) {
            const [x, y, width, height, angle] = poses[state][index];
            style[`--${state}-left`] = `${100 * (x - width / 2) / boardWidth}%`;
            style[`--${state}-top`] = `${100 * y / boardHeight}%`;
            style[`--${state}-width`] = `${100 * width / boardWidth}%`;
            style[`--${state}-height`] = `${100 * height / boardHeight}%`;
            style[`--${state}-angle`] = `${angle}deg`;
        }
        return style as CSSProperties;
    });
}
const colorCards = cardStyles(384, 300, {
    default: [[125, 65, 102, 149, -10], [204, 42, 88, 145, 5], [279, 73, 84, 139, 15]],
    hover: [[116, 55, 108, 154, -12], [201, 23, 97, 155, 1], [286, 61, 99, 143, 15]],
    click: [[104, 53, 119, 162, -17], [214, 16, 106, 165, 10], [292, 65, 104, 153, 22]],
});
const frostCards = cardStyles(660, 660 * 280 / 360, {
    default: [[272, 256, 161, 206, -14], [327, 249, 158, 195, 0], [386, 274, 150, 180, 9]],
    hover: [[236, 177, 140, 204, -5], [326, 156, 162, 218, 6], [423, 158, 158, 215, 14]],
    click: [[161, 78, 182, 267, -18], [332, 16, 181, 294, 5], [516, 81, 163, 249, 19]],
});

function FolderPreviewImage({ source }: { source: string }) {
    const direct = source.startsWith("blob:") ? source : folderThumbnailURL(source);
    const [failed, setFailed] = useState("");
    const [loaded, setLoaded] = useState<{ source: string; url: string }>();
    useEffect(() => {
        if (direct) return;
        const controller = new AbortController();
        let objectURL = "";
        void loadFolderThumbnail(source, controller.signal).then(blob => {
            if (controller.signal.aborted) return;
            objectURL = URL.createObjectURL(blob);
            setLoaded({ source, url: objectURL });
        }).catch(() => { /* Leave the card placeholder; originals are never a fallback. */ });
        return () => { controller.abort(); if (objectURL) URL.revokeObjectURL(objectURL); };
    }, [source, direct]);
    const url = direct || (loaded?.source === source ? loaded.url : "");
    return url && failed !== url ? <img onError={() => setFailed(url)} src={url} alt="" loading="lazy" decoding="async" width={180} height={240} /> : null;
}

export type ProjectFolderPresentationProps = {
    projectId?: string;
    style?: CanvasFolderStyle;
    theme?: CanvasFolderTheme;
    coverUrl?: string;
    previewItems?: FolderPreviewItem[];
    title?: string;
    meta?: ReactNode;
    children?: ReactNode;
    className?: string;
    onClick?: () => void;
    state?: "default" | "hover" | "click";
    hideBadges?: boolean;
};

export function ProjectFolderPresentation({
    projectId,
    style = "glass-dark",
    theme = "aurora",
    coverUrl,
    previewItems = [],
    title,
    meta,
    children,
    className,
    onClick,
    state,
    hideBadges = false,
}: ProjectFolderPresentationProps) {
    const resolvedTheme = resolveCanvasFolderTheme(theme);
    const resolvedStyle = resolveFolderStyle(style);
    const skin = FOLDER_SKIN_ASSETS[resolvedStyle];
    const { ref, visible } = useFolderVisibility();
    const candidates = previewItems.filter(item => item.thumbnailUrl && item.thumbnailUrl !== coverUrl);
    const usableCover = coverUrl && (folderThumbnailURL(coverUrl) || /^(?:blob:|data:image\/|image:|https?:\/\/)/.test(coverUrl));
    const items: FolderPreviewItem[] = usableCover && coverUrl ? [{ assetId: "cover", kind: "image", thumbnailUrl: coverUrl }, ...candidates].slice(0, 3) as FolderPreviewItem[] : candidates.slice(0, 3);
    const poses = resolvedStyle === "glass-dark" ? frostCards : colorCards;

    // Shared element transition name for folder cover
    const coverStyle = {
        ...(projectId ? { viewTransitionName: `folder-cover-${projectId}` } : {}),
        "--folder-pocket-floor": resolvedStyle === "glass-dark" ? "96%" : "88%",
        "--folder-particles-left": `${FOLDER_GEOMETRY.particles.left * 100}%`,
        "--folder-particles-top": `${FOLDER_GEOMETRY.particles.top * 100}%`,
        "--folder-particles-width": `${FOLDER_GEOMETRY.particles.width * 100}%`,
        "--folder-particles-height": `${FOLDER_GEOMETRY.particles.height * 100}%`,
    } as CSSProperties;

    const titleStyle: CSSProperties = projectId
        ? ({ viewTransitionName: `folder-title-${projectId}` } as CSSProperties)
        : {};

    return (
        <div
            ref={ref}
            className={cn("project-folder-preview", `project-folder-preview-${resolvedStyle === "glass-dark" ? "glass" : resolvedStyle}`, "project-folder-preview-bitmap", `project-folder-theme-${resolvedTheme}`, !items.length && "is-empty", className)}
            data-folder-skin={resolvedStyle}
            data-folder-state={state || undefined}
            data-preview-count={items.length}
            data-visible={visible}
            onClick={onClick}
            style={coverStyle}
        >
            {visible ? <div className="project-folder-art">
            {skin.back ? <img className="project-folder-back" src={`/images/folders/${skin.back}.webp?v=ref2`} alt="" aria-hidden="true" loading="lazy" decoding="async" width={720} height={560} /> : <div className="project-folder-frost-back" aria-hidden="true" />}

            {items.length > 0 ? (
                <div className="project-folder-preview-stack" aria-hidden="true">
                    {items.map((item, index) => (
                        <div
                            key={item.assetId || `card-${index}`}
                            className={cn("project-folder-preview-card", `project-folder-preview-card-${index + 1}`)}
                            style={poses[items.length === 1 ? 1 : items.length === 2 ? index * 2 : index]}
                        >
                            <FolderPreviewImage source={item.thumbnailUrl} />
                            {!hideBadges && item.kind === "video" ? (
                                <span className="absolute top-2 right-2 flex items-center gap-1 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-medium text-white shadow-xs backdrop-blur-md">
                                    <Video className="size-3" />
                                    {typeof item.durationMs === "number" && item.durationMs > 0 ? (
                                        <span>
                                            {Math.floor(item.durationMs / 60000).toString().padStart(2, "0")}:
                                            {Math.floor((item.durationMs % 60000) / 1000).toString().padStart(2, "0")}
                                        </span>
                                    ) : null}
                                </span>
                            ) : null}
                            {!hideBadges && item.count && item.count > 1 ? (
                                <span className="absolute top-2 left-2 flex items-center justify-center rounded-full bg-black/65 min-w-4 h-4 px-1 text-[10px] font-medium text-white shadow-xs backdrop-blur-md">
                                    {item.count}
                                </span>
                            ) : null}
                        </div>
                    ))}
                </div>
            ) : <div className="project-folder-preview-empty" aria-hidden="true" />}

            {(["default", "hover", "click"] as const).map(state => <img key={state} className="project-folder-front" data-folder-state={state} src={`/images/folders/${skin.front}${state === "default" ? "" : `-${state}`}.webp?v=ref2`} alt="" aria-hidden="true" loading="lazy" decoding="async" width={720} height={560} />)}
            {resolvedStyle === "doodle" ? <>
                <img className="project-folder-particles folder-doodle-hover" src="/images/folders/doodle-hover-rays.svg" alt="" aria-hidden="true" />
                <img className="project-folder-particles folder-doodle-click" src="/images/folders/doodle-accents.svg" alt="" aria-hidden="true" />
            </> : skin.particles && <img className="project-folder-particles" src={`/images/folders/${skin.particles}.webp?v=ref2`} alt="" aria-hidden="true" loading="lazy" decoding="async" width={720} height={560} />}
            </div> : null}

            {(title || meta) ? (
                <div className="project-folder-copy">
                    {title ? (
                        <div className="project-folder-title-row">
                            <span className="project-folder-title" title={title} style={titleStyle}>
                                {title}
                            </span>
                        </div>
                    ) : null}
                    {meta ? <div className="project-folder-meta">{meta}</div> : null}
                </div>
            ) : null}

            {/* Injected Action Layer */}
            {children}
        </div>
    );
}

export type ProjectFolderCardProps = {
    project: CanvasLibrarySummary;
    semanticMode?: "assetsHub" | "canvasList";
    selected?: boolean;
    onToggleSelect?: (selected: boolean) => void;
    onOpenCanvas?: () => void;
    onEnterFolder?: () => void;
    onRename?: (newTitle: string) => Promise<void>;
    onStyleChange?: (style: FolderStyle) => Promise<void>;
    onExport?: () => void;
    onDelete?: () => void;
    opening?: boolean;
    className?: string;
    showSelectCheckbox?: boolean;
};

export function ProjectFolderCard({
    project,
    semanticMode = "assetsHub",
    selected = false,
    onToggleSelect,
    onOpenCanvas,
    onEnterFolder,
    onRename,
    onStyleChange,
    onExport,
    onDelete,
    opening = false,
    className,
    showSelectCheckbox = false,
}: ProjectFolderCardProps) {
    const { t, locale, number } = useI18n();
    const [editing, setEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(project.title);
    const [launching, setLaunching] = useState(false);
    const launchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => () => { if (launchTimer.current) clearTimeout(launchTimer.current); }, []);

    const style = resolveFolderStyle(project.folderPresentation?.style);
    const theme = (project.folderPresentation?.theme as CanvasFolderTheme) || "aurora";
    const coverUrl = project.folderPresentation?.cover?.mode && project.folderPresentation.cover.mode !== "auto" ? project.coverUrl : undefined;
    const previewItems = project.previewItems || [];
    const countText = semanticMode === "assetsHub"
        ? t("assets.count", { count: number(project.archivedAssetCount ?? 0) })
        : t("folderPreview.items", { count: number(project.nodeCount ?? 0) });
    const relativeTime = formatCardRelativeTime(project.updatedAt, locale);
    const metaText = `${countText} · ${relativeTime}`;

    useEffect(() => {
        setEditTitle(project.title);
    }, [project.title]);

    useEffect(() => {
        if (editing) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [editing]);

    const handleCommitTitle = async () => {
        const next = editTitle.trim();
        setEditing(false);
        if (next && next !== project.title && onRename) {
            await onRename(next);
        } else {
            setEditTitle(project.title);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            void handleCommitTitle();
        } else if (e.key === "Escape") {
            e.preventDefault();
            setEditing(false);
            setEditTitle(project.title);
        }
    };

    const handleCardClick = () => {
        if (editing || opening || launchTimer.current) return;
        const openAction = () => {
            if (semanticMode === "assetsHub") {
                onEnterFolder?.();
            } else {
                onOpenCanvas?.();
            }
        };

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            openAction();
            return;
        }
        setLaunching(true);
        // Let the photos leave the pocket before navigation unmounts the card.
        launchTimer.current = setTimeout(() => {
            launchTimer.current = null;
            setLaunching(false);
            openAction();
        }, 360);
    };

    const handleCardKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (e.repeat) return;
            handleCardClick();
        }
    };

    const menuItems = [
        ...(onStyleChange ? [{
            key: "folder-style",
            label: getHubText(locale, "assetHub.folderTheme"),
            children: FOLDER_STYLES.map(key => ({
                key: `folder-style:${key}`,
                label: getHubText(locale, `assetHub.style.${key}`),
                onClick: () => { void onStyleChange(key); },
            })),
        }] : []),
        {
            key: "rename",
            icon: <Pencil className="size-3.5" />,
            label: t("canvasCard.rename"),
            onClick: () => {
                setEditing(true);
            },
        },
        ...(onExport
            ? [
                  {
                      key: "export",
                      icon: <Download className="size-3.5" />,
                      label: t("canvasCard.export"),
                      onClick: onExport,
                  },
              ]
            : []),
        ...(onDelete
            ? [
                  { type: "divider" as const },
                  {
                      key: "delete",
                      danger: true,
                      icon: <Trash2 className="size-3.5" />,
                      label: t("common.delete"),
                      onClick: onDelete,
                  },
              ]
            : []),
    ];

    const mobileTitleStyle: CSSProperties = {
        viewTransitionName: `folder-title-${project.id}`,
    } as CSSProperties;

    return (
        <Dropdown menu={{ items: menuItems, selectedKeys: [`folder-style:${style}`] }} trigger={["contextMenu"]}>
        <article
            className={cn("project-folder-card group", launching && "is-launching", className)}
            tabIndex={0}
            role="button"
            aria-label={project.title}
            onClick={handleCardClick}
            onKeyDown={handleCardKeyDown}
        >
            <ProjectFolderPresentation
                projectId={project.id}
                style={style}
                theme={theme}
                coverUrl={coverUrl}
                previewItems={previewItems}
            >
                {/* Selection Checkbox (Top Left) */}
                {onToggleSelect ? (
                    <span
                        className={cn("project-folder-select", (selected || showSelectCheckbox) && "is-visible")}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <input
                            type="checkbox"
                            checked={selected}
                            onChange={(e) => onToggleSelect(e.target.checked)}
                            aria-label={`选择 ${project.title}`}
                        />
                    </span>
                ) : null}


                {/* Right Top More Menu */}
                {menuItems.length > 0 ? (
                    <div onClick={(e) => e.stopPropagation()}>
                        <Dropdown menu={{ items: menuItems, selectedKeys: [`folder-style:${style}`] }} trigger={["click"]} placement="bottomRight">
                            <button
                                type="button"
                                className="project-folder-action-more"
                                aria-label={t("canvasCard.actions", { title: project.title })}
                            >
                                <MoreHorizontal className="size-4" />
                            </button>
                        </Dropdown>
                    </div>
                ) : null}

                {/* Right Bottom Action Button */}
                {semanticMode === "assetsHub" ? (
                    <button
                        type="button"
                        className="project-folder-action-open"
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenCanvas?.();
                        }}
                    >
                        {opening ? <LoaderCircle className="size-3.5 animate-spin" /> : <ExternalLink className="size-3.5" />}
                        <span>{t("canvasCard.openCanvasAction")}</span>
                    </button>
                ) : (
                    <button
                        type="button"
                        className="project-folder-action-open"
                        onClick={(e) => {
                            e.stopPropagation();
                            onEnterFolder?.();
                        }}
                    >
                        <Folder className="size-3.5" />
                        <span>{t("canvasCard.viewArchivedAssets")}</span>
                    </button>
                )}
            </ProjectFolderPresentation>

            {/* Keep the caption outside the cover in every viewport. */}
            <div className="project-folder-caption-mobile" onClick={(e) => e.stopPropagation()}>
                {editing ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => void handleCommitTitle()}
                        onKeyDown={handleKeyDown}
                        className="project-folder-title-input"
                        aria-label={t("folderPreview.renameHint")}
                    />
                ) : (
                    <div className="mobile-title-row">
                        <span
                            className="mobile-title"
                            title={project.title}
                            style={mobileTitleStyle}
                            onClick={handleCardClick}
                        >
                            {project.title}
                        </span>
                        <button
                            type="button"
                            className="project-folder-rename-btn"
                            title={t("folderPreview.renameHint")}
                            aria-label={t("folderPreview.renameHint")}
                            onClick={() => setEditing(true)}
                        >
                            <Pencil className="size-3" />
                        </button>
                    </div>
                )}
                <div className="mobile-meta" title={formatFullTime(project.updatedAt, locale)}>{metaText}</div>
            </div>
        </article>
        </Dropdown>
    );
}
