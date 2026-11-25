import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { App } from "antd";
import { nanoid } from "nanoid";
import type { DirectorScene, DirectorVec3, PrevisPathSpec } from "@/types/director";
import { currentLocaleText as t } from "@/i18n/current-locale-text";
import { createDirectorDraftTransaction, installDirectorTerminalListeners } from "@/lib/canvas/director/director-gesture-transaction";
import { blocksDirectorShortcut } from "@/lib/canvas/director/director-shortcuts";
import { canAddDirectorRoutePoint, deleteDirectorRoutePoint, insertDirectorRoutePoint, moveDirectorRoutePoint, requestDirectorRouteChange, resolveDirectorRoute, setDirectorRoutePath } from "@/lib/canvas/director/director-route-editing";

export type DirectorRouteEditor = ReturnType<typeof useDirectorRouteEditing>;

export function useDirectorRouteEditing({
    scene,
    actorId,
    frame,
    playing,
    open,
    pause,
    commit,
}: {
    scene: DirectorScene | null;
    actorId: string | null;
    frame: number;
    playing: boolean;
    open: boolean;
    pause: () => void;
    commit: (updater: (current: DirectorScene) => DirectorScene) => void;
}) {
    const { modal, message } = App.useApp();
    const [preview, setPreview] = useState<DirectorScene | null>(null);
    const [dragging, setDragging] = useState(false);
    const [adding, setAdding] = useState(false);
    const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
    const current = useRef({ scene, actorId, frame, playing, open, pause, commit });
    current.current = { scene, actorId, frame, playing, open, pause, commit };
    const drag = useRef<{ actionId: string; pointId: string; originalPath: PrevisPathSpec } | null>(null);
    const applyRef = useRef<(from: DirectorScene, to: DirectorScene, actionId: string) => void>(() => {});
    const pendingConfirmation = useRef(false);
    applyRef.current = (from, to, actionId) => {
        try {
            requestDirectorRouteChange(to, actionId, {
                isCurrent: () => current.current.open && current.current.scene === from,
                apply: (scene) => current.current.commit(() => scene),
                confirm: (segments, apply) => {
                    pendingConfirmation.current = true;
                    modal.confirm({
                        title: t("directorP16.keepSpeedConfirm"),
                        content: `${t("directorP10.affectedSegments")}：${segments.map((item) => item.name).join("、") || t("directorP10.none")}`,
                        onOk: () => {
                            pendingConfirmation.current = false;
                            try {
                                apply();
                            } catch (error) {
                                message.error(String(error));
                            }
                        },
                        onCancel: () => {
                            pendingConfirmation.current = false;
                        },
                    });
                },
            });
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
                commit: (from, to) => {
                    if (drag.current) applyRef.current(from, to, drag.current.actionId);
                },
            }),
        [],
    );
    useEffect(() => installDirectorTerminalListeners(transaction, { window, document, isHidden: () => document.visibilityState === "hidden", ignoreKeyDown: (event) => blocksDirectorShortcut(event.target) }), [transaction]);
    const route = useMemo(() => (scene ? resolveDirectorRoute(preview ?? scene, actorId, frame) : null), [scene, preview, actorId, frame]);
    useEffect(() => {
        transaction.end("cancel");
        setAdding(false);
        setSelectedPointId(null);
        drag.current = null;
    }, [actorId, route?.action.id, open, transaction]);
    useEffect(() => {
        if (!playing) return;
        transaction.end("cancel");
        setAdding(false);
        setSelectedPointId(null);
        drag.current = null;
    }, [playing, transaction]);
    useEffect(() => () => transaction.end("cancel"), [transaction]);

    const edit = useCallback(
        (update: (path: PrevisPathSpec) => PrevisPathSpec) => {
            const state = current.current;
            if (!state.scene || pendingConfirmation.current) return;
            transaction.end("cancel");
            const route = resolveDirectorRoute(state.scene, state.actorId, state.frame);
            if (!route) return;
            state.pause();
            const path = update(route.path);
            if (path !== route.path) applyRef.current(state.scene, setDirectorRoutePath(state.scene, route.action.id, path), route.action.id);
        },
        [transaction],
    );
    const begin = useCallback(
        (pointId: string) => {
            const state = current.current;
            if (!state.scene || state.playing || !state.open || pendingConfirmation.current) return false;
            const route = resolveDirectorRoute(state.scene, state.actorId, state.frame);
            if (!route?.path.points.some((point) => point.id === pointId)) return false;
            state.pause();
            setAdding(false);
            setSelectedPointId(pointId);
            drag.current = { actionId: route.action.id, pointId, originalPath: route.path };
            transaction.begin();
            // 首次路径迁移只进入事务副本；取消不会遗留 pathId 或 paths。
            transaction.stage((scene) => setDirectorRoutePath(scene, route.action.id, route.path));
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
                const route = resolveDirectorRoute(scene, state.actorId, state.frame);
                if (!route) return scene;
                const path = moveDirectorRoutePoint(route.path, selected.pointId, position, route.area);
                return path === route.path ? scene : setDirectorRoutePath(scene, selected.actionId, path);
            });
        },
        [transaction],
    );
    return {
        scene: preview ?? scene,
        route,
        dragging,
        adding,
        selectedPointId,
        originalPath: dragging ? drag.current?.originalPath : undefined,
        begin,
        move,
        end: transaction.end,
        cancel: () => {
            transaction.end("cancel");
            setAdding(false);
            setSelectedPointId(null);
        },
        deleteSelected: () => {
            if (!selectedPointId || !route) return false;
            edit((path) => deleteDirectorRoutePoint(path, selectedPointId));
            return true;
        },
        startAdding: () => {
            current.current.pause();
            transaction.end("cancel");
            setAdding((value) => !value);
        },
        addAt: (point: { x: number; z: number }) => {
            if (!adding || !route) return;
            if (!canAddDirectorRoutePoint([point.x, 0, point.z], route.area)) return;
            edit((path) => insertDirectorRoutePoint(path, [point.x, 0, point.z], nanoid(), route.area));
            setAdding(false);
        },
        reset: () => edit((path) => ({ ...path, points: [path.points[0], path.points.at(-1)!], interpolation: "linear" })),
        setInterpolation: (interpolation: PrevisPathSpec["interpolation"]) => edit((path) => (path.interpolation === interpolation ? path : { ...path, interpolation })),
        setTimingPolicy: (timingPolicy: PrevisPathSpec["timingPolicy"]) => edit((path) => (path.timingPolicy === timingPolicy ? path : { ...path, timingPolicy })),
    };
}
