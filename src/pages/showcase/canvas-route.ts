export function showcaseCanvasImportHref(templateUuid: string) {
    const params = new URLSearchParams({ import: "liblib", templateUuid });
    return `/canvas?${params.toString()}`;
}

/**
 * Public, local-only fallback for showcase cases whose editable graph has not
 * been archived yet. It deliberately never points at the upstream LibTV URL.
 */
export function showcaseCanvasPreviewHref(templateUuid: string) {
    return `/showcase/canvas/${templateUuid}`;
}
