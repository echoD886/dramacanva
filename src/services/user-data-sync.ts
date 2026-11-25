import { currentLocaleText as runtimeText } from "@/i18n/current-locale-text";
import { currentLocaleText } from "@/i18n/current-locale-text";
import { nanoid } from "nanoid";
import { defaultAssetCategoryForKind } from "@/lib/asset-category";
import { preferredStarterMode } from "@/lib/canvas/canvas-starter";
import { getMediaBlob } from "@/services/file-storage";
import { getImageBlob, setImageBlob } from "@/services/image-storage";
import { createAssetOriginalRecovery, deferOriginalRecovery, needsOriginalUpload } from "@/services/asset-original-recovery";
import { assertLocalStorageKeyScope } from "@/services/local-workspace-storage";
import {
    deleteRemoteAsset,
    deleteRemoteCanvasProject,
    getRemoteAsset,
    getRemoteAssetsByIds,
    getRemoteCanvasProject,
    getRemoteUserDataSnapshot,
    listRemoteAssetsPage,
    restoreRemoteCanvasHistory,
    REMOTE_ASSET_BATCH_SIZE,
    upsertRemoteAsset,
    upsertRemoteAssets,
    upsertRemoteCanvasProject,
} from "@/services/api/user-data";
import { ApiError } from "@/services/api/request";
import { canvasContentHash, sameCanvasContent, shareUnchangedCanvasNodes } from "@/lib/canvas/canvas-content";
import { invalidateEditedPromptVariables } from "@/lib/canvas/canvas-storyboard-edit";
import { getActiveUserScope } from "@/lib/user-scope";
import { localForageStorageForScope } from "@/lib/localforage-storage";
import { mergeAssetContent, normalizeAssetRecord, shareUnchangedAssets } from "@/lib/asset-storage-revision";
import { mergeProtectedFields } from "@/types/asset-archive";
import { preserveCanvasSyncDraft, readCanvasSyncDrafts } from "@/services/canvas-sync-drafts";
import { clearCanvasReloadDraft, readCanvasReloadDraft, writeCanvasReloadDraft } from "@/services/canvas-reload-draft";
import { canvasEditingNodeIds, CanvasEditLeasePendingError, resumeCanvasEditLeases } from "@/services/canvas-edit-leases";
import { appQueryClient } from "@/lib/query-client";
import { invalidateBootCanvasSeed, type BootCanvasSeed } from "@/lib/bootstrap-cache";
import { resourceFileUrl, resourceIdFromStorageKey, resourceStorageKey, uploadResourceFile } from "@/services/api/resources";
import { parseAssetRecordList } from "@/lib/asset-record";
import { assetForRemoteSync, resolveRemoteAssetPage } from "@/lib/asset-remote-sync";
import type { Asset } from "@/stores/use-asset-store";
import { applyRemoteAssetRecords, assertAssetNotUsedAsCanvasCover, commitAssetArchiveCommand, flushAssetStorePersistence, mergeRemoteAssetRecord, useAssetStore } from "@/stores/use-asset-store";
import type { CanvasProject } from "@/stores/canvas/use-canvas-store";
import { flushCanvasStorePersistence, useCanvasStore } from "@/stores/canvas/use-canvas-store";
import { useSyncProgressStore } from "@/stores/use-sync-progress-store";
import { useCanvasHistoryStore } from "@/stores/canvas/use-canvas-history-store";
import { repairMissingCanvasAssets, repairMissingCanvasVideoPreviews, timelineMediaNode } from "@/services/canvas-asset-repair";
import { canvasNodeResourceIdentity, findCanvasNodeAsset, requiresMaterializedCanvasAsset } from "@/lib/canvas/canvas-node-asset";
import { resolveCanvasNodeAsset } from "@/services/canvas-node-asset-loader";
import { AssetArchiveCommandError, localCanvasDeletePlan, setAssetPrimaryLocation } from "@/services/asset-archive";
import type { CanvasDeletePreflightResponse } from "@/types/asset-archive";
import type { CanvasNodeData, StoryboardColumn } from "@/types/canvas";
import { applyAgentCanvasPatch, mergeAgentCanvasEditor, resolveCanvasNodeDraft, type AgentCanvasPatch } from "@/lib/canvas/agent-canvas-patch";

let activeRemoteUserId = "";
let originalRecovery: ReturnType<typeof createAssetOriginalRecovery> | undefined;

export function stopAssetOriginalRecovery() {
    originalRecovery?.stop();
    originalRecovery = undefined;
}

function startOriginalRecovery() {
    if (typeof window === "undefined" || !hasRemoteUserDataSyncSession() || getActiveUserScope() === "guest") return;
    originalRecovery?.stop();
    const epoch = sessionEpoch;
    const scope = getActiveUserScope();
    const current = () => epoch === sessionEpoch && scope === getActiveUserScope() && hasRemoteUserDataSyncSession();
    originalRecovery = createAssetOriginalRecovery({
        current,
        assets: () => useAssetStore.getState().assets,
        defer: deferOriginalRecovery,
        upload: async (asset, signal) => {
            let key = asset.data.storageKey;
            if (!key) {
                key = `image:${scope}:asset-${asset.id}`;
                const response = await fetch(asset.data.dataUrl, { signal });
                if (!response.ok) throw new Error("Invalid local original");
                const blob = await response.blob();
                if (!current()) throw new DOMException("Account changed", "AbortError");
                await setImageBlob(key, blob);
            }
            assertLocalStorageKeyScope(key);
            return uploadLocalStorageKey(key, asset.data, signal);
        },
        commit: (source, storageKey) =>
            withRemoteUserDataSyncExclusive(async () => {
                if (!current()) return;
                const live = useAssetStore.getState().assets.find((asset) => asset.id === source.id);
                if (live?.kind !== "image" || live.data.storageKey !== source.data.storageKey || live.data.dataUrl !== source.data.dataUrl) return;
                const data = applyResourceReference({ ...live.data }, storageKey);
                delete data.localOnly;
                const next = { ...live, coverUrl: resourceFileUrl(resourceIdFromStorageKey(storageKey)!), data } as Asset;
                delete (next as Asset & { localOnly?: boolean }).localOnly;
                useAssetStore.getState().updateAsset(next.id, next);
                await flushAssetStorePersistence();
                scheduleRemoteUserDataSync();
            }),
    });
    originalRecovery.wake();
}
// Content last refused for missing media, per canvas; cleared on a successful save or session reset.
const resourcesMissingFailures = new Map<string, CanvasProject>();
// Last save failure per canvas; lets saveRemoteUserDataNow(projectId) report only its own canvases' errors.
const projectSyncErrors = new Map<string, unknown>();
// 云端确认过的素材 ID（按账号持久化）。登录基线据此区分“从未上传成功的本地素材”（保留并补传）
// 与“云端已删除的素材”（丢弃，不复活）；没有记录的旧缓存仍以云端快照为准。
const ACKNOWLEDGED_ASSET_IDS_KEY = "infinite-canvas:acknowledged-asset-ids";
type RemoteUserDataPhase = "inactive" | "hydrating" | "ready" | "failed";

let remoteUserDataPhase: RemoteUserDataPhase = "inactive";
let syncTimer: number | null = null;
let syncPromise: Promise<void> | null = null;
let syncQueued = false;
// 云端同步遇到可重试错误（网络、5xx、429）时按 2/4/8/16/30 秒退避自动重试，尊重 Retry-After；成功后归零。
let syncRetryAttempt = 0;
// 登录基线失败（网络、快照期间本地仍在写入等）时按同一退避表重试，避免整段会话都不再同步。
let baselineRetryAttempt = 0;
const REMOTE_SYNC_RETRY_DELAYS_MS = [2_000, 4_000, 8_000, 16_000, 30_000] as const;
let remoteOperationTail: Promise<void> = Promise.resolve();
let stopAutoSync: (() => void) | undefined;
let acknowledgedAssets = new Map<string, Asset>();
let acknowledgedProjects = new Map<string, CanvasProject>();
// Content at creation time for blank drafts. A rename or appearance edit is a
// real document change and must upload even though the graph is still empty.
const blankCanvasDraftSnapshots = new Map<string, CanvasProject>();

function acknowledgeProject(id: string, project: CanvasProject) {
    invalidateBootCanvasSeed(activeRemoteUserId, id);
    acknowledgedProjects.set(id, project);
    blankCanvasDraftSnapshots.delete(id);
    void clearCanvasReloadDraft(id, project, getActiveUserScope()).catch((error) => console.warn("画布离页草稿清理失败", error));
}

export function checkpointCanvasOnPageHide(id: string) {
    const project = useCanvasStore.getState().openProject(id);
    if (project) checkpointCanvasDraft(project);
}

export function checkpointCanvasTextModal(id: string, nodeId: string, draft?: { title: string; content: string; richText: Record<string, unknown> }) {
    const project = useCanvasStore.getState().openProject(id);
    if (!project) return;
    const nodes = draft ? project.nodes.map((node) => (node.id === nodeId ? { ...node, title: draft.title, metadata: { ...node.metadata, content: draft.content, richText: draft.richText } } : node)) : project.nodes;
    checkpointCanvasDraft({ ...project, nodes }, true);
}

export function checkpointCanvasStoryboardInput(id: string, nodeId: string, rowId: string, field: StoryboardColumn, value: string) {
    const project = useCanvasStore.getState().openProject(id);
    const node = project?.nodes.find((node) => node.id === nodeId);
    const storyboard = node?.metadata?.storyboard;
    if (!project || !node || !storyboard?.rows.some((row) => row.id === rowId)) return;
    const rows = storyboard.rows.map((row) => (row.id === rowId ? invalidateEditedPromptVariables(row, { ...row, [field]: value }) : row));
    const edited = { ...node, metadata: { ...node.metadata, storyboard: { ...storyboard, rows } } };
    // Start durability in the input event, before a possible immediate navigation.
    // This does not publish the graph, sync diff, or React subscribers per key.
    checkpointCanvasDraft({ ...project, nodes: project.nodes.map((current) => (current === node ? edited : current)), updatedAt: new Date().toISOString() }, true);
}

function checkpointCanvasDraft(project: CanvasProject, replaceInput = false) {
    const id = project.id;
    const baseline = acknowledgedProjects.get(id);
    // Returning the cell to its saved value must replace an earlier input journal.
    if (!replaceInput && sameCanvasContent(project, baseline)) return;
    void Promise.resolve(writeCanvasReloadDraft({ project, baseline, nodeIds: canvasEditingNodeIds(id) }, getActiveUserScope())).catch((error) => console.error("画布离页草稿保存失败", error));
}
let incrementalSession = false;
let sessionEpoch = 0;
const verifiedProjects = new Set<string>();
const verifiedAssets = new Set<string>();
const remoteProjectLoadPromises = new Map<string, Promise<CanvasProject | undefined>>();
// A canvas created in this tab has no remote version to fetch on its first open.
const newlyCreatedCanvasIds = new Set<string>();

export async function initializeRemoteUserDataSession(userId: string) {
    await withRemoteUserDataSyncExclusive(async () => {
        resetRemoteUserDataSync();
        activeRemoteUserId = userId;
        incrementalSession = true;
        acknowledgedProjects = new Map(useCanvasStore.getState().projects.map((project) => [project.id, project]));
        acknowledgedAssets = new Map(useAssetStore.getState().assets.map((asset) => [asset.id, asset]));
        remoteUserDataPhase = "ready";
        startOriginalRecovery();
    });
}

function liveCanvasIfUnchanged(id: string, snapshot: CanvasProject | null | undefined) {
    const live = useCanvasStore.getState().openProject(id);
    if (live === snapshot) return live;
    if (!snapshot) return live ? undefined : null;
    return live && sameCanvasContent(live, snapshot) ? live : undefined;
}

export async function loadCanvasProjectForEditing(id: string, options: { latest?: boolean; historyRestore?: { snapshotId: string; revision: number }; onLoad?: (project: CanvasProject) => void } = {}) {
    // Plain opens share one in-flight read; explicit reloads and restores always reach the server.
    const plainLoad = !options.latest && !options.historyRestore;
    if (plainLoad && newlyCreatedCanvasIds.has(id)) {
        const local = useCanvasStore.getState().openProject(id);
        if (local) {
            // Keep the marker through React Strict Mode's immediate effect replay.
            globalThis.setTimeout(() => newlyCreatedCanvasIds.delete(id), 0);
            options.onLoad?.(local);
            return local;
        }
        newlyCreatedCanvasIds.delete(id);
    }
    const pending = plainLoad ? remoteProjectLoadPromises.get(id) : undefined;
    if (pending) {
        return pending.then((project) => {
            if (project) options.onLoad?.(project);
            return project;
        });
    }
    stopAssetOriginalRecovery();
    const epoch = sessionEpoch;
    const openingProject = useCanvasStore.getState().openProject(id);
    const request = withRemoteUserDataSyncExclusive(async () => {
        if (epoch !== sessionEpoch) throw new Error(currentLocaleText("canvasExtra.cloudSync.accountSwitchedReopen"));
        const scope = getActiveUserScope();
        const reloadDraft = await readCanvasReloadDraft(id, scope);
        if (epoch !== sessionEpoch || getActiveUserScope() !== scope) throw new Error(currentLocaleText("canvasExtra.cloudSync.accountSwitchedReopen"));
        const cached = useCanvasStore.getState().openProject(id);
        if (reloadDraft && (!cached || reloadDraft.project.updatedAt >= cached.updatedAt)) {
            useCanvasStore.setState((state) => ({ projects: [...state.projects.filter((project) => project.id !== id), reloadDraft.project] }));
            resumeCanvasEditLeases(id, reloadDraft.nodeIds);
            await flushCanvasStorePersistence();
        }
        // Signed-out canvases stay local-only.
        if (!activeRemoteUserId) {
            const local = useCanvasStore.getState().openProject(id) ?? undefined;
            if (local) options.onLoad?.(local);
            return local;
        }
        requireRemoteUserDataBaseline();
        const requireUnchangedLocal = (snapshot: CanvasProject | null | undefined, message: string) => {
            if (epoch !== sessionEpoch || getActiveUserScope() !== scope) throw new Error(currentLocaleText("canvasExtra.cloudSync.accountSwitchedReopen"));
            const live = liveCanvasIfUnchanged(id, snapshot);
            if (live === undefined) throw new Error(message);
            return live;
        };
        if (options.historyRestore) {
            const local = useCanvasStore.getState().openProject(id);
            if (local) {
                const draftCount = await preserveCanvasSyncDraft(local, scope);
                useSyncProgressStore.getState().setProjectProgress(id, { draftCount });
            }
            requireUnchangedLocal(local, currentLocaleText("canvasExtra.cloudSync.restoreWhileUpdating"));
            const { snapshotId, revision } = options.historyRestore;
            try {
                const saved = await restoreRemoteCanvasHistory(id, snapshotId, revision);
                if (epoch !== sessionEpoch || getActiveUserScope() !== scope) throw new Error(currentLocaleText("canvasExtra.cloudSync.accountSwitchedRestore"));
                if (saved.project.revision !== revision + 1) throw new Error(currentLocaleText("canvasExtra.cloudSync.restoreRevisionInvalid"));
            } catch (error) {
                if (epoch === sessionEpoch && getActiveUserScope() === scope && error instanceof ApiError && (error.status === 409 || error.status === 428)) {
                    useSyncProgressStore.getState().setProjectProgress(id, { phase: "conflict", message: error.message });
                }
                throw error;
            }
        }
        let remote: CanvasProject;
        try {
            const bootKey = ["boot-canvas", activeRemoteUserId, id];
            const boot = plainLoad && appQueryClient.getQueryData<BootCanvasSeed>(bootKey);
            const localRevision = useCanvasStore.getState().openProject(id)?.revision ?? 0;
            const acknowledgedRevision = acknowledgedProjects.get(id)?.revision ?? 0;
            const prefetched = boot && Date.now() - boot.acquiredAt < 5_000 && boot.revision >= localRevision && boot.revision >= acknowledgedRevision ? boot.project : undefined;
            appQueryClient.removeQueries({ queryKey: bootKey, exact: true });
            remote = prefetched ?? (await getRemoteCanvasProject(id, verifiedProjects.has(id) ? acknowledgedProjects.get(id) : undefined)).project;
        } catch (error) {
            if (epoch !== sessionEpoch) throw new Error(currentLocaleText("canvasExtra.cloudSync.accountSwitchedReopen"));
            const local = useCanvasStore.getState().openProject(id);
            if (error instanceof ApiError && error.status === 404 && local?.revision === 0) {
                options.onLoad?.(local);
                return local;
            }
            throw error;
        }
        if (epoch !== sessionEpoch) throw new Error(currentLocaleText("canvasExtra.cloudSync.accountSwitchedReopen"));
        await loadReferencedAssets(collectAssetIds(remote));
        const hash = await canvasContentHash(remote);
        if (epoch !== sessionEpoch || getActiveUserScope() !== scope) throw new Error(currentLocaleText("canvasExtra.cloudSync.accountSwitchedReopen"));
        let restoredLocal = useCanvasStore.getState().openProject(id);
        if (openingProject && sameCanvasContent(openingProject, remote)) {
            // Task polling can update the live editor while its first GET/hash is
            // pending. Verify the captured ancestor, without discarding those edits.
            acknowledgeProject(id, { ...remote, remoteContentHash: hash });
            verifiedProjects.add(id);
            if (restoredLocal && !restoredLocal.remoteContentHash) {
                restoredLocal = { ...restoredLocal, remoteContentHash: hash };
                const verifiedLocal = restoredLocal;
                useCanvasStore.setState((state) => ({ projects: state.projects.map((project) => (project.id === id ? verifiedLocal : project)) }));
            }
        }
        const local = restoredLocal;
        const cachedClean = local?.remoteContentHash && local.remoteContentHash === (await canvasContentHash(local));
        const dirty = local && (!verifiedProjects.has(id) && incrementalSession ? !cachedClean : !sameCanvasContent(acknowledgedProjects.get(id), local));
        if (dirty && !sameCanvasContent(local, remote)) {
            const draftCount = await preserveCanvasSyncDraft(local, scope);
            const liveAfterDraft = requireUnchangedLocal(local, currentLocaleText("canvasExtra.cloudSync.stillUpdatingKept"));
            useSyncProgressStore.getState().setProjectProgress(id, { draftCount });
            if (!options.latest && !options.historyRestore) {
                // Caches written before revisions existed carry none; treat them as
                // edits on top of the current cloud version (main's prior behaviour)
                // instead of silently swapping the open canvas for the remote copy.
                if (local.revision === undefined) {
                    const adopted = { ...local, revision: remote.revision };
                    useCanvasStore.setState((state) => ({ projects: state.projects.map((item) => (item.id === id ? adopted : item)) }));
                    acknowledgeProject(id, { ...remote, remoteContentHash: hash });
                    verifiedProjects.add(id);
                    useSyncProgressStore.getState().setProjectProgress(id, { phase: "pending", message: currentLocaleText("canvasExtra.cloudSync.draftPending") });
                    scheduleRemoteUserDataSync();
                    options.onLoad?.(adopted);
                    return adopted;
                }
                if (local.revision !== remote.revision) {
                    // The previous page can finish a save after navigation. Its verified
                    // ancestor lets a reload merge that acknowledgement with the last keys.
                    const baseline = reloadDraft?.baseline;
                    if (baseline?.remoteContentHash && baseline.remoteContentHash === (await canvasContentHash(baseline))) {
                        try {
                            const merged = { ...mergeAgentCanvasEditor(baseline, remote, local.nodes, local.connections, local), viewport: local.viewport, remoteContentHash: hash };
                            acknowledgeProject(id, { ...remote, remoteContentHash: hash });
                            verifiedProjects.add(id);
                            useCanvasStore.setState((state) => ({ projects: state.projects.map((project) => (project.id === id ? merged : project)) }));
                            useSyncProgressStore.getState().setProjectProgress(id, { phase: "pending", message: currentLocaleText("canvasExtra.cloudSync.draftPending") });
                            scheduleRemoteUserDataSync();
                            options.onLoad?.(merged);
                            return merged;
                        } catch {
                            /* Same-field concurrent edits retain the conflict draft below. */
                        }
                    }
                    useSyncProgressStore.getState().setProjectProgress(id, { phase: "conflict", message: currentLocaleText("canvasExtra.cloudSync.conflictDraftKept") });
                } else {
                    // A cached draft is not an acknowledged cloud save. Once its
                    // ancestor is verified, retain it as pending against that content.
                    acknowledgeProject(id, { ...remote, remoteContentHash: hash });
                    verifiedProjects.add(id);
                    useSyncProgressStore.getState().setProjectProgress(id, { phase: "pending", message: currentLocaleText("canvasExtra.cloudSync.draftPending") });
                    scheduleRemoteUserDataSync();
                }
                options.onLoad?.(liveAfterDraft || local);
                return liveAfterDraft || local;
            }
        }
        // Editing/generation may continue during the network request or draft write.
        // Viewport-only updates are not document edits and must not block adopting cloud content.
        const live = requireUnchangedLocal(local, currentLocaleText("canvasExtra.cloudSync.stillUpdatingKept"));
        const project = { ...remote, viewport: live?.viewport || local?.viewport || remote.viewport || { x: 0, y: 0, k: 1 }, remoteContentHash: hash };
        // Align live editor refs synchronously before publishing the new revision.
        // A generation callback must never see old rendered nodes paired with a new revision.
        options.onLoad?.(project);
        acknowledgeProject(id, project);
        verifiedProjects.add(id);
        useCanvasStore.setState((state) => ({ projects: local ? state.projects.map((item) => (item.id === id ? project : item)) : [...state.projects, project] }));
        await flushCanvasStorePersistence();
        useSyncProgressStore.getState().setProjectProgress(id, { phase: "done", message: currentLocaleText("canvasExtra.cloudSync.latestLoaded") });
        return project;
    });
    remoteProjectLoadPromises.set(id, request);
    const clearPending = () => {
        if (remoteProjectLoadPromises.get(id) === request) remoteProjectLoadPromises.delete(id);
        if (epoch === sessionEpoch && !remoteProjectLoadPromises.size) startOriginalRecovery();
    };
    void request.then(clearPending, clearPending);
    return request;
}

// Never replace edits made while the Agent was running. Leave the acknowledged
// baseline untouched on conflict, so automatic sync cannot silently overwrite it.
type CanvasRefreshOptions = { focusCreatedNodes?: boolean; preferLocalNodeId?: string };
const agentCanvasListeners = new Set<(project: CanvasProject, previous: CanvasProject | undefined, options?: CanvasRefreshOptions) => void>();

export function subscribeAgentCanvasRefresh(listener: (project: CanvasProject, previous: CanvasProject | undefined, options?: CanvasRefreshOptions) => void) {
    agentCanvasListeners.add(listener);
    return () => {
        agentCanvasListeners.delete(listener);
    };
}

/** Explicitly discard only this node's draft; keep every other local change. */
export async function discardCanvasNodeDraft(id: string, nodeId: string) {
    const epoch = sessionEpoch;
    return withRemoteUserDataSyncExclusive(async () => {
        const { project: remote } = await getRemoteCanvasProject(id);
        if (epoch !== sessionEpoch) throw new DOMException("Account changed", "AbortError");
        const current = useCanvasStore.getState().openProject(id);
        if (!current) return;
        const node = remote.nodes.find((node) => node.id === nodeId);
        const projected = { ...current, nodes: current.nodes.flatMap((local) => (local.id === nodeId ? (node ? [node] : []) : [local])) };
        for (const listener of agentCanvasListeners) listener(projected, current, { focusCreatedNodes: false });
        useCanvasStore.setState((state) => ({ projects: state.projects.map((project) => (project === current ? projected : project)) }));
        await flushCanvasStorePersistence();
        checkpointCanvasDraft(projected, true);
    });
}

export async function refreshCanvasAfterAgent(id: string, options: CanvasRefreshOptions = {}) {
    const epoch = sessionEpoch;
    const scope = getActiveUserScope();
    return withRemoteUserDataSyncExclusive(async () => {
        if (!activeRemoteUserId) throw new Error(runtimeText("creationRuntime.syncLoginRequired"));
        const { project } = await getRemoteCanvasProject(id, verifiedProjects.has(id) ? acknowledgedProjects.get(id) : undefined);
        if (epoch !== sessionEpoch) throw new Error(currentLocaleText("canvasExtra.cloudSync.accountSwitched"));
        const current = useCanvasStore.getState().projects.find((candidate) => candidate.id === id);
        const baseline = acknowledgedProjects.get(id);
        // Background checks cannot revoke a revision already acknowledged by
        // this session. History restores use a separate, revisioned write path.
        if (current && baseline && project.revision !== undefined && baseline.revision !== undefined && project.revision < baseline.revision) return current;
        if (current && baseline && verifiedProjects.has(id) && project.revision === baseline.revision && sameCanvasContent(project, baseline) && sameCanvasContent(current, baseline)) {
            projectSyncErrors.delete(id);
            useSyncProgressStore.getState().setProjectProgress(id, { phase: "done", reason: undefined, message: currentLocaleText("canvasExtra.cloudSync.savedToCloud") });
            return current;
        }
        const cachedDirty = current && incrementalSession && !verifiedProjects.has(id) && current.remoteContentHash !== (await canvasContentHash(current));
        const baselineClean = Boolean(baseline && baseline.remoteContentHash === (await canvasContentHash(baseline)));
        if (epoch !== sessionEpoch) throw new Error(currentLocaleText("canvasExtra.cloudSync.accountSwitched"));
        if (current && options.preferLocalNodeId) {
            // Text modal drafts are journaled without publishing to the canvas.
            // Preserve them too before an explicit choice can replace cloud text.
            const journal = await readCanvasReloadDraft(id, scope);
            if (epoch !== sessionEpoch) throw new Error(currentLocaleText("canvasExtra.cloudSync.accountSwitched"));
            await preserveCanvasSyncDraft(current, scope);
            await preserveCanvasSyncDraft(project, scope);
            if (journal) await preserveCanvasSyncDraft(journal.project, scope);
        }
        let projected: CanvasProject = project;
        if (current && (cachedDirty || !sameCanvasContent(baseline, current)) && !sameCanvasContent(current, project)) {
            // Agent 事件回放可能在本地修改尚未保存时请求快照：云端仍是已核对的同一个祖先版本，
            // 说明这不是云端并发编辑，只需把本地修改排队保存，而不是报冲突、存草稿。
            if (!cachedDirty && current.revision === project.revision && baseline?.revision === project.revision && sameCanvasContent(baseline, project)) {
                useSyncProgressStore.getState().setProjectProgress(id, { phase: "pending", message: currentLocaleText("canvasExtra.cloudSync.changesPending") });
                scheduleRemoteUserDataSync();
                return current;
            }
            // 本地与 Agent 改的是不同节点/字段时，把云端快照三方合并到本地编辑上；同一字段双方都改才算冲突。
            try {
                if (!baseline || (cachedDirty && !baselineClean)) throw new Error("missing merge baseline");
                const chosen = options.preferLocalNodeId;
                const beforeNode = baseline.nodes.find((node) => node.id === chosen);
                const remoteNode = project.nodes.find((node) => node.id === chosen);
                const localNode = current.nodes.find((node) => node.id === chosen);
                if (chosen && beforeNode && remoteNode && localNode) {
                    const resolved = resolveCanvasNodeDraft(beforeNode, remoteNode, localNode);
                    const ancestor = { ...baseline, nodes: baseline.nodes.map((node) => (node.id === chosen ? remoteNode : node)) };
                    const local = { ...current, nodes: current.nodes.map((node) => (node.id === chosen ? resolved : node)) };
                    projected = mergeAgentCanvasEditor(ancestor, project, local.nodes, local.connections, local);
                } else projected = mergeAgentCanvasEditor(baseline, project, current.nodes, current.connections, current);
            } catch {
                await preserveAgentConflict(current);
                throw new Error(currentLocaleText("canvasExtra.cloudSync.agentConflict"));
            }
        }
        const hash = await canvasContentHash(project);
        projected = { ...projected, nodes: shareUnchangedCanvasNodes(current?.nodes, projected.nodes), viewport: current?.viewport || project.viewport, remoteContentHash: hash };
        if (epoch !== sessionEpoch || useCanvasStore.getState().openProject(id) !== (current || null)) throw new Error(currentLocaleText("canvasExtra.cloudSync.stillUpdatingAgent"));
        try {
            if (!sameCanvasContent(current, projected)) {
                for (const listener of agentCanvasListeners) listener(projected, current, options);
            }
        } catch (error) {
            if (current) await preserveAgentConflict(current);
            throw error;
        }
        acknowledgeProject(id, { ...project, viewport: projected.viewport, remoteContentHash: hash });
        verifiedProjects.add(id);
        useCanvasStore.setState((state) => ({ projects: [...state.projects.filter((candidate) => candidate.id !== id), projected] }));
        await flushCanvasStorePersistence();
        const pending = !sameCanvasContent(project, projected);
        useSyncProgressStore.getState().setProjectProgress(id, { phase: pending ? "pending" : "done", message: currentLocaleText(pending ? "canvasExtra.cloudSync.agentMergedPending" : "canvasExtra.cloudSync.agentSynced") });
        if (pending) scheduleRemoteUserDataSync();
        return projected;
    });
}

export async function applyAgentCanvasPatches(id: string, patches: AgentCanvasPatch[]) {
    const epoch = sessionEpoch;
    return withRemoteUserDataSyncExclusive(async () => {
        if (epoch !== sessionEpoch || !activeRemoteUserId) throw new Error(runtimeText("creationRuntime.syncAccountChanged"));
        const baseline = acknowledgedProjects.get(id);
        const current = useCanvasStore.getState().projects.find((project) => project.id === id);
        if (!baseline || !current) throw new Error(runtimeText("creationRuntime.syncBaselineMissing"));
        let remote = baseline;
        let projected = current;
        // 增量被拒（版本不连续、基线变化等）时抛错，由 agent-canvas-sync 转去取快照对账；
        // 只有快照对账能区分“事件回放”与真正的并发冲突，这里不再直接存冲突草稿。
        if (incrementalSession && !verifiedProjects.has(id) && baseline.remoteContentHash !== (await canvasContentHash(baseline))) throw new Error(currentLocaleText("canvasExtra.cloudSync.cacheUnverified"));
        if (current.revision !== baseline.revision || !Number.isSafeInteger(baseline.revision)) throw new Error(currentLocaleText("canvasExtra.cloudSync.baselineChanged"));
        // SSE 重连可能乱序或重复投递同一增量：先按版本排序去重，再要求逐版连续。
        const orderedPatches: AgentCanvasPatch[] = [];
        const seenRevisions = new Set<number>();
        for (const patch of [...patches].sort((left, right) => (left.revision ?? 0) - (right.revision ?? 0))) {
            if (!Number.isSafeInteger(patch.revision) || !Number.isSafeInteger(patch.baseRevision)) throw new Error(currentLocaleText("canvasExtra.cloudSync.agentPatchNoRevision"));
            if (seenRevisions.has(patch.revision!)) continue;
            seenRevisions.add(patch.revision!);
            orderedPatches.push(patch);
        }
        for (const patch of orderedPatches) {
            if (patch.revision! <= remote.revision!) continue;
            if (patch.baseRevision !== remote.revision || patch.revision !== patch.baseRevision! + 1) throw new Error(currentLocaleText("canvasExtra.cloudSync.agentPatchGap"));
            remote = { ...applyAgentCanvasPatch(remote, patch), revision: patch.revision };
            projected = { ...applyAgentCanvasPatch(projected, patch), revision: patch.revision };
        }
        if (projected === current) return current;
        const hash = await canvasContentHash(remote);
        if (epoch !== sessionEpoch || useCanvasStore.getState().openProject(id) !== current) throw new Error(currentLocaleText("canvasExtra.cloudSync.stillUpdatingAgent"));
        remote = { ...remote, remoteContentHash: hash };
        projected = { ...projected, remoteContentHash: hash };
        if (!sameCanvasContent(projected, current)) {
            for (const listener of agentCanvasListeners) listener(projected, current);
        }
        acknowledgeProject(id, remote);
        verifiedProjects.add(id);
        if (projected === current) return current;
        useCanvasStore.setState((state) => ({ projects: state.projects.map((project) => (project.id === id ? projected : project)) }));
        await flushCanvasStorePersistence();
        useSyncProgressStore.getState().setProjectProgress(id, { phase: sameCanvasContent(remote, projected) ? "done" : "pending", message: currentLocaleText("canvasExtra.cloudSync.agentSynced") });
        return projected;
    });
}

async function preserveAgentConflict(project: CanvasProject) {
    useSyncProgressStore.getState().setProjectProgress(project.id, { phase: "conflict", message: currentLocaleText("canvasExtra.cloudSync.conflictKeepDraft") });
    const draftCount = await preserveCanvasSyncDraft(project);
    useSyncProgressStore.getState().setProjectProgress(project.id, { draftCount });
}

async function waitForRemoteProjectLoads() {
    const pending = [...remoteProjectLoadPromises.values()];
    if (pending.length) await Promise.all(pending);
}

export async function loadAssetLibraryPage(options: Parameters<typeof listRemoteAssetsPage>[0]) {
    const epoch = sessionEpoch;
    const result = await listRemoteAssetsPage(options);
    let resolved: ReturnType<typeof resolveRemoteAssetPage>;
    await withRemoteUserDataSyncExclusive(async () => {
        if (options.signal?.aborted) throw new DOMException("The operation was aborted", "AbortError");
        if (epoch !== sessionEpoch) throw new Error(runtimeText("creationRuntime.reloadAssets"));
        resolved = resolveRemoteAssetPage(result.assets, useAssetStore.getState().assets);
        await acceptRemoteAssets(resolved.assets);
    });
    return { ...result, ...resolved! };
}

async function acceptRemoteAssets(remoteAssets: Asset[]) {
    const assets = parseAssetRecordList(remoteAssets);
    const bases = [...acknowledgedAssets.values()];
    const current = new Map(useAssetStore.getState().assets.map((asset) => [asset.id, asset]));
    for (const asset of assets) {
        const local = current.get(asset.id);
        const base = verifiedAssets.has(asset.id) ? acknowledgedAssets.get(asset.id) : undefined;
        acknowledgedAssets.set(asset.id, asset);
        verifiedAssets.add(asset.id);
        current.set(asset.id, local && !sameEntitySnapshot(base, local) ? (base ? mergeAssetContent(base, local, asset) : (mergeProtectedFields(asset, local) as Asset)) : asset);
    }
    const previous = useAssetStore.getState().assets;
    const next = shareUnchangedAssets(previous, [...current.values()]);
    if (next !== previous) useAssetStore.setState({ assets: next });
    await applyRemoteAssetRecords(
        assets.map((asset) => current.get(asset.id)!),
        getActiveUserScope(),
        bases,
    );
    void rememberAcknowledgedAssetIds(assets.map((asset) => asset.id));
}

async function readAcknowledgedAssetIds(scope: string) {
    const raw = await localForageStorageForScope(scope).getItem(ACKNOWLEDGED_ASSET_IDS_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : []);
}

// 读改写串行执行，避免并发记录互相覆盖。记录失败只会让某个云端已删除的素材在下次登录时
// 被当作未上传素材保留，不能因此中断同步。
let acknowledgedAssetIdWrites: Promise<void> = Promise.resolve();

function updateAcknowledgedAssetIds(scope: string, update: (known: Set<string> | null) => Set<string> | null) {
    const write = acknowledgedAssetIdWrites.then(async () => {
        try {
            const next = update(await readAcknowledgedAssetIds(scope));
            if (next) await localForageStorageForScope(scope).setItem(ACKNOWLEDGED_ASSET_IDS_KEY, JSON.stringify([...next]));
        } catch (error) {
            console.warn("记录云端已确认素材失败", error);
        }
    });
    acknowledgedAssetIdWrites = write;
    return write;
}

function rememberAcknowledgedAssetIds(ids: string[], scope = getActiveUserScope()) {
    if (!ids.length) return Promise.resolve();
    return updateAcknowledgedAssetIds(scope, (known) => {
        const next = new Set(known);
        for (const id of ids) next.add(id);
        return known && next.size === known.size ? null : next;
    });
}

function collectAssetIds(value: unknown, ids = new Set<string>()): Set<string> {
    if (!value || typeof value !== "object") return ids;
    for (const [key, child] of Object.entries(value)) {
        if (key === "assetId" && typeof child === "string" && child) ids.add(child);
        else if (child && typeof child === "object") collectAssetIds(child, ids);
    }
    return ids;
}

function checkAssetLoadAbort(signal?: AbortSignal) {
    if (signal?.aborted) throw new DOMException("The operation was aborted", "AbortError");
}

async function loadReferencedAssets(ids: Iterable<string>, signal?: AbortSignal) {
    const pending = [...new Set(ids)].filter((id) => !verifiedAssets.has(id));
    for (let offset = 0; offset < pending.length; offset += 100) {
        checkAssetLoadAbort(signal);
        const { assets } = await getRemoteAssetsByIds(pending.slice(offset, offset + 100), signal);
        checkAssetLoadAbort(signal);
        await acceptRemoteAssets(assets);
    }
}

export async function loadAssetsForUse(ids: Iterable<string>, signal?: AbortSignal) {
    const epoch = sessionEpoch;
    const requestedIds = [...new Set(ids)];
    await withRemoteUserDataSyncExclusive(async () => {
        checkAssetLoadAbort(signal);
        if (epoch !== sessionEpoch) throw new Error(runtimeText("creationRuntime.reloadAssets"));
        if (activeRemoteUserId) await loadReferencedAssets(requestedIds, signal);
        checkAssetLoadAbort(signal);
        const available = new Set(useAssetStore.getState().assets.map((asset) => asset.id));
        if (requestedIds.some((id) => !available.has(id) || (activeRemoteUserId && !verifiedAssets.has(id)))) throw new Error(runtimeText("creationRuntime.assetsUnavailable"));
    });
}

// Used inside the sync lock as well as by generation consumers. Only assets are
// refreshed: rehydrating the entire workspace here could overwrite live edits.
function canvasAssetLoader(exclusive: boolean) {
    const epoch = sessionEpoch;
    const checkSession = (readSignal: AbortSignal) => {
        checkAssetLoadAbort(readSignal);
        if (epoch !== sessionEpoch) throw new DOMException("The operation was aborted", "AbortError");
    };
    const read = (operation: () => Promise<void>) => (exclusive ? withRemoteUserDataSyncExclusive(operation) : operation());
    return {
        readAssets: () => {
            if (epoch !== sessionEpoch) throw new DOMException("The operation was aborted", "AbortError");
            return useAssetStore.getState().assets;
        },
        loadAssets: (ids: string[], readSignal: AbortSignal) =>
            exclusive
                ? loadAssetsForUse(ids, readSignal)
                : read(async () => {
                      checkSession(readSignal);
                      if (activeRemoteUserId) await loadReferencedAssets(ids, readSignal);
                      checkSession(readSignal);
                  }),
        refreshAssets: (readSignal: AbortSignal) =>
            read(async () => {
                checkSession(readSignal);
                if (!activeRemoteUserId) return;
                const snapshot = await getRemoteUserDataSnapshot(readSignal);
                checkSession(readSignal);
                await acceptRemoteAssets(snapshot.assets);
            }),
    };
}

export function loadCanvasNodeAssetForUse(node: CanvasNodeData, canvasId: string, taskId?: string, signal?: AbortSignal) {
    // Acquire the lock per read, so a pending account switch is not held up by backoff.
    return resolveCanvasNodeAsset({ node, canvasId, taskId, signal }, canvasAssetLoader(true));
}

const LOCAL_STORAGE_KEY_PATTERN = /^(image|video|audio|file|video-reference|audio-reference):/;

export async function syncRemoteUserData(userId?: string | null, snapshotRead?: ReturnType<typeof getRemoteUserDataSnapshot>, options: { yieldBeforeMerge?: boolean } = {}) {
    const requestedEpoch = sessionEpoch;
    const requestedScope = getActiveUserScope();
    // 登录/切换账号时，服务端快照建立新的远端基线；本地 IndexedDB 只负责首屏缓存，
    // 不能把服务端已经删除或当前用户无权访问的实体重新补回去。后续增量保存必须基于这份基线做冲突校验。
    await withRemoteUserDataSyncExclusive(async () => {
        if (requestedEpoch !== sessionEpoch || requestedScope !== getActiveUserScope()) throw new DOMException("Account changed", "AbortError");
        incrementalSession = false;
        activeRemoteUserId = userId || "";
        acknowledgedProjects.clear();
        acknowledgedAssets.clear();
        if (!activeRemoteUserId) {
            remoteUserDataPhase = "inactive";
            return;
        }
        remoteUserDataPhase = "hydrating";
        const scope = getActiveUserScope();
        const epoch = sessionEpoch;
        const initialAssets = new Map(useAssetStore.getState().assets.map((asset) => [asset.id, asset]));
        try {
            // Keep our place in the identity queue, but give login navigation
            // a task boundary before hashing and archiving large local stores.
            if (options.yieldBeforeMerge) await new Promise<void>((resolve) => setTimeout(resolve, 0));
            // 登录只拉一次聚合快照。摘要列表再逐条请求详情会把 N 条数据放大成 2N+2 个请求，
            // 并且会在登录阶段同时触发大量媒体解析，任何一项失败都会污染登录结果。
            const snapshot = await (snapshotRead ?? getRemoteUserDataSnapshot());
            if (epoch !== sessionEpoch || scope !== getActiveUserScope()) throw new DOMException("Account changed", "AbortError");
            await acknowledgedAssetIdWrites;
            const acknowledgedAssetIds = await readAcknowledgedAssetIds(scope).catch(() => null);
            const localProjects = useCanvasStore.getState().projects;
            const remoteById = new Map(snapshot.projects.map((project) => [project.id, project]));
            // Revision zero is an explicit never-uploaded canvas, not a cloud
            // deletion. Keep it active across reloads so reconnection can retry.
            const unsyncedProjects = localProjects.filter((project) => project.revision === 0 && !remoteById.has(project.id));
            // Archive unsynced work before replacing the active cache, including deleted remote canvases.
            for (const local of localProjects) {
                if (unsyncedProjects.includes(local)) continue;
                const clean = local.remoteContentHash && local.remoteContentHash === (await canvasContentHash(local));
                if (!clean && !sameCanvasContent(local, remoteById.get(local.id))) await preserveCanvasSyncDraft(local, scope);
            }
            const draftCounts = new Map<string, number>();
            const projects = await Promise.all(
                snapshot.projects.map(async (project) => {
                    const local = localProjects.find((item) => item.id === project.id);
                    draftCounts.set(project.id, (await readCanvasSyncDrafts(project.id)).length);
                    return { ...project, viewport: local?.viewport || project.viewport || { x: 0, y: 0, k: 1 }, remoteContentHash: await canvasContentHash(project) };
                }),
            );
            if (epoch !== sessionEpoch || scope !== getActiveUserScope()) throw new DOMException("Session transition superseded", "AbortError");
            if (useCanvasStore.getState().projects !== localProjects) throw new Error(currentLocaleText("canvasExtra.cloudSync.localStillUpdating"));
            useCanvasStore.getState().replaceProjects([...projects, ...unsyncedProjects]);
            // 与 store 写入时同样归一化；否则已确认快照与 store 中同一素材序列化不同，每次登录都会被当作改动重传。
            const snapshotAssets = resolveRemoteAssetPage(snapshot.assets, useAssetStore.getState().assets, (error) => console.warn("云端素材格式异常，已跳过", error)).assets.map(normalizeAssetRecord);
            const snapshotAssetIds = new Set(snapshotAssets.map((asset) => asset.id));
            // 从未被云端确认过的本地素材（离线导入、上传失败后刷新）不是云端删除：保留下来，基线建立后补传。
            const unsyncedAssets = useAssetStore.getState().assets.filter((asset) => !snapshotAssetIds.has(asset.id) && (acknowledgedAssetIds ? !acknowledgedAssetIds.has(asset.id) : needsOriginalUpload(asset)));
            // The workspace can be edited while the baseline loads. Preserve
            // those new edits even for previously acknowledged asset IDs; the
            // untouched remote snapshot remains the acknowledgement for saving.
            const editedAssets = useAssetStore.getState().assets.filter((asset) => !sameEntitySnapshot(initialAssets.get(asset.id), asset));
            const mergedAssets = new Map([...snapshotAssets, ...unsyncedAssets, ...editedAssets].map((asset) => [asset.id, asset]));
            useAssetStore.getState().replaceAssets([...mergedAssets.values()]);
            // Validate the snapshot's archive fields; edits made during the baseline load stay local.
            const editedAssetIds = new Set(editedAssets.map((asset) => asset.id));
            await applyRemoteAssetRecords(
                snapshotAssets.filter((asset) => !editedAssetIds.has(asset.id)),
                scope,
            );
            const installedProjects = useCanvasStore.getState().projects;
            const installedAssets = useAssetStore.getState().assets;
            await Promise.all([flushCanvasStorePersistence(), flushAssetStorePersistence()]);
            if (epoch !== sessionEpoch || scope !== getActiveUserScope()) throw new DOMException("Session transition superseded", "AbortError");
            await updateAcknowledgedAssetIds(scope, () => snapshotAssetIds);
            if (epoch !== sessionEpoch || scope !== getActiveUserScope()) throw new DOMException("Session transition superseded", "AbortError");
            acknowledgedProjects = new Map(projects.map((project) => [project.id, project]));
            for (const project of projects) invalidateBootCanvasSeed(activeRemoteUserId, project.id);
            acknowledgedAssets = new Map(snapshotAssets.map((asset) => [asset.id, asset]));
            remoteUserDataPhase = "ready";
            baselineRetryAttempt = 0;
            startOriginalRecovery();
            // 基线真正建立后才能显示“已保存到云端”。
            for (const project of projects) {
                useSyncProgressStore.getState().setProjectProgress(project.id, { phase: "done", draftCount: draftCounts.get(project.id), message: currentLocaleText("canvasExtra.cloudSync.savedToCloud") });
            }
            for (const project of unsyncedProjects) {
                useSyncProgressStore.getState().setProjectProgress(project.id, { phase: "pending", message: currentLocaleText("canvasExtra.cloudSync.draftPending") });
            }
            if (unsyncedProjects.length || unsyncedAssets.length || editedAssets.length || useCanvasStore.getState().projects !== installedProjects || useAssetStore.getState().assets !== installedAssets) scheduleRemoteUserDataSync();
        } catch (error) {
            if (epoch !== sessionEpoch || scope !== getActiveUserScope()) throw error;
            remoteUserDataPhase = "failed";
            scheduleRemoteUserDataBaselineRetry(activeRemoteUserId);
            throw error;
        }
    });
}

function scheduleRemoteUserDataBaselineRetry(userId: string) {
    if (!userId || typeof window === "undefined" || baselineRetryAttempt >= REMOTE_SYNC_RETRY_DELAYS_MS.length) return;
    const epoch = sessionEpoch;
    const delayMs = REMOTE_SYNC_RETRY_DELAYS_MS[baselineRetryAttempt];
    baselineRetryAttempt += 1;
    if (syncTimer) window.clearTimeout(syncTimer);
    syncTimer = window.setTimeout(() => {
        syncTimer = null;
        if (epoch !== sessionEpoch || activeRemoteUserId !== userId || remoteUserDataPhase !== "failed") return;
        void syncRemoteUserData(userId).catch((error) => console.warn("云端数据基线重试失败", error));
    }, delayMs);
}

export function installRemoteUserDataAutoSync(): () => void {
    if (stopAutoSync) return stopAutoSync;
    const stopProjects = useCanvasStore.subscribe((state, previous) => {
        if (state.projects === previous.projects) return;
        const before = new Map(previous.projects.map((project) => [project.id, project]));
        const changed = state.projects.filter((project) => !sameCanvasContent(before.get(project.id), project));
        if (!changed.length && state.projects.length === previous.projects.length) return;
        if (remoteUserDataPhase === "ready") {
            for (const project of changed) {
                if (sameCanvasContent(acknowledgedProjects.get(project.id), project)) continue;
                if (useSyncProgressStore.getState().syncingProjects[project.id]?.phase === "conflict") continue;
                useSyncProgressStore.getState().setProjectProgress(project.id, { phase: "pending", reason: undefined, message: currentLocaleText("canvasExtra.cloudSync.changesPending") });
            }
        }
        scheduleRemoteUserDataSync();
    });
    const stopAssets = useAssetStore.subscribe((state, previous) => {
        if (state.assets !== previous.assets) {
            scheduleRemoteUserDataSync();
            originalRecovery?.wake();
        }
    });
    const onOnline = () => {
        // Retry exhausted offline saves/baselines only for the current session.
        syncRetryAttempt = 0;
        baselineRetryAttempt = 0;
        if (activeRemoteUserId && remoteUserDataPhase === "failed") {
            void syncRemoteUserData(activeRemoteUserId).catch((error) => console.warn("云端数据基线重连失败", error));
        } else scheduleRemoteUserDataSync();
    };
    if (typeof window !== "undefined") window.addEventListener?.("online", onOnline);
    const dispose = () => {
        if (stopAutoSync !== dispose) return;
        stopProjects();
        stopAssets();
        if (typeof window !== "undefined") window.removeEventListener?.("online", onOnline);
        stopAutoSync = undefined;
        if (syncTimer !== null) {
            if (typeof window !== "undefined") window.clearTimeout(syncTimer);
            syncTimer = null;
        }
    };
    stopAutoSync = dispose;
    return dispose;
}

export function resetRemoteUserDataSync() {
    stopAssetOriginalRecovery();
    sessionEpoch += 1;
    resourcesMissingFailures.clear();
    projectSyncErrors.clear();
    incrementalSession = false;
    verifiedProjects.clear();
    verifiedAssets.clear();
    remoteProjectLoadPromises.clear();
    newlyCreatedCanvasIds.clear();
    blankCanvasDraftSnapshots.clear();
    activeRemoteUserId = "";
    remoteUserDataPhase = "inactive";
    acknowledgedAssets.clear();
    acknowledgedProjects.clear();
    if (syncTimer) {
        window.clearTimeout(syncTimer);
        syncTimer = null;
    }
    syncRetryAttempt = 0;
    baselineRetryAttempt = 0;
    syncQueued = false;
    useSyncProgressStore.getState().clearAll();
}

export function hasRemoteUserDataSyncSession() {
    return Boolean(activeRemoteUserId) && remoteUserDataPhase === "ready";
}

/**
 * 串行执行用户数据同步、账号切换和登出相关的远端操作。
 *
 * 前一个操作失败只影响它自己，不能让后续操作永远停在 rejected tail；当前操作的
 * 结果仍原样返回，由调用方决定如何提示或重试，避免同步层把写入失败伪装成成功。
 */
export function withRemoteUserDataSyncExclusive<T>(operation: () => Promise<T>): Promise<T> {
    const pending = remoteOperationTail
        .then(
            () => undefined,
            () => undefined,
        )
        .then(operation);
    remoteOperationTail = pending.then(
        () => undefined,
        () => undefined,
    );
    return pending;
}

export function scheduleRemoteUserDataSync() {
    if (!activeRemoteUserId || remoteUserDataPhase !== "ready") return;
    if (syncPromise) {
        syncQueued = true;
        return;
    }
    if (syncTimer) window.clearTimeout(syncTimer);
    syncTimer = window.setTimeout(() => {
        syncTimer = null;
        void saveRemoteUserDataNow().catch((error) => console.warn("云端自动同步失败", error));
    }, 1200);
}

export function formatLocalSavedRemotePending(localAction: string, error: unknown): string {
    const detail = error instanceof Error && error.message.trim() ? error.message.trim() : currentLocaleText("canvasFeedback.unknownError");
    if (isCanvasResourcesMissing(error)) {
        return currentLocaleText("canvasExtra.cloudSync.resourcesMissingPaused", { action: localAction, detail });
    }
    if (error instanceof ApiError && (error.status === 409 || error.status === 428)) {
        return currentLocaleText("canvasExtra.cloudSync.pausedPending", { action: localAction, detail });
    }
    return currentLocaleText("runtimeSafety.syncRetryPending", { action: localAction, detail });
}

/** 本地写已成功、云端同步失败：排队同一幂等重试，并返回可直接展示的 warning。不得回滚本地写，也不得说成已保存到云端。 */
export function localSavedRemotePendingMessage(localAction: string, error: unknown): string {
    scheduleRemoteUserDataSync();
    return formatLocalSavedRemotePending(localAction, error);
}

export function createCanvasProjectWithDeferredRemoteSync(
    title: string,
    projectId?: string,
    initialContent?: Partial<Pick<CanvasProject, "appearance" | "backgroundMode" | "folderPresentation" | "nodes" | "connections" | "chatSessions" | "activeChatId" | "importSource" | "viewport" | "starterMode" | "directorScenes">>,
    syncDelayMs = 120,
) {
    const id = useCanvasStore.getState().createProject(title, projectId);
    if (initialContent) useCanvasStore.getState().updateProject(id, initialContent);
    const created = useCanvasStore.getState().openProject(id);
    if (created && isReusableBlankCanvas(created)) blankCanvasDraftSnapshots.set(id, created);
    if (syncDelayMs > 0) newlyCreatedCanvasIds.add(id);
    const createdScope = getActiveUserScope();
    const createdEpoch = sessionEpoch;
    const sync = new Promise<{ syncError: unknown }>((resolve) => {
        // Let route rendering paint before walking and hashing the canvas store.
        globalThis.setTimeout(() => {
            void (async () => {
                if (createdEpoch !== sessionEpoch || createdScope !== getActiveUserScope()) return { syncError: new Error(runtimeText("creationRuntime.newCanvasAccountChanged")) };
                if (!activeRemoteUserId) return { syncError: createdScope === "guest" ? undefined : new Error(runtimeText("canvasExtra.handoff.syncMissing")) };
                try {
                    await saveRemoteUserDataNow(id);
                    return { syncError: undefined };
                } catch (syncError) {
                    scheduleRemoteUserDataSync();
                    return { syncError };
                }
            })().then(resolve);
        }, syncDelayMs);
    });
    return { id, sync };
}

/** 完全空白、未关联项目、未导入案例的画布可以直接复用：用户反复点“新建画布”时不再堆出一串空画布。 */
export function isReusableBlankCanvas(project: CanvasProject) {
    return (
        !project.projectId &&
        !project.importSource &&
        project.nodes.length === 0 &&
        project.connections.length === 0 &&
        !project.directorScenes?.length &&
        !project.timeline?.clips?.length &&
        project.chatSessions.every((session) => !session.messages.length && !session.pendingBackendSession)
    );
}

function isLocalBlankCanvasDraft(project: CanvasProject) {
    const createdAt = blankCanvasDraftSnapshots.get(project.id);
    return (
        Boolean(createdAt) &&
        !acknowledgedProjects.has(project.id) &&
        !(project.revision && project.revision > 0) &&
        isReusableBlankCanvas(project) &&
        !project.folderPresentation &&
        sameCanvasContent(createdAt, project) &&
        !useAssetStore.getState().assets.some((asset) => asset.archiveCanvasId === project.id)
    );
}

/** 新建空白画布的统一入口：优先打开最近一张空白画布，没有才新建；新画布沿用用户上次选择的起步方式。 */
export function openOrCreateBlankCanvas(title: string, options: { excludeId?: string } = {}) {
    const reusable = useCanvasStore
        .getState()
        .projects.filter((project) => project.id !== options.excludeId && isReusableBlankCanvas(project))
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
    if (reusable) return { id: reusable.id, sync: Promise.resolve({ syncError: undefined as unknown }), reused: true };
    const starterMode = preferredStarterMode();
    return { ...createCanvasProjectWithDeferredRemoteSync(title, undefined, starterMode ? { starterMode } : undefined), reused: false };
}

export async function createCanvasProjectWithRemoteSync(
    title: string,
    projectId?: string,
    initialContent?: Partial<Pick<CanvasProject, "appearance" | "backgroundMode" | "folderPresentation" | "nodes" | "connections" | "chatSessions" | "activeChatId" | "importSource" | "viewport" | "starterMode" | "directorScenes">>,
) {
    const { id, sync } = createCanvasProjectWithDeferredRemoteSync(title, projectId, initialContent, 0);
    return { id, ...(await sync) };
}

export async function deleteAssetWithRemoteSync(id: string) {
    const epoch = sessionEpoch;
    const assetId = id.trim();
    if (!assetId) throw new Error(runtimeText("creationRuntime.assetIdRequired"));
    await withRemoteUserDataSyncExclusive(async () => {
        if (epoch !== sessionEpoch) throw new Error(runtimeText("creationRuntime.deleteAssetAccountChanged"));
        if (!activeRemoteUserId) await assertAssetNotUsedAsCanvasCover(assetId);
        if (activeRemoteUserId) {
            requireRemoteUserDataBaseline();
            await deleteRemoteAsset(assetId);
            if (epoch !== sessionEpoch) throw new DOMException("Account changed", "AbortError");
            acknowledgedAssets.delete(assetId);
        }
        await useAssetStore.getState().removeAsset(assetId);
        await flushAssetStorePersistence();
        void appQueryClient.invalidateQueries({ queryKey: ["asset-library"] });
        void appQueryClient.invalidateQueries({ queryKey: ["canvas-library"] });
    });
}

export async function deleteCanvasProjectsWithRemoteSync(ids: string[]) {
    const epoch = sessionEpoch;
    const projectIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
    const counts: CanvasDeletePreflightResponse = { archivedAssetCount: 0, unregisteredMediaCount: 0, toUnfiledCount: 0, blocked: [] };
    if (!projectIds.length) return counts;
    if (incrementalSession) {
        for (const id of projectIds) {
            // Preloading only supplies a complete canvas for recovery history. Historical
            // asset validation/loading failures must not make a canvas impossible to delete.
            await loadCanvasProjectForEditing(id).catch((error) => console.warn("Failed to preload canvas before deletion", error));
        }
    }
    await withRemoteUserDataSyncExclusive(async () => {
        if (epoch !== sessionEpoch) throw new Error(runtimeText("creationRuntime.deleteCanvasAccountChanged"));
        if (activeRemoteUserId) requireRemoteUserDataBaseline();
        const currentProjects = useCanvasStore.getState().projects;
        // Resolve known remote assets first: an unloaded resource must not fork into a second asset.
        for (const project of currentProjects) {
            if (!projectIds.includes(project.id)) continue;
            for (const node of project.nodes) {
                if (!canvasNodeResourceIdentity(node)?.startsWith("resource:") || requiresMaterializedCanvasAsset(node)) continue;
                await resolveCanvasNodeAsset({ node, canvasId: project.id }, canvasAssetLoader(false));
            }
        }
        const projectById = new Map(currentProjects.map((project) => [project.id, project]));
        const deletedProjectObjects: CanvasProject[] = [];
        let deletionError: unknown;
        for (const id of projectIds) {
            try {
                if (epoch !== sessionEpoch) throw new DOMException("Account changed", "AbortError");
                // Register local-only media durably before the server deletes its canvas.
                const registration = await commitAssetArchiveCommand((assets) => {
                    const plan = localCanvasDeletePlan([id], currentProjects, assets);
                    if (plan.counts.blocked.length) throw new AssetArchiveCommandError("media-unavailable");
                    const now = new Date().toISOString();
                    const registered = plan.media.map((media) => normalizeAssetRecord({ ...media.asset, category: media.asset.category ?? defaultAssetCategoryForKind(media.asset.kind), id: nanoid(), createdAt: now, updatedAt: now } as Asset));
                    const retained = [...assets, ...registered];
                    // A retry must also upload media registered by an earlier failed attempt.
                    const ids = retained.filter((asset) => asset.sourceCode === "deleted-canvas" && asset.originCanvasId === id && !sameEntitySnapshot(acknowledgedAssets.get(asset.id), asset)).map((asset) => asset.id);
                    return { assets: retained, result: { counts: plan.counts, ids } };
                });
                if (activeRemoteUserId && registration.ids.length) {
                    for (const assetId of registration.ids) {
                        const source = useAssetStore.getState().assets.find((asset) => asset.id === assetId)!;
                        const payload = await ensureRemoteResourceReferences(assetForRemoteSync(source), new Map(), undefined, true);
                        const response = await upsertRemoteAsset(payload);
                        if (epoch !== sessionEpoch) throw new DOMException("Account changed", "AbortError");
                        await applyRemoteAssetRecords([response.asset], getActiveUserScope(), [source], true);
                        acknowledgedAssets.set(assetId, mergeRemoteAssetRecord(response.asset, source, source, true));
                        verifiedAssets.add(assetId);
                        await rememberAcknowledgedAssetIds([assetId]);
                    }
                }
                if (activeRemoteUserId) {
                    const actual = await deleteRemoteCanvasProject(id);
                    if (epoch !== sessionEpoch) throw new DOMException("Account changed", "AbortError");
                    counts.archivedAssetCount += actual.archivedAssetCount ?? 0;
                    counts.unregisteredMediaCount += actual.unregisteredMediaCount ?? 0;
                    counts.toUnfiledCount += actual.toUnfiledCount ?? 0;
                    counts.blocked.push(...(actual.blocked ?? []));
                    // These local-only records were already made unfiled before the
                    // server recomputed its counts, so they cannot appear there again.
                    counts.unregisteredMediaCount += registration.counts.unregisteredMediaCount;
                    counts.toUnfiledCount += registration.counts.unregisteredMediaCount;
                    acknowledgedProjects.delete(id);
                }
                // Recompute from durable assets under the same lock as registration and clearing.
                // A second tab/retry then sees registered media instead of creating another copy.
                const localCounts = await commitAssetArchiveCommand((assets) => {
                    return { assets: assets.map((asset) => (asset.archiveCanvasId === id ? setAssetPrimaryLocation(asset, { kind: "unfiled" }) : asset)), result: activeRemoteUserId ? undefined : registration.counts };
                });
                if (localCounts) {
                    counts.archivedAssetCount += localCounts.archivedAssetCount;
                    counts.unregisteredMediaCount += localCounts.unregisteredMediaCount;
                    counts.toUnfiledCount += localCounts.toUnfiledCount;
                }
                for (const [assetId, asset] of acknowledgedAssets) if (asset.archiveCanvasId === id) acknowledgedAssets.set(assetId, setAssetPrimaryLocation(asset, { kind: "unfiled" }));
                useCanvasStore.getState().deleteProjects([id]);
                // 批量删除允许部分成功；每个已成功远端删除的实体都立即落实到本地 durable cache。
                await flushCanvasStorePersistence();
                const project = projectById.get(id);
                if (project) deletedProjectObjects.push(project);
            } catch (error) {
                deletionError = error;
                break;
            }
        }
        if (deletedProjectObjects.length > 0) useCanvasHistoryStore.getState().recordDeletedProjects(deletedProjectObjects);
        void appQueryClient.invalidateQueries({ queryKey: ["canvas-library"] });
        void appQueryClient.invalidateQueries({ queryKey: ["asset-library"] });
        if (deletionError) throw deletionError;
    });
    return counts;
}

export async function saveRemoteUserDataNow(input?: string | readonly string[] | { force?: boolean; repairProjectId?: string }) {
    const projectId = typeof input === "string" || Array.isArray(input) ? (input as string | readonly string[]) : undefined;
    const options = input && typeof input === "object" && !Array.isArray(input) ? (input as { force?: boolean; repairProjectId?: string }) : {};
    const epoch = sessionEpoch;
    if (!activeRemoteUserId) throw new Error(currentLocaleText("canvasExtra.cloudSync.noSession"));
    requireRemoteUserDataBaseline();
    const assertNoConflict = () => {
        const ids = projectId === undefined ? useCanvasStore.getState().projects.map((project) => project.id) : typeof projectId === "string" ? [projectId] : projectId;
        if (ids.some((id) => useSyncProgressStore.getState().syncingProjects[id]?.phase === "conflict")) {
            throw new ApiError(currentLocaleText("canvasExtra.cloudSync.conflictKeepDraft"), { status: 409 });
        }
    };
    // 指定画布时只报告与这些画布有关的失败：其它画布或素材的错误不能让调用方误判
    // （例如导入流程据此撤掉一张其实已保存到云端的画布）。
    const requestedError = (error: unknown) => {
        if (projectId === undefined) return error;
        const ids = typeof projectId === "string" ? [projectId] : [...projectId];
        const unsaved = ids.filter((id) => {
            const live = useCanvasStore.getState().openProject(id);
            return live && !sameCanvasContent(acknowledgedProjects.get(id), live);
        });
        if (!unsaved.length) return undefined;
        return unsaved.map((id) => projectSyncErrors.get(id)).find((own) => own !== undefined) ?? error;
    };
    if (projectId !== undefined) assertNoConflict();
    await waitForRemoteProjectLoads();
    if (syncPromise) {
        syncQueued = true;
        try {
            await syncPromise;
        } catch (error) {
            const reported = requestedError(error);
            if (reported !== undefined) throw reported;
        }
        // The in-flight drain may have started before this explicit repair/force
        // request. Re-enter after it settles so the user's intent is not lost.
        if (options.force || options.repairProjectId) return saveRemoteUserDataNow(input);
        assertNoConflict();
        return;
    }
    syncPromise = withRemoteUserDataSyncExclusive(async () => {
        requireRemoteUserDataBaseline();
        if (epoch !== sessionEpoch) throw new Error(currentLocaleText("canvasExtra.cloudSync.staleSessionStopped"));
        await drainRemoteUserDataChanges(options);
    });
    let syncFailed = false;
    let syncError: unknown;
    try {
        await syncPromise;
        assertNoConflict();
        syncRetryAttempt = 0;
    } catch (error) {
        syncFailed = true;
        syncError = error;
    } finally {
        syncPromise = null;
        if (syncQueued) scheduleRemoteUserDataSync();
    }
    if (syncFailed) {
        scheduleRemoteUserDataRetry(syncError);
        const reported = requestedError(syncError);
        if (reported !== undefined) throw reported;
    }
}

function isRetryableRemoteSyncError(error: unknown) {
    if (error instanceof CanvasEditLeasePendingError) return true;
    if (error instanceof ApiError) return error.retryable;
    // 校验、冲突、本地存储等普通错误要让用户看到，不能无限重试；网络类错误已统一为 ApiError。
    return false;
}

function scheduleRemoteUserDataRetry(error: unknown) {
    if (!isRetryableRemoteSyncError(error) || !activeRemoteUserId || remoteUserDataPhase !== "ready") return false;
    if (syncRetryAttempt >= REMOTE_SYNC_RETRY_DELAYS_MS.length) return false;
    // Lease preparation normally finishes within the first save window. Retry
    // promptly; the ready callback also requeues after a longer handoff.
    const delayMs = error instanceof CanvasEditLeasePendingError ? 500 : Math.max(REMOTE_SYNC_RETRY_DELAYS_MS[syncRetryAttempt], error instanceof ApiError ? error.retryAfterMs || 0 : 0);
    syncRetryAttempt += 1;
    if (syncTimer) window.clearTimeout(syncTimer);
    syncTimer = window.setTimeout(() => {
        syncTimer = null;
        void saveRemoteUserDataNow().catch((retryError) => console.warn("云端自动重试失败", retryError));
    }, delayMs);
    return true;
}

// Generated media must be durably available to the remote canvas before a node
// starts referring to its assetId. Keep this narrow write separate from the
// full-project sync so an unfinished node can safely persist its media first.
export async function saveRemoteAssetNow(assetId: string) {
    const epoch = sessionEpoch;
    if (!activeRemoteUserId) return;
    await withRemoteUserDataSyncExclusive(async () => {
        if (epoch !== sessionEpoch) throw new Error(runtimeText("canvasExtra.cloudSync.staleSessionStopped"));
        requireRemoteUserDataBaseline();
        const source = useAssetStore.getState().assets.find((asset) => asset.id === assetId);
        if (!source) throw new Error(runtimeText("creationRuntime.assetSyncMissing"));
        if (verifiedAssets.has(assetId) && sameEntitySnapshot(acknowledgedAssets.get(assetId), source)) return;
        const remotePayload = await ensureRemoteResourceReferences(assetForRemoteSync(source), new Map(), undefined, true);
        const scope = getActiveUserScope();
        const response = await upsertRemoteAsset(remotePayload);
        if (epoch !== sessionEpoch || scope !== getActiveUserScope()) throw new DOMException("Account changed", "AbortError");
        await applyRemoteAssetRecords([response.asset], scope, [source], true);
        acknowledgedAssets.set(source.id, mergeRemoteAssetRecord(response.asset, source, source, true));
        verifiedAssets.add(source.id);
        await rememberAcknowledgedAssetIds([source.id]);
    });
}

const REMOTE_ASSET_BATCH_CONCURRENCY = 4;

let remoteAssetBatchSupported = true;

// 前端可能先于后端上线：批量接口不存在（404/405）时记住并回退逐条写入。
async function upsertRemoteAssetBatch(payloads: Asset[]) {
    if (!payloads.length) return [];
    if (remoteAssetBatchSupported && payloads.length > 1) {
        try {
            const records = (await upsertRemoteAssets(payloads)).assets ?? [];
            return payloads.map((payload) =>
                mergeRemoteAssetRecord(
                    records.find((record) => record?.id === payload.id),
                    payload,
                    payload,
                    true,
                ),
            );
        } catch (error) {
            if (!(error instanceof ApiError) || (error.status !== 404 && error.status !== 405)) throw error;
            remoteAssetBatchSupported = false;
        }
    }
    const records: Asset[] = [];
    for (const payload of payloads) records.push(mergeRemoteAssetRecord((await upsertRemoteAsset(payload)).asset, payload, payload, true));
    return records;
}

async function drainRemoteUserDataChanges(options: { force?: boolean; repairProjectId?: string } = {}) {
    const uploaded = new Map<string, string>();
    do {
        syncQueued = false;
        await saveRemoteUserDataBatch(uploaded, options);
    } while (syncQueued);
}

async function saveRemoteUserDataBatch(uploaded: Map<string, string>, options: { force?: boolean; repairProjectId?: string } = {}) {
    const epoch = sessionEpoch;
    // 中央兜底：任何调用方只要把持久媒体写进画布，提交前都会先补齐素材记录与 assetId。
    // 页面级入口仍主动入库，以便立即反馈；这里负责阻止遗漏入口形成远端幽灵资源。
    const changedProjectIds = new Set(
        useCanvasStore
            .getState()
            .projects.filter((project) => !sameCanvasContent(acknowledgedProjects.get(project.id), project))
            .filter((project) => !isLocalBlankCanvasDraft(project))
            .map((project) => project.id),
    );
    for (const project of useCanvasStore.getState().projects) {
        if (!changedProjectIds.has(project.id)) continue;
        const mediaNodes = [...project.nodes, ...(project.timeline?.clips.flatMap((clip) => (clip.directMedia ? [timelineMediaNode(clip.directMedia)] : [])) || [])];
        for (const node of mediaNodes) {
            if (!canvasNodeResourceIdentity(node)?.startsWith("resource:") || findCanvasNodeAsset(useAssetStore.getState().assets, node, project.id)) continue;
            try {
                await resolveCanvasNodeAsset({ node, canvasId: project.id }, canvasAssetLoader(false));
            } catch (error) {
                // One unresolvable generated node must not block saving every canvas; the backend still guards resource ownership.
                if (error instanceof DOMException && error.name === "AbortError") throw error;
                console.warn("canvas asset resolution skipped", node.id, error);
            }
        }
    }
    repairMissingCanvasAssets(changedProjectIds, incrementalSession);
    // First-ingest location validation requires the canvas to exist. Reserve an
    // empty revision before writing its media; the complete document still saves
    // only after its assets, preserving the server's resource/asset invariant.
    for (const project of useCanvasStore.getState().projects) {
        if (acknowledgedProjects.has(project.id) || (project.revision ?? 0) > 0 || !useAssetStore.getState().assets.some((asset) => asset.archiveCanvasId === project.id && !acknowledgedAssets.has(asset.id))) continue;
        const reserved: CanvasProject = { ...project, revision: 0, nodes: [], connections: [], chatSessions: [], activeChatId: null, directorScenes: [], timeline: undefined, folderPresentation: undefined };
        let revision: number;
        try {
            revision = (await upsertRemoteCanvasProject(sanitizeCanvasProjectForRemoteSync(reserved))).project.revision;
        } catch (error) {
            if (!(error instanceof ApiError) || error.status !== 409) throw error;
            const remote = (await getRemoteCanvasProject(project.id)).project;
            if (!sameCanvasContent(reserved, remote)) throw error;
            revision = remote.revision!;
        }
        if (epoch !== sessionEpoch) throw new DOMException("Account changed", "AbortError");
        if (!Number.isSafeInteger(revision) || revision < 1) throw new ApiError(currentLocaleText("canvasExtra.cloudSync.invalidServerRevision"), { status: 409 });
        acknowledgeProject(project.id, { ...reserved, revision });
        useCanvasStore.setState((state) => ({ projects: state.projects.map((item) => (item.id === project.id ? { ...item, revision } : item)) }));
        await flushCanvasStorePersistence();
    }
    const currentProjects = useCanvasStore.getState().projects;
    const currentAssets = useAssetStore.getState().assets;
    // A missing-media refusal is not transient: retry only after the content changes or the user asks for repair.
    const dirtyProjects = currentProjects.filter(
        (project) =>
            !isLocalBlankCanvasDraft(project) &&
            !sameCanvasContent(acknowledgedProjects.get(project.id), project) &&
            useSyncProgressStore.getState().syncingProjects[project.id]?.phase !== "conflict" &&
            (options.repairProjectId === project.id || !sameCanvasContent(resourcesMissingFailures.get(project.id), project)),
    );
    const dirtyAssets = currentAssets.filter((asset) => !sameEntitySnapshot(acknowledgedAssets.get(asset.id), asset));
    if (!dirtyProjects.length && !dirtyAssets.length) return;

    if (incrementalSession) {
        for (const source of dirtyAssets) {
            const baseline = acknowledgedAssets.get(source.id);
            if (!baseline || verifiedAssets.has(source.id)) continue;
            const { asset } = await getRemoteAsset(source.id);
            if (Date.parse(asset.updatedAt) !== Date.parse(baseline.updatedAt)) {
                if (!options.force) throw new Error(runtimeText("creationRuntime.assetSyncConflict"));
                // 强制覆盖是用户显式指令：采纳远端版本为新基线后继续用本地内容覆盖。
                acknowledgedAssets.set(source.id, asset);
            }
            verifiedAssets.add(source.id);
        }
    }

    // 转换后的 resource: 引用只属于发往服务端的 payload，不能反写整份实时 store。
    // 已确认快照记录的是本次上传所依据的本地实体；上传期间的新编辑会在下一轮继续提交。
    // 素材先于画布提交。这样画布中的 resource: 引用一旦成为远端事实，
    // 对应 Asset 已经存在，刷新或换设备不会出现只占容量、不见素材的窗口。
    // 按批写入：导入案例一次会带出上百个素材，逐条 PUT 会撞上每分钟素材写入频控，画布随之无法保存。
    const errors: unknown[] = [];
    // 某批素材被服务端拒绝（校验等不可重试错误）时，只扣下引用这些素材的画布；其它画布照常保存，
    // 不能让一条坏素材把所有画布永远卡在“待保存”。网络类可重试错误仍整体中止，交给退避重试。
    const failedAssetIds = new Set<string>();
    const batches: Asset[][] = [];
    for (let start = 0; start < dirtyAssets.length; start += REMOTE_ASSET_BATCH_SIZE) batches.push(dirtyAssets.slice(start, start + REMOTE_ASSET_BATCH_SIZE));
    // Batches are independent (the server serializes each item's quota check), so a few run at once:
    // a 600-node case is 12 batches, and one round trip each in series is seconds of waiting abroad.
    // Every batch still settles before any canvas below is saved.
    let retryable: unknown;
    let next = 0;
    const drainBatches = async () => {
        while (next < batches.length && retryable === undefined) {
            const batch = batches[next++];
            try {
                const payloads: Asset[] = [];
                for (const source of batch) payloads.push(await ensureRemoteResourceReferences(assetForRemoteSync(source), uploaded, undefined, true));
                const scope = getActiveUserScope();
                const epoch = sessionEpoch;
                const records = await upsertRemoteAssetBatch(payloads);
                if (epoch !== sessionEpoch || scope !== getActiveUserScope()) throw new DOMException("Account changed", "AbortError");
                await applyRemoteAssetRecords(records, scope, batch, true);
                for (let index = 0; index < batch.length; index++) {
                    const record = records.find((item) => item.id === batch[index].id);
                    if (record) batch[index] = mergeRemoteAssetRecord(record, batch[index], batch[index], true);
                }
            } catch (error) {
                if (isRetryableRemoteSyncError(error)) {
                    retryable ??= error;
                    return;
                }
                for (const source of batch) failedAssetIds.add(source.id);
                errors.push(error);
                continue;
            }
            for (const source of batch) {
                acknowledgedAssets.set(source.id, source);
                verifiedAssets.add(source.id);
            }
            await rememberAcknowledgedAssetIds(batch.map((source) => source.id));
        }
    };
    await Promise.all(Array.from({ length: Math.min(REMOTE_ASSET_BATCH_CONCURRENCY, batches.length) }, drainBatches));
    if (retryable !== undefined) throw retryable;
    for (const candidate of dirtyProjects) {
        if (failedAssetIds.size && [...collectAssetIds(candidate)].some((id) => failedAssetIds.has(id))) {
            projectSyncErrors.set(candidate.id, errors[0]);
            useSyncProgressStore.getState().setProjectProgress(candidate.id, { phase: "error", reason: undefined, message: errors[0] instanceof Error ? errors[0].message : currentLocaleText("canvasExtra.cloudSync.syncFailedRetry") });
            continue;
        }
        // A canvas that was never acknowledged by the cloud (created or cached
        // locally before revisions existed) is saved as new; a synced canvas
        // must keep the revision it was loaded with.
        const source = candidate.revision === undefined && !acknowledgedProjects.has(candidate.id) ? { ...candidate, revision: 0 } : candidate;
        const keysToUpload = collectLocalMediaKeys(source);
        const total = keysToUpload.length;
        useSyncProgressStore.getState().setProjectProgress(source.id, {
            projectId: source.id,
            total,
            completed: 0,
            phase: total > 0 ? "uploading" : "saving",
            message: total > 0 ? currentLocaleText("canvasExtra.cloudSync.uploadingMedia") : currentLocaleText("canvasExtra.cloudSync.savingCanvas"),
        });
        const onMediaUploaded = () => {
            if (total > 0) {
                useSyncProgressStore.getState().incrementProjectCompleted(source.id);
            }
        };
        try {
            let attemptSource = source;
            let expectedStoreRevision = candidate.revision;
            for (let attempt = 0; ; attempt += 1) {
                try {
                    if (!Number.isSafeInteger(attemptSource.revision) || attemptSource.revision! < 0) {
                        throw new ApiError(currentLocaleText("canvasExtra.cloudSync.missingRevision"), { status: 428 });
                    }
                    const hash = await canvasContentHash(attemptSource);
                    const remotePayload = await ensureRemoteResourceReferences(attemptSource, uploaded, onMediaUploaded);
                    if (total > 0 || attempt > 0) {
                        useSyncProgressStore.getState().setProjectProgress(source.id, {
                            phase: "saving",
                            message: currentLocaleText(attempt > 0 ? "canvasExtra.cloudSync.mergingRemote" : "canvasExtra.cloudSync.savingStructure"),
                        });
                    }
                    const { project: saved } = await upsertRemoteCanvasProject(sanitizeCanvasProjectForRemoteSync(remotePayload), { repairMissingResources: options.repairProjectId === source.id });
                    if (!Number.isSafeInteger(saved.revision) || saved.revision !== attemptSource.revision! + 1) {
                        throw new ApiError(currentLocaleText("canvasExtra.cloudSync.invalidServerRevision"), { status: 409 });
                    }
                    const current = useCanvasStore.getState().openProject(source.id);
                    if (current && current.revision !== expectedStoreRevision) {
                        throw new ApiError(currentLocaleText("canvasExtra.cloudSync.baselineChangedLoad"), { status: 409 });
                    }
                    const acknowledged = { ...attemptSource, revision: saved.revision, remoteContentHash: hash };
                    acknowledgeProject(source.id, acknowledged);
                    verifiedProjects.add(source.id);
                    if (current) {
                        useCanvasStore.setState((state) => ({ projects: state.projects.map((project) => (project === current ? { ...project, revision: saved.revision, remoteContentHash: hash } : project)) }));
                    }
                    await flushCanvasStorePersistence();
                    const pending = !sameCanvasContent(attemptSource, useCanvasStore.getState().openProject(source.id) || undefined);
                    resourcesMissingFailures.delete(source.id);
                    projectSyncErrors.delete(source.id);
                    useSyncProgressStore
                        .getState()
                        .setProjectProgress(source.id, { phase: pending ? "pending" : "done", reason: undefined, message: pending ? currentLocaleText("canvasExtra.cloudSync.newChangesPending") : currentLocaleText("canvasExtra.cloudSync.savedToCloud") });
                    if (pending) syncQueued = true;
                    break;
                } catch (error) {
                    // 云端版本已前进（另一标签页或 Agent 写入）：拉最新版按节点/字段三方合并后重试，最多再试两次。
                    // 同一字段两边都改、缺少可信基线时仍按冲突处理并保留草稿。
                    if (attempt >= 2 || !(error instanceof ApiError) || error.status !== 409 || isCanvasResourcesMissing(error) || error.reason === "canvas_edit_lease_conflict") throw error;
                    const rebased = await rebaseCanvasAfterSaveConflict(source.id, error);
                    if (!rebased) break;
                    attemptSource = rebased;
                    expectedStoreRevision = rebased.revision;
                }
            }
        } catch (error) {
            if (error instanceof CanvasEditLeasePendingError) {
                useSyncProgressStore.getState().setProjectProgress(source.id, { phase: "pending", reason: undefined, message: currentLocaleText("canvasExtra.cloudSync.changesPending") });
                projectSyncErrors.set(source.id, error);
                errors.push(error);
                continue;
            }
            // Missing media is repairable in place; it is not a revision conflict and must not park the canvas as a draft.
            const resourcesMissing = isCanvasResourcesMissing(error);
            if (resourcesMissing) resourcesMissingFailures.set(source.id, useCanvasStore.getState().openProject(source.id) || source);
            const leaseConflict = error instanceof ApiError && error.reason === "canvas_edit_lease_conflict";
            const conflict = !resourcesMissing && !leaseConflict && error instanceof ApiError && (error.status === 409 || error.status === 428);
            useSyncProgressStore.getState().setProjectProgress(source.id, {
                phase: conflict ? "conflict" : "error",
                reason: resourcesMissing ? CANVAS_RESOURCES_MISSING : leaseConflict ? "canvas_edit_lease_conflict" : undefined,
                message: resourcesMissing ? currentLocaleText("canvasExtra.cloudSync.resourcesMissing") : error instanceof Error ? error.message : currentLocaleText("canvasExtra.cloudSync.syncFailedRetry"),
            });
            if (conflict || leaseConflict) {
                try {
                    const current = useCanvasStore.getState().openProject(source.id) || source;
                    const draftCount = await preserveCanvasSyncDraft(current);
                    useSyncProgressStore.getState().setProjectProgress(source.id, { draftCount });
                } catch (draftError) {
                    useSyncProgressStore.getState().setProjectProgress(source.id, { message: currentLocaleText("canvasExtra.cloudSync.draftSaveFailed") });
                    errors.push(draftError);
                }
            }
            projectSyncErrors.set(source.id, error);
            errors.push(error);
        }
    }
    if (errors.length) throw errors[0];
    if (dirtyProjects.length || dirtyAssets.length) {
        void appQueryClient.invalidateQueries({ queryKey: ["canvas-library"] });
        void appQueryClient.invalidateQueries({ queryKey: ["asset-library"] });
    }
}

// 保存遇到版本冲突后的自动对账。返回 null 表示云端内容与本地一致、只校准了版本；
// 返回合并后的画布表示需要用新版本号再保存一次；无法安全合并时抛出原冲突。
async function rebaseCanvasAfterSaveConflict(id: string, conflict: ApiError): Promise<CanvasProject | null> {
    const { project: remote } = await getRemoteCanvasProject(id);
    const current = useCanvasStore.getState().openProject(id);
    if (!current || !Number.isSafeInteger(remote.revision)) throw conflict;
    const remoteHash = await canvasContentHash(remote);
    if (sameCanvasContent(current, remote)) {
        if (useCanvasStore.getState().openProject(id) !== current) throw conflict;
        const calibrated = { ...remote, viewport: current.viewport, remoteContentHash: remoteHash };
        acknowledgeProject(id, calibrated);
        verifiedProjects.add(id);
        useCanvasStore.setState((state) => ({ projects: state.projects.map((project) => (project.id === id ? calibrated : project)) }));
        await flushCanvasStorePersistence();
        resourcesMissingFailures.delete(id);
        projectSyncErrors.delete(id);
        useSyncProgressStore.getState().setProjectProgress(id, { phase: "done", reason: undefined, message: currentLocaleText("canvasExtra.cloudSync.calibrated") });
        return null;
    }
    // 只有云端确认过的基线才能做三方合并的共同祖先；未核对的缓存基线可能已被改动。
    const baseline = acknowledgedProjects.get(id);
    if (!baseline || baseline.remoteContentHash !== (await canvasContentHash(baseline))) throw conflict;
    let merged: CanvasProject;
    try {
        merged = mergeAgentCanvasEditor(baseline, remote, current.nodes, current.connections, current);
    } catch {
        throw conflict;
    }
    if (useCanvasStore.getState().openProject(id) !== current) throw conflict;
    const rebased = { ...merged, viewport: current.viewport, remoteContentHash: remoteHash };
    // 打开中的编辑器只通过该通道接收外部变更；不通知的话它下一次保存会用旧节点覆盖云端的新内容。
    try {
        for (const listener of agentCanvasListeners) listener(rebased, current, { focusCreatedNodes: false });
    } catch {
        throw conflict;
    }
    acknowledgeProject(id, { ...remote, viewport: current.viewport, remoteContentHash: remoteHash });
    verifiedProjects.add(id);
    useCanvasStore.setState((state) => ({ projects: state.projects.map((project) => (project.id === id ? rebased : project)) }));
    await flushCanvasStorePersistence();
    useSyncProgressStore.getState().setProjectProgress(id, { phase: "saving", message: currentLocaleText("canvasExtra.cloudSync.mergingRemote") });
    return rebased;
}

function collectLocalMediaKeys(value: unknown, set = new Set<string>()): string[] {
    if (!value || typeof value !== "object") return [...set];
    if (Array.isArray(value)) {
        for (const item of value) collectLocalMediaKeys(item, set);
        return [...set];
    }
    const record = value as Record<string, unknown>;
    const storageKey = typeof record.storageKey === "string" ? record.storageKey : "";
    if (isLocalStorageKey(storageKey) && !resourceIdFromStorageKey(storageKey)) {
        set.add(storageKey);
    } else {
        const inline = inlineMediaDataUrl(record);
        if (inline) set.add(`${inline.length}:${inline.slice(0, 64)}:${inline.slice(-64)}`);
    }
    for (const child of Object.values(record)) {
        collectLocalMediaKeys(child, set);
    }
    return [...set];
}

async function ensureRemoteResourceReferences<T>(value: T, uploaded = new Map<string, string>(), onUploaded?: () => void, preserveLocalMedia = false): Promise<T> {
    if (!value || typeof value !== "object") return value;
    if (Array.isArray(value)) {
        const result: unknown[] = [];
        for (const item of value) result.push(await ensureRemoteResourceReferences(item, uploaded, onUploaded, preserveLocalMedia));
        return result as T;
    }

    const next: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
        next[key] = await ensureRemoteResourceReferences(child, uploaded, onUploaded, preserveLocalMedia);
    }

    const storageKey = typeof next.storageKey === "string" ? next.storageKey : "";
    const remoteResourceId = resourceIdFromStorageKey(storageKey);
    if (remoteResourceId) return applyResourceReference(next, storageKey) as T;

    if (preserveLocalMedia) {
        if (isLocalStorageKey(storageKey) || inlineMediaDataUrl(next)) return preserveLocalReference(next) as T;
        return next as T;
    }

    if (!isLocalStorageKey(storageKey)) {
        const inline = inlineMediaDataUrl(next);
        if (!inline) return next as T;
        const identity = await inlineMediaUploadIdentity(inline);
        const cached = uploaded.get(identity);
        if (cached) return applyResourceReference(next, cached) as T;
        const resourceStorage = await uploadInlineDataUrl(inline, identity);
        uploaded.set(identity, resourceStorage);
        onUploaded?.();
        return applyResourceReference(next, resourceStorage) as T;
    }

    const cached = uploaded.get(storageKey);
    if (cached) return applyResourceReference(next, cached) as T;
    const resourceStorage = await uploadLocalStorageKey(storageKey, next);
    uploaded.set(storageKey, resourceStorage);
    onUploaded?.();
    return applyResourceReference(next, resourceStorage) as T;
}

function preserveLocalReference(payload: Record<string, unknown>) {
    payload.localOnly = true;
    for (const key of ["content", "dataUrl", "url", "coverUrl"]) {
        if (typeof payload[key] === "string" && /^(blob:|data:(image|video|audio)\/)/i.test(payload[key])) payload[key] = "";
    }
    return payload;
}

function applyResourceReference(payload: Record<string, unknown>, storageKey: string) {
    const resourceId = resourceIdFromStorageKey(storageKey);
    if (!resourceId) {
        throw new Error(`远端资源引用无效：${storageKey}`);
    }
    const url = resourceFileUrl(resourceId);
    payload.storageKey = storageKey;
    for (const key of ["content", "dataUrl", "url", "coverUrl"]) {
        if (typeof payload[key] === "string") payload[key] = url;
    }
    return payload;
}

function inlineMediaDataUrl(payload: Record<string, unknown>) {
    for (const key of ["dataUrl", "content", "url", "coverUrl"]) {
        const value = payload[key];
        if (typeof value === "string" && /^data:(image|video|audio)\//i.test(value)) return value;
    }
    return "";
}

async function uploadInlineDataUrl(dataUrl: string, identity: string) {
    const response = await fetch(dataUrl);
    if (!response.ok) throw new Error(runtimeText("creationRuntime.embeddedMediaFailed"));
    const blob = await response.blob();
    const kind: "image" | "video" | "audio" | "file" = blob.type.startsWith("image/") ? "image" : blob.type.startsWith("video/") ? "video" : blob.type.startsWith("audio/") ? "audio" : "file";
    const resource = await uploadResourceFile(blob, kind, { idempotencyKey: identity });
    return resourceStorageKey(resource.id);
}

async function inlineMediaUploadIdentity(dataUrl: string) {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(dataUrl));
    return `inline:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

async function uploadLocalStorageKey(storageKey: string, payload: Record<string, unknown>, signal?: AbortSignal) {
    signal?.throwIfAborted();
    const blob = storageKey.startsWith("image:") ? await getImageBlob(storageKey) : await getMediaBlob(storageKey);
    if (!blob) throw new Error(`本地媒体不存在，无法同步：${storageKey}`);
    const kind = blob.type.startsWith("image/") ? "image" : blob.type.startsWith("video/") ? "video" : blob.type.startsWith("audio/") ? "audio" : "file";
    const resource = await uploadResourceFile(
        blob,
        kind,
        {
            width: numberValue(payload.naturalWidth) || numberValue(payload.width),
            height: numberValue(payload.naturalHeight) || numberValue(payload.height),
            durationMs: numberValue(payload.durationMs),
            idempotencyKey: storageKey,
        },
        undefined,
        signal,
    );
    return resourceStorageKey(resource.id);
}

function requireRemoteUserDataBaseline() {
    if (remoteUserDataPhase !== "ready") throw new Error(runtimeText("creationRuntime.remoteBaselineMissing"));
}

function sameEntitySnapshot<T>(acknowledged: T | undefined, current: T) {
    return acknowledged !== undefined && (acknowledged === current || JSON.stringify(acknowledged) === JSON.stringify(current));
}

function isLocalStorageKey(value: string) {
    return LOCAL_STORAGE_KEY_PATTERN.test(value) && !resourceIdFromStorageKey(value);
}

function numberValue(value: unknown) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : undefined;
}

function sanitizeCanvasProjectForRemoteSync<T>(project: T): T {
    if (!project || typeof project !== "object") return project;
    const clone = { ...(project as Record<string, unknown>) };
    if (Array.isArray(clone.chatSessions)) {
        clone.chatSessions = clone.chatSessions.map((session) => {
            if (!session || typeof session !== "object") return session;
            const s = { ...(session as Record<string, unknown>) };
            if (Array.isArray(s.messages)) {
                s.messages = s.messages.map((message) => {
                    if (!message || typeof message !== "object" || !message.detail) return message;
                    const m = { ...(message as Record<string, unknown>) };
                    if (m.detail && typeof m.detail === "object") {
                        const d = { ...(m.detail as Record<string, unknown>) };
                        if (Array.isArray(d.results)) {
                            d.results = d.results.map((r) => {
                                if (!r || typeof r !== "object") return r;
                                const res = { ...(r as Record<string, unknown>) };
                                if (res.result && typeof res.result === "object") {
                                    const inner = { ...(res.result as Record<string, unknown>) };
                                    if (inner.data && typeof inner.data === "object") {
                                        const { snapshot: _s, before: _b, after: _a, ...restData } = inner.data as Record<string, unknown>;
                                        inner.data = restData;
                                    }
                                    res.result = inner;
                                }
                                return res;
                            });
                        }
                        m.detail = d;
                    }
                    return m;
                });
            }
            return s;
        });
    }
    return clone as T;
}

export const CANVAS_RESOURCES_MISSING = "canvas_history_resources_missing";

export function isCanvasResourcesMissing(error: unknown) {
    return error instanceof ApiError && error.reason === CANVAS_RESOURCES_MISSING;
}

/**
 * Explicit user action after a save was refused for missing media: drop
 * derived video previews whose resources are gone, then save in repair mode.
 * The server still validates the document and keeps the damaged version in
 * history; original media is never removed here.
 */
export async function repairMissingResourcesAndSave(projectId: string) {
    const repair = await repairMissingCanvasVideoPreviews(new Set([projectId]));
    await saveRemoteUserDataNow({ repairProjectId: projectId });
    return repair;
}
