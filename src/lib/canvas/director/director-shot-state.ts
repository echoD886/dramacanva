import type { CanvasNodeData, StoryboardRow } from "@/types/canvas";
import type { DirectorScene } from "@/types/director";

export function directorRowFingerprint(row: StoryboardRow, aspect: string) {
    return JSON.stringify([row.durationSeconds, aspect, row.characters, row.assetBindings, row.plotDescription, row.videoMotionPrompt, row.performanceBlocking, row.motion, row.camera, row.shotSize, row.dialogue]);
}

/** Advance only a source snapshot that matched before our own explicit writeback. */
export function acknowledgeDirectorWriteback(scene: DirectorScene, before: CanvasNodeData[], after: CanvasNodeData[]): DirectorScene {
    return {
        ...scene,
        shots: scene.shots.map((shot) => {
            const findRow = (nodes: CanvasNodeData[]) => nodes.find((node) => node.id === shot.sourceStoryboardNodeId)?.metadata?.storyboard?.rows.find((row) => row.id === shot.sourceStoryboardRowId);
            const oldRow = findRow(before),
                newRow = findRow(after);
            const aspect = shot.aspectRatio || "16:9";
            return oldRow && newRow && directorRowFingerprint(oldRow, aspect) === shot.sourceFingerprint ? { ...shot, sourceFingerprint: directorRowFingerprint(newRow, aspect) } : shot;
        }),
    };
}

export function rememberDirectorActors(scene: DirectorScene): DirectorScene {
    const actorStates = Object.fromEntries(
        scene.objects
            .filter((o) => o.kind === "actor")
            .map(({ id, transform, keyframes, motionPath, pose, poseKeyframes, visible, heldProp, boneOverrides, boneTracks }) => [id, { transform, keyframes, motionPath, pose, poseKeyframes, visible, heldProp, boneOverrides, boneTracks }]),
    );
    return { ...scene, shots: scene.shots.map((shot) => (shot.id === scene.activeShotId ? { ...shot, actorStates } : shot)) };
}

export function directorSceneForShot(scene: DirectorScene, shotId: string): DirectorScene {
    const shot = scene.shots.find((shot) => shot.id === shotId);
    const stage = shotId !== scene.activeShotId ? shot?.stage : undefined;
    const objects = stage?.objects || scene.objects;
    const states = shot?.actorStates;
    return { ...scene, activeShotId: shotId, lights: stage?.lights || scene.lights, objects: states ? objects.map((o) => (o.kind !== "actor" ? o : states[o.id] ? { ...o, ...states[o.id] } : { ...o, visible: false })) : objects };
}

export function savedWorldEngineShot(scene: DirectorScene, shotId: string) {
    return Object.values(scene.worldEngine || {}).find((world) => world.shots.some((shot) => shot.id === shotId));
}

export function directorBoundReferenceIds(scene: DirectorScene, shotId = scene.activeShotId) {
    const world = savedWorldEngineShot(scene, shotId);
    const objects = world?.objects || directorSceneForShot(scene, shotId).objects;
    return [...new Set(objects.filter((o) => o.visible && o.kind === "actor").flatMap((o) => o.characterBinding?.referenceNodeId || o.sourceNodeId || []))];
}
