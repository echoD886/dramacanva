import type { CanvasColorGrade } from "@/lib/canvas/canvas-color-grade";
import type { MediaConversionNodeState } from "@/lib/media-conversion/contracts";
import type { AssetCategory } from "@/lib/asset-category";
import type { PortraitTextureSettings } from "@/lib/canvas/canvas-portrait-texture";
import type { StyleExecutionPlan } from "@/lib/canvas/style-profile";
import type { ArtCritiqueNodeState } from "@/lib/art-critique/contracts";
import type { CameraControlOptions } from "@/lib/canvas/camera-prompt-library";
import type { PortraitClearanceNodeState } from "@/lib/portrait-clearance/contracts";
import type { SrtEntry, SubtitleHighlight, SubtitleStyle } from "@/types/timeline";

export type Position = {
    x: number;
    y: number;
};

export type CanvasComposerAttachment = {
    id: string;
    kind: "image" | "video" | "audio";
    name: string;
    storageKey: string;
    url: string;
    mimeType: string;
    bytes?: number;
    width?: number;
    height?: number;
    durationMs?: number;
    previewUrl?: string;
    previewStorageKey?: string;
};

export type ViewportTransform = {
    x: number;
    y: number;
    k: number;
};

export enum CanvasNodeType {
    Image = "image",
    Text = "text",
    Drawing = "drawing",
    Script = "script",
    Skill = "skill",
    Config = "config",
    Video = "video",
    Audio = "audio",
    Frame = "frame",
    Markdown = "markdown",
    Svg = "svg",
    Html = "html",
    Panorama = "panorama",
    Compare = "compare",
    Chart = "chart",
    ColorGrade = "colorgrade",
    MediaConversion = "media-conversion",
    BatchTable = "batch-table",
}

/** Runtime IDs contributed by plugins share the persisted node type field. */
export type PluginCanvasNodeType = string & { readonly __pluginCanvasNodeType?: unique symbol };
export type CanvasNodeTypeId = CanvasNodeType | PluginCanvasNodeType;

export function isBuiltinCanvasNodeType(type: CanvasNodeTypeId): type is CanvasNodeType {
    return Object.values(CanvasNodeType).includes(type as CanvasNodeType);
}

export type CanvasNodeStatus = "idle" | "success" | "loading" | "error";
export type CanvasMediaPerformanceMode = "auto" | "quality" | "performance";
export type CanvasWorkspaceMode = "simple" | "professional";
export type CanvasToolMode = "move" | "box-select";
export type CanvasFolderStyle = "glass" | "stacked" | "midnight" | "paper" | "cinema" | "compact" | "glass-dark" | "pixel" | "doodle" | "glass-iridescent";
export type CanvasFolderTheme = "aurora" | "obsidian" | "ember" | "pearl";
export type StoryboardShotDuration = "auto" | "4" | "5" | "10" | "15" | "30";
export type StoryboardShotCount = "auto" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10";
export type StoryboardVideoInputMode = "direct" | "keyframe";
export type CanvasGenerationMode = "text" | "image" | "video" | "audio";
export type CanvasGenerationBatchMode = "storyboard_image" | "storyboard_video" | "action_board" | "batch_image";
export type CanvasGenerationBatchStatus = "queued" | "running" | "partial_failed" | "completed" | "cancelled";
export type CanvasGenerationBatchItemStatus = "waiting" | "submitting" | "queued" | "running" | "succeeded" | "failed" | "cancelled";
export type CanvasImageGenerationType = "generation" | "edit";
export type CanvasWorkflowKind = "free" | "script" | "story_input" | "character" | "scene" | "storyboard" | "shot" | "final" | "styleboard" | "reference_set" | "reference_video" | "action_board";
export type CanvasVideoEditOperation = "text_to_video" | "image_to_video" | "reference_to_video" | "extend" | "inpaint" | "replace_element" | "camera_motion" | "style_transfer" | "audio_to_video" | "compare_versions" | "concat";
export type CanvasSkillCategory = "writing" | "storyboard" | "image" | "video" | "utility";
export type CanvasSkillOutputMode = "text" | "json" | "image_prompt" | "workflow";
export type StoryboardColumn =
    | "shotNumber"
    | "durationSeconds"
    | "plotDescription"
    | "dialogue"
    | "narrativeIntent"
    | "viewerPOV"
    | "performanceBlocking"
    | "shotSize"
    | "emotion"
    | "lightingAndAtmosphere"
    | "audioEffects"
    | "camera"
    | "motion"
    | "timeBeats"
    | "imageGenerationPrompt"
    | "videoMotionPrompt"
    | "assets"
    | "continuityOut"
    | "negativePrompt";

export type StoryboardAssetRole = "character" | "environment" | "wardrobe" | "prop" | "weapon" | "style" | "motion" | "audio";

export type StoryboardAssetBinding = {
    nodeId: string;
    role: StoryboardAssetRole;
    priority: number;
};

export type StoryboardCharacterReference = {
    characterName: string;
    characterAssetId?: string;
    characterVersionId?: string;
    characterDescription?: string;
    characterImageNodeId?: string;
};

export type StoryboardRow = {
    id: string;
    shotNumber: number;
    durationSeconds: number;
    plotDescription: string;
    dialogue: string;
    characters: StoryboardCharacterReference[];
    narrativeIntent: string;
    viewerPOV: string;
    performanceBlocking: string;
    shotSize: string;
    emotion: string;
    lightingAndAtmosphere: string;
    audioEffects: string;
    camera: string;
    motion: string;
    timeBeats: string;
    imageGenerationPrompt: string;
    videoMotionPrompt: string;
    imagePromptTemplateVariables?: Record<string, string>;
    videoPromptTemplateVariables?: Record<string, string>;
    mustHave: string[];
    optionalDetails: string[];
    continuityOut: string;
    negativePrompt: string;
    assetBindings: StoryboardAssetBinding[];
    imageNodeId?: string;
    videoNodeId?: string;
    status?: CanvasNodeStatus;
    errorDetails?: string;
};

export type StoryboardData = {
    rows: StoryboardRow[];
    visibleColumns: StoryboardColumn[];
    referenceNodeIds: string[];
};

export type CanvasGenerationBatchItem = {
    generationErrorCode?: string;
    taskBilling?: { status: string; amountMicrocredits: number };
    requiredMicrocredits?: number;
    availableMicrocredits?: number;
    confirmedVideoSettings?: import("@/lib/canvas/storyboard-video-confirmation").ConfirmedStoryboardVideoSettings;
    id: string;
    rowId: string;
    nodeId: string;
    taskId?: string;
    status: CanvasGenerationBatchItemStatus;
    retryCount: number;
    errorDetails?: string;
    costUncertain?: boolean;
};

export type CanvasGenerationBatch = {
    id: string;
    projectId: string;
    sourceNodeId: string;
    mode: CanvasGenerationBatchMode;
    status: CanvasGenerationBatchStatus;
    items: CanvasGenerationBatchItem[];
    concurrency?: number;
    createdAt: string;
    updatedAt: string;
};

export type CanvasBatchOperation = "try_on" | "creative";
export type CanvasBatchRow = { id: string; enabled: boolean; inputNodeIds: string[]; prompt: string; outputNodeId?: string };
export type CanvasBatchReferenceColumn = { id: string; label: string };
export type CanvasBatchTableData = { operation: CanvasBatchOperation; concurrency: number; referenceColumns?: CanvasBatchReferenceColumn[]; rows: CanvasBatchRow[] };

export type CanvasSkillSnapshot = {
    id: string;
    name: string;
    description: string;
    category: CanvasSkillCategory;
    template: string;
    outputMode: CanvasSkillOutputMode;
    outputContract: string;
    version: number;
    tags: string[];
};

export type CanvasMediaVersionMedia = Pick<
    CanvasNodeMetadata,
    "content" | "storageKey" | "previewContent" | "mimeType" | "bytes" | "durationMs" | "hasAudio" | "naturalWidth" | "naturalHeight" | "videoPreview" | "assetId" | "waveform" | "waveformVersion" | "imageRotation"
>;
export type CanvasMediaVersionGeneration = Pick<CanvasNodeMetadata, "prompt" | "model" | "producedModel" | "size" | "quality" | "seconds" | "references" | "taskId" | "taskDurationMs">;
export type CanvasMediaVersion = {
    id: string;
    number: number;
    createdAt: string;
    source: "generate" | "upload";
    media: CanvasMediaVersionMedia;
    generation?: CanvasMediaVersionGeneration;
};

export type CanvasNodeMetadata = {
    dramaProjection?: { projectId: string; episodeId: string; segmentId: string; shotId?: string; slot?: string };
    modelStarterKey?: import("@/pages/showcase/model-starters").ModelStarterKey;
    preferredModelCodes?: string[];
    mediaVersions?: CanvasMediaVersion[];
    currentMediaVersionId?: string;
    imageSettingsUpdatedAt?: number;
    defaultTitle?: string;
    titleEdited?: boolean;
    onboardingDefaultsApplied?: boolean;
    /** Node-specific style overrides the project style for this node's generation only. */
    generationStyleProfileJson?: string;
    generationOutputCount?: number;
    producedModelCandidate?: string;
    producedModel?: string;
    /** Editable public parameters; submitted task snapshots remain separate. */
    generationSpec?: import("@/lib/canvas/generation-contract.generated").GenerationSpec;
    /** Namespaced extension ownership for nodes contributed by a unified plugin. */
    pluginId?: string;
    pluginNodeId?: string;
    pluginData?: Record<string, unknown>;
    /** Original official case content is referenced, never ingested as user media. */
    publicCaseContent?: string;
    importSource?:
        | {
              provider: "libtv";
              projectUuid: string;
              /** 模板/新手示例级导入只有项目来源；节点级导入带 nodeKey/batchId。 */
              nodeKey?: string;
              batchId?: string;
              sourceType?: string;
              styleAssetUuid?: string;
              styleVersionUuid?: string;
              styleName?: string;
              templateUuid?: string;
              starterKey?: string;
              /** Import-time names let locale changes leave subsequent user renames intact. */
              originalTitle?: string;
              generatedTitle?: string;
              titleEdited?: boolean;
          }
        | {
              provider: "tapnow";
              shareId: string;
              nodeId: string;
              batchId: string;
              sourceType?: string;
          };
    content?: string;
    previewContent?: string;
    /** Playback copy tied to its original; exports and generation keep content. */
    videoPlayback?: { sourceContent: string; content: string; mimeType: string };
    videoPreview?: {
        content: string;
        storageKey?: string;
        width?: number;
        height?: number;
        bytes?: number;
        mimeType?: string;
    };
    richText?: Record<string, unknown>;
    composerContent?: string;
    /** 输入框直接添加的素材；使用持久资源地址，不创建画布节点。 */
    composerAttachments?: CanvasComposerAttachment[];
    prompt?: string;
    promptTemplateOperation?: string;
    promptTemplateVariables?: Record<string, string>;
    status?: CanvasNodeStatus;
    /** 浏览器文件上传，与模型生成任务状态独立。 */
    fileUpload?: "uploading" | "error";
    fileUploadProgress?: number;
    locked?: boolean;
    errorDetails?: string;
    generationErrorCode?: string;
    resourceReloadAvailable?: boolean;
    failedPromptFingerprint?: string;
    lastGenerationRequestFingerprint?: string;
    fontSize?: number;
    generationMode?: CanvasGenerationMode;
    generationType?: CanvasImageGenerationType;
    model?: string;
    workflowProvider?: "model" | "runninghub" | "comfyui";
    runningHubWorkflowId?: string;
    comfyBridgeWorkflowId?: string;
    runningHubWorkflowKind?: "workflow" | "app";
    /** 当前画布节点覆盖的工作流动态字段，键为 source:* 或 field:nodeId:fieldName。 */
    workflowParameters?: Record<string, unknown>;
    size?: string;
    quality?: string;
    imageResolution?: string;
    transparentBackground?: string;
    count?: number;
    textCount?: number;
    textThinking?: boolean;
    modelParameters?: string;
    textStream?: boolean;
    systemPrompt?: string;
    seconds?: string;
    vquality?: string;
    generateAudio?: string;
    watermark?: string;
    audioVoice?: string;
    audioMode?: "tts" | "unified_edit";
    audioVoiceBindings?: Array<{ characterNodeId: string; audioNodeId: string }>;
    sourceNodeId?: string;
    audioFormat?: string;
    audioSpeed?: string;
    audioInstructions?: string;
    musicInstrumental?: string;
    references?: string[];
    naturalWidth?: number;
    naturalHeight?: number;
    freeResize?: boolean;
    isBatchRoot?: boolean;
    batchRootId?: string;
    batchChildIds?: string[];
    batchFailedCount?: number;
    batchUsesReferenceImages?: boolean;
    primaryImageId?: string;
    imageBatchExpanded?: boolean;
    /** 拆层请求身份与画布展开位置分离，恢复任务时沿用同一结果消费流程。 */
    layerDecomposition?: { sourceNodeId: string; canvas?: { width: number; height: number } };
    /** 一次拆分从视觉规划起计时；刷新不续发尚未提交的拆图请求。 */
    imageLayerWorkflow?: { sourceNodeId: string; startedAt: string; stage: "planning" | "extract"; total?: number; plannerModel: string; planningTaskId?: string };
    /** 普通生图模型逐层提取；刷新只恢复已提交任务，不自动提交下一次付费请求。 */
    experimentalLayerPlan?: {
        sourceNodeId: string;
        requests: Array<{
            nodeId: string;
            target: string;
            removeFromBackground?: boolean;
            extraction?: import("@/lib/canvas/canvas-image-layer-strategy").ImageLayerExtraction;
            generation?: import("@/lib/canvas/canvas-image-layers").ImageLayerGeneration;
        }>;
        errorSignature?: string;
        composedSignature?: string;
        plannerModel?: string;
        planningTaskId?: string;
        progress?: string;
    };
    layerExtraction?: {
        sourceNodeId: string;
        groupId: string;
        index: number;
        strategy?: import("@/lib/canvas/canvas-image-layer-strategy").ImageLayerExtraction;
        source?: import("@/lib/canvas/canvas-image-layer-strategy").ImageLayerSource;
        backgroundPatch?: import("@/lib/canvas/canvas-image-layer-strategy").ImageLayerBackgroundPatch;
        allowBackgroundRemoval?: boolean;
        backgroundRemovalModel?: string;
        phase?: "extract" | "background-removal-required" | "remove-background" | "complete";
        extractionTaskId?: string;
        /** 原任务资源与本地归一化/修补后的资源分开登记，不能沿用原素材身份。 */
        sourceResultStorageKey?: string;
        rejectedTaskId?: string;
        canvas?: { width: number; height: number };
    };
    imageLayerGroup?: {
        width: number;
        height: number;
        /** 从底到顶；x/y 为合成像素坐标，不是画布节点位置。 */
        layers: Array<{ nodeId: string; x: number; y: number; visible: boolean }>;
        compositeSignature?: string;
        compositeStatus?: "ready" | "updating" | "error";
        compositeError?: string;
        incomplete?: { completed: number; total: number; failed: number; missingBackground: boolean };
    };
    imageLayer?: { groupId: string; outputIndex: number; kind?: "base" | "transparent" };
    /** 裁切素材与完整画布尺寸的图层合成分别保存。 */
    imageLayerMaterials?: { auto?: boolean; status?: "loading" | "ready" | "error"; groupId?: string; error?: string };
    imageLayerMaterial?: { sourceLayerId: string; sourceGroupId: string; bounds: { left: number; top: number; width: number; height: number } };
    storageKey?: string;
    outputIndex?: number;
    mimeType?: string;
    bytes?: number;
    durationMs?: number;
    /** Whether the video file contains an audio track when this is known. */
    hasAudio?: boolean;
    waveform?: number[];
    waveformVersion?: number;
    imageRotation?: number;
    assetId?: string;
    assetTags?: string[];
    assetCategory?: AssetCategory;
    workflowKind?: CanvasWorkflowKind;
    workflowTitle?: string;
    workflowDescription?: string;
    stylePresetId?: string;
    styleProfileJson?: string;
    styleExecutionPlan?: StyleExecutionPlan;
    skillIds?: string[];
    skillVersions?: Array<{ skillId: string; versionId: string; version: string }>;
    skillFiles?: Array<{ skillId: string; path: string; sha256?: string }>;
    chapterId?: string;
    chapterTitle?: string;
    shotIndex?: number;
    sceneId?: string;
    characterIds?: string[];
    referenceSetId?: string;
    referenceAssetNodeIds?: string[];
    assetBindings?: StoryboardAssetBinding[];
    characterName?: string;
    characterPrompt?: string;
    characterAliases?: string[];
    characterDefinition?: Record<string, unknown>;
    characterAssetId?: string;
    characterVersionId?: string;
    characterVersionPolicy?: "current" | "pinned";
    characterVisualStatus?: string;
    characterVoiceStatus?: string;
    characterVoiceName?: string;
    characterVoiceProfile?: {
        name: string;
        provider: string;
        language: string;
        timbre: string;
    };
    characterVoiceInstructions?: string;
    characterCoverUrl?: string;
    characterView?: "front" | "side" | "back" | "multi";
    characterViewNodeIds?: {
        front?: string;
        side?: string;
        back?: string;
    };
    actionBoardRows?: number;
    actionBoardColumns?: number;
    taskId?: string;
    taskClientOperationId?: string;
    retryOf?: string;
    attemptGroupId?: string;
    taskStatus?: "queued" | "running" | "succeeded" | "failed" | "cancelled" | string;
    taskProgress?: number;
    taskStage?: string;
    taskMediaStage?: string;
    taskCanRecoverMedia?: boolean;
    taskProvider?: string;
    taskStartedAt?: string;
    taskCompletedAt?: string;
    taskDurationMs?: number;
    taskErrorCode?: string;
    taskErrorField?: string;
    requiredMicrocredits?: number;
    availableMicrocredits?: number;
    taskBilling?: { status: string; amountMicrocredits: number };
    taskOfficialStatus?: "pending" | "processing" | "completed" | "failed" | "cancelled";
    taskReceiptRecorded?: boolean;
    taskCreatedAt?: string;
    taskUpdatedAt?: string;
    generationEffectKeys?: string[];
    agentGenerationContinuation?: {
        id: string;
        taskId: string;
        conversationId?: string;
        messageId?: string;
        source?: "online" | "local";
        status: "pending" | "completed" | "failed";
        effectKey?: string;
    };
    sessionId?: string;
    videoEditOperation?: CanvasVideoEditOperation;
    videoRemake?: boolean;
    arkPrivateAssetUpload?: string;
    videoCameraMoveId?: string;
    videoCameraMovePrompt?: string;
    videoStartFrameNodeId?: string;
    videoEndFrameNodeId?: string;
    videoFrameSourceNodeId?: string;
    videoFrameTimeMs?: number;
    versionOfNodeId?: string;
    versionLabel?: string;
    versionPrimary?: boolean;
    copiedFromNodeId?: string;
    generationResultPlacement?: "replace-node" | "new-version";
    directorSceneId?: string;
    directorWorldEngine?: boolean;
    directorDownstream?: { sourceNodeId: string; shotId?: string; segmentIds?: string[] };
    directorWorldRecording?: { shotId: string; sceneUpdatedAt: string; storageKey: string };
    directorShotId?: string;
    directorPreviewNodeId?: string;
    directorThumbnail?: import("@/lib/canvas/director/director-thumbnail").DirectorThumbnail;
    directorPrevis?: { url: string; storageKey: string; shotId: string; fingerprint: string };
    directorPrevisByShot?: Record<string, NonNullable<CanvasNodeMetadata["directorPrevis"]>>;
    directorCharacterNodeIds?: string[];
    directorDepthNodeId?: string;
    directorDepthVideoNodeId?: string;
    directorNormalNodeId?: string;
    directorClayVideoNodeId?: string;
    directorSourceStoryboardNodeId?: string;
    directorSourceStoryboardRowId?: string;
    directorOutputKind?: "beauty" | "clay";
    subtitleEntries?: SrtEntry[];
    subtitleHighlights?: SubtitleHighlight[];
    subtitleStyle?: SubtitleStyle;
    subtitleUpdatedAt?: string;
    skillId?: string;
    skillVersion?: number;
    skillSnapshot?: CanvasSkillSnapshot;
    /** 图表节点的图形类型，缺省柱状图。落盘字段——新增扩展节点的自有字段都要在这里声明。 */
    chartKind?: "bar" | "line";
    /** 调色节点的参数；缺省视为未调色。 */
    colorGrade?: CanvasColorGrade;
    depthReferenceVideo?: boolean;
    mediaConversion?: MediaConversionNodeState;
    /** 用户手动拉伸过尺寸；图片按真实比例自动适配时避让它。 */
    manualSize?: boolean;
    storyboard?: StoryboardData;
    storyboardShotDuration?: StoryboardShotDuration;
    storyboardShotCount?: StoryboardShotCount;
    storyboardVideoInputMode?: StoryboardVideoInputMode;
    storyboardComposerHeight?: number;
    generationBatches?: CanvasGenerationBatch[];
    batchTable?: CanvasBatchTableData;
    batchSourceNodeId?: string;
    batchRowId?: string;
    batchOperation?: CanvasBatchOperation;
    batchInputNodeIds?: string[];
    frame?: {
        color?: "blue" | "green" | "violet" | "amber" | "rose" | "teal" | "slate";
        collapsed: boolean;
        expandedWidth: number;
        expandedHeight: number;
    };
    folder?: {
        style: CanvasFolderStyle;
        theme?: CanvasFolderTheme;
        createdAt: string;
        // 自定义主题资源覆盖预置主题；目录内容永远从 childNodes 读取。
        themeCover?: string;
        assetFolderId?: string;
        projectId?: string;
    };
    drawingId?: string;
    drawingEngine?: "tldraw" | "excalidraw";
    drawingRevision?: number;
    drawingUpdatedAt?: string;
    drawingPreviewStorageKey?: string;
    drawingPreviewUrl?: string;
    drawingShapeCount?: number;
    drawingPageCount?: number;
    emotionEdit?: {
        sourceNodeId: string;
        characterName: string;
        presetId: string;
        intimacy: number;
        arousal: number;
        label: string;
        faceBox: {
            id: string;
            x: number;
            y: number;
            width: number;
            height: number;
            confidence?: number;
            source: "detected" | "manual";
        };
        editRegion?: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        sourceWidth?: number;
        sourceHeight?: number;
        providerSize?: string;
        maskStorageKey?: string;
        editMode?: "provider-mask" | "local-composite";
    };
    portraitTexture?: PortraitTextureSettings;
    /** AI 审美批改节点只保存当前报告和输入指纹，不保存图片二进制。 */
    artCritique?: ArtCritiqueNodeState;
    /** 摄像机控制选项，启用后生成时自动追加摄影机/镜头/焦距/光圈提示词。 */
    cameraControl?: CameraControlOptions;
    /** 全景节点配置：投影方式、生成方式和比例兜底开关。 */
    panoramaConfig?: {
        projection: "spherical" | "cylindrical";
        sourceMode: "ai" | "image";
        smartBase: boolean;
        directImageUrl?: string | null;
    };
    /** 肖像排查节点只保存可恢复的 UI 状态，不保存图片、embedding 或完整结果。 */
    portraitClearance?: PortraitClearanceNodeState;
};

export type CanvasNodeData = {
    id: string;
    type: CanvasNodeTypeId;
    title: string;
    createdAt?: string;
    updatedAt?: string;
    position: Position;
    width: number;
    height: number;
    parentId?: string;
    metadata?: CanvasNodeMetadata;
};

export type CanvasConnection = {
    id: string;
    fromNodeId: string;
    toNodeId: string;
    fromHandleId?: string;
    toHandleId?: string;
    fromAnchorRatio?: number;
    toAnchorRatio?: number;
    relation?: "storyboard-output" | "storyboard-asset-reference" | "batch-output" | "director-output";
    storyboardRowId?: string;
};

export type CanvasDisplayConnection = {
    connection: CanvasConnection;
    from: CanvasNodeData;
    to: CanvasNodeData;
};

export type CanvasAssistantReference = {
    id: string;
    type: CanvasNodeTypeId;
    title: string;
    dataUrl?: string;
    storageKey?: string;
    text?: string;
};

export type CanvasAssistantMessage = {
    id: string;
    role: "user" | "assistant" | "system" | "tool" | "error";
    title?: string;
    text: string;
    meta?: string;
    detail?: unknown;
    references?: CanvasAssistantReference[];
};

export type CanvasAssistantPendingBackendSession = {
    id: string;
    kind: "cinematic";
    messageId: string;
    status: "pending";
    startedAt: string;
};

export type CanvasAssistantSession = {
    id: string;
    title: string;
    messages: CanvasAssistantMessage[];
    pendingBackendSession?: CanvasAssistantPendingBackendSession;
    generationEffectKeys?: string[];
    createdAt: string;
    updatedAt: string;
};

export type ConnectionHandle = {
    nodeId: string;
    handleType: "source" | "target";
    handleId?: string;
    anchorRatio?: number;
};

export type CanvasSelectionStrategy = "replace" | "add" | "toggle" | "subtract";
export type CanvasSelectionHitMode = "contain" | "intersect";

export type SelectionBox = {
    startWorldX: number;
    startWorldY: number;
    currentWorldX: number;
    currentWorldY: number;
    strategy: CanvasSelectionStrategy;
    hitMode: CanvasSelectionHitMode;
    initialSelectedNodeIds: string[];
};

export type ContextMenuState =
    | {
          type: "canvas";
          x: number;
          y: number;
          position: Position;
          createOpen?: boolean;
      }
    | {
          type: "node";
          x: number;
          y: number;
          nodeId: string;
      }
    | {
          type: "connection";
          x: number;
          y: number;
          connectionId: string;
      };
