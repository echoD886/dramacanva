import { Matrix4, PerspectiveCamera, Quaternion, Vector3 } from "three";
import type { DirectorScene, DirectorVec3 } from "@/types/director";
import { sampleDirectorCamera } from "./director-playback";
import { evaluatePrevisFrame } from "./director-previs-evaluate";
import { resolvePrevisSegmentBoundaries, timeToFrame } from "./director-previs-sequence";
import { resolveDirectorAspectRatio } from "./director-scene-data";
import { resolveDirectorViewFraming } from "./director-view-modes";

export type ShotCameraState = {
    source: "previs" | "legacy" | "legacy-fallback";
    position: DirectorVec3;
    quaternion: [number, number, number, number];
    fov: number;
    focalLength: number;
    aspect: number;
    near: number;
    far: number;
};

export function resolveShotCameraState(scene: DirectorScene, shotId: string, localTime: number): ShotCameraState {
    const time = Number.isFinite(localTime) ? localTime : 0;
    const shot = scene.shots.find((item) => item.id === shotId);
    if (scene.previs) {
        const sequence = resolvePrevisSegmentBoundaries(scene.previs).sequence;
        const segment = sequence.segments.find((item) => item.shotId === shotId || item.legacyShotId === shotId);
        if (segment) {
            const frame = Math.min(segment.endFrameExclusive - 1, segment.startFrame + timeToFrame(time, sequence.fps));
            const camera = evaluatePrevisFrame(scene, sequence, frame).camera;
            if (!camera) throw new Error("预演段落没有可用的拍摄相机");
            const cameraId = segment.cameraId ?? scene.shots.find((item) => item.id === segment.legacyShotId)?.cameraId;
            const source = scene.cameras.find((item) => item.id === cameraId) ?? scene.cameras[0];
            return { source: "previs", position: [...camera.position], quaternion: [...camera.quaternion], fov: camera.fov, focalLength: camera.focalLength, aspect: camera.aspect, near: source?.near ?? 0.05, far: source?.far ?? 500 };
        }
    }
    const original = scene.cameras.find((item) => item.id === shot?.cameraId) ?? scene.cameras[0];
    const source = original ? { ...original, near: original.near ?? 0.05, far: original.far ?? 500 } : null;
    const framing = source ? resolveDirectorViewFraming({ scene: { ...scene, cameras: [source] }, mode: "camera", cameraId: source.id, playhead: time }) : null;
    if (!source || !framing) throw new Error("镜头没有可用的拍摄相机");
    const camera = sampleDirectorCamera(source, time);
    const quaternion = new Quaternion().setFromRotationMatrix(new Matrix4().lookAt(new Vector3(...framing.position), new Vector3(...framing.target), new Vector3(...framing.up)));
    return {
        source: scene.previs ? "legacy-fallback" : "legacy",
        position: [...framing.position],
        quaternion: quaternion.toArray(),
        fov: camera.fov,
        focalLength: camera.focalLength,
        aspect: resolveDirectorAspectRatio(shot?.aspectRatio),
        near: source.near ?? 0.05,
        far: source.far ?? 500,
    };
}

const warnedLegacyFallbacks = new Set<string>();

export function warnShotCameraFallbackOnce(sceneId: string, shotId: string, source: ShotCameraState["source"]) {
    if (source !== "legacy-fallback") return;
    const key = JSON.stringify([sceneId, shotId]);
    if (warnedLegacyFallbacks.has(key)) return;
    warnedLegacyFallbacks.add(key);
    console.warn("该镜头不在预演序列中，需重新编译序列", { sceneId, shotId });
}

export function applyShotCameraState(camera: PerspectiveCamera, state: ShotCameraState) {
    camera.position.set(...state.position);
    camera.quaternion.set(...state.quaternion);
    camera.fov = state.fov;
    camera.aspect = state.aspect;
    camera.near = state.near;
    camera.far = state.far;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
}

export function resolveShotCameraFrustum(camera: PerspectiveCamera) {
    // 展示平面沿相机前向保持约 2.15 m 的视觉长度，四角仍由真实投影矩阵反投影。
    const depth = new Vector3(0, 0, -2.15).applyMatrix4(camera.projectionMatrix).z;
    const corners = [
        [1, 1],
        [-1, 1],
        [-1, -1],
        [1, -1],
    ].map(([x, y]) => new Vector3(x, y, depth).applyMatrix4(camera.projectionMatrixInverse).applyMatrix4(camera.matrixWorld).toArray());
    return { origin: new Vector3().setFromMatrixPosition(camera.matrixWorld).toArray(), corners };
}
