import { INSPIRATION_STORE_KEY, clearInspirationMemory, flushInspirationPersistence, useInspirationStore } from "@/stores/use-inspiration-store";
import { getAuthSessionGeneration, getFeatureAvailability } from "@/services/api/auth";
import { getModelCatalog, listLogicalModels, type CapabilitySpec, type OptionConstraint, type PublicLogicalModel } from "@/services/api/logical-models";
import { localForageStorage } from "@/lib/localforage-storage";
import { appQueryClient } from "@/lib/query-client";
import { GUEST_SCOPE, getActiveUserScope, scopedLocalStorage, setActiveUserScope } from "@/lib/user-scope";
import { CANVAS_STORE_KEY, flushCanvasStorePersistence, useCanvasStore, withCanvasStorePersistenceSuppressed } from "@/stores/canvas/use-canvas-store";
import { CANVAS_HISTORY_STORE_KEY, useCanvasHistoryStore } from "@/stores/canvas/use-canvas-history-store";
import { ASSET_STORE_KEY, flushAssetStorePersistence, useAssetStore, withAssetStorePersistenceSuppressed } from "@/stores/use-asset-store";
import { CONFIG_STORE_KEY, PUBLIC_MODEL_CATALOG_ID, defaultConfig, flushConfigStorePersistence, hydrateConfigSecrets, normalizeConfigSnapshot, useConfigStore, type ModelCapability, type ModelChannel } from "@/stores/use-config-store";
import { defaultModelCapabilityConfig, STANDARD_IMAGE_SIZE_VALUES, type ModelCapabilityConfig } from "@/lib/model-capabilities";
import { useUserStore } from "@/stores/use-user-store";
import { useTeamStore } from "@/stores/use-team-store";
import { PLUGIN_STORE_KEY, usePluginStore } from "@/stores/use-plugin-store";
import { installRemoteUserDataAutoSync, resetRemoteUserDataSync, stopAssetOriginalRecovery, syncRemoteUserData, withRemoteUserDataSyncExclusive } from "@/services/user-data-sync";
import { setGenerationIdentityReady, withGenerationConsumersPaused } from "@/services/generation-consumer-lifecycle";
import { clearResourceBlobCache } from "@/services/resource-blob-cache";
import { getRemoteUserDataSnapshot } from "@/services/api/user-data";
import type { BootstrapPayload } from "@/services/api/bootstrap";
import { seedBootstrapQueries } from "@/lib/bootstrap-cache";
import { assetHubFoldersQueryOptions, assetHubTotalsQueryOptions } from "@/lib/asset-hub-queries";
import { observeLowFrequencyRefresh } from "@/services/low-frequency-cache";
import type { ModelCatalogResponse } from "@/services/api/logical-models";
import { registerSessionRuntime } from "@/lib/session-runtime";
import { AUTH_IDENTITY_EVENT_KEY } from "@/lib/auth-tab-events";

let sessionRevision = 0;
let currentTransition: { revision: number; generation: number; epoch: string | undefined; promise: Promise<void> } | undefined;
registerSessionRuntime({ apply: applyUserSession, invalidate: invalidateCurrentUserSession, revision: getUserSessionRevision });
const refreshedCatalog = new Map<string, ModelCatalogResponse>();

observeLowFrequencyRefresh((path, scope, value) => {
    if (path !== "/model-catalog" || scope !== getActiveUserScope()) return;
    const catalog = value as ModelCatalogResponse;
    if (catalog?.source !== "frontend" || !Array.isArray(catalog.models)) return;
    refreshedCatalog.set(scope, catalog);
    if (useUserStore.getState().hydrated && useUserStore.getState().user?.id === scope) useConfigStore.getState().mergeSystemChannels(managedModelChannels(catalog.models));
});

export function getUserSessionRevision() {
    return sessionRevision;
}

function sharedAuthEpoch() {
    try {
        return typeof window === "undefined" ? undefined : (window.localStorage.getItem(AUTH_IDENTITY_EVENT_KEY) ?? "");
    } catch {
        return undefined;
    }
}

export function hasUserSessionIdentityChange() {
    const epoch = sharedAuthEpoch();
    return Boolean(currentTransition && currentTransition.epoch !== undefined && epoch !== undefined && currentTransition.epoch !== epoch);
}

export function getUserSessionTransition() {
    return currentTransition?.revision === sessionRevision && currentTransition.generation === getAuthSessionGeneration() && currentTransition.epoch !== undefined && currentTransition.epoch === sharedAuthEpoch() ? currentTransition.promise : undefined;
}

// Suspend synchronously when another tab changes the shared cookie. Recovery
// later uses the same serialized transition; never relabel old stores as B.
export function invalidateCurrentUserSession() {
    sessionRevision++;
    currentTransition = undefined;
    setGenerationIdentityReady(false);
    useUserStore.getState().setHydrated(false);
    resetRemoteUserDataSync();
    appQueryClient.clear();
}

function assertCurrentSession(revision: number) {
    if (revision !== sessionRevision) throw new DOMException("Session transition superseded", "AbortError");
}

// Promise.all rejects early; scope must not change while sibling writes or
// rehydrations from the preceding identity are still in flight.
async function drainAll<T extends readonly unknown[]>(operations: T) {
    await Promise.allSettled(operations);
    return Promise.all(operations);
}

export function switchUserStorageScope(userId?: string | null) {
    return withGenerationConsumersPaused(() => switchStorageScope(userId));
}

async function switchStorageScope(userId?: string | null) {
    await withRemoteUserDataSyncExclusive(async () => {
        await drainAll([flushCanvasStorePersistence(), flushAssetStorePersistence(), flushConfigStorePersistence(), flushInspirationPersistence()]);
        if (getActiveUserScope() !== (userId || GUEST_SCOPE)) {
            // 旧账号数据已落盘：清空内存（不写盘）。否则从切换 scope 到新账号重新水合之间，
            // 旧账号仍在进行的异步更新会把整份旧数据按新 scope 持久化，串进新账号。
            clearInspirationMemory();
            withCanvasStorePersistenceSuppressed(() => useCanvasStore.setState({ projects: [] }));
            withAssetStorePersistenceSuppressed(() => useAssetStore.setState({ assets: [] }));
        }
        resetRemoteUserDataSync();
        clearResourceBlobCache();
        setActiveUserScope(userId);
    });
}

type SessionOptions = { backgroundRemoteData?: boolean; beforeReady?: () => void; bootstrapRead?: Promise<BootstrapPayload> };

export function applyUserSession(payload: BootstrapPayload, options: SessionOptions = {}) {
    stopAssetOriginalRecovery();
    // Capture before queued transitions or IndexedDB hydration can age the snapshot.
    payload = { ...payload, snapshotAcquiredAt: payload.snapshotAcquiredAt ?? Date.now() };
    const revision = ++sessionRevision;
    setGenerationIdentityReady(false);
    useUserStore.getState().setHydrated(false);
    // Pause consumers and serialize the *whole* transition, not just scope
    // selection. Rehydration cannot be cancelled, so it is drained before B.
    const promise = withGenerationConsumersPaused(() => applySession(payload, revision, options));
    currentTransition = payload.user ? { revision, generation: getAuthSessionGeneration(), epoch: sharedAuthEpoch(), promise } : undefined;
    void promise.catch(() => {
        if (currentTransition?.promise === promise) currentTransition = undefined;
    });
    return promise;
}

async function applySession(payload: BootstrapPayload, revision: number, { backgroundRemoteData = false, beforeReady, bootstrapRead }: SessionOptions) {
    performance.mark("session-apply-start");
    assertCurrentSession(revision);
    refreshedCatalog.clear();
    const previousUserId = useUserStore.getState().user?.id || "";
    const nextUserId = payload.user?.id || "";
    const scopedBootstrap = bootstrapRead?.then((bootstrap) => {
        assertCurrentSession(revision);
        if (bootstrap.user?.id !== nextUserId) return undefined;
        return bootstrap;
    });
    void scopedBootstrap?.catch(() => undefined);
    let ready = false;
    let catalogLoadFailed = false;
    try {
        // Query key 不携带用户 ID；身份变化时必须取消并清空旧账号请求，避免跨账号复用内存数据。
        if (previousUserId !== nextUserId) appQueryClient.clear();
        await switchStorageScope(payload.user?.id);
        performance.mark("session-scope-ready");
        assertCurrentSession(revision);
        useTeamStore.getState().setUserScope(payload.user?.id);
        if (nextUserId && typeof window !== "undefined" && /^\/assets(?:\/|$)/.test(window.location?.pathname || "")) {
            void appQueryClient.prefetchInfiniteQuery(assetHubFoldersQueryOptions(nextUserId));
            void appQueryClient.prefetchQuery(assetHubTotalsQueryOptions(nextUserId));
        }
        // Start protected reads only after identity/scope selection, while
        // IndexedDB hydrates. Attach handlers immediately for failed reads.
        const catalogRead = nextUserId
            ? Promise.resolve(payload.catalog ?? scopedBootstrap?.then((bootstrap) => bootstrap?.catalog))
                  .then((catalog) => {
                      assertCurrentSession(revision);
                      return catalog ?? getModelCatalog();
                  })
                  .then(
                      (value) => ({ value, error: undefined }),
                      (error: unknown) => ({ value: undefined, error }),
                  )
            : undefined;
        const snapshotRead = nextUserId
            ? Promise.resolve(payload.snapshot ?? scopedBootstrap?.then((bootstrap) => bootstrap?.snapshot)).then((snapshot) => {
                  assertCurrentSession(revision);
                  return snapshot ?? getRemoteUserDataSnapshot();
              })
            : undefined;
        void snapshotRead?.catch(() => undefined);
        const [persistedCanvas, persistedAssets, persistedPlugins, persistedCanvasHistory, persistedInspirations] = await drainAll([
            localForageStorage.getItem(CANVAS_STORE_KEY),
            localForageStorage.getItem(ASSET_STORE_KEY),
            localForageStorage.getItem(PLUGIN_STORE_KEY),
            localForageStorage.getItem(CANVAS_HISTORY_STORE_KEY),
            localForageStorage.getItem(INSPIRATION_STORE_KEY),
        ]);
        performance.mark("session-storage-read");
        assertCurrentSession(revision);
        const persistedConfig = scopedLocalStorage.getItem(CONFIG_STORE_KEY);
        usePluginStore.setState({ hydrated: false, runtimeStatuses: {}, pluginStates: {} });
        useUserStore.getState().setUser(payload.user);
        useUserStore.getState().setWatermarkRequired(payload.user ? payload.watermarkRequired : false);
        useUserStore.getState().setRuntimeLimits(payload.runtimeLimits);
        useUserStore.getState().setDrawingEngine(payload.drawingEngine);
        useUserStore.getState().setFeatures(payload.features);
        await drainAll([useCanvasStore.persist.rehydrate(), useAssetStore.persist.rehydrate(), useConfigStore.persist.rehydrate(), usePluginStore.persist.rehydrate(), useCanvasHistoryStore.persist.rehydrate(), useInspirationStore.persist.rehydrate()]);
        performance.mark("session-stores-hydrated");
        assertCurrentSession(revision);
        // 模型密钥存放在按 scope 隔离的 IndexedDB；开放工作区前合并进配置并迁移旧 localStorage 密钥。
        // 读取失败保留内存配置与恢复入口，不写入新明文密钥。
        await hydrateConfigSecrets().catch((error) => console.warn("模型密钥读取失败，请在设置中重试本地保存", error));
        performance.mark("session-secrets-ready");
        assertCurrentSession(revision);
        // Zustand 在目标 scope 没有快照时会保留旧内存，必须显式恢复该 scope 的空状态。
        if (!persistedCanvas) useCanvasStore.setState({ projects: [] });
        if (!persistedAssets) useAssetStore.setState({ assets: [] });
        // Server plugin states were cleared before setUser and may already be refetched; only the local snapshot resets here.
        if (!persistedPlugins) usePluginStore.setState({ installations: [] });
        // 删除历史同样按账号隔离：目标 scope 无快照时不能沿用上一账号的已删除画布列表。
        if (!persistedCanvasHistory) useCanvasHistoryStore.setState({ deletedProjects: [] });
        if (!persistedInspirations) {
            clearInspirationMemory();
            useInspirationStore.getState().markHydrated();
        }
        if (!nextUserId) {
            // 匿名工作区不能请求受保护的模型目录，否则登录页首次加载会产生
            // 未处理的 401/403，并把正常的“未登录”状态误报成运行时错误。
            // 没有匿名快照时显式回到无系统渠道的本地默认配置；已有匿名快照
            // 则保持用户自己的本地渠道，等真正登录后再合并后台目录。
            if (!persistedConfig) {
                const anonymousConfig = {
                    ...defaultConfig,
                    channels: [],
                    imageModels: undefined,
                    videoModels: undefined,
                    textModels: undefined,
                    audioModels: undefined,
                };
                useConfigStore.getState().replaceConfig(normalizeConfigSnapshot({ config: anonymousConfig }).config);
            }
        } else if (backgroundRemoteData) {
            if (!persistedConfig) {
                const initialConfig = {
                    ...defaultConfig,
                    channels: [],
                    imageModels: undefined,
                    videoModels: undefined,
                    textModels: undefined,
                    audioModels: undefined,
                };
                useConfigStore.getState().replaceConfig(normalizeConfigSnapshot({ config: initialConfig }).config);
            }
            // Catalog availability is independent of identity/local hydration.
            // A delayed result must never merge channels into a later account.
            void catalogRead!
                .then(({ value, error }) => {
                    if (revision !== sessionRevision || nextUserId !== getActiveUserScope()) return;
                    if (value) useConfigStore.getState().mergeSystemChannels(managedModelChannels(value.models));
                    else {
                        console.warn("模型目录加载失败，暂用本地配置并稍后重试", error);
                        scheduleSystemChannelRetry(revision);
                    }
                })
                .catch((error) => {
                    if (revision !== sessionRevision) return;
                    console.warn("模型目录合并失败，稍后自动重试", error);
                    scheduleSystemChannelRetry(revision);
                });
        } else if (!persistedConfig) {
            // 只有首次配置缺失时才生成能力推荐；已有配置中的空数组代表用户明确清空。
            // 使用统一模型目录接口；目录读取失败不能卡住整个工作区，先开放、后台重试。
            const catalog = await catalogRead!.then(({ value, error }) => {
                if (value) return value;
                catalogLoadFailed = true;
                console.warn("模型目录加载失败，稍后自动重试", error);
                return { models: [] as PublicLogicalModel[] };
            });
            assertCurrentSession(revision);
            const channels: ModelChannel[] = managedModelChannels(catalog.models);
            const initialSystemConfig = {
                ...defaultConfig,
                channels,
                imageModels: undefined,
                videoModels: undefined,
                textModels: undefined,
                audioModels: undefined,
            };
            useConfigStore.getState().replaceConfig(normalizeConfigSnapshot({ config: initialSystemConfig }).config);
        } else {
            // 已有配置时也需要合并最新的系统渠道；失败时保留本地配置，后台重试。
            const catalog = await catalogRead!.then(({ value, error }) => {
                if (value) return value;
                catalogLoadFailed = true;
                console.warn("模型目录加载失败，暂用本地配置并稍后重试", error);
                return undefined;
            });
            assertCurrentSession(revision);
            if (catalog) useConfigStore.getState().mergeSystemChannels(managedModelChannels(catalog.models));
        }
        assertCurrentSession(revision);
        installRemoteUserDataAutoSync();
        performance.mark("session-local-ready");
        if (payload.user?.id) {
            // 登录后的服务端快照是实体基线；基线完成前不开放远端写操作。
            // 拉取失败时保留本地缓存供只读降级，但远端写入口会明确拒绝，不能把旧缓存上传成真相。
            const baseline = syncRemoteUserData(payload.user.id, snapshotRead, { yieldBeforeMerge: backgroundRemoteData })
                .then(() => performance.mark("session-baseline-ready"))
                .catch((error) => console.warn("登录后云端数据基线建立失败，已停止远端写入", error));
            // Scope, local drafts/assets and secrets are already hydrated. The
            // sync coordinator still rejects remote writes until its baseline
            // is ready, archives drafts before replacement, and serializes the
            // next identity transition behind this operation.
            if (!backgroundRemoteData) await baseline;
        } else resetRemoteUserDataSync();
        assertCurrentSession(revision);
        seedBootstrapQueries(payload, typeof window === "undefined" ? "" : window.location?.pathname || "");
        if (scopedBootstrap)
            void scopedBootstrap
                .then((bootstrap) => {
                    if (!bootstrap || revision !== sessionRevision || bootstrap.user?.id !== nextUserId || getActiveUserScope() !== nextUserId) return;
                    useUserStore.getState().setWatermarkRequired(bootstrap.watermarkRequired);
                    seedBootstrapQueries(bootstrap, typeof window === "undefined" ? "" : window.location?.pathname || "");
                })
                .catch(() => undefined);
        const latestCatalog = refreshedCatalog.get(nextUserId);
        if (latestCatalog) useConfigStore.getState().mergeSystemChannels(managedModelChannels(latestCatalog.models));
        // Select the destination before publishing hydration; otherwise the
        // login modal's background page renders the entire new user's stores.
        beforeReady?.();
        ready = true;
        if (catalogLoadFailed) scheduleSystemChannelRetry(revision);
    } finally {
        // A failed/superseded transition must not expose partially loaded
        // stores or enable generation under a different identity.
        if (!ready) resetRemoteUserDataSync();
        if (revision === sessionRevision) {
            setGenerationIdentityReady(ready);
            useUserStore.getState().setHydrated(ready);
            if (ready && typeof performance !== "undefined") performance.mark("workspace-data-ready");
        }
    }
}

// 登录时模型目录读取失败：工作区先开放，后台按 5s / 15s / 45s 重试，成功即停止。
function scheduleSystemChannelRetry(revision: number, delays = [5_000, 15_000, 45_000]) {
    const [delay, ...rest] = delays;
    if (delay === undefined) return;
    const timer = globalThis.setTimeout(() => {
        if (revision !== sessionRevision) return;
        void refreshSystemChannels().catch((error) => {
            console.warn("模型目录重试失败", error);
            scheduleSystemChannelRetry(revision, rest);
        });
    }, delay);
    // 非浏览器环境（测试、SSR）里不让重试计时器挡住进程退出。
    (timer as unknown as { unref?: () => void }).unref?.();
}

export async function refreshSystemChannels() {
    const revision = sessionRevision;
    const userId = useUserStore.getState().user?.id;
    if (!userId || !useUserStore.getState().hydrated) return;
    // 使用只返回逻辑模型的公开目录；服务端渠道不进入浏览器。
    const catalog = await getModelCatalog();
    if (revision !== sessionRevision || userId !== useUserStore.getState().user?.id || !useUserStore.getState().hydrated) return;

    useConfigStore.getState().mergeSystemChannels(managedModelChannels(catalog.models));
}

export function managedModelChannels(models: PublicLogicalModel[]) {
    // 公开目录已限定启用模型；路由健康状态只决定可选性，不能删除目录成员。
    if (!models.length) return [];
    const managed: ModelChannel = {
        id: PUBLIC_MODEL_CATALOG_ID,
        name: "平台模型",
        baseUrl: "/api",
        apiKey: "system",
        apiFormat: "openai",
        scope: "system",
        enabled: true,
        models: models.map((item) => item.id),
        modelAliases: Object.fromEntries(models.flatMap((item) => (item.legacyModelIds || []).map((legacyID) => [legacyID, item.id]))),
        modelCosts: models.map((item) => ({
            model: item.id,
            availability: item.availability,
            displayName: item.name,
            description: item.description,
            icon: item.icon,
            capability: item.capability,
            pricePolicy: item.pricePolicy,
            billingMode: item.billingMode,
            unitPriceMicrocredits: item.unitPriceMicrocredits,
            inputTokenPriceMicrocredits: item.inputPriceMicrocredits,
            outputTokenPriceMicrocredits: item.outputPriceMicrocredits,
            cachedTokenPriceMicrocredits: item.cachedPriceMicrocredits,
            capabilityConfig: projectLogicalCapability(item.capabilitySpec, item.defaultOptions),
            logicalModelId: item.id,
            logicalModelCode: item.code,
            logicalAvailable: item.available,
            logicalCapabilitySpec: item.capabilitySpec,
            logicalCapabilityProfiles: item.capabilityProfiles,
            logicalPriceTiers: item.priceTiers,
            defaultOptions: item.defaultOptions,
            starterPreset: item.starterPreset,
        })),
    };
    return [managed];
}

export function projectLogicalCapability(spec: CapabilitySpec, defaults: Record<string, unknown>): ModelCapabilityConfig {
    const projected = defaultModelCapabilityConfig();
    projected.parameters = spec.parameters;
    if (spec.capability === "text" && projected.text) {
        if (spec.parameters) projected.text.references.promptMaxChars = 0;
        projected.text.references.maxImages = spec.inputs?.image?.max ?? 0;
        projected.text.references.maxVideos = spec.inputs?.video?.max ?? 0;
        projected.text.thinking = booleanOption(spec.options?.thinking, defaults.thinking).supported;
        projected.text.streaming = spec.options?.streaming ? booleanOption(spec.options.streaming, true).supported : true;
    }
    if (spec.capability === "image" && projected.image) {
        if (spec.parameters) projected.image.references.promptMaxChars = 0;
        projected.image.references.maxImages = spec.inputs?.image?.max ?? 0;
        projected.image.references.maskSupported = (spec.inputs?.mask?.max ?? 0) > 0;
        projected.image.size = { parameter: "none", values: [], default: "auto", allowCustom: false };
        projected.image.quality = { supported: false, values: [], default: "auto" };
        projected.image.transparentBackground = { supported: false, default: false };
        const sizeOption = spec.options?.size || spec.options?.aspectRatio;
        const sizeValues = stringValues(sizeOption);
        const sizeAllowsCustom = sizeValues.includes("*");
        const concreteSizeValues = sizeValues.filter((value) => value !== "*");
        const sizePresets = concreteSizeValues.length ? concreteSizeValues : sizeAllowsCustom ? [...STANDARD_IMAGE_SIZE_VALUES] : [];
        if (sizePresets.length || sizeAllowsCustom) {
            projected.image!.size = { parameter: "size", values: sizePresets, default: concreteDefault(defaults.size, sizePresets, "1:1"), allowCustom: sizeAllowsCustom };
        }
        applyStringOption(spec.options?.quality, defaults.quality, (values, initial) => {
            projected.image!.quality = { supported: true, values, default: initial };
        });
        applyStringOption(spec.options?.imageResolution, defaults.imageResolution, (values, initial) => {
            projected.image!.resolution = { supported: true, values, default: initial };
        });
        projected.image.maxOutputs = maxNumericOption(spec.options?.count, 1);
        projected.image.transparentBackground = booleanOption(spec.options?.transparentBackground, defaults.transparentBackground);
    }
    if (spec.capability === "video" && projected.video) {
        if (spec.parameters) projected.video.references.promptMaxChars = 0;
        projected.video.maxDurationByResolution = spec.maxDurationByResolution;
        projected.video.maxImagesByResolution = spec.maxImagesByResolution;
        projected.video.references.minImages = spec.inputs?.image?.min ?? 0;
        projected.video.references.maxImages = spec.inputs?.image?.max ?? 0;
        projected.video.references.maxVideos = spec.inputs?.video?.max ?? 0;
        projected.video.references.maxAudios = spec.inputs?.audio?.max ?? 0;
        projected.video.operations = spec.operations || [];
        projected.video.defaultOperation = spec.operations?.[0] || "";
        const duration = spec.options?.videoSeconds || spec.options?.duration;
        if (duration?.values?.length) projected.video.duration = { selection: "enum", values: duration.values.map(Number).filter(Number.isFinite), default: Number(defaults.videoSeconds ?? duration.values[0]) };
        else if (duration?.min !== undefined && duration.max !== undefined) projected.video.duration = { selection: "range", min: duration.min, max: duration.max, step: duration.step || 1, default: Number(defaults.videoSeconds ?? duration.min) };
        projected.video.ratios = stringValues(spec.options?.size || spec.options?.aspectRatio);
        projected.video.defaultRatio = concreteDefault(defaults.size, projected.video.ratios, "");
        projected.video.resolutions = stringValues(spec.options?.vquality || spec.options?.resolution);
        projected.video.defaultResolution = String(defaults.vquality ?? projected.video.resolutions[0] ?? "");
        projected.video.generateAudio = booleanOption(spec.options?.videoGenerateAudio, defaults.videoGenerateAudio);
        projected.video.watermark = booleanOption(spec.options?.videoWatermark, defaults.videoWatermark);
    }
    return projected;
}

function applyStringOption(option: OptionConstraint | undefined, fallback: unknown, apply: (values: string[], initial: string) => void) {
    const values = stringValues(option);
    if (values.length) apply(values, concreteDefault(fallback, values, values[0]));
}

function stringValues(option?: OptionConstraint) {
    return (option?.values || [])
        .map(String)
        .map((value) => value.trim())
        .filter(Boolean);
}

function concreteDefault(value: unknown, values: string[], fallback: string) {
    const candidate = String(value ?? "").trim();
    return candidate && candidate !== "*" && values.includes(candidate) ? candidate : values.find((item) => item !== "*") || fallback;
}

function maxNumericOption(option: OptionConstraint | undefined, fallback: number) {
    if (option?.max !== undefined) return option.max;
    const values = (option?.values || []).map(Number).filter(Number.isFinite);
    return values.length ? Math.max(...values) : fallback;
}

function booleanOption(option: OptionConstraint | undefined, fallback: unknown) {
    const supported = (option?.values || []).some((value) => value === true || value === "true");
    return { supported, default: supported && String(fallback) === "true" };
}

export async function refreshFeatureAvailability() {
    const revision = sessionRevision;
    const userId = useUserStore.getState().user?.id;
    const boot = userId && appQueryClient.getQueryState(["boot-features", userId]);
    if (boot && Date.now() - boot.dataUpdatedAt < 5_000) return useUserStore.getState().features;
    const payload = await getFeatureAvailability();
    if (revision !== sessionRevision || userId !== useUserStore.getState().user?.id) return useUserStore.getState().features;
    useUserStore.getState().setFeatures(payload.features);
    return payload.features;
}
