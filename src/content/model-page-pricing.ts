import publicPrices from "./generated/model-public-prices.json";
import { SIGNUP_CREDITS } from "../lib/signup-credits-copy";
import type { ModelPage } from "./model-pages";

export type PriceUnit = "image" | "second" | "clip";

export interface ModelPriceTokens {
    signupCredits: number;
    minCredits: number;
    maxCredits: number;
    freeCount: number;
    unit: PriceUnit;
}

export const MODEL_SLUG_LIVE_CODES: Record<string, string[]> = {
    "seedance-2-0": ["seedance-2.0", "seedance-2.0-fast", "seedance-2.0-mini"],
    "seedance-2-5": ["seedance-2.5"],
    "veo-3-1": ["veo-3-1"],
    "kling-3-0": ["kling-3", "kling-3-turbo"],
    "minimax-h3": ["minimax-h3", "minimax-h3-max"],
    "wan-3-0": ["wan-3"],
    "grok-imagine": ["grok-video"],
    "nano-banana": ["nano-banana-2", "nano-banana-2.1", "nano-banana-pro"],
    "gpt-image-2": ["gpt-image-2", "gpt-image-2.5", "gpt-image-2.6"],
    "midjourney-v7": ["midjourney-v7"],
    "sora-2": [],
    "kling-4": [],
};

const priceMap = new Map<string, (typeof publicPrices)[number]>(publicPrices.map((item) => [item.modelCode, item]));

export function derivePriceUnit(billingMode: string, kind: "video" | "image"): PriceUnit {
    if (billingMode === "per_second") return "second";
    if (billingMode === "fixed_request") {
        return kind === "image" ? "image" : "clip";
    }
    return kind === "image" ? "image" : "second";
}

export function modelPriceTokens(model: ModelPage): ModelPriceTokens | null {
    const liveCodes = MODEL_SLUG_LIVE_CODES[model.slug];
    if (!liveCodes || liveCodes.length === 0) {
        return null;
    }

    const prices: number[] = [];
    let billingMode: string | undefined;

    for (const code of liveCodes) {
        const entry = priceMap.get(code);
        if (!entry) continue;

        if (!billingMode && entry.billingMode) {
            billingMode = entry.billingMode;
        }

        for (const quote of entry.quotes) {
            if (typeof quote.credits === "number" && Number.isFinite(quote.credits) && quote.credits > 0) {
                prices.push(quote.credits);
            }
        }
    }

    if (prices.length === 0 || !billingMode) {
        return null;
    }

    const rawMin = Math.min(...prices);
    const rawMax = Math.max(...prices);

    const minCredits = Math.round(rawMin);
    const maxCredits = Math.round(rawMax);
    const freeCount = Math.floor(SIGNUP_CREDITS / minCredits);
    const unit = derivePriceUnit(billingMode, model.kind);

    return {
        signupCredits: SIGNUP_CREDITS,
        minCredits,
        maxCredits,
        freeCount,
        unit,
    };
}
