import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { Check, ChevronDown, Coins } from "lucide-react";
import { Popover } from "antd";
import { useI18n } from "@/i18n/use-i18n";
import { localizeModelCompatibilityMessage } from "@/i18n/model-validation";

import { canvasThemes, type CanvasTheme } from "@/lib/canvas-theme";
import { modelCapabilityConfigFor, videoDurationOptions } from "@/lib/model-capabilities";
import { modelQuoteRequest, normalizeTierResolution, priceTiersForCurrentSelection } from "@/lib/model-pricing";
import { compatibleModelInGroup, configuredModelDisplayName, groupModelsByDisplayName, isOfficialPlatformModel, modelCompatibilityError, resolveCompatibleModel, type ModelRequirements } from "@/lib/model-selection";
import { cn } from "@/lib/utils";
import { modelDisplayName, modelIcon, modelOptionName, PUBLIC_MODEL_CATALOG_ID, resolveModelChannel, selectableModelsByCapability, type AiConfig, type ModelCapability } from "@/stores/use-config-store";
import { useActiveTheme } from "@/stores/canvas/use-canvas-theme-store";
import { useUserStore } from "@/stores/use-user-store";
import { ModelLogo } from "@/components/model-logo";
import { modelFamily } from "@/lib/model-brand";
import { quoteModelCatalog, type ModelCatalogQuote } from "@/services/api/logical-models";
import { usePriceRevision } from "@/hooks/use-price-revision";

type ModelPickerProps = {
    modelFilter?: (model: string) => boolean;
    config: AiConfig;
    value?: string;
    onChange: (model: string) => void;
    capability?: ModelCapability;
    className?: string;
    popoverClassName?: string;
    fullWidth?: boolean;
    placeholder?: string;
    onMissingConfig?: () => void;
    showSelectedPrice?: boolean;
    showOptionPrices?: boolean;
    variant?: "default" | "creation";
    requirements?: ModelRequirements;
    showConfiguredModelName?: boolean;
};

export function ModelPicker({
    config,
    value,
    onChange,
    capability,
    className,
    popoverClassName,
    fullWidth = false,
    placeholder: customPlaceholder,
    onMissingConfig,
    showSelectedPrice = true,
    showOptionPrices = showSelectedPrice,
    variant = "default",
    requirements,
    modelFilter,
    showConfiguredModelName = false,
}: ModelPickerProps) {
    const i18n = useI18n();
    const { t } = i18n;
    const placeholder = customPlaceholder ?? t("modelPickerShell.choose");
    const creditsEnabled = useUserStore((state) => state.features.creditsEnabled);
    const pickerId = useId();
    // 双保险：即使 store merge 写出非法 theme，这里也兜底到 dark，避免 "reading 'node'" 崩溃
    const rawTheme = useActiveTheme();
    const theme = (canvasThemes[rawTheme as keyof typeof canvasThemes] ?? canvasThemes.dark) as CanvasTheme;
    const [open, setOpen] = useState(false);
    const [menuPrepared, setMenuPrepared] = useState(false);
    const [triggerWidth, setTriggerWidth] = useState<number | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const options = useMemo(() => Array.from(new Set(selectableModelsByCapability(config, capability).filter((model) => Boolean(model) && (!modelFilter || modelFilter(model))))), [capability, config, modelFilter]);
    const optionGroups = useMemo(() => {
        const officialGroups = groupModelsByDisplayName(
            config,
            options.filter((model) => isOfficialPlatformModel(config, model)),
        );
        const companies = new Map<string, typeof officialGroups>();
        for (const group of officialGroups) {
            const company = modelFamily(modelDisplayName(config, group.models[0])) || t("modelPickerShell.platform");
            companies.set(company, [...(companies.get(company) || []), group]);
        }
        const channelGroups = [
            ...config.channels
                .filter((channel) => channel.scope !== "system")
                .map((channel) => ({
                    key: channel.id,
                    label: channel.name || t("modelPickerShell.unnamed"),
                    scope: channel.id === PUBLIC_MODEL_CATALOG_ID ? "" : t("modelPickerShell.mine"),
                    models: groupModelsByDisplayName(
                        config,
                        options.filter((model) => resolveModelChannel(config, model).id === channel.id),
                    ),
                }))
                .filter((group) => group.models.length),
            ...Array.from(companies, ([company, models]) => ({
                key: `official-${company}`,
                label: company,
                scope: "",
                models,
            })),
        ];
        // options 已由当前有效渠道重建；任何无法解析渠道的旧值都直接丢弃，
        // 不再显示“其他模型 / 未指定渠道”这种不可用入口。
        return channelGroups;
    }, [config, options, t]);
    const storedCurrent = value?.trim() || "";
    // 参数档位会在选中模型后由调用方归一到其能力配置，不能因为旧模型留下的参数而禁止切换。
    const selectionRequirements = requirements ? { ...requirements, videoSeconds: undefined, imageSize: undefined, options: undefined } : undefined;
    const resolvedCurrent = resolveCompatibleModel(config, storedCurrent, selectionRequirements) || storedCurrent;
    // 旧画布可能保存过已下架或前端历史内置模型；它们不能重新进入当前可选目录。
    const current = options.includes(resolvedCurrent) ? resolvedCurrent : "";
    const currentIsPlatformModel = Boolean(current) && isOfficialPlatformModel(config, current);
    const currentPrice = currentIsPlatformModel ? modelMenuPrice(config, current, i18n, capability, false, requirements) : undefined;
    const quoteRequest = useMemo(() => (currentIsPlatformModel ? modelQuoteRequest(config, current, capability, requirements) : undefined), [capability, config, current, currentIsPlatformModel, requirements]);
    const quoteRequestKey = JSON.stringify(quoteRequest);
    const [routeQuote, setRouteQuote] = useState<ModelCatalogQuote | undefined>();
    const priceRevision = usePriceRevision();
    const creationVariant = variant === "creation";

    useLayoutEffect(() => {
        const trigger = triggerRef.current;
        if (!trigger) return;
        // The observer reports once after layout (before paint); a synchronous read here forced a full
        // layout of every freshly mounted page that renders a model picker.
        const observer = new ResizeObserver(([entry]) => setTriggerWidth(Math.ceil(entry?.borderBoxSize?.[0]?.inlineSize ?? trigger.getBoundingClientRect().width)));
        observer.observe(trigger);
        return () => observer.disconnect();
    }, [className, fullWidth, showSelectedPrice, variant, value]);

    useEffect(() => {
        if (!showSelectedPrice || !creditsEnabled || !quoteRequest) {
            setRouteQuote(undefined);
            return;
        }
        const controller = new AbortController();
        setRouteQuote(undefined);
        quoteModelCatalog(quoteRequest, controller.signal)
            .then((payload) => { if (!controller.signal.aborted) setRouteQuote(payload.quote); })
            .catch(() => {
                if (!controller.signal.aborted) setRouteQuote(undefined);
            });
        return () => controller.abort();
    }, [creditsEnabled, priceRevision, quoteRequestKey, showSelectedPrice]);

    useEffect(() => {
        const closeOtherPicker = (event: Event) => {
            if ((event as CustomEvent<string>).detail !== pickerId) setOpen(false);
        };
        window.addEventListener("model-picker-open", closeOtherPicker);
        return () => window.removeEventListener("model-picker-open", closeOtherPicker);
    }, [pickerId]);

    useEffect(() => {
        if (!open) return;
        // 画布拖拽从 pointerdown 开始，须在捕获阶段关闭 Portal 菜单，避免菜单与触发器分离。
        const closeOnOutsidePointer = (event: PointerEvent) => {
            const target = event.target;
            if (!(target instanceof Node)) return;
            if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
            setOpen(false);
        };
        window.addEventListener("pointerdown", closeOnOutsidePointer, true);
        return () => window.removeEventListener("pointerdown", closeOnOutsidePointer, true);
    }, [open]);

    const setPickerOpen = (nextOpen: boolean) => {
        if (nextOpen && !options.length && config.channelMode === "local") onMissingConfig?.();
        if (nextOpen) window.dispatchEvent(new CustomEvent("model-picker-open", { detail: pickerId }));
        setOpen(nextOpen);
    };
    const focusMenuOption = (last = false) => {
        window.requestAnimationFrame(() => {
            const buttons = menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]');
            const target = last ? buttons?.item((buttons?.length || 1) - 1) : buttons?.item(0);
            target?.focus();
        });
    };
    const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
        event.preventDefault();
        setPickerOpen(true);
        focusMenuOption(event.key === "ArrowUp");
    };
    const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
            triggerRef.current?.focus();
            return;
        }
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
        const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="option"]'));
        if (!buttons.length) return;
        event.preventDefault();
        const activeIndex = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : event.key === "ArrowUp" ? Math.max(0, activeIndex - 1) : Math.min(buttons.length - 1, activeIndex + 1);
        buttons[nextIndex]?.focus();
    };
    const content = (
        <div
            ref={menuRef}
            data-canvas-no-zoom
            className={cn("canvas-model-picker-menu max-w-[calc(100vw-24px)]", creationVariant ? "creation-model-picker-menu w-[360px]" : "w-[var(--panel-width-compact)]")}
            style={
                {
                    background: theme.node.panel,
                    color: theme.node.text,
                    "--canvas-model-picker-trigger-width": triggerWidth ? String(triggerWidth) + "px" : undefined,
                    "--model-picker-background": theme.node.panel,
                    "--model-picker-text": theme.node.text,
                    "--model-picker-muted": theme.node.muted,
                    "--model-picker-icon-background": theme.toolbar.itemHover,
                } as CSSProperties
            }
            role="listbox"
            aria-label={placeholder}
            onKeyDown={handleMenuKeyDown}
            onMouseDown={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
        >
            {creationVariant ? (
                <div className="creation-model-picker-heading">
                    <span>{t("modelPickerShell.choose")}</span>
                    {current ? <strong>{pickerModelDisplayName(config, current, showConfiguredModelName)}</strong> : null}
                </div>
            ) : null}
            {optionGroups.length ? (
                optionGroups.map((group) => (
                    <section key={group.key} className="canvas-model-picker-group min-w-0 overflow-hidden">
                        <div className="canvas-model-picker-group-label" style={{ color: theme.node.muted }}>
                            <span className="truncate">{group.label}</span>
                            {group.scope ? (
                                <span className="shrink-0" style={{ color: theme.node.muted }}>
                                    {group.scope}
                                </span>
                            ) : null}
                        </div>
                        <div className="grid min-w-0 gap-1">
                            {group.models.map((modelGroup) => {
                                const selected = modelGroup.models.includes(current);
                                const model = compatibleModelInGroup(config, modelGroup.models, selectionRequirements, selected ? current : undefined);
                                const displayModel = model || (selected ? current : modelGroup.models[0]);
                                const disabledReason = model ? "" : localizeModelCompatibilityMessage(modelCompatibilityError(config, modelGroup.models[0], selectionRequirements), i18n) || t("modelPickerShell.incompatible");
                                return (
                                    <button
                                        key={modelGroup.key}
                                        type="button"
                                        role="option"
                                        aria-selected={selected}
                                        aria-disabled={Boolean(disabledReason)}
                                        disabled={Boolean(disabledReason)}
                                        title={disabledReason || pickerModelOptionLabel(config, displayModel, showConfiguredModelName)}
                                        className="canvas-model-picker-option disabled:cursor-not-allowed disabled:opacity-45"
                                        style={{ background: selected ? theme.toolbar.activeBg : "transparent", color: theme.node.text }}
                                        onClick={() => {
                                            if (!model) return;
                                            onChange(model);
                                            setOpen(false);
                                            window.requestAnimationFrame(() => triggerRef.current?.focus());
                                        }}
                                    >
                                        <ModelLabel
                                            config={config}
                                            model={displayModel}
                                            capability={capability}
                                            theme={theme}
                                            creationVariant={creationVariant}
                                            showConfiguredModelName={showConfiguredModelName}
                                            showPrice={creditsEnabled}
                                            showOptionPrices={showOptionPrices}
                                            disabledReason={disabledReason}
                                        />
                                        {selected ? <Check className="canvas-model-picker-option-check" style={{ color: theme.node.activeStroke }} /> : null}
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                ))
            ) : (
                <div className="canvas-model-picker-empty" style={{ color: theme.node.muted }}>
                    {emptyModelLabel(config, capability, t)}
                </div>
            )}
        </div>
    );

    return (
        <div className={cn(fullWidth ? "w-full min-w-0" : "w-fit max-w-full")} onMouseDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
            <Popover
                open={open}
                forceRender={menuPrepared}
                onOpenChange={setPickerOpen}
                trigger="click"
                placement="bottomLeft"
                arrow={false}
                content={content}
                classNames={{
                    root: cn("canvas-model-picker-popover", creationVariant && "creation-model-picker-popover", popoverClassName),
                    container: cn("canvas-composer-popover-surface", creationVariant && "creation-model-picker-surface"),
                    content: "canvas-composer-popover-content",
                }}
            >
                <button
                    ref={triggerRef}
                    type="button"
                    className={cn("canvas-composer-model-picker", fullWidth ? "w-full" : "min-w-36 max-w-full", className)}
                    aria-haspopup="listbox"
                    aria-expanded={open}
                    aria-label={placeholder}
                    title={current ? pickerModelOptionLabel(config, current, showConfiguredModelName) : placeholder}
                    onKeyDown={handleTriggerKeyDown}
                    onPointerEnter={() => setMenuPrepared(true)}
                    onFocus={() => setMenuPrepared(true)}
                >
                    <span className="canvas-model-picker-label flex min-w-0 items-center gap-1.5">
                        <span className="canvas-model-picker-trigger-icon" style={{ background: theme.toolbar.itemHover }}>
                            <ModelIcon config={config} model={current} />
                        </span>
                        <span className="min-w-0 flex-1 truncate">{current ? (creationVariant ? pickerModelDisplayName(config, current, showConfiguredModelName) : pickerModelOptionLabel(config, current, showConfiguredModelName)) : placeholder}</span>
                        {showSelectedPrice && creditsEnabled && currentIsPlatformModel ? <ModelPrice price={currentPrice} quote={routeQuote} compact /> : null}
                    </span>
                    <ChevronDown className={cn("canvas-model-picker-chevron", open && "is-open")} aria-hidden="true" />
                </button>
            </Popover>
        </div>
    );
}

function emptyModelLabel(config: AiConfig, capability: ModelCapability | undefined, t: ReturnType<typeof useI18n>["t"]) {
    const label = capability === "image" ? t("modelPickerShell.image") : capability === "video" ? t("modelPickerShell.video") : capability === "text" ? t("modelPickerShell.text") : capability === "audio" ? t("modelPickerShell.audio") : "";
    if (capability && config.models.length) return t("modelPickerShell.noInput", { type: label });
    return config.models.length ? t("modelPickerShell.noMatch", { type: label }) : t("modelPickerShell.none");
}

function ModelLabel({
    config,
    model,
    capability,
    theme,
    creationVariant,
    showConfiguredModelName,
    showPrice,
    showOptionPrices = true,
    disabledReason,
}: {
    config: AiConfig;
    model: string;
    capability?: ModelCapability;
    theme: (typeof canvasThemes)[keyof typeof canvasThemes];
    creationVariant: boolean;
    showConfiguredModelName: boolean;
    showPrice: boolean;
    showOptionPrices?: boolean;
    disabledReason?: string;
}) {
    const i18n = useI18n();
    const { t } = i18n;
    const meta = modelMenuMeta(modelDisplayName(config, model), capability, t);
    const capabilitySummary = disabledReason || meta.description;
    return (
        <span className="flex w-full min-w-0 items-center gap-1.5 overflow-hidden py-0">
            <span className="grid size-6 shrink-0 place-items-center rounded-md" style={{ background: theme.toolbar.itemHover }}>
                <ModelIcon config={config} model={model} />
            </span>
            <span className="min-w-0 flex-1 overflow-hidden">
                <span className="block min-w-0 truncate text-[var(--fs-label)] font-medium leading-none" style={{ color: theme.node.text }}>
                    {pickerModelDisplayName(config, model, showConfiguredModelName)}
                </span>
                <span className="mt-1 block whitespace-normal text-[var(--fs-tiny)] leading-relaxed" style={{ color: theme.node.muted }} title={capabilitySummary}>
                    {capabilitySummary}
                </span>
            </span>
        </span>
    );
}

function logicalCapabilitySummary(spec: NonNullable<NonNullable<AiConfig["channels"][number]["modelCosts"]>[number]["logicalCapabilitySpec"]>, { t, number }: ReturnType<typeof useI18n>) {
    const operationLabels: Record<string, string> = {
        text_to_video: t("modelPickerPrice.textVideo"),
        image_to_video: t("modelPickerPrice.imageVideo"),
        reference_to_video: t("modelPickerCapability.reference"),
        audio_to_video: t("modelPickerCapability.audioVideo"),
        extend: t("modelPickerCapability.extend"),
        inpaint: t("modelPickerCapability.inpaint"),
        replace_element: t("modelPickerCapability.replace"),
        camera_motion: t("modelPickerCapability.camera"),
        style_transfer: t("modelPickerCapability.style"),
    };
    const inputLabels: Record<string, { label: string; unit: string }> = {
        image: { label: spec.capability === "text" ? t("modelPickerCapability.imageUnderstand") : t("modelPickerCapability.image"), unit: t("modelPickerCapability.sheets") },
        video: { label: spec.capability === "text" ? t("modelPickerCapability.videoUnderstand") : t("modelPickerCapability.video"), unit: t("modelPickerCapability.items") },
        audio: { label: t("modelPickerCapability.audio"), unit: t("modelPickerCapability.items") },
        mask: { label: t("modelPickerCapability.mask"), unit: t("modelPickerCapability.sheets") },
    };
    const optionLabels: Record<string, string> = {
        size: t("modelPickerCapability.aspect"),
        aspectRatio: t("modelPickerCapability.aspect"),
        quality: t("modelPickerCapability.quality"),
        count: t("modelPickerCapability.count"),
        videoSeconds: t("modelPickerCapability.duration"),
        duration: t("modelPickerCapability.duration"),
        vquality: t("modelPickerCapability.resolution"),
        resolution: t("modelPickerCapability.resolution"),
        audioVoice: t("modelPickerCapability.voice"),
        audioFormat: t("modelPickerCapability.format"),
        audioSpeed: t("modelPickerCapability.speed"),
    };
    const values: string[] = [];
    values.push(...(spec.operations || []).flatMap((operation) => (Object.hasOwn(operationLabels, operation) ? [operationLabels[operation]] : [])));
    for (const [name, constraint] of Object.entries(spec.inputs || {})) {
        if (constraint.max <= 0) continue;
        const definition = Object.hasOwn(inputLabels, name) ? inputLabels[name] : undefined;
        if (!definition) continue;
        values.push(spec.capability === "text" ? t("modelPickerCapability.supports", { label: definition.label }) : t("modelPickerCapability.maximum", { label: definition.label, count: number(constraint.max), unit: definition.unit }));
    }
    for (const [name, constraint] of Object.entries(spec.options || {})) {
        const label = Object.hasOwn(optionLabels, name) ? optionLabels[name] : undefined;
        if (!label) continue;
        if (constraint.values?.length) values.push(`${label} ${constraint.values.map((value) => publicScalarLabel(value, t, number)).join("/")}`);
        else if (constraint.min !== undefined && constraint.max !== undefined) values.push(`${label} ${number(constraint.min)}-${number(constraint.max)}`);
    }
    return values.slice(0, 2).join(" · ") || t("modelPickerCapability.auto");
}

function publicScalarLabel(value: unknown, t: ReturnType<typeof useI18n>["t"], number: ReturnType<typeof useI18n>["number"]) {
    if (value === true) return t("modelPickerCapability.enabled");
    if (value === false) return t("modelPickerCapability.disabled");
    return typeof value === "number" ? number(value) : String(value);
}

function formatDurationSummary(profile: NonNullable<ReturnType<typeof modelCapabilityConfigFor>["video"]>) {
    const values = videoDurationOptions(profile);
    if (profile.duration.selection === "enum") return values.map((item) => `${item}s`).join("/");
    return `${profile.duration.min || values[0]}-${profile.duration.max || values[values.length - 1]}s`;
}

type ModelMenuPrice = { kind: "tiers"; label: string; compactLabel: string; title: string } | { kind: "estimate" } | { kind: "fixed"; value: number; unit: "次" | "秒" | "百万 Token" };

function modelMenuPrice(config: AiConfig, model: string, i18n: ReturnType<typeof useI18n>, capability?: ModelCapability, summary = false, requirements?: ModelRequirements): ModelMenuPrice | null | undefined {
    if (!model) return undefined;
    const channel = resolveModelChannel(config, model);
    const cost = channel.modelCosts?.find((item) => item.model === modelOptionName(model));
    if (!cost) return channel.scope === "system" ? null : undefined;
    if (cost.pricePolicy === "channel") {
        const tiers = cost.logicalPriceTiers || [];
        if (!tiers.length) return null;
        const matched = summary ? tiers : priceTiersForCurrentSelection(tiers, capability, config, requirements);
        return channelTierPriceSummary(matched.length ? matched : tiers, tiers, i18n);
    }
    if (cost.billingMode === "token") return { kind: "estimate" };
    return { kind: "fixed", value: cost.unitPriceMicrocredits / 1_000_000, unit: cost.billingMode === "per_second" ? "秒" : "次" };
}

function pickerModelDisplayName(config: AiConfig, model: string, showConfiguredModelName: boolean) {
    return showConfiguredModelName ? configuredModelDisplayName(config, model) : modelDisplayName(config, model);
}

function pickerModelOptionLabel(config: AiConfig, model: string, showConfiguredModelName: boolean) {
    const displayName = showConfiguredModelName ? configuredModelDisplayName(config, model) : modelDisplayName(config, model);
    const channel = resolveModelChannel(config, model);
    return channel.scope === "system" ? displayName : `${displayName}（${channel.name}）`;
}

function channelTierPriceSummary(
    visibleTiers: NonNullable<NonNullable<AiConfig["channels"][number]["modelCosts"]>[number]["logicalPriceTiers"]>,
    allTiers: NonNullable<NonNullable<AiConfig["channels"][number]["modelCosts"]>[number]["logicalPriceTiers"]>,
    { t, number }: ReturnType<typeof useI18n>,
): Extract<ModelMenuPrice, { kind: "tiers" }> {
    const fixedRequestValues = visibleTiers
        .filter((tier) => tier.billingMode === "fixed_request")
        .map((tier) => tier.unitPriceMicrocredits / 1_000_000)
        .filter((value) => value > 0);
    const perSecondValues = visibleTiers
        .filter((tier) => tier.billingMode === "per_second")
        .map((tier) => tier.unitPriceMicrocredits / 1_000_000)
        .filter((value) => value > 0);
    const hasTokenTier = visibleTiers.some((tier) => tier.billingMode === "token");
    const label = fixedRequestValues.length
        ? formatPriceRange(fixedRequestValues, t("modelPickerPrice.credits"), number)
        : perSecondValues.length
          ? formatPriceRange(perSecondValues, t("modelPickerPrice.perSecond"), number)
          : hasTokenTier
            ? t("modelPickerPrice.estimate")
            : t("modelPickerPrice.unconfigured");
    return {
        kind: "tiers",
        label,
        compactLabel: label,
        title: t("modelPickerPrice.prices", { prices: allTiers.map((tier) => `${tierSpecificationLabel(tier, t, number)} ${tierPriceLabel(tier, t, number)}`).join("；") }),
    };
}

function formatPriceRange(values: number[], suffix: string, number: ReturnType<typeof useI18n>["number"]) {
    const unique = Array.from(new Set(values)).sort((left, right) => left - right);
    const format = (value: number) => number(value, { maximumFractionDigits: 2 });
    return unique.length === 1 ? `${format(unique[0])} ${suffix}` : `${format(unique[0])}-${format(unique[unique.length - 1])} ${suffix}`;
}

function tierResolutionLabel(value: string, t: ReturnType<typeof useI18n>["t"]) {
    const normalized = normalizeTierResolution(value);
    return normalized === "*" ? t("modelPickerPrice.allResolutions") : normalized.toUpperCase();
}

function tierDurationLabel(seconds: number, t: ReturnType<typeof useI18n>["t"], number: ReturnType<typeof useI18n>["number"]) {
    return seconds > 0 ? t("modelPickerPrice.seconds", { count: number(seconds) }) : t("modelPickerPrice.allDurations");
}

function tierSpecificationLabel(tier: NonNullable<NonNullable<AiConfig["channels"][number]["modelCosts"]>[number]["logicalPriceTiers"]>[number], t: ReturnType<typeof useI18n>["t"], number: ReturnType<typeof useI18n>["number"]) {
    const selector = tier.selector || {};
    const operationLabels: Record<string, string> = {
        text_to_image: t("modelPickerPrice.textImage"),
        image_to_image: t("modelPickerPrice.imageImage"),
        text_to_video: t("modelPickerPrice.textVideo"),
        image_to_video: t("modelPickerPrice.imageVideo"),
        video_to_video: t("modelPickerPrice.videoVideo"),
    };
    const operation = selector.operation && Object.hasOwn(operationLabels, selector.operation) ? operationLabels[selector.operation] : "";
    const details = [
        operation,
        selector.quality && selector.quality !== "*" ? selector.quality.toUpperCase() : "",
        selector.imageSizeTier && selector.imageSizeTier !== "*" ? selector.imageSizeTier.toUpperCase() : "",
        selector.size && selector.size !== "*" ? selector.size : "",
        tier.resolution !== "*" ? tierResolutionLabel(tier.resolution, t) : "",
        tier.videoSeconds ? tierDurationLabel(tier.videoSeconds, t, number) : "",
        selector.imageCount && selector.imageCount !== "*" ? t("modelPickerPrice.references", { count: selector.imageCount }) : "",
    ].filter(Boolean);
    return details.length ? details.join(" / ") : t("modelPickerPrice.default");
}

function tierPriceLabel(tier: NonNullable<NonNullable<AiConfig["channels"][number]["modelCosts"]>[number]["logicalPriceTiers"]>[number], t: ReturnType<typeof useI18n>["t"], number: ReturnType<typeof useI18n>["number"]) {
    if (tier.billingMode === "token") return t("modelPickerPrice.estimate");
    return `${formatPriceRange([tier.unitPriceMicrocredits / 1_000_000], tier.billingMode === "per_second" ? t("modelPickerPrice.perSecond") : t("modelPickerPrice.credits"), number)}`;
}

function ModelPrice({ price, quote, compact = false }: { price: ModelMenuPrice | null | undefined; quote?: ModelCatalogQuote; compact?: boolean }) {
    const { t, number } = useI18n();
    if (quote) {
        const amount = number(quote.amountMicrocredits / 1_000_000, { maximumFractionDigits: 2 });
        const label = `${amount}`;
        return (
            <span className="inline-flex shrink-0 items-center gap-0.5 text-[var(--fs-tiny)] font-bold tabular-nums text-amber-600 dark:text-amber-300" title={t("modelPickerPrice.cost", { amount })}>
                <Coins className="size-3" />
                {compact ? label : t("modelPickerPrice.amount", { amount: label })}
            </span>
        );
    }
    if (price === undefined) return null;
    if (price === null) return compact ? null : <span className="shrink-0 text-[var(--fs-tiny)] text-foreground/40">{t("modelPickerPrice.unconfigured")}</span>;
    if (price.kind === "tiers") {
        return (
            <span className="inline-flex shrink-0 items-center gap-0.5 text-[var(--fs-tiny)] font-bold tabular-nums text-amber-600 dark:text-amber-300" title={price.title}>
                <Coins className="size-3" />
                {compact ? price.compactLabel : price.label}
            </span>
        );
    }
    if (price.kind === "estimate") {
        return <span className="shrink-0 text-[var(--fs-tiny)] font-medium text-amber-600 dark:text-amber-300">{t("modelPickerPrice.estimate")}</span>;
    }
    const unit = t(price.unit === "秒" ? "modelPickerPrice.second" : price.unit === "百万 Token" ? "modelPickerPrice.millionTokens" : "modelPickerPrice.request");
    return (
        <span
            className="inline-flex shrink-0 items-center gap-0.5 text-[var(--fs-tiny)] font-bold tabular-nums text-amber-600 dark:text-amber-300"
            title={t("modelPickerPrice.unitCost", { unit, amount: number(price.value, { maximumFractionDigits: 2 }) })}
        >
            <Coins className="size-3" />
            {number(price.value, { maximumFractionDigits: compact ? 3 : 6 })}/{unit}
        </span>
    );
}

function modelMenuMeta(model: string, capability: ModelCapability | undefined, t: ReturnType<typeof useI18n>["t"]): { description: string; time?: string } {
    const name = modelOptionName(model).toLowerCase().replace(/[-_]/g, " ");
    if (capability === "image") {
        if (name.includes("nano banana") || name.includes("nanobanana")) return { description: t(name.includes("pro") ? "modelPickerMeta.qualityImage" : /banana\s*2/.test(name) ? "modelPickerMeta.generalImage" : "modelPickerMeta.fastImage") };
        if (name.includes("grok")) return { description: t("modelPickerMeta.fastImage") };
        if (name.includes("imagen") || name.includes("gemini")) return { description: t("modelPickerMeta.geminiImage") };
        if (name.includes("nano") || name.includes("pro")) return { description: t("modelPickerMeta.qualityImage") };
        if (name.includes("seedream")) return { description: t("modelPickerMeta.fastImage") };
        if (name.includes("gpt")) return { description: t("modelPickerMeta.generalImage") };
        return { description: t("modelPickerMeta.image") };
    }
    if (capability === "video") {
        if (name.includes("veo") || name.includes("omni flash") || name.includes("omni-flash")) return { description: t("modelPickerMeta.geminiVideo"), time: "3m" };
        if (name.includes("seedance") || name.includes("sora")) return { description: t("modelPickerMeta.productionVideo"), time: "3m" };
        return { description: t("modelPickerMeta.video"), time: "3m" };
    }
    if (capability === "audio") return { description: t("modelPickerMeta.audio"), time: "20s" };
    if (name.includes("claude")) return { description: t("modelPickerMeta.longText"), time: "10s" };
    if (name.includes("gemini")) return { description: t("modelPickerMeta.multimodal"), time: "10s" };
    if (name.includes("deepseek")) return { description: t("modelPickerMeta.reasoning"), time: "10s" };
    return { description: capability === "text" ? t("modelPickerMeta.text") : t("modelPickerMeta.current"), time: "10s" };
}

export function ModelIcon({ config, model, icon }: { config?: AiConfig; model?: string; icon?: string }) {
    return <ModelLogo icon={icon || (config && model ? modelIcon(config, model) : "")} size={14} className="opacity-80" />;
}

// Unlimited capabilities are stored as the int32 max (2,147,483,647); never print that as a user-facing limit.
function isRealLimit(value: number) {
    return value > 0 && value < 10_000;
}
