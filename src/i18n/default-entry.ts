// Public URLs with an explicit prefix keep that language. Only an unprefixed
// entry chooses a default; a manual choice is distinct from route auto-writes.
export const EXPLICIT_LOCALE_KEY = "sayaction.locale.choice";
const prefixes: Record<string, string> = { "en-US": "", "zh-CN": "/zh", "zh-HK": "/hk", "zh-TW": "/tw", "ja-JP": "/ja", "ko-KR": "/ko", "es-ES": "/es", "pt-BR": "/pt" };
export function defaultPublicEntry(href: string, explicitChoice: string | null): string | null {
    const url = new URL(href);
    if (/^\/en(?=\/|$)/.test(url.pathname)) {
        url.pathname = url.pathname.slice(3) || "/";
        return url.toString();
    }
    if (!/^\/(?:home\/?|about\/?|pricing\/?|help\/?|mcp\/?|legal\/(?:terms|privacy|refund|acceptable-use)\/?|blog(?:\/[^/]+)?\/?|detail\/[^/]+\/?)?$/.test(url.pathname)) return null;
    const prefix = prefixes[explicitChoice || "en-US"] ?? "";
    if (!prefix && /^\/home\/?$/.test(url.pathname)) {
        url.pathname = "/";
        return url.toString();
    }
    if (!prefix) return null;
    url.pathname = prefix + (url.pathname === "/" || url.pathname === "/home" ? "" : url.pathname);
    return url.toString();
}

export function rememberLocaleChoice(locale: string) {
    if (!(locale in prefixes)) return;
    try {
        localStorage.setItem(EXPLICIT_LOCALE_KEY, locale);
    } catch {
        /* Cookie can still work. */
    }
    try {
        document.cookie = `sayaction_locale=${locale}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    } catch {
        /* Current navigation still works. */
    }
}
export function explicitLocaleChoice(): string | null {
    try {
        const saved = localStorage.getItem(EXPLICIT_LOCALE_KEY);
        if (saved && saved in prefixes) return saved;
    } catch {
        /* Try cookie. */
    }
    try {
        const value = document.cookie
            .split("; ")
            .find((x) => x.startsWith("sayaction_locale="))
            ?.split("=")[1];
        return value && value in prefixes ? value : null;
    } catch {
        return null;
    }
}
