import { memo, useId, useMemo, useState } from "react";
import { ArrowUpRight, Check, ChevronDown, ImagePlus, Music2, Sparkles, UserRound, Play } from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";
import type { AIVideoTemplateCard, AIVideoTemplateContent, TemplateContentSection } from "@/types/ai-video-template";
import { TemplateCard } from "./template-card";
import { isCompetitorUrl } from "../utils";
import { FaqBlock } from "./footer-qa";

type ArticleSectionProps = {
    content?: AIVideoTemplateContent;
    name: string;
    clipCoverUrl: string;
    photoUrl?: string;
    resultUrl?: string | null;
    related: AIVideoTemplateCard[];
    currentSlug: string;
    ctaLabel: string;
    onMake: () => void;
    onTop: () => void;
};

const STANDARD_IDS = new Set(["what", "origin", "why", "song", "variants", "also-called", "how", "tips"]);

function paragraphs(text?: string) {
    return (text || "")
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean);
}

/** "Title: body" / "标题：正文" points (content schema v2) become a titled tip; plain points stay plain. */
function splitPoint(point: string): { title?: string; body: string } {
    const match = /^(.{1,64}?)(?:: |：)\s*(.+)$/s.exec(point);
    return match ? { title: match[1], body: match[2] } : { body: point };
}

function Prose({ text, className }: { text?: string; className?: string }) {
    return (
        <>
            {paragraphs(text).map((p, i) => (
                <p key={i} className={className}>
                    {p}
                </p>
            ))}
        </>
    );
}

/**
 * Article under the make area (schema v2; every block is omitted when its content is missing):
 * how-to triptych → what is it (+ read more) → original post & timeline → tips → FAQ → sources → related.
 * All article text is rendered into the DOM (collapsed parts are only visually clamped).
 */
export const ArticleSection = memo(function ArticleSection({ content, name, clipCoverUrl, photoUrl, resultUrl, related, currentSlug, ctaLabel, onMake, onTop }: ArticleSectionProps) {
    const { t } = useI18n();
    const [readMore, setReadMore] = useState(false);
    const moreId = useId();

    const sections = useMemo(() => {
        const map = new Map<string, TemplateContentSection>();
        for (const s of content?.sections || []) if (s?.id) map.set(s.id, s);
        return map;
    }, [content?.sections]);
    const what = sections.get("what");
    const how = sections.get("how");
    const tips = sections.get("tips");
    const extras = [sections.get("origin"), sections.get("why"), sections.get("song"), sections.get("variants") || sections.get("also-called"), ...(content?.sections || []).filter((s) => s?.id && !STANDARD_IDS.has(s.id))].filter(
        (s): s is TemplateContentSection => Boolean(s && s.question && (s.answer || s.points?.length)),
    );
    const timeline = (content?.timeline || []).filter((node) => node.date && node.label).map((node) => (isCompetitorUrl(node.sourceUrl) ? { ...node, sourceUrl: undefined } : node));
    const rawPost = content?.originalPost;
    const post = rawPost && isCompetitorUrl(rawPost.url) ? { ...rawPost, url: undefined } : rawPost;
    const hasPost = Boolean(post && (post.creator || post.url || post.sound));
    const faq = content?.faq?.length ? content.faq : content?.qa || [];
    const sources = (content?.sources || []).filter((s) => s.url && s.title && !isCompetitorUrl(s.url));
    const relatedItems = related.filter((item) => item.slug !== currentSlug).slice(0, 4);

    return (
        <div className="aivt-article">
            {/* 1. How to make it */}
            <section className="aivt-block" aria-labelledby="aivt-how-title">
                <h2 id="aivt-how-title" className="aivt-serif aivt-h2 aivt-how-title">
                    {how?.question || t("aiVideoTemplates.howTitle", { name })}
                </h2>
                {how?.answer && <Prose text={how.answer} className="aivt-body aivt-how-lede" />}
                <ol className="aivt-steps" data-aivt-hscroll>
                    <li className="aivt-step is-photo">
                        <span className="aivt-step-media">
                            {photoUrl ? (
                                <img src={photoUrl} alt="" />
                            ) : (
                                <span className="aivt-step-empty">
                                    <ImagePlus aria-hidden="true" />
                                    <UserRound aria-hidden="true" />
                                </span>
                            )}
                            <span className="aivt-chip is-dark">{t("aiVideoTemplates.yourPhoto")}</span>
                        </span>
                        <StepText n={1} title={t("aiVideoTemplates.howStep1")} body={t("aiVideoTemplates.howStep1Desc")} />
                    </li>
                    <li className="aivt-step">
                        <span className="aivt-step-media">
                            <img src={clipCoverUrl} alt="" loading="lazy" />
                            <span className="aivt-chip is-dark">{t("aiVideoTemplates.originalVideo")}</span>
                        </span>
                        <StepText n={2} title={t("aiVideoTemplates.howStep2")} body={t("aiVideoTemplates.howStep2Desc")} />
                    </li>
                    <li className="aivt-step">
                        <span className="aivt-step-media">
                            {resultUrl ? (
                                <video src={resultUrl} muted loop playsInline autoPlay />
                            ) : (
                                <span className="aivt-step-empty">
                                    <Sparkles aria-hidden="true" />
                                    <Play aria-hidden="true" />
                                </span>
                            )}
                            <span className="aivt-chip is-dark">{t("aiVideoTemplates.aiVersion")}</span>
                        </span>
                        <StepText n={3} title={t("aiVideoTemplates.howStep3")} body={t("aiVideoTemplates.howStep3Desc")} />
                    </li>
                </ol>
                <dl className="aivt-keeps">
                    <div>
                        <dt>{t("aiVideoTemplates.whatStays")}</dt>
                        <dd>
                            {(["aiVideoTemplates.stayLocation", "aiVideoTemplates.stayMotion", "aiVideoTemplates.stayRhythm", "aiVideoTemplates.staySound"] as const).map((key) => (
                                <span key={key} className="aivt-check-chip">
                                    <Check aria-hidden="true" />
                                    {t(key)}
                                </span>
                            ))}
                        </dd>
                    </div>
                    <div>
                        <dt>{t("aiVideoTemplates.whatChanges")}</dt>
                        <dd>
                            {(["aiVideoTemplates.changeYou", "aiVideoTemplates.changeLook"] as const).map((key) => (
                                <span key={key} className="aivt-check-chip is-change">
                                    <Sparkles aria-hidden="true" />
                                    {t(key)}
                                </span>
                            ))}
                        </dd>
                    </div>
                </dl>
            </section>

            {/* 2. What is the trend (+ origin / why / song / variants behind "Read more") */}
            {what && (
                <section className="aivt-split" aria-labelledby="aivt-what-title">
                    <div className="aivt-split-aside">
                        <h2 id="aivt-what-title" className="aivt-serif aivt-h2">
                            {what.question}
                        </h2>
                    </div>
                    <div className="aivt-split-main">
                        <Prose text={what.answer} className="aivt-body" />
                        {extras.length > 0 && (
                            <>
                                <div id={moreId} className={`aivt-readmore${readMore ? " is-open" : ""}`}>
                                    {extras.map((section) => (
                                        <div key={section.id} className="aivt-readmore-part" id={`aivt-${section.id}`}>
                                            <h3 className="aivt-h3">{section.question}</h3>
                                            <Prose text={section.answer} className="aivt-body" />
                                            {section.points && section.points.length > 0 && (
                                                <ul className="aivt-points">
                                                    {section.points.map((point, i) => {
                                                        const { title, body } = splitPoint(point);
                                                        return (
                                                            <li key={i}>
                                                                {title && <strong>{title}. </strong>}
                                                                {body}
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <button type="button" className="aivt-link-btn" aria-expanded={readMore} aria-controls={moreId} onClick={() => setReadMore((v) => !v)}>
                                    <span>{readMore ? t("aiVideoTemplates.showLess") : t("aiVideoTemplates.readMore")}</span>
                                    <ChevronDown aria-hidden="true" className={readMore ? "is-flipped" : undefined} />
                                </button>
                            </>
                        )}
                    </div>
                </section>
            )}

            {/* 3. Original post + timeline */}
            {(hasPost || timeline.length > 0) && (
                <section className="aivt-split" aria-labelledby="aivt-origin-title">
                    <div className="aivt-split-aside">
                        <p className="aivt-eyebrow">{t("aiVideoTemplates.originEyebrow")}</p>
                        <h2 id="aivt-origin-title" className="aivt-serif aivt-h2">
                            {t("aiVideoTemplates.timelineTitle")}
                        </h2>
                    </div>
                    <div className="aivt-split-main">
                        {hasPost && post && (
                            <div className="aivt-glass aivt-post">
                                <div className="aivt-post-head">
                                    <span className="aivt-post-avatar" aria-hidden="true">
                                        {(post.creator || "?").replace(/^@/, "").slice(0, 1).toUpperCase()}
                                    </span>
                                    <span className="aivt-post-who">
                                        <span className="aivt-post-label">{t("aiVideoTemplates.originalPostTitle")}</span>
                                        <strong>{post.creator}</strong>
                                        <span className="aivt-post-meta">{[post.platform, post.date ? t("aiVideoTemplates.postedOn", { date: post.date }) : ""].filter(Boolean).join(" · ")}</span>
                                    </span>
                                    {post.url && (
                                        <a className="aivt-btn-quiet" href={post.url} target="_blank" rel="noopener noreferrer nofollow">
                                            <span>{t("aiVideoTemplates.watchOriginal")}</span>
                                            <ArrowUpRight aria-hidden="true" />
                                        </a>
                                    )}
                                </div>
                                {post.sound && (
                                    <p className="aivt-post-sound">
                                        <Music2 aria-hidden="true" />
                                        {post.soundUrl ? (
                                            <a href={post.soundUrl} target="_blank" rel="noopener noreferrer nofollow">
                                                {post.sound}
                                            </a>
                                        ) : (
                                            <span>{post.sound}</span>
                                        )}
                                    </p>
                                )}
                            </div>
                        )}
                        {timeline.length > 0 && (
                            <ol className="aivt-timeline">
                                {timeline.map((node, i) => (
                                    <li key={i}>
                                        <time className="aivt-timeline-date">{node.date}</time>
                                        <div>
                                            <h3 className="aivt-h4">{node.label}</h3>
                                            {node.detail && <p className="aivt-body is-small">{node.detail}</p>}
                                            {node.sourceUrl && (
                                                <a className="aivt-source-link" href={node.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">
                                                    {t("aiVideoTemplates.sourceLink")}
                                                    <ArrowUpRight aria-hidden="true" />
                                                </a>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </div>
                </section>
            )}

            {/* 4. Tips */}
            {tips && (tips.points?.length || tips.answer) && (
                <section className="aivt-block" aria-labelledby="aivt-tips-title">
                    <p className="aivt-eyebrow">{t("aiVideoTemplates.tipsEyebrow")}</p>
                    <h2 id="aivt-tips-title" className="aivt-serif aivt-h2">
                        {tips.question}
                    </h2>
                    {tips.answer && <Prose text={tips.answer} className="aivt-body aivt-how-lede" />}
                    {tips.points && tips.points.length > 0 && (
                        <ul className="aivt-tips">
                            {tips.points.map((point, i) => {
                                const { title, body } = splitPoint(point);
                                return (
                                    <li key={i}>
                                        {title && <h3 className="aivt-h4">{title}</h3>}
                                        <p className="aivt-body is-small">{body}</p>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>
            )}

            {/* 5. FAQ */}
            <FaqBlock faq={faq} id="aivt-template-faq" />

            {/* Sources: a small, tidy list aligned with the FAQ column */}
            {sources.length > 0 && (
                <section className="aivt-split aivt-sources" aria-labelledby="aivt-sources-title">
                    <div className="aivt-split-aside">
                        <h2 id="aivt-sources-title" className="aivt-eyebrow">
                            {t("aiVideoTemplates.sourcesTitle")}
                        </h2>
                    </div>
                    <ol className="aivt-sources-list">
                        {sources.map((source, i) => (
                            <li key={i}>
                                <a href={source.url} target="_blank" rel="noopener noreferrer nofollow">
                                    <span>{source.title}</span>
                                    <span className="aivt-sources-host">
                                        {(() => {
                                            try {
                                                return new URL(source.url).hostname.replace(/^www\./, "");
                                            } catch {
                                                return "";
                                            }
                                        })()}
                                    </span>
                                    <ArrowUpRight aria-hidden="true" />
                                </a>
                            </li>
                        ))}
                    </ol>
                </section>
            )}

            {/* 6. Related */}
            {relatedItems.length > 0 && (
                <section className="aivt-block" aria-labelledby="aivt-related-title">
                    <h2 id="aivt-related-title" className="aivt-serif aivt-h2">
                        {t("aiVideoTemplates.relatedTitle")}
                    </h2>
                    <div className="aivt-grid is-related">
                        {relatedItems.map((item) => (
                            <TemplateCard key={item.slug} template={item} />
                        ))}
                    </div>
                </section>
            )}

            {/* Closing: the page ends on the action, not on an empty band */}
            <section className="aivt-closing" aria-labelledby="aivt-closing-title">
                <h2 id="aivt-closing-title" className="aivt-serif aivt-h2">
                    {t("aiVideoTemplates.closingTitle", { name })}
                </h2>
                <p className="aivt-lede">{t("aiVideoTemplates.closingBody")}</p>
                <button type="button" className="aivt-primary aivt-closing-cta" onClick={onMake}>
                    {ctaLabel}
                </button>
                <button type="button" className="aivt-link-btn aivt-closing-top" onClick={onTop}>
                    {t("aiVideoTemplates.backToTop")}
                </button>
            </section>
        </div>
    );
});

function StepText({ n, title, body }: { n: number; title: string; body: string }) {
    return (
        <span className="aivt-step-text">
            <span className="aivt-step-num aivt-serif">{String(n).padStart(2, "0")}</span>
            <span>
                <strong>{title}</strong>
                <span>{body}</span>
            </span>
        </span>
    );
}
