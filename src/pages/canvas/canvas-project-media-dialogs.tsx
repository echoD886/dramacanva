import { CanvasNodeLayerDecompositionDialog, type CanvasImageLayerDecompositionPayload } from "@/components/canvas/canvas-node-layer-decomposition-dialog";
import { CanvasNodeAnnotationDialog } from "@/components/canvas/canvas-node-annotation-dialog";
import { CanvasNodeCropDialog, type CanvasImageCropRect } from "@/components/canvas/canvas-node-crop-dialog";
import { CanvasNodeMaskEditDialog, type CanvasImageMaskEditPayload } from "@/components/canvas/canvas-node-mask-edit-dialog";
import { CanvasNodeUpscaleDialog, type CanvasImageUpscaleParams } from "@/components/canvas/canvas-node-upscale-dialog";
import type { CanvasNodeData } from "@/types/canvas";
import type { AiConfig } from "@/stores/use-config-store";

type CanvasProjectMediaDialogsProps = {
    layerDecompositionNode: CanvasNodeData | null;
    onCloseLayerDecomposition: () => void;
    onLayerDecomposition: (node: CanvasNodeData, payload: CanvasImageLayerDecompositionPayload) => void;
    cropNode: CanvasNodeData | null;
    annotationNode: CanvasNodeData | null;
    maskEditNode: CanvasNodeData | null;
    upscaleNode: CanvasNodeData | null;
    onCloseCrop: () => void;
    onCloseAnnotation: () => void;
    onCloseMaskEdit: () => void;
    onCloseUpscale: () => void;
    onCrop: (node: CanvasNodeData, crop: CanvasImageCropRect) => void;
    onAnnotate: (node: CanvasNodeData, dataUrl: string) => void;
    onMaskEdit: (node: CanvasNodeData, payload: CanvasImageMaskEditPayload) => void;
    onUpscale: (node: CanvasNodeData, params: CanvasImageUpscaleParams) => void;
    config: AiConfig;
};

export function CanvasProjectMediaDialogs({
    layerDecompositionNode,
    onCloseLayerDecomposition,
    onLayerDecomposition,
    cropNode,
    annotationNode,
    maskEditNode,
    upscaleNode,
    onCloseCrop,
    onCloseAnnotation,
    onCloseMaskEdit,
    onCloseUpscale,
    onCrop,
    onAnnotate,
    onMaskEdit,
    onUpscale,
    config,
}: CanvasProjectMediaDialogsProps) {
    return (
        <>
            {layerDecompositionNode?.metadata?.content ? (
                <CanvasNodeLayerDecompositionDialog
                    dataUrl={layerDecompositionNode.metadata.content}
                    sourceSize={layerDecompositionNode.metadata.naturalWidth && layerDecompositionNode.metadata.naturalHeight ? { width: layerDecompositionNode.metadata.naturalWidth, height: layerDecompositionNode.metadata.naturalHeight } : undefined}
                    config={{
                        ...config,
                        model: layerDecompositionNode.metadata.model || config.model,
                        imageModel: layerDecompositionNode.metadata.model || config.imageModel,
                        size: layerDecompositionNode.metadata.size || config.size,
                        quality: layerDecompositionNode.metadata.quality || config.quality,
                    }}
                    open
                    onClose={onCloseLayerDecomposition}
                    onConfirm={(payload) => onLayerDecomposition(layerDecompositionNode, payload)}
                />
            ) : null}
            {cropNode?.metadata?.content ? <CanvasNodeCropDialog dataUrl={cropNode.metadata.content} open onClose={onCloseCrop} onConfirm={(crop) => onCrop(cropNode, crop)} /> : null}
            {annotationNode?.metadata?.content ? (
                <CanvasNodeAnnotationDialog image={{ url: annotationNode.metadata.content, storageKey: annotationNode.metadata.storageKey }} open onClose={onCloseAnnotation} onConfirm={(dataUrl) => onAnnotate(annotationNode, dataUrl)} />
            ) : null}
            {maskEditNode?.metadata?.content ? (
                <CanvasNodeMaskEditDialog
                    dataUrl={maskEditNode.metadata.content}
                    config={{
                        ...config,
                        model: maskEditNode.metadata.model || config.model,
                        imageModel: maskEditNode.metadata.model || config.imageModel,
                        size: maskEditNode.metadata.size || config.size,
                        quality: maskEditNode.metadata.quality || config.quality,
                        count: String(maskEditNode.metadata.count || config.count),
                    }}
                    open
                    onClose={onCloseMaskEdit}
                    onConfirm={(payload) => onMaskEdit(maskEditNode, payload)}
                />
            ) : null}
            {upscaleNode?.metadata?.content ? <CanvasNodeUpscaleDialog dataUrl={upscaleNode.metadata.content} open onClose={onCloseUpscale} onConfirm={(params) => onUpscale(upscaleNode, params)} /> : null}
        </>
    );
}
