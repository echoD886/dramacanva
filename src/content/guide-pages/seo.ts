import type { BlogLocale } from "../blog-locales";
import type { GuideContent } from "./types";
import guideSEOData from "./seo.generated.json";

export interface GuideSEO {
    seo: GuideContent["seo"];
    h1: string;
    faq: GuideContent["faq"];
}

export const GUIDE_UPDATED = "2026-10-16";

export const GUIDE_SEO: Record<string, Record<BlogLocale, GuideSEO>> = guideSEOData;
