import { FileText, ImageIcon, Music2, Video } from "lucide-react";
import { CachedResourceImage } from "@/components/cached-resource-image";
import { canvasNodeVideoPreviewUrl } from "@/lib/canvas/canvas-media-preview";
import { buildLibTVImagePreviewUrl } from "@/lib/canvas/libtv-import";
import { caseImageThumbnailUrl } from "@/lib/canvas/case-image-thumbnail";
import { resourceIdFromStorageKey } from "@/services/api/resources";
import { useI18n } from "@/i18n/use-i18n";
import type { CanvasTheme } from "@/lib/canvas-theme";
import { CanvasNodeType, type CanvasNodeData } from "@/types/canvas";
import "./canvas-readonly-node-content.css";

/** Videos map only through their stored poster; the original is never decoded for a passive view. */
export function readonlyNodeMediaKey(node: CanvasNodeData) {
    return node.type === CanvasNodeType.Video ? node.metadata?.videoPreview?.storageKey : node.metadata?.storageKey;
}

/** Shared by editor LOD and library mapping. No editor subscriptions or players. */
export function CanvasReadonlyNodeContent({ node, theme }: { node: CanvasNodeData; theme: CanvasTheme }) {
    const { t } = useI18n();
    const metadata = node.metadata;
    const image = node.type === CanvasNodeType.Image;
    const video = node.type === CanvasNodeType.Video;
    const source = metadata?.previewContent || metadata?.content || "";
    const src = image ? metadata?.importSource?.provider === "libtv" ? buildLibTVImagePreviewUrl(source) || "" : metadata?.previewContent || caseImageThumbnailUrl(source) || (/^(blob:|data:image\/)/.test(source) ? source : "") : video ? canvasNodeVideoPreviewUrl(node) : "";
    const resource = image && resourceIdFromStorageKey(metadata?.storageKey);
    const mediaKey = readonlyNodeMediaKey(node);
    if (video && !src && !mediaKey && resourceIdFromStorageKey(metadata?.storageKey)) return <CachedResourceImage variant="thumbnail" thumbnailOnly storageKey={metadata?.storageKey} alt="" className="pointer-events-none block size-full select-none object-contain" />;
    if (src || resource) return <CachedResourceImage variant="thumbnail" thumbnailOnly storageKey={mediaKey} src={src} alt="" loading="lazy" decoding="async" draggable={false} className="pointer-events-none block size-full select-none object-contain" />;
    if (metadata?.storyboard) return <table className="canvas-readonly-storyboard" style={{ color: theme.node.text }}><thead><tr><th>{t("scriptEditor.shotNumber")}</th><th>{t("scriptEditor.durationSeconds")}</th><th>{t("scriptEditor.videoMotionPrompt")}</th><th>{t("scriptEditor.dialogue")}</th></tr></thead><tbody>{metadata.storyboard.rows.slice(0, 8).map(row => <tr key={row.id}><td>{row.shotNumber}</td><td>{row.durationSeconds}</td><td>{(row.videoMotionPrompt || row.plotDescription)?.slice(0, 160)}</td><td>{row.dialogue?.slice(0, 160)}</td></tr>)}</tbody></table>;
    if (node.type === CanvasNodeType.Text || node.type === CanvasNodeType.Markdown) return <div className="canvas-readonly-text" style={{ color: theme.node.text }}>{(metadata?.content || metadata?.prompt || node.title || "").slice(0, 1200)}</div>;
    const Icon = video ? Video : image ? ImageIcon : node.type === CanvasNodeType.Audio ? Music2 : FileText;
    return <div className="flex size-full items-center justify-center" style={{ color: theme.node.muted }}><Icon className="size-6" /></div>;
}
