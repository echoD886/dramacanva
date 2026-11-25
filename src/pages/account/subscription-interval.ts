import type { MessageKey } from "@/i18n/messages";

/** Stripe bills quarterly plans as month×3 and BYOK passes as month×6; the count decides the label. */
export function subscriptionIntervalLabel(interval: string | undefined, intervalCount: number | undefined): { key: MessageKey; values?: { count: number } } {
    const count = Number.isInteger(intervalCount) && intervalCount! > 0 ? intervalCount! : 1;
    if (interval === "year") return { key: "accountPage.intervalYear" };
    if (count === 1) return { key: "accountPage.intervalMonth" };
    if (count === 3) return { key: "accountPage.intervalQuarter" };
    if (count === 6) return { key: "accountPage.intervalHalfYear" };
    if (count === 12) return { key: "accountPage.intervalYear" };
    return { key: "accountPage.intervalEveryMonths", values: { count } };
}
