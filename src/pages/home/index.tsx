import "@/styles/home-route.css";
import { modelStarterCanvasHref } from "../showcase/model-starter-route";
import { MODEL_STARTER_CARD_COPY } from "../showcase/model-starter-card-copy";
import { useWalletBalance } from "@/hooks/use-wallet-balance";
import { McpCommandCard } from "@/components/mcp/command-card";
import { BYOK_RELAY_COPY } from "@/lib/byok-relay-copy";
import { localizedPublicPath } from "@/i18n/locale-routing";
import { HomeHeroStill } from "./home-hero-still";
import { useI18n } from "@/i18n/use-i18n";
import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type FocusEvent, type ReactNode, type SetStateAction } from "react";
import { App, Modal, Popover } from "antd";
import {
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    AudioLines,
    BarChart3,
    Blend,
    Boxes,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Clapperboard,
    Coins,
    Film,
    Music2,
    Video,
    FileText,
    Images,
    MessageSquareText,
    Palette,
    Plus,
    RefreshCw,
    ScanLine,
    Search,
    SlidersHorizontal,
    Sparkles,
    Star,
    Trophy,
    UserRound,
    WandSparkles,
    Workflow,
    X,
    type LucideIcon,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router";

import { LibTVSidebar, LibTVTopBar } from "@/components/layout/libtv-navigation";
import { LibTVCampaignBar, useLibTVCampaignVisibility } from "@/components/layout/libtv-campaign-bar";
import { HOME_POSITIONING } from "@/lib/home-positioning";
import { HolidayOfferDialog } from "./holiday-offer";
import { ModelPicker } from "@/components/model-picker";
import { modelCapabilityConfigFor, normalizeImageValue, normalizeVideoValue, videoDurationOptions, videoSelectionAllowed, type ImageCapabilityConfig, type VideoCapabilityConfig } from "@/lib/model-capabilities";
import { modelQuoteRequest } from "@/lib/model-pricing";
import { isRtlAppLocale, useAppLocale, type AppLocale } from "@/i18n/app-locale";
import { splitLocaleAndPath } from "@/lib/site-identity";
import { HOME_HERO_MESSAGES, type HomeHeroCampaignKey, type HomeHeroCampaignMessage } from "@/i18n/home-messages";
import { CanvasResourceMentionTextarea } from "@/components/canvas/canvas-resource-mention-textarea";
import { countHomeAttachments, HOME_ATTACHMENT_ACCEPT, HOME_ATTACHMENT_KINDS, homeAttachmentKey, homeAttachmentKind, homeMentionReferences, relabelHomeMentions, type HomeAttachmentKind } from "./home-mentions";
import type { MessageKey } from "@/i18n/messages";
import { HomeOnboarding } from "@/components/onboarding/home-onboarding";
import { useAccountOnboarding } from "@/components/onboarding/use-account-onboarding";
import { clearOnboardingProgress } from "@/lib/canvas/canvas-onboarding-template";
import { trackOnboardingEvent } from "@/services/onboarding-analytics";
import { loadCanvasProjectPage } from "@/lib/workspace-route-modules";
import { useAssetStore } from "@/stores/use-asset-store";
import { useCanvasStore } from "@/stores/canvas/use-canvas-store";
import { useThemeStore } from "@/stores/use-theme-store";
import { useUserStore } from "@/stores/use-user-store";
import { selectableModelsByCapability, useConfigStore } from "@/stores/use-config-store";
import { quoteModelCatalog, type ModelCatalogQuote } from "@/services/api/logical-models";
import { useShowcaseFavorites } from "@/hooks/use-showcase-favorites";
import { creationAudioAsset, creationImageAsset, creationVideoAsset, type CreationMode } from "../create/creation-assets";
import { libTVStarterCanvasHref } from "../showcase/libtv-starter-route";

import { localizedWesternHomeShows, type WesternCreatorBadgeKind } from "./western-opening-works";
import { shouldScheduleHomeHeroAdvance, startHomeHeroPlayback, useHomeHeroMediaGate } from "./home-hero-playback";
import { requestPreviewPlaybackSafely } from "./preview-playback";
import { FeedbackTicket } from "./feedback-ticket";
import { SiteFooter } from "@/components/public/site-footer";

interface HomeHeroSlide {
    id: string;
    src?: string;
    campaign?: HomeHeroCampaignKey;
    destination?: string;
}

const HOME_HERO_SLIDES: readonly HomeHeroSlide[] = [
    {
        id: "byok-studio",
        campaign: "byokStudio",
        destination: "/pricing?plan=byok",
    },
    {
        id: "site-launch",
        campaign: "siteLaunch",
        destination: "/create?mode=video",
    },
    { id: "wan-3", campaign: "wan", destination: modelStarterCanvasHref("wan-30") },
] as const;

const HOME_HERO_SLIDE_DURATION_MS: Record<string, number> = {
    "byok-studio": 7000,
    "site-launch": 6500,
    "wan-3": 5000,
};

const TV_CATEGORIES = ["全部", "Seedance 2.5", "精选画布", "专业影视", "短剧漫剧", "商业广告", "动漫游戏", "教育生活", "TV工具箱"] as const; // 分类 key 由 TV_CATEGORY_KEYS 翻译

type TvCategory = (typeof TV_CATEGORIES)[number];

const TV_CATEGORY_KEYS: Record<TvCategory, MessageKey> = {
    全部: "homeShowcase.category.all",
    "Seedance 2.5": "homeShowcase.category.seedance",
    精选画布: "homeShowcase.category.curated",
    专业影视: "homeShowcase.category.cinema",
    短剧漫剧: "homeShowcase.category.shortDrama",
    商业广告: "homeShowcase.category.ads",
    动漫游戏: "homeShowcase.category.animeGame",
    教育生活: "homeShowcase.category.education",
    TV工具箱: "homeShowcase.category.tvTools",
};

const PROCESS_LABEL_KEYS = {
    openCanvas: "homeShowcase.processOpenCanvas",
    viewInfo: "homeShowcase.processViewInfo",
} as const;

type ProcessLabelKind = keyof typeof PROCESS_LABEL_KEYS;

type HomeGenerationSettings = {
    size?: string;
    quality?: string;
    count?: string;
    ratio?: string;
    resolution?: string;
    seconds?: string;
};

interface ShowItem {
    id: string;
    title: string;
    author: string;
    description: string;
    src: string;
    cardSrc: string;
    categories: TvCategory[];
    avatarSrc?: string;
    avatarThumbSrc?: string;
    templateUuid: string;
    videoSrc: string;
    previewVideoSrc?: string;
    detailHref: string;
    processHref: string;
    processLabel: ProcessLabelKind;
    creatorBadge: WesternCreatorBadgeKind;
}

let showcaseDetailPreloadStarted = false;

function preloadShowcaseDetail() {
    if (showcaseDetailPreloadStarted) return;
    showcaseDetailPreloadStarted = true;
    void import("../showcase/detail-page").catch(() => undefined);
}

const CREATOR_BADGES: Record<WesternCreatorBadgeKind, { labelKey: MessageKey; icon: LucideIcon }> = {
    director: { labelKey: "homeShowcase.badge.director", icon: Clapperboard },
    visual: { labelKey: "homeShowcase.badge.visual", icon: Palette },
    workflow: { labelKey: "homeShowcase.badge.workflow", icon: Workflow },
    featured: { labelKey: "homeShowcase.badge.featured", icon: Star },
    challenge: { labelKey: "homeShowcase.badge.challenge", icon: Trophy },
    community: { labelKey: "homeShowcase.badge.community", icon: Sparkles },
};

const CREATION_TOOLS: Array<{ titleKey?: MessageKey; title?: string; descriptionCopy?: keyof typeof MODEL_STARTER_CARD_COPY["en-US"]; badgeKey?: MessageKey; descriptionKey?: MessageKey; icon: LucideIcon; cover?: string; destination: string }> = [
    { titleKey: "homeShowcase.tool.byok", badgeKey: "homeShowcase.badge.zeroMarkup", descriptionKey: "homeShowcase.tool.byokDesc", icon: Sparkles, destination: "/pricing?plan=byok" },
    { title: "GPT Image 2.6", descriptionCopy: "cardGptImageDesc", badgeKey: "homeShowcase.badge.primaryModel", icon: Images, destination: modelStarterCanvasHref("gpt-image") },
    { titleKey: "homeShowcase.tool.seedance", badgeKey: "homeShowcase.badge.primaryModel", descriptionKey: "homeShowcase.tool.seedanceDesc", icon: BarChart3, destination: modelStarterCanvasHref("seedance-25") },
    { titleKey: "homeShowcase.tool.wan", badgeKey: "homeShowcase.badge.starter", descriptionKey: "homeShowcase.tool.wanDesc", icon: Blend, destination: modelStarterCanvasHref("wan-30") },
    { titleKey: "homeShowcase.tool.minimax", badgeKey: "homeShowcase.badge.starter", descriptionKey: "homeShowcase.tool.h3Desc", icon: AudioLines, destination: modelStarterCanvasHref("minimax-h3") },
    { titleKey: "homeShowcase.tool.director", badgeKey: "homeShowcase.badge.starter", descriptionKey: "homeShowcase.tool.directorDesc", cover: "/examples/spring-record/jimeng-d259653a.jpg", icon: Boxes, destination: libTVStarterCanvasHref("director") },
    { titleKey: "homeShowcase.tool.shotBreakdown", badgeKey: "homeShowcase.badge.exclusive", descriptionCopy: "cardShotBreakdownDesc", icon: ScanLine, destination: modelStarterCanvasHref("shot-breakdown") },
    { titleKey: "homeShowcase.tool.remake", descriptionCopy: "cardRemakeDesc", icon: RefreshCw, destination: modelStarterCanvasHref("segment-remake") },
    { titleKey: "canvasExtra.tool.depthCapture", badgeKey: "homeShowcase.badge.starter", descriptionKey: "homeShowcase.tool.depthDesc", cover: "/examples/depth-capture/jimeng-c483d4a4.jpg", icon: UserRound, destination: libTVStarterCanvasHref("depth-capture") },
];

const AGENT_STARTERS = [
    {
        labelKey: "homeShowcase.starter.popLabel" as MessageKey,
        hintKey: "homeShowcase.starter.musicHint" as MessageKey,
        src: "/liblib-clone/images/77e42fbb42e77cd55fd86fa45a4a26c2eba2db85-142739e7c3c0.jpg",
        promptKey: "homeShowcase.starter.popPrompt" as MessageKey,
    },
    {
        labelKey: "homeShowcase.starter.koreeda" as MessageKey,
        hintKey: "homeShowcase.starter.cinemaHint" as MessageKey,
        src: "/liblib-clone/images/faa8cf7c2f3955c21c2bbaaac485b6b92852877f-cdc8a8714215.png",
        promptKey: "homeShowcase.starter.koreedaPrompt" as MessageKey,
    },
    {
        labelKey: "homeShowcase.starter.beautyUgc" as MessageKey,
        hintKey: "homeShowcase.starter.adsHint" as MessageKey,
        src: "/liblib-clone/images/ac7c6b3599cd58d5a88a978d24c8fb6c152ebe5c-df2405553ec6.png",
        promptKey: "homeShowcase.starter.beautyPrompt" as MessageKey,
    },
] as const;


export default function IndexPage() {
    const { message } = App.useApp();
    const { t, number } = useI18n();
    const navigate = useNavigate();
    const location = useLocation();
    const { locale: showcaseLocale } = splitLocaleAndPath(location.pathname);
    const scrollRef = useRef<HTMLElement>(null);
    const categoryTrackRef = useRef<HTMLDivElement>(null);
    const { campaignOpen, dismissCampaign } = useLibTVCampaignVisibility();
    const [sidebarExpanded, setSidebarExpanded] = useState(false);
    const [activeCategory, setActiveCategory] = useState<TvCategory>("全部");
    const [searchQuery, setSearchQuery] = useState("");
    const [favoritesOnly, setFavoritesOnly] = useState(() => new URLSearchParams(location.search).get("favorites") === "1");
    const favorites = useShowcaseFavorites();
    const [showScrollTop, setShowScrollTop] = useState(false);
    const reducedMotion = useReducedMotionPreference();
    const canvasHydrated = useCanvasStore((state) => state.hydrated);
    const canvasProjects = useCanvasStore((state) => state.projects);
    const { visible: showOnboarding, show: showOnboardingGuide, hide: hideOnboarding, dismiss: dismissAccountOnboarding } = useAccountOnboarding(canvasHydrated);
    const dismissOnboarding = useCallback(() => {
        void dismissAccountOnboarding().catch((error: Error) => message.error(error.message));
    }, [dismissAccountOnboarding, message]);
    useEffect(() => {
        const query = new URLSearchParams(location.search);
        if (query.get("tour") !== "1") return;
        showOnboardingGuide();
        query.delete("tour");
        navigate({ pathname: location.pathname, search: query.toString() }, { replace: true });
    }, [location.pathname, location.search, navigate, showOnboardingGuide]);

    useEffect(() => {
        if (showOnboarding) {
            trackOnboardingEvent("onboarding_home_viewed");
        }
    }, [showOnboarding]);
    const creatingCanvasRef = useRef(false);
    const addAsset = useAssetStore((state) => state.addAsset);
    const user = useUserStore((state) => state.user);
    const theme = useThemeStore((state) => state.theme);
    const setTheme = useThemeStore((state) => state.setTheme);

    const toggleSidebar = () => setSidebarExpanded((current) => !current);
    const closeSidebarOnMobile = () => {
        if (window.innerWidth <= 1023) setSidebarExpanded(false);
    };

    useEffect(() => {
        if (!sidebarExpanded) return;
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key !== "Escape" || window.innerWidth > 1023) return;
            event.preventDefault();
            setSidebarExpanded(false);
        };
        window.addEventListener("keydown", closeOnEscape);
        return () => window.removeEventListener("keydown", closeOnEscape);
    }, [sidebarExpanded]);

    const protectedHref = (path: string) => (user ? path : `/login?next=${encodeURIComponent(path)}`);
    const skillsHref = "/skills";
    const walletHref = protectedHref("/wallet");

    const localizedShows = useMemo(() => localizedWesternHomeShows(showcaseLocale), [showcaseLocale]);
    const filteredShows = useMemo(() => {
        const query = searchQuery.trim().toLocaleLowerCase(showcaseLocale);
        return localizedShows
            .filter((item) => !favoritesOnly || favorites.favorites.some((favorite) => favorite.templateId === item.templateUuid))
            .filter((item) => activeCategory === "全部" || item.categories.some((category) => category === activeCategory))
            .filter((item) => !query || item.searchText.includes(query));
    }, [activeCategory, searchQuery, favoritesOnly, favorites.favorites, localizedShows, showcaseLocale]);

    const preloadCanvasEditor = () => {
        void loadCanvasProjectPage().catch(() => undefined);
    };


    const createIndependentCanvas = async (startTour = false) => {
        if (!canvasHydrated || creatingCanvasRef.current) return;
        if (showOnboarding) {
            if (startTour) hideOnboarding();
            else {
                try { await dismissAccountOnboarding(); }
                catch (error) { message.error(error instanceof Error ? error.message : t("common.requestFailed")); return; }
            }
        }
        creatingCanvasRef.current = true;
        const { openOrCreateBlankCanvas, createCanvasProjectWithDeferredRemoteSync } = await import("@/services/user-data-sync");
        const title = t("homeShowcase.freeCanvas", { count: number(canvasProjects.length + 1) });
        const { id, sync } = startTour ? openOrCreateBlankCanvas(title) : createCanvasProjectWithDeferredRemoteSync(title, undefined, { starterMode: "freeform" });
        if (startTour) {
            trackOnboardingEvent("onboarding_start_clicked");
            clearOnboardingProgress(id);
        }
        preloadCanvasEditor();
        navigate(`/canvas/${id}${startTour ? "?tour=1" : ""}`);
        void sync.then(({ syncError }) => {
            if (syncError) message.warning(syncError instanceof Error ? t("homeShowcase.localSyncFailedDetail", { detail: syncError.message }) : t("homeShowcase.localSyncFailed"));
        });
    };

    const openAgentPrompt = async (prompt: string, files: File[], mode: CreationMode, settings?: HomeGenerationSettings) => {
        const params = new URLSearchParams({ mode });
        if (prompt.trim()) params.set("prompt", prompt.trim());
        if (mode === "video" && settings) {
            params.set("ratio", settings.ratio || "");
            params.set("resolution", settings.resolution || "");
            params.set("seconds", settings.seconds || "");
        }
        if (mode === "image" && settings) {
            params.set("size", settings.size || "");
            params.set("quality", settings.quality || "");
            params.set("count", settings.count || "");
        }
        const destination = `/create?${params.toString()}`;
        if (!user && files.length) message.info(t("homeShowcase.loginKeepPrompt"));
        if (user && files.length) {
            const { uploadMediaFile } = await import("@/services/file-storage");
            message.open({ key: "home-agent-upload", type: "loading", content: t("homeShowcase.addingAttachments", { count: number(files.length) }), duration: 0 });
            // Documents are not library assets: hand the uploaded descriptor to the create page instead.
            const documentFiles = files.filter((file) => homeAttachmentKind(file) === "file");
            const mediaFiles = files.filter((file) => homeAttachmentKind(file) !== "file");
            const [mediaSettled, documentSettled] = await Promise.all([
                Promise.allSettled(mediaFiles.map(async (file) => addAsset(await homeAttachmentAsset(file)))),
                Promise.allSettled(
                    documentFiles.map(async (file) => {
                        const uploaded = await uploadMediaFile(file, "home-agent-document");
                        return { name: file.name, type: uploaded.mimeType || file.type || "application/octet-stream", url: uploaded.url, storageKey: uploaded.storageKey, bytes: uploaded.bytes };
                    }),
                ),
            ]);
            const assetIds = mediaSettled.flatMap((entry) => (entry.status === "fulfilled" ? [entry.value] : []));
            const documents = documentSettled.flatMap((entry) => (entry.status === "fulfilled" ? [entry.value] : []));
            if (assetIds.length) params.set("assetIds", assetIds.join(","));
            if (documents.length) params.set("documents", JSON.stringify(documents));
            const added = assetIds.length + documents.length;
            const failed = files.length - added;
            if (failed)
                message.open({
                    key: "home-agent-upload",
                    type: "warning",
                    content: mediaSettled.some((entry) => entry.status === "rejected" && entry.reason instanceof Error && entry.reason.message === t("generationFailure.video.video_upload_limit"))
                        ? t("generationFailure.video.video_upload_limit")
                        : t("homeShowcase.attachmentsPartial", { added: number(added), failed: number(failed) }),
                    duration: 3,
                });
        }
        navigate(`/create?${params.toString()}`);
    };

    const { locale } = splitLocaleAndPath(location.pathname);

    useEffect(() => {
        if (new URLSearchParams(location.search).get("favorites") !== "1") return;
        document.getElementById("ll-tv-show")?.scrollIntoView({ behavior: "auto", block: "start" });
    }, [location.search]);

    const focusTvShow = (category: TvCategory = "全部") => {
        setActiveCategory(category);
        document.getElementById("ll-tv-show")?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    };

    const openCreationTool = (destination: string) => {
        if (destination.startsWith("/pricing")) {
            navigate(`${localizedPublicPath("/pricing", locale)}${destination.slice("/pricing".length)}`);
            return;
        }
        navigate(destination);
    };

    return (
        <main ref={scrollRef} className="liblib-home-scroll h-full overflow-y-auto" onScroll={(event) => setShowScrollTop(event.currentTarget.scrollTop > 760)}>
            <HolidayOfferDialog />
            <div className={`liblib-home ${campaignOpen ? "has-campaign" : "campaign-closed"}`}>
                {campaignOpen ? <LibTVCampaignBar href={localizedPublicPath("/pricing", locale)} onClose={dismissCampaign} /> : null}

                <div className={`ll-home-app ${sidebarExpanded ? "is-sidebar-expanded" : ""}`}>
                    {sidebarExpanded ? <button type="button" className="ll-home-sidebar-scrim" aria-label={t("homeShowcase.collapseSidebar")} onClick={closeSidebarOnMobile} /> : null}
                    <LibTVSidebar
                        expanded={sidebarExpanded}
                        createHref="/canvas?mode=new"
                        projectsHref="/projects"
                        skillsHref={skillsHref}
                        canvasHref="/canvas"
                        assetsHref="/assets"
                        pricingHref={localizedPublicPath("/pricing", locale)}
                        onToggle={toggleSidebar}
                        onNavigate={closeSidebarOnMobile}
                    />

                    <div className="ll-home-main">
                        <LibTVTopBar user={user} pluginsHref="/plugins" walletHref={walletHref} theme={theme} onThemeChange={setTheme} sidebarExpanded={sidebarExpanded} onToggleSidebar={toggleSidebar} />

                        <div className="ll-home-content">
                            <section className="ll-home-creation" aria-labelledby="ll-home-creation-title">
                                <div className="ll-home-mcp-intro">
                                    <div>
                                        <h1 id="ll-home-creation-title" className="ll-home-creation-heading">
                                            {HOME_POSITIONING[locale].h1}
                                        </h1>
                                        <p className="ll-home-creation-intro">
                                            {HOME_POSITIONING[locale].intro} <Link to={localizedPublicPath("/mcp", locale)}>{HOME_POSITIONING[locale].agentSentence}</Link>
                                        </p>
                                    </div>
                                    <McpCommandCard />
                                </div>
                                <div className="ll-home-create-canvas-shell">
                                    <button
                                        type="button"
                                        className="ll-home-create-canvas"
                                        data-onboarding="create-canvas"
                                        data-audience-component="home_create"
                                        aria-busy={!canvasHydrated}
                                        disabled={!canvasHydrated}
                                        onPointerEnter={preloadCanvasEditor}
                                        onPointerDown={preloadCanvasEditor}
                                        onFocus={preloadCanvasEditor}
                                        onClick={() => createIndependentCanvas(showOnboarding)}
                                    >
                                        <span className="ll-home-create-art" aria-hidden>
                                            <img src="/brand/say-action/create-canvas-background.webp" alt="" width={1040} height={379} decoding="async" />
                                        </span>
                                        <span className="ll-home-create-plus">
                                            <Plus aria-hidden />
                                        </span>
                                        <strong>{t("homeShowcase.createCanvas")}</strong>
                                    </button>
                                    {!showOnboarding && <button type="button" className="ll-home-guide-entry" onClick={showOnboardingGuide}>{t("coach.entry")}</button>}
                                    {showOnboarding && <HomeOnboarding onStart={() => createIndependentCanvas(true)} onDismiss={() => { trackOnboardingEvent("onboarding_home_dismissed"); dismissOnboarding(); }} />}
                                </div>

                                <div className="ll-home-tool-grid">
                                    {CREATION_TOOLS.map(({ titleKey, title: literalTitle, descriptionCopy, badgeKey, descriptionKey, icon: Icon, destination, cover }) => {
                                        const title = literalTitle || t(titleKey!);
                                        const description = descriptionCopy ? MODEL_STARTER_CARD_COPY[locale][descriptionCopy] : t(descriptionKey!);
                                        return (
                                            <button
                                                key={titleKey || "gptImage"}
                                                type="button"
                                                className={`ll-home-tool-card${cover ? " ll-home-tool-card--cover" : ""}`}
                                                aria-label={t("homeShowcase.toolAria", { title, description })}
                                                onPointerEnter={destination.startsWith("/canvas") ? preloadCanvasEditor : undefined}
                                                onFocus={destination.startsWith("/canvas") ? preloadCanvasEditor : undefined}
                                                onClick={() => openCreationTool(destination)}
                                            >
                                                {cover && <img src={cover} alt="" className="ll-home-tool-cover" />}
                                                <span className="ll-home-tool-heading">
                                                    <span className="ll-home-tool-icon" aria-hidden>
                                                        <Icon />
                                                    </span>
                                                    <ArrowRight className="ll-home-tool-arrow" aria-hidden />
                                                </span>
                                                <span className="ll-home-tool-meta">
                                                    <span className="ll-home-tool-name">{title}</span>
                                                    {badgeKey ? <span className={`ll-home-tool-badge ${badgeKey === "homeShowcase.badge.new" ? "is-new" : ""}`}>{t(badgeKey)}</span> : null}
                                                </span>
                                                <span className="ll-home-tool-description">{description}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>

                            <HomeAgent assetsHref="/assets" skillsHref={skillsHref} onPrompt={openAgentPrompt} showOnboarding={showOnboarding} onDismissOnboarding={dismissOnboarding} />

                            <HomeHeroCarousel reducedMotion={reducedMotion} onExplore={() => focusTvShow("全部")} onOpenDestination={openCreationTool} />

                            <HomeByokShowcase pricingHref={`${localizedPublicPath("/pricing", locale)}?plan=byok`} />

                            <section id="ll-tv-show" className="ll-home-tv" aria-labelledby="ll-tv-show-title">
                                <div className="ll-home-tv-toolbar">
                                    <h2 id="ll-tv-show-title">TV Show</h2>
                                    <div className="ll-home-tv-controls">
                                        <button
                                            type="button"
                                            className="ll-home-favorites-filter"
                                            aria-pressed={favoritesOnly}
                                            onClick={() => {
                                                setFavoritesOnly((value) => !value);
                                                setActiveCategory("全部");
                                            }}
                                        >
                                            {t("homeShowcase.favorites")}
                                        </button>
                                        <div className="ll-home-category-shell">
                                            <button
                                                type="button"
                                                className="ll-home-category-arrow is-left"
                                                aria-label={t("homeShowcase.scrollLeft")}
                                                onClick={() => categoryTrackRef.current?.scrollBy({ left: -260, behavior: reducedMotion ? "auto" : "smooth" })}
                                            >
                                                <ChevronLeft aria-hidden />
                                            </button>
                                            <div ref={categoryTrackRef} className="ll-home-category-track">
                                                {TV_CATEGORIES.map((category) => (
                                                    <button
                                                        key={category}
                                                        type="button"
                                                        className={activeCategory === category && !favoritesOnly ? "is-active" : ""}
                                                        aria-pressed={activeCategory === category && !favoritesOnly}
                                                        onClick={() => {
                                                            setFavoritesOnly(false);
                                                            setActiveCategory(category);
                                                        }}
                                                    >
                                                        {t(TV_CATEGORY_KEYS[category])}
                                                    </button>
                                                ))}
                                            </div>
                                            <button
                                                type="button"
                                                className="ll-home-category-arrow is-right"
                                                aria-label={t("homeShowcase.scrollRight")}
                                                onClick={() => categoryTrackRef.current?.scrollBy({ left: 260, behavior: reducedMotion ? "auto" : "smooth" })}
                                            >
                                                <ChevronRight aria-hidden />
                                            </button>
                                        </div>

                                        <label className="ll-home-search">
                                            <span className="ll-home-sr-only">{t("homeShowcase.searchTvShow")}</span>
                                            <input
                                                value={searchQuery}
                                                placeholder={t("homeShowcase.searchPlaceholder")}
                                                onChange={(event) => setSearchQuery(event.target.value)}
                                                onKeyDown={(event) => {
                                                    if (event.key === "Escape") setSearchQuery("");
                                                }}
                                            />
                                            {searchQuery ? (
                                                <button type="button" aria-label={t("homeShowcase.clearSearch")} onClick={() => setSearchQuery("")}>
                                                    <X aria-hidden />
                                                </button>
                                            ) : (
                                                <Search aria-hidden />
                                            )}
                                        </label>
                                    </div>
                                </div>

                                {filteredShows.length ? (
                                    <div className="ll-home-show-grid" aria-live="polite">
                                        {filteredShows.map((item) => (
                                            <ShowCard key={item.id} item={item} allowPreview={!reducedMotion} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="ll-home-no-results">
                                        <Search aria-hidden />
                                        <strong>{t("homeShowcase.noResults")}</strong>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSearchQuery("");
                                                setActiveCategory("全部");
                                                setFavoritesOnly(false);
                                            }}
                                        >
                                            {t("homeShowcase.viewAll")}
                                        </button>
                                    </div>
                                )}
                            </section>

                            <HomeGeoFaqSection />
                        </div>
                        <HomeSiteFooter />
                    </div>
                </div>

                <button
                    type="button"
                    className={`ll-home-scroll-top ${showScrollTop ? "is-visible" : ""}`}
                    aria-label={t("homeShowcase.backToTop")}
                    tabIndex={showScrollTop ? 0 : -1}
                    onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" })}
                >
                    <ArrowUp aria-hidden />
                </button>
                <FeedbackTicket />
            </div>
        </main>
    );
}

function HomeHeroCarousel({ reducedMotion, onExplore, onOpenDestination }: { reducedMotion: boolean; onExplore: () => void; onOpenDestination: (destination: string) => void }) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [documentHidden, setDocumentHidden] = useState(() => (typeof document === "undefined" ? false : document.hidden));
    const completedSlideIdRef = useRef<string | null>(null);
    const locale = useAppLocale();
    const messages = HOME_HERO_MESSAGES[locale];
    const paused = reducedMotion || documentHidden;
    const heroRef = useRef<HTMLElement | null>(null);
    const [copyHeight, setCopyHeight] = useState(0);
    useEffect(() => {
        const copies = heroRef.current?.querySelectorAll<HTMLElement>(".ll-home-hero-motion-copy");
        if (!copies?.length) return;
        // CSS reserves the intrinsic height before hydration. Preserve the existing
        // pixel rounding and translated/resized copy measurements afterwards.
        const measure = () => setCopyHeight(Math.ceil(Math.max(...Array.from(copies, (copy) => copy.offsetHeight))) + 36);
        // ResizeObserver reports every observed copy once after layout, so no synchronous read is needed;
        // reading offsetHeight here forced a full layout of the freshly mounted page (~200 ms at 4× CPU).
        const observer = new ResizeObserver(measure);
        copies.forEach((copy) => observer.observe(copy));
        return () => observer.disconnect();
    }, [locale, activeIndex]);
    const { pageLoaded, videoAllowed, mediaReady } = useHomeHeroMediaGate(heroRef);
    const completeActiveSlide = useCallback(() => {
        const activeSlideId = HOME_HERO_SLIDES[activeIndex].id;
        if (completedSlideIdRef.current === activeSlideId) return;
        completedSlideIdRef.current = activeSlideId;
        setActiveIndex((index) => (index === activeIndex ? (index + 1) % HOME_HERO_SLIDES.length : index));
    }, [activeIndex]);

    useEffect(() => {
        const onVisibilityChange = () => setDocumentHidden(document.hidden);
        document.addEventListener("visibilitychange", onVisibilityChange);
        return () => document.removeEventListener("visibilitychange", onVisibilityChange);
    }, []);

    useEffect(() => {
        completedSlideIdRef.current = null;
    }, [activeIndex]);

    useEffect(() => {
        if (!shouldScheduleHomeHeroAdvance(paused, HOME_HERO_SLIDES[activeIndex].campaign)) return;
        const timer = window.setTimeout(completeActiveSlide, HOME_HERO_SLIDE_DURATION_MS[HOME_HERO_SLIDES[activeIndex].id]);
        return () => window.clearTimeout(timer);
    }, [activeIndex, completeActiveSlide, paused]);

    useEffect(() => {
        // Without film playback (save-data or a slow network), a campaign keeps
        // its poster for the regular slide interval instead of waiting for an end.
        if (paused || videoAllowed || shouldScheduleHomeHeroAdvance(paused, HOME_HERO_SLIDES[activeIndex].campaign)) return;
        const timer = window.setTimeout(completeActiveSlide, HOME_HERO_SLIDE_DURATION_MS[HOME_HERO_SLIDES[activeIndex].id]);
        return () => window.clearTimeout(timer);
    }, [activeIndex, completeActiveSlide, paused, videoAllowed]);

    const selectRelative = (offset: number) => setActiveIndex((index) => (index + offset + HOME_HERO_SLIDES.length) % HOME_HERO_SLIDES.length);
    const activeSlide = HOME_HERO_SLIDES[activeIndex];
    const activeCampaign = activeSlide.campaign ? messages.campaigns[activeSlide.campaign] : null;
    const openActiveSlide = () => (activeSlide.destination ? onOpenDestination(activeSlide.destination) : onExplore());

    return (
        <section
            ref={heroRef}
            className="ll-home-hero"
            style={copyHeight ? { minHeight: copyHeight } : undefined}
            data-locale={locale}
            data-campaign={activeSlide.campaign ?? "wan"}
            aria-label={messages.regionLabel}
            aria-roledescription="carousel"
            tabIndex={0}
            onKeyDown={(event) => {
                if (event.key === "ArrowLeft") {
                    event.preventDefault();
                    selectRelative(-1);
                }
                if (event.key === "ArrowRight") {
                    event.preventDefault();
                    selectRelative(1);
                }
            }}
        >
            <button type="button" className="ll-home-hero-stage" aria-label={activeCampaign?.cta ?? messages.slides[activeIndex]} onClick={openActiveSlide}>
                <span className="ll-home-hero-track">
                    {HOME_HERO_SLIDES.map((slide, index) => {
                        return (
                            <span key={slide.id} className={`ll-home-hero-slide${slide.campaign ? ` is-${slide.campaign}` : ""}${index === activeIndex ? " is-current" : ""}`} aria-hidden={index !== activeIndex}>
                                {slide.campaign ? (
                                    <HomeHeroCampaignMotion
                                        key={`${slide.id}-${index === activeIndex ? "active" : "idle"}`}
                                        campaign={slide.campaign}
                                        copy={messages.campaigns[slide.campaign]}
                                        locale={locale}
                                        active={index === activeIndex && !documentHidden}
                                        reducedMotion={reducedMotion}
                                        mediaReady={mediaReady}
                                        posterReady={index === activeIndex || (pageLoaded && index === (activeIndex + 1) % HOME_HERO_SLIDES.length)}
                                        onPlaybackComplete={completeActiveSlide}
                                    />
                                ) : slide.src ? (
                                    <img src={slide.src} alt={messages.slides[index]} loading="lazy" />
                                ) : null}
                            </span>
                        );
                    })}
                </span>
            </button>
            <button type="button" className="ll-home-hero-arrow is-previous" aria-label={messages.previousLabel} onClick={() => selectRelative(-1)}>
                <ArrowLeft aria-hidden />
            </button>
            <button type="button" className="ll-home-hero-arrow is-next" aria-label={messages.nextLabel} onClick={() => selectRelative(1)}>
                <ArrowRight aria-hidden />
            </button>
            <div className="ll-home-hero-dots" role="group" aria-label={messages.pickerLabel}>
                {HOME_HERO_SLIDES.map((slide, index) => (
                    <button key={slide.id} type="button" className={activeIndex === index ? "is-active" : ""} aria-label={messages.showSlideLabel(index + 1)} aria-pressed={activeIndex === index} onClick={() => setActiveIndex(index)}>
                        <span />
                    </button>
                ))}
            </div>
        </section>
    );
}

// Every rollout gets a new key: the videos previously returned 403 while their
// files were being repaired, and a stable URL lets a CDN retain that failure.
const HOME_HERO_MEDIA_VERSION = "home-video-20260916-3";
const homeHeroMedia = (assetPath: string) => `${assetPath}?v=${HOME_HERO_MEDIA_VERSION}`;

const HERO_MOTION_MEDIA = {
    siteLaunch: {
        video: homeHeroMedia("/yingce-campaigns/motion/site-launch-book-film-4k.mp4"),
        mobileVideo: homeHeroMedia("/yingce-campaigns/motion/site-launch-book-film-mobile.mp4"),
        poster: homeHeroMedia("/yingce-campaigns/motion/site-launch-book-film-poster-1600.webp"),
    },
} as const;

function HomeHeroCampaignMotion({
    campaign,
    copy,
    locale,
    active,
    reducedMotion,
    mediaReady,
    posterReady,
    onPlaybackComplete,
}: {
    campaign: HomeHeroCampaignKey;
    copy: HomeHeroCampaignMessage;
    locale: AppLocale;
    active: boolean;
    reducedMotion: boolean;
    mediaReady: boolean;
    posterReady: boolean;
    onPlaybackComplete: () => void;
}) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const completionRef = useRef(onPlaybackComplete);
    completionRef.current = onPlaybackComplete;

    useEffect(() => {
        if (!videoRef.current) return;
        const video = videoRef.current;
        if (active && mediaReady) {
            return startHomeHeroPlayback(video, {
                delayMs: campaign === "siteLaunch" ? 1180 : 0,
                onUnavailable: () => completionRef.current(),
            });
        }
        video.pause();
        video.load();
    }, [active, campaign, reducedMotion, mediaReady]);

    const setVideoRef = useCallback((element: HTMLVideoElement | null) => {
        videoRef.current = element;
    }, []);
    const titleSeparator = locale === "zh-CN" || locale === "ja-JP" ? "" : " ";
    const displayTitle = `${copy.title}${titleSeparator}${copy.artisticTitle}`;
    const isFirstBanner = campaign === "byokStudio";
    const completeActivePlayback = () => {
        if (active && !reducedMotion) onPlaybackComplete();
    };

    return (
        <span className={`ll-home-hero-motion is-${campaign}${active ? " is-active" : ""}${reducedMotion ? " is-reduced-motion" : ""}`}>
            <span className="ll-home-hero-art" aria-hidden="true">
                {campaign === "byokStudio" || campaign === "wan" ? (
                    <HomeHeroStill campaign={campaign} priority={isFirstBanner} videoRef={isFirstBanner ? setVideoRef : undefined} loadVideo={isFirstBanner && active && mediaReady} onPlaybackComplete={completeActivePlayback} />
                ) : null}
                {campaign === "siteLaunch" ? <SiteLaunchMotion videoRef={setVideoRef} loadVideo={active && mediaReady} showPoster={posterReady} onPlaybackComplete={completeActivePlayback} /> : null}
            </span>
            <span className="ll-home-hero-motion-copy" dir={isRtlAppLocale(locale) ? "rtl" : "ltr"}>
                <span className="ll-home-hero-motion-eyebrow">{copy.eyebrow}</span>
                <strong className="ll-home-hero-motion-title" lang={locale}>
                    {displayTitle}
                </strong>
                <span className="ll-home-hero-motion-meta">
                    <span>{copy.description}</span>
                    <span className="ll-home-hero-motion-cta">
                        {copy.cta}
                        <ArrowRight aria-hidden />
                    </span>
                </span>
            </span>
        </span>
    );
}

function SiteLaunchMotion({ videoRef, loadVideo, showPoster, onPlaybackComplete }: { videoRef: (element: HTMLVideoElement | null) => void; loadVideo: boolean; showPoster: boolean; onPlaybackComplete: () => void }) {
    const media = HERO_MOTION_MEDIA.siteLaunch;
    return (
        <>
            <span className="ll-home-launch-book" aria-hidden="true">
                <span className="ll-home-launch-media">
                    {/* This banner renders in a shallow viewport; use the existing 720p encode
                        instead of making first playback depend on a 22 MB 4K download. */}
                    <video ref={videoRef} muted playsInline preload="none" poster={showPoster ? media.poster : undefined} src={loadVideo ? media.mobileVideo : undefined} onEnded={onPlaybackComplete} />
                </span>
                <svg className="ll-home-launch-book-structure" viewBox="0 0 960 200" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="home-launch-page-edge" x1="0" x2="1">
                            <stop offset="0" stopColor="#77879a" stopOpacity="0.16" />
                            <stop offset="0.12" stopColor="#dce4ec" stopOpacity="0.88" />
                            <stop offset="1" stopColor="#f3f6f8" stopOpacity="0.48" />
                        </linearGradient>
                    </defs>
                    <path className="ll-home-launch-back-page" d="M80 18 Q463 4 916 15 L894 184 Q462 197 58 178 Z" />
                    <path className="ll-home-launch-page-shadow" d="M86 24 Q472 11 908 20 L886 179 Q465 189 65 173 Z" />
                    <path className="ll-home-launch-page-spine" d="M88 22 Q72 99 67 174" />
                    <path className="ll-home-launch-page-light" d="M92 27 Q471 14 902 23" />
                    <path className="ll-home-launch-registration" d="M742 31 h32 M758 15 v32" />
                    <circle className="ll-home-launch-record-cue" cx="907" cy="29" r="4" />
                    <text className="ll-home-launch-frame-label" x="83" y="192">
                        FRAME 01 / TAKE 01
                    </text>
                </svg>
                <svg className="ll-home-launch-turning-page" viewBox="0 0 960 200" preserveAspectRatio="none">
                    <path className="ll-home-launch-turn-sheet" d="M78 18 Q463 4 918 15 L896 184 Q464 198 58 178 Z" />
                    <path className="ll-home-launch-turn-edge" d="M84 24 Q470 11 910 20 L889 177 Q466 189 66 172 Z" />
                    <g className="ll-home-launch-story-sketch">
                        <path d="M172 53 h176 v78 H172z M196 112 l36-30 28 19 33-37 36 48" />
                        <path d="M387 41 h182 v84 H387z M409 104 c33-52 86-50 132 0 M458 61 v50" />
                        <path d="M608 34 h204 v96 H608z M631 108 l43-44 37 29 35-43 43 58" />
                        <path className="ll-home-launch-sketch-note" d="M172 146 h123 M386 141 h152 M609 145 h109" />
                        <path className="ll-home-launch-vermilion-stroke" d="M137 155 C245 130 339 143 430 111 C524 79 621 94 739 52" />
                    </g>
                    <path className="ll-home-launch-paper-curl" d="M78 18 Q62 101 58 178 Q81 162 105 151" />
                </svg>
            </span>
            <svg className="ll-home-hero-motion-svg ll-home-launch-editorial" viewBox="0 0 1600 200" preserveAspectRatio="none" aria-hidden="true">
                <path className="ll-home-launch-corner is-a" d="M48 48 V26 H72" />
                <path className="ll-home-launch-corner is-b" d="M1549 151 v23 h-25" />
                <path className="ll-home-launch-timing-mark" d="M666 164 h38 M714 164 h12" />
            </svg>
            <span className="ll-home-launch-progress" aria-hidden="true">
                <i />
            </span>
        </>
    );
}

function HomeAgent({
    assetsHref,
    skillsHref,
    onPrompt,
    showOnboarding,
    onDismissOnboarding,
}: {
    assetsHref: string;
    skillsHref: string;
    onPrompt: (prompt: string, files: File[], mode: CreationMode, settings?: HomeGenerationSettings) => Promise<void>;
    showOnboarding?: boolean;
    onDismissOnboarding?: () => void;
}) {
    const { t, number } = useI18n();
    const config = useConfigStore((state) => state.config);
    const updateConfig = useConfigStore((state) => state.updateConfig);
    const creditsEnabled = useUserStore((state) => state.features.creditsEnabled);
    const userId = useUserStore((state) => state.user?.id);
    const { availableMicrocredits } = useWalletBalance(userId, creditsEnabled);
    const [prompt, setPrompt] = useState("");
    const [promptHeight, setPromptHeight] = useState(20);
    const resizePrompt = useCallback((height: number) => setPromptHeight(Math.max(20, Math.min(120, height))), []);
    const [attachmentsOpen, setAttachmentsOpen] = useState(false);
    const [attachments, setAttachments] = useState<File[]>([]);
    const [mode, setMode] = useState<CreationMode>("video");
    const [submitting, setSubmitting] = useState(false);
    const [activeSkillInfo, setActiveSkillInfo] = useState<(typeof AGENT_STARTERS)[number] | null>(null);
    const [previewedAttachment, setPreviewedAttachment] = useState<{ name: string; url: string } | null>(null);
    const [modelQuote, setModelQuote] = useState<ModelCatalogQuote | null>(null);
    const [quotePending, setQuotePending] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const preferredModel = mode === "text" ? config.textModel : mode === "image" ? config.imageModel : config.videoModel;
    const imageProfile = useMemo(() => modelCapabilityConfigFor(config, config.imageModel).image!, [config, config.imageModel]);
    const videoProfile = useMemo(() => modelCapabilityConfigFor(config, config.videoModel).video!, [config, config.videoModel]);
    const [imageSettings, setImageSettings] = useState({ size: "", quality: "", count: "" });
    const [videoSettings, setVideoSettings] = useState({ ratio: "", resolution: "", seconds: "" });
    const normalizedImageSettings = useMemo(() => normalizeImageValue(imageProfile, imageSettings), [imageProfile, imageSettings]);
    const normalizedVideoSettings = useMemo(() => normalizeVideoValue(videoProfile, videoSettings), [videoProfile, videoSettings]);
    const imageAttachmentCount = attachments.filter((file) => homeAttachmentKind(file) === "image").length;
    // Per-kind reference limits of the selected model; text mode forwards everything to the Agent.
    const referenceLimits = useMemo<Record<HomeAttachmentKind, number>>(
        () =>
            mode === "text"
                ? { image: Number.POSITIVE_INFINITY, video: Number.POSITIVE_INFINITY, audio: Number.POSITIVE_INFINITY, file: Number.POSITIVE_INFINITY }
                : mode === "image"
                  ? { image: imageProfile.references.maxImages, video: 0, audio: 0, file: 0 }
                  : {
                        image: videoProfile.operations.includes("image_to_video") ? videoProfile.references.maxImages : 0,
                        video: videoProfile.references.maxVideos,
                        audio: videoProfile.references.maxAudios,
                        // Documents are read by the text Agent only (same rule as the create page).
                        file: 0,
                    },
        [imageProfile, mode, videoProfile],
    );
    const attachmentCounts = useMemo(() => countHomeAttachments(attachments), [attachments]);
    const canAttach = HOME_ATTACHMENT_KINDS.some((kind) => referenceLimits[kind] > 0);
    const acceptedTypes = HOME_ATTACHMENT_KINDS.filter((kind) => referenceLimits[kind] > 0)
        .map((kind) => HOME_ATTACHMENT_ACCEPT[kind])
        .join(",");
    const attachmentInput = useMemo(
        () => ({
            textCount: prompt.trim() ? 1 : 0,
            imageCount: imageAttachmentCount,
            videoCount: attachments.filter((file) => file.type.startsWith("video/")).length,
            audioCount: attachments.filter((file) => file.type.startsWith("audio/")).length,
            characterCount: 0,
        }),
        [attachments, imageAttachmentCount, prompt],
    );
    const quoteConfig = useMemo(
        () => ({
            ...config,
            size: normalizedImageSettings.size,
            quality: normalizedImageSettings.quality,
            count: normalizedImageSettings.count,
            videoSeconds: normalizedVideoSettings.seconds,
            vquality: normalizedVideoSettings.resolution.replace(/p$/i, ""),
        }),
        [config, normalizedImageSettings, normalizedVideoSettings],
    );
    const quoteRequirements = useMemo(
        () => ({
            capability: mode,
            input: attachmentInput,
            videoSeconds: mode === "video" ? normalizedVideoSettings.seconds : undefined,
            imageSize: mode === "image" ? normalizedImageSettings.size : undefined,
            options:
                mode === "image"
                    ? { size: normalizedImageSettings.size, quality: normalizedImageSettings.quality, count: Number(normalizedImageSettings.count) }
                    : mode === "video"
                      ? { size: normalizedVideoSettings.ratio, videoSeconds: Number(normalizedVideoSettings.seconds), vquality: normalizedVideoSettings.resolution.replace(/p$/i, "") }
                      : {},
        }),
        [attachmentInput, mode, normalizedImageSettings, normalizedVideoSettings],
    );
    const quoteRequest = useMemo(() => (creditsEnabled && mode !== "text" ? modelQuoteRequest(quoteConfig, preferredModel, mode, quoteRequirements) : undefined), [creditsEnabled, mode, preferredModel, quoteConfig, quoteRequirements]);
    const attachmentPreviews = useMemo(
        () =>
            attachments.map((file) => ({
                file,
                url: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
            })),
        [attachments],
    );
    const mentionReferences = useMemo(() => homeMentionReferences(attachmentPreviews), [attachmentPreviews]);

    useEffect(
        () => () =>
            attachmentPreviews.forEach((attachment) => {
                if (attachment.url) URL.revokeObjectURL(attachment.url);
            }),
        [attachmentPreviews],
    );

    useEffect(() => {
        if (!quoteRequest) {
            setModelQuote(null);
            setQuotePending(false);
            return;
        }
        const controller = new AbortController();
        setModelQuote(null);
        setQuotePending(true);
        quoteModelCatalog(quoteRequest, controller.signal)
            .then((payload) => setModelQuote(payload.quote))
            .catch(() => {
                if (!controller.signal.aborted) setModelQuote(null);
            })
            .finally(() => {
                if (!controller.signal.aborted) setQuotePending(false);
            });
        return () => controller.abort();
    }, [quoteRequest]);

    const selectMode = (nextMode: CreationMode) => {
        setMode(nextMode);
        const availableModels = selectableModelsByCapability(config, nextMode);
        const field = nextMode === "text" ? "textModel" : nextMode === "image" ? "imageModel" : "videoModel";
        const selected = nextMode === "text" ? config.textModel : nextMode === "image" ? config.imageModel : config.videoModel;
        if (!availableModels.includes(selected) && availableModels[0]) updateConfig(field, availableModels[0]);
    };

    const selectStarter = (starter: (typeof AGENT_STARTERS)[number], index: number) => {
        setPrompt(`@${t(starter.labelKey)} ${t(starter.promptKey)}`);
        setActiveSkillInfo(index === 2 ? starter : null);
        window.requestAnimationFrame(() => inputRef.current?.focus());
    };

    const addLocalAttachments = (files: FileList | null) => {
        const counts = { ...attachmentCounts };
        const next = Array.from(files || []).filter((file) => {
            const kind = homeAttachmentKind(file);
            if (!kind || counts[kind] >= referenceLimits[kind]) return false;
            counts[kind] += 1;
            return true;
        });
        if (next.length) setAttachments((current) => [...current, ...next]);
        setAttachmentsOpen(false);
    };

    // Removing an attachment renumbers later ones of the same kind, so keep
    // prompt mentions pointing at the same files and drop the removed one.
    const removeAttachment = (index: number) => {
        const nextAttachments = attachments.filter((_, itemIndex) => itemIndex !== index);
        const before = homeMentionReferences(attachments.map((file) => ({ file, url: "" })));
        const after = homeMentionReferences(nextAttachments.map((file) => ({ file, url: "" })));
        const labelFor = new Map(after.map((reference, position) => [nextAttachments[position], reference.label]));
        setPrompt((current) =>
            relabelHomeMentions(
                current,
                before.map((reference, position) => [reference.label, position === index ? "" : labelFor.get(attachments[position]) || ""]),
            ),
        );
        setAttachments(nextAttachments);
    };

    const quoteAmount = modelQuote ? number(modelQuote.amountMicrocredits / 1_000_000, { maximumFractionDigits: 2 }) : "";
    const quoteRate = modelQuote?.billingMode === "per_second" && modelQuote.quantity > 0 ? number(modelQuote.amountMicrocredits / 1_000_000 / modelQuote.quantity, { maximumFractionDigits: 2 }) : "";
    const quoteBreakdown = quoteRate && modelQuote ? `${quoteRate} ${t("modelPickerPrice.perSecond")} × ${number(modelQuote.quantity)} ${t("modelPickerPrice.second")}` : "";
    const quoteTitle = modelQuote ? [quoteBreakdown, t(modelQuote.estimated ? "modelPickerPrice.estimatedCost" : "modelPickerPrice.cost", { amount: quoteAmount })].filter(Boolean).join(" = ") : undefined;
    // Personal wallet only hints before submit; the server still decides with team balances and reservations.
    const creditsShort = Boolean(modelQuote && availableMicrocredits !== null && modelQuote.amountMicrocredits > availableMicrocredits);
    const tooManyReferences = HOME_ATTACHMENT_KINDS.some((kind) => attachmentCounts[kind] > referenceLimits[kind]);
    const submitPrompt = () => {
        if (submitting || tooManyReferences || (!prompt.trim() && !attachments.length)) return;
        if (showOnboarding) {
            onDismissOnboarding?.();
        }
        setSubmitting(true);
        void onPrompt(prompt.trim() || t("homeShowcase.starter.defaultPrompt"), attachments, mode, submissionSettings).finally(() => setSubmitting(false));
    };
    const submissionSettings: HomeGenerationSettings | undefined = mode === "video" ? normalizedVideoSettings : mode === "image" ? normalizedImageSettings : undefined;

    return (
        <section className="ll-home-agent" aria-labelledby="ll-home-agent-title">
            <h2 id="ll-home-agent-title" className="ll-home-sr-only">
                {t("scriptEditor.direct")}
            </h2>
            <div className="ll-home-agent-panel">
                {attachments.length ? (
                    <div className="ll-home-agent-attachments" aria-label={t("homeShowcase.selectedAttachments")}>
                        <div className="ll-home-agent-attachment-track">
                            {attachmentPreviews.map(({ file, url }, index) => {
                                const kind = homeAttachmentKind(file);
                                const Icon = kind === "video" ? Video : kind === "audio" ? Music2 : kind === "file" ? FileText : Images;
                                return (
                                    <div className="ll-home-agent-attachment" key={homeAttachmentKey(file)} title={`@${mentionReferences[index]?.label ?? ""} ${file.name}`}>
                                        {url ? (
                                            <button type="button" className="ll-home-agent-attachment-preview" aria-label={file.name} onClick={() => setPreviewedAttachment({ name: file.name, url })}>
                                                <img src={url} alt="" />
                                            </button>
                                        ) : (
                                            <span className={`ll-home-agent-attachment-icon is-${kind}`} aria-hidden>
                                                <Icon />
                                            </span>
                                        )}
                                        <span className="ll-home-agent-attachment-name">{file.name}</span>
                                        <button type="button" className="ll-home-agent-attachment-remove" aria-label={t("homeShowcase.removeAttachment", { name: file.name })} onClick={() => removeAttachment(index)}>
                                            <X aria-hidden />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : null}
                {showOnboarding ? (
                    <div className="ll-home-agent-prompts" role="group" aria-label={t("homeShowcase.onboarding.startHere")}>
                        {[
                            { labelKey: "homeShowcase.onboarding.prompt1Label" as MessageKey, promptKey: "homeShowcase.onboarding.prompt1Text" as MessageKey },
                            { labelKey: "homeShowcase.onboarding.prompt2Label" as MessageKey, promptKey: "homeShowcase.onboarding.prompt2Text" as MessageKey },
                            { labelKey: "homeShowcase.onboarding.prompt3Label" as MessageKey, promptKey: "homeShowcase.onboarding.prompt3Text" as MessageKey },
                        ].map(({ labelKey, promptKey }) => (
                            <button
                                key={labelKey}
                                type="button"
                                className="ll-home-agent-prompt-btn"
                                onClick={() => {
                                    const text = t(promptKey);
                                    setPrompt(text);
                                    onDismissOnboarding?.();
                                    window.requestAnimationFrame(() => inputRef.current?.focus());
                                }}
                            >
                                <span>{t(labelKey)}</span>
                            </button>
                        ))}
                    </div>
                ) : null}
                <form
                    className="ll-home-agent-composer"
                    onSubmit={(event) => {
                        event.preventDefault();
                        submitPrompt();
                    }}
                >
                    <button type="button" className="ll-home-agent-attach" aria-label={t("homeShowcase.addAttachment")} aria-expanded={attachmentsOpen} disabled={!canAttach} onClick={() => setAttachmentsOpen((open) => !open)}>
                        <Plus aria-hidden />
                    </button>
                    <CanvasResourceMentionTextarea
                        ref={inputRef}
                        value={prompt}
                        references={mentionReferences}
                        onChange={(nextValue) => {
                            setPrompt(nextValue);
                            if (showOnboarding && nextValue.trim()) {
                                onDismissOnboarding?.();
                            }
                        }}
                        onSubmit={submitPrompt}
                        rows={1}
                        mentionMenuWidth={320}
                        containerClassName="ll-home-agent-input"
                        onContentSizeChange={resizePrompt}
                        style={{ height: promptHeight, color: "var(--ll-text)" }}
                        placeholder={t(attachments.length ? "homeShowcase.agentPlaceholderMention" : "homeShowcase.agentPlaceholder")}
                        aria-label={t("homeShowcase.agentPlaceholder")}
                    />
                    <input
                        ref={fileInputRef}
                        className="ll-home-agent-file-input"
                        type="file"
                        accept={acceptedTypes}
                        multiple
                        tabIndex={-1}
                        onChange={(event) => {
                            addLocalAttachments(event.target.files);
                            event.currentTarget.value = "";
                        }}
                    />
                    <button type="submit" className="ll-home-agent-send" aria-label={t("homeShowcase.sendPrompt")} disabled={submitting || tooManyReferences || (!prompt.trim() && !attachments.length)}>
                        <ArrowUp aria-hidden />
                    </button>
                    {attachmentsOpen ? (
                        <span className="ll-home-agent-popover" role="dialog" aria-label={t("homeShowcase.attachMethods")}>
                            <button type="button" onClick={() => fileInputRef.current?.click()}>
                                {t("homeShowcase.localUpload")}
                            </button>
                            <Link to={assetsHref}>{t("homeShowcase.libraryAdd")}</Link>
                        </span>
                    ) : null}
                </form>
                <div className="ll-home-agent-mode-rail" aria-label={t("homeShowcase.chooseMode")}>
                    {(
                        [
                            { value: "video", labelKey: "homeShowcase.mode.video" as MessageKey, icon: Film },
                            { value: "image", labelKey: "homeShowcase.mode.image" as MessageKey, icon: Images },
                            { value: "text", labelKey: "homeShowcase.mode.text" as MessageKey, icon: MessageSquareText },
                        ] as const
                    ).map(({ value, labelKey, icon: Icon }) => (
                        <button key={value} type="button" className={mode === value ? "is-active" : ""} aria-pressed={mode === value} onClick={() => selectMode(value)}>
                            <Icon aria-hidden /> {t(labelKey)}
                        </button>
                    ))}
                    <ModelPicker
                        config={config}
                        value={preferredModel}
                        capability={mode}
                        onChange={(model) => updateConfig(mode === "text" ? "textModel" : mode === "image" ? "imageModel" : "videoModel", model)}
                        className="ll-home-agent-model-picker"
                        placeholder={t(mode === "text" ? "creationComposer.textModel" : mode === "image" ? "creationComposer.imageModel" : "creationComposer.videoModel")}
                        showSelectedPrice={false}
                    />
                    {mode === "video" || mode === "image" ? (
                        <HomeOutputSettings
                            mode={mode}
                            imageProfile={imageProfile}
                            imageSettings={normalizedImageSettings}
                            setImageSettings={setImageSettings}
                            videoProfile={videoProfile}
                            videoSettings={normalizedVideoSettings}
                            setVideoSettings={setVideoSettings}
                        />
                    ) : null}
                    {creditsEnabled && (quotePending || modelQuote) ? (
                        <span className="ll-home-agent-quote" title={quoteTitle} aria-live="polite">
                            {quoteRate ? (
                                <span className="ll-home-agent-quote-rate">
                                    {quoteRate}/{t("modelPickerPrice.second")}
                                </span>
                            ) : null}
                            <Coins aria-hidden />
                            {quotePending ? <span>…</span> : <span>{quoteAmount}</span>}
                        </span>
                    ) : null}
                </div>
                {creditsShort && availableMicrocredits !== null ? (
                    <p className="ll-home-credit-warning" role="status">
                        {t("canvasPrompt.insufficientCredits", { credits: quoteAmount, balance: number(availableMicrocredits / 1_000_000, { maximumFractionDigits: 2 }) })}
                    </p>
                ) : null}
                <div className="ll-home-agent-starters" aria-label={t("homeShowcase.recommended")}>
                    {AGENT_STARTERS.map((starter, index) => (
                        <button key={starter.labelKey} type="button" aria-label={t("homeShowcase.chooseDirection", { label: t(starter.labelKey) })} onClick={() => selectStarter(starter, index)}>
                            <img src={starter.src} alt="" loading="lazy" decoding="async" />
                            <span>{t(starter.labelKey)}</span>
                            <small>{t(starter.hintKey)}</small>
                        </button>
                    ))}
                    <Link to={skillsHref} aria-label={t("homeShowcase.openSkills")}>
                        <WandSparkles aria-hidden />
                    </Link>
                </div>
                {activeSkillInfo ? (
                    <aside className="ll-home-agent-skill-info" aria-label={t("homeShowcase.skillInfo", { label: t(activeSkillInfo.labelKey) })}>
                        <strong>{t(activeSkillInfo.labelKey)}</strong>
                        <span>{t(activeSkillInfo.promptKey)}</span>
                        <button type="button" aria-label={t("homeShowcase.closeSkillInfo")} onClick={() => setActiveSkillInfo(null)}>
                            <X aria-hidden />
                        </button>
                    </aside>
                ) : null}
            </div>
            <Modal open={Boolean(previewedAttachment)} title={previewedAttachment?.name} footer={null} onCancel={() => setPreviewedAttachment(null)} className="ll-home-agent-preview-modal">
                {previewedAttachment ? <img src={previewedAttachment.url} alt={previewedAttachment.name} /> : null}
            </Modal>
        </section>
    );
}

function HomeOutputSettings({
    mode,
    imageProfile,
    imageSettings,
    setImageSettings,
    videoProfile,
    videoSettings,
    setVideoSettings,
}: {
    mode: "image" | "video";
    imageProfile: ImageCapabilityConfig;
    imageSettings: { size: string; quality: string; count: string };
    setImageSettings: Dispatch<SetStateAction<{ size: string; quality: string; count: string }>>;
    videoProfile: VideoCapabilityConfig;
    videoSettings: { ratio: string; resolution: string; seconds: string };
    setVideoSettings: Dispatch<SetStateAction<{ ratio: string; resolution: string; seconds: string }>>;
}) {
    const { t, number } = useI18n();
    const [open, setOpen] = useState(false);
    const imageSizes = imageProfile.size.parameter === "none" ? [] : imageProfile.size.values.filter(Boolean);
    const qualityLabel = (value: string) =>
        value === "auto" ? t("creationSettings.auto") : value === "low" ? t("creationSettings.low") : value === "medium" ? t("creationSettings.medium") : value === "high" ? t("creationSettings.high") : value.toUpperCase();
    const summary =
        mode === "video"
            ? [videoSettings.ratio, videoSettings.resolution, `${number(Number(videoSettings.seconds))}s`].filter(Boolean).join(" · ")
            : [imageSettings.size, imageProfile.quality.supported ? qualityLabel(imageSettings.quality) : "", imageProfile.maxOutputs > 1 ? t("creationSettings.images", { count: number(Number(imageSettings.count)) }) : ""].filter(Boolean).join(" · ");
    const settingsPanel =
        mode === "video" ? (
            <div className="ll-home-agent-settings-panel">
                {videoProfile.ratios.length ? (
                    <HomeSettingSection title={t("creationSettings.frame")} value={videoSettings.ratio}>
                        <div className="ll-home-agent-setting-grid is-ratio">
                            {videoProfile.ratios.map((value) => (
                                <button key={value} type="button" className={value === videoSettings.ratio ? "is-selected" : ""} aria-pressed={value === videoSettings.ratio} onClick={() => setVideoSettings((current) => ({ ...current, ratio: value }))}>
                                    {value}
                                </button>
                            ))}
                        </div>
                    </HomeSettingSection>
                ) : null}
                {videoProfile.resolutions.length ? (
                    <HomeSettingSection title={t("creationSettings.definition")} value={videoSettings.resolution}>
                        <div className="ll-home-agent-setting-grid">
                            {videoProfile.resolutions.map((value) => (
                                <button
                                    key={value}
                                    type="button"
                                    disabled={!videoSelectionAllowed(videoProfile, value, Number(videoSettings.seconds))}
                                    className={value === videoSettings.resolution ? "is-selected" : ""}
                                    aria-pressed={value === videoSettings.resolution}
                                    onClick={() => setVideoSettings((current) => ({ ...current, resolution: value }))}
                                >
                                    {value}
                                </button>
                            ))}
                        </div>
                    </HomeSettingSection>
                ) : null}
                <HomeSettingSection title={t("creationSettings.duration")} value={t("creationSettings.secondsCount", { count: number(Number(videoSettings.seconds)) })}>
                    <div className="ll-home-agent-setting-grid">
                        {videoDurationOptions(videoProfile).map((value) => (
                            <button
                                key={value}
                                type="button"
                                disabled={!videoSelectionAllowed(videoProfile, videoSettings.resolution, value)}
                                className={String(value) === videoSettings.seconds ? "is-selected" : ""}
                                aria-pressed={String(value) === videoSettings.seconds}
                                onClick={() => setVideoSettings((current) => ({ ...current, seconds: String(value) }))}
                            >
                                {number(value)}s
                            </button>
                        ))}
                    </div>
                </HomeSettingSection>
            </div>
        ) : (
            <div className="ll-home-agent-settings-panel">
                {imageSizes.length ? (
                    <HomeSettingSection title={t("creationSettings.frame")} value={imageSettings.size}>
                        <div className="ll-home-agent-setting-grid is-ratio">
                            {imageSizes.map((value) => (
                                <button key={value} type="button" className={value === imageSettings.size ? "is-selected" : ""} aria-pressed={value === imageSettings.size} onClick={() => setImageSettings((current) => ({ ...current, size: value }))}>
                                    {value}
                                </button>
                            ))}
                        </div>
                        {imageProfile.size.allowCustom ? (
                            <label className="ll-home-agent-custom-setting">
                                <span>{t("creationSettings.dimensions")}</span>
                                <input
                                    value={imageSettings.size}
                                    onChange={(event) => setImageSettings((current) => ({ ...current, size: event.target.value }))}
                                    placeholder={t("creationSettings.sizeExample")}
                                    aria-label={t("creationSettings.customSize")}
                                />
                            </label>
                        ) : null}
                    </HomeSettingSection>
                ) : null}
                {imageProfile.quality.supported ? (
                    <HomeSettingSection title={t("creationSettings.quality")} value={qualityLabel(imageSettings.quality)}>
                        <div className="ll-home-agent-setting-grid">
                            {imageProfile.quality.values.map((value) => (
                                <button
                                    key={value}
                                    type="button"
                                    className={value === imageSettings.quality ? "is-selected" : ""}
                                    aria-pressed={value === imageSettings.quality}
                                    onClick={() => setImageSettings((current) => ({ ...current, quality: value }))}
                                >
                                    {qualityLabel(value)}
                                </button>
                            ))}
                        </div>
                    </HomeSettingSection>
                ) : null}
                {imageProfile.maxOutputs > 1 ? (
                    <HomeSettingSection title={t("creationSettings.count")} value={t("creationSettings.images", { count: number(Number(imageSettings.count)) })}>
                        <div className="ll-home-agent-setting-grid">
                            {Array.from({ length: imageProfile.maxOutputs }, (_, index) => String(index + 1)).map((value) => (
                                <button key={value} type="button" className={value === imageSettings.count ? "is-selected" : ""} aria-pressed={value === imageSettings.count} onClick={() => setImageSettings((current) => ({ ...current, count: value }))}>
                                    {value}
                                </button>
                            ))}
                        </div>
                    </HomeSettingSection>
                ) : null}
            </div>
        );
    return (
        <Popover
            open={open}
            onOpenChange={setOpen}
            trigger="click"
            placement="bottom"
            autoAdjustOverflow
            arrow={false}
            classNames={{ root: "ll-home-agent-settings-popover", container: "ll-home-agent-settings-popover-surface", content: "ll-home-agent-settings-popover-content" }}
            content={settingsPanel}
        >
            <button type="button" className="ll-home-agent-output-settings" aria-label={t("creationSettings.settings", { summary })} aria-expanded={open}>
                <SlidersHorizontal aria-hidden />
                <span>{summary}</span>
                <ChevronDown className={open ? "is-open" : ""} aria-hidden />
            </button>
        </Popover>
    );
}

function HomeSettingSection({ title, value, children }: { title: string; value: string; children: ReactNode }) {
    return (
        <section className="ll-home-agent-setting-section">
            <header>
                <h3>{title}</h3>
                <span>{value}</span>
            </header>
            {children}
        </section>
    );
}

async function homeAttachmentAsset(file: File) {
    if (file.type.startsWith("image/")) {
        const { uploadImage } = await import("@/services/image-storage");
        const uploaded = await uploadImage(file);
        return creationImageAsset({ title: file.name, uploaded, metadata: { source: "home-agent", fileName: file.name } });
    }
    if (file.type.startsWith("video/")) {
        const { uploadMediaFile } = await import("@/services/file-storage");
        const uploaded = await uploadMediaFile(file, "home-agent-video");
        return creationVideoAsset({ title: file.name, uploaded, metadata: { source: "home-agent", fileName: file.name } });
    }
    if (file.type.startsWith("audio/")) {
        const { uploadMediaFile } = await import("@/services/file-storage");
        const uploaded = await uploadMediaFile(file, "home-agent-audio");
        return creationAudioAsset({ title: file.name, uploaded, metadata: { source: "home-agent", fileName: file.name } });
    }
    throw new Error(`Unsupported file: ${file.name}`);
}

function CreatorBadge({ kind }: { kind: WesternCreatorBadgeKind }) {
    const { t } = useI18n();
    const badge = CREATOR_BADGES[kind];
    const Icon = badge.icon;
    return (
        <span className={`ll-home-creator-badge is-${kind}`} role="img" aria-label={t(badge.labelKey)} title={t(badge.labelKey)}>
            <Icon aria-hidden />
        </span>
    );
}

function ShowCard({ item, allowPreview }: { item: ShowItem; allowPreview: boolean }) {
    const { t } = useI18n();
    const { locale } = splitLocaleAndPath(useLocation().pathname);
    const detailHref = localizedPublicPath(item.detailHref, locale);
    const [previewActive, setPreviewActive] = useState(false);
    const [previewFailed, setPreviewFailed] = useState(false);
    const [useOriginalPreview, setUseOriginalPreview] = useState(false);
    const previewSource = useOriginalPreview ? item.videoSrc : item.previewVideoSrc || item.videoSrc;
    const videoRef = useRef<HTMLVideoElement>(null);
    const previewActiveRef = useRef(false);
    const handlePreviewFailure = useCallback(() => {
        if (!useOriginalPreview && item.previewVideoSrc && item.previewVideoSrc !== item.videoSrc) setUseOriginalPreview(true);
        else setPreviewFailed(true);
    }, [useOriginalPreview, item.previewVideoSrc, item.videoSrc]);

    const requestPreviewPlayback = useCallback(() => {
        const video = videoRef.current;
        if (!allowPreview || document.hidden || !previewActiveRef.current || !video || video.error || !video.paused) return;
        requestPreviewPlaybackSafely(video, () => allowPreview && !document.hidden && previewActiveRef.current && video === videoRef.current, handlePreviewFailure);
    }, [allowPreview, handlePreviewFailure]);

    useEffect(() => {
        previewActiveRef.current = previewActive;
        const video = videoRef.current;
        if (previewActive) requestPreviewPlayback();
        else video?.pause();
        return () => {
            previewActiveRef.current = false;
            video?.pause();
        };
    }, [previewActive, requestPreviewPlayback]);

    useEffect(() => {
        const onVisibilityChange = () => {
            if (document.hidden) videoRef.current?.pause();
            else requestPreviewPlayback();
        };
        document.addEventListener("visibilitychange", onVisibilityChange);
        return () => document.removeEventListener("visibilitychange", onVisibilityChange);
    }, [requestPreviewPlayback]);

    const activatePreview = () => {
        preloadShowcaseDetail();
        previewActiveRef.current = true;
        setUseOriginalPreview(false);
        setPreviewFailed(false);
        setPreviewActive(true);
    };

    const deactivatePreview = () => {
        previewActiveRef.current = false;
        setPreviewActive(false);
    };

    const onBlur = (event: FocusEvent<HTMLElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) deactivatePreview();
    };

    const content = (
        <>
            <span className="ll-home-card-media">
                <img src={item.cardSrc} alt={item.title} loading="lazy" decoding="async" />
                {previewActive && allowPreview && item.videoSrc && !previewFailed ? (
                    <video
                        ref={videoRef}
                        key={previewSource}
                        data-home-preview-video={item.id}
                        src={previewSource}
                        poster={item.cardSrc}
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        aria-label={t("homeShowcase.videoPreview", { title: item.title })}
                        onCanPlay={requestPreviewPlayback}
                        onError={handlePreviewFailure}
                    />
                ) : null}
                {item.videoSrc ? (
                    <span className="ll-home-card-preview-badge">
                        <Film aria-hidden />
                        {previewFailed ? t("homeShowcase.previewUnavailable") : t("homeShowcase.hoverPlay")}
                    </span>
                ) : null}
            </span>
            <span className="ll-home-card-body">
                <span className="ll-home-card-author">
                    <span className="ll-home-card-avatar" aria-hidden>{item.author.slice(0, 1).toLocaleUpperCase()}</span>
                    <span>{item.author}</span>
                    <CreatorBadge kind={item.creatorBadge} />
                </span>
                <strong>{item.title}</strong>
                <small>{item.description}</small>
            </span>
        </>
    );

    return (
        <article
            className={`ll-home-card ${previewActive ? "is-previewing" : ""}`}
            data-home-work-id={item.id}
            data-home-work-kind="showcase"
            onMouseEnter={activatePreview}
            onMouseLeave={deactivatePreview}
            onFocusCapture={activatePreview}
            onBlurCapture={onBlur}
        >
            <a className="ll-home-card-detail" href={detailHref} target="_blank" rel="noopener noreferrer" aria-label={t("homeShowcase.openInNewTab", { title: item.title })} onPointerDown={preloadShowcaseDetail}>
                {content}
            </a>
            <Link className="ll-home-card-process" to={item.processHref} aria-label={t("homeShowcase.processLinkAria", { process: t(PROCESS_LABEL_KEYS[item.processLabel] as Parameters<ReturnType<typeof useI18n>["t"]>[0]), title: item.title })}>
                <span>{t(PROCESS_LABEL_KEYS[item.processLabel] as Parameters<ReturnType<typeof useI18n>["t"]>[0])}</span>
                <ArrowRight aria-hidden />
            </Link>
        </article>
    );
}

function useReducedMotionPreference() {
    const [reducedMotion, setReducedMotion] = useState(() => (typeof window === "undefined" ? false : window.matchMedia("(prefers-reduced-motion: reduce)").matches));
    useEffect(() => {
        const media = window.matchMedia("(prefers-reduced-motion: reduce)");
        const onChange = () => setReducedMotion(media.matches);
        onChange();
        media.addEventListener("change", onChange);
        return () => media.removeEventListener("change", onChange);
    }, []);
    return reducedMotion;
}

/** The site footer closes the whole page below the content column — never inside the FAQ block. */
function HomeSiteFooter() {
    const location = useLocation();
    const { locale } = splitLocaleAndPath(location.pathname);
    return <SiteFooter locale={locale} />;
}

function HomeGeoFaqSection() {
    const { t } = useI18n();
    const location = useLocation();
    const { locale } = splitLocaleAndPath(location.pathname);
    const [openIdx, setOpenIdx] = useState<number | null>(0);

    const faqs = [
        { q: t("homeShowcase.faq.q1" as MessageKey), a: t("homeShowcase.faq.a1" as MessageKey) },
        { q: t("homeShowcase.faq.q2" as MessageKey), a: t("homeShowcase.faq.a2" as MessageKey) },
        { q: t("homeShowcase.faq.q3" as MessageKey), a: t("homeShowcase.faq.a3" as MessageKey) },
        { q: t("homeShowcase.faq.q4" as MessageKey), a: t("homeShowcase.faq.a4" as MessageKey) },
        { q: BYOK_RELAY_COPY[locale].question, a: BYOK_RELAY_COPY[locale].answer },
    ];

    const toggle = (idx: number) => {
        setOpenIdx((prev) => (prev === idx ? null : idx));
    };

    return (
        <section className="ll-home-geo-section" aria-labelledby="ll-geo-faq-heading">
            <div className="ll-home-geo-container">
                <header className="ll-home-geo-header">
                    <span className="ll-home-geo-tag">FAQ</span>
                    <h2 id="ll-geo-faq-heading">{t("homeShowcase.faq.title" as MessageKey)}</h2>
                </header>

                <div className="ll-home-geo-accordion">
                    {faqs.map((faq, idx) => {
                        const isOpen = openIdx === idx;
                        return (
                            <article key={idx} className={`ll-home-geo-item ${isOpen ? "is-open" : ""}`}>
                                <button type="button" className="ll-home-geo-trigger" aria-expanded={isOpen} onClick={() => toggle(idx)}>
                                    <h3>{faq.q}</h3>
                                    <ChevronDown className={`ll-home-geo-chevron ${isOpen ? "is-rotated" : ""}`} aria-hidden />
                                </button>
                                <div className="ll-home-geo-panel" style={{ display: isOpen ? "block" : "none" }}>
                                    <p>{faq.a}</p>
                                    {idx === 0 ? <p className="ll-home-usage-note">{t("homeShowcase.usageNote")}</p> : null}
                                </div>
                            </article>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

function HomeByokShowcase({ pricingHref }: { pricingHref: string }) {
    const { t } = useI18n();
    return (
        <section className="ll-home-byok-showcase" aria-labelledby="ll-byok-showcase-title">
            <div className="ll-home-byok-container">
                <div className="ll-home-byok-glow" aria-hidden />
                <div className="ll-home-byok-body">
                    <div className="ll-home-byok-content">
                        <header className="ll-home-byok-header">
                            <span className="ll-home-byok-badge">
                                <Sparkles className="ll-home-byok-sparkle" aria-hidden />
                                {t("homeShowcase.byokBanner.tag" as MessageKey)}
                            </span>
                            <h2 id="ll-byok-showcase-title">{t("homeShowcase.byokBanner.title" as MessageKey)}</h2>
                            <p className="ll-home-byok-desc">{t("homeShowcase.byokBanner.desc" as MessageKey)}</p>
                        </header>

                        <div className="ll-home-byok-cards">
                            <div className="ll-home-byok-card">
                                <strong>⚡ {t("homeShowcase.byokBanner.pill1" as MessageKey)}</strong>
                                <p>{t("homeShowcase.byokBanner.pill1Desc" as MessageKey)}</p>
                            </div>
                            <div className="ll-home-byok-card">
                                <strong>🎬 {t("homeShowcase.byokBanner.pill2" as MessageKey)}</strong>
                                <p>{t("homeShowcase.byokBanner.pill2Desc" as MessageKey)}</p>
                            </div>
                            <div className="ll-home-byok-card">
                                <strong>🛠️ {t("homeShowcase.byokBanner.pill3" as MessageKey)}</strong>
                                <p>{t("homeShowcase.byokBanner.pill3Desc" as MessageKey)}</p>
                            </div>
                        </div>
                    </div>

                    <aside className="ll-home-byok-cta-box">
                        <div className="ll-home-byok-price-wrap">
                            <span className="ll-home-byok-price-caption">{t("homeShowcase.byokBanner.priceCaption" as MessageKey)}</span>
                            <strong className="ll-home-byok-price">{t("homeShowcase.byokBanner.price" as MessageKey)}</strong>
                            <span className="ll-home-byok-price-sub">{t("homeShowcase.byokBanner.priceSub" as MessageKey)}</span>
                        </div>
                        <Link to={pricingHref} className="ll-home-byok-cta-btn" data-audience-component="home_byok">
                            <span>{t("homeShowcase.byokBanner.cta" as MessageKey)}</span>
                            <ArrowRight aria-hidden />
                        </Link>
                        <p className="ll-home-byok-cta-hint">{t("homeShowcase.byokBanner.hint" as MessageKey)}</p>
                    </aside>
                </div>
            </div>
        </section>
    );
}
