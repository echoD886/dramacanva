export function sniffImageMime(bytes: Uint8Array): string | undefined {
    const text = String.fromCharCode(...bytes.slice(0, 12));
    if (text.startsWith("GIF87a") || text.startsWith("GIF89a")) return "image/gif";
    if (bytes[0] === 0x89 && text.slice(1, 4) === "PNG" && bytes[4] === 13 && bytes[5] === 10 && bytes[6] === 26 && bytes[7] === 10) return "image/png";
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
    if (text.startsWith("RIFF") && text.slice(8, 12) === "WEBP") return "image/webp";
}

export function base64ImageDataUrl(base64: string): string {
    const prefix = atob(base64.slice(0, 16));
    const mime = sniffImageMime(Uint8Array.from(prefix, (char) => char.charCodeAt(0))) || "image/png";
    return `data:${mime};base64,${base64}`;
}

export async function mediaDownloadFilename(blob: Blob, filename: string): Promise<string> {
    const mime = sniffImageMime(new Uint8Array(await blob.slice(0, 12).arrayBuffer())) || blob.type.split(";")[0];
    const extension = ({ "image/gif": "gif", "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" } as Record<string, string>)[mime];
    return extension ? `${filename.replace(/\.(gif|png|jpe?g|webp)$/i, "")}.${extension}` : filename;
}
