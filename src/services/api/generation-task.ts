import { currentLocaleText as t } from "@/i18n/current-locale-text";
import { createAudioValidationError } from "@/i18n/ddcat-updates";
import { observeGenerationTask } from "@/services/creation-analytics";
import { guardVideoReferences, supportedVideoReferenceModel, videoReferenceActions, videoReferenceIssue } from "@/lib/video-reference-validation";
import { showVideoReferenceWarning, videoReferenceIssueFromError } from "@/lib/video-reference-issue";
import { ApiError, http } from "@/services/api/request";
import { ASSET_SOURCE_CODES, type AssetSourceCode } from "@/types/asset-archive";
import { getMediaBlob } from "@/services/file-storage";
import { getImageBlob } from "@/services/image-storage";
import { resourceIdFromStorageKey, resourceIdFromUrl, resourceStorageKey, uploadResourceFile } from "@/services/api/resources";
import { confirmGenerationTaskBatch, createGenerationTask, waitForGenerationTask, type CreateTaskInput, type GenerationTask } from "@/services/api/task-center";
import { LOCAL_DREAMINA_WAIT_STOPPED_CODE, LocalDreaminaGenerationClientError, runLocalDreaminaGenerationTask, type LocalDreaminaGenerationInput, type LocalDreaminaGenerationTask } from "@/services/local-dreamina-generation";
import { isLocalDreaminaBackgroundTask, localDreaminaTaskId, projectLocalDreaminaTask, stripLocalDreaminaTaskPrefix } from "@/services/local-dreamina-task-projection";
import { modelCapabilityConfigFor } from "@/lib/model-capabilities";
import { selectedModelParameters } from "@/lib/model-documented-parameters";
import { grokImagePromptLimitError } from "@/lib/grok-image-prompt-limit";
import { resolveGenerationWorkflowExecution, type GenerationWorkflowExecution } from "@/lib/generation-workflow-execution";
import { effectiveAudioMode, resolveVideoOperation, supportsAudioReferenceVoice } from "@/lib/model-selection";
import { isArkPlanBaseUrl } from "@/lib/seedance-video";
import { isMusicModelConfig, logicalModelIDForConfig, modelOptionName, resolveModelChannel, resolveModelRequestConfig, type AiConfig } from "@/stores/use-config-store";
import { useLocalDreaminaModelStore } from "@/stores/use-local-dreamina-model-store";
import { useLocalRuntimeStore } from "@/stores/use-local-runtime-store";
import type { ReferenceImage } from "@/types/image";
import type { ReferenceAudio, ReferenceVideo } from "@/types/media";
import { buildBackendToolRequests, type ResponseFunctionTool, type ResponseInputMessage, type ToolChoice, type ToolResponseResult } from "@/services/api/image";

export { logicalModelIDForConfig };

export function backendModelRuntimeRequired(config: AiConfig) {
    if ((config.taskWorkflowProvider || "model") !== "model") return true;
    if (logicalModelIDForConfig(config)) return true;
    const requestConfig = resolveModelRequestConfig(config, config.model);
    return Boolean(requestConfig.channelId || requestConfig.interfaceType);
}

export type BackendGenerationMode = "text" | "image" | "video" | "audio";

export type BackendGenerationResult = {
    mode?: BackendGenerationMode;
    images?: Array<{ dataUrl: string; storageKey?: string; width?: number; height?: number; bytes?: number; mimeType?: string }>;
    video?: { dataUrl: string; storageKey?: string; width?: number; height?: number; durationMs?: number; bytes?: number; mimeType?: string };
    audio?: { dataUrl: string; storageKey?: string; durationMs?: number; bytes?: number; mimeType?: string; format?: string };
    audios?: Array<NonNullable<BackendGenerationResult["audio"]>>;
    text?: string;
    toolCalls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string }; thoughtSignature?: string }>;
    reasoning?: string;
};

export function backendAudioResults(result: BackendGenerationResult): NonNullable<BackendGenerationResult["audio"]>[] {
    return result.audios?.length ? result.audios : result.audio ? [result.audio] : [];
}

export type BackendGenerationTaskOptions = {
    projectId?: string;
    canvasId?: string;
    domainProjectId?: string;
    sourceCode?: import("@/types/asset-archive").AssetSourceCode;
    mode: BackendGenerationMode;
    prompt: string;
    config: AiConfig;
    referenceImages?: ReferenceImage[];
    referenceVideos?: ReferenceVideo[];
    referenceAudios?: ReferenceAudio[];
    textHistory?: Array<{ role: "user" | "assistant" | "system"; content: string }>;
    mask?: ReferenceImage;
    signal?: AbortSignal;
    metadata?: Record<string, unknown>;
    onTaskUpdate?: (task: GenerationTask) => void;
    onTextDelta?: (text: string) => void;
    streamText?: boolean;
    enableThinking?: boolean;
    localIdempotencyKey?: string;
    localResumeOnly?: boolean;
    clientOperationId?: string;
    retryOf?: string;
    retryContextsByBatchIndex?: Array<{ retryOf: string; attemptGroupId: string; clientOperationId: string }>;
    attemptGroupId?: string;
};

export type GenerationTaskDependencies = {
    createAtomicBatch?: (inputs: CreateTaskInput[], signal?: AbortSignal) => Promise<GenerationTask[]>;
    confirmBatch?: typeof confirmGenerationTaskBatch;
    createTask: typeof createGenerationTask;
    waitTask: typeof waitForGenerationTask;
    runLocal: (input: LocalDreaminaGenerationInput, signal?: AbortSignal, onTaskUpdate?: (task: LocalDreaminaGenerationTask) => void) => ReturnType<typeof runLocalDreaminaGenerationTask>;
    createId: () => string;
    now: () => string;
    ensureLocalDreaminaReady?: (signal?: AbortSignal) => Promise<unknown>;
};

export const backendGenerationTaskDependencies: GenerationTaskDependencies = {
    confirmBatch: confirmGenerationTaskBatch,
    createTask: createGenerationTask,
    waitTask: waitForGenerationTask,
    runLocal: (input, signal, onTaskUpdate) => runLocalDreaminaGenerationTask(input, { onTaskUpdate }, signal),
    createId: () => crypto.randomUUID(),
    now: () => new Date().toISOString(),
    ensureLocalDreaminaReady: async (signal) => {
        signal?.throwIfAborted();
        if (useLocalRuntimeStore.getState().connection !== "connected") await useLocalRuntimeStore.getState().connect();
        signal?.throwIfAborted();
        return useLocalDreaminaModelStore.getState().ensureReady(signal);
    },
};
const defaultDependencies = backendGenerationTaskDependencies;

type PreparedGenerationReferences = {
    referenceImages: Awaited<ReturnType<typeof prepareBackendImageReference>>[];
    referenceVideos: Awaited<ReturnType<typeof prepareBackendMediaReference>>[];
    referenceAudios: Awaited<ReturnType<typeof prepareBackendMediaReference>>[];
    mask?: Awaited<ReturnType<typeof prepareBackendImageReference>>;
};

// 生成、计费、取消和任务记录必须共用后端任务生命周期，页面层不能再直连供应商。
export async function runBackendGenerationTask(
    {
        projectId,
        canvasId,
        domainProjectId,
        sourceCode,
        mode,
        prompt,
        config,
        referenceImages = [],
        referenceVideos = [],
        referenceAudios = [],
        textHistory = [],
        mask,
        signal,
        metadata,
        onTaskUpdate,
        onTextDelta,
        streamText,
        enableThinking,
        localIdempotencyKey,
        localResumeOnly,
        clientOperationId,
        retryOf,
        attemptGroupId,
    }: BackendGenerationTaskOptions,
    dependencies: GenerationTaskDependencies = defaultDependencies,
) {
    throwIfAborted(signal);
    assertClientPromptLimit(mode, prompt, config, metadata);
    if (usesLocalDreamina(config)) {
        await dependencies.ensureLocalDreaminaReady?.(signal);
        throwIfAborted(signal);
        return await runLocalDreaminaGeneration(
            {
                projectId,
                canvasId,
                domainProjectId,
                sourceCode,
                mode,
                prompt,
                config,
                referenceImages,
                referenceVideos,
                referenceAudios,
                textHistory,
                mask,
                signal,
                metadata,
                onTaskUpdate,
                onTextDelta,
                streamText,
                enableThinking,
                localIdempotencyKey,
                localResumeOnly,
                clientOperationId,
                retryOf,
                attemptGroupId,
            },
            dependencies,
        );
    }
    assertBackendRuntimeConfigured(config, mode);
    const prepared = await prepareGenerationReferences({ config, mode, referenceImages, referenceVideos, referenceAudios, mask });
    throwIfAborted(signal);
    return createAndWaitGenerationTask(
        { projectId, canvasId, domainProjectId, sourceCode, mode, prompt, config, referenceImages, referenceVideos, referenceAudios, textHistory, signal, metadata, onTaskUpdate, onTextDelta, streamText, enableThinking },
        prepared,
        dependencies,
    );
}

// 分镜等后台生产流程只需要可靠提交任务；任务状态与产物由项目工作区轮询和
// 后端自动回填负责，不能让页面 mutation 一直等待供应商完成。
export async function submitBackendGenerationTask(options: BackendGenerationTaskOptions, dependencies: GenerationTaskDependencies = defaultDependencies): Promise<GenerationTask> {
    throwIfAborted(options.signal);
    assertClientPromptLimit(options.mode, options.prompt, options.config, options.metadata);
    if (usesLocalDreamina(options.config)) throw new Error(t("creationRuntime.localBackgroundUnsupported"));
    // Existing screenplay projects can submit a saved model name and let the
    // server resolve its route. Keep that contract; canvas runs validate locally.
    const prepared = await prepareGenerationReferences(options);
    throwIfAborted(options.signal);
    return createBackendGenerationTask(options, prepared, dependencies);
}

export async function prepareBackendGenerationTask(options: BackendGenerationTaskOptions): Promise<CreateTaskInput> {
    throwIfAborted(options.signal);
    assertClientPromptLimit(options.mode, options.prompt, options.config, options.metadata);
    const references = await prepareGenerationReferences(options);
    throwIfAborted(options.signal);
    return buildBackendGenerationRequest(options, references);
}

type BackendToolGenerationOptions = {
    prompt: string;
    config: AiConfig;
    messages: ResponseInputMessage[];
    tools: ResponseFunctionTool[];
    toolChoice: ToolChoice;
    signal?: AbortSignal;
    onDelta?: (text: string) => void;
    onTaskCreated?: (task: GenerationTask) => void;
    metadata?: { source: string; nodeId?: string; runId?: string; stage?: string };
};

export function prepareBackendToolGenerationTask(options: BackendToolGenerationOptions): CreateTaskInput {
    throwIfAborted(options.signal);
    const imageKeys = new Set<string>();
    for (const message of options.messages) {
        if ("type" in message || message.role === "tool" || !Array.isArray(message.content)) continue;
        for (const part of message.content) {
            if (part.type === "image_url" && resourceIdFromStorageKey(part.image_url.url)) imageKeys.add(part.image_url.url);
        }
    }
    const logicalModelId = logicalModelIDForConfig(options.config);
    const requestConfig = resolveModelRequestConfig(options.config, options.config.model);
    if (!logicalModelId && !requestConfig.channelId && !requestConfig.interfaceType) throw new Error(t("creationRuntime.protocolRequired"));
    return {
        type: "canvas_text",
        operation: "text",
        prompt: options.prompt,
        model: options.config.model,
        ...(logicalModelId ? { logicalModelId } : {}),
        input: {
            mode: "text",
            prompt: options.prompt,
            config: backendProviderConfig(options.config),
            agentRequests: buildBackendToolRequests(options.messages, options.tools, options.toolChoice, options.config),
            referenceImages: [...imageKeys].map((storageKey) => ({ storageKey })),
            metadata: options.metadata || { source: "canvas-online-agent" },
        },
    };
}

export async function runBackendToolGenerationTask(options: BackendToolGenerationOptions): Promise<ToolResponseResult> {
    const task = await createGenerationTask(prepareBackendToolGenerationTask(options));
    options.onTaskCreated?.(task);
    const completed = await waitForGenerationTask(task.id, { signal: options.signal, initialTask: task, onTextDelta: options.onDelta });
    const result = parseBackendGenerationResult(completed);
    return {
        content: result.text || "",
        toolCalls: result.toolCalls || [],
        ...(result.reasoning ? { reasoning: result.reasoning } : {}),
    };
}

export async function runBackendGenerationTaskBatch(options: BackendGenerationTaskOptions & { count: number }, dependencies: GenerationTaskDependencies = defaultDependencies) {
    const count = Math.max(1, Math.min(15, Math.floor(Number(options.count)) || 1));
    throwIfAborted(options.signal);
    assertClientPromptLimit(options.mode, options.prompt, options.config, options.metadata);
    if (options.retryContextsByBatchIndex && options.retryContextsByBatchIndex.length !== count) throw new Error(t("creationRuntime.retryBatchMismatch"));
    if (usesLocalDreamina(options.config)) {
        await dependencies.ensureLocalDreaminaReady?.(options.signal);
        throwIfAborted(options.signal);
        return Promise.allSettled(
            Array.from({ length: count }, (_, batchIndex) => {
                const retryContext = options.retryContextsByBatchIndex?.[batchIndex];
                return runLocalDreaminaGeneration(
                    {
                        ...options,
                        config: { ...options.config, count: "1" },
                        metadata: { ...options.metadata, batchIndex, batchCount: count },
                        localIdempotencyKey: options.localIdempotencyKey ? `${options.localIdempotencyKey}:${batchIndex + 1}` : undefined,
                        clientOperationId: retryContext?.clientOperationId ?? (options.clientOperationId ? `${options.clientOperationId}:${batchIndex + 1}` : undefined),
                        retryOf: retryContext?.retryOf ?? options.retryOf,
                        attemptGroupId: retryContext?.attemptGroupId ?? options.attemptGroupId,
                    },
                    dependencies,
                );
            }),
        );
    }
    const prepared = await prepareGenerationReferences(options);
    throwIfAborted(options.signal);
    const batchOptions = Array.from({ length: count }, (_, batchIndex) => ({ ...options, config: { ...options.config, count: "1" }, metadata: { ...options.metadata, batchIndex, batchCount: count } }));
    const requests = batchOptions.map((item) => buildBackendGenerationRequest(item, prepared));
    // Product Studio alone provides an atomic admission boundary for its batch discount.
    if (dependencies.createAtomicBatch) {
        const tasks = await dependencies.createAtomicBatch(requests, options.signal);
        return Promise.allSettled(
            tasks.map(async (task) => {
                options.onTaskUpdate?.(task);
                const completed = await dependencies.waitTask(task.id, { signal: options.signal, initialTask: task, onTaskUpdate: options.onTaskUpdate });
                return parseBackendGenerationResult(completed);
            }),
        );
    }
    const confirmed = dependencies.confirmBatch ? await dependencies.confirmBatch(requests, options.signal) : requests;
    throwIfAborted(options.signal);
    return Promise.allSettled(batchOptions.map((item, batchIndex) => createAndWaitGenerationTask(item, prepared, dependencies, confirmed[batchIndex])));
}

async function runLocalDreaminaGeneration(options: BackendGenerationTaskOptions, dependencies: GenerationTaskDependencies): Promise<BackendGenerationResult> {
    if (options.mode !== "image" && options.mode !== "video") throw new Error(t("creationRuntime.dreaminaMediaOnly"));
    const runtimeId = stripLocalDreaminaTaskPrefix(options.localIdempotencyKey || options.clientOperationId || dependencies.createId());
    const clientOperationId = options.clientOperationId ?? runtimeId;
    const context = localTaskContext(options);
    const timestamp = dependencies.now();
    const task: GenerationTask = {
        id: localDreaminaTaskId(runtimeId),
        clientOperationId,
        ...(options.projectId ? { projectId: options.projectId } : {}),
        type: `canvas_${options.mode}`,
        status: "running",
        stage: "submitting",
        prompt: options.prompt,
        operation: generationOperation(options),
        provider: "dreamina-cli",
        model: options.config.model,
        attempts: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
        startedAt: timestamp,
        clientContext: generationClientContext(context, options),
        ...(context.retryOf ? { retryOf: context.retryOf } : {}),
        ...(context.attemptGroupId ? { attemptGroupId: context.attemptGroupId } : {}),
    };
    let latestPublicTask = task;
    options.onTaskUpdate?.(task);
    try {
        const references = await localGenerationReferences([...(options.referenceImages ?? []), ...(options.mask ? [options.mask] : [])], options.referenceVideos ?? [], options.referenceAudios ?? []);
        const resolution = options.mode === "video" ? options.config.vquality : options.config.quality;
        const result = await dependencies.runLocal(
            {
                model: options.config.model as `local:dreamina-cli:${string}`,
                mode: options.mode,
                prompt: options.prompt,
                settings: {
                    aspect: options.config.size,
                    resolution,
                    ...(options.mode === "video" ? { duration: Number(options.config.videoSeconds) } : { count: Number(options.config.count) }),
                },
                references,
                resumeOnly: options.localResumeOnly,
                idempotencyKey: runtimeId,
                clientOperationId,
                context,
            },
            options.signal,
            (runtimeTask) => {
                latestPublicTask = projectLocalDreaminaTask(runtimeTask, task);
                observeGenerationTask(latestPublicTask, true);
                options.onTaskUpdate?.(latestPublicTask);
            },
        );
        const completedAt = dependencies.now();
        latestPublicTask = { ...latestPublicTask, status: "succeeded", progress: 100, stage: "local_cli_succeeded", resultJson: JSON.stringify(result), completedAt, updatedAt: completedAt };
        observeGenerationTask(latestPublicTask, true);
        options.onTaskUpdate?.(latestPublicTask);
        return result;
    } catch (error) {
        const completedAt = dependencies.now();
        const cancelled = isGenerationTaskCancelled(error, options.signal);
        const localWaitStopped = error instanceof LocalDreaminaGenerationClientError && error.code === LOCAL_DREAMINA_WAIT_STOPPED_CODE;
        const localErrorCode = error instanceof LocalDreaminaGenerationClientError ? error.code : undefined;
        if (!(cancelled && isLocalDreaminaBackgroundTask(latestPublicTask))) {
            options.onTaskUpdate?.({
                ...latestPublicTask,
                status: cancelled ? "cancelled" : "failed",
                stage: cancelled ? "local_cli_cancelled" : "local_cli_failed",
                completedAt,
                updatedAt: completedAt,
                ...(localWaitStopped
                    ? { errorCode: error.code, error: error.message }
                    : !cancelled
                      ? {
                            ...(localErrorCode ? { errorCode: localErrorCode } : {}),
                            error: error instanceof Error ? error.message : t("creationRuntime.dreaminaRequestFailed"),
                        }
                      : {}),
            });
        }
        throw error;
    }
}

function generationOperation(options: BackendGenerationTaskOptions) {
    if (options.mode !== "video") return options.mode;
    return resolveVideoOperation(
        {
            textCount: 0,
            imageCount: options.referenceImages?.length ?? 0,
            videoCount: options.referenceVideos?.length ?? 0,
            audioCount: options.referenceAudios?.length ?? 0,
            characterCount: 0,
        },
        options.metadata?.videoEditOperation as string | undefined,
    );
}

export function isGenerationTaskCancelled(error: unknown, signal?: AbortSignal) {
    if (error instanceof LocalDreaminaGenerationClientError && error.code === "dreamina_submission_unknown") return false;
    return signal?.aborted === true || (error instanceof Error && error.name === "AbortError") || (error instanceof LocalDreaminaGenerationClientError && error.code === LOCAL_DREAMINA_WAIT_STOPPED_CODE);
}

async function localGenerationReferences(images: ReferenceImage[], videos: ReferenceVideo[], audios: ReferenceAudio[]): Promise<LocalDreaminaGenerationInput["references"]> {
    const imageReferences = await Promise.all(
        images.map(async (image) => {
            const source = image.dataUrl || image.url;
            if (!source && !image.storageKey) throw new LocalDreaminaGenerationClientError("dreamina_reference_invalid", "即梦图片参考素材不可用", 400);
            const blob = image.storageKey ? await getImageBlob(image.storageKey) : await (await fetch(source!)).blob();
            if (!blob || !["image/png", "image/jpeg", "image/webp"].includes(blob.type)) throw invalidLocalReference();
            return {
                kind: "image" as const,
                mimeType: blob.type as "image/png" | "image/jpeg" | "image/webp",
                bytes: new Uint8Array(await blob.arrayBuffer()),
                metadata: compactReferenceMetadata({ name: image.name, width: image.width, height: image.height }),
            };
        }),
    );
    const mediaReferences = async (items: Array<ReferenceVideo | ReferenceAudio>, kind: "video" | "audio") =>
        Promise.all(
            items.map(async (media) => {
                const source = media.url || "";
                const blob = media.storageKey ? await getMediaBlob(media.storageKey) : source ? await (await fetch(source)).blob() : null;
                const allowed = kind === "video" ? ["video/mp4", "video/quicktime", "video/webm"] : ["audio/mpeg", "audio/wav", "audio/mp4", "audio/aac", "audio/flac"];
                if (!blob || !allowed.includes(blob.type)) throw invalidLocalReference();
                return {
                    kind,
                    mimeType: blob.type,
                    bytes: new Uint8Array(await blob.arrayBuffer()),
                    metadata: compactReferenceMetadata({
                        name: media.name,
                        ...("width" in media ? { width: media.width, height: media.height } : {}),
                        durationMs: media.durationMs,
                    }),
                };
            }),
        );
    const references = [...imageReferences, ...(await mediaReferences(videos, "video")), ...(await mediaReferences(audios, "audio"))] as LocalDreaminaGenerationInput["references"];
    if (references.reduce((total, reference) => total + reference.bytes.byteLength, 0) > 20 * 1024 * 1024) throw invalidLocalReference();
    return references;
}

function invalidLocalReference() {
    return new LocalDreaminaGenerationClientError("dreamina_reference_invalid", "即梦参考素材无效", 400);
}

function compactReferenceMetadata(metadata: Record<string, string | number | undefined>) {
    return Object.fromEntries(Object.entries(metadata).filter(([, value]) => value !== undefined));
}

function localTaskContext(options: BackendGenerationTaskOptions): Extract<LocalDreaminaGenerationInput["context"], { scope: "scoped" }> {
    const metadata = options.metadata ?? {};
    const canvasId = options.canvasId ?? (typeof metadata.canvasId === "string" ? metadata.canvasId : undefined);
    const domainProjectId = options.domainProjectId ?? (typeof metadata.domainProjectId === "string" ? metadata.domainProjectId : undefined);
    const source = options.sourceCode ?? metadata.sourceCode;
    const sourceCode = (ASSET_SOURCE_CODES as readonly unknown[]).includes(source) ? (source as AssetSourceCode) : undefined;
    const roleReferences = Array.isArray(metadata.roleReferences) ? (metadata.roleReferences.filter((r): r is string => typeof r === "string" && r.trim().length > 0) as string[]) : undefined;
    const outputCategory = typeof metadata.outputCategory === "string" ? metadata.outputCategory : undefined;
    const assetCategory = typeof metadata.assetCategory === "string" ? metadata.assetCategory : undefined;
    const workflowKind = typeof metadata.workflowKind === "string" ? metadata.workflowKind : undefined;

    return {
        scope: "scoped",
        ...(options.projectId ? { projectId: options.projectId } : {}),
        ...(canvasId ? { canvasId } : {}),
        ...(domainProjectId ? { domainProjectId } : {}),
        ...(sourceCode ? { sourceCode } : {}),
        ...(typeof metadata.nodeId === "string" ? { nodeId: metadata.nodeId } : {}),
        ...(typeof metadata.conversationId === "string" ? { conversationId: metadata.conversationId } : {}),
        ...(typeof metadata.messageId === "string" ? { messageId: metadata.messageId } : {}),
        ...(typeof metadata.batchIndex === "number" ? { batchIndex: metadata.batchIndex } : {}),
        ...(typeof metadata.batchCount === "number" ? { batchCount: metadata.batchCount } : {}),
        ...(options.retryOf ? { retryOf: options.retryOf } : {}),
        ...(options.attemptGroupId ? { attemptGroupId: options.attemptGroupId } : {}),
        ...(roleReferences && roleReferences.length > 0 ? { roleReferences } : {}),
        ...(outputCategory ? { outputCategory } : {}),
        ...(assetCategory ? { assetCategory } : {}),
        ...(workflowKind ? { workflowKind } : {}),
    };
}

function generationClientContext(context: Extract<LocalDreaminaGenerationInput["context"], { scope: "scoped" }>, options: BackendGenerationTaskOptions) {
    const { conversationId, messageId, nodeId, batchIndex, batchCount, canvasId, domainProjectId, sourceCode } = context;
    if (!conversationId && !messageId && !nodeId && batchIndex === undefined && batchCount === undefined && !canvasId && !domainProjectId && !sourceCode) return undefined;
    return {
        ...(canvasId ? { canvasId } : {}),
        ...(domainProjectId ? { domainProjectId } : {}),
        ...(sourceCode ? { sourceCode } : {}),
        ...(conversationId ? { conversationId } : {}),
        ...(messageId ? { messageId } : {}),
        ...(nodeId ? { nodeId } : {}),
        ...(batchIndex !== undefined ? { batchIndex } : {}),
        ...(batchCount !== undefined ? { batchCount } : {}),
    };
}

function isLocalDreaminaModel(model: string) {
    return /^local:dreamina-cli:[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/.test(model.trim());
}

function usesLocalDreamina(config: AiConfig) {
    return (config.taskWorkflowProvider || "model") === "model" && isLocalDreaminaModel(config.model);
}

function assertBackendRuntimeConfigured(config: AiConfig, mode: BackendGenerationMode) {
    if (resolveGenerationWorkflowExecution(config, mode)) return;
    if (logicalModelIDForConfig(config)) return;
    const requestConfig = resolveModelRequestConfig(config, config.model);
    if (!requestConfig.channelId && !requestConfig.interfaceType) throw new Error(t("creationRuntime.protocolRequired"));
}

function throwIfAborted(signal?: AbortSignal) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
}

function assertClientPromptLimit(mode: BackendGenerationMode, prompt: string, config: AiConfig, metadata?: Record<string, unknown>) {
    if (mode !== "image" || metadata?.promptTemplateOperation || (config.taskWorkflowProvider || "model") !== "model") return;
    const requestConfig = resolveModelRequestConfig(config, config.model);
    const promptLimitError = grokImagePromptLimitError(prompt, requestConfig.interfaceType, requestConfig.model);
    if (promptLimitError) throw new Error(promptLimitError);
}

async function prepareGenerationReferences({
    config,
    mode,
    referenceImages = [],
    referenceVideos = [],
    referenceAudios = [],
    mask,
}: Pick<BackendGenerationTaskOptions, "config" | "mode" | "referenceImages" | "referenceVideos" | "referenceAudios" | "mask">): Promise<PreparedGenerationReferences> {
    const requestConfig = resolveModelRequestConfig(config, config.model);
    const preferArkAssetUrl = mode === "video" && (requestConfig.interfaceType === "volcengine-ark-video" || requestConfig.interfaceType === "volcengine-ark-seedance-25" || isArkPlanBaseUrl(requestConfig.baseUrl || config.baseUrl || ""));
    const workflow = resolveGenerationWorkflowExecution(config, mode);
    if (mode === "audio" && !workflow && !isMusicModelConfig(config, config.model) && supportsAudioReferenceVoice(config, config.model)) {
        const audioMode = config.audioMode === "unified_edit" ? "unified_edit" : "tts";
        if (audioMode === "tts") {
            referenceAudios = [];
            referenceImages = [];
        } else {
            if (!referenceAudios.length) throw createAudioValidationError("全能配音需要连接参考音频");
            referenceImages = [];
        }
    }
    const preparedImages = await Promise.all(referenceImages.map((image) => prepareBackendImageReference(image, preferArkAssetUrl)));
    const preparedVideos = await Promise.all(referenceVideos.map(prepareBackendMediaReference));
    const preparedAudios = await Promise.all(referenceAudios.map(prepareBackendMediaReference));
    const preparedMask = mask ? await prepareBackendImageReference(mask) : undefined;
    return { referenceImages: preparedImages, referenceVideos: preparedVideos, referenceAudios: preparedAudios, mask: preparedMask };
}

async function createAndWaitGenerationTask(options: BackendGenerationTaskOptions, prepared: PreparedGenerationReferences, dependencies: GenerationTaskDependencies, confirmedRequest?: CreateTaskInput) {
    const task = await createBackendGenerationTask(options, prepared, dependencies, confirmedRequest);
    const { signal, onTaskUpdate, onTextDelta } = options;
    const completed = await dependencies.waitTask(task.id, { signal, initialTask: task, onTaskUpdate, onTextDelta });
    return parseBackendGenerationResult(completed);
}

async function createBackendGenerationTask(options: BackendGenerationTaskOptions, prepared: PreparedGenerationReferences, dependencies: GenerationTaskDependencies, confirmedRequest?: CreateTaskInput) {
    const videos = options.referenceVideos || [];
    const actions = videoReferenceActions(options.config, videos, typeof options.metadata?.nodeId === "string" ? options.metadata.nodeId : undefined, { imageCount: options.referenceImages?.length || 0, audioCount: options.referenceAudios?.length || 0 });
    if (!guardVideoReferences(options.config, videos, actions)) throw new ApiError(t("generationFailure.video.title"), { reason: "invalid_input", status: 422 });
    let task: GenerationTask;
    try {
        task = await dependencies.createTask(confirmedRequest || buildBackendGenerationRequest(options, prepared));
    } catch (error) {
        const issue = videoReferenceIssueFromError(error);
        if (issue) {
            const model = supportedVideoReferenceModel(options.config, videos, actions.requirements);
            showVideoReferenceWarning({ issue, onReplace: actions.onReplace, onSwitch: model ? () => actions.onModelChange(model) : undefined });
        }
        throw error;
    }
    options.onTaskUpdate?.(task);
    return task;
}

// Batches validate every item's actual media before submitting their first task.
// Admission repeats the probe, so later edits or forged metadata cannot bypass it.
export async function preflightBackendVideoReferences(options: BackendGenerationTaskOptions) {
    const videos = options.referenceVideos || [];
    if (!videos.length || usesLocalDreamina(options.config) || (options.config.taskWorkflowProvider && options.config.taskWorkflowProvider !== "model")) return;
    const actions = videoReferenceActions(options.config, videos, typeof options.metadata?.nodeId === "string" ? options.metadata.nodeId : undefined, { imageCount: options.referenceImages?.length || 0, audioCount: options.referenceAudios?.length || 0 });
    const issue = videoReferenceIssue(options.config, videos);
    if (issue) {
        guardVideoReferences(options.config, videos, actions);
        throw new ApiError(t("generationFailure.video.title"), { reason: "invalid_input", status: 422, details: issue });
    }
    const prepared = await prepareGenerationReferences(options);
    try {
        await http.post("/tasks/reference-preflight", buildBackendGenerationRequest(options, prepared), { signal: options.signal });
    } catch (error) {
        const issue = videoReferenceIssueFromError(error);
        if (issue) {
            const model = supportedVideoReferenceModel(options.config, videos, actions.requirements);
            showVideoReferenceWarning({ issue, onReplace: actions.onReplace, onSwitch: model ? () => actions.onModelChange(model) : undefined });
        }
        throw error;
    }
}

function buildBackendGenerationRequest(options: BackendGenerationTaskOptions, prepared: PreparedGenerationReferences): CreateTaskInput {
    const { projectId, mode, prompt, config, metadata } = options;
    const videoOperation = generationOperation(options);
    const workflow = resolveGenerationWorkflowExecution(config, mode);
    const logicalModelId = workflow ? "" : logicalModelIDForConfig(config);
    return {
        ...(projectId ? { projectId } : {}),
        type: `canvas_${mode}`,
        operation: mode === "video" ? videoOperation : mode,
        prompt,
        ...(workflow ? { provider: workflow.provider } : {}),
        model: workflow?.taskModel || config.model,
        ...(logicalModelId ? { logicalModelId } : {}),
        input: {
            mode,
            prompt,
            ...(workflow ? { execution: workflowPublicExecution(workflow) } : {}),
            config: backendProviderConfig(config, mode),
            capabilityOptions: logicalModelId ? logicalCapabilityOptions(config, mode) : undefined,
            textHistory: options.textHistory,
            ...(mode === "text"
                ? {
                      textOptions: {
                          stream: modelCapabilityConfigFor(config, config.model).text?.streaming !== false && (options.streamText ?? config.textStream) !== false,
                          thinking: options.enableThinking ?? (config.textThinking === true && modelCapabilityConfigFor(config, config.model).text?.thinking === true),
                      },
                  }
                : {}),
            referenceImages: prepared.referenceImages,
            referenceVideos: prepared.referenceVideos,
            referenceAudios: prepared.referenceAudios,
            mask: prepared.mask,
            metadata: generationMetadata(config, {
                ...metadata,
                ...(options.canvasId ? { canvasId: options.canvasId } : {}),
                ...(options.domainProjectId ? { domainProjectId: options.domainProjectId } : {}),
                ...(options.sourceCode ? { sourceCode: options.sourceCode } : {}),
            }),
        },
    };
}

function generationMetadata(config: AiConfig, metadata?: Record<string, unknown>) {
    const channel = resolveModelChannel(config, config.model);
    const model = modelOptionName(config.model);
    const modelCost = channel.modelCosts?.find((item) => item.model === model);
    const protocol = modelCost?.protocol || channel.interfaceType;
    const defaults = modelCost?.defaultOptions;
    if (!protocol || !defaults || !Object.keys(defaults).length) return metadata;
    const existing = metadata?.providerOptions && typeof metadata.providerOptions === "object" && !Array.isArray(metadata.providerOptions) ? (metadata.providerOptions as Record<string, unknown>) : {};
    const namespace = existing[protocol] && typeof existing[protocol] === "object" && !Array.isArray(existing[protocol]) ? (existing[protocol] as Record<string, unknown>) : {};
    return { ...metadata, providerOptions: { ...existing, [protocol]: { ...defaults, ...namespace } } };
}

async function prepareBackendMediaReference(media: ReferenceVideo | ReferenceAudio) {
    const resourceId = resourceIdFromStorageKey(media.storageKey) || resourceIdFromUrl(media.url);
    if (resourceId) {
        await (await import("@/services/local-media-save")).ensureLocalMediaServerCopy(resourceId);
        return backendMediaReference(media, { storageKey: resourceStorageKey(resourceId) });
    }
    const url = media.url || "";
    if (/^https?:\/\//i.test(url)) return backendMediaReference(media, { url });
    let blob: Blob | null = null;
    if (media.storageKey) blob = await getMediaBlob(media.storageKey);
    if (!blob && (url.startsWith("blob:") || url.startsWith("data:"))) blob = await (await fetch(url)).blob();
    if (!blob) throw new Error(t("creationRuntime.referenceUnsaved"));
    try {
        const kind: "video" | "audio" | "file" = blob.type.startsWith("video/") ? "video" : blob.type.startsWith("audio/") ? "audio" : "file";
        const resource = await uploadResourceFile(blob, kind, { fileName: media.name, width: "width" in media ? media.width : undefined, height: "height" in media ? media.height : undefined, durationMs: media.durationMs });
        return backendMediaReference(media, { storageKey: resourceStorageKey(resource.id), type: resource.mimeType || media.type || blob.type });
    } catch (error) {
        if (videoReferenceIssueFromError(error)) throw error;
        throw new Error(error instanceof Error ? `${t("creationRuntime.referenceUploadFailed")}: ${error.message}` : t("creationRuntime.referenceUploadFailed"));
    }
}

async function prepareBackendImageReference(image: ReferenceImage, preferArkAssetUrl = false) {
    if (preferArkAssetUrl && image.arkAssetId) {
        if (!/^asset-[A-Za-z0-9-]+$/.test(image.arkAssetId)) throw new Error(t("creationRuntime.arkAssetInvalid"));
        return backendImageReference(image, { url: `asset://${image.arkAssetId}` });
    }
    const resourceId = resourceIdFromStorageKey(image.storageKey) || resourceIdFromUrl(image.url || image.dataUrl);
    if (resourceId) {
        await (await import("@/services/local-media-save")).ensureLocalMediaServerCopy(resourceId);
        return backendImageReference(image, { storageKey: resourceStorageKey(resourceId) });
    }
    const sourceUrl = image.url || image.dataUrl;
    if (/^https?:\/\//i.test(sourceUrl)) return backendImageReference(image, { url: sourceUrl });
    const blob = image.storageKey ? await getImageBlob(image.storageKey) : sourceUrl ? await (await fetch(sourceUrl)).blob() : null;
    if (!blob) throw new Error(t("creationRuntime.referenceUnsaved"));
    try {
        const resource = await uploadResourceFile(blob, "image", { fileName: image.name });
        return backendImageReference(image, { storageKey: resourceStorageKey(resource.id), type: resource.mimeType || image.type || blob.type });
    } catch (error) {
        throw new Error(error instanceof Error ? `${t("creationRuntime.referenceUploadFailed")}: ${error.message}` : t("creationRuntime.referenceUploadFailed"));
    }
}

// 任务输入只允许后端协议字段，避免把 previewUrl 等页面态 Data URL 带入强校验写路径。
function backendImageReference(image: ReferenceImage, override: Partial<ReferenceImage>): ReferenceImage {
    return {
        id: image.id,
        name: image.name,
        type: override.type || image.type,
        dataUrl: "",
        url: override.url,
        storageKey: override.storageKey,
        ...(image.bytes ? { bytes: image.bytes } : {}),
        ...(image.width ? { width: image.width } : {}),
        ...(image.height ? { height: image.height } : {}),
    };
}

function backendMediaReference<T extends ReferenceVideo | ReferenceAudio>(media: T, override: Partial<T>): T {
    return {
        id: media.id,
        name: media.name,
        type: override.type || media.type,
        url: override.url || "",
        storageKey: override.storageKey,
        ...("bytes" in media && media.bytes ? { bytes: media.bytes } : {}),
        ...("width" in media && media.width ? { width: media.width } : {}),
        ...("height" in media && media.height ? { height: media.height } : {}),
        ...(media.durationMs ? { durationMs: media.durationMs } : {}),
    } as T;
}

export function backendProviderConfig(config: AiConfig, mode: BackendGenerationMode = "image") {
    const requestConfig = resolveModelRequestConfig(config, config.model);
    const workflow = resolveGenerationWorkflowExecution(config, mode);
    if (workflow) return workflowProviderConfig(config, requestConfig, workflow);
    const generationOptions = {
        modelParameters: selectedModelParameters(config, mode),
        size: config.size,
        quality: mode === "image" ? omittedImageQuality(config.quality) : config.quality,
        ...(mode === "image" && config.imageResolution ? { imageResolution: config.imageResolution } : {}),
        transparentBackground: config.transparentBackground,
        count: config.count,
        videoSeconds: config.videoSeconds,
        vquality: config.vquality,
        videoGenerateAudio: config.videoGenerateAudio,
        videoWatermark: config.videoWatermark,
        videoArkPrivateAssetUpload: config.videoArkPrivateAssetUpload,
        audioVoice: config.audioVoice,
        audioMode: mode === "audio" ? effectiveAudioMode(config, config.model) : undefined,
        audioFormat: config.audioFormat,
        audioSpeed: config.audioSpeed,
        audioInstructions: config.audioInstructions,
        musicInstrumental: config.musicInstrumental,
        systemPrompt: config.systemPrompt,
    };
    if (logicalModelIDForConfig(config)) return generationOptions;
    return {
        channelId: requestConfig.channelId,
        apiFormat: requestConfig.apiFormat,
        interfaceType: requestConfig.interfaceType,
        baseUrl: requestConfig.baseUrl,
        allowLocalChannel: requestConfig.allowLocalChannel === true,
        apiKey: requestConfig.apiKey,
        secretKey: requestConfig.secretKey,
        model: requestConfig.model,
        ...generationOptions,
        capabilityConfig: modelCapabilityConfigFor(config, requestConfig.model),
        systemPrompt: config.systemPrompt,
    };
}

function workflowProviderConfig(config: AiConfig, requestConfig: ReturnType<typeof resolveModelRequestConfig>, workflow: GenerationWorkflowExecution) {
    const runningHubActive = workflow.provider === "runninghub";
    const comfyBridgeActive = workflow.provider === "comfyui-bridge";
    return {
        channelId: "",
        apiFormat: requestConfig.apiFormat,
        interfaceType: workflow.interfaceType,
        baseUrl: comfyBridgeActive ? "bridge://local" : config.runningHub.baseUrl,
        allowLocalChannel: false,
        apiKey: runningHubActive ? config.runningHub.apiKey : "",
        // 工作流是独立 Provider，不能继承普通模型渠道的密钥和自定义头。
        secretKey: "",
        headers: [],
        model: workflow.providerModel,
        size: config.size,
        quality: config.quality,
        transparentBackground: config.transparentBackground,
        count: config.count,
        videoSeconds: config.videoSeconds,
        vquality: config.vquality,
        videoGenerateAudio: config.videoGenerateAudio,
        videoWatermark: config.videoWatermark,
        videoArkPrivateAssetUpload: config.videoArkPrivateAssetUpload,
        audioVoice: config.audioVoice,
        audioMode: undefined,
        audioFormat: config.audioFormat,
        audioSpeed: config.audioSpeed,
        audioInstructions: config.audioInstructions,
        musicInstrumental: config.musicInstrumental,
        workflowId: workflow.workflowId,
        webappId: workflow.webappId,
        workflowJson: workflow.workflowJson,
        workflowFields: workflow.workflowFields,
        bridgeId: workflow.bridgeId,
        runningHubUseWallet: false,
        runningHubWalletApiKey: "",
        runningHubUploadApiKey: runningHubActive ? config.runningHub.uploadApiKey || "" : "",
        capabilityConfig: modelCapabilityConfigFor(config, requestConfig.model),
        systemPrompt: config.systemPrompt,
    };
}

function workflowPublicExecution(workflow: GenerationWorkflowExecution) {
    return {
        provider: workflow.provider,
        kind: workflow.kind,
        interfaceType: workflow.interfaceType,
        name: workflow.name,
        ...(workflow.workflowId ? { workflowId: workflow.workflowId } : {}),
        ...(workflow.webappId ? { webappId: workflow.webappId } : {}),
    };
}

export function logicalCapabilityOptions(config: AiConfig, mode: BackendGenerationMode) {
    const channel = resolveModelChannel(config, config.model);
    const cost = channel.modelCosts?.find((item) => item.model === modelOptionName(config.model));
    const spec = cost?.logicalCapabilitySpec;
    const audioMode = mode === "audio" ? effectiveAudioMode(config, config.model) : undefined;
    const candidates: Record<string, unknown> =
        mode === "image"
            ? { size: config.size, quality: omittedImageQuality(config.quality), imageResolution: config.imageResolution, transparentBackground: config.transparentBackground === "true", count: Number(config.count) }
            : mode === "video"
              ? { size: config.size, videoSeconds: Number(config.videoSeconds), vquality: config.vquality, videoGenerateAudio: config.videoGenerateAudio === "true", videoWatermark: config.videoWatermark === "true" }
              : mode === "audio"
                ? { ...(audioMode ? { audioMode } : {}), audioVoice: config.audioVoice, audioFormat: config.audioFormat, audioSpeed: Number(config.audioSpeed) }
                : {};
    const filtered = Object.fromEntries(Object.entries(candidates).filter(([key, value]) => value !== undefined && Boolean(spec?.options?.[key] || cost?.logicalCapabilityProfiles?.some((profile) => profile.options?.[key]))));
    if (mode === "image" || mode === "video") {
        for (const key of Object.keys(candidates)) {
            const value = candidates[key];
            if (value !== undefined && value !== null && String(value).trim() !== "") filtered[key] = value;
        }
    }
    for (const [name, value] of Object.entries(selectedModelParameters(config, mode))) filtered[`parameter.${name}`] = value;
    return filtered;
}

function omittedImageQuality(value: string | undefined) {
    const normalized = String(value || "")
        .trim()
        .toLowerCase();
    return normalized === "auto" || normalized === "any" ? undefined : value;
}

export function parseBackendGenerationResult(task: GenerationTask): BackendGenerationResult {
    if (!task.resultJson) throw new Error(t("creationRuntime.taskResultMissing"));
    let result: BackendGenerationResult & { text?: unknown };
    try {
        result = JSON.parse(task.resultJson) as typeof result;
    } catch {
        throw new Error(t("creationRuntime.taskResultInvalid"));
    }
    if (!result || typeof result !== "object" || Array.isArray(result)) throw new Error(t("creationRuntime.taskResultInvalid"));
    return { ...result, text: normalizeBackendText(result.text) };
}

// 结构化文本任务的 text 可能是对象或数组；统一成字符串，取不到正文时保留 JSON 供上层契约解析。
function normalizeBackendText(value: unknown): string | undefined {
    if (typeof value === "string") return value;
    if (value === null || value === undefined) return undefined;
    if (Array.isArray(value)) {
        const text = value
            .map((item) => normalizeBackendText(item))
            .filter((item): item is string => Boolean(item))
            .join("");
        return text || undefined;
    }
    if (typeof value === "object") {
        const record = value as Record<string, unknown>;
        for (const key of ["text", "content", "output_text", "value"]) {
            if (!(key in record)) continue;
            const nested = normalizeBackendText(record[key]);
            if (nested !== undefined) return nested;
        }
        return JSON.stringify(value);
    }
    return String(value);
}
