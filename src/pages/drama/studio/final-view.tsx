import { useEffect, useMemo, useRef, useState } from "react";
import { App, Dropdown } from "antd";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Play, Pause, Workflow, Download, MoreHorizontal, ChevronDown, Loader2 } from "lucide-react";
import { currentLocaleText as t } from "@/i18n/current-locale-text";
import { reviewText, useReviewLocale } from "@/i18n/drama-messages";
import { composeDramaEpisode, listDramaFinalTasks, listDramaWorldClips, type DramaEpisodeRow, type DramaEpisodeDetail } from "@/services/api/drama";
import { useUserStore } from "@/stores/use-user-store";
import { downloadResource, MediaThumb, useResourceMediaUrl, formatDuration } from "../drama-shared";
import { ShowcaseStage, ShowcaseActions, ShowcaseRail } from "@/components/showcase-stage";
import { JianyingExport } from "./drama-delivery";
import { composeSummary, taskFinalVersion, versionMatchesReady, type FinalVersion } from "./final-versions";
import { getResource } from "@/services/api/resources";
import { finalMediaSize } from "./final-media";
import { EpisodePoster } from "./final-gallery";
import { watchText as w } from "./gallery-copy";
import { isTypingTarget } from "./use-studio";
import { Switch } from "@/components/ui/base/switch";
import { dramaKeys } from "@/lib/drama/query-keys";

export function FinalView({
    projectId,
    title,
    detail,
    onOpenSegment,
    onStoryboard,
    onImport,
    importing,
    episodes = [],
    onSelectEpisode,
    immersive = false,
    onBack,
}: {
    projectId: string;
    title: string;
    detail: DramaEpisodeDetail;
    onOpenSegment: (index: number) => void;
    onStoryboard: () => void;
    onImport: () => void;
    importing: boolean;
    episodes?: DramaEpisodeRow[];
    onSelectEpisode?: (id: string) => void;
    immersive?: boolean;
    onBack?: () => void;
}) {
    const locale = useReviewLocale();
    const { message } = App.useApp();
    const { episode, segments } = detail;
    const scope = useUserStore((s) => s.user?.id);
    const videoRef = useRef<HTMLVideoElement>(null);
    const dialogRef = useRef<HTMLDialogElement>(null);
    const confirmRef = useRef<HTMLButtonElement>(null);
    const moreRef = useRef<HTMLButtonElement>(null);
    const [selected, setSelected] = useState("official");
    const [current, setCurrent] = useState(segments[0]?.index || 0);
    const [paused, setPaused] = useState(true);
    const [jianying, setJianying] = useState(false);
    const [submitted, setSubmitted] = useState("");
    const [panel, setPanel] = useState<"episodes" | "process">("episodes");
    const [grid, setGrid] = useState(false);
    const [autoplay, setAutoplay] = useState(() => sessionStorage.getItem("drama-autoplay") !== "off");
    const [countdown, setCountdown] = useState<number | null>(null);
    const [watched, setWatched] = useState<string[]>(() => JSON.parse(sessionStorage.getItem(`drama-watched:${scope}:${projectId}`) || "[]"));
    const episodePosition = episodes.findIndex((e) => e.id === episode.id);
    const nextEpisode = episodes.slice(episodePosition + 1).find((e) => e.finalResourceId);
    const previousEpisode = episodes
        .slice(0, episodePosition)
        .reverse()
        .find((e) => e.finalResourceId);
    const go = (id: string) => {
        setCountdown(null);
        onSelectEpisode?.(id);
    };
    useEffect(() => {
        if (countdown === null || !autoplay || !nextEpisode) return;
        const timer = window.setTimeout(() => {
            if (countdown <= 1) go(nextEpisode.id);
            else setCountdown(countdown - 1);
        }, 1000);
        return () => window.clearTimeout(timer);
    }, [countdown, autoplay, nextEpisode?.id]);
    const notified = useRef(new Set<string>());
    const tasks = useQuery({
        queryKey: ["drama-final-versions", scope, projectId, episode.id],
        queryFn: ({ signal }) => listDramaFinalTasks(projectId, signal),
        refetchInterval: (q) => (submitted || q.state.data?.some((task) => (task.status === "queued" || task.status === "running") && taskFinalVersion(task, segments)) ? 2500 : 20000),
    });
    const versions = useMemo(
        () =>
            (tasks.data || [])
                .map((task) => taskFinalVersion(task, segments))
                .filter((v): v is FinalVersion => Boolean(v))
                .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || "")),
        [tasks.data, segments],
    );
    const exports = versions.filter((v) => !detail.jobs.some((job) => job.taskId === v.id) && v.resourceId !== episode.finalResourceId);
    const officialSnapshot = versions.find((v) => v.resourceId === episode.finalResourceId);
    let startMs = 0;
    const fallbackClips = segments.map((s) => {
        const clip = { segmentId: s.id, index: s.index, resourceId: s.videoResourceId, startMs, durationMs: (s.request.seconds || s.durationMs / 1000) * 1000 };
        startMs += clip.durationMs;
        return clip;
    });
    const official: FinalVersion = officialSnapshot || { id: "official", resourceId: episode.finalResourceId, durationMs: episode.durationMs, clips: episode.finalStale ? [] : fallbackClips };
    const version = selected === "official" ? official : exports.find((v) => v.id === selected) || official;
    const url = useResourceMediaUrl(version.resourceId, "playback");
    const [measured, setMeasured] = useState<{ url: string; width: number; height: number; durationMs: number }>();
    const metadata = useQuery({
        queryKey: ["drama-final-media", scope, version.resourceId],
        queryFn: () => getResource(version.resourceId!),
        enabled: Boolean(version.resourceId),
    });
    const size = (measured?.url === url ? finalMediaSize(measured.width, measured.height) : undefined) || finalMediaSize(metadata.data?.width, metadata.data?.height);
    const durationMs = measured?.url === url ? measured.durationMs : version.durationMs;
    const worldClips = useQuery({
        queryKey: dramaKeys.worldClips(projectId, episode.id, scope),
        queryFn: ({ signal }) => listDramaWorldClips(projectId, episode.id, signal),
        refetchOnMount: "always",
    });
    const stats = composeSummary(segments, worldClips.data?.clips);
    const pending = exports.find((v) => v.task?.status === "running" || v.task?.status === "queued");
    const composing = Boolean(pending || submitted);
    useEffect(() => {
        if (pending && !submitted) setSubmitted(pending.id);
        if (!episode.finalResourceId && selected === "official") {
            const latest = exports.filter((v) => v.resourceId).at(-1);
            if (latest) setSelected(latest.id);
        }
    }, [pending?.id, submitted, episode.finalResourceId, selected, exports]);
    const activeSegment = segments.find((s) => s.index === current) || segments[0];
    const frameId = activeSegment?.request.firstFrameResourceId || activeSegment?.tailFrameResourceId;
    const frameUrl = useResourceMediaUrl(frameId);
    useEffect(() => {
        const task = exports.find((v) => v.id === submitted);
        if (!task || notified.current.has(task.id)) return;
        if (task.resourceId) {
            notified.current.add(task.id);
            setSelected(task.id);
            setSubmitted("");
            void message.success(t("canvasNov21.drama.composeDone"));
        } else if (task.task?.status === "failed" || task.task?.status === "cancelled") {
            notified.current.add(task.id);
            setSubmitted("");
            void message.error(t("canvasNov21.drama.composeFailed"));
        }
    }, [exports, submitted, message]);
    const compose = useMutation({
        mutationFn: () => composeDramaEpisode(projectId, episode.id),
        onSuccess: (result) => {
            setSubmitted(result.taskId);
            dialogRef.current?.close();
            void tasks.refetch();
        },
        onError: () => message.error(t("canvasNov21.drama.composeFailed")),
    });
    const play = () => {
        if (!url) return;
        setCountdown(null);
        void videoRef.current?.play().catch(() => undefined);
    };
    useEffect(() => {
        const key = (e: KeyboardEvent) => {
            if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
            if (e.key === "Escape") onBack?.();
            if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                e.preventDefault();
                const target = e.key === "ArrowRight" ? nextEpisode : previousEpisode;
                if (target) go(target.id);
            }
            if (e.code === "Space" && (e.target === document.body || e.target === videoRef.current)) {
                e.preventDefault();
                const video = videoRef.current;
                if (video) {
                    if (video.paused) void video.play().catch(() => undefined);
                    else video.pause();
                }
            }
        };
        window.addEventListener("keydown", key);
        return () => window.removeEventListener("keydown", key);
    });
    const versionLabel = (id: string) => (id === "official" ? t("canvasNov21.drama.officialVersion") : t("canvasNov21.drama.exportVersion", { number: String(exports.findIndex((v) => v.id === id) + 1).padStart(2, "0") }));
    const versionItems = [
        {
            key: "official",
            label: versionLabel("official"),
            disabled: !official.resourceId,
            onClick: () => {
                setSelected("official");
                setCurrent(official.clips[0]?.index || 0);
            },
        },
        ...exports
            .filter((v) => v.resourceId)
            .map((v) => ({
                key: v.id,
                label: (
                    <span>
                        {versionLabel(v.id)}
                        <small>{t("canvasNov21.drama.versionDetails", { time: new Date(v.createdAt!).toLocaleString(locale), count: new Set(v.clips.map((c) => c.segmentId)).size, stale: v.clips.filter((c) => c.stale).length })}</small>
                    </span>
                ),
                onClick: () => {
                    setSelected(v.id);
                    setCurrent(v.clips[0]?.index || 0);
                },
            })),
    ];
    const jianyingSupported = versionMatchesReady(version, segments) && locale.startsWith("zh");
    const jianyingItem = {
        key: "jianying",
        label: (
            <span title={jianyingSupported ? undefined : t("canvasNov21.drama.jianyingUnavailable")}>
                {t("canvasNov21.drama.jianyingProject")}
                {!jianyingSupported && <small>{t("canvasNov21.drama.jianyingUnavailable")}</small>}
            </span>
        ),
        disabled: !jianyingSupported,
        onClick: () => setJianying(true),
    };
    const download = () => {
        if (version.resourceId) void downloadResource(version.resourceId, `${title}-${episode.number}-${versionLabel(selected)}.mp4`).catch(() => message.error(t("canvasNov21.drama.downloadFailed")));
    };
    const actions = (
        <>
            <button className="ll-detail-action-round is-primary" aria-label={paused ? t("canvasNov21.drama.playEpisode") : t("miscPages.detailPause")} disabled={!url} onClick={() => (paused ? play() : videoRef.current?.pause())}>
                {paused ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />}
            </button>
            <button className="ll-detail-process" disabled={importing} onClick={onImport}>
                <Workflow aria-hidden /> {w("import")}
            </button>
            <Dropdown trigger={["click"]} menu={{ items: [{ key: "mp4", label: t("canvasNov21.drama.downloadMp4"), disabled: !url, onClick: download }, jianyingItem] }}>
                <button className="ll-detail-action-round" aria-label={reviewText("下载")}>
                    <Download size={16} />
                </button>
            </Dropdown>
            <button className="ll-detail-process watch-next" disabled={!nextEpisode} onClick={() => nextEpisode && go(nextEpisode.id)}>
                {w("next")} ›
            </button>
            <Dropdown
                trigger={["click"]}
                menu={{
                    items: [
                        { key: "mp4", label: t("canvasNov21.drama.downloadMp4"), disabled: !url, onClick: download },
                        jianyingItem,
                        {
                            key: "compose",
                            label: t("canvasNov21.drama.composeClips"),
                            disabled: !stats.ready || composing || compose.isPending,
                            onClick: () => {
                                dialogRef.current?.showModal();
                                confirmRef.current?.focus();
                            },
                        },
                        { key: "canvas", label: t("canvasNov21.drama.projectEpisode"), disabled: importing, onClick: onImport },
                        {
                            key: "stale",
                            label: (
                                <span>
                                    {t("canvasNov21.drama.staleNotice", {
                                        number:
                                            segments
                                                .filter((s) => s.videoStatus === "stale")
                                                .map((s) => s.index + 1)
                                                .join(", ") || "—",
                                    })}
                                    <small>{t("canvasNov21.drama.redoChanged")}</small>
                                </span>
                            ),
                            disabled: !episode.finalStale,
                            onClick: () => {
                                const changed = segments.find((s) => s.videoStatus === "stale");
                                if (changed) onOpenSegment(changed.index);
                                else onStoryboard();
                            },
                        },
                        { key: "versions", label: t("canvasNov21.drama.switchVersion"), children: versionItems },
                    ],
                }}
            >
                <button
                    className="ll-detail-action-round more-btn"
                    aria-label={t("canvasNov21.drama.moreActions")}
                    onClick={(event) => {
                        moreRef.current = event.currentTarget;
                    }}
                >
                    <MoreHorizontal size={22} />
                </button>
            </Dropdown>
        </>
    );
    const empty = !version.resourceId && !composing;
    return (
        <ShowcaseStage
            className={`drama-premiere ${immersive ? "is-immersive" : ""} ${size?.compact !== false ? "is-compact" : "is-wide"} ${empty ? "is-empty" : ""}`}
            style={{ "--final-ratio": size?.ratio || 1 } as React.CSSProperties}
            aria-label={t("canvasNov21.drama.officialVersion")}
            posterUrl={frameUrl}
            media={
                !empty && (
                    <div className="final-screen">
                        <div className="watch-video-frame">
                            <video
                                key={url}
                                ref={videoRef}
                                className="ll-detail-video"
                                src={url || undefined}
                                poster={frameUrl || undefined}
                                onPlay={() => {
                                    setPaused(false);
                                    setCountdown(null);
                                }}
                                onPause={() => setPaused(true)}
                                onEnded={() => {
                                    setPaused(true);
                                    const seen = Array.from(new Set([...watched, episode.id]));
                                    setWatched(seen);
                                    sessionStorage.setItem(`drama-watched:${scope}:${projectId}`, JSON.stringify(seen));
                                    if (autoplay && nextEpisode) setCountdown(5);
                                }}
                                controls
                                autoPlay
                                playsInline
                                preload="metadata"
                                onLoadedMetadata={(event) => {
                                    const video = event.currentTarget;
                                    setMeasured({ url, width: video.videoWidth, height: video.videoHeight, durationMs: Number.isFinite(video.duration) ? video.duration * 1000 : version.durationMs });
                                }}
                                aria-label={episode.title}
                                onTimeUpdate={(e) => {
                                    const clip = version.clips.find((c) => e.currentTarget.currentTime * 1000 >= c.startMs && e.currentTarget.currentTime * 1000 < c.startMs + c.durationMs);
                                    if (clip) setCurrent(clip.index);
                                }}
                            />
                            {countdown !== null && nextEpisode && (
                                <div className="watch-countdown" role="status">
                                    <EpisodePoster projectId={projectId} episode={nextEpisode} />
                                    <div>
                                        <span>
                                            {w("countdown", { s: countdown, n: nextEpisode.number })} · {nextEpisode.title}
                                        </span>
                                        <div className="watch-countdown-actions">
                                            <button onClick={() => go(nextEpisode.id)}>{w("playNow")}</button>
                                            <button onClick={() => setCountdown(null)}>{w("cancel")}</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }
        >
            {immersive && (
                <button className="watch-back" onClick={onBack}>
                    ← {w("back")}
                </button>
            )}
            <header className="final-info">
                <h2>
                    {t("canvasNov21.drama.episodeNumber", { number: episode.number })} · {episode.title}
                </h2>
                <p className="final-hook">{episode.hook}</p>
                <div className="final-meta">
                    <span>
                        {`${String(Math.floor(durationMs / 60000)).padStart(2, "0")}:${String(Math.floor(durationMs / 1000) % 60).padStart(2, "0")}`} · {size?.label || "—"} ·{" "}
                        {t("canvasNov21.drama.clipCount", { count: new Set(version.clips.map((clip) => clip.segmentId)).size || segments.length })}
                    </span>
                    <Dropdown trigger={["click"]} menu={{ items: versionItems }}>
                        <button className="version-trigger" aria-label={t("canvasNov21.drama.switchVersion")}>
                            {versionLabel(selected)}
                            <ChevronDown size={12} />
                        </button>
                    </Dropdown>
                </div>
            </header>
            {empty && <ShowcaseActions aria-label={t("miscPages.detailActionsAria")}>{actions}</ShowcaseActions>}
            {empty ? (
                <div className="empty-message">
                    <h2>{t("canvasNov21.drama.emptyTitle")}</h2>
                    <p>{t("canvasNov21.drama.emptyBody")}</p>
                    <button className="ll-detail-process" onClick={onStoryboard}>
                        {t("canvasNov21.drama.backStoryboard")} →
                    </button>
                </div>
            ) : (
                <>
                    {composing && (
                        <div className="compose-progress" role="status">
                            {t(pending?.task?.status === "queued" ? "canvasNov21.drama.queued" : "canvasNov21.drama.composing")} · {t("canvasNov21.drama.canLeave")}
                            <span>
                                <i />
                            </span>
                        </div>
                    )}
                    <ShowcaseActions aria-label={t("miscPages.detailActionsAria")}>{actions}</ShowcaseActions>
                    <aside className="watch-panel" aria-label={w("episodes")}>
                        <div className="watch-queue-heading">
                            <strong>{title}</strong>
                            <span>{w("total", { n: episodes.length })}</span>
                        </div>
                        <div className="watch-tabs" role="tablist">
                            <button role="tab" aria-selected={panel === "episodes"} onClick={() => setPanel("episodes")}>
                                {w("episodes")}
                            </button>
                            <button role="tab" aria-selected={panel === "process"} onClick={() => setPanel("process")}>
                                {w("process")}
                            </button>
                        </div>
                        {panel === "episodes" ? (
                            <>
                                <div className="watch-options">
                                    <label>
                                        {w("autoplay")}{" "}
                                        <Switch
                                            size="sm"
                                            aria-label={w("autoplay")}
                                            checked={autoplay}
                                            onChange={(checked) => {
                                                setAutoplay(checked);
                                                sessionStorage.setItem("drama-autoplay", checked ? "on" : "off");
                                                setCountdown(null);
                                            }}
                                        />
                                    </label>
                                    <button aria-label={w(grid ? "list" : "grid")} aria-pressed={grid} onClick={() => setGrid(!grid)}>
                                        {w(grid ? "list" : "grid")}
                                    </button>
                                </div>
                                <div className={`watch-episodes ${grid ? "is-grid" : ""}`}>
                                    {episodes.map((e) => (
                                        <button key={e.id} className={`watch-episode ${watched.includes(e.id) ? "is-watched" : ""}`} aria-current={e.id === episode.id ? "true" : undefined} disabled={!e.finalResourceId} onClick={() => go(e.id)}>
                                            {!grid && <EpisodePoster projectId={projectId} episode={e} />}
                                            <span>
                                                <small>{e.id === episode.id ? `▶ ${w("watching")}` : e.id === nextEpisode?.id ? w("next") : watched.includes(e.id) ? w("watched") : ""}</small>
                                                <strong>
                                                    {e.number}
                                                    {!grid && ` · ${e.title}`}
                                                </strong>
                                                <small>{!e.finalResourceId ? w("unmade") : grid ? "" : `${formatDuration(e.durationMs)} · ${w(e.finalStale ? "stale" : "complete")}`}</small>
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <>
                                <ShowcaseRail label={t("canvasNov21.drama.moments", { count: segments.length })} previousLabel={t("miscPages.detailRailPrevAria")} nextLabel={t("miscPages.detailRailNextAria")}>
                                    {segments.map((s) => {
                                        const clip = version.clips.find((c) => c.segmentId === s.id);
                                        const state = clip?.shotId
                                            ? ""
                                            : s.videoStatus === "stale"
                                              ? "olderClip"
                                              : s.videoStatus === "running" || s.videoStatus === "queued"
                                                ? "generating"
                                                : s.videoStatus === "failed"
                                                  ? "failed"
                                                  : !s.videoResourceId
                                                    ? "notGenerated"
                                                    : "";
                                        return (
                                            <button
                                                key={s.id}
                                                type="button"
                                                className={`ll-detail-rail-item ${current === s.index ? "is-active" : ""}`}
                                                aria-current={current === s.index ? "true" : undefined}
                                                aria-label={`${s.index + 1} ${s.title} ${state ? t(`canvasNov21.drama.${state}`) : ""}`}
                                                title={clip && url ? t("canvasNov21.drama.playFromHere") : t("canvasNov21.drama.redoClip")}
                                                onClick={() => {
                                                    if (clip && url) {
                                                        if (videoRef.current) videoRef.current.currentTime = clip.startMs / 1000;
                                                        setCurrent(s.index);
                                                        play();
                                                    } else onOpenSegment(s.index);
                                                }}
                                            >
                                                <MediaThumb resourceId={s.request.firstFrameResourceId || s.tailFrameResourceId} alt="" />
                                                {state && (
                                                    <small className={`final-badge ${state}`}>
                                                        {state === "generating" && <Loader2 size={10} className="animate-spin" />}
                                                        {t(`canvasNov21.drama.${state}`)}
                                                    </small>
                                                )}
                                                <em>
                                                    {String(s.index + 1).padStart(2, "0")} {s.title} · {s.request.seconds || s.durationMs / 1000}s
                                                </em>
                                            </button>
                                        );
                                    })}
                                </ShowcaseRail>
                                <button className="watch-storyboard" onClick={() => onOpenSegment(current)}>
                                    {w("storyboard")} →
                                </button>
                            </>
                        )}
                    </aside>
                </>
            )}
            {tasks.isError && (
                <p role="alert">
                    {t("canvasNov21.drama.loadVersionsFailed")} <button onClick={() => void tasks.refetch()}>{reviewText("重试")}</button>
                </p>
            )}
            <dialog ref={dialogRef} className="compose-dialog" aria-labelledby="compose-title" onClose={() => moreRef.current?.focus()}>
                <h2 id="compose-title">{t("canvasNov21.drama.composeTitle")}</h2>
                <p>{t("canvasNov21.drama.composeClips")}</p>
                <div className="numbers">
                    {(["ready", "skipped", "stale"] as const).map((key) => (
                        <div key={key}>
                            <strong>{stats[key]}</strong>
                            <span>{t(`canvasNov21.drama.${key}Count`)}</span>
                        </div>
                    ))}
                </div>
                <p className="sr-only">{t("canvasNov21.drama.composeSummary", stats)}</p>
                <p>
                    {t("canvasNov21.drama.noCredits")}
                    <br />
                    {t("canvasNov21.drama.snapshotNotice")}
                </p>
                <div className="dialog-actions">
                    <button disabled={compose.isPending} onClick={() => dialogRef.current?.close()}>
                        {t("canvasNov21.drama.cancelCompose")}
                    </button>
                    <button ref={confirmRef} className="confirm" disabled={compose.isPending || !stats.ready} onClick={() => compose.mutate()}>
                        {t("canvasNov21.drama.confirmCompose")}
                    </button>
                </div>
            </dialog>
            <JianyingExport projectId={projectId} detail={detail} open={jianying} onClose={() => setJianying(false)} />
        </ShowcaseStage>
    );
}
