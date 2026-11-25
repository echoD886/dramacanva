import "@/styles/create-route.css";
import { formatCreditQuantity } from "@/lib/display-format";
import { modelStarterCanvasHref } from "../showcase/model-starter-route";
import { localizedGenerationError } from "@/i18n/generation-error";
import { ProductionToolsToolbar } from "@/pages/workbench/production-tools-toolbar";
import { productionTools as toolCatalog, productionToolPrompt, productionToolHasRequiredReference } from "@/pages/workbench/catalog";
import { useProductionText } from "@/i18n/production-tools";
import { guardVideoReferences, VIDEO_REFERENCE_ACTION_EVENT } from "@/lib/video-reference-validation";
import { GenerationErrorCard } from "@/components/generation-error-card";
import { classifyGenerationError, GenerationTaskFailure, GENERATION_ERROR_ACTIONS } from "@/lib/generation-failure";
import { generationPhase, generationTaskShowsProgress, type GenerationPhase } from "@/lib/generation-task-display";
import { GenerationPhaseSteps } from "@/components/ai/generation-phase-steps";
import { useI18n } from "@/i18n/use-i18n";
import type { MessageKey } from "@/i18n/messages";
import { lazy, Suspense, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type PointerEvent, type ReactNode, type RefObject } from "react";
import { App, Button, Drawer, Dropdown, Input, Modal, Popover, Spin, Tooltip } from "antd";
import { MoreHorizontal } from "lucide-react";
import { saveAs } from "file-saver";
import { creationConversationMarkdown, creationExportFilename } from "@/lib/creation-history-export";
import { Reorder } from "motion/react";
import {
    ArrowDown,
    ArrowUp,
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Clapperboard,
    Clock3,
    Copy,
    Download,
    FileText,
    Film,
    FolderOpen,
    History,
    Image as ImageIcon,
    LoaderCircle,
    Maximize2,
    MessageSquareText,
    Minimize2,
    Music2,
    Paperclip,
    Plus,
    RefreshCw,
    Search,
    SlidersHorizontal,
    Sparkles,
    WandSparkles,
    X,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { continueCreationConversationOnCanvas } from "@/services/creation-canvas-conversation";
import { b2Text } from "@/i18n/upstream-b2";
import { localForageStorageForScope } from "@/lib/localforage-storage";
import { creationHistoryAPI } from "@/services/api/creation-history";
import { CreationHistorySync, CREATION_HISTORY_SYNC_KEY, type HistorySyncStatus } from "@/services/creation-history-sync";
import { creationHistoryMedia, restoreHistoryMedia } from "@/services/creation-history-media";
import { CreationHistoryConflicts } from "./creation-history-conflicts";
import { getActiveUserScope } from "@/lib/user-scope";

import { AIMessageMarkdown } from "@/components/ai/ai-message-markdown";
import { GenerationToolCard, type GenerationToolStatus } from "@/components/ai/generation-tool-card";
import { MessageReasoning } from "@/components/ai/message-reasoning";
import type { AssetLibraryPickerItem } from "@/components/assets/asset-library-picker-modal";
import { CanvasResourceMentionTextarea } from "@/components/canvas/canvas-resource-mention-textarea";
import { CanvasPromptOptimizerDrawer } from "@/components/canvas/canvas-prompt-optimizer-drawer";
import { VoiceRecordingButton } from "@/components/conversation/voice-recording-button";
import { ModelPicker } from "@/components/model-picker";
import { CreditSymbol, requestCreditCost } from "@/constant/credits";
import { creationCanvasHandoffPath, creationResultAssetIds } from "@/lib/canvas/canvas-asset-handoff";
import { createGenerationBatchRetryContexts, createGenerationRetryContext, runGenerationOperationOnce, type GenerationRetryContext } from "@/lib/canvas/canvas-project-generation";
import { createClientId } from "@/lib/client-id";
import { generationErrorCode, generationErrorMessage } from "@/lib/generation-error";
import { useCopyText } from "@/hooks/use-copy-text";
import { useExternalAssetSources } from "@/hooks/use-external-asset-sources";
import { buildImageResolutionOptions, formatImageResolutionSize, imageRatioForSize, imageResolutionChoices, imageResolutionOption, imageSizeForResolution, supportsImageResolutionPresets, type ImageResolutionChoice } from "@/lib/image-resolution-tiers";
import { formatVideoResolutionLabel as videoResolutionLabel, VIDEO_RESOLUTION_OPTIONS } from "@/lib/video-generation-options";
import {
    adjustedOutputField,
    modelCapabilityConfigFor,
    normalizeImageValue,
    normalizeVideoValue,
    videoDurationOptions,
    videoSelectionAllowed,
    videoProfileForResolution,
    type ImageCapabilityConfig,
    type VideoCapabilityConfig,
} from "@/lib/model-capabilities";
import { inferVideoOperation, resolveCompatibleModel, mergedImageCapabilityConfig, type ModelRequirements } from "@/lib/model-selection";
import { backendModelRuntimeRequired, isGenerationTaskCancelled, runBackendGenerationTask, runBackendGenerationTaskBatch, type BackendGenerationResult } from "@/services/api/generation-task";
import { resolveAssetIngest } from "@/services/asset-archive";
import { requestImageQuestion, type AiTextContentPart } from "@/services/api/image";
import { listAddedSkills, type Skill } from "@/services/api/skills";
import { subscribeGenerationTasks, type GenerationTask } from "@/services/api/task-center";
import { createTextReplayPublisher } from "@/lib/creation-text-replay";
import { isLocalDreaminaWaitStopped, localDreaminaCancellationMessage } from "@/services/local-dreamina-task-projection";
import { getMediaBlob, uploadMediaFile } from "@/services/file-storage";
import { creationReferenceFromDrop } from "./creation-reference-drop";
import { resolveImageUrl, uploadImage } from "@/services/image-storage";
import { consumeGenerationTaskMessage, generationTaskMaterializedUrls, materializeGenerationTaskAssets, projectGenerationTaskResult } from "@/services/project-asset-sync";
import { applyGenerationConsumerEffect } from "@/services/generation-consumer-dedupe";
import { beginGenerationConsumer, runGenerationConsumer } from "@/services/generation-consumer-lifecycle";
import { loadCreationConversations, pendingCreationTaskIds, pendingCreationTaskKey, removeCreationConversationSnapshot, saveCreationConversations, updateCreationConversationSnapshot } from "@/services/creation-conversation-store";
import { recoverCreationTextTask } from "@/services/creation-text-task-recovery";
import { modelDisplayName, modelOptionName, resolveModelChannel, selectableModelsByCapability, useConfigStore, useEffectiveConfig } from "@/stores/use-config-store";
import { useAssetStore, type Asset } from "@/stores/use-asset-store";
import { useUserStore } from "@/stores/use-user-store";
import type { PromptOptimizerProvider } from "@/lib/plugins/plugin-types";
import { promptOptimizerPlugin, PROMPT_OPTIMIZER_PLUGIN_ID } from "@/lib/plugins/builtin/prompt-optimizer";
import { createPluginHostContext } from "@/services/plugin-host";
import { usePluginStore } from "@/stores/use-plugin-store";
import {
    buildCreationMentionReferences,
    displayCreationPrompt,
    expandCreationPrompt,
    reconcileCreationAttachmentLimit,
    removeCreationReferenceTokens,
    replaceCreationAttachmentReference,
    selectedCreationReferences,
    type CreationReference,
} from "./creation-references";
import { createCreationSubmitGate } from "./creation-submit-gate";
import { skillRuntime } from "@/services/skill-runtime";
import {
    parseRoutedDocuments,
    creationAttachmentFromAsset,
    creationAttachmentFromAudio,
    creationAttachmentFromAudioAsset,
    creationAttachmentFromDocument,
    creationAttachmentFromExternalAsset,
    creationAttachmentFromImage,
    creationAttachmentFromVideo,
    creationAttachmentFromVideoAsset,
    creationAttachmentKind,
    creationAudioAsset,
    creationFileAccepted,
    creationImageAsset,
    creationMediaAspectRatio,
    creationUploadAccept,
    creationVideoAsset,
    removeCreationAttachment,
    splitCreationAttachments,
    type CreationAttachment,
} from "./creation-assets";

type CreationMode = "text" | "image" | "video";
type CreationViewMode = "chat" | "storyboard";
type CreationStatus = "streaming" | "pending" | "done" | "error" | "cancelled";
type CreationSettings = { ratio: string; seconds: string; quality: string; videoQuality: string; count: string };
type CreationRetryContext = GenerationRetryContext & { retryContextsByBatchIndex?: GenerationRetryContext[] };
export type CreationMessage = {
    id: string;
    role: "user" | "assistant";
    mode?: CreationMode;
    content: string;
    reasoning?: string;
    createdAt: string;
    status?: CreationStatus;
    model?: string;
    resultUrls?: string[];
    resultStorageKeys?: string[];
    error?: string;
    generationErrorCode?: string;
    taskBilling?: { status: string; amountMicrocredits: number };
    generationOperation?: string;
    attachments?: CreationAttachment[];
    references?: CreationReference[];
    settings?: CreationSettings;
    taskIds?: string[];
    clientOperationId?: string;
    retryOf?: string;
    attemptGroupId?: string;
    generationStage?: string;
    generationPhase?: GenerationPhase;
    generationProgress?: number;
    generationEffectKeys?: string[];
};
export type CreationConversation = { id: string; title: string; updatedAt: string; canvasId?: string; messages: CreationMessage[] };

const ratioOptions: Array<{ value: string; labelKey: MessageKey }> = [
    { value: "1:1", labelKey: "miscPages.ratioSquare" },
    { value: "16:9", labelKey: "miscPages.ratioLandscape" },
    { value: "9:16", labelKey: "miscPages.ratioPortrait" },
    { value: "4:3", labelKey: "miscPages.ratioStandardLandscape" },
    { value: "3:4", labelKey: "miscPages.ratioStandardPortrait" },
    { value: "21:9", labelKey: "miscPages.ratioWidescreen" },
];
const qualityOptions: Array<{ value: string; label?: string; labelKey?: MessageKey; description?: string; descriptionKey?: MessageKey }> = [
    { value: "auto", labelKey: "creationSettings.auto", descriptionKey: "creationSettings.modelDecides" },
    { value: "low", labelKey: "creationSettings.low", descriptionKey: "creationSettings.fast" },
    { value: "medium", labelKey: "creationSettings.medium", descriptionKey: "creationSettings.balanced" },
    { value: "high", labelKey: "creationSettings.high", descriptionKey: "creationSettings.detail" },
    // grok2api / xAI Imagine：quality 映射 resolution
    { value: "1k", label: "1K", descriptionKey: "creationSettings.standard" },
    { value: "2k", label: "2K", descriptionKey: "creationSettings.higher" },
];
const resolutionOptions = VIDEO_RESOLUTION_OPTIONS.map((value) => ({ value: String(value), label: videoResolutionLabel(value) }));
const countOptions = ["1", "2", "3", "4"];
const TEXT_ATTACHMENT_MAX_BYTES = 20 * 1024 * 1024;

const AssetLibraryPickerModal = lazy(() => import("@/components/assets/asset-library-picker-modal").then((module) => ({ default: module.AssetLibraryPickerModal })));

function newConversation(title: string): CreationConversation {
    return { id: createClientId(), title, updatedAt: new Date().toISOString(), messages: [] };
}

function newMessage(role: CreationMessage["role"], content: string, extra: Partial<CreationMessage> = {}): CreationMessage {
    return { id: createClientId(), role, content, createdAt: new Date().toISOString(), ...extra };
}

type CreationShot = { user?: CreationMessage; result?: CreationMessage };

function shotsFromMessages(messages: CreationMessage[]): CreationShot[] {
    const shots: CreationShot[] = [];
    for (const message of messages) {
        if (message.role === "user") {
            shots.push({ user: message });
        } else if (shots.length) {
            shots[shots.length - 1].result = message;
        } else {
            shots.push({ result: message });
        }
    }
    return shots;
}

function completedCreationGenerationTask(input: {
    taskId: string;
    task?: GenerationTask;
    mode: "image" | "video";
    prompt: string;
    result: BackendGenerationResult;
    conversationId: string;
    messageId: string;
    batchIndex?: number;
    batchCount?: number;
}): GenerationTask {
    const now = new Date().toISOString();
    const task = input.task ?? { id: input.taskId, type: input.mode, status: "succeeded" as const, prompt: input.prompt, attempts: 1, createdAt: now, updatedAt: now };
    return projectGenerationTaskResult(
        {
            ...task,
            status: "succeeded",
            prompt: input.prompt,
            clientContext: {
                ...task.clientContext,
                sourceCode: task.clientContext?.sourceCode ?? "create-page",
                conversationId: input.conversationId,
                messageId: input.messageId,
                ...(typeof input.batchIndex === "number" ? { batchIndex: input.batchIndex } : {}),
                ...(typeof input.batchCount === "number" ? { batchCount: input.batchCount } : {}),
            },
        },
        input.result,
    );
}

export default function CreatePage({ productionTools = false }: { productionTools?: boolean } = {}) {
    const { t, number, locale } = useI18n();
    const productionCopy = useProductionText();
    const translationRef = useRef(t);
    translationRef.current = t;
    const localizedAssetCategoryLabels = useMemo(() => Object.fromEntries(Object.entries(creationAssetCategoryLabels).map(([category, key]) => [category, t(key)])), [t]);
    const newConversationTitle = t("creationHistory.new");
    const { message: toast, modal } = App.useApp();
    const navigate = useNavigate();
    const historySessionRef = useRef<CreationHistorySync | null>(null);
    const remoteSnapshots = useRef(new WeakSet<CreationConversation[]>());
    const [historyStatus, setHistoryStatus] = useState<HistorySyncStatus>({ phase: "local" });
    const historyUserId = useUserStore((state) => state.user?.id);
    const historyUserReady = useUserStore((state) => state.hydrated);
    const signedIn = useUserStore((state) => Boolean(state.user?.id));
    const [openingCanvas, setOpeningCanvas] = useState(false);
    const openingCanvasRef = useRef(false);
    const config = useEffectiveConfig();
    const promptOptimizerInstallation = usePluginStore((state) => state.installations.find((item) => item.manifest.id === PROMPT_OPTIMIZER_PLUGIN_ID));
    const promptOptimizerEnabled = usePluginStore((state) => state.pluginStates[PROMPT_OPTIMIZER_PLUGIN_ID]?.effectiveEnabled ?? Boolean(state.installations.find((item) => item.manifest.id === PROMPT_OPTIMIZER_PLUGIN_ID)?.enabled));
    const promptOptimizerProvider = useMemo<PromptOptimizerProvider | null>(() => {
        if (!promptOptimizerEnabled || !promptOptimizerInstallation || !promptOptimizerPlugin.createPromptOptimizer) return null;
        return promptOptimizerPlugin.createPromptOptimizer(createPluginHostContext(promptOptimizerPlugin, promptOptimizerInstallation, config));
    }, [config, promptOptimizerEnabled, promptOptimizerInstallation]);
    const updateConfig = useConfigStore((state) => state.updateConfig);
    const [searchParams] = useSearchParams();
    useEffect(() => {
        const tool = searchParams.get("tool") || "";
        if (searchParams.get("mode") === "image" && (tool === "nano-banana" || tool.startsWith("gpt-image"))) navigate(modelStarterCanvasHref("gpt-image"), { replace: true });
    }, [searchParams, navigate]);
    const selectedProductionTool = productionTools ? toolCatalog.find((tool) => tool.key === searchParams.get("workbenchTool")) : undefined;
    const assetsHydrated = useAssetStore((state) => state.hydrated);
    const assets = useAssetStore((state) => state.assets);
    const addAsset = useAssetStore((state) => state.addAsset);
    const [conversations, setConversations] = useState<CreationConversation[]>([]);
    const conversationsRef = useRef<CreationConversation[]>([]);
    const [activeId, setActiveId] = useState("");
    const activeIdRef = useRef("");
    const [hydrated, setHydrated] = useState(false);
    const [mode, setMode] = useState<CreationMode>("video");
    const [prompt, setPrompt] = useState("");
    const [attachments, setAttachments] = useState<CreationAttachment[]>([]);
    const promptRef = useRef(prompt);
    const attachmentsRef = useRef(attachments);
    const [draftReferences, setDraftReferences] = useState<CreationReference[]>([]);
    const [addedSkills, setAddedSkills] = useState<Skill[]>([]);
    const [ratio, setRatio] = useState("16:9");
    const [seconds, setSeconds] = useState("6");
    const [quality, setQuality] = useState("auto");
    const [videoQuality, setVideoQuality] = useState(config.vquality || "720");
    const [count, setCount] = useState(String(Math.max(1, Math.min(4, Number(config.count) || 1))));
    const [busy, setBusy] = useState(false);
    const [referenceReplacementBusy, setReferenceReplacementBusy] = useState(false);
    const [viewMode, setViewMode] = useState<CreationViewMode>("chat");
    const [selectedShotIndex, setSelectedShotIndex] = useState(-1);
    const [composingNextShot, setComposingNextShot] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [libraryOpen, setLibraryOpen] = useState<boolean | null>(null);
    const externalAssetSources = useExternalAssetSources(Boolean(libraryOpen));
    const abortRef = useRef<AbortController | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const replacementVideoInputRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        const listener = (event: Event) => {
            const action = (event as CustomEvent<{ nodeId?: string; kind: string }>).detail;
            if (!action.nodeId && action.kind === "replace") replacementVideoInputRef.current?.click();
        };
        window.addEventListener(VIDEO_REFERENCE_ACTION_EVENT, listener);
        return () => window.removeEventListener(VIDEO_REFERENCE_ACTION_EVENT, listener);
    }, []);
    const composerFocusRef = useRef<HTMLTextAreaElement>(null);
    const threadScrollRef = useRef<HTMLElement>(null);
    const followLatestMessageRef = useRef(true);
    const taskSyncWarningRef = useRef(false);
    const retryPreparingRef = useRef(new Set<string>());
    const submitGateRef = useRef(createCreationSubmitGate());
    const pendingRetryRef = useRef<{ context: CreationRetryContext; lockKey: string } | null>(null);
    const routeHandoffAppliedRef = useRef("");
    const [retrySequence, setRetrySequence] = useState(0);
    promptRef.current = prompt;
    attachmentsRef.current = attachments;

    const activeConversation = useMemo(() => conversations.find((item) => item.id === activeId) || conversations[0], [activeId, conversations]);
    const historyConversations = useMemo(
        () => conversations.filter((conversation) => conversation.id === activeId || conversation.messages.length > 0).sort((left, right) => conversationTimestamp(right.updatedAt) - conversationTimestamp(left.updatedAt)),
        [activeId, conversations],
    );
    const preferredModel = mode === "text" ? config.textModel : mode === "image" ? config.imageModel : config.videoModel;
    const hasPrompt = Boolean(prompt.trim());
    const modelRequirements = useMemo<ModelRequirements>(
        () => ({
            capability: mode,
            input: {
                textCount: hasPrompt ? 1 : 0,
                imageCount: attachments.filter(isImageAttachment).length,
                videoCount: attachments.filter(isVideoAttachment).length,
                audioCount: attachments.filter((attachment) => creationAttachmentKind(attachment) === "audio").length,
                characterCount: 0,
            },
            videoSeconds: mode === "video" ? seconds : undefined,
            imageSize: mode === "image" ? ratio : undefined,
            options:
                mode === "image"
                    ? { size: ratio, quality, count: Number(count), transparentBackground: config.transparentBackground === "true" }
                    : mode === "video"
                      ? { size: ratio, videoSeconds: Number(seconds), vquality: videoQuality, videoGenerateAudio: config.videoGenerateAudio === "true", videoWatermark: config.videoWatermark === "true" }
                      : {},
        }),
        [attachments, config.transparentBackground, config.videoGenerateAudio, config.videoWatermark, count, hasPrompt, mode, quality, ratio, seconds, videoQuality],
    );
    const selectedModel = resolveCompatibleModel(config, preferredModel, modelRequirements);
    const settingsModel = selectedModel || preferredModel;
    const imageProfile = useMemo(() => modelCapabilityConfigFor(config, settingsModel).image!, [config, settingsModel]);
    const videoProfile = useMemo(() => modelCapabilityConfigFor(config, settingsModel).video!, [config, settingsModel]);
    // Reference preparation belongs to backend admission; changing a model
    // must not silently discard a user's attached originals.
    const maxReferences = mode === "image" || mode === "video" ? Number.POSITIVE_INFINITY : 6;
    const referenceImageSize = useMemo(() => {
        const imageAttachments = attachments.filter(isImageAttachment);
        if (imageAttachments.length !== 1) return undefined;
        const { width, height } = imageAttachments[0];
        if (typeof width !== "number" || typeof height !== "number" || width <= 0 || height <= 0) return undefined;
        return { width, height };
    }, [attachments]);
    const mentionReferences = useMemo(() => buildCreationMentionReferences(addedSkills, attachments, draftReferences, t), [addedSkills, attachments, draftReferences, t]);
    const isEmpty = !activeConversation?.messages.length;
    const pendingTaskKey = useMemo(() => pendingCreationTaskKey(conversations), [conversations]);
    const pendingTaskIds = useMemo(() => pendingCreationTaskIds(conversations), [conversations]);
    const shots = useMemo(() => shotsFromMessages(activeConversation?.messages || []), [activeConversation]);
    const visibleShotIndex = shots.length ? (selectedShotIndex >= 0 && selectedShotIndex < shots.length ? selectedShotIndex : shots.length - 1) : -1;

    const previousImageSettings = useRef<{ mode: CreationMode; query: string; model: string }>(undefined);
    useEffect(() => {
        const query = searchParams.toString();
        const preserve = previousImageSettings.current?.mode === mode;
        const handoff = searchParams.get("mode") === mode && (!preserve || previousImageSettings.current?.query !== query);
        const switched = preserve && !handoff && previousImageSettings.current?.model !== settingsModel;
        previousImageSettings.current = { mode, query, model: settingsModel };
        if (mode !== "image") return;
        const normalized = normalizeImageValue(imageProfile, {
            size: (handoff && searchParams.get("size")) || (preserve ? ratio : undefined),
            quality: (handoff && searchParams.get("quality")) || (preserve ? quality : undefined),
            count: (handoff && searchParams.get("count")) || count,
        });
        setRatio(normalized.size);
        setQuality(normalized.quality);
        setCount(normalized.count);
        const field = switched && adjustedOutputField({ size: ratio, quality, count }, normalized);
        if (field) toast.info(t("generationFailure.fieldHint", { field: t(field) }));
    }, [mode, settingsModel, imageProfile, searchParams]);

    const previousVideoSettings = useRef<{ mode: CreationMode; query: string; model: string }>(undefined);
    useEffect(() => {
        const query = searchParams.toString();
        const preserve = previousVideoSettings.current?.mode === mode;
        const handoff = searchParams.get("mode") === mode && (!preserve || previousVideoSettings.current?.query !== query);
        const switched = preserve && !handoff && previousVideoSettings.current?.model !== settingsModel;
        previousVideoSettings.current = { mode, query, model: settingsModel };
        if (mode !== "video") return;
        const normalized = normalizeVideoValue(videoProfile, {
            seconds: (handoff && searchParams.get("seconds")) || (preserve ? seconds : undefined),
            ratio: (handoff && searchParams.get("ratio")) || (preserve ? ratio : undefined),
            resolution: (handoff && searchParams.get("resolution")) || (preserve ? videoQuality : undefined),
        });
        setSeconds(normalized.seconds);
        setRatio(normalized.ratio);
        setVideoQuality(normalized.resolution.replace(/p$/i, ""));
        const field = switched && adjustedOutputField({ size: ratio, seconds, resolution: videoQuality }, { ...normalized, size: normalized.ratio });
        if (field) toast.info(t("generationFailure.fieldHint", { field: t(field) }));
    }, [mode, settingsModel, videoProfile, searchParams]);

    useEffect(() => {
        const reconciled = reconcileCreationAttachmentLimit(attachments, mentionReferences, maxReferences);
        if (reconciled.attachments === attachments) return;
        setAttachments(reconciled.attachments);
        if (reconciled.removedReferences.length) setPrompt((current) => removeCreationReferenceTokens(current, reconciled.removedReferences));
    }, [attachments, maxReferences, mentionReferences]);

    useEffect(() => {
        if (!historyUserReady) return;
        const scope = getActiveUserScope();
        const controller = new AbortController();
        const active = () => !controller.signal.aborted && scope === getActiveUserScope();
        const storage = localForageStorageForScope(scope);
        const restored = new WeakMap<CreationConversation, CreationConversation>();
        setHydrated(false);
        const display = (items: CreationConversation[]) => {
            if (!active()) return;
            const next = items.length
                ? items.map((item) => {
                      const cached = restored.get(item);
                      if (cached) return cached;
                      const conversation = { ...item, messages: item.messages.map(restoreHistoryMedia) };
                      restored.set(item, conversation);
                      return conversation;
                  })
                : [newConversation(translationRef.current("creationHistory.new"))];
            remoteSnapshots.current.add(next);
            conversationsRef.current = next;
            setConversations(next);
            setActiveId((current) => (next.some((item) => item.id === current) ? current : next[0].id));
        };
        const session = new CreationHistorySync({
            read: async () => await storage.getItem(CREATION_HISTORY_SYNC_KEY),
            readLegacy: () => loadCreationConversations<CreationConversation>(scope),
            write: async (value) => {
                await storage.setItem(CREATION_HISTORY_SYNC_KEY, value);
            },
            api: creationHistoryAPI(scope, controller.signal),
            prepare: creationHistoryMedia(scope, controller.signal, active),
            active,
            cloud: Boolean(historyUserId),
            onChange: display,
            onStatus: (status) => {
                if (active()) setHistoryStatus(status);
            },
        });
        historySessionRef.current = session;
        void session
            .load()
            .then((items) => {
                if (active()) {
                    display(items);
                    setHydrated(true);
                    void session.sync();
                }
            })
            .catch(() => {
                if (active()) setHistoryStatus({ phase: "error" });
            });
        const refresh = () => {
            if (active() && document.visibilityState !== "hidden") void session.sync();
        };
        const timer = window.setInterval(refresh, 15000);
        window.addEventListener("focus", refresh);
        window.addEventListener("online", refresh);
        return () => {
            controller.abort();
            session.dispose();
            if (historySessionRef.current === session) historySessionRef.current = null;
            window.clearInterval(timer);
            window.removeEventListener("focus", refresh);
            window.removeEventListener("online", refresh);
        };
    }, [historyUserId, historyUserReady]);

    useEffect(() => () => abortRef.current?.abort(), []);

    useEffect(() => {
        activeIdRef.current = activeId;
    }, [activeId]);

    useEffect(() => {
        conversationsRef.current = conversations;
        if (hydrated && !remoteSnapshots.current.has(conversations)) {
            const session = historySessionRef.current;
            void session
                ?.save(conversations)
                .then(() => session.sync())
                .catch(() => setHistoryStatus({ phase: "error" }));
        }
    }, [conversations, hydrated]);

    useEffect(() => {
        if (!hydrated || !pendingTaskKey || !pendingTaskIds.length) return;
        let cancelled = false;
        const observationController = new AbortController();
        const applyTasks = async (tasks: GenerationTask[]) => {
            const contextual = attachCreationTaskContexts(tasks, conversations);
            const persistedTasks = await materializeCreationTaskResults(contextual, observationController.signal, translationRef.current);
            if (cancelled) return;
            taskSyncWarningRef.current = false;
            const attachable = persistedTasks.filter((task) => task.status === "succeeded" && Boolean(task.clientContext?.messageId) && Boolean(task.creationResultUrls?.length));
            for (const task of attachable) {
                await consumeGenerationTaskMessage(
                    task,
                    task.clientContext!.messageId!,
                    async ({ effectKey, resultUrls }) => {
                        if (cancelled) return;
                        await updateConversationMessage(
                            task.clientContext!.conversationId!,
                            task.clientContext!.messageId!,
                            (item) => applyGenerationConsumerEffect(item, effectKey, (current) => ({ ...current, status: "done" as const, resultUrls: Array.from(new Set([...(current.resultUrls || []), ...resultUrls])) })).value,
                        );
                    },
                    { signal: observationController.signal, materialize: async () => task, materializedUrls: generationTaskMaterializedUrls },
                );
            }
            if (!attachable.length && !cancelled) setConversations((current) => reconcileCreationTaskMessages(current, persistedTasks, translationRef.current));
        };
        const warnSync = (error: unknown) => {
            if (cancelled || observationController.signal.aborted) return;
            console.warn("创作任务状态同步失败", error);
            if (!taskSyncWarningRef.current) {
                taskSyncWarningRef.current = true;
                toast.warning(translationRef.current("creationFeedback.sync"));
            }
        };
        let applyChain = Promise.resolve();
        const unsubscribe = subscribeGenerationTasks(pendingTaskIds, (task) => {
            applyChain = applyChain.then(() => applyTasks([task])).catch(warnSync);
        });
        return () => {
            cancelled = true;
            observationController.abort();
            unsubscribe();
        };
    }, [hydrated, pendingTaskKey, toast]);

    useEffect(() => {
        let cancelled = false;
        listAddedSkills()
            .then(({ skills }) => {
                if (!cancelled) setAddedSkills(skills);
            })
            .catch(() => {
                if (!cancelled) setAddedSkills([]);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!followLatestMessageRef.current) return;
        const frame = window.requestAnimationFrame(() => {
            const container = threadScrollRef.current;
            if (container) container.scrollTop = container.scrollHeight;
        });
        return () => window.cancelAnimationFrame(frame);
    }, [activeConversation?.id, activeConversation?.messages]);

    const updateActive = useCallback(
        (updater: (conversation: CreationConversation) => CreationConversation) => {
            const next = updateCreationConversationSnapshot(conversationsRef.current, activeId, updater);
            conversationsRef.current = next;
            setConversations(next);
        },
        [activeId],
    );

    const updateConversationMessage = useCallback(async (conversationId: string, id: string, updater: (item: CreationMessage) => CreationMessage) => {
        const next = updateCreationConversationSnapshot(conversationsRef.current, conversationId, (conversation) => ({
            ...conversation,
            updatedAt: new Date().toISOString(),
            messages: conversation.messages.map((item) => (item.id === id ? updater(item) : item)),
        }));
        conversationsRef.current = next;
        setConversations(next);
        await historySessionRef.current?.save(next);
        void historySessionRef.current?.sync();
    }, []);

    const selectMode = (next: CreationMode) => {
        setMode(next);
        const nextModels = selectableModelsByCapability(config, next);
        const current = next === "text" ? config.textModel : next === "image" ? config.imageModel : config.videoModel;
        if (!nextModels.includes(current) && nextModels[0]) {
            updateConfig(next === "text" ? "textModel" : next === "image" ? "imageModel" : "videoModel", nextModels[0]);
        }
    };

    useEffect(() => {
        if (!hydrated || !assetsHydrated) return;
        let active = true;
        const signature = searchParams.toString();
        if (!signature || routeHandoffAppliedRef.current === signature) return;
        routeHandoffAppliedRef.current = signature;

        const routeMode = searchParams.get("mode");
        const nextMode: CreationMode = routeMode === "image" || routeMode === "text" ? routeMode : "video";
        setMode(nextMode);
        const promptFromRoute = searchParams.get("prompt")?.trim() || "";
        if (promptFromRoute) {
            promptRef.current = promptFromRoute;
            setPrompt(promptFromRoute);
        }

        const routedAssetIds = (searchParams.get("assetIds") || "")
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean);
        const routedDocuments = nextMode === "text" ? parseRoutedDocuments(searchParams.get("documents")) : [];
        if (routedAssetIds.length || routedDocuments.length) {
            // Keep the order the user attached them in: @图片1/@视频1 labels are numbered by position.
            const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
            const routedAssets = [...new Set(routedAssetIds)].flatMap((id) => assetsById.get(id) ?? []);
            void Promise.all(
                routedAssets.map(async (asset): Promise<CreationAttachment | null> => {
                    if (asset.kind === "image") {
                        const attachment = creationAttachmentFromAsset(asset);
                        const url = await resolveImageUrl(asset.data.storageKey, attachment.previewUrl, { cacheMiss: true }).catch(() => attachment.previewUrl);
                        return { ...attachment, dataUrl: url, url, previewUrl: url };
                    }
                    if (asset.kind === "video" && nextMode !== "image") return creationAttachmentFromVideoAsset(asset);
                    if (asset.kind === "audio" && nextMode !== "image") return creationAttachmentFromAudioAsset(asset);
                    return null;
                }),
            ).then((resolved) => {
                if (!active) return;
                const routedAttachments = [...resolved.filter((attachment): attachment is CreationAttachment => attachment !== null), ...routedDocuments];
                attachmentsRef.current = routedAttachments;
                setAttachments(routedAttachments);
            });
        }

        const tool = searchParams.get("tool")?.trim().toLocaleLowerCase("zh-CN") || "";
        if (nextMode === "video" && tool) {
            const lookup = tool.replace(/\s+/g, "");
            const candidates = selectableModelsByCapability(config, "video");
            const matched = candidates.find((value) => {
                const label = `${modelOptionName(value)} ${modelDisplayName(config, value)}`.toLocaleLowerCase("zh-CN").replace(/\s+/g, "");
                if (lookup.includes("seedance")) return label.includes("seedance") && (label.includes("2.5") || !lookup.includes("2.5"));
                if (lookup.includes("wan")) return label.includes("wan") && (label.includes("3.0") || !lookup.includes("3.0"));
                if (lookup.includes("minimax") || lookup.includes("h3")) return label.includes("minimax") || label.includes("h3");
                return false;
            });
            if (matched) updateConfig("videoModel", matched);
        }
        if (nextMode === "image" && tool) {
            // 首页“Nano Banana”入口：预先选中对应生图模型，而不是沿用上次的默认模型。
            const lookup = tool.replace(/[\s_-]+/g, "");
            const matched = selectableModelsByCapability(config, "image").find((value) => {
                const label = `${modelOptionName(value)} ${modelDisplayName(config, value)}`.toLocaleLowerCase("zh-CN").replace(/[\s_-]+/g, "");
                return lookup.includes("banana") ? label.includes("banana") : label.includes(lookup);
            });
            if (matched) updateConfig("imageModel", matched);
        }
        window.requestAnimationFrame(() => composerFocusRef.current?.focus());
        return () => {
            active = false;
        };
    }, [assets, assetsHydrated, config, hydrated, searchParams, updateConfig]);

    const externalLibraryItems = useMemo<AssetLibraryPickerItem[]>(
        () =>
            externalAssetSources.items.map((item) => ({
                ...item,
                disabledReason: mode === "image" && item.external?.item.kind !== "image" ? t("creationFeedback.imageOnly") : undefined,
            })),
        [externalAssetSources.items, mode, t],
    );
    const libraryItems = useMemo<AssetLibraryPickerItem[]>(
        () => [
            ...assets
                .filter((asset): asset is Extract<Asset, { kind: "image" | "video" | "audio" }> => asset.kind === "image" || asset.kind === "video" || asset.kind === "audio")
                .map((asset) => ({
                    id: asset.id,
                    title: asset.title,
                    category: asset.category || "other",
                    kindLabel: t(asset.kind === "video" ? "creationComposer.video" : asset.kind === "audio" ? "creationComposer.audio" : "creationComposer.image"),
                    asset,
                    searchText: (asset.tags || []).join(" "),
                    disabledReason: mode === "image" && asset.kind !== "image" ? t("creationFeedback.imageOnly") : undefined,
                })),
            ...externalLibraryItems,
        ],
        [assets, externalLibraryItems, mode, t],
    );
    const uploadCreationAsset = async (file: File) => {
        if (file.type.startsWith("video/")) {
            const uploaded = await uploadMediaFile(file, "create-upload");
            return {
                asset: creationVideoAsset({ title: file.name, uploaded, metadata: { source: "create-upload", fileName: file.name } }),
                attachment: creationAttachmentFromVideo(file, uploaded),
            };
        }
        if (file.type.startsWith("audio/")) {
            const uploaded = await uploadMediaFile(file, "create-upload");
            return {
                asset: creationAudioAsset({ title: file.name, uploaded, metadata: { source: "create-upload", fileName: file.name } }),
                attachment: creationAttachmentFromAudio(file, uploaded),
            };
        }
        if (!file.type.startsWith("image/")) {
            const uploaded = await uploadMediaFile(file, "create-upload");
            return { attachment: creationAttachmentFromDocument(file, uploaded) };
        }
        const uploaded = await uploadImage(file);
        return {
            asset: creationImageAsset({ title: file.name, uploaded, metadata: { source: "create-upload", fileName: file.name } }),
            attachment: creationAttachmentFromImage(file, uploaded),
        };
    };
    const addAttachments = (files: FileList | File[]) => {
        if ((mode === "image" || mode === "video") && maxReferences === 0) {
            toast.warning(mode === "image" ? t("creationFeedback.noImageReferences") : t("creationFeedback.noImageVideo"));
            return;
        }
        const next = Array.from(files)
            .filter((file) => creationFileAccepted(mode, file))
            .slice(0, Math.max(0, maxReferences - attachments.length));
        if (!next.length) return;
        void Promise.allSettled(
            next.map(async (file) => {
                const { asset, attachment } = await uploadCreationAsset(file);
                if (asset) addAsset(resolveAssetIngest(asset, { canvasId: activeConversation?.canvasId, sourceCode: "create-upload" }));
                return attachment;
            }),
        ).then((settled) => {
            const items = settled.flatMap((entry) => (entry.status === "fulfilled" ? [entry.value] : []));
            const failed = settled.filter((entry) => entry.status === "rejected");
            if (items.length) setAttachments((current) => [...current, ...items].slice(0, maxReferences));
            if (failed.length)
                toast.error(
                    failed.some((entry) => entry.status === "rejected" && entry.reason instanceof Error && entry.reason.message === t("generationFailure.video.video_upload_limit"))
                        ? t("generationFailure.video.video_upload_limit")
                        : t("creationFeedback.referenceUploads", { count: number(failed.length) }),
                );
        });
    };

    const uploadLibraryAssets = async (files: FileList | File[]) => {
        const next = Array.from(files).filter((file) => creationFileAccepted(mode, file));
        if (!next.length) return [];
        const settled = await Promise.allSettled(
            next.map(async (file) => {
                const { asset } = await uploadCreationAsset(file);
                return asset ? addAsset(resolveAssetIngest(asset, { canvasId: activeConversation?.canvasId, sourceCode: "create-upload" })) : "";
            }),
        );
        const assetIds = settled.flatMap((entry) => (entry.status === "fulfilled" && entry.value ? [entry.value] : []));
        const failed = settled.filter((entry) => entry.status === "rejected");
        if (assetIds.length) toast.success(t("creationFeedback.uploaded", { count: number(assetIds.length) }));
        if (failed.length)
            toast.error(
                failed.some((entry) => entry.status === "rejected" && entry.reason instanceof Error && entry.reason.message === t("generationFailure.video.video_upload_limit"))
                    ? t("generationFailure.video.video_upload_limit")
                    : t("creationFeedback.uploadsFailed", { count: number(failed.length) }),
            );
        return assetIds;
    };

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) addAttachments(event.target.files);
        event.target.value = "";
    };

    const handleLibrarySelect = (selectedIds: string[]) => {
        const next = selectedIds.flatMap((id): CreationAttachment[] => {
            const asset = assets.find((item) => item.id === id);
            if (asset?.kind === "image") return [creationAttachmentFromAsset(asset)];
            if (asset?.kind === "video" && mode !== "image") return [creationAttachmentFromVideoAsset(asset)];
            if (asset?.kind === "audio" && mode !== "image") return [creationAttachmentFromAudioAsset(asset)];
            const external = libraryItems.find((item) => item.id === id)?.external;
            return external ? [creationAttachmentFromExternalAsset(external)] : [];
        });
        if (!next.length) return;
        setAttachments((current) => [...current.filter((item) => !next.some((candidate) => candidate.id === item.id)), ...next].slice(0, maxReferences));
        setLibraryOpen(false);
    };

    const removeAttachment = (id: string) => {
        const reference = mentionReferences.find((item) => item.attachmentId === id);
        setAttachments((current) => removeCreationAttachment(current, id));
        if (reference) setPrompt((current) => removeCreationReferenceTokens(current, [reference]));
    };

    const clearAttachments = () => {
        const attachmentIds = new Set(attachments.map((item) => item.id));
        const references = mentionReferences.filter((item) => item.attachmentId && attachmentIds.has(item.attachmentId));
        setAttachments([]);
        if (references.length) setPrompt((current) => removeCreationReferenceTokens(current, references));
    };

    const reorderAttachments = useCallback((next: CreationAttachment[]) => {
        attachmentsRef.current = next;
        setAttachments(next);
    }, []);

    const replaceAttachmentReference = useCallback(
        (targetAttachmentId: string, replacement: CreationAttachment) => {
            const currentAttachments = attachmentsRef.current;
            const target = currentAttachments.find((attachment) => attachment.id === targetAttachmentId);
            if (!target) throw new Error(t("creationFeedback.missingReference"));
            if (creationAttachmentKind(target) !== "image" || creationAttachmentKind(replacement) !== "image") throw new Error(t("creationFeedback.replaceImagesOnly"));
            if (target.id === replacement.id) return false;

            const result = replaceCreationAttachmentReference(promptRef.current, currentAttachments, targetAttachmentId, replacement);
            promptRef.current = result.prompt;
            attachmentsRef.current = result.attachments;
            setPrompt(result.prompt);
            setAttachments(result.attachments);
            return true;
        },
        [t],
    );

    const replaceReferenceFromTrack = useCallback(
        (targetAttachmentId: string, replacement: CreationAttachment) => {
            try {
                if (replaceAttachmentReference(targetAttachmentId, replacement)) toast.success(t("creationFeedback.replaced"));
            } catch (error) {
                toast.error(error instanceof Error ? error.message : t("creationFeedback.replaceFailed"));
            }
        },
        [replaceAttachmentReference, toast, t],
    );

    const replaceReferenceFromFiles = useCallback(
        async (targetAttachmentId: string, files: File[]) => {
            if (busy || referenceReplacementBusy) return;
            const file = files.find((item) => item.type.startsWith("image/"));
            if (!file) {
                toast.warning(t("creationFeedback.dropImage"));
                return;
            }
            setReferenceReplacementBusy(true);
            try {
                const { asset, attachment } = await uploadCreationAsset(file);
                if (creationAttachmentKind(attachment) !== "image") throw new Error(t("creationFeedback.notImage"));
                if (asset) addAsset(resolveAssetIngest(asset, { canvasId: activeConversation?.canvasId, sourceCode: "create-upload" }));
                if (replaceAttachmentReference(targetAttachmentId, attachment)) toast.success(t("creationFeedback.replaced"));
            } catch (error) {
                toast.error(error instanceof Error ? error.message : t("creationFeedback.uploadReplaceFailed"));
            } finally {
                setReferenceReplacementBusy(false);
            }
        },
        [activeConversation?.canvasId, addAsset, busy, referenceReplacementBusy, replaceAttachmentReference, toast, t],
    );

    const submit = async (retryContext?: CreationRetryContext, retryLockKey?: string) => {
        if (!submitGateRef.current.tryAcquire()) {
            if (retryLockKey) retryPreparingRef.current.delete(retryLockKey);
            return;
        }
        const releaseRetryLock = () => {
            if (retryLockKey) retryPreparingRef.current.delete(retryLockKey);
            submitGateRef.current.release();
        };
        const text = prompt.trim();
        if (selectedProductionTool && mode === selectedProductionTool.kind && !productionToolHasRequiredReference(selectedProductionTool, attachments.map(creationAttachmentKind))) {
            toast.error(productionCopy(30));
            releaseRetryLock();
            return;
        }
        if (!text || busy || !activeConversation) {
            releaseRetryLock();
            return;
        }
        if (!signedIn) {
            const next = new URLSearchParams(searchParams);
            next.set("mode", mode);
            next.set("prompt", text);
            next.set("ratio", ratio);
            next.set("seconds", seconds);
            next.set("quality", quality);
            next.set("resolution", videoQuality);
            next.set("count", count);
            releaseRetryLock();
            navigate(`/login?next=${encodeURIComponent(`${productionTools ? "/workbench" : "/create"}?${next.toString()}`)}`);
            return;
        }
        const draftVideos = splitCreationAttachments(attachments).referenceVideos;
        if (
            mode === "video" &&
            !guardVideoReferences({ ...config, model: preferredModel, videoSeconds: seconds }, draftVideos, {
                onReplace: () => replacementVideoInputRef.current?.click(),
                onModelChange: (model) => updateConfig("videoModel", model),
                requirements: modelRequirements,
            })
        ) {
            releaseRetryLock();
            return;
        }
        if (!selectedModel) {
            toast.warning(t("creationFeedback.configure", { type: t(mode === "image" ? "creationComposer.image" : mode === "video" ? "creationComposer.video" : "modelPickerShell.text") }));
            releaseRetryLock();
            return;
        }
        if (mode === "video" && !videoSelectionAllowed(videoProfile, videoQuality, Number(seconds))) {
            toast.error(t("creationFeedback.duration"));
            releaseRetryLock();
            return;
        }
        const settings = { ratio, seconds, quality, videoQuality, count };
        const references = selectedCreationReferences(text, mentionReferences);
        // 后端对图片和视频使用不同的参考字段；这里先拆分，避免媒体类型在写入任务时被误判。
        const { referenceImages, referenceVideos, referenceAudios } = splitCreationAttachments(attachments);
        const videoOperation = inferVideoOperation({
            textCount: text ? 1 : 0,
            imageCount: referenceImages.length,
            videoCount: referenceVideos.length,
            audioCount: referenceAudios.length,
            characterCount: 0,
        });
        const skillReferences = references.flatMap((reference) => (reference.skill ? [reference.skill] : []));
        let skillExecution: Awaited<ReturnType<typeof skillRuntime.prepare<"creation">>>;
        try {
            skillExecution = await skillRuntime.prepare({
                profile: "creation",
                prompt: expandCreationPrompt(text, references, attachments),
                skills: skillReferences,
                selectedSkillIds: skillReferences.map((skill) => skill.skillId),
            });
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t("creationFeedback.skillFailed"));
            releaseRetryLock();
            return;
        }
        const expandedPrompt = skillExecution.prompt;
        const referenceMetadata = skillExecution.metadata;
        followLatestMessageRef.current = true;
        const userMessage = newMessage("user", text, { mode, model: selectedModel, attachments, references, settings });
        const assistantMessage = newMessage("assistant", "", { mode, model: selectedModel, status: mode === "text" ? "streaming" : "pending", settings, ...retryContext });
        const originConversationId = activeConversation.id;
        const updateOriginAssistant = (updater: (item: CreationMessage) => CreationMessage) => updateConversationMessage(originConversationId, assistantMessage.id, updater);
        const boundTaskIds = new Set<string>();
        const boundTaskIdsByBatchIndex = new Map<number, string>();
        const boundTasks = new Map<string, GenerationTask>();
        const bindTask = (task: GenerationTask) => {
            if (typeof task.clientContext?.batchIndex === "number") boundTaskIdsByBatchIndex.set(task.clientContext.batchIndex, task.id);
            boundTaskIds.add(task.id);
            boundTasks.set(task.id, task);
            updateOriginAssistant((item) => ({
                ...item,
                generationStage: task.stage,
                ...creationProgressPatch(boundTasks.values()),
                generationOperation: task.operation,
                generationErrorCode: task.errorCode,
                taskIds: Array.from(new Set([...(item.taskIds || []), task.id])),
                clientOperationId: task.clientOperationId,
                retryOf: task.retryOf,
                attemptGroupId: task.attemptGroupId,
            }));
            if (abortRef.current === controller) {
                abortRef.current = null;
                setBusy(false);
            }
        };
        updateActive((conversation) => ({
            ...conversation,
            title: conversation.messages.length ? conversation.title : text.slice(0, 24),
            updatedAt: new Date().toISOString(),
            messages: [...conversation.messages, userMessage, assistantMessage],
        }));
        setPrompt("");
        setAttachments([]);
        setDraftReferences([]);
        setSelectedShotIndex(-1);
        setComposingNextShot(false);
        setBusy(true);
        // 进入 busy 后由 busy 状态挡住重复提交，闸门可以放开，避免后续同步异常把闸门永久锁住。
        submitGateRef.current.release();
        const controller = new AbortController();
        const requestLifecycle = beginGenerationConsumer(controller.signal);
        abortRef.current = controller;
        const normalizedImage = mode === "image" ? normalizeImageValue(imageProfile, { size: ratio, quality, count, imageResolution: config.imageResolution, transparentBackground: config.transparentBackground }) : undefined;
        const normalizedVideo = mode === "video" ? normalizeVideoValue(videoProfile, { seconds, ratio, resolution: videoQuality }) : undefined;
        const requestConfig = {
            ...config,
            model: selectedModel,
            imageModel: selectedModel,
            videoModel: selectedModel,
            textModel: selectedModel,
            ...(mode === "image"
                ? { ...normalizedImage, imageResolution: normalizedImage?.imageResolution }
                : mode === "video"
                  ? { size: normalizedVideo?.ratio ?? ratio, videoSeconds: normalizedVideo?.seconds || seconds, vquality: (normalizedVideo?.resolution ?? videoQuality).replace(/p$/i, "") }
                  : {}),
        };
        try {
            if (mode === "text") {
                if (backendModelRuntimeRequired(requestConfig)) {
                    const result = await runGenerationOperationOnce(retryContext?.clientOperationId, () =>
                        runBackendGenerationTask({
                            mode: "text",
                            canvasId: activeConversation.canvasId,
                            sourceCode: "create-page",
                            prompt: expandedPrompt,
                            config: requestConfig,
                            referenceImages,
                            referenceVideos,
                            referenceAudios,
                            textHistory: (activeConversation.messages || []).filter((item) => item.content.trim()).map((item) => ({ role: item.role, content: item.content })),
                            signal: requestLifecycle.signal,
                            metadata: {
                                source: "create-page",
                                roleReferences: references.filter((reference) => reference.category === "character" && reference.assetId).map((reference) => reference.assetId),
                                conversationId: activeConversation.id,
                                messageId: assistantMessage.id,
                                ...referenceMetadata,
                            },
                            onTaskUpdate: bindTask,
                            onTextDelta: (text) => updateOriginAssistant((item) => ({ ...item, content: text })),
                            ...retryContext,
                        }),
                    );
                    if (!result.text?.trim()) throw new Error(t("miscPages.backendNoText"));
                    updateOriginAssistant((item) => ({ ...item, content: result.text || "" }));
                } else {
                    const history = await Promise.all(
                        [...(activeConversation.messages || []), userMessage].map(async (item) => ({
                            role: item.role,
                            content: item.role === "user" ? await buildTextMessageContent(item, t) : item.content,
                        })),
                    );
                    const replayPublisher = createTextReplayPublisher(requestConfig, text);
                    void replayPublisher.start();
                    let finalText = "";
                    try {
                        await requestImageQuestion(
                            requestConfig,
                            history,
                            (full) => {
                                finalText = full;
                                updateOriginAssistant((item) => ({ ...item, content: full }));
                                replayPublisher.publish(full);
                            },
                            {
                                signal: requestLifecycle.signal,
                                onReasoning: (reasoning) => updateOriginAssistant((item) => ({ ...item, reasoning })),
                            },
                        );
                        await replayPublisher.finish(finalText);
                    } catch (error) {
                        await replayPublisher.fail(requestLifecycle.signal.aborted);
                        throw error;
                    }
                }
            } else if (mode === "image") {
                const taskCount = Math.max(1, Math.min(imageProfile.maxOutputs, Math.floor(Number(count) || 1)));
                const settled = await runGenerationOperationOnce(retryContext?.clientOperationId, () =>
                    runBackendGenerationTaskBatch({
                        mode: "image",
                        canvasId: activeConversation.canvasId,
                        sourceCode: "create-page",
                        prompt: expandedPrompt,
                        config: { ...requestConfig, count: "1" },
                        referenceImages,
                        signal: requestLifecycle.signal,
                        metadata: {
                            source: "create-page",
                            roleReferences: references.filter((reference) => reference.category === "character" && reference.assetId).map((reference) => reference.assetId),
                            conversationId: activeConversation.id,
                            messageId: assistantMessage.id,
                            ...referenceMetadata,
                        },
                        onTaskUpdate: bindTask,
                        count: taskCount,
                        ...retryContext,
                    }),
                );
                if (requestLifecycle.signal.aborted) throw new DOMException("Aborted", "AbortError");
                const boundTaskIdList = Array.from(boundTaskIds);
                const generatedImages = settled.flatMap((entry, batchIndex) => {
                    if (entry.status !== "fulfilled") return [];
                    return (entry.value.images || []).map((image, resultIndex) => ({
                        image,
                        taskId: boundTaskIdsByBatchIndex.get(batchIndex) || boundTaskIdList[batchIndex],
                        batchIndex,
                        resultIndex,
                    }));
                });
                const taskFailures = settled.filter((entry): entry is PromiseRejectedResult => entry.status === "rejected");
                const storedImages = await Promise.allSettled(
                    generatedImages.map(async ({ image, taskId, batchIndex }) => {
                        if (!taskId) throw new Error(t("miscPages.taskMissingId"));
                        const task = completedCreationGenerationTask({
                            taskId,
                            task: boundTasks.get(taskId),
                            mode: "image",
                            prompt: expandedPrompt,
                            result: { mode: "image", images: [image] },
                            conversationId: activeConversation.id,
                            messageId: assistantMessage.id,
                            batchIndex,
                            batchCount: taskCount,
                        });
                        const materialized = await consumeGenerationTaskMessage(
                            task,
                            assistantMessage.id,
                            async ({ resultUrls, effectKey }) => {
                                await updateOriginAssistant(
                                    (item) =>
                                        applyGenerationConsumerEffect(item, effectKey, (current) => ({
                                            ...current,
                                            status: "done" as const,
                                            content: t("miscPages.imageGenerated"),
                                            resultUrls: Array.from(new Set([...(current.resultUrls || []), ...resultUrls])),
                                        })).value,
                                );
                            },
                            { signal: requestLifecycle.signal },
                        );
                        const url = generationTaskMaterializedUrls(materialized)[0];
                        if (!url) throw new Error(t("miscPages.imageResourceUnavailable"));
                        return url;
                    }),
                );
                const resultUrls = storedImages.flatMap((entry) => (entry.status === "fulfilled" ? [entry.value] : []));
                const resourceFailures = storedImages.filter((entry) => entry.status === "rejected");
                const failedCount = taskFailures.length + resourceFailures.length;
                if (!resultUrls.length) {
                    const reason = taskFailures[0]?.reason || resourceFailures[0]?.reason;
                    throw reason instanceof Error ? reason : new Error(t("miscPages.backendNoImage"));
                }
                if (failedCount) toast.warning(t("creationFeedback.partial", { success: number(resultUrls.length), failed: number(failedCount) }));
                updateOriginAssistant((item) => ({ ...item, content: failedCount ? t("creationFeedback.partial", { success: number(resultUrls.length), failed: number(failedCount) }) : t("miscPages.imageGenerated") }));
            } else {
                const result = await runGenerationOperationOnce(retryContext?.clientOperationId, () =>
                    runBackendGenerationTask({
                        mode: "video",
                        canvasId: activeConversation.canvasId,
                        sourceCode: "create-page",
                        prompt: expandedPrompt,
                        config: requestConfig,
                        referenceImages,
                        referenceVideos,
                        referenceAudios,
                        signal: requestLifecycle.signal,
                        metadata: {
                            source: "create-page",
                            roleReferences: references.filter((reference) => reference.category === "character" && reference.assetId).map((reference) => reference.assetId),
                            conversationId: activeConversation.id,
                            messageId: assistantMessage.id,
                            videoEditOperation: videoOperation,
                            ...referenceMetadata,
                        },
                        onTaskUpdate: bindTask,
                        ...retryContext,
                    }),
                );
                if (!result.video?.dataUrl) throw new Error(t("miscPages.backendNoVideo"));
                const taskId = Array.from(boundTaskIds)[0];
                if (!taskId) throw new Error(t("miscPages.taskMissingId"));
                const task = completedCreationGenerationTask({ taskId, task: boundTasks.get(taskId), mode: "video", prompt: expandedPrompt, result, conversationId: activeConversation.id, messageId: assistantMessage.id });
                const materialized = await consumeGenerationTaskMessage(
                    task,
                    assistantMessage.id,
                    async ({ resultUrls, effectKey }) => {
                        await updateOriginAssistant((item) => applyGenerationConsumerEffect(item, effectKey, (current) => ({ ...current, status: "done" as const, content: t("miscPages.videoGenerated"), resultUrls })).value);
                    },
                    { signal: requestLifecycle.signal },
                );
                if (!generationTaskMaterializedUrls(materialized)[0]) throw new Error(t("miscPages.videoResourceUnavailable"));
            }
            updateOriginAssistant((item) => ({ ...item, status: "done" }));
        } catch (error) {
            if (isGenerationTaskCancelled(error, requestLifecycle.signal)) {
                updateOriginAssistant((item) => ({ ...item, status: "cancelled", content: t("creationResult.stopped") }));
                return;
            }
            const message = generationErrorMessage(error);
            updateOriginAssistant((item) => ({
                ...item,
                status: "error",
                error: message,
                generationErrorCode: item.generationErrorCode || generationErrorCode(error) || classifyGenerationError(error),
                taskBilling: error instanceof GenerationTaskFailure ? error.billing : item.taskBilling,
                generationOperation: item.generationOperation || (mode === "video" ? videoOperation : mode),
                createdAt: assistantMessage.createdAt,
                content: t("creationResult.failed"),
            }));
        } finally {
            requestLifecycle.release();
            releaseRetryLock();
            if (abortRef.current === controller) {
                abortRef.current = null;
                setBusy(false);
            }
        }
    };

    useEffect(() => {
        if (!retrySequence) return;
        const pending = pendingRetryRef.current;
        if (!pending) return;
        pendingRetryRef.current = null;
        void submit(pending.context, pending.lockKey);
    }, [retrySequence]);

    const startNewConversation = () => {
        const next = newConversation(newConversationTitle);
        followLatestMessageRef.current = true;
        setConversations((current) => [next, ...current]);
        setActiveId(next.id);
        setPrompt("");
        setAttachments([]);
        setDraftReferences([]);
        setSelectedShotIndex(-1);
        setComposingNextShot(false);
        setHistoryOpen(false);
    };

    const continueOnCanvas = async (selectedAssetIds?: string[]) => {
        if (!activeConversation || openingCanvasRef.current) return;
        openingCanvasRef.current = true;
        setOpeningCanvas(true);
        const scope = getActiveUserScope();
        const source = activeConversation;
        try {
            const assets = useAssetStore.getState().assets;
            const generatedAssetIds =
                selectedAssetIds ||
                source.messages.flatMap((item) => {
                    if (!item.resultUrls?.length) return [];
                    const ids = creationResultAssetIds(assets, { messageId: item.id, taskIds: item.taskIds || [], resultUrls: item.resultUrls });
                    if (ids.length !== item.resultUrls.length) throw new Error(t("miscPages.assetsNotSaved"));
                    return ids;
                });
            const referenceKeys = new Set(source.messages.flatMap((item) => (item.attachments || []).map((attachment) => attachment.storageKey).filter(Boolean)));
            const referenceAssetIds = assets.filter((asset) => (asset.kind === "image" || asset.kind === "video") && asset.data.storageKey && referenceKeys.has(asset.data.storageKey)).map((asset) => asset.id);
            const assetIds = [...generatedAssetIds, ...referenceAssetIds];
            const result = await continueCreationConversationOnCanvas(source);
            if (scope !== getActiveUserScope()) return;
            const next = updateCreationConversationSnapshot(conversationsRef.current, source.id, (item) => ({ ...item, canvasId: result.id }));
            conversationsRef.current = next;
            setConversations(next);
            await historySessionRef.current?.save(next);
            void historySessionRef.current?.sync();
            if (scope !== getActiveUserScope()) return;
            if (result.syncError) toast.warning(t("miscPages.localOnlySync"));
            const params = new URLSearchParams({ conversation: result.sessionId });
            if (assetIds.length) {
                params.set("mode", "handoff");
                [...new Set(assetIds)].forEach((id) => params.append("asset", id));
            }
            navigate(`/canvas/${result.id}?${params.toString()}`);
        } catch (cause) {
            if (scope === getActiveUserScope()) toast.error(cause instanceof Error ? cause.message : t("miscPages.canvasHandoffFailed"));
        } finally {
            openingCanvasRef.current = false;
            setOpeningCanvas(false);
        }
    };

    const selectConversation = (conversation: CreationConversation) => {
        followLatestMessageRef.current = true;
        setActiveId(conversation.id);
        setPrompt("");
        setAttachments([]);
        setDraftReferences([]);
        setSelectedShotIndex(-1);
        setComposingNextShot(false);
        setHistoryOpen(false);
    };

    const renameConversation = (conversation: CreationConversation, trigger: HTMLButtonElement) => {
        let title = conversation.title;
        const owner = getActiveUserScope();
        modal.confirm({
            title: t("miscPages.renameConversationTitle"),
            // AntD 6.5.1 falls back to the OK button for focusable.autoFocusButton: null.
            autoFocusButton: null,
            focusable: { focusTriggerAfterClose: false },
            afterClose: () => trigger.focus({ preventScroll: true }),
            content: (
                <Input
                    autoFocus
                    defaultValue={title}
                    maxLength={100}
                    onChange={(event) => {
                        title = event.target.value;
                    }}
                />
            ),
            onOk: async () => {
                if (owner !== getActiveUserScope()) throw new Error(t("miscPages.accountSwitched"));
                if (!title.trim()) throw new Error(t("miscPages.conversationNameRequired"));
                const next = updateCreationConversationSnapshot(conversationsRef.current, conversation.id, (item) => ({ ...item, title: title.trim(), updatedAt: new Date().toISOString() }));
                conversationsRef.current = next;
                setConversations(next);
                try {
                    await historySessionRef.current?.save(next);
                    void historySessionRef.current?.sync();
                } catch (error) {
                    toast.error(t("miscPages.conversationNameSaveFailed"));
                    throw error;
                }
            },
        });
    };

    const exportConversation = (conversation: CreationConversation) => {
        saveAs(new Blob([creationConversationMarkdown(conversation)], { type: "text/markdown;charset=utf-8" }), creationExportFilename(conversation.title));
    };

    const confirmDeleteConversation = (conversation: CreationConversation, trigger: HTMLButtonElement) => {
        const owner = getActiveUserScope();
        const title = conversation.title.trim() || t("creationHistory.new");
        const label = title.length > 32 ? `${title.slice(0, 32)}...` : title;
        modal.confirm({
            className: "workspace-modal workspace-modal-compact",
            focusable: { focusTriggerAfterClose: false },
            afterClose: () => trigger.focus({ preventScroll: true }),
            title: t("creationFeedback.deleteTitle"),
            content: t("creationFeedback.deleteConfirm", { name: label }),
            okText: t("creationHistory.delete"),
            okButtonProps: { danger: true },
            cancelText: t("creationFeedback.keep"),
            onOk: async () => {
                try {
                    if (owner !== getActiveUserScope()) throw new Error(t("miscPages.accountSwitched"));
                    const remaining = removeCreationConversationSnapshot(conversationsRef.current, conversation.id);
                    const sortedRemaining = [...remaining].sort((left, right) => conversationTimestamp(right.updatedAt) - conversationTimestamp(left.updatedAt));
                    const fallback = sortedRemaining.find((item) => item.messages.length > 0) || sortedRemaining[0] || newConversation(translationRef.current("creationHistory.new"));
                    const next = remaining.length ? remaining : [fallback];
                    await historySessionRef.current?.remove(conversation.id, next);
                    void historySessionRef.current?.sync();
                    conversationsRef.current = next;
                    setConversations(next);
                    if (activeIdRef.current === conversation.id) {
                        followLatestMessageRef.current = true;
                        activeIdRef.current = fallback.id;
                        setActiveId(fallback.id);
                        setPrompt("");
                        setAttachments([]);
                        setDraftReferences([]);
                        setSelectedShotIndex(-1);
                        setComposingNextShot(false);
                    }
                    toast.success(t("creationFeedback.deleted"));
                } catch (error) {
                    toast.error(error instanceof Error ? error.message : t("creationFeedback.deleteFailed"));
                    throw error;
                }
            },
        });
    };

    const restoreMessageDraft = (item: CreationMessage) => {
        const nextMode = item.mode || "text";
        const nextSettings = item.settings;
        setMode(nextMode);
        setPrompt(item.content);
        setAttachments(item.attachments ? [...item.attachments] : []);
        setDraftReferences(item.references ? [...item.references] : []);
        if (item.model) updateConfig(nextMode === "text" ? "textModel" : nextMode === "image" ? "imageModel" : "videoModel", item.model);
        if (!nextSettings) return;
        setRatio(nextSettings.ratio);
        setSeconds(nextSettings.seconds);
        setQuality(nextSettings.quality);
        setVideoQuality(nextSettings.videoQuality);
        setCount(nextSettings.count);
    };

    const retryFailedMessage = async (item: CreationMessage, index: number) => {
        const previous = item.role === "assistant" ? activeConversation?.messages[index - 1] : item;
        if (!previous?.content || busy) return;
        const retryOf = item.taskIds?.[0];
        const restoreForRetry = () => {
            followLatestMessageRef.current = true;
            restoreMessageDraft(previous);
            setSelectedShotIndex(-1);
            setComposingNextShot(false);
            const removedIds = new Set([item.id, previous.id]);
            void historySessionRef.current?.removeMessages(activeConversation.id, [...removedIds]).then(() => historySessionRef.current?.sync());
            updateActive((conversation) => {
                const messages = conversation.messages.filter((message) => !removedIds.has(message.id));
                const firstPrompt = messages.find((message) => message.role === "user")?.content.trim();
                return { ...conversation, title: firstPrompt ? firstPrompt.slice(0, 24) : newConversationTitle, updatedAt: new Date().toISOString(), messages };
            });
        };
        const action = GENERATION_ERROR_ACTIONS[classifyGenerationError({ code: item.generationErrorCode, message: item.error })];
        if (!retryOf || action !== "retry") {
            restoreForRetry();
            window.requestAnimationFrame(() => {
                const control = document.querySelector<HTMLElement>(
                    action === "model" ? ".creation-chat-composer .canvas-composer-model-picker" : action === "reference" ? ".creation-chat-composer input[type=file]" : ".creation-chat-composer textarea, .creation-chat-composer [contenteditable=true]",
                );
                control?.focus();
                if (action === "model" || action === "reference") control?.click();
            });
            return;
        }
        if (retryPreparingRef.current.has(retryOf)) return;
        retryPreparingRef.current.add(retryOf);
        try {
            const attemptGroupId = item.attemptGroupId || item.retryOf || retryOf;
            const context: CreationRetryContext = {
                ...(await createGenerationRetryContext(retryOf, attemptGroupId)),
                ...(item.taskIds && item.taskIds.length > 1 ? { retryContextsByBatchIndex: await createGenerationBatchRetryContexts(item.taskIds, attemptGroupId) } : {}),
            };
            restoreForRetry();
            pendingRetryRef.current = { context, lockKey: retryOf };
            setRetrySequence((current) => current + 1);
        } catch (error) {
            retryPreparingRef.current.delete(retryOf);
            toast.error(localizedGenerationError(error, t));
        }
    };

    const createVariant = (item: CreationMessage, index: number) => {
        const previous = item.role === "assistant" ? activeConversation?.messages[index - 1] : item;
        if (!previous?.content || busy) return;
        restoreMessageDraft(previous);
    };

    if (!hydrated || !activeConversation)
        return (
            <div className="grid h-full place-items-center">
                <Spin />
            </div>
        );

    const handleThreadScroll = () => {
        const container = threadScrollRef.current;
        if (!container) return;
        followLatestMessageRef.current = container.scrollHeight - container.scrollTop - container.clientHeight <= 160;
    };

    const nextShotNumber = shots.length + 1;

    const beginComposeNextShot = () => {
        setComposingNextShot(true);
        setSelectedShotIndex(-1);
        window.requestAnimationFrame(() => composerFocusRef.current?.focus());
    };

    const cancelComposeNextShot = () => setComposingNextShot(false);

    const composerProps = {
        mode,
        prompt,
        setPrompt,
        busy,
        referenceReplacementBusy,
        attachments,
        referenceImageSize,
        maxReferences,
        references: mentionReferences,
        onRemoveAttachment: removeAttachment,
        onClearAttachments: clearAttachments,
        onReorderAttachments: reorderAttachments,
        onReplaceAttachment: replaceReferenceFromTrack,
        onReplaceReferenceFiles: replaceReferenceFromFiles,
        onReferenceDrop: (transfer: DataTransfer) => {
            if (busy || referenceReplacementBusy) return;
            if (transfer.files.length) {
                addAttachments(transfer.files);
                return;
            }
            const next = creationReferenceFromDrop(transfer.getData("application/x-creation-image"), activeConversation?.messages || [], assets);
            if (next) setAttachments((current) => (current.some((item) => (item.storageKey && item.storageKey === next.storageKey) || item.id === next.id) ? current : [...current, next].slice(0, maxReferences)));
        },
        onOpenLibrary: () => setLibraryOpen(true),
        fileInputRef,
        onFileChange: handleFileChange,
        onModeChange: selectMode,
        model: selectedModel,
        modelRequirements,
        imageProfile,
        videoProfile,
        config,
        onModelChange: (value: string) => updateConfig(mode === "text" ? "textModel" : mode === "image" ? "imageModel" : "videoModel", value),
        ratio,
        setRatio,
        seconds,
        setSeconds,
        quality,
        setQuality,
        videoQuality,
        setVideoQuality,
        count,
        setCount,
        promptOptimizerProvider,
        composerFocusRef,
        placeholderOverride: viewMode === "storyboard" && composingNextShot ? t("creationEmpty.shotPlaceholder", { id: String(nextShotNumber).padStart(2, "0") }) : undefined,
        onSubmit: () => void submit(),
    };

    const visibleShot = shots[visibleShotIndex];
    const visibleShotResultIndex = visibleShot?.result ? activeConversation.messages.indexOf(visibleShot.result) : -1;

    return (
        <>
            <input
                ref={replacementVideoInputRef}
                type="file"
                hidden
                accept="video/*"
                onChange={async (event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (!file) return;
                    try {
                        const { asset, attachment } = await uploadCreationAsset(file);
                        if (asset) addAsset(asset);
                        setAttachments((current) => [...current.filter((item) => !isVideoAttachment(item)), attachment]);
                    } catch (error) {
                        toast.error(error instanceof Error ? error.message : t("creationFeedback.uploadReplaceFailed"));
                    }
                }}
            />
            <div className="creation-home relative flex h-full min-h-0 flex-col overflow-hidden">
                <div className="flex items-center gap-2 px-4 text-caption text-muted-foreground" role="status">
                    {b2Text("sync." + historyStatus.phase)}
                    {historyStatus.phase === "error" ? <button onClick={() => void historySessionRef.current?.sync()}>{b2Text("sync.retry")}</button> : null}
                    <CreationHistoryConflicts session={historySessionRef.current} status={historyStatus} busy={busy} />
                </div>
                {productionTools && (
                    <ProductionToolsToolbar
                        selected={selectedProductionTool}
                        onSelect={(tool, preset) => {
                            const nextPrompt = productionToolPrompt(tool, locale, preset);
                            setMode(tool.kind);
                            setPrompt(nextPrompt);
                            promptRef.current = nextPrompt;
                            const params = new URLSearchParams({ mode: tool.kind, workbenchTool: tool.key, preset: String(preset), prompt: nextPrompt });
                            navigate(`/workbench?${params}`, { replace: true });
                        }}
                    />
                )}
                {isEmpty ? (
                    <>
                        <div className="creation-top-actions">
                            <Tooltip title={t("creationHistory.history")}>
                                <button type="button" aria-label={t("creationHistory.open")} aria-expanded={historyOpen} className="creation-top-action" onClick={() => setHistoryOpen(true)}>
                                    <History />
                                </button>
                            </Tooltip>
                        </div>
                        <main ref={threadScrollRef} onScroll={handleThreadScroll} className="creation-empty-workspace creation-scrollbar">
                            <CreationEmptyBanner />
                            <div className="creation-chat-intro">
                                <span className="creation-intro-signal" aria-hidden="true" />
                                <p>{t("creationEmpty.signal")}</p>
                                <h1>
                                    {t("creationEmpty.lead")}
                                    <span className="creation-intro-emphasis">
                                        <span className="is-pink">{t("creationEmpty.brand")}</span>
                                        <span className="is-blue">{t("creationEmpty.finish")}</span>
                                    </span>
                                </h1>
                            </div>
                            <div className="creation-empty-composer">
                                <CreationComposer {...composerProps} variant="empty" />
                            </div>
                            <CreationEmptySuggest
                                onStartPrompt={(nextMode, prompt) => {
                                    selectMode(nextMode);
                                    setPrompt(prompt);
                                    window.requestAnimationFrame(() => composerFocusRef.current?.focus());
                                }}
                                onOpenLibrary={() => {
                                    selectMode("image");
                                    setLibraryOpen(true);
                                }}
                            />
                        </main>
                    </>
                ) : viewMode === "chat" ? (
                    <div className="creation-thread-workbench">
                        <CreationWorkspaceToolbar
                            viewMode={viewMode}
                            onViewModeChange={setViewMode}
                            onNewConversation={startNewConversation}
                            onOpenHistory={() => setHistoryOpen(true)}
                            continueCanvas={
                                <Button size="small" loading={openingCanvas} disabled={busy} onClick={() => void continueOnCanvas()}>
                                    {t("miscPages.continueOnCanvas")}
                                </Button>
                            }
                        />
                        <main ref={threadScrollRef} onScroll={handleThreadScroll} className="creation-thread-scroll creation-scrollbar">
                            <section className="creation-thread-stage">
                                <div className="creation-results">
                                    {activeConversation.messages.map((item, index) => (
                                        <CreationMessageView
                                            key={item.id}
                                            item={item}
                                            modelName={item.model ? modelDisplayName(config, item.model) : ""}
                                            onRetryFailure={() => retryFailedMessage(item, index)}
                                            onCreateVariant={() => createVariant(item, index)}
                                        />
                                    ))}
                                </div>
                            </section>
                        </main>
                        <section className="creation-thread-composer">
                            <CreationComposer {...composerProps} variant="thread" />
                        </section>
                    </div>
                ) : (
                    <div className="storyboard-workbench">
                        <StoryboardToolbar
                            continueCanvas={
                                <Button size="small" loading={openingCanvas} disabled={busy} onClick={() => void continueOnCanvas()}>
                                    {t("miscPages.continueOnCanvas")}
                                </Button>
                            }
                            shots={shots}
                            activeIndex={visibleShotIndex}
                            composing={composingNextShot}
                            onSelect={(index) => {
                                setSelectedShotIndex(index);
                                setComposingNextShot(false);
                            }}
                            onBeginCompose={beginComposeNextShot}
                            onCancelCompose={cancelComposeNextShot}
                            onNewConversation={startNewConversation}
                            onOpenHistory={() => setHistoryOpen(true)}
                            viewMode={viewMode}
                            onViewModeChange={setViewMode}
                        />
                        <main ref={threadScrollRef} onScroll={handleThreadScroll} className="storyboard-workbench-stage creation-scrollbar">
                            <div className="storyboard-workbench-stage-inner">
                                {composingNextShot ? (
                                    <StoryboardNextShotCard shotNumber={nextShotNumber} onCancel={cancelComposeNextShot} />
                                ) : visibleShot ? (
                                    <StoryboardShotCard
                                        shot={visibleShot}
                                        shotNumber={visibleShotIndex + 1}
                                        modelName={visibleShot.result?.model ? modelDisplayName(config, visibleShot.result.model) : ""}
                                        busy={busy}
                                        onRetryFailure={() => {
                                            if (visibleShotResultIndex >= 0 && visibleShot.result) retryFailedMessage(visibleShot.result, visibleShotResultIndex);
                                        }}
                                        onCreateVariant={() => {
                                            if (visibleShotResultIndex >= 0 && visibleShot.result) createVariant(visibleShot.result, visibleShotResultIndex);
                                        }}
                                    />
                                ) : null}
                            </div>
                        </main>
                        <section className="storyboard-workbench-composer">
                            <CreationComposer {...composerProps} variant="thread" />
                        </section>
                    </div>
                )}
            </div>
            <CreationHistoryDrawer
                open={historyOpen}
                conversations={historyConversations}
                activeId={activeConversation.id}
                onClose={() => setHistoryOpen(false)}
                onSelect={selectConversation}
                onDelete={confirmDeleteConversation}
                onRename={renameConversation}
                onExport={exportConversation}
            />
            {libraryOpen !== null ? (
                <Suspense fallback={null}>
                    <AssetLibraryPickerModal
                        open={libraryOpen}
                        items={libraryItems}
                        categoryLabels={{ ...localizedAssetCategoryLabels, ...externalAssetSources.categoryLabels }}
                        folders={externalAssetSources.folders}
                        initialSelectedIds={attachments.flatMap((item) => (item.id.startsWith("asset:") ? [item.id.slice(6)] : item.id.startsWith("external:") ? [item.id] : []))}
                        upload={{
                            accept: creationUploadAccept(mode),
                            description: t(mode === "text" ? "creationLibrary.textUpload" : mode === "video" ? "creationLibrary.videoUpload" : "creationLibrary.imageUpload"),
                            onUpload: uploadLibraryAssets,
                            external: { accept: "image/*", description: t("creationLibrary.eagle"), onUpload: (files, folderId) => externalAssetSources.uploadExternalFiles(files, folderId) },
                        }}
                        onClose={() => setLibraryOpen(false)}
                        onConfirm={handleLibrarySelect}
                    />
                </Suspense>
            ) : null}
        </>
    );
}

const creationAssetCategoryLabels: Record<string, MessageKey> = {
    all: "creationLibrary.all",
    character: "resourceMention.character",
    environment: "resourceMention.environment",
    wardrobe: "resourceMention.wardrobe",
    prop: "resourceMention.prop",
    weapon: "resourceMention.weapon",
    style: "resourceMention.style",
    other: "resourceMention.other",
};

type CreationHistoryDrawerProps = {
    open: boolean;
    conversations: CreationConversation[];
    activeId: string;
    onClose: () => void;
    onSelect: (conversation: CreationConversation) => void;
    onDelete: (conversation: CreationConversation, trigger: HTMLButtonElement) => void;
    onRename: (conversation: CreationConversation, trigger: HTMLButtonElement) => void;
    onExport: (conversation: CreationConversation) => void;
};

function CreationHistoryDrawer({ open, onClose, ...list }: CreationHistoryDrawerProps) {
    const { t, number } = useI18n();
    const [settled, setSettled] = useState(false);
    useEffect(() => {
        if (!open) setSettled(false);
    }, [open]);

    return (
        <Drawer
            open={open}
            onClose={onClose}
            destroyOnHidden
            placement="right"
            size="var(--creation-history-drawer-size)"
            closeIcon={<X className="size-4" />}
            className="creation-history-drawer"
            rootClassName="creation-history-drawer-root"
            afterOpenChange={setSettled}
            classNames={{ mask: open && settled ? "workspace-layer-blur-mask creation-history-mask-settled" : "workspace-layer-blur-mask" }}
            styles={{ body: { padding: 0 } }}
            title={
                <div className="creation-history-title">
                    <span>{t("creationHistory.history")}</span>
                    <small>{t("creationHistory.count", { count: number(list.conversations.length) })}</small>
                </div>
            }
        >
            <CreationHistoryList {...list} />
        </Drawer>
    );
}

function CreationHistoryActions({ conversation, onDelete, onRename, onExport }: Pick<CreationHistoryDrawerProps, "onDelete" | "onRename" | "onExport"> & { conversation: CreationConversation }) {
    const { t } = useI18n();
    const triggerRef = useRef<HTMLButtonElement>(null);
    return (
        <Dropdown
            trigger={["click"]}
            menu={{
                items: [
                    { key: "rename", label: t("miscPages.rename") },
                    { key: "export", label: t("miscPages.exportMarkdown") },
                    { key: "delete", label: t("creationHistory.delete"), danger: true },
                ],
                onClick: ({ key }) => {
                    const trigger = triggerRef.current;
                    if (key === "export") onExport(conversation);
                    else if (trigger && key === "rename") onRename(conversation, trigger);
                    else if (trigger && key === "delete") onDelete(conversation, trigger);
                },
            }}
        >
            <button ref={triggerRef} type="button" className="creation-history-delete" aria-label={t("miscPages.conversationActions", { title: conversation.title })}>
                <MoreHorizontal />
            </button>
        </Dropdown>
    );
}

function CreationHistoryList({ conversations, activeId, onSelect, onDelete, onRename, onExport }: Omit<CreationHistoryDrawerProps, "open" | "onClose">) {
    const { t, date, locale } = useI18n();
    const modeLabel = useCallback((mode: CreationMode) => t(mode === "image" ? "creationComposer.image" : mode === "video" ? "creationComposer.video" : "modelPickerShell.text"), [t]);
    const displayTime = useCallback((value: string) => (conversationTimestamp(value) ? date(value, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) : t("creationHistory.timeUnknown")), [date, t]);
    const [keyword, setKeyword] = useState("");
    const deferredKeyword = useDeferredValue(keyword);
    const searchText = useMemo(() => {
        const cached = new WeakMap<CreationConversation, string>();
        return (conversation: CreationConversation) => {
            const previous = cached.get(conversation);
            if (previous !== undefined) return previous;
            const latest = conversationPreviewMessage(conversation);
            const searchable = [
                conversation.title,
                ...conversation.messages.flatMap((message) => [message.content, displayCreationPrompt(message.content, message.references || [])]),
                latest?.mode ? modeLabel(latest.mode) : t("creationHistory.creation"),
                displayTime(conversation.updatedAt),
            ]
                .filter(Boolean)
                .join(" ")
                .toLocaleLowerCase(locale);
            cached.set(conversation, searchable);
            return searchable;
        };
    }, [locale, modeLabel, displayTime, t]);

    const visibleConversations = useMemo(() => {
        const query = deferredKeyword.trim().toLocaleLowerCase(locale);
        return query ? conversations.filter((conversation) => searchText(conversation).includes(query)) : conversations;
    }, [conversations, deferredKeyword, locale, searchText]);

    const rows = useMemo(
        () =>
            visibleConversations.map((conversation) => {
                const latest = conversationPreviewMessage(conversation);
                const active = conversation.id === activeId;
                return (
                    <li key={conversation.id} className={active ? "is-active" : undefined}>
                        <button type="button" className="creation-history-item-main" aria-current={active ? "page" : undefined} onClick={() => onSelect(conversation)}>
                            <span className="creation-history-time">
                                <time dateTime={conversation.updatedAt}>{displayTime(conversation.updatedAt)}</time>
                                <em>{latest?.mode ? modeLabel(latest.mode) : t("creationHistory.creation")}</em>
                            </span>
                            <strong className="creation-history-item-heading">{conversation.title.trim() || t("creationHistory.new")}</strong>
                            <span className="creation-history-snippet">{latest ? displayCreationPrompt(latest.content, latest.references || []).trim() || t("creationHistory.notStarted") : t("creationHistory.notStarted")}</span>
                        </button>
                        <CreationHistoryActions conversation={conversation} onRename={onRename} onExport={onExport} onDelete={onDelete} />
                    </li>
                );
            }),
        [visibleConversations, activeId, displayTime, modeLabel, onSelect, onDelete, onRename, onExport, t],
    );

    return (
        <div className="creation-history-content">
            <label className="creation-history-search">
                <Search aria-hidden="true" />
                <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder={t("creationHistory.search")} aria-label={t("creationHistory.searchAria")} />
            </label>
            {rows.length ? (
                <ul className="creation-history-list" aria-label={t("creationHistory.listAria")}>
                    {rows}
                </ul>
            ) : (
                <div className="creation-history-empty">{deferredKeyword.trim() ? t("creationHistory.noMatch") : t("creationHistory.empty")}</div>
            )}
        </div>
    );
}

function CreationViewSwitch({ viewMode, onChange }: { viewMode: CreationViewMode; onChange: (mode: CreationViewMode) => void }) {
    const { t } = useI18n();
    return (
        <div className="creation-view-switch" role="group" aria-label={t("creationHistory.view")}>
            <button type="button" aria-pressed={viewMode === "chat"} onClick={() => onChange("chat")}>
                <MessageSquareText />
                {t("creationHistory.chat")}
            </button>
            <button type="button" aria-pressed={viewMode === "storyboard"} onClick={() => onChange("storyboard")}>
                <Clapperboard />
                {t("creationHistory.storyboard")}
            </button>
        </div>
    );
}

function CreationWorkspaceToolbar({
    viewMode,
    onViewModeChange,
    onNewConversation,
    onOpenHistory,
    continueCanvas,
}: {
    viewMode: CreationViewMode;
    onViewModeChange: (mode: CreationViewMode) => void;
    onNewConversation: () => void;
    onOpenHistory: () => void;
    continueCanvas: ReactNode;
}) {
    const { t } = useI18n();
    return (
        <header className="creation-thread-toolbar">
            <CreationViewSwitch viewMode={viewMode} onChange={onViewModeChange} />
            <div className="storyboard-workbench-bar-actions">
                {continueCanvas}
                <Tooltip title={t("creationHistory.newAction")}>
                    <button type="button" aria-label={t("creationHistory.newAction")} className="storyboard-workbench-bar-action" onClick={onNewConversation}>
                        <Plus />
                    </button>
                </Tooltip>
                <Tooltip title={t("creationHistory.history")}>
                    <button type="button" aria-label={t("creationHistory.open")} className="storyboard-workbench-bar-action" onClick={onOpenHistory}>
                        <History />
                    </button>
                </Tooltip>
            </div>
        </header>
    );
}

function CreationFailure({ item, onRetry }: { item: CreationMessage; onRetry: () => void }) {
    return (
        <GenerationErrorCard error={{ code: item.generationErrorCode, message: item.error, taskId: item.taskIds?.[0], billing: item.taskBilling }} onRetry={onRetry} actions={{ prompt: onRetry, reference: onRetry, model: onRetry, parameters: onRetry }} />
    );
}

function CreationMessageView({ item, modelName, onRetryFailure, onCreateVariant }: { item: CreationMessage; modelName: string; onRetryFailure: () => void; onCreateVariant: () => void }) {
    const { t, date } = useI18n();
    if (item.role === "user") return <CreationUserMessage item={item} />;
    const mode = item.mode || "text";
    const stateLabel = item.status === "pending" ? t("creationResult.generating") : item.status === "cancelled" ? t("creationResult.stopped") : item.status === "error" ? t("creationResult.failed") : "";
    const heading = (
        <>
            <span className="creation-message-mark">
                <Sparkles />
            </span>
            <strong>{mode === "image" ? t("creationResult.imageHeading") : mode === "video" ? t("creationResult.videoHeading") : "DramaCanvas AI"}</strong>
            {mode !== "text" ? (
                <span className="creation-message-progress-copy">
                    {item.status === "pending" ? t(mode === "video" ? "creationResult.makingVideo" : "creationResult.makingImage") : item.status === "done" ? t(mode === "video" ? "creationResult.madeVideo" : "creationResult.madeImage") : null}
                </span>
            ) : null}
            {modelName ? <span className="creation-message-model">{modelName}</span> : null}
            {item.createdAt ? <time dateTime={item.createdAt}>{date(item.createdAt, { hour: "2-digit", minute: "2-digit", hour12: false })}</time> : null}
            {stateLabel ? <span className={`creation-message-state is-${item.status}`}>{stateLabel}</span> : null}
        </>
    );
    const toolStatus: GenerationToolStatus = item.status === "pending" ? "running" : item.status === "error" ? "error" : item.status === "cancelled" ? "cancelled" : "completed";
    return (
        <article className={`creation-assistant-message is-${mode}`}>
            {mode === "text" ? (
                <>
                    <div className="creation-message-heading">{heading}</div>
                    {item.reasoning ? <MessageReasoning reasoning={item.reasoning} isStreaming={item.status === "streaming"} /> : null}
                    <div className="creation-message-content">{item.content ? <AIMessageMarkdown isStreaming={item.status === "streaming"}>{item.content}</AIMessageMarkdown> : <span>{t("creationResult.working")}</span>}</div>
                </>
            ) : (
                <GenerationToolCard status={toolStatus} isBulk={(item.resultUrls?.length || Number(item.settings?.count) || 1) > 1} heading={heading}>
                    <MediaResult item={item} onRetryFailure={onRetryFailure} onCreateVariant={onCreateVariant} />
                </GenerationToolCard>
            )}
            {item.error && mode === "text" ? <CreationFailure item={item} onRetry={onRetryFailure} /> : null}
        </article>
    );
}

function CreationUserMessage({ item }: { item: CreationMessage }) {
    const { t, date } = useI18n();
    const [previewUrl, setPreviewUrl] = useState("");
    const [previewType, setPreviewType] = useState<"image" | "video">("image");
    const copyText = useCopyText();
    const visiblePrompt = displayCreationPrompt(item.content, item.references || []);
    return (
        <article className="creation-user-message">
            <div className="creation-user-message-meta">
                <span>{t("creationResult.you")}</span>
                {item.createdAt ? <time dateTime={item.createdAt}>{date(item.createdAt, { hour: "2-digit", minute: "2-digit", hour12: false })}</time> : null}
                <Tooltip title={t("creationResult.copyMessage")}>
                    <button type="button" className="creation-user-message-copy" aria-label={t("creationResult.copyPrompt")} onClick={() => copyText(visiblePrompt, t("creationResult.copied"))}>
                        <Copy />
                    </button>
                </Tooltip>
            </div>
            <div className="creation-user-message-copy-wrap">
                <p>{visiblePrompt}</p>
            </div>
            {item.references?.length ? <CreationMessageReferences references={item.references} /> : null}
            {item.attachments?.length ? (
                <div className="creation-user-message-attachments">
                    {item.attachments.map((attachment) => {
                        const kind = creationAttachmentKind(attachment);
                        const previewable = kind === "image" || kind === "video";
                        const url = attachment.previewUrl || ("dataUrl" in attachment ? attachment.dataUrl : attachment.url) || "";
                        return (
                            <button
                                key={attachment.id}
                                type="button"
                                className={!previewable ? "is-file" : undefined}
                                onClick={() => {
                                    if (!previewable) return;
                                    setPreviewType(kind === "video" ? "video" : "image");
                                    setPreviewUrl(kind === "video" ? attachment.url || "" : url);
                                }}
                                aria-label={previewable ? t("creationResult.previewName", { name: attachment.name || t("creationResult.attachment") }) : attachment.name || t("creationResult.attachment")}
                                disabled={previewable && !url}
                            >
                                {kind === "video" ? (
                                    <video src={attachment.url || ""} poster={url !== attachment.url ? url : undefined} muted playsInline preload="metadata" />
                                ) : kind === "image" ? (
                                    <img src={url} alt={attachment.name || t("creationResult.attachment")} width={44} height={44} loading="lazy" />
                                ) : kind === "audio" ? (
                                    <Music2 />
                                ) : (
                                    <FileText />
                                )}
                                {previewable ? (
                                    <span aria-hidden="true">
                                        <Maximize2 />
                                    </span>
                                ) : null}
                            </button>
                        );
                    })}
                </div>
            ) : null}
            <CreationMediaPreviewModal url={previewUrl} type={previewType} onClose={() => setPreviewUrl("")} />
        </article>
    );
}

function MediaResult({ item, onRetryFailure, onCreateVariant }: { item: CreationMessage; onRetryFailure: () => void; onCreateVariant: () => void }) {
    const { t, number } = useI18n();
    const [previewUrl, setPreviewUrl] = useState("");
    const [previewType, setPreviewType] = useState<"image" | "video">("image");
    const assets = useAssetStore((state) => state.assets);
    const resultUrls = item.resultUrls || [];
    const resultAssetIds = resultUrls.length ? creationResultAssetIds(assets, { messageId: item.id, taskIds: item.taskIds || [], resultUrls }) : [];
    const canvasPath = creationCanvasHandoffPath(resultAssetIds) || "/canvas";
    if (item.status === "pending") return <CreationMediaPending mode={item.mode || "image"} ratio={item.settings?.ratio} phase={item.generationPhase} progress={item.generationProgress} />;
    if (item.status === "error" && !resultUrls.length) return <CreationFailure item={item} onRetry={onRetryFailure} />;
    if (item.status === "cancelled" && !resultUrls.length)
        return (
            <div className="creation-media-error">
                <span>{item.content || t("creationResult.stopped")}</span>
                <button type="button" onClick={onRetryFailure}>
                    <RefreshCw />
                    {t("creationResult.retry")}
                </button>
            </div>
        );
    if (!resultUrls.length)
        return (
            <div className="creation-media-empty">
                {t("creationResult.empty")}{" "}
                <button type="button" onClick={onRetryFailure}>
                    {t("common.retry")}
                </button>
            </div>
        );
    const isVideo = item.mode === "video";
    return (
        <div className="creation-media-result">
            {isVideo ? (
                <button
                    type="button"
                    className="creation-video-result"
                    onClick={() => {
                        setPreviewType("video");
                        setPreviewUrl(resultUrls[0]);
                    }}
                    aria-label={t("creationResult.previewVideoAria")}
                >
                    <video muted preload="metadata" src={resultUrls[0]} />
                    <span>
                        <Maximize2 />
                        {t("creationResult.previewVideo")}
                    </span>
                </button>
            ) : (
                <div className="creation-image-result-grid">
                    {resultUrls.map((url) => (
                        <button
                            key={url}
                            type="button"
                            className="creation-image-result"
                            onClick={() => {
                                setPreviewType("image");
                                setPreviewUrl(url);
                            }}
                            aria-label={t("creationResult.previewImage")}
                        >
                            <img src={url} alt={t("creationResult.result")} />
                            <span>
                                <Maximize2 />
                            </span>
                        </button>
                    ))}
                </div>
            )}
            <div className="creation-media-actions">
                <span>{isVideo ? t("creationResult.videoResult") : t("creationResult.images", { count: number(resultUrls.length) })}</span>
                <button type="button" onClick={onCreateVariant}>
                    <RefreshCw />
                    {t("creationResult.variant")}
                </button>
                <Link to={canvasPath}>{resultAssetIds.length ? t("creationResult.addCanvas") : t("creationResult.openCanvas")}</Link>
                {resultUrls.map((url, index) => (
                    <a key={`${url}-download`} href={url} download>
                        {resultUrls.length > 1 ? (
                            t("creationResult.downloadIndex", { index: number(index + 1) })
                        ) : (
                            <>
                                <Download />
                                {t("creationResult.download")}
                            </>
                        )}
                    </a>
                ))}
            </div>
            <CreationMediaPreviewModal url={previewUrl} type={previewType} onClose={() => setPreviewUrl("")} />
        </div>
    );
}

function CreationMediaPending({ mode, ratio, phase = 0, progress }: { mode: CreationMode; ratio?: string; phase?: GenerationPhase; progress?: number }) {
    const { t } = useI18n();
    return (
        <div className={`creation-media-pending is-${mode}`} style={{ aspectRatio: creationMediaAspectRatio(ratio, mode) }} aria-live="polite">
            <span className="creation-media-pending-icon">
                <Sparkles />
            </span>
            <span className="sr-only">{t(mode === "video" ? "creationResult.makingVideo" : "creationResult.makingImage")}</span>
            <div className="absolute inset-x-3 bottom-3 rounded-[var(--r-sm)] bg-[var(--creation-surface)] p-2 text-[var(--creation-text)]">
                <GenerationPhaseSteps step={phase} progress={progress} />
            </div>
        </div>
    );
}

function CreationMessageReferences({ references }: { references: CreationReference[] }) {
    const { t } = useI18n();
    return (
        <div className="creation-user-message-references" aria-label={t("creationComposer.usedReferences")}>
            {references.map((reference) => {
                const Icon = reference.kind === "skill" ? Sparkles : reference.kind === "image" ? ImageIcon : reference.kind === "video" ? Film : reference.kind === "audio" ? Music2 : FileText;
                return (
                    <span key={reference.id} className="creation-user-message-reference">
                        {reference.previewUrl && reference.kind === "video" ? (
                            <video src={reference.previewUrl} muted playsInline preload="metadata" aria-label={reference.label} />
                        ) : reference.previewUrl && reference.kind === "image" ? (
                            <img src={reference.previewUrl} alt="" />
                        ) : (
                            <Icon />
                        )}
                        <span>{reference.label}</span>
                    </span>
                );
            })}
        </div>
    );
}

function CreationMediaPreviewModal({ url, type, onClose }: { url: string; type: "image" | "video"; onClose: () => void }) {
    const { t } = useI18n();
    return (
        <Modal
            open={Boolean(url)}
            title={null}
            footer={null}
            centered
            destroyOnHidden
            width={type === "video" ? "min(1160px, calc(100vw - 32px))" : "min(980px, calc(100vw - 32px))"}
            onCancel={onClose}
            className="creation-media-preview-modal"
            styles={{ body: { padding: 0 } }}
        >
            {url ? type === "video" ? <video controls autoPlay className="creation-media-preview-video" src={url} /> : <img className="creation-media-preview-image" src={url} alt={t("creationComposer.preview")} /> : null}
        </Modal>
    );
}

function CreationAttachmentThumbnail({ item, onPreview, onRemove }: { item: CreationAttachment; onPreview: (type: "image" | "video", url: string) => void; onRemove: (id: string) => void }) {
    const { t } = useI18n();
    const kind = creationAttachmentKind(item);
    const previewable = kind === "image" || kind === "video";
    const url = (kind === "video" ? item.url : item.previewUrl) || "";
    const content =
        kind === "video" ? (
            <video src={item.url} poster={item.previewUrl !== item.url ? item.previewUrl : undefined} muted playsInline preload="metadata" aria-label={item.name} />
        ) : kind === "image" ? (
            <img src={item.previewUrl} alt={item.name} />
        ) : (
            <span className="creation-chat-file-icon">
                {kind === "audio" ? <Music2 /> : <FileText />}
                <em>{item.name}</em>
            </span>
        );
    return (
        <div className="creation-reference-card-content">
            {previewable ? (
                <button type="button" className="creation-reference-card-preview" onClick={() => onPreview(kind === "video" ? "video" : "image", url)} aria-label={t("creationComposer.previewName", { name: item.name })} disabled={!url}>
                    {content}
                    <span aria-hidden="true">
                        <Maximize2 />
                    </span>
                </button>
            ) : (
                <div className="creation-reference-card-preview is-file" aria-label={item.name}>
                    {content}
                </div>
            )}
            <button
                type="button"
                className="creation-reference-card-remove"
                onPointerDownCapture={(event) => event.stopPropagation()}
                onMouseDownCapture={(event) => event.stopPropagation()}
                onClick={(event) => {
                    event.stopPropagation();
                    onRemove(item.id);
                }}
                aria-label={t("creationComposer.removeName", { name: item.name })}
            >
                <X />
            </button>
        </div>
    );
}

type ComposerProps = {
    variant: "empty" | "thread";
    mode: CreationMode;
    prompt: string;
    setPrompt: (value: string) => void;
    busy: boolean;
    referenceReplacementBusy: boolean;
    attachments: CreationAttachment[];
    referenceImageSize?: { width: number; height: number };
    maxReferences: number;
    references: CreationReference[];
    onRemoveAttachment: (id: string) => void;
    onClearAttachments: () => void;
    onReorderAttachments: (attachments: CreationAttachment[]) => void;
    onReplaceAttachment: (targetAttachmentId: string, replacement: CreationAttachment) => void;
    onReplaceReferenceFiles: (targetAttachmentId: string, files: File[]) => void;
    onReferenceDrop: (transfer: DataTransfer) => void;
    onOpenLibrary: () => void;
    fileInputRef: RefObject<HTMLInputElement | null>;
    onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onModeChange: (mode: CreationMode) => void;
    model: string;
    modelRequirements: ModelRequirements;
    videoProfile: VideoCapabilityConfig;
    imageProfile: ImageCapabilityConfig;
    config: ReturnType<typeof useEffectiveConfig>;
    onModelChange: (value: string) => void;
    ratio: string;
    setRatio: (value: string) => void;
    seconds: string;
    setSeconds: (value: string) => void;
    quality: string;
    setQuality: (value: string) => void;
    videoQuality: string;
    setVideoQuality: (value: string) => void;
    count: string;
    setCount: (value: string) => void;
    promptOptimizerProvider: PromptOptimizerProvider | null;
    composerFocusRef: RefObject<HTMLTextAreaElement | null>;
    placeholderOverride?: string;
    onSubmit: () => void;
};

type CreationReferenceFilter = "all" | "image" | "video" | "audio" | "file";

function CreationComposer(props: ComposerProps) {
    const { t, number } = useI18n();
    const [previewUrl, setPreviewUrl] = useState("");
    const [previewType, setPreviewType] = useState<"image" | "video">("image");
    const [promptOptimizerOpen, setPromptOptimizerOpen] = useState(false);
    const [referenceFilter, setReferenceFilter] = useState<CreationReferenceFilter>("all");
    const [canDragReferences, setCanDragReferences] = useState(false);
    const [dropTargetReferenceId, setDropTargetReferenceId] = useState<string | null>(null);
    const attachmentTrackRef = useRef<HTMLUListElement>(null);
    const cardDragRef = useRef<{ startX: number; startY: number; moved: boolean } | null>(null);
    const suppressAttachmentClickRef = useRef(false);
    const [trackState, setTrackState] = useState({ canScrollLeft: false, canScrollRight: false, isExpanded: false, isDragging: false });
    const interactionBusy = props.busy || props.referenceReplacementBusy;
    const canSubmit = Boolean(props.prompt.trim()) && !interactionBusy && (props.mode !== "video" || videoSelectionAllowed(props.videoProfile, props.videoQuality, Number(props.seconds)));
    const creditsEnabled = useUserStore((state) => state.features.creditsEnabled);
    const priceChannel = resolveModelChannel(props.config, props.model);
    const canOptimizePrompt = Boolean(props.promptOptimizerProvider) && (props.mode === "image" || props.mode === "video");
    const optimizerReferences = props.references.filter((reference) => reference.active && reference.kind !== "skill");
    const credits = requestCreditCost({
        channelMode: priceChannel.scope === "system" ? "remote" : "local",
        modelCosts: priceChannel.modelCosts,
        model: modelOptionName(props.model),
        count: props.mode === "image" ? props.count : 1,
        seconds: props.mode === "video" ? props.seconds : 1,
    });
    const showCost = creditsEnabled && credits !== null;
    const formattedCredits = credits == null ? undefined : formatCreditQuantity(credits);
    const actionLabel = props.referenceReplacementBusy ? t("creationComposer.replacing") : props.busy ? t("creationComposer.generating") : showCost ? t("creationComposer.sendCost", { amount: formattedCredits ?? "" }) : t("creationComposer.send");
    const placeholder = props.mode === "text" ? t("creationComposer.textPlaceholder") : props.mode === "image" ? t("creationComposer.imagePlaceholder") : t("creationComposer.videoPlaceholder");
    const emptyPlaceholder = t("creationComposer.emptyPlaceholder");
    const imageReferencesSupported = props.imageProfile.references.maxImages > 0;
    const referencesSupported = props.mode === "image" ? imageReferencesSupported : props.mode !== "video" || props.videoProfile.operations.includes("image_to_video");
    const canAddMoreReferences = referencesSupported && props.attachments.length < props.maxReferences;
    const addReferenceLabel = interactionBusy ? (props.referenceReplacementBusy ? t("creationComposer.replacing") : t("creationComposer.busyReferences")) : canAddMoreReferences ? t("creationComposer.addReferences") : t("creationComposer.addReferences");
    const referenceCounts = useMemo(
        () =>
            props.attachments.reduce(
                (counts, attachment) => {
                    const kind = creationAttachmentKind(attachment);
                    counts[kind] += 1;
                    return counts;
                },
                { image: 0, video: 0, audio: 0, file: 0 },
            ),
        [props.attachments],
    );
    const visibleAttachments = useMemo(() => (referenceFilter === "all" ? props.attachments : props.attachments.filter((attachment) => creationAttachmentKind(attachment) === referenceFilter)), [props.attachments, referenceFilter]);
    const imageSettingsSupported = props.imageProfile.size.parameter !== "none" || props.imageProfile.quality.supported || props.imageProfile.maxOutputs > 1;
    const updateTrackScrollState = useCallback(() => {
        const track = attachmentTrackRef.current;
        if (!track) return;
        setTrackState((current) => ({
            ...current,
            canScrollLeft: track.scrollLeft > 1,
            canScrollRight: track.scrollLeft + track.clientWidth < track.scrollWidth - 1,
        }));
    }, []);
    const setReferencePanelExpanded = useCallback((isExpanded: boolean) => {
        setTrackState((current) => ({ ...current, isExpanded }));
        if (!isExpanded) setReferenceFilter("all");
    }, []);
    useEffect(() => {
        if (!props.attachments.length) setReferencePanelExpanded(false);
        updateTrackScrollState();
    }, [props.attachments.length, setReferencePanelExpanded, updateTrackScrollState]);
    useEffect(() => {
        const query = window.matchMedia("(hover: hover) and (pointer: fine)");
        const update = () => setCanDragReferences(query.matches);
        update();
        query.addEventListener("change", update);
        return () => query.removeEventListener("change", update);
    }, []);
    useEffect(() => {
        const frame = window.requestAnimationFrame(updateTrackScrollState);
        return () => window.cancelAnimationFrame(frame);
    }, [referenceFilter, trackState.isExpanded, updateTrackScrollState, visibleAttachments.length]);
    const beginCardDrag = (event: PointerEvent<HTMLElement>) => {
        if (event.button !== 0 || interactionBusy || !trackState.isExpanded) return;
        if ((event.target as HTMLElement).closest(".creation-reference-card-remove")) return;
        cardDragRef.current = { startX: event.clientX, startY: event.clientY, moved: false };
    };
    const endCardDrag = (event: PointerEvent<HTMLElement>) => {
        const drag = cardDragRef.current;
        if (!drag) return;
        cardDragRef.current = null;
        if (drag.moved) {
            suppressAttachmentClickRef.current = true;
            window.setTimeout(() => {
                suppressAttachmentClickRef.current = false;
            }, 0);
        }
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        setTrackState((current) => ({ ...current, isDragging: false }));
    };
    const moveCardDrag = (event: PointerEvent<HTMLElement>) => {
        const drag = cardDragRef.current;
        if (!drag || drag.moved) return;
        if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) <= 4) return;
        drag.moved = true;
        setTrackState((current) => ({ ...current, isDragging: true, isExpanded: true }));
    };
    const previewAttachment = (type: "image" | "video", url: string) => {
        if (suppressAttachmentClickRef.current || cardDragRef.current?.moved) return;
        setPreviewType(type);
        setPreviewUrl(url);
    };
    const reorderVisibleAttachments = useCallback(
        (next: CreationAttachment[]) => {
            if (referenceFilter === "all") {
                props.onReorderAttachments(next);
                return;
            }
            const visibleIds = new Set(visibleAttachments.map((attachment) => attachment.id));
            const reordered = [...next];
            props.onReorderAttachments(props.attachments.map((attachment) => (visibleIds.has(attachment.id) ? reordered.shift() || attachment : attachment)));
        },
        [props.attachments, props.onReorderAttachments, referenceFilter, visibleAttachments],
    );
    useEffect(() => {
        if (!canOptimizePrompt) setPromptOptimizerOpen(false);
    }, [canOptimizePrompt]);

    const scrollAttachmentTrack = (direction: -1 | 1) => {
        const track = attachmentTrackRef.current;
        if (!track) return;
        track.scrollBy({ left: direction * Math.max(track.clientWidth * 0.72, 120), behavior: "smooth" });
        window.setTimeout(updateTrackScrollState, 180);
    };
    const imageReferenceAtPoint = (x: number, y: number) => {
        for (const element of document.elementsFromPoint(x, y)) {
            const chip = element.closest<HTMLElement>("[data-mention-reference-id]");
            const referenceId = chip?.dataset.mentionReferenceId;
            const reference = referenceId ? props.references.find((item) => item.id === referenceId) : undefined;
            if (reference?.kind === "image" && reference.attachmentId) return reference;
        }
        return undefined;
    };
    const composer = (
        <section
            className={`creation-chat-composer is-${props.variant}`}
            onDragOver={(event) => {
                if (!interactionBusy && Array.from(event.dataTransfer.types).some((type) => type === "Files" || type === "application/x-creation-image")) {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "copy";
                }
            }}
            onDrop={(event) => {
                if (interactionBusy || !Array.from(event.dataTransfer.types).some((type) => type === "Files" || type === "application/x-creation-image")) return;
                event.preventDefault();
                event.stopPropagation();
                props.onReferenceDrop(event.dataTransfer);
            }}
        >
            <div className="creation-chat-writing-surface">
                <input ref={props.fileInputRef} type="file" hidden accept={creationUploadAccept(props.mode)} multiple onChange={props.onFileChange} />
                <div className="creation-chat-editor">
                    <CanvasResourceMentionTextarea
                        ref={props.composerFocusRef}
                        value={props.prompt}
                        references={props.references}
                        mentionMenuWidth={400}
                        sendOnEnter={false}
                        onChange={props.setPrompt}
                        onSubmit={props.onSubmit}
                        containerClassName="creation-chat-mention-container"
                        className="creation-chat-mention-editor creation-scrollbar"
                        style={{ color: "var(--creation-text)" }}
                        placeholder={props.placeholderOverride || (props.variant === "empty" ? emptyPlaceholder : placeholder)}
                        aria-label={t("creationComposer.promptAria")}
                        spellCheck
                        disabled={interactionBusy}
                        activeDropReferenceId={dropTargetReferenceId}
                        onReferenceFilesDrop={(reference, files) => {
                            const target = props.references.find((item) => item.id === reference.id);
                            if (target?.attachmentId) props.onReplaceReferenceFiles(target.attachmentId, files);
                        }}
                    />
                    {props.attachments.length || referencesSupported ? (
                        <div className={`creation-reference-panel${trackState.isExpanded ? " is-expanded" : ""}`} aria-busy={interactionBusy}>
                            {trackState.isExpanded ? (
                                <div className="creation-reference-panel-header">
                                    <div className="creation-reference-filter-tabs" role="group" aria-label={t("creationComposer.filter")}>
                                        {(
                                            [
                                                { id: "all", label: t("common.all"), count: props.attachments.length },
                                                { id: "image", label: t("creationComposer.image"), count: referenceCounts.image },
                                                { id: "video", label: t("creationComposer.video"), count: referenceCounts.video },
                                                { id: "audio", label: t("creationComposer.audio"), count: referenceCounts.audio },
                                                { id: "file", label: t("creationComposer.file"), count: referenceCounts.file },
                                            ] as const
                                        ).map((filter) => (
                                            <button key={filter.id} type="button" aria-pressed={referenceFilter === filter.id} className={referenceFilter === filter.id ? "is-active" : undefined} onClick={() => setReferenceFilter(filter.id)}>
                                                {filter.label}
                                                {filter.count ? ` (${number(filter.count)})` : ""}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="creation-reference-panel-actions">
                                        {props.attachments.length ? (
                                            <button type="button" onClick={props.onClearAttachments} disabled={interactionBusy}>
                                                {t("creationComposer.clear")}
                                            </button>
                                        ) : null}
                                        <Tooltip title={t("creationComposer.collapse")}>
                                            <button type="button" className="creation-reference-panel-collapse" onClick={() => setReferencePanelExpanded(false)} aria-label={t("creationComposer.collapse")}>
                                                <Minimize2 aria-hidden="true" />
                                            </button>
                                        </Tooltip>
                                    </div>
                                </div>
                            ) : null}
                            <div className="creation-reference-track-wrapper">
                                <div className="creation-reference-stack-shell">
                                    {trackState.canScrollLeft ? (
                                        <button type="button" className="creation-reference-track-button is-left" onClick={() => scrollAttachmentTrack(-1)} aria-label={t("creationComposer.left")} title={t("creationComposer.left")}>
                                            <ChevronLeft aria-hidden="true" />
                                        </button>
                                    ) : null}
                                    <Reorder.Group<CreationAttachment[]>
                                        as="ul"
                                        ref={attachmentTrackRef}
                                        className={`creation-reference-track${trackState.isExpanded ? " is-expanded" : ""}${trackState.isDragging ? " is-dragging" : ""}${visibleAttachments.length ? "" : " is-empty"}`}
                                        axis="x"
                                        values={visibleAttachments}
                                        onReorder={reorderVisibleAttachments}
                                        layoutScroll
                                        role="list"
                                        aria-label={t("creationComposer.track")}
                                        onScroll={updateTrackScrollState}
                                    >
                                        {visibleAttachments.map((item) => (
                                            <Reorder.Item<CreationAttachment>
                                                key={item.id}
                                                value={item}
                                                layout="position"
                                                drag={trackState.isExpanded && canDragReferences && !interactionBusy}
                                                className="creation-reference-stack-card"
                                                onPointerDown={beginCardDrag}
                                                onPointerMove={moveCardDrag}
                                                onPointerUp={endCardDrag}
                                                onPointerCancel={endCardDrag}
                                                onDragStart={() => {
                                                    setDropTargetReferenceId(null);
                                                    setTrackState((current) => ({ ...current, isDragging: true, isExpanded: true }));
                                                }}
                                                onDrag={(_, info) => {
                                                    if (creationAttachmentKind(item) !== "image") return;
                                                    const target = imageReferenceAtPoint(info.point.x, info.point.y);
                                                    setDropTargetReferenceId(target?.attachmentId !== item.id ? target?.id || null : null);
                                                }}
                                                onDragEnd={(_, info) => {
                                                    const target = creationAttachmentKind(item) === "image" ? imageReferenceAtPoint(info.point.x, info.point.y) : undefined;
                                                    setDropTargetReferenceId(null);
                                                    setTrackState((current) => ({ ...current, isDragging: false, isExpanded: true }));
                                                    if (target?.attachmentId && target.attachmentId !== item.id) props.onReplaceAttachment(target.attachmentId, item);
                                                }}
                                            >
                                                <CreationAttachmentThumbnail item={item} onPreview={previewAttachment} onRemove={props.onRemoveAttachment} />
                                            </Reorder.Item>
                                        ))}
                                        {!visibleAttachments.length && props.attachments.length ? <li className="creation-reference-filter-empty">{t("creationComposer.emptyType")}</li> : null}
                                        {referencesSupported ? (
                                            <li className="creation-reference-add-slot">
                                                <Tooltip title={addReferenceLabel}>
                                                    <button type="button" className="creation-reference-add-button" onClick={props.onOpenLibrary} disabled={interactionBusy || !canAddMoreReferences} aria-label={addReferenceLabel}>
                                                        <Plus aria-hidden="true" />
                                                        <span>{t("creationComposer.references")}</span>
                                                    </button>
                                                </Tooltip>
                                            </li>
                                        ) : null}
                                    </Reorder.Group>
                                    {trackState.canScrollRight ? (
                                        <button type="button" className="creation-reference-track-button is-right" onClick={() => scrollAttachmentTrack(1)} aria-label={t("creationComposer.right")} title={t("creationComposer.right")}>
                                            <ChevronRight aria-hidden="true" />
                                        </button>
                                    ) : null}
                                    {!trackState.isExpanded && props.attachments.length ? (
                                        <Tooltip title={t("creationComposer.all")}>
                                            <button
                                                type="button"
                                                className="creation-reference-panel-expand"
                                                onClick={() => setReferencePanelExpanded(true)}
                                                aria-label={t("creationComposer.allCount", { count: number(props.attachments.length) })}
                                                aria-expanded="false"
                                            >
                                                <Maximize2 aria-hidden="true" />
                                            </button>
                                        </Tooltip>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
            <footer className="creation-chat-dock">
                <div className="creation-chat-controls">
                    <VoiceRecordingButton disabled={interactionBusy} onTranscribed={(text) => props.setPrompt(props.prompt.trim() ? `${props.prompt} ${text}` : text)} />
                    <ModePicker mode={props.mode} onModeChange={props.onModeChange} />
                    {canOptimizePrompt ? (
                        <Tooltip title={t("creationComposer.optimizeTip")}>
                            <button type="button" className="creation-chat-control" onClick={() => setPromptOptimizerOpen(true)} aria-label={t("creationComposer.optimizeAria")} aria-expanded={promptOptimizerOpen} aria-haspopup="dialog">
                                <WandSparkles />
                                <span>{t("creationComposer.optimize")}</span>
                            </button>
                        </Tooltip>
                    ) : null}
                    <Tooltip title={t("creationComposer.upload")}>
                        <button type="button" className="creation-chat-control" onClick={() => props.fileInputRef.current?.click()} disabled={interactionBusy || !referencesSupported} aria-label={t("creationComposer.upload")}>
                            <Paperclip />
                            <span>{t("creationComposer.attachments")}</span>
                        </button>
                    </Tooltip>
                    <Tooltip title={!referencesSupported ? t("creationComposer.unsupported") : t("creationComposer.library")}>
                        <button type="button" className="creation-chat-control" onClick={props.onOpenLibrary} disabled={interactionBusy || !referencesSupported} aria-label={t("creationComposer.openLibrary")}>
                            <FolderOpen />
                            <span>{t("nav.assets")}</span>
                        </button>
                    </Tooltip>
                    <ModelPicker
                        config={props.config}
                        value={props.model}
                        onChange={props.onModelChange}
                        capability={props.mode}
                        requirements={props.modelRequirements}
                        className="creation-model-picker"
                        placeholder={t(props.mode === "image" ? "creationComposer.imageModel" : props.mode === "video" ? "creationComposer.videoModel" : "creationComposer.textModel")}
                        showSelectedPrice
                        variant="creation"
                    />
                    {props.mode === "video" || (props.mode === "image" && imageSettingsSupported) ? <GenerationSettingsMenu {...props} /> : null}
                    {props.mode === "video" ? <DurationMenu profile={videoProfileForResolution(props.videoProfile, props.videoQuality)} seconds={props.seconds} onChange={props.setSeconds} /> : null}
                </div>
                <Button
                    type="text"
                    className={`canvas-node-composer-submit ${showCost ? "has-cost" : ""}`}
                    disabled={interactionBusy || !canSubmit}
                    style={
                        {
                            color: !interactionBusy && !canSubmit ? "var(--creation-faint)" : "var(--creation-text)",
                            "--canvas-composer-submit-action": !interactionBusy && !canSubmit ? "var(--creation-surface-hover)" : "var(--creation-text)",
                            "--canvas-composer-submit-action-fg": !interactionBusy && !canSubmit ? "var(--creation-faint)" : "var(--creation-bg)",
                        } as CSSProperties
                    }
                    onClick={interactionBusy ? undefined : props.onSubmit}
                    aria-label={actionLabel}
                    title={actionLabel}
                >
                    {showCost ? (
                        <span className="canvas-node-composer-submit-cost">
                            <CreditSymbol />
                            <span>{formattedCredits}</span>
                        </span>
                    ) : null}
                    <span className="canvas-node-composer-submit-action" aria-hidden>
                        {interactionBusy ? <LoaderCircle className="size-3 animate-spin" /> : <ArrowUp className="size-3" />}
                    </span>
                </Button>
            </footer>
            <CreationMediaPreviewModal url={previewUrl} type={previewType} onClose={() => setPreviewUrl("")} />
        </section>
    );

    return (
        <CanvasPromptOptimizerDrawer
            open={promptOptimizerOpen}
            prompt={props.prompt}
            generationMode={props.mode === "video" ? "video" : "image"}
            targetModel={modelOptionName(props.model) || props.model}
            targetProtocol={priceChannel.modelCosts?.find((item) => item.model === modelOptionName(props.model))?.protocol || priceChannel.interfaceType}
            config={props.config}
            optimizerModel={props.config.textModel}
            references={optimizerReferences}
            provider={props.promptOptimizerProvider}
            onClose={() => setPromptOptimizerOpen(false)}
            onApply={props.setPrompt}
        >
            {composer}
        </CanvasPromptOptimizerDrawer>
    );
}

function ModePicker({ mode, onModeChange }: { mode: CreationMode; onModeChange: (mode: CreationMode) => void }) {
    const { t } = useI18n();
    const [open, setOpen] = useState(false);
    const items: { mode: CreationMode; icon: ReactNode; label: string }[] = [
        { mode: "video", icon: <Film />, label: t("creationSettings.video") },
        { mode: "image", icon: <ImageIcon />, label: t("creationSettings.image") },
        { mode: "text", icon: <MessageSquareText />, label: t("creationSettings.text") },
    ];
    const current = items.find((item) => item.mode === mode) || items[0];
    return (
        <Popover
            open={open}
            onOpenChange={setOpen}
            trigger="click"
            placement="bottomLeft"
            arrow={false}
            classNames={{ root: "creation-control-popover", container: "creation-control-popover-surface", content: "creation-control-popover-content" }}
            content={
                <div className="creation-mode-picker-menu" role="listbox" aria-label={t("creationSettings.choose")}>
                    {items.map((item) => (
                        <button
                            key={item.mode}
                            type="button"
                            role="option"
                            aria-selected={item.mode === mode}
                            className={item.mode === mode ? "is-selected" : ""}
                            onClick={() => {
                                onModeChange(item.mode);
                                setOpen(false);
                            }}
                        >
                            <span className="creation-menu-icon">{item.icon}</span>
                            <span>{item.label}</span>
                            {item.mode === mode ? <Check /> : null}
                        </button>
                    ))}
                </div>
            }
        >
            <button type="button" className="creation-chat-control is-mode" aria-label={t("creationSettings.type", { type: current.label })}>
                {current.icon}
                <span>{current.label}</span>
                <ChevronDown className={open ? "is-open" : ""} />
            </button>
        </Popover>
    );
}

function GenerationSettingsMenu(props: ComposerProps) {
    const { t, number } = useI18n();
    const localizedQualityOptions = qualityOptions.map((option) => ({ ...option, label: option.labelKey ? t(option.labelKey) : option.label || option.value, description: option.descriptionKey ? t(option.descriptionKey) : option.description }));
    const [open, setOpen] = useState(false);
    const [customRatioOpen, setCustomRatioOpen] = useState(!ratioOptions.some((option) => option.value === props.ratio));
    const activeQualityOptions = props.imageProfile.quality.values.map((value) => localizedQualityOptions.find((item) => item.value === value) || { value, label: value.toUpperCase(), description: t("creationSettings.supportedQuality") });
    const qualityLabel = activeQualityOptions.find((item) => item.value === props.quality)?.label || localizedQualityOptions.find((item) => item.value === props.quality)?.label || props.quality || t("creationSettings.auto");
    // 尺寸/比例/分辨率选项取同显示名分组内全部模型的并集，路由模型只决定发送参数。
    const mergedProfile = mergedImageCapabilityConfig(props.config, props.model || props.config.imageModel);
    const usesImageResolutionPicker = props.mode === "image" && supportsImageResolutionPresets(mergedProfile.size);
    const imageResolutionOptions = usesImageResolutionPicker ? buildImageResolutionOptions(mergedProfile.size.values) : [];
    const activeImageResolution = usesImageResolutionPicker ? imageResolutionOption(imageResolutionOptions, props.ratio) : undefined;
    const activeImageRatio = activeImageResolution?.ratio || imageRatioForSize(props.ratio) || (props.ratio.includes(":") ? props.ratio : "1:1");
    const activeImageResolutionChoice: ImageResolutionChoice = activeImageResolution?.tier || "auto";
    const imageResolutionChoiceOptions = usesImageResolutionPicker ? imageResolutionChoices(mergedProfile.size.values) : [];
    const imageRatios = usesImageResolutionPicker
        ? Array.from(new Set(imageResolutionOptions.filter((item) => !activeImageResolution || item.tier === activeImageResolution.tier).map((item) => item.ratio)))
        : mergedProfile.size.values.length
          ? mergedProfile.size.values
          : ratioOptions.map((item) => (item.labelKey ? t(item.labelKey) : item.value));
    const ratios = props.mode === "video" ? props.videoProfile.ratios : imageRatios;
    const referenceImageSize = props.mode === "image" && mergedProfile.size.allowCustom ? props.referenceImageSize : undefined;
    const referenceImageSizeValue = referenceImageSize ? String(referenceImageSize.width) + "x" + String(referenceImageSize.height) : "";
    const referenceImageSizeLabel = referenceImageSize ? String(referenceImageSize.width) + " × " + String(referenceImageSize.height) : "";
    const referenceImageSizeRatio = referenceImageSize ? String(referenceImageSize.width) + ":" + String(referenceImageSize.height) : "";
    const referenceImageSizeSelected = Boolean(referenceImageSizeValue && props.ratio === referenceImageSizeValue);
    const resolutions = props.mode === "video" ? props.videoProfile.resolutions.map((value) => ({ value: value.replace(/p$/i, ""), label: videoResolutionLabel(value) })) : resolutionOptions;
    const selectImageRatio = (nextRatio: string) => {
        if (!usesImageResolutionPicker || activeImageResolutionChoice === "auto") {
            props.setRatio(nextRatio);
            return;
        }
        props.setRatio(imageSizeForResolution(imageResolutionOptions, activeImageResolutionChoice, nextRatio) || nextRatio);
    };
    const selectImageResolution = (choice: ImageResolutionChoice) => {
        if (choice === "auto") {
            props.setRatio(mergedProfile.size.values.includes("auto") ? "auto" : activeImageRatio);
            return;
        }
        const nextSize = imageSizeForResolution(imageResolutionOptions, choice, activeImageRatio) || imageResolutionOptions.find((item) => item.tier === choice)?.size;
        if (nextSize) props.setRatio(nextSize);
    };
    const selectReferenceImageSize = () => {
        if (!referenceImageSizeValue) return;
        props.setRatio(referenceImageSizeValue);
        setCustomRatioOpen(false);
    };
    const videoResolutionSupported = props.mode === "video" && resolutions.length > 0;
    const imageSummary = [
        ...(mergedProfile.size.parameter !== "none" ? [referenceImageSizeSelected ? referenceImageSizeLabel : usesImageResolutionPicker ? formatImageResolutionSize(props.ratio, imageResolutionOptions) : props.ratio] : []),
        ...(props.imageProfile.quality.supported ? [qualityLabel] : []),
        ...(props.imageProfile.maxOutputs > 1 ? [props.count] : []),
    ].join(" · ");
    const videoRatioSupported = props.mode === "video" && ratios.length > 0;
    const summary = props.mode === "video" ? [...(videoRatioSupported ? [props.ratio] : []), ...(videoResolutionSupported ? [videoResolutionLabel(props.videoQuality)] : [])].join(" · ") : imageSummary;
    const panel = (
        <div className="creation-parameter-menu">
            {videoRatioSupported || (props.mode !== "video" && mergedProfile.size.parameter !== "none") ? (
                <SettingSection title={t("creationSettings.frame")} value={referenceImageSizeSelected ? referenceImageSizeLabel : props.mode === "image" && usesImageResolutionPicker ? activeImageRatio : props.ratio}>
                    <div className="creation-parameter-content">
                        <div className="creation-choice-grid is-ratio">
                            {referenceImageSizeValue ? (
                                <button
                                    type="button"
                                    aria-pressed={referenceImageSizeSelected}
                                    aria-label={t("creationSettings.referenceSize", { size: referenceImageSizeLabel })}
                                    title={t("creationSettings.referenceSize", { size: referenceImageSizeLabel })}
                                    className={"creation-reference-size-choice" + (referenceImageSizeSelected ? " is-selected" : "")}
                                    onClick={selectReferenceImageSize}
                                >
                                    <span className="creation-ratio-preview">
                                        <span style={ratioPreviewStyle(referenceImageSizeRatio)} />
                                    </span>
                                    <span>{t("creationSettings.reference")}</span>
                                </button>
                            ) : null}
                            {ratios.map((value) => {
                                const selected = props.mode === "image" && usesImageResolutionPicker ? value === activeImageRatio : value === props.ratio;
                                const automatic = isAutomaticRatio(value);
                                return (
                                    <button
                                        key={value}
                                        type="button"
                                        aria-pressed={selected}
                                        className={selected ? "is-selected" : ""}
                                        onClick={() => {
                                            if (props.mode === "image") selectImageRatio(value);
                                            else props.setRatio(value);
                                            setCustomRatioOpen(false);
                                        }}
                                    >
                                        <span className={"creation-ratio-preview" + (automatic ? " is-auto" : "")}>
                                            {automatic ? (
                                                <span>
                                                    <Sparkles aria-hidden />
                                                </span>
                                            ) : (
                                                <span style={ratioPreviewStyle(value)} />
                                            )}
                                        </span>
                                        <span>{automatic ? t("creationSettings.auto") : value}</span>
                                    </button>
                                );
                            })}
                        </div>
                        {props.mode !== "video" &&
                            mergedProfile.size.allowCustom &&
                            (customRatioOpen ? (
                                <label className="creation-custom-value">
                                    <span>{t("creationSettings.dimensions")}</span>
                                    <input
                                        value={props.ratio}
                                        onFocus={(event) => event.currentTarget.select()}
                                        onChange={(event) => props.setRatio(event.target.value)}
                                        placeholder={t("creationSettings.sizeExample")}
                                        aria-label={t("creationSettings.customSize")}
                                    />
                                </label>
                            ) : (
                                <button type="button" className="creation-custom-trigger" onClick={() => setCustomRatioOpen(true)}>
                                    <Plus />
                                    {t("creationSettings.enterSize")}
                                </button>
                            ))}
                    </div>
                </SettingSection>
            ) : null}
            {props.mode === "video" ? (
                videoResolutionSupported ? (
                    <SettingSection title={t("creationSettings.definition")} value={videoResolutionLabel(props.videoQuality)}>
                        <div className="creation-choice-grid is-resolution">
                            {resolutions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    disabled={!videoSelectionAllowed(props.videoProfile, option.value, Number(props.seconds))}
                                    aria-pressed={option.value === props.videoQuality}
                                    className={option.value === props.videoQuality ? "is-selected" : ""}
                                    onClick={() => props.setVideoQuality(option.value)}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </SettingSection>
                ) : null
            ) : (
                <>
                    {imageResolutionChoiceOptions.length ? (
                        <SettingSection title={t("creationSettings.resolution")} value={activeImageResolutionChoice === "auto" ? t("creationSettings.auto") : activeImageResolutionChoice.toUpperCase()}>
                            <div className="creation-choice-grid is-resolution">
                                {imageResolutionChoiceOptions.map((choice) => (
                                    <button key={choice} type="button" aria-pressed={choice === activeImageResolutionChoice} className={choice === activeImageResolutionChoice ? "is-selected" : ""} onClick={() => selectImageResolution(choice)}>
                                        {choice === "auto" ? t("creationSettings.auto") : choice.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </SettingSection>
                    ) : null}
                    {props.imageProfile.quality.supported ? (
                        <SettingSection title={activeQualityOptions.some((item) => item.value === "1k" || item.value === "2k") ? t("creationSettings.resolution") : t("creationSettings.quality")} value={qualityLabel}>
                            <div className="creation-choice-grid is-quality">
                                {activeQualityOptions.map((option) => (
                                    <button key={option.value} type="button" aria-pressed={option.value === props.quality} className={option.value === props.quality ? "is-selected" : ""} onClick={() => props.setQuality(option.value)}>
                                        <span>{option.label}</span>
                                        <small>{option.description}</small>
                                    </button>
                                ))}
                            </div>
                        </SettingSection>
                    ) : null}
                    {props.imageProfile.maxOutputs > 1 ? (
                        <SettingSection title={t("creationSettings.count")} value={t("creationSettings.images", { count: number(Number(props.count)) })}>
                            <div className="creation-parameter-content">
                                <div className="creation-choice-grid is-count">
                                    {countOptions
                                        .filter((option) => Number(option) <= props.imageProfile.maxOutputs)
                                        .map((option) => (
                                            <button key={option} type="button" aria-pressed={option === props.count} className={option === props.count ? "is-selected" : ""} onClick={() => props.setCount(option)}>
                                                {option}
                                            </button>
                                        ))}
                                </div>
                                <label className="creation-custom-value">
                                    <span>{t("creationSettings.custom")}</span>
                                    <input
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={props.count}
                                        onChange={(event) => props.setCount(String(Math.max(1, Math.min(props.imageProfile.maxOutputs, Number(event.target.value) || 1))))}
                                        aria-label={t("creationSettings.range", { max: number(props.imageProfile.maxOutputs) })}
                                    />
                                    <em>{t("creationSettings.imageUnit")}</em>
                                </label>
                            </div>
                        </SettingSection>
                    ) : null}
                </>
            )}
        </div>
    );
    return (
        <Popover
            open={open}
            onOpenChange={setOpen}
            trigger="click"
            placement="bottom"
            arrow={false}
            classNames={{ root: "creation-control-popover", container: "creation-control-popover-surface", content: "creation-control-popover-content" }}
            content={panel}
        >
            <button type="button" className="creation-chat-control" aria-label={t("creationSettings.settings", { summary })}>
                <SlidersHorizontal />
                <span>{summary}</span>
                <ChevronDown className={open ? "is-open" : ""} />
            </button>
        </Popover>
    );
}

function SettingSection({ title, value, children }: { title: string; value?: string; children: ReactNode }) {
    return (
        <section className="creation-parameter-section">
            <header>
                <h3>{title}</h3>
                {value ? <span>{value}</span> : null}
            </header>
            {children}
        </section>
    );
}

function DurationMenu({ profile, seconds, onChange }: { profile: VideoCapabilityConfig; seconds: string; onChange: (value: string) => void }) {
    const { t, number } = useI18n();
    const [open, setOpen] = useState(false);
    const value = Number(normalizeVideoValue(profile, { seconds }).seconds);
    const presets = profile.duration.selection === "enum" ? videoDurationOptions(profile) : [];
    const fallbackPreset = presets.length ? presets : [profile.duration.default];
    const min = profile.duration.selection === "range" ? profile.duration.min || 1 : Math.min(...fallbackPreset);
    const max = profile.duration.selection === "range" ? Math.max(min, profile.duration.max || min) : Math.max(...fallbackPreset);
    const step = Math.max(1, profile.duration.step || 1);
    const durationControl =
        profile.duration.selection === "range" ? (
            <>
                <input className="h-8 w-full" style={{ accentColor: "var(--creation-text)" }} type="range" min={min} max={max} step={step} value={value} aria-label={t("creationSettings.durationAria")} onChange={(event) => onChange(event.target.value)} />
                <div className="flex justify-between px-0.5 text-[var(--fs-tiny)] text-[var(--creation-muted)]">
                    <span>{number(min)}s</span>
                    <span>{number(max)}s</span>
                </div>
                <label className="creation-custom-value is-duration">
                    <span>{t("creationSettings.customDuration")}</span>
                    <span className="creation-duration-custom-field">
                        <input
                            type="number"
                            min={min}
                            max={max}
                            step={step}
                            inputMode="numeric"
                            value={seconds}
                            onFocus={(event) => event.currentTarget.select()}
                            onBlur={() => onChange(String(value))}
                            onChange={(event) => onChange(event.target.value)}
                            aria-label={t("creationSettings.customDurationAria")}
                        />
                        <em>{t("creationSettings.seconds")}</em>
                    </span>
                </label>
            </>
        ) : (
            <div className="creation-duration-choices">
                {presets.map((item) => (
                    <button key={item} type="button" className={item === value ? "is-selected" : ""} onClick={() => onChange(String(item))}>
                        {number(item)}s
                    </button>
                ))}
            </div>
        );
    return (
        <Popover
            open={open}
            onOpenChange={setOpen}
            trigger="click"
            placement="bottom"
            arrow={false}
            classNames={{ root: "creation-control-popover", container: "creation-control-popover-surface", content: "creation-control-popover-content" }}
            content={
                <div className="creation-duration-menu">
                    <div className="creation-duration-heading">
                        <span>{t("creationSettings.duration")}</span>
                        <strong>{t("creationSettings.secondsCount", { count: number(value) })}</strong>
                    </div>
                    {durationControl}
                </div>
            }
        >
            <button type="button" className="creation-chat-control is-duration" aria-label={t("creationSettings.durationValue", { count: number(value) })}>
                <Clock3 />
                <span>{number(value)}s</span>
                <ChevronDown className={open ? "is-open" : ""} />
            </button>
        </Popover>
    );
}

const creationEmptyBannerFrames: { src: string; caption: MessageKey }[] = [
    { src: "/short-drama-styles/cyberpunk-neon.jpg", caption: "creationEmpty.neon" },
    { src: "/short-drama-styles/suspense-noir.jpg", caption: "creationEmpty.chase" },
    { src: "/short-drama-styles/retro-hong-kong.jpg", caption: "creationEmpty.rooftop" },
];

function CreationEmptyBanner() {
    const { t } = useI18n();
    return (
        <div className="creation-empty-art" aria-hidden="true">
            {creationEmptyBannerFrames.map((frame, index) => (
                <figure key={frame.caption} className={`creation-empty-art-frame ${index === 1 ? "is-main" : index === 0 ? "is-back" : "is-front"}`}>
                    <img src={frame.src} alt="" />
                    <span>{t(frame.caption)}</span>
                </figure>
            ))}
            <span className="creation-empty-art-caption">
                <span>DramaCanvas</span>
                {t("creationEmpty.caption")}
            </span>
        </div>
    );
}

const creationEmptySuggestions: Array<{ mode: CreationMode; icon: typeof Clapperboard; title: MessageKey; hint: MessageKey; promptKey?: MessageKey; openLibrary?: boolean }> = [
    { mode: "video", icon: Clapperboard, title: "creationEmpty.first", hint: "creationEmpty.firstHint", promptKey: "miscPages.suggestPromptFirst" },
    { mode: "image", icon: ImageIcon, title: "creationEmpty.reference", hint: "creationEmpty.referenceHint", openLibrary: true },
    { mode: "text", icon: FileText, title: "creationEmpty.story", hint: "creationEmpty.storyHint", promptKey: "miscPages.suggestPromptStory" },
    { mode: "video", icon: Sparkles, title: "creationEmpty.skill", hint: "creationEmpty.skillHint", promptKey: "miscPages.suggestPromptSkill" },
];

function CreationEmptySuggest({ onStartPrompt, onOpenLibrary }: { onStartPrompt: (mode: CreationMode, prompt: string) => void; onOpenLibrary: () => void }) {
    const { t } = useI18n();
    return (
        <div className="creation-empty-suggest">
            {creationEmptySuggestions.map((item) => {
                const Icon = item.icon;
                return (
                    <button
                        key={item.title}
                        type="button"
                        className="suggest-card"
                        onClick={() => {
                            if (item.openLibrary) onOpenLibrary();
                            else onStartPrompt(item.mode, item.promptKey ? t(item.promptKey) : "");
                        }}
                    >
                        <span className={`library-icon-tile suggest-icon is-${item.mode}`}>
                            <Icon size={15} strokeWidth={2} />
                        </span>
                        <span className="suggest-copy">
                            <strong>{t(item.title)}</strong>
                            <span>{t(item.hint)}</span>
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

type CreationThinking = { title: string; hint: string; steps: string[] };

function thinkingFor(mode: CreationMode, t: ReturnType<typeof useI18n>["t"]): CreationThinking {
    if (mode === "image") return { title: t("creationThinking.imageTitle"), hint: t("creationThinking.imageHint"), steps: [t("creationThinking.composition"), t("creationThinking.style"), t("creationThinking.image")] };
    if (mode === "text") return { title: t("creationThinking.textTitle"), hint: t("creationThinking.textHint"), steps: [t("creationThinking.ideas"), t("creationThinking.language"), t("creationThinking.text")] };
    return { title: t("creationThinking.videoTitle"), hint: t("creationThinking.videoHint"), steps: [t("creationThinking.breakdown"), t("creationThinking.camera"), t("creationThinking.light"), t("creationThinking.render")] };
}

function directorNoteFor(mode: CreationMode, settings: CreationSettings, { t, number }: ReturnType<typeof useI18n>): string {
    if (mode === "video") return t("creationStoryboard.videoNote", { settings: [`${number(Number(settings.seconds))}s`, ...(settings.videoQuality ? [videoResolutionLabel(settings.videoQuality)] : []), settings.ratio].join(" · ") });
    if (mode === "image") return t("creationStoryboard.imageNote", { ratio: settings.ratio, count: number(Number(settings.count)) });
    return "";
}

function StoryboardToolbar({
    shots,
    activeIndex,
    composing,
    onSelect,
    onBeginCompose,
    onCancelCompose,
    onNewConversation,
    onOpenHistory,
    viewMode,
    onViewModeChange,
    continueCanvas,
}: {
    shots: CreationShot[];
    activeIndex: number;
    composing: boolean;
    onSelect: (index: number) => void;
    onBeginCompose: () => void;
    onCancelCompose: () => void;
    onNewConversation: () => void;
    onOpenHistory: () => void;
    viewMode: CreationViewMode;
    onViewModeChange: (mode: CreationViewMode) => void;
    continueCanvas: ReactNode;
}) {
    const { t, number, date } = useI18n();
    const [railOpen, setRailOpen] = useState(false);
    const nextShotNumber = shots.length + 1;
    const closeRail = () => setRailOpen(false);
    const statusOf = (shot: CreationShot) => shot.result?.status || "queued";
    const shotTitle = (shot: CreationShot) => (shot.user ? displayCreationPrompt(shot.user.content, shot.user.references || []).trim() || t("creationStoryboard.unnamed") : t("creationStoryboard.shot"));
    return (
        <header className="storyboard-workbench-bar" aria-label={t("creationStoryboard.toolbar")}>
            <div className="storyboard-workbench-rail">
                <Tooltip title={t("creationStoryboard.timeline")}>
                    <button
                        type="button"
                        className={`storyboard-workbench-rail-button${railOpen ? " is-open" : ""}${composing ? " is-draft" : ""}`}
                        aria-expanded={railOpen}
                        aria-label={t("creationStoryboard.timeline")}
                        onClick={() => setRailOpen((value) => !value)}
                    >
                        <Film />
                        <span className="storyboard-workbench-rail-badge">{number(composing ? nextShotNumber : shots.length)}</span>
                    </button>
                </Tooltip>
                {railOpen ? (
                    <div className="storyboard-workbench-rail-pop" role="listbox" aria-label={t("creationStoryboard.list")}>
                        <div className="storyboard-workbench-rail-pop-head">
                            <span className="storyboard-workbench-rail-pop-title">
                                <Clapperboard />
                                {t("creationStoryboard.timeline")}
                                <small>{composing ? t("creationStoryboard.nextId", { id: String(nextShotNumber).padStart(2, "0") }) : t("creationStoryboard.count", { count: number(shots.length) })}</small>
                            </span>
                            <button type="button" className="storyboard-workbench-rail-pop-close" aria-label={t("creationStoryboard.close")} onClick={closeRail}>
                                <X />
                            </button>
                        </div>
                        <ul className="creation-scrollbar">
                            {shots.map((shot, index) => {
                                const status = statusOf(shot);
                                const title = shotTitle(shot);
                                const thumbUrl = shot.result?.resultUrls?.[0];
                                const thumbIsVideo = shot.result?.mode === "video";
                                return (
                                    <li key={shot.user?.id || shot.result?.id || index}>
                                        <button
                                            type="button"
                                            className={`storyboard-workbench-rail-row${index === activeIndex && !composing ? " is-active" : ""}`}
                                            onClick={() => {
                                                onSelect(index);
                                                closeRail();
                                            }}
                                        >
                                            <span className="storyboard-workbench-rail-thumb">
                                                {thumbUrl ? (
                                                    thumbIsVideo ? (
                                                        <video muted preload="metadata" src={thumbUrl} />
                                                    ) : (
                                                        <img src={thumbUrl} alt="" />
                                                    )
                                                ) : (
                                                    <span className="storyboard-workbench-rail-thumb-ph">
                                                        <Clapperboard />
                                                        <em>SC.{String(index + 1).padStart(2, "0")}</em>
                                                    </span>
                                                )}
                                            </span>
                                            <span className="storyboard-workbench-rail-info">
                                                <span className="storyboard-workbench-rail-head">
                                                    <span className="storyboard-workbench-rail-row-shot">SC.{String(index + 1).padStart(2, "0")}</span>
                                                    <span className={`storyboard-workbench-rail-row-state is-${status}`}>
                                                        {status === "pending" ? t("creationResult.generating") : status === "error" ? t("creationStoryboard.failed") : status === "done" ? t("creationStoryboard.done") : t("creationStoryboard.queued")}
                                                    </span>
                                                    {shot.result?.createdAt ? <time dateTime={shot.result.createdAt}>{date(shot.result.createdAt, { hour: "2-digit", minute: "2-digit", hour12: false })}</time> : null}
                                                </span>
                                                <span className="storyboard-workbench-rail-row-title">{title}</span>
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                            {composing ? (
                                <li>
                                    <button
                                        type="button"
                                        className="storyboard-workbench-rail-row is-draft"
                                        onClick={() => {
                                            onCancelCompose();
                                            closeRail();
                                        }}
                                    >
                                        <span className="storyboard-workbench-rail-thumb">
                                            <span className="storyboard-workbench-rail-thumb-ph">
                                                <Clapperboard />
                                                <em>SC.{String(nextShotNumber).padStart(2, "0")}</em>
                                            </span>
                                        </span>
                                        <span className="storyboard-workbench-rail-info">
                                            <span className="storyboard-workbench-rail-head">
                                                <span className="storyboard-workbench-rail-row-shot">SC.{String(nextShotNumber).padStart(2, "0")}</span>
                                                <span className="storyboard-workbench-rail-row-state">{t("creationStoryboard.draft")}</span>
                                            </span>
                                            <span className="storyboard-workbench-rail-row-title">{t("creationStoryboard.awaiting")}</span>
                                        </span>
                                    </button>
                                </li>
                            ) : null}
                        </ul>
                        <button
                            type="button"
                            className="storyboard-workbench-rail-pop-add"
                            onClick={() => {
                                closeRail();
                                onBeginCompose();
                            }}
                        >
                            <Plus />
                            {t("creationStoryboard.add")}
                        </button>
                    </div>
                ) : null}
            </div>
            <div className="storyboard-workbench-bar-actions">
                <CreationViewSwitch viewMode={viewMode} onChange={onViewModeChange} />
                {continueCanvas}
                <Tooltip title={composing ? t("creationStoryboard.collapse") : t("creationStoryboard.add")}>
                    <button type="button" aria-label={composing ? t("creationStoryboard.collapse") : t("creationStoryboard.add")} className="storyboard-workbench-bar-action" onClick={composing ? onCancelCompose : onBeginCompose}>
                        {composing ? <X /> : <Clapperboard />}
                    </button>
                </Tooltip>
                <Tooltip title={t("creationHistory.newAction")}>
                    <button type="button" aria-label={t("creationHistory.newAction")} className="storyboard-workbench-bar-action" onClick={onNewConversation}>
                        <Plus />
                    </button>
                </Tooltip>
                <Tooltip title={t("creationHistory.history")}>
                    <button type="button" aria-label={t("creationHistory.open")} className="storyboard-workbench-bar-action" onClick={onOpenHistory}>
                        <History />
                    </button>
                </Tooltip>
            </div>
        </header>
    );
}

function StoryboardShotCard({ shot, shotNumber, modelName, busy, onRetryFailure, onCreateVariant }: { shot: CreationShot; shotNumber: number; modelName: string; busy: boolean; onRetryFailure: () => void; onCreateVariant: () => void }) {
    const i18n = useI18n();
    const { t, number, date } = i18n;
    const user = shot.user;
    const result = shot.result;
    const status = result?.status || "queued";
    const mode = result?.mode || user?.mode || "video";
    const briefVisible = Boolean(user?.content.trim() || user?.references?.length || user?.attachments?.length);
    const copyText = useCopyText();
    const assets = useAssetStore((state) => state.assets);
    const visiblePrompt = user ? displayCreationPrompt(user.content, user.references || []) : "";
    const resultUrls = result?.resultUrls || [];
    const resultAssetIds = result && resultUrls.length ? creationResultAssetIds(assets, { messageId: result.id, taskIds: result.taskIds || [], resultUrls }) : [];
    const canvasHandoffPath = result ? creationCanvasHandoffPath(resultAssetIds, resultUrls.length) : "";
    const canvasPath = canvasHandoffPath || "/canvas";
    return (
        <article className={`storyboard-workbench-card is-${status}`}>
            <header className="storyboard-workbench-card-head">
                <div className="storyboard-workbench-card-heading">
                    <span className="storyboard-workbench-card-shot">
                        <span className="storyboard-workbench-card-shot-index">SC.{String(shotNumber).padStart(2, "0")}</span>
                        {t("creationStoryboard.shotNumber", { number: number(shotNumber) })}
                    </span>
                    <span className="storyboard-workbench-card-mode">
                        {mode === "video" ? <Film /> : mode === "image" ? <ImageIcon /> : <MessageSquareText />}
                        {t(mode === "image" ? "creationComposer.image" : mode === "video" ? "creationComposer.video" : "modelPickerShell.text")}
                    </span>
                    {modelName ? <span className="storyboard-workbench-card-model">{modelName}</span> : null}
                    {status === "pending" ? (
                        <span className="storyboard-workbench-card-state is-pending">
                            <LoaderCircle className="animate-spin" />
                            {t("creationResult.generating")}
                        </span>
                    ) : status === "error" ? (
                        <span className="storyboard-workbench-card-state is-error">{t("creationResult.failed")}</span>
                    ) : status === "done" ? (
                        <span className="storyboard-workbench-card-state is-done">
                            <Check />
                            {t("tasks.done")}
                        </span>
                    ) : (
                        <span className="storyboard-workbench-card-state">{t("creationStoryboard.queued")}</span>
                    )}
                </div>
                <div className="storyboard-workbench-card-actions">
                    {status === "error" ? (
                        <button type="button" onClick={onRetryFailure} disabled={busy}>
                            <RefreshCw />
                            {t("creationResult.retry")}
                        </button>
                    ) : null}
                    {status === "done" && result?.resultUrls?.length ? (
                        <button type="button" onClick={onCreateVariant} disabled={busy}>
                            <RefreshCw />
                            {t("creationStoryboard.variant")}
                        </button>
                    ) : null}
                    {status === "done" && resultUrls.length ? <Link to={canvasPath}>{canvasHandoffPath ? t("creationResult.addCanvas") : t("creationResult.openCanvas")}</Link> : null}
                    {resultUrls.map((url, index) => (
                        <a key={`${url}-download`} href={url} download>
                            {resultUrls.length > 1 ? (
                                t("creationResult.downloadIndex", { index: number(index + 1) })
                            ) : (
                                <>
                                    <Download />
                                    {t("creationResult.download")}
                                </>
                            )}
                        </a>
                    ))}
                </div>
            </header>
            <div className="storyboard-workbench-card-body">
                <div className="storyboard-workbench-thread" aria-label={t("creationStoryboard.conversation", { number: number(shotNumber) })}>
                    {briefVisible && user ? (
                        <div className="storyboard-workbench-turn is-user">
                            <div className="storyboard-workbench-turn-copy">
                                <div className="storyboard-workbench-turn-meta">
                                    <span className="storyboard-workbench-turn-role">{t(mode === "image" ? "creationStoryboard.imageInstruction" : mode === "video" ? "creationStoryboard.script" : "creationStoryboard.idea")}</span>
                                    {user.createdAt ? (
                                        <time className="storyboard-workbench-turn-time" dateTime={user.createdAt}>
                                            {date(user.createdAt, { hour: "2-digit", minute: "2-digit", hour12: false })}
                                        </time>
                                    ) : null}
                                    <Tooltip title={t("creationResult.copyMessage")}>
                                        <button type="button" className="creation-user-message-copy" aria-label={t("creationResult.copyPrompt")} onClick={() => copyText(visiblePrompt, t("creationResult.copied"))}>
                                            <Copy />
                                        </button>
                                    </Tooltip>
                                </div>
                                <div className="storyboard-workbench-turn-bubble">
                                    <p className="storyboard-workbench-turn-text">{visiblePrompt}</p>
                                    {user.references?.length ? <CreationMessageReferences references={user.references} /> : null}
                                    {user.attachments?.length ? <StoryboardBriefAttachments attachments={user.attachments} /> : null}
                                </div>
                            </div>
                        </div>
                    ) : null}
                    {briefVisible && user ? (
                        <div className="storyboard-workbench-handoff" aria-hidden="true">
                            <span className="storyboard-workbench-handoff-rail" />
                            <span className="storyboard-workbench-handoff-badge">
                                <ArrowDown />
                                {t("creationStoryboard.handoff")}
                            </span>
                            <span className="storyboard-workbench-handoff-rail" />
                        </div>
                    ) : null}
                    <div className="storyboard-workbench-turn is-ai">
                        <span className="storyboard-workbench-ai-avatar">
                            <Clapperboard />
                        </span>
                        <div className="storyboard-workbench-turn-copy">
                            <div className="storyboard-workbench-turn-meta">
                                <span className="storyboard-workbench-turn-role is-ai">
                                    <Sparkles />
                                    DramaCanvas AI
                                </span>
                                {modelName ? <span className="storyboard-workbench-turn-model">{modelName}</span> : null}
                                {result?.createdAt ? (
                                    <time className="storyboard-workbench-turn-time" dateTime={result.createdAt}>
                                        {date(result.createdAt, { hour: "2-digit", minute: "2-digit", hour12: false })}
                                    </time>
                                ) : null}
                            </div>
                            <div className="storyboard-workbench-turn-bubble">
                                <StoryboardShotResult result={result} onRetryFailure={onRetryFailure} onCreateVariant={onCreateVariant} canvasPath={canvasPath} canvasHandoffAvailable={Boolean(canvasHandoffPath)} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </article>
    );
}

function StoryboardNextShotCard({ shotNumber, onCancel }: { shotNumber: number; onCancel: () => void }) {
    const { t, number, date } = useI18n();
    return (
        <article className="storyboard-workbench-card is-next">
            <header className="storyboard-workbench-card-head">
                <div className="storyboard-workbench-card-heading">
                    <span className="storyboard-workbench-card-shot">
                        <span className="storyboard-workbench-card-shot-index">SC.{String(shotNumber).padStart(2, "0")}</span>
                        {t("creationStoryboard.nextNumber", { number: number(shotNumber) })}
                    </span>
                    <span className="storyboard-workbench-card-state is-draft">
                        <Clapperboard />
                        {t("creationStoryboard.draft")}
                    </span>
                </div>
                <div className="storyboard-workbench-card-actions">
                    <button type="button" onClick={onCancel}>
                        <X />
                        {t("creationStoryboard.cancel")}
                    </button>
                </div>
            </header>
            <div className="storyboard-workbench-card-body">
                <div className="storyboard-workbench-next-panel">
                    <span className="storyboard-workbench-next-panel-icon">
                        <Clapperboard />
                    </span>
                    <div className="storyboard-workbench-next-panel-copy">
                        <strong>{t("creationStoryboard.awaitingId", { id: String(shotNumber).padStart(2, "0") })}</strong>
                        <span>{t("creationStoryboard.nextHelp", { id: String(shotNumber).padStart(2, "0") })}</span>
                    </div>
                </div>
            </div>
        </article>
    );
}

function StoryboardBriefAttachments({ attachments }: { attachments: CreationAttachment[] }) {
    const { t } = useI18n();
    const [previewUrl, setPreviewUrl] = useState("");
    const [previewType, setPreviewType] = useState<"image" | "video">("image");
    return (
        <>
            <div className="creation-user-message-attachments storyboard-workbench-brief-attachments">
                {attachments.map((attachment) => {
                    const kind = creationAttachmentKind(attachment);
                    const previewable = kind === "image" || kind === "video";
                    const url = attachment.previewUrl || ("dataUrl" in attachment ? attachment.dataUrl : attachment.url) || "";
                    return (
                        <button
                            key={attachment.id}
                            type="button"
                            className={!previewable ? "is-file" : undefined}
                            onClick={() => {
                                if (!previewable) return;
                                setPreviewType(kind === "video" ? "video" : "image");
                                setPreviewUrl(kind === "video" ? attachment.url || "" : url);
                            }}
                            aria-label={previewable ? t("creationResult.previewName", { name: attachment.name || t("creationResult.attachment") }) : attachment.name || t("creationResult.attachment")}
                            disabled={previewable && !url}
                        >
                            {kind === "video" ? (
                                <video src={attachment.url || ""} poster={url !== attachment.url ? url : undefined} muted playsInline preload="metadata" />
                            ) : kind === "image" ? (
                                <img src={url} alt={attachment.name || t("creationResult.attachment")} width={44} height={44} loading="lazy" />
                            ) : kind === "audio" ? (
                                <Music2 />
                            ) : (
                                <FileText />
                            )}
                            {previewable ? (
                                <span aria-hidden="true">
                                    <Maximize2 />
                                </span>
                            ) : null}
                        </button>
                    );
                })}
            </div>
            <CreationMediaPreviewModal url={previewUrl} type={previewType} onClose={() => setPreviewUrl("")} />
        </>
    );
}

function StoryboardShotResult({ result, onRetryFailure, onCreateVariant, canvasPath, canvasHandoffAvailable }: { result?: CreationMessage; onRetryFailure: () => void; onCreateVariant: () => void; canvasPath: string; canvasHandoffAvailable: boolean }) {
    const i18n = useI18n();
    const { t, number, date } = i18n;
    const [previewUrl, setPreviewUrl] = useState("");
    const [previewType, setPreviewType] = useState<"image" | "video">("image");
    const openPreview = (url: string, type: "image" | "video") => {
        setPreviewType(type);
        setPreviewUrl(url);
    };
    if (!result)
        return (
            <div className="storyboard-workbench-empty">
                <Film />
                {t("creationStoryboard.notStarted")}
            </div>
        );
    const mode = result.mode || "video";
    const status = result.status || "queued";
    const resultUrls = result.resultUrls || [];
    if (status === "pending" || status === "queued") {
        const thinking = thinkingFor(mode, t);
        return (
            <div className="storyboard-workbench-pending">
                <div className="storyboard-workbench-thinking">
                    <span className="storyboard-workbench-thinking-copy">
                        <strong>{thinking.title}</strong>
                        <span>{thinking.hint}</span>
                    </span>
                    <span className="storyboard-workbench-pipeline" aria-hidden="true">
                        {thinking.steps.map((step, index) => (
                            <em key={step} style={{ "--step": index } as CSSProperties}>
                                <i>{String(index + 1).padStart(2, "0")}</i>
                                {step}
                            </em>
                        ))}
                    </span>
                </div>
            </div>
        );
    }
    if (status === "error") return <CreationFailure item={result} onRetry={onRetryFailure} />;
    if (status === "cancelled")
        return (
            <div className="storyboard-workbench-error">
                <span>{result.content || t("creationResult.stopped")}</span>
                <button type="button" onClick={onRetryFailure}>
                    <RefreshCw />
                    {t("creationResult.retry")}
                </button>
            </div>
        );
    if (mode === "text")
        return <div className="creation-message-content storyboard-workbench-text">{result.content ? <AIMessageMarkdown isStreaming={status === "streaming"}>{result.content}</AIMessageMarkdown> : <span>{t("creationResult.working")}</span>}</div>;
    if (!resultUrls.length)
        return (
            <div className="storyboard-workbench-empty">
                <Film />
                {t("creationResult.empty")}{" "}
                <button type="button" onClick={onRetryFailure}>
                    {t("common.retry")}
                </button>
            </div>
        );
    const note = result.settings ? directorNoteFor(mode, result.settings, i18n) : "";
    return (
        <>
            {mode === "video" ? (
                <button type="button" className="creation-video-result" onClick={() => openPreview(resultUrls[0], "video")} aria-label={t("creationResult.previewVideoAria")}>
                    <video muted preload="metadata" className="size-full object-cover" src={resultUrls[0]} />
                    <span>
                        <Maximize2 />
                        {t("creationResult.previewVideo")}
                    </span>
                </button>
            ) : (
                <div className="creation-image-result-grid">
                    {resultUrls.map((url) => (
                        <button
                            key={url}
                            type="button"
                            className="creation-image-result"
                            draggable
                            onDragStart={(event) => {
                                event.dataTransfer.effectAllowed = "copy";
                                event.dataTransfer.setData("application/x-creation-image", JSON.stringify({ messageId: result.id, url }));
                            }}
                            onClick={() => openPreview(url, "image")}
                            aria-label={t("creationResult.previewImage")}
                        >
                            <img src={url} alt={t("creationResult.result")} />
                            <span>
                                <Maximize2 />
                            </span>
                        </button>
                    ))}
                </div>
            )}
            {note ? (
                <p className="storyboard-workbench-director-note">
                    <span>{t("creationStoryboard.notes")}</span>
                    {note}
                </p>
            ) : null}
            <div className="storyboard-workbench-media-meta">
                <span>{mode === "video" ? t("creationResult.videoResult") : t("creationResult.images", { count: number(resultUrls.length) })}</span>
                <button type="button" onClick={onCreateVariant}>
                    <RefreshCw />
                    {t("creationStoryboard.variant")}
                </button>
                <Link to={canvasPath}>{canvasHandoffAvailable ? t("creationResult.addCanvas") : t("creationResult.openCanvas")}</Link>
                {resultUrls.map((url, index) => (
                    <a key={`${url}-download`} href={url} download>
                        {resultUrls.length > 1 ? (
                            t("creationResult.downloadIndex", { index: number(index + 1) })
                        ) : (
                            <>
                                <Download />
                                {t("creationResult.download")}
                            </>
                        )}
                    </a>
                ))}
            </div>
            <CreationMediaPreviewModal url={previewUrl} type={previewType} onClose={() => setPreviewUrl("")} />
        </>
    );
}

function conversationPreviewMessage(conversation: CreationConversation) {
    let fallback: CreationMessage | undefined;
    for (let index = conversation.messages.length - 1; index >= 0; index -= 1) {
        const message = conversation.messages[index];
        if (!message.content.trim()) continue;
        fallback ||= message;
        if (message.role === "user") return message;
    }
    return fallback;
}

async function buildTextMessageContent(item: CreationMessage, t: ReturnType<typeof useI18n>["t"]) {
    const content = expandCreationPrompt(item.content, item.references || [], item.attachments || []);
    const attachments = item.attachments || [];
    if (!attachments.length) return content;
    const parts: AiTextContentPart[] = [{ type: "text", text: content }];
    for (const attachment of attachments) {
        if (isImageAttachment(attachment)) {
            parts.push({ type: "image_url", image_url: { url: attachment.dataUrl || attachment.url || "" } });
            continue;
        }
        const url = await creationAttachmentDataUrl(attachment, t);
        parts.push({ type: "file_url", file_url: { url, name: attachment.name || t("creationResult.attachment"), mimeType: attachment.type || "application/octet-stream" } });
    }
    return parts;
}

async function creationAttachmentDataUrl(attachment: CreationAttachment, t: ReturnType<typeof useI18n>["t"]) {
    if ((attachment.bytes || 0) > TEXT_ATTACHMENT_MAX_BYTES) throw new Error(t("miscPages.attachmentTooLarge", { name: attachment.name }));
    const attachmentUrl = attachment.url || "";
    if (attachmentUrl.startsWith("data:")) return attachmentUrl;
    const blob = attachment.storageKey ? await getMediaBlob(attachment.storageKey) : null;
    if (blob) {
        if (blob.size > TEXT_ATTACHMENT_MAX_BYTES) throw new Error(t("miscPages.attachmentTooLarge", { name: attachment.name }));
        return blobToDataUrl(blob, t);
    }
    if (/^https:\/\//i.test(attachmentUrl)) return attachmentUrl;
    throw new Error(t("miscPages.attachmentUnreadable", { name: attachment.name }));
}

function blobToDataUrl(blob: Blob, t: ReturnType<typeof useI18n>["t"]) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(reader.error || new Error(t("miscPages.attachmentReadFailed")));
        reader.readAsDataURL(blob);
    });
}

function isVideoAttachment(attachment: CreationAttachment): attachment is CreationAttachment & { url: string } {
    return creationAttachmentKind(attachment) === "video";
}

function isImageAttachment(attachment: CreationAttachment): attachment is CreationAttachment & { dataUrl: string; width?: number; height?: number } {
    return creationAttachmentKind(attachment) === "image";
}

type PersistedCreationTask = GenerationTask & { creationResultUrls?: string[]; creationError?: string };

function attachCreationTaskContexts(tasks: GenerationTask[], conversations: CreationConversation[]) {
    const contexts = new Map<string, { prompt: string; clientContext: NonNullable<GenerationTask["clientContext"]> }>();
    for (const conversation of conversations) {
        for (const [messageIndex, message] of conversation.messages.entries()) {
            if (message.role !== "assistant" || !message.taskIds?.length) continue;
            const prompt = conversation.messages[messageIndex - 1]?.role === "user" ? conversation.messages[messageIndex - 1].content : "";
            for (const [batchIndex, taskId] of message.taskIds.entries()) contexts.set(taskId, { prompt, clientContext: { conversationId: conversation.id, messageId: message.id, batchIndex, batchCount: message.taskIds.length } });
        }
    }
    return tasks.map((task) => {
        const context = contexts.get(task.id);
        return context ? { ...task, prompt: context.prompt, clientContext: context.clientContext } : task;
    });
}

async function materializeCreationTaskResults(tasks: GenerationTask[], signal: AbortSignal | undefined, t: ReturnType<typeof useI18n>["t"]): Promise<PersistedCreationTask[]> {
    return Promise.all(
        tasks.map(async (task): Promise<PersistedCreationTask> => {
            // 文本正文保存在 resultJson，不进入媒体资源化链路。
            if (task.status !== "succeeded" || !task.clientContext || task.type === "canvas_text") return task;
            try {
                const materialized = await runGenerationConsumer(signal, (managedSignal) => materializeGenerationTaskAssets(task, managedSignal));
                const creationResultUrls = generationTaskMaterializedUrls(materialized);
                return creationResultUrls.length ? { ...materialized, creationResultUrls } : materialized;
            } catch (error) {
                return { ...task, creationError: error instanceof Error ? error.message : t("miscPages.materializeFailed") };
            }
        }),
    );
}

function creationProgressPatch(tasks: Iterable<GenerationTask>): Pick<CreationMessage, "generationPhase" | "generationProgress"> {
    const active = [...tasks].filter((task) => task.status === "queued" || task.status === "running");
    const phase = active.length ? (Math.min(...active.map(generationPhase)) as GenerationPhase) : 2;
    const task = active.length === 1 ? active[0] : undefined;
    return {
        generationPhase: phase,
        generationProgress: phase === 1 && task && generationTaskShowsProgress(task) && typeof task.progress === "number" ? Math.min(99, task.progress) : undefined,
    };
}

function reconcileCreationTaskMessages(conversations: CreationConversation[], tasks: PersistedCreationTask[], t: ReturnType<typeof useI18n>["t"]) {
    let changed = false;
    const next = conversations.map((conversation) => {
        let conversationChanged = false;
        let completedAt = conversation.updatedAt;
        const messages = conversation.messages.map((message) => {
            const taskIds = new Set(message.taskIds || []);
            const matches = tasks
                .filter((task) => taskIds.has(task.id) || (task.clientContext?.conversationId === conversation.id && task.clientContext.messageId === message.id))
                .sort((left, right) => (left.clientContext?.batchIndex || 0) - (right.clientContext?.batchIndex || 0));
            if (message.role === "assistant" && message.mode === "text") {
                const recovery = recoverCreationTextTask(message, matches);
                if (!recovery) return message;
                completedAt = matches.reduce((latest, task) => (conversationTimestamp(task.updatedAt) > conversationTimestamp(latest) ? task.updatedAt : latest), completedAt);
                conversationChanged = true;
                changed = true;
                return { ...message, ...recovery };
            }
            if (message.role !== "assistant" || message.status !== "pending") return message;
            const expectedTaskCount = Math.max(0, ...matches.map((task) => task.clientContext?.batchCount || 0));
            if (!matches.length) return message;
            if ((expectedTaskCount > 0 && matches.length < expectedTaskCount) || matches.some((task) => task.status === "queued" || task.status === "running")) {
                if (expectedTaskCount > 1 && matches.length < expectedTaskCount) return message;
                const update = creationProgressPatch(matches);
                if (update.generationPhase === message.generationPhase && update.generationProgress === message.generationProgress) return message;
                conversationChanged = changed = true;
                return { ...message, ...update };
            }

            const resultUrls = Array.from(new Set(matches.filter((task) => task.status === "succeeded").flatMap(creationTaskResultUrls)));
            const failedCount = matches.filter((task) => task.status !== "succeeded" || Boolean(task.creationError)).length;
            const nextTaskIds = Array.from(new Set([...(message.taskIds || []), ...matches.map((task) => task.id)]));
            completedAt = matches.reduce((latest, task) => (conversationTimestamp(task.updatedAt) > conversationTimestamp(latest) ? task.updatedAt : latest), completedAt);
            conversationChanged = true;
            changed = true;

            if (resultUrls.length) {
                const content = message.mode === "video" ? t("miscPages.videoGenerated") : failedCount ? t("creationFeedback.partial", { success: resultUrls.length, failed: failedCount }) : t("miscPages.imageGenerated");
                return { ...message, status: "done" as const, content, resultUrls, error: undefined, taskIds: nextTaskIds };
            }
            if (matches.every((task) => task.status === "cancelled")) {
                const localOnly = matches.find(isLocalDreaminaWaitStopped);
                return { ...message, status: "cancelled" as const, content: localOnly ? localDreaminaCancellationMessage(localOnly) : t("creationResult.stopped"), error: undefined, taskIds: nextTaskIds };
            }
            const failed = matches.find((task) => task.status === "failed" || task.creationError);
            return {
                ...message,
                status: "error" as const,
                content: t("creationResult.failed"),
                error: generationErrorMessage(failed?.creationError || failed?.error || t("miscPages.resultUnavailable")),
                generationErrorCode: failed?.errorCode || classifyGenerationError(failed),
                taskBilling: failed?.billing,
                taskIds: nextTaskIds,
            };
        });
        return conversationChanged ? { ...conversation, messages, updatedAt: completedAt } : conversation;
    });
    return changed ? next : conversations;
}

function creationTaskResultUrls(task: PersistedCreationTask) {
    if (task.creationResultUrls?.length) return task.creationResultUrls;
    return [];
}

function conversationTimestamp(value: string) {
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
}

function ratioPreviewStyle(value: string) {
    const [width, height] = value.replace("x", ":").split(":").map(Number);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return { width: 14, height: 14 };
    // 画幅图形的可用空间是 20×18；同时计算宽高，避免 CSS 的 max-width/max-height 把宽银幕比例压扁。
    const scale = Math.min(20 / width, 18 / height);
    return { width: Math.max(8, Math.round(width * scale)), height: Math.max(8, Math.round(height * scale)) };
}

function isAutomaticRatio(value: string) {
    const normalized = value.trim().toLowerCase();
    return normalized === "auto" || normalized === "adaptive";
}
