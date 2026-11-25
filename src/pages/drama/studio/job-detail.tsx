import { DisplayTime } from "@/components/display-time";
import { dramaJobLabel } from "@/i18n/drama-job-label";
import { reviewServerText, reviewText, useReviewLocale, reviewLocale } from "@/i18n/drama-messages";
import { useQuery } from "@tanstack/react-query";
import { App, Button } from "antd";
import { Tooltip } from "antd";
import { AlertCircle, CheckCircle2, Clock3, Copy, Crosshair, Loader2, XCircle } from "lucide-react";

import { AppModal } from "@/components/ui/product/app-modal";
import { getDramaJob, type DramaJob, type DramaJobAttempt, type DramaJobTask } from "@/services/api/drama";

import { formatCredits, MediaThumb, useResourceMediaUrl } from "../drama-shared";

export const JOB_KIND_LABEL: Record<DramaJob["kind"], string> = {
    get bible() {
        return reviewText("作品圣经");
    },
    get plan() {
        return reviewText("分集规划");
    },
    get cast_image() {
        return reviewText("参考图");
    },
    get script() {
        return reviewText("剧本与分镜");
    },
    get segment_prompt() {
        return reviewText("段视频提示词");
    },
    get segment_video() {
        return reviewText("段视频");
    },
    get render() {
        return reviewText("合成成片");
    },
};

export const JOB_STATUS_LABEL: Record<string, string> = {
    get queued() {
        return reviewText("排队中");
    },
    get running() {
        return reviewText("生成中");
    },
    get succeeded() {
        return reviewText("已完成");
    },
    get failed() {
        return reviewText("失败");
    },
    get canceled() {
        return reviewText("已取消");
    },
    get cancelled() {
        return reviewText("已取消");
    },
    get rejected() {
        return reviewText("提交被拒绝");
    },
};

export function JobStatusIcon({ status }: { status: string }) {
    useReviewLocale();
    if (status === "running") return <Loader2 className="size-3.5 animate-spin text-[var(--workspace-accent)]" />;
    if (status === "succeeded") return <CheckCircle2 className="size-3.5 text-[var(--status-success)]" />;
    if (status === "failed" || status === "rejected") return <XCircle className="size-3.5 text-[var(--status-error)]" />;
    if (status === "canceled" || status === "cancelled") return <XCircle className="size-3.5 opacity-35" />;
    return <Clock3 className="size-3.5 opacity-50" />;
}

export function formatJobTime(value?: string) {
    if (!value) return "—";
    return <DisplayTime value={value} locale={reviewLocale()} />;
}

function elapsed(start?: string, end?: string) {
    if (!start || !end) return "";
    const ms = new Date(end).getTime() - new Date(start).getTime();
    if (!Number.isFinite(ms) || ms < 0) return "";
    const seconds = Math.round(ms / 1000);
    return seconds >= 60 ? reviewText("{v0} 分 {v1} 秒", { v0: Math.floor(seconds / 60), v1: seconds % 60 }) : reviewText("{v0} 秒", { v0: seconds });
}

const PARAM_LABEL: Record<string, string> = {
    get size() {
        return reviewText("尺寸");
    },
    get imageResolution() {
        return reviewText("分辨率");
    },
    get quality() {
        return reviewText("质量");
    },
    get count() {
        return reviewText("张数");
    },
    get videoSeconds() {
        return reviewText("时长（秒）");
    },
    get vquality() {
        return reviewText("清晰度");
    },
    get videoGenerateAudio() {
        return reviewText("同步生成声音");
    },
};

export function JobDetailModal({ projectId, job, onClose, onLocate }: { projectId: string; job?: DramaJob; onClose: () => void; onLocate: (job: DramaJob) => void }) {
    const locale = useReviewLocale();
    const query = useQuery({
        queryKey: ["drama", projectId, "job", job?.id],
        queryFn: ({ signal }) => getDramaJob(projectId, job!.id, signal),
        enabled: Boolean(job),
        refetchInterval: (state) => (state.state.data?.job.status === "running" || state.state.data?.job.status === "queued" ? 3_000 : false),
    });
    const detail = query.data;
    const current = detail?.job || job;
    const label = current && dramaJobLabel(locale, current);
    return (
        <AppModal open={Boolean(job)} onCancel={onClose} footer={null} width={760} flush title={null} centered>
            {current ? (
                <div className="drama-jobd">
                    <header className="drama-jobd-head">
                        <span className={`drama-jobd-status is-${current.status}`}>
                            <JobStatusIcon status={current.status} />
                            {JOB_STATUS_LABEL[current.status]}
                        </span>
                        <div className="min-w-0 flex-1">
                            <h3 title={label}>{label}</h3>
                            <p>
                                {current.wait ? reviewServerText(current.wait) : JOB_KIND_LABEL[current.kind]}
                                {detail?.target ? ` · ${detail.target}` : ""}
                            </p>
                        </div>
                        {current.episodeId ? (
                            <Button
                                size="small"
                                icon={<Crosshair className="size-3.5" />}
                                onClick={() => {
                                    onLocate(current);
                                    onClose();
                                }}
                            >
                                {reviewText("定位到镜头")}
                            </Button>
                        ) : null}
                    </header>
                    <dl className="drama-jobd-facts">
                        <div>
                            <dt>{reviewText("加入队列")}</dt>
                            <dd>{formatJobTime(current.createdAt)}</dd>
                        </div>
                        <div>
                            <dt>{reviewText("开始")}</dt>
                            <dd>{formatJobTime(current.startedAt)}</dd>
                        </div>
                        <div>
                            <dt>{reviewText("结束")}</dt>
                            <dd>
                                {formatJobTime(current.finishedAt)}
                                {elapsed(current.startedAt, current.finishedAt) ? (
                                    <small>
                                        {reviewText("用时")}
                                        {elapsed(current.startedAt, current.finishedAt)}
                                    </small>
                                ) : null}
                            </dd>
                        </div>
                        <div>
                            <dt>{reviewText("花费")}</dt>
                            <dd>
                                {current.costMicrocredits ? reviewText("{v0} 积分", { v0: formatCredits(current.costMicrocredits) }) : "0"}
                                <small>
                                    {reviewText("重试")}
                                    {current.attempt}
                                    {reviewText("次")}
                                </small>
                            </dd>
                        </div>
                    </dl>
                    <div className="drama-jobd-body thin-scrollbar">
                        {query.isLoading ? <div className="drama-jobd-empty">{reviewText("正在读取请求记录…")}</div> : null}
                        {detail && !detail.attempts.length ? <div className="drama-jobd-empty">{reviewText("还没有提交过请求，正在排队。")}</div> : null}
                        {detail?.attempts.map((attempt, index) => (
                            <AttemptCard key={`${attempt.taskId || "rejected"}-${attempt.at}`} attempt={attempt} index={detail.attempts.length - index} latest={index === 0} />
                        ))}
                    </div>
                </div>
            ) : null}
        </AppModal>
    );
}

function AttemptCard({ attempt, index, latest }: { attempt: DramaJobAttempt; index: number; latest: boolean }) {
    useReviewLocale();
    const { message } = App.useApp();
    const task = attempt.task;
    const copy = (text: string) =>
        void navigator.clipboard.writeText(text).then(
            () => message.success(reviewText("已复制")),
            () => message.error(reviewText("复制失败")),
        );
    return (
        <article className={`drama-jobd-attempt ${latest ? "is-latest" : ""}`}>
            <header>
                <span className="drama-jobd-attempt-index">
                    {reviewText("第")}
                    {index}
                    {reviewText("次")}
                </span>
                <JobStatusIcon status={attempt.status} />
                <strong>{JOB_STATUS_LABEL[attempt.status] || attempt.status}</strong>
                {task?.stage && attempt.status !== "succeeded" ? <span className="drama-jobd-muted">{reviewServerText(task.stage)}</span> : null}
                <span className="ml-auto drama-jobd-muted">
                    {formatJobTime(task?.createdAt || attempt.at)}
                    {elapsed(task?.startedAt, task?.completedAt) ? ` · ${elapsed(task?.startedAt, task?.completedAt)}` : ""}
                </span>
            </header>
            <dl className="drama-jobd-grid">
                <div>
                    <dt>{reviewText("模型")}</dt>
                    <dd title={task?.modelLabel}>{task?.modelLabel || "—"}</dd>
                </div>
                <div>
                    <dt>{reviewText("积分")}</dt>
                    <dd>{attempt.costMicrocredits ? formatCredits(attempt.costMicrocredits) : "0"}</dd>
                </div>
                {task
                    ? Object.entries(task.params).map(([key, value]) => (
                          <div key={key}>
                              <dt>{PARAM_LABEL[key] || key}</dt>
                              <dd title={value}>{value}</dd>
                          </div>
                      ))
                    : null}
            </dl>
            {attempt.error ? (
                <div className="drama-jobd-error">
                    <AlertCircle className="size-4 shrink-0" />
                    <p>{reviewServerText(attempt.error)}</p>
                    <Tooltip title={reviewText("复制错误信息")}>
                        <Button size="small" type="text" icon={<Copy className="size-3.5" />} aria-label={reviewText("复制错误信息")} onClick={() => copy(reviewServerText(attempt.error!))} />
                    </Tooltip>
                </div>
            ) : null}
            {task?.prompt ? (
                <details className="drama-disclosure">
                    <summary>
                        {reviewText("提示词")}
                        <span className="drama-jobd-muted">
                            {task.prompt.length}
                            {reviewText("字")}
                        </span>
                        <Button
                            size="small"
                            type="text"
                            className="!ml-auto"
                            icon={<Copy className="size-3.5" />}
                            aria-label={reviewText("复制提示词")}
                            onClick={(event) => {
                                event.preventDefault();
                                copy(task.prompt);
                            }}
                        />
                    </summary>
                    <pre className="drama-jobd-pre thin-scrollbar">{task.prompt}</pre>
                </details>
            ) : null}
            {task ? <AttemptResult task={task} /> : null}
        </article>
    );
}

function AttemptResult({ task }: { task: DramaJobTask }) {
    useReviewLocale();
    const ids = task.resourceIds || [];
    if (task.resultText) {
        return (
            <details className="drama-disclosure">
                <summary>
                    {reviewText("返回结果")}
                    <span className="drama-jobd-muted">
                        {task.resultText.length}
                        {reviewText("字")}
                    </span>
                </summary>
                <pre className="drama-jobd-pre thin-scrollbar">{task.resultText}</pre>
            </details>
        );
    }
    if (!ids.length)
        return task.mediaStage ? (
            <p className="drama-jobd-muted">
                {reviewText("结果保存阶段：")}
                {reviewServerText(task.mediaStage)}
            </p>
        ) : null;
    return (
        <div className="drama-jobd-results">
            {ids.map((id) =>
                task.resultMode === "video" ? (
                    <ResultVideo key={id} id={id} />
                ) : (
                    <div key={id} className="drama-jobd-thumb">
                        <MediaThumb resourceId={id} alt={reviewText("生成结果")} />
                    </div>
                ),
            )}
        </div>
    );
}

function ResultVideo({ id }: { id: string }) {
    useReviewLocale();
    const url = useResourceMediaUrl(id, "playback");
    return <div className="drama-jobd-thumb is-video">{url ? <video src={url} controls playsInline preload="metadata" /> : null}</div>;
}
