import { Box3, Euler, Matrix4, Quaternion, Ray, Vector3 } from "three";
import type { DirectorObject, DirectorScene, DirectorVec3, PrevisCameraSegment, PrevisPathSpec, PrevisSequence } from "@/types/director";
import { getDirectorAsset } from "./director-asset-registry";
import { evaluatePrevisFrame } from "./director-previs-evaluate";
import { buildPathArcTable } from "./director-previs-path";
import { compileDirectorRouteChange } from "./director-route-editing";
import { directorSceneForShot } from "./director-storyboard";
import { directorWorkbenchSequence } from "./director-workbench-layout";

export type DirectorCameraPathIssue = { kind: "collision" | "occlusion"; obstacleId: string; pointId?: string; position: DirectorVec3 };
export type DirectorCameraPathDrag = "horizontal" | "height";

function sampleCameraPath(scene: DirectorScene, sequence: PrevisSequence, segment: PrevisCameraSegment): PrevisPathSpec {
    let id = `${segment.id}-camera-path`;
    while (sequence.paths?.some((path) => path.id === id)) id += "-next";
    const frames = new Set([segment.startFrame, segment.endFrameExclusive - 1]);
    for (let frame = segment.startFrame; frame < segment.endFrameExclusive; frame += 12) frames.add(frame);
    const points = [...frames]
        .sort((a, b) => a - b)
        .map((frame) => {
            const camera = evaluatePrevisFrame(scene, sequence, frame).camera;
            if (!camera) throw new Error("当前段落没有可用的摄影机");
            return { id: `${id}-${frame}`, position: [...camera.position] as DirectorVec3 };
        });
    // 单帧段仍需两点，静止段的重复点保留为可独立编辑的控制点。
    if (points.length === 1) points.push({ ...points[0], id: `${id}-end`, position: [...points[0].position] });
    return { id, ownerId: segment.id, space: "world", interpolation: "smooth", timingPolicy: "keepDuration", points };
}

export function setDirectorCameraPath(scene: DirectorScene, segmentId: string, path: PrevisPathSpec): DirectorScene {
    const sequence = directorWorkbenchSequence(scene);
    const segment = sequence.segments.find((item) => item.id === segmentId);
    if (!segment || segment.move !== "path" || path.ownerId !== segment.id || path.space !== "world") return scene;
    if (sequence.paths?.some((item) => item.id === path.id && item.ownerId !== segment.id)) return scene;
    if (scene.previs?.paths?.find((item) => item.id === path.id) === path && segment.pathId === path.id) return scene;
    return { ...scene, previs: { ...sequence, paths: [...(sequence.paths ?? []).filter((item) => item.id !== path.id), path], segments: sequence.segments.map((item) => (item.id === segment.id ? { ...item, pathId: path.id } : item)) } };
}

export function bakeDirectorCameraPath(scene: DirectorScene, segmentId: string): DirectorScene {
    const sequence = directorWorkbenchSequence(scene);
    const segment = sequence.segments.find((item) => item.id === segmentId);
    if (!segment || segment.move === "path") return scene;
    const path = sampleCameraPath(scene, sequence, segment);
    const camera = evaluatePrevisFrame(scene, sequence, segment.startFrame).camera!;
    const legacy = scene.shots.find((shot) => shot.id === segment.legacyShotId);
    const source = legacy ? directorSceneForShot({ ...scene, ...legacy.stage }, legacy.id) : undefined;
    const next: PrevisCameraSegment = {
        ...segment,
        move: "path",
        pathId: path.id,
        cameraStart: { position: camera.position, quaternion: camera.quaternion, focalLength: camera.focalLength, fov: camera.fov, lookAt: camera.lookAt },
        targetPoint: segment.targetPoint ?? camera.lookAt,
        initialStage: source ? structuredClone({ objects: source.objects, lights: source.lights }) : segment.initialStage,
    };
    if (legacy) {
        delete next.legacyShotId;
        next.cameraId = `previs-path-cam-${segment.id}`;
        while (scene.cameras.some((item) => item.id === next.cameraId)) next.cameraId += "-next";
    }
    return compileDirectorRouteChange({ ...scene, previs: { ...sequence, paths: [...(sequence.paths ?? []), path], segments: sequence.segments.map((item) => (item.id === segment.id ? next : item)) } });
}

export function moveDirectorCameraPathPoint(path: PrevisPathSpec, pointId: string, position: DirectorVec3, mode: DirectorCameraPathDrag): PrevisPathSpec {
    const point = path.points.find((item) => item.id === pointId);
    if (!point || !position.every(Number.isFinite)) return path;
    const next: DirectorVec3 = mode === "height" ? [point.position[0], Math.max(0, position[1]), point.position[2]] : [position[0], point.position[1], position[2]];
    if (point.position.every((value, axis) => value === next[axis])) return path;
    return { ...path, points: path.points.map((item) => (item.id === pointId ? { ...item, position: next } : item)) };
}

function cameraObstacles(objects: DirectorObject[]) {
    return objects.flatMap((object) => {
        if (!object.visible || object.kind === "actor") return [];
        const asset = getDirectorAsset(object.stageProp ?? object.id);
        const wall = object.primitive === "box" && !object.stageProp && Math.min(Math.abs(object.transform.scale[0]), Math.abs(object.transform.scale[2])) < Math.abs(object.transform.scale[1]) * 0.25;
        if (object.stageProp !== "platform-column" && asset?.id !== "platform-background-wall" && !wall) return [];
        // 模板墙是按资产尺寸缩放的单位盒；柱件几何已是米制尺寸。
        const min = object.stageProp && asset ? asset.localBounds.min : [-0.5, -0.5, -0.5];
        const max = object.stageProp && asset ? asset.localBounds.max : [0.5, 0.5, 0.5];
        const matrix = new Matrix4().compose(new Vector3(...object.transform.position), new Quaternion().setFromEuler(new Euler(...object.transform.rotation)), new Vector3(...object.transform.scale));
        return [{ id: object.id, inverse: matrix.invert(), bounds: new Box3(new Vector3(...min), new Vector3(...max)) }];
    });
}

export function directorCameraPathIssues(path: PrevisPathSpec, objects: DirectorObject[], camera?: { position: DirectorVec3; lookAt: DirectorVec3 }): DirectorCameraPathIssue[] {
    const obstacles = cameraObstacles(objects);
    const issues: DirectorCameraPathIssue[] = [];
    const samples = [...path.points, ...buildPathArcTable(path, true).samples.map((sample) => ({ id: undefined, position: sample.position }))];
    for (const obstacle of obstacles) {
        for (const point of samples) {
            if (obstacle.bounds.containsPoint(new Vector3(...point.position).applyMatrix4(obstacle.inverse))) issues.push({ kind: "collision", obstacleId: obstacle.id, pointId: point.id, position: point.position });
        }
        if (camera) {
            const start = new Vector3(...camera.position).applyMatrix4(obstacle.inverse);
            const end = new Vector3(...camera.lookAt).applyMatrix4(obstacle.inverse);
            const ray = new Ray(start, end.clone().sub(start).normalize());
            const hit = ray.intersectBox(obstacle.bounds, new Vector3());
            if (hit && start.distanceTo(hit) < start.distanceTo(end) - 1e-6) issues.push({ kind: "occlusion", obstacleId: obstacle.id, position: camera.position });
        }
    }
    return issues;
}

export function resolveDirectorCameraPath(scene: DirectorScene, segmentId: string | null, frame: number) {
    const sequence = directorWorkbenchSequence(scene);
    const segment = sequence.segments.find((item) => item.id === segmentId);
    if (!segment) return null;
    const existing = segment.move === "path" ? sequence.paths?.find((item) => item.id === segment.pathId && item.ownerId === segment.id && item.space === "world") : undefined;
    if (segment.move === "path" && !existing) return null;
    const path = existing ?? sampleCameraPath(scene, sequence, segment);
    const camera = evaluatePrevisFrame(scene, sequence, Math.max(segment.startFrame, Math.min(segment.endFrameExclusive - 1, frame))).camera;
    const legacy = scene.shots.find((shot) => shot.id === segment.legacyShotId);
    const objects = legacy?.stage?.objects ?? segment.initialStage?.objects ?? scene.objects;
    return { segment, path, camera, issues: directorCameraPathIssues(path, objects, camera ?? undefined) };
}
