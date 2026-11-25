import { BLOG_LOCALES, blogPath, type BlogSectionText, type BlogLocale } from "./blog-locales";
import { GENERATED_BLOG_INDEX } from "./generated/blog-index";
import { blogRedirectPaths } from "./blog-redirects";
export { BLOG_REDIRECTS } from "./blog-redirects";

export type PublicMedia = {
    assetId: string;
    kind: "image" | "video";
    src: string;
    title: string;
    caption: string;
    width: number;
    height: number;
    publicApproved: boolean;
    poster?: string;
    captions?: string;
    spokenAudio?: boolean;
    uploadDate?: string;
    duration?: string;
};
export type BlogArticle = {
    author?: string;
    seoTitle?: string;
    updated?: string;
    oldSlugs?: string[];
    intro?: string[];
    questions?: { id: string; title: string }[];
    takeaways?: string[];
    series?: { id: string; index: number; total: number };
    howTo?: boolean;
    column?: import("./blog-locales").BlogColumn;
    slug: string;
    title: string;
    summary: string;
    category: string;
    date: string;
    modifiedDate?: string;
    status: "draft" | "published";
    seoApproved: boolean;
    seoApprovedLocales?: BlogLocale[];
    /** 只在这些语言发布（英文优先的长尾页）；不填则沿用全部公开语言。 */
    publishedLocales?: BlogLocale[];
    /** Language of the authored source; other locales still require translations. */
    sourceLocale?: BlogLocale;
    sections: (BlogSectionText & { id: string })[];
    faq: { question: string; answer: string }[];
    /** Closing paragraphs written after the last FAQ answer; rendered below the FAQ. */
    closing?: string[];
    media: PublicMedia[];
    cta: string;
};

export type BlogArticleIndex = Omit<BlogArticle, "intro" | "questions" | "takeaways" | "sections" | "faq" | "closing" | "cta"> & {
    readingMinutes: number;
    cover: (import("./blog-locales").BlogFigure & Partial<PublicMedia>) | null;
};

export function articleLocales(article: Pick<BlogArticle, "slug">): BlogLocale[] {
    const redirects = blogRedirectPaths();
    return BLOG_LOCALES.filter((locale) => !redirects.has(blogPath(locale, article.slug)) && GENERATED_BLOG_INDEX[locale]?.some((item) => item.slug === article.slug && item.status === "published"));
}

export function publicArticles(locale: BlogLocale = "zh-CN", slug?: string): BlogArticleIndex[] {
    const redirects = blogRedirectPaths();
    return (GENERATED_BLOG_INDEX[locale] ?? []).filter((article) => article.status === "published" && (!slug || article.slug === slug) && !redirects.has(blogPath(locale, article.slug)));
}

export function findArticle(slug: string, locale: BlogLocale = "zh-CN") {
    return publicArticles(locale, slug)[0];
}

export function publicBlogPaths() {
    return BLOG_LOCALES.flatMap((locale) => [blogPath(locale), ...publicArticles(locale).map((article) => blogPath(locale, article.slug))]);
}

export { isPublicMedia } from "./blog-media";
