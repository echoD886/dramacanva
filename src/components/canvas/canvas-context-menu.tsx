import { currentLocaleText as upstreamText } from "@/i18n/current-locale-text";
import { useI18n as upstreamUseI18n } from "@/i18n/use-i18n";
import { AnimatePresence } from "motion/react";
import { toolCatalogText } from "@/lib/canvas/agent-tool-presentation";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useCanvasFeatureMessages } from "@/i18n/canvas-feature-messages";
import {
    ArrowLeft,
    AtSign,
    Check,
    ChevronRight,
    Clipboard,
    CloudUpload,
    Copy,
    Download,
    FolderOpen,
    FolderPlus,
    Image as ImageIcon,
    Layers3,
    LayoutTemplate,
    Link2,
    Maximize2,
    PanelTop,
    Pencil,
    Plus,
    Redo2,
    Tags,
    Trash2,
    Undo2,
    Upload,
    UserRound,
} from "lucide-react";

import { CanvasCreateMenu, type CanvasCreateCommand } from "@/components/canvas/canvas-create-menu";
import { ASSET_CATEGORY_OPTIONS } from "@/lib/asset-category";
import { aceternityMotion } from "@/lib/aceternity-motion";
import { SpotlightSurface } from "@/components/ui/aceternity/spotlight-surface";
import { canvasThemes } from "@/lib/canvas-theme";
import { useI18n } from "@/i18n/use-i18n";
import { canvasNodeAssetCategory } from "@/lib/canvas/canvas-node-asset";
import { positionCanvasSubmenu } from "@/lib/canvas/canvas-context-menu-position";
import { isCanvasFolderNode } from "@/lib/canvas/canvas-frame";
import { resolveAddNodeMenuCommands, type AddNodeMenuContext } from "@/lib/canvas/tool-registry";
import { useActiveTheme } from "@/stores/canvas/use-canvas-theme-store";
import { usePluginStore } from "@/stores/use-plugin-store";
import { CanvasNodeType, type CanvasNodeData, type CanvasNodeTypeId, type CanvasWorkspaceMode, type ContextMenuState, type Position } from "@/types/canvas";

import { clamp } from "@/lib/utils";
type CanvasAssetCategory = NonNullable<NonNullable<CanvasNodeData["metadata"]>["assetCategory"]>;

const assetCategoryOptions: Array<{ value: CanvasAssetCategory; label: string }> = ASSET_CATEGORY_OPTIONS;

type CanvasNodeContextMenuProps = {
    menu: ContextMenuState;
    node?: CanvasNodeData | null;
    workspaceMode?: CanvasWorkspaceMode;
    isProjectLinked?: boolean;
    canUndo: boolean;
    canRedo: boolean;
    canPaste: boolean;
    selectedCount?: number;
    onClose: () => void;
    onAddNode: (type: CanvasNodeTypeId) => void;
    onAddFolder: () => void;
    onChooseStyle: () => void;
    onOpenDirector: (position: Position) => void;
    onLayerSplit?: () => void;
    onImageToDirector?: () => void;
    onUpload: () => void;
    onOpenAssets: () => void;
    onOpenProjectCharacters: () => void;
    onUndo: () => void;
    onRedo: () => void;
    onPaste: () => void;
    onCopyNode: () => void;
    onCreateGenerationCopy: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
    onSaveAsset: () => void;
    onViewMedia: () => void;
    onEditText: () => void;
    onOpenDrawing: () => void;
    onGenerateImage: () => void;
    onCopyContent: () => void;
    onCopyMediaUrl: () => void;
    onUploadToArkPrivateAsset: () => void;
    onSetAssetCategory: (category: CanvasAssetCategory) => void;
    onToggleFrame: () => void;
    onSpreadSelection?: () => void;
    onCopySelection?: () => void;
    onDownloadSelection?: () => void;
    onDeleteSelection?: () => void;
    onSendToAgent?: () => void;
};

export function CanvasNodeContextMenu({
    menu,
    node,
    workspaceMode = "professional",
    isProjectLinked = false,
    canUndo,
    canRedo,
    canPaste,
    selectedCount = 0,
    onClose,
    onAddNode,
    onAddFolder,
    onChooseStyle,
    onOpenDirector,
    onLayerSplit,
    onImageToDirector,
    onUpload,
    onOpenAssets,
    onOpenProjectCharacters,
    onUndo,
    onRedo,
    onPaste,
    onCopyNode,
    onCreateGenerationCopy,
    onDuplicate,
    onDelete,
    onSaveAsset,
    onViewMedia,
    onEditText,
    onOpenDrawing,
    onGenerateImage,
    onCopyContent,
    onCopyMediaUrl,
    onUploadToArkPrivateAsset,
    onSetAssetCategory,
    onToggleFrame,
    onSpreadSelection,
    onCopySelection,
    onDownloadSelection,
    onDeleteSelection,
    onSendToAgent,
}: CanvasNodeContextMenuProps) {
    upstreamUseI18n();
    const { t } = useI18n();
    const featureMessagesReady = useCanvasFeatureMessages();
    const theme = canvasThemes[useActiveTheme()];
    const [addOpen, setAddOpen] = useState(false);
    const [categoryOpen, setCategoryOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const [measuredPosition, setMeasuredPosition] = useState(() => getContextMenuPosition(menu, selectedCount >= 2));

    useLayoutEffect(() => {
        const element = menuRef.current;
        if (!element) return;
        const height = element.offsetHeight;
        const estimated = getContextMenuPosition(menu, selectedCount >= 2);
        const top = clamp(menu.y, 12, Math.max(12, window.innerHeight - height - 12));
        setMeasuredPosition((current) => (current.left === estimated.left && current.top === top ? current : { left: estimated.left, top }));
    });

    useEffect(() => {
        const close = (event: PointerEvent) => {
            const target = event.target;
            if (target instanceof Element && target.closest(".ant-popover")) return;
            onClose();
        };
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            if (categoryOpen) setCategoryOpen(false);
            else onClose();
        };
        window.addEventListener("pointerdown", close);
        window.addEventListener("keydown", closeOnEscape);
        return () => {
            window.removeEventListener("pointerdown", close);
            window.removeEventListener("keydown", closeOnEscape);
        };
    }, [categoryOpen, onClose]);

    useEffect(() => {
        setAddOpen(menu.type === "canvas" && Boolean(menu.createOpen));
        setCategoryOpen(false);
    }, [menu]);

    const runAction = (action: () => void) => {
        action();
        onClose();
    };
    const nodeContent = typeof node?.metadata?.content === "string" ? node.metadata.content : "";
    const isImage = node?.type === CanvasNodeType.Image;
    const isText = node?.type === CanvasNodeType.Text;
    const isCharacterReference = Boolean(isText && node?.metadata?.workflowKind === "character" && node.metadata.characterAssetId);
    const isDrawing = node?.type === CanvasNodeType.Drawing;
    const isVideo = node?.type === CanvasNodeType.Video;
    const isMedia = isImage || isVideo;
    const isAudio = node?.type === CanvasNodeType.Audio;
    const isFrame = node?.type === CanvasNodeType.Frame;
    const isFolder = isCanvasFolderNode(node);
    const hasNodeContent = isText ? Boolean(nodeContent.trim()) : Boolean(nodeContent);
    const canSaveAsset = Boolean(node && !isCharacterReference && (isText ? hasNodeContent : hasNodeContent && (isImage || isVideo || isAudio)));
    const canOpenPreview = Boolean(isMedia && hasNodeContent);
    const canGenerateFromText = Boolean(isText && !isCharacterReference && hasNodeContent);
    const canCopyMediaUrl = Boolean(isMedia && hasNodeContent);
    const assetCategory = node ? canvasNodeAssetCategory(node) : "other";
    const hasMultiSelection = selectedCount >= 2;
    const position = measuredPosition;

    return (
        <>
            <SpotlightSurface
                ref={menuRef}
                spotlightColor={theme.toolbar.itemHover}
                data-canvas-no-zoom
                data-canvas-context-menu
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: aceternityMotion.duration.instant, ease: aceternityMotion.easing.enter }}
                className="aceternity-floating-panel fixed z-[var(--z-popover)] flex w-[min(224px,calc(100vw-24px))] max-h-[calc(100dvh-24px)] origin-top-left flex-col overflow-hidden rounded-xl border p-1.5 backdrop-blur-2xl"
                style={{ left: position.left, top: position.top, background: theme.spatial.elevated, borderColor: theme.toolbar.border, color: theme.node.text }}
                onContextMenu={(event) => event.preventDefault()}
                onPointerDown={(event) => event.stopPropagation()}
            >
                <div className="absolute inset-x-8 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${theme.toolbar.border}, transparent)` }} />
                <div className="thin-scrollbar min-h-0 overflow-y-auto">
                    {menu.type === "node" && isMedia && categoryOpen ? (
                        <>
                            <MenuHeader title={t("canvasContextMenu.setAssetCategory")} description={node?.title || nodeTypeLabel(t, node)} onBack={() => setCategoryOpen(false)} />
                            <MenuSection label={t("canvasContextMenu.projectUsage")} />
                            {assetCategoryOptions.map((option) => (
                                <MenuButton key={option.value} icon={assetCategory === option.value ? <Check /> : <Tags />} label={option.label} active={assetCategory === option.value} onClick={() => runAction(() => onSetAssetCategory(option.value))} />
                            ))}
                        </>
                    ) : menu.type === "canvas" ? (
                        <>
                            <MenuHeader title={t("canvasContextMenu.canvasCommands")} />
                            {hasMultiSelection ? (
                                <>
                                    <MenuButton
                                        icon={<LayoutTemplate className="size-4" />}
                                        label={t("canvasContextMenu.spreadSelection")}
                                        detail={t("canvasContextMenu.spreadSelectionDetail2")}
                                        disabled={!onSpreadSelection}
                                        onClick={() => onSpreadSelection && runAction(onSpreadSelection)}
                                    />
                                    <MenuDivider />
                                </>
                            ) : null}
                            <MenuButton icon={<Plus className="size-4" />} label={t("canvasContextMenu.addNode")} chevron active={addOpen} onClick={() => setAddOpen((value) => !value)} />
                            <MenuButton icon={<Upload className="size-4" />} label={t("canvasContextMenu.uploadHere")} onClick={() => runAction(onUpload)} />
                            {!isProjectLinked ? <MenuButton icon={<FolderOpen className="size-4" />} label={t("canvasContextMenu.insertFromAssets")} onClick={() => runAction(onOpenAssets)} /> : null}
                            <MenuDivider />
                            <MenuSection label={t("canvasContextMenu.historyClipboard")} />
                            <MenuButton icon={<Undo2 className="size-4" />} label={t("canvasContextMenu.undo")} shortcut="⌘Z" disabled={!canUndo} onClick={() => runAction(onUndo)} />
                            <MenuButton icon={<Redo2 className="size-4" />} label={t("canvasContextMenu.redo")} shortcut="⇧⌘Z" disabled={!canRedo} onClick={() => runAction(onRedo)} />
                            <MenuButton icon={<Clipboard className="size-4" />} label={t("canvasContextMenu.paste")} shortcut="⌘V" disabled={!canPaste} onClick={() => runAction(onPaste)} />
                        </>
                    ) : menu.type === "node" && hasMultiSelection ? (
                        <>
                            <MenuHeader title={t("canvasContextMenu.selectedNodesHeader", { count: selectedCount })} />
                            <MenuSection label={t("canvasContextMenu.selectionSection")} />
                            <MenuButton
                                icon={<LayoutTemplate />}
                                label={t("canvasContextMenu.spreadSelection")}
                                detail={t("canvasContextMenu.spreadSelectionDetail2")}
                                disabled={!onSpreadSelection}
                                onClick={() => onSpreadSelection && runAction(onSpreadSelection)}
                            />
                            <MenuDivider />
                            <MenuButton icon={<Copy />} label={t("canvasContextMenu.copyCount", { count: selectedCount })} shortcut="⌘C" disabled={!onCopySelection} onClick={() => onCopySelection && runAction(onCopySelection)} />
                            {featureMessagesReady && <MenuButton icon={<Download />} label={t("upstreamSix.downloadSelection")} disabled={!onDownloadSelection} onClick={() => onDownloadSelection && runAction(onDownloadSelection)} />}
                            <MenuButton icon={<AtSign />} label={t("canvasContextMenu.sendToAgent")} disabled={!onSendToAgent} onClick={() => onSendToAgent && runAction(onSendToAgent)} />
                            <MenuButton icon={<Trash2 />} label={t("canvasContextMenu.deleteCount", { count: selectedCount })} danger disabled={!onDeleteSelection} onClick={() => onDeleteSelection && runAction(onDeleteSelection)} />
                        </>
                    ) : menu.type === "node" ? (
                        <>
                            {isCharacterReference ? (
                                <>
                                    <MenuHeader title={t("canvasContextMenu.characterCard")} description={node?.metadata?.characterName || node?.title} />
                                    <MenuSection label={t("canvasContextMenu.characterReference")} />
                                    <MenuButton icon={<UserRound />} label={t("canvasContextMenu.viewCharacterDetail")} onClick={() => runAction(onEditText)} />
                                    <MenuDivider />
                                    <MenuSection label={t("canvasContextMenu.nodes")} />
                                    <MenuButton icon={<AtSign />} label={t("canvasContextMenu.sendToAgent")} disabled={!onSendToAgent} onClick={() => onSendToAgent && runAction(onSendToAgent)} />
                                    <MenuButton icon={<Copy />} label={t("canvasContextMenu.copyCharacterReference")} shortcut="⌘C" onClick={() => runAction(onCopyNode)} />
                                    <MenuButton icon={<Layers3 />} label={t("canvasContextMenu.createReferenceCopy")} shortcut="⌘D" onClick={() => runAction(onDuplicate)} />
                                    <MenuButton icon={<Trash2 />} label={t("canvasContextMenu.deleteNode")} danger onClick={() => runAction(onDelete)} />
                                </>
                            ) : isMedia ? (
                                <>
                                    <MenuHeader title={isImage ? t("canvasContextMenu.image") : t("canvasContextMenu.video")} description={node?.title || nodeTypeLabel(t, node)} />
                                    <MenuSection label={t("canvasContextMenu.viewArchive")} />
                                    <MenuButton icon={<Maximize2 />} label={t("canvasContextMenu.panoramaPreview")} disabled={!canOpenPreview} onClick={() => runAction(onViewMedia)} />
                                    <MenuButton icon={<Tags />} label={t("canvasContextMenu.setAssetCategory")} chevron onClick={() => setCategoryOpen(true)} />
                                    {isImage && onLayerSplit ? <MenuButton icon={<Layers3 />} label={upstreamText("upstream.v165.message002")} disabled={!hasNodeContent} onClick={() => runAction(onLayerSplit)} /> : null}
                                    {isImage && onImageToDirector ? <MenuButton icon={<Layers3 />} label={t("previs.imageToScene")} disabled={!hasNodeContent} onClick={() => runAction(onImageToDirector)} /> : null}
                                    {isImage ? <MenuButton icon={<CloudUpload />} label={t("canvasContextMenu.uploadToArk")} onClick={() => runAction(onUploadToArkPrivateAsset)} /> : null}
                                    <MenuDivider />
                                    <MenuSection label={t("canvasContextMenu.nodes")} />
                                    <MenuButton icon={<AtSign />} label={t("canvasContextMenu.sendToAgent")} disabled={!onSendToAgent} onClick={() => onSendToAgent && runAction(onSendToAgent)} />
                                    <MenuButton icon={<Copy />} label={t("canvasContextMenu.copyNode")} shortcut="⌘C" onClick={() => runAction(onCopyNode)} />
                                    {isImage ? <MenuButton icon={<Clipboard />} label={t("canvasContextMenu.copyImage")} disabled={!hasNodeContent} onClick={() => runAction(onCopyContent)} /> : null}
                                    <MenuButton icon={<Link2 />} label={isImage ? t("canvasContextMenu.copyImageUrl") : t("canvasContextMenu.copyVideoUrl")} disabled={!canCopyMediaUrl} onClick={() => runAction(onCopyMediaUrl)} />
                                    <MenuButton icon={<Copy />} label={t("canvasContextMenu.createGenerationCopy")} onClick={() => runAction(onCreateGenerationCopy)} />
                                    <MenuButton icon={<Layers3 />} label={t("canvasContextMenu.createParamVariant")} shortcut="⌘D" onClick={() => runAction(onDuplicate)} />
                                    <MenuButton icon={<Trash2 />} label={t("canvasContextMenu.deleteNode")} danger onClick={() => runAction(onDelete)} />
                                </>
                            ) : (
                                <>
                                    <MenuHeader title={node?.title || nodeTypeLabel(t, node)} />
                                    <MenuSection label={t("canvasContextMenu.nodeActions")} />
                                    {isFrame ? (
                                        <MenuButton
                                            icon={isFolder ? <FolderOpen /> : <PanelTop />}
                                            label={
                                                node?.metadata?.frame?.collapsed
                                                    ? t("canvasContextMenu.expand", { kind: isFolder ? t("canvasContextMenu.folder") : t("canvasContextMenu.backdrop") })
                                                    : t("canvasContextMenu.collapse", { kind: isFolder ? t("canvasContextMenu.folder") : t("canvasContextMenu.backdrop") })
                                            }
                                            onClick={() => runAction(onToggleFrame)}
                                        />
                                    ) : (
                                        <MenuButton icon={<FolderPlus />} label={t("canvasContextMenu.saveToAssets")} disabled={!canSaveAsset} onClick={() => runAction(onSaveAsset)} />
                                    )}
                                    {isText ? <MenuButton icon={<Maximize2 />} label={t("canvasContextMenu.zoomEdit")} onClick={() => runAction(onEditText)} /> : null}
                                    {isDrawing ? <MenuButton icon={<Pencil />} label={t("canvasContextMenu.openDrawing")} onClick={() => runAction(onOpenDrawing)} /> : null}
                                    {isText ? <MenuButton icon={<ImageIcon />} label={t("canvasContextMenu.textToImage")} disabled={!canGenerateFromText} onClick={() => runAction(onGenerateImage)} /> : null}
                                    <MenuDivider />
                                    <MenuSection label={t("canvasContextMenu.copiesContent")} />
                                    <MenuButton icon={<AtSign />} label={t("canvasContextMenu.sendToAgent")} disabled={!onSendToAgent} onClick={() => onSendToAgent && runAction(onSendToAgent)} />
                                    <MenuButton
                                        icon={<Copy />}
                                        label={isFrame ? t("canvasContextMenu.copyWithContent", { kind: isFolder ? t("canvasContextMenu.folder") : t("canvasContextMenu.backdrop") }) : t("canvasContextMenu.copyNode")}
                                        shortcut="⌘C"
                                        onClick={() => runAction(onCopyNode)}
                                    />
                                    {isText ? <MenuButton icon={<Clipboard />} label={t("canvasContextMenu.copyText")} disabled={!hasNodeContent} onClick={() => runAction(onCopyContent)} /> : null}
                                    <MenuButton
                                        icon={<Copy />}
                                        label={isFrame ? t("canvasContextMenu.createCopy", { kind: isFolder ? t("canvasContextMenu.folder") : t("canvasContextMenu.backdrop") }) : t("canvasContextMenu.createParamVariant")}
                                        shortcut="⌘D"
                                        onClick={() => runAction(onDuplicate)}
                                    />
                                    <MenuButton icon={<Clipboard />} label={t("canvasContextMenu.paste")} shortcut="⌘V" disabled={!canPaste} onClick={() => runAction(onPaste)} />
                                    <MenuButton
                                        icon={<Trash2 />}
                                        label={isFrame ? t("canvasContextMenu.delete", { kind: isFolder ? t("canvasContextMenu.folder") : t("canvasContextMenu.backdrop") }) : t("canvasContextMenu.deleteNode")}
                                        danger
                                        onClick={() => runAction(onDelete)}
                                    />
                                </>
                            )}
                        </>
                    ) : (
                        <>
                            <MenuHeader title={t("canvasContextMenu.connection")} />
                            <MenuButton icon={<Trash2 className="size-4" />} label={t("canvasContextMenu.deleteConnection")} danger onClick={() => runAction(onDelete)} />
                        </>
                    )}
                </div>
            </SpotlightSurface>

            <AnimatePresence>
                {menu.type === "canvas" && addOpen ? (
                    <AddNodeContextMenu
                        parentPosition={position}
                        workspaceMode={workspaceMode}
                        isProjectLinked={isProjectLinked}
                        onAddNode={(type) => runAction(() => onAddNode(type))}
                        onAddFolder={() => runAction(onAddFolder)}
                        onChooseStyle={() => runAction(onChooseStyle)}
                        onOpenDirector={() => runAction(() => onOpenDirector(menu.position))}
                        onUpload={() => runAction(onUpload)}
                        onOpenAssets={() => runAction(onOpenAssets)}
                        onOpenProjectCharacters={() => runAction(onOpenProjectCharacters)}
                    />
                ) : null}
            </AnimatePresence>
        </>
    );
}

function AddNodeContextMenu({
    parentPosition,
    workspaceMode,
    isProjectLinked,
    onAddNode,
    onAddFolder,
    onChooseStyle,
    onOpenDirector,
    onUpload,
    onOpenAssets,
    onOpenProjectCharacters,
}: {
    parentPosition: { left: number; top: number };
    workspaceMode: CanvasWorkspaceMode;
    isProjectLinked: boolean;
    onAddNode: (type: CanvasNodeTypeId) => void;
    onAddFolder: () => void;
    onChooseStyle: () => void;
    onOpenDirector: () => void;
    onUpload: () => void;
    onOpenAssets: () => void;
    onOpenProjectCharacters: () => void;
}) {
    upstreamUseI18n();
    const { t } = useI18n();
    const theme = canvasThemes[useActiveTheme()];
    const installations = usePluginStore((state) => state.installations);
    const pluginStates = usePluginStore((state) => state.pluginStates);
    const submenuPosition = getSubmenuPosition(parentPosition);
    const createContext: AddNodeMenuContext = {
        workspaceMode,
        isProjectLinked,
        enabledPluginIds: new Set(installations.filter((item) => pluginStates[item.manifest.id]?.effectiveEnabled ?? item.enabled).map((item) => item.manifest.id)),
        handlers: {
            onAddText: () => onAddNode(CanvasNodeType.Text),
            onAddImage: () => onAddNode(CanvasNodeType.Image),
            onAddVideo: () => onAddNode(CanvasNodeType.Video),
            onAddAudio: () => onAddNode(CanvasNodeType.Audio),
            onAddScript: () => onAddNode(CanvasNodeType.Script),
            onAddFrame: () => onAddNode(CanvasNodeType.Frame),
            onAddFolder,
            onAddDrawing: () => onAddNode(CanvasNodeType.Drawing),
            onAddExtensionNode: onAddNode,
            onAddWorkflow: () => onAddNode(CanvasNodeType.Config),
            onChooseStyle,
            onOpenDirector,
            onUpload,
            onOpenMyAssets: onOpenAssets,
            onOpenProjectCharacters,
        },
    };
    const commands: CanvasCreateCommand[] = resolveAddNodeMenuCommands(createContext).map((command) => ({
        id: command.id,
        label: toolCatalogText(command.label),
        icon: command.icon,
        badge: toolCatalogText(command.badge),
        section: command.section,
        onClick: () => command.run(createContext),
    }));

    return (
        <SpotlightSurface
            spotlightColor={theme.toolbar.itemHover}
            data-canvas-no-zoom
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: aceternityMotion.duration.instant, ease: aceternityMotion.easing.enter }}
            className="aceternity-floating-panel fixed z-[var(--z-popover)] max-h-[calc(100dvh-24px)] origin-top overflow-y-auto rounded-[var(--dock-radius)] border p-2 backdrop-blur-2xl"
            style={{ left: submenuPosition.left, top: submenuPosition.top, width: submenuPosition.width, background: theme.spatial.elevated, borderColor: theme.toolbar.border, color: theme.node.text }}
            onContextMenu={(event) => event.preventDefault()}
            onPointerDown={(event) => event.stopPropagation()}
        >
            <CanvasCreateMenu commands={commands} />
        </SpotlightSurface>
    );
}

function MenuHeader({ title, description, onBack }: { title: string; description?: string; onBack?: () => void }) {
    upstreamUseI18n();
    const { t } = useI18n();
    const theme = canvasThemes[useActiveTheme()];
    return (
        <div className="mb-0.5 flex items-start gap-1 px-1.5 py-1.5">
            {onBack ? (
                <button type="button" onClick={onBack} className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md outline-none hover:bg-black/5 focus-visible:ring-2 dark:hover:bg-white/8" aria-label={t("canvasContextMenu.backToMedia")}>
                    <ArrowLeft className="size-3.5" />
                </button>
            ) : null}
            <span className="min-w-0">
                <span className="block truncate text-xs font-semibold">{title}</span>
                {description && description !== title ? (
                    <span className="mt-0.5 block truncate text-[var(--fs-micro)]" style={{ color: theme.node.muted }}>
                        {description}
                    </span>
                ) : null}
            </span>
        </div>
    );
}

function MenuSection({ label }: { label: string }) {
    upstreamUseI18n();
    return <div className="px-2 pb-1 pt-1.5 text-[var(--fs-micro)] font-medium opacity-45">{label}</div>;
}

function MenuButton({
    icon,
    label,
    detail,
    shortcut,
    badge,
    chevron = false,
    active = false,
    disabled = false,
    danger = false,
    onClick,
}: {
    icon: ReactNode;
    label: string;
    detail?: string;
    shortcut?: string;
    badge?: string;
    chevron?: boolean;
    active?: boolean;
    disabled?: boolean;
    danger?: boolean;
    onClick?: () => void;
}) {
    upstreamUseI18n();
    const theme = canvasThemes[useActiveTheme()];
    const color = danger ? theme.accent.danger : theme.node.text;
    return (
        <button
            type="button"
            className="canvas-menu-item group flex min-h-9 w-full items-center gap-2 rounded-lg border border-transparent px-1.5 py-1 text-left outline-none enabled:hover:border-black/10 enabled:hover:bg-black/5 focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-35 dark:enabled:hover:border-white/10 dark:enabled:hover:bg-white/8"
            style={{ color, background: active ? theme.toolbar.activeBg : undefined, "--tw-ring-color": theme.node.muted } as CSSProperties}
            disabled={disabled}
            onClick={onClick}
        >
            <span
                className="canvas-menu-item-icon grid size-7 shrink-0 place-items-center rounded-md border opacity-75 group-hover:opacity-100 [&_svg]:size-3.5"
                style={{ background: danger ? `${theme.accent.danger}12` : theme.spatial.surface, borderColor: danger ? `${theme.accent.danger}33` : theme.toolbar.border, color: danger ? theme.accent.danger : theme.node.text }}
            >
                {icon}
            </span>
            <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 text-xs font-medium">
                    <span className="truncate">{label}</span>
                    {badge ? (
                        <span className="rounded-full border px-1 py-0.5 text-[var(--fs-nano)] font-bold" style={{ background: theme.toolbar.activeBg, borderColor: theme.toolbar.border, color: theme.node.muted }}>
                            {badge}
                        </span>
                    ) : null}
                </span>
                {detail ? (
                    <span className="mt-0.5 block truncate text-[var(--fs-micro)]" style={{ color: theme.node.muted }}>
                        {detail}
                    </span>
                ) : null}
            </span>
            {shortcut ? <span className="shrink-0 text-[var(--fs-micro)] opacity-38">{shortcut}</span> : null}
            {chevron ? <ChevronRight className="size-3 shrink-0 opacity-45" /> : null}
        </button>
    );
}

function MenuDivider() {
    upstreamUseI18n();
    const theme = canvasThemes[useActiveTheme()];
    return <div className="mx-1.5 my-1 h-px" style={{ background: `linear-gradient(90deg, transparent, ${theme.toolbar.border}, transparent)` }} />;
}

function getContextMenuPosition(menu: ContextMenuState, hasMultiSelection = false) {
    if (typeof window === "undefined") return { left: menu.x, top: menu.y };
    const width = Math.min(224, window.innerWidth - 24);
    const estimatedHeight = Math.min(menu.type === "node" ? (hasMultiSelection ? 240 : 360) : menu.type === "canvas" ? (hasMultiSelection ? 300 : 250) : 84, window.innerHeight - 24);
    return {
        left: clamp(menu.x, 12, Math.max(12, window.innerWidth - width - 12)),
        top: clamp(menu.y, 12, Math.max(12, window.innerHeight - estimatedHeight - 12)),
    };
}

function getSubmenuPosition(parent: { left: number; top: number }) {
    if (typeof window === "undefined") return { left: parent.left + 232, top: parent.top, width: 360 };
    return positionCanvasSubmenu(parent, { width: window.innerWidth, height: window.innerHeight });
}

function nodeTypeLabel(t: ReturnType<typeof useI18n>["t"], node?: CanvasNodeData | null) {
    if (!node) return t("canvasContextMenu.node");
    if (node.type === CanvasNodeType.Image) return t("canvasContextMenu.imageNode");
    if (node.type === CanvasNodeType.Text) return t("canvasContextMenu.textNode");
    if (node.type === CanvasNodeType.Script) return t("canvasContextMenu.scriptNode");
    if (node.type === CanvasNodeType.Skill) return t("canvasContextMenu.skillNode");
    if (node.type === CanvasNodeType.Video) return t("canvasContextMenu.videoNode");
    if (node.type === CanvasNodeType.Audio) return t("canvasContextMenu.audioNode");
    if (node.type === CanvasNodeType.Drawing) return t("canvasContextMenu.drawingNode");
    if (node.type === CanvasNodeType.Frame) return isCanvasFolderNode(node) ? t("canvasContextMenu.folder") : t("canvasContextMenu.backdrop");
    return t("canvasContextMenu.configNode");
}
