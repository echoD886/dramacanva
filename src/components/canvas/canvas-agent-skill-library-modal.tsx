import { currentLocaleText as upstreamText } from "@/i18n/current-locale-text";
import { useI18n as upstreamUseI18n } from "@/i18n/use-i18n";
import { curationRootLabel, matchesCuration } from "@/components/skills/skill-curation-browser";
import type { SkillCuration } from "@/services/api/skill-curation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Input } from "antd";
import { Check, LibraryBig, LoaderCircle, Plus, Search, Sparkles, Users } from "lucide-react";

import { AppModal } from "@/components/ui/product/app-modal";
import { useI18n } from "@/i18n/use-i18n";
import { skillCategoryLabel } from "@/pages/skills/skill-catalog";
import { skillCoverByID, skillListingText } from "@/pages/skills/skill-purpose";
import type { CanvasTheme } from "@/lib/canvas-theme";
import { initialAgentSkillLibraryTab } from "@/lib/canvas/agent-skill-library";
import type { Skill, SkillCategory } from "@/services/api/skills";

type SkillLibraryTab = "enabled" | "installed" | "market";

type CanvasAgentSkillLibraryModalProps = {
    curation: SkillCuration | null;
    open: boolean;
    theme: CanvasTheme;
    installedSkills: Skill[];
    marketSkills: Skill[];
    selectedSkillIds: string[];
    categories: SkillCategory[];
    category: string;
    search: string;
    loading: boolean;
    hasMore: boolean;
    onClose: () => void;
    onCategoryChange: (value: string) => void;
    onSearch: (value: string) => void;
    onToggle: (skillId: string) => void;
    onInstall: (skill: Skill) => Promise<void>;
    onLoadMore: () => Promise<void>;
};

export function CanvasAgentSkillLibraryModal({
    curation,
    open,
    theme,
    installedSkills,
    marketSkills,
    selectedSkillIds,
    categories,
    category,
    search,
    loading,
    hasMore,
    onClose,
    onCategoryChange,
    onSearch,
    onToggle,
    onInstall,
    onLoadMore,
}: CanvasAgentSkillLibraryModalProps) {
    upstreamUseI18n();
    const [tab, setTab] = useState<SkillLibraryTab>("enabled");
    const { t, locale } = useI18n();
    const listRef = useRef<HTMLDivElement>(null);
    const loadMoreRef = useRef<HTMLDivElement>(null);
    const wasOpenRef = useRef(false);
    const selectedCount = selectedSkillIds.length;

    useEffect(() => {
        if (open && !wasOpenRef.current) setTab(initialAgentSkillLibraryTab(selectedCount, installedSkills.length));
        wasOpenRef.current = open;
    }, [open, selectedCount, installedSkills.length]);

    const visibleSkills = useMemo(() => {
        const keyword = search.trim().toLocaleLowerCase(locale);
        const source = tab === "enabled" ? installedSkills.filter((skill) => selectedSkillIds.includes(skill.skillId)) : tab === "installed" ? installedSkills : marketSkills;

        return source.filter((skill) => {
            if (curation?.enabled ? !matchesCuration(skill, curation, category === "all" ? "" : category) : category !== "all" && skill.tag !== category) return false;
            if (!keyword) return true;
            const listing = skillListingText(skill, t);
            return `${listing.name} ${listing.description || ""} ${skill.skillName} ${skill.description || ""} ${skill.effectiveUser?.name || ""}`.toLocaleLowerCase(locale).includes(keyword);
        });
    }, [curation, category, installedSkills, locale, marketSkills, search, selectedSkillIds, t, tab]);

    useEffect(() => {
        const target = loadMoreRef.current;
        if (tab !== "market" || !target || !hasMore || loading || typeof IntersectionObserver === "undefined") return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) void onLoadMore();
            },
            { root: listRef.current, rootMargin: "180px 0px" },
        );
        observer.observe(target);
        return () => observer.disconnect();
    }, [hasMore, loading, onLoadMore, tab, visibleSkills.length]);

    const categoryItems = useMemo(() => {
        if (curation?.enabled)
            return [
                { value: "all", label: t("canvasAgentSkillLibrary.category.all") },
                ...(curation.roots || []).map((root) => ({ value: `root:${root.id}`, label: curationRootLabel(root) })),
                ...curation.categories.map((item) => ({ value: item.id, label: item.name })),
                { value: "__uncategorized__", label: upstreamText("upstream.v165.message001") },
            ];
        const unique = new Map<string, SkillCategory>();
        categories.forEach((item) => {
            if (item.value && item.label) unique.set(item.value, item);
        });
        return [{ value: "all", label: t("canvasAgentSkillLibrary.category.all") }, ...Array.from(unique.values(), (item) => ({ ...item, label: skillCategoryLabel(item.value, categories, t) }))];
    }, [curation, categories, t]);

    const emptyText = tab === "enabled" ? t("canvasAgentSkillLibrary.empty.enabled") : tab === "installed" ? t("canvasAgentSkillLibrary.empty.installed") : t("canvasAgentSkillLibrary.empty.market");

    return (
        <AppModal rootClassName="canvas-agent-skill-library-modal" open={open} title={null} footer={null} centered width="min(1180px, calc(100vw - 24px))" onCancel={onClose} flush>
            <section className="canvas-agent-skill-library-shell" style={{ color: theme.node.text, background: theme.node.panel }} data-canvas-no-zoom data-canvas-wheel-scroll aria-label={t("canvasAgentSkillLibrary.libraryAria")}>
                <header className="canvas-agent-skill-library-header">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 text-lg font-semibold">
                            <LibraryBig className="size-5" aria-hidden="true" />
                            {t("canvasAgentSkillLibrary.title")}
                        </div>
                        <p className="mt-1 text-xs" style={{ color: theme.node.muted }}>
                            {t("canvasAgentSkillLibrary.intro", { limit: 8 })}
                        </p>
                    </div>
                    <div className="canvas-agent-skill-library-count" style={{ color: theme.node.muted }}>
                        {t("canvasAgentSkillLibrary.enabledCount")} <strong style={{ color: selectedCount >= 8 ? "var(--destructive)" : theme.accent.primary }}>{selectedCount}</strong>/8
                    </div>
                </header>

                <div className="canvas-agent-skill-library-toolbar">
                    <div className="canvas-agent-skill-library-tabs" role="tablist" aria-label={t("canvasAgentSkillLibrary.tabsViewAria")}>
                        <SkillTab active={tab === "enabled"} label={t("canvasAgentSkillLibrary.tab.enabled")} count={selectedCount} onClick={() => setTab("enabled")} />
                        <SkillTab active={tab === "installed"} label={t("canvasAgentSkillLibrary.tab.installed")} count={installedSkills.length} onClick={() => setTab("installed")} />
                        <SkillTab active={tab === "market"} label={t("canvasAgentSkillLibrary.tab.market")} onClick={() => setTab("market")} />
                    </div>
                    <Input
                        allowClear
                        prefix={<Search className="size-4" style={{ color: theme.node.muted }} aria-hidden="true" />}
                        value={search}
                        onChange={(event) => onSearch(event.target.value)}
                        placeholder={t("canvasAgentSkillLibrary.searchPlaceholder")}
                        aria-label={t("canvasAgentSkillLibrary.searchAria")}
                        className="canvas-agent-skill-library-search"
                    />
                </div>

                <nav className="canvas-agent-skill-library-categories" aria-label={t("canvasAgentSkillLibrary.categoriesAria")}>
                    {categoryItems.map((item) => (
                        <button key={item.value} type="button" className={`canvas-agent-skill-category ${category === item.value ? "is-active" : ""}`} aria-pressed={category === item.value} onClick={() => onCategoryChange(item.value)}>
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div ref={listRef} className="canvas-agent-skill-library-list thin-scrollbar" role="tabpanel">
                    {visibleSkills.map((skill) => (
                        <SkillLibraryCard
                            key={skill.skillId}
                            skill={skill}
                            theme={theme}
                            categories={categories}
                            selected={selectedSkillIds.includes(skill.skillId)}
                            canSelect={selectedCount < 8 || selectedSkillIds.includes(skill.skillId)}
                            onToggle={() => onToggle(skill.skillId)}
                            onInstall={() => onInstall(skill)}
                        />
                    ))}
                    {loading && visibleSkills.length === 0 ? (
                        <div className="canvas-agent-skill-library-state" style={{ color: theme.node.muted }}>
                            <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                            {t("canvasAgentSkillLibrary.loading")}
                        </div>
                    ) : null}
                    {!loading && visibleSkills.length === 0 ? (
                        <div className="canvas-agent-skill-library-state" style={{ color: theme.node.muted }}>
                            <Sparkles className="size-6" aria-hidden="true" />
                            <span>{emptyText}</span>
                            {tab !== "market" ? (
                                <Button size="small" onClick={() => setTab("market")}>
                                    {t("canvasAgentSkillLibrary.browseMarket")}
                                </Button>
                            ) : null}
                        </div>
                    ) : null}
                    {tab === "market" && hasMore ? <div ref={loadMoreRef} className="col-span-full h-px" aria-hidden="true" /> : null}
                </div>

                <footer className="canvas-agent-skill-library-footer" style={{ color: theme.node.muted, borderColor: theme.node.stroke }}>
                    <span>
                        {tab === "enabled"
                            ? t("canvasAgentSkillLibrary.footer.enabled", { count: selectedCount })
                            : tab === "installed"
                              ? t("canvasAgentSkillLibrary.footer.installed", { count: visibleSkills.length })
                              : t("canvasAgentSkillLibrary.footer.market", { count: marketSkills.length })}
                    </span>
                    {tab === "market" && hasMore ? (
                        <Button size="small" disabled={loading} loading={loading} onClick={() => void onLoadMore()}>
                            {loading ? t("canvasAgentSkillLibrary.loadingMore") : t("canvasAgentSkillLibrary.loadMore")}
                        </Button>
                    ) : (
                        <span>{tab === "market" ? t("canvasAgentSkillLibrary.footer.marketDone") : t("canvasAgentSkillLibrary.footer.limit", { limit: 8 })}</span>
                    )}
                </footer>
            </section>
        </AppModal>
    );
}

function SkillTab({ active, label, count, onClick }: { active: boolean; label: string; count?: number; onClick: () => void }) {
    upstreamUseI18n();
    return (
        <button type="button" role="tab" aria-selected={active} className={`canvas-agent-skill-library-tab ${active ? "is-active" : ""}`} onClick={onClick}>
            {label}
            {typeof count === "number" ? <span>{count}</span> : null}
        </button>
    );
}

function SkillLibraryCard({
    skill,
    theme,
    categories,
    selected,
    canSelect,
    onToggle,
    onInstall,
}: {
    skill: Skill;
    theme: CanvasTheme;
    categories: SkillCategory[];
    selected: boolean;
    canSelect: boolean;
    onToggle: () => void;
    onInstall: () => Promise<void>;
}) {
    upstreamUseI18n();
    const [installing, setInstalling] = useState(false);
    const [coverFailed, setCoverFailed] = useState(false);
    const [fallbackFailed, setFallbackFailed] = useState(false);
    const { t } = useI18n();
    const coverUrl = skillCoverByID[skill.skillId] || skill.showcaseMedia?.find((item) => item.type === "image" && item.showcaseUrl)?.showcaseUrl;
    const fallbackCover =
        (
            {
                drama: "/images/skills/skill-cover-drama.jpg",
                screenplay: "/images/skills/skill-cover-script.jpg",
                storyboard: "/images/skills/skill-cover-storyboard.jpg",
                video: "/images/skills/skill-cover-cinematic.jpg",
                ecommerce: "/images/skills/skill-cover-commercial.jpg",
                creative: "/images/skills/skill-cover-motion.jpg",
                social: "/images/skills/skill-cover-social.jpg",
                others: "/images/skills/skill-cover-research.jpg",
            } as Record<string, string>
        )[skill.tag] || "/images/skills/skill-cover-research.jpg";
    const displayedCover = coverUrl && !coverFailed ? coverUrl : fallbackCover;
    const categoryLabel = skillCategoryLabel(skill.tag, categories, t);
    const listing = skillListingText(skill, t);
    const author = skill.effectiveUser?.name || t("canvasAgentSkillLibrary.authorFallback");
    const addedCount = formatSkillCount(skill.addedCount || 0);

    useEffect(() => {
        setCoverFailed(false);
        setFallbackFailed(false);
    }, [coverUrl, fallbackCover]);

    const install = async () => {
        if (installing) return;
        setInstalling(true);
        try {
            await onInstall();
        } finally {
            setInstalling(false);
        }
    };

    return (
        <article className={`canvas-agent-skill-card ${selected ? "is-selected" : ""}`} style={{ borderColor: selected ? theme.accent.primary : theme.node.stroke }}>
            <div className="canvas-agent-skill-card-cover" style={{ background: theme.node.fill }}>
                {!fallbackFailed ? (
                    <img src={displayedCover} alt="" loading="lazy" onError={() => (coverUrl && !coverFailed ? setCoverFailed(true) : setFallbackFailed(true))} />
                ) : (
                    <div className="canvas-agent-skill-card-placeholder" aria-hidden="true">
                        <Sparkles className="size-7" />
                    </div>
                )}
                <span className="canvas-agent-skill-card-category">{categoryLabel}</span>
            </div>
            <div className="canvas-agent-skill-card-body">
                <div className="canvas-agent-skill-card-title-row">
                    <h3 title={listing.name}>{listing.name}</h3>
                    {skill.version ? <span className="canvas-agent-skill-card-version">v{skill.version}</span> : null}
                </div>
                <p title={listing.description || t("canvasAgentSkillLibrary.noDescription")}>{listing.description || t("canvasAgentSkillLibrary.noDescription")}</p>
                <div className="canvas-agent-skill-card-meta" style={{ color: theme.node.muted }}>
                    <span className="min-w-0 truncate">{author}</span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex shrink-0 items-center gap-1">
                        <Users className="size-3.5" aria-hidden="true" />
                        {addedCount}
                    </span>
                </div>
            </div>
            <div className="canvas-agent-skill-card-action">
                {skill.isAdded ? (
                    <Button
                        size="small"
                        type="default"
                        className={selected ? "is-selected" : ""}
                        icon={selected ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
                        disabled={!canSelect}
                        aria-pressed={selected}
                        title={!canSelect ? t("canvasAgentSkillLibrary.limitTitle", { limit: 8 }) : undefined}
                        onClick={onToggle}
                    >
                        {selected ? t("canvasAgentSkillLibrary.action.enabled") : t("canvasAgentSkillLibrary.action.enable")}
                    </Button>
                ) : (
                    <Button size="small" icon={<Plus className="size-3.5" />} loading={installing} disabled={installing} onClick={() => void install()}>
                        {t("canvasAgentSkillLibrary.action.install")}
                    </Button>
                )}
            </div>
        </article>
    );
}

function formatSkillCount(value: number) {
    return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}
