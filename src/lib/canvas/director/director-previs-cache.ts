import type { DirectorScene } from "@/types/director";
import type { CanvasNodeData } from "@/types/canvas";
import { directorSceneForShot } from "./director-shot-state";
import { DIRECTOR_ASSET_REGISTRY } from "./director-asset-registry";
import { PREVIS_LOOK_VERSION, resolvePrevisQuality } from "./director-previs-look";
import { resolvePrevisSegmentBoundaries } from "./director-previs-sequence";
import { mapDirectorSceneToPrevis } from "./director-previs-legacy";

function fingerprint(data: string) {
    let hash = 2166136261;
    for (let index = 0; index < data.length; index++) hash = Math.imul(hash ^ data.charCodeAt(index), 16777619);
    return `${data.length}:${(hash >>> 0).toString(16)}`;
}

export function directorPrevisFingerprint(scene: DirectorScene, shotId: string) {
    const current = directorSceneForShot(scene, shotId);
    const shot = current.shots.find((s) => s.id === shotId);
    const assets = Object.values(DIRECTOR_ASSET_REGISTRY).map(({ id, version }) => [id, version]);
    const data = JSON.stringify([
        assets,
        PREVIS_LOOK_VERSION,
        current.objects,
        current.cameras.find((c) => c.id === shot?.cameraId),
        current.lights,
        current.environment,
        current.environmentIntensity,
        current.stageLook,
        current.groundColor,
        current.groundSize,
        current.groundVisible,
        current.groundOpacity,
        current.stageExposure,
        current.background,
        shot?.duration,
        shot?.fps,
        shot?.aspectRatio,
    ]);
    return fingerprint(data);
}

export function computePrevisSequenceFingerprint(scene: DirectorScene) {
    const sequence = resolvePrevisSegmentBoundaries(scene.previs ?? mapDirectorSceneToPrevis(scene).sequence).sequence;
    const cameraIds = new Set(
        sequence.segments.map((segment) => {
            const id = segment.cameraId ?? scene.shots.find((shot) => shot.id === segment.legacyShotId)?.cameraId;
            return (scene.cameras.find((camera) => camera.id === id) ?? scene.cameras[0])?.id;
        }),
    );
    const shots = sequence.segments
        .filter((segment) => segment.legacyShotId)
        .map((segment) => {
            const shot = scene.shots.find((item) => item.id === segment.legacyShotId);
            return { id: shot?.id, cameraId: shot?.cameraId, aspectRatio: shot?.aspectRatio, stage: shot?.stage, actorStates: shot?.actorStates };
        });
    const assets = Object.values(DIRECTOR_ASSET_REGISTRY).map(({ id, version }) => [id, version]);
    const quality = resolvePrevisQuality(typeof window === "undefined" ? 1 : window.devicePixelRatio);
    return fingerprint(
        JSON.stringify([
            sequence,
            scene.objects,
            shots,
            scene.cameras.filter((camera) => cameraIds.has(camera.id)),
            scene.lights,
            scene.environment,
            scene.environmentIntensity,
            scene.stageLook,
            scene.groundColor,
            scene.groundSize,
            scene.groundVisible,
            scene.groundOpacity,
            scene.stageExposure,
            scene.background,
            assets,
            PREVIS_LOOK_VERSION,
            quality,
        ]),
    );
}

/** A reference projection of the same node, never a new canvas object. */
export function directorPrevisReference(node: CanvasNodeData): CanvasNodeData {
    // A world output is referenced through its ordinary media nodes. Preserve
    // the legacy cache in storage, but never substitute it for the new output.
    if (node.metadata?.directorWorldEngine) return node;
    const cache = currentDirectorPrevis(node);
    return cache && cache.shotId === node.metadata?.directorShotId ? { ...node, metadata: { ...node.metadata, content: cache.url, storageKey: cache.storageKey, mimeType: "video/mp4", directorOutputKind: "clay", workflowKind: "reference_video" } } : node;
}

export function currentDirectorPrevis(node: CanvasNodeData, shotId = node.metadata?.directorShotId) {
    return (shotId && node.metadata?.directorPrevisByShot?.[shotId]) || (node.metadata?.directorPrevis?.shotId === shotId ? node.metadata?.directorPrevis : undefined);
}
