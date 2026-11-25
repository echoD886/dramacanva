import { Vector3 } from "three";
import { getDirectorAsset } from "./director-asset-registry";

import { directorActorProfileForArchetype } from "@/lib/canvas/director/director-scene";
import type { DirectorObject } from "@/types/director";

export type DirectorFrameBounds = {
    min: Vector3;
    max: Vector3;
    span: Vector3;
    target: Vector3;
    fitDistance: number;
};

/** Smallest orbit distance allowed regardless of scene contents. */
export const DIRECTOR_MIN_ORBIT_DISTANCE = 0.7;

export function resolveDirectorPerspectiveFitDistance(span: Vector3, aspect = 1, fov = 50): number {
    const verticalHalfFov = (Math.max(1, fov) * Math.PI) / 360;
    const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * Math.max(0.1, aspect));
    return Math.max(span.y / 2 / Math.tan(verticalHalfFov), Math.max(span.x, span.z) / 2 / Math.tan(horizontalHalfFov));
}

/** 单个对象的近似世界包围盒；演员按体积而不是原点计算，避免相机推进到身体内部。 */
export function resolveDirectorObjectBox(object: DirectorObject): { min: Vector3; max: Vector3 } {
    const [x, y, z] = object.transform.position;
    const [sx, sy, sz] = object.transform.scale;
    if (object.stageProp) {
        const bounds = getDirectorAsset(object.stageProp)!.localBounds;
        const min = new Vector3(Infinity, Infinity, Infinity),
            max = new Vector3(-Infinity, -Infinity, -Infinity);
        for (const bx of [bounds.min[0], bounds.max[0]])
            for (const by of [bounds.min[1], bounds.max[1]])
                for (const bz of [bounds.min[2], bounds.max[2]]) {
                    const point = new Vector3(bx * sx, by * sy, bz * sz).applyAxisAngle(new Vector3(0, 1, 0), object.transform.rotation[1]).add(new Vector3(x, y, z));
                    min.min(point);
                    max.max(point);
                }
        return { min, max };
    }
    const actor = object.kind === "actor" || object.primitive === "character";
    if (actor) {
        const profile = { ...directorActorProfileForArchetype(object.archetype || "adult"), ...(object.actorProfile || {}) };
        const actorScaleY = Math.max(0.1, Math.abs(sy) * profile.height);
        const actorHeight = object.pose === "sit" || object.pose === "squat" ? 2.05 : profile.accessory === "horns" ? 2.8 : 2.45;
        const halfWidth = 0.78 * Math.max(0.8, profile.shoulderWidth) * Math.max(0.1, Math.abs(sx));
        const halfDepth = 0.72 * Math.max(0.1, Math.abs(sz));
        return { min: new Vector3(x - halfWidth, y - 0.12 * actorScaleY, z - halfDepth), max: new Vector3(x + halfWidth, y + actorHeight * actorScaleY, z + halfDepth) };
    }
    const primitiveBounds: [number, number, number] = object.primitive === "sphere" ? [0.6, 0.6, 0.6] : object.primitive === "cylinder" ? [0.55, 0.8, 0.55] : object.primitive === "plane" ? [1.2, 0.05, 1.2] : [0.6, 0.6, 0.6];
    const half = new Vector3(primitiveBounds[0] * Math.max(0.1, Math.abs(sx)), primitiveBounds[1] * Math.max(0.1, Math.abs(sy)), primitiveBounds[2] * Math.max(0.1, Math.abs(sz)));
    return { min: new Vector3(x, y, z).sub(half), max: new Vector3(x, y, z).add(half) };
}

/**
 * 缩放的最近距离：相机不得进入包含环绕目标的对象体积（否则背面剔除让身体消失、只剩地面阴影）。
 * 只看包含目标的对象，大场景里推近其它区域不受整体尺寸限制。
 */
export function resolveDirectorZoomMinDistance(objects: DirectorObject[], target: Vector3): number {
    let minDistance = DIRECTOR_MIN_ORBIT_DISTANCE;
    const margin = 0.15;
    objects.forEach((object) => {
        if (!object.visible || object.primitive === "plane") return;
        const box = resolveDirectorObjectBox(object);
        const contains = target.x >= box.min.x - margin && target.x <= box.max.x + margin && target.y >= box.min.y - margin && target.y <= box.max.y + margin && target.z >= box.min.z - margin && target.z <= box.max.z + margin;
        if (!contains) return;
        // 目标到盒子最远角的距离 + 近裁剪余量，保证整个体积都在相机前方。
        const farthest = new Vector3(Math.max(target.x - box.min.x, box.max.x - target.x), Math.max(target.y - box.min.y, box.max.y - target.y), Math.max(target.z - box.min.z, box.max.z - target.z));
        minDistance = Math.max(minDistance, farthest.length() + 0.35);
    });
    return minDistance;
}

/** 可见对象（可选限定 ids）的联合包围盒，以及在给定 aspect/fov 下完整入画所需的距离。 */
export function resolveDirectorFrameBounds(objects: DirectorObject[], ids?: Set<string>, aspect = 1, fov = 50): DirectorFrameBounds | null {
    const visible = objects.filter((object) => object.visible && (!ids || ids.has(object.id)));
    if (!visible.length) return null;

    const min = new Vector3(Infinity, Infinity, Infinity);
    const max = new Vector3(-Infinity, -Infinity, -Infinity);
    visible.forEach((object) => {
        const box = resolveDirectorObjectBox(object);
        min.min(box.min);
        max.max(box.max);
    });

    const target = min.clone().add(max).multiplyScalar(0.5);
    const span = max.clone().sub(min);
    const fitDistance = resolveDirectorPerspectiveFitDistance(span, aspect, fov) * 1.08;
    return { min, max, span, target, fitDistance };
}
