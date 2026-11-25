import { useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import { Camera, Film, UserRound } from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";
import type { DirectorScene } from "@/types/director";
import type { MessageKey } from "@/i18n/messages";
import { directorActorSegments } from "@/lib/canvas/director/director-timeline";
import { getPrevisTotalFrames } from "@/lib/canvas/director/director-previs-sequence";
import { directorWorkbenchSegments, directorWorkbenchSequence } from "@/lib/canvas/director/director-workbench-layout";
import { DirectorFrameControls } from "./director-frame-controls";
import DirectorCardRender from "./director-card-render";
import { DirectorSequencer } from "./director-sequencer";

type DirectorWorkbenchTimelineProps = ComponentProps<typeof DirectorSequencer> & {
    timeline: boolean;
    globalFrame: number;
    playing: boolean;
    loopPlayback: boolean;
    onPlayToggle: () => void;
    onGlobalFrameChange: (frame: number) => void;
    onLoopPlaybackChange: (loop: boolean) => void;
};

/** A small first-frame still per shot. The export queue shares one temporary renderer across shots. */
function ShotPoster({ scene, shotId, frame }: { scene: DirectorScene; shotId?: string; frame: number }) {
    const latest = useRef(scene);
    latest.current = scene;
    const [url, setUrl] = useState("");
    useEffect(() => {
        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            try {
                const { captureDirectorPrevisFrames } = await import("./director-background-recorder");
                const [image] = await captureDirectorPrevisFrames(latest.current, [frame], { shotId, maxDimension: 144, signal: controller.signal });
                if (controller.signal.aborted) return;
                setUrl(URL.createObjectURL(image));
            } catch {
                // The shot label and seek button remain available while WebGL is unavailable.
            }
        }, 350);
        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [scene.id, scene.updatedAt, shotId, frame]);
    // Editing the scene restarts capture while the previous poster stays on screen.
    // Keep its URL alive until React actually replaces or removes the image.
    useEffect(
        () => () => {
            if (url) URL.revokeObjectURL(url);
        },
        [url],
    );
    return url ? <img className="director-shot-poster" src={url} alt="" /> : null;
}

export function DirectorWorkbenchTimeline({ timeline, globalFrame, playing, loopPlayback, onPlayToggle, onGlobalFrameChange, onLoopPlaybackChange, ...props }: DirectorWorkbenchTimelineProps) {
    const { t } = useI18n();
    const { scene, shot } = props;
    const [settingsSlot, setSettingsSlot] = useState<HTMLDivElement | null>(null);
    const [editTools, setEditTools] = useState(false);
    const segments = useMemo(() => directorWorkbenchSegments(scene), [scene]);
    const sequence = useMemo(() => directorWorkbenchSequence(scene), [scene]);
    const totalFrames = getPrevisTotalFrames(sequence);
    return (
        <footer className="director-workbench-timeline" data-director-timeline data-edit-tools={editTools || undefined}>
            <div className="director-workbench-segments" aria-label={t("creationStoryboard.list")}>
                <span className="director-shot-strip-label">
                    {t("directorNode.shotArrangement")}
                    <button type="button" aria-label={t("scriptEditor.add")} onClick={props.onAddShot}>
                        ＋
                    </button>
                </span>
                {segments.map((segment, index) => (
                    <button
                        key={segment.id}
                        type="button"
                        className="director-workbench-segment"
                        style={{ flexGrow: segment.frames, flexBasis: 0 }}
                        aria-pressed={globalFrame >= segment.startFrame && globalFrame < segment.endFrameExclusive}
                        title={segment.name ?? `${index + 1}`}
                        onClick={() => onGlobalFrameChange(segment.startFrame)}
                    >
                        <ShotPoster scene={scene} shotId={segment.shotId} frame={scene.previs ? segment.startFrame : 0} />
                        <strong>
                            {String(index + 1).padStart(2, "0")} {segment.name ?? t("previs.timeline.shot")}
                        </strong>
                        <small>
                            {segment.startFrame / segment.fps} – {segment.endFrameExclusive / segment.fps}s
                        </small>
                    </button>
                ))}
            </div>
            <div className="director-workbench-timeline-detail thin-scrollbar">
                {timeline ? <DirectorSequencer {...props} settingsSlot={settingsSlot} /> : <DirectorWorkbenchOverview scene={scene} shot={shot} time={props.playhead} onSeek={props.onPlayheadChange} />}
            </div>
            <DirectorFrameControls
                settingsRef={timeline && props.visible ? setSettingsSlot : undefined}
                onToggleTools={timeline && props.visible ? () => setEditTools(!editTools) : undefined}
                toolsOpen={editTools}
                showTimecode
                frame={globalFrame}
                totalFrames={totalFrames}
                fps={sequence.fps}
                playing={playing}
                loop={loopPlayback}
                segments={segments}
                onPlay={onPlayToggle}
                onSeek={onGlobalFrameChange}
                onLoop={onLoopPlaybackChange}
            />
        </footer>
    );
}

/** 概览轨道只提供段内定位，播放与进度统一由全局传输条负责。 */
function DirectorWorkbenchOverview({ scene, shot, time, onSeek }: Pick<ComponentProps<typeof DirectorSequencer>, "scene" | "shot"> & { time: number; onSeek: (time: number) => void }) {
    const { t } = useI18n();
    const actors = scene.objects.filter((object) => object.kind === "actor" && object.visible);
    const samples = useMemo(() => Array.from({ length: 6 }, (_, index) => (index * shot.duration) / 5), [shot.duration]);
    const moves: Record<string, string> = {
        push_in: "movePushIn",
        pull_out: "movePullOut",
        static: "moveStatic",
        pan_left: "movePanLeft",
        pan_right: "movePanRight",
        orbit_left: "moveOrbitLeft",
        orbit_right: "moveOrbitRight",
        tilt_up: "moveTiltUp",
        tilt_down: "moveTiltDown",
        handheld: "moveHandheld",
    };
    const move = moves[shot.cameraMove] ? t(`canvasExtra.directorWB.${moves[shot.cameraMove]}` as MessageKey) : t(`directorR3.${shot.cameraMove}` as MessageKey);
    return (
        <section className="director-overview-timeline" data-director-overview>
            <header>
                <span>
                    {time.toFixed(1)} / {shot.duration.toFixed(1)}s
                </span>
            </header>
            <div className="director-overview-tracks">
                <div className="director-overview-ruler">
                    <span />
                    <div>
                        {samples.map((seconds) => (
                            <small key={seconds} style={{ left: `${(seconds / shot.duration) * 100}%` }}>
                                {seconds.toFixed(1)}s
                            </small>
                        ))}
                    </div>
                </div>
                <div className="director-overview-row">
                    <span>
                        <Camera size={12} />
                        {t("canvasExtra.directorWB.camera")}
                    </span>
                    <div>
                        <button className="director-overview-segment is-camera" style={{ left: 0, width: "100%" }} onClick={() => onSeek(0)}>
                            {move}
                        </button>
                    </div>
                </div>
                {actors.map((actor, index) => (
                    <div key={actor.id} className="director-overview-row" data-director-actor-track={actor.id}>
                        <span>
                            <UserRound size={12} />
                            {String.fromCharCode(65 + index)} · {actor.name}
                        </span>
                        <div>
                            {directorActorSegments(actor, shot.duration).map((segment) => (
                                <button
                                    key={segment.start}
                                    className={`director-overview-segment ${segment.moving ? "is-moving" : ""}`}
                                    style={{ left: `${(segment.start / shot.duration) * 100}%`, width: `${((segment.end - segment.start) / shot.duration) * 100}%` }}
                                    onClick={() => onSeek(segment.start)}
                                >
                                    {t(segment.moving ? (actor.pose === "run" ? "canvasExtra.directorWB.poseRun" : "canvasExtra.directorWB.poseWalk") : actor.boneTracks?.length ? "directorR4.action" : "directorR4.stop")}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
                <div className="director-overview-row director-overview-film">
                    <span>
                        <Film size={12} />
                        {t("directorR4.scene")}
                    </span>
                    <div>
                        {samples.map((seconds) => (
                            <button key={seconds} onClick={() => onSeek(seconds)} aria-label={`${t("directorR4.playhead")} ${seconds.toFixed(1)}s`}>
                                <DirectorCardRender scene={scene} shotId={shot.id} time={seconds} playing={false} />
                            </button>
                        ))}
                    </div>
                </div>
                <div className="director-overview-playhead" style={{ left: `calc(112px + (100% - 112px) * ${Math.min(1, time / shot.duration)})` }} />
            </div>
        </section>
    );
}
