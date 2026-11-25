import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { App } from "antd";
import {
    Box,
    Check,
    ChevronLeft,
    ChevronRight,
    Copy,
    Download,
    ExternalLink,
    FileText,
    Film,
    FolderInput,
    Image as ImageIcon,
    Maximize,
    Maximize2,
    Music,
    Pause,
    Pencil,
    Play,
    RotateCw,
    Sparkles,
    Trash2,
    Volume2,
    VolumeX,
    X,
    ZoomIn,
    ZoomOut,
} from "lucide-react";

import { useI18n } from "@/i18n/use-i18n";
import { useResourceDelivery } from "@/hooks/use-resource-delivery";
import { useAudioSampleRate } from "@/hooks/use-audio-sample-rate";
import { WatermarkNotice } from "@/components/watermark-notice";
import { useAssetStore, type Asset, type AssetCategory } from "@/stores/use-asset-store";
import { useCanvasStore } from "@/stores/canvas/use-canvas-store";
import { classifyAssets } from "@/services/asset-archive";
import { translateArchiveError, translateArchiveErrorAction } from "@/i18n/asset-archive-messages";
import { formatCardRelativeTime } from "@/lib/relative-time";
import { formatFullTime } from "@/lib/display-format";
import { formatBytes } from "@/lib/image-utils";
import { useAssetMediaUrl } from "@/hooks/use-asset-media-url";
import { resolveImageUrl } from "@/services/image-storage";
import { downloadAssetOriginal } from "@/services/asset-original";

import zhCN from "@/i18n/messages/asset-ui-viewer.zh-CN";
import zhHK from "@/i18n/messages/asset-ui-viewer.zh-HK";
import zhTW from "@/i18n/messages/asset-ui-viewer.zh-TW";
import enUS from "@/i18n/messages/asset-ui-viewer.en-US";
import jaJP from "@/i18n/messages/asset-ui-viewer.ja-JP";
import koKR from "@/i18n/messages/asset-ui-viewer.ko-KR";
import esES from "@/i18n/messages/asset-ui-viewer.es-ES";
import ptBR from "@/i18n/messages/asset-ui-viewer.pt-BR";

import "./asset-viewer-lightbox.css";

const VIEWER_LOCALES: Record<string, Record<string, string>> = {
    "zh-CN": zhCN,
    "zh-HK": zhHK,
    "zh-TW": zhTW,
    "en-US": enUS,
    "ja-JP": jaJP,
    "ko-KR": koKR,
    "es-ES": esES,
    "pt-BR": ptBR,
};

function useViewerText() {
    const { t, locale } = useI18n();
    const currentDict = VIEWER_LOCALES[locale] || VIEWER_LOCALES["en-US"] || zhCN;

    const tv = useCallback(
        (key: string, values?: Record<string, unknown>): string => {
            const raw = (t as (k: string, v?: Record<string, unknown>) => string)(key, values);
            if (raw && raw !== key) return raw;
            let val = currentDict[key] || (enUS as Record<string, string>)[key] || key;
            if (values) {
                Object.keys(values).forEach((k) => {
                    val = val.replace(new RegExp(`\\{${k}\\}`, "g"), String(values[k]));
                });
            }
            return val;
        },
        [t, currentDict],
    );

    return { tv, t, locale };
}

export interface AssetViewerLightboxProps {
    assets: Asset[];
    index: number;
    folderCanvasId?: string;
    onIndexChange: (index: number) => void;
    onClose: () => void;
    onMove?: (asset: Asset) => void;
    onDelete?: (asset: Asset) => void;
    initialDrawerMode?: "peek" | "expanded";
}

const CATEGORY_OPTIONS: Array<{ value: AssetCategory; labelKey: string }> = [
    { value: "character", labelKey: "assets.catCharacter" },
    { value: "environment", labelKey: "assets.catEnvironment" },
    { value: "prop", labelKey: "assets.catProp" },
    { value: "shot", labelKey: "assets.catShot" },
    { value: "other", labelKey: "assets.catOther" },
];

function formatClock(durationMs?: number) {
    if (!durationMs || durationMs < 1000) return null;
    const total = Math.round(durationMs / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function AssetViewerLightbox({ assets, index, folderCanvasId, onIndexChange, onClose, onMove, onDelete, initialDrawerMode = "peek" }: AssetViewerLightboxProps) {
    const { tv, t, locale } = useViewerText();
    const { message } = App.useApp();
    const navigate = useNavigate();

    const currentAsset = assets[index] as Asset | undefined;
    const delivery = useResourceDelivery(currentAsset && "storageKey" in currentAsset.data ? currentAsset.data.storageKey || "" : "");
    const total = assets.length;
    const hasPrev = index > 0;
    const hasNext = index < total - 1;

    // Title rename state
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleDraft, setTitleDraft] = useState("");
    const titleInputRef = useRef<HTMLInputElement>(null);
    const dialogRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const root = dialogRef.current;
        if (!root) return;
        const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const location = window.location.pathname + window.location.search;
        const focusable = () =>
            Array.from(root.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"]),video[controls],audio[controls]')).filter(
                (node) => node.getClientRects().length > 0 && getComputedStyle(node).visibility !== "hidden" && !node.closest("[inert]"),
            );
        (focusable()[0] ?? root).focus({ preventScroll: true });
        const trap = (event: KeyboardEvent) => {
            if (event.key !== "Tab") return;
            const active = document.activeElement;
            const parentDialog = active instanceof Element ? active.closest('[role="dialog"][aria-modal="true"]') : null;
            // A move/confirmation dialog rendered in a portal owns its focus.
            if (parentDialog && parentDialog !== root && !root.contains(parentDialog)) return;
            const controls = focusable();
            const first = controls[0] ?? root;
            const last = controls.at(-1) ?? root;
            if (!root.contains(active) || (event.shiftKey && active === first) || (!event.shiftKey && active === last)) {
                event.preventDefault();
                (event.shiftKey ? last : first).focus({ preventScroll: true });
            }
        };
        document.addEventListener("keydown", trap, true);
        return () => {
            document.removeEventListener("keydown", trap, true);
            const active = document.activeElement;
            if (window.location.pathname + window.location.search === location && (root.contains(active) || active === document.body)) {
                if (previous?.isConnected) previous.focus({ preventScroll: true });
                else document.querySelector<HTMLElement>('[data-testid="folder-detail-asset-grid"] [role="gridcell"][tabindex="0"]')?.focus({ preventScroll: true });
            }
        };
    }, []);

    // Image zoom & rotate states
    const [scale, setScale] = useState(1);
    const [rotation, setRotation] = useState(0);

    // Mobile drawer state: "peek" or "expanded"
    const [mobileDrawerMode, setMobileDrawerMode] = useState<"peek" | "expanded">(initialDrawerMode);

    // Copy prompt feedback state
    const [copiedPrompt, setCopiedPrompt] = useState(false);

    // Category classifying loading state
    const [isClassifying, setIsClassifying] = useState(false);

    // Audio/Video player states
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [playbackCurrent, setPlaybackCurrent] = useState(0);
    const [playbackTotal, setPlaybackTotal] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    // Media URL resolver (blob or persistent storage)
    const assetMediaUrl = useAssetMediaUrl(currentAsset);
    const mediaUrl = delivery.controlled ? delivery.url : assetMediaUrl;
    const audio = currentAsset?.kind === "audio" ? currentAsset.data : undefined;
    const sourceSampleRate = useAudioSampleRate(audio?.storageKey, audio ? mediaUrl || audio.url || "" : "");
    const image = currentAsset?.kind === "image" ? currentAsset.data : undefined;
    const imageKey = image?.storageKey;
    const [localImage, setLocalImage] = useState<{ key: string; url: string }>();
    useEffect(() => {
        if (delivery.controlled || !imageKey) return;
        let active = true;
        void resolveImageUrl(imageKey)
            .then((url) => {
                if (active) setLocalImage({ key: imageKey, url });
            })
            .catch(() => undefined);
        return () => {
            active = false;
        };
    }, [delivery.controlled, imageKey]);
    const imageUrl = delivery.controlled ? delivery.url : image ? (localImage?.key === imageKey ? localImage?.url : undefined) || image.dataUrl : currentAsset?.coverUrl || mediaUrl;

    // Reset controls when index changes
    useEffect(() => {
        setScale(1);
        setRotation(0);
        setIsEditingTitle(false);
        setIsPlaying(false);
        setPlaybackCurrent(0);
        if (currentAsset) {
            setTitleDraft(currentAsset.title || "");
        }
    }, [index, currentAsset?.id]);

    // Preload previous and next images to eliminate flicker
    useEffect(() => {
        const preloadIndices = [index - 1, index + 1].filter((i) => i >= 0 && i < total);
        preloadIndices.forEach((i) => {
            const asset = assets[i];
            const src = asset?.kind === "image" ? asset.data.dataUrl || asset.coverUrl : asset?.coverUrl;
            if (src && typeof src === "string" && !src.startsWith("blob:")) {
                const img = new Image();
                img.src = src;
            }
        });
    }, [index, assets, total]);

    // Focus input on title edit
    useEffect(() => {
        if (isEditingTitle) {
            titleInputRef.current?.focus();
            titleInputRef.current?.select();
        }
    }, [isEditingTitle]);

    // Save title rename
    const handleSaveTitle = useCallback(() => {
        if (!currentAsset) return;
        const trimmed = titleDraft.trim();
        if (trimmed && trimmed !== currentAsset.title) {
            useAssetStore.getState().updateAsset(currentAsset.id, { title: trimmed });
            message.success(tv("assetViewer.renameSuccess"));
        }
        setIsEditingTitle(false);
    }, [currentAsset, titleDraft, message, tv]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const activeDialog = document.activeElement?.closest('[role="dialog"][aria-modal="true"]');
            if (activeDialog && activeDialog !== dialogRef.current && !dialogRef.current?.contains(activeDialog)) return;
            if (isEditingTitle || document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
                return;
            }
            if (e.key === "ArrowLeft") {
                if (hasPrev) onIndexChange(index - 1);
            } else if (e.key === "ArrowRight") {
                if (hasNext) onIndexChange(index + 1);
            } else if (e.key === "Escape") {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [hasPrev, hasNext, index, isEditingTitle, onIndexChange, onClose]);

    // Touch swipe navigation
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);
    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 1) {
            touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    };
    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStartRef.current || e.changedTouches.length === 0) return;
        const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
        const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
        touchStartRef.current = null;
        if (Math.abs(deltaX) > 48 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
            if (deltaX < 0 && hasNext) {
                onIndexChange(index + 1);
            } else if (deltaX > 0 && hasPrev) {
                onIndexChange(index - 1);
            }
        }
    };

    // Mobile Sheet Drag / Swipe gesture
    const sheetTouchStartRef = useRef<number | null>(null);
    const handleSheetTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 1) {
            sheetTouchStartRef.current = e.touches[0].clientY;
        }
    };
    const handleSheetTouchEnd = (e: React.TouchEvent) => {
        if (sheetTouchStartRef.current === null || e.changedTouches.length === 0) return;
        const deltaY = e.changedTouches[0].clientY - sheetTouchStartRef.current;
        sheetTouchStartRef.current = null;
        if (deltaY < -35) {
            setMobileDrawerMode("expanded");
        } else if (deltaY > 35) {
            setMobileDrawerMode("peek");
        }
    };

    // Category change handler with strict snapshot and Object.hasOwn contract
    const handleCategoryChange = async (newCategory: AssetCategory) => {
        if (!currentAsset || newCategory === currentAsset.category || isClassifying) return;
        setIsClassifying(true);
        try {
            const expectedClassification = Object.fromEntries((["category", "categorySource"] as const).filter((key) => Object.hasOwn(currentAsset, key)).map((key) => [key, currentAsset[key]]));
            const res = await classifyAssets({
                items: [
                    {
                        assetId: currentAsset.id,
                        category: newCategory,
                        expectedClassification,
                    },
                ],
            });
            if (res.conflictCount > 0) {
                message.warning(t("archiveError.locationConflict"));
            } else if (res.successCount > 0) {
                const catLabel = t(`assets.section.${newCategory}` as any) || newCategory;
                message.success(tv("assetViewer.categoryChanged", { category: catLabel }));
            }
        } catch (error) {
            const reason = (error as { reason?: string })?.reason || (error instanceof Error ? error.message : undefined);
            const errText = translateArchiveError(reason, t);
            const actionText = translateArchiveErrorAction(reason, t);
            message.error(`${errText} (${actionText})`);
        } finally {
            setIsClassifying(false);
        }
    };

    // "用到画布" Navigation Action
    const handleUseOnCanvas = useCallback(() => {
        if (!currentAsset) return;
        if (folderCanvasId) {
            navigate(`/canvas/${folderCanvasId}?mode=handoff&asset=${encodeURIComponent(currentAsset.id)}`);
        } else {
            navigate(`/canvas?mode=handoff&asset=${encodeURIComponent(currentAsset.id)}`);
        }
        onClose();
    }, [currentAsset, folderCanvasId, navigate, onClose]);

    // Download Original Action
    const handleDownload = useCallback(async () => {
        if (!currentAsset) return;
        try {
            if (!(await downloadAssetOriginal(currentAsset, imageUrl || mediaUrl))) message.error(t("canvasExtra.versions.downloadFailed"));
        } catch {
            message.error(t("canvasExtra.versions.downloadFailed"));
        }
    }, [currentAsset, imageUrl, mediaUrl, message, t]);

    // Copy Prompt Action
    const promptText = useMemo(() => {
        if (!currentAsset) return "";
        return (
            (typeof currentAsset.metadata?.prompt === "string" ? currentAsset.metadata.prompt : "") ||
            (typeof currentAsset.metadata?.composerContent === "string" ? currentAsset.metadata.composerContent : "") ||
            (currentAsset.kind === "text" ? currentAsset.data.content : "") ||
            currentAsset.note ||
            ""
        );
    }, [currentAsset]);

    const handleCopyPrompt = useCallback(() => {
        if (!promptText) return;
        navigator.clipboard.writeText(promptText).then(() => {
            setCopiedPrompt(true);
            message.success(tv("assetViewer.copyPromptSuccess"));
            setTimeout(() => setCopiedPrompt(false), 2000);
        });
    }, [promptText, message, tv]);

    // Lookup Source Canvas
    const sourceCanvasId = currentAsset?.originCanvasId || currentAsset?.archiveCanvasId || (currentAsset?.metadata?.canvasId as string | undefined);
    const sourceCanvasProject = useCanvasStore((s) => (sourceCanvasId ? s.projects.find((p) => p.id === sourceCanvasId) : undefined));

    if (!currentAsset || index < 0 || index >= total) {
        return null;
    }

    // Determine dimensions and aspect ratio
    const width = currentAsset.kind === "image" || currentAsset.kind === "video" ? currentAsset.data.width : undefined;
    const height = currentAsset.kind === "image" || currentAsset.kind === "video" ? currentAsset.data.height : undefined;
    const durationMs = currentAsset.kind === "video" || currentAsset.kind === "audio" ? currentAsset.data.durationMs : undefined;
    const bytes = "bytes" in currentAsset.data ? (currentAsset.data.bytes as number) : undefined;
    const mimeType = "mimeType" in currentAsset.data ? (currentAsset.data.mimeType as string) : undefined;
    const formatName = mimeType ? mimeType.split("/")[1]?.toUpperCase() : currentAsset.kind.toUpperCase();

    return (
        <div ref={dialogRef} tabIndex={-1} className="asset-viewer-root asset-viewer-lightbox" role="dialog" aria-modal="true" aria-label={currentAsset.title}>
            {/* Top Navigation Bar */}
            <header className="asset-viewer-header">
                <div className="asset-viewer-header-left">
                    <button type="button" className="asset-viewer-icon-btn" onClick={onClose} title={tv("assetViewer.close")} aria-label={tv("assetViewer.close")}>
                        <ChevronLeft className="size-5" />
                    </button>
                    <span className="text-sm font-medium text-white/90 max-w-[240px] truncate hidden sm:inline-block">{currentAsset.title}</span>
                </div>

                <div className="asset-viewer-counter-pill" data-testid="viewer-counter">
                    {index + 1} / {total}
                </div>

                <div className="asset-viewer-header-right">
                    <button type="button" className="asset-viewer-icon-btn" onClick={onClose} title={tv("assetViewer.close")} aria-label={tv("assetViewer.close")}>
                        <X className="size-4" />
                    </button>
                </div>
            </header>

            {/* Main Stage & Body */}
            <div className="asset-viewer-body">
                {/* Left navigation arrow */}
                <button type="button" className="asset-viewer-nav-btn asset-viewer-nav-prev" disabled={!hasPrev} onClick={() => onIndexChange(index - 1)} aria-label={tv("assetViewer.prev")}>
                    <ChevronLeft className="size-6" />
                </button>

                {/* Right navigation arrow */}
                <button type="button" className="asset-viewer-nav-btn asset-viewer-nav-next" disabled={!hasNext} onClick={() => onIndexChange(index + 1)} aria-label={tv("assetViewer.next")}>
                    <ChevronRight className="size-6" />
                </button>

                {/* Stage Canvas */}
                <main className="asset-viewer-stage" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
                    <div className="asset-viewer-media-viewport">
                        {delivery.loading || delivery.failed ? (
                            <span role="status">{t(delivery.failed ? "watermark.failed" : "watermark.processing")}</span>
                        ) : currentAsset.kind === "image" ? (
                            <div
                                className="asset-viewer-image-wrap"
                                style={{
                                    transform: `scale(${scale}) rotate(${rotation}deg)`,
                                }}
                                onDoubleClick={() => setScale((s) => (s > 1 ? 1 : 2))}
                            >
                                <img src={imageUrl} alt={currentAsset.title} className="asset-viewer-image" draggable={false} />
                            </div>
                        ) : currentAsset.kind === "video" ? (
                            <div className="asset-viewer-video-container">
                                <video
                                    ref={videoRef}
                                    src={delivery.controlled ? mediaUrl : mediaUrl || currentAsset.data.url}
                                    poster={delivery.controlled ? undefined : currentAsset.coverUrl}
                                    className="asset-viewer-video"
                                    controls
                                    playsInline
                                    onPlay={() => setIsPlaying(true)}
                                    onPause={() => setIsPlaying(false)}
                                    onTimeUpdate={(e) => {
                                        setPlaybackCurrent(e.currentTarget.currentTime * 1000);
                                        setPlaybackTotal(e.currentTarget.duration * 1000 || durationMs || 0);
                                    }}
                                />
                            </div>
                        ) : currentAsset.kind === "audio" ? (
                            <div className="asset-viewer-audio-container">
                                <div className={`asset-viewer-vinyl-disc ${isPlaying ? "asset-viewer-vinyl-spinning" : ""}`}>
                                    <div className="asset-viewer-vinyl-center">
                                        <Music className="size-8 text-indigo-400" />
                                    </div>
                                </div>

                                <div className="asset-viewer-spectrum-bars">
                                    {Array.from({ length: 24 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className="asset-viewer-spectrum-bar"
                                            style={{
                                                height: isPlaying ? `${Math.sin((i + Date.now() / 150) * 0.8) * 16 + 24}px` : "12px",
                                            }}
                                        />
                                    ))}
                                </div>

                                <audio ref={audioRef} src={mediaUrl || currentAsset.data.url || undefined} controls className="w-full max-w-sm rounded-lg" onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} />
                            </div>
                        ) : currentAsset.kind === "text" ? (
                            <div className="max-w-xl w-full p-8 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl text-white/90">
                                <div className="flex items-center gap-2 mb-4 text-xs font-semibold text-white/60">
                                    <FileText className="size-4" />
                                    <span>TEXT ASSET</span>
                                </div>
                                <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap select-text max-h-[60vh] overflow-y-auto">{currentAsset.data.content}</div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-3 p-12 rounded-2xl bg-black/40 border border-white/10 text-white/80">
                                <Box className="size-16 opacity-60 text-indigo-400" />
                                <span className="text-sm font-medium">{currentAsset.title}</span>
                            </div>
                        )}
                    </div>

                    {/* Desktop Floating Action Dock (Zoom / Rotate / Download / Move / Delete) */}
                    {currentAsset.kind === "image" ? (
                        <div className="asset-viewer-floating-dock" role="toolbar" aria-label="Viewer Controls">
                            <button type="button" className="asset-viewer-dock-btn" onClick={() => setScale((s) => Math.max(0.5, s - 0.25))} title={tv("assetViewer.zoomOut")}>
                                <ZoomOut className="size-4" />
                            </button>
                            <button type="button" className="asset-viewer-dock-btn text-[11px] font-mono px-1 w-auto" onClick={() => setScale(1)} title={tv("assetViewer.zoom100")}>
                                {Math.round(scale * 100)}%
                            </button>
                            <button type="button" className="asset-viewer-dock-btn" onClick={() => setScale((s) => Math.min(4, s + 0.25))} title={tv("assetViewer.zoomIn")}>
                                <ZoomIn className="size-4" />
                            </button>
                            <button
                                type="button"
                                className="asset-viewer-dock-btn"
                                onClick={() => {
                                    setScale(1);
                                    setRotation(0);
                                }}
                                title={tv("assetViewer.zoomFit")}
                            >
                                <Maximize2 className="size-4" />
                            </button>
                            <button type="button" className="asset-viewer-dock-btn" onClick={() => setRotation((r) => (r + 90) % 360)} title={tv("assetViewer.rotate")}>
                                <RotateCw className="size-4" />
                            </button>
                        </div>
                    ) : null}
                </main>

                {/* Desktop Right Inspector Panel (360px True Frosted Glass) */}
                <aside className="asset-viewer-inspector" data-testid="viewer-inspector">
                    <div className="asset-viewer-inspector-content">
                        {/* Title & Inline Edit */}
                        <div>
                            <div className="asset-viewer-title-row">
                                {isEditingTitle ? (
                                    <input
                                        ref={titleInputRef}
                                        type="text"
                                        value={titleDraft}
                                        onChange={(e) => setTitleDraft(e.target.value)}
                                        onBlur={handleSaveTitle}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") handleSaveTitle();
                                            if (e.key === "Escape") {
                                                setTitleDraft(currentAsset.title || "");
                                                setIsEditingTitle(false);
                                            }
                                        }}
                                        className="asset-viewer-title-edit-input"
                                    />
                                ) : (
                                    <h2 className="asset-viewer-title-text group flex items-center gap-2" onClick={() => setIsEditingTitle(true)} title={tv("assetViewer.rename")}>
                                        <span>{currentAsset.title}</span>
                                        <Pencil className="size-3.5 text-white/40 group-hover:text-white/80 transition-colors shrink-0" />
                                    </h2>
                                )}
                            </div>
                            <div className="asset-viewer-meta-subtitle" title={formatFullTime(currentAsset.createdAt || currentAsset.updatedAt, locale)}>
                                {formatCardRelativeTime(currentAsset.createdAt || currentAsset.updatedAt, locale)}
                            </div>
                        </div>

                        {/* Category Selector Pills */}
                        <div>
                            <div className="asset-viewer-section-title">{tv("assetViewer.categorySection")}</div>
                            {currentAsset.kind === "audio" ? (
                                <div className="flex items-center gap-2">
                                    <span className="asset-viewer-cat-pill is-active cursor-default select-none pointer-events-none">{tv("assetViewer.catAudioReadOnly")}</span>
                                    <span className="text-[11px] text-white/50">({tv("assetViewer.readOnly")})</span>
                                </div>
                            ) : (
                                <div className="asset-viewer-category-pills">
                                    {CATEGORY_OPTIONS.map((opt) => {
                                        const active = currentAsset.category === opt.value;
                                        return (
                                            <button key={opt.value} type="button" className={`asset-viewer-cat-pill ${active ? "is-active" : ""}`} disabled={isClassifying} onClick={() => void handleCategoryChange(opt.value)}>
                                                {t(opt.labelKey as any) || opt.value}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Source Canvas Jump */}
                        <div>
                            <div className="asset-viewer-section-title">{tv("assetViewer.sourceCanvas")}</div>
                            {sourceCanvasId ? (
                                <button
                                    type="button"
                                    className="asset-viewer-canvas-capsule w-full"
                                    onClick={() => {
                                        navigate(`/canvas/${sourceCanvasId}`);
                                        onClose();
                                    }}
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <ExternalLink className="size-3.5 text-indigo-400 shrink-0" />
                                        <span className="text-xs font-medium text-white truncate">{sourceCanvasProject?.title || sourceCanvasId}</span>
                                    </div>
                                    <span className="text-[11px] text-white/50">{tv("assetViewer.jumpToCanvas")} →</span>
                                </button>
                            ) : (
                                <div className="text-xs text-white/40 py-1">{tv("assetViewer.noSourceCanvas")}</div>
                            )}
                        </div>

                        {/* AI Generation Prompt */}
                        {promptText ? (
                            <div>
                                <div className="asset-viewer-section-title">{tv("assetViewer.promptTitle")}</div>
                                <div className="asset-viewer-prompt-box">
                                    <button type="button" className="asset-viewer-copy-btn" onClick={handleCopyPrompt} title={tv("assetViewer.copyPrompt")}>
                                        {copiedPrompt ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                                        <span>{copiedPrompt ? "OK" : tv("assetViewer.copyPrompt")}</span>
                                    </button>
                                    <div className="pr-16">{promptText}</div>
                                </div>
                            </div>
                        ) : null}

                        {/* Technical Parameters Grid */}
                        <div>
                            <div className="asset-viewer-section-title">{tv("assetViewer.technicalParams")}</div>
                            <div className="asset-viewer-tech-grid">
                                {width && height ? (
                                    <div className="asset-viewer-tech-item">
                                        <span className="asset-viewer-tech-label">{tv("assetViewer.dimensions")}</span>
                                        <span className="asset-viewer-tech-value">
                                            {width} × {height}
                                        </span>
                                    </div>
                                ) : null}

                                {durationMs ? (
                                    <div className="asset-viewer-tech-item">
                                        <span className="asset-viewer-tech-label">{tv("assetViewer.duration")}</span>
                                        <span className="asset-viewer-tech-value">{formatClock(durationMs)}</span>
                                    </div>
                                ) : null}

                                {sourceSampleRate ? (
                                    <div className="asset-viewer-tech-item">
                                        <span className="asset-viewer-tech-label">{tv("assetViewer.sampleRate")}</span>
                                        <span className="asset-viewer-tech-value">{new Intl.NumberFormat(locale).format(sourceSampleRate / 1000)} kHz</span>
                                    </div>
                                ) : null}

                                {bytes ? (
                                    <div className="asset-viewer-tech-item">
                                        <span className="asset-viewer-tech-label">{tv("assetViewer.fileSize")}</span>
                                        <span className="asset-viewer-tech-value">{formatBytes(bytes)}</span>
                                    </div>
                                ) : null}

                                <div className="asset-viewer-tech-item">
                                    <span className="asset-viewer-tech-label">{tv("assetViewer.format")}</span>
                                    <span className="asset-viewer-tech-value">{formatName}</span>
                                </div>
                            </div>
                        </div>

                        {/* Common Actions Block */}
                        <div className="asset-viewer-actions-block">
                            <WatermarkNotice resource={delivery.resource} />
                            <button type="button" className="asset-viewer-primary-action" onClick={handleUseOnCanvas}>
                                <Sparkles className="size-4" />
                                <span>{folderCanvasId ? tv("assetViewer.useOnCanvas") : tv("assetViewer.createNewCanvasAndUse")}</span>
                            </button>

                            <div className="asset-viewer-secondary-actions">
                                <button type="button" className="asset-viewer-sec-btn" onClick={handleDownload}>
                                    <Download className="size-3.5" />
                                    <span>{tv("assetViewer.download")}</span>
                                </button>

                                {onMove ? (
                                    <button type="button" className="asset-viewer-sec-btn" onClick={() => onMove(currentAsset)}>
                                        <FolderInput className="size-3.5" />
                                        <span>{tv("assetViewer.move")}</span>
                                    </button>
                                ) : null}

                                {onDelete ? (
                                    <button type="button" className="asset-viewer-sec-btn is-danger" onClick={() => onDelete(currentAsset)}>
                                        <Trash2 className="size-3.5" />
                                        <span>{tv("assetViewer.delete")}</span>
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

            {/* Mobile Bottom Sheet Drawer (Width <= 768px) */}
            <div className={`asset-viewer-mobile-sheet ${mobileDrawerMode === "expanded" ? "is-expanded" : "is-peek"}`} data-testid="viewer-mobile-sheet">
                <div className="asset-viewer-drag-handle-wrap" onTouchStart={handleSheetTouchStart} onTouchEnd={handleSheetTouchEnd} onClick={() => setMobileDrawerMode((m) => (m === "peek" ? "expanded" : "peek"))}>
                    <div className="asset-viewer-drag-handle" />
                </div>

                {mobileDrawerMode === "peek" ? (
                    <div className="asset-viewer-mobile-peek-content" onClick={() => setMobileDrawerMode("expanded")}>
                        <div className="min-w-0 flex-1">
                            <div className="text-[14px] font-semibold text-white truncate leading-tight">{currentAsset.title}</div>
                            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-white/60 truncate">
                                <span className="capitalize">{currentAsset.kind === "audio" ? tv("assetViewer.catAudioReadOnly") : t(`assets.section.${currentAsset.category}` as any) || currentAsset.category || currentAsset.kind}</span>
                                {width && height ? (
                                    <span>
                                        · {width}×{height}
                                    </span>
                                ) : null}
                                {bytes ? <span>· {formatBytes(bytes)}</span> : null}
                            </div>
                        </div>

                        <button
                            type="button"
                            className="asset-viewer-mobile-peek-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleUseOnCanvas();
                            }}
                        >
                            <Sparkles className="size-3.5" />
                            <span>{folderCanvasId ? tv("assetViewer.useOnCanvas") : tv("assetViewer.createNewCanvasAndUse")}</span>
                        </button>
                    </div>
                ) : (
                    <div className="asset-viewer-mobile-expanded-content">
                        {/* Title & Subtitle */}
                        <div>
                            <div className="asset-viewer-title-row">
                                <h2 className="asset-viewer-title-text">{currentAsset.title}</h2>
                            </div>
                            <div className="asset-viewer-meta-subtitle" title={formatFullTime(currentAsset.createdAt || currentAsset.updatedAt, locale)}>
                                {formatCardRelativeTime(currentAsset.createdAt || currentAsset.updatedAt, locale)}
                            </div>
                        </div>

                        {/* Category Selector (Scrollable) */}
                        <div>
                            <div className="asset-viewer-section-title">{tv("assetViewer.categorySection")}</div>
                            {currentAsset.kind === "audio" ? (
                                <div className="flex items-center gap-2">
                                    <span className="asset-viewer-cat-pill is-active cursor-default select-none pointer-events-none">{tv("assetViewer.catAudioReadOnly")}</span>
                                    <span className="text-[11px] text-white/50">({tv("assetViewer.readOnly")})</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                    {CATEGORY_OPTIONS.map((opt) => {
                                        const active = currentAsset.category === opt.value;
                                        return (
                                            <button key={opt.value} type="button" className={`asset-viewer-cat-pill whitespace-nowrap px-3 ${active ? "is-active" : ""}`} disabled={isClassifying} onClick={() => void handleCategoryChange(opt.value)}>
                                                {t(opt.labelKey as any) || opt.value}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Source Canvas Jump */}
                        <div>
                            <div className="asset-viewer-section-title">{tv("assetViewer.sourceCanvas")}</div>
                            {sourceCanvasId ? (
                                <button
                                    type="button"
                                    className="asset-viewer-canvas-capsule w-full"
                                    onClick={() => {
                                        navigate(`/canvas/${sourceCanvasId}`);
                                        onClose();
                                    }}
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <ExternalLink className="size-3.5 text-indigo-400 shrink-0" />
                                        <span className="text-xs font-medium text-white truncate">{sourceCanvasProject?.title || sourceCanvasId}</span>
                                    </div>
                                    <span className="text-[11px] text-white/50">{tv("assetViewer.jumpToCanvas")} →</span>
                                </button>
                            ) : (
                                <div className="text-xs text-white/40 py-1">{tv("assetViewer.noSourceCanvas")}</div>
                            )}
                        </div>

                        {/* AI Prompt */}
                        {promptText ? (
                            <div>
                                <div className="asset-viewer-section-title">{tv("assetViewer.promptTitle")}</div>
                                <div className="asset-viewer-prompt-box">
                                    <button type="button" className="asset-viewer-copy-btn" onClick={handleCopyPrompt}>
                                        {copiedPrompt ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                                        <span>{copiedPrompt ? "OK" : tv("assetViewer.copyPrompt")}</span>
                                    </button>
                                    <div className="pr-16">{promptText}</div>
                                </div>
                            </div>
                        ) : null}

                        {/* Technical Parameters */}
                        <div>
                            <div className="asset-viewer-section-title">{tv("assetViewer.technicalParams")}</div>
                            <div className="asset-viewer-tech-grid">
                                {width && height ? (
                                    <div className="asset-viewer-tech-item">
                                        <span className="asset-viewer-tech-label">{tv("assetViewer.dimensions")}</span>
                                        <span className="asset-viewer-tech-value">
                                            {width} × {height}
                                        </span>
                                    </div>
                                ) : null}
                                {durationMs ? (
                                    <div className="asset-viewer-tech-item">
                                        <span className="asset-viewer-tech-label">{tv("assetViewer.duration")}</span>
                                        <span className="asset-viewer-tech-value">{formatClock(durationMs)}</span>
                                    </div>
                                ) : null}
                                {bytes ? (
                                    <div className="asset-viewer-tech-item">
                                        <span className="asset-viewer-tech-label">{tv("assetViewer.fileSize")}</span>
                                        <span className="asset-viewer-tech-value">{formatBytes(bytes)}</span>
                                    </div>
                                ) : null}
                                <div className="asset-viewer-tech-item">
                                    <span className="asset-viewer-tech-label">{tv("assetViewer.format")}</span>
                                    <span className="asset-viewer-tech-value">{formatName}</span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="asset-viewer-actions-block mt-2">
                            <button type="button" className="asset-viewer-primary-action" onClick={handleUseOnCanvas}>
                                <Sparkles className="size-4" />
                                <span>{folderCanvasId ? tv("assetViewer.useOnCanvas") : tv("assetViewer.createNewCanvasAndUse")}</span>
                            </button>

                            <div className="asset-viewer-secondary-actions">
                                <button type="button" className="asset-viewer-sec-btn" onClick={handleDownload}>
                                    <Download className="size-3.5" />
                                    <span>{tv("assetViewer.download")}</span>
                                </button>
                                {onMove ? (
                                    <button type="button" className="asset-viewer-sec-btn" onClick={() => onMove(currentAsset)}>
                                        <FolderInput className="size-3.5" />
                                        <span>{tv("assetViewer.move")}</span>
                                    </button>
                                ) : null}
                                {onDelete ? (
                                    <button type="button" className="asset-viewer-sec-btn is-danger" onClick={() => onDelete(currentAsset)}>
                                        <Trash2 className="size-3.5" />
                                        <span>{tv("assetViewer.delete")}</span>
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AssetViewerLightbox;
