import { currentLocaleText } from "@/i18n/current-locale-text";
import { canvasNodeToAsset, findCanvasNodeAsset, requiresMaterializedCanvasAsset } from "@/lib/canvas/canvas-node-asset";
import { refreshResource, resourceIdFromStorageKey } from "@/services/api/resources";
import { ApiError } from "@/services/api/request";
import { useAssetStore, type Asset } from "@/stores/use-asset-store";
import { useCanvasStore, type CanvasProject } from "@/stores/canvas/use-canvas-store";
import { CanvasNodeType, type CanvasNodeData } from "@/types/canvas";
import type { TimelineDirectMedia } from "@/types/timeline";
import { getActiveUserScope } from "@/lib/user-scope";
import { isPublicCaseReference } from "@/lib/canvas/public-case-reference";

export type CanvasAssetRepairResult = {
    createdAssets: number;
    updatedProjects: number;
};

export function repairMissingCanvasAssets(projectIds?: Set<string>, partialAssets = false): CanvasAssetRepairResult {
    const assetStore = useAssetStore.getState();
    const canvasStore = useCanvasStore.getState();
    const assetIdByStorageKey = new Map<string, string>();
    const storageKeyByAssetId = new Map<string, string>();
    const knownAssetIds = new Set<string>();
    for (const asset of assetStore.assets) {
        knownAssetIds.add(asset.id);
        const storageKey = assetStorageKey(asset);
        if (storageKey) {
            storageKeyByAssetId.set(asset.id, storageKey);
            if (!assetIdByStorageKey.has(storageKey)) assetIdByStorageKey.set(storageKey, asset.id);
        }
    }

    let createdAssets = 0;
    let updatedProjects = 0;
    for (const project of canvasStore.projects) {
        if (projectIds && !projectIds.has(project.id)) continue;
        if (partialAssets) {
            for (const node of project.nodes) {
                if (node.metadata?.assetId) {
                    knownAssetIds.add(node.metadata.assetId);
                    // 节点声明只用于补充本地未加载的素材映射，不能覆盖素材库的真实绑定：
                    // 原地重生成的节点可能保留旧 assetId 却指向新资源，覆盖会让修复永远放行错误配对。
                    if (node.metadata.storageKey && !storageKeyByAssetId.has(node.metadata.assetId)) storageKeyByAssetId.set(node.metadata.assetId, node.metadata.storageKey);
                }
            }
            for (const clip of project.timeline?.clips || []) {
                if (clip.directMedia?.assetId) {
                    knownAssetIds.add(clip.directMedia.assetId);
                    if (clip.directMedia.storageKey && !storageKeyByAssetId.has(clip.directMedia.assetId)) storageKeyByAssetId.set(clip.directMedia.assetId, clip.directMedia.storageKey);
                }
            }
        }
        const repaired = repairProject(project, knownAssetIds, assetIdByStorageKey, storageKeyByAssetId, (node) => {
            const existing = findCanvasNodeAsset(useAssetStore.getState().assets, node, project.id);
            if (existing) return existing.id;
            // A generated resource belongs to its backend materialization. Saving
            // before it is loaded must never invent a canvas-upload replacement.
            if (requiresMaterializedCanvasAsset(node)) return undefined;
            const input = canvasNodeToAsset(node, { canvasId: project.id, source: "canvas-upload" });
            if (!input) return undefined;
            const assetId = useAssetStore.getState().addAsset(input);
            knownAssetIds.add(assetId);
            const storageKey = node.metadata?.storageKey;
            if (storageKey) {
                assetIdByStorageKey.set(storageKey, assetId);
                storageKeyByAssetId.set(assetId, storageKey);
            }
            createdAssets += 1;
            return assetId;
        });
        if (!repaired) continue;
        canvasStore.updateProject(project.id, repaired);
        updatedProjects += 1;
    }
    return { createdAssets, updatedProjects };
}

function repairProject(
    project: CanvasProject,
    knownAssetIds: Set<string>,
    assetIdByStorageKey: Map<string, string>,
    storageKeyByAssetId: Map<string, string>,
    createAsset: (node: CanvasNodeData) => string | undefined,
): Pick<CanvasProject, "nodes" | "timeline"> | null {
    let changed = false;
    const nodes = project.nodes.map((node) => {
        if (!isDurableMediaNode(node) || isPublicCaseReference(node)) return node;
        const assetId = matchingAssetId(node.metadata?.assetId, node.metadata?.storageKey, knownAssetIds, assetIdByStorageKey, storageKeyByAssetId) || createAsset(node);
        if (!assetId || node.metadata?.assetId === assetId) return node;
        changed = true;
        return { ...node, metadata: { ...node.metadata, assetId } };
    });
    const timeline = project.timeline
        ? {
              ...project.timeline,
              clips: project.timeline.clips.map((clip) => {
                  const media = clip.directMedia;
                  if (!media || media.kind === "text" || !mediaContent(media) || isPublicCaseReference(timelineMediaNode(media))) return clip;
                  const assetId = matchingAssetId(media.assetId, media.storageKey, knownAssetIds, assetIdByStorageKey, storageKeyByAssetId) || createAsset(timelineMediaNode(media));
                  if (!assetId || media.assetId === assetId) return clip;
                  changed = true;
                  return { ...clip, directMedia: { ...media, assetId } };
              }),
          }
        : project.timeline;
    return changed ? { nodes, timeline } : null;
}

function matchingAssetId(explicitId: string | undefined, storageKey: string | undefined, knownAssetIds: Set<string>, assetIdByStorageKey: Map<string, string>, storageKeyByAssetId: Map<string, string>) {
    if (explicitId && knownAssetIds.has(explicitId) && (!storageKey || storageKeyByAssetId.get(explicitId) === storageKey)) return explicitId;
    return storageKey ? assetIdByStorageKey.get(storageKey) : undefined;
}

function isDurableMediaNode(node: CanvasNodeData) {
    return isCanvasMediaNodeType(node) && Boolean(node.metadata?.content || node.metadata?.storageKey);
}

export function timelineMediaNode(media: TimelineDirectMedia): CanvasNodeData {
    const type = media.kind === "audio" ? CanvasNodeType.Audio : media.kind === "video" ? CanvasNodeType.Video : CanvasNodeType.Image;
    return {
        id: media.id,
        type,
        title: media.title,
        position: { x: 0, y: 0 },
        width: media.width || 320,
        height: media.height || (type === CanvasNodeType.Audio ? 120 : 240),
        metadata: {
            content: mediaContent(media),
            storageKey: media.storageKey,
            naturalWidth: media.width,
            naturalHeight: media.height,
            durationMs: media.durationMs,
            bytes: media.bytes,
            mimeType: media.mimeType,
        },
    };
}

function mediaContent(media: TimelineDirectMedia) {
    return media.url || media.dataUrl || media.content || "";
}

function assetStorageKey(asset: Asset) {
    return asset.kind === "text" || asset.kind === "entity" ? undefined : asset.data.storageKey;
}

export type CanvasVideoPreviewRepairResult = {
    clearedPreviews: number;
    updatedProjects: number;
};

/** 仅清理确认缺失的派生封面；网络/鉴权失败必须上抛，不能当作不存在。 */
export async function repairMissingCanvasVideoPreviews(projectIds?: Set<string>, lookup = refreshResource): Promise<CanvasVideoPreviewRepairResult> {
    const scope = getActiveUserScope();
    const projects = useCanvasStore.getState().projects.filter((project) => !projectIds || projectIds.has(project.id));
    const previewResourceIds = new Set<string>();
    for (const project of projects) {
        for (const node of project.nodes) {
            for (const id of previewResourceIDs(node)) previewResourceIds.add(id);
        }
    }
    const invalidIds = new Set<string>();
    const ids = [...previewResourceIds];
    for (let offset = 0; offset < ids.length; offset += 8) {
        await Promise.all(ids.slice(offset, offset + 8).map(async (id) => {
            try {
                const resource = await lookup(id);
                // Pending previews are still being produced; only terminal states are broken.
                if (resource.status === "failed" || resource.status === "deleted") invalidIds.add(id);
            } catch (error) {
                if (error instanceof ApiError && error.status === 404) invalidIds.add(id);
                else throw error;
            }
        }));
    }
    if (getActiveUserScope() !== scope) throw new Error(currentLocaleText("canvasExtra.cloudSync.repairAccountSwitched"));
    if (!invalidIds.size) return { clearedPreviews: 0, updatedProjects: 0 };

    let clearedPreviews = 0;
    let updatedProjects = 0;
    const canvasStore = useCanvasStore.getState();
    // Re-read live projects after I/O; never replace edits made while diagnosing.
    for (const project of canvasStore.projects.filter((item) => !projectIds || projectIds.has(item.id))) {
        let changed = false;
        const nodes = project.nodes.map((node) => {
            if (!previewResourceIDs(node).some((id) => invalidIds.has(id)) || !node.metadata?.videoPreview) return node;
            const { videoPreview: _videoPreview, ...metadata } = node.metadata;
            changed = true;
            clearedPreviews += 1;
            return { ...node, metadata };
        });
        if (!changed) continue;
        canvasStore.updateProject(project.id, { nodes });
        updatedProjects += 1;
    }
    return { clearedPreviews, updatedProjects };
}

function previewResourceIDs(node: CanvasNodeData): string[] {
    const preview = node.metadata?.videoPreview;
    if (!preview) return [];
    return Object.entries(preview).flatMap(([key, value]) => {
        if (!["storageKey", "url", "dataUrl", "content"].includes(key) || typeof value !== "string") return [];
        const id = resourceIdFromStorageKey(value) || value.match(/(?:^|\/)api\/resources\/([A-Za-z0-9_-]+)\/file(?:[?#]|$)/)?.[1];
        return id ? [id] : [];
    });
}

function isCanvasMediaNodeType(node: CanvasNodeData) {
    return node.type === CanvasNodeType.Image || node.type === CanvasNodeType.Video || node.type === CanvasNodeType.Audio;
}
