import { userVisiblePrompt } from "@/lib/canvas/reference-prompt-description";
import { Button, Image, Modal } from "antd";
import { XCircle } from "lucide-react";
import { GenerationErrorCard } from "@/components/generation-error-card";

import { TaskDetailItem } from "./canvas-project-feedback";
import { generationTaskShowsProgress } from "@/lib/generation-task-display";
import { localizedGenerationTaskStage } from "@/i18n/generation-task";
import { useI18n } from "@/i18n/use-i18n";
import { DATE_TIME_FORMAT } from "@/i18n/locale-core";

import { formatTaskLog, type GenerationTask, type TaskLog } from "@/services/api/task-center";
import { CanvasNodeType, type CanvasNodeData } from "@/types/canvas";
import { VideoPlayer } from "@/components/video-player";
import { useEffectiveConfig } from "@/stores/use-config-store";
import { producedModelLabel } from "@/lib/canvas/produced-model";

type TaskI18n = Pick<ReturnType<typeof useI18n>, "t" | "number" | "date">;

type CanvasProjectStatusDialogsProps = {
    theme: { node: { stroke: string; panel: string; muted: string; fill: string } };
    task: GenerationTask | null;
    taskLogs: TaskLog[];
    taskLoading: boolean;
    onCloseTask: () => void;
    onCancelTask?: (task: GenerationTask) => void;
    superResolveNode: CanvasNodeData | null;
    onCloseSuperResolve: () => void;
    previewNode: CanvasNodeData | null;
    onClosePreview: () => void;
    clearConfirmOpen: boolean;
    onCancelClear: () => void;
    onConfirmClear: () => void;
};

export function CanvasProjectStatusDialogs({
    theme,
    task,
    taskLogs,
    taskLoading,
    superResolveNode,
    previewNode,
    clearConfirmOpen,
    onCloseTask,
    onCancelTask,
    onCloseSuperResolve,
    onClosePreview,
    onCancelClear,
    onConfirmClear,
}: CanvasProjectStatusDialogsProps) {
    const { t, number, date } = useI18n();
    const config = useEffectiveConfig();
    if (!task && !superResolveNode && !previewNode && !clearConfirmOpen) return null;
    return (
        <>
            <Modal title={t("canvasTaskDetail.title")} open={Boolean(task)} footer={null} width="min(920px, calc(100vw - 32px))" onCancel={onCloseTask}>
                {task ? (
                    <div className="space-y-4 text-sm">
                        <div className="grid grid-cols-2 gap-3 rounded-lg border p-3" style={{ borderColor: theme.node.stroke, background: theme.node.panel }}>
                            <TaskDetailItem label={t("canvasTaskDetail.stage")} value={localizedGenerationTaskStage(task, t)} />
                            {generationTaskShowsProgress(task) ? <TaskDetailItem label={t("canvasTaskDetail.progress")} value={`${number(task.progress ?? 0)}%`} /> : null}
                            <TaskDetailItem label={t("canvasTaskDetail.model")} value={task.modelName || producedModelLabel(config, task.model) || t("canvasTaskDetail.defaultModel")} />
                            <TaskDetailItem label={t("canvasTaskDetail.created")} value={formatTaskTime(task.createdAt, { t, number, date })} />
                            <TaskDetailItem label={t("canvasTaskDetail.started")} value={formatTaskTime(task.startedAt, { t, number, date })} />
                            <TaskDetailItem label={t("canvasTaskDetail.completed")} value={formatTaskTime(task.completedAt, { t, number, date })} />
                            <TaskDetailItem label={t("canvasTaskDetail.duration")} value={formatTaskDuration(task, { t, number, date })} />
                        </div>
                        <div>
                            <div className="mb-2 text-xs font-semibold" style={{ color: theme.node.muted }}>
                                {t("canvasTaskDetail.prompt")}
                            </div>
                            <div className="h-32 overflow-y-auto whitespace-pre-wrap rounded-lg p-3 text-xs leading-5" style={{ background: theme.node.fill }}>
                                {userVisiblePrompt(task.prompt) || t("canvasTaskDetail.notRecorded")}
                            </div>
                        </div>
                        <TaskGenerationParameters inputJson={task.inputJson} theme={theme} />
                        {task.status === "failed" ? <GenerationErrorCard error={task} /> : null}
                        {onCancelTask && (task.status === "queued" || task.status === "running") ? (
                            <div className="flex justify-end">
                                <Button danger icon={<XCircle className="size-4" />} onClick={() => onCancelTask(task)}>
                                    {t("canvasTaskDetail.cancelTask")}
                                </Button>
                            </div>
                        ) : null}
                        <div>
                            <div className="mb-2 text-xs font-semibold" style={{ color: theme.node.muted }}>
                                {t("canvasTaskDetail.logs")}
                            </div>
                            <pre className="max-h-64 overflow-auto rounded-lg bg-neutral-950 p-3 text-[var(--fs-label)] leading-5 text-neutral-100">
                                {taskLoading
                                    ? t("canvasTaskDetail.loading")
                                    : taskLogs.length
                                      ? taskLogs.map((log) => `[${formatTaskTime(log.createdAt, { t, number, date })}] ${log.level.toUpperCase()} ${formatTaskLog(log)}`).join("\n")
                                      : t("canvasTaskDetail.noLogs")}
                            </pre>
                        </div>
                    </div>
                ) : null}
            </Modal>

            <Modal title={t("canvasTaskDetail.superResolve")} open={Boolean(superResolveNode?.metadata?.content)} centered footer={null} onCancel={onCloseSuperResolve}>
                <div className="py-8 text-center text-base font-medium">{t("canvasTaskDetail.unavailable")}</div>
            </Modal>

            <Modal
                title={t("canvasTaskDetail.videoPreview")}
                open={Boolean(previewNode?.metadata?.content && previewNode.type === CanvasNodeType.Video)}
                centered
                onCancel={onClosePreview}
                footer={null}
                width="min(1200px, calc(100vw - 32px))"
                styles={{ body: { padding: 0, display: "flex", justifyContent: "center", alignItems: "center", maxHeight: "84vh", overflow: "hidden", background: "#090909" } }}
            >
                {previewNode?.metadata?.content && previewNode.type === CanvasNodeType.Video ? (
                    <VideoPlayer
                        src={previewNode.metadata.content}
                        mimeType={previewNode.metadata.mimeType}
                        title={previewNode.title || t("canvasTaskDetail.videoPreview")}
                        hasAudio={typeof previewNode.metadata.hasAudio === "boolean" ? previewNode.metadata.hasAudio : undefined}
                        className="max-h-[84vh] max-w-full bg-black"
                    />
                ) : null}
            </Modal>

            {previewNode?.metadata?.content && previewNode.type === CanvasNodeType.Image ? (
                <Image
                    src={previewNode.metadata.content}
                    alt={previewNode.title || t("canvasTaskDetail.image")}
                    style={{ display: "none" }}
                    preview={{
                        open: true,
                        movable: true,
                        minScale: 0.5,
                        maxScale: 12,
                        scaleStep: 0.25,
                        onOpenChange: (open) => !open && onClosePreview(),
                    }}
                />
            ) : null}

            <Modal
                title={t("canvasTaskDetail.clearTitle")}
                open={clearConfirmOpen}
                centered
                onCancel={onCancelClear}
                footer={
                    <>
                        <Button onClick={onCancelClear}>{t("canvasTaskDetail.cancel")}</Button>
                        <Button danger type="primary" onClick={onConfirmClear}>
                            {t("canvasTaskDetail.clear")}
                        </Button>
                    </>
                }
            >
                <p className="text-sm opacity-60">{t("canvasTaskDetail.clearDescription")}</p>
            </Modal>
        </>
    );
}

function TaskGenerationParameters({ inputJson, theme }: { inputJson?: string; theme: CanvasProjectStatusDialogsProps["theme"] }) {
    const { t, number } = useI18n();
    const fields = taskParameterRows(inputJson, { t, number });
    return (
        <div>
            <div className="mb-2 text-xs font-semibold" style={{ color: theme.node.muted }}>
                {t("canvasTaskDetail.parameters")}
            </div>
            {fields.length ? (
                <div className="grid grid-cols-2 gap-x-5 gap-y-1 rounded-lg border p-3 sm:grid-cols-3" style={{ borderColor: theme.node.stroke, background: theme.node.panel }}>
                    {fields.map((field) => (
                        <TaskDetailItem key={field.label} label={field.label} value={field.value} />
                    ))}
                </div>
            ) : (
                <div className="rounded-lg p-3 text-xs" style={{ background: theme.node.fill, color: theme.node.muted }}>
                    {t("canvasTaskDetail.noParameters")}
                </div>
            )}
        </div>
    );
}

export function taskParameterRows(inputJson: string | undefined, { t, number }: Pick<TaskI18n, "t" | "number">) {
    if (!inputJson) return [] as Array<{ label: string; value: string }>;
    let input: Record<string, unknown>;
    try {
        const parsed: unknown = JSON.parse(inputJson);
        input = asRecord(parsed);
    } catch {
        return [] as Array<{ label: string; value: string }>;
    }
    const config = asRecord(input.config);
    const rows: Array<{ label: string; value: string }> = [];
    const add = (label: string, value: unknown) => {
        if (value === undefined || value === null || value === "") return;
        rows.push({ label, value: String(value) });
    };
    add(t("canvasTaskDetail.size"), config.size);
    add(t("canvasTaskDetail.resolution"), config.vquality || config.quality);
    add(t("canvasTaskDetail.secondsLabel"), config.videoSeconds === undefined ? undefined : t("canvasTaskDetail.secondsValue", { seconds: String(config.videoSeconds) }));
    add(t("canvasTaskDetail.count"), config.count);
    add(t("canvasTaskDetail.generateAudio"), booleanLabel(config.videoGenerateAudio, t));
    add(t("canvasTaskDetail.watermark"), booleanLabel(config.videoWatermark, t));
    add(t("canvasTaskDetail.voice"), config.audioVoice);
    add(t("canvasTaskDetail.format"), config.audioFormat);
    add(t("canvasTaskDetail.speed"), config.audioSpeed);
    const counts = asRecord(input.referenceCounts);
    addReference(t("canvasTaskDetail.referenceImages"), input.referenceImages, t("canvasTaskDetail.image"), counts.images);
    addReference(t("canvasTaskDetail.referenceVideos"), input.referenceVideos, t("canvasTaskDetail.video"), counts.videos);
    addReference(t("canvasTaskDetail.referenceAudios"), input.referenceAudios, t("canvasTaskDetail.audio"), counts.audios);
    return rows;

    function addReference(label: string, value: unknown, kind: string, count: unknown) {
        if (typeof count === "number" && Number.isInteger(count) && count >= 0) {
            rows.push({ label, value: t("canvasTaskDetail.referenceCount", { count: number(count), kind, suffix: "" }) });
            return;
        }
        if (!Array.isArray(value) || !value.length) return;
        const names = value.map((item) => (typeof item === "object" && item !== null && "name" in item ? String((item as { name?: unknown }).name || "") : "")).filter(Boolean);
        const suffix = names.length ? t("canvasTaskDetail.referenceNames", { names: `${names.slice(0, 3).join(t("canvasTaskDetail.separator"))}${names.length > 3 ? "…" : ""}` }) : "";
        rows.push({ label, value: t("canvasTaskDetail.referenceCount", { count: number(value.length), kind, suffix }) });
    }
}

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function booleanLabel(value: unknown, t: TaskI18n["t"]) {
    if (value === true || value === "true") return t("canvasTaskDetail.enabled");
    if (value === false || value === "false") return t("canvasTaskDetail.disabled");
    return "";
}

export function formatTaskTime(value: string | undefined, { t, date }: TaskI18n) {
    if (!value) return t("canvasTaskDetail.notRecorded");
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? date(timestamp, DATE_TIME_FORMAT) : value;
}

export function formatTaskDuration(task: GenerationTask, { t, number }: TaskI18n) {
    const start = Date.parse(task.startedAt || task.createdAt);
    const end = task.completedAt ? Date.parse(task.completedAt) : task.status === "queued" || task.status === "running" ? Date.now() : Number.NaN;
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return task.completedAt ? t("canvasTaskDetail.notRecorded") : t("canvasTaskDetail.unfinished");
    const milliseconds = Math.max(0, end - start);
    const totalSeconds = Math.round(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes ? t("canvasTaskDetail.minutes", { minutes: number(minutes), seconds: number(seconds) }) : t("generationTask.seconds", { seconds: number(seconds) });
}
