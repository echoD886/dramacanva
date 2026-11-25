import { useEffect, useRef, memo } from "react";
import type { AIVideoTemplateCard } from "@/types/ai-video-template";
import { TemplateCard } from "./template-card";

type MasonryGridProps = {
    items: AIVideoTemplateCard[];
    isLoading: boolean;
    hasMore: boolean;
    onLoadMore: () => void;
    priorityCount?: number;
};

/** Library grid with infinite scroll; the scroll root is the page itself (.aivt-page-root). */
export const MasonryGrid = memo(function MasonryGrid({ items, isLoading, hasMore, onLoadMore, priorityCount = 5 }: MasonryGridProps) {
    const sentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel || !hasMore || isLoading || typeof IntersectionObserver === "undefined") return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) onLoadMore();
            },
            { root: sentinel.closest(".aivt-page-root"), rootMargin: "600px 0px" },
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [hasMore, isLoading, onLoadMore]);

    return (
        <>
            <div className="aivt-grid">
                {items.map((item, index) => (
                    <TemplateCard key={item.slug} template={item} priority={index < priorityCount} />
                ))}
                {isLoading &&
                    Array.from({ length: items.length ? 5 : 10 }).map((_, idx) => (
                        <div key={`skeleton-${idx}`} className="aivt-card is-skeleton" aria-hidden="true">
                            <span className="aivt-card-media" />
                            <span className="aivt-skeleton-line" />
                            <span className="aivt-skeleton-line is-short" />
                        </div>
                    ))}
            </div>
            <div ref={sentinelRef} className="aivt-grid-sentinel" aria-hidden="true" />
        </>
    );
});
