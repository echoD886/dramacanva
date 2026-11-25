import type { CanvasResourceReference } from "@/lib/canvas/canvas-resource-references";
import type { AgentTranslate } from "@/lib/canvas/agent-tool-presentation";
import type { MessageKey } from "@/i18n/messages";

export type AgentCanvasAction = { nodeId: string; title: string; nodeType: string; action: string; fields?: string[]; resultTitle?: string; targetNodeId?: string; targetTitle?: string; targetNodeType?: string };

export function agentRecord(value: unknown): Record<string, unknown> {
    return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function agentToolArguments(detail: unknown) {
    const value = agentRecord(detail).arguments;
    if (typeof value !== "string") return agentRecord(value);
    try { return agentRecord(JSON.parse(value)); } catch { return {}; }
}

export function agentCanvasActions(toolName: string, detail: unknown, references: CanvasResourceReference[] = []): AgentCanvasAction[] {
    const payload = agentRecord(detail);
    const result = agentRecord(payload.result);
    const args = agentToolArguments(detail);
    const actions: AgentCanvasAction[] = [];
    const add = (id: unknown, title: unknown, kind: unknown, action: string, details: Partial<AgentCanvasAction> = {}) => {
        if (typeof id !== "string" || !id || actions.some((item) => item.nodeId === id && item.action === action)) return;
        const reference = references.find((item) => item.nodeId === id);
        actions.push({ nodeId: id, title: typeof title === "string" && title ? title : reference?.title || id, nodeType: typeof kind === "string" ? kind : reference?.kind || "", action, ...details });
    };
    if (Array.isArray(payload.actions)) {
        for (const value of payload.actions) {
            const action = agentRecord(value);
            add(action.nodeId, action.title, action.nodeType, String(action.action || "updated"), {
                fields: Array.isArray(action.fields) ? action.fields.filter((field): field is string => typeof field === "string") : undefined,
                resultTitle: typeof action.resultTitle === "string" ? action.resultTitle : undefined,
                targetNodeId: typeof action.targetNodeId === "string" ? action.targetNodeId : undefined,
                targetTitle: typeof action.targetTitle === "string" ? action.targetTitle : undefined,
                targetNodeType: typeof action.targetNodeType === "string" ? action.targetNodeType : undefined,
            });
        }
        return actions;
    }
    const failed = payload.eventType === "tool_failed";
    if (toolName === "generate_media") {
        const submitted = payload.eventType === "generation_task_created";
        const action = failed ? "failed" : submitted ? "generating" : "generated";
        add(result.nodeId || payload.nodeId || args.nodeId, payload.title || args.title, payload.mode || args.mode, action);
        if (!failed || result.taskSubmitted === true) {
            const ids = payload.referenceNodeIds || args.referenceNodeIds;
            if (Array.isArray(ids)) for (const id of ids) add(id, undefined, undefined, "referenced");
        }
    } else if (toolName === "canvas_get_state" && !failed && Array.isArray(result.nodes)) {
        for (const value of result.nodes) { const node = agentRecord(value); add(node.id, node.title, node.type, "read"); }
    } else if (toolName === "canvas_apply_ops" && !failed && Array.isArray(args.ops)) {
        for (const value of args.ops) {
            const op = agentRecord(value);
            if (op.type === "connect_nodes") {
                add(op.fromNodeId, undefined, undefined, "referenced");
                add(op.toNodeId, undefined, undefined, "updated");
            } else add(op.id, op.title, op.nodeType, op.type === "add_node" ? "created" : "updated");
        }
    }
    return actions;
}

export function agentCanvasActionLabel(t: AgentTranslate, action: AgentCanvasAction) {
    const kind = agentNodeKindLabel(t, action.nodeType);
    if (action.action === "referenced" && action.targetTitle) {
        const targetKind = agentNodeKindLabel(t, action.targetNodeType || "");
        return t("canvasCloudAgentChat.action.referenceWithTarget", { kind, title: action.title, targetKind, targetTitle: action.targetTitle });
    }
    const verb = agentActionVerb(t, action.action);
    const fieldText = action.fields?.length ? t("canvasCloudAgentChat.action.modifiedFields", { fields: action.fields.join("、") }) : "";
    const titleText = action.resultTitle ? t("canvasCloudAgentChat.action.renamedTo", { title: action.resultTitle }) : "";
    return `${verb}${t("canvasCloudAgentChat.action.nodeTitle", { kind, title: action.title })}${fieldText}${titleText}`;
}

function agentNodeKindLabel(t: AgentTranslate, nodeType: string) {
    const keys: Record<string, MessageKey> = { image: "canvasCloudAgentChat.nodeKind.image", video: "canvasCloudAgentChat.nodeKind.video", audio: "canvasCloudAgentChat.nodeKind.audio", text: "canvasCloudAgentChat.nodeKind.text", markdown: "canvasCloudAgentChat.nodeKind.markdown", script: "canvasCloudAgentChat.nodeKind.script" };
    const key = keys[nodeType];
    return key ? t(key) : "";
}

function agentActionVerb(t: AgentTranslate, action: string) {
    const keys: Record<string, MessageKey> = { created: "canvasCloudAgentChat.action.created", updated: "canvasCloudAgentChat.action.updated", referenced: "canvasCloudAgentChat.action.referenced", read: "canvasCloudAgentChat.action.read", generating: "canvasCloudAgentChat.action.generating", generated: "canvasCloudAgentChat.action.generated", failed: "canvasCloudAgentChat.action.failed" };
    const key = keys[action];
    return key ? t(key) : t("canvasCloudAgentChat.action.located");
}
