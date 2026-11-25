import { MODEL_PRICE_PRESETS, videoTierPresets, imageTierPresets } from "@/lib/canvas/model-price-presets";

// Reuse the same credit presets as the existing model pricing reference.
// These are planning estimates, not a live provider quote or an availability claim.
const modelKeys = ["seedance-2.5", "seedance-2.0", "kling-3.0-pro", "wan3.0", "minimax-h3", "nano-banana-pro", "seedream-5.0-pro", "gpt-image-2.5", "gpt-image-2.6"];
export const valueModels = modelKeys.map((key) => {
    const preset = MODEL_PRICE_PRESETS.find((entry) => entry.keys[0] === key)!.preset;
    return { key, name: preset.label, kind: preset.capability, tiers: preset.capability === "video" ? videoTierPresets(preset) : imageTierPresets(preset) };
});
export type ValueScenario = { model: string; spec: string; seconds: number };
export const defaultScenario: ValueScenario = { model: "seedance-2.5", spec: "720p", seconds: 5 };
export function generationValue(credits: number, periods: number, scenario: ValueScenario) {
    const model = valueModels.find((entry) => entry.key === scenario.model);
    const tier = model?.tiers.find((entry) => entry.selectorValue === scenario.spec);
    if (!model || !tier || !Number.isFinite(credits) || credits < 0 || !Number.isInteger(periods) || periods < 1 || ![5, 10, 15].includes(scenario.seconds)) return null;
    const units = model.kind === "video" ? scenario.seconds : 1;
    // Integer hundredths prevent floor(32800/70) drift from decimal credit rates.
    const costHundredths = Math.round(tier.unitPrice * 100) * units;
    const creditHundredths = Math.round(credits * 100);
    if (!Number.isSafeInteger(costHundredths) || costHundredths <= 0 || !Number.isSafeInteger(creditHundredths)) return null;
    const perPeriod = Math.floor(creditHundredths / costHundredths);
    const termResults = perPeriod * periods;
    if (!Number.isSafeInteger(termResults)) return null;
    // Plan discounts and exchange rates never define the model's credit debit.
    return { model, pricingSource: "preset" as const, confirmed: false as const, creditRate: tier.unitPrice, creditsPerResult: costHundredths / 100, perPeriod, termResults };
}
