import { currentLocaleText as t } from "@/i18n/current-locale-text";
import { previsAspectValue } from "../previs/previs-optics";
import { nanoid } from "nanoid";

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

export const DIRECTOR_DEFAULT_ACTOR_URL = "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r185/examples/models/gltf/Xbot.glb";
export const DIRECTOR_LEGACY_DEFAULT_ACTOR_COLOR = "#f1f3f5";
export const DIRECTOR_ACTOR_COLORS = ["#2f7de1", "#d84949", "#dfae3f", "#34a276", "#8b5cf6", "#e879f9", "#f97316", "#06b6d4", "#84cc16", "#ec4899", "#a78bfa", "#fb7185", "#22d3ee", "#4ade80", "#facc15", "#f472b6", "#818cf8", "#34d399"] as const;

export const DIRECTOR_ACTOR_ARCHETYPES = [
    {
        value: "adult",
        get label() {
            return t("previs.v165.message192");
        },
    },
    {
        value: "child",
        get label() {
            return t("previs.v165.message193");
        },
    },
    {
        value: "elderly",
        get label() {
            return t("previs.v165.message194");
        },
    },
    {
        value: "man",
        get label() {
            return t("previs.v165.message195");
        },
    },
    {
        value: "woman",
        get label() {
            return t("previs.v165.message196");
        },
    },
    {
        value: "monster",
        get label() {
            return t("previs.v165.message197");
        },
    },
] as const;

export function directorActorProfileForArchetype(archetype: DirectorActorArchetype = "adult"): DirectorActorProfile {
    switch (archetype) {
        case "child":
            return { height: 0.72, headRatio: 1.28, shoulderWidth: 0.78, torsoRatio: 0.82, accessory: "none" };
        case "elderly":
            return { height: 0.92, headRatio: 1.04, shoulderWidth: 0.9, torsoRatio: 1, accessory: "cane" };
        case "man":
            return { height: 1.04, headRatio: 0.94, shoulderWidth: 1.16, torsoRatio: 1, accessory: "none" };
        case "woman":
            return { height: 1, headRatio: 1, shoulderWidth: 0.86, torsoRatio: 1.02, accessory: "none" };
        case "monster":
            return { height: 1.12, headRatio: 1.18, shoulderWidth: 1.34, torsoRatio: 1.08, accessory: "horns" };
        default:
            return { height: 1, headRatio: 1, shoulderWidth: 1, torsoRatio: 1, accessory: "none" };
    }
}

export function directorActorArchetypeLabel(archetype?: DirectorObject["archetype"]) {
    return DIRECTOR_ACTOR_ARCHETYPES.find((item) => item.value === archetype)?.label || t("previs.v165.message192");
}

export function resolveDirectorActorColor(color?: string) {
    const normalized = color?.trim().toLowerCase();
    return !normalized || normalized === DIRECTOR_LEGACY_DEFAULT_ACTOR_COLOR ? DIRECTOR_ACTOR_COLORS[0] : color!;
}

export const directorIdentityTransform = (position: DirectorVec3 = [0, 0, 0]): DirectorTransform => ({ position, rotation: [0, 0, 0], scale: [1, 1, 1] });

/** Persist the same editable lighting rig for blank, template and generated scenes. */
export function createDirectorStudio() {
    const key = createDirectorLight("directional", t("previs.v165.message200"), [-4.5, 5.5, 6], 2.6);
    key.color = "#ffe1ad";
    key.shadowRadius = 1;
    const fill = createDirectorLight("directional", t("canvasDialog.lighting.rimLight"), [-4, 3, -2], 0.18);
    fill.castShadow = false;
    return {
        stageLook: "studio" as const,
        background: "#5a605f",
        groundColor: "#a79b88",
        groundSize: 18,
        environmentIntensity: 0.4,
        lights: [key, fill, createDirectorLight("ambient", t("canvasExtra.directorWB.lightAmbient"), [0, 0, 0], 0.16)],
    };
}

export function createDirectorScene(title = t("previs.v165.message198")): DirectorScene {
    const now = new Date().toISOString();
    const camera = createDirectorCamera();
    const shotId = nanoid();
    return {
        id: nanoid(),
        version: 1,
        title,
        ...createDirectorStudio(),
        environment: { mode: "color" },
        gridVisible: true,
        objects: [createDirectorActor(t("previs.v165.message199"), [0, 0, 0])],
        cameras: [camera],
        shots: [{ id: shotId, name: t("previs.v165.message201"), cameraId: camera.id, duration: 5, fps: 24, aspectRatio: "9:16", shotSize: "medium", cameraMove: "static", prompt: "" }],
        activeShotId: shotId,
        createdAt: now,
        updatedAt: now,
    };
}

export function createDirectorObject(primitive: DirectorObject["primitive"] = "box", name = t("previs.v165.message202"), position: DirectorVec3 = [0, 0.5, 0], color = "#8795a5"): DirectorObject {
    return {
        id: nanoid(),
        name,
        kind: "primitive",
        primitive,
        transform: directorIdentityTransform(position),
        color,
        visible: true,
        castShadow: true,
        receiveShadow: true,
        pose: primitive === "character" ? "stand" : undefined,
        keyframes: [],
        motionPath: undefined,
    };
}

export function createDirectorActor(name = t("canvasExtra.directorWB.actor"), position: DirectorVec3 = [0, 0, 0], color: string = DIRECTOR_ACTOR_COLORS[0], archetype: DirectorObject["archetype"] = "adult"): DirectorObject {
    return {
        ...createDirectorObject("box", name, position, color),
        kind: "actor",
        primitive: undefined,
        url: DIRECTOR_DEFAULT_ACTOR_URL,
        mimeType: "model/gltf-binary",
        pose: "stand",
        archetype,
        actorProfile: { ...directorActorProfileForArchetype(archetype), mannequinVersion: 2 },
        rig: { status: "unmapped", boneMap: {}, animationNames: [] },
        motionClips: [],
        boneOverrides: {},
        boneTracks: [],
    };
}

export function createDirectorModel(input: Pick<DirectorObject, "name" | "storageKey" | "url" | "mimeType" | "assetId">): DirectorObject {
    return { ...createDirectorObject("box", input.name, [0, 0, 0]), ...input, kind: "model", primitive: undefined };
}

export function createDirectorBillboard(name: string, url: string, storageKey?: string, sourceNodeId?: string): DirectorObject {
    return { ...createDirectorObject("plane", name, [0, 1.1, 0], "#ffffff"), kind: "billboard", url, storageKey, sourceNodeId, transform: { position: [0, 1.1, 0], rotation: [0, 0, 0], scale: [1, 1, 1] } };
}

export function createDirectorCamera(name = t("previs.v165.message203")): DirectorCamera {
    return { id: nanoid(), name, transform: directorIdentityTransform([4.8, 2.7, 6.8]), target: [0, 1, 0], focalLength: 35, fov: 50, aperture: 2.8, focusDistance: 5, near: 0.05, far: 500, keyframes: [], motionPath: undefined };
}

export function resolveDirectorAspectRatio(value?: DirectorAspectRatio) {
    return previsAspectValue(value);
}

export function uniqueDirectorName(existing: readonly string[], requested: string) {
    const base = requested.trim() || t("canvasExtra.directorNP.statObjects");
    if (!existing.includes(base)) return base;
    let index = 2;
    while (existing.includes(`${base} ${index}`)) index += 1;
    return `${base} ${index}`;
}

/** 35mm 全画幅水平视角换算。摄影机检查器与场景模板共用，避免两处各写一份光学。 */
export function directorFocalLengthToFov(focalLength: number) {
    return (2 * Math.atan(36 / (2 * Math.max(1, focalLength))) * 180) / Math.PI;
}

export function createDirectorLight(type: DirectorLight["type"], name: string, position: DirectorVec3, intensity = 1): DirectorLight {
    return { id: nanoid(), name, type, transform: directorIdentityTransform(position), color: "#ffffff", intensity, angle: Math.PI / 4, penumbra: 0.35, castShadow: type !== "ambient" };
}
