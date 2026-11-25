import { memo, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePreview } from "./use-preview";
import { Link } from "react-router";
import { useI18n } from "@/i18n/use-i18n";
import { localizedPublicPath } from "@/i18n/locale-routing";
import type { AIVideoTemplateCard } from "@/types/ai-video-template";
import { prefetchAIVideoTemplate } from "@/services/api/ai-video-templates";
import { formatCount, heatStageKey, parseAspectRatio } from "../utils";

type TrendingRowProps = {
    items: AIVideoTemplateCard[];
};

export const TrendingRow = memo(function TrendingRow({ items }: TrendingRowProps) {
    const { t } = useI18n();
    const listRef = useRef<HTMLOListElement>(null);

    if (items.length === 0) return null;
    return (
        <section className="aivt-trending" aria-labelledby="aivt-trending-title">
            <div className="aivt-section-head">
                <h2 id="aivt-trending-title" className="aivt-serif aivt-trending-title">
                    {t("aiVideoTemplates.trendingTitle")}
                </h2>
                <div className="aivt-strip-controls">
                    <p className="aivt-section-note">{t("aiVideoTemplates.trendingNote")}</p>
                    <button type="button" className="aivt-icon-btn" aria-label={`${t("aiVideoTemplates.trendingTitle")} ←`} onClick={() => listRef.current?.scrollBy({ left: -400, behavior: "smooth" })}>
                        <ChevronLeft />
                    </button>
                    <button type="button" className="aivt-icon-btn" aria-label={`${t("aiVideoTemplates.trendingTitle")} →`} onClick={() => listRef.current?.scrollBy({ left: 400, behavior: "smooth" })}>
                        <ChevronRight />
                    </button>
                </div>
            </div>
            <ol ref={listRef} className="aivt-showcase" data-aivt-hscroll>
                {items.map((item, index) => (
                    <ShowcaseCard key={item.slug} item={item} rank={index + 1} showStage={new Set(items.map((item) => item.heatStage)).size > 1} />
                ))}
            </ol>
        </section>
    );
});

function ShowcaseCard({ item, rank, showStage }: { item: AIVideoTemplateCard; rank: number; showStage: boolean }) {
    const { t, locale } = useI18n();
    const videoRef = usePreview(item.previewUrl);
    const href = localizedPublicPath(`/ai-video-templates/${item.slug}`, locale as "en-US");
    const stageKey = heatStageKey(item.heatStage);
    const fillsBox = parseAspectRatio(item.aspectRatio) <= 9 / 16 + 0.06;

    return (
        <li>
            <Link to={href} className="aivt-showcase-card" onMouseEnter={() => prefetchAIVideoTemplate(item.slug, locale)} onFocus={() => prefetchAIVideoTemplate(item.slug, locale)}>
                <span className={`aivt-showcase-media${fillsBox ? " is-filled" : ""}`}>
                    {!fillsBox && <img className="aivt-card-fill" src={item.coverUrl} alt="" aria-hidden="true" decoding="async" />}
                    <img className="aivt-showcase-cover" src={item.coverUrl} alt={item.title} loading={rank <= 3 ? "eager" : "lazy"} decoding="async" fetchPriority={rank === 1 ? "high" : "auto"} />
                    <video ref={videoRef} className="aivt-showcase-video" data-src={item.previewUrl} poster={item.coverUrl} muted loop playsInline preload="none" aria-hidden="true" tabIndex={-1} />
                    <span className="aivt-showcase-rank aivt-serif">
                        <span className="sr-only">#</span>
                        {rank}
                    </span>
                    {showStage && stageKey && <span className={`aivt-chip aivt-showcase-stage is-${item.heatStage}`}>{t(stageKey)}</span>}
                </span>
                <span className="aivt-showcase-body">
                    <span className="aivt-showcase-name">{item.title}</span>
                    <span className="aivt-showcase-plays">{t("aiVideoTemplates.playsCount", { count: formatCount(item.plays) })}</span>
                </span>
            </Link>
        </li>
    );
}
