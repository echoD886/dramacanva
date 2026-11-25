import { useI18n } from "@/i18n/use-i18n";
import { DocumentedModelSettings } from "@/components/documented-model-settings";
import { ImageSettingsPanel, imageQualityLabel } from "@/components/image-settings-panel";
import { imageParameterSummary } from "@/lib/canvas/image-parameter-summary";
import { selectedModelParameters } from "@/lib/model-documented-parameters";
import { canvasThemes } from "@/lib/canvas-theme";
import { normalizeImageValue } from "@/lib/model-capabilities";
import { mergedImageCapabilityConfig } from "@/lib/model-selection";
import { useActiveTheme } from "@/stores/canvas/use-canvas-theme-store";
import type { AiConfig } from "@/stores/use-config-store";
import type { SettingsPlacement } from "@/lib/canvas/settings-popover-position";
import { CanvasSettingsPopover } from "./canvas-settings-popover";

type CanvasImageSettingsPopoverProps = {
    config: AiConfig;
    onConfigChange: (key: keyof AiConfig, value: string) => void;
    onMissingConfig?: () => void;
    onOpenChange?: (open: boolean) => void;
    buttonClassName?: string;
    getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement;
    placement?: SettingsPlacement;
    autoAdjustOverflow?: boolean;
    showCount?: boolean;
    isOptionAvailable?: (name: string, value: unknown) => boolean;
    optionPatch?: (name: string, value: unknown) => Record<string, unknown> | undefined;
};

export function CanvasImageSettingsPopover({ config, onConfigChange, onOpenChange, buttonClassName, placement = "bottomLeft", showCount = true, isOptionAvailable, optionPatch }: CanvasImageSettingsPopoverProps) {
    const { t } = useI18n();
    const theme = canvasThemes[useActiveTheme()];
    const profile = mergedImageCapabilityConfig(config, config.model || config.imageModel);
    const normalized = normalizeImageValue(profile, config);
    const background = selectedModelParameters(config, "image").background;
    const panelConfig = profile.transparentBackground.supported && (background === "opaque" || background === "transparent") ? { ...config, transparentBackground: String(background === "transparent") } : config;
    const summary = imageParameterSummary(profile, normalized, { automatic: t("imageSettings.auto"), quality: (value) => imageQualityLabel(value, t), count: (count) => t("canvasExtra.settingsPopover.imageCount", { count }) }, showCount);
    if (!summary && !profile.transparentBackground.supported) return null;
    return (
        <CanvasSettingsPopover summary={summary} label={t("canvasExtra.settingsPopover.imageAria", { summary })} title={t("imageSettings.title")} placement={placement} buttonClassName={buttonClassName} onOpenChange={onOpenChange}>
            <ImageSettingsPanel config={panelConfig} onConfigChange={onConfigChange} isOptionAvailable={isOptionAvailable} optionPatch={optionPatch} theme={theme} showTitle={false} showCount={showCount} quickCount={3} className="space-y-4" />
            <DocumentedModelSettings config={config} mode="image" hiddenParameters={profile.transparentBackground.supported ? ["background"] : []} onChange={(value) => onConfigChange("modelParameters", value)} />
        </CanvasSettingsPopover>
    );
}
