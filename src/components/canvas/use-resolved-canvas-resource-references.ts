import { useEffect, useMemo, useState } from "react";
import { currentLocaleText } from "@/i18n/current-locale-text";

import type { CanvasResourceReference } from "@/lib/canvas/canvas-resource-references";
import { loadCanvasDrawingPreview } from "@/lib/canvas/canvas-drawing-storage";
import { resolveImageUrl } from "@/services/image-storage";
import { refreshResourceObjectUrl } from "@/services/resource-blob-cache";
import { resourceIdFromStorageKey } from "@/services/api/resources";
import { getActiveUserScope } from "@/lib/user-scope";
import { getAuthIdentityGeneration } from "@/services/api/auth";

type ResolvedPreview = {
    identity: string;
    url: string;
};

type CachedPreview = { promise: Promise<string>; expiresAt: number; url?: string };
const previewPromiseCache = new Map<string, CachedPreview>();
const forcedRefreshAt = new Map<string, number>();
const pendingForceRefresh = new Set<string>();
const previewFailureListeners = new Set<() => void>();
let cacheScope = "";
let nextPruneAt = 0;

export function reportResourcePreviewFailure(url: string) {
    if (!url) return;
    let refreshed = false;
    const now = Date.now();
    previewPromiseCache.forEach((entry, identity) => {
        if (entry.url !== url) return;
        if (now - (forcedRefreshAt.get(identity) ?? -Infinity) < 30_000) return;
        previewPromiseCache.delete(identity);
        forcedRefreshAt.set(identity, now);
        pendingForceRefresh.add(identity);
        refreshed = true;
    });
    if (refreshed) previewFailureListeners.forEach((listener) => listener());
}

export function useResolvedCanvasResourceReferences(references: CanvasResourceReference[], options?: { projectId?: string }) {
    const projectId = options?.projectId;
    const [refreshEpoch, setRefreshEpoch] = useState(0);
    useEffect(() => {
        const listener = () => setRefreshEpoch((value) => value + 1);
        previewFailureListeners.add(listener);
        return () => { previewFailureListeners.delete(listener); };
    }, []);
    const requests = useMemo(
        () => references.flatMap((reference) => {
            const identity = previewIdentity(reference, projectId);
            return identity ? [{ reference, identity }] : [];
        }),
        [projectId, references],
    );
    const [resolvedById, setResolvedById] = useState<Record<string, ResolvedPreview>>({});

    useEffect(() => {
        if (!requests.length) return;
        let cancelled = false;
        void Promise.all(
            requests.map(async ({ reference, identity }) => ({
                id: reference.id,
                identity,
                url: await resolveReferencePreview(reference, identity, projectId),
            })),
        ).then((resolved) => {
            if (cancelled) return;
            setResolvedById((current) => {
                let changed = false;
                const next = { ...current };
                resolved.forEach(({ id, identity, url }) => {
                    if (!url || (current[id]?.identity === identity && current[id]?.url === url)) return;
                    next[id] = { identity, url };
                    changed = true;
                });
                return changed ? next : current;
            });
        });
        return () => {
            cancelled = true;
        };
    }, [projectId, requests, refreshEpoch]);

    return useMemo(
        () => references.map((reference) => {
            const identity = previewIdentity(reference, projectId);
            const resolved = identity ? resolvedById[reference.id] : undefined;
            return resolved?.identity === identity && resolved.url !== reference.previewUrl ? { ...reference, previewUrl: resolved.url } : reference;
        }),
        [projectId, references, resolvedById],
    );
}

function previewIdentity(reference: CanvasResourceReference, projectId?: string) {
    const scope = `${getActiveUserScope()}:${getAuthIdentityGeneration()}`;
    if (scope !== cacheScope) {
        previewPromiseCache.clear();
        forcedRefreshAt.clear();
        pendingForceRefresh.clear();
        cacheScope = scope;
    }
    // 只有当 drawingId 和 projectId 同时存在时才返回绘图身份,避免不完整的缓存键导致运行时错误
    if (reference.drawingId) {
        if (!projectId) return "";
        return `${scope}:drawing:${projectId}:${reference.drawingId}:${reference.drawingRevision || 0}`;
    }
    const storageKey = reference.kind === "video" ? reference.previewStorageKey : reference.storageKey;
    if (!storageKey || !["image", "video", "character"].includes(reference.kind)) return "";
    return `${scope}:${reference.kind}:${storageKey}`;
}

function resolveReferencePreview(reference: CanvasResourceReference, identity: string, projectId?: string) {
    const now = Date.now();
    if (now >= nextPruneAt) {
        nextPruneAt = now + 60_000;
        for (const [key, entry] of previewPromiseCache) if (entry.expiresAt <= now) previewPromiseCache.delete(key);
        for (const [key, time] of forcedRefreshAt) if (now - time >= 30_000) { forcedRefreshAt.delete(key); pendingForceRefresh.delete(key); }
    }
    const cached = previewPromiseCache.get(identity);
    if (cached && cached.expiresAt > Date.now()) return cached.promise;
    let resolving: Promise<string>;
    if (reference.drawingId && projectId) {
        resolving = loadCanvasDrawingPreview(projectId, reference.drawingId).then((preview) => preview ? blobToDataUrl(preview) : "");
    } else {
        const storageKey = reference.kind === "video" ? reference.previewStorageKey : reference.storageKey;
        resolving = pendingForceRefresh.delete(identity) && resourceIdFromStorageKey(storageKey)
            ? refreshResourceObjectUrl(storageKey!)
            : resolveImageUrl(storageKey, "", { cacheMiss: true });
    }
    const entry: CachedPreview = { promise: Promise.resolve(""), expiresAt: Date.now() + 60_000 };
    entry.promise = resolving.catch(() => "")
        .then((url) => {
            if (!url) {
                if (previewPromiseCache.get(identity) === entry) previewPromiseCache.delete(identity);
                return reference.previewUrl || "";
            }
            entry.url = url;
            return url;
        });
    previewPromiseCache.set(identity, entry);
    return entry.promise;
}

function blobToDataUrl(blob: Blob) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error || new Error(currentLocaleText("canvasExtra.drawing.previewReadFailed")));
        reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
        reader.readAsDataURL(blob);
    });
}
