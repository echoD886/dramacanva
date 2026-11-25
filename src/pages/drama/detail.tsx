import { reviewText, reviewServerText, useReviewLocale } from "@/i18n/drama-messages";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { App, Button, Select } from "antd";
import { ArrowLeft, CheckCheck, Clapperboard, Film, Inbox, Pause, Pencil, Play, ScrollText, Settings2, Sparkles, UsersRound } from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";

import { WorkspacePage } from "@/components/layout/workspace-page";
import { WorkspaceErrorState, WorkspaceLoadingState } from "@/components/layout/workspace-state";
import {
    approveDramaEpisode,
    generateDramaSegments,
    pauseDrama,
    reprocessDramaSegmentVideo,
    regenerateDramaCast,
    releaseDramaMedia,
    renameDramaEpisode,
    rescriptDramaEpisode,
    retryFailedDrama,
    startDrama,
    updateDramaSegment,
    writeDramaSegmentPrompts,
    updateDramaShot,
    type DramaInboxItem,
    type DramaJob,
    type DramaModelChoice,
    type DramaSegment,
    type DramaShot,
    type DramaShotPatch,
} from "@/services/api/drama";

import { formatCount, formatDuration, StagePips, STAGE_LABEL, STATUS_LABEL } from "./drama-shared";
import { CastPanel, InboxPanel, SettingsPanel } from "./studio/panels";
import { EpisodeRail } from "./studio/episode-rail";
import { FinalView } from "./studio/final-view";
import { FinalGallery } from "./studio/final-gallery";
import { StudioGenesis } from "./studio/genesis";
import { SegmentDialog } from "./studio/segment-dialog";
import { QueueBar } from "./studio/queue-bar";
import { ScriptView } from "./studio/script-view";
import { Storyboard, type EpisodeEmpty } from "./studio/storyboard";
import { isTypingTarget, useDramaCast, useDramaEpisode, useDramaInvalidate, useDramaSummary } from "./studio/use-studio";
import { progressFillStyle } from "@/pages/drama/progress-fill";
import { dramaEpisodeCanvasHref } from "@/services/drama-canvas-handoff";
import "./drama.css";
import "./studio/final-gallery.css";

type Tab = "board" | "script" | "final";
type StudioView = "production" | "final" | "watch" | "cast" | "inbox" | "settings";

export default function DramaStudioPage() {
    useReviewLocale();
    const { projectId = "", episodeId: routeEpisodeId = "" } = useParams();
    const navigate = useNavigate();
    const { message, modal } = App.useApp();
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = (["board", "script", "final"].includes(searchParams.get("tab") || "") ? searchParams.get("tab") : "board") as Tab;
    const shotParam = searchParams.get("shot") || "";
    const view = (["final", "watch", "cast", "inbox", "settings"].includes(searchParams.get("view") || "") ? searchParams.get("view") : "production") as StudioView;
    const castFocus = searchParams.get("cast") || "";
    const [renaming, setRenaming] = useState(false);
    const invalidate = useDramaInvalidate(projectId);

    const summaryQuery = useDramaSummary(projectId);
    const summary = summaryQuery.data;
    const episodes = summary?.episodes || [];
    const requestedEpisode = view === "watch" ? searchParams.get("episode") || routeEpisodeId : routeEpisodeId;
    const episodeId = episodes.some((episode) => episode.id === requestedEpisode) ? requestedEpisode : (episodes.find((episode) => episode.stage === "review") || episodes.find((episode) => episode.stage !== "done") || episodes[0])?.id || "";
    const episodeRow = episodes.find((episode) => episode.id === episodeId);
    const awaitingCount = episodes.filter((episode) => episode.awaitingMedia).length;
    const running = summary?.production.status === "running";
    const episodeQuery = useDramaEpisode(projectId, episodeId, Boolean(running || (summary?.jobCounts.running || 0) > 0));
    const detail = episodeQuery.data?.episode.id === episodeId ? episodeQuery.data : undefined;
    const { cast, byId: castById } = useDramaCast(projectId, Boolean(running));
    const shots = useMemo(() => detail?.shots || [], [detail]);
    const currentShot = shots.find((shot) => shot.id === shotParam);

    const setParams = useCallback(
        (patch: Record<string, string | null>) => {
            const next = new URLSearchParams(searchParams);
            for (const [key, value] of Object.entries(patch)) {
                if (value) next.set(key, value);
                else next.delete(key);
            }
            setSearchParams(next, { replace: true });
        },
        [searchParams, setSearchParams],
    );
    const selectEpisode = useCallback(
        (id: string) => {
            navigate({ pathname: `/projects/${projectId}/e/${id}`, search: tab === "board" ? "" : `?tab=${tab}` });
        },
        [navigate, projectId, tab],
    );
    const segmentParam = searchParams.get("segment");
    const openSegmentIndex = segmentParam !== null && /^\d+$/.test(segmentParam) ? Number(segmentParam) : undefined;
    // 剧情段弹窗的打开状态放在地址里，刷新或从待处理跳转都能直接回到同一段、同一镜头。
    const openSegment = useCallback((index: number | null, shotId?: string) => setParams({ segment: index === null ? null : String(index), shot: index === null ? null : shotId || null }), [setParams]);
    const openView = useCallback((next: StudioView, extra: Record<string, string | null> = {}) => setParams({ view: next === "production" ? null : next, cast: null, ...extra }), [setParams]);

    // [ / ] 切换上一集 / 下一集。
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (isTypingTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
            if (event.key !== "[" && event.key !== "]") return;
            const index = episodes.findIndex((episode) => episode.id === episodeId);
            const next = episodes[index + (event.key === "]" ? 1 : -1)];
            if (next) selectEpisode(next.id);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [episodeId, episodes, selectEpisode]);

    const errorMessage = (error: unknown, fallback: string) => message.error(error instanceof Error ? reviewServerText(error.message) : fallback);
    const importEpisode = useMutation({
        mutationFn: (id: string) => dramaEpisodeCanvasHref(projectId, summary?.project.name || "", id),
        onSuccess: (href) => navigate(href),
        onError: (error) => errorMessage(error, reviewText("操作失败")),
    });
    const toggleRun = useMutation({
        mutationFn: () => (running ? pauseDrama(projectId) : startDrama(projectId)),
        onSuccess: () => {
            invalidate(episodeId);
            message.success(running ? reviewText("已暂停，正在运行的任务完成后停止") : reviewText("已继续制作"));
        },
        onError: (error) => errorMessage(error, reviewText("操作失败")),
    });
    const patchShot = useMutation({
        mutationFn: ({ shot, patch }: { shot: DramaShot; patch: DramaShotPatch }) => updateDramaShot(projectId, shot.id, patch),
        onSuccess: () => {
            invalidate(episodeId);
            message.success(reviewText("已保存，本段提示词与视频已标记过期，请重新确认"));
        },
        onError: (error) => errorMessage(error, reviewText("保存失败")),
    });
    const saveSegment = useMutation({
        mutationFn: ({ segment, override }: { segment: DramaSegment; override: string }) => updateDramaSegment(projectId, episodeId, segment.index, override),
        onSuccess: async (_, { override }) => {
            await invalidate(episodeId);
            message.success(override ? reviewText("已保存完整视频提示词") : reviewText("已恢复模型撰写的版本"));
        },
    });
    const writeSegment = useMutation({
        mutationFn: (indexes: number[]) => writeDramaSegmentPrompts(projectId, episodeId, indexes),
        onSuccess: (result) => {
            invalidate(episodeId);
            message.success(reviewText("已开始撰写 {v0} 段视频提示词", { v0: result.queued }));
        },
        onError: (error) => errorMessage(error, reviewText("操作失败")),
    });
    const approve = useMutation({
        mutationFn: () => approveDramaEpisode(projectId, episodeId),
        onSuccess: () => {
            invalidate(episodeId);
            message.success(episodeRow?.number === 1 && summary?.production.settings.reviewMode === "sample" ? reviewText("样片已确认，全剧开始自动制作") : reviewText("已通过，开始生成视频"));
        },
        onError: (error) => errorMessage(error, reviewText("操作失败")),
    });
    const generateSegments = useMutation({
        mutationFn: ({ segments, videoModel }: { segments: number[]; videoModel?: DramaModelChoice }) => generateDramaSegments(projectId, episodeId, segments, videoModel),
        onSuccess: (result, { segments }) => {
            invalidate(episodeId);
            const label = segments.length > 1 ? reviewText("{v0} 段", { v0: segments.length }) : reviewText("第 {v0} 段", { v0: segments[0] + 1 });
            message.success(reviewText("{v0}已加入队列，共 {v1} 个段视频", { v0: label, v1: result.queued }));
        },
        onError: (error) => errorMessage(error, reviewText("生成失败")),
    });
    const reprocessSegment = useMutation({
        mutationFn: (segmentIndex: number) => reprocessDramaSegmentVideo(projectId, episodeId, segmentIndex),
        onSuccess: (_, segmentIndex) => {
            invalidate(episodeId);
            message.success(reviewText("正在重新处理第 {v0} 段视频", { v0: segmentIndex + 1 }));
        },
        onError: (error) => {
            invalidate(episodeId);
            errorMessage(error, reviewText("重新处理失败"));
        },
    });
    const rescript = useMutation({
        mutationFn: () => rescriptDramaEpisode(projectId, episodeId),
        onSuccess: () => {
            invalidate(episodeId);
            setParams({ shot: null, segment: null });
            message.success(running ? reviewText("正在重新改编本集") : reviewText("已继续制作，正在重新改编本集"));
        },
        // 剧本已重置但恢复制作被拒（如预算或模型不可用）时，也要刷新到真实状态。
        onError: (error) => {
            invalidate(episodeId);
            errorMessage(error, reviewText("操作失败"));
        },
    });
    const retry = useMutation({
        mutationFn: () => retryFailedDrama(projectId),
        onSuccess: (result) => {
            invalidate(episodeId);
            message.success(reviewText("已重新排队 {v0} 项", { v0: result.segments + result.casts }));
        },
        onError: (error) => errorMessage(error, reviewText("重试失败")),
    });
    // 收件箱按组重试：设定重做参考图（不连带剧情段），剧情段失败统一重新排队。
    const [retryingGroup, setRetryingGroup] = useState("");
    const retryGroup = useMutation({
        mutationFn: async ({ items }: { key: string; items: DramaInboxItem[] }) => {
            const castIds = items.filter((item) => item.kind === "cast_failed" && item.castId).map((item) => item.castId!);
            await Promise.all(castIds.map((id) => regenerateDramaCast(projectId, id, false)));
            if (items.some((item) => item.kind === "segment_failed")) await retryFailedDrama(projectId);
            return items.length;
        },
        onMutate: ({ key }) => setRetryingGroup(key),
        onSettled: () => setRetryingGroup(""),
        onSuccess: (count) => {
            invalidate(episodeId);
            message.success(reviewText("已重新排队 {v0} 项", { v0: count }));
        },
        onError: (error) => errorMessage(error, reviewText("重试失败")),
    });
    // 手动模式：先看剧本、设定与段提示词，确认后再逐集或全部开始生成参考图与段视频。
    const release = useMutation({
        mutationFn: ({ target, episodeIds }: { target: "assets" | "episodes" | "all"; episodeIds?: string[] }) => releaseDramaMedia(projectId, target, episodeIds),
        onSuccess: (_, { target }) => {
            invalidate(episodeId);
            message.success(target === "assets" ? reviewText("开始生成角色、道具与场景参考图") : target === "all" ? reviewText("全部集开始生成参考图与段视频") : reviewText("本集开始生成参考图与段视频"));
        },
        onError: (error) => errorMessage(error, reviewText("操作失败")),
    });
    const confirmReleaseAll = () =>
        modal.confirm({
            title: reviewText("为 {v0} 集开始生成视频？", { v0: awaitingCount }),
            content: reviewText("将生成角色、道具与场景参考图，以及分集视频。"),
            okText: reviewText("全部开始"),
            cancelText: reviewText("再看看"),
            centered: true,
            onOk: () => release.mutateAsync({ target: "all" }),
        });
    const rename = useMutation({
        mutationFn: (title: string) => renameDramaEpisode(projectId, episodeId, title),
        onSuccess: () => {
            invalidate(episodeId);
            setRenaming(false);
        },
        onError: (error) => errorMessage(error, reviewText("重命名失败")),
    });
    const busy = approve.isPending || rescript.isPending || generateSegments.isPending || release.isPending || patchShot.isPending || saveSegment.isPending;

    const openInbox = (item: DramaInboxItem) => {
        if (item.castId) {
            openView("cast", { cast: item.castId });
            return;
        }
        if (item.kind === "paused") {
            openView("settings");
            return;
        }
        if (item.episodeId) navigate({ pathname: `/projects/${projectId}/e/${item.episodeId}`, search: item.kind === "segment_failed" ? `?segment=${item.segmentIndex}` : "" });
    };
    const jumpToJob = (job: DramaJob) => {
        if (job.episodeId) navigate({ pathname: `/projects/${projectId}/e/${job.episodeId}`, search: "" });
    };

    if (summaryQuery.isLoading)
        return (
            <WorkspacePage>
                <WorkspaceLoadingState label={reviewText("正在打开制作台")} />
            </WorkspacePage>
        );
    if (summaryQuery.isError || !summary)
        return (
            <WorkspacePage>
                <WorkspaceErrorState title={reviewText("作品不可用")} description={reviewText("作品不存在、已被删除，或当前账号没有访问权限。")} actionLabel={reviewText("返回作品列表")} onRetry={() => navigate("/projects")} />
            </WorkspacePage>
        );

    const { production } = summary;
    const doneEpisodes = episodes.filter((episode) => episode.stage === "done" && !episode.finalStale).length;
    const progress = episodes.length ? doneEpisodes / episodes.length : 0;
    const aspectRatio = production.settings.aspectRatio;
    const sampleReview = production.settings.reviewMode === "sample" && !production.sampleApproved && detail?.episode.number === 1 && detail.episode.stage === "done" && !detail.episode.finalStale;
    const reviewing = sampleReview || (production.settings.reviewMode === "every" && detail?.episode.stage === "review");
    // 手动模式下流水线可能在“运行”却无事可做：明确告诉用户在等他放行。
    const waitingForMedia = awaitingCount > 0 && !(summary.jobCounts.running || summary.jobCounts.queued) && production.status === "running";
    // 本集还没有镜头时按真实状态说明：失败、暂停、未开始、排队都不能显示成“正在编写”。
    const episodeEmpty: EpisodeEmpty = detail?.episode.error
        ? {
              title: reviewText("本集剧本编写失败"),
              text: reviewText("失败原因见上方提示。可以直接重新改编本集，或在底部队列全部重试。"),
              active: false,
              action: (
                  <Button type="primary" loading={rescript.isPending} onClick={() => rescript.mutate()}>
                      {reviewText("重新改编本集")}
                  </Button>
              ),
          }
        : production.status === "paused"
          ? {
                title: reviewText("制作已暂停，本集剧本还没开始写"),
                text: reviewText("继续制作后会立即为本集编写剧本与分镜。"),
                active: false,
                action: (
                    <Button type="primary" icon={<Play className="size-4" />} loading={toggleRun.isPending} onClick={() => toggleRun.mutate()}>
                        {reviewText("继续制作")}
                    </Button>
                ),
            }
          : production.status === "draft"
            ? { title: reviewText("制作还没开始"), text: reviewText("点击右上角“开始制作”后按集编写剧本与分镜。"), active: false }
            : detail?.episode.stage === "queued"
              ? { title: reviewText("排队等待改编"), text: reviewText("同时只改编少量集，前面的集写完剧本后会自动开始本集。"), active: false }
              : { title: reviewText("正在编写剧本与分镜"), text: reviewText("剧本按剧情段切分，每段生成一个带对白和镜头切换的视频。"), active: true };
    const sampleWaiting = production.settings.reviewMode === "sample" && !production.sampleApproved && episodeRow && episodeRow.number !== 1 && ["prompts", "review", "video"].includes(episodeRow.stage);

    return (
        <WorkspacePage className="!overflow-hidden" fluid scroll={false}>
            <div className="drama-root drama-studio">
                <header className="drama-topbar">
                    <Link to="/projects">
                        <Button type="text" shape="circle" icon={<ArrowLeft className="size-4" />} aria-label={reviewText("返回作品列表")} />
                    </Link>
                    <div className="drama-topbar-title">
                        <h1 title={summary.project.name}>{summary.project.name}</h1>
                        {waitingForMedia ? (
                            <span className="drama-chip is-ready">
                                <span className="drama-dot" />
                                {reviewText("剧本就绪 · 待生成视频")}
                            </span>
                        ) : (
                            <span className={`drama-chip is-${production.status}`}>
                                <span className="drama-dot" />
                                {STATUS_LABEL[production.status]}
                            </span>
                        )}
                    </div>
                    {episodes.length ? (
                        <div className="drama-topbar-progress">
                            <span className="drama-meter" aria-label={reviewText("成片进度 {v0}%", { v0: Math.round(progress * 100) })}>
                                <span style={progressFillStyle(Math.max(progress * 100, 2))} />
                            </span>
                            <span>
                                {doneEpisodes}/{episodes.length}
                                {reviewText("集成片")}
                                {production.planDone ? "" : reviewText(" · 分集中")}
                            </span>
                            <span>
                                · {formatCount(production.chapterCount)}
                                {reviewText("章原文")}
                            </span>
                        </div>
                    ) : null}
                    <nav className="drama-nav" aria-label={reviewText("制作台视图")}>
                        <button type="button" className="drama-nav-item" aria-current={view === "production" ? "page" : undefined} onClick={() => openView("production")}>
                            <Clapperboard className="size-4" />
                            {reviewText("制作")}
                        </button>
                        <button type="button" className="drama-nav-item" aria-current={view === "final" || view === "watch" ? "page" : undefined} onClick={() => openView("final", { episode: null })}>
                            <Film className="size-4" />
                            {reviewText("成片")}
                        </button>
                        <button type="button" className="drama-nav-item" aria-current={view === "cast" ? "page" : undefined} onClick={() => openView("cast")}>
                            <UsersRound className="size-4" />
                            {reviewText("设定")}
                            {summary.castCount ? <span className="drama-nav-count">{summary.castCount}</span> : null}
                        </button>
                        <button type="button" className="drama-nav-item" aria-current={view === "inbox" ? "page" : undefined} onClick={() => openView("inbox")}>
                            <Inbox className="size-4" />
                            {reviewText("待处理")}
                            {summary.inbox.length ? <span className="drama-nav-count is-alert">{summary.inbox.length > 99 ? "99+" : summary.inbox.length}</span> : null}
                        </button>
                        <button type="button" className="drama-nav-item" aria-current={view === "settings" ? "page" : undefined} onClick={() => openView("settings")}>
                            <Settings2 className="size-4" />
                            {reviewText("设置")}
                        </button>
                    </nav>
                    <div className="drama-topbar-actions">
                        {awaitingCount ? (
                            <Button icon={<Sparkles className="size-4" />} loading={release.isPending && release.variables?.target === "all"} onClick={confirmReleaseAll}>
                                {reviewText("全部生成视频 ·")}
                                {awaitingCount}
                                {reviewText("集")}
                            </Button>
                        ) : null}
                        {production.status !== "completed" ? (
                            <Button type={running ? "default" : "primary"} icon={running ? <Pause className="size-4" /> : <Play className="size-4" />} loading={toggleRun.isPending} onClick={() => toggleRun.mutate()}>
                                {running ? reviewText("暂停") : production.status === "draft" ? reviewText("开始制作") : reviewText("继续制作")}
                            </Button>
                        ) : null}
                    </div>
                </header>

                {view === "final" ? (
                    <FinalGallery projectId={projectId} episodes={episodes} onSelect={(id) => setParams({ view: "watch", episode: id })} onProduction={() => openView("production")} />
                ) : view === "watch" ? (
                    detail ? (
                        <FinalView
                            key={episodeId}
                            projectId={projectId}
                            title={summary.project.name}
                            detail={detail}
                            episodes={episodes}
                            immersive
                            onBack={() => setParams({ view: "final", episode: null })}
                            onSelectEpisode={(id) => setParams({ episode: id })}
                            onOpenSegment={(index) => navigate(`/projects/${projectId}/e/${episodeId}?segment=${index}`)}
                            onStoryboard={() => navigate(`/projects/${projectId}/e/${episodeId}`)}
                            onImport={() => importEpisode.mutate(episodeId)}
                            importing={importEpisode.isPending}
                        />
                    ) : (
                        <WorkspaceLoadingState label={reviewText("正在读取本集")} />
                    )
                ) : view === "cast" ? (
                    <CastPanel
                        projectId={projectId}
                        cast={cast}
                        ratios={{ character: production.settings.assets.characterRatio }}
                        focusId={castFocus}
                        retrying={retry.isPending}
                        assetsPending={production.settings.mediaMode === "manual" && !production.assetsReleased}
                        releasing={release.isPending && release.variables?.target === "assets"}
                        onReleaseAssets={() => release.mutate({ target: "assets" })}
                        onFocus={(id) => setParams({ cast: id })}
                        onRetry={() => retry.mutate()}
                        onChanged={() => invalidate(episodeId)}
                    />
                ) : view === "inbox" ? (
                    <InboxPanel
                        items={summary.inbox}
                        castById={castById}
                        retrying={retry.isPending}
                        retryingGroup={retryingGroup}
                        releasing={release.isPending}
                        onRetryAll={() => retry.mutate()}
                        onRetryGroup={(key, items) => retryGroup.mutate({ key, items })}
                        onOpen={openInbox}
                        onOpenSettings={() => openView("settings")}
                        onReleaseAll={confirmReleaseAll}
                    />
                ) : view === "settings" ? (
                    <SettingsPanel projectId={projectId} summary={summary} cast={cast} onChanged={() => invalidate(episodeId)} />
                ) : !episodes.length ? (
                    <StudioGenesis summary={summary} />
                ) : (
                    <div className="drama-body is-inspector-hidden">
                        <EpisodeRail episodes={episodes} currentId={episodeId} planning={!production.planDone} onSelect={selectEpisode} onImport={(id) => importEpisode.mutate(id)} importing={importEpisode.isPending} />
                        <main className="drama-main">
                            {episodeRow ? (
                                <div className="drama-ep-header">
                                    <div className="drama-ep-heading">
                                        <Select className="drama-mobile-episode" aria-label={reviewText("分集")} value={episodeId} onChange={selectEpisode} options={episodes.map((item) => ({ value: item.id, label: `${item.number} · ${item.title}` }))} />
                                        <div className="drama-eyebrow">{reviewText("第 {v0} 集 {v1}", { v0: episodeRow.number, v1: `· ${STAGE_LABEL[episodeRow.stage]}` })}</div>
                                        {renaming ? (
                                            <div className="drama-title-editor mt-1">
                                                <input
                                                    className="drama-title-input"
                                                    autoFocus
                                                    defaultValue={episodeRow.title}
                                                    maxLength={60}
                                                    aria-label={reviewText("集标题")}
                                                    disabled={rename.isPending}
                                                    onFocus={(event) => event.currentTarget.select()}
                                                    onBlur={(event) => {
                                                        const title = event.target.value.trim();
                                                        if (title && title !== episodeRow.title) rename.mutate(title);
                                                        else setRenaming(false);
                                                    }}
                                                    onKeyDown={(event) => {
                                                        if (event.key === "Enter") event.currentTarget.blur();
                                                        if (event.key === "Escape") setRenaming(false);
                                                    }}
                                                />
                                                <span className="drama-title-hint">{reviewText("回车保存 · Esc 取消")}</span>
                                            </div>
                                        ) : (
                                            <h2 className="mt-1">
                                                {episodeRow.title}
                                                <button type="button" className="drama-title-edit" aria-label={reviewText("重命名本集")} onClick={() => setRenaming(true)}>
                                                    <Pencil className="size-3.5" />
                                                </button>
                                            </h2>
                                        )}
                                        <p>
                                            <span>
                                                {episodeRow.shotCount}
                                                {reviewText("镜")}
                                            </span>
                                            {episodeRow.durationMs ? <span>{formatDuration(episodeRow.durationMs)}</span> : null}
                                            <StagePips episode={episodeRow} size="md" />
                                        </p>
                                    </div>
                                    <div className="drama-tabs" role="tablist" aria-label={reviewText("视图")}>
                                        <button type="button" role="tab" className="drama-tab" aria-selected={tab === "script"} onClick={() => setParams({ tab: "script" })}>
                                            <ScrollText className="size-3.5" />
                                            {reviewText("剧本")}
                                        </button>
                                        <button type="button" role="tab" className="drama-tab" aria-selected={tab === "board"} onClick={() => setParams({ tab: null })}>
                                            <Clapperboard className="size-3.5" />
                                            {reviewText("分镜")}
                                        </button>
                                        <button type="button" role="tab" className="drama-tab" aria-selected={tab === "final"} onClick={() => setParams({ tab: "final" })}>
                                            <Film className="size-3.5" />
                                            {reviewText("成片")}
                                        </button>
                                    </div>
                                </div>
                            ) : null}
                            <div className="drama-banners">
                                {production.status === "paused" ? (
                                    <div className="drama-banner">
                                        <div className="drama-banner-text">
                                            <strong>{reviewText("制作已暂停")}</strong>
                                            <span>{reviewServerText(production.pauseReason) || reviewText("不会再派发新的生成任务；重新改编、生成视频或重试会自动继续制作。")}</span>
                                        </div>
                                        <Button size="small" type="primary" icon={<Play className="size-3.5" />} loading={toggleRun.isPending} onClick={() => toggleRun.mutate()}>
                                            {reviewText("继续制作")}
                                        </Button>
                                    </div>
                                ) : null}
                                {episodeRow?.awaitingMedia ? (
                                    <div className="drama-banner is-ready">
                                        <Sparkles className="size-5 shrink-0 text-[var(--workspace-accent)]" />
                                        <div className="drama-banner-text">
                                            <strong>{reviewText("剧本与视频提示词已就绪，还没有生成视频")}</strong>
                                            <span>{reviewText("先看看剧情、镜头拆分、设定和各段视频提示词是否合适；可以改台词、动作、外观或直接改提示词，确认后再生成本集的参考图与段视频。")}</span>
                                        </div>
                                        <div className="flex shrink-0 gap-2">
                                            {tab !== "script" ? <Button onClick={() => setParams({ tab: "script" })}>{reviewText("看剧本与原文")}</Button> : null}
                                            <Button
                                                type="primary"
                                                icon={<Sparkles className="size-4" />}
                                                loading={release.isPending && release.variables?.target === "episodes"}
                                                onClick={() => release.mutate({ target: "episodes", episodeIds: [episodeRow.id] })}
                                            >
                                                {reviewText("生成本集视频")}
                                            </Button>
                                        </div>
                                    </div>
                                ) : null}
                                {reviewing ? (
                                    <div className="drama-banner is-info">
                                        <CheckCheck className="size-5 shrink-0 text-[var(--workspace-accent)]" />
                                        <div className="drama-banner-text">
                                            <strong>{sampleReview ? reviewText("第 1 集样片已完成，确认画风与角色形象") : reviewText("本集视频提示词已就绪，等待你的确认")}</strong>
                                            <span>{sampleReview ? reviewText("在成片页看样片；满意后确认，其余各集会全自动跑完。") : reviewText("核对各段提示词与参考图，可改镜头脚本或直接改提示词；确认后按剧情段顺序生成视频。")}</span>
                                        </div>
                                        <Button type="primary" loading={approve.isPending} onClick={() => approve.mutate()}>
                                            {sampleReview ? reviewText("确认样片，继续全剧") : reviewText("确认，生成视频")}
                                        </Button>
                                    </div>
                                ) : null}
                                {sampleWaiting ? (
                                    <div className="drama-banner is-info">
                                        <div className="drama-banner-text">
                                            <strong>{reviewText("剧本已就绪，等待样片确认")}</strong>
                                            <span>{reviewText("第 1 集样片确认后，本集会按剧情段顺序生成视频。")}</span>
                                        </div>
                                        <Button size="small" onClick={() => selectEpisode(episodes[0].id)}>
                                            {reviewText("去看样片")}
                                        </Button>
                                    </div>
                                ) : null}
                                {detail?.episode.error ? (
                                    <div className="drama-banner is-error">
                                        <div className="drama-banner-text">
                                            <strong>{reviewText("本集遇到问题")}</strong>
                                            <span>{reviewServerText(detail.episode.error)}</span>
                                        </div>
                                        <span className="text-[var(--fs-tiny)] text-foreground/50">{reviewText("可在底部队列“全部重试”")}</span>
                                    </div>
                                ) : null}
                            </div>
                            <div className="drama-scroll thin-scrollbar">
                                {!detail ? (
                                    <WorkspaceLoadingState label={reviewText("正在读取本集")} rows={2} />
                                ) : tab === "board" ? (
                                    <Storyboard
                                        shots={shots}
                                        segments={detail.segments}
                                        aspectRatio={aspectRatio}
                                        castById={castById}
                                        defaultVideoModel={production.settings.models.video}
                                        busy={busy}
                                        keyboardEnabled={openSegmentIndex === undefined && view === "production"}
                                        onOpen={openSegment}
                                        onGenerate={(segments, videoModel) => generateSegments.mutate({ segments, videoModel })}
                                        onReprocess={(index) => reprocessSegment.mutate(index)}
                                        reprocessing={reprocessSegment.isPending ? reprocessSegment.variables : undefined}
                                        onWritePrompts={(indexes) => writeSegment.mutate(indexes)}
                                        empty={episodeEmpty}
                                    />
                                ) : tab === "script" ? (
                                    <ScriptView
                                        projectId={projectId}
                                        detail={detail}
                                        storyboard={production.settings.storyboard}
                                        currentId={currentShot?.id || ""}
                                        busy={busy}
                                        onCurrent={(id) => setParams({ shot: id })}
                                        onRescript={() => rescript.mutate()}
                                        empty={episodeEmpty}
                                    />
                                ) : (
                                    <FinalView
                                        key={episodeId}
                                        episodes={episodes}
                                        onSelectEpisode={selectEpisode}
                                        projectId={summary.project.id}
                                        title={summary.project.name}
                                        detail={detail}
                                        onOpenSegment={(index) => setParams({ tab: null, segment: String(index), shot: null })}
                                        onStoryboard={() => setParams({ tab: null })}
                                        onImport={() => importEpisode.mutate(episodeId)}
                                        importing={importEpisode.isPending}
                                    />
                                )}
                            </div>
                        </main>
                        <SegmentDialog
                            projectId={projectId}
                            episodeId={episodeId}
                            promptModel={production.settings.models.text}
                            detail={tab === "board" ? detail : undefined}
                            segmentIndex={openSegmentIndex}
                            shotId={currentShot?.id}
                            castById={castById}
                            aspectRatio={aspectRatio}
                            busy={busy}
                            writing={writeSegment.isPending}
                            onClose={() => openSegment(null)}
                            onNavigate={openSegment}
                            onPatchShot={(shot, patch) => patchShot.mutate({ shot, patch })}
                            onSavePrompt={(segment, override) => saveSegment.mutateAsync({ segment, override })}
                            onWritePrompt={(segment) => writeSegment.mutate([segment.index])}
                            onGenerate={(segment, videoModel) => generateSegments.mutate({ segments: [segment.index], videoModel })}
                            reprocessing={reprocessSegment.isPending}
                            onReprocess={(segment) => reprocessSegment.mutate(segment.index)}
                            defaultVideoModel={production.settings.models.video}
                            onOpenCast={(id) => openView("cast", { cast: id, segment: null, shot: null })}
                        />
                    </div>
                )}

                <QueueBar projectId={projectId} summary={summary} retrying={retry.isPending} onRetry={() => retry.mutate()} onJump={jumpToJob} />
            </div>
        </WorkspacePage>
    );
}
