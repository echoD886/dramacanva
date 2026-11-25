import worksJson from "../home/western-opening-works.local.json";
import translationsJson from "./works-translations.json";
import type { BlogLocale } from "@/content/blog-locales";
export { localizedWorkPath } from "../../lib/public-work-path";

export interface PublicWork {
    rank: number;
    templateUuid: string;
    title: string;
    description: string;
    proposedBrandDisplayName: string;
    proposedCategory: string;
    requestedFirstScreenFixed: boolean;
    coverPath: string;
    avatarPath: string;
    videoPath: string | null;
    originalAuthor: string | null;
    originalAuthorId: number | null;
    sourcePlatform: "LibTV";
    originalPublishAt: string | null;
}

export interface WorkTranslation {
    title: string;
    description: string;
    seoDescription: string;
}

const works = (worksJson as { works: PublicWork[] }).works;
const translations = translationsJson as Record<string, { slug: string } & Partial<Record<BlogLocale, WorkTranslation>>>;

export function getPublicWork(uuid: string) {
    return works.find((work) => work.templateUuid === uuid);
}

export function getWorkBySlug(slug: string) {
    const entry = Object.entries(translations).find(([, value]) => value.slug === slug);
    return entry ? getPublicWork(entry[0]) : undefined;
}

export function getWorkSlug(uuid: string) {
    return translations[uuid]?.slug;
}

export function getWorkTranslation(uuid: string, locale: BlogLocale): WorkTranslation | undefined {
    return translations[uuid]?.[locale] ?? translations[uuid]?.["zh-CN"];
}

export function workSeoTitle(title: string, locale: BlogLocale) {
    const suffix =
        locale === "en-US" ? " — Featured Film | DramaCanvas" : locale === "zh-CN" ? "｜精选作品 | DramaCanvas" : locale.startsWith("zh-") ? "｜精選作品 | DramaCanvas" : ` ${localizedWorkSuffix(locale)}`;
    const limit = locale.startsWith("zh-") || locale === "ja-JP" || locale === "ko-KR" ? 64 : 60;
    const width = (value: string) => [...value].reduce((sum, character) => sum + (/[\u2e80-\u9fff\uf900-\ufaff\uff01-\uff60]/u.test(character) ? 2 : 1), 0);
    if (width(title + suffix) <= limit) return title + suffix;
    // Prefer the full work title with the short brand suffix over cutting the title.
    const shortSuffix = " | DramaCanvas";
    if (width(title + shortSuffix) <= limit) return title + shortSuffix;
    const cjk = /[\u2e80-\u9fff\uac00-\ud7af]/u.test(title);
    let shortened = "";
    for (const character of title) {
        if (width(shortened + character + "…" + shortSuffix) > limit) break;
        shortened += character;
    }
    // Latin titles end at a word boundary, never mid-word.
    if (!cjk && /\s/.test(shortened)) shortened = shortened.replace(/\s+\S*$/, "");
    return `${shortened.replace(/[\s:：,，.-]+$/u, "")}…${shortSuffix}`;
}

function localizedWorkSuffix(locale: BlogLocale) {
    const suffix: Record<Exclude<BlogLocale, "zh-CN" | "zh-HK" | "zh-TW" | "en-US">, string> = {
        "ja-JP": "注目作品 | DramaCanvas",
        "ko-KR": "추천 작품 | DramaCanvas",
        "es-ES": "Película destacada | DramaCanvas",
        "pt-BR": "Filme em destaque | DramaCanvas",
    };
    return suffix[locale as keyof typeof suffix];
}
