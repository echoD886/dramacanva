import { blockDescriptionStage, lightDescriptionStage } from "./director-description-staging";
import { nanoid } from "nanoid";
import { createCanvasNode, createStoryboardRow } from "@/lib/canvas/canvas-project-domain";
import { CanvasNodeType, type CanvasNodeData } from "@/types/canvas";
import type { DirectorScene } from "@/types/director";
import { deriveDirectorStoryboardShot, rememberDirectorActors } from "./director-storyboard";
import { createDirectorSceneFromTemplate } from "./director-templates";
import { directorWorkbenchSequence } from "./director-workbench-layout";
import { getPrevisTotalFrames } from "./director-previs-sequence";
import { compilePrevisToDirectorShots } from "./director-sequence-compiler";

/** Free description entry shares the storyboard cast, set, blocking and camera parser. */
export function deriveDirectorDescription(description: string, nodes: CanvasNodeData[], derive = deriveDirectorStoryboardShot) {
    const row = createStoryboardRow(1, { plotDescription: description, videoMotionPrompt: description, durationSeconds: Number(description.match(/(\d+(?:\.\d+)?)\s*(?:秒|seconds?|secs?|s\b)/i)?.[1]) || 5 });
    const script = createCanvasNode(CanvasNodeType.Script, { x: 0, y: 0 }, { size: description.match(/9:16|16:9|2\.39:1/)?.[0] || "9:16", storyboard: { rows: [row], visibleColumns: [], referenceNodeIds: [] } });
    const result = derive(script, row, nodes, []);
    result.scene.shots = result.scene.shots.map(({ sourceStoryboardNodeId: _node, sourceStoryboardRowId: _row, sourceFingerprint: _fingerprint, ...shot }) => ({ ...shot, prompt: description }));
    return lightDescriptionStage(blockDescriptionStage(result.scene, description), description);
}

export function emptyDirectorDescription(description: string, nodes: CanvasNodeData[]) {
    const scene = createDirectorSceneFromTemplate("empty", description.trim() ? description.slice(0, 80) : undefined);
    scene.shots[0].aspectRatio = "9:16";
    if (!description.trim()) return scene;
    const cast = deriveDirectorDescription(description, nodes);
    scene.objects = cast.objects.filter((o) => o.kind === "actor").map((o) => ({ ...o, keyframes: [], motionPath: undefined, pose: "stand", heldProp: undefined }));
    scene.shots[0] = { ...scene.shots[0], duration: cast.shots[0].duration, aspectRatio: cast.shots[0].aspectRatio, prompt: description };
    return rememberDirectorActors(scene);
}

export function bindDirectorDescriptionReferences(scene: DirectorScene, nodes: CanvasNodeData[]): DirectorScene {
    const candidates = nodes.filter((n) => n.type === CanvasNodeType.Image || n.metadata?.workflowKind === "character");
    return {
        ...scene,
        objects: scene.objects.map((object) => {
            if (object.kind !== "actor") return object;
            const node = candidates.find((n) => n.id === object.characterBinding?.referenceNodeId) || candidates.find((n) => n.title === object.name && (!n.metadata?.assetCategory || n.metadata.assetCategory === "character"));
            return {
                ...object,
                characterBinding: node
                    ? { referenceNodeId: node.id, characterName: object.name, referenceImageUrl: node.metadata?.content, characterAssetId: node.metadata?.characterAssetId || "", characterVersionId: node.metadata?.characterVersionId || "" }
                    : undefined,
            };
        }),
    };
}

/** Generated scenes have globally unique IDs; preserve authored shots and their actor snapshots. */
export function mergeDirectorDescription(current: DirectorScene, generated: DirectorScene, mode: "append" | "replace"): DirectorScene {
    const prior = rememberDirectorActors(current);
    const next = structuredClone(generated);
    // Remap even mocked/retried results, so duplicate submissions cannot alias entities.
    const ids = new Map([...next.objects, ...next.cameras, ...next.lights, ...next.shots].map((item) => [item.id, nanoid()]));
    if (mode === "append")
        for (const object of next.objects) {
            const existing = prior.objects.find((item) => item.kind === object.kind && item.name === object.name && (!object.characterBinding || item.characterBinding?.referenceNodeId === object.characterBinding.referenceNodeId));
            if (existing) ids.set(object.id, existing.id);
        }
    next.objects.forEach((o) => {
        o.id = ids.get(o.id)!;
    });
    next.cameras.forEach((c) => {
        c.id = ids.get(c.id)!;
    });
    next.lights.forEach((l) => {
        l.id = ids.get(l.id)!;
    });
    next.shots.forEach((s) => {
        s.id = ids.get(s.id)!;
        s.cameraId = ids.get(s.cameraId)!;
        if (s.actorStates) s.actorStates = Object.fromEntries(Object.entries(s.actorStates).map(([id, state]) => [ids.get(id)!, state]));
        if (s.stage) s.stage = { objects: s.stage.objects.map((object) => ({ ...object, id: ids.get(object.id)! })), lights: s.stage.lights.map((light) => ({ ...light, id: ids.get(light.id)! })) };
    });
    next.activeShotId = ids.get(next.activeShotId)!;
    const objects = prior.objects.map((o) => (o.kind === "actor" ? next.objects.find((item) => item.id === o.id) || { ...o, visible: false } : o));
    objects.push(...next.objects.filter((o) => !objects.some((item) => item.id === o.id)));
    const merged: DirectorScene = {
        ...next,
        id: current.id,
        title: current.title,
        createdAt: current.createdAt,
        updatedAt: new Date().toISOString(),
        ...(mode === "append" ? { objects, cameras: [...prior.cameras, ...next.cameras], lights: prior.lights, shots: [...prior.shots, ...next.shots] } : {}),
    };
    if (!next.previs) return merged;

    // v2 的动作、路线和拍摄段也引用实体 ID；追加时统一换名并接在已有序列之后。
    const previous = mode === "append" ? directorWorkbenchSequence(prior) : undefined;
    const fps = previous?.fps ?? next.previs.fps;
    const scale = fps / next.previs.fps;
    const offset = previous ? getPrevisTotalFrames(previous) : 0;
    const frame = (value: number) => offset + Math.round(value * scale);
    for (const item of [...next.previs.actions, ...(next.previs.paths ?? []), ...next.previs.segments]) ids.set(item.id, nanoid());
    const remap = (id: string) => ids.get(id) ?? id;
    const added = {
        ...next.previs,
        sceneId: current.id,
        revision: (current.previs?.revision ?? 0) + 1,
        fps,
        aspect: previous?.aspect ?? next.previs.aspect,
        actions: next.previs.actions.map((action) => ({
            ...action,
            id: remap(action.id),
            actorId: remap(action.actorId),
            startFrame: frame(action.startFrame),
            endFrameExclusive: frame(action.endFrameExclusive),
            ...(action.pathId ? { pathId: remap(action.pathId) } : {}),
            ...(action.seatId ? { seatId: remap(action.seatId) } : {}),
            ...(action.lookAtId ? { lookAtId: remap(action.lookAtId) } : {}),
        })),
        paths: next.previs.paths?.map((path) => ({ ...path, id: remap(path.id), ownerId: remap(path.ownerId), points: path.points.map((point) => ({ ...point, id: nanoid() })) })),
        segments: next.previs.segments.map((segment) => ({
            ...segment,
            id: remap(segment.id),
            startFrame: frame(segment.startFrame),
            endFrameExclusive: frame(segment.endFrameExclusive),
            targetIds: segment.targetIds.map(remap),
            ...(segment.shotId ? { shotId: remap(segment.shotId) } : {}),
            ...(segment.legacyShotId ? { legacyShotId: remap(segment.legacyShotId) } : {}),
            ...(segment.cameraId ? { cameraId: remap(segment.cameraId) } : {}),
            ...(segment.pathId ? { pathId: remap(segment.pathId) } : {}),
            ...(segment.transitionFrames !== undefined ? { transitionFrames: Math.round(segment.transitionFrames * scale) } : {}),
            ...(segment.initialStage ? { initialStage: { objects: segment.initialStage.objects.map((object) => ({ ...object, id: remap(object.id) })), lights: segment.initialStage.lights.map((light) => ({ ...light, id: remap(light.id) })) } } : {}),
            endRule: segment.endRule.kind === "frame" ? { ...segment.endRule, frame: frame(segment.endRule.frame) } : { ...segment.endRule, actionId: remap(segment.endRule.actionId), offsetFrames: Math.round(segment.endRule.offsetFrames * scale) },
        })),
    };
    const sequence = previous ? { ...added, actions: [...previous.actions, ...added.actions], paths: [...(previous.paths ?? []), ...(added.paths ?? [])], segments: [...previous.segments, ...added.segments] } : added;
    const compiled = compilePrevisToDirectorShots(merged, sequence);
    if (compiled.diagnostics.length) throw new Error(compiled.diagnostics.map((diagnostic) => diagnostic.message).join("\n"));
    return compiled.scene;
}
