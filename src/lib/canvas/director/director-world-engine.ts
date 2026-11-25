import type { DirectorScene, DirectorShot } from "@/types/director";
import type { PrevisScene, PrevisShot } from "@/types/previs";
import { directorSceneForShot, savedWorldEngineShot } from "./director-shot-state";
import { directorCameraMotionFrames } from "./director-camera-motion";

/** Convert only the selected shot's staging, preserving the original document. */
export function directorToWorldEngine(scene: DirectorScene): PrevisScene {
    const saved = savedWorldEngineShot(scene, scene.activeShotId);
    if (saved) return structuredClone({ ...saved, activeShotId: scene.activeShotId });
    const shot = scene.shots.find((item) => item.id === scene.activeShotId) || scene.shots[0];
    const selected = directorSceneForShot(scene, shot?.id || scene.activeShotId);
    const { worldEngine: _savedWorlds, ...legacy } = scene;
    return structuredClone({
        ...legacy,
        id: scene.id,
        version: 1,
        title: scene.title,
        background: scene.background,
        environmentIntensity: scene.environmentIntensity,
        environment: scene.environment,
        gridVisible: scene.gridVisible,
        objects: selected.objects,
        lights: selected.lights,
        cameras: scene.cameras
            .filter((camera) => camera.id === shot?.cameraId)
            .map((camera) => ({ ...camera, keyframes: shot && supportedMove(shot.cameraMove) !== shot.cameraMove && !camera.keyframes.length ? directorCameraMotionFrames(camera, shot.cameraMove, shot.duration) : camera.keyframes })),
        shots: shot ? [{ ...shot, legacyCameraMove: shot.cameraMove, cameraMove: supportedMove(shot.cameraMove) }] : [],
        activeShotId: shot?.id || scene.activeShotId,
        createdAt: scene.createdAt,
        updatedAt: scene.updatedAt,
    });
}

function supportedMove(move: DirectorShot["cameraMove"]): PrevisShot["cameraMove"] {
    return ["truck_left", "truck_right", "pedestal_up", "pedestal_down"].includes(move) ? "static" : (move as PrevisShot["cameraMove"]);
}

/** Merge the latest production document, retaining row bindings and untouched shots. */
export function worldEngineToDirector(base: DirectorScene, world: PrevisScene): DirectorScene {
    if (base.id !== world.id) throw new Error("World engine scene mismatch");
    const key = Object.entries(base.worldEngine || {}).find(([, item]) => item.shots.some((shot) => world.shots.some((next) => next.id === shot.id)))?.[0] || base.activeShotId;
    const source = base.shots.find((shot) => shot.id === key);
    const updated = world.shots.map((shot): DirectorShot => {
        const original = base.shots.find((item) => item.id === shot.id);
        const aspectRatio = shot.aspectRatio ?? original?.aspectRatio;
        const cameraMove = shot.cameraMove === "static" && shot.legacyCameraMove && supportedMove(shot.legacyCameraMove) === "static" ? shot.legacyCameraMove : shot.cameraMove;
        return { sourceStoryboardNodeId: source?.sourceStoryboardNodeId, sourceStoryboardRowId: source?.sourceStoryboardRowId, sourceFingerprint: source?.sourceFingerprint, ...original, ...shot, cameraMove, aspectRatio, stage: original?.stage };
    });
    return {
        ...base,
        title: world.title,
        updatedAt: world.updatedAt,
        activeShotId: world.activeShotId,
        cameras: [...base.cameras.map((camera) => ({ ...camera, ...world.cameras.find((item) => item.id === camera.id) })), ...world.cameras.filter((camera) => !base.cameras.some((item) => item.id === camera.id))],
        shots: [...base.shots.map((shot) => updated.find((next) => next.id === shot.id) || shot), ...updated.filter((shot) => !base.shots.some((item) => item.id === shot.id))],
        worldEngine: { ...base.worldEngine, [key]: structuredClone(world) },
    };
}
