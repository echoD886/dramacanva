/**
 * Exit offer bookkeeping. When a signed-in buyer opens the hosted cashier we remember which unpaid checkout it
 * was; when they come back to the pricing page without paying, the page asks the server for the one-time offer.
 * Everything here is best effort: blocked storage simply means no offer.
 */

export type CheckoutFlow = "credits" | "custom" | "subscription";
export type CheckoutSource = { kind: "order" | "subscription"; id: string; sku: string; provider: string; flow: CheckoutFlow; quantity?: number; at: number };

const SOURCE_KEY = "checkout-exit-source";
// Shared across tabs: the cashier tab lands back on our site after a successful payment and records it here.
const PAID_KEY = "checkout-exit-paid";
/** A glance away shorter than this is not "leaving the cashier". */
export const EXIT_OFFER_MIN_AWAY_MS = 4000;
/** Give the payment webhook a moment before asking, so a buyer who just paid is not shown an offer. */
export const EXIT_OFFER_SETTLE_MS = 2500;

export function rememberCheckoutSource(source: Omit<CheckoutSource, "at">) {
    if (!source.id) return;
    try {
        sessionStorage.setItem(SOURCE_KEY, JSON.stringify({ ...source, at: Date.now() }));
    } catch {
        /* Storage blocked: no offer. */
    }
}

export function peekCheckoutSource(): CheckoutSource | null {
    try {
        const raw = sessionStorage.getItem(SOURCE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as CheckoutSource;
        return parsed && typeof parsed.id === "string" && (parsed.kind === "order" || parsed.kind === "subscription") ? parsed : null;
    } catch {
        return null;
    }
}

export function forgetCheckoutSource() {
    try {
        sessionStorage.removeItem(SOURCE_KEY);
    } catch {
        /* Nothing stored. */
    }
}

export function markCheckoutPaid() {
    try {
        localStorage.setItem(PAID_KEY, String(Date.now()));
    } catch {
        /* Storage blocked. */
    }
}

/** True when a payment finished (in any tab) after this checkout was opened. */
export function paidSince(at: number) {
    try {
        return Number(localStorage.getItem(PAID_KEY) || 0) >= at;
    } catch {
        return false;
    }
}

/** Price after the offer, in minor units (an estimate: the cashier computes the final amount, plus any tax). */
export function exitOfferPrice(listMinor: number, percentOff: number) {
    return Math.max(0, listMinor - Math.round((listMinor * percentOff) / 100));
}

export function countdownParts(remainingMs: number) {
    const total = Math.max(0, Math.ceil(remainingMs / 1000));
    return { minutes: String(Math.floor(total / 60)).padStart(2, "0"), seconds: String(total % 60).padStart(2, "0"), done: total === 0 };
}
