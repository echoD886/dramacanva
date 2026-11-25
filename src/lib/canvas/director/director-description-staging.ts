import { nanoid } from "nanoid";
import type { DirectorLight, DirectorScene, DirectorVec3 } from "@/types/director";
import { createDirectorActor, createDirectorObject, createDirectorStudio, directorIdentityTransform, resolveDirectorAspectRatio } from "./director-scene-data";
import { sampleDirectorTransform } from "./director-playback";
import { rememberDirectorActors } from "./director-storyboard";
import { rememberDirectorStage } from "./director-timeline";

// Measure directions in the opening camera's coordinate system, with Y up.
export function lightDescriptionStage(scene: DirectorScene, text: string, authoredLights = false): DirectorScene {
    const dusk = /夕阳|夕陽|落日|日落|黄昏|黃昏|sunset|golden hour|夕日|노을|atardecer|pôr do sol/i.test(text);
    const soft = /柔光|柔和.{0,5}(光|影)|阴天|陰天|overcast|soft (?:light|shadow)|曇り|흐린|luz (?:suave|difusa)/i.test(text);
    const hard = /硬光|硬影|清晰.{0,3}(投影|阴影|陰影)|hard (?:light|shadow)|sharp shadow/i.test(text);
    const left = /左(?:侧|側|方|边|邊)?(?:的|からの)?[照打射日阳陽夕晨逆侧側光柔硬冷暖]|light from (?:the )?left|left (?:side )?(?:light|sun)/i.test(text);
    const right = /右(?:侧|側|方|边|邊)?(?:的|からの)?[照打射日阳陽夕晨逆侧側光柔硬冷暖]|light from (?:the )?right|right (?:side )?(?:light|sun)/i.test(text);
    const back = /逆光|背光|backlit|backlight|contraluz|contre-jour/i.test(text);
    const long = dusk || /长影|長影|长.{0,4}(投影|阴影)|long shadows?/i.test(text);
    if (!dusk && !soft && !hard && !left && !right && !back && !long) return scene;
    const camera = scene.cameras.find((c) => c.id === scene.shots[0]?.cameraId) ?? scene.cameras[0];
    if (!camera) return scene;
    const start = camera.keyframes?.[0]?.transform.position ?? camera.transform.position;
    const target = camera.keyframes?.[0]?.target ?? camera.target;
    const dx = start[0] - target[0],
        dz = start[2] - target[2];
    const distance = Math.hypot(dx, dz);
    const x = distance ? dx / distance : 0,
        z = distance ? dz / distance : 1;
    const side = right ? 1 : -1;
    const front = back ? -0.95 : 0.38;
    const lateral = back && !left && !right ? 0.15 : side;
    const direction: DirectorVec3 = [8 * (z * lateral + x * front), long ? 3 : soft ? 8 : 6, 8 * (-x * lateral + z * front)];
    const adjust = (lights: DirectorLight[]) => {
        if (authoredLights) return lights.map((light) => (light.castShadow ? { ...light, shadowRadius: soft ? 4 : hard || dusk ? 0.8 : 1.8 } : light));
        const rig = lights.some((light) => light.type === "directional") ? lights : [...lights, createDirectorStudio().lights[0]];
        const key = rig.find((light) => light.type === "directional");
        return rig.map((light) =>
            light === key
                ? { ...light, transform: { ...light.transform, position: direction }, castShadow: true, color: dusk ? "#ffcf91" : "#fff9ef", intensity: soft ? 1.45 : 2.8, shadowRadius: soft ? 4 : hard || dusk ? 0.8 : 1.8 }
                : { ...light, castShadow: false, intensity: light.type === "ambient" ? (soft ? 0.68 : 0.12) : Math.min(light.intensity, soft ? 0.55 : 0.18) },
        );
    };
    return {
        ...scene,
        stageLook: "studio",
        environmentIntensity: authoredLights ? scene.environmentIntensity : soft ? 0.8 : 0.28,
        lights: adjust(scene.lights),
        shots: scene.shots.map((shot) => (shot.stage ? { ...shot, stage: { ...shot.stage, lights: adjust(shot.stage.lights) } } : shot)),
        ...(scene.previs ? { previs: { ...scene.previs, segments: scene.previs.segments.map((segment) => (segment.initialStage ? { ...segment, initialStage: { ...segment.initialStage, lights: adjust(segment.initialStage.lights) } } : segment)) } } : {}),
    };
}

const movements = [
    ["crane_pull", /(?:升高|升起|上升)(?:并|並|同时|同時|后撤并)?(?:后撤|後撤|拉远|拉遠)|crane up (?:and|while) (?:pull(?:ing)? back|out)/gi],
    ["push_in", /推进|推進|推近|dolly in|push in|pushes in/gi],
    ["pull_out", /拉远|拉遠|后撤|後撤|pull(?:s)? (?:back|out)/gi],
    ["orbit_right", /(?:向右|右)(?:环绕|環繞)|(?:环绕|環繞)(?:向右)?|orbit(?:s)?(?: right)?/gi],
    ["orbit_left", /(?:向左|左)(?:环绕|環繞)|orbit(?:s)? left/gi],
    ["truck_left", /(?:向左|往左|从右向左|由右向左)(?:横移|橫移|平移|移动|移動)|左移|truck left|track left/gi],
    ["truck_right", /(?:向右|往右|从左向右|由左向右)(?:横移|橫移|平移|移动|移動)|右移|truck right|track right/gi],
    ["pedestal_down", /(?:机位|機位|镜头|鏡頭)?(?:降下|下降)|crane down/gi],
    ["pedestal_up", /升高|升起|升镜|升鏡|crane(?:s)? up|rise(?:s)?/gi],
] as const;

// Translate dramatic intent only when the user has left the camera direction open.
function dramaticIntent(text: string) {
    if (/气势|氣勢|威严|威嚴|霸气|霸氣|迫力|위엄|위풍|imponente|grandios[oa]|imposing|commanding|powerful entrance|heroic/i.test(text)) return "grand";
    if (/孤独|孤獨|孤单|孤單|渺小|寂寥|외로|고독|soledad|solidão|lonel(?:y|iness)|isolat(?:ed|ion)/i.test(text)) return "alone";
    if (/紧张|緊張|不安|压迫感|壓迫感|緊迫|긴장|불안|tensión|tensão|suspense|tension|uneasy/i.test(text)) return "tense";
    return undefined;
}

/** Turn ordered camera verbs into editable lens positions. Only invoked for the free text generator. */
export function blockDescriptionStage(scene: DirectorScene, text: string): DirectorScene {
    const shot = scene.shots[0];
    const camera = scene.cameras.find((c) => c.id === shot?.cameraId);
    if (!camera || !shot) return scene;
    let actors = scene.objects.filter((o) => o.kind === "actor" && o.visible);
    const subject = text.match(/舞者|演员|演員|人物|主角|少年|少女|ダンサー|댄서|bailar[ií]n[a]?|dançar(?:ino|ina)|摄影师|攝影師|\bdancer\b|\bperformer\b|\bphotographer\b/i)?.[0];
    if (!actors.length && subject) {
        const actor = createDirectorActor(subject, [0, 0, 0]);
        scene.objects.push(actor);
        actors = [actor];
    }
    const aim = (time: number): DirectorVec3 => {
        if (!actors.length) return [...camera.target];
        const sum: DirectorVec3 = [0, 0, 0];
        for (const actor of actors) {
            const p = sampleDirectorTransform(actor.transform, actor.keyframes, time, actor.motionPath).position;
            sum[0] += p[0];
            sum[1] += p[1] + 0.98 * (actor.actorProfile?.height ?? 1);
            sum[2] += p[2];
        }
        return sum.map((v) => v / actors.length) as DirectorVec3;
    };
    const cameraStart = text.search(/镜头|鏡頭|摄影机|攝影機|相机|相機|\bcamera\b/i);
    const cameraText = cameraStart < 0 ? text : text.slice(cameraStart);
    const candidates = movements.flatMap(([move, pattern]) => [...cameraText.matchAll(pattern)].map((m) => ({ move, at: m.index!, length: m[0].length }))).sort((a, b) => a.at - b.at || b.length - a.length);
    let end = -1;
    const phases = candidates.filter((m) => {
        if (m.at < end) return false;
        end = m.at + m.length;
        return true;
    });
    const foreground = text.match(/(?:前景|foreground)[^，。；,.\n]{0,16}?(石柱|立柱|柱子|柱體|柱体|门框|門框|树干|樹幹|column|pillar|tree trunk|doorframe)/i);
    const locked = /固定(?:机位|機位|镜头|鏡頭)|(?:镜头|鏡頭|摄影机|攝影機)(?:固定|不动|不動)|locked[ -]off|static camera/i.test(text);
    const lockedThroughout = /全程(?:固定|不动|不動)|固定(?:机位|機位|镜头|鏡頭).*(?:全程|不动|不動)|locked[ -]off throughout/i.test(cameraText);
    if (lockedThroughout || (locked && !phases.length)) {
        camera.keyframes = [];
        shot.cameraMove = "static";
    }
    const intent = !locked && !phases.length && shot.cameraMove === "static" && actors.length ? dramaticIntent(text) : undefined;
    if (intent) phases.push({ move: intent === "alone" ? "pull_out" : "push_in", at: 0, length: 0 });
    const low = intent === "grand" || /低位|低机位|低機位|贴地|貼地|low.angle|low camera/i.test(text);
    if (phases.length && !lockedThroughout) {
        const target = aim(0);
        const offset = camera.transform.position;
        let angle = Math.atan2(offset[0] - target[0], offset[2] - target[2]);
        let radius = Math.max(3, Math.hypot(offset[0] - target[0], offset[2] - target[2]));
        // Fit the subject to the actual lens and canvas, including wide exports.
        const wideOpening = /远景|遠景|大远景|大遠景|wide shot|long shot|establishing shot/i.test(text.slice(0, (cameraStart < 0 ? 0 : cameraStart) + phases[0].at + phases[0].length));
        const actorPush = phases[0].move === "push_in" && actors.length === 1 && !wideOpening;
        if (intent || actorPush) {
            const occupancy = intent === "alone" ? 0.7 : intent === "tense" ? 0.6 : 0.48;
            const subjectHeight = 1.8 * (actors[0].actorProfile?.height ?? 1);
            radius = subjectHeight / (2 * occupancy * Math.tan((camera.fov * Math.PI) / 360));
        }
        if (phases[0].move === "truck_right" && /从左向右|由左向右|左から右|left to right/i.test(cameraText)) angle -= Math.atan(0.3);
        if (phases[0].move === "truck_left" && /从右向左|由右向左|右から左|right to left/i.test(cameraText)) angle += Math.atan(0.3);
        let height = low ? -0.52 : 0.65;
        const key = (time: number, a: number, r: number, h: number) => {
            const focus = aim(time);
            return { id: nanoid(), time, target: focus, easing: "linear" as const, transform: directorIdentityTransform([focus[0] + Math.sin(a) * r, Math.max(0.15, focus[1] + h), focus[2] + Math.cos(a) * r]) };
        };
        camera.keyframes = [key(0, angle, radius, height)];
        phases.forEach(({ move }, i) => {
            const a = angle,
                r = radius,
                h = height;
            const sideways = move === "truck_left" || move === "truck_right";
            const travel = (move === "truck_left" ? -1 : 1) * Math.max(1.5, radius * 0.6);
            if (sideways) {
                angle += Math.atan2(travel, radius);
                radius = Math.hypot(travel, radius);
            }
            if (move === "orbit_left" || move === "orbit_right") {
                const turn = cameraText.slice(phases[i].at, phases[i + 1]?.at).match(/(\d+(?:\.\d+)?)\s*(?:°|度|degrees?)/i);
                const degrees = turn ? Math.min(360, Math.max(1, Number(turn[1]))) : 110;
                angle += ((move === "orbit_left" ? -1 : 1) * degrees * Math.PI) / 180;
            }
            if (move === "push_in") radius = Math.max(1.25, radius * (intent === "grand" ? 0.68 : intent === "tense" ? 0.74 : 0.48));
            if (move === "pull_out" || move === "crane_pull") radius *= 1.85;
            if (move === "pedestal_up" || move === "crane_pull") height += Math.max(2.1, radius * 0.65);
            if (move === "pedestal_down") height = Math.max(-0.7, height - Math.max(1.2, radius * 0.4));
            for (let step = 1; step <= 8; step++) {
                const u = step / 8,
                    smooth = phases.length === 1 ? u * u * (3 - 2 * u) : i === 0 ? u * u * (2 - u) : i === phases.length - 1 ? u + u * u - u * u * u : u;
                const azimuth = sideways ? a + Math.atan2(travel * smooth, r) : a + (angle - a) * smooth;
                const distance = sideways ? Math.hypot(r, travel * smooth) : r + (radius - r) * smooth;
                camera.keyframes.push(key((shot.duration * (i + u)) / phases.length, azimuth, distance, h + (height - h) * smooth));
            }
        });
        // Round the handoff between verbs while retaining the measured frame times and shot endpoints.
        for (let phase = 1; phase < phases.length; phase++) {
            const index = phase * 8;
            const [before, join, after] = camera.keyframes.slice(index - 1, index + 2).map((k) => k.transform.position);
            camera.keyframes[index].transform.position = join.map((value, axis) => (before[axis] + 2 * value + after[axis]) / 4) as DirectorVec3;
        }
        camera.transform = structuredClone(camera.keyframes[0].transform);
        camera.target = [...target];
        shot.cameraMove = phases[0].move === "crane_pull" ? "pedestal_up" : phases[0].move;
    }
    // Place paired columns either side of the opening sightline, leaving the actor visible.
    const columnPair = text.match(
        /(?:两侧|兩側|两旁|兩旁|左右)(?:各)?(?:有|立着|立著|站着|放着)?(?:一根|两根|兩根)?(?:石柱|柱子|立柱|圆柱|圓柱)|(?:pillars?|columns?) on (?:either|both) sides|colunas (?:dos dois|em ambos os) lados|columnas a ambos lados|両側に柱|양쪽에 기둥/i,
    );
    if (columnPair && !scene.objects.some((object) => object.primitive === "cylinder" && object.transform.scale[1] > object.transform.scale[0])) {
        const focus = aim(0);
        const [cx, , cz] = camera.transform.position;
        const dx = cx - focus[0],
            dz = cz - focus[2];
        const distance = Math.hypot(dx, dz) || 1;
        const aspect = resolveDirectorAspectRatio(shot.aspectRatio);
        const halfWidth = 0.75 * distance * Math.tan((camera.fov * Math.PI) / 360) * aspect;
        for (const sign of [-1, 1]) {
            const side = sign * Math.max(0.5, halfWidth * 0.85);
            const pillar = createDirectorObject("cylinder", columnPair[0] + (sign < 0 ? " L" : " R"), [focus[0] + dx * 0.25 + (side * dz) / distance, 1.55, focus[2] + dz * 0.25 - (side * dx) / distance], "#ad9d84");
            pillar.transform.scale = [0.32, 3.1 / 1.2, 0.32];
            scene.objects.push(pillar);
        }
    }
    if (foreground && !scene.objects.some((object) => object.name.includes(foreground[1]))) {
        const focus = aim(0),
            pos = camera.transform.position;
        const dx = pos[0] - focus[0],
            dz = pos[2] - focus[2],
            len = Math.hypot(dx, dz) || 1;
        const side = /右|right/i.test(foreground[0]) ? 1 : -1;
        const edge = side * 0.44;
        const box = /门|門|door/i.test(foreground[1]);
        const prop = createDirectorObject(box ? "box" : "cylinder", foreground[1], [focus[0] + dx * 0.57 + (dz / len) * edge, 1.55, focus[2] + dz * 0.57 - (dx / len) * edge], "#ad9d84");
        prop.transform.scale = [0.44, 3.1 / (box ? 1 : 1.2), 0.44];
        scene.objects.push(prop);
    }
    return rememberDirectorStage(rememberDirectorActors(scene));
}
