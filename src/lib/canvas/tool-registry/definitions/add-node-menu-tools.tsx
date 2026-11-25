import { Folder, FolderOpen, Layers3, Palette, UploadCloud, UserRound, Workflow } from "lucide-react";
import { builtinNodeLabelKey } from "@/i18n/canvas-node-label";

import { getNodeIcon, getNodeLabel } from "@/lib/canvas/node-registry";
import { registerAddNodeMenuCommands, type AddNodeMenuCommand } from "@/lib/canvas/tool-registry";
import { CanvasNodeType } from "@/types/canvas";

/** 真正创建节点的命令，文案与图标统一取自节点注册表。 */
function nodeCommand(type: CanvasNodeType, rest: Omit<AddNodeMenuCommand, "id" | "label" | "icon" | "section">): AddNodeMenuCommand {
    return { id: type, label: builtinNodeLabelKey(type) ?? getNodeLabel(type), icon: getNodeIcon(type), section: "node", ...rest };
}

export const addNodeMenuCommands: AddNodeMenuCommand[] = [
    // 项目级动作不占用节点网格，创作节点保持统一排列。
    { id: "style", label: "canvasExtra.tool.projectStyle", icon: <Palette />, section: "project", defaultOrder: 10, applicable: (ctx) => !ctx.isProjectLinked, run: (ctx) => ctx.handlers.onChooseStyle() },
    // 创作节点
    nodeCommand(CanvasNodeType.Text, { defaultOrder: 10, run: (ctx) => ctx.handlers.onAddText() }),
    nodeCommand(CanvasNodeType.Drawing, { defaultOrder: 20, run: (ctx) => ctx.handlers.onAddDrawing() }),
    nodeCommand(CanvasNodeType.Script, { badge: "canvasExtra.tool.sectionCore", defaultOrder: 30, run: (ctx) => ctx.handlers.onAddScript() }),
    nodeCommand(CanvasNodeType.Frame, { defaultOrder: 40, applicable: (ctx) => ctx.workspaceMode !== "simple", run: (ctx) => ctx.handlers.onAddFrame() }),
    { id: "folder", label: "canvasExtra.tool.folder", icon: <Folder />, badge: "canvasExtra.tool.sixItems", section: "node", defaultOrder: 45, run: (ctx) => ctx.handlers.onAddFolder() },
    nodeCommand(CanvasNodeType.Image, { defaultOrder: 50, run: (ctx) => ctx.handlers.onAddImage() }),
    nodeCommand(CanvasNodeType.Video, { defaultOrder: 60, run: (ctx) => ctx.handlers.onAddVideo() }),
    nodeCommand(CanvasNodeType.BatchTable, { defaultOrder: 66, run: (ctx) => ctx.handlers.onAddExtensionNode(CanvasNodeType.BatchTable) }),
    nodeCommand(CanvasNodeType.MediaConversion, { badge: "canvasExtra.tool.local", defaultOrder: 65, run: (ctx) => ctx.handlers.onAddExtensionNode(CanvasNodeType.MediaConversion) }),
    { id: "depth-capture", label: "canvasExtra.tool.depthCapture", icon: <UserRound />, badge: "canvasExtra.tool.local", section: "node", defaultOrder: 69, run: (ctx) => ctx.handlers.onAddExtensionNode("depth-capture") },
    // 导演台落在节点分区，但它开的是导演工作台、不是某种画布节点，故不走注册表。
    { id: "director", label: "canvasExtra.tool.directorDesk", icon: <Layers3 />, badge: "3D", section: "node", defaultOrder: 70, applicable: (ctx) => ctx.workspaceMode !== "simple", run: (ctx) => ctx.handlers.onOpenDirector() },
    nodeCommand(CanvasNodeType.Audio, { defaultOrder: 80, applicable: (ctx) => ctx.workspaceMode !== "simple", run: (ctx) => ctx.handlers.onAddAudio() }),
    // 云端和本地工作流共用独立配置节点，不进入基础模型节点的渠道选择。
    { id: "workflow", label: "canvasExtra.tool.workflow", icon: <Workflow />, section: "workflow", defaultOrder: 10, applicable: (ctx) => ctx.workspaceMode !== "simple", run: (ctx) => ctx.handlers.onAddWorkflow() },
    // 导入资源
    { id: "upload", label: "canvasExtra.tool.uploadFile", icon: <UploadCloud />, section: "resource", defaultOrder: 10, run: (ctx) => ctx.handlers.onUpload() },
    { id: "project-character", label: "canvasExtra.tool.addCharacterCard", icon: <UserRound />, section: "resource", defaultOrder: 20, applicable: (ctx) => ctx.isProjectLinked, run: (ctx) => ctx.handlers.onOpenProjectCharacters() },
    { id: "assets", label: "canvasExtra.tool.assetLibrary", icon: <FolderOpen />, section: "resource", defaultOrder: 30, applicable: (ctx) => !ctx.isProjectLinked, run: (ctx) => ctx.handlers.onOpenMyAssets() },
];

registerAddNodeMenuCommands(addNodeMenuCommands);
