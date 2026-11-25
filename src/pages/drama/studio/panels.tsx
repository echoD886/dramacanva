import { CastDraftActions } from "./drama-delivery";
import { reviewText, reviewServerText, useReviewLocale } from "@/i18n/drama-messages";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { App, Button, Checkbox, Input, InputNumber, Select, Switch } from "antd";
import { AlertCircle, ArrowRight, CheckCheck, Clapperboard, Film, Gem, Inbox, Lock, MapPinned, Maximize2, PauseCircle, RefreshCw, RotateCcw, ScrollText, Sparkles, UserRound, UsersRound, Wand2 } from "lucide-react";

import { CanvasImagePreview } from "../ui";
import { dramaChoiceKey } from "@/lib/drama/model-choice";
import {
    getDramaCastImpact,
    regenerateDramaCast,
    regenerateDramaCasts,
    updateDramaCast,
    updateDramaSettings,
    type DramaCapability,
    type DramaCast,
    type DramaCastKind,
    type DramaInboxItem,
    type DramaMediaMode,
    type DramaReviewMode,
    type DramaSummary,
} from "@/services/api/drama";

import { aspectRatioValue, CAST_KIND_LABEL, formatCredits, MEDIA_MODE_LABEL, mediaBusy, MediaThumb, parseList } from "../drama-shared";
import { AssetSchemePicker } from "../asset-scheme";
import { DramaModelPicker, useDramaModelCatalog } from "../drama-model-picker";
import { PromptSkillField } from "../prompt-skill";
import { StoryboardRules } from "../storyboard-rules";
import { progressFillStyle } from "@/pages/drama/progress-fill";

// 制作台的三个整页视图：设定（角色 / 道具 / 场景）、待处理、制作设置。都在主区域内展示，不使用抽屉遮挡。

// ===== 设定 =====

const CAST_KIND_ICON: Record<DramaCastKind, ReactNode> = { character: <UserRound className="size-6 opacity-30" />, prop: <Gem className="size-6 opacity-30" />, scene: <MapPinned className="size-6 opacity-30" /> };
const CAST_KINDS: DramaCastKind[] = ["character", "prop", "scene"];

type CastFilter = "all" | "failed" | "busy" | "locked";

/** 资产参考图统一横版 16:9；角色按参考图方案的画幅（内置方案均为 16:9）。图片完整显示不裁切，占位与成图同尺寸。 */
const ASSET_IMAGE_RATIO = "16:9";

function castRatio(kind: DramaCastKind, ratios: CastRatios) {
    const ratio = (kind === "character" && ratios.character) || ASSET_IMAGE_RATIO;
    const [width, height] = ratio.split(":").map(Number);
    const orientation = width && height ? (width > height ? "is-wide" : width < height ? "is-tall" : "is-square") : "is-tall";
    return { style: { "--drama-cast-ratio": aspectRatioValue(ratio) } as CSSProperties, orientation };
}

export type CastRatios = { character: string };

function CastImageLoading() {
    useReviewLocale();
    return <span className="drama-cast-media-state is-loading" role="status" aria-label={reviewText("参考图加载中")} />;
}
function CastImageFailed() {
    useReviewLocale();
    return (
        <span className="drama-cast-media-state">
            <AlertCircle className="size-3.5" />
            {reviewText("图片加载失败")}
        </span>
    );
}

export function CastPanel({
    projectId,
    cast,
    ratios,
    focusId,
    retrying,
    assetsPending,
    releasing,
    onFocus,
    onRetry,
    onChanged,
    onReleaseAssets,
}: {
    projectId: string;
    cast: DramaCast[];
    ratios: CastRatios;
    focusId: string;
    retrying: boolean;
    assetsPending: boolean;
    releasing: boolean;
    onFocus: (id: string) => void;
    onRetry: () => void;
    onChanged: () => void;
    onReleaseAssets: () => void;
}) {
    useReviewLocale();
    const [kind, setKind] = useState<DramaCastKind>("character");
    const [filter, setFilter] = useState<CastFilter>("all");
    const focused = cast.find((item) => item.id === focusId);
    useEffect(() => {
        if (focused) setKind(focused.kind);
    }, [focused]);
    const ofKind = cast.filter((item) => item.kind === kind);
    const failed = cast.filter((item) => item.imageStatus === "failed").length;
    const count = (predicate: (item: DramaCast) => boolean) => ofKind.filter(predicate).length;
    const filters: Array<[CastFilter, string, number]> = [
        ["all", reviewText("全部"), ofKind.length],
        ["failed", reviewText("失败"), count((item) => item.imageStatus === "failed")],
        ["busy", reviewText("生成中"), count((item) => mediaBusy(item.imageStatus))],
        ["locked", reviewText("已锁定"), count((item) => item.locked)],
    ];
    const list = ofKind.filter((item) => {
        if (filter === "failed") return item.imageStatus === "failed";
        if (filter === "busy") return mediaBusy(item.imageStatus);
        if (filter === "locked") return item.locked;
        return true;
    });
    const active = focused && focused.kind === kind ? focused : list[0];
    const kindRatio = castRatio(kind, ratios);
    return (
        <div className="drama-view drama-cast-layout">
            <section className="drama-view-main">
                <div className="drama-view-head">
                    <div className="drama-tabs" role="tablist" aria-label={reviewText("设定类型")}>
                        {CAST_KINDS.map((value) => (
                            <button key={value} type="button" role="tab" className="drama-tab" aria-selected={kind === value} onClick={() => setKind(value)}>
                                {CAST_KIND_LABEL[value]}
                                <span className="drama-tab-count">{cast.filter((item) => item.kind === value).length}</span>
                            </button>
                        ))}
                    </div>
                    <div className="drama-filters" role="group" aria-label={reviewText("筛选")}>
                        {filters.map(([key, label, value]) => (
                            <button key={key} type="button" className={`drama-filter ${key === "failed" && value ? "is-alert" : ""}`} aria-pressed={filter === key} onClick={() => setFilter(key)}>
                                {label}
                                <b>{value}</b>
                            </button>
                        ))}
                    </div>
                    {kind === "character" && (
                        <CastDraftActions
                            projectId={projectId}
                            onCreated={(id) => {
                                onChanged();
                                onFocus(id);
                            }}
                        />
                    )}
                    {failed ? (
                        <Button className="!ml-auto" icon={<RotateCcw className="size-4" />} loading={retrying} onClick={onRetry}>
                            {reviewText("重试失败的")}
                            {failed}
                            {reviewText("个")}
                        </Button>
                    ) : null}
                </div>
                <div className="drama-view-scroll thin-scrollbar">
                    {assetsPending && cast.some((item) => item.imageStatus === "") ? (
                        <div className="drama-banner is-ready is-flush">
                            <Sparkles className="size-5 shrink-0 text-[var(--workspace-accent)]" />
                            <div className="drama-banner-text">
                                <strong>{reviewText("参考图还没有生成")}</strong>
                                <span>{reviewText("先核对角色、道具与场景的名称和外观描述，满意后再生成参考图；也可以在右侧单独生成某一个。参考图会随剧情段视频请求一起发送，保持人物和道具一致。")}</span>
                            </div>
                            <Button type="primary" icon={<Sparkles className="size-4" />} loading={releasing} onClick={onReleaseAssets}>
                                {reviewText("生成全部参考图")}
                            </Button>
                        </div>
                    ) : null}
                    <div className={`drama-cast-grid ${kindRatio.orientation}`}>
                        {list.map((item) => (
                            <button key={item.id} type="button" className="drama-cast-card" aria-current={item.id === active?.id} onClick={() => onFocus(item.id)}>
                                <div className="drama-cast-card-media" style={kindRatio.style}>
                                    {item.imageResourceId ? <MediaThumb resourceId={item.imageResourceId} alt={item.name} loading={<CastImageLoading />} failed={<CastImageFailed />} /> : null}
                                    {!item.imageResourceId || mediaBusy(item.imageStatus) || item.imageStatus === "failed" || item.imageStatus === "" ? (
                                        <div className={`drama-shot-placeholder ${mediaBusy(item.imageStatus) ? "is-busy" : ""}`}>
                                            {item.imageStatus === "failed" ? (
                                                <span className="drama-cast-card-failed">
                                                    <AlertCircle className="size-3.5" />
                                                    {reviewText("生成失败")}
                                                </span>
                                            ) : item.imageResourceId ? (
                                                reviewText("更新中…")
                                            ) : (
                                                CAST_KIND_ICON[item.kind]
                                            )}
                                        </div>
                                    ) : null}
                                    {item.locked ? (
                                        <span className="drama-shot-flags">
                                            <span className="drama-flag is-lock">
                                                <Lock className="size-3" />
                                            </span>
                                        </span>
                                    ) : null}
                                </div>
                                <div className="drama-cast-card-body">
                                    <strong>{item.name}</strong>
                                    <span>{item.role || parseList(item.aliasesJson).join("、") || item.description || "—"}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                    {!list.length ? (
                        <div className="drama-empty">
                            <UserRound className="size-7" />
                            <span>{ofKind.length ? reviewText("没有符合筛选的设定") : reviewText("作品圣经建立后，{v0}会出现在这里", { v0: CAST_KIND_LABEL[kind] })}</span>
                        </div>
                    ) : null}
                </div>
            </section>
            <aside className="drama-view-side thin-scrollbar">
                {active ? (
                    <CastEditor key={active.id} projectId={projectId} cast={active} ratios={ratios} onChanged={onChanged} />
                ) : (
                    <div className="drama-empty is-compact">
                        <span>{reviewText("选择一个设定查看详情")}</span>
                    </div>
                )}
            </aside>
        </div>
    );
}

function CastEditor({ projectId, cast, ratios, onChanged }: { projectId: string; cast: DramaCast; ratios: CastRatios; onChanged: () => void }) {
    useReviewLocale();
    const { message } = App.useApp();
    const [previewing, setPreviewing] = useState(false);
    const [name, setName] = useState(cast.name);
    const [aliases, setAliases] = useState(parseList(cast.aliasesJson));
    const [stylePrompt, setStylePrompt] = useState(cast.stylePrompt || "");
    const [appearance, setAppearance] = useState(cast.appearance);
    const [voiceInstructions, setVoiceInstructions] = useState(cast.voiceInstructions);
    const [restyle, setRestyle] = useState(true);
    const impactQuery = useQuery({ queryKey: ["drama", projectId, "cast-impact", cast.id], queryFn: ({ signal }) => getDramaCastImpact(projectId, cast.id, signal) });
    const dirty = stylePrompt !== (cast.stylePrompt || "") || name !== cast.name || appearance !== cast.appearance || voiceInstructions !== cast.voiceInstructions || aliases.join("|") !== parseList(cast.aliasesJson).join("|");
    const fields = { name, stylePrompt, aliases, appearance, voiceInstructions };
    const save = useMutation({
        mutationFn: () => updateDramaCast(projectId, cast.id, fields),
        onSuccess: () => {
            message.success(reviewText("设定已保存"));
            onChanged();
        },
        onError: (error) => message.error(error instanceof Error ? reviewServerText(error.message) : reviewText("保存失败")),
    });
    const lock = useMutation({ mutationFn: (locked: boolean) => updateDramaCast(projectId, cast.id, { locked }), onSuccess: onChanged });
    const regenerate = useMutation({
        mutationFn: async () => {
            if (dirty) await updateDramaCast(projectId, cast.id, fields);
            return regenerateDramaCast(projectId, cast.id, restyle);
        },
        onSuccess: (result) => {
            message.success(result.affectedSegments ? reviewText("正在重新生成参考图；{v0} 个剧情段的视频需重新生成", { v0: result.affectedSegments }) : reviewText("正在重新生成参考图"));
            onChanged();
        },
        onError: (error) => message.error(error instanceof Error ? reviewServerText(error.message) : reviewText("操作失败")),
    });
    const impact = impactQuery.data;
    const isCharacter = cast.kind === "character";
    const kindLabel = CAST_KIND_LABEL[cast.kind];
    return (
        <div className="drama-editor">
            <div className="drama-cast-hero" style={castRatio(cast.kind, ratios).style}>
                {cast.imageResourceId ? <MediaThumb resourceId={cast.imageResourceId} alt={cast.name} loading={<CastImageLoading />} failed={<CastImageFailed />} /> : null}
                {cast.imageResourceId ? (
                    <button type="button" className="drama-cast-hero-zoom" aria-label={reviewText("放大查看{v0}的参考图", { v0: cast.name })} title={reviewText("点击放大查看")} onClick={() => setPreviewing(true)}>
                        <span className="drama-cast-hero-zoom-hint" aria-hidden="true">
                            <Maximize2 className="size-3.5" />
                        </span>
                    </button>
                ) : null}
                {!cast.imageResourceId || mediaBusy(cast.imageStatus) || cast.imageStatus === "failed" ? (
                    <div className={`drama-shot-placeholder ${mediaBusy(cast.imageStatus) ? "is-busy" : ""}`}>
                        {cast.imageStatus === "failed" ? (
                            <span className="drama-cast-card-failed">
                                <AlertCircle className="size-4" />
                                {reviewText("参考图生成失败")}
                            </span>
                        ) : mediaBusy(cast.imageStatus) ? (
                            reviewText("参考图生成中…")
                        ) : (
                            reviewText("尚未生成参考图，确认描述后点下方生成")
                        )}
                    </div>
                ) : null}
            </div>
            <div className="drama-editor-row">
                <span className="drama-eyebrow">
                    {kindLabel}
                    {reviewText("设定")}
                </span>
                <label className="drama-switch-label">
                    <Lock className="size-3.5" />
                    {reviewText("锁定形象")}
                    <Switch size="small" checked={cast.locked} loading={lock.isPending} onChange={(checked) => lock.mutate(checked)} />
                </label>
            </div>
            <Field label={reviewText("名称")}>
                <Input value={name} maxLength={60} onChange={(event) => setName(event.target.value)} aria-label={reviewText("名称")} />
            </Field>
            {isCharacter ? (
                <Field label={reviewText("别名与称呼")} hint={reviewText("剧本里这些称呼都会归到此角色")}>
                    <Select mode="tags" className="w-full" value={aliases} onChange={setAliases} tokenSeparators={[",", "，", "、"]} placeholder={reviewText("输入后回车")} open={false} suffixIcon={null} aria-label={reviewText("别名与称呼")} />
                </Field>
            ) : null}
            {isCharacter && (
                <Field label={reviewText("角色专属风格")}>
                    <Input.TextArea maxLength={2000} value={stylePrompt} onChange={(event) => setStylePrompt(event.target.value)} />
                </Field>
            )}
            <Field label={APPEARANCE_LABEL[cast.kind]} hint={reviewText("用于参考图与剧情段视频提示词")}>
                <Input.TextArea value={appearance} autoSize={{ minRows: 4, maxRows: 10 }} onChange={(event) => setAppearance(event.target.value)} aria-label={APPEARANCE_LABEL[cast.kind]} />
            </Field>
            {isCharacter ? (
                <Field label={reviewText("声线")} hint={reviewText("写进视频提示词，由视频模型生成对白")}>
                    <Input value={voiceInstructions} placeholder={reviewText("少年音，坚毅，语速偏快")} onChange={(event) => setVoiceInstructions(event.target.value)} aria-label={reviewText("声线")} />
                </Field>
            ) : null}
            <div className="drama-editor-impact">
                <Checkbox checked={restyle} onChange={(event) => setRestyle(event.target.checked)}>
                    {reviewText("让引用它的剧情段视频重新生成")}
                </Checkbox>
                {impact ? (
                    <span>
                        {impact.episodes}
                        {reviewText("集 ·")}
                        {impact.segments}
                        {reviewText("段")}
                    </span>
                ) : null}
            </div>
            <div className="drama-editor-actions">
                <Button disabled={!dirty} loading={save.isPending} onClick={() => save.mutate()}>
                    {reviewText("保存设定")}
                </Button>
                <Button type="primary" icon={<RefreshCw className="size-4" />} disabled={cast.locked || mediaBusy(cast.imageStatus)} loading={regenerate.isPending} onClick={() => regenerate.mutate()}>
                    {cast.imageResourceId ? (dirty ? reviewText("保存并重新生成") : reviewText("重新生成")) : dirty ? reviewText("保存并生成参考图") : reviewText("生成参考图")}
                </Button>
            </div>
            <p className="drama-editor-note">{reviewText("旧版本保留在版本记录中；锁定后参考图不会被重新生成。")}</p>
            {previewing && cast.imageResourceId ? <CanvasImagePreview storageKey={`resource:${cast.imageResourceId}`} alt={reviewText("{v0} · {v1}参考图", { v0: cast.name, v1: kindLabel })} onClose={() => setPreviewing(false)} /> : null}
        </div>
    );
}

const APPEARANCE_LABEL: Record<DramaCastKind, string> = {
    get character() {
        return reviewText("外貌描述");
    },
    get prop() {
        return reviewText("外形描述");
    },
    get scene() {
        return reviewText("环境描述");
    },
};

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
    useReviewLocale();
    return (
        <div className="drama-field">
            <div className="drama-field-label">
                <span>{label}</span>
                {hint ? <small>{hint}</small> : null}
            </div>
            {children}
        </div>
    );
}

// ===== 待处理 =====

type InboxGroup = {
    key: string;
    kind: DramaInboxItem["kind"];
    severity: DramaInboxItem["severity"];
    title: string;
    reason: string;
    items: DramaInboxItem[];
};

const KIND_ORDER: DramaInboxItem["kind"][] = ["paused", "media_ready", "review", "episode_error", "cast_failed", "segment_failed"];
const MEDIA_LABEL: Record<NonNullable<DramaInboxItem["media"]>, string> = {
    get prompt() {
        return reviewText("提示词");
    },
    get video() {
        return reviewText("视频");
    },
};

/** 同类、同原因的问题折叠成一组：12 个角色同样的失败只占一张卡。 */
function groupInbox(items: DramaInboxItem[]): InboxGroup[] {
    const groups = new Map<string, InboxGroup>();
    for (const item of items) {
        const reason = item.kind === "review" ? "" : item.detail;
        const key = [item.kind, item.castKind || "", item.media || "", reason].join("|");
        const group = groups.get(key);
        if (group) group.items.push(item);
        else groups.set(key, { key, kind: item.kind, severity: item.severity, title: "", reason, items: [item] });
    }
    for (const group of groups.values()) {
        const count = group.items.length;
        const first = group.items[0];
        if (group.kind === "paused") group.title = reviewText("制作已暂停");
        else if (group.kind === "media_ready") group.title = reviewServerText(first.title);
        else if (group.kind === "review") group.title = count > 1 ? reviewText("{v0} 集视频提示词等待审阅", { v0: count }) : reviewServerText(first.title);
        else if (group.kind === "episode_error") group.title = count > 1 ? reviewText("{v0} 集改编遇到问题", { v0: count }) : reviewServerText(first.title);
        else if (group.kind === "cast_failed") group.title = reviewText("{v0} 个{v1}参考图生成失败", { v0: count, v1: CAST_KIND_LABEL[first.castKind || "character"] });
        else group.title = reviewText("{v0} 个剧情段{v1}生成失败", { v0: count, v1: MEDIA_LABEL[first.media || "video"] });
    }
    return [...groups.values()].sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || b.items.length - a.items.length);
}

const GROUP_ICON: Record<DramaInboxItem["kind"], ReactNode> = {
    paused: <PauseCircle className="size-[18px]" />,
    media_ready: <Sparkles className="size-[18px]" />,
    review: <CheckCheck className="size-[18px]" />,
    episode_error: <ScrollText className="size-[18px]" />,
    cast_failed: <UserRound className="size-[18px]" />,
    segment_failed: <Film className="size-[18px]" />,
};

const MEDIA_ICON: Record<NonNullable<DramaInboxItem["media"]>, ReactNode> = {
    prompt: <ScrollText className="size-3" />,
    video: <Film className="size-3" />,
};

const CHIP_LIMIT = 24;

export function InboxPanel({
    items,
    castById,
    retrying,
    retryingGroup,
    releasing,
    onRetryAll,
    onRetryGroup,
    onOpen,
    onOpenSettings,
    onReleaseAll,
}: {
    items: DramaInboxItem[];
    castById: Map<string, DramaCast>;
    retrying: boolean;
    retryingGroup: string;
    onRetryAll: () => void;
    onRetryGroup: (key: string, items: DramaInboxItem[]) => void;
    onOpen: (item: DramaInboxItem) => void;
    onOpenSettings: () => void;
    releasing: boolean;
    onReleaseAll: () => void;
}) {
    const locale = useReviewLocale();
    const groups = useMemo(() => groupInbox(items), [items, locale]);
    const failures = items.filter((item) => item.severity === "error").length;
    const reviews = items.filter((item) => item.kind === "review").length;
    return (
        <div className="drama-view">
            <section className="drama-view-main">
                <div className="drama-view-head">
                    <h2 className="drama-view-title">{reviewText("待处理")}</h2>
                    {items.length ? (
                        <div className="drama-inbox-summary">
                            {failures ? (
                                <span className="is-err">
                                    <AlertCircle className="size-3.5" />
                                    {failures}
                                    {reviewText("项失败")}
                                </span>
                            ) : null}
                            {reviews ? (
                                <span className="is-info">
                                    <CheckCheck className="size-3.5" />
                                    {reviews}
                                    {reviewText("集待审阅")}
                                </span>
                            ) : null}
                            <span>
                                {reviewText("共")}
                                {groups.length}
                                {reviewText("类")}
                            </span>
                        </div>
                    ) : null}
                    {failures ? (
                        <Button className="!ml-auto" icon={<RotateCcw className="size-4" />} loading={retrying} onClick={onRetryAll}>
                            {reviewText("全部重试")}
                        </Button>
                    ) : null}
                </div>
                <div className="drama-view-scroll thin-scrollbar">
                    {groups.length ? (
                        <div className="drama-inbox">
                            {groups.map((group) => {
                                const retryable = group.kind === "cast_failed" || group.kind === "segment_failed";
                                return (
                                    <article key={group.key} className={`drama-inbox-card is-${group.severity}`}>
                                        <header className="drama-inbox-card-head">
                                            <span className={`drama-inbox-icon is-${group.severity}`}>{GROUP_ICON[group.kind]}</span>
                                            <div className="min-w-0 flex-1">
                                                <h3>{group.title}</h3>
                                                {group.kind === "review" ? (
                                                    <p>{reviewText("核对各段视频提示词与参考图后继续生成视频")}</p>
                                                ) : group.kind === "cast_failed" ? (
                                                    <p>{reviewText("可修改外观描述后重新生成，或直接重试")}</p>
                                                ) : group.kind === "media_ready" ? (
                                                    <p>{reviewServerText(group.items[0].detail)}</p>
                                                ) : null}
                                            </div>
                                            <div className="drama-inbox-card-actions">
                                                {group.kind === "paused" ? (
                                                    <Button size="small" onClick={onOpenSettings}>
                                                        {reviewText("去设置")}
                                                    </Button>
                                                ) : null}
                                                {group.kind === "media_ready" ? (
                                                    <Button size="small" type="primary" icon={<Sparkles className="size-3.5" />} loading={releasing} onClick={onReleaseAll}>
                                                        {reviewText("全部开始生成")}
                                                    </Button>
                                                ) : null}
                                                {retryable ? (
                                                    <Button size="small" icon={<RotateCcw className="size-3.5" />} loading={retryingGroup === group.key} onClick={() => onRetryGroup(group.key, group.items)}>
                                                        {reviewText("重试")}
                                                        {group.items.length > 1 ? reviewText(" {v0} 项", { v0: group.items.length }) : ""}
                                                    </Button>
                                                ) : null}
                                                {group.items.length === 1 && group.kind !== "paused" && group.kind !== "media_ready" ? (
                                                    <Button size="small" type={group.kind === "review" ? "primary" : "default"} onClick={() => onOpen(group.items[0])}>
                                                        {group.kind === "review" ? reviewText("去审阅") : reviewText("查看")}
                                                        <ArrowRight className="size-3.5" />
                                                    </Button>
                                                ) : null}
                                            </div>
                                        </header>
                                        {group.reason && group.kind !== "media_ready" ? (
                                            <div className="drama-inbox-reason" title={reviewServerText(group.reason)}>
                                                <span>{reviewText("原因")}</span>
                                                <code>{reviewServerText(group.reason)}</code>
                                            </div>
                                        ) : null}
                                        {group.items.length > 1 || group.kind === "cast_failed" ? (
                                            <div className="drama-inbox-chips">
                                                {group.items.slice(0, CHIP_LIMIT).map((item) => (
                                                    <InboxChip key={item.id} item={item} cast={item.castId ? castById.get(item.castId) : undefined} onOpen={onOpen} />
                                                ))}
                                                {group.items.length > CHIP_LIMIT ? (
                                                    <span className="drama-inbox-more">
                                                        {reviewText("另有")}
                                                        {group.items.length - CHIP_LIMIT}
                                                        {reviewText("项")}
                                                    </span>
                                                ) : null}
                                            </div>
                                        ) : null}
                                    </article>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="drama-empty is-tall">
                            <Inbox className="size-8" />
                            <strong>{reviewText("一切顺利")}</strong>
                            <span>{reviewText("没有需要你处理的事项，流水线会在需要确认或出错时提醒你。")}</span>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

function InboxChip({ item, cast, onOpen }: { item: DramaInboxItem; cast?: DramaCast; onOpen: (item: DramaInboxItem) => void }) {
    useReviewLocale();
    let content: ReactNode;
    if (item.kind === "cast_failed") {
        content = (
            <>
                <span className="drama-avatar">{cast?.imageResourceId ? <MediaThumb resourceId={cast.imageResourceId} alt="" /> : item.title.slice(0, 1)}</span>
                {item.title}
            </>
        );
    } else if (item.kind === "segment_failed") {
        content = (
            <>
                {item.media ? MEDIA_ICON[item.media] : null}
                {reviewText("第 {v0} 集 · 第 {v1} 段", { v0: item.episodeNumber, v1: item.segmentIndex + 1 })}
            </>
        );
    } else if (item.kind === "review") {
        content = (
            <>
                <Clapperboard className="size-3" />
                {reviewServerText(item.title)}
            </>
        );
    } else {
        content = reviewServerText(item.title);
    }
    return (
        <button type="button" className={`drama-inbox-chip ${item.kind === "cast_failed" ? "has-avatar" : ""}`} title={reviewServerText(item.detail)} onClick={() => onOpen(item)}>
            {content}
        </button>
    );
}

// ===== 制作设置 =====

const CAPABILITY_META: Record<DramaCapability, { label: string; hint: string }> = {
    text: {
        get label() {
            return reviewText("改编与分镜");
        },
        get hint() {
            return reviewText("改编剧本、拆分剧情段与镜头");
        },
    },
    image: {
        get label() {
            return reviewText("参考图");
        },
        get hint() {
            return reviewText("角色、道具与场景参考图");
        },
    },
    video: {
        get label() {
            return reviewText("剧情段视频");
        },
        get hint() {
            return reviewText("每段一个带对白与音效的视频，可按段换模型");
        },
    },
};
const REVIEW_LABEL: Record<DramaReviewMode, { title: string; detail: string }> = {
    sample: {
        get title() {
            return reviewText("先看样片");
        },
        get detail() {
            return reviewText("第 1 集成片确认后继续其余集");
        },
    },
    every: {
        get title() {
            return reviewText("每集确认");
        },
        get detail() {
            return reviewText("每集生成视频前停下来审阅段视频提示词");
        },
    },
    auto: {
        get title() {
            return reviewText("全自动");
        },
        get detail() {
            return reviewText("不打断，直接跑到成片");
        },
    },
};
const CONCURRENCY = [2, 4, 6, 8, 12, 16];

export function SettingsPanel({ projectId, summary, cast, onChanged }: { projectId: string; summary: DramaSummary; cast: DramaCast[]; onChanged: () => void }) {
    useReviewLocale();
    const { message, modal } = App.useApp();
    const current = summary.production.settings;
    const [settings, setSettings] = useState(current);
    const [budget, setBudget] = useState(summary.production.budgetMicrocredits / 1_000_000);
    useEffect(() => {
        setSettings(summary.production.settings);
        setBudget(summary.production.budgetMicrocredits / 1_000_000);
    }, [summary.production.settings, summary.production.budgetMicrocredits]);
    const dirty = useMemo(() => JSON.stringify(settings) !== JSON.stringify(current) || Math.round(budget * 1_000_000) !== summary.production.budgetMicrocredits, [budget, current, settings, summary.production.budgetMicrocredits]);
    const save = useMutation({
        mutationFn: () => updateDramaSettings(projectId, { settings, budgetMicrocredits: Math.max(0, Math.round((budget || 0) * 1_000_000)) }),
        onSuccess: () => {
            message.success(reviewText("设置已保存，新任务会使用新配置"));
            onChanged();
        },
        onError: (error) => message.error(error instanceof Error ? reviewServerText(error.message) : reviewText("保存失败")),
    });
    const [restyleSegments, setRestyleSegments] = useState(true);
    const regenerateAll = useMutation({
        mutationFn: (kind: DramaCastKind) => regenerateDramaCasts(projectId, kind, restyleSegments),
        onSuccess: (result, kind) => {
            message.success(
                reviewText("已按当前方案重做 {v0} 个{v1}参考图{v2}{v3}", {
                    v0: result.queued,
                    v1: CAST_KIND_LABEL[kind],
                    v2: result.skipped ? reviewText("，{v0} 个已锁定或正在生成", { v0: result.skipped }) : "",
                    v3: result.affectedSegments ? reviewText("，{v0} 个剧情段需重新生成", { v0: result.affectedSegments }) : "",
                }),
            );
            onChanged();
        },
        onError: (error) => message.error(error instanceof Error ? reviewServerText(error.message) : reviewText("操作失败")),
    });
    const catalogQuery = useDramaModelCatalog();
    const videoOption = catalogQuery.data?.options.video?.find((option) => dramaChoiceKey(option.choice) === dramaChoiceKey(settings.models.video));
    const sampleCharacter = cast.find((item) => item.kind === "character" && item.appearance);
    const sampleScene = cast.find((item) => item.kind === "scene" && item.appearance);
    const countOf = (kind: DramaCastKind) => cast.filter((item) => item.kind === kind).length;
    const spent = summary.production.spentMicrocredits;
    const budgetMicro = Math.round((budget || 0) * 1_000_000);
    const usage = budgetMicro > 0 ? Math.min(1, spent / budgetMicro) : 0;
    return (
        <div className="drama-view">
            <section className="drama-view-main">
                <div className="drama-view-head">
                    <h2 className="drama-view-title">{reviewText("制作设置")}</h2>
                    <span className="drama-view-sub">{dirty ? reviewText("有未保存的修改") : reviewText("修改只影响之后新开始的任务")}</span>
                    <div className="ml-auto flex gap-2">
                        <Button
                            disabled={!dirty}
                            onClick={() => {
                                setSettings(current);
                                setBudget(summary.production.budgetMicrocredits / 1_000_000);
                            }}
                        >
                            {reviewText("还原")}
                        </Button>
                        <Button type="primary" disabled={!dirty} loading={save.isPending} onClick={() => save.mutate()}>
                            {reviewText("保存设置")}
                        </Button>
                    </div>
                </div>
                <div className="drama-view-scroll thin-scrollbar">
                    <div className="drama-cfg">
                        <div className="drama-cfg-main">
                            <section className="drama-cfg-card">
                                <SettingsTitle title={reviewText("分镜规则")} detail={reviewText("对之后改编的集生效；已改编的集可在剧本页“重新改编”")} icon={<Clapperboard className="size-4" />} />
                                <StoryboardRules
                                    value={settings.storyboard}
                                    onChange={(storyboard) => setSettings({ ...settings, storyboard })}
                                    episodeSeconds={settings.episodeSeconds}
                                    onEpisodeSecondsChange={(episodeSeconds) => setSettings({ ...settings, episodeSeconds })}
                                    maxVideoSeconds={videoOption?.maxVideoSeconds}
                                    videoModelLabel={settings.models.video?.label}
                                    bare
                                />
                            </section>
                            <section className="drama-cfg-card">
                                <SettingsTitle title={reviewText("视频提示词技能")} detail={reviewText("撰写剧情段视频提示词时遵循的写作方法；对之后撰写的段生效")} icon={<ScrollText className="size-4" />} />
                                <PromptSkillField value={settings.promptSkill} onChange={(promptSkill) => setSettings({ ...settings, promptSkill })} />
                            </section>
                            <section className="drama-cfg-card">
                                <SettingsTitle title={reviewText("参考图方案")} detail={reviewText("参考图随剧情段视频请求一起发送，是人物与道具保持一致的锚点；修改只影响之后生成的参考图")} icon={<UsersRound className="size-4" />} />
                                <AssetSchemePicker
                                    value={settings.assets}
                                    onChange={(assets) => setSettings({ ...settings, assets })}
                                    sample={{ style: settings.stylePrompt, characterName: sampleCharacter?.name, characterAppearance: sampleCharacter?.appearance, sceneName: sampleScene?.name, sceneAppearance: sampleScene?.appearance }}
                                />
                                <div className="drama-settings-regen">
                                    <div>
                                        <strong>{reviewText("按当前方案重做已有参考图")}</strong>
                                        <span>
                                            {CAST_KINDS.map((kind) => reviewText("{v0} 个{v1}", { v0: countOf(kind), v1: CAST_KIND_LABEL[kind] })).join(" · ")}
                                            {reviewText("；锁定的设定不会变。")}
                                            {dirty ? reviewText("请先保存设置。") : ""}
                                        </span>
                                    </div>
                                    <Checkbox checked={restyleSegments} onChange={(event) => setRestyleSegments(event.target.checked)}>
                                        {reviewText("同时让引用它们的剧情段视频重新生成")}
                                    </Checkbox>
                                    {CAST_KINDS.map((kind) => (
                                        <Button
                                            key={kind}
                                            disabled={dirty || !countOf(kind)}
                                            loading={regenerateAll.isPending && regenerateAll.variables === kind}
                                            onClick={() =>
                                                modal.confirm({
                                                    title: reviewText("按当前方案重做 {v0} 个{v1}参考图？", { v0: countOf(kind), v1: CAST_KIND_LABEL[kind] }),
                                                    content: reviewText("每张参考图都会重新生成并计费{v0}。旧版本保留在版本记录中。", { v0: restyleSegments ? reviewText("，引用它们且已生成的剧情段视频需要重新生成") : "" }),
                                                    okText: reviewText("开始重做"),
                                                    cancelText: reviewText("取消"),
                                                    centered: true,
                                                    onOk: () => regenerateAll.mutateAsync(kind),
                                                })
                                            }
                                        >
                                            {reviewText("重做")}
                                            {CAST_KIND_LABEL[kind]}
                                        </Button>
                                    ))}
                                </div>
                            </section>
                            <section className="drama-cfg-card">
                                <SettingsTitle title={reviewText("制作模型")} detail={reviewText("只列出平台可无人值守执行的模型")} icon={<Wand2 className="size-4" />} />
                                <div className="drama-cfg-models">
                                    {(Object.keys(CAPABILITY_META) as DramaCapability[]).map((capability) => (
                                        <div key={capability} className="drama-cfg-model">
                                            <div className="drama-cfg-model-label">
                                                <strong>{CAPABILITY_META[capability].label}</strong>
                                                <small>{CAPABILITY_META[capability].hint}</small>
                                            </div>
                                            <DramaModelPicker
                                                capability={capability}
                                                value={settings.models[capability]}
                                                placeholder={reviewText("选择{v0}模型", { v0: CAPABILITY_META[capability].label })}
                                                onChange={(choice) => setSettings({ ...settings, models: { ...settings.models, [capability]: choice } })}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>
                        <aside className="drama-cfg-side">
                            <section className="drama-cfg-card">
                                <SettingsTitle title={reviewText("作品")} detail={reviewText("开工时确定")} />
                                <dl className="drama-cfg-kv">
                                    <div>
                                        <dt>{reviewText("画幅")}</dt>
                                        <dd>{current.aspectRatio}</dd>
                                    </div>
                                    <div>
                                        <dt>{reviewText("视觉风格")}</dt>
                                        <dd title={current.styleName}>{current.styleName || "—"}</dd>
                                    </div>
                                    <div>
                                        <dt>{reviewText("对白语言")}</dt>
                                        <dd>{current.language}</dd>
                                    </div>
                                </dl>
                            </section>
                            <section className="drama-cfg-card">
                                <SettingsTitle title={reviewText("审阅方式")} detail={reviewText("只在关键点打断你")} />
                                <CompactRadios
                                    label={reviewText("审阅方式")}
                                    value={settings.reviewMode}
                                    options={(Object.keys(REVIEW_LABEL) as DramaReviewMode[]).map((mode) => ({ value: mode, ...REVIEW_LABEL[mode] }))}
                                    onChange={(reviewMode) => setSettings({ ...settings, reviewMode })}
                                />
                            </section>
                            <section className="drama-cfg-card">
                                <SettingsTitle title={reviewText("生成节奏")} detail={settings.mediaMode === "manual" ? reviewText("{v0} 集等待生成视频", { v0: summary.episodes.filter((episode) => episode.awaitingMedia).length }) : undefined} />
                                <CompactRadios
                                    label={reviewText("生成节奏")}
                                    value={settings.mediaMode}
                                    options={(Object.keys(MEDIA_MODE_LABEL) as DramaMediaMode[]).map((mode) => ({ value: mode, ...MEDIA_MODE_LABEL[mode] }))}
                                    onChange={(mediaMode) => setSettings({ ...settings, mediaMode })}
                                />
                                {settings.mediaMode !== current.mediaMode && settings.mediaMode === "manual" ? <p className="drama-cfg-note">{reviewText("改为手动后，未放行的集停在当前阶段，已提交的任务会做完。")}</p> : null}
                            </section>
                            <section className="drama-cfg-card">
                                <SettingsTitle title={reviewText("同时生成数")} detail={reviewText("受账号并发上限约束")} />
                                <div className="drama-tabs drama-cfg-seg" role="radiogroup" aria-label={reviewText("同时生成数")}>
                                    {CONCURRENCY.map((value) => (
                                        <button key={value} type="button" role="radio" className="drama-tab" aria-checked={settings.concurrency === value} onClick={() => setSettings({ ...settings, concurrency: value })}>
                                            {value}
                                        </button>
                                    ))}
                                </div>
                            </section>
                            <section className="drama-cfg-card">
                                <SettingsTitle title={reviewText("预算上限")} detail={reviewText("设置预算，超出后暂停")} />
                                <InputNumber className="!w-full" min={1} precision={0} value={budget} onChange={(value) => setBudget(value || 0)} suffix={reviewText("积分")} aria-label={reviewText("预算上限")} />
                                <div className="drama-budget-meter">
                                    <div className="drama-budget-track">
                                        <span className={usage >= 0.9 ? "is-warn" : ""} style={progressFillStyle(budgetMicro ? Math.max(usage * 100, spent ? 2 : 0) : 0)} />
                                    </div>
                                    <span>
                                        {reviewText("已花费")}
                                        <b>{formatCredits(spent)}</b>
                                        {budgetMicro ? ` / ${formatCredits(budgetMicro)}` : reviewText(" · 不限预算")}
                                    </span>
                                </div>
                            </section>
                        </aside>
                    </div>
                </div>
            </section>
        </div>
    );
}

/** 侧栏里的紧凑单选列表：一行标题，说明作为次要文字，选中态只改边框和底色。 */
function CompactRadios<V extends string>({ label, value, options, onChange }: { label: string; value: V; options: Array<{ value: V; title: string; detail: string }>; onChange: (value: V) => void }) {
    useReviewLocale();
    return (
        <div className="drama-cfg-radios" role="radiogroup" aria-label={label}>
            {options.map((option) => (
                <button key={option.value} type="button" role="radio" aria-checked={value === option.value} className="drama-cfg-radio" onClick={() => onChange(option.value)}>
                    <span className="drama-radio" aria-hidden />
                    <span className="min-w-0">
                        <strong>{option.title}</strong>
                        <small>{option.detail}</small>
                    </span>
                </button>
            ))}
        </div>
    );
}

function SettingsTitle({ title, detail, icon }: { title: string; detail?: string; icon?: ReactNode }) {
    useReviewLocale();
    return (
        <div className="drama-settings-title">
            <h3>
                {icon}
                {title}
            </h3>
            {detail ? <span>{detail}</span> : null}
        </div>
    );
}
