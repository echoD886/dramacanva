import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useAppLocale } from "./app-locale";
import { formatLocaleDate, formatLocaleNumber } from "./locale-core";
import { hasMessages, loadMessages, messagesSnapshot, serverMessagesSnapshot, subscribeMessages, translateMessage, type MessageKey, type MessageValues } from "./messages";

export function useI18n() {
    const locale = useAppLocale();
    const revision = useSyncExternalStore(subscribeMessages, messagesSnapshot, serverMessagesSnapshot);
    useEffect(() => {
        void loadMessages(locale).catch(() => {
            /* Keep the English fallback; a later mount may retry the requested language. */
        });
    }, [locale]);
    const t = useCallback((key: MessageKey, values?: MessageValues) => translateMessage(locale, key, values), [locale, revision]);
    const number = useCallback((value: number, options?: Intl.NumberFormatOptions) => formatLocaleNumber(locale, value, options), [locale]);
    const date = useCallback((value: string | number | Date, options?: Intl.DateTimeFormatOptions) => formatLocaleDate(locale, value, options), [locale]);
    return { locale, t, number, date, translated: hasMessages(locale) };
}
