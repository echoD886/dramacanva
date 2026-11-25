import React, { useState, useEffect } from "react";
import { Button, Tooltip } from "antd";
import { ArrowLeft, ExternalLink, Pencil, Upload } from "lucide-react";
import { useNavigate } from "react-router";

import type { CanvasProject } from "@/stores/canvas/use-canvas-store";
import { useDetailI18n } from "./folder-detail-i18n";
import { formatCardRelativeTime } from "@/lib/relative-time";
import { formatFullTime } from "@/lib/display-format";
import { creationCanvasHandoffPath } from "@/lib/canvas/canvas-asset-handoff";

export interface FolderDetailHeroProps {
    mode: "folder" | "unfiled" | "trash";
    folderId?: string;
    project: CanvasProject | null;
    coverUrl?: string;
    sectionCounts?: Record<string, number>;
    totalAssetsCount: number;
    selectedIds: string[];
    onBack: () => void;
    onUpload?: () => void;
    folderAssetIds?: string[];
    onOpenCanvas?: (canvasId: string) => void;
    onCommitRename?: (newTitle: string) => Promise<void>;
}

function resolveHeroThemeGradient(theme?: string, mode?: string) {
    if (mode === "trash") {
        return "linear-gradient(135deg, rgba(239, 68, 68, 0.75) 0%, rgba(245, 158, 11, 0.65) 100%)";
    }
    if (mode === "unfiled") {
        return "linear-gradient(135deg, rgba(99, 102, 241, 0.75) 0%, rgba(168, 85, 247, 0.65) 50%, rgba(236, 72, 153, 0.55) 100%)";
    }
    switch (theme) {
        case "obsidian":
            return "linear-gradient(135deg, rgba(37, 99, 235, 0.8) 0%, rgba(79, 70, 229, 0.7) 50%, rgba(124, 58, 237, 0.6) 100%)";
        case "ember":
            return "linear-gradient(135deg, rgba(245, 158, 11, 0.8) 0%, rgba(244, 63, 94, 0.7) 50%, rgba(225, 29, 72, 0.6) 100%)";
        case "pearl":
            return "linear-gradient(135deg, rgba(13, 148, 136, 0.75) 0%, rgba(59, 130, 246, 0.65) 50%, rgba(139, 92, 246, 0.55) 100%)";
        case "aurora":
        default:
            return "linear-gradient(135deg, rgba(99, 102, 241, 0.8) 0%, rgba(168, 85, 247, 0.7) 50%, rgba(236, 72, 153, 0.6) 100%)";
    }
}

export function FolderDetailHero({
    mode,
    folderId,
    project,
    coverUrl,
    totalAssetsCount,
    selectedIds,
    onBack,
    onUpload,
    folderAssetIds = [],
    onOpenCanvas,
    onCommitRename,
}: FolderDetailHeroProps) {
    const { t, dt, locale, number } = useDetailI18n();
    const navigate = useNavigate();

    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleDraft, setTitleDraft] = useState(project?.title || "");

    useEffect(() => {
        if (project?.title) {
            setTitleDraft(project.title);
        }
    }, [project?.title]);

    const handleBackWithTransition = () => {
        if (typeof document !== "undefined" && "startViewTransition" in document) {
            (document as unknown as { startViewTransition: (cb: () => void) => void }).startViewTransition(() => {
                onBack();
            });
        } else {
            onBack();
        }
    };

    const handleSaveTitle = async () => {
        setIsEditingTitle(false);
        const trimmed = titleDraft.trim();
        if (trimmed && trimmed !== project?.title && onCommitRename) {
            await onCommitRename(trimmed);
        } else if (project?.title) {
            setTitleDraft(project.title);
        }
    };

    const handleOpenCanvasAction = () => {
        if (mode === "folder" && project?.folderPresentation?.source === "manual" && !project.nodes.length) {
            navigate(creationCanvasHandoffPath(selectedIds.length ? selectedIds : folderAssetIds) || "/canvas?mode=new");
            return;
        }
        if (mode === "folder" && folderId) {
            if (selectedIds.length > 0) {
                const params = new URLSearchParams({ mode: "handoff" });
                selectedIds.forEach((id) => params.append("asset", id));
                navigate(`/canvas/${folderId}?${params.toString()}`);
            } else if (onOpenCanvas) {
                onOpenCanvas(folderId);
            } else {
                navigate(`/canvas/${folderId}`);
            }
        } else {
            if (selectedIds.length > 0) {
                const handoff = creationCanvasHandoffPath(selectedIds);
                if (handoff) {
                    navigate(handoff);
                    return;
                }
            }
            navigate("/canvas");
        }
    };

    const relativeUpdated = project?.updatedAt ? formatCardRelativeTime(project.updatedAt, locale) : null;

    const displayTitle =
        mode === "folder"
            ? project?.title || t("folderPreview.unnamed")
            : mode === "unfiled"
            ? t("assets.unfiledTitle")
            : t("assets.recycleBin");

    const canvasActionLabel = project?.folderPresentation?.source === "manual" && !project.nodes.length ? dt("assetDetail.newCanvasAndUse") :
        mode === "folder"
            ? selectedIds.length > 0
                ? dt("assetDetail.openCanvasWithAssets")
                : dt("assetDetail.openCanvas")
            : selectedIds.length > 0
            ? dt("assetDetail.newCanvasAndUse")
            : dt("assetDetail.openCanvas");

    const canvasActionMobileLabel =
        selectedIds.length > 0
            ? dt("assetDetail.openCanvasWithAssets")
            : dt("assetDetail.openCanvasShort");

    const themeGradient = resolveHeroThemeGradient(project?.folderPresentation?.theme, mode);

    return (
        <div
            className="folder-detail-hero mb-3"
            style={{
                viewTransitionName: folderId ? `folder-cover-${folderId}` : undefined,
            }}
        >
            {/* Saturated, colorful blurred background (cover or vibrant theme gradient, never gray) */}
            {coverUrl ? (
                <div
                    className="folder-detail-ambient-glow"
                    style={{ backgroundImage: `url(${coverUrl})` }}
                    aria-hidden="true"
                />
            ) : (
                <div
                    className="folder-detail-ambient-glow"
                    style={{ backgroundImage: themeGradient }}
                    aria-hidden="true"
                />
            )}

            {/* Bottom-to-top gradient scrim for clear text readability */}
            <div className="folder-detail-hero-scrim" aria-hidden="true" />

            {/* Hero Main Content: compact & responsive (<= 220px on mobile) */}
            <div className="folder-detail-hero-content flex flex-col justify-between p-3.5 sm:p-5 lg:p-6 min-h-[96px] sm:min-h-[120px]">
                {/* Title & Action Row: Back button is inline with title; Open Canvas is inline / top-right */}
                <div className="flex items-center justify-between gap-2.5 sm:gap-4">
                    {/* Left: Back button + Title */}
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <button
                            type="button"
                            onClick={handleBackWithTransition}
                            aria-label={dt("assetDetail.backToLibrary")}
                            title={dt("assetDetail.backToLibrary")}
                            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-background/60 text-foreground backdrop-blur-md transition-colors hover:bg-background/90"
                        >
                            <ArrowLeft className="size-4" />
                        </button>

                        <div className="min-w-0 flex-1">
                            {mode === "folder" ? (
                                isEditingTitle ? (
                                    <input
                                        type="text"
                                        value={titleDraft}
                                        onChange={(e) => setTitleDraft(e.target.value)}
                                        onBlur={handleSaveTitle}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") void handleSaveTitle();
                                            if (e.key === "Escape") {
                                                setIsEditingTitle(false);
                                                setTitleDraft(project?.title || "");
                                            }
                                        }}
                                        autoFocus
                                        className="w-full rounded-lg border border-foreground bg-background/90 px-2.5 py-1 text-base sm:text-2xl font-bold text-foreground outline-none ring-2 ring-foreground"
                                    />
                                ) : (
                                    <div className="group flex items-center gap-1.5 sm:gap-2 min-w-0">
                                        <h1
                                            onClick={() => setIsEditingTitle(true)}
                                            style={{
                                                viewTransitionName: folderId ? `folder-title-${folderId}` : undefined,
                                            }}
                                            title={dt("assetDetail.inlineRenameHint")}
                                            className="cursor-pointer truncate text-base sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground folder-detail-text-protected transition-opacity hover:opacity-90"
                                        >
                                            {displayTitle}
                                        </h1>
                                        <Tooltip title={dt("assetDetail.inlineRenameHint")}>
                                            <button
                                                type="button"
                                                onClick={() => setIsEditingTitle(true)}
                                                aria-label={t("folderPreview.renameHint")}
                                                className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-background/40 hover:text-foreground"
                                            >
                                                <Pencil className="size-3.5 sm:size-4" />
                                            </button>
                                        </Tooltip>
                                    </div>
                                )
                            ) : (
                                <h1 className="truncate text-base sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground folder-detail-text-protected">
                                    {displayTitle}
                                </h1>
                            )}
                        </div>
                    </div>

                    {/* Right: Open Canvas Button */}
                    {onUpload && mode !== "trash" && <Button onClick={onUpload} icon={<Upload className="size-4" />}>{t("assets.upload")}</Button>}
                    {/* Desktop full button */}
                    <div className="hidden sm:flex items-center gap-2 shrink-0">
                        <Button
                            type="primary"
                            icon={<ExternalLink className="size-3.5" />}
                            onClick={handleOpenCanvasAction}
                            className="shadow-sm font-medium"
                        >
                            {canvasActionLabel}
                        </Button>
                    </div>

                    {/* Mobile compact inline button */}
                    <div className="sm:hidden flex items-center shrink-0">
                        <Button
                            type="primary"
                            size="small"
                            icon={<ExternalLink className="size-3.5" />}
                            onClick={handleOpenCanvasAction}
                            className="shadow-sm font-medium text-xs px-2.5 h-7.5"
                        >
                            <span>{canvasActionMobileLabel}</span>
                        </Button>
                    </div>
                </div>

                {/* Metadata Row: Only total assets count and relative updated (high contrast >= 4.5:1) */}
                <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs folder-detail-meta-text folder-detail-text-protected pl-10 sm:pl-11">
                    <span>
                        {number(totalAssetsCount)} {t("assets.assetUnit")}
                    </span>
                    {relativeUpdated ? (
                        <>
                            <span className="opacity-60">•</span>
                            <span title={formatFullTime(project?.updatedAt, locale)}>
                                {dt("assetDetail.heroUpdated")} {relativeUpdated}
                            </span>
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
