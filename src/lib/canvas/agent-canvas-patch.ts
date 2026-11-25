import type { CanvasProject } from "@/stores/canvas/use-canvas-store";
import type { CanvasConnection, CanvasNodeData } from "@/types/canvas";
import { currentLocaleText } from "@/i18n/current-locale-text";

type Change<T> = { before: T | null; after: T | null };
export type AgentCanvasPatch = {
    canvasId: string;
    baseRevision?: number;
    revision?: number;
    updatedAt: string;
    nodes: Change<CanvasNodeData>[];
    connections: Change<CanvasConnection>[];
};

function record(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function equal(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (record(a) && record(b)) {
        // Cleared optional fields disappear in a cloud JSON roundtrip. Treat
        // that as unchanged, especially inside otherwise atomic storyboard rows.
        const keys = Object.keys(a).filter((key) => a[key] !== undefined);
        return keys.length === Object.keys(b).filter((key) => b[key] !== undefined).length && keys.every((key) => equal(a[key], b[key]));
    }
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((item, index) => equal(item, b[index]));
}

// Three-way merge: untouched local fields (e.g. a drag or prompt edit) survive.
// A concurrently changed field or a deleted node is a conflict, never an overwrite.
function mergeValue(current: unknown, before: unknown, after: unknown, preferLocal = false): unknown {
    if (equal(before, after) || equal(current, after)) return current;
    if (equal(current, before)) return after;
    if (record(current) && record(before) && record(after)) {
        const next = { ...current };
        for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
            if (["__proto__", "constructor", "prototype"].includes(key)) throw new Error(currentLocaleText("canvasExtra.agentPatch.invalidField"));
            const value = mergeValue(current[key], before[key], after[key], preferLocal);
            if (value === undefined) delete next[key];
            else next[key] = value;
        }
        return next;
    }
    if (preferLocal) return current;
    throw new Error(currentLocaleText("canvasExtra.agentPatch.conflict"));
}

/** Only an explicit local-draft choice after a lease conflict may use this. */
export function resolveCanvasNodeDraft(before: CanvasNodeData, remote: CanvasNodeData, local: CanvasNodeData) {
    if (before.id !== remote.id || before.id !== local.id) throw new Error(currentLocaleText("canvasExtra.agentPatch.invalidNode"));
    return mergeValue(local, before, remote, true) as CanvasNodeData;
}

function mergeItems<T extends { id: string }>(items: T[], changes: Change<T>[]): T[] {
    if (!changes.length) return items;
    const next = new Map(items.map((item) => [item.id, item]));
    for (const { before, after } of changes) {
        const id = after?.id || before?.id;
        if (!id || (before && after && before.id !== after.id)) throw new Error(currentLocaleText("canvasExtra.agentPatch.invalidNode"));
        const merged = mergeValue(next.get(id) ?? null, before, after) as T | null;
        if (merged === null) next.delete(id);
        else next.set(id, merged);
    }
    const result = [...next.values()];
    return result.length === items.length && result.every((item, index) => item === items[index]) ? items : result;
}

export function applyAgentCanvasPatch(project: CanvasProject, patch: AgentCanvasPatch): CanvasProject {
    if (patch.canvasId !== project.id || !Array.isArray(patch.nodes) || !Array.isArray(patch.connections)) throw new Error(currentLocaleText("canvasExtra.agentPatch.invalidPatch"));
    const byId = new Map(project.nodes.map((node) => [node.id, node]));
    const nodeChanges = patch.nodes.map((change) => {
        if (!change.after) return change;
        const current = byId.get(change.after.id);
        const beforeTask = change.before?.metadata?.taskId;
        const afterTask = change.after.metadata?.taskId;
        if (beforeTask && current?.metadata?.taskId !== beforeTask && current?.metadata?.taskId !== afterTask) throw new Error(currentLocaleText("canvasExtra.agentPatch.taskConflict"));
        if (!current || !beforeTask || beforeTask !== afterTask) return change;
        const terminal = (status: string | undefined) => ["succeeded", "failed", "cancelled"].includes(status || "");
        // A local task subscriber may already know a newer state than the SSE
        // checkpoint. Never turn its terminal result back into a pending task.
        if (terminal(current.metadata?.taskStatus) && !terminal(change.after.metadata?.taskStatus)) return { before: current, after: current };
        if (terminal(current.metadata?.taskStatus)) return change;
        const metadata = { ...change.before!.metadata };
        for (const key of ["status", "taskStatus", "taskProgress", "taskStage"] as const) {
            if (!equal(metadata[key], change.after.metadata?.[key])) Object.assign(metadata, { [key]: current.metadata?.[key] });
        }
        return { ...change, before: { ...change.before!, metadata } };
    });
    const nodes = mergeItems(project.nodes, nodeChanges);
    const connections = mergeItems(project.connections, patch.connections);
    if (nodes === project.nodes && connections === project.connections) return project;
    return { ...project, nodes, connections, updatedAt: patch.updatedAt || project.updatedAt };
}

// 三方合并：previous 是双方共同祖先，incoming 是云端新版，editorProject（或 nodes/connections）是本地编辑。
// 节点/连线按 id 合并，其它画布字段（标题、对话等）按字段合并；同一字段两边都改才抛冲突。
export function mergeAgentCanvasEditor(previous: CanvasProject, incoming: CanvasProject, nodes: CanvasNodeData[], connections: CanvasConnection[], editorProject?: CanvasProject) {
    const changes = <T extends { id: string }>(before: T[], after: T[]): Change<T>[] => {
        const byId = new Map(before.map((item) => [item.id, item]));
        const afterIds = new Set(after.map((item) => item.id));
        return [
            ...after.filter((item) => !equal(item, byId.get(item.id))).map((item) => ({ before: byId.get(item.id) ?? null, after: item })),
            ...before.filter((item) => !afterIds.has(item.id)).map((item) => ({ before: item, after: null })),
        ];
    };
    const editorState = editorProject || { ...previous, nodes, connections };
    const projected = applyAgentCanvasPatch({ ...previous, nodes: editorState.nodes, connections: editorState.connections }, {
        canvasId: previous.id,
        updatedAt: incoming.updatedAt,
        nodes: changes(previous.nodes, incoming.nodes),
        connections: changes(previous.connections, incoming.connections),
    });
    const merged = { ...projected } as CanvasProject & Record<string, unknown>;
    const before = previous as CanvasProject & Record<string, unknown>;
    const after = incoming as CanvasProject & Record<string, unknown>;
    const editor = editorState as CanvasProject & Record<string, unknown>;
    for (const key of new Set([...Object.keys(before), ...Object.keys(after), ...Object.keys(editor)])) {
        if (["id", "revision", "updatedAt", "remoteContentHash", "viewport", "nodes", "connections"].includes(key)) continue;
        const value = mergeValue(editor[key], before[key], after[key]);
        if (value === undefined) delete merged[key];
        else merged[key] = value;
    }
    return { ...merged, revision: incoming.revision, updatedAt: incoming.updatedAt, viewport: editorState.viewport } as CanvasProject;
}
