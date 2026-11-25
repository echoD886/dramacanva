import type { CanvasNodeData } from "@/types/canvas";

export function isPublicCaseMediaUrl(value?: string) {
    if (!value) return false;
    try { return new URL(value, "https://canvas.invalid").pathname.startsWith("/liblib-clone/"); }
    catch { return false; }
}

/** Provenance follows the original content, not the editable node's identity. */
export function isPublicCaseReference(node: CanvasNodeData) {
    const metadata = node.metadata;
    if (!metadata || metadata.storageKey) return false;
    return isPublicCaseMediaUrl(metadata.content)
        || Boolean(metadata.publicCaseContent && metadata.content === metadata.publicCaseContent);
}
