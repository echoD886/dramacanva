import { MAX_STYLE_ASSETS, styleAssetValidationMessage, styleProfileValidationMessage, type StyleAssetBinding, type StyleProfileSnapshot } from "@/lib/canvas/style-profile";
import type { MessageKey } from "./messages";
import type { useI18n } from "./use-i18n";

type Translator = ReturnType<typeof useI18n>["t"];
const fixedMessages: Record<string, MessageKey> = {
    "资产 ID 不能为空": "styleValidation.assetId",
    "请填写资产名称": "styleValidation.assetName",
    "请填写来源平台或适配器": "styleValidation.provider",
    "LoRA 权重必须在 0 到 2 之间": "styleValidation.weight",
    "单个资产最多声明 20 个兼容模型": "styleValidation.models",
    "单个资产最多声明 50 个触发词": "styleValidation.triggers",
    "单个参考图组最多绑定 20 个 URL 和 20 个资源": "styleValidation.references",
    "Steps 必须在 1 到 200 之间": "styleValidation.steps",
    "CFG 必须在 0 到 50 之间": "styleValidation.cfg",
    "已验证的 LoRA 必须填写来源资产 ID 或 URL": "styleValidation.loraSource",
    "已验证的模板或提示词模块必须填写提示词内容": "styleValidation.promptContent",
    "已验证的参考图组必须绑定参考图": "styleValidation.referenceContent",
    "项目画风快照缺少必要字段": "styleValidation.requiredFields",
    "请填写风格名称": "styleValidation.name",
    "请填写完整风格 Prompt": "styleValidation.prompt",
    "风格名称最多 80 个字": "styleValidation.nameLength",
    "风格简介最多 500 个字": "styleValidation.descriptionLength",
    "风格标签最多 20 个": "styleValidation.tags",
    "项目画风辅助标注最多 20 项": "styleValidation.annotations",
    "项目画风辅助标注格式无效": "styleValidation.annotationFormat",
    "风格封面地址过长": "styleValidation.coverLength",
    "风格封面只支持 http(s)、站内路径或图片 Data URL": "styleValidation.coverProtocol",
    "负面 Prompt 过大": "styleValidation.negativeSize",
    "项目画风执行资产 ID 不能重复": "styleValidation.duplicate",
    "项目画风资产配置过大": "styleValidation.size",
};

export function localizeStyleValidationMessage(message: string, t: Translator): string {
    return Object.hasOwn(fixedMessages, message) ? t(fixedMessages[message]) : message;
}

export function styleAssetValidationDisplay(asset: StyleAssetBinding, t: Translator): string {
    return localizeStyleValidationMessage(styleAssetValidationMessage(asset), t);
}

export function styleProfileValidationDisplay(profile: StyleProfileSnapshot, t: Translator): string {
    const message = styleProfileValidationMessage(profile);
    if (message === `项目画风最多绑定 ${MAX_STYLE_ASSETS} 个执行资产`) return t("styleValidation.assetLimit", { count: MAX_STYLE_ASSETS });
    for (const asset of profile.assets) {
        const error = styleAssetValidationMessage(asset);
        if (error && message === `${asset.title || "未命名资产"}：${error}`) {
            return t("styleValidation.assetError", { name: asset.title || t("styleValidation.unnamed"), error: localizeStyleValidationMessage(error, t) });
        }
    }
    return localizeStyleValidationMessage(message, t);
}
