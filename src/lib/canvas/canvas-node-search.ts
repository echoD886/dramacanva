import { getNodeListLabel } from "@/lib/canvas/node-registry";
import { localizedNodeListLabel } from "@/i18n/canvas-node-label";
import { currentLocaleText as t } from "@/i18n/current-locale-text";
import { resolveAppLocale } from "@/i18n/app-locale";
import { canvasNodeCreatedAt, canvasNodeUpdatedAt } from "@/lib/canvas/canvas-node-timestamps";
import { CanvasNodeType, type CanvasNodeData, type CanvasNodeTypeId } from "@/types/canvas";

export type CanvasNodeSearchDisplay = {
    nodeLabel: (type: CanvasNodeTypeId) => string;
    shot: (number: number) => string;
    duration: (durationMs: number) => string;
    bytes: (bytes: number) => string;
    time: (value: string) => string;
    notRecorded: string;
};

function searchTimeFormatter() {
    return new Intl.DateTimeFormat(resolveAppLocale(), { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
}

export function canvasNodeSearchDisplay(translate: typeof t, time: (value: string) => string): CanvasNodeSearchDisplay {
    return {
        nodeLabel: (type) => localizedNodeListLabel(type, translate),
        shot: (number) => translate("nodeSearch.shot", { number }),
        duration: (durationMs) => formatDuration(durationMs, translate),
        bytes: formatBytes,
        time,
        notRecorded: translate("nodeSearch.unrecorded"),
    };
}

function defaultDisplay() {
    return canvasNodeSearchDisplay(t, (value) => searchTimeFormatter().format(new Date(value)));
}

export function searchCanvasNodes(nodes: CanvasNodeData[], query: string, limit = 80, display = defaultDisplay()) {
    const keyword = query.trim().toLocaleLowerCase();
    return nodes
        .filter((node) => !keyword || canvasNodeSearchTerms(node, display).some((value) => value.toLocaleLowerCase().includes(keyword)))
        .toSorted((left, right) => timestampValue(canvasNodeUpdatedAt(right)) - timestampValue(canvasNodeUpdatedAt(left)))
        .slice(0, keyword ? limit : Math.min(limit, 40));
}

export function canvasNodeSearchContext(node: CanvasNodeData, display = defaultDisplay()) {
    const location = [node.metadata?.chapterTitle, typeof node.metadata?.shotIndex === "number" ? display.shot(node.metadata.shotIndex + 1) : ""].filter(Boolean).join(" · ");
    const textContent = node.type === CanvasNodeType.Text || node.type === CanvasNodeType.Markdown || node.type === CanvasNodeType.Script || node.type === CanvasNodeType.Skill
        ? node.metadata?.content
        : undefined;
    return location || node.metadata?.prompt || node.metadata?.composerContent || node.metadata?.workflowDescription || textContent || display.nodeLabel(node.type);
}

export function canvasNodeMaterialSummary(node: CanvasNodeData, display = defaultDisplay()) {
    const details = [display.nodeLabel(node.type)];
    const width = node.metadata?.naturalWidth;
    const height = node.metadata?.naturalHeight;
    if (width && height) details.push(`${width}×${height}`);
    if (node.metadata?.durationMs) details.push(display.duration(node.metadata.durationMs));
    if (node.metadata?.bytes) details.push(display.bytes(node.metadata.bytes));
    if (node.metadata?.model) details.push(node.metadata.model);
    return details.slice(0, 3).join(" · ");
}

export function canvasNodeSearchTimes(node: CanvasNodeData, display = defaultDisplay()) {
    const createdAt = canvasNodeCreatedAt(node);
    const updatedAt = canvasNodeUpdatedAt(node);
    return {
        createdAt,
        updatedAt,
        createdLabel: createdAt ? display.time(createdAt) : display.notRecorded,
        updatedLabel: updatedAt ? display.time(updatedAt) : display.notRecorded,
    };
}

function canvasNodeSearchTerms(node: CanvasNodeData, display: CanvasNodeSearchDisplay) {
    return [
        node.title,
        node.type,
        getNodeListLabel(node.type),
        display.nodeLabel(node.type),
        node.metadata?.prompt,
        node.metadata?.composerContent,
        node.metadata?.model,
        node.metadata?.chapterTitle,
        node.metadata?.workflowTitle,
        node.metadata?.workflowDescription,
        typeof node.metadata?.shotIndex === "number" ? display.shot(node.metadata.shotIndex + 1) : "",
        ...(node.metadata?.assetTags || []),
    ].filter((value): value is string => typeof value === "string" && Boolean(value));
}

function timestampValue(value?: string) {
    const timestamp = value ? Date.parse(value) : 0;
    return Number.isFinite(timestamp) ? timestamp : 0;
}

function formatDuration(durationMs: number, translate: typeof t) {
    const seconds = Math.max(0, Math.round(durationMs / 1000));
    if (seconds < 60) return translate("nodeSearch.seconds", { seconds });
    return translate("nodeSearch.duration", { minutes: Math.floor(seconds / 60), seconds: seconds % 60 });
}

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}
