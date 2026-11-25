const AUTH_ROUTES = new Set(["login", "register", "forgot-password", "auth"]);
const UNSAFE_CHARACTERS = /[\\\u0000-\u0020\u007f-\u009f]/;

/** Validate decoded path semantics without decoding a legitimate query string. */
export function safeInternalAuthReturn(value: string | null): string {
    if (!value || !value.startsWith("/") || value.startsWith("//") || UNSAFE_CHARACTERS.test(value)) return "/home";
    try {
        const origin = "https://auth-return.invalid";
        const parsed = new URL(value, origin);
        if (parsed.origin !== origin) return "/home";
        let path = parsed.pathname;
        // Reject unresolved nested escaping rather than trusting a decoder limit.
        for (let depth = 0; depth < 8; depth++) {
            const decoded = decodeURIComponent(path);
            if (!decoded.startsWith("/") || decoded.startsWith("//") || UNSAFE_CHARACTERS.test(decoded)) return "/home";
            const normalized = new URL(decoded, origin);
            if (normalized.origin !== origin || AUTH_ROUTES.has(normalized.pathname.split("/")[1].toLowerCase())) return "/home";
            if (decoded === path) return value;
            path = decoded;
        }
    } catch {
        // Invalid URL/percent encodings are not safe return destinations.
    }
    return "/home";
}
