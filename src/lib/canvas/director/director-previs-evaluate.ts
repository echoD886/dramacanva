import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import type { DirectorCamera, DirectorPose, DirectorScene, DirectorTransform, PrevisSequence } from "@/types/director";
import { resolveDirectorBoneRotation } from "./director-animation-semantics";
import { evaluatePrevisCamera, type PrevisCameraState } from "./director-camera-intent";
import { sampleDirectorActorPose, sampleDirectorCamera, sampleDirectorTransform } from "./director-playback";
import { resolveDirectorAspectRatio } from "./director-scene-data";
import { directorSceneForShot } from "./director-storyboard";
import { resolveDirectorViewFraming } from "./director-view-modes";
import { clampPrevisFrame, findPrevisSegmentAtFrame, frameToTime, getPrevisTotalFrames } from "./director-previs-sequence";
import { mapDirectorSceneToPrevis } from "./director-previs-legacy";
import { sampleDirectorLight } from "./director-timeline";
import { samplePrevisActorPaths } from "./director-previs-path";
import { samplePrevisMotion } from "./director-previs-motion-clips";

export type PrevisObjectState = { transform: DirectorTransform; pose?: DirectorPose; visible: boolean };
export type PrevisLightState = { transform: DirectorTransform; intensity: number; color: string };
export type PrevisFrameSnapshot = {
    frameIndex: number;
    time: number;
    animationTime: number;
    segmentId: string | null;
    actors: Record<string, PrevisObjectState>;
    props: Record<string, PrevisObjectState>;
    lights: Record<string, PrevisLightState>;
    camera: PrevisCameraState | null;
};

function samplePrevisObjects(scene: DirectorScene, time: number, sequence: PrevisSequence, frame: number) {
    const actors: Record<string, PrevisObjectState> = {};
    const props: Record<string, PrevisObjectState> = {};
    for (const object of scene.objects) {
        const states = object.kind === "actor" ? actors : props;
        states[object.id] = {
            transform: structuredClone(sampleDirectorTransform(object.transform, object.keyframes, time, object.motionPath)),
            pose: sampleDirectorActorPose(object, time),
            visible: object.visible,
        };
    }
    const sampledActors = samplePrevisActorPaths(actors, sequence, frame);
    for (const object of scene.objects.filter((item) => sequence.actions.some((action) => action.actorId === item.id && action.kind === "turn" && action.lookAtId))) {
        const motion = samplePrevisMotion({ object, sequence, frame, fps: sequence.fps, time, objects: scene.objects });
        if (motion.yaw !== undefined && sampledActors[object.id]) sampledActors[object.id].transform.rotation[1] = motion.yaw;
    }
    return { actors: sampledActors, props };
}

function previsFrameContext(scene: DirectorScene, sequence: PrevisSequence, frameIndex: number) {
    const frame = clampPrevisFrame(sequence, frameIndex);
    const time = frameToTime(frame, sequence.fps);
    const segment = findPrevisSegmentAtFrame(sequence, frame);
    const legacyShot = segment?.legacyShotId ? scene.shots.find((shot) => shot.id === segment.legacyShotId) : undefined;
    const sampledScene = legacyShot ? directorSceneForShot({ ...scene, ...legacyShot.stage }, legacyShot.id) : segment?.initialStage ? { ...scene, ...segment.initialStage } : scene;
    const sampleTime = (legacyShot || segment?.initialStage) && segment ? frameToTime(frame - segment.startFrame, sequence.fps) : time;
    return { frame, time, segment, legacyShot, sampledScene, sampleTime };
}

/** 渲染用片段状态单独传递，不改变 P6 的冻结场景与逐帧快照合同。 */
export function evaluatePrevisFrameMotions(scene: DirectorScene, sequence: PrevisSequence, frameIndex: number) {
    const { frame, sampledScene, sampleTime } = previsFrameContext(scene, sequence, frameIndex);
    return Object.fromEntries(
        sampledScene.objects.filter((object) => object.kind === "actor" || object.primitive === "character").map((object) => [object.id, samplePrevisMotion({ object, sequence, frame, fps: sequence.fps, time: sampleTime, objects: sampledScene.objects })]),
    );
}

export function evaluatePrevisFrame(scene: DirectorScene, sequence: PrevisSequence, frameIndex: number): PrevisFrameSnapshot {
    const { frame, time, segment, legacyShot, sampledScene, sampleTime } = previsFrameContext(scene, sequence, frameIndex);
    const { actors, props } = samplePrevisObjects(sampledScene, sampleTime, sequence, frame);
    const lights = Object.fromEntries(
        sampledScene.lights.map((light) => {
            const sampled = sampleDirectorLight(light, sampleTime);
            return [light.id, { transform: structuredClone(sampled.transform), intensity: sampled.intensity, color: sampled.color }];
        }),
    );
    let camera: PrevisCameraState | null;
    if (segment?.legacyShotId) {
        const source = scene.cameras.find((item) => item.id === (segment.cameraId ?? legacyShot?.cameraId));
        const framing = source ? resolveDirectorViewFraming({ scene: sampledScene, cameraId: source.id, mode: "camera", playhead: sampleTime }) : null;
        if (legacyShot && source && framing) {
            const sampled = sampleDirectorCamera(source, sampleTime);
            const position = new Vector3(...framing.position);
            const target = new Vector3(...framing.target);
            const up = new Vector3(...framing.up);
            camera = {
                position: position.toArray(),
                quaternion: new Quaternion().setFromRotationMatrix(new Matrix4().lookAt(position, target, up)).toArray(),
                fov: sampled.fov,
                focalLength: sampled.focalLength,
                aspect: resolveDirectorAspectRatio(legacyShot.aspectRatio),
                lookAt: [...sampled.target],
                segmentId: segment.id,
            };
        } else camera = null;
    } else {
        camera = evaluatePrevisCamera(scene, sequence, frame, actors, (atFrame) => samplePrevisObjects(sampledScene, frameToTime(segment?.initialStage ? atFrame - segment.startFrame : atFrame, sequence.fps), sequence, atFrame).actors);
    }
    return { frameIndex: frame, time, animationTime: sampleTime, segmentId: segment?.id ?? null, actors, props, lights, camera };
}

export function buildFrozenSceneFromSnapshot(scene: DirectorScene, snapshot: PrevisFrameSnapshot): DirectorScene {
    const sequence = scene.previs ?? mapDirectorSceneToPrevis(scene).sequence;
    const segment = findPrevisSegmentAtFrame(sequence, snapshot.frameIndex);
    const legacyShot = segment?.legacyShotId ? scene.shots.find((shot) => shot.id === segment.legacyShotId) : undefined;
    const source = legacyShot ? directorSceneForShot({ ...scene, ...legacyShot.stage }, legacyShot.id) : segment?.initialStage ? { ...scene, ...segment.initialStage } : scene;
    const objects = source.objects.flatMap((object) => {
        const state = snapshot.actors[object.id] ?? snapshot.props[object.id];
        if (!state) return [];
        const boneOverrides = { ...object.boneOverrides };
        for (const track of object.boneTracks ?? []) {
            const rotation = resolveDirectorBoneRotation({ keyframes: track.keyframes, time: snapshot.animationTime });
            if (rotation) boneOverrides[track.bone] = rotation;
        }
        return [{ ...object, ...state, keyframes: [], poseKeyframes: undefined, motionPath: undefined, boneTracks: undefined, boneOverrides }];
    });
    const cameraId = "previs-snapshot-camera";
    const shotId = "previs-snapshot-shot";
    const camera = snapshot.camera;
    // v1 静态摄影机的 target 决定视线，rotation 只决定 up；两者都由快照四元数还原。
    const quaternion = camera ? new Quaternion(...camera.quaternion) : new Quaternion();
    const position = camera ? new Vector3(...camera.position) : new Vector3();
    const rotation = new Euler().setFromQuaternion(quaternion);
    const sourceCamera = source.cameras.find((item) => item.id === (segment?.cameraId ?? legacyShot?.cameraId)) ?? source.cameras.at(0);
    const frozenCamera: DirectorCamera | null = camera
        ? {
              aperture: sourceCamera?.aperture ?? 2.8,
              focusDistance: sourceCamera?.focusDistance ?? position.distanceTo(new Vector3(...camera.lookAt)),
              near: sourceCamera?.near ?? 0.05,
              far: sourceCamera?.far ?? 500,
              id: cameraId,
              name: cameraId,
              transform: { position: [...camera.position], rotation: [rotation.x, rotation.y, rotation.z], scale: [1, 1, 1] },
              target: position
                  .clone()
                  .add(new Vector3(0, 0, -1).applyQuaternion(quaternion))
                  .toArray(),
              focalLength: camera.focalLength,
              fov: camera.fov,
              keyframes: [],
              motionPath: undefined,
          }
        : null;
    return structuredClone({
        ...scene,
        previs: undefined,
        objects,
        lights: source.lights.flatMap((light) => (snapshot.lights[light.id] ? [{ ...light, ...snapshot.lights[light.id], keyframes: [] }] : [])),
        cameras: frozenCamera ? [frozenCamera] : [],
        shots: [{ id: shotId, name: legacyShot?.name ?? scene.title, cameraId, duration: getPrevisTotalFrames(sequence) / sequence.fps, fps: sequence.fps, aspectRatio: sequence.aspect, shotSize: "full", cameraMove: "static", prompt: "" }],
        activeShotId: shotId,
    });
}
