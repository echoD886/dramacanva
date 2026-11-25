import type { GenerationTask, TaskStatus } from "@/services/api/task-center";

export const statusLabel: Record<TaskStatus, string> = {
    queued: "排队中",
    running: "生成中",
    succeeded: "已完成",
    failed: "失败",
    cancelled: "已取消",
};

type GenerationTaskDisplayTarget = Pick<GenerationTask, "provider" | "status" | "stage" | "officialStatus"> & Partial<Pick<GenerationTask, "errorCode">>;

export function isGenerationTaskSubmissionUncertain(task: GenerationTaskDisplayTarget) {
    return task.provider === "dreamina-cli" && (task.stage === "submission_unknown" || task.errorCode === "dreamina_submission_unknown");
}

export function generationTaskStatusLabel(task: GenerationTaskDisplayTarget) {
    if (isGenerationTaskSubmissionUncertain(task)) return "提交结果待确认";
    if (task.provider === "dreamina-cli" && task.stage === "submitting") return "正在提交";
    if (task.provider === "dreamina-cli" && task.officialStatus === "pending") return "官方排队中";
    if (task.provider === "dreamina-cli" && task.officialStatus === "processing") return "生成中";
    if (task.provider === "dreamina-cli" && task.officialStatus === "completed") return "官方已完成";
    if (task.provider === "dreamina-cli" && task.status === "running" && task.stage === "submitted") return "状态待更新";
    return statusLabel[task.status];
}

// Stages written for users. Everything else a task can carry — backend pipeline steps ("正在连接上游",
// "后端接管任务"), provider names or raw provider states, and any stage added later — shows the plain
// status instead (排队中 / 生成中 / 已完成 …). Internal wording must never reach the interface.
export const USER_FACING_TASK_STAGES = new Set([
    "作品已生成，正在保存",
    "作品已生成，等待保存",
    "作品已生成，保存遇到问题，正在自动恢复",
    "等待恢复作品保存",
    "任务结果保存失败",
    "准备媒体…",
    "正在渲染…",
    "写入资源…",
    "渲染完成",
    "渲染失败",
    "等待转写服务",
    "正在转写…",
    "转写完成",
    "转写失败",
]);

export function generationTaskStageLabel(task: GenerationTaskDisplayTarget) {
    if (isGenerationTaskSubmissionUncertain(task)) return "为避免重复扣费，未自动重试";
    if (task.provider === "dreamina-cli" && task.stage === "submitting") return "正在提交，等待官方确认";
    // A known official state is already worded for users by the status label (官方排队中 / 生成中 / 官方已完成).
    if (task.provider === "dreamina-cli" && task.officialStatus) return generationTaskStatusLabel(task);
    if (task.provider === "dreamina-cli" && task.status === "running" && task.stage === "submitted") return "已提交，等待状态更新";
    if (task.stage && USER_FACING_TASK_STAGES.has(task.stage)) return task.stage;
    return generationTaskStatusLabel(task);
}

export function generationTaskShowsProgress(task: GenerationTaskDisplayTarget) {
    if (isGenerationTaskSubmissionUncertain(task)) return false;
    // 排队、后端接管和连接供应商都没有真实百分比。只有上游状态响应
    // 已经写回任务后才显示进度，避免所有图片/视频长期停在同一个假数值。
    if (["等待队列调度", "后端接管任务", "正在连接上游", "调用生成模型"].includes(task.stage || "")) return false;
    return !(task.provider === "dreamina-cli" && task.status === "running" && (task.stage === "submitting" || task.stage === "submitted"));
}

export type GenerationPhase = 0 | 1 | 2;

export function generationPhase(task: Pick<GenerationTask, "status" | "stage" | "mediaStage">): GenerationPhase {
    if (task.status === "succeeded" || task.mediaStage || task.stage?.startsWith("作品已生成") || task.stage === "等待恢复作品保存") return 2;
    if (task.status === "queued" || task.stage === "等待队列调度") return 0;
    return 1;
}

export const operationOptions = [
    { label: "Agent 会话：拆解影视工作流", value: "agent_session" },
    { label: "文生视频", value: "text_to_video" },
    { label: "图生视频", value: "image_to_video" },
    { label: "全模态参考", value: "reference_to_video" },
    { label: "视频续写", value: "extend" },
    { label: "视频局部修改", value: "inpaint" },
    { label: "元素替换", value: "replace_element" },
    { label: "镜头/运镜调整", value: "camera_motion" },
    { label: "风格迁移", value: "style_transfer" },
    { label: "参考音频生成视频", value: "audio_to_video" },
    { label: "结果版本对比", value: "compare_versions" },
];

export const operationLabelByValue = new Map(operationOptions.map((item) => [item.value, item.label]));

export const taskTypeLabel: Record<string, string> = {
    agent_session: "Agent 会话",
    agent_storyboard: "Agent 分镜",
    agent_storyboard_rows: "分镜脚本",
    canvas_image: "画布生图",
    canvas_video: "画布视频",
    canvas_audio: "画布音频",
    canvas_text: "画布文本",
};

export function formatTaskKind(task: GenerationTask) {
    if (task.type === "agent_session" || task.operation === "agent_session") return "Agent 会话";

    const typeLabel = taskTypeLabel[task.type];
    const operationLabel = task.operation ? operationLabelByValue.get(task.operation) : "";

    if (task.type === "canvas_video" && operationLabel) return `${typeLabel || "画布视频"} · ${operationLabel}`;
    if (typeLabel) return typeLabel;
    if (operationLabel) return operationLabel;
    if (task.type.startsWith("video_")) return "视频任务";
    return "生成任务";
}

const cancellablePreSubmissionStages = new Set(["queued", "等待队列调度", "后端接管任务", "正在准备创作"]);

export function canCancelGenerationTask(task: GenerationTask) {
    if (task.status !== "queued" && task.status !== "running") return false;
    if (task.providerRequestId || task.providerCancelStatus || task.mediaStage) return false;
    const stage = (task.stage || "").trim().toLowerCase();
    // Unknown running stages are treated as already submitted. A provider may
    // return a custom stage name, and showing a cancel button in that state is
    // more dangerous than conservatively hiding it after billing may begin.
    if (!stage) return task.status === "queued";
    return cancellablePreSubmissionStages.has(stage);
}
