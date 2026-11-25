import { useI18n } from "@/i18n/use-i18n";
import { DocumentedModelSettings } from "@/components/documented-model-settings";
import { VideoSettingsPanel, videoResolutionLabel, videoSecondsLabel, videoSizeLabel } from "@/components/video-settings-panel";
import { canvasThemes } from "@/lib/canvas-theme";
import { modelCapabilityConfigFor, resolveVideoRatioValue, resolveVideoResolutionValue } from "@/lib/model-capabilities";
import { useActiveTheme } from "@/stores/canvas/use-canvas-theme-store";
import type { AiConfig } from "@/stores/use-config-store";
import type { SettingsPlacement } from "@/lib/canvas/settings-popover-position";
import { CanvasSettingsPopover } from "./canvas-settings-popover";

export function CanvasVideoSettingsPopover({
    config,
    onConfigChange,
    buttonClassName,
    placement = "bottomLeft",
    isOptionAvailable,
    optionPatch,
}: {
    config: AiConfig;
    onConfigChange: (key: keyof AiConfig, value: string) => void;
    buttonClassName?: string;
    placement?: SettingsPlacement;
    isOptionAvailable?: (name: string, value: unknown) => boolean;
    optionPatch?: (name: string, value: unknown) => Record<string, unknown> | undefined;
}) {
    const i18n = useI18n();
    const theme = canvasThemes[useActiveTheme()];
    const profile = modelCapabilityConfigFor(config, config.model).video;
    const summary = [
        ...(profile?.resolutions.length ? [videoResolutionLabel(resolveVideoResolutionValue(profile, config.vquality))] : []),
        ...(profile?.ratios.length ? [videoSizeLabel(resolveVideoRatioValue(profile, config.size), i18n.t)] : []),
        videoSecondsLabel(config.videoSeconds, i18n),
    ].join(" · ");
    return (
        <CanvasSettingsPopover summary={summary} label={i18n.t("canvasExtra.settingsPopover.videoAria", { summary })} title={i18n.t("videoSettings.title")} placement={placement} buttonClassName={buttonClassName}>
            <VideoSettingsPanel config={config} onConfigChange={onConfigChange} isOptionAvailable={isOptionAvailable} optionPatch={optionPatch} theme={theme} showTitle={false} className="space-y-4" />
            <DocumentedModelSettings config={config} mode="video" onChange={(value) => onConfigChange("modelParameters", value)} />
        </CanvasSettingsPopover>
    );
}
