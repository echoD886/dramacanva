import { useEffect, useId, useRef } from "react";
import { videoPlaybackManager } from "./video-playback-manager";

/** Desktop previews follow intent; touch previews follow the middle of the scroll viewport. */
export function usePreview(src?: string) {
    const ref = useRef<HTMLVideoElement>(null);
    const id = useId();
    useEffect(() => {
        const video = ref.current;
        const card = video?.closest("a");
        if (!video || !card || !src) return;
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
        const showPreview = () => {
            video.dataset.playing = "true";
        };
        const hidePreview = () => {
            delete video.dataset.playing;
        };
        video.addEventListener("playing", showPreview);
        video.addEventListener("pause", hidePreview);
        const desktop = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
        const unregister = videoPlaybackManager.register(id, (play) => {
            if (play && !reduced.matches) {
                if (!video.src) video.src = src;
                void video.play().catch(() => undefined);
            } else video.pause();
        });
        const enter = () => videoPlaybackManager.updateIntersection(id, true, 1, video);
        const leave = () => videoPlaybackManager.updateIntersection(id, false, 0, video);
        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (!desktop) videoPlaybackManager.updateIntersection(id, entry.isIntersecting, entry.intersectionRatio, video);
                else if (!entry.isIntersecting) leave();
            },
            { root: card.closest(".aivt-page-root"), rootMargin: desktop ? "0px" : "-20% 0px", threshold: [0, 0.5, 0.75, 1] },
        );
        observer.observe(card);
        if (desktop) card.addEventListener("mouseenter", enter);
        card.addEventListener("focus", enter);
        card.addEventListener("mouseleave", leave);
        card.addEventListener("blur", leave);
        return () => {
            observer.disconnect();
            video.removeEventListener("playing", showPreview);
            video.removeEventListener("pause", hidePreview);
            card.removeEventListener("mouseenter", enter);
            card.removeEventListener("focus", enter);
            card.removeEventListener("mouseleave", leave);
            card.removeEventListener("blur", leave);
            video.pause();
            unregister();
        };
    }, [src, id]);
    return ref;
}
