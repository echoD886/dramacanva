import { currentLocaleText } from "@/i18n/current-locale-text";
import type { CanvasNodeData, CanvasNodeMetadata } from "@/types/canvas";
import { recordReplacedMediaVersion } from "./canvas-media-versions";

/** 异步阶段只准备结果；提交时按节点身份合并，绝不能用旧文档覆盖当前文档。 */
export function commitCanvasGenerationResult(current: CanvasNodeData[], before: CanvasNodeData, result: CanvasNodeData, taskId: string): CanvasNodeData[] {
    const live = current.find((node) => node.id === before.id);
    if (!live) throw new Error(currentLocaleText("canvasExtra.generation.resultNodeDeleted"));
    if (result.id !== before.id || (live.metadata?.taskId && live.metadata.taskId !== taskId) || (before.metadata?.taskId && !live.metadata?.taskId)) {
        throw new Error(currentLocaleText("canvasExtra.generation.resultTaskRebound"));
    }
    const metadata: CanvasNodeMetadata = { ...live.metadata };
    for (const key of new Set([...Object.keys(before.metadata || {}), ...Object.keys(result.metadata || {})]) as Set<keyof CanvasNodeMetadata>) {
        if (JSON.stringify(before.metadata?.[key]) === JSON.stringify(result.metadata?.[key])) continue;
        Object.assign(metadata, { [key]: result.metadata?.[key] });
    }
    const geometryChanged = live.width !== before.width || live.height !== before.height || live.metadata?.manualSize;
    const moved = live.position.x !== before.position.x || live.position.y !== before.position.y;
    const merged: CanvasNodeData = {
        ...live,
        type: result.type === before.type ? live.type : result.type,
        title: result.title === before.title || live.title !== before.title ? live.title : result.title,
        width: geometryChanged ? live.width : result.width,
        height: geometryChanged ? live.height : result.height,
        position: moved || geometryChanged ? live.position : result.position,
        metadata,
    };
    const versioned = recordReplacedMediaVersion(live, merged, "generate");
    const versionRootId = versioned.metadata?.versionOfNodeId;
    return current.map((node) => {
        if (node.id === merged.id) return versionRootId ? { ...versioned, metadata: { ...versioned.metadata, versionPrimary: true } } : versioned;
        if (!versionRootId || (node.metadata?.versionOfNodeId || node.id) !== versionRootId) return node;
        return { ...node, metadata: { ...node.metadata, versionPrimary: false } };
    });
}
