import { localizedPublicPath } from "@/i18n/locale-routing";
import { TRUST_LABELS } from "@/content/public-trust";
import { formatAccountCredits } from "@/lib/account-credits";
import { byokEntryPath } from "@/lib/byok-state";
import { LocalePicker } from "@/i18n/locale-picker";
import { useI18n } from "@/i18n/use-i18n";
import { useProductionText } from "@/i18n/production-tools";

function ProductionToolsNavLink({ itemClass, active, expanded, onNavigate }: { itemClass: string; active: boolean; expanded: boolean; onNavigate?: () => void }) {
    const text = useProductionText();
    const { t } = useI18n();
    return (
        <LibTVNavHint title={text(0)} description={t("nav.homeHint")} icon={BriefcaseBusiness} enabled={!expanded}>
            <Link className={`${itemClass}${active ? " is-active" : ""}`} to="/workbench" aria-current={active ? "page" : undefined} aria-label={text(0)} onClick={onNavigate}>
                <BriefcaseBusiness aria-hidden />
                <span>{text(0)}</span>
            </Link>
        </LibTVNavHint>
    );
}
import { BrandLogo } from "@/components/brand/brand-logo";
import { BLOG_LOCALES, blogPath, parseBlogPath } from "@/content/blog-locales";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { getFeatureAvailability } from "@/services/api/auth";
import {
    ArrowUp,
    Blend,
    BookOpen,
    BookOpenCheck,
    ChevronRight,
    CircleHelp,
    Coins,
    Crown,
    PackageOpen,
    Film,
    Gift,
    Home,
    Images,
    KeyRound,
    Infinity as InfinityIcon,
    Info,
    LifeBuoy,
    Moon,
    Newspaper,
    PanelLeftClose,
    PanelLeftOpen,
    Plus,
    ShieldCheck,
    Sparkles,
    Sun,
    UsersRound,
    BriefcaseBusiness,
} from "lucide-react";
import { Link, useLocation } from "react-router";

import { WorkspaceAccountMenu } from "@/components/layout/workspace-account-menu";
import { LibTVCampaignBar, useLibTVCampaignVisibility } from "@/components/layout/libtv-campaign-bar";
import { LibTVNavHint, LibTVNavigationPreferences } from "@/components/layout/libtv-navigation-controls";
import { ChangelogBell } from "@/components/changelog/bell";
import { useWorkspaceTopBarContent } from "@/components/layout/workspace-top-bar-extension";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { useWalletBalance } from "@/hooks/use-wallet-balance";
import { preloadWorkspaceRoute } from "@/lib/workspace-route-modules";
import { getReferralAvailability } from "@/services/api/referral";
import { useThemeStore } from "@/stores/use-theme-store";
import { useNavigationPreferences } from "@/stores/use-navigation-preferences";
import { useUserStore, type LocalUser } from "@/stores/use-user-store";

import "@/pages/home/home-liblib.css";

export function LibTVBrand({ compact = false }: { compact?: boolean }) {
    return (
        <span className={`ll-home-brand ${compact ? "is-compact" : ""}`} role="img" aria-label="DramaCanvas">
            <BrandLogo className="ll-home-brand-mark" />
            {!compact ? (
                <span className="ll-home-brand-wordmark" aria-hidden>
                    DramaCanvas
                </span>
            ) : null}
        </span>
    );
}

type LibTVSidebarProps = {
    expanded: boolean;
    createHref: string;
    projectsHref: string;
    skillsHref: string;
    canvasHref: string;
    assetsHref: string;
    pricingHref: string;
    onToggle: () => void;
    onNavigate: () => void;
};

/** LibTV 首页与项目工作区共用的一级导航，避免路由切换时出现另一套侧栏。 */
export function LibTVSidebar({ expanded, createHref, projectsHref, skillsHref, canvasHref, assetsHref, pricingHref, onToggle, onNavigate }: LibTVSidebarProps) {
    useEffect(() => {
        window.dispatchEvent(new Event("dramacanva:navigation-ready"));
    }, []);
    const { t, locale } = useI18n();
    const { pathname, search } = useLocation();
    const user = useUserStore((state) => state.user);
    // Shown until availability explicitly says off, so prerendered public HTML links the indexable 商品生成 page.
    const storedEcommerceEnabled = useUserStore((state) => !state.featuresLoaded || state.features.ecommerceEnabled);
    const guestFeatures = useQuery({ queryKey: ["public-feature-availability"], queryFn: getFeatureAvailability, enabled: !user, staleTime: 15_000 });
    const ecommerceEnabled = user ? storedEcommerceEnabled : (guestFeatures.data?.features?.ecommerceEnabled ?? storedEcommerceEnabled);
    const byokEnabled = useUserStore((state) => !state.user || (state.featuresLoaded && state.features.customChannelsEnabled));
    const loggedIn = useUserStore((state) => Boolean(state.user));
    const referralQuery = useQuery({ queryKey: ["referral-availability", user?.id], queryFn: ({ signal }) => getReferralAvailability(signal), enabled: Boolean(user?.id), staleTime: 15_000 });
    const referralsEnabled = Boolean(referralQuery.data?.enabled);
    const publicLocale = BLOG_LOCALES.find((value) => value === locale) ?? "en-US";
    const homeHref = localizedPublicPath("/", publicLocale);
    const ecommerceHref = localizedPublicPath("/ai-product-photography", publicLocale);
    const aiVideoTemplatesHref = localizedPublicPath("/ai-video-templates", publicLocale);
    const blogHref = blogPath(publicLocale);
    const blogActive = Boolean(parseBlogPath(pathname));
    const iconMotion = useNavigationPreferences((state) => state.iconMotion);
    const itemClass = "ll-home-side-item";
    const channelsActive = pathname === "/settings" && new URLSearchParams(search).get("section") === "channels";
    const helpMenuRef = useRef<HTMLDivElement>(null);
    const helpPanelRef = useRef<HTMLDivElement>(null);
    const helpTriggerRef = useRef<HTMLButtonElement>(null);
    const [helpOpen, setHelpOpen] = useState(false);
    const [rightsOpen, setRightsOpen] = useState(false);
    const [helpPosition, setHelpPosition] = useState<{ left: number; bottom: number } | null>(null);

    const isActive = (route: string) => {
        const current = localizedPublicPath(pathname, publicLocale);
        const target = localizedPublicPath(route, publicLocale);
        return target === homeHref ? current === homeHref : current === target || current.startsWith(`${target}/`);
    };

    useEffect(() => {
        if (!helpOpen) return;
        const updatePosition = () => {
            const trigger = helpTriggerRef.current;
            if (!trigger) return;
            const rect = trigger.getBoundingClientRect();
            setHelpPosition({
                left: Math.max(12, Math.min(Math.round(rect.right + 12), window.innerWidth - 238)),
                bottom: Math.max(12, Math.round(window.innerHeight - rect.bottom)),
            });
        };
        updatePosition();
        window.addEventListener("resize", updatePosition);
        window.addEventListener("scroll", updatePosition, true);
        return () => {
            window.removeEventListener("resize", updatePosition);
            window.removeEventListener("scroll", updatePosition, true);
        };
    }, [helpOpen]);

    useEffect(() => {
        if (!helpOpen) return;
        const onPointerDown = (event: MouseEvent | TouchEvent) => {
            const target = event.target as Node | null;
            if (!target) return;
            if (helpMenuRef.current?.contains(target)) return;
            if (helpPanelRef.current?.contains(target)) return;
            setHelpOpen(false);
            setRightsOpen(false);
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setHelpOpen(false);
                setRightsOpen(false);
            }
        };
        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("touchstart", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("touchstart", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [helpOpen]);

    return (
        <aside id="ll-home-sidebar" className="ll-home-sidebar" aria-label={t("nav.mainAria")} data-icon-motion={iconMotion}>
            <div className="ll-home-sidebar-header">
                <Link className="ll-home-sidebar-brand" to={homeHref} aria-label={t("nav.returnLibtv")} onClick={onNavigate}>
                    <LibTVBrand compact={!expanded} />
                </Link>
                <LibTVNavHint title={expanded ? t("nav.collapse") : t("nav.expand")} description={expanded ? t("nav.collapseHint") : t("nav.expandHint")} icon={expanded ? PanelLeftClose : PanelLeftOpen}>
                    <button type="button" aria-label={expanded ? t("nav.collapse") : t("nav.expand")} aria-expanded={expanded} onClick={onToggle}>
                        {expanded ? <PanelLeftClose aria-hidden /> : <PanelLeftOpen aria-hidden />}
                    </button>
                </LibTVNavHint>
            </div>
            <LibTVNavHint title={t("nav.newProject")} description={t("nav.newProjectHint")} icon={Plus} enabled={!expanded}>
                <Link className="ll-home-new-project" to={createHref} aria-label={t("nav.newProject")} onClick={onNavigate} {...routePreloadHandlers("create")}>
                    <Plus aria-hidden />
                    <span>{t("nav.newProject")}</span>
                </Link>
            </LibTVNavHint>
            <nav>
                <LibTVNavHint title={t("common.home")} description={t("nav.homeHint")} icon={Home} enabled={!expanded}>
                    <Link className={`${itemClass}${isActive(homeHref) ? " is-active" : ""}`} to={homeHref} aria-current={isActive(homeHref) ? "page" : undefined} aria-label={t("common.home")} onClick={onNavigate}>
                        <Home aria-hidden />
                        <span>{t("common.home")}</span>
                    </Link>
                </LibTVNavHint>
                <LibTVNavHint title={t("nav.drama")} description={t("nav.dramaHint")} icon={Film} enabled={!expanded}>
                    <Link
                        className={`${itemClass}${isActive("/projects") ? " is-active" : ""}`}
                        to={projectsHref}
                        aria-current={isActive("/projects") ? "page" : undefined}
                        aria-label={t("nav.drama")}
                        onClick={onNavigate}
                        {...routePreloadHandlers("projects")}
                    >
                        <Film aria-hidden />
                        <span>{t("nav.drama")}</span>
                    </Link>
                </LibTVNavHint>
                <LibTVNavHint title={t("nav.canvas")} description={t("nav.canvasHint")} icon={InfinityIcon} enabled={!expanded}>
                    <Link className={`${itemClass}${isActive("/canvas") ? " is-active" : ""}`} to={canvasHref} aria-current={isActive("/canvas") ? "page" : undefined} aria-label={t("nav.canvas")} onClick={onNavigate} {...routePreloadHandlers("canvas")}>
                        <InfinityIcon aria-hidden />
                        <span>{t("nav.canvas")}</span>
                    </Link>
                </LibTVNavHint>
                
                <LibTVNavHint title={t("nav.aiVideoTemplates")} description={t("nav.aiVideoTemplatesHint")} icon={Sparkles} enabled={!expanded}>
                    <Link
                        className={`${itemClass}${isActive("/ai-video-templates") ? " is-active" : ""}`}
                        to={aiVideoTemplatesHref}
                        aria-current={isActive("/ai-video-templates") ? "page" : undefined}
                        aria-label={t("nav.aiVideoTemplates")}
                        onClick={onNavigate}
                    >
                        <Sparkles aria-hidden />
                        <span>{t("nav.aiVideoTemplates")}</span>
                    </Link>
                </LibTVNavHint>
                <LibTVNavHint title={t("nav.assets")} description={t("nav.assetsHint")} icon={Images} enabled={!expanded}>
                    <Link className={`${itemClass}${isActive("/assets") ? " is-active" : ""}`} to={assetsHref} aria-current={isActive("/assets") ? "page" : undefined} aria-label={t("nav.assets")} onClick={onNavigate} {...routePreloadHandlers("assets")}>
                        <Images aria-hidden />
                        <span>{t("nav.assets")}</span>
                    </Link>
                </LibTVNavHint>
                <span className="ll-home-sidebar-group-label">{t("nav.tools" as import("@/i18n/messages").MessageKey)}</span>
                <LibTVNavHint title={t("miscPages.navSkills")} description={t("nav.agentHint")} icon={BookOpenCheck} enabled={!expanded}>
                    <Link className={`${itemClass}${isActive("/skills") ? " is-active" : ""}`} to={skillsHref} aria-current={isActive("/skills") ? "page" : undefined} aria-label={t("miscPages.navSkills")} onClick={onNavigate}>
                        <BookOpenCheck aria-hidden />
                        <span>{t("miscPages.navSkills")}</span>
                    </Link>
                </LibTVNavHint>
                <ProductionToolsNavLink itemClass={itemClass} active={isActive("/workbench")} expanded={expanded} onNavigate={onNavigate} />
                {byokEnabled ? (
                    <LibTVNavHint title={t("channels.title")} description={t("settings.channelsDescription")} icon={KeyRound} enabled={!expanded}>
                        <Link className={`${itemClass}${channelsActive ? " is-active" : ""}`} to={byokEntryPath(loggedIn)} onClick={onNavigate} aria-label={t("channels.title")} aria-current={channelsActive ? "page" : undefined}>
                            <KeyRound aria-hidden />
                            <span>{t("channels.title")}</span>
                        </Link>
                    </LibTVNavHint>
                ) : null}
                <LibTVNavHint title={t("nav.pricing")} description={t("nav.pricingHint")} icon={Coins} enabled={!expanded}>
                    <Link
                        className={`${itemClass}${isActive("/pricing") ? " is-active" : ""}`}
                        to={pricingHref}
                        aria-current={isActive("/pricing") ? "page" : undefined}
                        aria-label={t("nav.pricing")}
                        onClick={onNavigate}
                        {...routePreloadHandlers("pricing")}
                    >
                        <Coins aria-hidden />
                        <span>{t("nav.pricing")}</span>
                    </Link>
                </LibTVNavHint>
                {referralsEnabled ? (
                    <LibTVNavHint title={t("referral.title")} description={t("referral.description")} icon={Gift} enabled={!expanded}>
                        <Link className={`${itemClass}${isActive("/account/referrals") ? " is-active" : ""}`} to="/account/referrals" aria-current={isActive("/account/referrals") ? "page" : undefined} aria-label={t("referral.title")} onClick={onNavigate}>
                            <Gift aria-hidden />
                            <span>{t("referral.title")}</span>
                        </Link>
                    </LibTVNavHint>
                ) : null}
                <LibTVNavHint title={t("nav.blog")} description={t("nav.blogHint")} icon={Newspaper} enabled={!expanded}>
                    <Link className={`${itemClass}${blogActive ? " is-active" : ""}`} to={blogHref} aria-current={blogActive ? "page" : undefined} aria-label={t("nav.blog")} onClick={onNavigate}>
                        <Newspaper aria-hidden />
                        <span>Blog</span>
                    </Link>
                </LibTVNavHint>
                
            </nav>
            <div className="ll-home-sidebar-spacer" />
            <ChangelogBell expanded={expanded} />
            <LibTVNavigationPreferences expanded={expanded} />
            <div className="ll-home-sidebar-help-shell" ref={helpMenuRef}>
                <LibTVNavHint title={t("nav.helpShort")} description={t("nav.helpHint")} icon={CircleHelp} enabled={!expanded && !helpOpen}>
                    <button
                        type="button"
                        ref={helpTriggerRef}
                        className={`${itemClass} ll-home-sidebar-help`}
                        aria-haspopup="menu"
                        aria-expanded={helpOpen}
                        aria-label={t("nav.helpShort")}
                        onClick={() => {
                            setHelpOpen((current) => !current);
                            setRightsOpen(false);
                        }}
                    >
                        <CircleHelp aria-hidden />
                        <span>{t("nav.helpShort")}</span>
                    </button>
                </LibTVNavHint>
            </div>
            {helpOpen && helpPosition && typeof document !== "undefined"
                ? createPortal(
                      <div ref={helpPanelRef} className="ll-home-help-menu" role="menu" aria-label={t("nav.helpPublic")} style={helpPosition}>
                          
                          <Link to={localizedPublicPath("/help", publicLocale) + "#tutorial"} role="menuitem">
                              <BookOpen aria-hidden />
                              <span>{t("nav.tutorials")}</span>
                          </Link>
                          <div className={`ll-home-help-rights ${rightsOpen ? "is-open" : ""}`} onMouseEnter={() => setRightsOpen(true)} onMouseLeave={() => setRightsOpen(false)}>
                              <button type="button" role="menuitem" aria-haspopup="menu" aria-expanded={rightsOpen} onClick={() => setRightsOpen(true)}>
                                  <ShieldCheck aria-hidden />
                                  <span>{t("nav.privacyRights")}</span>
                                  <ChevronRight aria-hidden />
                              </button>
                              {rightsOpen ? (
                                  <section className="ll-home-rights-panel" role="menu" aria-label={t("nav.privacyRightsHint")}>
                                      <Link to={localizedPublicPath("/legal/terms", publicLocale)} role="menuitem">
                                          {t("nav.terms")} <ArrowUp aria-hidden />
                                      </Link>
                                      <Link to={localizedPublicPath("/legal/privacy", publicLocale)} role="menuitem">
                                          {t("nav.privacy")} <ArrowUp aria-hidden />
                                      </Link>
                                      <Link to={localizedPublicPath("/legal/refund", publicLocale)} role="menuitem">
                                          {t("nav.refund")} <ArrowUp aria-hidden />
                                      </Link>
                                      <Link to={localizedPublicPath("/legal/acceptable-use", publicLocale)} role="menuitem">
                                          {t("nav.acceptableUse")} <ArrowUp aria-hidden />
                                      </Link>
                                      <Link to={localizedPublicPath("/help", publicLocale) + "#rights"} role="menuitem">
                                          {t("nav.dataRights")} <ArrowUp aria-hidden />
                                      </Link>
                                      <Link to={localizedPublicPath("/help", publicLocale) + "#benefits"} role="menuitem">
                                          {t("nav.creatorBenefits")} <ArrowUp aria-hidden />
                                      </Link>
                                      <div className="ll-home-rights-detail">
                                          <strong>{t("nav.offered")}</strong>
                                          <p>{t("nav.manageCreative")}</p>
                                          <p>{t("nav.checkBenefits")}</p>
                                          <p>{t("nav.managePrivacy")}</p>
                                      </div>
                                  </section>
                              ) : null}
                          </div>
                          <Link to={localizedPublicPath("/help", publicLocale) + "#support"} role="menuitem">
                              <LifeBuoy aria-hidden />
                              <span>{t("nav.contactSupport")}</span>
                          </Link>
                          <Link to={pricingHref} role="menuitem">
                              <Coins aria-hidden />
                              <span>{t("nav.contactSales")}</span>
                          </Link>
                          <Link to={localizedPublicPath("/help", publicLocale) + "#community"} role="menuitem">
                              <UsersRound aria-hidden />
                              <span>{t("nav.community")}</span>
                          </Link>
                          <Link to={localizedPublicPath("/help", publicLocale) + "#join"} role="menuitem">
                              <Sparkles aria-hidden />
                              <span>{t("nav.join")}</span>
                          </Link>
                      </div>,
                      document.body,
                  )
                : null}
        </aside>
    );
}

type LibTVTopBarProps = {
    user: LocalUser | null;
    pluginsHref: string;
    walletHref: string;
    theme: "light" | "dark";
    onThemeChange: (theme: "light" | "dark") => void;
    sidebarExpanded: boolean;
    onToggleSidebar: () => void;
    loginNext?: string;
};

/** 首页与项目页共用的顶栏；项目详情的二级导航会嵌入同一条工作流。 */
export function LibTVTopBar({ user, pluginsHref, walletHref, theme, onThemeChange, sidebarExpanded, onToggleSidebar, loginNext = "/home" }: LibTVTopBarProps) {
    const { t, locale } = useI18n();
    const publicLocale = BLOG_LOCALES.find((value) => value === locale) ?? "en-US";
    const homeHref = localizedPublicPath("/", publicLocale);
    const pricingHref = localizedPublicPath("/pricing", publicLocale);
    const creditsEnabled = useUserStore((state) => state.features.creditsEnabled);
    const byokEnabled = useUserStore((state) => !user || (state.featuresLoaded && state.features.customChannelsEnabled));
    const { usableMicrocredits: availableMicrocredits, refreshing } = useWalletBalance(user?.id, creditsEnabled);
    const extension = useWorkspaceTopBarContent();
    const hasExtension = extension !== null && extension !== undefined;
    const balance = availableMicrocredits == null ? (refreshing ? t("nav.reading") : "--") : formatAccountCredits(availableMicrocredits, locale);

    return (
        <header className={`ll-home-topbar${hasExtension ? " has-extension" : ""}`}>
            <div className="ll-home-topbar-start">
                <button type="button" className="ll-home-mobile-sidebar-toggle" aria-controls="ll-home-sidebar" aria-expanded={sidebarExpanded} aria-label={sidebarExpanded ? t("nav.collapse") : t("nav.expand")} onClick={onToggleSidebar}>
                    {sidebarExpanded ? <PanelLeftClose aria-hidden /> : <PanelLeftOpen aria-hidden />}
                </button>
                <Link className="ll-home-topbar-brand" to={homeHref} aria-label={t("nav.returnLibtv")}>
                    <LibTVBrand />
                </Link>
            </div>
            {hasExtension ? <div className="ll-home-topbar-extension">{extension}</div> : null}
            <div className="ll-home-topbar-actions">
                <LocalePicker compact />
                {!hasExtension ? (
                    <Link className="ll-home-topbar-secondary ll-topbar-plugins" to={pluginsHref} title={t("nav.blender")}>
                        <Blend aria-hidden />
                        <span className="ll-topbar-label">{t("nav.blender")}</span>
                    </Link>
                ) : null}
                {!hasExtension && byokEnabled ? (
                    <Link className="ll-home-topbar-secondary ll-topbar-byok" to={byokEntryPath(Boolean(user))} aria-label={t("channels.title")} title={t("channels.title")}>
                        <KeyRound aria-hidden />
                        <span className="ll-topbar-label">{t("channels.title")}</span>
                    </Link>
                ) : null}
                {!hasExtension ? (
                    <Link className="ll-home-topbar-secondary ll-topbar-credits" to={walletHref} title={t("nav.creditShop")}>
                        <Coins aria-hidden />
                        <span className="ll-topbar-label">{t("nav.creditShop")}</span>
                    </Link>
                ) : null}
                {!hasExtension ? (
                    <Link className="ll-home-topbar-secondary is-member" to={pricingHref} title={t("nav.membership")}>
                        <Crown aria-hidden />
                        <span className="ll-topbar-label">
                            {t("nav.membership")} <small>{t("nav.promo")}</small>
                        </span>
                    </Link>
                ) : null}
                {user ? (
                    <Link className="ll-home-points" to={walletHref} aria-label={t("nav.balance")} title={t("nav.balance")}>
                        <Sparkles aria-hidden />
                        <strong>{balance}</strong>
                    </Link>
                ) : null}
                {!user ? (
                    <AnimatedThemeToggler className="ll-home-mobile-theme" duration={460} theme={theme} onThemeChange={onThemeChange} aria-label={t("nav.switchTheme", { theme: t(theme === "dark" ? "nav.light" : "nav.dark") })}>
                        {theme === "dark" ? <Sun aria-hidden /> : <Moon aria-hidden />}
                    </AnimatedThemeToggler>
                ) : null}
                <WorkspaceAccountMenu variant="home" loginNext={loginNext} />
            </div>
        </header>
    );
}

/** 普通用户页面共用的 LibTV 外壳；画布编辑器、认证页和后台保留专用工作区。 */
export function LibTVProjectShell({ children }: { children: ReactNode }) {
    const { t, locale } = useI18n();
    const { pathname, search } = useLocation();
    const publicLocale = BLOG_LOCALES.find((value) => value === locale) ?? "en-US";
    const pricingHref = localizedPublicPath("/pricing", publicLocale);
    const user = useUserStore((state) => state.user);
    const theme = useThemeStore((state) => state.theme);
    const setTheme = useThemeStore((state) => state.setTheme);
    const [sidebarExpanded, setSidebarExpanded] = useState(false);
    const { campaignOpen, dismissCampaign } = useLibTVCampaignVisibility();
    // Blog pages read like Higgsfield's: no promo bar above the article (owner, 2026-10-20).
    const showCampaign = campaignOpen && !parseBlogPath(pathname);
    const loginNext = `${pathname}${search}`;
    const protectedHref = (path: string) => (user ? path : `/login?next=${encodeURIComponent(path)}`);
    const closeSidebarOnMobile = () => {
        if (window.innerWidth <= 1023) setSidebarExpanded(false);
    };

    useEffect(() => {
        if (!sidebarExpanded) return;
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.defaultPrevented || event.key !== "Escape" || window.innerWidth > 1023) return;
            event.preventDefault();
            setSidebarExpanded(false);
        };
        window.addEventListener("keydown", closeOnEscape);
        return () => window.removeEventListener("keydown", closeOnEscape);
    }, [sidebarExpanded]);

    return (
        <div className={`liblib-home ll-home-route-shell ${showCampaign ? "has-campaign" : "campaign-closed"}`}>
            {showCampaign ? <LibTVCampaignBar href={pricingHref} onClose={dismissCampaign} /> : null}
            <div className={`ll-home-app ${sidebarExpanded ? "is-sidebar-expanded" : ""}`}>
                {sidebarExpanded ? <button type="button" className="ll-home-sidebar-scrim" aria-label={t("nav.collapse")} onClick={closeSidebarOnMobile} /> : null}
                <LibTVSidebar
                    expanded={sidebarExpanded}
                    createHref="/canvas?mode=new"
                    projectsHref="/projects"
                    skillsHref="/skills"
                    canvasHref="/canvas"
                    assetsHref="/assets"
                    pricingHref={pricingHref}
                    onToggle={() => setSidebarExpanded((current) => !current)}
                    onNavigate={closeSidebarOnMobile}
                />
                <div className="ll-home-main">
                    <LibTVTopBar
                        user={user}
                        pluginsHref="/plugins"
                        walletHref={protectedHref("/wallet")}
                        theme={theme}
                        onThemeChange={setTheme}
                        sidebarExpanded={sidebarExpanded}
                        onToggleSidebar={() => setSidebarExpanded((current) => !current)}
                        loginNext={loginNext}
                    />
                    <div className="ll-home-route-content">{children}</div>
                </div>
            </div>
        </div>
    );
}

// 鼠标移入、键盘聚焦或按下导航项时提前下载对应页面代码，点击后不再等分包加载。
function routePreloadHandlers(slug: string) {
    const preload = () => preloadWorkspaceRoute(slug);
    return { onPointerEnter: preload, onFocus: preload, onPointerDown: preload };
}
