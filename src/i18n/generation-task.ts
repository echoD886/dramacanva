import { generationTaskStageLabel, generationTaskStatusLabel } from "@/lib/generation-task-display";
import type { MessageKey, MessageValues } from "./messages";

type DisplayTask = Parameters<typeof generationTaskStatusLabel>[0];
type Translate = (key: MessageKey, values?: MessageValues) => string;

// Translate display output only; provider status and progress/retry decisions remain canonical.
const labels = {
    "作品已生成，正在保存": "mediaRecovery.saving",
    "作品已生成，等待保存": "mediaRecovery.waiting",
    "作品已生成，保存遇到问题，正在自动恢复": "mediaRecovery.recovering",
    等待恢复作品保存: "mediaRecovery.queued",
    任务结果保存失败: "mediaRecovery.failed",
    "准备媒体…": "editorTools.stagePreparing",
    "正在渲染…": "editorTools.rendering",
    "写入资源…": "editorTools.stageSaving",
    渲染完成: "editorTools.stageRenderDone",
    渲染失败: "editorTools.renderFailed",
    等待转写服务: "editorTools.stageTranscriptionWaiting",
    "正在转写…": "editorTools.transcribing",
    转写完成: "editorTools.stageTranscriptionDone",
    转写失败: "editorTools.transcriptionFailed",
    排队中: "generationTask.queued",
    生成中: "generationTask.running",
    已完成: "generationTask.succeeded",
    失败: "generationTask.failed",
    已取消: "generationTask.cancelled",
    提交结果待确认: "generationTask.uncertain",
    正在提交: "generationTask.submitting",
    官方排队中: "generationTask.officialQueue",
    官方已完成: "generationTask.officialComplete",
    状态待更新: "generationTask.awaitingUpdate",
    "为避免重复扣费，未自动重试": "generationTask.noRetry",
    "正在提交，等待官方确认": "generationTask.confirmation",
    "已提交，等待状态更新": "generationTask.submitted",
} as const satisfies Record<string, MessageKey>;

function localizedLabel(label: string, t: Translate) {
    return Object.hasOwn(labels, label) ? t(labels[label as keyof typeof labels]) : label;
}

export function localizedGenerationTaskStatus(task: DisplayTask, t: Translate) {
    return localizedLabel(generationTaskStatusLabel(task), t);
}

export function localizedGenerationTaskStage(task: DisplayTask, t: Translate) {
    return localizedLabel(generationTaskStageLabel(task), t);
}
