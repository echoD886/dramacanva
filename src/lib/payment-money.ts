// Stripe charge units, not payout units or Intl currency display precision.
// ISK and UGX retain two-decimal API representations; HUF/TWD charges also use cents.
const ZERO_DECIMAL_CHARGE_CURRENCIES = new Set([
    "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA",
    "PYG", "RWF", "VND", "VUV", "XAF", "XOF", "XPF",
]);

export function paymentMinorUnitDivisor(currency: string) {
    return ZERO_DECIMAL_CHARGE_CURRENCIES.has(currency.trim().toUpperCase()) ? 1 : 100;
}

/** Format the server's charge amount without changing its currency or applying FX. */
export function formatPaymentAmount(amountMinor: number, currency: string, locale = "en-US") {
    if (!Number.isSafeInteger(amountMinor) || !/^[a-z]{3}$/i.test(currency.trim())) return "—";
    const code = currency.trim().toUpperCase();
    const divisor = paymentMinorUnitDivisor(code);
    return new Intl.NumberFormat(locale, {
        style: "currency", currency: code, currencyDisplay: "code",
        minimumFractionDigits: divisor === 1 ? 0 : 2,
        maximumFractionDigits: divisor === 1 ? 0 : 2,
    }).format(amountMinor / divisor);
}

export function formatPaymentUnitPrice(amountMinor: number, currency: string, credits: number, locale = "en-US", maxFractionDigits = 6) {
    if (!Number.isSafeInteger(amountMinor) || !Number.isFinite(credits) || credits <= 0 || !/^[a-z]{3}$/i.test(currency.trim())) return "—";
    return new Intl.NumberFormat(locale, {
        style: "currency", currency: currency.trim().toUpperCase(), currencyDisplay: "code",
        minimumFractionDigits: 2, maximumFractionDigits: maxFractionDigits,
    }).format(amountMinor / paymentMinorUnitDivisor(currency) / credits);
}
