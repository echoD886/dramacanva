import { ApiError, apiClient, request } from "./api/request";
import { getActiveUserScope } from "@/lib/user-scope";
import { prepareCanvasEditorSession } from "./canvas-editor-session";
import { canvasEditLeaseText } from "@/i18n/canvas-edit-lease";
import { resolveAppLocale } from "@/i18n/app-locale";

type Proof = { nodeId: string; sessionId: string; token: string };
export type CanvasEditLeaseState = "pending" | "ready" | "conflict" | "error";
const owned = new Map<string, Map<string, Proof>>();
const sessions = new Map<string, { acquire: (nodeId: string) => Promise<void>; isReady: (nodeId: string) => boolean; nodeIds: () => string[] }>();
const resumable = new Map<string, string[]>();
const keyFor = (id: string) => `${getActiveUserScope()}:${id}`;
export const canvasEditProofs = (id: string) => [...(owned.get(keyFor(id))?.values() || [])].filter((proof) => canvasNodeEditingReady(id, proof.nodeId));
export const canvasNodeEditingReady = (canvasId: string, nodeId: string) => sessions.get(keyFor(canvasId))?.isReady(nodeId) ?? false;
export const canvasEditingNodeIds = (id: string) => [...new Set([...(sessions.get(keyFor(id))?.nodeIds() || []), ...(resumable.get(keyFor(id)) || [])])];

// Do not wait inside the sync mutex: acquiring a lease itself refreshes the
// remote snapshot through that mutex. Retain the local write and retry on ready.
export class CanvasEditLeasePendingError extends Error {
    constructor() {
        super(canvasEditLeaseText(resolveAppLocale()).pending);
    }
}
export function assertCanvasEditsReady(canvasId: string) {
    if (canvasEditingNodeIds(canvasId).some((id) => !canvasNodeEditingReady(canvasId, id))) throw new CanvasEditLeasePendingError();
}

export function resumeCanvasEditLeases(canvasId: string, nodeIds: string[]) {
    const key = keyFor(canvasId);
    const session = sessions.get(key);
    if (session) {
        resumable.delete(key);
        for (const id of nodeIds) void session.acquire(id).catch(() => undefined);
    } else resumable.set(key, nodeIds);
}

export function acquireCanvasNodeEditLease(canvasId: string, nodeId: string) {
    const session = sessions.get(keyFor(canvasId));
    return session ? session.acquire(nodeId) : Promise.reject(new Error("canvas_edit_lease_conflict"));
}

export function createCanvasEditLeaseSession(canvasId: string, prepareEditing?: (nodeId: string) => Promise<unknown>, onState?: (nodeId: string, state: CanvasEditLeaseState) => void) {
    const key = keyFor(canvasId);
    const identity = prepareCanvasEditorSession();
    const proofs = new Map<string, Proof>();
    const pending = new Map<string, Promise<void>>();
    const prepared = new Set<string>();
    const requested = new Set<string>();
    const acquiring = new Map<string, Promise<void>>();
    owned.set(key, proofs);
    let closed = false,
        closing = false,
        suspended = false;
    const beacon = (proof: Proof) => {
        // Keep the scope/team headers as well as cookies: sendBeacon cannot attach
        // the identity fence used by the shared business API client.
        void request(apiClient.post(`/canvas-projects/${encodeURIComponent(canvasId)}/edit-lease`, { ...proof, action: "release" }, { adapter: "fetch", fetchOptions: { keepalive: true } })).catch(() => undefined);
    };
    const change = async (nodeId: string, action: string) => {
        const sessionId = await identity;
        if (closed || keyFor(canvasId) !== key) throw new Error("canvas_edit_lease_conflict");
        if (action !== "acquire" && !proofs.has(nodeId)) return;
        const proof = proofs.get(nodeId) || { nodeId, sessionId, token: "" };
        const result = await request<{ token?: string }>(apiClient.post(`/canvas-projects/${encodeURIComponent(canvasId)}/edit-lease`, { ...proof, action }));
        if (suspended && result.token && keyFor(canvasId) === key) {
            beacon({ nodeId, sessionId, token: result.token });
            return;
        }
        if (closed || keyFor(canvasId) !== key) throw new Error("canvas_edit_lease_conflict");
        if (action === "release") {
            proofs.delete(nodeId);
            prepared.delete(nodeId);
            if (!acquiring.has(nodeId)) requested.delete(nodeId);
        } else if (result.token) {
            if (proofs.get(nodeId)?.token !== result.token) prepared.delete(nodeId);
            proofs.set(nodeId, { nodeId, sessionId, token: result.token });
            // Refresh/merge the preceding owner's revision before permitting a
            // remote write. The input itself remains an optimistic local draft.
            if (action === "acquire" && !prepared.has(nodeId)) {
                await prepareEditing?.(nodeId);
                if (closed || suspended || keyFor(canvasId) !== key || proofs.get(nodeId)?.token !== result.token) throw new Error("canvas_edit_lease_conflict");
                prepared.add(nodeId);
            }
            if (action === "acquire") onState?.(nodeId, "ready");
        } else throw new Error("canvas_edit_lease_conflict");
    };
    // Serialize all mutations for a node: a delayed renewal must never recreate
    // a proof after release, and close must drain an in-flight acquisition.
    const enqueue = (nodeId: string, action: string, shouldApply = () => true) => {
        if (closed || (closing && action !== "release")) return Promise.reject(new Error("canvas_edit_lease_conflict"));
        const operation = (pending.get(nodeId) || Promise.resolve()).catch(() => undefined).then(() => (shouldApply() ? change(nodeId, action) : undefined));
        pending.set(nodeId, operation);
        void operation
            .finally(() => {
                if (pending.get(nodeId) === operation) pending.delete(nodeId);
            })
            .catch(() => undefined);
        return operation;
    };
    const session = {
        isReady: (nodeId: string) => prepared.has(nodeId),
        nodeIds: () => [...requested],
        acquire(nodeId: string) {
            suspended = false;
            if (acquiring.has(nodeId)) return acquiring.get(nodeId)!;
            if (prepared.has(nodeId) && !pending.has(nodeId)) return Promise.resolve();
            requested.add(nodeId);
            onState?.(nodeId, "pending");
            const operation = enqueue(nodeId, "acquire")
                .catch((error) => {
                    prepared.delete(nodeId);
                    if (!closed && !suspended && keyFor(canvasId) === key) onState?.(nodeId, error instanceof ApiError && error.status === 409 && error.reason === "canvas_edit_lease_conflict" ? "conflict" : "error");
                    throw error;
                })
                .finally(() => acquiring.delete(nodeId));
            acquiring.set(nodeId, operation);
            return operation;
        },
        releaseOnPageHide() {
            if (closed || keyFor(canvasId) !== key) return;
            suspended = true;
            for (const proof of proofs.values()) beacon(proof);
            proofs.clear();
            prepared.clear();
        },
        renew: () =>
            Promise.all(
                [...proofs.keys()].map((id) =>
                    enqueue(id, "renew").catch((error) => {
                        prepared.delete(id);
                        // Background tabs can outlive the server lease. Reacquire to learn
                        // whether it merely expired or another editor actually owns it.
                        if (!closed && !suspended && keyFor(canvasId) === key && error instanceof ApiError && error.status === 409 && error.reason === "canvas_edit_lease_conflict") {
                            proofs.delete(id);
                            return session.acquire(id);
                        }
                        if (!closed && !suspended && keyFor(canvasId) === key) onState?.(id, error instanceof ApiError && error.status === 409 && error.reason === "canvas_edit_lease_conflict" ? "conflict" : "error");
                        throw error;
                    }),
                ),
            ),
        async discard(nodeId: string) {
            await session.release(nodeId).catch((error) => {
                if (!(error instanceof ApiError) || error.status !== 409 || error.reason !== "canvas_edit_lease_conflict") throw error;
            });
            proofs.delete(nodeId);
            prepared.delete(nodeId);
            requested.delete(nodeId);
        },
        async release(nodeId: string, shouldRelease?: () => boolean) {
            await enqueue(nodeId, "release", shouldRelease);
        },
        async close(release = true) {
            closing = true;
            try {
                await Promise.allSettled([...pending.values()]);
                if (release) await Promise.allSettled([...proofs.keys()].map((id) => enqueue(id, "release")));
            } finally {
                closed = true;
                if (!release && requested.size) resumable.set(key, [...requested]);
                if (owned.get(key) === proofs) owned.delete(key);
                if (sessions.get(key) === session) sessions.delete(key);
            }
        },
    };
    sessions.set(key, session);
    for (const id of resumable.get(key) || []) void session.acquire(id).catch(() => undefined);
    resumable.delete(key);
    return session;
}
