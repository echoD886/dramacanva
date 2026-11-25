import { resolveGenerationVideoUrl } from "@/services/generation-video-url";
import { parseAssetStorageDocument } from "@/lib/asset-storage-revision";
import { localForageStorageForScope } from "@/lib/localforage-storage";
import { generationAssetId } from "@/lib/generation-asset-id";
import { currentLocaleText as t } from "@/i18n/current-locale-text";
import { recordUsableAsset } from "@/services/creation-analytics";
import { canvasNodeToAsset, declaredCanvasNodeAssetCategory, findCanvasNodeAsset, requiresMaterializedCanvasAsset, withAssetContextClassification, type CanvasAssetSource } from "@/lib/canvas/canvas-node-asset";
import { canvasVideoAssetPreviewUrl } from "@/lib/canvas/canvas-media-preview";
import { readImageMeta } from "@/lib/image-utils";
import { readVideoMetadata } from "@/lib/media-metadata";
import { backendAudioResults, parseBackendGenerationResult, type BackendGenerationResult } from "@/services/api/generation-task";
import { ApiError } from "@/services/api/request";
import { linkProjectAsset, moveProjectAsset } from "@/services/api/projects";
import { classifyAssets, resolveAssetIngest } from "@/services/asset-archive";
import type { GenerationTask, GenerationTaskOutput } from "@/services/api/task-center";
import { getMediaBlob, resolveMediaUrl, setMediaBlob } from "@/services/file-storage";
import { createGenerationTaskMaterializer, createIdempotentMaterializeOutput, materializeEffectKey, type MaterializeGenerationTaskOutput } from "@/services/generation-task-materializer";
import { withGenerationArtifactCommitLock } from "@/services/generation-asset-repository";
import { uploadGeneratedAssetToConfiguredSources } from "@/services/external-asset-sources";
import { getImageBlob, resolveImageUrl, setImageBlob } from "@/services/image-storage";
import { generationArtifactStorageKey, loadOrStoreGenerationArtifact } from "@/services/generation-artifact-sink";
import { createLocalDreaminaTaskEffectStore } from "@/services/local-dreamina-generation";
import { createProviderNeutralGenerationTaskEffectStore } from "@/services/provider-neutral-generation-effects";
import { loadAssetsForUse, loadCanvasNodeAssetForUse, saveRemoteUserDataNow } from "@/services/user-data-sync";
import { getActiveUserScope } from "@/lib/user-scope";
import { normalizeAssetCategory } from "@/lib/asset-category";
import { runGenerationConsumer } from "@/services/generation-consumer-lifecycle";
import { ASSET_STORE_KEY, flushAssetStorePersistence, applyRemoteAssetRecords, useAssetStore, type AssetCategory, type AssetStatus, type NewAsset } from "@/stores/use-asset-store";
import type { CanvasNodeData } from "@/types/canvas";
import { ASSET_SOURCE_CODES, type AssetSourceCode } from "@/types/asset-archive";

/** Read only submission-time facts; projectId can also be a short-drama ID. */
export function generationTaskAssetContext(task: GenerationTask) {
    let metadata: Record<string, unknown> = {};
    try {
        const input = task.inputJson ? JSON.parse(task.inputJson) : undefined;
        if (input?.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata)) metadata = input.metadata;
    } catch { /* Legacy tasks may have no readable input context. */ }
    const canvasId = task.clientContext?.canvasId ?? (typeof metadata.canvasId === "string" ? metadata.canvasId : undefined);
    const domainProjectId = task.clientContext?.domainProjectId ?? (typeof metadata.domainProjectId === "string" ? metadata.domainProjectId : undefined);
    const source = task.clientContext?.sourceCode ?? metadata.sourceCode;
    const sourceCode: AssetSourceCode = (ASSET_SOURCE_CODES as readonly unknown[]).includes(source) ? source as AssetSourceCode : "generation-task";
    return { canvasId, domainProjectId, sourceCode, metadata };
}

function throwIfAborted(signal?: AbortSignal) {
    if (signal?.aborted) throw new DOMException("The operation was aborted", "AbortError");
}

type EnsureCanvasNodeAssetOptions = {
    canvasId: string;
    domainProjectId?: string;
    node: CanvasNodeData;
    source: CanvasAssetSource;
    taskId?: string;
    category?: AssetCategory;
    folderId?: string;
    signal?: AbortSignal;
};

export type CanvasNodeAssetResult = {
    assetId: string;
    created: boolean;
    linkedToProject: boolean;
};

const pendingAssetSyncs = new Map<string, Promise<CanvasNodeAssetResult>>();
const DEFAULT_RATE_LIMIT_RETRY_MS = 60_000;
const MAX_RATE_LIMIT_RETRY_MS = 5 * 60_000;

type CanvasAssetSyncRetryOptions = {
    signal?: AbortSignal;
    maxRetries?: number;
    wait?: (delayMs: number, signal?: AbortSignal) => Promise<void>;
};

function waitForCanvasAssetSyncRetry(delayMs: number, signal?: AbortSignal) {
    return new Promise<void>((resolve, reject) => {
        if (signal?.aborted) {
            reject(new DOMException("The operation was aborted", "AbortError"));
            return;
        }
        const timer = globalThis.setTimeout(() => {
            signal?.removeEventListener("abort", onAbort);
            resolve();
        }, delayMs);
        const onAbort = () => {
            globalThis.clearTimeout(timer);
            reject(new DOMException("The operation was aborted", "AbortError"));
        };
        signal?.addEventListener("abort", onAbort, { once: true });
    });
}

export async function retryCanvasAssetSyncAfterRateLimit<T>(operation: () => Promise<T>, options: CanvasAssetSyncRetryOptions = {}): Promise<T> {
    const maxRetries = Math.max(0, options.maxRetries ?? 2);
    const wait = options.wait ?? waitForCanvasAssetSyncRetry;
    for (let attempt = 0; ; attempt += 1) {
        throwIfAborted(options.signal);
        try {
            return await operation();
        } catch (error) {
            if (error instanceof Error && error.name === "AbortError") throw error;
            if (attempt >= maxRetries || (error instanceof ApiError && error.status !== undefined && !error.retryable)) throw error;
            const delayMs = error instanceof ApiError && error.status === 429
                ? Math.min(MAX_RATE_LIMIT_RETRY_MS, Math.max(0, error.retryAfterMs ?? DEFAULT_RATE_LIMIT_RETRY_MS))
                : 1000 * 2 ** attempt;
            await wait(delayMs, options.signal);
        }
    }
}

export function ensureCanvasNodeAsset(options: EnsureCanvasNodeAssetOptions) {
    const scope = getActiveUserScope();
    const taskIdentity = options.taskId || options.node.metadata?.taskId || options.node.metadata?.storageKey || options.node.id;
    const identity = options.node.metadata?.imageLayerGroup || options.node.metadata?.layerExtraction ? `${taskIdentity}:${options.node.metadata.storageKey || ""}` : taskIdentity;
    const key = [scope, options.domainProjectId || "personal", options.canvasId, options.node.id, identity].join(":");
    const pending = pendingAssetSyncs.get(key);
    if (pending) return pending;
    const request = runGenerationConsumer(options.signal, (signal) => persistCanvasNodeAsset({ ...options, signal })).finally(() => pendingAssetSyncs.delete(key));
    pendingAssetSyncs.set(key, request);
    return request;
}

async function persistCanvasNodeAsset(options: EnsureCanvasNodeAssetOptions): Promise<CanvasNodeAssetResult> {
    throwIfAborted(options.signal);
    const store = useAssetStore.getState();
    let asset = findCanvasNodeAsset(store.assets, options.node, options.canvasId, options.taskId);
    if (!asset) {
        await loadCanvasNodeAssetForUse(options.node, options.canvasId, options.taskId, options.signal);
        asset = findCanvasNodeAsset(useAssetStore.getState().assets, options.node, options.canvasId, options.taskId);
    }
    throwIfAborted(options.signal);
    const declaredCategory = options.category || declaredCanvasNodeAssetCategory(options.node);
    let created = false;
    if (!asset) {
        if (requiresMaterializedCanvasAsset(options.node, options.taskId)) throw new Error(t("creationRuntime.assetWriteFailed"));
        const input = canvasNodeToAsset(options.node, { canvasId: options.canvasId, source: options.source, taskId: options.taskId });
        if (!input) throw new Error(t("creationRuntime.nodeAssetEmpty"));
        const assetId = store.addAsset(options.category ? { ...input, category: options.category } : input);
        asset = useAssetStore.getState().assets.find((item) => item.id === assetId);
        created = true;
    }
    if (!asset) throw new Error(t("creationRuntime.assetWriteFailed"));
    if (options.category && (asset.category !== options.category || asset.categorySource !== "user")) {
        await saveRemoteUserDataNow();
        throwIfAborted(options.signal);
        const expectedClassification = Object.fromEntries((["category", "categorySource"] as const).filter(key => Object.hasOwn(asset!, key)).map(key => [key, asset![key]]));
        const result = await classifyAssets({ items: [{ assetId: asset.id, category: options.category, expectedClassification }] });
        throwIfAborted(options.signal);
        if (result.results[0]?.outcome !== "success") throw new Error(t("creationRuntime.assetWriteFailed"));
        asset = useAssetStore.getState().assets.find((item) => item.id === asset?.id) || asset;
    }
    if (!options.domainProjectId) {
        // 个人画布也必须在返回成功前把素材提交到服务端，不能只依赖延迟自动同步。
        await retryCanvasAssetSyncAfterRateLimit(() => saveRemoteUserDataNow(), { signal: options.signal });
        throwIfAborted(options.signal);
        return { assetId: asset.id, created, linkedToProject: false };
    }
    await syncAssetToProject(asset.id, options.domainProjectId, declaredCategory, options.folderId, options.signal);
    return { assetId: asset.id, created, linkedToProject: true };
}

async function syncAssetToProject(assetId: string, domainProjectId: string, category?: AssetCategory, folderId?: string, signal?: AbortSignal) {
    throwIfAborted(signal);
    const retry = <T,>(operation: () => Promise<T>) => retryCanvasAssetSyncAfterRateLimit(operation, { signal });
    const asset = useAssetStore.getState().assets.find((candidate) => candidate.id === assetId);
    if (!asset) throw new Error(t("creationRuntime.assetWriteFailed"));
    const linkedProjectIds = Array.isArray(asset.metadata?.projectIds) ? asset.metadata.projectIds.filter((id): id is string => typeof id === "string") : [];
    if (linkedProjectIds.includes(domainProjectId)) {
        if (folderId !== undefined) await retry(() => moveProjectAsset(domainProjectId, asset.id, folderId, signal));
        return;
    }

    // 项目关联依赖后端 assets 记录，先强制完成素材同步，不能依赖延迟自动同步的时序。
    await retry(() => saveRemoteUserDataNow());
    throwIfAborted(signal);
    const { asset: linkedAsset } = await retry(() => linkProjectAsset(
        domainProjectId,
        {
            assetId: asset.id,
            category: normalizeAssetCategory(category || asset.category),
            folderId,
        },
        signal,
    ));
    throwIfAborted(signal);
    let linked = linkedAsset;
    if (folderId !== undefined && (linked.folderId || "") !== folderId) linked = (await retry(() => moveProjectAsset(domainProjectId, asset.id, folderId, signal))).asset;
    throwIfAborted(signal);
    await applyRemoteAssetRecords([{ id: asset.id, category: normalizeAssetCategory(linked.category), ...(Object.hasOwn(linked, "categorySource") ? { categorySource: (linked as unknown as Record<string, unknown>).categorySource } : {}) }]);
    const current = useAssetStore.getState().assets.find(candidate => candidate.id === asset.id) || asset;
    useAssetStore.getState().updateAsset(asset.id, {
        status: linked.status as AssetStatus,
        primaryVersionId: linked.primaryVersionId,
        metadata: { ...current.metadata, projectIds: [...new Set([...linkedProjectIds, domainProjectId])] },
    });
    await retry(() => saveRemoteUserDataNow());
    throwIfAborted(signal);
}

function generationTaskResult(task: GenerationTask): BackendGenerationResult {
    if (task.resultJson) return parseBackendGenerationResult(task);
    if (!task.previewUrl) return {};
    return task.previewKind === "video" ? { mode: "video", video: { dataUrl: task.previewUrl } } : { mode: "image", images: [{ dataUrl: task.previewUrl }] };
}

export function projectGenerationTaskResult(task: GenerationTask, result?: BackendGenerationResult): GenerationTask {
    const projectedResult = result ?? generationTaskResult(task);
    const audios = backendAudioResults(projectedResult);
    const outputs: GenerationTaskOutput[] = projectedResult.images?.length
        ? projectedResult.images.map((image, outputIndex) => ({
              outputIndex,
              mediaType: "image" as const,
              ...(image.storageKey ? { providerArtifactRef: image.storageKey } : {}),
          }))
        : projectedResult.video
          ? [
                {
                    outputIndex: 0,
                    mediaType: "video" as const,
                    ...(projectedResult.video.storageKey ? { providerArtifactRef: projectedResult.video.storageKey } : {}),
                },
            ]
          : audios.length
            ? audios.map((audio, outputIndex) => ({
                  outputIndex,
                  mediaType: "audio" as const,
                  ...(audio.storageKey ? { providerArtifactRef: audio.storageKey } : {}),
              }))
            : (task.outputs?.map((output) => ({ ...output })) ?? []);

    return {
        ...task,
        ...(result ? { resultJson: JSON.stringify(result) } : {}),
        outputs,
        ...(task.status === "succeeded" && outputs.length && !outputs.every((output) => output.materializedAssetId) ? { resultState: "PENDING_MATERIALIZATION" as const } : {}),
    };
}

async function downloadGenerationMedia(url: string, signal?: AbortSignal) {
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(t("creationRuntime.downloadFailed", { status: response.status }));
    return response.blob();
}

async function storedGenerationImage(result: NonNullable<BackendGenerationResult["images"]>[number], effectKey: string, scope: string, signal?: AbortSignal) {
    throwIfAborted(signal);
    if (result.storageKey) {
        const url = await resolveImageUrl(result.storageKey, result.dataUrl);
        if (!url) throw new Error(t("creationRuntime.imageUnavailable"));
        const meta = result.width && result.height ? undefined : await readImageMeta(url, signal);
        throwIfAborted(signal);
        return {
            url,
            storageKey: result.storageKey,
            width: result.width || meta?.width || 1024,
            height: result.height || meta?.height || 1024,
            bytes: result.bytes || 0,
            mimeType: result.mimeType || "image/png",
        };
    }
    const storageKey = generationArtifactStorageKey(effectKey, "image", scope);
    const blob = await loadOrStoreGenerationArtifact({
        effectKey: storageKey,
        read: (key) => getImageBlob(key),
        materialize: () => downloadGenerationMedia(result.dataUrl, signal),
        write: async (key, artifact) => {
            await setImageBlob(key, artifact);
        },
    });
    throwIfAborted(signal);
    const url = await resolveImageUrl(storageKey);
    throwIfAborted(signal);
    if (!url) throw new Error(t("creationRuntime.imageUnavailable"));
    const meta = result.width && result.height ? undefined : await readImageMeta(url, signal);
    throwIfAborted(signal);
    return {
        url,
        storageKey,
        width: result.width || meta?.width || 1024,
        height: result.height || meta?.height || 1024,
        bytes: result.bytes || blob.size,
        mimeType: result.mimeType || blob.type || "image/png",
    };
}

async function storedGenerationMedia(dataUrl: string, effectKey: string, mediaType: "video" | "audio", metadata: { width?: number; height?: number; durationMs?: number; bytes?: number; mimeType: string }, scope: string, signal?: AbortSignal) {
    throwIfAborted(signal);
    const storageKey = generationArtifactStorageKey(effectKey, mediaType, scope);
    const blob = await loadOrStoreGenerationArtifact({
        effectKey: storageKey,
        read: (key) => getMediaBlob(key),
        materialize: () => downloadGenerationMedia(dataUrl, signal),
        write: async (key, artifact) => {
            await setMediaBlob(key, artifact);
        },
    });
    throwIfAborted(signal);
    const url = await resolveMediaUrl(storageKey);
    throwIfAborted(signal);
    if (!url) throw new Error(t(mediaType === "video" ? "creationRuntime.videoUnavailable" : "creationRuntime.audioUnavailable"));
    return {
        url,
        storageKey,
        width: metadata.width,
        height: metadata.height,
        durationMs: metadata.durationMs,
        bytes: metadata.bytes || blob.size,
        mimeType: metadata.mimeType || blob.type,
    };
}

async function generationOutputAsset(input: Parameters<MaterializeGenerationTaskOutput>[0], scope: string): Promise<NewAsset> {
    throwIfAborted(input.signal);
    const result = generationTaskResult(input.task);
    const context = generationTaskAssetContext(input.task);
    const metadata = {
        source: "generation-task",
        generationEffectKey: input.effectKey,
        taskId: input.task.id,
        outputIndex: input.output.outputIndex,
        conversationId: input.task.clientContext?.conversationId,
        messageId: input.task.clientContext?.messageId,
        batchIndex: input.task.clientContext?.batchIndex,
        canvasId: context.canvasId,
        domainProjectId: context.domainProjectId,
        nodeId: input.task.clientContext?.nodeId,
        prompt: input.task.prompt,
        roleReferences: context.metadata.roleReferences,
        outputCategory: context.metadata.outputCategory,
        assetCategory: context.metadata.assetCategory,
        workflowKind: context.metadata.workflowKind,
    };

    if (input.output.mediaType === "image") {
        const image = result.images?.[input.output.outputIndex];
        if (!image) throw new Error(t("creationRuntime.imageMissing"));
        const stored = await storedGenerationImage(image, input.effectKey, scope, input.signal);
        return {
            kind: "image",
            title: t("creationRuntime.generatedImage"),
            coverUrl: stored.url,
            tags: [t("creationRuntime.generated")],
            status: "confirmed",
            source: t("creationRuntime.generationTask"),
            metadata,
            data: {
                dataUrl: stored.url,
                storageKey: stored.storageKey,
                width: stored.width,
                height: stored.height,
                bytes: stored.bytes,
                mimeType: stored.mimeType,
            },
        };
    }

    if (input.output.mediaType === "video") {
        const video = result.video;
        if (!video) throw new Error(t("creationRuntime.videoMissing"));
        const stored = video.storageKey
            ? {
                  url: await resolveGenerationVideoUrl(video.storageKey, video.dataUrl),
                  storageKey: video.storageKey,
                  width: video.width || 0,
                  height: video.height || 0,
                  durationMs: video.durationMs,
                  bytes: video.bytes || 0,
                  mimeType: video.mimeType || "video/mp4",
              }
            : await storedGenerationMedia(
                  video.dataUrl,
                  input.effectKey,
                  "video",
                  {
                      width: video.width,
                      height: video.height,
                      durationMs: video.durationMs,
                      bytes: video.bytes,
                      mimeType: video.mimeType || "video/mp4",
                  },
                  scope,
                  input.signal,
              );
        if (!stored.url) throw new Error(t("creationRuntime.videoUnavailable"));
        const probed = !stored.width || !stored.height || !stored.durationMs ? await readVideoMetadata(stored.url).catch(() => undefined) : undefined;
        throwIfAborted(input.signal);
        return {
            kind: "video",
            title: t("creationRuntime.generatedVideo"),
            coverUrl: canvasVideoAssetPreviewUrl(stored.url),
            tags: [t("creationRuntime.generated")],
            status: "confirmed",
            source: t("creationRuntime.generationTask"),
            metadata,
            data: {
                url: stored.url,
                storageKey: stored.storageKey,
                width: probed?.width || stored.width || 0,
                height: probed?.height || stored.height || 0,
                durationMs: probed?.durationMs || stored.durationMs,
                bytes: stored.bytes,
                mimeType: stored.mimeType || "video/mp4",
            },
        };
    }

    const audio = backendAudioResults(result)[input.output.outputIndex];
    if (!audio) throw new Error(t("creationRuntime.audioMissing"));
    const stored = audio.storageKey
        ? {
              url: await resolveMediaUrl(audio.storageKey, audio.dataUrl),
              storageKey: audio.storageKey,
              durationMs: audio.durationMs,
              bytes: audio.bytes || 0,
              mimeType: audio.mimeType || "audio/mpeg",
          }
        : await storedGenerationMedia(
              audio.dataUrl,
              input.effectKey,
              "audio",
              {
                  durationMs: audio.durationMs,
                  bytes: audio.bytes,
                  mimeType: audio.mimeType || "audio/mpeg",
              },
              scope,
              input.signal,
          );
    if (!stored.url) throw new Error(t("creationRuntime.audioUnavailable"));
    return {
        kind: "audio",
        title: t("creationRuntime.generatedAudio"),
        coverUrl: "",
        tags: [t("creationRuntime.generated")],
        status: "confirmed",
        source: t("creationRuntime.generationTask"),
        metadata,
        data: {
            url: stored.url,
            storageKey: stored.storageKey,
            durationMs: stored.durationMs,
            bytes: stored.bytes,
            mimeType: stored.mimeType || "audio/mpeg",
        },
    };
}

let generationTaskEffectStoreInstance: ReturnType<typeof createLocalDreaminaTaskEffectStore> | undefined;

function generationTaskEffectStore() {
    generationTaskEffectStoreInstance ??= createLocalDreaminaTaskEffectStore();
    return generationTaskEffectStoreInstance;
}

const materializeGenerationOutput: MaterializeGenerationTaskOutput = createIdempotentMaterializeOutput({
    async insertOrReturnAsset(input) {
        const scope = getActiveUserScope();
        const assetId = await withGenerationArtifactCommitLock(
            scope,
            async () => {
                throwIfAborted(input.signal);
                const context = generationTaskAssetContext(input.task);
                const asset = resolveAssetIngest(withAssetContextClassification(await generationOutputAsset(input, scope)), context);
                throwIfAborted(input.signal);
                const createdAssetId = await useAssetStore.getState().addGenerationAsset(input.effectKey, asset, input.signal);
                throwIfAborted(input.signal);
                return createdAssetId;
            },
            { requireCrossRealmLock: true },
        );
        const storedAsset = useAssetStore.getState().assets.find((candidate) => candidate.id === assetId);
        if (storedAsset) {
            const syncResult = await uploadGeneratedAssetToConfiguredSources(storedAsset, input.signal);
            throwIfAborted(input.signal);
            if (syncResult.records.length) {
                const currentAsset = useAssetStore.getState().assets.find((candidate) => candidate.id === assetId) || storedAsset;
                useAssetStore.getState().updateAsset(assetId, {
                    metadata: { ...currentAsset.metadata, externalSync: syncResult.records },
                });
            }
        }
        return assetId;
    },
});

const dreaminaGenerationTaskMaterializer = createGenerationTaskMaterializer({
    effects: {
        claim: (effectKey, taskId) => generationTaskEffectStore().claim(effectKey, taskId),
        renew: (effectKey, taskId) => generationTaskEffectStore().renew(effectKey, taskId),
        complete: (effectKey, taskId, result) => generationTaskEffectStore().complete(effectKey, taskId, result),
        release: (effectKey, taskId) => generationTaskEffectStore().release(effectKey, taskId),
    },
    materializeOutput: materializeGenerationOutput,
});

function remoteGenerationTaskMaterializer() {
    return createGenerationTaskMaterializer({
        // 每个页面实例持有自己的租约；共享浏览器 storage + Web Lock 提供跨标签原子权威。
        effects: createProviderNeutralGenerationTaskEffectStore(),
        materializeOutput: materializeGenerationOutput,
    });
}

function generationTaskMaterializer(task: GenerationTask) {
    return task.provider === "dreamina-cli" ? dreaminaGenerationTaskMaterializer : remoteGenerationTaskMaterializer();
}

/** 生成结果对应的素材已被用户从素材库删除：这是终态，重新获取不会恢复，也不能复活素材。 */
export class GenerationOutputAssetDeletedError extends Error {
    constructor() {
        super(t("canvasExtra.recovery.deleted"));
        this.name = "GenerationOutputAssetDeletedError";
    }
}

export function isGenerationOutputAssetDeletedError(error: unknown): boolean {
    for (let current = error, depth = 0; current && depth < 5; current = (current as { cause?: unknown }).cause, depth += 1) {
        if (current instanceof GenerationOutputAssetDeletedError) return true;
        if (current instanceof Error && (current.message === "生成任务输出素材已被用户删除" || current.message === "生成素材已被用户删除")) return true;
    }
    return false;
}

export async function materializeGenerationTaskAssets(task: GenerationTask, signal?: AbortSignal): Promise<GenerationTask> {
    const scope = getActiveUserScope();
    const ensureCurrentScope = () => {
        throwIfAborted(signal);
        if (scope !== getActiveUserScope()) throw new DOMException("Account changed", "AbortError");
    };
    const projected = projectGenerationTaskResult(task);
    const materialized = await generationTaskMaterializer(task).materialize(projected, signal);
    ensureCurrentScope();
    const assetIds = [...new Set((materialized.outputs || []).map((output) => output.materializedAssetId).filter((id): id is string => Boolean(id)))];
    if (!assetIds.length) return materialized;
    const readTombstones = async () => {
        await flushAssetStorePersistence();
        ensureCurrentScope();
        const document = parseAssetStorageDocument(await localForageStorageForScope(scope).getItem(ASSET_STORE_KEY));
        ensureCurrentScope();
        return document.tombstones.assets;
    };

    const initialTombstones = await readTombstones();
    if (assetIds.some((id) => Boolean(initialTombstones[id]))) throw new GenerationOutputAssetDeletedError();

    const loadedIds = new Set(useAssetStore.getState().assets.map((asset) => asset.id));
    const missingIds = assetIds.filter((id) => !loadedIds.has(id));
    if (missingIds.length) {
        try {
            await loadAssetsForUse(missingIds);
        } catch (error) {
            // 本机与云端都找不到时不立即报错：物化记录可能早于素材落盘，或素材从未同步成功。
            // 下面按任务结果重新登记同一 ID 的素材；用户删除的素材有墓碑，不会被复活。
            if (error instanceof Error && error.name === "AbortError") throw error;
        }
    }
    ensureCurrentScope();
    const tombstones = await readTombstones();
    if (assetIds.some((id) => Boolean(tombstones[id]))) throw new GenerationOutputAssetDeletedError();

    const availableIds = new Set(useAssetStore.getState().assets.map((asset) => asset.id));
    for (const output of materialized.outputs || []) {
        if (!output.materializedAssetId || availableIds.has(output.materializedAssetId)) continue;
        // 物化 effect 已完成但素材缺失：按同一 effectKey 重新登记。只在素材 ID 正是该 effectKey 派生的 ID 时补登，
        // 结果与原记录一致；来历不明的 ID 不重建，避免凭空生成新素材。
        const effectKey = materializeEffectKey(task.id, output.outputIndex);
        if ((await generationAssetId(effectKey)) !== output.materializedAssetId) throw new Error(t("creationRuntime.outputAssetMissing"));
        const result = await materializeGenerationOutput({ task: projected, output, effectKey, signal });
        ensureCurrentScope();
        if (result.materializedAssetId !== output.materializedAssetId) throw new Error(t("creationRuntime.outputAssetMissing"));
        availableIds.add(result.materializedAssetId);
    }
    const unavailableId = assetIds.find((id) => !new Set(useAssetStore.getState().assets.map((asset) => asset.id)).has(id));
    if (unavailableId) throw new Error(t("creationRuntime.outputAssetMissing"));
    if (generationTaskMaterializedUrls(materialized).length) recordUsableAsset(materialized.outputs?.find((output) => output.materializedAssetId)?.mediaType || "unknown");
    return materialized;
}

export function attachGenerationTaskNode(task: GenerationTask, nodeId: string, outputIndex: number, consumer: Parameters<typeof dreaminaGenerationTaskMaterializer.attachNode>[3], signal?: AbortSignal) {
    return generationTaskMaterializer(task).attachNode(task, nodeId, outputIndex, consumer, signal);
}

export function attachGenerationTaskMessage(task: GenerationTask, messageId: string, outputIndex: number, consumer: Parameters<typeof dreaminaGenerationTaskMaterializer.attachMessage>[3], signal?: AbortSignal) {
    return generationTaskMaterializer(task).attachMessage(task, messageId, outputIndex, consumer, signal);
}

export function resumeGenerationTaskAgent(task: GenerationTask, continuationId: string, consumer: Parameters<typeof dreaminaGenerationTaskMaterializer.resumeAgent>[2], signal?: AbortSignal) {
    return generationTaskMaterializer(task).resumeAgent(task, continuationId, consumer, signal);
}

export async function consumeGenerationTaskNode(
    task: GenerationTask,
    nodeId: string,
    outputIndex: number,
    consumer: (input: { task: GenerationTask; output: GenerationTaskOutput; effectKey: string; signal?: AbortSignal }) => Promise<void> | void,
    dependencies: {
        signal?: AbortSignal;
        managed?: true;
        materialize?: typeof materializeGenerationTaskAssets;
        attachNode?: typeof attachGenerationTaskNode;
    } = {},
): Promise<GenerationTask> {
    if (!dependencies.managed) {
        return runGenerationConsumer(dependencies.signal, (signal) => consumeGenerationTaskNode(task, nodeId, outputIndex, consumer, { ...dependencies, signal, managed: true }));
    }
    const materialized = await (dependencies.materialize ?? materializeGenerationTaskAssets)(task, dependencies.signal);
    const output = materialized.outputs?.find((candidate) => candidate.outputIndex === outputIndex);
    if (!output?.materializedAssetId) throw new Error(t("creationRuntime.outputNotMaterialized"));
    await (dependencies.attachNode ?? attachGenerationTaskNode)(
        materialized,
        nodeId,
        outputIndex,
        async ({ effectKey, signal }) => {
            await consumer({ task: materialized, output, effectKey, signal });
        },
        dependencies.signal,
    );
    return materialized;
}

export async function consumeGenerationTaskAgent(
    task: GenerationTask,
    continuationId: string,
    consumer: (input: { task: GenerationTask; effectKey: string; signal?: AbortSignal }) => Promise<void> | void,
    dependencies: {
        signal?: AbortSignal;
        managed?: true;
        materialize?: typeof materializeGenerationTaskAssets;
        resumeAgent?: typeof resumeGenerationTaskAgent;
    } = {},
): Promise<GenerationTask> {
    if (!dependencies.managed) {
        return runGenerationConsumer(dependencies.signal, (signal) => consumeGenerationTaskAgent(task, continuationId, consumer, { ...dependencies, signal, managed: true }));
    }
    const materialized = task.outputs?.length ? await (dependencies.materialize ?? materializeGenerationTaskAssets)(task, dependencies.signal) : task;
    await (dependencies.resumeAgent ?? resumeGenerationTaskAgent)(
        materialized,
        continuationId,
        async ({ effectKey, signal }) => {
            await consumer({ task: materialized, effectKey, signal });
        },
        dependencies.signal,
    );
    return materialized;
}

export async function consumeGenerationTaskMessage(
    task: GenerationTask,
    messageId: string,
    consumer: (input: { task: GenerationTask; resultUrls: string[]; effectKey: string; signal?: AbortSignal }) => Promise<void> | void,
    dependencies: {
        signal?: AbortSignal;
        managed?: true;
        materialize?: typeof materializeGenerationTaskAssets;
        materializedUrls?: typeof generationTaskMaterializedUrls;
        attachMessage?: typeof attachGenerationTaskMessage;
    } = {},
): Promise<GenerationTask> {
    if (!dependencies.managed) {
        return runGenerationConsumer(dependencies.signal, (signal) => consumeGenerationTaskMessage(task, messageId, consumer, { ...dependencies, signal, managed: true }));
    }
    const materialized = await (dependencies.materialize ?? materializeGenerationTaskAssets)(task, dependencies.signal);
    const resultUrls = (dependencies.materializedUrls ?? generationTaskMaterializedUrls)(materialized);
    const attach = dependencies.attachMessage ?? attachGenerationTaskMessage;
    const outputs = materialized.outputs?.filter((output) => output.materializedAssetId) ?? [];
    for (const output of outputs) {
        await attach(
            materialized,
            messageId,
            output.outputIndex,
            async ({ effectKey, signal }) => {
                await consumer({ task: materialized, resultUrls, effectKey, signal });
            },
            dependencies.signal,
        );
    }
    return materialized;
}

export function generationTaskMaterializedUrls(task: GenerationTask): string[] {
    const assets = useAssetStore.getState().assets;
    return (task.outputs || []).flatMap((output) => {
        const asset = output.materializedAssetId ? assets.find((candidate) => candidate.id === output.materializedAssetId) : undefined;
        if (!asset) return [];
        if (asset.kind === "image") return [asset.data.dataUrl || asset.coverUrl];
        if (asset.kind === "video" || asset.kind === "audio") return [asset.data.url];
        return [];
    });
}
