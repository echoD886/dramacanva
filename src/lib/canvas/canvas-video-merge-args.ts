// 画布录制转 MP4 的 ffmpeg 参数，纯函数便于单测。
// 预演台白膜用 WebGL canvas.captureStream 录制，没有音轨，画布在 dpr 1.5 下宽高经常是奇数。
// @ffmpeg/core 的 libx264 + yuv420p 要求宽高都能被 2 整除，奇数帧会直接失败：
// "width not divisible by 2" → exit 1，界面只看到「视频转码失败，请重试」。
// 该内核还关闭了 pthreads 和 asm，默认 medium preset 在视口分辨率下转不动，所以用 ultrafast 单线程。

export type RecordingTranscodeTiming = { fps?: number; duration?: number };

export function buildRecordingTranscodeArgs(inputName: string, outputName: string, timing: RecordingTranscodeTiming = {}): string[] {
    const fps = timing.fps !== undefined && Number.isFinite(timing.fps) && timing.fps >= 1 && timing.fps <= 60 ? Math.round(timing.fps) : undefined;
    const duration = timing.duration !== undefined && Number.isFinite(timing.duration) && timing.duration > 0 && timing.duration <= 600 ? timing.duration : undefined;
    const filter = fps ? `fps=${fps},scale=trunc(iw/2)*2:trunc(ih/2)*2` : "scale=trunc(iw/2)*2:trunc(ih/2)*2";
    return ["-i", inputName, "-an", "-vf", filter, ...(duration ? ["-t", String(Number(duration.toFixed(3)))] : []), "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-threads", "1", outputName];
}

export function previsExportDuration(totalFrames: number, fps: number) {
    if (!Number.isInteger(totalFrames) || totalFrames < 0 || !Number.isFinite(fps) || fps <= 0) throw new RangeError("Invalid previs frame count or fps");
    // 最后一帧时间是 (totalFrames - 1) / fps；它还要显示一帧，不能当作总时长。
    return totalFrames / fps;
}

export function buildPrevisEncodeArgs({ fps, width, height, pattern, output }: { fps: number; width: number; height: number; pattern: string; output: string }): string[] {
    previsExportDuration(0, fps);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 2 || height < 2) throw new RangeError("Invalid previs dimensions");
    const size = `${Math.floor(width / 2) * 2}:${Math.floor(height / 2) * 2}`;
    return [
        "-framerate",
        String(fps),
        "-start_number",
        "0",
        "-i",
        pattern,
        "-an",
        "-vf",
        `scale=${size}`,
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-crf",
        "20",
        "-pix_fmt",
        "yuv420p",
        "-r",
        String(fps),
        "-threads",
        "1",
        "-movflags",
        "+faststart",
        output,
    ];
}
