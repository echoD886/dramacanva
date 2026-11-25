// Local upload URLs never enter node metadata or server persistence.
const previews = new Map<string, string>();

export function registerUploadPreview(nodeId: string, file: Blob) {
    releaseUploadPreview(nodeId);
    const url = URL.createObjectURL(file);
    previews.set(nodeId, url);
    return url;
}

export function uploadPreviewUrl(nodeId: string) {
    return previews.get(nodeId) || "";
}

export function releaseUploadPreview(nodeId: string) {
    const url = previews.get(nodeId);
    if (!url) return;
    previews.delete(nodeId);
    URL.revokeObjectURL(url);
}
