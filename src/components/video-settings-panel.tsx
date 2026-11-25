import { useI18n } from "@/i18n/use-i18n";
import { type ReactNode } from "react";
import { Switch } from "antd";

import { ChoiceButton, ChoiceTray, RatioTile } from "@/components/generation-choice-controls";
import { ImageSettingsTheme } from "@/components/image-settings-panel";
import { boolConfig, isSeedanceFastModel, isSeedanceVideoConfig, normalizeSeedanceDuration, normalizeSeedanceRatio, normalizeSeedanceResolution, seedanceRatioOptions } from "@/lib/seedance-video";
import { type CanvasTheme } from "@/lib/canvas-theme";
import { formatVideoResolutionLabel, normalizeVideoDuration, videoDimensionsForRatioAndResolution, videoResolutionComparisonKey, VIDEO_DURATION_MIN } from "@/lib/video-generation-options";
import { modelCapabilityConfigFor, resolveVideoRatioValue, resolveVideoResolutionValue, videoDurationOptions, videoSelectionAllowed, videoProfileForResolution, type VideoCapabilityConfig } from "@/lib/model-capabilities";
import { modelOptionName, resolveModelChannel, resolveModelRequestConfig, type AiConfig } from "@/stores/use-config-store";

const sizeOptions: Array<{ value: string; label: string; labelKey: "videoSettings.orientLandscape720" | "videoSettings.orientPortrait720" | "videoSettings.orientSquare" | "videoSettings.orientLandscape1792" | "videoSettings.orientPortraitLong" | "videoSettings.adaptive"; width: number; height: number }> = [
    { value: "1280x720", label: "1280x720", labelKey: "videoSettings.orientLandscape720", width: 1280, height: 720 },
    { value: "720x1280", label: "720x1280", labelKey: "videoSettings.orientPortrait720", width: 720, height: 1280 },
    { value: "1024x1024", label: "1024x1024", labelKey: "videoSettings.orientSquare", width: 1024, height: 1024 },
    { value: "1792x1024", label: "1792x1024", labelKey: "videoSettings.orientLandscape1792", width: 1792, height: 1024 },
    { value: "1024x1792", label: "1024x1792", labelKey: "videoSettings.orientPortraitLong", width: 1024, height: 1792 },
    { value: "auto", label: "auto", labelKey: "videoSettings.adaptive", width: 0, height: 0 },
];

type VideoSettingsPanelProps = {
    config: AiConfig;
    onConfigChange: (key: "vquality" | "size" | "videoSeconds" | "videoGenerateAudio" | "videoWatermark" | "videoArkPrivateAssetUpload", value: string) => void;
    theme: CanvasTheme;
    showTitle?: boolean;
    className?: string;
    isOptionAvailable?: (name: string, value: unknown) => boolean;
    optionPatch?: (name: string, value: unknown) => Record<string, unknown> | undefined;
};

export function VideoSettingsPanel({ config, onConfigChange, theme, showTitle = true, className = "w-[292px] space-y-3", isOptionAvailable = () => true, optionPatch }: VideoSettingsPanelProps) {
    const { t } = useI18n();
    const profile = modelCapabilityConfigFor(config, config.model).video!;
	const priceTiers = modelPriceTiers(config);
    const interfaceType = resolveModelRequestConfig(config, config.model).interfaceType;
    if (interfaceType === "volcengine-jimeng-video") {
		return <JiMengVideoSettingsPanel config={config} profile={profile} priceTiers={priceTiers} onConfigChange={onConfigChange} isOptionAvailable={isOptionAvailable} optionPatch={optionPatch} theme={theme} showTitle={showTitle} className={className} />;
    }
    if (isSeedanceVideoConfig(config) || interfaceType === "volcengine-ark-seedance-25") {
		return <SeedanceVideoSettingsPanel config={config} profile={profile} priceTiers={priceTiers} onConfigChange={onConfigChange} isOptionAvailable={isOptionAvailable} optionPatch={optionPatch} theme={theme} showTitle={showTitle} className={className} />;
    }

    const seconds = normalizeVideoDuration(config.videoSeconds);
    const resolution = resolveVideoResolutionValue(profile, config.vquality);
    const ratio = resolveVideoRatioValue(profile, config.size);
    const dimensions = videoDimensionsForRatioAndResolution(ratio, resolution);
    const sizeSupported = profile.ratios.length > 0;
    const configuredResolutions = profile.resolutions.map((value) => ({ value, label: formatVideoResolutionLabel(value) }));
    const generateAudio = boolConfig(config.videoGenerateAudio, profile.generateAudio.default);
    const watermark = boolConfig(config.videoWatermark, profile.watermark.default);

    return (
        <ImageSettingsTheme theme={theme}>
            <div className={className} style={{ color: theme.node.text }} onMouseDown={(event) => event.stopPropagation()}>
                {showTitle ? <div className="text-sm font-semibold">{t("videoSettings.title")}</div> : null}
                {configuredResolutions.length ? <SettingGroup title={t("videoSettings.resolution")} color={theme.node.muted}>
                    <ChoiceTray theme={theme} columns={`repeat(${Math.max(1, Math.min(configuredResolutions.length, 4))}, minmax(0, 1fr))`}>
                        {configuredResolutions.map((item) => (
							<OptionPill key={item.value} selected={resolution === item.value} disabled={!videoSelectionAllowed(profile, item.value, Number(seconds)) || !isOptionAvailable("vquality", item.value) || !hasPriceTierForVideoSelection(priceTiers, item.value, Number(seconds), optionPatch?.("vquality", item.value))} theme={theme} onClick={() => onConfigChange("vquality", item.value)}>
                                {item.label}
                            </OptionPill>
                        ))}
                    </ChoiceTray>
                </SettingGroup> : null}
                {sizeSupported ? <SettingGroup title={t("videoSettings.size")} color={theme.node.muted}>
                    {dimensions ? <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
                        <DimensionValue prefix="W" value={dimensions.width} theme={theme} />
                        <span className="text-xs opacity-45">×</span>
                        <DimensionValue prefix="H" value={dimensions.height} theme={theme} />
                    </div> : null}
                    <ChoiceTray theme={theme} columns="repeat(auto-fill, minmax(46px, 1fr))">
                        {profile.ratios.map((value) => (
                            <RatioTile key={value} label={isAdaptiveRatio(value) ? t("videoSettings.adaptive") : value} {...ratioPreview(value)} automatic={isAdaptiveRatio(value)} selected={ratio === value} disabled={!isOptionAvailable("size", value)} theme={theme} onClick={() => onConfigChange("size", value)} />
                        ))}
                    </ChoiceTray>
                </SettingGroup> : null}
                <SettingGroup title={t("videoSettings.seconds")} color={theme.node.muted}>
					<VideoDurationControl profile={videoProfileForResolution(profile, resolution)} value={Number(seconds)} theme={theme} disabled={(value) => !videoSelectionAllowed(profile, resolution, value) || !isOptionAvailable("videoSeconds", value) || !hasPriceTierForVideoSelection(priceTiers, resolution, value, optionPatch?.("videoSeconds", value))} onChange={(value) => onConfigChange("videoSeconds", String(value))} />
                </SettingGroup>
                {profile.generateAudio.supported || profile.watermark.supported ? <SettingGroup title={t("videoSettings.output")} color={theme.node.muted}><div className="grid grid-cols-2 gap-3 rounded-md px-2" style={{ background: theme.toolbar.itemHover }}>{profile.generateAudio.supported ? <SwitchRow label={t("videoSettings.audio")} checked={generateAudio} disabled={!isOptionAvailable("videoGenerateAudio", !generateAudio)} theme={theme} onChange={(checked) => onConfigChange("videoGenerateAudio", String(checked))} /> : null}{profile.watermark.supported ? <SwitchRow label={t("videoSettings.watermark")} checked={watermark} disabled={!isOptionAvailable("videoWatermark", !watermark)} theme={theme} onChange={(checked) => onConfigChange("videoWatermark", String(checked))} /> : null}</div></SettingGroup> : null}
            </div>
        </ImageSettingsTheme>
    );
}

function JiMengVideoSettingsPanel({ config, profile, priceTiers, onConfigChange, theme, showTitle, className, isOptionAvailable = () => true, optionPatch }: VideoSettingsPanelProps & { profile: VideoCapabilityConfig; priceTiers: ReturnType<typeof modelPriceTiers> }) {
    const { t } = useI18n();
    const seconds = normalizeVideoDuration(config.videoSeconds);
    return (
        <ImageSettingsTheme theme={theme}>
            <div className={className} style={{ color: theme.node.text }} onMouseDown={(event) => event.stopPropagation()}>
                {showTitle ? <div className="text-sm font-semibold">{t("videoSettings.title")}</div> : null}
                <SettingGroup title={t("videoSettings.ratio")} color={theme.node.muted}>
                    <ChoiceTray theme={theme} columns="repeat(auto-fill, minmax(46px, 1fr))">
                        {profile.ratios.map((value) => <RatioTile key={value} label={isAdaptiveRatio(value) ? t("videoSettings.adaptive") : value} {...ratioPreview(value)} automatic={isAdaptiveRatio(value)} selected={config.size === value} disabled={!isOptionAvailable("size", value)} theme={theme} onClick={() => onConfigChange("size", value)} />)}
                    </ChoiceTray>
                </SettingGroup>
                <SettingGroup title={t("videoSettings.seconds")} color={theme.node.muted}>
					<VideoDurationControl profile={profile} value={Number(seconds)} theme={theme} disabled={(value) => !isOptionAvailable("videoSeconds", value) || !hasPriceTierForVideoSelection(priceTiers, "*", value, optionPatch?.("videoSeconds", value))} onChange={(value) => onConfigChange("videoSeconds", String(value))} />
                </SettingGroup>
            </div>
        </ImageSettingsTheme>
    );
}

function SeedanceVideoSettingsPanel({ config, profile, priceTiers, onConfigChange, theme, showTitle, className, isOptionAvailable = () => true, optionPatch }: VideoSettingsPanelProps & { profile: VideoCapabilityConfig; priceTiers: ReturnType<typeof modelPriceTiers> }) {
    const { t } = useI18n();
    const model = modelOptionName(config.model || config.videoModel);
    const resolution = normalizeSeedanceResolution(config.vquality, model);
    const ratio = normalizeSeedanceRatio(config.size);
    const duration = normalizeSeedanceDuration(config.videoSeconds);
    const generateAudio = boolConfig(config.videoGenerateAudio, profile.generateAudio.default);
    const watermark = boolConfig(config.videoWatermark, profile.watermark.default);
    const useArkPrivateAssets = boolConfig(config.videoArkPrivateAssetUpload, true);
    const interfaceType = resolveModelRequestConfig(config, config.model).interfaceType;
    const isArkSeedance = interfaceType === "volcengine-ark-video" || interfaceType === "volcengine-ark-seedance-25";

    return (
        <ImageSettingsTheme theme={theme}>
            <div className={className} style={{ color: theme.node.text }} onMouseDown={(event) => event.stopPropagation()}>
                {showTitle ? <div className="text-sm font-semibold">{t("videoSettings.title")}</div> : null}
                <SettingGroup title={t("videoSettings.resolution")} color={theme.node.muted}>
                    <ChoiceTray theme={theme} columns={`repeat(${Math.max(1, Math.min(profile.resolutions.length, 4))}, minmax(0, 1fr))`}>
                        {profile.resolutions.map((value) => {
                            const item = { value, label: value.toUpperCase() };
							const disabled = !isOptionAvailable("vquality", item.value) || (item.value === "1080p" && isSeedanceFastModel(model)) || !hasPriceTierForVideoSelection(priceTiers, item.value, duration, optionPatch?.("vquality", item.value));
                            return (
                                <OptionPill key={item.value} selected={resolution === item.value} disabled={disabled} theme={theme} onClick={() => onConfigChange("vquality", item.value)}>
                                    {item.label}
                                </OptionPill>
                            );
                        })}
                    </ChoiceTray>
                    {isSeedanceFastModel(model) ? <div className="text-[var(--fs-tiny)] leading-4 opacity-55">{t("videoSettings.fast")}</div> : null}
                </SettingGroup>
                <SettingGroup title={t("videoSettings.ratio")} color={theme.node.muted}>
                    <ChoiceTray theme={theme} columns="repeat(auto-fill, minmax(46px, 1fr))">
                        {profile.ratios.map((value) => <RatioTile key={value} label={isAdaptiveRatio(value) ? t("videoSettings.adaptive") : value} {...ratioPreview(value)} automatic={isAdaptiveRatio(value)} selected={ratio === value} disabled={!isOptionAvailable("size", value)} theme={theme} onClick={() => onConfigChange("size", value)} />)}
                    </ChoiceTray>
                </SettingGroup>
                <SettingGroup title={t("videoSettings.duration")} color={theme.node.muted}>
					<VideoDurationControl profile={profile} value={duration} theme={theme} disabled={(value) => !isOptionAvailable("videoSeconds", value) || !hasPriceTierForVideoSelection(priceTiers, resolution, value, optionPatch?.("videoSeconds", value))} onChange={(value) => onConfigChange("videoSeconds", String(value))} />
                </SettingGroup>
                <SettingGroup title={t("videoSettings.output")} color={theme.node.muted}>
                    <div className="grid grid-cols-2 gap-3 rounded-md px-2" style={{ background: theme.toolbar.itemHover }}>
                        {profile.generateAudio.supported ? <SwitchRow label={t("videoSettings.audio")} checked={generateAudio} disabled={!isOptionAvailable("videoGenerateAudio", !generateAudio)} theme={theme} onChange={(checked) => onConfigChange("videoGenerateAudio", String(checked))} /> : null}
                        {profile.watermark.supported ? <SwitchRow label={t("videoSettings.watermark")} checked={watermark} disabled={!isOptionAvailable("videoWatermark", !watermark)} theme={theme} onChange={(checked) => onConfigChange("videoWatermark", String(checked))} /> : null}
                    </div>
                </SettingGroup>
                {isArkSeedance ? (
                    <SettingGroup title={t("videoSettings.references")} color={theme.node.muted}>
                        <div className="rounded-md px-2" style={{ background: theme.toolbar.itemHover }}>
                            <SwitchRow label={t("videoSettings.sync")} checked={useArkPrivateAssets} theme={theme} onChange={(checked) => onConfigChange("videoArkPrivateAssetUpload", String(checked))} />
                        </div>
                    </SettingGroup>
                ) : null}
            </div>
        </ImageSettingsTheme>
    );
}

export function videoResolutionLabel(value: string) {
    return formatVideoResolutionLabel(value);
}

export function videoSizeLabel(value: string, t?: ReturnType<typeof useI18n>["t"]) {
    const ratio = normalizeSeedanceRatio(value);
    if (value === "adaptive" || value === "auto") return t ? t("videoSettings.adaptive") : value;
    // The compact summary must mirror the selected value (for example 16:9),
    // while the settings panel can still use semantic labels such as 横屏.
    if (ratio === value) return ratio;
    const size = normalizeVideoSizeValue(value);
    if (t) {
        if (size === "1280x720") return t("videoSettings.landscape");
        if (size === "720x1280") return t("videoSettings.portrait");
        if (size === "1024x1024") return t("videoSettings.square");
        if (size === "1792x1024") return t("videoSettings.wide");
        if (size === "1024x1792") return t("videoSettings.tall");
    }
    const found = sizeOptions.find((item) => item.value === size);
    if (!found) return size;
    return t ? t(found.labelKey) : found.label;
}


export function videoSecondsLabel(value: string, i18n?: Pick<ReturnType<typeof useI18n>, "t" | "number">) {
    if (i18n) return i18n.t("videoSettings.secondsValue", { seconds: i18n.number(Number(normalizeVideoDuration(value))) });
    return `${normalizeVideoDuration(value)}s`;
}

export function normalizeVideoSizeValue(value: string) {
    if (value === "auto") return "auto";
    if (/^\d+x\d+$/.test(value || "")) return value;
    return ["9:16", "2:3", "3:4"].includes(value) ? "720x1280" : "1280x720";
}

function OptionPill({ selected, disabled = false, theme, onClick, children }: { selected: boolean; disabled?: boolean; theme: CanvasTheme; onClick: () => void; children: ReactNode }) {
    return <ChoiceButton selected={selected} disabled={disabled} theme={theme} onClick={onClick}>{children}</ChoiceButton>;
}

function SettingGroup({ title, color, children }: { title: string; color: string; children: ReactNode }) {
    return (
        <div className="space-y-2">
            <div className="text-xs font-semibold" style={{ color }}>
                {title}
            </div>
            {children}
        </div>
    );
}

function DimensionValue({ prefix, value, theme }: { prefix: string; value: number; theme: CanvasTheme }) {
    return (
        <div className="flex h-8 overflow-hidden rounded-md text-[var(--fs-label)]" style={{ background: theme.toolbar.itemHover, color: theme.node.text }}>
            <span className="grid w-7 place-items-center" style={{ color: theme.node.muted }}>
                {prefix}
            </span>
            <span className="min-w-0 flex-1 px-2 leading-8 tabular-nums">{value}</span>
        </div>
    );
}

function DurationInput({ value, min, max, theme, onChange }: { value: number; min: number; max?: number; theme: CanvasTheme; onChange: (value: number) => void }) {
    const { t } = useI18n();
    const commit = (input: HTMLInputElement) => {
        const next = Math.min(max || Number.POSITIVE_INFINITY, Math.max(min, Math.floor(Number(input.value) || value || min)));
        input.value = String(next);
        onChange(next);
    };

    return (
        <label className="flex h-8 w-20 shrink-0 items-center overflow-hidden rounded-md border text-[var(--fs-label)]" style={{ background: theme.toolbar.itemHover, borderColor: theme.toolbar.border, color: theme.node.text }}>
            <input
                key={`${min}-${value}`}
                type="number"
                inputMode="numeric"
                min={min}
                max={max}
                defaultValue={value}
                aria-label={t("videoSettings.durationAria")}
                className="min-w-0 flex-1 bg-transparent pl-2 text-right outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                onBlur={(event) => commit(event.currentTarget)}
                onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                }}
                onMouseDown={(event) => event.stopPropagation()}
            />
            <span className="shrink-0 px-1.5" style={{ color: theme.node.muted }}>{t("videoSettings.secondUnit")}</span>
        </label>
    );
}

function VideoDurationControl({ profile, value, theme, disabled, onChange }: { profile: VideoCapabilityConfig; value: number; theme: CanvasTheme; disabled?: (value: number) => boolean; onChange: (value: number) => void }) {
    const { t, number } = useI18n();
    if (profile.duration.selection === "range") {
        const min = profile.duration.min || VIDEO_DURATION_MIN;
        const max = Math.max(min, profile.duration.max || min);
        const step = Math.max(1, profile.duration.step || 1);
        const normalized = normalizeDurationValue(value, profile.duration.default, min, max, step);
		return <DurationRangeControl value={normalized} min={min} max={max} step={step} theme={theme} onChange={(next) => { if (!disabled?.(next)) onChange(next); }} />;
    }

    const options = videoDurationOptions(profile);
    return <ChoiceTray theme={theme} columns={`repeat(${Math.max(1, Math.min(options.length, 4))}, minmax(0, 1fr))`}>
		{options.map((option) => <OptionPill key={option} selected={normalizedNumber(value) === option} disabled={disabled?.(option)} theme={theme} onClick={() => onChange(option)}>{t("videoSettings.secondsValue", { seconds: number(option) })}</OptionPill>)}
    </ChoiceTray>;
}

function modelPriceTiers(config: AiConfig) {
	const channel = resolveModelChannel(config, config.model);
	const cost = channel.modelCosts?.find((item) => item.model === modelOptionName(config.model));
	return cost?.logicalPriceTiers || [];
}

function hasPriceTierForVideoSelection(tiers: ReturnType<typeof modelPriceTiers>, resolution: string, seconds: number, patch?: Record<string, unknown>) {
	resolution = String(patch?.vquality ?? resolution);
	seconds = Number(patch?.videoSeconds ?? seconds);
	if (!tiers.length) return true;
	const normalizedResolution = normalizeTierResolution(resolution);
	return tiers.some((tier) => {
		const selector = tier.selector || {};
		const tierResolution = selector.vquality || tier.resolution;
		const tierSeconds = selector.videoSeconds ? Number(selector.videoSeconds) : tier.videoSeconds;
		return (tierResolution === "*" || !tierResolution || normalizeTierResolution(tierResolution) === normalizedResolution) && (!tierSeconds || tierSeconds === seconds);
	});
}

function normalizeTierResolution(value: string) {
	return videoResolutionComparisonKey(value);
}

function DurationRangeControl({ value, min, max, step, theme, onChange }: { value: number; min: number; max: number; step: number; theme: CanvasTheme; onChange: (value: number) => void }) {
    const { t, number } = useI18n();
    return <div className="space-y-1.5">
        <div className="flex min-w-0 items-center gap-2">
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                aria-label={t("videoSettings.durationAria")}
                className="video-duration-range h-8 min-w-0 flex-1"
                style={{ accentColor: theme.accent.primary }}
                onChange={(event) => onChange(Number(event.target.value))}
                onMouseDown={(event) => event.stopPropagation()}
            />
            <DurationInput value={value} min={min} max={max} theme={theme} onChange={onChange} />
        </div>
        <div className="flex justify-between px-0.5 text-[var(--fs-tiny)]" style={{ color: theme.node.muted }}>
            <span>{t("videoSettings.secondsValue", { seconds: number(min) })}</span>
            <span>{t("videoSettings.secondsValue", { seconds: number(max) })}</span>
        </div>
    </div>;
}

function normalizeDurationValue(value: number, fallback: number, min: number, max: number, step: number) {
    const candidate = Number.isFinite(value) ? value : fallback;
    const clamped = Math.min(max, Math.max(min, Math.floor(candidate)));
    const maxStep = Math.max(0, Math.floor((max - min) / step));
    return min + Math.min(maxStep, Math.max(0, Math.round((clamped - min) / step))) * step;
}

function normalizedNumber(value: number) {
    return Number.isFinite(value) ? Math.floor(value) : 0;
}

function ratioPreview(ratio: string) {
    const match = ratio.trim().match(/^(\d+(?:\.\d+)?)\s*[:x]\s*(\d+(?:\.\d+)?)$/i);
    if (!match) return { width: 0, height: 0 };
    return { width: Number(match[1]), height: Number(match[2]) };
}

function isAdaptiveRatio(value: string) {
    const normalized = value.trim().toLowerCase();
    return normalized === "auto" || normalized === "adaptive";
}

function SwitchRow({ label, checked, disabled, theme, onChange }: { label: string; checked: boolean; disabled?: boolean; theme: CanvasTheme; onChange: (checked: boolean) => void }) {
    return (
        <div className="flex h-8 items-center justify-between gap-2">
            <span className="min-w-0 whitespace-nowrap text-[var(--fs-label)]" style={{ color: theme.node.text }}>
                {label}
            </span>
            <span className="shrink-0" onMouseDown={(event) => event.stopPropagation()}>
                <Switch size="small" checked={checked} disabled={disabled} onChange={onChange} />
            </span>
        </div>
    );
}
