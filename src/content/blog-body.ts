import { findArticle, type BlogArticle } from "./blog";
import type { BlogLocale } from "./blog-locales";
import { blogArticleLoaders } from "./generated/blog-loaders";

const articles = new Map<string, BlogArticle>();
const pending = new Map<string, Promise<BlogArticle | undefined>>();

export function loadedArticle(slug: string, locale: BlogLocale) {
    return findArticle(slug, locale) ? articles.get(`${locale}/${slug}`) : undefined;
}

export function loadArticle(slug: string, locale: BlogLocale): Promise<BlogArticle | undefined> {
    const key = `${locale}/${slug}`;
    if (!findArticle(slug, locale)) return Promise.resolve(undefined);
    if (articles.has(key)) return Promise.resolve(articles.get(key));
    let request = pending.get(key);
    if (!request) {
        request = blogArticleLoaders[key]()
            .then(({ default: article }) => {
                articles.set(key, article);
                return article;
            })
            .finally(() => pending.delete(key));
        pending.set(key, request);
    }
    return request;
}

/** Route Suspense handles SPA visits; hydration prepares this module before mounting. */
export function readArticle(slug: string, locale: BlogLocale) {
    if (!findArticle(slug, locale)) return undefined;
    const article = loadedArticle(slug, locale);
    if (!article) throw loadArticle(slug, locale);
    return article;
}
