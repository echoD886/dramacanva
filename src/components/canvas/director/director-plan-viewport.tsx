import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";
import type { MessageKey } from "@/i18n/messages";
import type { DirectorScene } from "@/types/director";
import { directorSceneForShot } from "@/lib/canvas/director/director-storyboard";
import { sampleDirectorCamera, sampleDirectorTransform } from "@/lib/canvas/director/director-playback";
import { resolveDirectorAspectRatio } from "@/lib/canvas/director/director-scene-data";
import { resolveDirectorOrthographicFrustum } from "@/lib/canvas/director/director-view-modes";
import { DirectorViewport } from "./director-viewport";
import { layoutDirectorPlanLabels } from "@/lib/canvas/director/director-plan-annotations";
import "./director-plan-viewport.css";
import type { DirectorRouteEditor } from "./use-director-route-editing";
import { evaluatePrevisFrame } from "@/lib/canvas/director/director-previs-evaluate";
import { directorWorkbenchFrameAtTime } from "@/lib/canvas/director/director-workbench-layout";

const noop = () => {};

/** Same object tree as the lens, viewed vertically; SVG only supplies annotations. */
export default function DirectorPlanViewport({
    scene,
    shotId,
    time = 0,
    playing = false,
    onSelectObject = noop,
    selectedActorId = null,
    routeEditing,
}: {
    scene: DirectorScene;
    shotId: string;
    time?: number;
    playing?: boolean;
    onSelectObject?: (id: string | null) => void;
    selectedActorId?: string | null;
    routeEditing?: DirectorRouteEditor;
}) {
    const { t } = useI18n();
    const id = useId();
    const root = useRef<HTMLDivElement>(null);
    const [aspect, setAspect] = useState(1);
    useEffect(() => {
        const observer = new ResizeObserver(([entry]) => {
            const w = entry.contentRect.width;
            if (w > 0) setAspect(w / Math.max(1, entry.contentRect.height));
        });
        if (root.current) observer.observe(root.current);
        return () => observer.disconnect();
    }, []);
    const snapshot = useMemo(() => directorSceneForShot(scene, shotId), [scene, shotId]);
    const shot = snapshot.shots.find((item) => item.id === shotId)!;
    const sourceCamera = snapshot.cameras.find((item) => item.id === shot.cameraId);
    const camera = sourceCamera && sampleDirectorCamera(sourceCamera, time);
    const actors = snapshot.objects.filter((object) => object.kind === "actor" && object.visible);
    // Fixed across playback: moving actors never cause the plan to zoom or drift.
    const positions = snapshot.objects.filter((object) => object.visible).flatMap((object) => [object.transform.position, ...(object.keyframes || []).map((frame) => frame.transform.position), ...(object.motionPath?.points || [])]);
    if (sourceCamera) positions.push(sourceCamera.transform.position, ...(sourceCamera.keyframes || []).map((frame) => frame.transform.position));
    const minX = Math.min(-3.2, ...positions.map((p) => p[0])) - 0.8,
        maxX = Math.max(3.2, ...positions.map((p) => p[0])) + 0.8;
    const minZ = Math.min(-3.2, ...positions.map((p) => p[2])) - 0.5,
        maxZ = Math.max(3.2, ...positions.map((p) => p[2])) + 0.8;
    const center = [(minX + maxX) / 2, (minZ + maxZ) / 2];
    const framing = {
        position: [center[0], 24, center[1]] as [number, number, number],
        target: [center[0], 0, center[1]] as [number, number, number],
        up: [0, 0, -1] as [number, number, number],
        horizontalSpan: maxX - minX,
        verticalSpan: maxZ - minZ,
        near: 0.1,
        far: 100,
    };
    const frustum = resolveDirectorOrthographicFrustum({ horizontalSpan: framing.horizontalSpan, verticalSpan: framing.verticalSpan, aspect });
    const height = 600 / aspect;
    const project = (p: number[]) => [300 + ((p[0] - center[0]) / (frustum.halfWidth * 2)) * 600, height / 2 + ((p[2] - center[1]) / (frustum.halfHeight * 2)) * height];
    const routes = (sourceCamera && !playing ? [sourceCamera] : []).flatMap((object) => {
        if (selectedActorId && object.id !== selectedActorId && object.id !== sourceCamera?.id) return [];
        const points = object.keyframes?.length ? object.keyframes.toSorted((a, b) => a.time - b.time).map((frame) => frame.transform.position) : object.motionPath?.points || [];
        const unique = points.filter((p, i) => !i || p.some((v, axis) => v !== points[i - 1][axis]));
        const isCamera = object.id === sourceCamera?.id;
        let route = unique.map(project);
        let note = "";
        if (isCamera && shot.cameraMove !== "static" && (unique.length < 2 || route.every((p) => p[0] === route[0][0] && p[1] === route[0][1]))) {
            const p = project(object.transform.position);
            if (shot.cameraMove.startsWith("pan") && sourceCamera) {
                const start = sampleDirectorCamera(sourceCamera, 0),
                    end = sampleDirectorCamera(sourceCamera, shot.duration);
                const a = Math.atan2(start.target[2] - start.transform.position[2], start.target[0] - start.transform.position[0]),
                    b = Math.atan2(end.target[2] - end.transform.position[2], end.target[0] - end.transform.position[0]);
                const turn = Math.atan2(Math.sin(b - a), Math.cos(b - a));
                route = Array.from({ length: 9 }, (_, i) => [p[0] + Math.cos(a + (turn * i) / 8) * 44, p[1] + Math.sin(a + (turn * i) / 8) * 44]);
            } else {
                route = [
                    [p[0] + 24, p[1]],
                    [p[0] + 24, p[1] + (shot.cameraMove.endsWith("up") ? -32 : 32)],
                ];
                if (shot.cameraMove.startsWith("pedestal")) note = `${points[0][1].toFixed(1)} → ${points.at(-1)![1].toFixed(1)} m`;
            }
        }
        if (route.length < 2) return [];
        return [{ object, camera: isCamera, points: route, note, letter: isCamera ? "CAM" : String.fromCharCode(65 + actors.findIndex((actor) => actor.id === object.id)) }];
    });
    const cp = camera && project(camera.transform.position),
        target = camera && project(camera.target);
    const moves: Record<string, string> = {
        push_in: "movePushIn",
        pull_out: "movePullOut",
        static: "moveStatic",
        pan_left: "movePanLeft",
        pan_right: "movePanRight",
        orbit_left: "moveOrbitLeft",
        orbit_right: "moveOrbitRight",
        tilt_up: "moveTiltUp",
        tilt_down: "moveTiltDown",
        handheld: "moveHandheld",
    };
    const move = moves[shot.cameraMove] ? t(`canvasExtra.directorWB.${moves[shot.cameraMove]}` as MessageKey) : t(`directorR3.${shot.cameraMove}` as MessageKey);
    const evaluated = scene.previs && evaluatePrevisFrame(scene, scene.previs, directorWorkbenchFrameAtTime(scene, shotId, time));
    const stations = actors.map((actor) => project(evaluated?.actors[actor.id]?.transform.position ?? sampleDirectorTransform(actor.transform, actor.keyframes, time, actor.motionPath).position));
    const labels = layoutDirectorPlanLabels(
        routes.flatMap((route) => [
            { id: `${route.object.id}-start`, text: `${route.letter} · ${t("directorR3.start")}`, point: route.points[0], isCamera: route.camera },
            { id: `${route.object.id}-end`, text: `${route.letter} · ${t("directorR3.end")}`, point: route.points.at(-1)!, isCamera: route.camera },
        ]),
        height,
        stations,
        cp ? [cp] : [],
    );
    return (
        <div ref={root} className="director-plan-render" data-director-render="plan">
            <DirectorViewport
                scene={snapshot}
                selectedObjectId={null}
                selectedBone={null}
                transformMode="translate"
                renderMode="beauty"
                playhead={time}
                playing={playing}
                viewMode="top"
                planFraming={framing}
                showMotionPaths
                routeEditing={selectedActorId ? routeEditing : undefined}
                onGroundClick={routeEditing?.adding ? routeEditing.addAt : undefined}
                showNavigation={false}
                showModelLoadNotice={false}
                onSelectObject={onSelectObject}
                onSelectBone={noop}
                onObjectTransform={noop}
                onBoneTransform={noop}
                onActorRigReady={noop}
            />
            <svg viewBox={`0 0 600 ${height}`} className="director-plan-overlay" aria-label={t("directorR3.planView")}>
                <defs>
                    <marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                        <path d="M0 0 10 5 0 10" fill="context-stroke" />
                    </marker>
                    {cp && target && (
                        <linearGradient id={`${id}-cone-grad`} x1={cp[0]} y1={cp[1]} x2={target[0]} y2={target[1]} gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.22" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.04" />
                        </linearGradient>
                    )}
                </defs>
                {cp &&
                    target &&
                    (() => {
                        const dx = target[0] - cp[0],
                            dy = target[1] - cp[1],
                            length = Math.hypot(dx, dy),
                            spread = length * Math.tan((camera!.fov * Math.PI) / 360) * resolveDirectorAspectRatio(shot.aspectRatio);
                        return (
                            <g className="director-plan-cone">
                                <path d={`M${cp} L${target[0] - (dy / length) * spread},${target[1] + (dx / length) * spread} L${target[0] + (dy / length) * spread},${target[1] - (dx / length) * spread} Z`} fill={`url(#${id}-cone-grad)`} />
                                <g className="director-plan-cam-marker" transform={`translate(${cp[0]}, ${cp[1]})`}>
                                    <circle r="12" className="director-plan-cam-bg" />
                                    <Camera x={-7} y={-7} width={14} height={14} className="director-plan-cam-icon" />
                                </g>
                            </g>
                        );
                    })()}
                {routes.map((route) => (
                    <g key={route.object.id} data-director-route={route.object.id} className={route.camera ? "is-camera" : "is-actor"}>
                        <polyline points={route.points.map((p) => p.join(",")).join(" ")} markerMid={`url(#${id}-arrow)`} markerEnd={`url(#${id}-arrow)`} />
                        {route.points.map((p, i) => (
                            <circle key={i} cx={p[0]} cy={p[1]} r={i === 0 || i === route.points.length - 1 ? 4 : 2} />
                        ))}
                    </g>
                ))}
                {labels.map((label) => (
                    <g key={label.id} className={`director-plan-endpoint-group ${label.isCamera ? "is-camera" : "is-actor"}`} transform={`translate(${label.x}, ${label.y})`}>
                        <rect width={label.width} height={label.height} rx="4" className="director-plan-endpoint-bg" />
                        <text className="director-plan-endpoint" x={label.width / 2} y={label.height / 2 + 4} textAnchor="middle">
                            {label.text}
                        </text>
                    </g>
                ))}
                {actors.map((actor, i) => {
                    const p = stations[i];
                    return (
                        <g
                            key={actor.id}
                            data-director-preview-object={actor.id}
                            className="director-plan-station"
                            role="button"
                            tabIndex={0}
                            aria-label={actor.name}
                            onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    onSelectObject(actor.id);
                                }
                            }}
                            onClick={() => onSelectObject(actor.id)}
                        >
                            <circle cx={p[0]} cy={p[1] - 19} r="10" />
                            <text x={p[0]} y={p[1] - 15}>
                                {String.fromCharCode(65 + i)}
                            </text>
                        </g>
                    );
                })}
            </svg>
            <div className="director-plan-legend">
                {routes.map((route) => (
                    <div key={route.object.id} className={route.camera ? "is-cam" : "is-actor"}>
                        <b className="director-legend-badge">{route.letter}</b>
                        <span className="director-legend-name">{route.camera ? move : route.object.name}</span>
                        <small className="director-legend-meta">
                            {route.note ||
                                (route.camera ? `${shot.duration}s` : t(route.object.motionPath?.speed === "run" || ("pose" in route.object && route.object.pose === "run") ? "canvasExtra.directorWB.poseRun" : "canvasExtra.directorWB.poseWalk"))}
                        </small>
                    </div>
                ))}
                {actors
                    .filter((actor) => !routes.some((route) => route.object.id === actor.id))
                    .map((actor) => (
                        <div key={actor.id} className="is-actor">
                            <b className="director-legend-badge">{String.fromCharCode(65 + actors.indexOf(actor))}</b>
                            <span className="director-legend-name">{actor.name}</span>
                            <small className="director-legend-meta">{t("directorR4.station")}</small>
                        </div>
                    ))}
            </div>
        </div>
    );
}
