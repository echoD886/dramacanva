import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type Hls from "hls.js/light";

// Showcase finals above Cloudflare's 512 MB cache limit are served uncached from
// the origin and stall abroad. Each has a lossless HLS copy (fMP4, stream copy,
// ~2 s segments named .mp4 so the edge caches them) under /liblib-clone/hls/<name>/.
// The MP4 stays in place and is used whenever segmented playback is unavailable.
const SEGMENTED_FINALS = new Set<string>();

export function segmentedManifestFor(url?: string) {
    if (!url) return undefined;
    const path = url.replace(/^https?:\/\/[^/]+/, "").split(/[?#]/)[0];
    if (!SEGMENTED_FINALS.has(path)) return undefined;
    return `/liblib-clone/hls/${path.slice(path.lastIndexOf("/") + 1, -".mp4".length)}/index.m3u8`;
}

const supportsMediaSource = () => typeof window !== "undefined" && ("MediaSource" in window || "ManagedMediaSource" in window);
const supportsNativeHls = (video: HTMLVideoElement | null) => Boolean(video?.canPlayType("application/vnd.apple.mpegurl"));

type Mode = "file" | "mse" | "native";

/**
 * Source for a showcase <video>. Returns the `src` to render (undefined while hls.js
 * owns the element), `warm` to start buffering on intent, and `onError` for the element.
 */
export function useSegmentedVideo(videoRef: RefObject<HTMLVideoElement | null>, url?: string) {
    const manifest = segmentedManifestFor(url);
    const [failedUrl, setFailedUrl] = useState<string>();
    const [nativeOnly, setNativeOnly] = useState(false);
    const hlsRef = useRef<Hls | null>(null);
    const startedRef = useRef(false);
    // Prerendered HTML keeps the MP4; the browser decides after hydration.
    const segmented = Boolean(manifest) && failedUrl !== url && typeof window !== "undefined";
    const effectiveMode: Mode = !segmented ? "file" : supportsMediaSource() && !nativeOnly ? "mse" : "native";

    useEffect(() => {
        startedRef.current = false;
        // Native HLS is only a fallback where MediaSource is missing (older iPhone Safari).
        if (effectiveMode === "native" && !supportsNativeHls(videoRef.current)) setFailedUrl(url);
    }, [effectiveMode, url, videoRef]);

    useEffect(() => {
        if (effectiveMode !== "mse" || !manifest) return;
        const video = videoRef.current;
        if (!video) return;
        let cancelled = false;
        const startLoad = () => {
            if (startedRef.current || !hlsRef.current) return;
            startedRef.current = true;
            hlsRef.current.startLoad(video.currentTime || -1);
        };
        const fail = () => {
            if (cancelled) return;
            hlsRef.current?.destroy();
            hlsRef.current = null;
            setFailedUrl(url);
        };
        video.addEventListener("play", startLoad);
        import("hls.js/light")
            .then(({ default: HlsClass }) => {
                if (cancelled) return;
                if (!HlsClass.isSupported()) {
                    if (supportsNativeHls(video)) setNativeOnly(true);
                    else fail();
                    return;
                }
                // preload="none" semantics: the playlist is read now, segments only on intent or play.
                // progressive appends a segment while it streams in: first frame 3.4 s -> 1.9 s on a
                // 30 Mbps link (an MP4 shows its first frame after a few MB, a segment needs ~6 MB).
                const hls = new HlsClass({ autoStartLoad: false, maxBufferLength: 30, progressive: true });
                hlsRef.current = hls;
                hls.on(HlsClass.Events.ERROR, (_event, data) => {
                    if (data.fatal) fail();
                });
                hls.loadSource(manifest);
                hls.attachMedia(video);
                if (video.preload === "auto" || !video.paused) startLoad();
            })
            .catch(fail);
        return () => {
            cancelled = true;
            video.removeEventListener("play", startLoad);
            hlsRef.current?.destroy();
            hlsRef.current = null;
        };
    }, [effectiveMode, manifest, url, videoRef]);

    const warm = useCallback(() => {
        if (hlsRef.current && !startedRef.current) {
            startedRef.current = true;
            hlsRef.current.startLoad(-1);
        }
    }, []);

    const onError = useCallback(() => {
        if (effectiveMode === "native") setFailedUrl(url);
    }, [effectiveMode, url]);

    const src = effectiveMode === "file" ? url : effectiveMode === "native" ? manifest : undefined;
    return { src, warm, onError };
}
