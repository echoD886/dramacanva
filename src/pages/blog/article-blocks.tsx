import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { type BlogArticle, type BlogArticleIndex } from "@/content/blog";
import type { BlogFigure, BlogLocale } from "@/content/blog-locales";
import { blogPath } from "@/content/blog-locales";
import { BLOG_UI, BLOG_READING_UI, seriesStepLabel } from "@/content/blog-ui";
import { activeHeading, seriesArticles } from "@/lib/blog-reading";
import { useI18n } from "@/i18n/use-i18n";
import { trackPublicEvent } from "@/services/public-page-analytics";
import { findScrollContainer } from "@/lib/scroll-container";
import { useArticleGallery } from "./article-gallery";

export function TakeawayText({ text, renderInline = (text) => text }: { text: string; renderInline?: (text: string) => ReactNode }) {
    const normalized = text.replace(/\*\*\s+([:：])/g, "**$1");
    return (
        <>
            {normalized.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
                if (part.startsWith("**") && part.endsWith("**")) {
                    return (
                        <strong className="isa-blog-takeaway-conclusion" key={index}>
                            {renderInline(part.slice(2, -2).trim())}
                        </strong>
                    );
                }
                return renderInline(part.replace(/^\s+([:：])/, "$1"));
            })}
        </>
    );
}

export function ArticleFigure({ figure, locale, articleSlug }: { figure: BlogFigure & { captions?: string; assetId?: string }; locale: BlogLocale; articleSlug?: string }) {
    const openGallery = useArticleGallery();
    const ui = BLOG_UI[locale];
    const { t } = useI18n();
    return (
        <figure className="isa-blog-figure" data-blog-block="figure">
            {figure.kind === "video" ? (
                <video
                    controls
                    playsInline
                    preload="none"
                    poster={figure.poster}
                    width={figure.width}
                    height={figure.height}
                    onPlay={(event) => {
                        event.currentTarget
                            .closest("article")
                            ?.querySelectorAll("video")
                            .forEach((video) => {
                                if (video !== event.currentTarget) video.pause();
                            });
                        if (articleSlug && figure.assetId) trackPublicEvent("video_play", { article_id: articleSlug, media_id: figure.assetId });
                    }}
                    onError={() => {
                        if (articleSlug && figure.assetId) trackPublicEvent("video_error", { article_id: articleSlug, media_id: figure.assetId });
                    }}
                >
                    <source src={figure.src} />
                    {figure.captions ? <track kind="captions" src={figure.captions} srcLang="zh" label={t("blog.chineseCaptions")} default /> : null}
                    <a href={figure.src}>{t("blog.openVideo")}</a>
                </video>
            ) : (
                <>
                    <button type="button" className="isa-blog-figure-button" data-blog-image data-scroll-reveal={`figure:${figure.src}`} data-scroll-image aria-label={`${ui.zoom}: ${figure.alt}`} onClick={(event) => openGallery?.(event.currentTarget)}>
                        <picture>
                            {figure.mobile ? <source media="(max-width: 600px)" srcSet={figure.mobile.webp} type="image/webp" /> : null}
                            {figure.mobile ? <source media="(max-width: 600px)" srcSet={figure.mobile.src} type="image/jpeg" /> : null}
                            {figure.webp ? <source srcSet={figure.webp} type="image/webp" /> : null}
                            <img src={figure.src} alt={figure.alt} width={figure.width} height={figure.height} loading="lazy" />
                        </picture>
                    </button>
                </>
            )}
            <figcaption>{figure.caption}</figcaption>
        </figure>
    );
}

export function PromptBlock({ label, content, locale }: { label: string; content: string; locale: BlogLocale }) {
    const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
    useEffect(() => {
        if (status === "idle") return;
        const timer = window.setTimeout(() => setStatus("idle"), 2500);
        return () => window.clearTimeout(timer);
    }, [status]);
    const ui = BLOG_UI[locale];
    return (
        <div className="isa-blog-code" data-blog-block="code">
            <div className="isa-blog-code-header">
                <div className="isa-blog-code-title">
                    <span className="isa-blog-code-badge" aria-hidden="true" />
                    <strong>{label}</strong>
                </div>
                <div className="isa-blog-code-actions">
                    <span role="status" className={`isa-blog-code-status ${status}`}>
                        {status === "copied" ? ui.copied : status === "error" ? ui.copyError : ""}
                    </span>
                    <button
                        type="button"
                        data-blog-action="copy"
                        onClick={async () => {
                            try {
                                await navigator.clipboard.writeText(content);
                                setStatus("copied");
                            } catch {
                                setStatus("error");
                            }
                        }}
                    >
                        {ui.copy}
                    </button>
                </div>
            </div>
            <pre>
                <code>{content}</code>
            </pre>
        </div>
    );
}

export function useArticleReading(article: BlogArticle) {
    const container = useRef<HTMLElement>(null);
    const [active, setActive] = useState<string | undefined>("article-takeaways");
    const [progress, setProgress] = useState(0);
    const clickedHash = useRef<string | null>(null);
    const { hash } = useLocation();
    const navigate = useNavigate();

    const scrollToHeading = useCallback((id: string, smooth: boolean) => {
        const page = container.current;
        const target = page?.querySelector<HTMLElement>(`[id="${CSS.escape(id)}"]`);
        const heading = target?.querySelector<HTMLElement>("h2");
        if (!page || !heading) return;
        const root = findScrollContainer(page);
        const rootTop = root === document.scrollingElement ? 0 : root.getBoundingClientRect().top;
        root.scrollTo({ top: root.scrollTop + heading.getBoundingClientRect().top - rootTop - 28, behavior: smooth && !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "smooth" : "instant" });
        heading.focus({ preventScroll: true });
        setActive(id);
    }, []);

    useEffect(() => {
        const page = container.current;
        if (!page) return;
        const root = findScrollContainer(page);
        const eventTarget = root === document.scrollingElement ? window : root;
        const targets = [...page.querySelectorAll<HTMLElement>("[data-blog-heading]")];
        let frame = 0;
        const update = () => {
            const rootTop = root === document.scrollingElement ? 0 : root.getBoundingClientRect().top;
            setActive(activeHeading(targets.map((target) => ({ id: target.id, top: (target.querySelector("h2") ?? target).getBoundingClientRect().top - rootTop }))));
            setProgress(Math.round(Math.min(1, Math.max(0, root.scrollTop / Math.max(1, root.scrollHeight - root.clientHeight))) * 100));
        };
        const schedule = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(update);
        };
        const resize = new ResizeObserver(schedule);
        resize.observe(root);
        const prose = page.querySelector("article");
        if (prose) resize.observe(prose);
        eventTarget.addEventListener("scroll", schedule, { passive: true });
        window.addEventListener("resize", schedule);
        update();
        return () => {
            cancelAnimationFrame(frame);
            resize.disconnect();
            eventTarget.removeEventListener("scroll", schedule);
            window.removeEventListener("resize", schedule);
        };
    }, [article.slug]);

    useEffect(() => {
        const smooth = clickedHash.current === hash;
        clickedHash.current = null;
        if (!hash) return;
        // History traversal restores the browser's scroll position after popstate.
        // Apply the article anchor on the next frame so it wins that restoration.
        const frame = requestAnimationFrame(() => {
            try {
                scrollToHeading(decodeURIComponent(hash.slice(1)), smooth);
            } catch {
                /* Invalid URL fragments have no matching heading. */
            }
        });
        return () => cancelAnimationFrame(frame);
    }, [article.slug, hash, scrollToHeading]);

    const jump = (id: string) => {
        // Keep React Router's history state intact, including back/forward navigation.
        if (hash === `#${id}`) {
            scrollToHeading(id, true);
            return;
        }
        clickedHash.current = `#${id}`;
        navigate({ hash: `#${id}` }, { preventScrollReset: true });
    };
    return { container, active, progress, jump };
}

export function ArticleToc({
    article,
    label,
    faqLabel,
    takeawayLabel,
    active,
    onNavigate,
    mobile = false,
}: {
    article: BlogArticle;
    label: string;
    faqLabel: string;
    takeawayLabel: string;
    active?: string;
    onNavigate: (id: string) => void;
    mobile?: boolean;
}) {
    const viewportRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const indicatorRef = useRef<HTMLSpanElement>(null);
    const headings = [{ id: "article-takeaways", title: takeawayLabel }, ...article.sections, { id: "article-faq", title: faqLabel }];
    // Nine single-line desktop rows already exceed 260px (27.5px + 4px gaps).
    // Reserve their reading-line spacer before hydration; wrapping only adds height.
    const revealLink = useCallback((link: HTMLElement, smooth: boolean) => {
        const viewport = viewportRef.current;
        const track = trackRef.current;
        if (!viewport || !track) return;
        const anchor = parseFloat(getComputedStyle(track).paddingTop);
        viewport.scrollTo({
            top: viewport.dataset.overflow === "true" ? link.offsetTop - anchor : 0,
            behavior: smooth && !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "smooth" : "instant",
        });
    }, []);
    useEffect(() => {
        const viewport = viewportRef.current;
        const track = trackRef.current;
        const list = track?.querySelector("ul");
        const indicator = indicatorRef.current;
        if (mobile || !viewport || !track || !list || !indicator) return;
        const update = () => {
            if (!viewport.clientHeight) return;
            // Measure the unpadded list so a short TOC never gains a mask from its own spacers.
            viewport.dataset.overflow = String(list.offsetHeight > viewport.clientHeight + 1);
            track.style.setProperty("--blog-toc-last-height", `${list.lastElementChild?.getBoundingClientRect().height ?? 0}px`);
            const link = list.querySelector<HTMLElement>('[aria-current="location"]');
            if (!link) return;
            indicator.style.height = `${link.offsetHeight}px`;
            indicator.style.transform = `translateY(${link.offsetTop}px)`;
            viewport.dataset.ready = "true";
            const focused = document.activeElement;
            revealLink(focused instanceof HTMLElement && list.contains(focused) ? focused : link, true);
        };
        let frame = 0;
        const resize = new ResizeObserver(() => {
            // Mask spacers can change the viewport height; write outside the observer delivery.
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(update);
        });
        resize.observe(viewport);
        resize.observe(list);
        update();
        return () => {
            cancelAnimationFrame(frame);
            resize.disconnect();
        };
    }, [active, mobile, article, label, faqLabel, takeawayLabel, revealLink]);
    const links = (
        <ul>
            {headings.map((section) => (
                <li key={section.id}>
                    <a
                        href={`#${section.id}`}
                        aria-current={active === section.id ? "location" : undefined}
                        onFocus={(event) => revealLink(event.currentTarget, false)}
                        onClick={(event) => {
                            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                            event.preventDefault();
                            const details = event.currentTarget.closest("details");
                            if (details) details.open = false;
                            onNavigate(section.id);
                        }}
                    >
                        {section.title}
                    </a>
                </li>
            ))}
        </ul>
    );
    return (
        <nav className={`isa-blog-toc ${mobile ? "isa-blog-toc-mobile" : "isa-blog-toc-desktop"}`} aria-label={label}>
            {mobile ? (
                <details>
                    <summary>{label}</summary>
                    {links}
                </details>
            ) : (
                <>
                    <strong>{label}</strong>
                    <div ref={viewportRef} className="isa-blog-toc-viewport" data-overflow={headings.length >= 9 ? "true" : undefined}>
                        <div ref={trackRef} className="isa-blog-toc-track">
                            {links}
                            <span ref={indicatorRef} className="isa-blog-toc-indicator" aria-hidden="true" />
                        </div>
                    </div>
                </>
            )}
        </nav>
    );
}

export function SeriesNav({ article, articles, locale }: { article: BlogArticle; articles: (BlogArticle | BlogArticleIndex)[]; locale: BlogLocale }) {
    const available = articles.filter((item) => item.status === "published" && (!item.publishedLocales || item.publishedLocales.includes(locale))).sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
    const items = seriesArticles(article, available);
    const index = available.findIndex((item) => item.slug === article.slug);
    const seriesPrevious = items.filter((item) => item.series!.index < article.series!.index).at(-1);
    const seriesNext = items.find((item) => item.series!.index > article.series!.index);
    const previous =
        seriesPrevious ??
        (index > 0
            ? available
                  .slice(0, index)
                  .reverse()
                  .find((item) => item.slug !== seriesNext?.slug)
            : undefined);
    const next = seriesNext ?? (index >= 0 ? available.slice(index + 1).find((item) => item.slug !== previous?.slug) : undefined);
    const ui = BLOG_UI[locale];
    const reading = BLOG_READING_UI[locale];
    if (!previous && !next && !article.series) return null;
    return (
        <nav className="isa-blog-series" aria-label={article.series ? ui.series : reading.related}>
            {article.series ? (
                <div className="isa-blog-series-header">
                    <strong>
                        {ui.series} · {seriesStepLabel(locale, article.series)}
                    </strong>
                    <div className="isa-blog-series-progress-bar" role="progressbar" aria-label={ui.series} aria-valuenow={article.series.index} aria-valuemin={0} aria-valuemax={article.series.total}>
                        <div className="isa-blog-series-progress-fill" style={{ width: `${Math.round((article.series.index / article.series.total) * 100)}%` }} />
                    </div>
                </div>
            ) : null}
            <div className="isa-blog-series-cards">
                {([previous, next] as const).map((item, index) =>
                    item ? (
                        <Link key={item.slug} to={blogPath(locale, item.slug)} className="isa-blog-series-card">
                            <small>
                                {index ? reading.next : reading.previous}
                                {item.series ? ` · ${seriesStepLabel(locale, item.series)}` : ""}
                            </small>
                            <span>{item.title}</span>
                        </Link>
                    ) : (
                        <div key={index} className="isa-blog-series-card is-disabled">
                            <small>{index ? reading.next : reading.previous}</small>
                            <span>{article.series ? (index ? ui.lastStep : ui.firstStep) : "—"}</span>
                        </div>
                    ),
                )}
            </div>
        </nav>
    );
}
