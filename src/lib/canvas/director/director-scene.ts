import { currentLocaleText as t } from "@/i18n/current-locale-text";
import { nanoid } from "nanoid";
import { Color, Euler, Quaternion } from "three";
import { sampleDirectorTransform } from "./director-playback";

import type {
    DirectorActorArchetype,
    DirectorActorProfile,
    DirectorAspectRatio,
    DirectorBoneKeyframe,
    DirectorBoneTrack,
    DirectorCamera,
    DirectorHumanoidBone,
    DirectorKeyframe,
    DirectorKeyframeDeleteTarget,
    DirectorKeyframeEasing,
    DirectorLight,
    DirectorObject,
    DirectorPose,
    DirectorQuat,
    DirectorScene,
    DirectorTransform,
    DirectorVec3,
} from "@/types/director";

import {
    DIRECTOR_DEFAULT_ACTOR_URL,
    DIRECTOR_LEGACY_DEFAULT_ACTOR_COLOR,
    DIRECTOR_ACTOR_COLORS,
    DIRECTOR_ACTOR_ARCHETYPES,
    directorActorProfileForArchetype,
    directorActorArchetypeLabel,
    resolveDirectorActorColor,
    directorIdentityTransform,
    createDirectorScene,
    createDirectorObject,
    createDirectorActor,
    createDirectorModel,
    createDirectorBillboard,
    createDirectorCamera,
    resolveDirectorAspectRatio,
    uniqueDirectorName,
    directorFocalLengthToFov,
    createDirectorLight,
} from "./director-scene-data";
export * from "./director-scene-data";

export function touchDirectorScene(scene: DirectorScene): DirectorScene {
    return { ...scene, updatedAt: new Date().toISOString() };
}

/** 关键帧命中容差：upsert 与 remove 必须同判据，否则会出现「记录能覆盖但删不掉」。 */
export const DIRECTOR_KEYFRAME_EPSILON = 0.001;

export function upsertDirectorKeyframe(keyframes: DirectorKeyframe[], time: number, transform: DirectorTransform) {
    const current = keyframes.find((item) => Math.abs(item.time - time) < DIRECTOR_KEYFRAME_EPSILON);
    const next = current ? keyframes.map((item) => (item.id === current.id ? { ...item, transform } : item)) : [...keyframes, { id: nanoid(), time, transform }];
    return next.toSorted((a, b) => a.time - b.time);
}

export function upsertDirectorBoneKeyframe(tracks: DirectorBoneTrack[], bone: DirectorHumanoidBone, time: number, rotation: DirectorQuat) {
    const track = tracks.find((item) => item.bone === bone);
    const nextKeyframes = upsertBoneKeyframe(track?.keyframes || [], time, rotation);
    return track ? tracks.map((item) => (item.bone === bone ? { ...item, keyframes: nextKeyframes } : item)) : [...tracks, { bone, keyframes: nextKeyframes }];
}

function upsertBoneKeyframe(keyframes: DirectorBoneKeyframe[], time: number, rotation: DirectorQuat) {
    const current = keyframes.find((item) => Math.abs(item.time - time) < DIRECTOR_KEYFRAME_EPSILON);
    const next = current ? keyframes.map((item) => (item.id === current.id ? { ...item, rotation } : item)) : [...keyframes, { id: nanoid(), time, rotation }];
    return next.toSorted((a, b) => a.time - b.time);
}

/** 按 id 删除对象 transform 关键帧；id 不存在时返回原数组引用。 */
export function removeDirectorKeyframe(keyframes: DirectorKeyframe[], keyframeId: string): DirectorKeyframe[] {
    if (!keyframes.some((item) => item.id === keyframeId)) return keyframes;
    return keyframes.filter((item) => item.id !== keyframeId);
}

/**
 * 按 id 删除某骨骼轨道上的关键帧。
 * 轨道被删空后整条移除，否则时间轴会留下永远为空的子轨道。
 */
export function removeDirectorBoneKeyframe(tracks: DirectorBoneTrack[], bone: DirectorHumanoidBone, keyframeId: string): DirectorBoneTrack[] {
    const track = tracks.find((item) => item.bone === bone);
    if (!track?.keyframes.some((item) => item.id === keyframeId)) return tracks;

    const nextKeyframes = track.keyframes.filter((item) => item.id !== keyframeId);
    if (!nextKeyframes.length) return tracks.filter((item) => item.bone !== bone);
    return tracks.map((item) => (item.bone === bone ? { ...item, keyframes: nextKeyframes } : item));
}

/**
 * 时间轴删除关键帧的唯一入口：按轨道类型分派到对应领域函数。
 *
 * 未命中（对象/摄影机/骨骼/关键帧任一不存在）时返回同一个 scene 引用，
 * 调用方据此跳过历史与保存，避免「点了没删掉却多一次修订」。
 */
export function removeDirectorSceneKeyframe(scene: DirectorScene, target: DirectorKeyframeDeleteTarget): DirectorScene {
    if (target.track === "light") {
        const light = scene.lights.find((item) => item.id === target.lightId);
        if (!light?.keyframes?.some((key) => key.id === target.keyframeId)) return scene;
        return { ...scene, lights: scene.lights.map((item) => item.id === light.id ? { ...item, keyframes: item.keyframes?.filter((key) => key.id !== target.keyframeId) } : item) };
    }
    if (target.track === "camera") {
        const camera = scene.cameras.find((item) => item.id === target.cameraId);
        if (!camera) return scene;
        const keyframes = removeDirectorKeyframe(camera.keyframes, target.keyframeId);
        if (keyframes === camera.keyframes) return scene;
        return { ...scene, cameras: scene.cameras.map((item) => (item.id === camera.id ? { ...item, keyframes } : item)) };
    }

    const object = scene.objects.find((item) => item.id === target.objectId);
    if (!object) return scene;

    if (target.track === "object-transform") {
        const keyframes = removeDirectorKeyframe(object.keyframes, target.keyframeId);
        if (keyframes === object.keyframes) return scene;
        return { ...scene, objects: scene.objects.map((item) => (item.id === object.id ? { ...item, keyframes } : item)) };
    }

    const tracks = object.boneTracks || [];
    const boneTracks = removeDirectorBoneKeyframe(tracks, target.bone, target.keyframeId);
    if (boneTracks === tracks) return scene;
    return { ...scene, objects: scene.objects.map((item) => (item.id === object.id ? { ...item, boneTracks } : item)) };
}

/**
 * 更新一枚关键帧后续区间的缓动。未命中时返回原 scene 引用，调用方据此跳过历史与保存。
 */
export function setDirectorSceneKeyframeEasing(scene: DirectorScene, target: DirectorKeyframeDeleteTarget, easing: DirectorKeyframeEasing): DirectorScene {
    if (target.track === "light") {
        const light = scene.lights.find((item) => item.id === target.lightId);
        if (!light?.keyframes?.some((key) => key.id === target.keyframeId)) return scene;
        return { ...scene, lights: scene.lights.map((item) => item.id === light.id ? { ...item, keyframes: item.keyframes?.map((key) => key.id === target.keyframeId ? { ...key, easing } : key) } : item) };
    }
    const update = <T extends { id: string; easing?: DirectorKeyframeEasing }>(keyframes: T[]) => {
        if (!keyframes.some((item) => item.id === target.keyframeId)) return keyframes;
        return keyframes.map((item) => (item.id === target.keyframeId ? { ...item, easing } : item));
    };

    if (target.track === "camera") {
        const camera = scene.cameras.find((item) => item.id === target.cameraId);
        if (!camera) return scene;
        const keyframes = update(camera.keyframes);
        if (keyframes === camera.keyframes) return scene;
        return { ...scene, cameras: scene.cameras.map((item) => (item.id === camera.id ? { ...item, keyframes } : item)) };
    }

    const object = scene.objects.find((item) => item.id === target.objectId);
    if (!object) return scene;
    if (target.track === "object-transform") {
        const keyframes = update(object.keyframes);
        if (keyframes === object.keyframes) return scene;
        return { ...scene, objects: scene.objects.map((item) => (item.id === object.id ? { ...item, keyframes } : item)) };
    }

    const tracks = object.boneTracks || [];
    const track = tracks.find((item) => item.bone === target.bone);
    if (!track) return scene;
    const keyframes = update(track.keyframes);
    if (keyframes === track.keyframes) return scene;
    const boneTracks = tracks.map((item) => (item.bone === target.bone ? { ...item, keyframes } : item));
    return { ...scene, objects: scene.objects.map((item) => (item.id === object.id ? { ...item, boneTracks } : item)) };
}

/** 缓动属于前一枚关键帧到下一枚关键帧的区间。旧数据未声明时保持线性。 */
export function resolveDirectorKeyframeProgress(progress: number, easing: DirectorKeyframeEasing = "linear") {
    const clamped = Math.max(0, Math.min(1, progress));
    if (easing === "step") return 0;
    if (easing === "smooth") return clamped * clamped * (3 - 2 * clamped);
    return clamped;
}

/** 轨迹渲染只接受有限时间与位置；坏数据不得进入 Three 几何体。 */
export function finiteDirectorTransformKeyframes(keyframes: DirectorKeyframe[]) {
    return keyframes.filter((keyframe) => [keyframe.time, ...keyframe.transform.position].every(Number.isFinite));
}

/** 按时间顺序累计 Transform 关键帧路径长度；非法时间或坐标段忽略，不污染界面统计。 */
export function directorTransformPathLength(keyframes: DirectorKeyframe[]) {
    const sorted = keyframes.toSorted((left, right) => left.time - right.time);
    let length = 0;
    for (let index = 1; index < sorted.length; index += 1) {
        const previousTime = sorted[index - 1].time;
        const currentTime = sorted[index].time;
        const previous = sorted[index - 1].transform.position;
        const current = sorted[index].transform.position;
        if (![previousTime, currentTime, ...previous, ...current].every(Number.isFinite)) continue;
        length += Math.hypot(current[0] - previous[0], current[1] - previous[1], current[2] - previous[2]);
    }
    return length;
}

export function interpolateDirectorTransform(base: DirectorTransform, keyframes: DirectorKeyframe[], time: number): DirectorTransform {
    return sampleDirectorTransform(base, keyframes, time);
}

export function interpolateDirectorBoneRotation(base: DirectorQuat, keyframes: DirectorBoneKeyframe[], time: number): DirectorQuat {
    if (!keyframes.length) return base;
    const previous = [...keyframes].reverse().find((item) => item.time <= time) || keyframes[0];
    const next = keyframes.find((item) => item.time >= time) || keyframes[keyframes.length - 1];
    if (previous.id === next.id) return previous.rotation;
    const progress = resolveDirectorKeyframeProgress((time - previous.time) / Math.max(next.time - previous.time, DIRECTOR_KEYFRAME_EPSILON), previous.easing);
    return new Quaternion(...previous.rotation).slerp(new Quaternion(...next.rotation), progress).toArray() as DirectorQuat;
}

export function directorBoneLabel(bone: string) {
    return (
        (
            {
                hips: t("canvasExtra.directorBone.hips"),
                spine: t("canvasExtra.directorBone.spine"),
                chest: t("canvasExtra.directorBone.chest"),
                neck: t("canvasExtra.directorBone.neck"),
                head: t("canvasExtra.directorBone.head"),
                leftShoulder: t("canvasExtra.directorBone.leftShoulder"),
                leftUpperArm: t("canvasExtra.directorBone.leftUpperArm"),
                leftLowerArm: t("canvasExtra.directorBone.leftLowerArm"),
                leftHand: t("canvasExtra.directorBone.leftHand"),
                rightShoulder: t("canvasExtra.directorBone.rightShoulder"),
                rightUpperArm: t("canvasExtra.directorBone.rightUpperArm"),
                rightLowerArm: t("canvasExtra.directorBone.rightLowerArm"),
                rightHand: t("canvasExtra.directorBone.rightHand"),
                leftUpperLeg: t("canvasExtra.directorBone.leftUpperLeg"),
                leftLowerLeg: t("canvasExtra.directorBone.leftLowerLeg"),
                leftFoot: t("canvasExtra.directorBone.leftFoot"),
                rightUpperLeg: t("canvasExtra.directorBone.rightUpperLeg"),
                rightLowerLeg: t("canvasExtra.directorBone.rightLowerLeg"),
                rightFoot: t("canvasExtra.directorBone.rightFoot"),
                leftThumb1: t("canvasExtra.directorBone.leftThumb1"),
                leftThumb2: t("canvasExtra.directorBone.leftThumb2"),
                leftThumb3: t("canvasExtra.directorBone.leftThumb3"),
                leftIndex1: t("canvasExtra.directorBone.leftIndex1"),
                leftIndex2: t("canvasExtra.directorBone.leftIndex2"),
                leftIndex3: t("canvasExtra.directorBone.leftIndex3"),
                leftMiddle1: t("canvasExtra.directorBone.leftMiddle1"),
                leftMiddle2: t("canvasExtra.directorBone.leftMiddle2"),
                leftMiddle3: t("canvasExtra.directorBone.leftMiddle3"),
                leftRing1: t("canvasExtra.directorBone.leftRing1"),
                leftRing2: t("canvasExtra.directorBone.leftRing2"),
                leftRing3: t("canvasExtra.directorBone.leftRing3"),
                leftPinky1: t("canvasExtra.directorBone.leftPinky1"),
                leftPinky2: t("canvasExtra.directorBone.leftPinky2"),
                leftPinky3: t("canvasExtra.directorBone.leftPinky3"),
                rightThumb1: t("canvasExtra.directorBone.rightThumb1"),
                rightThumb2: t("canvasExtra.directorBone.rightThumb2"),
                rightThumb3: t("canvasExtra.directorBone.rightThumb3"),
                rightIndex1: t("canvasExtra.directorBone.rightIndex1"),
                rightIndex2: t("canvasExtra.directorBone.rightIndex2"),
                rightIndex3: t("canvasExtra.directorBone.rightIndex3"),
                rightMiddle1: t("canvasExtra.directorBone.rightMiddle1"),
                rightMiddle2: t("canvasExtra.directorBone.rightMiddle2"),
                rightMiddle3: t("canvasExtra.directorBone.rightMiddle3"),
                rightRing1: t("canvasExtra.directorBone.rightRing1"),
                rightRing2: t("canvasExtra.directorBone.rightRing2"),
                rightRing3: t("canvasExtra.directorBone.rightRing3"),
                rightPinky1: t("canvasExtra.directorBone.rightPinky1"),
                rightPinky2: t("canvasExtra.directorBone.rightPinky2"),
                rightPinky3: t("canvasExtra.directorBone.rightPinky3"),
            } as Record<string, string>
        )[bone] || bone
    );
}

export function directorPoseLabel(pose: DirectorPose) {
    return (
        {
            neutral: t("canvasExtra.directorPose.neutral"),
            stand: t("canvasExtra.directorWB.poseStand"),
            t_pose: t("canvasExtra.directorWB.poseTPose"),
            walk: t("canvasExtra.directorWB.poseWalk"),
            run: t("canvasExtra.directorWB.poseRun"),
            sit: t("canvasExtra.directorWB.poseSit"),
            squat: t("canvasExtra.directorWB.poseSquat"),
            kneel_single: t("canvasExtra.directorWB.poseKneelSingle"),
            kneel_double: t("canvasExtra.directorWB.poseKneelDouble"),
            hands_hips: t("canvasExtra.directorWB.poseHandsHips"),
            lean: t("canvasExtra.directorWB.poseLean"),
            bow: t("canvasExtra.directorWB.poseBow"),
            think: t("canvasExtra.directorWB.poseThink"),
            fight: t("canvasExtra.directorWB.poseFight"),
            kick: t("canvasExtra.directorWB.poseKick"),
            throw: t("canvasExtra.directorWB.poseThrow"),
            push: t("canvasExtra.directorWB.movePushIn"),
            wave: t("canvasExtra.directorWB.poseWave"),
            reach: t("canvasExtra.directorWB.poseReach"),
            arms_crossed: t("canvasExtra.directorWB.poseArmsCrossed"),
            phone: t("canvasExtra.directorWB.posePhone"),
        } as Record<DirectorPose, string>
    )[pose];
}

export function directorPoseBoneDeltas(pose: DirectorPose): Partial<Record<DirectorHumanoidBone, DirectorQuat>> {
    // Soldier 的左右上臂局部 Z 轴方向一致，正向旋转才会把两侧手臂从 T Pose 放下。
    const armsDown = { leftUpperArm: poseQuaternion(0, 0, 1.28), rightUpperArm: poseQuaternion(0, 0, 1.28) };
    const poses: Record<DirectorPose, Partial<Record<DirectorHumanoidBone, DirectorQuat>>> = {
        neutral: armsDown,
        stand: armsDown,
        t_pose: {},
        walk: { ...armsDown, leftUpperArm: poseQuaternion(0.36, 0, 1.2), rightUpperArm: poseQuaternion(-0.36, 0, 1.2), leftUpperLeg: poseQuaternion(-0.32, 0, 0), rightUpperLeg: poseQuaternion(0.32, 0, 0) },
        run: {
            ...armsDown,
            leftUpperArm: poseQuaternion(0.75, 0, 1.05),
            rightUpperArm: poseQuaternion(-0.75, 0, 1.05),
            leftLowerArm: poseQuaternion(-0.7, 0, 0),
            rightLowerArm: poseQuaternion(-0.7, 0, 0),
            leftUpperLeg: poseQuaternion(-0.65, 0, 0),
            rightUpperLeg: poseQuaternion(0.55, 0, 0),
            rightLowerLeg: poseQuaternion(0.8, 0, 0),
        },
        sit: { ...armsDown, leftUpperLeg: poseQuaternion(-1.35, 0, 0), rightUpperLeg: poseQuaternion(-1.35, 0, 0), leftLowerLeg: poseQuaternion(1.25, 0, 0), rightLowerLeg: poseQuaternion(1.25, 0, 0) },
        squat: { ...armsDown, hips: poseQuaternion(0.25, 0, 0), leftUpperLeg: poseQuaternion(-0.75, 0, 0), rightUpperLeg: poseQuaternion(-0.75, 0, 0), leftLowerLeg: poseQuaternion(1.2, 0, 0), rightLowerLeg: poseQuaternion(1.2, 0, 0) },
        kneel_single: { ...armsDown, leftUpperLeg: poseQuaternion(-0.95, 0, 0), leftLowerLeg: poseQuaternion(1.45, 0, 0), rightUpperLeg: poseQuaternion(-0.35, 0, 0), rightLowerLeg: poseQuaternion(0.75, 0, 0) },
        kneel_double: { ...armsDown, leftUpperLeg: poseQuaternion(-0.55, 0, 0), rightUpperLeg: poseQuaternion(-0.55, 0, 0), leftLowerLeg: poseQuaternion(1.45, 0, 0), rightLowerLeg: poseQuaternion(1.45, 0, 0) },
        hands_hips: { leftUpperArm: poseQuaternion(0, 0, 0.75), rightUpperArm: poseQuaternion(0, 0, 0.75), leftLowerArm: poseQuaternion(-0.1, 0.2, -1.5), rightLowerArm: poseQuaternion(-0.1, -0.2, 1.5) },
        lean: { ...armsDown, hips: poseQuaternion(0, 0, 0.18), spine: poseQuaternion(0, 0, -0.12), head: poseQuaternion(0, 0, -0.08) },
        bow: { ...armsDown, hips: poseQuaternion(0.5, 0, 0), spine: poseQuaternion(0.28, 0, 0), head: poseQuaternion(-0.18, 0, 0) },
        think: { ...armsDown, rightUpperArm: poseQuaternion(-0.25, 0, 0.55), rightLowerArm: poseQuaternion(-1.35, 0, 0.3), head: poseQuaternion(0.05, -0.22, 0) },
        fight: {
            leftUpperArm: poseQuaternion(-0.65, 0, 0.7),
            rightUpperArm: poseQuaternion(-0.55, 0, 0.65),
            leftLowerArm: poseQuaternion(-1.2, 0, 0),
            rightLowerArm: poseQuaternion(-1.25, 0, 0),
            chest: poseQuaternion(0, 0.2, 0),
            leftUpperLeg: poseQuaternion(-0.15, 0, 0),
            rightUpperLeg: poseQuaternion(0.2, 0, 0),
        },
        kick: { ...armsDown, leftUpperArm: poseQuaternion(0.3, 0, 1.1), rightUpperArm: poseQuaternion(-0.3, 0, 1.1), rightUpperLeg: poseQuaternion(-1.1, 0, 0), rightLowerLeg: poseQuaternion(0.35, 0, 0) },
        throw: { leftUpperArm: poseQuaternion(-0.35, 0.2, 0.35), rightUpperArm: poseQuaternion(-1.2, 0, 0.25), rightLowerArm: poseQuaternion(-1.05, 0, 0), chest: poseQuaternion(0, -0.3, 0) },
        push: { leftUpperArm: poseQuaternion(-0.9, 0, 0.3), rightUpperArm: poseQuaternion(-0.9, 0, 0.3), leftLowerArm: poseQuaternion(-0.35, 0, 0), rightLowerArm: poseQuaternion(-0.35, 0, 0), chest: poseQuaternion(0.15, 0, 0) },
        wave: { ...armsDown, rightUpperArm: poseQuaternion(0, 0, -0.35), rightLowerArm: poseQuaternion(0, 0, -1.45), rightHand: poseQuaternion(0, 0, -0.3) },
        reach: { ...armsDown, rightUpperArm: poseQuaternion(-1.35, 0, -0.05), rightLowerArm: poseQuaternion(-0.1, 0, 0) },
        arms_crossed: { leftUpperArm: poseQuaternion(-0.65, 0, 0.65), rightUpperArm: poseQuaternion(-0.65, 0, 0.65), leftLowerArm: poseQuaternion(-1.2, 0.15, -0.4), rightLowerArm: poseQuaternion(-1.2, -0.15, 0.4) },
        phone: { ...armsDown, leftUpperArm: poseQuaternion(-0.45, 0, 0.95), rightUpperArm: poseQuaternion(-0.45, 0, 0.95), leftLowerArm: poseQuaternion(-1.1, 0, 0.15), rightLowerArm: poseQuaternion(-1.1, 0, -0.15), head: poseQuaternion(0.28, 0, 0) },
    };
    return poses[pose];
}

export function directorColorLabel(value: string) {
    const hsl = { h: 0, s: 0, l: 0 };
    new Color(value).getHSL(hsl);
    if (hsl.l >= 0.86 && hsl.s <= 0.2) return t("previs.v165.message204");
    if (hsl.l <= 0.18) return t("previs.v165.message205");
    if (hsl.s <= 0.16) return hsl.l >= 0.52 ? t("previs.v165.message206") : t("previs.v165.message207");
    const hue = hsl.h * 360;
    if (hue < 18 || hue >= 345) return t("previs.v165.message208");
    if (hue < 48) return t("previs.v165.message209");
    if (hue < 72) return t("previs.v165.message210");
    if (hue < 165) return t("previs.v165.message211");
    if (hue < 195) return t("previs.v165.message212");
    if (hue < 255) return t("previs.v165.message213");
    if (hue < 290) return t("previs.v165.message214");
    return t("previs.v165.message215");
}

function poseQuaternion(x: number, y: number, z: number): DirectorQuat {
    return new Quaternion().setFromEuler(new Euler(x, y, z)).toArray() as DirectorQuat;
}
