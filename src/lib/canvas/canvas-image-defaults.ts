import type { CanvasNodeData, CanvasNodeMetadata } from "@/types/canvas";

export const imageSettingKeys = ["model", "size", "quality", "imageResolution", "transparentBackground", "modelParameters"] as const;

/** Settings travel with this canvas's nodes, so they survive reload and stay scoped. */
export function lastCanvasImageSettings(nodes: CanvasNodeData[]): CanvasNodeMetadata {
    const latest = nodes.filter((node) => node.type === "image" && node.metadata?.imageSettingsUpdatedAt).sort((a, b) => b.metadata!.imageSettingsUpdatedAt! - a.metadata!.imageSettingsUpdatedAt!)[0];
    if (!latest) return {};
    return Object.fromEntries(imageSettingKeys.map((key) => [key, latest.metadata?.[key]]));
}
