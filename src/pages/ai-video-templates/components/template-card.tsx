import { useCallback, memo } from "react";
import { Link } from "react-router";
import { usePreview } from "./use-preview";
import { useI18n } from "@/i18n/use-i18n";
import { localizedPublicPath } from "@/i18n/locale-routing";
import type { AIVideoTemplateCard } from "@/types/ai-video-template";
import { prefetchAIVideoTemplate } from "@/services/api/ai-video-templates";
import { formatCount, parseAspectRatio } from "../utils";

type TemplateCardProps = {
    template: AIVideoTemplateCard;
    priority?: boolean;
    compact?: boolean;
};

/**
 * Editorial card: rounded 9:16 media (vertical clips fill it; wider clips are shown whole over a blurred
 * fill of the same frame), with a title and stats over the lower gradient.
 */
export const TemplateCard = memo(function TemplateCard({ template, priority = false, compact = false }: TemplateCardProps) {
    const { t, locale } = useI18n();
    const videoRef = usePreview(template.previewUrl);
    const detailHref = localizedPublicPath(`/ai-video-templates/${template.slug}`, locale as "en-US");

    const handleEnter = useCallback(() => {
        prefetchAIVideoTemplate(template.slug, locale);
    }, [template.slug, locale]);

    // 9:16 box: vertical clips fill it edge to edge; only clips wider than the box get the blurred side fill.
    const ratio = parseAspectRatio(template.aspectRatio);
    const fillsBox = ratio <= 9 / 16 + 0.06;
    const chip = template.heatStage === "rising" ? t("aiVideoTemplates.heatRising") : template.newToday ? t("aiVideoTemplates.newToday") : "";

    return (
        <Link to={detailHref} className="aivt-card" data-slug={template.slug} onMouseEnter={handleEnter} onFocus={handleEnter}>
            <span className={`aivt-card-media${fillsBox ? " is-filled" : ""}`}>
                {!fillsBox && <img className="aivt-card-fill" src={template.coverUrl} alt="" aria-hidden="true" loading={priority ? "eager" : "lazy"} decoding="async" />}
                <img className="aivt-card-poster" src={template.coverUrl} alt={template.title} loading={priority ? "eager" : "lazy"} decoding="async" fetchPriority={priority ? "high" : "auto"} />
                <video ref={videoRef} className="aivt-card-video" poster={template.coverUrl} muted loop playsInline preload="none" aria-hidden="true" tabIndex={-1} />
                {chip && <span className="aivt-chip aivt-card-chip">{chip}</span>}
                <span className="aivt-card-use" aria-hidden="true">
                    {t("aiVideoTemplates.useTemplate")}
                </span>
            </span>
            <span className="aivt-card-body">
                <h3 className="aivt-card-title">{template.title}</h3>
                <span className="aivt-card-meta">
                    <span>{t("aiVideoTemplates.playsCount", { count: formatCount(template.plays) })}</span>
                    {!compact && template.likes > 0 && <span>{t("aiVideoTemplates.likesCount", { count: formatCount(template.likes) })}</span>}
                </span>
            </span>
        </Link>
    );
});
