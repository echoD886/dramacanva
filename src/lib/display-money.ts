import snapshot from "./display-fx.json";
import { paymentMinorUnitDivisor } from "./payment-money";
export { default as DISPLAY_FX } from "./display-fx.json";
export type DisplayCurrency = keyof typeof snapshot.cnyPer100;
const currencies: Record<string, DisplayCurrency> = { "en-US":"USD", "zh-CN":"CNY", "zh-HK":"HKD", "zh-TW":"TWD", "ja-JP":"JPY", "ko-KR":"KRW", "es-ES":"EUR" };
export const displayCurrency = (locale: string): DisplayCurrency => currencies[locale] || "USD";
// ICU versions disagree on the width of the Japanese yen sign. Use the same
// symbol as the prerendered pricing page so React can hydrate its text.
function displayAmount(amount: number, currency: string, locale: string, minimumFractionDigits: number, maximumFractionDigits: number) {
    const text = new Intl.NumberFormat(locale, { style: "currency", currency, currencyDisplay: "symbol", minimumFractionDigits, maximumFractionDigits }).format(amount);
    return currency === "JPY" && locale === "ja-JP" ? text.replace("￥", "¥") : text;
}
/** Display conversion only. Never pass these amounts into a checkout request. */
export function localizedMoneyValue(amountMinor: number, sourceCurrency: string, locale: string) {
    const source = sourceCurrency.trim().toUpperCase();
    if (!Number.isFinite(amountMinor) || Math.abs(amountMinor) > Number.MAX_SAFE_INTEGER || !/^[A-Z]{3}$/.test(source)) return null;
    const target = displayCurrency(locale);
    const rates = snapshot.cnyPer100 as Record<string,number>;
    const supported = rates[source] !== undefined;
    const currency = supported ? target : source;
    const amount = amountMinor / paymentMinorUnitDivisor(source) * (supported ? rates[source] / rates[target] : 1);
    return Number.isFinite(amount) ? {amount, currency, converted: currency !== source, sourceCurrency:source} : null;
}
export function formatDisplayMoney(amountMinor: number, sourceCurrency: string, locale: string, decimals?: number) {
    const value = localizedMoneyValue(amountMinor,sourceCurrency,locale); if (!value) return "—";
    const digits = decimals ?? (["JPY","KRW"].includes(value.currency) ? 0 : 2);
    try { return displayAmount(value.amount, value.currency, locale, digits, digits); } catch { return "—"; }
}
export function formatDisplayUnitPrice(amountMinor: number, sourceCurrency: string, credits: number, locale: string) {
    const value=Number.isFinite(credits)&&credits>0?localizedMoneyValue(amountMinor/credits,sourceCurrency,locale):null;
    return value ? displayAmount(value.amount, value.currency, locale, 2, 4) : "—";
}
