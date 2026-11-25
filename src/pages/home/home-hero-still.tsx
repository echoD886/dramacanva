import { useState } from "react";

/** The original Wan artwork contains obsolete baked copy; its right-hand masks are cropped in CSS. */
export const HOME_HERO_STILLS = {
    wan: { name: "wan-original-masks", width: 3840, height: 480 },
    // The film's own frame 0 at full resolution: it paints with the banner copy, and the
    // video drawn on top covers it pixel-for-pixel once its first frame decodes.
    byokStudio: { name: "minimax-h3-home-hero-first-frame-20261030", width: 2944, height: 1248 },
} as const;

export function HomeHeroStill({
    campaign,
    priority,
    videoRef,
    loadVideo,
    onPlaybackComplete,
}: {
    campaign: keyof typeof HOME_HERO_STILLS;
    priority: boolean;
    videoRef?: (element: HTMLVideoElement | null) => void;
    loadVideo?: boolean;
    onPlaybackComplete?: () => void;
}) {
    const [failed, setFailed] = useState(false);
    const media = HOME_HERO_STILLS[campaign];
    const base = `/brand/say-action/hero/${media.name}`;
    return (
        <span className={`ll-home-hero-still${failed ? " is-unavailable" : ""}`}>
            <picture>
                <source type="image/avif" srcSet={`${base}.avif`} />
                <img src={`${base}.webp`} alt="" width={media.width} height={media.height} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} decoding="async" onError={() => setFailed(true)} />
            </picture>
            {campaign === "byokStudio" ? <video ref={videoRef} muted playsInline autoPlay={loadVideo} preload="none" src={loadVideo ? "/brand/say-action/hero/minimax-h3-home-hero-faststart-20261005.mp4" : undefined} onEnded={onPlaybackComplete} /> : null}
        </span>
    );
}
