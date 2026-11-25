import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ArrowLeft, BadgeCheck, Expand, Heart, Pause, Play, Share2, SlidersHorizontal, Sparkles, Volume2, VolumeX, Workflow, X } from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { useShowcaseFavorites } from "@/hooks/use-showcase-favorites";
import type { MessageKey } from "@/i18n/messages";
import { useI18n } from "@/i18n/use-i18n";
import { useUserStore } from "@/stores/use-user-store";
import { copyText } from "@/lib/copy-text";
import { preloadWorkspaceRoute } from "@/lib/workspace-route-modules";
import { splitLocaleAndPath } from "@/lib/page-seo";
import { localizedPublicPath } from "@/i18n/locale-routing";
import { getLocalizedShowcase } from "./showcase-translations";
import { getWorkBySlug, localizedWorkPath } from "./works-data";

import { WESTERN_HOME_SHOWS } from "../home/western-opening-works";
import { showcaseCanvasImportHref, showcaseCanvasPreviewHref } from "./canvas-route";
import { getShowcaseSummary, resolveLocalAsset, type ShowcaseDetail } from "./data";
import { useManifestAssets } from "./use-manifest-assets";
import { useSegmentedVideo } from "./segmented-video";
import { hasArchivedShowcaseGraph } from "./archive-loader";
import { SHOWCASE_SUMMARIES_NEED_MANIFEST } from "./remote-assets";
import { prefetchArchivedShowcaseCase } from "./use-archived-case";
import { resolvableShowcaseRecommendations } from "./recommendations";
import { ArchivedImage } from "./archived-image";
import { responsiveArchivedImage } from "./image-variants";

import { SHOWCASE_PANEL_COPY } from "./showcase-panel-copy";
import { ShowcaseStage, ShowcaseActions, ShowcaseRail } from "@/components/showcase-stage";
import "./showcase.css";

interface RailDragState {
    pointerId: number;
    startX: number;
    scrollLeft: number;
    moved: boolean;
}

const WESTERN_RAIL_ITEMS: ShowcaseDetail[] = WESTERN_HOME_SHOWS.map((item) => ({
    templateUuid: item.templateUuid,
    projectUuid: item.templateUuid,
    name: item.title,
    description: item.description,
    coverUrl: item.cardSrc,
    finalOutput: item.videoSrc,
    nickname: item.author ?? undefined,
}));

const WESTERN_RAIL_UUIDS = new Set(WESTERN_RAIL_ITEMS.map((item) => item.templateUuid));

const GENERIC_HOME_PLAYBACK = {
    initialZoom: 0.08,
    durationSeconds: 60,
    videoWidth: 1920,
    videoHeight: 1080,
    qualityLabelKey: "miscPages.detailOriginalVideo",
} as const;

function westernHomeShowDetail(item: (typeof WESTERN_HOME_SHOWS)[number]): ShowcaseDetail {
    return {
        templateUuid: item.templateUuid,
        projectUuid: item.templateUuid,
        name: item.title,
        description: item.description,
        coverUrl: item.heroSrc,
        finalOutput: item.videoSrc,
        nickname: item.author ?? undefined,
    };
}

export default function ShowcaseDetailPage() {
    const { templateUuid, slug } = useParams();
    const workFromSlug = slug ? getWorkBySlug(slug) : undefined;
    const resolvedTemplateUuid = workFromSlug?.templateUuid ?? templateUuid;
    const showcaseCase = getShowcaseSummary(resolvedTemplateUuid);
    const westernHomeShow = WESTERN_HOME_SHOWS.find((item) => item.templateUuid === resolvedTemplateUuid);
    const location = useLocation();
    const { locale } = splitLocaleAndPath(location.pathname);
    const homePath = localizedPublicPath("/", locale);
    const getDetailPath = (id: string) => localizedWorkPath(id, locale) ?? localizedPublicPath(`/detail/${id}`, locale);
    const navigate = useNavigate();
    const user = useUserStore((state) => state.user);
    const favorites = useShowcaseFavorites();
    const { t } = useI18n();
    const { index: assets, error: manifestError, loading: manifestLoading } = useManifestAssets(!westernHomeShow && SHOWCASE_SUMMARIES_NEED_MANIFEST);
    const westernHomeDetail = useMemo(() => (westernHomeShow ? westernHomeShowDetail(westernHomeShow) : undefined), [westernHomeShow]);
    const initialDetail = showcaseCase?.detail ?? westernHomeDetail;
    const [selectedDetail, setSelectedDetail] = useState<ShowcaseDetail | undefined>(() => initialDetail);
    const [watchMode, setWatchMode] = useState(false);
    const [showSpecs, setShowSpecs] = useState(false);
    const [toast, setToast] = useState("");
    const [paused, setPaused] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [muted, setMuted] = useState(true);
    const [coverFallback, setCoverFallback] = useState<string>();
    const videoRef = useRef<HTMLVideoElement>(null);
    const railRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<RailDragState | undefined>(undefined);
    const suppressClickRef = useRef(false);

    const updateDate = formatUpdateDate(selectedDetail?.createAt, locale);
    const localized = selectedDetail ? getLocalizedShowcase(selectedDetail.templateUuid, selectedDetail.name, selectedDetail.description || "", locale) : undefined;
    const panelCopy = SHOWCASE_PANEL_COPY[locale];
    const specsDialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = specsDialogRef.current;
        if (!dialog) return;
        if (showSpecs && !dialog.open) dialog.showModal();
        if (!showSpecs && dialog.open) dialog.close();
    }, [showSpecs]);

    useEffect(() => {
        setSelectedDetail(initialDetail);
        setWatchMode(false);
        setShowSpecs(false);
        setPaused(false);
        setCurrentTime(0);
        setPlaybackRate(1);
        setMuted(true);
    }, [initialDetail]);

    useEffect(() => {
        if (!toast) return;
        const timer = window.setTimeout(() => setToast(""), 6500);
        return () => window.clearTimeout(timer);
    }, [toast]);

    function formatUpdateDate(value: string | undefined, locale: string): string {
        if (!value) return "";
        const match = value.match(/(\d{4})年(\d{1,2})月(\d{1,2})日(?:\s+(\d{1,2}:\d{2}))?/);
        if (match) {
            const [, y, m, d, time] = match;
            if (locale === "pt-BR" || locale === "es-ES") return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}${time ? ` ${time}` : ""}`;
            if (locale === "en-US") return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}${time ? ` ${time}` : ""}`;
        }
        return value;
    }

    const railItems = useMemo(() => {
        if (westernHomeShow || (showcaseCase && WESTERN_RAIL_UUIDS.has(showcaseCase.templateUuid)) || (locale !== "zh-CN" && locale !== "zh-HK" && locale !== "zh-TW")) return WESTERN_RAIL_ITEMS;
        if (!showcaseCase) return [];
        const withoutCurrent = resolvableShowcaseRecommendations(showcaseCase);
        return [...withoutCurrent.slice(0, 5), showcaseCase.detail, ...withoutCurrent.slice(5)];
    }, [showcaseCase, westernHomeShow, locale]);

    useLayoutEffect(() => {
        if (!railRef.current || !selectedDetail) return;
        const activeIndex = railItems.findIndex((item) => item.templateUuid === selectedDetail.templateUuid);
        if (activeIndex < 0) return;
        const itemPitch = 232;
        railRef.current.scrollLeft = Math.max(0, activeIndex * itemPitch + 110 - railRef.current.clientWidth / 2);
    }, [railItems, selectedDetail?.templateUuid]);

    const selectedHomeShow = selectedDetail ? WESTERN_HOME_SHOWS.find((item) => item.templateUuid === selectedDetail.templateUuid) : undefined;
    const videoUrl = selectedDetail ? (selectedHomeShow?.videoSrc ?? resolveLocalAsset(assets, selectedDetail.finalOutput)) : undefined;
    const segmentedVideo = useSegmentedVideo(videoRef, videoUrl);

    if (!selectedDetail) {
        return (
            <main className="ll-detail-error">
                <Sparkles aria-hidden />
                <h1>{t("miscPages.detailNotFoundTitle")}</h1>
                <p>{t("miscPages.detailNotFoundDetail")}</p>
                <button type="button" onClick={() => navigate(homePath)}>
                    {t("miscPages.detailBackHome")}
                </button>
            </main>
        );
    }

    const westernDetail = Boolean(westernHomeShow || (showcaseCase && WESTERN_RAIL_UUIDS.has(showcaseCase.templateUuid)));
    if (manifestError && !westernDetail) {
        return (
            <main className="ll-detail-error">
                <h1>{t("miscPages.detailManifestFailedTitle")}</h1>
                <p>{manifestError.message}</p>
                <button type="button" onClick={() => window.location.reload()}>
                    {t("miscPages.detailReload")}
                </button>
            </main>
        );
    }

    const selectedCase = getShowcaseSummary(selectedDetail.templateUuid);
    const coverUrl = selectedHomeShow?.heroSrc ?? resolveLocalAsset(assets, selectedDetail.coverUrl);
    const avatarUrl = selectedHomeShow ? undefined : resolveLocalAsset(assets, selectedDetail.avatar);
    const playbackCase = selectedCase ?? (selectedHomeShow ? GENERIC_HOME_PLAYBACK : (showcaseCase ?? GENERIC_HOME_PLAYBACK));
    // Poster and blurred backdrop reuse the hero's 1280 variant (one download);
    // both switch to the original once the hero image had to fall back.
    const posterUrl = coverUrl && coverFallback !== coverUrl ? responsiveArchivedImage(coverUrl, [1280]).src : coverUrl;

    const leaveDetail = () => {
        if (window.opener && !window.opener.closed) {
            window.close();
            return;
        }
        navigate(homePath);
    };

    // The video sits behind the opaque cover until watch mode, so it is not
    // downloaded up front; buffering starts on intent (hover/focus/press).
    const warmVideo = () => {
        const video = videoRef.current;
        if (video && video.preload !== "auto") video.preload = "auto";
        segmentedVideo.warm();
    };

    const enterWatchMode = () => {
        if (!videoUrl) {
            setToast(t("miscPages.detailFinalUnavailable"));
            return;
        }
        const video = videoRef.current;
        setWatchMode(true);
        setMuted(false);
        setPaused(false);
        if (video) {
            video.muted = false;
            video.loop = false;
            void video.play().catch(() => undefined);
        }
    };

    const openEditableCanvas = () => {
        preloadWorkspaceRoute("/canvas");
        prefetchArchivedShowcaseCase(selectedDetail.templateUuid);
        navigate(hasArchivedShowcaseGraph(selectedDetail.templateUuid) ? showcaseCanvasImportHref(selectedDetail.templateUuid) : showcaseCanvasPreviewHref(selectedDetail.templateUuid));
    };
    const preloadEditor = () => {
        preloadWorkspaceRoute("/canvas");
        prefetchArchivedShowcaseCase(selectedDetail.templateUuid);
    };

    const canvasActionLabel = hasArchivedShowcaseGraph(selectedDetail.templateUuid) ? t("miscPages.detailOpenCanvas") : t("miscPages.detailCaseInfo");
    const isFavorite = favorites.favorites.some((item) => item.templateId === selectedDetail.templateUuid);

    const toggleFavorite = async () => {
        try {
            await favorites.mutation.mutateAsync({ id: selectedDetail.templateUuid, favorite: !isFavorite });
            setToast(isFavorite ? t("miscPages.detailUnfavorited") : t("miscPages.detailFavorited"));
        } catch {
            setToast(t("miscPages.detailFavoriteFailed"));
        }
    };

    const shareCurrentUrl = async () => {
        const value = new URL(getDetailPath(selectedDetail.templateUuid), window.location.origin).href;
        try {
            await copyText(value);
            setToast(t("miscPages.detailLinkCopied"));
        } catch {
            setToast(t("miscPages.detailCopyFailed"));
        }
    };

    const selectRecommendation = (item: ShowcaseDetail) => {
        if (suppressClickRef.current) return;
        navigate(getDetailPath(item.templateUuid), { replace: true });
        setSelectedDetail(item);
        setWatchMode(false);
        setPaused(false);
        setCurrentTime(0);
        setPlaybackRate(1);
        setMuted(true);
    };

    const startRailDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (event.button !== 0 || !railRef.current) return;
        dragRef.current = { pointerId: event.pointerId, startX: event.clientX, scrollLeft: railRef.current.scrollLeft, moved: false };
        suppressClickRef.current = false;
    };

    const moveRailDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId || !railRef.current) return;
        const delta = event.clientX - drag.startX;
        if (Math.abs(delta) > 6) {
            drag.moved = true;
            suppressClickRef.current = true;
            // Capture only real drags: early capture redirects a card's click to the rail.
            if (!event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.setPointerCapture(event.pointerId);
        }
        if (drag.moved) {
            event.preventDefault();
            railRef.current.scrollLeft = drag.scrollLeft - delta;
        }
    };

    const finishRailDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        dragRef.current = undefined;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        window.setTimeout(() => {
            suppressClickRef.current = false;
        }, 0);
    };

    const togglePlayback = () => {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) void video.play();
        else video.pause();
    };

    const cyclePlaybackRate = () => {
        const rates = [1, 1.5, 2, 0.5];
        const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
        setPlaybackRate(nextRate);
        if (videoRef.current) videoRef.current.playbackRate = nextRate;
    };

    const toggleMute = () => {
        const nextMuted = !muted;
        setMuted(nextMuted);
        if (videoRef.current) videoRef.current.muted = nextMuted;
    };

    const requestVideoFullscreen = () => {
        const video = videoRef.current;
        if (!video || !video.isConnected) return;
        void video.requestFullscreen().catch(() => undefined);
    };

    return (
        <ShowcaseStage
            className={watchMode ? "is-watching" : ""}
            data-testid="showcase-detail"
            data-template-uuid={selectedDetail.templateUuid}
            posterUrl={posterUrl}
            cover={coverUrl ? <ArchivedImage key={coverUrl} className="ll-detail-cover" src={coverUrl} widths={[480, 1280]} sizes="100vw" fetchPriority="high" onFallback={setCoverFallback} alt="" aria-hidden /> : null}
            media={
                videoUrl ? (
                    <video
                        key={selectedDetail.templateUuid}
                        ref={videoRef}
                        className="ll-detail-video"
                        src={segmentedVideo.src}
                        poster={posterUrl}
                        playsInline
                        muted={muted}
                        loop={!watchMode}
                        preload="none"
                        data-testid="showcase-video"
                        data-video-width={playbackCase.videoWidth}
                        data-video-height={playbackCase.videoHeight}
                        onCanPlay={(event) => {
                            if (watchMode) void event.currentTarget.play().catch(() => undefined);
                        }}
                        onPlay={() => setPaused(false)}
                        onPause={() => setPaused(true)}
                        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
                        onError={segmentedVideo.onError}
                    />
                ) : (
                    <div className="ll-detail-media-loading">{manifestLoading ? t("miscPages.detailLoadingFinal") : t("miscPages.detailFinalUnavailable")}</div>
                )
            }
        >
            <button type="button" className="ll-detail-back" onClick={leaveDetail}>
                <ArrowLeft aria-hidden /> {t("miscPages.detailBack")}
            </button>

            {!watchMode ? (
                <>
                    <header className="ll-detail-author">
                        {avatarUrl ? (
                            <ArchivedImage key={avatarUrl} src={avatarUrl} widths={[96]} width={30} height={30} decoding="async" alt="" />
                        ) : (
                            <span className="ll-detail-avatar-fallback">{(selectedHomeShow?.author || sourceLabel(locale) || t("miscPages.detailAvatarFallback")).slice(0, 1).toLocaleUpperCase()}</span>
                        )}
                        <strong>{selectedHomeShow?.author || (selectedHomeShow ? sourceLabel(locale) : selectedDetail.nickname || t("miscPages.detailAnonymousAuthor"))}</strong>
                        <span className="ll-detail-verified" aria-label={t("miscPages.detailVerifiedAria")}>
                            <BadgeCheck aria-hidden />
                        </span>
                        <i aria-hidden />
                        <h1>{localized?.title || selectedDetail.name}</h1>
                    </header>
                    <aside className="ll-detail-meta">
                        {selectedHomeShow ? <strong className="ll-detail-source">{sourceLine(selectedHomeShow, locale)}</strong> : null}
                        {selectedHomeShow && localized?.description ? <p className="ll-detail-original-description">{localized.description}</p> : null}
                        {updateDate ? <strong>{t("miscPages.detailUpdateTime", { value: updateDate })}</strong> : null}
                        <span>{t("miscPages.detailAiContent")}</span>
                    </aside>
                    <ShowcaseActions aria-label={t("miscPages.detailActionsAria")}>
                        <button type="button" className="ll-detail-action-round is-primary" aria-label={t("miscPages.detailWatchNow")} onPointerEnter={warmVideo} onPointerDown={warmVideo} onFocus={warmVideo} onClick={enterWatchMode}>
                            <Play aria-hidden fill="currentColor" />
                        </button>
                        <button type="button" className="ll-detail-process" onPointerEnter={preloadEditor} onPointerDown={preloadEditor} onFocus={preloadEditor} onClick={openEditableCanvas}>
                            <Workflow aria-hidden /> {canvasActionLabel}
                        </button>
                        <button
                            type="button"
                            className={`ll-detail-action-round ${showSpecs ? "is-active" : ""}`}
                            aria-label={panelCopy.open}
                            title={panelCopy.open}
                            aria-controls="workflow-details-dialog"
                            aria-expanded={showSpecs}
                            onClick={() => setShowSpecs((prev) => !prev)}
                        >
                            <SlidersHorizontal aria-hidden />
                        </button>
                        <button
                            type="button"
                            className="ll-detail-action-round"
                            aria-label={isFavorite ? t("miscPages.detailUnfavoriteAria") : t("miscPages.detailFavoriteAria")}
                            aria-pressed={isFavorite}
                            title={isFavorite ? t("miscPages.detailUnfavoriteAria") : t("miscPages.detailFavoriteAria")}
                            disabled={Boolean(user) && (favorites.isPending || favorites.mutation.isPending)}
                            onClick={() => void toggleFavorite()}
                        >
                            <Heart aria-hidden fill={isFavorite ? "currentColor" : "none"} />
                        </button>
                        <button type="button" className="ll-detail-action-round" aria-label={t("miscPages.detailShareAria")} onClick={() => void shareCurrentUrl()}>
                            <Share2 aria-hidden />
                        </button>
                    </ShowcaseActions>
                </>
            ) : (
                <>
                    <button type="button" className="ll-detail-process ll-detail-process-floating" onPointerEnter={preloadEditor} onPointerDown={preloadEditor} onFocus={preloadEditor} onClick={openEditableCanvas}>
                        {canvasActionLabel} <span aria-hidden>→</span>
                    </button>
                    <div className="ll-player-controls" data-testid="player-controls">
                        <button type="button" aria-label={paused ? t("miscPages.detailPlay") : t("miscPages.detailPause")} onClick={togglePlayback}>
                            {paused ? <Play aria-hidden fill="currentColor" /> : <Pause aria-hidden fill="currentColor" />}
                        </button>
                        <input
                            aria-label={t("miscPages.detailProgressAria")}
                            type="range"
                            min={0}
                            max={Math.max(playbackCase.durationSeconds, videoRef.current?.duration || 0)}
                            step={0.05}
                            value={currentTime}
                            onChange={(event) => {
                                const nextTime = Number(event.target.value);
                                setCurrentTime(nextTime);
                                if (videoRef.current) videoRef.current.currentTime = nextTime;
                            }}
                        />
                        <button type="button" className="ll-player-text" onClick={cyclePlaybackRate}>
                            {playbackRate}x
                        </button>
                        <span className="ll-player-quality">{"qualityLabelKey" in playbackCase ? t((playbackCase as { qualityLabelKey: MessageKey }).qualityLabelKey) : playbackCase.qualityLabel}</span>
                        <button type="button" aria-label={muted ? t("miscPages.detailUnmute") : t("miscPages.detailMute")} onClick={toggleMute}>
                            {muted ? <VolumeX aria-hidden /> : <Volume2 aria-hidden />}
                        </button>
                        {videoUrl ? (
                            <button type="button" aria-label={t("miscPages.detailFullscreen")} onClick={requestVideoFullscreen}>
                                <Expand aria-hidden />
                            </button>
                        ) : null}
                    </div>
                </>
            )}

            {!watchMode ? (
                <ShowcaseRail
                    label={t("miscPages.detailRailAria")}
                    previousLabel={t("miscPages.detailRailPrevAria")}
                    nextLabel={t("miscPages.detailRailNextAria")}
                    railProps={{ ref: railRef, onPointerDown: startRailDrag, onPointerMove: moveRailDrag, onPointerUp: finishRailDrag, onPointerCancel: finishRailDrag }}
                >
                    {railItems.map((item) => {
                        const itemCover = resolveLocalAsset(assets, item.coverUrl);
                        const active = item.templateUuid === selectedDetail.templateUuid;
                        const itemTrans = getLocalizedShowcase(item.templateUuid, item.name, item.description || "", locale);
                        return (
                            <button
                                key={item.templateUuid}
                                type="button"
                                className={`ll-detail-rail-item ${active ? "is-active" : ""}`}
                                aria-label={t("miscPages.detailRailItemAria", { name: itemTrans.title })}
                                aria-current={active ? "true" : undefined}
                                onClick={() => selectRecommendation(item)}
                            >
                                {itemCover ? <ArchivedImage key={itemCover} src={itemCover} widths={[480]} width={220} height={123} alt="" draggable={false} loading="lazy" decoding="async" /> : <span>{itemTrans.title}</span>}
                                <em>{itemTrans.title}</em>
                            </button>
                        );
                    })}
                </ShowcaseRail>
            ) : null}

            {selectedDetail && localized ? (
                <dialog
                    ref={specsDialogRef}
                    id="workflow-details-dialog"
                    className={`ll-workflow-specs ${showSpecs ? "is-visible" : ""}`}
                    aria-labelledby="workflow-details-title"
                    onCancel={() => setShowSpecs(false)}
                    onClose={() => setShowSpecs(false)}
                    onKeyDown={(event) => {
                        if (event.key !== "Tab") return;
                        const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), a[href]")).filter((item) => item.getClientRects().length > 0);
                        const first = items[0],
                            last = items[items.length - 1];
                        if (!first || !last) return;
                        if (event.shiftKey && document.activeElement === first) {
                            event.preventDefault();
                            last.focus();
                        } else if (!event.shiftKey && document.activeElement === last) {
                            event.preventDefault();
                            first.focus();
                        }
                    }}
                >
                    <div className="ll-workflow-specs-backdrop" onClick={() => setShowSpecs(false)} aria-hidden />
                    <div className="ll-workflow-specs-panel">
                        <header className="ll-workflow-specs-header">
                            <div>
                                <span className="ll-workflow-specs-badge">{panelCopy.open}</span>
                                <h2 id="workflow-details-title">{localized.title}</h2>
                            </div>
                            <button autoFocus type="button" className="ll-workflow-specs-close" onClick={() => setShowSpecs(false)} aria-label={panelCopy.close}>
                                <X aria-hidden />
                            </button>
                        </header>
                        <p className="ll-workflow-specs-synopsis">{localized.description}</p>
                        <div className="ll-workflow-cta-row">
                            <button type="button" className="ll-workflow-duplicate-btn" onClick={openEditableCanvas}>
                                <Workflow aria-hidden />
                                {canvasActionLabel}
                            </button>
                        </div>
                        <nav className="ll-workflow-cluster-nav" aria-label={panelCopy.guides}>
                            <Link to={localizedPublicPath("/blog/story-to-canvas", locale)}>{panelCopy.story}</Link>
                            <span aria-hidden>·</span>
                            <Link to={localizedPublicPath("/help", locale)}>{panelCopy.help}</Link>
                            <span aria-hidden>·</span>
                            <Link to={localizedPublicPath("/pricing", locale)}>{panelCopy.pricing}</Link>
                        </nav>
                    </div>
                </dialog>
            ) : null}

            {toast ? (
                <div className="ll-detail-toast" role="status" data-testid="share-toast">
                    {toast}
                </div>
            ) : null}
        </ShowcaseStage>
    );
}

function sourceLabel(locale: string) {
    const labels: Record<string, string> = {
        "zh-CN": "精选作品",
        "zh-HK": "精選作品",
        "zh-TW": "精選作品",
        "en-US": "Featured work",
        "ja-JP": "注目作品",
        "ko-KR": "추천 작품",
        "es-ES": "Obra destacada",
        "pt-BR": "Obra em destaque",
    };
    return labels[locale] || labels["en-US"];
}

function sourceLine(work: (typeof WESTERN_HOME_SHOWS)[number], locale: string) {
    const author = work.author;
    const date = work.originalPublishAt || "";
    const templates: Record<string, (author: string, date: string) => string> = {
        "zh-CN": (name, published) => `精选作品${name ? ` · 作者 ${name}` : ""}${published ? ` · 发布于 ${published}` : ""}`,
        "zh-HK": (name, published) => `精選作品${name ? ` · 作者 ${name}` : ""}${published ? ` · 發布於 ${published}` : ""}`,
        "zh-TW": (name, published) => `精選作品${name ? ` · 作者 ${name}` : ""}${published ? ` · 發布於 ${published}` : ""}`,
        "en-US": (name, published) => `Featured work${name ? ` · Author ${name}` : ""}${published ? ` · Published ${published}` : ""}`,
        "ja-JP": (name, published) => `注目作品${name ? ` · 作者 ${name}` : ""}${published ? ` · 公開日 ${published}` : ""}`,
        "ko-KR": (name, published) => `추천 작품${name ? ` · 작성자 ${name}` : ""}${published ? ` · 게시일 ${published}` : ""}`,
        "es-ES": (name, published) => `Obra destacada${name ? ` · Autor ${name}` : ""}${published ? ` · Publicado ${published}` : ""}`,
        "pt-BR": (name, published) => `Obra em destaque${name ? ` · Autor ${name}` : ""}${published ? ` · Publicado em ${published}` : ""}`,
    };
    return (templates[locale] || templates["en-US"])(author || "", date);
}
