import { currentLocaleText } from "./current-locale-text";
import { useEffect } from "react";
import { resolveAppLocale, type AppLocale } from "./app-locale";
import { useI18n } from "./use-i18n";
import { extendMessages, loadMessages, translateMessage, interpolateMessage, type MessageKey, type MessageCatalog } from "./messages";
import { dramaSourceKeys } from "./drama-source-keys";
const loaders = {
    "zh-CN": () => import("./messages/drama.zh-CN"),
    "zh-HK": () => import("./messages/drama.zh-HK"),
    "zh-TW": () => import("./messages/drama.zh-TW"),
    "en-US": () => import("./messages/drama.en-US"),
    "ja-JP": () => import("./messages/drama.ja-JP"),
    "ko-KR": () => import("./messages/drama.ko-KR"),
    "es-ES": () => import("./messages/drama.es-ES"),
    "pt-BR": () => import("./messages/drama.pt-BR"),
};
const pending = new Map<string, Promise<void>>();
const loaded = new Set<string>();
export function loadDramaMessages(locale: AppLocale): Promise<void> {
    const language = Object.hasOwn(loaders, locale) ? (locale as keyof typeof loaders) : "en-US";
    if (loaded.has(locale)) return Promise.resolve();
    const existing = pending.get(locale);
    if (existing) return existing;
    const promise = Promise.all([loadMessages(locale), loaders[language]()])
        .then(([, module]) => {
            loaded.add(locale);
            extendMessages(locale, module.default as unknown as Partial<MessageCatalog>);
        })
        .finally(() => pending.delete(locale));
    pending.set(locale, promise);
    return promise;
}
export const reviewLocale = resolveAppLocale;
export function useReviewLocale() {
    const { locale } = useI18n();
    useEffect(() => {
        void loadDramaMessages(locale).catch(() => {});
    }, [locale]);
    return locale;
}
export type ReviewValues = Readonly<Record<string, string | number | undefined>>;
export function translateReviewText(locale: AppLocale, source: string, values?: ReviewValues) {
    const key = dramaSourceKeys[source];
    if (!key) return source;
    const result = translateMessage(locale, key as MessageKey, values ? Object.fromEntries(Object.entries(values).filter((entry): entry is [string, string | number] => entry[1] !== undefined)) : undefined);
    return result === key ? interpolateMessage(source, values ? Object.fromEntries(Object.entries(values).filter((entry): entry is [string, string | number] => entry[1] !== undefined)) : undefined) : result;
}
export function reviewText(source: string, values?: ReviewValues) {
    return translateReviewText(reviewLocale(), source, values);
}
const serverTemplates = ["第 {v0} 集视频提示词待审阅", "{v0} 集剧本与分镜已就绪", "第 {v0} 集 · 第 {v1} 段", "第 {v0} 集：{v1}"].map((source) => {
    const keys = [...source.matchAll(/\{(v\d+)\}/g)].map((match) => match[1]);
    const pattern = source
        .split(/\{v\d+\}/)
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("([\\s\\S]*?)");
    return { source, keys, pattern: new RegExp(`^${pattern}$`) };
});
/** Presentation of known server status messages only; never used for error classification or request payloads. */
export function reviewServerText(source: string) {
    if (!source) return "";
    const account = /^等待账号空位：同时排队或运行的任务已达 (\d+) 个上限（含画布等其他任务），有任务完成后自动提交$/.exec(source);
    if (account) return currentLocaleText("canvasExtra.wait.account", { count: account[1] });
    const pool = /^等待作品空位：(文字|参考图|段视频|成片合成)同时生成 (\d+) 个已满，(?:完成一个后提交|前面还有 (\d+) 项排队)$/.exec(source);
    if (pool) {
        const kinds = { 文字: "text", 参考图: "image", 段视频: "video", 成片合成: "render" } as const;
        return currentLocaleText("canvasExtra.wait.pool", { kind: currentLocaleText(`canvasExtra.wait.${kinds[pool[1] as keyof typeof kinds]}`), count: pool[2], ahead: pool[3] || "0" });
    }
    if (source.startsWith("制作已暂停")) return currentLocaleText("canvasExtra.wait.paused");
    if (source === "制作未在运行，点“继续制作”后开始") return currentLocaleText("canvasExtra.wait.resume");
    if (source === "所选模型时长档位与提示词不同，请先用该模型重新撰写提示词") return currentLocaleText("generationFailure.fieldHint", { field: currentLocaleText("generationFailure.field.duration") });

    if (Object.hasOwn(dramaSourceKeys, source)) return reviewText(source);
    for (const template of serverTemplates) {
        const match = template.pattern.exec(source);
        if (match) return reviewText(template.source, Object.fromEntries(template.keys.map((key, index) => [key, match[index + 1]])));
    }
    return reviewText("操作失败");
}

export function formatReviewRelativeTime(value: string | number | Date | undefined | null, now = Date.now()) {
    if (value === undefined || value === null || value === "") return "—";
    const timestamp = value instanceof Date ? value.getTime() : typeof value === "number" ? value : Date.parse(value);
    if (!Number.isFinite(timestamp)) return "—";
    const elapsed = Math.max(0, now - timestamp);
    const unit = elapsed < 60_000 ? "second" : elapsed < 3_600_000 ? "minute" : elapsed < 86_400_000 ? "hour" : "day";
    const divisor = { second: 1_000, minute: 60_000, hour: 3_600_000, day: 86_400_000 }[unit];
    if (elapsed < 7 * 86_400_000) return new Intl.RelativeTimeFormat(reviewLocale(), { numeric: "auto" }).format(-Math.floor(elapsed / divisor), unit);
    return new Intl.DateTimeFormat(reviewLocale(), { year: "numeric", month: "short", day: "numeric" }).format(timestamp);
}
export function formatReviewAbsoluteDateTime(value: string | number | Date | undefined | null) {
    if (value === undefined || value === null || value === "") return "—";
    const date = value instanceof Date ? value : new Date(value);
    return Number.isFinite(date.getTime()) ? date.toLocaleString(reviewLocale(), { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";
}
