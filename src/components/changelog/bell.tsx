import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, X } from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";
import { localizedPublicPath } from "@/i18n/locale-routing";
import { BLOG_LOCALES } from "@/content/blog-locales";
import { LibTVNavHint } from "@/components/layout/libtv-navigation-controls";
import { getActiveUserScope, scopedLocalStorage } from "@/lib/user-scope";
import { useUserStore } from "@/stores/use-user-store";
import { getReleaseReads, getReleaseReminders, markReleaseReminder, getReleases, markReleaseRead, type ReleasePage } from "@/services/api/changelog";
import { ReleaseTimeline } from "./timeline";
import { changelogCopy, changelogPageCopy } from "./copy";
import "./changelog.css";

export function ChangelogBell({ expanded }: { expanded: boolean }) {
    const { locale } = useI18n();
    const c = changelogCopy(locale);
    const p = changelogPageCopy(locale);
    const user = useUserStore((s) => s.user);
    const hydrated = useUserStore((s) => s.hydrated);
    const [open, setOpen] = useState(false);
    const [data, setData] = useState<ReleasePage>();
    const [error, setError] = useState(false);
    const [read, setRead] = useState<string[]>([]);
    const [reminder, setReminder] = useState<{ id: string; text: string }>();
    const trigger = useRef<HTMLButtonElement>(null);
    const panel = useRef<HTMLElement>(null);
    const dragStart = useRef(0);
    const [revision, setRevision] = useState(0);
    useEffect(() => {
        if (!hydrated) return;
        let cancelled = false;
        const controller = new AbortController();
        setData(undefined);
        setError(false);
        setReminder(undefined);
        setRead([]);
        void getReleases(1, false, controller.signal)
            .then(async (result) => {
                if (cancelled) return;
                setData(result);
                const signedIn = getActiveUserScope() !== "guest";
                const seen: string[] = signedIn ? (await getReleaseReminders()).seenIds : JSON.parse(scopedLocalStorage.getItem("changelog-reminders") || "[]");
                if (cancelled) return;
                const entry = result.releases.flatMap((r) => r.entries).find((e) => e.important && !seen.includes(e.id));
                if (entry) {
                    if (signedIn) await markReleaseReminder(entry.id);
                    if (cancelled) return;
                    setReminder({ id: entry.id, text: entry.text[locale] });
                    scopedLocalStorage.setItem("changelog-reminders", JSON.stringify([...seen, entry.id]));
                }
            })
            .catch(() => {
                if (!cancelled) setError(true);
            });
        if (getActiveUserScope() !== "guest")
            void getReleaseReads()
                .then((result) => {
                    if (!cancelled) setRead(result.readIds || []);
                })
                .catch(() => {});
        else setRead(JSON.parse(scopedLocalStorage.getItem("changelog-reads") || "[]"));
        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [user?.id, hydrated, locale, revision]);
    const mark = async (ids: string[]) => {
        try {
            if (getActiveUserScope() !== "guest") await markReleaseRead(ids);
            const next = [...new Set([...read, ...ids])];
            scopedLocalStorage.setItem("changelog-reads", JSON.stringify(next));
            setRead(next);
        } catch {
            setError(true);
        }
    };
    useEffect(() => {
        if (!open) return;
        panel.current?.focus();
        const dismiss = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setOpen(false);
                trigger.current?.focus();
            }
        };
        const outside = (e: PointerEvent) => {
            if (!panel.current?.contains(e.target as Node) && !trigger.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("keydown", dismiss);
        document.addEventListener("pointerdown", outside);
        return () => {
            document.removeEventListener("keydown", dismiss);
            document.removeEventListener("pointerdown", outside);
        };
    }, [open]);
    return (
        <>
            <LibTVNavHint title={c[0]} description={c[4]} icon={Bell} enabled={!expanded && !open}>
                <button
                    ref={trigger}
                    type="button"
                    className="ll-home-side-item cl-bell"
                    aria-label={c[0]}
                    aria-expanded={open}
                    onClick={() => {
                        setOpen(!open);
                        setReminder(undefined);
                    }}
                >
                    <Bell aria-hidden />
                    <span>{c[0]}</span>
                    {data?.releases.some((r) => !read.includes(r.id)) && <i className="cl-dot" />}
                </button>
            </LibTVNavHint>
            {open &&
                createPortal(
                    <section tabIndex={-1} ref={panel} className={`cl-panel ${expanded ? "cl-expanded" : ""}`} role="dialog" aria-label={c[0]}>
                        <div
                            className="cl-drawer-handle"
                            aria-hidden="true"
                            onPointerDown={(e) => {
                                dragStart.current = e.clientY;
                                e.currentTarget.setPointerCapture(e.pointerId);
                            }}
                            onPointerUp={(e) => {
                                if (e.clientY - dragStart.current > 55) {
                                    setOpen(false);
                                    trigger.current?.focus();
                                }
                            }}
                        />
                        <header>
                            <h2>{c[0]}</h2>
                            <a href={localizedPublicPath("/changelog", BLOG_LOCALES.find((value) => value === locale) ?? "en-US")}>{c[4]} ↗</a>
                            <button
                                aria-label={c[23]}
                                onClick={() => {
                                    setOpen(false);
                                    trigger.current?.focus();
                                }}
                            >
                                <X size={18} />
                            </button>
                        </header>
                        <div className="cl-scroll">
                            {data && (
                                <>
                                    <p className="cl-evidence">
                                        {locale.startsWith("zh") ? (
                                            <>
                                                {c[1]} · 更新 <b>{data.stats.updates}</b> 次 · {locale === "zh-CN" ? "改进" : "改進"} <b>{data.stats.items}</b> {locale === "zh-CN" ? "项" : "項"}
                                            </>
                                        ) : (
                                            <>
                                                {c[1]} · <b>{data.stats.updates}</b> {c[2]} · <b>{data.stats.items}</b> {c[3]}
                                            </>
                                        )}
                                    </p>
                                    <div className="cl-activity">
                                        {Object.entries(data.stats.days)
                                            .sort()
                                            .map(([day, count]) => (
                                                <a
                                                    key={day}
                                                    href={`#release-${day}`}
                                                    title={`${day} · ${count}`}
                                                    onClick={() => {
                                                        const details = document.getElementById(`release-${day}`);
                                                        if (details instanceof HTMLDetailsElement) details.open = true;
                                                    }}
                                                    style={{ height: `${count ? Math.max(8, (count / Math.max(1, ...Object.values(data.stats.days))) * 40) : 3}px` }}
                                                    data-active={count > 0}
                                                />
                                            ))}
                                    </div>
                                    <ReleaseTimeline
                                        releases={data.releases}
                                        readIds={read}
                                        onRead={(id) => {
                                            if (!read.includes(id)) void mark([id]);
                                        }}
                                    />
                                    {!data.releases.length && <p role="status">{c[21]}</p>}
                                </>
                            )}
                            {!data && !error && <p role="status">{c[18]}</p>}
                            {error && (
                                <p role="alert">
                                    {c[19]} <button onClick={() => setRevision(revision + 1)}>{c[20]}</button>
                                </p>
                            )}
                        </div>
                        <footer>
                            <button onClick={() => void mark(data?.releases.map((r) => r.id) || [])}>{c[24]}</button>
                        </footer>
                    </section>,
                    document.body,
                )}
            {reminder &&
                !open &&
                createPortal(
                    <aside className={`cl-reminder ${expanded ? "cl-expanded" : ""}`}>
                        <button aria-label={c[23]} onClick={() => setReminder(undefined)}>
                            <X size={16} />
                        </button>
                        <h3>{c[0]}</h3>
                        <p>{reminder.text}</p>
                        <button
                            onClick={() => {
                                setReminder(undefined);
                                setOpen(true);
                            }}
                        >
                            {p.view} →
                        </button>
                        <button onClick={() => setReminder(undefined)}>{p.dismiss}</button>
                    </aside>,
                    document.body,
                )}
        </>
    );
}
