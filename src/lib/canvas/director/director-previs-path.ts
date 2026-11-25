import type { DirectorObject, DirectorTransform, DirectorVec3, PrevisActionKind, PrevisActorAction, PrevisFps, PrevisPathSpec, PrevisSequence } from "@/types/director";
import { resolvePrevisSegmentBoundaries, type PrevisDiagnostic } from "./director-previs-sequence";

export type PrevisPathArcTable = {
    samples: { position: DirectorVec3; distance: number }[];
    length: number;
    diagnostics: PrevisDiagnostic[];
};
export type PrevisPathSample = { position: DirectorVec3; tangent: DirectorVec3; rotation: DirectorVec3 };
export type PrevisPathArea = {
    walkableArea: { outline: [number, number][]; holes: [number, number][][] };
    obstacles: { objectId: string; assetId: string; polygon: [number, number][] }[];
};
export type PrevisPathAreaIssue = { kind: "obstacle" | "outside_walkable"; obstacleId?: string; fromProgress: number; toProgress: number };

const EPSILON = 1e-9;
const ARC_STEP = 0.02;
const ACTOR_RADIUS = 0.25;

function distance(a: DirectorVec3, b: DirectorVec3): number {
    return Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
}

function mix(a: DirectorVec3, b: DirectorVec3, progress: number): DirectorVec3 {
    return a.map((value, axis) => value + (b[axis] - value) * progress) as DirectorVec3;
}

function smoothSegment(p0: DirectorVec3, p1: DirectorVec3, p2: DirectorVec3, p3: DirectorVec3, progress: number): DirectorVec3 {
    // 向心节点间隔为距离的平方根；重复端点用相邻间隔，避免零分母。
    const dt1 = Math.sqrt(distance(p1, p2));
    const dt0 = Math.sqrt(distance(p0, p1)) || dt1;
    const dt2 = Math.sqrt(distance(p2, p3)) || dt1;
    const result: DirectorVec3 = [0, 0, 0];
    for (const axis of [0, 1, 2]) {
        const m1 = dt1 * ((p1[axis] - p0[axis]) / dt0 - (p2[axis] - p0[axis]) / (dt0 + dt1) + (p2[axis] - p1[axis]) / dt1);
        const m2 = dt1 * ((p2[axis] - p1[axis]) / dt1 - (p3[axis] - p1[axis]) / (dt1 + dt2) + (p3[axis] - p2[axis]) / dt2);
        const delta = p2[axis] - p1[axis];
        result[axis] = p1[axis] + progress * (m1 + progress * (3 * delta - 2 * m1 - m2 + progress * (-2 * delta + m1 + m2)));
    }
    return result;
}

export function buildPathArcTable(path: PrevisPathSpec, includeHeight = false): PrevisPathArcTable {
    const diagnostics: PrevisDiagnostic[] = [];
    if (path.space !== "world") diagnostics.push({ code: "path_space_unsupported", message: "暂不支持目标局部坐标路径", path: "space" });
    if (path.points.length < 2) diagnostics.push({ code: "path_too_short", message: "路径至少需要两个点", path: "points" });
    if (diagnostics.length) return { samples: [], length: 0, diagnostics };
    const points: DirectorVec3[] = [];
    for (const { position } of path.points) {
        if (!(includeHeight ? position : [position[0], position[2]]).every(Number.isFinite)) {
            return { samples: [], length: 0, diagnostics: [{ code: "path_point_invalid", message: includeHeight ? "路径坐标必须为有限数值" : "路径地面坐标必须为有限数值", path: "points" }] };
        }
        const point: DirectorVec3 = [position[0], includeHeight ? position[1] : 0, position[2]];
        if (!points.length || distance(points[points.length - 1], point) > EPSILON) points.push(point);
    }
    const samples = [{ position: points[0], distance: 0 }];
    let length = 0;
    for (let index = 0; index < points.length - 1; index += 1) {
        const p1 = points[index];
        const p2 = points[index + 1];
        const segmentStart = length;
        const segmentLength = distance(p1, p2);
        const at = (progress: number) => (path.interpolation === "linear" ? mix(p1, p2, progress) : smoothSegment(points[index - 1] ?? p1, p1, p2, points[index + 2] ?? p2, progress));
        let estimate = 0;
        let previous = p1;
        for (let step = 1; step <= 16; step += 1) {
            const position = at(step / 16);
            estimate += distance(previous, position);
            previous = position;
        }
        const steps = Math.max(16, Math.ceil(estimate / ARC_STEP));
        for (let step = 1; step <= steps; step += 1) {
            const position = step === steps ? ([...p2] as DirectorVec3) : at(step / steps);
            const delta = distance(samples[samples.length - 1].position, position);
            if (delta <= EPSILON) continue;
            length = path.interpolation === "linear" ? segmentStart + (segmentLength * step) / steps : length + delta;
            samples.push({ position, distance: length });
        }
    }
    return { samples, length, diagnostics };
}

export function samplePathAtProgress(table: PrevisPathArcTable, progress: number): PrevisPathSample | null {
    if (!table.samples.length) return null;
    const target = Math.max(0, Math.min(1, progress)) * table.length;
    let low = 1;
    let high = table.samples.length - 1;
    while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (table.samples[mid].distance < target) low = mid + 1;
        else high = mid;
    }
    const end = table.samples[Math.min(low, table.samples.length - 1)];
    const start = table.samples[Math.max(0, low - 1)];
    const span = end.distance - start.distance;
    const chord = distance(start.position, end.position);
    const tangent: DirectorVec3 = chord > EPSILON ? (end.position.map((value, axis) => (value - start.position[axis]) / chord) as DirectorVec3) : [0, 0, 0];
    return { position: mix(start.position, end.position, span > EPSILON ? (target - start.distance) / span : 0), tangent, rotation: [0, Math.atan2(tangent[0], tangent[2]), 0] };
}

export function samplePathAtFrame(path: PrevisPathSpec, action: PrevisActorAction, frame: number): PrevisPathSample | null {
    const span = action.endFrameExclusive - 1 - action.startFrame;
    // 单帧动作在唯一一帧到达终点，动作开始前仍停在起点。
    const progress = span > 0 ? (frame - action.startFrame) / span : frame < action.startFrame ? 0 : 1;
    return samplePathAtProgress(buildPathArcTable(path), progress);
}

export function getPathLength(path: PrevisPathSpec): number {
    return buildPathArcTable(path).length;
}

function actionSpeed(kind: PrevisActionKind): number | null {
    return kind === "walk" ? 1.4 : kind === "run" ? 3 : null;
}

export function resolveKeepSpeedFrames(path: PrevisPathSpec, kind: PrevisActionKind, fps: PrevisFps): number {
    const speed = actionSpeed(kind);
    if (speed === null) throw new Error("只有步行和跑步动作支持按速度计算时长");
    return Math.max(1, Math.ceil((getPathLength(path) / speed) * fps));
}

export function applyPathTimingPolicy(sequence: PrevisSequence, actionId: string): { sequence: PrevisSequence; affectedSegmentIds: string[]; diagnostics: PrevisDiagnostic[] } {
    const index = sequence.actions.findIndex((action) => action.id === actionId);
    const action = sequence.actions[index];
    const unchanged = (diagnostics: PrevisDiagnostic[] = []) => ({ sequence, affectedSegmentIds: [], diagnostics });
    if (!action) return unchanged([{ code: "unknown_action", message: "路径时序引用的动作不存在", path: "actions" }]);
    if (action.pathId === undefined) return unchanged();
    const path = sequence.paths?.find((path) => path.id === action.pathId);
    const location = `actions[${index}].pathId`;
    if (!path) return unchanged([{ code: "unknown_path", message: "动作引用的路径不存在", path: location }]);
    if (path.ownerId !== action.actorId) return unchanged([{ code: "path_owner_mismatch", message: "路径所属人物与动作人物不一致", path: location }]);
    const table = buildPathArcTable(path);
    if (table.diagnostics.length) return unchanged(table.diagnostics.map((diagnostic) => ({ ...diagnostic, path: `paths[${sequence.paths!.indexOf(path)}].${diagnostic.path}` })));
    const speed = actionSpeed(action.kind);
    if (speed === null) return unchanged([{ code: "path_action_unsupported", message: "只有步行和跑步动作支持路径时序调整", path: `actions[${index}].kind` }]);
    if (path.timingPolicy !== "keepSpeed") {
        const averageSpeed = (table.length * sequence.fps) / (action.endFrameExclusive - action.startFrame);
        return unchanged(averageSpeed > speed * 1.3 || averageSpeed < speed * 0.5 ? [{ code: "gait_speed_mismatch", message: "路线平均速度与动作不匹配，请检查步态", path: location }] : []);
    }
    const actions = sequence.actions.map((item, actionIndex) => (actionIndex === index ? { ...item, endFrameExclusive: item.startFrame + resolveKeepSpeedFrames(path, item.kind, sequence.fps) } : item));
    const before = resolvePrevisSegmentBoundaries(sequence).sequence;
    const resolved = resolvePrevisSegmentBoundaries({ ...sequence, actions });
    const affectedSegmentIds = resolved.sequence.segments
        .filter((segment, segmentIndex) => {
            const previous = before.segments[segmentIndex];
            const incomingBoundaryChanged = segmentIndex > 0 && resolved.sequence.segments[segmentIndex - 1].endFrameExclusive !== before.segments[segmentIndex - 1].endFrameExclusive;
            return incomingBoundaryChanged || segment.startFrame !== previous.startFrame || segment.endFrameExclusive !== previous.endFrameExclusive;
        })
        .map((segment) => segment.id);
    return { ...resolved, affectedSegmentIds };
}

function distanceToPolygon(point: [number, number], polygon: [number, number][]): number {
    let nearest = Infinity;
    for (let index = 0; index < polygon.length; index += 1) {
        const a = polygon[index];
        const b = polygon[(index + 1) % polygon.length];
        const dx = b[0] - a[0];
        const dz = b[1] - a[1];
        const squared = dx * dx + dz * dz;
        const progress = squared > 0 ? Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dz) / squared)) : 0;
        nearest = Math.min(nearest, Math.hypot(point[0] - a[0] - dx * progress, point[1] - a[1] - dz * progress));
    }
    return nearest;
}

function insidePolygon([x, z]: [number, number], polygon: [number, number][]): boolean {
    let inside = false;
    for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
        const a = polygon[index];
        const b = polygon[previous];
        if (a[1] > z !== b[1] > z && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
    }
    return inside;
}

export function checkPathAgainstArea(path: PrevisPathSpec, area: PrevisPathArea): PrevisPathAreaIssue[] {
    const table = buildPathArcTable(path);
    if (!table.samples.length) return [];
    const steps = Math.max(1, Math.ceil(table.length / 0.05));
    const issues: PrevisPathAreaIssue[] = [];
    const active = new Map<string, PrevisPathAreaIssue>();
    for (let step = 0; step <= steps; step += 1) {
        const progress = step / steps;
        const { position } = samplePathAtProgress(table, progress)!;
        const point: [number, number] = [position[0], position[2]];
        const { outline, holes } = area.walkableArea;
        const problems: { kind: PrevisPathAreaIssue["kind"]; obstacleId?: string }[] = [];
        if (!insidePolygon(point, outline) || distanceToPolygon(point, outline) < ACTOR_RADIUS || holes.some((hole) => insidePolygon(point, hole) || distanceToPolygon(point, hole) < ACTOR_RADIUS)) {
            problems.push({ kind: "outside_walkable" });
        }
        for (const obstacle of area.obstacles) {
            if (insidePolygon(point, obstacle.polygon) || distanceToPolygon(point, obstacle.polygon) < ACTOR_RADIUS) problems.push({ kind: "obstacle", obstacleId: obstacle.objectId });
        }
        const current = new Set<string>();
        for (const problem of problems) {
            const key = JSON.stringify([problem.kind, problem.obstacleId]);
            current.add(key);
            const previous = active.get(key);
            if (previous) previous.toProgress = progress;
            else {
                const issue = { ...problem, fromProgress: progress, toProgress: progress };
                issues.push(issue);
                active.set(key, issue);
            }
        }
        for (const key of active.keys()) if (!current.has(key)) active.delete(key);
    }
    return issues;
}

export function motionPathToPathSpec(object: Pick<DirectorObject, "id" | "motionPath">): PrevisPathSpec | null {
    if (!object.motionPath) return null;
    return {
        id: `${object.id}-path`,
        ownerId: object.id,
        space: "world",
        interpolation: "linear",
        timingPolicy: "keepSpeed",
        points: object.motionPath.points.map((position, index) => ({ id: `${object.id}-path-point-${index}`, position: [...position] })),
    };
}

export function samplePrevisActorPaths<T extends { transform: DirectorTransform }>(actors: Record<string, T>, sequence: PrevisSequence, frame: number): Record<string, T> {
    const sampled = { ...actors };
    for (const [actorId, state] of Object.entries(actors)) {
        let latest: PrevisActorAction | undefined;
        for (const action of sequence.actions) {
            if (action.actorId === actorId && action.pathId !== undefined && action.startFrame <= frame && (!latest || action.startFrame > latest.startFrame)) latest = action;
        }
        const path = latest && sequence.paths?.find((path) => path.id === latest.pathId);
        if (!path || path.ownerId !== actorId || path.space !== "world") continue;
        const sample = samplePathAtFrame(path, latest!, frame);
        if (!sample) continue;
        const transform = state.transform;
        sampled[actorId] = {
            ...state,
            transform: {
                ...transform,
                position: [sample.position[0], transform.position[1], sample.position[2]],
                rotation: [transform.rotation[0], Math.hypot(sample.tangent[0], sample.tangent[2]) > EPSILON ? sample.rotation[1] : transform.rotation[1], transform.rotation[2]],
            },
        };
    }
    return sampled;
}
