import { useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import { AGENT_LAUNCHER_POSITION_KEY, clampAgentLauncherPosition, moveAgentLauncher, restoreAgentLauncherPosition, type AgentLauncherGesture, type AgentLauncherPosition } from "@/lib/canvas/agent-launcher-position";

const viewport = () => ({ width: window.innerWidth, height: window.innerHeight });

export function useDcPosition(visible = true) {
    const ref = useRef<HTMLButtonElement>(null);
    const [position, setPosition] = useState<AgentLauncherPosition | null>(null);
    const gesture = useRef<(AgentLauncherGesture & { id: number }) | null>(null);
    const suppressClick = useRef(false);
    useLayoutEffect(() => {
        const element = ref.current;
        if (!visible || !element) return;
        const fit = () => {
            let raw: string | null = null;
            try {
                raw = localStorage.getItem(AGENT_LAUNCHER_POSITION_KEY);
            } catch {
                /* Storage may be disabled. */
            }
            if (raw) setPosition(restoreAgentLauncherPosition(raw, viewport(), element.getBoundingClientRect()));
        };
        // The observer's initial callback runs after layout; calling fit() here forced a layout during route mounts.
        const observer = new ResizeObserver(fit);
        observer.observe(element);
        window.addEventListener("resize", fit);
        return () => {
            observer.disconnect();
            window.removeEventListener("resize", fit);
        };
    }, [visible]);
    const save = (next: AgentLauncherPosition) => {
        setPosition(next);
        try {
            localStorage.setItem(AGENT_LAUNCHER_POSITION_KEY, JSON.stringify(next));
        } catch {
            /* Position still works for this visit. */
        }
    };
    const current = (el: HTMLElement) => {
        const box = el.getBoundingClientRect();
        return { right: window.innerWidth - box.right, bottom: window.innerHeight - box.bottom };
    };
    const move = (e: PointerEvent<HTMLButtonElement>) => {
        const g = gesture.current;
        if (!g || e.pointerId !== g.id) return;
        e.stopPropagation();
        const next = moveAgentLauncher(g, e.clientX, e.clientY, viewport(), e.currentTarget.getBoundingClientRect());
        if (next.dragged) {
            g.dragged = true;
            suppressClick.current = true;
            setPosition(next.position);
        }
        return next;
    };
    const handlers = {
        onPointerDown(e: PointerEvent<HTMLButtonElement>) {
            if (!e.isPrimary || e.button !== 0) return;
            e.stopPropagation();
            suppressClick.current = false;
            gesture.current = { id: e.pointerId, start: current(e.currentTarget), x: e.clientX, y: e.clientY, dragged: false };
            e.currentTarget.setPointerCapture(e.pointerId);
        },
        onPointerMove: move,
        onPointerUp(e: PointerEvent<HTMLButtonElement>) {
            const next = move(e);
            if (!next) return;
            gesture.current = null;
            if (next.dragged) save(next.position);
        },
        onLostPointerCapture() {
            if (gesture.current?.dragged && position) save(position);
            gesture.current = null;
        },
        onClickCapture(e: MouseEvent<HTMLButtonElement>) {
            if (e.detail && suppressClick.current) {
                e.stopPropagation();
                e.preventDefault();
            }
        },
        onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
            const step = e.shiftKey ? 40 : 10;
            const offsets: Record<string, number[]> = { ArrowUp: [0, step], ArrowDown: [0, -step], ArrowLeft: [step, 0], ArrowRight: [-step, 0] };
            const offset = offsets[e.key];
            if (!offset) return;
            e.preventDefault();
            e.stopPropagation();
            const start = current(e.currentTarget);
            save(clampAgentLauncherPosition({ right: start.right + offset[0], bottom: start.bottom + offset[1] }, viewport(), e.currentTarget.getBoundingClientRect()));
        },
    };
    return { ref, position, handlers };
}
