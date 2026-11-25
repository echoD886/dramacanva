import { useMemo, useState } from "react";
import { Input, Popover } from "antd";
import { LayoutTemplate, Search, WandSparkles } from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";

import { canvasThemes } from "@/lib/canvas-theme";
import { canvasBuiltinPresets, type CanvasPromptPreset } from "@/lib/prompts";
import {
    communityImageCases,
    communityImageCategories,
    communityImageCategoryName,
    communityImageCasePrompt,
    communityImageTemplates,
    communityImageTemplateName,
    communityImageTemplatePrompt,
    findCommunityImageCases,
    recommendedCommunityImageTemplates,
} from "@/lib/prompts/community-image-catalog";
import { useActiveTheme } from "@/stores/canvas/use-canvas-theme-store";
import type { CanvasGenerationMode } from "@/types/canvas";
import type { CanvasResourceReference } from "@/lib/canvas/canvas-resource-references";

export type { CanvasPromptPreset };

const imageCatalogLabels = {
    "zh-CN": { catalog: "图片创作资料", templates: "制作模板", cases: "灵感案例", searchCases: "搜索案例、风格或标签", categories: "案例分类", all: "全部", suggested: "匹配当前描述的案例", more: "加载更多" },
    "zh-HK": { catalog: "圖片創作資料", templates: "製作模板", cases: "靈感案例", searchCases: "搜尋案例、風格或標籤", categories: "案例分類", all: "全部", suggested: "配合目前描述的案例", more: "載入更多" },
    "zh-TW": { catalog: "圖片創作資料", templates: "製作範本", cases: "靈感案例", searchCases: "搜尋案例、風格或標籤", categories: "案例分類", all: "全部", suggested: "符合目前描述的案例", more: "載入更多" },
    "en-US": { catalog: "Image creation library", templates: "Workflows", cases: "Inspiration cases", searchCases: "Search cases, styles or tags", categories: "Case categories", all: "All", suggested: "Matches your current prompt", more: "Load more" },
    "ja-JP": { catalog: "画像制作ライブラリ", templates: "制作テンプレート", cases: "参考事例", searchCases: "事例・スタイル・タグを検索", categories: "事例カテゴリ", all: "すべて", suggested: "現在の説明に合う事例", more: "もっと見る" },
    "ko-KR": { catalog: "이미지 제작 자료", templates: "제작 템플릿", cases: "영감 사례", searchCases: "사례, 스타일 또는 태그 검색", categories: "사례 분류", all: "전체", suggested: "현재 설명과 일치하는 사례", more: "더 보기" },
    "es-ES": {
        catalog: "Biblioteca de imágenes",
        templates: "Plantillas",
        cases: "Casos de inspiración",
        searchCases: "Buscar casos, estilos o etiquetas",
        categories: "Categorías",
        all: "Todos",
        suggested: "Casos relacionados con tu descripción",
        more: "Cargar más",
    },
    "pt-BR": {
        catalog: "Biblioteca de imagens",
        templates: "Modelos",
        cases: "Casos de inspiração",
        searchCases: "Buscar casos, estilos ou etiquetas",
        categories: "Categorias",
        all: "Todos",
        suggested: "Casos relacionados à sua descrição",
        more: "Carregar mais",
    },
} as const;

function imageCatalogCopy(locale: string): (typeof imageCatalogLabels)["en-US"] | (typeof imageCatalogLabels)[keyof typeof imageCatalogLabels] {
    return imageCatalogLabels[locale as keyof typeof imageCatalogLabels] || imageCatalogLabels["en-US"];
}

export function CanvasPresetPicker({
    mode,
    skillReferences = [],
    open,
    onOpenChange,
    onSelect,
    compact = false,
    dense = false,
    appearance = "default",
    triggerLabel,
    currentPrompt = "",
}: {
    mode: CanvasGenerationMode;
    skillReferences?: CanvasResourceReference[];
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onSelect: (preset: CanvasPromptPreset) => void;
    compact?: boolean;
    dense?: boolean;
    appearance?: "default" | "quiet";
    triggerLabel?: string;
    currentPrompt?: string;
}) {
    const { t, locale, number } = useI18n();
    const theme = canvasThemes[useActiveTheme()];
    const [internalOpen, setInternalOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [view, setView] = useState<"templates" | "cases">("templates");
    const [category, setCategory] = useState("");
    const [caseLimit, setCaseLimit] = useState(30);
    const copy = imageCatalogCopy(locale);
    const actualOpen = open ?? internalOpen;
    const setOpen = (next: boolean) => {
        if (!next) {
            setQuery("");
            setView("templates");
            setCategory("");
            setCaseLimit(30);
        }
        setInternalOpen(next);
        onOpenChange?.(next);
    };
    const presets = useMemo(() => {
        if (!actualOpen) return [];
        const skills = skillReferences.flatMap((reference): CanvasPromptPreset[] => {
            if (!reference.skill) return [];
            return [
                {
                    id: `skill:${reference.skill.skillId}`,
                    name: reference.skill.skillName,
                    description: reference.skill.description || reference.skill.instruction || t("canvasExtra.presetPicker.addedSkill"),
                    prompt: `@${reference.skill.skillName} `,
                    modes: ["text", "image", "video", "audio"],
                    source: "skill",
                },
            ];
        });
        const normalized = query.trim().toLowerCase();
        const community =
            mode === "image"
                ? communityImageTemplates.map((item): CanvasPromptPreset => ({
                      id: `community-template:${item.id}`,
                      name: communityImageTemplateName(item, locale),
                      description: locale.startsWith("zh") ? item.use : `${item.categoryEn} · ${item.styles.join(", ")}`,
                      prompt: communityImageTemplatePrompt(item, locale),
                      modes: ["image"],
                      source: "builtin",
                  }))
                : [];
        const recommendations = new Set(recommendedCommunityImageTemplates(currentPrompt).map((item) => `community-template:${item.id}`));
        return [...canvasBuiltinPresets(t).filter((preset) => preset.modes.includes(mode)), ...community, ...skills]
            .filter((preset) => !normalized || `${preset.name} ${preset.description}`.toLowerCase().includes(normalized))
            .sort((a, b) => Number(recommendations.has(b.id)) - Number(recommendations.has(a.id)));
    }, [actualOpen, mode, query, skillReferences, t, locale, currentPrompt]);
    const cases = useMemo(() => actualOpen && mode === "image" ? findCommunityImageCases(query, category, caseLimit) : [], [actualOpen, mode, query, category, caseLimit]);
    const suggestedCases = useMemo(() => (actualOpen && mode === "image" && !query.trim() && currentPrompt.trim() ? findCommunityImageCases(currentPrompt, category, 3) : []), [actualOpen, mode, query, currentPrompt, category]);
    const suggestedCaseIds = new Set(suggestedCases.map((item) => item.id));
    function selectCase(item: (typeof communityImageCases)[number]) {
        onSelect({ id: `community-case:${item.id}`, name: item.title, description: communityImageCategoryName(item.category, locale), prompt: communityImageCasePrompt(item, locale), modes: ["image"], source: "builtin" });
        setOpen(false);
    }

    const content = actualOpen && (
        <div data-canvas-no-zoom className="canvas-preset-picker-menu w-[var(--panel-width-compact)] max-w-[calc(100vw-24px)]" onMouseDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
            {mode === "image" ? (
                <div className="mb-1 flex gap-1" role="tablist" aria-label={copy.catalog}>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={view === "templates"}
                        className={`rounded-md px-2 py-1 text-xs ${view === "templates" ? "font-semibold" : "opacity-60"}`}
                        onClick={() => {
                            setView("templates");
                            setQuery("");
                        }}
                    >
                        {copy.templates} ({number(communityImageTemplates.length)})
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={view === "cases"}
                        className={`rounded-md px-2 py-1 text-xs ${view === "cases" ? "font-semibold" : "opacity-60"}`}
                        onClick={() => {
                            setView("cases");
                            setQuery("");
                        }}
                    >
                        {copy.cases} ({number(communityImageCases.length)})
                    </button>
                </div>
            ) : null}
            <Input
                className="canvas-preset-picker-search"
                variant="borderless"
                autoFocus
                allowClear
                size="small"
                prefix={<Search className="size-3.5" />}
                placeholder={view === "cases" ? copy.searchCases : t("canvasExtra.presetPicker.search")}
                value={query}
                onChange={(event) => {
                    setQuery(event.target.value);
                    setCaseLimit(30);
                }}
            />
            {mode === "image" && view === "cases" ? (
                <div className="thin-scrollbar mt-1 flex gap-1 overflow-x-auto pb-1" aria-label={copy.categories}>
                    <button
                        type="button"
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[var(--fs-tiny)] ${!category ? "font-semibold" : "opacity-60"}`}
                        onClick={() => {
                            setCategory("");
                            setCaseLimit(30);
                        }}
                    >
                        {copy.all}
                    </button>
                    {communityImageCategories.map((item) => (
                        <button
                            key={item}
                            type="button"
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[var(--fs-tiny)] ${category === item ? "font-semibold" : "opacity-60"}`}
                            onClick={() => {
                                setCategory(item);
                                setCaseLimit(30);
                            }}
                        >
                            {communityImageCategoryName(item, locale)}
                        </button>
                    ))}
                </div>
            ) : null}
            <div className="thin-scrollbar mt-1 max-h-72 space-y-0.5 overflow-y-auto">
                {view === "cases" && mode === "image" ? (
                    <>
                        {suggestedCases.length ? (
                            <div className="px-2 py-1 text-[var(--fs-tiny)]" style={{ color: theme.node.muted }}>
                                {copy.suggested}
                            </div>
                        ) : null}
                        {suggestedCases.map((item) => (
                            <button key={`suggested-${item.id}`} type="button" className="canvas-preset-picker-option" onClick={() => selectCase(item)}>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-xs font-semibold" style={{ color: theme.node.text }}>
                                        {item.title}
                                    </span>
                                    <span className="mt-0.5 block truncate text-[var(--fs-tiny)]" style={{ color: theme.node.muted }}>
                                        {communityImageCategoryName(item.category, locale)} · {item.styles.join(" · ")}
                                    </span>
                                </span>
                            </button>
                        ))}
                        {suggestedCases.length ? (
                            <div className="px-2 py-1 text-[var(--fs-tiny)]" style={{ color: theme.node.muted }}>
                                {copy.all} ({number(communityImageCases.length)})
                            </div>
                        ) : null}
                        {cases
                            .filter((item) => !suggestedCaseIds.has(item.id))
                            .map((item) => (
                                <button key={item.id} type="button" className="canvas-preset-picker-option" onClick={() => selectCase(item)}>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-xs font-semibold" style={{ color: theme.node.text }}>
                                            {item.title}
                                        </span>
                                        <span className="mt-0.5 block truncate text-[var(--fs-tiny)]" style={{ color: theme.node.muted }}>
                                            {communityImageCategoryName(item.category, locale)} · {item.styles.join(" · ")}
                                        </span>
                                    </span>
                                </button>
                            ))}
                        {!cases.length ? (
                            <div className="py-8 text-center text-xs" style={{ color: theme.node.muted }}>
                                {t("canvasExtra.presetPicker.noMatches")}
                            </div>
                        ) : null}
                        {cases.length === caseLimit ? (
                            <button type="button" className="w-full py-2 text-center text-xs" onClick={() => setCaseLimit((value) => value + 30)}>
                                {copy.more}
                            </button>
                        ) : null}
                    </>
                ) : presets.length ? (
                    presets.map((preset) => (
                        <button
                            key={preset.id}
                            type="button"
                            className="canvas-preset-picker-option"
                            onClick={() => {
                                onSelect(preset);
                                setOpen(false);
                            }}
                        >
                            <span className="canvas-preset-picker-option-icon" style={{ background: theme.accent.primarySoft, color: theme.accent.primary }}>
                                <WandSparkles className="size-3.5" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: theme.node.text }}>
                                    <span className="truncate">{preset.name}</span>
                                    <span className="shrink-0 text-[var(--fs-micro)] font-medium" style={{ color: theme.accent.primary }}>
                                        {preset.source === "skill" ? t("canvasExtra.presetPicker.skill") : t("canvasExtra.presetPicker.preset")}
                                    </span>
                                </span>
                                <span className="mt-0.5 block truncate text-[var(--fs-tiny)] leading-4" style={{ color: theme.node.muted }}>
                                    {preset.description}
                                </span>
                            </span>
                        </button>
                    ))
                ) : (
                    <div className="py-8 text-center text-xs" style={{ color: theme.node.muted }}>
                        {t("canvasExtra.presetPicker.noMatches")}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <Popover
            open={actualOpen}
            onOpenChange={setOpen}
            trigger="click"
            placement="topLeft"
            arrow={false}
            content={content}
            classNames={{ root: "canvas-preset-picker-popover", container: "canvas-composer-popover-surface", content: "canvas-composer-popover-content" }}
        >
            <button
                type="button"
                className={`canvas-preset-picker-trigger ${appearance === "quiet" ? "canvas-node-composer-header-action" : ""} inline-flex shrink-0 items-center justify-center gap-1 rounded-lg transition focus-visible:outline-none ${compact ? "size-6" : dense ? "h-6 px-1.5" : "h-7 px-2"}`}
                style={appearance === "quiet" ? undefined : { background: theme.accent.primarySoft, color: theme.accent.primary }}
                title={triggerLabel || (appearance === "quiet" ? t("canvasExtra.presetPicker.promptTemplate") : t("canvasExtra.presetPicker.openPresets"))}
                aria-label={triggerLabel || (appearance === "quiet" ? t("canvasExtra.presetPicker.promptTemplate") : t("canvasExtra.presetPicker.openPresets"))}
                aria-expanded={actualOpen}
            >
                {appearance === "quiet" ? <LayoutTemplate className="size-3" /> : <WandSparkles className={dense ? "size-3" : "size-3.5"} />}
                {compact ? null : <span className="text-[var(--fs-tiny)] font-medium">{triggerLabel || (appearance === "quiet" ? t("canvasExtra.presetPicker.promptTemplate") : t("canvasExtra.presetPicker.preset"))}</span>}
            </button>
        </Popover>
    );
}
