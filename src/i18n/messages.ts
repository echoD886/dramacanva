import { publicMarketMessages } from "./public-market-messages";
import { MARKET_LOCALES, isMarketLocale } from "../lib/public-market-copy";
import type { AppLocale } from "./locale-core";
import type drama from "./messages/drama.zh-CN";
import type chinese from "./messages/zh-CN";
import type upstreamSix from "./messages/upstream-six.zh-CN";

import { convertCatalogToTraditional } from "../lib/i18n-traditional";
import { directorPrevisTraditional } from "./messages/director-previs-traditional";
import { MCP_PUBLIC_COPY } from "../lib/mcp-public-copy";
import { MCP_OAUTH_COPY } from "../lib/mcp-oauth-copy";
import type commerceWorkspace from "./messages/commerce-workspace.zh-CN";
import type commerce from "./messages/commerce.zh-CN";
import type aiVideoTemplates from "./messages/ai-video-templates.zh-CN";

export type MessageKey = keyof typeof chinese | keyof typeof upstreamSix | keyof typeof drama | keyof typeof commerce | keyof typeof commerceWorkspace | keyof typeof aiVideoTemplates;
export type MessageCatalog = Record<keyof typeof chinese, string> & Partial<Record<keyof typeof upstreamSix | keyof typeof drama | keyof typeof commerceWorkspace, string>>;
export type MessageValues = Readonly<Record<string, string | number>>;
export const MESSAGE_LOCALES = ["zh-CN", "zh-HK", "zh-TW", "en-US", "ja-JP", "ko-KR", "es-ES", "pt-BR"] as const;
export type MessageLocale = (typeof MESSAGE_LOCALES)[number];

// Every catalog, including Chinese and English, is its own chunk: each one is
// several hundred KB and a page only needs the visitor's language. Startup
// (prepareInitialPage / prerender) awaits the current catalog before render.
const loaders = {
    "zh-CN": () => import("./messages/zh-CN"),
    "en-US": () => import("./messages/en-US"),
    "ja-JP": () => import("./messages/ja-JP"),
    "ko-KR": () => import("./messages/ko-KR"),
    "es-ES": () => import("./messages/es-ES"),
    "pt-BR": () => import("./messages/pt-BR"),
} satisfies Partial<Record<AppLocale, () => Promise<{ default: MessageCatalog }>>>;
type LoadableLocale = keyof typeof loaders;
const catalogs = new Map<AppLocale, MessageCatalog>();
// Bundled native public copy remains available before complete catalog loading.
const publicCatalogs = new Map<AppLocale, Partial<MessageCatalog>>(MARKET_LOCALES.map((locale) => [locale, publicMarketMessages(locale)] as const));
const pending = new Map<AppLocale, Promise<void>>();
const listeners = new Set<() => void>();
let revision = 0;

export function subscribeMessages(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
export function messagesSnapshot() {
    return revision;
}
export function serverMessagesSnapshot() {
    return 0;
}
export function hasMessages(locale: AppLocale) {
    return catalogs.has(locale);
}

function publish() {
    revision++;
    for (const listener of [...listeners]) listener();
}

/** Feature catalogs extend the active catalog only when their UI is opened. */
export function extendMessages(locale: AppLocale, messages: Partial<MessageCatalog>) {
    catalogs.set(locale, { ...catalogs.get(locale), ...messages } as MessageCatalog);
    publish();
}

function loadCatalog(locale: LoadableLocale): Promise<void> {
    if (catalogs.has(locale)) return Promise.resolve();
    const existing = pending.get(locale);
    if (existing) return existing;
    const promise = loaders[locale]()
        .then(({ default: catalog }) => {
            catalogs.set(locale, isMarketLocale(locale) ? { ...catalog, ...publicMarketMessages(locale) } : catalog);
            publish();
        })
        .finally(() => {
            if (pending.get(locale) === promise) pending.delete(locale);
        });
    pending.set(locale, promise);
    return promise;
}

/** Load only the requested language. Rejected imports can be retried. */
export function loadMessages(locale: AppLocale): Promise<void> {
    if (catalogs.has(locale)) return Promise.resolve();
    if (locale === "zh-HK" || locale === "zh-TW") {
        return Promise.all([
            loadCatalog("zh-CN"),
            locale === "zh-HK" ? import("./messages/commerce.zh-HK") : import("./messages/commerce.zh-TW"),
            locale === "zh-HK" ? import("./messages/commerce-workspace.zh-HK") : import("./messages/commerce-workspace.zh-TW"),
            locale === "zh-HK" ? import("./messages/ai-video-templates.zh-HK") : import("./messages/ai-video-templates.zh-TW"),
        ]).then(([, { default: commerce }, { default: commerceWorkspace }, { default: aiVideoTemplates }]) => {
            if (catalogs.has(locale)) return;
            catalogs.set(locale, {
                ...convertCatalogToTraditional(catalogs.get("zh-CN")!, locale),
                ...directorPrevisTraditional[locale],
                ...MCP_PUBLIC_COPY[locale],
                ...MCP_OAUTH_COPY[locale],
                ...publicMarketMessages(locale),
                ...commerce,
                ...commerceWorkspace,
                ...aiVideoTemplates,
            } as MessageCatalog);
            publish();
        });
    }
    // Languages without a catalog render the English fallback.
    return loadCatalog(Object.hasOwn(loaders, locale) ? (locale as LoadableLocale) : "en-US");
}

export function interpolateMessage(template: string, values: MessageValues = {}) {
    return template.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g, (placeholder, key: string) => {
        if (!Object.hasOwn(values, key)) return placeholder;
        // A replacement callback keeps user strings such as "$&" literal.
        return String(values[key]);
    });
}

export function translateMessage(locale: AppLocale, key: MessageKey, values?: MessageValues) {
    // A catalog still loading during a language switch keeps showing the
    // English fallback, or the previously loaded Chinese copy, never a blank.
    return interpolateMessage(catalogs.get(locale)?.[key] ?? publicCatalogs.get(locale)?.[key] ?? catalogs.get("en-US")?.[key] ?? catalogs.get("zh-CN")?.[key] ?? key, values);
}
