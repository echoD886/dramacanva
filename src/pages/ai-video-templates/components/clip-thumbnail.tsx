import { useState } from "react";
import { Film } from "lucide-react";
import type { AIVideoTemplateClip } from "@/types/ai-video-template";

/** A failed cover falls back to the reference video's first frame, never an empty tile. */
// `deferred` keeps the strip from competing with the main player until it can play (perf, rel155).
export function ClipThumbnail({ clip, deferred = false }: { clip: AIVideoTemplateClip; deferred?: boolean }) {
    const [failed, setFailed] = useState(!clip.coverUrl);
    const [loaded, setLoaded] = useState(false);
    const [videoFailed, setVideoFailed] = useState(false);
    const videoUrl = clip.previewUrl || clip.fullUrl;
    return (
        <span className={`aivt-clip-thumbnail${loaded ? " is-loaded" : ""}`}>
            {deferred ? null : failed && (!videoUrl || videoFailed) ? (
                <Film aria-hidden="true" />
            ) : failed ? (
                <video
                    src={`${videoUrl}#t=0.1`}
                    muted
                    playsInline
                    preload="metadata"
                    onLoadedData={() => setLoaded(true)}
                    onError={() => {
                        setVideoFailed(true);
                        setLoaded(true);
                    }}
                />
            ) : (
                <img src={clip.coverUrl} alt="" loading="lazy" fetchPriority="low" decoding="async" onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
            )}
        </span>
    );
}
