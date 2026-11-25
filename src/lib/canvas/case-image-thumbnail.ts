/**
 * Imported showcase media point at full-size originals (/liblib-clone/recovered/<sha256>, often
 * 1–7 MB PNG). A pre-rendered WebP of the same image exists under canvas-previews; previews and
 * cards use it, falling back to the original only if that thumbnail is missing.
 */
export function caseImageThumbnailUrl(value: string) {
    const match = value.match(/^\/liblib-clone\/recovered\/([a-f0-9]{64})(?:\.(?:png|jpe?g|webp|avif|mp4|mov|m4v))?$/i);
    return match ? `/liblib-clone/canvas-previews/${match[1]}.webp` : "";
}
