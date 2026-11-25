import type { CanvasHistorySnapshot } from "./use-canvas-history";
import type { CanvasProject } from "@/stores/canvas/use-canvas-store";

export type CanvasEditorPersistPatch = Pick<CanvasProject, "nodes" | "connections" | "chatSessions" | "activeChatId" | "backgroundMode" | "showImageInfo"> & { appearance: CanvasProject["appearance"] };

/**
 * 编辑器 React 状态只有在已渲染出“当前路由画布”的内容后才能回写存储。
 * 画布内切换 A -> B 时，加载 effect 会同步把基线切到 B，但同一次提交里
 * nodes/connections 仍是 A 的旧状态；若不校验归属，会把 A 的内容写进 B。
 */
export function canvasEditorOwnsProject(input: { projectLoaded: boolean; editorProjectId: string | null; projectId: string }) {
    return input.projectLoaded && Boolean(input.projectId) && input.editorProjectId === input.projectId;
}

export function sameCanvasHistorySnapshot(left: CanvasHistorySnapshot, right: CanvasHistorySnapshot) {
    return left.nodes === right.nodes
        && left.connections === right.connections
        && left.chatSessions === right.chatSessions
        && left.activeChatId === right.activeChatId
        && left.canvasAppearance === right.canvasAppearance
        && left.backgroundMode === right.backgroundMode
        && left.showImageInfo === right.showImageInfo;
}

export function sameCanvasPatch(project: CanvasProject, patch: CanvasEditorPersistPatch) {
    return project.nodes === patch.nodes
        && project.connections === patch.connections
        && project.chatSessions === patch.chatSessions
        && project.activeChatId === patch.activeChatId
        && project.appearance === patch.appearance
        && project.backgroundMode === patch.backgroundMode
        && project.showImageInfo === patch.showImageInfo;
}

/**
 * 编辑器持久化 effect 的纯决策：返回需要写入的 patch，或 null（不写）。
 * `observed` 为 null 表示尚无可比较的基线；调用方在返回 patch 时推进基线。
 */
export function resolveCanvasEditorPersistPatch(input: {
    projectId: string;
    projectLoaded: boolean;
    editorProjectId: string | null;
    historyPaused: boolean;
    observed: CanvasHistorySnapshot | null;
    snapshot: CanvasHistorySnapshot;
    stored: CanvasProject | undefined;
}): { advanceObserved: boolean; patch: CanvasEditorPersistPatch | null } {
    const { snapshot } = input;
    if (input.historyPaused || !canvasEditorOwnsProject(input)) return { advanceObserved: false, patch: null };
    if (!input.observed || sameCanvasHistorySnapshot(input.observed, snapshot)) return { advanceObserved: false, patch: null };
    const patch: CanvasEditorPersistPatch = {
        nodes: snapshot.nodes,
        connections: snapshot.connections,
        chatSessions: snapshot.chatSessions,
        activeChatId: snapshot.activeChatId,
        appearance: snapshot.canvasAppearance,
        backgroundMode: snapshot.backgroundMode,
        showImageInfo: snapshot.showImageInfo,
    };
    // 远端结果投影到编辑器不是一次本地编辑，避免改写时间戳并触发反向保存。
    if (input.stored && sameCanvasPatch(input.stored, patch)) return { advanceObserved: true, patch: null };
    return { advanceObserved: true, patch };
}
