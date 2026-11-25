export type VideoMetadata = { width: number; height: number; durationMs: number };

export async function probeMediaDurationMs(file: File): Promise<number | undefined> {
    if (!/^(video|audio)\//.test(file.type)) return undefined;
    const url = URL.createObjectURL(file);
    try {
        if (file.type.startsWith("video/")) return (await readVideoMetadata(url, 8_000)).durationMs;
        return await new Promise<number | undefined>((resolve) => {
            const audio = document.createElement("audio");
            const finish = () => {
                const duration = audio.duration;
                clearTimeout(timer);
                audio.onloadedmetadata = audio.onerror = null;
                audio.removeAttribute("src");
                audio.load();
                resolve(Number.isFinite(duration) && duration > 0 ? Math.round(duration * 1000) : undefined);
            };
            const timer = setTimeout(finish, 8_000);
            audio.preload = "metadata";
            audio.onloadedmetadata = audio.onerror = finish;
            audio.src = url;
        });
    } catch {
        return undefined;
    } finally {
        URL.revokeObjectURL(url);
    }
}

/** Reads the actual container, including MediaRecorder WebM with unknown initial duration. */
export function readVideoMetadata(source: string, timeoutMs = 10_000): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
        const video = document.createElement("video");
        let settled = false;
        const finish = (error?: Error) => {
            if (settled) return;
            const duration = video.duration;
            if (!error && (!Number.isFinite(duration) || duration <= 0 || !video.videoWidth || !video.videoHeight)) return;
            settled = true;
            const result = { width: video.videoWidth, height: video.videoHeight, durationMs: Math.round(duration * 1000) };
            clearTimeout(timer);
            video.onloadedmetadata = video.ondurationchange = video.onseeked = video.onerror = null;
            video.pause();
            video.removeAttribute("src");
            video.load();
            if (error) reject(error); else resolve(result);
        };
        const timer = setTimeout(() => finish(new Error("无法读取视频尺寸和时长")), timeoutMs);
        video.preload = "metadata";
        video.muted = true;
        video.onloadedmetadata = () => {
            if (video.duration === Infinity) video.currentTime = 1e10;
            else finish();
        };
        video.ondurationchange = () => finish();
        video.onseeked = () => finish();
        video.onerror = () => finish(new Error("无法解码视频"));
        video.src = source;
        video.load();
    });
}
