import { resolveGenerationVideoUrl } from "@/services/generation-video-url";
import { currentLocaleText as upstreamText } from "@/i18n/current-locale-text";
import { processingImage, processingSourceIds } from "@/services/processing-media";
import { hydrateCanvasVideoPreview } from "@/services/canvas-video-preview";
import { commitProducedModel } from "@/lib/canvas/produced-model";
import { imageGenerationChildPosition } from "@/lib/canvas/canvas-generation-layout";
import { resetGenerationTaskMetadata } from "@/lib/canvas/canvas-task-state";
import { imageLayerTargetName } from "@/lib/canvas/canvas-image-layer-plan";
import { patchImageLayerBackground } from "@/services/canvas-image-layer-source";
import { composeCanvasImageLayerGroup, decodeAndComposeImageLayers, inspectImageLayer, normalizeImageLayerCanvas } from "@/services/canvas-image-layer-compositor";
import { experimentalLayerSignature, hasUsableLayerTransparency, imageLayerCompositeSignature, validateImageLayerOutput } from "@/lib/canvas/canvas-image-layers";
import { findAvailableGenerationGroupPosition } from "@/lib/canvas/canvas-generation-layout";
import { currentLocaleText as t } from "@/i18n/current-locale-text";
import { NODE_DEFAULT_SIZE } from "@/constant/canvas";
import { commitCanvasGenerationResult } from "@/lib/canvas/canvas-generation-result";
import { fitNodeSize, nodeSizeFromRatio, VIDEO_NODE_MAX_SIZE } from "@/lib/canvas/canvas-node-size";
import { compositeEmotionImage } from "@/lib/canvas/canvas-emotion";
import { storeGeneratedAudio } from "@/services/api/audio";
import { storeGeneratedVideo } from "@/services/api/video";
import { backendAudioResults, parseBackendGenerationResult } from "@/services/api/generation-task";
import type { GenerationTask, GenerationTaskOutput } from "@/services/api/task-center";
import { resolveMediaUrl, type UploadedFile } from "@/services/file-storage";
import { resolveImageUrl, uploadImage, type UploadedImage } from "@/services/image-storage";
import { useCanvasStore } from "@/stores/canvas/use-canvas-store";
import { useAssetStore } from "@/stores/use-asset-store";
import { applyGenerationConsumerEffect, generationEffectApplied } from "@/services/generation-consumer-dedupe";
import { CanvasNodeType, type CanvasGenerationMode, type CanvasNodeData, type CanvasNodeMetadata } from "@/types/canvas";

export function generationTaskInput(task: GenerationTask) {
    if (!task.inputJson) return null;
    try {
        return JSON.parse(task.inputJson) as { mode?: CanvasGenerationMode; metadata?: { canvasId?: string; nodeId?: string; sourceNodeId?: string; domainProjectId?: string; layerDecomposition?: boolean }; prompt?: string };
    } catch {
        return null;
    }
}

export function generationTaskNodeId(task: GenerationTask) {
    return task.clientContext?.nodeId || generationTaskInput(task)?.metadata?.nodeId || "";
}

export function generationTaskMode(task: GenerationTask, fallback?: CanvasGenerationMode): CanvasGenerationMode {
    const inputMode = generationTaskInput(task)?.mode;
    if (inputMode === "text" || inputMode === "image" || inputMode === "video" || inputMode === "audio") return inputMode;
    if (task.type === "canvas_text") return "text";
    if (task.type === "canvas_video") return "video";
    if (task.type === "canvas_audio") return "audio";
    if (task.type === "canvas_image") return "image";
    return fallback || "image";
}

export function generationTaskCanReloadResource(task: GenerationTask) {
    const mode = generationTaskMode(task);
    return task.status === "succeeded" && (mode === "image" || mode === "video" || mode === "audio") && (Boolean(task.resultJson) || Boolean(task.outputs?.length));
}

export function imageMetadata(image: UploadedImage): CanvasNodeMetadata {
    return {
        content: image.url,
        storageKey: image.storageKey,
        status: "success",
        naturalWidth: image.width,
        naturalHeight: image.height,
        bytes: image.bytes,
        mimeType: image.mimeType,
        errorDetails: undefined,
        generationErrorCode: undefined,
        resourceReloadAvailable: undefined,
        failedPromptFingerprint: undefined,
    };
}

export function videoMetadata(video: UploadedFile): CanvasNodeMetadata {
    return {
        content: video.url,
        storageKey: video.storageKey,
        status: "success",
        naturalWidth: video.width,
        naturalHeight: video.height,
        bytes: video.bytes,
        mimeType: video.mimeType || "video/mp4",
        durationMs: video.durationMs,
        hasAudio: video.hasAudio,
        videoPreview: video.preview
            ? {
                  content: video.preview.url,
                  storageKey: video.preview.storageKey,
                  width: video.preview.width,
                  height: video.preview.height,
                  bytes: video.preview.bytes,
                  mimeType: video.preview.mimeType,
              }
            : undefined,
        errorDetails: undefined,
        generationErrorCode: undefined,
        resourceReloadAvailable: undefined,
        failedPromptFingerprint: undefined,
    };
}

export function audioMetadata(audio: UploadedFile): CanvasNodeMetadata {
    return {
        content: audio.url,
        storageKey: audio.storageKey,
        status: "success",
        bytes: audio.bytes,
        mimeType: audio.mimeType || "audio/mpeg",
        durationMs: audio.durationMs,
        errorDetails: undefined,
        generationErrorCode: undefined,
        resourceReloadAvailable: undefined,
        failedPromptFingerprint: undefined,
    };
}

function workflowMetadataForResultNode(): Partial<CanvasNodeMetadata> {
    return {
        workflowProvider: undefined,
        runningHubWorkflowId: undefined,
        runningHubWorkflowKind: undefined,
        workflowParameters: undefined,
    };
}

// 原地重生会换 storageKey 但继承旧 assetId，形成「旧素材 + 新资源」配对，云端校验会永久拒绝。
// 新媒体结果必须清掉旧绑定，交给入库/修复路径按新资源重绑。
export function applyGeneratedMediaResultMetadata(node: CanvasNodeData, media: CanvasNodeMetadata, extra: Partial<CanvasNodeMetadata> = {}, fallbackModel?: string): CanvasNodeMetadata {
    return commitProducedModel(
        {
            ...node.metadata,
            ...workflowMetadataForResultNode(),
            waveform: undefined,
            waveformVersion: undefined,
            imageRotation: undefined,
            ...media,
            ...extra,
            errorDetails: undefined,
            assetId: undefined,
        },
        fallbackModel,
    );
}

export async function buildSourceImageLayerNodeResult(node: CanvasNodeData, image: { dataUrl: string }, signal: AbortSignal): Promise<CanvasNodeData> {
    const extraction = node.metadata?.layerExtraction;
    if (!extraction?.strategy || extraction.strategy.method === "generate") throw new Error(upstreamText("upstream.v165.message005"));
    if ((extraction.index === 0) !== (extraction.strategy.method === "source")) throw new Error(upstreamText("upstream.v165.message006"));
    if (signal.aborted) throw new DOMException(upstreamText("upstream.v165.message007"), "AbortError");
    const uploaded = await uploadImage(image.dataUrl, undefined, processingSourceIds(extraction.source?.storageKey));
    if (signal.aborted) throw new DOMException(upstreamText("upstream.v165.message007"), "AbortError");
    return {
        ...node,
        metadata: applyGeneratedMediaResultMetadata({ ...node, metadata: resetGenerationTaskMetadata(node.metadata) }, imageMetadata(uploaded), {
            model: undefined,
            producedModelCandidate: undefined,
            producedModel: undefined,
            layerExtraction: { ...extraction, phase: "complete", rejectedTaskId: undefined, extractionTaskId: undefined },
        }),
    };
}

export async function buildGenerationTaskNodeResult(node: CanvasNodeData, task: GenerationTask, nodes: CanvasNodeData[] = [node], outputIndex = 0): Promise<CanvasNodeData> {
    const mode = generationTaskMode(task, node.type === CanvasNodeType.Text ? "text" : node.type === CanvasNodeType.Video ? "video" : node.type === CanvasNodeType.Audio ? "audio" : "image");
    const prompt = node.metadata?.prompt || task.prompt;
    const result = parseBackendGenerationResult(task);

    if (mode === "image") {
        const sourceResultStorageKey = result.images?.[outputIndex]?.storageKey;
        const processingSources = processingSourceIds(sourceResultStorageKey, node.metadata?.layerExtraction?.backgroundPatch?.source.storageKey, nodes.find((item) => item.id === node.metadata?.emotionEdit?.sourceNodeId)?.metadata?.storageKey);
        let extraction = node.metadata?.layerExtraction;
        let needsRemoval = false;
        if (node.metadata?.layerExtraction) {
            if (result.images?.length !== 1) throw new Error(upstreamText("upstream.v165.message008"));
            const normalized = await normalizeImageLayerCanvas({ ...result.images[0], ...(await processingImage(result.images[0])) }, extraction?.canvas);
            const info = normalized.info;
            result.images[0] = normalized.image;
            if (!info.nonempty) throw new Error(upstreamText("upstream.v165.message009"));
            if (extraction?.canvas && (info.width !== extraction.canvas.width || info.height !== extraction.canvas.height)) throw new Error(upstreamText("upstream.v165.message010"));
            needsRemoval = Boolean(extraction?.index && !hasUsableLayerTransparency(info) && extraction.allowBackgroundRemoval && extraction.phase === "extract");
            if (!needsRemoval) validateImageLayerOutput(info);
            if (extraction?.index === 0 && extraction.backgroundPatch) result.images[0] = await patchImageLayerBackground(normalized.image, { ...extraction.backgroundPatch, source: await processingImage(extraction.backgroundPatch.source) });
            extraction = { ...extraction!, phase: needsRemoval ? "background-removal-required" : "complete", extractionTaskId: extraction?.phase === "extract" ? task.id : extraction?.extractionTaskId, rejectedTaskId: undefined };
        }
        const listed = result.images?.[outputIndex];
        if (!listed?.dataUrl && !listed?.storageKey) throw new Error(t("creationRuntime.imageMissing"));
        const image = listed.dataUrl ? listed : { ...listed, dataUrl: await resolveImageUrl(listed.storageKey, "") };
        if (!image.dataUrl) throw new Error(t("creationRuntime.outputAssetMissing"));
        let resultDataUrl = image.dataUrl;
        const emotionEdit = node.metadata?.emotionEdit;
        if (emotionEdit) {
            if (!emotionEdit.editRegion) throw new Error(t("creationRuntime.emotionRegionMissing"));
            const sourceNode = nodes.find((item) => item.id === emotionEdit.sourceNodeId);
            if (!sourceNode?.metadata?.content) throw new Error(t("creationRuntime.emotionSourceDeleted"));
            const sourceDataUrl = (await processingImage({ storageKey: sourceNode.metadata.storageKey, dataUrl: sourceNode.metadata.content })).dataUrl;
            if (!sourceDataUrl) throw new Error(t("creationRuntime.emotionSourceUnreadable"));
            resultDataUrl = await compositeEmotionImage(sourceDataUrl, (await processingImage(image)).dataUrl, emotionEdit.editRegion, emotionEdit.faceBox);
        }
        const uploaded =
            image.storageKey && !emotionEdit && !extraction
                ? { url: await resolveImageUrl(image.storageKey, image.dataUrl), storageKey: image.storageKey, width: image.width || 1024, height: image.height || 1024, bytes: image.bytes || 0, mimeType: image.mimeType || "image/png" }
                : await uploadImage(resultDataUrl, undefined, processingSources);
        const imageConfig = NODE_DEFAULT_SIZE[CanvasNodeType.Image];
        if (extraction) extraction = { ...extraction, sourceResultStorageKey: uploaded.storageKey !== sourceResultStorageKey ? sourceResultStorageKey : undefined };
        const requestedImageSize = nodeSizeFromRatio(node.metadata?.size || "auto", imageConfig.width, imageConfig.height);
        const imageSizeBounds = requestedImageSize || { width: node.width || imageConfig.width, height: node.height || imageConfig.height };
        const hasReportedImageSize = Boolean(image.width && image.width > 0 && image.height && image.height > 0);
        const resultWidth = image.storageKey && !hasReportedImageSize && requestedImageSize ? requestedImageSize.width : uploaded.width;
        const resultHeight = image.storageKey && !hasReportedImageSize && requestedImageSize ? requestedImageSize.height : uploaded.height;
        const normalizedImage = resultWidth === uploaded.width && resultHeight === uploaded.height ? uploaded : { ...uploaded, width: resultWidth, height: resultHeight };
        const imageSize =
            node.metadata?.generationType === "edit" && !requestedImageSize ? { width: node.width || imageConfig.width, height: node.height || imageConfig.height } : fitNodeSize(resultWidth, resultHeight, imageSizeBounds.width, imageSizeBounds.height);
        return {
            ...node,
            type: CanvasNodeType.Image,
            width: imageSize.width,
            height: imageSize.height,
            position: { x: node.position.x + node.width / 2 - imageSize.width / 2, y: node.position.y + node.height / 2 - imageSize.height / 2 },
            metadata: applyGeneratedMediaResultMetadata(node, imageMetadata(normalizedImage), { prompt, ...completedTaskMetadata(task) }),
        };
    }

    if (mode === "video") {
        if (!result.video?.dataUrl && !result.video?.storageKey) throw new Error(t("creationRuntime.videoMissing"));
        const video = result.video.storageKey
            ? {
                  url: await resolveGenerationVideoUrl(result.video.storageKey, result.video.dataUrl),
                  storageKey: result.video.storageKey,
                  width: result.video.width,
                  height: result.video.height,
                  durationMs: result.video.durationMs,
                  bytes: result.video.bytes || 0,
                  mimeType: result.video.mimeType || "video/mp4",
              }
            : await storeGeneratedVideo({ url: result.video.dataUrl, mimeType: result.video.mimeType || "video/mp4" });
        const videoSize = fitNodeSize(video.width || node.width || VIDEO_NODE_MAX_SIZE.width, video.height || node.height || VIDEO_NODE_MAX_SIZE.height, VIDEO_NODE_MAX_SIZE.width, VIDEO_NODE_MAX_SIZE.height);
        // A failed poster must not hide a video already stored by the server.
        const videoPreview = await hydrateCanvasVideoPreview({ ...node, type: CanvasNodeType.Video, metadata: { ...node.metadata, content: video.url, storageKey: video.storageKey } });
        const geometry = node.metadata?.locked
            ? {}
            : {
                  width: videoSize.width,
                  height: videoSize.height,
                  position: { x: node.position.x + node.width / 2 - videoSize.width / 2, y: node.position.y + node.height / 2 - videoSize.height / 2 },
              };
        return {
            ...node,
            type: CanvasNodeType.Video,
            ...geometry,
            metadata: applyGeneratedMediaResultMetadata(node, { ...videoMetadata(video), videoPreview: videoPreview || undefined }, { prompt, ...completedTaskMetadata(task) }),
        };
    }

    if (mode === "audio") {
        const output = backendAudioResults(result)[outputIndex];
        if (!output?.dataUrl) throw new Error(t("creationRuntime.audioMissing"));
        let audio: UploadedFile;
        if (output.storageKey) {
            audio = { url: await resolveMediaUrl(output.storageKey, output.dataUrl), storageKey: output.storageKey, durationMs: output.durationMs, bytes: output.bytes || 0, mimeType: output.mimeType || "audio/mpeg" };
        } else {
            const response = await fetch(output.dataUrl);
            if (!response.ok) throw new Error(t("creationRuntime.downloadFailed", { status: response.status }));
            audio = await storeGeneratedAudio(await response.blob(), output.format || "mp3");
        }
        return { ...node, type: CanvasNodeType.Audio, metadata: applyGeneratedMediaResultMetadata(node, audioMetadata(audio), { prompt, ...completedTaskMetadata(task) }) };
    }

    if (!result.text) throw new Error(t("creationRuntime.textEmpty"));
    return {
        ...node,
        type: CanvasNodeType.Text,
        metadata: {
            ...node.metadata,
            content: result.text,
            richText: undefined,
            prompt,
            ...completedTaskMetadata(task),
            status: "success",
            errorDetails: undefined,
            generationErrorCode: undefined,
            resourceReloadAvailable: undefined,
            failedPromptFingerprint: undefined,
        },
    };
}

export async function applyGenerationTaskResultToNodes(nodes: CanvasNodeData[], task: GenerationTask, targetNodeId?: string) {
    const node = findGenerationTaskNode(nodes, task, targetNodeId);
    if (!node) return { nodes, updated: false, nodeId: "", node: null, additionalNodes: [] as CanvasNodeData[] };
    const mode = generationTaskMode(task, node.type === CanvasNodeType.Text ? "text" : node.type === CanvasNodeType.Video ? "video" : node.type === CanvasNodeType.Audio ? "audio" : "image");
    const result = parseBackendGenerationResult(task);
    const audioOutputs = mode === "audio" ? backendAudioResults(result) : [];

    const updatedNode = await buildGenerationTaskNodeResult(node, task, nodes, 0);
    const additionalNodes: CanvasNodeData[] = [];

    if (mode === "audio" && audioOutputs.length > 1) {
        const baseTitle = (node.title || "Audio").replace(/\s*·\s*\d+$/, "");
        if (!node.title?.includes("·")) {
            updatedNode.title = `${baseTitle} · 1`;
        }
        for (let index = 1; index < audioOutputs.length; index++) {
            const siblingId = `${node.id}:output:${index}`;
            const existing = nodes.find((item) => item.id === siblingId);
            if (existing && existing.metadata?.content) {
                additionalNodes.push(existing);
                continue;
            }
            const siblingDraft: CanvasNodeData = {
                ...node,
                id: siblingId,
                title: `${baseTitle} · ${index + 1}`,
                position: {
                    x: node.position.x + (node.width + 32) * index,
                    y: node.position.y,
                },
                metadata: {
                    ...node.metadata,
                    batchRootId: node.id,
                    outputIndex: index,
                },
            };
            const siblingNode = await buildGenerationTaskNodeResult(siblingDraft, task, nodes, index);
            siblingNode.title = `${baseTitle} · ${index + 1}`;
            additionalNodes.push(siblingNode);
        }
    }

    const allNodes = applySuccessfulVersionSelection(nodes, updatedNode);
    for (const add of additionalNodes) {
        const existingIndex = allNodes.findIndex((item) => item.id === add.id);
        if (existingIndex >= 0) {
            allNodes[existingIndex] = add;
        } else {
            allNodes.push(add);
        }
    }

    return {
        nodes: allNodes,
        updated: true,
        nodeId: node.id,
        node: updatedNode,
        additionalNodes,
    };
}

export async function applyMaterializedGenerationTaskResultToNodes(nodes: CanvasNodeData[], task: GenerationTask, output: GenerationTaskOutput, effectKey: string, targetNodeId?: string) {
    const node = findGenerationTaskNode(nodes, task, targetNodeId);
    if (!node) return { nodes, updated: false, nodeId: "", node: null };
    if (generationEffectApplied(node.metadata || {}, effectKey)) {
        return { nodes, updated: true, nodeId: node.id, node };
    }
    const asset = useAssetStore.getState().assets.find((candidate) => candidate.id === output.materializedAssetId);
    if (!asset) throw new Error(t("creationRuntime.outputAssetMissing"));
    const result = parseBackendGenerationResult(task);
    if (asset.kind === "image") {
        const images = [...(result.images || [])];
        images[output.outputIndex] = {
            dataUrl: asset.data.dataUrl || asset.coverUrl,
            storageKey: asset.data.storageKey,
            width: asset.data.width,
            height: asset.data.height,
            bytes: asset.data.bytes,
            mimeType: asset.data.mimeType,
        };
        result.images = images;
    } else if (asset.kind === "video") {
        result.video = { dataUrl: asset.data.url, ...asset.data };
    } else if (asset.kind === "audio") {
        const audios = [...backendAudioResults(result)];
        audios[output.outputIndex] = { dataUrl: asset.data.url, ...asset.data };
        result.audios = audios;
    } else {
        throw new Error(t("creationRuntime.outputAssetUnsupported"));
    }
    if (generationTaskInput(task)?.metadata?.layerDecomposition) {
        const built = await buildImageLayerTaskResult(node, { ...task, resultJson: JSON.stringify(result) }, nodes);
        const stamped = { ...built.node, metadata: applyGenerationConsumerEffect(built.node.metadata || {}, effectKey, (metadata) => metadata).value };
        const children = new Map(built.additionalNodes.map((child) => [child.id, child]));
        const merged = commitCanvasGenerationResult(nodes, node, stamped, task.id).map((item) => children.get(item.id) || item);
        return { nodes: [...merged, ...built.additionalNodes.filter((child) => !merged.some((item) => item.id === child.id))], updated: true, nodeId: node.id, node: stamped };
    }
    const updatedNode = await buildGenerationTaskNodeResult(node, { ...task, resultJson: JSON.stringify(result) }, nodes, output.outputIndex);
    const durableNode = {
        ...updatedNode,
        metadata: applyGenerationConsumerEffect(
            { ...updatedNode.metadata, assetId: updatedNode.metadata?.imageLayerGroup || (updatedNode.metadata?.layerExtraction && updatedNode.metadata.storageKey !== asset.data.storageKey) ? undefined : asset.id },
            effectKey,
            (metadata) => metadata,
        ).value,
    };
    return {
        nodes: applySuccessfulVersionSelection(nodes, durableNode),
        updated: true,
        nodeId: node.id,
        node: durableNode,
    };
}

function applySuccessfulVersionSelection(nodes: CanvasNodeData[], updatedNode: CanvasNodeData) {
    const versionRootId = updatedNode.metadata?.versionOfNodeId;
    return nodes.map((item) => {
        if (item.id === updatedNode.id) {
            return versionRootId ? { ...updatedNode, metadata: { ...updatedNode.metadata, versionPrimary: true } } : updatedNode;
        }
        if (!versionRootId || (item.metadata?.versionOfNodeId || item.id) !== versionRootId) return item;
        return { ...item, metadata: { ...item.metadata, versionPrimary: false } };
    });
}

export async function syncGenerationTaskToCanvasStore(task: GenerationTask) {
    const canvasId = task.clientContext?.canvasId || generationTaskInput(task)?.metadata?.canvasId || task.projectId;
    if (task.status !== "succeeded" || !canvasId) return false;
    // 短剧任务使用业务项目 ID，不能拿它请求同名的画布项目。
    const domainProjectId = task.clientContext?.domainProjectId || generationTaskInput(task)?.metadata?.domainProjectId;
    if (domainProjectId === canvasId || !generationTaskNodeId(task)) return false;
    const { loadCanvasProjectForEditing } = await import("@/services/user-data-sync");
    const project = await loadCanvasProjectForEditing(canvasId);
    if (!project) return false;
    const node = findGenerationTaskNode(project.nodes, task);
    if (!node) return false;
    const isText = generationTaskMode(task, node.type === CanvasNodeType.Text ? "text" : undefined) === "text";
    if (node.metadata?.taskId === task.id && node.metadata.status === "success" && node.metadata.content && (isText || node.metadata.assetId)) return false;
    if (!isText) {
        const { consumeGenerationTaskNode } = await import("@/services/project-asset-sync");
        const { applyCanvasGenerationTaskNodeEffect } = await import("@/services/canvas-generation-consumer");
        await consumeGenerationTaskNode(task, node.id, 0, async ({ task: materialized, output, effectKey, signal }) => {
            await applyCanvasGenerationTaskNodeEffect({
                projectId: project.id,
                nodeId: node.id,
                task: materialized,
                output,
                effectKey,
                signal,
                nodesRef: {
                    get current() {
                        return useCanvasStore.getState().projects.find((item) => item.id === project.id)?.nodes || [];
                    },
                },
                setNodes: (action) => {
                    const latest = useCanvasStore.getState().projects.find((item) => item.id === project.id);
                    if (latest) useCanvasStore.getState().updateProject(project.id, { nodes: typeof action === "function" ? action(latest.nodes) : action });
                },
            });
        });
        return true;
    }
    const updatedNode = await buildGenerationTaskNodeResult(node, task, project.nodes);
    const latest = useCanvasStore.getState().projects.find((item) => item.id === project.id);
    if (!latest?.nodes.some((item) => item.id === node.id)) return false;
    useCanvasStore.getState().updateProject(project.id, { nodes: commitCanvasGenerationResult(latest.nodes, node, updatedNode, task.id) });
    return true;
}

function findGenerationTaskNode(nodes: CanvasNodeData[], task: GenerationTask, targetNodeId?: string) {
    const nodeId = targetNodeId || generationTaskNodeId(task);
    return nodeId ? nodes.find((node) => node.id === nodeId) : nodes.find((node) => node.metadata?.taskId === task.id);
}

function completedTaskMetadata(task: GenerationTask): CanvasNodeMetadata {
    return {
        taskId: task.id,
        taskStatus: task.status,
        taskProgress: typeof task.progress === "number" && Number.isFinite(task.progress) ? Math.max(0, Math.min(100, Math.round(task.progress))) : 100,
        taskStage: task.stage,
        taskMediaStage: task.mediaStage,
        taskCanRecoverMedia: task.canRecoverMedia,
        taskStartedAt: task.startedAt,
        taskCompletedAt: task.completedAt,
        taskDurationMs: task.startedAt && task.completedAt ? Math.max(0, Date.parse(task.completedAt) - Date.parse(task.startedAt)) : undefined,
        taskCreatedAt: task.createdAt || task.created_at,
        taskUpdatedAt: task.updatedAt || task.updated_at,
        errorDetails: undefined,
        generationErrorCode: undefined,
        failedPromptFingerprint: undefined,
    };
}

export async function buildImageLayerTaskResult(node: CanvasNodeData, task: GenerationTask, nodes: CanvasNodeData[]) {
    const images = parseBackendGenerationResult(task).images || [];
    if (node.metadata?.taskId === task.id && node.metadata.content && node.metadata.imageLayerGroup && node.metadata.generationOutputCount === images.length)
        return {
            node: node.metadata.status === "success" ? node : { ...node, metadata: { ...node.metadata, ...completedTaskMetadata(task), status: "success" as const } },
            additionalNodes: [] as CanvasNodeData[],
        };
    const layerImages = [];
    for (const image of images) layerImages.push((await normalizeImageLayerCanvas(await processingImage(image), node.metadata?.layerDecomposition?.canvas)).image);
    const decoded = await decodeAndComposeImageLayers(layerImages);
    const size = fitNodeSize(decoded.width, decoded.height, node.width, node.height);
    const firstPosition = imageGenerationChildPosition(node.position, size.width, size, 0);
    const lastPosition = imageGenerationChildPosition(node.position, size.width, size, images.length - 1);
    const secondPosition = imageGenerationChildPosition(node.position, size.width, size, 1);
    const layoutPosition = findAvailableGenerationGroupPosition(nodes, firstPosition, {
        width: secondPosition.x - firstPosition.x + size.width,
        height: lastPosition.y - firstPosition.y + size.height,
    });
    const children: CanvasNodeData[] = [];
    for (let index = 0; index < images.length; index += 1) {
        const id = `${node.id}:task:${task.id}:layer:${index}`;
        const existing = nodes.find((item) => item.id === id);
        if (existing) {
            children.push(existing);
            continue;
        }
        const image = images[index];
        const stored: UploadedImage = await uploadImage(decoded.layers[index].blob, undefined, processingSourceIds(image.storageKey));
        if (stored.pendingRemoteUpload) throw new Error(upstreamText("upstream.v165.message011"));
        children.push({
            id,
            type: CanvasNodeType.Image,
            title: decoded.layers[index].transparent ? upstreamText("upstream.v165.message012", { p0: index + 1 }) : upstreamText("upstream.v165.message013"),
            ...size,
            position: (() => {
                const position = imageGenerationChildPosition(node.position, size.width, size, index);
                return { x: position.x + layoutPosition.x - firstPosition.x, y: position.y + layoutPosition.y - firstPosition.y };
            })(),
            metadata: commitProducedModel(
                {
                    ...imageMetadata(stored),
                    batchRootId: node.id,
                    imageLayer: { groupId: node.id, outputIndex: index, kind: decoded.layers[index].transparent ? "transparent" : "base" },
                    model: node.metadata?.model || task.model,
                    producedModel: task.model,
                },
                task.model,
            ),
        });
    }
    const composite = await uploadImage(decoded.composite, undefined, processingSourceIds(...images.map((image) => image.storageKey)));
    if (composite.pendingRemoteUpload) throw new Error(upstreamText("upstream.v165.message014"));
    const group: NonNullable<CanvasNodeMetadata["imageLayerGroup"]> = {
        width: decoded.width,
        height: decoded.height,
        compositeStatus: "ready",
        layers: decoded.order.map((index) => ({ nodeId: children[index].id, x: 0, y: 0, visible: true })),
    };
    group.compositeSignature = imageLayerCompositeSignature(group, children);
    return {
        node: {
            ...node,
            ...size,
            metadata: applyGeneratedMediaResultMetadata(
                node,
                imageMetadata(composite),
                {
                    ...completedTaskMetadata(task),
                    imageLayerGroup: group,
                    isBatchRoot: true,
                    batchChildIds: group.layers.map((layer) => layer.nodeId),
                    primaryImageId: undefined,
                    imageBatchExpanded: node.metadata?.imageBatchExpanded ?? false,
                    generationOutputCount: images.length,
                },
                task.model,
            ),
        },
        additionalNodes: children,
    };
}

/** 仅合成已验收的层，保留失败项身份；重试新增结果不会覆盖已有排序与可见性。 */
export async function buildExperimentalImageLayerResult(root: CanvasNodeData, nodes: CanvasNodeData[]) {
    const plan = root.metadata?.experimentalLayerPlan;
    if (!plan || !plan.requests.length || plan.requests.length > 8) throw new Error(upstreamText("upstream.v165.message015"));
    const candidates = plan.requests.flatMap((request, index) => {
        const node = nodes.find((node) => node.id === request.nodeId);
        return node?.metadata?.content && node.metadata.status === "success" && (!node.metadata.layerExtraction?.phase || node.metadata.layerExtraction.phase === "complete") ? [{ node, index: node.metadata.layerExtraction?.index ?? index }] : [];
    });
    const ready: typeof candidates = [];
    const rejected: CanvasNodeData[] = [];
    for (const item of candidates) {
        try {
            validateImageLayerOutput(await inspectImageLayer(await processingImage({ dataUrl: item.node.metadata!.content!, storageKey: item.node.metadata?.storageKey })));
            ready.push(item);
        } catch (error) {
            rejected.push({
                ...item.node,
                metadata: {
                    ...item.node.metadata,
                    status: "error",
                    errorDetails: error instanceof Error ? error.message : upstreamText("upstream.v165.message016"),
                    ...(item.node.metadata?.layerExtraction ? { layerExtraction: { ...item.node.metadata.layerExtraction, rejectedTaskId: item.node.metadata.taskId } } : {}),
                },
            });
        }
    }
    if (!ready.length) throw new Error(upstreamText("upstream.v165.message017"));
    const previous = root.metadata?.imageLayerGroup;
    const order = previous?.layers.flatMap((layer) => ready.filter((item) => item.node.id === layer.nodeId)) || [];
    for (const item of ready) {
        if (order.some((existing) => existing.node.id === item.node.id)) continue;
        const before = order.findIndex((existing) => existing.index > item.index);
        order.splice(before < 0 ? order.length : before, 0, item);
    }
    const sources = order.map((item) => item.node);
    const decoded = await decodeAndComposeImageLayers(
        await Promise.all(sources.map((node) => processingImage({ dataUrl: node.metadata!.content!, storageKey: node.metadata?.storageKey }))),
        order.map((item) => item.index),
    );
    const updatedChildren = sources.map((node, index) => ({
        ...node,
        title: node.metadata?.imageLayer ? node.title : imageLayerTargetName(plan.requests.find((request) => request.nodeId === node.id)!.target),
        metadata: { ...node.metadata, batchRootId: root.id, imageLayer: { groupId: root.id, outputIndex: order[index].index, kind: order[index].index === 0 ? ("base" as const) : ("transparent" as const) } },
    }));
    const completed = sources.length;
    const group: NonNullable<CanvasNodeMetadata["imageLayerGroup"]> = {
        width: decoded.width,
        height: decoded.height,
        compositeStatus: "ready",
        layers: decoded.order.map(
            (index) =>
                previous?.layers.find((layer) => layer.nodeId === sources[index].id) || {
                    nodeId: sources[index].id,
                    x: 0,
                    y: 0,
                    visible: !order.some((item) => item.index === 0) || order[index].index === 0 || plan.requests.find((request) => request.nodeId === sources[index].id)?.removeFromBackground !== false,
                },
        ),
        ...(completed < plan.requests.length ? { incomplete: { completed, total: plan.requests.length, failed: plan.requests.length - completed, missingBackground: !order.some((item) => item.index === 0) } } : {}),
    };
    const composite = await uploadImage(
        previous || group.layers.some((layer) => !layer.visible) ? await composeCanvasImageLayerGroup(group, updatedChildren) : decoded.composite,
        undefined,
        processingSourceIds(...sources.map((node) => node.metadata?.storageKey)),
    );
    if (composite.pendingRemoteUpload) throw new Error(upstreamText("upstream.v165.message018"));
    group.compositeSignature = imageLayerCompositeSignature(group, updatedChildren);
    return {
        node: {
            ...root,
            ...fitNodeSize(decoded.width, decoded.height, root.width, root.height),
            metadata: applyGeneratedMediaResultMetadata(root, imageMetadata(composite), {
                imageLayerGroup: group,
                isBatchRoot: true,
                batchChildIds: plan.requests.map((request) => request.nodeId),
                imageBatchExpanded: root.metadata?.imageBatchExpanded ?? false,
                primaryImageId: undefined,
                experimentalLayerPlan: {
                    ...plan,
                    composedSignature: experimentalLayerSignature(
                        root,
                        nodes.map((node) => rejected.find((item) => item.id === node.id) || node),
                    ),
                    errorSignature: undefined,
                },
                status: "success",
                errorDetails: undefined,
                batchFailedCount: plan.requests.length - completed,
                generationOutputCount: sources.length,
            }),
        },
        additionalNodes: [...updatedChildren, ...rejected],
    };
}
