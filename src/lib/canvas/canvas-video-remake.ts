import { nanoid } from "nanoid";
import { NODE_DEFAULT_SIZE } from "@/constant/canvas";
import { currentLocaleText as t } from "@/i18n/current-locale-text";
import { modelCapabilityConfigFor, videoDurationAllowed } from "@/lib/model-capabilities";
import { modelCompatibilityError } from "@/lib/model-selection";
import { resolveModelChannel, selectableModelsByCapability, type AiConfig } from "@/stores/use-config-store";
import { CanvasNodeType, type CanvasConnection, type CanvasNodeData, type Position } from "@/types/canvas";
import { findAvailableGenerationGroupPosition } from "./canvas-generation-layout";
import { declaredCanvasNodeAssetCategory } from "./canvas-node-asset";
import { isCanvasNodeGenerating } from "./canvas-node-task-state";
import { createCanvasNode } from "./canvas-project-domain";
import { nodeReferenceImage } from "./canvas-project-generation";
import { canvasNodeMentionToken, getContextResourceNodes } from "./canvas-resource-references";

export function canRemakeCanvasVideo(node?: CanvasNodeData): node is CanvasNodeData {
    return node?.type === CanvasNodeType.Video && Boolean(node.metadata?.content || node.metadata?.storageKey) && !node.metadata?.fileUpload && !isCanvasNodeGenerating(node);
}

export function buildVideoRemakeDraft(sourceId: string, nodes: CanvasNodeData[], connections: CanvasConnection[], config: AiConfig) {
    const source = nodes.find((node) => node.id === sourceId);
    if (!canRemakeCanvasVideo(source)) throw new Error(t("canvasNov21.remake.unavailable"));
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const images = new Map<string, CanvasNodeData>();
    for (const edge of connections) {
        if (edge.toNodeId !== source.id) continue;
        const parent = nodeById.get(edge.fromNodeId);
        if (!parent) continue;
        const inputs = parent.type === CanvasNodeType.Config ? getContextResourceNodes(parent.id, nodes, connections) : [parent];
        for (const input of inputs) {
            if (input.type === CanvasNodeType.Image && !input.metadata?.fileUpload && nodeReferenceImage(input)) images.set(input.id, input);
        }
    }
    const additions: CanvasNodeData[] = [];
    const placeNode = (type: typeof CanvasNodeType.Image | typeof CanvasNodeType.Video, preferred: Position) => {
        const size = NODE_DEFAULT_SIZE[type];
        const position = findAvailableGenerationGroupPosition([...nodes, ...additions], preferred, size);
        const node = createCanvasNode(type, { x: position.x + size.width / 2, y: position.y + size.height / 2 });
        additions.push(node);
        return node;
    };
    if (!images.size) {
        const slot = placeNode(CanvasNodeType.Image, { x: source.position.x, y: source.position.y + source.height + 96 });
        slot.title = t("canvasNov21.remake.image");
        images.set(slot.id, slot);
    }
    const target = placeNode(CanvasNodeType.Video, { x: source.position.x + source.width + 96, y: source.position.y });
    target.title = `${t("canvasNov21.remake.name")} · ${source.title}`;
    const bindings = [...images.values()].map((image) => {
        const category = declaredCanvasNodeAssetCategory(image);
        const role = image.metadata?.workflowKind === "styleboard" ? "style" : category === "character" || category === "environment" || category === "prop" ? category : "subject";
        return `${canvasNodeMentionToken(image.id)}: ${t(`canvasNov21.remake.${role}`)}`;
    });
    const sourceEdges = connections.filter((edge) => edge.toNodeId === source.id);
    const matchingRows = nodes.flatMap((node) => {
        if (!node.metadata?.storyboard) return [];
        const rowHandles = new Set(sourceEdges.filter((edge) => edge.fromNodeId === node.id).map((edge) => edge.fromHandleId));
        return node.metadata.storyboard.rows.filter((row) => row.videoNodeId === source.id || rowHandles.has(`row:${row.id}`));
    });
    const row = matchingRows.length === 1 ? matchingRows[0] : undefined;
    const notes =
        row &&
        [row.shotSize, row.camera, row.motion, row.performanceBlocking || row.plotDescription, row.timeBeats, row.continuityOut]
            .filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
            .map((value) => value.replaceAll("@", "").trim());
    const promptParts = [canvasNodeMentionToken(source.id), t("canvasNov21.remake.prompt"), ...bindings];
    if (notes?.length) promptParts.push([t("canvasNov21.remake.notes"), ...new Set(notes)].join("\n"));
    const prompt = promptParts.join("\n\n");
    const seconds = source.metadata?.durationMs ? Math.round(source.metadata.durationMs / 1000) : undefined;
    const input = { textCount: 1, imageCount: images.size, videoCount: 1, audioCount: 0, characterCount: 0 };
    const models = selectableModelsByCapability(config, "video").filter((model) => {
        if (resolveModelChannel(config, model).enabled === false || modelCompatibilityError(config, model, { capability: "video", input, videoOperation: "reference_to_video" })) return false;
        const limit = modelCapabilityConfigFor(config, model).video?.references.maxVideoDurationSeconds;
        return !limit || !seconds || seconds <= limit;
    });
    const model = models.includes(config.videoModel) ? config.videoModel : models[0];
    const profile = model ? modelCapabilityConfigFor(config, model).video : undefined;
    const sourceRatio = (source.metadata?.naturalWidth || source.width) / (source.metadata?.naturalHeight || source.height);
    const ratio = profile?.ratios
        .filter((value) => /^\d+:\d+$/.test(value))
        .sort((left, right) => {
            const difference = (value: string) => {
                const [width, height] = value.split(":").map(Number);
                return Math.abs(width / height - sourceRatio);
            };
            return difference(left) - difference(right);
        })[0];
    target.metadata = {
        ...target.metadata,
        generationMode: "video",
        videoEditOperation: "reference_to_video",
        videoRemake: true,
        composerContent: prompt,
        prompt,
        model,
        seconds: seconds && profile && videoDurationAllowed(profile, seconds) ? String(seconds) : undefined,
        size: ratio,
    };
    const links = [source.id, ...images.keys()].map((fromNodeId) => ({ id: nanoid(), fromNodeId, toNodeId: target.id }));
    return { nodes: [...nodes, ...additions], connections: [...connections, ...links], target };
}
