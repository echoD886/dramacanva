import { PerspectiveCamera, Vector3 } from "three";
import type { DirectorVec3, PrevisFraming } from "@/types/director";
import { resolveDirectorPerspectiveFitDistance } from "./director-frame-bounds";

export function solvePrevisFraming(input: { framing: PrevisFraming; targets: { position: DirectorVec3; height: number }[]; viewDirection: DirectorVec3; fovDeg: number; aspect: number }): { distance: number; lookAt: DirectorVec3; cameraHeight: number } {
    const targets = input.targets.filter((target) => target.height > 0 && Number.isFinite(target.height) && target.position.every(Number.isFinite));
    if (!targets.length) return { distance: 0, lookAt: [0, 0, 0], cameraHeight: 1.4 };

    const framing = input.framing === "wide" ? "full" : input.framing;
    const bottom = framing === "half" ? 0.95 : framing === "face" ? 1.42 : 0;
    const view = new Vector3(...input.viewDirection).setY(0).normalize();
    if (view.lengthSq() === 0) view.set(0, 0, -1);
    const right = new Vector3().crossVectors(view, new Vector3(0, 1, 0));
    const min = new Vector3(Infinity, Infinity, Infinity);
    const max = new Vector3(-Infinity, -Infinity, -Infinity);
    const points: Vector3[] = [];
    let cameraHeight = 0;
    for (const target of targets) {
        const scale = target.height / 1.75;
        const feet = new Vector3(...target.position);
        min.min(feet.clone().add(new Vector3(0, bottom * scale, 0)));
        max.max(feet.clone().add(new Vector3(0, target.height, 0)));
        cameraHeight += feet.y + (framing === "face" ? (1.42 + 1.75) / 2 : framing === "half" ? 1.5 : 1.4) * scale;
        for (const height of [bottom * scale, target.height]) {
            for (const side of [-0.25, 0.25])
                points.push(
                    feet
                        .clone()
                        .addScaledVector(right, side)
                        .add(new Vector3(0, height, 0)),
                );
        }
    }
    cameraHeight /= targets.length;
    const lookAt = min.clone().add(max).multiplyScalar(0.5);
    const topLimit = framing === "face" ? 0.9 : 0.92;
    const bottomLimit = framing === "full" || framing === "group" ? -0.92 : -1;
    const horizontalLimit = framing === "group" ? 0.92 : 1;
    const fov = Number.isFinite(input.fovDeg) ? Math.max(1, Math.min(179, input.fovDeg)) : 50;
    const aspect = Number.isFinite(input.aspect) && input.aspect > 0 ? input.aspect : 1;
    const camera = new PerspectiveCamera(fov, aspect, 0.001, 1e6);
    const projected = new Vector3();
    const fits = (distance: number) => {
        camera.position.copy(lookAt).addScaledVector(view, -distance).setY(cameraHeight);
        camera.lookAt(lookAt);
        camera.updateMatrixWorld(true);
        return points.every((point) => {
            if (projected.copy(point).applyMatrix4(camera.matrixWorldInverse).z >= -camera.near) return false;
            projected.copy(point).project(camera);
            return Math.abs(projected.x) <= horizontalLimit && projected.y >= bottomLimit && projected.y <= topLimit;
        });
    };
    let minHorizontal = Infinity,
        maxHorizontal = -Infinity,
        nearDepth = 0;
    for (const point of points) {
        const offset = point.clone().sub(lookAt);
        minHorizontal = Math.min(minHorizontal, offset.dot(right));
        maxHorizontal = Math.max(maxHorizontal, offset.dot(right));
        nearDepth = Math.max(nearDepth, -offset.dot(view));
    }
    let low = nearDepth;
    let high = nearDepth + resolveDirectorPerspectiveFitDistance(new Vector3(maxHorizontal - minHorizontal, max.y - min.y, 0), aspect, fov);
    // 共用跨度换算给出初值，再按实际俯仰投影收敛，避免机位高于取景中心时裁掉头脚。
    while (!fits(high)) high *= 2;
    for (let iteration = 0; iteration < 40; iteration += 1) {
        const middle = (low + high) / 2;
        if (fits(middle)) high = middle;
        else low = middle;
    }
    return { distance: high * (input.framing === "wide" ? 2.5 : 1), lookAt: lookAt.toArray(), cameraHeight };
}
