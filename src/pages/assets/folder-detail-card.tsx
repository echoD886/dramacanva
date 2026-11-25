import React, { useEffect, useRef } from "react";
import { App, Dropdown } from "antd";
import { Check, Download, MoreHorizontal, Video, AudioLines, FileText, Image as ImageIcon, Box, Sparkles } from "lucide-react";
import { downloadAssetOriginal } from "@/services/asset-original";

import type { Asset, AssetKind } from "@/stores/use-asset-store";
import { sectionOf } from "@/types/asset-archive";
import { CachedResourceImage } from "@/components/cached-resource-image";
import { useAssetMediaUrl } from "@/hooks/use-asset-media-url";
import { formatCardRelativeTime } from "@/lib/relative-time";
import { formatFullTime } from "@/lib/display-format";
import { useDetailI18n } from "./folder-detail-i18n";
import { cn } from "@/lib/utils";

export type LibraryAsset = Exclude<Asset, { kind: "entity" }>;

export interface FolderDetailCardProps {
    asset: LibraryAsset;
    index: number;
    selected: boolean;
    isSelectMode: boolean;
    onToggleSelect: (e?: React.MouseEvent) => void;
    onShiftSelect: (e: React.MouseEvent) => void;
    onClick: () => void;
    onLongPress: () => void;
    onMoveSingle: () => void;
    onDeleteSingle: () => void;
}

export function FolderDetailCard({ asset, index, selected, isSelectMode, onToggleSelect, onShiftSelect, onClick, onLongPress, onMoveSingle, onDeleteSingle }: FolderDetailCardProps) {
    const { t, dt, locale } = useDetailI18n();
    const { message } = App.useApp();
    const mediaUrl = useAssetMediaUrl(asset);
    const posterKey = typeof asset.metadata?.posterStorageKey === "string" ? asset.metadata.posterStorageKey : undefined;
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
    useEffect(
        () => () => {
            if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        },
        [],
    );

    const kindIcons: Record<AssetKind, React.ComponentType<{ className?: string }>> = {
        image: ImageIcon,
        video: Video,
        audio: AudioLines,
        text: FileText,
        model: Box,
        entity: Sparkles,
    };
    const KindIcon = kindIcons[asset.kind] || ImageIcon;

    const clock = formatClock(asset.kind === "video" || asset.kind === "audio" ? asset.data.durationMs : undefined);
    const relativeTime = formatCardRelativeTime(asset.updatedAt, locale);
    const isPending = sectionOf(asset) === "pending";

    // Handle touch long-press (400ms) for mobile multi-select
    const handleTouchStart = (e: React.TouchEvent) => {
        const touch = e.touches[0];
        touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
        longPressTimerRef.current = setTimeout(() => {
            if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                try {
                    navigator.vibrate(25);
                } catch {
                    // Ignore vibration failure
                }
            }
            onLongPress();
        }, 400);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!touchStartPosRef.current || !longPressTimerRef.current) return;
        const touch = e.touches[0];
        const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
        const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
        if (dx > 8 || dy > 8) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    const handleTouchEnd = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    const handleCardClick = (e: React.MouseEvent) => {
        if (e.shiftKey) {
            e.preventDefault();
            onShiftSelect(e);
            return;
        }
        if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            onToggleSelect(e);
            return;
        }
        if (isSelectMode) {
            e.preventDefault();
            onToggleSelect(e);
            return;
        }
        onClick();
    };

    const menuItems = [
        {
            key: "move",
            label: t("assetMove.confirmAction") + "...",
            onClick: onMoveSingle,
        },
        {
            key: "download",
            label: t("assets.menuDownload"),
            onClick: async () => {
                try {
                    if (await downloadAssetOriginal(asset, asset.kind === "image" ? asset.data.dataUrl : mediaUrl)) return;
                } catch {
                    // Use the same actionable message for failed or missing media.
                }
                message.error(t("canvasExtra.versions.downloadFailed"));
            },
        },
        { type: "divider" as const },
        {
            key: "delete",
            danger: true,
            label: t("common.delete"),
            onClick: onDeleteSingle,
        },
    ];

    const displayTitle = asset.title || t("folderPreview.unnamed");

    return (
        <article
            className={cn("folder-detail-card asset-card-3x4 group relative flex flex-col gap-1.5 rounded-xl transition-all outline-none select-none cursor-pointer", selected ? "ring-2 ring-foreground shadow-md" : "")}
            onClick={handleCardClick}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
        >
            <div
                className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-accent/30 shadow-xs"
                style={{ aspectRatio: (asset.kind === "video" || asset.kind === "image") && asset.data.width && asset.data.height ? `${asset.data.width} / ${asset.data.height}` : undefined }}
            >
                {asset.kind === "image" ? (
                    <CachedResourceImage variant="thumbnail" storageKey={asset.data.storageKey} src={asset.coverUrl || asset.data.dataUrl} alt={displayTitle} className="size-full object-contain" style={{ objectPosition: "center 25%" }} />
                ) : asset.kind === "video" ? (
                    asset.coverUrl || posterKey ? (
                        <CachedResourceImage storageKey={posterKey} src={asset.coverUrl} alt={displayTitle} className="size-full object-contain" style={{ objectPosition: "center 25%" }} />
                    ) : (
                        <div className="flex size-full items-center justify-center bg-neutral-900 text-white">
                            <Video className="size-8 opacity-60" />
                        </div>
                    )
                ) : asset.kind === "audio" ? (
                    <div className="flex size-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-indigo-950 via-neutral-900 to-black p-4 text-center text-white">
                        <AudioLines className="size-8 text-indigo-400 animate-pulse" />
                        <span className="line-clamp-2 text-[11px] font-medium text-white/80">{displayTitle}</span>
                    </div>
                ) : asset.kind === "text" ? (
                    <div className="flex size-full flex-col justify-between bg-card p-3 text-xs text-foreground">
                        <p className="line-clamp-6 text-[11px] leading-relaxed opacity-80">{asset.data.content}</p>
                        <FileText className="size-4 self-end text-muted-foreground" />
                    </div>
                ) : (
                    <div className="flex size-full items-center justify-center bg-accent/40 text-muted-foreground">
                        <Box className="size-8 opacity-60" />
                    </div>
                )}

                {/* Subtle bottom vignette scrim for text/badge readability */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-70" />

                {/* Top-Left Selection Checkbox */}
                <div
                    data-card-select="true"
                    className={cn("absolute left-2 top-2 z-10 transition-opacity", selected || isSelectMode ? "opacity-100" : "opacity-0 group-hover:opacity-100")}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (e.shiftKey) {
                            onShiftSelect(e);
                        } else {
                            onToggleSelect(e);
                        }
                    }}
                >
                    <span className={cn("flex size-5 items-center justify-center rounded-md border text-white transition-all shadow-sm", selected ? "border-foreground bg-foreground text-background" : "border-white/70 bg-black/40 hover:bg-black/60")}>
                        {selected ? <Check className="size-3.5 stroke-[2.5]" /> : null}
                    </span>
                </div>

                {/* Top-Left Amber Badge for Pending Confirmation */}
                {isPending && !selected ? (
                    <div className="absolute left-8 top-2 z-10 flex items-center gap-1 rounded-full bg-amber-500/90 px-1.5 py-0.5 text-[9px] font-semibold text-black shadow-xs">
                        <span className="size-1 rounded-full bg-black/60" />
                        <span>{t("assetClassification.pendingReview")}</span>
                    </div>
                ) : null}

                {/* Top-Right More Menu */}
                <div className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <Dropdown menu={{ items: menuItems }} trigger={["click"]} placement="bottomRight">
                        <button type="button" className="flex size-6 items-center justify-center rounded-md bg-black/50 text-white hover:bg-black/75 transition-colors" aria-label={t("assets.moreActions")}>
                            <MoreHorizontal className="size-3.5" />
                        </button>
                    </Dropdown>
                </div>

                {/* Bottom-Left Type Badge */}
                <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    <KindIcon className="size-3" />
                </div>

                {/* Bottom-Right Duration Capsule (video/audio) */}
                {clock ? <div className="absolute bottom-2 right-2 z-10 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white tabular-nums">{clock}</div> : null}
            </div>

            {/* Bottom Metadata: Title + Relative Time */}
            <div className="flex flex-col min-w-0 px-0.5">
                <span className="truncate text-xs font-semibold text-foreground" title={displayTitle}>
                    {displayTitle}
                </span>
                <span className="text-[11px] text-muted-foreground tabular-nums" title={formatFullTime(asset.updatedAt, locale)}>
                    {relativeTime}
                </span>
            </div>
        </article>
    );
}

function formatClock(durationMs?: number) {
    if (!durationMs || durationMs < 1000) return null;
    const total = Math.round(durationMs / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
