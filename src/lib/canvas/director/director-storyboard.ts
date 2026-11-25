import { DIRECTOR_CAMERA_MOVES, directorCameraMotionFrames } from "./director-camera-motion";
import { buildDramaPrevisScene, dramaShotSize } from "../drama-previs";
import { PREVIS_ASPECT_RATIOS, PREVIS_DEFAULT_ASPECT_RATIO, previsAspectValue, previsVerticalFov } from "../previs/previs-optics";
import { pairedActions, stagePairedActions } from "./director-paired-action";
import { nanoid } from "nanoid";
import { currentLocaleText as t } from "@/i18n/current-locale-text";
import { CanvasNodeType, type CanvasConnection, type CanvasNodeData, type StoryboardRow } from "@/types/canvas";
import type { DirectorScene, DirectorShot, DirectorObject, DirectorVec3 } from "@/types/director";
import { createDirectorActor, createDirectorCamera, createDirectorObject, createDirectorScene } from "./director-scene-data";
import { Euler, Quaternion } from "three";
import { rememberDirectorStage } from "./director-timeline";
import { createDirectorScenePreset, createDirectorPropPreset } from "./director-presets";

import { directorRowFingerprint, rememberDirectorActors } from "./director-shot-state";
export { acknowledgeDirectorWriteback, directorBoundReferenceIds, directorRowFingerprint, directorSceneForShot, rememberDirectorActors } from "./director-shot-state";

/** Conservative free parser: only recognized location/action cues create geometry or motion. */
export function deriveDirectorStoryboardShot(script: CanvasNodeData, row: StoryboardRow, nodes: CanvasNodeData[], scenes: DirectorScene[], syncShotId?: string, connections: CanvasConnection[] = []) {
    if (script.metadata?.locked || !script.metadata?.storyboard?.rows.some((r) => r.id === row.id)) throw new Error("Invalid or locked storyboard source");
    // Only this row's video and upstream references contribute; adjacent rows stay isolated.
    const rowEdges = connections.filter((edge) => edge.storyboardRowId === row.id || (edge.fromNodeId === script.id && edge.fromHandleId === `row:${row.id}`) || (edge.toNodeId === script.id && edge.toHandleId === `row:${row.id}`));
    const video = nodes.find((n) => n.id === row.videoNodeId) || nodes.find((n) => n.type === CanvasNodeType.Video && !n.metadata?.directorSceneId && rowEdges.some((edge) => edge.fromNodeId === n.id || edge.toNodeId === n.id));
    const referenceIds = new Set([...(video?.metadata?.referenceAssetNodeIds || []), ...connections.filter((edge) => edge.toNodeId === video?.id).map((edge) => edge.fromNodeId), ...rowEdges.map((edge) => edge.fromNodeId)]);
    const videoPrompt = video?.metadata?.composerContent || video?.metadata?.prompt || "";
    const text = [row.plotDescription, row.videoMotionPrompt || videoPrompt, row.performanceBlocking, row.camera, row.motion].filter(Boolean).join(" ");
    const environment = row.assetBindings.find((b) => b.role === "environment");
    const environmentNode = nodes.find((n) => n.id === environment?.nodeId) || nodes.find((n) => referenceIds.has(n.id) && n.metadata?.assetCategory === "environment");
    const locationText = `${environmentNode?.title || ""} ${text}`;
    const location = /会议室|会议桌|长桌|conference|boardroom/i.test(locationText)
        ? "conference"
        : /地铁|站台|subway|metro|platform/i.test(locationText)
          ? "metro"
          : /咖啡|café|cafe|coffee/i.test(locationText)
            ? "cafe"
            : /街口|街道|street/i.test(locationText)
              ? "street"
              : /客厅|living room/i.test(locationText)
                ? "living"
                : /卧室|bedroom/i.test(locationText)
                  ? "bedroom"
                  : /车内|car interior/i.test(locationText)
                    ? "carInterior"
                    : /办公室|office/i.test(locationText)
                      ? "office"
                      : "unknown";
    const drama = script.metadata?.dramaProjection?.slot === "world-storyboard";
    const locationKey = drama ? `row:${script.id}:${row.id}` : environment ? `asset:${environment.nodeId}` : location === "unknown" ? `row:${script.id}:${row.id}` : `${script.id}:${location}`;
    const existing = scenes.find((s) => (syncShotId ? s.shots.some((shot) => shot.id === syncShotId) : s.locationKey === locationKey));
    let scene = existing
        ? structuredClone(rememberDirectorStage(rememberDirectorActors(existing)))
        : createDirectorScene(environmentNode?.title || locationText.match(/会议室|地铁站台|地铁站|咖啡店门口|咖啡店|雨夜街口|boardroom|street|cafe|metro/i)?.[0] || script.title || t("directorD4.unknown"));
    if (!existing || (location === "conference" && (syncShotId || !scene.objects.some((object) => object.stageProp === "conference-table")))) {
        if (existing && location === "conference") {
            const presetNames = new Set(["会议室地面", "会议室后墙", "会议桌", "桌腿", "椅子座面", "椅子靠背", "椅脚", "窗框", "剧本"]);
            scene.objects = scene.objects.filter((object) => object.kind === "actor" || (!object.stageProp && !presetNames.has(object.name)));
        }
        if (!existing) {
            scene.objects = [];
            scene.shots = [];
            scene.cameras = [];
        }
        scene.locationKey = locationKey;
        const prop = (name: string, position: DirectorVec3, scale: DirectorVec3) => {
            const item = createDirectorObject("box", name, position, "#a5a7aa");
            item.transform.scale = scale;
            scene.objects.push(item);
        };
        if (location === "metro") {
            prop("站台", [0, -0.2, 0], [14, 0.4, 6]);
            prop("站台后墙", [0, 1.5, -3], [14, 3, 0.2]);
            prop("站台边缘", [0, 0.01, 2.7], [14, 0.03, 0.15]);
        }
        if (location === "cafe") {
            prop("咖啡店立面", [0, 1.5, -2], [8, 3, 0.2]);
            prop("门框", [1.2, 1.2, -1.8], [0.12, 2.4, 0.15]);
        }
        if (location === "street") prop("街道", [0, -0.1, 0], [14, 0.2, 8]);
        if (location === "living" || location === "bedroom" || location === "street" || location === "office" || location === "carInterior") scene.objects.push(...createDirectorScenePreset(location));
        if (location === "conference") {
            prop("会议室地面", [0, -0.12, 0], [12, 0.2, 9]);
            prop("会议室后墙", [0, 1.8, -3.2], [12, 3.6, 0.16]);
            scene.objects.at(-2)!.color = "#dbd8d0";
            scene.objects.at(-1)!.color = "#e4e2dc";
            const furnishings = createDirectorScenePreset("conference");
            furnishings[8].name = "剧本";
            scene.objects.push(...furnishings);
        }
        if (environmentNode) scene.environment = { mode: "color", sourceNodeId: environmentNode.id };
    }
    const candidates = nodes.filter((n) => n.type === CanvasNodeType.Image || n.metadata?.workflowKind === "character");
    const names = new Map<string, CanvasNodeData | undefined>();
    for (const character of row.characters)
        names.set(
            character.characterName,
            candidates.find((n) => n.id === character.characterImageNodeId) ||
                candidates.find((n) => character.characterAssetId && n.metadata?.characterAssetId === character.characterAssetId) ||
                (!drama ? candidates.find((n) => n.title === character.characterName) : undefined),
        );
    for (const binding of row.assetBindings.filter((b) => b.role === "character")) {
        const n = candidates.find((n) => n.id === binding.nodeId);
        if (n && ![...names.values()].some((v) => v?.id === n.id)) names.set(n.title, n);
    }
    for (const n of candidates.filter((n) => !drama && (n.metadata?.workflowKind === "character" || n.metadata?.assetCategory === "character" || !n.metadata?.assetCategory) && n.title && text.includes(n.title)))
        if (!names.has(n.title)) names.set(n.title, n);
    for (const n of candidates.filter((n) => referenceIds.has(n.id) && (n.metadata?.workflowKind === "character" || n.metadata?.assetCategory === "character"))) if (!names.has(n.title)) names.set(n.title, n);
    // Named subjects still get human white models when no character card exists yet.
    for (const match of text.matchAll(/(?:^|[，。；\s])([\p{Script=Han}]{2,4}?)(?=站在|坐在|坐着|站立|起身|抱|攥紧|抬头|走到|走向|冲进|转身)/gu))
        if (!names.has(match[1]) && !/^(两人|二人|所有人|众人|男人|女人|镜头|摄影机|身体|角色)$/.test(match[1])) names.set(match[1], undefined);
    // An entrance can appear inside a request ("拍出舞者登场的气势") without a cast card.
    for (const match of text.matchAll(/(舞者|演员|演員|主角|少年|少女|dancer|performer)\s*(?:登场|登場|出场|出場|enters\b)/gi)) if (!names.has(match[1])) names.set(match[1], undefined);
    const exchanges = pairedActions([row.plotDescription, row.videoMotionPrompt || videoPrompt, row.performanceBlocking].filter((part, index, all) => part && all.indexOf(part) === index).join("。"), [...names.keys()]);
    for (const { from, to } of exchanges) {
        if (!names.has(from)) names.set(from, undefined);
        if (!names.has(to)) names.set(to, undefined);
    }
    const previousShot = scene.shots.find((shot) => shot.id === syncShotId) || scene.shots.at(-1);
    const duration = drama ? row.durationSeconds : Math.max(0.1, Math.min(60, row.durationSeconds || 5));
    scene.objects = scene.objects.map((o) => (o.kind === "actor" ? { ...o, visible: false } : o));
    [...names].forEach(([name, node], index) => {
        const prior = scene.objects.find((o) => o.kind === "actor" && (node ? o.characterBinding?.referenceNodeId === node.id : o.name === name));
        let actor = prior || createDirectorActor(name, [index * 1.8 - 0.9, 0, 0], index % 2 ? "#c5c7ca" : "#929eac");
        const priorState = prior && previousShot?.actorStates?.[prior.id];
        const last = (syncShotId ? priorState?.keyframes[0]?.transform : priorState?.keyframes.at(-1)?.transform) || priorState?.transform || actor.transform;
        actor = { ...actor, transform: structuredClone(last), visible: true, keyframes: [], motionPath: undefined, pose: "stand", poseKeyframes: undefined, boneOverrides: {}, boneTracks: [] };
        actor.archetype = /儿童|孩子|child/i.test(`${name} ${node?.metadata?.prompt || ""}`) ? "child" : /林夏|女|woman|female/i.test(`${name} ${node?.metadata?.prompt || ""}`) ? "woman" : "man";
        if (drama && node && !(node.metadata?.workflowKind === "character" && node.metadata.characterAssetId && node.metadata.characterVersionId)) actor.sourceNodeId = node.id;
        else if (node)
            actor.characterBinding = { referenceNodeId: node.id, characterAssetId: node.metadata?.characterAssetId || "", characterVersionId: node.metadata?.characterVersionId || "", characterName: name, referenceImageUrl: node.metadata?.content };
        const clauses = text.split(/[，。；,;.!?！？\n]/).map((part) => part.trim());
        const clausesForActor: string[] = [];
        let subject = "";
        for (const part of clauses) {
            const named = [...names.keys()].find((candidate) => part.startsWith(candidate));
            if (named) subject = named;
            else if (/^(?:镜头|鏡頭|相机|相機|摄影机|攝影機|camera\b|the camera\b)/i.test(part)) subject = "";
            if (subject === name) clausesForActor.push(part);
        }
        const clause = clausesForActor.join("，") || clauses.find((part) => part.includes(name)) || "";
        if (location === "conference" && (!priorState || syncShotId)) {
            actor.transform.position = [index % 2 ? 1.75 : -1.75, 0, Math.floor(index / 2) * 1.4];
            actor.transform.rotation[1] = index % 2 ? -Math.PI / 2 : Math.PI / 2;
        }
        if (/坐|seated|sitting/i.test(clause)) actor.pose = "sit";
        else if (/前倾|lean/i.test(clause)) actor.pose = "lean";
        else if (/指着|指向|point/i.test(clause)) actor.pose = "reach";
        const quat = (x: number, y = 0, z = 0) => new Quaternion().setFromEuler(new Euler(x, y, z)).toArray() as [number, number, number, number];
        if (/前倾|lean/i.test(clause)) actor.boneOverrides = { spine: quat(0.32), head: quat(-0.12) };
        if (/指着|指向|甩|point|throw/i.test(clause))
            actor.boneTracks = [
                {
                    bone: "rightUpperArm",
                    keyframes: [
                        { id: nanoid(), time: 0, rotation: quat(-0.25), easing: "smooth" },
                        { id: nanoid(), time: duration * 0.32, rotation: quat(-0.25), easing: "smooth" },
                        { id: nanoid(), time: duration * 0.4, rotation: quat(-1.89) },
                        { id: nanoid(), time: duration, rotation: quat(-1.89) },
                    ],
                },
                {
                    bone: "leftUpperArm",
                    keyframes: [
                        { id: nanoid(), time: 0, rotation: quat(-0.3), easing: "smooth" },
                        { id: nanoid(), time: duration * 0.16, rotation: quat(-1.4), easing: "smooth" },
                        { id: nanoid(), time: duration * 0.28, rotation: quat(-1.1), easing: "smooth" },
                        { id: nanoid(), time: duration * 0.4, rotation: quat(-0.4) },
                        { id: nanoid(), time: duration, rotation: quat(-0.4) },
                    ],
                },
            ];
        if (actor.pose === "sit" && /攥|剧本/.test(clause)) actor.boneOverrides = { head: quat(-0.22), leftUpperArm: quat(-0.5, 0, -0.38), rightUpperArm: quat(-0.5, 0, 0.38), leftLowerArm: quat(-1.25), rightLowerArm: quat(-1.25) };
        actor.heldProp = /抱.*伞|拿.*伞|holding.*umbrella/i.test(clause) ? "folded_umbrella" : actor.pose === "sit" && /剧本/.test(clause) ? "script" : undefined;
        const running = /冲|跑|run|rush/i.test(clause),
            walking = /走|walk|进|enter|登场|登場|出场|出場/i.test(clause);
        if (running || walking) {
            actor.pose = running ? "run" : "walk";
            if (!priorState) actor.transform.position = [-3.5 + index, 0, 0.5];
            const other = scene.objects.find((o) => o.kind === "actor" && o.id !== actor.id && previousShot?.actorStates?.[o.id]);
            const anchorX = other && previousShot?.actorStates?.[other.id]?.transform.position[0];
            const end = structuredClone(actor.transform);
            end.position = [anchorX === undefined ? index * 1.8 - 0.9 : anchorX - 1.8, 0, 0];
            end.rotation[1] = Math.PI / 2;
            actor.keyframes = [
                { id: nanoid(), time: 0, transform: structuredClone(actor.transform), easing: "linear" },
                { id: nanoid(), time: duration * 0.65, transform: end, easing: "smooth" },
                { id: nanoid(), time: duration, transform: { ...end, rotation: [0, index === 0 ? Math.PI / 2 : -Math.PI / 2, 0] } },
            ];
            if (/登场|登場|出场|出場|enters\b/i.test(clause) && location !== "conference") {
                actor.keyframes[0].transform.rotation[1] = Math.PI / 2;
                actor.poseKeyframes = [
                    { time: 0, pose: actor.pose },
                    { time: duration * 0.65, pose: "stand" },
                ];
            }
            if (location === "conference" && !priorState) {
                // The room preset owns the clear aisle; do not route an entrance through the table.
                const station = index % 2 ? 1.75 : -1.75;
                actor.transform.position = [4, 0, 2.2];
                actor.keyframes = [
                    { id: nanoid(), time: 0, transform: { ...structuredClone(actor.transform), rotation: [0, -Math.PI / 2, 0] } },
                    { id: nanoid(), time: duration * 0.4, transform: { ...structuredClone(actor.transform), position: [station, 0, 2.2], rotation: [0, -Math.PI / 2, 0] } },
                    { id: nanoid(), time: duration * 0.8, transform: { ...structuredClone(actor.transform), position: [station, 0, 0], rotation: [0, Math.PI, 0] } },
                    { id: nanoid(), time: duration, transform: { ...structuredClone(actor.transform), position: [station, 0, 0], rotation: [0, index % 2 ? -Math.PI / 2 : Math.PI / 2, 0] } },
                ];
            }
            if (/起身|stand up|rises/i.test(clause) && location === "conference") {
                const station = index % 2 ? 1.75 : -1.75;
                const start = { ...structuredClone(actor.transform), position: [station, 0, 1.8] as DirectorVec3, rotation: [0, Math.PI, 0] as DirectorVec3 };
                const end = { ...structuredClone(start), position: [station, 0, 0] as DirectorVec3, rotation: [0, index % 2 ? -Math.PI / 2 : Math.PI / 2, 0] as DirectorVec3 };
                actor.transform = start;
                actor.keyframes = [
                    { id: nanoid(), time: 0, transform: start },
                    { id: nanoid(), time: duration * 0.2, transform: start, easing: "linear" },
                    { id: nanoid(), time: duration * 0.7, transform: end, easing: "smooth" },
                    { id: nanoid(), time: duration, transform: end },
                ];
                actor.poseKeyframes = [
                    { time: 0, pose: "sit" },
                    { time: duration * 0.12, pose: "stand" },
                    { time: duration * 0.2, pose: actor.pose },
                    { time: duration * 0.7, pose: /前倾|lean/i.test(clause) ? "lean" : "reach" },
                ];
                actor.boneTracks = actor.boneTracks?.map((track) => ({ ...track, keyframes: track.keyframes.map((frame) => ({ ...frame, time: duration * 0.7 + frame.time * 0.3 })) }));
                if (!scene.objects.some((object) => object.stageProp === "office-chair" && Math.abs(object.transform.position[0] - station) < 0.1 && Math.abs(object.transform.position[2] - 1.8) < 0.1))
                    scene.objects.push(createDirectorPropPreset("office-chair", [station, 0, 1.8], Math.PI));
            }
        } else if (/转身|turn/i.test(clause)) {
            const end = structuredClone(actor.transform);
            end.rotation[1] = index === 0 ? Math.PI / 2 : -Math.PI / 2;
            actor.keyframes = [
                { id: nanoid(), time: 0, transform: structuredClone(actor.transform) },
                { id: nanoid(), time: duration * 0.4, transform: structuredClone(actor.transform), easing: "smooth" },
                { id: nanoid(), time: duration * 0.7, transform: end },
            ];
        } else if (/对视|look at each other/i.test(text)) actor.transform.rotation[1] = index === 0 ? Math.PI / 2 : -Math.PI / 2;
        scene.objects = prior ? scene.objects.map((o) => (o.id === actor.id ? actor : o)) : [...scene.objects, actor];
    });
    stagePairedActions(scene.objects, exchanges, duration);
    const paper = scene.objects.find((object) => object.name === "剧本");
    if (paper && /剧本.*甩|甩.*剧本/.test(text)) {
        paper.color = "#e1ded5";
        paper.keyframes = [
            { id: nanoid(), time: 0, transform: { ...paper.transform, position: [-0.91, 1.85, 0.32], rotation: [0, 0, 0.6] }, easing: "smooth" },
            { id: nanoid(), time: duration * 0.16, transform: { ...paper.transform, position: [-1.04, 1.97, 0.32], rotation: [0, 0, 0.8] }, easing: "linear" },
            { id: nanoid(), time: duration * 0.3, transform: { ...paper.transform, position: [-0.65, 0.945, 0.32] } },
            { id: nanoid(), time: duration * 0.4, transform: { ...paper.transform, position: [-0.4, 0.945, 0.32] } },
            { id: nanoid(), time: duration, transform: { ...paper.transform, position: [-0.4, 0.945, 0.32] } },
        ];
    }
    const aspect = PREVIS_ASPECT_RATIOS.find(({ value }) => value === script.metadata?.size)?.value ?? PREVIS_DEFAULT_ASPECT_RATIO;
    const frameRatio = previsAspectValue(aspect);
    const camera = createDirectorCamera();
    const focalLength = Number(text.match(/(\d{2,3})\s*(?:mm|毫米)/i)?.[1]) || 35;
    camera.focalLength = focalLength;
    // The focal helper returns horizontal FOV; Three's PerspectiveCamera takes vertical FOV.
    camera.fov = previsVerticalFov(focalLength, frameRatio);
    camera.transform.position = [0, 1.7, /特写|close/i.test(row.shotSize) ? 3 : location === "conference" ? 8.5 : 7.5];
    if (/侧面|侧拍|side/i.test(row.camera || text)) {
        camera.name = `${focalLength}mm · 侧面双人`;
        camera.transform.position = location === "conference" ? [0.15, 2.15, 5.6] : [0.8, 2.4, 8.5];
    }
    camera.target = [0, location === "conference" ? 1.2 : 1.1, 0];
    const frameExchange = exchanges.length > 0 && !row.camera && !/机位|機位|镜头|鏡頭|camera/i.test(text);
    if (frameExchange) {
        // Keep both silhouettes in frame in portrait as well as landscape.
        const tangent = Math.tan((camera.fov * Math.PI) / 360);
        const distance = Math.max(1.3 / tangent, 1.25 / (tangent * frameRatio));
        camera.transform.position = [0.12, 1.26, distance];
        camera.target = [0, 0.95, 0];
    }
    const inferredMove: DirectorShot["cameraMove"] = frameExchange
        ? "static"
        : /左移|truck left/i.test(text)
          ? "truck_left"
          : /右移|横移|truck right/i.test(text)
            ? "truck_right"
            : /升起|升镜头|升降.*升|pedestal up|crane up/i.test(text)
              ? "pedestal_up"
              : /降下|下降|pedestal down|crane down/i.test(text)
                ? "pedestal_down"
                : /左摇|pan left/i.test(text)
                  ? "pan_left"
                  : /右摇|pan right/i.test(text)
                    ? "pan_right"
                    : /上摇|tilt up/i.test(text)
                      ? "tilt_up"
                      : /下摇|tilt down/i.test(text)
                        ? "tilt_down"
                        : /推|push|跟|track/i.test(text)
                          ? "push_in"
                          : /拉远|pull/i.test(text)
                            ? "pull_out"
                            : /右环绕|orbit right/i.test(text)
                              ? "orbit_right"
                              : /环绕|orbit/i.test(text)
                                ? "orbit_left"
                                : "static";
    const move = DIRECTOR_CAMERA_MOVES.includes(row.motion as DirectorShot["cameraMove"]) ? (row.motion as DirectorShot["cameraMove"]) : inferredMove;
    if (move !== "static") camera.keyframes = directorCameraMotionFrames(camera, move, duration, location === "conference" ? 0.8 : 1.8);
    const old = scene.shots.find((shot) => shot.id === syncShotId);
    const authoredPrompt = drama
        ? [
              ...new Set(
                  [row.plotDescription, row.shotSize, row.camera, row.imageGenerationPrompt, row.videoMotionPrompt, row.dialogue, script.metadata?.prompt]
                      .filter(Boolean)
                      .flatMap((text) => text!.split("\n"))
                      .filter(Boolean),
              ),
          ]
        : [row.videoMotionPrompt || row.plotDescription || videoPrompt, row.dialogue].filter(Boolean);
    const shot: DirectorShot = {
        id: old?.id || nanoid(),
        name: `${t("nodeSearch.shot", { number: row.shotNumber })} · ${t("directorD4.previs")}`,
        cameraId: camera.id,
        duration,
        fps: 24,
        aspectRatio: aspect,
        shotSize: dramaShotSize(row.shotSize),
        cameraMove: move,
        prompt: authoredPrompt.join("\n"),
        sourceStoryboardNodeId: script.id,
        sourceStoryboardRowId: row.id,
        sourceFingerprint: directorRowFingerprint(row, aspect),
    };
    scene.cameras = [...scene.cameras.filter((c) => c.id !== old?.cameraId), camera];
    scene.shots = old ? scene.shots.map((s) => (s.id === old.id ? shot : s)) : [...scene.shots, shot];
    scene.activeShotId = shot.id;
    if (syncShotId && scene.worldEngine) {
        scene.worldEngine = Object.fromEntries(Object.entries(scene.worldEngine).filter(([, world]) => !world.shots.some((item) => item.id === syncShotId)));
    }
    scene.updatedAt = new Date().toISOString();
    scene = rememberDirectorStage(rememberDirectorActors(scene));
    if (drama) scene = buildDramaPrevisScene(scene, row);
    return { scene, shot: scene.shots.find((s) => s.id === shot.id)! };
}
