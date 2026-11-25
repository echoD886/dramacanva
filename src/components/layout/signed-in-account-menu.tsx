import { useI18n } from "@/i18n/use-i18n";
import { getReferralAvailability } from "@/services/api/referral";
import { useQuery } from "@tanstack/react-query";
import { Dropdown, Popover } from "antd";
import { Blend, BookOpenCheck, CircleUserRound, Coins, Crown, Gift, Globe, LogIn, LogOut, Moon, ShieldCheck, SlidersHorizontal, Sparkles, Sun, Users } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";

import { SystemAnnouncementCenter } from "@/components/layout/system-announcement-center";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { useWalletBalance } from "@/hooks/use-wallet-balance";
import { formatAccountCredits } from "@/lib/account-credits";
import { useWorkspaceLogout } from "@/hooks/use-workspace-logout";
import { accountMenuRoutes } from "@/lib/account-menu";
import { DEFAULT_ACCOUNT_AVATAR_URL } from "@/lib/avatar-presets";
import { cn } from "@/lib/utils";
import { getSubscriptionDisplay } from "@/services/api/wallet-history";
import { listTeams } from "@/services/api/teams";
import { useTeamStore } from "@/stores/use-team-store";
import { useThemeStore } from "@/stores/use-theme-store";
import { useUserStore, type LocalUser } from "@/stores/use-user-store";
import { useLocalePicker } from "@/i18n/locale-picker";
import { PUBLIC_LOCALE_OPTIONS } from "@/i18n/locale-options";
import { getLocalWorkspaceState, onLocalWorkspaceChange, openLocalWorkspaceManager, type LocalWorkspaceState } from "@/services/local-workspace-storage";

type WorkspaceAccountMenuProps = {
    variant?: "workspace" | "home";
    loginNext?: string;
};

/** 登录态账户下拉控制面板；首页与工作区共用同一份真实数据、权限和路由合同。 */
export function WorkspaceAccountMenu({ variant = "workspace", loginNext }: WorkspaceAccountMenuProps) {
    const { t, locale } = useI18n();
    const { state: languageState, selectLocale } = useLocalePicker();
    const selectedLanguage = languageState.pending ?? locale;
    const theme = useThemeStore((state) => state.theme);
    const setTheme = useThemeStore((state) => state.setTheme);
    const user = useUserStore((state) => state.user);
    const hydrated = useUserStore((state) => state.hydrated);
    const features = useUserStore((state) => state.features);
    const activeTeamId = useTeamStore((state) => state.activeTeamId);
    const selectTeam = useTeamStore((state) => state.selectTeam);
    const { handleLogout, loggingOut } = useWorkspaceLogout();
    const { account: walletAccount, usableMicrocredits, refreshing, error: walletError } = useWalletBalance(user?.id, features.creditsEnabled);

    const teamsQuery = useQuery({
        queryKey: ["teams", user?.id || ""],
        queryFn: listTeams,
        enabled: Boolean(user?.id),
        staleTime: 30_000,
        refetchOnWindowFocus: false,
    });
    const [menuOpen, setMenuOpen] = useState(false);
    const [workspace, setWorkspace] = useState<LocalWorkspaceState | null>(null);
    useEffect(() => {
        let active = true;
        setWorkspace(null);
        const load = async () => {
            if (!user?.id) return;
            const next = await getLocalWorkspaceState(user.id);
            if (active) setWorkspace(next);
        };
        void load();
        const unsubscribe = onLocalWorkspaceChange(() => void load());
        return () => {
            active = false;
            unsubscribe();
        };
    }, [user?.id]);
    const referralQuery = useQuery({
        queryKey: ["referral-availability", user?.id],
        queryFn: ({ signal }) => getReferralAvailability(signal),
        enabled: Boolean(user?.id && menuOpen),
        staleTime: 15_000,
    });
    const subscriptionQuery = useQuery({
        queryKey: ["subscription-display", user?.id || "", ""],
        queryFn: ({ signal }) => getSubscriptionDisplay("", signal),
        enabled: Boolean(user?.id && menuOpen),
        staleTime: 30_000,
        refetchOnWindowFocus: false,
    });

    useEffect(() => {
        if (!teamsQuery.isSuccess || !activeTeamId) return;
        if (!(teamsQuery.data || []).some((item) => item.team.id === activeTeamId)) selectTeam("");
    }, [activeTeamId, selectTeam, teamsQuery.data, teamsQuery.isSuccess]);

    if (!hydrated) {
        return variant === "home" ? <span className="h-[34px] w-[102px] animate-pulse rounded-[9px] bg-foreground/[.06]" aria-hidden /> : <span className="size-9 animate-pulse rounded-[var(--r-md)] bg-foreground/[.06]" aria-hidden />;
    }

    if (!user) {
        const defaultHome = /^\/(?:(?:hk|tw|en|ja|ko|es|pt)\/)?home\/?$/.test(loginNext || "");
        const loginTo = loginNext && !defaultHome ? `/login?next=${encodeURIComponent(loginNext)}` : "/login";
        return variant === "home" ? (
            <Link className="ll-home-account is-guest" to={loginTo} aria-label={t("account.signInAria")} title={t("account.signIn")}>
                <LogIn aria-hidden />
                <span className="ll-home-account-name">{t("account.signIn")}</span>
            </Link>
        ) : (
            <Link to={loginTo} className="app-workspace-topbar-icon-button" aria-label={t("nav.login")} title={t("nav.login")}>
                <LogIn />
            </Link>
        );
    }

    const _routes = accountMenuRoutes({ role: user.role, referralsEnabled: referralQuery.data?.enabled });
    const teams = teamsQuery.data || [];
    const activeTeam = teams.find((item) => item.team.id === activeTeamId);
    const displayedMicrocredits = activeTeam?.team.sharedCreditsEnabled ? activeTeam.creditAccount?.availableMicrocredits : usableMicrocredits;
    const balance = displayedMicrocredits === null || displayedMicrocredits === undefined ? (refreshing || teamsQuery.isFetching ? t("common.loadingShort") : "--") : formatCreditPoints(displayedMicrocredits, locale);
    const planName = subscriptionQuery.data?.status === "none" ? t("account.free") : subscriptionQuery.data?.planName || t("common.loadingShort");

    const closeMenu = () => {
        setMenuOpen(false);
    };

    const languageMenuItems = PUBLIC_LOCALE_OPTIONS.map((item) => ({
        key: item.value,
        label: (
            <span className={cn("text-xs flex items-center justify-between w-36 py-0.5", selectedLanguage === item.value && "font-semibold text-primary")}>
                {item.label}
                {selectedLanguage === item.value ? <span className="text-[10px] text-primary">✓</span> : null}
            </span>
        ),
        onClick: async () => {
            if (await selectLocale(item.value)) closeMenu();
        },
    }));

    const content = (
        <section className="workspace-account-panel" aria-label={t("account.panel")}>
            {/* 顶部身份 + 会员 + 积分一行 */}
            <header className="workspace-account-header-v2 px-3 py-2.5 border-b border-border/40">
                <div className="flex items-center gap-2.5">
                    <WorkspaceUserAvatar user={user} className="size-8 rounded-[var(--r-sm)]" />
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1.5">
                            <span className="truncate text-xs font-semibold text-foreground" title={user.displayName || user.username}>
                                {user.displayName || user.username}
                            </span>
                            <span className="workspace-account-tier-badge text-[10px] font-medium px-1.5 py-0.5 rounded border border-border/60 bg-foreground/[.04] text-foreground/80 shrink-0">{planName}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] mt-0.5 text-foreground/60">
                            <Link to="/account/credits" onClick={closeMenu} className="hover:text-foreground flex items-center gap-1 transition-colors">
                                <span className="tabular-nums font-mono">{t("accountMenu.creditsRemaining", { amount: balance })}</span>
                                <span className="text-primary font-medium hover:underline">{t("accountMenu.topUp")} &gt;</span>
                            </Link>
                            {subscriptionQuery.data?.status === "none" && (
                                <Link to="/pricing" onClick={closeMenu} className="text-primary font-medium hover:underline text-[11px]">
                                    {t("accountMenu.upgrade")}
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] border-b border-border/40" title={t("account.privacy")}>
                <span className="shrink-0 text-foreground/50">{t("account.localAssets")}</span>
                <span className="min-w-0 flex-1 truncate text-foreground/70" title={workspace?.directoryName}>
                    {workspace?.mode === "directory" ? t(workspace.permission === "granted" ? "account.localOnly" : "account.reauthorize") : workspace?.mode === "browser" ? t("account.browserOnly") : t("account.noFolder")}
                </span>
                <button
                    type="button"
                    className="shrink-0 text-primary hover:underline font-medium"
                    onClick={() => {
                        closeMenu();
                        openLocalWorkspaceManager();
                    }}
                >
                    {t("account.setup")}
                </button>
            </div>

            {activeTeam && (
                <div className="workspace-account-team-context px-3 py-1.5 bg-foreground/[.02] border-b border-border/40 text-[11px] flex items-center justify-between" aria-label={t("account.switchTeam")}>
                    <button type="button" className="text-foreground/70 hover:text-foreground text-[11px]" onClick={() => selectTeam("")}>
                        {t("account.personal")}
                    </button>
                    <span className="flex items-center gap-1">
                        {teams.map((item) => (
                            <button
                                key={item.team.id}
                                type="button"
                                className={cn("px-1.5 py-0.5 rounded text-[11px]", item.team.id === activeTeam.team.id && "bg-foreground/10 font-medium text-foreground")}
                                aria-pressed={item.team.id === activeTeam.team.id}
                                onClick={() => selectTeam(item.team.id)}
                            >
                                {item.team.name}
                            </button>
                        ))}
                    </span>
                </div>
            )}

            {/* 菜单列表 */}
            <nav className="workspace-account-menu-list p-1 space-y-0.5" aria-label={t("account.actions")}>
                <AccountMenuLink to="/account/overview" icon={<CircleUserRound className="size-4 stroke-[1.5]" />} label={t("accountMenu.accountCenter")} onNavigate={closeMenu} />
                {referralQuery.data?.enabled && <AccountMenuLink to="/account/referrals" icon={<Gift className="size-4 stroke-[1.5]" />} label={t("accountMenu.inviteFriends")} onNavigate={closeMenu} />}
                <AccountMenuLink to="/teams" icon={<Users className="size-4 stroke-[1.5]" />} label={t("accountMenu.teamSpace")} onNavigate={closeMenu} />

                <div className="my-1 border-t border-border/40" />

                <AccountMenuLink to="/wallet" icon={<Coins className="size-4 stroke-[1.5]" />} label={t("nav.creditShop")} onNavigate={closeMenu} />
                <AccountMenuLink to="/pricing" icon={<Crown className="size-4 stroke-[1.5]" />} label={t("nav.membership")} onNavigate={closeMenu} />
                <AccountMenuLink to="/plugins" icon={<Blend className="size-4 stroke-[1.5]" />} label={t("nav.blender")} onNavigate={closeMenu} />

                <div className="my-1 border-t border-border/40" />

                <AccountMenuLink to="/settings" icon={<SlidersHorizontal className="size-4 stroke-[1.5]" />} label={t("accountMenu.creativeSettings")} onNavigate={closeMenu} />
                <AccountMenuLink to="/skills" icon={<BookOpenCheck className="size-4 stroke-[1.5]" />} label={t("accountMenu.skillLibrary")} onNavigate={closeMenu} />
                <div className="workspace-account-announcement-row">
                    <SystemAnnouncementCenter userId={user.id} showLabel label={t("account.notifications")} compactCount labelClassName="flex" staticMotion />
                </div>

                <div className="my-1 border-t border-border/40" />

                <AnimatedThemeToggler type="button" className="workspace-account-menu-row" theme={theme} onThemeChange={setTheme} aria-label={t("nav.switchTheme", { theme: t(theme === "dark" ? "nav.light" : "nav.dark") })}>
                    {theme === "dark" ? <Moon className="size-4 stroke-[1.5]" /> : <Sun className="size-4 stroke-[1.5]" />}
                    <span>{t("accountMenu.theme")}</span>
                    <span className="workspace-account-theme-switch ml-auto flex items-center gap-1" aria-label={t("account.currentTheme", { theme: t(theme === "dark" ? "nav.dark" : "nav.light") })}>
                        <span className={cn("p-0.5 rounded", theme === "light" && "is-active bg-foreground/10")}>
                            <Sun className="size-3 stroke-[1.5]" />
                        </span>
                        <span className={cn("p-0.5 rounded", theme === "dark" && "is-active bg-foreground/10")}>
                            <Moon className="size-3 stroke-[1.5]" />
                        </span>
                    </span>
                </AnimatedThemeToggler>

                <Dropdown menu={{ items: languageMenuItems }} trigger={["click", "hover"]} placement="bottomRight">
                    <button type="button" className="workspace-account-menu-row w-full flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Globe className="size-4 stroke-[1.5]" />
                            <span>{t("accountMenu.language")}</span>
                        </div>
                        <span className="text-[11px] text-foreground/50">{PUBLIC_LOCALE_OPTIONS.find((l) => l.value === selectedLanguage)?.label || "Language"}</span>
                    </button>
                </Dropdown>

                {user.role === "admin" && <AccountMenuLink to="/admin" icon={<ShieldCheck className="size-4 stroke-[1.5]" />} label={t("account.adminPanel")} onNavigate={closeMenu} />}

                <button
                    type="button"
                    role="menuitem"
                    className="workspace-account-menu-row w-full text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 transition-colors"
                    disabled={loggingOut}
                    onClick={() => {
                        closeMenu();
                        void handleLogout();
                    }}
                >
                    <LogOut className="size-4 stroke-[1.5]" />
                    <span>{loggingOut ? t("account.loggingOut") : t("accountMenu.logout")}</span>
                </button>
            </nav>
        </section>
    );

    return (
        <Popover
            trigger="click"
            placement="bottomRight"
            arrow={false}
            rootClassName={cn("workspace-account-popover", variant === "home" && "workspace-account-popover-home")}
            open={menuOpen}
            onOpenChange={(open) => {
                setMenuOpen(open);
            }}
            content={content}
        >
            {variant === "home" ? (
                <button type="button" className="ll-home-account" aria-label={t("account.menu")} aria-haspopup="menu" aria-expanded={menuOpen} title={user.displayName || user.username}>
                    <WorkspaceUserAvatar user={user} className="size-[26px] rounded-lg" />
                    <span className="ll-home-account-name">{user.displayName || user.username}</span>
                </button>
            ) : (
                <button type="button" className="app-workspace-topbar-icon-button app-workspace-account-trigger" aria-label={t("account.menu")} aria-haspopup="menu" aria-expanded={menuOpen} title={user.displayName || user.username}>
                    <WorkspaceUserAvatar user={user} className="size-6 rounded-[var(--r-sm)]" />
                </button>
            )}
        </Popover>
    );
}

function AccountMenuLink({ to, icon, label, onNavigate }: { to: string; icon: ReactNode; label: string; onNavigate: () => void }) {
    return (
        <Link to={to} role="menuitem" onClick={onNavigate} className="workspace-account-menu-row">
            {icon}
            <span>{label}</span>
        </Link>
    );
}

export function WorkspaceUserAvatar({ user, className }: { user: LocalUser; className?: string }) {
    const [failed, setFailed] = useState(false);
    const requestedAvatarUrl = resolveAvatarUrl(user.avatarUrl);
    const avatarUrl = requestedAvatarUrl && !failed ? requestedAvatarUrl : DEFAULT_ACCOUNT_AVATAR_URL;

    useEffect(() => setFailed(false), [requestedAvatarUrl]);

    return (
        <span className={cn("workspace-account-avatar grid !max-w-none shrink-0 place-items-center overflow-hidden bg-[var(--workspace-accent)] font-semibold text-white", className)} aria-hidden>
            <img src={avatarUrl} alt="" referrerPolicy="no-referrer" className="size-full object-cover" onError={() => setFailed(true)} />
        </span>
    );
}

function resolveAvatarUrl(value?: string) {
    const avatarUrl = value?.trim() || "";
    return /^(https?:\/\/|\/|data:image\/|blob:)/i.test(avatarUrl) ? avatarUrl : "";
}

function formatCreditPoints(value: number, locale: ReturnType<typeof useI18n>["locale"]) {
    return formatAccountCredits(value, locale);
}
