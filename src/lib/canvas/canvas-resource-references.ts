import { currentLocaleText } from "@/i18n/current-locale-text";
import { filterActiveCanvasAudioVoiceBindings, normalizeCanvasAudioVoiceBindings } from "@/lib/canvas/canvas-audio-voice-bindings";
import { isDepthReferenceVideo } from "@/lib/media-conversion/contracts";
import { nodeGenerationPrompt } from "@/lib/canvas/generation-contract";
import { directorPrevisReference } from "@/lib/canvas/director/director-previs-cache";
import { storyboardRowReference } from "@/lib/canvas/storyboard-row-reference";
import { storyboardRowReferenceNodeIds } from "@/lib/canvas/canvas-storyboard-materializer";
import { imageReferenceLabel } from "@/lib/image-reference-prompt";
import { canvasNodeVideoPreviewUrl, canvasVideoAssetPreviewUrl } from "@/lib/canvas/canvas-media-preview";
import { writeCanvasNodePrompt } from "@/lib/canvas/canvas-node-prompt";
import { getNodeResourceKind } from "@/lib/canvas/node-registry";
import { seedanceReferenceLabel } from "@/lib/seedance-video";
import type { Skill } from "@/services/api/skills";
import type { Asset, AssetCategory } from "@/stores/use-asset-store";
import { CanvasNodeType, type CanvasConnection, type CanvasNodeData, type CanvasNodeTypeId } from "@/types/canvas";

export type CanvasResourceKind = "image" | "video" | "audio" | "text" | "skill" | "character";

export type CanvasResourceReference = {
    id: string;
    nodeId: string;
    kind: CanvasResourceKind;
    label: string;
    title: string;
    defaultTitle?: string;
    titleEdited?: boolean;
    previewUrl?: string;
    /** 视频/音频的播放源；静态封面保持在 previewUrl。 */
    mediaUrl?: string;
    durationMs?: number;
    storageKey?: string;
    /** 视频首帧是独立的图片资源，不能用视频 storageKey 解析。 */
    previewStorageKey?: string;
    /** 绘图预览保存在按项目隔离的本地绘图仓库，不复用普通图片 storageKey。 */
    drawingId?: string;
    drawingRevision?: number;
    text?: string;
    active: boolean;
    sourceType?: CanvasNodeTypeId;
    skill?: Skill;
    assetId?: string;
    category?: AssetCategory;
    mentionToken?: string;
};

export function canvasSkillMentionToken(skillId: string) {
    return `@[skill:${skillId}]`;
}

export function canvasNodeMentionToken(nodeId: string) {
    return `@[node:${nodeId}]`;
}

export function canvasResourceMentionToken(reference: CanvasResourceReference) {
    if (reference.mentionToken) return reference.mentionToken;
    if (reference.kind === "skill" && reference.skill?.skillId) return canvasSkillMentionToken(reference.skill.skillId);
    if (reference.assetId) return `@[asset:${reference.assetId}]`;
    return `@${reference.label}`;
}

export function normalizeCanvasNodeMentionTokens(prompt: string, references: CanvasResourceReference[]) {
    return references.reduce((value, reference) => {
        if (!reference.nodeId || reference.assetId || reference.kind === "skill") return value;
        return value.split(canvasNodeMentionToken(reference.nodeId)).join(`@${reference.label}`);
    }, prompt);
}

/** 将提示词内已连接素材的名称替换为对应引用；同名的每处指代都会保留为独立引用。 */
export function autoMentionCanvasResourceReferences(prompt: string, references: CanvasResourceReference[]) {
    const referenceByName = new Map<string, CanvasResourceReference | null>();
    references
        .filter((reference) => reference.active && !reference.assetId && reference.kind !== "skill")
        .forEach((reference, index) => {
            canvasResourceMentionNames(reference, index, true).forEach((name) => {
                if (!referenceByName.has(name)) {
                    referenceByName.set(name, reference);
                    return;
                }
                if (referenceByName.get(name)?.id !== reference.id) referenceByName.set(name, null);
            });
        });
    const names = [...referenceByName]
        .filter(([, reference]) => Boolean(reference))
        .map(([name]) => name)
        .sort((left, right) => right.length - left.length);
    if (!names.length) return prompt;

    const matcher = new RegExp(`(^|[^A-Za-z0-9_@])(${names.map(escapeRegExp).join("|")})(?![A-Za-z0-9_])`, "gu");
    return prompt
        .split(/(@\[[^\]]+\]|@[^\s@,.;:!?，。；：！？、)\]}】）]+)/gu)
        .map((part) => {
            if (part.startsWith("@")) return part;
            return part.replace(matcher, (match, prefix: string, name: string, offset: number, source: string) => {
                const nextCharacter = source[offset + match.length];
                if (/^\d+$/u.test(name) && ((prefix && !/[\s,.!?;:，。！？；：、)\]}】）]/u.test(prefix)) || (nextCharacter && !/[\s,.!?;:，。！？；：、)\]}】）]/u.test(nextCharacter)))) return match;
                const separator = needsAutoMentionSeparator(nextCharacter) ? " " : "";
                return `${prefix}${canvasResourceMentionToken(referenceByName.get(name)!)}${separator}`;
            });
        })
        .join("");
}

export type CanvasResourceAutoLinkMatch = {
    reference: CanvasResourceReference;
    start: number;
    end: number;
    query: string;
};

export function findCanvasResourceAutoLinkMatch(prompt: string, cursor: number, references: CanvasResourceReference[]): CanvasResourceAutoLinkMatch | null {
    if (cursor <= 0 || cursor > prompt.length) return null;
    const prefix = prompt.slice(0, cursor);
    if (/@(?:\[[^\]]*|[^\s@,.;:!?，。；：！？、)\]}】）]*)$/u.test(prefix)) return null;
    const aliases = new Map<string, CanvasResourceReference | null>();
    references
        .filter((reference) => reference.active && !reference.assetId && reference.kind !== "skill")
        .forEach((reference, index) => {
            canvasResourceMentionNames(reference, index, true).forEach((name) => {
                if (!aliases.has(name)) aliases.set(name, reference);
                else if (aliases.get(name)?.id !== reference.id) aliases.set(name, null);
            });
        });
    const candidates = [...aliases]
        .filter(([, reference]) => Boolean(reference))
        .map(([name, reference]) => ({ name, reference: reference!, isBareOrder: /^\d+$/u.test(name) }))
        .sort((left, right) => right.name.length - left.name.length);
    for (const candidate of candidates) {
        if (!prefix.endsWith(candidate.name)) continue;
        const start = cursor - candidate.name.length;
        const previous = prompt[start - 1];
        const next = prompt[cursor];
        if (previous === "@") continue;
        if (next && /[A-Za-z0-9_]/u.test(next)) continue;
        if (candidate.isBareOrder && previous && !/[\s,.!?;:，。！？；：、)\]}】）]/u.test(previous)) continue;
        if (candidate.isBareOrder && next && !/[\s,.!?;:，。！？；：、)\]}】）]/u.test(next)) continue;
        if (/^[A-Za-z0-9_]+$/u.test(candidate.name) && previous && /[A-Za-z0-9_]/u.test(previous)) continue;
        return { reference: candidate.reference, start, end: cursor, query: candidate.name };
    }
    return null;
}

function canvasResourceMentionNames(reference: CanvasResourceReference, index: number, includeBareNumber: boolean) {
    const names = new Set([reference.label.trim(), reference.title.trim()].filter(Boolean));
    const order = index + 1;
    names.add(`图片${order}`);
    names.add(`图${order}`);
    names.add(`image${order}`);
    names.add(`image ${order}`);
    const imageLabelMatch = /^图片(\d+)$/u.exec(reference.label.trim());
    if (imageLabelMatch) {
        names.add(`图${imageLabelMatch[1]}`);
        names.add(`image${imageLabelMatch[1]}`);
        names.add(`image ${imageLabelMatch[1]}`);
    }
    if (includeBareNumber) names.add(String(order));
    return names;
}

function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function needsAutoMentionSeparator(nextCharacter: string | undefined) {
    return Boolean(nextCharacter && !/[\s,.!?;:，。！？；：、)\]}】）]/u.test(nextCharacter));
}

const CANVAS_RESOURCE_MENTION_BOUNDARY = /(?:$|\s|[,.!?;:，。！？；：、)\]}】）])/;

function canvasResourceReferenceMentionTokens(reference: CanvasResourceReference) {
    const tokens = [canvasResourceMentionToken(reference), `@${reference.label}`];
    if (reference.nodeId && !reference.assetId && reference.kind !== "skill") tokens.push(canvasNodeMentionToken(reference.nodeId));
    return [...new Set(tokens.filter(Boolean))];
}

function rewriteCanvasPromptAfterReferenceChange(prompt: string, previousReferences: CanvasResourceReference[], nextReferences: CanvasResourceReference[]) {
    const previousCanvasReferences = canvasNodeBoundReferences(previousReferences);
    const nextCanvasReferences = canvasNodeBoundReferences(nextReferences);
    if (!previousCanvasReferences.length || !canvasReferenceIdentityChanged(previousCanvasReferences, nextCanvasReferences)) return prompt;

    const nextByNodeId = new Map(nextCanvasReferences.map((reference) => [reference.nodeId, reference]));
    let value = prompt;
    previousCanvasReferences.forEach((reference) => {
        const nodeToken = canvasNodeMentionToken(reference.nodeId);
        canvasResourceReferenceMentionTokens(reference).forEach((token) => {
            if (token !== nodeToken) value = replaceCanvasMentionToken(value, token, nodeToken);
        });
    });
    previousCanvasReferences
        .filter((reference) => !nextByNodeId.has(reference.nodeId))
        .forEach((reference) => {
            value = removeCanvasMentionToken(value, canvasNodeMentionToken(reference.nodeId));
        });
    value = normalizeCanvasNodeMentionTokens(value, nextCanvasReferences);
    return value === prompt ? prompt : compactRemovedCanvasMentionPrompt(value);
}

export function applyCanvasConnectionPromptSync(previousNodes: CanvasNodeData[], previousConnections: CanvasConnection[], nextNodes: CanvasNodeData[], nextConnections: CanvasConnection[]) {
    const previousMap = buildCanvasNodeMentionReferenceMap(previousNodes, previousConnections, nextNodes);
    const nextMap = buildCanvasNodeMentionReferenceMap(nextNodes, nextConnections, nextNodes);
    let changed = false;
    const mapped = nextNodes.map((node) => {
        const nextReferences = nextMap.get(node.id) || [];
        const previousPrompt = nodeGenerationPrompt(node);
        const nextPrompt = rewriteCanvasPromptAfterReferenceChange(previousPrompt, previousMap.get(node.id) || [], nextReferences);
        const currentBindings = normalizeCanvasAudioVoiceBindings(node.metadata?.audioVoiceBindings);
        const nextBindings = currentBindings.length ? filterActiveCanvasAudioVoiceBindings(currentBindings, nextReferences) : currentBindings;
        const bindingsChanged = Boolean(node.metadata?.audioVoiceBindings?.length) && nextBindings.length !== currentBindings.length;
        if (nextPrompt === previousPrompt && !bindingsChanged) return node;
        changed = true;
        const promptUpdated = nextPrompt === previousPrompt ? node : writeCanvasNodePrompt(node, nextPrompt);
        if (!bindingsChanged) return promptUpdated;
        return { ...promptUpdated, metadata: { ...promptUpdated.metadata, audioVoiceBindings: nextBindings.length ? nextBindings : undefined } };
    });
    return changed ? mapped : nextNodes;
}

function canvasNodeBoundReferences(references: CanvasResourceReference[]) {
    return references.filter((reference) => reference.nodeId && !reference.assetId && reference.kind !== "skill");
}

function canvasReferenceIdentityChanged(previousReferences: CanvasResourceReference[], nextReferences: CanvasResourceReference[]) {
    if (previousReferences.length !== nextReferences.length) return true;
    const nextLabelByNodeId = new Map(nextReferences.map((reference) => [reference.nodeId, reference.label]));
    return previousReferences.some((reference) => nextLabelByNodeId.get(reference.nodeId) !== reference.label);
}

function removeCanvasMentionToken(value: string, token: string) {
    return replaceCanvasMentionToken(value, token, "");
}

export function replaceCanvasMentionToken(value: string, token: string, replacement: string) {
    if (!token) return value;
    const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Numbered media mentions can touch Chinese prose or another mention, but not a longer number.
    const boundary = /^@(图片|视频|音频|文本)\d+$/.test(token) ? "(?![0-9])" : token.startsWith("@[node:") ? "" : `(?=${CANVAS_RESOURCE_MENTION_BOUNDARY.source})`;
    return value.replace(new RegExp(`${escapedToken}${boundary}`, "gu"), () => replacement);
}

/**
 * 替换提示词中针对某参考对象的所有引用（包含 @图片1、@原标题、@[node:xxx]）。
 * 只要提示词中存在指向该对象的标记，同步全部替换为新标记。
 */
export function replaceCanvasReferenceMentions(prompt: string, oldReference: { label?: string; title?: string; nodeId?: string }, replacementToken: string, replacementTitle?: string): string {
    let result = prompt;
    const cleanToken = replacementToken.startsWith("@") ? replacementToken : `@${replacementToken}`;
    const cleanOldLabel = oldReference.label?.replace(/^@/, "");
    if (cleanOldLabel) {
        result = replaceCanvasMentionToken(result, `@${cleanOldLabel}`, cleanToken);
    }
    const cleanOldTitle = oldReference.title?.replace(/^@/, "");
    if (cleanOldTitle && cleanOldTitle !== cleanOldLabel) {
        const cleanRepTitle = replacementTitle?.replace(/^@/, "");
        const targetTitleToken = cleanRepTitle ? `@${cleanRepTitle}` : cleanToken;
        result = replaceCanvasMentionToken(result, `@${cleanOldTitle}`, targetTitleToken);
    }
    if (oldReference.nodeId) {
        result = replaceCanvasMentionToken(result, canvasNodeMentionToken(oldReference.nodeId), cleanToken);
    }
    return result;
}

/** Preserve the input slot and stable node identity while replacing an image reference. */
export function replaceCanvasImageReference(nodes: CanvasNodeData[], connections: CanvasConnection[], targetNodeId: string, oldNodeId: string, sourceNodeId: string) {
    const source = nodes.find((node) => node.id === sourceNodeId);
    const target = nodes.find((node) => node.id === targetNodeId);
    if (!target || !source || resourceKind(source) !== "image" || sourceNodeId === targetNodeId || sourceNodeId === oldNodeId) return null;
    const references = buildNodeMentionReferences(target, nodes, connections);
    const oldReference = references.find((reference) => reference.nodeId === oldNodeId && reference.kind === "image");
    if (!oldReference || references.some((reference) => reference.nodeId === sourceNodeId)) return null;

    const configId = connections.find((edge) => edge.fromNodeId === targetNodeId && nodes.find((node) => node.id === edge.toNodeId)?.type === CanvasNodeType.Config)?.toNodeId;
    const edge = connections.find((item) => item.fromNodeId === oldNodeId && (item.toNodeId === targetNodeId || item.toNodeId === configId));
    if (!edge) return null;

    const pending = [edge.toNodeId];
    const visited = new Set<string>();
    while (pending.length) {
        const id = pending.pop()!;
        if (id === sourceNodeId) return null;
        if (visited.has(id)) continue;
        visited.add(id);
        connections.filter((item) => item.fromNodeId === id && item.id !== edge.id).forEach((item) => pending.push(item.toNodeId));
    }

    const nextConnections = connections.map((item) => (item === edge ? { ...item, fromNodeId: sourceNodeId } : item));
    const previousMap = buildCanvasNodeMentionReferenceMap(nodes, connections);
    const preparedNodes = nodes.map((node) => {
        const old = previousMap.get(node.id)?.find((reference) => reference.nodeId === oldNodeId);
        const nextInputs = getMentionResourceNodes(node.id, nodes, nextConnections);
        if (!old || nextInputs.some((input) => input.id === oldNodeId) || !nextInputs.some((input) => input.id === sourceNodeId)) return node;
        const prompt = nodeGenerationPrompt(node);
        return writeCanvasNodePrompt(node, replaceCanvasReferenceMentions(prompt, old, canvasNodeMentionToken(sourceNodeId)));
    });
    const synced = applyCanvasConnectionPromptSync(nodes, connections, preparedNodes, nextConnections);
    const nextNodes = synced.map((node) => {
        const prompt = nodeGenerationPrompt(node);
        const normalized = normalizeCanvasNodeMentionTokens(prompt, buildNodeMentionReferences(node, synced, nextConnections));
        return normalized === prompt ? node : writeCanvasNodePrompt(node, normalized);
    });
    return { nodes: nextNodes, connections: nextConnections };
}

function compactRemovedCanvasMentionPrompt(value: string) {
    return value
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/[ \t]{2,}/g, " ")
        .replace(/^[ \t]+|[ \t]+$/g, "")
        .replace(/^\n+|\n+$/g, "");
}

export function buildAssetMentionReferences(assets: Asset[]): CanvasResourceReference[] {
    return assets.flatMap((asset): CanvasResourceReference[] => {
        if (asset.kind === "model") return [];
        const kind: CanvasResourceKind = asset.kind === "entity" ? "character" : asset.kind;
        const previewUrl = asset.kind === "image" ? asset.data.dataUrl : asset.kind === "video" ? canvasVideoAssetPreviewUrl(asset.data.url, asset.coverUrl) : asset.coverUrl;
        const text = asset.kind === "text" ? asset.data.content : undefined;
        return [
            {
                id: `asset:${asset.id}`,
                nodeId: "",
                assetId: asset.id,
                kind,
                label: asset.title,
                title: asset.title,
                previewUrl,
                mediaUrl: asset.kind === "video" || asset.kind === "audio" ? asset.data.url : undefined,
                durationMs: "durationMs" in asset.data ? asset.data.durationMs : undefined,
                storageKey: "storageKey" in asset.data ? asset.data.storageKey : undefined,
                text,
                active: false,
                category: asset.category || "other",
            },
        ];
    });
}

export function buildCanvasResourceReferences(nodes: CanvasNodeData[], connections: CanvasConnection[], contextNodeId?: string | null, targetNodes?: CanvasNodeData[]) {
    const contextNodes = contextNodeId ? getMentionResourceNodes(contextNodeId, nodes, connections) : [];
    const sourceNodes = uniqueCanvasNodes([...(targetNodes || nodes), ...contextNodes]);
    const globalReferences = labelResourceNodes(sourceNodes.filter(isResourceNode), false);
    const activeByNodeId = new Map(labelResourceNodes(contextNodes, true).map((reference) => [reference.nodeId, reference]));
    return globalReferences.map((reference) => activeByNodeId.get(reference.nodeId) || reference);
}

/** Agent 的 @ 菜单覆盖整个画布，而不是只覆盖可作为生成输入的资源节点。 */
export function buildCanvasAgentMentionReferences(nodes: CanvasNodeData[]): CanvasResourceReference[] {
    return nodes.map((node, index) => {
        const kind = resourceKind(node) || "text";
        const fallbackTitle = `节点 ${index + 1}`;
        return {
            id: node.id,
            nodeId: node.id,
            kind,
            label: node.title?.trim() || fallbackTitle,
            title: node.title?.trim() || fallbackTitle,
            previewUrl:
                node.metadata?.workflowKind === "character"
                    ? node.metadata.characterCoverUrl
                    : node.type === CanvasNodeType.Drawing
                      ? node.metadata?.drawingPreviewUrl
                      : node.type === CanvasNodeType.Video
                        ? canvasNodeVideoPreviewUrl(node)
                        : node.metadata?.previewContent || node.metadata?.content,
            storageKey: node.metadata?.storageKey,
            previewStorageKey: node.type === CanvasNodeType.Video ? node.metadata?.videoPreview?.storageKey : undefined,
            drawingId: node.type === CanvasNodeType.Drawing ? node.metadata?.drawingId : undefined,
            drawingRevision: node.type === CanvasNodeType.Drawing ? node.metadata?.drawingRevision : undefined,
            text: node.metadata?.content || nodeGenerationPrompt(node) || node.title,
            active: true,
            sourceType: node.type,
            mentionToken: canvasNodeMentionToken(node.id),
        };
    });
}

function uniqueCanvasNodes(nodes: CanvasNodeData[]) {
    const seen = new Set<string>();
    return nodes.filter((node) => {
        if (seen.has(node.id)) return false;
        seen.add(node.id);
        return true;
    });
}

export function buildNodeMentionReferences(node: CanvasNodeData, nodes: CanvasNodeData[], connections: CanvasConnection[]) {
    return labelResourceNodes(getMentionResourceNodes(node.id, nodes, connections), true);
}

export function buildCanvasNodeMentionReferenceMap(nodes: CanvasNodeData[], connections: CanvasConnection[], targetNodes: CanvasNodeData[] = nodes) {
    const resolve = buildCanvasResourceInputResolver(nodes, connections);
    return new Map(targetNodes.map((node) => [node.id, labelResourceNodes(resolve(node.id, true), true)]));
}

/** 批次关系属于分组，不是媒体输入；展示与提交共用这一份输入顺序解析。 */
function buildCanvasResourceInputResolver(nodes: CanvasNodeData[], connections: CanvasConnection[]) {
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const resourceInputsByTargetId = new Map<string, CanvasNodeData[]>();
    const configTargetBySourceId = new Map<string, string>();
    for (const connection of connections) {
        const source = nodeById.get(connection.fromNodeId);
        const target = nodeById.get(connection.toNodeId);
        if (!source || !target) continue;
        if (connection.relation === "director-output") continue;
        if (source.type === CanvasNodeType.Script && connection.fromHandleId?.startsWith("row:")) {
            const row = source.metadata?.storyboard?.rows.find((row) => `row:${row.id}` === connection.fromHandleId);
            if (!row) continue;
            const inputs = resourceInputsByTargetId.get(target.id) || [];
            inputs.push(storyboardRowReference(source, row));
            for (const id of storyboardRowReferenceNodeIds(source, row, nodes, connections, target.type === CanvasNodeType.Video)) {
                const resource = nodeById.get(id);
                if (resource && resource.id !== target.id && isResourceNode(resource)) inputs.push(resource);
            }
            resourceInputsByTargetId.set(target.id, inputs);
            continue;
        }
        if (source.metadata?.directorSceneId) {
            const inputs = resourceInputsByTargetId.get(target.id) || [];
            if (source.metadata.directorPrevis) inputs.push(directorPrevisReference(source));
            for (const id of [source.metadata.directorPreviewNodeId, ...(source.metadata.referenceAssetNodeIds || []), source.metadata.directorPrevis ? undefined : source.metadata.directorClayVideoNodeId]) {
                const output = id ? nodeById.get(id) : undefined;
                if (output && isResourceNode(output)) inputs.push(output);
            }
            resourceInputsByTargetId.set(target.id, inputs);
            continue;
        }
        if (isResourceNode(source) && target.metadata?.batchRootId !== source.id) {
            const inputs = resourceInputsByTargetId.get(target.id) || [];
            inputs.push(source);
            resourceInputsByTargetId.set(target.id, inputs);
        }
        if (target.type === CanvasNodeType.Config && !configTargetBySourceId.has(source.id)) {
            configTargetBySourceId.set(source.id, target.id);
        }
    }

    return function resolve(nodeId: string, includeSelf = false, visited = new Set<string>()): CanvasNodeData[] {
        if (visited.has(nodeId)) return [];
        visited.add(nodeId);
        const node = nodeById.get(nodeId);
        if (!node) return [];
        const configTargetId = configTargetBySourceId.get(nodeId);
        const configInputs = configTargetId ? (resourceInputsByTargetId.get(configTargetId) || []).filter((input) => input.id !== nodeId) : [];
        const ownInputs = (resourceInputsByTargetId.get(nodeId) || []).filter((input) => input.id !== nodeId);
        if (configInputs.length) return uniqueCanvasNodes(configInputs);
        if (ownInputs.length) return uniqueCanvasNodes(ownInputs);
        const batchRoot = node.metadata?.batchRootId ? nodeById.get(node.metadata.batchRootId) : undefined;
        if (batchRoot?.metadata?.isBatchRoot) return resolve(batchRoot.id, false, visited);
        // 上传的独立素材仍可用于图生图；生成输出和输入框附件不能混为自身输入。
        const hasSeparateImageInputs = node.type === CanvasNodeType.Image && Boolean(node.metadata?.taskId || node.metadata?.producedModel || node.metadata?.composerAttachments?.length);
        const emptyTextTarget = node.type === CanvasNodeType.Text && !node.metadata?.content?.trim();
        return includeSelf && !emptyTextTarget && !hasSeparateImageInputs && isResourceNode(node) ? [node] : [];
    };
}

export function buildOrderedCanvasResourceReferences(nodes: CanvasNodeData[], active = true) {
    return labelResourceNodes(nodes.filter(isResourceNode), active);
}

export function imageGenerationReferenceConnections(sourceNodeId: string, targetNodeId: string, nodes: CanvasNodeData[], connections: CanvasConnection[], createId: () => string): CanvasConnection[] {
    if (!sourceNodeId || sourceNodeId === targetNodeId) return [];
    const existing = new Set(connections.filter((connection) => connection.toNodeId === targetNodeId).map((connection) => connection.fromNodeId));
    return getMentionResourceNodes(sourceNodeId, nodes, connections)
        .filter((node) => node.id !== sourceNodeId && node.id !== targetNodeId && !existing.has(node.id))
        .map((node) => ({ id: createId(), fromNodeId: node.id, toNodeId: targetNodeId }));
}

export function getMentionResourceNodes(nodeId: string, nodes: CanvasNodeData[], connections: CanvasConnection[]) {
    // 独立上传图片可显式引用自身；图片生成结果只通过输出边成为下游输入。
    return buildCanvasResourceInputResolver(nodes, connections)(nodeId, true);
}

/** 连线到空白媒体节点时显式展示输入槽位，不覆盖已有草稿或上游输入。 */
export function prefillCanvasConnectedMediaPrompt(nodes: CanvasNodeData[], connections: CanvasConnection[], targetNodeId: string) {
    const target = nodes.find((node) => node.id === targetNodeId);
    if (!target || (target.type !== CanvasNodeType.Image && target.type !== CanvasNodeType.Video) || nodeGenerationPrompt(target) || target.metadata?.content || target.metadata?.storageKey || target.metadata?.composerAttachments?.length) return nodes;
    const references = buildNodeMentionReferences(target, nodes, connections).filter((reference) => ["image", "video", "audio", "text", "character"].includes(reference.kind));
    if (!references.length) return nodes;
    const depth = target.type === CanvasNodeType.Video ? references.find((ref) => ref.kind === "video" && nodes.some((node) => node.id === ref.nodeId && isDepthReferenceVideo(node))) : undefined;
    const prompt = references.map((ref) => (ref === depth ? currentLocaleText("canvasExtra.mediaConv.depthReferencePrompt", { video: canvasResourceMentionToken(ref) }) : canvasResourceMentionToken(ref))).join(" ");
    return nodes.map((node) => (node.id === targetNodeId ? writeCanvasNodePrompt(node, prompt) : node));
}

export function getGenerationResourceNodes(nodeId: string, nodes: CanvasNodeData[], connections: CanvasConnection[]) {
    return buildCanvasResourceInputResolver(nodes, connections)(nodeId);
}

/** 收集节点自身及其上游链路中的视频节点，用于时间线片段导入定位真正的视频源。 */
export function collectUpstreamVideoNodes(nodeId: string, nodes: CanvasNodeData[], connections: CanvasConnection[]): CanvasNodeData[] {
    const queue = [nodeId];
    const visited = new Set<string>();
    const result: CanvasNodeData[] = [];
    while (queue.length) {
        const currentId = queue.shift()!;
        if (visited.has(currentId)) continue;
        visited.add(currentId);
        const node = nodes.find((item) => item.id === currentId);
        if (node?.type === CanvasNodeType.Video && Boolean(node.metadata?.content || node.metadata?.storageKey)) result.push(node);
        connections.filter((connection) => connection.toNodeId === currentId).forEach((connection) => queue.push(connection.fromNodeId));
    }
    return result;
}

/**
 * 该节点的直接上游素材节点（按连线取 fromNodeId，只保留构成素材的）。
 * 扩展节点经 CanvasNodeGraphContext 复用它，不要另写一份取上游的逻辑。
 */
export function getContextResourceNodes(nodeId: string, nodes: CanvasNodeData[], connections: CanvasConnection[]) {
    return connections
        .filter((connection) => connection.toNodeId === nodeId && connection.fromNodeId !== nodeId)
        .map((connection) => nodes.find((node) => node.id === connection.fromNodeId))
        .filter((node): node is CanvasNodeData => Boolean(node && isResourceNode(node)));
}

/**
 * 调整目标节点的素材输入边顺序。连接数组是引用编号的唯一顺序源；只替换相关
 * 输入边所在槽位，避免改变主链和其他节点的连线顺序。
 */
export function reorderCanvasResourceConnections(targetNodeId: string, orderedNodeIds: string[], nodes: CanvasNodeData[], connections: CanvasConnection[]) {
    const uniqueOrder = [...new Set(orderedNodeIds.filter(Boolean))];
    if (uniqueOrder.length < 2) return connections;
    const configNodeId = connections.find((connection) => connection.fromNodeId === targetNodeId && nodes.find((node) => node.id === connection.toNodeId)?.type === CanvasNodeType.Config)?.toNodeId;
    const configInputs = configNodeId ? getContextResourceNodes(configNodeId, nodes, connections).filter((node) => node.id !== targetNodeId) : [];
    const receiverId = configInputs.length ? configNodeId! : targetNodeId;
    const orderSet = new Set(uniqueOrder);
    const slots = connections.map((connection, index) => ({ connection, index })).filter(({ connection }) => connection.toNodeId === receiverId && orderSet.has(connection.fromNodeId));
    if (slots.length !== uniqueOrder.length) return connections;
    const connectionBySource = new Map(slots.map(({ connection }) => [connection.fromNodeId, connection]));
    if (uniqueOrder.some((nodeId) => !connectionBySource.has(nodeId))) return connections;
    const reordered = uniqueOrder.map((nodeId) => connectionBySource.get(nodeId)!);
    if (slots.every(({ connection }, index) => connection === reordered[index])) return connections;
    const next = [...connections];
    slots.forEach(({ index }, orderIndex) => {
        next[index] = reordered[orderIndex];
    });
    return next;
}

function labelResourceNodes(nodes: CanvasNodeData[], active: boolean) {
    const counts: Record<CanvasResourceKind, number> = { image: 0, video: 0, audio: 0, text: 0, skill: 0, character: 0 };
    let drawingCount = 0;
    return nodes.flatMap((node): CanvasResourceReference[] => {
        const kind = resourceKind(node);
        if (!kind) return [];
        const index = node.type === CanvasNodeType.Drawing ? drawingCount++ : counts[kind]++;
        const label = node.type === CanvasNodeType.Drawing ? `绘图${index + 1}` : labelForKind(kind, index);
        return [
            {
                id: node.id,
                nodeId: node.id,
                kind,
                label,
                title: node.title || label,
                defaultTitle: node.metadata?.defaultTitle,
                titleEdited: node.metadata?.titleEdited,
                mediaUrl: kind === "video" || kind === "audio" ? node.metadata?.content : undefined,
                durationMs: node.metadata?.durationMs,
                previewUrl:
                    node.metadata?.workflowKind === "character"
                        ? node.metadata.characterCoverUrl
                        : node.type === CanvasNodeType.Drawing
                          ? node.metadata?.drawingPreviewUrl
                          : node.type === CanvasNodeType.Video
                            ? canvasNodeVideoPreviewUrl(node)
                            : node.metadata?.previewContent || node.metadata?.content,
                storageKey: node.metadata?.storageKey,
                previewStorageKey: node.type === CanvasNodeType.Video ? node.metadata?.videoPreview?.storageKey : undefined,
                drawingId: node.type === CanvasNodeType.Drawing ? node.metadata?.drawingId : undefined,
                drawingRevision: node.type === CanvasNodeType.Drawing ? node.metadata?.drawingRevision : undefined,
                text:
                    node.metadata?.workflowKind === "character"
                        ? node.metadata.characterPrompt
                        : node.type === CanvasNodeType.Text
                          ? node.metadata?.content || node.metadata?.prompt
                          : node.type === CanvasNodeType.Skill
                            ? skillResourceText(node)
                            : undefined,
                active,
                sourceType: node.type,
            },
        ];
    });
}

function labelForKind(kind: CanvasResourceKind, index: number) {
    if (kind === "character") return `角色${index + 1}`;
    if (kind === "image") return imageReferenceLabel(index);
    if (kind === "video") return seedanceReferenceLabel("video", index);
    if (kind === "audio") return seedanceReferenceLabel("audio", index);
    if (kind === "skill") return `技能${index + 1}`;
    return `文本${index + 1}`;
}

function isResourceNode(node: CanvasNodeData) {
    return Boolean(resourceKind(node));
}

function resourceKind(node: CanvasNodeData): CanvasResourceKind | null {
    // 角色卡是跨类型覆盖：任何节点带上角色元数据都按角色处理，故先于按类型判定。
    if (node.metadata?.workflowKind === "character" && node.metadata.characterAssetId) return "character";
    return getNodeResourceKind(node);
}

function skillResourceText(node: CanvasNodeData) {
    const skill = node.metadata?.skillSnapshot;
    if (!skill) return node.metadata?.content || "";
    return [skill.name, skill.description, skill.template, skill.outputContract].filter(Boolean).join("\n\n");
}

function sameCanvasResourceReference(left: CanvasResourceReference, right: CanvasResourceReference) {
    if (left === right) return true;
    const leftKeys = Object.keys(left) as Array<keyof CanvasResourceReference>;
    if (leftKeys.length !== Object.keys(right).length) return false;
    return leftKeys.every((key) => left[key] === right[key]);
}

/**
 * 引用列表每次重建都会生成新对象；内容未变的节点沿用上一轮的数组，
 * 让 memo 化的画布节点在无关更新（打字、拖动、选中）时不必重渲染。
 */
export function reuseStableCanvasReferenceLists(previous: ReadonlyMap<string, CanvasResourceReference[]>, next: Map<string, CanvasResourceReference[]>) {
    next.forEach((references, nodeId) => {
        const old = previous.get(nodeId);
        if (!old || old === references || old.length !== references.length) return;
        if (old.every((reference, index) => sameCanvasResourceReference(reference, references[index]))) next.set(nodeId, old);
    });
    return next;
}

/** 单个引用版本的 {@link reuseStableCanvasReferenceLists}。 */
export function reuseStableCanvasReferences(previous: ReadonlyMap<string, CanvasResourceReference>, next: Map<string, CanvasResourceReference>) {
    next.forEach((reference, nodeId) => {
        const old = previous.get(nodeId);
        if (old && old !== reference && sameCanvasResourceReference(old, reference)) next.set(nodeId, old);
    });
    return next;
}
