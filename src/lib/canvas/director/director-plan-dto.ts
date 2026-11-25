import type { DirectorScene, DirectorVec3, PrevisActionKind, PrevisCameraMove, PrevisCameraSide, PrevisFps, PrevisFraming } from "@/types/director";
import type { DirectorTemplateMetadata } from "./director-asset-registry";

export type PrevisPlanActor = { id: string; name: string };
export type PrevisPlanDto = {
    schemaVersion: 2;
    sceneTemplateId: string;
    fps: PrevisFps;
    actors: PrevisPlanActor[];
    actions: { id: string; actorId: string; kind: PrevisActionKind; startFrame: number; endFrameExclusive: number; destinationAnchor?: string; seatAnchor?: string }[];
    segments: {
        id: string;
        targetIds: string[];
        move: Exclude<PrevisCameraMove, "path">;
        side?: PrevisCameraSide;
        framing: PrevisFraming;
        range: [number, number];
        transitionIn: "cut" | "continuous";
        transitionFrames?: number;
        endRule?: { kind: "frame"; frame: number } | { kind: "actionEnd"; actionId: string; offsetFrames?: number };
    }[];
    warnings: string[];
};
export type PrevisPlanCompileContext = { actors?: readonly PrevisPlanActor[]; scene?: DirectorScene; sceneId?: string };

const unsafeText = /https?:|www\.|javascript:|data:|sk-|api[_ -]?key|access[_ -]?token|密钥|<[^>]*>|=>|\b(function|eval|import|exec)\b|[{}\x60]/i;
const idPattern = /^[a-zA-Z0-9_-]{1,80}$/;

function fail(code: string): never {
    throw new Error(`预演计划校验失败：${code}`);
}
function object(value: unknown, required: string[], optional: string[] = []): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) fail("invalid_object");
    const record = value as Record<string, unknown>;
    if (required.some((key) => !(key in record)) || Object.entries(record).some(([key, item]) => ![...required, ...optional].includes(key) || item === null || item === undefined)) fail("unknown_or_missing_field");
    return record;
}
function array(value: unknown, min: number, max: number): unknown[] {
    if (!Array.isArray(value) || value.length < min || value.length > max) fail("invalid_array");
    return value;
}
function text(value: unknown, max: number): string {
    if (typeof value !== "string" || !value.trim() || value.trim() !== value || [...value].length > max || /[\u0000-\u001f\u007f]/.test(value) || unsafeText.test(value)) fail("unsafe_text");
    return value;
}
function enumValue(value: unknown, values: readonly unknown[]) {
    if (!values.includes(value)) fail("unknown_enum");
}
function frame(value: unknown, maximum: number): number {
    if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > maximum) fail("frame_out_of_range");
    return value as number;
}

function crossesPolygon(a: DirectorVec3, b: DirectorVec3, polygon: [number, number][]): boolean {
    const cross = (p: number[], q: number[], r: number[]) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
    const start = [a[0], a[2]],
        end = [b[0], b[2]];
    const inside = ([x, z]: number[]) => {
        let result = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const u = polygon[i],
                v = polygon[j];
            if (u[1] > z !== v[1] > z && x < ((v[0] - u[0]) * (z - u[1])) / (v[1] - u[1]) + u[0]) result = !result;
        }
        return result;
    };
    return (
        inside(start) ||
        inside(end) ||
        polygon.some((c, i) => {
            const d = polygon[(i + 1) % polygon.length];
            if (Math.max(start[0], end[0]) < Math.min(c[0], d[0]) || Math.max(c[0], d[0]) < Math.min(start[0], end[0]) || Math.max(start[1], end[1]) < Math.min(c[1], d[1]) || Math.max(c[1], d[1]) < Math.min(start[1], end[1])) return false;
            return cross(start, end, c) * cross(start, end, d) <= 0 && cross(c, d, start) * cross(c, d, end) <= 0;
        })
    );
}

export function validatePlanDto(value: unknown, templates: readonly DirectorTemplateMetadata[], context: PrevisPlanCompileContext = {}): PrevisPlanDto {
    const dto = object(value, ["schemaVersion", "sceneTemplateId", "fps", "actors", "actions", "segments", "warnings"]);
    if (dto.schemaVersion !== 2) fail("schema_version");
    enumValue(dto.fps, [24, 25, 30]);
    const maximum = (dto.fps as number) * 60;
    const template = templates.find(({ id }) => id === dto.sceneTemplateId);
    if (!template) fail("unknown_template");
    const ids = new Set(template.objects.map(({ id }) => id));
    const id = (value: unknown): string => {
        if (typeof value !== "string" || !idPattern.test(value) || ids.has(value)) fail("duplicate_or_invalid_id");
        ids.add(value);
        return value;
    };
    const actors = array(dto.actors, 1, 16).map((value) => {
        const actor = object(value, ["id", "name"]);
        return { id: id(actor.id), name: text(actor.name, 160) };
    });
    if (new Set(actors.map(({ name }) => name)).size !== actors.length) fail("cast_identity");
    const inputActors = context.actors ?? context.scene?.objects.filter(({ kind }) => kind === "actor").map(({ id, name }) => ({ id, name }));
    if (inputActors !== undefined) {
        if (actors.length !== inputActors.length) fail("cast_count");
        if (actors.some((actor) => !inputActors.some((item) => item.id === actor.id && item.name === actor.name))) fail("cast_identity");
    }
    const allowed = inputActors ?? actors;
    const actorIds = new Set(actors.map(({ id }) => id));
    const actions = array(dto.actions, 0, 128).map((value) => {
        const action = object(value, ["id", "actorId", "kind", "startFrame", "endFrameExclusive"], ["destinationAnchor", "seatAnchor"]);
        id(action.id);
        if (!actorIds.has(action.actorId as string)) fail("unknown_actor");
        enumValue(action.kind, ["idle", "walk", "run", "turn", "sit"]);
        if (frame(action.endFrameExclusive, maximum) <= frame(action.startFrame, maximum)) fail("negative_duration");
        for (const key of ["destinationAnchor", "seatAnchor"]) if (key in action && (typeof action[key] !== "string" || !Object.hasOwn(template.anchors, action[key] as string))) fail("unknown_anchor");
        if (["walk", "run"].includes(action.kind as string) && !action.destinationAnchor) fail("missing_destination");
        if (action.destinationAnchor && (!["walk", "run"].includes(action.kind as string) || template.anchors[action.destinationAnchor as string].kind !== "ground")) fail("invalid_destination");
        if (action.seatAnchor && action.kind !== "sit") fail("invalid_seat_binding");
        return action as PrevisPlanDto["actions"][number];
    });
    actions.forEach((action, index) => {
        if (actions.slice(index + 1).some((other) => action.actorId === other.actorId && action.startFrame < other.endFrameExclusive && other.startFrame < action.endFrameExclusive)) fail("action_overlap");
    });
    let end = 0;
    const segments = array(dto.segments, 1, 64).map((value) => {
        const segment = object(value, ["id", "targetIds", "move", "framing", "range", "transitionIn"], ["side", "transitionFrames", "endRule"]);
        id(segment.id);
        enumValue(segment.move, ["fixed", "follow", "push", "pull", "orbit", "crane"]);
        enumValue(segment.framing, ["full", "half", "face", "group", "wide"]);
        if ("side" in segment) enumValue(segment.side, ["front", "back", "left", "right"]);
        enumValue(segment.transitionIn, ["cut", "continuous"]);
        const range = array(segment.range, 2, 2);
        if (frame(range[0], maximum) !== end) fail("segment_gap_or_overlap");
        const next = frame(range[1], maximum);
        if (next <= end) fail("negative_duration");
        const targets = array(segment.targetIds, 1, actors.length);
        if (targets.some((target) => !actorIds.has(target as string)) || new Set(targets).size !== targets.length) fail("unknown_actor");
        if ("transitionFrames" in segment && frame(segment.transitionFrames, next - end) === 0) fail("transition_out_of_range");
        end = next;
        if ("endRule" in segment) {
            const rule = object(segment.endRule, ["kind"], ["frame", "actionId", "offsetFrames"]);
            if (rule.kind === "frame") {
                object(rule, ["kind", "frame"]);
                if (frame(rule.frame, maximum) !== end) fail("invalid_end_rule");
            } else if (rule.kind === "actionEnd") {
                object(rule, ["kind", "actionId"], ["offsetFrames"]);
                const action = actions.find(({ id }) => id === rule.actionId);
                if (!action) fail("unknown_action");
                const offset = rule.offsetFrames ?? 0;
                if (!Number.isInteger(offset) || Math.abs(offset as number) > maximum || action.endFrameExclusive + (offset as number) !== end) fail("invalid_end_rule");
            } else fail("unknown_end_rule");
        }
        return segment as PrevisPlanDto["segments"][number];
    });
    if (actions.some((action) => action.endFrameExclusive > end)) fail("action_outside_sequence");
    array(dto.warnings, 0, 32).forEach((warning) => text(warning, 500));
    const positions = new Map(allowed.map((actor, index) => [actor.id, context.scene?.objects.find(({ id }) => id === actor.id)?.transform.position ?? template.actorSpawns[index]]));
    for (const position of positions.values()) if (!position || position.length !== 3 || position.some((value) => !Number.isFinite(value) || Math.abs(value) > 100)) fail("position_out_of_range");
    for (const action of actions.toSorted((a, b) => a.startFrame - b.startFrame)) {
        if (action.kind === "sit") {
            const anchor = template.anchors[action.seatAnchor ?? ""];
            if (!anchor || anchor.kind !== "seat" || !anchor.objectId) fail("seat_binding");
            positions.set(action.actorId, anchor.position);
        }
        if (action.destinationAnchor) {
            const destination = template.anchors[action.destinationAnchor].position;
            if (template.obstacles.some(({ polygon }) => crossesPolygon(positions.get(action.actorId)!, destination, polygon))) fail("path_blocked");
            positions.set(action.actorId, destination);
        }
    }
    actors.forEach((actor, index) => {
        for (const other of actors.slice(index + 1)) {
            const a = positions.get(actor.id)!,
                b = positions.get(other.id)!;
            if (Math.hypot(a[0] - b[0], a[2] - b[2]) < 0.6) fail("endpoint_overlap");
        }
    });
    segments.forEach((segment, index) => {
        if (index > 0 && segment.transitionIn === "continuous" && segment.transitionFrames === undefined && segment.targetIds.toSorted().join("\0") !== segments[index - 1].targetIds.toSorted().join("\0")) fail("continuous_target_change");
    });
    return value as PrevisPlanDto;
}
