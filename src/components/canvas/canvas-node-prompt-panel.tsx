import { STARTER_HINT_EVENT, type StarterHintAction } from "./canvas-node-starter-hints";
import { InsufficientCreditsModal } from "@/components/payments/insufficient-credits-modal";
import { paymentCopy } from "@/lib/payment-ux";
import { MODEL_STARTERS, resolvePreferredStarterModel } from "@/pages/showcase/model-starters";
import { MODEL_STARTER_COPY } from "@/pages/showcase/model-starter-copy";
import { canonicalGenerationMetadata, nodeGenerationPrompt, readNodeGenerationSpec, resolveGenerationSelection } from "@/lib/canvas/generation-contract";
import { localizedCanvasReferenceLabel, localizedCanvasReferenceTitle } from "@/i18n/canvas-reference-label";
import { GenerationBudgetHint } from "@/components/generation-budget-hint";
import { Button, Image as AntImage, InputNumber, Modal, Popover } from "antd";
import { Tooltip } from "@/components/ui/base/tooltip";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { ArrowLeftRight, ArrowUp, AtSign, Boxes, Camera, ChevronDown, FileText, GripVertical, ImageIcon, ImagePlus, Link2, LoaderCircle, Maximize2, Music2, Palette, Pencil, SlidersHorizontal, UserRound, Video, WandSparkles, X } from "lucide-react";

import { ModelPicker } from "@/components/model-picker";
import { defaultConfig, isMusicModelConfig, modelOptionName, resolveModelChannel, selectableModelsByCapability, useEffectiveConfig, type AiConfig } from "@/stores/use-config-store";
import { resolveCanvasGenerationModel } from "@/lib/canvas/canvas-project-generation";
import { COMPOSER_MIN_WIDTH, setComposerWidthPreference } from "@/lib/canvas/composer-size-preference";
import { CreditSymbol, requestCreditCost } from "@/constant/credits";
import { useWalletBalance } from "@/hooks/use-wallet-balance";
import { canvasThemes } from "@/lib/canvas-theme";
import { modelQuoteRequest } from "@/lib/model-pricing";
import { normalizeVideoDuration, normalizeVideoResolution } from "@/lib/video-generation-options";
import {
    modelCompatibilityError,
    modelGroupReferenceLimits,
    modelOptionAvailable,
    modelOptionSelection,
    modelRequestOptions,
    resolveCompatibleModel,
    resolveCompatibleModelInSameGroup,
    resolveModelGenerationDefaults,
    defaultImageParamsForModel,
    supportsAudioReferenceVoice,
    type ModelRequirements,
} from "@/lib/model-selection";
import { localizeModelCompatibilityMessage } from "@/i18n/model-validation";
import { filterActiveCanvasAudioVoiceBindings } from "@/lib/canvas/canvas-audio-voice-bindings";
import { modelCapabilityConfigFor } from "@/lib/model-capabilities";
import { imageQualityDuplicatesResolution } from "@/lib/canvas/image-parameter-summary";
import { selectedModelParameters } from "@/lib/model-documented-parameters";
import { CanvasComposerAttachments, type ComposerAttachmentHandle } from "./canvas-composer-attachments";
import { composerAttachmentReferences, removeComposerAttachmentMentions } from "@/lib/canvas/composer-attachments";
import { CanvasPromptVoiceInput } from "./canvas-prompt-voice-input";
import { navigateToSettings } from "@/lib/settings-navigation";
import { useActiveTheme } from "@/stores/canvas/use-canvas-theme-store";
import { useUserStore } from "@/stores/use-user-store";
import { CanvasCameraControlPopover } from "./canvas-camera-control-popover";
import { CanvasImageSettingsPopover } from "./canvas-image-settings-popover";
import { CanvasAudioSettingsPopover, type CanvasAudioSettingKey } from "./canvas-audio-settings-popover";
import { CanvasResourceMentionTextarea } from "./canvas-resource-mention-textarea";
import { CanvasVideoSettingsPopover } from "./canvas-video-settings-popover";
import { CanvasTextSettingsPopover } from "./canvas-text-settings-popover";
import { CanvasVideoPromptTools } from "./canvas-video-prompt-tools";
import { CanvasPresetPicker, type CanvasPromptPreset } from "./canvas-preset-picker";
import { resolveProjectCanvasStyle, type CanvasStylePreset } from "./canvas-style-picker-modal";
import { CanvasStylePickerPopover } from "./canvas-style-picker-popover";
import { createStyleProfileSnapshot, parseStyleProfile, serializeStyleProfile } from "@/lib/canvas/style-profile";
import { CanvasPortraitTexturePopover } from "./canvas-portrait-texture-popover";
import { CanvasPromptOptimizerDrawer } from "./canvas-prompt-optimizer-drawer";
import { useI18n } from "@/i18n/use-i18n";
import { styleDisplayMetadata } from "@/i18n/style-metadata";
import { CanvasNodeType, type CanvasGenerationMode, type CanvasNodeData, type CanvasNodeMetadata, type CanvasWorkspaceMode } from "@/types/canvas";
import { autoMentionCanvasResourceReferences, canvasResourceMentionToken, normalizeCanvasNodeMentionTokens, replaceCanvasMentionToken, type CanvasResourceReference } from "@/lib/canvas/canvas-resource-references";
import { promptOptimizerPlugin, PROMPT_OPTIMIZER_PLUGIN_ID } from "@/lib/plugins/builtin/prompt-optimizer";
import { createPluginHostContext } from "@/services/plugin-host";
import { usePluginStore } from "@/stores/use-plugin-store";
import { useResolvedCanvasResourceReferences } from "./use-resolved-canvas-resource-references";
import { useCanvasReferenceHoverPreview } from "./canvas-reference-hover-preview";
import { quoteModelCatalog } from "@/services/api/logical-models";
import { usePriceRevision } from "@/hooks/use-price-revision";
import { nodeModelRemoved, kling4Replacement } from "@/lib/canvas/retired-model";
import { ApiError } from "@/services/api/request";

export type CanvasNodeGenerationMode = CanvasGenerationMode;

type CanvasNodePromptPanelProps = {
    projectId: string;
    projectStyle?: CanvasStylePreset;
    node: CanvasNodeData;
    isRunning: boolean;
    onPromptChange: (nodeId: string, prompt: string) => void;
    onConfigChange: (nodeId: string, patch: Partial<CanvasNodeMetadata>) => void;
    onGenerate: (nodeId: string, mode: CanvasNodeGenerationMode, prompt: string) => void;
    mentionReferences?: CanvasResourceReference[];
    onAddReference?: (nodeId: string, reference: CanvasResourceReference) => CanvasResourceReference | undefined;
    onRemoveReference?: (nodeId: string, reference: CanvasResourceReference) => void;
    onReorderReferences?: (nodeId: string, orderedNodeIds: string[]) => void;
    onReplaceReference?: (nodeId: string, oldReference: CanvasResourceReference, sourceNodeId: string) => void;
    onReplaceReferenceFiles?: (nodeId: string, oldReference: CanvasResourceReference, files: File[]) => void;
    onClose?: () => void;
    onNodeMouseDown?: (event: ReactPointerEvent, nodeId: string) => void;
    onImageSettingsOpenChange?: (open: boolean) => void;
    workspaceMode?: CanvasWorkspaceMode;
};

type CanvasTheme = (typeof canvasThemes)[keyof typeof canvasThemes];

const PROMPT_REFERENCE_SHELF_HEIGHT = 58;
// Keep the compact editor readable at rest: three 20px lines plus 12px vertical padding.
const PROMPT_EDITOR_MIN_HEIGHT = 72;
const PROMPT_EDITOR_EXPANDED_MIN_HEIGHT = 76;
const PROMPT_EDITOR_LINE_HEIGHT = 20;
const PROMPT_EDITOR_EXPANDED_LINE_HEIGHT = 24;
const PROMPT_EDITOR_VERTICAL_PADDING = 12;
const PROMPT_EDITOR_EXPANDED_VERTICAL_PADDING = 20;
const PROMPT_EDITOR_MAX_LINES = 8;

export function CanvasNodePromptPanel({
    projectId,
    projectStyle,
    node,
    isRunning,
    onPromptChange,
    onConfigChange,
    onGenerate,
    mentionReferences = [],
    onAddReference,
    onRemoveReference,
    onReorderReferences,
    onReplaceReference,
    onReplaceReferenceFiles,
    onClose,
    onNodeMouseDown,
    onImageSettingsOpenChange,
    workspaceMode = "professional",
}: CanvasNodePromptPanelProps) {
    const { t, number, locale } = useI18n();
    const [purchaseOpen, setPurchaseOpen] = useState(false);
    const [creditsReady, setCreditsReady] = useState(false);
    useEffect(() => {
        setCreditsReady(false);
        const showReady = () => {
            if (sessionStorage.getItem("checkout-credits-ready") !== node.id) return;
            sessionStorage.removeItem("checkout-credits-ready");
            setCreditsReady(true);
        };
        showReady();
        window.addEventListener("checkout:credited", showReady);
        return () => window.removeEventListener("checkout:credited", showReady);
    }, [node.id]);
    const globalConfig = useEffectiveConfig();
    const themeName = useActiveTheme();
    const theme = canvasThemes[themeName];
    const creditsEnabled = useUserStore((state) => state.features.creditsEnabled);
    const promptOptimizerInstallation = usePluginStore((state) => state.installations.find((item) => item.manifest.id === PROMPT_OPTIMIZER_PLUGIN_ID));
    const promptOptimizerEnabled = usePluginStore((state) => state.pluginStates[PROMPT_OPTIMIZER_PLUGIN_ID]?.effectiveEnabled ?? Boolean(state.installations.find((item) => item.manifest.id === PROMPT_OPTIMIZER_PLUGIN_ID)?.enabled));
    const simpleMode = workspaceMode === "simple";
    const mode = defaultMode(node.type);
    const hasTextContent = node.type === CanvasNodeType.Text && Boolean(node.metadata?.content?.trim());
    const hasImageContent = node.type === CanvasNodeType.Image && Boolean(node.metadata?.content);
    node = { ...node, metadata: canonicalGenerationMetadata(node, mode) };
    const preferredStarterModel = !node.metadata?.model ? resolvePreferredStarterModel(node.metadata?.preferredModelCodes, globalConfig.channels) : undefined;
    useEffect(() => {
        if (preferredStarterModel) onConfigChange(node.id, { model: preferredStarterModel });
    }, [node.id, preferredStarterModel, onConfigChange]);
    const savedPrompt = nodeGenerationPrompt(node);
    const [prompt, setPrompt] = useState(savedPrompt);
    const [presetOpen, setPresetOpen] = useState(false);
    const [styleOpen, setStyleOpen] = useState(false);
    useEffect(() => setStyleOpen(false), [node.id]);
    const nodeStyle = useMemo(() => parseStyleProfile(node.metadata?.generationStyleProfileJson), [node.metadata?.generationStyleProfileJson]);
    const nodeStyleLabel = useMemo(
        () => (nodeStyle ? styleDisplayMetadata(resolveProjectCanvasStyle(nodeStyle.presetId, node.metadata?.generationStyleProfileJson)!, t, locale).title : t("canvasAgentEntry.style")),
        [nodeStyle, node.metadata?.generationStyleProfileJson, t, locale],
    );
    const [expandedPresetOpen, setExpandedPresetOpen] = useState(false);
    const [expandedPromptOpen, setExpandedPromptOpen] = useState(false);
    const [promptContentHeight, setPromptContentHeight] = useState(() => estimatePromptContentHeight(savedPrompt, false));
    const [expandedPromptContentHeight, setExpandedPromptContentHeight] = useState(() => estimatePromptContentHeight(savedPrompt, true));
    const [manualPromptHeight, setManualPromptHeight] = useState<number | null>(null);
    const [manualExpandedPromptHeight, setManualExpandedPromptHeight] = useState<number | null>(null);
    const [paramsExpanded, setParamsExpanded] = useState(false); // #98 决策2：B区参数区折叠状态（手风琴）
    const [promptOptimizerOpen, setPromptOptimizerOpen] = useState(false);
    const [autoLinkEnabled, setAutoLinkEnabled] = useState(true);
    const [attachmentsUploading, setAttachmentsUploading] = useState(false);
    const [voiceActive, setVoiceActive] = useState(false);
    const attachmentInput = useRef<ComposerAttachmentHandle>(null);
    const expandedAttachmentInput = useRef<ComposerAttachmentHandle>(null);
    useEffect(() => {
        const listener = (event: Event) => {
            const action = (event as CustomEvent<StarterHintAction>).detail;
            if (action.nodeId !== node.id) return;
            if (action.operation) onConfigChange(node.id, { videoEditOperation: action.operation });
            if (action.upload && node.metadata?.modelStarterKey !== "shot-breakdown") requestAnimationFrame(() => attachmentInput.current?.open(action.operation === "image_to_video" || mode === "image" ? "image/*" : "video/*"));
            else document.querySelector<HTMLElement>('[data-canvas-node-panel] textarea, [data-canvas-node-panel] [contenteditable="true"]')?.focus();
        };
        window.addEventListener(STARTER_HINT_EVENT, listener);
        return () => window.removeEventListener(STARTER_HINT_EVENT, listener);
    }, [node.id, onConfigChange]);
    const attachments = node.metadata?.composerAttachments || [];
    const resolvedMentionReferences = useResolvedCanvasResourceReferences(mentionReferences, { projectId });
    const directMentionReferences = composerAttachmentReferences(attachments, resolvedMentionReferences);
    const composerMentionReferences = [...resolvedMentionReferences, ...directMentionReferences];
    const mediaReferences = resolvedMentionReferences.filter((item) => item.active && ["image", "video", "audio"].includes(item.kind));
    const inlineReferences = resolvedMentionReferences.filter((item) => !["image", "video", "audio"].includes(item.kind));
    const inlineReferenceCount = inlineReferences.filter((item) => item.active && item.kind !== "skill").length;
    const normalizedSavedPrompt = useMemo(() => normalizeCanvasNodeMentionTokens(savedPrompt, mentionReferences), [mentionReferences, savedPrompt]);
    const activeReferences = resolvedMentionReferences.filter((item) => item.active && item.kind !== "skill");
    const requirements: ModelRequirements = {
        capability: mode,
        input: {
            textCount: (prompt.trim() ? 1 : 0) + activeReferences.filter((item) => item.kind === "text").length,
            imageCount: activeReferences.filter((item) => item.kind === "image").length + attachments.filter((item) => item.kind === "image").length,
            videoCount: activeReferences.filter((item) => item.kind === "video").length + attachments.filter((item) => item.kind === "video").length,
            audioCount: activeReferences.filter((item) => item.kind === "audio").length + attachments.filter((item) => item.kind === "audio").length,
            characterCount: activeReferences.filter((item) => item.kind === "character").length,
        },
        videoOperation: node.metadata?.videoEditOperation,
        videoSeconds: mode === "video" ? node.metadata?.seconds || globalConfig.videoSeconds : undefined,
        options: modelRequestOptions(
            {
                ...globalConfig,
                size: node.metadata?.size || globalConfig.size,
                quality: node.metadata?.quality || globalConfig.quality,
                imageResolution: node.metadata?.imageResolution,
                count: String(node.metadata?.count || globalConfig.count),
                transparentBackground: node.metadata?.transparentBackground || globalConfig.transparentBackground,
                videoSeconds: node.metadata?.seconds || globalConfig.videoSeconds,
                vquality: node.metadata?.vquality || globalConfig.vquality,
                videoGenerateAudio: node.metadata?.generateAudio || globalConfig.videoGenerateAudio,
                videoWatermark: node.metadata?.watermark || globalConfig.videoWatermark,
                model: node.metadata?.model || (mode === "audio" ? globalConfig.audioModel : mode === "video" ? globalConfig.videoModel : mode === "image" ? globalConfig.imageModel : globalConfig.textModel),
                audioMode: node.metadata?.audioMode ?? globalConfig.audioMode,
                audioVoice: node.metadata?.audioVoice || globalConfig.audioVoice,
                audioFormat: node.metadata?.audioFormat || globalConfig.audioFormat,
                audioSpeed: node.metadata?.audioSpeed || globalConfig.audioSpeed,
                audioInstructions: node.metadata?.audioInstructions || globalConfig.audioInstructions,
                musicInstrumental: node.metadata?.musicInstrumental || globalConfig.musicInstrumental,
            },
            mode,
        ),
    };
    const config = buildNodeConfig(globalConfig, node, mode, requirements);
    const textReferences = mode === "text" ? modelCapabilityConfigFor(config, config.model).text?.references : undefined;
    const resolvedRequirements: ModelRequirements = {
        ...requirements,
        options: modelRequestOptions(config, mode),
        videoSeconds: mode === "video" ? config.videoSeconds : undefined,
    };
    const referenceLimits = modelGroupReferenceLimits(config, config.model, mode, resolvedRequirements) || { maxImages: textReferences?.maxImages || 0, maxVideos: textReferences?.maxVideos || 0, maxAudios: 0 };
    const attachmentLimits = { ...referenceLimits, maxImages: Math.max(0, referenceLimits.maxImages - requirements.input!.characterCount) };
    const isOptionAvailable = (name: string, value: unknown) => modelOptionAvailable(config, config.model, resolvedRequirements, name, value);
    const optionPatch = (name: string, value: unknown) => modelOptionSelection(config, config.model, resolvedRequirements, name, value);
    const changeModelOption = (key: keyof AiConfig, value: string) => {
        if (key === "modelParameters") {
            onConfigChange(node.id, { modelParameters: value });
            return;
        }
        const options = modelOptionSelection(config, config.model, resolvedRequirements, key, value);
        if (!options) return;
        const patch: Partial<CanvasNodeMetadata> =
            mode === "image" ? { model: config.model, size: config.size, quality: config.quality, imageResolution: config.imageResolution, transparentBackground: config.transparentBackground, modelParameters: config.modelParameters } : {};
        const imageProfile = mode === "image" ? modelCapabilityConfigFor(config, config.model).image : undefined;
        if (key === "imageResolution" && imageProfile && imageQualityDuplicatesResolution(imageProfile)) {
            patch.quality = imageProfile.quality.values.find((quality) => quality.toLowerCase() === value.toLowerCase());
        }
        if (key === "transparentBackground" && imageProfile?.transparentBackground.supported && modelCapabilityConfigFor(config, config.model).parameters?.background) {
            patch.modelParameters = JSON.stringify({ ...selectedModelParameters(config, "image"), background: value === "true" ? "transparent" : "opaque" });
        }
        for (const [name, next] of Object.entries(options)) {
            Object.assign(patch, mode === "video" ? videoConfigPatch(name as keyof AiConfig, String(next)) : name === "count" ? { count: Number(next) || 1 } : { [name]: String(next) });
        }
        onConfigChange(node.id, patch);
    };
    const promptOptimizerProvider = useMemo(() => {
        if (!promptOptimizerEnabled || !promptOptimizerInstallation || !promptOptimizerPlugin.createPromptOptimizer) return null;
        return promptOptimizerPlugin.createPromptOptimizer(createPluginHostContext(promptOptimizerPlugin, promptOptimizerInstallation, globalConfig));
    }, [globalConfig, promptOptimizerEnabled, promptOptimizerInstallation]);
    const generationCount = Math.max(1, Math.min(15, Math.floor(Math.abs(Number(config.count)) || 1)));
    const priceChannel = resolveModelChannel(config, config.model);
    const configuredCredits = requestCreditCost({
        channelMode: priceChannel.scope === "system" ? "remote" : "local",
        modelCosts: priceChannel.modelCosts,
        model: modelOptionName(config.model),
        count: mode === "image" ? generationCount : 1,
        seconds: mode === "video" ? config.videoSeconds : 1,
        capability: mode,
        config,
        requirements: resolvedRequirements,
    });
    const removedSelection = nodeModelRemoved(globalConfig, node);
    const quoteRequest = removedSelection ? undefined : modelQuoteRequest(config, config.model, mode, resolvedRequirements);
    const quoteRequestKey = JSON.stringify(quoteRequest || null);
    const [retiredQuoteKey, setRetiredQuoteKey] = useState<string>();
    const retiredModel = removedSelection || retiredQuoteKey === quoteRequestKey;
    const replacement = mode === "video" && retiredModel ? kling4Replacement(globalConfig, node) : undefined;
    const [quotedCharge, setQuotedCharge] = useState<{ key: string; credits: number } | null>(null);
    const priceRevision = usePriceRevision();
    const quotedCredits = quotedCharge?.key === quoteRequestKey ? quotedCharge.credits : null;
    const credits = quoteRequest ? quotedCredits : configuredCredits;
    const hasTextCeiling = mode === "text" && quotedCredits !== null;
    // 发送前对比余额和报价：只提示不拦截（团队积分池等场景由后端最终裁决）。
    const userId = useUserStore((state) => state.user?.id);
    const { availableMicrocredits } = useWalletBalance(userId, creditsEnabled && quotedCredits !== null);
    const balanceCredits = availableMicrocredits === null ? null : Math.max(0, availableMicrocredits) / 1_000_000;
    const creditsShort = creditsEnabled && quotedCredits !== null && balanceCredits !== null && balanceCredits < quotedCredits;
    const activeReferenceCount = activeReferences.length;
    const videoFrameOptions = resolvedMentionReferences.filter((item) => item.active && item.kind === "image").map((item) => ({ nodeId: item.nodeId, label: localizedCanvasReferenceLabel(item, t), title: item.title, previewUrl: item.previewUrl }));
    const hasVideoPromptTools = mode === "video" && !simpleMode && videoFrameOptions.length > 0;
    const monochromeAccent = theme.node.activeStroke;
    const composerTokens = {
        "--canvas-composer-surface": theme.node.panel,
        "--canvas-composer-control-surface": theme.toolbar.itemHover,
        "--canvas-composer-control-hover": theme.toolbar.activeBg,
        "--canvas-composer-shadow": theme.node.shadow,
        "--cn-text": theme.node.text,
    } as CSSProperties;
    const composerSurfaceStyle = {
        ...composerTokens,
        background: theme.node.panel,
        color: theme.node.text,
        boxShadow: theme.node.shadow,
    } as CSSProperties;
    const controlSurface = "var(--canvas-composer-control-surface)";
    const promptBounds = promptEditorBounds(false, inlineReferenceCount > 0);
    const expandedPromptBounds = promptEditorBounds(true, inlineReferenceCount > 0);
    // 自动随内容增高到 8 行即止；用户手动拖动时可以拉到约半屏高。
    const manualPromptBounds = manualPromptEditorBounds(promptBounds);
    const composerHeight = manualPromptHeight !== null ? clampPromptHeight(manualPromptHeight, manualPromptBounds) : clampPromptHeight(promptContentHeight + (inlineReferenceCount ? PROMPT_REFERENCE_SHELF_HEIGHT : 0), promptBounds);
    const expandedComposerHeight = clampPromptHeight(manualExpandedPromptHeight ?? expandedPromptContentHeight + (inlineReferenceCount ? PROMPT_REFERENCE_SHELF_HEIGHT : 0), expandedPromptBounds);
    const rawCompatibilityError = retiredModel ? "" : modelCompatibilityError(config, config.model, resolvedRequirements);
    const compatibilityError = retiredModel ? t("modelPicker.retired") : rawCompatibilityError ? localizeModelCompatibilityMessage(rawCompatibilityError, { t, number }) : "";
    const isSubmitDisabled = Boolean(compatibilityError) || attachmentsUploading || voiceActive || (!isRunning && (!prompt.trim() || (creditsEnabled && Boolean(quoteRequest) && quotedCredits === null)));
    const canExpandPrompt = mode === "image" || mode === "video" || mode === "text";
    const canOptimizePrompt = Boolean(promptOptimizerProvider) && (mode === "image" || mode === "video");
    const isPortraitTexture = mode === "image" && Boolean(node.metadata?.portraitTexture);
    const autoMentionedPrompt = autoMentionCanvasResourceReferences(prompt, composerMentionReferences);
    const canAutoMention = autoMentionedPrompt !== prompt;

    useEffect(() => {
        setPrompt(normalizedSavedPrompt);
        if (normalizedSavedPrompt !== savedPrompt) onPromptChange(node.id, normalizedSavedPrompt);
    }, [node.id, normalizedSavedPrompt, onPromptChange, savedPrompt]);

    useEffect(() => {
        setExpandedPromptOpen(false);
        setExpandedPresetOpen(false);
        setPromptContentHeight(estimatePromptContentHeight(normalizedSavedPrompt, false));
        setExpandedPromptContentHeight(estimatePromptContentHeight(normalizedSavedPrompt, true));
        setManualPromptHeight(null);
        setManualExpandedPromptHeight(null);
    }, [node.id]);

    useEffect(() => {
        if (!creditsEnabled || !quoteRequest || retiredModel) {
            setQuotedCharge(null);
            return;
        }
        const controller = new AbortController();
        setQuotedCharge(null);
        quoteModelCatalog(quoteRequest, controller.signal)
            .then(({ quote }) => {
                if (!controller.signal.aborted) setQuotedCharge({ key: quoteRequestKey, credits: quote.amountMicrocredits / 1_000_000 });
            })
            .catch((error: unknown) => {
                if (!controller.signal.aborted) {
                    setQuotedCharge(null);
                    if (error instanceof ApiError && error.reason === "model_retired") setRetiredQuoteKey(quoteRequestKey);
                }
            });
        return () => controller.abort();
        // quoteRequestKey captures the full normalized request without retriggering on object identity.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [creditsEnabled, priceRevision, quoteRequestKey, retiredModel]);

    const skillReferences = useMemo(() => resolvedMentionReferences.filter((item) => item.kind === "skill"), [resolvedMentionReferences]);

    const updatePrompt = (value: string) => {
        setPrompt(value);
        onPromptChange(node.id, value);
        if (/(^|\s)\/[\p{L}\p{N}_-]*$/u.test(value)) {
            if (expandedPromptOpen) setExpandedPresetOpen(true);
            else setPresetOpen(true);
        }
    };

    const applyPreset = (preset: CanvasPromptPreset) => {
        const withoutSlash = prompt.replace(/(^|\s)\/[\p{L}\p{N}_-]*$/u, "$1").trimEnd();
        updatePrompt(withoutSlash ? `${withoutSlash}\n${preset.prompt}` : preset.prompt);
    };

    const applyNodeStyle = (preset: CanvasStylePreset) => {
        const profile = preset.profile || createStyleProfileSnapshot({ ...preset, source: "builtin", coverUrl: preset.imageUrl });
        onConfigChange(node.id, { generationStyleProfileJson: serializeStyleProfile(profile) });
    };

    const insertPromptReference = (reference: CanvasResourceReference) => {
        const insertText = `${canvasResourceMentionToken(reference)} `;
        const pendingMentionMatch = /@[^\s@，。！？、,.!?;:]*\s*$/.exec(prompt);
        if (pendingMentionMatch) {
            const prefix = prompt.slice(0, pendingMentionMatch.index).replace(/\s*$/, "");
            updatePrompt(prefix ? `${prefix} ${insertText}` : insertText);
            return;
        }
        const basePrompt = prompt.replace(/\s*$/, "");
        updatePrompt(basePrompt ? `${basePrompt} ${insertText}` : insertText);
    };

    const submit = () => {
        if (compatibilityError || attachmentsUploading || voiceActive) return false;
        if (creditsEnabled && quoteRequest && quotedCredits === null) return false;
        const text = prompt.trim();
        if (!text || isRunning) return false;
        onGenerate(node.id, mode, text);
        return true;
    };

    const submitExpandedPrompt = () => {
        if (submit()) {
            setExpandedPresetOpen(false);
            setExpandedPromptOpen(false);
        }
    };

    const renderComposerHeader = (expanded: boolean) => (
        <div
            className="canvas-node-composer-header cursor-grab select-none active:cursor-grabbing"
            data-canvas-node-drag-handle
            title={t("canvasPrompt.drag")}
            onPointerDown={(event) => {
                const target = event.target instanceof Element ? event.target : null;
                if (!target?.closest('button, input, textarea, select, a, [contenteditable="true"], [data-canvas-no-drag]')) onNodeMouseDown?.(event, node.id);
            }}
        >
            {isPortraitTexture ? (
                <>
                    <CanvasPortraitTexturePopover value={node.metadata?.portraitTexture} placement={expanded ? "topRight" : "topLeft"} onChange={(portraitTexture) => onConfigChange(node.id, { portraitTexture })} />
                    {activeReferenceCount > 0 ? <span className="canvas-node-composer-reference-heading">{referenceShelfHeading(activeReferences, t, number)}</span> : null}
                </>
            ) : (
                <div className="canvas-node-composer-mode">
                    <span className="grid size-3.5 shrink-0 place-items-center" style={{ color: monochromeAccent }}>
                        <GenerationModeIcon mode={mode} />
                    </span>
                    <span className="truncate text-[var(--fs-tiny)] font-medium">{t(modeDisplayName(mode))}</span>
                    {activeReferenceCount > 0 ? <span className="canvas-node-composer-reference-heading">{referenceShelfHeading(activeReferences, t, number)}</span> : null}
                </div>
            )}
            <div className="ml-auto flex shrink-0 items-center justify-end gap-1">
                {mode === "image" ? (
                    <>
                        <CanvasStylePickerPopover
                            open={styleOpen && expanded === expandedPromptOpen}
                            currentPrompt={prompt}
                            applying={isRunning}
                            currentProfile={nodeStyle}
                            projectStyle={projectStyle}
                            onOpenChange={setStyleOpen}
                            onSelect={applyNodeStyle}
                            onClear={() => onConfigChange(node.id, { generationStyleProfileJson: undefined })}
                        >
                            <button
                                type="button"
                                disabled={isRunning}
                                className="canvas-node-composer-header-action inline-flex h-6 items-center gap-1 rounded-md px-1.5"
                                onClick={() => setStyleOpen((open) => !open)}
                                aria-label={t("canvasAgentEntry.style")}
                                title={nodeStyleLabel}
                                aria-pressed={Boolean(nodeStyle)}
                                aria-expanded={styleOpen}
                                aria-haspopup="dialog"
                            >
                                <Palette className="size-3" />
                                <span className="max-w-24 truncate text-[var(--fs-tiny)] font-medium">{nodeStyleLabel}</span>
                            </button>
                        </CanvasStylePickerPopover>
                        {nodeStyle ? (
                            <button
                                type="button"
                                disabled={isRunning}
                                className="canvas-node-composer-header-action grid size-6 place-items-center rounded-md"
                                onClick={() => onConfigChange(node.id, { generationStyleProfileJson: undefined })}
                                aria-label={t("canvasAgentEntry.clearStyle")}
                                title={t("canvasAgentEntry.clearStyle")}
                            >
                                <X className="size-3" />
                            </button>
                        ) : null}
                    </>
                ) : null}
                {!simpleMode || mode === "image" ? (
                    <CanvasPresetPicker
                        mode={mode}
                        currentPrompt={prompt}
                        skillReferences={skillReferences}
                        open={expanded ? expandedPresetOpen : presetOpen}
                        onOpenChange={expanded ? setExpandedPresetOpen : setPresetOpen}
                        onSelect={applyPreset}
                        dense
                        appearance="quiet"
                    />
                ) : null}
                {canOptimizePrompt ? (
                    <Tooltip title={t("canvasPrompt.optimizeHelp")}>
                        <button type="button" className="canvas-node-composer-header-action inline-flex h-6 shrink-0 items-center gap-1 rounded-md px-1.5" onClick={() => setPromptOptimizerOpen(true)} aria-label={t("canvasPrompt.optimize")}>
                            <WandSparkles className="size-3" />
                            <span className="text-[var(--fs-tiny)] font-medium">{t("canvasPrompt.refine")}</span>
                        </button>
                    </Tooltip>
                ) : null}
                {!expanded && canExpandPrompt ? (
                    <Tooltip title={t("canvasPrompt.expand")}>
                        <button type="button" className="canvas-node-composer-header-action grid size-6 shrink-0 place-items-center rounded-md" onClick={() => setExpandedPromptOpen(true)} aria-label={t("canvasPrompt.expandPrompt")}>
                            <Maximize2 className="size-3" />
                        </button>
                    </Tooltip>
                ) : null}
                {!expanded && onClose ? (
                    <Tooltip title={t("canvasPrompt.close")}>
                        <button type="button" className="canvas-node-composer-header-action grid size-6 shrink-0 place-items-center rounded-md" onClick={onClose} aria-label={t("canvasPrompt.closePanel")}>
                            <X className="size-3" />
                        </button>
                    </Tooltip>
                ) : null}
            </div>
        </div>
    );

    const renderSubmitButton = (expanded: boolean) => {
        const showCost = !compatibilityError && creditsEnabled && credits !== null;
        const formattedCredits = credits === null ? undefined : number(credits, mode === "text" ? { maximumFractionDigits: 2 } : creditDisplayFormat(credits));
        const actionLabel =
            compatibilityError ||
            (isRunning
                ? t("canvasPrompt.running")
                : creditsShort
                  ? paymentCopy(locale).short.replace("{n}", number(Math.max(0, (quotedCredits || 0) - (balanceCredits || 0))))
                  : showCost
                    ? hasTextCeiling
                        ? t("modelPickerPrice.usageCap", { amount: formattedCredits ?? "" })
                        : t("canvasPrompt.cost", { credits: formattedCredits ?? "" })
                    : creditsEnabled && quoteRequest
                      ? t("canvasExtra.storyboard.quoteUnavailable")
                      : t("canvasPrompt.generate"));
        return (
            <>
                {retiredModel ? (
                    <span role="status" className="text-xs">
                        {t("modelPicker.retired")}
                        {replacement ? (
                            <button type="button" className="ml-2 underline underline-offset-2" onClick={() => onConfigChange(node.id, replacement)}>
                                {t("modelPicker.switchKling4")}
                            </button>
                        ) : null}
                    </span>
                ) : null}
                {creditsEnabled && quotedCredits !== null ? <GenerationBudgetHint credits={quotedCredits} balance={balanceCredits} /> : null}
                <Button
                    type="text"
                    data-canvas-tour="composer-submit"
                    className={`canvas-node-composer-submit canvas-node-composer-submit-canvas ${showCost ? "has-cost" : ""} ${creditsShort ? "is-credit-short" : ""}`}
                    disabled={isRunning || isSubmitDisabled}
                    style={
                        {
                            color: isSubmitDisabled ? theme.node.faint : theme.node.text,
                            "--canvas-composer-submit-action": isSubmitDisabled ? theme.toolbar.itemHover : monochromeAccent,
                            "--canvas-composer-submit-action-fg": isSubmitDisabled ? theme.node.faint : theme.canvas.background,
                        } as CSSProperties
                    }
                    onClick={() => {
                        if (creditsShort) {
                            sessionStorage.setItem("checkout-origin-node", node.id);
                            setPurchaseOpen(true);
                        } else {
                            setCreditsReady(false);
                            if (expanded) submitExpandedPrompt();
                            else submit();
                        }
                    }}
                    aria-label={actionLabel}
                    title={compatibilityError || actionLabel}
                >
                    {creditsShort ? (
                        <span>{actionLabel}</span>
                    ) : showCost ? (
                        <span className="canvas-node-composer-submit-cost" style={creditsShort ? { color: theme.accent.danger } : undefined}>
                            <CreditSymbol />
                            <span>{hasTextCeiling ? t("modelPickerPrice.maximumAmount", { amount: formattedCredits ?? "" }) : formattedCredits}</span>
                        </span>
                    ) : null}
                    <span className="canvas-node-composer-submit-action" aria-hidden>
                        {isRunning ? <LoaderCircle className="size-3.5 animate-spin motion-reduce:animate-none" /> : <ArrowUp className="size-3.5" strokeWidth={2.4} />}
                    </span>
                </Button>
            </>
        );
    };

    const renderComposerControls = (expanded: boolean) =>
        simpleMode ? (
            <div className="canvas-node-composer-footer">
                <span className="min-w-0 truncate px-2 text-[var(--fs-tiny)]" style={{ color: theme.node.muted }}>
                    {activeReferenceCount ? t("canvasPrompt.connectedCount", { count: number(activeReferenceCount) }) : t("canvasPrompt.defaults")}
                </span>
                <ReferenceToolsPopover canAutoMention={canAutoMention} autoLinkEnabled={autoLinkEnabled} onAutoMention={() => updatePrompt(autoMentionedPrompt)} onAutoLinkEnabledChange={setAutoLinkEnabled} accent={monochromeAccent} compact />
                <CanvasPromptVoiceInput
                    key={`${node.id}:${expanded}`}
                    disabled={isRunning || (expandedPromptOpen && !expanded)}
                    onBusyChange={setVoiceActive}
                    onTranscribed={(text) => updatePrompt(prompt.trimEnd() ? `${prompt.trimEnd()} ${text}` : text)}
                />
                {renderSubmitButton(expanded)}
            </div>
        ) : (
            <div className="canvas-node-composer-footer canvas-node-composer-footer-configured">
                <div className="canvas-node-composer-selection">
                    <div className="canvas-node-composer-model">
                        <ModelPicker
                            className="!h-7 !w-full !min-w-0 !text-[var(--fs-tiny)] !font-normal [&_img]:!size-3 [&_.lucide]:!size-3"
                            fullWidth
                            config={config}
                            value={retiredModel ? "" : config.model}
                            onChange={(model) =>
                                onConfigChange(node.id, mode === "image" ? { model, ...defaultImageParamsForModel(config, model) } : mode === "audio" && !supportsAudioReferenceVoice(config, model) ? { model, audioMode: undefined } : { model })
                            }
                            capability={mode}
                            requirements={resolvedRequirements}
                            onMissingConfig={() => navigateToSettings({ continueCreation: true })}
                            showSelectedPrice={false}
                            showOptionPrices={creditsEnabled}
                            variant="creation"
                            showConfiguredModelName
                        />
                    </div>
                    {mode === "text" ? (
                        <>
                            <CanvasTextSettingsPopover config={config} onChange={(patch) => onConfigChange(node.id, patch)} />
                            <Tooltip title={t("canvasPrompt.textCountHelp")}>
                                <InputNumber
                                    size="small"
                                    min={1}
                                    max={15}
                                    value={Math.max(1, Math.min(15, Math.floor(Math.abs(Number(node.metadata?.textCount) || 1))))}
                                    onChange={(value) => onConfigChange(node.id, { textCount: Math.max(1, Math.min(15, Math.floor(Math.abs(Number(value)) || 1))) })}
                                    aria-label={t("canvasPrompt.textCount")}
                                    className="!w-14 !h-7 [&_.ant-input-number-input]:!text-[var(--fs-tiny)]"
                                />
                            </Tooltip>
                        </>
                    ) : mode === "image" ? (
                        <CanvasImageSettingsPopover
                            config={config}
                            isOptionAvailable={isOptionAvailable}
                            optionPatch={optionPatch}
                            placement={expanded ? "bottomRight" : "bottomLeft"}
                            buttonClassName="canvas-node-composer-settings-trigger [&>span]:min-w-0 [&_.lucide]:!size-3"
                            onConfigChange={changeModelOption}
                            onMissingConfig={() => navigateToSettings({ continueCreation: true })}
                            onOpenChange={expanded ? undefined : onImageSettingsOpenChange}
                        />
                    ) : mode === "video" ? (
                        <CanvasVideoSettingsPopover
                            config={config}
                            isOptionAvailable={isOptionAvailable}
                            optionPatch={optionPatch}
                            buttonClassName="canvas-node-composer-settings-trigger [&>span]:min-w-0 [&_.lucide]:!size-3"
                            onConfigChange={changeModelOption}
                        />
                    ) : mode === "audio" ? (
                        <CanvasAudioSettingsPopover
                            config={config}
                            references={resolvedMentionReferences}
                            bindings={filterActiveCanvasAudioVoiceBindings(node.metadata?.audioVoiceBindings, resolvedMentionReferences)}
                            onBindingsChange={(audioVoiceBindings) => onConfigChange(node.id, { audioVoiceBindings })}
                            buttonClassName="canvas-node-composer-settings-trigger [&>span]:min-w-0 [&_.lucide]:!size-3"
                            onConfigChange={(key, value) => onConfigChange(node.id, audioConfigPatch(key, value))}
                        />
                    ) : null}
                </div>
                <div className="canvas-node-composer-auxiliary">
                    {mode === "image" ? <CanvasCameraControlPopover cameraControl={node.metadata?.cameraControl} onCameraControlChange={(options) => onConfigChange(node.id, { cameraControl: options })} theme={theme} compact={!expanded} /> : null}
                    <ReferenceToolsPopover
                        canAutoMention={canAutoMention}
                        autoLinkEnabled={autoLinkEnabled}
                        onAutoMention={() => updatePrompt(autoMentionedPrompt)}
                        onAutoLinkEnabledChange={setAutoLinkEnabled}
                        accent={monochromeAccent}
                        compact={!expanded}
                    />
                </div>
                <div className="canvas-node-composer-actions">
                    <CanvasPromptVoiceInput
                        key={`${node.id}:${expanded}`}
                        disabled={isRunning || (expandedPromptOpen && !expanded)}
                        onBusyChange={setVoiceActive}
                        onTranscribed={(text) => updatePrompt(prompt.trimEnd() ? `${prompt.trimEnd()} ${text}` : text)}
                    />
                    {renderSubmitButton(expanded)}
                </div>
            </div>
        );

    const renderPromptEditor = (expanded: boolean) => {
        const bounds = expanded ? expandedPromptBounds : promptBounds;
        const height = expanded ? expandedComposerHeight : composerHeight;
        return (
            <div className="canvas-composer-input-content">
                <CanvasComposerAttachments
                    ref={expanded ? expandedAttachmentInput : attachmentInput}
                    key={`${node.id}:${expanded}`}
                    mode={mode}
                    attachments={attachments}
                    references={mediaReferences}
                    attachmentReferences={directMentionReferences}
                    expanded={expanded}
                    onRemoveReference={onRemoveReference ? (reference) => onRemoveReference(node.id, reference) : undefined}
                    onReorderReferences={onReorderReferences ? (ids) => onReorderReferences(node.id, ids) : undefined}
                    onReplaceReferenceFiles={onReplaceReferenceFiles ? (reference, files) => onReplaceReferenceFiles(node.id, reference, files) : undefined}
                    onClear={() => {
                        let nextPrompt = removeComposerAttachmentMentions(prompt, attachments, []);
                        if (onRemoveReference)
                            for (const reference of activeReferences) {
                                onRemoveReference(node.id, reference);
                                for (const token of [canvasResourceMentionToken(reference), `@[node:${reference.nodeId}]`]) nextPrompt = replaceCanvasMentionToken(nextPrompt, token, "");
                            }
                        updatePrompt(nextPrompt);
                        onConfigChange(node.id, { composerAttachments: [] });
                    }}
                    limits={attachmentLimits}
                    used={{ maxImages: requirements.input!.imageCount, maxVideos: requirements.input!.videoCount, maxAudios: requirements.input!.audioCount }}
                    acceptsCounts={(counts) =>
                        (mode !== "image" && mode !== "video") ||
                        Boolean(
                            resolveCompatibleModel(config, config.model, {
                                ...resolvedRequirements,
                                allowIncompleteInputs: true,
                                input: { ...requirements.input!, imageCount: counts.maxImages, videoCount: counts.maxVideos, audioCount: counts.maxAudios },
                            }),
                        )
                    }
                    disabled={isRunning || attachmentsUploading}
                    onChange={(composerAttachments) => {
                        const nextPrompt = removeComposerAttachmentMentions(prompt, attachments, composerAttachments);
                        if (nextPrompt !== prompt) updatePrompt(nextPrompt);
                        onConfigChange(node.id, { composerAttachments });
                    }}
                    onBusyChange={setAttachmentsUploading}
                />
                <div
                    className="canvas-node-composer-editor"
                    data-canvas-tour="composer-editor"
                    style={{ height }}
                    onDragOver={(event) => {
                        if (event.dataTransfer.types.includes("Files")) {
                            event.preventDefault();
                            event.stopPropagation();
                        }
                    }}
                    onDrop={(event) => {
                        if (!event.dataTransfer.files.length) return;
                        event.stopPropagation();
                        if (event.defaultPrevented) return;
                        event.preventDefault();
                        (expanded ? expandedAttachmentInput : attachmentInput).current?.upload(Array.from(event.dataTransfer.files));
                    }}
                    onPasteCapture={(event) => {
                        if (!event.clipboardData.files.length) return;
                        event.preventDefault();
                        event.stopPropagation();
                        (expanded ? expandedAttachmentInput : attachmentInput).current?.upload(Array.from(event.clipboardData.files));
                    }}
                >
                    <ConnectedReferenceShelf
                        targetNodeId={node.id}
                        references={inlineReferences}
                        theme={theme}
                        onInsert={insertPromptReference}
                        onRemove={(reference) => onRemoveReference?.(node.id, reference)}
                        onReorder={onReorderReferences ? (orderedNodeIds) => onReorderReferences(node.id, orderedNodeIds) : undefined}
                        onReplaceReference={onReplaceReference ? (oldReference, sourceNodeId) => onReplaceReference(node.id, oldReference, sourceNodeId) : undefined}
                        onReplaceReferenceFiles={onReplaceReferenceFiles ? (oldReference, files) => onReplaceReferenceFiles(node.id, oldReference, files) : undefined}
                    />
                    <CanvasResourceMentionTextarea
                        key={node.id}
                        batchChanges
                        value={prompt}
                        references={composerMentionReferences}
                        onSelectReference={onAddReference ? (reference) => (reference.active ? reference : onAddReference(node.id, reference)) : undefined}
                        includeAssetLibrary
                        onChange={updatePrompt}
                        autoLinkEnabled={autoLinkEnabled}
                        onReferenceFilesDrop={onReplaceReferenceFiles ? (reference, files) => onReplaceReferenceFiles(node.id, reference, files) : undefined}
                        onContentSizeChange={expanded ? setExpandedPromptContentHeight : setPromptContentHeight}
                        containerClassName="min-h-0 flex-1"
                        className={
                            expanded
                                ? "thin-scrollbar h-full w-full resize-none overflow-y-auto border-none bg-transparent px-3 py-2.5 text-[var(--fs-body-lg)] leading-6 !outline-none !ring-0 !shadow-none focus:!outline-none focus:!ring-0 focus:!shadow-none placeholder:text-current placeholder:opacity-35"
                                : "thin-scrollbar h-full w-full resize-none overflow-y-auto border-none bg-transparent px-2.5 py-1.5 text-[var(--fs-body)] leading-5 !outline-none !ring-0 !shadow-none focus:!outline-none focus:!ring-0 focus:!shadow-none placeholder:text-current placeholder:opacity-35"
                        }
                        style={{ color: theme.node.text, outline: "none", boxShadow: "none" }}
                        placeholder={
                            node.metadata?.modelStarterKey
                                ? (MODEL_STARTER_COPY[locale as keyof typeof MODEL_STARTER_COPY] || MODEL_STARTER_COPY["en-US"])[MODEL_STARTERS[node.metadata.modelStarterKey].placeholder]
                                : t(promptPlaceholder(mode, hasImageContent, hasTextContent, mode === "audio" && isMusicModelConfig(config)))
                        }
                        aria-label={t(mode === "image" ? "canvasPrompt.imagePrompt" : mode === "video" ? "canvasPrompt.videoPrompt" : mode === "audio" ? "canvasPrompt.audioPrompt" : "canvasPrompt.textPrompt")}
                    />
                </div>
                <PromptResizeHandle height={height} min={bounds.min} max={expanded ? bounds.max : manualPromptBounds.max} onResize={expanded ? setManualExpandedPromptHeight : setManualPromptHeight} />
            </div>
        );
    };

    return (
        <CanvasPromptOptimizerDrawer
            open={promptOptimizerOpen}
            prompt={prompt}
            generationMode={mode === "image" || mode === "video" ? mode : "image"}
            targetModel={modelOptionName(config.model) || config.model}
            targetProtocol={priceChannel.modelCosts?.find((item) => item.model === modelOptionName(config.model))?.protocol || priceChannel.interfaceType}
            config={globalConfig}
            optimizerModel={globalConfig.textModel}
            references={activeReferences}
            provider={promptOptimizerProvider}
            onClose={() => setPromptOptimizerOpen(false)}
            onApply={(nextPrompt) => updatePrompt(nextPrompt)}
        >
            <div
                className="canvas-node-composer"
                data-canvas-tour="node-composer"
                data-canvas-edit-node-id={node.id}
                style={composerSurfaceStyle}
                onMouseDown={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
                onWheel={(event) => event.stopPropagation()}
            >
                {renderComposerHeader(false)}

                {renderPromptEditor(false)}

                {/* B区 参数区（对应 #98 决策2：默认折叠，手风琴展开）*/}
                {hasVideoPromptTools ? (
                    <div className="canvas-node-composer-parameters overflow-hidden">
                        <button
                            type="button"
                            className="canvas-node-composer-parameters-toggle flex w-full items-center gap-1.5 rounded-[var(--r-md)] px-2 py-1 text-[var(--fs-micro)] font-medium transition-colors"
                            style={{ color: theme.node.muted }}
                            onClick={() => setParamsExpanded(!paramsExpanded)}
                            aria-expanded={paramsExpanded}
                            aria-label={paramsExpanded ? t("canvasPrompt.collapseParams") : t("canvasPrompt.expandParams")}
                        >
                            <SlidersHorizontal className="size-3" strokeWidth={1.8} />
                            <span className="flex-1 text-left">{t("canvasPrompt.params")}</span>
                            <ChevronDown className={`size-3 transition-transform duration-200 ${paramsExpanded ? "rotate-180" : ""}`} strokeWidth={1.8} />
                        </button>
                        {paramsExpanded ? (
                            <div className="pt-1">
                                <CanvasVideoPromptTools metadata={node.metadata} frameOptions={videoFrameOptions} onMetadataChange={(patch) => onConfigChange(node.id, patch)} />
                            </div>
                        ) : null}
                    </div>
                ) : null}

                {creditsReady && !creditsShort && !expandedPromptOpen && (
                    <p role="status" className="mb-2 text-right text-xs">
                        {paymentCopy(locale).ready}
                    </p>
                )}
                {renderComposerControls(false)}

                <ComposerCornerResizeHandle height={composerHeight} min={promptBounds.min} max={manualPromptBounds.max} onResize={setManualPromptHeight} />

                {expandedPromptOpen && (
                    <Modal
                        className="canvas-prompt-editor-modal"
                        open={expandedPromptOpen}
                        title={null}
                        footer={null}
                        centered
                        width={920}
                        destroyOnHidden
                        onCancel={() => {
                            setExpandedPresetOpen(false);
                            setExpandedPromptOpen(false);
                        }}
                        styles={{
                            container: { border: 0, borderRadius: "var(--canvas-composer-radius)", padding: 0, overflow: "hidden", background: theme.node.panel, boxShadow: theme.node.shadow },
                            body: { minHeight: 0, padding: 0 },
                        }}
                    >
                        <div className="relative flex min-h-0 flex-col gap-2.5 overflow-visible p-3" data-canvas-edit-node-id={node.id} style={{ ...composerTokens, color: theme.node.text }}>
                            <div className="shrink-0 pr-8">{renderComposerHeader(true)}</div>
                            {renderPromptEditor(true)}
                            {hasVideoPromptTools ? (
                                <div className="canvas-node-composer-parameters shrink-0">
                                    <CanvasVideoPromptTools metadata={node.metadata} frameOptions={videoFrameOptions} onMetadataChange={(patch) => onConfigChange(node.id, patch)} />
                                </div>
                            ) : null}
                            <div className="shrink-0">
                                {creditsReady && !creditsShort && (
                                    <p role="status" className="mb-2 text-right text-xs">
                                        {paymentCopy(locale).ready}
                                    </p>
                                )}
                                {renderComposerControls(true)}
                            </div>
                        </div>
                    </Modal>
                )}
                {purchaseOpen && (
                    <InsufficientCreditsModal
                        open
                        onClose={() => {
                            sessionStorage.removeItem("checkout-origin-node");
                            setPurchaseOpen(false);
                        }}
                        need={quotedCredits || 0}
                        balance={balanceCredits || 0}
                    />
                )}
            </div>
        </CanvasPromptOptimizerDrawer>
    );
}

function ReferenceToolsPopover({
    canAutoMention,
    autoLinkEnabled,
    onAutoMention,
    onAutoLinkEnabledChange,
    accent,
    compact,
}: {
    canAutoMention: boolean;
    autoLinkEnabled: boolean;
    onAutoMention: () => void;
    onAutoLinkEnabledChange: (enabled: boolean) => void;
    accent: string;
    compact: boolean;
}) {
    const { t } = useI18n();
    return (
        <Popover
            trigger="click"
            placement="topRight"
            rootClassName="canvas-reference-tools-popover"
            arrow={false}
            align={{ offset: [0, -8] }}
            styles={{ root: { width: "min(280px, calc(100vw - 24px))" }, container: { width: "100%" }, content: { width: "100%", padding: 10 } }}
            content={
                <div className="space-y-1.5">
                    <div>
                        <div className="text-sm font-medium leading-5">{t("canvasExtra.referenceTools")}</div>
                        <div className="mt-0.5 text-xs leading-4 text-black/50 dark:text-white/50">{t("canvasExtra.referenceToolsHelp")}</div>
                    </div>
                    <div className="flex min-h-6 items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm">
                            <Link2 className="size-3.5" />
                            {t("canvasExtra.autoLinkLabel")}
                        </div>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={autoLinkEnabled}
                            aria-label={autoLinkEnabled ? t("canvasExtra.autoLinkOff") : t("canvasExtra.autoLinkOn")}
                            className="canvas-reference-autolink-switch relative inline-flex h-5 w-9 items-center rounded-full border transition-colors"
                            style={{ background: autoLinkEnabled ? `${accent}14` : "transparent", borderColor: autoLinkEnabled ? accent : "color-mix(in srgb, currentColor 22%, transparent)", color: accent }}
                            onClick={() => onAutoLinkEnabledChange(!autoLinkEnabled)}
                        >
                            <span className={`size-3.5 rounded-full shadow-sm transition-transform ${autoLinkEnabled ? "translate-x-[18px]" : "translate-x-0.5"}`} style={{ background: autoLinkEnabled ? accent : "currentColor" }} />
                        </button>
                    </div>
                    <button
                        type="button"
                        className="canvas-reference-tools-mention-button flex h-7 w-full items-center justify-center gap-1.5 rounded-md border px-2.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-45"
                        style={{ borderColor: accent, color: accent, background: "transparent" }}
                        disabled={!canAutoMention}
                        onClick={onAutoMention}
                    >
                        <AtSign className="size-3.5" />
                        {t("canvasExtra.autoMentionAll")}
                    </button>
                </div>
            }
        >
            <button type="button" className={`canvas-node-composer-reference-tools-trigger inline-flex shrink-0 items-center gap-1 ${compact ? "is-compact" : ""}`} aria-label={t("canvasExtra.referenceToolsAria")} title={t("canvasExtra.referenceTools")}>
                <AtSign className="size-3.5" />
                {!compact ? <span>{t("canvasExtra.referenceToolsLabel")}</span> : null}
            </button>
        </Popover>
    );
}

function GenerationModeIcon({ mode }: { mode: CanvasNodeGenerationMode }) {
    if (mode === "image") return <ImagePlus className="size-3" />;
    if (mode === "video") return <Video className="size-3" />;
    if (mode === "audio") return <Music2 className="size-3" />;
    return <FileText className="size-3" />;
}

function modeDisplayName(mode: CanvasNodeGenerationMode) {
    if (mode === "image") return "canvasPrompt.imageGeneration";
    if (mode === "video") return "canvasPrompt.videoGeneration";
    if (mode === "audio") return "canvasPrompt.audioGeneration";
    return "canvasPrompt.textGeneration";
}

function referenceShelfHeading(references: CanvasResourceReference[], t: ReturnType<typeof useI18n>["t"], number: ReturnType<typeof useI18n>["number"]) {
    const label = references.every((reference) => reference.kind === "image" || reference.kind === "character") ? t("canvasPrompt.referenceImages") : t("canvasPrompt.references");
    return `${label} · ${number(references.length)}`;
}

function ConnectedReferenceShelf({
    targetNodeId,
    references,
    theme,
    onInsert,
    onRemove,
    onReorder,
    onReplaceReference,
    onReplaceReferenceFiles,
}: {
    targetNodeId?: string;
    references: CanvasResourceReference[];
    theme: CanvasTheme;
    onInsert: (reference: CanvasResourceReference) => void;
    onRemove?: (reference: CanvasResourceReference) => void;
    onReorder?: (orderedNodeIds: string[]) => void;
    onReplaceReference?: (oldReference: CanvasResourceReference, sourceNodeId: string) => void;
    onReplaceReferenceFiles?: (oldReference: CanvasResourceReference, files: File[]) => void;
}) {
    const { t, number } = useI18n();
    const activeReferences = references.filter((item) => item.active && item.kind !== "skill");
    const [imagePreview, setImagePreview] = useState<CanvasResourceReference | null>(null);
    const [draggedReferenceId, setDraggedReferenceId] = useState<string | null>(null);
    const [dropTargetReferenceId, setDropTargetReferenceId] = useState<string | null>(null);
    const hoverPreview = useCanvasReferenceHoverPreview(activeReferences);
    if (!activeReferences.length) return null;

    const moveReference = (sourceId: string, targetId: string) => {
        if (!onReorder || sourceId === targetId) return;
        const sourceIndex = activeReferences.findIndex((reference) => reference.nodeId === sourceId);
        const targetIndex = activeReferences.findIndex((reference) => reference.nodeId === targetId);
        if (sourceIndex < 0 || targetIndex < 0) return;
        const ordered = [...activeReferences];
        const [moved] = ordered.splice(sourceIndex, 1);
        ordered.splice(targetIndex, 0, moved);
        onReorder(ordered.map((reference) => reference.nodeId));
    };

    const moveReferenceByOffset = (sourceId: string, offset: -1 | 1) => {
        const sourceIndex = activeReferences.findIndex((reference) => reference.nodeId === sourceId);
        const target = activeReferences[sourceIndex + offset];
        if (!target) return;
        moveReference(sourceId, target.nodeId);
    };

    return (
        <>
            <div {...hoverPreview.handlers} className="canvas-node-composer-references" role="group" aria-label={t("canvasPrompt.connected")}>
                <div className="canvas-node-composer-references-track thin-scrollbar">
                    {activeReferences.map((reference, index) => {
                        const label = localizedCanvasReferenceLabel(reference, t);
                        const title = localizedCanvasReferenceTitle(reference, t);
                        const canPreview = Boolean(reference.previewUrl) && (reference.kind === "image" || reference.kind === "character" || reference.kind === "video");
                        const isDropTarget = dropTargetReferenceId === reference.id;
                        return (
                            <span
                                key={reference.id}
                                className="canvas-node-reference-chip relative"
                                data-reference-chip="true"
                                data-reference-id={reference.id}
                                data-reference-node-id={reference.nodeId}
                                data-reference-label={reference.label}
                                data-reference-title={reference.title || reference.label}
                                data-target-node-id={targetNodeId}
                                data-dragging={draggedReferenceId === reference.nodeId || undefined}
                                data-drop-target={isDropTarget ? "true" : undefined}
                                style={{
                                    boxShadow: isDropTarget ? "0 0 0 2px #3b82f6, 0 0 16px rgba(59, 130, 246, 0.45)" : undefined,
                                }}
                                onDragOver={(event) => {
                                    if (draggedReferenceId) {
                                        if (!onReorder) return;
                                        event.preventDefault();
                                        event.dataTransfer.dropEffect = "move";
                                        return;
                                    }
                                    const hasImageNode = event.dataTransfer.types.includes("application/x-canvas-image-node-id");
                                    const hasFiles = event.dataTransfer.types.includes("Files");
                                    if (hasImageNode || hasFiles) {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        event.dataTransfer.dropEffect = "copy";
                                        if (dropTargetReferenceId !== reference.id) {
                                            setDropTargetReferenceId(reference.id);
                                        }
                                    }
                                }}
                                onDragLeave={(event) => {
                                    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                                        if (dropTargetReferenceId === reference.id) {
                                            setDropTargetReferenceId(null);
                                        }
                                    }
                                }}
                                onDrop={(event) => {
                                    if (dropTargetReferenceId === reference.id) {
                                        setDropTargetReferenceId(null);
                                    }
                                    if (draggedReferenceId) {
                                        event.preventDefault();
                                        const sourceId = draggedReferenceId || event.dataTransfer.getData("text/plain");
                                        setDraggedReferenceId(null);
                                        moveReference(sourceId, reference.nodeId);
                                        return;
                                    }
                                    const sourceNodeId = event.dataTransfer.getData("application/x-canvas-image-node-id");
                                    if (sourceNodeId && sourceNodeId !== reference.nodeId && onReplaceReference) {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        onReplaceReference(reference, sourceNodeId);
                                        return;
                                    }
                                    const files = Array.from(event.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
                                    if (files.length && onReplaceReferenceFiles) {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        onReplaceReferenceFiles(reference, files);
                                        return;
                                    }
                                }}
                            >
                                {onReorder ? (
                                    <button
                                        type="button"
                                        className="canvas-node-reference-drag-handle"
                                        draggable
                                        title={t("canvasExtra.reorderAria", { label })}
                                        aria-label={t("canvasExtra.reorderHint", { label })}
                                        onDragStart={(event) => {
                                            setDraggedReferenceId(reference.nodeId);
                                            event.dataTransfer.effectAllowed = "move";
                                            event.dataTransfer.setData("text/plain", reference.nodeId);
                                        }}
                                        onDragEnd={() => setDraggedReferenceId(null)}
                                        onKeyDown={(event) => {
                                            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                                            event.preventDefault();
                                            moveReferenceByOffset(reference.nodeId, event.key === "ArrowLeft" ? -1 : 1);
                                        }}
                                        onPointerDown={(event) => event.stopPropagation()}
                                    >
                                        <GripVertical className="size-3" />
                                    </button>
                                ) : null}
                                <span className="canvas-node-reference-order" aria-hidden>
                                    {index + 1}
                                </span>
                                <button
                                    type="button"
                                    className="canvas-node-reference-preview"
                                    data-media-preview-id={reference.id}
                                    style={{ background: theme.toolbar.itemHover, color: theme.node.text, outlineColor: theme.node.activeStroke }}
                                    title={canPreview ? t("canvasPrompt.preview", { title }) : t("canvasPrompt.insert", { label })}
                                    aria-label={canPreview ? t("canvasPrompt.preview", { title }) : t("canvasPrompt.insert", { label })}
                                    onClick={() => (canPreview ? setImagePreview(reference) : onInsert(reference))}
                                >
                                    <ReferenceThumbnail reference={reference} />
                                    {canPreview ? (
                                        <span className="canvas-node-reference-preview-hint" aria-hidden="true">
                                            <Maximize2 className="size-3" />
                                        </span>
                                    ) : null}
                                </button>
                                <button type="button" className="canvas-node-reference-label" title={t("canvasPrompt.insert", { label })} onClick={() => onInsert(reference)}>
                                    <span className="opacity-55">@</span>
                                    <span className="truncate">{label}</span>
                                </button>
                                {onRemove ? (
                                    <button
                                        type="button"
                                        className="canvas-node-reference-remove"
                                        style={{ background: theme.toolbar.panel, borderColor: theme.node.stroke, color: theme.node.text }}
                                        title={t("canvasPrompt.removeConnection")}
                                        aria-label={t("canvasPrompt.remove", { label })}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            onRemove(reference);
                                        }}
                                        onPointerDown={(event) => event.stopPropagation()}
                                    >
                                        <X className="size-3" />
                                    </button>
                                ) : null}
                            </span>
                        );
                    })}
                </div>
            </div>
            {hoverPreview.preview}
            {imagePreview?.previewUrl ? (
                <AntImage
                    src={imagePreview.previewUrl}
                    alt={imagePreview.title || imagePreview.label}
                    style={{ display: "none" }}
                    preview={{
                        open: true,
                        movable: true,
                        minScale: 0.5,
                        maxScale: 12,
                        scaleStep: 0.25,
                        onOpenChange: (open) => !open && setImagePreview(null),
                    }}
                />
            ) : null}
        </>
    );
}

function ReferenceThumbnail({ reference }: { reference: CanvasResourceReference }) {
    if (reference.kind === "image" && reference.previewUrl) return <img src={reference.previewUrl} alt="" className="size-full object-cover" />;
    if (reference.kind === "video" && reference.previewUrl) return <img src={reference.previewUrl} alt="" className="size-full bg-black object-cover" loading="lazy" decoding="async" />;
    if (reference.kind === "character" && reference.previewUrl) return <img src={reference.previewUrl} alt="" className="size-full bg-black/5 object-contain" />;

    const Icon = reference.sourceType === CanvasNodeType.Drawing ? Pencil : reference.kind === "character" ? UserRound : reference.kind === "audio" ? Music2 : reference.kind === "video" ? Video : reference.kind === "image" ? ImageIcon : FileText;
    return (
        <span className="grid size-full place-items-center bg-black/10 text-current dark:bg-white/10">
            <Icon className="size-3.5 opacity-75" />
        </span>
    );
}

function PromptResizeHandle({ height, min, max, onResize }: { height: number; min: number; max: number; onResize: (height: number) => void }) {
    const { t } = useI18n();
    const dragRef = useRef<{ pointerId: number; startY: number; startHeight: number } | null>(null);

    const finishResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
        if (dragRef.current?.pointerId !== event.pointerId) return;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        dragRef.current = null;
    };

    const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
        if (event.key === "ArrowUp") {
            event.preventDefault();
            onResize(Math.max(min, height - 8));
        } else if (event.key === "ArrowDown") {
            event.preventDefault();
            onResize(Math.min(max, height + 8));
        } else if (event.key === "Home") {
            event.preventDefault();
            onResize(min);
        } else if (event.key === "End") {
            event.preventDefault();
            onResize(max);
        }
    };

    return (
        <button
            type="button"
            className="canvas-node-composer-resize-handle"
            role="separator"
            aria-label={t("canvasPrompt.resize")}
            aria-orientation="horizontal"
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={Math.round(height)}
            onKeyDown={handleKeyDown}
            onPointerDown={(event) => {
                if (event.button !== 0) return;
                event.preventDefault();
                event.stopPropagation();
                dragRef.current = { pointerId: event.pointerId, startY: event.clientY, startHeight: height };
                event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
                const drag = dragRef.current;
                if (!drag || drag.pointerId !== event.pointerId) return;
                if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
                    dragRef.current = null;
                    return;
                }
                if ((event.buttons & 1) === 0) {
                    finishResize(event);
                    return;
                }
                onResize(Math.min(max, Math.max(min, drag.startHeight + event.clientY - drag.startY)));
            }}
            onPointerUp={finishResize}
            onPointerCancel={finishResize}
            onLostPointerCapture={(event) => {
                if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
            }}
        >
            <span aria-hidden />
        </button>
    );
}

/** 右下角拖动：横向改面板宽度（所有节点共用，存本机），纵向改输入框高度；双击恢复默认。 */
function ComposerCornerResizeHandle({ height, min, max, onResize }: { height: number; min: number; max: number; onResize: (height: number | null) => void }) {
    const { t } = useI18n();
    const dragRef = useRef<{ pointerId: number; startX: number; startY: number; startHeight: number; startWidth: number } | null>(null);
    const stop = (event: ReactPointerEvent<HTMLButtonElement>) => {
        if (dragRef.current?.pointerId !== event.pointerId) return;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        dragRef.current = null;
    };
    return (
        <button
            type="button"
            className="canvas-node-composer-corner-handle"
            data-canvas-tour="composer-corner"
            aria-label={t("canvasPrompt.resizeCorner")}
            title={t("canvasPrompt.resizeCorner")}
            onDoubleClick={(event) => {
                event.stopPropagation();
                setComposerWidthPreference(null);
                onResize(null);
            }}
            onPointerDown={(event) => {
                if (event.button !== 0) return;
                event.preventDefault();
                event.stopPropagation();
                const panel = event.currentTarget.closest<HTMLElement>("[data-canvas-node-panel]");
                dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, startHeight: height, startWidth: panel?.getBoundingClientRect().width ?? COMPOSER_MIN_WIDTH };
                event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
                const drag = dragRef.current;
                if (!drag || drag.pointerId !== event.pointerId) return;
                if ((event.buttons & 1) === 0) {
                    stop(event);
                    return;
                }
                // 面板以节点为中心左右对称展开，宽度按两倍位移变化，拖动点才能跟住鼠标。
                setComposerWidthPreference(drag.startWidth + (event.clientX - drag.startX) * 2);
                onResize(Math.min(max, Math.max(min, drag.startHeight + event.clientY - drag.startY)));
            }}
            onPointerUp={stop}
            onPointerCancel={stop}
            onLostPointerCapture={(event) => {
                if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
            }}
        >
            <svg viewBox="0 0 10 10" aria-hidden>
                <path d="M9 3 3 9M9 6 6 9" />
            </svg>
        </button>
    );
}

function manualPromptEditorBounds(bounds: { min: number; max: number }) {
    const viewportHeight = typeof window === "undefined" ? 0 : window.innerHeight;
    return { min: bounds.min, max: Math.max(bounds.max, Math.round(viewportHeight * 0.5)) };
}

function promptEditorBounds(expanded: boolean, hasReferences: boolean) {
    const shelfHeight = hasReferences ? PROMPT_REFERENCE_SHELF_HEIGHT : 0;
    const min = (expanded ? PROMPT_EDITOR_EXPANDED_MIN_HEIGHT : PROMPT_EDITOR_MIN_HEIGHT) + shelfHeight;
    const max = (expanded ? PROMPT_EDITOR_EXPANDED_LINE_HEIGHT * PROMPT_EDITOR_MAX_LINES + PROMPT_EDITOR_EXPANDED_VERTICAL_PADDING : PROMPT_EDITOR_LINE_HEIGHT * PROMPT_EDITOR_MAX_LINES + PROMPT_EDITOR_VERTICAL_PADDING) + shelfHeight;
    return { min, max };
}

function estimatePromptContentHeight(value: string, expanded: boolean) {
    if (!value.trim()) return expanded ? PROMPT_EDITOR_EXPANDED_MIN_HEIGHT : PROMPT_EDITOR_MIN_HEIGHT;
    const charsPerLine = expanded ? 34 : 38;
    const lineCount = value.split("\n").reduce((total, line) => total + Math.max(1, Math.ceil(Array.from(line).length / charsPerLine)), 0);
    const lineHeight = expanded ? PROMPT_EDITOR_EXPANDED_LINE_HEIGHT : PROMPT_EDITOR_LINE_HEIGHT;
    const verticalPadding = expanded ? PROMPT_EDITOR_EXPANDED_VERTICAL_PADDING : PROMPT_EDITOR_VERTICAL_PADDING;
    return Math.max(expanded ? PROMPT_EDITOR_EXPANDED_MIN_HEIGHT : PROMPT_EDITOR_MIN_HEIGHT, lineCount * lineHeight + verticalPadding);
}

function clampPromptHeight(height: number, bounds: { min: number; max: number }) {
    return Math.min(bounds.max, Math.max(bounds.min, height));
}

function defaultMode(type: CanvasNodeData["type"]): CanvasNodeGenerationMode {
    return type === CanvasNodeType.Text || type === CanvasNodeType.Skill ? "text" : type === CanvasNodeType.Video ? "video" : type === CanvasNodeType.Audio ? "audio" : "image";
}

export function buildNodeConfig(globalConfig: AiConfig, node: CanvasNodeData, mode: CanvasNodeGenerationMode, requirements: ModelRequirements): AiConfig {
    const spec = readNodeGenerationSpec(node);
    node = { ...node, metadata: canonicalGenerationMetadata(node, mode) };
    const availableModels = selectableModelsByCapability(globalConfig, mode);
    const defaultModel = mode === "image" ? globalConfig.imageModel : mode === "video" ? globalConfig.videoModel : mode === "audio" ? globalConfig.audioModel : globalConfig.textModel;
    const fallbackModel = mode === "image" ? defaultConfig.imageModel : mode === "video" ? defaultConfig.videoModel : mode === "audio" ? defaultConfig.audioModel : defaultConfig.textModel;
    const selection = spec?.mode === mode ? resolveGenerationSelection(globalConfig, spec.modelSelection) : "";
    const preferredModel =
        resolveCanvasGenerationModel(globalConfig, selection || node.metadata?.model || resolvePreferredStarterModel(node.metadata?.preferredModelCodes, globalConfig.channels), mode) ||
        resolveCanvasGenerationModel(globalConfig, defaultModel, mode) ||
        fallbackModel ||
        availableModels[0] ||
        "";
    const selectionRequirements = mode === "image" ? { ...requirements, imageSize: node.metadata?.size || globalConfig.size || defaultConfig.size } : requirements;
    const model = !modelCompatibilityError(globalConfig, preferredModel, selectionRequirements) ? preferredModel : resolveCompatibleModelInSameGroup(globalConfig, preferredModel, selectionRequirements) || preferredModel;
    const defaults = resolveModelGenerationDefaults(
        globalConfig,
        model,
        mode === "image" ? "image" : mode === "video" ? "video" : undefined,
        mode === "image"
            ? {
                  size: node.metadata?.size,
                  quality: node.metadata?.quality,
                  imageResolution: node.metadata?.imageResolution,
                  transparentBackground: node.metadata?.transparentBackground,
                  videoWatermark: node.metadata?.watermark,
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
    return {
        ...globalConfig,
        textThinking: node.metadata?.textThinking ?? globalConfig.textThinking,
        modelParameters: node.metadata?.modelParameters ?? globalConfig.modelParameters,
        textStream: node.metadata?.textStream ?? globalConfig.textStream,
        systemPrompt: node.metadata?.systemPrompt ?? globalConfig.systemPrompt,
        model,
        quality: defaults.quality ?? globalConfig.quality ?? defaultConfig.quality,
        imageResolution: defaults.imageResolution,
        size: defaults.size ?? globalConfig.size ?? defaultConfig.size,
        transparentBackground: defaults.transparentBackground ?? "false",
        videoSeconds: defaults.videoSeconds || normalizeVideoDuration(globalConfig.videoSeconds || defaultConfig.videoSeconds),
        vquality: defaults.vquality ?? normalizeVideoResolution(globalConfig.vquality || defaultConfig.vquality),
        videoGenerateAudio: defaults.videoGenerateAudio ?? globalConfig.videoGenerateAudio ?? defaultConfig.videoGenerateAudio,
        videoWatermark: defaults.videoWatermark ?? globalConfig.videoWatermark ?? defaultConfig.videoWatermark,
        audioMode: mode === "audio" && supportsAudioReferenceVoice(globalConfig, model) ? (node.metadata?.audioMode ?? globalConfig.audioMode) : undefined,
        audioVoice: node.metadata?.audioVoice || globalConfig.audioVoice || defaultConfig.audioVoice,
        audioFormat: node.metadata?.audioFormat || globalConfig.audioFormat || defaultConfig.audioFormat,
        audioSpeed: node.metadata?.audioSpeed || globalConfig.audioSpeed || defaultConfig.audioSpeed,
        audioInstructions: node.metadata?.audioInstructions || globalConfig.audioInstructions || defaultConfig.audioInstructions,
        musicInstrumental: node.metadata?.musicInstrumental || globalConfig.musicInstrumental || defaultConfig.musicInstrumental || "false",
        count: defaults.count ?? String(node.metadata?.count || (mode === "image" ? globalConfig.canvasImageCount || globalConfig.count : globalConfig.count) || defaultConfig.count),
    };
}

function promptPlaceholder(mode: CanvasNodeGenerationMode, hasImageContent: boolean, hasTextContent: boolean, isMusic = false) {
    if (mode === "video") return "canvasPrompt.placeholderVideo";
    if (mode === "audio") return isMusic ? "canvasPrompt.placeholderMusic" : "canvasPrompt.placeholderAudio";
    if (mode === "image") return hasImageContent ? "canvasPrompt.placeholderImageEdit" : "canvasPrompt.placeholderImage";
    return hasTextContent ? "canvasPrompt.placeholderTextEdit" : "canvasPrompt.placeholderText";
}

function videoConfigPatch(key: keyof AiConfig, value: string) {
    if (key === "videoSeconds") return { seconds: value };
    if (key === "videoGenerateAudio") return { generateAudio: value };
    if (key === "videoWatermark") return { watermark: value };
    if (key === "videoArkPrivateAssetUpload") return { arkPrivateAssetUpload: value };
    return { [key]: value };
}

function audioConfigPatch(key: CanvasAudioSettingKey, value: string) {
    if (key === "audioMode") return { audioMode: value as "tts" | "unified_edit" };
    if (key === "audioVoice") return { audioVoice: value };
    if (key === "audioFormat") return { audioFormat: value };
    if (key === "audioSpeed") return { audioSpeed: value };
    if (key === "musicInstrumental") return { musicInstrumental: value };
    return { audioInstructions: value };
}

// Display the exact microcredit charge, including small text requests.
function creditDisplayFormat(value: number): Intl.NumberFormatOptions {
    return { maximumFractionDigits: 2 };
}
