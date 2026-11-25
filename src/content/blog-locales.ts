import type { MessageLocale } from "../i18n/messages";

export const BLOG_LOCALES = ["zh-CN", "zh-HK", "zh-TW", "en-US", "ja-JP", "ko-KR", "es-ES", "pt-BR"] as const satisfies readonly MessageLocale[];
export type BlogLocale = (typeof BLOG_LOCALES)[number];
const prefixes: Record<BlogLocale, string> = { "zh-CN": "/zh", "zh-HK": "/hk", "zh-TW": "/tw", "en-US": "", "ja-JP": "/ja", "ko-KR": "/ko", "es-ES": "/es", "pt-BR": "/pt" };

export function blogPath(locale: BlogLocale, slug?: string) {
    return `${prefixes[locale]}/blog${slug ? `/${slug}` : ""}`;
}

export function blogFeedPath(locale: BlogLocale, format: "rss" | "atom" = "rss") {
    return `${blogPath(locale)}/${format === "rss" ? "feed" : "atom"}.xml`;
}

export function parseBlogPath(pathname: string): { locale: BlogLocale; slug?: string } | undefined {
    const match = pathname.match(/^\/(?:(zh|hk|tw|en|ja|ko|es|pt)\/)?blog(?:\/([a-z0-9]+(?:-[a-z0-9]+)*))?\/?$/);
    if (!match) return;
    const locale = match[1] === "en" ? "en-US" : BLOG_LOCALES.find((locale) => prefixes[locale] === (match[1] ? `/${match[1]}` : ""))!;
    return { locale, ...(match[2] ? { slug: match[2] } : {}) };
}

export type BlogTable = { caption: string; headers: string[]; rows: string[][]; sourceNote: string; highlightColumn?: number; highlightLabel?: string };
export type BlogLink = { label: string; href: string };
export type BlogColumn = "guide" | "compare" | "models" | "news";
export type BlogFigure = { src: string; webp?: string; alt: string; caption: string; width: number; height: number; kind?: "image" | "video"; poster?: string; mobile?: { src: string; webp: string; width: number; height: number } };
/** References into section fields in authored Markdown order. Older catalogs omit this. */
export type BlogSectionBlock = { type: "paragraph" | "table" | "figure" | "step" | "code"; index: number } | { type: "callout" } | { type: "list"; items: string[] };
export type BlogSectionText = {
    title: string;
    paragraphs: string[];
    blocks?: BlogSectionBlock[];
    table?: BlogTable;
    links?: BlogLink[];
    figures?: BlogFigure[];
    steps?: { title: string; body: string; figure?: BlogFigure }[];
    code?: { label: string; content: string; language?: string }[];
    callout?: { tone: "tip" | "warning"; text: string };
};

/** Public content links are local paths or secure external URLs. */
export function isBlogLinkHref(href: string) {
    if (/^\/(?!\/)[^\\\s]*$/.test(href)) return true;
    try {
        const url = new URL(href);
        return url.protocol === "https:" && !url.username && !url.password;
    } catch {
        return false;
    }
}

export function blogSectionsMatch(source: BlogSectionText[], translated: BlogSectionText[]) {
    const destination = (href: string) => href.replace(/^\/(?:zh|hk|tw|en|ja|ko|es|pt)(?=\/)/, "");
    return (
        source.length === translated.length &&
        source.every((section, index) => {
            const text = translated[index];
            const a = section.table,
                b = text.table;
            return (
                section.paragraphs.length === text.paragraphs.length &&
                (section.figures?.length ?? 0) === (text.figures?.length ?? 0) &&
                (section.steps?.length ?? 0) === (text.steps?.length ?? 0) &&
                (section.code?.length ?? 0) === (text.code?.length ?? 0) &&
                (section.steps ?? []).every((step, i) => Boolean(step.figure) === Boolean(text.steps?.[i].figure)) &&
                Boolean(section.callout) === Boolean(text.callout) &&
                section.callout?.tone === text.callout?.tone &&
                Boolean(a) === Boolean(b) &&
                (!a ||
                    !b ||
                    (a.highlightColumn === b.highlightColumn &&
                        Boolean(a.highlightLabel) === Boolean(b.highlightLabel) &&
                        (b.highlightColumn === undefined ? b.highlightLabel === undefined : Number.isInteger(b.highlightColumn) && b.highlightColumn > 0 && b.highlightColumn < b.headers.length && Boolean(b.highlightLabel?.trim())) &&
                        b.caption.trim().length > 0 &&
                        b.sourceNote.trim().length > 0 &&
                        b.headers.every((header, i) => i === 0 || header.trim().length > 0) &&
                        a.headers.length === b.headers.length &&
                        a.rows.length === b.rows.length &&
                        a.rows.every((row, i) => row.length === a.headers.length && b.rows[i].length === b.headers.length))) &&
                (section.links?.length ?? 0) === (text.links?.length ?? 0) &&
                (section.links ?? []).every((link, i) => text.links![i].label.trim().length > 0 && isBlogLinkHref(link.href) && isBlogLinkHref(text.links![i].href) && destination(link.href) === destination(text.links![i].href))
            );
        })
    );
}

export type BlogTranslation = {
    takeaways?: string[];
    series?: { id: string; index: number; total: number };
    howTo?: boolean;
    column?: BlogColumn;
    title: string;
    summary: string;
    category: string;
    sections: BlogSectionText[];
    faq: { question: string; answer: string }[];
};
