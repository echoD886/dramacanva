import { resolveAppLocale } from "@/i18n/app-locale";

export { formatPaymentAmount as formatMoney } from "./payment-money";

export function formatCreditQuantity(value: number, locale = resolveAppLocale(), maximumFractionDigits = 2) {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: Math.min(2, Math.max(0, maximumFractionDigits)) }).format(value);
}

export function formatFullTime(value: string | Date | undefined, locale: string = resolveAppLocale(), timeZone?: string) {
    const date = new Date(value || "");
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat(locale, { dateStyle: "full", timeStyle: "long", timeZone }).format(date);
}

export function formatRelativeTime(value: string | Date, locale: string = resolveAppLocale(), now = Date.now()) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    const seconds = (date.getTime() - now) / 1000;
    const [unit, scale] = Math.abs(seconds) < 60 ? ["second", 1] : Math.abs(seconds) < 3600 ? ["minute", 60] : Math.abs(seconds) < 86400 ? ["hour", 3600] : ["day", 86400];
    return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(Math.round(seconds / Number(scale)), unit as Intl.RelativeTimeFormatUnit);
}
