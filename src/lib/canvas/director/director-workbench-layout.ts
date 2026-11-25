import type { DirectorScene } from "@/types/director";
import { mapDirectorSceneToPrevis } from "./director-previs-legacy";
import { clampPrevisFrame, findPrevisSegmentAtFrame, getPrevisTotalFrames, resolvePrevisSegmentBoundaries, timeToFrame } from "./director-previs-sequence";

export const DIRECTOR_WORKBENCH_LAYOUT = {
    topbar: 52,
    toolbar: 52,
    drawer: 280,
    inspectorMin: 272,
    inspectorMax: 304,
    bottomMin: 156,
    bottomMax: 184,
    drawerBreakpoint: 1100,
} as const;

export function directorWorkbenchLayoutMode(width: number): "drawer" | "columns" {
    return width < DIRECTOR_WORKBENCH_LAYOUT.drawerBreakpoint ? "drawer" : "columns";
}

export function directorWorkbenchSequence(scene: DirectorScene) {
    return resolvePrevisSegmentBoundaries(scene.previs ?? mapDirectorSceneToPrevis(scene).sequence).sequence;
}

function segmentShot(scene: DirectorScene, segment: { shotId?: string; legacyShotId?: string }) {
    return scene.shots.find((shot) => shot.id === segment.shotId) ?? scene.shots.find((shot) => shot.id === segment.legacyShotId);
}

export function directorWorkbenchSegments(scene: DirectorScene) {
    const sequence = directorWorkbenchSequence(scene);
    const totalFrames = getPrevisTotalFrames(sequence);
    return sequence.segments.map((segment) => {
        const shot = segmentShot(scene, segment);
        const frames = Math.max(0, segment.endFrameExclusive - segment.startFrame);
        return { ...segment, shotId: shot?.id, name: shot?.name, frames, fraction: totalFrames > 0 ? frames / totalFrames : 0, fps: sequence.fps };
    });
}

export function resolveDirectorWorkbenchFrame(scene: DirectorScene, frame: number) {
    const sequence = directorWorkbenchSequence(scene);
    const currentFrame = clampPrevisFrame(sequence, Math.round(frame));
    const segment = findPrevisSegmentAtFrame(sequence, currentFrame);
    if (!segment) return null;
    return { frame: currentFrame, shotId: segmentShot(scene, segment)?.id, time: (currentFrame - segment.startFrame) / sequence.fps };
}

/** 关键帧编辑仍保留原始局部时间；传输条只显示该段内对应的有效整帧。 */
export function directorWorkbenchFrameAtTime(scene: DirectorScene, shotId: string | undefined, time: number) {
    const sequence = directorWorkbenchSequence(scene);
    const segment = sequence.segments.find((item) => segmentShot(scene, item)?.id === shotId);
    if (!segment) return 0;
    return Math.max(segment.startFrame, Math.min(segment.endFrameExclusive - 1, segment.startFrame + timeToFrame(time, sequence.fps)));
}
