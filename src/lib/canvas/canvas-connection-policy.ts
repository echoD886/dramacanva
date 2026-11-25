import { maxModelInputCapacity, type ModelInputSummary } from "@/lib/model-selection";
import { getNodeAcceptedInputKinds, getNodeGenerationMode, getNodeInputKind, getNodeMaxInputCount } from "@/lib/canvas/node-registry";
import type { AiConfig } from "@/stores/use-config-store";
import { CanvasNodeType, type CanvasConnection, type CanvasNodeData } from "@/types/canvas";

type ConnectionCandidate = Pick<CanvasConnection, "fromNodeId" | "toNodeId">;
type CanvasConnectionPolicyOptions = {
    // 仅跳过参考素材数量上限，媒体类型不兼容仍然拒绝。
    ignoreCapacity?: boolean;
};

export function canvasConnectionError(config: AiConfig, nodes: CanvasNodeData[], connections: CanvasConnection[], candidate: ConnectionCandidate, options: CanvasConnectionPolicyOptions = {}) {
    const target = nodes.find((node) => node.id === candidate.toNodeId);
    if (!target) return "找不到连线目标节点";
    const depthOnly = target.type === CanvasNodeType.MediaConversion && target.metadata?.mediaConversion?.videoDepthOnly;
    const acceptedInputKinds = depthOnly ? ["video" as const] : getNodeAcceptedInputKinds(target.type);
    if (acceptedInputKinds.length) {
        const source = nodes.find((node) => node.id === candidate.fromNodeId);
        const sourceKind = source ? getNodeInputKind(source.type) : undefined;
        const isMediaConversion = target.type === CanvasNodeType.MediaConversion;
        const hasAcceptedSource = isMediaConversion ? source?.type === CanvasNodeType.Video || (!depthOnly && source?.type === CanvasNodeType.Image) : Boolean(sourceKind && acceptedInputKinds.includes(sourceKind));
        if (!sourceKind || !hasAcceptedSource) {
            const labels = acceptedInputKinds.map(acceptedInputKindLabel).join("或");
            const targetLabel = isMediaConversion ? "转换" : target.type === CanvasNodeType.BatchTable ? "批量创作表" : labels;
            return `${targetLabel}节点只接受${labels}输入`;
        }
        const maxInputCount = getNodeMaxInputCount(target.type);
        if (maxInputCount) {
            const inputCount = new Set([...connections, { id: "candidate", ...candidate }].filter((connection) => connection.toNodeId === target.id).map((connection) => connection.fromNodeId)).size;
            if (inputCount > maxInputCount) return `${isMediaConversion ? "转换" : "当前"}节点最多连接 ${maxInputCount} 个输入`;
        }
    }
    const mode = getNodeGenerationMode(target);
    if (!mode) return "";
    const input = connectionInputSummary(target.id, nodes, connections, candidate);
    const visualInputCount = input.imageCount + input.characterCount;

    if (mode === "image") {
        if (input.videoCount > 0) return "图片生成节点不能连接参考视频";
        if (input.audioCount > 0) return "图片生成节点不能连接参考音频";
        return options.ignoreCapacity ? "" : capacityError(config, mode, "image", visualInputCount, "参考图");
    }
    if (mode === "video") {
        return options.ignoreCapacity ? "" : capacityError(config, mode, "image", visualInputCount, "参考图") || capacityError(config, mode, "video", input.videoCount, "参考视频") || capacityError(config, mode, "audio", input.audioCount, "参考音频");
    }
    if (mode === "text" && input.audioCount > 0) return "文本生成节点不能连接参考音频";
    if (mode === "audio" && input.videoCount > 0) return "音频生成节点不接受参考视频";
    return "";
}

function acceptedInputKindLabel(kind: "image" | "video" | "audio" | "text" | "table_data") {
    if (kind === "image") return "图片";
    if (kind === "video") return "视频";
    if (kind === "audio") return "音频";
    if (kind === "table_data") return "多维表格";
    return "文本";
}

export function connectionInputSummary(targetNodeId: string, nodes: CanvasNodeData[], connections: CanvasConnection[], candidate?: ConnectionCandidate): ModelInputSummary {
    const sourceIds = new Set(
        [...connections, ...(candidate ? [{ id: "candidate", ...candidate }] : [])]
            .filter((connection) => connection.toNodeId === targetNodeId && connection.relation !== "director-output")
            .flatMap((connection) => {
                const source = nodes.find((node) => node.id === connection.fromNodeId);
                return source?.metadata?.directorSceneId ? [source.metadata.directorPreviewNodeId, source.metadata.directorClayVideoNodeId].filter((id): id is string => Boolean(id)) : [connection.fromNodeId];
            }),
    );
    const input: ModelInputSummary = { textCount: 0, imageCount: 0, videoCount: 0, audioCount: 0, characterCount: 0 };
    sourceIds.forEach((sourceId) => {
        const source = nodes.find((node) => node.id === sourceId);
        if (!source) return;
        // 生成配置与背板不是参考素材，不参与容量计数——这一步必须早于角色卡判定，
        // 否则一个带角色元数据的配置/背板节点会被多算成角色。
        const conversion = source.metadata?.mediaConversion;
        const inputKind = source.type === CanvasNodeType.MediaConversion && (conversion?.videoDepthOnly || conversion?.outputKind === "video") ? "video" : getNodeInputKind(source.type);
        if (!inputKind) return;
        // 角色卡是跨类型覆盖：落在可计数类型上时改记为角色。
        if (source.metadata?.workflowKind === "character") input.characterCount += 1;
        else if (inputKind !== "table_data") input[`${inputKind}Count`] += 1;
    });
    return input;
}

function capacityError(config: AiConfig, capability: "image" | "video", kind: "image" | "video" | "audio", count: number, label: string) {
    const maximum = maxModelInputCapacity(config, capability, kind);
    if (maximum === null || count <= maximum) return "";
    const unit = kind === "image" ? "张" : "个";
    return maximum > 0 ? `已配置模型最多支持 ${maximum} ${unit}${label}` : `已配置模型均不支持${label}`;
}
