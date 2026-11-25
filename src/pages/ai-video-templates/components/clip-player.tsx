import { useState, useRef, useEffect, memo } from "react";
import { Link } from "react-router";
import { Volume2, VolumeX, Download, RefreshCw, FolderOpen, Bookmark, Check, AlertCircle, Loader2, CreditCard } from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";
import type { AIVideoTemplateClip } from "@/types/ai-video-template";
import { isGenerationWorking, type GenerationPhase, type GenerationErrorState } from "./generation-types";
import { formatClipLength, formatTemplateDate, sortTemplateClips } from "../utils";
import { ClipThumbnail } from "./clip-thumbnail";
import { VideoComparison } from "./video-comparison";

type ClipPlayerProps = {
    clips: AIVideoTemplateClip[];
    activeClip: AIVideoTemplateClip;
    onSelectClip: (clip: AIVideoTemplateClip) => void;
    resultVideoUrl?: string | null;
    generationPhase?: GenerationPhase;
    generationProgress?: number;
    generationError?: GenerationErrorState | null;
    onMakeAgain?: () => void;
    onRetry?: () => void;
    onSaveToLibrary?: () => void;
    isSaved?: boolean;
    templateTitle?: string;
};

export const ClipPlayer = memo(function ClipPlayer({
    clips,
    activeClip,
    onSelectClip,
    resultVideoUrl,
    generationPhase = "idle",
    generationProgress = 0,
    generationError,
    onMakeAgain,
    onRetry,
    onSaveToLibrary,
    isSaved = false,
    templateTitle = "video",
}: ClipPlayerProps) {
    const { t, locale } = useI18n();
    const [clipSort, setClipSort] = useState<"new" | "plays">("plays");
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isMuted, setIsMuted] = useState(true);
    const [view, setView] = useState<"result" | "original">("original");

    const hasResult = Boolean(resultVideoUrl && generationPhase === "done");
    const isWorking = isGenerationWorking(generationPhase);
    const hasError = generationPhase === "failed" && Boolean(generationError);

    useEffect(() => {
        setView(hasResult ? "result" : "original");
    }, [hasResult]);

    const src = hasResult && view === "result" ? resultVideoUrl! : activeClip.fullUrl || activeClip.previewUrl;
    const ratio = activeClip.width > 0 && activeClip.height > 0 ? activeClip.width / activeClip.height : 9 / 16;
    const offRatio = Math.abs(ratio - 9 / 16) > 0.03;

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        video.play().catch(() => undefined);
    }, [src]);

    // The clip strip's covers (often 10+, ~50 KB each) used to download together with the main video and
    // delay its first frame by up to ~1.5 s; they wait until it can play (or 1.2 s at most).
    const [stripReady, setStripReady] = useState(false);
    useEffect(() => {
        if (stripReady) return;
        const video = videoRef.current;
        const ready = () => setStripReady(true);
        const timer = window.setTimeout(ready, 1200);
        if (video && video.readyState >= 3) ready();
        video?.addEventListener("canplay", ready, { once: true });
        return () => {
            window.clearTimeout(timer);
            video?.removeEventListener("canplay", ready);
        };
    }, [stripReady, src]);

    const toggleSound = () => {
        const video = videoRef.current;
        if (!video) return;
        video.muted = !video.muted;
        setIsMuted(video.muted);
        if (!video.muted) video.play().catch(() => undefined);
    };

    const togglePlay = () => {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) video.play().catch(() => undefined);
        else video.pause();
    };

    const downloadName = `${
        templateTitle
            .toLowerCase()
            .replace(/[^a-z0-9]+/gi, "-")
            .replace(/^-|-$/g, "") || "video"
    }-ai.mp4`;

    return (
        <div className="aivt-player">
            {hasResult ? (
                <VideoComparison original={activeClip.fullUrl || activeClip.previewUrl} result={resultVideoUrl!} poster={activeClip.coverUrl} />
            ) : (
                <div className="aivt-player-frame">
                    {offRatio && <img className="aivt-player-fill" src={activeClip.coverUrl} alt="" aria-hidden="true" />}
                    <video key={src} ref={videoRef} className="aivt-player-video" src={src} poster={hasResult && view === "result" ? undefined : activeClip.coverUrl} loop muted={isMuted} autoPlay playsInline preload="metadata" onClick={togglePlay} />

                    <div className="aivt-player-top">
                        <div className="aivt-view-toggle" role={hasResult ? "group" : undefined}>
                            {hasResult && (
                                <button type="button" className={view === "result" ? "is-active" : undefined} aria-pressed={view === "result"} onClick={() => setView("result")}>
                                    {t("aiVideoTemplates.aiVersion")}
                                </button>
                            )}
                            {hasResult ? (
                                <button type="button" className={view === "original" ? "is-active" : undefined} aria-pressed={view === "original"} onClick={() => setView("original")}>
                                    {t("aiVideoTemplates.originalVideo")}
                                </button>
                            ) : (
                                <span className="is-active">{t("aiVideoTemplates.originalVideo")}</span>
                            )}
                        </div>
                        {hasResult && (
                            <a className="aivt-icon-btn" href={resultVideoUrl!} download={downloadName} target="_blank" rel="noopener noreferrer" aria-label={t("aiVideoTemplates.download")} title={t("aiVideoTemplates.download")}>
                                <Download aria-hidden="true" />
                            </a>
                        )}
                    </div>

                    {!isWorking && !hasError && (
                        <button type="button" onClick={toggleSound} className="aivt-sound-pill" aria-label={isMuted ? t("aiVideoTemplates.tapForSound") : t("aiVideoTemplates.soundMuted")}>
                            {isMuted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
                            <span>{isMuted ? t("aiVideoTemplates.tapForSound") : t("aiVideoTemplates.soundMuted")}</span>
                        </button>
                    )}

                    {isWorking && (
                        <div className="aivt-player-overlay" role="status" aria-live="polite">
                            <Loader2 className="aivt-spin" aria-hidden="true" />
                            <p className="aivt-overlay-title">{generationPhase === "uploading" ? t("aiVideoTemplates.uploadingPhotos") : generationPhase === "queued" ? t("aiVideoTemplates.taskQueued") : t("aiVideoTemplates.generating")}</p>
                            <div className="aivt-progress" aria-hidden="true">
                                <span style={{ width: generationProgress > 0 ? `${Math.min(100, generationProgress)}%` : undefined }} className={generationProgress > 0 ? undefined : "is-indeterminate"} />
                            </div>
                            {generationProgress > 0 && <span className="aivt-overlay-note">{generationProgress}%</span>}
                        </div>
                    )}

                    {hasError && generationError && (
                        <div className="aivt-player-overlay" role="alert">
                            <AlertCircle aria-hidden="true" />
                            <p className="aivt-overlay-title">{generationError.title || t("aiVideoTemplates.errorLoad")}</p>
                            <p className="aivt-overlay-note">{generationError.message}</p>
                            <div className="aivt-overlay-actions">
                                {generationError.isInsufficientCredits ? (
                                    <Link to="/pricing?purchase=credits" className="aivt-btn-light">
                                        <CreditCard aria-hidden="true" />
                                        <span>{t("aiVideoTemplates.topUpCredits")}</span>
                                    </Link>
                                ) : generationError.canRetry !== false && onRetry ? (
                                    <button type="button" onClick={onRetry} className="aivt-btn-light">
                                        <RefreshCw aria-hidden="true" />
                                        <span>{t("aiVideoTemplates.retry")}</span>
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {hasResult && (
                <div className="aivt-result-actions">
                    <a className="aivt-btn-quiet" href={resultVideoUrl!} download={downloadName} target="_blank" rel="noopener noreferrer">
                        <Download aria-hidden="true" />
                        {t("aiVideoTemplates.download")}
                    </a>
                    {onMakeAgain && (
                        <button type="button" onClick={onMakeAgain} className="aivt-btn-quiet">
                            <RefreshCw aria-hidden="true" />
                            <span>{t("aiVideoTemplates.makeAgain")}</span>
                        </button>
                    )}
                    <Link to="/assets" className="aivt-btn-quiet">
                        <FolderOpen aria-hidden="true" />
                        <span>{t("aiVideoTemplates.openInWorks")}</span>
                    </Link>
                    {onSaveToLibrary && (
                        <button type="button" onClick={onSaveToLibrary} disabled={isSaved} className="aivt-btn-quiet">
                            {isSaved ? <Check aria-hidden="true" /> : <Bookmark aria-hidden="true" />}
                            <span>{isSaved ? t("aiVideoTemplates.savedToLibrary") : t("aiVideoTemplates.saveToLibrary")}</span>
                        </button>
                    )}
                </div>
            )}

            {clips.length > 1 && (
                <div className="aivt-clips">
                    <div className="aivt-clips-heading">
                        <p className="aivt-clips-label">
                            {t("aiVideoTemplates.referenceClips")} <span>{clips.length}</span>
                        </p>
                        <label className="aivt-sort">
                            <span className="sr-only">{t("aiVideoTemplates.clipSortLabel")}</span>
                            <select value={clipSort} onChange={(e) => setClipSort(e.target.value as "new" | "plays")}>
                                <option value="new">{t("aiVideoTemplates.clipNewest")}</option>
                                <option value="plays">{t("aiVideoTemplates.sortHot")}</option>
                            </select>
                        </label>
                    </div>
                    <div className="aivt-clips-track" data-aivt-hscroll>
                        {sortTemplateClips(clips, clipSort).map((clip, index) => {
                            const active = clip.id === activeClip.id;
                            const length = formatClipLength(clip.durationMs);
                            const label = t("aiVideoTemplates.clipLabel", { index: index + 1 });
                            return (
                                <button key={clip.id} type="button" className={`aivt-clip${active ? " is-active" : ""}`} aria-pressed={active} aria-label={length ? `${label} · ${length}` : label} onClick={() => onSelectClip(clip)}>
                                    <ClipThumbnail clip={clip} deferred={!(stripReady || active)} />
                                    <span>
                                        {length}
                                        {clip.uploadDate && formatTemplateDate(clip.uploadDate, locale) && <time dateTime={clip.uploadDate}>{formatTemplateDate(clip.uploadDate, locale)}</time>}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
});
