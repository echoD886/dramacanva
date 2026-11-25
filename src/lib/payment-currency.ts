import type { CustomCreditPack, PaymentProduct } from "@/services/api/wallet";


export const microcreditsPerCredit = 1_000_000;

// These are deliberately presented as pre-wired checkout capabilities rather
// than a promise that every method is live today. Stripe decides the final
// method list from the Dashboard configuration, buyer location, currency, and
// checkout mode.
export const plannedPaymentMethods = ["Visa", "Mastercard", "American Express", "Apple Pay", "Google Pay", "Link", "Pix"] as const;
export const plannedPaymentCurrencies = ["USD", "EUR", "GBP", "JPY", "KRW", "BRL", "INR"] as const;

// The original fixed packs remain visible in the pricing page and credit store
// before a legacy backend has published its catalog. They are display-only
// until Stripe is enabled; a server catalog always takes precedence.
export const defaultOneTimeCreditProducts: PaymentProduct[] = [
    { sku: "credits_small", name: "入门积分包", kind: "credits", amountMinor: 2_990, originalAmountMinor: 5_400, currency: "usd", creditsMicrocredits: 1_000_000_000, enabled: true },
    { sku: "credits_medium", name: "项目积分包", kind: "credits", amountMinor: 11_990, originalAmountMinor: 21_800, currency: "usd", creditsMicrocredits: 4_500_000_000, enabled: true },
    { sku: "credits_large", name: "工作室积分包", kind: "credits", amountMinor: 29_900, originalAmountMinor: 54_400, currency: "usd", creditsMicrocredits: 11_600_000_000, enabled: true },
];

// This non-chargeable fallback mirrors the server's default payment catalog.
// It exists solely for older servers or a temporarily unavailable public API;
// the checkout control stays disabled until Stripe is actually connected.
export const defaultCustomCreditPack: CustomCreditPack = {
    enabled: true,
    sku: "credits_custom",
    name: "自定义积分",
    currency: "usd",
    unitAmountMinor: 54,
    unitCreditsMicrocredits: 10_000_000,
    minQuantity: 30,
    maxQuantity: 10_000,
    discountTiers: [
        { minQuantity: 100, discountBasisPoints: 4_463 },
        { minQuantity: 450, discountBasisPoints: 5_066 },
        { minQuantity: 1_160, discountBasisPoints: 5_226 },
    ],
};

export function creditCatalogWithDefaults(products: PaymentProduct[], creditCatalogConfigured: boolean) {
    if (creditCatalogConfigured || products.length) return products.filter((product) => product.enabled);
    return defaultOneTimeCreditProducts;
}

export type CustomCreditPreview = {
    quantity: number;
    creditsMicrocredits: number;
    baseAmountMinor: number;
    discountBasisPoints: number;
    discountAmountMinor: number;
    payableAmountMinor: number;
};

export function customCreditStep(config: CustomCreditPack) {
    return config.unitCreditsMicrocredits / microcreditsPerCredit;
}

export function customCreditMinimumMicrocredits(config: CustomCreditPack) {
    return config.unitCreditsMicrocredits * config.minQuantity;
}

export function customCreditMaximumMicrocredits(config: CustomCreditPack) {
    return config.unitCreditsMicrocredits * config.maxQuantity;
}

export function customCreditMinimum(config: CustomCreditPack) {
    return customCreditMinimumMicrocredits(config) / microcreditsPerCredit;
}

export function customCreditMaximum(config: CustomCreditPack) {
    return customCreditMaximumMicrocredits(config) / microcreditsPerCredit;
}

export function customCreditQuantity(config: CustomCreditPack, requestedCredits: number | null) {
    if (requestedCredits === null || !Number.isFinite(requestedCredits) || !Number.isSafeInteger(config.unitCreditsMicrocredits) || config.unitCreditsMicrocredits <= 0) return null;
    const requestedMicrocredits = Math.round(requestedCredits * microcreditsPerCredit);
    if (Math.abs(requestedCredits - requestedMicrocredits / microcreditsPerCredit) > Number.EPSILON * Math.max(1, Math.abs(requestedCredits))) return null;
    if (!Number.isSafeInteger(requestedMicrocredits) || requestedMicrocredits <= 0 || requestedMicrocredits % config.unitCreditsMicrocredits !== 0) return null;
    const quantity = requestedMicrocredits / config.unitCreditsMicrocredits;
    if (!Number.isSafeInteger(quantity) || quantity < config.minQuantity || quantity > config.maxQuantity) return null;
    return quantity;
}

export function customCreditDiscountTiers(config: CustomCreditPack) {
    return [...(config.discountTiers || [])]
        .filter((tier) => Number.isSafeInteger(tier.minQuantity) && tier.minQuantity > 0 && Number.isSafeInteger(tier.discountBasisPoints) && tier.discountBasisPoints > 0 && tier.discountBasisPoints < 10_000)
        .sort((left, right) => left.minQuantity - right.minQuantity);
}

export function customCreditDiscountBasisPoints(config: CustomCreditPack, quantity: number) {
    let discountBasisPoints = 0;
    for (const tier of customCreditDiscountTiers(config)) {
        if (quantity < tier.minQuantity) break;
        discountBasisPoints = tier.discountBasisPoints;
    }
    return discountBasisPoints;
}

export function customCreditPreview(config: CustomCreditPack, requestedCredits: number | null): CustomCreditPreview | null {
    const quantity = customCreditQuantity(config, requestedCredits);
    if (!quantity) return null;
    const creditsMicrocredits = config.unitCreditsMicrocredits * quantity;
    const baseAmountMinor = config.unitAmountMinor * quantity;
    if (!Number.isSafeInteger(creditsMicrocredits) || !Number.isSafeInteger(baseAmountMinor)) return null;
    const discountBasisPoints = customCreditDiscountBasisPoints(config, quantity);
    const multiplier = 10_000 - discountBasisPoints;
    const whole = Math.floor(baseAmountMinor / 10_000);
    const remainder = baseAmountMinor % 10_000;
    const payableAmountMinor = whole * multiplier + Math.floor((remainder * multiplier + 5_000) / 10_000);
    if (!Number.isSafeInteger(payableAmountMinor) || payableAmountMinor <= 0) return null;
    return {
        quantity,
        creditsMicrocredits,
        baseAmountMinor,
        discountBasisPoints,
        discountAmountMinor: baseAmountMinor - payableAmountMinor,
        payableAmountMinor,
    };
}

export function formatDiscountPercent(discountBasisPoints: number) {
    const percent = discountBasisPoints / 100;
    return Number.isInteger(percent) ? String(percent) : percent.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

