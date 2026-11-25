import { useMemo, type ReactNode } from "react";
import { Link, useLocation, useParams } from "react-router";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { findArticle, isPublicMedia, publicArticles, type BlogArticle } from "@/content/blog";
import { readArticle } from "@/content/blog-body";
import { blogPath, parseBlogPath, isBlogLinkHref, type BlogLocale, type BlogSectionBlock } from "@/content/blog-locales";
import { useI18n } from "@/i18n/use-i18n";
import { trackPublicEvent } from "@/services/public-page-analytics";
import { BLOG_UI, BLOG_READING_UI, readingLabel, resolveBlogAuthor } from "@/content/blog-ui";
import { articleColumn, articleReadingMinutes } from "@/lib/blog-reading";
import { ArticleFigure, ArticleToc, PromptBlock, SeriesNav, TakeawayText, useArticleReading } from "./article-blocks";
import { AuthorAvatar } from "./blog-author";
import { visibleArticleAuthor } from "@/content/public-trust";
import { ArticleGallery, ArticleHeading } from "./article-gallery";
import { BackToTop, useScrollExperience } from "@/components/scroll/scroll-experience";
import { BLOG_LEAD_COVER_SIZES, BlogGrid, BrandedCover, coverWebpSrcSet, getArticleCover } from "./blog-cards";
import "./blog.css";

const EXTERNAL_LINK = /\[([^\[\]]+)\]\((https?:\/\/[^\s)]+)\)/;

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
    return (
        <a href={href} target="_blank" rel="noopener noreferrer nofollow">
            {children}
        </a>
    );
}

export function renderInlineLinks(text: string, locale: BlogLocale): ReactNode {
    return text.split(/(\[\[link:[a-z0-9]+(?:-[a-z0-9]+)*\|[^\]]+\]\]|\[[^\[\]]+\]\(https?:\/\/[^\s)]+\))/g).map((part, index) => {
        const link = part.match(/^\[\[link:([^|]+)\|([^\]]+)\]\]$/);
        const external = link ? null : part.match(new RegExp(`^${EXTERNAL_LINK.source}$`));
        if (external)
            return (
                <ExternalLink key={index} href={external[2]}>
                    {external[1]}
                </ExternalLink>
            );
        return link ? (
            findArticle(link[1], locale) ? (
                <Link key={index} to={blogPath(locale, link[1])}>
                    {link[2]}
                </Link>
            ) : (
                link[2]
            )
        ) : (
            part
        );
    });
}

export function renderInlineMarkdown(text: string, locale: BlogLocale = "zh-CN"): ReactNode {
    if (!text || (!text.includes("**") && !text.includes("`") && !text.includes("*") && !text.includes("[[link:") && !text.includes("](http"))) {
        return text;
    }
    const tokens: ReactNode[] = [];
    const regex = /(\[\[link:([a-z0-9]+(?:-[a-z0-9]+)*)\|([^\]]+)\]\]|\[([^\[\]]+)\]\((https?:\/\/[^\s)]+)\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let key = 0;
    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            tokens.push(text.slice(lastIndex, match.index));
        }
        const token = match[0];
        if (match[2]) {
            const label = match[3];
            tokens.push(
                findArticle(match[2], locale) ? (
                    <Link key={key++} to={blogPath(locale, match[2])}>
                        {label}
                    </Link>
                ) : (
                    label
                ),
            );
        } else if (match[5]) {
            tokens.push(
                <ExternalLink key={key++} href={match[5]}>
                    {match[4]}
                </ExternalLink>,
            );
        } else if (token.startsWith("`") && token.endsWith("`")) {
            tokens.push(
                <code key={key++} className="isa-blog-inline-code">
                    {token.slice(1, -1)}
                </code>,
            );
        } else if (token.startsWith("**") && token.endsWith("**")) {
            tokens.push(
                <strong key={key++} className="isa-blog-inline-strong">
                    {renderInlineLinks(token.slice(2, -2), locale)}
                </strong>,
            );
        } else if (token.startsWith("*") && token.endsWith("*")) {
            tokens.push(<em key={key++}>{renderInlineLinks(token.slice(1, -1), locale)}</em>);
        }
        lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
        tokens.push(text.slice(lastIndex));
    }
    return tokens;
}

function parseMarkdownTable(text: string): { headers: string[]; rows: string[][] } | null {
    const trimmed = text.trim();
    if (!trimmed.startsWith("|")) return null;
    const rawRows = trimmed.includes("\n")
        ? trimmed
              .split(/\r?\n/)
              .map((l) => l.trim())
              .filter(Boolean)
        : trimmed
              .split(/\s*\|\s*\|\s*/)
              .map((l) => l.trim())
              .filter(Boolean);
    if (rawRows.length < 2) return null;

    const parsedRows = rawRows.map((r) => {
        let clean = r;
        if (clean.startsWith("|")) clean = clean.slice(1);
        if (clean.endsWith("|")) clean = clean.slice(0, -1);
        return clean.split("|").map((c) => c.trim());
    });

    if (parsedRows.length >= 2 && parsedRows[1].every((cell) => /^[-:\s]+$/.test(cell))) {
        return {
            headers: parsedRows[0],
            rows: parsedRows.slice(2),
        };
    }
    return null;
}

function renderParagraphOrTable(paragraph: string, key: string | number, sectionTitle: string, locale: BlogLocale) {
    const table = parseMarkdownTable(paragraph);
    if (!table) {
        return <p key={key}>{renderInlineMarkdown(paragraph, locale)}</p>;
    }
    return (
        <div key={key} className="isa-blog-table-frame">
            <div className="isa-blog-table-scroll" role="region" aria-label={sectionTitle} tabIndex={0}>
                <table className="isa-blog-table">
                    <thead>
                        <tr>
                            {table.headers.map((header, index) => {
                                const isPitfall = /不足|坑|缺点|短板|局限|缺陷|pitfall|drawback|con/i.test(header);
                                return (
                                    <th key={index} scope="col" className={isPitfall ? "is-pitfall" : undefined}>
                                        {renderInlineMarkdown(header, locale)}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {table.rows.map((row, rowIndex) => {
                            const isPitfallRow = /不足|坑|缺点|短板|局限|缺陷|不合格|pitfall|drawback|con/i.test(String(row[0] ?? ""));
                            return (
                                <tr key={rowIndex} className={isPitfallRow ? "is-pitfall-row" : undefined}>
                                    {row.map((cell, colIndex) => {
                                        const isPitfallCol = /不足|坑|缺点|短板|局限|缺陷|pitfall|drawback|con/i.test(table.headers[colIndex] ?? "");
                                        const isPitfall = isPitfallRow || isPitfallCol;
                                        return colIndex === 0 ? (
                                            <th key={colIndex} scope="row" className={isPitfall ? "is-pitfall" : undefined}>
                                                {renderInlineMarkdown(cell, locale)}
                                            </th>
                                        ) : (
                                            <td key={colIndex} className={isPitfall ? "is-pitfall" : undefined}>
                                                {renderInlineMarkdown(cell, locale)}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function ArticleBulletList({ items, locale }: { items: string[]; locale: BlogLocale }) {
    return (
        <ul className="isa-blog-list" data-blog-block="list">
            {items.map((item, index) => (
                <li key={index}>{renderInlineMarkdown(item, locale)}</li>
            ))}
        </ul>
    );
}

export function ArticleProseText({ text, locale }: { text: string; locale: BlogLocale }) {
    // FAQ wrap-ups can include source lists; preserve their authored line boundaries.
    return text
        .split(/(^- .+(?:\n- .+)*)/m)
        .filter((part) => part.trim())
        .map((part, index) => (part.startsWith("- ") ? <ArticleBulletList key={index} items={part.split("\n").map((line) => line.slice(2))} locale={locale} /> : <p key={index}>{renderInlineMarkdown(part.trim(), locale)}</p>));
}

export function ArticleSectionBlocks({ section, locale }: { section: BlogArticle["sections"][number]; locale: BlogLocale }) {
    const blocks: BlogSectionBlock[] = section.blocks ?? [
        ...section.paragraphs.map((_, index) => ({ type: "paragraph" as const, index })),
        ...(section.figures ?? []).map((_, index) => ({ type: "figure" as const, index })),
        ...(section.steps ?? []).map((_, index) => ({ type: "step" as const, index })),
        ...(section.code ?? []).map((_, index) => ({ type: "code" as const, index })),
        ...(section.callout ? [{ type: "callout" as const }] : []),
    ];
    return blocks.map((block, position) => {
        if (block.type === "paragraph" || block.type === "table") return renderParagraphOrTable(section.paragraphs[block.index], position, section.title, locale);
        if (block.type === "figure") return <ArticleFigure key={position} figure={section.figures![block.index]} locale={locale} />;
        if (block.type === "code") return <PromptBlock key={position} {...section.code![block.index]} locale={locale} />;
        if (block.type === "list") return <ArticleBulletList key={position} items={block.items} locale={locale} />;
        if (block.type === "callout")
            return (
                <aside key={position} className={`isa-blog-callout is-${section.callout!.tone}`}>
                    <strong>{BLOG_UI[locale][section.callout!.tone]}</strong>
                    <p>{renderInlineMarkdown(section.callout!.text, locale)}</p>
                </aside>
            );
        // Keep adjacent steps in the existing list; resume its counter after intervening blocks.
        if (blocks[position - 1]?.type === "step") return null;
        const steps: number[] = [];
        for (let i = position; i < blocks.length; i++) {
            const next = blocks[i];
            if (next.type !== "step") break;
            steps.push(next.index);
        }
        return (
            <ol key={position} className="isa-blog-steps" start={block.index ? block.index + 1 : undefined} style={block.index ? { counterReset: `blog-step ${block.index}` } : undefined}>
                {steps.map((index) => {
                    const step = section.steps![index];
                    return (
                        <li id={`${section.id}-step-${index + 1}`} key={index}>
                            <h3>{renderInlineMarkdown(step.title, locale)}</h3>
                            {step.body ? <p>{renderInlineMarkdown(step.body, locale)}</p> : null}
                            {step.figure ? <ArticleFigure figure={step.figure} locale={locale} /> : null}
                        </li>
                    );
                })}
            </ol>
        );
    });
}

export function ArticleContent({ article, locale = "zh-CN" }: { article: BlogArticle; locale?: BlogLocale }) {
    const { t, date } = useI18n();
    const author = resolveBlogAuthor(article.author, locale);
    const authorProfile = visibleArticleAuthor(article.slug, article.author);
    const authorDisplayName = article.author === "DramaCanvas 团队" ? article.author : author.name;
    const ui = BLOG_UI[locale];
    const column = articleColumn(article);
    const cover = getArticleCover(article, locale);

    const reading = useArticleReading(article);
    const showTop = useScrollExperience(reading.container, `${locale}:${article.slug}`);
    const available = useMemo(() => publicArticles(locale), [locale]);
    const related = useMemo(
        () =>
            available.some((item) => item.slug === article.slug)
                ? available
                      .filter((item) => item.slug !== article.slug)
                      .sort(
                          (a, b) =>
                              Number(Boolean(b.series && b.series.id === article.series?.id)) - Number(Boolean(a.series && a.series.id === article.series?.id)) ||
                              Number(articleColumn(b) === column) - Number(articleColumn(a) === column) ||
                              b.date.localeCompare(a.date),
                      )
                      .slice(0, 3)
                : [],
        [available, article.slug, article.series?.id, column],
    );
    const tocProps = { article, label: BLOG_READING_UI[locale].toc, faqLabel: t("blog.faq"), takeawayLabel: ui.takeaways, active: reading.active, onNavigate: reading.jump };

    return (
        <main ref={reading.container} className="yingce-blog-page isa-blog-article">
            <div className="isa-blog-reading-progress" role="progressbar" aria-label={BLOG_READING_UI[locale].progress} aria-valuemin={0} aria-valuemax={100} aria-valuenow={reading.progress}>
                <span style={{ transform: `scaleX(${reading.progress / 100})` }} />
            </div>
            <div className="isa-blog-reading-layout">
                <ArticleToc {...tocProps} />
                <ArticleGallery locale={locale} key={`${locale}:${article.slug}`}>
                    <article className="isa-blog-prose">
                        <nav aria-label={t("blog.breadcrumb")} className="isa-blog-breadcrumb">
                            <Link to="/">{t("common.home")}</Link>
                            <span className="isa-blog-breadcrumb-sep">/</span>
                            <Link to={blogPath(locale)}>{t("blog.guide")}</Link>
                            <span className="isa-blog-breadcrumb-sep">/</span>
                            <span className="isa-blog-breadcrumb-current isa-blog-category-badge">{ui[column]}</span>
                        </nav>
                        <header>
                            <h1>{article.title}</h1>
                            <div className="isa-blog-byline">
                                <span className="isa-blog-author">
                                    <AuthorAvatar author={author} />
                                    <a href={authorProfile.url} rel="author">
                                        {authorDisplayName}
                                    </a>
                                </span>
                                <span aria-hidden="true">·</span>
                                <time dateTime={article.modifiedDate || article.date}>{date(article.modifiedDate || article.date, { year: "numeric", month: "short", day: "numeric" })}</time>
                                <span aria-hidden="true">·</span>
                                <span>{readingLabel(locale, articleReadingMinutes(article))}</span>
                            </div>
                        </header>
                        {cover ? (
                            <figure className="isa-blog-article-cover" data-blog-block="cover" data-scroll-scene>
                                <picture>
                                    {coverWebpSrcSet(cover.src) ? <source srcSet={coverWebpSrcSet(cover.src)} sizes={BLOG_LEAD_COVER_SIZES} type="image/webp" /> : cover.webp ? <source srcSet={cover.webp} type="image/webp" /> : null}
                                    <img src={cover.src} alt={cover.alt || article.title} width={cover.width || 1600} height={cover.height || 1000} className="isa-blog-cover-img" loading="eager" fetchPriority="high" data-scroll-parallax />
                                </picture>
                                {cover.caption ? <figcaption>{cover.caption}</figcaption> : null}
                            </figure>
                        ) : (
                            <div className="isa-blog-article-cover isa-blog-article-cover-branded-wrap" data-blog-block="cover">
                                <BrandedCover column={column} label={ui[column]} />
                            </div>
                        )}
                        <ArticleToc {...tocProps} mobile />
                        {article.media
                            .filter(isPublicMedia)
                            .filter((m) => m.kind === "video")
                            .slice(0, 1)
                            .map((media) => (
                                <figure key={media.assetId}>
                                    <video
                                        controls
                                        playsInline
                                        preload="none"
                                        poster={media.poster}
                                        width={media.width}
                                        height={media.height}
                                        onPlay={(event) => {
                                            event.currentTarget
                                                .closest("article")
                                                ?.querySelectorAll("video")
                                                .forEach((video) => {
                                                    if (video !== event.currentTarget) video.pause();
                                                });
                                            trackPublicEvent("video_play", { article_id: article.slug, media_id: media.assetId });
                                        }}
                                        onError={() => trackPublicEvent("video_error", { article_id: article.slug, media_id: media.assetId })}
                                    >
                                        <source src={media.src} type="video/mp4" />
                                        {media.captions ? <track kind="captions" src={media.captions} srcLang="zh" label={t("blog.chineseCaptions")} default /> : null}
                                        <a href={media.src}>{t("blog.openVideo")}</a>
                                    </video>
                                    <figcaption>{media.caption}</figcaption>
                                </figure>
                            ))}
                        {(article.intro ?? [article.summary]).map((paragraph, index) => (
                            <p key={index} className="isa-blog-intro">
                                {renderInlineMarkdown(paragraph, locale)}
                            </p>
                        ))}
                        <aside id="article-takeaways" className="isa-blog-takeaways" data-blog-block="takeaways" data-blog-heading>
                            <ArticleHeading id="article-takeaways" locale={locale}>
                                {ui.takeaways}
                            </ArticleHeading>
                            <ul>
                                {(article.takeaways?.length ? article.takeaways : [article.summary]).map((item, index) => (
                                    <li key={index}>
                                        <TakeawayText text={item} renderInline={(text) => renderInlineLinks(text, locale)} />
                                    </li>
                                ))}
                            </ul>
                        </aside>
                        {article.media
                            .filter(isPublicMedia)
                            .filter((m) => m.kind !== "video" && (!cover || m.src !== cover.src))
                            .map((media) => (
                                <ArticleFigure key={media.assetId} figure={{ ...media, alt: media.title }} locale={locale} articleSlug={article.slug} />
                            ))}
                        {article.sections.map((section) => (
                            <section id={section.id} key={section.id} data-blog-heading>
                                <ArticleHeading id={section.id} locale={locale}>
                                    {section.title}
                                </ArticleHeading>
                                <ArticleSectionBlocks section={section} locale={locale} />
                                {section.table ? (
                                    <>
                                        <div className="isa-blog-table-frame">
                                            <div className="isa-blog-table-scroll" role="region" aria-label={section.table.caption} tabIndex={0}>
                                                <table className="isa-blog-table">
                                                    <caption>{section.table.caption}</caption>
                                                    <thead>
                                                        <tr>
                                                            {section.table.headers.map((header, index) => {
                                                                const isPitfall = /不足|坑|缺点|短板|局限|pitfall|drawback|con/i.test(header);
                                                                return (
                                                                    <th key={index} scope="col" className={[index === section.table!.highlightColumn ? "is-highlighted" : "", isPitfall ? "is-pitfall" : ""].filter(Boolean).join(" ") || undefined}>
                                                                        {index === section.table!.highlightColumn && section.table!.highlightLabel ? <span className="isa-blog-table-pick">{section.table!.highlightLabel}</span> : null}
                                                                        {header}
                                                                    </th>
                                                                );
                                                            })}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {section.table.rows.map((row, index) => {
                                                            const isPitfallRow = /不足|坑|缺点|短板|局限|pitfall|drawback|con/i.test(String(row[0] ?? ""));
                                                            return (
                                                                <tr key={index} className={isPitfallRow ? "is-pitfall-row" : undefined}>
                                                                    {row.map((cell, column) => {
                                                                        const isPitfallCol = /不足|坑|缺点|短板|局限|pitfall|drawback|con/i.test(section.table!.headers[column] ?? "");
                                                                        const isPitfall = isPitfallRow || isPitfallCol;
                                                                        return column === 0 ? (
                                                                            <th key={column} scope="row" className={isPitfall ? "is-pitfall" : undefined}>
                                                                                {cell}
                                                                            </th>
                                                                        ) : (
                                                                            <td key={column} className={[column === section.table!.highlightColumn ? "is-highlighted" : "", isPitfall ? "is-pitfall" : ""].filter(Boolean).join(" ") || undefined}>
                                                                                {cell}
                                                                            </td>
                                                                        );
                                                                    })}
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                        <p className="isa-blog-source-note">{section.table.sourceNote}</p>
                                    </>
                                ) : null}
                                {section.links?.some((link) => isBlogLinkHref(link.href) && !link.href.startsWith("https:")) ? (
                                    <aside className="isa-blog-related" aria-label={t("blog.furtherReading")}>
                                        <h3>{t("blog.furtherReading")}</h3>
                                        <ul>
                                            {section.links
                                                .filter((link) => isBlogLinkHref(link.href) && !link.href.startsWith("https:"))
                                                .map((link) => (
                                                    <li key={link.href}>
                                                        <Link to={link.href}>
                                                            <span>{link.label}</span>
                                                            <ArrowRight aria-hidden="true" />
                                                        </Link>
                                                    </li>
                                                ))}
                                        </ul>
                                    </aside>
                                ) : null}
                                {section.links?.some((link) => isBlogLinkHref(link.href) && link.href.startsWith("https:")) ? (
                                    <aside className="isa-blog-sources" aria-label={t("blog.sources")}>
                                        <h3>{t("blog.sources")}</h3>
                                        <ul>
                                            {section.links
                                                .filter((link) => isBlogLinkHref(link.href) && link.href.startsWith("https:"))
                                                .map((link) => (
                                                    <li key={link.href}>
                                                        <a href={link.href} rel="nofollow noopener noreferrer" target="_blank">
                                                            <span>{link.label}</span>
                                                            <ArrowUpRight aria-hidden="true" />
                                                        </a>
                                                    </li>
                                                ))}
                                        </ul>
                                    </aside>
                                ) : null}
                            </section>
                        ))}
                        <section className="isa-faq" id="article-faq" data-blog-heading>
                            <ArticleHeading id="article-faq" locale={locale}>
                                {t("blog.faq")}
                            </ArticleHeading>
                            {article.faq.map((faq, index) => (
                                <details
                                    key={faq.question}
                                    onToggle={(event) => {
                                        if (event.currentTarget.open) trackPublicEvent("faq_open", { article_id: article.slug, faq_id: `faq-${index + 1}` });
                                    }}
                                >
                                    <summary>{faq.question}</summary>
                                    <ArticleProseText text={faq.answer} locale={locale} />
                                </details>
                            ))}
                        </section>
                        {article.closing?.length ? (
                            <section className="isa-blog-closing">
                                {article.closing.map((text) => (
                                    <ArticleProseText key={text} text={text} locale={locale} />
                                ))}
                            </section>
                        ) : null}
                        <SeriesNav article={article} articles={available} locale={locale} />
                        <footer className="isa-blog-action-card">
                            <div className="isa-blog-action-inner">
                                <div className="isa-blog-action-text">
                                    <h3>{ui.ctaTitle}</h3>
                                    <p>{ui.ctaSubtitle}</p>
                                </div>
                                <div className="isa-blog-action-buttons">
                                    <Link className="isa-blog-cta" to={article.cta} onClick={() => trackPublicEvent("task_cta_click", { article_id: article.slug })}>
                                        {ui.ctaAction}
                                        <ArrowRight className="isa-blog-cta-arrow" aria-hidden="true" />
                                    </Link>
                                </div>
                            </div>
                            <div className="isa-blog-action-sublinks">
                                <p>
                                    <Link to={blogPath(locale)}>{t("blog.other")}</Link>
                                    {article.cta === "/mcp" ? (
                                        <>
                                            {" "}
                                            · <Link to="/mcp">{t("mcp.title")}</Link>
                                        </>
                                    ) : null}
                                </p>
                            </div>
                        </footer>
                    </article>
                </ArticleGallery>
                <aside className="isa-blog-canvas-card" aria-labelledby="blog-canvas-title">
                    <h2 id="blog-canvas-title">{BLOG_READING_UI[locale].tryCanvas}</h2>
                    <p>{ui.ctaSubtitle}</p>
                    <Link className="isa-blog-cta" to="/canvas" onClick={() => trackPublicEvent("task_cta_click", { article_id: article.slug })}>
                        {ui.ctaAction}
                        <ArrowRight aria-hidden="true" />
                    </Link>
                </aside>
            </div>
            <BackToTop page={reading.container} visible={showTop} />
            {related.length ? (
                <section className="isa-blog-recommendations" aria-labelledby="blog-related-title">
                    <h2 id="blog-related-title">{BLOG_READING_UI[locale].related}</h2>
                    <BlogGrid articles={related} locale={locale} related />
                </section>
            ) : null}
        </main>
    );
}

export default function BlogArticlePage() {
    const { t } = useI18n();
    const location = useLocation();
    const locale = parseBlogPath(location.pathname)?.locale ?? "zh-CN";
    const { slug = "" } = useParams();
    const article = readArticle(slug, locale);
    return article ? (
        <ArticleContent key={`${locale}:${article.slug}`} article={article} locale={locale} />
    ) : (
        <main className="yingce-blog-page">
            <h1>{t("blog.missing")}</h1>
            <Link to={blogPath(locale)}>{t("blog.back")}</Link>
        </main>
    );
}
