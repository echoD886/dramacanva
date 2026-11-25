import { audiencePath } from "./audience-path";
/**
 * 注册来源埋点：从落地 URL 与 document.referrer 里提取注册渠道信息。
 *
 * 只上报白名单内的 utm_* 键，值限制为 URL 安全字符；referrer 只保留主机名。
 * 所有提取都包在 try/catch 里 —— 埋点失败绝不能把注册变成失败。
 */
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "invite", "ref"] as const;

const UTM_VALUE_PATTERN = /^[A-Za-z0-9\-_.+%]{1,128}$/;
const SIGNUP_ATTRIBUTION_SESSION_KEY = "infinite-canvas:signup-attribution";

export type SignupAttribution = { referrer: string; utm: string; entry?: string };
export type SignupSourceCategory = "direct" | "invite" | "referral" | "utm";
let landingSnapshot: SignupAttribution | null = null;

export function collectSignupAttribution(): SignupAttribution {
    return landingSnapshot ?? readSignupAttribution() ?? currentSignupAttribution();
}

// Capture the first safe landing attribution for this browser tab. A user can
// navigate from a campaign landing page to /register without losing its UTM
// data; it is never persisted past the tab session.
export function rememberSignupAttribution() {
    const remembered = landingSnapshot ?? readSignupAttribution();
    if (remembered) {
        landingSnapshot = remembered;
        return remembered;
    }
    // Store the landing as one snapshot, including direct/unknown landings.
    // Mixing later UTM parameters with the first referrer changes attribution.
    const next = currentSignupAttribution();
    landingSnapshot = next;
    try {
        window.sessionStorage.setItem(SIGNUP_ATTRIBUTION_SESSION_KEY, JSON.stringify(next));
    } catch {
        // Storage access must never affect registration or OAuth.
    }
    return next;
}

export function clearSignupAttribution() {
    landingSnapshot = null;
    try {
        window.sessionStorage.removeItem(SIGNUP_ATTRIBUTION_SESSION_KEY);
    } catch {
        // Storage access must never affect a completed registration.
    }
}

// This coarse label mirrors the server-side precedence while keeping GA4 free
// of campaign strings, referrer hosts, and invitation tokens.
export function signupSourceCategory(attribution: SignupAttribution, invited = false): SignupSourceCategory {
    try {
        if (new URLSearchParams(attribution.utm).get("utm_source")) return "utm";
    } catch {
        /* Keep attribution failures non-blocking. */
    }
    if (attribution.referrer) return "referral";
    if (invited || new URLSearchParams(attribution.utm).get("invite") || new URLSearchParams(attribution.utm).get("ref")) return "invite";
    return "direct";
}

function collectUtmParams(): string {
    try {
        const params = new URLSearchParams(window.location.search);
        const pairs: string[] = [];
        for (const key of UTM_KEYS) {
            const value = params.get(key)?.trim();
            if (value && UTM_VALUE_PATTERN.test(value)) {
                pairs.push(`${key}=${value}`);
            }
        }
        return pairs.join("&");
    } catch {
        return "";
    }
}

function currentSignupAttribution(): SignupAttribution {
    let entry: string | null = null;
    try {
        entry = audiencePath(window.location.pathname);
    } catch {
        /* Optional browser context. */
    }
    return { referrer: referrerHost(), utm: collectUtmParams(), ...(entry ? { entry } : {}) };
}

function readSignupAttribution(): SignupAttribution | null {
    try {
        const value = JSON.parse(window.sessionStorage.getItem(SIGNUP_ATTRIBUTION_SESSION_KEY) || "") as Partial<SignupAttribution>;
        if (!value || typeof value.referrer !== "string" || typeof value.utm !== "string") return null;
        return {
            ...(typeof value.entry === "string" && audiencePath(value.entry) ? { entry: audiencePath(value.entry)! } : {}),
            referrer: typeof value.referrer === "string" && /^[a-z0-9.-]{1,200}$/i.test(value.referrer) ? value.referrer : "",
            utm: typeof value.utm === "string" && value.utm.length <= 500 ? value.utm : "",
        };
    } catch {
        return null;
    }
}

function referrerHost(): string {
    try {
        const raw = document.referrer?.trim();
        if (!raw) return "";
        const parsed = new URL(raw);
        const host = parsed.hostname.toLowerCase();
        if (!host || host === window.location.hostname.toLowerCase()) return "";
        return host.slice(0, 200);
    } catch {
        return "";
    }
}
