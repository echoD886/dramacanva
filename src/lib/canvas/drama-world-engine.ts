import { worldEngineText as t } from "@/i18n/world-engine-text";
import { PREVIS_ASPECT_RATIOS, PREVIS_DEFAULT_ASPECT_RATIO } from "./previs/previs-optics";
import { createCanvasNode, createStoryboardRow } from "./canvas-project-domain";
import { findAvailableGenerationGroupPosition } from "./canvas-generation-layout";
import { CanvasNodeType, type CanvasNodeData } from "@/types/canvas";
import type { DramaCast, DramaEpisodeDetail } from "@/services/api/drama";

export function dramaSegmentShots(detail: DramaEpisodeDetail, segmentId: string) {
    const segment = detail.segments.find((item) => item.id === segmentId);
    if (!segment) return [];
    const ids = new Set(segment.shotIds);
    return detail.shots.filter((shot) => shot.episodeId === detail.episode.id && shot.segmentIndex === segment.index && ids.has(shot.id)).sort((a, b) => a.position - b.position);
}

/** One source row per drama shot; other segments never contribute staging. */
export function prepareDramaWorldEngine(nodes: CanvasNodeData[], projectId: string, detail: DramaEpisodeDetail, cast: DramaCast[], segmentId: string, shotId?: string, aspectRatio: string = PREVIS_DEFAULT_ASPECT_RATIO) {
    const segment = detail.segments.find((item) => item.id === segmentId);
    const shots = dramaSegmentShots(detail, segmentId);
    const shot = shotId ? shots.find((item) => item.id === shotId) : shots[0];
    if (!segment || !shot || !projectId || !detail.episode.id || detail.episode.projectId !== projectId) throw new Error(t("worldEngine.handoffFailed"));
    const binding = { projectId, episodeId: detail.episode.id, segmentId };
    const candidates = nodes.filter(
        (node) =>
            node.metadata?.dramaProjection?.slot === "world-storyboard" && node.metadata.dramaProjection.projectId === projectId && node.metadata.dramaProjection.episodeId === binding.episodeId && node.metadata.dramaProjection.segmentId === segmentId,
    );
    const existing = candidates.find((node) => node.metadata?.storyboard?.rows.some((row) => row.id === shot.id));
    if (existing) return { nodes, scriptId: existing.id, rowId: shot.id };
    if (!Number.isFinite(shot.durationMs) || shot.durationMs <= 0 || !PREVIS_ASPECT_RATIOS.some(({ value }) => value === aspectRatio)) throw new Error(t("worldEngine.invalidShot"));
    const characterIds = JSON.parse(shot.castIdsJson || "[]") as string[];
    const propIds = JSON.parse(shot.propIdsJson || "[]") as string[];
    const ids = new Set([...characterIds, ...propIds, ...(shot.sceneCastId ? [shot.sceneCastId] : [])]);
    const references = nodes.filter(
        (node) => node.type === CanvasNodeType.Image && node.metadata?.dramaProjection?.projectId === projectId && node.metadata.dramaProjection.episodeId === binding.episodeId && node.metadata.dramaProjection.segmentId === segmentId,
    );
    const imageFor = (id: string) => {
        const resource = segment.request?.references.find((ref) => ref.castId === id)?.resourceId || cast.find((asset) => asset.id === id)?.imageResourceId;
        return references.find((node) => node.metadata?.dramaProjection?.slot === `cast:${id}` && (!resource || node.metadata.storageKey === `resource:${resource}`));
    };
    const row = createStoryboardRow(shot.position + 1, {
        id: shot.id,
        durationSeconds: shot.durationMs / 1000,
        plotDescription: [shot.scene, shot.action].filter(Boolean).join("\n"),
        performanceBlocking: shot.action,
        dialogue: [shot.speaker, shot.dialogue].filter(Boolean).join(" · "),
        shotSize: shot.shotSize,
        camera: shot.camera,
        motion: shot.camera,
        imageGenerationPrompt: shot.imagePrompt,
        videoMotionPrompt: shot.videoPrompt,
        characters: cast.filter((item) => characterIds.includes(item.id)).map((item) => ({ characterName: item.name, characterDescription: item.description, characterImageNodeId: imageFor(item.id)?.id })),
        assetBindings: cast.filter((item) => ids.has(item.id) && imageFor(item.id)).map((item) => ({ nodeId: imageFor(item.id)!.id, role: item.kind === "scene" ? "environment" : item.kind, priority: 1 })),
    });
    const segmentBoard = candidates.find((node) => !node.metadata?.dramaProjection?.shotId && !node.metadata?.locked && node.metadata?.storyboard);
    if (segmentBoard?.metadata?.storyboard) {
        const storyboard = segmentBoard.metadata.storyboard;
        const rows = [...storyboard.rows, row].sort((a, b) => a.shotNumber - b.shotNumber);
        return {
            nodes: nodes.map((node) => (node.id === segmentBoard.id ? { ...node, metadata: { ...segmentBoard.metadata, storyboard: { ...storyboard, rows } } } : node)),
            scriptId: segmentBoard.id,
            rowId: shot.id,
        };
    }
    const node = createCanvasNode(
        CanvasNodeType.Script,
        { x: 0, y: 0 },
        {
            dramaProjection: { ...binding, slot: "world-storyboard" },
            size: aspectRatio,
            prompt: [shot.sourceQuote, segment.request?.header, segment.videoPrompt].filter(Boolean).join("\n\n"),
            storyboard: { rows: [row], visibleColumns: ["shotNumber", "plotDescription", "camera", "assets"], referenceNodeIds: [] },
        },
    );
    node.title = segment.title;
    node.position = findAvailableGenerationGroupPosition(nodes, { x: nodes.reduce((right, item) => Math.max(right, item.position.x + item.width + 80), 0), y: 0 }, node);
    return { nodes: [...nodes, node], scriptId: node.id, rowId: row.id };
}

/** Read the same authoritative output nodes that the canvas writer updates in place. */
export function dramaWorldEngineOutputs(nodes: CanvasNodeData[], projectId: string, episodeId: string, segmentId: string) {
    return nodes
        .filter((node) => {
            const binding = node.metadata?.dramaProjection;
            return binding?.projectId === projectId && binding.episodeId === episodeId && binding.segmentId === segmentId && binding.slot === "world-source";
        })
        .map((source) => ({
            shotId: source.metadata?.dramaProjection?.shotId,
            title: source.title,
            prompt: source.metadata?.prompt || "",
            image: nodes.find((node) => node.id === source.metadata?.directorPreviewNodeId),
            video: nodes.find((node) => node.id === source.metadata?.directorClayVideoNodeId),
        }));
}
