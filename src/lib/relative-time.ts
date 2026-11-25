import { resolveAppLocale, type AppLocale } from "@/i18n/app-locale";
import { translateMessage } from "@/i18n/messages";

const JUST_NOW_BY_LOCALE: Record<string, string> = {
    "zh-CN": "刚刚",
    "zh-TW": "剛剛",
    "zh-HK": "剛剛",
    "en-US": "Just now",
    "ja-JP": "たった今",
    "ko-KR": "방금",
    "es-ES": "Ahora mismo",
    "pt-BR": "Agora mesmo",
};

const relativeFormatters = { always: new Map<string, Intl.RelativeTimeFormat>(), auto: new Map<string, Intl.RelativeTimeFormat>() };
const dateFormatters = new Map<string, Intl.DateTimeFormat>();

function relativeFormatter(locale: string, numeric: "always" | "auto") {
    const cache = relativeFormatters[numeric];
    let formatter = cache.get(locale);
    if (!formatter) {
        formatter = new Intl.RelativeTimeFormat(locale, { numeric });
        cache.set(locale, formatter);
    }
    return formatter;
}

/**
 * Formats a timestamp into a localized relative time string:
 * - < 60s: 刚刚 / Just now
 * - < 60m: N 分钟前 / N minutes ago
 * - Same day (< 24h): N 小时前 / N hours ago
 * - Yesterday (calendar day before today): 昨天 / yesterday / 昨日 / 어제
 * - Earlier: M月D日 (short month + day, or year if different year)
 */
export function formatCardRelativeTime(
    value?: string | number | Date | null,
    locale: string = resolveAppLocale(),
): string {
    if (!value) return "";
    const date = typeof value === "object" && value instanceof Date ? value : new Date(value);
    const timestamp = date.getTime();
    if (!Number.isFinite(timestamp)) return "";

    const now = new Date();
    const seconds = Math.max(0, Math.floor((now.getTime() - timestamp) / 1000));

    // Under 1 minute: 刚刚 / Just now
    if (seconds < 60) {
        if (JUST_NOW_BY_LOCALE[locale]) {
            return JUST_NOW_BY_LOCALE[locale];
        }
        const translated = translateMessage(locale as AppLocale, "announcements.justNow");
        if (translated && !translated.startsWith("announcements.")) {
            return translated;
        }
        return "Just now";
    }

    const relativeAlways = relativeFormatter(locale, "always");

    // Under 1 hour: N 分钟前 / N minutes ago
    if (seconds < 3600) {
        return relativeAlways.format(-Math.floor(seconds / 60), "minute");
    }

    // Same calendar day: N 小时前 / N hours ago
    const isSameDay =
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate();

    if (isSameDay) {
        return relativeAlways.format(-Math.floor(seconds / 3600), "hour");
    }

    // Yesterday (calendar day before today)
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
        date.getFullYear() === yesterday.getFullYear() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getDate() === yesterday.getDate();

    if (isYesterday) {
        const relativeAuto = relativeFormatter(locale, "auto");
        return relativeAuto.format(-1, "day");
    }

    // Older: M月D日 / Oct 19
    const isSameYear = date.getFullYear() === now.getFullYear();
    const key = `${locale}:${isSameYear}`;
    let formatter = dateFormatters.get(key);
    if (!formatter) {
        formatter = new Intl.DateTimeFormat(
            locale,
            isSameYear
                ? { month: "short", day: "numeric" }
                : { year: "numeric", month: "short", day: "numeric" },
        );
        dateFormatters.set(key, formatter);
    }
    return formatter.format(date);
}
