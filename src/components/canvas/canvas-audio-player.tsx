import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AlertCircle, LoaderCircle, Pause, Play } from "lucide-react";

import { useI18n } from "@/i18n/use-i18n";
import type { MessageKey } from "@/i18n/messages";
import type { CanvasTheme } from "@/lib/canvas-theme";
import { useCanvasNodeActions } from "./canvas-node-action-context";
import { getCanvasAudioPlaybackSnapshot, seekCanvasAudio, stopCanvasAudio, subscribeCanvasAudioNode, toggleCanvasAudio } from "@/services/canvas-audio-playback";
import type { CanvasNodeData } from "@/types/canvas";
import { AUDIO_WAVEFORM_BARS, loadAudioWaveform } from "@/lib/canvas/canvas-audio-waveform";
import { useAudioSampleRate } from "@/hooks/use-audio-sample-rate";

type CanvasAudioPlayerProps = {
    node: CanvasNodeData;
    theme: CanvasTheme;
};
const emptyWaveform = Array<number>(AUDIO_WAVEFORM_BARS).fill(0);

export function CanvasAudioPlayer({ node, theme }: CanvasAudioPlayerProps) {
    const { t, number } = useI18n();
    const { updateMetadata } = useCanvasNodeActions();
    const subscribe = useCallback((listener: () => void) => subscribeCanvasAudioNode(node.id, listener), [node.id]);
    const getSnapshot = useCallback(() => getCanvasAudioPlaybackSnapshot(node.id), [node.id]);
    const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    const source = useMemo(
        () => ({
            nodeId: node.id,
            content: node.metadata?.content || "",
            storageKey: node.metadata?.storageKey,
            mimeType: node.metadata?.mimeType,
            durationMs: node.metadata?.durationMs,
        }),
        [node.id, node.metadata?.content, node.metadata?.durationMs, node.metadata?.mimeType, node.metadata?.storageKey],
    );
    const sourceKey = source.storageKey || source.content;
    const playbackSourceRef = useRef(sourceKey);
    const sourceChanged = playbackSourceRef.current !== sourceKey;
    const sampleRate = useAudioSampleRate(source.storageKey, source.content);
    const [decoded, setDecoded] = useState<{ key: string; peaks: number[] } | null>(null);
    const savedWaveform = node.metadata?.waveformVersion === 2 && node.metadata.waveform?.length ? node.metadata.waveform : undefined;
    const waveform = savedWaveform ?? (decoded?.key === sourceKey ? decoded.peaks : emptyWaveform);
    useEffect(() => {
        if (!sourceKey || savedWaveform) return;
        let cancelled = false;
        void loadAudioWaveform(source)
            .then((peaks) => {
                if (cancelled || !peaks.length) return;
                setDecoded({ key: sourceKey, peaks });
                updateMetadata?.(node.id, { waveform: peaks, waveformVersion: 2 });
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [sourceKey, source, node.id, savedWaveform, updateMetadata]);
    const syncedDurationRef = useRef(0);
    const durationMs = (!sourceChanged && snapshot.phase !== "idle" ? snapshot.durationMs : 0) || node.metadata?.durationMs || 0;
    const progress = durationMs > 0 ? Math.min(1, Math.max(0, snapshot.currentTimeMs / durationMs)) : 0;

    useEffect(() => {
        if (sourceChanged || snapshot.phase === "idle" || !snapshot.durationMs || snapshot.durationMs === node.metadata?.durationMs || syncedDurationRef.current === snapshot.durationMs) return;
        syncedDurationRef.current = snapshot.durationMs;
        updateMetadata?.(node.id, { durationMs: snapshot.durationMs });
    }, [node.id, node.metadata?.durationMs, snapshot.durationMs, snapshot.phase, sourceChanged, updateMetadata]);

    useEffect(() => {
        playbackSourceRef.current = sourceKey;
        syncedDurationRef.current = 0;
        return () => stopCanvasAudio(node.id);
    }, [node.id, sourceKey]);

    const stopCanvasEvent = (event: React.SyntheticEvent) => event.stopPropagation();
    const togglePlayback = () => {
        void toggleCanvasAudio(source);
    };
    const seek = (event: React.ChangeEvent<HTMLInputElement>) => {
        seekCanvasAudio(node.id, Number(event.target.value), source);
    };
    const label = node.title || t("canvasExtra.player.audio");
    const isPlaying = snapshot.phase === "playing";
    const isLoading = snapshot.phase === "loading";
    const isError = snapshot.phase === "error";

    return (
        <div role="group" aria-label={t("canvasRuntime.audio.control", { label })} className="flex h-full w-full min-w-0 flex-col justify-center gap-2.5 px-4" style={{ color: theme.node.text }}>
            <div className="flex min-w-0 items-center gap-3">
                <button
                    type="button"
                    aria-label={isPlaying ? t("canvasRuntime.audio.pause", { label }) : t("canvasRuntime.audio.play", { label })}
                    className="grid size-10 shrink-0 place-items-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-45"
                    style={{ borderColor: `${theme.node.activeStroke}80`, background: `${theme.node.activeStroke}18`, color: theme.node.activeStroke }}
                    disabled={isLoading || (!source.content && !source.storageKey)}
                    onPointerDown={stopCanvasEvent}
                    onMouseDown={stopCanvasEvent}
                    onClick={(event) => {
                        event.stopPropagation();
                        togglePlayback();
                    }}
                >
                    {isLoading ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : isPlaying ? <Pause className="size-4" aria-hidden="true" /> : <Play className="ml-0.5 size-4" aria-hidden="true" />}
                </button>
                <div className="relative min-w-0 flex-1">
                    <div className="relative mb-1 flex items-center gap-2 text-[var(--fs-label)] tabular-nums" style={{ color: theme.node.muted }}>
                        <span>
                            {formatAudioTime(snapshot.currentTimeMs)}/{durationMs ? formatAudioTime(durationMs) : "--:--"}
                        </span>
                        {sampleRate ? <span>{number(sampleRate / 1000)} kHz</span> : null}
                    </div>
                    <input
                        type="range"
                        min={0}
                        max={Math.max(1, durationMs)}
                        step={1}
                        value={Math.min(Math.max(0, snapshot.currentTimeMs), Math.max(1, durationMs))}
                        aria-label={t("canvasRuntime.audio.progress", { label })}
                        className="h-3 w-full cursor-pointer accent-[var(--canvas-accent)]"
                        style={{ accentColor: theme.node.activeStroke }}
                        disabled={!durationMs || isError}
                        onPointerDown={stopCanvasEvent}
                        onMouseDown={stopCanvasEvent}
                        onClick={stopCanvasEvent}
                        onWheel={stopCanvasEvent}
                        onChange={seek}
                    />
                </div>
            </div>

            <div className="flex h-8 min-w-0 items-center gap-1 overflow-hidden" aria-hidden="true">
                {waveform.map((height, index) => (
                    <span
                        key={`${node.id}-${index}`}
                        className="min-w-0 flex-1 rounded-full transition-opacity duration-150"
                        style={{ height: `${Math.max(2, Math.round(height * 100))}%`, background: theme.node.activeStroke, opacity: index / waveform.length <= progress ? 0.9 : 0.22 }}
                    />
                ))}
            </div>

            {isError ? (
                <div role="status" className="flex min-w-0 items-center gap-1.5 truncate text-[var(--fs-tiny)]" style={{ color: theme.accent.danger || theme.node.muted }}>
                    <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{snapshot.errorCode ? t(`canvasExtra.audio.${snapshot.errorCode}` as MessageKey) : snapshot.error || t("canvasRuntime.audio.failed")}</span>
                </div>
            ) : null}
        </div>
    );
}

function formatAudioTime(timeMs: number) {
    const totalSeconds = Math.max(0, Math.floor(timeMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
