import { Euler, Quaternion, Vector3 } from "three";
import type { DirectorCameraMove, DirectorKeyframe, DirectorObject, DirectorScene, DirectorShot, DirectorShotSize, DirectorVec3, PrevisCameraMove, PrevisFraming, PrevisSequence } from "@/types/director";
import { resolveDirectorBoneRotation } from "./director-animation-semantics";
import { evaluatePrevisFrame, type PrevisFrameSnapshot } from "./director-previs-evaluate";
import type { PrevisCameraState } from "./director-camera-intent";
import { resolvePrevisSegmentBoundaries, validatePrevisSequence, type PrevisDiagnostic } from "./director-previs-sequence";
import { sampleDirectorActorPose, sampleDirectorTransform } from "./director-playback";
import { createDirectorCamera } from "./director-scene-data";
import { sampleDirectorLight } from "./director-timeline";

const SHOT_SIZE: Record<PrevisFraming, DirectorShotSize> = { full: "full", half: "medium", face: "close_up", group: "wide", wide: "extreme_wide" };
const CAMERA_MOVE: Record<PrevisCameraMove, DirectorCameraMove> = { fixed: "static", follow: "truck_right", push: "push_in", pull: "pull_out", orbit: "orbit_left", crane: "pedestal_up", path: "static" };

function clipObject(object: DirectorObject, start: number, end: number, prefix: string): DirectorObject {
    const sample = (time: number) => structuredClone(sampleDirectorTransform(object.transform, object.keyframes, time, object.motionPath));
    const boundary = (time: number): DirectorKeyframe => ({
        id: `${prefix}-${object.id}-${time === start ? "start" : "end"}`,
        time: time - start,
        transform: sample(time),
        easing:
            object.keyframes
                .filter((key) => key.time <= time)
                .toSorted((a, b) => a.time - b.time)
                .at(-1)?.easing ?? "linear",
    });
    const keyframes = [boundary(start), ...object.keyframes.filter((key) => start < key.time && key.time < end).map((key) => ({ ...key, time: key.time - start })), boundary(end)];
    // 路线没有 transform 关键帧时，补上转折及延迟边界，避免裁剪后走捷径。
    if (!object.keyframes.length && object.motionPath) {
        const path = object.motionPath;
        let time = path.startDelay;
        for (let index = 0; index < path.points.length; index += 1) {
            if (index > 0) time += Math.hypot(...path.points[index].map((value, axis) => value - path.points[index - 1][axis])) / { slow: 0.6, walk: 1.4, run: 3 }[path.speed];
            if (start < time && time < end) keyframes.push({ id: `${prefix}-${object.id}-path-${index}`, time: time - start, transform: sample(time), easing: "linear" });
        }
        keyframes.sort((a, b) => a.time - b.time);
    }
    return structuredClone({
        ...object,
        transform: sample(start),
        keyframes,
        motionPath: undefined,
        pose: sampleDirectorActorPose(object, start),
        poseKeyframes:
            object.pose || object.poseKeyframes?.length
                ? [
                      { time: 0, pose: sampleDirectorActorPose(object, start) ?? "stand" },
                      ...(object.poseKeyframes ?? []).filter((key) => start < key.time && key.time < end).map((key) => ({ ...key, time: key.time - start })),
                      { time: end - start, pose: sampleDirectorActorPose(object, end) ?? "stand" },
                  ]
                : undefined,
        boneTracks: object.boneTracks?.map((track) => ({
            ...track,
            keyframes: [start, ...track.keyframes.filter((key) => start < key.time && key.time < end).map((key) => key.time), end].map((time, index) => {
                const prior = track.keyframes
                    .filter((key) => key.time <= time)
                    .toSorted((a, b) => a.time - b.time)
                    .at(-1);
                return { id: `${prefix}-${object.id}-${track.bone}-${index}`, time: time - start, rotation: resolveDirectorBoneRotation({ keyframes: track.keyframes, time }) ?? object.boneOverrides?.[track.bone] ?? [0, 0, 0, 1], easing: prior?.easing };
            }),
        })),
    });
}

function compileCameraPose(sampled: PrevisCameraState, target: DirectorVec3): DirectorVec3 {
    if (![...sampled.position, ...sampled.quaternion, ...target].every(Number.isFinite)) throw new Error("摄影机位姿包含无效数值");
    const quaternion = new Quaternion(...sampled.quaternion);
    const direction = new Vector3(0, 0, -1).applyQuaternion(quaternion);
    const ray = new Vector3(...target).sub(new Vector3(...sampled.position));
    const radius = Math.hypot(ray.y, ray.z);
    if (ray.lengthSq() < 1e-12 || Math.abs(direction.y * ray.length()) > radius + 1e-9) throw new Error("无法表示旧摄影机的拍摄方向");
    // v1 先围绕 X、Y 旋转 target-position，再用旋转后的 up 执行 lookAt。
    // 反求该旋转，直接写入 v2 欧拉角会让移动摄影机仍朝向固定的旧焦点。
    const pitch = Math.atan2(ray.y, ray.z) - Math.asin(Math.max(-1, Math.min(1, (direction.y * ray.length()) / Math.max(radius, 1e-12))));
    const rotatedZ = ray.y * Math.sin(pitch) + ray.z * Math.cos(pitch);
    const yaw = Math.atan2(direction.x, direction.z) - Math.atan2(ray.x, rotatedZ);
    const right = new Vector3(1, 0, 0).applyQuaternion(quaternion);
    const up = new Vector3(0, 1, 0).applyQuaternion(quaternion);
    const rotation = new Euler(pitch, yaw, 0, "XYZ");
    const a = new Vector3(-1, 0, 0).applyEuler(rotation);
    const b = new Vector3(0, 1, 0).applyEuler(rotation);
    let roll = Math.atan2(-b.dot(right), a.dot(right));
    if (a.clone().multiplyScalar(Math.sin(roll)).addScaledVector(b, Math.cos(roll)).dot(up) < 0) roll += Math.PI;
    return [pitch, yaw, roll];
}

function findNonFiniteSnapshotObject(snapshot: PrevisFrameSnapshot, cameraId: string): string | undefined {
    const camera = snapshot.camera;
    if (camera && ![...camera.position, ...camera.quaternion, camera.fov].every(Number.isFinite)) return `摄影机「${cameraId}」`;
    for (const [kind, objects] of [
        ["人物", snapshot.actors],
        ["道具", snapshot.props],
    ] as const) {
        for (const [id, { transform }] of Object.entries(objects)) {
            if (![...transform.position, ...transform.rotation, ...transform.scale].every(Number.isFinite)) return `${kind}「${id}」`;
        }
    }
    return undefined;
}

export function compilePrevisToDirectorShots(scene: DirectorScene, sequence: PrevisSequence): { scene: DirectorScene; diagnostics: PrevisDiagnostic[] } {
    const diagnostics: PrevisDiagnostic[] = [];
    const unchanged = () => ({ scene: structuredClone(scene), diagnostics });
    try {
        diagnostics.push(...validatePrevisSequence(sequence, { actorIds: scene.objects.filter((object) => object.kind === "actor").map((object) => object.id) }));
        if (sequence.sceneId !== scene.id) diagnostics.push({ code: "scene_mismatch", message: "序列不属于当前场景", path: "sceneId" });
        if (!sequence.segments.length) diagnostics.push({ code: "empty_sequence", message: "没有可编译的镜头段落", path: "segments" });
        if (diagnostics.length) return unchanged();
        const resolved = structuredClone(resolvePrevisSegmentBoundaries(sequence).sequence);
        const shotIds = new Set<string>();
        const cameraIds = new Set<string>();
        const legacyCameraIds = new Set(resolved.segments.filter((segment) => segment.legacyShotId).map((segment) => scene.shots.find((shot) => shot.id === segment.legacyShotId)?.cameraId));
        resolved.segments.forEach((segment, index) => {
            const legacy = segment.legacyShotId ? scene.shots.find((shot) => shot.id === segment.legacyShotId) : undefined;
            if (segment.legacyShotId && !legacy) diagnostics.push({ code: "unknown_legacy_shot", message: "旧镜头不存在", path: `segments[${index}].legacyShotId` });
            segment.shotId = legacy?.id ?? segment.shotId ?? `previs-${segment.id}`;
            segment.cameraId = legacy?.cameraId ?? segment.cameraId ?? `previs-cam-${segment.id}`;
            if (shotIds.has(segment.shotId)) diagnostics.push({ code: "duplicate_shot_id", message: "多个段落不能覆盖同一个派生镜头", path: `segments[${index}].shotId` });
            if (!legacy && (cameraIds.has(segment.cameraId) || legacyCameraIds.has(segment.cameraId))) diagnostics.push({ code: "duplicate_camera_id", message: "多个段落不能覆盖同一台摄影机的局部轨道", path: `segments[${index}].cameraId` });
            if (legacy && !scene.cameras.some((camera) => camera.id === segment.cameraId)) diagnostics.push({ code: "unknown_camera", message: "旧镜头的摄影机不存在", path: `segments[${index}].cameraId` });
            shotIds.add(segment.shotId);
            cameraIds.add(segment.cameraId);
        });
        if (diagnostics.length) return unchanged();
        const output = structuredClone(scene);
        output.previs = resolved;
        output.shots = [];
        for (const [index, segment] of resolved.segments.entries()) {
            if (segment.legacyShotId) {
                output.shots.push(structuredClone(scene.shots.find((shot) => shot.id === segment.legacyShotId)!));
                continue;
            }
            const start = segment.startFrame / resolved.fps;
            const end = segment.endFrameExclusive / resolved.fps;
            const stageStart = segment.initialStage ? 0 : start;
            const stageEnd = segment.initialStage ? end - start : end;
            const objects = (segment.initialStage?.objects ?? scene.objects).map((object) => clipObject(object, stageStart, stageEnd, segment.id));
            const lights = (segment.initialStage?.lights ?? scene.lights).map((light) => {
                const atStart = sampleDirectorLight(light, stageStart);
                const atEnd = sampleDirectorLight(light, stageEnd);
                return {
                    ...structuredClone(light),
                    transform: structuredClone(atStart.transform),
                    intensity: atStart.intensity,
                    color: atStart.color,
                    keyframes: [
                        {
                            id: `${segment.id}-${light.id}-start`,
                            time: 0,
                            transform: structuredClone(atStart.transform),
                            intensity: atStart.intensity,
                            color: atStart.color,
                            easing: light.keyframes
                                ?.filter((key) => key.time <= stageStart)
                                .toSorted((a, b) => a.time - b.time)
                                .at(-1)?.easing,
                        },
                        ...(light.keyframes ?? []).filter((key) => stageStart < key.time && key.time < stageEnd).map((key) => ({ ...structuredClone(key), time: key.time - stageStart })),
                        { id: `${segment.id}-${light.id}-end`, time: end - start, transform: structuredClone(atEnd.transform), intensity: atEnd.intensity, color: atEnd.color },
                    ],
                };
            });
            // 结束帧属于下一段；相机只采样本段最后一个有效帧。
            const frames = new Set([segment.startFrame, segment.endFrameExclusive - 1]);
            for (let frame = segment.startFrame; frame < segment.endFrameExclusive; frame += 6) frames.add(frame);
            const samples: { frame: number; camera: PrevisCameraState }[] = [];
            for (const frame of [...frames].sort((a, b) => a - b)) {
                const snapshot = evaluatePrevisFrame(scene, resolved, frame);
                const invalidObject = findNonFiniteSnapshotObject(snapshot, segment.cameraId!);
                if (invalidObject) {
                    diagnostics.push({ code: "compile_failed", message: `第 ${index + 1} 段「${segment.id}」第 ${frame} 帧的${invalidObject}出现非有限数值`, path: `segments[${index}]` });
                    return unchanged();
                }
                samples.push({ frame, camera: snapshot.camera! });
            }
            const first = samples[0].camera;
            let target: DirectorVec3 = [...first.lookAt];
            const representable = (point: DirectorVec3) =>
                samples.every(({ camera: sampled }) => {
                    const ray = new Vector3(...point).sub(new Vector3(...sampled.position));
                    const direction = new Vector3(0, 0, -1).applyQuaternion(new Quaternion(...sampled.quaternion));
                    return ray.lengthSq() > 1e-12 && Math.abs(direction.y * ray.length()) <= Math.hypot(ray.y, ray.z);
                });
            if (!representable(target)) {
                const extent = Math.max(1, ...samples.map(({ camera: sampled }) => new Vector3(...sampled.position).distanceTo(new Vector3(...first.position))));
                for (let distance = extent * 2; distance <= extent * 1024 && !representable(target); distance *= 2) target = [first.position[0], first.position[1], first.position[2] - distance];
            }
            const camera = structuredClone(scene.cameras.find((item) => item.id === segment.cameraId) ?? scene.cameras[0] ?? createDirectorCamera());
            camera.id = segment.cameraId!;
            camera.keyframes = samples.map(({ frame, camera: sampled }) => {
                return {
                    id: `${segment.id}-camera-${frame}`,
                    time: (frame - segment.startFrame) / resolved.fps,
                    transform: { position: [...sampled.position], rotation: compileCameraPose(sampled, target), scale: [1, 1, 1] as DirectorVec3 },
                    easing: "linear",
                };
            });
            camera.transform = structuredClone(camera.keyframes[0].transform);
            camera.transform.rotation = [0, 0, 0];
            camera.target = target;
            camera.fov = first.fov;
            camera.focalLength = first.focalLength;
            camera.motionPath = undefined;
            const cameraIndex = output.cameras.findIndex((item) => item.id === camera.id);
            if (cameraIndex < 0) output.cameras.push(camera);
            else output.cameras[cameraIndex] = camera;
            if (samples.some(({ camera: sampled }) => sampled.focalLength !== first.focalLength)) diagnostics.push({ code: "lens_approximated", message: "旧镜头不支持焦距关键帧，使用段首焦距", path: `segments[${index}].cameraId` });
            const existing = scene.shots.find((shot) => shot.id === segment.shotId);
            output.shots.push({
                ...structuredClone(existing),
                id: segment.shotId!,
                name: existing?.name ?? `预演镜头 ${index + 1}`,
                cameraId: camera.id,
                duration: (segment.endFrameExclusive - segment.startFrame) / resolved.fps,
                fps: resolved.fps,
                aspectRatio: resolved.aspect,
                shotSize: SHOT_SIZE[segment.framing],
                cameraMove: CAMERA_MOVE[segment.move],
                prompt: existing?.prompt ?? "",
                stage: { objects, lights },
                actorStates: Object.fromEntries(
                    objects
                        .filter((object) => object.kind === "actor")
                        .map(({ id, transform, keyframes, motionPath, pose, poseKeyframes, visible, heldProp, boneOverrides, boneTracks }) => [id, { transform, keyframes, motionPath, pose, poseKeyframes, visible, heldProp, boneOverrides, boneTracks }]),
                ),
            } satisfies DirectorShot);
        }
        if (!output.shots.some((shot) => shot.id === output.activeShotId)) output.activeShotId = output.shots[0].id;
        return { scene: output, diagnostics };
    } catch {
        diagnostics.push({ code: "compile_failed", message: "预演序列无法编译，原场景已保留", path: "previs" });
        return unchanged();
    }
}
