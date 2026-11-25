import type { DirectorHumanoidBone, DirectorObject, DirectorVec3 } from "@/types/director";
import { resolveDirectorBoneRotation } from "./director-animation-semantics";
import { DIRECTOR_DEFAULT_ACTOR_URL, directorActorProfileForArchetype } from "./director-scene-data";
import { Euler, Quaternion } from "three";

export type NeutralMannequinPart = {
    name: string;
    bone: string;
    geometry: "ellipsoid" | "sphere" | "capsule" | "roundedBox";
    size: DirectorVec3;
    position: DirectorVec3;
    rotation?: DirectorVec3;
};

export function usesNeutralMannequin(object: Pick<DirectorObject, "kind" | "primitive" | "url" | "assetId">) {
    return (object.kind === "actor" || object.primitive === "character") && (!object.url || object.url === DIRECTOR_DEFAULT_ACTOR_URL) && !object.assetId;
}

export function resolveNeutralMannequin(object: Pick<DirectorObject, "archetype" | "actorProfile">) {
    const modelUrl = "/canvas/models/mannequin/Superhero_Male_FullBody.gltf";
    if (object.actorProfile?.mannequinVersion === 2) {
        const { height, headRatio } = object.actorProfile;
        return { modelUrl, height, headRatio };
    }
    const defaults = directorActorProfileForArchetype(object.archetype);
    const neutral = directorActorProfileForArchetype(object.archetype === "child" ? "child" : "adult");
    // 已存场景也带有按类型生成的默认比例；只保留区别于旧默认值的显式调整。
    return {
        modelUrl,
        height: object.actorProfile?.height !== undefined && object.actorProfile.height !== defaults.height ? object.actorProfile.height : neutral.height,
        headRatio: object.actorProfile?.headRatio !== undefined && object.actorProfile.headRatio !== defaults.headRatio ? object.actorProfile.headRatio : neutral.headRatio,
    };
}

/** 尺寸为完整包围尺寸，偏移与旋转使用 Quaternius 骨骼局部坐标，长轴沿 +Y。 */
export function buildNeutralMannequinParts(boneNames: readonly string[]): NeutralMannequinPart[] {
    const parts: NeutralMannequinPart[] = [
        { name: "head", bone: "Head", geometry: "ellipsoid", size: [0.19, 0.255, 0.185], position: [0, 0.03, 0] },
        { name: "neck", bone: "neck_01", geometry: "capsule", size: [0.09, 0.11, 0.09], position: [0, 0.035, 0] },
        { name: "chest", bone: "spine_03", geometry: "ellipsoid", size: [0.385, 0.32, 0.215], position: [0, 0.07, 0.015] },
        { name: "abdomen", bone: "spine_01", geometry: "ellipsoid", size: [0.215, 0.24, 0.16], position: [0, 0.08, 0] },
        { name: "pelvis", bone: "pelvis", geometry: "ellipsoid", size: [0.32, 0.21, 0.2], position: [0, 0, 0] },
    ];
    for (const side of ["l", "r"] as const) {
        parts.push(
            { name: `shoulder_${side}`, bone: `upperarm_${side}`, geometry: "sphere", size: [0.112, 0.112, 0.112], position: [0, 0, 0] },
            { name: `upper_arm_${side}`, bone: `upperarm_${side}`, geometry: "capsule", size: [0.11, 0.251, 0.11], position: [0, 0.1255, 0] },
            { name: `elbow_${side}`, bone: `lowerarm_${side}`, geometry: "sphere", size: [0.091, 0.091, 0.091], position: [0, 0, 0] },
            { name: `forearm_${side}`, bone: `lowerarm_${side}`, geometry: "capsule", size: [0.095, 0.244, 0.095], position: [0, 0.122, 0] },
            { name: `wrist_${side}`, bone: `hand_${side}`, geometry: "sphere", size: [0.085, 0.085, 0.085], position: [0, 0, 0] },
            { name: `hand_${side}`, bone: `hand_${side}`, geometry: "roundedBox", size: [0.09, 0.14, 0.045], position: [0, 0.065, 0] },
            { name: `hip_${side}`, bone: `thigh_${side}`, geometry: "sphere", size: [0.14, 0.14, 0.14], position: [0, 0, 0] },
            { name: `thigh_${side}`, bone: `thigh_${side}`, geometry: "capsule", size: [0.172, 0.429, 0.172], position: [0, 0.2145, 0] },
            { name: `knee_${side}`, bone: `calf_${side}`, geometry: "sphere", size: [0.113, 0.113, 0.113], position: [0, 0, 0] },
            { name: `calf_${side}`, bone: `calf_${side}`, geometry: "capsule", size: [0.12, 0.459, 0.12], position: [0, 0.2295, 0] },
            { name: `ankle_${side}`, bone: `foot_${side}`, geometry: "sphere", size: [0.105, 0.105, 0.105], position: [0, 0, 0] },
            // 脚骨朝脚趾向下倾斜，抵消静置倾角使脚块贴地。
            { name: `foot_${side}`, bone: `foot_${side}`, geometry: "roundedBox", size: [0.114, 0.077, 0.235], position: [0, 0.067, 0.011], rotation: [-2.0356, 0, 0] },
        );
    }
    const available = new Set(boneNames);
    return parts.filter((part) => available.has(part.bone));
}

/** Same absolute override / keyed-rotation precedence as imported humanoid rigs. */
export function mannequinBoneRotation(object: Pick<DirectorObject, "boneOverrides" | "boneTracks">, bone: DirectorHumanoidBone, time: number, preset: DirectorVec3 = [0, 0, 0]): DirectorVec3 {
    const rotation = resolveDirectorBoneRotation({ override: object.boneOverrides?.[bone], keyframes: object.boneTracks?.find((track) => track.bone === bone)?.keyframes, time });
    if (!rotation) return preset;
    const euler = new Euler().setFromQuaternion(new Quaternion(...rotation), "XYZ");
    return [euler.x, euler.y, euler.z];
}
