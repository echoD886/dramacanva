import { resolveAppLocale } from "@/i18n/app-locale";
import { translateMessage, type MessageKey, type MessageValues } from "@/i18n/messages";

export type AgentTranslate = (key: MessageKey, values?: MessageValues) => string;

export const AGENT_TOOL_METADATA: Record<string, { summary: MessageKey | ((context: { pending: boolean; t: AgentTranslate; detail?: unknown }) => MessageKey); failureMessage: MessageKey }> = {
    previs_scene_read: { summary: "previs.readScene", failureMessage: "canvasCloudAgentChat.tool.summary.getStateFailed" },
    previs_preview: { summary: "previs.preview", failureMessage: "canvasExtra.directorWB.clayVideoFailed" },
    previs_scene_create: { summary: "previs.createScene", failureMessage: "canvasCloudAgentChat.tool.summary.applyOpsFailed" },
    previs_apply_patch: { summary: "previs.editScene", failureMessage: "canvasCloudAgentChat.tool.summary.applyOpsFailed" },
    canvas_read_text: { summary: "previs.readText", failureMessage: "canvasCloudAgentChat.tool.summary.getStateFailed" },
    director_scene_read: { summary: "previs.readScene", failureMessage: "canvasCloudAgentChat.tool.summary.getStateFailed" },
    director_preview: { summary: "previs.preview", failureMessage: "canvasExtra.directorWB.clayVideoFailed" },
    director_scene_create: { summary: "previs.createScene", failureMessage: "canvasCloudAgentChat.tool.summary.applyOpsFailed" },
    director_apply_patch: { summary: "previs.editScene", failureMessage: "canvasCloudAgentChat.tool.summary.applyOpsFailed" },
    canvas_inspect_image: { summary: "agentVision.inspect", failureMessage: "agentVision.failed" },
    canvas_list_node_types: { summary: "canvasCloudAgentChat.tool.summary.listNodeTypes", failureMessage: "canvasCloudAgentChat.tool.summary.listNodeTypesFailed" },
    canvas_get_state: { summary: "canvasCloudAgentChat.tool.summary.getState", failureMessage: "canvasCloudAgentChat.tool.summary.getStateFailed" },
    task_get: { summary: "canvasCloudAgentChat.tool.summary.taskGet", failureMessage: "canvasCloudAgentChat.tool.summary.taskGetFailed" },
    canvas_apply_ops: { summary: ({ pending }) => (pending ? "canvasCloudAgentChat.tool.summary.applyOpsPending" : "canvasCloudAgentChat.tool.summary.applyOpsDone"), failureMessage: "canvasCloudAgentChat.tool.summary.applyOpsFailed" },
    model_list: { summary: "canvasCloudAgentChat.tool.summary.modelList", failureMessage: "canvasCloudAgentChat.tool.summary.modelListFailed" },
    generate_media: {
        summary: ({ pending, detail }) =>
            pending ? "canvasCloudAgentChat.tool.summary.mediaPending" : field(detail, "eventType") === "tool_completed" ? "canvasCloudAgentChat.tool.summary.mediaCompleted" : "canvasCloudAgentChat.tool.summary.mediaSubmitted",
        failureMessage: "canvasCloudAgentChat.tool.summary.mediaFailed",
    },
};

export type AgentToolCategory = "read" | "create" | "operate";

function record(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function toolArguments(detail?: unknown) {
    const value = record(detail).arguments;
    if (typeof value !== "string") return record(value);
    try {
        return record(JSON.parse(value));
    } catch {
        return {};
    }
}

/**
 * Keeps the activity feed semantic instead of presenting every tool call as
 * the same check-mark row. This is intentionally based on the tool contract,
 * not on translated copy, so the visual grouping remains stable as messages
 * change or get localized.
 */
export function agentToolCategory(toolName: string, detail?: unknown): AgentToolCategory {
    if (["canvas_inspect_image", "canvas_get_state", "canvas_read_text", "director_scene_read", "canvas_list_node_types", "model_list", "task_get", "skills_load", "skill_read_file"].includes(toolName)) return "read";
    if (["generate_media", "director_scene_create", "director_preview"].includes(toolName)) return "create";
    if (toolName === "canvas_apply_ops") {
        const actions = record(detail).actions;
        if (Array.isArray(actions) && actions.some((item) => record(item).action === "created" || record(item).action === "generating")) return "create";
        const ops = toolArguments(detail).ops;
        if (Array.isArray(ops) && ops.some((item) => record(item).type === "add_node")) return "create";
    }
    return "operate";
}

export function agentToolCategoryLabelKey(toolName: string, category: AgentToolCategory): MessageKey {
    if (category === "read") return toolName === "canvas_get_state" ? "canvasCloudAgentChat.tool.category.readState" : "canvasCloudAgentChat.tool.category.read";
    if (category === "create") return "canvasCloudAgentChat.tool.category.create";
    return "canvasCloudAgentChat.tool.category.operate";
}

type ToolStatus = "completed" | "failed" | "noop" | "rejected" | "pending";

function field(value: unknown, key: string): unknown {
    return value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined;
}

export function agentToolStatus(title: string, text: string, detail?: unknown): ToolStatus {
    const event = field(detail, "eventType");
    if (event === "tool_completed" || event === "generation_task_created" || event === "canvas_updated") return "completed";
    if (event === "tool_failed" || event === "tool_arguments_rejected") return "failed";
    const raw = `${title} ${text} ${field(detail, "error") || ""}`;
    if (field(detail, "status") === "noop" || /未生效|无需|没有找到|没有.*可|已存在/.test(raw)) return "noop";
    if (/拒绝|取消|rejected/i.test(raw)) return "rejected";
    if (/失败|错误|failed|error/i.test(raw)) return "failed";
    if (/完成|成功|completed|succeeded/i.test(raw)) return "completed";
    return "pending";
}

export function friendlyAgentToolSummary(t: AgentTranslate, toolName: string, text: string, detail?: unknown, pending = false) {
    const status = agentToolStatus(toolName, text, detail);
    const failed = status === "failed" || status === "rejected";
    if (toolName === "generate_media" && failed && field(field(detail, "result"), "phase") === "admission") return t("canvasCloudAgentChat.tool.summary.mediaAdmissionFailed");
    if (toolName === "generate_media" && failed && field(field(detail, "result"), "status") === "succeeded") return t("canvasCloudAgentChat.tool.summary.mediaWritebackFailed");
    if (toolName === "skills_load") {
        const count = /(?:加载|启用)\s*(\d+)\s*个/u.exec(text)?.[1];
        return failed ? t("canvasCloudAgentChat.tool.summary.skillsLoadFailed") : count ? t("canvasCloudAgentChat.tool.summary.skillsLoadedCount", { count }) : t("canvasCloudAgentChat.tool.summary.skillsLoaded");
    }
    if (toolName === "skill_read_file") {
        const name = String(field(detail, "skillName") || field(detail, "skillId") || "Skills");
        const path = field(detail, "path");
        const files = field(field(detail, "result"), "files");
        const listing = path === "" || (path === undefined && Array.isArray(files));
        const target = typeof path === "string" && path ? `${name} · ${path}` : name;
        if (failed) return `${listing ? t("canvasCloudAgentChat.tool.summary.skillFileListFailed") : t("canvasCloudAgentChat.tool.summary.skillFileReadFailed")} · ${target}`;
        if (listing && Array.isArray(files)) return files.length ? t("canvasCloudAgentChat.tool.summary.skillFileListedCount", { name, count: files.length }) : t("canvasCloudAgentChat.tool.summary.skillFileListedEmpty", { name });
        return `${pending ? t("canvasCloudAgentChat.tool.summary.skillFilePending") : t("canvasCloudAgentChat.tool.summary.skillFileDone")} · ${target}`;
    }
    const metadata = AGENT_TOOL_METADATA[toolName];
    const summary = typeof metadata?.summary === "function" ? metadata.summary({ pending, t, detail }) : metadata?.summary;
    const failure = metadata?.failureMessage;
    return failed ? (failure ? t(failure) : t("canvasCloudAgentChat.tool.summary.incomplete")) : summary ? t(summary) : pending ? t("canvasCloudAgentChat.tool.summary.pendingAction") : t("canvasCloudAgentChat.tool.summary.doneAction");
}

/** Non-React contexts resolve the live locale instead of pinning zh-CN. */
/** 工具注册表只存 MessageKey，渲染时才按当前语言解析；非注册表来源的文案原样返回。 */
const CATALOG_PREFIXES = ["canvasExtra.", "nodeSearch.", "canvasCreate.", "nodeInfo.", "nodeToolbar.", "projectLabels.", "canvasText."];

export function toolCatalogText<T extends string | undefined>(value: T): T {
    return (value && CATALOG_PREFIXES.some((prefix) => value.startsWith(prefix)) ? agentToolText(value as MessageKey) : value) as T;
}

export function agentToolText(key: MessageKey, values?: MessageValues) {
    return translateMessage(resolveAppLocale(), key, values);
}
