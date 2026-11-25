import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { createCanvasRealtimeClient, canvasRealtimeURL, type CanvasRealtimeSnapshot, type PresencePoint, type PresenceNode } from "@/services/canvas-realtime-client";
import { subscribeCanvasGraphicsViewportPreview, subscribeCanvasNodeDragPreview } from "@/lib/canvas/canvas-live-viewport";
import { createCanvasEditLeaseSession, type CanvasEditLeaseState } from "@/services/canvas-edit-leases";
import { apiBaseURL } from "@/services/api/request";
import { discardCanvasNodeDraft, refreshCanvasAfterAgent, scheduleRemoteUserDataSync } from "@/services/user-data-sync";
import { useProductionText } from "@/i18n/production-tools";
import { useCanvasEditLeaseText } from "@/i18n/canvas-edit-lease";
import { getActiveUserScope } from "@/lib/user-scope";
import type { CanvasNodeData } from "@/types/canvas";
import { useCanvasStore } from "@/stores/canvas/use-canvas-store";

const colors = ["#6366f1", "#e11d48", "#059669", "#d97706", "#0284c7", "#9333ea"];
export function CanvasCollaborationLayer({
    canvasId,
    scope,
    enabled,
    containerRef,
    nodesRef,
    viewport,
    save,
    persist,
    onDiscard,
    editNodeId,
}: {
    canvasId: string;
    scope: string;
    enabled: boolean;
    containerRef: RefObject<HTMLDivElement | null>;
    nodesRef: RefObject<CanvasNodeData[]>;
    viewport: { x: number; y: number; k: number };
    save: () => boolean | Promise<boolean>;
    persist: () => Promise<void>;
    onDiscard: (nodeId: string) => void;
    editNodeId?: string;
}) {
    const copy = useProductionText();
    const leaseCopy = useCanvasEditLeaseText();
    const saveRef = useRef({ canvasId, scope, save, persist, onDiscard });
    saveRef.current = { canvasId, scope, save, persist, onDiscard };
    const pinnedNodeRef = useRef(editNodeId);
    pinnedNodeRef.current = editNodeId;
    const editRef = useRef<(id?: string) => void>(() => undefined);
    useEffect(() => {
        editRef.current(editNodeId);
    }, [editNodeId]);
    const viewportRef = useRef(viewport);
    const [liveViewport, setLiveViewport] = useState(viewport);
    useEffect(() => {
        viewportRef.current = viewport;
        setLiveViewport(viewport);
    }, [viewport]);
    const [snapshot, setSnapshot] = useState<CanvasRealtimeSnapshot>({ connected: false, selfId: null, peers: [] });
    const [issues, setIssues] = useState<Record<string, CanvasEditLeaseState>>({});
    const resolveRef = useRef<(id: string, discard: boolean) => void>(() => undefined);
    const [expanded, setExpanded] = useState(false);
    const [client, setClient] = useState<ReturnType<typeof createCanvasRealtimeClient> | null>(null);
    useEffect(() => {
        if (!enabled || !canvasId) return;
        const realtime = createCanvasRealtimeClient({ url: canvasRealtimeURL(apiBaseURL, canvasId, location.href), revision: () => useCanvasStore.getState().openProject(canvasId)?.revision });
        let active = true,
            refreshing = false;
        const retrying = new Set<string>();
        const retryErrors = new Set<string>();
        const states = new Map<string, CanvasEditLeaseState>();
        setIssues({});
        const leases = createCanvasEditLeaseSession(
            canvasId,
            async (nodeId) => {
                await saveRef.current.persist();
                return refreshCanvasAfterAgent(canvasId, { focusCreatedNodes: false, preferLocalNodeId: retrying.has(nodeId) ? nodeId : undefined });
            },
            (id, state) => {
                if (!active) return;
                states.set(id, state);
                setIssues((current) => {
                    const next = { ...current };
                    if (state === "ready") delete next[id];
                    else next[id] = state;
                    return next;
                });
                if (state === "ready") {
                    retrying.delete(id);
                    retryErrors.delete(id);
                    scheduleRemoteUserDataSync();
                }
                if (state === "error") retryErrors.add(id);
                if (state === "conflict") retryErrors.delete(id);
            },
        );
        setClient(realtime);
        let timer: ReturnType<typeof setTimeout> | undefined;
        let blurTimer: ReturnType<typeof setTimeout> | undefined;
        let editingNodeId: string | undefined;
        const flush = () => {
            const current = saveRef.current;
            return getActiveUserScope() === scope && current.canvasId === canvasId && current.scope === scope ? current.save() : false;
        };
        const release = async (id: string) => {
            if (getActiveUserScope() !== scope) return;
            try {
                if (!(await flush())) return;
            } catch {
                /* The existing save flow retains the local draft and reports the error. */
                return;
            }
            if (editingNodeId !== id) await leases.release(id, () => editingNodeId !== id).catch(() => undefined);
        };
        const refresh = async () => {
            if (!active || refreshing || document.hidden) return;
            refreshing = true;
            try {
                await saveRef.current.persist();
                await refreshCanvasAfterAgent(canvasId, { focusCreatedNodes: false });
            } catch {
                /* Existing sync UI preserves and reports conflicts. */
            } finally {
                refreshing = false;
            }
        };
        const unsubscribe = realtime.subscribe((state, event) => {
            if (!active) return;
            setSnapshot(state);
            if (event === "invalidate" && !timer)
                timer = setTimeout(() => {
                    timer = undefined;
                    void refresh();
                }, 350);
        });
        const poll = setInterval(() => {
            void refresh();
        }, 15000);
        const renew = setInterval(() => {
            void leases.renew().catch(() => undefined);
        }, 10000);
        const retry = setInterval(() => {
            if (document.hidden) return;
            for (const id of new Set([...retrying, ...retryErrors])) void leases.acquire(id).catch(() => undefined);
        }, 2000);
        resolveRef.current = (id, discard) => {
            if (!discard) {
                retrying.add(id);
                void leases.acquire(id).catch(() => undefined);
                return;
            }
            retrying.delete(id);
            retryErrors.delete(id);
            void (async () => {
                await saveRef.current.persist();
                await discardCanvasNodeDraft(canvasId, id);
                await leases.discard(id);
                if (!active || getActiveUserScope() !== scope) return;
                states.delete(id);
                setIssues((current) => {
                    const next = { ...current };
                    delete next[id];
                    return next;
                });
                saveRef.current.onDiscard(id);
                await refreshCanvasAfterAgent(canvasId, { focusCreatedNodes: false });
                scheduleRemoteUserDataSync();
            })().catch(() => {
                if (active) setIssues((current) => ({ ...current, [id]: "error" }));
            });
        };
        const edit = (id?: string) => {
            id = pinnedNodeRef.current || id;
            if (blurTimer) clearTimeout(blurTimer);
            const previous = editingNodeId;
            editingNodeId = id;
            if (previous && previous !== id) void release(previous);
            if (id) {
                // Acquisition gates remote writes, never native/IME input.
                if (states.get(id) !== "conflict" || retrying.has(id)) void leases.acquire(id).catch(() => undefined);
            }
        };
        editRef.current = edit;
        edit(pinnedNodeRef.current);
        const owner = (element: HTMLElement) => {
            const container = element.closest<HTMLElement>("[data-canvas-edit-node-id],[data-node-id]");
            return container?.dataset.canvasEditNodeId || container?.dataset.nodeId;
        };
        const focus = (event: FocusEvent) => {
            const element = event.target;
            if (!(element instanceof HTMLElement) || (!element.matches("input,textarea") && !element.isContentEditable)) return;
            edit(owner(element));
        };
        document.addEventListener("focusin", focus, true);
        const blur = () => {
            if (blurTimer) clearTimeout(blurTimer);
            blurTimer = setTimeout(() => {
                const id = pinnedNodeRef.current || (document.activeElement instanceof HTMLElement ? owner(document.activeElement) : undefined);
                if (editingNodeId && editingNodeId !== id) {
                    const previous = editingNodeId;
                    editingNodeId = undefined;
                    void release(previous);
                }
            }, 250);
        };
        document.addEventListener("focusout", blur, true);
        const hide = () => leases.releaseOnPageHide();
        const visible = () => {
            // A tab switch is not an editor exit. Keep the proof until pagehide;
            // renew on return and reacquire only if it has expired.
            if (!document.hidden) {
                void leases.renew().catch(() => undefined);
                for (const id of leases.nodeIds()) {
                    if (states.get(id) !== "conflict" || retrying.has(id)) void leases.acquire(id).catch(() => undefined);
                }
                const element = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
                edit(element ? owner(element) : undefined);
                void refresh();
            }
        };
        window.addEventListener("pagehide", hide);
        document.addEventListener("visibilitychange", visible);
        return () => {
            active = false;
            editRef.current = () => undefined;
            resolveRef.current = () => undefined;
            unsubscribe();
            realtime.close();
            clearInterval(poll);
            clearInterval(renew);
            clearInterval(retry);
            if (timer) clearTimeout(timer);
            if (blurTimer) clearTimeout(blurTimer);
            document.removeEventListener("focusin", focus, true);
            document.removeEventListener("focusout", blur, true);
            window.removeEventListener("pagehide", hide);
            document.removeEventListener("visibilitychange", visible);
            void Promise.resolve()
                .then(flush)
                .then((saved) => leases.close(saved))
                .catch(() => leases.close(false));
        };
    }, [canvasId, scope, enabled, containerRef]);
    useEffect(() => {
        const container = containerRef.current;
        if (!client || !container) return;
        let rect = container.getBoundingClientRect();
        let cursor: PresencePoint | null = null;
        let drag: PresenceNode[] | null = null;
        let lastClient: { x: number; y: number } | null = null;
        const measure = () => {
            rect = container.getBoundingClientRect();
        };
        const move = (event: PointerEvent) => {
            const matrix = viewportRef.current;
            lastClient = { x: event.clientX, y: event.clientY };
            cursor = { x: (event.clientX - rect.left - matrix.x) / matrix.k, y: (event.clientY - rect.top - matrix.y) / matrix.k };
            client.update(cursor, drag);
        };
        const leave = () => {
            cursor = null;
            lastClient = null;
            client.update(null, drag, true);
        };
        const clear = () => {
            drag = null;
            leave();
        };
        const unsubscribeDrag = subscribeCanvasNodeDragPreview(container, (preview) => {
            drag = preview
                ? nodesRef.current
                      .filter((node) => preview.nodeIds.has(node.id))
                      .slice(0, 100)
                      .map((node) => ({ id: node.id, x: node.position.x + preview.x, y: node.position.y + preview.y, width: node.width, height: node.height }))
                : null;
            client.update(cursor, drag, !preview);
        });
        const unsubscribeViewport = subscribeCanvasGraphicsViewportPreview(container, (matrix) => {
            viewportRef.current = matrix;
            setLiveViewport(matrix);
            if (lastClient) {
                cursor = { x: (lastClient.x - rect.left - matrix.x) / matrix.k, y: (lastClient.y - rect.top - matrix.y) / matrix.k };
                client.update(cursor, drag);
            }
        });
        container.addEventListener("pointermove", move, { passive: true });
        container.addEventListener("pointerleave", leave);
        window.addEventListener("resize", measure);
        window.addEventListener("scroll", measure, true);
        window.addEventListener("blur", clear);
        return () => {
            unsubscribeDrag();
            unsubscribeViewport();
            container.removeEventListener("pointermove", move);
            container.removeEventListener("pointerleave", leave);
            window.removeEventListener("resize", measure);
            window.removeEventListener("scroll", measure, true);
            window.removeEventListener("blur", clear);
        };
    }, [client, containerRef, nodesRef]);
    if (!enabled || !containerRef.current) return null;
    const peers = snapshot.peers.filter((peer) => peer.id !== snapshot.selfId);
    return (
        <>
            {createPortal(
                <div className="pointer-events-none absolute inset-0 z-[var(--z-panel)] overflow-hidden" data-canvas-collaboration>
                    {peers.map((peer) => {
                        const color = colors[(peer.number - 1) % colors.length];
                        return (
                            <div key={peer.id}>
                                {peer.cursor && (
                                    <div className="absolute text-xs" style={{ transform: `translate(${peer.cursor.x * liveViewport.k + liveViewport.x}px,${peer.cursor.y * liveViewport.k + liveViewport.y}px)`, color }}>
                                        <svg width="16" height="20" viewBox="0 0 16 20" aria-hidden="true">
                                            <path d="M1 1L14 12L8 13L5 19Z" fill="currentColor" stroke="white" />
                                        </svg>
                                        <span className="whitespace-nowrap rounded px-1 text-white" style={{ background: color }}>
                                            {copy(21, { number: peer.number })}
                                        </span>
                                    </div>
                                )}
                                {peer.drag?.map((node) => (
                                    <div
                                        key={node.id}
                                        className="absolute rounded border-2"
                                        style={{
                                            transform: `translate(${node.x * liveViewport.k + liveViewport.x}px,${node.y * liveViewport.k + liveViewport.y}px)`,
                                            width: node.width * liveViewport.k,
                                            height: node.height * liveViewport.k,
                                            borderColor: color,
                                        }}
                                    />
                                ))}
                            </div>
                        );
                    })}
                    {peers.length > 0 && (
                        <div className="pointer-events-auto absolute left-1/2 top-2 -translate-x-1/2 rounded-lg border border-foreground/15 bg-background p-2 text-xs shadow" data-canvas-no-zoom>
                            <button type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
                                {copy(41, { count: snapshot.peers.length })}
                            </button>
                            {expanded && (
                                <ul>
                                    {snapshot.peers.map((peer) => (
                                        <li key={peer.id} style={{ color: colors[(peer.number - 1) % colors.length] }}>
                                            {copy(21, { number: peer.number })}
                                            {peer.id === snapshot.selfId ? ` · ${copy(20)}` : ""}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>,
                containerRef.current,
            )}
            {Object.keys(issues).length > 0 &&
                createPortal(
                    <div className="fixed bottom-6 left-1/2 z-[var(--z-max)] grid max-w-md -translate-x-1/2 gap-2" data-canvas-no-zoom data-canvas-lease-status>
                        {Object.entries(issues).map(([id, state]) => (
                            <div key={id} role="status" className="rounded-lg border border-foreground/15 bg-background p-3 text-sm text-foreground shadow">
                                <strong>{nodesRef.current.find((node) => node.id === id)?.title}</strong>
                                <p>{leaseCopy[state === "conflict" ? "conflict" : state === "error" ? "error" : "pending"]}</p>
                                {state !== "pending" && (
                                    <div className="mt-2 flex gap-4">
                                        <button type="button" className="underline" onClick={() => resolveRef.current(id, false)}>
                                            {leaseCopy.continue}
                                        </button>
                                        <button type="button" className="underline" onClick={() => resolveRef.current(id, true)}>
                                            {leaseCopy.discard}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>,
                    document.body,
                )}
        </>
    );
}
