import { CanvasNodeType, type CanvasNodeData, type Position } from "@/types/canvas";

type Size = {
    width: number;
    height: number;
};

const BATCH_CHILD_OFFSET_X = 120;
const BATCH_CHILD_GAP = 36;
const NODE_CLEARANCE = 36;

export function canGenerateImageInPlace(sourceNode: CanvasNodeData | undefined) {
    return canGenerateMediaInPlace(sourceNode, CanvasNodeType.Image);
}

export function canGenerateMediaInPlace(sourceNode: CanvasNodeData | undefined, mediaType: typeof CanvasNodeType.Image | typeof CanvasNodeType.Video | typeof CanvasNodeType.Audio) {
    if (sourceNode?.type !== mediaType) return false;
    if (sourceNode.metadata?.generationResultPlacement) return sourceNode.metadata.generationResultPlacement === "replace-node";
    if (!sourceNode.metadata?.content && !sourceNode.metadata?.storageKey) return true;
    // 兼容显式落点字段引入前创建的复制节点和版本节点。
    return Boolean(sourceNode.metadata?.copiedFromNodeId || sourceNode.metadata?.versionOfNodeId);
}

export function imageGenerationGroupSize(rootSize: Size, imageSize: Size, childCount: number): Size {
    if (childCount <= 0) return rootSize;
    const columns = Math.min(childCount, 2);
    const rows = Math.ceil(childCount / 2);
    return {
        width: rootSize.width + BATCH_CHILD_OFFSET_X + columns * imageSize.width + (columns - 1) * BATCH_CHILD_GAP,
        height: Math.max(rootSize.height, rows * imageSize.height + (rows - 1) * BATCH_CHILD_GAP),
    };
}

export function imageGenerationChildPosition(rootPosition: Position, rootWidth: number, imageSize: Size, index: number): Position {
    return {
        x: rootPosition.x + rootWidth + BATCH_CHILD_OFFSET_X + (index % 2) * (imageSize.width + BATCH_CHILD_GAP),
        y: rootPosition.y + Math.floor(index / 2) * (imageSize.height + BATCH_CHILD_GAP),
    };
}

export function findAvailableGenerationGroupPosition(nodes: CanvasNodeData[], preferred: Position, groupSize: Size): Position {
    const down = resolveCollisions(nodes, preferred, groupSize, "down");
    const right = resolveCollisions(nodes, preferred, groupSize, "right");
    const downDistance = down.y - preferred.y;
    const rightDistance = right.x - preferred.x;
    return downDistance <= rightDistance ? down : right;
}

/** Keep a previous writeback in place only when its new footprint still fits. */
export function directorOutputPosition(nodes: CanvasNodeData[], source: CanvasNodeData, outputId: string, size: Size): Position {
    const existing = nodes.find((node) => node.id === outputId);
    const occupied = nodes.filter((node) => node.id !== outputId);
    if (existing && !occupied.some((node) => rectanglesOverlap(existing.position, size, node.position, node))) return existing.position;
    return findAvailableGenerationGroupPosition(occupied, { x: source.position.x + source.width + 80, y: source.position.y }, size);
}

// 分别沿下方和右侧求出最近空位，再选择移动距离更短的方向，避免生成组覆盖已有节点。
function resolveCollisions(nodes: CanvasNodeData[], preferred: Position, groupSize: Size, direction: "down" | "right"): Position {
    const candidate = { ...preferred };
    for (let attempt = 0; attempt <= nodes.length; attempt += 1) {
        const collisions = nodes.filter((node) => rectanglesOverlap(candidate, groupSize, node.position, node));
        if (!collisions.length) return candidate;
        if (direction === "down") candidate.y = Math.max(...collisions.map((node) => node.position.y + node.height + NODE_CLEARANCE));
        else candidate.x = Math.max(...collisions.map((node) => node.position.x + node.width + NODE_CLEARANCE));
    }
    return candidate;
}

function rectanglesOverlap(firstPosition: Position, firstSize: Size, secondPosition: Position, secondSize: Size) {
    return !(
        firstPosition.x + firstSize.width + NODE_CLEARANCE <= secondPosition.x ||
        firstPosition.x >= secondPosition.x + secondSize.width + NODE_CLEARANCE ||
        firstPosition.y + firstSize.height + NODE_CLEARANCE <= secondPosition.y ||
        firstPosition.y >= secondPosition.y + secondSize.height + NODE_CLEARANCE
    );
}

/** 新节点整组平移到最近空位（保留组内相对布局），防止生成结果叠在已有节点上。 */
export function appendNodesWithoutOverlap(current: CanvasNodeData[], added: CanvasNodeData[]): CanvasNodeData[] {
    if (!added.length) return current;
    const left = Math.min(...added.map((node) => node.position.x));
    const top = Math.min(...added.map((node) => node.position.y));
    const size = {
        width: Math.max(...added.map((node) => node.position.x + node.width)) - left,
        height: Math.max(...added.map((node) => node.position.y + node.height)) - top,
    };
    const addedIds = new Set(added.map((node) => node.id));
    const target = findAvailableGenerationGroupPosition(current.filter((node) => !addedIds.has(node.id)), { x: left, y: top }, size);
    const dx = target.x - left;
    const dy = target.y - top;
    return [...current, ...added.map((node) => ({ ...node, position: { x: node.position.x + dx, y: node.position.y + dy } }))];
}
