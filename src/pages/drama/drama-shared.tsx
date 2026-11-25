import { reviewText, useReviewLocale, reviewLocale } from "@/i18n/drama-messages";
import { formatCredits as formatDisplayCredits } from "@/constant/credits";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

import { CachedResourceImage } from "@/components/cached-resource-image";
import { getResourceBlob, playbackVariantUrl, resourceFileUrl } from "@/services/api/resources";
import type { DramaCastKind, DramaEpisodeRow, DramaEpisodeStage, DramaMediaMode, DramaMediaStatus, DramaStatus } from "@/services/api/drama";

export const PIPELINE_STEPS: Array<{ key: Exclude<DramaEpisodeStage, "queued" | "review" | "done">; label: string }> = [
    {
        key: "script",
        get label() {
            return reviewText("剧本");
        },
    },
    {
        key: "prompts",
        get label() {
            return reviewText("段提示词");
        },
    },
    {
        key: "video",
        get label() {
            return reviewText("视频");
        },
    },
    {
        key: "render",
        get label() {
            return reviewText("成片");
        },
    },
];

const STAGE_INDEX: Record<DramaEpisodeStage, number> = { queued: -1, script: 0, prompts: 1, review: 2, video: 2, render: 3, done: 4 };

export const STAGE_LABEL: Record<DramaEpisodeStage, string> = {
    get queued() {
        return reviewText("排队中");
    },
    get script() {
        return reviewText("改编剧本");
    },
    get prompts() {
        return reviewText("撰写段提示词");
    },
    get review() {
        return reviewText("等待审阅");
    },
    get video() {
        return reviewText("生成视频");
    },
    get render() {
        return reviewText("合成成片");
    },
    get done() {
        return reviewText("已完成");
    },
};

export const STATUS_LABEL: Record<DramaStatus, string> = {
    get draft() {
        return reviewText("未开始");
    },
    get running() {
        return reviewText("制作中");
    },
    get paused() {
        return reviewText("已暂停");
    },
    get completed() {
        return reviewText("已完成");
    },
};

export const CAST_KIND_LABEL: Record<DramaCastKind, string> = {
    get character() {
        return reviewText("角色");
    },
    get prop() {
        return reviewText("道具");
    },
    get scene() {
        return reviewText("场景");
    },
};

/** 生成节奏的文案：新建页与设置页共用。 */
export const MEDIA_MODE_LABEL: Record<DramaMediaMode, { title: string; detail: string }> = {
    manual: {
        get title() {
            return reviewText("先出剧本与提示词，手动生成");
        },
        get detail() {
            return reviewText("只跑文本：作品圣经、分集、剧本、分镜、设定与各段视频提示词。确认后再逐集或全部生成参考图与视频");
        },
    },
    auto: {
        get title() {
            return reviewText("全自动出片");
        },
        get detail() {
            return reviewText("剧本写好后直接生成参考图和带原声的段视频，一路跑到成片");
        },
    },
};

export type EpisodeTone = "done" | "active" | "review" | "error" | "idle" | "ready";

export function episodeTone(episode: DramaEpisodeRow): EpisodeTone {
    if (episode.error || episode.stats.failed > 0) return "error";
    if (episode.awaitingMedia) return "ready";
    if (episode.stage === "review") return "review";
    if (episode.stage === "done" && !episode.finalStale) return "done";
    if (episode.stage === "queued") return "idle";
    return "active";
}

export function episodeStatusText(episode: DramaEpisodeRow) {
    if (episode.error) return reviewText("需要处理");
    if (episode.awaitingMedia) return reviewText("剧本就绪 · {v0} 镜 · 待生成画面", { v0: episode.shotCount });
    if (episode.stage === "done" && episode.finalStale) return reviewText("已修改 · 待重新合成");
    const { stats } = episode;
    switch (episode.stage) {
        case "prompts":
            return stats.segments ? reviewText("提示词 {v0}/{v1}", { v0: stats.promptReady, v1: stats.segments }) : STAGE_LABEL.prompts;
        case "video":
            return stats.segments ? reviewText("视频 {v0}/{v1}", { v0: stats.videoReady, v1: stats.segments }) : STAGE_LABEL.video;
        case "done":
            return reviewText("已完成 · {v0}", { v0: formatDuration(episode.durationMs) });
    }
    return STAGE_LABEL[episode.stage];
}

/** 每个流水线步骤的完成度：0 未开始、0-1 进行中、1 完成。 */
export function stepProgress(episode: DramaEpisodeRow, step: (typeof PIPELINE_STEPS)[number]["key"]) {
    const current = STAGE_INDEX[episode.stage];
    const index = PIPELINE_STEPS.findIndex((item) => item.key === step);
    if (episode.stage === "done" && !episode.finalStale) return 1;
    if (current > index) return 1;
    if (current < index) return 0;
    const total = Math.max(episode.stats.segments, 1);
    if (step === "prompts") return Math.max(0.08, episode.stats.promptReady / total);
    if (step === "video") return Math.max(0.08, episode.stats.videoReady / total);
    return 0.35;
}

export function StagePips({ episode, size = "sm" }: { episode: DramaEpisodeRow; size?: "sm" | "md" }) {
    useReviewLocale();
    const tone = episodeTone(episode);
    return (
        <span className={`drama-pips is-${size} is-${tone}`} aria-hidden>
            {PIPELINE_STEPS.map((step) => {
                const progress = stepProgress(episode, step.key);
                return (
                    <span key={step.key} className="drama-pip" title={step.label}>
                        <span className="drama-pip-fill" style={{ "--pip": progress } as CSSProperties} />
                    </span>
                );
            })}
        </span>
    );
}

export function formatDuration(ms: number) {
    const seconds = Math.max(0, Math.round(ms / 1000));
    const minutes = Math.floor(seconds / 60);
    return minutes ? reviewText("{v0}分{v1}秒", { v0: minutes, v1: String(seconds % 60).padStart(2, "0") }) : reviewText("{v0}秒", { v0: seconds });
}

export function formatClock(ms: number) {
    const seconds = Math.max(0, ms / 1000);
    return `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(1).padStart(4, "0")}`;
}

export function formatCredits(microcredits: number) {
    return formatDisplayCredits(microcredits);
}

export function formatCount(value: number) {
    if (value >= 10_000) return new Intl.NumberFormat(reviewLocale(), { notation: "compact", maximumFractionDigits: 1 }).format(value);
    return value.toLocaleString(reviewLocale());
}

export function aspectRatioValue(aspect: string) {
    const [width, height] = aspect.split(":").map(Number);
    return width && height ? `${width} / ${height}` : "9 / 16";
}

export function resourceUrl(id?: string) {
    return id ? resourceFileUrl(id) : "";
}

/** 加载失败后的自动重试间隔：访问地址过期、缩略图尚未生成或解码排队超时多是暂时的。 */
const THUMB_RETRY_DELAYS_MS = [1500, 5000];

/**
 * 资源缩略图。加载失败会自动重试两次，之后显示 failed（缺省为 fallback）；
 * loading 是加载中的占位（缺省为 fallback）。
 */
export function MediaThumb({ resourceId, alt, className, fallback, loading, failed }: { resourceId?: string; alt: string; className?: string; fallback?: ReactNode; loading?: ReactNode; failed?: ReactNode }) {
    useReviewLocale();
    const [retry, setRetry] = useState({ resourceId, attempt: 0 });
    const attempt = retry.resourceId === resourceId ? retry.attempt : 0;
    if (!resourceId) return <>{fallback ?? null}</>;
    const pending = loading ?? fallback ?? null;
    const delay = THUMB_RETRY_DELAYS_MS[attempt];
    const failure =
        delay === undefined ? (
            (failed ?? fallback ?? null)
        ) : (
            <ThumbRetry delayMs={delay} onRetry={() => setRetry({ resourceId, attempt: attempt + 1 })}>
                {pending}
            </ThumbRetry>
        );
    return <CachedResourceImage key={`${resourceId}:${attempt}`} storageKey={`resource:${resourceId}`} alt={alt} className={className} variant="thumbnail" fallback={failure} loadingFallback={pending} draggable={false} />;
}

function ThumbRetry({ delayMs, onRetry, children }: { delayMs: number; onRetry: () => void; children: ReactNode }) {
    useReviewLocale();
    const [handler] = useState(() => onRetry);
    useEffect(() => {
        const timer = window.setTimeout(handler, delayMs);
        return () => window.clearTimeout(timer);
    }, [delayMs, handler]);
    return <>{children}</>;
}

export function mediaBusy(status: DramaMediaStatus) {
    return status === "queued" || status === "running";
}

export function parseList(raw: string | undefined): string[] {
    try {
        const value: unknown = JSON.parse(raw || "[]");
        return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
    } catch {
        return [];
    }
}

/** 把 SRT 转成浏览器 <track> 需要的 WebVTT。 */
export function srtToVtt(srt: string) {
    return `WEBVTT\n\n${srt.replace(/\r/g, "").replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2")}`;
}

/** 解析资源的授权播放地址；视频优先使用浏览器兼容的播放副本。 */
export function useResourceMediaUrl(resourceId: string | undefined, variant: "original" | "playback" = "original") {
    return resourceId ? (variant === "playback" ? playbackVariantUrl(resourceId) : resourceUrl(resourceId)) : "";
}
export async function downloadResource(resourceId: string, fileName: string) {
    const blob = await getResourceBlob(`resource:${resourceId}`);
    if (!blob) throw new Error(reviewText("下载失败"));
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(content: string, fileName: string, mime = "text/plain") {
    const url = URL.createObjectURL(new Blob([content], { type: `${mime};charset=utf-8` }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
