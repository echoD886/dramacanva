import { useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ArrowRight, Clapperboard, ImagePlus, Search, ShoppingBag, Type, Video, Image as ImageIcon, X } from "lucide-react";
import { WorkspacePage } from "@/components/layout/workspace-page";
import { BackToTop, useFilterTransition, useScrollExperience } from "@/components/scroll/scroll-experience";
import { useI18n } from "@/i18n/use-i18n";
import { productionTraditionalText, useProductionText } from "@/i18n/production-tools";
import { productionToolName, productionToolRequiresMedia, type ProductionTool } from "./catalog";
import { TOOLBOX_GROUPS, toolboxGroup, toolboxPreset, toolboxTools, toolboxUseHref, type ToolboxGroupId, type ToolboxKind } from "./toolbox-groups";
import "@/pages/skills/skills-libtv.css";
import "./content-toolbox.css";

const GROUP_ICONS = { drama: Clapperboard, ecommerce: ShoppingBag } as const;

/** Public showcase of the production tools: browsing needs no account; "use" opens a prepared canvas. */
export default function ContentToolboxPage() {
    const { locale, number } = useI18n();
    const copy = useProductionText();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const groupId: ToolboxGroupId = searchParams.get("group") === "ecommerce" ? "ecommerce" : "drama";
    const [categoryId, setCategoryId] = useState("");
    const [kind, setKind] = useState<ToolboxKind>("all");
    const [query, setQuery] = useState("");
    const [preset, setPreset] = useState(() => toolboxPreset(searchParams.get("preset")));
    const group = toolboxGroup(groupId);
    const tools = useMemo(() => toolboxTools(groupId, { categoryId, kind, query, locale }), [groupId, categoryId, kind, query, locale]);
    const groupCounts = useMemo(() => Object.fromEntries(TOOLBOX_GROUPS.map((option) => [option.id, toolboxTools(option.id, { locale }).length])), [locale]);
    const sections = group.sections.map((section) => ({ ...section, tools: tools.filter((tool) => tool.categoryId === section.categoryId) })).filter((section) => section.tools.length);
    const filtered = Boolean(categoryId || kind !== "all" || query.trim());
    const page = useRef<HTMLDivElement>(null);
    const results = useRef<HTMLDivElement>(null);
    // A local fade avoids snapshotting the entire 56/62-card catalog on each tab.
    const transition = useFilterTransition(results, false);
    const showTop = useScrollExperience(page, `${locale}:${groupId}:${categoryId}:${kind}:${query}`);

    const selectGroup = (id: ToolboxGroupId) => transition(() => {
        setCategoryId("");
        setSearchParams((current) => {
            const next = new URLSearchParams(current);
            if (id === "drama") next.delete("group");
            else next.set("group", id);
            return next;
        }, { preventScrollReset: true });
    });
    const reset = () => transition(() => {
        setQuery("");
        setCategoryId("");
        setKind("all");
    });
    let cardIndex = 0;

    return (
        <WorkspacePage className="libtv-skills-page content-toolbox-page" fluid>
            <div className="ctb-shell" ref={page}>
                <header className="ctb-header">
                    <div className="ctb-heading">
                        <h1 id="content-toolbox-title">{copy(0)}</h1>
                        <p>{copy(56)}</p>
                    </div>
                    <label className="ctb-search">
                        <Search aria-hidden />
                        <input value={query} placeholder={copy(1)} aria-label={copy(1)} onChange={(event) => setQuery(event.target.value)} />
                        {query ? (
                            <button type="button" aria-label={copy(26)} onClick={() => setQuery("")}>
                                <X aria-hidden />
                            </button>
                        ) : null}
                    </label>
                </header>

                <div className="ctb-toolbar" data-scroll-toolbar>
                    <div className="ctb-toolbar-row">
                        <div className="ctb-groups" role="tablist" aria-label={copy(0)}>
                            {TOOLBOX_GROUPS.map((option) => {
                                const Icon = GROUP_ICONS[option.id];
                                const active = groupId === option.id;
                                return (
                                    <button
                                        key={option.id}
                                        id={`toolbox-tab-${option.id}`}
                                        type="button"
                                        role="tab"
                                        aria-selected={active}
                                        aria-controls="toolbox-panel"
                                        tabIndex={active ? 0 : -1}
                                        className={active ? "is-active" : undefined}
                                        onClick={() => selectGroup(option.id)}
                                        onKeyDown={(event) => {
                                            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                                            event.preventDefault();
                                            const next = event.key === "Home" ? "drama" : event.key === "End" ? "ecommerce" : option.id === "drama" ? "ecommerce" : "drama";
                                            selectGroup(next);
                                            document.getElementById(`toolbox-tab-${next}`)?.focus();
                                        }}
                                    >
                                        <Icon aria-hidden />
                                        <span>{copy(option.labelIndex)}</span>
                                        <em>{number(groupCounts[option.id] ?? 0)}</em>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="ctb-options">
                            <div className="ctb-segment" role="group" aria-label={copy(58)}>
                                {(["all", "image", "video"] as const).map((value, index) => (
                                    <button key={value} type="button" aria-pressed={kind === value} className={kind === value ? "is-active" : undefined} onClick={() => transition(() => setKind(value))}>
                                        {value === "image" ? <ImageIcon aria-hidden /> : value === "video" ? <Video aria-hidden /> : null}
                                        {copy(2 + index)}
                                    </button>
                                ))}
                            </div>
                            <div className="ctb-segment ctb-preset" role="radiogroup" aria-label={copy(53)}>
                                <span aria-hidden>{copy(53)}</span>
                                {[0, 1, 2].map((value) => (
                                    <button
                                        key={value}
                                        id={`toolbox-preset-${value}`}
                                        type="button"
                                        role="radio"
                                        aria-checked={preset === value}
                                        tabIndex={preset === value ? 0 : -1}
                                        className={preset === value ? "is-active" : undefined}
                                        onClick={() => setPreset(value)}
                                        onKeyDown={(event) => {
                                            if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
                                            event.preventDefault();
                                            const next = event.key === "Home" ? 0 : event.key === "End" ? 2 : (value + (event.key === "ArrowLeft" || event.key === "ArrowUp" ? 2 : 1)) % 3;
                                            setPreset(next);
                                            document.getElementById(`toolbox-preset-${next}`)?.focus();
                                        }}
                                    >
                                        {copy(7 + value)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="ctb-chips" role="group" aria-label={copy(group.labelIndex)}>
                        <button type="button" aria-pressed={!categoryId} className={!categoryId ? "is-active" : undefined} onClick={() => transition(() => setCategoryId(""))}>
                            {copy(2)}
                        </button>
                        {group.sections.map((section) => (
                            <button key={section.categoryId} type="button" aria-pressed={categoryId === section.categoryId} className={categoryId === section.categoryId ? "is-active" : undefined} onClick={() => transition(() => setCategoryId(section.categoryId))}>
                                {copy(section.labelIndex)}
                            </button>
                        ))}
                        <span className="ctb-count" role="status" aria-live="polite" aria-atomic="true">
                            {copy(57, { count: number(tools.length) })}
                        </span>
                    </div>
                </div>

                <div ref={results} id="toolbox-panel" role="tabpanel" aria-labelledby={`toolbox-tab-${groupId}`}>
                    {sections.length ? (
                        sections.map((section) => (
                            <section key={section.categoryId} className="ctb-section" aria-labelledby={`toolbox-${section.categoryId}`}>
                                {!categoryId ? (
                                    <h2 id={`toolbox-${section.categoryId}`}>
                                        {copy(section.labelIndex)}
                                        <span>{number(section.tools.length)}</span>
                                    </h2>
                                ) : (
                                    <h2 id={`toolbox-${section.categoryId}`} className="ctb-visually-hidden">
                                        {copy(section.labelIndex)}
                                    </h2>
                                )}
                                <div className="ctb-grid">
                                    {section.tools.map((tool) => (
                                        <ToolCard key={tool.key} tool={tool} index={cardIndex++} locale={locale} onUse={() => navigate(toolboxUseHref(tool, preset))} />
                                    ))}
                                </div>
                            </section>
                        ))
                    ) : (
                        <div className="ctb-empty">
                            <Search aria-hidden />
                            <h2>{copy(25)}</h2>
                            {filtered ? (
                                <button type="button" onClick={reset}>
                                    {copy(15)}
                                </button>
                            ) : null}
                        </div>
                    )}
                </div>
            </div>
            <BackToTop page={page} visible={showTop} />
        </WorkspacePage>
    );
}

function ToolCard({ tool, index, locale, onUse }: { tool: ProductionTool; index: number; locale: string; onUse: () => void }) {
    const copy = useProductionText();
    const name = productionToolName(tool, locale);
    const description = locale === "zh-CN" ? tool.focus : locale === "zh-HK" || locale === "zh-TW" ? productionTraditionalText(tool.focus, locale) : "";
    const needsMedia = productionToolRequiresMedia(tool);
    const KindIcon = tool.kind === "video" ? Video : ImageIcon;
    return (
        <article className="ctb-card" data-scroll-reveal={`tool:${tool.key}`}>
            <button type="button" className="ctb-card-hit" onClick={onUse} aria-label={`${copy(5)}: ${name}`}>
                <span className="ctb-cover">
                    <img src={`/images/production-tools/${tool.key}.jpg`} alt="" loading={index < 8 ? "eager" : "lazy"} decoding="async" width={768} height={512} />
                    <span className="ctb-kind">
                        <KindIcon aria-hidden />
                        {tool.kind === "video" ? copy(4) : copy(3)}
                    </span>
                    <span className="ctb-use" aria-hidden>
                        {copy(5)}
                        <ArrowRight />
                    </span>
                </span>
                <span className="ctb-body">
                    <span className="ctb-title" title={name}>
                        {name}
                    </span>
                    {description ? (
                        <span className="ctb-desc" title={description}>
                            {description}
                        </span>
                    ) : null}
                    <span className="ctb-meta">
                        {needsMedia ? <ImagePlus aria-hidden /> : <Type aria-hidden />}
                        {needsMedia ? copy(54) : copy(55)}
                    </span>
                </span>
            </button>
        </article>
    );
}
