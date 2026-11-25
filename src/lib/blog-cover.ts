import type { BlogArticle, BlogArticleIndex } from "../content/blog";
import { isPublicMedia } from "../content/blog-media";
import type { BlogLocale } from "../content/blog-locales";

export function getArticleCover(article: BlogArticle | BlogArticleIndex, locale: BlogLocale) {
    if ("cover" in article) return article.cover;
    const images = article.media.filter((media) => media.kind === "image" && isPublicMedia(media));
    const cover = images.find((media) => media.assetId === `${article.slug}-cover`);
    if (cover) return { ...cover, alt: cover.title || article.title, webp: undefined };
    if (article.slug === "infinite-canvas-guide") {
        const language = locale.startsWith("zh") ? "zh" : "en";
        return { src: `/blog-media/canvas-guide/${language}/32b.jpg`, webp: `/blog-media/canvas-guide/${language}/32b.webp`, alt: article.title, width: 1600, height: 1000, caption: undefined };
    }
    const image = images[0];
    if (image) return { ...image, alt: image.title || article.title, webp: undefined };
    for (const section of article.sections) {
        const figures = section.blocks
            ? section.blocks.flatMap((block) => (block.type === "figure" ? [section.figures?.[block.index]] : block.type === "step" ? [section.steps?.[block.index]?.figure] : []))
            : [...(section.figures ?? []), ...(section.steps ?? []).map((step) => step.figure)];
        const figure = figures.find((item) => item && item.kind !== "video");
        if (figure) return figure;
    }
    return null;
}
