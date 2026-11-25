import { Film, Pause, Play, Repeat2, StepBack, StepForward } from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";
import { resolvePlaybackFrame, stepPrevisFrame } from "@/lib/canvas/director/director-previs-clock";
import type { PrevisCameraSegment } from "@/types/director";

type DirectorFrameControlsProps = {
    frame: number;
    totalFrames: number;
    fps: number;
    playing: boolean;
    loop: boolean;
    settingsRef?: (node: HTMLDivElement | null) => void;
    showTimecode?: boolean;
    toolsOpen?: boolean;
    onToggleTools?: () => void;
    segments?: Pick<PrevisCameraSegment, "id" | "startFrame" | "endFrameExclusive">[];
    onPlay: () => void;
    onSeek: (frame: number) => void;
    onLoop: (loop: boolean) => void;
};

function timecode(frame: number, fps: number) {
    const seconds = frame / fps;
    return `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(2).padStart(5, "0")}`;
}

export function DirectorFrameControls({ frame, totalFrames, fps, playing, loop, showTimecode = false, settingsRef, toolsOpen, onToggleTools, segments = [], onPlay, onSeek, onLoop }: DirectorFrameControlsProps) {
    const { t } = useI18n();
    const currentFrame = resolvePlaybackFrame(frame, totalFrames, false).frame;
    return (
        <div className="director-workbench-player" data-director-frame={currentFrame}>
            <div className="director-workbench-player-track">
                <div className="director-workbench-player-segments" aria-hidden="true">
                    {segments.map((segment) => (
                        <i key={segment.id} data-director-frame-segment={segment.id} style={{ flexGrow: Math.max(0, segment.endFrameExclusive - segment.startFrame), flexBasis: 0 }} />
                    ))}
                </div>
                <input
                    type="range"
                    min={0}
                    max={Math.max(0, totalFrames - 1)}
                    step={1}
                    value={currentFrame}
                    disabled={totalFrames === 0}
                    aria-label={t("previs.timeline.seek")}
                    onPointerDown={() => onSeek(currentFrame)}
                    onChange={(event) => onSeek(Number(event.target.value))}
                />
            </div>
            <div className="director-workbench-player-controls">
                {showTimecode && onToggleTools && (
                    <button type="button" className="director-transport-title" aria-expanded={toolsOpen} onClick={onToggleTools}>
                        <Film size={14} />
                        {t("directorNode.timelineTitle")} ⌄
                    </button>
                )}
                {showTimecode && !onToggleTools && (
                    <strong className="director-transport-title">
                        <Film size={14} />
                        {t("directorNode.timelineTitle")}
                    </strong>
                )}
                <button type="button" aria-label={t("directorD4.previousFrame")} disabled={currentFrame <= 0} onClick={() => onSeek(stepPrevisFrame(currentFrame, -1, totalFrames))}>
                    <StepBack size={16} />
                </button>
                <button type="button" data-testid="director-workbench-playback" aria-label={t(playing ? "directorD4.pause" : "directorD4.play")} disabled={totalFrames === 0} onClick={onPlay}>
                    {playing ? <Pause size={18} /> : <Play size={18} />}
                </button>
                <button type="button" aria-label={t("directorD4.nextFrame")} disabled={currentFrame >= totalFrames - 1} onClick={() => onSeek(stepPrevisFrame(currentFrame, 1, totalFrames))}>
                    <StepForward size={16} />
                </button>
                <span title={t("directorD4.frameCount", { frame: totalFrames ? currentFrame + 1 : 0, total: totalFrames })}>
                    {showTimecode ? `${timecode(currentFrame, fps)} · ${currentFrame}f / ${timecode(totalFrames, fps)}` : t("directorD4.frameCount", { frame: totalFrames ? currentFrame + 1 : 0, total: totalFrames })}
                    {!settingsRef && ` · ${fps}fps`}
                </span>
                <button type="button" aria-label={t("directorD4.loop")} aria-pressed={loop} onClick={() => onLoop(!loop)}>
                    <Repeat2 size={16} />
                </button>
            </div>
            {settingsRef && (
                <div className="director-transport-settings" ref={settingsRef}>
                    <span>
                        {fps}fps · {Number((totalFrames / fps).toFixed(2))} s
                    </span>
                </div>
            )}
        </div>
    );
}
