export const DIRECTOR_THUMBNAIL_LONG_EDGE = 480;
export const WORLD_ENGINE_THUMBNAIL_RENDERER = "world-engine";

export type DirectorThumbnail = { url: string; storageKey: string; shotId: string; sceneUpdatedAt: string; renderer?: typeof WORLD_ENGINE_THUMBNAIL_RENDERER };

/** Bound the persisted node image; the full viewport frame stays in the output path. */
export async function createDirectorThumbnail(frame: Blob): Promise<Blob> {
    const bitmap = await createImageBitmap(frame);
    try {
        const scale = Math.min(1, DIRECTOR_THUMBNAIL_LONG_EDGE / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Thumbnail canvas unavailable");
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Thumbnail encoding failed"))), "image/jpeg", 0.75));
    } finally {
        bitmap.close();
    }
}

export function currentDirectorThumbnail(thumbnail: DirectorThumbnail | undefined, updatedAt: string | undefined, shotId: string | undefined) {
    return thumbnail && thumbnail.sceneUpdatedAt === updatedAt && thumbnail.shotId === shotId && /^(image:|resource:)/.test(thumbnail.storageKey) ? thumbnail : null;
}
