import type { CanvasNodeData } from "@/types/canvas";
import { currentLocaleText } from "@/i18n/current-locale-text";

const COPY_SUFFIX = /(_copy\d+|\s+Copy)$/i;
const VERSION_SUFFIX = /\s*·\s*([A-Z])\s*$/;

export function manualNodeTitle(node: CanvasNodeData | undefined) {
    if (!node?.title.trim()) return undefined;
    if (node.metadata?.titleEdited) return node.title;
    if (node.metadata?.content || node.metadata?.storageKey || node.metadata?.taskId) return undefined;
    return node.metadata?.defaultTitle && node.title !== node.metadata.defaultTitle ? node.title : undefined;
}

export function buildMediaGenerationNodeTitle(prompt: string, kind: "image" | "video", sourceNode?: CanvasNodeData) {
    const fallback = currentLocaleText(kind === "video" ? "canvasExtra.autoTitle.generatedVideo" : "canvasExtra.autoTitle.generatedImage");
    const namedWork = prompt.match(/《([^》\n]{1,24})》/u)?.[1];
    if (namedWork && kind === "video") return `${namedWork} · ${currentLocaleText("canvasExtra.timeline.defaultVideoTitle")}`;
    if (kind === "image" && /角色|人物|character/i.test(prompt) && /设定|三视图|设计|sheet|design/i.test(prompt)) return currentLocaleText("canvasExtra.preset.characterSheet.name");
    const sourceTitle = sourceNode?.metadata?.workflowTitle?.trim();
    if (sourceTitle && sourceTitle.length <= 24) return sourceTitle;
    // A compact subject can stand alone as a title. Instructions and reference
    // inventories need a neutral title instead of a truncated prompt prefix.
    const subject = prompt.trim();
    if (subject.length <= 24 && !/[\n:：。！!?？【】]/u.test(subject)) return subject || fallback;
    return fallback;
}

export function buildImageGenerationNodeTitle(prompt: string, sourceNode?: CanvasNodeData, outputIndex?: number, outputCount = 1) {
    let title = buildMediaGenerationNodeTitle(prompt, "image", sourceNode);
    if (sourceNode) {
        const sourceTitleWithoutVersion = sourceNode.title.replace(VERSION_SUFFIX, "");
        const copySuffix = sourceTitleWithoutVersion.match(COPY_SUFFIX)?.[1] || "";
        const versionLabel = validVersionLabel(sourceNode.metadata?.versionLabel) || sourceNode.title.match(VERSION_SUFFIX)?.[1] || "";
        const titleWithoutVersion = title.replace(VERSION_SUFFIX, "");
        if (copySuffix && !titleWithoutVersion.toLowerCase().endsWith(copySuffix.toLowerCase())) title += copySuffix;
        if (versionLabel && !title.endsWith(` · ${versionLabel}`)) title += ` · ${versionLabel}`;
    }
    if (outputCount > 1 && outputIndex !== undefined) title += ` · ${outputIndex + 1}`;
    return title;
}

function validVersionLabel(value?: string) {
    const normalized = value?.trim().toUpperCase() || "";
    return /^[A-Z]$/.test(normalized) ? normalized : "";
}
