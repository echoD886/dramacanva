import type { AIVideoTemplateCard } from "@/types/ai-video-template";

export function libraryTemplates(items: AIVideoTemplateCard[], trending: AIVideoTemplateCard[], excludeTrending: boolean) {
    if (!excludeTrending) return items;
    const featured = new Set(trending.map((item) => item.slug));
    return items.filter((item) => !featured.has(item.slug));
}
