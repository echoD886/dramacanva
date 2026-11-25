import type { AIVideoTemplateCard } from "@/types/ai-video-template";

const categoryId = (value: string) =>
    value
        .trim()
        .toLowerCase()
        .replace(/-trends$/, "");

/** Both inputs retain the backend's hot ranking; only the primary category has priority. */
export function selectRelatedTemplates(currentSlug: string, category: string | undefined, categoryItems: AIVideoTemplateCard[], hotItems: AIVideoTemplateCard[], limit = 8) {
    const seen = new Set([currentSlug]);
    const sameCategory = category ? categoryItems.filter((item) => item.categories.some((value) => categoryId(value) === categoryId(category))) : [];
    return [...sameCategory, ...hotItems]
        .filter((item) => {
            if (seen.has(item.slug)) return false;
            seen.add(item.slug);
            return true;
        })
        .slice(0, limit);
}
