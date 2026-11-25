import type { ComponentProps } from "react";
import { useI18n } from "@/i18n/use-i18n";
import { formatFullTime, formatRelativeTime } from "@/lib/display-format";

/** Relative timestamp with the full local date and timezone available on hover. */
export function DisplayTime({ value, locale: overrideLocale, timeZone, ...props }: Omit<ComponentProps<"time">, "dateTime" | "children"> & { value?: string | null; locale?: string; timeZone?: string }) {
    const { locale } = useI18n();
    const date = new Date(value || "");
    if (Number.isNaN(date.getTime())) return <span className={props.className}>—</span>;
    return (
        <time {...props} dateTime={date.toISOString()} title={formatFullTime(date, overrideLocale || locale, timeZone)}>
            {formatRelativeTime(date, overrideLocale || locale)}
        </time>
    );
}
