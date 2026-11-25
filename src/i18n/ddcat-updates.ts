import { resolveAppLocale } from "./app-locale";
import { convertCatalogToTraditional } from "@/lib/i18n-traditional";
import english from "./messages/ddcat-updates.en-US.json";
import japanese from "./messages/ddcat-updates.ja-JP.json";
import korean from "./messages/ddcat-updates.ko-KR.json";
import spanish from "./messages/ddcat-updates.es-ES.json";
import portuguese from "./messages/ddcat-updates.pt-BR.json";

const simplified = Object.fromEntries(Object.keys(english).map((source) => [source, source]));
const catalogs: Record<string, Record<string, string>> = {
    "en-US": english,
    "zh-CN": simplified,
    "zh-TW": convertCatalogToTraditional(simplified, "zh-TW"),
    "zh-HK": convertCatalogToTraditional(simplified, "zh-HK"),
    "ja-JP": japanese,
    "ko-KR": korean,
    "es-ES": spanish,
    "pt-BR": portuguese,
};

/** Feature copy follows the existing eight app languages and English fallback. */
export function upstreamText(source: string, values: unknown[] = []): string {
    const locale = resolveAppLocale();
    const translated = catalogs[locale]?.[source] || (english as Record<string, string>)[source] || source;
    return translated.replace(/\{(\d+)\}/g, (_, index: string) => String(values[Number(index)] ?? ""));
}

export const AUDIO_VALIDATION_MESSAGE_KEYS = {
    全能配音需要连接参考音频: "generationErrors.audioReferenceRequired",
    当前音频协议不支持参考音色配音: "generationErrors.audioReferenceUnsupported",
    "角色或参考音频连接已变化，请重新确认音色对应关系": "generationErrors.audioVoiceBindingChanged",
} as const;

export type AudioValidationSource = keyof typeof AUDIO_VALIDATION_MESSAGE_KEYS;
export type AudioValidationMessageKey = (typeof AUDIO_VALIDATION_MESSAGE_KEYS)[AudioValidationSource];

const audioValidationLookup = new Map<string, AudioValidationMessageKey>();
for (const [source, key] of Object.entries(AUDIO_VALIDATION_MESSAGE_KEYS) as Array<[AudioValidationSource, AudioValidationMessageKey]>) {
    audioValidationLookup.set(source, key);
    for (const catalog of Object.values(catalogs)) {
        const translated = catalog[source];
        if (translated) audioValidationLookup.set(translated, key);
    }
}

export function matchAudioValidationMessageKey(value: unknown): AudioValidationMessageKey | undefined {
    const candidates: string[] = [];
    if (typeof value === "string") candidates.push(value);
    else if (value && typeof value === "object") {
        const record = value as Record<string, unknown>;
        for (const field of ["message", "errorDetails", "text", "error"]) {
            if (typeof record[field] === "string") candidates.push(record[field] as string);
        }
    }
    for (const raw of candidates) {
        const trimmed = raw.trim();
        if (!trimmed) continue;
        const direct = audioValidationLookup.get(trimmed);
        if (direct) return direct;
        for (const [variant, key] of audioValidationLookup) {
            if (trimmed.endsWith(`：${variant}`) || trimmed.endsWith(`: ${variant}`)) return key;
        }
    }
    return undefined;
}

export function createAudioValidationError(source: AudioValidationSource): Error & { code: "invalid_input" } {
    return Object.assign(new Error(upstreamText(source)), { code: "invalid_input" as const });
}
