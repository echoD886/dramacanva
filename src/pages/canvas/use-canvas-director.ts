import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { App } from "antd";
import { nanoid } from "nanoid";
import { currentLocaleText as t } from "@/i18n/current-locale-text";
import { localizedConnectionError } from "@/i18n/connection-error";
import { resolveAppLocale } from "@/i18n/app-locale";
import { type DirectorPreviewRequest } from "@/lib/canvas/director/director-preview";

import { imageMetadata, videoMetadata } from "@/lib/canvas/canvas-generation-task-sync";
import { directorOutputPosition, findAvailableGenerationGroupPosition } from "@/lib/canvas/canvas-generation-layout";
import { fitNodeSize } from "@/lib/canvas/canvas-node-size";
import { createCanvasNode } from "@/lib/canvas/canvas-project-domain";
import { createDirectorSceneFromTemplate, type DirectorTemplateId } from "@/lib/canvas/director/director-templates";
import { mergeDirectorOutputPreview, upsertDirectorSceneById } from "@/lib/canvas/director/director-session";
import { uploadImage, setImageBlob, deleteStoredImages } from "@/services/image-storage";
import { getActiveUserScope } from "@/lib/user-scope";
import { uploadMediaFile, setMediaBlob, discardLocalMedia } from "@/services/file-storage";
import { computePrevisSequenceFingerprint, currentDirectorPrevis, directorPrevisFingerprint } from "@/lib/canvas/director/director-previs-cache";
import { directorCardSize } from "@/lib/canvas/director/director-card-size";
import type { DirectorCardEditTarget } from "@/lib/canvas/director/director-node-card";
import { compileDirectorCameraDescription } from "@/lib/canvas/director/director-camera-description";
import { ensureCanvasNodeAsset } from "@/services/project-asset-sync";
import { useCanvasStore } from "@/stores/canvas/use-canvas-store";
import { CanvasNodeType, type CanvasConnection, type CanvasNodeData, type CanvasNodeMetadata, type Position } from "@/types/canvas";
import type { DirectorScene, DirectorSceneOutput } from "@/types/director";
import { currentDirectorThumbnail, WORLD_ENGINE_THUMBNAIL_RENDERER } from "@/lib/canvas/director/director-thumbnail";
import type { PrevisCanvasExport } from "@/types/previs";
import type { DirectorShot } from "@/types/director";
import { acknowledgeDirectorWriteback, directorBoundReferenceIds, directorSceneForShot, directorRowFingerprint, savedWorldEngineShot } from "@/lib/canvas/director/director-shot-state";
import type { AiConfig } from "@/stores/use-config-store";
import { connectDirectorDownstream, directorConnectionTargets, directorSourceTarget, migrateDirectorOutputConnections, type DirectorConnectionTarget } from "@/lib/canvas/director/director-downstream";

type UseCanvasDirectorOptions = {
    projectId: string;
    domainProjectId?: string;
    config: AiConfig;
    directorNodeId: string | null;
    directorScenes: DirectorScene[];
    nodesRef: { current: CanvasNodeData[] };
    connectionsRef: { current: CanvasConnection[] };
    getCanvasCenter: () => Position;
    cardViewport?: { availableHeight: number; scale: number; controlsHeight?: number };
    setNodes: Dispatch<SetStateAction<CanvasNodeData[]>>;
    setConnections: Dispatch<SetStateAction<CanvasConnection[]>>;
    setSelectedNodeIds: Dispatch<SetStateAction<Set<string>>>;
    setSelectedConnectionId: Dispatch<SetStateAction<string | null>>;
    setDirectorNodeId: Dispatch<SetStateAction<string | null>>;
    updateProject: (projectId: string, patch: { directorScenes?: DirectorScene[]; nodes?: CanvasNodeData[] }) => void;
};

const NODE_STATUS_IDLE = "idle" as const;
const pendingPrevis = new Set<string>();
/** Tracks shots whose background still-frame capture is in flight; keyed by scope:project:node:fingerprint. */
const pendingThumbnails = new Set<string>();

/**
 * 项目真实内存权威在 useCanvasStore.getState().projects；
 * 闭包里的 directorScenes 只作为 store 尚未就绪时的兜底。
 */
function currentDirectorScenes(projectId: string, fallback: DirectorScene[]) {
    const project = useCanvasStore.getState().projects.find((item) => item.id === projectId);
    return project?.directorScenes ?? fallback;
}
export function useCanvasDirector({
    projectId,
    domainProjectId,
    config,
    directorNodeId,
    directorScenes,
    nodesRef,
    connectionsRef,
    getCanvasCenter,
    cardViewport,
    setNodes,
    setConnections,
    setSelectedNodeIds,
    setSelectedConnectionId,
    setDirectorNodeId,
    updateProject,
}: UseCanvasDirectorOptions) {
    const { message } = App.useApp();
    const projectIdRef = useRef<string | null>(projectId);
    projectIdRef.current = projectId;
    const directorNodeIdRef = useRef(directorNodeId);
    directorNodeIdRef.current = directorNodeId;

    useEffect(() => {
        const migrated = migrateDirectorOutputConnections(nodesRef.current, connectionsRef.current);
        if (migrated.some((edge, index) => edge !== connectionsRef.current[index])) {
            connectionsRef.current = migrated;
            setConnections(migrated);
        }
    }, [projectId, directorScenes, nodesRef, connectionsRef, setConnections]);

    const connectDirector = useCallback(
        (sourceId: string, target: DirectorConnectionTarget) => {
            let next;
            try {
                const source = nodesRef.current.find((node) => node.id === sourceId);
                const scene = currentDirectorScenes(projectId, directorScenes).find((item) => item.id === source?.metadata?.directorSceneId);
                next = connectDirectorDownstream(nodesRef.current, connectionsRef.current, sourceId, target, config, scene);
            } catch (error) {
                message.warning(localizedConnectionError(error instanceof Error ? error.message : String(error), t, (value) => new Intl.NumberFormat(resolveAppLocale()).format(value)));
                return;
            }
            const scenes = currentDirectorScenes(projectId, directorScenes).map((scene) => acknowledgeDirectorWriteback(scene, nodesRef.current, next.nodes));
            updateProject(projectId, { directorScenes: scenes });
            nodesRef.current = next.nodes;
            connectionsRef.current = next.connections;
            setNodes(next.nodes);
            setConnections(next.connections);
        },
        [nodesRef, connectionsRef, setNodes, setConnections, config, message, projectId, directorScenes, updateProject],
    );

    useEffect(() => {
        projectIdRef.current = projectId;
        return () => {
            if (projectIdRef.current === projectId) projectIdRef.current = null;
        };
    }, [projectId]);

    /**
     * 新建镜头。templateId 由调用方（模板选择弹窗）显式给出 —— 这里不设默认模板，
     * 否则又会回到「无条件塞一个默认演员」的老问题。
     */
    const createDirectorShot = useCallback(
        (templateId: DirectorTemplateId, position?: Position, generated?: DirectorScene) => {
            const shots = nodesRef.current.filter((node) => node.metadata?.workflowKind === "shot");
            const shotIndex = Math.max(0, ...shots.map((node) => node.metadata?.shotIndex || 0)) + 1;
            const shotTitle = t("nodeSearch.shot", { number: shotIndex });
            let scene = generated || createDirectorSceneFromTemplate(templateId, shotTitle);
            const shot = scene.shots[0];
            scene = { ...scene, shots: [{ ...shot, name: shotTitle }, ...scene.shots.slice(1)] };
            const node = createCanvasNode(CanvasNodeType.Video, position || getCanvasCenter(), {
                workflowKind: "shot",
                workflowTitle: shotTitle,
                shotIndex,
                generationMode: "video",
                videoEditOperation: "text_to_video",
                status: NODE_STATUS_IDLE,
                composerContent: shot.prompt,
                prompt: shot.prompt,
                directorSceneId: scene.id,
                directorShotId: shot.id,
                directorCharacterNodeIds: directorBoundReferenceIds(scene),
                referenceAssetNodeIds: directorBoundReferenceIds(scene),
            });
            node.title = shotTitle;
            Object.assign(node, directorCardSize(shot.aspectRatio, cardViewport));
            const nextNodes = [...nodesRef.current, node];
            nodesRef.current = nextNodes;
            setNodes(nextNodes);
            setSelectedNodeIds(new Set([node.id]));
            setSelectedConnectionId(null);
            updateProject(projectId, { nodes: nextNodes, directorScenes: upsertDirectorSceneById(currentDirectorScenes(projectId, directorScenes), scene) });
            message.success(t("canvasExtra.directorWB.nodeCreated"));
        },
        [cardViewport, directorScenes, getCanvasCenter, message, nodesRef, projectId, setNodes, setSelectedConnectionId, setSelectedNodeIds, updateProject],
    );

    const openDirectorWorkbench = useCallback(
        async (nodeId: string, entry?: DirectorCardEditTarget) => {
            const { useDirectorWorkbenchStore } = await import("@/stores/canvas/use-director-workbench-store");
            if (projectIdRef.current !== projectId) return;
            const node = nodesRef.current.find((item) => item.id === nodeId);
            if (!node || node.metadata?.workflowKind !== "shot") return;
            const migrated = migrateDirectorOutputConnections(nodesRef.current, connectionsRef.current);
            if (migrated.some((edge, index) => edge !== connectionsRef.current[index])) {
                connectionsRef.current = migrated;
                setConnections(migrated);
            }
            let scene = currentDirectorScenes(projectId, directorScenes).find((item) => item.id === node.metadata?.directorSceneId);
            const sourceEdge = connectionsRef.current.find((edge) => edge.toNodeId === nodeId && edge.fromHandleId?.startsWith("row:"));
            const script = nodesRef.current.find((item) => item.id === (node.metadata?.directorSourceStoryboardNodeId || sourceEdge?.fromNodeId) || item.metadata?.storyboard?.rows.some((row) => row.videoNodeId === nodeId));
            const row = script?.metadata?.storyboard?.rows.find((row) => row.id === (node.metadata?.directorSourceStoryboardRowId || sourceEdge?.fromHandleId?.slice(4)) || row.videoNodeId === nodeId);
            if (!scene) {
                scene =
                    script && row && !script.metadata?.locked
                        ? (await import("@/lib/canvas/director/director-storyboard")).deriveDirectorStoryboardShot(script, row, nodesRef.current, [], undefined, connectionsRef.current).scene
                        : (await import("@/lib/canvas/director/director-description")).deriveDirectorDescription(node.metadata?.composerContent || node.metadata?.prompt || node.metadata?.workflowDescription || "", nodesRef.current);
                const shot = scene.shots[0];
                scene = { ...scene, shots: [{ ...shot, name: node.metadata?.workflowTitle || node.title || shot.name }] };
                const directorSceneId = scene.id;
                const directorShotId = shot.id;
                setNodes((current) => current.map((item) => (item.id === nodeId ? { ...item, metadata: { ...item.metadata, directorSceneId, directorShotId } } : item)));
                updateProject(projectId, { directorScenes: upsertDirectorSceneById(currentDirectorScenes(projectId, directorScenes), scene) });
            } else if (script && row && !script.metadata?.locked && !savedWorldEngineShot(scene, node.metadata?.directorShotId || scene.activeShotId) && !scene.objects.some((object) => object.kind === "actor")) {
                // Retry the failed source derivation, preserving this scene and shot's identity.
                const repaired = (await import("@/lib/canvas/director/director-storyboard")).deriveDirectorStoryboardShot(script, row, nodesRef.current, [scene], node.metadata?.directorShotId || scene.activeShotId, connectionsRef.current).scene;
                if (repaired.objects.some((object) => object.kind === "actor")) {
                    scene = repaired;
                    updateProject(projectId, { directorScenes: upsertDirectorSceneById(currentDirectorScenes(projectId, directorScenes), scene) });
                }
            }
            if (entry && entry.sceneId !== scene.id) return;
            if (entry && scene.previs && scene.previs.segments.some((segment) => !scene!.shots.some((shot) => shot.id === (segment.shotId ?? segment.legacyShotId)))) {
                const compiled = (await import("@/lib/canvas/director/director-sequence-compiler")).compilePrevisToDirectorShots(scene, scene.previs);
                if (!compiled.scene.shots.some((shot) => shot.id === entry.shotId)) {
                    message.error(t("directorNode.editUnavailable"));
                    return;
                }
                scene = compiled.scene;
            }
            if (entry && !scene.shots.some((shot) => shot.id === entry.shotId)) return;
            const selectedShotId = entry?.shotId || node.metadata?.directorShotId;
            if (selectedShotId && scene.shots.some((shot) => shot.id === selectedShotId) && (entry || scene.activeShotId !== selectedShotId)) {
                // 预演段以全局舞台和动作求值，编译镜头的局部轨道不能覆盖其源数据。
                const selected = scene.previs?.segments.some((segment) => !segment.legacyShotId) ? { ...scene, activeShotId: selectedShotId } : directorSceneForShot(scene, selectedShotId);
                updateProject(projectId, { directorScenes: upsertDirectorSceneById(currentDirectorScenes(projectId, directorScenes), selected) });
            }
            useDirectorWorkbenchStore.getState().prepareOpen(entry ?? null);
            setDirectorNodeId(nodeId);
        },
        [directorScenes, nodesRef, connectionsRef, message, projectId, setConnections, setDirectorNodeId, setNodes, updateProject],
    );

    const createStoryboardPrevis = useCallback(
        async (scriptId: string, rowId: string, sync = false, open = true) => {
            const { deriveDirectorStoryboardShot } = await import("@/lib/canvas/director/director-storyboard");
            if (projectIdRef.current !== projectId) return;
            const script = nodesRef.current.find((node) => node.id === scriptId);
            const row = script?.metadata?.storyboard?.rows.find((row) => row.id === rowId);
            if (!script || !row || script.metadata?.locked) return;
            const existing = nodesRef.current.find((node) => node.metadata?.directorSourceStoryboardNodeId === scriptId && node.metadata?.directorSourceStoryboardRowId === rowId);
            if (existing && !sync) {
                if (open) await openDirectorWorkbench(existing.id);
                return existing.id;
            }
            const { scene, shot } = deriveDirectorStoryboardShot(script, row, nodesRef.current, currentDirectorScenes(projectId, directorScenes), sync ? existing?.metadata?.directorShotId : undefined, connectionsRef.current);
            const node = existing ? { ...existing } : createCanvasNode(CanvasNodeType.Video, { x: script.position.x + script.width + 80, y: script.position.y + (row.shotNumber - 1) * 360 });
            node.title = shot.name;
            Object.assign(node, directorCardSize(shot.aspectRatio, cardViewport));
            if (!existing) node.position = findAvailableGenerationGroupPosition(nodesRef.current, node.position, node);
            node.metadata = {
                ...node.metadata,
                workflowKind: "shot",
                workflowTitle: shot.name,
                directorSceneId: scene.id,
                directorShotId: shot.id,
                directorSourceStoryboardNodeId: scriptId,
                directorSourceStoryboardRowId: rowId,
                ...(script.metadata?.dramaProjection ? { dramaProjection: { ...script.metadata.dramaProjection, shotId: rowId, slot: "world-source" } } : {}),
                prompt: shot.prompt,
                referenceAssetNodeIds: [...new Set([...directorBoundReferenceIds(scene), ...row.assetBindings.map((binding) => binding.nodeId)])],
                directorCharacterNodeIds: directorBoundReferenceIds(scene),
            };
            const next = existing ? nodesRef.current.map((n) => (n.id === node.id ? node : n)) : [...nodesRef.current, node];
            nodesRef.current = next;
            setNodes(next);
            if (!connectionsRef.current.some((edge) => edge.fromNodeId === scriptId && edge.toNodeId === node.id)) {
                connectionsRef.current = [...connectionsRef.current, { id: nanoid(), fromNodeId: scriptId, fromHandleId: `row:${rowId}`, toNodeId: node.id, storyboardRowId: rowId }];
                setConnections(connectionsRef.current);
            }
            updateProject(projectId, { directorScenes: upsertDirectorSceneById(currentDirectorScenes(projectId, directorScenes), scene), nodes: next });
            if (open) {
                setSelectedNodeIds(new Set([node.id]));
                setDirectorNodeId(node.id);
            }
            return node.id;
        },
        [cardViewport, nodesRef, connectionsRef, directorScenes, projectId, openDirectorWorkbench, setNodes, setConnections, updateProject, setSelectedNodeIds, setDirectorNodeId],
    );

    useEffect(() => {
        const preview = (event: Event) => {
            const request = (event as CustomEvent<DirectorPreviewRequest>).detail;
            if (!request || request.canvasId !== projectId) return;
            const node = nodesRef.current.find((item) => item.metadata?.directorSceneId === request.sceneId && item.metadata?.directorShotId === request.shotId);
            if (node) openDirectorWorkbench(node.id);
        };
        window.addEventListener("director:preview-requested", preview);
        return () => window.removeEventListener("director:preview-requested", preview);
    }, [nodesRef, openDirectorWorkbench, projectId]);

    /** 每次保存都基于 store 中最新 directorScenes upsert，避免旧闭包数组覆盖并发保存。 */
    const saveDirectorScene = useCallback(
        (scene: DirectorScene) => {
            const shot = scene.shots.find((shot) => shot.id === scene.activeShotId);
            const previous = currentDirectorScenes(projectId, directorScenes).find((item) => item.id === scene.id);
            const previousShot = previous?.shots.find((item) => item.id === shot?.id);
            const sourceRow = nodesRef.current.find((node) => node.id === shot?.sourceStoryboardNodeId)?.metadata?.storyboard?.rows.find((row) => row.id === shot?.sourceStoryboardRowId);
            // A workbench draft may predate our own camera writeback acknowledgment.
            if (
                shot &&
                previousShot &&
                sourceRow &&
                previousShot.sourceStoryboardNodeId === shot.sourceStoryboardNodeId &&
                previousShot.sourceStoryboardRowId === shot.sourceStoryboardRowId &&
                previousShot.sourceFingerprint === directorRowFingerprint(sourceRow, shot.aspectRatio || "16:9")
            ) {
                scene = { ...scene, shots: scene.shots.map((item) => (item.id === shot.id ? { ...item, sourceFingerprint: previousShot.sourceFingerprint } : item)) };
            }
            const cameraChanged =
                shot &&
                previousShot &&
                JSON.stringify([shot.cameraMove, shot.shotSize, scene.cameras.find((item) => item.id === shot.cameraId)]) !==
                    JSON.stringify([previousShot.cameraMove, previousShot.shotSize, previous?.cameras.find((item) => item.id === previousShot.cameraId)]);
            const next = nodesRef.current.map((node) => {
                if (cameraChanged && shot && node.id === shot.sourceStoryboardNodeId && node.metadata?.storyboard && !node.metadata.locked) {
                    const storyboard = node.metadata.storyboard;
                    return {
                        ...node,
                        metadata: {
                            ...node.metadata,
                            storyboard: {
                                ...storyboard,
                                rows: storyboard.rows.map((row) => {
                                    if (row.id !== shot.sourceStoryboardRowId) return row;
                                    const updated = { ...row, camera: compileDirectorCameraDescription(scene, shot) };
                                    // Our own camera writeback is not an external storyboard conflict.
                                    if (previousShot?.sourceFingerprint === directorRowFingerprint(row, shot.aspectRatio || "16:9"))
                                        scene = { ...scene, shots: scene.shots.map((item) => (item.id === shot.id ? { ...item, sourceFingerprint: directorRowFingerprint(updated, shot.aspectRatio || "16:9") } : item)) };
                                    return updated;
                                }),
                            },
                        },
                    };
                }
                return node.id === directorNodeId && shot
                    ? {
                          ...node,
                          title: node.metadata?.titleEdited ? node.title : shot.name,
                          ...(previousShot?.aspectRatio !== shot.aspectRatio ? directorCardSize(shot.aspectRatio, cardViewport) : {}),
                          metadata: {
                              ...node.metadata,
                              workflowTitle: shot.name,
                              directorShotId: shot.id,
                              directorPreviewNodeId: shot.previewNodeId,
                              directorSourceStoryboardNodeId: shot.sourceStoryboardNodeId || node.metadata?.directorSourceStoryboardNodeId,
                              directorSourceStoryboardRowId: shot.sourceStoryboardRowId || node.metadata?.directorSourceStoryboardRowId,
                              referenceAssetNodeIds: [
                                  ...new Set([
                                      ...directorBoundReferenceIds(scene),
                                      ...(scene.environment?.sourceNodeId ? [scene.environment.sourceNodeId] : []),
                                      ...(node.metadata?.dramaProjection
                                          ? (nodesRef.current.find((item) => item.id === shot.sourceStoryboardNodeId)?.metadata?.storyboard?.rows.find((row) => row.id === shot.sourceStoryboardRowId)?.assetBindings || []).map((binding) => binding.nodeId)
                                          : []),
                                  ]),
                              ],
                              directorCharacterNodeIds: directorBoundReferenceIds(scene),
                          },
                      }
                    : node;
            });
            nodesRef.current = next;
            setNodes(next);
            updateProject(projectId, { directorScenes: upsertDirectorSceneById(currentDirectorScenes(projectId, directorScenes), scene), nodes: next });
        },
        [cardViewport, directorScenes, projectId, updateProject, nodesRef, setNodes, directorNodeId],
    );

    const saveDirectorPrevis = useCallback(
        (scene: DirectorScene, shot: DirectorShot) => {
            const owner = nodesRef.current.find((node) => node.id === directorNodeId);
            if (!owner) return;
            const fingerprint = scene.previs ? computePrevisSequenceFingerprint(scene) : directorPrevisFingerprint(scene, shot.id);
            const scope = getActiveUserScope();
            const key = `${scope}:${projectId}:${owner.id}:${fingerprint}`;
            if (currentDirectorPrevis(owner, shot.id)?.fingerprint === fingerprint || pendingPrevis.has(key)) return;
            pendingPrevis.add(key);
            void (async () => {
                try {
                    const { recordDirectorPrevis } = await import("@/components/canvas/director/director-background-recorder");
                    const blob = await recordDirectorPrevis(scene, shot.id);
                    const latest = currentDirectorScenes(projectId, directorScenes).find((item) => item.id === scene.id);
                    if (
                        projectIdRef.current !== projectId ||
                        getActiveUserScope() !== scope ||
                        !latest ||
                        (latest.previs ? computePrevisSequenceFingerprint(latest) : directorPrevisFingerprint(latest, shot.id)) !== fingerprint ||
                        !nodesRef.current.some((node) => node.id === owner.id)
                    )
                        return;
                    const storageKey = `video:${scope}:director-previs-${nanoid()}`;
                    const url = await setMediaBlob(storageKey, blob);
                    if (projectIdRef.current !== projectId || getActiveUserScope() !== scope) {
                        if (getActiveUserScope() === scope) await discardLocalMedia(storageKey);
                        return;
                    }
                    const current = currentDirectorScenes(projectId, directorScenes).find((item) => item.id === scene.id);
                    if (!current || (current.previs ? computePrevisSequenceFingerprint(current) : directorPrevisFingerprint(current, shot.id)) !== fingerprint || !nodesRef.current.some((node) => node.id === owner.id)) {
                        await discardLocalMedia(storageKey);
                        return;
                    }
                    const cache = { url, storageKey, shotId: shot.id, fingerprint };
                    const next = nodesRef.current.map((node) => (node.id === owner.id ? { ...node, metadata: { ...node.metadata, directorPrevis: cache, directorPrevisByShot: { ...node.metadata?.directorPrevisByShot, [shot.id]: cache } } } : node));
                    nodesRef.current = next;
                    setNodes(next);
                    updateProject(projectId, { nodes: next });
                } catch {
                    /* A failed optional local recording leaves the SVG animatic available. */
                } finally {
                    pendingPrevis.delete(key);
                }
            })();
        },
        [directorNodeId, nodesRef, projectId, directorScenes, setNodes, updateProject],
    );

    const applyDirectorOutput = useCallback(
        async (output: DirectorSceneOutput) => {
            const outputProjectId = projectId;
            if (projectIdRef.current !== outputProjectId) throw new Error(t("canvasExtra.directorWB.projectChanged"));
            const sourceNodeAtStart = nodesRef.current.find((item) => item.id === directorNodeId);
            if (!sourceNodeAtStart || sourceNodeAtStart.metadata?.directorSceneId !== output.scene.id) throw new Error(t("canvasExtra.directorWB.shotMissing"));
            const sourceNodeId = sourceNodeAtStart.id;
            const [image, videoUpload, depthImage, depthVideo, { worldEngineText }] = await Promise.all([
                uploadImage(output.beauty),
                output.clayVideo ? uploadMediaFile(output.clayVideo, "director-clay") : null,
                output.depth && output.depthVideo ? uploadImage(output.depth) : null,
                output.depthVideo ? uploadMediaFile(output.depthVideo, "director-depth") : null,
                import("@/i18n/world-engine-text"),
            ]);
            // 上传期间项目、节点和镜头都可能变化。以当前权威状态重新核验并合并，
            // 不允许旧输出写入另一项目，也不允许旧 scene 快照覆盖并发编辑。
            const outputProject = useCanvasStore.getState().projects.find((item) => item.id === outputProjectId);
            const sourceNode = nodesRef.current.find((item) => item.id === sourceNodeId);
            const latestScene = outputProject?.directorScenes.find((item) => item.id === output.scene.id);
            if (projectIdRef.current !== outputProjectId || !outputProject || !sourceNode || sourceNode.metadata?.directorSceneId !== output.scene.id || !latestScene || !latestScene.shots.some((shot) => shot.id === output.shot.id))
                throw new Error(t("canvasExtra.directorWB.outputProjectChanged"));
            if (output.previsSequenceFingerprint && (!latestScene.previs || computePrevisSequenceFingerprint(latestScene) !== output.previsSequenceFingerprint)) throw new Error(t("canvasExtra.directorWB.recordStale"));
            const previewId = sourceNode.metadata?.directorPreviewNodeId || `image-director-${Date.now()}`;
            const mergedScene = mergeDirectorOutputPreview(latestScene, { sceneId: output.scene.id, shotId: output.shot.id, previewNodeId: previewId });
            if (!mergedScene) throw new Error(t("canvasExtra.directorWB.outputShotChanged"));
            const previewSize = fitNodeSize(image.width, image.height);
            const existingPreview = nodesRef.current.find((item) => item.id === previewId);
            const previewNode: CanvasNodeData = {
                ...existingPreview,
                id: previewId,
                type: CanvasNodeType.Image,
                title: existingPreview?.metadata?.titleEdited ? existingPreview.title : output.shot.name,
                position: sourceNode.position,
                width: previewSize.width,
                height: previewSize.height,
                metadata: {
                    ...existingPreview?.metadata,
                    ...imageMetadata(image),
                    prompt: output.prompt,
                    workflowKind: "reference_set",
                    directorOutputKind: "beauty",
                    ...(sourceNode.metadata?.dramaProjection ? { dramaProjection: { ...sourceNode.metadata.dramaProjection, slot: "world-beauty" } } : {}),
                    assetTags: [t("canvasExtra.directorWB.compositionTag"), t("canvasExtra.directorWB.shotTag", { title: sourceNode.title })],
                },
            };
            const mediaNodes = [previewNode];

            let clayVideoId = sourceNode.metadata?.directorClayVideoNodeId;
            if (videoUpload) {
                clayVideoId ||= `video-director-clay-${Date.now()}`;
                const existingVideo = nodesRef.current.find((item) => item.id === clayVideoId);
                const videoSize = videoUpload.width && videoUpload.height ? fitNodeSize(videoUpload.width, videoUpload.height) : previewSize;
                const videoNode: CanvasNodeData = {
                    ...existingVideo,
                    id: clayVideoId,
                    type: CanvasNodeType.Video,
                    title: existingVideo?.metadata?.titleEdited ? existingVideo.title : output.shot.name,
                    position: sourceNode.position,
                    ...videoSize,
                    metadata: {
                        ...existingVideo?.metadata,
                        ...videoMetadata(videoUpload),
                        naturalWidth: videoUpload.width || image.width,
                        naturalHeight: videoUpload.height || image.height,
                        prompt: output.prompt,
                        workflowKind: "reference_video",
                        directorOutputKind: "clay",
                        ...(sourceNode.metadata?.dramaProjection ? { dramaProjection: { ...sourceNode.metadata.dramaProjection, slot: "world-clay" } } : {}),
                        assetTags: [t("canvasExtra.directorWB.clayTag"), t("canvasExtra.directorWB.shotTag", { title: sourceNode.title })],
                    },
                };
                mediaNodes.push(videoNode);
            }

            // Depth passes are standalone control assets. Keep them out of ordinary generation references.
            const depthIds = { directorDepthNodeId: sourceNode.metadata?.directorDepthNodeId, directorDepthVideoNodeId: sourceNode.metadata?.directorDepthVideoNodeId };
            for (const [field, resource, type, label] of [
                ["directorDepthNodeId", depthImage && imageMetadata(depthImage), CanvasNodeType.Image, "深度图"],
                ["directorDepthVideoNodeId", depthVideo && videoMetadata(depthVideo), CanvasNodeType.Video, "深度视频"],
            ] as const) {
                if (!resource) continue;
                const id = depthIds[field] ?? nanoid();
                const previous = nodesRef.current.find((item) => item.id === id);
                const size = resource.naturalWidth && resource.naturalHeight ? fitNodeSize(resource.naturalWidth, resource.naturalHeight) : previewSize;
                const node: CanvasNodeData = {
                    ...previous,
                    id,
                    type,
                    ...size,
                    title: `${sourceNode.title} · ${worldEngineText(label)}`,
                    position: sourceNode.position,
                    metadata: { ...previous?.metadata, ...resource, prompt: output.prompt, workflowKind: type === CanvasNodeType.Video ? "reference_video" : "reference_set" },
                };
                mediaNodes.push(node);
                depthIds[field] = id;
            }
            const retiredReferenceIds = new Set([...Object.values(depthIds), sourceNode.metadata?.directorNormalNodeId].filter(Boolean));
            const referenceAssetNodeIds = Array.from(
                new Set([
                    previewId,
                    ...directorBoundReferenceIds(output.scene, output.shot.id),
                    ...(output.scene.environment?.sourceNodeId ? [output.scene.environment.sourceNodeId] : []),
                    ...(sourceNode.metadata?.referenceAssetNodeIds || []).filter((id) => !retiredReferenceIds.has(id)),
                    ...(clayVideoId ? [clayVideoId] : []),
                ]),
            );
            const directorMetadata: Partial<CanvasNodeMetadata> = {
                directorWorldEngine: Boolean(output.scene.worldEngine),
                directorSceneId: output.scene.id,
                directorShotId: output.shot.id,
                directorPreviewNodeId: previewId,
                ...depthIds,
                directorNormalNodeId: undefined,
                directorClayVideoNodeId: clayVideoId,
                composerContent: output.prompt,
                prompt: output.prompt,
                videoCameraMoveId: output.shot.cameraMove,
                videoCameraMovePrompt: output.prompt,
                referenceAssetNodeIds,
            };
            if (output.previsSequenceFingerprint && videoUpload) {
                const cache = { url: videoUpload.url, storageKey: videoUpload.storageKey, shotId: output.shot.id, fingerprint: output.previsSequenceFingerprint };
                directorMetadata.directorPrevis = cache;
                directorMetadata.directorPrevisByShot = { ...sourceNode.metadata?.directorPrevisByShot, [output.shot.id]: cache };
            }
            if (videoUpload) {
                directorMetadata.directorWorldRecording = output.worldRecordingRevision ? { shotId: output.shot.id, sceneUpdatedAt: output.worldRecordingRevision, storageKey: videoUpload.storageKey } : undefined;
            }
            const assetIds = new Map<string, string>();
            for (const mediaNode of mediaNodes) {
                const result = await ensureCanvasNodeAsset({ canvasId: projectId, domainProjectId, node: mediaNode, source: "canvas-manual" });
                assetIds.set(mediaNode.id, result.assetId);
            }
            const anchor = nodesRef.current.find((item) => item.id === sourceNodeId);
            if (projectIdRef.current !== outputProjectId || !anchor || anchor.metadata?.directorSceneId !== output.scene.id) throw new Error(t("canvasExtra.directorWB.outputProjectChanged"));
            // Registering assets awaits I/O. Reserve each final rectangle against the live canvas.
            const finalizedNodes = nodesRef.current.map((item) => (item.id === anchor.id ? { ...item, metadata: { ...item.metadata, ...directorMetadata } } : item));
            for (const media of mediaNodes) {
                const position = directorOutputPosition(finalizedNodes, anchor, media.id, media);
                const placed = { ...media, position, metadata: { ...media.metadata, assetId: assetIds.get(media.id) } };
                const index = finalizedNodes.findIndex((item) => item.id === media.id);
                if (index < 0) finalizedNodes.push(placed);
                else finalizedNodes[index] = placed;
            }
            const nextConnections = migrateDirectorOutputConnections(finalizedNodes, connectionsRef.current);
            [previewId, videoUpload ? clayVideoId : null]
                .filter((id): id is string => Boolean(id))
                .forEach((id) => {
                    if (!nextConnections.some((connection) => connection.fromNodeId === sourceNode.id && connection.toNodeId === id)) nextConnections.push({ id: nanoid(), fromNodeId: sourceNode.id, toNodeId: id, relation: "director-output" });
                });
            let next = { nodes: finalizedNodes, connections: nextConnections };
            const finalizedSource = finalizedNodes.find((item) => item.id === sourceNodeId)!;
            const target = directorSourceTarget(finalizedSource, finalizedNodes);
            if (target) next = connectDirectorDownstream(next.nodes, next.connections, sourceNodeId, target, undefined, mergedScene);
            // Existing explicit downstream edges also receive refreshed output bindings.
            for (const edge of nextConnections.filter((edge) => edge.fromNodeId === sourceNodeId && edge.relation !== "director-output")) {
                if (edge.toHandleId?.startsWith("row:") || finalizedNodes.some((node) => node.id === edge.toNodeId && node.type === CanvasNodeType.Video && !node.metadata?.directorSceneId)) {
                    next = connectDirectorDownstream(next.nodes, next.connections, sourceNodeId, { nodeId: edge.toNodeId, rowId: edge.toHandleId?.startsWith("row:") ? edge.toHandleId.slice(4) : undefined, label: "" }, undefined, mergedScene);
                }
            }
            nodesRef.current = next.nodes;
            connectionsRef.current = next.connections;
            setNodes(next.nodes);
            setConnections(next.connections);
            if (!target) message.info(t("canvasDirector.connectHint"));
            saveDirectorScene(acknowledgeDirectorWriteback(mergedScene, finalizedNodes, next.nodes));
            window.dispatchEvent(
                new CustomEvent("director:output-ready", {
                    detail: {
                        canvasId: projectId,
                        sceneId: output.scene.id,
                        shotId: output.shot.id,
                        compositionNodeId: previewId,
                        compositionAssetId: assetIds.get(previewId),
                        clayVideoNodeId: clayVideoId,
                        suggestedConnectionTargets: directorConnectionTargets(next.nodes, sourceNodeId),
                    },
                }),
            );
        },
        [connectionsRef, directorNodeId, domainProjectId, nodesRef, projectId, saveDirectorScene, setConnections, setNodes, message],
    );

    const addPrevisToCanvas = useCallback(
        async (output: PrevisCanvasExport) => {
            const scope = getActiveUserScope();
            const sourceNodeId = directorNodeId;
            const { worldEngineText } = await import("@/i18n/world-engine-text");
            const validateSource = () => {
                if (projectIdRef.current !== projectId || getActiveUserScope() !== scope) throw new Error(t("canvasExtra.directorWB.outputProjectChanged"));
                const project = useCanvasStore.getState().projects.find((item) => item.id === projectId);
                const source = nodesRef.current.find((item) => item.id === sourceNodeId);
                const currentScene = project?.directorScenes.find((item) => item.id === output.sceneId);
                if (!source || source.metadata?.directorSceneId !== output.sceneId || !currentScene?.shots.some((shot) => shot.id === output.shotId)) throw new Error(t("canvasExtra.directorWB.outputShotChanged"));
                return source;
            };
            validateSource();
            const added: CanvasNodeData[] = [];
            const links: CanvasConnection[] = [];
            if (output.kind === "prompt") {
                if (!output.prompt.trim()) throw new Error(worldEngineText("worldEngine.emptyPrompt"));
                const text = createCanvasNode(CanvasNodeType.Text, { x: 0, y: 0 }, { content: output.prompt, status: "success" });
                text.title = `${output.title} · ${worldEngineText("worldEngine.shotPrompt")}`;
                added.push(text);
            } else {
                const image = await uploadImage(output.image);
                validateSource();
                const picture = createCanvasNode(CanvasNodeType.Image, { x: 0, y: 0 }, { ...imageMetadata(image), prompt: output.prompt, assetTags: [worldEngineText("最新截图")] });
                picture.title = `${output.title} · ${output.timecode}`;
                Object.assign(picture, fitNodeSize(image.width, image.height, undefined, undefined, 0, 0));
                const asset = await ensureCanvasNodeAsset({ canvasId: projectId, domainProjectId, node: picture, source: "canvas-manual" });
                validateSource();
                picture.metadata = { ...picture.metadata, assetId: asset.assetId };
                added.push(picture);
                // 深度、法线和骨架截图仅作为控制素材，避免误当普通首帧提交。
                if (output.renderMode === "beauty" || output.renderMode === "clay") {
                    const video = createCanvasNode(
                        CanvasNodeType.Video,
                        { x: 0, y: 0 },
                        {
                            generationMode: "video",
                            videoEditOperation: "image_to_video",
                            videoStartFrameNodeId: picture.id,
                            referenceAssetNodeIds: [picture.id],
                            prompt: output.prompt,
                            composerContent: output.prompt,
                            seconds: String(output.duration),
                            status: NODE_STATUS_IDLE,
                        },
                    );
                    video.title = `${output.title} · ${worldEngineText("worldEngine.stillToVideo")}`;
                    added.push(video);
                    links.push({ id: nanoid(), fromNodeId: picture.id, toNodeId: video.id });
                }
            }
            // 所有异步操作结束后再读取节点与连线，保留上传期间的新增、移动和删除。
            const source = validateSource();
            const position = findAvailableGenerationGroupPosition(
                nodesRef.current,
                { x: source.position.x + source.width + 48, y: source.position.y },
                {
                    width: added.reduce((sum, node) => sum + node.width, 0) + (added.length - 1) * 48,
                    height: Math.max(...added.map((node) => node.height)),
                },
            );
            let x = position.x;
            for (const node of added) {
                node.position = { x, y: position.y };
                x += node.width + 48;
            }
            nodesRef.current = [...nodesRef.current, ...added];
            connectionsRef.current = [...connectionsRef.current, ...links];
            setNodes(nodesRef.current);
            setConnections(connectionsRef.current);
            setSelectedNodeIds(new Set(added.map((node) => node.id)));
            setSelectedConnectionId(null);
        },
        [connectionsRef, domainProjectId, nodesRef, directorNodeId, projectId, setConnections, setNodes, setSelectedConnectionId, setSelectedNodeIds],
    );

    const applyDirectorPrompt = useCallback(
        async (scene: DirectorScene, shot: DirectorShot, prompt: string) => {
            const nodes = nodesRef.current.map((node) => (node.id === directorNodeId ? { ...node, metadata: { ...node.metadata, directorWorldEngine: Boolean(scene.worldEngine), prompt, composerContent: prompt, videoCameraMovePrompt: prompt } } : node));
            const source = nodes.find((node) => node.id === directorNodeId);
            if (!source) throw new Error(t("canvasExtra.directorWB.shotMissing"));
            const target = directorSourceTarget(source, nodes);
            const next = target ? connectDirectorDownstream(nodes, connectionsRef.current, source.id, target, undefined, scene) : { nodes, connections: connectionsRef.current };
            nodesRef.current = next.nodes;
            connectionsRef.current = next.connections;
            setNodes(next.nodes);
            setConnections(next.connections);
            saveDirectorScene(acknowledgeDirectorWriteback(scene, nodes, next.nodes));
            updateProject(projectId, { nodes: next.nodes });
        },
        [directorNodeId, nodesRef, connectionsRef, setNodes, setConnections, saveDirectorScene, updateProject, projectId],
    );

    const scheduleNodeThumbnail = useCallback(
        (nodeId: string, scene: DirectorScene, shotId: string) => {
            const owner = nodesRef.current.find((node) => node.id === nodeId);
            if (!owner) return;
            const sceneUpdatedAt = (savedWorldEngineShot(scene, shotId) ?? scene).updatedAt;
            const existing = currentDirectorThumbnail(owner.metadata?.directorThumbnail, sceneUpdatedAt, shotId);
            if (existing?.renderer === WORLD_ENGINE_THUMBNAIL_RENDERER) return;
            const scope = getActiveUserScope();
            const key = JSON.stringify([scope, projectId, nodeId, shotId, sceneUpdatedAt]);
            if (pendingThumbnails.has(key)) return;
            const isCurrent = () => {
                if (projectIdRef.current !== projectId || getActiveUserScope() !== scope) return false;
                const latest = currentDirectorScenes(projectId, directorScenes).find((item) => item.id === scene.id);
                const node = nodesRef.current.find((item) => item.id === nodeId);
                return Boolean(latest && node?.metadata?.directorSceneId === scene.id && (node.metadata.directorShotId || latest.activeShotId) === shotId && (savedWorldEngineShot(latest, shotId) ?? latest).updatedAt === sceneUpdatedAt);
            };
            pendingThumbnails.add(key);
            void (async () => {
                try {
                    const { queuePrevisThumbnail } = await import("@/components/canvas/previs/previs-thumbnail-jobs");
                    const blob = await queuePrevisThumbnail(scene, shotId, () => !directorNodeIdRef.current && isCurrent());
                    if (!blob || !isCurrent()) return;
                    const storageKey = `image:${scope}:director-thumbnail-${nanoid()}`;
                    const url = await setImageBlob(storageKey, blob);
                    if (!isCurrent()) {
                        await deleteStoredImages([storageKey]);
                        return;
                    }
                    const thumbnail = { url, storageKey, shotId, sceneUpdatedAt, renderer: WORLD_ENGINE_THUMBNAIL_RENDERER } as const;
                    const next = nodesRef.current.map((node) => (node.id === nodeId ? { ...node, metadata: { ...node.metadata, directorThumbnail: thumbnail } } : node));
                    nodesRef.current = next;
                    setNodes(next);
                    updateProject(projectId, { nodes: next });
                } catch {
                    // The card stays available when the browser cannot render a background image.
                } finally {
                    pendingThumbnails.delete(key);
                }
            })();
        },
        [nodesRef, projectId, directorScenes, setNodes, updateProject],
    );

    return { addPrevisToCanvas, applyDirectorOutput, applyDirectorPrompt, connectDirector, createDirectorShot, createStoryboardPrevis, openDirectorWorkbench, saveDirectorScene, saveDirectorPrevis, scheduleNodeThumbnail };
}
