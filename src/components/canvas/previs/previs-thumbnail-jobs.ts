import { directorToWorldEngine } from "@/lib/canvas/director/director-world-engine";
import { PREVIS_AUTO_ASPECT_FALLBACK } from "@/lib/canvas/previs/previs-optics";
import { DIRECTOR_THUMBNAIL_LONG_EDGE } from "@/lib/canvas/director/director-thumbnail";
import { resolveMediaUrl } from "@/services/file-storage";
import type { DirectorScene } from "@/types/director";
import type { PrevisReferenceRequest, PrevisThumbnailRequest } from "./previs-thumbnail.worker";
import { currentLocaleText as t } from "@/i18n/current-locale-text";
import type { PrevisScene } from "@/types/previs";

let worker: Worker | undefined;
let queue = Promise.resolve();
let releaseTimer: ReturnType<typeof setTimeout>;

function releaseWorker() {
    worker?.terminate();
    worker = undefined;
}

function renderStill(input: PrevisThumbnailRequest) {
    const renderer = (worker ??= new Worker(new URL("./previs-thumbnail.worker.tsx", import.meta.url), { type: "module" }));
    return new Promise<Blob | undefined>((resolve) => {
        const finish = (blob?: Blob) => {
            clearTimeout(timeout);
            renderer.onmessage = null;
            renderer.onerror = null;
            if (!blob) releaseWorker();
            resolve(blob);
        };
        const timeout = setTimeout(finish, 20000);
        renderer.onmessage = ({ data }: MessageEvent<{ blob?: Blob }>) => finish(data.blob);
        renderer.onerror = () => finish();
        renderer.postMessage(input);
    });
}

async function resolveWorldMedia(world: PrevisScene) {
    const objects = await Promise.all(
        world.objects.map(async (object) => {
            if (!object.visible || !object.storageKey || !["model", "actor", "billboard"].includes(object.kind)) return object;
            return { ...object, url: await resolveMediaUrl(object.storageKey, object.url) };
        }),
    );
    const environment = world.environment;
    return { ...world, objects, environment: environment?.storageKey ? { ...environment, url: await resolveMediaUrl(environment.storageKey, environment.url) } : environment };
}

export async function renderWorldEngineReference(scene: PrevisScene, longEdge: number, reference: PrevisReferenceRequest["reference"], signal?: AbortSignal) {
    const world = await resolveWorldMedia(scene);
    signal?.throwIfAborted();
    return new Promise<Blob[]>((resolve, reject) => {
        const renderer = new Worker(new URL("./previs-thumbnail.worker.tsx", import.meta.url), { type: "module" });
        const finish = (blobs?: Blob[]) => {
            renderer.terminate();
            signal?.removeEventListener("abort", abort);
            if (blobs?.length) resolve(blobs);
            else reject(signal?.aborted ? signal.reason : new Error(t("previs.export.notReady")));
        };
        const abort = () => finish();
        renderer.onmessage = ({ data }: MessageEvent<{ blobs?: Blob[] }>) => finish(data.blobs);
        renderer.onerror = abort;
        signal?.addEventListener("abort", abort, { once: true });
        renderer.postMessage({ scene: world, longEdge, viewportAspect: PREVIS_AUTO_ASPECT_FALLBACK, reference } satisfies PrevisReferenceRequest);
    });
}

export function queuePrevisThumbnail(scene: DirectorScene, shotId: string, isCurrent: () => boolean) {
    const run = async () => {
        if (typeof OffscreenCanvas === "undefined" || !isCurrent()) return;
        clearTimeout(releaseTimer);
        try {
            const world = await resolveWorldMedia(directorToWorldEngine({ ...scene, activeShotId: shotId }));
            if (!isCurrent()) return;
            return await renderStill({ scene: world, longEdge: DIRECTOR_THUMBNAIL_LONG_EDGE, viewportAspect: PREVIS_AUTO_ASPECT_FALLBACK });
        } finally {
            releaseTimer = setTimeout(releaseWorker, 5000);
        }
    };
    const pending = queue.then(run);
    queue = pending.then(
        () => undefined,
        () => undefined,
    );
    return pending;
}
