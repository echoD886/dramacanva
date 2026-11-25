export type ModelStarterKey = "gpt-image" | "seedance-25" | "wan-30" | "minimax-h3" | "shot-breakdown" | "segment-remake";
export function modelStarterCanvasHref(key: ModelStarterKey) {
    return `/canvas?import=model-starter&starter=${key}`;
}
