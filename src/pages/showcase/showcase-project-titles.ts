import type { AppLocale } from "@/i18n/app-locale";
import { toTraditionalChinese } from "@/lib/i18n-traditional";
import index from "@/lib/showcase-project-titles.generated.json";

const originals: Readonly<Record<string, string>> = index.originals;
const approved: Readonly<Record<string, Partial<Record<AppLocale, string>>>> = index.approved;
const legacy: Readonly<Record<string, Partial<Record<AppLocale, string>>>> = index.legacy;

export function originalShowcaseProjectTitle(uuid: string) {
    return Object.hasOwn(originals, uuid) ? originals[uuid] : undefined;
}

// Same title rules as getLocalizedShowcase, without descriptions, media or SEO
// copy on the canvas list and editor's critical import path.
export function localizedShowcaseProjectTitle(uuid: string, fallback: string, locale: AppLocale) {
    const published = approved[uuid];
    if (published) return published[locale] ?? published["zh-CN"] ?? fallback;
    if (locale === "zh-CN") return fallback;
    if (locale === "zh-HK" || locale === "zh-TW") return toTraditionalChinese(fallback, locale);
    const copies = Object.hasOwn(legacy, uuid) ? legacy[uuid] : undefined;
    return copies?.[locale] ?? copies?.["en-US"] ?? fallback;
}
