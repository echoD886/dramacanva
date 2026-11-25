import type { BlogArticle, BlogArticleIndex } from "../content/blog";
import type { BlogColumn } from "../content/blog-locales";

/** Mixed-language prose contributes fractional minutes before rounding once. */
export function readingMinutes(text: string): number {
    const cjk = text.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu)?.length ?? 0;
    const words = text.replace(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu, " ").match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
    return Math.max(1, Math.ceil(cjk / 400 + words / 220));
}

export function articleReadingMinutes(article: BlogArticle | BlogArticleIndex) {
    if ("readingMinutes" in article) return article.readingMinutes;
    const text = [
        ...(article.intro ?? [article.summary]),
        ...(article.takeaways ?? []),
        ...article.sections.flatMap((s) => [
            s.title,
            ...s.paragraphs,
            ...(s.blocks ?? []).flatMap((block) => (block.type === "list" ? block.items : [])),
            ...(s.figures ?? []).map((f) => f.caption),
            ...(s.steps ?? []).flatMap((step) => [step.title, step.body, step.figure?.caption ?? ""]),
            ...(s.code ?? []).map((c) => c.content),
            s.callout?.text ?? "",
            ...(s.table ? [s.table.caption, ...s.table.headers, ...s.table.rows.flat(), s.table.sourceNote] : []),
        ]),
        ...article.faq.flatMap((f) => [f.question, f.answer]),
    ];
    return readingMinutes(text.join("\n"));
}

export function articleColumn(article: Pick<BlogArticle, "column" | "category">): BlogColumn {
    if (article.column) return article.column;
    // Resolve against the source category, before localization changes its wording.
    if (/对比|比较|工具|比較|compare|comparison/i.test(article.category)) return "compare";
    if (/模型|热点|熱點|model/i.test(article.category)) return "models";
    if (/动态|動態|news|update/i.test(article.category)) return "news";
    return "guide";
}

export function seriesArticles<T extends Pick<BlogArticle, "series">>(article: Pick<BlogArticle, "series">, articles: T[]) {
    return article.series ? articles.filter((item) => item.series?.id === article.series!.id).sort((a, b) => a.series!.index - b.series!.index) : [];
}

/** Last heading above the reading line, falling back to the first heading. */
export function activeHeading(headings: { id: string; top: number }[], readingLine = 100): string | undefined {
    return headings.filter((heading) => heading.top <= readingLine).at(-1)?.id ?? headings[0]?.id;
}
