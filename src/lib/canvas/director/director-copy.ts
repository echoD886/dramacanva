import { nanoid } from "nanoid";
import type { CanvasNodeData } from "@/types/canvas";
import type { DirectorScene } from "@/types/director";

export function isolateDirectorCopies(previous: CanvasNodeData[], next: CanvasNodeData[], scenes: DirectorScene[]) {
    const created = next.filter((n) => n.metadata?.copiedFromNodeId && n.metadata.directorSceneId && !previous.some((old) => old.id === n.id));
    if (!created.length) return { nodes: next, scenes };
    const copies = new Map<string, DirectorScene>();
    const remap = new Map(next.filter((n) => !previous.some((old) => old.id === n.id)).map((n) => [n.metadata?.copiedFromNodeId, n.id]));
    for (const node of created) {
        const original = scenes.find((s) => s.id === node.metadata?.directorSceneId);
        if (!original) continue;
        const scene = structuredClone(original);
        scene.id = nanoid();
        scene.shots = scene.shots.map((shot) => ({
            ...shot,
            sourceStoryboardNodeId: shot.sourceStoryboardNodeId ? remap.get(shot.sourceStoryboardNodeId) : undefined,
            sourceStoryboardRowId: shot.sourceStoryboardNodeId && remap.has(shot.sourceStoryboardNodeId) ? shot.sourceStoryboardRowId : undefined,
            sourceFingerprint: undefined,
            previewNodeId: undefined,
            depthNodeId: undefined,
            normalNodeId: undefined,
        }));
        scene.objects = scene.objects.map((object) => ({
            ...object,
            characterBinding: object.characterBinding ? { ...object.characterBinding, referenceNodeId: remap.get(object.characterBinding.referenceNodeId) || object.characterBinding.referenceNodeId } : undefined,
        }));
        copies.set(node.id, scene);
    }
    return {
        nodes: next.map((node) => (copies.has(node.id) ? { ...node, metadata: { ...node.metadata, directorSceneId: copies.get(node.id)!.id, directorPrevis: undefined, directorPrevisByShot: undefined, directorThumbnail: undefined } } : node)),
        scenes: [...scenes, ...copies.values()],
    };
}
