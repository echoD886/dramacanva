import { useCallback } from "react";
import { useI18n } from "@/i18n/use-i18n";
import type { AppLocale } from "@/i18n/app-locale";

import zhCN from "@/i18n/messages/asset-ui-detail.zh-CN";
import zhHK from "@/i18n/messages/asset-ui-detail.zh-HK";
import zhTW from "@/i18n/messages/asset-ui-detail.zh-TW";
import enUS from "@/i18n/messages/asset-ui-detail.en-US";
import jaJP from "@/i18n/messages/asset-ui-detail.ja-JP";
import koKR from "@/i18n/messages/asset-ui-detail.ko-KR";
import esES from "@/i18n/messages/asset-ui-detail.es-ES";
import ptBR from "@/i18n/messages/asset-ui-detail.pt-BR";

export type DetailMessageKey = keyof typeof zhCN;

const DETAIL_CATALOGS: Partial<Record<AppLocale, Record<string, string>>> = {
    "zh-CN": zhCN,
    "zh-HK": zhHK,
    "zh-TW": zhTW,
    "en-US": enUS,
    "ja-JP": jaJP,
    "ko-KR": koKR,
    "es-ES": esES,
    "pt-BR": ptBR,
};

export function getDetailMessage(
    locale: AppLocale,
    key: DetailMessageKey,
    values?: Record<string, string | number>,
): string {
    const catalog = DETAIL_CATALOGS[locale] || DETAIL_CATALOGS["en-US"] || zhCN;
    let text = catalog[key] ?? zhCN[key] ?? key;
    if (values) {
        for (const [k, v] of Object.entries(values)) {
            text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }
    }
    return text;
}

export function useDetailI18n() {
    const i18n = useI18n();
    const { locale, t } = i18n;

    const dt = useCallback(
        (key: DetailMessageKey, values?: Record<string, string | number>) => {
            const raw = (t as (k: string, v?: Record<string, string | number>) => string)(key, values);
            if (raw && raw !== key) {
                return raw;
            }
            return getDetailMessage(locale, key, values);
        },
        [locale, t],
    );

    return { ...i18n, dt };
}
