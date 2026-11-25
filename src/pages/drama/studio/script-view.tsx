import { reviewText, useReviewLocale } from "@/i18n/drama-messages";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { App, Button } from "antd";
import { Tooltip } from "antd";
import { BookOpen, BookOpenText, Clapperboard, PanelRightClose, PanelRightOpen, PenLine, Quote, ScanSearch } from "lucide-react";

import { averageShotSeconds, normalizeStoryboard, TRANSITION_LABEL } from "@/lib/drama/storyboard";
import { getDramaChapter, type DramaEpisodeDetail, type DramaShot, type DramaStoryboardSettings } from "@/services/api/drama";

import { formatCount } from "../drama-shared";
import { ChapterRenameButton } from "./chapter-rename-button";
import { JobDetailModal } from "./job-detail";
import type { EpisodeEmpty } from "./storyboard";

function storyboardSummary(value: DramaStoryboardSettings) {
    const rules = normalizeStoryboard(value);
    const duration = reviewText("{v0}（平均 {v1} 秒/镜）· 对白{v2} · 剧情段{v3}", {
        v0: { fast: reviewText("快节奏"), standard: reviewText("标准节奏"), slow: reviewText("舒缓节奏") }[rules.pacing],
        v1: averageShotSeconds(rules),
        v2: { dense: reviewText("密集"), standard: reviewText("标准"), sparse: reviewText("克制") }[rules.dialogue],
        v3: { auto: reviewText("智能切分"), fixed: reviewText("固定 {v0} 秒", { v0: rules.segmentSeconds }), range: reviewText("{v0}–{v1} 秒", { v0: rules.segmentMinSeconds, v1: rules.segmentMaxSeconds }) }[rules.segmentMode],
    });
    const transition = rules.transition === "auto" ? reviewText("转场智能") : reviewText("转场统一{v0}", { v0: TRANSITION_LABEL[rules.transition] });
    return `${duration} · ${transition}`;
}

type SceneGroup = { key: string; scene: string; shots: DramaShot[] };

function groupScenes(shots: DramaShot[]): SceneGroup[] {
    const groups: SceneGroup[] = [];
    for (const shot of shots) {
        const last = groups[groups.length - 1];
        if (last && last.scene === shot.scene) last.shots.push(shot);
        else groups.push({ key: shot.id, scene: shot.scene, shots: [shot] });
    }
    return groups;
}

/** 在原文里定位镜头出处；整句找不到时退回前 16 个字，仍找不到就不标注。 */
function locateQuote(text: string, quote: string) {
    const needle = quote.trim().replace(/^[「“"]+|[」”"]+$/g, "");
    if (!needle) return -1;
    const index = text.indexOf(needle);
    if (index >= 0 || needle.length <= 16) return index >= 0 ? index : -1;
    return text.indexOf(needle.slice(0, 16));
}

export function ScriptView({
    projectId,
    detail,
    storyboard,
    currentId,
    busy,
    onCurrent,
    onRescript,
    empty,
}: {
    projectId: string;
    detail: DramaEpisodeDetail;
    storyboard: DramaStoryboardSettings;
    currentId: string;
    busy: boolean;
    onCurrent: (id: string) => void;
    onRescript: () => void;
    empty: EpisodeEmpty;
}) {
    useReviewLocale();
    const [processOpen, setProcessOpen] = useState(false);
    const { modal } = App.useApp();
    const { episode, shots, chapters } = detail;
    const [sourceOpen, setSourceOpen] = useState(true);
    const current = shots.find((shot) => shot.id === currentId);
    const scenes = useMemo(() => groupScenes(shots), [shots]);
    const confirmRescript = () =>
        modal.confirm({
            title: reviewText("重新改编第 {v0} 集？", { v0: episode.number }),
            content: reviewText("会基于原文重新生成剧本、镜头与剧情段，各段视频提示词与视频都需要重新生成；已生成的段视频保留在版本记录中。"),
            okText: reviewText("重新改编"),
            cancelText: reviewText("取消"),
            centered: true,
            onOk: onRescript,
        });

    return (
        <div className={`drama-scriptv ${sourceOpen ? "" : "is-source-hidden"}`}>
            <div className="drama-scriptv-main thin-scrollbar">
                <section className="drama-scriptv-brief">
                    <div className="drama-scriptv-brief-head">
                        <span className="drama-eyebrow">{reviewText("本集梗概")}</span>
                        <div className="ml-auto flex items-center gap-2">
                            {detail.scriptJob ? (
                                <Button size="small" type="text" icon={<ScanSearch className="size-3.5" />} onClick={() => setProcessOpen(true)}>
                                    {reviewText("改编过程")}
                                </Button>
                            ) : null}
                            <Button size="small" type="text" icon={<PenLine className="size-3.5" />} disabled={busy} onClick={confirmRescript}>
                                {reviewText("重新改编")}
                            </Button>
                            <Tooltip title={sourceOpen ? reviewText("收起原文") : reviewText("对照原文")}>
                                <Button
                                    size="small"
                                    type="text"
                                    icon={sourceOpen ? <PanelRightClose className="size-3.5" /> : <PanelRightOpen className="size-3.5" />}
                                    aria-pressed={sourceOpen}
                                    aria-label={sourceOpen ? reviewText("收起原文") : reviewText("对照原文")}
                                    onClick={() => setSourceOpen((open) => !open)}
                                />
                            </Tooltip>
                        </div>
                    </div>
                    <p className="drama-scriptv-synopsis">{episode.synopsis || reviewText("改编完成后显示本集梗概。")}</p>
                    <div className="drama-scriptv-beats">
                        <div>
                            <span>{reviewText("开场钩子")}</span>
                            <p>{episode.hook || "—"}</p>
                        </div>
                        <div>
                            <span>{reviewText("结尾悬念")}</span>
                            <p>{episode.cliffhanger || "—"}</p>
                        </div>
                    </div>
                    <div className="drama-scriptv-rules">
                        <span>{reviewText("分镜规则")}</span>
                        <b>{storyboardSummary(storyboard)}</b>
                        <span>
                            {reviewText("· 实际")}
                            {shots.length}
                            {reviewText("镜 ·")}
                            {(shots.reduce((sum, shot) => sum + shot.durationMs, 0) / 1000).toFixed(0)}
                            {reviewText("秒")}
                        </span>
                    </div>
                </section>

                {shots.length ? (
                    <div className="drama-screenplay">
                        {scenes.map((group, sceneIndex) => (
                            <section key={group.key} className="drama-screenplay-scene">
                                <header>
                                    <span className="drama-screenplay-scene-no">
                                        {reviewText("场")}
                                        {sceneIndex + 1}
                                    </span>
                                    <strong>{group.scene || reviewText("未命名场景")}</strong>
                                    <span className="drama-screenplay-scene-meta">
                                        {group.shots.length}
                                        {reviewText("镜 ·")}
                                        {(group.shots.reduce((sum, shot) => sum + shot.durationMs, 0) / 1000).toFixed(0)}
                                        {reviewText("秒")}
                                    </span>
                                </header>
                                {group.shots.map((shot) => (
                                    <div
                                        key={shot.id}
                                        className="drama-screenplay-shot"
                                        role="button"
                                        tabIndex={0}
                                        aria-current={shot.id === currentId}
                                        onClick={() => onCurrent(shot.id)}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter") onCurrent(shot.id);
                                        }}
                                    >
                                        <span className="drama-screenplay-index">{String(shot.position + 1).padStart(2, "0")}</span>
                                        <div className="min-w-0">
                                            <div className="drama-screenplay-tags">
                                                {shot.shotSize ? <span>{shot.shotSize}</span> : null}
                                                {shot.camera && shot.camera !== "固定" ? <span>{shot.camera}</span> : null}
                                                <span>{(shot.durationMs / 1000).toFixed(1)}s</span>
                                                {shot.transition && shot.transition !== "cut" ? (
                                                    <span className="is-transition">
                                                        {TRANSITION_LABEL[shot.transition as keyof typeof TRANSITION_LABEL]}
                                                        {reviewText("进入")}
                                                    </span>
                                                ) : null}
                                                {shot.sourceQuote ? (
                                                    <span className="is-source">
                                                        <Quote className="size-3" />
                                                        {reviewText("有原文出处")}
                                                    </span>
                                                ) : null}
                                            </div>
                                            {shot.action ? <p className="drama-screenplay-action">{shot.action}</p> : null}
                                            {shot.dialogue ? (
                                                <div className="drama-screenplay-line">
                                                    <b>{shot.speaker || reviewText("旁白")}</b>
                                                    <p>{shot.dialogue}</p>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                ))}
                            </section>
                        ))}
                    </div>
                ) : (
                    <div className="drama-scriptv-pending">
                        <Clapperboard className="size-7" />
                        <strong>{empty.title}</strong>
                        <span>
                            {empty.text}
                            {reviewText("右侧可以先读本集对应的小说原文。")}
                        </span>
                        {empty.action}
                    </div>
                )}
            </div>
            <JobDetailModal projectId={projectId} job={processOpen ? detail.scriptJob : undefined} onClose={() => setProcessOpen(false)} onLocate={() => undefined} />
            {sourceOpen ? <SourcePane projectId={projectId} chapters={chapters} quote={current?.sourceQuote || ""} /> : null}
        </div>
    );
}

function SourcePane({ projectId, chapters, quote }: { projectId: string; chapters: DramaEpisodeDetail["chapters"]; quote: string }) {
    useReviewLocale();
    const [chapterId, setChapterId] = useState(chapters[0]?.id || "");
    const activeId = chapters.some((chapter) => chapter.id === chapterId) ? chapterId : chapters[0]?.id || "";
    const query = useQuery({ queryKey: ["drama", projectId, "chapter", activeId], queryFn: ({ signal }) => getDramaChapter(projectId, activeId, signal), enabled: Boolean(activeId), staleTime: 300_000 });
    const text = query.data?.chapter.sourceText || "";
    const hit = text && quote ? locateQuote(text, quote) : -1;
    const markRef = useRef<HTMLElement>(null);
    const needleLength = hit >= 0 ? Math.min(quote.trim().length, text.length - hit) : 0;

    useEffect(() => {
        markRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, [hit, activeId]);

    if (!chapters.length) {
        return (
            <aside className="drama-source">
                <div className="drama-source-empty">
                    <BookOpenText className="size-6" />
                    {reviewText("本集还没有关联原文章节")}
                </div>
            </aside>
        );
    }
    const activeChapter = chapters.find((chapter) => chapter.id === activeId);
    return (
        <aside className="drama-source" aria-label={reviewText("小说原文")}>
            <header className="drama-source-head">
                <span className="drama-eyebrow">
                    <BookOpen className="size-3.5" />
                    {reviewText("原文对照")}
                </span>
                <div className="flex min-w-0 items-center justify-between gap-2">
                    <div className="drama-source-tabs thin-scrollbar min-w-0 flex-1" role="tablist" aria-label={reviewText("原文章节")}>
                        {chapters.map((chapter) => (
                            <button key={chapter.id} type="button" role="tab" aria-selected={chapter.id === activeId} onClick={() => setChapterId(chapter.id)}>
                                {chapter.title}
                                <span>
                                    {formatCount(chapter.wordCount)}
                                    {reviewText("字")}
                                </span>
                            </button>
                        ))}
                    </div>
                    {activeChapter ? <ChapterRenameButton key={activeChapter.id} projectId={projectId} chapter={activeChapter} /> : null}
                </div>
            </header>
            <div className="drama-source-text thin-scrollbar">
                {query.isLoading ? (
                    <div className="drama-source-empty">{reviewText("正在读取原文…")}</div>
                ) : hit >= 0 ? (
                    <>
                        {text.slice(0, hit)}
                        <mark ref={markRef}>{text.slice(hit, hit + needleLength)}</mark>
                        {text.slice(hit + needleLength)}
                    </>
                ) : (
                    text
                )}
            </div>
            {quote && hit < 0 && text ? (
                <footer className="drama-source-foot">{reviewText("当前镜头的出处不在这一章，可切换章节查看")}</footer>
            ) : quote ? (
                <footer className="drama-source-foot is-hit">{reviewText("已高亮当前镜头的原文出处")}</footer>
            ) : (
                <footer className="drama-source-foot">{reviewText("点选左侧镜头，自动定位对应原文")}</footer>
            )}
        </aside>
    );
}
