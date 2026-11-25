import { collectSignupAttribution } from "@/lib/signup-attribution";
import type { ModelChannel } from "@/stores/use-config-store";
import type { BillingOrder, CreditLedgerEntry } from "@/services/api/wallet";
import type { GenerationTask, TaskStatus } from "@/services/api/task-center";
import type { CanvasDrawingEngineSetting } from "@/lib/canvas/canvas-drawing-engine";
import type { FeatureAvailability } from "@/stores/use-user-store";
import { apiClient, request } from "@/services/api/request";
import type { PublicLogicalModel } from "@/services/api/logical-models";
import type { OSSConnectionTestInput, OSSConnectionTestResult, OSSProvider, S3Preset } from "@/lib/oss-settings";
import { createVersionedAsyncCache } from "@/lib/versioned-async-cache";
import type { CaptchaProof } from "./auth-captcha";
import { announceAuthIdentityChange, readSharedAuthEpoch } from "@/lib/auth-tab-events";
import { createStartupReadHandoff } from "@/lib/startup-read-handoff";
import type { BootstrapPayload } from "./bootstrap";

const api = apiClient;

const authSessionReads = createVersionedAsyncCache(() => request<AuthSessionPayload>(api.get("/auth/session", { timeout: 15_000 })), 5_000);
const workspaceSessionReads = createVersionedAsyncCache(async (): Promise<(BootstrapPayload & { snapshotAcquiredAt: number }) | AuthSessionPayload> => {
    try {
        const params = { scope: "workspace" };
        const payload = await request<BootstrapPayload>(api.get("/bootstrap", { params, timeout: 15_000 }));
        return { ...payload, snapshotAcquiredAt: Date.now() };
    } catch {
        // Bootstrap is an optimization: a failing or missing aggregate (e.g. mid-deploy) must not block sign-in.
        return authSessionReads.read();
    }
}, 5_000);
let authSessionGeneration = 0;
let authIdentityGeneration = 0;
let pendingIdentityMutations = 0;
const workspaceStartupRead = createStartupReadHandoff(() => workspaceSessionReads.read(), {
    revision: () => {
        const epoch = readSharedAuthEpoch();
        return epoch === undefined ? undefined : `${authSessionGeneration}:${epoch}`;
    },
    onSuperseded: invalidateExternalAuthIdentity,
});

export function getAuthIdentityGeneration() {
    return authIdentityGeneration;
}
export function isAuthIdentityChanging() {
    return pendingIdentityMutations > 0;
}

async function mutateIdentity<T>(operation: () => Promise<T>): Promise<T> {
    pendingIdentityMutations++;
    try {
        const result = await operation();
        authIdentityGeneration++;
        invalidateAuthSessionCache();
        performance.mark("auth-identity-broadcast-start");
        announceAuthIdentityChange();
        performance.mark("auth-identity-broadcast-end");
        return result;
    } finally {
        pendingIdentityMutations--;
    }
}

export function invalidateExternalAuthIdentity() {
    authIdentityGeneration++;
    invalidateAuthSessionCache();
}

export function getAuthSessionGeneration() {
    return authSessionGeneration;
}

export function invalidateAuthSessionCache() {
    authSessionGeneration++;
    authSessionReads.invalidate();
    workspaceSessionReads.invalidate();
    workspaceStartupRead.invalidate();
    authSettingsReads.invalidate();
}

export type LocalUser = {
    features?: { directorPrevisV2: boolean };
    hasPassword: boolean;
    linkedProviders: string[];
    id: string;
    username: string;
    email?: string;
    displayName: string;
    avatarUrl?: string;
    identityProvider?: string;
    identityId?: string;
    identityUsername?: string;
    role: "admin" | "user";
    status: "active" | "disabled";
    lastLoginAt?: string;
    createdAt: string;
    updatedAt: string;
};

export type AdminUser = LocalUser & {
    availableMicrocredits: number;
    reservedMicrocredits: number;
    signupCountryCode?: string;
    signupIpMasked?: string;
    lastCountryCode?: string;
    lastIpMasked?: string;
    insight: AdminUserInsight;
    signupSource?: string;
    signupMethod?: AdminUserDetail["signupMethod"];
    signupReferrer?: string;
    signupUtm?: string;
    identityProviders?: string[];
    subscriptionSummary?: AdminUserSubscriptionSummary | null;
    paymentTotals?: AdminUserPaymentAmount[];
};

export type AdminUserSubscriptionSummary = {
    planSku?: string;
    planName?: string;
    interval?: string;
    status?: string;
    currency?: string;
    amountMinor?: number;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd?: string;
};

export type AdminUserPaymentAmount = {
    currency: string;
    amountMinor: number;
    orderCount: number;
};

export type AdminUserInsight = {
    sessionCount: number;
    activeSeconds: number;
    firstActiveAt?: string;
    lastActiveAt?: string;
    taskCount: number;
    succeededTaskCount: number;
    failedTaskCount: number;
    commonModel?: string;
    capabilities: string[];
    paidOrderCount: number;
    paidAmountMinor: number;
    paidCurrency?: string;
};

export type AuthSessionPayload = {
    watermarkRequired?: boolean;
    user: LocalUser | null;
    logicalModels?: PublicLogicalModel[];
    runtimeLimits?: RuntimeLimits;
    drawingEngine?: CanvasDrawingEngineSetting;
    features?: FeatureAvailability;
};

export type RuntimeLimits = {
    activeTaskLimit: number;
    resourceUploadMB: number;
    sessionUploadMB: number;
    recycleBinRetentionDays?: number;
};

export type ApiCallLog = {
    detailLogId?: string;
    id: string;
    userId: string;
    userDisplayName?: string;
    userAccount?: string;
    userName?: string;
    userEmail?: string;
    country?: string;
    clientIp?: string;
    channelId: string;
    channelName: string;
    taskId?: string;
    taskStatus?: TaskStatus;
    promptPreview?: string;
    billingOrderId?: string;
    billingStatus?: BillingOrder["status"];
    billingAmountMicrocredits: number;
    creditsConsumedMicrocredits?: number;
    billingAvailable: boolean;
    source: string;
    capability: "text" | "image" | "video" | "audio" | "";
    operation?: string;
    requestKind: "create" | "poll" | "download" | "repair" | "";
    billable: boolean;
    apiFormat: string;
    method: string;
    path: string;
    model: string;
    status: "succeeded" | "failed";
    statusCode: number;
    durationMs: number;
    pollCount: number;
    providerStatus?: string;
    inputTokens: number;
    outputTokens: number;
    cachedTokens: number;
    usageAvailable: boolean;
    mediaCount: number;
    mediaPreviewUrl?: string;
    mediaPreviewKind?: "image" | "video";
    videoSeconds: number;
    providerRequestId?: string;
    estimatedCostMicros: number;
    costAvailable: boolean;
    costPriceVersionId?: string;
    costPayer?: "platform" | "user" | "unknown";
    costPriceSnapshot?: string;
    costBasis?: string;
    currency?: string;
    errorCode?: string;
    error?: string;
    concurrencyLimit: number;
    upstreamUrl: string;
    requestContentType?: string;
    requestBody?: string;
    responseBody?: string;
    startedAt?: string;
    createdAt: string;
};

export type AdminProviderTaskQueryResult = {
    task: GenerationTask;
    providerStatus: string;
    recovered: boolean;
    billingSettled: boolean;
};

export type AdminAuditEvent = {
    id: string;
    actorUserId: string;
    action: string;
    targetType: string;
    targetId: string;
    summary: string;
    metadataJson?: string;
    createdAt: string;
};

export type AdminUserDetail = {
    user: LocalUser;
    signupMethod?: "email" | "password" | "google" | "github" | "microsoft" | "linuxdo";
    lastLoginMethod?: "password" | "magic_link" | "google" | "github" | "linuxdo" | "microsoft";
    identityProviders: string[];
    account: { userId: string; availableMicrocredits: number; reservedMicrocredits: number; version: number };
    counts: { ledgerEntries: number; tasks: number; apiCalls: number; auditEvents: number };
    insight: AdminUserInsight;
    network: {
        signupCountryCode?: string;
        signupIpMasked?: string;
        lastCountryCode?: string;
        lastIpMasked?: string;
        countryCode?: string;
        observedIp?: string;
        ipMasked?: string;
        riskStatus: string;
        riskLabel: string;
        riskService?: string;
        isAnonymous: boolean;
        isVpn: boolean;
        isProxy: boolean;
        isTor: boolean;
        isRelay: boolean;
        isHosting: boolean;
        lastPath?: string;
        lastSeenAt?: string;
        riskCheckedAt?: string;
    };
    models: Array<{
        model: string;
        capability: string;
        requests: number;
        succeededRequests: number;
        failedRequests: number;
        usageRequests: number;
        inputTokens: number;
        outputTokens: number;
        cachedTokens: number;
        creditsConsumedMicrocredits: number;
        creditsRefundedMicrocredits: number;
        mediaCount: number;
        videoSeconds: number;
        estimatedCostMicros: number;
        costAvailable: boolean;
        lastUsedAt?: string;
    }>;
    generationModes: Array<{ source: string; capability: string; operation: string; requestKind: string; requests: number }>;
    paymentAmounts: AdminUserPaymentAmount[];
    signupSource?: string;
    signupEntry?: string;
    signupReferrer?: string;
    signupUtm?: string;
    subscriptionSummary?: AdminUserSubscriptionSummary | null;
    creditsConsumedMicrocredits: number;
    creditsRefundedMicrocredits: number;
    storageUsage: {
        assetCount: number;
        assetBytes: number;
        canvasCount: number;
        canvasBytes: number;
        sessionCount: number;
        sessionBytes: number;
        taskCount: number;
        taskBytes: number;
        apiCallCount: number;
    };
    storedFileBytes: number;
    dailyUploadBytes: number;
    quota: RuntimeResourcePolicy;
};

export type AdminUserTask = {
    watermark?: { required: boolean; policyVersion: string; decisionReason: string };
    id: string;
    type: string;
    status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
    stage: string;
    progress: number;
    model?: string;
    provider?: string;
    operation?: string;
    prompt?: string;
    error?: string;
    projectId?: string;
    sessionId?: string;
    providerRequestId?: string;
    completedAt?: string;
    createdAt: string;
};

export type AnalyticsFilters = {
    from?: string;
    to?: string;
    userId?: string;
    model?: string;
    channelId?: string;
    capability?: string;
};

export type AdminReferenceData = {
    users: Array<{ id: string; username: string; displayName: string }>;
    channels: Array<{ id: string; name: string; enabled: boolean; models: string[] }>;
};

export type PaymentCurrencySummary = {
    currency: string;
    amountMinor: number;
    orderCount: number;
    paidUserCount: number;
};

export type AdminAnalytics = {
    recentOutcomes?: Array<{ id: string; createdAt: string; status: "succeeded" | "failed" }>;
    firstDay?: { previous?: { observed: number; text: number }; observing: number; groups: Record<"other" | "text" | "attempt" | "delivered", string[]> };
    channelCosts?: Array<{ channelId: string; userSucceeded: number; userFailed: number; attemptsByPayer?: Partial<Record<"platform" | "user" | "unknown", number>> | null; costsByPayer: import("@/lib/admin-supplier-cost").SupplierPayerCosts[] }>;
    from: string;
    to: string;
    meta: {
        timezone: string;
        metricVersion: string;
        taskTimeBasis: string;
        generatedAt: string;
        dataThrough: string;
        userScope: string;
        paymentScope: string;
        queueScope: string;
        costBasis: string;
    };
    kpi: {
        activeUsers: number;
        dau: number;
        wau: number;
        mau: number;
        newUsers: number;
        totalUsers: number;
        generationTasks: number;
        generationAttempts: number;
        terminalGenerationAttempts: number;
        failedGenerationAttempts: number;
        generationAttemptSuccessRate: number | null;
        internalStageRecords: number;
        unclassifiedRequestRecords: number;
        successfulMediaUsers?: number;
        succeededTasks: number;
        failedTasks: number;
        finalTaskFailureRate: number | null;
        terminalTasks: number;
        runningTasks: number;
        queuedTasks: number;
        cancelledTasks: number;
        otherTasks: number;
        unrecoveredUsers: number;
        taskDurationSamples: number;
        taskP50DurationMs: number;
        taskP95DurationMs: number;
        queueDurationSamples: number;
        queueP50DurationMs: number;
        queueP95DurationMs: number;
        totalDurationSamples: number;
        totalP50DurationMs: number;
        totalP95DurationMs: number;
        queuedAgeSamples: number;
        oldestQueuedAgeMs: number | null;
        costedRequests: number;
        snapshotCostRequests: number;
        legacyCostRequests: number;
        uncostedRequests: number;
        costAmountsByCurrency: Array<{ currency: string; amountMicros: number; requests: number }>;
        costsByPayer?: import("@/lib/admin-supplier-cost").SupplierPayerCosts[];
        finalTaskSuccessRate?: number | null;
        finalTaskSuccessAvailable: boolean;
        upstreamRequests: number;
        failedRequests: number;
        impactedUsers: number;
        paidOrdersCount: number;
        paidUsersCount: number;
        paymentAmountsByCurrency: PaymentCurrencySummary[];
        imageGenerations: number;
        videoGenerations: number;
        audioGenerations: number;
        creditsConsumedMicrocredits: number;
        creditsReservedMicrocredits: number;
        creditsRefundedMicrocredits: number;
        successRate: number;
        p95DurationMs: number;
        currentQueuedTasks: number;
        estimatedCostMicros: number;
        costAvailable: boolean;
        currency?: string;
    };
    trend: Array<{ day: string; tasks: number; requests: number; newUsers: number; failures: number; creditsConsumedMicrocredits: number; activeUsers: number; requestSuccessRate: number }>;
    models: Array<{
        costsByPayer?: import("@/lib/admin-supplier-cost").SupplierPayerCosts[];
        model: string;
        capability: string;
        tasks: number;
        requests: number;
        uniqueUsers: number;
        taskSuccessRate: number;
        requestSuccessRate: number;
        terminalTasks: number;
        terminalRequests: number;
        p50DurationMs: number;
        p95DurationMs: number;
        inputTokens: number;
        outputTokens: number;
        cachedTokens: number;
        usageAvailable: boolean;
        mediaCount: number;
        videoSeconds: number;
        estimatedCostMicros: number;
        costAvailable: boolean;
        currency?: string;
    }>;
    users: Array<{
        userId: string;
        name: string;
        activeDays: number;
        successfulMediaTasks?: number;
        tasks: number;
        agentMessages: number;
        canvasDays: number;
        assets: number;
        resources: number;
        commonModel?: string;
    }>;
    countries: Array<{
        countryCode: string;
        users: number;
        newUsers: number;
    }>;
    failures: Array<{
        type: string;
        model: string;
        count: number;
        channelId?: string;
        channelName?: string;
        capability?: string;
        lastError?: string;
        lastSeenAt: string;
    }>;
};

export type ModelPricing = {
    configuredUnits: string[] | null;
    id: string;
    channelId?: string;
    model: string;
    capability: "text" | "image" | "video" | "audio";
    currency: string;
    inputPerMillionMicros: number;
    outputPerMillionMicros: number;
    cachedPerMillionMicros: number;
    perRequestMicros: number;
    perMediaMicros: number;
    perVideoSecondMicros: number;
    createdAt: string;
    updatedAt: string;
};

export type PromptTemplate = {
    id: string;
    operation: string;
    name: string;
    version: number;
    content: string;
    outputType: "json" | "text";
    enabled: boolean;
    createdBy?: string;
    createdAt: string;
    updatedAt: string;
};

export type PromptTemplateVariable = {
    label: string;
    placeholder: string;
};

export type PromptOperationDefinition = {
    operation: string;
    label: string;
    category: string;
    description: string;
    outputType: "json" | "text";
    schemaKey?: string;
    variables: PromptTemplateVariable[];
    outputContract: string;
};

export type UserPromptCustomization = {
    id: string;
    operation: string;
    mode: "inherit" | "append" | "rewrite";
    content: string;
    baseTemplateId: string;
    updatedAt: string;
};

export type UserPromptPreference = {
    definition: PromptOperationDefinition;
    template: PromptTemplate | null;
    customization?: UserPromptCustomization;
    outdated: boolean;
};

export type AdminOSSSetting = {
    enabled: boolean;
    provider: OSSProvider;
    s3Preset: S3Preset;
    region: string;
    endpoint: string;
    cdnBaseUrl: string;
    bucket: string;
    accessKeyId: string;
    accessKeySecret?: string;
    hasAccessKeySecret: boolean;
    sessionToken?: string;
    hasSessionToken: boolean;
    pathStyle: boolean;
    allowUserS3: boolean;
    publicBaseUrl: string;
    pathPrefix: string;
    testedAt?: string;
    testedDigest?: string;
    historyCount?: number;
    referencedResourceCount?: number;
    updatedBy?: string;
    createdAt?: string;
    updatedAt?: string;
};

export type AdminArkPrivateAssetSetting = {
    enabled: boolean;
    region: string;
    projectName: string;
    accessKeyId: string;
    accessKeySecret?: string;
    hasAccessKeySecret: boolean;
    updatedBy?: string;
    createdAt?: string;
    updatedAt?: string;
};

export type RuntimeResourcePolicy = {
    directURLTTLMinutes?: number;
    providerURLTTLMinutes?: number;
    resourceUploadMB: number;
    sessionUploadMB: number;
    generatedFileMB: number;
    dailyUploadMB: number;
    storedFileGB: number;
    structuredDataMB: number;
    taskDataGB: number;
    assetCount: number;
    canvasCount: number;
    sessionCount: number;
    taskCount: number;
    apiCallLogCount: number;
    recycleBinRetentionDays?: number;
};

export type RuntimeTaskPolicy = {
    workerConcurrency: number;
    channelConcurrency: number;
    activeTaskLimit: number;
    imageTimeoutMinutes: number;
    textTimeoutMinutes: number;
    audioTimeoutMinutes: number;
    videoTimeoutMinutes: number;
    storyboardTimeoutMinutes: number;
    defaultTimeoutMinutes: number;
};

export type RuntimeRequestPolicy = {
    taskCreatePerMinute: number;
    sessionCreatePerMinute: number;
    resourceUploadPerMinute: number;
    resourceImportPerMinute: number;
    sessionFilePerMinute: number;
    assetWritePerMinute: number;
    canvasWritePerMinute: number;
    registerPerHour: number;
    emailCodePerHour: number;
    loginIPPerTenMinutes: number;
    loginAccountPerTenMinutes: number;
    systemRelayPerMinute: number;
    customRelayPerMinute: number;
    customRelayConcurrency: number;
    customRelayRequestMB: number;
    customRelayResponseMB: number;
    customRelayTimeoutMinutes: number;
    systemRelayRequestMB: number;
    systemRelayResponseMB: number;
    channelCircuitFailureCount: number;
    channelCircuitOpenSeconds: number;
};

export type RuntimePolicySetting = {
    resource: RuntimeResourcePolicy;
    task: RuntimeTaskPolicy;
    request: RuntimeRequestPolicy;
    configured?: boolean;
    updatedBy?: string;
    createdAt?: string;
    updatedAt?: string;
};

const authSettingsReads = createVersionedAsyncCache(readAuthSettings, 5_000);
export function getAuthSettings() {
    return authSettingsReads.read();
}

function readAuthSettings() {
    return request<{
        firstUser: boolean;
        registrationEnabled: boolean;
        linuxdoEnabled: boolean;
        googleEnabled: boolean;
        githubEnabled: boolean;
        microsoftEnabled: boolean;
        emailEnabled: boolean;
        emailCodeRequired: boolean;
        captchaMode?: "adaptive" | "always" | "off";
        signupBonusCredits?: number;
    }>(api.get("/auth/settings"));
}

export function linuxDOLoginURL(next: string) {
    const base = String(api.defaults.baseURL || "/api").replace(/\/$/, "");
    return `${base}/auth/linuxdo/start?${oauthAttributionQuery(next)}`;
}

export type SocialOAuthProvider = "google" | "github" | "microsoft";

export function socialOAuthLoginURL(provider: SocialOAuthProvider, next: string) {
    const base = String(api.defaults.baseURL || "/api").replace(/\/$/, "");
    return `${base}/auth/${provider}/start?${oauthAttributionQuery(next)}`;
}

export function getAuthSession() {
    return authSessionReads.read();
}

export function getWorkspaceSession() {
    return workspaceStartupRead.read();
}

export function prefetchWorkspaceSession() {
    return workspaceStartupRead.prefetch();
}

export function getFeatureAvailability() {
    return request<{ features: FeatureAvailability }>(api.get("/features"));
}





export async function login(input: { username: string; password: string; captcha?: CaptchaProof }) {
    return mutateIdentity(() => request<{ user: LocalUser }>(api.post("/auth/login", input)));
}

export function sendRegistrationEmailCode(email: string, invitationToken = "", captcha?: CaptchaProof, purpose?: "registration" | "password_set") {
    return request<{ sent: boolean }>(api.post("/auth/email-code", { email, invitationToken, captcha, purpose }));
}

export function sendPasswordResetEmailCode(email: string, captcha?: CaptchaProof) {
    return request<{ sent: boolean }>(api.post("/auth/password-reset-code", { email, captcha }));
}

export async function resetPassword(input: { email: string; emailCode: string; password: string; captcha?: CaptchaProof }) {
    return mutateIdentity(() => request<{ reset: boolean }>(api.post("/auth/password-reset", input)));
}

export async function register(input: {
    username: string;
    email?: string;
    emailCode?: string;
    displayName?: string;
    password: string;
    invitationToken?: string;
    captcha?: CaptchaProof;
    acquisitionSource?: string;
    acquisitionMedium?: string;
    acquisitionCampaign?: string;
    signupEntry?: string;
    signupReferrer?: string;
    signupUtm?: string;
}) {
    return mutateIdentity(() => request<{ user: LocalUser }>(api.post("/auth/register", input)));
}

export async function logout() {
    return mutateIdentity(() => request<{ ok: boolean }>(api.post("/auth/logout")));
}

export async function updateCurrentUserAvatar(avatarId: string) {
    const identity = authIdentityGeneration;
    const result = await request<{ user: LocalUser }>(api.patch("/auth/profile/avatar", { avatarId }));
    if (identity !== authIdentityGeneration || isAuthIdentityChanging()) throw new DOMException("Identity changed", "AbortError");
    invalidateAuthSessionCache();
    return result;
}

export function recordUserHeartbeat(input: { sessionId: string; path: string }) {
    return request<{ activeSeconds: number; lastSeenAt: string }>(api.post("/auth/activity/heartbeat", input));
}

export type AdminListParams = AnalyticsFilters & { keyword?: string; status?: string; role?: string; page?: number; limit?: number };





































export function listUserPromptPreferences() {
    return request<{ preferences: UserPromptPreference[] }>(api.get("/settings/prompt-templates"));
}

export function updateUserPromptCustomization(operation: string, input: Pick<UserPromptCustomization, "mode" | "content">) {
    return request<{ customization: UserPromptCustomization }>(api.patch(`/settings/prompt-templates/${encodeURIComponent(operation)}`, input));
}

export function resetUserPromptCustomization(operation: string) {
    return request<{ ok: boolean }>(api.delete(`/settings/prompt-templates/${encodeURIComponent(operation)}`));
}











































function oauthAttributionQuery(next: string) {
    const attributes = collectSignupAttribution();
    const params = new URLSearchParams({ next });
    if (attributes.referrer) params.set("signup_referrer", attributes.referrer);
    if (attributes.entry) params.set("signup_entry", attributes.entry);
    if (attributes.utm) params.set("signup_utm", attributes.utm);
    return params.toString();
}
