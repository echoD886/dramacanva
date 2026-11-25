import { currentLocaleText as upstreamText } from "@/i18n/current-locale-text";
import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { App } from "antd";
import { saveAs } from "file-saver";
import { mediaDownloadFilename } from "@/lib/image-mime";
import { getResourceBlob, isResourceUrl, resourceIdFromStorageKey } from "@/services/api/resources";
import { getActiveUserScope } from "@/lib/user-scope";
import { currentLocaleText } from "@/i18n/current-locale-text";

import { NODE_DEFAULT_SIZE } from "@/constant/canvas";
import { imageSettingKeys } from "@/lib/canvas/canvas-image-defaults";
import { FOLDER_COLLAPSED_HEIGHT, FOLDER_COLLAPSED_WIDTH, FRAME_COLLAPSED_HEIGHT, FRAME_COLLAPSED_WIDTH, getFrameChildIds, isCanvasFolderNode, isFrameNode } from "@/lib/canvas/canvas-frame";
import { buildCanvasMediaDownloadFileName, downloadCanvasMediaSelection } from "@/lib/canvas/canvas-media-download";
import { writeCanvasNodePrompt } from "@/lib/canvas/canvas-node-prompt";
import { applyBatchPrimaryImage, applyNodeConfigPatch } from "@/lib/canvas/canvas-project-domain";
import { resetGenerationTaskMetadata } from "@/lib/canvas/canvas-project-generation";
import { CONTENT_MODERATION_ERROR_CODE, isContentModerationError } from "@/lib/generation-error";
import { adjustedOutputField, modelCapabilityConfigFor } from "@/lib/model-capabilities";
import type { AiConfig } from "@/stores/use-config-store";
import { ensureCanvasNodeAsset } from "@/services/project-asset-sync";
import { captureAdoptionIdentity, reportObservedAdoption } from "@/services/adoption-observation";
import { CanvasNodeType, type CanvasFolderStyle, type CanvasFolderTheme, type CanvasNodeData, type CanvasNodeMetadata, type Position } from "@/types/canvas";

type UseCanvasNodeEditorOptions = {
    canvasId: string;
    canvasTitle: string;
    domainProjectId?: string;
    config: AiConfig;
    nodesRef: { current: CanvasNodeData[] };
    setNodes: Dispatch<SetStateAction<CanvasNodeData[]>>;
    setSelectedNodeIds: Dispatch<SetStateAction<Set<string>>>;
    setSelectedConnectionId: Dispatch<SetStateAction<string | null>>;
    setDialogNodeId: Dispatch<SetStateAction<string | null>>;
    setToolbarNodeId: Dispatch<SetStateAction<string | null>>;
    setHoveredNodeId: Dispatch<SetStateAction<string | null>>;
};

export function useCanvasNodeEditor({ canvasId, canvasTitle, domainProjectId, config, nodesRef, setNodes, setSelectedNodeIds, setSelectedConnectionId, setDialogNodeId, setToolbarNodeId, setHoveredNodeId }: UseCanvasNodeEditorOptions) {
    const { message } = App.useApp();
    const queryClient = useQueryClient();
    const [collapsingBatchIds, setCollapsingBatchIds] = useState<Set<string>>(new Set());
    const [openingBatchIds, setOpeningBatchIds] = useState<Set<string>>(new Set());
    const batchMotionTimers = useRef(new Map<string, number>());
    useEffect(
        () => () => {
            batchMotionTimers.current.forEach((timer) => window.clearTimeout(timer));
        },
        [],
    );

    const handleNodeResize = useCallback(
        (nodeId: string, width: number, height: number, position?: Position) => {
            setNodes((current) => {
                let changed = false;
                const next = current.map((node) => {
                    if (node.id !== nodeId || node.metadata?.locked) return node;
                    const nextPosition = position || node.position;
                    if (node.width === width && node.height === height && node.position.x === nextPosition.x && node.position.y === nextPosition.y) return node;
                    changed = true;
                    // 打上「用户手动定过尺寸」标记：图片按真实比例自动适配时要避让它，
                    // 否则每次图片重新加载都会把用户拉过的尺寸改回去。
                    const resized = { ...node, width, height, position: nextPosition, metadata: { ...node.metadata, manualSize: true } };
                    if (!isFrameNode(node) || node.metadata?.frame?.collapsed) return resized;
                    return { ...resized, metadata: { ...resized.metadata, frame: { collapsed: false, expandedWidth: width, expandedHeight: height } } };
                });
                return changed ? next : current;
            });
        },
        [setNodes],
    );

    const toggleFrameCollapsed = useCallback(
        (nodeId: string) => {
            const frame = nodesRef.current.find((node) => node.id === nodeId && isFrameNode(node));
            if (!frame) return;
            const collapsed = Boolean(frame.metadata?.frame?.collapsed);
            const childIds = getFrameChildIds(nodeId, nodesRef.current);
            setNodes((current) =>
                current.map((node) => {
                    if (node.id !== nodeId) return node;
                    const frameState = node.metadata?.frame;
                    const folder = isCanvasFolderNode(node);
                    return collapsed
                        ? {
                              ...node,
                              width: frameState?.expandedWidth || NODE_DEFAULT_SIZE[CanvasNodeType.Frame].width,
                              height: frameState?.expandedHeight || NODE_DEFAULT_SIZE[CanvasNodeType.Frame].height,
                              metadata: {
                                  ...node.metadata,
                                  frame: { collapsed: false, expandedWidth: frameState?.expandedWidth || NODE_DEFAULT_SIZE[CanvasNodeType.Frame].width, expandedHeight: frameState?.expandedHeight || NODE_DEFAULT_SIZE[CanvasNodeType.Frame].height },
                              },
                          }
                        : {
                              ...node,
                              width: folder ? FOLDER_COLLAPSED_WIDTH : FRAME_COLLAPSED_WIDTH,
                              height: folder ? FOLDER_COLLAPSED_HEIGHT : FRAME_COLLAPSED_HEIGHT,
                              metadata: { ...node.metadata, frame: { collapsed: true, expandedWidth: node.width, expandedHeight: node.height } },
                          };
                }),
            );
            setSelectedNodeIds(new Set([nodeId]));
            setSelectedConnectionId(null);
            setDialogNodeId((current) => (current && childIds.has(current) ? null : current));
            setToolbarNodeId(null);
            setHoveredNodeId(null);
        },
        [nodesRef, setDialogNodeId, setHoveredNodeId, setNodes, setSelectedConnectionId, setSelectedNodeIds, setToolbarNodeId],
    );

    const handleNodeTitleChange = useCallback(
        (nodeId: string, title: string) => {
            setNodes((current) =>
                current.map((node) => {
                    if (node.id !== nodeId) return node;
                    const source = node.metadata?.importSource;
                    return { ...node, title, metadata: { ...node.metadata, titleEdited: true, ...(source?.provider === "libtv" ? { importSource: { ...source, titleEdited: true } } : {}) } };
                }),
            );
        },
        [setNodes],
    );

    const handleFolderStyleChange = useCallback(
        (nodeId: string, style: CanvasFolderStyle) => {
            setNodes((current) =>
                current.map((node) => {
                    if (node.id !== nodeId || !isCanvasFolderNode(node)) return node;
                    const folder = node.metadata!.folder!;
                    return { ...node, metadata: { ...node.metadata, folder: { ...folder, style, createdAt: folder.createdAt || new Date().toISOString() } } };
                }),
            );
        },
        [setNodes],
    );

    const handleFolderThemeChange = useCallback(
        (nodeId: string, theme: CanvasFolderTheme) => {
            setNodes((current) =>
                current.map((node) => {
                    if (node.id !== nodeId || !isCanvasFolderNode(node)) return node;
                    const folder = node.metadata!.folder!;
                    return { ...node, metadata: { ...node.metadata, folder: { ...folder, theme, themeCover: undefined, createdAt: folder.createdAt || new Date().toISOString() } } };
                }),
            );
        },
        [setNodes],
    );

    const toggleNodeFreeResize = useCallback(
        (nodeId: string) => {
            setNodes((current) =>
                current.map((node) => {
                    if (node.id !== nodeId) return node;
                    const freeResize = !node.metadata?.freeResize;
                    if (freeResize || node.type !== CanvasNodeType.Image) return { ...node, metadata: { ...node.metadata, freeResize } };
                    const ratio = (node.metadata?.naturalWidth || node.width) / (node.metadata?.naturalHeight || node.height || 1);
                    const height = node.width / ratio;
                    return { ...node, height, position: { x: node.position.x, y: node.position.y + node.height / 2 - height / 2 }, metadata: { ...node.metadata, freeResize } };
                }),
            );
        },
        [setNodes],
    );

    const handleNodeContentChange = useCallback(
        (nodeId: string, content: string) => {
            setNodes((current) => current.map((node) => (node.id === nodeId ? { ...node, metadata: { ...node.metadata, content, richText: undefined } } : node)));
        },
        [setNodes],
    );

    const toggleBatchExpanded = useCallback(
        (nodeId: string) => {
            const root = nodesRef.current.find((node) => node.id === nodeId);
            if (!root?.metadata?.isBatchRoot) return;
            const isExpanded = Boolean(root.metadata.imageBatchExpanded);
            window.clearTimeout(batchMotionTimers.current.get(nodeId));
            const updateMotionState = isExpanded ? setCollapsingBatchIds : setOpeningBatchIds;
            const clearMotionState = isExpanded ? setOpeningBatchIds : setCollapsingBatchIds;
            clearMotionState((current) => {
                const next = new Set(current);
                next.delete(nodeId);
                return next;
            });
            updateMotionState((current) => new Set(current).add(nodeId));
            batchMotionTimers.current.set(
                nodeId,
                window.setTimeout(
                    () => {
                        batchMotionTimers.current.delete(nodeId);
                        updateMotionState((current) => {
                            const next = new Set(current);
                            next.delete(nodeId);
                            return next;
                        });
                    },
                    isExpanded ? 320 : 445 + (root.metadata.batchChildIds?.length || 1) * 24,
                ),
            );
            setNodes((current) => current.map((node) => (node.id === nodeId ? { ...node, metadata: { ...node.metadata, imageBatchExpanded: !node.metadata?.imageBatchExpanded } } : node)));
        },
        [nodesRef, setNodes],
    );

    const setBatchPrimary = useCallback(
        (child: CanvasNodeData) => {
            const rootId = child.metadata?.batchRootId;
            if (!rootId || !child.metadata?.content) return;
            setNodes((current) => current.map((node) => (node.id === rootId ? applyBatchPrimaryImage(node, child) : node)));
        },
        [setNodes],
    );

    const handleNodePromptChange = useCallback(
        (nodeId: string, prompt: string) => {
            setNodes((current) =>
                current.map((node) => {
                    if (node.id !== nodeId) return node;
                    const previousPrompt = node.metadata?.composerContent ?? node.metadata?.prompt ?? "";
                    const promptChanged = prompt !== previousPrompt;
                    const moderationFailure = node.metadata?.generationErrorCode === CONTENT_MODERATION_ERROR_CODE || isContentModerationError(node.metadata);
                    const metadata = moderationFailure && promptChanged ? resetGenerationTaskMetadata(node.metadata, node.metadata?.content ? "success" : "idle") : node.metadata;
                    return writeCanvasNodePrompt(node, prompt, {
                        metadata,
                        clearPromptTemplate: promptChanged && Boolean(metadata?.promptTemplateOperation),
                    });
                }),
            );
        },
        [setNodes],
    );

    const handleConfigNodeChange = useCallback(
        (nodeId: string, patch: Partial<CanvasNodeMetadata>) => {
            const capabilities = patch.model ? modelCapabilityConfigFor(config, patch.model) : undefined;
            if (capabilities) {
                const node = nodesRef.current.find((item) => item.id === nodeId);
                const previous = node?.metadata;
                if (node && previous && previous.model !== patch.model && (node.type === CanvasNodeType.Image || node.type === CanvasNodeType.Video)) {
                    const next = applyNodeConfigPatch(node, patch, capabilities).metadata;
                    const field = adjustedOutputField({ ...previous, resolution: previous.vquality }, { ...next, resolution: next?.vquality });
                    if (field) message.info(currentLocaleText("generationFailure.fieldHint", { field: currentLocaleText(field) }));
                }
            }
            setNodes((current) => {
                const next = current.map((node) => {
                    if (node.id !== nodeId) return node;
                    const next = applyNodeConfigPatch(node, patch, capabilities);
                    return node.type === CanvasNodeType.Image && imageSettingKeys.some((key) => key in patch) ? { ...next, metadata: { ...next.metadata, imageSettingsUpdatedAt: Date.now() } } : next;
                });
                // 生成入口读取 nodesRef；同步写入，避免刚修改工作流比例就立即生成时仍提交旧值。
                nodesRef.current = next;
                return next;
            });
            if (!patch.assetCategory) return;
            const node = nodesRef.current.find((item) => item.id === nodeId);
            if (!node?.metadata?.content?.trim()) return;
            const updatedNode = applyNodeConfigPatch(node, patch);
            void ensureCanvasNodeAsset({ canvasId, domainProjectId, node: updatedNode, source: "canvas-manual", category: patch.assetCategory })
                .then(async (result) => {
                    setNodes((current) => current.map((item) => (item.id === nodeId ? { ...item, metadata: { ...item.metadata, assetId: result.assetId } } : item)));
                    if (domainProjectId) await queryClient.invalidateQueries({ queryKey: ["project", domainProjectId] });
                    message.success(currentLocaleText("canvasExtra.editor.assetCategoryUpdated"));
                })
                .catch((error) => message.error(error instanceof Error ? error.message : currentLocaleText("canvasExtra.editor.assetCategoryUpdateFailed")));
        },
        [canvasId, config, domainProjectId, message, nodesRef, queryClient, setNodes],
    );

    const downloadNodeImage = useCallback(
        async (node: CanvasNodeData) => {
            if (node.metadata?.imageLayerGroup?.compositeStatus && node.metadata.imageLayerGroup.compositeStatus !== "ready") {
                message.warning(upstreamText("upstream.v165.message511"));
                return;
            }
            if ((node.type !== CanvasNodeType.Image && node.type !== CanvasNodeType.Video && node.type !== CanvasNodeType.Audio) || !node.metadata?.content) return;
            const resourceId = resourceIdFromStorageKey(node.metadata.storageKey);
            try {
                const file = resourceId ? await getResourceBlob(`resource:${resourceId}`) : node.metadata.content;
                if (!file) throw new Error(currentLocaleText("canvasExtra.versions.downloadFailed"));
                const downloadNode = file instanceof Blob ? { ...node, metadata: { ...node.metadata, mimeType: file.type } } : node;
                const filename = buildCanvasMediaDownloadFileName(canvasTitle, downloadNode);
                saveAs(file, file instanceof Blob ? await mediaDownloadFilename(file, filename) : filename);
            } catch (error) {
                message.error(currentLocaleText("canvasExtra.versions.downloadFailed"));
            }
        },
        [canvasTitle, message],
    );

    const downloadNodesMedia = useCallback(
        async (nodes: CanvasNodeData[]) => {
            const now = new Date();
            const scope = getActiveUserScope();
            const result = await downloadCanvasMediaSelection(nodes, async (node) => {
                if (getActiveUserScope() !== scope) throw new Error("Account changed");
                const key = node.metadata?.storageKey;
                let file: Blob | null = null;
                if (resourceIdFromStorageKey(key)) file = await getResourceBlob(key!);
                else {
                    if (key) file = node.type === CanvasNodeType.Image ? await import("@/services/image-storage").then((module) => module.getImageBlob(key)) : await import("@/services/file-storage").then((module) => module.getMediaBlob(key));
                    if (!file && node.metadata?.content) {
                        const url = node.metadata.content;
                        const response = await fetch(url, { credentials: isResourceUrl(url) ? "include" : "same-origin" });
                        if (!response.ok) throw new Error("Media unavailable");
                        file = await response.blob();
                    }
                }
                if (!file) throw new Error("Media unavailable");
                if (getActiveUserScope() !== scope) throw new Error("Account changed");
                const downloadNode = file instanceof Blob ? { ...node, metadata: { ...node.metadata, mimeType: file.type } } : node;
                saveAs(file, await mediaDownloadFilename(file, buildCanvasMediaDownloadFileName(canvasTitle, downloadNode, now)));
            });
            if (!result.started && !result.failed) message.warning(currentLocaleText("upstreamSix.downloadEmpty"));
            else {
                const skipped = result.skipped ? currentLocaleText("upstreamSix.downloadSkipped", { v0: result.skipped }) : "";
                const text = result.failed
                    ? currentLocaleText("upstreamSix.downloadFailed", { v0: result.started, v1: result.failed, v2: currentLocaleText("canvasExtra.versions.downloadFailed"), v3: skipped })
                    : currentLocaleText("upstreamSix.downloadStarted", { v0: result.started, v1: skipped });
                if (result.failed) message.warning(text);
                else message.success(text);
            }
        },
        [canvasTitle, message],
    );

    const saveNodeAsset = useCallback(
        async (node: CanvasNodeData) => {
            if (node.metadata?.imageLayerGroup?.compositeStatus && node.metadata.imageLayerGroup.compositeStatus !== "ready") {
                message.warning(upstreamText("upstream.v165.message512"));
                return;
            }
            if (node.type !== CanvasNodeType.Text && node.type !== CanvasNodeType.Image && node.type !== CanvasNodeType.Video && node.type !== CanvasNodeType.Audio) return message.error(currentLocaleText("canvasExtra.editor.cannotSaveAsAsset"));
            if (!node.metadata?.content?.trim()) return message.error(currentLocaleText("canvasExtra.editor.nothingToSave"));
            try {
                const adoptionIdentity = captureAdoptionIdentity();
                const result = await ensureCanvasNodeAsset({ canvasId, domainProjectId, node, source: "canvas-manual" });
                void reportObservedAdoption(adoptionIdentity, [node.metadata?.taskId], "manual_asset_save");
                setNodes((current) => current.map((item) => (item.id === node.id ? { ...item, metadata: { ...item.metadata, assetId: result.assetId } } : item)));
                if (domainProjectId) await queryClient.invalidateQueries({ queryKey: ["project", domainProjectId] });
                message.success(currentLocaleText(result.linkedToProject ? "canvasExtra.editor.addedToProjectAssets" : "canvasExtra.editor.addedToMyAssets"));
            } catch (error) {
                message.error(error instanceof Error ? error.message : currentLocaleText("canvasExtra.editor.assetSaveFailed"));
            }
        },
        [canvasId, domainProjectId, message, queryClient, setNodes],
    );

    const handleFontSizeChange = useCallback(
        (nodeId: string, fontSize: number) => {
            setNodes((current) => current.map((node) => (node.id === nodeId ? { ...node, metadata: { ...node.metadata, fontSize } } : node)));
        },
        [setNodes],
    );

    return {
        collapsingBatchIds,
        downloadNodeImage,
        downloadNodesMedia,
        handleConfigNodeChange,
        handleFolderStyleChange,
        handleFolderThemeChange,
        handleFontSizeChange,
        handleNodeContentChange,
        handleNodePromptChange,
        handleNodeResize,
        handleNodeTitleChange,
        openingBatchIds,
        saveNodeAsset,
        setBatchPrimary,
        toggleBatchExpanded,
        toggleFrameCollapsed,
        toggleNodeFreeResize,
    };
}
