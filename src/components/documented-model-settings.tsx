import { InputNumber, Select } from "antd";
import { documentedParameterChoices, selectedModelParameters } from "@/lib/model-documented-parameters";
import type { AiConfig } from "@/stores/use-config-store";
import { useI18n } from "@/i18n/use-i18n";

const labels: Record<string, string> = {
    reasoning_effort: "推理强度",
    max_tokens: "最大输出 Token",
    max_completion_tokens: "最大生成 Token（含推理）",
    temperature: "随机性",
    top_p: "采样概率",
    top_k: "采样候选数",
    output_format: "输出格式",
    response_format: "响应格式",
    background: "背景",
    "model_params.speed": "生成速度",
    fps: "帧率",
    mode: "生成风格",
    draft: "草稿模式",
    seed: "随机种子",
    person_generation: "人物生成",
    resize_mode: "参考图适配",
    enhance_prompt: "提示词增强",
    fast_mode: "优先队列",
    context_ir: "提示词优化",
};

export function DocumentedModelSettings({ config, mode, onChange, hiddenParameters = [] }: { config: AiConfig; mode: "text" | "image" | "video"; onChange: (value: string) => void; hiddenParameters?: string[] }) {
    const { t } = useI18n();
    const label = (name: string) => name === "content_filter" ? t("videoSettings.contentFilter") : labels[name] || name;
    const valueLabel = (name: string, value: unknown) => {
        if (value == null) return t("videoSettings.parameterDefault");
        if (value === true || value === false || value === "true" || value === "false") {
            const enabled = value === true || value === "true";
            return name === "content_filter"
                ? t(enabled ? "videoSettings.contentFilterStandard" : "videoSettings.contentFilterRelaxed")
                : t(enabled ? "videoSettings.parameterEnabled" : "videoSettings.parameterDisabled");
        }
        return String(value);
    };
    const choices = documentedParameterChoices(config, mode).filter(([name]) => !hiddenParameters.includes(name));
    const selected = selectedModelParameters(config, mode);
    if (!choices.length) return null;
    const update = (name: string, value: unknown) => onChange(JSON.stringify({ ...selected, [name]: value }));
    return (
        <div className="space-y-3">
            {choices.map(([name, parameter]) => (
                <label key={name} className="block space-y-2 text-sm">
                    <span>{label(name)}</span>
                    {parameter.values?.length ? (
                        <Select
                            className="w-full"
                            aria-label={label(name)}
                            allowClear
                            value={selected[name] === undefined ? undefined : String(selected[name])}
                            placeholder={valueLabel(name, parameter.default)}
                            options={parameter.values.map((value) => ({ value: String(value), label: valueLabel(name, value) }))}
                            onChange={(value) =>
                                update(
                                    name,
                                    parameter.values?.find((candidate) => String(candidate) === value),
                                )
                            }
                        />
                    ) : parameter.range ? (
                        <InputNumber
                            className="w-full"
                            aria-label={label(name)}
                            min={parameter.range.min}
                            max={parameter.range.max}
                            step={parameter.range.step}
                            value={selected[name] === undefined ? null : Number(selected[name])}
                            placeholder={valueLabel(name, parameter.default)}
                            onChange={(value) => update(name, value)}
                        />
                    ) : null}
                </label>
            ))}
        </div>
    );
}
