import type { AgentApprovalPreview, AgentApprovalPreviewItem, AgentApprovalPreviewOperation, AgentApprovalQuote } from "@/services/api/agent";
import { currentLocaleText as l } from "@/i18n/current-locale-text";
import type { MessageKey } from "@/i18n/messages";
import { resolveAppLocale } from "@/i18n/app-locale";

type RecordValue = Record<string, unknown>;

export type AgentApprovalPresentation = AgentApprovalPreview & { source: "server" | "fallback" };

function record(value: unknown): RecordValue | null {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as RecordValue) : null;
}

function text(value: unknown, max = 240): string {
    if (typeof value !== "string") return "";
    const compact = value.replace(/[\u0000-\u001f\u007f]/gu, " ").trim();
    return compact.length > max ? `${compact.slice(0, max)}…` : compact;
}

function approvalArguments(value: unknown): RecordValue | null {
    if (typeof value !== "string") return record(value);
    try {
        return record(JSON.parse(value));
    } catch {
        return null;
    }
}

function shortReference(value: unknown): string {
    const id = text(value, 80);
    if (!id) return l("canvasExtra.approval.unknownTarget");
    return id.length <= 16 ? id : `${id.slice(0, 8)}…${id.slice(-4)}`;
}

function nodeTypeLabel(value: unknown): string {
    const type = text(value, 32).toLowerCase();
    if (!type) return "";
    if (type === "markdown") return "Markdown";
    return l(`canvasExtra.approval.type.${["text", "image", "video", "audio", "frame", "script"].includes(type) ? type : "node"}` as MessageKey);
}

function fieldLabel(key: string, nodeType: string): string {
    if (key === "title") return l("canvasExtra.approval.fieldTitle");
    if (key === "content") return ["image", "video", "audio"].includes(nodeType.toLowerCase()) ? l("canvasExtra.approval.fieldNextPrompt") : l("canvasExtra.approval.fieldBody");
    return key === "composerContent" ? l("canvasExtra.approval.fieldNextPrompt") : l("canvasExtra.approval.fieldConfigured");
}

function operation(value: unknown): AgentApprovalPreviewOperation | null {
    return value === "add_node" ||
        value === "update_node" ||
        value === "connect_nodes" ||
        value === "generate_media" ||
        value === "create_storyboard" ||
        value === "edit_storyboard" ||
        value === "edit_batch_table" ||
        value === "plan_step" ||
        value === "director_scene_create" ||
        value === "director_apply_patch" ||
        GENERIC_CANVAS_OPERATIONS.has(value as AgentApprovalPreviewOperation)
        ? (value as AgentApprovalPreviewOperation)
        : null;
}

// Server previews for these tools carry their own localized summary; the card only needs to accept them
// instead of falling back to "unrecognized approval" (which blocked storyboard binding, delete, restore and undo).
const GENERIC_CANVAS_OPERATIONS = new Set<AgentApprovalPreviewOperation>([
    "build_board",
    "generate_media_item",
    "canvas_link_storyboard",
    "canvas_layout",
    "canvas_delete_objects",
    "canvas_restore_deleted",
    "canvas_undo",
    "delete_node",
    "delete_connection",
    "update_connection",
    "move_node",
    "resize_node",
    "set_node_flags",
]);

function normalizeQuote(value: unknown): AgentApprovalQuote | undefined {
    const quote = record(value);
    if (!quote || (quote.source !== "platform" && quote.source !== "external_provider")) return undefined;
    if (![quote.amountMicrocredits, quote.unitPriceMicrocredits, quote.quantity].every((amount) => typeof amount === "number" && Number.isSafeInteger(amount) && amount >= 0)) return undefined;
    if (typeof quote.billingMode !== "string") return undefined;
    return { source: quote.source, amountMicrocredits: quote.amountMicrocredits as number, unitPriceMicrocredits: quote.unitPriceMicrocredits as number, quantity: quote.quantity as number, billingMode: quote.billingMode };
}

function normalizeServerPreview(value: unknown): AgentApprovalPresentation | null {
    const source = record(value);
    if (!source || !Array.isArray(source.items)) return null;
    const rawItems = source.items;
    const items: AgentApprovalPreviewItem[] = [];
    for (const raw of rawItems) {
        const item = record(raw);
        const op = operation(item?.operation);
        const summary = text(item?.summary);
        if (!item || !op || !summary) continue;
        items.push({
            operation: op,
            nodeId: text(item.nodeId, 120) || undefined,
            nodeTitle: text(item.nodeTitle, 120) || undefined,
            resultTitle: text(item.resultTitle, 120) || undefined,
            nodeType: text(item.nodeType, 32) || undefined,
            nodeTypeLabel: text(item.nodeTypeLabel, 48) || undefined,
            targetNodeId: text(item.targetNodeId, 120) || undefined,
            targetNodeTitle: text(item.targetNodeTitle, 120) || undefined,
            targetNodeType: text(item.targetNodeType, 32) || undefined,
            fields: Array.isArray(item.fields)
                ? item.fields
                      .map((field) => text(field, 64))
                      .filter(Boolean)
                      .slice(0, 12)
                : undefined,
            details: Array.isArray(item.details)
                ? item.details
                      .map((detail) => text(detail, 180))
                      .filter(Boolean)
                      .slice(0, 12)
                : undefined,
            summary,
        });
    }
    const title = text(source.title, 120);
    const description = text(source.description, 500);
    if (!title || !description || !items.length) return null;
    const quote = normalizeQuote(source.quote);
    const preview = { kind: text(source.kind, 64) || "agent_approval", title, description, items, quote, quoteHash: quote ? text(source.quoteHash, 128) : undefined, source: "server" } as const;
    return resolveAppLocale() === "zh-CN" && preview.kind !== "director_mutation" ? preview : localizeServerPreview(preview);
}

function localizeServerPreview(preview: AgentApprovalPresentation): AgentApprovalPresentation {
    if (preview.kind === "media_batch" || preview.kind === "build_board") return preview;
    const items = preview.items.map((item) => {
        const nodeTypeLabel = nodeTypeLabelForServer(item.nodeType, item.nodeTypeLabel);
        const fields = item.fields?.map(serverFieldLabel);
        const details = item.details?.map(serverDetailLabel);
        const nodeTitle = item.nodeTitle || "";
        let summary = item.summary;
        if (item.operation === "director_scene_create" || item.operation === "director_apply_patch") summary = l(item.operation === "director_scene_create" ? "previs.createScene" : "previs.editScene") + " · " + nodeTitle;
        if (item.operation === "add_node") summary = l("canvasExtra.approval.addNode", { type: nodeTypeLabel, title: nodeTitle });
        if (item.operation === "update_node")
            summary = l("canvasExtra.approval.updateNode", {
                type: nodeTypeLabel,
                target: nodeTitle,
                fields: fields?.join(l("canvasExtra.approval.listSeparator")) || l("canvasExtra.approval.fieldConfigured"),
                rename: item.resultTitle ? l("canvasExtra.approval.rename", { title: item.resultTitle }) : "",
            });
        if (item.operation === "connect_nodes") summary = l("canvasExtra.approval.connectTitles", { from: nodeTitle, to: item.targetNodeTitle || "" });
        if (item.operation === "generate_media") summary = l("canvasExtra.approval.generateMedia", { type: nodeTypeLabel, title: nodeTitle });
        if (item.operation === "create_storyboard") summary = l("canvasExtra.approval.createStoryboard", { title: nodeTitle });
        if (item.operation === "edit_storyboard") summary = l("canvasExtra.approval.editStoryboard", { title: nodeTitle });
        if (item.operation === "edit_batch_table") summary = l("canvasExtra.approval.editBatchTable", { title: nodeTitle });
        if (GENERIC_CANVAS_OPERATIONS.has(item.operation)) summary = [l("canvasExtra.approval.confirmCanvas"), nodeTitle || item.nodeId || ""].filter(Boolean).join(" · ");
        return { ...item, nodeTypeLabel, fields, details, summary };
    });
    const first = items[0];
    if (preview.kind === "director_mutation") return { ...preview, title: l("previs.confirmEdit"), description: l("previs.approvalDescription", { title: first?.nodeTitle || "" }), items };
    if (first?.operation === "generate_media") {
        const type = first.nodeTypeLabel || l("canvasExtra.approval.type.media");
        return { ...preview, title: l("canvasExtra.approval.confirmMedia", { type }), description: l("canvasExtra.approval.mediaDescription", { type }), items };
    }
    if (first?.operation === "create_storyboard") {
        const count = Number(preview.description.match(/包含\s*(\d+)\s*个镜头/u)?.[1] || 0);
        return { ...preview, title: l("canvasExtra.approval.confirmCreateStoryboard"), description: l("canvasExtra.approval.createStoryboardDescription", { title: first.nodeTitle || "", count }), items };
    }
    if (first?.operation === "edit_storyboard") return { ...preview, title: l("canvasExtra.approval.confirmEditStoryboard"), description: l("canvasExtra.approval.editStoryboardDescription"), items };
    if (first?.operation === "edit_batch_table") return { ...preview, title: l("canvasExtra.approval.confirmEditBatchTable"), description: l("canvasExtra.approval.editBatchTableDescription"), items };
    if (first?.operation === "canvas_link_storyboard") return { ...preview, title: l("canvasExtra.approval.confirmEditStoryboard"), description: l("canvasExtra.approval.editStoryboardDescription"), items };
    if (items.length && items.every((item) => GENERIC_CANVAS_OPERATIONS.has(item.operation)))
        return { ...preview, title: l("canvasExtra.approval.confirmCanvas"), description: l("canvasExtra.approval.serverCanvasDescription", { operations: l("canvasExtra.approval.updateCount", { count: items.length }) }), items };
    if (items.every((item) => item.operation === "add_node" || item.operation === "update_node" || item.operation === "connect_nodes")) {
        const count = (operation: AgentApprovalPreviewOperation) => items.filter((item) => item.operation === operation).length;
        const parts = [
            count("add_node") ? l("canvasExtra.approval.addCount", { count: count("add_node") }) : "",
            count("update_node") ? l("canvasExtra.approval.updateCount", { count: count("update_node") }) : "",
            count("connect_nodes") ? l("canvasExtra.approval.connectCount", { count: count("connect_nodes") }) : "",
        ].filter(Boolean);
        return { ...preview, title: l("canvasExtra.approval.confirmCanvas"), description: l("canvasExtra.approval.serverCanvasDescription", { operations: parts.join(l("canvasExtra.approval.operationSeparator")) }), items };
    }
    return { ...preview, items };
}

function nodeTypeLabelForServer(type: string | undefined, fallback: string | undefined) {
    const normalized = (type || "").toLowerCase();
    if (normalized === "batch-table") return l("canvasExtra.approval.type.batchTable");
    if (normalized === "script" && fallback === "分镜脚本") return l("canvasExtra.approval.type.storyboard");
    return nodeTypeLabel(normalized) || fallback || l("canvasExtra.approval.type.node");
}

function serverFieldLabel(field: string) {
    const key = (
        {
            节点名称: "fieldTitle",
            下一版提示词: "fieldNextPrompt",
            正文: "fieldBody",
            "Markdown 正文": "fieldMarkdown",
            任务行: "fieldRows",
            任务类型: "fieldTaskType",
            并发数: "fieldConcurrency",
            参考图列: "fieldReferenceColumn",
            镜头行: "fieldShots",
        } as Record<string, string>
    )[field];
    return key ? l(`canvasExtra.approval.${key}` as MessageKey) : field;
}

function serverDetailLabel(detail: string) {
    if (detail === "director_created") return l("previs.sceneCreated");
    if (detail === "director_workstation") return l("previs.workstationBound");
    if (detail.startsWith("director_operation|")) {
        const [, op, ...name] = detail.split("|");
        return l(op.startsWith("add_") ? "previs.operationAdded" : op.startsWith("remove_") ? "previs.operationRemoved" : "previs.operationChanged", { name: name.join("|") || l("storyboardAssets.environment") });
    }
    let match = detail.match(/^模型[：:](.+)$/u);
    if (match) return l("canvasExtra.approval.model", { model: match[1] });
    match = detail.match(/^引用\s*(\d+)\s*个画布资产[，,]?并建立连线$/u);
    if (match) return l("canvasExtra.approval.references", { count: Number(match[1]) });
    if (detail === "不引用画布媒体资产") return l("canvasExtra.approval.noReferences");
    match = detail.match(/^时长[：:]\s*(\d+)\s*秒$/u);
    if (match) return l("canvasExtra.approval.duration", { seconds: Number(match[1]) });
    match = detail.match(/^画幅[：:](.+)$/u);
    if (match) return l("canvasExtra.approval.size", { size: match[1] });
    match = detail.match(/^质量[：:](.+)$/u);
    if (match) return l("canvasExtra.approval.quality", { quality: match[1] });
    match = detail.match(/^音频[：:](开启|关闭)$/u);
    if (match) return l("canvasExtra.approval.audio", { state: l(match[1] === "开启" ? "canvasExtra.approval.on" : "canvasExtra.approval.off") });
    return detail;
}

function canvasFallback(args: RecordValue | null): AgentApprovalPresentation {
    const rawOps = Array.isArray(args?.ops) ? args.ops : [];
    const items: AgentApprovalPreviewItem[] = [];
    for (const raw of rawOps) {
        const op = record(raw);
        const kind = operation(op?.type);
        if (!op || !kind || kind === "generate_media") continue;
        const type = text(op.nodeType, 32).toLowerCase();
        const label = nodeTypeLabel(type);
        if (kind === "add_node") {
            const title = text(op.title, 120) || l("canvasExtra.approval.untitled", { type: label || l("canvasExtra.approval.type.node") });
            items.push({
                operation: kind,
                nodeTitle: title,
                nodeType: type || undefined,
                nodeTypeLabel: label || undefined,
                fields: [l("canvasExtra.approval.fieldTitle"), type === "text" || type === "markdown" ? l("canvasExtra.approval.fieldBody") : l("canvasExtra.approval.fieldInitial")],
                summary: l("canvasExtra.approval.addNode", { type: label || l("canvasExtra.approval.type.node"), title }),
            });
            continue;
        }
        if (kind === "update_node") {
            const patch = record(op.patch);
            const id = shortReference(op.id);
            const fields = patch
                ? Object.keys(patch)
                      .map((key) => fieldLabel(key, type))
                      .filter(Boolean)
                : [];
            const resultTitle = text(patch?.title, 120);
            const target = l("canvasExtra.approval.targetReference", { id });
            items.push({
                operation: kind,
                nodeTitle: target,
                nodeType: type || undefined,
                nodeTypeLabel: label || undefined,
                resultTitle: resultTitle || undefined,
                fields: fields.length ? [...new Set(fields)] : [l("canvasExtra.approval.fieldConfigured")],
                summary: l("canvasExtra.approval.updateNode", {
                    type: label || l("canvasExtra.approval.type.node"),
                    target,
                    fields: fields.length ? [...new Set(fields)].join(l("canvasExtra.approval.listSeparator")) : l("canvasExtra.approval.fieldConfigured"),
                    rename: resultTitle ? l("canvasExtra.approval.rename", { title: resultTitle }) : "",
                }),
            });
            continue;
        }
        const from = shortReference(op.fromNodeId);
        const to = shortReference(op.toNodeId);
        items.push({ operation: kind, nodeTitle: l("canvasExtra.approval.sourceReference", { id: from }), targetNodeTitle: l("canvasExtra.approval.targetEndpoint", { id: to }), summary: l("canvasExtra.approval.connect", { from, to }) });
    }
    const counts = items.reduce<Record<string, number>>((out, item) => {
        out[item.operation] = (out[item.operation] || 0) + 1;
        return out;
    }, {});
    const parts = [
        counts.add_node ? l("canvasExtra.approval.addCount", { count: counts.add_node }) : "",
        counts.update_node ? l("canvasExtra.approval.updateCount", { count: counts.update_node }) : "",
        counts.connect_nodes ? l("canvasExtra.approval.connectCount", { count: counts.connect_nodes }) : "",
    ].filter(Boolean);
    return {
        source: "fallback",
        kind: "canvas_mutation",
        title: l("canvasExtra.approval.confirmCanvas"),
        description: parts.length ? l("canvasExtra.approval.canvasDescription", { operations: parts.join(l("canvasExtra.approval.operationSeparator")) }) : l("canvasExtra.approval.invalidCanvas"),
        items,
    };
}

function mediaFallback(args: RecordValue | null, payload: RecordValue | null): AgentApprovalPresentation {
    const mode = text(args?.mode, 32).toLowerCase();
    const type = l(`canvasExtra.approval.type.${["video", "image", "audio"].includes(mode) ? mode : "media"}` as MessageKey);
    const references = Array.isArray(args?.referenceNodeIds) ? args.referenceNodeIds.filter((id) => typeof id === "string") : [];
    const title = text(args?.title, 120) || l("canvasExtra.approval.untitled", { type });
    const model = text(payload?.modelName) || text(args?.channelModelKey) || text(args?.logicalModelId);
    const details = [
        model ? l("canvasExtra.approval.model", { model }) : "",
        references.length ? l("canvasExtra.approval.references", { count: references.length }) : l("canvasExtra.approval.noReferences"),
        typeof args?.durationSeconds === "number" && args.durationSeconds > 0 ? l("canvasExtra.approval.duration", { seconds: args.durationSeconds }) : "",
        text(args?.size) ? l("canvasExtra.approval.size", { size: text(args?.size, 40) }) : "",
        text(args?.quality) ? l("canvasExtra.approval.quality", { quality: text(args?.quality, 40) }) : "",
        typeof args?.videoGenerateAudio === "boolean" ? l("canvasExtra.approval.audio", { state: l(args.videoGenerateAudio ? "canvasExtra.approval.on" : "canvasExtra.approval.off") }) : "",
    ].filter(Boolean);
    return {
        source: "fallback",
        kind: "media_generation",
        title: l("canvasExtra.approval.confirmMedia", { type }),
        description: l("canvasExtra.approval.mediaDescription", { type }),
        items: [{ operation: "generate_media", nodeTitle: title, nodeType: mode || undefined, nodeTypeLabel: type, details, summary: l("canvasExtra.approval.generateMedia", { type, title }) }],
    };
}

export function agentApprovalPresentation(detail: unknown): AgentApprovalPresentation {
    const payload = record(detail);
    const serverPreview = normalizeServerPreview(payload?.preview);
    if (serverPreview) return serverPreview;
    const call = record(payload?.call);
    const fn = record(call?.function);
    const name = text(fn?.name) || text(payload?.toolName);
    const args = approvalArguments(fn?.arguments ?? payload?.arguments);
    if (name === "canvas_apply_ops") return canvasFallback(args);
    if (name === "generate_media") return mediaFallback(args, payload);
    return { source: "fallback", kind: "agent_approval", title: l("canvasExtra.approval.confirmAction"), description: l("canvasExtra.approval.unknownAction"), items: [] };
}
