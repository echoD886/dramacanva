import { useEffect, useState } from "react";
import { getActiveUserScope } from "@/lib/user-scope";
import { readVideoMetadata } from "@/lib/media-metadata";
import { resolveMediaUrl } from "@/services/file-storage";
import { useAssetStore, type Asset } from "@/stores/use-asset-store";
import { useResourceDelivery } from "@/hooks/use-resource-delivery";

/** Blob URLs expire after navigation. Resolve visible media from its durable key. */
export function useAssetMediaUrl(asset?: Asset | null) {
    const media = asset && (asset.kind === "video" || asset.kind === "audio" || asset.kind === "model") ? asset : null;
    const key = media?.data.storageKey;
    const delivery = useResourceDelivery(key || "");
    const fallback = media?.data.url || "";
    const identity = `${key || ""}\0${fallback}`;
    const [resolved, setResolved] = useState({ identity: "", url: "" });
    useEffect(() => {
        if (!media || delivery.controlled) return;
        const scope = getActiveUserScope();
        let active = true;
        void resolveMediaUrl(key, key && fallback.startsWith("blob:") ? "" : fallback)
            .then(async (url) => {
                if (!active || getActiveUserScope() !== scope) return;
                setResolved({ identity, url });
                if (!url || media.kind !== "video" || (media.data.width && media.data.height && media.data.durationMs)) return;
                const metadata = await readVideoMetadata(url).catch(() => undefined);
                if (!active || !metadata || getActiveUserScope() !== scope) return;
                const latest = useAssetStore.getState().assets.find((item) => item.id === media.id);
                if (latest?.kind === "video" && latest.data.storageKey === key) {
                    useAssetStore.getState().updateAsset(latest.id, { data: { ...latest.data, ...metadata } });
                }
            })
            .catch(() => undefined);
        return () => {
            active = false;
        };
    }, [identity, media?.id, delivery.controlled]);
    return delivery.controlled ? delivery.url : resolved.identity === identity ? resolved.url : key ? "" : fallback;
}
