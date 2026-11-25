import { reviewText, useReviewLocale } from "@/i18n/drama-messages";
import { useEffect, useState } from "react";
import { Dropdown, Input, InputNumber } from "antd";
import { ChevronDown, Film, TriangleAlert } from "lucide-react";

import {
    averageShotSeconds,
    clampEpisodeSeconds,
    EPISODE_PRESETS,
    formatEpisodeSeconds,
    lineTarget,
    MAX_EPISODE_SECONDS,
    MAX_SEGMENT_SECONDS,
    MIN_EPISODE_SECONDS,
    MIN_SEGMENT_SECONDS,
    normalizeStoryboard,
    parseEpisodeSeconds,
    segmentLimits,
    segmentTargetSeconds,
    shotTarget,
    TRANSITION_LABEL,
    type SegmentLimits,
} from "@/lib/drama/storyboard";
import type { DramaSegmentMode, DramaStoryboardSettings } from "@/services/api/drama";

/** 单集时长：可直接输入“5分钟 / 300 / 2:30”，也可点右侧从常用时长里选。 */
export function EpisodeDurationInput({ value, onChange }: { value: number; onChange: (seconds: number) => void }) {
    useReviewLocale();
    const [text, setText] = useState(formatEpisodeSeconds(value));
    const [error, setError] = useState("");
    const [open, setOpen] = useState(false);
    useEffect(() => setText(formatEpisodeSeconds(value)), [value]);
    const commit = (raw: string) => {
        const parsed = parseEpisodeSeconds(raw);
        if (parsed === null) {
            setError(reviewText("可输入 90、5分钟、2:30"));
            setText(formatEpisodeSeconds(value));
            return;
        }
        const seconds = clampEpisodeSeconds(parsed);
        setError(seconds !== parsed ? reviewText("单集时长需在 {v0}–{v1} 之间，已调整", { v0: formatEpisodeSeconds(MIN_EPISODE_SECONDS), v1: formatEpisodeSeconds(MAX_EPISODE_SECONDS) }) : "");
        onChange(seconds);
        setText(formatEpisodeSeconds(seconds));
    };
    return (
        <div className="drama-field">
            <Dropdown
                open={open}
                onOpenChange={setOpen}
                trigger={["click"]}
                placement="bottomLeft"
                menu={{
                    selectable: true,
                    selectedKeys: [String(value)],
                    items: EPISODE_PRESETS.map((seconds) => ({
                        key: String(seconds),
                        label: (
                            <span className="drama-duration-option">
                                <span>{formatEpisodeSeconds(seconds)}</span>
                                <small>
                                    {seconds}
                                    {reviewText("秒")}
                                </small>
                            </span>
                        ),
                    })),
                    onClick: ({ key }) => {
                        setOpen(false);
                        setError("");
                        onChange(Number(key));
                    },
                }}
            >
                <Input
                    value={text}
                    placeholder={reviewText("如 90、5分钟、2:30")}
                    aria-label={reviewText("单集时长")}
                    onChange={(event) => {
                        setText(event.target.value);
                        setError("");
                    }}
                    onBlur={() => commit(text)}
                    onPressEnter={(event) => {
                        commit(text);
                        setOpen(false);
                        (event.target as HTMLInputElement).blur();
                    }}
                    suffix={<ChevronDown className={`size-3.5 opacity-50 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />}
                />
            </Dropdown>
            {error ? (
                <small className="drama-field-error">{error}</small>
            ) : (
                <small className="drama-field-hint">
                    {reviewText("约")}
                    {Math.round((value / 60) * 10) / 10}
                    {reviewText("分钟 · 也可直接输入")}
                </small>
            )}
        </div>
    );
}

const SEGMENT_MODES: Array<{ value: DramaSegmentMode; label: string; detail: string }> = [
    {
        value: "auto",
        get label() {
            return reviewText("智能");
        },
        get detail() {
            return reviewText("按场景切换与冲突转折切段，单段不超过视频模型单次上限");
        },
    },
    {
        value: "fixed",
        get label() {
            return reviewText("固定");
        },
        get detail() {
            return reviewText("每段固定秒数，跨场景也按时长切");
        },
    },
    {
        value: "range",
        get label() {
            return reviewText("范围");
        },
        get detail() {
            return reviewText("每段在设定范围内，达到下限后在场景切换处断开");
        },
    },
];

/** 剧情段切法的一句话说明，分镜规则卡与剧本页共用。 */
export function segmentRuleLabel(limits: SegmentLimits) {
    if (limits.mode === "fixed") return reviewText("每段 {v0} 秒", { v0: limits.max });
    if (limits.mode === "range") return reviewText("每段 {v0}–{v1} 秒", { v0: limits.min, v1: limits.max });
    return limits.max ? reviewText("智能切段 · 单段不超过 {v0} 秒", { v0: limits.max }) : reviewText("智能切段");
}
const PACING: Array<{ value: DramaStoryboardSettings["pacing"]; label: string; detail: string }> = [
    {
        value: "fast",
        get label() {
            return reviewText("快节奏");
        },
        get detail() {
            return reviewText("2–4 秒短镜，冲突处密集切换");
        },
    },
    {
        value: "standard",
        get label() {
            return reviewText("标准");
        },
        get detail() {
            return reviewText("2–5 秒为主，关键台词可到 6 秒");
        },
    },
    {
        value: "slow",
        get label() {
            return reviewText("舒缓");
        },
        get detail() {
            return reviewText("4–8 秒长镜，营造情绪");
        },
    },
];
const DIALOGUE: Array<{ value: DramaStoryboardSettings["dialogue"]; label: string; detail: string }> = [
    {
        value: "dense",
        get label() {
            return reviewText("密集");
        },
        get detail() {
            return reviewText("约每 3 秒一句台词或旁白，单句不超过 12 字，适合爽剧、对手戏");
        },
    },
    {
        value: "standard",
        get label() {
            return reviewText("标准");
        },
        get detail() {
            return reviewText("约每 4.5 秒一句，单句不超过 16 字");
        },
    },
    {
        value: "sparse",
        get label() {
            return reviewText("克制");
        },
        get detail() {
            return reviewText("约每 7 秒一句，单句不超过 20 字，留给动作与氛围");
        },
    },
];
const TRANSITIONS: Array<{ value: DramaStoryboardSettings["transition"]; label: string; detail: string }> = [
    {
        value: "auto",
        get label() {
            return reviewText("智能");
        },
        get detail() {
            return reviewText("默认硬切，场景跳转用黑场，回忆用闪白");
        },
    },
    {
        value: "cut",
        get label() {
            return TRANSITION_LABEL.cut;
        },
        get detail() {
            return reviewText("全部直接切换");
        },
    },
    {
        value: "fadeblack",
        get label() {
            return TRANSITION_LABEL.fadeblack;
        },
        get detail() {
            return reviewText("每次切镜都经过黑场");
        },
    },
    {
        value: "fadewhite",
        get label() {
            return TRANSITION_LABEL.fadewhite;
        },
        get detail() {
            return reviewText("每次切镜都短暂闪白");
        },
    },
];

function Segmented<V extends string | number>({ label, value, options, onChange }: { label: string; value: V; options: Array<{ value: V; label: string; detail?: string }>; onChange: (value: V) => void }) {
    useReviewLocale();
    return (
        <div className="drama-tabs is-block" role="radiogroup" aria-label={label}>
            {options.map((item) => (
                <button key={String(item.value)} type="button" role="radio" className="drama-tab" aria-checked={value === item.value} title={item.detail} onClick={() => onChange(item.value)}>
                    {item.label}
                </button>
            ))}
        </div>
    );
}

/**
 * 分镜规则：决定剧情段多长、段内镜头节奏、台词密度与转场。改编剧本前设置，之后修改对新改编的集生效。
 * onEpisodeSecondsChange 有值时把“单集时长”作为第一行放进来；bare 用于已有外框的卡片内。
 */
export function StoryboardRules({
    value,
    onChange,
    episodeSeconds,
    onEpisodeSecondsChange,
    maxVideoSeconds,
    videoModelLabel,
    bare,
}: {
    value?: DramaStoryboardSettings;
    onChange: (value: DramaStoryboardSettings) => void;
    episodeSeconds: number;
    onEpisodeSecondsChange?: (seconds: number) => void;
    maxVideoSeconds?: number;
    videoModelLabel?: string;
    bare?: boolean;
}) {
    useReviewLocale();
    const rules = normalizeStoryboard(value);
    const set = (patch: Partial<DramaStoryboardSettings>) => onChange(normalizeStoryboard({ ...rules, ...patch }));
    const limits = segmentLimits(rules, maxVideoSeconds);
    const target = segmentTargetSeconds(limits);
    const modelName = videoModelLabel || reviewText("视频模型");
    // 用户填的秒数超过模型单次上限时按上限执行，明确告诉用户而不是静默改值。
    const requested = rules.segmentMode === "fixed" ? rules.segmentSeconds : rules.segmentMode === "range" ? rules.segmentMaxSeconds : 0;
    const capped = Boolean(maxVideoSeconds && requested > maxVideoSeconds);
    const number = (value: number, onValue: (seconds: number) => void, label: string, bounds: { min: number; max: number }) => (
        <InputNumber
            className="drama-sbrules-number"
            size="small"
            min={bounds.min}
            max={bounds.max}
            precision={0}
            value={value}
            suffix={reviewText("秒")}
            aria-label={label}
            onChange={(next) => {
                if (typeof next === "number") onValue(next);
            }}
        />
    );
    return (
        <div className={`drama-sbrules ${bare ? "is-bare" : ""}`}>
            {onEpisodeSecondsChange ? (
                <div className="drama-sbrules-row">
                    <span className="drama-sbrules-label">{reviewText("单集时长")}</span>
                    <div className="drama-sbrules-duration">
                        <EpisodeDurationInput value={episodeSeconds} onChange={onEpisodeSecondsChange} />
                    </div>
                </div>
            ) : null}
            <div className="drama-sbrules-row">
                <span className="drama-sbrules-label">{reviewText("剧情段")}</span>
                <div className="drama-sbrules-segment">
                    <Segmented label={reviewText("剧情段切分")} value={rules.segmentMode} options={SEGMENT_MODES} onChange={(segmentMode) => set({ segmentMode })} />
                    {rules.segmentMode === "fixed" ? number(rules.segmentSeconds, (segmentSeconds) => set({ segmentSeconds }), reviewText("每段时长"), { min: MIN_SEGMENT_SECONDS, max: MAX_SEGMENT_SECONDS }) : null}
                    {rules.segmentMode === "range" ? (
                        <>
                            {number(rules.segmentMinSeconds, (segmentMinSeconds) => set({ segmentMinSeconds }), reviewText("每段最短"), { min: MIN_SEGMENT_SECONDS, max: rules.segmentMaxSeconds })}
                            <span className="drama-sbrules-dash">{reviewText("至")}</span>
                            {number(rules.segmentMaxSeconds, (segmentMaxSeconds) => set({ segmentMaxSeconds }), reviewText("每段最长"), { min: rules.segmentMinSeconds, max: MAX_SEGMENT_SECONDS })}
                        </>
                    ) : null}
                    <span className="drama-sbrules-hint">
                        {rules.segmentMode === "auto"
                            ? maxVideoSeconds
                                ? reviewText("按场景与冲突切段，单段不超过 {v0} 秒（{v1}上限）", { v0: maxVideoSeconds, v1: modelName })
                                : reviewText("按场景与冲突切段，单段不超过视频模型单次上限")
                            : SEGMENT_MODES.find((item) => item.value === rules.segmentMode)?.detail}
                    </span>
                </div>
            </div>
            <div className="drama-sbrules-row">
                <span className="drama-sbrules-label">{reviewText("镜头节奏")}</span>
                <Segmented label={reviewText("镜头节奏")} value={rules.pacing} options={PACING} onChange={(pacing) => set({ pacing })} />
            </div>
            <div className="drama-sbrules-row">
                <span className="drama-sbrules-label">{reviewText("对白密度")}</span>
                <Segmented label={reviewText("对白密度")} value={rules.dialogue} options={DIALOGUE} onChange={(dialogue) => set({ dialogue })} />
            </div>
            <div className="drama-sbrules-row">
                <span className="drama-sbrules-label">{reviewText("转场")}</span>
                <Segmented label={reviewText("镜头转场")} value={rules.transition} options={TRANSITIONS} onChange={(transition) => set({ transition })} />
            </div>
            {rules.transition !== "cut" ? (
                <div className="drama-sbrules-row">
                    <span className="drama-sbrules-label">{reviewText("转场时长")}</span>
                    <InputNumber className="drama-sbrules-number" min={150} max={1500} step={50} value={rules.transitionMs} onChange={(next) => set({ transitionMs: next || 400 })} suffix={reviewText("毫秒")} aria-label={reviewText("转场时长")} />
                    <span className="drama-sbrules-hint">{TRANSITIONS.find((item) => item.value === rules.transition)?.detail}</span>
                </div>
            ) : null}
            <div className="drama-sbrules-summary">
                <Film className="size-3.5" />
                <span>
                    {reviewText("每集约")}
                    <b>{shotTarget(rules, episodeSeconds)}</b>
                    {reviewText("个镜头、至少")}
                    <b>{lineTarget(rules, episodeSeconds)}</b>
                    {reviewText("句台词")}
                    {target ? (
                        <>
                            {" "}
                            · {segmentRuleLabel(limits)}，{limits.mode === "auto" ? reviewText("至少") : reviewText("约")} <b>{Math.max(1, Math.ceil(episodeSeconds / target))}</b>
                            {reviewText("段 · 每段约")}
                            <b>{Math.max(1, Math.round(target / averageShotSeconds(rules)))}</b>
                            {reviewText("镜")}
                        </>
                    ) : null}
                </span>
            </div>
            {capped ? (
                <p className="drama-sbrules-warn">
                    <TriangleAlert className="size-3.5 shrink-0" />
                    {modelName}
                    {reviewText("单次最长")}
                    {maxVideoSeconds}
                    {reviewText("秒，")}
                    {rules.segmentMode === "fixed" ? reviewText("剧情段按 {v0} 秒切分", { v0: maxVideoSeconds }) : reviewText("剧情段上限按 {v0} 秒执行", { v0: maxVideoSeconds })}。
                </p>
            ) : null}
        </div>
    );
}
