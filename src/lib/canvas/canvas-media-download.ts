import { currentLocaleText } from "@/i18n/current-locale-text";
import { base64ImageDataUrl } from "@/lib/image-mime";
import { CanvasNodeType, type CanvasNodeData, type CanvasNodeTypeId } from "@/types/canvas";

const FILE_NAME_PART_LIMIT = 80;

const MIME_EXTENSIONS: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "video/ogg": "ogv",
    "video/mpeg": "mpeg",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/aac": "aac",
    "audio/flac": "flac",
    "audio/ogg": "ogg",
    "audio/opus": "opus",
};

const CONTENT_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif", "svg", "mp4", "webm", "mov", "ogv", "ogg", "mpeg", "mpg", "mp3", "m4a", "wav", "aac", "flac", "opus"]);

export function canDownloadCanvasNodeMedia(node: CanvasNodeData) {
    return [CanvasNodeType.Image, CanvasNodeType.Video, CanvasNodeType.Audio].some((type) => type === node.type) && Boolean(node.metadata?.content?.trim() || node.metadata?.storageKey?.trim());
}

export function isCanvasMediaCompositePending(node: CanvasNodeData) {
    const status = node.metadata?.imageLayerGroup?.compositeStatus;
    return Boolean(status && status !== "ready");
}

/** Each download settles independently; a failed file must not stop the selection. */
export async function downloadCanvasMediaSelection(nodes: CanvasNodeData[], download: (node: CanvasNodeData) => Promise<void>, pause = () => new Promise<void>((resolve) => setTimeout(resolve, 400))) {
    const targets = nodes.filter((node) => canDownloadCanvasNodeMedia(node) && !isCanvasMediaCompositePending(node));
    let started = 0;
    const failedNodeIds: string[] = [];
    for (const [index, node] of targets.entries()) {
        if (index > 0) await pause();
        try {
            await download(node);
            started++;
        } catch {
            failedNodeIds.push(node.id);
        }
    }
    return { started, failed: failedNodeIds.length, skipped: nodes.length - targets.length, failedNodeIds };
}

export function buildCanvasMediaDownloadFileName(canvasTitle: string, node: CanvasNodeData, now = new Date()) {
    const canvasName = safeFileNamePart(canvasTitle, currentLocaleText("canvasExtra.canvas.unnamedCanvas"));
    const nodeName = safeFileNamePart(node.title, defaultNodeName(node.type));
    return `${canvasName}_${nodeName}_${formatDownloadDate(now)}.${canvasMediaFileExtension(node)}`;
}

export function canvasMediaFileExtension(node: CanvasNodeData) {
    const base64 = node.metadata?.content?.match(/^data:[^,]*;base64,(.*)$/s)?.[1];
    if (base64) {
        const detected = base64ImageDataUrl(base64);
        if (detected.startsWith("data:image/gif;")) return "gif";
    }
    return extensionFromMimeType(node.metadata?.mimeType) || extensionFromContent(node.metadata?.content) || defaultExtension(node.type);
}

function extensionFromMimeType(mimeType?: string) {
    const normalized = mimeType?.split(";", 1)[0]?.trim().toLowerCase();
    return normalized ? MIME_EXTENSIONS[normalized] : undefined;
}

function extensionFromContent(content?: string) {
    if (!content) return undefined;
    const dataMimeType = content.match(/^data:([^;,]+)/i)?.[1];
    const dataExtension = extensionFromMimeType(dataMimeType);
    if (dataExtension) return dataExtension;
    const path = content.split(/[?#]/, 1)[0];
    const extension = path.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
    if (!extension || !CONTENT_EXTENSIONS.has(extension)) return undefined;
    if (extension === "jpeg") return "jpg";
    if (extension === "mpg") return "mpeg";
    return extension;
}

function safeFileNamePart(value: string, fallback: string) {
    const normalized = value
        .trim()
        .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_")
        .replace(/_+/g, "_")
        .replace(/\s+/g, " ")
        .replace(/^_+|_+$/g, "")
        .slice(0, FILE_NAME_PART_LIMIT)
        .replace(/[. ]+$/g, "");
    if (!normalized) return fallback;
    return /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(normalized) ? `_${normalized}` : normalized;
}

function formatDownloadDate(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}${month}${day}`;
}

function defaultNodeName(type: CanvasNodeTypeId) {
    if (type === CanvasNodeType.Video) return currentLocaleText("canvasExtra.nodeAsset.video");
    if (type === CanvasNodeType.Audio) return currentLocaleText("canvasExtra.nodeAsset.audio");
    return currentLocaleText("canvasExtra.nodeAsset.image");
}

function defaultExtension(type: CanvasNodeTypeId) {
    if (type === CanvasNodeType.Video) return "mp4";
    if (type === CanvasNodeType.Audio) return "mp3";
    return "png";
}
