import { currentLocaleText as upstreamText } from "@/i18n/current-locale-text";
import { buildPrevisEncodeArgs, buildRecordingTranscodeArgs, type RecordingTranscodeTiming } from "./canvas-video-merge-args";
import { concatVideoFiles } from "./canvas-video-concat";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import ffmpegCoreURL from "@ffmpeg/core?url";
import ffmpegWasmURL from "@ffmpeg/core/wasm?url";
import { fetchFile } from "@ffmpeg/util";
import { getMediaBlob } from "@/services/file-storage";
import { currentLocaleText as t } from "@/i18n/current-locale-text";
import type { PrevisSequenceEncoder } from "./director/director-previs-export";

export type MergeVideoInput = { id: string; url?: string; storageKey?: string };
export type MergeVideoProgress = { phase: "loading" | "reading" | "encoding"; progress: number };

let ffmpegPromise: Promise<FFmpeg> | null = null;

// ffmpeg 只在用户明确合并视频时加载，避免把 wasm 和 worker 放进画布首屏包体。
export async function loadFFmpeg(onProgress?: (progress: MergeVideoProgress) => void, isolated = false, signal?: AbortSignal) {
    const { default: classWorkerURL } = await import("@ffmpeg/ffmpeg/worker?worker&url");
    const ffmpegAssets = { classWorkerURL, coreURL: ffmpegCoreURL, wasmURL: ffmpegWasmURL };
    if (isolated) {
        signal?.throwIfAborted();
        const ffmpeg = new FFmpeg();
        const abort = () => ffmpeg.terminate();
        signal?.addEventListener("abort", abort, { once: true });
        try {
            await ffmpeg.load(ffmpegAssets, { signal });
            signal?.throwIfAborted();
            return ffmpeg;
        } catch (cause) {
            ffmpeg.terminate();
            signal?.throwIfAborted();
            throw new Error(t("canvasExtra.mediaError.mergeToolLoadFailed"), { cause });
        } finally {
            signal?.removeEventListener("abort", abort);
        }
    }
    if (!ffmpegPromise) {
        ffmpegPromise = (async () => {
            const ffmpeg = new FFmpeg();
            onProgress?.({ phase: "loading", progress: 0 });
            try {
                // 核心资产随前端同源发布，避免自部署环境首次合并依赖第三方 CDN。
                await ffmpeg.load(ffmpegAssets);
            } catch (cause) {
                ffmpeg.terminate();
                throw new Error(t("canvasExtra.mediaError.mergeToolLoadFailed"), { cause });
            }
            return ffmpeg;
        })();
    }
    try {
        return await ffmpegPromise;
    } catch (error) {
        ffmpegPromise = null;
        throw error;
    }
}

export function createPrevisSequenceEncoder(): PrevisSequenceEncoder {
    let ffmpeg: FFmpeg | undefined;
    let loading: Promise<FFmpeg> | undefined;
    let disposed = false;
    let aborted = false;
    let detachAbort = () => {};
    const getEncoder = async (signal?: AbortSignal) => {
        signal?.throwIfAborted();
        // 精确导出独占 worker，取消时可终止编码，不影响合并或预览转码的共享实例。
        loading ??= loadFFmpeg(undefined, true, signal);
        ffmpeg = await loading;
        if (disposed || signal?.aborted) {
            ffmpeg.terminate();
            signal?.throwIfAborted();
            throw new DOMException("Export disposed", "AbortError");
        }
        detachAbort();
        const abort = () => {
            aborted = true;
            ffmpeg?.terminate();
        };
        signal?.addEventListener("abort", abort, { once: true });
        detachAbort = () => signal?.removeEventListener("abort", abort);
        return ffmpeg;
    };
    return {
        async writeFrame(index, png, _timestamp, signal) {
            const encoder = await getEncoder(signal);
            const data = new Uint8Array(await png.arrayBuffer());
            signal?.throwIfAborted();
            await encoder.writeFile(`frame-${String(index).padStart(6, "0")}.png`, data);
        },
        async encode(options, onProgress, signal) {
            const encoder = await getEncoder(signal);
            const onEncodingProgress = ({ progress }: { progress: number }) => onProgress(progress);
            encoder.on("progress", onEncodingProgress);
            try {
                const args = buildPrevisEncodeArgs({ ...options, pattern: "frame-%06d.png", output: "previs.mp4" });
                const exitCode = await encoder.exec([...args.slice(0, -1), "-frames:v", String(options.totalFrames), args.at(-1)!]);
                signal?.throwIfAborted();
                if (exitCode !== 0) throw new Error(t("canvasExtra.mediaError.videoEncodeFailed"));
                const output = await encoder.readFile("previs.mp4");
                signal?.throwIfAborted();
                if (typeof output === "string" || !output.length) throw new Error(t("canvasExtra.mediaError.videoEncodeFailed"));
                return new Blob([output as BlobPart], { type: "video/mp4" });
            } catch (error) {
                signal?.throwIfAborted();
                throw error;
            } finally {
                encoder.off("progress", onEncodingProgress);
            }
        },
        async dispose() {
            disposed = true;
            detachAbort();
            // 释放整个虚拟文件系统及 PNG 序列，包括失败和取消时已写入的帧。
            if (!aborted) ffmpeg?.terminate();
        },
    };
}

export async function transcodeVideoToMp4(input: Blob, onProgress?: (progress: MergeVideoProgress) => void, timing?: RecordingTranscodeTiming) {
    const ffmpeg = await loadFFmpeg(onProgress);
    const inputName = input.type === "video/mp4" ? "recording.mp4" : "recording.webm";
    const outputName = "recording-transcoded.mp4";
    try {
        await ffmpeg.writeFile(inputName, await fetchFile(input));
        onProgress?.({ phase: "encoding", progress: 55 });
        const logs: string[] = [];
        const onLog = ({ message }: { message: string }) => {
            if (message) logs.push(message);
        };
        ffmpeg.on("log", onLog);
        let exitCode = 1;
        try {
            exitCode = await ffmpeg.exec(buildRecordingTranscodeArgs(inputName, outputName, timing));
        } finally {
            ffmpeg.off("log", onLog);
        }
        if (exitCode !== 0) {
            console.error(upstreamText("upstream.v165.message050"), logs.slice(-12));
            throw new Error(t("canvasExtra.mediaError.videoEncodeFailed"));
        }
        const output = await ffmpeg.readFile(outputName);
        onProgress?.({ phase: "encoding", progress: 100 });
        return new Blob([output as BlobPart], { type: "video/mp4" });
    } finally {
        await Promise.all([inputName, outputName].map((file) => ffmpeg.deleteFile(file).catch(() => undefined)));
    }
}

export async function mergeVideos(inputs: MergeVideoInput[], onProgress?: (progress: MergeVideoProgress) => void) {
    if (inputs.length < 2) throw new Error(t("canvasExtra.mediaTools.selectTwoVideos"));
    const ffmpeg = await loadFFmpeg(onProgress, true);
    const files: string[] = [];
    try {
        for (let index = 0; index < inputs.length; index += 1) {
            const input = inputs[index];
            const storedBlob = input.storageKey ? await getMediaBlob(input.storageKey) : null;
            const remoteBlob =
                !storedBlob && input.url
                    ? await fetch(input.url).then((response) => {
                          if (!response.ok) throw new Error(t("canvasExtra.mediaError.resourceHttp", { status: response.status }));
                          return response.blob();
                      })
                    : null;
            const blob = storedBlob || remoteBlob;
            if (!blob) throw new Error(t("canvasExtra.mediaError.videoNthReadFailed", { index: index + 1 }));
            const name = `input-${index}.mp4`;
            await ffmpeg.writeFile(name, await fetchFile(blob));
            files.push(name);
            onProgress?.({ phase: "reading", progress: Math.round(((index + 1) / inputs.length) * 45) });
        }
        onProgress?.({ phase: "encoding", progress: 55 });
        const output = await concatVideoFiles(ffmpeg, files);
        onProgress?.({ phase: "encoding", progress: 100 });
        return new Blob([output as BlobPart], { type: "video/mp4" });
    } finally {
        ffmpeg.terminate();
    }
}
