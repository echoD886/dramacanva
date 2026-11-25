import { useEffect, useId, useLayoutEffect, useRef, useState, type FocusEvent, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { Image as ImageIcon, Music2, Video } from "lucide-react";
import type { CanvasResourceReference } from "@/lib/canvas/canvas-resource-references";
import { canvasThemes } from "@/lib/canvas-theme";
import { isResourceUrl, playbackVariantUrl, resourceFileUrl, resourceIdFromStorageKey, resourceThumbnailUrl } from "@/services/api/resources";
import { useActiveTheme } from "@/stores/canvas/use-canvas-theme-store";
import { useI18n } from "@/i18n/use-i18n";
import { localizedCanvasReferenceLabel, localizedCanvasReferenceTitle } from "@/i18n/canvas-reference-label";
import "./canvas-reference-hover-preview.css";

const OPEN_DELAY = 140;
const CLOSE_DELAY = 120;
const FADE_DURATION = 120;
const TARGET_SELECTOR = "[data-media-preview-id], [data-mention-reference-id], [data-reference-node-id]";

export function referenceHoverSize(width: number, height: number, availableWidth = 320, availableHeight = 320) {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
    // Extreme ratios cannot satisfy both limits; preserve the ratio and longest-edge cap.
    const scale = Math.min(Math.max(120 / Math.min(width, height), 1), 320 / Math.max(width, height), Math.max(0, availableWidth) / width, Math.max(0, availableHeight) / height);
    return { width: width * scale, height: height * scale };
}

export function referenceHoverImageUrl(reference: CanvasResourceReference) {
    if (!["image", "video", "character"].includes(reference.kind)) return "";
    const key = reference.kind === "video" ? reference.previewStorageKey : reference.storageKey;
    const url = reference.previewUrl || "";
    const id = resourceIdFromStorageKey(key) || (isResourceUrl(url) ? decodeURIComponent(/\/resources\/([^/]+)\/file/.exec(url)?.[1] || "") : "");
    return id ? resourceThumbnailUrl(id) : url;
}

export function referenceHoverPosition(anchor: Pick<DOMRect, "left" | "top" | "bottom" | "width">, width: number, height: number, viewportWidth: number, viewportHeight: number) {
    const inset = 8;
    const gap = 8;
    const above = anchor.top - gap - inset;
    const below = viewportHeight - anchor.bottom - gap - inset;
    const placement = above >= height || above >= below ? "top" : "bottom";
    const maxHeight = Math.max(0, placement === "top" ? above : below);
    return {
        left: Math.max(inset, Math.min(anchor.left + (anchor.width - width) / 2, viewportWidth - width - inset)),
        top: placement === "top" ? anchor.top - gap - Math.min(height, maxHeight) : anchor.bottom + gap,
        maxHeight,
        placement,
    };
}

/** Delegation also covers chips built as native DOM without changing editor selection. */
export function useCanvasReferenceHoverPreview(references: CanvasResourceReference[]) {
    const tooltipId = useId();
    const refs = useRef(references);
    refs.current = references;
    const openTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const fadeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const targetRef = useRef<HTMLElement | null>(null);
    const focusedRef = useRef<HTMLElement | null>(null);
    const hoveredRef = useRef<HTMLElement | null>(null);
    const [target, setTarget] = useState<{ anchor: HTMLElement; reference: CanvasResourceReference } | null>(null);
    const [visible, setVisible] = useState(false);

    const dismiss = () => {
        clearTimeout(openTimer.current);
        clearTimeout(closeTimer.current);
        setVisible(false);
        clearTimeout(fadeTimer.current);
        fadeTimer.current = setTimeout(() => setTarget(null), FADE_DURATION);
        targetRef.current = null;
        focusedRef.current = null;
        hoveredRef.current = null;
    };
    const hold = () => {
        clearTimeout(closeTimer.current);
        clearTimeout(fadeTimer.current);
        setVisible(true);
    };
    const open = (anchor: HTMLElement) => {
        const id = anchor.dataset.mediaPreviewId || anchor.dataset.mentionReferenceId || anchor.dataset.referenceNodeId;
        const reference = refs.current.find((item) => item.id === id);
        if (!reference || !["image", "video", "audio", "character"].includes(reference.kind)) return;
        clearTimeout(closeTimer.current);
        clearTimeout(fadeTimer.current);
        if (targetRef.current === anchor) {
            hold();
            return;
        }
        clearTimeout(openTimer.current);
        openTimer.current = setTimeout(() => {
            if (!anchor.isConnected) return;
            targetRef.current = anchor;
            setTarget({ anchor, reference });
            setVisible(true);
        }, OPEN_DELAY);
    };
    const close = () => {
        clearTimeout(openTimer.current);
        if (focusedRef.current || hoveredRef.current) return;
        clearTimeout(closeTimer.current);
        closeTimer.current = setTimeout(dismiss, CLOSE_DELAY);
    };
    const findTarget = (eventTarget: EventTarget | null, root: HTMLElement) => {
        const anchor = eventTarget instanceof Element ? eventTarget.closest<HTMLElement>(TARGET_SELECTOR) : null;
        // React portal events bubble through the editor; only the menu owns its candidates.
        return anchor && root.contains(anchor) ? anchor : null;
    };
    const handlers = {
        onMouseDownCapture: (event: React.MouseEvent<HTMLElement>) => {
            const anchor = findTarget(event.target, event.currentTarget);
            if (!anchor?.matches("[data-mention-reference-id], [data-reference-node-id]") || !anchor.hasAttribute("tabindex")) return;
            // Tab can focus a chip; pointer clicks keep the editor's native caret behavior.
            anchor.removeAttribute("tabindex");
            window.setTimeout(() => {
                if (anchor.isConnected) anchor.tabIndex = 0;
            }, 0);
        },
        onPointerOver: (event: PointerEvent<HTMLElement>) => {
            if (event.pointerType === "touch") return;
            const anchor = findTarget(event.target, event.currentTarget);
            if (!anchor || anchor.contains(event.relatedTarget as Node | null)) return;
            hoveredRef.current = anchor;
            open(anchor);
        },
        onPointerOut: (event: PointerEvent<HTMLElement>) => {
            const anchor = findTarget(event.target, event.currentTarget);
            if (!anchor || anchor.contains(event.relatedTarget as Node | null)) return;
            hoveredRef.current = null;
            close();
        },
        onFocusCapture: (event: FocusEvent<HTMLElement>) => {
            const anchor = findTarget(event.target, event.currentTarget);
            if (!anchor) return;
            focusedRef.current = anchor;
            open(anchor);
        },
        onBlurCapture: (event: FocusEvent<HTMLElement>) => {
            const anchor = findTarget(event.target, event.currentTarget);
            if (!anchor || anchor.contains(event.relatedTarget as Node | null)) return;
            focusedRef.current = null;
            close();
        },
    };

    useEffect(
        () => () => {
            clearTimeout(openTimer.current);
            clearTimeout(closeTimer.current);
            clearTimeout(fadeTimer.current);
        },
        [],
    );
    useEffect(() => {
        if (!target) return;
        const anchor = target.anchor;
        const previous = anchor.getAttribute("aria-describedby");
        anchor.setAttribute("aria-describedby", [previous, tooltipId].filter(Boolean).join(" "));
        const escape = (event: globalThis.KeyboardEvent) => {
            if (event.key === "Escape") dismiss();
        };
        document.addEventListener("keydown", escape);
        return () => {
            if (previous === null) anchor.removeAttribute("aria-describedby");
            else anchor.setAttribute("aria-describedby", previous);
            document.removeEventListener("keydown", escape);
        };
    }, [target, tooltipId]);

    return {
        handlers,
        preview: target ? (
            <CanvasReferenceHoverPreview id={tooltipId} anchor={target.anchor} reference={references.find((reference) => reference.id === target.reference.id) || target.reference} visible={visible} onEnter={hold} onLeave={close} onDismiss={dismiss} />
        ) : null,
    };
}

function CanvasReferenceHoverPreview({
    id,
    anchor,
    reference,
    visible,
    onEnter,
    onLeave,
    onDismiss,
}: {
    id: string;
    anchor: HTMLElement;
    reference: CanvasResourceReference;
    visible: boolean;
    onEnter: () => void;
    onLeave: () => void;
    onDismiss: () => void;
}) {
    const themeName = useActiveTheme();
    const { t } = useI18n();
    const theme = canvasThemes[themeName as keyof typeof canvasThemes] || canvasThemes.dark;
    const cardRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [position, setPosition] = useState<ReturnType<typeof referenceHoverPosition> | null>(null);
    const [duration, setDuration] = useState(reference.durationMs);
    const [imageFailed, setImageFailed] = useState(false);
    const [videoFailed, setVideoFailed] = useState(false);
    const [dimensions, setDimensions] = useState<{ source: string; width: number; height: number } | null>(null);
    const [available, setAvailable] = useState({ width: 320, height: 320 });
    const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const imageUrl = referenceHoverImageUrl(reference);
    const resourceId = resourceIdFromStorageKey(reference.storageKey);
    const mediaUrl = resourceId && reference.kind === "video" ? playbackVariantUrl(resourceId) : reference.mediaUrl || (resourceId && reference.kind === "audio" ? resourceFileUrl(resourceId) : "");
    const source = `${reference.id}:${imageUrl}:${mediaUrl}`;
    const size = dimensions?.source === source ? referenceHoverSize(dimensions.width, dimensions.height, available.width, available.height) : null;
    const hasMedia = (reference.kind === "video" && mediaUrl && !videoFailed) || (imageUrl && !imageFailed);
    useEffect(() => {
        if (reference.kind !== "video" || !imageUrl) return;
        const poster = new Image();
        let cancelled = false;
        poster.onload = () => {
            if (!cancelled) setDimensions((current) => (current?.source === source ? current : { source, width: poster.naturalWidth, height: poster.naturalHeight }));
        };
        poster.src = imageUrl;
        return () => {
            cancelled = true;
        };
    }, [source, imageUrl, reference.kind]);
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        if (visible && !reducedMotion) void video.play().catch(() => {});
        else video.pause();
    }, [visible, reducedMotion, mediaUrl]);
    useEffect(() => {
        setImageFailed(false);
        setVideoFailed(false);
        setDuration(reference.durationMs);
    }, [reference]);
    useEffect(() => {
        const query = window.matchMedia("(prefers-reduced-motion: reduce)");
        const update = () => setReducedMotion(query.matches);
        query.addEventListener("change", update);
        return () => query.removeEventListener("change", update);
    }, []);
    useLayoutEffect(() => {
        let frame: number;
        const measure = () => {
            const card = cardRef.current;
            if (!anchor.isConnected || !card) {
                onDismiss();
                return false;
            }
            const rect = anchor.getBoundingClientRect();
            if (rect.bottom < 0 || rect.top > window.innerHeight || rect.width === 0) {
                onDismiss();
                return false;
            }
            const height = card.scrollHeight + card.offsetHeight - card.clientHeight;
            const bounds = { width: Math.max(0, window.innerWidth - 18), height: Math.max(0, Math.max(rect.top - 16, window.innerHeight - rect.bottom - 16) - 38) };
            setAvailable((current) => (current.width === bounds.width && current.height === bounds.height ? current : bounds));
            const next = referenceHoverPosition(rect, card.offsetWidth, height, window.innerWidth, window.innerHeight);
            setPosition((current) => (current && current.left === next.left && current.top === next.top && current.maxHeight === next.maxHeight && current.placement === next.placement ? current : next));
            return true;
        };
        const observer = new ResizeObserver(measure);
        if (cardRef.current) observer.observe(cardRef.current);
        const update = () => {
            // Canvas pan/zoom changes transforms without firing scroll or resize events.
            if (measure()) frame = requestAnimationFrame(update);
        };
        update();
        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
        };
    }, [anchor, reference]);
    const Icon = reference.kind === "audio" ? Music2 : reference.kind === "video" ? Video : ImageIcon;
    const fallback = (
        <div className="canvas-reference-hover-fallback">
            <Icon aria-hidden />
            <span>{duration !== undefined && Number.isFinite(duration) ? `${Math.floor(duration / 60000)}:${String(Math.floor(duration / 1000) % 60).padStart(2, "0")}` : localizedCanvasReferenceLabel(reference, t)}</span>
        </div>
    );
    return createPortal(
        <div
            ref={cardRef}
            id={id}
            role="tooltip"
            data-canvas-no-zoom
            data-placement={position?.placement}
            data-visible={visible}
            className="canvas-reference-hover-preview aceternity-floating-panel"
            style={
                {
                    left: position?.left,
                    top: position?.top,
                    width: (hasMedia ? (size?.width ?? 160) : 240) + 2,
                    visibility: position ? "visible" : "hidden",
                    background: theme.spatial.elevated,
                    borderColor: theme.toolbar.border,
                    color: theme.node.text,
                    "--canvas-reference-preview-available-height": `${Math.max(0, (position?.maxHeight ?? 280) - 34)}px`,
                } as React.CSSProperties
            }
            onPointerEnter={onEnter}
            onPointerLeave={onLeave}
            onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
            }}
            onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
            }}
            onClick={(event) => event.stopPropagation()}
            onWheel={(event) => event.stopPropagation()}
        >
            <div className="canvas-reference-hover-frame" style={{ height: hasMedia ? (size?.height ?? 120) : undefined }}>
                {hasMedia && !size ? <div className="canvas-reference-hover-skeleton" aria-busy="true" /> : null}
                {reference.kind === "video" && mediaUrl && !videoFailed ? (
                    <video
                        key={source}
                        ref={videoRef}
                        className="canvas-reference-hover-media"
                        src={mediaUrl}
                        poster={imageUrl || undefined}
                        muted
                        playsInline
                        loop
                        autoPlay={visible && !reducedMotion}
                        preload="metadata"
                        onError={() => setVideoFailed(true)}
                        onLoadedMetadata={(event) => {
                            setDimensions({ source, width: event.currentTarget.videoWidth, height: event.currentTarget.videoHeight });
                            if (!reducedMotion && visible) void event.currentTarget.play().catch(() => {});
                            else event.currentTarget.currentTime = Math.min(0.001, event.currentTarget.duration || 0);
                        }}
                    />
                ) : imageUrl && !imageFailed ? (
                    <img
                        key={source}
                        className="canvas-reference-hover-media"
                        src={imageUrl}
                        alt=""
                        decoding="async"
                        onLoad={(event) => setDimensions({ source, width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
                        onError={() => setImageFailed(true)}
                    />
                ) : (
                    fallback
                )}
            </div>
            {reference.kind === "audio" && mediaUrl && duration === undefined ? <audio src={mediaUrl} preload="metadata" onLoadedMetadata={(event) => setDuration(event.currentTarget.duration * 1000)} /> : null}
            <div className="canvas-reference-hover-name">{localizedCanvasReferenceTitle(reference, t)}</div>
        </div>,
        anchor.closest<HTMLElement>(".ant-modal-wrap") || document.body,
    );
}
