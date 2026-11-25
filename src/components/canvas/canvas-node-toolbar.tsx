import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { App, Button, Dropdown, Input, Modal, Tag, Tooltip } from "antd";
import type { MenuProps } from "antd";
import { Camera, Check, ChevronDown, ChevronRight, Ellipsis, Images, Plus, SlidersHorizontal, UserRound } from "lucide-react";

import { canvasDockStyle } from "@/lib/canvas/canvas-aceternity-style";
import { useResourceDelivery } from "@/hooks/use-resource-delivery";
import { WatermarkNotice } from "@/components/watermark-notice";
import { ASSET_CATEGORY_OPTIONS } from "@/lib/asset-category";
import { canvasThemes } from "@/lib/canvas-theme";
import { resolveNodeToolbarPlacement, resolveToolbarTools, resolveToolbarDisplayLabel, type NodeToolbarGroup, type ToolContext, type ToolbarHandlers } from "@/lib/canvas/tool-registry";
import { subscribeCanvasGraphicsViewportPreview } from "@/lib/canvas/canvas-live-viewport";
import { canvasNodeAssetCategory } from "@/lib/canvas/canvas-node-asset";
import type { ImageSplitParams } from "@/lib/canvas/canvas-image-data";
import { formatBytes, getDataUrlByteSize } from "@/lib/image-utils";
import { localizedGenerationError } from "@/i18n/generation-error";
import { GenerationErrorCard } from "@/components/generation-error-card";
import { localizedCanvasMentionText } from "@/i18n/canvas-reference-label";
import { useCopyText } from "@/hooks/use-copy-text";
import { useI18n } from "@/i18n/use-i18n";
import { DATE_TIME_FORMAT } from "@/i18n/locale-core";
import { localizedNodeLabel } from "@/i18n/canvas-node-label";
import { useActiveTheme } from "@/stores/canvas/use-canvas-theme-store";
import { CanvasNodeType, type CanvasNodeData, type CanvasNodeMetadata, type CanvasWorkspaceMode, type ViewportTransform } from "@/types/canvas";
import { buildImageToolbarTools } from "./canvas-image-toolbar-tools";
import { CanvasGridSplitPicker } from "./canvas-grid-split-picker";
import { canRemakeCanvasVideo } from "@/lib/canvas/canvas-video-remake";

type CanvasNodeToolbarProps = {
    node: CanvasNodeData | null;
    viewport: ViewportTransform;
    containerRef: RefObject<HTMLDivElement | null>;
    onKeep: (nodeId: string) => void;
    onLeave: () => void;
    onInfo: (node: CanvasNodeData) => void;
    onEditText: (node: CanvasNodeData) => void;
    onDecreaseFont: (node: CanvasNodeData) => void;
    onIncreaseFont: (node: CanvasNodeData) => void;
    onToggleDialog: (node: CanvasNodeData) => void;
    onAnnotate: (node: CanvasNodeData) => void;
    onGenerateImage: (node: CanvasNodeData) => void;
    onUpload: (node: CanvasNodeData) => void;
    onDownload: (node: CanvasNodeData) => void;
    onSaveAsset: (node: CanvasNodeData) => void;
    onMaskEdit: (node: CanvasNodeData) => void;
    onEmotion: (node: CanvasNodeData) => void;
    onPortraitTexture: (node: CanvasNodeData) => void;
    onCrop: (node: CanvasNodeData) => void;
    onSplit: (node: CanvasNodeData, params: ImageSplitParams) => void;
    onUpscale: (node: CanvasNodeData) => void;
    onSuperResolve: (node: CanvasNodeData) => void;
    onAngle: (node: CanvasNodeData) => void;
    onLighting: (node: CanvasNodeData) => void;
    onPanorama: (node: CanvasNodeData) => void;
    onViewImage: (node: CanvasNodeData) => void;
    onExtractVideoFrames: (node: CanvasNodeData) => void;
    onExtractAudioFromVideo: (node: CanvasNodeData) => void;
    onDepthCapture?: (node: CanvasNodeData) => void;
    onTrimVideoSegments: (node: CanvasNodeData) => void;
    onRemakeVideo?: (node: CanvasNodeData) => void;
    onSubtitles: (node: CanvasNodeData) => void;
    onTimeline: (node: CanvasNodeData) => void;
    extractingVideoFrames: boolean;
    extractingAudio: boolean;
    trimmingVideo: boolean;
    onReversePrompt: (node: CanvasNodeData) => void;
    onRetry: (node: CanvasNodeData) => void;
    onToggleFreeResize: (node: CanvasNodeData) => void;
    onToggleLocked: (node: CanvasNodeData) => void;
    onDelete: (node: CanvasNodeData) => void;
    workspaceMode?: CanvasWorkspaceMode;
};

type CanvasAssetCategory = NonNullable<NonNullable<CanvasNodeData["metadata"]>["assetCategory"]>;

const assetCategoryOptions: Array<{ value: CanvasAssetCategory; label: string }> = ASSET_CATEGORY_OPTIONS;

type ToolbarTool = {
    section?: string;
    description?: string;
    id: string;
    label: string;
    icon: ReactNode;
    onClick: () => void;
    group: NodeToolbarGroup;
    order: number;
    active?: boolean;
    danger?: boolean;
    disabled?: boolean;
};

export function CanvasNodeToolbar({
    onRemakeVideo,
    node,
    viewport,
    containerRef,
    onKeep,
    onLeave,
    onInfo,
    onEditText,
    onDecreaseFont,
    onIncreaseFont,
    onToggleDialog,
    onAnnotate,
    onGenerateImage,
    onUpload,
    onDownload,
    onSaveAsset,
    onMaskEdit,
    onEmotion,
    onPortraitTexture,
    onCrop,
    onSplit,
    onUpscale,
    onSuperResolve,
    onAngle,
    onLighting,
    onPanorama,
    onViewImage,
    onExtractVideoFrames,
    onExtractAudioFromVideo,
    onDepthCapture,
    onTrimVideoSegments,
    onSubtitles,
    onTimeline,
    extractingVideoFrames,
    extractingAudio,
    trimmingVideo,
    onReversePrompt,
    onRetry,
    onToggleFreeResize,
    onToggleLocked,
    onDelete,
    workspaceMode = "professional",
}: CanvasNodeToolbarProps) {
    const { t, number } = useI18n();
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [containerWidth, setContainerWidth] = useState(1000);
    const [anchor, setAnchor] = useState<{ left: number; top: number } | null>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);
    const { message } = App.useApp();
    const copyText = useCopyText();
    const themeName = useActiveTheme();
    const theme = canvasThemes[themeName];
    const simpleMode = workspaceMode === "simple";

    useEffect(() => {
        setOpenMenuId(null);
    }, [node?.id]);

    // 只随节点身份与几何变化重新挂载测量；输入文字等内容更新会换新的 node 对象，
    // 若依赖整个 node，每次按键都会强制同步布局并重建观察器。内容引起的尺寸变化由 ResizeObserver 覆盖。
    const anchorNodeId = node?.id;
    const anchorNodeX = node?.position.x;
    const anchorNodeY = node?.position.y;
    const anchorNodeWidth = node?.width;
    const anchorNodeHeight = node?.height;
    useLayoutEffect(() => {
        const container = containerRef.current;
        if (!anchorNodeId || !container) {
            setAnchor(null);
            return;
        }
        const element = container.querySelector<HTMLElement>(`[data-node-id="${CSS.escape(anchorNodeId)}"]`);
        if (!element) {
            setAnchor(null);
            return;
        }
        let disposed = false;
        let queued = false;
        let containerRect = container.getBoundingClientRect();
        let toolbarWidth = toolbarRef.current?.offsetWidth || 0;
        let toolbarHeight = toolbarRef.current?.offsetHeight || 44;
        const update = () => {
            const nodeRect = element.getBoundingClientRect();
            const preferredLeft = nodeRect.left - containerRect.left + nodeRect.width / 2;
            const halfToolbar = toolbarWidth / 2;
            const canClamp = toolbarWidth > 0 && toolbarWidth <= containerRect.width - 20;
            let left = canClamp ? Math.min(Math.max(preferredLeft, halfToolbar + 10), containerRect.width - halfToolbar - 10) : preferredLeft;
            const above = nodeRect.top - containerRect.top - 30;
            let top = Math.max(toolbarHeight + 8, Math.min(above, containerRect.height - 8));
            for (const panel of container.querySelectorAll<HTMLElement>("[data-canvas-node-panel]")) {
                const panelRect = panel.getBoundingClientRect();
                const panelLeft = panelRect.left - containerRect.left;
                const panelRight = panelRect.right - containerRect.left;
                const panelTop = panelRect.top - containerRect.top;
                const panelBottom = panelRect.bottom - containerRect.top;
                if (left + halfToolbar <= panelLeft || left - halfToolbar >= panelRight || top <= panelTop || top - toolbarHeight >= panelBottom) continue;
                if (panelLeft >= toolbarWidth + 18) left = panelLeft - halfToolbar - 8;
                else if (containerRect.width - panelRight >= toolbarWidth + 18) left = panelRight + halfToolbar + 8;
                else if (panelTop >= toolbarHeight + 16) top = panelTop - 8;
                else if (containerRect.height - panelBottom >= toolbarHeight + 16) top = panelBottom + toolbarHeight + 8;
            }
            if (toolbarRef.current) {
                toolbarRef.current.style.transform = `translate3d(${left}px, ${top}px, 0)`;
                return;
            }
            setAnchor((current) => (current?.left === left && current.top === top ? current : { left, top }));
        };
        const scheduleUpdate = () => {
            if (queued || disposed) return;
            queued = true;
            queueMicrotask(() => {
                queued = false;
                if (!disposed) update();
            });
        };
        const measure = () => {
            containerRect = container.getBoundingClientRect();
            toolbarWidth = toolbarRef.current?.offsetWidth || 0;
            toolbarHeight = toolbarRef.current?.offsetHeight || 44;
            setContainerWidth(containerRect.width);
            scheduleUpdate();
        };
        measure();
        const resizeObserver = new ResizeObserver(measure);
        resizeObserver.observe(element);
        resizeObserver.observe(container);
        if (toolbarRef.current) resizeObserver.observe(toolbarRef.current);
        const unsubscribeViewport = subscribeCanvasGraphicsViewportPreview(container, scheduleUpdate);
        window.addEventListener("resize", measure);
        return () => {
            disposed = true;
            resizeObserver.disconnect();
            unsubscribeViewport();
            window.removeEventListener("resize", measure);
        };
    }, [anchor === null, anchorNodeHeight, anchorNodeId, anchorNodeWidth, anchorNodeX, anchorNodeY, containerRef, viewport.k, viewport.x, viewport.y]);

    const delivery = useResourceDelivery(node?.metadata?.storageKey || "", Boolean(node && anchor));
    if (!node || !anchor) return null;

    const isImage = node.type === CanvasNodeType.Image;
    const isVideo = node.type === CanvasNodeType.Video;
    const isAudio = node.type === CanvasNodeType.Audio;
    const hasImage = isImage && Boolean(node.metadata?.content);
    const copyImagePrompt = (target: CanvasNodeData) => {
        const prompt = target.metadata?.prompt?.trim();
        if (!prompt) {
            message.warning(t("nodeToolbar.noPrompt"));
            return;
        }
        copyText(prompt, t("nodeToolbar.copied"));
    };
    const imageTools = buildImageToolbarTools(
        node,
        { onUpload, onToggleFreeResize, onAnnotate, onMaskEdit, onEmotion, onPortraitTexture, onCrop, onUpscale, onSuperResolve, onAngle, onLighting, onPanorama, onViewImage, onCopyPrompt: copyImagePrompt, onReversePrompt },
        t,
    );

    // 构建 ToolContext——供注册表解析工具
    const nodeHoverHandlers = {
        onNodeInfo: onInfo,
        onNodeDelete: onDelete,
        onNodeRetry: onRetry,
        onNodeEditText: onEditText,
        onNodeDecreaseFont: onDecreaseFont,
        onNodeIncreaseFont: onIncreaseFont,
        onNodeToggleDialog: onToggleDialog,
        onNodeAnnotate: onAnnotate,
        onNodeGenerateImage: onGenerateImage,
        onNodeUpload: onUpload,
        onNodeDownload: onDownload,
        onNodeSaveAsset: onSaveAsset,
        onNodeMaskEdit: onMaskEdit,
        onNodeEmotion: onEmotion,
        onNodePortraitTexture: onPortraitTexture,
        onNodeCrop: onCrop,
        onNodeSplit: (target) => onSplit(target, { rows: 2, columns: 2 }),
        onNodeUpscale: onUpscale,
        onNodeSuperResolve: onSuperResolve,
        onNodeAngle: onAngle,
        onNodeViewImage: onViewImage,
        onNodeExtractVideoFrames: onExtractVideoFrames,
        onNodeExtractAudioFromVideo: onExtractAudioFromVideo,
        onNodeDepthCapture: onDepthCapture,
        onNodeTrimVideoSegments: onTrimVideoSegments,
        onNodeReversePrompt: onReversePrompt,
        onNodeToggleFreeResize: onToggleFreeResize,
        onNodeSubtitles: onSubtitles,
        onNodeTimeline: onTimeline,
        onNodeToggleLocked: onToggleLocked,
        onNodeCopyPrompt: copyImagePrompt,
    } as Partial<ToolbarHandlers> as ToolbarHandlers;

    const nodeHoverCtx: ToolContext = {
        i18n: { t, number },
        selectedCount: 0,
        selectedNodeTypes: new Set(),
        selectedVideoCount: 0,
        canvasTool: "move",
        workspaceMode: workspaceMode || "professional",
        isProjectLinked: false,
        canUndo: false,
        canRedo: false,
        node,
        nodeMetadata: node.metadata,
        extractingVideoFrames,
        extractingAudio,
        trimmingVideo,
        mergingVideos: false,
        addPanelOpen: false,
        appearancePanelOpen: false,
        settingsPanelOpen: false,
        handlers: nodeHoverHandlers,
    };

    // 注册表统一提供动作合同、适用性和节点 Dock 层级。
    const registryTools = resolveToolbarTools("node-hover", nodeHoverCtx, null);
    const registryToolbarTools: ToolbarTool[] = registryTools.map((tool) => {
        const placement = resolveNodeToolbarPlacement(tool, nodeHoverCtx);
        return {
            id: tool.id,
            label: resolveToolbarDisplayLabel(tool, nodeHoverCtx),
            icon: typeof tool.icon === "function" ? tool.icon(nodeHoverCtx) : tool.icon,
            group: placement.group,
            order: placement.order,
            section: tool.nodeToolbar?.section ? t(tool.nodeToolbar.section as Parameters<typeof t>[0]) : undefined,
            description: tool.nodeToolbar?.description ? t(tool.nodeToolbar.description as Parameters<typeof t>[0]) : undefined,
            active: tool.active?.(nodeHoverCtx),
            danger: tool.danger,
            disabled: tool.disabled?.(nodeHoverCtx),
            onClick: () => tool.run(nodeHoverCtx),
        };
    });
    const allTools: ToolbarTool[] = hasImage && !simpleMode ? [...registryToolbarTools, ...imageTools] : registryToolbarTools;
    if (onRemakeVideo && canRemakeCanvasVideo(node)) {
        allTools.push({ id: "remake-video", label: t("canvasNov21.remake.name"), icon: <Camera className="size-3.5" />, group: "process", order: 5, onClick: () => onRemakeVideo(node) });
    }
    const compact = containerWidth < 640;
    const narrow = containerWidth < 420;
    const inGroup = (group: NodeToolbarGroup) => allTools.filter((tool) => tool.group === group).sort(compareToolbarTools);
    const primary = inGroup("primary");
    const primaryTools = narrow ? primary.slice(0, 1) : primary;
    const portraitTools = compact ? [] : inGroup("portrait");
    const viewpointLightingTools = compact ? [] : [...inGroup("viewpoint"), ...inGroup("lighting")];
    const panoramaTools = compact ? [] : inGroup("panorama");
    const processTools = compact ? [...inGroup("portrait"), ...inGroup("viewpoint"), ...inGroup("lighting"), ...inGroup("panorama"), ...inGroup("process")] : inGroup("process");
    const workspaceTools = narrow ? [] : inGroup("workspace");
    const utilityTools = inGroup("utility");
    const moreTools = [...(narrow ? [...primary.slice(1), ...inGroup("workspace")] : []), ...inGroup("more")];
    const processMenuLabel = compact ? t("nodeToolbar.tools") : isVideo ? t("nodeToolbar.extract") : isImage ? t("nodeToolbar.imageTools") : isAudio ? t("nodeToolbar.audioTools") : t("nodeToolbar.textTools");
    const handleMenuOpenChange = (menuId: string, open: boolean) => {
        setOpenMenuId((current) => (open ? menuId : current === menuId ? null : current));
        if (open) onKeep(node.id);
        else if (!toolbarRef.current?.contains(document.activeElement)) onLeave();
    };
    const dockStyle = canvasDockStyle(theme, theme.node.text);

    return (
        <div
            ref={toolbarRef}
            className="canvas-node-toolbar absolute z-[var(--z-node-toolbar)] -translate-x-1/2 -translate-y-full"
            style={{ left: 0, top: 0, transform: `translate3d(${anchor.left}px, ${anchor.top}px, 0)`, width: "max-content", maxWidth: "calc(100% - 20px)", color: theme.node.text }}
            onMouseEnter={() => onKeep(node.id)}
            onMouseLeave={() => {
                if (!openMenuId) onLeave();
            }}
            onMouseDown={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            data-canvas-no-zoom
            onKeyDown={(event) => event.stopPropagation()}
            onFocus={() => onKeep(node.id)}
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget) && !openMenuId) onLeave();
            }}
        >
            <WatermarkNotice resource={delivery.resource} className="absolute bottom-full left-0 mb-2 max-w-full" />
            <div role="toolbar" aria-label={t("nodeToolbar.aria")} className="flex h-11 max-w-full items-center gap-0.5 overflow-visible rounded-[var(--dock-radius-tight)] px-2 backdrop-blur-2xl" style={{ ...dockStyle, border: 0 }}>
                {primaryTools.map((tool) => (
                    <NodeDockToolButton key={tool.id} tool={tool} />
                ))}
                {panoramaTools.map((tool) => (
                    <NodeDockToolButton key={tool.id} tool={tool} />
                ))}
                {portraitTools.length ? <NodeDockMenuButton menuId="portrait" label={t("nodeToolbar.portrait")} icon={<UserRound className="size-3.5" />} tools={portraitTools} openMenuId={openMenuId} onOpenChange={handleMenuOpenChange} /> : null}
                {viewpointLightingTools.length ? (
                    <NodeDockMenuButton menuId="viewpoint-lighting" label={t("nodeToolbar.viewpoint")} icon={<Camera className="size-3.5" />} tools={viewpointLightingTools} openMenuId={openMenuId} onOpenChange={handleMenuOpenChange} />
                ) : null}
                {processTools.length ? (
                    <NodeDockMenuButton
                        menuId="process"
                        label={processMenuLabel}
                        icon={isVideo ? <Images className="size-3.5" /> : <SlidersHorizontal className="size-3.5" />}
                        tools={processTools}
                        openMenuId={openMenuId}
                        onOpenChange={handleMenuOpenChange}
                        split={hasImage && !simpleMode ? { node, onSplit } : undefined}
                    />
                ) : null}
                {workspaceTools.length ? <span aria-hidden className="aceternity-dock-separator mx-1 h-5 w-px shrink-0" /> : null}
                {workspaceTools.map((tool) => (
                    <NodeDockToolButton key={tool.id} tool={tool} />
                ))}
                {utilityTools.length || moreTools.length ? <span aria-hidden className="aceternity-dock-separator mx-1 h-5 w-px shrink-0" /> : null}
                {utilityTools.map((tool) => (
                    <NodeDockToolButton key={tool.id} tool={tool} iconOnly />
                ))}
                {moreTools.length ? (
                    <NodeDockMenuButton menuId="more" label={t("nodeToolbar.more")} icon={<Ellipsis className="size-3.5" />} tools={moreTools} openMenuId={openMenuId} onOpenChange={handleMenuOpenChange} placement="topRight" iconOnly />
                ) : null}
            </div>
        </div>
    );
}

function NodeDockToolButton({ tool, iconOnly = false }: { tool: ToolbarTool; iconOnly?: boolean }) {
    const { t } = useI18n();
    return (
        <Tooltip title={tool.description ? t("nodeToolbar.description", { label: tool.label, description: tool.description }) : tool.label}>
            <button
                type="button"
                className={`aceternity-dock-command is-labeled pointer-events-auto inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-[var(--dock-item-radius)] px-2.5 outline-none ${tool.active ? "is-active" : ""} ${tool.danger ? "is-danger" : ""}`}
                aria-label={tool.label}
                aria-pressed={tool.active}
                disabled={tool.disabled}
                onClick={tool.onClick}
            >
                <span className="grid size-3.5 shrink-0 place-items-center">{tool.icon}</span>
                {!iconOnly ? <span className="inline-flex h-4 items-center whitespace-nowrap text-[var(--fs-label)] font-medium leading-none">{tool.label}</span> : null}
            </button>
        </Tooltip>
    );
}

function compareToolbarTools(left: ToolbarTool, right: ToolbarTool) {
    if (left.danger !== right.danger) return left.danger ? 1 : -1;
    return left.order - right.order;
}

function NodeDockMenuButton({
    menuId,
    label,
    icon,
    tools,
    openMenuId,
    onOpenChange,
    placement = "top",
    iconOnly = false,
    split,
}: {
    menuId: string;
    label: string;
    icon: ReactNode;
    tools: ToolbarTool[];
    openMenuId: string | null;
    onOpenChange: (menuId: string, open: boolean) => void;
    placement?: "top" | "topRight";
    iconOnly?: boolean;
    split?: { node: CanvasNodeData; onSplit: (node: CanvasNodeData, params: ImageSplitParams) => void };
}) {
    const { t } = useI18n();
    const open = openMenuId === menuId;
    const triggerRef = useRef<HTMLButtonElement>(null);
    const [splitPanelOpen, setSplitPanelOpen] = useState(false);
    useEffect(() => {
        if (!open) {
            setSplitPanelOpen(false);
            return;
        }
        const frame = requestAnimationFrame(() => triggerRef.current?.focus());
        return () => cancelAnimationFrame(frame);
    }, [open]);
    const keepSplitMenuOpenRef = useRef(false);
    const splitEntry = split ? tools.find((tool) => tool.id === "split") : undefined;
    const sections = new Map<string, ToolbarTool[]>();
    for (const tool of tools) {
        const section = tool.danger ? t("nodeToolbar.danger") : tool.section || t("nodeToolbar.common");
        sections.set(section, [...(sections.get(section) || []), tool]);
    }
    const items: MenuProps["items"] = [...sections]
        .sort(([left], [right]) => Number(left === t("nodeToolbar.danger")) - Number(right === t("nodeToolbar.danger")))
        .map(([section, entries]) => ({
            type: "group",
            key: section,
            label: section,
            children: entries.map((tool) => {
                const isSplit = Boolean(splitEntry && split && tool.id === "split");
                return {
                    key: tool.id,
                    icon: tool.icon,
                    className: isSplit ? `canvas-grid-split-menu-item${splitPanelOpen ? " is-open" : ""}` : undefined,
                    label: (
                        <div
                            className={isSplit ? "canvas-grid-split-menu-label" : undefined}
                            onMouseDown={
                                isSplit
                                    ? () => {
                                          keepSplitMenuOpenRef.current = true;
                                      }
                                    : undefined
                            }
                        >
                            <div>
                                <span className="inline-flex items-center gap-2">
                                    {tool.label}
                                    {tool.active ? <Check className="size-3.5" /> : null}
                                </span>
                                {tool.description ? <div className="text-[var(--fs-tiny)] opacity-60">{tool.description}</div> : null}
                            </div>
                            {isSplit ? <ChevronRight className="canvas-grid-split-chevron" strokeWidth={2} /> : null}
                        </div>
                    ),
                    disabled: tool.disabled,
                    danger: tool.danger,
                    onClick: (info) => {
                        if (isSplit) {
                            info.domEvent.preventDefault();
                            info.domEvent.stopPropagation();
                            keepSplitMenuOpenRef.current = true;
                            setSplitPanelOpen((current) => !current);
                            return;
                        }
                        onOpenChange(menuId, false);
                        tool.onClick();
                    },
                };
            }),
        }));
    return (
        <Dropdown
            open={open}
            trigger={["click"]}
            placement={placement}
            onOpenChange={(nextOpen) => {
                if (!nextOpen && (keepSplitMenuOpenRef.current || document.querySelector(".canvas-node-toolbar-menu-split:hover, .canvas-grid-split-picker:hover"))) {
                    keepSplitMenuOpenRef.current = false;
                    return;
                }
                onOpenChange(menuId, nextOpen);
                if (!nextOpen) setSplitPanelOpen(false);
            }}
            menu={{ items }}
            autoFocus
            popupRender={(menu) => (
                <div
                    className={`canvas-node-toolbar-menu${splitEntry && split ? " canvas-node-toolbar-menu-split" : ""}`}
                    data-canvas-no-zoom
                    data-canvas-wheel-scroll
                    onPointerDown={(event) => event.stopPropagation()}
                    onMouseDown={(event) => event.stopPropagation()}
                    onWheel={(event) => event.stopPropagation()}
                    onKeyDownCapture={(event) => {
                        if (event.key === "Escape") {
                            event.preventDefault();
                            event.stopPropagation();
                            triggerRef.current?.focus();
                            onOpenChange(menuId, false);
                        }
                    }}
                    onKeyDown={(event) => event.stopPropagation()}
                >
                    <div className="canvas-node-toolbar-menu-stack">{menu}</div>
                    {splitPanelOpen && split ? (
                        <CanvasGridSplitPicker
                            onPick={(params) => {
                                setSplitPanelOpen(false);
                                onOpenChange(menuId, false);
                                split.onSplit(split.node, params);
                            }}
                        />
                    ) : null}
                </div>
            )}
        >
            <button
                ref={triggerRef}
                type="button"
                className={`aceternity-dock-command is-labeled pointer-events-auto inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-[var(--dock-item-radius)] px-2.5 outline-none ${open ? "is-active" : ""}`}
                aria-label={label}
                aria-expanded={open}
                aria-haspopup="menu"
                title={label}
                onKeyDown={(event) => {
                    if (event.key === "ArrowDown" && open) {
                        event.preventDefault();
                        document.querySelector<HTMLElement>(".ant-dropdown:not(.ant-dropdown-hidden) .canvas-node-toolbar-menu [role='menuitem']:not([aria-disabled='true'])")?.focus();
                    }
                    if (event.key === "Escape" && open) {
                        event.preventDefault();
                        event.stopPropagation();
                        onOpenChange(menuId, false);
                    }
                }}
            >
                <span className="grid size-3.5 shrink-0 place-items-center">{icon}</span>
                {!iconOnly ? (
                    <>
                        <span className="inline-flex h-4 items-center whitespace-nowrap text-[var(--fs-label)] font-medium leading-none">{label}</span>
                        <ChevronDown className="size-3 shrink-0 opacity-55" />
                    </>
                ) : null}
            </button>
        </Dropdown>
    );
}

export function CanvasNodeInfoModal({
    node,
    open,
    onClose,
    onMetadataChange,
    readOnly = false,
    onUnauthorized,
    onRetry,
    editGeneration,
}: {
    node: CanvasNodeData | null;
    open: boolean;
    onClose: () => void;
    onMetadataChange?: (nodeId: string, metadata: Partial<CanvasNodeMetadata>) => void;
    readOnly?: boolean;
    onUnauthorized?: () => void;
    onRetry?: (node: CanvasNodeData) => void;
    editGeneration?: (node: CanvasNodeData, field: "prompt" | "reference" | "model" | "parameters") => void;
}) {
    const i18n = useI18n();
    const { t, number } = i18n;
    const statusLabels: Record<string, string> = { idle: t("nodeInfo.idle"), success: t("workflowStatus.ready"), loading: t("workflowStatus.running"), error: t("workflowStatus.failed") };
    const theme = canvasThemes[useActiveTheme()];
    const [assetTags, setAssetTags] = useState<string[]>([]);
    const [assetTagInput, setAssetTagInput] = useState("");
    const [assetCategory, setAssetCategory] = useState<CanvasAssetCategory>("other");
    const imageBytes = node?.type === CanvasNodeType.Image && node.metadata?.content ? getDataUrlByteSize(node.metadata.content) : 0;
    const batchCount = node?.type === CanvasNodeType.Image ? node.metadata?.batchChildIds?.length || 0 : 0;
    const nodeTypeLabel = node ? localizedNodeLabel(node.type, t) : t("nodeToolbar.config");
    useEffect(() => {
        setAssetTags(node?.metadata?.assetTags || []);
        setAssetTagInput("");
        setAssetCategory(node ? canvasNodeAssetCategory(node) : "other");
    }, [node?.id, node?.metadata?.assetCategory, node?.metadata?.assetTags]);

    const saveAssetCategory = (category: CanvasAssetCategory) => {
        if (!node || node.type !== CanvasNodeType.Image) return;
        setAssetCategory(category);
        onMetadataChange?.(node.id, { assetCategory: category });
    };

    const saveAssetTags = (nextTags: string[]) => {
        if (!node || node.type !== CanvasNodeType.Image) return;
        const tags = Array.from(new Set(nextTags.map((item) => item.trim()).filter(Boolean)));
        setAssetTags(tags);
        onMetadataChange?.(node.id, { assetTags: tags });
    };

    const addAssetTag = () => {
        const tags = assetTagInput
            .split(/\n|,|，/)
            .map((item) => item.trim())
            .filter(Boolean);
        if (!tags.length) return;
        saveAssetTags([...assetTags, ...tags]);
        setAssetTagInput("");
    };

    const removeAssetTag = (tag: string) => {
        saveAssetTags(assetTags.filter((item) => item !== tag));
    };

    const title = (
        <div className="canvas-node-inspector-title">
            <div className="min-w-0">
                <div className="text-[var(--fs-heading-lg)] font-semibold">{t("nodeToolbar.info")}</div>
                {node ? <div className="canvas-node-inspector-id">{node.id}</div> : null}
            </div>
        </div>
    );

    return (
        <Modal className="workspace-modal canvas-node-info-modal" title={title} open={open && Boolean(node)} centered footer={null} onCancel={onClose} width="min(920px, calc(100vw - 32px))" styles={{ body: { paddingTop: 4 } }}>
            {node ? (
                <div className="canvas-node-inspector" style={{ color: theme.node.text }}>
                    <div className="thin-scrollbar canvas-node-inspector-scroll">
                        <section className="canvas-node-inspector-section">
                            <div className="canvas-node-inspector-section-heading">
                                <span>{t("nodeInfo.basic")}</span>
                                <em>{Object.hasOwn(statusLabels, node.metadata?.status || "idle") ? statusLabels[node.metadata?.status || "idle"] : node.metadata?.status || "idle"}</em>
                            </div>
                            <div className="canvas-node-inspector-facts">
                                <InfoRow label={t("nodeInfo.type")} value={nodeTypeLabel} />
                                <InfoRow label={t("versionCompare.size")} value={`${number(Math.round(node.width))} x ${number(Math.round(node.height))}`} />
                                <InfoRow label={t("nodeInfo.position")} value={`${number(Math.round(node.position.x))}, ${number(Math.round(node.position.y))}`} />
                                {batchCount > 1 ? <InfoRow label={t("nodeInfo.imageGroup")} value={t("nodeInfo.images", { count: number(batchCount) })} /> : null}
                                {imageBytes ? <InfoRow label={t("nodeInfo.imageSize")} value={formatBytes(imageBytes, number)} /> : null}
                            </div>
                        </section>

                        {node.type === CanvasNodeType.Image ? (
                            <section className="canvas-node-inspector-section">
                                <div className="canvas-node-inspector-section-heading">
                                    <span>{t("nodeInfo.category")}</span>
                                </div>
                                <div className="canvas-node-inspector-options">
                                    {assetCategoryOptions.map((option) => {
                                        const active = assetCategory === option.value;
                                        return (
                                            <button key={option.value} type="button" disabled={readOnly} aria-pressed={active} onClick={() => saveAssetCategory(option.value)} className={active ? "is-active" : ""}>
                                                {option.label}
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="canvas-node-inspector-help">{t("nodeInfo.categoryHelp")}</p>
                            </section>
                        ) : null}

                        {node.metadata?.prompt ? (
                            <section className="canvas-node-inspector-section">
                                <div className="canvas-node-inspector-section-heading">
                                    <span>{t("versionCompare.prompt")}</span>
                                </div>
                                <div className="canvas-node-inspector-copy canvas-node-inspector-prompt">{localizedCanvasMentionText(node.metadata.prompt, t)}</div>
                            </section>
                        ) : null}

                        {nodeGenerationRows(node, i18n).length ? (
                            <section className="canvas-node-inspector-section">
                                <div className="canvas-node-inspector-section-heading">
                                    <span>{t("nodeToolbar.generationInfo")}</span>
                                </div>
                                <div className="canvas-node-inspector-facts">
                                    {nodeGenerationRows(node, i18n).map((item) => (
                                        <InfoRow key={item.label} label={item.label} value={item.value} />
                                    ))}
                                </div>
                            </section>
                        ) : null}

                        {node.type === CanvasNodeType.Skill && node.metadata?.skillSnapshot ? (
                            <section className="canvas-node-inspector-section">
                                <div className="canvas-node-inspector-section-heading">
                                    <span>{t("nodeInfo.skillTemplate")}</span>
                                </div>
                                <div className="canvas-node-inspector-copy">{node.metadata.skillSnapshot.template}</div>
                                {node.metadata.skillSnapshot.outputContract ? (
                                    <>
                                        <div className="canvas-node-inspector-subheading">{t("nodeInfo.output")}</div>
                                        <div className="canvas-node-inspector-copy">{node.metadata.skillSnapshot.outputContract}</div>
                                    </>
                                ) : null}
                            </section>
                        ) : null}

                        {node.type === CanvasNodeType.Image ? (
                            <section className="canvas-node-inspector-section">
                                <div className="canvas-node-inspector-section-heading">
                                    <div>
                                        <span>{t("nodeInfo.tags")}</span>
                                        <p>{t("nodeInfo.tagsHelp")}</p>
                                    </div>
                                    <em>{t("nodeInfo.tagCount", { count: number(assetTags.length) })}</em>
                                </div>
                                {readOnly ? (
                                    <div className="canvas-node-inspector-notice">{t("nodeInfo.readOnly")}</div>
                                ) : (
                                    <div className="canvas-node-inspector-tag-editor">
                                        <Input value={assetTagInput} placeholder={t("nodeInfo.tagExample")} onChange={(event) => setAssetTagInput(event.target.value)} onPressEnter={addAssetTag} />
                                        <Button type="primary" icon={<Plus className="size-4" />} disabled={!assetTagInput.trim()} onClick={addAssetTag}>
                                            {t("nodeInfo.add")}
                                        </Button>
                                    </div>
                                )}
                                <div className="canvas-node-inspector-tags">
                                    {assetTags.length ? (
                                        assetTags.map((tag) => (
                                            <Tag key={tag} closable={!readOnly} onClose={() => (readOnly ? onUnauthorized?.() : removeAssetTag(tag))} className="!m-0 !rounded-lg !px-2 !py-1 !text-sm">
                                                {tag}
                                            </Tag>
                                        ))
                                    ) : (
                                        <span className="canvas-node-inspector-empty-label">{readOnly ? t("nodeInfo.noTags") : t("nodeInfo.emptyTags")}</span>
                                    )}
                                </div>
                            </section>
                        ) : null}

                        {node.metadata?.errorDetails ? (
                            <section className="canvas-node-inspector-error">
                                <GenerationErrorCard
                                    error={{ ...node.metadata, taskId: node.metadata.taskId, code: node.metadata.taskErrorCode || node.metadata.generationErrorCode, billing: node.metadata.taskBilling }}
                                    onRetry={onRetry ? () => onRetry(node) : undefined}
                                    actions={{ prompt: () => editGeneration?.(node, "prompt"), reference: () => editGeneration?.(node, "reference"), model: () => editGeneration?.(node, "model"), parameters: () => editGeneration?.(node, "parameters") }}
                                />
                            </section>
                        ) : null}
                    </div>
                </div>
            ) : null}
        </Modal>
    );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className="canvas-node-inspector-fact">
            <div>{label}</div>
            <strong>{value}</strong>
        </div>
    );
}

export function nodeGenerationRows(node: CanvasNodeData, { t, number, date }: Pick<ReturnType<typeof useI18n>, "t" | "number" | "date">) {
    const metadata = node.metadata;
    if (!metadata) return [] as Array<{ label: string; value: string }>;
    const rows: Array<{ label: string; value: string }> = [];
    const add = (label: string, value: unknown) => {
        if (value === undefined || value === null || value === "") return;
        rows.push({ label, value: String(value) });
    };
    const addTime = (label: string, value?: string) => {
        if (!value) return;
        const timestamp = Date.parse(value);
        add(label, Number.isFinite(timestamp) ? date(value, DATE_TIME_FORMAT) : value);
    };
    const addDuration = (value?: number) => {
        if (typeof value !== "number" || !Number.isFinite(value)) return;
        const totalSeconds = Math.max(0, Math.round(value / 1000));
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        add(t("nodeInfo.duration"), minutes ? t("nodeInfo.minutesSeconds", { minutes: number(minutes), seconds: number(seconds) }) : t("nodeInfo.secondsValue", { seconds: number(seconds) }));
    };

    add(t("versionCompare.model"), metadata.model);
    add(t("nodeInfo.generationSize"), metadata.size);
    add(t("nodeInfo.resolution"), metadata.vquality || metadata.quality);
    add(t("nodeInfo.seconds"), metadata.seconds ? t("nodeInfo.secondsSpaced", { seconds: metadata.seconds }) : undefined);
    add(t("nodeInfo.audio"), metadata.generateAudio === undefined ? undefined : metadata.generateAudio === "true" ? t("nodeInfo.on") : t("nodeInfo.off"));
    add(t("nodeInfo.watermark"), metadata.watermark === undefined ? undefined : metadata.watermark === "true" ? t("nodeInfo.on") : t("nodeInfo.off"));
    if (metadata.references?.length) {
        const referenceNames = metadata.references
            .slice(0, 3)
            .map((reference) => reference.split("/").pop() || reference)
            .join(t("nodeInfo.separator"));
        add(
            t("nodeInfo.references"),
            referenceNames ? t("nodeInfo.referenceNames", { count: number(metadata.references.length), names: `${referenceNames}${metadata.references.length > 3 ? "…" : ""}` }) : t("nodeInfo.referenceCount", { count: number(metadata.references.length) }),
        );
    }
    addTime(t("nodeInfo.created"), metadata.taskCreatedAt);
    addTime(t("nodeInfo.started"), metadata.taskStartedAt);
    addTime(t("nodeInfo.completed"), metadata.taskCompletedAt);
    addDuration(metadata.taskDurationMs);
    return rows;
}
