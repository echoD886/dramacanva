import type { ModelCase } from "./types";
import { NANO_BANANA_CASES } from "./nano-banana";
import { GPT_IMAGE_2_CASES } from "./gpt-image-2";

export * from "./types";
export { NANO_BANANA_CASES } from "./nano-banana";
export { GPT_IMAGE_2_CASES } from "./gpt-image-2";

const MODEL_CASES_MAP: Record<string, ModelCase[]> = {
    "nano-banana": NANO_BANANA_CASES,
    "gpt-image-2": GPT_IMAGE_2_CASES,
};

export function getModelCases(slug: string): ModelCase[] {
    return MODEL_CASES_MAP[slug] ?? [];
}
