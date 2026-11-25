import type { CanvasResourceReference } from "@/lib/canvas/canvas-resource-references";
import { textDocumentExtensions } from "@/pages/create/creation-assets";

export type HomeAttachmentKind = "image" | "video" | "audio" | "file";
export const HOME_ATTACHMENT_KINDS: HomeAttachmentKind[] = ["image", "video", "audio", "file"];
/** File-picker accept value per kind; documents follow the create page's list. */
export const HOME_ATTACHMENT_ACCEPT: Record<HomeAttachmentKind, string> = { image: "image/*", video: "video/*", audio: "audio/*", file: textDocumentExtensions.join(",") };
// Stable sentinel labels shared with the create page (creation-references.ts), which
// renumbers routed attachments per kind in the same order; the UI localizes them.
const HOME_MENTION_LABEL: Record<HomeAttachmentKind, string> = { image: "图片", video: "视频", audio: "音频", file: "文件" };

export function homeAttachmentKind(file: File): HomeAttachmentKind | null {
    const kind = file.type.split("/", 1)[0];
    if (kind === "image" || kind === "video" || kind === "audio") return kind;
    const name = file.name.toLowerCase();
    return kind === "text" || textDocumentExtensions.some((extension) => name.endsWith(extension)) ? "file" : null;
}

export function countHomeAttachments(files: File[]) {
    const counts: Record<HomeAttachmentKind, number> = { image: 0, video: 0, audio: 0, file: 0 };
    for (const file of files) {
        const kind = homeAttachmentKind(file);
        if (kind) counts[kind] += 1;
    }
    return counts;
}

export function homeMentionReferences(previews: { file: File; url: string }[]): CanvasResourceReference[] {
    const counts: Record<HomeAttachmentKind, number> = { image: 0, video: 0, audio: 0, file: 0 };
    return previews.map(({ file, url }, index) => {
        const kind = homeAttachmentKind(file) || "image";
        const label = `${HOME_MENTION_LABEL[kind]}${++counts[kind]}`;
        return { id: `home-attachment:${index}`, nodeId: `home-attachment:${index}`, kind: kind === "file" ? "text" : kind, label, title: file.name, previewUrl: url || undefined, active: true, mentionToken: `@${label}` };
    });
}

/** Rewrites @labels in one pass so renumbering (图片2→图片1) never cascades. */
export function relabelHomeMentions(prompt: string, mapping: [from: string, to: string][]) {
    const targets = new Map(mapping.filter(([from, to]) => from !== to));
    if (!targets.size) return prompt;
    const pattern = new RegExp(`@(${[...targets.keys()].sort((a, b) => b.length - a.length).map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?![0-9])`, "g");
    return prompt.replace(pattern, (_, label: string) => {
        const next = targets.get(label);
        return next ? `@${next}` : "";
    }).replace(/[ \t]{2,}/g, " ");
}

const attachmentKeys = new WeakMap<File, string>();
let nextAttachmentKey = 0;

/** Stable React key per selected File object; name/size/lastModified collide when the same file is added twice. */
export function homeAttachmentKey(file: File) {
    let key = attachmentKeys.get(file);
    if (!key) {
        nextAttachmentKey += 1;
        key = `home-attachment-${nextAttachmentKey}`;
        attachmentKeys.set(file, key);
    }
    return key;
}
