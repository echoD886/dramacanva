import { useRef, useState } from "react";
import { useI18n } from "@/i18n/use-i18n";

/** Result is the playback clock; the reference follows its transport and seek events. */
export function VideoComparison({ original, result, poster }: { original: string; result: string; poster?: string }) {
    const { t } = useI18n();
    const originalRef = useRef<HTMLVideoElement>(null);
    const resultRef = useRef<HTMLVideoElement>(null);
    const [single, setSingle] = useState(false);
    const [originalSound, setOriginalSound] = useState(false);
    const [reveal, setReveal] = useState(50);
    const sync = (force = false) => {
        const source = resultRef.current;
        const target = originalRef.current;
        if (!source || !target || !target.readyState) return;
        if (force || Math.abs(target.currentTime - source.currentTime) > 0.15) target.currentTime = source.currentTime;
    };
    return (
        <div className={`aivt-comparison${single ? " is-single" : ""}`}>
            <div className="aivt-comparison-toolbar">
                <button type="button" className="aivt-btn-quiet" aria-pressed={single} onClick={() => setSingle(!single)}>
                    {t("aiVideoTemplates.onlyResult")}
                </button>
                <button type="button" className="aivt-btn-quiet" aria-pressed={originalSound} onClick={() => setOriginalSound(!originalSound)}>
                    {t("aiVideoTemplates.originalSound")}
                </button>
            </div>
            <div className="aivt-comparison-pair" style={{ "--aivt-reveal": `${reveal}%` } as React.CSSProperties}>
                <div className="aivt-comparison-original">
                    <span>{t("aiVideoTemplates.originalVideo")}</span>
                    <video ref={originalRef} className="aivt-player-video" src={original} poster={poster} muted={!originalSound} loop playsInline preload="metadata" onLoadedMetadata={() => sync(true)} />
                </div>
                <div className="aivt-comparison-result">
                    <span>{t("aiVideoTemplates.aiVersion")}</span>
                    <video
                        key={result}
                        ref={resultRef}
                        className="aivt-player-video"
                        src={result}
                        controls
                        playsInline
                        muted
                        autoPlay
                        loop
                        preload="metadata"
                        onPlay={() => {
                            sync(true);
                            originalRef.current?.play().catch(() => undefined);
                        }}
                        onPause={() => originalRef.current?.pause()}
                        onSeeking={() => sync(true)}
                        onTimeUpdate={() => sync()}
                        onEnded={() => originalRef.current?.pause()}
                    />
                </div>
            </div>
            {!single && (
                <label className="aivt-comparison-slider">
                    {t("aiVideoTemplates.compareReveal")}
                    <input type="range" min="0" max="100" value={reveal} onChange={(e) => setReveal(Number(e.target.value))} />
                </label>
            )}
        </div>
    );
}
