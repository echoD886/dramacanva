import { Button, Dropdown, Input, Modal, Select } from "antd";
import { Tooltip } from "@/components/ui/base/tooltip";
import { Fragment, memo, useCallback, useInsertionEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

import type { MenuProps } from "antd";
import { Clapperboard, Expand, Film, Grid3X3, Image as ImageIcon, ListTree, Merge, MoreHorizontal, Plus, RefreshCw, Send, Square, Trash2, Video } from "lucide-react";

import { CanvasResourceMentionTextarea } from "@/components/canvas/canvas-resource-mention-textarea";
import { useCanvasTextEdit } from "./use-canvas-text-edit";
import { flushCanvasTextEdits } from "@/services/canvas-text-edits";
import { checkpointCanvasStoryboardInput } from "@/services/user-data-sync";
import { useParams } from "react-router";
import { StoryboardAssetsCell } from "@/components/canvas/storyboard-assets-cell";
import { ModelPicker } from "@/components/model-picker";
import { useI18n } from "@/i18n/use-i18n";
import { GenerationErrorCard } from "@/components/generation-error-card";
import { useCanvasNodeActions } from "./canvas-node-action-context";
import { localizedPipelineStatus } from "@/i18n/storyboard-pipeline";
import type { MessageKey } from "@/i18n/messages";
import { buildGenerationConfig } from "@/lib/canvas/canvas-project-generation";
import type { CanvasResourceReference } from "@/lib/canvas/canvas-resource-references";
import type { CanvasStoryboardPipelineProgress, StoryboardPipelineStage } from "@/lib/canvas/canvas-storyboard-progress";
import { isContentModerationError } from "@/lib/generation-error";
import { localizedGenerationError } from "@/i18n/generation-error";
import { localizedGenerationTaskStage } from "@/i18n/generation-task";
import { generationTaskShowsProgress } from "@/lib/generation-task-display";
import { navigateToSettings } from "@/lib/settings-navigation";
import { canvasThemes } from "@/lib/canvas-theme";
import { useEffectiveConfig } from "@/stores/use-config-store";
import { useActiveTheme } from "@/stores/canvas/use-canvas-theme-store";
import { STORYBOARD_COMPOSER_MIN_HEIGHT, STORYBOARD_HEADER_HEIGHT, STORYBOARD_ROW_HEIGHT, storyboardTableHeight } from "@/lib/canvas/canvas-storyboard-layout";
import type {
    CanvasGenerationBatch,
    CanvasGenerationBatchItem,
    CanvasGenerationBatchItemStatus,
    CanvasNodeData,
    CanvasNodeStatus,
    CanvasWorkspaceMode,
    StoryboardColumn,
    StoryboardRow,
    StoryboardShotCount,
    StoryboardShotDuration,
    StoryboardVideoInputMode,
} from "@/types/canvas";
import type { TaskStatus } from "@/services/api/task-center";

const STORYBOARD_PROMPT_MIN_HEIGHT = 40;
const STORYBOARD_PROMPT_MAX_HEIGHT = 116;
const SCRIPT_GRID_TEMPLATE = "var(--coach-script-columns, 64px 76px minmax(300px, 1.55fr) minmax(220px, 1fr) 180px)";

export function CanvasScriptNodeContent({
    node,
    nodes,
    batch,
    pipeline,
    scale,
    mentionReferences,
    onOpen,
    onCreateImageNodes,
    onCreateVideoNodes,
    onGenerateImages,
    onGenerateVideos,
    onVideoInputModeChange,
    onMergeVideos,
    onCreateActionBoards,
    onRetryBatch,
    onRetryBatchItem,
    onStopBatch,
    onAddRow,
    onRemoveRow,
    onCreatePrevis,
    onUpdateRow,
    onEditAssets,
    onPromptChange,
    onGenerateScript,
    onModelChange,
    onShotDurationChange,
    onAspectRatioChange,
    aspectRatio,
    onShotCountChange,
    onComposerHeightChange,
    onConnectStart,
    onScrollTopChange,
    workspaceMode = "professional",
}: {
    node: CanvasNodeData;
    nodes: CanvasNodeData[];
    batch?: CanvasGenerationBatch;
    pipeline: CanvasStoryboardPipelineProgress;
    scale: number;
    mentionReferences: CanvasResourceReference[];
    onOpen: () => void;
    onCreateImageNodes: (rowIds?: string[]) => void;
    onCreateVideoNodes: () => void;
    onGenerateImages: (rowIds: string[]) => void;
    onGenerateVideos: (rowIds: string[]) => void;
    onVideoInputModeChange: (mode: StoryboardVideoInputMode) => void;
    onMergeVideos: () => void;
    onCreateActionBoards: () => void;
    onRetryBatch: (batchId: string) => void;
    onRetryBatchItem: (batchId: string, itemId: string) => void;
    onStopBatch: (batchId: string) => void;
    onAddRow: () => void;
    onRemoveRow: (rowId: string) => void;
    onCreatePrevis?: (rowId: string) => void;
    onUpdateRow: (rowId: string, patch: Partial<StoryboardRow>) => void;
    onEditAssets: (rowId: string) => void;
    onPromptChange: (prompt: string) => void;
    onGenerateScript: (prompt: string) => void;
    onModelChange: (model: string) => void;
    onShotDurationChange: (duration: StoryboardShotDuration) => void;
    onAspectRatioChange: (ratio: string) => void;
    aspectRatio: string;
    onShotCountChange: (count: StoryboardShotCount) => void;
    onComposerHeightChange: (height: number) => void;
    onConnectStart: (event: ReactPointerEvent, rowId: string, handleType: "source" | "target") => void;
    onScrollTopChange: (scrollTop: number) => void;
    workspaceMode?: CanvasWorkspaceMode;
}) {
    const { t } = useI18n();
    const theme = canvasThemes[useActiveTheme()];
    const effectiveConfig = useEffectiveConfig();
    const generationConfig = buildGenerationConfig(effectiveConfig, node, "text");
    const simpleMode = workspaceMode === "simple";
    const rows = node.metadata?.storyboard?.rows || [];
    const latestRowActions = useRef({ onUpdateRow, onEditAssets, onCreateImageNodes, onCreatePrevis, onRemoveRow });
    useInsertionEffect(() => {
        latestRowActions.current = { onUpdateRow, onEditAssets, onCreateImageNodes, onCreatePrevis, onRemoveRow };
    });
    const rowActions = useMemo<InlineRowActions>(
        () => ({
            onUpdateRow: (id, patch) => latestRowActions.current.onUpdateRow(id, patch),
            onEditAssets: (id) => latestRowActions.current.onEditAssets(id),
            onCreateImageNodes: (ids) => latestRowActions.current.onCreateImageNodes(ids),
            onCreatePrevis: (id) => latestRowActions.current.onCreatePrevis?.(id),
            onRemoveRow: (id) => latestRowActions.current.onRemoveRow(id),
        }),
        [],
    );
    const [prompt, setPrompt] = useState(node.metadata?.composerContent || "");
    const [scrollTop, setScrollTop] = useState(0);
    const composerHeightChangeRef = useRef(onComposerHeightChange);
    const reportedComposerHeightRef = useRef<number | null>(null);
    const composerHeight = node.metadata?.storyboardComposerHeight || STORYBOARD_COMPOSER_MIN_HEIGHT;
    const tableHeight = storyboardTableHeight(node.height, composerHeight);
    const totalDuration = rows.reduce((sum, row) => sum + (Number(row.durationSeconds) || 0), 0);
    const shotDuration = node.metadata?.storyboardShotDuration || "auto";
    const shotCount = node.metadata?.storyboardShotCount || "auto";
    const videoInputMode = node.metadata?.storyboardVideoInputMode || "direct";
    const batchItemByRowId = useMemo(() => new Map((batch?.items || []).map((item) => [item.rowId, item])), [batch?.items]);
    const batchSummary = batch ? generationBatchSummary(t, batch) : null;
    const hasFailedBatchItems = Boolean(batch?.items.some((item) => item.status === "failed"));
    const hasWaitingBatchItems = Boolean(batch?.items.some((item) => item.status === "waiting" || item.status === "submitting"));
    const hasActiveBatchItems = Boolean(batch?.items.some((item) => item.status === "waiting" || item.status === "submitting" || item.status === "queued" || item.status === "running"));
    const taskStatus = node.metadata?.taskStatus;
    const displayStatus: TaskStatus = taskStatus === "queued" || taskStatus === "succeeded" || taskStatus === "failed" || taskStatus === "cancelled" ? taskStatus : "running";
    const displayTask = node.metadata?.taskId
        ? {
              provider: node.metadata.taskProvider,
              status: displayStatus,
              stage: node.metadata.taskStage,
              officialStatus: node.metadata.taskOfficialStatus,
              errorCode: node.metadata.taskErrorCode,
          }
        : null;
    const taskFeedback =
        node.metadata?.status === "loading"
            ? displayTask
                ? `${localizedGenerationTaskStage(displayTask, t)}${generationTaskShowsProgress(displayTask) && typeof node.metadata.taskProgress === "number" ? ` · ${node.metadata.taskProgress}%` : ""}`
                : t("scriptNode.creatingTask")
            : node.metadata?.status === "error"
              ? localizedGenerationError(node.metadata.errorDetails, t)
              : "";
    const [batchDetailsOpen, setBatchDetailsOpen] = useState(false);
    const [moreMenuOpen, setMoreMenuOpen] = useState(false);
    const pipelineDisabled = !rows.length || node.metadata?.status === "loading" || hasActiveBatchItems;
    const missingImages = Math.max(0, pipeline.images.total - pipeline.images.created);
    const missingVideos = Math.max(0, pipeline.videos.total - pipeline.videos.created);
    const canMerge = pipeline.successfulVideoNodeIds.length >= 2 && pipeline.final.success === 0;
    const allRowIds = pipeline.rows.map((item) => item.row.id);
    const moreMenuItems: MenuProps["items"] = [
        { key: "generate-images", icon: <ImageIcon className="size-3.5" />, label: t("scriptNode.unfinishedImages"), disabled: pipelineDisabled || pipeline.images.incomplete === 0, onClick: () => onGenerateImages(allRowIds) },
        { key: "generate-videos", icon: <Video className="size-3.5" />, label: t("scriptNode.unfinishedVideos"), disabled: pipelineDisabled || pipeline.videos.incomplete === 0, onClick: () => onGenerateVideos(allRowIds) },
        {
            key: "merge",
            icon: <Merge className="size-3.5" />,
            label: pipeline.final.success ? t("scriptNode.finalComplete") : pipeline.successfulVideoNodeIds.length >= 2 ? t("scriptNode.mergeCount", { count: pipeline.successfulVideoNodeIds.length }) : t("scriptNode.mergeMinimum"),
            disabled: !canMerge,
            onClick: () => onMergeVideos(),
        },
        { type: "divider" },
        {
            key: "video-input",
            icon: <Film className="size-3.5" />,
            label: t("scriptNode.inputMode"),
            children: [
                { key: "video-input-direct", label: videoInputMode === "direct" ? `✓ ${t("scriptEditor.direct")}` : t("scriptEditor.direct"), onClick: () => onVideoInputModeChange("direct") },
                { key: "video-input-keyframe", label: videoInputMode === "keyframe" ? `✓ ${t("scriptEditor.keyframe")}` : t("scriptEditor.keyframe"), onClick: () => onVideoInputModeChange("keyframe") },
            ],
        },
        ...(!simpleMode
            ? [
                  { type: "divider" as const },
                  {
                      key: "create-image-nodes",
                      icon: <Grid3X3 className="size-3.5" />,
                      label: missingImages ? t("scriptNode.createImages", { count: missingImages }) : t("scriptNode.imagesCreated"),
                      disabled: pipelineDisabled || missingImages === 0,
                      onClick: () => onCreateImageNodes(),
                  },
                  {
                      key: "create-video-nodes",
                      icon: <Film className="size-3.5" />,
                      label: missingVideos ? t("scriptNode.createVideos", { count: missingVideos }) : t("scriptNode.videosCreated"),
                      disabled: pipelineDisabled || missingVideos === 0,
                      onClick: () => onCreateVideoNodes(),
                  },
                  { key: "action-boards", icon: <Grid3X3 className="size-3.5" />, label: t("scriptNode.actionBoards"), disabled: !rows.length || hasActiveBatchItems, onClick: () => onCreateActionBoards() },
              ]
            : []),
        ...(batch
            ? [
                  { type: "divider" as const },
                  { key: "retry", icon: <RefreshCw className="size-3.5" />, label: t("scriptNode.retryFailed"), disabled: !hasFailedBatchItems, onClick: () => onRetryBatch(batch.id) },
                  { key: "stop", icon: <Square className="size-3.5" />, label: t("scriptNode.stopRemaining"), disabled: !hasWaitingBatchItems, onClick: () => onStopBatch(batch.id) },
                  { key: "details", icon: <ListTree className="size-3.5" />, label: t("scriptNode.viewBatch"), onClick: () => setBatchDetailsOpen(true) },
              ]
            : []),
    ];
    const submitPrompt = () => {
        const value = prompt.trim();
        if (value && node.metadata?.status !== "loading") onGenerateScript(value);
    };
    useLayoutEffect(() => {
        composerHeightChangeRef.current = onComposerHeightChange;
    }, [onComposerHeightChange]);
    const resizePrompt = useCallback((contentHeight: number) => {
        const promptHeight = Math.min(STORYBOARD_PROMPT_MAX_HEIGHT, Math.max(STORYBOARD_PROMPT_MIN_HEIGHT, contentHeight));
        const composerHeight = promptHeight + 64;
        if (reportedComposerHeightRef.current === composerHeight) return;
        reportedComposerHeightRef.current = composerHeight;
        composerHeightChangeRef.current(composerHeight);
    }, []);

    return (
        <div className="relative flex h-full w-full flex-col overflow-visible" data-canvas-tour="script-node" style={{ color: theme.node.text }} onDoubleClick={(event) => event.stopPropagation()}>
            <div className="relative flex h-10 shrink-0 items-center gap-2 rounded-t-[17px] border-b px-4" style={{ borderColor: theme.node.stroke, background: theme.node.panel }}>
                <Clapperboard className="size-4" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold" title={node.title || t("scriptEditor.title")}>
                    {node.title || t("scriptEditor.title")}
                </span>
                {batchSummary ? (
                    <span className="min-w-0 max-w-[42%] truncate text-[var(--fs-label)] font-medium" title={batchSummary} style={{ color: batch?.status === "partial_failed" ? theme.accent.danger : theme.node.muted }}>
                        {batchSummary}
                    </span>
                ) : taskFeedback && node.metadata?.status !== "error" ? (
                    <span className="min-w-0 max-w-[38%] truncate text-[var(--fs-label)] font-medium" title={taskFeedback} style={{ color: theme.node.muted }}>
                        {taskFeedback}
                    </span>
                ) : null}
                <span className="text-[var(--fs-caption)] font-semibold tabular-nums" style={{ color: theme.node.muted }}>
                    {t("scriptNode.summary", { shots: rows.length, seconds: totalDuration })}
                </span>
                <Tooltip title={t("scriptNode.fullscreen")}>
                    <button
                        type="button"
                        data-canvas-tour="script-fullscreen"
                        className="grid size-7 place-items-center rounded outline-none transition hover:bg-black/5 focus-visible:ring-2 dark:hover:bg-white/10"
                        style={{ "--tw-ring-color": theme.node.muted } as CSSProperties}
                        onMouseDown={(event) => event.stopPropagation()}
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                            event.stopPropagation();
                            onOpen();
                        }}
                        aria-label={t("scriptNode.fullscreen")}
                    >
                        <Expand className="size-3.5" />
                    </button>
                </Tooltip>
                <Dropdown open={moreMenuOpen} onOpenChange={setMoreMenuOpen} menu={{ items: moreMenuItems, onClick: () => setMoreMenuOpen(false) }} trigger={["click"]} placement="bottomRight">
                    <button
                        type="button"
                        data-canvas-tour="script-more"
                        className="grid size-7 place-items-center rounded outline-none transition hover:bg-black/5 focus-visible:ring-2 dark:hover:bg-white/10"
                        style={{ "--tw-ring-color": theme.node.muted } as CSSProperties}
                        onMouseDown={(event) => event.stopPropagation()}
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                            event.stopPropagation();
                            setMoreMenuOpen(true);
                        }}
                        aria-label={t("scriptNode.more")}
                    >
                        <MoreHorizontal className="size-3.5" />
                    </button>
                </Dropdown>
            </div>
            {batch ? (
                <Modal title={t("scriptNode.batchDetails")} open={batchDetailsOpen} onCancel={() => setBatchDetailsOpen(false)} footer={null} width={560} centered destroyOnHidden>
                    <GenerationBatchDetails batch={batch} rows={rows} nodes={nodes} onRetryItem={(itemId) => onRetryBatchItem(batch.id, itemId)} />
                </Modal>
            ) : null}
            <StoryboardMiniPipeline pipeline={pipeline} theme={theme} rows={rows} />
            {node.metadata?.status === "error" ? (
                <GenerationErrorCard
                    compact
                    error={{ ...node.metadata, code: node.metadata.taskErrorCode || node.metadata.generationErrorCode, taskId: node.metadata.taskId, billing: node.metadata.taskBilling }}
                    actions={{ prompt: onOpen, parameters: onOpen, model: onOpen, reference: onOpen }}
                />
            ) : null}
            <div className="coach-script-table-scroll min-h-0 flex-1" data-canvas-wheel-scroll>
                <div className="coach-script-table-content flex h-full min-h-0 flex-col">
                    <div
                        data-canvas-tour="script-table-header"
                        className="storyboard-header-gutter grid h-9 shrink-0 items-center border-b text-xs font-semibold"
                        style={{ borderColor: theme.node.stroke, color: theme.node.muted, gridTemplateColumns: SCRIPT_GRID_TEMPLATE }}
                    >
                        <HeaderCell borderColor={theme.node.stroke} align="center">
                            {t("scriptEditor.shotNumber")}
                        </HeaderCell>
                        <HeaderCell borderColor={theme.node.stroke} align="center">
                            {t("scriptEditor.durationSeconds")}
                        </HeaderCell>
                        <HeaderCell borderColor={theme.node.stroke}>{t("scriptEditor.videoMotionPrompt")}</HeaderCell>
                        <HeaderCell borderColor={theme.node.stroke}>{t("scriptEditor.dialogue")}</HeaderCell>
                        <span className="px-3">{t("scriptEditor.assets")}</span>
                    </div>
                    <div
                        data-canvas-wheel-scroll
                        tabIndex={0}
                        role="region"
                        aria-label={t("scriptNode.shotList")}
                        className="storyboard-scrollbar min-h-0 flex-1 overflow-y-scroll overflow-x-hidden outline-none focus-visible:ring-1 focus-visible:ring-inset"
                        style={{ "--tw-ring-color": theme.node.muted } as CSSProperties}
                        onScroll={(event) => {
                            flushCanvasTextEdits();
                            const next = event.currentTarget.scrollTop;
                            setScrollTop(next);
                            onScrollTopChange(next);
                        }}
                        onWheel={(event) => event.stopPropagation()}
                    >
                        {rows.length ? (
                            rows.map((row, index) => (
                                <StoryboardInlineRow
                                    key={row.id}
                                    nodeId={node.id}
                                    row={row}
                                    index={index}
                                    nodes={nodes}
                                    loading={node.metadata?.status === "loading"}
                                    locked={node.metadata?.locked}
                                    canRemove={rows.length > 1}
                                    batchItem={batchItemByRowId.get(row.id)}
                                    {...rowActions}
                                    onCreatePrevis={onCreatePrevis ? rowActions.onCreatePrevis : undefined}
                                />
                            ))
                        ) : (
                            <button
                                type="button"
                                className="grid h-full min-h-36 w-full place-items-center"
                                onMouseDown={(event) => event.stopPropagation()}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onAddRow();
                                }}
                            >
                                <span className="flex flex-col items-center gap-2.5">
                                    <span className="text-sm font-bold">{t("scriptNode.firstShot")}</span>
                                    <span className="text-[var(--fs-label)] font-medium" style={{ color: theme.node.faint }}>
                                        {t("scriptNode.emptyHelp")}
                                    </span>
                                </span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex h-9 shrink-0 items-center justify-center border-b" style={{ borderColor: theme.node.stroke, background: theme.node.panel }}>
                <button
                    type="button"
                    data-canvas-tour="script-add-shot"
                    className="inline-flex h-7 items-center gap-1 rounded px-2 text-xs font-medium outline-none transition hover:bg-black/5 focus-visible:ring-2 dark:hover:bg-white/10"
                    style={{ "--tw-ring-color": theme.node.muted } as CSSProperties}
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                        event.stopPropagation();
                        onAddRow();
                    }}
                >
                    <Plus className="size-3.5" />
                    {t("scriptNode.addRow")}
                </button>
            </div>
            <div className="relative grid shrink-0 grid-rows-[minmax(0,1fr)_28px] gap-1.5 rounded-b-[17px] p-2.5" data-canvas-tour="script-prompt" style={{ height: composerHeight, background: theme.node.panel }}>
                <CanvasResourceMentionTextarea
                    rows={1}
                    references={mentionReferences}
                    aria-label={t("scriptNode.promptAria")}
                    containerClassName="h-full min-h-0 overflow-hidden"
                    className="thin-scrollbar h-full min-h-0 w-full touch-pan-y resize-none overflow-y-auto overflow-x-hidden overscroll-contain rounded-md border bg-transparent px-3 py-2 text-sm leading-5 outline-none transition placeholder:opacity-45 focus:ring-1"
                    style={{ borderColor: theme.node.stroke, color: theme.node.text, "--tw-ring-color": theme.node.muted } as CSSProperties}
                    value={prompt}
                    placeholder={t("scriptNode.promptPlaceholder")}
                    onContentSizeChange={resizePrompt}
                    onChange={(value) => {
                        setPrompt(value);
                        onPromptChange(value);
                    }}
                    onKeyDown={(event) => {
                        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                            event.preventDefault();
                            submitPrompt();
                        }
                    }}
                    onMouseDown={(event) => event.stopPropagation()}
                    onPointerDown={(event) => event.stopPropagation()}
                    onWheel={(event) => event.stopPropagation()}
                />
                <div data-canvas-tour="script-options" className="flex min-w-0 items-center justify-end gap-2" onMouseDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
                    <Tooltip title={t("scriptNode.modelHelp")} placement="topLeft">
                        <div className="mr-auto min-w-36 max-w-56 flex-1">
                            <ModelPicker
                                className="!h-7 !w-full !min-w-0 !text-[var(--fs-tiny)] !font-normal [&_img]:!size-3 [&_.lucide]:!size-3"
                                fullWidth
                                config={generationConfig}
                                value={generationConfig.model}
                                capability="text"
                                placeholder={t("scriptNode.selectModel")}
                                showSelectedPrice={false}
                                onChange={onModelChange}
                                onMissingConfig={() => navigateToSettings({ continueCreation: true })}
                            />
                        </div>
                    </Tooltip>
                    {simpleMode ? (
                        <span className="text-[var(--fs-label)]" style={{ color: theme.node.muted }}>
                            {t("scriptNode.autoBoth")}
                        </span>
                    ) : (
                        <Select<StoryboardShotCount>
                            className="min-w-24"
                            size="small"
                            value={shotCount}
                            disabled={node.metadata?.status === "loading"}
                            options={[{ value: "auto", label: t("scriptNode.autoSplit") }, ...Array.from({ length: 10 }, (_, index) => ({ value: String(index + 1) as StoryboardShotCount, label: t("scriptNode.shotCount", { count: index + 1 }) }))]}
                            popupMatchSelectWidth={false}
                            onChange={onShotCountChange}
                        />
                    )}
                    <Select
                        size="small"
                        className="min-w-20"
                        popupMatchSelectWidth={false}
                        aria-label={t("imageSettings.sizeRatio")}
                        value={aspectRatio}
                        placeholder={t("imageSettings.sizeRatio")}
                        options={["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"].map((value) => ({ value, label: value }))}
                        disabled={node.metadata?.status === "loading"}
                        onChange={onAspectRatioChange}
                    />
                    {simpleMode ? null : (
                        <Select<StoryboardShotDuration>
                            className="min-w-24"
                            size="small"
                            value={shotDuration}
                            disabled={node.metadata?.status === "loading"}
                            options={[
                                { value: "auto", label: t("scriptNode.autoDuration") },
                                { value: "4", label: t("scriptNode.perShot", { seconds: 4 }) },
                                { value: "5", label: t("scriptNode.perShot", { seconds: 5 }) },
                                { value: "10", label: t("scriptNode.perShot", { seconds: 10 }) },
                                { value: "15", label: t("scriptNode.perShot", { seconds: 15 }) },
                                { value: "30", label: t("scriptNode.perShot", { seconds: 30 }) },
                            ]}
                            popupMatchSelectWidth={false}
                            onChange={onShotDurationChange}
                        />
                    )}
                    <Button
                        shape="circle"
                        data-canvas-tour="script-generate"
                        icon={<Send className="size-4" />}
                        aria-label={t("scriptNode.generateScript")}
                        title={t("scriptNode.generateScript")}
                        disabled={!prompt.trim() || node.metadata?.status === "loading"}
                        loading={node.metadata?.status === "loading"}
                        style={{ background: theme.toolbar.itemHover, borderColor: theme.node.stroke, color: theme.node.text }}
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={submitPrompt}
                    />
                </div>
                <RowHandle
                    nodeId={node.id}
                    handleId="storyboard:context"
                    side="left"
                    top={composerHeight / 2}
                    scale={scale}
                    tone="idle"
                    theme={theme}
                    title={t("scriptNode.connectContext")}
                    onPointerDown={(event) => onConnectStart(event, "context", "target")}
                />
            </div>
            {rows.map((row, index) => {
                const top = STORYBOARD_HEADER_HEIGHT + index * STORYBOARD_ROW_HEIGHT + STORYBOARD_ROW_HEIGHT / 2 - scrollTop;
                if (top < STORYBOARD_HEADER_HEIGHT + 4 || top > STORYBOARD_HEADER_HEIGHT + tableHeight - 4) return null;
                return (
                    <div key={`ports-${row.id}`}>
                        <RowHandle
                            nodeId={node.id}
                            handleId={`row:${row.id}`}
                            side="left"
                            top={top}
                            scale={scale}
                            tone={batchItemTone(batchItemByRowId.get(row.id)) || row.status}
                            theme={theme}
                            onPointerDown={(event) => onConnectStart(event, row.id, "target")}
                        />
                        <RowHandle
                            nodeId={node.id}
                            handleId={`row:${row.id}`}
                            side="right"
                            top={top}
                            scale={scale}
                            tone={batchItemTone(batchItemByRowId.get(row.id)) || row.status}
                            theme={theme}
                            onPointerDown={(event) => onConnectStart(event, row.id, "source")}
                        />
                    </div>
                );
            })}
        </div>
    );
}

function storyboardStepState(stage: StoryboardPipelineStage): "done" | "current" | "error" | "idle" {
    if (stage.failed > 0 && stage.success === 0) return "error";
    if (stage.success > 0) return "done";
    if (stage.loading > 0 || stage.incomplete > 0) return "current";
    return "idle";
}

function StoryboardMiniPipeline({ pipeline, theme, rows }: { pipeline: CanvasStoryboardPipelineProgress; theme: (typeof canvasThemes)[keyof typeof canvasThemes]; rows: StoryboardRow[] }) {
    const { t, number } = useI18n();
    const steps: Array<{ key: string; label: string; state: "done" | "current" | "error" | "idle"; hint: string }> = [
        { key: "script", label: t("scriptNode.pipelineScript"), state: rows.length > 0 ? "done" : "idle", hint: rows.length > 0 ? t("scriptNode.shotCount", { count: rows.length }) : t("scriptNode.awaitShots") },
        { key: "images", label: t("scriptNode.pipelineImages"), state: storyboardStepState(pipeline.images), hint: localizedPipelineStatus(pipeline.images, t, number) },
        { key: "videos", label: t("scriptNode.pipelineVideos"), state: storyboardStepState(pipeline.videos), hint: localizedPipelineStatus(pipeline.videos, t, number) },
        {
            key: "final",
            label: t("scriptNode.pipelineFinal"),
            state: pipeline.final.success > 0 ? "done" : pipeline.final.failed > 0 ? "error" : pipeline.final.loading > 0 || pipeline.successfulVideoNodeIds.length >= 2 ? "current" : "idle",
            hint: localizedPipelineStatus(pipeline.final, t, number),
        },
    ];
    return (
        <div
            data-canvas-tour="script-pipeline"
            className="flex h-9 shrink-0 items-center justify-center overflow-hidden border-b px-4"
            style={{ borderColor: theme.node.stroke, background: theme.node.fill }}
            onMouseDown={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
        >
            {steps.map((step, index) => (
                <Fragment key={step.key}>
                    {index > 0 ? <span className="mx-2.5 h-px min-w-3.5 flex-1 max-w-20" style={{ background: theme.node.stroke }} /> : null}
                    <span
                        className="flex items-center gap-1.5 whitespace-nowrap text-[var(--fs-tiny)]"
                        title={step.hint}
                        style={{
                            color: step.state === "done" ? theme.node.muted : step.state === "current" ? theme.accent.primary : step.state === "error" ? theme.accent.danger : theme.node.faint,
                            fontWeight: step.state === "current" || step.state === "error" ? 700 : 500,
                        }}
                    >
                        <span
                            className="size-2 shrink-0 rounded-full"
                            style={{
                                background: step.state === "done" ? theme.node.activeStroke : step.state === "current" ? theme.accent.primary : step.state === "error" ? theme.accent.danger : theme.node.stroke,
                                boxShadow: step.state === "current" ? `0 0 0 3px ${theme.accent.primarySoft}` : undefined,
                            }}
                        />
                        {step.label}
                    </span>
                </Fragment>
            ))}
        </div>
    );
}

function GenerationBatchDetails({ batch, rows, nodes, onRetryItem }: { batch: CanvasGenerationBatch; rows: StoryboardRow[]; nodes: CanvasNodeData[]; onRetryItem: (itemId: string) => void }) {
    const { t } = useI18n();
    const { editGeneration } = useCanvasNodeActions();
    const shotByRowId = new Map(rows.map((row) => [row.id, row.shotNumber]));
    return (
        <div className="w-80" onMouseDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">{t("scriptNode.batchDetailsTitle", { mode: generationBatchModeLabel(t, batch) })}</span>
                <span className="text-xs text-foreground/50">{t("scriptNode.itemCount", { count: batch.items.length })}</span>
            </div>
            <div className="thin-scrollbar max-h-72 overflow-y-auto">
                {batch.items.map((item) => {
                    if (item.status === "failed") {
                        const target = nodes.find((node) => node.id === item.nodeId);
                        const edit = (field: "prompt" | "reference" | "model" | "parameters") => target && editGeneration?.(target, field);
                        return (
                            <div key={item.id} className="py-1.5">
                                <span className="text-xs font-medium">{t("scriptNode.shotLabel", { shot: shotByRowId.get(item.rowId) || "--" })}</span>
                                <GenerationErrorCard
                                    compact
                                    error={{ ...item, ...target?.metadata, taskId: item.taskId, billing: target?.metadata?.taskBilling || item.taskBilling }}
                                    onRetry={() => onRetryItem(item.id)}
                                    actions={{ prompt: () => edit("prompt"), reference: () => edit("reference"), model: () => edit("model"), parameters: () => edit("parameters") }}
                                />
                            </div>
                        );
                    }
                    return (
                        <div key={item.id} className="flex min-h-9 items-center gap-2 border-t border-foreground/10 py-1.5 first:border-t-0">
                            <span className="w-14 shrink-0 text-xs font-medium">{t("scriptNode.shotLabel", { shot: shotByRowId.get(item.rowId) || "--" })}</span>
                            <span className="min-w-0 flex-1 truncate text-xs text-foreground/60" title={item.errorDetails ? localizedGenerationError(item.errorDetails, t) : undefined}>
                                {generationBatchItemLabel(t, item)}
                                {item.retryCount ? ` · ${t("scriptNode.retryCount", { count: item.retryCount })}` : ""}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function generationBatchModeLabel(t: (key: MessageKey, values?: Record<string, string | number>) => string, batch: CanvasGenerationBatch) {
    return batch.mode === "storyboard_video" ? t("scriptNode.modeVideo") : batch.mode === "storyboard_image" ? t("scriptNode.modeImage") : t("scriptNode.modeActionBoard");
}

export function generationBatchSummary(t: (key: MessageKey, values?: Record<string, string | number>) => string, batch: CanvasGenerationBatch) {
    const count = (status: CanvasGenerationBatchItemStatus) => batch.items.filter((item) => item.status === status).length;
    const generating = count("submitting") + count("queued") + count("running");
    const stopped = count("cancelled");
    const stateKey: MessageKey = batch.status === "completed" ? "scriptNode.batchDone" : batch.status === "cancelled" ? "scriptNode.batchStopped" : "scriptNode.batchRunning";
    const summaryKey: MessageKey = stopped ? "scriptNode.batchSummaryStopped" : "scriptNode.batchSummary";
    return t(summaryKey, {
        mode: generationBatchModeLabel(t, batch),
        state: t(stateKey),
        succeeded: count("succeeded"),
        total: batch.items.length,
        failed: count("failed"),
        generating,
        waiting: count("waiting"),
        stopped,
    });
}

export function generationBatchItemLabel(t: (key: MessageKey, values?: Record<string, string | number>) => string, item: CanvasGenerationBatchItem) {
    if (item.costUncertain) return t("scriptBatch.costUncertain");
    if (isContentModerationError(item.errorDetails)) return t("scriptBatch.moderation");
    const keys: Record<CanvasGenerationBatchItemStatus, MessageKey> = {
        waiting: "canvasBatchTable.state.waiting",
        submitting: "canvasBatchTable.state.submitting",
        queued: "canvasBatchTable.state.queued",
        running: "canvasBatchTable.state.running",
        succeeded: "scriptNode.statusSucceeded",
        failed: "canvasBatchTable.state.failed",
        cancelled: "canvasBatchTable.state.stopped",
    };
    return t(keys[item.status]);
}

function batchItemTone(item?: CanvasGenerationBatchItem): CanvasNodeStatus | undefined {
    if (!item) return undefined;
    if (item.status === "succeeded") return "success";
    if (item.status === "failed" || item.status === "cancelled") return "error";
    if (item.status === "waiting") return "idle";
    return "loading";
}

type InlineRowActions = Pick<React.ComponentProps<typeof CanvasScriptNodeContent>, "onUpdateRow" | "onEditAssets" | "onCreateImageNodes" | "onCreatePrevis" | "onRemoveRow">;
type InlineRowProps = InlineRowActions & {
    nodeId: string;
    row: StoryboardRow;
    index: number;
    nodes: CanvasNodeData[];
    loading: boolean;
    locked?: boolean;
    canRemove: boolean;
    batchItem?: NonNullable<React.ComponentProps<typeof CanvasScriptNodeContent>["batch"]>["items"][number];
};

const StoryboardInlineRow = memo(
    function StoryboardInlineRow({ nodeId, row, index, nodes, loading, locked, canRemove, batchItem, onUpdateRow, onEditAssets, onCreateImageNodes, onCreatePrevis, onRemoveRow }: InlineRowProps) {
        const { t } = useI18n();
        const theme = canvasThemes[useActiveTheme()];
        return (
            <div data-canvas-tour={index === 0 ? "script-first-shot" : undefined} className="relative grid border-b" style={{ height: STORYBOARD_ROW_HEIGHT, borderColor: theme.node.stroke, gridTemplateColumns: SCRIPT_GRID_TEMPLATE }}>
                <div className="flex flex-col items-center justify-center gap-0.5 border-r tabular-nums" style={{ color: theme.node.muted, borderColor: theme.node.stroke }}>
                    <div className="flex items-center gap-0.5">
                        <Dropdown
                            trigger={["click"]}
                            menu={{
                                items: [
                                    {
                                        key: "image",
                                        label: <span data-canvas-tour="shot-create-image">{t("coach.createShotImage")}</span>,
                                        disabled: loading || !(row.imageGenerationPrompt || row.plotDescription).trim(),
                                        onClick: () => onCreateImageNodes([row.id]),
                                    },
                                    { key: "previs", label: t("directorD4.create"), disabled: !onCreatePrevis, onClick: () => onCreatePrevis?.(row.id) },
                                    { key: "delete", label: t("scriptNode.deleteShot"), icon: <Trash2 className="size-3.5" />, danger: true, disabled: !canRemove, onClick: () => onRemoveRow(row.id) },
                                ],
                            }}
                        >
                            <button
                                type="button"
                                className="flex h-5 min-w-5 items-center justify-center gap-0.5 rounded outline-none transition hover:bg-black/5 focus-visible:ring-2 dark:hover:bg-white/10"
                                data-shot-actions
                                aria-label={t("scriptNode.shotActions", { shot: row.shotNumber })}
                                onMouseDown={(event) => event.stopPropagation()}
                                onPointerDown={(event) => event.stopPropagation()}
                                onClick={(event) => event.stopPropagation()}
                            >
                                <span className="text-sm">{row.shotNumber}</span>
                                <MoreHorizontal className="size-3 opacity-45" />
                            </button>
                        </Dropdown>
                    </div>
                    {batchItem ? (
                        <span className="max-w-14 truncate text-[var(--fs-micro)] leading-3" title={generationBatchItemLabel(t, batchItem!)}>
                            {generationBatchItemLabel(t, batchItem!)}
                        </span>
                    ) : null}
                </div>
                <CompactDurationInput value={row.durationSeconds} borderColor={theme.node.stroke} onChange={(durationSeconds) => onUpdateRow(row.id, { durationSeconds })} />
                <CompactInput
                    draftIdentity={{ nodeId, rowId: row.id, field: "videoMotionPrompt" }}
                    value={row.videoMotionPrompt}
                    placeholder={t("scriptNode.motionPlaceholder")}
                    onChange={(value) => onUpdateRow(row.id, { videoMotionPrompt: value })}
                    borderColor={theme.node.stroke}
                />
                <CompactInput
                    draftIdentity={{ nodeId, rowId: row.id, field: "dialogue" }}
                    value={row.dialogue}
                    placeholder={t("scriptNode.dialoguePlaceholder")}
                    onChange={(value) => onUpdateRow(row.id, { dialogue: value })}
                    borderColor={theme.node.stroke}
                />
                <div className="flex h-full min-w-0 items-center px-3">
                    <StoryboardAssetsCell bindings={row.assetBindings || []} nodes={nodes} onEdit={() => onEditAssets(row.id)} disabled={locked} />
                </div>
            </div>
        );
    },
    (previous, next) => {
        if (Object.keys(previous).some((key) => key !== "nodes" && previous[key as keyof InlineRowProps] !== next[key as keyof InlineRowProps])) return false;
        return (next.row.assetBindings || []).every((binding) => previous.nodes.find((node) => node.id === binding.nodeId) === next.nodes.find((node) => node.id === binding.nodeId));
    },
);

export function StoryboardTextInput({
    value,
    placeholder,
    borderColor,
    onChange,
    draftIdentity,
    disabled,
    ariaLabel,
}: {
    value: string;
    placeholder: string;
    borderColor?: string;
    onChange: (value: string) => void;
    draftIdentity?: { nodeId: string; rowId: string; field: StoryboardColumn };
    disabled?: boolean;
    ariaLabel?: string;
}) {
    const { id: canvasId } = useParams();
    const edit = useCanvasTextEdit(value, onChange, true);
    const events = {
        disabled,
        "aria-label": ariaLabel,
        value: edit.value,
        placeholder,
        onFocus: edit.onFocus,
        onBlur: edit.onBlur,
        onCompositionStart: edit.onCompositionStart,
        onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => {
            const next = event.target.value;
            if (canvasId && draftIdentity) checkpointCanvasStoryboardInput(canvasId, draftIdentity.nodeId, draftIdentity.rowId, draftIdentity.field, next);
            edit.onChange(next);
        },
    };
    // Native sizing avoids autoSize's hidden textarea writes and synchronous
    // scrollHeight reads on every key. Unsupported browsers keep four rows.
    if (!borderColor) return <Input.TextArea {...events} rows={4} style={{ fieldSizing: "content", minHeight: "calc(1lh + 2 * var(--space-1) + 2px)", maxHeight: "calc(4lh + 2 * var(--space-1) + 2px)" }} />;
    return (
        <textarea
            {...events}
            className="thin-scrollbar h-full w-full resize-none overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words border-r bg-transparent px-4 py-2.5 text-xs leading-5 outline-none transition placeholder:opacity-35 focus:bg-black/[0.02] dark:focus:bg-white/[0.025]"
            style={{ borderColor }}
            onMouseDown={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
        />
    );
}

const CompactInput = StoryboardTextInput;

function CompactDurationInput({ value, borderColor, onChange }: { value: number; borderColor: string; onChange: (value: number) => void }) {
    const { t } = useI18n();
    return (
        <label className="flex h-full items-center justify-center gap-1 border-r text-xs tabular-nums text-foreground/60" style={{ borderColor }}>
            <input
                type="number"
                min={1}
                max={60}
                value={value}
                className="w-9 bg-transparent text-right outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                aria-label={t("scriptEditor.durationAria")}
                onChange={(event) => onChange(Math.max(1, Math.min(60, Number(event.target.value) || 1)))}
                onMouseDown={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
            />
            {t("scriptEditor.seconds")}
        </label>
    );
}

function HeaderCell({ children, borderColor, align = "left" }: { children: ReactNode; borderColor: string; align?: "left" | "center" }) {
    return (
        <span className={`flex h-full items-center border-r px-4 ${align === "center" ? "justify-center text-center" : "justify-start"}`} style={{ borderColor }}>
            {children}
        </span>
    );
}

function RowHandle({
    nodeId,
    handleId,
    side,
    top,
    scale,
    tone,
    theme,
    title,
    onPointerDown,
}: {
    nodeId: string;
    handleId: string;
    side: "left" | "right";
    top: number;
    scale: number;
    tone?: StoryboardRow["status"];
    theme: (typeof canvasThemes)[keyof typeof canvasThemes];
    title?: string;
    onPointerDown: (event: ReactPointerEvent) => void;
}) {
    const color = tone === "loading" ? theme.accent.primary : tone === "error" ? theme.accent.danger : tone === "success" ? theme.node.activeStroke : theme.node.muted;
    const inverseHitScale = 1 / Math.max(scale, 0.05);
    const { t } = useI18n();
    return (
        <button
            type="button"
            data-storyboard-node-id={nodeId}
            data-storyboard-handle-id={handleId}
            aria-label={title || t("scriptNode.input")}
            title={title || t("scriptNode.reference")}
            className={`canvas-connection-handle absolute z-[var(--node-z-handle)] flex -translate-y-1/2 cursor-pointer items-center justify-center rounded-full outline-none focus-visible:ring-2 ${side === "left" ? "left-0 -translate-x-1/2" : "right-0 translate-x-1/2"}`}
            style={{ top, width: 32 * inverseHitScale, height: 32 * inverseHitScale, "--tw-ring-color": theme.accent.primary } as CSSProperties}
            onPointerDown={onPointerDown}
        >
            <span className="block size-2.5 rounded-full border-2 shadow-sm transition-transform hover:scale-110" style={{ boxSizing: "border-box", borderColor: theme.node.panel, background: color }} />
        </button>
    );
}
