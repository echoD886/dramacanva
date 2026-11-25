import { nanoid } from "nanoid";
import type { MessageKey } from "@/i18n/messages";
import type { DirectorKeyframe, DirectorScene, DirectorTransform } from "@/types/director";
import { createDirectorActor, createDirectorObject, directorIdentityTransform } from "./director-scene-data";
import springTracks from "./spring-record-tracks.json";

function starterKeyframe(time: number, transform: DirectorTransform): DirectorKeyframe {
    return { id: nanoid(), time, transform, easing: "linear" };
}

/** Editable reconstruction of the camera blocking shown in the Spring Record reference. */
export function stageSpringRecord(scene: DirectorScene, t: (key: MessageKey) => string): DirectorScene {
    const duration = 15;
    const actor = createDirectorActor(t("miscPages.starterDirectorActorCaller"), [0, 0.12, 0], "#e7e4d9", "woman");
    actor.keyframes = springTracks.map((key) => starterKeyframe(key.frame / 24, { ...actor.transform, rotation: key.rotation.map((value) => (value * Math.PI) / 180) as DirectorTransform["rotation"] }));
    actor.transform = actor.keyframes[0].transform;
    const floor = createDirectorObject("box", t("canvasExtra.directorWB.cube"), [0, -0.06, 0], "#a79b88");
    floor.transform.scale = [18, 0.12, 18];
    const disc = createDirectorObject("cylinder", t("miscPages.starterDirectorWall"), [0, 0.06, 0], "#6e6a63");
    disc.transform.scale = [2.8, 0.12 / 1.2, 2.8];
    const pillars = [
        [-2.2, 3.6],
        [2.2, 3.6],
        [-4.2, 0.3],
        [4.2, 0.3],
        [-3.6, -2.8],
        [3.6, -2.8],
        [-0.25, 5.25],
    ];
    const columns = pillars.map(([x, z], index) => {
        const prop = createDirectorObject("cylinder", `${t("miscPages.starterDirectorLamp")} ${index + 1}`, [x, 1.9, z], index === 6 ? "#bba88d" : "#c9baa5");
        const diameter = index === 6 ? 0.44 : 0.48;
        prop.transform.scale = [diameter, 3.8 / 1.2, diameter];
        return prop;
    });
    const keys = springTracks.map((key) => ({
        ...starterKeyframe(key.frame / 24, directorIdentityTransform([...key.position] as DirectorTransform["position"])),
        target: [...key.target] as DirectorTransform["position"],
    }));
    scene.cameras = [{ ...scene.cameras[0], fov: 48, focalLength: 18 / Math.tan((24 * Math.PI) / 180), transform: keys[0].transform, target: keys[0].target, keyframes: keys }];
    scene.objects = [floor, disc, ...columns, actor];
    scene.editorView = { position: [3.44, 2.89, 4.91], target: [0, 0.95, 0] };
    scene.shots = scene.shots.map((shot) => ({ ...shot, duration, fps: 24, aspectRatio: "16:9", cameraMove: "orbit_left", prompt: t("miscPages.starterDirectorPrompt") }));
    return scene;
}
