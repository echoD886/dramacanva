import type { ReactNode } from "react";
import { toolCatalogText } from "@/lib/canvas/agent-tool-presentation";
import type { MessageKey } from "@/i18n/messages";
import { Brush, Camera, Copy, FileText, Globe2, Grid2x2, Lock, LockOpen, Maximize2, PencilLine, Crop, SlidersHorizontal, Smile, Sun, Upload, Scaling } from "lucide-react";

import type { CanvasNodeData } from "@/types/canvas";
import type { NodeToolbarGroup } from "@/lib/canvas/tool-registry";

type ImageNodeActionToolId = "copyPrompt" | "reversePrompt" | "replace" | "resize" | "annotation" | "maskEdit" | "emotion" | "portraitTexture" | "crop" | "split" | "upscale" | "superResolve" | "angle" | "lighting" | "panorama" | "view";

type ImageToolHandlers = {
    onUpload: (node: CanvasNodeData) => void;
    onToggleFreeResize: (node: CanvasNodeData) => void;
    onAnnotate: (node: CanvasNodeData) => void;
    onMaskEdit: (node: CanvasNodeData) => void;
    onEmotion: (node: CanvasNodeData) => void;
    onPortraitTexture: (node: CanvasNodeData) => void;
    onCrop: (node: CanvasNodeData) => void;
    onUpscale: (node: CanvasNodeData) => void;
    onSuperResolve: (node: CanvasNodeData) => void;
    onAngle: (node: CanvasNodeData) => void;
    onLighting: (node: CanvasNodeData) => void;
    onPanorama: (node: CanvasNodeData) => void;
    onViewImage: (node: CanvasNodeData) => void;
    onCopyPrompt: (node: CanvasNodeData) => void;
    onReversePrompt: (node: CanvasNodeData) => void;
};

type ImageToolDefinition = {
    id: ImageNodeActionToolId;
    label: string | ((node: CanvasNodeData) => string);
    icon: (node: CanvasNodeData) => ReactNode;
    group: NodeToolbarGroup;
    order: number;
    section?: string;
    description?: string;
    active?: (node: CanvasNodeData) => boolean;
    run: (node: CanvasNodeData, handlers: ImageToolHandlers) => void;
};

const imageToolDefinitions: ImageToolDefinition[] = [
    {
        id: "copyPrompt",
        section: "canvasExtra.tool.genInfo",
        label: "canvasExtra.imgTool.copyPrompt",
        icon: () => <Copy className="size-3.5" />,
        group: "more",
        order: 50,
        run: (node, handlers) => handlers.onCopyPrompt(node),
    },
    {
        id: "reversePrompt",
        section: "canvasExtra.tool.genInfo",
        label: "canvasExtra.imgTool.reversePrompt",
        icon: () => <FileText className="size-3.5" />,
        group: "more",
        order: 60,
        run: (node, handlers) => handlers.onReversePrompt(node),
    },
    {
        id: "replace",
        label: "canvasExtra.imgTool.replaceImage",
        icon: () => <Upload className="size-3.5" />,
        group: "more",
        section: "canvasExtra.tool.assets",
        order: 45,
        run: (node, handlers) => handlers.onUpload(node),
    },
    {
        id: "resize",
        label: "canvasExtra.imgTool.lockAspect",
        section: "canvasExtra.tool.nodeManage",
        active: (node) => !node.metadata?.freeResize,
        icon: (node) => (node.metadata?.freeResize ? <LockOpen className="size-3.5" /> : <Lock className="size-3.5" />),
        group: "more",
        order: 70,
        run: (node, handlers) => handlers.onToggleFreeResize(node),
    },
    {
        id: "annotation",
        section: "canvasExtra.imgTool.sectionSplitMark",
        description: "canvasExtra.imgTool.annotateDesc",
        label: "canvasExtra.imgTool.annotate",
        icon: () => <PencilLine className="size-3.5" />,
        group: "process",
        order: 40,
        run: (node, handlers) => handlers.onAnnotate(node),
    },
    {
        id: "maskEdit",
        label: "canvasExtra.imgTool.maskEdit",
        description: "canvasExtra.imgTool.maskEditDesc",
        icon: () => <Brush className="size-3.5" />,
        group: "primary",
        order: 10,
        run: (node, handlers) => handlers.onMaskEdit(node),
    },
    {
        id: "emotion",
        label: "canvasExtra.imgTool.emotion",
        section: "canvasExtra.imgTool.sectionPortrait",
        description: "canvasExtra.imgTool.emotionDesc",
        icon: () => <Smile className="size-3.5" />,
        group: "portrait",
        order: 50,
        run: (node, handlers) => handlers.onEmotion(node),
    },
    {
        id: "portraitTexture",
        label: "canvasExtra.imgTool.texture",
        section: "canvasExtra.imgTool.sectionPortrait",
        description: "canvasExtra.imgTool.textureDesc",
        icon: () => <SlidersHorizontal className="size-3.5" />,
        group: "portrait",
        order: 60,
        run: (node, handlers) => handlers.onPortraitTexture(node),
    },
    {
        id: "crop",
        label: "canvasExtra.imgTool.crop",
        section: "canvasExtra.imgTool.sectionComposition",
        description: "canvasExtra.imgTool.cropDesc",
        icon: () => <Crop className="size-3.5" />,
        group: "process",
        order: 10,
        run: (node, handlers) => handlers.onCrop(node),
    },
    {
        id: "split",
        label: "canvasExtra.imgTool.split",
        section: "canvasExtra.imgTool.sectionSplitMark",
        description: "canvasExtra.imgTool.splitDesc",
        icon: () => <Grid2x2 className="size-3.5" />,
        group: "process",
        order: 45,
        run: () => undefined,
    },
    {
        id: "upscale",
        label: "canvasExtra.imgTool.resize",
        section: "canvasExtra.imgTool.sectionComposition",
        description: "canvasExtra.imgTool.resizeDesc",
        icon: () => <Scaling className="size-3.5" />,
        group: "process",
        order: 20,
        run: (node, handlers) => handlers.onUpscale(node),
    },
    {
        id: "angle",
        label: "canvasExtra.imgTool.angle",
        section: "canvasExtra.imgTool.sectionView",
        description: "canvasExtra.imgTool.angleDesc",
        icon: () => <Camera className="size-3.5" />,
        group: "viewpoint",
        order: 20,
        run: (node, handlers) => handlers.onAngle(node),
    },
    {
        id: "lighting",
        label: "canvasExtra.imgTool.lighting",
        section: "canvasExtra.imgTool.sectionView",
        description: "canvasExtra.imgTool.lightingDesc",
        icon: () => <Sun className="size-3.5" />,
        group: "lighting",
        order: 30,
        run: (node, handlers) => handlers.onLighting(node),
    },
    {
        id: "view",
        label: "canvasExtra.imgTool.preview",
        icon: () => <Maximize2 className="size-3.5" />,
        group: "utility",
        order: 10,
        run: (node, handlers) => handlers.onViewImage(node),
    },
    {
        id: "panorama",
        label: "canvasExtra.imgTool.panorama",
        section: "canvasExtra.imgTool.sectionView",
        description: "canvasExtra.imgTool.panoramaDesc",
        icon: () => <Globe2 className="size-3.5" />,
        group: "panorama",
        order: 80,
        run: (node, handlers) => handlers.onPanorama(node),
    },
];

export function buildImageToolbarTools(node: CanvasNodeData, handlers: ImageToolHandlers, t?: (key: MessageKey) => string) {
    const text = (value: string | undefined) => value && t && value.startsWith("canvasExtra.") ? t(value as MessageKey) : toolCatalogText(value);
    return imageToolDefinitions.map((tool) => ({
        id: tool.id,
        label: text(resolveToolText(tool.label, node))!,
        icon: tool.icon(node),
        group: tool.group,
        order: tool.order,
        section: text(tool.section),
        description: text(tool.description),
        active: tool.active?.(node),
        onClick: () => tool.run(node, handlers),
    }));
}

function resolveToolText(value: string | ((node: CanvasNodeData) => string), node: CanvasNodeData) {
    return typeof value === "function" ? value(node) : value;
}
