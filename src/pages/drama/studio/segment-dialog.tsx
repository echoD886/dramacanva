import { reviewLocale, reviewServerText, reviewText, useReviewLocale } from "@/i18n/drama-messages";
import { currentLocaleText } from "@/i18n/current-locale-text";
import { upstreamText } from "@/i18n/ddcat-updates";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { App, Button, Input, InputNumber, Select } from "antd";
import { Tooltip } from "antd";
import { ChevronLeft, ChevronRight, Copy, Loader2, Play, RotateCcw, Sparkles, X } from "lucide-react";

import { AppModal } from "@/components/ui/product/app-modal";
import { TRANSITION_LABEL } from "@/lib/drama/storyboard";
import type { DramaCast, DramaEpisodeDetail, DramaModelChoice, DramaSegment, DramaShot, DramaShotPatch, DramaTransition } from "@/services/api/drama";
import { dramaChoiceKey } from "@/lib/drama/model-choice";

import { DramaModelPicker } from "../drama-model-picker";

import { mediaBusy } from "../drama-shared";
import { promptReady, secondsLabel, SegmentInputs, SegmentStatus, SegmentVideo, videoWaitLabel } from "./segment-parts";
import { SegmentPromptRewrite } from "./segment-prompt-rewrite";
import { SegmentWorldEngine } from "./segment-world-engine";

const SHOT_SIZES = ["特写", "近景", "中景", "全景", "远景"];
const CAMERAS = ["固定", "推", "拉", "摇", "跟", "环绕", "升降", "手持"];

const PROMPT_NOTICE: Record<DramaSegment["promptStatus"], string> = {
    get conflict() {
        return currentLocaleText("canvasNov21.drama.conflict");
    },
    get review() {
        return currentLocaleText("canvasNov21.drama.review");
    },
    get none() {
        return reviewText("还没有撰写本段视频提示词");
    },
    get queued() {
        return reviewText("排队撰写中…");
    },
    get running() {
        return reviewText("正在撰写本段视频提示词…");
    },
    ready: "",
    get stale() {
        return reviewText("本段镜头或设定改过，提示词已过期，请重新撰写");
    },
    get failed() {
        return reviewText("撰写失败");
    },
};

type Props = {
    projectId: string;
    episodeId: string;
    promptModel: DramaModelChoice;
    detail?: DramaEpisodeDetail;
    segmentIndex?: number;
    shotId?: string;
    castById: Map<string, DramaCast>;
    aspectRatio: string;
    busy: boolean;
    writing: boolean;
    onClose: () => void;
    onNavigate: (segmentIndex: number, shotId?: string) => void;
    onPatchShot: (shot: DramaShot, patch: DramaShotPatch) => void;
    onSavePrompt: (segment: DramaSegment, override: string) => Promise<unknown>;
    onWritePrompt: (segment: DramaSegment) => void;
    onGenerate: (segment: DramaSegment, model?: DramaModelChoice) => void;
    reprocessing: boolean;
    onReprocess: (segment: DramaSegment) => void;
    defaultVideoModel: DramaModelChoice;
    onOpenCast: (castId: string) => void;
};

/**
 * 剧情段弹窗：左侧是段视频、生成依据（首帧与参考图）和段内镜头脚本，右侧是本段完整视频提示词。
 * 提示词区展示的就是提交时发送的全文：开头的参考图对应说明由系统追加，正文可直接修改。
 */
export function SegmentDialog({
    projectId,
    episodeId,
    promptModel,
    detail,
    segmentIndex,
    shotId,
    castById,
    aspectRatio,
    busy,
    writing,
    reprocessing,
    defaultVideoModel,
    onClose,
    onNavigate,
    onPatchShot,
    onSavePrompt,
    onWritePrompt,
    onGenerate,
    onReprocess,
    onOpenCast,
}: Props) {
    useReviewLocale();
    const segments = detail?.segments || [];
    const position = segments.findIndex((item) => item.index === segmentIndex);
    const segment = position >= 0 ? segments[position] : undefined;
    const shots = segment ? (detail?.shots || []).filter((shot) => shot.segmentIndex === segment.index) : [];
    const shot = shots.find((item) => item.id === shotId);
    return (
        <AppModal
            open={Boolean(segment)}
            onCancel={onClose}
            footer={null}
            title={null}
            closable={false}
            flush
            centered
            width="min(1280px, calc(100vw - 48px))"
            rootClassName="drama-root drama-sd-root"
            aria-label={segment ? reviewText("第 {v0} 段", { v0: segment.index + 1 }) : reviewText("剧情段")}
        >
            {segment && detail ? (
                <div className="drama-sd">
                    <header className="drama-sd-head">
                        <div className="min-w-0">
                            <div className="drama-eyebrow">
                                {reviewText("第 {v0} 集 · 第 {v1} / {v2} 段 · {v3} 镜 · {v4}", { v0: detail.episode.number, v1: segment.index + 1, v2: segments.length, v3: shots.length, v4: secondsLabel(segment.durationMs) })}
                            </div>
                            <div className="drama-sd-title">
                                <h2>{segment.title}</h2>
                                <SegmentStatus segment={segment} />
                            </div>
                        </div>
                        <div className="drama-sd-nav">
                            <Tooltip title={reviewText("上一段")}>
                                <Button icon={<ChevronLeft className="size-4" />} aria-label={reviewText("上一段")} disabled={position <= 0} onClick={() => onNavigate(segments[position - 1].index)} />
                            </Tooltip>
                            <Tooltip title={reviewText("下一段")}>
                                <Button icon={<ChevronRight className="size-4" />} aria-label={reviewText("下一段")} disabled={position >= segments.length - 1} onClick={() => onNavigate(segments[position + 1].index)} />
                            </Tooltip>
                            <Button type="text" icon={<X className="size-4" />} aria-label={reviewText("关闭")} onClick={onClose} />
                        </div>
                    </header>
                    <div className="drama-sd-body">
                        <aside className="drama-sd-side thin-scrollbar">
                            <SegmentVideo segment={segment} aspectRatio={aspectRatio} />
                            <SegmentWorldEngine projectId={projectId} episodeId={episodeId} segment={segment} shotId={shot?.id} />
                            {segment.videoStatus === "failed" && segment.videoError ? (
                                <div className="drama-sd-error">
                                    <strong>{segment.videoReprocessable ? reviewText("视频已生成，后处理失败") : reviewText("视频生成失败")}</strong>
                                    <span>{reviewServerText(segment.videoError)}</span>
                                    {segment.videoReprocessable ? (
                                        <>
                                            <span>{reviewText("重新处理只针对这条已生成的视频，不会重新生成或扣费。")}</span>
                                            <div className="drama-sd-error-actions">
                                                <Button size="small" icon={<RotateCcw className="size-3.5" />} loading={reprocessing} disabled={busy} onClick={() => onReprocess(segment)}>
                                                    {reviewText("重新处理视频")}
                                                </Button>
                                            </div>
                                        </>
                                    ) : null}
                                </div>
                            ) : null}
                            {segment.videoStatus === "queued" && segment.videoWait ? (
                                <div className="drama-sd-error is-wait" role="status">
                                    <strong>{reviewText("视频尚未提交")}</strong>
                                    <span>{reviewServerText(segment.videoWait)}</span>
                                </div>
                            ) : null}
                            <SegmentGenerate key={segment.id} segment={segment} busy={busy} defaultVideoModel={defaultVideoModel} onGenerate={(model) => onGenerate(segment, model)} />
                            <section className="drama-sd-block">
                                <div className="drama-sd-label">
                                    <span>{reviewText("生成依据")}</span>
                                    <small>
                                        {segment.request.seconds ? reviewText("生成 {v0} 秒", { v0: segment.request.seconds }) : ""}
                                        {segment.videoModel?.label ? ` · ${segment.videoModel.label}` : ""}
                                    </small>
                                </div>
                                <SegmentInputs segment={segment} castById={castById} onOpenCast={onOpenCast} />
                                {segment.request.warning ? <p className="drama-sg-note is-warn">{reviewServerText(segment.request.warning)}</p> : null}
                            </section>
                            <section className="drama-sd-block">
                                <div className="drama-sd-label">
                                    <span>{reviewText("本段镜头")}</span>
                                    <small>{reviewText("改动后本段提示词与视频需要重新生成")}</small>
                                </div>
                                <div className="drama-sd-shots">
                                    {shots.map((item) => (
                                        <button key={item.id} type="button" className="drama-sd-shot" aria-pressed={item.id === shot?.id} onClick={() => onNavigate(segment.index, item.id === shot?.id ? undefined : item.id)}>
                                            <b>{item.position + 1}</b>
                                            <span>{item.dialogue ? `${item.speaker || reviewText("旁白")}：${item.dialogue}` : item.action || item.imagePrompt}</span>
                                            <em>{secondsLabel(item.durationMs)}</em>
                                        </button>
                                    ))}
                                </div>
                                {shot ? <ShotEditor key={shot.id} shot={shot} onPatch={(patch) => onPatchShot(shot, patch)} /> : null}
                            </section>
                        </aside>
                        <section className="drama-sd-main" aria-label={reviewText("完整视频提示词")}>
                            <SegmentPrompt
                                key={segment.id}
                                projectId={projectId}
                                episodeId={episodeId}
                                promptModel={promptModel}
                                disabled={busy}
                                segment={segment}
                                writing={writing}
                                onSave={(override) => onSavePrompt(segment, override)}
                                onWrite={() => onWritePrompt(segment)}
                            />
                        </section>
                    </div>
                </div>
            ) : null}
        </AppModal>
    );
}

/** 本段视频模型与生成：换模型只对本段生效，与全剧默认相同时不写段级覆盖。 */
function SegmentGenerate({ segment, busy, defaultVideoModel, onGenerate }: { segment: DramaSegment; busy: boolean; defaultVideoModel: DramaModelChoice; onGenerate: (model?: DramaModelChoice) => void }) {
    useReviewLocale();
    const baseline = segment.videoModel?.logicalModelId || segment.videoModel?.modelKey ? segment.videoModel : defaultVideoModel;
    const [choice, setChoice] = useState<DramaModelChoice>(baseline);
    const changed = dramaChoiceKey(choice) !== dramaChoiceKey(baseline);
    const running = mediaBusy(segment.videoStatus);
    return (
        <div className="drama-sd-generate">
            <DramaModelPicker capability="video" size="sm" value={choice} onChange={setChoice} placeholder={reviewText("视频模型")} />
            <Button type="primary" icon={<Play className="size-4" />} disabled={busy || !promptReady(segment) || running} onClick={() => onGenerate(changed ? choice : undefined)}>
                {running
                    ? segment.videoStatus === "queued" && segment.videoWait
                        ? videoWaitLabel(segment.videoWait)
                        : segment.request.firstFramePending
                          ? reviewText("排队中 · 等第 {v0} 段", { v0: segment.index })
                          : reviewText("视频生成中")
                    : segment.videoResourceId && segment.videoStatus !== ""
                      ? reviewText("重新生成本段视频")
                      : reviewText("生成本段视频")}
            </Button>
        </div>
    );
}

function formatSegmentSaveError(error: unknown) {
    if (!(error instanceof Error) || !error.message) {
        const fallback = reviewText("保存失败");
        return !reviewLocale().startsWith("zh") && fallback === "保存失败" ? upstreamText("保存失败，请重试") : fallback;
    }
    const text = reviewServerText(error.message);
    if (!reviewLocale().startsWith("zh") && text === "操作失败") return upstreamText("保存失败，请重试");
    return text || reviewText("保存失败");
}

function SegmentPrompt({
    projectId,
    episodeId,
    promptModel,
    disabled,
    segment,
    writing,
    onSave,
    onWrite,
}: {
    projectId: string;
    episodeId: string;
    promptModel: DramaModelChoice;
    disabled: boolean;
    segment: DramaSegment;
    writing: boolean;
    onSave: (override: string) => Promise<unknown>;
    onWrite: () => void;
}) {
    useReviewLocale();
    const { message } = App.useApp();
    const [draft, setDraft] = useState(segment.videoPrompt);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState("");
    const [saveVersion, setSaveVersion] = useState(0);
    const savingRef = useRef(false);
    const skipBlurCommitRef = useRef(false);
    useEffect(() => setDraft(segment.videoPrompt), [segment.videoPrompt, saveVersion]);
    const busy = segment.promptStatus === "queued" || segment.promptStatus === "running";
    const editingDisabled = disabled || busy || writing || saving;
    const notice = segment.custom && segment.promptStatus === "stale" ? "" : PROMPT_NOTICE[segment.promptStatus];
    const dirty = draft.trim() !== segment.videoPrompt.trim();
    const save = async (value: string) => {
        savingRef.current = true;
        setSaving(true);
        setSaveError("");
        try {
            const next = value.trim();
            await onSave(next === segment.generated.trim() ? "" : next);
            setSaveVersion((version) => version + 1);
        } finally {
            savingRef.current = false;
            setSaving(false);
        }
    };
    const commit = () => {
        if (skipBlurCommitRef.current) {
            skipBlurCommitRef.current = false;
            return;
        }
        if (editingDisabled || savingRef.current || segment.promptStatus === "conflict" || segment.promptStatus === "review") return;
        const next = draft.trim();
        if (!dirty) return;
        if (!next) {
            setDraft(segment.videoPrompt);
            return;
        }
        void save(next).catch((error) => setSaveError(formatSegmentSaveError(error)));
    };
    const sent = [segment.request.header, draft.trim()].filter(Boolean).join("\n\n");
    return (
        <div className="drama-sd-pane">
            <div className="drama-sd-pane-bar">
                <span className="drama-sd-pane-caption">
                    {reviewText("完整视频提示词")}
                    {segment.custom ? <em>{reviewText("已改写")}</em> : null}
                </span>
                <span className="drama-sd-pane-tools">
                    {segment.promptStatus === "conflict" || segment.promptStatus === "review" ? (
                        <>
                            <Button size="small" disabled={editingDisabled || !draft.trim()} loading={saving} onClick={() => void save(draft).catch((error) => setSaveError(formatSegmentSaveError(error)))}>
                                {currentLocaleText("canvasNov21.drama.keepMine")}
                            </Button>
                            <Button size="small" disabled={editingDisabled || !segment.generated.trim()} onClick={() => void save(segment.generated).catch((error) => setSaveError(formatSegmentSaveError(error)))}>
                                {currentLocaleText("canvasNov21.drama.useNew")}
                            </Button>
                        </>
                    ) : null}
                    {!busy && segment.promptStatus !== "none" ? (
                        <Button size="small" type="text" icon={<Sparkles className="size-3.5" />} loading={writing} onClick={onWrite}>
                            {reviewText("重新撰写")}
                        </Button>
                    ) : null}
                    {segment.custom ? (
                        <Button
                            size="small"
                            type="text"
                            disabled={editingDisabled}
                            icon={<RotateCcw className="size-3.5" />}
                            onClick={() => {
                                if (savingRef.current) return;
                                void save("").catch((error) => setSaveError(formatSegmentSaveError(error)));
                            }}
                        >
                            {reviewText("恢复模型版本")}
                        </Button>
                    ) : null}
                    <Button
                        size="small"
                        type="text"
                        icon={<Copy className="size-3.5" />}
                        disabled={!draft}
                        onClick={() =>
                            void navigator.clipboard.writeText(sent).then(
                                () => message.success(reviewText("已复制发送全文")),
                                () => message.error(reviewText("复制失败")),
                            )
                        }
                    >
                        {reviewText("复制发送全文")}
                    </Button>
                </span>
            </div>
            {notice && segment.videoPrompt ? <PromptNotice segment={segment} text={notice} /> : null}
            {segment.request.header ? (
                <div className="drama-sd-header" aria-label={reviewText("系统追加的参考图说明")}>
                    <span>{reviewText("提交时加在开头")}</span>
                    <pre>{segment.request.header}</pre>
                </div>
            ) : null}
            {segment.videoPrompt || draft ? (
                <Input.TextArea
                    className="drama-sd-text thin-scrollbar"
                    disabled={editingDisabled}
                    value={draft}
                    aria-label={reviewText("完整视频提示词")}
                    onFocus={() => {
                        skipBlurCommitRef.current = false;
                    }}
                    onChange={(event) => {
                        skipBlurCommitRef.current = false;
                        setDraft(event.target.value);
                    }}
                    onBlur={commit}
                    onKeyDown={(event) => {
                        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                            event.preventDefault();
                            skipBlurCommitRef.current = false;
                            commit();
                            skipBlurCommitRef.current = true;
                            (event.target as HTMLTextAreaElement).blur();
                        }
                        if (event.key === "Escape" && dirty) {
                            event.preventDefault();
                            event.stopPropagation();
                            skipBlurCommitRef.current = true;
                            setSaveError("");
                            setDraft(segment.videoPrompt);
                            (event.target as HTMLTextAreaElement).blur();
                        }
                    }}
                />
            ) : (
                <div className="drama-sd-empty">
                    {busy ? (
                        <>
                            <Loader2 className="size-5 animate-spin" aria-hidden />
                            <span>{notice}</span>
                            <small>{reviewText("写好后自动显示")}</small>
                        </>
                    ) : (
                        <>
                            <span>
                                {notice}
                                {segment.promptStatus === "failed" && segment.promptError ? `：${reviewServerText(segment.promptError)}` : ""}
                            </span>
                            <Button type="primary" icon={<Sparkles className="size-4" />} loading={writing} onClick={onWrite}>
                                {segment.promptStatus === "none" ? reviewText("撰写视频提示词") : reviewText("重新撰写")}
                            </Button>
                        </>
                    )}
                </div>
            )}
            <div className="drama-sd-pane-foot">
                {segment.promptStatus === "conflict" || segment.promptStatus === "review" ? (
                    <span>{currentLocaleText("canvasNov21.drama.decisionHint")}</span>
                ) : dirty ? (
                    <span className="is-dirty">{reviewText("未保存 · 失焦或 ⌘↵ 保存，Esc 放弃")}</span>
                ) : (
                    <span>{reviewText("直接修改正文，失焦自动保存")}</span>
                )}
                <span>
                    {draft.length}
                    {reviewText("字")}
                </span>
            </div>
            {saveError ? (
                <p role="alert" className="m-0 text-sm text-destructive">
                    {saveError}
                </p>
            ) : null}
            <SegmentPromptRewrite projectId={projectId} episodeId={episodeId} segment={segment} prompt={draft} model={promptModel} disabled={editingDisabled || dirty} onApply={save} />
        </div>
    );
}

function PromptNotice({ segment, text }: { segment: DramaSegment; text: ReactNode }) {
    useReviewLocale();
    const busy = segment.promptStatus === "queued" || segment.promptStatus === "running";
    return (
        <div className={`drama-sd-notice is-${segment.promptStatus}`}>
            {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
            <span>
                {text}
                {segment.promptStatus === "failed" && segment.promptError ? `：${reviewServerText(segment.promptError)}` : ""}
            </span>
        </div>
    );
}

/** 单个镜头的剧本内容；镜头是撰写段提示词的素材，不再单独生成媒体。 */
function ShotEditor({ shot, onPatch }: { shot: DramaShot; onPatch: (patch: DramaShotPatch) => void }) {
    useReviewLocale();
    return (
        <div className="drama-sd-form">
            <FieldText label={reviewText("台词")} value={shot.dialogue} placeholder={reviewText("无台词")} onSave={(value) => onPatch({ dialogue: value })} />
            <div className="drama-sd-row">
                <label className="drama-sd-field">
                    <span className="drama-sd-label">
                        <span>{reviewText("说话人")}</span>
                    </span>
                    <Input
                        defaultValue={shot.speaker}
                        key={`${shot.id}-speaker-${shot.speaker}`}
                        placeholder={reviewText("旁白")}
                        aria-label={reviewText("说话人")}
                        onBlur={(event) => {
                            if (event.target.value.trim() !== shot.speaker) onPatch({ speaker: event.target.value });
                        }}
                    />
                </label>
                <label className="drama-sd-field">
                    <span className="drama-sd-label">
                        <span>{reviewText("时长")}</span>
                    </span>
                    <InputNumber
                        key={`${shot.id}-${shot.durationMs}`}
                        className="!w-full"
                        min={1}
                        max={60}
                        step={0.5}
                        precision={1}
                        defaultValue={shot.durationMs / 1000}
                        suffix={reviewText("秒")}
                        aria-label={reviewText("镜头时长")}
                        onBlur={(event) => {
                            const seconds = Number(event.target.value);
                            if (Number.isFinite(seconds) && Math.abs(seconds * 1000 - shot.durationMs) >= 50) onPatch({ durationSeconds: seconds });
                        }}
                        onPressEnter={(event) => (event.target as HTMLInputElement).blur()}
                    />
                </label>
            </div>
            <div className="drama-sd-row is-three">
                <label className="drama-sd-field">
                    <span className="drama-sd-label">
                        <span>{reviewText("景别")}</span>
                    </span>
                    <Select
                        className="w-full"
                        value={shot.shotSize || undefined}
                        placeholder={reviewText("自动")}
                        aria-label={reviewText("景别")}
                        options={SHOT_SIZES.map((value) => ({ value, label: reviewText(value) }))}
                        onChange={(value) => onPatch({ shotSize: value })}
                    />
                </label>
                <label className="drama-sd-field">
                    <span className="drama-sd-label">
                        <span>{reviewText("运镜")}</span>
                    </span>
                    <Select
                        className="w-full"
                        value={shot.camera || undefined}
                        placeholder={reviewText("自动")}
                        aria-label={reviewText("运镜")}
                        options={CAMERAS.map((value) => ({ value, label: reviewText(value) }))}
                        onChange={(value) => onPatch({ camera: value })}
                    />
                </label>
                <label className="drama-sd-field">
                    <span className="drama-sd-label">
                        <span>{reviewText("转场")}</span>
                    </span>
                    <Select
                        className="w-full"
                        value={(shot.transition || "cut") as DramaTransition}
                        aria-label={reviewText("转场")}
                        options={(Object.keys(TRANSITION_LABEL) as DramaTransition[]).map((value) => ({ value, label: TRANSITION_LABEL[value] }))}
                        disabled={shot.position === 0}
                        onChange={(value) => onPatch({ transition: value })}
                    />
                </label>
            </div>
            <FieldText label={reviewText("动作")} value={shot.action} rows={2} onSave={(value) => onPatch({ action: value })} />
            <FieldText label={reviewText("起幅画面")} value={shot.imagePrompt} rows={2} onSave={(value) => onPatch({ imagePrompt: value })} />
            {shot.sourceQuote ? (
                <div className="drama-sd-quote">
                    <span className="drama-sd-label">
                        <span>{reviewText("原文")}</span>
                    </span>
                    <p>「{shot.sourceQuote}」</p>
                </div>
            ) : null}
        </div>
    );
}

function FieldText({ label, value, placeholder, rows = 1, onSave }: { label: string; value: string; placeholder?: string; rows?: number; onSave: (value: string) => void }) {
    useReviewLocale();
    const [draft, setDraft] = useState(value);
    useEffect(() => setDraft(value), [value]);
    return (
        <label className="drama-sd-field">
            <span className="drama-sd-label">
                <span>{label}</span>
                {draft !== value ? <small className="is-dirty">{reviewText("未保存")}</small> : null}
            </span>
            <Input.TextArea
                value={draft}
                placeholder={placeholder}
                autoSize={{ minRows: rows, maxRows: 5 }}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={() => {
                    if (draft.trim() !== value.trim()) onSave(draft);
                }}
            />
        </label>
    );
}
