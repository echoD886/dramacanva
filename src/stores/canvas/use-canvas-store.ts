import { create } from "zustand";
import { currentLocaleText } from "@/i18n/current-locale-text";
import { persist, type PersistStorage, type StorageValue } from "zustand/middleware";

import { nanoid } from "nanoid";
import { sameCanvasContent } from "@/lib/canvas/canvas-content";
import { DEFAULT_CANVAS_BACKGROUND_MODE, normalizeCanvasAppearance, readCanvasAppearanceDefault, type CanvasAppearance } from "@/lib/canvas/canvas-appearance";
import { parseCanvasStorageDocument, rebaseCanvasProjects, serializeCanvasStorageDocument, type CanvasStorageConflict, type CanvasStorageDocument } from "@/lib/canvas/canvas-storage-revision";
import { localForageStorageForScope } from "@/lib/localforage-storage";
import { getActiveUserScope } from "@/lib/user-scope";
import { registerUnloadGuard } from "@/stores/use-sync-progress-store";
import { preserveCanvasSyncDraft } from "@/services/canvas-sync-drafts";
import type { CanvasBackgroundMode } from "@/lib/canvas-theme";
import type { CanvasStarterMode } from "@/lib/canvas/canvas-starter";
import type { CanvasAssistantSession, CanvasConnection, CanvasNodeData, CanvasNodeMetadata, ViewportTransform } from "@/types/canvas";
import type { DirectorScene } from "@/types/director";
import type { TimelineProject } from "@/types/timeline";

export type CanvasProject = {
    coverSnapshot?: { storageKey: string; width: number; height: number };
    folderPresentation?: import("@/types/asset-archive").FolderPresentation;
    id: string;
    revision?: number;
    remoteContentHash?: string;
    projectId?: string;
    title: string;
    titleSource?: "user" | "auto";
    createdAt: string;
    updatedAt: string;
    nodes: CanvasNodeData[];
    connections: CanvasConnection[];
    chatSessions: CanvasAssistantSession[];
    activeChatId: string | null;
    starterMode?: CanvasStarterMode;
    appearance?: CanvasAppearance;
    backgroundMode: CanvasBackgroundMode;
    showImageInfo: boolean;
    viewport: ViewportTransform;
    directorScenes: DirectorScene[];
    timeline?: TimelineProject;
    importSource?: CanvasNodeMetadata["importSource"];
};

type CanvasStore = {
    hydrated: boolean;
    projects: CanvasProject[];
    createProject: (title?: string, projectId?: string) => string;
    importProject: (project: Partial<CanvasProject>) => string;
    openProject: (id: string) => CanvasProject | null;
    renameProject: (id: string, title: string, source?: "user" | "auto") => void;
    deleteProjects: (ids: string[]) => void;
    replaceProjects: (projects: CanvasProject[]) => void;
    updateProject: (id: string, patch: Partial<Pick<CanvasProject, "coverSnapshot" | "folderPresentation" | "projectId" | "importSource" | "nodes" | "connections" | "chatSessions" | "activeChatId" | "starterMode" | "appearance" | "backgroundMode" | "showImageInfo" | "viewport" | "directorScenes" | "timeline">>) => void;
};

const initialViewport: ViewportTransform = { x: 0, y: 0, k: 1 };
export const CANVAS_STORE_KEY = "infinite-canvas:canvas_store";
type PersistedCanvasState = Pick<CanvasStore, "projects">;
type QueuedCanvasPersist = {
    name: string;
    scope: string;
    baseProjects: CanvasProject[];
    baseRevision: number;
    state: PersistedCanvasState;
    token: number;
};

type ObservedCanvasPersist = {
    projects: CanvasProject[];
    revision: number;
};

let suppressCanvasStorePersistence = 0;
const canvasMemoryStates = new Map<string, PersistedCanvasState>();
const observedCanvasPersists = new Map<string, ObservedCanvasPersist>();
const queuedCanvasPersists = new Map<string, QueuedCanvasPersist>();
const canvasSaveTimers = new Map<string, ReturnType<typeof setTimeout>>();
const canvasPersistTokens = new Map<string, number>();
type CanvasGenerationPersistenceAttempt = {
    previousNodes?: CanvasNodeData[];
    nodes?: CanvasNodeData[];
    previousChatSessions?: CanvasAssistantSession[];
    chatSessions?: CanvasAssistantSession[];
};
const pendingCanvasGenerationAttempts = new Map<string, Map<string, CanvasGenerationPersistenceAttempt>>();
const generationAttemptVersions = new Map<string, number>();
let nextGenerationAttemptVersion = 0;
const ordinaryProjectSnapshots = new WeakMap<CanvasProject, {
    scope: string;
    durableProject: CanvasProject | undefined;
    attemptVersion: number;
    snapshot: CanvasProject;
}>();

function bumpGenerationAttemptVersion(projectKey: string) {
    generationAttemptVersions.set(projectKey, ++nextGenerationAttemptVersion);
}

type AsyncCanvasStorageLock = {
    request<T>(name: string, callback: () => Promise<T>): Promise<T>;
};

type CanvasStorageLockOptions = {
    requireCrossRealmLock?: boolean;
};

const CANVAS_STORAGE_LOCK_PREFIX = "infinite-canvas:canvas-generation-storage-lock:";
const canvasStorageTails = new Map<string, Promise<void>>();

function runWithBrowserCanvasStorageLock<T>(scope: string, operation: () => Promise<T>, options: CanvasStorageLockOptions) {
    const locks = typeof window !== "undefined" && typeof navigator !== "undefined" ? (navigator.locks as AsyncCanvasStorageLock | undefined) : undefined;
    const lockName = `${CANVAS_STORAGE_LOCK_PREFIX}${scope}`;
    if (locks) return locks.request(lockName, operation);
    if (options.requireCrossRealmLock && typeof window !== "undefined" && typeof document !== "undefined") {
        throw new Error("当前浏览器不支持跨标签存储锁，已停止画布生成持久化");
    }
    return operation();
}

/**
 * 串行化同一用户作用域的画布持久化，并在一次失败后允许队列继续前进。
 *
 * `pending` 必须把当前写入的真实结果返回给调用方；只有前一个 tail 的失败被
 * 转换成已处理的 void，才不会让一次旧失败永久毒化后续保存队列。
 */
export function withCanvasStorePersistenceLock<T>(scope: string, operation: () => Promise<T>, options: CanvasStorageLockOptions = {}): Promise<T> {
    const previous = canvasStorageTails.get(scope) ?? Promise.resolve();
    const pending = previous.then(() => undefined, () => undefined).then(() => runWithBrowserCanvasStorageLock(scope, operation, options));
    const tail = pending.then(
        () => undefined,
        () => undefined,
    );
    canvasStorageTails.set(scope, tail);
    void tail.finally(() => {
        if (canvasStorageTails.get(scope) === tail) canvasStorageTails.delete(scope);
    });
    return pending;
}

function clearCanvasSaveTimer(scope: string) {
    const timer = canvasSaveTimers.get(scope);
    if (!timer) return;
    clearTimeout(timer);
    canvasSaveTimers.delete(scope);
}

export function canvasStoreStorageRevision(scope: string) {
    return observedCanvasPersists.get(scope)?.revision ?? 0;
}

export function recordCanvasStorageDocument(scope: string, document: CanvasStorageDocument) {
    observedCanvasPersists.set(scope, {
        projects: document.state.projects,
        revision: document.storageRevision,
    });
}

// 另一个标签页同时改了同一字段（或删掉了本页正在编辑的对象）时，落盘结果以已持久化的一方为准；
// 本页被覆盖的编辑另存为同步草稿，不能静默丢弃。当前已持有画布锁，草稿写入排在锁释放之后，不能等待。
function preserveCanvasStorageConflictDrafts(scope: string, localProjects: CanvasProject[], committedProjects: CanvasProject[], conflicts: CanvasStorageConflict[]) {
    if (!conflicts.length) return;
    const committedById = new Map(committedProjects.map((project) => [project.id, project]));
    const projectIds = new Set(conflicts.map((conflict) => conflict.projectId ?? conflict.id));
    for (const project of localProjects) {
        if (!projectIds.has(project.id) || sameCanvasContent(project, committedById.get(project.id))) continue;
        void preserveCanvasSyncDraft(project, scope).catch((error) => console.error("画布本地冲突草稿保存失败", { scope, projectId: project.id, error }));
    }
}

export async function commitPendingCanvasStorePersistenceLocked(scope: string) {
    const storage = localForageStorageForScope(scope);
    let committed: CanvasStorageDocument | null = null;

    while (true) {
        const queued = queuedCanvasPersists.get(scope);
        if (!queued) return committed;

        const durable = parseCanvasStorageDocument(await storage.getItem(queued.name), queued.baseProjects);
        const { document: rebased, conflicts } = rebaseCanvasProjects({
            document: durable,
            baseProjects: queued.baseProjects,
            localProjects: queued.state.projects,
            baseRevision: queued.baseRevision,
        });
        await storage.setItem(queued.name, serializeCanvasStorageDocument(rebased));
        preserveCanvasStorageConflictDrafts(scope, queued.state.projects, rebased.state.projects, conflicts);
        committed = rebased;
        recordCanvasStorageDocument(scope, rebased);

        const latest = queuedCanvasPersists.get(scope);
        if (!latest || latest.token === queued.token) {
            if (latest?.token === queued.token) queuedCanvasPersists.delete(scope);
            return committed;
        }

        latest.baseProjects = queued.state.projects;
        latest.baseRevision = rebased.storageRevision;
    }
}

async function writeQueuedCanvasPersist(scope: string, _token: number) {
    await withCanvasStorePersistenceLock(scope, () => commitPendingCanvasStorePersistenceLocked(scope));
}

/** 是否还有尚未写入 IndexedDB 的画布本地持久化（含 400ms 防抖中的写入）。 */
export function hasPendingCanvasStorePersistence() {
    return queuedCanvasPersists.size > 0 || canvasSaveTimers.size > 0;
}

/**
 * 页面隐藏/关闭时尽力立即写入防抖队列，避免游客模式丢失最后 400ms 的编辑。
 * 浏览器可能在 IndexedDB 事务完成前结束页面，因此 beforeunload 仍会在有待写队列时提示。
 */
export function flushCanvasStorePersistenceOnPageHide() {
    if (!hasPendingCanvasStorePersistence()) return undefined;
    return flushCanvasStorePersistence().catch((error) => {
        console.error("页面隐藏时画布本地持久化失败，已保留待写队列", { error });
    });
}

if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
    window.addEventListener("pagehide", () => {
        void flushCanvasStorePersistenceOnPageHide();
    });
    if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "hidden") void flushCanvasStorePersistenceOnPageHide();
        });
    }
    registerUnloadGuard(hasPendingCanvasStorePersistence);
}

export function pendingCanvasStorePersistence(scope: string) {
    const queued = queuedCanvasPersists.get(scope);
    return queued ? { projects: queued.state.projects, token: queued.token } : null;
}

export function rebasePendingCanvasStorePersistenceAfterGenerationCommitLocked(scope: string, committed: CanvasStorageDocument) {
    const queued = queuedCanvasPersists.get(scope);
    if (!queued) return;
    const latestMemory = canvasMemoryStates.get(scope)?.projects ?? queued.state.projects;
    // Dedicated commit 已确认 generation stamp；用同 scope 最新内存重新投影队列，避免同节点普通编辑被旧 durable 快照替换。
    queued.baseProjects = committed.state.projects;
    queued.baseRevision = committed.storageRevision;
    queued.state = ordinaryCanvasPersistenceState(scope, { projects: latestMemory }, committed.state.projects);
}

export function withCanvasStorePersistenceSuppressed<T>(operation: () => T) {
    suppressCanvasStorePersistence += 1;
    try {
        return operation();
    } finally {
        suppressCanvasStorePersistence -= 1;
    }
}

export function registerCanvasGenerationPersistenceAttempt(scope: string, projectId: string, effectKey: string, attempt: CanvasGenerationPersistenceAttempt) {
    const projectKey = `${scope}\0${projectId}`;
    const attempts = pendingCanvasGenerationAttempts.get(projectKey) ?? new Map<string, CanvasGenerationPersistenceAttempt>();
    attempts.set(effectKey, attempt);
    pendingCanvasGenerationAttempts.set(projectKey, attempts);
    bumpGenerationAttemptVersion(projectKey);
    const queued = queuedCanvasPersists.get(scope);
    if (queued) {
        const latestMemory = canvasMemoryStates.get(scope)?.projects ?? queued.state.projects;
        const durableProjects = observedCanvasPersists.get(scope)?.projects ?? queued.baseProjects;
        queued.state = ordinaryCanvasPersistenceState(scope, { projects: latestMemory }, durableProjects);
    }
    return () => {
        if (attempts.get(effectKey) !== attempt) return;
        attempts.delete(effectKey);
        if (!attempts.size) {
            pendingCanvasGenerationAttempts.delete(projectKey);
            generationAttemptVersions.delete(projectKey);
        } else bumpGenerationAttemptVersion(projectKey);
    };
}

function hasUnconfirmedGenerationKey(localKeys?: string[], durableKeys?: string[]) {
    return Boolean(localKeys?.some((key) => !durableKeys?.includes(key)));
}

function samePersistenceValue(left: unknown, right: unknown) {
    return left === right || JSON.stringify(left) === JSON.stringify(right);
}

function rollbackGenerationValue(previous: unknown, attempted: unknown, live: unknown, durable: unknown): unknown {
    if (samePersistenceValue(previous, attempted)) return live;
    if (samePersistenceValue(live, attempted)) return durable;
    if (!previous || !attempted || !live || !durable || Array.isArray(previous) || Array.isArray(attempted) || Array.isArray(live) || Array.isArray(durable) || typeof previous !== "object" || typeof attempted !== "object" || typeof live !== "object" || typeof durable !== "object") return live;

    const previousRecord = previous as Record<string, unknown>;
    const attemptedRecord = attempted as Record<string, unknown>;
    const liveRecord = live as Record<string, unknown>;
    const durableRecord = durable as Record<string, unknown>;
    const result: Record<string, unknown> = { ...durableRecord };
    for (const key of new Set([...Object.keys(previousRecord), ...Object.keys(attemptedRecord), ...Object.keys(liveRecord)])) {
        const previousHasKey = Object.hasOwn(previousRecord, key);
        const attemptedHasKey = Object.hasOwn(attemptedRecord, key);
        const liveHasKey = Object.hasOwn(liveRecord, key);
        if (!previousHasKey && !attemptedHasKey) {
            if (liveHasKey) result[key] = liveRecord[key];
            continue;
        }
        if (!previousHasKey && attemptedHasKey) {
            if (!liveHasKey || samePersistenceValue(liveRecord[key], attemptedRecord[key])) delete result[key];
            else result[key] = liveRecord[key];
            continue;
        }
        if (previousHasKey && !attemptedHasKey) {
            if (liveHasKey) result[key] = liveRecord[key];
            continue;
        }
        if (!liveHasKey) {
            delete result[key];
            continue;
        }
        const value = rollbackGenerationValue(previousRecord[key], attemptedRecord[key], liveRecord[key], durableRecord[key]);
        if (value === undefined) delete result[key];
        else result[key] = value;
    }
    return result;
}

function pendingGenerationAttempt(scope: string, projectId: string, effectKeys?: string[]) {
    const attempts = pendingCanvasGenerationAttempts.get(`${scope}\0${projectId}`);
    if (!attempts) return undefined;
    for (const effectKey of effectKeys || []) {
        const attempt = attempts.get(effectKey);
        if (attempt) return attempt;
    }
    return undefined;
}

function ordinaryCanvasProjectSnapshot(scope: string, project: CanvasProject, durableProject: CanvasProject | undefined) {
    const projectKey = `${scope}\0${project.id}`;
    const attemptVersion = generationAttemptVersions.get(projectKey) || 0;
    const cached = ordinaryProjectSnapshots.get(project);
    if (cached?.scope === scope && cached.durableProject === durableProject && cached.attemptVersion === attemptVersion) return cached.snapshot;
    const remember = (snapshot: CanvasProject) => {
        ordinaryProjectSnapshots.set(project, { scope, durableProject, attemptVersion, snapshot });
        return snapshot;
    };
    if (!hasGenerationEffectKeys(project) && !hasGenerationEffectKeys(durableProject)) return remember(project);
    const durableNodes = new Map((durableProject?.nodes || []).map((node) => [node.id, node]));
    const durableSessions = new Map((durableProject?.chatSessions || []).map((session) => [session.id, session]));
    let changed = false;
    let hasUnconfirmedGeneration = false;
    const nodes: CanvasNodeData[] = [];
    for (const node of project.nodes) {
        const durableNode = durableNodes.get(node.id);
        const durableKeys = durableNode?.metadata?.generationEffectKeys;
        const localKeys = node.metadata?.generationEffectKeys;
        if (durableProject && hasUnconfirmedGenerationKey(localKeys, durableKeys)) {
            hasUnconfirmedGeneration = true;
            changed = true;
            if (durableNode) {
                const attempt = pendingGenerationAttempt(scope, project.id, localKeys);
                const previousNode = attempt?.previousNodes?.find((candidate) => candidate.id === node.id);
                const attemptedNode = attempt?.nodes?.find((candidate) => candidate.id === node.id);
                // durableNode comes from the observed storage snapshot. Never mutate that snapshot while
                // rebuilding a failed generation, otherwise a later retry observes a partially rolled-back base.
                const rolledBack = previousNode && attemptedNode
                    ? (rollbackGenerationValue(previousNode, attemptedNode, node, durableNode) as CanvasNodeData)
                    : { ...durableNode, metadata: durableNode.metadata ? { ...durableNode.metadata } : undefined };
                const metadata = { ...(rolledBack.metadata || {}) };
                if (durableKeys?.length) metadata.generationEffectKeys = [...durableKeys];
                else delete metadata.generationEffectKeys;
                nodes.push({ ...rolledBack, metadata });
            }
            continue;
        }
        if (sameGenerationEffectKeys(localKeys, durableKeys)) {
            nodes.push(node);
            continue;
        }
        changed = true;
        const metadata = { ...(node.metadata || {}) };
        if (durableKeys?.length) metadata.generationEffectKeys = [...durableKeys];
        else delete metadata.generationEffectKeys;
        nodes.push({ ...node, metadata });
    }
    const chatSessions: CanvasAssistantSession[] = [];
    for (const session of project.chatSessions) {
        const durableSession = durableSessions.get(session.id);
        const durableKeys = durableSession?.generationEffectKeys;
        if (durableProject && hasUnconfirmedGenerationKey(session.generationEffectKeys, durableKeys)) {
            hasUnconfirmedGeneration = true;
            changed = true;
            if (durableSession) {
                const attempt = pendingGenerationAttempt(scope, project.id, session.generationEffectKeys);
                const previousSession = attempt?.previousChatSessions?.find((candidate) => candidate.id === session.id);
                const attemptedSession = attempt?.chatSessions?.find((candidate) => candidate.id === session.id);
                const rolledBack = previousSession && attemptedSession
                    ? (rollbackGenerationValue(previousSession, attemptedSession, session, durableSession) as CanvasAssistantSession)
                    : { ...durableSession, generationEffectKeys: durableSession.generationEffectKeys ? [...durableSession.generationEffectKeys] : undefined };
                if (durableKeys?.length) rolledBack.generationEffectKeys = [...durableKeys];
                else delete rolledBack.generationEffectKeys;
                chatSessions.push(rolledBack);
            }
            continue;
        }
        if (sameGenerationEffectKeys(session.generationEffectKeys, durableKeys)) {
            chatSessions.push(session);
            continue;
        }
        changed = true;
        const nextSession = { ...session };
        if (durableKeys?.length) nextSession.generationEffectKeys = [...durableKeys];
        else delete nextSession.generationEffectKeys;
        chatSessions.push(nextSession);
    }
    if (durableProject && hasUnconfirmedGeneration) {
        return remember({
            ...project,
            nodes,
            // Connection/active-chat records carry no effect stamp provenance, so keep them fail-closed while any generation entity is unconfirmed.
            connections: durableProject.connections,
            chatSessions,
            activeChatId: durableProject.activeChatId,
        });
    }
    return remember(changed ? { ...project, nodes, chatSessions } : project);
}

function hasGenerationEffectKeys(value: CanvasProject | undefined) {
    if (!value) return false;
    return value.nodes.some((node) => Boolean(node.metadata?.generationEffectKeys?.length))
        || value.chatSessions.some((session) => Boolean(session.generationEffectKeys?.length));
}

function sameGenerationEffectKeys(left?: readonly string[], right?: readonly string[]) {
    if (left === right) return true;
    if (!left?.length && !right?.length) return true;
    if (!left || !right || left.length !== right.length) return false;
    return left.every((value, index) => value === right[index]);
}

function ordinaryCanvasPersistenceState(scope: string, state: PersistedCanvasState, durableProjects: CanvasProject[]) {
    const durableById = new Map(durableProjects.map((project) => [project.id, project]));
    return {
        projects: state.projects.map((project) => ordinaryCanvasProjectSnapshot(scope, project, durableById.get(project.id))),
    };
}

export function reconcileCanvasGenerationFailure(scope: string, durableProjects: CanvasProject[]) {
    if (getActiveUserScope() !== scope) return;
    const projects = ordinaryCanvasPersistenceState(scope, { projects: useCanvasStore.getState().projects }, durableProjects).projects;
    withCanvasStorePersistenceSuppressed(() => {
        useCanvasStore.setState({ projects });
    });
}

const canvasStorage: PersistStorage<CanvasStore> = {
    getItem: async (name) => {
        const scope = getActiveUserScope();
        const value = await localForageStorageForScope(scope).getItem(name);
        if (!value) {
            canvasMemoryStates.set(scope, { projects: [] });
            observedCanvasPersists.set(scope, { projects: [], revision: 0 });
            return null;
        }
        const document = parseCanvasStorageDocument(value);
        const state = document.state as PersistedCanvasState;
        canvasMemoryStates.set(scope, state);
        recordCanvasStorageDocument(scope, document);
        return document as unknown as StorageValue<CanvasStore>;
    },
    setItem: (name, value) => {
        const scope = getActiveUserScope();
        const nextState = value.state as PersistedCanvasState;
        if (canvasMemoryStates.get(scope)?.projects === nextState.projects) return;
        canvasMemoryStates.set(scope, nextState);
        if (suppressCanvasStorePersistence) return;

        const queued = queuedCanvasPersists.get(scope);
        const observed = observedCanvasPersists.get(scope);
        const token = (canvasPersistTokens.get(scope) || 0) + 1;
        canvasPersistTokens.set(scope, token);
        const baseProjects = queued?.baseProjects ?? observed?.projects ?? [];
        queuedCanvasPersists.set(scope, {
            name,
            scope,
            baseProjects,
            baseRevision: queued?.baseRevision ?? observed?.revision ?? 0,
            // generationEffectKeys 由专用 generation durable commit 管理；普通队列只能携带已确认 stamp。
            state: ordinaryCanvasPersistenceState(scope, nextState, observed?.projects ?? baseProjects),
            token,
        });
        clearCanvasSaveTimer(scope);
        const timer = setTimeout(() => {
            if (canvasSaveTimers.get(scope) === timer) canvasSaveTimers.delete(scope);
            void writeQueuedCanvasPersist(scope, token).catch((error) => {
                // 自动保存无法把异常返回给原始状态更新调用方，但失败队列仍会保留给下一次写入或显式 flush 重试。
                console.error("画布本地持久化失败，已保留待写队列", { scope, error });
            });
        }, 400);
        canvasSaveTimers.set(scope, timer);
    },
    removeItem: (name) => {
        const scope = getActiveUserScope();
        return localForageStorageForScope(scope).removeItem(name);
    },
};

export async function flushCanvasStorePersistence() {
    while (canvasStorageTails.size || queuedCanvasPersists.size || canvasSaveTimers.size) {
        for (const scope of [...canvasSaveTimers.keys()]) clearCanvasSaveTimer(scope);
        const writes = [...queuedCanvasPersists.values()].map(({ scope, token }) => writeQueuedCanvasPersist(scope, token));
        if (writes.length) await Promise.all(writes);
        else if (canvasStorageTails.size) await Promise.all([...canvasStorageTails.values()]);
    }
}

export const useCanvasStore = create<CanvasStore>()(
    persist(
        (set, get) => ({
            hydrated: false,
            projects: [],
            createProject: (title = "未命名画布", projectId) => {
                const now = new Date().toISOString();
                const id = nanoid();
                const appearanceDefault = readCanvasAppearanceDefault();
                const project: CanvasProject = {
                    id,
                    revision: 0,
                    projectId,
                    title,
                    createdAt: now,
                    updatedAt: now,
                    nodes: [],
                    connections: [],
                    chatSessions: [],
                    activeChatId: null,
                    appearance: appearanceDefault?.appearance,
                    backgroundMode: appearanceDefault?.backgroundMode || DEFAULT_CANVAS_BACKGROUND_MODE,
                    showImageInfo: false,
                    viewport: initialViewport,
                    directorScenes: [],
                };
                set((state) => ({ projects: [project, ...state.projects] }));
                return id;
            },
            importProject: (source) => {
                const now = new Date().toISOString();
                const project: CanvasProject = {
                    id: nanoid(),
                    revision: 0,
                    projectId: source.projectId,
                    importSource: source.importSource,
                    folderPresentation: source.folderPresentation,
                    title: source.title || currentLocaleText("canvasExtra.library.importedCanvas"),
                    createdAt: source.createdAt || now,
                    updatedAt: now,
                    nodes: source.nodes || [],
                    connections: source.connections || [],
                    chatSessions: source.chatSessions || [],
                    activeChatId: source.activeChatId || null,
                    starterMode: source.starterMode,
                    appearance: source.appearance ? normalizeCanvasAppearance(source.appearance, "dark") : undefined,
                    backgroundMode: source.backgroundMode || DEFAULT_CANVAS_BACKGROUND_MODE,
                    showImageInfo: source.showImageInfo || false,
                    viewport: source.viewport || initialViewport,
                    directorScenes: source.directorScenes || [],
                };
                set((state) => ({ projects: [project, ...state.projects] }));
                return project.id;
            },
            openProject: (id) => {
                return get().projects.find((item) => item.id === id) || null;
            },
            renameProject: (id, title, source = "user") => set((state) => {
                const current = state.projects.find((project) => project.id === id);
                const nextTitle = title.trim() || current?.title;
                if (!current || (current.title === nextTitle && current.titleSource === source)) return state;
                return { projects: state.projects.map((project) => project === current ? { ...project, title: nextTitle!, titleSource: source, updatedAt: new Date().toISOString() } : project) };
            }),
            deleteProjects: (ids) =>
                set((state) => {
                    const projects = state.projects.filter((project) => !ids.includes(project.id));
                    return { projects };
                }),
            replaceProjects: (projects) => set({ projects }),
            updateProject: (id, patch) => set((state) => {
                const current = state.projects.find((project) => project.id === id);
                if (!current) return state;
                const next = { ...current, ...patch };
                if (Object.keys(patch).every((key) => key === "viewport")) {
                    if (samePersistenceValue(current.viewport, next.viewport)) return state;
                    return { projects: state.projects.map((project) => project === current ? next : project) };
                }
                const contentChanged = !sameCanvasContent(current, next);
                if (!contentChanged && samePersistenceValue(current.viewport, next.viewport)) return state;
                if (contentChanged) next.updatedAt = new Date().toISOString();
                return { projects: state.projects.map((project) => project === current ? next : project) };
            }),
        }),
        {
            name: CANVAS_STORE_KEY,
            storage: canvasStorage,
            partialize: (state) =>
                ({
                    projects: state.projects,
                }) as StorageValue<CanvasStore>["state"],
            onRehydrateStorage: () => () => {
                useCanvasStore.setState({ hydrated: true });
            },
        },
    ),
);
