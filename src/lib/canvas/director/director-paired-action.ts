import { nanoid } from "nanoid";
import { Euler, Quaternion } from "three";
import type { DirectorHumanoidBone, DirectorObject, DirectorQuat } from "@/types/director";

type Exchange = { from: string; to: string; kind: "strike" | "shove" };

// Resolve an explicit two-person action in each clause. Character bindings take
// precedence over inferred names. Do not turn idioms such as 打电话 into a cast.
export function pairedActions(text: string, cast: string[]): Exchange[] {
    const exchanges: Exchange[] = [];
    for (const raw of text.split(/[，。；,;.!?！？\n]/)) {
        const clause = raw.trim().replace(/^(?:随后|隨後|接着|接著|然后|然後)/, "");
        const match =
            clause.match(/^([\p{Script=Han}\w·-]{1,12}?)(?:向前|上前|上步|挥拳|揮拳|出拳|一拳)?(击打|擊打|打向|打中|推开|推開|猛推|拳击|拳擊|打)([\p{Script=Han}\w·-]{1,12})$/u) ??
            clause.match(/^([\p{L}][\p{L} '-]{0,30}?)\s+(punches|strikes|shoves|pushes)\s+([\p{L}][\p{L} '-]{0,30})$/iu);
        if (!match) continue;
        const from = cast.find((name) => name.toLowerCase() === match[1].toLowerCase()) ?? match[1];
        const to = cast.find((name) => name.toLowerCase() === match[3].toLowerCase()) ?? match[3];
        if (/镜头|鏡頭|摄影机|攝影機|灯光|燈光|阳光|陽光|聚光灯/.test(from) || from === to || /(?:不|没|沒|没有|沒有|想|要|正在)$/.test(from) || /^(电话|電話|招呼|哈欠|开|開|算|扫|掃|字|雷|球|鼓|喷嚏|噴嚏|量|听|聽)/.test(to)) continue;
        exchanges.push({ from, to, kind: /推|shove|push/i.test(match[2]) ? "shove" : "strike" });
    }
    return exchanges;
}

const stages = [0, 0.28, 0.48, 0.6, 0.76, 1] as const;
type Angles = readonly number[];
function animateBone(actor: DirectorObject, bone: DirectorHumanoidBone, angles: Angles, start: number, span: number, axis: "x" | "y" = "x") {
    actor.boneTracks ??= [];
    let track = actor.boneTracks.find((t) => t.bone === bone);
    if (!track) actor.boneTracks.push((track = { bone, keyframes: [] }));
    // Consecutive beats share their boundary key.
    track.keyframes = track.keyframes.filter((k) => k.time < start);
    stages.forEach((u, i) => {
        const e = new Euler(axis === "x" ? angles[i] : 0, axis === "y" ? angles[i] : 0, 0);
        track.keyframes.push({ id: nanoid(), time: start + u * span, rotation: new Quaternion().setFromEuler(e).toArray() as DirectorQuat, easing: "smooth" });
    });
}

export function stagePairedActions(objects: DirectorObject[], exchanges: Exchange[], duration: number) {
    const first = exchanges[0];
    if (!first) return;
    const pair = [first.from, first.to].map((name) => objects.find((o) => o.visible && o.kind === "actor" && o.name === name));
    if (!pair[0] || !pair[1]) return;
    const beats = exchanges.filter((e) => pair.some((o) => o?.name === e.from) && pair.some((o) => o?.name === e.to));
    const span = duration / beats.length;
    pair.forEach((actor, index) => {
        if (!actor) return;
        const side = index === 0 ? -1 : 1;
        const floor = actor.transform.position[1];
        actor.pose = "stand";
        actor.motionPath = undefined;
        actor.poseKeyframes = [];
        actor.keyframes = [];
        actor.boneTracks = [];
        beats.forEach((beat, n) => {
            const attacking = actor.name === beat.from;
            const start = n * span;
            const shove = beat.kind === "shove";
            const distances = attacking ? [0.76, 0.61, 0.22, 0.26, 0.49, 0.76] : [0.76, 0.71, 0.45, 0.69, 0.86, 0.76];
            stages.forEach((u, i) => {
                if (n && !i) return;
                const transform = structuredClone(actor.transform);
                transform.position = [side * distances[i], floor, side * 0.025];
                transform.rotation = [0, (-side * Math.PI) / 2, 0];
                actor.keyframes.push({ id: nanoid(), time: start + u * span, transform, easing: "smooth" });
            });
            const guard = [-0.55, -0.65, -0.75, -0.85, -0.65, -0.55];
            const block = [-1.65, -1.85, -2.15, -2.32, -1.85, -1.65];
            const upper = attacking ? [-0.55, 0.05, -1.68, -1.54, -0.75, -0.55] : guard;
            const lower = attacking ? [-1.65, -1.35, -1.68, -1.7, -1.88, -1.65] : block;
            animateBone(actor, "rightUpperArm", upper, start, span);
            animateBone(actor, "rightLowerArm", lower, start, span);
            animateBone(actor, "leftUpperArm", shove && attacking ? upper : guard, start, span);
            animateBone(actor, "leftLowerArm", shove && attacking ? lower : block, start, span);
            animateBone(actor, "chest", attacking ? [0, -0.33, 0.43, 0.34, 0.13, 0] : [0, 0, 0.05, -0.36, -0.22, 0], start, span, "y");
            animateBone(actor, "spine", attacking ? [0, -0.05, 0.2, 0.17, 0.1, 0] : [0, 0, 0, -0.32, -0.2, 0], start, span);
        });
        actor.transform = structuredClone(actor.keyframes[0].transform);
    });
}
