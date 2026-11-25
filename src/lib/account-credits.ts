import { resolveAppLocale } from "@/i18n/app-locale";

/** Account display only. Generation prices keep formatCredits unchanged. */
export function formatAccountCredits(microcredits: number, locale: string = resolveAppLocale(), signed = false) {
    const sign = microcredits < 0 ? "−" : signed && microcredits > 0 ? "+" : "";
    const magnitude = Math.abs(microcredits);
    if (magnitude > 0 && magnitude < 10_000) return `${sign}<${new Intl.NumberFormat(locale).format(0.01)}`;
    // Truncate integer microcredits before division to avoid floating-point rounding up.
    return sign + new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(Math.abs(Math.floor(microcredits / 10_000)) / 100);
}
export function formatCashMinor(amount: number, currency: string, locale: string) {
    const code = typeof currency === "string" ? currency.toUpperCase() : "";
    if (!/^[A-Z]{3}$/.test(code) || (typeof Intl.supportedValuesOf === "function" && !Intl.supportedValuesOf("currency").includes(code))) return null;
    const formatter = new Intl.NumberFormat(locale, { style: "currency", currency });
    const digits = formatter.resolvedOptions().maximumFractionDigits ?? 2;
    return formatter.format(amount / 10 ** digits);
}
function zonedDateFormatter(timeZone: string) {
    return new Intl.DateTimeFormat("en-US", { timeZone, calendar: "gregory", numberingSystem: "latn", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
}

// Represent local calendar fields on a UTC clock solely for calendar arithmetic.
function calendarTime(date: Date, formatter: Intl.DateTimeFormat) {
    const parts = formatter.formatToParts(date);
    const field = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
    return Date.UTC(field("year"), field("month") - 1, field("day"), field("hour"), field("minute"), field("second"));
}

export function historyDateBoundary(value: string, timeZone: string, exclusiveEnd = false) {
    // Advance the calendar date before resolving its offset: DST days need not be 24 hours.
    const calendarDate = new Date(`${value}T00:00:00.000Z`);
    calendarDate.setUTCDate(calendarDate.getUTCDate() + (exclusiveEnd ? 1 : 0));
    const target = calendarDate.getTime();
    const formatter = zonedDateFormatter(timeZone);
    const day = 86_400_000;
    // Sample both sides of a transition. For repeated midnight choose the first
    // occurrence; for a skipped midnight move forward by the transition gap.
    const candidates = [-day, 0, day].map((delta) => {
        const sample = target + delta;
        const offset = calendarTime(new Date(sample), formatter) - sample;
        const instant = target - offset;
        return { instant, local: calendarTime(new Date(instant), formatter) };
    });
    const exact = candidates.filter((candidate) => candidate.local === target);
    const boundary = exact.length ? Math.min(...exact.map((candidate) => candidate.instant)) : Math.min(...candidates.filter((candidate) => candidate.local > target).map((candidate) => candidate.instant));
    return new Date(boundary).toISOString();
}
export function defaultHistoryWindow(now = new Date(), timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone) {
    const firstDay = new Date(calendarTime(now, zonedDateFormatter(timeZone)));
    firstDay.setUTCDate(firstDay.getUTCDate() - 29);
    const firstDate = firstDay.toISOString().slice(0, 10);
    return { from: historyDateBoundary(firstDate, timeZone), to: now.toISOString() };
}
