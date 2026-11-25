import { useMemo } from "react";
import { ImageSettingsPanel } from "@/components/image-settings-panel";
import { ModelPicker } from "@/components/model-picker";
import { useI18n } from "@/i18n/use-i18n";
import type { CanvasTheme } from "@/lib/canvas-theme";
import { agentApprovalModel, agentApprovalModelSelection, type AgentImageApproval } from "@/lib/canvas/agent-media-approval";
import { modelCapabilityConfigFor, normalizeImageValue } from "@/lib/model-capabilities";
import { resolveCompatibleModel, type ModelRequirements } from "@/lib/model-selection";
import type { AgentMediaSettings } from "@/services/api/agent";
import { PUBLIC_MODEL_CATALOG_ID, useEffectiveConfig } from "@/stores/use-config-store";

export function CanvasAgentImageApprovalSettings({ initial, value, onChange, theme, disabled }: {
    initial: AgentImageApproval;
    value?: AgentMediaSettings;
    onChange: (value: AgentMediaSettings) => void;
    theme: CanvasTheme;
    disabled: boolean;
}) {
    const { t } = useI18n();
    const effective = useEffectiveConfig();
    const config = useMemo(() => ({ ...effective, channels: effective.channels.filter((channel) => channel.scope === "system" || channel.id === PUBLIC_MODEL_CATALOG_ID) }), [effective]);
    const settings = value || initial;
    const model = agentApprovalModel(config, settings);
    const requirements: ModelRequirements = {
        capability: "image",
        input: { textCount: 1, imageCount: initial.referenceNodeIds.length, videoCount: 0, audioCount: 0, characterCount: 0 },
        imageSize: settings.size,
        options: { size: settings.size, ...(settings.quality ? { quality: settings.quality } : {}), count: 1 },
    };
    const changeModel = (next: string) => {
        if (disabled) return;
        const profile = modelCapabilityConfigFor(config, next).image;
        if (!profile) return;
        const normalized = normalizeImageValue(profile, settings);
        onChange({ ...agentApprovalModelSelection(config, next), size: normalized.size, quality: profile.quality.supported ? normalized.quality : "" });
    };
    const changeOption = (key: "quality" | "imageResolution" | "size" | "transparentBackground" | "count", next: string) => {
        if (disabled || (key !== "size" && key !== "quality")) return;
        const options = { size: settings.size, quality: settings.quality, [key]: next };
        const selected = resolveCompatibleModel(config, model, { ...requirements, imageSize: options.size, options: { ...options, count: 1 } });
        if (!selected) return;
        onChange({ ...agentApprovalModelSelection(config, selected), ...options });
    };
    return <fieldset disabled={disabled} className="min-w-0 space-y-3 border-0 p-0" data-canvas-no-zoom data-canvas-wheel-scroll aria-label={t("canvasAgentApproval.imageSettingsAria")}>
        <div className="space-y-1.5">
            <div className="text-xs" style={{ color: theme.node.muted }}>{t("canvasAgentApproval.imageModel")}</div>
            <ModelPicker config={config} capability="image" value={model} onChange={changeModel} requirements={requirements} fullWidth showOptionPrices placeholder={t("canvasAgentApproval.imageModelPlaceholder")} />
        </div>
        {model ? <ImageSettingsPanel config={{ ...config, model, imageModel: model, size: settings.size, quality: settings.quality, count: "1" }} onConfigChange={changeOption} theme={theme} showTitle={false} showCount={false} showResolution={false} showTransparent={false} className="min-w-0 space-y-3" /> : <p className="text-xs" style={{ color: theme.node.muted }}>{t("canvasAgentApproval.modelUnavailable")}</p>}
        <p className="text-xs" style={{ color: theme.node.text }}>{t("canvasAgentApproval.currentSpec", { spec: `${settings.size}${settings.quality ? ` · ${settings.quality}` : ""}` })}</p>
        <p className="text-xs" style={{ color: theme.node.muted }}>{t("canvasAgentApproval.tempOnly")}</p>
    </fieldset>;
}
