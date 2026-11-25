/**
 * Black Friday 2026: one code (BF2026) created on both Waffo and Creem, 20% off every product except the
 * trial pack, first billing period only for subscriptions. The cashier validates the code; we only prefill it.
 */
export const BLACK_FRIDAY = Object.freeze({
    id: "black-friday-2026",
    code: "BF2026",
    percentOff: 20,
    startsAt: "2026-11-09T00:00:00Z",
    // Dec 1 23:59:59 America/Los_Angeles — the same instant the provider coupons expire.
    endsAt: "2026-12-02T07:59:59Z",
    excludedSkus: ["credits_trial_990"] as readonly string[],
});

export function blackFridayClock(now: number) {
    const start = Date.parse(BLACK_FRIDAY.startsAt);
    const end = Date.parse(BLACK_FRIDAY.endsAt);
    const status = now < start ? "upcoming" : now >= end ? "expired" : "active";
    const remaining = Math.max(0, Math.ceil((end - now) / 1000));
    return { status, remaining, days: Math.floor(remaining / 86400), hours: Math.floor(remaining / 3600) % 24, minutes: Math.floor(remaining / 60) % 60, seconds: remaining % 60 } as const;
}

export function blackFridayActive(now: number) {
    return blackFridayClock(now).status === "active";
}

/** Pricing link that carries the code so the cashier opens with it applied. */
export function blackFridayHref(href: string) {
    const url = new URL(href, "https://dramacanva.com");
    url.searchParams.set("promo", BLACK_FRIDAY.code);
    return url.pathname + url.search + url.hash;
}

/** The trial pack is excluded from the coupon; sending the code there would make the cashier refuse the checkout. */
export function promoForSku(promo: string, sku: string | undefined) {
    const code = promo.trim();
    if (sku && BLACK_FRIDAY.excludedSkus.includes(sku) && code.toUpperCase() === BLACK_FRIDAY.code) return "";
    return code;
}
