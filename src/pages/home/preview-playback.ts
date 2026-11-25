type PreviewVideo = Pick<HTMLVideoElement, "play" | "pause">;

/** A delayed play() must not revive a preview after hover, visibility or ownership changes. */
export function requestPreviewPlaybackSafely(
    video: PreviewVideo,
    isCurrent: () => boolean,
    onFailure: () => void,
) {
    if (!isCurrent()) return;
    const failed = (error: unknown) => {
        const name = error && typeof error === "object" && "name" in error ? String(error.name) : "";
        if (isCurrent() && name !== "AbortError") onFailure();
    };
    try {
        void Promise.resolve(video.play()).then(() => {
            if (!isCurrent()) video.pause();
        }, failed);
    } catch (error) {
        failed(error);
    }
}


/** Derived short clips are additive; detail pages retain the full original film. */
export function homePreviewVideoPath(originalPath: string): string {
    return originalPath.replace(/^\/liblib-clone\/western-opening\/videos\/([a-zA-Z0-9-]+\.mp4)$/, "/liblib-clone/western-opening/previews-v1/$1");
}
