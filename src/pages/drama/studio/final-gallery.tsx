import { useRef } from "react";
import { Film } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getResource } from "@/services/api/resources";
import { type DramaEpisodeRow } from "@/services/api/drama";
import { useDramaEpisode } from "./use-studio";
import { useUserStore } from "@/stores/use-user-store";
import { MediaThumb, useResourceMediaUrl, formatDuration } from "../drama-shared";
import { watchText as w } from "./gallery-copy";
import { currentLocaleText as t } from "@/i18n/current-locale-text";
import "@/pages/projects/projects-figma-gallery.css";
import "./final-gallery.css";

export function EpisodePoster({ episode, preview = false, projectId }: { episode: DramaEpisodeRow; preview?: boolean; projectId?: string }) {
    const detail = useDramaEpisode(projectId || "", episode.id, false);
    const video = useRef<HTMLVideoElement>(null);
    const scope = useUserStore((s) => s.user?.id);
    const media = useQuery({ queryKey: ["drama-final-media", scope, episode.finalResourceId], queryFn: () => getResource(episode.finalResourceId!), enabled: Boolean(episode.finalResourceId) });
    const url = useResourceMediaUrl(episode.finalResourceId, "playback");
    const segment = detail.data?.segments.find((s) => s.request.firstFrameResourceId || s.tailFrameResourceId);
    const cover = segment?.request.firstFrameResourceId || segment?.tailFrameResourceId;
    const ratio = media.data?.width && media.data?.height ? media.data.width / media.data.height : undefined;
    return (
        <span
            className="episode-poster"
            style={{ aspectRatio: ratio }}
            onMouseEnter={() => {
                if (preview && !matchMedia("(prefers-reduced-motion: reduce)").matches) void video.current?.play().catch(() => {});
            }}
            onMouseLeave={() => {
                video.current?.pause();
                if (video.current) video.current.currentTime = 0;
            }}
        >
            {cover ? <MediaThumb resourceId={cover} alt="" /> : !url ? <Film aria-hidden /> : null}
            {url && <video ref={video} src={url} muted playsInline preload="metadata" poster={undefined} aria-hidden />}
        </span>
    );
}
export function FinalGallery({ episodes, onSelect, onProduction, projectId }: { projectId: string; episodes: DramaEpisodeRow[]; onSelect: (id: string) => void; onProduction: () => void }) {
    if (!episodes.some((e) => e.finalResourceId))
        return (
            <div className="final-gallery-empty">
                <Film size={36} />
                <h2>{w("empty")}</h2>
                <p>{w("emptyBody")}</p>
                <button className="drama-nav-item" onClick={onProduction}>
                    {w("production")} →
                </button>
            </div>
        );
    return (
        <section className="final-gallery" aria-label={w("episodes")}>
            {episodes.map((e) => (
                <button key={e.id} className="project-case-card final-episode-card" onClick={() => onSelect(e.id)}>
                    <EpisodePoster projectId={projectId} episode={e} preview />
                    <span className="project-case-body">
                        <strong>
                            {t("canvasNov21.drama.episodeNumber", { number: e.number })} · {e.title}
                        </strong>
                        <span>
                            {formatDuration(e.durationMs)} · {w(!e.finalResourceId ? "unmade" : e.finalStale ? "stale" : "complete")}
                        </span>
                    </span>
                </button>
            ))}
        </section>
    );
}
