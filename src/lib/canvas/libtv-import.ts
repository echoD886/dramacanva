import { caseImageThumbnailUrl } from "./case-image-thumbnail";

const LIBTV_PROJECT_UUID_PATTERN = /^[a-f0-9]{32}$/i;

const LIBTV_UPSTREAM_HOSTS = new Set([
    "libtv-res.liblib.art",
    "liblib.tv",
    "www.liblib.tv",
    "api.liblib.tv",
]);

function isLibTVResourceUrl(rawUrl: string) {
    try {
        const url = new URL(rawUrl);
        return LIBTV_UPSTREAM_HOSTS.has(url.hostname.toLowerCase());
    } catch {
        return false;
    }
}

/** Returns an empty URL for any known upstream LibTV host. */
export function sanitizeLibTVMediaUrl(rawUrl: string) {
    const value = rawUrl.trim();
    return isLibTVResourceUrl(value) ? "" : value;
}

export function parseLibTVProjectUUID(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return "";
    let candidate = trimmed;
    try {
        const parsed = new URL(trimmed);
        candidate = parsed.searchParams.get("projectId") || parsed.searchParams.get("uuid") || parsed.pathname.split("/").filter(Boolean).at(-1) || "";
    } catch {
        candidate = trimmed;
    }
    return LIBTV_PROJECT_UUID_PATTERN.test(candidate) ? candidate.toLowerCase() : "";
}

export function formatLibTVBatchTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "未知";
    const pad = (part: number) => String(part).padStart(2, "0");
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}`;
}

export function buildLibTVImagePreviewUrl(rawUrl: string) {
    const value = sanitizeLibTVMediaUrl(rawUrl);
    return caseImageThumbnailUrl(value) || value;
}

export function buildLibTVVideoPreviewUrl(rawUrl: string) {
    const value = rawUrl.trim();
    if (isLibTVResourceUrl(value)) return "";
    const thumbnail = caseImageThumbnailUrl(value);
    if (thumbnail) return thumbnail;
    // A video URL (including a local file or blob) is never an <img> source.
    return /^data:image\//i.test(value) || (value.startsWith("/") && /\.(png|jpe?g|webp|avif|gif|svg)(?:[?#]|$)/i.test(value)) ? value : "";
}

/**
 * Restores the playable LibTV asset URL when a snapshot transform was
 * persisted as the node's content by an older importer.  The OSS transform
 * belongs only on previewContent; VideoPlayer must receive the original MP4.
 */
export function buildLibTVVideoSourceUrl(rawUrl: string) {
    return sanitizeLibTVMediaUrl(rawUrl);
}
