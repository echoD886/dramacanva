import { Input, Switch } from "antd";
import { DocumentedModelSettings } from "@/components/documented-model-settings";
import { useI18n } from "@/i18n/use-i18n";
import { modelCapabilityConfigFor } from "@/lib/model-capabilities";
import type { AiConfig } from "@/stores/use-config-store";
import type { CanvasNodeMetadata } from "@/types/canvas";
import { CanvasSettingsPopover } from "./canvas-settings-popover";

export function CanvasTextSettingsPopover({ config, onChange }: { config: AiConfig; onChange: (patch: Partial<CanvasNodeMetadata>) => void }) {
    const { t } = useI18n();
    const profile = modelCapabilityConfigFor(config, config.model).text;
    const title = t("canvasPrompt.textSettings");
    return (
        <CanvasSettingsPopover summary={title} label={title} title={title} buttonClassName="canvas-node-composer-settings-trigger">
            <div className="space-y-4">
                <DocumentedModelSettings config={config} mode="text" onChange={(modelParameters) => onChange({ modelParameters })} />
                {profile?.streaming !== false ? (
                    <label className="flex items-center justify-between gap-4 text-sm">
                        <span>
                            {t("canvasPrompt.textStream")}
                            <small className="mt-1 block opacity-70">{t("canvasPrompt.textStreamHelp")}</small>
                        </span>
                        <Switch size="small" aria-label={t("canvasPrompt.textStream")} checked={config.textStream !== false} onChange={(textStream) => onChange({ textStream })} />
                    </label>
                ) : null}
                {profile?.thinking ? (
                    <label className="flex items-center justify-between gap-4 text-sm">
                        <span>{t("canvasPrompt.textThinking")}</span>
                        <Switch size="small" aria-label={t("canvasPrompt.textThinking")} checked={config.textThinking === true} onChange={(textThinking) => onChange({ textThinking })} />
                    </label>
                ) : null}
                <label className="block space-y-2 text-sm">
                    <span>{t("workflowFields.systemPrompt")}</span>
                    <Input.TextArea
                        aria-label={t("workflowFields.systemPrompt")}
                        value={config.systemPrompt}
                        onChange={(event) => onChange({ systemPrompt: event.target.value })}
                        placeholder={t("canvasPrompt.systemPromptPlaceholder")}
                        autoSize={{ minRows: 3, maxRows: 8 }}
                    />
                </label>
            </div>
        </CanvasSettingsPopover>
    );
}
