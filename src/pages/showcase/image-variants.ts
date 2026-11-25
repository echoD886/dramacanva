import { westernImageVariant } from "../home/western-opening-works";

/** Keep in sync with WIDTHS in scripts/build-archived-image-variants.py. */
export const ARCHIVED_IMAGE_WIDTHS = [96, 480, 1280] as const;
export type ArchivedImageWidth = (typeof ARCHIVED_IMAGE_WIDTHS)[number];

const ARCHIVED_IMAGE = /^\/liblib-clone\/images\/([A-Za-z0-9._-]+\.(?:png|jpe?g|webp))$/i;
const WESTERN_COVER = /^\/liblib-clone\/western-opening\/covers\/[^/]+$/;
/** Covers bundled in web/public; their small copies ship with the build. */
const BUNDLED_THUMBNAILS: Record<string, string> = {
    "/showcase/covers/guabi-cover-20261011.png": "/showcase/covers/guabi-cover-20261011-480.webp",
};

/**
 * Resized WebP copy of an archived showcase image, generated on the media
 * host by scripts/build-archived-image-variants.py. The original name keeps
 * its extension so a.png and a.jpg cannot collide. Other paths are returned
 * unchanged; callers fall back to the original when a variant is missing.
 */
export function archivedImageVariant(path: string, width: ArchivedImageWidth) {
    const match = path.match(ARCHIVED_IMAGE);
    return match ? `/liblib-clone/image-variants/${width}/${match[1]}.webp` : path;
}

export interface ResponsiveImageSource {
    src: string;
    srcSet?: string;
    /** True when src/srcSet point at generated variants rather than the original. */
    resized: boolean;
}

/**
 * Pick the smallest variants that cover the requested widths. Western home
 * covers reuse the existing covers-640/covers-1920 set; anything else (bundled
 * /showcase files, unknown folders) keeps its original URL.
 */
export function responsiveArchivedImage(path: string, widths: readonly ArchivedImageWidth[]): ResponsiveImageSource {
    if (WESTERN_COVER.test(path)) {
        const small = westernImageVariant(path, "covers-640");
        if (widths.every((width) => width <= 480)) return { src: small, resized: true };
        const large = westernImageVariant(path, "covers-1920");
        return { src: large, srcSet: `${small} 640w, ${large} 1920w`, resized: true };
    }
    const bundled = BUNDLED_THUMBNAILS[path];
    if (bundled && widths.every((width) => width <= 480)) return { src: bundled, resized: true };
    if (!ARCHIVED_IMAGE.test(path) || widths.length === 0) return { src: path, resized: false };
    const sorted = [...widths].sort((a, b) => a - b);
    const src = archivedImageVariant(path, sorted[sorted.length - 1]);
    const srcSet = sorted.length > 1 ? sorted.map((width) => `${archivedImageVariant(path, width)} ${width}w`).join(", ") : undefined;
    return { src, srcSet, resized: true };
}
