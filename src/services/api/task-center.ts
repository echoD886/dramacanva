import { currentLocaleText as t } from "@/i18n/current-locale-text";
import { resolveAppLocale } from "@/i18n/app-locale";
import { observeGenerationTask } from "@/services/creation-analytics";
import { confirmGenerationBatch, submitConfirmedGeneration, type TaskPriceConfirmation } from "@/lib/confirmed-generation";
import { confirmGenerationPrice } from "@/services/generation-price-confirmation";
import { requestCreativeAccessConfirmation } from "@/services/creative-access-confirmation";
import type { AssetSourceCode } from "@/types/asset-archive";
import { getActiveUserScope } from "@/lib/user-scope";
import { getAuthIdentityGeneration } from "@/services/api/auth";
import { DREAMINA_SUBMIT_ERROR_MESSAGES, generationErrorMessage } from "@/lib/generation-error";
import { GenerationTaskFailure, GENERATION_ERROR_CODES } from "@/lib/generation-failure";
import { apiBaseURL, apiClient, request, type BackendEnvelope } from "@/services/api/request";
import { consumeTaskTextStream, createTaskTextStreamParser, type TaskTextStreamEvent } from "@/services/api/task-text-stream";
import { recordDiagnosticEvent } from "@/services/diagnostics/client-diagnostics";
import {
    deleteLocalDreaminaGenerationTask,
    listLocalDreaminaGenerationTaskPage,
    queryLocalDreaminaGenerationTask,
    refreshLocalDreaminaGenerationTask,
    waitForLocalDreaminaGenerationTask,
    type LocalDreaminaGenerationTask,
} from "@/services/local-dreamina-generation";
import { isLocalDreaminaTaskId, projectLocalDreaminaDiagnosticLog, projectLocalDreaminaTask, stripLocalDreaminaTaskPrefix } from "@/services/local-dreamina-task-projection";

export type { BackendEnvelope } from "@/services/api/request";

export type TaskStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";
export type TaskBillingStatus = "reserved" | "running" | "settled" | "refunded" | "uncertain";
export type ProviderCancelStatus = "requested" | "confirmed" | "uncertain";
export type AgentSessionStatus = "active" | "completed" | "failed";
export type GenerationTaskResultState = "NOT_AVAILABLE" | "PENDING_MATERIALIZATION" | "MATERIALIZING" | "READY" | "FAILED_RETRYABLE" | "FAILED_PERMANENT";
export type GenerationTaskOutput = {
    outputIndex: number;
    mediaType: "image" | "video" | "audio";
    providerArtifactRef?: string;
    materializedAssetId?: string;
    materializationErrorCode?: string;
};

export type GenerationTask = {
    creativeCategory?: string;
    id: string;
    clientOperationId?: string;
    retryOf?: string;
    attemptGroupId?: string;
    sessionId?: string;
    projectId?: string;
    type: string;
    status: TaskStatus;
    progress?: number;
    stage?: string;
    mediaStage?: string;
    canRecoverMedia?: boolean;
    prompt: string;
    operation?: string;
    provider?: string;
    model?: string;
    modelName?: string;
    providerRequestId?: string;
    canCheckStatus?: boolean;
    providerCancelStatus?: ProviderCancelStatus;
    providerCancelError?: string;
    providerCancelAttempts?: number;
    providerCancelRequestedAt?: string;
    providerCancelledAt?: string;
    errorCode?: string;
    errorField?: string;
    officialStatus?: "pending" | "processing" | "completed" | "failed" | "cancelled";
    receiptRecorded?: boolean;
    previewUrl?: string;
    previewKind?: "image" | "video";
    previewPosterUrl?: string;
    inputJson?: string;
    resultJson?: string;
    resultState?: GenerationTaskResultState;
    outputs?: GenerationTaskOutput[];
    textDraft?: string;
    error?: string;
    attempts?: number;
    startedAt?: string;
    completedAt?: string;
    createdAt: string;
    updatedAt: string;
    billing?: {
        amountMicrocredits: number;
        status: TaskBillingStatus;
    };
    clientContext?: {
        canvasId?: string;
        sourceCode?: AssetSourceCode;
        conversationId?: string;
        messageId?: string;
        nodeId?: string;
        batchIndex?: number;
        batchCount?: number;
        domainProjectId?: string;
        chapterId?: string;
        chapterOperation?: "characters" | "storyboard";
        shotId?: string;
        workflowStepId?: string;
        artifactType?: string;
    };
    created_at?: string;
    updated_at?: string;
};

export type ProviderTaskQueryResult = {
    task: GenerationTask;
    providerStatus?: string;
    recovered: boolean;
    billingSettled: boolean;
};

export type TaskTextDelta = {
    id: string;
    taskId: string;
    sequence: number;
    content: string;
    byteCount: number;
    createdAt: string;
    expiresAt: string;
};

export type AgentSession = {
    id: string;
    projectId?: string;
    status: AgentSessionStatus;
    prompt: string;
    canvasSnapshotJson?: string;
    canvasOpsJson?: string;
    createdAt: string;
    updatedAt: string;
};

export type AgentMessage = {
    id: string;
    sessionId: string;
    role: "user" | "assistant" | "system" | "tool" | string;
    content: string;
    payload?: string;
    createdAt: string;
};

export type TaskResult = {
    id: string;
    taskId: string;
    sessionId?: string;
    kind: string;
    url?: string;
    payload?: string;
    createdAt: string;
};

export type TaskLog = {
    id: string;
    taskId: string;
    level: "info" | "warn" | "error";
    stage: string;
    errorCode?: string;
    provenance: "task_state" | "provider_observation" | "background_reconcile" | "manual_refresh" | "backend";
    observedAt?: string;
    createdAt: string;
};

export type AgentSessionDetail = {
    session: AgentSession;
    messages: AgentMessage[];
    tasks: GenerationTask[];
    results: TaskResult[];
};

export type CreateSessionInput = {
    projectId?: string;
    prompt: string;
    canvasSnapshot?: Record<string, unknown>;
    references?: string[];
    projectStyle?: { presetId: string; title: string; prompt: string };
    characters?: Array<{ assetId: string; versionId: string; name: string; definition: Record<string, unknown> }>;
    config?: Record<string, unknown>;
    logicalModelId?: string;
};

export type CreateTaskInput = {
    locale?: string;
    priceConfirmation?: TaskPriceConfirmation;
    sessionId?: string;
    projectId?: string;
    type?: string;
    operation?: string;
    prompt: string;
    provider?: string;
    model?: string;
    logicalModelId?: string;
    input?: Record<string, unknown>;
};

const api = apiClient;

export function createAgentSession(input: CreateSessionInput) {
    const identity = getAuthIdentityGeneration();
    return submitConfirmedGeneration(input, {
        quote: (requestInput) => request<TaskPriceConfirmation>(api.post("/sessions/quote", requestInput)),
        create: (confirmed) => request<AgentSessionDetail>(api.post("/sessions", confirmed)),
        confirm: confirmGenerationPrice,
        assertCurrent: () => {
            if (identity !== getAuthIdentityGeneration()) throw new DOMException("Account changed", "AbortError");
        },
    }).then((detail) => {
        detail.tasks.forEach((task) => notifyCanvasTaskCreated(task));
        return detail;
    });
}

export async function createGenerationTask(input: CreateTaskInput) {
    input = { ...input, locale: input.locale || resolveAppLocale() };
    const identity = getAuthIdentityGeneration();
    let task: GenerationTask;
    try {
        task = await submitPricedTask(input, identity);
    } catch (error) {
        if ((error as { reason?: string })?.reason !== "creative_consent_required" || !(await requestCreativeAccessConfirmation()) || identity !== getAuthIdentityGeneration()) throw error;
        task = await submitPricedTask(input, identity);
    }
    recordDiagnosticEvent({ level: "info", category: "task", message: "任务已创建", taskId: task.id, projectId: task.projectId });
    notifyCanvasTaskCreated(task);
    // 创建任务时积分已被预占，不能等任务结束后才刷新可用余额。
    window.dispatchEvent(new CustomEvent("wallet:updated", { detail: { reason: "usage" } }));
    return task;
}

export function quoteGenerationTask(input: CreateTaskInput, signal?: AbortSignal) {
    return request<TaskPriceConfirmation>(api.post("/tasks/quote", input, { signal }));
}

export function confirmGenerationTaskBatch(inputs: CreateTaskInput[], signal?: AbortSignal) {
    const identity = getAuthIdentityGeneration();
    return confirmGenerationBatch(inputs, {
        quote: (input) => quoteGenerationTask(input, signal),
        confirm: (amountMicrocredits, count) => confirmGenerationPrice({ requestKey: "batch", amountMicrocredits }, false, count),
        assertCurrent: () => {
            signal?.throwIfAborted();
            if (identity !== getAuthIdentityGeneration()) throw new DOMException("Account changed", "AbortError");
        },
    });
}

function submitPricedTask(input: CreateTaskInput, identity: number) {
    return submitConfirmedGeneration(input, {
        initialQuote: input.priceConfirmation,
        quote: quoteGenerationTask,
        create: (confirmed) => request<GenerationTask>(api.post("/tasks", confirmed)),
        confirm: confirmGenerationPrice,
        assertCurrent: () => {
            if (identity !== getAuthIdentityGeneration()) throw new DOMException("Account changed", "AbortError");
        },
    });
}

export type GenerationTaskPageRequest = {
    limit: number;
    projectId?: string;
    activeOnly: boolean;
    cursor?: string;
};

type GenerationTaskPage<T> = { tasks: T[]; nextCursor?: string };
type GenerationTaskListOptions = { projectId?: string; activeOnly?: boolean };
type GenerationTaskListDependencies = {
    listBackend?(limit: number, options?: GenerationTaskListOptions, signal?: AbortSignal): Promise<GenerationTask[]>;
    listLocal?(options?: GenerationTaskListOptions, signal?: AbortSignal): Promise<LocalDreaminaGenerationTask[]>;
    listBackendPage?(request: GenerationTaskPageRequest, signal?: AbortSignal): Promise<GenerationTaskPage<GenerationTask>>;
    listLocalPage?(request: GenerationTaskPageRequest, signal?: AbortSignal): Promise<GenerationTaskPage<LocalDreaminaGenerationTask>>;
};

const defaultGenerationTaskListDependencies: GenerationTaskListDependencies = {
    listBackendPage: async (page, signal) => ({
        tasks: await request<GenerationTask[]>(
            api.get("/tasks", {
                params: { limit: Math.min(page.limit, 100), projectId: page.projectId, activeOnly: page.activeOnly || undefined },
                signal,
            }),
        ),
    }),
    listLocalPage: (page, signal) => listLocalDreaminaGenerationTaskPage(page, {}, signal),
};

export async function listGenerationTasks(limit = 30, options?: { projectId?: string; activeOnly?: boolean; includeLocal?: boolean }, dependencies: GenerationTaskListDependencies = defaultGenerationTaskListDependencies, signal?: AbortSignal) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const boundedLimit = Number.isFinite(limit) ? Math.max(1, Math.min(10_000, Math.trunc(limit))) : 30;
    const baseRequest = {
        limit: Math.min(100, boundedLimit),
        ...(options?.projectId ? { projectId: options.projectId } : {}),
        activeOnly: options?.activeOnly === true,
    } satisfies GenerationTaskPageRequest;
    const backendPageReader =
        dependencies.listBackendPage ??
        (async (page: GenerationTaskPageRequest, pageSignal?: AbortSignal) => ({
            tasks:
                (await dependencies.listBackend?.(
                    page.limit,
                    {
                        ...(page.projectId ? { projectId: page.projectId } : {}),
                        activeOnly: page.activeOnly,
                    },
                    pageSignal,
                )) ?? [],
        }));
    const localPageReader =
        dependencies.listLocalPage ??
        (async (page: GenerationTaskPageRequest, pageSignal?: AbortSignal) => ({
            tasks:
                (await dependencies.listLocal?.(
                    {
                        ...(page.projectId ? { projectId: page.projectId } : {}),
                        activeOnly: page.activeOnly,
                    },
                    pageSignal,
                )) ?? [],
        }));
    const [backendTasks, localTasks] = await Promise.all([
        collectGenerationTaskPages(backendPageReader, baseRequest, boundedLimit, signal),
        options?.includeLocal === false ? Promise.resolve([]) : collectGenerationTaskPages(localPageReader, baseRequest, boundedLimit, signal).catch(() => []),
    ]);
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const tasks = [...backendTasks, ...localTasks.map((task) => projectLocalDreaminaTask(task))]
        .filter((task) => !options?.projectId || task.projectId === options.projectId)
        .filter((task) => !options?.activeOnly || task.status === "queued" || task.status === "running")
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || right.id.localeCompare(left.id))
        .slice(0, boundedLimit);
    tasks.forEach((task) => observeGenerationTask(task));
    return tasks;
}

/** Backend tasks created strictly before `after` (newest first), for "load older" in the task center. */
export function listOlderGenerationTasks(after: Pick<GenerationTask, "createdAt" | "id">, limit = 30, signal?: AbortSignal) {
    return request<GenerationTask[]>(api.get("/tasks", { params: { limit: Math.max(1, Math.min(100, Math.trunc(limit))), before: after.createdAt, beforeId: after.id }, signal }));
}

async function collectGenerationTaskPages<T>(readPage: (request: GenerationTaskPageRequest, signal?: AbortSignal) => Promise<GenerationTaskPage<T>>, baseRequest: GenerationTaskPageRequest, limit: number, signal?: AbortSignal) {
    const items: T[] = [];
    const seenCursors = new Set<string>();
    let cursor: string | undefined;
    do {
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
        const response = await readPage({ ...baseRequest, ...(cursor ? { cursor } : {}) }, signal);
        const page = Array.isArray(response) ? { tasks: response as T[] } : response;
        items.push(...page.tasks);
        if (!page.nextCursor || seenCursors.has(page.nextCursor)) break;
        seenCursors.add(page.nextCursor);
        cursor = page.nextCursor;
    } while (items.length < limit);
    return items.slice(0, limit);
}

export function queryGenerationTask(id: string, options?: { signal?: AbortSignal }) {
    if (isLocalDreaminaTaskId(id)) {
        return queryLocalDreaminaGenerationTask(stripLocalDreaminaTaskPrefix(id), undefined, {}, options?.signal).then((task) => {
            const projected = projectLocalDreaminaTask(task);
            observeGenerationTask(projected);
            return projected;
        });
    }
    return request<GenerationTask>(api.get(`/tasks/${encodeURIComponent(id)}`, { signal: options?.signal })).then((task) => {
        observeGenerationTask(task);
        return task;
    });
}

export function waitForLocalGenerationTask(id: string, options?: { signal?: AbortSignal }) {
    if (!isLocalDreaminaTaskId(id)) return Promise.reject(new Error(t("creationRuntime.notLocalDreamina")));
    return waitForLocalDreaminaGenerationTask(stripLocalDreaminaTaskPrefix(id), undefined, {}, options?.signal).then((task) => projectLocalDreaminaTask(task));
}

export function splitGenerationTaskObservationIds(ids: readonly string[]) {
    return {
        localWaitIds: ids.filter(isLocalDreaminaTaskId),
        remotePollIds: ids.filter((id) => !isLocalDreaminaTaskId(id)),
    };
}

type GenerationTaskSubscriptionDependencies = {
    queryTask(id: string, options?: { signal?: AbortSignal }): Promise<GenerationTask>;
    waitTask(id: string, options?: { initialTask?: GenerationTask; onTaskUpdate?: (task: GenerationTask) => void; signal?: AbortSignal }): Promise<GenerationTask>;
    identity?: () => string;
};

export function createGenerationTaskSubscriptionService(dependencies: GenerationTaskSubscriptionDependencies) {
    type Entry = {
        listeners: Set<(task: GenerationTask) => void>;
        identity: string;
        controller: AbortController;
        latest?: GenerationTask;
        observation?: Promise<void>;
        retry?: ReturnType<typeof setTimeout>;
        failures: number;
    };
    const entries = new Map<string, Entry>();
    const identity = dependencies.identity ?? (() => "default");
    const retire = (id: string, entry: Entry) => {
        entry.controller.abort();
        clearTimeout(entry.retry);
        entry.listeners.clear();
        if (entries.get(id) === entry) entries.delete(id);
    };
    const current = (id: string, entry: Entry) => {
        if (entry.identity !== identity()) retire(id, entry);
        return entries.get(id) === entry && !entry.controller.signal.aborted;
    };
    const publish = (id: string, entry: Entry, task: GenerationTask) => {
        if (!current(id, entry)) return;
        entry.latest = task;
        for (const listener of entry.listeners) listener(task);
    };
    const terminal = (task?: GenerationTask) => task && ["succeeded", "failed", "cancelled"].includes(task.status);
    const observe = (id: string, entry: Entry) => {
        if (entry.observation || terminal(entry.latest) || !current(id, entry)) return;
        clearTimeout(entry.retry);
        entry.retry = undefined;
        entry.observation = (async () => {
            const initial = await dependencies.queryTask(id, { signal: entry.controller.signal });
            if (!current(id, entry)) return;
            publish(id, entry, initial);
            if (terminal(initial)) return;
            const completed = await dependencies.waitTask(id, {
                initialTask: initial,
                onTaskUpdate: (task) => publish(id, entry, task),
                signal: entry.controller.signal,
            });
            publish(id, entry, completed);
            entry.failures = 0;
        })()
            .catch(() => {
                // A rejected observation must not permanently poison the entry.
                // Retry while observed, but never continue for a retired identity.
                if (!current(id, entry) || !entry.listeners.size) return;
                const delayMs = Math.min(30_000, 1_000 * 2 ** Math.min(entry.failures++, 5));
                entry.retry = setTimeout(() => observe(id, entry), delayMs);
            })
            .finally(() => {
                entry.observation = undefined;
            });
    };
    return {
        subscribe(ids: readonly string[], listener: (task: GenerationTask) => void) {
            const selectedIdentity = identity();
            for (const [id, entry] of entries) if (entry.identity !== selectedIdentity) retire(id, entry);
            const subscribed = [...new Set(ids)].map((id) => {
                const entry = entries.get(id) ?? { listeners: new Set<(task: GenerationTask) => void>(), identity: selectedIdentity, controller: new AbortController(), failures: 0 };
                entries.set(id, entry);
                entry.listeners.add(listener);
                if (entry.latest) listener(entry.latest);
                observe(id, entry);
                return [id, entry] as const;
            });
            return () => {
                for (const [id, entry] of subscribed) {
                    entry.listeners.delete(listener);
                    // Preserve synchronous remount/reconnect without retaining
                    // every finished task and its private result forever.
                    queueMicrotask(() => {
                        if (!entry.listeners.size) retire(id, entry);
                    });
                }
            };
        },
    };
}

const generationTaskSubscriptionService = createGenerationTaskSubscriptionService({
    queryTask: (id, options) => queryGenerationTask(id, options),
    waitTask: (id, options) => waitForGenerationTask(id, options),
    identity: () => `${getAuthIdentityGeneration()}:${getActiveUserScope()}`,
});

export function subscribeGenerationTasks(ids: readonly string[], listener: (task: GenerationTask) => void) {
    return generationTaskSubscriptionService.subscribe(ids, listener);
}

export function appendTaskTextDelta(id: string, content: string) {
    return request<TaskTextDelta>(api.post(`/tasks/${encodeURIComponent(id)}/text-deltas`, { content }));
}

export function completeTextReplayTask(id: string, text: string) {
    return request<GenerationTask>(api.post(`/tasks/${encodeURIComponent(id)}/text-replay-complete`, { text }));
}

export function failTextReplayTask(id: string, cancelled = false) {
    return request<GenerationTask>(api.post(`/tasks/${encodeURIComponent(id)}/text-replay-fail`, { cancelled }));
}

export function retryGenerationTask(id: string) {
    const identity = getAuthIdentityGeneration();
    return submitConfirmedGeneration(
        { id },
        {
            quote: () => request<TaskPriceConfirmation>(api.post(`/tasks/${encodeURIComponent(id)}/retry-quote`)),
            create: (confirmed) => request<GenerationTask>(api.post(`/tasks/${encodeURIComponent(id)}/retry`, confirmed)),
            confirm: confirmGenerationPrice,
            assertCurrent: () => {
                if (identity !== getAuthIdentityGeneration()) throw new DOMException("Account changed", "AbortError");
            },
        },
    );
}

export function recoverMediaTask(id: string) {
    return request<GenerationTask>(api.post(`/tasks/${encodeURIComponent(id)}/recover-media`));
}

export function cancelGenerationTask(id: string) {
    if (isLocalDreaminaTaskId(id)) {
        return Promise.reject(new Error(t("creationRuntime.dreaminaCancelUnsupported")));
    }
    return request<GenerationTask>(api.post(`/tasks/${encodeURIComponent(id)}/cancel`)).then((task) => {
        window.dispatchEvent(new CustomEvent("canvas:task-cancelled", { detail: { task } }));
        window.dispatchEvent(new CustomEvent("wallet:updated", { detail: { reason: "usage" } }));
        return task;
    });
}

export function queryFailedVideoProviderTask(id: string) {
    return request<ProviderTaskQueryResult>(api.post(`/tasks/${encodeURIComponent(id)}/query-provider`));
}

export function refreshGenerationTaskStatus(id: string, options?: { signal?: AbortSignal }) {
    if (!isLocalDreaminaTaskId(id)) return Promise.reject(new Error(t("creationRuntime.taskRefreshUnsupported")));
    return refreshLocalDreaminaGenerationTask(stripLocalDreaminaTaskPrefix(id), {}, options?.signal).then((task) => projectLocalDreaminaTask(task));
}

export function recoverGenerationTaskMedia(id: string) {
    return request<GenerationTask>(api.post(`/tasks/${encodeURIComponent(id)}/recover-media`));
}

export function deleteGenerationTask(id: string) {
    if (!isLocalDreaminaTaskId(id)) return Promise.reject(new Error(t("creationRuntime.taskDeleteUnsupported")));
    return deleteLocalDreaminaGenerationTask(stripLocalDreaminaTaskPrefix(id));
}

export async function listTaskLogs(id: string) {
    if (isLocalDreaminaTaskId(id)) {
        const task = await queryGenerationTask(id);
        return [projectGenerationTaskSafeLog(task)];
    }
    const raw = await request<Array<{ level?: unknown; message?: unknown; payload?: unknown; createdAt?: unknown }>>(api.get(`/tasks/${encodeURIComponent(id)}/logs`));
    return raw.map((log, index) => projectBackendSafeTaskLog(id, log, index));
}

export function formatTaskLog(log: TaskLog) {
    return [`stage=${log.stage}`, ...(log.errorCode ? [`error=${log.errorCode}`] : []), `provenance=${log.provenance}`, ...(log.observedAt ? [`observedAt=${log.observedAt}`] : [])].join(" ");
}

function projectGenerationTaskSafeLog(task: GenerationTask): TaskLog {
    const diagnostic = projectLocalDreaminaDiagnosticLog({
        level: task.errorCode || task.status === "failed" || task.status === "cancelled" ? "error" : "info",
        stage: task.stage || task.status,
        errorCode: task.errorCode,
        provenance: task.officialStatus ? "provider_observation" : "task_state",
        observedAt: task.updatedAt,
    });
    return {
        id: `safe:${task.id}:${task.updatedAt}`,
        taskId: task.id,
        ...diagnostic,
        createdAt: diagnostic.observedAt,
    };
}

export function projectBackendSafeTaskLog(taskId: string, raw: { level?: unknown; message?: unknown; payload?: unknown; createdAt?: unknown }, index: number): TaskLog {
    const text = [raw.message, raw.payload].filter((value): value is string => typeof value === "string").join(" ");
    const stage = safeTaskLogStage(text) || "backend_event";
    const errorCode = safeTaskLogErrorCode(text);
    const createdAt = typeof raw.createdAt === "string" && Number.isFinite(Date.parse(raw.createdAt)) ? raw.createdAt : "1970-01-01T00:00:00.000Z";
    return {
        id: `safe:${taskId}:${index}`,
        taskId,
        level: raw.level === "error" ? "error" : raw.level === "warn" ? "warn" : "info",
        stage,
        ...(errorCode ? { errorCode } : {}),
        provenance: "backend",
        createdAt,
    };
}

function safeTaskLogStage(value: unknown) {
    if (typeof value !== "string") return undefined;
    const match = value.match(/(?:^|[^a-z0-9_])(queued|submitting|submitted|generating|submission_unknown|processing|completed|succeeded|failed|cancelled)(?:$|[^a-z0-9_])/i);
    return match?.[1]?.toLowerCase();
}

const SAFE_TASK_LOG_ERROR_CODES = new Set([...GENERATION_ERROR_CODES, ...Object.keys(DREAMINA_SUBMIT_ERROR_MESSAGES), "dreamina_query_failed", "dreamina_submission_unknown", "dreamina_reference_invalid"]);

function safeTaskLogErrorCode(value: unknown) {
    if (typeof value !== "string") return undefined;
    for (const code of GENERATION_ERROR_CODES) if (new RegExp(`(?:^|[^a-z0-9_])${code}(?:$|[^a-z0-9_])`).test(value)) return code;
    for (const match of value.matchAll(/(?:dreamina|local_generation|model|provider)_[a-z0-9_]{2,80}/gi)) {
        const errorCode = match[0].toLowerCase();
        if (SAFE_TASK_LOG_ERROR_CODES.has(errorCode)) return errorCode;
    }
    return undefined;
}

export type WaitForGenerationTaskOptions = {
    signal?: AbortSignal;
    intervalMs?: number;
    timeoutMs?: number;
    initialTask?: GenerationTask;
    onTaskUpdate?: (task: GenerationTask) => void;
    onTextDelta?: (text: string) => void;
    useTextEvents?: boolean;
};

export async function waitForGenerationTask(id: string, options?: WaitForGenerationTaskOptions) {
    if (isLocalDreaminaTaskId(id)) {
        try {
            const task = await waitForLocalGenerationTask(id, { signal: options?.signal });
            options?.onTaskUpdate?.(task);
            if (task.status === "succeeded") return task;
            if (task.status === "failed" || task.status === "cancelled") {
                throw new Error(task.error ? generationErrorMessage(task.error) : t(task.status === "cancelled" ? "canvasExtra.task.cancelled" : "canvasExtra.task.failed"));
            }
            throw new Error(t("creationRuntime.taskWaitEnded"));
        } catch (error) {
            if (options?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
            throw error;
        }
    }
    if (options?.onTextDelta || options?.useTextEvents) return waitForGenerationTaskTextEvents(id, options);
    const startedAt = Date.now();
    const intervalMs = options?.intervalMs || 2000;
    let lastTask = options?.initialTask;
    let lastQueryError: unknown;
    let consecutiveFailures = 0;
    try {
        while (Date.now() - startedAt < (options?.timeoutMs || taskWaitTimeoutMs(lastTask))) {
            if (options?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
            let task: GenerationTask;
            try {
                task = await queryGenerationTask(id, { signal: options?.signal });
                lastTask = task;
                lastQueryError = undefined;
                consecutiveFailures = 0;
                options?.onTaskUpdate?.(task);
            } catch (error) {
                lastQueryError = error;
                consecutiveFailures += 1;
                // 连续失败说明查询通道已不可用，继续轮询只会空转到整体超时；
                // 保留少量容忍度（约 10 秒）以跳过瞬时抖动后直接报错，便于用户尽早处理。
                if (consecutiveFailures >= 5) {
                    throw error instanceof Error ? error : new Error(String(error));
                }
                await delay(intervalMs, options?.signal);
                continue;
            }
            if (task.status === "succeeded") {
                window.dispatchEvent(new CustomEvent("wallet:updated", { detail: { reason: "usage" } }));
                return task;
            }
            if (task.status === "failed" || task.status === "cancelled") {
                window.dispatchEvent(new CustomEvent("wallet:updated", { detail: { reason: "usage" } }));
                throw task.status === "failed" ? new GenerationTaskFailure(task) : new Error(t("canvasExtra.task.cancelled"));
            }
            await delay(intervalMs, options?.signal);
        }
    } catch (error) {
        if (options?.signal?.aborted) {
            // Abort 只停止当前页面的状态监听，不能把已发起的上游任务改成取消状态。
            throw new DOMException("Aborted", "AbortError");
        }
        throw error;
    }
    throw new Error(lastQueryError instanceof Error ? `${t("creationRuntime.taskSyncFailed")}: ${lastQueryError.message}` : t("creationRuntime.taskTimeout"));
}

async function waitForGenerationTaskTextEvents(id: string, options: WaitForGenerationTaskOptions) {
    const startedAt = Date.now();
    const intervalMs = options.intervalMs || 1000;
    let lastTask = options.initialTask;
    let lastEventId = 0;
    let fullText = lastTask?.textDraft || "";
    let lastStreamError: unknown;
    if (!lastTask) {
        lastTask = await queryGenerationTask(id, { signal: options.signal });
        options.onTaskUpdate?.(lastTask);
    }
    const timeoutMs = options.timeoutMs || taskWaitTimeoutMs(lastTask);
    while (Date.now() - startedAt < timeoutMs) {
        if (options.signal?.aborted) throw new DOMException("Aborted", "AbortError");
        let terminalReceived = false;
        try {
            const base = String(apiBaseURL).replace(/\/+$/, "");
            const cursor = lastEventId > 0 ? `?after=${encodeURIComponent(String(lastEventId))}` : "";
            const response = await fetch(`${base}/tasks/${encodeURIComponent(id)}/text-events${cursor}`, {
                headers: { Accept: "text/event-stream", "X-Canvas-User-Scope": getActiveUserScope() },
                credentials: "include",
                signal: options.signal,
            });
            if (!response.ok) throw new TaskTextStreamFatalError(await taskTextStreamHTTPError(response));
            if (!(response.headers.get("content-type") || "").toLowerCase().includes("text/event-stream")) {
                throw new TaskTextStreamFatalError("任务文本流接口未返回事件流，请检查后端地址和反向代理配置");
            }
            if (!response.body) throw new Error(t("creationRuntime.textStreamUnavailable"));
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            const parser = createTaskTextStreamParser();
            const onEvent = (event: TaskTextStreamEvent) => {
                const payload = asTaskTextStreamRecord(event.data);
                if (event.event === "delta") {
                    const sequence = numberValue(payload.sequence) || event.id || 0;
                    if (sequence <= lastEventId) return;
                    const content = typeof payload.content === "string" ? payload.content : "";
                    lastEventId = sequence;
                    if (!content) return;
                    fullText += content;
                    options.onTextDelta?.(fullText);
                    if (lastTask) {
                        lastTask = { ...lastTask, textDraft: fullText };
                        options.onTaskUpdate?.(lastTask);
                    }
                    return;
                }
                if (event.event === "progress") {
                    if (!lastTask) return;
                    lastTask = {
                        ...lastTask,
                        ...(isTaskStatus(payload.status) ? { status: payload.status } : {}),
                        ...(typeof payload.stage === "string" ? { stage: payload.stage } : {}),
                        ...(numberValue(payload.progress) !== undefined ? { progress: numberValue(payload.progress) } : {}),
                    };
                    options.onTaskUpdate?.(lastTask);
                    return;
                }
                if (event.event === "terminal") {
                    terminalReceived = true;
                    if (typeof payload.finalText === "string" && payload.finalText !== fullText) {
                        fullText = payload.finalText;
                        options.onTextDelta?.(fullText);
                    }
                    return;
                }
                if (event.event === "error") throw new Error(typeof payload.message === "string" ? payload.message : t("creationRuntime.textStreamUnavailable"));
            };
            for (;;) {
                const { done, value } = await reader.read();
                if (done) break;
                consumeTaskTextStream(parser, decoder.decode(value, { stream: true }), onEvent);
            }
            consumeTaskTextStream(parser, decoder.decode(), onEvent, true);
            if (terminalReceived) {
                const completed = await queryGenerationTask(id, { signal: options.signal });
                options.onTaskUpdate?.(completed);
                window.dispatchEvent(new CustomEvent("wallet:updated", { detail: { reason: "usage" } }));
                if (completed.status === "succeeded") return completed;
                if (completed.status === "failed" || completed.status === "cancelled") {
                    throw completed.status === "failed" ? new GenerationTaskFailure(completed) : new TaskTextStreamFatalError(t("canvasExtra.task.cancelled"));
                }
            }
            lastStreamError = new Error(t("creationRuntime.textStreamEnded"));
        } catch (error) {
            if (options.signal?.aborted) throw new DOMException("Aborted", "AbortError");
            if (error instanceof TaskTextStreamFatalError || error instanceof GenerationTaskFailure) throw error;
            lastStreamError = error;
        }
        await delay(intervalMs, options.signal);
    }
    throw new Error(lastStreamError instanceof Error ? `${t("creationRuntime.taskTextSyncFailed")}: ${lastStreamError.message}` : t("creationRuntime.taskTimeout"));
}

function asTaskTextStreamRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function numberValue(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isTaskStatus(value: unknown): value is TaskStatus {
    return value === "queued" || value === "running" || value === "succeeded" || value === "failed" || value === "cancelled";
}

class TaskTextStreamFatalError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "TaskTextStreamFatalError";
    }
}

async function taskTextStreamHTTPError(response: Response) {
    try {
        const payload = (await response.json()) as { msg?: unknown };
        if (typeof payload.msg === "string" && payload.msg.trim()) return payload.msg;
    } catch {
        // SSE 错误响应可能是空正文或网关 HTML，只返回状态码，避免泄露正文。
    }
    return t("creationRuntime.taskTextHTTPFailed", { status: response.status });
}

export function taskWaitTimeoutMs(task?: GenerationTask) {
    const type = task?.type || "";
    if (type.includes("storyboard")) return 22 * 60 * 1000;
    if (type.includes("video")) return 32 * 60 * 1000;
    if (type.includes("image")) return 10 * 60 * 1000;
    if (type.includes("text") || type.includes("audio")) return 12 * 60 * 1000;
    return 10 * 60 * 1000;
}

// 长轮询会在同一个 signal 上反复等待；计时正常结束时必须移除 abort 监听，避免监听器随轮询次数累积。
export function delay(ms: number, signal?: AbortSignal) {
    return new Promise<void>((resolve, reject) => {
        if (signal?.aborted) {
            reject(new DOMException("Aborted", "AbortError"));
            return;
        }
        const onAbort = () => {
            window.clearTimeout(timer);
            reject(new DOMException("Aborted", "AbortError"));
        };
        const timer = window.setTimeout(() => {
            signal?.removeEventListener("abort", onAbort);
            resolve();
        }, ms);
        signal?.addEventListener("abort", onAbort, { once: true });
    });
}

function notifyCanvasTaskCreated(task: GenerationTask) {
    observeGenerationTask(task, true);
    if (typeof window === "undefined" || !task.projectId) return;
    window.dispatchEvent(new CustomEvent("canvas:task-created", { detail: { task } }));
}
