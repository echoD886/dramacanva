import { useEffect, useState } from "react";
import zhCN from "antd/locale/zh_CN";
import { useAppLocale } from "./app-locale";
import type { AppLocale } from "./locale-core";

// Explicit imports are statically discoverable and cannot be influenced by a URL.
const loaders = {
    "zh-HK": () => import("antd/locale/zh_HK"),
    "zh-TW": () => import("antd/locale/zh_TW"),
    "en-US": () => import("antd/locale/en_US"),
    "ja-JP": () => import("antd/locale/ja_JP"),
    "ko-KR": () => import("antd/locale/ko_KR"),
    "es-ES": () => import("antd/locale/es_ES"),
    "fr-FR": () => import("antd/locale/fr_FR"),
    "de-DE": () => import("antd/locale/de_DE"),
    "pt-BR": () => import("antd/locale/pt_BR"),
    "it-IT": () => import("antd/locale/it_IT"),
    "ru-RU": () => import("antd/locale/ru_RU"),
    "ar-SA": () => import("antd/locale/ar_EG"),
    "hi-IN": () => import("antd/locale/hi_IN"),
    "id-ID": () => import("antd/locale/id_ID"),
    "tr-TR": () => import("antd/locale/tr_TR"),
    "vi-VN": () => import("antd/locale/vi_VN"),
};
const cached = new Map<AppLocale, typeof zhCN>([["zh-CN", zhCN]]);

export function useAntLocale() {
    const locale = useAppLocale();
    const [loaded, setLoaded] = useState<{
        locale: AppLocale;
        value: typeof zhCN;
    }>({ locale: "zh-CN", value: zhCN });
    useEffect(() => {
        let cancelled = false;
        const known = cached.get(locale);
        if (known) {
            setLoaded({ locale, value: known });
            return;
        }
        if (locale === "zh-CN") return;
        void loaders[locale]()
            .then(({ default: value }) => {
                cached.set(locale, value);
                if (!cancelled) setLoaded({ locale, value });
            })
            .catch(() => {
                /* No startup failure on a missing optional locale chunk. */
            });
        return () => {
            cancelled = true;
        };
    }, [locale]);
    return loaded.locale === locale ? loaded.value : (cached.get(locale) ?? zhCN);
}
