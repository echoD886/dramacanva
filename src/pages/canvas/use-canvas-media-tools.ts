import { currentLocaleText as upstreamText } from "@/i18n/current-locale-text";
import { extractResourceFrames, transformResourceImage } from "@/services/api/resources";
import { processedImageResource, processingSourceIds } from "@/services/processing-media";
import type { CanvasImageLayerDecompositionPayload } from "@/components/canvas/canvas-node-layer-decomposition-dialog";
import { resetGenerationTaskMetadata } from "@/lib/canvas/canvas-task-state";
import { resolveImageRequestSize } from "@/services/api/image-validation";
import { prepareImageLayerPlanningReference, readImageLayerPlanningHistory } from "@/services/canvas-image-layer-planning";
import { calibrateImageLayerPlan } from "@/services/canvas-image-layer-source";
import { inspectImageLayer } from "@/services/canvas-image-layer-compositor";
import { runImageLayerExtraction } from "@/services/canvas-image-layer-extraction";
import { imageLayerBackgroundPatch, imageLayerExtractionTargets, resolveImageLayerExtractions, type ImageLayerExtraction } from "@/lib/canvas/canvas-image-layer-strategy";
import {
    applyImageLayerPlanningPurpose,
    imageLayerOutputSize,
    imageLayerPlannerError,
    imageLayerPlanningPrompt,
    imageLayerPlanTargets,
    imageLayerTargetName,
    parseImageLayerPlan,
    type ImageLayerPlanningOptions,
} from "@/lib/canvas/canvas-image-layer-plan";
import { experimentalLayerPrompt, imageLayerGenerationConfig, imageLayerProviderMetadata, parseExperimentalLayerTargets, layerDecompositionConfig, supportsExperimentalLayerExtraction, supportsLayerDecomposition } from "@/lib/canvas/canvas-image-layers";
import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { App } from "antd";
import { nanoid } from "nanoid";

import type { CanvasImageCropRect } from "@/components/canvas/canvas-node-crop-dialog";
import type { CanvasImageMaskEditPayload } from "@/components/canvas/canvas-node-mask-edit-dialog";
import type { ImageSplitParams as CanvasImageSplitParams } from "@/lib/canvas/canvas-image-data";
import type { CanvasImageUpscaleParams } from "@/components/canvas/canvas-node-upscale-dialog";
import type { CanvasImageAngleParams } from "@/components/canvas/canvas-node-angle-dialog";
import type { CanvasVideoSegmentParams } from "@/components/canvas/canvas-video-segment-dialog";
import { buildLightingLabel, type CanvasImageLightingOptions } from "@/components/canvas/canvas-node-lighting-dialog";
import { useI18n } from "@/i18n/use-i18n";
import { currentLocaleText } from "@/i18n/current-locale-text";
import { localizedGenerationError } from "@/i18n/generation-error";
import type { CanvasImageEmotionPayload } from "@/components/canvas/canvas-node-emotion-panel";
import type { PanoramaGenerateConfig } from "@/components/canvas/canvas-panorama-config-modal";
import type { CanvasVideoFrameParams } from "@/components/canvas/canvas-video-frame-dialog";
import { NODE_DEFAULT_SIZE } from "@/constant/canvas";
import { cropDataUrl, splitDataUrl, upscaleDataUrl } from "@/lib/canvas/canvas-image-data";
import { isValidGridSplit, layoutGridSplitCells } from "@/lib/canvas/canvas-grid-split";
import { audioMetadata, imageMetadata, videoMetadata, buildSourceImageLayerNodeResult } from "@/lib/canvas/canvas-generation-task-sync";
import { appendNodesWithoutOverlap, findAvailableGenerationGroupPosition, imageGenerationChildPosition, imageGenerationGroupSize } from "@/lib/canvas/canvas-generation-layout";
import { canvasGenerationPromptMetadata } from "@/lib/canvas/canvas-generation-submission";
import { cancelIncompleteImageBatch } from "@/lib/canvas/canvas-image-batch-retry";
import { buildAngleLabel, buildAnglePrompt, createCanvasNode } from "@/lib/canvas/canvas-project-domain";
import { validateVideoSegmentBatch } from "@/lib/canvas/canvas-video-regeneration";
import { resolveCanvasStyleExecution } from "@/lib/canvas/canvas-style-execution";
import { buildGenerationConfig, buildImageGenerationMetadata, nodeReferenceImage, isGenerationCanceled, runBackendCanvasGenerationTask, runCanvasGenerationTaskToConsumer } from "@/lib/canvas/canvas-project-generation";
import { buildNodeGenerationEffectivePrompt, nodeGenerationReferencePromptLimit } from "@/components/canvas/canvas-node-generation";
import { fitNodeSize, VIDEO_NODE_MAX_SIZE } from "@/lib/canvas/canvas-node-size";
import { compositeEmotionImage, emotionGenerationSize, emotionProviderMask, normalizeEmotionPromptForProvider, resolveEmotionEditPlan } from "@/lib/canvas/canvas-emotion";
import { DEFAULT_PORTRAIT_TEXTURE_SETTINGS } from "@/lib/canvas/canvas-portrait-texture";
import { createPortraitTextureNode } from "@/lib/canvas/canvas-image-source";
import { captureVideoFrames } from "@/lib/canvas/canvas-video-frame";
import { buildVideoFrameNodes } from "@/lib/canvas/canvas-video-frame-nodes";
import { mergeVideos, type MergeVideoProgress } from "@/lib/canvas/canvas-video-merge";
import { extractVideoAudio, trimVideoSegment } from "@/lib/canvas/canvas-video-segment";
import { generationErrorMessage, generationFailureMetadata } from "@/lib/generation-error";
import { modelCapabilityConfigFor } from "@/lib/model-capabilities";
import { defaultImageParamsForModel, modelCompatibilityError } from "@/lib/model-selection";
import { navigateToSettings } from "@/lib/settings-navigation";
import { storeGeneratedVideo } from "@/services/api/video";
import { getMediaBlob, uploadMediaFile } from "@/services/file-storage";
import { getImageBlob, uploadImage } from "@/services/image-storage";
import { requireCanvasGenerationAccount } from "@/services/guest-canvas-handoff";
import { ensureCanvasNodeAsset } from "@/services/project-asset-sync";
import type { GenerationTask } from "@/services/api/task-center";

function normalizeMaskEditQuality(quality: string | undefined, size: string | undefined) {
    const value = String(quality || "")
        .trim()
        .toLowerCase();
    if (value && value !== "auto" && value !== "any") return value;
    const match = String(size || "")
        .trim()
        .toLowerCase()
        .match(/^(\d+)x(\d+)$/);
    if (!match) return quality || "auto";
    const pixels = Number(match[1]) * Number(match[2]);
    return pixels <= 2_000_000 ? "1k" : pixels <= 4_300_000 ? "2k" : pixels <= 8_294_400 ? "4k" : quality || "auto";
}
import { defaultConfig, resolveModelRequestConfig, useConfigStore, useEffectiveConfig, type AiConfig } from "@/stores/use-config-store";
import { CanvasNodeType, type CanvasConnection, type CanvasNodeData, type ContextMenuState } from "@/types/canvas";
import type { StartCanvasUploadStatus } from "./use-canvas-upload";

type UseCanvasMediaToolsOptions = {
    projectId: string;
    domainProjectId?: string;
    nodesRef: { current: CanvasNodeData[] };
    connectionsRef: { current: CanvasConnection[] };
    selectedNodeIdsRef: { current: Set<string> };
    setNodes: Dispatch<SetStateAction<CanvasNodeData[]>>;
    setConnections: Dispatch<SetStateAction<CanvasConnection[]>>;
    setSelectedNodeIds: Dispatch<SetStateAction<Set<string>>>;
    setSelectedConnectionId: Dispatch<SetStateAction<string | null>>;
    setDialogNodeId: Dispatch<SetStateAction<string | null>>;
    setContextMenu: Dispatch<SetStateAction<ContextMenuState | null>>;
    setHoveredNodeId: Dispatch<SetStateAction<string | null>>;
    setToolbarNodeId: Dispatch<SetStateAction<string | null>>;
    setRunningNodeId: Dispatch<SetStateAction<string | null>>;
    startUploadStatus: StartCanvasUploadStatus;
    startGenerationRequest: (targetNodeId: string, originNodeId: string, runningId?: string, controller?: AbortController) => AbortController;
    finishGenerationRequest: (targetNodeId: string, controller: AbortController) => void;
    bindGenerationTask: (targetNodeId: string, task: GenerationTask) => void;
    applyGenerationTaskResult: (targetNodeId: string, task: GenerationTask) => Promise<void>;
};

const NODE_STATUS_LOADING = "loading" as const;
const NODE_STATUS_SUCCESS = "success" as const;
const NODE_STATUS_ERROR = "error" as const;
const NODE_STATUS_IDLE = "idle" as const;

export function useCanvasMediaTools({
    projectId,
    domainProjectId,
    nodesRef,
    connectionsRef,
    selectedNodeIdsRef,
    setNodes,
    setConnections,
    setSelectedNodeIds,
    setSelectedConnectionId,
    setDialogNodeId,
    setContextMenu,
    setHoveredNodeId,
    setToolbarNodeId,
    setRunningNodeId,
    startUploadStatus,
    startGenerationRequest,
    finishGenerationRequest,
    bindGenerationTask,
    applyGenerationTaskResult,
}: UseCanvasMediaToolsOptions) {
    const { t } = useI18n();
    const { message } = App.useApp();
    const ensureGenerationAccount = useCallback(async () => {
        try {
            return await requireCanvasGenerationAccount(projectId);
        } catch (error) {
            message.error(error instanceof Error ? error.message : currentLocaleText("miscPages.guestPrepareFailed"));
            return false;
        }
    }, [message, projectId]);
    const effectiveConfig = useEffectiveConfig();
    const isAiConfigReady = useConfigStore((state) => state.isAiConfigReady);
    const extractingVideoFramesNodeIdRef = useRef<string | null>(null);
    const mergeVideoRunningRef = useRef(false);
    const layerSubmissionIds = useRef(new Set<string>());
    const [activeLayerGroupIds, setActiveLayerGroupIds] = useState<ReadonlySet<string>>(new Set());
    const [layerDecompositionNodeId, setLayerDecompositionNodeId] = useState<string | null>(null);
    const [cropNodeId, setCropNodeId] = useState<string | null>(null);
    const [annotationNodeId, setAnnotationNodeId] = useState<string | null>(null);
    const [maskEditNodeId, setMaskEditNodeId] = useState<string | null>(null);
    const [upscaleNodeId, setUpscaleNodeId] = useState<string | null>(null);
    const [angleNodeId, setAngleNodeId] = useState<string | null>(null);
    const [lightingNodeId, setLightingNodeId] = useState<string | null>(null);
    const [emotionNodeId, setEmotionNodeId] = useState<string | null>(null);
    const [frameDialogNodeId, setFrameDialogNodeId] = useState<string | null>(null);
    const [extractingVideoFramesNodeId, setExtractingVideoFramesNodeId] = useState<string | null>(null);
    const [mergeVideoProgress, setMergeVideoProgress] = useState<MergeVideoProgress | null>(null);
    const [segmentDialogNodeId, setSegmentDialogNodeId] = useState<string | null>(null);
    const [segmentDialogMode, setSegmentDialogMode] = useState<"audio" | "video" | null>(null);
    const [segmentRunningMode, setSegmentRunningMode] = useState<"audio" | "video" | null>(null);
    const segmentRunningRef = useRef(false);
    const [panoramaConfigNodeId, setPanoramaConfigNodeId] = useState<string | null>(null);

    const resolveImageEditStyle = useCallback(
        (node: CanvasNodeData, prompt: string, config: AiConfig) => {
            try {
                const runtime = resolveCanvasStyleExecution(nodesRef.current, node, prompt, config, "image");
                return {
                    prompt: runtime?.prompt || prompt,
                    metadata: runtime ? { styleProfileJson: runtime.profileJson, styleExecutionPlan: runtime.plan } : {},
                };
            } catch (error) {
                message.error(localizedGenerationError(error, t));
                return null;
            }
        },
        [message, nodesRef],
    );

    const persistMediaNodes = useCallback(
        async (mediaNodes: CanvasNodeData[]) => {
            const assetIds = new Map<string, string>();
            for (const mediaNode of mediaNodes) {
                try {
                    const result = await ensureCanvasNodeAsset({ canvasId: projectId, domainProjectId, node: mediaNode, source: "canvas-manual" });
                    assetIds.set(mediaNode.id, result.assetId);
                } catch (error) {
                    message.warning(currentLocaleText("canvasExtra.mediaTools.assetWriteFailed", { error: error instanceof Error ? error.message : currentLocaleText("canvasExtra.mediaTools.unknownError") }));
                }
            }
            if (assetIds.size > 0) {
                setNodes((current) =>
                    current.map((item) => {
                        const assetId = assetIds.get(item.id);
                        return assetId ? { ...item, metadata: { ...item.metadata, assetId } } : item;
                    }),
                );
            }
            return assetIds;
        },
        [domainProjectId, message, projectId, setNodes],
    );

    const createImageReversePromptNodes = useCallback(
        (node: CanvasNodeData) => {
            if (node.type !== CanvasNodeType.Image || !node.metadata?.content) {
                message.warning(currentLocaleText("canvasExtra.mediaTools.imageNodeEmptyReverse"));
                return;
            }
            const gap = 96;
            const textSpec = NODE_DEFAULT_SIZE[CanvasNodeType.Text];
            const resultSpec = NODE_DEFAULT_SIZE[CanvasNodeType.Text];
            const centerY = node.position.y + node.height / 2;
            const reverseInstruction = currentLocaleText("canvasExtra.mediaTools.reversePromptInstruction");
            const textNode = {
                ...createCanvasNode(CanvasNodeType.Text, { x: node.position.x + node.width + gap + textSpec.width / 2, y: centerY }, { content: reverseInstruction, prompt: reverseInstruction, status: NODE_STATUS_SUCCESS, fontSize: 14 }),
                title: currentLocaleText("canvasExtra.mediaTools.reversePromptTitle"),
            };
            const resultNode = {
                ...createCanvasNode(
                    CanvasNodeType.Text,
                    { x: textNode.position.x + textNode.width + gap + resultSpec.width / 2, y: centerY },
                    {
                        content: "",
                        generationMode: "text",
                        model: effectiveConfig.textModel || effectiveConfig.model || defaultConfig.textModel,
                        count: 1,
                        composerContent: currentLocaleText("canvasExtra.mediaTools.reversePromptComposer", { image: "@图片1", text: upstreamText("canvasExtra.canvas.textRefToken") }),
                    },
                ),
                title: currentLocaleText("canvasExtra.mediaTools.reversePromptResultTitle"),
            };
            setNodes((current) => appendNodesWithoutOverlap(current, [textNode, resultNode]));
            setConnections((current) => [...current, { id: nanoid(), fromNodeId: node.id, toNodeId: resultNode.id }, { id: nanoid(), fromNodeId: textNode.id, toNodeId: resultNode.id }]);
            setSelectedNodeIds(new Set([resultNode.id]));
            setSelectedConnectionId(null);
            setDialogNodeId(resultNode.id);
            setContextMenu(null);
        },
        [effectiveConfig.model, effectiveConfig.textModel, message, setConnections, setContextMenu, setDialogNodeId, setNodes, setSelectedConnectionId, setSelectedNodeIds],
    );

    const openPortraitTextureEditor = useCallback(
        (node: CanvasNodeData) => {
            if (node.type !== CanvasNodeType.Image || !node.metadata?.content) {
                message.warning(currentLocaleText("canvasExtra.mediaTools.imageNodeEmptyTexture"));
                return;
            }
            const portraitTextureSettings = { ...DEFAULT_PORTRAIT_TEXTURE_SETTINGS, ...node.metadata?.portraitTexture };
            const child = createPortraitTextureNode(node, nanoid());
            child.metadata = { ...child.metadata, portraitTexture: portraitTextureSettings };
            setHoveredNodeId(null);
            setToolbarNodeId(null);
            setNodes((current) => appendNodesWithoutOverlap(current, [child]));
            setConnections((current) => [...current, { id: nanoid(), fromNodeId: node.id, toNodeId: child.id }]);
            setSelectedNodeIds(new Set([child.id]));
            setSelectedConnectionId(null);
            setDialogNodeId(child.id);
        },
        [message, setConnections, setDialogNodeId, setHoveredNodeId, setNodes, setSelectedConnectionId, setSelectedNodeIds, setToolbarNodeId],
    );

    const cropImageNode = useCallback(
        async (node: CanvasNodeData, crop: CanvasImageCropRect) => {
            if (!node.metadata?.content) return;
            // 云端图片地址通常不带 CORS 头，直接画到 canvas 会被判定为跨域而无法导出。
            // 优先用本地缓存里的 Blob 构造同源地址，裁剪才能读取像素。
            let releaseSource = () => {};
            try {
                const sourceId = processingSourceIds(node.metadata?.storageKey, node.metadata?.content)[0];
                const remote = sourceId ? await transformResourceImage(`resource:${sourceId}`, { operation: "crop", crop }) : null;
                const image = remote
                    ? processedImageResource(remote[0])
                    : await (async () => {
                          const source = await resolveCroppableImageSource(node);
                          releaseSource = source.release;
                          return uploadImage(await cropDataUrl(source.url, crop));
                      })();
                const size = fitNodeSize(image.width, image.height, node.width, node.height);
                const childId = nanoid();
                const child: CanvasNodeData = {
                    id: childId,
                    type: CanvasNodeType.Image,
                    title: `${node.title || currentLocaleText("canvasExtra.mediaTools.defaultImageTitle")}${currentLocaleText("canvasExtra.mediaTools.titleCropSuffix")}`,
                    position: { x: node.position.x + node.width + 96, y: node.position.y },
                    width: size.width,
                    height: size.height,
                    metadata: { ...imageMetadata(image), prompt: node.metadata?.prompt },
                };
                setNodes((current) => appendNodesWithoutOverlap(current, [child]));
                setConnections((current) => [...current, { id: nanoid(), fromNodeId: node.id, toNodeId: childId }]);
                setSelectedNodeIds(new Set([childId]));
                setDialogNodeId(childId);
                setCropNodeId(null);
                await persistMediaNodes([child]);
            } catch (error) {
                message.error(error instanceof Error ? currentLocaleText("canvasExtra.mediaTools.cropFailed", { reason: error.message }) : currentLocaleText("canvasExtra.mediaTools.cropFailedRetry"));
            } finally {
                releaseSource();
            }
        },
        [message, persistMediaNodes, setConnections, setDialogNodeId, setNodes, setSelectedNodeIds],
    );

    const saveAnnotatedImageNode = useCallback(
        async (node: CanvasNodeData, dataUrl: string) => {
            const image = await uploadImage(dataUrl);
            const size = fitNodeSize(image.width, image.height, node.width, node.height);
            const childId = nanoid();
            const child: CanvasNodeData = {
                id: childId,
                type: CanvasNodeType.Image,
                title: `${node.title || currentLocaleText("canvasExtra.mediaTools.defaultImageTitle")}${currentLocaleText("canvasExtra.mediaTools.titleAnnotateSuffix")}`,
                position: { x: node.position.x + node.width + 96, y: node.position.y },
                width: size.width,
                height: size.height,
                metadata: { ...imageMetadata(image), prompt: node.metadata?.prompt },
            };
            setNodes((current) => appendNodesWithoutOverlap(current, [child]));
            setConnections((current) => [...current, { id: nanoid(), fromNodeId: node.id, toNodeId: childId }]);
            setSelectedNodeIds(new Set([childId]));
            setSelectedConnectionId(null);
            setDialogNodeId(null);
            setAnnotationNodeId(null);
            await persistMediaNodes([child]);
            message.success(currentLocaleText("canvasExtra.mediaTools.annotatedSaved"));
        },
        [message, persistMediaNodes, setConnections, setDialogNodeId, setNodes, setSelectedConnectionId, setSelectedNodeIds],
    );

    const openVideoFrameExtractor = useCallback(
        (node: CanvasNodeData) => {
            if (!node.metadata?.content) {
                message.warning(currentLocaleText("canvasExtra.mediaTools.videoNodeEmptyExtract"));
                return;
            }
            if (extractingVideoFramesNodeIdRef.current) return;
            setHoveredNodeId(null);
            setToolbarNodeId(null);
            setFrameDialogNodeId(node.id);
        },
        [message, setHoveredNodeId, setToolbarNodeId],
    );

    const closeFrameDialog = useCallback(() => {
        if (extractingVideoFramesNodeIdRef.current) return;
        setFrameDialogNodeId(null);
    }, []);

    const extractVideoFrames = useCallback(
        async (node: CanvasNodeData, params: CanvasVideoFrameParams) => {
            const content = node.metadata?.content;
            if (!content || extractingVideoFramesNodeIdRef.current || !params.timesMs.length) return;
            const progress = startUploadStatus(currentLocaleText("canvasExtra.mediaTools.extractFramesTitle"), currentLocaleText("canvasExtra.mediaTools.readVideoResource"), params.timesMs.length + 2);
            extractingVideoFramesNodeIdRef.current = node.id;
            setExtractingVideoFramesNodeId(node.id);
            setFrameDialogNodeId(null);
            try {
                const sourceId = processingSourceIds(node.metadata?.storageKey, content)[0];
                const sourceKey = sourceId ? `resource:${sourceId}` : node.metadata?.storageKey;
                const processingSources = processingSourceIds(sourceKey);
                progress.update(currentLocaleText("canvasExtra.mediaTools.drawSelectedFrames"), 2);
                const remote = processingSources.length ? await extractResourceFrames(sourceKey!, params.timesMs) : null;
                const storedBlob = !remote && sourceKey ? await getMediaBlob(sourceKey) : null;
                const captured = remote ? { frames: [], failures: remote.failures } : await captureVideoFrames(storedBlob || content, params.timesMs);
                const uploadedFrames = [];
                const uploadFailures: string[] = [];
                if (remote)
                    for (const { timeMs, resource } of remote.frames) {
                        uploadedFrames.push({ timeMs, image: processedImageResource(resource) });
                    }
                for (let index = 0; index < captured.frames.length; index += 1) {
                    const frame = captured.frames[index];
                    try {
                        progress.update(currentLocaleText("canvasExtra.mediaTools.saveFrameProgress", { index: index + 1, total: captured.frames.length }), index + 3);
                        uploadedFrames.push({ timeMs: frame.timeMs, image: await uploadImage(frame.blob, undefined, processingSources) });
                    } catch (error) {
                        uploadFailures.push(error instanceof Error ? error.message : currentLocaleText("canvasExtra.mediaTools.frameUploadFailed"));
                    }
                }
                const frameNodes = buildVideoFrameNodes(node, uploadedFrames);
                if (!frameNodes.length) throw new Error(uploadFailures[0] || currentLocaleText("canvasExtra.mediaTools.frameSaveFailed"));
                const links = frameNodes.map((frameNode) => ({ id: nanoid(), fromNodeId: node.id, toNodeId: frameNode.id }));
                const nextNodes = [...nodesRef.current, ...frameNodes];
                const nextConnections = [...connectionsRef.current, ...links];
                const selection = new Set(frameNodes.map((frameNode) => frameNode.id));
                nodesRef.current = nextNodes;
                connectionsRef.current = nextConnections;
                selectedNodeIdsRef.current = selection;
                setNodes(nextNodes);
                setConnections(nextConnections);
                setSelectedNodeIds(selection);
                setSelectedConnectionId(null);
                await persistMediaNodes(frameNodes);
                const failedCount = captured.failures.length + uploadFailures.length;
                progress.done(failedCount ? currentLocaleText("canvasExtra.mediaTools.framesExtractedFailed", { count: frameNodes.length, failed: failedCount }) : currentLocaleText("canvasExtra.mediaTools.framesExtracted", { count: frameNodes.length }));
                if (failedCount) message.warning(currentLocaleText("canvasExtra.mediaTools.timePointsFailed", { failed: failedCount }));
            } catch (error) {
                const details = error instanceof Error ? error.message : currentLocaleText("canvasExtra.mediaTools.extractFramesFailedGeneric");
                progress.fail(details);
                message.error(details);
            } finally {
                extractingVideoFramesNodeIdRef.current = null;
                setExtractingVideoFramesNodeId(null);
            }
        },
        [connectionsRef, message, nodesRef, persistMediaNodes, selectedNodeIdsRef, setConnections, setNodes, setSelectedConnectionId, setSelectedNodeIds, startUploadStatus],
    );

    const depthJob = useRef<AbortController | null>(null);
    useEffect(() => () => depthJob.current?.abort(), [projectId]);
    const extractVideoDepth = async (node: CanvasNodeData) => {
        if (depthJob.current || !node.metadata?.content) return;
        const controller = new AbortController();
        depthJob.current = controller;
        const title = t("canvasExtra.tool.depthCapture");
        const progress = startUploadStatus(title, t("canvasExtra.mediaTools.readVideoResource"), 100);
        try {
            const { captureDepthFromNode } = await import("@/services/video-depth-capture");
            const uploaded = await captureDepthFromNode(node, (percent) => progress.update(title, percent), controller.signal);
            controller.signal.throwIfAborted();
            const output = createCanvasNode(CanvasNodeType.Video, node.position, { ...videoMetadata(uploaded), depthReferenceVideo: true, status: NODE_STATUS_SUCCESS });
            output.title = `${node.title} · ${title}`;
            output.position = { x: node.position.x + node.width + 96, y: node.position.y };
            setNodes((current) => appendNodesWithoutOverlap(current, [output]));
            setConnections((current) => [...current, { id: nanoid(), fromNodeId: node.id, toNodeId: output.id }]);
            setSelectedNodeIds(new Set([output.id]));
            progress.done(title);
            await persistMediaNodes([output]);
        } catch (error) {
            progress.fail(error instanceof Error ? error.message : t("canvasExtra.mediaConv.conversionFailedError"));
        } finally {
            depthJob.current = null;
        }
    };

    const extractAudioFromVideo = useCallback(
        (node: CanvasNodeData) => {
            if (!node.metadata?.content) {
                message.warning(currentLocaleText("canvasExtra.mediaTools.videoNodeEmptyAudio"));
                return;
            }
            if (segmentRunningRef.current) return;
            setHoveredNodeId(null);
            setToolbarNodeId(null);
            setSegmentDialogNodeId(node.id);
            setSegmentDialogMode("audio");
        },
        [message, setHoveredNodeId, setToolbarNodeId],
    );

    const openVideoSegmentExtractor = useCallback(
        (node: CanvasNodeData) => {
            if (!node.metadata?.content) {
                message.warning(currentLocaleText("canvasExtra.mediaTools.videoNodeEmptySegment"));
                return;
            }
            if (segmentRunningRef.current) return;
            setHoveredNodeId(null);
            setToolbarNodeId(null);
            setSegmentDialogNodeId(node.id);
            setSegmentDialogMode("video");
        },
        [message, setHoveredNodeId, setToolbarNodeId],
    );

    const closeSegmentDialog = useCallback(() => {
        if (segmentRunningRef.current) return;
        setSegmentDialogNodeId(null);
        setSegmentDialogMode(null);
    }, []);

    // 从视频片段提取声音：FFmpeg 提取 MP3 → 上传为音频资源 → 创建音频节点 → 写入素材库/项目资产。
    const runExtractVideoAudio = useCallback(
        async (node: CanvasNodeData, params: CanvasVideoSegmentParams) => {
            const progress = startUploadStatus(currentLocaleText("canvasExtra.mediaTools.extractAudioTitle"), currentLocaleText("canvasExtra.mediaTools.loadFfmpeg"), 4);
            try {
                const mp3 = await extractVideoAudio({ url: node.metadata?.content, storageKey: node.metadata?.storageKey }, { startMs: params.startMs, endMs: params.endMs }, node.metadata?.durationMs, (status) => {
                    progress.update(
                        status.phase === "loading"
                            ? currentLocaleText("canvasExtra.mediaTools.loadFfmpeg")
                            : status.phase === "reading"
                              ? currentLocaleText("canvasExtra.mediaTools.readVideoResource")
                              : currentLocaleText("canvasExtra.mediaTools.extractingAudio"),
                        status.phase === "encoding" ? 3 : 2,
                    );
                });
                progress.update(currentLocaleText("canvasExtra.mediaTools.uploadAudioToServer"), 4);
                const uploaded = await uploadMediaFile(mp3, "audio");
                const spec = NODE_DEFAULT_SIZE[CanvasNodeType.Audio];
                const audioNode = createCanvasNode(
                    CanvasNodeType.Audio,
                    { x: node.position.x + node.width + 96 + spec.width / 2, y: node.position.y + node.height / 2 },
                    { ...audioMetadata(uploaded), prompt: upstreamText("upstream.v165.message068", { p0: node.title || upstreamText("adminAnalytics.footVideos") }), status: NODE_STATUS_SUCCESS },
                );
                audioNode.title = `${node.title || currentLocaleText("canvasExtra.mediaTools.defaultVideoTitle")}${currentLocaleText("canvasExtra.mediaTools.titleAudioSuffix")}`;
                const audioNodeId = audioNode.id;
                setNodes((current) => appendNodesWithoutOverlap(current, [audioNode]));
                setConnections((current) => [...current, { id: nanoid(), fromNodeId: node.id, toNodeId: audioNodeId }]);
                setSelectedNodeIds(new Set([audioNodeId]));
                setSelectedConnectionId(null);
                try {
                    const result = await ensureCanvasNodeAsset({ canvasId: projectId, domainProjectId, node: audioNode, source: "canvas-manual" });
                    setNodes((current) => current.map((item) => (item.id === audioNodeId ? { ...item, metadata: { ...item.metadata, assetId: result.assetId } } : item)));
                    progress.done(result.linkedToProject ? currentLocaleText("canvasExtra.mediaTools.audioExtractedProject") : currentLocaleText("canvasExtra.mediaTools.audioExtracted"));
                } catch (assetError) {
                    progress.done(currentLocaleText("canvasExtra.mediaTools.audioNodeWriteFailed", { error: assetError instanceof Error ? assetError.message : currentLocaleText("canvasExtra.mediaTools.unknownError") }));
                }
            } catch (error) {
                const details = error instanceof Error ? error.message : currentLocaleText("canvasExtra.mediaTools.audioExtractFailed");
                progress.fail(details);
                message.error(details);
            }
        },
        [domainProjectId, message, projectId, setConnections, setSelectedConnectionId, setSelectedNodeIds, setNodes, startUploadStatus],
    );

    // 按段截取视频：默认只创建片段节点；用户明确选择时再附带创建待生成节点，生成任务仍由用户手动发起。
    const runTrimVideoSegments = useCallback(
        async (node: CanvasNodeData, params: CanvasVideoSegmentParams) => {
            const segments = params.segments || [];
            if (!segments.length) {
                message.warning(currentLocaleText("canvasExtra.mediaTools.addSegmentFirst"));
                return;
            }
            const createsGenerationNodes = params.action === "create-generation-nodes";
            const generationConfig = createsGenerationNodes ? buildGenerationConfig(effectiveConfig, node, "video") : null;
            const selectedConfig = generationConfig ? { ...generationConfig, model: params.model || generationConfig.model } : null;
            if (selectedConfig) {
                const batchError = validateVideoSegmentBatch(selectedConfig, segments, params.operation);
                if (batchError) {
                    message.warning(batchError);
                    return;
                }
            }
            const progress = startUploadStatus(currentLocaleText("canvasExtra.mediaTools.segmentTitle"), currentLocaleText("canvasExtra.mediaTools.loadFfmpeg"), segments.length * 4);
            try {
                const prepared: Array<{ segmentNode: CanvasNodeData; targetNode?: CanvasNodeData }> = [];
                const failedSegments: string[] = [];
                const spec = NODE_DEFAULT_SIZE[CanvasNodeType.Video];
                const baseX = node.position.x + node.width + 96;
                const baseY = node.position.y;
                const effectivePrompt = (params.prompt || upstreamText("upstream.v165.message069")).trim();
                for (let index = 0; index < segments.length; index += 1) {
                    const segment = segments[index];
                    try {
                        const sourceNode = segment.sourceNodeId ? nodesRef.current.find((item) => item.id === segment.sourceNodeId) : undefined;
                        const trimSource = sourceNode
                            ? { url: sourceNode.metadata?.content, storageKey: sourceNode.metadata?.storageKey }
                            : segment.sourceStorageKey || segment.sourceUrl
                              ? { url: segment.sourceUrl, storageKey: segment.sourceStorageKey }
                              : { url: node.metadata?.content, storageKey: node.metadata?.storageKey };
                        const trimDurationMs = sourceNode?.metadata?.durationMs || node.metadata?.durationMs;
                        progress.update(currentLocaleText("canvasExtra.mediaTools.loadFfmpegProgress", { index: index + 1, total: segments.length }), index * 4 + 1);
                        const mp4 = await trimVideoSegment(trimSource, { startMs: segment.startMs, endMs: segment.endMs }, trimDurationMs, (status) => {
                            progress.update(
                                status.phase === "loading"
                                    ? currentLocaleText("canvasExtra.mediaTools.loadFfmpegProgress", { index: index + 1, total: segments.length })
                                    : status.phase === "reading"
                                      ? currentLocaleText("canvasExtra.mediaTools.readVideoProgress", { index: index + 1, total: segments.length })
                                      : currentLocaleText("canvasExtra.mediaTools.trimmingProgress", { index: index + 1, total: segments.length }),
                                status.phase === "encoding" ? index * 4 + 3 : index * 4 + 2,
                            );
                        });
                        progress.update(currentLocaleText("canvasExtra.mediaTools.uploadSegmentProgress", { index: index + 1, total: segments.length }), index * 4 + 3);
                        const uploaded = await uploadMediaFile(mp4, "video");
                        const size = fitNodeSize(uploaded.width || 1280, uploaded.height || 720, VIDEO_NODE_MAX_SIZE.width, VIDEO_NODE_MAX_SIZE.height);
                        const segmentId = nanoid();
                        const segmentNode: CanvasNodeData = {
                            id: segmentId,
                            type: CanvasNodeType.Video,
                            title: `${sourceNode?.title || node.title || currentLocaleText("canvasExtra.mediaTools.defaultVideoTitle")}${currentLocaleText("canvasExtra.mediaTools.titleSegmentSuffix", { index: index + 1 })}`,
                            position: { x: baseX, y: baseY + index * (Math.max(size.height, spec.height) + 24) },
                            width: size.width,
                            height: size.height,
                            metadata: { ...videoMetadata(uploaded), prompt: upstreamText("upstream.v165.message070", { p0: sourceNode?.title || node.title || upstreamText("adminAnalytics.footVideos"), p1: index + 1 }), status: NODE_STATUS_SUCCESS },
                        };
                        const targetNode: CanvasNodeData | undefined =
                            selectedConfig && generationConfig
                                ? {
                                      id: nanoid(),
                                      type: CanvasNodeType.Video,
                                      title: currentLocaleText("canvasExtra.mediaTools.titlePendingGen", { index: index + 1, title: sourceNode?.title || node.title || currentLocaleText("canvasExtra.mediaTools.defaultVideoTitle") }),
                                      position: { x: segmentNode.position.x + size.width + 96, y: segmentNode.position.y + (size.height - spec.height) / 2 },
                                      width: spec.width,
                                      height: spec.height,
                                      metadata: { prompt: effectivePrompt, status: "idle", generationMode: "video", model: selectedConfig.model, videoEditOperation: params.operation, seconds: generationConfig.videoSeconds, size: generationConfig.size },
                                  }
                                : undefined;
                        prepared.push({ segmentNode, targetNode });
                    } catch (segmentError) {
                        failedSegments.push(segmentError instanceof Error ? segmentError.message : currentLocaleText("canvasExtra.mediaTools.trimFailed"));
                    }
                }
                if (!prepared.length) throw new Error(failedSegments[0] || currentLocaleText("canvasExtra.mediaTools.trimFailed"));
                const segmentNodes = prepared.map((item) => item.segmentNode);
                const targetNodes = prepared.flatMap((item) => (item.targetNode ? [item.targetNode] : []));
                const nextNodes = [...nodesRef.current, ...segmentNodes, ...targetNodes];
                const nextConnections = [
                    ...connectionsRef.current,
                    ...prepared.flatMap((item) => [{ id: nanoid(), fromNodeId: node.id, toNodeId: item.segmentNode.id }, ...(item.targetNode ? [{ id: nanoid(), fromNodeId: item.segmentNode.id, toNodeId: item.targetNode.id }] : [])]),
                ];
                nodesRef.current = nextNodes;
                connectionsRef.current = nextConnections;
                setNodes(nextNodes);
                setConnections(nextConnections);
                const selectedNodes = targetNodes.length ? targetNodes : segmentNodes;
                const selection = new Set(selectedNodes.map((item) => item.id));
                selectedNodeIdsRef.current = selection;
                setSelectedNodeIds(selection);
                setSelectedConnectionId(null);
                progress.done(
                    targetNodes.length
                        ? currentLocaleText("canvasExtra.mediaTools.segmentsDoneWithGen", { done: prepared.length, total: segments.length })
                        : currentLocaleText("canvasExtra.mediaTools.segmentsDone", { done: prepared.length, total: segments.length }),
                );
                segmentNodes.forEach((segmentNode) => {
                    void ensureCanvasNodeAsset({ canvasId: projectId, domainProjectId, node: segmentNode, source: "canvas-manual" })
                        .then((result) => setNodes((current) => current.map((item) => (item.id === segmentNode.id ? { ...item, metadata: { ...item.metadata, assetId: result.assetId } } : item))))
                        .catch((assetError) => message.warning(currentLocaleText("canvasExtra.mediaTools.segmentAssetWriteFailed", { error: assetError instanceof Error ? assetError.message : currentLocaleText("canvasExtra.mediaTools.unknownError") })));
                });
                if (failedSegments.length) message.warning(currentLocaleText("canvasExtra.mediaTools.segmentsPartialFailed", { failed: failedSegments.length, done: prepared.length }));
            } catch (error) {
                const details = error instanceof Error ? error.message : currentLocaleText("canvasExtra.mediaTools.trimFailed");
                progress.fail(details);
                message.error(details);
            }
        },
        [connectionsRef, domainProjectId, effectiveConfig, message, nodesRef, projectId, selectedNodeIdsRef, setConnections, setSelectedConnectionId, setSelectedNodeIds, setNodes, startUploadStatus],
    );

    const handleSegmentConfirm = useCallback(
        async (node: CanvasNodeData, params: CanvasVideoSegmentParams) => {
            if (segmentRunningRef.current || !node.metadata?.content) return;
            if (params.mode === "video" && params.action === "create-generation-nodes") {
                const generationConfig = buildGenerationConfig(effectiveConfig, node, "video");
                const selectedConfig = { ...generationConfig, model: params.model || generationConfig.model };
                const batchError = validateVideoSegmentBatch(selectedConfig, params.segments || [], params.operation);
                if (batchError) {
                    message.warning(batchError);
                    return;
                }
            }
            segmentRunningRef.current = true;
            setSegmentRunningMode(params.mode);
            setSegmentDialogNodeId(null);
            setSegmentDialogMode(null);
            try {
                if (params.mode === "video") await runTrimVideoSegments(node, params);
                else await runExtractVideoAudio(node, params);
            } finally {
                segmentRunningRef.current = false;
                setSegmentRunningMode(null);
            }
        },
        [effectiveConfig, message, runExtractVideoAudio, runTrimVideoSegments],
    );

    const mergeVideosByIds = useCallback(
        async (videoNodeIds: string[]) => {
            if (mergeVideoRunningRef.current) return;
            const requestedIds = new Set(videoNodeIds);
            const videos = nodesRef.current
                .filter((node) => requestedIds.has(node.id) && node.type === CanvasNodeType.Video && Boolean(node.metadata?.content))
                .sort((left, right) => {
                    const leftShot = left.metadata?.shotIndex ?? Number.MAX_SAFE_INTEGER;
                    const rightShot = right.metadata?.shotIndex ?? Number.MAX_SAFE_INTEGER;
                    return leftShot - rightShot || left.position.y - right.position.y || left.position.x - right.position.x;
                });
            if (videos.length < 2) {
                message.warning(currentLocaleText("canvasExtra.mediaTools.selectTwoVideos"));
                return;
            }
            mergeVideoRunningRef.current = true;
            setMergeVideoProgress({ phase: "reading", progress: 0 });
            try {
                const blob = await mergeVideos(
                    videos.map((node) => ({ id: node.id, url: node.metadata?.content, storageKey: node.metadata?.storageKey })),
                    setMergeVideoProgress,
                );
                setMergeVideoProgress({ phase: "encoding", progress: 98 });
                const uploaded = await storeGeneratedVideo({ blob });
                const size = fitNodeSize(uploaded.width || 1280, uploaded.height || 720, VIDEO_NODE_MAX_SIZE.width, VIDEO_NODE_MAX_SIZE.height);
                const left = Math.max(...videos.map((node) => node.position.x + node.width)) + 120;
                const top = Math.min(...videos.map((node) => node.position.y));
                const mergedNode = createCanvasNode(
                    CanvasNodeType.Video,
                    { x: left + size.width / 2, y: top + size.height / 2 },
                    {
                        ...videoMetadata(uploaded),
                        prompt: upstreamText("upstream.v165.message071", { p0: videos.length }),
                        workflowKind: "final",
                        workflowTitle: currentLocaleText("canvasExtra.mediaTools.mergeWorkflowTitle"),
                        videoEditOperation: "concat",
                        status: NODE_STATUS_SUCCESS,
                    },
                );
                mergedNode.title = currentLocaleText("canvasExtra.mediaTools.mergedTitle", { count: videos.length });
                mergedNode.width = size.width;
                mergedNode.height = size.height;
                mergedNode.position = { x: left, y: top };
                const links = videos.map((node) => ({ id: nanoid(), fromNodeId: node.id, toNodeId: mergedNode.id }));
                const nextNodes = [...nodesRef.current, mergedNode];
                const nextConnections = [...connectionsRef.current, ...links];
                nodesRef.current = nextNodes;
                connectionsRef.current = nextConnections;
                setNodes(nextNodes);
                setConnections(nextConnections);
                const selection = new Set([mergedNode.id]);
                selectedNodeIdsRef.current = selection;
                setSelectedNodeIds(selection);
                setSelectedConnectionId(null);
                setDialogNodeId(null);
                await persistMediaNodes([mergedNode]);
                setMergeVideoProgress({ phase: "encoding", progress: 100 });
                message.success(currentLocaleText("canvasExtra.mediaTools.mergedSuccess", { count: videos.length }));
            } catch (error) {
                message.error(error instanceof Error ? error.message : currentLocaleText("canvasExtra.mediaTools.mergeFailed"));
            } finally {
                mergeVideoRunningRef.current = false;
                window.setTimeout(() => setMergeVideoProgress(null), 700);
            }
        },
        [connectionsRef, message, nodesRef, persistMediaNodes, selectedNodeIdsRef, setConnections, setDialogNodeId, setNodes, setSelectedConnectionId, setSelectedNodeIds],
    );

    const mergeSelectedVideos = useCallback(() => mergeVideosByIds(Array.from(selectedNodeIdsRef.current)), [mergeVideosByIds, selectedNodeIdsRef]);

    const openPanoramaConfig = useCallback((node: CanvasNodeData) => {
        setPanoramaConfigNodeId(node.id);
    }, []);

    const createPanoramaViewerWithConfig = useCallback(
        (node: CanvasNodeData, composedPrompt: string, config: PanoramaGenerateConfig) => {
            const panoramaSpec = NODE_DEFAULT_SIZE[CanvasNodeType.Panorama];
            const childId = nanoid();
            const childNode: CanvasNodeData = {
                id: childId,
                type: CanvasNodeType.Panorama,
                title: `${node.title || currentLocaleText("canvasExtra.mediaTools.defaultImageTitle")}${currentLocaleText("canvasExtra.mediaTools.titlePanoramaSuffix")}`,
                position: { x: node.position.x + node.width + 96, y: node.position.y },
                width: panoramaSpec.width,
                height: panoramaSpec.height,
                metadata: {
                    prompt: composedPrompt || node.metadata?.prompt,
                    panoramaConfig: {
                        projection: config.projection,
                        sourceMode: config.sourceMode,
                        smartBase: config.smartBase,
                        directImageUrl: config.directImageUrl ?? null,
                    },
                },
            };
            setNodes((current) => appendNodesWithoutOverlap(current, [childNode]));
            setConnections((current) => {
                const linkTargets = new Set<string>([node.id]);
                config.referenceImages.forEach((reference) => linkTargets.add(reference.id));
                const extraConnections = config.referenceImages.filter((reference) => reference.id !== node.id).map((reference) => ({ id: nanoid(), fromNodeId: reference.id, toNodeId: childId }));
                return [...current, { id: nanoid(), fromNodeId: node.id, toNodeId: childId }, ...extraConnections];
            });
            setSelectedNodeIds(new Set([childId]));
            setSelectedConnectionId(null);
            // 全景节点是纯查看器，创建后不弹提示词面板。
            setDialogNodeId(null);
            setPanoramaConfigNodeId(null);
            message.success(config.sourceMode === "image" ? currentLocaleText("canvasExtra.mediaTools.panoramaViewCreated") : currentLocaleText("canvasExtra.mediaTools.panoramaGenCreated"));
        },
        [message, setConnections, setDialogNodeId, setNodes, setSelectedConnectionId, setSelectedNodeIds],
    );

    const addPanoramaCaptureNode = useCallback(
        async (node: CanvasNodeData, dataUrl: string, title: string) => {
            const image = await uploadImage(dataUrl);
            const size = fitNodeSize(image.width || 720, image.height || 405);
            // 已有导出时按列错开，避免多张截图叠在同一位置。
            const outputCount = connectionsRef.current.filter((connection) => connection.fromNodeId === node.id).length;
            const childNode: CanvasNodeData = {
                id: nanoid(),
                type: CanvasNodeType.Image,
                title,
                position: { x: node.position.x + node.width + 96, y: node.position.y + (outputCount % 5) * (size.height + 32) },
                width: size.width,
                height: size.height,
                metadata: { ...imageMetadata(image), prompt: node.metadata?.prompt },
            };
            setNodes((current) => appendNodesWithoutOverlap(current, [childNode]));
            setConnections((current) => [...current, { id: nanoid(), fromNodeId: node.id, toNodeId: childNode.id }]);
            await persistMediaNodes([childNode]);
            message.success(currentLocaleText("canvasExtra.mediaTools.exportedTitle", { title }));
        },
        [connectionsRef, message, persistMediaNodes, setConnections, setNodes],
    );

    const splitImageNode = useCallback(
        async (node: CanvasNodeData, params: CanvasImageSplitParams) => {
            if (!node.metadata?.content || !isValidGridSplit(params)) return;
            try {
                const sourceId = processingSourceIds(node.metadata.storageKey, node.metadata.content)[0];
                const remote = sourceId ? await transformResourceImage(`resource:${sourceId}`, { operation: "split", ...params }) : null;
                const pieces = remote ? remote.map((_, index) => ({ row: Math.floor(index / params.columns), column: index % params.columns, dataUrl: "" })) : await splitDataUrl(node.metadata.content, params);
                const sizedPieces = await Promise.all(
                    pieces.map(async (piece, index) => {
                        const image = remote ? processedImageResource(remote[index]) : await uploadImage(piece.dataUrl);
                        return { piece, image, size: fitNodeSize(image.width, image.height) };
                    }),
                );
                const positions = layoutGridSplitCells(
                    { x: node.position.x + node.width + 96, y: node.position.y },
                    sizedPieces.map(({ piece, size }) => ({ row: piece.row, column: piece.column, width: size.width, height: size.height })),
                );
                const childNodes = sizedPieces.map(
                    ({ piece, image, size }, index) =>
                        ({
                            id: nanoid(),
                            type: CanvasNodeType.Image,
                            title: `${node.title || currentLocaleText("canvasExtra.mediaTools.defaultImageTitle")}${currentLocaleText("canvasExtra.mediaTools.titleGridSuffix", { row: piece.row + 1, col: piece.column + 1 })}`,
                            position: positions[index] || { x: node.position.x + node.width + 96, y: node.position.y },
                            width: size.width,
                            height: size.height,
                            metadata: { ...imageMetadata(image), prompt: node.metadata?.prompt, manualSize: true },
                        }) satisfies CanvasNodeData,
                );
                setNodes((current) => appendNodesWithoutOverlap(current, childNodes));
                setConnections((current) => [...current, ...childNodes.map((child) => ({ id: nanoid(), fromNodeId: node.id, toNodeId: child.id }))]);
                setSelectedNodeIds(new Set(childNodes.map((child) => child.id)));
                setSelectedConnectionId(null);
                setDialogNodeId(null);
                await persistMediaNodes(childNodes);
                message.success(currentLocaleText("canvasExtra.mediaTools.splitDone", { count: childNodes.length }));
            } catch (error) {
                message.error(error instanceof Error ? currentLocaleText("canvasExtra.mediaTools.splitFailed", { reason: error.message }) : currentLocaleText("canvasExtra.mediaTools.splitFailedRetry"));
            }
        },
        [message, persistMediaNodes, setConnections, setDialogNodeId, setNodes, setSelectedConnectionId, setSelectedNodeIds],
    );

    const maskEditImageNode = useCallback(
        async (node: CanvasNodeData, payload: CanvasImageMaskEditPayload) => {
            if (!node.metadata?.content) return;
            if (!(await ensureGenerationAccount())) return;
            const baseGenerationConfig = buildGenerationConfig(effectiveConfig, node, "image");
            const selectedModel = payload.generationConfig?.model || payload.generationConfig?.imageModel || baseGenerationConfig.model;
            const modelDefaults = defaultImageParamsForModel(baseGenerationConfig, selectedModel);
            const selectedImageProfile = modelCapabilityConfigFor(baseGenerationConfig, selectedModel).image;
            if (!selectedImageProfile?.references.maskSupported) {
                message.error(currentLocaleText("canvasExtra.mediaTools.maskUnsupported"));
                return;
            }
            const generationConfig = {
                ...baseGenerationConfig,
                ...payload.generationConfig,
                model: selectedModel,
                imageModel: payload.generationConfig?.imageModel || payload.generationConfig?.model || effectiveConfig.imageModel,
                quality: normalizeMaskEditQuality(
                    payload.generationConfig?.quality || node.metadata?.quality || baseGenerationConfig.quality || modelDefaults.quality,
                    payload.generationConfig?.size || node.metadata?.size || baseGenerationConfig.size || modelDefaults.size,
                ),
                count: String(payload.generationConfig?.count || 1),
                // 原图像素尺寸不是模型的输出尺寸合同；非高级设置时使用模型默认尺寸，避免把节点尺寸误发给上游。
                size: payload.generationConfig?.size || node.metadata?.size || modelDefaults.size,
            };
            if (!isAiConfigReady(generationConfig, generationConfig.model)) {
                navigateToSettings({ continueCreation: true });
                return;
            }
            const userPrompt = payload.prompt.trim();
            const prompt = upstreamText("upstream.v165.message072", { p0: userPrompt });
            const source = nodeReferenceImage(node);
            if (!source) return;
            const styleExecution = resolveImageEditStyle(node, prompt, generationConfig);
            if (!styleExecution) return;
            const { prompt: effectivePrompt, metadata: styleMetadata } = styleExecution;
            const requestedCount = Math.max(1, Number(generationConfig.count) || 1);
            const generationMetadata = buildImageGenerationMetadata("edit", generationConfig, requestedCount, [source]);
            setMaskEditNodeId(null);
            const rootId = nanoid();
            const childIds = requestedCount > 1 ? Array.from({ length: requestedCount }, () => nanoid()) : [];
            const targetIds = requestedCount > 1 ? childIds : [rootId];
            const imageSize = { width: node.width, height: node.height };
            const preferredPosition = { x: node.position.x + node.width + 96, y: node.position.y };
            const rootPosition = findAvailableGenerationGroupPosition(nodesRef.current, preferredPosition, imageGenerationGroupSize(imageSize, imageSize, childIds.length));
            const rootNode: CanvasNodeData = {
                id: rootId,
                type: CanvasNodeType.Image,
                title: userPrompt.slice(0, 32) || currentLocaleText("canvasExtra.mediaTools.maskEditResultTitle"),
                position: rootPosition,
                width: node.width,
                height: node.height,
                metadata: {
                    ...canvasGenerationPromptMetadata(userPrompt, effectivePrompt),
                    status: NODE_STATUS_LOADING,
                    isBatchRoot: requestedCount > 1,
                    batchChildIds: requestedCount > 1 ? childIds : undefined,
                    batchFailedCount: requestedCount > 1 ? 0 : undefined,
                    imageBatchExpanded: requestedCount > 1 ? true : undefined,
                    ...generationMetadata,
                    ...styleMetadata,
                },
            };
            const childNodes: CanvasNodeData[] = childIds.map((id, index) => ({
                id,
                type: CanvasNodeType.Image,
                title: `${userPrompt.slice(0, 28) || currentLocaleText("canvasExtra.mediaTools.maskEditResultTitle")} · ${index + 1}`,
                position: imageGenerationChildPosition(rootNode.position, rootNode.width, imageSize, index),
                width: node.width,
                height: node.height,
                metadata: {
                    ...canvasGenerationPromptMetadata(userPrompt, effectivePrompt),
                    status: NODE_STATUS_LOADING,
                    batchRootId: rootId,
                    ...generationMetadata,
                    ...styleMetadata,
                },
            }));
            setRunningNodeId(rootId);
            setNodes((current) => [...current, rootNode, ...childNodes]);
            setConnections((current) => [...current, { id: nanoid(), fromNodeId: node.id, toNodeId: rootId }, ...childIds.map((childId) => ({ id: nanoid(), fromNodeId: rootId, toNodeId: childId }))]);
            setSelectedNodeIds(new Set([rootId, ...childIds]));
            setSelectedConnectionId(null);
            setDialogNodeId(rootId);
            const controller = startGenerationRequest(rootId, node.id, rootId);
            targetIds.forEach((targetId) => startGenerationRequest(targetId, node.id, rootId, controller));
            let hasSuccess = false;
            let failureCount = 0;
            let representativeError: string | undefined;
            try {
                await Promise.all(
                    targetIds.map(async (targetId) => {
                        try {
                            const result = await runBackendCanvasGenerationTask({
                                projectId,
                                nodeId: targetId,
                                mode: "image",
                                prompt: buildNodeGenerationEffectivePrompt(effectivePrompt, { referenceImages: [source], referenceVideos: [], referenceAudios: [] }, nodeGenerationReferencePromptLimit(generationConfig, "image"), userPrompt),
                                config: { ...generationConfig, count: "1" },
                                referenceImages: [source],
                                mask: { id: `${node.id}-mask`, name: "mask.png", type: "image/png", dataUrl: payload.maskDataUrl },
                                signal: controller.signal,
                                metadata: { sourceNodeId: node.id, edit: "mask", ...styleMetadata },
                                onTaskCreated: (task) => bindGenerationTask(targetId, task),
                            });
                            const image = result.images?.find((item) => item?.dataUrl);
                            if (!image?.dataUrl) throw new Error(currentLocaleText("canvasExtra.mediaTools.noImageFromBackend"));
                            const uploaded = await uploadImage(image.dataUrl);
                            const size = fitNodeSize(uploaded.width, uploaded.height, node.width, node.height);
                            const currentNode = nodesRef.current.find((item) => item.id === targetId);
                            if (!currentNode) throw new Error(currentLocaleText("canvasExtra.mediaTools.maskNodeDeleted"));
                            const finalizedNode = { ...currentNode, width: size.width, height: size.height, metadata: { ...currentNode.metadata, ...imageMetadata(uploaded), prompt: effectivePrompt, ...generationMetadata } };
                            setNodes((current) =>
                                current.map((item) => {
                                    if (item.id === targetId) return finalizedNode;
                                    if (item.id !== rootId || requestedCount <= 1 || item.metadata?.primaryImageId) return item;
                                    return { ...item, width: size.width, height: size.height, metadata: { ...item.metadata, ...imageMetadata(uploaded), primaryImageId: targetId, status: NODE_STATUS_SUCCESS } };
                                }),
                            );
                            await persistMediaNodes([finalizedNode]);
                            hasSuccess = true;
                        } catch (error) {
                            if (isGenerationCanceled(error)) return;
                            failureCount += 1;
                            const details = generationErrorMessage(error);
                            representativeError = details;
                            setNodes((current) => current.map((item) => (item.id === targetId ? { ...item, metadata: { ...item.metadata, status: NODE_STATUS_ERROR, ...generationFailureMetadata(error, effectivePrompt) } } : item)));
                        } finally {
                            finishGenerationRequest(targetId, controller);
                        }
                    }),
                );
                if (controller.signal.aborted) {
                    setNodes((current) => {
                        const cancelled = cancelIncompleteImageBatch(rootId, childIds, current, []);
                        if (cancelled.removedIds.length) {
                            const removed = new Set(cancelled.removedIds);
                            setConnections((connections) => connections.filter((connection) => !removed.has(connection.fromNodeId) && !removed.has(connection.toNodeId)));
                        }
                        return cancelled.nodes.map((item) => {
                            if (item.id !== rootId) return item;
                            if (item.metadata?.content) return item;
                            return { ...item, metadata: { ...item.metadata, status: NODE_STATUS_IDLE, errorDetails: undefined } };
                        });
                    });
                    return;
                }
                if (failureCount > 0) {
                    message.error(
                        hasSuccess ? currentLocaleText("canvasExtra.imgGen.partialImagesFailed") : representativeError ? localizedGenerationError(representativeError, currentLocaleText) : currentLocaleText("canvasExtra.mediaTools.maskEditFailed"),
                    );
                }
                setNodes((current) =>
                    current.map((item) => {
                        if (item.id !== rootId) return item;
                        return {
                            ...item,
                            metadata: {
                                ...item.metadata,
                                status: hasSuccess ? NODE_STATUS_SUCCESS : NODE_STATUS_ERROR,
                                batchFailedCount: requestedCount > 1 ? failureCount : undefined,
                                ...(hasSuccess ? { errorDetails: undefined } : { errorDetails: representativeError || currentLocaleText("canvasExtra.mediaTools.maskEditFailed") }),
                            },
                        };
                    }),
                );
            } finally {
                if (requestedCount > 1) finishGenerationRequest(rootId, controller);
                setRunningNodeId(null);
            }
        },
        [
            bindGenerationTask,
            effectiveConfig,
            ensureGenerationAccount,
            finishGenerationRequest,
            isAiConfigReady,
            message,
            nodesRef,
            persistMediaNodes,
            projectId,
            resolveImageEditStyle,
            setConnections,
            setDialogNodeId,
            setNodes,
            setRunningNodeId,
            setSelectedConnectionId,
            setSelectedNodeIds,
            startGenerationRequest,
        ],
    );

    const planImageLayers = useCallback(
        async (node: CanvasNodeData, model: string, prompt: string, signal: AbortSignal, options?: ImageLayerPlanningOptions) => {
            const source = nodeReferenceImage(node);
            if (!source) throw new Error(upstreamText("upstream.v165.message073"));
            if (options?.history) {
                const plan = await readImageLayerPlanningHistory(projectId, node.id, node.metadata?.storageKey, signal);
                return calibrateImageLayerPlan(source, applyImageLayerPlanningPurpose(plan, options?.purpose || "recompose"));
            }
            const config = { ...effectiveConfig, model, textModel: model, taskWorkflowProvider: "model" as const };
            const error = imageLayerPlannerError(config, model);
            if (error) throw new Error(error);
            if (!isAiConfigReady(config, model)) throw new Error(upstreamText("upstream.v165.message074"));
            const { reference, sourceSize } = await prepareImageLayerPlanningReference(source, options?.input || "preview", signal);
            const referenceSize = { width: reference.width!, height: reference.height! };
            let taskId: string | undefined;
            const result = await runBackendCanvasGenerationTask({
                projectId,
                nodeId: `${node.id}-layer-plan-${nanoid()}`,
                mode: "text",
                prompt: buildNodeGenerationEffectivePrompt(
                    imageLayerPlanningPrompt(prompt, referenceSize, options?.purpose),
                    { referenceImages: [reference], referenceVideos: [], referenceAudios: [] },
                    nodeGenerationReferencePromptLimit(config, "text"),
                    prompt,
                ),
                config,
                referenceImages: [reference],
                signal,
                metadata: { sourceNodeId: node.id, sourceStorageKey: source.storageKey, sourceSize, planningReferenceSize: referenceSize, edit: "layer-planning" },
                onTaskCreated: (task) => {
                    taskId = task.id;
                },
            });
            const plan = { ...parseImageLayerPlan(result.text || "", referenceSize), model, taskId };
            if (signal.aborted) throw new DOMException("Aborted", "AbortError");
            return calibrateImageLayerPlan(source, applyImageLayerPlanningPurpose(plan, options?.purpose || "recompose"));
        },
        [effectiveConfig, isAiConfigReady, projectId],
    );

    const decomposeImageLayers = useCallback(
        async (node: CanvasNodeData, payload: CanvasImageLayerDecompositionPayload) => {
            if (layerSubmissionIds.current.has(node.id)) return;
            if (!node.metadata?.content || !payload.prompt.trim()) return;
            if (!(await ensureGenerationAccount())) return;
            const baseGenerationConfig = {
                ...buildGenerationConfig(effectiveConfig, node, "image"),
                count: "1",
            };
            const selectedModel = payload.generationConfig?.model || payload.generationConfig?.imageModel || baseGenerationConfig.model;
            const generationConfig = layerDecompositionConfig(baseGenerationConfig, selectedModel, payload.generationConfig);
            const plannerError = imageLayerPlannerError(effectiveConfig, payload.plannerModel);
            if (plannerError) {
                message.error(plannerError);
                return;
            }
            if (
                !isAiConfigReady(
                    {
                        ...effectiveConfig,
                        model: payload.plannerModel,
                        textModel: payload.plannerModel,
                    },
                    payload.plannerModel,
                )
            ) {
                message.error(upstreamText("upstream.v165.message075"));
                return;
            }
            if (!supportsLayerDecomposition(generationConfig, selectedModel) && !supportsExperimentalLayerExtraction(generationConfig, selectedModel)) {
                message.error(upstreamText("upstream.v165.message076"));
                return;
            }
            if (!isAiConfigReady(generationConfig, selectedModel)) {
                navigateToSettings({ continueCreation: true });
                return;
            }
            const taskNodeId = nanoid();
            const startedAt = new Date().toISOString();
            const imageSize = { width: node.width, height: node.height };
            const position = findAvailableGenerationGroupPosition(nodesRef.current, { x: node.position.x + node.width + 96, y: node.position.y }, imageSize);
            const controller = startGenerationRequest(taskNodeId, node.id, taskNodeId);
            let pendingRequests: NonNullable<NonNullable<CanvasNodeData["metadata"]>["experimentalLayerPlan"]>["requests"] | undefined;
            layerSubmissionIds.current.add(node.id);
            setLayerDecompositionNodeId(null);
            setActiveLayerGroupIds((current) => new Set([...current, taskNodeId]));
            setRunningNodeId(taskNodeId);
            setNodes((current) => [
                ...current,
                {
                    id: taskNodeId,
                    type: CanvasNodeType.Image,
                    title: upstreamText("upstream.v165.message002"),
                    position,
                    ...imageSize,
                    metadata: {
                        ...canvasGenerationPromptMetadata(payload.prompt, payload.prompt),
                        ...buildImageGenerationMetadata("edit", generationConfig, 1, [nodeReferenceImage(node)!]),
                        status: NODE_STATUS_LOADING,
                        imageLayerWorkflow: {
                            sourceNodeId: node.id,
                            startedAt,
                            stage: "planning",
                            plannerModel: payload.plannerModel,
                        },
                    },
                },
            ]);
            setConnections((current) => [...current, { id: nanoid(), fromNodeId: node.id, toNodeId: taskNodeId }]);
            setSelectedNodeIds(new Set([taskNodeId]));
            setSelectedConnectionId(null);
            setDialogNodeId(null);
            try {
                const plan = await planImageLayers(node, payload.plannerModel, payload.prompt, controller.signal, { input: "preview", purpose: "recompose" });
                if (controller.signal.aborted) throw new DOMException("Aborted", "AbortError");
                if (!nodesRef.current.some((item) => item.id === taskNodeId)) throw new Error(upstreamText("upstream.v165.message077"));
                payload = {
                    ...payload,
                    planning: plan,
                    ...(supportsLayerDecomposition(generationConfig, selectedModel)
                        ? {
                              prompt: upstreamText("upstream.v165.message078", { p0: JSON.stringify(plan.layers) }),
                              backgroundRemovalModel: undefined,
                          }
                        : {
                              experimentalTargets: imageLayerPlanTargets(plan),
                              extractions: plan.layers.map(
                                  (layer) =>
                                      layer.extraction || {
                                          method: "generate",
                                      },
                              ),
                              removeFromBackground: plan.layers.map((layer, index) => index > 0 && Boolean(layer.removeFromBackground)),
                          }),
                };
                const experimental = Boolean(payload.experimentalTargets);
                let targets: string[] | undefined;
                let extractions: ImageLayerExtraction[] | undefined;
                let removeFromBackground: boolean[] | undefined;
                try {
                    if (experimental) {
                        targets = parseExperimentalLayerTargets(payload.experimentalTargets!.join("\n"));
                        removeFromBackground = targets.map((_, index) => index > 0 && (payload.removeFromBackground?.[index] ?? index === 1));
                        extractions = resolveImageLayerExtractions(targets.length, payload.extractions, removeFromBackground);
                        targets = imageLayerExtractionTargets(targets, extractions);
                    }
                } catch (error) {
                    throw new Error(generationErrorMessage(error));
                }
                const needsModel = !experimental || extractions!.some((extraction) => extraction.method === "generate");
                const hasGeneratedObjects = extractions?.some((extraction, index) => index > 0 && extraction.method === "generate");
                if (needsModel && !supportsLayerDecomposition(generationConfig, selectedModel) && !(experimental && supportsExperimentalLayerExtraction(generationConfig, selectedModel))) {
                    throw new Error(upstreamText("upstream.v165.message079"));
                }
                if (needsModel && !isAiConfigReady(generationConfig, generationConfig.model)) {
                    throw new Error(upstreamText("upstream.v165.message080"));
                }
                const source = nodeReferenceImage(node);
                if (!source) throw new Error(upstreamText("upstream.v165.message081"));
                let sourceCanvas: { width: number; height: number };
                try {
                    const info = await inspectImageLayer(source);
                    if (!info.nonempty) throw new Error(upstreamText("upstream.v165.message082"));
                    sourceCanvas = { width: info.width, height: info.height };
                    generationConfig.size = needsModel ? imageLayerOutputSize(generationConfig, selectedModel, sourceCanvas) : `${info.width}x${info.height}`;
                    if (needsModel && !generationConfig.size) throw new Error(upstreamText("upstream.v165.message083"));
                    if (extractions?.[0].method === "source" && !info.opaque) throw new Error(upstreamText("upstream.v165.message084"));
                    const profile = needsModel && modelCapabilityConfigFor(generationConfig, selectedModel).image;
                    // 持久化任务先经过服务端配置校验，必须提交已解析的协议尺寸，不能只校验后仍发送比例字符串。
                    if (profile) generationConfig.size = resolveImageRequestSize(profile, generationConfig.quality, generationConfig.size)?.value || "auto";
                } catch (error) {
                    throw new Error(generationErrorMessage(error));
                }
                if (controller.signal.aborted || !nodesRef.current.some((item) => item.id === taskNodeId)) throw new DOMException("Aborted", "AbortError");
                const liveSource = nodesRef.current.find((item) => item.id === node.id);
                if (!liveSource || liveSource.metadata?.content !== node.metadata.content || liveSource.metadata?.storageKey !== node.metadata.storageKey) throw new Error(upstreamText("upstream.v165.message085"));
                const removalConfig =
                    hasGeneratedObjects && payload.backgroundRemovalModel
                        ? layerDecompositionConfig(
                              {
                                  ...baseGenerationConfig,
                                  ...defaultImageParamsForModel(baseGenerationConfig, payload.backgroundRemovalModel),
                              },
                              payload.backgroundRemovalModel,
                              {
                                  size: imageLayerOutputSize(baseGenerationConfig, payload.backgroundRemovalModel, sourceCanvas),
                              },
                          )
                        : undefined;
                if (removalConfig && (!supportsExperimentalLayerExtraction(removalConfig, removalConfig.model) || !isAiConfigReady(removalConfig, removalConfig.model))) {
                    throw new Error(upstreamText("upstream.v165.message086"));
                }
                const removalSizeError =
                    removalConfig &&
                    (!removalConfig.size
                        ? upstreamText("upstream.v165.message087")
                        : modelCompatibilityError(removalConfig, removalConfig.model, {
                              capability: "image",
                              imageSize: removalConfig.size,
                          }));
                if (removalSizeError) throw new Error(removalSizeError);
                try {
                    const profile = removalConfig && modelCapabilityConfigFor(removalConfig, removalConfig.model).image;
                    if (profile && removalConfig) removalConfig.size = resolveImageRequestSize(profile, removalConfig.quality, removalConfig.size)?.value || "auto";
                } catch (error) {
                    throw new Error(generationErrorMessage(error));
                }
                const prompt = payload.prompt.trim();
                const generationMetadata = buildImageGenerationMetadata("edit", generationConfig, 1, [source]);
                const requests = targets?.map((target, index) => ({
                    nodeId: nanoid(),
                    target,
                    removeFromBackground: removeFromBackground![index],
                    extraction: extractions![index],
                    generation: { ...plan.layers[index].generation, prompt: experimentalLayerPrompt(plan.layers[index].generation, plan.layers[index].bbox) },
                }));
                pendingRequests = requests;
                const backgroundPatch =
                    extractions &&
                    imageLayerBackgroundPatch(
                        {
                            dataUrl: source.dataUrl,
                            storageKey: source.storageKey,
                        },
                        extractions,
                        removeFromBackground!,
                    );
                const taskNode: CanvasNodeData = {
                    id: taskNodeId,
                    type: CanvasNodeType.Image,
                    title: upstreamText("upstream.v165.message002"),
                    position,
                    width: imageSize.width,
                    height: imageSize.height,
                    metadata: {
                        ...canvasGenerationPromptMetadata(prompt, prompt),
                        status: NODE_STATUS_LOADING,
                        pluginId: "image-tools",
                        pluginNodeId: "layer-decomposition",
                        imageLayerMaterials: payload.independentMaterials ? { auto: true } : undefined,
                        imageLayerWorkflow: {
                            sourceNodeId: node.id,
                            startedAt,
                            stage: "extract",
                            total: plan.layers.length,
                            plannerModel: payload.plannerModel,
                            planningTaskId: plan.taskId,
                        },
                        ...(requests
                            ? {
                                  experimentalLayerPlan: {
                                      sourceNodeId: node.id,
                                      requests,
                                      plannerModel: payload.planning?.model,
                                      planningTaskId: payload.planning?.taskId,
                                      progress: upstreamText("upstream.v165.message088", { p0: requests.length }),
                                  },
                                  isBatchRoot: true,
                                  batchChildIds: requests.map((request) => request.nodeId),
                                  imageBatchExpanded: false,
                              }
                            : {
                                  layerDecomposition: {
                                      sourceNodeId: node.id,
                                      canvas: sourceCanvas,
                                  },
                              }),
                        ...generationMetadata,
                        ...(!needsModel
                            ? {
                                  model: undefined,
                                  producedModelCandidate: undefined,
                              }
                            : {}),
                    },
                };
                const extractionNodes: CanvasNodeData[] = (requests || []).map((request, index) => {
                    const extractionPrompt = request.generation.prompt;
                    return {
                        id: request.nodeId,
                        type: CanvasNodeType.Image,
                        title: imageLayerTargetName(request.target),
                        ...imageSize,
                        position: imageGenerationChildPosition(position, imageSize.width, imageSize, index),
                        metadata: {
                            ...canvasGenerationPromptMetadata(extractionPrompt, extractionPrompt),
                            ...buildImageGenerationMetadata("edit", imageLayerGenerationConfig(generationConfig, request.generation, index), 1, [source]),
                            status: NODE_STATUS_LOADING,
                            batchRootId: taskNodeId,
                            layerExtraction: {
                                sourceNodeId: node.id,
                                groupId: taskNodeId,
                                index,
                                phase: "extract",
                                canvas: sourceCanvas,
                                strategy: request.extraction,
                                source: {
                                    dataUrl: source.dataUrl,
                                    storageKey: source.storageKey,
                                    mimeType: source.type,
                                },
                                ...(index === 0 && backgroundPatch ? { backgroundPatch } : {}),
                                allowBackgroundRemoval: Boolean(removalConfig) && request.extraction.method === "generate",
                                backgroundRemovalModel: removalConfig?.model,
                            },
                        },
                    };
                });
                setNodes((current) => [...current.map((item) => (item.id === taskNodeId ? taskNode : item)), ...extractionNodes]);
                setConnections((current) => [
                    ...current,
                    ...extractionNodes.map((item) => ({
                        id: nanoid(),
                        fromNodeId: taskNode.id,
                        toNodeId: item.id,
                    })),
                ]);
                setSelectedNodeIds(new Set([taskNodeId]));
                setSelectedConnectionId(null);
                setDialogNodeId(null);
                if (requests && targets) {
                    let observedGroup = false;
                    const phases = requests.map(() => "extract");
                    await runImageLayerExtraction({
                        source,
                        targets,
                        extractions,
                        removeFromBackground,
                        generations: requests.map((request) => request.generation),
                        config: generationConfig,
                        removalConfig,
                        signal: controller.signal,
                        assertActive: (index) => {
                            const present = nodesRef.current.some((item) => item.id === taskNodeId);
                            if (present) observedGroup = true;
                            if (observedGroup && (!present || !nodesRef.current.some((item) => item.id === requests[index].nodeId))) throw new Error(upstreamText("upstream.v165.message089"));
                        },
                        onProgress: (index, phase) => {
                            phases[index] = phase;
                            const count = (value: string) => phases.filter((item) => item === value).length;
                            const progress = upstreamText("upstream.v165.message090", {
                                p0: count("complete"),
                                p1: requests.length,
                                p2: count("extract"),
                                p3: count("remove-background"),
                                p4: count("error") ? upstreamText("upstream.v165.message091", { p0: count("error") }) : "",
                            });
                            setNodes((current) =>
                                current.map((item) =>
                                    item.id === taskNodeId && item.metadata?.experimentalLayerPlan
                                        ? {
                                              ...item,
                                              metadata: {
                                                  ...item.metadata,
                                                  experimentalLayerPlan: {
                                                      ...item.metadata.experimentalLayerPlan,
                                                      progress,
                                                  },
                                              },
                                          }
                                        : item,
                                ),
                            );
                        },
                        onLocalResult: async (index, image) => {
                            const targetId = requests[index].nodeId;
                            const current = nodesRef.current.find((item) => item.id === targetId) || extractionNodes[index];
                            const completed = await buildSourceImageLayerNodeResult(current, image, controller.signal);
                            if (!nodesRef.current.some((item) => item.id === targetId) || controller.signal.aborted) throw new Error(upstreamText("upstream.v165.message092"));
                            setNodes((items) => items.map((item) => (item.id === targetId ? completed : item)));
                            await persistMediaNodes([completed]);
                        },
                        onLayerError: (index, error) => {
                            setNodes((current) =>
                                current.map((item) =>
                                    item.id === requests[index].nodeId
                                        ? {
                                              ...item,
                                              metadata: {
                                                  ...item.metadata,
                                                  status: NODE_STATUS_ERROR,
                                                  ...generationFailureMetadata(error, item.metadata?.prompt || ""),
                                              },
                                          }
                                        : item,
                                ),
                            );
                        },
                        runStage: async ({ index, stage, prompt: stagePrompt, config: stageConfig, reference, canvas }) => {
                            const targetId = requests[index].nodeId;
                            setNodes((current) =>
                                current.map((item) => {
                                    if (item.id !== targetId) return item;
                                    return {
                                        ...item,
                                        metadata: {
                                            ...resetGenerationTaskMetadata(item.metadata, "loading"),
                                            ...buildImageGenerationMetadata("edit", stageConfig, 1, [reference]),
                                            ...canvasGenerationPromptMetadata(stagePrompt, stagePrompt),
                                            layerExtraction: {
                                                ...item.metadata!.layerExtraction!,
                                                phase: stage,
                                                canvas,
                                                rejectedTaskId: undefined,
                                            },
                                        },
                                    };
                                }),
                            );
                            startGenerationRequest(targetId, node.id, taskNodeId, controller);
                            try {
                                return await runCanvasGenerationTaskToConsumer(
                                    {
                                        projectId,
                                        nodeId: targetId,
                                        mode: "image",
                                        prompt: buildNodeGenerationEffectivePrompt(stagePrompt, { referenceImages: [reference], referenceVideos: [], referenceAudios: [] }, nodeGenerationReferencePromptLimit(stageConfig, "image"), stagePrompt),
                                        config: stageConfig,
                                        referenceImages: [reference],
                                        signal: controller.signal,
                                        metadata: {
                                            sourceNodeId: node.id,
                                            edit: stage === "extract" ? "layer-extraction" : "layer-background-removal",
                                            ...imageLayerProviderMetadata(stageConfig, index),
                                        },
                                    },
                                    {
                                        bindTask: (task) => bindGenerationTask(targetId, task),
                                        consumeTask: (task) => applyGenerationTaskResult(targetId, task),
                                    },
                                );
                            } catch (error) {
                                setNodes((current) =>
                                    current.map((item) =>
                                        item.id === targetId
                                            ? {
                                                  ...item,
                                                  metadata: {
                                                      ...item.metadata,
                                                      status: NODE_STATUS_ERROR,
                                                      ...generationFailureMetadata(error, item.metadata?.prompt || ""),
                                                      layerExtraction: {
                                                          ...item.metadata!.layerExtraction!,
                                                          rejectedTaskId: item.metadata?.taskId,
                                                      },
                                                  },
                                              }
                                            : item,
                                    ),
                                );
                                throw error;
                            } finally {
                                finishGenerationRequest(targetId, controller);
                            }
                        },
                    });
                    return;
                }
                await runCanvasGenerationTaskToConsumer(
                    {
                        projectId,
                        nodeId: taskNodeId,
                        mode: "image",
                        prompt: buildNodeGenerationEffectivePrompt(prompt, { referenceImages: [source], referenceVideos: [], referenceAudios: [] }, nodeGenerationReferencePromptLimit(generationConfig, "image"), prompt),
                        config: generationConfig,
                        referenceImages: [source],
                        signal: controller.signal,
                        metadata: {
                            sourceNodeId: node.id,
                            edit: "layer-decomposition",
                            layerDecomposition: true,
                        },
                    },
                    {
                        bindTask: (task) => bindGenerationTask(taskNodeId, task),
                        consumeTask: (task) => applyGenerationTaskResult(taskNodeId, task),
                    },
                );
                message.success(upstreamText("upstream.v165.message093"));
            } catch (error) {
                {
                    const details = isGenerationCanceled(error) ? upstreamText("upstream.v165.message094") : generationErrorMessage(error);
                    message.error(details);
                    setNodes((current) =>
                        current.map((item) =>
                            item.id === taskNodeId || (pendingRequests?.some((request) => request.nodeId === item.id) && (item.metadata?.status === NODE_STATUS_IDLE || item.metadata?.status === NODE_STATUS_LOADING))
                                ? {
                                      ...item,
                                      metadata: {
                                          ...item.metadata,
                                          status: NODE_STATUS_ERROR,
                                          errorDetails: item.id === taskNodeId ? details : upstreamText("upstream.v165.message095"),
                                      },
                                  }
                                : item,
                        ),
                    );
                }
            } finally {
                finishGenerationRequest(taskNodeId, controller);
                layerSubmissionIds.current.delete(node.id);
                setActiveLayerGroupIds((current) => new Set([...current].filter((id) => id !== taskNodeId)));
                setRunningNodeId((current) => (current === taskNodeId ? null : current));
            }
        },
        [
            applyGenerationTaskResult,
            bindGenerationTask,
            effectiveConfig,
            ensureGenerationAccount,
            finishGenerationRequest,
            isAiConfigReady,
            message,
            nodesRef,
            projectId,
            persistMediaNodes,
            planImageLayers,
            setConnections,
            setDialogNodeId,
            setNodes,
            setRunningNodeId,
            setSelectedConnectionId,
            setSelectedNodeIds,
            startGenerationRequest,
        ],
    );

    const openLayerDecomposition = useCallback((node: CanvasNodeData) => {
        setLayerDecompositionNodeId(node.id);
    }, []);

    const upscaleImageNode = useCallback(
        async (node: CanvasNodeData, params: CanvasImageUpscaleParams) => {
            if (!node.metadata?.content) return;
            setUpscaleNodeId(null);
            try {
                const remote = processingSourceIds(node.metadata.storageKey).length ? await transformResourceImage(node.metadata.storageKey!, { operation: "resize", ...params }) : null;
                const image = remote ? processedImageResource(remote[0]) : await uploadImage(await upscaleDataUrl(node.metadata.content, params));
                const size = fitNodeSize(image.width, image.height);
                const childId = nanoid();
                const child: CanvasNodeData = {
                    id: childId,
                    type: CanvasNodeType.Image,
                    title: `${node.title || currentLocaleText("canvasExtra.mediaTools.defaultImageTitle")}${currentLocaleText("canvasExtra.mediaTools.titleUpscaleSuffix")}`,
                    position: { x: node.position.x + node.width + 96, y: node.position.y },
                    width: size.width,
                    height: size.height,
                    metadata: { ...imageMetadata(image), prompt: node.metadata?.prompt },
                };
                setNodes((current) => appendNodesWithoutOverlap(current, [child]));
                setConnections((current) => [...current, { id: nanoid(), fromNodeId: node.id, toNodeId: childId }]);
                setSelectedNodeIds(new Set([childId]));
                setDialogNodeId(childId);
                await persistMediaNodes([child]);
            } catch (error) {
                message.error(error instanceof Error ? currentLocaleText("canvasExtra.mediaTools.upscaleFailed", { reason: error.message }) : currentLocaleText("canvasExtra.mediaTools.upscaleFailedRetry"));
            }
        },
        [message, persistMediaNodes, setConnections, setDialogNodeId, setNodes, setSelectedNodeIds],
    );

    const generateAngleNode = useCallback(
        async (node: CanvasNodeData, params: CanvasImageAngleParams) => {
            if (!node.metadata?.content) return;
            if (!(await ensureGenerationAccount())) return;
            const generationConfig = { ...buildGenerationConfig(effectiveConfig, node, "image"), count: "1" };
            if (!isAiConfigReady(generationConfig, generationConfig.model)) {
                navigateToSettings({ continueCreation: true });
                return;
            }
            const childId = nanoid();
            const imageSpec = NODE_DEFAULT_SIZE[CanvasNodeType.Image];
            const title = buildAngleLabel(params);
            const prompt = buildAnglePrompt(params);
            const source = nodeReferenceImage(node);
            if (!source) return;
            const styleExecution = resolveImageEditStyle(node, prompt, generationConfig);
            if (!styleExecution) return;
            const { prompt: effectivePrompt, metadata: styleMetadata } = styleExecution;
            const generationMetadata = buildImageGenerationMetadata("edit", generationConfig, 1, [source]);
            setAngleNodeId(null);
            setRunningNodeId(childId);
            setNodes((current) =>
                appendNodesWithoutOverlap(current, [
                    {
                        id: childId,
                        type: CanvasNodeType.Image,
                        title,
                        position: { x: node.position.x + node.width + 96, y: node.position.y },
                        width: imageSpec.width,
                        height: imageSpec.height,
                        metadata: { prompt: effectivePrompt, status: NODE_STATUS_LOADING, ...generationMetadata, ...styleMetadata },
                    },
                ]),
            );
            setConnections((current) => [...current, { id: nanoid(), fromNodeId: node.id, toNodeId: childId }]);
            setSelectedNodeIds(new Set([childId]));
            setDialogNodeId(childId);
            const controller = startGenerationRequest(childId, node.id, childId);
            try {
                const result = await runBackendCanvasGenerationTask({
                    projectId,
                    nodeId: childId,
                    mode: "image",
                    prompt: buildNodeGenerationEffectivePrompt(effectivePrompt, { referenceImages: [source], referenceVideos: [], referenceAudios: [] }, nodeGenerationReferencePromptLimit(generationConfig, "image"), prompt),
                    config: generationConfig,
                    referenceImages: [source],
                    signal: controller.signal,
                    metadata: { sourceNodeId: node.id, edit: "angle", ...styleMetadata },
                    onTaskCreated: (task) => bindGenerationTask(childId, task),
                });
                const image = result.images?.[0];
                if (!image?.dataUrl) throw new Error(currentLocaleText("canvasExtra.mediaTools.noImageFromBackend"));
                const uploaded = await uploadImage(image.dataUrl);
                const size = fitNodeSize(uploaded.width, uploaded.height, imageSpec.width, imageSpec.height);
                const currentNode = nodesRef.current.find((item) => item.id === childId);
                if (!currentNode) throw new Error(currentLocaleText("canvasExtra.mediaTools.angleNodeDeleted"));
                const finalizedNode = { ...currentNode, width: size.width, height: size.height, metadata: { ...currentNode.metadata, ...imageMetadata(uploaded), prompt: effectivePrompt, ...generationMetadata } };
                setNodes((current) => current.map((item) => (item.id === childId ? finalizedNode : item)));
                await persistMediaNodes([finalizedNode]);
            } catch (error) {
                if (isGenerationCanceled(error)) return;
                const details = generationErrorMessage(error);
                setNodes((current) => current.map((item) => (item.id === childId ? { ...item, metadata: { ...item.metadata, status: NODE_STATUS_ERROR, ...generationFailureMetadata(error, effectivePrompt) } } : item)));
            } finally {
                finishGenerationRequest(childId, controller);
                setRunningNodeId(null);
            }
        },
        [
            bindGenerationTask,
            effectiveConfig,
            ensureGenerationAccount,
            finishGenerationRequest,
            isAiConfigReady,
            nodesRef,
            persistMediaNodes,
            projectId,
            resolveImageEditStyle,
            setConnections,
            setDialogNodeId,
            setNodes,
            setRunningNodeId,
            setSelectedNodeIds,
            startGenerationRequest,
        ],
    );

    const generateLightingNode = useCallback(
        (node: CanvasNodeData, options: CanvasImageLightingOptions, prompt: string) => {
            if (!node.metadata?.content) return;
            const generationConfig = { ...buildGenerationConfig(effectiveConfig, node, "image"), count: "1" };
            const childId = nanoid();
            const imageSpec = NODE_DEFAULT_SIZE[CanvasNodeType.Image];
            const title = buildLightingLabel(options, t);
            const source = nodeReferenceImage(node);
            if (!source) return;
            const generationMetadata = buildImageGenerationMetadata("edit", generationConfig, 1, [source]);
            setLightingNodeId(null);
            setNodes((current) =>
                appendNodesWithoutOverlap(current, [
                    {
                        id: childId,
                        type: CanvasNodeType.Image,
                        title,
                        position: { x: node.position.x + node.width + 96, y: node.position.y },
                        width: imageSpec.width,
                        height: imageSpec.height,
                        metadata: {
                            prompt,
                            status: NODE_STATUS_IDLE,
                            generationMode: "image",
                            ...generationMetadata,
                        },
                    },
                ]),
            );
            setConnections((current) => [...current, { id: nanoid(), fromNodeId: node.id, toNodeId: childId }]);
            setSelectedNodeIds(new Set([childId]));
            setSelectedConnectionId(null);
            setDialogNodeId(childId);
        },
        [effectiveConfig, setConnections, setDialogNodeId, setLightingNodeId, setNodes, setSelectedConnectionId, setSelectedNodeIds],
    );

    const generateEmotionNode = useCallback(
        async (node: CanvasNodeData, payload: CanvasImageEmotionPayload) => {
            if (!node.metadata?.content) return;
            if (!(await ensureGenerationAccount())) return;
            const baseConfig = buildGenerationConfig(effectiveConfig, node, "image");
            const providerSize = emotionGenerationSize(payload.editRegion);
            const generationConfig = { ...baseConfig, count: "1", size: providerSize, quality: !baseConfig.quality || baseConfig.quality === "auto" ? "high" : baseConfig.quality };
            if (!isAiConfigReady(generationConfig, generationConfig.model)) {
                navigateToSettings({ continueCreation: true });
                return;
            }
            if (resolveModelRequestConfig(generationConfig, generationConfig.model).interfaceType !== "openai-image") {
                message.error(currentLocaleText("canvasExtra.mediaTools.emotionNeedsOpenai"));
                return;
            }
            const imageProfile = modelCapabilityConfigFor(generationConfig, generationConfig.model).image!;
            const editPlan = resolveEmotionEditPlan(imageProfile.references.maskSupported);
            const source = nodeReferenceImage(node);
            if (!source) return;
            const editReference = {
                id: `${node.id}-${payload.presetId}-edit-region`,
                name: "emotion-edit-region.png",
                type: "image/png",
                dataUrl: payload.sourceDataUrl,
            };
            const characterReference = {
                id: `${node.id}-${payload.presetId}-character`,
                name: `${payload.characterName}-face.jpg`,
                type: "image/jpeg",
                dataUrl: payload.characterDataUrl,
            };
            const childId = nanoid();
            const styleExecution = resolveImageEditStyle(node, payload.prompt, generationConfig);
            if (!styleExecution) return;
            const { prompt: effectivePrompt, metadata: styleMetadata } = styleExecution;
            const providerPrompt = normalizeEmotionPromptForProvider(effectivePrompt);
            const generationMetadata = { ...buildImageGenerationMetadata("edit", generationConfig, 1, [source]), size: `${payload.imageWidth}x${payload.imageHeight}` };
            const emotionEdit = {
                sourceNodeId: node.id,
                characterName: payload.characterName,
                presetId: payload.presetId,
                intimacy: payload.intimacy,
                arousal: payload.arousal,
                label: payload.label,
                faceBox: payload.faceBox,
                editRegion: payload.editRegion,
                sourceWidth: payload.imageWidth,
                sourceHeight: payload.imageHeight,
                providerSize,
                editMode: editPlan.mode,
            };
            if (editPlan.notice) message.info(editPlan.notice);
            setEmotionNodeId(null);
            setRunningNodeId(childId);
            setNodes((current) =>
                appendNodesWithoutOverlap(current, [
                    {
                        id: childId,
                        type: CanvasNodeType.Image,
                        title: `${payload.characterName} · ${payload.label}`,
                        position: { x: node.position.x + node.width + 96, y: node.position.y },
                        width: node.width,
                        height: node.height,
                        metadata: { prompt: providerPrompt, status: NODE_STATUS_LOADING, ...generationMetadata, ...styleMetadata, emotionEdit },
                    },
                ]),
            );
            setConnections((current) => [...current, { id: nanoid(), fromNodeId: node.id, toNodeId: childId }]);
            setSelectedNodeIds(new Set([childId]));
            setSelectedConnectionId(null);
            setDialogNodeId(childId);
            const controller = startGenerationRequest(childId, node.id, childId);
            try {
                const mask = emotionProviderMask(editPlan, { id: `${node.id}-emotion-mask`, name: "emotion-mask.png", type: "image/png", dataUrl: payload.maskDataUrl });
                const result = await runBackendCanvasGenerationTask({
                    projectId,
                    nodeId: childId,
                    mode: "image",
                    prompt: buildNodeGenerationEffectivePrompt(
                        providerPrompt,
                        { referenceImages: [editReference, characterReference], referenceVideos: [], referenceAudios: [] },
                        nodeGenerationReferencePromptLimit(generationConfig, "image"),
                        payload.prompt,
                    ),
                    config: generationConfig,
                    referenceImages: [editReference, characterReference],
                    mask,
                    signal: controller.signal,
                    metadata: { sourceNodeId: node.id, edit: "emotion", emotionEditMode: editPlan.mode, emotion: emotionEdit, ...styleMetadata },
                    onTaskCreated: (task) => bindGenerationTask(childId, task),
                });
                const image = result.images?.[0];
                if (!image?.dataUrl) throw new Error(currentLocaleText("canvasExtra.mediaTools.noImageFromBackend"));
                const composited = await compositeEmotionImage(node.metadata.content, image.dataUrl, payload.editRegion, payload.faceBox);
                const uploaded = await uploadImage(composited);
                const size = fitNodeSize(uploaded.width, uploaded.height, node.width, node.height);
                const currentNode = nodesRef.current.find((item) => item.id === childId);
                if (!currentNode) throw new Error(currentLocaleText("canvasExtra.mediaTools.emotionNodeDeleted"));
                const finalizedNode = { ...currentNode, width: size.width, height: size.height, metadata: { ...currentNode.metadata, ...imageMetadata(uploaded), prompt: providerPrompt, ...generationMetadata, emotionEdit } };
                setNodes((current) => current.map((item) => (item.id === childId ? finalizedNode : item)));
                await persistMediaNodes([finalizedNode]);
            } catch (error) {
                if (isGenerationCanceled(error)) return;
                const details = generationErrorMessage(error);
                message.error(details);
                setNodes((current) => current.map((item) => (item.id === childId ? { ...item, metadata: { ...item.metadata, status: NODE_STATUS_ERROR, ...generationFailureMetadata(error, providerPrompt) } } : item)));
            } finally {
                finishGenerationRequest(childId, controller);
                setRunningNodeId(null);
            }
        },
        [
            bindGenerationTask,
            effectiveConfig,
            ensureGenerationAccount,
            finishGenerationRequest,
            isAiConfigReady,
            message,
            nodesRef,
            persistMediaNodes,
            projectId,
            resolveImageEditStyle,
            setConnections,
            setDialogNodeId,
            setNodes,
            setRunningNodeId,
            setSelectedConnectionId,
            setSelectedNodeIds,
            startGenerationRequest,
        ],
    );

    return {
        angleNodeId,
        lightingNodeId,
        emotionNodeId,
        annotationNodeId,
        createImageReversePromptNodes,
        openPortraitTextureEditor,
        cropImageNode,
        cropNodeId,
        closeFrameDialog,
        closeSegmentDialog,
        extractVideoDepth,
        extractAudioFromVideo,
        extractVideoFrames,
        extractingVideoFramesNodeId,
        frameDialogNodeId,
        handleSegmentConfirm,
        generateAngleNode,
        generateLightingNode,
        openPanoramaConfig,
        createPanoramaViewerWithConfig,
        addPanoramaCaptureNode,
        panoramaConfigNodeId,
        setPanoramaConfigNodeId,
        maskEditImageNode,
        maskEditNodeId,
        mergeSelectedVideos,
        mergeVideosByIds,
        mergeVideoProgress,
        saveAnnotatedImageNode,
        segmentDialogMode,
        segmentDialogNodeId,
        segmentRunningMode,
        setFrameDialogNodeId,
        setSegmentDialogNodeId,
        setAngleNodeId,
        setLightingNodeId,
        generateEmotionNode,
        setEmotionNodeId,
        setAnnotationNodeId,
        setCropNodeId,
        setMaskEditNodeId,
        setUpscaleNodeId,
        splitImageNode,
        openVideoFrameExtractor,
        openVideoSegmentExtractor,
        upscaleImageNode,
        decomposeImageLayers,
        planImageLayers,
        activeLayerGroupIds,
        openLayerDecomposition,
        layerDecompositionNodeId,
        setLayerDecompositionNodeId,
        upscaleNodeId,
    };
}

// 裁剪、切分等像素级操作要求图片同源可读：云端地址若不带 CORS 头，
// canvas 会被标记为跨域，toDataURL 直接抛 SecurityError。
// 这里优先用本地缓存 Blob 构造同源 objectURL，取不到时再回退原始地址。
async function resolveCroppableImageSource(node: CanvasNodeData): Promise<{ url: string; release: () => void }> {
    const content = node.metadata?.content ?? "";
    if (content.startsWith("data:") || content.startsWith("blob:")) return { url: content, release: () => {} };
    const storageKey = node.metadata?.storageKey;
    if (!storageKey) return { url: content, release: () => {} };
    const readBlob = storageKey.startsWith("image:") || storageKey.startsWith("generation-image:") ? getImageBlob : getMediaBlob;
    const blob = await readBlob(storageKey).catch(() => null);
    if (!blob) return { url: content, release: () => {} };
    const url = URL.createObjectURL(blob);
    return { url, release: () => URL.revokeObjectURL(url) };
}
