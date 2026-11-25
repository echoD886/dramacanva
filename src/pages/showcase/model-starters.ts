import { NODE_DEFAULT_SIZE } from "@/constant/canvas";
import type { ModelStarterKey } from "./model-starter-route";
import { nanoid } from "nanoid";
import { CanvasNodeType, type CanvasNodeData } from "@/types/canvas";
import type { LibTVTranslator } from "./libtv-starters";
import { encodeChannelModel, type ModelChannel } from "@/stores/use-config-store";
export const MODEL_STARTERS = {
    "gpt-image": { title: "GPT Image 2.6", codes: ["gpt-image-2.6", "gpt-image-2.5"], placeholder: "placeholderImage" },
    "seedance-25": { title: "Seedance 2.5", codes: ["seedance-2.5"], placeholder: "placeholderSeedance" },
    "wan-30": { title: "Wan 3.0", codes: ["wan-3"], placeholder: "placeholderWan" },
    "minimax-h3": { title: "MiniMax H3", codes: ["minimax-h3"], placeholder: "placeholderMinimax" },
    "shot-breakdown": { title: "", codes: ["gemini-3.8-flash", "gpt-6-sol"], placeholder: "placeholderShotBreakdown" },
    "segment-remake": { title: "", codes: ["seedance-2.5"], placeholder: "placeholderRemake" },
} as const;
export type { ModelStarterKey } from "./model-starter-route";
export function isModelStarterKey(key: string): key is ModelStarterKey {
    return Object.hasOwn(MODEL_STARTERS, key);
}
export function resolvePreferredStarterModel(codes: readonly string[] | undefined, channels: ModelChannel[]) {
    for (const code of codes || [])
        for (const channel of channels.filter((channel) => channel.id === "managed")) {
            const cost = channel.modelCosts?.find((cost) => cost.logicalModelCode === code && cost.logicalAvailable !== false);
            if (cost) return encodeChannelModel(channel.id, cost.model);
        }
    return undefined;
}
export function buildModelStarter(key: ModelStarterKey, t: LibTVTranslator, width: number, height: number) {
    const definition = MODEL_STARTERS[key];
    const title = definition.title || t(key === "shot-breakdown" ? "homeShowcase.tool.shotBreakdown" : "homeShowcase.tool.remake");
    const image = key === "gpt-image";
    const dimensions = NODE_DEFAULT_SIZE[image ? CanvasNodeType.Image : CanvasNodeType.Video];
    const w = dimensions.width;
    const h = image ? w : dimensions.height;
    const total = key === "shot-breakdown" ? w + 100 + NODE_DEFAULT_SIZE[CanvasNodeType.Text].width : w;
    const input: CanvasNodeData = {
        id: nanoid(),
        type: image ? CanvasNodeType.Image : CanvasNodeType.Video,
        title,
        position: { x: -total / 2, y: -h / 2 - 80 },
        width: w,
        height: h,
        metadata: {
            modelStarterKey: key,
            preferredModelCodes: key === "shot-breakdown" ? [] : [...definition.codes],
            generationMode: image ? "image" : "video",
            status: "idle",
            ...(image ? { size: "1:1", imageResolution: "1K" } : { videoEditOperation: key === "segment-remake" ? "reference_to_video" : "text_to_video" }),
        },
    };
    const nodes = [input];
    const connections = [];
    if (key === "shot-breakdown") {
        const output: CanvasNodeData = {
            id: nanoid(),
            type: CanvasNodeType.Text,
            title,
            position: { x: -total / 2 + w + 100, y: -h / 2 - 80 },
            width: NODE_DEFAULT_SIZE[CanvasNodeType.Text].width,
            height: NODE_DEFAULT_SIZE[CanvasNodeType.Text].height,
            metadata: { modelStarterKey: key, preferredModelCodes: [...definition.codes], status: "idle", generationMode: "text" },
        };
        nodes.push(output);
        connections.push({ id: nanoid(), fromNodeId: input.id, toNodeId: output.id });
    }
    return { title: t("miscPages.starterTitleSuffix", { title }), nodes, connections, viewport: { x: width / 2, y: height / 2, k: 0.82 } };
}
