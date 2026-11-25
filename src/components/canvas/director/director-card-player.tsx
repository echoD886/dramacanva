import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Pause, Play, Repeat2, StepBack, StepForward } from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";
import type { DirectorScene } from "@/types/director";
import { resolveMediaUrl } from "@/services/file-storage";
import { computePrevisSequenceFingerprint, directorPrevisFingerprint } from "@/lib/canvas/director/director-previs-cache";
import { useActiveTheme } from "@/stores/canvas/use-canvas-theme-store";
import { frameAtElapsed, resolvePlaybackFrame, shouldHandlePlayerKey, stepPrevisFrame } from "@/lib/canvas/director/director-previs-clock";
import { buildFrozenSceneFromSnapshot, evaluatePrevisFrame } from "@/lib/canvas/director/director-previs-evaluate";
import { mapDirectorSceneToPrevis } from "@/lib/canvas/director/director-previs-legacy";
import { findPrevisSegmentAtFrame, getPrevisTotalFrames, resolvePrevisSegmentBoundaries } from "@/lib/canvas/director/director-previs-sequence";
import { directorSceneForShot } from "@/lib/canvas/director/director-storyboard";
import { directorCardEditTarget, directorCardSeekState, directorCardSegments, type DirectorCardEditTarget } from "@/lib/canvas/director/director-node-card";

const DirectorCardRender = lazy(() => import("./director-card-render"));
const DirectorPlanViewport = lazy(() => import("./director-plan-viewport"));

// A single owner across cards prevents a large canvas from running many timelines.
let owner: string | null = null;
const listeners = new Set<() => void>();
function claim(id: string | null) {
    owner = id;
    listeners.forEach((notify) => notify());
}

export function DirectorCardPlayer({
    id,
    scene,
    shotId,
    url: fallback,
    storageKey,
    cacheFingerprint,
    videoKind = "previs",
    plan = false,
    compact = false,
    preview,
    status,
    onEdit,
    editDisabled,
    editTitle,
}: {
    id: string;
    scene: DirectorScene;
    shotId?: string;
    url?: string;
    storageKey?: string;
    cacheFingerprint?: string;
    videoKind?: "previs" | "final";
    plan?: boolean;
    compact?: boolean;
    preview?: ReactNode;
    status?: ReactNode;
    onEdit?: (target: DirectorCardEditTarget) => void;
    editDisabled?: boolean;
    editTitle?: string;
}) {
    const { t } = useI18n();
    const theme = useActiveTheme();
    const root = useRef<HTMLDivElement>(null);
    const video = useRef<HTMLVideoElement>(null);
    const sequence = useMemo(() => scene.previs ?? mapDirectorSceneToPrevis(scene).sequence, [scene]);
    const segments = useMemo(() => directorCardSegments(sequence), [sequence]);
    const totalFrames = useMemo(() => getPrevisTotalFrames(sequence), [sequence]);
    const initialFrame = useMemo(() => resolvePrevisSegmentBoundaries(sequence).sequence.segments.find((segment) => shotId && (segment.shotId === shotId || segment.legacyShotId === shotId))?.startFrame ?? 0, [sequence, shotId]);
    const playStartedAt = useRef(0);
    const playStartedFrame = useRef(initialFrame);
    const currentFrame = useRef(initialFrame);
    const drag = useRef({ x: 0, active: false, moved: false });
    const [visible, setVisible] = useState(false);
    const [active, setActive] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [frame, setFrame] = useState(initialFrame);
    const [loop, setLoop] = useState(false);
    const [realTime, setRealTime] = useState(false);
    const [videoCycle, setVideoCycle] = useState(0);
    const [startedVideo, setStartedVideo] = useState<{ url: string; cycle: number }>();
    const [failed, setFailed] = useState<string>();
    const [media, setMedia] = useState({ url: fallback, fallback, storageKey, fingerprint: cacheFingerprint });
    const url = media.fingerprint === cacheFingerprint && media.fallback === fallback && media.storageKey === storageKey ? media.url : undefined;
    useEffect(() => {
        let cancelled = false;
        if (visible)
            void resolveMediaUrl(storageKey, fallback)
                .then((value) => {
                    if (!cancelled) {
                        // 缓存地址迟到时不能从视频首帧替换已经前进的实时画面。
                        if (videoKind === "previs" && currentFrame.current !== initialFrame && !video.current?.readyState) setRealTime(true);
                        setMedia({ url: value, fallback, storageKey, fingerprint: cacheFingerprint });
                    }
                })
                .catch(() => {
                    if (!cancelled) setMedia({ url: undefined, fallback, storageKey, fingerprint: cacheFingerprint });
                });
        return () => {
            cancelled = true;
        };
    }, [storageKey, fallback, cacheFingerprint, visible, initialFrame, videoKind]);
    const snapshot = useMemo(() => evaluatePrevisFrame(scene, sequence, frame), [scene, sequence, frame]);
    const frozenPlan = useMemo(() => {
        if (!plan) return null;
        const legacyShotId = findPrevisSegmentAtFrame(sequence, frame)?.legacyShotId;
        const legacyShot = scene.shots.find((shot) => shot.id === legacyShotId);
        // 平面标注仍需原始路线；人物采样使用与快照相同的动画时间。
        if (legacyShot) return directorSceneForShot({ ...scene, ...legacyShot.stage }, legacyShot.id);
        return { ...buildFrozenSceneFromSnapshot(scene, snapshot), objects: scene.objects };
    }, [plan, scene, sequence, frame, snapshot]);
    const segment = findPrevisSegmentAtFrame(sequence, frame);
    const validCache = useMemo(() => !scene.previs && shotId && cacheFingerprint === directorPrevisFingerprint(scene, shotId), [scene, shotId, cacheFingerprint]);
    const validSequenceCache = useMemo(() => scene.previs && cacheFingerprint === computePrevisSequenceFingerprint(scene), [scene, cacheFingerprint]);
    const useVideo = !plan && !realTime && Boolean(url && url !== failed && (videoKind === "final" || (scene.previs ? validSequenceCache : validCache && segment?.legacyShotId === shotId)));
    const updateFrame = (next: number) => {
        if (next === currentFrame.current) return;
        currentFrame.current = next;
        setFrame(next);
    };
    useEffect(() => {
        const notify = () => {
            setActive(owner === id);
            if (owner !== id) setPlaying(false);
        };
        listeners.add(notify);
        notify();
        return () => {
            listeners.delete(notify);
            if (owner === id) claim(null);
        };
    }, [id]);
    useEffect(() => {
        const element = root.current;
        if (!element) return;
        let intersecting = false;
        const check = () => setVisible(intersecting && element.getBoundingClientRect().width >= 80 && document.visibilityState === "visible");
        const observer = new IntersectionObserver(([entry]) => {
            intersecting = entry.isIntersecting;
            check();
        });
        observer.observe(element);
        const resize = new ResizeObserver(check);
        resize.observe(element);
        document.addEventListener("visibilitychange", check);
        return () => {
            observer.disconnect();
            resize.disconnect();
            document.removeEventListener("visibilitychange", check);
        };
    }, []);
    useEffect(() => {
        currentFrame.current = initialFrame;
        setFrame(initialFrame);
        setPlaying(false);
        setRealTime(false);
        setVideoCycle((value) => value + 1);
    }, [sequence, initialFrame]);
    useEffect(() => setPlaying(false), [compact]);
    useEffect(() => {
        if (!visible) {
            setPlaying(false);
            if (videoKind === "previs" && currentFrame.current !== initialFrame) setRealTime(true);
        }
        if (plan) setRealTime(true);
    }, [visible, plan, initialFrame, videoKind]);
    const running = visible && active && playing;
    useEffect(() => {
        const element = video.current;
        if (!useVideo || !element) return;
        let current = true;
        if (running && url) {
            void element.play().then(
                () => {
                    if (current) setStartedVideo({ url, cycle: videoCycle });
                },
                () => {
                    if (current) setPlaying(false);
                },
            );
        } else {
            element.pause();
            setStartedVideo(undefined);
        }
        return () => {
            current = false;
            element.pause();
        };
    }, [running, useVideo, url, videoCycle]);
    // Do not consume the shot or recreate its looping video while the decoder is starting.
    const advancing = running && (!useVideo || (startedVideo?.url === url && startedVideo?.cycle === videoCycle));
    useEffect(() => {
        if (!advancing) return;
        let request = 0;
        let cycle = 0;
        playStartedAt.current = performance.now();
        playStartedFrame.current = currentFrame.current;
        const tick = (now: number) => {
            if (!root.current || root.current.getBoundingClientRect().width < 80 || document.hidden) {
                setPlaying(false);
                return;
            }
            const unwrapped = frameAtElapsed({ startFrame: playStartedFrame.current, elapsedMs: now - playStartedAt.current, fps: sequence.fps, rate: 1 });
            const next = resolvePlaybackFrame(unwrapped, totalFrames, loop);
            const nextCycle = loop && totalFrames > 0 ? Math.floor(unwrapped / totalFrames) : 0;
            if (nextCycle !== cycle) {
                cycle = nextCycle;
                setVideoCycle((value) => value + 1);
            }
            updateFrame(next.frame);
            if (next.ended) setPlaying(false);
            else request = requestAnimationFrame(tick);
        };
        request = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(request);
    }, [advancing, sequence.fps, totalFrames, loop]);
    const togglePlayback = () => {
        if (playing && active) {
            if (advancing) updateFrame(resolvePlaybackFrame(frameAtElapsed({ startFrame: playStartedFrame.current, elapsedMs: performance.now() - playStartedAt.current, fps: sequence.fps, rate: 1 }), totalFrames, loop).frame);
            setPlaying(false);
        } else if (totalFrames > 0) {
            if (currentFrame.current === totalFrames - 1) {
                updateFrame(0);
                setVideoCycle((value) => value + 1);
            }
            claim(id);
            setPlaying(true);
        }
    };
    const seek = (next: number) => {
        const state = directorCardSeekState(sequence, next);
        setPlaying(state.playing);
        setRealTime(true);
        updateFrame(state.frame);
    };
    return (
        <div
            ref={root}
            className="director-card-player"
            tabIndex={0}
            data-director-time={snapshot.time.toFixed(3)}
            data-director-frame={frame}
            onKeyDown={(event) => {
                if (!shouldHandlePlayerKey(event, event.currentTarget.contains(document.activeElement))) return;
                event.preventDefault();
                event.stopPropagation();
                if (event.key === " ") togglePlayback();
                else seek(stepPrevisFrame(currentFrame.current, event.key === "ArrowLeft" ? -1 : 1, totalFrames));
            }}
            onPointerDown={(event) => {
                event.stopPropagation();
                if (!(event.target as HTMLElement).closest("button, input, textarea, select, [contenteditable]")) event.currentTarget.focus({ preventScroll: true });
            }}
            onPointerMove={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
            onWheel={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            data-canvas-no-zoom
        >
            <div
                className="director-node-preview"
                data-director-thumbnail
                onClick={(event) => {
                    if (!(event.target as HTMLElement).closest("button")) togglePlayback();
                }}
            >
                {preview ??
                    (plan && frozenPlan ? (
                        <div className="director-card-render">
                            {visible && (
                                <Suspense fallback={null}>
                                    <DirectorPlanViewport scene={frozenPlan} shotId={frozenPlan.activeShotId} time={snapshot.animationTime} playing={running} />
                                </Suspense>
                            )}
                        </div>
                    ) : useVideo ? (
                        <video
                            key={`${url}:${videoCycle}`}
                            ref={video}
                            src={visible ? url : undefined}
                            preload="metadata"
                            muted
                            playsInline
                            onEnded={() => {
                                if (videoKind === "final" && !loop) setPlaying(false);
                            }}
                            onError={() => setFailed(url)}
                        />
                    ) : visible ? (
                        <Suspense
                            fallback={
                                <div className="director-card-render">
                                    <span className="director-card-loading">{t("canvasExtra.directorNP.preparingScene")}</span>
                                </div>
                            }
                        >
                            <DirectorCardRender key={theme} scene={scene} snapshot={snapshot} playing={running} />
                        </Suspense>
                    ) : (
                        <div className="director-card-render" aria-hidden="true" />
                    ))}
                {compact && (
                    <button type="button" className="director-card-compact-play" aria-label={t(playing && active ? "directorD4.pause" : "directorD4.play")} disabled={totalFrames === 0} onClick={togglePlayback}>
                        {playing && active ? <Pause size={20} /> : <Play size={20} />}
                    </button>
                )}
            </div>
            {!compact && (
                <>
                    <div
                        className="director-card-timeline"
                        role="slider"
                        tabIndex={0}
                        aria-label={t("directorNode.timeline")}
                        aria-valuemin={0}
                        aria-valuemax={Math.max(0, totalFrames - 1)}
                        aria-valuenow={frame}
                        aria-valuetext={t("directorD4.frameCount", { frame: totalFrames ? frame + 1 : 0, total: totalFrames })}
                        onPointerDown={(event) => {
                            if (event.button !== 0) return;
                            drag.current = { x: event.clientX, active: true, moved: false };
                            (event.target as HTMLElement).closest<HTMLElement>("button, .director-card-timeline")?.setPointerCapture(event.pointerId);
                        }}
                        onPointerMove={(event) => {
                            if (!drag.current.active) return;
                            if (Math.abs(event.clientX - drag.current.x) > 3) drag.current.moved = true;
                            if (!drag.current.moved) return;
                            const bounds = event.currentTarget.getBoundingClientRect();
                            if (bounds.width) seek(((event.clientX - bounds.left) / bounds.width) * totalFrames);
                        }}
                        onPointerUp={() => {
                            drag.current.active = false;
                        }}
                        onPointerCancel={() => {
                            drag.current.active = false;
                            drag.current.moved = true;
                        }}
                        onClickCapture={(event) => {
                            if (drag.current.moved && event.detail !== 0) {
                                event.preventDefault();
                                event.stopPropagation();
                            }
                        }}
                        onKeyDown={(event) => {
                            if (event.key !== "Home" && event.key !== "End") return;
                            event.preventDefault();
                            event.stopPropagation();
                            seek(event.key === "Home" ? 0 : totalFrames - 1);
                        }}
                    >
                        <DirectorCardSegmentStrip segments={segments} frame={frame} onSeek={seek} />
                        <span className="director-card-playhead" aria-hidden style={{ left: `${totalFrames ? (frame / totalFrames) * 100 : 0}%` }} />
                    </div>
                    <div className="director-playback-controls">
                        <button type="button" aria-label={t(playing && active ? "directorD4.pause" : "directorD4.play")} disabled={totalFrames === 0} onClick={togglePlayback}>
                            {playing && active ? <Pause size={13} /> : <Play size={13} />}
                        </button>
                        <button type="button" aria-label={t("directorD4.previousFrame")} disabled={frame <= 0} onClick={() => seek(stepPrevisFrame(currentFrame.current, -1, totalFrames))}>
                            <StepBack size={13} />
                        </button>
                        <button type="button" aria-label={t("directorD4.nextFrame")} disabled={frame >= totalFrames - 1} onClick={() => seek(stepPrevisFrame(currentFrame.current, 1, totalFrames))}>
                            <StepForward size={13} />
                        </button>
                        <span className="director-card-frame-count">{t("directorD4.frameCount", { frame: totalFrames ? frame + 1 : 0, total: totalFrames })}</span>
                        <button type="button" aria-label={t("directorD4.loop")} aria-pressed={loop} onClick={() => setLoop(!loop)}>
                            <Repeat2 size={13} />
                        </button>
                        {status && <span className="director-card-status">{status}</span>}
                        {onEdit && (
                            <button
                                type="button"
                                className="director-node-open"
                                data-director-open
                                disabled={editDisabled || !totalFrames}
                                title={editTitle}
                                onClick={() => {
                                    const target = directorCardEditTarget(scene, sequence, currentFrame.current);
                                    if (target) {
                                        setPlaying(false);
                                        onEdit(target);
                                    }
                                }}
                            >
                                {t("directorNode.openStudio")}
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

export function DirectorCardSegmentStrip({ segments, frame, onSeek }: { segments: ReturnType<typeof directorCardSegments>; frame: number; onSeek: (frame: number) => void }) {
    return segments.map((segment, index) => (
        <button
            key={segment.id}
            type="button"
            className="director-card-segment"
            style={{ width: `${segment.widthPercent}%` }}
            aria-pressed={segment.startFrame <= frame && frame < segment.endFrameExclusive}
            onClick={() => onSeek(segment.startFrame)}
            title={`${segment.startTime}–${segment.endTime} s`}
        >
            <b>{String(index + 1).padStart(2, "0")}</b>
            <span>
                {segment.startTime}–{segment.endTime} s
            </span>
        </button>
    ));
}
