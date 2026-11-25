import { reviewText, useReviewLocale } from "@/i18n/drama-messages";
import { useMemo, useState } from "react";
import { Check, Flame, Search, X } from "lucide-react";

import { DRAMA_STYLE_CATEGORIES, DRAMA_STYLES, filterDramaStyles, styleCoverBackground, type DramaStyleCategory } from "@/lib/drama/drama-styles";

type CategoryKey = "all" | "hot" | DramaStyleCategory;

/** 短剧风格库：分类 + 搜索 + 封面卡片；选中项在标题栏回显，避免滚动后找不到当前选择。 */
export function DramaStylePicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
    const locale = useReviewLocale();
    const [category, setCategory] = useState<CategoryKey>("hot");
    const [query, setQuery] = useState("");
    const styles = useMemo(() => {
        const keyword = query.trim().toLocaleLowerCase(locale);
        return filterDramaStyles(query ? "all" : category, "").filter(
            (style) => !keyword || [style.name, style.description, ...style.tags].some((text) => text.toLocaleLowerCase(locale).includes(keyword) || reviewText(text).toLocaleLowerCase(locale).includes(keyword)),
        );
    }, [category, query, locale]);
    const selected = DRAMA_STYLES.find((style) => style.id === value);
    const counts = useMemo(() => Object.fromEntries(DRAMA_STYLE_CATEGORIES.map((item) => [item.key, filterDramaStyles(item.key, "").length])), []);
    return (
        <section className="drama-styles">
            <div className="drama-styles-head">
                <div className="min-w-0">
                    <h2>{reviewText("视觉风格")}</h2>
                    <p>
                        {selected ? (
                            <>
                                {reviewText("已选")} <b>{reviewText(selected.name)}</b> · {reviewText(selected.description)}
                            </>
                        ) : (
                            reviewText("决定全剧角色、场景和镜头的统一画风")
                        )}
                    </p>
                </div>
                <label className="drama-search drama-styles-search">
                    <Search className="size-3.5 shrink-0 opacity-40" />
                    <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={reviewText("搜索题材，如 霸总、仙侠")} aria-label={reviewText("搜索风格")} />
                    {query ? (
                        <button type="button" onClick={() => setQuery("")} aria-label={reviewText("清空搜索")}>
                            <X className="size-3.5 opacity-40" />
                        </button>
                    ) : null}
                </label>
            </div>
            <div className="drama-styles-tabs" role="tablist" aria-label={reviewText("风格分类")}>
                {DRAMA_STYLE_CATEGORIES.map((item) => (
                    <button
                        key={item.key}
                        type="button"
                        role="tab"
                        aria-selected={!query && category === item.key}
                        className="drama-styles-tab"
                        onClick={() => {
                            setQuery("");
                            setCategory(item.key);
                        }}
                    >
                        {item.key === "hot" ? <Flame className="size-3.5" /> : null}
                        {item.label}
                        <span>{counts[item.key]}</span>
                    </button>
                ))}
            </div>
            <div className="drama-style-grid thin-scrollbar" role="radiogroup" aria-label={reviewText("视觉风格")}>
                {styles.map((style) => {
                    const active = style.id === value;
                    return (
                        <button key={style.id} type="button" role="radio" aria-checked={active} className="drama-style" onClick={() => onChange(style.id)} title={reviewText(style.description)}>
                            <span className="drama-style-swatch" style={{ background: styleCoverBackground(style) }}>
                                {!style.cover ? (
                                    <span className="drama-style-glyph" aria-hidden>
                                        {reviewText(style.name)
                                            .replace(/^3D\s*/, "")
                                            .slice(0, 2)}
                                    </span>
                                ) : null}
                                {style.hot ? (
                                    <span className="drama-style-hot" title={reviewText("爆款")}>
                                        <Flame className="size-2.5" />
                                    </span>
                                ) : null}
                                {active ? (
                                    <span className="drama-style-check">
                                        <Check className="size-3" />
                                    </span>
                                ) : null}
                                <span className="drama-style-overlay">
                                    <span className="drama-style-name">{reviewText(style.name)}</span>
                                    <span className="drama-style-tags">{style.tags.map((tag) => reviewText(tag)).join(" · ")}</span>
                                </span>
                            </span>
                        </button>
                    );
                })}
                {!styles.length ? (
                    <div className="col-span-full py-10 text-center text-[var(--fs-label)] text-foreground/45">
                        {reviewText("没有找到“")}
                        {query}
                        {reviewText("”相关的风格")}
                    </div>
                ) : null}
            </div>
        </section>
    );
}
