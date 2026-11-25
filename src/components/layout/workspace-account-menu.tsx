import { lazy, Suspense } from "react";
import { Link } from "react-router";
import { LogIn } from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";
import { useUserStore } from "@/stores/use-user-store";
import { preloadAuthRoute } from "@/lib/auth-route-modules";

type WorkspaceAccountMenuProps = {
    variant?: "workspace" | "home";
    loginNext?: string;
};
const SignedInAccountMenu = lazy(() => import("./signed-in-account-menu").then((module) => ({ default: module.WorkspaceAccountMenu })));

function AccountPlaceholder({ home, label }: { home: boolean; label: string }) {
    return home ? (
        <span className="ll-home-account is-guest ll-home-account-placeholder animate-pulse" aria-hidden>
            <LogIn aria-hidden />
            <span className="ll-home-account-name">{label}</span>
        </span>
    ) : (
        <span className="size-9 animate-pulse rounded-[var(--r-md)] bg-foreground/[.06]" aria-hidden />
    );
}

export function WorkspaceAccountMenu({ variant = "workspace", loginNext }: WorkspaceAccountMenuProps) {
    const { t } = useI18n();
    const user = useUserStore((state) => state.user);
    const hydrated = useUserStore((state) => state.hydrated);
    if (!hydrated) {
        return <AccountPlaceholder home={variant === "home"} label={t("account.signIn")} />;
    }

    if (!user) {
        const defaultHome = /^\/(?:(?:hk|tw|en|ja|ko|es|pt)\/)?home\/?$/.test(loginNext || "");
        const loginTo = loginNext && !defaultHome ? `/login?next=${encodeURIComponent(loginNext)}` : "/login";
        return variant === "home" ? (
            <Link
                className="ll-home-account is-guest"
                to={loginTo}
                aria-label={t("account.signInAria")}
                title={t("account.signIn")}
                onPointerEnter={() => preloadAuthRoute("/login")}
                onFocus={() => preloadAuthRoute("/login")}
                onPointerDown={() => preloadAuthRoute("/login")}
            >
                <LogIn aria-hidden />
                <span className="ll-home-account-name">{t("account.signIn")}</span>
            </Link>
        ) : (
            <Link
                to={loginTo}
                className="app-workspace-topbar-icon-button"
                aria-label={t("nav.login")}
                title={t("nav.login")}
                onPointerEnter={() => preloadAuthRoute("/login")}
                onFocus={() => preloadAuthRoute("/login")}
                onPointerDown={() => preloadAuthRoute("/login")}
            >
                <LogIn />
            </Link>
        );
    }

    return (
        <Suspense fallback={<AccountPlaceholder home={variant === "home"} label={t("account.signIn")} />}>
            <SignedInAccountMenu variant={variant} loginNext={loginNext} />
        </Suspense>
    );
}
