import type { PublicCustomerPrice } from "@/services/api/logical-models";

export function publicPriceSpecification(row: PublicCustomerPrice) {
    const options = row.intent.options || {};
    return [options.vquality, options.imageSizeTier || options.imageResolution, options.size, options.videoSeconds ? `${options.videoSeconds}s` : "", options.quality].filter(Boolean).join(" · ");
}

export function publicGenerationValue(prices: PublicCustomerPrice[], credits: number, scenario: { model: string; spec: string; seconds: number }) {
    const row = prices.find((row) => {
        const options = row.intent.options || {};
        const spec = String(row.capability === "video" ? options.vquality : options.imageSizeTier || options.imageResolution || options.size || "").toLowerCase();
        return row.modelCode === scenario.model && spec === scenario.spec.toLowerCase() && (row.capability !== "video" || Number(options.videoSeconds) === scenario.seconds);
    });
    if (!row || row.quote.amountMicrocredits <= 0) return null;
    const cost = row.quote.amountMicrocredits / 1_000_000;
    const count = Math.floor(credits * 1_000_000 / row.quote.amountMicrocredits);
    return { model: { name: row.modelName, kind: row.capability }, creditsPerResult: cost, perPeriod: count, termResults: count };
}
