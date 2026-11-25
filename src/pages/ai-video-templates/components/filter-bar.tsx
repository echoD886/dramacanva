import { memo, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ChevronDown, Search, X } from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";
import { localizedPublicPath } from "@/i18n/locale-routing";
import { CATEGORIES, categoryPath } from "./categories";

export type TemplateSort = "hot" | "new" | "plays";

export type TemplatePeriod = "all" | "today" | "week" | "month";

type FilterBarProps = {
    period: TemplatePeriod;
    onPeriodChange: (period: TemplatePeriod) => void;
    activeCategory: string;
    sort: TemplateSort;
    onSortChange: (sort: TemplateSort) => void;
};

const SORTS: { id: TemplateSort; key: "aiVideoTemplates.sortHot" | "aiVideoTemplates.sortNew" | "aiVideoTemplates.sortPlays" }[] = [
    { id: "hot", key: "aiVideoTemplates.sortHot" },
    { id: "new", key: "aiVideoTemplates.sortNew" },
    { id: "plays", key: "aiVideoTemplates.sortPlays" },
];

/** Centered search pill (header). Debounced; empty string clears. */
export const SearchField = memo(function SearchField({ searchQuery, onSearchChange }: { searchQuery: string; onSearchChange: (query: string) => void }) {
    const { t } = useI18n();
    const [value, setValue] = useState(searchQuery);
    const [focused, setFocused] = useState(false);
    useEffect(() => setValue(searchQuery), [searchQuery]);
    useEffect(() => {
        const handle = setTimeout(() => onSearchChange(value.trim()), 220);
        return () => clearTimeout(handle);
    }, [value, onSearchChange]);
    return (
        <div
            className="aivt-search"
            onFocus={() => setFocused(true)}
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
            }}
        >
            <Search aria-hidden="true" />
            <input type="search" value={value} onChange={(e) => setValue(e.target.value)} placeholder={t("aiVideoTemplates.searchPlaceholder")} aria-label={t("aiVideoTemplates.searchPlaceholder")} enterKeyHint="search" />
            {value && (
                <button type="button" className="aivt-search-clear" onClick={() => setValue("")} aria-label={t("aiVideoTemplates.clearSearch")}>
                    <X aria-hidden="true" />
                </button>
            )}
            {focused && !value && (
                <div className="aivt-search-suggestions">
                    {CATEGORIES.filter((category) => category.id !== "all")
                        .slice(0, 6)
                        .map((category) => (
                            <button
                                key={category.id}
                                type="button"
                                onClick={() => {
                                    setValue(t(category.key));
                                    setFocused(false);
                                }}
                            >
                                {t(category.key)}
                            </button>
                        ))}
                </div>
            )}
        </div>
    );
});

export const FilterBar = memo(function FilterBar({ activeCategory, sort, onSortChange, period, onPeriodChange }: FilterBarProps) {
    const { t, locale } = useI18n();
    const activeRef = useRef<HTMLAnchorElement>(null);
    const [indicator, setIndicator] = useState({ left: 0, width: 0 });
    useEffect(() => {
        const pill = activeRef.current;
        const track = pill?.parentElement;
        if (!pill || !track) return;
        const update = () => setIndicator({ left: pill.offsetLeft, width: pill.offsetWidth });
        update();
        const observer = new ResizeObserver(update);
        observer.observe(track);
        observer.observe(pill);
        return () => observer.disconnect();
    }, [activeCategory, locale]);

    // Keep the active category pill in view inside the horizontally scrolling track (without moving the page).
    useEffect(() => {
        const pill = activeRef.current;
        const track = pill?.parentElement;
        if (!pill || !track) return;
        const left = pill.offsetLeft - (track.clientWidth - pill.offsetWidth) / 2;
        track.scrollTo({ left: Math.max(0, left) });
    }, [activeCategory]);

    return (
        <div className="aivt-filterbar" data-aivt-sticky>
            <nav className="aivt-pills" aria-label={t("aiVideoTemplates.categoriesLabel")} data-aivt-hscroll>
                <span className="aivt-pill-indicator" aria-hidden="true" style={{ width: indicator.width, transform: `translateX(${indicator.left}px)` }} />
                {CATEGORIES.map((cat) => {
                    const active = activeCategory === cat.id;
                    return (
                        <Link
                            key={cat.id}
                            ref={active ? activeRef : undefined}
                            to={localizedPublicPath(categoryPath(cat.id), locale as "en-US") + (period === "all" ? "" : `?period=${period}`)}
                            className={`aivt-pill${active ? " is-active" : ""}`}
                            aria-current={active ? "page" : undefined}
                        >
                            {t(cat.key)}
                        </Link>
                    );
                })}
            </nav>
            <div className="aivt-filter-controls">
                <label className="aivt-sort">
                    <span className="sr-only">{t("aiVideoTemplates.periodLabel")}</span>
                    <select value={period} onChange={(e) => onPeriodChange(e.target.value as TemplatePeriod)}>
                        <option value="all">{t("aiVideoTemplates.periodAll")}</option>
                        <option value="today">{t("aiVideoTemplates.periodToday")}</option>
                        <option value="week">{t("aiVideoTemplates.periodWeek")}</option>
                        <option value="month">{t("aiVideoTemplates.periodMonth")}</option>
                    </select>
                    <ChevronDown aria-hidden="true" />
                </label>
                <label className="aivt-sort">
                    <span className="sr-only">{t("aiVideoTemplates.sortLabel")}</span>
                    <select value={sort} onChange={(e) => onSortChange(e.target.value as TemplateSort)}>
                        {SORTS.map((option) => (
                            <option key={option.id} value={option.id}>
                                {t(option.key)}
                            </option>
                        ))}
                    </select>
                    <ChevronDown aria-hidden="true" />
                </label>
            </div>
        </div>
    );
});
