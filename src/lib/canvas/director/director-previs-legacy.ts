import type { DirectorScene, DirectorShotSize, PrevisAspect, PrevisFraming, PrevisSequence } from "@/types/director";
import type { PrevisDiagnostic } from "./director-previs-sequence";

const LEGACY_FRAMING: Record<DirectorShotSize, PrevisFraming> = {
    extreme_wide: "wide",
    wide: "wide",
    full: "full",
    medium: "half",
    close_up: "face",
    extreme_close_up: "face",
};

export function legacySequenceAspect(rawAspect: string): PrevisAspect {
    const aspects: PrevisAspect[] = ["16:9", "9:16", "2.39:1"];
    let aspect: PrevisAspect = "9:16";
    if (aspects.includes(rawAspect as PrevisAspect)) aspect = rawAspect as PrevisAspect;
    else {
        const [width, height] = rawAspect.split(":").map(Number);
        const ratio = width / height;
        const ratios = { "16:9": 16 / 9, "9:16": 9 / 16, "2.39:1": 2.39 };
        if (Number.isFinite(ratio) && ratio > 0) aspect = aspects.reduce((closest, candidate) => (Math.abs(ratios[candidate] - ratio) < Math.abs(ratios[closest] - ratio) ? candidate : closest));
    }
    return aspect;
}

export function mapDirectorSceneToPrevis(scene: DirectorScene): { sequence: PrevisSequence; diagnostics: PrevisDiagnostic[] } {
    const diagnostics: PrevisDiagnostic[] = [];
    const fps = scene.shots[0]?.fps ?? 24;
    const rawAspect: string = scene.shots[0]?.aspectRatio ?? "9:16";
    const aspect = legacySequenceAspect(rawAspect);
    if (aspect !== rawAspect) diagnostics.push({ code: "aspect_quantized", message: `旧画幅 ${rawAspect} 已映射为 ${aspect}`, path: "shots[0].aspectRatio" });
    let startFrame = 0;
    const segments = scene.shots.map((shot, index) => {
        if ((shot.fps ?? 24) !== fps) diagnostics.push({ code: "fps_quantized", message: `旧镜头 ${shot.id} 的 ${shot.fps} fps 时长已按 ${fps} fps 量化`, path: `shots[${index}].fps` });
        const endFrameExclusive = startFrame + Math.max(1, Math.round(shot.duration * fps));
        const segment = {
            id: `legacy-${shot.id}`,
            legacyShotId: shot.id,
            shotId: shot.id,
            cameraId: shot.cameraId,
            startFrame,
            endFrameExclusive,
            targetIds: Object.keys(shot.actorStates ?? {}),
            framing: LEGACY_FRAMING[shot.shotSize],
            move: "fixed" as const,
            transitionIn: "cut" as const,
            endRule: { kind: "frame" as const, frame: endFrameExclusive },
        };
        startFrame = endFrameExclusive;
        return segment;
    });
    return { sequence: { schemaVersion: 2, sceneId: scene.id, revision: 1, fps, aspect, actions: [], segments }, diagnostics };
}
