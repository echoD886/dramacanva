import { CanvasNodeType, type CanvasConnection, type CanvasNodeData } from "@/types/canvas";
import { productionToolName, productionToolPrompt, productionToolRequiresMedia, productionTools, type ProductionTool } from "./catalog";

/** The toolbox shows two top-level groups; each lists its sections in this order. Copy indexes refer to production-tools.ts. */
export const TOOLBOX_GROUPS = [
    {
        id: "drama",
        labelIndex: 42,
        sections: [
            { categoryId: "drama-character", labelIndex: 44 },
            { categoryId: "drama-scene", labelIndex: 45 },
            { categoryId: "storyboard", labelIndex: 46 },
            { categoryId: "short-video", labelIndex: 47 },
            { categoryId: "enhancement", labelIndex: 48 },
            { categoryId: "people", labelIndex: 49 },
            { categoryId: "scene", labelIndex: 50 },
        ],
    },
    {
        id: "ecommerce",
        labelIndex: 43,
        sections: [
            { categoryId: "product", labelIndex: 51 },
            { categoryId: "ecommerce", labelIndex: 52 },
        ],
    },
] as const;

export type ToolboxGroupId = (typeof TOOLBOX_GROUPS)[number]["id"];
export type ToolboxKind = "all" | ProductionTool["kind"];

export function toolboxGroup(id: ToolboxGroupId) {
    return TOOLBOX_GROUPS.find((group) => group.id === id) ?? TOOLBOX_GROUPS[0];
}

export function toolboxTools(groupId: ToolboxGroupId, filter: { categoryId?: string; kind?: ToolboxKind; query?: string; locale: string }, tools: readonly ProductionTool[] = productionTools) {
    const categories = new Set<string>(toolboxGroup(groupId).sections.map((section) => section.categoryId));
    const query = (filter.query || "").trim().toLocaleLowerCase();
    return tools.filter(
        (tool) =>
            categories.has(tool.categoryId) &&
            (!filter.categoryId || tool.categoryId === filter.categoryId) &&
            (!filter.kind || filter.kind === "all" || tool.kind === filter.kind) &&
            (!query || productionToolName(tool, filter.locale).toLocaleLowerCase().includes(query) || tool.focus.toLocaleLowerCase().includes(query)),
    );
}

export function toolboxPreset(value: unknown) {
    const preset = Number(value);
    return Number.isInteger(preset) && preset >= 0 && preset <= 2 ? preset : 0;
}

export function toolboxUseHref(tool: ProductionTool, preset: number) {
    return `/canvas?${new URLSearchParams({ mode: "new", tool: tool.key, preset: String(toolboxPreset(preset)) })}`;
}

export function toolboxToolFromParams(params: URLSearchParams) {
    const key = params.get("tool");
    return key ? productionTools.find((tool) => tool.key === key) : undefined;
}

/**
 * A tool opens as the onboarding-style chain: a text node whose content is the tool prompt feeds the
 * image/video node; tools that work from existing media also get an empty reference node.
 */
export function createToolboxInitialContent(tool: ProductionTool, locale: string, preset: number, models: { image?: string; video?: string }, now = new Date()): { nodes: CanvasNodeData[]; connections: CanvasConnection[] } {
    const stamp = now.getTime();
    const createdAt = now.toISOString();
    const name = productionToolName(tool, locale);
    const prompt = productionToolPrompt(tool, locale, toolboxPreset(preset));
    const needsMedia = productionToolRequiresMedia(tool);
    const referenceKind = /视频/.test(tool.inputOne) && !/帧/.test(tool.inputOne) ? CanvasNodeType.Video : CanvasNodeType.Image;
    const outputType = tool.kind === "video" ? CanvasNodeType.Video : CanvasNodeType.Image;
    const outputModel = tool.kind === "video" ? models.video : models.image;
    const textNode: CanvasNodeData = {
        id: `toolbox-text-${stamp}`,
        type: CanvasNodeType.Text,
        title: name,
        createdAt,
        updatedAt: createdAt,
        position: { x: 100, y: needsMedia ? 80 : 200 },
        width: 340,
        height: 240,
        // The tool prompt is the text itself; downstream image/video nodes read it as their prompt.
        metadata: { content: prompt },
    };
    const outputNode: CanvasNodeData = {
        id: `toolbox-output-${stamp}`,
        type: outputType,
        title: name,
        createdAt,
        updatedAt: createdAt,
        position: { x: 560, y: 120 },
        width: 720,
        height: 405,
        metadata: outputModel ? { model: outputModel } : {},
    };
    const nodes = [textNode, outputNode];
    const connections: CanvasConnection[] = [{ id: `toolbox-conn-text-${stamp}`, fromNodeId: textNode.id, toNodeId: outputNode.id, fromAnchorRatio: 0.5, toAnchorRatio: 0.5 }];
    if (needsMedia) {
        const referenceNode: CanvasNodeData = {
            id: `toolbox-reference-${stamp}`,
            type: referenceKind,
            title: tool.inputOne || name,
            createdAt,
            updatedAt: createdAt,
            position: { x: 100, y: 380 },
            width: 340,
            height: 240,
            metadata: {},
        };
        nodes.unshift(referenceNode);
        connections.push({ id: `toolbox-conn-reference-${stamp}`, fromNodeId: referenceNode.id, toNodeId: outputNode.id, fromAnchorRatio: 0.5, toAnchorRatio: 0.5 });
    }
    return { nodes, connections };
}

/** Centers the prepared nodes in a screen of the given size (screen = viewport.x + position * viewport.k). */
export function toolboxViewport(nodes: readonly CanvasNodeData[], width: number, height: number) {
    if (!nodes.length || width <= 0 || height <= 0) return { x: 0, y: 0, k: 1 };
    const left = Math.min(...nodes.map((node) => node.position.x));
    const top = Math.min(...nodes.map((node) => node.position.y));
    const right = Math.max(...nodes.map((node) => node.position.x + (node.width || 0)));
    const bottom = Math.max(...nodes.map((node) => node.position.y + (node.height || 0)));
    const k = Math.min(1, (width * 0.82) / Math.max(1, right - left), (height * 0.72) / Math.max(1, bottom - top));
    return { x: width / 2 - ((left + right) / 2) * k, y: height / 2 - ((top + bottom) / 2) * k, k };
}
