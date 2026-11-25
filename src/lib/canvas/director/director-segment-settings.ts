import type { DirectorObject, DirectorScene, PrevisCameraSegment, PrevisSequence } from "@/types/director";
import { evaluatePrevisFrame } from "./director-previs-evaluate";
import { mapDirectorSceneToPrevis } from "./director-previs-legacy";
import { resolvePrevisSegmentBoundaries } from "./director-previs-sequence";
import { compilePrevisToDirectorShots } from "./director-sequence-compiler";
import { createDirectorActor } from "./director-scene-data";
import { directorSceneForShot } from "./director-storyboard";
import { bakeDirectorCameraPath } from "./director-camera-path";

export function createDirectorDrawerActor(scene: DirectorScene, formatName: (letter: string) => string, sourceId?: string) {
    let index = scene.objects.filter((object) => object.kind === "actor").length;
    let name: string;
    do {
        name = formatName(index < 26 ? String.fromCharCode(65 + index) : String(index + 1));
        index += 1;
    } while (scene.objects.some((object) => object.name === name));
    const actor = createDirectorActor(name);
    const source = scene.objects.find((object) => object.id === sourceId && object.kind === "actor");
    if (source?.characterBinding) actor.characterBinding = structuredClone(source.characterBinding);
    return actor;
}

function compileSettings(scene: DirectorScene, sequence: PrevisSequence): DirectorScene {
    const result = compilePrevisToDirectorShots(scene, { ...sequence, revision: sequence.revision + 1 });
    const errors = result.diagnostics.filter((item) => item.code !== "lens_approximated");
    if (errors.length) throw new Error(errors.map((item) => item.message).join("\n"));
    return result.scene;
}

export function addDirectorSceneObject(scene: DirectorScene, object: DirectorObject): DirectorScene {
    const next = { ...scene, objects: [...scene.objects, object] };
    return scene.previs?.segments.some((segment) => !segment.legacyShotId)
        ? compileSettings(next, { ...scene.previs, segments: scene.previs.segments.map((segment) => (segment.initialStage ? { ...segment, initialStage: { ...segment.initialStage, objects: [...segment.initialStage.objects, object] } } : segment)) })
        : next;
}

export function updateDirectorSegment(scene: DirectorScene, segmentId: string, patch: Partial<Pick<PrevisCameraSegment, "targetIds" | "move" | "framing" | "side" | "params" | "transitionIn" | "transitionFrames">>): DirectorScene {
    const sequence = scene.previs ?? mapDirectorSceneToPrevis(scene).sequence;
    const segment = sequence.segments.find((item) => item.id === segmentId);
    if (!segment || segment.legacyShotId) return scene;
    if (patch.move === "path" && segment.move !== "path") return bakeDirectorCameraPath(scene, segmentId);
    const next = { ...segment, ...patch };
    if (patch.move !== undefined && patch.move !== "path") delete next.pathId;
    if (next.move !== "path" && (patch.move !== undefined || patch.framing !== undefined || patch.targetIds !== undefined || patch.side !== undefined || patch.params !== undefined)) delete next.cameraStart;
    if (patch.targetIds !== undefined && !patch.targetIds.length) {
        next.targetPoint = evaluatePrevisFrame(scene, sequence, segment.startFrame).camera?.lookAt ?? segment.targetPoint;
        if (next.move !== "path") next.move = "fixed";
    }
    if (!next.targetIds.length && next.move !== "path") next.move = "fixed";
    if (next.transitionFrames !== undefined) next.transitionFrames = Math.max(0, Math.min(segment.endFrameExclusive - segment.startFrame, Math.round(next.transitionFrames)));
    return compileSettings(scene, { ...sequence, segments: sequence.segments.map((item) => (item.id === segmentId ? next : item)) });
}

export function setDirectorSegmentBoundary(scene: DirectorScene, leftId: string, rightId: string, frame: number): DirectorScene {
    const sequence = scene.previs;
    const index = sequence?.segments.findIndex((segment) => segment.id === leftId) ?? -1;
    const left = sequence?.segments[index],
        right = sequence?.segments[index + 1];
    if (!sequence || !left || !right || right.id !== rightId || left.legacyShotId || right.legacyShotId) throw new Error("段落分界必须属于相邻的可编辑段落");
    if (!Number.isInteger(frame) || frame <= left.startFrame || frame >= right.endFrameExclusive) throw new Error("分界必须为整数帧且每段至少保留一帧");
    return compileSettings(scene, {
        ...sequence,
        segments: sequence.segments.map((segment, at) =>
            at === index
                ? { ...segment, endFrameExclusive: frame, endRule: { kind: "frame", frame } }
                : at === index + 1
                  ? { ...segment, startFrame: frame, ...(segment.transitionFrames === undefined ? {} : { transitionFrames: Math.min(segment.transitionFrames, segment.endFrameExclusive - frame) }) }
                  : segment,
        ),
    });
}

export function convertDirectorLegacySegment(scene: DirectorScene, segmentId: string): DirectorScene {
    const sequence = scene.previs ?? mapDirectorSceneToPrevis(scene).sequence;
    const segment = sequence.segments.find((item) => item.id === segmentId);
    const shot = scene.shots.find((item) => item.id === segment?.legacyShotId);
    if (!segment?.legacyShotId || !shot) return scene;
    const snapshot = evaluatePrevisFrame(scene, sequence, segment.startFrame);
    if (!snapshot.camera) return scene;
    const source = directorSceneForShot({ ...scene, ...shot.stage }, shot.id);
    const next = {
        ...segment,
        move: "fixed" as const,
        transitionIn: "cut" as const,
        transitionFrames: 0,
        cameraId: `previs-converted-${segment.id}`,
        initialStage: structuredClone({ objects: source.objects, lights: source.lights }),
        targetIds: Object.entries(snapshot.actors)
            .filter(([, actor]) => actor.visible)
            .map(([id]) => id),
        framing: mapDirectorSceneToPrevis({ ...scene, shots: [shot] }).sequence.segments[0].framing,
        cameraStart: { position: snapshot.camera.position, quaternion: snapshot.camera.quaternion, fov: snapshot.camera.fov, focalLength: snapshot.camera.focalLength, lookAt: snapshot.camera.lookAt },
        targetPoint: snapshot.camera.lookAt,
    };
    delete next.legacyShotId;
    return compileSettings(scene, { ...sequence, segments: sequence.segments.map((item) => (item.id === segmentId ? next : item)) });
}

export function directorActorRemovalImpact(scene: DirectorScene, actorId: string) {
    const sequence = resolvePrevisSegmentBoundaries(scene.previs ?? mapDirectorSceneToPrevis(scene).sequence).sequence;
    return { actions: sequence.actions.filter((action) => action.actorId === actorId), segments: sequence.segments.filter((segment) => segment.targetIds.includes(actorId)) };
}

export function removeDirectorActor(scene: DirectorScene, actorId: string): DirectorScene {
    const sequence = resolvePrevisSegmentBoundaries(scene.previs ?? mapDirectorSceneToPrevis(scene).sequence).sequence;
    const removedActions = new Set(sequence.actions.filter((action) => action.actorId === actorId).map((action) => action.id));
    const segments = sequence.segments.map((segment) => {
        const targetIds = segment.targetIds.filter((id) => id !== actorId);
        const affected = targetIds.length !== segment.targetIds.length;
        const targetPoint = affected && !targetIds.length ? evaluatePrevisFrame(scene, sequence, segment.startFrame).camera?.lookAt : segment.targetPoint;
        return {
            ...segment,
            targetIds,
            initialStage: segment.initialStage ? { ...segment.initialStage, objects: segment.initialStage.objects.filter((object) => object.id !== actorId) } : undefined,
            ...(affected && !targetIds.length ? { move: segment.move === "path" ? ("path" as const) : ("fixed" as const), targetPoint } : {}),
            endRule: segment.endRule.kind === "actionEnd" && removedActions.has(segment.endRule.actionId) ? { kind: "frame" as const, frame: segment.endFrameExclusive } : segment.endRule,
        };
    });
    // 旧段的舞台快照同样移除人物，防止切换镜头后重新出现。
    const cleaned = {
        ...scene,
        objects: scene.objects.filter((object) => object.id !== actorId),
        shots: scene.shots.map((shot) => ({
            ...shot,
            actorStates: shot.actorStates ? Object.fromEntries(Object.entries(shot.actorStates).filter(([id]) => id !== actorId)) : undefined,
            stage: shot.stage ? { ...shot.stage, objects: shot.stage.objects.filter((object) => object.id !== actorId) } : undefined,
        })),
    };
    return compileSettings(cleaned, { ...sequence, segments, actions: sequence.actions.filter((action) => action.actorId !== actorId), paths: sequence.paths?.filter((path) => path.ownerId !== actorId) });
}

export function directorSegmentDollyConflict(scene: DirectorScene, segmentId: string): boolean {
    const sequence = scene.previs;
    const segment = sequence?.segments.find((item) => item.id === segmentId);
    if (!sequence || !segment || segment.legacyShotId || segment.transitionIn !== "continuous" || (segment.move !== "push" && segment.move !== "pull")) return false;
    const start = evaluatePrevisFrame(scene, sequence, segment.startFrame).camera;
    const end = evaluatePrevisFrame(scene, sequence, segment.endFrameExclusive - 1).camera;
    if (!start || !end) return false;
    const distance = (camera: typeof start) => Math.hypot(camera.position[0] - camera.lookAt[0], camera.position[2] - camera.lookAt[2]);
    return segment.move === "push" ? distance(end) > distance(start) + 1e-6 : distance(end) < distance(start) - 1e-6;
}

export function directorActorFrameDetails(scene: DirectorScene, actorId: string, frame: number) {
    const sequence = scene.previs ?? mapDirectorSceneToPrevis(scene).sequence;
    const action = sequence.actions.find((item) => item.actorId === actorId && item.startFrame <= frame && frame < item.endFrameExclusive);
    const segment = sequence.segments.find((item) => item.startFrame <= frame && frame < item.endFrameExclusive);
    const legacy = scene.shots.find((shot) => shot.id === segment?.legacyShotId);
    const source = legacy ? directorSceneForShot({ ...scene, ...legacy.stage }, legacy.id) : segment?.initialStage ? { ...scene, ...segment.initialStage } : scene;
    const actor = source.objects.find((object) => object.id === actorId);
    const path = sequence.paths?.find((item) => item.id === action?.pathId);
    const snapshot = evaluatePrevisFrame(scene, sequence, frame).actors[actorId];
    const destination = path?.points.at(-1)?.position ?? actor?.keyframes.toSorted((a, b) => a.time - b.time).at(-1)?.transform.position ?? actor?.motionPath?.points.at(-1) ?? snapshot?.transform.position;
    return { action, destination, yaw: ((snapshot?.transform.rotation[1] ?? 0) * 180) / Math.PI };
}
