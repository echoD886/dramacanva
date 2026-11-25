import { clearShownProgress, nextProgress } from "@/lib/generation-progress";
import { CanvasNodeStarterHints } from "./canvas-node-starter-hints";
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ComponentProps, type CSSProperties, type ReactNode, type RefObject } from "react";
import { CanvasReadonlyNodeContent } from "./canvas-readonly-node-content";
import { useResourceDelivery } from "@/hooks/use-resource-delivery";
import "./canvas-readonly-node-content.css";
import { deferredCanvasComponent } from "./deferred-canvas-component";
import { localizedCanvasNodeTitle } from "@/i18n/canvas-node-label";
import { idleTaskTickerSubscribe, subscribeTaskTicker, taskTickerSnapshot } from "@/lib/canvas/task-ticker";
import { AlertCircle, BookOpenCheck, Clock3, Download, FileText, Image as ImageIcon, LoaderCircle, Music2, Pencil, Play, RefreshCw, Video } from "lucide-react";

import { VideoPlayer } from "@/components/video-player";
import { GenerationErrorCard } from "@/components/generation-error-card";
import { AIMessageMarkdown } from "@/components/ai/ai-message-markdown";
import { CONTENT_MODERATION_ERROR_CODE, isContentModerationError, isInsufficientCreditsError } from "@/lib/generation-error";
import { generationPhase, generationTaskShowsProgress, isGenerationTaskSubmissionUncertain } from "@/lib/generation-task-display";
import { GenerationPhaseSteps } from "@/components/ai/generation-phase-steps";
import type { CanvasNodeRenderLOD } from "@/lib/canvas/canvas-node-lod";
import { CachedResourceImage, CreativePreviewImage } from "@/components/cached-resource-image";
const RichTextNodeContent = deferredCanvasComponent<import("react").ComponentProps<(typeof import("./nodes/rich-text-node"))["RichTextNodeContent"]>>(() => import("./nodes/rich-text-node").then((m) => ({ default: m.RichTextNodeContent })));
import { fitNodeSize } from "@/lib/canvas/canvas-node-size";
import { loadCanvasDrawingPreview } from "@/lib/canvas/canvas-drawing-storage";
import { canvasNodeVideoPlayback, canvasNodeVideoPreviewUrl } from "@/lib/canvas/canvas-media-preview";
import { bindCanvasVideoHoverPreview } from "@/lib/canvas/canvas-video-hover-preview";
import { buildLibTVImagePreviewUrl, buildLibTVVideoSourceUrl } from "@/lib/canvas/libtv-import";
import type { CanvasResourceReference } from "@/lib/canvas/canvas-resource-references";
import type { CanvasTheme } from "@/lib/canvas-theme";
import { formatBytes } from "@/lib/image-utils";
import { resourceFileUrl, resourceIdFromStorageKey } from "@/services/api/resources";
import type { GenerationTask } from "@/services/api/task-center";
import { cacheResourceObjectUrl, getCachedResourceObjectUrl, peekCachedResourceObjectUrl, scheduleResourceBlobCache } from "@/services/resource-blob-cache";
import { resolveMediaUrl } from "@/services/file-storage";
import { hydrateCanvasVideoPreview } from "@/services/canvas-video-preview";
import { CanvasNodeType, type CanvasNodeData } from "@/types/canvas";
import { useI18n } from "@/i18n/use-i18n";
import { localizedGenerationTaskStage, localizedGenerationTaskStatus } from "@/i18n/generation-task";
import { localizedGenerationError } from "@/i18n/generation-error";
import { getNodeDefinition } from "@/lib/canvas/node-registry";
import { ART_CRITIQUE_NODE_TYPE } from "@/lib/art-critique/contracts";
import { createDefaultSubtitleStyle } from "@/types/timeline";
import { CanvasResourceMentionTextarea } from "./canvas-resource-mention-textarea";
import { finishCanvasTextEdit, queueCanvasTextEdit } from "@/services/canvas-text-edits";
import { CanvasAudioPlayer } from "./canvas-audio-player";
import { useCanvasNodeActions } from "./canvas-node-action-context";
import { CanvasSubtitleOverlay } from "./canvas-subtitle-overlay";
import { CanvasFileUploadContent } from "./canvas-file-upload-content";
const MarkdownNodeContent = deferredCanvasComponent<import("react").ComponentProps<(typeof import("./nodes/markdown-node"))["MarkdownNodeContent"]>>(() => import("./nodes/markdown-node").then((m) => ({ default: m.MarkdownNodeContent })));
const ChartNodeContent = deferredCanvasComponent<import("react").ComponentProps<(typeof import("./nodes/chart-node"))["ChartNodeContent"]>>(() => import("./nodes/chart-node").then((m) => ({ default: m.ChartNodeContent })));
import { CompareNodeContent } from "./nodes/compare-node";
const ColorGradeNodeContent = deferredCanvasComponent<import("react").ComponentProps<(typeof import("./nodes/color-grade-node"))["ColorGradeNodeContent"]>>(() => import("./nodes/color-grade-node").then((m) => ({ default: m.ColorGradeNodeContent })));
import { HtmlNodeContent } from "./nodes/html-node";
const PanoramaNodeContent = deferredCanvasComponent<import("react").ComponentProps<(typeof import("./nodes/panorama-node"))["PanoramaNodeContent"]>>(() => import("./nodes/panorama-node").then((m) => ({ default: m.PanoramaNodeContent })));
import { SvgNodeContent } from "./nodes/svg-node";
import { ArtCritiqueNodeContent } from "./nodes/ai-art-critique-node";
const MediaConversionNodeContent = deferredCanvasComponent<import("react").ComponentProps<(typeof import("./nodes/media-conversion-node"))["MediaConversionNodeContent"]>>(() =>
    import("./nodes/media-conversion-node").then((m) => ({ default: m.MediaConversionNodeContent })),
);
import { MEDIA_CONVERSION_NODE_TYPE } from "@/lib/media-conversion/contracts";
const PortraitClearanceNodeContent = deferredCanvasComponent<import("react").ComponentProps<(typeof import("./nodes/portrait-clearance-node"))["PortraitClearanceNodeContent"]>>(() =>
    import("./nodes/portrait-clearance-node").then((m) => ({ default: m.PortraitClearanceNodeContent })),
);
import { PORTRAIT_CLEARANCE_NODE_TYPE } from "@/lib/portrait-clearance/contracts";

export type CanvasNodeContentProps = {
    node: CanvasNodeData;
    theme: CanvasTheme;
    renderLOD?: CanvasNodeRenderLOD;
    isEditingContent: boolean;
    textareaRef: RefObject<HTMLTextAreaElement | null>;
    isBatchRoot: boolean;
    batchCount: number;
    batchPreviewNodes?: CanvasNodeData[];
    batchExpanded: boolean;
    batchOpening: boolean;
    batchRecovering: boolean;
    renderNodeContent?: (node: CanvasNodeData) => ReactNode;
    drawingProjectId?: string;
    onContentChange: (nodeId: string, content: string) => void;
    onStopEditing: () => void;
    mentionReferences: CanvasResourceReference[];
    onRetry?: (node: CanvasNodeData) => void;
    onReloadResource?: (node: CanvasNodeData) => void;
    onOpenTaskDetails?: (node: CanvasNodeData) => void;
    onToggleBatch?: () => void;
    reduceMediaEffects?: boolean;
    mediaActive?: boolean;
    onMediaPlayRequest?: (nodeId: string) => void;
};

/**
 * 可能调用页面注入内容渲染器（renderNodeContent）的节点，与 CanvasNodeContent 的 hasCustomContent 保持一致。
 * 其余节点从不调用渲染器，画布层只把渲染器传给这些节点，避免渲染器引用变化让所有节点的 memo 失效。
 * story_input 在编辑态会改用普通文本编辑器，这里按“可能使用”保守返回 true。
 */
export function canvasNodeMayUseCustomContent(node: CanvasNodeData) {
    return (
        node.type === CanvasNodeType.Config ||
        node.type === CanvasNodeType.Script ||
        node.type === CanvasNodeType.BatchTable ||
        Boolean(node.metadata?.directorSceneId) ||
        (node.metadata?.workflowKind === "character" && Boolean(node.metadata.characterAssetId)) ||
        node.metadata?.workflowKind === "story_input" ||
        (node.metadata?.workflowKind === "styleboard" && !node.metadata.content)
    );
}

export function CanvasNodeContent(props: CanvasNodeContentProps) {
    // 导演节点有自己的缩放分级，概览态仍需保留当前帧和播放入口。
    if (props.renderLOD !== "shell" && props.node.metadata?.directorSceneId && props.renderNodeContent) return props.renderNodeContent(props.node);
    if (props.renderLOD === "shell") return <CanvasNodeShellContent node={props.node} theme={props.theme} />;
    if (props.renderLOD === "preview") return <CanvasNodePreviewContent node={props.node} theme={props.theme} />;
    if (props.node.metadata?.fileUpload) return <CanvasFileUploadContent node={props.node} theme={props.theme} reduceMotion={props.reduceMediaEffects} />;
    const hasCustomContent =
        props.node.type === CanvasNodeType.Config ||
        props.node.type === CanvasNodeType.Script ||
        props.node.type === CanvasNodeType.BatchTable ||
        Boolean(props.node.metadata?.directorSceneId) ||
        (props.node.metadata?.workflowKind === "character" && Boolean(props.node.metadata.characterAssetId)) ||
        (props.node.metadata?.workflowKind === "story_input" && !props.isEditingContent) ||
        (props.node.metadata?.workflowKind === "styleboard" && !props.node.metadata.content);
    if (hasCustomContent && props.renderNodeContent) return props.renderNodeContent(props.node);
    if (props.node.type === ART_CRITIQUE_NODE_TYPE) return <ArtCritiqueNodeContent node={props.node} />;
    if (props.node.type === PORTRAIT_CLEARANCE_NODE_TYPE) return <PortraitClearanceNodeContent node={props.node} />;
    if (props.node.type === MEDIA_CONVERSION_NODE_TYPE) return <MediaConversionNodeContent node={props.node} theme={props.theme} />;
    if (props.isBatchRoot) return <ImageNodeContent {...props} />;
    if (props.node.metadata?.status === "loading") return <LoadingContent node={props.node} theme={props.theme} onOpenTaskDetails={props.onOpenTaskDetails} />;
    if (props.node.metadata?.status === "error") return <ErrorContent node={props.node} theme={props.theme} onRetry={props.onRetry} onReloadResource={props.onReloadResource} />;

    const pluginDefinition = getNodeDefinition(props.node.type)?.plugin;
    if (pluginDefinition) return <PluginCanvasNodeContent {...props} renderer={pluginDefinition.renderer} schema={pluginDefinition.schema} />;
    const Renderer = nodeContentRenderers[props.node.type];
    return Renderer ? <Renderer {...props} /> : <UnknownNodeContent theme={props.theme} />;
}

function CanvasNodeShellContent({ node, theme }: { node: CanvasNodeData; theme: CanvasTheme }) {
    const { t } = useI18n();
    const Icon = node.type === CanvasNodeType.Video ? Video : node.type === CanvasNodeType.Audio ? Music2 : node.type === CanvasNodeType.Image ? ImageIcon : FileText;
    return (
        <div className="flex size-full flex-col items-center justify-center gap-2 rounded-[var(--node-radius)] px-3 text-center" style={{ background: theme.node.fill, color: theme.node.muted }}>
            <Icon className="size-6 opacity-40" />
            <span className="max-w-full truncate text-xs font-medium" title={localizedCanvasNodeTitle(node, t)}>
                {localizedCanvasNodeTitle(node, t) || t("nodeContent.shellNode")}
            </span>
        </div>
    );
}

const CanvasNodePreviewContent = CanvasReadonlyNodeContent;

function PluginCanvasNodeContent({ node, theme, renderer, schema }: CanvasNodeContentProps & { renderer: "declarative" | "sandbox"; schema: Record<string, unknown> }) {
    const { t } = useI18n();
    if (renderer === "sandbox") {
        return (
            <div className="flex h-full w-full items-center justify-center p-4 text-center text-xs" style={{ color: theme.node.placeholder }}>
                {t("nodeContent.pluginWaiting")}
            </div>
        );
    }
    const data = node.metadata?.pluginData || {};
    const fields = Object.keys(schema.properties && typeof schema.properties === "object" ? (schema.properties as Record<string, unknown>) : schema);
    return (
        <div className="flex h-full w-full flex-col gap-3 overflow-auto p-4 pt-10 text-xs" style={{ color: theme.node.text }}>
            {fields.length ? (
                fields.map((field) => (
                    <div key={field} className="flex flex-col gap-1">
                        <span className="font-medium opacity-60">{field}</span>
                        <span className="whitespace-pre-wrap break-words opacity-90">{formatPluginValue(data[field] ?? (field === "content" ? node.metadata?.content : undefined), t("nodeContent.unset"))}</span>
                    </div>
                ))
            ) : (
                <span className="whitespace-pre-wrap break-words">{node.metadata?.content || t("nodeContent.plugin")}</span>
            )}
        </div>
    );
}

function formatPluginValue(value: unknown, emptyLabel: string) {
    if (value === undefined || value === null || value === "") return emptyLabel;
    return typeof value === "string" ? value : JSON.stringify(value);
}

const nodeContentRenderers: Partial<Record<string, (props: CanvasNodeContentProps) => ReactNode>> = {
    [CanvasNodeType.Text]: TextContent,
    [CanvasNodeType.Script]: UnknownNodeContent,
    [CanvasNodeType.Skill]: SkillContent,
    [CanvasNodeType.Image]: ImageNodeContent,
    [CanvasNodeType.Config]: EmptyImageContent,
    [CanvasNodeType.Video]: VideoNodeContent,
    [CanvasNodeType.Audio]: AudioNodeContent,
    [CanvasNodeType.Drawing]: DrawingContent,
    [CanvasNodeType.Frame]: UnknownNodeContent,
    [CanvasNodeType.Markdown]: MarkdownNodeContent,
    [CanvasNodeType.Svg]: SvgNodeContent,
    [CanvasNodeType.Html]: HtmlNodeContent,
    [CanvasNodeType.Panorama]: PanoramaNodeContent,
    [CanvasNodeType.Compare]: CompareNodeContent,
    [CanvasNodeType.Chart]: ChartNodeContent,
    [CanvasNodeType.ColorGrade]: ColorGradeNodeContent,
};

function DrawingContent({ node, theme, drawingProjectId }: CanvasNodeContentProps) {
    const { t, number } = useI18n();
    const shapeCount = node.metadata?.drawingShapeCount || 0;
    const pageCount = node.metadata?.drawingPageCount || 1;
    const [previewUrl, setPreviewUrl] = useState(node.metadata?.drawingPreviewUrl || "");

    useEffect(() => {
        const drawingId = node.metadata?.drawingId;
        const fallbackPreview = node.metadata?.drawingPreviewUrl || "";
        setPreviewUrl(fallbackPreview);
        if (!drawingProjectId || !drawingId) return;
        let active = true;
        let objectUrl = "";
        void loadCanvasDrawingPreview(drawingProjectId, drawingId)
            .then((preview) => {
                if (!active) return;
                if (!preview) {
                    setPreviewUrl(fallbackPreview);
                    return;
                }
                objectUrl = URL.createObjectURL(preview);
                setPreviewUrl(objectUrl);
            })
            .catch((error) => console.warn("读取绘图节点预览失败", error));
        return () => {
            active = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [drawingProjectId, node.metadata?.drawingId, node.metadata?.drawingPreviewUrl, node.metadata?.drawingRevision]);

    return (
        <div className="relative h-full w-full overflow-hidden" style={{ background: theme.node.panel, color: theme.node.text }}>
            {previewUrl ? (
                <img src={previewUrl} alt={t("nodeContent.drawingPreview")} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
            ) : (
                <div className="absolute inset-0 grid place-items-center" style={{ background: theme.node.panel, backgroundImage: `radial-gradient(circle, ${theme.node.stroke} 1px, transparent 1px)`, backgroundSize: "18px 18px" }}>
                    <div className="flex flex-col items-center gap-2 rounded-[var(--r-lg)] px-4 py-3" style={{ border: `1px solid ${theme.node.edge}`, background: theme.node.fill, color: theme.node.muted }}>
                        <span className="grid size-10 place-items-center rounded-[var(--r-md)]" style={{ background: theme.toolbar.panel, border: `1px solid ${theme.node.edge}`, color: theme.node.text }}>
                            <Pencil className="size-5" />
                        </span>
                        <span className="text-[var(--fs-tiny)] font-medium">{t("nodeContent.openDrawing")}</span>
                    </div>
                </div>
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 px-4 pb-3 pt-12" style={{ background: `linear-gradient(to top, ${theme.node.fill}, ${theme.node.fill}e6 55%, transparent)` }}>
                <div className="min-w-0">
                    <div className="truncate text-xs font-semibold" title={localizedCanvasNodeTitle(node, t)}>
                        {localizedCanvasNodeTitle(node, t)}
                    </div>
                    <div className="mt-0.5 text-[var(--fs-tiny)]" style={{ color: theme.node.muted }}>
                        {t("nodeContent.drawingCounts", { shapes: number(shapeCount), pages: number(pageCount) })}
                    </div>
                </div>
                <Pencil className="size-3.5 shrink-0" style={{ color: theme.accent.primary }} />
            </div>
        </div>
    );
}

// Nodes seen generating in this session; only these get the "keep progress until the media is painted" handoff.
const watchedGeneratingNodes = new Set<string>();
const canvasProgressKey = (node: CanvasNodeData) => `canvas:${node.id}:${node.metadata?.taskId || "new"}`;

function LoadingContent({ node, theme, onOpenTaskDetails, finishing }: Pick<CanvasNodeContentProps, "node" | "theme" | "onOpenTaskDetails"> & { finishing?: "pending" | "done" }) {
    const { t } = useI18n();
    const taskId = node.metadata?.taskId;
    if (!finishing) watchedGeneratingNodes.add(node.id);
    const displayTask = {
        provider: node.metadata?.taskProvider,
        status: (finishing ? "running" : node.metadata?.taskStatus || "running") as GenerationTask["status"],
        stage: node.metadata?.taskStage,
        officialStatus: node.metadata?.taskOfficialStatus,
        errorCode: node.metadata?.taskErrorCode,
    };
    const submissionUncertain = Boolean(taskId) && isGenerationTaskSubmissionUncertain(displayTask);
    const phase = finishing === "done" ? 3 : finishing ? 2 : generationPhase({ ...displayTask, mediaStage: node.metadata?.taskMediaStage });
    const reported = node.metadata?.taskProgress;
    const showsProgress = node.type !== CanvasNodeType.Video && Boolean(taskId) && generationTaskShowsProgress(displayTask);
    const progress = phase === 1 && showsProgress && typeof reported === "number" && Number.isFinite(reported) ? nextProgress(canvasProgressKey(node), 0, 1, reported) : null;
    const stageLabel = submissionUncertain ? localizedGenerationTaskStage(displayTask, t) : !taskId ? t("generationTask.creating") : "";
    const elapsed = useTaskElapsed(node.metadata?.taskCreatedAt);
    return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2.5 px-5 text-center" style={{ color: theme.node.activeStroke }}>
            {submissionUncertain ? <AlertCircle className="size-10" /> : <div className="size-10 animate-spin rounded-full border-2" style={{ borderColor: theme.node.stroke, borderTopColor: theme.node.activeStroke }} />}
            {stageLabel ? <span className="text-[var(--fs-tiny)] font-semibold">{stageLabel}</span> : null}
            {taskId ? (
                <div className="flex w-full max-w-[210px] flex-col items-center gap-1.5">
                    {!submissionUncertain ? (
                        <GenerationPhaseSteps step={phase} progress={phase === 1 ? progress : null} style={{ "--gen-steps-track": theme.node.stroke, "--gen-steps-fill": theme.node.activeStroke, color: theme.node.text } as CSSProperties} />
                    ) : null}
                    <div className="max-w-full truncate text-[var(--fs-tiny)] tabular-nums" style={{ color: theme.node.muted }}>
                        <Clock3 className="mr-1 inline size-3" />
                        {elapsed}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                        <button
                            type="button"
                            className="inline-flex h-7 items-center gap-1 rounded-[var(--r-sm)] px-2 text-[var(--fs-tiny)] font-medium transition-colors"
                            style={{ background: theme.toolbar.itemHover, color: theme.node.text }}
                            onMouseDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                                event.stopPropagation();
                                onOpenTaskDetails?.(node);
                            }}
                        >
                            <FileText className="size-3" />
                            {t("generationTask.details")}
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function useTaskElapsed(createdAt?: string) {
    const { t, number } = useI18n();
    // One shared clock for every running task instead of a timer per node.
    const now = useSyncExternalStore(createdAt ? subscribeTaskTicker : idleTaskTickerSubscribe, taskTickerSnapshot, taskTickerSnapshot);
    if (!createdAt) return t("generationTask.justNow");
    const started = new Date(createdAt).getTime();
    if (!Number.isFinite(started)) return t("generationTask.justNow");
    const seconds = Math.max(0, Math.floor((now - started) / 1000));
    if (seconds < 60) return t("generationTask.seconds", { seconds: number(seconds) });
    const minutes = Math.floor(seconds / 60);
    return minutes < 60 ? t("generationTask.minutes", { minutes: number(minutes), seconds: number(seconds % 60) }) : t("generationTask.hours", { hours: number(Math.floor(minutes / 60)), minutes: number(minutes % 60) });
}

function ErrorContent({ node, theme, onRetry, onReloadResource }: Pick<CanvasNodeContentProps, "node" | "theme" | "onRetry" | "onReloadResource">) {
    const { t } = useI18n();
    const { editGeneration, upload } = useCanvasNodeActions();
    const task = {
        provider: node.metadata?.taskProvider,
        status: (node.metadata?.taskStatus || "failed") as GenerationTask["status"],
        stage: node.metadata?.taskStage,
        officialStatus: node.metadata?.taskOfficialStatus,
        errorCode: node.metadata?.taskErrorCode,
    };
    if (isGenerationTaskSubmissionUncertain(task))
        return (
            <div className="px-5 text-center text-xs" style={{ color: theme.node.text }}>
                {localizedGenerationTaskStatus(task, t)}
                <div>{localizedGenerationTaskStage(task, t)}</div>
            </div>
        );
    return (
        <div className="generation-node-error">
            <GenerationErrorCard
                compact
                error={{ ...node.metadata, code: node.metadata?.taskErrorCode || node.metadata?.generationErrorCode, taskId: node.metadata?.taskId, billing: node.metadata?.taskBilling }}
                actions={{
                    prompt: () => editGeneration?.(node, "prompt"),
                    model: () => editGeneration?.(node, "model"),
                    parameters: () => editGeneration?.(node, "parameters"),
                    reference: () => (node.metadata?.fileUpload === "error" ? upload?.(node) : editGeneration?.(node, "reference")),
                }}
                onRetry={() => onRetry?.(node)}
            />
            {node.metadata?.resourceReloadAvailable ? (
                <button
                    type="button"
                    className="generation-error-resource-reload"
                    onClick={(event) => {
                        event.stopPropagation();
                        onReloadResource?.(node);
                    }}
                >
                    {t("generationTask.reload")}
                </button>
            ) : null}
        </div>
    );
}

function UnknownNodeContent({ theme }: Pick<CanvasNodeContentProps, "theme">) {
    const { t } = useI18n();
    return (
        <div className="flex h-full w-full items-center justify-center text-sm" style={{ color: theme.node.placeholder }}>
            {t("nodeContent.unknown")}
        </div>
    );
}

function TextContent({ node, theme, isEditingContent, textareaRef, mentionReferences, onContentChange, onStopEditing }: CanvasNodeContentProps) {
    const { t } = useI18n();
    const fontSize = node.metadata?.fontSize || 14;
    const textStyle = { fontSize: `${fontSize}px`, lineHeight: `${Math.round(fontSize * 1.65)}px`, color: theme.node.text, boxSizing: "border-box" } as CSSProperties;
    if (node.metadata?.richText && !isEditingContent) return <RichTextNodeContent node={node} theme={theme} />;

    return (
        <div className="flex h-full w-full flex-col overflow-hidden pt-10">
            {isEditingContent ? (
                <BufferedTextNodeEditor
                    nodeId={node.id}
                    committedValue={node.metadata?.content || ""}
                    onCommit={onContentChange}
                    ref={textareaRef}
                    className="thin-scrollbar m-0 block h-full w-full resize-none appearance-none overflow-y-auto whitespace-pre-wrap break-words border-none bg-transparent px-4 pb-4 pt-0 font-mono outline-none select-text"
                    style={textStyle}
                    references={mentionReferences}
                    highlightLabels={false}
                    onBlur={onStopEditing}
                    onKeyDown={(event) => {
                        if (event.key === "Escape") onStopEditing();
                    }}
                    onMouseDown={(event) => event.stopPropagation()}
                    onPointerDown={(event) => event.stopPropagation()}
                    onWheel={(event) => event.stopPropagation()}
                />
            ) : (
                <div className="thin-scrollbar block h-full w-full select-text overflow-y-auto whitespace-pre-wrap break-words bg-transparent px-4 pb-4 pt-0 font-mono" style={textStyle} onWheel={(event) => event.stopPropagation()}>
                    {node.metadata?.content ? <AIMessageMarkdown>{node.metadata.content}</AIMessageMarkdown> : <span style={{ color: theme.node.placeholder }}>{t("nodeContent.editText")}</span>}
                </div>
            )}
        </div>
    );
}

export const TEXT_NODE_COMMIT_DELAY_MS = 120;

type BufferedTextNodeEditorProps = Omit<ComponentProps<typeof CanvasResourceMentionTextarea>, "value" | "onChange"> & {
    nodeId: string;
    committedValue: string;
    onCommit: (nodeId: string, value: string) => void;
};

/**
 * 文本节点编辑缓冲：按键只更新本地草稿，停顿 120ms、失焦或退出编辑时再写回画布。
 * 每次写回都会让整个画布页面（数百个节点的派生数据、面板、工具栏）重新计算；
 * 逐键写回在大画布上让每次按键都成为长任务。
 */
const BufferedTextNodeEditor = forwardRef<HTMLTextAreaElement, BufferedTextNodeEditorProps>(function BufferedTextNodeEditor({ nodeId, committedValue, onCommit, onBlur, ...props }, ref) {
    const [draft, setDraft] = useState(committedValue);
    const pendingRef = useRef<string | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const commitRef = useRef({ nodeId, onCommit });
    commitRef.current = { nodeId, onCommit };

    const flush = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = null;
        finishCanvasTextEdit(flush);
        const value = pendingRef.current;
        if (value === null) return;
        pendingRef.current = null;
        commitRef.current.onCommit(commitRef.current.nodeId, value);
    }, []);

    // 外部修改（撤销、Agent、协作刷新）在没有未写回草稿时同步进编辑器。
    useEffect(() => {
        if (pendingRef.current === null) setDraft(committedValue);
    }, [committedValue]);
    useEffect(() => flush, [flush]);

    return (
        <CanvasResourceMentionTextarea
            {...props}
            ref={ref}
            value={draft}
            onChange={(value) => {
                setDraft(value);
                pendingRef.current = value;
                queueCanvasTextEdit(flush);
                if (timerRef.current) clearTimeout(timerRef.current);
                timerRef.current = setTimeout(flush, TEXT_NODE_COMMIT_DELAY_MS);
            }}
            onBlur={(event) => {
                flush();
                onBlur?.(event);
            }}
        />
    );
});

function SkillContent({ node, theme }: CanvasNodeContentProps) {
    const { t } = useI18n();
    const skill = node.metadata?.skillSnapshot;
    const tags = skill?.tags?.slice(0, 4) || [];
    const template = skill?.template || node.metadata?.content || "";

    return (
        <div className="flex h-full w-full flex-col overflow-hidden p-4" style={{ color: theme.node.text }}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="grid size-8 shrink-0 place-items-center rounded-[var(--r-md)]" style={{ background: `${theme.node.activeStroke}18`, color: theme.node.activeStroke }}>
                            <BookOpenCheck className="size-4" />
                        </span>
                        <div className="min-w-0">
                            <div className="truncate text-sm font-semibold" title={skill?.name || localizedCanvasNodeTitle(node, t)}>
                                {skill?.name || localizedCanvasNodeTitle(node, t)}
                            </div>
                            <div className="mt-0.5 flex items-center gap-1.5 text-[var(--fs-label)]" style={{ color: theme.node.muted }}>
                                <span>{skillCategoryLabel(skill?.category, t)}</span>
                                <span>·</span>
                                <span>{skillOutputModeLabel(skill?.outputMode, t)}</span>
                                {skill?.version ? (
                                    <>
                                        <span>·</span>
                                        <span>v{skill.version}</span>
                                    </>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {skill?.description ? (
                <div className="mt-3 line-clamp-2 text-xs leading-5" style={{ color: theme.node.muted }}>
                    {skill.description}
                </div>
            ) : null}
            <div className="thin-scrollbar mt-3 min-h-0 flex-1 overflow-hidden rounded-[var(--r-md)] px-3 py-2 text-xs leading-5" style={{ background: theme.node.panel, color: theme.node.text }}>
                <div className="mb-1 font-semibold opacity-55">{t("nodeContent.template")}</div>
                <div className="line-clamp-4 whitespace-pre-wrap break-words">{template || t("nodeContent.noTemplate")}</div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
                {tags.length ? (
                    tags.map((tag) => (
                        <span key={tag} className="rounded-[var(--r-sm)] bg-black/5 px-1.5 py-0.5 text-[var(--fs-tiny)] dark:bg-white/6" style={{ color: theme.node.muted }}>
                            {tag}
                        </span>
                    ))
                ) : (
                    <span className="text-[var(--fs-label)]" style={{ color: theme.node.muted }}>
                        {t("nodeContent.skillConnect")}
                    </span>
                )}
            </div>
        </div>
    );
}

function skillCategoryLabel(category: string | undefined, t: ReturnType<typeof useI18n>["t"]) {
    if (category === "writing") return t("nodeContent.writing");
    if (category === "storyboard") return t("nodeContent.storyboard");
    if (category === "image") return t("nodeContent.imageGeneration");
    if (category === "video") return t("nodeContent.video");
    return t("nodeContent.general");
}

function skillOutputModeLabel(mode: string | undefined, t: ReturnType<typeof useI18n>["t"]) {
    if (mode === "json") return "JSON";
    if (mode === "image_prompt") return t("nodeContent.imagePrompt");
    if (mode === "workflow") return t("nodeContent.workflow");
    return t("nodeContent.text");
}

function ImageNodeContent(props: CanvasNodeContentProps) {
    if (!props.node.metadata?.content && props.isBatchRoot) {
        const content =
            props.node.metadata?.status === "loading" ? (
                <LoadingContent node={props.node} theme={props.theme} />
            ) : props.node.metadata?.status === "error" ? (
                <ErrorContent node={props.node} theme={props.theme} onRetry={props.onRetry} onReloadResource={props.onReloadResource} />
            ) : (
                <EmptyImageContent {...props} isBatchRoot={false} />
            );
        return (
            <BatchFrame
                batchPreviewNodes={props.batchPreviewNodes}
                batchCount={props.batchCount}
                batchExpanded={props.batchExpanded}
                batchOpening={props.batchOpening}
                batchRecovering={props.batchRecovering}
                theme={props.theme}
                onToggleBatch={props.onToggleBatch}
            >
                {content}
            </BatchFrame>
        );
    }
    if (!props.node.metadata?.content) return <EmptyImageContent {...props} />;
    return (
        <ImageContent
            batchPreviewNodes={props.batchPreviewNodes}
            node={props.node}
            theme={props.theme}
            isBatchRoot={props.isBatchRoot}
            batchCount={props.batchCount}
            batchExpanded={props.batchExpanded}
            batchOpening={props.batchOpening}
            batchRecovering={props.batchRecovering}
            onToggleBatch={props.onToggleBatch}
        />
    );
}

function EmptyImageContent({ node, theme, isBatchRoot, batchCount, batchPreviewNodes, batchExpanded, batchOpening, batchRecovering, onToggleBatch }: CanvasNodeContentProps) {
    const { t } = useI18n();
    if (node.metadata?.modelStarterKey) return <CanvasNodeStarterHints node={node} />;
    const isCharacterReference = node.metadata?.workflowKind === "character" && node.metadata?.characterView === "multi";
    const content = (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3" style={{ color: theme.node.placeholder }}>
            <div className="flex size-14 items-center justify-center rounded-[var(--r-lg)]" style={{ background: theme.toolbar.activeBg }}>
                <ImageIcon className="size-6 opacity-30" />
            </div>
            {isCharacterReference ? (
                <div className="max-w-[80%] text-center">
                    <div className="truncate text-xs font-medium" title={node.metadata?.characterName || node.title} style={{ color: theme.node.muted }}>
                        {node.metadata?.characterName || node.title}
                    </div>
                    <div className="mt-1 text-[var(--fs-tiny)] tracking-[0.12em] opacity-50">{t("nodeContent.multiView")}</div>
                </div>
            ) : (
                <span className="text-[var(--fs-tiny)] tracking-[0.18em] opacity-50">{t("nodeContent.emptyImage")}</span>
            )}
        </div>
    );
    if (isBatchRoot)
        return (
            <BatchFrame batchPreviewNodes={batchPreviewNodes} batchCount={batchCount} batchExpanded={batchExpanded} batchOpening={batchOpening} batchRecovering={batchRecovering} theme={theme} onToggleBatch={onToggleBatch}>
                {content}
            </BatchFrame>
        );
    return content;
}

function VideoNodeContent({ node, theme, mediaActive = false, onMediaPlayRequest }: CanvasNodeContentProps) {
    const { t } = useI18n();
    const playerBoxRef = useRef<HTMLDivElement>(null);
    const { updateMediaNode } = useCanvasNodeActions();
    const { url, loading } = useVideoPlaybackUrl(node, mediaActive);
    const subtitleEntries = node.metadata?.subtitleEntries || [];
    const subtitleStyle = node.metadata?.subtitleStyle || createDefaultSubtitleStyle();
    const [currentTimeMs, setCurrentTimeMs] = useState(0);
    const [videoSize, setVideoSize] = useState<{ width: number; height: number } | null>(null);

    useEffect(() => {
        const box = playerBoxRef.current;
        const video = box?.querySelector("video");
        if (!video) return;
        const handleLoadedMetadata = () => {
            if (video.videoWidth <= 0 || video.videoHeight <= 0) return;
            setVideoSize({ width: video.videoWidth, height: video.videoHeight });
            if (node.metadata?.naturalWidth !== video.videoWidth || node.metadata?.naturalHeight !== video.videoHeight) {
                updateMediaNode?.(node.id, (current) => ({ ...current, metadata: { ...current.metadata, naturalWidth: video.videoWidth, naturalHeight: video.videoHeight } }));
            }
        };
        video.addEventListener("loadedmetadata", handleLoadedMetadata);
        handleLoadedMetadata();
        if (!subtitleEntries.length) return () => video.removeEventListener("loadedmetadata", handleLoadedMetadata);
        const handleTimeUpdate = () => setCurrentTimeMs(Math.round(video.currentTime * 1000));
        video.addEventListener("timeupdate", handleTimeUpdate);
        return () => {
            video.removeEventListener("timeupdate", handleTimeUpdate);
            video.removeEventListener("loadedmetadata", handleLoadedMetadata);
        };
    }, [node.id, node.metadata?.naturalHeight, node.metadata?.naturalWidth, subtitleEntries.length, updateMediaNode, url]);

    if (!node.metadata?.content && node.metadata?.modelStarterKey) return <CanvasNodeStarterHints node={node} />;
    if (!node.metadata?.content) return <EmptyMediaContent icon={<Video className="size-7 opacity-35" />} label={t("nodeContent.emptyVideo")} color={theme.node.placeholder} />;
    if (!mediaActive) return <InactiveVideoPreview node={node} theme={theme} onPlay={() => onMediaPlayRequest?.(node.id)} />;
    if (!url && loading) return <InactiveVideoPreview node={node} theme={theme} onPlay={() => onMediaPlayRequest?.(node.id)} />;
    if (!url) return <MediaLoadingState icon={<AlertCircle className="size-5" />} label={t("nodeContent.unavailableVideo")} />;

    const sourceRatio = (videoSize?.width || node.metadata?.naturalWidth || node.width) / Math.max(1, videoSize?.height || node.metadata?.naturalHeight || node.height);
    const fitHeight = Math.min(node.height, node.width / Math.max(0.01, sourceRatio));
    const fitWidth = Math.round(fitHeight * sourceRatio);
    const activeEntry = subtitleEntries.find((entry) => currentTimeMs >= entry.startMs && currentTimeMs < entry.endMs);
    const activeHighlight = activeEntry ? (node.metadata?.subtitleHighlights || []).find((item) => item.entryIndex === activeEntry.index) : undefined;

    return (
        <div ref={playerBoxRef} className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[var(--node-radius)] bg-black">
            <div className="relative" style={{ width: fitWidth, height: Math.round(fitHeight) }}>
                <VideoPlayer
                    src={url}
                    poster={canvasNodeVideoPreviewUrl(node)}
                    mimeType={canvasNodeVideoPlayback(node)?.mimeType || node.metadata?.mimeType}
                    title={node.title || t("nodeContent.video")}
                    hasAudio={inferVideoHasAudio(node.metadata)}
                    autoPlay
                    preload="metadata"
                    brandColor={theme.accent.primary}
                    className="h-full w-full rounded-[var(--node-radius)] bg-black"
                    dataCanvasNoZoom
                    compactControls
                    onPlay={() => scheduleResourceBlobCache(node.metadata?.storageKey || "")}
                />
                {activeEntry && activeEntry.text.trim() ? <CanvasSubtitleOverlay text={activeEntry.text} highlight={activeHighlight} style={subtitleStyle} /> : null}
            </div>
        </div>
    );
}

function inferVideoHasAudio(metadata: CanvasNodeData["metadata"]): boolean | undefined {
    if (typeof metadata?.hasAudio === "boolean") return metadata.hasAudio;
    // Generated nodes from older saves may not have `hasAudio` yet. In that
    // case an explicit generation setting is the only persisted signal we
    // have; leave all other videos in the unknown state.
    const value = metadata?.generateAudio?.trim().toLowerCase();
    if (["false", "0", "off", "no", "disabled"].includes(value || "")) return false;
    if (["true", "1", "on", "yes", "enabled"].includes(value || "")) return true;
    return undefined;
}

function AudioNodeContent({ node, theme }: CanvasNodeContentProps) {
    const { t } = useI18n();
    if (!node.metadata?.content && !node.metadata?.storageKey) return <EmptyMediaContent icon={<Music2 className="size-7 opacity-35" />} label={t("nodeContent.emptyAudio")} color={theme.node.placeholder} />;
    return <CanvasAudioPlayer node={node} theme={theme} />;
}

function InactiveVideoPreview({ node, theme, onPlay }: Pick<CanvasNodeContentProps, "node" | "theme"> & { onPlay: () => void }) {
    const { t } = useI18n();
    const previewRef = useRef<HTMLDivElement>(null);
    const nearViewport = useNearViewport(previewRef);
    const previewUrl = canvasNodeVideoPreviewUrl(node);
    const { updateMetadata } = useCanvasNodeActions();
    const updateMetadataRef = useRef(updateMetadata);
    const [hydrating, setHydrating] = useState(false);
    const handoff = useGenerationHandoff(node);
    const hasPreviewImage = Boolean(previewUrl || resourceIdFromStorageKey(node.metadata?.storageKey));
    const releaseHandoff = handoff.mediaFailed;
    useEffect(() => {
        // The fallback card is never blank, so there is nothing to wait for.
        if (!hasPreviewImage && handoff.covering) releaseHandoff();
    }, [hasPreviewImage, handoff.covering, releaseHandoff]);

    useEffect(() => {
        const element = previewRef.current;
        if (!element) return;
        const content = node.metadata?.content || "";
        const fallback = canvasNodeVideoPlayback(node)?.content || (node.metadata?.importSource?.provider === "libtv" ? buildLibTVVideoSourceUrl(content) : content);
        return bindCanvasVideoHoverPreview(element, () => resolveMediaUrl(node.metadata?.storageKey, fallback));
    }, [node.metadata?.content, node.metadata?.storageKey, node.metadata?.importSource?.provider, node.metadata?.videoPlayback?.content]);

    useEffect(() => {
        updateMetadataRef.current = updateMetadata;
    }, [updateMetadata]);

    useEffect(() => {
        if (resourceIdFromStorageKey(node.metadata?.storageKey) || previewUrl || !nearViewport || !node.metadata?.content || !updateMetadataRef.current) {
            setHydrating(false);
            return;
        }
        const controller = new AbortController();
        setHydrating(true);
        void hydrateCanvasVideoPreview(node, controller.signal)
            .then((videoPreview) => {
                if (!controller.signal.aborted && videoPreview) updateMetadataRef.current?.(node.id, { videoPreview });
            })
            .catch(() => undefined)
            .finally(() => {
                if (!controller.signal.aborted) setHydrating(false);
            });
        return () => controller.abort();
    }, [nearViewport, node.id, node.metadata?.content, node.metadata?.storageKey, previewUrl]);

    if (previewUrl || resourceIdFromStorageKey(node.metadata?.storageKey)) {
        return (
            <div ref={previewRef} className="group/video-preview relative size-full overflow-hidden rounded-[var(--node-radius)] bg-muted text-muted-foreground">
                <CreativePreviewImage
                    storageKey={node.metadata?.videoPreview?.storageKey || node.metadata?.storageKey}
                    src={previewUrl}
                    alt={t("nodeContent.staticPreview", { title: node.title || t("nodeContent.video") })}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    onLoad={(event) => handoff.mediaReady(event.currentTarget)}
                    onError={() => handoff.mediaFailed()}
                    style={handoff.covering ? { opacity: 0 } : undefined}
                    className="pointer-events-none size-full select-none object-contain"
                />
                {handoff.covering ? (
                    <div className="absolute inset-0" style={{ background: theme.node.panel }}>
                        <LoadingContent node={node} theme={theme} finishing={handoff.done ? "done" : "pending"} />
                    </div>
                ) : (
                    <VideoPreviewPlayButton title={node.title || t("nodeContent.video")} onPlay={onPlay} />
                )}
            </div>
        );
    }
    return (
        <div ref={previewRef} className="group/video-preview relative size-full">
            <InactiveMediaCard icon={<Video className="size-7" />} title={node.title || t("nodeContent.video")} hint={hydrating ? t("nodeContent.firstFrame") : nearViewport ? t("nodeContent.clickPlay") : t("nodeContent.viewportFrame")} theme={theme} />
            <VideoPreviewPlayButton title={node.title || t("nodeContent.video")} onPlay={onPlay} />
        </div>
    );
}

function VideoPreviewPlayButton({ title, onPlay }: { title: string; onPlay: () => void }) {
    const { t } = useI18n();
    return (
        <button
            type="button"
            className="absolute left-1/2 top-1/2 z-[var(--node-z-overlay)] grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/62 text-white shadow-lg backdrop-blur transition-[transform,background-color,opacity] hover:scale-105 hover:bg-black/78 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            aria-label={t("nodeContent.play", { title })}
            title={t("nodeContent.playVideo")}
            onPointerDown={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
                event.stopPropagation();
                onPlay();
            }}
        >
            <Play className="ml-0.5 size-5 fill-current" />
        </button>
    );
}

function useVideoPlaybackUrl(node: CanvasNodeData, active: boolean) {
    const rawContent = node.metadata?.content || "";
    const fallback = canvasNodeVideoPlayback(node)?.content || (node.metadata?.importSource?.provider === "libtv" ? buildLibTVVideoSourceUrl(rawContent) : rawContent);
    const storageKey = node.metadata?.storageKey || "";
    const delivery = useResourceDelivery(storageKey, active);
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [resolvedSource, setResolvedSource] = useState("");
    const sourceIdentity = `${storageKey}:${fallback}`;

    useEffect(() => {
        let cancelled = false;
        if (delivery.controlled) return;
        if (!active) {
            setUrl("");
            setLoading(false);
            setResolvedSource("");
            return;
        }
        setLoading(true);
        void resolveMediaUrl(storageKey, fallback)
            .then((resolved) => {
                if (!cancelled) setUrl(resolved);
            })
            .catch(() => {
                if (!cancelled) setUrl(fallback);
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                    setResolvedSource(sourceIdentity);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [active, fallback, storageKey, delivery.controlled, sourceIdentity]);

    return delivery.controlled ? { url: delivery.url, loading: delivery.loading } : { url: resolvedSource === sourceIdentity ? url : "", loading: loading || (active && resolvedSource !== sourceIdentity) };
}

function InactiveMediaCard({ icon, title, hint, theme }: { icon: ReactNode; title: string; hint: string; theme: CanvasTheme }) {
    return (
        <div className="flex size-full flex-col items-center justify-center gap-2 rounded-[var(--node-radius)] px-4 text-center" style={{ background: theme.node.fill, color: theme.node.muted }}>
            <span className="opacity-40">{icon}</span>
            <span className="max-w-full truncate text-xs font-medium" title={title}>
                {title}
            </span>
            <span className="text-[var(--fs-tiny)] opacity-50">{hint}</span>
        </div>
    );
}

function MediaLoadingState({ icon, label }: { icon: ReactNode; label: string }) {
    return (
        <div role="status" className="flex size-full flex-col items-center justify-center gap-2 rounded-[var(--node-radius)] bg-black text-white/75">
            <span className="grid size-10 place-items-center rounded-full bg-white/10">{icon}</span>
            <span className="text-xs font-medium">{label}</span>
        </div>
    );
}

function EmptyMediaContent({ icon, label, color }: { icon: ReactNode; label: string; color: string }) {
    return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3" style={{ color }}>
            {icon}
            <span className="text-sm">{label}</span>
        </div>
    );
}

/**
 * A node that just finished generating keeps its progress overlay (≤99%) until the media is downloaded and
 * decoded, shows 100%, then reveals it — never a blank white/black frame after "100%".
 */
function useGenerationHandoff(node: CanvasNodeData) {
    const [watched] = useState(() => watchedGeneratingNodes.has(node.id));
    const [done, setDone] = useState(false);
    const [revealed, setRevealed] = useState(!watched);
    const nodeId = node.id;
    const progressKey = canvasProgressKey(node);
    const release = useCallback(() => {
        watchedGeneratingNodes.delete(nodeId);
        clearShownProgress(progressKey);
        setRevealed(true);
    }, [nodeId, progressKey]);
    useEffect(() => {
        // Safety net: a renderer that never reports load must not pin the node at 99%.
        if (revealed || done) return;
        const timer = window.setTimeout(release, 20_000);
        return () => window.clearTimeout(timer);
    }, [revealed, done, release]);
    useEffect(() => {
        if (!done || revealed) return;
        const timer = window.setTimeout(() => {
            watchedGeneratingNodes.delete(nodeId);
            clearShownProgress(progressKey);
            setRevealed(true);
        }, 280);
        return () => window.clearTimeout(timer);
    }, [done, revealed, nodeId, progressKey]);
    return {
        covering: !revealed,
        done,
        mediaReady(element: HTMLImageElement | HTMLVideoElement) {
            if (revealed || done) return;
            if (element instanceof HTMLImageElement && typeof element.decode === "function")
                element.decode().then(
                    () => setDone(true),
                    () => setDone(true),
                );
            else setDone(true);
        },
        mediaFailed: release,
    };
}

function ImageContent({
    node,
    theme,
    isBatchRoot,
    batchCount,
    batchPreviewNodes,
    batchExpanded,
    batchOpening,
    batchRecovering,
    onToggleBatch,
}: Pick<CanvasNodeContentProps, "node" | "theme" | "isBatchRoot" | "batchCount" | "batchPreviewNodes" | "batchExpanded" | "batchOpening" | "batchRecovering" | "onToggleBatch">) {
    const imageContainerRef = useRef<HTMLDivElement>(null);
    const nearViewport = useNearViewport(imageContainerRef);
    const { url: resolvedUrl, loading } = useNodeResourceUrl(node, nearViewport);
    // 案例缩略图（canvas-previews）个别缺失时回退原图，不能让节点变成空白。
    const [previewFailed, setPreviewFailed] = useState(false);
    const url = previewFailed && resolvedUrl?.startsWith("/liblib-clone/canvas-previews/") ? node.metadata?.content || resolvedUrl : resolvedUrl;
    const importedFromLibTV = node.metadata?.importSource?.provider === "libtv";
    const { updateMediaNode } = useCanvasNodeActions();
    const handoff = useGenerationHandoff(node);
    const measuredSizeRef = useRef<{ width: number; height: number } | null>(null);

    /**
     * 让节点跟随图片真实比例。
     *
     * 上传接口的 width/height 是可选的（services/api/resources.ts），拿不到时节点会落到
     * 默认的横向比例，竖图就被放进一个宽盒子、两侧留黑。这里在图片解码后量真实尺寸并校正。
     *
     * 判据是「用户有没有手动定过尺寸」，**不是**「有没有量过尺寸」——后者会让所有已经
     * 存过 naturalWidth 的旧节点永远得不到修正（第一版就是这么写的，所以没生效）。
     * 手动拉过（manualSize）或自由比例（freeResize）的节点只补记尺寸、不动宽高。
     */
    const fitToImage = (element: HTMLImageElement) => {
        // LibTV 已提供原图尺寸和节点尺寸；960px 缩略图不能反向覆盖这些数据。
        if (importedFromLibTV || url?.startsWith("/liblib-clone/canvas-previews/")) return;
        const naturalWidth = element.naturalWidth;
        const naturalHeight = element.naturalHeight;
        if (!naturalWidth || !naturalHeight) return;
        if (measuredSizeRef.current?.width === naturalWidth && measuredSizeRef.current.height === naturalHeight) return;
        measuredSizeRef.current = { width: naturalWidth, height: naturalHeight };
        updateMediaNode?.(node.id, (current) => {
            const metadata = current.metadata;
            const needsMetadata = metadata?.naturalWidth !== naturalWidth || metadata?.naturalHeight !== naturalHeight;
            if (current.metadata?.freeResize || current.metadata?.manualSize) {
                return needsMetadata ? { ...current, metadata: { ...metadata, naturalWidth, naturalHeight } } : current;
            }
            const size = fitNodeSize(naturalWidth, naturalHeight);
            const needsResize = Math.abs(size.width - current.width) >= 1 || Math.abs(size.height - current.height) >= 1;
            if (!needsMetadata && !needsResize) return current;
            return {
                ...current,
                ...(needsResize ? size : {}),
                metadata: needsMetadata ? { ...metadata, naturalWidth, naturalHeight } : metadata,
            };
        });
    };

    return (
        <BatchFrame batchPreviewNodes={batchPreviewNodes} batchCount={isBatchRoot ? batchCount : 0} batchExpanded={batchExpanded} batchOpening={batchOpening} batchRecovering={batchRecovering} theme={theme} onToggleBatch={onToggleBatch}>
            <div ref={imageContainerRef} className="relative h-full w-full overflow-hidden rounded-[var(--node-radius)]">
                {url ? (
                    <img
                        src={url}
                        alt={node.title}
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                        onDragStart={(event) => event.preventDefault()}
                        onLoad={(event) => {
                            fitToImage(event.currentTarget);
                            handoff.mediaReady(event.currentTarget);
                        }}
                        onError={() => {
                            if (!previewFailed && resolvedUrl?.startsWith("/liblib-clone/canvas-previews/")) setPreviewFailed(true);
                            else handoff.mediaFailed();
                        }}
                        style={handoff.covering ? { opacity: 0 } : undefined}
                        className={`pointer-events-none block h-full w-full select-none ${node.metadata?.freeResize ? "object-fill" : "object-contain"}`}
                    />
                ) : handoff.covering ? null : (
                    <div className="grid size-full place-items-center" style={{ color: theme.node.muted }}>
                        {loading ? <LoaderCircle className="size-5 animate-spin" /> : <ImageIcon className="size-5 opacity-45" />}
                    </div>
                )}
                {handoff.covering ? (
                    <div className="absolute inset-0" style={{ background: theme.node.panel }}>
                        <LoadingContent node={node} theme={theme} finishing={handoff.done ? "done" : "pending"} />
                    </div>
                ) : null}
            </div>
        </BatchFrame>
    );
}

function useNodeResourceUrl(node: CanvasNodeData, eager: boolean) {
    const storageKey = node.metadata?.storageKey || "";
    const delivery = useResourceDelivery(storageKey, eager, "original", false, true);
    const rawContent = node.metadata?.content || "";
    const content = node.type === CanvasNodeType.Video && node.metadata?.importSource?.provider === "libtv" ? buildLibTVVideoSourceUrl(rawContent) : rawContent;
    // `previewContent` is intentionally passive-only.  When a media node is
    // activated, VideoPlayer/Audio must receive the playable asset, never the
    // LibTV OSS snapshot URL stored for the thumbnail.
    const fallback =
        node.type === CanvasNodeType.Video || node.type === CanvasNodeType.Audio
            ? content
            : // 案例导入把原图地址同时写进了 previewContent；预览仍要经过缩略图映射，否则小节点会下载 1–2MB 原图。
              node.type === CanvasNodeType.Image && node.metadata?.importSource?.provider === "libtv"
              ? buildLibTVImagePreviewUrl(node.metadata?.previewContent || content) || node.metadata?.previewContent || content
              : node.metadata?.previewContent || content;
    const resourceId = resourceIdFromStorageKey(storageKey);
    const isRemoteResource = Boolean(resourceId);
    // 图片内容随资源 ID 不可变且后端允许磁盘强缓存：视口内的远程图片首帧直接上直链，
    // 走浏览器原生解码与磁盘缓存；Blob 缓存就绪后再平滑替换，避免刷新后满屏转圈。
    const synchronousUrl = eager && isRemoteResource && node.type === CanvasNodeType.Image ? peekCachedResourceObjectUrl(storageKey) || resourceFileUrl(resourceId) : "";
    // Inline data URLs are already local, but decoding thousands of them is
    // still expensive. Images must wait for the same viewport gate as remote
    // resources; otherwise DOM virtualization does not reduce image work.
    const isLazyVisual = node.type === CanvasNodeType.Image;
    const isHttpUrl = Boolean(fallback && !fallback.startsWith("data:"));
    const initialUrl = synchronousUrl || (eager && isLazyVisual && isHttpUrl ? fallback : isRemoteResource || isLazyVisual ? "" : fallback);
    const [url, setUrl] = useState(() => initialUrl);
    const [loading, setLoading] = useState(() => !initialUrl && isRemoteResource && eager);

    useEffect(() => {
        let cancelled = false;
        if (isRemoteResource) return;
        if (!isRemoteResource) {
            setUrl(isLazyVisual && !eager ? "" : fallback);
            setLoading(false);
            return;
        }
        const cachedSync = peekCachedResourceObjectUrl(storageKey);
        if (cachedSync) {
            setUrl(cachedSync);
            setLoading(false);
            return;
        }
        if (!url && eager && isHttpUrl) {
            setUrl(fallback);
            setLoading(false);
        } else if (!url) {
            setLoading(eager);
        }
        // 只有进入视口或被激活的节点才下载远程媒体；缓存层会复用已有 Blob URL 和 in-flight 请求。
        const resolve = eager ? cacheResourceObjectUrl(storageKey) : getCachedResourceObjectUrl(storageKey);
        void resolve
            .then((cached) => {
                if (!cancelled && cached) setUrl(cached);
                else if (!cancelled && eager && fallback) setUrl(fallback);
            })
            .catch(() => {
                if (!cancelled && eager) setUrl(synchronousUrl || fallback);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [eager, fallback, isHttpUrl, isLazyVisual, isRemoteResource, storageKey]);

    return delivery.controlled ? { url: delivery.url, loading: delivery.loading } : { url, loading };
}

function useNearViewport(ref: RefObject<Element | null>) {
    const [nearViewport, setNearViewport] = useState(false);
    useEffect(() => {
        const element = ref.current;
        if (!element || typeof IntersectionObserver === "undefined") {
            setNearViewport(true);
            return;
        }
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    setNearViewport(true);
                    observer.disconnect();
                }
            },
            { rootMargin: "600px" },
        );
        observer.observe(element);
        return () => observer.disconnect();
    }, [ref]);
    return nearViewport;
}

export function CanvasNodeImageInfo({ node }: { node: CanvasNodeData }) {
    const width = Math.round(node.metadata?.naturalWidth || node.width);
    const height = Math.round(node.metadata?.naturalHeight || node.height);
    const size = formatBytes(node.metadata?.bytes || 0);
    return (
        <span className="ml-auto max-w-full shrink-0 truncate rounded-[var(--r-sm)] bg-black/55 px-2 py-1 text-[var(--fs-label)] font-medium leading-none text-white backdrop-blur-sm">
            {width} x {height}
            {size ? ` · ${size}` : ""}
        </span>
    );
}

function BatchPreviewImage({ node }: { node: CanvasNodeData }) {
    const { t } = useI18n();
    const ref = useRef<HTMLDivElement>(null);
    const nearViewport = useNearViewport(ref);
    const { url } = useNodeResourceUrl(node, nearViewport);
    return (
        <div ref={ref} className="h-full w-full overflow-hidden rounded-[inherit]">
            {url ? <img src={url} alt={t("nodeContent.batchChildPreview", { title: node.title })} className="h-full w-full object-contain" draggable={false} /> : null}
        </div>
    );
}

function BatchFrame({
    batchCount,
    batchPreviewNodes,
    batchExpanded,
    batchOpening,
    batchRecovering,
    theme,
    onToggleBatch,
    children,
}: {
    batchCount: number;
    batchPreviewNodes?: CanvasNodeData[];
    batchExpanded: boolean;
    batchOpening: boolean;
    batchRecovering: boolean;
    theme: CanvasTheme;
    onToggleBatch?: () => void;
    children: ReactNode;
}) {
    const isBatchRoot = batchCount > 1;
    return (
        <div
            className="group/batch relative h-full w-full overflow-visible"
            onDoubleClick={
                isBatchRoot
                    ? (event) => {
                          event.stopPropagation();
                          onToggleBatch?.();
                      }
                    : undefined
            }
        >
            {isBatchRoot ? (
                <div className="pointer-events-none absolute inset-0 overflow-visible">
                    {Array.from({ length: Math.min(batchCount - 1, 5) }).map((_, index) => (
                        <div
                            key={index}
                            className="absolute rounded-[var(--r-lg)] transition-all duration-300 group-hover/batch:translate-x-2"
                            style={{
                                inset: 0,
                                background: theme.node.panel,
                                boxShadow: `inset 0 0 0 1px ${theme.node.stroke}`,
                                opacity: batchExpanded && !batchOpening ? 0.34 : 1,
                                transform:
                                    batchOpening || batchRecovering ? `translate(${54 + index * 22}px, ${20 + index * 12}px) rotate(${8 + index * 5}deg) scale(.98)` : `translate(${34 + index * 18}px, ${14 + index * 10}px) rotate(${6 + index * 4}deg)`,
                                zIndex: -index - 1,
                            }}
                        >
                            {batchPreviewNodes?.[index] ? <BatchPreviewImage node={batchPreviewNodes[index]} /> : null}
                        </div>
                    ))}
                </div>
            ) : null}
            {children}
        </div>
    );
}
