import { nanoid } from "nanoid";
import { CanvasNodeType, type CanvasConnection, type CanvasNodeData } from "@/types/canvas";
import { writeCanvasNodePrompt } from "@/lib/canvas/canvas-node-prompt";
import { nodeGenerationPrompt } from "@/lib/canvas/generation-contract";
import { bindingForConnectedNode, reconcileStoryboardTargetConnections, storyboardRowReferenceNodeIds } from "@/lib/canvas/canvas-storyboard-materializer";
import { canvasConnectionError } from "@/lib/canvas/canvas-connection-policy";
import type { AiConfig } from "@/stores/use-config-store";
import type { DirectorScene, PrevisSequence } from "@/types/director";
import type { PrevisScene } from "@/types/previs";
import { videoDurationAllowed, videoProfileForResolution, videoResolutionRequest, type VideoCapabilityConfig } from "@/lib/model-capabilities";
import { resolvePrevisSegmentBoundaries } from "./director-previs-sequence";
import { currentLocaleText as t } from "@/i18n/current-locale-text";
import { createCanvasNode } from "@/lib/canvas/canvas-project-domain";
import { findAvailableGenerationGroupPosition } from "@/lib/canvas/canvas-generation-layout";

export type DownstreamPrevisGroup = { startFrame: number; endFrameExclusive: number; segmentIds: string[]; durationSec: number };
export type DirectorAppearanceReference = { actorId: string; actorName: string; characterAssetId?: string; characterVersionId?: string; referenceNodeId?: string };

export class DirectorReferenceError extends Error {}

export function splitPrevisForDownstream(sequence: PrevisSequence): DownstreamPrevisGroup[] {
    const resolved = resolvePrevisSegmentBoundaries(sequence);
    if (resolved.diagnostics.length) throw new Error(resolved.diagnostics.map((item) => item.message).join("\n"));
    const groups: DownstreamPrevisGroup[] = [];
    for (const segment of resolved.sequence.segments) {
        const previous = groups.at(-1);
        if (previous && segment.transitionIn === "continuous") {
            previous.endFrameExclusive = segment.endFrameExclusive;
            previous.segmentIds.push(segment.id);
            previous.durationSec = (previous.endFrameExclusive - previous.startFrame) / sequence.fps;
        } else groups.push({ startFrame: segment.startFrame, endFrameExclusive: segment.endFrameExclusive, segmentIds: [segment.id], durationSec: (segment.endFrameExclusive - segment.startFrame) / sequence.fps });
    }
    return groups;
}

export function planDownstreamReference(group: DownstreamPrevisGroup, capability: VideoCapabilityConfig, resolution = capability.defaultResolution) {
    const diagnostics: string[] = [];
    const resolvedResolution = videoResolutionRequest(capability, resolution);
    if (capability.resolutions.length && !resolvedResolution) diagnostics.push(t("directorDownstream.resolutionUnsupported"));
    const durationAllowed = videoDurationAllowed(videoProfileForResolution(capability, resolvedResolution || resolution), group.durationSec);
    const referenceLimit = capability.references.maxVideoDurationSeconds;
    const referenceDurationAllowed = referenceLimit <= 0 || group.durationSec <= referenceLimit;
    if (!durationAllowed || !referenceDurationAllowed) diagnostics.push(t("directorDownstream.durationUnsupported", { seconds: group.durationSec }));
    const kind = capability.references.maxVideos > 0 && durationAllowed && referenceDurationAllowed ? ("video" as const) : ("keyframes" as const);
    return {
        ...group,
        kind,
        resolution: resolvedResolution || resolution,
        diagnostics,
        durationAllowed,
        keyframeFrames: kind === "keyframes" ? [group.startFrame, Math.floor((group.startFrame + group.endFrameExclusive) / 2), group.endFrameExclusive - 1] : [],
    };
}

export function directorDownstreamOwner(target: CanvasNodeData, nodes: CanvasNodeData[], connections: CanvasConnection[]) {
    const bound = target.metadata?.directorDownstream?.sourceNodeId;
    if (bound) {
        const owner = nodes.find((node) => node.id === bound && node.metadata?.directorSceneId);
        if (!owner) throw new Error(t("directorDownstream.changed"));
        return owner;
    }
    const owners = nodes.filter((node) => {
        if (!node.metadata?.directorSceneId || node.id === target.id) return false;
        if (connections.some((edge) => edge.toNodeId === target.id && (edge.fromNodeId === node.id || directorOutputIds(node).includes(edge.fromNodeId)))) return true;
        const board = nodes.find((item) => item.id === node.metadata?.directorSourceStoryboardNodeId);
        return board?.metadata?.storyboard?.rows.some((row) => row.id === node.metadata?.directorSourceStoryboardRowId && row.videoNodeId === target.id);
    });
    if (owners.length > 1) throw new Error(t("directorDownstream.changed"));
    return owners[0];
}

export function directorAppearanceReferences(scene: DirectorScene | PrevisScene): DirectorAppearanceReference[] {
    return scene.objects.flatMap((object) => {
        const binding = object.characterBinding;
        const referenceNodeId = binding?.referenceNodeId || object.sourceNodeId;
        return object.visible && (object.kind === "actor" || object.primitive === "character") && (binding?.characterAssetId || referenceNodeId)
            ? [{ actorId: object.id, actorName: object.name, characterAssetId: binding?.characterAssetId, characterVersionId: binding?.characterVersionId, referenceNodeId }]
            : [];
    });
}

export function materializeDirectorDownstreamGroups(nodes: CanvasNodeData[], connections: CanvasConnection[], targetId: string, sourceNodeId: string, groups: DownstreamPrevisGroup[]) {
    const target = nodes.find((node) => node.id === targetId);
    if (!target || target.metadata?.locked) throw new Error(t("directorDownstream.targetUnavailable"));
    const targets = groups.map((group, index): CanvasNodeData => ({
        ...target,
        id: index === 0 ? target.id : nanoid(),
        title: index === 0 ? target.title : `${t("directorD4.generate")} · ${index + 1}`,
        position: index === 0 ? target.position : { x: target.position.x, y: target.position.y + index * (target.height + 64) },
        metadata:
            index === 0
                ? { ...target.metadata, directorDownstream: { ...target.metadata?.directorDownstream, sourceNodeId, segmentIds: [...group.segmentIds] } }
                : {
                      generationMode: "video",
                      model: target.metadata?.model,
                      vquality: target.metadata?.vquality,
                      prompt: target.metadata?.prompt,
                      composerContent: target.metadata?.composerContent,
                      directorDownstream: { sourceNodeId, segmentIds: [...group.segmentIds] },
                  },
    }));
    return {
        targets,
        nodes: [...nodes.map((node) => (node.id === targetId ? (targets[0] ?? node) : node)), ...targets.slice(1)],
        connections: [...connections, ...targets.slice(1).flatMap((node) => connections.filter((edge) => edge.toNodeId === targetId).map((edge) => ({ ...edge, id: nanoid(), toNodeId: node.id })))],
    };
}

export type DirectorConnectionTarget = { nodeId: string; rowId?: string; label: string };

export function directorFinalVideo(owner: CanvasNodeData, nodes: CanvasNodeData[], connections: CanvasConnection[]) {
    const script = nodes.find((node) => node.id === owner.metadata?.directorSourceStoryboardNodeId);
    const row = script?.metadata?.storyboard?.rows.find((row) => row.id === owner.metadata?.directorSourceStoryboardRowId);
    const isTarget = (node: CanvasNodeData) =>
        node.type === CanvasNodeType.Video &&
        !node.metadata?.directorSceneId &&
        !node.metadata?.directorOutputKind &&
        node.metadata?.workflowKind !== "reference_video" &&
        (!node.metadata?.directorDownstream?.shotId || node.metadata.directorDownstream.shotId === owner.metadata?.directorShotId);
    const target =
        nodes.find((node) => node.id === row?.videoNodeId && isTarget(node)) || nodes.find((node) => isTarget(node) && connections.some((edge) => edge.fromNodeId === owner.id && edge.toNodeId === node.id && edge.relation !== "director-output"));
    return target && (nodes.find((node) => node.metadata?.versionOfNodeId === target.id && node.metadata.versionPrimary) || target);
}

export function ensureDirectorVideoTarget(owner: CanvasNodeData, nodes: CanvasNodeData[], connections: CanvasConnection[], scene: DirectorScene) {
    const source = directorSourceTarget(owner, nodes);
    let target = directorFinalVideo(owner, nodes, connections);
    let nextNodes = nodes;
    if (!target) {
        const shot = scene.shots.find((item) => item.id === (owner.metadata?.directorShotId || scene.activeShotId));
        if (!shot) throw new Error(t("directorDownstream.targetUnavailable"));
        const prompt = nodes.find((item) => item.id === source?.nodeId)?.metadata?.storyboard?.rows.find((row) => row.id === source?.rowId)?.videoMotionPrompt || shot.prompt;
        target = createCanvasNode(
            CanvasNodeType.Video,
            { x: owner.position.x + owner.width, y: owner.position.y },
            {
                generationMode: "video",
                seconds: String(shot.duration),
                size: shot.aspectRatio === "auto" ? undefined : shot.aspectRatio,
                prompt,
                composerContent: prompt,
            },
        );
        target.title = t("directorD4.generate");
        target.position = findAvailableGenerationGroupPosition(nodes, target.position, target);
        const targetId = target.id;
        nextNodes = [
            ...nodes.map((node) => {
                const board = node.metadata?.storyboard;
                return source?.nodeId === node.id && board ? { ...node, metadata: { ...node.metadata, storyboard: { ...board, rows: board.rows.map((row) => (row.id === source.rowId ? { ...row, videoNodeId: targetId } : row)) } } } : node;
            }),
            target,
        ];
    }
    if (target.metadata?.locked) throw new Error(t("directorDownstream.targetUnavailable"));
    return { ...connectDirectorDownstream(nextNodes, connections, owner.id, { nodeId: target.id, label: target.title }, undefined, scene), targetId: target.id };
}

export function directorConnectionTargets(nodes: CanvasNodeData[], sourceId: string): DirectorConnectionTarget[] {
    const targets = nodes.flatMap<DirectorConnectionTarget>((node) => {
        if (node.metadata?.locked || node.id === sourceId) return [];
        if (node.type === CanvasNodeType.Script) return (node.metadata?.storyboard?.rows || []).map((row) => ({ nodeId: node.id, rowId: row.id, label: `${node.title} · ${row.shotNumber}` }));
        return node.type === CanvasNodeType.Video && !node.metadata?.directorSceneId && node.metadata?.workflowKind !== "reference_video" ? [{ nodeId: node.id, label: node.title }] : [];
    });
    const source = nodes.find((node) => node.id === sourceId);
    const scripts = nodes.filter((node) => node.type === CanvasNodeType.Script && node.metadata?.storyboard);
    const shotNumber = source ? Number(/第\s*(\d+)\s*镜/.exec(source.title)?.[1]) : NaN;
    if (scripts.length === 1 && Number.isFinite(shotNumber)) {
        const row = scripts[0].metadata?.storyboard?.rows.find((row) => row.shotNumber === shotNumber);
        if (row) targets.sort((a, b) => Number(b.nodeId === scripts[0].id && b.rowId === row.id) - Number(a.nodeId === scripts[0].id && a.rowId === row.id));
    }
    return targets;
}

export function directorOutputIds(node: CanvasNodeData) {
    return [node.metadata?.directorPreviewNodeId, node.metadata?.directorClayVideoNodeId].filter((id): id is string => Boolean(id));
}

export function directorSourceTarget(node: CanvasNodeData, nodes: CanvasNodeData[]) {
    return directorConnectionTargets(nodes, node.id).find((target) => target.nodeId === node.metadata?.directorSourceStoryboardNodeId && target.rowId === node.metadata?.directorSourceStoryboardRowId);
}

/** Title inference is only a suggestion; choosing it in the selector is explicit confirmation. */
export function directorSuggestedTarget(node: CanvasNodeData, nodes: CanvasNodeData[]) {
    const scripts = nodes.filter((item) => item.type === CanvasNodeType.Script && item.metadata?.storyboard);
    const number = /第\s*(\d+)\s*镜/.exec(node.title)?.[1];
    if (scripts.length !== 1 || !number) return undefined;
    const row = scripts[0].metadata?.storyboard?.rows.find((item) => item.shotNumber === Number(number));
    return row ? directorConnectionTargets(nodes, node.id).find((target) => target.nodeId === scripts[0].id && target.rowId === row.id) : undefined;
}

/** Only the exact legacy generated edge is migrated; handles and user relations are preserved. */
export function migrateDirectorOutputConnections(nodes: CanvasNodeData[], connections: CanvasConnection[]) {
    return connections.map((edge) => {
        const owner = nodes.find((node) => node.id === edge.toNodeId && node.metadata?.directorSceneId);
        if (!owner || !directorOutputIds(owner).includes(edge.fromNodeId) || edge.fromHandleId || edge.toHandleId || edge.relation) return edge;
        return { ...edge, fromNodeId: owner.id, toNodeId: edge.fromNodeId, relation: "director-output" as const };
    });
}

function appendPrompt(existing: string, addition: string) {
    const text = addition.trim();
    return !text || existing.includes(text) ? existing : [existing.trim(), text].filter(Boolean).join("\n\n");
}

/** Binding materializes ordinary media references, so model confirmation and billing stay authoritative. */
export function connectDirectorDownstream(nodes: CanvasNodeData[], connections: CanvasConnection[], sourceId: string, target: DirectorConnectionTarget, config?: AiConfig, scene?: DirectorScene) {
    const source = nodes.find((node) => node.id === sourceId);
    const destination = nodes.find((node) => node.id === target.nodeId);
    const owner = source?.metadata?.directorSceneId ? source : nodes.find((node) => directorOutputIds(node).includes(sourceId));
    if (!source || !owner || !destination || destination.metadata?.locked || sourceId === target.nodeId) return { nodes, connections };
    const sequenceReference = Boolean(scene && source === owner);
    const mediaIds = sequenceReference
        ? (owner.metadata?.referenceAssetNodeIds || []).filter((id) => !directorOutputIds(owner).includes(id))
        : source === owner
          ? Array.from(new Set([...directorOutputIds(owner), ...(owner.metadata?.referenceAssetNodeIds || [])]))
          : [source.id];
    const media = mediaIds.flatMap((id) => nodes.find((node) => node.id === id) || []);
    const prompt = sequenceReference ? "" : source.metadata?.videoCameraMovePrompt || source.metadata?.prompt || "";
    const withReferences = (existing: string) => {
        let next = appendPrompt(existing, prompt);
        for (const item of media) next = appendPrompt(next, `@[node:${item.id}]`);
        return next;
    };
    let nextConnections = [...connections];
    const addEdge = (fromNodeId: string, toNodeId: string, toHandleId?: string) => {
        if (!nextConnections.some((edge) => edge.fromNodeId === fromNodeId && edge.toNodeId === toNodeId && edge.toHandleId === toHandleId)) nextConnections.push({ id: nanoid(), fromNodeId, toNodeId, toHandleId });
    };
    addEdge(sourceId, target.nodeId, target.rowId ? `row:${target.rowId}` : undefined);
    let nextNodes = nodes;
    if (target.rowId) {
        const storyboard = destination.metadata?.storyboard;
        const row = storyboard?.rows.find((item) => item.id === target.rowId);
        if (!row || !storyboard) return { nodes, connections };
        if (row.videoNodeId && nodes.find((node) => node.id === row.videoNodeId)?.metadata?.locked) return { nodes, connections };
        const bindings = [...(row.assetBindings || [])];
        for (const item of media) {
            const binding = bindingForConnectedNode(item);
            if (binding && !bindings.some((entry) => entry.nodeId === item.id)) bindings.push(binding);
            addEdge(item.id, destination.id, `row:${row.id}`);
        }
        const updatedRow = { ...row, assetBindings: bindings, videoMotionPrompt: appendPrompt(row.videoMotionPrompt || row.plotDescription, prompt) };
        nextNodes = nodes.map((node) =>
            node.id === destination.id
                ? { ...node, metadata: { ...node.metadata, storyboard: { ...storyboard, rows: storyboard.rows.map((item) => (item.id === row.id ? updatedRow : item)) } } }
                : node.id === owner.id
                  ? { ...node, metadata: { ...node.metadata, directorSourceStoryboardNodeId: destination.id, directorSourceStoryboardRowId: row.id } }
                  : node,
        );
        if (row.videoNodeId) {
            const script = nextNodes.find((node) => node.id === destination.id)!;
            nextConnections = reconcileStoryboardTargetConnections(nextConnections, script, updatedRow, row.videoNodeId, storyboardRowReferenceNodeIds(script, updatedRow, nextNodes, nextConnections, true, row.videoNodeId));
            nextNodes = nextNodes.map((node) => (node.id === row.videoNodeId ? writeCanvasNodePrompt(node, withReferences(nodeGenerationPrompt(node))) : node));
        }
    } else if (destination.type === CanvasNodeType.Video && !destination.metadata?.directorSceneId) {
        media.forEach((item) => addEdge(item.id, destination.id));
        nextNodes = nodes.map((node) => (node.id === destination.id ? writeCanvasNodePrompt(node, withReferences(nodeGenerationPrompt(node))) : node));
    } else return { nodes, connections };
    const videoNodeId = target.rowId ? destination.metadata?.storyboard?.rows.find((row) => row.id === target.rowId)?.videoNodeId : destination.id;
    if (sequenceReference && videoNodeId) {
        const shotId = owner.metadata?.directorShotId || scene?.activeShotId;
        nextNodes = nextNodes.map((node) =>
            node.id === videoNodeId
                ? {
                      ...node,
                      metadata: {
                          ...node.metadata,
                          directorDownstream: node.metadata?.directorDownstream?.sourceNodeId === owner.id ? node.metadata.directorDownstream : { sourceNodeId: owner.id, ...(!scene?.previs || scene.worldEngine ? { shotId } : {}) },
                      },
                  }
                : node,
        );
    }
    if (config) {
        for (const edge of nextConnections.filter((edge) => !connections.includes(edge))) {
            const error = canvasConnectionError(config, nextNodes, nextConnections, edge);
            // Optional clay is checked against the selected model at quote/submission.
            if (error && !error.includes("参考视频")) throw new Error(error);
        }
    }
    return { nodes: nextNodes, connections: nextConnections };
}
