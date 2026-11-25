import { nanoid } from "nanoid";
import springRaw from "./examples/spring-record.json";
import depthRaw from "./examples/depth-capture.json";
const springLayout = springRaw as PublicStarterLayout;
const depthLayout = depthRaw as PublicStarterLayout;

import { mediaConversionSourceFingerprint } from "@/lib/media-conversion/contracts";
import { resolveAppLocale } from "@/i18n/app-locale";
import type { MessageKey, MessageValues } from "@/i18n/messages";
import { translateMessage } from "@/i18n/messages";
import { createDirectorSceneFromTemplate } from "@/lib/canvas/director/director-templates";
import { buildLibTVImagePreviewUrl, buildLibTVVideoPreviewUrl, buildLibTVVideoSourceUrl, sanitizeLibTVMediaUrl } from "@/lib/canvas/libtv-import";
import type { CanvasProject } from "@/stores/canvas/use-canvas-store";
import { CanvasNodeType, type CanvasConnection, type CanvasNodeData, type CanvasNodeMetadata, type ViewportTransform } from "@/types/canvas";
import type { DirectorScene } from "@/types/director";

import type { LibTVStarterKey } from "./libtv-starter-route";

import { clamp } from "@/lib/utils";
type StarterNodeKind = "image" | "video" | "audio" | "text" | "group" | "shot-breakdown" | "director-stage";

export type LibTVTranslator = (key: MessageKey, values?: MessageValues) => string;

const currentTranslator: LibTVTranslator = (key, values) => translateMessage(resolveAppLocale(), key, values);

type StarterNode = {
    id: string;
    kind: StarterNodeKind;
    title: string;
    titleKey?: MessageKey;
    x: number;
    y: number;
    width: number;
    height: number;
    parentId?: string;
    content?: string;
    previewContent?: string;
    text?: string;
    textKey?: MessageKey;
    model?: string;
    durationMs?: number;
    naturalWidth?: number;
    naturalHeight?: number;
    batchImages?: string[];
};

function starterTitle(node: Pick<StarterNode, "title" | "titleKey">, t: LibTVTranslator) {
    return node.titleKey ? t(node.titleKey) : node.title;
}

function starterText(node: Pick<StarterNode, "text" | "textKey">, t: LibTVTranslator) {
    return node.textKey ? t(node.textKey) : node.text;
}

type StarterEdge = {
    id: string;
    source: string;
    target: string;
};

export type LibTVStarterDefinition = {
    key: LibTVStarterKey;
    title: string;
    titleKey?: MessageKey;
    sourceSpaceId: string;
    sourceProjectUuid: string;
    entryItemKey: string;
    nodes: StarterNode[];
    edges: StarterEdge[];
};

export type LibTVStarterCanvasImport = {
    title: string;
    importSource: NonNullable<CanvasProject["importSource"]>;
    nodes: CanvasNodeData[];
    connections: CanvasConnection[];
    viewport: ViewportTransform;
    directorScenes: DirectorScene[];
};

export type LibTVStarterProjectRecord = Pick<CanvasProject, "id" | "nodes"> & Partial<Pick<CanvasProject, "importSource" | "updatedAt">>;

export const LIBTV_STARTERS: Record<LibTVStarterKey, LibTVStarterDefinition> = {
    director: {
        key: "director",
        title: "",
        titleKey: "miscPages.starterTitleDirector",
        sourceSpaceId: "spring-record",
        sourceProjectUuid: springLayout.source.projectId,
        entryItemKey: "virtual-studio",
        nodes: springLayout.objects.map(object => {
            const kind = object.kind === "external" ? "director-stage" : object.kind as StarterNodeKind;
            const fields = object.fields;
            const guide = fields.backgroundColor === "cyan";
            const titleKey: MessageKey = kind === "group" ? "miscPages.springGroup" : kind === "text" ? (guide ? "miscPages.springGuide" : "miscPages.springArt")
                : kind === "director-stage" ? "miscPages.starterNodeStageCopy" : fields.source === "post_edit_generated" ? "miscPages.starterNodeStageExportCopy" : "miscPages.starterNodeVideo2Copy";
            return { id: object.sourceObjectId, kind, title: "", titleKey, parentId: object.sourceParentObjectId ?? undefined, ...object.relativeGeometry,
                textKey: kind === "text" ? (guide ? "miscPages.springSteps" : "miscPages.springArtBody") : undefined };
        }),
        edges: springLayout.edges.map(edge => ({ id: edge.sourceEdgeId, source: edge.sourceObjectId, target: edge.targetObjectId })),
    },
    "depth-capture": {
        key: "depth-capture", title: "", titleKey: "canvasExtra.tool.depthCapture",
        sourceSpaceId: "depth-capture", sourceProjectUuid: depthLayout.source.projectId, entryItemKey: "video-depth-capture",
        nodes: depthLayout.objects.map(object => ({
            id: object.sourceObjectId, kind: "video", title: "", titleKey: object.fields.generationDraft ? "miscPages.depthSourceTitle" : "miscPages.depthResultTitle",
            ...object.relativeGeometry,
        })),
        edges: depthLayout.edges.map(edge => ({ id: edge.sourceEdgeId, source: edge.sourceObjectId, target: edge.targetObjectId })),
    },

};

export function createStarterDirectorScene(t: LibTVTranslator = currentTranslator): DirectorScene {
    return createDirectorSceneFromTemplate("spring-record", t("miscPages.starterDirectorScene"), t);
}

export function getLibTVStarter(key: string): LibTVStarterDefinition | undefined {
    return LIBTV_STARTERS[key as LibTVStarterKey];
}

export function buildLibTVStarterCanvasImport(
    starter: LibTVStarterDefinition,
    viewportSize: { width: number; height: number } = { width: 1440, height: 900 },
    batchId = nanoid(),
    t: LibTVTranslator = currentTranslator,
): LibTVStarterCanvasImport {
    const bounds = starterBounds(starter.nodes);
    const centerX = bounds.minX + bounds.width / 2;
    const centerY = bounds.minY + bounds.height / 2;
    const idBySource = new Map(starter.nodes.map((node) => [node.id, `libtv-starter-${batchId}-${node.id}`]));
    const directorScene = starter.nodes.some((node) => node.kind === "director-stage") ? createStarterDirectorScene(t) : null;
    const directorScenes = directorScene ? [directorScene] : [];
    const nodes: CanvasNodeData[] = [];

    for (const source of starter.nodes) {
        const id = idBySource.get(source.id)!;
        const metadata = starterNodeMetadata(starter, source, batchId, directorScene, t);
        if (source.kind === "director-stage") {
            const exportEdge = starter.edges.find(edge => edge.source === source.id);
            if (exportEdge) metadata.directorClayVideoNodeId = idBySource.get(exportEdge.target);
        }
        const node: CanvasNodeData = {
            id,
            type: starter.key === "director" && source.kind === "text" ? CanvasNodeType.Markdown : starterNodeType(source.kind),
            title: starterTitle(source, t),
            position: { x: source.x - centerX, y: source.y - centerY },
            width: source.width,
            height: source.height,
            parentId: source.parentId ? idBySource.get(source.parentId) : undefined,
            metadata,
        };
        nodes.push(node);

        if (source.batchImages?.length) {
            const childIds = source.batchImages.map((_, index) => `${id}-image-${index + 1}`);
            node.metadata = {
                ...node.metadata,
                isBatchRoot: true,
                batchChildIds: childIds,
                primaryImageId: childIds[0],
                imageBatchExpanded: false,
            };
            source.batchImages.forEach((content, index) => {
                nodes.push({
                    id: childIds[index],
                    type: CanvasNodeType.Image,
                    title: `${starterTitle(source, t)} ${index + 1}`,
                    position: { x: source.x - centerX + index * 18, y: source.y - centerY + index * 18 },
                    width: source.width,
                    height: source.height,
                    metadata: {
                        ...starterNodeMetadata(starter, { ...source, id: `${source.id}-image-${index + 1}`, content, batchImages: undefined }, batchId, directorScene, t),
                        batchRootId: id,
                    },
                });
            });
        }
    }

    if (starter.key === "depth-capture") {
        const edge = depthLayout.edges[0];
        const input = nodes.find(node => node.id === idBySource.get(edge.sourceObjectId))!;
        const capture = nodes.find(node => node.id === idBySource.get(edge.targetObjectId))!;
        capture.type = CanvasNodeType.MediaConversion;
        capture.title = t("canvasExtra.tool.depthCapture");
        capture.metadata = { ...capture.metadata, mediaConversion: {
            schemaVersion: 1, operation: "depth", videoDepthOnly: true, status: "completed", outputKind: "video",
            sourceNodeId: input.id, sourceFingerprint: mediaConversionSourceFingerprint(input),
            resultWidth: capture.metadata?.naturalWidth, resultHeight: capture.metadata?.naturalHeight,
        } };
    }

    const connections = starter.edges.map<CanvasConnection>((edge) => ({
        id: `libtv-starter-${batchId}-edge-${edge.id}`,
        fromNodeId: idBySource.get(edge.source)!,
        toNodeId: idBySource.get(edge.target)!,
        ...(starter.nodes.some(node => node.id === edge.source && node.kind === "director-stage") ? { relation: "director-output" as const } : {}),
    }));
    const width = Math.max(480, viewportSize.width);
    const height = Math.max(360, viewportSize.height);
    const fitScale = Math.min((width - 180) / bounds.width, (height - 180) / bounds.height);

    return {
        title: t("miscPages.starterTitleSuffix", { title: starter.titleKey ? t(starter.titleKey) : starter.title }),
        importSource: {
            provider: "libtv",
            projectUuid: starter.sourceProjectUuid,
            templateUuid: starter.sourceProjectUuid,
            starterKey: starter.key,
        },
        nodes,
        connections,
        viewport: { x: width / 2, y: height / 2, k: clamp(fitScale, 0.04, 0.82) },
        directorScenes,
    };
}

function starterNodeMetadata(starter: LibTVStarterDefinition, node: StarterNode, batchId: string, directorScene: DirectorScene | null, t: LibTVTranslator): CanvasNodeMetadata {
    const previewContent = node.previewContent
        ? node.kind === "video" ? buildLibTVVideoPreviewUrl(node.previewContent) : buildLibTVImagePreviewUrl(node.previewContent)
        : node.kind === "video" && node.content ? buildLibTVVideoPreviewUrl(node.content) : undefined;
    const content = node.kind === "video" && node.content
        ? buildLibTVVideoSourceUrl(node.content)
        : node.kind === "image" && node.content
            ? sanitizeLibTVMediaUrl(node.content)
            : node.content;
    const importSource = {
        provider: "libtv" as const,
        projectUuid: starter.sourceProjectUuid,
        nodeKey: node.id,
        batchId,
        sourceType: node.kind,
    };

    if (node.kind === "group") {
        return { importSource, frame: { collapsed: false, expandedWidth: node.width, expandedHeight: node.height } };
    }
    if (node.kind === "text") {
        return { importSource, content: starterText(node, t), status: "success", fontSize: 14 };
    }
    if ((starter.key === "director" || starter.key === "depth-capture") && node.kind === "video") {
        const motion = starter.key === "depth-capture";
        const original = (motion ? depthLayout : springLayout).objects.find(object => object.sourceObjectId === node.id)!;
        const isGenerated = Boolean(original.fields.generationDraft);
        const folder = motion ? "depth-capture" : "spring-record";
        const basename = motion ? (isGenerated ? "source" : "depth") : (isGenerated ? "film" : "previs");
        const media = `/examples/${folder}/${basename}`;
        return {
            importSource, status: "success", content: `${media}.mp4`, previewContent: `${media}.jpg`, generationMode: "video",
            naturalWidth: motion ? 720 : 854, naturalHeight: motion ? 1280 : 480,
            durationMs: motion ? 15017 : isGenerated ? 15042 : 15000, mimeType: "video/mp4",
            ...(original.fields.generationDraft ? {
                producedModel: original.fields.generationDraft.contentSettings.modelName,
                size: original.fields.generationDraft.contentSettings.aspectRatio,
                vquality: original.fields.generationDraft.contentSettings.resolution,
                seconds: String(original.fields.generationDraft.contentSettings.durationSeconds),
            } : {}),
            composerContent: original.fields.generationDraft?.parts.map(part => "text" in part ? part.text : part.type === "image" ? "@图片1" : "@视频2").join(""),
            ...(motion && !isGenerated ? { depthReferenceVideo: true } : {}),
            ...(!motion && isGenerated ? {
                currentMediaVersionId: "spring-2",
                mediaVersions: [9, 4, 2, 1].map(number => {
                    const version = number === 2 ? media : `/examples/spring-record/result-${number}`;
                    return { id: `spring-${number}`, number, createdAt: "", source: "generate" as const,
                        media: { content: `${version}.mp4`, previewContent: `${version}.jpg`, mimeType: "video/mp4" } };
                }),
            } : {}),
        };
    }
    if (node.kind === "director-stage" && directorScene) {
        return {
            importSource,
            status: "idle",
            generationMode: "video",
            videoEditOperation: "text_to_video",
            workflowKind: "shot",
            workflowTitle: t("miscPages.starterWorkflowTitle"),
            directorSceneId: directorScene.id,
            directorShotId: directorScene.activeShotId,
        };
    }
    return {
        importSource,
        content,
        previewContent: node.kind === "video" ? previewContent : content,
        status: content ? "success" : "idle",
        generationMode: node.kind === "video" ? "video" : node.kind === "audio" ? "audio" : node.kind === "image" ? "image" : undefined,
        naturalWidth: node.naturalWidth,
        naturalHeight: node.naturalHeight,
        durationMs: node.durationMs,
        mimeType: node.kind === "video" ? "video/mp4" : node.kind === "audio" ? "audio/mpeg" : node.kind === "image" ? "image/png" : undefined,
    };
}

function starterNodeType(kind: StarterNodeKind): CanvasNodeType {
    if (kind === "group") return CanvasNodeType.Frame;
    if (kind === "shot-breakdown") return CanvasNodeType.Config;
    if (kind === "director-stage" || kind === "video") return CanvasNodeType.Video;
    if (kind === "image") return CanvasNodeType.Image;
    if (kind === "audio") return CanvasNodeType.Audio;
    return CanvasNodeType.Text;
}

function starterBounds(nodes: StarterNode[]) {
    const minX = Math.min(...nodes.map((node) => node.x));
    const minY = Math.min(...nodes.map((node) => node.y));
    const maxX = Math.max(...nodes.map((node) => node.x + node.width));
    const maxY = Math.max(...nodes.map((node) => node.y + node.height));
    return { minX, minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
}

const pendingImports = new Map<string, Promise<{ id: string; syncError?: unknown }>>();

export async function ensureLibTVStarterCanvasProject(
    starter: LibTVStarterDefinition,
    options: {
        scopeKey: string;
        translator?: LibTVTranslator;
        getProjects: () => LibTVStarterProjectRecord[];
        createProject: (imported: LibTVStarterCanvasImport) => Promise<{ id: string; syncError?: unknown }>;
        viewportSize?: { width: number; height: number };
        batchId?: string;
    },
) {
    const existing = options.getProjects().find((project) => project.importSource?.provider === "libtv" && (project.importSource.projectUuid === starter.sourceProjectUuid || (starter.key !== "director" && project.importSource.starterKey === starter.key)));
    if (existing) return { id: existing.id, created: false as const };

    const lockKey = `${options.scopeKey}:${starter.key}`;
    const active = pendingImports.get(lockKey);
    if (active) {
        const result = await active;
        return { id: result.id, created: false as const, syncError: result.syncError };
    }

    const imported = buildLibTVStarterCanvasImport(starter, options.viewportSize, options.batchId, options.translator);
    const create = options.createProject(imported);
    pendingImports.set(lockKey, create);
    try {
        const result = await create;
        return { ...result, created: true as const, imported };
    } finally {
        if (pendingImports.get(lockKey) === create) pendingImports.delete(lockKey);
    }
}

 type PublicStarterLayout = { source: { projectId: string }; edges: {sourceEdgeId:string;sourceObjectId:string;targetObjectId:string}[]; objects: { sourceObjectId:string; sourceParentObjectId?:string; kind:string; relativeGeometry:{x:number;y:number;width:number;height:number}; fields:{backgroundColor?:string;source?:string;generationDraft?:{contentSettings:{modelName:string;aspectRatio:string;resolution:string;durationSeconds:number};parts:({text:string}|{type:string})[]}} }[] };
