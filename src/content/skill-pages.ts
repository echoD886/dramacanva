import { skillPageIndex } from "./skill-pages/index.generated";
import { BLOG_LOCALES, type BlogLocale } from "./blog-locales";
import { localizedPublicPath } from "../i18n/locale-routing";
import { splitLocaleAndPath, SITE_NAME } from "../lib/site-identity";

export type SkillPageContent = {
    title: string;
    metaDescription: string;
    oneLiner: string;
    intro?: string[];
    example?: { input: string; output: string };
    scenarios: string[];
    problems: { pain: string; solve: string }[];
    steps: string[];
    faq: { q: string; a: string }[];
    keywords: string[];
};
export type SkillPage = { id: string; slug: string; tag: string; locale: string; content: SkillPageContent };
export type SkillPageIndex = Omit<SkillPage, "content"> & { content: Pick<SkillPageContent, "title" | "metaDescription" | "oneLiner" | "keywords"> };
export function publicSkills(locale: BlogLocale): SkillPageIndex[] {
    return skillPageIndex.filter((page) => page.locale === locale);
}
export function skillPath(locale: BlogLocale, slug = "library") {
    return localizedPublicPath(`/skills/${slug}`, locale);
}
export function skillPageForPath(path: string) {
    const { locale, cleanPath } = splitLocaleAndPath(path);
    const match = cleanPath.match(/^\/skills\/([a-z0-9-]+)$/);
    if (!match) return undefined;
    const pages = publicSkills(locale);
    if (match[1] === "library") return pages.length ? { locale, pages, page: undefined } : undefined;
    const page = pages.find((page) => page.slug === match[1]);
    return page ? { locale, pages, page } : undefined;
}
export function skillPublicPaths() {
    return BLOG_LOCALES.flatMap((locale) => {
        const pages = publicSkills(locale);
        return pages.length ? [skillPath(locale), ...pages.map((page) => skillPath(locale, page.slug))] : [];
    });
}
export function skillContent<T extends SkillPageIndex>(page: T, brand = SITE_NAME): T["content"] {
    return JSON.parse(JSON.stringify(page.content).replaceAll("{brand}", JSON.stringify(brand).slice(1, -1)));
}
export function skillUseTarget(page: SkillPageIndex) {
    return `/skills?open=${encodeURIComponent(page.slug)}`;
}
