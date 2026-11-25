import { useId, useState, memo } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";
import type { MessageKey } from "@/i18n/messages";
import type { AIVideoTemplateOption, AIVideoTemplateDetail } from "@/types/ai-video-template";

type GenerationOptionsProps = {
    models?: AIVideoTemplateDetail["models"];
    model?: string;
    onModelChange: (id: string) => void;
    mode: "face_replace" | "scene_match";
    onModeChange: (mode: "face_replace" | "scene_match") => void;
    options: AIVideoTemplateOption[];
    selectedOptionIds: string[];
    onToggleOption: (id: string) => void;
    sceneInput: string;
    onSceneInputChange: (val: string) => void;
    resolution: "480p" | "720p";
    onResolutionChange: (res: "480p" | "720p") => void;
};

/** Everything except photo + Make lives behind one quiet "More options" disclosure. */
export const GenerationOptions = memo(function GenerationOptions({ models, model, onModelChange, mode, onModeChange, options, selectedOptionIds, onToggleOption, sceneInput, onSceneInputChange, resolution, onResolutionChange }: GenerationOptionsProps) {
    const { t } = useI18n();
    const [open, setOpen] = useState(false);
    const sheetId = useId();
    const sceneId = useId();
    // Unknown label keys would render raw key text; such options stay hidden until translated.
    const visibleOptions = options.filter((opt) => !(mode === "scene_match" && opt.id === "keep-background-light") && t(opt.labelKey as MessageKey) !== opt.labelKey);

    return (
        <div className="aivt-more">
            <button type="button" className="aivt-more-toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls={sheetId}>
                <span>{t("aiVideoTemplates.moreOptions")}</span>
                <ChevronDown aria-hidden="true" />
            </button>
            <div id={sheetId} className="aivt-more-sheet" hidden={!open}>
                {models && models.length > 1 && (
                    <div className="aivt-more-row">
                        <p className="aivt-label">{t("aiVideoTemplates.modelTitle")}</p>
                        <div className="aivt-segmented is-block" role="group" aria-label={t("aiVideoTemplates.modelTitle")}>
                            {models.map((item) => (
                                <button key={item.id} type="button" className={model === item.id ? "is-active" : undefined} aria-pressed={model === item.id} onClick={() => onModelChange(item.id)}>
                                    {t(item.labelKey as MessageKey) !== item.labelKey ? t(item.labelKey as MessageKey) : t(item.id.includes("2.5") ? "aiVideoTemplates.modelQuality" : "aiVideoTemplates.modelEconomy")}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {mode === "scene_match" && (
                    <div className="aivt-more-row">
                        <label className="aivt-label" htmlFor={sceneId}>
                            {t("aiVideoTemplates.sceneTitle")}
                        </label>
                        <input id={sceneId} type="text" value={sceneInput} onChange={(e) => onSceneInputChange(e.target.value)} placeholder={t("aiVideoTemplates.scenePlaceholder")} className="aivt-input" />
                    </div>
                )}

                {visibleOptions.length > 0 && (
                    <div className="aivt-more-row">
                        <p className="aivt-label">{t("aiVideoTemplates.optionsTitle")}</p>
                        <div className="aivt-option-chips">
                            {visibleOptions.map((opt) => {
                                const selected = selectedOptionIds.includes(opt.id);
                                return (
                                    <button key={opt.id} type="button" className={`aivt-option${selected ? " is-active" : ""}`} aria-pressed={selected} onClick={() => onToggleOption(opt.id)}>
                                        {selected && <Check aria-hidden="true" />}
                                        <span>{t(opt.labelKey as MessageKey)}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="aivt-more-row">
                    <p className="aivt-label">{t("aiVideoTemplates.resolutionTitle")}</p>
                    <div className="aivt-segmented" role="group" aria-label={t("aiVideoTemplates.resolutionTitle")}>
                        {(models?.find((item) => item.id === model)?.resolutions || (["720p", "480p"] as const)).map((value) => (
                            <button key={value} type="button" className={resolution === value ? "is-active" : undefined} aria-pressed={resolution === value} onClick={() => onResolutionChange(value)}>
                                {value}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
});
