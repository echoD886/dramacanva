import { PUBLIC_LOCALE_OPTIONS as options } from "./locale-options";
import { Globe2 } from "lucide-react";
import { Select } from "antd";
import { rememberLocaleChoice } from "./default-entry";
import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import { useLocation, useNavigate } from "react-router";
import { blogPath, parseBlogPath } from "../content/blog-locales";
import { setAppLocale, useAppLocale } from "./app-locale";
import { localeSelection } from "./locale-selection";
import { useI18n } from "./use-i18n";
import { type MessageLocale } from "./messages";

import "./locale-picker.css";
import { localizedPublicPath } from "./locale-routing";

const labels: Record<MessageLocale, string> = {
    "zh-CN": "界面语言",
    "zh-HK": "介面語言",
    "zh-TW": "介面語言",
    "en-US": "Interface language",
    "ja-JP": "表示言語",
    "ko-KR": "화면 언어",
    "es-ES": "Idioma de la interfaz",
    "pt-BR": "Idioma da interface",
};
export function useLocalePicker() {
    const location = useLocation();
    const navigate = useNavigate();
    const locale = useAppLocale();
    const currentRoute = useRef(location.key);
    currentRoute.current = location.key;
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);
    const state = useSyncExternalStore(localeSelection.subscribe, localeSelection.snapshot, localeSelection.serverSnapshot);
    function selectLocale(next: MessageLocale) {
        const routeKey = location.key;
        const blog = parseBlogPath(location.pathname);
        return localeSelection.select(
            next,
            () => mounted.current && currentRoute.current === routeKey,
            () => {
                setAppLocale(next);
                rememberLocaleChoice(next);
                const target = blog ? blogPath(next, blog.slug) : localizedPublicPath(location.pathname, next);
                void navigate(target + location.search + location.hash, { preventScrollReset: true });
            },
        );
    }
    return { locale, state, selectLocale };
}

export function LocalePicker({ compact = false }: { compact?: boolean }) {
    const { locale, state, selectLocale } = useLocalePicker();
    const { t } = useI18n();
    const id = useId();
    const label = labels[locale as MessageLocale] ?? labels["en-US"];
    return (
        <label className={compact ? "sa-topbar-language" : "inline-flex max-w-full items-center gap-2 text-xs"} htmlFor={id}>
            {compact ? <Globe2 aria-hidden="true" size={16} /> : null}
            <span className={compact ? "sr-only" : undefined}>{label}</span>
            <Select
                id={id}
                value={state.pending ?? locale}
                aria-busy={Boolean(state.pending)}
                aria-label={label}
                loading={Boolean(state.pending)}
                popupMatchSelectWidth={false}
                // Inside a full-screen overlay (e.g. the auth dialog) the popup must render in that layer, or it opens beneath it.
                getPopupContainer={(trigger: HTMLElement) => trigger.closest<HTMLElement>("[data-popup-container]") ?? document.body}
                styles={{ content: { opacity: 1, color: "var(--foreground)" }, popup: { root: { maxWidth: "calc(100vw - 24px)" } } }}
                options={[...(!options.some((option) => option.value === locale) ? [{ value: locale, label: locale, disabled: true }] : []), ...options]}
                className="min-h-8 max-w-full rounded-md border border-border bg-background px-2 text-foreground"
                onChange={(value) => {
                    const next = value as MessageLocale;
                    void selectLocale(next);
                }}
            />
            {state.pending ? (
                <span className="sr-only" role="status">
                    {t("miscPages.languageLoading")}
                </span>
            ) : null}
            {state.failed ? <span role="alert">{t("miscPages.languageFailed")}</span> : null}
        </label>
    );
}
