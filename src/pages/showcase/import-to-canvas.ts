import { createStoryboardRow } from "@/lib/canvas/canvas-project-domain";
import type { CanvasProject } from "@/stores/canvas/use-canvas-store";
import { CanvasNodeType, type CanvasConnection, type CanvasNodeData, type CanvasNodeMetadata, type StoryboardRow, type ViewportTransform } from "@/types/canvas";

import { graphBounds, layoutGraphNodes } from "./workflow-geometry";
import { readableNodeText, resolveLocalAsset, type ManifestAssetIndex, type ShowcaseCase, type ShowcaseGraphNode } from "./data";

import { clamp } from "@/lib/utils";
import { resolveAppLocale, type AppLocale } from "@/i18n/app-locale";
import { importedNodeTitle } from "@/lib/canvas/imported-node-title";
import { showcaseImportedTitle } from "./imported-project-title";
export type ShowcaseCanvasImport = {
    title: string;
    importSource: NonNullable<CanvasProject["importSource"]>;
    nodes: CanvasNodeData[];
    connections: CanvasConnection[];
    viewport: ViewportTransform;
    unavailableMediaCount: number;
};

export type ImportViewportSize = { width: number; height: number };

export type ShowcaseCanvasProjectRecord = Pick<CanvasProject, "id" | "nodes"> & Partial<Pick<CanvasProject, "importSource" | "updatedAt">>;

export type EnsureShowcaseCanvasProjectResult =
    | { id: string; created: false }
    | { id: string; created: true; imported: ShowcaseCanvasImport; syncError?: unknown };

type EnsureShowcaseCanvasProjectOptions = {
    scopeKey: string;
    getProjects: () => readonly ShowcaseCanvasProjectRecord[];
    createProject: (imported: ShowcaseCanvasImport) => Promise<{ id: string; syncError?: unknown }>;
    viewportSize?: ImportViewportSize;
    batchId?: string;
    createCopy?: boolean;
    locale?: AppLocale;
};

const DEFAULT_VIEWPORT_SIZE: ImportViewportSize = { width: 1600, height: 900 };
const showcaseImportsInFlight = new Map<string, Promise<EnsureShowcaseCanvasProjectResult>>();

export function showcaseCanvasSourceProjectUuid(caseData: ShowcaseCase) {
    return caseData.detail.projectUuid || caseData.templateUuid;
}

export function findShowcaseCanvasProject(projects: readonly ShowcaseCanvasProjectRecord[], caseData: ShowcaseCase) {
    const sourceProjectUuid = showcaseCanvasSourceProjectUuid(caseData);
    return projects
        .filter((project) => (project.importSource?.provider === "libtv" && project.importSource.projectUuid === sourceProjectUuid)
            || project.nodes.some((node) => node.metadata?.importSource?.provider === "libtv" && node.metadata.importSource.projectUuid === sourceProjectUuid))
        .sort((left, right) => (right.updatedAt || "").localeCompare(left.updatedAt || ""))[0];
}

/**
 * Reopens an already imported public case, or creates it exactly once for the
 * current user scope. The in-flight guard also covers React development
 * remounts and fast repeated clicks before remote sync completes.
 */
export function ensureShowcaseCanvasProject(caseData: ShowcaseCase, assets: ManifestAssetIndex | undefined, options: EnsureShowcaseCanvasProjectOptions): Promise<EnsureShowcaseCanvasProjectResult> {
    const existing = !options.createCopy && findShowcaseCanvasProject(options.getProjects(), caseData);
    if (existing) return Promise.resolve({ id: existing.id, created: false });

    const sourceProjectUuid = showcaseCanvasSourceProjectUuid(caseData);
    const importKey = `${options.scopeKey}\0${sourceProjectUuid}\0${options.createCopy ? "copy" : "reuse"}`;
    const active = showcaseImportsInFlight.get(importKey);
    if (active) return active;

    const operation = Promise.resolve().then(async () => {
        const latest = !options.createCopy && findShowcaseCanvasProject(options.getProjects(), caseData);
        if (latest) return { id: latest.id, created: false } as const;

        const imported = buildShowcaseCanvasImport(caseData, assets, options.viewportSize, options.batchId, options.locale);
        const created = await options.createProject(imported);
        return { ...created, created: true, imported } as const;
    });
    showcaseImportsInFlight.set(importKey, operation);
    const clear = () => {
        if (showcaseImportsInFlight.get(importKey) === operation) showcaseImportsInFlight.delete(importKey);
    };
    void operation.then(clear, clear);
    return operation;
}

export function buildShowcaseCanvasImport(caseData: ShowcaseCase, assets?: ManifestAssetIndex, viewportSize: ImportViewportSize = DEFAULT_VIEWPORT_SIZE, batchId = `public-${caseData.templateUuid.slice(0, 8)}-${Date.now().toString(36)}`, locale: AppLocale = resolveAppLocale()): ShowcaseCanvasImport {
    const layouts = layoutGraphNodes(caseData.graph);
    const bounds = graphBounds(layouts.values());
    const centerX = bounds.minX + bounds.width / 2;
    const centerY = bounds.minY + bounds.height / 2;
    const idBySource = new Map(caseData.graph.nodes.map((node) => [node.id, `libtv-${batchId}-${node.id}`]));
    const groupIds = new Set(caseData.graph.nodes.filter((node) => node.type === "group").map((node) => node.id));

    const nodes = caseData.graph.nodes.map<CanvasNodeData>((node) => {
        const layout = layouts.get(node.id);
        if (!layout) throw new Error(`案例节点缺少布局：${node.id}`);
        const type = canvasNodeType(node);
        const sourceContent = firstMediaUrl(node);
        const content = resolveLocalAsset(assets, sourceContent);
        const poster = resolveLocalAsset(assets, node.data.poster || node.data.coverUrl);
        const metadata = buildNodeMetadata(caseData, node, type, batchId, content, poster);
        metadata.publicCaseContent = metadata.content;
        // Keep the full archived node alongside the native projection. Generation
        // settings, reference order and intermediate-output flags must survive import.
        metadata.pluginData = { ...metadata.pluginData, libtvSourceNode: structuredClone(node) };
        const originalTitle = node.data.name?.trim() || "";
        const title = importedNodeTitle(type, originalTitle, locale);
        if (metadata.importSource?.provider === "libtv") metadata.importSource = { ...metadata.importSource, originalTitle, generatedTitle: title };
        const parentId = node.parentId && groupIds.has(node.parentId) && type !== CanvasNodeType.Frame ? idBySource.get(node.parentId) : undefined;
        return {
            id: idBySource.get(node.id)!,
            type,
            title,
            position: { x: layout.x - centerX, y: layout.y - centerY },
            width: layout.width,
            height: layout.height,
            parentId,
            metadata,
        };
    });

    const nodeIds = new Set(nodes.map((node) => node.id));
    const connections = caseData.graph.edges.flatMap<CanvasConnection>((edge) => {
        const fromNodeId = idBySource.get(edge.source);
        const toNodeId = idBySource.get(edge.target);
        if (!fromNodeId || !toNodeId || !nodeIds.has(fromNodeId) || !nodeIds.has(toNodeId)) return [];
        return [{
            id: `libtv-${batchId}-edge-${edge.id}`,
            fromNodeId,
            toNodeId,
            fromHandleId: edge.sourceHandle,
            toHandleId: edge.targetHandle,
        }];
    });

    const width = Math.max(480, viewportSize.width);
    const height = Math.max(360, viewportSize.height);
    const fitScale = Math.min((width - 180) / bounds.width, (height - 180) / bounds.height);
    const viewport = {
        x: width / 2,
        y: height / 2,
        k: clamp(fitScale, 0.04, 0.82),
    };

    return {
        title: showcaseImportedTitle(caseData.templateUuid, caseData.detail.name, locale),
        importSource: {
            provider: "libtv",
            projectUuid: showcaseCanvasSourceProjectUuid(caseData),
            templateUuid: caseData.templateUuid,
            originalTitle: caseData.detail.name,
            generatedTitle: showcaseImportedTitle(caseData.templateUuid, caseData.detail.name, locale),
        },
        nodes,
        connections,
        viewport,
        unavailableMediaCount: nodes.filter((node) => (node.type === CanvasNodeType.Image || node.type === CanvasNodeType.Video || node.type === CanvasNodeType.Audio) && !node.metadata?.content).length,
    };
}

function buildNodeMetadata(caseData: ShowcaseCase, node: ShowcaseGraphNode, type: CanvasNodeType, batchId: string, content?: string, poster?: string): CanvasNodeMetadata {
    const resource = { ...node.resourceMeta?.items?.[0], ...node.data.resourceMeta?.items?.[0] };
    const prompt = stringValue(node.data.params?.prompt);
    const model = stringValue(node.data.params?.model);
    const importSource = {
        provider: "libtv" as const,
        projectUuid: showcaseCanvasSourceProjectUuid(caseData),
        nodeKey: node.id,
        batchId,
        sourceType: node.type,
        styleName: stringValue(node.data.styleName),
    };

    if (type === CanvasNodeType.Frame) {
        const width = Number(node.width || node.data.nodeWidth || 700);
        const height = Number(node.height || node.data.nodeHeight || 900);
        return {
            importSource,
            frame: { collapsed: false, expandedWidth: width, expandedHeight: height },
        };
    }

    if (type === CanvasNodeType.Script) {
        return {
            importSource,
            content: readableNodeText(node),
            pluginData: { libtvSourceRows: node.data.rows },
            status: "success",
            storyboard: {
                rows: buildStoryboardRows(node),
                visibleColumns: ["shotNumber", "durationSeconds", "plotDescription", "dialogue", "imageGenerationPrompt", "videoMotionPrompt", "assets"],
                referenceNodeIds: [],
            },
        };
    }

    if (type === CanvasNodeType.Text) {
        return {
            importSource,
            content: readableNodeText(node),
            prompt,
            model,
            status: "success",
            fontSize: 14,
        };
    }

    return {
        importSource,
        content,
        pluginData: (node.data.url?.length || 0) > 1 ? { libtvSourceMedia: node.data.url } : undefined,
        previewContent: type === CanvasNodeType.Video ? poster : content,
        videoPlayback: type === CanvasNodeType.Video && node.data.browserPlayback?.sourceContent === content ? node.data.browserPlayback : undefined,
        prompt,
        model,
        status: content ? "success" : "idle",
        naturalWidth: finiteNumber(resource?.width),
        naturalHeight: finiteNumber(resource?.height),
        durationMs: finiteNumber(resource?.durationSec) ? Math.round(Number(resource?.durationSec) * 1000) : undefined,
        mimeType: stringValue(resource?.mimeType).startsWith(`${type}/`) ? stringValue(resource?.mimeType) : inferredMimeType(type, content),
        hasAudio: type === CanvasNodeType.Video && typeof node.data.videoHasAudioTrack === "boolean" ? node.data.videoHasAudioTrack : undefined,
    };
}

function buildStoryboardRows(node: ShowcaseGraphNode): StoryboardRow[] {
    const rows = Array.isArray(node.data.rows) ? node.data.rows : [];
    if (!rows.length) return [createStoryboardRow(1, { plotDescription: readableNodeText(node) })];
    return rows.map((row, index) => {
        const characters = Array.isArray(row.characters)
            ? row.characters.flatMap((value) => {
                  if (!value || typeof value !== "object") return [];
                  const character = value as Record<string, unknown>;
                  const characterName = stringValue(character.characterName);
                  if (!characterName) return [];
                  return [{ characterName, characterDescription: stringValue(character.characterDescription) }];
              })
            : [];
        const cinematics = row.cinematics && typeof row.cinematics === "object" ? row.cinematics as Record<string, unknown> : {};
        return createStoryboardRow(numberValue(row.shotNumber ?? row.shot_number, index + 1), {
            durationSeconds: numberValue(row.durationSeconds ?? row.duration, 6),
            plotDescription: stringValue(row.plotDescription) || stringValue(row.visual_description),
            dialogue: [stringValue(row.dialogue), stringValue(row.voiceover)].filter(Boolean).join("\n") || stringValue(row.audio_voice),
            narrativeIntent: stringValue(row.content),
            characters,
            performanceBlocking: stringValue(row.characterAction),
            shotSize: stringValue(row.shotSize) || stringValue(row.shot_size) || stringValue(cinematics.shotSize),
            emotion: stringValue(row.emotion),
            camera: [row.camera_angle, cinematics.cameraMovement, row.camera_movement, row.focal_depth].map(stringValue).filter(Boolean).join(" · "),
            timeBeats: row.start_time !== undefined && row.end_time !== undefined ? `${row.start_time}–${row.end_time}s` : "",
            lightingAndAtmosphere: stringValue(row.lightingAndAtmosphere) || stringValue(row.lighting) || stringValue(cinematics.lighting),
            audioEffects: stringValue(row.audioEffects) || stringValue(row.audio_music),
            imageGenerationPrompt: stringValue(row.imageGenerationPrompt) || stringValue(row.image_generation_prompt),
            videoMotionPrompt: stringValue(row.videoMotionPrompt) || stringValue(row.video_motion_prompt),
        });
    });
}

function canvasNodeType(node: ShowcaseGraphNode): CanvasNodeType {
    if (node.type === "group") return CanvasNodeType.Frame;
    if (node.type === "video") return CanvasNodeType.Video;
    if (node.type === "audio") return CanvasNodeType.Audio;
    if (node.type === "script" || node.type === "script-v2" || node.type === "video-story") return CanvasNodeType.Script;
    if (node.type === "text") return CanvasNodeType.Text;
    return CanvasNodeType.Image;
}

function firstMediaUrl(node: ShowcaseGraphNode) {
    const direct = node.data.url?.find((value) => typeof value === "string" && value.trim());
    if (direct) return direct;
    if (node.type === "material-style") return node.data.coverUrl;
    return undefined;
}

function inferredMimeType(type: CanvasNodeType, content?: string) {
    if (type === CanvasNodeType.Video) return /\.mov(?:$|\?)/i.test(content || "") ? "video/quicktime" : "video/mp4";
    if (type === CanvasNodeType.Audio) return /\.wav(?:$|\?)/i.test(content || "") ? "audio/wav" : "audio/mpeg";
    if (/\.png(?:$|\?)/i.test(content || "")) return "image/png";
    if (/\.webp(?:$|\?)/i.test(content || "")) return "image/webp";
    if (/\.avif(?:$|\?)/i.test(content || "")) return "image/avif";
    return type === CanvasNodeType.Image ? "image/jpeg" : undefined;
}

function stringValue(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown, fallback: number) {
    const next = Number(value);
    return Number.isFinite(next) ? next : fallback;
}

function finiteNumber(value: unknown) {
    const next = Number(value);
    return Number.isFinite(next) && next > 0 ? next : undefined;
}
