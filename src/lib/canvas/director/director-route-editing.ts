import type { DirectorObject, DirectorScene, DirectorVec3, PrevisPathSpec } from "@/types/director";
import { getDirectorAsset, SUBWAY_PLATFORM_TEMPLATE } from "./director-asset-registry";
import { sampleDirectorTransform } from "./director-playback";
import { applyPathTimingPolicy, buildPathArcTable, checkPathAgainstArea, motionPathToPathSpec, samplePathAtProgress, type PrevisPathArcTable, type PrevisPathArea } from "./director-previs-path";
import { compilePrevisToDirectorShots } from "./director-sequence-compiler";
import { directorWorkbenchSequence } from "./director-workbench-layout";

export function resolveDirectorRoute(scene: DirectorScene, actorId: string | null, frame: number) {
    const sequence = directorWorkbenchSequence(scene);
    const action = sequence.actions.find((item) => item.actorId === actorId && item.startFrame <= frame && frame < item.endFrameExclusive && (item.kind === "walk" || item.kind === "run"));
    if (!action) return null;
    const segment = sequence.segments.find((item) => item.startFrame <= frame && frame < item.endFrameExclusive);
    const shot = scene.shots.find((item) => item.id === segment?.legacyShotId);
    const objects = shot?.stage?.objects ?? segment?.initialStage?.objects ?? scene.objects;
    const actor = objects.find((item) => item.id === actorId && item.kind === "actor" && item.visible);
    if (!actor) return null;
    const existing = sequence.paths?.find((item) => item.id === action.pathId && item.ownerId === actorId && item.space === "world");
    if (action.pathId && !existing) return null;
    const path = existing ?? createRoutePath(actor, action.id, action.startFrame, action.endFrameExclusive, sequence.fps, shot || segment?.initialStage ? segment!.startFrame : 0, sequence.paths ?? []);
    return { action, path, area: directorRouteArea(objects) };
}

function createRoutePath(actor: DirectorObject, actionId: string, start: number, end: number, fps: number, offset: number, paths: PrevisPathSpec[]): PrevisPathSpec {
    let id = `${actionId}-route`;
    while (paths.some((path) => path.id === id)) id += "-next";
    const migrated = motionPathToPathSpec(actor);
    // 起止关键帧的终点在 endFrameExclusive 处；新路径在最后一个有效帧到达同一终点。
    const positions = migrated?.points.map((point) => point.position) ?? [start, end].map((frame) => sampleDirectorTransform(actor.transform, actor.keyframes, (frame - offset) / fps).position);
    return { id, ownerId: actor.id, space: "world", interpolation: "linear", timingPolicy: "keepDuration", points: positions.map((position, index) => ({ id: `${id}-${index}`, position: [position[0], 0, position[2]] })) };
}

export function directorRouteArea(objects: DirectorObject[]): PrevisPathArea | undefined {
    // P12 未保存 templateId；以站台专属柱件和地面共同识别模板，单独的柱子不推断可走区。
    const ground = objects.find((object) => object.visible && (object.id === "platform-ground" || (object.primitive === "box" && object.transform.scale.every((value, axis) => value === [16, 0.2, 6][axis]) && object.transform.position[1] === -0.1)));
    if (!ground || !objects.some((object) => object.stageProp === "platform-column")) return undefined;
    const project = ([x, z]: [number, number], object: DirectorObject, sx = object.transform.scale[0], sz = object.transform.scale[2]): [number, number] => {
        const yaw = object.transform.rotation[1];
        return [object.transform.position[0] + x * sx * Math.cos(yaw) + z * sz * Math.sin(yaw), object.transform.position[2] - x * sx * Math.sin(yaw) + z * sz * Math.cos(yaw)];
    };
    const obstacles = objects
        .filter((object) => object.visible && (object.stageProp === "platform-column" || object.stageProp === "bench"))
        .map((object) => {
            const asset = getDirectorAsset(object.stageProp!)!;
            return {
                objectId: object.id,
                assetId: asset.id,
                polygon: (
                    [
                        [asset.localBounds.min[0], asset.localBounds.min[2]],
                        [asset.localBounds.max[0], asset.localBounds.min[2]],
                        [asset.localBounds.max[0], asset.localBounds.max[2]],
                        [asset.localBounds.min[0], asset.localBounds.max[2]],
                    ] as [number, number][]
                ).map((point) => project(point, object)),
            };
        });
    return { walkableArea: { outline: SUBWAY_PLATFORM_TEMPLATE.walkableArea.outline.map((point) => project(point, ground, ground.transform.scale[0] / 16, ground.transform.scale[2] / 6)), holes: obstacles.map((obstacle) => obstacle.polygon) }, obstacles };
}

export function clampDirectorRoutePoint(point: DirectorVec3, area?: PrevisPathArea): DirectorVec3 | null {
    if (!point.every(Number.isFinite)) return null;
    if (!area?.walkableArea.outline.length) return [point[0], 0, point[2]];
    const xs = area.walkableArea.outline.map(([x]) => x),
        zs = area.walkableArea.outline.map(([, z]) => z);
    return [Math.max(Math.min(...xs), Math.min(Math.max(...xs), point[0])), 0, Math.max(Math.min(...zs), Math.min(Math.max(...zs), point[2]))];
}

export function moveDirectorRoutePoint(path: PrevisPathSpec, pointId: string, point: DirectorVec3, area?: PrevisPathArea): PrevisPathSpec {
    const position = clampDirectorRoutePoint(point, area);
    const previous = path.points.find((item) => item.id === pointId);
    if (!position || !previous || previous.position.every((value, axis) => value === position[axis])) return path;
    return { ...path, points: path.points.map((item) => (item.id === pointId ? { ...item, position } : item)) };
}

export function insertDirectorRoutePoint(path: PrevisPathSpec, point: DirectorVec3, pointId: string, area?: PrevisPathArea, includeHeight = false): PrevisPathSpec {
    const position = includeHeight ? (point.every(Number.isFinite) ? ([...point] as DirectorVec3) : null) : clampDirectorRoutePoint(point, area);
    if (!position || path.points.some((item) => item.id === pointId)) return path;
    // 用相同采样器寻找平滑曲线最近位置，再映射到相邻控制点的插入槽。
    const table = buildPathArcTable(path, includeHeight);
    if (!table.samples.length) return path;
    let nearest = 0,
        distance = Infinity;
    table.samples.forEach((sample, index) => {
        const delta = Math.hypot(sample.position[0] - position[0], sample.position[1] - position[1], sample.position[2] - position[2]);
        if (delta < distance) {
            distance = delta;
            nearest = index;
        }
    });
    let slot = 1;
    const indices = routeControlIndices(path, table, includeHeight);
    for (let index = 1; index < indices.length - 1; index += 1) if (nearest >= indices[index]) slot = index + 1;
    return { ...path, points: [...path.points.slice(0, slot), { id: pointId, position }, ...path.points.slice(slot)] };
}

function routeControlIndices(path: PrevisPathSpec, table: PrevisPathArcTable, includeHeight = false): number[] {
    const indices = [0];
    let cursor = 0;
    for (const { position } of path.points.slice(1, -1)) {
        let closest = cursor,
            delta = Infinity;
        for (let sample = cursor; sample < table.samples.length; sample += 1) {
            const at = table.samples[sample].position;
            const candidate = Math.hypot(at[0] - position[0], includeHeight ? at[1] - position[1] : 0, at[2] - position[2]);
            if (candidate < delta) {
                delta = candidate;
                closest = sample;
            }
        }
        cursor = closest;
        indices.push(cursor);
    }
    return [...indices, table.samples.length - 1];
}

export function deleteDirectorRoutePoint(path: PrevisPathSpec, pointId: string): PrevisPathSpec {
    const index = path.points.findIndex((item) => item.id === pointId);
    return index <= 0 || index === path.points.length - 1 ? path : { ...path, points: path.points.filter((item) => item.id !== pointId) };
}

export function setDirectorRoutePath(scene: DirectorScene, actionId: string, path: PrevisPathSpec, preserveSharedPath = false): DirectorScene {
    if (scene.previs?.actions.find((action) => action.id === actionId)?.pathId === path.id && scene.previs.paths?.find((item) => item.id === path.id) === path) return scene;
    const sequence = directorWorkbenchSequence(scene);
    if (!sequence.actions.some((action) => action.id === actionId && action.actorId === path.ownerId)) return scene;
    if (!preserveSharedPath && sequence.actions.some((action) => action.id !== actionId && action.pathId === path.id)) {
        let id = `${actionId}-route`;
        while (sequence.paths?.some((item) => item.id === id)) id += "-next";
        path = { ...path, id };
    }
    const paths = preserveSharedPath && sequence.paths?.some((item) => item.id === path.id) ? sequence.paths.map((item) => (item.id === path.id ? path : item)) : [...(sequence.paths ?? []).filter((item) => item.id !== path.id), path];
    return { ...scene, previs: { ...sequence, actions: sequence.actions.map((action) => (action.id === actionId ? { ...action, pathId: path.id } : action)), paths } };
}

export function prepareDirectorRouteChange(scene: DirectorScene, actionId: string) {
    const result = applyPathTimingPolicy(directorWorkbenchSequence(scene), actionId);
    const errors = result.diagnostics.filter((item) => item.code !== "gait_speed_mismatch");
    if (errors.length) throw new Error(errors.map((item) => item.message).join("\n"));
    return { ...result, scene: { ...scene, previs: result.sequence } };
}

export function compileDirectorRouteChange(scene: DirectorScene): DirectorScene {
    const sequence = directorWorkbenchSequence(scene);
    const result = compilePrevisToDirectorShots(scene, { ...sequence, revision: sequence.revision + 1 });
    const errors = result.diagnostics.filter((item) => item.code !== "lens_approximated");
    if (errors.length) throw new Error(errors.map((item) => item.message).join("\n"));
    return result.scene;
}

export function requestDirectorRouteChange(
    scene: DirectorScene,
    actionId: string,
    hooks: {
        confirm: (segments: { id: string; name: string }[], apply: () => void) => void;
        apply: (scene: DirectorScene) => void;
        isCurrent: () => boolean;
    },
) {
    const prepared = prepareDirectorRouteChange(scene, actionId);
    let applied = false;
    const apply = () => {
        if (applied || !hooks.isCurrent()) return;
        applied = true;
        hooks.apply(compileDirectorRouteChange(prepared.scene));
    };
    const action = prepared.sequence.actions.find((item) => item.id === actionId);
    const path = prepared.sequence.paths?.find((item) => item.id === action?.pathId);
    if (path?.timingPolicy !== "keepSpeed") {
        apply();
        return;
    }
    hooks.confirm(
        prepared.affectedSegmentIds.map((id) => {
            const segment = prepared.sequence.segments.find((item) => item.id === id)!;
            return { id, name: scene.shots.find((shot) => shot.id === (segment.shotId ?? segment.legacyShotId))?.name ?? id };
        }),
        apply,
    );
}

export function directorRouteSamples(path: PrevisPathSpec, from = 0, to = 1, includeHeight = false): DirectorVec3[] {
    const table = buildPathArcTable(path, includeHeight);
    if (!table.samples.length) return [];
    const start = Math.max(0, from - 0.005),
        end = Math.min(1, to + 0.005);
    const steps = Math.max(1, Math.ceil((table.length * (end - start)) / 0.05));
    return Array.from({ length: steps + 1 }, (_, index) => samplePathAtProgress(table, start + ((end - start) * index) / steps)!.position);
}

export function directorRouteIssues(path: PrevisPathSpec, area?: PrevisPathArea) {
    if (!area) return [];
    const issues = checkPathAgainstArea(path, area);
    const table = buildPathArcTable(path);
    if (!table.samples.length) return [];
    const boundaries = routeControlIndices(path, table).map((index) => table.samples[index].distance);
    return issues.map((issue) => {
        const section = boundaries.findIndex((distance) => distance > issue.fromProgress * table.length);
        return { ...issue, section: section > 0 ? section : Math.max(1, path.points.length - 1) };
    });
}

export function canAddDirectorRoutePoint(point: DirectorVec3, area?: PrevisPathArea): boolean {
    if (!point.every(Number.isFinite)) return false;
    const path: PrevisPathSpec = {
        id: "placement",
        ownerId: "placement",
        space: "world",
        interpolation: "linear",
        timingPolicy: "keepDuration",
        points: [
            { id: "a", position: point },
            { id: "b", position: point },
        ],
    };
    return !directorRouteIssues(path, area).length;
}

export function directorRouteHitRadius(distance: number, viewportHeight: number, fov: number, zoom = 1, orthographicSpan?: number): number {
    const span = orthographicSpan ?? 2 * Math.max(0.01, distance) * Math.tan((fov * Math.PI) / 360);
    return (12 * span) / (Math.max(1, viewportHeight) * Math.max(0.01, zoom));
}
