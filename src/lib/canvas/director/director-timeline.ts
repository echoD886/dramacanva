import { Color } from "three";
import { nanoid } from "nanoid";
import type { DirectorLight, DirectorScene, DirectorShot, DirectorObject } from "@/types/director";
import { sampleDirectorTransform } from "./director-playback";

/** Overview segments use the playback sampler, including delayed motion paths. */
export function directorActorSegments(actor: DirectorObject, duration: number) {
    const boundaries = [0, duration, ...actor.keyframes.map((frame) => frame.time), ...(actor.poseKeyframes || []).map((frame) => frame.time)];
    if (!actor.keyframes.length && actor.motionPath?.points.length) {
        const path = actor.motionPath;
        const distance = path.points.slice(1).reduce((sum, p, i) => sum + Math.hypot(...p.map((v, axis) => v - path.points[i][axis])), 0);
        boundaries.push(path.startDelay, path.startDelay + distance / { slow: .6, walk: 1.4, run: 3 }[path.speed]);
    }
    const times = [...new Set(boundaries.filter((time) => time >= 0 && time <= duration))].sort((a, b) => a - b);
    return times.slice(0, -1).map((start, i) => {
        const end = times[i + 1], a = sampleDirectorTransform(actor.transform, actor.keyframes, start, actor.motionPath).position, b = sampleDirectorTransform(actor.transform, actor.keyframes, end - .00001, actor.motionPath).position;
        return { start, end, moving: a.some((v, axis) => Math.abs(v - b[axis]) > .001) };
    });
}
import { interpolateDirectorTransform, resolveDirectorKeyframeProgress } from "./director-scene";

export function directorSequence(shots: DirectorShot[]) {
    let duration = 0;
    const clips = shots.map((shot) => {
        const start = duration;
        duration += Number.isFinite(shot.duration) && shot.duration > 0 ? shot.duration : 0.1;
        return { shot, start, end: duration };
    });
    return { clips, duration };
}

export function resolveDirectorSequenceTime(shots: DirectorShot[], time: number, loop = false) {
    const { clips, duration } = directorSequence(shots);
    if (!clips.length) return null;
    const safeTime = Number.isFinite(time) ? time : 0;
    const value = loop ? ((safeTime % duration) + duration) % duration : Math.max(0, Math.min(duration, safeTime));
    const clip = clips.find((item) => value < item.end) || clips[clips.length - 1];
    return { shotId: clip.shot.id, time: value - clip.start, globalTime: value, ended: !loop && safeTime >= duration };
}

/** Each shot owns its staging; playback never overwrites another shot's authored tracks. */
export function rememberDirectorStage(scene: DirectorScene): DirectorScene {
    const stage = structuredClone({ objects: scene.objects, lights: scene.lights });
    return { ...scene, shots: scene.shots.map((shot) => shot.id === scene.activeShotId || !shot.stage ? { ...shot, stage: structuredClone(stage) } : shot) };
}

export function switchDirectorShot(scene: DirectorScene, shotId: string): DirectorScene {
    const saved = rememberDirectorStage(scene);
    const shot = saved.shots.find((item) => item.id === shotId);
    if (!shot || shotId === scene.activeShotId) return scene;
    const stage = shot.stage ? structuredClone(shot.stage) : undefined;
    return { ...saved, ...stage, activeShotId: shotId };
}

export function sampleDirectorLight(light: DirectorLight, time: number): DirectorLight {
    const frames = (light.keyframes || []).toSorted((a, b) => a.time - b.time);
    if (!frames.length) return light;
    const before = frames.findLast((key) => key.time <= time) || frames[0];
    const after = frames.find((key) => key.time >= time) || frames[frames.length - 1];
    const p = before === after ? 0 : resolveDirectorKeyframeProgress((time - before.time) / (after.time - before.time), before.easing);
    return { ...light, transform: interpolateDirectorTransform(light.transform, frames, time), intensity: before.intensity + (after.intensity - before.intensity) * p, color: `#${new Color(before.color).lerp(new Color(after.color), p).getHexString()}` };
}

export function recordDirectorLight(light: DirectorLight, time: number, value = sampleDirectorLight(light, time)): DirectorLight {
    const prior = light.keyframes || [];
    const existing = prior.find((key) => Math.abs(key.time - time) < 0.001);
    const frame = { id: existing?.id || nanoid(), time, transform: structuredClone(value.transform), color: value.color, intensity: value.intensity, easing: existing?.easing };
    return { ...light, keyframes: [...prior.filter((key) => key.id !== existing?.id), frame].toSorted((a, b) => a.time - b.time) };
}
