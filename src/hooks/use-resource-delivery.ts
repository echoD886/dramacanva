import { useEffect, useState } from "react";
import { getResource, getResourceBlob, refreshResource, resourceProxyFileUrl, resourceIdFromStorageKey, type RemoteResource, type ResourceImageVariant } from "@/services/api/resources";
import { cacheResourceObjectUrl, isWalletUsageEvent } from "@/services/resource-blob-cache";
import { useUserStore } from "@/stores/use-user-store";
import { captureVideoPoster } from "@/lib/video-poster";

export function resourceDeliveryKey(value: string) {
    if (resourceIdFromStorageKey(value)) return value;
    const match = value.match(/\/resources\/([^/?]+)\/file(?:[/?]|$)/);
    return match ? `resource:${decodeURIComponent(match[1])}` : "";
}

// Share only ordinary, already-authorized poster bytes across the cover and editor.
const videoPosters = new Map<string, Promise<Blob | undefined>>();
function loadPoster(identity: string, url: string) {
    const existing = videoPosters.get(identity);
    if (existing) return existing;
    const pending = captureVideoPoster(url, { maxWidth: 400, sampleTime: 0.5 }).then((result) => result.poster);
    videoPosters.set(identity, pending);
    if (videoPosters.size > 32) videoPosters.delete(videoPosters.keys().next().value!);
    const forget = () => {
        if (videoPosters.get(identity) === pending) videoPosters.delete(identity);
    };
    void pending.then((poster) => {
        if (!poster) forget();
    }, forget);
    return pending;
}

/** Keeps mounted delivery views in sync with derivation and payment changes. */
export function useResourceDelivery(value: string, enabled = true, variant: ResourceImageVariant = "original", ephemeral = false, stream = false) {
    const key = resourceDeliveryKey(value);
    const userId = useUserStore((state) => state.user?.id);
    const identity = `${userId || ""}:${key}:${variant}:${ephemeral}:${stream}`;
    const [state, setState] = useState<{ key: string; url: string; resource?: RemoteResource; loading: boolean }>({ key: "", url: "", loading: false });
    useEffect(() => {
        if (!key || !enabled) return;
        let active = true;
        let timer: ReturnType<typeof setTimeout>;
        let run = 0;
        let ownedUrl = "";
        let posterUrl = "";
        let version: string | undefined;
        let displayed = false;
        const release = () => {
            if (ownedUrl) URL.revokeObjectURL(ownedUrl);
            if (posterUrl) URL.revokeObjectURL(posterUrl);
            ownedUrl = "";
            posterUrl = "";
        };
        const refresh = async (silent = false, cached = false) => {
            const current = ++run;
            let nextOwnedUrl = "";
            let nextPosterUrl = "";
            clearTimeout(timer);
            if (!silent) {
                release();
                version = undefined;
                setState({ key: identity, url: "", loading: true });
            }
            try {
                const resource = await (cached ? getResource : refreshResource)(resourceIdFromStorageKey(key)!);
                if (!active || run !== current) return;
                if (resource.watermarked && resource.watermarkState === "failed") {
                    release();
                    version = undefined;
                    displayed = false;
                    setState({ key: identity, url: "", resource, loading: false });
                    return;
                }
                if (resource.watermarked && resource.watermarkState !== "ready") {
                    release();
                    version = undefined;
                    displayed = false;
                    setState({ key: identity, url: "", resource, loading: true });
                    timer = setTimeout(() => {
                        void refresh(true);
                    }, 1500);
                    return;
                }
                if (!displayed || version !== resource.deliveryVersion) {
                    if (!displayed) setState({ key: identity, url: "", resource, loading: true });
                    const videoPoster = variant === "thumbnail" && resource.kind === "video";
                    const ranged = !ephemeral && !resource.privateCreative && (videoPoster || stream);
                    const blob = ephemeral ? await getResourceBlob(key, videoPoster ? "original" : variant) : null;
                    if (!active || run !== current) return;
                    const sourceUrl = ranged
                        ? resourceProxyFileUrl(resource.id) + "&delivery=" + encodeURIComponent(resource.deliveryVersion || "")
                        : ephemeral
                          ? blob
                              ? URL.createObjectURL(blob)
                              : ""
                          : await cacheResourceObjectUrl(key, videoPoster ? "original" : variant);
                    if (ephemeral) nextOwnedUrl = sourceUrl;
                    let url = sourceUrl;
                    if (videoPoster && sourceUrl) {
                        const poster = ranged && resource.deliveryVersion ? await loadPoster(identity + ":" + resource.deliveryVersion, sourceUrl) : (await captureVideoPoster(sourceUrl, { maxWidth: 400, sampleTime: 0.5 })).poster;
                        if (!active || run !== current) return;
                        nextPosterUrl = poster ? URL.createObjectURL(poster) : "";
                        url = nextPosterUrl;
                    }
                    if (active && run === current) {
                        // Swap only after the replacement is ready. A background
                        // metadata check must never blank the currently playing media.
                        release();
                        ownedUrl = nextOwnedUrl;
                        posterUrl = nextPosterUrl;
                        nextOwnedUrl = "";
                        nextPosterUrl = "";
                        version = resource.deliveryVersion;
                        displayed = Boolean(url);
                        setState({ key: identity, url, resource, loading: false });
                    }
                }
            } catch {
                if (active && run === current) {
                    if (!displayed) setState({ key: identity, url: "", loading: false });
                    timer = setTimeout(() => {
                        void refresh(true);
                    }, 3000);
                }
            } finally {
                if (nextOwnedUrl) URL.revokeObjectURL(nextOwnedUrl);
                if (nextPosterUrl) URL.revokeObjectURL(nextPosterUrl);
            }
        };
        const changed = (event: Event) => {
            if (isWalletUsageEvent(event)) return;
            void refresh(true);
        };
        void refresh(false, true);
        window.addEventListener("wallet:updated", changed);
        window.addEventListener("subscription:updated", changed);
        return () => {
            active = false;
            release();
            clearTimeout(timer);
            window.removeEventListener("wallet:updated", changed);
            window.removeEventListener("subscription:updated", changed);
        };
    }, [key, enabled, variant, ephemeral, stream, identity]);
    return {
        controlled: Boolean(key),
        url: state.key === identity ? state.url : "",
        resource: state.key === identity ? state.resource : undefined,
        failed: state.key === identity && state.resource?.watermarked && state.resource.watermarkState === "failed",
        loading: Boolean(key) && (state.key !== identity || state.loading),
    };
}
