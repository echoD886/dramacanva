import { modelOptionName, resolveModelChannel, selectableModelsByCapability, type AiConfig } from "@/stores/use-config-store";

export function selectCloudAgentTextModel(config: AiConfig, manualModel: string) {
    const textModels = selectableModelsByCapability(config, "text");
    if (textModels.includes(manualModel)) return manualModel;
    const hostedGrok = textModels.find((model) => {
        const channel = resolveModelChannel(config, model);
        if (channel.scope !== "system") return false;
        const modelName = modelOptionName(model);
        const officialName = channel.modelCosts?.find((cost) => cost.model === modelName)?.displayName || modelName;
        return officialName.toLowerCase().replace(/[\s_-]+/g, "") === "grok4.5";
    });
    if (hostedGrok) return hostedGrok;
    const preferred = config.textModel || config.model || "";
    return textModels.includes(preferred) ? preferred : (textModels[0] || "");
}
