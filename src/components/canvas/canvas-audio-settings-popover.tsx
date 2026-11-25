import { Switch } from "antd";
import { useI18n } from "@/i18n/use-i18n";
import { upstreamText } from "@/i18n/ddcat-updates";
import { AudioSettingsPanel } from "@/components/audio-settings-panel";
import { audioFormatLabel, audioSpeedLabel, audioVoiceLabel } from "@/lib/audio-generation";
import { canvasThemes } from "@/lib/canvas-theme";
import { useActiveTheme } from "@/stores/canvas/use-canvas-theme-store";
import { isMusicModelConfig, type AiConfig } from "@/stores/use-config-store";
import { supportsAudioReferenceVoice } from "@/lib/model-selection";
import { CanvasAudioReferenceSettings } from "./canvas-audio-reference-settings";
import type { CanvasResourceReference } from "@/lib/canvas/canvas-resource-references";
import type { CanvasAudioVoiceBinding } from "@/lib/canvas/canvas-audio-voice-bindings";
import type { SettingsPlacement } from "@/lib/canvas/settings-popover-position";
import { CanvasSettingsPopover } from "./canvas-settings-popover";

export type CanvasAudioSettingKey = "audioMode" | "audioVoice" | "audioFormat" | "audioSpeed" | "audioInstructions" | "musicInstrumental";

export function CanvasAudioSettingsPopover({
    config,
    references = [],
    bindings = [],
    onBindingsChange = () => {},
    onConfigChange,
    buttonClassName,
    placement = "bottomLeft",
}: {
    config: AiConfig;
    references?: CanvasResourceReference[];
    bindings?: CanvasAudioVoiceBinding[];
    onBindingsChange?: (bindings: CanvasAudioVoiceBinding[]) => void;
    onConfigChange: (key: CanvasAudioSettingKey, value: string) => void;
    buttonClassName?: string;
    placement?: SettingsPlacement;
}) {
    const { t } = useI18n();
    const theme = canvasThemes[useActiveTheme()];
    const isMusic = isMusicModelConfig(config);
    const supportsReferenceVoice = !isMusic && supportsAudioReferenceVoice(config, config.model || config.audioModel);
    const instrumental = config.musicInstrumental === "true";
    const summary = isMusic
        ? instrumental
            ? t("canvasExtra.audioSettings.instrumental")
            : t("canvasExtra.audioSettings.withVocals")
        : supportsReferenceVoice && config.audioMode === "unified_edit"
          ? upstreamText("参考音色配音")
          : `${audioVoiceLabel(config.audioVoice)} · ${audioFormatLabel(config.audioFormat)} · ${audioSpeedLabel(config.audioSpeed)}`;
    const label = isMusic ? t("canvasExtra.audioSettings.musicAria", { summary }) : t("canvasExtra.settingsPopover.audioAria", { summary });
    const title = isMusic ? t("canvasExtra.audioSettings.musicTitle", { summary }) : t("canvasExtra.settingsPopover.audioTitle", { summary });

    return (
        <CanvasSettingsPopover summary={summary} label={label} title={title} placement={placement} buttonClassName={buttonClassName}>
            {isMusic ? (
                <div className="space-y-4">
                    <label className="flex items-center justify-between gap-4 text-sm" style={{ color: theme.node.text }}>
                        <span>
                            {t("canvasExtra.audioSettings.instrumentalLabel")}
                            <small className="mt-1 block opacity-70" style={{ color: theme.node.muted }}>
                                {t("canvasExtra.audioSettings.instrumentalHelp")}
                            </small>
                        </span>
                        <Switch size="small" aria-label={t("canvasExtra.audioSettings.instrumentalLabel")} checked={instrumental} onChange={(checked) => onConfigChange("musicInstrumental", checked ? "true" : "false")} />
                    </label>
                </div>
            ) : supportsReferenceVoice ? (
                <CanvasAudioReferenceSettings config={config} references={references} bindings={bindings} onBindingsChange={onBindingsChange} onConfigChange={onConfigChange} />
            ) : (
                <AudioSettingsPanel config={config} onConfigChange={onConfigChange} theme={theme} className="space-y-4" />
            )}
        </CanvasSettingsPopover>
    );
}
