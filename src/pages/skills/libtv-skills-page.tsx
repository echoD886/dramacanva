import { currentLocaleText as upstreamText } from "@/i18n/current-locale-text";
import { useI18n as upstreamUseI18n } from "@/i18n/use-i18n";
import { useSkillCuration, SkillCurationBrowser, curationQuery } from "@/components/skills/skill-curation-browser";
import { App, Button, Dropdown, Tooltip } from "antd";
import { ArrowUp, Boxes, Check, ChevronLeft, ChevronRight, Clapperboard, ExternalLink, Heart, LoaderCircle, Megaphone, MoreHorizontal, Palette, Plus, Puzzle, Search, Sparkles, UserRound, WandSparkles, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useUserStore } from "@/stores/use-user-store";
import skillSlugs from "@/content/skill-pages/slugs.json";

import { useI18n } from "@/i18n/use-i18n";
import type { MessageKey } from "@/i18n/messages";

import { PaginationBar, WorkspacePage } from "@/components/layout/workspace-page";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { fallbackSkillCategories } from "@/pages/skills/skill-catalog";
import { SkillDetailModal } from "@/pages/skills/skill-detail-drawer";
import { SkillEditorDrawer } from "@/pages/skills/skill-editor-drawer";
import { SkillInstallModal } from "@/pages/skills/skill-install-modal";
import { describeSkill, skillCoverByID, skillListingText } from "@/pages/skills/skill-purpose";
import { buildSkillCanvasPrompt, saveSkillCanvasHandoff } from "@/lib/canvas/skill-handoff";
import { addSkill, deleteSkill, getSkill, likeSkill, listSkills, removeSkill, syncSkill, unlikeSkill, type Skill, type SkillCategory, type SkillScope, type SkillSort } from "@/services/api/skills";

import "./skills-libtv.css";

const scopeOptions: Array<{ labelKey: MessageKey; value: SkillScope; icon: LucideIcon }> = [
    { labelKey: "skillsPage.scope.skill", value: "public", icon: Sparkles },
    { labelKey: "skillsPage.scope.favorites", value: "favorites", icon: Heart },
    { labelKey: "skillsPage.scope.mine", value: "mine", icon: UserRound },
];
const discoveryOptions: Array<{ id: string; labelKey: MessageKey; tag: string; sort: SkillSort }> = [
    { id: "recommended", labelKey: "skillsPage.discovery.recommended", tag: "all", sort: "new" },
    { id: "film", labelKey: "skillsPage.discovery.film", tag: "drama", sort: "new" },
    { id: "commercial", labelKey: "skillsPage.discovery.commercial", tag: "ecommerce", sort: "popular" },
    { id: "drama", labelKey: "skillsPage.discovery.drama", tag: "drama", sort: "popular" },
    { id: "animation", labelKey: "skillsPage.discovery.animation", tag: "creative", sort: "new" },
    { id: "music", labelKey: "skillsPage.discovery.music", tag: "creative", sort: "popular" },
    { id: "creator", labelKey: "skillsPage.discovery.creator", tag: "social", sort: "new" },
    { id: "utility", labelKey: "skillsPage.discovery.utility", tag: "others", sort: "new" },
    { id: "discover", labelKey: "skillsPage.discovery.discover", tag: "all", sort: "popular" },
];
const categoryIcons: Record<string, LucideIcon> = { drama: Clapperboard, ecommerce: Boxes, creative: Palette, social: Megaphone, others: Puzzle };
const cardArtLabels: Record<string, string> = { drama: "DIRECT", ecommerce: "BRAND", creative: "CREATE", social: "SOCIAL", others: "STUDIO" };
const coverAssets = [
    "character-continuity",
    "character-motion",
    "character",
    "cinematic-scale",
    "cinematic",
    "commercial",
    "continuity-lab",
    "directing-workflow",
    "drama",
    "emotion-arc",
    "episode-hook",
    "fashion",
    "frame-composition",
    "image-video-shot",
    "interview-edl",
    "jewelry",
    "media-index",
    "motion-plan",
    "motion",
    "multimodal-workshop",
    "post",
    "production-script",
    "render-qc",
    "research",
    "rhythm",
    "script-shotlist",
    "script",
    "series",
    "shot-arc",
    "silence-cut",
    "social",
    "storyboard",
    "subtitle-qc",
    "timeline-board",
    "ugc",
    "vfx",
    "workflow-system",
].map((name) => `/images/skills/skill-cover-${name}.${name === "workflow-system" ? "png" : "jpg"}`);
const preferredCover: Record<string, string> = {
    drama: "/images/skills/skill-cover-drama.jpg",
    ecommerce: "/images/skills/skill-cover-commercial.jpg",
    creative: "/images/skills/skill-cover-motion.jpg",
    social: "/images/skills/skill-cover-social.jpg",
    others: "/images/skills/skill-cover-research.jpg",
};
const categoryIconOf = (tag: string) => categoryIcons[tag] ?? Boxes;
const hash = (value: string) => Array.from(value).reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 7);

function pageCovers(skills: Skill[]) {
    const reserved = new Set(skills.flatMap((skill) => (skillCoverByID[skill.skillId] ? [skillCoverByID[skill.skillId]] : [])));
    const used = new Set<string>();
    return new Map(
        skills.map((skill) => {
            const fixed = skillCoverByID[skill.skillId];
            if (fixed) {
                used.add(fixed);
                return [skill.skillId, fixed] as const;
            }
            const candidates = [preferredCover[skill.tag] ?? preferredCover.others, ...coverAssets.slice().sort((a, b) => hash(`${skill.skillId}${a}`) - hash(`${skill.skillId}${b}`))];
            const cover = candidates.find((candidate) => !used.has(candidate) && !reserved.has(candidate)) ?? candidates.find((candidate) => !used.has(candidate)) ?? candidates[0];
            used.add(cover);
            return [skill.skillId, cover] as const;
        }),
    );
}

export default function LibTVSkillsPage() {
    upstreamUseI18n();
    const { message, modal } = App.useApp();
    const { t, number } = useI18n();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const requestedSlug = searchParams.get("open");
    const signedIn = useUserStore((state) => Boolean(state.user));
    // Visitors browse and read every public skill; anything that writes or spends goes through login and returns here.
    const requireAccount = (skill?: Skill) => {
        if (signedIn) return false;
        const slug = skill ? (skillSlugs as Record<string, string>)[skill.skillId] : undefined;
        navigate(`/login?next=${encodeURIComponent(slug ? `/skills?open=${slug}` : "/skills")}`);
        return true;
    };
    const openInstall = () => {
        if (!requireAccount()) setInstallOpen(true);
    };
    useEffect(() => {
        const skillId = Object.entries(skillSlugs).find(([, slug]) => slug === requestedSlug)?.[0];
        if (!skillId) return;
        let cancelled = false;
        setDetailLoading(true);
        getSkill(skillId)
            .then(({ skill }) => {
                if (!cancelled) setActiveSkill(skill);
            })
            .catch((cause) => {
                if (!cancelled) message.error(cause instanceof Error ? cause.message : t("skillsPage.message.detailLoadFailed"));
            })
            .finally(() => {
                if (!cancelled) setDetailLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [requestedSlug, message, t]);
    const heroRef = useRef<HTMLElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const [scope, setScope] = useState<SkillScope>("public");
    const [sort, setSort] = useState<SkillSort>("new");
    const [tag, setTag] = useState("all");
    const [search, setSearch] = useState("");
    const [idea, setIdea] = useState("");
    const [selected, setSelected] = useState<Skill | null>(null);
    const [activeRail, setActiveRail] = useState("recommended");
    const [page, setPage] = useState(1);
    const { curation, error: curationError, retry: retryCuration } = useSkillCuration();
    const [curationValue, setCurationValue] = useState("");
    const [pageSize, setPageSize] = useState(18);
    const [skills, setSkills] = useState<Skill[]>([]);
    const [categories, setCategories] = useState<SkillCategory[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [reloadKey, setReloadKey] = useState(0);
    const [activeSkill, setActiveSkill] = useState<Skill | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [mutatingID, setMutatingID] = useState("");
    const [installOpen, setInstallOpen] = useState(false);
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
    const covers = useMemo(() => pageCovers(skills), [skills]);
    const query = useDebouncedValue(search, 250);
    const reload = useCallback(() => setReloadKey((value) => value + 1), []);
    const patchSkill = useCallback((next: Skill) => {
        setSkills((items) => items.map((item) => (item.skillId === next.skillId ? { ...item, ...next, instruction: next.instruction || item.instruction } : item)));
        setActiveSkill((current) => (current?.skillId === next.skillId ? { ...current, ...next } : current));
    }, []);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError("");
        listSkills({ ...curationQuery(curation, curationValue), page, pageSize: pageSize, scope, sort, tag: tag === "all" ? undefined : tag, search: query || undefined })
            .then((result) => {
                if (!cancelled) {
                    setSkills(result.skills);
                    setTotal(result.totalCount);
                    if (result.categories.length) setCategories(result.categories);
                }
            })
            .catch((cause) => {
                if (!cancelled) {
                    setSkills([]);
                    setTotal(0);
                    setError(cause instanceof Error ? cause.message : t("skillsPage.message.loadFailed"));
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [curation, curationValue, page, pageSize, query, reloadKey, scope, sort, tag]);

    const openSkill = async (skill: Skill) => {
        setActiveSkill(skill);
        setDetailLoading(true);
        try {
            const result = await getSkill(skill.skillId);
            patchSkill(result.skill);
            setActiveSkill(result.skill);
        } catch (cause) {
            message.error(cause instanceof Error ? cause.message : t("skillsPage.message.detailLoadFailed"));
            setActiveSkill(null);
        } finally {
            setDetailLoading(false);
        }
    };
    const toggleAdded = async (skill: Skill) => {
        if (skill.isOwner || requireAccount(skill)) return;
        setMutatingID(skill.skillId);
        try {
            const result = skill.isAdded ? await removeSkill(skill.skillId) : await addSkill(skill.skillId);
            patchSkill(result.skill);
            if (!result.skill.isAdded) setSelected((current) => (current?.skillId === result.skill.skillId ? null : current));
            message.success(result.skill.isAdded ? t("skillsPage.message.added") : t("skillsPage.message.removed"));
            if (scope === "mine" && !result.skill.isAdded) reload();
        } catch (cause) {
            message.error(cause instanceof Error ? cause.message : t("skillsPage.message.statusUpdateFailed"));
        } finally {
            setMutatingID("");
        }
    };
    const chooseSkill = async (skill: Skill) => {
        if (requireAccount(skill)) return;
        let next = skill;
        if (!skill.isOwner && !skill.isAdded) {
            setMutatingID(skill.skillId);
            try {
                next = (await addSkill(skill.skillId)).skill;
                patchSkill(next);
            } catch (cause) {
                message.error(cause instanceof Error ? cause.message : t("skillsPage.message.addFailed"));
                return;
            } finally {
                setMutatingID("");
            }
        }
        setSelected(next);
        requestAnimationFrame(() => {
            const bounds = heroRef.current?.getBoundingClientRect();
            const needsScroll = !bounds || bounds.top < 72 || bounds.bottom > window.innerHeight - 16;
            if (needsScroll) heroRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            window.setTimeout(() => inputRef.current?.focus({ preventScroll: !needsScroll }), needsScroll ? 180 : 0);
        });
    };
    const toggleLiked = async (skill: Skill) => {
        if (requireAccount(skill)) return;
        setMutatingID(skill.skillId);
        try {
            const result = skill.isLike ? await unlikeSkill(skill.skillId) : await likeSkill(skill.skillId);
            patchSkill(result.skill);
            message.success(result.skill.isLike ? t("skillsPage.message.liked") : t("skillsPage.message.unliked"));
        } catch (cause) {
            message.error(cause instanceof Error ? cause.message : t("skillsPage.message.likeUpdateFailed"));
        } finally {
            setMutatingID("");
        }
    };
    const confirmDelete = (skill: Skill) =>
        modal.confirm({
            title: t("skillsPage.message.deleteTitle", { name: skillListingText(skill, t).name }),
            content: t("skillsPage.message.deleteContent"),
            okText: t("skillsPage.message.deleteOk"),
            okButtonProps: { danger: true },
            cancelText: t("skillsPage.message.deleteCancel"),
            onOk: async () => {
                await deleteSkill(skill.skillId);
                setActiveSkill(null);
                message.success(t("skillsPage.message.deleted"));
                reload();
            },
        });
    const openEditor = async (skill?: Skill) => {
        if (requireAccount(skill)) return;
        if (!skill) {
            setEditingSkill(null);
            setEditorOpen(true);
            return;
        }
        try {
            const result = skill.instruction ? { skill } : await getSkill(skill.skillId);
            setActiveSkill(null);
            setEditingSkill(result.skill);
            setEditorOpen(true);
        } catch (cause) {
            message.error(cause instanceof Error ? cause.message : t("skillsPage.message.readFailed"));
        }
    };
    const submit = () => {
        const intent = idea.trim();
        if (!intent) {
            message.info(selected ? t("skillsPage.message.intentNeededFor", { name: skillListingText(selected, t).name }) : t("skillsPage.message.intentNeeded"));
            return;
        }
        if (!selected) {
            setSearch(intent);
            setActiveRail("custom");
            setPage(1);
            message.success(t("skillsPage.message.matched"));
            return;
        }
        const handoff = saveSkillCanvasHandoff({ skillId: selected.skillId, skillName: selected.skillName, prompt: buildSkillCanvasPrompt(selected.skillName, intent) });
        if (!handoff) {
            message.error(t("skillsPage.message.handoffFailed"));
            return;
        }
        navigate(`/canvas?mode=new&skill-handoff=${encodeURIComponent(handoff.id)}`);
    };
    const clearFilters = () => {
        setSearch("");
        setIdea("");
        setTag("all");
        setSort("new");
        setActiveRail("recommended");
        setPage(1);
    };
    const filtersActive = Boolean(search || tag !== "all" || sort !== "new");

    return (
        <>
            <WorkspacePage className="libtv-skills-page" fluid>
                <div className="libtv-skills-shell">
                    <section ref={heroRef} className="libtv-skills-hero" aria-labelledby="skills-hero-title">
                        <h1 id="skills-hero-title">{t("skillsPage.hero.title")}</h1>
                        <div className="libtv-idea-composer">
                            {selected ? (
                                <div className="libtv-selected-skill" role="status">
                                    <Sparkles />
                                    <span>{skillListingText(selected, t).name}</span>
                                    <button type="button" aria-label={t("skillsPage.hero.clearSelected")} onClick={() => setSelected(null)}>
                                        <X />
                                    </button>
                                </div>
                            ) : null}
                            <textarea
                                ref={inputRef}
                                value={idea}
                                className={selected ? "has-selected-skill" : undefined}
                                aria-label={t("skillsPage.hero.ideaAria")}
                                placeholder={selected ? t("skillsPage.hero.ideaPlaceholderFor", { name: skillListingText(selected, t).name, input: t(describeSkill(selected).inputKey) }) : t("skillsPage.hero.ideaPlaceholder")}
                                onChange={(event) => {
                                    setIdea(event.target.value);
                                    setActiveRail("custom");
                                }}
                                onKeyDown={(event) => {
                                    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                                        event.preventDefault();
                                        submit();
                                    }
                                }}
                            />
                            <div className="libtv-composer-footer">
                                <div className="libtv-composer-tools">
                                    <Tooltip title={t("skillsPage.action.importOpen")}>
                                        <button type="button" aria-label={t("skillsPage.action.importOpen")} onClick={openInstall}>
                                            <Plus />
                                        </button>
                                    </Tooltip>
                                    <Tooltip title={t("skillsPage.action.newSkill")}>
                                        <button type="button" aria-label={t("skillsPage.action.newSkill")} onClick={() => openEditor()}>
                                            <WandSparkles />
                                        </button>
                                    </Tooltip>
                                    <span>{selected ? t("skillsPage.hero.selectedHint") : t("skillsPage.hero.enterToSend")}</span>
                                </div>
                                <button type="button" className="libtv-composer-submit" aria-label={t("skillsPage.hero.startCreating")} onClick={submit}>
                                    <ArrowUp />
                                </button>
                            </div>
                        </div>
                    </section>
                    <section className="libtv-skill-intro" aria-label={t("skillsPage.intro.whatIsSkill")}>
                        <div className="libtv-skill-intro-copy">
                            <span>{t("skillsPage.intro.whatIsSkill")}</span>
                            <p>
                                <strong>{t("skillsPage.intro.leadStrong")}</strong>
                                {t("skillsPage.intro.lead")}
                            </p>
                        </div>
                        <ol className="libtv-skill-intro-steps">
                            <li>
                                <b>01</b>
                                <span>{t("skillsPage.intro.step1")}</span>
                            </li>
                            <li>
                                <b>02</b>
                                <span>{t("skillsPage.intro.step2")}</span>
                            </li>
                            <li>
                                <b>03</b>
                                <span>{t("skillsPage.intro.step3")}</span>
                            </li>
                        </ol>
                        <img src="/images/skills/skill-cover-directing-workflow.jpg" alt="" />
                    </section>
                    <SkillCurationBrowser
                        data={curation}
                        value={curationValue}
                        onChange={(value) => {
                            setCurationValue(value);
                            setPage(1);
                        }}
                        error={curationError}
                        retry={retryCuration}
                    />
                    <section className="libtv-discovery" aria-label={t("skillsPage.discovery.aria")}>
                        <div className="libtv-discovery-head">
                            <div className="libtv-scope-tabs" role="tablist">
                                {scopeOptions
                                    .filter((option) => signedIn || option.value === "public")
                                    .map((option) => {
                                        const Icon = option.icon;
                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                role="tab"
                                                aria-selected={scope === option.value}
                                                className={scope === option.value ? "is-active" : undefined}
                                                onClick={() => {
                                                    setScope(option.value);
                                                    setPage(1);
                                                }}
                                            >
                                                <Icon />
                                                {t(option.labelKey)}
                                            </button>
                                        );
                                    })}
                            </div>
                            <span className="libtv-discovery-meta">{t("skillsPage.discovery.availableCount", { count: number(total) })}</span>
                        </div>
                        <div className="libtv-discovery-controls">
                            <div className="libtv-category-rail">
                                <ChevronLeft />
                                <div className="libtv-category-pills">
                                    {discoveryOptions.map((option) => (
                                        <button
                                            key={option.id}
                                            type="button"
                                            aria-pressed={activeRail === option.id}
                                            className={activeRail === option.id ? "is-active" : undefined}
                                            onClick={() => {
                                                setTag(option.tag);
                                                setSort(option.sort);
                                                setActiveRail(option.id);
                                                setPage(1);
                                            }}
                                        >
                                            {t(option.labelKey)}
                                        </button>
                                    ))}
                                </div>
                                <ChevronRight />
                            </div>
                            <label className="libtv-skill-search">
                                <Search />
                                <input
                                    value={search}
                                    placeholder={t("skillsPage.discovery.searchPlaceholder")}
                                    onChange={(event) => {
                                        setSearch(event.target.value);
                                        setActiveRail("custom");
                                        setPage(1);
                                    }}
                                />
                                {search ? (
                                    <button type="button" aria-label={t("skillsPage.discovery.clearSearch")} onClick={() => setSearch("")}>
                                        ×
                                    </button>
                                ) : null}
                            </label>
                        </div>
                    </section>
                    {loading && !skills.length ? (
                        <SkillSkeleton />
                    ) : error ? (
                        <section className="libtv-skill-empty libtv-skill-error">
                            <p>{error}</p>
                            <Button type="primary" onClick={reload}>
                                {t("skillsPage.action.reload")}
                            </Button>
                        </section>
                    ) : skills.length ? (
                        <section className="libtv-skill-grid" aria-label={t("skillsPage.listAria")}>
                            {skills.map((skill, index) => (
                                <SkillCard
                                    key={skill.skillId}
                                    skill={skill}
                                    cover={covers.get(skill.skillId) ?? preferredCover.others}
                                    selected={selected?.skillId === skill.skillId}
                                    loading={mutatingID === skill.skillId}
                                    style={{ "--libtv-card-index": Math.min(index, 12) } as CSSProperties}
                                    onOpen={() => void openSkill(skill)}
                                    onUse={() => void chooseSkill(skill)}
                                    onLike={() => void toggleLiked(skill)}
                                    onEdit={() => void openEditor(skill)}
                                    onDelete={() => confirmDelete(skill)}
                                />
                            ))}
                        </section>
                    ) : (
                        <section className="libtv-skill-empty">
                            <Sparkles />
                            <h2>{filtersActive ? t("skillsPage.empty.noMatch") : t("skillsPage.empty.noneHere")}</h2>
                            <p>{filtersActive ? t("skillsPage.empty.noMatchHint") : t("skillsPage.empty.noneHereHint")}</p>
                            <div>
                                {filtersActive ? (
                                    <Button onClick={clearFilters}>{t("skillsPage.action.clearFilters")}</Button>
                                ) : (
                                    <Button type="primary" onClick={openInstall}>
                                        {t("skillsPage.action.importOpen")}
                                    </Button>
                                )}
                                <Button type="text" onClick={() => openEditor()}>
                                    {t("skillsPage.action.newSkill")}
                                </Button>
                            </div>
                        </section>
                    )}
                    <PaginationBar
                        current={page}
                        pageSize={pageSize}
                        total={total}
                        pageSizeOptions={[18, 36]}
                        itemLabel={t("skillsPage.paginationUnit")}
                        onChange={(nextPage, nextPageSize) => {
                            setPage(nextPageSize !== pageSize ? 1 : nextPage);
                            setPageSize(nextPageSize);
                        }}
                    />
                </div>
            </WorkspacePage>
            <SkillDetailModal
                skill={activeSkill}
                loading={detailLoading}
                mutating={Boolean(activeSkill && mutatingID === activeSkill.skillId)}
                categories={categories}
                onClose={() => setActiveSkill(null)}
                onUse={(skill) => {
                    setActiveSkill(null);
                    void chooseSkill(skill);
                }}
                onAdd={(skill) => void toggleAdded(skill)}
                onLike={(skill) => void toggleLiked(skill)}
                onEdit={(skill) => void openEditor(skill)}
                onSync={async (skill) => {
                    setMutatingID(skill.skillId);
                    try {
                        patchSkill((await syncSkill(skill.skillId)).skill);
                        message.success(t("skillsPage.message.synced"));
                    } finally {
                        setMutatingID("");
                    }
                }}
            />
            <SkillInstallModal
                open={installOpen}
                onClose={() => setInstallOpen(false)}
                onInstalled={(skill) => {
                    setInstallOpen(false);
                    setActiveSkill(skill);
                    reload();
                }}
                onManualCreate={() => {
                    setInstallOpen(false);
                    openEditor();
                }}
            />
            <SkillEditorDrawer
                open={editorOpen}
                skill={editingSkill}
                onClose={() => setEditorOpen(false)}
                onSaved={(skill) => {
                    setEditorOpen(false);
                    setEditingSkill(null);
                    setActiveSkill(skill);
                    reload();
                }}
            />
        </>
    );
}

function SkillCard({
    skill,
    cover,
    selected,
    loading,
    style,
    onOpen,
    onUse,
    onLike,
    onEdit,
    onDelete,
}: {
    skill: Skill;
    cover: string;
    selected: boolean;
    loading: boolean;
    style: CSSProperties;
    onOpen: () => void;
    onUse: () => void;
    onLike: () => void;
    onEdit: () => void;
    onDelete: () => void;
}) {
    upstreamUseI18n();
    const { t } = useI18n();
    const Icon = categoryIconOf(skill.tag);
    const purpose = describeSkill(skill);
    const listing = skillListingText(skill, t);
    const source = sourceLabel(skill.markdownUrl);
    return (
        <article style={style} className="libtv-skill-card">
            <button type="button" className={`libtv-skill-cover libtv-skill-cover--${skill.tag}`} onClick={onOpen} aria-label={t("skillsPage.card.viewAria", { name: listing.name })}>
                <span className="libtv-card-art">
                    <Icon />
                    <strong>{cardArtLabels[skill.tag] ?? "SKILL"}</strong>
                    <i />
                </span>
                <img
                    src={cover}
                    alt=""
                    onError={(event) => {
                        event.currentTarget.style.display = "none";
                    }}
                />
                <span className="libtv-media-kind">{skill.showcaseMedia.some((media) => media.type === "video") ? t("skillsPage.card.video") : t("skillsPage.scope.skill")}</span>
                {source ? (
                    <span className="libtv-cover-source">
                        <ExternalLink />
                        {source}
                    </span>
                ) : null}
            </button>
            <div className="libtv-skill-body">
                <button type="button" className="libtv-skill-title" onClick={onOpen}>
                    <h3>{listing.name}</h3>
                </button>
                <button type="button" className="libtv-skill-purpose" onClick={onOpen}>
                    {listing.description || t(purpose.promiseKey)}
                </button>
                <div className="libtv-skill-meta">
                    <span className="libtv-skill-input" title={t("skillsPage.card.inputTitle", { input: t(purpose.inputKey) })}>
                        {t("skillsPage.card.inputPrefix")}
                        {t(purpose.inputKey)}
                    </span>
                    <span>→</span>
                    <span className="libtv-skill-output" title={t("skillsPage.card.outputTitle", { output: t(purpose.outputKey) })}>
                        {t("skillsPage.card.outputPrefix")}
                        {t(purpose.outputKey)}
                    </span>
                </div>
            </div>
            <div className="libtv-skill-actions">
                <Tooltip title={skill.isLike ? t("skillsPage.action.unlike") : t("skillsPage.action.like")}>
                    <button type="button" disabled={loading} className={`libtv-card-favorite${skill.isLike ? " is-liked" : ""}`} onClick={onLike}>
                        <Heart />
                    </button>
                </Tooltip>
                {skill.isOwner ? (
                    <Dropdown
                        trigger={["click"]}
                        menu={{
                            items: [
                                { key: "edit", label: t("skillsPage.action.editSkill") },
                                { key: "delete", label: t("skillsPage.action.deleteSkill"), danger: true },
                            ],
                            onClick: ({ key }) => (key === "edit" ? onEdit() : onDelete()),
                        }}
                    >
                        <button type="button" className="libtv-card-more">
                            <MoreHorizontal />
                        </button>
                    </Dropdown>
                ) : null}
                <button type="button" className={`libtv-card-use${selected ? " is-selected" : ""}`} disabled={loading} onClick={onUse}>
                    {loading ? <LoaderCircle className="animate-spin" /> : selected ? <Check /> : null}
                    <span>{selected ? t("skillsPage.card.selected") : t("skillsPage.card.use")}</span>
                </button>
            </div>
        </article>
    );
}

function SkillSkeleton() {
    upstreamUseI18n();
    return (
        <div className="libtv-skill-grid libtv-skill-grid--skeleton">
            {Array.from({ length: 12 }, (_, index) => (
                <div key={index} className="libtv-skill-skeleton" />
            ))}
        </div>
    );
}
function sourceLabel(url: string) {
    if (!url) return "";
    try {
        const host = new URL(url).hostname.replace(/^www\./, "");
        return host === "github.com" ? upstreamText("adminUserColumns.githubLogin") : host;
    } catch {
        return "";
    }
}
