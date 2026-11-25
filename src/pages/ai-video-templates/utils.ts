import type { PaymentProduct } from "@/services/api/wallet";
import type { AIVideoTemplateQuote, AIVideoTemplateSlot, HeatStage } from "@/types/ai-video-template";
import type { MessageKey } from "@/i18n/messages";

/**
 * Format raw counts like plays and likes into clean human-readable strings (e.g. 184.4M, 964K, 340).
 */
export function formatCount(count: number | undefined | null): string {
    if (typeof count !== "number" || isNaN(count) || count <= 0) return "0";
    if (count >= 1_000_000) return (count / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (count >= 1_000) return (count / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(count);
}

/** m:ss for a clip length; empty when unknown. */
export function formatClipLength(durationMs: number | undefined | null): string {
    if (typeof durationMs !== "number" || !(durationMs > 0)) return "";
    const total = Math.round(durationMs / 1000);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function heatStageKey(stage: HeatStage | string | undefined): MessageKey | undefined {
    if (stage === "rising") return "aiVideoTemplates.heatRising";
    if (stage === "peak") return "aiVideoTemplates.heatPeak";
    if (stage === "past" || stage === "cooling") return "aiVideoTemplates.heatCooling";
    if (stage === "new") return "aiVideoTemplates.heatNew";
    return undefined;
}

/** Parse "9:16" style ratios; falls back to portrait 9:16. */
export function parseAspectRatio(value: string | undefined): number {
    const match = /^(\d+(?:\.\d+)?)\s*[:/x]\s*(\d+(?:\.\d+)?)$/.exec(value || "");
    if (!match) return 9 / 16;
    const ratio = Number(match[1]) / Number(match[2]);
    return Number.isFinite(ratio) && ratio > 0 ? ratio : 9 / 16;
}

/**
 * Derives a small "person / pet" subject tag strictly from template slots kind or categories.
 * If unknown, returns null (omit). Never invent tags.
 */
export function deriveSubject(categories?: string[], slots?: AIVideoTemplateSlot[]): "person" | "pet" | null {
    const cats = (categories || []).map((c) => c.toLowerCase());
    if (cats.some((c) => c.includes("pet") || c.includes("animal") || c.includes("cat") || c.includes("dog"))) {
        return "pet";
    }
    if (slots && slots.length > 0) {
        const kinds = slots.map((s) => (s.kind || "").toLowerCase());
        if (kinds.some((k) => k.includes("pet") || k.includes("animal"))) return "pet";
        if (kinds.some((k) => k.includes("face") || k.includes("person") || k.includes("portrait") || k.includes("human"))) return "person";
    }
    if (cats.some((c) => ["dance", "glow-up", "couple", "friends", "prank", "celebrity", "christmas", "halloween", "new-year"].some((k) => c.includes(k)))) {
        return "person";
    }
    return null;
}

/** Competitor template sites are never linked from our pages (sources, timeline, original post). */
const COMPETITOR_HOSTS = /(^|\.)viralremix\./i;
export function isCompetitorUrl(url: string | undefined | null): boolean {
    if (!url) return false;
    try {
        return COMPETITOR_HOSTS.test(new URL(url).hostname);
    } catch {
        return /viralremix/i.test(url);
    }
}

/** UTC calendar dates match the directory's time-filter boundaries. */
export function formatTemplateDate(value: string | undefined, locale: string, now = Date.now()): string {
    if (!value) return "";
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "";
    const today = new Date(now).toISOString().slice(0, 10);
    const day = date.toISOString().slice(0, 10);
    const days = Math.round((Date.parse(today) - Date.parse(day)) / 86400000);
    if (days >= 0 && days < 7) return new Intl.RelativeTimeFormat(locale, { numeric: "always" }).format(-days, "day");
    return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", ...(date.getUTCFullYear() !== new Date(now).getUTCFullYear() ? { year: "numeric" } : {}), timeZone: "UTC" }).format(date);
}

export function sortTemplateClips<T extends { uploadDate?: string; plays: number }>(clips: T[], sort: "new" | "plays"): T[] {
    return [...clips].sort((a, b) => (sort === "plays" ? b.plays - a.plays : (Date.parse(b.uploadDate || "") || 0) - (Date.parse(a.uploadDate || "") || 0)));
}

const TRIAL_PACK_SKU = "credits_trial_990";

/** Smallest purchasable credit pack (the one-time trial pack when the account still qualifies) and how many runs it covers. */
/** Session key copied into the cashier tab so its return page closes itself and the template page keeps its photos. */
export const TEMPLATE_RECHARGE_RETURN_KEY = "aivt-recharge-return";

export function templateRechargeOffer(quote: AIVideoTemplateQuote | null, options?: { checkoutEnabled: boolean; products: PaymentProduct[] }) {
    if (!quote || quote.directPayAvailable || !options?.checkoutEnabled || !(quote.totalCredits > 0)) return null;
    const packs = options.products.filter((p) => p.kind === "credits" && p.enabled && p.creditsMicrocredits > 0 && p.amountMinor > 0 && p.currency.toLowerCase() === "usd");
    const pack = packs.find((p) => p.sku === TRIAL_PACK_SKU) ?? [...packs].sort((a, b) => a.amountMinor - b.amountMinor)[0];
    if (!pack) return null;
    const credits = Math.floor(pack.creditsMicrocredits / 1_000_000);
    const times = Math.floor(credits / quote.totalCredits);
    if (times < 2) return null;
    return { sku: pack.sku, amount: (pack.amountMinor / 100).toFixed(2), credits, times };
}
