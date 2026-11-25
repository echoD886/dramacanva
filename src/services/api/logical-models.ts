import { apiClient, request, ApiError } from "@/services/api/request";
import { readLowFrequency } from "@/services/low-frequency-cache";
import { QuoteRequestPool } from "@/lib/quote-request-pool";
import { getActiveUserScope } from "@/lib/user-scope";
import { getActiveTeamContext } from "@/lib/team-context";

export type InputConstraint = { min: number; max: number };
export type OptionConstraint = { values?: unknown[]; min?: number; max?: number; step?: number };
export type CapabilitySpec = {
    imageSizeLimits?: { maxEdge?: number; multiple?: number; minPixels?: number; maxPixels?: number; maxAspectRatio?: number };
    parameters?: import("@/lib/model-capabilities").ModelCapabilityConfig["parameters"];
    maxDurationByResolution?: Record<string, number>;
    maxImagesByResolution?: Record<string, number>;
    version: 1;
    capability: "text" | "image" | "video" | "audio";
    operations?: string[];
    inputs?: Record<string, InputConstraint>;
    options?: Record<string, OptionConstraint>;
};

export type ModelRequestIntent = {
    capability: CapabilitySpec["capability"];
    operation?: string;
    inputs?: Record<string, number>;
    options?: Record<string, unknown>;
};

export type ModelAvailability = {
    rate24h: number | null;
    sampleCount24h: number;
    trend7d: { day: string; rate: number | null; sampleCount: number; dataState: "ready" | "insufficient" | "no_data" }[];
    dataState: "ready" | "insufficient" | "no_data";
    computedAt: string;
    dataThrough?: string;
};

export type PublicLogicalModel = {
    starterPreset?: { options: Record<string, unknown>; quote: LogicalModelQuote; storyboardQuote?: LogicalModelQuote };
    availability?: ModelAvailability;
    id: string;
    code: string;
    name: string;
    icon?: string;
    description: string;
    capability: CapabilitySpec["capability"];
    sortOrder: number;
    pricePolicy: "channel" | "unified";
    billingMode: "fixed_request" | "per_second" | "token";
    unitPriceMicrocredits: number;
    inputPriceMicrocredits: number;
    outputPriceMicrocredits: number;
    cachedPriceMicrocredits: number;
    priceTiers: PublicLogicalModelPriceTier[];
    legacyModelIds: string[];
    capabilitySpec: CapabilitySpec;
    capabilityProfiles: CapabilitySpec[];
    defaultOptions: Record<string, unknown>;
    available: boolean;
};

export type PublicLogicalModelPriceTier = {
    selector: Record<string, string>;
    resolution: string;
    videoSeconds: number;
    billingMode: "fixed_request" | "per_second" | "token";
    unitPriceMicrocredits: number;
    inputTokenPriceMicrocredits: number;
    outputTokenPriceMicrocredits: number;
    cachedTokenPriceMicrocredits: number;
    /** 计费乘数（×10000 基准，10000 = ×1）；与后端实扣公式一致 */
    multiplierBasisPoints?: number;
};

export type AdminLogicalRoute = {
    attemptOrder?: number;
    costKnown?: boolean;
    costMicrosUsd?: number;
    id: string;
    channelModelId: string;
    channelId: string;
    channelModelKey: string;
    channelModelName: string;
    enabled: boolean;
    priority: number;
    weight: number;
    available: boolean;
    capabilitySpec: CapabilitySpec;
};

export type AdminLogicalModel = PublicLogicalModel & {
    enabled: boolean;
    activeRevisionId: string;
    revisionVersion: number;
    configurationError?: string;
    availabilityError?: string;
    routes: AdminLogicalRoute[];
};

/**
 * Keep admin model responses usable when a server is upgraded before its
 * existing process or historical response shape has caught up with the
 * current contract. Collection fields must always be arrays for the page.
 */
export function normalizeAdminLogicalModel(model: AdminLogicalModel): AdminLogicalModel {
    return {
        ...model,
        priceTiers: Array.isArray(model.priceTiers) ? model.priceTiers : [],
        legacyModelIds: Array.isArray(model.legacyModelIds) ? model.legacyModelIds : [],
        capabilityProfiles: Array.isArray(model.capabilityProfiles) ? model.capabilityProfiles : [],
        defaultOptions: model.defaultOptions && typeof model.defaultOptions === "object" ? model.defaultOptions : {},
        routes: Array.isArray(model.routes) ? model.routes : [],
    };
}

export type LogicalModelMutation = {
    code: string;
    name: string;
    icon: string;
    description: string;
    capability: CapabilitySpec["capability"];
    enabled: boolean;
    sortOrder: number;
    pricePolicy: PublicLogicalModel["pricePolicy"];
    billingMode: PublicLogicalModel["billingMode"];
    unitPriceMicrocredits: number;
    inputPriceMicrocredits: number;
    outputPriceMicrocredits: number;
    cachedPriceMicrocredits: number;
    legacyModelIds?: string[];
    capabilitySpec: CapabilitySpec;
    defaultOptions: Record<string, unknown>;
    routes: Array<{ channelModelId: string; enabled: boolean; priority: number; weight: number }>;
};

export type RouteSimulationResult = {
    productMatch: { matched: boolean; reasons?: string[] };
    candidates: Array<{
        routeId: string;
        channelModelId: string;
        channelModelKey: string;
        channelModelName: string;
        priority: number;
        weight: number;
        enabled: boolean;
        matched: boolean;
        blocked: boolean;
        inPool: boolean;
        attemptOrder: number;
        costKnown: boolean;
        costMicrosUsd: number;
        reasons?: string[];
    }>;
};

export type LogicalModelQuote = {
    logicalModelId: string;
    billingMode: PublicLogicalModel["billingMode"];
    quantity: number;
    amountMicrocredits: number;
    estimated: boolean;
};

/** The public catalog only quotes a published logical model. */
export type ModelCatalogQuote = LogicalModelQuote;

export type PublicCustomerPrice = { modelCode: string; modelName: string; capability: string; intent: ModelRequestIntent; quote: LogicalModelQuote };
export function getPublicCustomerPrices() {
    return request<{ prices: PublicCustomerPrice[] }>(apiClient.get("/public/model-prices"));
}

export type ModelCatalogQuoteRequest = {
    modelId: string;
    intent: ModelRequestIntent;
};

export type ModelCatalogResponse = {
    source: "frontend";
    models: PublicLogicalModel[];
};

// 统一模型目录接口：只返回面向创作端的逻辑模型，不泄露供应商路由。
export function getModelCatalog() {
    return readLowFrequency<ModelCatalogResponse>("/model-catalog");
}

// 旧接口，保持兼容
export function listLogicalModels() {
    return request<{ models: PublicLogicalModel[] }>(apiClient.get("/models"));
}

export function quoteLogicalModel(id: string, intent: ModelRequestIntent, signal?: AbortSignal) {
    return request<{ quote: LogicalModelQuote }>(apiClient.post(`/models/${encodeURIComponent(id)}/quote`, intent, { signal }));
}

const quotePool = new QuoteRequestPool<{ quote: ModelCatalogQuote }>();
let quoteRevision = 0;
if (typeof window !== "undefined")
    window.addEventListener("generation-price-changed", () => {
        quoteRevision++;
    });

export function quoteModelCatalog(input: ModelCatalogQuoteRequest, signal?: AbortSignal) {
    const scope = getActiveUserScope();
    const team = getActiveTeamContext();
    const key = JSON.stringify([scope, team, quoteRevision, input]);
    return quotePool
        .get(
            key,
            () => request<{ quote: ModelCatalogQuote }>(apiClient.post("/model-catalog/quote", input, { timeout: 15_000 })),
            (error) => error instanceof ApiError && error.retryable,
            signal,
        )
        .then((value) => {
            if (scope !== getActiveUserScope() || team !== getActiveTeamContext()) throw new DOMException("Account changed", "AbortError");
            return value;
        });
}










