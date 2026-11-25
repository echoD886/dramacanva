import { creationResultAssetIds } from "@/lib/canvas/canvas-asset-handoff";
import type { Asset } from "@/stores/use-asset-store";
import { creationAttachmentFromAsset } from "./creation-assets";

export const CREATION_IMAGE_DRAG_TYPE = "application/x-creation-image";
type ResultMessage = { id: string; role: string; mode?: string; status?: string; resultUrls?: string[]; taskIds?: string[] };

// Drag payloads identify a result; ownership and current URLs come from scoped state.
export function creationReferenceFromDrop(payload: string, messages: ResultMessage[], assets: Asset[]) {
    try {
        const identity: unknown = JSON.parse(payload);
        if (!identity || typeof identity !== "object" || !("messageId" in identity) || !("url" in identity)) return null;
        const message = messages.find((item) => item.id === identity.messageId && item.role === "assistant" && item.mode === "image" && item.status === "done");
        if (!message) return null;
        const resultUrls = message.resultUrls || [];
        const index = resultUrls.findIndex((url) => url === identity.url);
        if (index < 0) return null;
        const ids = creationResultAssetIds(assets, { messageId: message.id, taskIds: message.taskIds || [], resultUrls });
        const asset =
            assets.find((item) => item.kind === "image" && ids.includes(item.id) && (item.data.dataUrl === resultUrls[index] || item.coverUrl === resultUrls[index])) ||
            (ids.length === resultUrls.length ? assets.find((item) => item.id === ids[index]) : undefined);
        return asset?.kind === "image" ? creationAttachmentFromAsset(asset) : null;
    } catch {
        return null;
    }
}
