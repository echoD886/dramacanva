import { currentLocaleText as t } from "@/i18n/current-locale-text";
import { normalizeRunningHubCapability, type AiConfig, type RunningHubCapability, type RunningHubWorkflowKind, type WorkflowFieldMapping } from "@/stores/use-config-store";
import { workflowProviderPluginEnabled } from "@/lib/plugins/builtin/workflows";
import { usePluginStore } from "@/stores/use-plugin-store";

export type GenerationWorkflowMode = "text" | "image" | "video" | "audio";

export type GenerationWorkflowExecution = {
    provider: "runninghub" | "comfyui-bridge";
    kind: RunningHubWorkflowKind;
    capability: RunningHubCapability;
    interfaceType: string;
    name: string;
    taskModel: string;
    providerModel: string;
    workflowId: string;
    webappId: string;
    workflowJson: Record<string, unknown>;
    workflowFields: WorkflowFieldMapping[];
    bridgeId: string;
};

// 画布样式计划、任务记录和后端协议必须共用同一个工作流选择结果，避免再次回退到普通模型。
export function resolveGenerationWorkflowExecution(config: AiConfig, mode: GenerationWorkflowMode): GenerationWorkflowExecution | null {
    const workflowProvider = mode === "text" ? "model" : config.taskWorkflowProvider || "model";
    if (workflowProvider === "model") return null;

    if (workflowProvider === "runninghub") {
        if (!workflowProviderPluginEnabled(usePluginStore.getState().runtimeStatuses, "runninghub")) throw new Error(t("canvasExtra.configNode.pluginNotEnabledRunningHub"));
        const runningHub = config.runningHub;
        const workflowId = runningHub.workflowId.trim();
        const kind = runningHub.selectedKind === "app" ? "app" : "workflow";
        // RunningHub 工作流的参数拉取、提交和轮询固定使用积分 API Key；企业级 Key 只用于素材上传。
        const apiKey = runningHub.apiKey;
        if (!runningHub.enabled || !runningHub.baseUrl.trim() || !apiKey.trim() || !workflowId) {
            throw new Error(t("creationRuntime.runningHubIncomplete"));
        }
        const workflow = runningHub.workflows.find((item) => item.workflowId.trim() === workflowId && (item.kind === "app" ? "app" : "workflow") === kind);
        if (!workflow) throw new Error(t("creationRuntime.workflowMissing", { provider: "RunningHub" }));
        const capability = normalizeRunningHubCapability(workflow.capability, normalizeRunningHubCapability(runningHub.capability));
        assertWorkflowCapability("RunningHub", capability, mode);
        const webappId = kind === "app" ? (workflow.webappId || workflow.workflowId).trim() : "";
        const name = workflow.title?.trim() || webappId || workflowId;
        return {
            provider: "runninghub",
            kind,
            capability,
            interfaceType: `runninghub-workflow-${capability}`,
            name,
            taskModel: workflowTaskModel("RunningHub · ", name),
            providerModel: workflowId,
            workflowId: kind === "workflow" ? workflowId : "",
            webappId,
            workflowJson: workflow.workflowJson || {},
            workflowFields: workflow.fields || [],
            bridgeId: "",
        };
    }

    if (!workflowProviderPluginEnabled(usePluginStore.getState().runtimeStatuses, "comfyui")) throw new Error(t("canvasExtra.configNode.pluginNotEnabledComfyUI"));
    const comfyBridge = config.comfyBridge;
    const workflowId = comfyBridge.workflowId.trim();
    if (!comfyBridge.enabled || !comfyBridge.bridgeId.trim() || !workflowId) {
        throw new Error(t("creationRuntime.comfyIncomplete"));
    }
    const workflow = comfyBridge.workflows.find((item) => item.workflowId.trim() === workflowId);
    if (!workflow) throw new Error(t("creationRuntime.workflowMissing", { provider: "ComfyUI" }));
    const capability = normalizeRunningHubCapability(workflow.capability, normalizeRunningHubCapability(comfyBridge.capability));
    assertWorkflowCapability("ComfyUI", capability, mode);
    const name = workflow.title?.trim() || workflowId;
    return {
        provider: "comfyui-bridge",
        kind: "workflow",
        capability,
        interfaceType: `comfyui-bridge-${capability}`,
        name,
        taskModel: workflowTaskModel("ComfyUI · ", name),
        providerModel: workflowId,
        workflowId,
        webappId: "",
        workflowJson: workflow.workflowJson || {},
        workflowFields: workflow.fields || [],
        bridgeId: comfyBridge.bridgeId.trim(),
    };
}

function assertWorkflowCapability(providerName: string, capability: RunningHubCapability, mode: GenerationWorkflowMode) {
    if (capability === mode) return;
    const capabilityName = workflowCapabilityName(capability);
    const modeName = workflowCapabilityName(mode);
    throw new Error(t("creationRuntime.workflowModeMismatch", { provider: providerName, capability: capabilityName, mode: modeName }));
}

function workflowCapabilityName(value: GenerationWorkflowMode) {
    if (value === "video") return t("editorTools.video");
    if (value === "audio") return t("editorTools.audio");
    if (value === "text") return t("canvasExtra.approval.type.text");
    return t("editorTools.image");
}

function workflowTaskModel(prefix: string, name: string) {
    return `${prefix}${Array.from(name)
        .slice(0, Math.max(0, 120 - prefix.length))
        .join("")}`;
}
