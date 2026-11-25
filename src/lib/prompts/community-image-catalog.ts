import index from "./community-image-index.json";

export type CommunityImageCase = (typeof index.cases)[number];
export type CommunityImageTemplate = (typeof index.templates)[number];

export const communityImageCases = index.cases;
export const communityImageTemplates = index.templates;
export const communityImageCategories = [...new Set(index.cases.map((item) => item.category))];

function isChinese(locale: string) {
    return locale.startsWith("zh");
}

export function communityImageTemplateName(item: CommunityImageTemplate, locale: string) {
    return isChinese(locale) ? item.zh : item.en;
}

export function communityImageCategoryName(category: string, locale: string) {
    const template = index.templates.find((item) => item.categoryEn === category);
    return isChinese(locale) ? template?.categoryZh || category : category;
}

export function communityImageTemplatePrompt(item: CommunityImageTemplate, locale: string) {
    if (isChinese(locale)) return `图片制作方法：${item.zh}。${item.use}。${item.build}。验收：${item.check}。请保留我已有的主体、人物、品牌、画面文字和画幅要求；缺少的信息不要编造。`;
    return `Image workflow: ${item.en}. Intended use: ${item.categoryEn}. Visual directions: ${item.styles.join(", ")}. Keep the subject, characters, brand, exact text, and aspect ratio already specified. Define composition, lighting, materials, and hierarchy for this workflow; do not invent missing facts.`;
}

export function communityImageCasePrompt(item: CommunityImageCase, locale: string) {
    const template = templateForCommunityImageCase(item);
    const direction = isChinese(locale)
        ? `案例方向：${item.title}。类别：${communityImageCategoryName(item.category, locale)}；视觉标签：${item.styles.join("、") || "未指定"}。这个案例只提供创作方向，请根据我前面的内容重新设计画面，不要照搬别人的原图或投稿提示词。`
        : `Creative direction: ${item.title}. Category: ${item.category}. Visual tags: ${item.styles.join(", ") || "unspecified"}. Use this case as inspiration for a new composition based on my brief; do not copy the original image or contributor prompt.`;
    return `${direction}\n${template ? communityImageTemplatePrompt(template, locale) : ""}`.trim();
}

export function templateForCommunityImageCase(item: CommunityImageCase) {
    const choices = index.templates.filter((candidate) => candidate.categoryEn === item.category);
    return choices
        .map((candidate) => ({
            candidate,
            score: communityImageMatchScore(item.title, candidate) + candidate.styles.filter((style) => item.styles.includes(style)).length + candidate.scenes.filter((scene) => item.scenes.includes(scene)).length,
        }))
        .sort((a, b) => b.score - a.score)[0]?.candidate;
}

function searchTerms(query: string) {
    const normalized = query.trim().toLocaleLowerCase();
    const words = normalized.match(/[a-z0-9]+|[\p{Script=Han}]{1,}/gu) || [];
    return words.flatMap((word) => (/^[\p{Script=Han}]+$/u.test(word) && word.length > 2 ? [word, ...Array.from({ length: word.length - 1 }, (_, i) => word.slice(i, i + 2))] : [word]));
}

export function communityImageMatchScore(query: string, item: { title?: string; zh?: string; en?: string; category?: string; categoryEn?: string; categoryZh?: string; styles: string[]; scenes: string[] }) {
    const terms = searchTerms(query);
    if (!terms.length) return 0;
    const title = [item.title, item.zh, item.en].filter(Boolean).join(" ").toLocaleLowerCase();
    const category = [item.category, item.categoryEn, item.categoryZh].filter(Boolean).join(" ").toLocaleLowerCase();
    const tags = [...item.styles, ...item.scenes].join(" ").toLocaleLowerCase();
    return terms.reduce((score, term) => score + (title.includes(term) ? 4 : 0) + (category.includes(term) ? 2 : 0) + (tags.includes(term) ? 1 : 0), 0);
}

export function findCommunityImageCases(query: string, category = "", limit = 30) {
    const matches = communityImageCases.filter((item) => !category || item.category === category);
    const terms = searchTerms(query);
    if (!terms.length) return [...matches].sort((a, b) => Number(b.featured) - Number(a.featured) || b.id - a.id).slice(0, limit);
    return matches
        .map((item) => ({ item, score: communityImageMatchScore(query, item) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score || a.item.id - b.item.id)
        .slice(0, limit)
        .map(({ item }) => item);
}

export function recommendedCommunityImageTemplates(query: string, limit = 3) {
    if (!query.trim()) return [];
    return communityImageTemplates
        .map((item) => ({ item, score: communityImageMatchScore(query, item) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(({ item }) => item);
}
