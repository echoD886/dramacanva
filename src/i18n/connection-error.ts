import type { MessageKey, MessageValues } from "./messages";

const fixed = {
    "批量连接暂不支持此节点类型": "connectionErrors.batch",
    "当前选中的节点不能连接到此类型": "connectionErrors.selected",
    "当前节点类型不能这样连接": "connectionErrors.invalid",
    "找不到连接源节点": "connectionErrors.sourceMissing",
    "目标节点不能连接到自身": "connectionErrors.self",
    "节点之间不能连接": "connectionErrors.incompatible",
    "背板不能作为连接源": "connectionErrors.frame",
    "分镜脚本需要按行连接": "connectionErrors.script",
    "生成配置不能作为聚合连接源": "connectionErrors.config",
    "找不到连线目标节点": "connectionErrors.targetMissing",
    "图片节点只接受图片输入": "connectionErrors.imageOnly",
    "视频节点只接受视频输入": "connectionErrors.videoOnly",
    "音频节点只接受音频输入": "connectionErrors.audioOnly",
    "文本节点只接受文本输入": "connectionErrors.textOnly",
    "图片生成节点不能连接参考视频": "connectionErrors.imageVideo",
    "图片生成节点不能连接参考音频": "connectionErrors.imageAudio",
    "文本生成节点不能连接参考音频": "connectionErrors.textAudio",
    "音频生成节点不接受参考视频": "connectionErrors.audioVideo",
    "角色配音一次只能连接一个角色卡": "connectionErrors.voice",
    "音频生成节点只接受文本或单个角色卡输入": "connectionErrors.audioInput",
    "已配置模型均不支持参考图": "connectionErrors.noImage",
    "已配置模型均不支持参考视频": "connectionErrors.noVideo",
    "已配置模型均不支持参考音频": "connectionErrors.noAudio",
} as const satisfies Record<string, MessageKey>;

export function localizedConnectionError(value: string | undefined, t: (key: MessageKey, values?: MessageValues) => string, number: (value: number) => string) {
    if (!value) return "";
    if (Object.hasOwn(fixed, value)) return t(fixed[value as keyof typeof fixed]);
    const plugin = /^(RunningHub|ComfyUI) 工作流插件未启用$/.exec(value);
    if (plugin) return t("connectionErrors.plugin", { plugin: plugin[1] });
    const capacity = /^已配置模型最多支持 (\d+(?:\.\d+)?) (张参考图|个参考视频|个参考音频)$/.exec(value);
    if (capacity && Number.isFinite(Number(capacity[1]))) {
        const key = capacity[2] === "张参考图" ? "connectionErrors.maxImage" : capacity[2] === "个参考视频" ? "connectionErrors.maxVideo" : "connectionErrors.maxAudio";
        return t(key, { maximum: number(Number(capacity[1])) });
    }
    const accepted = /^(转换|批量创作表|(?:图片|视频|音频|文本|多维表格)(?:或(?:图片|视频|音频|文本|多维表格))*)节点只接受((?:图片|视频|音频|文本|多维表格)(?:或(?:图片|视频|音频|文本|多维表格))*)输入$/.exec(value);
    if (accepted) {
        const labels = {
            图片: "connectionErrors.kindImage",
            视频: "connectionErrors.kindVideo",
            音频: "connectionErrors.kindAudio",
            文本: "connectionErrors.kindText",
            多维表格: "connectionErrors.kindTable",
        } as const satisfies Record<string, MessageKey>;
        const kinds = (text: string) => text.split("或").map((part) => t(labels[part as keyof typeof labels])).join(" / ");
        const target = accepted[1] === "转换" ? t("connectionErrors.targetConversion") : accepted[1] === "批量创作表" ? t("connectionErrors.targetBatchTable") : kinds(accepted[1]);
        return t("connectionErrors.acceptedInputs", { target, kinds: kinds(accepted[2]) });
    }
    const inputCount = /^(转换|当前)节点最多连接 (\d+) 个输入$/.exec(value);
    if (inputCount) return t(inputCount[1] === "转换" ? "connectionErrors.maxConversionInputs" : "connectionErrors.maxCurrentInputs", { maximum: number(Number(inputCount[2])) });
    return value;
}
