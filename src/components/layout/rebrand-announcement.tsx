import { useEffect, useState, type ReactNode } from "react";
import { App } from "antd";
import { X } from "lucide-react";
import { blogPath, parseBlogPath, type BlogLocale } from "@/content/blog-locales";
import { useI18n } from "@/i18n/use-i18n";
import { initialPublicPage } from "@/lib/public-page-startup";
import { REBRAND_BLOG_SLUG, REBRAND_COPY, REBRAND_DISMISSED_KEY, REBRAND_WORKSPACE_KEY, rebrandActive } from "@/lib/rebrand-announcement";
import { useUserStore } from "@/stores/use-user-store";
import { useHydrated, usePrerenderTime } from "@/lib/prerender-state";
import "./rebrand-announcement.css";

const workspaceNoticesSeen = new Set<string>();

export function PublicBrandFrame({ pathname, children }: { pathname: string; children: ReactNode }) {
    const hydrated = useHydrated();
    const renderedAt = usePrerenderTime();
    const { locale } = useI18n();
    const copy = REBRAND_COPY[locale as BlogLocale] || REBRAND_COPY["en-US"];
    const [dismissed, setDismissed] = useState(() => {
        if (typeof window === "undefined") return false;
        try {
            return localStorage.getItem(REBRAND_DISMISSED_KEY) === "1";
        } catch {
            return false;
        }
    });
    if (!initialPublicPage(pathname)) return children;
    // Blog pages hide the rebrand bar so the article starts at the top (owner, 2026-10-20).
    const open = !(hydrated && dismissed) && rebrandActive(hydrated ? undefined : renderedAt) && !parseBlogPath(pathname);
    return (
        <div className="dc-brand-frame">
            {open && (
                <aside className="dc-rebrand-banner" aria-label={copy.announcement}>
                    <div className="dc-rebrand-copy">
                        <span>{copy.announcement}</span>
                        <a href={blogPath(locale as BlogLocale, REBRAND_BLOG_SLUG)}>
                            {copy.more}
                            <span aria-hidden> →</span>
                        </a>
                    </div>
                    <button
                        type="button"
                        aria-label={copy.close}
                        onClick={() => {
                            try {
                                localStorage.setItem(REBRAND_DISMISSED_KEY, "1");
                            } catch {
                                /* Storage may be unavailable. */
                            }
                            document.documentElement.dataset.rebrandHidden = "true";
                            setDismissed(true);
                        }}
                    >
                        <X size={16} aria-hidden />
                    </button>
                </aside>
            )}
            <div className="dc-brand-frame-content">{children}</div>
        </div>
    );
}

export function WorkspaceRebrandNotice({ pathname }: { pathname: string }) {
    const { locale } = useI18n();
    const { notification } = App.useApp();
    const user = useUserStore((state) => state.user);
    useEffect(() => {
        if (!user || !/^\/(?:canvas|projects)(?:\/|$)/.test(pathname) || !rebrandActive()) return;
        const key = `${REBRAND_WORKSPACE_KEY}:${user.id}`;
        if (workspaceNoticesSeen.has(key)) return;
        workspaceNoticesSeen.add(key);
        try {
            if (localStorage.getItem(key) === "1") return;
            localStorage.setItem(key, "1");
        } catch {
            /* The notification still works without persistent storage. */
        }
        const copy = REBRAND_COPY[locale as BlogLocale] || REBRAND_COPY["en-US"];
        notification.info({ key: REBRAND_WORKSPACE_KEY, title: copy.announcement, description: <a href={blogPath(locale as BlogLocale, REBRAND_BLOG_SLUG)}>{copy.more}</a>, duration: 0 });
    }, [locale, notification, pathname, user]);
    return null;
}
