import type { PublicMedia } from "./blog";

export function isPublicMedia(media: PublicMedia) {
    const safePath = (path?: string) => Boolean(path && /^\/blog-media\/[a-zA-Z0-9/_-]+\.[a-zA-Z0-9]+$/.test(path));
    return media.publicApproved && media.width > 0 && media.height > 0 && safePath(media.src) && (media.kind === "image" || (safePath(media.poster) && (!media.spokenAudio || safePath(media.captions))));
}
