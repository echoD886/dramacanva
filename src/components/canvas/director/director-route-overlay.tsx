import { useEffect, useMemo, useRef } from "react";
import { Html, Line } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Group, OrthographicCamera, PerspectiveCamera, Plane, Vector3 } from "three";
import { useI18n } from "@/i18n/use-i18n";
import type { PrevisPathSpec } from "@/types/director";
import { buildPathArcTable, samplePathAtProgress } from "@/lib/canvas/director/director-previs-path";
import { directorRouteHitRadius, directorRouteIssues, directorRouteSamples } from "@/lib/canvas/director/director-route-editing";
import { PREVIS_PALETTE } from "@/lib/canvas/director/director-previs-look";
import type { DirectorRouteEditor } from "./use-director-route-editing";
import type { DirectorCameraPathEditor } from "./use-director-camera-path-editing";
import type { DirectorCameraPathDrag } from "@/lib/canvas/director/director-camera-path";

export type DirectorRouteOverlayProps = Pick<DirectorRouteEditor, "route" | "dragging" | "originalPath" | "selectedPointId" | "begin" | "move" | "end">;

export function DirectorRouteOverlay({ editor, onDragging }: { editor: DirectorRouteOverlayProps | DirectorCameraPathEditor; onDragging: (active: boolean) => void }) {
    const { route } = editor;
    const camera = useThree((state) => state.camera);
    const capture = useRef<{ releasePointerCapture: (id: number) => void; id: number; plane?: Plane; startHit?: Vector3; position?: Vector3 } | null>(null);
    const callbacks = useRef({ editor, onDragging });
    callbacks.current = { editor, onDragging };
    useEffect(() => {
        if (editor.dragging) return;
        const target = capture.current;
        capture.current = null;
        if (target) {
            target.releasePointerCapture(target.id);
            callbacks.current.onDragging(false);
        }
    }, [editor.dragging]);
    useEffect(
        () => () => {
            callbacks.current.editor.end("cancel");
            const target = capture.current;
            if (target) target.releasePointerCapture(target.id);
            callbacks.current.onDragging(false);
        },
        [],
    );
    if (!route) return null;
    const { path } = route;
    const cameraRoute = "segment" in route ? route : null;
    const cameraEditor = "heightEditing" in editor ? editor : null;
    const issues = "area" in route ? directorRouteIssues(path, route.area) : [];
    const selected = path.points.find((point) => point.id === editor.selectedPointId);
    const down =
        (point: PrevisPathSpec["points"][number], mode: DirectorCameraPathDrag = "horizontal") =>
        (event: import("@react-three/fiber").ThreeEvent<PointerEvent>) => {
            if (event.button !== 0) return;
            event.stopPropagation();
            const position = new Vector3(...point.position);
            const normal = mode === "height" ? camera.getWorldDirection(new Vector3()).setY(0).normalize() : new Vector3(0, 1, 0);
            if (normal.lengthSq() < 1e-8) return;
            const plane = new Plane().setFromNormalAndCoplanarPoint(normal, position);
            const startHit = cameraRoute ? event.ray.intersectPlane(plane, new Vector3()) : null;
            if (cameraRoute && !startHit) return;
            if (!(cameraEditor ? cameraEditor.begin(point.id, mode) : editor.begin(point.id))) return;
            onDragging(true);
            const target = event.target as unknown as { setPointerCapture: (id: number) => void; releasePointerCapture: (id: number) => void };
            target.setPointerCapture(event.pointerId);
            capture.current = { id: event.pointerId, releasePointerCapture: (id) => target.releasePointerCapture(id), ...(startHit ? { plane, startHit, position } : {}) };
        };
    const move = (event: import("@react-three/fiber").ThreeEvent<PointerEvent>) => {
        const drag = capture.current;
        if (drag?.id !== event.pointerId) return;
        event.stopPropagation();
        if (drag.plane && drag.startHit && drag.position) {
            const hit = event.ray.intersectPlane(drag.plane, new Vector3());
            if (hit) editor.move(hit.sub(drag.startHit).add(drag.position).toArray());
        } else {
            const hit = event.ray.intersectPlane(new Plane(new Vector3(0, 1, 0), 0), new Vector3());
            if (hit) editor.move([hit.x, 0, hit.z]);
        }
    };
    const up = (event: import("@react-three/fiber").ThreeEvent<PointerEvent>) => {
        event.stopPropagation();
        editor.end("commit");
    };
    return (
        <group userData={{ directorEditorOnly: true, directorNoMaterialOverride: true }}>
            {editor.originalPath && (cameraRoute ? <RouteLine path={editor.originalPath} faded elevated /> : <RouteLine path={editor.originalPath} faded />)}
            <RouteLine path={path} elevated={Boolean(cameraRoute)} />
            {issues.map((issue, index) => (
                <Line key={index} points={directorRouteSamples(path, issue.fromProgress, issue.toProgress).map(([x, , z]) => [x, 0.065, z])} color={PREVIS_PALETTE.routeEnd} lineWidth={5} depthTest={false} />
            ))}
            {cameraRoute &&
                [...new Set(cameraRoute.issues.filter((issue) => issue.kind === "collision").map((issue) => issue.obstacleId))].map((id) => {
                    const positions = cameraRoute.issues.filter((issue) => issue.kind === "collision" && issue.obstacleId === id && !issue.pointId).map((issue) => issue.position);
                    return positions.length > 1 ? <Line key={id} points={positions} color={PREVIS_PALETTE.cameraWarning} lineWidth={5} depthTest={false} /> : null;
                })}
            {cameraRoute?.camera && (
                <>
                    <Line points={[cameraRoute.camera.position, cameraRoute.camera.lookAt]} color={PREVIS_PALETTE.camera} lineWidth={1} dashed dashSize={0.09} gapSize={0.08} depthTest={false} />
                    <mesh position={cameraRoute.camera.lookAt} raycast={() => {}}>
                        <octahedronGeometry args={[0.1]} />
                        <meshBasicMaterial color={PREVIS_PALETTE.camera} depthTest={false} />
                    </mesh>
                </>
            )}
            {path.points.map((point, index) => (
                <RouteHandle
                    key={point.id}
                    position={point.position}
                    elevated={Boolean(cameraRoute)}
                    variant={cameraRoute ? "square" : undefined}
                    warning={cameraRoute?.issues.some((issue) => issue.pointId === point.id)}
                    selected={point.id === editor.selectedPointId}
                    label={index === 0 ? "start" : index === path.points.length - 1 ? "end" : undefined}
                    onDown={down(point)}
                    onMove={move}
                    onUp={up}
                />
            ))}
            {cameraEditor?.heightEditing && selected && (
                <>
                    <Line
                        points={[
                            [selected.position[0], Math.max(0, selected.position[1] - 0.65), selected.position[2]],
                            [selected.position[0], selected.position[1] + 0.65, selected.position[2]],
                        ]}
                        color={PREVIS_PALETTE.camera}
                        lineWidth={2}
                        depthTest={false}
                    />
                    {([-1, 1] as const).map((direction) => (
                        <RouteHandle
                            key={direction}
                            position={[selected.position[0], Math.max(0, selected.position[1] + direction * 0.65), selected.position[2]]}
                            elevated
                            variant={direction === 1 ? "up" : "down"}
                            selected
                            onDown={down(selected, "height")}
                            onMove={move}
                            onUp={up}
                        />
                    ))}
                </>
            )}
        </group>
    );
}

function RouteLine({ path, faded = false, elevated = false }: { path: PrevisPathSpec; faded?: boolean; elevated?: boolean }) {
    const table = useMemo(() => buildPathArcTable(path, elevated), [path, elevated]);
    const points = useMemo(() => directorRouteSamples(path, 0, 1, elevated).map(([x, y, z]) => [x, elevated ? y : 0.055, z] as [number, number, number]), [path, elevated]);
    if (points.length < 2) return null;
    return (
        <group>
            <Line points={points} color={elevated ? PREVIS_PALETTE.camera : PREVIS_PALETTE.route} lineWidth={2.5} dashed={faded} dashSize={0.12} gapSize={0.1} transparent opacity={faded ? 0.3 : 1} depthTest={false} />
            {!faded &&
                !elevated &&
                [0.25, 0.65, 0.95].map((progress) => {
                    const sample = samplePathAtProgress(table, progress)!;
                    const [x, , z] = sample.position,
                        [dx, , dz] = sample.tangent;
                    return (
                        <Line
                            key={progress}
                            points={[
                                [x - dx * 0.14 - dz * 0.08, 0.06, z - dz * 0.14 + dx * 0.08],
                                [x, 0.06, z],
                                [x - dx * 0.14 + dz * 0.08, 0.06, z - dz * 0.14 - dx * 0.08],
                            ]}
                            color={PREVIS_PALETTE.route}
                            lineWidth={2.5}
                            depthTest={false}
                        />
                    );
                })}
        </group>
    );
}

function RouteHandle({
    position,
    label,
    selected,
    elevated = false,
    variant,
    warning,
    onDown,
    onMove,
    onUp,
}: {
    position: [number, number, number];
    label?: "start" | "end";
    selected: boolean;
    elevated?: boolean;
    variant?: "square" | "up" | "down";
    warning?: boolean;
    onDown: (event: import("@react-three/fiber").ThreeEvent<PointerEvent>) => void;
    onMove: (event: import("@react-three/fiber").ThreeEvent<PointerEvent>) => void;
    onUp: (event: import("@react-three/fiber").ThreeEvent<PointerEvent>) => void;
}) {
    const { t } = useI18n();
    const ref = useRef<Group>(null);
    const { camera, size } = useThree();
    const point = useMemo(() => new Vector3(position[0], elevated ? position[1] : 0.07, position[2]), [position, elevated]);
    useFrame(() => {
        const radius = directorRouteHitRadius(
            camera.position.distanceTo(point),
            size.height,
            camera instanceof PerspectiveCamera ? camera.fov : 50,
            camera instanceof PerspectiveCamera || camera instanceof OrthographicCamera ? camera.zoom : 1,
            camera instanceof OrthographicCamera ? camera.top - camera.bottom : undefined,
        );
        ref.current?.scale.setScalar(radius);
    });
    return (
        <group position={point}>
            <group ref={ref}>
                <mesh onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}>
                    <sphereGeometry args={[1, 16, 12]} />
                    <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                </mesh>
                <mesh raycast={() => {}} rotation={variant === "down" ? [0, 0, Math.PI] : [0, 0, 0]}>
                    {variant === "square" ? <boxGeometry args={[selected ? 1.3 : 1, selected ? 1.3 : 1, selected ? 1.3 : 1]} /> : variant ? <coneGeometry args={[0.65, 1.2, 4]} /> : <sphereGeometry args={[selected ? 0.65 : 0.48, 16, 12]} />}
                    <meshBasicMaterial color={warning ? PREVIS_PALETTE.cameraWarning : elevated ? (selected ? PREVIS_PALETTE.selected : PREVIS_PALETTE.camera) : selected ? PREVIS_PALETTE.routeProgress : PREVIS_PALETTE.route} depthTest={false} />
                </mesh>
            </group>
            {label && (
                <Html center position={[0, -0.12, 0]} style={{ pointerEvents: "none" }}>
                    <span className="director-route-label">{t(label === "start" ? "directorR3.start" : "directorR3.end")}</span>
                </Html>
            )}
        </group>
    );
}
