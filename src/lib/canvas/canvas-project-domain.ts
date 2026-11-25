import { currentLocaleText as upstreamText } from "@/i18n/current-locale-text";
import { synchronizeGenerationSpec } from "@/lib/canvas/generation-contract";
import { localizedNodeLabel } from "@/i18n/canvas-node-label";
import { currentLocaleText } from "@/i18n/current-locale-text";
import { NODE_DEFAULT_SIZE, getNodeSpec } from "@/constant/canvas";
import { PromptTemplateOperation } from "@/lib/prompts";
import { STORYBOARD_HEADER_HEIGHT, STORYBOARD_ROW_HEIGHT, storyboardTableHeight } from "@/lib/canvas/canvas-storyboard-layout";
import { normalizeStoryboardAssetBindings } from "@/lib/canvas/canvas-storyboard-assets";
import { bindingForConnectedNode, storyboardComposerContent, storyboardRowReferenceNodeIds } from "@/lib/canvas/canvas-storyboard-materializer";
import type { CanvasImageAngleParams } from "@/components/canvas/canvas-node-angle-dialog";
import type { NodeGenerationInput } from "@/components/canvas/canvas-node-generation";
import { isFrameNode } from "@/lib/canvas/canvas-frame";
import { nodeSizeFromRatio } from "@/lib/canvas/canvas-node-size";
import { canvasNodeMentionToken, canvasResourceMentionToken, type CanvasResourceReference } from "@/lib/canvas/canvas-resource-references";
import { getNodeDefinition } from "@/lib/canvas/node-registry";
import { batchReferenceHandleY } from "@/lib/canvas/canvas-batch-table";
import { reconcileImageBatchRoot } from "@/lib/canvas/canvas-image-batch-retry";
import { scopedLocalStorage } from "@/lib/user-scope";
import { normalizeImageValue, normalizeVideoValue, type ModelCapabilityConfig } from "@/lib/model-capabilities";
import type { GenerationTask } from "@/services/api/task-center";
import { CanvasNodeType, type CanvasConnection, type CanvasNodeData, type CanvasNodeMetadata, type CanvasNodeTypeId, type ConnectionHandle, type Position, type StoryboardColumn, type StoryboardRow } from "@/types/canvas";

import { clamp } from "@/lib/utils";
export function createCanvasNode(type: CanvasNodeTypeId, position: Position, metadata?: CanvasNodeMetadata): CanvasNodeData {
    const builtinSpec = type in NODE_DEFAULT_SIZE ? getNodeSpec(type as CanvasNodeType) : undefined;
    const pluginDefinition = getNodeDefinition(type);
    const spec = builtinSpec || (pluginDefinition ? { width: pluginDefinition.defaultSize.width, height: pluginDefinition.defaultSize.height, title: pluginDefinition.defaultTitle, metadata: pluginDefinition.defaultMetadata } : undefined);
    if (!spec) throw new Error(upstreamText("upstream.v165.message022", { p0: type }));
    const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();
    const title = type === CanvasNodeType.Frame ? currentLocaleText("canvasRuntime.frame.unnamedBackdrop") : builtinSpec ? localizedNodeLabel(type, currentLocaleText) : spec.title;

    return {
        id,
        type,
        title,
        createdAt: now,
        updatedAt: now,
        position: {
            x: position.x - spec.width / 2,
            y: position.y - spec.height / 2,
        },
        width: spec.width,
        height: spec.height,
        metadata:
            type === CanvasNodeType.Script
                ? {
                      ...spec.metadata,
                      ...metadata,
                      defaultTitle: title,
                      storyboard: metadata?.storyboard || { rows: [1, 2, 3].map((shotNumber) => createStoryboardRow(shotNumber)), visibleColumns: ["shotNumber", "durationSeconds", "videoMotionPrompt", "dialogue", "assets"], referenceNodeIds: [] },
                  }
                : { ...spec.metadata, ...metadata, defaultTitle: title, ...(type === CanvasNodeType.Drawing ? { drawingId: metadata?.drawingId || `${id}-document` } : {}) },
    };
}

export function createStoryboardRow(shotNumber: number, patch: Partial<StoryboardRow> = {}): StoryboardRow {
    return {
        id: `shot-${Date.now()}-${shotNumber}-${Math.random().toString(36).slice(2, 6)}`,
        shotNumber,
        durationSeconds: 6,
        plotDescription: "",
        dialogue: "",
        characters: [],
        narrativeIntent: "",
        viewerPOV: "",
        performanceBlocking: "",
        shotSize: "",
        emotion: "",
        lightingAndAtmosphere: "",
        audioEffects: "",
        camera: "",
        motion: "",
        timeBeats: "",
        imageGenerationPrompt: "",
        videoMotionPrompt: "",
        mustHave: [],
        optionalDetails: [],
        continuityOut: "",
        negativePrompt: "",
        assetBindings: [],
        status: "idle",
        ...patch,
    };
}

// 有结构化变量时由服务端按最新平台模板和用户偏好编译；变量被清除表示用户已做镜头级手动覆盖。
export function storyboardPromptTemplateMetadata(row: StoryboardRow, kind: "image" | "video"): Pick<CanvasNodeMetadata, "promptTemplateOperation" | "promptTemplateVariables"> {
    const variables = kind === "image" ? row.imagePromptTemplateVariables : row.videoPromptTemplateVariables;
    return variables
        ? { promptTemplateOperation: kind === "image" ? PromptTemplateOperation.StoryboardFirstFrame : PromptTemplateOperation.StoryboardVideo, promptTemplateVariables: variables }
        : { promptTemplateOperation: undefined, promptTemplateVariables: undefined };
}

export function cinematicStoryboardColumns(columns?: StoryboardColumn[]): StoryboardColumn[] {
    return Array.from(
        new Set([
            "shotNumber",
            "durationSeconds",
            "videoMotionPrompt",
            "dialogue",
            "assets",
            ...(columns || []),
            "shotSize",
            "narrativeIntent",
            "viewerPOV",
            "performanceBlocking",
            "camera",
            "motion",
            "timeBeats",
            "lightingAndAtmosphere",
            "continuityOut",
            "negativePrompt",
        ]),
    ) as StoryboardColumn[];
}

// 分镜文本任务的模型侧输出契约，字段与 storyboardRowsFromTask 的解析结构一一对应。
// 后端只有带 metadata.promptTemplateOperation 的任务才会编译服务端分镜模板（含 JSON 契约），
// 章节分镜走的是自定义 prompt，缺这段约束时模型会按自然语言习惯返回 Markdown 表格，解析阶段拿不到 rows。
export function storyboardRowsOutputContract(requirement: string) {
    return [
        upstreamText("upstream.v165.message023"),
        upstreamText("upstream.v165.message024"),
        upstreamText("upstream.v165.message025", { p0: requirement }),
        upstreamText("upstream.v165.message026"),
        upstreamText("upstream.v165.message027"),
        upstreamText("upstream.v165.message028"),
        upstreamText("upstream.v165.message029"),
        upstreamText("upstream.v165.message030"),
        upstreamText("upstream.v165.message031"),
        upstreamText("upstream.v165.message032"),
        upstreamText("upstream.v165.message033"),
    ].join("\n");
}

// 文本任务的 result_json 外层是 {mode, reasoning, text} 包装，分镜表在 text 字段的内层 JSON 字符串里；
// 历史模板路径可能直接落 {title, rows}。两种结构都要能解析，内层再做代码块剥离与首尾大括号截取兜底，
// 模型偶发违反契约（包 ```json 或混入解释文字）时仍能取出分镜表。
function parseStoryboardRowsPayload(raw: string): { title?: string; rows?: Array<Partial<StoryboardRow>> } {
    const parsed = JSON.parse(raw) as { title?: string; rows?: Array<Partial<StoryboardRow>>; text?: unknown };
    if (Array.isArray(parsed.rows)) return parsed;
    if (typeof parsed.text === "string" && parsed.text.trim()) {
        const inner = parsed.text
            .trim()
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/```\s*$/, "");
        const start = inner.indexOf("{");
        const end = inner.lastIndexOf("}");
        if (start >= 0 && end > start) {
            try {
                const innerParsed = JSON.parse(inner.slice(start, end + 1)) as { title?: string; rows?: Array<Partial<StoryboardRow>> };
                if (Array.isArray(innerParsed.rows)) return innerParsed;
            } catch {
                // 内层不是合法 JSON 时落到外层结构，由调用方的缺行校验统一报错。
            }
        }
    }
    if (parsed.text && typeof parsed.text === "object") {
        try {
            const nested = parseStoryboardRowsPayload(JSON.stringify(parsed.text));
            if (Array.isArray(nested.rows)) return nested;
        } catch {
            // 对象形式的 text 不是分镜载荷时，交由统一缺行校验报错。
        }
    }
    return parsed;
}

// 部分模型把镜头行的文本字段返回成对象或数组；恢复路径统一转成字符串，避免整页恢复失败。
function normalizeStoryboardText(value: unknown): string {
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (Array.isArray(value)) return value.map(normalizeStoryboardText).filter(Boolean).join(upstreamText("canvasExtra.approval.listSeparator"));
    if (!value || typeof value !== "object") return "";
    const record = value as Record<string, unknown>;
    for (const key of ["text", "content", "value", "description", "name"]) {
        if (!(key in record)) continue;
        const nested = normalizeStoryboardText(record[key]);
        if (nested) return nested;
    }
    return "";
}

const STORYBOARD_TEXT_FIELDS = [
    "plotDescription",
    "dialogue",
    "narrativeIntent",
    "viewerPOV",
    "performanceBlocking",
    "shotSize",
    "emotion",
    "lightingAndAtmosphere",
    "audioEffects",
    "camera",
    "motion",
    "timeBeats",
    "imageGenerationPrompt",
    "videoMotionPrompt",
    "continuityOut",
    "negativePrompt",
] as const;

function normalizeStoryboardRow(row: Partial<StoryboardRow>): Partial<StoryboardRow> {
    const next: Record<string, unknown> = { ...row };
    for (const key of STORYBOARD_TEXT_FIELDS) {
        if (key in row) next[key] = normalizeStoryboardText(row[key]);
    }
    return next as Partial<StoryboardRow>;
}

export function storyboardRowsFromTask(task: GenerationTask) {
    const result = parseStoryboardRowsPayload(task.resultJson || "{}");
    if (!Array.isArray(result.rows) || !result.rows.length) throw new Error(upstreamText("upstream.v165.message034"));
    return {
        // 旧任务和部分模型会把 title 返回成对象/数组；可选链只防 undefined，在对象上调用 trim 会让整页恢复失败。
        title: typeof result.title === "string" ? result.title.trim() : undefined,
        rows: result.rows.map((row, index) => {
            const source: Partial<StoryboardRow> = row && typeof row === "object" ? row : {};
            const next = createStoryboardRow(index + 1, {
                ...normalizeStoryboardRow(source),
                id: `shot-${Date.now()}-${index + 1}-${Math.random().toString(36).slice(2, 6)}`,
                shotNumber: index + 1,
                status: "idle",
                assetBindings: normalizeStoryboardAssetBindings(Array.isArray(source.assetBindings) ? source.assetBindings : undefined),
            });
            next.characters = Array.isArray(source.characters) ? source.characters : [];
            next.mustHave = Array.isArray(source.mustHave) ? source.mustHave : [];
            next.optionalDetails = Array.isArray(source.optionalDetails) ? source.optionalDetails : [];
            return next;
        }),
    };
}

// These overrides belong to the selected model and need revalidation on a switch.
const NODE_MODEL_GENERATION_PARAMS: ReadonlyArray<keyof CanvasNodeMetadata> = [
    "size",
    "quality",
    "imageResolution",
    "transparentBackground",
    "count",
    "seconds",
    "vquality",
    "generateAudio",
    "watermark",
    "audioVoice",
    "audioFormat",
    "audioSpeed",
    "audioInstructions",
    "musicInstrumental",
];

export function applyNodeConfigPatch(node: CanvasNodeData, patch: Partial<CanvasNodeMetadata>, capabilities?: ModelCapabilityConfig) {
    const safePatch = patch || {};
    const nextPatch = generationParamsOnModelSwitch(node, safePatch, capabilities);
    const next = synchronizeGenerationSpec(node, nextPatch);
    const spec = node.type === CanvasNodeType.Video ? NODE_DEFAULT_SIZE[CanvasNodeType.Video] : NODE_DEFAULT_SIZE[CanvasNodeType.Image];
    const size = typeof safePatch.size === "string" && !node.metadata?.content ? nodeSizeFromRatio(safePatch.size, spec.width, spec.height) : null;
    return size && (node.type === CanvasNodeType.Image || node.type === CanvasNodeType.Video) ? { ...next, ...size, position: { x: node.position.x + node.width / 2 - size.width / 2, y: node.position.y + node.height / 2 - size.height / 2 } } : next;
}

function generationParamsOnModelSwitch(node: CanvasNodeData, patch: Partial<CanvasNodeMetadata>, capabilities?: ModelCapabilityConfig): Partial<CanvasNodeMetadata> {
    if (typeof patch.model !== "string" || patch.model === node.metadata?.model) {
        return patch;
    }
    const reset: Partial<CanvasNodeMetadata> = {};
    for (const key of NODE_MODEL_GENERATION_PARAMS) {
        reset[key] = undefined;
    }
    const previous = node.metadata;
    if (previous && node.type === CanvasNodeType.Image && capabilities?.image) {
        const image = capabilities.image;
        const options = normalizeImageValue(image, { ...previous, count: previous.count?.toString() });
        if (previous.size === options.size) reset.size = options.size;
        if (image.quality.supported && previous.quality === options.quality) reset.quality = options.quality;
        if (image.resolution?.supported && previous.imageResolution === options.imageResolution) reset.imageResolution = options.imageResolution;
        if (previous.count === Number(options.count)) reset.count = previous.count;
        if (image.transparentBackground.supported && previous.transparentBackground === options.transparentBackground) reset.transparentBackground = options.transparentBackground;
    }
    if (previous && node.type === CanvasNodeType.Video && capabilities?.video) {
        const video = capabilities.video;
        const options = normalizeVideoValue(video, { seconds: previous.seconds, ratio: previous.size, resolution: previous.vquality });
        if (previous.size === options.ratio) reset.size = options.ratio;
        if (Number(previous.seconds) === Number(options.seconds)) reset.seconds = options.seconds;
        if (previous.vquality && previous.vquality.toLowerCase().replace(/p$/, "") === options.resolution.toLowerCase().replace(/p$/, "")) reset.vquality = options.resolution;
        if (video.generateAudio.supported) reset.generateAudio = previous.generateAudio;
        if (video.watermark.supported) reset.watermark = previous.watermark;
    }
    return { ...reset, ...patch };
}

/**
 * 连线落到目标节点上的吸附点。单端口一侧取边的正中——与 connectionHandleY 保持同一个
 * 口径，否则吸附点和实际画出来的线会对不上（这两处是同一规则的两份实现，改一处必错）。
 */
export function getConnectionTargetAnchor(node: CanvasNodeData, current: ConnectionHandle, handleId?: string, scrollTop = 0) {
    return {
        x: current.handleType === "source" ? node.position.x : node.position.x + node.width,
        y: batchReferenceHandleY(node, handleId) ?? storyboardHandleY(node, handleId, scrollTop) ?? node.position.y + node.height / 2,
    };
}

export function storyboardHandleAtY(node: CanvasNodeData, worldY: number, scrollTop = 0) {
    const rows = node.metadata?.storyboard?.rows || [];
    const localY = worldY - node.position.y - STORYBOARD_HEADER_HEIGHT;
    const tableHeight = storyboardTableHeight(node.height, node.metadata?.storyboardComposerHeight);
    if (rows.length && localY >= 0 && localY <= tableHeight) {
        const index = Math.max(0, Math.min(rows.length - 1, Math.floor((localY + scrollTop) / STORYBOARD_ROW_HEIGHT)));
        return `row:${rows[index].id}`;
    }
    const composerTop = node.height - (node.metadata?.storyboardComposerHeight || 104);
    if (worldY >= node.position.y + composerTop && worldY <= node.position.y + node.height) return "storyboard:context";
    return undefined;
}

function storyboardHandleY(node: CanvasNodeData, handleId?: string, scrollTop = 0) {
    if (node.type !== CanvasNodeType.Script) return undefined;
    if (handleId === "storyboard:context") return node.position.y + node.height - (node.metadata?.storyboardComposerHeight || 104) / 2;
    if (!handleId?.startsWith("row:")) return undefined;
    const rowId = handleId.slice(4);
    const index = (node.metadata?.storyboard?.rows || []).findIndex((row) => row.id === rowId);
    if (index < 0) return undefined;
    const tableHeight = storyboardTableHeight(node.height, node.metadata?.storyboardComposerHeight);
    return node.position.y + STORYBOARD_HEADER_HEIGHT + clamp(index * STORYBOARD_ROW_HEIGHT + STORYBOARD_ROW_HEIGHT / 2 - scrollTop, 4, tableHeight - 4);
}

export function normalizeConnection(firstNodeId: string, secondNodeId: string, nodes: CanvasNodeData[], firstHandleType: "source" | "target") {
    const first = nodes.find((node) => node.id === firstNodeId);
    const second = nodes.find((node) => node.id === secondNodeId);
    if (!first || !second || first.id === second.id) return null;
    if (isFrameNode(first) || isFrameNode(second)) return null;
    if (first.type === CanvasNodeType.Config && second.type === CanvasNodeType.Config) return null;
    if (second.type === CanvasNodeType.Config) return { fromNodeId: first.id, toNodeId: second.id };
    if (first.type === CanvasNodeType.Config && firstHandleType === "target") return { fromNodeId: second.id, toNodeId: first.id };
    if (first.type === CanvasNodeType.Config) return { fromNodeId: first.id, toNodeId: second.id };
    if (firstHandleType === "target") return { fromNodeId: second.id, toNodeId: first.id };
    return { fromNodeId: first.id, toNodeId: second.id };
}

export function storyboardCharacterTitleMatches(title: string, rawName: string, listedNames: string[]) {
    const name = rawName.trim();
    if (Array.from(name).length < 2) return false;
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (!/\p{Script=Han}/u.test(name)) return new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, "iu").test(title);
    let offset = title.indexOf(name);
    while (offset >= 0) {
        if (!listedNames.some((other) => other.trim().length > name.length && other.trim().startsWith(name) && title.startsWith(other.trim(), offset))) return true;
        offset = title.indexOf(name, offset + name.length);
    }
    return false;
}

export function attachNodeToStoryboardRow(nodes: CanvasNodeData[], connection: Pick<CanvasConnection, "fromNodeId" | "toNodeId" | "fromHandleId" | "toHandleId">) {
    const fromStoryboardHandle = connection.fromHandleId?.startsWith("row:") || connection.fromHandleId === "storyboard:context";
    const toStoryboardHandle = connection.toHandleId?.startsWith("row:") || connection.toHandleId === "storyboard:context" || (!connection.toHandleId && nodes.some((node) => node.id === connection.toNodeId && node.type === CanvasNodeType.Script));
    const scriptNodeId = fromStoryboardHandle ? connection.fromNodeId : toStoryboardHandle ? connection.toNodeId : null;
    const handleId = fromStoryboardHandle ? connection.fromHandleId : connection.toHandleId || "storyboard:context";
    const rowId = handleId?.startsWith("row:") ? handleId.slice(4) : null;
    const linkedNodeId = scriptNodeId === connection.fromNodeId ? connection.toNodeId : connection.fromNodeId;
    const linkedNode = nodes.find((node) => node.id === linkedNodeId);
    const scriptNode = nodes.find((node) => node.id === scriptNodeId && node.type === CanvasNodeType.Script);
    if (!scriptNodeId || !linkedNode || !scriptNode) return nodes;
    const row = rowId ? scriptNode.metadata?.storyboard?.rows.find((item) => item.id === rowId) : undefined;
    const videoPrompt = row ? (row.videoMotionPrompt || row.plotDescription).trim() : "";
    const videoComposerContent = row ? storyboardComposerContent(canvasNodeMentionToken(`${scriptNode.id}:row:${row.id}`), storyboardRowReferenceNodeIds(scriptNode, row, nodes, [], false), nodes) : "";

    return nodes.map((node) => {
        if (row && node.id === linkedNode.id && scriptNodeId === connection.fromNodeId && node.type === CanvasNodeType.Video) {
            return {
                ...node,
                title: upstreamText("upstream.v165.message035", { p0: row.shotNumber }),
                metadata: {
                    ...node.metadata,
                    prompt: videoPrompt,
                    composerContent: videoComposerContent,
                    ...storyboardPromptTemplateMetadata(row, "video"),
                    workflowKind: "shot" as const,
                    workflowTitle: upstreamText("upstream.v165.message036", { p0: row.shotNumber }),
                    shotIndex: row.shotNumber,
                    generationMode: "video" as const,
                    videoEditOperation: node.metadata?.videoEditOperation || "text_to_video",
                    seconds: String(row.durationSeconds),
                },
            };
        }
        if (node.id !== scriptNodeId || node.type !== CanvasNodeType.Script) return node;
        const storyboard = node.metadata?.storyboard;
        const binding = bindingForConnectedNode(linkedNode);
        return {
            ...node,
            metadata: {
                ...node.metadata,
                storyboard: {
                    rows: (storyboard?.rows || []).map((item) =>
                        item.id !== rowId &&
                        !(
                            handleId === "storyboard:context" &&
                            binding?.role === "character" &&
                            (item.characters || []).some((character) =>
                                storyboardCharacterTitleMatches(
                                    linkedNode.title,
                                    character.characterName || "",
                                    (storyboard?.rows || []).flatMap((row) => (row.characters || []).map((entry) => entry.characterName || "")),
                                ),
                            )
                        )
                            ? item
                            : scriptNodeId === connection.fromNodeId
                              ? { ...item, imageNodeId: linkedNode.type === CanvasNodeType.Image ? linkedNode.id : item.imageNodeId, videoNodeId: linkedNode.type === CanvasNodeType.Video ? linkedNode.id : item.videoNodeId }
                              : binding && !(item.assetBindings || []).some((candidate) => candidate.nodeId === linkedNode.id)
                                ? { ...item, assetBindings: [...(item.assetBindings || []), binding] }
                                : item,
                    ),
                    visibleColumns: storyboard?.visibleColumns || ["shotNumber", "durationSeconds", "videoMotionPrompt", "dialogue", "assets"],
                    referenceNodeIds: handleId === "storyboard:context" ? Array.from(new Set([...(storyboard?.referenceNodeIds || []), linkedNode.id])) : storyboard?.referenceNodeIds || [],
                },
            },
        };
    });
}

export function storyboardRowFromHandle(nodes: CanvasNodeData[], nodeId: string, handleId?: string) {
    if (!handleId?.startsWith("row:")) return undefined;
    return nodes.find((node) => node.id === nodeId && node.type === CanvasNodeType.Script)?.metadata?.storyboard?.rows.find((row) => `row:${row.id}` === handleId);
}

export function expandStoryboardTextMentions(prompt: string, references: CanvasResourceReference[]) {
    let expanded = prompt;
    references
        .filter((reference) => reference.active && reference.kind === "text" && reference.text?.trim())
        .forEach((reference) => {
            const replacement = upstreamText("upstream.v165.message037", { p0: reference.title, p1: reference.text!.trim() });
            for (const token of [canvasResourceMentionToken(reference), `@${reference.label}`, reference.nodeId ? canvasNodeMentionToken(reference.nodeId) : ""]) {
                if (!token) continue;
                if (expanded.includes(token)) expanded = expanded.split(token).join(replacement);
            }
        });
    return expanded;
}

export function getInputSummary(inputs: NodeGenerationInput[]) {
    return {
        textCount: inputs.filter((input) => input.type === "text").length,
        imageCount: inputs.filter((input) => input.type === "image").length,
        videoCount: inputs.filter((input) => input.type === "video").length,
        audioCount: inputs.filter((input) => input.type === "audio").length,
        characterCount: inputs.filter((input) => input.type === "character").length,
    };
}

export type NodeAlignmentContext = {
    movingBounds: { left: number; top: number; right: number; bottom: number };
    targets: Array<{ x: number[]; y: number[] }>;
};

export function createNodeAlignmentContext(nodes: CanvasNodeData[], initialPositions: Array<{ id: string; x: number; y: number }>): NodeAlignmentContext | null {
    const movingIds = new Set(initialPositions.map((item) => item.id));
    const initialById = new Map(initialPositions.map((item) => [item.id, item]));
    const movingNodes = nodes.filter((node) => movingIds.has(node.id));
    if (!movingNodes.length) return null;
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const left = Math.min(...movingNodes.map((node) => initialById.get(node.id)?.x ?? node.position.x));
    const top = Math.min(...movingNodes.map((node) => initialById.get(node.id)?.y ?? node.position.y));
    const right = Math.max(...movingNodes.map((node) => (initialById.get(node.id)?.x ?? node.position.x) + node.width));
    const bottom = Math.max(...movingNodes.map((node) => (initialById.get(node.id)?.y ?? node.position.y) + node.height));
    const targets = nodes.flatMap((node) => {
        if (movingIds.has(node.id)) return [];
        const batchRoot = node.metadata?.batchRootId ? nodeById.get(node.metadata.batchRootId) : null;
        if (batchRoot && !batchRoot.metadata?.imageBatchExpanded) return [];
        const parent = node.parentId ? nodeById.get(node.parentId) : null;
        if (parent && isFrameNode(parent) && parent.metadata?.frame?.collapsed) return [];
        return [
            {
                x: [node.position.x, node.position.x + node.width / 2, node.position.x + node.width],
                y: [node.position.y, node.position.y + node.height / 2, node.position.y + node.height],
            },
        ];
    });
    return { movingBounds: { left, top, right, bottom }, targets };
}

export function calculateNodeAlignment(context: NodeAlignmentContext | null, rawOffset: Position, threshold: number) {
    if (!context) return { offset: rawOffset, guides: {} as { vertical?: number; horizontal?: number } };
    const { left, top, right, bottom } = context.movingBounds;
    const movingX = [left + rawOffset.x, (left + right) / 2 + rawOffset.x, right + rawOffset.x];
    const movingY = [top + rawOffset.y, (top + bottom) / 2 + rawOffset.y, bottom + rawOffset.y];
    let bestXDelta: number | undefined;
    let bestXGuide: number | undefined;
    let bestYDelta: number | undefined;
    let bestYGuide: number | undefined;
    context.targets.forEach(({ x: targetsX, y: targetsY }) => {
        movingX.forEach((value, anchorIndex) => {
            const target = targetsX[anchorIndex];
            const delta = target - value;
            if (Math.abs(delta) <= threshold && (bestXDelta === undefined || Math.abs(delta) < Math.abs(bestXDelta))) {
                bestXDelta = delta;
                bestXGuide = target;
            }
        });
        movingY.forEach((value, anchorIndex) => {
            const target = targetsY[anchorIndex];
            const delta = target - value;
            if (Math.abs(delta) <= threshold && (bestYDelta === undefined || Math.abs(delta) < Math.abs(bestYDelta))) {
                bestYDelta = delta;
                bestYGuide = target;
            }
        });
    });
    return {
        offset: { x: rawOffset.x + (bestXDelta || 0), y: rawOffset.y + (bestYDelta || 0) },
        guides: { vertical: bestXGuide, horizontal: bestYGuide },
    };
}

export function isHiddenBatchChild(node: CanvasNodeData, nodes: CanvasNodeData[], collapsingBatchIds?: Set<string>) {
    const rootId = node.metadata?.batchRootId;
    if (!rootId) return false;
    const root = nodes.find((item) => item.id === rootId);
    if (root && collapsingBatchIds?.has(rootId)) return false;
    return Boolean(root && !root.metadata?.imageBatchExpanded);
}

export function sameStringSet(left: Set<string>, right: Set<string>) {
    if (left.size !== right.size) return false;
    for (const value of left) if (!right.has(value)) return false;
    return true;
}

export function sameNodeSemanticData(left: CanvasNodeData, right: CanvasNodeData) {
    return left.id === right.id && left.type === right.type && left.title === right.title && left.parentId === right.parentId && left.width === right.width && left.height === right.height && left.metadata === right.metadata;
}

export function applyBatchPrimaryImage(root: CanvasNodeData, primary: CanvasNodeData): CanvasNodeData {
    if (root.metadata?.imageLayerGroup || root.metadata?.experimentalLayerPlan) return root;
    // 主图是根节点对媒体的完整代理；可选字段也必须显式覆盖，避免残留上一张图的存储身份。
    return {
        ...root,
        width: primary.width,
        height: primary.height,
        metadata: {
            ...root.metadata,
            primaryImageId: primary.id,
            content: primary.metadata?.content,
            storageKey: primary.metadata?.storageKey,
            status: primary.metadata?.status,
            naturalWidth: primary.metadata?.naturalWidth,
            naturalHeight: primary.metadata?.naturalHeight,
            bytes: primary.metadata?.bytes,
            mimeType: primary.metadata?.mimeType,
            errorDetails: primary.metadata?.errorDetails,
            generationErrorCode: primary.metadata?.generationErrorCode,
            failedPromptFingerprint: primary.metadata?.failedPromptFingerprint,
            freeResize: primary.metadata?.freeResize,
        },
    };
}

export function removeCanvasNodes(nodes: CanvasNodeData[], requestedIds: Set<string>) {
    const removedIds = new Set(requestedIds);
    nodes.forEach((node) => {
        if (requestedIds.has(node.id)) node.metadata?.batchChildIds?.forEach((childId) => removedIds.add(childId));
        if (requestedIds.has(node.id)) node.metadata?.experimentalLayerPlan?.requests.forEach((request) => removedIds.add(request.nodeId));
    });
    const remainingNodes = nodes.filter((node) => !removedIds.has(node.id));
    const nextNodes = remainingNodes.map((node) => {
        let detached = node.parentId && removedIds.has(node.parentId) ? { ...node, parentId: undefined } : node;
        if (node.metadata) {
            const metadata = { ...node.metadata };
            for (const key of ["directorPreviewNodeId", "directorClayVideoNodeId", "directorDepthNodeId", "directorNormalNodeId", "directorSourceStoryboardNodeId", "directorSourceStoryboardRowId"] as const) {
                if (metadata[key] && removedIds.has(metadata[key]!)) delete metadata[key];
            }
            if (metadata.referenceAssetNodeIds) metadata.referenceAssetNodeIds = metadata.referenceAssetNodeIds.filter((id) => !removedIds.has(id));
            if (metadata.directorCharacterNodeIds) metadata.directorCharacterNodeIds = metadata.directorCharacterNodeIds.filter((id) => !removedIds.has(id));
            detached = { ...detached, metadata };
        }
        const storyboard = detached.metadata?.storyboard;
        const cleaned = storyboard
            ? {
                  ...detached,
                  metadata: {
                      ...detached.metadata,
                      storyboard: {
                          ...storyboard,
                          referenceNodeIds: storyboard.referenceNodeIds.filter((id) => !removedIds.has(id)),
                          rows: storyboard.rows.map((row) => ({
                              ...row,
                              assetBindings: (row.assetBindings || []).filter((binding) => !removedIds.has(binding.nodeId)),
                              imageNodeId: row.imageNodeId && !removedIds.has(row.imageNodeId) ? row.imageNodeId : undefined,
                              videoNodeId: row.videoNodeId && !removedIds.has(row.videoNodeId) ? row.videoNodeId : undefined,
                          })),
                      },
                  },
              }
            : detached;
        const childIds = cleaned.metadata?.batchChildIds?.filter((childId) => !removedIds.has(childId));
        if (!cleaned.metadata?.isBatchRoot || childIds?.length === cleaned.metadata.batchChildIds?.length) return cleaned;
        if (cleaned.metadata.imageLayerGroup) {
            const plan = cleaned.metadata.experimentalLayerPlan;
            const requests = plan?.requests.filter((request) => !removedIds.has(request.nodeId));
            return {
                ...cleaned,
                metadata: {
                    ...cleaned.metadata,
                    batchChildIds: childIds,
                    primaryImageId: undefined,
                    imageLayerGroup: { ...cleaned.metadata.imageLayerGroup, compositeStatus: "updating" as const, layers: cleaned.metadata.imageLayerGroup.layers.filter((layer) => !removedIds.has(layer.nodeId)) },
                    ...(plan ? { experimentalLayerPlan: { ...plan, requests: requests || [], composedSignature: undefined, errorSignature: undefined } } : {}),
                },
            };
        }
        // 子图全部删掉后，父节点不能再停留在空批次（无法展开、仍显示失败数）；交给批次对账还原成普通图片节点。
        if (!childIds?.length) return reconcileImageBatchRoot({ ...cleaned, metadata: { ...cleaned.metadata, batchChildIds: [] } }, remainingNodes);
        const primaryImageId = childIds?.includes(cleaned.metadata.primaryImageId || "") ? cleaned.metadata.primaryImageId : childIds?.[0];
        const primaryNode = remainingNodes.find((item) => item.id === primaryImageId);
        const batchRoot = { ...cleaned, metadata: { ...cleaned.metadata, batchChildIds: childIds, primaryImageId } };
        return primaryNode ? applyBatchPrimaryImage(batchRoot, primaryNode) : batchRoot;
    });
    return { removedIds, nodes: nextNodes };
}

export function buildAngleLabel(params: CanvasImageAngleParams) {
    const horizontal =
        params.horizontalAngle === 0
            ? upstreamText("upstream.v165.message038")
            : params.horizontalAngle > 0
              ? upstreamText("upstream.v165.message039", { p0: params.horizontalAngle })
              : upstreamText("upstream.v165.message040", { p0: Math.abs(params.horizontalAngle) });
    const pitch =
        params.pitchAngle === 0 ? upstreamText("upstream.v165.message041") : params.pitchAngle > 0 ? upstreamText("upstream.v165.message042", { p0: params.pitchAngle }) : upstreamText("upstream.v165.message043", { p0: Math.abs(params.pitchAngle) });
    return upstreamText("upstream.v165.message044", { p0: horizontal, p1: pitch, p2: params.cameraDistance.toFixed(1), p3: params.wideAngle ? upstreamText("canvasDialog.angle.lensWide") : upstreamText("canvasDialog.angle.lensStandard") });
}

export function buildAnglePrompt(params: CanvasImageAngleParams) {
    return upstreamText("upstream.v165.message045", { p0: buildAngleLabel(params) });
}
