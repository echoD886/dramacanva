import type { StoryboardRow } from "@/types/canvas";
import type { DirectorScene, DirectorShotSize } from "@/types/director";
import type { PrevisGroundType, PrevisObject, PrevisVec3 } from "@/types/previs";
import { directorToWorldEngine, worldEngineToDirector } from "./director/director-world-engine";
import { resolvePrevisCatalogProp } from "./previs/previs-prop-catalog";
import { buildPrevisLightFromPreset, PREVIS_LIGHT_PRESETS } from "./previs/previs-add-catalog";
import { createPrevisCatalogProp } from "./previs/previs-scene";
import { PREVIS_DEFAULT_WORLD, PREVIS_TIME_PRESETS } from "./previs/previs-world";
import { previsAspectValue } from "./previs/previs-optics";

export function dramaShotSize(text: string): DirectorShotSize {
    if (/大特写|大特寫|extreme.close/i.test(text)) return "extreme_close_up";
    if (/大远景|大遠景|extreme.wide/i.test(text)) return "extreme_wide";
    if (/特写|特寫|近景|close/i.test(text)) return "close_up";
    if (/全景|full/i.test(text)) return "full";
    if (/远景|遠景|wide|long shot/i.test(text)) return "wide";
    return "medium";
}

// Set dressing is expressed in metres, relative to the actor's mark. Each
// catalog piece remains individually editable after the first handoff.
type SetPiece = [prop: string, x: number, z: number];
type SetDesign = { cue: RegExp; ground?: PrevisGroundType; pieces: SetPiece[] };
const sets: SetDesign[] = [
    {
        cue: /书房|書房|殿内|殿內|宫殿|大殿|palace interior|scholar.s study/i,
        pieces: [
            ["room", 0, -0.6],
            ["desk", 0.45, -0.4],
            ["bookshelf", -1.7, -2.6],
            ["column", 1.6, -2],
            ["lantern_pole", -0.3, -2.6],
        ],
    },
    {
        cue: /城门|城門|古街|集市|古镇|古鎮|ancient street|city gate/i,
        ground: "warm",
        pieces: [
            ["city_gate", 0, -23],
            ["market_stall", -3.6, -3],
            ["ancient_shop", 7, -10],
            ["lantern_pole", 2.8, -4],
        ],
    },
    {
        cue: /森林|林间|林間|树林|松林|forest|woodland/i,
        ground: "forest",
        pieces: [
            ["tree_pine", -5.7, -3.5],
            ["tree_broadleaf", 3, -4],
            ["tree_pine", 0, -9],
            ["tree_pine", -4.5, -6],
            ["bush", 1.5, -1.5],
            ["rock", -1.3, -1.7],
        ],
    },
    {
        cue: /海边|海邊|海滩|海灘|beach|seashore/i,
        ground: "sand",
        pieces: [
            ["tree_palm", -2.5, -3],
            ["tree_palm", 4, -6],
            ["rock", 1.5, -2],
        ],
    },
    {
        cue: /办公室|辦公室|office/i,
        pieces: [
            ["room", 0, -0.6],
            ["desk", -0.4, -1],
            ["chair", -0.1, -1.55],
            ["potted_plant", -1.6, -0.9],
            ["desk", -1.9, -2.6],
            ["chair", -1.8, -2.1],
        ],
    },
    {
        cue: /卧室|臥室|bedroom/i,
        pieces: [
            ["room", 0, -0.6],
            ["bed", 1.4, -1.6],
            ["bookshelf", -1.9, -2.5],
        ],
    },
    {
        cue: /街道|街口|公交站|巴士站|street|bus stop/i,
        ground: "city",
        pieces: [
            ["shop_front", -3.5, -10],
            ["apartment", 6, -25],
            ["street_lamp", 2.7, -2],
            ["bus_stop", -2.5, -3.5],
            ["road", 0, -8],
        ],
    },
];

// Vertical field covered by each shot at the subject plane (metres).
const framingHeight: Record<DirectorShotSize, number> = { extreme_wide: 8, wide: 4, full: 2.3, medium: 1.45, close_up: 0.82, extreme_close_up: 0.45 };

function stageNamedAction(actor: PrevisObject, props: PrevisObject[], action: string) {
    const walking = actor.pose === "walk" || actor.pose === "run";
    const targetPhrase = walking ? action : action.match(/(?:望向|看向|指向|指着|towards?|looks? at|points? at)\s*([^，。；,.!]+)/i)?.[1];
    if (!targetPhrase) return;
    const [x, y, z] = actor.transform.position;
    const candidates = props
        .map((object) => ({
            object,
            at: Math.max(targetPhrase.lastIndexOf(object.name), targetPhrase.toLowerCase().lastIndexOf(object.propId!.replaceAll("_", " "))),
            distance: Math.hypot(object.transform.position[0] - x, object.transform.position[2] - z),
        }))
        .filter((item) => item.at >= 0);
    const mark = candidates.sort((a, b) => b.at - a.at || a.distance - b.distance)[0];
    if (!mark || mark.distance < 0.01) return;
    const dx = mark.object.transform.position[0] - x,
        dz = mark.object.transform.position[2] - z;
    const yaw = Math.atan2(dx, dz);
    if (walking) {
        const length = Math.max(0, mark.distance - 1);
        // Locomotion comes from the translation keys. At the hold, return to a standing pose.
        if (/停步|停下|站定|comes? to a stop|stops?\b/i.test(action)) actor.pose = "stand";
        actor.transform.rotation[1] = yaw;
        for (const [index, frame] of actor.keyframes.entries()) {
            frame.transform.rotation[1] = yaw;
            if (index) frame.transform.position = [x + (dx / mark.distance) * length, y, z + (dz / mark.distance) * length];
        }
    } else if (actor.keyframes.length) {
        actor.keyframes.at(-1)!.transform.rotation[1] = yaw;
    } else if (actor.pose === "reach") actor.transform.rotation[1] = yaw;
}

export function buildDramaPrevisScene(scene: DirectorScene, row: StoryboardRow): DirectorScene {
    const world = directorToWorldEngine(scene);
    const shot = world.shots[0];
    const camera = world.cameras.find((item) => item.id === shot.cameraId)!;
    const description = row.plotDescription;
    const set = sets.find((item) => item.cue.test(description.split("\n")[0]));
    if (set) {
        world.objects = world.objects.filter((object) => object.kind === "actor" || object.sourceNodeId || object.assetId || object.storageKey);
        for (const [id, x, z] of set.pieces) {
            const entry = resolvePrevisCatalogProp(id)!;
            const object = createPrevisCatalogProp({ propId: id, name: entry.name, color: world.background });
            object.transform.position = [x, 0, z];
            world.objects.push(object);
        }
        world.gridVisible = false;
        if (set.ground) {
            const night = /夜|night/i.test(description);
            const weather = /雪|snow/i.test(description) ? "snow" : /雨|rain/i.test(description) ? "rain" : PREVIS_DEFAULT_WORLD.weather;
            world.world = { ...PREVIS_DEFAULT_WORLD, ground: weather === "snow" ? "snow" : set.ground, weather, timeOfDay: night ? PREVIS_TIME_PRESETS.find((preset) => preset.label === "夜晚")!.value : PREVIS_DEFAULT_WORLD.timeOfDay };
        }
    }
    const actors = world.objects.filter((object) => object.kind === "actor" && object.visible);
    const props = world.objects.filter((object) => object.propId);
    for (const actor of actors) {
        const action = actors.length === 1 ? row.performanceBlocking : row.performanceBlocking.split(/[。;；.!]/).find((clause) => clause.includes(actor.name));
        if (action) stageNamedAction(actor, props, action);
    }
    if (actors.length) {
        // Practical fill is local to this generated set. Compensate inverse-square falloff
        // at the subject plane so the face remains legible beneath the night sky.
        if (set) {
            const key = PREVIS_LIGHT_PRESETS.find((preset) => preset.id === "warm")!;
            const fill = buildPrevisLightFromPreset(key, world.lights.length);
            const mark = actors[0].transform.position;
            fill.transform.position = [mark[0] + 1.4, mark[1] + 2.6, mark[2] + 2];
            fill.intensity *= Math.pow(Math.hypot(1.4, 1, 2), 2);
            fill.castShadow = false;
            world.lights.push(fill);
        }
        const xs = actors.flatMap((actor) => [actor.transform.position[0], ...actor.keyframes.map((frame) => frame.transform.position[0])]);
        const min = Math.min(...xs),
            max = Math.max(...xs);
        const height = framingHeight[shot.shotSize];
        const distance = Math.max(height, (max - min + 0.8) / previsAspectValue(shot.aspectRatio)) / (2 * Math.tan((camera.fov * Math.PI) / 360));
        const seated = actors.every((actor) => actor.pose === "sit");
        const eyeHeight = seated ? 1.12 : 1.65;
        const y = Math.max(seated ? 0.65 : 0.95, eyeHeight - height * 0.28);
        const side = /侧|側|side/i.test(row.camera) ? Math.PI / 5 : 0;
        const x = (min + max) / 2;
        const z = actors.reduce((sum, actor) => sum + actor.transform.position[2], 0) / actors.length;
        const position: PrevisVec3 = [x + distance * Math.sin(side), y + distance * (/俯|high.angle/i.test(row.camera) ? 0.55 : /仰|low.angle/i.test(row.camera) ? -0.18 : 0.06), z + distance * Math.cos(side)];
        const previous = camera.transform.position;
        for (const frame of camera.keyframes) frame.transform.position = frame.transform.position.map((value, axis) => value + position[axis] - previous[axis]) as PrevisVec3;
        camera.transform.position = position;
        camera.target = [x, y, z];
    }
    return worldEngineToDirector(scene, world);
}
