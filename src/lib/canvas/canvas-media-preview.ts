import { buildLibTVVideoPreviewUrl } from "@/lib/canvas/libtv-import";
import { CanvasNodeType, type CanvasNodeData } from "@/types/canvas";

/**
 * Returns an image source that is safe to mount for a passive video preview.
 * The original video URL is deliberately never returned: callers must fall
 * back to a video icon instead of creating a decoder outside the active node.
 */
export function canvasNodeVideoPreviewUrl(node: CanvasNodeData) {
    if (node.type !== CanvasNodeType.Video) return "";
    const content = node.metadata?.content || "";
    const generatedPreview = node.metadata?.videoPreview?.content || "";
    if (generatedPreview && generatedPreview !== content) return generatedPreview;
    const explicitPreview = node.metadata?.previewContent || "";
    if (explicitPreview && explicitPreview !== content) return explicitPreview;
    return buildLibTVVideoPreviewUrl(content);
}

/** A browser-compatible copy is valid only while its original still owns the node. */
export function canvasNodeVideoPlayback(node: CanvasNodeData) {
    if (node.type !== CanvasNodeType.Video) return undefined;
    const playback = node.metadata?.videoPlayback;
    return playback && playback.sourceContent === node.metadata?.content && playback.content ? playback : undefined;
}

export function canvasVideoAssetPreviewUrl(videoUrl: string, coverUrl?: string) {
    const explicitCover = coverUrl?.trim() || "";
    if (explicitCover && explicitCover !== videoUrl) return explicitCover;
    return buildLibTVVideoPreviewUrl(videoUrl);
}
