import { apiClient, request, ApiError } from "@/services/api/request";
import type { AIVideoTemplateDetail, AIVideoTemplateGenerationInput, AIVideoTemplatePageResponse, AIVideoTemplateQuote, TaskPriceConfirmation } from "@/types/ai-video-template";
import { queryGenerationTask, type GenerationTask } from "@/services/api/task-center";
import { GenerationTaskFailure } from "@/lib/generation-failure";

export type { TaskPriceConfirmation };

export type ListTemplatesParams = {
    period?: "all" | "today" | "week" | "month";
    category?: string;
    sort?: "hot" | "new" | "plays";
    q?: string;
    cursor?: string;
    limit?: number;
    locale?: string;
};

// The backend-rendered directory page embeds its two default list responses (see embedInitialTemplatePages),
// keyed by the sorted query string. Each is used once, for the identical first request; later calls hit the API.
let initialPages: Map<string, AIVideoTemplatePageResponse> | undefined;
let initialDocument: Document | undefined;
export function takeInitialTemplatePage(params: URLSearchParams, doc: Document | undefined = typeof document === "undefined" ? undefined : document) {
    if (!initialPages || initialDocument !== doc) {
        initialPages = new Map();
        initialDocument = doc;
        try {
            const raw = doc?.getElementById("aivt-initial")?.textContent;
            if (raw) for (const [key, page] of Object.entries(JSON.parse(raw) as Record<string, AIVideoTemplatePageResponse>)) initialPages.set(key, page);
        } catch {
            /* Malformed seed: fall back to the API. */
        }
    }
    const sorted = new URLSearchParams([...params.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
    const key = sorted.toString();
    const page = initialPages.get(key);
    initialPages.delete(key);
    return page;
}

// Detail cache for snappy route switches
const detailCache = new Map<string, AIVideoTemplateDetail>();
const detailRequests = new Map<string, Promise<AIVideoTemplateDetail>>();

export async function listAIVideoTemplates(params: ListTemplatesParams = {}, signal?: AbortSignal): Promise<AIVideoTemplatePageResponse> {
    const limit = params.limit ?? 20;
    const queryParams = new URLSearchParams();
    if (params.category && params.category !== "all") queryParams.set("category", params.category);
    if (params.sort) queryParams.set("sort", params.sort);
    if (params.period) queryParams.set("period", params.period);
    if (params.q) queryParams.set("q", params.q);
    if (params.cursor) queryParams.set("cursor", params.cursor);
    if (limit) queryParams.set("limit", String(limit));
    if (params.locale) queryParams.set("locale", params.locale);

    const seeded = takeInitialTemplatePage(queryParams);
    if (seeded) return seeded;
    const queryString = queryParams.toString();
    const url = `/ai-video-templates${queryString ? `?${queryString}` : ""}`;
    // Directory copy (title/intro/FAQ) comes only from the reviewed backend import; absent means render nothing.
    return request<AIVideoTemplatePageResponse>(apiClient.get(url, { signal }));
}

export async function getAIVideoTemplate(slug: string, locale: string = "en", signal?: AbortSignal): Promise<AIVideoTemplateDetail> {
    const cacheKey = `${slug}:${locale}`;
    if (detailCache.has(cacheKey)) {
        return detailCache.get(cacheKey)!;
    }
    // Hover prefetch, the page and the head sync share one request; a caller's abort only stops its own wait.
    let pending = detailRequests.get(cacheKey);
    if (!pending) {
        pending = request<AIVideoTemplateDetail>(apiClient.get(`/ai-video-templates/${encodeURIComponent(slug)}`, { params: { locale } }))
            .then((res) => {
                if (res && res.slug) detailCache.set(cacheKey, res);
                return res;
            })
            .finally(() => detailRequests.delete(cacheKey));
        detailRequests.set(cacheKey, pending);
    }
    if (!signal) return pending;
    signal.throwIfAborted();
    return new Promise<AIVideoTemplateDetail>((resolve, reject) => {
        const abort = () => reject(signal.reason);
        signal.addEventListener("abort", abort, { once: true });
        pending.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
    });
}

export async function getAIVideoTemplateQuote(slug: string, params: { clipId: string; resolution: "480p" | "720p"; model?: string }, signal?: AbortSignal): Promise<AIVideoTemplateQuote> {
    const raw = await request<AIVideoTemplateQuote>(
        apiClient.get(`/ai-video-templates/${encodeURIComponent(slug)}/quote`, {
            params,
            signal,
        }),
    );

    // Prices are only ever shown from the backend quote; never derive or invent a number here.
    if (typeof raw.amountMicrocredits !== "number" || raw.amountMicrocredits <= 0) {
        throw new Error("quote unavailable");
    }
    const durationMs = typeof raw.durationMs === "number" && raw.durationMs > 0 ? raw.durationMs : undefined;
    const durationSeconds = raw.seconds ?? (durationMs ? durationMs / 1000 : 0);
    return {
        ...raw,
        clipId: params.clipId,
        resolution: raw.resolution === "480p" || raw.resolution === "720p" ? raw.resolution : params.resolution,
        durationSeconds,
        creditsPerSecond: raw.pricePerSecondCredits ?? (raw.pricePerSecondMicrocredits ? raw.pricePerSecondMicrocredits / 1_000_000 : 0),
        totalCredits: raw.amountCredits ?? raw.amountMicrocredits / 1_000_000,
        durationMs,
        pricePerSecondMicrocredits: raw.pricePerSecondMicrocredits,
        amountMicrocredits: raw.amountMicrocredits,
    };
}

/**
 * Validates and transforms UI input into the exact backend request body.
 * Asserts that images only contain resource IDs and NEVER data URLs.
 * Maps mode to "A" | "B" and clamps extra instruction to <= 200 runes.
 */
export function buildAIVideoTemplateGenerationBody(input: AIVideoTemplateGenerationInput): {
    replacement?: string;
    model?: string;
    clipId: string;
    images: string[];
    mode: "A" | "B";
    optionIds: string[];
    scene?: string;
    extra?: string;
    resolution: "480p" | "720p";
    locale?: string;
    priceConfirmation?: TaskPriceConfirmation;
} {
    if (!input.clipId) throw new Error("clipId is required");
    if (!Array.isArray(input.images) || input.images.length === 0) {
        throw new Error("at least 1 photo is required");
    }

    // Critical invariant: NEVER send data URLs or blob URLs to backend!
    for (const img of input.images) {
        if (!img || typeof img !== "string") {
            throw new Error("Invalid image identifier");
        }
        if (img.startsWith("data:") || img.startsWith("blob:")) {
            throw new Error("data: and blob: URLs are not permitted; upload photo to resources first");
        }
    }

    const mode: "A" | "B" = input.mode === "scene_match" || input.mode === "B" ? "B" : "A";
    const extra = input.extra ? Array.from(input.extra.trim()).slice(0, 200).join("") : undefined;
    const scene = input.scene ? input.scene.trim() : undefined;
    const rawOptions = Array.isArray(input.optionIds) ? input.optionIds : [];
    const optionIds = mode === "B" ? rawOptions.filter((id) => id !== "keep-background-light") : rawOptions;

    return {
        clipId: input.clipId,
        ...(input.replacement ? { replacement: input.replacement } : {}),
        ...(input.model ? { model: input.model } : {}),
        images: input.images,
        mode,
        optionIds,
        ...(scene ? { scene } : {}),
        ...(extra ? { extra } : {}),
        resolution: input.resolution === "480p" ? "480p" : "720p",
        ...(input.locale ? { locale: input.locale } : {}),
        ...(input.priceConfirmation ? { priceConfirmation: input.priceConfirmation } : {}),
    };
}

/**
 * Calls POST /ai-video-templates/:slug/generations/quote to obtain server price confirmation.
 */
export async function quoteAIVideoTemplateGeneration(slug: string, input: AIVideoTemplateGenerationInput, signal?: AbortSignal): Promise<TaskPriceConfirmation> {
    const body = buildAIVideoTemplateGenerationBody(input);
    return await request<TaskPriceConfirmation>(apiClient.post(`/ai-video-templates/${encodeURIComponent(slug)}/generations/quote`, body, { signal }));
}

/**
 * Creates confirmed generation task via POST /ai-video-templates/:slug/generations.
 * Returns the created GenerationTask (PublicTaskOutput).
 */
export async function createAIVideoTemplateGeneration(slug: string, input: AIVideoTemplateGenerationInput, signal?: AbortSignal): Promise<GenerationTask> {
    const body = buildAIVideoTemplateGenerationBody(input);
    return await request<GenerationTask>(apiClient.post(`/ai-video-templates/${encodeURIComponent(slug)}/generations`, body, { signal }));
}

export async function createAIVideoTemplateCheckout(slug: string, input: AIVideoTemplateGenerationInput, signal?: AbortSignal): Promise<{ checkoutUrl: string; taskId?: string }> {
    const body = buildAIVideoTemplateGenerationBody(input);
    return request<{ checkoutUrl: string; taskId?: string }>(apiClient.post(`/ai-video-templates/${encodeURIComponent(slug)}/checkout`, body, { signal }));
}

/**
 * Helper extracting the result video URL from a completed GenerationTask.
 * Checks resultJson first, then falls back to previewUrl.
 */
export function extractTaskVideoUrl(task: GenerationTask): string | null {
    if (task.resultJson) {
        try {
            const parsed = JSON.parse(task.resultJson) as {
                video?: { dataUrl?: string; url?: string } | string;
            };
            if (parsed && typeof parsed === "object") {
                if (typeof parsed.video === "string") return parsed.video;
                if (parsed.video?.dataUrl) return parsed.video.dataUrl;
                if (parsed.video?.url) return parsed.video.url;
            }
        } catch {
            // ignore JSON parse errors
        }
    }
    if (task.previewUrl && (task.previewKind === "video" || !task.previewKind)) {
        return task.previewUrl;
    }
    return null;
}

/**
 * Polls GenerationTask until it reaches terminal state (succeeded / failed / cancelled).
 * Aborts cleanly on unmount if signal is triggered.
 */
export async function pollGenerationTaskUntilDone(
    taskId: string,
    options?: {
        signal?: AbortSignal;
        intervalMs?: number;
        waitForPaidTask?: boolean;
        onProgress?: (progress: number, task: GenerationTask) => void;
    },
): Promise<GenerationTask> {
    const intervalMs = options?.intervalMs ?? 1500;
    const creationDeadline = Date.now() + 60_000;
    while (!options?.signal?.aborted) {
        let task: GenerationTask;
        try {
            task = await queryGenerationTask(taskId, { signal: options?.signal });
        } catch (error) {
            // Provider return can arrive before the paid webhook creates its task.
            if (options?.waitForPaidTask && Date.now() < creationDeadline && error instanceof ApiError && error.status === 404) {
                await new Promise((resolve) => setTimeout(resolve, intervalMs));
                continue;
            }
            throw error;
        }
        options?.onProgress?.(task.progress ?? 0, task);
        if (task.status === "succeeded") {
            if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("wallet:updated", { detail: { reason: "usage" } }));
            }
            return task;
        }
        if (task.status === "failed" || task.status === "cancelled") {
            if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("wallet:updated", { detail: { reason: "usage" } }));
            }
            throw task.status === "failed" ? new GenerationTaskFailure(task) : new Error("Task cancelled");
        }
        await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(resolve, intervalMs);
            options?.signal?.addEventListener(
                "abort",
                () => {
                    clearTimeout(timer);
                    reject(new DOMException("Aborted", "AbortError"));
                },
                { once: true },
            );
        });
    }
    throw new DOMException("Aborted", "AbortError");
}

/**
 * Backwards-compatible generation function for tests & simple callers.
 */
export async function generateAIVideoTemplate(slug: string, input: AIVideoTemplateGenerationInput, signal?: AbortSignal): Promise<{ taskId: string; videoUrl: string }> {
    const raw = await request<{ taskId?: string; videoUrl?: string; id?: string } | GenerationTask>(apiClient.post(`/ai-video-templates/${encodeURIComponent(slug)}/generations`, input, { signal }));
    const task = raw as GenerationTask;
    const taskId = (raw as { taskId?: string }).taskId || task.id || "";
    const videoUrl = (raw as { videoUrl?: string }).videoUrl || extractTaskVideoUrl(task) || "";
    return { taskId, videoUrl };
}

/** Preload template detail & first clip cover image into browser cache */
export function prefetchAIVideoTemplate(slug: string, locale: string = "en"): void {
    void getAIVideoTemplate(slug, locale)
        .then((detail) => {
            const cover = detail.clips[0]?.coverUrl || detail.coverUrl;
            if (cover && typeof window !== "undefined") {
                const img = new Image();
                img.src = cover;
            }
        })
        .catch(() => {
            // Ignore prefetch failures
        });
}
