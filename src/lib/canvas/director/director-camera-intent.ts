import { Matrix4, Quaternion, Vector3 } from "three";
import type { DirectorQuat, DirectorScene, DirectorTransform, DirectorVec3, PrevisCameraSegment, PrevisFraming, PrevisSequence } from "@/types/director";
import { solvePrevisFraming } from "./director-previs-framing";
import { resolvePrevisSegmentBoundaries } from "./director-previs-sequence";
import { directorFocalLengthToFov } from "./director-scene-data";
import { buildPathArcTable, samplePathAtProgress } from "./director-previs-path";

type ActorStates = Record<string, { transform: DirectorTransform }>;
type CameraTarget = { point: Vector3; yaw: number; distance: number; cameraHeight: number };
export type PrevisCameraState = {
    position: DirectorVec3;
    quaternion: DirectorQuat;
    fov: number;
    focalLength: number;
    aspect: number;
    lookAt: DirectorVec3;
    segmentId: string;
};

function resolveCameraTarget(segment: PrevisCameraSegment, actors: ActorStates, fov: number, aspect: number, framing = segment.framing, viewDirection?: DirectorVec3): CameraTarget {
    const targets = segment.targetIds.map((id) => actors[id]?.transform).filter((transform) => transform !== undefined);
    // 只读人物 yaw，不用相邻帧位置差推速度方向；人物停下后朝向自然保持，不会翻转。
    const yaw = targets[0]?.rotation[1] ?? 0;
    const solved = solvePrevisFraming({
        framing,
        targets: targets.map((transform) => ({ position: transform.position, height: 1.75 * Math.abs(transform.scale[1]) })),
        viewDirection: viewDirection ?? cameraSideDirection(segment, yaw).negate().toArray(),
        fovDeg: fov,
        aspect,
    });
    const point = new Vector3(...solved.lookAt);
    if (!targets.length && segment.targetPoint) point.set(...segment.targetPoint);
    if (segment.targetAnchor && targets.length) {
        const height = { head: 1.62, chest: 1.35, hips: 0.95, feet: 0 }[segment.targetAnchor];
        point.set(0, 0, 0);
        for (const transform of targets) point.add(new Vector3(transform.position[0], transform.position[1] + height * transform.scale[1], transform.position[2]));
        if (targets.length) point.divideScalar(targets.length);
    }
    return { point, yaw, distance: framing === segment.framing ? (segment.params?.distance ?? solved.distance) : solved.distance, cameraHeight: solved.cameraHeight };
}

function cameraSideDirection(segment: PrevisCameraSegment, yaw: number): Vector3 {
    const angle = yaw + { front: 0, back: Math.PI, left: -Math.PI / 2, right: Math.PI / 2 }[segment.side ?? "front"];
    return new Vector3(Math.sin(angle), 0, Math.cos(angle));
}

function cameraQuaternion(position: Vector3, target: Vector3): Quaternion {
    return new Quaternion().setFromRotationMatrix(new Matrix4().lookAt(position, target, new Vector3(0, 1, 0)));
}

function verticalFov(focalLength: number, aspect: number): number {
    const horizontalFov = directorFocalLengthToFov(focalLength);
    return (2 * Math.atan(Math.tan((horizontalFov * Math.PI) / 360) / aspect) * 180) / Math.PI;
}

function evaluateIntentPosition(segment: PrevisCameraSegment, progress: number, start: CameraTarget, current: CameraTarget, from: CameraTarget, inherited?: PrevisCameraState): Vector3 {
    const direction = cameraSideDirection(segment, start.yaw);
    const startPosition = inherited ? new Vector3(...inherited.position) : from.point.clone().addScaledVector(direction, from.distance).setY(from.cameraHeight);
    switch (segment.move) {
        case "fixed":
        case "path":
            return startPosition;
        case "follow": {
            if (!inherited) return current.point.clone().addScaledVector(cameraSideDirection(segment, current.yaw), current.distance).setY(current.cameraHeight);
            const offset = startPosition
                .clone()
                .sub(start.point)
                .setY(0)
                .applyAxisAngle(new Vector3(0, 1, 0), current.yaw - start.yaw);
            return current.point.clone().add(offset).setY(startPosition.y);
        }
        case "push":
        case "pull": {
            const outward = startPosition.clone().sub(current.point).setY(0).normalize();
            if (outward.lengthSq() === 0) outward.copy(direction);
            const endPosition = current.point.clone().addScaledVector(outward, current.distance).setY(current.cameraHeight);
            return startPosition.lerp(endPosition, progress);
        }
        case "orbit": {
            const angle = (((segment.params?.orbitDegrees ?? 90) * Math.PI) / 180) * progress * (segment.params?.orbitDirection === "right" ? 1 : -1);
            const offset = startPosition
                .clone()
                .sub(start.point)
                .setY(0)
                .applyAxisAngle(new Vector3(0, 1, 0), angle);
            return start.point.clone().add(offset).setY(startPosition.y);
        }
        case "crane": {
            const from = inherited ? startPosition.y : (segment.params?.heightFrom ?? 1.55);
            return startPosition.setY(from + ((segment.params?.heightTo ?? 2.4) - from) * progress);
        }
    }
}

export function evaluatePrevisCamera(scene: DirectorScene, sequence: PrevisSequence, frame: number, actors: ActorStates, sampleActorsAtFrame: (frame: number) => ActorStates): PrevisCameraState | null {
    const { segments } = resolvePrevisSegmentBoundaries(sequence).sequence;
    const index = segments.findIndex((segment) => segment.startFrame <= frame && frame < segment.endFrameExclusive);
    if (index < 0) return null;
    const aspect = { "16:9": 16 / 9, "9:16": 9 / 16, "2.39:1": 2.39 }[sequence.aspect];
    const actorsAt = (atFrame: number) => (atFrame === frame ? actors : sampleActorsAtFrame(atFrame));
    const evaluateSegment = (segmentIndex: number, atFrame: number): PrevisCameraState => {
        const segment = segments[segmentIndex];
        const camera = scene.cameras.find((item) => item.id === segment.cameraId) ?? scene.cameras[0];
        const progress = Math.max(0, Math.min(1, (atFrame - segment.startFrame) / Math.max(1, segment.endFrameExclusive - segment.startFrame - 1)));
        if (segment.move === "path") {
            const path = sequence.paths?.find((item) => item.id === segment.pathId && item.ownerId === segment.id);
            const sample = path && samplePathAtProgress(buildPathArcTable(path, true), progress);
            if (!sample) throw new Error("摄影机路线不可求值");
            const focalLength = segment.cameraStart?.focalLength ?? camera?.focalLength ?? 35;
            const fov = segment.cameraStart?.fov ?? verticalFov(focalLength, aspect);
            const target = resolveCameraTarget(segment, actorsAt(atFrame), fov, aspect);
            const position = new Vector3(...sample.position);
            // 烘焙路径已包含入段运动；再次继承上一段会让人物变化重新带动机位。
            return { position: sample.position, quaternion: cameraQuaternion(position, target.point).toArray(), fov, focalLength, aspect, lookAt: target.point.toArray(), segmentId: segment.id };
        }
        const previous = segments[segmentIndex - 1];
        // 排他结束帧只用于求继承位姿，不夹回上一段最后一帧，避免边界重复运动帧。
        const inherited = previous && segment.transitionIn === "continuous" ? evaluateSegment(segmentIndex - 1, previous.endFrameExclusive) : undefined;
        const transitionFrames = segment.transitionFrames ?? 0;
        if (segment.cameraStart && segment.move === "fixed") {
            const seed = segment.cameraStart;
            const blend = inherited ? (transitionFrames > 0 ? Math.max(0, Math.min(1, (atFrame - segment.startFrame) / transitionFrames)) : progress) : 1;
            return {
                ...seed,
                aspect,
                segmentId: segment.id,
                position: inherited ? new Vector3(...inherited.position).lerp(new Vector3(...seed.position), blend).toArray() : [...seed.position],
                quaternion: inherited ? new Quaternion(...inherited.quaternion).slerp(new Quaternion(...seed.quaternion), blend).toArray() : [...seed.quaternion],
                fov: inherited ? inherited.fov + (seed.fov - inherited.fov) * blend : seed.fov,
                focalLength: inherited ? inherited.focalLength + (seed.focalLength - inherited.focalLength) * blend : seed.focalLength,
            };
        }
        const inheritStart = transitionFrames === 0 ? inherited : undefined;
        const dolly = segment.move === "push" || segment.move === "pull";
        let focalLength = (dolly ? inherited : inheritStart)?.focalLength ?? camera?.focalLength ?? 35;
        const fov = verticalFov(focalLength, aspect);
        const startActors = actorsAt(segment.startFrame);
        const start = resolveCameraTarget(segment, startActors, fov, aspect);
        let current = resolveCameraTarget(segment, actorsAt(atFrame), fov, aspect);
        if (dolly && inheritStart) {
            const view = current.point
                .clone()
                .sub(new Vector3(...inheritStart.position))
                .setY(0)
                .normalize();
            current = resolveCameraTarget(segment, actorsAt(atFrame), fov, aspect, segment.framing, view.toArray());
        }
        const framings: PrevisFraming[] = ["wide", "full", "half", "face"];
        const framingIndex = framings.indexOf(segment.framing === "group" ? "full" : segment.framing);
        const fromFraming = framings[Math.max(0, Math.min(framings.length - 1, framingIndex + (segment.move === "push" ? -1 : 1)))];
        const from = dolly && !inheritStart ? resolveCameraTarget(segment, startActors, fov, aspect, fromFraming) : start;
        const position = evaluateIntentPosition(segment, progress, start, current, from, inheritStart);
        const lookAt = dolly && !inheritStart ? from.point.clone().lerp(current.point, progress) : current.point;
        const quaternion = cameraQuaternion(position, lookAt);
        if (inherited) {
            // 未指定转向时长时，在本段内转向新目标；有显式时长则只占本段前面的帧。
            const blend = transitionFrames > 0 ? Math.max(0, Math.min(1, (atFrame - segment.startFrame) / transitionFrames)) : progress;
            quaternion.copy(new Quaternion(...inherited.quaternion).slerp(quaternion, blend));
            // 过渡结束后直接保留本段结果，避免端点插值的舍入误差。
            if (transitionFrames > 0 && blend < 1) {
                position.lerpVectors(new Vector3(...inherited.position), position.clone(), blend);
                if (!dolly) focalLength = inherited.focalLength + (focalLength - inherited.focalLength) * blend;
            }
        }
        return {
            position: position.toArray(),
            quaternion: quaternion.toArray(),
            fov: verticalFov(focalLength, aspect),
            focalLength,
            aspect,
            lookAt: lookAt.toArray(),
            segmentId: segment.id,
        };
    };
    return evaluateSegment(index, frame);
}
