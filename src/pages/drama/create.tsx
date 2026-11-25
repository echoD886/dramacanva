import { reviewServerText, reviewText, useReviewLocale } from "@/i18n/drama-messages";
import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { App, Button, Input, InputNumber, Select } from "antd";
import { AlertTriangle, ArrowLeft, BookOpenText, ClipboardPaste, FileUp, Sparkles, Wand2 } from "lucide-react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";

import { WorkspacePage } from "@/components/layout/workspace-page";
import { DEFAULT_DRAMA_STYLE_ID, findDramaStyle } from "@/lib/drama/drama-styles";
import { decodeNovelText } from "@/lib/canvas/canvas-document";
import { analyzeNovel, titleFromFileName, type NovelAnalysis } from "@/lib/drama/novel-parse";
import { ApiError } from "@/services/api/request";
import { dramaChoiceKey } from "@/lib/drama/model-choice";
import { DEFAULT_STORYBOARD } from "@/lib/drama/storyboard";
import { createDrama, estimateDrama, type DramaAssetSettings, type DramaCapability, type DramaMediaMode, type DramaModels, type DramaReviewMode, type DramaSkillRef, type DramaStoryboardSettings } from "@/services/api/drama";

import { formatCount, formatCredits, MEDIA_MODE_LABEL } from "./drama-shared";
import { AssetSchemePicker, defaultAssetSettings, useAssetSchemes } from "./asset-scheme";
import { DramaModelPicker, useDramaModelCatalog } from "./drama-model-picker";
import { PromptSkillField } from "./prompt-skill";
import { EpisodeDurationInput, StoryboardRules } from "./storyboard-rules";
import { DramaStylePicker } from "./style-picker";
import "./drama.css";

const MAX_FILE_BYTES = 40 * 1024 * 1024;
const RATIOS = [
    {
        value: "9:16",
        get label() {
            return reviewText("竖屏 9:16");
        },
        w: 9,
        h: 16,
    },
    {
        value: "16:9",
        get label() {
            return reviewText("横屏 16:9");
        },
        w: 16,
        h: 9,
    },
    {
        value: "1:1",
        get label() {
            return reviewText("方形 1:1");
        },
        w: 12,
        h: 12,
    },
];
const LANGUAGES = ["中文普通话", "粤语", "英语", "日语"];
const REVIEW_MODES: Array<{ value: DramaReviewMode; title: string; detail: string }> = [
    {
        value: "sample",
        get title() {
            return reviewText("先看样片，满意后全剧自动");
        },
        get detail() {
            return reviewText("先做完第 1 集成片，请你确认一次画风、角色和声线，之后所有集自动跑到成片。");
        },
    },
    {
        value: "every",
        get title() {
            return reviewText("每集确认提示词");
        },
        get detail() {
            return reviewText("每集生成视频前停下来，等你审阅各剧情段的视频提示词与参考图。");
        },
    },
    {
        value: "auto",
        get title() {
            return reviewText("全自动");
        },
        get detail() {
            return reviewText("不打断，直接从小说跑到成片，可随时在制作台修改重做。");
        },
    },
];
const CAPABILITY_LABEL: Record<DramaCapability, string> = {
    get text() {
        return reviewText("改编与分镜");
    },
    get image() {
        return reviewText("角色与场景参考图");
    },
    get video() {
        return reviewText("剧情段视频");
    },
};

export default function DramaCreatePage() {
    useReviewLocale();
    const navigate = useNavigate();
    const { message } = App.useApp();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const [pasteMode, setPasteMode] = useState(searchParams.get("paste") === "1");
    const [pasteText, setPasteText] = useState("");
    const [analysis, setAnalysis] = useState<NovelAnalysis | null>(null);
    const [name, setName] = useState("");
    const [aspectRatio, setAspectRatio] = useState("9:16");
    const [episodeSeconds, setEpisodeSeconds] = useState(90);
    const [styleId, setStyleId] = useState(DEFAULT_DRAMA_STYLE_ID);
    const [language, setLanguage] = useState(LANGUAGES[0]);
    const [reviewMode, setReviewMode] = useState<DramaReviewMode>("sample");
    // 默认先只跑文本：先看剧情、镜头、设定和段提示词对不对，再决定花钱生成参考图与视频。
    const [mediaMode, setMediaMode] = useState<DramaMediaMode>("manual");
    const [storyboard, setStoryboard] = useState<DramaStoryboardSettings>(DEFAULT_STORYBOARD);
    const [promptSkill, setPromptSkill] = useState<DramaSkillRef>();
    const [models, setModels] = useState<Partial<DramaModels>>({});
    const [budgetCredits, setBudgetCredits] = useState<number | null>(null);
    const assetCatalog = useAssetSchemes();
    const [assetDraft, setAssetDraft] = useState<DramaAssetSettings>();
    const assets = assetDraft || defaultAssetSettings(assetCatalog.data);
    const [previewIndex, setPreviewIndex] = useState(0);

    const style = findDramaStyle(styleId);
    const catalogQuery = useDramaModelCatalog();
    const resolvedModels = useMemo<DramaModels | undefined>(() => {
        const defaults = catalogQuery.data?.defaults;
        if (!defaults) return undefined;
        return { text: models.text || defaults.text, image: models.image || defaults.image, video: models.video || defaults.video };
    }, [catalogQuery.data, models]);
    const videoOption = catalogQuery.data?.options.video?.find((option) => dramaChoiceKey(option.choice) === dramaChoiceKey(resolvedModels?.video));
    const missingCapabilities = (Object.keys(CAPABILITY_LABEL) as DramaCapability[]).filter((capability) => catalogQuery.data && !dramaChoiceKey(resolvedModels?.[capability]));
    const settings = {
        aspectRatio,
        episodeSeconds,
        stylePrompt: style?.prompt || "",
        styleName: style?.name || "",
        language,
        reviewMode,
        mediaMode,
        storyboard,
        ...(promptSkill ? { promptSkill } : {}),
        concurrency: 4,
        models: resolvedModels,
        ...(assets ? { assets } : {}),
    };
    const estimateQuery = useQuery({
        queryKey: ["drama-estimate", analysis?.chapters.length, analysis?.words, episodeSeconds, JSON.stringify(storyboard), dramaChoiceKey(resolvedModels?.text), dramaChoiceKey(resolvedModels?.image), dramaChoiceKey(resolvedModels?.video)],
        queryFn: ({ signal }) => estimateDrama({ chapterCount: analysis!.chapters.length, wordCount: analysis!.words, settings }, signal),
        enabled: Boolean(analysis && resolvedModels),
        staleTime: 30_000,
    });
    const estimate = estimateQuery.data;
    useEffect(() => {
        if (estimate && budgetCredits === null && estimate.maxMicrocredits > 0) setBudgetCredits(Math.ceil(estimate.maxMicrocredits / 1_000_000));
    }, [estimate, budgetCredits]);

    const loadText = (text: string, fileName?: string) => {
        const result = analyzeNovel(text);
        if (!result.chapters.length) {
            message.error(reviewText("没有读取到正文，请检查文件内容"));
            return;
        }
        setAnalysis(result);
        setBudgetCredits(null);
        if (fileName && !name) setName(titleFromFileName(fileName));
        if (!fileName && !name) setName(result.chapters[0]?.title.slice(0, 20) || reviewText("未命名短剧"));
    };
    const loadFile = async (file: File) => {
        if (!/\.(txt|md|markdown)$/i.test(file.name)) {
            message.warning(reviewText("目前支持 TXT 与 Markdown 文件"));
            return;
        }
        if (file.size > MAX_FILE_BYTES) {
            message.warning(reviewText("文件超过 40MB，请拆分后上传"));
            return;
        }
        loadText(decodeNovelText(await file.arrayBuffer()), file.name);
    };
    const handedFile = (location.state as { file?: File } | null)?.file;
    const handedRef = useRef(false);
    useEffect(() => {
        if (!handedFile || handedRef.current) return;
        handedRef.current = true;
        void loadFile(handedFile);
        // 文件只用于首次进入，清掉路由状态避免刷新或返回时重复解析。
        navigate(".", { replace: true, state: null });
    }, [handedFile]); // eslint-disable-line react-hooks/exhaustive-deps
    const onDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setDragOver(false);
        const file = event.dataTransfer.files?.[0];
        if (file) void loadFile(file);
    };

    const create = useMutation({
        mutationFn: () =>
            createDrama({
                name: name.trim(),
                chapters: analysis!.chapters.map((chapter) => ({ title: chapter.title, text: chapter.text })),
                settings: { ...settings, models: resolvedModels },
                budgetMicrocredits: Math.max(0, Math.round((budgetCredits || 0) * 1_000_000)),
                start: true,
            }),
        onSuccess: (summary) => navigate(`/projects/${summary.project.id}`, { replace: true }),
        onError: (error) => message.error(error instanceof ApiError || error instanceof Error ? reviewServerText(error.message) : reviewText("创建失败")),
    });
    const canStart = Boolean(analysis && name.trim() && resolvedModels && missingCapabilities.length === 0 && (budgetCredits || 0) > 0 && !create.isPending);

    const previewChapter = analysis?.chapters[previewIndex];
    const reset = () => {
        setAnalysis(null);
        setPasteText("");
        setName("");
        setPreviewIndex(0);
    };

    if (!analysis) {
        return (
            <WorkspacePage fluid scroll={false}>
                <div className="drama-root drama-compose-empty">
                    <header className="drama-compose-head">
                        <Link to="/projects">
                            <Button type="text" shape="circle" icon={<ArrowLeft className="size-4" />} aria-label={reviewText("返回作品列表")} />
                        </Link>
                        <h1>{reviewText("新建短剧")}</h1>
                    </header>
                    <div
                        className={`drama-drop ${dragOver ? "is-over" : ""}`}
                        onDragOver={(event) => {
                            event.preventDefault();
                            setDragOver(true);
                        }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={onDrop}
                    >
                        {pasteMode ? (
                            <div className="grid w-full max-w-[860px] gap-3">
                                <Input.TextArea
                                    autoFocus
                                    value={pasteText}
                                    onChange={(event) => setPasteText(event.target.value)}
                                    placeholder={reviewText("粘贴小说正文。包含“第一章 / 第1章 / Chapter 1”这类标题时会自动拆章。")}
                                    autoSize={{ minRows: 14, maxRows: 24 }}
                                />
                                <div className="flex justify-end gap-2">
                                    <Button onClick={() => setPasteMode(false)}>{reviewText("取消")}</Button>
                                    <Button type="primary" disabled={!pasteText.trim()} onClick={() => loadText(pasteText)}>
                                        {reviewText("解析正文")}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <span className="drama-drop-icon">
                                    <BookOpenText className="size-7" />
                                </span>
                                <h2>{reviewText("拖入小说文件，剩下的交给流水线")}</h2>
                                <p>{reviewText("TXT 或 Markdown，自动识别 GBK / UTF-8 编码与章节标题。确认几个选项后，系统自动改编、拆集、建角色、出分镜并合成成片。")}</p>
                                <Button type="primary" size="large" icon={<FileUp className="size-4" />} onClick={() => fileInputRef.current?.click()}>
                                    {reviewText("选择小说文件")}
                                </Button>
                                <button type="button" className="drama-link inline-flex items-center gap-1" onClick={() => setPasteMode(true)}>
                                    <ClipboardPaste className="size-3.5" />
                                    {reviewText("没有文件？直接粘贴正文")}
                                </button>
                                <div className="drama-drop-steps">
                                    {[reviewText("解析章节"), reviewText("建立角色、道具与场景"), reviewText("分集改编与段提示词"), reviewText("按剧情段生成视频"), reviewText("合成成片")].map((step, index) => (
                                        <span key={step}>
                                            <b>{index + 1}</b>
                                            {step}
                                        </span>
                                    ))}
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".txt,.md,.markdown,text/plain,text/markdown"
                                    className="hidden"
                                    onChange={(event) => {
                                        const file = event.target.files?.[0];
                                        if (file) void loadFile(file);
                                        event.target.value = "";
                                    }}
                                />
                            </>
                        )}
                    </div>
                </div>
            </WorkspacePage>
        );
    }

    return (
        <WorkspacePage fluid scroll={false}>
            <div className="drama-root drama-compose">
                {/* 左：小说目录 */}
                <aside className="drama-compose-novel">
                    <header className="drama-compose-head">
                        <Link to="/projects">
                            <Button type="text" shape="circle" icon={<ArrowLeft className="size-4" />} aria-label={reviewText("返回作品列表")} />
                        </Link>
                        <h1>{reviewText("新建短剧")}</h1>
                        <Button size="small" type="text" className="!ml-auto" onClick={reset}>
                            {reviewText("换一本")}
                        </Button>
                    </header>
                    <div className="drama-stats">
                        <div className="drama-stat">
                            <div className="drama-stat-value">{formatCount(analysis.chapters.length)}</div>
                            <div className="drama-stat-label">{reviewText("章节")}</div>
                        </div>
                        <div className="drama-stat">
                            <div className="drama-stat-value">{formatCount(analysis.words)}</div>
                            <div className="drama-stat-label">{reviewText("字")}</div>
                        </div>
                        <div className="drama-stat">
                            <div className="drama-stat-value">{estimate ? `≈${estimate.episodes}` : "—"}</div>
                            <div className="drama-stat-label">{reviewText("集")}</div>
                        </div>
                    </div>
                    {analysis.issues.length ? (
                        <div className="drama-issues">
                            {analysis.issues.map((issue) => (
                                <div key={issue.kind} className="drama-issue">
                                    <AlertTriangle className="size-3.5" />
                                    {issue.message}
                                </div>
                            ))}
                        </div>
                    ) : null}
                    <div className="drama-chapter-list thin-scrollbar" role="listbox" aria-label={reviewText("章节")}>
                        {analysis.chapters.slice(0, 600).map((chapter, index) => (
                            <button key={`${index}-${chapter.title}`} type="button" role="option" aria-selected={index === previewIndex} className={`drama-chapter-row ${chapter.words < 200 ? "is-warn" : ""}`} onClick={() => setPreviewIndex(index)}>
                                <span className="is-num">{String(index + 1).padStart(3, "0")}</span>
                                <span className="truncate text-left">{chapter.title}</span>
                                <span className="is-count">{formatCount(chapter.words)}</span>
                            </button>
                        ))}
                        {analysis.chapters.length > 600 ? (
                            <div className="px-4 py-3 text-center text-[var(--fs-tiny)] text-foreground/40">
                                {reviewText("另有")}
                                {analysis.chapters.length - 600}
                                {reviewText("章")}
                            </div>
                        ) : null}
                    </div>
                </aside>

                {/* 中：风格与审阅，下方原文预览 */}
                <main className="drama-compose-main thin-scrollbar">
                    <DramaStylePicker value={styleId} onChange={setStyleId} />
                    <section>
                        <div className="drama-section-title">
                            <h2>{reviewText("角色参考图方案")}</h2>
                            <span>{reviewText("参考图是每个镜头保持人物一致的锚点，开工后也能在设置里改")}</span>
                        </div>
                        <AssetSchemePicker value={assets} onChange={setAssetDraft} sample={{ style: style?.prompt || "", characterName: "主角", sceneName: "主场景" }} layout="compact" />
                    </section>
                    <section>
                        <div className="drama-section-title">
                            <h2>{reviewText("分镜规则")}</h2>
                            <span>{reviewText("决定剧情段多长、段内镜头节奏、台词密度与转场")}</span>
                        </div>
                        <StoryboardRules value={storyboard} onChange={setStoryboard} episodeSeconds={episodeSeconds} maxVideoSeconds={videoOption?.maxVideoSeconds} videoModelLabel={resolvedModels?.video?.label} />
                    </section>
                    <section>
                        <div className="drama-section-title">
                            <h2>{reviewText("视频提示词技能")}</h2>
                            <span>{reviewText("撰写每个剧情段的视频提示词时遵循的写作方法")}</span>
                        </div>
                        <PromptSkillField value={promptSkill} onChange={setPromptSkill} />
                    </section>
                    <section>
                        <div className="drama-section-title">
                            <h2>{reviewText("审阅方式")}</h2>
                            <span>{reviewText("只在关键点打断你")}</span>
                        </div>
                        <div className="drama-review-modes" role="radiogroup" aria-label={reviewText("审阅方式")}>
                            {REVIEW_MODES.map((mode) => (
                                <button key={mode.value} type="button" role="radio" aria-checked={reviewMode === mode.value} className="drama-review-mode" onClick={() => setReviewMode(mode.value)}>
                                    <span className="drama-radio" />
                                    <span>
                                        <strong>{mode.title}</strong>
                                        <span>{mode.detail}</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    </section>
                    {previewChapter ? (
                        <section className="drama-compose-preview">
                            <div className="drama-section-title">
                                <h2>{previewChapter.title}</h2>
                                <span>
                                    {reviewText("原文预览 ·")}
                                    {formatCount(previewChapter.words)}
                                    {reviewText("字")}
                                </span>
                            </div>
                            <div className="drama-compose-text thin-scrollbar">
                                {previewChapter.text.slice(0, 6000)}
                                {previewChapter.text.length > 6000 ? "……" : ""}
                            </div>
                        </section>
                    ) : null}
                </main>

                {/* 右：作品设置与启动 */}
                <aside className="drama-compose-side">
                    <div className="drama-compose-side-scroll thin-scrollbar">
                        <label className="block">
                            <div className="drama-option-label">{reviewText("作品名称")}</div>
                            <Input size="large" value={name} maxLength={80} onChange={(event) => setName(event.target.value)} placeholder={reviewText("作品名称")} />
                        </label>
                        <div>
                            <div className="drama-option-label">{reviewText("画幅")}</div>
                            <div className="drama-ratio-group" role="group" aria-label={reviewText("画幅")}>
                                {RATIOS.map((ratio) => (
                                    <button key={ratio.value} type="button" className="drama-ratio" aria-pressed={aspectRatio === ratio.value} onClick={() => setAspectRatio(ratio.value)}>
                                        <span className="drama-ratio-shape" style={{ width: ratio.w, height: ratio.h }} />
                                        {ratio.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="block">
                                <div className="drama-option-label">{reviewText("单集时长")}</div>
                                <EpisodeDurationInput value={episodeSeconds} onChange={setEpisodeSeconds} />
                            </div>
                            <label className="block">
                                <div className="drama-option-label">{reviewText("对白语言")}</div>
                                <Select className="w-full" value={language} onChange={setLanguage} options={LANGUAGES.map((value) => ({ value, label: reviewText(value) }))} />
                            </label>
                        </div>
                        <div>
                            <div className="drama-option-label">{reviewText("生成节奏")}</div>
                            <div className="drama-media-modes" role="radiogroup" aria-label={reviewText("生成节奏")}>
                                {(Object.keys(MEDIA_MODE_LABEL) as DramaMediaMode[]).map((mode) => (
                                    <button key={mode} type="button" role="radio" aria-checked={mediaMode === mode} className="drama-media-mode" onClick={() => setMediaMode(mode)}>
                                        <span className="drama-radio" />
                                        <span>
                                            <strong>
                                                {MEDIA_MODE_LABEL[mode].title}
                                                {mode === "manual" ? <em>{reviewText("推荐")}</em> : null}
                                            </strong>
                                            <span>{MEDIA_MODE_LABEL[mode].detail}</span>
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <section className="drama-compose-models" aria-label={reviewText("制作模型")}>
                            <div className="drama-compose-models-head">
                                <Wand2 className="size-4 text-[var(--workspace-accent)]" />
                                <strong>{reviewText("制作模型")}</strong>
                                <span>{catalogQuery.isLoading ? reviewText("正在读取可用模型…") : reviewText("已自动选好，可按需更换")}</span>
                            </div>
                            {(Object.keys(CAPABILITY_LABEL) as DramaCapability[]).map((capability) => (
                                <div key={capability} className="drama-compose-model-row">
                                    <span>{CAPABILITY_LABEL[capability]}</span>
                                    <DramaModelPicker
                                        capability={capability}
                                        size="sm"
                                        showPrice={false}
                                        value={resolvedModels?.[capability]}
                                        placeholder={reviewText("选择{v0}模型", { v0: CAPABILITY_LABEL[capability] })}
                                        onChange={(choice) => setModels((current) => ({ ...current, [capability]: choice }))}
                                    />
                                </div>
                            ))}
                        </section>
                        <div className="drama-field">
                            <div className="drama-field-label">
                                <span>{reviewText("预算上限")}</span>
                                <small>{reviewText("设置预算，超出后暂停")}</small>
                            </div>
                            <InputNumber className="!w-full" min={1} precision={0} value={budgetCredits} onChange={(value) => setBudgetCredits(value ?? 0)} suffix={reviewText("积分")} aria-label={reviewText("预算上限")} />
                        </div>
                        {missingCapabilities.length ? (
                            <p className="flex items-start gap-2 text-[var(--fs-tiny)] leading-5 text-[var(--status-error)]">
                                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                                {reviewText("还没有可用的")}
                                {missingCapabilities.map((capability) => CAPABILITY_LABEL[capability]).join("、")}
                                {reviewText("模型，请联系管理员在后台开通。")}
                            </p>
                        ) : null}
                    </div>
                    <footer className="drama-compose-launch">
                        <div className="drama-compose-estimate">
                            <div>
                                <b>{estimate ? reviewText("{v0} 集", { v0: estimate.episodes }) : "—"}</b>
                                <span>
                                    {reviewText("约")}
                                    {estimate?.durationMinutes ?? "—"}
                                    {reviewText("分钟")}
                                </span>
                            </div>
                            <div>
                                <b>{estimate ? formatCount(estimate.shots) : "—"}</b>
                                <span>{reviewText("镜头")}</span>
                            </div>
                            <div>
                                <b>{estimate?.priced ? `${formatCredits(estimate.minMicrocredits)}–${formatCredits(estimate.maxMicrocredits)}` : "—"}</b>
                                <span>{reviewText("制作预算参考")}</span>
                            </div>
                        </div>
                        {mediaMode === "manual" ? (
                            <div className="text-[var(--fs-tiny)] text-foreground/50">{reviewText("开工只消耗文本模型费用；剧本、设定与段提示词确认后，再逐集生成参考图与视频")}</div>
                        ) : reviewMode === "sample" && estimate?.priced ? (
                            <div className="text-[var(--fs-tiny)] text-foreground/50">
                                {reviewText("先做第 1 集样片，约")}
                                {formatCredits(estimate.sampleMicrocredits)}
                                {reviewText("积分，确认后再跑全剧")}
                            </div>
                        ) : null}
                        {estimate?.note ? <div className="text-[var(--fs-micro)] text-foreground/40">{reviewServerText(estimate.note)}</div> : null}
                        <Button type="primary" size="large" block icon={<Sparkles className="size-4" />} disabled={!canStart} loading={create.isPending} onClick={() => create.mutate()}>
                            {mediaMode === "manual" ? reviewText("开始改编剧本与分镜") : reviewText("开始自动制作")}
                        </Button>
                    </footer>
                </aside>
            </div>
        </WorkspacePage>
    );
}
