import { createContext, useContext, useSyncExternalStore } from "react";
import { createLocalePreference } from "./locale-preference";

export const APP_LOCALE_STORAGE_KEY = "dramacanva-public.locale";

export const APP_LOCALES = ["zh-CN", "zh-HK", "zh-TW", "en-US", "ja-JP", "ko-KR", "es-ES", "fr-FR", "de-DE", "pt-BR", "it-IT", "ru-RU", "ar-SA", "hi-IN", "id-ID", "tr-TR", "vi-VN"] as const;

export type AppLocale = (typeof APP_LOCALES)[number];
export const AppLocaleContext = createContext<AppLocale | undefined>(undefined);

export function normalizeAppLocale(value: string | null | undefined): AppLocale | null {
    if (!value || value.length > 64) return null;
    try {
        const [canonical] = Intl.getCanonicalLocales(value.trim().replace(/_/g, "-"));
        const exact = APP_LOCALES.find((locale) => locale.toLowerCase() === canonical.toLowerCase());
        if (exact) return exact;
        const language = canonical.split("-")[0].toLowerCase();
        if (language === "zh") {
            const parsed = new Intl.Locale(canonical);
            if (parsed.script === "Hans") return "zh-CN";
            if (parsed.region === "HK" || parsed.region === "MO") return "zh-HK";
            if (parsed.region === "TW" || parsed.script === "Hant") return "zh-TW";
            return "zh-CN";
        }
        return APP_LOCALES.find((locale) => locale.split("-")[0] === language) ?? null;
    } catch {
        return null;
    }
}

export function isRtlAppLocale(locale: AppLocale): boolean {
    return locale === "ar-SA";
}

const serverPreference = createLocalePreference<AppLocale>("en-US");
let browserPreference: ReturnType<typeof createLocalePreference<AppLocale>> | undefined;
function getLocalePreference() {
    if (typeof window === "undefined") return serverPreference;
    if (!browserPreference) {
        browserPreference = createLocalePreference<AppLocale>("en-US", {
            normalize: normalizeAppLocale,
            read: () => window.localStorage.getItem(APP_LOCALE_STORAGE_KEY),
            write: (locale) => window.localStorage.setItem(APP_LOCALE_STORAGE_KEY, locale),
            fallback: () => ["en-US"],
            listen: (storageChanged, languageChanged) => {
                const onStorage = (event: StorageEvent) => {
                    if (event.key !== null && event.key !== APP_LOCALE_STORAGE_KEY) return;
                    try {
                        if (event.storageArea && event.storageArea !== window.localStorage) return;
                    } catch {
                        return;
                    }
                    storageChanged();
                };
                window.addEventListener("storage", onStorage);
                window.addEventListener("languagechange", languageChanged);
                return () => {
                    window.removeEventListener("storage", onStorage);
                    window.removeEventListener("languagechange", languageChanged);
                };
            },
        });
    }
    return browserPreference;
}

export function resolveAppLocale(): AppLocale {
    return getLocalePreference().getSnapshot();
}

export function setAppLocale(value: string): boolean {
    return getLocalePreference().setLocale(value);
}

export function useAppLocale(): AppLocale {
    const override = useContext(AppLocaleContext);
    const preference = getLocalePreference();
    const locale = useSyncExternalStore(preference.subscribe, preference.getSnapshot, preference.getServerSnapshot);
    return override ?? locale;
}
