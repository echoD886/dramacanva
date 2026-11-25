import { useState, useEffect, useCallback, useTransition } from "react";
import { useParams, useSearchParams } from "react-router";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";
import type { AIVideoTemplateCard, TemplateDirectoryContent } from "@/types/ai-video-template";
import { listAIVideoTemplates } from "@/services/api/ai-video-templates";
import { TrendingRow } from "./components/trending-row";
import { FilterBar, SearchField, type TemplateSort } from "./components/filter-bar";
import { MasonryGrid } from "./components/masonry-grid";
import { FooterQA } from "./components/footer-qa";
import { BackToTop } from "./components/back-to-top";
import { categoryLabelKey } from "./components/categories";
import "./ai-video-templates.css";
import { libraryTemplates } from "./library-templates";

export default function AIVideoTemplatesListPage() {
    const { t, locale } = useI18n();
    const params = useParams<{ category?: string }>();
    const [, startTransition] = useTransition();

    const [searchParams, setSearchParams] = useSearchParams();
    const rawPeriod = searchParams.get("period");
    const period = rawPeriod === "today" || rawPeriod === "week" || rawPeriod === "month" ? rawPeriod : "all";

    const activeCategory = params.category || "all";
    const [sort, setSort] = useState<TemplateSort>("hot");
    const [searchQuery, setSearchQuery] = useState("");
    const [items, setItems] = useState<AIVideoTemplateCard[]>([]);
    const [trending, setTrending] = useState<AIVideoTemplateCard[]>([]);
    const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
    const [directory, setDirectory] = useState<TemplateDirectoryContent | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState(false);
    const [loadMoreError, setLoadMoreError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);

    const handleRetry = useCallback(() => {
        setError(false);
        setLoadMoreError(false);
        setRetryCount((c) => c + 1);
    }, []);

    // Library (filters, sort, search).
    useEffect(() => {
        let current = true;
        setIsLoading(true);
        setError(false);
        void listAIVideoTemplates({ category: activeCategory, sort, period, q: searchQuery, limit: 30, locale })
            .then((res) => {
                if (!current) return;
                startTransition(() => {
                    setItems(res.items);
                    setNextCursor(res.nextCursor || undefined);
                    setDirectory(res.directory);
                    setIsLoading(false);
                });
            })
            .catch(() => {
                if (!current) return;
                setError(true);
                setIsLoading(false);
            });
        return () => {
            current = false;
        };
    }, [activeCategory, sort, period, searchQuery, locale, retryCount]);

    // "Trending this week" is always the hot ranking of this hub/category, independent of the library sort.
    useEffect(() => {
        let current = true;
        void listAIVideoTemplates({ category: activeCategory, sort: "hot", limit: 7, locale })
            .then((res) => current && setTrending(res.items))
            .catch(() => current && setTrending([]));
        return () => {
            current = false;
        };
    }, [activeCategory, locale, retryCount]);

    const handleLoadMore = useCallback(() => {
        if (!nextCursor || isLoadingMore || isLoading) return;
        setIsLoadingMore(true);
        setLoadMoreError(false);
        void listAIVideoTemplates({ category: activeCategory, sort, period, q: searchQuery, cursor: nextCursor, limit: 24, locale })
            .then((res) => {
                startTransition(() => {
                    setItems((prev) => {
                        const seen = new Set(prev.map((item) => item.slug));
                        return [...prev, ...res.items.filter((item) => !seen.has(item.slug))];
                    });
                    setNextCursor(res.nextCursor || undefined);
                    setIsLoadingMore(false);
                });
            })
            .catch(() => {
                setLoadMoreError(true);
                setIsLoadingMore(false);
            });
    }, [nextCursor, isLoadingMore, isLoading, activeCategory, sort, period, searchQuery, locale]);

    // Scroll the page (it is its own scroll root inside the app shell) back to top on category change.
    useEffect(() => {
        document.querySelector(".aivt-page-root")?.scrollTo({ top: 0 });
    }, [activeCategory]);

    const categoryKey = categoryLabelKey(activeCategory);
    const title = directory?.title || (categoryKey ? `${t(categoryKey)} · ${t("aiVideoTemplates.heroTitle")}` : t("aiVideoTemplates.heroTitle"));
    const showTrending = !searchQuery && trending.length >= 3;
    const empty = !isLoading && !error && items.length === 0;

    return (
        <div className="aivt-page-root aivt-list-page">
            <div className="aivt-shell">
                <header className="aivt-list-head">
                    <p className="aivt-eyebrow">{t("aiVideoTemplates.eyebrow")}</p>
                    <h1 className="aivt-serif aivt-h1">{title}</h1>
                    {directory?.intro && <p className="aivt-lede">{directory.intro}</p>}
                    <SearchField searchQuery={searchQuery} onSearchChange={setSearchQuery} />
                </header>

                {showTrending && <TrendingRow items={trending} />}

                <section className="aivt-library" aria-label={t("aiVideoTemplates.libraryTitle")}>
                    <FilterBar
                        activeCategory={activeCategory}
                        sort={sort}
                        onSortChange={setSort}
                        period={period}
                        onPeriodChange={(value) =>
                            setSearchParams((previous) => {
                                const next = new URLSearchParams(previous);
                                if (value === "all") next.delete("period");
                                else next.set("period", value);
                                return next;
                            })
                        }
                    />

                    {error && items.length === 0 ? (
                        <div className="aivt-state">
                            <AlertCircle aria-hidden="true" />
                            <p>{t("aiVideoTemplates.errorLoad")}</p>
                            <button type="button" className="aivt-btn-quiet" onClick={handleRetry}>
                                <RefreshCw aria-hidden="true" />
                                <span>{t("aiVideoTemplates.retry")}</span>
                            </button>
                        </div>
                    ) : empty ? (
                        <div className="aivt-state">
                            <p>{t("aiVideoTemplates.emptyList")}</p>
                        </div>
                    ) : (
                        <MasonryGrid
                            items={libraryTemplates(items, trending, showTrending && activeCategory === "all" && period === "all" && sort === "hot")}
                            isLoading={isLoading || isLoadingMore}
                            hasMore={Boolean(nextCursor)}
                            onLoadMore={handleLoadMore}
                        />
                    )}

                    {loadMoreError && (
                        <div className="aivt-state is-inline">
                            <button type="button" className="aivt-btn-quiet" onClick={handleLoadMore}>
                                <RefreshCw aria-hidden="true" />
                                <span>{t("aiVideoTemplates.retry")}</span>
                            </button>
                        </div>
                    )}
                </section>

                <FooterQA faq={directory?.faq} />
            </div>
            <BackToTop />
        </div>
    );
}
