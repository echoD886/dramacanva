import { compileDirectorCameraDescription } from "./director-camera-description";
import { currentLocaleText as t } from "@/i18n/current-locale-text";
import type { DirectorEnvironment, DirectorObject, DirectorScene, DirectorShot } from "@/types/director";
import { directorActorArchetypeLabel, directorColorLabel, directorPoseLabel } from "@/lib/canvas/director/director-scene";

export function compileDirectorPrompt(scene: DirectorScene, shot: DirectorShot) {
    if (shot.id !== scene.activeShotId && shot.stage) scene = { ...scene, ...shot.stage };
    const visibleObjects = scene.objects.filter((item) => item.visible);
    const actors = visibleObjects.filter((item) => item.kind === "actor" || item.primitive === "character");
    return [
        shot.prompt.trim(),
        compileDirectorCameraDescription(scene, shot),
        environmentPrompt(scene.environment),
        actors.length ? t("previs.v165.message275", { p0: actors.map((actor) => actor.characterBinding?.characterName || actor.name).join("；") }) : "",
        visibleObjects.length ? t("previs.v165.message276", { p0: visibleObjects.map(objectPrompt).join("；") }) : "",
        assetReferencePrompt(scene),
        t("previs.v165.message277", { p0: scene.lights.map((light) => `${light.name}${formatNumber(light.intensity)}强度${light.color}`).join("，") }),
        t("previs.v165.message179"),
        t("directorD4.constraint"),
    ]
        .filter(Boolean)
        .join("\n");
}

function environmentPrompt(environment?: DirectorEnvironment) {
    if (!environment || environment.mode !== "panorama" || !environment.url) return t("previs.v165.message180");
    return t("previs.v165.message279");
}

function assetReferencePrompt(scene: DirectorScene) {
    const assets = scene.objects.filter((object) => object.visible && (object.sourceNodeId || object.assetId));
    if (!assets.length) return "";
    return t("previs.v165.message280", { p0: assets.map((object) => `${object.name}${object.sourceNodeId ? `（画布图片节点 ${object.sourceNodeId}）` : `（3D 素材 ${object.assetId}）`}`).join("；") });
}

function objectPrompt(object: DirectorObject) {
    const [x, y, z] = object.transform.position;
    const pose = object.pose ? t("previs.v165.message284", { p0: directorPoseLabel(object.pose) }) : "";
    const archetype = object.kind === "actor" || object.primitive === "character" ? t("previs.v165.message285", { p0: directorActorArchetypeLabel(object.archetype) }) : "";
    const color = object.kind === "actor" || object.primitive === "character" ? t("previs.v165.message286", { p0: directorColorLabel(object.color) }) : "";
    return t("previs.v165.message287", { p0: object.name, p1: archetype, p2: color, p3: formatNumber(x), p4: formatNumber(y), p5: formatNumber(z), p6: pose });
}

function formatNumber(value: number) {
    return Number(value.toFixed(2));
}
