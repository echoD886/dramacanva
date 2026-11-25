import { useEffect } from "react";
import type { AppLocale } from "./app-locale";
import { extendMessages, loadMessages } from "./messages";
import { useI18n } from "./use-i18n";

const loaders = {
    "zh-CN": () => import("./messages/upstream-six.zh-CN"),
    "zh-HK": () => import("./messages/upstream-six.zh-HK"),
    "zh-TW": () => import("./messages/upstream-six.zh-TW"),
    "en-US": () => import("./messages/upstream-six.en-US"),
    "ja-JP": () => import("./messages/upstream-six.ja-JP"),
    "ko-KR": () => import("./messages/upstream-six.ko-KR"),
    "es-ES": () => import("./messages/upstream-six.es-ES"),
    "pt-BR": () => import("./messages/upstream-six.pt-BR"),
};
const loaded = new Set<AppLocale>();
const pending = new Map<AppLocale, Promise<void>>();

export function loadCanvasFeatureMessages(locale: AppLocale): Promise<void> {
    if (loaded.has(locale)) return Promise.resolve();
    const existing = pending.get(locale);
    if (existing) return existing;
    const language = Object.hasOwn(loaders, locale) ? (locale as keyof typeof loaders) : "en-US";
    const request = Promise.all([loadMessages(locale), loaders[language]()])
        .then(([, module]) => {
            loaded.add(locale);
            extendMessages(locale, module.default);
        })
        .finally(() => pending.delete(locale));
    pending.set(locale, request);
    return request;
}

export function useCanvasFeatureMessages() {
    const { locale } = useI18n();
    useEffect(() => {
        void loadCanvasFeatureMessages(locale).catch(() => {});
    }, [locale]);
    return loaded.has(locale);
}
