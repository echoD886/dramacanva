import type { AppLocale } from "./app-locale";
export type { AppLocale } from "./app-locale";
export const DATE_TIME_FORMAT = { year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric", hour12: false } as const satisfies Intl.DateTimeFormatOptions;
export const ADMIN_USER_DATE_TIME_FORMAT = { ...DATE_TIME_FORMAT, timeZoneName: "short" } as const satisfies Intl.DateTimeFormatOptions;
const defaultNumberFormats = new Map<AppLocale, Intl.NumberFormat>();
const numberFormats = new Map<string, Intl.NumberFormat>();
const dateFormats = new Map<string, Intl.DateTimeFormat>();
function formatKey(locale: AppLocale, options: object) {
    return JSON.stringify([locale, Object.entries(options).sort(([a], [b]) => a.localeCompare(b))]);
}
export function formatLocaleNumber(locale: AppLocale, value: number, options: Intl.NumberFormatOptions = {}) {
    if (!Object.keys(options).length) {
        let format = defaultNumberFormats.get(locale);
        if (!format) {
            format = new Intl.NumberFormat(locale);
            defaultNumberFormats.set(locale, format);
        }
        return format.format(value);
    }
    const key = formatKey(locale, options);
    let format = numberFormats.get(key);
    if (!format) {
        format = new Intl.NumberFormat(locale, options);
        numberFormats.set(key, format);
    }
    return format.format(value);
}

export function formatLocaleDate(locale: AppLocale, value: Date | string | number, options: Intl.DateTimeFormatOptions = {}) {
    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(date.getTime())) return "—";
    const merged = { ...(typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? { timeZone: "UTC" } : {}), ...options };
    const key = formatKey(locale, merged);
    let format = dateFormats.get(key);
    if (!format) {
        format = new Intl.DateTimeFormat(locale, merged);
        dateFormats.set(key, format);
    }
    return format.format(date);
}
