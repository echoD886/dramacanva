import { previsExportDuration } from "../canvas-video-merge-args";
export { buildPrevisEncodeArgs, previsExportDuration } from "../canvas-video-merge-args";
import type { DirectorScene, PrevisSequence } from "@/types/director";
import { evaluatePrevisFrame, type PrevisFrameSnapshot } from "./director-previs-evaluate";
import { getPrevisTotalFrames } from "./director-previs-sequence";

export type PrevisExportProgress = { phase: "rendering" | "encoding"; progress: number };
export type PrevisEncodeOptions = { fps: number; width: number; height: number; totalFrames: number };
export type PrevisSequenceEncoder = {
    writeFrame: (index: number, png: Blob, timestamp: number, signal?: AbortSignal) => Promise<void>;
    encode: (options: PrevisEncodeOptions, onProgress: (progress: number) => void, signal?: AbortSignal) => Promise<Blob>;
    dispose: () => Promise<void>;
};

export function previsExportFrameTimestamps(totalFrames: number, fps: number) {
    previsExportDuration(totalFrames, fps);
    return Array.from({ length: totalFrames }, (_, index) => index / fps);
}

export async function exportPrevisSequence({
    scene,
    sequence,
    width,
    height,
    renderFrame,
    encoder,
    onProgress,
    signal,
    frameRange,
}: {
    scene: DirectorScene;
    sequence: PrevisSequence;
    width: number;
    height: number;
    renderFrame: (snapshot: PrevisFrameSnapshot) => Promise<Blob>;
    encoder: PrevisSequenceEncoder;
    onProgress?: (progress: PrevisExportProgress) => void;
    signal?: AbortSignal;
    frameRange?: { startFrame: number; endFrameExclusive: number };
}) {
    return encodeDirectorFrames({
        fps: sequence.fps,
        sequenceFrames: getPrevisTotalFrames(sequence),
        width,
        height,
        frameRange,
        encoder,
        signal,
        onProgress,
        renderFrame: (index) => renderFrame(evaluatePrevisFrame(scene, sequence, index)),
    });
}

export async function encodeDirectorFrames({
    fps,
    sequenceFrames,
    width,
    height,
    renderFrame,
    encoder,
    signal,
    frameRange,
    onProgress,
}: Omit<PrevisEncodeOptions, "totalFrames"> & {
    sequenceFrames: number;
    renderFrame: (index: number) => Promise<Blob>;
    encoder: PrevisSequenceEncoder;
    signal?: AbortSignal;
    frameRange?: { startFrame: number; endFrameExclusive: number };
    onProgress?: (progress: PrevisExportProgress) => void;
}) {
    try {
        signal?.throwIfAborted();
        const startFrame = frameRange?.startFrame ?? 0;
        const endFrame = frameRange?.endFrameExclusive ?? sequenceFrames;
        if (!Number.isInteger(startFrame) || !Number.isInteger(endFrame) || startFrame < 0 || endFrame > sequenceFrames || endFrame < startFrame) throw new RangeError("Invalid previs frame range");
        const totalFrames = endFrame - startFrame;
        const timestamps = previsExportFrameTimestamps(totalFrames, fps);
        if (!totalFrames) throw new RangeError("Empty previs sequence");
        let progress = 0;
        const report = (phase: PrevisExportProgress["phase"], next: number) => {
            if (Number.isFinite(next)) progress = Math.max(progress, Math.min(1, next));
            onProgress?.({ phase, progress });
        };
        report("rendering", 0);
        for (let index = 0; index < totalFrames; index++) {
            signal?.throwIfAborted();
            const png = await renderFrame(startFrame + index);
            signal?.throwIfAborted();
            await encoder.writeFrame(index, png, timestamps[index], signal);
            signal?.throwIfAborted();
            report("rendering", ((index + 1) / totalFrames) * 0.8);
        }
        signal?.throwIfAborted();
        report("encoding", 0.8);
        const video = await encoder.encode({ fps, width, height, totalFrames }, (value) => report("encoding", 0.8 + Math.min(0.99, Math.max(0, value)) * 0.2), signal);
        signal?.throwIfAborted();
        report("encoding", 1);
        return video;
    } finally {
        await encoder.dispose();
    }
}
