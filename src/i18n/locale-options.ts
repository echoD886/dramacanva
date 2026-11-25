import { BLOG_LOCALES, type BlogLocale } from "../content/blog-locales";
import { localizedPublicPath } from "./locale-routing";

const nativeLabels: Record<BlogLocale, string> = {
    "zh-CN": "简体中文",
    "zh-HK": "繁體中文（香港）",
    "zh-TW": "繁體中文（台灣）",
    "en-US": "English",
    "ja-JP": "日本語",
    "ko-KR": "한국어",
    "es-ES": "Español",
    "pt-BR": "Português (Brasil)",
};

export const PUBLIC_LOCALE_OPTIONS = BLOG_LOCALES.map((value) => ({
    value,
    label: nativeLabels[value],
    href: localizedPublicPath("/", value),
}));
