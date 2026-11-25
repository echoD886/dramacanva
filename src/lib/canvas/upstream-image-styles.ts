import catalog from "./upstream-image-styles.json";
import type { CanvasStylePreset } from "./canvas-style-system";

// Content migrated from upstream 4f183674, backend/internal/tools/seed/tools.json.
// Keep prompt recipes exact; adapt selection to our existing profile execution path.
export const upstreamImageStyles: CanvasStylePreset[] = catalog.map(({ tag, ...item }) => ({ ...item, description: item.title, tags: [tag] }));
export function upstreamImageStyle(id: string) {
    return catalog.find((item) => item.id === id);
}
