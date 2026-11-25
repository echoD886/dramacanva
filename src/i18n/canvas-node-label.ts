import { getNodeLabel, getNodeListLabel, getNodeOwnerId } from "@/lib/canvas/node-registry";
import type { CanvasNodeData, CanvasNodeTypeId } from "@/types/canvas";
import type { MessageKey, MessageValues } from "./messages";

const labels = {
    image: "nodeSearch.image",
    text: "nodeSearch.text",
    drawing: "nodeSearch.drawing",
    script: "nodeSearch.script",
    skill: "nodeSearch.skill",
    config: "nodeSearch.config",
    video: "nodeSearch.video",
    audio: "nodeSearch.audio",
    frame: "nodeSearch.frame",
    markdown: "nodeSearch.markdown",
    svg: "nodeSearch.svg",
    html: "nodeSearch.html",
    panorama: "nodeSearch.panorama",
    compare: "nodeSearch.compare",
    chart: "nodeSearch.chart",
    colorgrade: "nodeSearch.colorgrade",
    "batch-table": "nodeSearch.batchTable",
    "media-conversion": "nodeSearch.mediaConversion",
} as const satisfies Record<string, MessageKey>;

export function localizedNodeListLabel(type: CanvasNodeTypeId, t: (key: MessageKey, values?: MessageValues) => string) {
    return getNodeOwnerId(type) === "builtin" && Object.hasOwn(labels, type)
        ? t(labels[type as keyof typeof labels])
        : getNodeListLabel(type);
}

const shortLabels = {
    image: "projectLabels.media.image", text: "canvasText.defaultTitle", drawing: "nodeInfo.drawing",
    script: "nodeInfo.script", skill: "nodeInfo.skill", config: "nodeToolbar.config",
    video: "projectLabels.media.video", audio: "projectLabels.media.audio", frame: "nodeSearch.frame",
    panorama: "canvasCreate.panorama", compare: "canvasCreate.compare", chart: "canvasCreate.chart", colorgrade: "canvasCreate.colorgrade",
    markdown: "nodeSearch.markdown", svg: "nodeSearch.svg", html: "nodeSearch.html",
    "batch-table": "nodeSearch.batchTable", "media-conversion": "nodeSearch.mediaConversion",
} as const satisfies Record<string, MessageKey>;

export function localizedNodeLabel(type: CanvasNodeTypeId, t: (key: MessageKey, values?: MessageValues) => string) {
    return getNodeOwnerId(type) === "builtin" && Object.hasOwn(shortLabels, type)
        ? t(shortLabels[type as keyof typeof shortLabels])
        : getNodeLabel(type);
}

/** 工具注册表等只存 key 的场景用它取节点标签的 MessageKey；非内置节点返回 undefined。 */
export function builtinNodeLabelKey(type: CanvasNodeTypeId): MessageKey | undefined {
    return getNodeOwnerId(type) === "builtin" && Object.hasOwn(shortLabels, type) ? shortLabels[type as keyof typeof shortLabels] : undefined;
}

const legacyDefaultTitles: Record<string, RegExp> = {
    text: /^(文本|画风)(\s*\d*)$/u, image: /^(图片)(\s*\d*)$/u,
    video: /^(视频)(\s*\d*)$/u, audio: /^(音频)(\s*\d*)$/u,
    drawing: /^(绘图)(\s*\d*)$/u, script: /^(分镜脚本|脚本)(\s*\d*)$/u,
    skill: /^(技能)(\s*\d*)$/u, config: /^(生成配置)(\s*\d*)$/u,
    frame: /^(分组|未命名背景板)(\s*\d*)$/u,
};

export function localizedCanvasNodeTitle(node: Pick<CanvasNodeData, "type" | "title" | "metadata">, t: (key: MessageKey, values?: MessageValues) => string) {
    if (node.metadata?.titleEdited) return node.title;
    if (node.metadata?.directorSceneId || node.metadata?.directorOutputKind) {
        let title = (node.metadata.directorSceneId && node.metadata.workflowTitle) || node.title;
        // Older outputs saved the source shot in their second tag and appended the output kind to the title.
        const separator = title.lastIndexOf(" · ");
        if (node.metadata.directorOutputKind && separator > 0 && node.metadata.assetTags?.[1]?.endsWith(title.slice(0, separator))) title = title.slice(0, separator);
        const numbered = /^(?:Shot|镜头|鏡頭|ショット|샷|Plano)\s*(\d+)(?: · (?:Previs|预演|預演|プリビズ|프리비즈|Previsualización|Prévia|Pré-visualização))?$/u.exec(title);
        return numbered ? t("nodeSearch.shot", { number: numbered[1] }) : title;
    }
    const legacy = legacyDefaultTitles[node.type]?.exec(node.title);
    if (!legacy && node.metadata?.defaultTitle !== node.title && node.title) return node.title;
    const label = legacy?.[1] === "画风" ? t("projectLabels.category.style")
        : node.type === "frame" && (!legacy || legacy[1] === "未命名背景板") ? t("canvasRuntime.frame.unnamedBackdrop")
        : localizedNodeLabel(node.type, t);
    return label + (legacy?.[2] || "");
}
