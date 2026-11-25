import { useEffect, useRef, useState, type PointerEvent } from "react";
import { constrainDirectorWindow, readDirectorWindow, rememberDirectorWindow, resizeDirectorWindow, type DirectorWindowBounds, type DirectorWindowEdge } from "@/lib/canvas/director/director-window";

const viewport = () => (typeof window === "undefined" ? { width: 1280, height: 800 } : { width: window.innerWidth, height: window.innerHeight });

export function useDirectorWindow(scope: string) {
    const rootRef = useRef<HTMLDivElement>(null);
    const [bounds, setBounds] = useState(() => readDirectorWindow(scope, viewport()));
    const [maximized, setMaximized] = useState(true);
    const [screen, setScreen] = useState(viewport);
    const visibleBounds = constrainDirectorWindow(bounds, screen);
    const gesture = useRef<{ pointerId: number; x: number; y: number; start: DirectorWindowBounds; edge?: DirectorWindowEdge; target: HTMLElement } | null>(null);
    const boundsRef = useRef(bounds);
    boundsRef.current = bounds;

    useEffect(() => {
        setBounds(readDirectorWindow(scope, viewport()));
        setMaximized(true);
    }, [scope]);
    useEffect(() => {
        const resize = () => {
            setScreen(viewport());
        };
        window.addEventListener("resize", resize);
        return () => window.removeEventListener("resize", resize);
    }, []);
    useEffect(() => {
        rootRef.current?.focus({ preventScroll: true });
    }, []);
    useEffect(() => {
        const release = () => {
            const active = gesture.current;
            gesture.current = null;
            if (active?.target.hasPointerCapture(active.pointerId)) active.target.releasePointerCapture(active.pointerId);
            rememberDirectorWindow(scope, boundsRef.current);
        };
        window.addEventListener("blur", release);
        return () => {
            window.removeEventListener("blur", release);
            release();
        };
    }, [scope]);

    const finish = (pointerId?: number) => {
        const active = gesture.current;
        if (!active || (pointerId !== undefined && pointerId !== active.pointerId)) return;
        gesture.current = null;
        if (active?.target.hasPointerCapture(active.pointerId)) active.target.releasePointerCapture(active.pointerId);
        rememberDirectorWindow(scope, boundsRef.current);
    };
    const begin = (event: PointerEvent<HTMLElement>, edge?: DirectorWindowEdge) => {
        event.stopPropagation();
        if (maximized || event.button !== 0 || gesture.current) return;
        event.preventDefault();
        const target = event.currentTarget;
        target.setPointerCapture(event.pointerId);
        gesture.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, start: visibleBounds, edge, target };
    };
    const move = (event: PointerEvent) => {
        const active = gesture.current;
        if (!active || event.pointerId !== active.pointerId) return;
        const dx = event.clientX - active.x;
        const dy = event.clientY - active.y;
        setBounds(active.edge ? resizeDirectorWindow(active.start, active.edge, dx, dy, viewport()) : constrainDirectorWindow({ ...active.start, x: active.start.x + dx, y: active.start.y + dy }, viewport()));
    };
    const toggleMaximized = () => {
        finish();
        rememberDirectorWindow(scope, boundsRef.current);
        setMaximized((current) => !current);
    };

    return {
        rootRef,
        bounds: visibleBounds,
        maximized,
        width: maximized ? screen.width : visibleBounds.width,
        begin,
        move,
        finish,
        toggleMaximized,
        style: maximized ? { left: 0, top: 0, width: "100%", height: "100%" } : { left: visibleBounds.x, top: visibleBounds.y, width: visibleBounds.width, height: visibleBounds.height },
    };
}
