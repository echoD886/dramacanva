import { motion, useReducedMotion } from "motion/react";
import { useI18n } from "@/i18n/use-i18n";
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { Clapperboard, Image as ImageIcon, List, Music2, Pencil, Table2, UploadCloud, Video, WandSparkles, Workflow as WorkflowIcon } from "lucide-react";

import { useCanvasOverlayLayer } from "@/components/canvas/canvas-overlay-layer";
import { canvasThemes } from "@/lib/canvas-theme";
import { aceternityMotion } from "@/lib/aceternity-motion";
import { subscribeCanvasGraphicsViewportPreview, subscribeCanvasNodeDragPreview, subscribeCanvasViewportPreview } from "@/lib/canvas/canvas-live-viewport";
import { useActiveTheme } from "@/stores/canvas/use-canvas-theme-store";
import { getComposerWidthPreference, subscribeComposerWidthPreference } from "@/lib/canvas/composer-size-preference";
import { CanvasNodeType, type CanvasNodeData, type ConnectionHandle, type Position, type ViewportTransform } from "@/types/canvas";

import { clamp } from "@/lib/utils";
export type PendingConnectionCreate = {
    connection: ConnectionHandle;
    position: Position;
    quick?: boolean;
    batchSourceNodeIds?: string[];
};

export function CanvasSelectionToolbar({ anchorRef, containerRef, count, children }: { anchorRef: RefObject<HTMLDivElement | null>; containerRef: RefObject<HTMLDivElement | null>; count: number; children: ReactNode }) {
    const theme = canvasThemes[useActiveTheme()];
    const { t, number } = useI18n();
    const reducedMotion = useReducedMotion();
    const toolbarRef = useRef<HTMLDivElement>(null);
    const [anchor, setAnchor] = useState<{ left: number; top: number; placement: "above" | "below"; offscreen: boolean } | null>(null);

    useLayoutEffect(() => {
        const element = anchorRef.current;
        const container = containerRef.current;
        if (!element || !container) {
            setAnchor(null);
            return;
        }

        const update = () => {
            const bounds = element.getBoundingClientRect();
            const containerBounds = container.getBoundingClientRect();
            const toolbarWidth = toolbarRef.current?.offsetWidth || 320;
            const toolbarHeight = toolbarRef.current?.offsetHeight || 38;
            const halfWidth = Math.min(toolbarWidth / 2, Math.max(0, containerBounds.width / 2 - 12));
            const center = bounds.left - containerBounds.left + bounds.width / 2;
            const left = Math.min(Math.max(center, 12 + halfWidth), Math.max(12 + halfWidth, containerBounds.width - 12 - halfWidth));
            const boundsTop = bounds.top - containerBounds.top;
            const boundsBottom = bounds.bottom - containerBounds.top;
            const placement = boundsTop - toolbarHeight - 8 >= 68 ? "above" : "below";
            const top = placement === "above" ? boundsTop - 8 : Math.max(12, Math.min(boundsBottom + 8, containerBounds.height - toolbarHeight - 12));
            // 选区整体移出视口时隐藏工具栏；否则它会被夹在视口边缘，悬浮在与节点无关的位置。
            const offscreen = bounds.right <= containerBounds.left || bounds.left >= containerBounds.right || bounds.bottom <= containerBounds.top || bounds.top >= containerBounds.bottom;
            if (toolbarRef.current) {
                toolbarRef.current.style.left = `${left}px`;
                toolbarRef.current.style.top = `${top}px`;
                toolbarRef.current.style.visibility = offscreen ? "hidden" : "";
                toolbarRef.current.classList.toggle("-translate-y-full", placement === "above");
                return;
            }
            setAnchor((current) => (current?.left === left && current.top === top && current.placement === placement && current.offscreen === offscreen ? current : { left, top, placement, offscreen }));
        };

        update();
        const resizeObserver = new ResizeObserver(update);
        resizeObserver.observe(element);
        resizeObserver.observe(container);
        if (toolbarRef.current) resizeObserver.observe(toolbarRef.current);
        const viewportLayer = element.parentElement;
        const mutationObserver = new MutationObserver(update);
        if (viewportLayer) mutationObserver.observe(viewportLayer, { attributes: true, attributeFilter: ["style"] });
        const unsubscribeViewport = subscribeCanvasViewportPreview(container, update);
        window.addEventListener("resize", update);
        return () => {
            resizeObserver.disconnect();
            mutationObserver.disconnect();
            unsubscribeViewport();
            window.removeEventListener("resize", update);
        };
    }, [anchorRef, containerRef, count]);

    if (!anchor) return null;
    return (
        <div
            ref={toolbarRef}
            data-canvas-no-zoom
            className={`absolute z-[var(--z-panel-floating)] max-w-[calc(100%_-_24px)] -translate-x-1/2 ${anchor.placement === "above" ? "-translate-y-full" : ""}`}
            style={{ left: anchor.left, top: anchor.top, visibility: anchor.offscreen ? "hidden" : undefined, color: theme.node.text, transformOrigin: anchor.placement === "above" ? "bottom center" : "top center" }}
            onMouseDown={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
        >
            <motion.div
                initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: anchor.placement === "above" ? 8 : -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={aceternityMotion.spring.panel}
                className="flex items-center gap-2"
            >
                <span
                    className="aceternity-floating-panel shrink-0 rounded-full border px-2.5 py-1.5 text-[var(--fs-tiny)] font-semibold tabular-nums backdrop-blur-2xl"
                    style={{ background: theme.spatial.elevated, borderColor: theme.toolbar.border, color: theme.accent.primary }}
                >
                    {t("selectionToolbar.selected", { count: number(count) })}
                </span>
                <div className="max-w-[min(560px,calc(100vw-90px))]">{children}</div>
            </motion.div>
        </div>
    );
}

export function CanvasNodePanelOverlay({
    node,
    viewport,
    containerRef,
    panelWidth,
    panelHeight = 190,
    dragOffset,
    isDragging = false,
    allowOverflow = false,
    children,
}: {
    node: CanvasNodeData;
    viewport: ViewportTransform;
    containerRef: RefObject<HTMLDivElement | null>;
    panelWidth?: number;
    panelHeight?: number;
    dragOffset?: Position | null;
    isDragging?: boolean;
    allowOverflow?: boolean;
    children: ReactNode;
}) {
    const panelRef = useRef<HTMLDivElement>(null);
    const { bringToFront, zIndex } = useCanvasOverlayLayer(`node-panel:${node.id}`, "var(--z-modal-overlay)");
    const initialWidth = resolveNodePanelWidth(node, viewport, panelWidth);
    // 渲染期读取 clientWidth 会在每次按键重渲染时强制同步布局；只在首帧读取，之后由 ResizeObserver 更新缓存。
    // 这个尺寸只用于首帧占位，挂载后的真实位置由下面的布局 effect 直接写入。
    const containerSizeRef = useRef<{ width: number; height: number } | null>(null);
    if (!containerSizeRef.current && containerRef.current) containerSizeRef.current = { width: containerRef.current.clientWidth, height: containerRef.current.clientHeight };
    // The layout effect measures the attached DOM node after geometry changes.
    // Prompt edits only need this pure fallback, not another synchronous layout.
    const initialPosition = getNodePanelPosition(node, viewport, containerSizeRef.current || { width: 0, height: 0 }, initialWidth, panelHeight, dragOffset);

    useLayoutEffect(() => {
        bringToFront();
    }, [bringToFront]);

    useLayoutEffect(() => {
        const container = containerRef.current;
        const panel = panelRef.current;
        if (!container || !panel) return;
        let liveViewport = viewport;
        let liveDragOffset = dragOffset;
        let viewportSize = { width: container.clientWidth, height: container.clientHeight };
        const update = (nextViewport: ViewportTransform) => {
            liveViewport = nextViewport;
            const nextWidth = resolveNodePanelWidth(node, nextViewport, panelWidth);
            panel.style.width = `${nextWidth}px`;
            if (allowOverflow) panel.style.overflowY = panel.scrollHeight > panel.clientHeight + 1 ? "auto" : "visible";
            const nodeElement = container.querySelector<HTMLElement>(`[data-node-id="${CSS.escape(node.id)}"]`);
            const position = nodeElement ? getAttachedNodePanelPosition(nodeElement, container, nextWidth, panel.offsetHeight) : getNodePanelPosition(node, nextViewport, viewportSize, nextWidth, panel.offsetHeight || panelHeight, liveDragOffset);
            panel.style.transform = `translate3d(${position.left}px, ${position.top}px, 0)`;
            if (typeof document !== "undefined" && document.documentElement.dataset.canvasTourActive) {
                window.dispatchEvent(new Event("resize"));
            }
        };
        update(viewport);
        const resizeObserver = new ResizeObserver(() => {
            viewportSize = { width: container.clientWidth, height: container.clientHeight };
            containerSizeRef.current = viewportSize;
            update(liveViewport);
        });
        resizeObserver.observe(container);
        resizeObserver.observe(panel);
        if (panel.firstElementChild) resizeObserver.observe(panel.firstElementChild);
        const unsubscribeViewport = subscribeCanvasGraphicsViewportPreview(container, update);
        const unsubscribeDrag = subscribeCanvasNodeDragPreview(container, (preview) => {
            liveDragOffset = preview?.nodeIds.has(node.id) ? { x: preview.x, y: preview.y } : null;
            update(liveViewport);
        });
        const unsubscribeWidth = subscribeComposerWidthPreference(() => update(liveViewport));
        return () => {
            resizeObserver.disconnect();
            unsubscribeViewport();
            unsubscribeDrag();
            unsubscribeWidth();
        };
    }, [allowOverflow, containerRef, dragOffset?.x, dragOffset?.y, isDragging, node.height, node.id, node.position.x, node.position.y, node.width, panelHeight, panelWidth, viewport]);

    return (
        <div
            ref={panelRef}
            data-canvas-no-zoom
            data-canvas-node-panel
            className={`thin-scrollbar absolute max-w-[calc(100%_-_24px)] ${allowOverflow ? "overflow-visible" : "overflow-y-auto"}`}
            style={{ left: 0, top: 0, transform: `translate3d(${initialPosition.left}px, ${initialPosition.top}px, 0)`, width: initialWidth, maxHeight: `max(0px, calc(100% - ${CANVAS_TOP_BAR_SAFE_AREA + CANVAS_BOTTOM_DOCK_SAFE_AREA}px))`, zIndex }}
            onMouseDown={(event) => event.stopPropagation()}
            onPointerDownCapture={bringToFront}
            onFocusCapture={bringToFront}
            onPointerDown={(event) => event.stopPropagation()}
        >
            {children}
        </div>
    );
}

function resolveNodePanelWidth(node: CanvasNodeData, viewport: ViewportTransform, requestedWidth?: number) {
    if (requestedWidth) return requestedWidth;
    // 用户拖动输入面板右下角设定的宽度优先；超出画布时由 max-width 收窄。
    return getComposerWidthPreference() ?? clamp(Math.round(node.width * viewport.k * 1.5), 680, 920);
}

export function CanvasConnectionCreateMenu({
    pending,
    viewport,
    viewportSize,
    containerRef,
    canCreateDrawing,
    getDisabledReason,
    onCreate,
    onUploadFiles,
    onClose,
}: {
    pending: PendingConnectionCreate;
    viewport: ViewportTransform;
    viewportSize: { width: number; height: number };
    containerRef: RefObject<HTMLDivElement | null>;
    canCreateDrawing: boolean;
    getDisabledReason: (
        type: CanvasNodeType.Image | CanvasNodeType.Text | CanvasNodeType.Script | CanvasNodeType.BatchTable | CanvasNodeType.Video | CanvasNodeType.Audio | CanvasNodeType.Drawing | CanvasNodeType.Config | CanvasNodeType.MediaConversion | "depth-capture",
        provider?: "runninghub",
    ) => string;
    onCreate: (
        type: CanvasNodeType.Image | CanvasNodeType.Text | CanvasNodeType.Script | CanvasNodeType.BatchTable | CanvasNodeType.Video | CanvasNodeType.Audio | CanvasNodeType.Drawing | CanvasNodeType.Config | CanvasNodeType.MediaConversion | "depth-capture",
        provider?: "runninghub",
    ) => void;
    onUploadFiles?: (files: File[]) => void;
    onClose: () => void;
}) {
    const theme = canvasThemes[useActiveTheme()];
    const { t } = useI18n();
    const reducedMotion = useReducedMotion();
    const menuRef = useRef<HTMLDivElement>(null);
    const uploadInputRef = useRef<HTMLInputElement>(null);
    const [activeOption, setActiveOption] = useState<string | null>(null);
    const lastPointerRef = useRef<Position | null>(null);
    const { bringToFront, zIndex } = useCanvasOverlayLayer("connection-create-menu", "var(--z-modal-overlay)");
    const menuWidth = Math.min(288, Math.max(0, viewportSize.width - 24));
    const menuHeight = (canCreateDrawing ? 448 : 404) + 44;
    const menuMaxHeight = Math.max(0, viewportSize.height - 24);
    const gap = 12;
    const initialPosition = getConnectionMenuPosition(pending.position, viewport, viewportSize, menuWidth, Math.min(menuHeight, menuMaxHeight), gap);

    useLayoutEffect(() => {
        bringToFront();
    }, [bringToFront]);

    useLayoutEffect(() => {
        const container = containerRef.current;
        const menu = menuRef.current;
        if (!container || !menu) return;
        const update = (nextViewport: ViewportTransform) => {
            const containerBounds = container.getBoundingClientRect();
            const position = getConnectionMenuPosition(pending.position, nextViewport, { width: containerBounds.width, height: containerBounds.height }, menu.offsetWidth || menuWidth, menu.offsetHeight || menuHeight, gap);
            menu.style.left = `${position.left}px`;
            menu.style.top = `${position.top}px`;
        };
        update(viewport);
        return subscribeCanvasViewportPreview(container, update);
    }, [containerRef, pending.position, viewport, viewportSize.height, viewportSize.width]);

    return (
        <motion.div
            ref={menuRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: aceternityMotion.duration.instant, ease: aceternityMotion.easing.enter }}
            className="thin-scrollbar absolute origin-top-left overflow-x-hidden overflow-y-auto rounded-[var(--r-2xl)] border p-2"
            data-canvas-no-zoom
            data-connection-create-menu
            aria-label={t("connectionMenu.next")}
            onKeyDown={(event) => {
                if (event.key === "Escape") {
                    event.stopPropagation();
                    onClose();
                }
            }}
            style={{ width: menuWidth, maxHeight: menuMaxHeight, left: initialPosition.left, top: initialPosition.top, zIndex, background: theme.spatial.elevated, borderColor: theme.toolbar.border, color: theme.node.text }}
            onMouseDown={(event) => event.stopPropagation()}
            onPointerDownCapture={bringToFront}
            onFocusCapture={(event) => {
                bringToFront();
                if (event.target.matches(":focus-visible")) setActiveOption(event.target.closest<HTMLElement>("[data-create-option]")?.dataset.createOption || null);
            }}
            onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setActiveOption(null);
            }}
            onPointerMove={(event) => {
                if (event.pointerType === "touch") return;
                const previous = lastPointerRef.current;
                // Layout changes can retarget a stationary pointer; only real movement selects a new row.
                if (previous?.x === event.clientX && previous.y === event.clientY) return;
                lastPointerRef.current = { x: event.clientX, y: event.clientY };
                const option = (event.target as Element).closest<HTMLElement>("[data-create-option]")?.dataset.createOption;
                if (option) setActiveOption(option);
            }}
            onPointerLeave={() => {
                lastPointerRef.current = null;
                setActiveOption(null);
            }}
            onPointerDown={(event) => event.stopPropagation()}
        >
            <div className="grid min-w-0 grid-cols-1 gap-1">
                <ConnectionCreateOption
                    tourId="text"
                    expanded={activeOption === t("nodeToolbar.textGeneration")}
                    motionEnabled={!reducedMotion}
                    icon={<List className="size-4" />}
                    title={t("nodeToolbar.textGeneration")}
                    description={t("connectionMenu.textHelp")}
                    disabledReason={getDisabledReason(CanvasNodeType.Text)}
                    onClick={() => onCreate(CanvasNodeType.Text)}
                />
                <ConnectionCreateOption
                    tourId="script"
                    expanded={activeOption === t("nodeInfo.script")}
                    motionEnabled={!reducedMotion}
                    icon={<Clapperboard className="size-4" />}
                    title={t("nodeInfo.script")}
                    description={t("connectionMenu.scriptHelp")}
                    disabledReason={getDisabledReason(CanvasNodeType.Script)}
                    onClick={() => onCreate(CanvasNodeType.Script)}
                />
                <ConnectionCreateOption
                    tourId="batch"
                    expanded={activeOption === t("connectionMenu.batchTable")}
                    motionEnabled={!reducedMotion}
                    icon={<Table2 className="size-4" />}
                    title={t("connectionMenu.batchTable")}
                    description={t("connectionMenu.batchTableHelp")}
                    disabledReason={getDisabledReason(CanvasNodeType.BatchTable)}
                    onClick={() => onCreate(CanvasNodeType.BatchTable)}
                />
                <ConnectionCreateOption
                    tourId="image"
                    expanded={activeOption === t("connectionMenu.image")}
                    motionEnabled={!reducedMotion}
                    icon={<ImageIcon className="size-4" />}
                    title={t("connectionMenu.image")}
                    description={t("connectionMenu.imageHelp")}
                    disabledReason={getDisabledReason(CanvasNodeType.Image)}
                    onClick={() => onCreate(CanvasNodeType.Image)}
                />
                <ConnectionCreateOption
                    tourId="config"
                    expanded={activeOption === t("nodeToolbar.config")}
                    motionEnabled={!reducedMotion}
                    icon={<WorkflowIcon className="size-4" />}
                    title={t("nodeToolbar.config")}
                    description={t("connectionMenu.configHelp")}
                    disabledReason={getDisabledReason(CanvasNodeType.Config)}
                    onClick={() => onCreate(CanvasNodeType.Config)}
                />
                {canCreateDrawing ? (
                    <ConnectionCreateOption
                        tourId="drawing"
                        expanded={activeOption === t("nodeInfo.drawing")}
                        motionEnabled={!reducedMotion}
                        icon={<Pencil className="size-4" />}
                        title={t("nodeInfo.drawing")}
                        description={t("connectionMenu.drawingHelp")}
                        disabledReason={getDisabledReason(CanvasNodeType.Drawing)}
                        onClick={() => onCreate(CanvasNodeType.Drawing)}
                    />
                ) : null}
                <ConnectionCreateOption
                    tourId="video"
                    expanded={activeOption === t("connectionMenu.video")}
                    motionEnabled={!reducedMotion}
                    icon={<Video className="size-4" />}
                    title={t("connectionMenu.video")}
                    description={t("connectionMenu.videoHelp")}
                    disabledReason={getDisabledReason(CanvasNodeType.Video)}
                    onClick={() => onCreate(CanvasNodeType.Video)}
                />
                <ConnectionCreateOption
                    tourId="audio"
                    expanded={activeOption === t("connectionMenu.audio")}
                    motionEnabled={!reducedMotion}
                    icon={<Music2 className="size-4" />}
                    title={t("connectionMenu.audio")}
                    description={t("connectionMenu.audioHelp")}
                    disabledReason={getDisabledReason(CanvasNodeType.Audio)}
                    onClick={() => onCreate(CanvasNodeType.Audio)}
                />
                <ConnectionCreateOption
                    tourId="upload-asset"
                    expanded={activeOption === t("connectionMenu.uploadAsset")}
                    motionEnabled={!reducedMotion}
                    icon={<UploadCloud className="size-4" />}
                    title={t("connectionMenu.uploadAsset")}
                    description={t("connectionMenu.uploadAssetHelp")}
                    disabledReason=""
                    onClick={() => uploadInputRef.current?.click()}
                />
                {!getDisabledReason("depth-capture") && (
                    <ConnectionCreateOption
                        tourId="depth-capture"
                        expanded={activeOption === t("canvasExtra.tool.depthCapture")}
                        motionEnabled={!reducedMotion}
                        icon={<WandSparkles className="size-4" />}
                        title={t("canvasExtra.tool.depthCapture")}
                        description={t("canvasExtra.mediaConv.depthVideoHint")}
                        disabledReason=""
                        onClick={() => onCreate("depth-capture")}
                    />
                )}
                <ConnectionCreateOption
                    tourId="conversion"
                    expanded={activeOption === t("canvasExtra.mediaConv.nodeTitle")}
                    motionEnabled={!reducedMotion}
                    icon={<WandSparkles className="size-4" />}
                    title={t("canvasExtra.mediaConv.nodeTitle")}
                    description={t("connectionMenu.convertHelp")}
                    disabledReason={getDisabledReason(CanvasNodeType.MediaConversion)}
                    onClick={() => onCreate(CanvasNodeType.MediaConversion)}
                />
            </div>
            <input
                ref={uploadInputRef}
                type="file"
                multiple
                accept="image/*,video/*,audio/*,.mp3,.wav"
                className="hidden"
                onChange={(event) => {
                    const files = Array.from(event.target.files || []);
                    event.target.value = "";
                    if (files.length) {
                        onUploadFiles?.(files);
                        onClose();
                    }
                }}
            />
        </motion.div>
    );
}

function ConnectionCreateOption({
    tourId,
    expanded,
    motionEnabled,
    icon,
    title,
    description,
    disabledReason,
    onClick,
}: {
    tourId: string;
    expanded: boolean;
    motionEnabled: boolean;
    icon: ReactNode;
    title: string;
    description: string;
    disabledReason?: string;
    onClick: () => void;
}) {
    const theme = canvasThemes[useActiveTheme()];
    return (
        <button
            type="button"
            aria-disabled={Boolean(disabledReason)}
            aria-label={title}
            aria-description={disabledReason || description}
            data-create-option={title}
            data-canvas-tour-option={tourId}
            data-expanded={expanded}
            data-motion={motionEnabled ? "enabled" : "reduced"}
            className="canvas-connection-create-option group flex min-h-10 w-full cursor-pointer items-start gap-2 rounded-[var(--dock-item-radius)] px-2 py-1.5 text-left outline-none focus-visible:ring-2 aria-disabled:cursor-not-allowed aria-disabled:opacity-40"
            style={{ color: theme.node.text, "--tw-ring-color": theme.node.muted, background: expanded ? theme.toolbar.itemHover : undefined } as CSSProperties}
            onClick={() => {
                if (!disabledReason) onClick();
            }}
        >
            <span className="grid size-7 shrink-0 place-items-center rounded-[var(--r-md)] opacity-65 transition-opacity group-hover:opacity-100 [&_svg]:size-3.5" style={{ background: theme.toolbar.itemHover }}>
                {icon}
            </span>
            <span className="min-w-0 flex-1 pt-1.5">
                <span className="flex items-center gap-2 text-[var(--fs-tiny)] font-semibold leading-4">{title}</span>
                <span aria-hidden="true" className="canvas-connection-create-description" style={{ color: theme.node.muted }}>
                    <span className="min-h-0 overflow-hidden">
                        <span className="block pt-1 whitespace-normal break-words text-[var(--fs-micro)] leading-relaxed">{disabledReason || description}</span>
                    </span>
                </span>
            </span>
        </button>
    );
}

export function getConnectionMenuPosition(position: Position, viewport: ViewportTransform, viewportSize: { width: number; height: number }, menuWidth: number, menuHeight: number, gap: number) {
    const screenX = viewport.x + position.x * viewport.k;
    const screenY = viewport.y + position.y * viewport.k;
    const maxTop = Math.max(gap, viewportSize.height - menuHeight - gap);
    return {
        left: clamp(screenX, gap, Math.max(gap, viewportSize.width - menuWidth - gap)),
        top: clamp(screenY, Math.min(72, maxTop), maxTop),
    };
}

function getAttachedNodePanelPosition(nodeElement: HTMLElement, container: HTMLElement, panelWidth: number, panelHeight: number) {
    const nodeRect = nodeElement.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    return getVisibleNodePanelPosition(nodeRect.left - containerRect.left + nodeRect.width / 2, nodeRect.top - containerRect.top, nodeRect.bottom - containerRect.top, { width: containerRect.width, height: containerRect.height }, panelWidth, panelHeight);
}

export function getNodePanelPosition(node: CanvasNodeData, viewport: ViewportTransform, viewportSize: { width: number; height: number }, panelWidth: number, panelHeight: number, dragOffset?: Position | null) {
    const offsetX = dragOffset?.x || 0;
    const offsetY = dragOffset?.y || 0;
    const nodeCenterX = viewport.x + (node.position.x + offsetX + node.width / 2) * viewport.k;
    const nodeTop = viewport.y + (node.position.y + offsetY) * viewport.k;
    const nodeBottom = viewport.y + (node.position.y + offsetY + node.height) * viewport.k;
    return getVisibleNodePanelPosition(nodeCenterX, nodeTop, nodeBottom, viewportSize, panelWidth, panelHeight);
}

// 画布底部悬浮着工具栏、缩放条和 Agent 按钮（距底 16px、高 40px），顶部有画布名称与操作栏；输入面板不能压在它们上面。
export const CANVAS_BOTTOM_DOCK_SAFE_AREA = 104; // Agent 按钮距底 20px、高 76px，再留 8px
export const CANVAS_TOP_BAR_SAFE_AREA = 72; // 与 --canvas-topbar-offset 一致

function getVisibleNodePanelPosition(nodeCenterX: number, nodeTop: number, nodeBottom: number, viewportSize: { width: number; height: number }, panelWidth: number, panelHeight: number) {
    const gap = 10;
    const edge = 12;
    const bottomEdge = CANVAS_BOTTOM_DOCK_SAFE_AREA;
    const topEdge = CANVAS_TOP_BAR_SAFE_AREA;
    const visibleHeight = Math.min(panelHeight, Math.max(0, viewportSize.height - topEdge - bottomEdge));
    const belowSpace = viewportSize.height - bottomEdge - nodeBottom - gap;
    const aboveSpace = nodeTop - gap - topEdge;
    const placement = belowSpace >= visibleHeight || belowSpace >= aboveSpace ? "below" : "above";
    return {
        left: clamp(nodeCenterX - panelWidth / 2, edge, Math.max(edge, viewportSize.width - panelWidth - edge)),
        top: clamp(placement === "below" ? nodeBottom + gap : nodeTop - gap - visibleHeight, topEdge, Math.max(topEdge, viewportSize.height - visibleHeight - bottomEdge)),
        placement,
    };
}
