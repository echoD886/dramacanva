import { BLOG_LOCALES, blogPath, type BlogLocale } from "../content/blog-locales";

const prefixes = Object.fromEntries(BLOG_LOCALES.map((locale) => [locale, blogPath(locale).slice(0, -5)])) as Record<BlogLocale, string>;
const publicRoute =
    /^\/(?:ai-video-templates(?:\/category\/[a-z0-9-]+|\/[a-z0-9-]+)?\/?|home\/?|pricing\/?|help\/?|mcp\/?|skills\/[a-z0-9-]+\/?|seedance-2-[05]|sora-2|veo-3-1|kling-4|kling-3-0|minimax-h3|wan-3-0|grok-imagine|nano-banana|gpt-image-2|midjourney-v7|comfyui-workflow\/?|runninghub\/?|legal\/(?:terms|privacy|refund|acceptable-use)\/?|blog(?:\/[^/]+)?\/?|detail\/[^/]+\/?|works\/[a-z0-9]+(?:-[a-z0-9]+)*\/?)?$/;

function parsePublicPath(pathname: string) {
    const match = pathname.match(/^\/(zh|hk|tw|en|ja|ko|es|pt)(?=\/|$)/);
    const prefix = match?.[0] ?? "";
    const cleanPath = pathname.slice(prefix.length) || "/";
    if (!/^\/(?:changelog)\/?$/.test(cleanPath) && !publicRoute.test(cleanPath)) return null;
    return { cleanPath, locale: prefix === "/en" ? "en-US" : BLOG_LOCALES.find((locale) => prefixes[locale] === prefix)! };
}

/** Public URLs own their language; private workspace URLs keep the user's preference. */
export function publicPathLocale(pathname: string): BlogLocale | null {
    return parsePublicPath(pathname)?.locale ?? null;
}

export function localizedPublicPath(pathname: string, locale: BlogLocale): string {
    const parsed = parsePublicPath(pathname);
    if (!parsed) return pathname;
    const cleanPath = parsed.cleanPath === "/home" || parsed.cleanPath === "/home/" ? "/" : parsed.cleanPath;
    const prefix = prefixes[locale];
    return prefix + (cleanPath === "/" ? "" : cleanPath) || "/";
}
