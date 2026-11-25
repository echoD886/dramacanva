import { Button, Input, InputNumber, Segmented, Select, Slider } from "antd";
import { useI18n } from "@/i18n/use-i18n";
import { Tooltip } from "@/components/ui/base/tooltip";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { ChevronDown, Dice5, Image as ImageIcon, LoaderCircle, MessageSquare, Music2, Play, Sparkles, Video, Workflow as WorkflowIcon } from "lucide-react";

import { Switch } from "@/components/ui/base/switch";

import { configuredModelMatchesCapability, defaultConfig, normalizeRunningHubCapability, useEffectiveConfig, type AiConfig, type RunningHubCapability, type RunningHubWorkflow, type RunningHubWorkflowKind } from "@/stores/use-config-store";
import { canvasThemes } from "@/lib/canvas-theme";
import { normalizeVideoDuration, normalizeVideoResolution } from "@/lib/video-generation-options";
import {
    defaultModelCapabilityConfig,
    modelCapabilityConfigFor,
    normalizeImageValue,
    workflowFieldChoiceValues,
    workflowFieldCurrentValue,
    workflowFieldKey,
    workflowFieldNumberBounds,
    workflowFieldRandomKey,
    workflowFieldSubmissionValue,
    workflowFieldValueError,
    workflowImageCapabilityConfig,
    workflowOutputSizeValue,
    workflowParameterFields,
    workflowVideoCapabilityConfig,
    workflowVideoFieldsFromJson,
    type WorkflowVideoFieldLike,
} from "@/lib/model-capabilities";
import { modelRequestOptions, resolveCompatibleModel, resolveModelGenerationDefaults, type ModelRequirements } from "@/lib/model-selection";
import { resolveCanvasWorkflowProvider } from "@/lib/canvas/canvas-workflow";
import { useActiveTheme } from "@/stores/canvas/use-canvas-theme-store";
import { workflowProviderPluginEnabled } from "@/lib/plugins/builtin/workflows";
import { usePluginStore } from "@/stores/use-plugin-store";
import type { CanvasGenerationMode, CanvasNodeData, CanvasNodeMetadata, CanvasWorkspaceMode } from "@/types/canvas";

type CanvasConfigNodePanelProps = {
    node: CanvasNodeData;
    isRunning: boolean;
    inputSummary: { textCount: number; imageCount: number; videoCount: number; audioCount: number; characterCount: number };
    onConfigChange: (nodeId: string, patch: Partial<CanvasNodeMetadata>) => void;
    onGenerate: (nodeId: string) => void;
    onCreatePrevis?: () => void;
    onComposerToggle: () => void;
    workspaceMode?: CanvasWorkspaceMode;
};

type WorkflowSelectOption = {
    label: ReactNode;
    value?: string;
    workflowId?: string;
    kind?: RunningHubWorkflowKind;
    title?: string;
    options?: WorkflowSelectOption[];
};

type ConfigNodeT = (key: Parameters<ReturnType<typeof useI18n>["t"]>[0], values?: Record<string, string | number>) => string;

function capabilityLabel(t: ConfigNodeT, capability: RunningHubCapability) {
    return capability === "video" ? t("canvasExtra.configNode.capabilityVideo") : capability === "audio" ? t("canvasExtra.configNode.capabilityAudio") : t("canvasExtra.configNode.capabilityImage");
}

function runningHubWorkflowKind(workflow: RunningHubWorkflow): RunningHubWorkflowKind {
    return workflow.kind === "app" ? "app" : "workflow";
}

function runningHubWorkflowEntryKey(workflow: RunningHubWorkflow): string {
    return `${runningHubWorkflowKind(workflow)}:${workflow.workflowId.trim()}`;
}

export function CanvasConfigNodePanel({ node, isRunning, inputSummary, onConfigChange, onGenerate, onCreatePrevis, onComposerToggle, workspaceMode = "professional" }: CanvasConfigNodePanelProps) {
    const { t } = useI18n();
    const globalConfig = useEffectiveConfig();
    const runtimeStatuses = usePluginStore((state) => state.runtimeStatuses);
    const theme = canvasThemes[useActiveTheme()];
    const mode = node.metadata?.generationMode === "video" || node.metadata?.generationMode === "audio" ? node.metadata.generationMode : "image";
    const simpleMode = workspaceMode === "simple";
    const resolvedProvider = resolveCanvasWorkflowProvider(node.metadata);
    const workflowProvider = resolvedProvider;
    const workflowCapability: RunningHubCapability = mode === "video" ? "video" : mode === "audio" ? "audio" : "image";
    const requirements: ModelRequirements = {
        capability: mode,
        input: inputSummary,
        videoOperation: node.metadata?.videoEditOperation,
        videoSeconds: mode === "video" ? node.metadata?.seconds || globalConfig.videoSeconds : undefined,
        options: modelRequestOptions(
            {
                ...globalConfig,
                size: node.metadata?.size || globalConfig.size,
                quality: node.metadata?.quality || globalConfig.quality,
                count: String(node.metadata?.count || globalConfig.count),
                videoSeconds: node.metadata?.seconds || globalConfig.videoSeconds,
                vquality: node.metadata?.vquality || globalConfig.vquality,
                videoGenerateAudio: node.metadata?.generateAudio || globalConfig.videoGenerateAudio,
                videoWatermark: node.metadata?.watermark || globalConfig.videoWatermark,
                audioVoice: node.metadata?.audioVoice || globalConfig.audioVoice,
                audioFormat: node.metadata?.audioFormat || globalConfig.audioFormat,
                audioSpeed: node.metadata?.audioSpeed || globalConfig.audioSpeed,
            },
            mode,
        ),
    };
    const config = buildNodeConfig(globalConfig, node, mode, requirements);
    const defaultWorkflowCapability = normalizeRunningHubCapability(globalConfig.runningHub.capability);
    const selectedRunningHubWorkflow = globalConfig.runningHub.workflows.find(
        (item) => item.workflowId.trim() === node.metadata?.runningHubWorkflowId?.trim() && (!node.metadata?.runningHubWorkflowKind || runningHubWorkflowKind(item) === node.metadata.runningHubWorkflowKind),
    );
    const selectedRunningHubCapability = selectedRunningHubWorkflow ? normalizeRunningHubCapability(selectedRunningHubWorkflow.capability, defaultWorkflowCapability) : undefined;
    const selectedWorkflowFields: WorkflowVideoFieldLike[] = workflowProvider === "runninghub" ? (selectedRunningHubWorkflow?.fields?.length ? selectedRunningHubWorkflow.fields : workflowVideoFieldsFromJson(selectedRunningHubWorkflow?.workflowJson)) : [];
    const dynamicWorkflowFields = workflowParameterFields(selectedWorkflowFields);
    useEffect(() => {
        if (workflowProvider === "runninghub" && !node.metadata?.runningHubWorkflowId?.trim()) {
            const capability = normalizeRunningHubCapability(globalConfig.runningHub.capability);
            // 模式切换后优先按当前能力选择工作流，不能沿用全局默认的视频工作流，
            // 否则点击“生图”会在下一次渲染时被自动改回“视频”。
            const workflow =
                globalConfig.runningHub.workflows.find(
                    (item) =>
                        normalizeRunningHubCapability(item.capability, capability) === workflowCapability && item.workflowId.trim() === globalConfig.runningHub.workflowId.trim() && runningHubWorkflowKind(item) === globalConfig.runningHub.selectedKind,
                ) || globalConfig.runningHub.workflows.find((item) => normalizeRunningHubCapability(item.capability, capability) === workflowCapability);
            if (workflow) {
                const workflowMode = normalizeRunningHubCapability(workflow.capability, capability);
                onConfigChange(node.id, { generationMode: workflowMode, runningHubWorkflowId: workflow.workflowId, runningHubWorkflowKind: runningHubWorkflowKind(workflow), workflowParameters: {} });
            }
            return;
        }
    }, [
        globalConfig.runningHub.capability,
        globalConfig.runningHub.selectedKind,
        globalConfig.runningHub.workflowId,
        globalConfig.runningHub.workflows,
        mode,
        node.id,
        node.metadata?.runningHubWorkflowId,
        onConfigChange,
        workflowCapability,
        workflowProvider,
    ]);
    const runningHubEntries = globalConfig.runningHub.workflows
        // 正常情况下只显示当前模式的条目；旧画布已引用的错配条目保留在列表中，
        // 这样用户可以看到并重新选择，而不是出现“选项消失”的死路。
        .filter(
            (item) =>
                normalizeRunningHubCapability(item.capability, defaultWorkflowCapability) === workflowCapability ||
                (item.workflowId.trim() === node.metadata?.runningHubWorkflowId?.trim() && (!node.metadata?.runningHubWorkflowKind || runningHubWorkflowKind(item) === node.metadata.runningHubWorkflowKind)),
        )
        .map((item) => ({
            label: item.title || item.workflowId,
            value: runningHubWorkflowEntryKey(item),
            workflowId: item.workflowId,
            kind: runningHubWorkflowKind(item),
            title: `${item.title || item.workflowId} · ${capabilityLabel(t, normalizeRunningHubCapability(item.capability, defaultWorkflowCapability))}`,
        }));
    const runningHubApps = runningHubEntries.filter((item) => item.kind === "app");
    const runningHubWorkflows = runningHubEntries.filter((item) => item.kind === "workflow");
    const runningHubOptions: WorkflowSelectOption[] = [
        ...(runningHubApps.length ? [{ label: <WorkflowOptionGroupLabel label={t("canvasExtra.configNode.appGroup")} count={runningHubApps.length} />, options: runningHubApps }] : []),
        ...(runningHubWorkflows.length ? [{ label: <WorkflowOptionGroupLabel label={t("canvasExtra.configNode.workflowGroup")} count={runningHubWorkflows.length} />, options: runningHubWorkflows }] : []),
    ];
    const chipStyle = { background: theme.node.fill, color: theme.node.text };
    const hasAnyInput = Boolean(inputSummary.textCount || inputSummary.imageCount || inputSummary.videoCount || inputSummary.audioCount || inputSummary.characterCount);
    const hasComposerContent = Boolean((node.metadata?.composerContent ?? node.metadata?.prompt ?? "").trim());
    const workflowParameterError = firstWorkflowParameterError(dynamicWorkflowFields, node.metadata?.workflowParameters || {}, t);
    const capabilityError =
        workflowParameterError ||
        (workflowProvider === "runninghub"
            ? !workflowProviderPluginEnabled(runtimeStatuses, "runninghub")
                ? t("canvasExtra.configNode.pluginNotEnabledRunningHub")
                : !globalConfig.runningHub.enabled
                  ? t("canvasExtra.configNode.enableRunningHubFirst")
                  : !node.metadata?.runningHubWorkflowId
                    ? t("canvasExtra.configNode.selectCapabilityWorkflowOrApp", { capability: capabilityLabel(t, workflowCapability) })
                    : !selectedRunningHubWorkflow
                      ? t("canvasExtra.configNode.runningHubEntryMissing")
                      : selectedRunningHubCapability !== workflowCapability
                        ? t("canvasExtra.configNode.entryCapabilityMismatch", { capability: capabilityLabel(t, selectedRunningHubCapability || "image") })
                        : undefined
            : undefined);
    const canGenerate = (hasComposerContent || (mode === "audio" ? inputSummary.textCount > 0 : hasAnyInput)) && !capabilityError;

    return (
        <div className="canvas-config-node-panel thin-scrollbar flex h-full w-full cursor-move flex-col gap-3.5 overflow-y-auto px-4 pb-4 pt-8 text-sm" style={{ color: theme.node.text }} onWheel={(event) => event.stopPropagation()}>
            <div className="flex min-h-9 items-center justify-between gap-3">
                <div className="shrink-0 text-sm font-semibold">{simpleMode ? t("canvasExtra.configNode.quickGenerate") : workflowProvider === "model" ? t("canvasExtra.configNode.generationConfig") : t("canvasExtra.configNode.workflowGeneration")}</div>
                {simpleMode ? (
                    <span className="rounded-md px-2 py-1 text-[var(--fs-tiny)]" style={{ background: theme.node.fill, color: theme.node.muted }}>
                        {t("canvasExtra.configNode.autoConfig")}
                    </span>
                ) : (
                    <div className="cursor-default" data-canvas-no-zoom onMouseDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
                        <Segmented
                            size="small"
                            className="canvas-config-mode !rounded-md !p-0.5"
                            value={mode}
                            onChange={(value) => onConfigChange(node.id, { generationMode: value as CanvasGenerationMode, runningHubWorkflowId: undefined, runningHubWorkflowKind: undefined, workflowParameters: {} })}
                            options={[
                                {
                                    value: "image",
                                    label: (
                                        <span className="inline-flex items-center gap-1">
                                            <ImageIcon className="size-3.5" />
                                            {t("canvasExtra.configNode.generateImage")}
                                        </span>
                                    ),
                                },
                                {
                                    value: "video",
                                    label: (
                                        <span className="inline-flex items-center gap-1">
                                            <Video className="size-3.5" />
                                            {t("canvasExtra.configNode.video")}
                                        </span>
                                    ),
                                },
                                {
                                    value: "audio",
                                    label: (
                                        <span className="inline-flex items-center gap-1">
                                            <Music2 className="size-3.5" />
                                            {t("canvasExtra.configNode.audio")}
                                        </span>
                                    ),
                                },
                            ]}
                        />
                    </div>
                )}
            </div>

            <div className="flex min-w-0 flex-wrap items-center gap-2">
                <InputChip label={t("canvasExtra.configNode.prompt")} value={t("canvasExtra.configNode.countGe", { count: inputSummary.textCount })} style={chipStyle} />
                <InputChip label={t("canvasExtra.configNode.referenceImages")} value={t("canvasExtra.configNode.countZhang", { count: inputSummary.imageCount })} style={chipStyle} />
                <InputChip label={t("canvasExtra.configNode.referenceVideos")} value={t("canvasExtra.configNode.countGe", { count: inputSummary.videoCount })} style={chipStyle} />
                <InputChip label={t("canvasExtra.configNode.referenceAudios")} value={t("canvasExtra.configNode.countGe", { count: inputSummary.audioCount })} style={chipStyle} />
                {inputSummary.characterCount ? <InputChip label={t("canvasExtra.configNode.characterCard")} value={t("canvasExtra.configNode.countGe", { count: inputSummary.characterCount })} style={chipStyle} /> : null}
            </div>

            <button
                type="button"
                className="canvas-config-prompt-button group flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 text-left"
                style={{ background: theme.node.fill, color: theme.node.text }}
                onMouseDown={(event) => event.stopPropagation()}
                onClick={onComposerToggle}
            >
                <span className="grid size-7 shrink-0 place-items-center rounded-md" style={{ background: theme.node.panel }}>
                    {simpleMode ? <MessageSquare className="size-3.5" /> : <Sparkles className="size-3.5" />}
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-[var(--fs-label)] font-semibold">{simpleMode ? t("canvasExtra.configNode.editContent") : t("canvasExtra.configNode.assemblePrompt")}</span>
                    <span className="block truncate text-[var(--fs-tiny)]" style={{ color: theme.node.muted }}>
                        {hasComposerContent ? t("canvasExtra.configNode.composerFilled") : t("canvasExtra.configNode.composerEmpty")}
                    </span>
                </span>
                <ChevronDown className="size-3.5 -rotate-90 opacity-45 transition-transform group-hover:translate-x-0.5" />
            </button>

            {mode === "video" && !simpleMode ? (
                <div className="cursor-default" data-canvas-no-zoom onMouseDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
                    <div
                        className="flex h-9 min-w-0 items-center gap-2 rounded-lg border px-2 text-[var(--fs-label)]"
                        style={{ background: theme.node.fill, borderColor: theme.node.stroke, color: theme.node.text }}
                        title={t("canvasExtra.configNode.autoMapTitle")}
                    >
                        <ImageIcon className="size-3.5 shrink-0 opacity-75" />
                        <span className="shrink-0 font-medium">{t("canvasExtra.configNode.allRef")}</span>
                        <span className="min-w-0 truncate opacity-60">{t("canvasExtra.configNode.autoMapped")}</span>
                    </div>
                </div>
            ) : null}

            {simpleMode ? (
                <div className="rounded-lg px-3 py-2.5 text-[var(--fs-label)]" style={{ background: theme.node.fill, color: theme.node.muted }}>
                    {t("canvasExtra.configNode.usesDefaultModel")}
                </div>
            ) : (
                <div className="flex min-w-0 flex-col gap-3">
                    <div className="flex items-center gap-3" data-canvas-no-zoom onMouseDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
                        <span className="shrink-0 text-[var(--fs-tiny)] font-medium" style={{ color: theme.node.muted }}>
                            {t("canvasExtra.configNode.generationSource")}
                        </span>
                        <Segmented
                            block
                            size="small"
                            className="canvas-config-provider min-w-0 flex-1"
                            value={workflowProvider}
                            options={[{ label: t("canvasExtra.configNode.model"), value: "model" }, ...(workflowProviderPluginEnabled(runtimeStatuses, "runninghub") ? [{ label: "RunningHub", value: "runninghub" }] : [])]}
                            onChange={(value) => {
                                const nextProvider = value as "model" | "runninghub";
                                if (nextProvider === "model") {
                                    onConfigChange(node.id, { workflowProvider: "model", workflowTitle: undefined, runningHubWorkflowId: undefined, runningHubWorkflowKind: undefined, workflowParameters: {} });
                                    return;
                                }
                                if (nextProvider === "runninghub") {
                                    onConfigChange(node.id, { workflowProvider: "runninghub", workflowTitle: t("canvasExtra.configNode.runningHubWorkflowTitle"), workflowParameters: {} });
                                }
                            }}
                        />
                    </div>
                    <div data-canvas-no-zoom className="grid min-w-0 cursor-default items-center gap-3" onMouseDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
                        {workflowProvider === "runninghub" ? (
                            <Select<string, WorkflowSelectOption>
                                className="canvas-compact-control !h-9 w-full"
                                value={selectedRunningHubWorkflow ? runningHubWorkflowEntryKey(selectedRunningHubWorkflow) : undefined}
                                title={
                                    selectedRunningHubWorkflow
                                        ? t("canvasExtra.configNode.kindTitleTooltip", {
                                              kind: selectedRunningHubWorkflow.kind === "app" ? t("canvasExtra.configNode.appLabel") : t("canvasExtra.configNode.workflowGroup"),
                                              title: selectedRunningHubWorkflow.title || selectedRunningHubWorkflow.workflowId,
                                          })
                                        : undefined
                                }
                                placeholder={t("canvasExtra.configNode.selectCapabilityWorkflowOrApp", { capability: capabilityLabel(t, workflowCapability) })}
                                showSearch
                                options={runningHubOptions}
                                optionFilterProp="label"
                                optionLabelProp="label"
                                labelRender={(selected) => {
                                    const workflow = runningHubEntries.find((item) => item.value === selected.value);
                                    return <WorkflowSelectedLabel kind={workflow?.kind || "workflow"} label={workflow?.label || String(selected.label || "")} />;
                                }}
                                notFoundContent={t("canvasExtra.configNode.noCapabilityWorkflows", { capability: capabilityLabel(t, workflowCapability) })}
                                popupMatchSelectWidth={false}
                                virtual={false}
                                listHeight={320}
                                styles={{ popup: { root: { minWidth: 320, maxWidth: "min(420px, calc(100vw - 32px))" } } }}
                                optionRender={(option) => {
                                    if (option.data.options) return option.label;
                                    return <WorkflowOptionLabel kind={option.data.kind === "app" ? "app" : "workflow"} label={String(option.data.label || "")} title={String(option.data.title || option.data.label || "")} />;
                                }}
                                onChange={(value) => {
                                    const workflow = runningHubEntries.find((item) => item.value === value);
                                    onConfigChange(node.id, { runningHubWorkflowId: workflow?.workflowId, runningHubWorkflowKind: workflow?.kind, workflowParameters: {} });
                                }}
                            />
                        ) : null}
                    </div>
                </div>
            )}

            {dynamicWorkflowFields.length ? <WorkflowParameterControls fields={dynamicWorkflowFields} node={node} theme={theme} onConfigChange={onConfigChange} /> : null}
            {onCreatePrevis ? (
                <Button size="small" onMouseDown={(event) => event.stopPropagation()} onClick={onCreatePrevis}>
                    {t("directorD4.create")}
                </Button>
            ) : null}

            {capabilityError ? (
                <div className="rounded-lg px-3 py-2 text-[var(--fs-tiny)]" style={{ background: theme.accent.danger + "18", color: theme.accent.danger }}>
                    {capabilityError}
                </div>
            ) : null}

            <Button type="primary" className="mt-auto !h-9 !w-full !cursor-pointer !rounded-lg" disabled={isRunning || !canGenerate} onMouseDown={(event) => event.stopPropagation()} onClick={() => onGenerate(node.id)}>
                <span className="inline-flex items-center gap-1.5">
                    {isRunning ? (
                        <>
                            <LoaderCircle className="size-4 animate-spin" />
                            <span>{t("canvasExtra.configNode.generating")}</span>
                        </>
                    ) : (
                        <>
                            <span>{t("canvasExtra.configNode.generate")}</span>
                            <Play className="size-4" />
                            <span>{t("canvasExtra.configNode.startGenerating")}</span>
                        </>
                    )}
                </span>
            </Button>
        </div>
    );
}

export function WorkflowParameterControls({
    fields,
    node,
    theme,
    onConfigChange,
    defaultExpanded = true,
}: {
    fields: WorkflowVideoFieldLike[];
    node: CanvasNodeData;
    theme: (typeof canvasThemes)[keyof typeof canvasThemes];
    onConfigChange: (nodeId: string, patch: Partial<CanvasNodeMetadata>) => void;
    defaultExpanded?: boolean;
}) {
    const { t, number } = useI18n();
    const [expanded, setExpanded] = useState(defaultExpanded);
    const values = node.metadata?.workflowParameters || {};
    const update = (field: WorkflowVideoFieldLike, value: unknown) => {
        const key = workflowFieldKey(field);
        onConfigChange(node.id, { workflowParameters: { ...values, [key]: value } });
    };
    const updateRandom = (field: WorkflowVideoFieldLike, randomEnabled: boolean) => {
        const key = workflowFieldRandomKey(field);
        onConfigChange(node.id, { workflowParameters: { ...values, [key]: randomEnabled } });
    };
    return (
        <div className="flex min-w-0 flex-col gap-2 rounded-lg px-2 py-2" style={{ background: theme.node.fill }} data-canvas-no-zoom onMouseDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
            <div className="flex h-7 min-w-0 items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5 text-[var(--fs-tiny)]" style={{ color: theme.node.muted }}>
                    <span className="font-semibold">{t("canvasExtra.configNode.workflowParams")}</span>
                    <span>{t("canvasExtra.configNode.itemsCount", { count: number(fields.length) })}</span>
                </div>
                <Tooltip title={expanded ? t("canvasExtra.configNode.collapseParams") : t("canvasExtra.configNode.expandParams")}>
                    <Button
                        type="text"
                        size="small"
                        className="!size-7 !shrink-0 !p-0"
                        icon={<ChevronDown className={`size-3.5 transition-transform ${expanded ? "" : "-rotate-90"}`} />}
                        aria-expanded={expanded}
                        aria-label={expanded ? t("canvasExtra.configNode.collapseParams") : t("canvasExtra.configNode.expandParams")}
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={() => setExpanded((current) => !current)}
                    />
                </Tooltip>
            </div>
            {expanded
                ? fields.map((field) => {
                      const key = workflowFieldKey(field);
                      const randomKey = workflowFieldRandomKey(field);
                      const value = workflowFieldSubmissionValue(field, workflowFieldCurrentValue(field, values) ?? "");
                      const randomEnabled = typeof values[randomKey] === "boolean" ? values[randomKey] === true : field.randomEnabled === true;
                      const rawFieldType = String(field.fieldType || "").toUpperCase();
                      const fieldType = ["FLOAT", "INT", "INTEGER"].includes(rawFieldType) ? "NUMBER" : rawFieldType;
                      const options = workflowFieldChoiceValues(field);
                      const selectOptions = options.length ? options : fieldType === "SELECT" && value !== "" ? [value] : [];
                      const bounds = workflowFieldNumberBounds(field);
                      const numeric = fieldType === "NUMBER" || fieldType === "SLIDER" || typeof value === "number" || bounds.min !== undefined || bounds.max !== undefined || bounds.step !== undefined;
                      const numericValue = value === "" || !Number.isFinite(Number(value)) ? undefined : Number(value);
                      const valueError = randomEnabled ? "" : workflowFieldValueError(field, value);
                      const control =
                          fieldType === "SELECT" || selectOptions.length ? (
                              <Select
                                  status={valueError ? "error" : undefined}
                                  size="small"
                                  className="w-full"
                                  value={value === "" ? undefined : (value as string | number)}
                                  options={selectOptions.map((option) => ({ label: workflowParameterOptionLabel(option), value: workflowParameterOptionValue(option) }))}
                                  onChange={(next) => update(field, next)}
                              />
                          ) : fieldType === "BOOLEAN" || typeof value === "boolean" ? (
                              <Switch size="sm" checked={value === true || value === "true"} onChange={(checked) => update(field, checked)} />
                          ) : fieldType === "SLIDER" && bounds.min !== undefined && bounds.max !== undefined ? (
                              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_64px] items-center gap-2">
                                  <Slider disabled={randomEnabled} className="m-0" min={bounds.min} max={bounds.max} step={bounds.step || 0.01} value={numericValue ?? bounds.min} tooltip={{ open: false }} onChange={(next) => update(field, next)} />
                                  <InputNumber
                                      disabled={randomEnabled}
                                      status={valueError ? "error" : undefined}
                                      size="small"
                                      className="w-full"
                                      value={numericValue}
                                      min={bounds.min}
                                      max={bounds.max}
                                      step={bounds.step}
                                      onChange={(next) => update(field, next)}
                                  />
                              </div>
                          ) : numeric ? (
                              <InputNumber
                                  disabled={randomEnabled}
                                  status={valueError ? "error" : undefined}
                                  size="small"
                                  className="w-full"
                                  value={numericValue}
                                  min={bounds.min}
                                  max={bounds.max}
                                  step={bounds.step}
                                  onChange={(next) => update(field, next)}
                              />
                          ) : (
                              <Input status={valueError ? "error" : undefined} size="small" value={String(value ?? "")} onChange={(event) => update(field, event.target.value)} />
                          );
                      return (
                          <label
                              key={key}
                              className="grid min-w-0 grid-cols-[minmax(72px,0.8fr)_minmax(0,1.2fr)] items-center gap-2 text-[var(--fs-label)]"
                              title={valueError || `${field.nodeId}.${field.fieldName}${bounds.min !== undefined || bounds.max !== undefined ? ` · ${bounds.min ?? ""}-${bounds.max ?? ""}${bounds.step !== undefined ? ` / step ${bounds.step}` : ""}` : ""}`}
                          >
                              <span className="min-w-0 truncate" style={{ color: theme.node.muted }}>
                                  {field.label || field.fieldName}
                              </span>
                              <div className={field.randomEnabled ? "grid min-w-0 grid-cols-[minmax(0,1fr)_28px] items-center gap-1" : "min-w-0"}>
                                  {control}
                                  {field.randomEnabled ? (
                                      <Tooltip title={randomEnabled ? t("canvasExtra.configNode.randomOnTooltip") : t("canvasExtra.configNode.randomOffTooltip")}>
                                          <Button
                                              type="text"
                                              size="small"
                                              className="!size-7 !p-0"
                                              style={{ background: randomEnabled ? theme.accent.primarySoft : "transparent", color: randomEnabled ? theme.accent.primary : theme.node.muted }}
                                              icon={<Dice5 className="size-3.5" />}
                                              aria-pressed={randomEnabled}
                                              onClick={(event) => {
                                                  event.preventDefault();
                                                  updateRandom(field, !randomEnabled);
                                              }}
                                          />
                                      </Tooltip>
                                  ) : null}
                              </div>
                          </label>
                      );
                  })
                : null}
        </div>
    );
}

export function firstWorkflowParameterError(fields: WorkflowVideoFieldLike[], values: Record<string, unknown>, t: ConfigNodeT) {
    for (const field of fields) {
        const randomKey = workflowFieldRandomKey(field);
        const randomEnabled = typeof values[randomKey] === "boolean" ? values[randomKey] === true : field.randomEnabled === true;
        if (randomEnabled) continue;
        const key = workflowFieldKey(field);
        const value = workflowFieldCurrentValue(field, values) ?? "";
        const error = workflowFieldValueError(field, value);
        if (error) return t("canvasExtra.configNode.fieldError", { field: String(field.label || field.fieldName), error });
    }
    return "";
}

function workflowParameterOptionValue(value: unknown): string | number {
    if (value && typeof value === "object" && !Array.isArray(value)) {
        const item = value as Record<string, unknown>;
        for (const key of ["value", "id", "key", "name", "label"]) {
            if (item[key] !== undefined && item[key] !== null) return typeof item[key] === "number" ? item[key] : String(item[key]);
        }
    }
    return typeof value === "number" ? value : String(value ?? "");
}

function workflowParameterOptionLabel(value: unknown) {
    return String(workflowParameterOptionValue(value));
}

function InputChip({ label, value, style }: { label: string; value: string; style: CSSProperties }) {
    return (
        <div className="inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-[var(--fs-label)]" style={style}>
            <span>{label}</span>
            <span className="font-medium">{value}</span>
        </div>
    );
}

function WorkflowOptionGroupLabel({ label, count }: { label: string; count: number }) {
    return (
        <span className="canvas-workflow-group-label">
            <span>{label}</span>
            <b>{count}</b>
        </span>
    );
}

function WorkflowOptionLabel({ kind, label, title }: { kind: "app" | "workflow"; label: string; title: string }) {
    return (
        <div className="canvas-workflow-option" title={title}>
            {kind === "app" ? <Sparkles /> : <WorkflowIcon />}
            <span>{label}</span>
            <i aria-hidden="true" />
        </div>
    );
}

function WorkflowSelectedLabel({ kind, label }: { kind: "app" | "workflow"; label: string }) {
    return (
        <span className="canvas-workflow-selected-label">
            {kind === "app" ? <Sparkles /> : <WorkflowIcon />}
            <span>{label}</span>
        </span>
    );
}

function buildNodeConfig(globalConfig: AiConfig, node: CanvasNodeData, mode: CanvasGenerationMode, requirements: ModelRequirements): AiConfig {
    const workflowProvider = mode === "text" ? "model" : resolveCanvasWorkflowProvider(node.metadata);
    if (workflowProvider === "model") return buildModelNodeConfig(globalConfig, node, mode, requirements);
    const defaultModel = mode === "image" ? globalConfig.imageModel : mode === "video" ? globalConfig.videoModel : mode === "audio" ? globalConfig.audioModel : globalConfig.textModel;
    const fallbackModel = mode === "image" ? defaultConfig.imageModel : mode === "video" ? defaultConfig.videoModel : mode === "audio" ? defaultConfig.audioModel : defaultConfig.textModel;
    const storedModel = node.metadata?.model;
    const preferredModel = storedModel && configuredModelMatchesCapability(globalConfig, storedModel, mode) ? storedModel : defaultModel && configuredModelMatchesCapability(globalConfig, defaultModel, mode) ? defaultModel : fallbackModel;
    const model = preferredModel;
    const selectedRunningHubWorkflowId = node.metadata?.runningHubWorkflowId?.trim();
    const modeCapability = mode === "video" || mode === "audio" ? mode : "image";
    const selectedRunningHubWorkflow = selectedRunningHubWorkflowId
        ? globalConfig.runningHub.workflows.find((item) => item.workflowId.trim() === selectedRunningHubWorkflowId && (!node.metadata?.runningHubWorkflowKind || runningHubWorkflowKind(item) === node.metadata.runningHubWorkflowKind))
        : undefined;
    const selectedWorkflowFields = workflowProvider === "runninghub" ? (selectedRunningHubWorkflow?.fields?.length ? selectedRunningHubWorkflow.fields : workflowVideoFieldsFromJson(selectedRunningHubWorkflow?.workflowJson)) : [];
    const capabilityProfile = {
        ...defaultModelCapabilityConfig(),
        image: workflowImageCapabilityConfig(selectedWorkflowFields, defaultModelCapabilityConfig().image!),
        video: workflowVideoCapabilityConfig(selectedWorkflowFields, defaultModelCapabilityConfig().video!),
    };
    const imageProfile = mode === "image" ? capabilityProfile.image! : undefined;
    const workflowParameters = node.metadata?.workflowParameters || {};
    const workflowOutputSize = workflowOutputSizeValue(selectedWorkflowFields, workflowParameters);
    const workflowParameter = (source: string) => (workflowParameters[`source:${source}`] === undefined ? "" : String(workflowParameters[`source:${source}`]));
    const normalizedImage = imageProfile
        ? normalizeImageValue(imageProfile, {
              size: workflowOutputSize || node.metadata?.size || globalConfig.size || defaultConfig.size,
              quality: node.metadata?.quality || workflowParameter("quality") || globalConfig.quality || defaultConfig.quality,
              transparentBackground: node.metadata?.transparentBackground || globalConfig.transparentBackground,
              count: String(node.metadata?.count || globalConfig.canvasImageCount || globalConfig.count || defaultConfig.count),
          })
        : undefined;
    const videoProfile = mode === "video" ? capabilityProfile.video! : undefined;
    const rawVideoSettings = {
        seconds: node.metadata?.seconds || workflowParameter("videoSeconds") || globalConfig.videoSeconds || defaultConfig.videoSeconds,
        ratio: workflowOutputSize || node.metadata?.size || globalConfig.size || defaultConfig.size,
        resolution: node.metadata?.vquality || workflowParameter("vquality") || globalConfig.vquality || defaultConfig.vquality,
    };
    const normalizedVideo = videoProfile ? { seconds: String(rawVideoSettings.seconds), ratio: rawVideoSettings.ratio, resolution: rawVideoSettings.resolution } : undefined;
    const runningHub = {
        ...globalConfig.runningHub,
        enabled: mode !== "text" && workflowProvider === "runninghub" && globalConfig.runningHub.enabled,
        selectedKind: selectedRunningHubWorkflow ? runningHubWorkflowKind(selectedRunningHubWorkflow) : globalConfig.runningHub.selectedKind,
        workflowId: selectedRunningHubWorkflowId || "",
        capability: normalizeRunningHubCapability(selectedRunningHubWorkflow?.capability, normalizeRunningHubCapability(globalConfig.runningHub.capability)),
    };
    return {
        ...globalConfig,
        taskWorkflowProvider: workflowProvider,
        runningHub,
        model,
        quality: workflowParameter("quality") || normalizedImage?.quality || node.metadata?.quality || globalConfig.quality || defaultConfig.quality,
        size: normalizedImage?.size || normalizedVideo?.ratio || node.metadata?.size || globalConfig.size || defaultConfig.size,
        transparentBackground: normalizedImage?.transparentBackground || ((node.metadata?.transparentBackground || globalConfig.transparentBackground) === "true" ? "true" : "false"),
        videoSeconds: normalizedVideo?.seconds || normalizeVideoDuration(node.metadata?.seconds || globalConfig.videoSeconds || defaultConfig.videoSeconds),
        vquality: String(node.metadata?.vquality || globalConfig.vquality || defaultConfig.vquality),
        videoGenerateAudio: videoProfile?.generateAudio.supported ? node.metadata?.generateAudio || globalConfig.videoGenerateAudio || String(videoProfile.generateAudio.default) : "false",
        videoWatermark: videoProfile?.watermark.supported ? node.metadata?.watermark || globalConfig.videoWatermark || String(videoProfile.watermark.default) : "false",
        audioVoice: node.metadata?.audioVoice || globalConfig.audioVoice || defaultConfig.audioVoice,
        audioFormat: node.metadata?.audioFormat || globalConfig.audioFormat || defaultConfig.audioFormat,
        audioSpeed: node.metadata?.audioSpeed || globalConfig.audioSpeed || defaultConfig.audioSpeed,
        audioInstructions: node.metadata?.audioInstructions || globalConfig.audioInstructions || defaultConfig.audioInstructions,
        count: normalizedImage?.count || String(node.metadata?.count || (mode === "image" ? globalConfig.canvasImageCount || globalConfig.count : globalConfig.count) || defaultConfig.count),
    };
}

function buildModelNodeConfig(globalConfig: AiConfig, node: CanvasNodeData, mode: CanvasGenerationMode, requirements: ModelRequirements): AiConfig {
    const defaultModel = mode === "image" ? globalConfig.imageModel : mode === "video" ? globalConfig.videoModel : mode === "audio" ? globalConfig.audioModel : globalConfig.textModel;
    const fallbackModel = mode === "image" ? defaultConfig.imageModel : mode === "video" ? defaultConfig.videoModel : mode === "audio" ? defaultConfig.audioModel : defaultConfig.textModel;
    const storedModel = node.metadata?.model;
    const preferredModel = storedModel && configuredModelMatchesCapability(globalConfig, storedModel, mode) ? storedModel : defaultModel && configuredModelMatchesCapability(globalConfig, defaultModel, mode) ? defaultModel : fallbackModel;
    const model = resolveCompatibleModel(globalConfig, preferredModel, mode === "image" ? { ...requirements, imageSize: node.metadata?.size || globalConfig.size || defaultConfig.size } : requirements) || preferredModel;
    const generationDefaults = resolveModelGenerationDefaults(
        globalConfig,
        model,
        mode === "image" ? "image" : mode === "video" ? "video" : undefined,
        mode === "image"
            ? {
                  size: node.metadata?.size,
                  quality: node.metadata?.quality,
                  transparentBackground: node.metadata?.transparentBackground,
                  count: String(node.metadata?.count || globalConfig.canvasImageCount || globalConfig.count || defaultConfig.count),
              }
            : {
                  size: node.metadata?.size,
                  videoSeconds: node.metadata?.seconds,
                  vquality: node.metadata?.vquality,
                  videoGenerateAudio: node.metadata?.generateAudio,
                  videoWatermark: node.metadata?.watermark,
              },
        {
            size: globalConfig.size || defaultConfig.size,
            quality: globalConfig.quality || defaultConfig.quality,
            transparentBackground: globalConfig.transparentBackground || defaultConfig.transparentBackground,
            count: String(globalConfig.canvasImageCount || globalConfig.count || defaultConfig.count),
            videoSeconds: globalConfig.videoSeconds || defaultConfig.videoSeconds,
            vquality: globalConfig.vquality || defaultConfig.vquality,
            videoGenerateAudio: globalConfig.videoGenerateAudio || defaultConfig.videoGenerateAudio,
            videoWatermark: globalConfig.videoWatermark || defaultConfig.videoWatermark,
        },
    );
    const videoProfile = mode === "video" ? modelCapabilityConfigFor(globalConfig, model).video! : undefined;
    return {
        ...globalConfig,
        taskWorkflowProvider: "model",
        model,
        quality: generationDefaults.quality || globalConfig.quality || defaultConfig.quality,
        size: generationDefaults.size ?? globalConfig.size ?? defaultConfig.size,
        transparentBackground: generationDefaults.transparentBackground || "false",
        videoSeconds: generationDefaults.videoSeconds || normalizeVideoDuration(globalConfig.videoSeconds || defaultConfig.videoSeconds),
        vquality: generationDefaults.vquality ?? normalizeVideoResolution(globalConfig.vquality || defaultConfig.vquality),
        videoGenerateAudio: videoProfile?.generateAudio.supported ? generationDefaults.videoGenerateAudio || String(videoProfile.generateAudio.default) : "false",
        videoWatermark: videoProfile?.watermark.supported ? generationDefaults.videoWatermark || String(videoProfile.watermark.default) : "false",
        audioVoice: node.metadata?.audioVoice || globalConfig.audioVoice || defaultConfig.audioVoice,
        audioFormat: node.metadata?.audioFormat || globalConfig.audioFormat || defaultConfig.audioFormat,
        audioSpeed: node.metadata?.audioSpeed || globalConfig.audioSpeed || defaultConfig.audioSpeed,
        audioInstructions: node.metadata?.audioInstructions || globalConfig.audioInstructions || defaultConfig.audioInstructions,
        count: generationDefaults.count || String(node.metadata?.count || (mode === "image" ? globalConfig.canvasImageCount || globalConfig.count : globalConfig.count) || defaultConfig.count),
    };
}
