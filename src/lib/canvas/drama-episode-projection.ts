import { CanvasNodeType, type CanvasNodeData, type CanvasConnection } from "@/types/canvas";
import type { DramaCast, DramaEpisodeDetail } from "@/services/api/drama";
import { resourceFileUrl } from "@/services/api/resources";
import { createCanvasNode } from "./canvas-project-domain";
import { findAvailableGenerationGroupPosition } from "./canvas-generation-layout";
import { FRAME_HEADER_HEIGHT, FRAME_PADDING } from "./canvas-frame";

type Dimensions = { width: number; height: number };
type Media = { slot: string; resourceId: string; name: string; video?: boolean };

export function connectDramaEpisodeMedia(nodes: CanvasNodeData[], connections: CanvasConnection[], detail?: DramaEpisodeDetail, cast: DramaCast[] = []) {
    const result = [...connections];
    for (const video of nodes.filter((node) => node.metadata?.dramaProjection?.slot === "video")) {
        const binding = video.metadata!.dramaProjection!;
        const segment = detail?.segments.find((s) => s.id === binding.segmentId && detail.episode.id === binding.episodeId && detail.episode.projectId === binding.projectId);
        const sent =
            segment &&
            new Set(
                [segment.request.firstFrameResourceId, ...segment.request.references.filter((ref) => ref.sent !== false).map((ref) => ref.resourceId || cast.find((item) => item.id === ref.castId)?.imageResourceId)]
                    .filter(Boolean)
                    .map((id) => "resource:" + id),
            );
        for (const image of nodes.filter(
            (node) => node.type === CanvasNodeType.Image && node.metadata?.dramaProjection?.projectId === binding.projectId && node.metadata.dramaProjection.episodeId === binding.episodeId && node.metadata.dramaProjection.segmentId === binding.segmentId,
        )) {
            if (sent && !sent.has(image.metadata?.storageKey || "")) continue;
            if (!result.some((edge) => edge.fromNodeId === image.id && edge.toNodeId === video.id)) result.push({ id: `drama-${image.id}-${video.id}`, fromNodeId: image.id, toNodeId: video.id });
        }
    }
    return result.length === connections.length ? connections : result;
}

/** Project an episode in script order. Existing slots remain user-editable, including after moving them outside the frame. */
export function projectDramaEpisode(nodes: CanvasNodeData[], projectId: string, detail: DramaEpisodeDetail, cast: DramaCast[], dimensions: ReadonlyMap<string, Dimensions> = new Map()) {
    const result = [...nodes];
    const episodeId = detail.episode.id;
    for (const segment of [...detail.segments].sort((a, b) => a.index - b.index)) {
        const segmentId = segment.id;
        if (!segmentId) continue;
        const binding = { projectId, episodeId, segmentId };
        const matches = (node: CanvasNodeData) => {
            const ref = node.metadata?.dramaProjection;
            return ref?.projectId === projectId && ref.episodeId === episodeId && ref.segmentId === segmentId;
        };
        let frame = result.find((node) => matches(node) && node.type === CanvasNodeType.Frame);
        const slots = new Set(result.filter(matches).map((node) => JSON.stringify([node.metadata?.dramaProjection?.slot, node.metadata?.storageKey])));
        const media: Media[] = [];
        if (segment.request.firstFrameResourceId) media.push({ slot: "first-frame", resourceId: segment.request.firstFrameResourceId, name: segment.title });
        for (const ref of segment.request.references) {
            const asset = cast.find((item) => item.id === ref.castId);
            const resourceId = ref.resourceId || asset?.imageResourceId;
            if (resourceId) media.push({ slot: "cast:" + (ref.castId || resourceId), resourceId, name: ref.name });
        }
        if (segment.videoResourceId) media.push({ slot: "video", resourceId: segment.videoResourceId, name: segment.title, video: true });
        const missing = media.filter(({ slot, resourceId }) => {
            const key = JSON.stringify([slot, "resource:" + resourceId]);
            if (slots.has(key)) return false;
            slots.add(key);
            return true;
        });
        if (frame && !missing.length) continue;
        const width = 264,
            gap = 20,
            columns = 3,
            cellHeight = 248;
        const groupWidth = 2 * FRAME_PADDING + columns * width + (columns - 1) * gap;
        if (!frame) {
            const sameEpisode = result.filter((node) => node.type === CanvasNodeType.Frame && node.metadata?.dramaProjection?.episodeId === episodeId && node.metadata.dramaProjection.projectId === projectId);
            const last = sameEpisode.at(-1);
            const preferred = last ? { x: last.position.x, y: last.position.y + last.height + 64 } : { x: result.reduce((right, node) => Math.max(right, node.position.x + node.width + 64), 0), y: 0 };
            frame = createCanvasNode(CanvasNodeType.Frame, preferred, { dramaProjection: binding });
            frame.title = segment.title;
            frame.width = groupWidth;
            frame.height = FRAME_HEADER_HEIGHT + FRAME_PADDING * 2 + Math.max(1, Math.ceil((2 + segment.request.references.length) / columns)) * (cellHeight + gap);
            frame.position = findAvailableGenerationGroupPosition(result, preferred, frame);
            result.push(frame);
        }
        const occupied = result.filter((node) => node.parentId === frame.id);
        let bottom = frame.position.y;
        let cell = 0;
        for (const item of missing) {
            const size = dimensions.get(item.resourceId);
            const ratio = size && size.width > 0 && size.height > 0 ? size.width / size.height : 16 / 9;
            const node = createCanvasNode(item.video ? CanvasNodeType.Video : CanvasNodeType.Image, frame.position, {
                content: resourceFileUrl(item.resourceId),
                storageKey: "resource:" + item.resourceId,
                status: "success",
                manualSize: true,
                dramaProjection: { ...binding, slot: item.slot },
            });
            node.width = Math.min(width, cellHeight * ratio);
            node.height = node.width / ratio;
            let pos: { x: number; y: number };
            do {
                pos = { x: frame.position.x + FRAME_PADDING + (cell % columns) * (width + gap), y: frame.position.y + FRAME_HEADER_HEIGHT + FRAME_PADDING + Math.floor(cell / columns) * (cellHeight + gap) };
                cell++;
            } while (occupied.some((other) => pos.x < other.position.x + other.width && pos.x + node.width > other.position.x && pos.y < other.position.y + other.height && pos.y + node.height > other.position.y));
            node.position = pos;
            node.title = item.name;
            node.parentId = frame.id;
            result.push(node);
            bottom = Math.max(bottom, pos.y + node.height);
        }
        const opening = result.find((node) => matches(node) && node.metadata?.dramaProjection?.slot === "first-frame" && node.metadata.storageKey === "resource:" + segment.request.firstFrameResourceId);
        const clip = result.find((node) => matches(node) && node.metadata?.dramaProjection?.slot === "video" && node.metadata.storageKey === "resource:" + segment.videoResourceId);
        if (clip && opening && !segment.request.tailFrameAsReference && !clip.metadata?.videoStartFrameNodeId) {
            result[result.indexOf(clip)] = { ...clip, metadata: { ...clip.metadata, videoStartFrameNodeId: opening.id } };
        }
        result[result.indexOf(frame)] = { ...frame, width: Math.max(frame.width, groupWidth), height: Math.max(frame.height, bottom - frame.position.y + FRAME_PADDING) };
    }
    return result.length === nodes.length ? nodes : result;
}
