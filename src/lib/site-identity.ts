import type { BlogLocale } from "../content/blog-locales";
import { HOME_POSITIONING } from "./home-positioning";

export const SITE_URL = "https://dramacanva.com";
export const SHARE_IMAGE = `${SITE_URL}/brand/say-action/og-default-en-v5.png`;
export const CHINESE_SHARE_IMAGE = `${SITE_URL}/brand/say-action/og-default-v4.png`;
export function defaultShareImage(locale: string) {
    return locale.startsWith("zh-") ? CHINESE_SHARE_IMAGE : SHARE_IMAGE;
}

export const SITE_NAME = "DramaCanvas";
export const SUPPORT_EMAIL = "support@dramacanva.com";
export const LEGACY_SUPPORT_EMAIL = "support@isayaction.com";
export const MARKETING_EMAIL = "hello@dramacanva.com";
// 旧域名永久 301，用于兼容判断；公开链接始终使用 SITE_URL。
export const LEGACY_SITE_ORIGINS = ["https://isayaction.com"] as const;
export const HOME_TITLE = HOME_POSITIONING["en-US"].title;
export const HOME_DESCRIPTION = HOME_POSITIONING["en-US"].description;

export function splitLocaleAndPath(pathname: string): { locale: BlogLocale; cleanPath: string } {
    const raw = pathname.replace(/\/+$/, "") || "/";
    const match = raw.match(/^\/(zh|hk|tw|en|ja|ko|es|pt)(?:\/(.*)|$)/);
    if (match) {
        const prefix = match[1];
        const rest = match[2] ? `/${match[2]}` : "/";
        const localeMap: Record<string, BlogLocale> = {
            zh: "zh-CN",
            hk: "zh-HK",
            tw: "zh-TW",
            en: "en-US",
            ja: "ja-JP",
            ko: "ko-KR",
            es: "es-ES",
            pt: "pt-BR",
        };
        return { locale: localeMap[prefix] || "en-US", cleanPath: rest.replace(/\/+$/, "") || "/" };
    }
    return { locale: "en-US", cleanPath: raw };
}
