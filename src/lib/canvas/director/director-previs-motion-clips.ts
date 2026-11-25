import { AnimationMixer, Euler, LoopOnce, Matrix4, type AnimationClip, type Object3D, Quaternion, Vector3 } from "three";
import type { DirectorObject, DirectorTransform, DirectorVec3, PrevisActorAction, PrevisSequence } from "@/types/director";
import { sampleDirectorActorPose, sampleDirectorTransform } from "./director-playback";
import { getPathLength, samplePrevisActorPaths } from "./director-previs-path";
import { resolveNeutralMannequin } from "./director-mannequin";

export const PREVIS_ANIMATIONS_URL = "/canvas/models/mannequin/previs-animations.glb";
// 进入 walk/run 时世界位移立即开始，长淡变会让脚打滑，因此只用 6 帧。
export const PREVIS_MOVING_FADE_FRAMES = 6;
// 源片段中锁骨等几乎静止的骨骼自然角速度接近 0；没有下限就不允许任何收势。
// 24 fps 下 2°/帧 = 48°/s，对预演而言不会形成可见跳变。
// 每骨骼阈值为 max(两源片段自然最大角差的较大者 × 1.1, 2°/帧)。
export const PREVIS_MOTION_MIN_ANGLE_PER_FRAME = (2 * Math.PI) / 180;
// Walk → Idle 在 12–36 帧中最短全部通过为 15 帧：限制骨骼 lowerarm_r，
// 第 79→80 帧 4.020° ≤ 4.195°；14 帧时第 78→79 帧为 4.343° > 4.195°。短动作仍限制为长度的一半。
export const PREVIS_MOTION_FADE_FRAMES = 15;
const SITTING_FADE_FRAMES = 6;

// UAL v3.0 Standard RM：root 首末关键帧的 XZ 位移 / 时长，单位 m/s。
// Walk 两段各 1.3 m / 1.333333373 s；Jog 5 m / .933333337 s；Sprint 5.5 m / .666666687 s。
// RM 文件仅用于离线测量；运行时只加载原地版，世界位移由路线/关键帧独占。
export const PREVIS_MOTION_CLIPS = {
    Idle_Loop: { duration: 2.5, speed: 0 },
    Walk_Loop: { duration: 1.3333333730697632, speed: 0.9749999351799508 },
    Walk_Formal_Loop: { duration: 1.3333333730697632, speed: 0.9749999351799508 },
    Jog_Fwd_Loop: { duration: 0.9333333373069763, speed: 5.357142834334957 },
    Sprint_Loop: { duration: 0.6666666865348816, speed: 8.249999754130847 },
    Sitting_Enter: { duration: 1.2999999523162842, speed: 0 },
    Sitting_Idle_Loop: { duration: 1.6666666269302368, speed: 0 },
    Sitting_Exit: { duration: 1.0333333015441895, speed: 0 },
    Idle_Talking_Loop: { duration: 2.933333396911621, speed: 0 },
} as const;

export type PrevisMotionClip = keyof typeof PREVIS_MOTION_CLIPS;
// run 选择 |log(实际速度 / 自然速度)| 最小的片段；相等时选 Sprint。
// 分界 sqrt(5.3571428343 × 8.2499997541) = 6.648039340 m/s；walk 始终用 Walk_Loop。
export const PREVIS_RUN_SPRINT_SPEED = Math.sqrt(PREVIS_MOTION_CLIPS.Jog_Fwd_Loop.speed * PREVIS_MOTION_CLIPS.Sprint_Loop.speed);
export type PrevisMotionLayer = { clip: PrevisMotionClip; time: number; weight: number; loop: boolean };
type PrevisStartSupport = { clip: PrevisMotionClip; time: number; previous: PrevisMotionState; transform: DirectorTransform; previousTransform: DirectorTransform };
export type PrevisMotionState = { kind: PrevisActorAction["kind"]; layers: PrevisMotionLayer[]; yaw?: number; seatId?: string; startSupport?: PrevisStartSupport };

type MotionInput = { object: DirectorObject; sequence?: PrevisSequence; frame: number; fps: number; time?: number; objects?: DirectorObject[] };

function legacyActions(object: DirectorObject, fps: number): PrevisActorAction[] {
    const boundaries = new Set([0, ...(object.poseKeyframes ?? []).map((key) => key.time), ...object.keyframes.map((key) => key.time)]);
    if (object.motionPath && !object.keyframes.length) {
        const path = object.motionPath;
        boundaries.add(path.startDelay);
        boundaries.add(path.startDelay + path.points.slice(1).reduce((sum, point, index) => sum + new Vector3(...point).distanceTo(new Vector3(...path.points[index])), 0) / { slow: 0.6, walk: 1.4, run: 3 }[path.speed]);
    }
    const times = [...boundaries].filter((time) => time >= 0 && Number.isFinite(time)).sort((a, b) => a - b);
    times.push(Infinity);
    const actions: PrevisActorAction[] = [];
    for (let index = 0; index < times.length - 1; index++) {
        const pose = sampleDirectorActorPose(object, Number.isFinite(times[index + 1]) ? (times[index] + times[index + 1]) / 2 : times[index] + 1);
        const kind = pose === "walk" || pose === "run" || pose === "sit" ? pose : "idle";
        const previous = actions.at(-1);
        if (previous?.kind === kind) previous.endFrameExclusive = times[index + 1] * fps;
        else actions.push({ id: `pose-${index}`, actorId: object.id, kind, startFrame: times[index] * fps, endFrameExclusive: times[index + 1] * fps });
    }
    return actions;
}

export function samplePrevisMotion(input: MotionInput): PrevisMotionState {
    const { object, sequence, fps, objects } = input;
    const time = input.time ?? input.frame / fps;
    const authored = sequence?.actions.filter((action) => action.actorId === object.id).toSorted((a, b) => a.startFrame - b.startFrame) ?? [];
    const actions = authored.length ? authored : legacyActions(object, fps);
    // 无动作的空隙用 Idle，边界仍有独立的淡入淡出。
    const idle = (startFrame: number, endFrameExclusive: number): PrevisActorAction => ({ id: "idle-gap", actorId: object.id, kind: "idle", startFrame, endFrameExclusive });
    const timeline: PrevisActorAction[] = [];
    let end = 0;
    for (const action of actions) {
        if (action.startFrame > end) timeline.push(idle(end, action.startFrame));
        timeline.push(action);
        end = action.endFrameExclusive;
    }
    if (end < Infinity) timeline.push(idle(end, Infinity));
    const frame = authored.length ? input.frame : time * fps;
    let index = timeline.findIndex((action) => frame >= action.startFrame && frame < action.endFrameExclusive);
    if (index < 0) index = 0;
    const current = timeline[index];
    const pathFor = (action: PrevisActorAction) => {
        const path = sequence?.paths?.find((path) => path.id === action.pathId && path.ownerId === object.id && path.space === "world");
        return path && getPathLength(path) > 1e-6 ? path : undefined;
    };
    const phaseAt = (action: PrevisActorAction, atFrame: number, clip: PrevisMotionClip) => {
        const local = Math.max(0, atFrame - action.startFrame) / fps;
        const natural = PREVIS_MOTION_CLIPS[clip].speed;
        if (!natural) return local;
        const profile = resolveNeutralMannequin(object);
        const scaledSpeed = (natural * profile.height * Math.hypot(object.transform.scale[0], object.transform.scale[2])) / Math.SQRT2;
        const rate = (speed: number) => Math.max(0.5, Math.min(2, speed / Math.max(1e-6, scaledSpeed)));
        const path = pathFor(action);
        if (path) return local * rate((getPathLength(path) * fps) / Math.max(1, action.endFrameExclusive - 1 - action.startFrame));
        if (!object.keyframes.length && !object.motionPath) return local * 0.5;
        // 对绝对时间的速度积分，避免 smooth 关键帧变速时用「当前速度 × 总时间」造成倒相。
        // 固定 120 Hz 中点积分使跳帧与顺播使用完全相同的采样点。
        const startTime = authored.length ? time - (frame - action.startFrame) / fps : action.startFrame / fps;
        let phase = 0;
        for (let elapsed = 0; elapsed < local;) {
            const step = Math.min(1 / 120, local - elapsed);
            const at = startTime + elapsed + step / 2;
            const before = sampleDirectorTransform(object.transform, object.keyframes, at - 1e-4, object.motionPath).position;
            const after = sampleDirectorTransform(object.transform, object.keyframes, at + 1e-4, object.motionPath).position;
            phase += rate(Math.hypot(after[0] - before[0], after[2] - before[2]) / 2e-4) * step;
            elapsed += step;
        }
        return phase;
    };
    const layerAt = (action: PrevisActorAction, atFrame: number): PrevisMotionLayer[] => {
        const local = Math.max(0, atFrame - action.startFrame) / fps;
        const length = (action.endFrameExclusive - action.startFrame) / fps;
        const layer = (clip: PrevisMotionClip, time: number, loop = true, weight = 1): PrevisMotionLayer => ({ clip, time, loop, weight });
        if (action.kind === "sit") {
            if (!authored.length && !object.poseKeyframes?.length) return [layer("Sitting_Idle_Loop", local)];
            // 短动作等比例压缩进/出段，仍保留交叉过渡；长动作中段循环坐姿。
            const enter = PREVIS_MOTION_CLIPS.Sitting_Enter.duration;
            const exit = PREVIS_MOTION_CLIPS.Sitting_Exit.duration;
            const scale = Math.min(1, length / (enter + exit + SITTING_FADE_FRAMES / fps));
            const enterEnd = enter * scale,
                exitStart = length - exit * scale;
            const fade = Math.min(SITTING_FADE_FRAMES / fps, enterEnd, length - exitStart);
            if (local < enterEnd) {
                const weight = Math.max(0, (local - (enterEnd - fade)) / fade);
                return [layer("Sitting_Enter", local / scale, false, 1 - weight), layer("Sitting_Idle_Loop", 0, true, weight)];
            }
            if (Number.isFinite(length) && local >= exitStart - fade) {
                const weight = Math.min(1, Math.max(0, (local - exitStart + fade) / fade));
                return [layer("Sitting_Idle_Loop", local - enterEnd, true, 1 - weight), layer("Sitting_Exit", Math.max(0, local - exitStart) / scale, false, weight)];
            }
            return [layer("Sitting_Idle_Loop", local - enterEnd)];
        }
        if (action.kind === "walk" || action.kind === "run") {
            const path = pathFor(action);
            const startTime = time - (frame - action.startFrame) / fps,
                endTime = startTime + length;
            const times = [
                startTime,
                ...object.keyframes
                    .map((key) => key.time)
                    .filter((at) => at > startTime && at < endTime)
                    .sort((a, b) => a - b),
                endTime,
            ];
            let distance = 0;
            for (let index = 1; index < times.length; index++) {
                const from = sampleDirectorTransform(object.transform, object.keyframes, times[index - 1], object.motionPath).position;
                const to = sampleDirectorTransform(object.transform, object.keyframes, times[index], object.motionPath).position;
                distance += Math.hypot(to[0] - from[0], to[2] - from[2]);
            }
            const average = path ? getPathLength(path) / Math.max(1 / fps, length - 1 / fps) : !object.keyframes.length && object.motionPath ? { slow: 0.6, walk: 1.4, run: 3 }[object.motionPath.speed] : distance / length;
            const clip = action.kind === "walk" ? "Walk_Loop" : average < PREVIS_RUN_SPRINT_SPEED ? "Jog_Fwd_Loop" : "Sprint_Loop";
            return [layer(clip, phaseAt(action, atFrame, clip))];
        }
        return [layer("Idle_Loop", local)];
    };
    const currentLayers = layerAt(current, frame);
    let layers = currentLayers;
    const fadeFrames = current.kind === "walk" || current.kind === "run" ? PREVIS_MOVING_FADE_FRAMES : PREVIS_MOTION_FADE_FRAMES;
    const fade = Math.min(fadeFrames, (current.endFrameExclusive - current.startFrame) / 2);
    const previous = timeline[index - 1];
    if (previous && frame < current.startFrame + fade) {
        const progress = (frame - current.startFrame) / fade;
        const weight = progress * progress * (3 - 2 * progress);
        layers = [...layerAt(previous, previous.endFrameExclusive - 1).map((layer) => ({ ...layer, weight: layer.weight * (1 - weight) })), ...layers.map((layer) => ({ ...layer, weight: layer.weight * weight }))];
    }
    let yaw: number | undefined;
    for (const action of timeline.slice(0, index + 1)) {
        if (action.kind === "walk" || action.kind === "run") yaw = undefined;
        if (action.kind !== "turn" || !action.lookAtId) continue;
        const target = objects?.find((item) => item.id === action.lookAtId);
        if (target) {
            const atFrame = Math.min(frame, action.endFrameExclusive - 1);
            const startTime = time - (frame - action.startFrame) / fps;
            const from = sampleDirectorTransform(object.transform, object.keyframes, startTime, object.motionPath);
            const to = sampleDirectorTransform(target.transform, target.keyframes, time - (frame - atFrame) / fps, target.motionPath).position;
            const angle = Math.atan2(to[0] - from.position[0], to[2] - from.position[2]);
            const initial = yaw ?? from.rotation[1];
            const delta = Math.atan2(Math.sin(angle - initial), Math.cos(angle - initial));
            const progress = Math.min(1, Math.max(0, (atFrame - action.startFrame) / Math.max(1, action.endFrameExclusive - 1 - action.startFrame)));
            yaw = initial + delta * progress * progress * (3 - 2 * progress);
        }
    }
    const motion: PrevisMotionState = { kind: current.kind, layers: layers.filter((layer) => layer.weight > 0), ...(yaw === undefined ? {} : { yaw }), ...(current.seatId ? { seatId: current.seatId } : {}) };
    const moving = currentLayers.find((layer) => PREVIS_MOTION_CLIPS[layer.clip].speed > 0);
    if (moving && previous && current.startFrame >= 1 && moving.time <= PREVIS_MOTION_CLIPS[moving.clip].duration) {
        const previousFrame = current.startFrame - 1;
        const previousMotion = samplePrevisMotion({ ...input, frame: previousFrame, time: time - (frame - previousFrame) / fps });
        const transformAt = (atFrame: number, state: PrevisMotionState) => {
            const transform = structuredClone(sampleDirectorTransform(object.transform, object.keyframes, time - (frame - atFrame) / fps, object.motionPath));
            const sampled = sequence ? samplePrevisActorPaths({ [object.id]: { transform } }, sequence, atFrame)[object.id].transform : transform;
            if (state.yaw !== undefined) sampled.rotation[1] = state.yaw;
            return sampled;
        };
        // 连零权重的移动首帧也携带起步上下文；支撑相由播放器沿用源片段接触检测判断。
        motion.startSupport = { clip: moving.clip, time: moving.time, previous: previousMotion, transform: transformAt(frame, motion), previousTransform: transformAt(previousFrame, previousMotion) };
    }
    return motion;
}

type ContactPoint = { time: number; position: Vector3 };
type FootContact = { floor: number; centers: (ContactPoint & { start: ContactPoint; end: ContactPoint })[] };
const contactCache = new WeakMap<AnimationClip[], Map<string, Record<string, FootContact>>>();

function solvePlantedLeg(model: Object3D, side: string, target: Vector3) {
    const thigh = model.getObjectByName(`thigh_${side}`),
        calf = model.getObjectByName(`calf_${side}`),
        foot = model.getObjectByName(`foot_${side}`);
    if (!thigh?.parent || !calf?.parent || !foot?.parent) return;
    const hip = thigh.getWorldPosition(new Vector3()),
        knee = calf.getWorldPosition(new Vector3()),
        ankle = foot.getWorldPosition(new Vector3());
    const footRotation = foot.getWorldQuaternion(new Quaternion());
    const upper = knee.distanceTo(hip),
        lower = ankle.distanceTo(knee);
    const axis = target.clone().sub(hip);
    if (axis.lengthSq() < 1e-12) axis.copy(ankle).sub(hip);
    axis.normalize();
    const distance = Math.max(Math.abs(upper - lower) + 1e-6, Math.min(upper + lower - 1e-6, target.distanceTo(hip)));
    const along = (upper * upper - lower * lower + distance * distance) / (2 * distance);
    const bend = knee.clone().sub(hip).addScaledVector(axis, -knee.clone().sub(hip).dot(axis));
    if (bend.lengthSq() < 1e-12) {
        // 腿恰好伸直时用源骨骼朝向确定膝盖平面，避免零向量或随机反折。
        bend.set(0, 0, 1).applyQuaternion(thigh.getWorldQuaternion(new Quaternion()));
        bend.addScaledVector(axis, -bend.dot(axis));
        if (bend.lengthSq() < 1e-12) bend.set(Math.abs(axis.x) < 0.9 ? 1 : 0, Math.abs(axis.x) < 0.9 ? 0 : 1, 0).addScaledVector(axis, -(Math.abs(axis.x) < 0.9 ? axis.x : axis.y));
    }
    bend.normalize();
    const desiredKnee = hip
        .clone()
        .addScaledVector(axis, along)
        .addScaledVector(bend, Math.sqrt(Math.max(0, upper * upper - along * along)));
    const rotate = (bone: Object3D, from: Vector3, to: Vector3) => {
        const world = bone.getWorldQuaternion(new Quaternion()).premultiply(new Quaternion().setFromUnitVectors(from.normalize(), to.normalize()));
        bone.quaternion.copy(bone.parent!.getWorldQuaternion(new Quaternion()).invert().multiply(world));
        bone.updateWorldMatrix(false, true);
    };
    rotate(thigh, knee.sub(hip), desiredKnee.clone().sub(hip));
    const actualKnee = calf.getWorldPosition(new Vector3());
    rotate(calf, foot.getWorldPosition(new Vector3()).sub(actualKnee), hip.clone().addScaledVector(axis, distance).sub(actualKnee));
    foot.quaternion.copy(foot.parent.getWorldQuaternion(new Quaternion()).invert().multiply(footRotation));
    foot.updateWorldMatrix(false, true);
}

export function createPrevisMotionPlayer(model: Object3D, clips: AnimationClip[]) {
    const mixer = new AnimationMixer(model);
    const rest: { node: Object3D; position: Vector3; quaternion: Object3D["quaternion"]; scale: Vector3 }[] = [];
    model.traverse((node) => rest.push({ node, position: node.position.clone(), quaternion: node.quaternion.clone(), scale: node.scale.clone() }));
    // 相邻动作可能引用同名片段的不同相位，每层必须拥有独立 action。
    // React StrictMode 和热更新会先执行清理再复用同一个播放器，释放后再次求值时按需重建 action 与绑定。
    let slots: Map<string, ReturnType<AnimationMixer["clipAction"]>>[] | null = null;
    const ensureSlots = () => (slots ??= Array.from({ length: 4 }, () => new Map(clips.map((clip) => [clip.name, mixer.clipAction(clip.clone())]))));
    const contacts = contactCache.get(clips) ?? new Map<string, Record<string, FootContact>>();
    contactCache.set(clips, contacts);
    const evaluateLayers = (layers: PrevisMotionLayer[]) => {
        const actions = ensureSlots();
        mixer.stopAllAction();
        for (const { node, position, quaternion, scale } of rest) {
            node.position.copy(position);
            node.quaternion.copy(quaternion);
            node.scale.copy(scale);
        }
        layers.forEach((layer, index) => {
            const action = actions[index]?.get(layer.clip);
            if (!action) throw new Error(`缺少预演片段：${layer.clip}`);
            const duration = action.getClip().duration;
            action.reset().setLoop(LoopOnce, 1).setEffectiveWeight(layer.weight).play();
            action.clampWhenFinished = true;
            action.paused = true;
            action.time = layer.loop ? ((layer.time % duration) + duration) % duration : Math.max(0, Math.min(duration, layer.time));
        });
        // 时间已由绝对帧求出；零增量只提交权重与骨骼，不累积上一帧。
        mixer.update(0);
        model.updateWorldMatrix(true, true);
    };
    const measureContacts = (name: PrevisMotionClip) => {
        if (contacts.has(name)) return;
        const duration = PREVIS_MOTION_CLIPS[name].duration;
        const steps = Math.ceil(duration * 240);
        const samples: Record<string, Vector3[]> = { l: [], r: [] };
        for (let step = 0; step < steps; step++) {
            evaluateLayers([{ clip: name, time: (duration * step) / steps, loop: true, weight: 1 }]);
            for (const side of ["l", "r"]) {
                const foot = model.getObjectByName(`foot_${side}`);
                if (foot) samples[side].push(model.worldToLocal(foot.getWorldPosition(new Vector3())));
            }
        }
        const measured: Record<string, FootContact> = {};
        for (const [side, points] of Object.entries(samples)) {
            if (!points.length) continue;
            const floor = Math.min(...points.map((point) => point.y));
            const centers: FootContact["centers"] = [];
            // 从非支撑相开始遍历一周，使跨循环端点的支撑段也只有一个中心。
            const start = Math.max(
                0,
                points.findIndex((point) => point.y > floor + 0.02),
            );
            let begin = -1;
            for (let step = 0; step <= steps; step++) {
                const index = (start + step) % steps;
                const low = step < steps && points[index].y <= floor + 0.02;
                if (low && begin < 0) begin = step;
                if (!low && begin >= 0) {
                    const center = (start + Math.floor((begin + step - 1) / 2)) % steps;
                    const first = (start + begin) % steps,
                        last = (start + step - 1) % steps;
                    centers.push({ time: (center * duration) / steps, position: points[center], start: { time: (first * duration) / steps, position: points[first] }, end: { time: (last * duration) / steps, position: points[last] } });
                    begin = -1;
                }
            }
            measured[side] = { floor, centers };
        }
        contacts.set(name, measured);
    };
    const transformMatrix = (transform: DirectorTransform) => new Matrix4().compose(new Vector3(...transform.position), new Quaternion().setFromEuler(new Euler(...transform.rotation)), new Vector3(...transform.scale));
    const evaluate = (layers: PrevisMotionLayer[], startSupport?: PrevisStartSupport, evaluationTransform = startSupport ? transformMatrix(startSupport.transform) : undefined) => {
        const moving = layers.filter((layer) => PREVIS_MOTION_CLIPS[layer.clip].speed > 0).sort((a, b) => b.weight - a.weight)[0];
        if (moving) measureContacts(moving.clip);
        const anchors: Record<string, Vector3> = {};
        if (startSupport) {
            measureContacts(startSupport.clip);
            const duration = PREVIS_MOTION_CLIPS[startSupport.clip].duration;
            const planted = Object.entries(contacts.get(startSupport.clip)!).filter(([, contact]) =>
                contact.centers.some((center) => {
                    const span = (center.end.time - center.start.time + duration) % duration;
                    const fromStart = (duration - center.start.time) % duration;
                    // 只锁住包含起始相位 0 的这一次支撑相，后续循环不会重新触发。
                    return fromStart <= span + 1e-8 && startSupport.time <= ((center.end.time + duration) % duration) + 1e-8;
                }),
            );
            if (planted.length) {
                // 递归只向 startFrame - 1 回溯，不读取上次 evaluate 的骨骼或落脚点。
                evaluate(startSupport.previous.layers, startSupport.previous.startSupport, evaluationTransform);
                // 递归时实际父节点保持当前帧变换；用人物矩阵将前一帧落点换算到此坐标系。
                const mapping = evaluationTransform!.clone().multiply(transformMatrix(startSupport.transform).invert()).multiply(transformMatrix(startSupport.previousTransform)).multiply(evaluationTransform!.clone().invert());
                for (const [side] of planted) anchors[side] = model.getObjectByName(`foot_${side}`)!.getWorldPosition(new Vector3()).applyMatrix4(mapping);
            }
        }
        evaluateLayers(layers);
        // 起步首帧的移动层权重为 0；支撑脚仍立即以权重 1 锁定前一帧世界落点。
        for (const [side, anchor] of Object.entries(anchors)) solvePlantedLeg(model, side, anchor);
        if (!moving) return;
        const { duration, speed } = PREVIS_MOTION_CLIPS[moving.clip];
        const phase = ((moving.time % duration) + duration) % duration;
        // 片段决定姿态，双骨 IK 仅消除支撑相的原始残余漂移；不修改 root 或路径位移。
        // 以落地点为锚，落地时修正量为零；支撑段内锁定，离地后在半个摆腿周期内释放。
        // 中点锚会把整段残差提前施加到尚未落地的脚，导致膝关节骤然伸直。
        for (const [side, contact] of Object.entries(contacts.get(moving.clip)!)) {
            if (anchors[side]) continue;
            const foot = model.getObjectByName(`foot_${side}`)!;
            const position = model.worldToLocal(foot.getWorldPosition(new Vector3()));
            if (!contact.centers.length) continue;
            const delta = (time: number) => ((phase - time + duration * 1.5) % duration) - duration / 2;
            const candidates = contact.centers.map((center) => {
                const relative = (time: number) => ((time - center.time + duration * 1.5) % duration) - duration / 2;
                const phaseDelta = delta(center.time);
                const edge = phaseDelta < relative(center.start.time) ? center.start : phaseDelta > relative(center.end.time) ? center.end : null;
                const distance = edge ? Math.abs(phaseDelta - relative(edge.time)) : 0;
                const gap = edge ? Math.min(...contact.centers.map((other) => ((edge === center.start ? edge.time - other.end.time : other.start.time - edge.time) + duration) % duration)) : 0;
                return { center, phaseDelta, edge, distance, gap };
            });
            const { center, phaseDelta, edge, distance, gap } = candidates.reduce((nearest, item) => (item.distance < nearest.distance ? item : nearest));
            const progress = edge ? Math.max(0, 1 - distance / Math.max(1e-6, gap / 2)) : 1;
            const weight = moving.weight * progress * progress * (3 - 2 * progress);
            if (!weight) continue;
            const relative = (time: number) => ((time - center.time + duration * 1.5) % duration) - duration / 2;
            // 摆腿阶段只渐退支撑边缘的修正量，不把地面锁脚轨迹外推到空中的脚踝。
            const reference = edge?.position ?? position;
            const offset = new Vector3(center.start.position.x - reference.x, 0, center.start.position.z - speed * ((edge ? relative(edge.time) : phaseDelta) - relative(center.start.time)) - reference.z);
            position.addScaledVector(offset, weight);
            solvePlantedLeg(model, side, model.localToWorld(position));
        }
    };
    return {
        evaluate(layers: PrevisMotionLayer[], startSupport?: PrevisStartSupport) {
            evaluate(layers, startSupport);
        },
        dispose() {
            mixer.stopAllAction();
            mixer.uncacheRoot(model);
            slots = null;
        },
    };
}

export function alignPrevisPelvis(model: Object3D, seatPelvis: DirectorVec3) {
    const pelvis = model.getObjectByName("pelvis");
    if (!pelvis?.parent) return;
    pelvis.parent.updateWorldMatrix(true, false);
    pelvis.position.copy(pelvis.parent.worldToLocal(new Vector3(...seatPelvis)));
    model.updateWorldMatrix(true, true);
}
