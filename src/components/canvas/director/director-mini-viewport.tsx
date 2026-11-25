import { useId } from "react";
import { useI18n } from "@/i18n/use-i18n";
import type { DirectorScene } from "@/types/director";
import { sampleDirectorCamera, sampleDirectorTransform } from "@/lib/canvas/director/director-playback";
import { directorSceneForShot } from "@/lib/canvas/director/director-storyboard";
import type { MessageKey } from "@/i18n/messages";
import { DIRECTOR_PROP_DIMENSIONS } from "@/lib/canvas/director/director-presets";
import { resolveDirectorAspectRatio } from "@/lib/canvas/director/director-scene-data";

/** Scene-data-only preview: no WebGL, model loading, or Three.js on the canvas. */
export function DirectorMiniViewport({ scene, shotId, time = 0 }: { scene: DirectorScene; shotId?: string; time?: number }) {
    const { t } = useI18n();
    const gridId = useId();
    const shot = scene.shots.find((item) => item.id === (shotId || scene.activeShotId)) || scene.shots[0];
    scene = directorSceneForShot(scene, shot?.id || scene.activeShotId);
    const sourceCamera = scene.cameras.find((item) => item.id === shot?.cameraId);
    const camera = sourceCamera && sampleDirectorCamera(sourceCamera, time);
    const objects = scene.objects
        .filter((item) => item.visible !== false)
        .map((item) => ({ ...item, name: item.characterBinding?.characterName || item.name, transform: sampleDirectorTransform(item.transform, item.keyframes || [], time, item.motionPath) }));
    const positions = scene.objects.flatMap((item) => [item.transform.position, ...(item.keyframes || []).map((frame) => frame.transform.position), ...(item.motionPath?.points || [])]);
    if (sourceCamera) positions.push(sourceCamera.transform.position, ...(sourceCamera.keyframes || []).map((frame) => frame.transform.position));
    if (camera) positions.push(camera.transform.position, camera.target);
    const xs = positions.map((position) => position[0]).filter(Number.isFinite);
    const zs = positions.map((position) => position[2]).filter(Number.isFinite);
    const minX = Math.min(-2.5, ...xs) - 0.6;
    const maxX = Math.max(2.5, ...xs) + 0.6;
    const minZ = Math.min(-2, ...zs) - 0.6;
    const maxZ = Math.max(2, ...zs) + 0.6;
    const scale = Math.min(280 / (maxX - minX), 150 / (maxZ - minZ));
    const project = (x: number, z: number) => [160 + (x - (minX + maxX) / 2) * scale, 108 + (z - (minZ + maxZ) / 2) * scale];
    const cameraPoint = camera ? project(camera.transform.position[0], camera.transform.position[2]) : null;
    const targetPoint = camera ? project(camera.target[0], camera.target[2]) : null;
    const angle = cameraPoint && targetPoint ? Math.atan2(targetPoint[1] - cameraPoint[1], targetPoint[0] - cameraPoint[0]) : 0;
    const distance = cameraPoint && targetPoint ? Math.hypot(targetPoint[0] - cameraPoint[0], targetPoint[1] - cameraPoint[1]) : 0;
    const spread = distance * Math.tan(((camera?.fov || 50) * Math.PI) / 360) * resolveDirectorAspectRatio(shot?.aspectRatio);
    const paths = [...objects.filter((object) => object.kind === "actor"), ...(sourceCamera ? [sourceCamera] : [])].flatMap((item) => {
        // Keyframes take precedence in the playback sampler; draw that same source.
        const points = item.keyframes?.length ? item.keyframes.toSorted((a, b) => a.time - b.time).map((frame) => frame.transform.position) : item.motionPath?.points || [];
        if (points.length < 2) return [];
        const cameraPath = item.id === sourceCamera?.id;
        const moving = points.some((point) => point.some((value, axis) => value !== points[0][axis]));
        if (!moving && (!cameraPath || shot?.cameraMove === "static")) return [];
        const moveKeys = {
            static: "moveStatic",
            push_in: "movePushIn",
            pull_out: "movePullOut",
            pan_left: "movePanLeft",
            pan_right: "movePanRight",
            tilt_up: "moveTiltUp",
            tilt_down: "moveTiltDown",
            orbit_left: "moveOrbitLeft",
            orbit_right: "moveOrbitRight",
            handheld: "moveHandheld",
        };
        const vertical = moving && points.every((point) => point[0] === points[0][0] && point[2] === points[0][2]);
        const route = vertical
            ? [
                  [cameraPoint![0], cameraPoint![1]],
                  [cameraPoint![0], cameraPoint![1] - 30],
              ]
            : moving
              ? points.map((point) => project(point[0], point[2]))
              : Array.from({ length: 9 }, (_, index) => {
                    const a = angle + (index / 8 - 0.5) * 0.8;
                    return [cameraPoint![0] + Math.cos(a) * 24, cameraPoint![1] + Math.sin(a) * 24];
                });
        const move = shot?.cameraMove || "static";
        const moveLabel = move in moveKeys ? t(`canvasExtra.directorWB.${moveKeys[move as keyof typeof moveKeys]}` as MessageKey) : t(`directorR3.${move}` as MessageKey);
        return [
            {
                id: item.id,
                camera: cameraPath,
                points: route,
                label: cameraPath
                    ? `${moveLabel}${vertical ? ` · ${points[0][1].toFixed(1)} → ${points.at(-1)![1].toFixed(1)}m` : ""}`
                    : `${item.name} · ${t(item.motionPath?.speed === "run" || ("pose" in item && item.pose === "run") ? "canvasExtra.directorWB.poseRun" : "canvasExtra.directorWB.poseWalk")}`,
            },
        ];
    });

    return (
        <div className="director-mini-viewport">
            <svg viewBox="0 0 320 220" className="director-mini-schematic" role="img" aria-label={t("previs.v165.topView")}>
                <defs>
                    <marker id={`${gridId}-arrow`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
                    </marker>
                    <pattern id={gridId} width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeOpacity="0.09" />
                    </pattern>
                </defs>
                <rect width="320" height="220" fill={`url(#${gridId})`} />
                {paths.map((path) => (
                    <g key={path.id} data-director-route={path.id} stroke={path.camera ? "#5289cc" : "#b17952"} fill="none">
                        <polyline points={path.points.map((point) => point.join(",")).join(" ")} strokeWidth="1.8" strokeDasharray={path.camera ? "5 3" : undefined} markerMid={`url(#${gridId}-arrow)`} markerEnd={`url(#${gridId}-arrow)`} />
                        <circle cx={path.points[0][0]} cy={path.points[0][1]} r="3" fill="var(--surface)" />
                        <circle cx={path.points.at(-1)![0]} cy={path.points.at(-1)![1]} r="3" fill="currentColor" />
                        <text x={path.points[0][0] - 6} y={path.points[0][1] - 7} textAnchor="end" stroke="none" className="director-mini-label">
                            {t("directorR3.start")}
                        </text>
                        <text x={path.points.at(-1)![0] + 5} y={path.points.at(-1)![1] + 14} stroke="none" className="director-mini-label">
                            {t("directorR3.end")}
                        </text>
                        <text x={path.points[0][0] + 7} y={path.points[0][1] + 23} stroke="none" className="director-mini-label">
                            {path.label}
                        </text>
                    </g>
                ))}
                {cameraPoint && (
                    <g transform={`translate(${cameraPoint.join(" ")}) rotate(${(angle * 180) / Math.PI})`} className="director-mini-camera">
                        <path d={`M 0 0 L ${distance} ${-spread} L ${distance} ${spread} Z`} fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeOpacity="0.5" />
                        <path d={`M 0 0 L ${distance} 0`} stroke="currentColor" strokeDasharray="3 3" strokeOpacity="0.6" />
                        <rect x="-7" y="-5" width="10" height="10" rx="2" fill="currentColor" />
                        <path d="M 3 -3 L 8 -5 L 8 5 L 3 3 Z" fill="currentColor" />
                    </g>
                )}
                {objects.map((object, index) => {
                    const [x, y] = project(object.transform.position[0], object.transform.position[2]);
                    const actor = object.kind === "actor" || object.primitive === "character";
                    const round = actor || object.primitive === "sphere" || object.primitive === "cylinder";
                    const dimensions = object.stageProp ? DIRECTOR_PROP_DIMENSIONS[object.stageProp] : [1, 1, 1];
                    const width = Math.max(3, Math.min(280, dimensions[0] * Math.abs(object.transform.scale[0]) * scale));
                    const height = Math.max(3, Math.min(180, dimensions[2] * Math.abs(object.transform.scale[2]) * scale));
                    const environment = !object.stageProp && object.kind !== "actor" && object.transform.scale.some((size) => size > 5);
                    return (
                        <g key={object.id} data-director-preview-object={object.id}>
                            <title>{object.name}</title>
                            <g
                                transform={`translate(${x} ${y}) rotate(${(-object.transform.rotation[1] * 180) / Math.PI})`}
                                fill={actor ? "currentColor" : object.color || "currentColor"}
                                stroke="currentColor"
                                strokeOpacity="0.35"
                                opacity={environment ? 0.06 : 0.8}
                            >
                                {round ? <ellipse rx={actor ? 6 : width / 2} ry={actor ? 6 : height / 2} /> : <rect x={-width / 2} y={-height / 2} width={width} height={height} rx="2" fillOpacity="0.65" />}
                                {actor && (
                                    <>
                                        <ellipse rx="9" ry="3" fill="currentColor" />
                                        <path d="M -3 -9 L 0 -14 L 3 -9" fill="none" stroke="currentColor" strokeOpacity="1" strokeWidth="2" />
                                    </>
                                )}
                                {object.stageProp === "office-chair" && <path d={`M ${-width / 2} ${-height / 2} H ${width / 2} M ${-width / 2} ${-height / 2} V ${height / 3} M ${width / 2} ${-height / 2} V ${height / 3}`} fill="none" strokeWidth="3" />}
                            </g>
                            {actor && (
                                <text x={x} y={y - 21} textAnchor="middle" className="director-mini-label">
                                    {object.name.length > 12 ? `${object.name.slice(0, 11)}…` : object.name}
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>
            <span className="director-mini-heading">{t("previs.v165.topView")}</span>
            <span className="director-mini-shot">{shot?.name}</span>
        </div>
    );
}
