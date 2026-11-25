import type { CanvasComposerAttachment } from "@/types/canvas";
import type { NodeGenerationContext } from "@/components/canvas/canvas-node-generation";
import type { CanvasResourceReference } from "./canvas-resource-references";
import { currentLocaleText } from "@/i18n/current-locale-text";
import { replaceGenerationMentions } from "./generation-mention-tokens";

export const composerAttachmentToken = (id: string) => `@[attachment:${id}]`;

export function composerAttachmentReferences(attachments: CanvasComposerAttachment[], references: CanvasResourceReference[] = []): CanvasResourceReference[] {
    const counts = { image: 0, video: 0, audio: 0 };
    for (const reference of references) {
        if (!reference.active) continue;
        const match = /^(图片|视频|音频)(\d+)$/.exec(reference.label);
        if (match) {
            const kind = match[1] === "图片" ? "image" : match[1] === "视频" ? "video" : "audio";
            counts[kind] = Math.max(counts[kind], Number(match[2]));
        }
    }
    return attachments.map((item) => ({
        id: `attachment:${item.id}`,
        nodeId: "",
        kind: item.kind,
        label: `${{ image: "图片", video: "视频", audio: "音频" }[item.kind]}${++counts[item.kind]}`,
        title: item.name,
        active: true,
        storageKey: item.storageKey,
        previewStorageKey: item.previewStorageKey,
        previewUrl: item.kind === "image" ? item.url : item.previewUrl,
        mediaUrl: item.url,
        durationMs: item.durationMs,
        mentionToken: composerAttachmentToken(item.id),
    }));
}

export function removeComposerAttachmentMentions(prompt: string, previous: CanvasComposerAttachment[], next: CanvasComposerAttachment[]) {
    const removed = new Set(previous.filter((item) => !next.some((candidate) => candidate.id === item.id)).map((item) => item.id));
    return prompt.replace(/@\[attachment:([^\]]+)\]/g, (token, id: string) => (removed.has(id) ? "" : token));
}

/** 手写编号和编辑器稳定 token 共用附件槽位；只转换请求，不回写草稿。 */
export function normalizeComposerAttachmentMentions(prompt: string, attachments: CanvasComposerAttachment[], references: CanvasResourceReference[]) {
    const tokenByLabel = new Map(composerAttachmentReferences(attachments, references).map((reference) => [`@${reference.label}`, reference.mentionToken!]));
    return replaceGenerationMentions(prompt, (token) => tokenByLabel.get(token) || token);
}

function sameAttachmentResource(reference: { storageKey?: string; url?: string }, attachment: CanvasComposerAttachment) {
    return Boolean((attachment.storageKey && reference.storageKey === attachment.storageKey) || (attachment.url && reference.url === attachment.url));
}

/** 附件与连线输入并存；同一个资源只提交一次。 */
export function withComposerAttachments(context: NodeGenerationContext, attachments: CanvasComposerAttachment[] = []): NodeGenerationContext {
    const referenceImages = [...context.referenceImages];
    const referenceVideos = [...context.referenceVideos];
    const referenceAudios = [...context.referenceAudios];
    for (const item of attachments) {
        const references = item.kind === "image" ? referenceImages : item.kind === "video" ? referenceVideos : referenceAudios;
        if (references.some((reference) => sameAttachmentResource(reference, item))) continue;
        const reference = { id: item.id, name: item.name, type: item.mimeType, url: item.url, storageKey: item.storageKey, bytes: item.bytes, width: item.width, height: item.height, durationMs: item.durationMs };
        if (item.kind === "image") referenceImages.push({ ...reference, dataUrl: "" });
        else if (item.kind === "video") referenceVideos.push(reference);
        else referenceAudios.push(reference);
    }
    const prompt = context.prompt.replace(/@\[attachment:([^\]]+)\]/g, (token, id: string) => {
        const item = attachments.find((attachment) => attachment.id === id);
        if (!item) throw new Error(currentLocaleText("canvasAgent.gen.unresolvedMentions", { mentions: token }));
        const references = item.kind === "image" ? referenceImages : item.kind === "video" ? referenceVideos : referenceAudios;
        const index = references.findIndex((reference) => sameAttachmentResource(reference, item));
        return `@${{ image: "图片", video: "视频", audio: "音频" }[item.kind]}${index + 1}`;
    });
    return { ...context, prompt, referenceImages, referenceVideos, referenceAudios, imageCount: referenceImages.length, videoCount: referenceVideos.length, audioCount: referenceAudios.length };
}
