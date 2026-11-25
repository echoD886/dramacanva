import { Euler, Quaternion } from "three";

import type { DirectorCamera, DirectorKeyframe, DirectorTransform, DirectorVec3, DirectorMotionPath, DirectorObject } from "@/types/director";

export function sampleDirectorActorPose(object: DirectorObject, time: number) {
    const pose = object.poseKeyframes?.toSorted((a, b) => a.time - b.time).findLast((frame) => frame.time <= time)?.pose || object.pose;
    return (pose === "walk" || pose === "run") && (object.keyframes.length > 1 || object.motionPath) && !directorActorIsMoving(object.transform, object.keyframes, time, object.motionPath) ? "stand" : pose;
}

export function sampleDirectorSeatedWeight(object: DirectorObject, time: number) {
    const frames = object.poseKeyframes?.toSorted((a, b) => a.time - b.time);
    if (!frames?.length) return object.pose === "sit" || object.pose === "squat" ? 1 : 0;
    const before = frames.findLast((frame) => frame.time <= time) || frames[0],
        after = frames.find((frame) => frame.time > time) || before;
    const a = before.pose === "sit" ? 1 : 0,
        b = after.pose === "sit" ? 1 : 0;
    const p = before === after ? 0 : Math.max(0, Math.min(1, (time - before.time) / (after.time - before.time)));
    return a + (b - a) * p * p * (3 - 2 * p);
}

/** The plan, camera model and rendered shot share both position and lens direction. */
export function sampleDirectorCamera(camera: DirectorCamera, time: number): DirectorCamera {
    const transform = sampleDirectorTransform(camera.transform, camera.keyframes, time, camera.motionPath);
    const pitch = transform.rotation[0] - camera.transform.rotation[0],
        yaw = transform.rotation[1] - camera.transform.rotation[1];
    const targetFrames = (camera.keyframes ?? []).flatMap((key) => (key.target ? [{ ...key, transform: { ...key.transform, position: key.target } }] : []));
    const target = targetFrames.length ? sampleDirectorTransform(camera.transform, targetFrames, time).position : camera.target;
    const [x, y, z] = target.map((value, axis) => value - transform.position[axis]);
    const py = y * Math.cos(pitch) - z * Math.sin(pitch),
        pz = y * Math.sin(pitch) + z * Math.cos(pitch);
    const direction = [x * Math.cos(yaw) + pz * Math.sin(yaw), py, -x * Math.sin(yaw) + pz * Math.cos(yaw)];
    return { ...camera, transform, target: direction.map((value, axis) => value + transform.position[axis]) as DirectorVec3 };
}

export function directorActorIsMoving(base: DirectorTransform, frames: DirectorKeyframe[], time: number, path?: DirectorMotionPath) {
    const a = sampleDirectorTransform(base, frames, time, path).position;
    const b = sampleDirectorTransform(base, frames, time + 0.02, path).position;
    return a.some((value, axis) => Math.abs(value - b[axis]) > 0.0001);
}

/** Lightweight plan-view sampling; never import the WebGL runtime into canvas cards. */
export function sampleDirectorTransform(base: DirectorTransform, frames: DirectorKeyframe[], time: number, path?: DirectorMotionPath): DirectorTransform {
    const sorted = (frames || []).filter((frame) => Number.isFinite(frame.time)).toSorted((a, b) => a.time - b.time);
    if (!sorted.length) {
        if (!path || path.points.length < 2) return base;
        let distance = Math.max(0, time - path.startDelay) * { slow: 0.6, walk: 1.4, run: 3 }[path.speed];
        for (let i = 1; i < path.points.length; i++) {
            const a = path.points[i - 1],
                b = path.points[i];
            const length = Math.hypot(...b.map((v, axis) => v - a[axis]));
            if (distance <= length || i === path.points.length - 1) {
                const p = Math.min(1, distance / Math.max(length, 0.0001));
                return { ...base, position: a.map((v, axis) => v + (b[axis] - v) * p) as DirectorVec3, rotation: path.orientToPath ? [base.rotation[0], Math.atan2(b[0] - a[0], b[2] - a[2]), base.rotation[2]] : base.rotation };
            }
            distance -= length;
        }
        return base;
    }
    const before = sorted.findLast((frame) => frame.time <= time) || sorted[0];
    const after = sorted.find((frame) => frame.time >= time) || sorted[sorted.length - 1];
    if (before === after) return before.transform;
    let p = Math.max(0, Math.min(1, (time - before.time) / Math.max(0.001, after.time - before.time)));
    if (before.easing === "step") p = 0;
    else if (before.easing === "smooth") p = p * p * (3 - 2 * p);
    const lerp = (a: DirectorVec3, b: DirectorVec3) => a.map((v, i) => v + (b[i] - v) * p) as DirectorVec3;
    return {
        position: lerp(before.transform.position, after.transform.position),
        scale: lerp(before.transform.scale, after.transform.scale),
        rotation: interpolateRotation(before.transform.rotation, after.transform.rotation, p),
    };
}

// XYZ 分解在接近 ±90° 俯仰和 180° 偏航时会出现两组等价解。
// 选取靠近逐分量最短角差插值参考值的一组，让纯偏航保持 (0, yaw, 0) 且逐帧连续。
function interpolateRotation(from: DirectorVec3, to: DirectorVec3, progress: number): DirectorVec3 {
    const rotation = new Quaternion().setFromEuler(new Euler(...from, "XYZ")).slerp(new Quaternion().setFromEuler(new Euler(...to, "XYZ")), progress);
    const reference = from.map((angle, axis) => angle + normalizeAngle(to[axis] - angle) * progress);
    const euler = new Euler().setFromQuaternion(rotation, "XYZ");
    const primary = [euler.x, euler.y, euler.z].map(normalizeAngle) as DirectorVec3;
    const alternate = [euler.x + Math.PI, Math.PI - euler.y, euler.z + Math.PI].map(normalizeAngle) as DirectorVec3;
    const distance = (candidate: DirectorVec3) => candidate.reduce((sum, angle, axis) => sum + normalizeAngle(angle - reference[axis]) ** 2, 0);
    return distance(alternate) < distance(primary) ? alternate : primary;
}

function normalizeAngle(angle: number): number {
    const wrapped = angle % (2 * Math.PI);
    return wrapped <= -Math.PI ? wrapped + 2 * Math.PI : wrapped > Math.PI ? wrapped - 2 * Math.PI : wrapped;
}
