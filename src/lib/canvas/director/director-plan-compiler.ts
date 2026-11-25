import { legacySequenceAspect } from "./director-previs-legacy";
import type { DirectorPose, DirectorVec3, PrevisActorAction, PrevisPathSpec, PrevisSequence } from "@/types/director";
import { PREVIS_TEMPLATES, type DirectorTemplateMetadata } from "./director-asset-registry";
import { createDirectorActor, createDirectorScene } from "./director-scene-data";
import { createDirectorScenePreset } from "./director-presets";
import { validatePlanDto, type PrevisPlanCompileContext } from "./director-plan-dto";
import { validatePrevisSequence } from "./director-previs-sequence";
import { compilePrevisToDirectorShots } from "./director-sequence-compiler";
import { sampleDirectorTransform } from "./director-playback";

export function compilePlanDtoToPrevis(value: unknown, templates: readonly DirectorTemplateMetadata[] = PREVIS_TEMPLATES, context: PrevisPlanCompileContext = {}) {
    const dto = validatePlanDto(value, templates, context);
    const warnings = [...dto.warnings];
    const turnWarning = "转身动作未提供方向和角度，保留当前朝向，请手工调整";
    if (dto.actions.some(({ kind }) => kind === "turn") && !warnings.includes(turnWarning)) warnings.push(turnWarning);
    const template = templates.find(({ id }) => id === dto.sceneTemplateId)!;
    const scene = context.scene ? structuredClone(context.scene) : createDirectorScene("站台预演");
    if (context.sceneId) scene.id = context.sceneId;
    const cast = context.actors ?? dto.actors;
    if (!context.scene)
        scene.objects = dto.actors.map((actor) => {
            const object = createDirectorActor(actor.name, [...template.actorSpawns[cast.findIndex(({ id }) => id === actor.id)]], "#f1f3f5", "adult");
            object.id = actor.id;
            return object;
        });
    for (const object of createDirectorScenePreset("subwayPlatform", true)) if (!scene.objects.some(({ id }) => id === object.id)) scene.objects.push(object);
    const paths: PrevisPathSpec[] = [];
    const actions: PrevisActorAction[] = [];
    for (const action of dto.actions.toSorted((a, b) => a.startFrame - b.startFrame)) {
        const actor = scene.objects.find(({ id }) => id === action.actorId)!;
        const startTime = action.startFrame / dto.fps;
        const endTime = action.endFrameExclusive / dto.fps;
        const start = sampleDirectorTransform(actor.transform, actor.keyframes, startTime);
        const destination = action.destinationAnchor ? template.anchors[action.destinationAnchor].position : action.seatAnchor ? template.anchors[action.seatAnchor].position : undefined;
        const compiled: PrevisActorAction = { id: action.id, actorId: action.actorId, kind: action.kind, startFrame: action.startFrame, endFrameExclusive: action.endFrameExclusive };
        if (action.destinationAnchor) {
            const pathId = `path-${action.id}`;
            paths.push({
                id: pathId,
                ownerId: actor.id,
                space: "world",
                interpolation: "linear",
                timingPolicy: "keepDuration",
                points: [
                    { id: `${pathId}-start`, position: [...start.position] },
                    { id: `${pathId}-end`, position: [...destination!] },
                ],
            });
            compiled.pathId = pathId;
        }
        if (action.seatAnchor) {
            compiled.seatId = template.anchors[action.seatAnchor].objectId;
            actor.seatObjectId = compiled.seatId;
            const pathId = `path-${action.id}`;
            paths.push({
                id: pathId,
                ownerId: actor.id,
                space: "world",
                interpolation: "linear",
                timingPolicy: "keepDuration",
                points: [
                    { id: `${pathId}-start`, position: [...destination!] },
                    { id: `${pathId}-end`, position: [...destination!] },
                ],
            });
            compiled.pathId = pathId;
        }
        const pose: DirectorPose = action.kind === "idle" || action.kind === "turn" ? "stand" : action.kind;
        actor.poseKeyframes = [...(actor.poseKeyframes ?? []).filter((key) => key.time < startTime || key.time > endTime), { time: startTime, pose }, { time: endTime, pose: (action.kind === "sit" ? "sit" : "stand") as DirectorPose }].sort(
            (a, b) => a.time - b.time,
        );
        if (destination) {
            const rotation: DirectorVec3 = action.destinationAnchor ? [0, Math.atan2(destination[0] - start.position[0], destination[2] - start.position[2]), 0] : [...start.rotation];
            // 路径在最后有效帧到终点；同步烘焙变换轨道供旧播放器裁剪，避免只让相机看到新路线。
            const arriveTime = (action.endFrameExclusive - 1) / dto.fps;
            const before = Math.max(0, (action.startFrame - 1) / dto.fps);
            actor.keyframes = [
                ...actor.keyframes.filter((key) => key.time < before || key.time > endTime),
                ...(before < startTime ? [{ id: `${action.id}-before`, time: before, transform: structuredClone(start), easing: "linear" as const }] : []),
                { id: `${action.id}-start`, time: startTime, transform: { ...structuredClone(start), rotation, ...(action.seatAnchor || arriveTime === startTime ? { position: [...destination] as DirectorVec3 } : {}) }, easing: "linear" as const },
                ...(arriveTime > startTime ? [{ id: `${action.id}-end`, time: arriveTime, transform: { ...structuredClone(start), rotation, position: [...destination] as DirectorVec3 }, easing: "linear" as const }] : []),
                { id: `${action.id}-hold`, time: endTime, transform: { ...structuredClone(start), rotation, position: [...destination] as DirectorVec3 }, easing: "linear" as const },
            ].sort((a, b) => a.time - b.time);
            actor.motionPath = undefined;
        }
        actions.push(compiled);
    }
    const sequence: PrevisSequence = {
        schemaVersion: 2,
        sceneId: scene.id,
        revision: (context.scene?.previs?.revision ?? 0) + 1,
        fps: dto.fps,
        aspect: context.scene?.previs?.aspect ?? legacySequenceAspect(context.scene?.shots[0]?.aspectRatio ?? "16:9"),
        paths,
        actions,
        segments: dto.segments.map(({ range, endRule, ...segment }) => ({
            ...segment,
            targetIds: [...segment.targetIds],
            startFrame: range[0],
            endFrameExclusive: range[1],
            shotId: `previs-${segment.id}`,
            cameraId: `previs-cam-${segment.id}`,
            endRule: endRule?.kind === "actionEnd" ? { ...endRule, offsetFrames: endRule.offsetFrames ?? 0 } : (endRule ?? { kind: "frame", frame: range[1] }),
        })),
    };
    const diagnostics = validatePrevisSequence(sequence, { actorIds: dto.actors.map(({ id }) => id) });
    if (diagnostics.length) throw new Error(`预演序列校验失败：${diagnostics.map(({ message }) => message).join("；")}`);
    scene.previs = sequence;
    const compiled = compilePrevisToDirectorShots(scene, sequence);
    if (compiled.diagnostics.length) throw new Error(`预演编译失败：${compiled.diagnostics.map(({ message }) => message).join("；")}`);
    return { scene: compiled.scene, sequence: compiled.scene.previs!, warnings };
}
