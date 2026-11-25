import { useEffect, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router";
import { publicArticles } from "@/content/blog";
import { parseBlogPath, type BlogColumn } from "@/content/blog-locales";
import { BLOG_UI, articlesCountLabel } from "@/content/blog-ui";
import { useI18n } from "@/i18n/use-i18n";
import { articleColumn } from "@/lib/blog-reading";
import { BlogCard, BlogGrid } from "./blog-cards";
import { BackToTop, useFilterTransition, useScrollExperience } from "@/components/scroll/scroll-experience";
import "./blog.css";

const categories: readonly BlogColumn[] = ["guide", "compare", "models", "news"];

export default function BlogPage() {
    const { t } = useI18n();
    const location = useLocation();
    const [params, setParams] = useSearchParams();
    const locale = parseBlogPath(location.pathname)?.locale ?? "zh-CN";
    const category = params.get("category");
    const selected = categories.find((item) => item === category) ?? null;
    const all = publicArticles(locale).sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
    const ui = BLOG_UI[locale];
    const featured = selected ? undefined : (all.find((post) => post.slug === "infinite-canvas-guide") ?? all[0]);
    const posts = all.filter((post) => (selected ? articleColumn(post) === selected : post.slug !== featured?.slug));
    const filters = useRef<HTMLElement>(null);
    const [moreFilters, setMoreFilters] = useState(false);
    const page = useRef<HTMLElement>(null);
    const results = useRef<HTMLDivElement>(null);
    const transition = useFilterTransition(results);
    const showTop = useScrollExperience(page, `${locale}:${selected ?? "all"}`);

    useEffect(() => {
        const nav = filters.current;
        if (!nav) return;
        const update = () => setMoreFilters(nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 1);
        const revealSelected = () => {
            const button = nav.querySelector<HTMLElement>('[aria-pressed="true"]');
            if (button) {
                const item = button.getBoundingClientRect();
                const bounds = nav.getBoundingClientRect();
                if (item.left < bounds.left || item.right > bounds.right - 24) {
                    nav.scrollLeft += item.left - bounds.left - (nav.clientWidth - item.width) / 2;
                }
            }
            update();
        };
        const resize = new ResizeObserver(revealSelected);
        resize.observe(nav);
        nav.addEventListener("scroll", update, { passive: true });
        revealSelected();
        return () => {
            resize.disconnect();
            nav.removeEventListener("scroll", update);
        };
    }, [selected, locale]);

    return (
        <main ref={page} className="yingce-blog-page">
            <div className="isa-blog-container">
                <header className="yingce-blog-hero">
                    <h1>{t("blog.guide")}</h1>
                    <p>{t("blog.description")}</p>
                </header>
                <div className="yingce-blog-filter-frame" data-overflow-right={moreFilters}>
                    <nav ref={filters} className="yingce-blog-filters" aria-label={t("blog.categories")}>
                        {[null, ...categories].map((item) => (
                            <button
                                key={item ?? "all"}
                                type="button"
                                aria-pressed={selected === item}
                                onClick={() => transition(() =>
                                    setParams(
                                        (previous) => {
                                            const next = new URLSearchParams(previous);
                                            if (item) next.set("category", item);
                                            else next.delete("category");
                                            return next;
                                        },
                                        { preventScrollReset: true },
                                    )
                                )}
                            >
                                {item ? ui[item] : ui.all}
                            </button>
                        ))}
                    </nav>
                </div>
                <div className="isa-blog-results" ref={results}>
                    {featured ? <BlogCard article={featured} locale={locale} featured /> : null}
                    <section aria-label={selected ? ui[selected] : ui.all}>
                        <div className="isa-blog-grid-heading">
                            <h2>{selected ? ui[selected] : ui.all}</h2>
                            <span role="status">{articlesCountLabel(locale, posts.length)}</span>
                        </div>
                        <BlogGrid articles={posts} locale={locale} />
                    </section>
                </div>
            </div>
            <BackToTop page={page} visible={showTop} />
        </main>
    );
}
