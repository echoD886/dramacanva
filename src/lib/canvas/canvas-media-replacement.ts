import type { CanvasNodeData } from "@/types/canvas";
import { recordReplacedMediaVersion } from "./canvas-media-versions";

export function clearReplacedMediaMetadata(metadata: CanvasNodeData["metadata"]): CanvasNodeData["metadata"] {
    return {
        ...metadata,
        waveform: undefined,
        waveformVersion: undefined,
        imageRotation: undefined,
        assetId: undefined,
        taskId: undefined,
        freeResize: false,
        isBatchRoot: undefined,
        batchRootId: undefined,
        batchChildIds: undefined,
        batchFailedCount: undefined,
        batchUsesReferenceImages: undefined,
        generationType: undefined,
        generationResultPlacement: undefined,
        copiedFromNodeId: undefined,
        versionOfNodeId: undefined,
        model: undefined,
        size: undefined,
        quality: undefined,
        transparentBackground: undefined,
        count: undefined,
        references: undefined,
        primaryImageId: undefined,
        imageBatchExpanded: undefined,
        richText: undefined,
        composerContent: undefined,
    };
}

export function replaceCanvasNodeWithAsset(original: CanvasNodeData, media: CanvasNodeData): CanvasNodeData {
    return recordReplacedMediaVersion(
        original,
        {
            ...original,
            type: media.type,
            width: media.width,
            height: media.height,
            metadata: {
                ...clearReplacedMediaMetadata(original.metadata),
                storageKey: undefined,
                naturalWidth: undefined,
                naturalHeight: undefined,
                durationMs: undefined,
                hasAudio: undefined,
                bytes: undefined,
                mimeType: undefined,
                fileUpload: undefined,
                fileUploadProgress: undefined,
                errorDetails: undefined,
                ...media.metadata,
            },
        },
        "upload",
    );
}
