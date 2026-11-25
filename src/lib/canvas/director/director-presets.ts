import { currentLocaleText as t } from "@/i18n/current-locale-text";
import type { DirectorActorArchetype, DirectorPose, DirectorStageProp, DirectorVec3 } from "@/types/director";
import { createDirectorActor, createDirectorObject } from "./director-scene-data";
import { DIRECTOR_ASSET_REGISTRY, SUBWAY_PLATFORM_TEMPLATE, getDirectorAsset } from "./director-asset-registry";

export const DIRECTOR_ACTOR_PRESETS: DirectorActorArchetype[] = ["man", "woman", "child"];
export const DIRECTOR_POSE_PRESETS: DirectorPose[] = ["stand", "sit", "walk", "run", "lean", "reach", "phone"];
export const DIRECTOR_MANNEQUIN_PRESETS = DIRECTOR_ACTOR_PRESETS.flatMap((archetype) => [
    ...DIRECTOR_POSE_PRESETS.map((pose) => ({ id: `${archetype}-${pose}`, archetype, pose, heldProp: undefined as "script" | undefined })),
    { id: `${archetype}-script`, archetype, pose: "stand" as const, heldProp: "script" as const },
]);
export function createDirectorMannequinPreset(id: string, name: string) {
    const preset = DIRECTOR_MANNEQUIN_PRESETS.find((item) => item.id === id)!;
    return { ...createDirectorActor(name), archetype: preset.archetype, pose: preset.pose, heldProp: preset.heldProp };
}
export const DIRECTOR_PROP_PRESETS = Object.values(DIRECTOR_ASSET_REGISTRY)
    .filter((entry) => entry.type === "prop")
    .map((entry) => ({
        id: entry.id as DirectorStageProp,
        size: `${entry.size.join(" × ")} m`,
        category: ["rug", "conference-table", "office-chair", "sofa", "bed", "bench"].includes(entry.id) ? "furniture" : ["ceiling-light", "door", "window", "whiteboard", "platform-column"].includes(entry.id) ? "architecture" : "props",
    }));
export const DIRECTOR_PROP_DIMENSIONS = Object.fromEntries(DIRECTOR_PROP_PRESETS.map(({ id }) => [id, getDirectorAsset(id)!.size])) as Record<DirectorStageProp, DirectorVec3>;
export function directorPropLabel(id: DirectorStageProp) {
    return t(`directorR3.prop.${id}`);
}
export function createDirectorPropPreset(id: DirectorStageProp, position?: DirectorVec3, yaw = 0) {
    const object = createDirectorObject("box", directorPropLabel(id), position || [0, id === "window" ? 1.8 : id === "whiteboard" ? 1.6 : id === "document" ? 0.015 : 0, 0], "#dededb");
    object.stageProp = id;
    object.transform.rotation[1] = yaw;
    return object;
}
export const DIRECTOR_SCENE_PRESETS = {
    conference: [
        ["conference-table", [0, 0, 0]],
        ["office-chair", [1.75, 0, 0], -Math.PI / 2],
        ["window", [-2.8, 2.15, -3.06]],
        ["window", [-0.3, 2.15, -3.06]],
        ["door", [4.7, 0, -3.06]],
        ["whiteboard", [2.25, 1.9, -3.05]],
        ["cup", [0.8, 0.76, -0.3]],
        ["document", [0.55, 0.775, 0.22]],
        ["document", [-1.05, 0.775, 0.1]],
        ["plant", [-4.2, 0, -2.2]],
        ["plant", [3.7, 0, -2.2]],
        ["rug", [0, 0.005, 0]],
        ["ceiling-light", [0, 3.5, 0]],
        ["office-chair", [-0.7, 0, -0.98]],
        ["office-chair", [0.55, 0, -0.98]],
        ["office-chair", [-0.7, 0, 0.98], Math.PI],
        ["office-chair", [0.55, 0, 0.98], Math.PI],
    ],
    living: [
        ["sofa", [0, 0, -1.4]],
        ["conference-table", [0, 0, 0.5]],
        ["door", [3, 0, -3]],
        ["window", [-2, 1.8, -3]],
    ],
    bedroom: [
        ["bed", [0, 0, -1]],
        ["window", [-2, 1.8, -3]],
        ["door", [3, 0, -3]],
        ["phone", [0.5, 0.6, 0.4]],
    ],
    street: [
        ["car", [-2, 0, -1]],
        ["door", [2, 0, -3]],
        ["window", [-1, 1.8, -3]],
    ],
    office: [
        ["conference-table", [0, 0, 0]],
        ["office-chair", [0, 0, -1]],
        ["whiteboard", [0, 1.8, -3]],
        ["door", [3, 0, -3]],
        ["phone", [0.5, 0.94, 0]],
    ],
    carInterior: [
        ["car", [0, 0, 0]],
        ["phone", [0, 0.8, -0.6]],
    ],
    subwayPlatform: SUBWAY_PLATFORM_TEMPLATE.objects.filter(({ assetId }) => getDirectorAsset(assetId)?.type === "prop").map(({ assetId, position }): [DirectorStageProp, DirectorVec3] => [assetId as DirectorStageProp, [...position]]),
} satisfies Record<string, [DirectorStageProp, DirectorVec3, number?][]>;
export function createDirectorScenePreset(id: keyof typeof DIRECTOR_SCENE_PRESETS, stableIds = false) {
    if (id === "subwayPlatform") {
        const parts = SUBWAY_PLATFORM_TEMPLATE.objects
            .filter(({ assetId }) => getDirectorAsset(assetId)?.type === "template-part")
            .map((part) => {
                const object = createDirectorObject("box", t(`directorR3.part.${part.assetId as "platform-ground" | "platform-edge" | "platform-background-wall"}`), [...part.position]);
                return { ...object, ...(stableIds ? { id: part.id } : {}), transform: { ...object.transform, scale: [...getDirectorAsset(part.assetId)!.size] as DirectorVec3 } };
            });
        return [...parts, ...DIRECTOR_SCENE_PRESETS[id].map(([kind, position], index) => ({ ...createDirectorPropPreset(kind, [...position]), ...(stableIds ? { id: kind === "bench" ? "platform-bench" : `platform-column-${index + 1}` } : {}) }))];
    }
    return DIRECTOR_SCENE_PRESETS[id].map(([kind, position, yaw]) => createDirectorPropPreset(kind, [...position], yaw));
}
