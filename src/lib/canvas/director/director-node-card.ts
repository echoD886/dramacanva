import type { DirectorScene, PrevisSequence } from "@/types/director";
import { clampPrevisFrame, findPrevisSegmentAtFrame, getPrevisTotalFrames, resolvePrevisSegmentBoundaries } from "./director-previs-sequence";

export type DirectorCardEditTarget = { sceneId: string; shotId: string; globalFrame: number; time: number };

export function directorCardSegments(sequence: PrevisSequence) {
    const total = getPrevisTotalFrames(sequence);
    return resolvePrevisSegmentBoundaries(sequence).sequence.segments.map((segment) => ({
        ...segment,
        widthPercent: total ? ((segment.endFrameExclusive - segment.startFrame) / total) * 100 : 0,
        startTime: segment.startFrame / sequence.fps,
        endTime: segment.endFrameExclusive / sequence.fps,
    }));
}

export function directorCardSeekState(sequence: PrevisSequence, frame: number) {
    return { frame: clampPrevisFrame(sequence, Math.round(frame)), playing: false as const };
}

export function directorCardEditTarget(scene: DirectorScene, sequence: PrevisSequence, frame: number): DirectorCardEditTarget | null {
    const globalFrame = directorCardSeekState(sequence, frame).frame;
    const segment = findPrevisSegmentAtFrame(sequence, globalFrame);
    if (!segment) return null;
    // 尚未编译的意图段使用编译器的稳定 ID；打开流程负责生成对应镜头。
    const shotId = segment.shotId ?? segment.legacyShotId ?? `previs-${segment.id}`;
    return { sceneId: scene.id, shotId, globalFrame, time: (globalFrame - segment.startFrame) / sequence.fps };
}
