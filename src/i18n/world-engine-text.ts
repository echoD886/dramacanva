import { resolveAppLocale } from "./app-locale";
import { useI18n } from "./use-i18n";
import { toTraditionalChinese } from "@/lib/i18n-traditional";
import catalog from "./messages/world-engine.json";
import vocabulary from "./messages/world-engine-vocabulary.json";
import { WORLD_ENGINE_LABELS } from "./world-engine-labels";
import { WORLD_ENGINE_PROP_LABELS } from "./world-engine-prop-labels";
import { WORLD_ENGINE_COMMON_KEYS } from "./world-engine-common-keys";
import { interpolateMessage, translateMessage } from "./messages";

const labels = new Map<string, readonly string[]>(Object.entries({ ...vocabulary, ...WORLD_ENGINE_PROP_LABELS, ...WORLD_ENGINE_LABELS }));
const sharedKeys = new Map(Object.entries(WORLD_ENGINE_COMMON_KEYS));
const storedDefaultNames: Record<string, string> = { Door: "门", Window: "窗", Car: "轿车", "Main camera": "主摄影机" };
const languageIndices: Record<string, number> = { "en-US": 0, "ja-JP": 1, "ko-KR": 2, "es-ES": 3, "pt-BR": 4 };

export function worldEngineText(rawKey: string, values?: Record<string, string | number>, locale = resolveAppLocale()): string {
    const key = storedDefaultNames[rawKey] ?? rawKey;
    const numbered = /^(?:Shot|镜头|鏡頭|ショット|샷|Plano)\s*(\d+) · (?:Previs|预演|預演|プリビズ|프리비즈|Previsualización|Prévia|Pré-visualização)$/u.exec(key);
    if (numbered) return worldEngineText("镜头 {n} · 预演", { n: numbered[1] }, locale);
    const language = locale === "zh-HK" || locale === "zh-TW" ? "zh-CN" : locale;
    const messages = catalog[language as keyof typeof catalog] || catalog["en-US"];
    const label = labels.get(key);
    const sharedKey = sharedKeys.get(key);
    const shared = sharedKey && translateMessage(locale, sharedKey);
    const message = (Object.hasOwn(messages, key) ? (messages as Record<string, string>)[key] : undefined) ?? (Object.hasOwn(catalog["zh-CN"], key) ? (catalog["zh-CN"] as Record<string, string>)[key] : undefined);
    let text = message ?? (label ? (language === "zh-CN" ? key : label[languageIndices[language] ?? 0]) : undefined) ?? (shared !== sharedKey ? shared : undefined);
    if (text === undefined && !values) {
        const pathMatch = /^路径(\d+)$/.exec(key);
        if (pathMatch) return worldEngineText("路径{p0}", { p0: pathMatch[1] }, locale);
        const numberedMatch = /^(.+?)\s+(\d+)$/.exec(key);
        if (numberedMatch && (labels.has(numberedMatch[1]) || sharedKeys.has(numberedMatch[1]))) {
            return `${worldEngineText(numberedMatch[1], undefined, locale)} ${numberedMatch[2]}`;
        }
    }
    text = text ?? key;
    if (locale === "zh-HK" || locale === "zh-TW") text = toTraditionalChinese(text, locale);
    if (!values) return text;
    const localized = Object.fromEntries(
        Object.entries(values).map(([name, value]) => [
            name,
            typeof value === "string" ? (labels.has(value) || sharedKeys.has(value) || storedDefaultNames[value] ? worldEngineText(value, undefined, locale) : locale === "zh-HK" || locale === "zh-TW" ? toTraditionalChinese(value, locale) : value) : value,
        ]),
    );
    return interpolateMessage(text, localized);
}

export function useWorldEngineTranslation() {
    const { locale } = useI18n();
    return { locale, t: (key: string, values?: Record<string, string | number>) => worldEngineText(key, values, locale) };
}
