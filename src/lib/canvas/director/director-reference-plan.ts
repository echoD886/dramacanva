import type { CanvasNodeData } from "@/types/canvas";

/** Shared by quote and submission; never truncate ordinary, unrelated workflows. */
export function selectDirectorReferenceItems<T extends { id: string }>(items: T[], maximum: number | undefined, nodes: CanvasNodeData[]): T[] {
    if (!maximum || maximum < 1 || items.length <= maximum) return items;
    const owners = nodes.filter((node) => node.metadata?.directorSceneId && items.some((item) => [node.id, node.metadata?.directorPreviewNodeId, node.metadata?.directorClayVideoNodeId].includes(item.id)));
    if (!owners.length) return items;
    const compositions = new Set(owners.map((owner) => owner.metadata?.directorPreviewNodeId));
    const characters = new Set(owners.flatMap((owner) => owner.metadata?.directorCharacterNodeIds || []));
    const bound = new Set(owners.flatMap((owner) => owner.metadata?.referenceAssetNodeIds || []));
    const rank = (id: string) => (compositions.has(id) ? 0 : characters.has(id) ? 1 : bound.has(id) ? 2 : 3);
    return items.toSorted((a, b) => rank(a.id) - rank(b.id)).slice(0, maximum);
}
