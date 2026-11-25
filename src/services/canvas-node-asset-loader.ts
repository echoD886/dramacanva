import { currentLocaleText } from "@/i18n/current-locale-text";
import { canvasNodeResourceIdentity, findCanvasNodeAsset, requiresMaterializedCanvasAsset } from "@/lib/canvas/canvas-node-asset";
import { generationAssetId } from "@/lib/generation-asset-id";
import type { Asset } from "@/stores/use-asset-store";
import type { CanvasNodeData } from "@/types/canvas";

type AssetLookup = { node: CanvasNodeData; canvasId: string; taskId?: string; signal?: AbortSignal };
type AssetLoader = {
    readAssets: () => Asset[];
    loadAssets: (ids: string[], signal: AbortSignal) => Promise<void>;
    refreshAssets: (signal: AbortSignal) => Promise<void>;
};

function checkAbort(signal?: AbortSignal) {
    if (signal?.aborted) throw new DOMException("The operation was aborted", "AbortError");
}

function wait(delay: number, signal?: AbortSignal) {
    return new Promise<void>((resolve, reject) => {
        checkAbort(signal);
        const abort = () => {
            clearTimeout(timer);
            reject(new DOMException("The operation was aborted", "AbortError"));
        };
        const timer = setTimeout(() => {
            signal?.removeEventListener("abort", abort);
            resolve();
        }, delay);
        signal?.addEventListener("abort", abort, { once: true });
    });
}

// Three reads, including I/O deadlines, take at most 5.25 seconds. A timed-out
// queued sync must check its signal before publishing into the current store.
async function readWithDeadline(operation: (signal: AbortSignal) => Promise<void>, signal?: AbortSignal) {
    checkAbort(signal);
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(abort, 1500);
    let rejectOnAbort!: () => void;
    try {
        await Promise.race([
            Promise.resolve().then(() => operation(controller.signal)),
            new Promise<never>((_, reject) => {
                rejectOnAbort = () => reject(new DOMException("The operation was aborted", "AbortError"));
                controller.signal.addEventListener("abort", rejectOnAbort, { once: true });
            }),
        ]);
        checkAbort(signal);
    } finally {
        clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
        controller.signal.removeEventListener("abort", rejectOnAbort);
    }
}

export async function resolveCanvasNodeAsset(options: AssetLookup, loader: AssetLoader): Promise<Asset | undefined> {
    const find = () => findCanvasNodeAsset(loader.readAssets(), options.node, options.canvasId, options.taskId);
    checkAbort(options.signal);
    const existing = find();
    if (existing) return existing;
    const required = requiresMaterializedCanvasAsset(options.node, options.taskId);
    const remoteResource = canvasNodeResourceIdentity(options.node)?.startsWith("resource:");
    if (!remoteResource && !options.node.metadata?.assetId) return undefined;
    const taskId = options.taskId || options.node.metadata?.taskId;
    const outputIndex = options.node.metadata?.imageLayer?.outputIndex ?? 0;
    const id = options.node.metadata?.assetId || (required && taskId ? await generationAssetId(`materialize:${taskId}:${outputIndex}`) : undefined);
    let refreshed = false;
    for (let attempt = 0; attempt < 3; attempt += 1) {
        checkAbort(options.signal);
        try {
            await readWithDeadline(async (signal) => {
                if (id) {
                    try {
                        await loader.loadAssets([id], signal);
                    } catch {
                        checkAbort(signal);
                    }
                }
                if (!find()) {
                    // The resource may be a nonzero task output or an Agent patch
                    // without assetId/taskId. Refresh assets without replacing canvases.
                    await loader.refreshAssets(signal);
                    refreshed = true;
                }
            }, options.signal);
        } catch {
            checkAbort(options.signal);
        }
        checkAbort(options.signal);
        const asset = find();
        if (asset) return asset;
        if (!required && refreshed) return undefined;
        if (attempt < 2) await wait(250 * (attempt + 1), options.signal);
    }
    throw new Error(currentLocaleText("creationRuntime.assetWriteFailed"));
}
