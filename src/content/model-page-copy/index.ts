import type { BlogLocale } from "../blog-locales";
import type { ModelPageOverride, ModelPageOverrides } from "./types";
import { kling4Overrides } from "./kling-4";
import { seedance20Overrides } from "./seedance-2-0";
import { seedance25Overrides } from "./seedance-2-5";
import { sora2Overrides } from "./sora-2";
import { veo31Overrides } from "./veo-3-1";
import { kling30Overrides } from "./kling-3-0";
import { minimaxH3Overrides } from "./minimax-h3";
import { wan30Overrides } from "./wan-3-0";
import { grokImagineOverrides } from "./grok-imagine";
import { nanoBananaOverrides } from "./nano-banana";
import { gptImage2Overrides } from "./gpt-image-2";
import { midjourneyV7Overrides } from "./midjourney-v7";

export * from "./types";

export const MODEL_PAGE_OVERRIDES: Record<string, ModelPageOverrides> = {
    "kling-4": kling4Overrides,
    "seedance-2-0": seedance20Overrides,
    "seedance-2-5": seedance25Overrides,
    "sora-2": sora2Overrides,
    "veo-3-1": veo31Overrides,
    "kling-3-0": kling30Overrides,
    "minimax-h3": minimaxH3Overrides,
    "wan-3-0": wan30Overrides,
    "grok-imagine": grokImagineOverrides,
    "nano-banana": nanoBananaOverrides,
    "gpt-image-2": gptImage2Overrides,
    "midjourney-v7": midjourneyV7Overrides,
};

export function getModelPageOverride(slug: string, locale: BlogLocale): ModelPageOverride | undefined {
    return MODEL_PAGE_OVERRIDES[slug]?.[locale];
}
