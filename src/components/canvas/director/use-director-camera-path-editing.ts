import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { App } from "antd";
import { nanoid } from "nanoid";
import type { DirectorScene, DirectorVec3, PrevisPathSpec } from "@/types/director";
import { bakeDirectorCameraPath, moveDirectorCameraPathPoint, resolveDirectorCameraPath, setDirectorCameraPath, type DirectorCameraPathDrag } from "@/lib/canvas/director/director-camera-path";
import { createDirectorDraftTransaction, installDirectorTerminalListeners } from "@/lib/canvas/director/director-gesture-transaction";
import { compileDirectorRouteChange, deleteDirectorRoutePoint, insertDirectorRoutePoint } from "@/lib/canvas/director/director-route-editing";
import { blocksDirectorShortcut } from "@/lib/canvas/director/director-shortcuts";

export type DirectorCameraPathEditor = ReturnType<typeof useDirectorCameraPathEditing>;

export function useDirectorCameraPathEditing({
    scene,
    segmentId,
    frame,
    playing,
    open,
    pause,
    commit,
}: {
    scene: DirectorScene | null;
    segmentId: string | null;
    frame: number;
    playing: boolean;
    open: boolean;
    pause: () => void;
    commit: (updater: (current: DirectorScene) => DirectorScene) => void;
}) {
    const { message } = App.useApp();
    const [preview, setPreview] = useState<DirectorScene | null>(null);
    const [dragging, setDragging] = useState(false);
    const [adding, setAdding] = useState(false);
    const [heightEditing, setHeightEditing] = useState(false);
    const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
    const current = useRef({ scene, segmentId, frame, playing, open, pause, commit });
    current.current = { scene, segmentId, frame, playing, open, pause, commit };
    const drag = useRef<{ pointId: string; mode: DirectorCameraPathDrag; originalPath: PrevisPathSpec } | null>(null);
    const apply = useRef<(from: DirectorScene, to: DirectorScene) => void>(() => {});
    apply.current = (from, to) => {
        if (current.current.scene !== from || !current.current.open) return;
        try {
            const compiled = compileDirectorRouteChange(to);
            current.current.commit(() => compiled);
        } catch (error) {
            message.error(String(error));
        }
    };
    const transaction = useMemo(
        () =>
            createDirectorDraftTransaction<DirectorScene>({
                read: () => current.current.scene,
                preview: setPreview,
                setActive: setDragging,
                commit: (from, to) => apply.current(from, to),
            }),
        [],
    );
    const route = useMemo(() => (scene && !playing ? resolveDirectorCameraPath(preview ?? scene, segmentId, frame) : null), [scene, preview, segmentId, frame, playing]);
    const cancel = useCallback(() => {
        transaction.end("cancel");
        setAdding(false);
        setHeightEditing(false);
        setSelectedPointId(null);
        drag.current = null;
    }, [transaction]);
    useEffect(() => installDirectorTerminalListeners(transaction, { window, document, isHidden: () => document.visibilityState === "hidden", ignoreKeyDown: (event) => blocksDirectorShortcut(event.target) }), [transaction]);
    useEffect(() => {
        cancel();
    }, [segmentId, open, cancel]);
    useEffect(() => {
        if (playing) cancel();
    }, [playing, cancel]);
    useEffect(() => () => transaction.end("cancel"), [transaction]);

    const edit = useCallback(
        (update: (path: PrevisPathSpec) => PrevisPathSpec) => {
            const state = current.current;
            if (!state.scene || !state.open) return;
            transaction.end("cancel");
            const route = resolveDirectorCameraPath(state.scene, state.segmentId, state.frame);
            if (route?.segment.move !== "path") return;
            state.pause();
            const path = update(route.path);
            if (path !== route.path) apply.current(state.scene, setDirectorCameraPath(state.scene, route.segment.id, path));
        },
        [transaction],
    );
    const begin = useCallback(
        (pointId: string, mode: DirectorCameraPathDrag = "horizontal") => {
            const state = current.current;
            if (!state.scene || !state.open || state.playing) return false;
            const route = resolveDirectorCameraPath(state.scene, state.segmentId, state.frame);
            if (route?.segment.move !== "path" || !route.path.points.some((point) => point.id === pointId)) return false;
            state.pause();
            setAdding(false);
            setSelectedPointId(pointId);
            drag.current = { pointId, mode, originalPath: route.path };
            transaction.begin();
            return transaction.active();
        },
        [transaction],
    );
    const move = useCallback(
        (position: DirectorVec3) => {
            const selected = drag.current;
            if (!selected) return;
            transaction.stage((scene) => {
                const state = current.current;
                const route = resolveDirectorCameraPath(scene, state.segmentId, state.frame);
                if (!route) return scene;
                const path = moveDirectorCameraPathPoint(route.path, selected.pointId, position, selected.mode);
                return path === route.path ? scene : setDirectorCameraPath(scene, route.segment.id, path);
            });
        },
        [transaction],
    );
    return {
        scene: preview ?? scene,
        route,
        dragging,
        adding,
        heightEditing,
        selectedPointId,
        originalPath: dragging ? drag.current?.originalPath : undefined,
        begin,
        move,
        end: transaction.end,
        cancel,
        convert: () => {
            const state = current.current;
            if (!state.scene || !state.segmentId || !state.open) return;
            cancel();
            state.pause();
            try {
                const converted = bakeDirectorCameraPath(state.scene, state.segmentId);
                if (converted !== state.scene) state.commit(() => converted);
            } catch (error) {
                message.error(String(error));
            }
        },
        toggleHeight: () => {
            transaction.end("cancel");
            setHeightEditing((value) => !value);
        },
        setHeight: (height: number) => {
            if (selectedPointId) edit((path) => moveDirectorCameraPathPoint(path, selectedPointId, [0, height, 0], "height"));
        },
        setInterpolation: (interpolation: PrevisPathSpec["interpolation"]) => edit((path) => (path.interpolation === interpolation ? path : { ...path, interpolation })),
        startAdding: () => {
            current.current.pause();
            transaction.end("cancel");
            setAdding((value) => !value);
        },
        addAt: (point: { x: number; z: number }) => {
            if (!adding || !route) return;
            const height = route.path.points.find((item) => item.id === selectedPointId)?.position[1] ?? route.camera?.position[1] ?? 1.6;
            edit((path) => insertDirectorRoutePoint(path, [point.x, height, point.z], nanoid(), undefined, true));
            setAdding(false);
        },
        deleteSelected: () => {
            if (!selectedPointId || !route) return false;
            edit((path) => deleteDirectorRoutePoint(path, selectedPointId));
            return true;
        },
    };
}
