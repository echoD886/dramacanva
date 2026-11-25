import { useEffect, useRef, useState, type ImgHTMLAttributes, type ReactNode } from "react";
import { useResourceDelivery } from "@/hooks/use-resource-delivery";

import { getResource, getResourceBlob, resourceIdFromStorageKey, type ResourceImageVariant } from "@/services/api/resources";
import { useUserStore } from "@/stores/use-user-store";
import { useI18n } from "@/i18n/use-i18n";
import { prepareCanvasImage } from "@/services/canvas-image-loader";
import { cacheResourceObjectUrl } from "@/services/resource-blob-cache";
import { resolveImageUrl } from "@/services/image-storage";
import { getActiveUserScope } from "@/lib/user-scope";
import { caseImageThumbnailUrl } from "@/lib/canvas/case-image-thumbnail";

type CachedResourceImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
    storageKey?: string;
    src?: string;
    fallback?: ReactNode;
    /** 资源仍在读取时展示的占位，缺省与 fallback 相同。 */
    loadingFallback?: ReactNode;
    eager?: boolean;
    variant?: ResourceImageVariant;
    /** Passive maps must never fall back from a thumbnail to full-size media. */
    thumbnailOnly?: boolean;
};

export function CreativePreviewImage({ storageKey, ...props }: ImgHTMLAttributes<HTMLImageElement> & { storageKey?: string }) {
    const enabled = useUserStore((state) => state.features.creativeAccessEnabled === true);
    return enabled || resourceIdFromStorageKey(storageKey) ? <CachedResourceImage {...props} storageKey={storageKey} variant="thumbnail" /> : <img {...props} />;
}

/**
 * 资源图片优先读取按用户隔离的本地 Blob 缓存，避免刷新后再次从对象存储下载。
 * 本地上传按持久化 storageKey 恢复 Blob URL；没有存储键的外链保持直读。
 */
export function CachedResourceImage(props: CachedResourceImageProps) {
    const enabled = useUserStore((state) => state.features.creativeAccessEnabled === true);
    const scope = getActiveUserScope();
    const id = resourceIdFromStorageKey(props.storageKey);
    const [privacy, setPrivacy] = useState<{ id: string; scope: string; private: boolean }>();
    useEffect(() => {
        let live = true;
        if (enabled && id)
            void getResource(id)
                .then((resource) => {
                    if (live) setPrivacy({ id, scope, private: resource.privateCreative === true });
                })
                .catch(() => {
                    if (live) setPrivacy(undefined);
                });
        return () => {
            live = false;
        };
    }, [enabled, id, scope]);
    if (enabled && id) {
        if (privacy?.id !== id || privacy.scope !== scope) return props.loadingFallback ?? props.fallback ?? null;
        if (privacy.private) return <PrivateCreativeImage {...props} />;
    }
    return <OrdinaryCachedResourceImage {...props} />;
}

function PrivateCreativeImage({ storageKey, variant = "thumbnail", fallback, loadingFallback, eager, src, onError, thumbnailOnly = false, ...props }: CachedResourceImageProps) {
    const { t } = useI18n();
    const [revealed, setRevealed] = useState(false);
    const [revoked, setRevoked] = useState(false);
    const delivery = useResourceDelivery(storageKey || "", !revoked, revealed ? "original" : "thumbnail", true);
    const url = revoked ? "" : delivery.url;
    useEffect(() => {
        const hide = () => {
            setRevealed(false);
            setRevoked(true);
        };
        window.addEventListener("creative-access:revoked", hide);
        return () => window.removeEventListener("creative-access:revoked", hide);
    }, []);
    if (thumbnailOnly) return url && !revoked ? <img {...props} src={url} style={{ ...props.style, filter: "blur(16px)" }} /> : fallback;
    return (
        <button
            type="button"
            data-canvas-no-zoom
            className="relative block size-full overflow-hidden"
            aria-label={t("creative.view")}
            disabled={revoked || !url}
            onClick={(event) => {
                event.stopPropagation();
                setRevealed(true);
            }}
            onPointerDown={(event) => event.stopPropagation()}
        >
            {url && <img {...props} src={url} onError={onError} style={{ ...props.style, filter: revealed ? props.style?.filter : "blur(16px)" }} />}
            {!revealed && <span className="absolute inset-0 grid place-items-center text-sm bg-background/60 text-foreground">{t("creative.view")}</span>}
        </button>
    );
}

function OrdinaryCachedResourceImage({ storageKey, src = "", fallback = null, loadingFallback = fallback, eager = false, variant = "original", thumbnailOnly = false, onError, ...props }: CachedResourceImageProps) {
    const { t } = useI18n();
    const remoteResource = Boolean(resourceIdFromStorageKey(storageKey));
    const targetRef = useRef<HTMLSpanElement>(null);
    const [nearViewport, setNearViewport] = useState(eager || !remoteResource);
    const [cachedSrc, setCachedSrc] = useState(remoteResource || (storageKey && src.startsWith("blob:")) ? "" : src);
    const [cacheFailed, setCacheFailed] = useState(false);
    // Thumbnails of imported showcase originals use the small pre-rendered WebP first.
    const caseThumbnail = variant === "thumbnail" && !remoteResource ? caseImageThumbnailUrl(src) : "";
    const [caseThumbnailFailed, setCaseThumbnailFailed] = useState("");

    useEffect(() => {
        if (!remoteResource || eager) {
            setNearViewport(true);
            return;
        }
        const image = targetRef.current;
        if (!image || typeof IntersectionObserver === "undefined") {
            setNearViewport(true);
            return;
        }
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    setNearViewport(true);
                    observer.disconnect();
                }
            },
            { rootMargin: "240px" },
        );
        observer.observe(image);
        return () => observer.disconnect();
    }, [eager, remoteResource]);

    const delivery = useResourceDelivery(storageKey || "", nearViewport, variant);
    useEffect(() => {
        if (remoteResource) return;
        let cancelled = false;
        const controller = new AbortController();
        const scope = getActiveUserScope();
        const fallbackSrc = storageKey && src.startsWith("blob:") ? "" : src;
        setCacheFailed(false);
        if (!storageKey || (!remoteResource && src && !src.startsWith("blob:"))) {
            setCachedSrc(src);
            return () => {
                cancelled = true;
            };
        }
        if (remoteResource && !nearViewport) {
            setCachedSrc("");
            return () => {
                cancelled = true;
            };
        }

        setCachedSrc("");
        const resolve = async () => {
            let url = remoteResource ? await cacheResourceObjectUrl(storageKey, variant) : await resolveImageUrl(storageKey, fallbackSrc);
            try {
                if (url) await prepareCanvasImage(url, controller.signal);
                else throw new Error("IMAGE_SOURCE_MISSING");
            } catch (error) {
                if (controller.signal.aborted || !remoteResource || variant !== "thumbnail" || thumbnailOnly) throw error;
                url = await cacheResourceObjectUrl(storageKey);
                if (url) await prepareCanvasImage(url, controller.signal);
            }
            return url;
        };
        void resolve()
            .then((url) => {
                if (!cancelled && getActiveUserScope() === scope) setCachedSrc(url || fallbackSrc);
            })
            .catch(() => {
                if (!cancelled && getActiveUserScope() === scope) {
                    setCacheFailed(true);
                    setCachedSrc(thumbnailOnly ? "" : fallbackSrc);
                }
            });
        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [nearViewport, remoteResource, src, storageKey, variant, thumbnailOnly]);

    if (!remoteResource) {
        if (caseThumbnail && caseThumbnailFailed !== caseThumbnail) return <img {...props} src={caseThumbnail} onError={() => setCaseThumbnailFailed(caseThumbnail)} />;
        if (thumbnailOnly && caseThumbnail && caseThumbnailFailed === caseThumbnail) return fallback;
        return cachedSrc ? <img {...props} src={cachedSrc} onError={onError} /> : fallback;
    }
    return (
        <span ref={targetRef} className="cached-resource-image-shell">
            {delivery.loading || delivery.failed ? (
                <span role="status">{t(delivery.failed ? "watermark.failed" : delivery.resource?.watermarked && delivery.resource.watermarkState !== "ready" ? "watermark.processing" : "common.loading")}</span>
            ) : delivery.url ? (
                <img {...props} src={delivery.url} onError={onError} />
            ) : (
                fallback
            )}
        </span>
    );
}
