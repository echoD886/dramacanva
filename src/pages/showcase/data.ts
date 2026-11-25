import caseSummariesJson from "./fixtures/case-summaries.local.json";
import { resolveAppLocale } from "@/i18n/app-locale";
import type { MessageKey, MessageValues } from "@/i18n/messages";
import { translateMessage } from "@/i18n/messages";

export type ShowcaseTranslator = (key: MessageKey, values?: MessageValues) => string;

const currentTranslator: ShowcaseTranslator = (key, values) => translateMessage(resolveAppLocale(), key, values);

export const SHOWCASE_TEMPLATE_UUIDS = {} as const;

export type ShowcaseTemplateUuid = string;
export type ShowcaseNodeType = "image" | "text" | "video" | "audio" | "group" | string;

export interface ShowcaseGraphNodeData {
    type?: ShowcaseNodeType;
    name?: string;
    alt?: string;
    content?: unknown[];
    contentWidth?: number;
    contentHeight?: number;
    nodeWidth?: number;
    nodeHeight?: number;
    playbackVolume?: number;
    poster?: string;
    url?: string[];
    coverUrl?: string;
    styleName?: string;
    rows?: Array<Record<string, unknown>>;
    params?: { prompt?: string; [key: string]: unknown };
    videoHasAudioTrack?: boolean;
    browserPlayback?: { sourceContent: string; content: string; mimeType: string };
    resourceMeta?: {
        items?: Array<{
            width?: number;
            height?: number;
            kind?: string;
            mimeType?: string;
            extension?: string;
            byteSize?: number;
            durationSec?: number;
        }>;
    };
    childNodeIds?: string[];
    [key: string]: unknown;
}

export interface ShowcaseGraphNode {
    id: string;
    type: ShowcaseNodeType;
    position: { x: number; y: number };
    width?: number | null;
    height?: number | null;
    parentId?: string;
    zIndex?: number;
    style?: Record<string, unknown>;
    data: ShowcaseGraphNodeData;
    resourceMeta?: ShowcaseGraphNodeData["resourceMeta"];
    [key: string]: unknown;
}

export interface ShowcaseGraphEdge {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
    type?: string;
    [key: string]: unknown;
}

export interface ShowcaseGraph {
    nodes: ShowcaseGraphNode[];
    edges: ShowcaseGraphEdge[];
    savedAt?: number;
}

export interface ShowcaseDetail {
    templateUuid: string;
    projectUuid: string;
    name: string;
    description?: string;
    coverUrl?: string;
    finalOutput?: string;
    snapshotId?: number;
    avatar?: string;
    nickname?: string;
    isLike?: boolean;
    likeCount?: number;
    createAt?: string;
    updateAt?: string;
    publishAt?: string;
    [key: string]: unknown;
}

export interface ShowcaseCase {
    slug: string;
    templateUuid: ShowcaseTemplateUuid;
    detail: ShowcaseDetail;
    recommendations: ShowcaseDetail[];
    graph: ShowcaseGraph;
    initialZoom: number;
    durationSeconds: number;
    videoWidth: number;
    videoHeight: number;
    qualityLabel: string;
}

export type ShowcaseSummary = Omit<ShowcaseCase, "graph">;
const SHOWCASE_SUMMARIES = caseSummariesJson as Record<string, ShowcaseSummary>;

export function getShowcaseSummary(value: string | undefined) {
    return value && Object.prototype.hasOwnProperty.call(SHOWCASE_SUMMARIES, value) ? SHOWCASE_SUMMARIES[value] : undefined;
}

export function listShowcaseSummaries(): ShowcaseSummary[] {
    return Object.values(SHOWCASE_SUMMARIES);
}

export interface ManifestAsset {
    /** Opaque, locally generated keys for the archived source values. */
    lookupKeys: string[];
    localPath: string;
    kind?: string;
    mimeType?: string;
    bytes?: number;
    status?: string;
}

interface AssetManifest {
    assets: ManifestAsset[];
    failedCount: number;
}

export type ManifestAssetIndex = Map<string, ManifestAsset>;

let manifestPromise: Promise<ManifestAssetIndex> | undefined;

/**
 * Build a stable lookup key without exposing the archived source URL in the
 * public manifest. Two independent 32-bit lanes give us a compact 64-bit key
 * while keeping this helper synchronous for render-time asset resolution.
 */
export function localAssetLookupKey(value: string) {
    let first = 0x811c9dc5;
    let second = 0x9e3779b9;
    for (let index = 0; index < value.length; index += 1) {
        const code = value.charCodeAt(index);
        first = Math.imul(first ^ code, 0x01000193);
        second = Math.imul(second ^ (code + index), 0x85ebca6b);
        second ^= second >>> 13;
    }
    return `${(first >>> 0).toString(16).padStart(8, "0")}${(second >>> 0).toString(16).padStart(8, "0")}`;
}

export function publicAssetPath(localPath: string) {
    const prefix = "web/public/";
    return localPath.startsWith(prefix) ? `/${localPath.slice(prefix.length)}` : undefined;
}

export function loadManifestAssetIndex() {
    manifestPromise ??= fetch("/liblib-clone/manifest.json", { cache: "no-cache" })
        .then(async (response) => {
            if (!response.ok) throw new Error(`Local Liblib asset manifest failed with ${response.status}`);
            return (await response.json()) as AssetManifest;
        })
        .then((manifest) => {
            if (manifest.failedCount !== 0) throw new Error("Archived Liblib manifest contains failed assets");
            const index: ManifestAssetIndex = new Map();
            for (const asset of manifest.assets) {
                for (const lookupKey of asset.lookupKeys) index.set(lookupKey, asset);
            }
            return index;
        }).catch((error: unknown) => {
            manifestPromise = undefined;
            throw error;
        });
    return manifestPromise;
}

export function resolveLocalAsset(index: ManifestAssetIndex | undefined, remoteUrl: string | undefined) {
    if (!remoteUrl) return undefined;
    if (remoteUrl.startsWith("/")) return remoteUrl;
    // Public showcase/canvas pages are intentionally local-only. Never fall
    // back to an upstream URL when a mapping is missing; a missing archive is
    // safer than silently issuing a third-party request from the browser.
    if (!index) return undefined;
    const asset = index.get(localAssetLookupKey(remoteUrl));
    return asset ? publicAssetPath(asset.localPath) : undefined;
}

export function graphNodeCounts(graph: ShowcaseGraph) {
    const byType: Record<string, number> = {};
    for (const node of graph.nodes) byType[node.type] = (byType[node.type] || 0) + 1;
    return { nodes: graph.nodes.length, edges: graph.edges.length, byType };
}

export function readableNodeText(node: ShowcaseGraphNode, t: ShowcaseTranslator = currentTranslator) {
    const content = node.data.content;
    if (Array.isArray(content)) {
        const value = content
            .flatMap((entry) => (typeof entry === "string" ? [entry] : []))
            .join("\n")
            .trim();
        if (value) return value;
    }
    if (Array.isArray(node.data.rows)) {
        return node.data.rows
            .slice(0, 12)
            .map((row, index) => {
                const shotNumber = row.shotNumber ?? row.shot_number;
                const shot = t("miscPages.starterShot", { number: typeof shotNumber === "number" ? shotNumber : index + 1 });
                const plot = typeof row.plotDescription === "string" ? row.plotDescription : typeof row.visual_description === "string" ? row.visual_description : "";
                const action = typeof row.characterAction === "string" ? row.characterAction : "";
                return [shot, plot, action].filter(Boolean).join(" · ");
            })
            .join("\n")
            .trim();
    }
    if (typeof node.data.params?.prompt === "string" && node.data.params.prompt.trim()) return node.data.params.prompt.trim();
    if (typeof node.data.styleName === "string") return node.data.styleName;
    return "";
}

export function nodeDimensions(node: ShowcaseGraphNode) {
    const meta = node.data.resourceMeta?.items?.[0];
    const fallback = node.type === "text" || node.type === "script" ? { width: 850, height: 520 } : node.type === "audio" ? { width: 350, height: 148 } : node.type === "group" ? { width: 700, height: 900 } : { width: 350, height: 350 };
    return {
        width: Number(node.width || node.data.nodeWidth || node.data.contentWidth || meta?.width || fallback.width),
        height: Number(node.height || node.data.nodeHeight || node.data.contentHeight || meta?.height || fallback.height),
    };
}
