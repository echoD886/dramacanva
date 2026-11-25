import {
    AudioLines,
    Captions,
    Clapperboard,
    Download,
    FolderPlus,
    Images,
    Image as ImageIcon,
    Info,
    LoaderCircle,
    Lock,
    Maximize2,
    MessageSquare,
    Minus,
    Music2,
    Plus,
    RefreshCw,
    Scissors,
    Settings2,
    Trash2,
    Unlock,
    Upload,
    UserRound,
    Video,
    WandSparkles,
} from "lucide-react";

import { CONTENT_MODERATION_ERROR_CODE, isContentModerationError } from "@/lib/generation-error";
import { classifyGenerationError, GENERATION_ERROR_ACTIONS, isGenerationErrorCode } from "@/lib/generation-failure";
import { registerToolbarTools, type ToolContext, type ToolDefinition } from "@/lib/canvas/tool-registry";
import { CanvasNodeType } from "@/types/canvas";
import { isCanvasImageSourceNode } from "@/lib/canvas/canvas-image-source";

// 节点状态判定辅助函数——从 ToolContext 派生
function isImage(ctx: ToolContext) {
    return ctx.node?.type === CanvasNodeType.Image;
}
function isVideo(ctx: ToolContext) {
    return ctx.node?.type === CanvasNodeType.Video;
}
function isAudio(ctx: ToolContext) {
    return ctx.node?.type === CanvasNodeType.Audio;
}
function isText(ctx: ToolContext) {
    return ctx.node?.type === CanvasNodeType.Text;
}
function isConfig(ctx: ToolContext) {
    return ctx.node?.type === CanvasNodeType.Config;
}
function hasMediaPayload(ctx: ToolContext) {
    return Boolean(ctx.nodeMetadata?.content || ctx.nodeMetadata?.storageKey || ctx.nodeMetadata?.previewContent);
}
function hasImage(ctx: ToolContext) {
    return isImage(ctx) && hasMediaPayload(ctx);
}
function hasVideo(ctx: ToolContext) {
    return isVideo(ctx) && hasMediaPayload(ctx);
}
function hasAudio(ctx: ToolContext) {
    return isAudio(ctx) && Boolean(ctx.nodeMetadata?.content || ctx.nodeMetadata?.storageKey);
}
function isCharacterReference(ctx: ToolContext) {
    return isText(ctx) && ctx.nodeMetadata?.workflowKind === "character" && Boolean(ctx.nodeMetadata?.characterAssetId);
}
function isEditableText(ctx: ToolContext) {
    return isText(ctx) && !isCharacterReference(ctx);
}
function canOpenDialog(ctx: ToolContext) {
    return isEditableText(ctx) || (isImage(ctx) && !isCanvasImageSourceNode(ctx.node)) || isVideo(ctx);
}
function simpleMode(ctx: ToolContext) {
    return ctx.workspaceMode === "simple";
}
function isImageBatchRoot(ctx: ToolContext) {
    return isImage(ctx) && Boolean(ctx.nodeMetadata?.isBatchRoot && ctx.nodeMetadata.batchChildIds?.length);
}
function canRetry(ctx: ToolContext) {
    if (ctx.nodeMetadata?.fileUpload) return false;
    const code = ctx.nodeMetadata?.taskErrorCode || ctx.nodeMetadata?.generationErrorCode;
    if (isGenerationErrorCode(code) && GENERATION_ERROR_ACTIONS[classifyGenerationError(ctx.nodeMetadata)] !== "retry") return false;
    const requiresPromptChange = ctx.nodeMetadata?.generationErrorCode === CONTENT_MODERATION_ERROR_CODE || isContentModerationError(ctx.nodeMetadata);
    const batchHasFailures = isImageBatchRoot(ctx) && (ctx.nodeMetadata?.batchFailedCount || (ctx.nodeMetadata?.status === "error" ? 1 : 0)) > 0;
    return (ctx.nodeMetadata?.status === "error" || (batchHasFailures && ctx.nodeMetadata?.status !== "loading")) && !requiresPromptChange;
}

export const nodeHoverToolbarTools: ToolDefinition[] = [
    // 基础工具组
    {
        id: "info",
        toolbar: "node-hover",
        category: "node-state",
        label: (ctx) => (isCharacterReference(ctx) ? "canvasExtra.tool.viewCharacter" : "canvasExtra.tool.viewNode"),
        displayLabel: (ctx) => (isCharacterReference(ctx) ? "canvasExtra.tool.characterDetail" : "canvasExtra.tool.nodeInfo"),
        icon: (ctx) => (isCharacterReference(ctx) ? <UserRound className="size-3.5" /> : <Info className="size-3.5" />),
        defaultVisible: true,
        defaultOrder: 10,
        nodeToolbar: {
            group: (ctx) => (isCharacterReference(ctx) || (!isImage(ctx) && !isVideo(ctx) && !isAudio(ctx) && !isEditableText(ctx) && !isConfig(ctx)) ? "primary" : "more"),
            order: 10,
            section: "canvasExtra.tool.nodeManage",
        },
        run: (ctx) => ctx.handlers.onNodeInfo(ctx.node!),
    },
    {
        id: "delete",
        toolbar: "node-hover",
        category: "node-state",
        label: "canvasExtra.tool.removeNode",
        displayLabel: "canvasExtra.tool.removeNode",
        icon: <Trash2 className="size-3.5" />,
        defaultVisible: true,
        defaultOrder: 20,
        nodeToolbar: { group: "more", order: 1000, section: "canvasExtra.tool.danger" },
        danger: true,
        run: (ctx) => ctx.handlers.onNodeDelete(ctx.node!),
    },
    // 节点操作工具组——通过 applicable 谓词实现上下文感知
    {
        id: "retry",
        toolbar: "node-hover",
        category: "node-state",
        label: (ctx) => (isImageBatchRoot(ctx) ? "canvasExtra.tool.retryBatchFailed" : "canvasExtra.tool.regenerate"),
        displayLabel: (ctx) => (isImageBatchRoot(ctx) ? "canvasExtra.tool.retryFailed" : "canvasExtra.tool.retry"),
        icon: <RefreshCw className="size-3.5" />,
        defaultVisible: true,
        defaultOrder: 30,
        nodeToolbar: { group: "primary", order: 5 },
        applicable: canRetry,
        run: (ctx) => ctx.handlers.onNodeRetry(ctx.node!),
    },
    {
        id: "extractFrames",
        toolbar: "node-hover",
        category: "node-state",
        label: (ctx) => (ctx.extractingVideoFrames ? "canvasExtra.tool.extractingFrames" : "canvasExtra.tool.extractFramesHint"),
        displayLabel: (ctx) => (ctx.extractingVideoFrames ? "canvasExtra.tool.extracting" : "canvasExtra.tool.extractFrame"),
        icon: (ctx) => (ctx.extractingVideoFrames ? <LoaderCircle className="size-3.5 animate-spin" /> : <Images className="size-3.5" />),
        defaultVisible: true,
        defaultOrder: 40,
        nodeToolbar: { group: "process", order: 10, section: "canvasExtra.tool.extractAssets", description: "canvasExtra.tool.extractFrameDesc" },
        applicable: (ctx) => hasVideo(ctx) && !simpleMode(ctx),
        disabled: (ctx) => ctx.extractingVideoFrames,
        run: (ctx) => ctx.handlers.onNodeExtractVideoFrames(ctx.node!),
    },
    {
        id: "extractAudio",
        toolbar: "node-hover",
        category: "node-state",
        label: (ctx) => (ctx.extractingAudio ? "canvasExtra.tool.extractingAudio" : "canvasExtra.tool.extractAudioHint"),
        displayLabel: (ctx) => (ctx.extractingAudio ? "canvasExtra.tool.extracting" : "canvasExtra.tool.extractAudio"),
        icon: (ctx) => (ctx.extractingAudio ? <LoaderCircle className="size-3.5 animate-spin" /> : <AudioLines className="size-3.5" />),
        defaultVisible: true,
        defaultOrder: 42,
        nodeToolbar: { group: "process", order: 20, section: "canvasExtra.tool.extractAssets", description: "canvasExtra.tool.extractAudioDesc" },
        applicable: (ctx) => hasVideo(ctx) && !simpleMode(ctx),
        disabled: (ctx) => ctx.extractingAudio || ctx.trimmingVideo,
        run: (ctx) => ctx.handlers.onNodeExtractAudioFromVideo(ctx.node!),
    },
    {
        id: "depthCapture",
        toolbar: "node-hover",
        category: "node-state",
        label: "canvasExtra.tool.depthCapture",
        icon: <UserRound className="size-3.5" />,
        defaultVisible: true,
        defaultOrder: 43,
        nodeToolbar: { group: "primary", order: 15 },
        applicable: (ctx) => hasVideo(ctx) && Boolean(ctx.handlers.onNodeDepthCapture),
        run: (ctx) => ctx.handlers.onNodeDepthCapture?.(ctx.node!),
    },
    {
        id: "trimRegenerate",
        toolbar: "node-hover",
        category: "node-state",
        label: (ctx) => (ctx.trimmingVideo ? "canvasExtra.tool.trimming" : "canvasExtra.tool.trimHint"),
        displayLabel: (ctx) => (ctx.trimmingVideo ? "canvasExtra.tool.trimmingShort" : "canvasExtra.tool.trimClip"),
        icon: (ctx) => (ctx.trimmingVideo ? <LoaderCircle className="size-3.5 animate-spin" /> : <Scissors className="size-3.5" />),
        defaultVisible: true,
        defaultOrder: 44,
        nodeToolbar: { group: "primary", order: 10, description: "canvasExtra.tool.trimDesc" },
        applicable: (ctx) => hasVideo(ctx) && !simpleMode(ctx),
        disabled: (ctx) => ctx.extractingAudio || ctx.trimmingVideo,
        run: (ctx) => ctx.handlers.onNodeTrimVideoSegments(ctx.node!),
    },
    {
        id: "saveAsset",
        toolbar: "node-hover",
        category: "node-state",
        label: "canvasExtra.tool.addToLibrary",
        displayLabel: "canvasExtra.tool.saveToLibrary",
        icon: <FolderPlus className="size-3.5" />,
        defaultVisible: true,
        defaultOrder: 50,
        nodeToolbar: { group: "more", order: 40, section: "canvasExtra.tool.assets" },
        applicable: (ctx) => hasImage(ctx) || hasVideo(ctx) || isEditableText(ctx),
        run: (ctx) => ctx.handlers.onNodeSaveAsset(ctx.node!),
    },
    {
        id: "download",
        toolbar: "node-hover",
        category: "node-state",
        label: (ctx) => (hasAudio(ctx) ? "canvasExtra.tool.downloadAudio" : hasVideo(ctx) ? "canvasExtra.tool.downloadVideo" : "canvasExtra.tool.downloadImage"),
        displayLabel: "canvasExtra.tool.download",
        icon: <Download className="size-3.5" />,
        defaultVisible: true,
        defaultOrder: 60,
        nodeToolbar: { group: "utility", order: 20 },
        applicable: (ctx) => hasImage(ctx) || hasVideo(ctx) || hasAudio(ctx),
        run: (ctx) => ctx.handlers.onNodeDownload(ctx.node!),
    },
    {
        id: "edit",
        toolbar: "node-hover",
        category: "node-state",
        label: (ctx) => (isEditableText(ctx) ? "canvasExtra.tool.textGenHint" : "canvasExtra.tool.edit"),
        displayLabel: (ctx) => (isEditableText(ctx) ? "canvasExtra.tool.textGen" : "canvasExtra.tool.genSettings"),
        icon: <MessageSquare className="size-3.5" />,
        defaultVisible: true,
        defaultOrder: 70,
        nodeToolbar: { group: (ctx) => (isEditableText(ctx) ? "primary" : "more"), order: 20, section: "canvasExtra.tool.genInfo" },
        applicable: canOpenDialog,
        run: (ctx) => ctx.handlers.onNodeToggleDialog(ctx.node!),
    },
    {
        id: "editText",
        toolbar: "node-hover",
        category: "node-state",
        label: "canvasExtra.tool.expandEditHint",
        displayLabel: "canvasExtra.tool.expandEdit",
        icon: <Maximize2 className="size-3.5" />,
        defaultVisible: true,
        defaultOrder: 80,
        nodeToolbar: { group: "primary", order: 30 },
        applicable: isEditableText,
        run: (ctx) => ctx.handlers.onNodeEditText(ctx.node!),
    },
    {
        id: "generateImage",
        toolbar: "node-hover",
        category: "node-state",
        label: "canvasExtra.tool.textToImageHint",
        displayLabel: "canvasExtra.tool.genImage",
        icon: <ImageIcon className="size-3.5" />,
        defaultVisible: true,
        defaultOrder: 90,
        nodeToolbar: { group: "primary", order: 40 },
        applicable: isEditableText,
        run: (ctx) => ctx.handlers.onNodeGenerateImage(ctx.node!),
    },
    {
        id: "config",
        toolbar: "node-hover",
        category: "node-state",
        label: "canvasExtra.tool.genConfig",
        displayLabel: "canvasExtra.tool.genConfig",
        icon: <Settings2 className="size-3.5" />,
        defaultVisible: true,
        defaultOrder: 100,
        nodeToolbar: { group: "primary", order: 10 },
        applicable: (ctx) => isConfig(ctx) && !simpleMode(ctx),
        run: (ctx) => ctx.handlers.onNodeToggleDialog(ctx.node!),
    },
    {
        id: "decreaseFont",
        toolbar: "node-hover",
        category: "node-state",
        label: "canvasExtra.tool.fontSmaller",
        displayLabel: "canvasExtra.tool.zoomOut",
        icon: <Minus className="size-3.5" />,
        defaultVisible: true,
        defaultOrder: 110,
        nodeToolbar: { group: "process", order: 10 },
        applicable: (ctx) => isEditableText(ctx) && !simpleMode(ctx),
        run: (ctx) => ctx.handlers.onNodeDecreaseFont(ctx.node!),
    },
    {
        id: "increaseFont",
        toolbar: "node-hover",
        category: "node-state",
        label: "canvasExtra.tool.fontLarger",
        displayLabel: "canvasExtra.tool.zoomIn",
        icon: <Plus className="size-3.5" />,
        defaultVisible: true,
        defaultOrder: 120,
        nodeToolbar: { group: "process", order: 20 },
        applicable: (ctx) => isEditableText(ctx) && !simpleMode(ctx),
        run: (ctx) => ctx.handlers.onNodeIncreaseFont(ctx.node!),
    },
    {
        id: "uploadImage",
        toolbar: "node-hover",
        category: "node-state",
        label: "canvasExtra.tool.uploadImage",
        displayLabel: "canvasExtra.tool.uploadImage",
        icon: <Upload className="size-3.5" />,
        defaultVisible: true,
        defaultOrder: 130,
        nodeToolbar: { group: "primary", order: 10 },
        applicable: (ctx) => isImage(ctx) && !hasImage(ctx),
        run: (ctx) => ctx.handlers.onNodeUpload(ctx.node!),
    },
    {
        id: "uploadVideo",
        toolbar: "node-hover",
        category: "node-state",
        label: (ctx) => (hasVideo(ctx) ? "canvasExtra.tool.replaceVideo" : "canvasExtra.tool.uploadVideo"),
        displayLabel: (ctx) => (hasVideo(ctx) ? "canvasExtra.tool.replaceVideo" : "canvasExtra.tool.uploadVideo"),
        icon: <Video className="size-3.5" />,
        defaultVisible: true,
        defaultOrder: 140,
        nodeToolbar: { group: (ctx) => (hasVideo(ctx) ? "more" : "primary"), order: 45, section: "canvasExtra.tool.assets" },
        applicable: isVideo,
        run: (ctx) => ctx.handlers.onNodeUpload(ctx.node!),
    },
    {
        id: "subtitles",
        toolbar: "node-hover",
        category: "node-state",
        label: "canvasExtra.tool.editSubtitle",
        displayLabel: "canvasExtra.tool.subtitle",
        icon: <Captions className="size-3.5" />,
        defaultVisible: true,
        defaultOrder: 145,
        nodeToolbar: { group: "primary", order: 20 },
        applicable: (ctx) => hasVideo(ctx),
        run: (ctx) => ctx.handlers.onNodeSubtitles(ctx.node!),
    },
    {
        id: "timeline",
        toolbar: "node-hover",
        category: "node-state",
        label: "canvasExtra.tool.timelineEdit",
        displayLabel: "canvasExtra.tool.enterEditor",
        icon: <Clapperboard className="size-3.5" />,
        defaultVisible: true,
        defaultOrder: 148,
        nodeToolbar: { group: "workspace", order: 30, section: "canvasExtra.tool.projectEditor", description: "canvasExtra.tool.timelineHint" },
        applicable: (ctx) => hasVideo(ctx) || hasAudio(ctx),
        run: (ctx) => ctx.handlers.onNodeTimeline(ctx.node!),
    },
    {
        id: "uploadAudio",
        toolbar: "node-hover",
        category: "node-state",
        label: (ctx) => (hasAudio(ctx) ? "canvasExtra.tool.replaceAudio" : "canvasExtra.tool.uploadAudio"),
        displayLabel: (ctx) => (hasAudio(ctx) ? "canvasExtra.tool.replaceAudio" : "canvasExtra.tool.uploadAudio"),
        icon: <Music2 className="size-3.5" />,
        defaultVisible: true,
        defaultOrder: 150,
        nodeToolbar: { group: (ctx) => (hasAudio(ctx) ? "more" : "primary"), order: 45, section: "canvasExtra.tool.assets" },
        applicable: isAudio,
        run: (ctx) => ctx.handlers.onNodeUpload(ctx.node!),
    },
    // 节点锁定——独立分类，自动插入前置分隔符
    {
        id: "node-lock",
        toolbar: "node-hover",
        category: "navigation",
        label: (ctx) => (ctx.nodeMetadata?.locked ? "canvasExtra.tool.unlockNode" : "canvasExtra.tool.lockNode"),
        displayLabel: "canvasExtra.tool.lockNodeAlt",
        icon: (ctx) => (ctx.nodeMetadata?.locked ? <Unlock className="size-3.5" /> : <Lock className="size-3.5" />),
        defaultVisible: true,
        defaultOrder: 160,
        nodeToolbar: { group: "more", order: 900, section: "canvasExtra.tool.nodeManage" },
        active: (ctx) => Boolean(ctx.nodeMetadata?.locked),
        run: (ctx) => ctx.handlers.onNodeToggleLocked(ctx.node!),
    },
];

registerToolbarTools(nodeHoverToolbarTools);
