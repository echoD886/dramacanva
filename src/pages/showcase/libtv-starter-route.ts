export type LibTVStarterKey = "director" | "depth-capture";

export function libTVStarterCanvasHref(starterKey: LibTVStarterKey) {
    const params = new URLSearchParams({ import: "libtv-starter", starter: starterKey });
    return `/canvas?${params.toString()}`;
}
