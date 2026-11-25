import { getDataUrlByteSize } from "@/lib/image-utils";
import { currentLocaleText } from "@/i18n/current-locale-text";
import { canvasNodeVideoPreviewUrl } from "@/lib/canvas/canvas-media-preview";
import { resolveAssetIngest } from "@/services/asset-archive";
import { isPublicCaseReference } from "./public-case-reference";
import type { Asset, AssetCategory, NewAsset } from "@/stores/use-asset-store";
import { CanvasNodeType, type CanvasNodeData, type CanvasNodeTypeId } from "@/types/canvas";

export type CanvasAssetSource = "canvas-generation" | "canvas-upload" | "canvas-manual";

/** First-ingest deterministic context only; prompt inference belongs to the server. */
export function withAssetContextClassification<T extends NewAsset>(asset: T): T {
    if (asset.categorySource === "user" || asset.kind === "model") return asset;
    const context = (category: AssetCategory): T => ({ ...asset, category, categorySource: "context" });
    if (asset.kind === "audio") return { ...asset, categorySource: "context" };
    if (asset.kind === "video") return context("shot");
    if (asset.kind === "entity") return context("character");
    if (asset.kind === "text") return context("other");
    const metadata = asset.metadata || {};
    if (Array.isArray(metadata.roleReferences) && metadata.roleReferences.some(id => typeof id === "string" && id.length > 0)) return context("shot");
    const categories = [metadata.outputCategory, metadata.assetCategory, metadata.workflowKind === "character" ? "character" : metadata.workflowKind === "scene" ? "environment" : undefined]
        .filter((category): category is AssetCategory => typeof category === "string" && ["character", "environment", "prop", "shot", "wardrobe", "weapon", "style", "other"].includes(category));
    if (categories.length && categories.every(category => category === categories[0])) return context(categories[0]);
    return { ...asset, category: asset.category ?? "other", categorySource: "ai_pending" };
}

type CanvasNodeAssetOptions = {
    canvasId: string;
    source: CanvasAssetSource;
    taskId?: string;
};

export function canvasNodeToAsset(node: CanvasNodeData, options: CanvasNodeAssetOptions): NewAsset | null {
    if (isPublicCaseReference(node)) return null;
    const content = node.metadata?.content?.trim() || "";
    const storageKey = node.metadata?.storageKey?.trim() || undefined;
    const isMedia = node.type === CanvasNodeType.Image || node.type === CanvasNodeType.Video || node.type === CanvasNodeType.Audio;

    // 文本素材必须直接携带正文；媒体则允许只有持久 storageKey。后者常见于页面重载后：
    // blob/object URL 已失效，但资源定位符仍可从后端重新换取可访问地址，不能因此丢掉素材记录。
    if (node.type === CanvasNodeType.Text && !content) return null;
    if (isMedia && !content && !storageKey) return null;
    if (!isMedia && node.type !== CanvasNodeType.Text) return null;
    const title = node.title || canvasAssetFallbackTitle(node.type);
    const metadata = {
        source: options.source,
        canvasId: options.canvasId,
        nodeId: node.id,
        taskId: options.taskId || node.metadata?.taskId,
        prompt: node.metadata?.prompt,
        assetCategory: node.metadata?.assetCategory,
        workflowKind: node.metadata?.workflowKind,
        resourceKey: storageKey,
    };
    const base = {
        title,
        coverUrl: node.type === CanvasNodeType.Image ? content : node.type === CanvasNodeType.Video ? canvasNodeVideoPreviewUrl(node) : "",
        tags: node.metadata?.assetTags || [],
        category: canvasNodeAssetCategory(node),
        status: "confirmed" as const,
        source: "Canvas",
        metadata,
    };
    const ingest = (asset: NewAsset) => resolveAssetIngest(withAssetContextClassification(asset), { canvasId: options.canvasId, sourceCode: options.source });

    if (node.type === CanvasNodeType.Text) {
        return ingest({ ...base, kind: "text", data: { content } });
    }
    if (node.type === CanvasNodeType.Image) {
        const dataUrl = storageKey ? "" : content;
        return ingest({
            ...base,
            kind: "image",
            data: {
                dataUrl,
                storageKey,
                width: node.metadata?.naturalWidth || node.width,
                height: node.metadata?.naturalHeight || node.height,
                bytes: node.metadata?.bytes || getDataUrlByteSize(dataUrl),
                mimeType: node.metadata?.mimeType || "image/png",
            },
        });
    }
    if (node.type === CanvasNodeType.Video) {
        return ingest({
            ...base,
            kind: "video",
            data: {
                url: content,
                storageKey,
                width: node.metadata?.naturalWidth || node.width,
                height: node.metadata?.naturalHeight || node.height,
                durationMs: node.metadata?.durationMs,
                hasAudio: node.metadata?.hasAudio,
                bytes: node.metadata?.bytes || 0,
                mimeType: node.metadata?.mimeType || "video/mp4",
            },
        });
    }
    if (node.type === CanvasNodeType.Audio) {
        return ingest({
            ...base,
            kind: "audio",
            data: {
                url: content,
                storageKey,
                durationMs: node.metadata?.durationMs,
                bytes: node.metadata?.bytes || 0,
                mimeType: node.metadata?.mimeType || "audio/mpeg",
            },
        });
    }
    return null;
}

export function requiresMaterializedCanvasAsset(node: CanvasNodeData, taskId?: string) {
    const metadata = node.metadata;
    if (!(taskId || metadata?.taskId) || !canvasNodeResourceIdentity(node)?.startsWith("resource:")) return false;
    if (metadata?.imageLayerGroup) return false;
    const sourceKey = metadata?.layerExtraction?.sourceResultStorageKey;
    return !sourceKey || sourceKey === metadata?.storageKey;
}

export function findCanvasNodeAsset(assets: Asset[], node: CanvasNodeData, canvasId: string, taskId?: string) {
    const explicitId = node.metadata?.assetId;
    if (explicitId) {
        const explicit = assets.find((asset) => asset.id === explicitId);
        if (explicit && sameAssetResource(explicit, node)) return explicit;
    }
    const generationTaskId = taskId || node.metadata?.taskId;
    const resource = canvasNodeResourceIdentity(node);
    // Cloud generation assets have taskId/outputIndex, but no canvas nodeId.
    // Resource identity also covers Agent patches and copies into another canvas.
    if (resource) {
        const matches = assets.filter((asset) => asset.kind === node.type && assetResourceIdentity(asset) === resource);
        const existing = matches.find((asset) => asset.metadata?.taskId === generationTaskId && generationTaskId) || matches.find((asset) => asset.metadata?.source === "generation-task") || matches[0];
        if (existing) return existing;
    }
    if (!resource && generationTaskId && !node.metadata?.imageLayerGroup && !node.metadata?.layerExtraction) {
        const outputs = assets.filter((asset) => asset.kind === node.type && asset.metadata?.taskId === generationTaskId);
        // Task identity alone is safe only for a single output. Multi-output
        // tasks require a resource or explicit asset ID to select the result.
        if (outputs.length === 1) return outputs[0];
    }
    return assets.find((asset) => {
        if (generationTaskId && asset.metadata?.taskId === generationTaskId && asset.metadata?.nodeId === node.id) return sameAssetResource(asset, node);
        if (asset.metadata?.nodeId !== node.id) return false;
        const sourceCanvasId = asset.metadata?.canvasId;
        if (sourceCanvasId !== canvasId && (sourceCanvasId || asset.metadata?.source !== "canvas-generation")) return false;
        const nodeResourceKey = node.metadata?.storageKey;
        const assetResourceKey = typeof asset.metadata?.resourceKey === "string" ? asset.metadata.resourceKey : assetStorageKey(asset);
        return !nodeResourceKey || !assetResourceKey || nodeResourceKey === assetResourceKey;
    });
}

function sameAssetResource(asset: Asset, node: CanvasNodeData) {
    if (asset.kind !== node.type) return false;
    const nodeResourceKey = canvasNodeResourceIdentity(node);
    const assetResourceKey = assetResourceIdentity(asset);
    return !nodeResourceKey || !assetResourceKey || nodeResourceKey === assetResourceKey;
}

function resourceIdentity(value?: string) {
    if (!value) return undefined;
    const resourceId = value.match(/^resource:([A-Za-z0-9_-]+)$/)?.[1] || value.match(/(?:^|\/)api\/resources\/([A-Za-z0-9_-]+)\/file(?:[?#]|$)/)?.[1];
    return resourceId ? `resource:${resourceId}` : undefined;
}

export function canvasNodeResourceIdentity(node: CanvasNodeData) {
    return resourceIdentity(node.metadata?.storageKey) || resourceIdentity(node.metadata?.content) || node.metadata?.storageKey;
}

function assetResourceIdentity(asset: Asset) {
    const key = assetStorageKey(asset) || (typeof asset.metadata?.resourceKey === "string" ? asset.metadata.resourceKey : undefined);
    const url = asset.kind === "image" ? asset.data.dataUrl : asset.kind === "video" || asset.kind === "audio" ? asset.data.url : undefined;
    return resourceIdentity(key) || resourceIdentity(url) || resourceIdentity(asset.coverUrl) || key;
}

function assetStorageKey(asset: Asset) {
    if (asset.kind === "text" || asset.kind === "entity") return undefined;
    return asset.data.storageKey;
}

export function declaredCanvasNodeAssetCategory(node: CanvasNodeData): AssetCategory | undefined {
    if (node.metadata?.assetCategory) return node.metadata.assetCategory;
    if (node.metadata?.workflowKind === "character") return "character";
    if (node.metadata?.workflowKind === "scene") return "environment";
    if (node.metadata?.workflowKind === "styleboard") return "material";
    return undefined;
}

export function canvasNodeAssetCategory(node: CanvasNodeData): AssetCategory {
    const declared = declaredCanvasNodeAssetCategory(node);
    if (declared) return declared;
    if (node.type === CanvasNodeType.Image || node.type === CanvasNodeType.Video || node.type === CanvasNodeType.Audio) return "material";
    return "other";
}

function canvasAssetFallbackTitle(type: CanvasNodeTypeId) {
    if (type === CanvasNodeType.Image) return currentLocaleText("canvasExtra.nodeAsset.image");
    if (type === CanvasNodeType.Video) return currentLocaleText("canvasExtra.nodeAsset.video");
    if (type === CanvasNodeType.Audio) return currentLocaleText("canvasExtra.nodeAsset.audio");
    return currentLocaleText("canvasExtra.nodeAsset.text");
}
