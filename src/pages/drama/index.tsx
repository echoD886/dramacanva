import { WorkspaceNoResultsState } from "./ui";
import { watchText as w } from "./studio/gallery-copy";
import { useDramaSummary } from "./studio/use-studio";
import { reviewServerText, reviewText, useReviewLocale } from "@/i18n/drama-messages";
import { useDeferredValue, useEffect, useRef, useState, type DragEvent } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Dropdown, Input } from "antd";
import { BookOpenText, ClipboardPaste, Clapperboard, ExternalLink, FileUp, MoreHorizontal, Plus, Search, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router";

import { CollectionToolbar } from "./ui";
import { PageHeader, PaginationBar, WorkspacePage } from "@/components/layout/workspace-page";
import { WorkspaceErrorState, WorkspaceLoadingState } from "@/components/layout/workspace-state";
import { deleteDrama, listDramas, type DramaListItem, type DramaStatus } from "@/services/api/drama";

import { formatCredits, MediaThumb, STATUS_LABEL } from "./drama-shared";
import { progressFillStyle } from "@/pages/drama/progress-fill";
import { RelativeTime } from "./ui";
import "./drama.css";
import "./studio/final-gallery.css";

const PAGE_SIZES = [24, 48, 96];
const PIPELINE = [reviewText("解析章节"), reviewText("建立角色、道具与场景"), reviewText("分集改编与段提示词"), reviewText("按剧情段生成视频"), reviewText("合成成片")];
const STATUS_FILTERS: Array<{ value: DramaStatus | "all"; label: string }> = [
    {
        value: "all",
        get label() {
            return reviewText("全部");
        },
    },
    {
        value: "running",
        get label() {
            return reviewText("制作中");
        },
    },
    {
        value: "paused",
        get label() {
            return reviewText("已暂停");
        },
    },
    {
        value: "completed",
        get label() {
            return reviewText("已完成");
        },
    },
    {
        value: "draft",
        get label() {
            return reviewText("未开始");
        },
    },
];
const ACCEPT = ".txt,.md,.markdown,text/plain,text/markdown";

export default function DramaListPage() {
    useReviewLocale();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { message, modal } = App.useApp();
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [keyword, setKeyword] = useState("");
    const [status, setStatus] = useState<DramaStatus | "all">("all");
    const [dragging, setDragging] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);
    const search = useDeferredValue(keyword.trim());
    useEffect(() => setPage(1), [search, status, pageSize]);

    const query = useQuery({
        queryKey: ["dramas", { page, pageSize, search, status }],
        queryFn: ({ signal }) => listDramas({ page, pageSize, q: search || undefined, status: status === "all" ? undefined : status }, signal),
        placeholderData: keepPreviousData,
        refetchInterval: (state) => (state.state.data?.items.some((item) => item.status === "running") ? 8_000 : false),
    });
    const remove = useMutation({
        mutationFn: deleteDrama,
        onSuccess: () => {
            message.success(reviewText("作品已删除"));
            void queryClient.invalidateQueries({ queryKey: ["dramas"] });
        },
        onError: (error) => message.error(error instanceof Error ? reviewServerText(error.message) : reviewText("删除失败")),
    });
    const data = query.data;
    const counts = data?.statusCounts || {};
    const total = counts.all ?? 0;
    const filtered = Boolean(search || status !== "all");
    const openFile = (file: File) => navigate("/projects/create", { state: { file } });
    const confirmDelete = (item: DramaListItem) => {
        modal.confirm({
            title: reviewText("删除《{v0}》？", { v0: item.project.name }),
            content: reviewText("小说原文、剧本、分镜与成片记录都会删除。此操作无法撤销。"),
            okText: reviewText("删除"),
            okButtonProps: { danger: true },
            cancelText: reviewText("取消"),
            centered: true,
            onOk: () => remove.mutateAsync(item.project.id),
        });
    };
    // 整页都能拖入小说：列表页不再单独放一块上传区占位置。
    const dragProps = {
        onDragOver: (event: DragEvent) => {
            if (event.dataTransfer.types.includes("Files")) {
                event.preventDefault();
                setDragging(true);
            }
        },
        onDragLeave: (event: DragEvent) => {
            if (event.currentTarget === event.target) setDragging(false);
        },
        onDrop: (event: DragEvent) => {
            event.preventDefault();
            setDragging(false);
            const file = event.dataTransfer.files?.[0];
            if (file) openFile(file);
        },
    };

    if (query.isLoading)
        return (
            <WorkspacePage className="studio-collection-page">
                <WorkspaceLoadingState label={reviewText("正在读取作品")} />
            </WorkspacePage>
        );
    if (query.isError && !data)
        return (
            <WorkspacePage className="studio-collection-page">
                <WorkspaceErrorState description={reviewText("作品列表暂时无法读取。")} onRetry={() => void query.refetch()} />
            </WorkspacePage>
        );

    const actions = (
        <div className="collection-header-actions">
            <Button icon={<ClipboardPaste />} onClick={() => navigate("/projects/new?paste=1")}>
                {reviewText("粘贴正文")}
            </Button>
            <Button type="primary" icon={<Plus />} onClick={() => fileRef.current?.click()}>
                {reviewText("上传小说")}
            </Button>
        </div>
    );

    return (
        <WorkspacePage className="studio-collection-page drama-library">
            <div className="drama-root" {...dragProps}>
                <div className="studio-band">
                    <PageHeader
                        title={reviewText("短剧")}
                        description={reviewText("上传一本小说，流水线自动改编、拆集、建角色、出分镜并合成成片。")}
                        meta={
                            <span className="app-projects-header-meta">
                                {total}
                                {reviewText("部")}
                            </span>
                        }
                        actions={total ? actions : undefined}
                    />
                    {total ? (
                        <CollectionToolbar
                            label={reviewText("短剧浏览工具")}
                            active={filtered}
                            onReset={() => {
                                setKeyword("");
                                setStatus("all");
                            }}
                        >
                            <Input prefix={<Search />} value={keyword} allowClear placeholder={reviewText("搜索作品名")} aria-label={reviewText("搜索作品名")} onChange={(event) => setKeyword(event.target.value)} />
                            <div className="drama-library-status" role="radiogroup" aria-label={reviewText("按状态筛选")}>
                                {STATUS_FILTERS.map((item) => {
                                    const count = item.value === "all" ? total : counts[item.value] || 0;
                                    if (item.value !== "all" && !count && status !== item.value) return null;
                                    return (
                                        <button key={item.value} type="button" role="radio" aria-checked={status === item.value} className={`drama-library-status-item is-${item.value}`} onClick={() => setStatus(item.value)}>
                                            {item.value !== "all" ? <span className="drama-dot" /> : null}
                                            {item.label}
                                            <b>{count}</b>
                                        </button>
                                    );
                                })}
                            </div>
                        </CollectionToolbar>
                    ) : null}
                </div>

                {!total ? (
                    <UploadHero onPick={() => fileRef.current?.click()} onPaste={() => navigate("/projects/new?paste=1")} />
                ) : data?.items.length ? (
                    <>
                        <div className={`drama-library-grid ${query.isPlaceholderData ? "is-stale" : ""}`}>
                            {data.items.map((item) => (
                                <DramaCard key={item.project.id} item={item} onDelete={() => confirmDelete(item)} />
                            ))}
                        </div>
                        <PaginationBar
                            current={page}
                            pageSize={pageSize}
                            total={data.total}
                            itemLabel={reviewText("部")}
                            pageSizeOptions={PAGE_SIZES}
                            onChange={(next, size) => {
                                setPage(next);
                                setPageSize(size);
                            }}
                        />
                    </>
                ) : (
                    <WorkspaceNoResultsState
                        icon="projects"
                        query={keyword}
                        description={reviewText("换一个作品名，或清除状态筛选。")}
                        onClear={() => {
                            setKeyword("");
                            setStatus("all");
                        }}
                    />
                )}

                {dragging ? (
                    <div className="drama-library-drop" aria-hidden>
                        <div>
                            <FileUp className="size-8" />
                            <strong>{reviewText("松开即可开始新短剧")}</strong>
                            <span>{reviewText("TXT / Markdown，自动识别编码与章节")}</span>
                        </div>
                    </div>
                ) : null}
                <input
                    ref={fileRef}
                    type="file"
                    accept={ACCEPT}
                    className="hidden"
                    onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) openFile(file);
                        event.target.value = "";
                    }}
                />
            </div>
        </WorkspacePage>
    );
}

/** 还没有作品时的上传引导；有作品后整页都可拖入，不再常驻占位。 */
function UploadHero({ onPick, onPaste }: { onPick: () => void; onPaste: () => void }) {
    useReviewLocale();
    return (
        <div className="drama-drop drama-library-hero">
            <span className="drama-drop-icon">
                <BookOpenText className="size-7" />
            </span>
            <h2>{reviewText("拖入一本小说，开始做短剧")}</h2>
            <p>{reviewText("支持 TXT / Markdown，最多 600 万字。确认风格、参考图方案和审阅方式后，系统自动改编、拆集、建角色、出分镜并合成成片。")}</p>
            <div className="flex flex-wrap justify-center gap-2">
                <Button type="primary" size="large" icon={<FileUp className="size-4" />} onClick={onPick}>
                    {reviewText("选择小说文件")}
                </Button>
                <Button size="large" icon={<ClipboardPaste className="size-4" />} onClick={onPaste}>
                    {reviewText("粘贴正文")}
                </Button>
            </div>
            <div className="drama-drop-steps">
                {PIPELINE.map((step, index) => (
                    <span key={step}>
                        <b>{index + 1}</b>
                        {step}
                    </span>
                ))}
            </div>
        </div>
    );
}

function DramaCover({ item }: { item: DramaListItem }) {
    useReviewLocale();
    const covers = (item.coverResourceIds?.length ? item.coverResourceIds : item.coverResourceId ? [item.coverResourceId] : []).slice(0, 4);
    if (!covers.length) {
        return (
            <div className="drama-library-cover is-empty">
                <span className="drama-library-glyph">{item.project.name.slice(0, 1)}</span>
                <Clapperboard className="drama-library-empty-icon" />
            </div>
        );
    }
    return (
        <div className={`drama-library-cover is-${covers.length}`}>
            {covers.map((id) => (
                <span key={id}>
                    <MediaThumb resourceId={id} alt="" />
                </span>
            ))}
        </div>
    );
}

function FinalCount({ projectId }: { projectId: string }) {
    const summary = useDramaSummary(projectId);
    const count = summary.data?.episodes.filter((e) => e.finalResourceId).length || 0;
    return count ? (
        <Link className="drama-final-count drama-chip" to={`/projects/drama/${projectId}?view=final`}>
            {w("finished", { n: count })} →
        </Link>
    ) : null;
}

function DramaCard({ item, onDelete }: { item: DramaListItem; onDelete: () => void }) {
    useReviewLocale();
    const progress = item.episodeCount ? Math.round((item.doneCount / item.episodeCount) * 100) : 0;
    const needsAction = item.status === "paused" && Boolean(item.pauseReason);
    const stage = item.episodeCount ? reviewText("{v0}/{v1} 集成片", { v0: item.doneCount, v1: item.episodeCount }) : item.status === "running" ? reviewText("正在改编小说") : item.status === "draft" ? reviewText("尚未开始") : reviewText("等待分集");
    return (
        <article className={`drama-library-card is-${item.status}`}>
            <FinalCount projectId={item.project.id} />
            <Link to={`/projects/drama/${item.project.id}`} className="drama-library-open" aria-label={reviewText("打开《{v0}》", { v0: item.project.name })}>
                <DramaCover item={item} />
                <span className={`drama-chip drama-library-badge is-${needsAction ? "paused" : item.status}`}>
                    <span className="drama-dot" />
                    {needsAction ? reviewText("需要处理") : STATUS_LABEL[item.status]}
                </span>
                <div className="drama-library-body">
                    <h3 title={item.project.name}>{item.project.name}</h3>
                    <div className="drama-library-meta">
                        {item.styleName ? <span>{item.styleName}</span> : null}
                        <span>{item.aspectRatio}</span>
                        <RelativeTime value={item.updatedAt || item.project.updatedAt} />
                    </div>
                    <div className="drama-library-progress">
                        <span className="drama-library-progress-bar">
                            <span style={progressFillStyle(Math.max(progress, item.episodeCount && progress === 0 ? 2 : progress))} />
                        </span>
                        <span className="drama-library-progress-text">
                            <b>{stage}</b>
                            {item.spentMicrocredits ? (
                                <span>
                                    {formatCredits(item.spentMicrocredits)}
                                    {reviewText("积分")}
                                </span>
                            ) : null}
                        </span>
                    </div>
                    {needsAction ? (
                        <p className="drama-library-alert" title={item.pauseReason}>
                            {item.pauseReason}
                        </p>
                    ) : null}
                </div>
            </Link>
            <div className="drama-library-menu">
                <Dropdown
                    trigger={["click"]}
                    placement="bottomRight"
                    menu={{
                        items: [
                            { key: "open", icon: <ExternalLink className="size-3.5" />, label: <Link to={`/projects/drama/${item.project.id}`}>{reviewText("打开制作台")}</Link> },
                            { type: "divider" },
                            { key: "delete", danger: true, icon: <Trash2 className="size-3.5" />, label: reviewText("删除作品"), onClick: onDelete },
                        ],
                    }}
                >
                    <button type="button" className="product-icon-button" aria-label={reviewText("{v0} 更多操作", { v0: item.project.name })}>
                        <MoreHorizontal />
                    </button>
                </Dropdown>
            </div>
        </article>
    );
}
