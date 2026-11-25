import type { DirectorScene, DirectorVec3, PrevisCameraSegment, PrevisPathSpec } from "@/types/director";
import { clampDirectorRoutePoint, canAddDirectorRoutePoint, directorRouteArea, insertDirectorRoutePoint, moveDirectorRoutePoint, setDirectorRoutePath, prepareDirectorRouteChange, compileDirectorRouteChange } from "./director-route-editing";
import { setDirectorSegmentBoundary, updateDirectorSegment } from "./director-segment-settings";
import { validatePrevisSequence } from "./director-previs-sequence";

type CameraPatch = Partial<Pick<PrevisCameraSegment, "side" | "framing" | "transitionIn" | "transitionFrames">> & { move?: Exclude<PrevisCameraSegment["move"], "path"> };
export type PrevisEditIntent =
    | { op: "setSegmentBoundary"; leftSegmentId: string; rightSegmentId: string; frame: number }
    | ({ op: "setCameraIntent"; segmentId: string } & CameraPatch)
    | { op: "setCameraTarget"; segmentId: string; targetIds: string[] }
    | { op: "addPathPoint"; pathId: string; position: DirectorVec3 }
    | { op: "movePathPoint"; pathId: string; pointId: string; position: DirectorVec3 }
    | { op: "setPathTiming"; actionId: string; startFrame?: number; endFrameExclusive?: number; timingPolicy?: PrevisPathSpec["timingPolicy"] };
export type PrevisEditDto = { schemaVersion: 2; kind: "previsEdit"; baseRevision: number; intents: PrevisEditIntent[]; warnings: string[] };

const unsafeText = /https?:|www\.|javascript:|data:|sk-|api[_ -]?key|access[_ -]?token|密钥|<[^>]*>|=>|\b(function|eval|import|exec)\b|[{}\x60]/i;
function fail(code: string): never {
    throw new Error(`预演修改校验失败：${code}`);
}
function record(value: unknown, required: string[], optional: string[] = []): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) fail("invalid_object");
    const item = value as Record<string, unknown>;
    if (required.some((key) => !Object.hasOwn(item, key)) || Object.entries(item).some(([key, value]) => ![...required, ...optional].includes(key) || value === null || value === undefined)) fail("unknown_or_missing_field");
    return item;
}
function integer(value: unknown) {
    if (!Number.isSafeInteger(value) || (value as number) < 0) fail("frame_out_of_range");
}
function parseEdit(value: unknown): PrevisEditDto {
    const dto = record(value, ["schemaVersion", "kind", "baseRevision", "intents", "warnings"]);
    if (dto.schemaVersion !== 2 || dto.kind !== "previsEdit") fail("schema_version_or_kind");
    integer(dto.baseRevision);
    if (!Array.isArray(dto.intents) || dto.intents.length < 1 || dto.intents.length > 16 || !Array.isArray(dto.warnings) || dto.warnings.length > 32) fail("invalid_array");
    for (const warning of dto.warnings) if (typeof warning !== "string" || !warning.trim() || warning !== warning.trim() || [...warning].length > 500 || /\p{Cc}/u.test(warning) || unsafeText.test(warning)) fail("unsafe_text");
    const shapes: Record<string, [string[], string[]]> = {
        setSegmentBoundary: [["leftSegmentId", "rightSegmentId", "frame"], []],
        setCameraIntent: [["segmentId"], ["move", "side", "framing", "transitionIn", "transitionFrames"]],
        setCameraTarget: [["segmentId", "targetIds"], []],
        addPathPoint: [["pathId", "position"], []],
        movePathPoint: [["pathId", "pointId", "position"], []],
        setPathTiming: [["actionId"], ["startFrame", "endFrameExclusive", "timingPolicy"]],
    };
    for (const raw of dto.intents) {
        if (!raw || typeof raw !== "object" || Array.isArray(raw) || !Object.hasOwn(shapes, raw.op)) fail("unknown_op");
        const [required, optional] = shapes[raw.op];
        const item = record(raw, ["op", ...required], optional);
        if (optional.length && !optional.some((key) => key in item)) fail("empty_intent");
        for (const [key, field] of Object.entries(item)) {
            if (key.endsWith("Id") && (typeof field !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(field) || unsafeText.test(field))) fail("invalid_id");
            if (["frame", "startFrame", "endFrameExclusive", "transitionFrames"].includes(key)) integer(field);
        }
        const enums: Record<string, string[]> = {
            move: ["fixed", "follow", "push", "pull", "orbit", "crane"],
            side: ["front", "back", "left", "right"],
            framing: ["full", "half", "face", "group", "wide"],
            transitionIn: ["cut", "continuous"],
            timingPolicy: ["keepDuration", "keepSpeed"],
        };
        for (const [key, allowed] of Object.entries(enums)) if (key in item && !allowed.includes(item[key] as string)) fail("unknown_enum");
        if (
            "position" in item &&
            (!Array.isArray(item.position) ||
                item.position.length !== 3 ||
                item.position.some((number) => typeof number !== "number" || !Number.isFinite(number)) ||
                item.position[1] !== 0 ||
                Math.abs(item.position[0]) > 100 ||
                Math.abs(item.position[2]) > 100)
        )
            fail("position_out_of_range");
        if (
            "targetIds" in item &&
            (!Array.isArray(item.targetIds) ||
                !item.targetIds.length ||
                item.targetIds.length > 16 ||
                item.targetIds.some((id) => typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(id) || unsafeText.test(id)) ||
                new Set(item.targetIds).size !== item.targetIds.length)
        )
            fail("unknown_or_duplicate_target");
    }
    return value as PrevisEditDto;
}

function applyEdit(scene: DirectorScene, dto: PrevisEditDto): { scene: DirectorScene; warnings: string[] } {
    const sequence = scene.previs;
    if (!sequence || sequence.revision !== dto.baseRevision) fail("stale_revision");
    const actors = scene.objects.filter((object) => object.kind === "actor").map((object) => object.id);
    const touched = new Set<string>(),
        warnings = [...dto.warnings];
    let next = scene;
    const touch = (key: string) => {
        if (touched.has(key)) fail("conflicting_intents");
        touched.add(key);
    };
    const segment = (id: string) => {
        const found = next.previs!.segments.find((segment) => segment.id === id);
        if (!found) fail("unknown_segment");
        if (found.legacyShotId) fail("legacy_segment");
        return found;
    };
    const route = (id: string) => {
        const path = next.previs!.paths?.find((path) => path.id === id);
        if (!path) fail("unknown_path");
        const actions = next.previs!.actions.filter((action) => action.pathId === id);
        if (path.space !== "world" || !actors.includes(path.ownerId) || !actions.length || actions.some((action) => action.actorId !== path.ownerId)) fail("actor_path_required");
        if (path.points.some((point) => point.position[1] !== 0 || point.position.some((value) => !Number.isFinite(value) || Math.abs(value) > 100))) fail("position_out_of_range");
        return { path, actions };
    };
    const compileRoute = (actionId: string) => {
        const prepared = prepareDirectorRouteChange(next, actionId);
        if (prepared.affectedSegmentIds.some((id) => next.previs!.segments.find((segment) => segment.id === id)?.legacyShotId)) fail("legacy_segment");
        const groups: string[] = [];
        for (const id of prepared.affectedSegmentIds) {
            const last = groups.at(-1);
            if (last && [...last, ...id].length + 1 <= 480) groups[groups.length - 1] += `、${id}`;
            else groups.push(id);
        }
        for (const group of groups) {
            const warning = `路线时序影响段落：${group}`;
            if (!warnings.includes(warning)) warnings.push(warning);
        }
        if (warnings.length > 32) fail("warnings_too_large");
        next = compileDirectorRouteChange(prepared.scene);
    };
    for (const intent of dto.intents) {
        const before = next;
        switch (intent.op) {
            case "setSegmentBoundary": {
                const left = segment(intent.leftSegmentId),
                    right = segment(intent.rightSegmentId);
                touch(`segment:${left.id}:endFrameExclusive`);
                touch(`segment:${left.id}:endRule`);
                touch(`segment:${right.id}:startFrame`);
                if (right.transitionFrames !== undefined && right.transitionFrames > right.endFrameExclusive - intent.frame) touch(`segment:${right.id}:transitionFrames`);
                next = setDirectorSegmentBoundary(next, left.id, right.id, intent.frame);
                break;
            }
            case "setCameraIntent": {
                const current = segment(intent.segmentId);
                const { op: _, segmentId: __, ...patch } = intent;
                for (const field of Object.keys(patch)) touch(`segment:${current.id}:${field}`);
                if (patch.transitionFrames !== undefined && patch.transitionFrames > current.endFrameExclusive - current.startFrame) fail("transition_out_of_range");
                next = updateDirectorSegment(next, current.id, patch);
                break;
            }
            case "setCameraTarget":
                segment(intent.segmentId);
                touch(`segment:${intent.segmentId}:targetIds`);
                if (intent.targetIds.some((id) => !actors.includes(id))) fail("unknown_actor");
                next = updateDirectorSegment(next, intent.segmentId, { targetIds: intent.targetIds });
                break;
            case "addPathPoint":
            case "movePathPoint": {
                const { path, actions } = route(intent.pathId);
                const area = directorRouteArea(scene.objects);
                const clamped = clampDirectorRoutePoint(intent.position, area);
                if (!clamped || clamped.some((value, axis) => value !== intent.position[axis]) || !canAddDirectorRoutePoint(intent.position, area)) fail("outside_walkable_area");
                let id: string;
                if (intent.op === "movePathPoint") {
                    id = intent.pointId;
                    if (!path.points.some((point) => point.id === id)) fail("unknown_point");
                    touch(`point:${path.id}:${id}`);
                } else {
                    let suffix = 1;
                    const ids = new Set([
                        scene.id,
                        ...scene.objects.map(({ id }) => id),
                        ...scene.cameras.map(({ id }) => id),
                        ...scene.lights.map(({ id }) => id),
                        ...scene.shots.map(({ id }) => id),
                        ...next.previs!.actions.map(({ id }) => id),
                        ...next.previs!.segments.map(({ id }) => id),
                        ...next.previs!.paths!.flatMap((item) => [item.id, ...item.points.map(({ id }) => id)]),
                    ]);
                    do {
                        id = `${path.id.slice(0, 64)}-ai-${suffix++}`;
                    } while (ids.has(id));
                    touch(`point:${path.id}:${id}`);
                }
                const updated = intent.op === "addPathPoint" ? insertDirectorRoutePoint(path, intent.position, id, area) : moveDirectorRoutePoint(path, id, intent.position, area);
                next = setDirectorRoutePath(next, actions[0].id, updated, true);
                for (const action of actions) compileRoute(action.id);
                break;
            }
            case "setPathTiming": {
                touch(`action:${intent.actionId}`);
                const action = next.previs!.actions.find((action) => action.id === intent.actionId);
                if (!action) fail("unknown_action");
                const { path } = route(action.pathId ?? "");
                const { op: _, actionId: __, timingPolicy, ...patch } = intent;
                if ((timingPolicy ?? path.timingPolicy) !== "keepSpeed") {
                    if ((patch.endFrameExclusive ?? action.endFrameExclusive) <= (patch.startFrame ?? action.startFrame)) fail("frame_out_of_range");
                    if ((patch.endFrameExclusive ?? action.endFrameExclusive) > next.previs!.segments.at(-1)!.endFrameExclusive) fail("action_outside_sequence");
                }
                next = { ...next, previs: { ...next.previs!, actions: next.previs!.actions.map((item) => (item.id === action.id ? { ...item, ...patch } : item)) } };
                if (timingPolicy !== undefined) next = setDirectorRoutePath(next, action.id, { ...path, timingPolicy }, true);
                compileRoute(action.id);
                break;
            }
        }
        // 编译器克隆整个场景；这里只接纳命令产出的序列与派生镜头，保留场景实体引用。
        next = { ...scene, shots: next.shots, cameras: next.cameras, activeShotId: next.activeShotId, previs: next.previs };
        const reuse = <T extends { id: string }>(items: T[], originals: T[]) =>
            items.map((item) => {
                const original = originals.find(({ id }) => id === item.id);
                return original && JSON.stringify(original) === JSON.stringify(item) ? original : item;
            });
        next.shots = reuse(next.shots, before.shots);
        next.cameras = reuse(next.cameras, before.cameras);
        const segments = next.previs!.segments.map((segment) => {
            const original = before.previs!.segments.find(({ id }) => id === segment.id);
            return original?.initialStage && JSON.stringify(original.initialStage) === JSON.stringify(segment.initialStage) ? { ...segment, initialStage: original.initialStage } : segment;
        });
        next.previs = {
            ...next.previs!,
            revision: sequence.revision + 1,
            segments: reuse(segments, before.previs!.segments),
            actions: reuse(next.previs!.actions, before.previs!.actions),
            ...(next.previs!.paths ? { paths: reuse(next.previs!.paths, before.previs!.paths ?? []) } : {}),
        };
        for (const segment of next.previs.segments) {
            const previous = before.previs!.segments.find(({ id }) => id === segment.id);
            if (previous?.legacyShotId && JSON.stringify(segment) !== JSON.stringify(previous)) fail("legacy_segment");
            if (segment.transitionFrames !== undefined && segment.transitionFrames > segment.endFrameExclusive - segment.startFrame) fail("transition_out_of_range");
        }
        const total = next.previs.segments.at(-1)?.endFrameExclusive ?? 0;
        for (const action of next.previs.actions) {
            if (action.startFrame < 0 || action.endFrameExclusive <= action.startFrame || action.endFrameExclusive > total) fail("action_outside_sequence");
            if (next.previs.actions.some((other) => other.id !== action.id && other.actorId === action.actorId && action.startFrame < other.endFrameExclusive && other.startFrame < action.endFrameExclusive)) fail("action_overlap");
        }
        const diagnostics = validatePrevisSequence(next.previs, { actorIds: actors });
        if (diagnostics.length) fail(diagnostics[0].code);
    }
    return { scene: next, warnings };
}

export function validatePlanEditDto(value: unknown, scene: DirectorScene): PrevisEditDto {
    const dto = parseEdit(value);
    applyEdit(scene, dto);
    return dto;
}

export function applyPrevisEditIntents(scene: DirectorScene, value: PrevisEditDto): { scene: DirectorScene; warnings: string[] } {
    return applyEdit(scene, parseEdit(value));
}
