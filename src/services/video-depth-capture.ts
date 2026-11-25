import { loadFFmpeg } from "@/lib/canvas/canvas-video-merge";
import DepthWorker from "./video-depth.worker?worker";
import { currentLocaleText as t } from "@/i18n/current-locale-text";

import type { CanvasNodeData } from "@/types/canvas";
import { getMediaBlob, resolveMediaUrl, uploadMediaFile } from "./file-storage";

export async function captureDepthFromNode(node: CanvasNodeData, progress: (percent: number) => void, signal: AbortSignal) {
    const key = node.metadata?.storageKey;
    let source = key ? await getMediaBlob(key) : null;
    if (!source) {
        const url = await resolveMediaUrl(key, node.metadata?.content);
        if (!url) throw new Error(t("canvasExtra.mediaConv.previewNotReady"));
        const response = await fetch(url, { signal });
        if (!response.ok) throw new Error(t("canvasExtra.mediaConv.previewNotReady"));
        source = await response.blob();
    }
    const blob = await captureVideoDepth(source, progress, signal);
    signal.throwIfAborted();
    return uploadMediaFile(blob, "video");
}

/** Keep model latency independent of the encoded presentation timestamps. */
export async function captureVideoDepth(source: Blob, progress: (percent: number) => void, signal: AbortSignal) {
    signal.throwIfAborted();
    const ffmpeg = await loadFFmpeg(undefined, true, signal);
    const model = new DepthWorker();
    const estimate = (input: Blob) =>
        new Promise<Blob>((resolve, reject) => {
            signal.throwIfAborted();
            const cancel = () => reject(signal.reason);
            signal.addEventListener("abort", cancel, { once: true });
            model.onmessage = ({ data }) => {
                signal.removeEventListener("abort", cancel);
                if (data.error) reject(new Error(data.error));
                else resolve(data.frame);
            };
            model.onerror = (event) => {
                signal.removeEventListener("abort", cancel);
                reject(new Error(event.message));
            };
            model.postMessage(input);
        });
    const abort = () => {
        model.terminate();
        ffmpeg.terminate();
    };
    signal.addEventListener("abort", abort, { once: true });
    try {
        signal.throwIfAborted();
        const bytes = await source.arrayBuffer();
        signal.throwIfAborted();
        await ffmpeg.writeFile("source", new Uint8Array(bytes));
        const fps = 12;
        const decode = await ffmpeg.exec(["-i", "source", "-map", "0:v:0", "-vf", `fps=${fps},scale=640:640:force_original_aspect_ratio=decrease:force_divisible_by=2`, "-q:v", "3", "input-%06d.jpg"]);
        if (decode !== 0) throw new Error(t("canvasExtra.mediaError.videoEncodeFailed"));
        await ffmpeg.deleteFile("source");
        const frames = (await ffmpeg.listDir("/"))
            .map((file) => file.name)
            .filter((name) => /^input-\d+\.jpg$/.test(name))
            .sort();
        if (!frames.length) throw new Error(t("canvasExtra.mediaError.videoEncodeFailed"));
        for (const [index, name] of frames.entries()) {
            signal.throwIfAborted();
            const bytes = await ffmpeg.readFile(name);
            const depth = await estimate(new Blob([bytes as BlobPart], { type: "image/jpeg" }));
            await ffmpeg.writeFile(name.replace("input-", "depth-").replace(".jpg", ".png"), new Uint8Array(await depth.arrayBuffer()));
            await ffmpeg.deleteFile(name);
            progress(Math.round((95 * (index + 1)) / frames.length));
        }
        const encoded = await ffmpeg.exec(["-framerate", String(fps), "-i", "depth-%06d.png", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "depth.mp4"]);
        if (encoded !== 0) throw new Error(t("canvasExtra.mediaError.videoEncodeFailed"));
        return new Blob([(await ffmpeg.readFile("depth.mp4")) as BlobPart], { type: "video/mp4" });
    } finally {
        signal.removeEventListener("abort", abort);
        model.terminate();
        ffmpeg.terminate();
    }
}
