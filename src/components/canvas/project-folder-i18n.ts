import zhCN from "@/i18n/messages/asset-ui-hub.zh-CN";
import zhHK from "@/i18n/messages/asset-ui-hub.zh-HK";
import zhTW from "@/i18n/messages/asset-ui-hub.zh-TW";
import enUS from "@/i18n/messages/asset-ui-hub.en-US";
import jaJP from "@/i18n/messages/asset-ui-hub.ja-JP";
import koKR from "@/i18n/messages/asset-ui-hub.ko-KR";
import esES from "@/i18n/messages/asset-ui-hub.es-ES";
import ptBR from "@/i18n/messages/asset-ui-hub.pt-BR";

export type HubMessageKey = keyof typeof zhCN;

const dictionaries: Record<string, Record<string, string>> = {
    "zh-CN": zhCN,
    "zh-HK": zhHK,
    "zh-TW": zhTW,
    "en-US": enUS,
    "ja-JP": jaJP,
    "ko-KR": koKR,
    "es-ES": esES,
    "pt-BR": ptBR,
};

export function getHubText(
    locale: string,
    key: HubMessageKey,
    values?: Record<string, string | number>,
): string {
    const dict = dictionaries[locale] || dictionaries["zh-CN"] || zhCN;
    let text = dict[key] || zhCN[key] || key;
    if (values) {
        Object.entries(values).forEach(([k, v]) => {
            text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        });
    }
    return text;
}
