import "@/styles/canvas-editor-route.css";
import "./canvas-agent-focus.css";
import { CanvasAgentHUD } from "@/components/canvas/canvas-agent-hud";
import { STARTER_HINT_EVENT, type StarterHintAction } from "@/components/canvas/canvas-node-starter-hints";
import { CanvasWorkspacePanel } from "@/components/canvas/canvas-workspace-panel";
import { CanvasStoryWelcome } from "@/components/canvas/canvas-story-welcome";
import { currentLocaleText as upstreamText } from "@/i18n/current-locale-text";
import { StoryboardAssetPickerModal } from "@/components/canvas/storyboard-asset-picker-modal";
import { CanvasCollaborationLayer } from "@/components/canvas/canvas-collaboration-layer";
import { acquireCanvasNodeEditLease } from "@/services/canvas-edit-leases";
import { productionText } from "@/i18n/production-tools";
import { findAvailableGenerationGroupPosition } from "@/lib/canvas/canvas-generation-layout";
import { bindingForConnectedNode, replaceStoryboardRowAssets, storyboardRowReferenceNodeIds } from "@/lib/canvas/canvas-storyboard-materializer";
import { normalizeStoryboardAssetBindings } from "@/lib/canvas/canvas-storyboard-assets";
import { normalizeAssetCategory as storyboardImportedCategory } from "@/lib/asset-category";
import { getResource as getStoryboardImportedResource } from "@/services/api/resources";
import { VIDEO_REFERENCE_ACTION_EVENT } from "@/lib/video-reference-validation";
import { useI18n as upstreamUseI18n } from "@/i18n/use-i18n";
import { useCanvasImageLayerMaterials } from "./use-canvas-image-layer-materials";
import { useCanvasImageLayerGroups } from "./use-canvas-image-layer-groups";
import { isCanvasNodeGenerating } from "@/lib/canvas/canvas-node-task-state";
import { buildImageToPrevisAgentPrompt, buildImageToPrevisDisplayText } from "@/lib/canvas/image-to-previs-agent";
import { CanvasAgentActivityStatus } from "@/components/canvas/canvas-agent-activity-status";
import { displayedStarterNode, useStarterSourceCatalogs } from "../showcase/starter-display-copy";
import { displayedShowcaseProjectTitle } from "../showcase/imported-project-title";
import { createCanvasStateWriter } from "@/lib/canvas/canvas-editor-state";
import { lazy, startTransition, Suspense, useCallback, useEffect, useEffectEvent, useInsertionEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, MouseEvent as ReactMouseEvent, SetStateAction } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams, useSearchParams, useNavigate } from "react-router";
import { checkpointCanvasTextModal, loadAssetsForUse, saveRemoteUserDataNow } from "@/services/user-data-sync";
import { canvasAssetHandoffIds } from "@/lib/canvas/canvas-asset-handoff";
import { selectableModelsByCapability, useConfigStore, useEffectiveConfig } from "@/stores/use-config-store";
import { uploadMediaFile } from "@/services/file-storage";
import { createCanvasGenerationLiveProjectAdapter, registerCanvasGenerationLiveProject } from "@/services/canvas-generation-consumer";
import { getActiveUserScope } from "@/lib/user-scope";
import { dramaKeys } from "@/lib/drama/query-keys";
import { resourceFileUrl, resourceIdFromStorageKey, syncResourceToArkPrivateAsset } from "@/services/api/resources";
import { uploadImage } from "@/services/image-storage";
import { imageMetadata } from "@/lib/canvas/canvas-generation-task-sync";
import { isCanvasImageSourceNode } from "@/lib/canvas/canvas-image-source";
import { getCachedResourceBlob } from "@/services/resource-blob-cache";
import copyToClipboard from "copy-to-clipboard";
import { nanoid } from "nanoid";
import { canvasAppearanceBaseTheme, canvasAppearanceForTheme, DEFAULT_CANVAS_BACKGROUND_MODE, normalizeCanvasAppearance, resolveCanvasAppearance, writeCanvasAppearanceDefault, type CanvasAppearance } from "@/lib/canvas/canvas-appearance";
import { canvasThemes, type CanvasBackgroundMode } from "@/lib/canvas-theme";
import { persistCanvasMediaPerformanceMode, readCanvasMediaPerformanceMode } from "@/lib/canvas/canvas-performance-mode";
import { summarizeCanvasContext } from "@/lib/canvas/canvas-context-summary";
import { refreshCanvasCharacterReferenceNodes } from "@/lib/canvas/canvas-character-reference";
import { useAssetStore } from "@/stores/use-asset-store";
import { flushCanvasStorePersistence, useCanvasStore } from "@/stores/canvas/use-canvas-store";
import { ensureCanvasNodeAsset } from "@/services/project-asset-sync";
import { useCanvasThemeStore, useCanvasThemeScope } from "@/stores/canvas/use-canvas-theme-store";
import { useUserStore } from "@/stores/use-user-store";
import { currentLocaleText } from "@/i18n/current-locale-text";
import { useI18n } from "@/i18n/use-i18n";
import { App, Button } from "antd";
import { ArrowLeftRight, Clapperboard, Image as ImageIcon, Layers3, Type as TypeIcon, Upload, Video as VideoIcon } from "lucide-react";
import { AppModal } from "@/components/ui/product/app-modal";
import { getNodeSpec } from "@/constant/canvas";
const CanvasConfigComposer = deferredCanvasComponent<import("react").ComponentProps<(typeof import("@/components/canvas/canvas-config-composer"))["CanvasConfigComposer"]>>(() =>
    import("@/components/canvas/canvas-config-composer").then((m) => ({ default: m.CanvasConfigComposer })),
);
const CanvasConfigNodePanel = deferredCanvasComponent<import("react").ComponentProps<(typeof import("@/components/canvas/canvas-config-node-panel"))["CanvasConfigNodePanel"]>>(() =>
    import("@/components/canvas/canvas-config-node-panel").then((m) => ({ default: m.CanvasConfigNodePanel })),
);
import { CanvasAgentBinding } from "@/components/canvas/canvas-agent-binding";
import { CanvasActiveTaskPanel } from "@/components/canvas/canvas-active-task-panel";
import { CanvasAssetTray } from "@/components/canvas/canvas-asset-tray";
import { CanvasProjectSidebar } from "@/components/canvas/canvas-project-sidebar";
const CanvasProjectAssetModal = deferredCanvasComponent<import("react").ComponentProps<(typeof import("@/components/canvas/canvas-project-asset-modal"))["CanvasProjectAssetModal"]>>(
    () => import("@/components/canvas/canvas-project-asset-modal").then((m) => ({ default: m.CanvasProjectAssetModal })),
    (props) => props.open,
);
import { CanvasCharacterReferenceNodeContent } from "@/components/canvas/canvas-character-reference-node";
const CanvasCharacterReferenceModal = deferredCanvasComponent<import("react").ComponentProps<(typeof import("@/components/canvas/canvas-character-reference-modal"))["CanvasCharacterReferenceModal"]>>(
    () => import("@/components/canvas/canvas-character-reference-modal").then((m) => ({ default: m.CanvasCharacterReferenceModal })),
    (props) => props.open,
);
import { WorkspaceState } from "@/components/layout/workspace-state";
import { resolveProjectCanvasStyle } from "@/components/canvas/canvas-style-picker-modal";
import { createStyleProfileSnapshot, resolveStyleProfile, serializeStyleProfile } from "@/lib/canvas/style-profile";
import { CanvasNodeToolbar, CanvasNodeInfoModal } from "@/components/canvas/canvas-node-toolbar";
const CanvasSubtitleDialog = deferredCanvasComponent<import("react").ComponentProps<(typeof import("@/components/canvas/canvas-subtitle-dialog"))["CanvasSubtitleDialog"]>>(
    () => import("@/components/canvas/canvas-subtitle-dialog").then((m) => ({ default: m.CanvasSubtitleDialog })),
    (props) => props.open,
);
const CanvasVideoFrameDialog = deferredCanvasComponent<import("react").ComponentProps<(typeof import("@/components/canvas/canvas-video-frame-dialog"))["CanvasVideoFrameDialog"]>>(
    () => import("@/components/canvas/canvas-video-frame-dialog").then((m) => ({ default: m.CanvasVideoFrameDialog })),
    (props) => props.open,
);
const CanvasVideoSegmentDialog = deferredCanvasComponent<import("react").ComponentProps<(typeof import("@/components/canvas/canvas-video-segment-dialog"))["CanvasVideoSegmentDialog"]>>(
    () => import("@/components/canvas/canvas-video-segment-dialog").then((m) => ({ default: m.CanvasVideoSegmentDialog })),
    (props) => props.open,
);
import { syncNodeSubtitlesToTimeline } from "@/lib/timeline/timeline-build";
import { CanvasNodeAnglePanel } from "@/components/canvas/canvas-node-angle-dialog";
import { deferredCanvasComponent } from "@/components/canvas/deferred-canvas-component";
import { CanvasNodeLightingPanel } from "@/components/canvas/canvas-node-lighting-dialog";
import { CanvasNodeSearchModal } from "@/components/canvas/canvas-node-search-modal";
import { CanvasStylePickerModal } from "@/components/canvas/canvas-style-picker-modal";
import { CanvasFileDropOverlay } from "@/components/canvas/canvas-file-drop-overlay";
const CanvasUploadModal = deferredCanvasComponent<import("react").ComponentProps<(typeof import("@/components/canvas/canvas-upload-modal"))["CanvasUploadModal"]>>(
    () => import("@/components/canvas/canvas-upload-modal").then((m) => ({ default: m.CanvasUploadModal })),
    (props) => props.open,
);
const CanvasPanoramaConfigModal = deferredCanvasComponent<import("react").ComponentProps<(typeof import("@/components/canvas/canvas-panorama-config-modal"))["CanvasPanoramaConfigModal"]>>(
    () => import("@/components/canvas/canvas-panorama-config-modal").then((m) => ({ default: m.CanvasPanoramaConfigModal })),
    (props) => props.open,
);
import { InfiniteCanvas } from "@/components/canvas/infinite-canvas";
import { Minimap } from "@/components/canvas/canvas-mini-map";
import type { CanvasNodeGenerationMode } from "@/components/canvas/canvas-node-prompt-panel";
import { CanvasToolbar } from "@/components/canvas/canvas-toolbar";
import { CanvasOnboardingTour } from "@/components/canvas/canvas-onboarding-tour";
import { CanvasInlineAuthDialog } from "@/components/canvas/canvas-inline-auth-dialog";
import { CanvasOnboardingCelebrationDialog } from "@/components/canvas/canvas-onboarding-celebration-dialog";
import { useCanvasOnboarding } from "./use-canvas-onboarding";
import { useCanvasOnboardingEntry } from "./use-canvas-onboarding-entry";
import { useWalletBalance } from "@/hooks/use-wallet-balance";
import { useCanvasCreateCommands } from "@/components/canvas/use-canvas-create-commands";
const AssetPickerModal = deferredCanvasComponent<import("react").ComponentProps<(typeof import("@/components/canvas/asset-picker-modal"))["AssetPickerModal"]>>(
    () => import("@/components/canvas/asset-picker-modal").then((m) => ({ default: m.AssetPickerModal })),
    (props) => props.open,
);
import { getProject } from "@/services/api/projects";
import { CanvasZoomControls } from "@/components/canvas/canvas-zoom-controls";
const CanvasShareModal = deferredCanvasComponent<import("react").ComponentProps<(typeof import("@/components/canvas/canvas-share-modal"))["CanvasShareModal"]>>(
    () => import("@/components/canvas/canvas-share-modal").then((m) => ({ default: m.CanvasShareModal })),
    (props) => props.open,
);
import { STORYBOARD_HEADER_HEIGHT, STORYBOARD_ROW_HEIGHT, storyboardMinNodeHeight, storyboardTableHeight } from "@/lib/canvas/canvas-storyboard-layout";
const CanvasVersionCompareModal = deferredCanvasComponent<import("react").ComponentProps<(typeof import("@/components/canvas/canvas-version-compare-modal"))["CanvasVersionCompareModal"]>>(
    () => import("@/components/canvas/canvas-version-compare-modal").then((m) => ({ default: m.CanvasVersionCompareModal })),
    (props) => props.open,
);
import { useFocusMode } from "@/hooks/use-focus-mode";
import { connectCanvasTextMention } from "@/lib/canvas/canvas-text-mention";
import { writeCanvasNodePrompt } from "@/lib/canvas/canvas-node-prompt";
import { nodeGenerationPrompt, synchronizeGenerationSpec } from "@/lib/canvas/generation-contract";
import { storyboardVideoScript } from "@/lib/canvas/canvas-storyboard-video";
import {
    applyCanvasConnectionPromptSync,
    buildCanvasAgentMentionReferences,
    canvasResourceMentionToken,
    buildCanvasNodeMentionReferenceMap,
    buildCanvasResourceReferences,
    getContextResourceNodes,
    normalizeCanvasNodeMentionTokens,
    reorderCanvasResourceConnections,
    replaceCanvasReferenceMentions,
    type CanvasResourceReference,
} from "@/lib/canvas/canvas-resource-references";
import { CanvasConnectionCreateMenu, CanvasNodePanelOverlay, type PendingConnectionCreate } from "@/components/canvas/canvas-workspace-overlays";
import { CanvasOverlayLayerContainer, CanvasOverlayLayerProvider } from "@/components/canvas/canvas-overlay-layer";
import { CanvasLeaferGraphicsLayer } from "@/components/canvas/canvas-leafer-graphics-layer";
import { CanvasFreeformEmptyState, CanvasLinkedProjectEmptyState, CanvasShortDramaGuide, CanvasStoryInputNodeContent, CanvasStylePlaceholderNodeContent } from "@/components/canvas/canvas-short-drama-entry";
import { rememberFreeformStarter, resolveCanvasEmptyStateKind } from "@/lib/canvas/canvas-starter";
import { failedImageBatchChildren, markImageBatchRetrying, reconcileImageBatchRoot, restoreUnsubmittedImageBatchChild } from "@/lib/canvas/canvas-image-batch-retry";
import { createCanvasNode, getInputSummary, isHiddenBatchChild } from "@/lib/canvas/canvas-project-domain";
import { stampCanvasNodeChanges, updateCanvasNode, updateCanvasNodes } from "@/lib/canvas/canvas-node-timestamps";
import { buildVideoRemakeDraft } from "@/lib/canvas/canvas-video-remake";
import { canvasAssetHandoffAttempt, finalizeCanvasAssetHandoff, uninsertedCanvasAssetHandoffPayloads } from "@/lib/canvas/canvas-asset-handoff";
import { captureAdoptionIdentity, reportObservedAdoption } from "@/services/adoption-observation";
import { batchSourceRestriction } from "@/lib/canvas/canvas-batch-connection";
import { deriveStoryboardPipelineProgress } from "@/lib/canvas/canvas-storyboard-progress";
import { CanvasOperationChangeToast, CanvasMergeStatusToast, CanvasUploadStatusToast } from "./canvas-project-feedback";
import { backendProviderConfig, getGenerationCount } from "@/lib/canvas/canvas-project-generation";
import { cancelGenerationTask } from "@/services/api/task-center";
import { CanvasSyncStatus } from "./canvas-sync-status";
import { CanvasVersionHistory, useCanvasVersionHistory } from "./canvas-version-history";
import { CanvasVersionPreview } from "./canvas-version-preview";
import { CanvasTopBar } from "./canvas-project-top-bar";
const LibTVImportDialog = deferredCanvasComponent<import("react").ComponentProps<(typeof import("./components/libtv-import-dialog"))["LibTVImportDialog"]>>(
    () => import("./components/libtv-import-dialog").then((m) => ({ default: m.LibTVImportDialog })),
    (props) => props.open,
);
const TapNowImportDialog = deferredCanvasComponent<import("react").ComponentProps<(typeof import("./components/tapnow-import-dialog"))["TapNowImportDialog"]>>(
    () => import("./components/tapnow-import-dialog").then((m) => ({ default: m.TapNowImportDialog })),
    (props) => props.open,
);
import { CanvasFocusModeBar } from "@/components/canvas/canvas-focus-mode-bar";
import { CanvasProjectContextMenu } from "./canvas-project-context-menu";
import { CanvasProjectMediaDialogs } from "./canvas-project-media-dialogs";
import { CanvasProjectSelectionToolbar } from "./canvas-project-selection-toolbar";
import { CanvasProjectStatusDialogs } from "./canvas-project-status-dialogs";
import { CanvasProjectWorldLayers } from "./canvas-project-world-layers";
import { CanvasNodeActionContext, type CanvasNodeActionContextValue } from "@/components/canvas/canvas-node-action-context";
import { bringCanvasNodeToFront, type CanvasNodeStackOrder } from "@/lib/canvas/canvas-node-stack-order";
const AiArtCritiqueModal = deferredCanvasComponent<import("react").ComponentProps<(typeof import("@/components/canvas/art-critique/ai-art-critique-modal"))["AiArtCritiqueModal"]>>(
    () => import("@/components/canvas/art-critique/ai-art-critique-modal").then((m) => ({ default: m.AiArtCritiqueModal })),
    (props) => props.open,
);
import { CanvasNodeGraphContext, type CanvasNodeGraphContextValue } from "@/components/canvas/canvas-node-graph-context";
import { CanvasRefreshShell } from "./canvas-refresh-shell";
import { queryGenerationTask } from "@/services/api/task-center";
import type { CanvasImageEmotionPayload } from "@/components/canvas/canvas-node-emotion-panel";
import { removeCanvasDrawing } from "@/lib/canvas/canvas-drawing-storage";
import { useCanvasConnectionController } from "./use-canvas-connection-controller";
import { useCanvasOperationHistory } from "./use-canvas-operation-history";
import { useCanvasAssistantVisibility } from "./use-canvas-assistant-visibility";
import { useCanvasActiveTasks } from "./use-canvas-active-tasks";
import { useCanvasStyleWorkflow } from "./use-canvas-style-workflow";
import { useCanvasDirector } from "./use-canvas-director";
import { directorCardSize } from "@/lib/canvas/director/director-card-size";
import { directorConnectionTargets, ensureDirectorVideoTarget } from "@/lib/canvas/director/director-downstream";
import { directorSceneForShot, directorBoundReferenceIds, rememberDirectorActors } from "@/lib/canvas/director/director-shot-state";
import { useCanvasGeneration } from "./use-canvas-generation";
import { useCanvasGenerationBatches } from "./use-canvas-generation-batches";
import { useCanvasBatchTable } from "./use-canvas-batch-table";
import { useCanvasGenerationExecutor, type CanvasNodeGenerationOptions } from "./use-canvas-generation-executor";
import { useCanvasGenerationRetry } from "./use-canvas-generation-retry";
import { useCanvasHistory } from "./use-canvas-history";
import { useCanvasKeyboard } from "./use-canvas-keyboard";
import { useCanvasMediaTools } from "./use-canvas-media-tools";
import { useCanvasNodeEditor } from "./use-canvas-node-editor";
import { useCanvasNodeOperations } from "./use-canvas-node-operations";
import { useCanvasProjectLifecycle } from "./use-canvas-project-lifecycle";
import { useCanvasTextCheckpoints } from "./use-canvas-text-checkpoints";
import { useCanvasRenderModel } from "./use-canvas-render-model";
import { useCanvasSelectionController } from "./use-canvas-selection-controller";
import { useCanvasShortDrama } from "./use-canvas-short-drama";
import { useCanvasStoryboard } from "./use-canvas-storyboard";
import { useCanvasUpload } from "./use-canvas-upload";
import { CanvasUploadSourceModal } from "@/components/canvas/canvas-upload-source-modal";
import { useCanvasTimelineAssetInsert } from "./use-canvas-timeline-asset-insert";
import { useCanvasViewportController } from "./use-canvas-viewport-controller";
import {
    CanvasNodeType,
    type CanvasAssistantSession,
    type CanvasConnection,
    type CanvasFolderStyle,
    type CanvasFolderTheme,
    type CanvasNodeData,
    type CanvasNodeMetadata,
    type CanvasMediaPerformanceMode,
    type StoryboardColumn,
    type StoryboardShotCount,
    type StoryboardShotDuration,
    type CanvasWorkflowKind,
    type CanvasWorkspaceMode,
    type CanvasToolMode,
    type ContextMenuState,
    type Position,
    type ViewportTransform,
} from "@/types/canvas";
import type { ReferenceImage } from "@/types/image";
import { ART_CRITIQUE_NODE_TYPE } from "@/lib/art-critique/contracts";

const CanvasDirectorWorkbench = lazy(() => import("@/components/canvas/director/world-engine-workbench").then((module) => ({ default: module.WorldEngineWorkbench })));
const CanvasEmotionWorkspace = deferredCanvasComponent<import("react").ComponentProps<(typeof import("@/components/canvas/canvas-emotion-workspace"))["CanvasEmotionWorkspace"]>>(() =>
    import("@/components/canvas/canvas-emotion-workspace").then((m) => ({ default: m.CanvasEmotionWorkspace })),
);
const CanvasNodePromptPanel = deferredCanvasComponent<import("react").ComponentProps<(typeof import("@/components/canvas/canvas-node-prompt-panel"))["CanvasNodePromptPanel"]>>(() =>
    import("@/components/canvas/canvas-node-prompt-panel").then((m) => ({ default: m.CanvasNodePromptPanel })),
);
const CanvasScriptNodeContent = deferredCanvasComponent<import("react").ComponentProps<(typeof import("@/components/canvas/canvas-script-node"))["CanvasScriptNodeContent"]>>(() =>
    import("@/components/canvas/canvas-script-node").then((m) => ({ default: m.CanvasScriptNodeContent })),
);
const CanvasScriptEditor = deferredCanvasComponent<import("react").ComponentProps<(typeof import("@/components/canvas/canvas-script-editor"))["CanvasScriptEditor"]>>(
    () => import("@/components/canvas/canvas-script-editor").then((m) => ({ default: m.CanvasScriptEditor })),
    (props) => props.open,
);
const CanvasBatchTableNodeContent = deferredCanvasComponent<import("react").ComponentProps<(typeof import("@/components/canvas/canvas-batch-table-node"))["CanvasBatchTableNodeContent"]>>(() =>
    import("@/components/canvas/canvas-batch-table-node").then((m) => ({ default: m.CanvasBatchTableNodeContent })),
);
const CanvasDirectorNodePanel = deferredCanvasComponent<import("react").ComponentProps<(typeof import("@/components/canvas/director/world-engine-node-panel"))["WorldEngineNodePanel"]>>(() =>
    import("@/components/canvas/director/world-engine-node-panel").then((m) => ({ default: m.WorldEngineNodePanel })),
);
const CanvasDirectorTemplateModal = deferredCanvasComponent<import("react").ComponentProps<(typeof import("@/components/canvas/director/canvas-director-template-modal"))["CanvasDirectorTemplateModal"]>>(
    () => import("@/components/canvas/director/canvas-director-template-modal").then((m) => ({ default: m.CanvasDirectorTemplateModal })),
    (props) => props.open,
);
const CanvasDrawingEditorModal = lazy(() => import("@/components/canvas/canvas-drawing-editor-modal").then((module) => ({ default: module.CanvasDrawingEditorModal })));
const CanvasAssetView = lazy(() => import("@/components/canvas/canvas-asset-view"));
const CanvasTimelineDialog = lazy(() => import("@/components/canvas/canvas-timeline-dialog").then((module) => ({ default: module.CanvasTimelineDialog })));
const CanvasTextEditorModal = lazy(() => import("@/components/canvas/canvas-text-editor-modal").then((module) => ({ default: module.CanvasTextEditorModal })));

const NODE_STATUS_SUCCESS = "success" as const;
const EMPTY_RESOURCE_REFERENCES: CanvasResourceReference[] = [];

async function copyImageToSystemClipboard(source: string, storageKey?: string) {
    if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) throw new Error(currentLocaleText("canvasExtra.canvas.imageCopyUnsupported"));
    if (typeof window !== "undefined") window.focus();

    const fetchPNG = async (): Promise<Blob> => {
        let sourceBlob: Blob | null = null;
        if (storageKey) {
            sourceBlob = await getCachedResourceBlob(storageKey).catch(() => null);
        }
        if (!sourceBlob) {
            const response = await fetch(source);
            if (!response.ok) throw new Error(currentLocaleText("canvasExtra.canvas.imageReadFailed", { status: response.status }));
            sourceBlob = await response.blob();
        }
        return sourceBlob.type === "image/png" ? sourceBlob : await convertClipboardImageToPNG(sourceBlob);
    };

    // 优先尝试将 Promise 直接传给 ClipboardItem（现代浏览器标准），在用户激活手势内立即声明写入，
    // 避免因 fetch / 格式转换耗时导致手势过期或窗口失焦抛出 "Document is not focused" 错误。
    try {
        const item = new ClipboardItem({ "image/png": fetchPNG() });
        await navigator.clipboard.write([item]);
        return;
    } catch {
        // 部分浏览器环境不支持延迟 Promise，回退到先取 Blob 再写入
    }

    const blob = await fetchPNG();
    if (typeof window !== "undefined") window.focus();
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}

async function convertClipboardImageToPNG(blob: Blob) {
    if (typeof createImageBitmap !== "function") throw new Error(currentLocaleText("canvasExtra.canvas.imageConversionUnsupported"));
    const bitmap = await createImageBitmap(blob);
    try {
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error(currentLocaleText("canvasExtra.canvas.imageProcessUnsupported"));
        context.drawImage(bitmap, 0, 0);
        return await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => (value ? resolve(value) : reject(new Error(currentLocaleText("canvasExtra.canvas.imageFormatConversionFailed")))), "image/png"));
    } finally {
        bitmap.close();
    }
}

function visibleGenerationBatch(node: CanvasNodeData) {
    const batches = node.metadata?.generationBatches || [];
    for (let index = batches.length - 1; index >= 0; index -= 1) {
        if (batches[index].status === "queued" || batches[index].status === "running") return batches[index];
    }
    return batches.at(-1);
}

export default function CanvasPage() {
    upstreamUseI18n();
    useCanvasThemeScope();
    const { id: routeProjectId = "" } = useParams<{ id: string }>();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return <CanvasRefreshShell />;

    // 画布内切换 /canvas/A -> /canvas/B 时重建编辑器，避免 A 的节点、历史、定时保存等页面状态串入 B。
    return <InfiniteCanvasPage key={routeProjectId} />;
}

function InfiniteCanvasPage() {
    upstreamUseI18n();
    // 命令式确认必须走 App.useApp().modal；静态 Modal.confirm 拿不到主题和 App 上下文。
    const { message, modal } = App.useApp();
    const { t, locale } = useI18n();
    const queryClient = useQueryClient();
    const params = useParams<{ id: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
    const [workspaceOpen, setWorkspaceOpen] = useState(false);
    const [plainCanvasId, setPlainCanvasId] = useState<string>();
    const assetViewRequested = searchParams.get("view") === "assets";
    const changeAssetView = (assets: boolean) =>
        setSearchParams(
            (current) => {
                const next = new URLSearchParams(current);
                if (assets) next.set("view", "assets");
                else next.delete("view");
                return next;
            },
            { replace: true },
        );
    const navigate = useNavigate();
    const projectId = params.id || "";
    const { active: tourActive, close: closeTour } = useCanvasOnboardingEntry(projectId);
    useEffect(() => {
        if (!tourActive) return;
        // Warm only the two tools needed by the guide while the welcome is open.
        // A failed warmup is retried by the normal lazy boundary when opened.
        void Promise.all([CanvasNodePromptPanel.preload(), CanvasScriptNodeContent.preload()]).catch(() => undefined);
    }, [tourActive]);
    const canvasStorageScope = getActiveUserScope();
    const containerRef = useRef<HTMLDivElement>(null);
    const didInitialCenterRef = useRef(false);
    const toolbarHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const assetHandoffRef = useRef("");

    const user = useUserStore((state) => state.user);
    const { usableMicrocredits } = useWalletBalance(user?.id, Boolean(user?.id));
    const remainingCredits = usableMicrocredits !== null ? Math.floor(usableMicrocredits / 1_000_000) : null;
    const initialBalanceRef = useRef<number | null>(null);
    useEffect(() => {
        if (initialBalanceRef.current === null && remainingCredits !== null) {
            initialBalanceRef.current = remainingCredits;
        }
    }, [remainingCredits]);

    const [celebrationOpen, setCelebrationOpen] = useState(false);
    const [inlineAuthOpen, setInlineAuthOpen] = useState(false);
    const [inlineAuthProceed, setInlineAuthProceed] = useState<(() => Promise<void>) | null>(null);

    const config = useConfigStore((state) => state.config);
    const effectiveConfig = useEffectiveConfig();
    const isAiConfigReady = useConfigStore((state) => state.isAiConfigReady);
    const assets = useAssetStore((state) => state.assets);
    const assetsHydrated = useAssetStore((state) => state.hydrated);
    const cleanupAssetImages = useAssetStore((state) => state.cleanupImages);
    const colorTheme = useCanvasThemeStore((state) => state.theme);
    const setTheme = useCanvasThemeStore((state) => state.setTheme);
    const theme = canvasThemes[colorTheme];
    const defaultDrawingEngine = useUserStore((state) => state.drawingEngine.defaultEngine);
    const shortDramaEnabled = useUserStore((state) => state.features.shortDramaEnabled);
    const directorOnboardingScope = useUserStore((state) => state.user?.id?.trim() || "");
    // Signed-out canvases are local-only; a cloud save status would only read as an error.
    const signedIn = useUserStore((state) => Boolean(state.user?.id));
    const nodesRef = useRef<CanvasNodeData[]>([]);
    const [storyboardAssetTarget, setStoryboardAssetTarget] = useState<{ nodeId: string; rowId: string } | null>(null);
    const openStoryboardAssetPicker = useCallback(
        async (nodeId: string, rowId: string) => {
            const scope = getActiveUserScope();
            try {
                if (signedIn) await acquireCanvasNodeEditLease(projectId, nodeId);
                if (getActiveUserScope() === scope) setStoryboardAssetTarget({ nodeId, rowId });
            } catch {
                message.warning(productionText(locale, 23));
            }
        },
        [signedIn, projectId, message, locale],
    );
    const [nodes, setNodesState] = useState<CanvasNodeData[]>([]);
    const setNodes = useMemo(() => createCanvasStateWriter(nodesRef, setNodesState, stampCanvasNodeChanges), []);
    const [nodeStackOrder, setNodeStackOrder] = useState<CanvasNodeStackOrder>([]);
    const bringNodeToFront = useCallback((nodeId: string) => {
        setNodeStackOrder((current) => bringCanvasNodeToFront(current, nodeId));
    }, []);
    const [connections, setConnectionsState] = useState<CanvasConnection[]>([]);
    const connectionsRef = useRef<CanvasConnection[]>([]);
    const setConnections = useMemo(() => createCanvasStateWriter(connectionsRef, setConnectionsState), []);
    const [chatSessions, setChatSessions] = useState<CanvasAssistantSession[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [viewport, setViewport] = useState<ViewportTransform>({ x: 0, y: 0, k: 1 });
    const [gestureWindow, setGestureWindow] = useState<{ base: ViewportTransform; current: ViewportTransform } | null>(null);
    const gestureWindowRef = useRef(gestureWindow);
    const previewRenderWindow = useCallback(
        (next: ViewportTransform) => {
            const previous = gestureWindowRef.current;
            const last = previous?.base === viewport ? previous.current : viewport;
            // Compare camera centres in screen pixels. The render model keeps at least 128px overscan.
            const dx = (last.x / last.k - next.x / next.k) * next.k;
            const dy = (last.y / last.k - next.y / next.k) * next.k;
            if (Math.max(Math.abs(dx), Math.abs(dy)) < 120 && Math.abs(Math.log(next.k / last.k)) < 0.12) return;
            const window = { base: viewport, current: next };
            gestureWindowRef.current = window;
            setGestureWindow(window);
        },
        [viewport],
    );

    const [size, setSize] = useState({ width: 1200, height: 720 });
    const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
    const starterSelectionRef = useRef<string | null>(null);
    useEffect(() => {
        const starterNode = nodes.find((node) => node.metadata?.modelStarterKey === "shot-breakdown" && node.type === CanvasNodeType.Text) || nodes.find((node) => node.metadata?.modelStarterKey);
        if (starterNode && starterSelectionRef.current !== projectId) {
            starterSelectionRef.current = projectId || null;
            setSelectedNodeIds(new Set([starterNode.id]));
            setDialogNodeId(starterNode.id);
        }
    }, [nodes, projectId]);
    const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
    const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
    const [agentPrefillPrompt, setAgentPrefillPrompt] = useState("");
    const [agentPrefillRequest, setAgentPrefillRequest] = useState<import("@/components/canvas/canvas-cloud-agent-panel").CanvasAgentPrefillRequest | null>(null);
    const [isMiniMapOpen, setIsMiniMapOpen] = useState(false);
    const [canvasAppearance, setCanvasAppearance] = useState<CanvasAppearance>(() => canvasAppearanceForTheme(colorTheme));
    const [backgroundMode, setBackgroundMode] = useState<CanvasBackgroundMode>(DEFAULT_CANVAS_BACKGROUND_MODE);
    const [showImageInfo, setShowImageInfo] = useState(false);
    const [canvasTool, setCanvasTool] = useState<CanvasToolMode>("box-select");
    const [mediaPerformanceMode, setMediaPerformanceMode] = useState<CanvasMediaPerformanceMode>(readCanvasMediaPerformanceMode);
    const [projectLoaded, setProjectLoaded] = useState(false);
    const flushTextEdits = useCanvasTextCheckpoints();
    useEffect(() => {
        if (projectLoaded) window.dispatchEvent(new Event("dramacanva:canvas-ready"));
    }, [projectLoaded]);
    const workspaceMode: CanvasWorkspaceMode = "professional";
    const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [tapNowImportOpen, setTapNowImportOpen] = useState(false);
    const [nodeSearchOpen, setNodeSearchOpen] = useState(false);
    const [toolbarNodeId, setToolbarNodeId] = useState<string | null>(null);
    const [arkPrivateAssetUploadNodeId, setArkPrivateAssetUploadNodeId] = useState<string | null>(null);
    const [nodeImageSettingsOpen, setNodeImageSettingsOpen] = useState(false);
    const [dialogNodeId, setDialogNodeId] = useState<string | null>(null);
    const [textEditorNodeId, setTextEditorNodeId] = useState<string | null>(null);
    const [characterReferenceNodeId, setCharacterReferenceNodeId] = useState<string | null>(null);
    const [drawingNodeId, setDrawingNodeId] = useState<string | null>(null);
    const [stylePickerOpen, setStylePickerOpen] = useState(false);
    const [hideNodeConnections, setHideNodeConnections] = useState(false);
    // 新建导演台镜头必须先选模板：null 表示未在选择中，undefined position 表示用画布中心。
    const [directorTemplateRequest, setDirectorTemplateRequest] = useState<{ position?: Position } | null>(null);
    const [infoNodeId, setInfoNodeId] = useState<string | null>(null);
    const [subtitleNodeId, setSubtitleNodeId] = useState<string | null>(null);
    const [timelineNodeId, setTimelineNodeId] = useState<string | null>(null);
    const [superResolveNodeId, setSuperResolveNodeId] = useState<string | null>(null);
    const [previewNodeId, setPreviewNodeId] = useState<string | null>(null);
    const [scriptEditorNodeId, setScriptEditorNodeId] = useState<string | null>(null);
    const [artCritiqueNodeId, setArtCritiqueNodeId] = useState<string | null>(null);
    const artCritiqueRunningRef = useRef(false);
    const [artCritiqueStartRequest, setArtCritiqueStartRequest] = useState<{ nodeId: string; id: string; restart: boolean } | null>(null);
    const [scriptScrollTopById, setScriptScrollTopById] = useState<Record<string, number>>({});
    const [directorNodeId, setDirectorNodeId] = useState<string | null>(null);
    const [closedDirector, setClosedDirector] = useState<{ projectId: string; nodeId: string; sceneId: string } | null>(null);
    const [versionCompareRootId, setVersionCompareRootId] = useState<string | null>(null);
    const [libTVImportOpen, setLibTVImportOpen] = useState(false);
    const [titleEditing, setTitleEditing] = useState(false);
    const [titleDraft, setTitleDraft] = useState("");
    const [shortcutRequestNonce, setShortcutRequestNonce] = useState(0);
    const { assistantOpen, closeAgent, openAgent: openAssistant } = useCanvasAssistantVisibility();
    const agentMentionReferences = useMemo(() => buildCanvasAgentMentionReferences(nodes), [nodes]);

    const { tasks: activeTasks } = useCanvasActiveTasks(projectId, projectLoaded);
    const { focusMode, enterFocusMode, exitFocusMode, toggleFocusMode } = useFocusMode();
    const assetView = assetViewRequested && !focusMode;
    const [focusDockRevealed, setFocusDockRevealed] = useState(false);

    useEffect(() => {
        persistCanvasMediaPerformanceMode(mediaPerformanceMode);
    }, [mediaPerformanceMode]);

    useEffect(() => {
        didInitialCenterRef.current = false;
        setNodeStackOrder([]);
    }, [projectId]);

    useEffect(() => {
        const nodeIds = new Set(nodes.map((node) => node.id));
        setNodeStackOrder((current) => {
            const next = current.filter((nodeId) => nodeIds.has(nodeId));
            return next.length === current.length ? current : next;
        });
    }, [nodes]);

    const chatSessionsRef = useRef(chatSessions);
    const activeChatIdRef = useRef(activeChatId);
    const selectedNodeIdsRef = useRef(selectedNodeIds);
    const viewportRef = useRef(viewport);
    const generateNodeRef = useRef<((nodeId: string, mode: CanvasNodeGenerationMode, prompt: string, options?: CanvasNodeGenerationOptions) => Promise<void>) | null>(null);

    useEffect(() => {
        if (!projectId) return;
        return registerCanvasGenerationLiveProject({
            scope: canvasStorageScope,
            projectId,
            adapter: createCanvasGenerationLiveProjectAdapter({ nodesRef, connectionsRef, chatSessionsRef, activeChatIdRef, setNodes, setConnections, setChatSessions, setActiveChatId }),
        });
    }, [canvasStorageScope, projectId]);

    const resolvedCanvasAppearance = useMemo(() => resolveCanvasAppearance(canvasAppearance, colorTheme), [canvasAppearance, colorTheme]);
    const applyCanvasAppearance = useCallback(
        (next: CanvasAppearance) => {
            const fallback = canvasAppearanceBaseTheme(next, colorTheme);
            const normalized = normalizeCanvasAppearance(next, fallback);
            setCanvasAppearance(normalized);
            setTheme(canvasAppearanceBaseTheme(normalized, fallback));
        },
        [colorTheme, setTheme],
    );
    const saveCanvasAppearanceDefault = useCallback(
        (next: CanvasAppearance) => {
            writeCanvasAppearanceDefault({ appearance: next, backgroundMode });
            message.success(currentLocaleText("canvasExtra.canvas.saveAppearanceDefault"));
        },
        [backgroundMode, message],
    );

    const { getHistoryCleanupContext, historyPausedRef, historyState, redoCanvas, resetHistory, undoCanvas } = useCanvasHistory({
        projectLoaded,
        nodes,
        connections,
        chatSessions,
        activeChatId,
        canvasAppearance,
        backgroundMode,
        showImageInfo,
        setNodes,
        setConnections,
        setChatSessions,
        setActiveChatId,
        applyCanvasAppearance,
        setBackgroundMode,
        setShowImageInfo,
        setSelectedNodeIds,
        setSelectedConnectionId,
        setContextMenu,
    });

    const cleanupCanvasFiles = useCallback(
        (extra?: unknown) => {
            cleanupAssetImages({ extra, ...getHistoryCleanupContext() });
        },
        [cleanupAssetImages, getHistoryCleanupContext],
    );

    const {
        loadError,
        retryLoad,
        addedSkills,
        agentCreatedNodes,
        clearCanvasFiles,
        createAndOpenProject,
        currentProject,
        deleteCurrentProject,
        renameCurrentProject,
        reloadLatestCanvasProject,
        restoreCanvasProjectVersion,
        saveCanvasProject,
        persistLocalEdits,
        updateProject,
    } = useCanvasProjectLifecycle({
        flushTextEdits,
        projectId,
        projectLoaded,
        nodes,
        connections,
        chatSessions,
        activeChatId,
        canvasAppearance,
        backgroundMode,
        showImageInfo,
        viewport,
        nodesRef,
        connectionsRef,
        chatSessionsRef,
        activeChatIdRef,
        viewportRef,
        historyPausedRef,
        setNodes,
        setConnections,
        setChatSessions,
        setActiveChatId,
        setCanvasAppearance,
        setBackgroundMode,
        setShowImageInfo,
        setViewport,
        setProjectLoaded,
        resetHistory,
        cleanupAssetImages,
        cleanupCanvasFiles,
    });

    const versions = useCanvasVersionHistory(projectId, restoreCanvasProjectVersion);
    const openVersions = () => {
        closeAgent();
        setVersionCompareRootId(null);
        versions.show();
    };
    const openAgent = useCallback(() => {
        versions.close();
        openAssistant();
    }, [versions.close, openAssistant]);

    const sendSelectionToAgent = useCallback(
        (nodeId?: string) => {
            const ids = nodeId ? [nodeId] : Array.from(selectedNodeIdsRef.current);
            const references = ids.map((id) => agentMentionReferences.find((reference) => reference.nodeId === id)).filter((reference): reference is CanvasResourceReference => Boolean(reference));
            if (!references.length) return;
            setAgentPrefillPrompt(`${references.map(canvasResourceMentionToken).join(" ")} `);
            openAgent();
            setContextMenu(null);
        },
        [agentMentionReferences, openAgent],
    );
    const applyLibTVImport = useCallback(
        async (importedNodes: CanvasNodeData[], importedConnections: CanvasConnection[]) => {
            const previousNodes = nodesRef.current;
            const previousConnections = connectionsRef.current;
            const nextNodes = [...nodesRef.current, ...importedNodes];
            const nextConnections = [...connectionsRef.current, ...importedConnections];
            nodesRef.current = nextNodes;
            connectionsRef.current = nextConnections;
            setNodes(nextNodes);
            setConnections(nextConnections);
            const saved = await saveCanvasProject({ requireRemote: false });
            if (!saved) {
                nodesRef.current = previousNodes;
                connectionsRef.current = previousConnections;
                setNodes(previousNodes);
                setConnections(previousConnections);
                throw new Error(currentLocaleText("canvasExtra.canvas.libtvImportSaveFailed"));
            }
        },
        [saveCanvasProject, setConnections, setNodes],
    );
    const applyTapNowImport = useCallback(
        async (importedNodes: CanvasNodeData[], importedConnections: CanvasConnection[]) => {
            const previousNodes = nodesRef.current;
            const previousConnections = connectionsRef.current;
            const nextNodes = [...nodesRef.current, ...importedNodes];
            const nextConnections = [...connectionsRef.current, ...importedConnections];
            nodesRef.current = nextNodes;
            connectionsRef.current = nextConnections;
            setNodes(nextNodes);
            setConnections(nextConnections);
            const saved = await saveCanvasProject({ requireRemote: false });
            if (!saved) {
                nodesRef.current = previousNodes;
                connectionsRef.current = previousConnections;
                setNodes(previousNodes);
                setConnections(previousConnections);
                throw new Error(currentLocaleText("canvasExtra.canvas.tapnowImportSaveFailed"));
            }
        },
        [saveCanvasProject, setConnections, setNodes],
    );
    const linkedProjectId = shortDramaEnabled ? currentProject?.projectId || "" : "";
    const projectionEpisode = searchParams.get("dramaEpisode");
    const projectionSegment = searchParams.get("dramaSegment");
    const projectionShot = searchParams.get("dramaShot");

    const linkedProjectQuery = useQuery({ queryKey: ["project", linkedProjectId], queryFn: () => getProject(linkedProjectId), enabled: Boolean(linkedProjectId) });
    const refetchLinkedProject = linkedProjectQuery.refetch;
    const archiveNodesToLinkedFolder = useCallback(
        (folder: CanvasNodeData, droppedNodes: CanvasNodeData[]) => {
            const folderId = folder.metadata?.folder?.assetFolderId;
            const domainProjectId = folder.metadata?.folder?.projectId || linkedProjectId;
            if (!folderId || !domainProjectId || !droppedNodes.length) return;
            void Promise.all(droppedNodes.map((node) => ensureCanvasNodeAsset({ canvasId: projectId, domainProjectId, folderId, node, source: "canvas-manual" })))
                .then((results) => {
                    const archivedByNodeId = new Map(droppedNodes.map((node, index) => [node.id, { assetId: results[index].assetId, content: node.metadata?.content, previousAssetId: node.metadata?.assetId }]));
                    setNodes((current) =>
                        current.map((node) => {
                            const archived = archivedByNodeId.get(node.id);
                            if (!archived || node.metadata?.content !== archived.content || node.metadata?.assetId !== archived.previousAssetId) return node;
                            return { ...node, metadata: { ...node.metadata, assetId: archived.assetId } };
                        }),
                    );
                    void refetchLinkedProject();
                    message.success(currentLocaleText("canvasExtra.canvas.archivedToFolder", { title: folder.title }));
                })
                .catch((error) => message.error(error instanceof Error ? error.message : currentLocaleText("canvasExtra.canvas.archiveAssetFailed")));
        },
        [linkedProjectId, message, projectId, refetchLinkedProject, setNodes],
    );
    useEffect(() => {
        if (!projectLoaded || !linkedProjectQuery.data) return;
        setNodes((current) => refreshCanvasCharacterReferenceNodes(current, linkedProjectQuery.data.assets));
    }, [linkedProjectQuery.data, projectLoaded, setNodes]);
    const canvasContext = useMemo(() => summarizeCanvasContext(nodes, selectedNodeIds, linkedProjectQuery.data?.units), [linkedProjectQuery.data?.units, nodes, selectedNodeIds]);
    // 扩展节点（对比/图表/调色）要读自己的上游才能渲染，经 Context 下发；
    // 取上游复用 canvas-resource-references 的实现，别在这里另写一份。必须 memo——
    // 每帧新对象会让所有节点跟着重渲染，错题本里多条崩溃都出在画布高频更新。
    const nodeGraphContext = useMemo<CanvasNodeGraphContextValue>(() => ({ getUpstreamNodes: (nodeId: string) => getContextResourceNodes(nodeId, nodes, connections) }), [connections, nodes]);

    const { applyGenerationTaskResult, bindGenerationTask, finishGenerationRequest, openNodeTaskDetails, runningNodeId, setRunningNodeId, setTaskDetail, startGenerationRequest, taskDetail, taskDetailLoading, taskDetailLogs } = useCanvasGeneration({
        projectId,
        domainProjectId: linkedProjectId,
        projectLoaded,
        nodes,
        nodesRef,
        setNodes,
    });

    const cancelCanvasTask = useCallback(
        (task: import("@/services/api/task-center").GenerationTask) => {
            modal.confirm({
                title: currentLocaleText("canvasExtra.canvas.cancelTaskTitle"),
                content: currentLocaleText("canvasExtra.canvas.cancelTaskContent"),
                okText: currentLocaleText("canvasExtra.canvas.cancelTaskOk"),
                okButtonProps: { danger: true },
                cancelText: currentLocaleText("canvasExtra.canvas.cancelTaskCancel"),
                onOk: async () => {
                    try {
                        const next = await cancelGenerationTask(task.id);
                        const node = nodesRef.current.find((item) => item.metadata?.taskId === task.id);
                        if (node) bindGenerationTask(node.id, next);
                        setTaskDetail((current) => (current?.id === task.id ? next : current));
                        await queryClient.invalidateQueries({ queryKey: ["canvas-active-tasks", projectId] });
                        message.success(currentLocaleText("canvasExtra.canvas.taskCancelled"));
                    } catch (error) {
                        message.error(error instanceof Error ? error.message : currentLocaleText("canvasExtra.canvas.cancelTaskFailed"));
                    }
                },
            });
        },
        [bindGenerationTask, message, modal, nodesRef, projectId, queryClient, setTaskDetail],
    );

    useEffect(() => {
        const sessionId = searchParams.get("conversation");
        if (!projectLoaded || !sessionId) return;
        if (!chatSessions.some((session) => session.id === sessionId)) {
            message.warning(currentLocaleText("canvasExtra.canvas.sessionNotFound"));
        } else {
            activeChatIdRef.current = sessionId;
            setActiveChatId(sessionId);
            openAgent();
        }
        const next = new URLSearchParams(searchParams);
        next.delete("conversation");
        setSearchParams(next, { replace: true });
    }, [projectLoaded, chatSessions, searchParams, setSearchParams, openAgent, message]);

    useEffect(() => {
        if (!projectLoaded || searchParams.get("agent") !== "1") return;
        openAgent();
        const next = new URLSearchParams(searchParams);
        next.delete("agent");
        setSearchParams(next, { replace: true });
    }, [projectLoaded, searchParams, setSearchParams, openAgent]);

    // 沉浸专注进入时收起智能体与小地图、重置 Dock 唤出态；仅响应「进入」瞬间，避免关闭专注内主动唤出的面板。
    const prevFocusModeRef = useRef(focusMode);
    useEffect(() => {
        const enteredFocus = focusMode && !prevFocusModeRef.current;
        prevFocusModeRef.current = focusMode;
        if (!enteredFocus) return;
        closeAgent();
        setIsMiniMapOpen(false);
        setFocusDockRevealed(false);
    }, [closeAgent, focusMode]);

    useEffect(() => {
        if (!dialogNodeId) setNodeImageSettingsOpen(false);
    }, [dialogNodeId]);

    useLayoutEffect(() => {
        chatSessionsRef.current = chatSessions;
        activeChatIdRef.current = activeChatId;
        selectedNodeIdsRef.current = selectedNodeIds;
        viewportRef.current = viewport;
    }, [activeChatId, chatSessions, nodes, connections, selectedNodeIds, viewport]);

    useEffect(() => {
        if (!projectLoaded) return;
        const el = containerRef.current;
        if (!el) return;

        const updateSize = () => {
            const rect = el.getBoundingClientRect();
            setSize((current) => (current.width === rect.width && current.height === rect.height ? current : { width: rect.width, height: rect.height }));
            if (!didInitialCenterRef.current) {
                didInitialCenterRef.current = true;
                const current = viewportRef.current;
                if (current.x === 0 && current.y === 0 && current.k === 1) {
                    const centered = { x: rect.width / 2, y: rect.height / 2, k: 1 };
                    viewportRef.current = centered;
                    setViewport(centered);
                }
            }
        };

        updateSize();
        const resizeObserver = new ResizeObserver(updateSize);
        resizeObserver.observe(el);
        return () => resizeObserver.disconnect();
    }, [projectLoaded]);

    const {
        moveViewportTo,
        revealCreatedNode,
        fitCanvasContent,
        fitCanvasSelection,
        focusCanvasImageNode,
        focusCanvasNode,
        getCanvasCenter,
        handleCanvasDoubleClick,
        handleViewportChange,
        handleViewportPreviewChange,
        previewViewport,
        screenToCanvas,
        setZoomScale,
        zoomCanvasIn,
        zoomCanvasOut,
        zoomToActualSize,
    } = useCanvasViewportController({
        agentCreatedNodes,
        containerRef,
        size,
        viewportRef,
        nodesRef,
        selectedNodeIdsRef,
        setViewport,
        setSelectedNodeIds,
        setSelectedConnectionId,
        setContextMenu,
        setDialogNodeId,
        setToolbarNodeId,
    });
    const previewCanvasGesture = useCallback(
        (next: ViewportTransform) => {
            handleViewportPreviewChange(next);
            previewRenderWindow(next);
        },
        [handleViewportPreviewChange, previewRenderWindow],
    );

    useEffect(() => {
        if (!projectLoaded || !size.width || !size.height) return;
        const restoreCheckoutNode = () => {
            const nodeId = sessionStorage.getItem("checkout-focus-node");
            if (!nodeId || !nodesRef.current.some((node) => node.id === nodeId)) return;
            sessionStorage.removeItem("checkout-focus-node");
            focusCanvasNode(nodeId);
        };
        restoreCheckoutNode();
        window.addEventListener("checkout:credited", restoreCheckoutNode);
        return () => window.removeEventListener("checkout:credited", restoreCheckoutNode);
    }, [projectLoaded, size.width, size.height, focusCanvasNode, nodesRef]);

    useEffect(() => {
        const project = linkedProjectQuery.data?.project;
        const preset = resolveProjectCanvasStyle(project?.stylePresetId, project?.styleProfileJson);
        if (!projectLoaded || !preset) return;
        const profile = resolveStyleProfile(project?.stylePresetId, project?.styleProfileJson, preset.profile || createStyleProfileSnapshot(preset));
        if (!profile) return;
        const current = nodesRef.current.find((node) => node.type === CanvasNodeType.Text && node.metadata?.workflowKind === "styleboard");
        const nextMetadata = {
            content: profile.prompt,
            prompt: profile.prompt,
            status: NODE_STATUS_SUCCESS,
            workflowKind: "styleboard" as const,
            workflowTitle: currentLocaleText("canvasExtra.canvas.projectStyle"),
            workflowDescription: profile.description,
            stylePresetId: profile.presetId,
            styleProfileJson: serializeStyleProfile(profile),
            fontSize: 14,
            locked: true,
        };
        if (current) {
            if (current.metadata?.stylePresetId === profile.presetId && current.metadata?.content === profile.prompt && current.metadata?.styleProfileJson === nextMetadata.styleProfileJson && current.metadata?.locked) return;
            setNodes((nodes) => nodes.map((node) => (node.id === current.id ? { ...node, title: currentLocaleText("canvasExtra.canvas.projectStyleTitle", { title: profile.title }), metadata: { ...node.metadata, ...nextMetadata } } : node)));
            return;
        }
        const node = createCanvasNode(CanvasNodeType.Text, getCanvasCenter(), nextMetadata);
        node.title = currentLocaleText("canvasExtra.canvas.projectStyleTitle", { title: profile.title });
        node.width = 420;
        node.height = 240;
        setNodes((nodes) => [...nodes, node]);
    }, [getCanvasCenter, linkedProjectQuery.data?.project, projectLoaded, setNodes]);

    const {
        assetPickerOpen,
        assetPickerNodeId,
        assetPickerFromUpload,
        assetPickerMediaKind,
        uploadSourceOpen,
        chooseComputerUpload,
        chooseLibraryUpload,
        closeUploadModal,
        closeAssetPicker,
        createVideoNodeFromBlob,
        createAssetPayloadNode,
        createImageAssetNode,
        fileDropActive,
        handleAssetsInsert,
        handleDrop,
        handleFileDragEnter,
        handleFileDragLeave,
        handleFileDragOver,
        handleImageInputChange,
        handleProjectAssetsInsert,
        handleProjectChapterInsert,
        handleUploadFiles,
        handleUploadReferenceFiles,
        handleUploadRequest,
        imageInputRef,
        openAssetsAtPosition,
        pasteAssistantImage,
        pasteSystemClipboard,
        replaceNodeMedia,
        startUploadStatus,
        uploadModalOpen,
        uploadTimelineMedia,
        uploadStatus,
    } = useCanvasUpload({
        canvasId: projectId,
        domainProjectId: linkedProjectId,
        nodesRef,
        selectedNodeIdsRef,
        connectionsRef,
        setConnections,
        getCanvasCenter,
        screenToCanvas,
        setNodes,
        setSelectedNodeIds,
        setSelectedConnectionId,
        setContextMenu,
        setDialogNodeId,
    });
    useEffect(() => {
        const listener = (event: Event) => {
            const action = (event as CustomEvent<StarterHintAction>).detail;
            const node = nodesRef.current.find((node) => node.id === action.nodeId);
            if (!node?.metadata?.modelStarterKey) return;
            setSelectedNodeIds(new Set([node.id]));
            setDialogNodeId(node.id);
            if (action.upload && node.metadata.modelStarterKey === "shot-breakdown") handleUploadRequest(node.id);
        };
        window.addEventListener(STARTER_HINT_EVENT, listener);
        return () => window.removeEventListener(STARTER_HINT_EVENT, listener);
    }, [handleUploadRequest]);
    const replaceCanvasNodeMedia = useCallback((node: CanvasNodeData) => handleUploadRequest(node.id), [handleUploadRequest]);
    const {
        timelineAddNodeRef,
        timelineMediaAddRef,
        assetInsertScope,
        projectAssetScope,
        projectAssetOpen,
        projectAssetInitialCategory,
        projectAssetInitialFolderId,
        projectAssetInsertPosition,
        handleLibraryAssetsInsert,
        handleTimelineProjectAssetsInsert,
        openProjectAssets,
        openCanvasAssetLibrary,
        openTimelineAssetLibrary,
        closeProjectAssets,
    } = useCanvasTimelineAssetInsert({
        linkedProjectId,
        refetchLinkedProject,
        handleAssetsInsert,
        handleProjectAssetsInsert,
        openAssetsAtPosition,
    });

    useEffect(() => {
        if (!projectLoaded || searchParams.get("mode") !== "handoff") return;
        void loadAssetsForUse(canvasAssetHandoffIds(searchParams)).catch((error) => message.error(error instanceof Error ? error.message : currentLocaleText("canvasExtra.canvas.handoffReadFailed")));
    }, [projectLoaded, searchParams, message]);

    useEffect(() => {
        if (!projectLoaded || !assetsHydrated || searchParams.get("mode") !== "handoff") return;
        const attempt = canvasAssetHandoffAttempt(assets, searchParams);
        const { assetIds, payloads } = attempt;
        if (!assetIds.length) return;
        const assetReadiness = assetIds
            .map((assetId) => {
                const asset = assets.find((candidate) => candidate.id === assetId);
                return `${assetId}:${asset?.kind || "missing"}`;
            })
            .join("|");
        const handoffKey = `${projectId}:${assetReadiness}`;
        if (assetHandoffRef.current === handoffKey) return;
        assetHandoffRef.current = handoffKey;

        if (attempt.kind === "retry") return;
        const pendingPayloads = uninsertedCanvasAssetHandoffPayloads(nodesRef.current, payloads);
        const adoptionIdentity = captureAdoptionIdentity();
        const handoffScope = getActiveUserScope();
        const taskByAsset = new Map(assets.map((asset) => [asset.id, asset.metadata?.taskId]));
        const persistHandoff = async (createdNodes: CanvasNodeData[]) => {
            const finalized = await finalizeCanvasAssetHandoff({
                searchParams,
                currentNodes: nodesRef.current,
                createdNodes,
                persist: async (nextNodes) => {
                    if (getActiveUserScope() !== handoffScope) throw new DOMException(currentLocaleText("runtimeSafety.accountChanged"), "AbortError");
                    nodesRef.current = nextNodes;
                    updateProject(projectId, { nodes: nextNodes });
                    await flushCanvasStorePersistence();
                    if (getActiveUserScope() !== handoffScope) throw new DOMException(currentLocaleText("runtimeSafety.accountChanged"), "AbortError");
                    if (signedIn && !(await saveCanvasProject({ requireRemote: true }))) {
                        throw new Error(currentLocaleText("canvasExtra.lifecycle.saveFailed"));
                    }
                    if (getActiveUserScope() !== handoffScope) throw new DOMException(currentLocaleText("runtimeSafety.accountChanged"), "AbortError");
                },
            });
            void reportObservedAdoption(
                adoptionIdentity,
                createdNodes.map((node) => (typeof node.metadata?.assetId === "string" ? taskByAsset.get(node.metadata.assetId) : undefined)),
                "canvas_handoff",
            );
            setSearchParams(finalized.searchParams, { replace: true });
        };
        const insertion = pendingPayloads.length ? handleProjectAssetsInsert(pendingPayloads) : Promise.resolve([] as CanvasNodeData[]);
        void insertion.then(persistHandoff).catch(() => {
            assetHandoffRef.current = "";
        });
    }, [assets, assetsHydrated, handleProjectAssetsInsert, message, nodesRef, projectId, projectLoaded, saveCanvasProject, searchParams, setSearchParams, signedIn, updateProject]);

    const {
        angleNodeId,
        lightingNodeId,
        emotionNodeId,
        annotationNodeId,
        createImageReversePromptNodes,
        openPortraitTextureEditor,
        cropImageNode,
        cropNodeId,
        closeFrameDialog,
        closeSegmentDialog,
        extractVideoDepth,
        extractAudioFromVideo,
        extractVideoFrames,
        extractingVideoFramesNodeId,
        frameDialogNodeId,
        generateAngleNode,
        generateLightingNode,
        openPanoramaConfig,
        createPanoramaViewerWithConfig,
        addPanoramaCaptureNode,
        panoramaConfigNodeId,
        setPanoramaConfigNodeId,
        generateEmotionNode,
        handleSegmentConfirm,
        maskEditImageNode,
        maskEditNodeId,
        mergeSelectedVideos,
        mergeVideosByIds,
        mergeVideoProgress,
        saveAnnotatedImageNode,
        segmentDialogMode,
        segmentDialogNodeId,
        segmentRunningMode,
        setFrameDialogNodeId,
        setSegmentDialogNodeId,
        setAngleNodeId,
        setLightingNodeId,
        setEmotionNodeId,
        setAnnotationNodeId,
        setCropNodeId,
        setMaskEditNodeId,
        setUpscaleNodeId,
        splitImageNode,
        openVideoFrameExtractor,
        openVideoSegmentExtractor,
        upscaleImageNode,
        decomposeImageLayers,
        layerDecompositionNodeId,
        openLayerDecomposition,
        activeLayerGroupIds,
        setLayerDecompositionNodeId,
        upscaleNodeId,
    } = useCanvasMediaTools({
        projectId,
        domainProjectId: linkedProjectId,
        nodesRef,
        connectionsRef,
        selectedNodeIdsRef,
        setNodes,
        setConnections,
        setSelectedNodeIds,
        setSelectedConnectionId,
        setDialogNodeId,
        setContextMenu,
        setHoveredNodeId,
        setToolbarNodeId,
        setRunningNodeId,
        startUploadStatus,
        startGenerationRequest,
        finishGenerationRequest,
        bindGenerationTask,
        applyGenerationTaskResult,
    });

    const layerDecompositionNode = nodes.find((node) => node.id === layerDecompositionNodeId) || null;
    useCanvasImageLayerGroups({ projectId, enabled: projectLoaded, nodes, nodesRef, setNodes, runningNodeId, activeLayerGroupIds });
    const extractLayerMaterials = useCanvasImageLayerMaterials({ projectId, domainProjectId: currentProject?.projectId, enabled: projectLoaded, nodes, nodesRef, setNodes, setConnections });

    const handleNodesDeleted = useCallback(
        (removedIds: Set<string>, nextNodes: CanvasNodeData[], removedNodes: CanvasNodeData[]) => {
            const clearDeletedId = (current: string | null) => (current && removedIds.has(current) ? null : current);
            setHoveredNodeId(clearDeletedId);
            setToolbarNodeId(clearDeletedId);
            setDialogNodeId(clearDeletedId);
            setTextEditorNodeId(clearDeletedId);
            setCharacterReferenceNodeId(clearDeletedId);
            setDrawingNodeId(clearDeletedId);
            setInfoNodeId(clearDeletedId);
            setSubtitleNodeId(clearDeletedId);
            setFrameDialogNodeId(clearDeletedId);
            setSegmentDialogNodeId(clearDeletedId);
            setCropNodeId(clearDeletedId);
            setMaskEditNodeId(clearDeletedId);
            setAnnotationNodeId(clearDeletedId);
            setUpscaleNodeId(clearDeletedId);
            setAngleNodeId(clearDeletedId);
            setLightingNodeId(clearDeletedId);
            setEmotionNodeId(clearDeletedId);
            setSuperResolveNodeId(clearDeletedId);
            setPreviewNodeId(clearDeletedId);
            setRunningNodeId(clearDeletedId);
            setScriptEditorNodeId(clearDeletedId);
            setArtCritiqueNodeId(clearDeletedId);
            setDirectorNodeId(clearDeletedId);
            const project = useCanvasStore.getState().projects.find((item) => item.id === projectId);
            if (
                project?.directorScenes.some(
                    (scene) =>
                        scene.objects.some((object) => object.characterBinding && removedIds.has(object.characterBinding.referenceNodeId)) ||
                        scene.shots.some((shot) => [shot.previewNodeId, shot.depthNodeId, shot.normalNodeId].some((id) => id && removedIds.has(id))),
                )
            ) {
                updateProject(projectId, {
                    directorScenes: project.directorScenes.map((scene) => ({
                        ...scene,
                        objects: scene.objects.map((object) => (object.characterBinding && removedIds.has(object.characterBinding.referenceNodeId) ? { ...object, characterBinding: undefined, sourceNodeId: undefined } : object)),
                        shots: scene.shots.map((shot) => ({
                            ...shot,
                            previewNodeId: shot.previewNodeId && !removedIds.has(shot.previewNodeId) ? shot.previewNodeId : undefined,
                            depthNodeId: shot.depthNodeId && !removedIds.has(shot.depthNodeId) ? shot.depthNodeId : undefined,
                            normalNodeId: shot.normalNodeId && !removedIds.has(shot.normalNodeId) ? shot.normalNodeId : undefined,
                        })),
                    })),
                });
            }
            setVersionCompareRootId(clearDeletedId);
            setScriptScrollTopById((current) => Object.fromEntries(Object.entries(current).filter(([id]) => !removedIds.has(id))));
            setContextMenu((current) => (current?.type === "node" && removedIds.has(current.nodeId) ? null : current));
            const removedDrawingIds = removedNodes.flatMap((node) => (node.type === CanvasNodeType.Drawing && node.metadata?.drawingId ? [node.metadata.drawingId] : []));
            if (removedDrawingIds.length) {
                void Promise.all(removedDrawingIds.map((drawingId) => removeCanvasDrawing(projectId, drawingId))).catch(() => message.warning(currentLocaleText("canvasExtra.canvas.drawingCacheCleanFailed")));
            }
            cleanupCanvasFiles({ projectId, nodes: nextNodes, chatSessions });
        },
        [
            chatSessions,
            cleanupCanvasFiles,
            message,
            projectId,
            updateProject,
            setAngleNodeId,
            setAnnotationNodeId,
            setArtCritiqueNodeId,
            setCropNodeId,
            setEmotionNodeId,
            setFrameDialogNodeId,
            setLightingNodeId,
            setMaskEditNodeId,
            setSegmentDialogNodeId,
            setUpscaleNodeId,
            setRunningNodeId,
        ],
    );

    const {
        alignSelectedNodes,
        autoArrangeCanvasNodes,
        arrangeSelectedNodes,
        spreadSelectedNodes,
        copyNodesToClipboard,
        copySelectedNodes,
        createFolder,
        createNode,
        createReferenceGroup,
        createStoryboardGroup,
        deleteConnection,
        deleteNodes,
        duplicateNode,
        hasCopiedNodes,
        pasteCopiedNodes,
        restoreCopiedNodesFromText,
        releaseCopiedNodesPastePriority,
        setPrimaryVersion,
        shouldPreferCopiedNodes,
        toggleNodeLocked,
    } = useCanvasNodeOperations({
        projectId,
        defaultDrawingEngine,
        nodesRef,
        connectionsRef,
        selectedNodeIdsRef,
        getCanvasCenter,
        revealCreatedNode,
        setNodes,
        setConnections,
        setSelectedNodeIds,
        setSelectedConnectionId,
        setContextMenu,
        setDialogNodeId,
        onNodesDeleted: handleNodesDeleted,
    });

    const handleReplaceNodeReference = useCallback(
        (targetNodeId: string, oldReference: { id: string; nodeId?: string; label?: string; title?: string }, sourceNodeId: string) => {
            const sourceNode = nodesRef.current.find((n) => n.id === sourceNodeId);
            if (!sourceNode || sourceNode.id === oldReference.nodeId) return;

            const previousNodes = nodesRef.current;
            const previousConnections = connectionsRef.current;

            const configNodeId = previousConnections.find((c) => c.fromNodeId === targetNodeId && previousNodes.find((n) => n.id === c.toNodeId)?.type === CanvasNodeType.Config)?.toNodeId;
            const receiverId = configNodeId || targetNodeId;

            let rewired = false;
            const nextConnections = previousConnections.map((c) => {
                if (!rewired && c.fromNodeId === oldReference.nodeId && (c.toNodeId === targetNodeId || c.toNodeId === configNodeId)) {
                    rewired = true;
                    return { ...c, fromNodeId: sourceNodeId };
                }
                return c;
            });

            if (!rewired) {
                nextConnections.push({
                    id: nanoid(),
                    fromNodeId: sourceNodeId,
                    toNodeId: receiverId,
                });
            }

            const nextReferencesMap = buildCanvasNodeMentionReferenceMap(previousNodes, nextConnections, previousNodes);
            const targetNextReferences = nextReferencesMap.get(targetNodeId) || [];
            const newRef = targetNextReferences.find((r) => r.nodeId === sourceNodeId);

            const targetNode = previousNodes.find((n) => n.id === targetNodeId);
            let nextNodes = previousNodes;
            if (targetNode && newRef) {
                const currentPrompt = targetNode.metadata?.composerContent ?? targetNode.metadata?.prompt ?? "";
                const replacementToken = `@${newRef.label}`;
                const updatedPrompt = replaceCanvasReferenceMentions(currentPrompt, oldReference, replacementToken, sourceNode.title ? sourceNode.title : newRef.label);

                nextNodes = previousNodes.map((n) => (n.id === targetNodeId ? writeCanvasNodePrompt(n, updatedPrompt) : n));
            }

            nodesRef.current = nextNodes;
            connectionsRef.current = nextConnections;
            setNodes(nextNodes);
            setConnections(nextConnections);
            message.success(
                currentLocaleText("canvasExtra.canvas.referenceReplacedDetail", { old: oldReference.label || currentLocaleText("canvasExtra.canvas.referenceImage"), next: sourceNode.title || currentLocaleText("canvasExtra.canvas.newImage") }),
            );
        },
        [connectionsRef, message, nodesRef, setConnections, setNodes],
    );

    const handleReplaceNodeReferenceFiles = useCallback(
        (_targetNodeId: string, oldReference: { id: string; nodeId?: string; label?: string; title?: string }, files: File[]) => {
            const file = files.find((f) => f.type.startsWith("image/"));
            if (!file || !oldReference.nodeId) return;
            void replaceNodeMedia(oldReference.nodeId, file).then((success: boolean) => {
                if (success) {
                    message.success(currentLocaleText("canvasExtra.canvas.refReplaced"));
                }
            });
        },
        [message, replaceNodeMedia],
    );

    const {
        cancelPendingConnectionCreate,
        closeConnectionCreateMenu,
        openTourConnectionCreateMenu,
        connectionTargetAnchorRatio,
        connectionTargetNodeId,
        connectionApproach,
        connectionReplaceHover,
        connectingParams,
        createConnectedNode,
        getConnectionCreateDisabledReason,
        handleConnectStart,
        handleConnectDrop,
        handleBatchConnectionTargetClick,
        batchConnectionPreview,
        beginBatchConnectionMode,
        startBatchConnection,
        mouseWorld,
        pendingConnectionCreate,
        setConnecting,
    } = useCanvasConnectionController({
        projectId,
        config: effectiveConfig,
        defaultDrawingEngine,
        nodesRef,
        connectionsRef,
        viewportRef,
        scriptScrollTopById,
        screenToCanvas,
        revealCreatedNode,
        setNodes,
        setConnections,
        setSelectedNodeIds,
        setSelectedConnectionId,
        setContextMenu,
        setDialogNodeId,
        setDrawingNodeId,
        onReplaceReference: handleReplaceNodeReference,
    });

    const batchSourceNodeIds = useMemo(() => nodes.filter((node) => selectedNodeIds.has(node.id) && !batchSourceRestriction(node)).map((node) => node.id), [nodes, selectedNodeIds]);

    const handleCanvasSelectionStart = useCallback(() => {
        setContextMenu(null);
    }, []);

    const handleNodeInteractionStart = useCallback((selectionModifier: boolean) => {
        setContextMenu(null);
        setHoveredNodeId(null);
        setToolbarNodeId(null);
        if (selectionModifier) setDialogNodeId(null);
    }, []);

    const handleSelectedNodeClick = useCallback(
        (node: CanvasNodeData) => {
            // Selection is transient, but the LibTV-style paint order survives
            // deselection so a clicked lower node stays above its neighbours.
            if (node.type !== CanvasNodeType.Frame) bringNodeToFront(node.id);
            if (node.type === CanvasNodeType.Drawing) {
                setDialogNodeId(null);
                setDrawingNodeId(node.id);
            } else if (node.type === CanvasNodeType.Script) {
                setDialogNodeId(null);
            } else if (node.type === CanvasNodeType.Text) {
                setDialogNodeId(node.id);
            } else if (node.type === CanvasNodeType.Frame) {
                setDialogNodeId((current) => (current === node.id ? current : null));
            } else if (node.type === ART_CRITIQUE_NODE_TYPE) {
                setDialogNodeId(null);
                setArtCritiqueNodeId(node.id);
            } else if (node.type === CanvasNodeType.Panorama) {
                // 全景节点是纯查看器，没有可编辑提示词，不弹提示词面板。
                setDialogNodeId(null);
            } else {
                // 选择参考媒体时保留当前工作流配置面板，避免点击图片后配置“返回/消失”。
                // 没有工作流配置面板时，媒体节点仍按原逻辑打开自己的面板。
                setDialogNodeId((current) => {
                    const currentNode = current ? nodesRef.current.find((item) => item.id === current) : undefined;
                    return currentNode?.type === CanvasNodeType.Config ? current : node.id;
                });
            }
        },
        [bringNodeToFront, nodesRef],
    );

    const handleNodeBringToFront = useCallback(
        (nodeId: string) => {
            const node = nodesRef.current.find((item) => item.id === nodeId);
            if (node && node.type !== CanvasNodeType.Frame) bringNodeToFront(nodeId);
        },
        [bringNodeToFront, nodesRef],
    );

    const handleNodeDragEnd = useCallback(
        (nodeId: string) => {
            const node = nodesRef.current.find((item) => item.id === nodeId);
            if (!node || node.type === CanvasNodeType.Script || node.type === CanvasNodeType.Drawing || node.type === CanvasNodeType.Panorama || node.type === ART_CRITIQUE_NODE_TYPE) {
                setDialogNodeId(null);
                return;
            }
            // A drag selects a new node even though it is not a click. Keep the
            // generation editor bound to the node most recently moved so a stale
            // panel from the previous node cannot reappear after mouse-up.
            setDialogNodeId(node.id);
        },
        [nodesRef],
    );

    const handleCanvasDeselect = useCallback(() => {
        setContextMenu(null);
        setHoveredNodeId(null);
        setToolbarNodeId(null);
        setDialogNodeId(null);
    }, []);

    const { cancelSelectionBox, deselectCanvas, dragPreview, frameDropTargetId, handleCanvasMouseDown, handleNodeMouseDown, isNodeDragging, nodeDraggingRef, selectionBoundsElementRef, selectionBox } = useCanvasSelectionController({
        containerRef,
        nodesRef,
        viewportRef,
        selectedNodeIdsRef,
        historyPausedRef,
        screenToCanvas,
        setNodes,
        setSelectedNodeIds,
        setSelectedConnectionId,
        cancelPendingConnectionCreate,
        onCanvasSelectionStart: handleCanvasSelectionStart,
        onNodeInteractionStart: handleNodeInteractionStart,
        onNodeBringToFront: handleNodeBringToFront,
        onNodeClick: handleSelectedNodeClick,
        onNodeDragEnd: handleNodeDragEnd,
        onBatchConnectionTarget: handleBatchConnectionTargetClick,
        onLinkedFolderDrop: archiveNodesToLinkedFolder,
        onDeselect: handleCanvasDeselect,
    });

    const keepNodeToolbar = useCallback(
        (nodeId: string) => {
            if (nodeDraggingRef.current || nodeImageSettingsOpen) return;
            if (toolbarHideTimerRef.current) {
                clearTimeout(toolbarHideTimerRef.current);
                toolbarHideTimerRef.current = null;
            }
            setToolbarNodeId(nodeId);
        },
        [nodeImageSettingsOpen],
    );

    const hideNodeToolbar = useCallback(() => {
        if (toolbarHideTimerRef.current) clearTimeout(toolbarHideTimerRef.current);
        toolbarHideTimerRef.current = setTimeout(() => {
            setToolbarNodeId(null);
            toolbarHideTimerRef.current = null;
        }, 120);
    }, []);

    const {
        collapsingBatchIds,
        downloadNodeImage,
        downloadNodesMedia,
        handleConfigNodeChange,
        handleFolderStyleChange,
        handleFolderThemeChange,
        handleFontSizeChange,
        handleNodeContentChange,
        handleNodePromptChange,
        handleNodeResize,
        handleNodeTitleChange,
        openingBatchIds,
        saveNodeAsset,
        setBatchPrimary,
        toggleBatchExpanded,
        toggleFrameCollapsed,
        toggleNodeFreeResize,
    } = useCanvasNodeEditor({
        canvasId: projectId,
        canvasTitle: currentProject?.title || t("canvasExtra.canvas.unnamedCanvas"),
        config: effectiveConfig,
        domainProjectId: linkedProjectId,
        nodesRef,
        setNodes,
        setSelectedNodeIds,
        setSelectedConnectionId,
        setDialogNodeId,
        setToolbarNodeId,
        setHoveredNodeId,
    });

    const handleRemoveNodeReference = useCallback(
        (targetNodeId: string, reference: CanvasResourceReference) => {
            const referenceNodeId = reference.nodeId;
            if (!referenceNodeId) return;
            // 生成节点可能通过配置节点接收参考，只移除参考来源边，保留目标到配置节点的主链。
            const previousNodes = nodesRef.current;
            const previousConnections = connectionsRef.current;
            const configNodeId = previousConnections.find((connection) => {
                if (connection.fromNodeId !== targetNodeId) return false;
                return previousNodes.find((node) => node.id === connection.toNodeId)?.type === CanvasNodeType.Config;
            })?.toNodeId;
            const removedConnectionIds = new Set(
                previousConnections
                    .filter(
                        (connection) =>
                            (connection.fromNodeId === referenceNodeId || (connection.fromHandleId?.startsWith("row:") && `${connection.fromNodeId}:${connection.fromHandleId}` === referenceNodeId)) &&
                            (connection.toNodeId === targetNodeId || connection.toNodeId === configNodeId),
                    )
                    .map((connection) => connection.id),
            );
            if (!removedConnectionIds.size) return;
            const nextConnections = previousConnections.filter((connection) => !removedConnectionIds.has(connection.id));
            const nextNodes = applyCanvasConnectionPromptSync(previousNodes, previousConnections, previousNodes, nextConnections);
            if (nextNodes !== previousNodes) {
                nodesRef.current = nextNodes;
                setNodes(nextNodes);
            }
            connectionsRef.current = nextConnections;
            setConnections(nextConnections);
            setSelectedConnectionId((current) => (current && removedConnectionIds.has(current) ? null : current));
        },
        [connectionsRef, nodesRef, setConnections, setNodes, setSelectedConnectionId],
    );

    const handleReorderNodeReferences = useCallback(
        (targetNodeId: string, orderedNodeIds: string[]) => {
            const previousNodes = nodesRef.current;
            const previousConnections = connectionsRef.current;
            const nextConnections = reorderCanvasResourceConnections(targetNodeId, orderedNodeIds, previousNodes, previousConnections);
            if (nextConnections === previousConnections) return;
            const nextNodes = applyCanvasConnectionPromptSync(previousNodes, previousConnections, previousNodes, nextConnections);
            if (nextNodes !== previousNodes) {
                nodesRef.current = nextNodes;
                setNodes(nextNodes);
            }
            connectionsRef.current = nextConnections;
            setConnections(nextConnections);
        },
        [connectionsRef, nodesRef, setConnections, setNodes],
    );

    const handleProjectFolderInsert = useCallback(
        (folderId: string) => {
            const folder = linkedProjectQuery.data?.assetFolders.find((item) => item.id === folderId);
            if (!folder || !linkedProjectId) throw new Error(currentLocaleText("canvasExtra.canvas.folderMissing"));
            const style: CanvasFolderStyle = folder.style === "stacked" || folder.style === "midnight" || folder.style === "paper" || folder.style === "cinema" || folder.style === "compact" ? folder.style : "glass";
            const theme: CanvasFolderTheme = folder.theme === "obsidian" || folder.theme === "ember" || folder.theme === "pearl" ? folder.theme : "aurora";
            createFolder(projectAssetInsertPosition, { id: folder.id, projectId: linkedProjectId, title: folder.name, style, theme, createdAt: folder.createdAt });
        },
        [createFolder, linkedProjectId, linkedProjectQuery.data?.assetFolders, projectAssetInsertPosition],
    );

    const handleFrameToggle = useCallback(
        (nodeId: string) => {
            const node = nodesRef.current.find((item) => item.id === nodeId);
            const linkedFolderId = node?.metadata?.folder?.assetFolderId;
            if (linkedFolderId) {
                openProjectAssets("all", node ? { x: node.position.x + node.width + 40, y: node.position.y } : undefined, "canvas", linkedFolderId);
                return;
            }
            toggleFrameCollapsed(nodeId);
        },
        [nodesRef, openProjectAssets, toggleFrameCollapsed],
    );

    const linkedFolderPreviewNodesById = useMemo(() => {
        const result = new Map<string, CanvasNodeData[]>();
        const localById = new Map(assets.map((asset) => [asset.id, asset]));
        for (const asset of linkedProjectQuery.data?.assets || []) {
            if (!asset.folderId) continue;
            const local = localById.get(asset.id);
            const characterCover = asset.character?.representations.find((item) => item.role === "turnaround_sheet") || asset.character?.representations.find((item) => item.role === "primary") || asset.character?.representations[0];
            const type = asset.category === "character" || asset.mediaType === "image" ? CanvasNodeType.Image : asset.mediaType === "video" ? CanvasNodeType.Video : asset.mediaType === "audio" ? CanvasNodeType.Audio : CanvasNodeType.Text;
            const remoteResourceId = resourceIdFromStorageKey(asset.storageKey);
            const content = characterCover
                ? resourceFileUrl(characterCover.resourceId)
                : local?.kind === "image"
                  ? local.data.dataUrl || local.coverUrl
                  : local?.kind === "video" || local?.kind === "audio"
                    ? local.data.url
                    : local?.kind === "text"
                      ? local.data.content
                      : remoteResourceId
                        ? resourceFileUrl(remoteResourceId)
                        : asset.previewText || "";
            const preview: CanvasNodeData = { id: asset.id, type, title: asset.title, position: { x: 0, y: 0 }, width: 240, height: 160, metadata: { assetId: asset.id, content } };
            const current = result.get(asset.folderId) || [];
            current.push(preview);
            result.set(asset.folderId, current);
        }
        return result;
    }, [assets, linkedProjectQuery.data?.assets]);

    useEffect(() => {
        const folders = linkedProjectQuery.data?.assetFolders;
        if (!folders?.length) return;
        const byId = new Map(folders.map((folder) => [folder.id, folder]));
        setNodes((current) => {
            let changed = false;
            const next = current.map((node) => {
                const folderId = node.metadata?.folder?.assetFolderId;
                const folder = folderId ? byId.get(folderId) : undefined;
                if (!folder) return node;
                const style: CanvasFolderStyle = folder.style === "stacked" || folder.style === "midnight" || folder.style === "paper" || folder.style === "cinema" || folder.style === "compact" ? folder.style : "glass";
                const theme: CanvasFolderTheme = folder.theme === "obsidian" || folder.theme === "ember" || folder.theme === "pearl" ? folder.theme : "aurora";
                if (node.title === folder.name && node.metadata?.folder?.style === style && node.metadata?.folder?.theme === theme) return node;
                changed = true;
                return { ...node, title: folder.name, metadata: { ...node.metadata, folder: { ...node.metadata!.folder!, style, theme, themeCover: undefined } } };
            });
            return changed ? next : current;
        });
    }, [linkedProjectQuery.data?.assetFolders, setNodes]);

    const {
        activeDirectorScene,
        activeNodeId,
        activeScriptNode,
        activeStylePresetId,
        angleNode,
        lightingNode,
        emotionNode,
        annotationNode,
        batchChildCountById,
        batchMotionById,
        canvasImageNodes,
        configInputsById,
        connectionLayerBounds,
        contextMenuNode,
        cropNode,
        displayConnections,
        frameChildrenById,
        imageAssets,
        infoNode,
        maskEditNode,
        mentionReferencesByNodeId,
        nodeById,
        nodeRenderLODById,
        previewNode,
        reduceMediaEffects,
        relatedHighlight,
        resourceReferenceByNodeId,
        selectedNodeBounds,
        selectedVideoNodes,
        skillMentionReferences,
        superResolveNode,
        toolbarNode,
        upscaleNode,
        versionCompareNodes,
        visibleNodes,
    } = useCanvasRenderModel({
        nodes,
        connections,
        assets,
        viewport: gestureWindow?.base === viewport ? gestureWindow.current : viewport,
        viewportSize: size,
        mediaPerformanceMode,
        selectedNodeIds,
        hoveredNodeId,
        dragPreview,
        collapsingBatchIds,
        addedSkills,
        directorScenes: currentProject?.directorScenes,
        infoNodeId,
        cropNodeId,
        maskEditNodeId,
        annotationNodeId,
        splitNodeId: null,
        upscaleNodeId,
        superResolveNodeId,
        angleNodeId,
        lightingNodeId,
        emotionNodeId,
        previewNodeId,
        contextMenu,
        versionCompareRootId,
        directorNodeId,
        scriptEditorNodeId,
        dialogNodeId,
    });
    useStarterSourceCatalogs(currentProject?.importSource);
    const displayedNodes = useMemo(() => visibleNodes.map((node) => displayedStarterNode(node, locale)), [visibleNodes, locale, t]);
    useEffect(() => {
        setNodes((current) => {
            let changed = false;
            const next = current.map((node) => {
                const references = mentionReferencesByNodeId.get(node.id);
                const savedPrompt = nodeGenerationPrompt(node);
                if (!references?.length || !savedPrompt?.includes("@[node:")) return node;
                const normalizedPrompt = normalizeCanvasNodeMentionTokens(savedPrompt, references);
                if (normalizedPrompt === savedPrompt) return node;
                changed = true;
                return writeCanvasNodePrompt(node, normalizedPrompt, { clearPromptTemplate: false });
            });
            return changed ? next : current;
        });
    }, [mentionReferencesByNodeId, setNodes]);
    const dialogNode = dialogNodeId ? nodeById.get(dialogNodeId) || null : null;
    // dragPreview is published on the same pointer-down frame as isNodeDragging.
    // Treat either signal as moving so floating editors disappear before the
    // first preview transform is painted and never affect drag layout.
    const isCanvasNodeMoving = isNodeDragging || Boolean(dragPreview?.nodeIds.size);
    const subtitleNode = subtitleNodeId ? nodeById.get(subtitleNodeId) || null : null;
    const timelineNode = timelineNodeId ? nodeById.get(timelineNodeId) || null : null;
    const frameNode = frameDialogNodeId ? nodeById.get(frameDialogNodeId) || null : null;
    const segmentNode = segmentDialogNodeId ? nodeById.get(segmentDialogNodeId) || null : null;
    const textEditorNode = textEditorNodeId ? nodeById.get(textEditorNodeId) || null : null;
    const characterReferenceNode = characterReferenceNodeId ? nodeById.get(characterReferenceNodeId) || null : null;
    const drawingNode = drawingNodeId ? nodeById.get(drawingNodeId) || null : null;
    const artCritiqueNode = artCritiqueNodeId ? nodeById.get(artCritiqueNodeId) || null : null;
    const artCritiqueInputs = artCritiqueNode
        ? connections
              .filter((connection) => connection.toNodeId === artCritiqueNode.id)
              .sort((left, right) => left.id.localeCompare(right.id))
              .map((connection) => nodeById.get(connection.fromNodeId))
              .filter((node): node is CanvasNodeData => Boolean(node))
        : [];
    const pendingConnectionSourceNode = pendingConnectionCreate?.connection.handleType === "source" ? nodeById.get(pendingConnectionCreate.connection.nodeId) : null;
    const canCreateDrawingFromConnection = !pendingConnectionCreate?.batchSourceNodeIds?.length && pendingConnectionSourceNode?.type === CanvasNodeType.Image && Boolean(pendingConnectionSourceNode.metadata?.content);

    const openTextNodeEditor = useCallback((node: CanvasNodeData) => {
        if (node.type !== CanvasNodeType.Text) return;
        setSelectedNodeIds(new Set([node.id]));
        setSelectedConnectionId(null);
        setContextMenu(null);
        setDialogNodeId(null);
        setToolbarNodeId(null);
        if (node.metadata?.workflowKind === "character" && node.metadata.characterAssetId) {
            setCharacterReferenceNodeId(node.id);
            return;
        }
        setTextEditorNodeId(node.id);
    }, []);

    const openScriptEditor = useCallback((nodeId: string) => {
        setScriptEditorNodeId(nodeId);
    }, []);

    const openDrawingNode = useCallback((node: CanvasNodeData) => {
        if (node.type !== CanvasNodeType.Drawing) return;
        setSelectedNodeIds(new Set([node.id]));
        setSelectedConnectionId(null);
        setContextMenu(null);
        setDialogNodeId(null);
        setToolbarNodeId(null);
        setDrawingNodeId(node.id);
    }, []);

    const openArtCritique = useCallback((node: CanvasNodeData) => {
        if (node.type !== ART_CRITIQUE_NODE_TYPE) return;
        setSelectedNodeIds(new Set([node.id]));
        setSelectedConnectionId(null);
        setContextMenu(null);
        setDialogNodeId(null);
        setToolbarNodeId(null);
        setArtCritiqueNodeId(node.id);
    }, []);
    const duplicateNodeFromContent = useCallback((node: CanvasNodeData) => duplicateNode(node.id), [duplicateNode]);
    const deleteNodeFromContent = useCallback((node: CanvasNodeData) => deleteNodes(new Set([node.id])), [deleteNodes]);
    const updateNodeFromContent = useCallback((nodeId: string, update: (node: CanvasNodeData) => CanvasNodeData) => {
        setNodesState((current) => {
            const next = updateCanvasNode(current, nodeId, update);
            nodesRef.current = next;
            return next;
        });
    }, []);
    const pendingMediaUpdatesRef = useRef(new Map<string, (node: CanvasNodeData) => CanvasNodeData>());
    const mediaUpdateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const updateMediaNodeFromContent = useCallback((nodeId: string, update: (node: CanvasNodeData) => CanvasNodeData) => {
        const previous = pendingMediaUpdatesRef.current.get(nodeId);
        pendingMediaUpdatesRef.current.set(nodeId, previous ? (node) => update(previous(node)) : update);
        if (mediaUpdateTimerRef.current) return;
        mediaUpdateTimerRef.current = setTimeout(() => {
            const updates = pendingMediaUpdatesRef.current;
            pendingMediaUpdatesRef.current = new Map();
            mediaUpdateTimerRef.current = null;
            if (!updates.size) return;
            setNodesState((current) => {
                const next = updateCanvasNodes(current, updates);
                nodesRef.current = next;
                return next;
            });
        }, 120);
    }, []);
    const updateNodeMetadataFromContent = useCallback(
        (nodeId: string, patch: CanvasNodeMetadata) => {
            updateNodeFromContent(nodeId, (node) => synchronizeGenerationSpec(node, patch));
        },
        [updateNodeFromContent],
    );
    const latestCanvasNodeActionsRef = useRef({
        replaceCanvasNodeMedia,
        downloadNodeImage,
        duplicateNodeFromContent,
        deleteNodeFromContent,
        updateNodeMetadataFromContent,
        updateNodeFromContent,
        updateMediaNodeFromContent,
        openArtCritique,
        addPanoramaCaptureNode,
    });
    useInsertionEffect(() => {
        latestCanvasNodeActionsRef.current = {
            replaceCanvasNodeMedia,
            downloadNodeImage,
            duplicateNodeFromContent,
            deleteNodeFromContent,
            updateNodeMetadataFromContent,
            updateNodeFromContent,
            updateMediaNodeFromContent,
            openArtCritique,
            addPanoramaCaptureNode,
        };
    });
    // 每个画布节点都订阅这个 Context；动作依赖的页面状态几乎每次渲染都会变，
    // 直接放进 value 会让所有节点在拖动、打字时整体重渲染。动作只在事件中调用，转发到最新实现即可。
    const canvasNodeActions = useMemo<CanvasNodeActionContextValue>(() => {
        const latest = () => latestCanvasNodeActionsRef.current;
        return {
            editGeneration: (node, field) => {
                setSelectedNodeIds(new Set([node.id]));
                setDialogNodeId(node.id);
                setToolbarNodeId(null);
                if (field === "reference") {
                    const references = (buildCanvasNodeMentionReferenceMap(nodesRef.current, connectionsRef.current, nodesRef.current).get(node.id) || []).filter((reference) => ["image", "video", "character"].includes(reference.kind) && reference.nodeId);
                    if (references.length === 1) {
                        const source = nodesRef.current.find((item) => item.id === references[0].nodeId);
                        if (source) {
                            latest().replaceCanvasNodeMedia(source);
                            return;
                        }
                    }
                }
                // Wait for the existing composer to mount, then use its public controls.
                let frames = 0;
                const focus = () => {
                    const selector =
                        field === "model"
                            ? ".canvas-node-composer-model .canvas-composer-model-picker"
                            : field === "parameters"
                              ? ".canvas-node-composer-parameters-toggle, .canvas-node-composer-selection [role=combobox]"
                              : field === "reference"
                                ? ".canvas-node-composer-references"
                                : ".canvas-node-composer textarea, .canvas-node-composer [contenteditable=true], .canvas-config-composer [contenteditable=true]";
                    const control = document.querySelector<HTMLElement>(selector);
                    if (control) {
                        if (field === "reference") control.tabIndex = -1;
                        control.focus();
                        if (field === "model" || (field === "parameters" && control.getAttribute("aria-expanded") === "false")) control.click();
                    } else if (++frames < 60) window.requestAnimationFrame(focus);
                };
                window.requestAnimationFrame(focus);
            },
            upload: (node) => latest().replaceCanvasNodeMedia(node),
            download: (node) => latest().downloadNodeImage(node),
            duplicate: (node) => latest().duplicateNodeFromContent(node),
            deleteNode: (node) => latest().deleteNodeFromContent(node),
            updateMetadata: (nodeId, patch) => latest().updateNodeMetadataFromContent(nodeId, patch),
            updateNode: (nodeId, update) => latest().updateNodeFromContent(nodeId, update),
            updateMediaNode: (nodeId, update) => latest().updateMediaNodeFromContent(nodeId, update),
            openArtCritique: (node) => latest().openArtCritique(node),
            addPanoramaCaptureNode: (node, dataUrl, title) => latest().addPanoramaCaptureNode(node, dataUrl, title),
        };
    }, []);
    useEffect(() => {
        const listener = (event: Event) => {
            const action = (event as CustomEvent<{ nodeId?: string; kind: string; model?: string }>).detail;
            const node = nodesRef.current.find((item) => item.id === action.nodeId);
            if (!node) return;
            if (action.kind === "replace") canvasNodeActions.editGeneration?.(node, "reference");
            if (action.kind === "model" && action.model) {
                setNodes((current) => current.map((item) => (item.id === node.id ? synchronizeGenerationSpec(item, { model: action.model }) : item)));
            }
        };
        window.addEventListener(VIDEO_REFERENCE_ACTION_EVENT, listener);
        return () => window.removeEventListener(VIDEO_REFERENCE_ACTION_EVENT, listener);
    }, [canvasNodeActions, nodesRef, setNodes]);
    const { agentSnapshot, agentUndoCount, applyAgentOps, canUndoAgentOps, dismissLastAgentChange, lastAgentChange, undoAgentOps, viewLastAgentChange } = useCanvasOperationHistory({
        projectId,
        domainProjectId: currentProject?.projectId,
        projectTitle: currentProject?.title || t("canvasExtra.canvas.unnamedCanvas"),
        nodes,
        connections,
        selectedNodeIds,
        viewport,
        nodesRef,
        connectionsRef,
        selectedNodeIdsRef,
        viewportRef,
        generateNodeRef,
        setNodes,
        setConnections,
        setSelectedNodeIds,
        setSelectedConnectionId,
        setViewport,
        setContextMenu,
        focusSelection: fitCanvasSelection,
    });

    const { selectCanvasStyle, applyCanvasStyleAsync, styleApplying } = useCanvasStyleWorkflow({
        canvasId: projectId,
        domainProjectId: currentProject?.projectId,
        nodesRef,
        selectedNodeIdsRef,
        getCanvasCenter,
        setNodes,
        setSelectedNodeIds,
        setSelectedConnectionId,
        setDialogNodeId,
        setStylePickerOpen,
    });

    const flushWorldEngine = useCallback(async () => {
        await persistLocalEdits();
        await saveRemoteUserDataNow(projectId);
    }, [persistLocalEdits, projectId]);

    // Retain only the last editor on this canvas, and release it if the owning node is removed.
    const cachedDirector = closedDirector?.projectId === projectId && nodeById.get(closedDirector.nodeId)?.metadata?.directorSceneId === closedDirector.sceneId ? closedDirector : null;
    useEffect(() => {
        setClosedDirector((cached) => (cached?.projectId === projectId ? cached : null));
    }, [projectId]);
    const retainedDirectorNodeId = directorNodeId || cachedDirector?.nodeId;
    const retainedDirectorScene = directorNodeId ? activeDirectorScene : currentProject?.directorScenes?.find((scene) => scene.id === cachedDirector?.sceneId);

    const { addPrevisToCanvas, applyDirectorOutput, applyDirectorPrompt, connectDirector, createDirectorShot, createStoryboardPrevis, openDirectorWorkbench, saveDirectorScene, saveDirectorPrevis, scheduleNodeThumbnail } = useCanvasDirector({
        config: effectiveConfig,
        projectId,
        domainProjectId: currentProject?.projectId,
        directorNodeId,
        directorScenes: currentProject?.directorScenes || [],
        nodesRef,
        connectionsRef,
        getCanvasCenter,
        setNodes,
        setConnections,
        setSelectedNodeIds,
        setSelectedConnectionId,
        setDirectorNodeId,
        cardViewport: { availableHeight: size.height, scale: viewport.k, controlsHeight: 108 },
        updateProject,
    });

    const openDramaShot = useEffectEvent(async (source: { scriptId: string; rowId: string }, open: boolean) => {
        const id = await createStoryboardPrevis(source.scriptId, source.rowId, false, open);
        if (open && id) focusCanvasNode(id);
    });
    useEffect(() => {
        if (!projectLoaded || currentProject?.id !== projectId || !linkedProjectId || !projectionEpisode) return;
        const controller = new AbortController();
        async function projectEpisode(episodeId: string) {
            const [{ getDrama, getDramaEpisode, listDramaCast }, { projectDramaEpisode, connectDramaEpisodeMedia }, worldEngine] = await Promise.all([
                import("@/services/api/drama"),
                import("@/lib/canvas/drama-episode-projection"),
                projectionSegment ? import("@/lib/canvas/drama-world-engine") : undefined,
            ]);
            if (controller.signal.aborted) return;
            const [detail, { cast }, drama] = await Promise.all([
                queryClient.fetchQuery({ queryKey: dramaKeys.episode(linkedProjectId, episodeId), queryFn: ({ signal }) => getDramaEpisode(linkedProjectId, episodeId, signal) }),
                queryClient.fetchQuery({ queryKey: dramaKeys.cast(linkedProjectId), queryFn: ({ signal }) => listDramaCast(linkedProjectId, signal) }),
                projectionSegment ? queryClient.fetchQuery({ queryKey: dramaKeys.summary(linkedProjectId), queryFn: ({ signal }) => getDrama(linkedProjectId, signal) }) : undefined,
            ]);
            if (detail.episode.projectId !== linkedProjectId || detail.episode.id !== episodeId) return;
            const selectedDetail = projectionSegment ? { ...detail, segments: detail.segments.filter((item) => item.id === projectionSegment) } : detail;
            const ids = new Set(
                selectedDetail.segments.flatMap((segment) => [segment.videoResourceId, segment.request.firstFrameResourceId, ...segment.request.references.map((ref) => ref.resourceId || cast.find((asset) => asset.id === ref.castId)?.imageResourceId)]),
            );
            const dimensions = new Map<string, { width: number; height: number }>();
            await Promise.all(
                [...ids]
                    .filter((id): id is string => Boolean(id))
                    .map(async (id) => {
                        const resource = await getStoryboardImportedResource(id).catch(() => undefined);
                        if (resource?.width && resource.height) dimensions.set(id, { width: resource.width, height: resource.height });
                    }),
            );
            if (controller.signal.aborted) return;
            let projected = projectDramaEpisode(nodesRef.current, linkedProjectId, selectedDetail, cast, dimensions);
            const sources = [];
            if (projectionSegment && drama && worldEngine) {
                const shotIds = projectionShot ? [projectionShot] : worldEngine.dramaSegmentShots(detail, projectionSegment).map((shot) => shot.id);
                if (!shotIds.length) throw new Error(currentLocaleText("canvasExtra.canvas.handoffReadFailed"));
                for (const shotId of shotIds) {
                    const source = worldEngine.prepareDramaWorldEngine(projected, linkedProjectId, detail, cast, projectionSegment, shotId, drama.production.settings.aspectRatio);
                    projected = source.nodes;
                    sources.push({ scriptId: source.scriptId, rowId: source.rowId });
                }
            }
            nodesRef.current = projected;
            setNodes(projected);
            connectionsRef.current = connectDramaEpisodeMedia(projected, connectionsRef.current, selectedDetail, cast);
            setConnections(connectionsRef.current);
            for (const [index, source] of sources.entries()) {
                if (controller.signal.aborted) return;
                await openDramaShot(source, index === 0);
            }
            if (controller.signal.aborted) return;
            if (!(await saveCanvasProject({ requireRemote: true }))) throw new Error(currentLocaleText("canvasNov21.drama.projectionSaveFailed"));
            if (controller.signal.aborted) return;
            setSearchParams(
                (current) => {
                    const next = new URLSearchParams(current);
                    next.delete("dramaEpisode");
                    next.delete("dramaSegment");
                    next.delete("dramaShot");
                    return next;
                },
                { replace: true },
            );
        }
        void projectEpisode(projectionEpisode).catch((error) => {
            if (!controller.signal.aborted) message.error(error instanceof Error ? error.message : currentLocaleText("canvasExtra.canvas.handoffReadFailed"));
        });
        return () => controller.abort();
    }, [currentProject?.id, linkedProjectId, message, projectId, projectLoaded, projectionEpisode, projectionSegment, projectionShot, queryClient, saveCanvasProject, setNodes, setSearchParams]);

    const {
        activateStep: activateShortDramaStep,
        createPipeline: createShortDramaPipeline,
        guideCollapsed: shortDramaGuideCollapsed,
        openStoryInput,
        progress: shortDramaProgress,
        setGuideCollapsed: setShortDramaGuideCollapsed,
        skipGuide: skipShortDramaGuide,
    } = useCanvasShortDrama({
        nodes,
        connections,
        nodesRef,
        connectionsRef,
        selectedNodeIdsRef,
        getCanvasCenter,
        setNodes,
        setConnections,
        setSelectedNodeIds,
        setSelectedConnectionId,
        setStylePickerOpen,
        fitCanvasSelection,
        focusCanvasNode,
        openTextEditor: openTextNodeEditor,
    });

    const shortDramaGuide = shortDramaEnabled && !currentProject?.projectId && shortDramaProgress.active ? { progress: shortDramaProgress, collapsed: shortDramaGuideCollapsed, onToggle: () => setShortDramaGuideCollapsed((value) => !value) } : undefined;

    const clearCanvas = useCallback(() => {
        const drawingIds = nodesRef.current.flatMap((node) => (node.type === CanvasNodeType.Drawing && node.metadata?.drawingId ? [node.metadata.drawingId] : []));
        if (drawingIds.length) {
            void Promise.all(drawingIds.map((drawingId) => removeCanvasDrawing(projectId, drawingId))).catch(() => message.warning(currentLocaleText("canvasExtra.canvas.clearDrawingCacheFailed")));
        }
        setNodes([]);
        setConnections([]);
        setTextEditorNodeId(null);
        setDrawingNodeId(null);
        setInfoNodeId(null);
        setSubtitleNodeId(null);
        setCropNodeId(null);
        setMaskEditNodeId(null);
        setAnnotationNodeId(null);
        setAngleNodeId(null);
        setLightingNodeId(null);
        setEmotionNodeId(null);
        setPreviewNodeId(null);
        setRunningNodeId(null);
        setArtCritiqueNodeId(null);
        deselectCanvas();
        setClearConfirmOpen(false);
        clearCanvasFiles();
    }, [clearCanvasFiles, deselectCanvas, message, nodesRef, projectId, setEmotionNodeId]);

    useCanvasKeyboard({
        enabled: projectLoaded && !versions.preview && !assetView,
        nodesRef,
        selectedNodeIdsRef,
        selectedConnectionId,
        setSelectedNodeIds,
        setSelectedConnectionId,
        setContextMenu,
        setShortcutRequestNonce,
        setInfoNodeId,
        setCropNodeId,
        setMaskEditNodeId,
        setAnnotationNodeId,
        saveCanvasProject,
        zoomToActualSize,
        fitCanvasContent,
        fitCanvasSelection,
        undoCanvas,
        redoCanvas,
        cancelSelectionBox,
        copySelectedNodes,
        pasteCopiedNodes,
        restoreCopiedNodesFromText,
        shouldPreferCopiedNodes,
        pasteSystemClipboard,
        deleteNodes,
        deleteConnection,
        deselectCanvas,
        zoomCanvasIn,
        zoomCanvasOut,
        focusMode,
        exitFocusMode,
        toggleFocusMode,
        onOpenSearch: () => setNodeSearchOpen(true),
        beginBatchConnection: () => beginBatchConnectionMode(Array.from(selectedNodeIdsRef.current)),
    });

    const handleAssistantSessionsChange = useCallback((sessions: CanvasAssistantSession[], activeId: string | null) => {
        chatSessionsRef.current = sessions;
        activeChatIdRef.current = activeId;
        setChatSessions(sessions);
        setActiveChatId(activeId);
    }, []);

    const startTitleEditing = useCallback(() => {
        setTitleDraft(currentProject ? displayedShowcaseProjectTitle(currentProject, locale) : currentLocaleText("canvasExtra.canvas.unnamedCanvas"));
        setTitleEditing(true);
    }, [currentProject, locale]);

    const finishTitleEditing = useCallback(() => {
        const nextTitle = titleDraft.trim();
        if (nextTitle && (!currentProject || nextTitle !== displayedShowcaseProjectTitle(currentProject, locale))) renameCurrentProject(nextTitle);
        setTitleEditing(false);
    }, [currentProject, locale, renameCurrentProject, titleDraft]);

    const pasteAtPosition = useCallback(
        (position: Position) => {
            if (shouldPreferCopiedNodes() && pasteCopiedNodes(position)) return;
            void (async () => {
                try {
                    // 标记写入成功时仍优先系统图片，兼容截图和从外部应用复制的媒体。
                    const handled = await pasteSystemClipboard(position);
                    if (!handled) pasteCopiedNodes(position);
                } catch {
                    if (!pasteCopiedNodes(position)) message.warning(currentLocaleText("canvasExtra.canvas.clipboardReadFailed"));
                }
            })();
        },
        [message, pasteCopiedNodes, pasteSystemClipboard, shouldPreferCopiedNodes],
    );

    const copyingNodeContentRef = useRef(false);
    const copyNodeContentToClipboard = useCallback(
        async (node: CanvasNodeData | null) => {
            if (copyingNodeContentRef.current) return;
            copyingNodeContentRef.current = true;
            releaseCopiedNodesPastePriority();
            const content = node?.metadata?.content?.trim();
            const resourceId = resourceIdFromStorageKey(node?.metadata?.storageKey);
            const copySource = content || (node?.type === CanvasNodeType.Image && resourceId ? resourceFileUrl(resourceId) : "");
            if (!node || !copySource) {
                copyingNodeContentRef.current = false;
                message.warning(currentLocaleText("canvasExtra.canvas.nothingToCopy"));
                return;
            }

            try {
                if (node.type === CanvasNodeType.Image) {
                    try {
                        await copyImageToSystemClipboard(copySource, node.metadata?.storageKey);
                        message.success(currentLocaleText("canvasExtra.canvas.imageCopied"));
                        return;
                    } catch (imageErr) {
                        const fallbackUrl = new URL(copySource, window.location.href).toString();
                        if (navigator.clipboard?.writeText) {
                            await navigator.clipboard.writeText(fallbackUrl).catch(() => undefined);
                            message.info(currentLocaleText("canvasExtra.canvas.unfocusedImageUrlCopied"));
                            return;
                        }
                        if (await copyToClipboard(fallbackUrl)) {
                            message.info(currentLocaleText("canvasExtra.canvas.unfocusedImageUrlCopied"));
                            return;
                        }
                        throw imageErr;
                    }
                }

                if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(copySource);
                else if (!copyToClipboard(copySource)) throw new Error(currentLocaleText("canvasExtra.canvas.clipboardWriteUnsupported"));
                message.success(node.type === CanvasNodeType.Text ? currentLocaleText("canvasExtra.canvas.textCopied") : currentLocaleText("canvasExtra.canvas.contentLinkCopied"));
            } catch (error) {
                message.error(error instanceof Error ? error.message : currentLocaleText("canvasExtra.canvas.copyPermissionFailed"));
            } finally {
                copyingNodeContentRef.current = false;
            }
        },
        [message, releaseCopiedNodesPastePriority],
    );

    const copyNodeMediaUrlToClipboard = useCallback(
        async (node: CanvasNodeData | null) => {
            releaseCopiedNodesPastePriority();
            try {
                const storageKey = node?.metadata?.storageKey;
                const content = node?.metadata?.content?.trim();
                const resourceId = resourceIdFromStorageKey(storageKey);
                const mediaPath = content && !content.startsWith("data:") && !content.startsWith("blob:") ? content : resourceId ? resourceFileUrl(resourceId) : "";
                const mediaURL = mediaPath ? new URL(mediaPath, window.location.href).toString() : "";
                if (!mediaURL) throw new Error(currentLocaleText("canvasExtra.canvas.mediaNoCopyAddress"));
                if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(mediaURL);
                else if (!(await copyToClipboard(mediaURL))) throw new Error(currentLocaleText("canvasExtra.canvas.clipboardWriteUnsupported"));
                message.success(node?.type === CanvasNodeType.Video ? currentLocaleText("canvasExtra.canvas.videoUrlCopied") : currentLocaleText("canvasExtra.canvas.imageUrlCopied"));
            } catch (error) {
                message.error(error instanceof Error ? error.message : currentLocaleText("canvasExtra.canvas.mediaUrlCopyFailed"));
            }
        },
        [message, releaseCopiedNodesPastePriority],
    );

    const uploadNodeImageToArkPrivateAsset = useCallback(
        async (node: CanvasNodeData) => {
            if (node.type !== CanvasNodeType.Image || !node.metadata?.content) {
                message.warning(currentLocaleText("canvasExtra.canvas.selectImageToUpload"));
                return;
            }
            if (arkPrivateAssetUploadNodeId === node.id) return;
            const feedbackKey = `ark-private-asset-${node.id}`;
            setArkPrivateAssetUploadNodeId(node.id);
            message.loading({ key: feedbackKey, content: currentLocaleText("canvasExtra.canvas.uploadingToArk"), duration: 0 });
            try {
                let resourceID = resourceIdFromStorageKey(node.metadata.storageKey);
                let persistedNode = node;
                if (!resourceID) {
                    const uploaded = await uploadImage(node.metadata.content);
                    resourceID = resourceIdFromStorageKey(uploaded.storageKey);
                    if (!resourceID) throw new Error(currentLocaleText("canvasExtra.canvas.imageSaveFailed"));
                    handleConfigNodeChange(node.id, imageMetadata(uploaded));
                    persistedNode = { ...node, metadata: { ...node.metadata, ...imageMetadata(uploaded) } };
                }
                const asset = await ensureCanvasNodeAsset({ canvasId: projectId, domainProjectId: currentProject?.projectId, node: persistedNode, source: "canvas-manual" });
                handleConfigNodeChange(node.id, { assetId: asset.assetId });
                await syncResourceToArkPrivateAsset(resourceID);
                message.success({ key: feedbackKey, content: currentLocaleText("canvasExtra.canvas.arkSynced"), duration: 4 });
            } catch (error) {
                message.error({ key: feedbackKey, content: error instanceof Error ? error.message : currentLocaleText("canvasExtra.canvas.arkUploadFailed"), duration: 5 });
            } finally {
                setArkPrivateAssetUploadNodeId((current) => (current === node.id ? null : current));
            }
        },
        [arkPrivateAssetUploadNodeId, currentProject?.projectId, handleConfigNodeChange, message, projectId],
    );

    const confirmUploadNodeImageToArkPrivateAsset = useCallback(
        (node: CanvasNodeData) => {
            modal.confirm({
                title: currentLocaleText("canvasExtra.canvas.arkUploadTitle"),
                content: currentLocaleText("canvasExtra.canvas.arkUploadContent"),
                okText: currentLocaleText("canvasExtra.canvas.arkUploadOk"),
                cancelText: currentLocaleText("canvasExtra.timeline.cancel"),
                onOk: () => uploadNodeImageToArkPrivateAsset(node),
            });
        },
        [modal, uploadNodeImageToArkPrivateAsset],
    );

    const handleCanvasContextMenu = useCallback(
        (event: ReactMouseEvent) => {
            const target = event.target instanceof Element ? event.target : null;
            if (target?.closest("[data-node-id],[data-connection-id]")) return;

            event.preventDefault();
            event.stopPropagation();
            if (target?.closest("[data-canvas-no-zoom],.ant-modal,.ant-popover,.ant-dropdown")) {
                setContextMenu(null);
                return;
            }

            closeConnectionCreateMenu();
            setContextMenu({ type: "canvas", x: event.clientX, y: event.clientY, position: screenToCanvas(event.clientX, event.clientY) });
        },
        [closeConnectionCreateMenu, screenToCanvas],
    );

    const handleNodeContextMenu = useCallback(
        (event: ReactMouseEvent, id: string) => {
            event.preventDefault();
            event.stopPropagation();
            setSelectedNodeIds((current) => {
                if (current.has(id) && current.size > 1) return current;
                return new Set([id]);
            });
            setSelectedConnectionId(null);
            closeConnectionCreateMenu();
            setToolbarNodeId(null);
            setDialogNodeId(null);
            setContextMenu({ type: "node", x: event.clientX, y: event.clientY, nodeId: id });
        },
        [closeConnectionCreateMenu],
    );

    const handleGenerateNode = useCanvasGenerationExecutor({
        projectId,
        domainProjectId: currentProject?.projectId,
        addedSkills,
        assets,
        nodesRef,
        connectionsRef,
        setNodes,
        setConnections,
        setSelectedNodeIds,
        setSelectedConnectionId,
        setDialogNodeId,
        setRunningNodeId,
        startGenerationRequest,
        finishGenerationRequest,
        bindGenerationTask,
        applyGenerationTaskResult,
        onRequireSignIn: (proceed) => {
            setInlineAuthProceed(() => proceed);
            setInlineAuthOpen(true);
        },
    });
    useEffect(() => {
        generateNodeRef.current = handleGenerateNode;
    }, [handleGenerateNode]);

    const { enqueueGenerationBatch, retryFailedBatchItems, stopRemainingBatchItems } = useCanvasGenerationBatches({
        projectId,
        projectLoaded,
        nodes,
        nodesRef,
        connectionsRef,
        assets,
        setNodes,
        handleGenerateNode,
    });

    const {
        addReferenceColumn: addBatchReferenceColumn,
        addRow: addBatchRow,
        fillRowsFromConnections,
        generateRows: generateBatchRows,
        patchTable: patchBatchTable,
        removeRow: removeBatchRow,
        updateRow: updateBatchRow,
    } = useCanvasBatchTable({
        projectId,
        nodesRef,
        connectionsRef,
        setNodes,
        setConnections,
        setSelectedNodeIds,
        enqueueGenerationBatch,
    });

    const { addScriptRow, createAndGenerateScriptVideos, createScriptActionBoards, createScriptImageNodes, createScriptVideoNodes, generateScriptImages, generateScriptRows, generateScriptVideos, removeScriptRow, replaceScriptRows, updateScriptRow } =
        useCanvasStoryboard({
            projectAspectRatio: linkedProjectQuery.data?.project.aspectRatio,
            projectId,
            addedSkills,
            nodesRef,
            connectionsRef,
            setNodes,
            setConnections,
            setSelectedNodeIds,
            enqueueGenerationBatch,
            onStyleRequired: () => setStylePickerOpen(true),
        });

    const handleRetryNode = useCanvasGenerationRetry({
        projectId,
        domainProjectId: currentProject?.projectId,
        addedSkills,
        assets,
        nodesRef,
        connectionsRef,
        setNodes,
        setRunningNodeId,
        startGenerationRequest,
        finishGenerationRequest,
        bindGenerationTask,
        applyGenerationTaskResult,
    });
    const reloadCanvasNodeResource = useCallback(
        async (node: CanvasNodeData) => {
            const taskId = node.metadata?.taskId;
            if (!taskId || !node.metadata?.resourceReloadAvailable) return;
            setNodes((current) => current.map((item) => (item.id === node.id ? { ...item, metadata: { ...item.metadata, status: "loading", taskStage: currentLocaleText("canvasExtra.canvas.reloadingResource"), errorDetails: undefined } } : item)));
            try {
                const task = await queryGenerationTask(taskId);
                if (task.status !== "succeeded") throw new Error(currentLocaleText("canvasExtra.canvas.reloadTaskNotSucceeded"));
                await applyGenerationTaskResult(node.id, task);
            } catch (error) {
                setNodes((current) =>
                    current.map((item) =>
                        item.id === node.id
                            ? { ...item, metadata: { ...item.metadata, status: "error", errorDetails: error instanceof Error ? error.message : currentLocaleText("canvasExtra.canvas.resourceReloadFailed"), resourceReloadAvailable: true } }
                            : item,
                    ),
                );
            }
        },
        [applyGenerationTaskResult, setNodes],
    );
    const reconcileImageBatchRootNode = useCallback(
        (rootId: string) => {
            setNodes((current) => {
                const root = current.find((item) => item.id === rootId);
                if (!root) return current;
                const reconciled = reconcileImageBatchRoot(root, current);
                return current.map((item) => (item.id === root.id ? reconciled : item));
            });
        },
        [setNodes],
    );
    const retryImageBatchChildren = useCallback(
        (rootId: string, children: CanvasNodeData[]) => {
            const childIds = children.map((child) => child.id);
            setNodes((current) => markImageBatchRetrying(rootId, childIds, current));
            void Promise.allSettled(
                children.map(async (child) => {
                    await handleRetryNode(child);
                    setNodes((current) => current.map((item) => (item.id === child.id ? restoreUnsubmittedImageBatchChild(item, child) : item)));
                }),
            ).finally(() => reconcileImageBatchRootNode(rootId));
        },
        [handleRetryNode, reconcileImageBatchRootNode, setNodes],
    );

    const generateImageFromTextNode = useCallback(
        (node: CanvasNodeData) => {
            const prompt = (node.metadata?.content || node.metadata?.prompt || "").trim();
            if (!prompt) {
                message.warning(currentLocaleText("canvasExtra.canvas.emptyTextNode"));
                return;
            }
            const sourceNode = nodesRef.current.find((item) => item.id === node.id);
            if (!sourceNode) return;
            const nodeSize = getNodeSpec(CanvasNodeType.Image);
            const imageNode = createCanvasNode(
                CanvasNodeType.Image,
                {
                    x: sourceNode.position.x + sourceNode.width + 96 + nodeSize.width / 2,
                    y: sourceNode.position.y + sourceNode.height / 2,
                },
                {
                    prompt: "@文本1",
                    composerContent: "@文本1",
                    model: effectiveConfig.imageModel || effectiveConfig.model,
                    size: effectiveConfig.size,
                    quality: effectiveConfig.quality,
                    transparentBackground: effectiveConfig.transparentBackground,
                    count: getGenerationCount(effectiveConfig.canvasImageCount || effectiveConfig.count),
                },
            );
            imageNode.title = currentLocaleText("canvasExtra.canvas.imageGeneration");
            const connection = { id: nanoid(), fromNodeId: sourceNode.id, toNodeId: imageNode.id };
            const nextNodes = nodesRef.current.map((item) => (item.id === sourceNode.id ? { ...item, metadata: { ...item.metadata, content: prompt, richText: undefined, prompt, status: NODE_STATUS_SUCCESS } } : item)).concat(imageNode);
            const nextConnections = [...connectionsRef.current, connection];
            nodesRef.current = nextNodes;
            connectionsRef.current = nextConnections;
            setNodes(nextNodes);
            setConnections(nextConnections);
            setSelectedNodeIds(new Set([imageNode.id]));
            setSelectedConnectionId(null);
            setDialogNodeId(imageNode.id);
        },
        [effectiveConfig, message],
    );

    const renderCanvasNodePanel = useCallback(
        (panelNode: CanvasNodeData) => {
            if (panelNode.type === CanvasNodeType.Script || panelNode.type === CanvasNodeType.Drawing) return null;
            return panelNode.type === CanvasNodeType.Config ? (
                <CanvasConfigComposer
                    value={panelNode.metadata?.composerContent ?? panelNode.metadata?.prompt ?? ""}
                    inputs={configInputsById.get(panelNode.id) || []}
                    skillReferences={skillMentionReferences}
                    generationMode={panelNode.metadata?.generationMode}
                    metadata={panelNode.metadata}
                    workspaceMode={workspaceMode}
                    onChange={(composerContent) => handleConfigNodeChange(panelNode.id, { composerContent })}
                    onMetadataChange={(patch) => handleConfigNodeChange(panelNode.id, patch)}
                    onClose={() => setDialogNodeId(null)}
                />
            ) : (
                <CanvasNodePromptPanel
                    deferMount={tourActive}
                    projectId={projectId}
                    projectStyle={resolveProjectCanvasStyle(activeStylePresetId, nodes.find((node) => node.metadata?.workflowKind === "styleboard")?.metadata?.styleProfileJson)}
                    node={panelNode}
                    isRunning={isCanvasNodeGenerating(panelNode, runningNodeId)}
                    mentionReferences={[
                        ...(mentionReferencesByNodeId.get(panelNode.id) || EMPTY_RESOURCE_REFERENCES),
                        ...buildCanvasResourceReferences(nodesRef.current, connectionsRef.current).filter(
                            (reference) => reference.kind === "text" && reference.nodeId !== panelNode.id && !(mentionReferencesByNodeId.get(panelNode.id) || []).some((active) => active.nodeId === reference.nodeId),
                        ),
                    ]}
                    onAddReference={(nodeId, reference) => {
                        if (reference.active || reference.assetId || reference.kind === "skill") return reference;
                        if (reference.kind !== "text" || !reference.nodeId || reference.nodeId === nodeId) return undefined;
                        try {
                            const linked = connectCanvasTextMention(nodesRef.current, connectionsRef.current, nodeId, reference.nodeId, nanoid());
                            nodesRef.current = linked.nodes;
                            connectionsRef.current = linked.connections;
                            setNodes(linked.nodes);
                            setConnections(linked.connections);
                            return linked.reference;
                        } catch (cause) {
                            message.warning(cause instanceof Error ? cause.message : currentLocaleText("canvasExtra.canvas.textReferenceFailed"));
                            return undefined;
                        }
                    }}
                    onPromptChange={handleNodePromptChange}
                    onConfigChange={handleConfigNodeChange}
                    onGenerate={handleGenerateNode}
                    onRemoveReference={handleRemoveNodeReference}
                    onReorderReferences={handleReorderNodeReferences}
                    onReplaceReference={handleReplaceNodeReference}
                    onReplaceReferenceFiles={handleReplaceNodeReferenceFiles}
                    onClose={() => setDialogNodeId(null)}
                    onNodeMouseDown={handleNodeMouseDown}
                    workspaceMode={workspaceMode}
                    onImageSettingsOpenChange={(open) => {
                        setNodeImageSettingsOpen(open);
                        if (open) setToolbarNodeId(null);
                    }}
                />
            );
        },
        [
            configInputsById,
            handleConfigNodeChange,
            handleGenerateNode,
            handleNodePromptChange,
            handleRemoveNodeReference,
            handleReorderNodeReferences,
            handleReplaceNodeReference,
            handleReplaceNodeReferenceFiles,
            mentionReferencesByNodeId,
            message,
            projectId,
            activeStylePresetId,
            tourActive,
            nodes,
            runningNodeId,
            skillMentionReferences,
            workspaceMode,
        ],
    );

    const renderCanvasNodeContent = useCallback(
        (contentNode: CanvasNodeData) => {
            if (contentNode.metadata?.workflowKind === "character" && contentNode.metadata.characterAssetId) {
                return <CanvasCharacterReferenceNodeContent node={contentNode} />;
            }
            if (contentNode.metadata?.workflowKind === "styleboard" && !contentNode.metadata.content) {
                return <CanvasStylePlaceholderNodeContent onChoose={() => setStylePickerOpen(true)} />;
            }
            if (contentNode.metadata?.workflowKind === "story_input") {
                return <CanvasStoryInputNodeContent node={contentNode} onEdit={() => openStoryInput(contentNode.id)} />;
            }
            if (contentNode.type === CanvasNodeType.BatchTable) {
                return (
                    <CanvasBatchTableNodeContent
                        node={contentNode}
                        nodes={nodesRef.current}
                        connections={connections}
                        batch={visibleGenerationBatch(contentNode)}
                        theme={theme}
                        onPatchTable={(patch) => patchBatchTable(contentNode.id, patch)}
                        onAddRow={() => addBatchRow(contentNode.id)}
                        onRemoveRow={(rowId) => removeBatchRow(contentNode.id, rowId)}
                        onUpdateRow={(rowId, patch) => updateBatchRow(contentNode.id, rowId, patch)}
                        onFillRows={() => fillRowsFromConnections(contentNode.id)}
                        onGenerate={(rowIds) => void generateBatchRows(contentNode.id, rowIds)}
                        onRetryItem={(batchId, itemId) => retryFailedBatchItems(contentNode.id, batchId, itemId)}
                        onAddReferenceColumn={() => addBatchReferenceColumn(contentNode.id)}
                        onConnectStart={(event, handleId) => handleConnectStart(event, contentNode.id, "target", handleId)}
                        onConnectDrop={(event, handleId) => handleConnectDrop(event, contentNode.id, handleId)}
                    />
                );
            }
            if (contentNode.type === CanvasNodeType.Script) {
                const pipeline = deriveStoryboardPipelineProgress(contentNode, nodesRef.current, connectionsRef.current);
                return (
                    <CanvasScriptNodeContent
                        deferMount={tourActive}
                        node={contentNode}
                        nodes={nodesRef.current}
                        batch={visibleGenerationBatch(contentNode)}
                        pipeline={pipeline}
                        scale={viewport.k}
                        mentionReferences={mentionReferencesByNodeId.get(contentNode.id) || EMPTY_RESOURCE_REFERENCES}
                        onOpen={() => void openScriptEditor(contentNode.id)}
                        onCreateImageNodes={(rowIds) => {
                            const create = () => {
                                createScriptImageNodes(contentNode.id, rowIds);
                            };
                            if (tourActive) startTransition(create);
                            else create();
                        }}
                        onCreateVideoNodes={() => createScriptVideoNodes(contentNode.id)}
                        onGenerateImages={(rowIds) => void generateScriptImages(contentNode.id, rowIds)}
                        onGenerateVideos={(rowIds) => (contentNode.metadata?.storyboardVideoInputMode === "keyframe" ? void generateScriptVideos(contentNode.id, rowIds) : void createAndGenerateScriptVideos(contentNode.id, rowIds))}
                        onVideoInputModeChange={(storyboardVideoInputMode) => handleConfigNodeChange(contentNode.id, { storyboardVideoInputMode })}
                        onMergeVideos={() => void mergeVideosByIds(pipeline.successfulVideoNodeIds)}
                        onCreateActionBoards={() => void createScriptActionBoards(contentNode.id)}
                        onRetryBatch={(batchId) => retryFailedBatchItems(contentNode.id, batchId)}
                        onRetryBatchItem={(batchId, itemId) => retryFailedBatchItems(contentNode.id, batchId, itemId)}
                        onStopBatch={(batchId) => stopRemainingBatchItems(contentNode.id, batchId)}
                        onAddRow={() => addScriptRow(contentNode.id)}
                        onRemoveRow={(rowId) => removeScriptRow(contentNode.id, rowId)}
                        onUpdateRow={(rowId, patch) => updateScriptRow(contentNode.id, rowId, patch)}
                        onEditAssets={(rowId) => void openStoryboardAssetPicker(contentNode.id, rowId)}
                        onPromptChange={(composerContent) => handleConfigNodeChange(contentNode.id, { composerContent })}
                        onGenerateScript={(prompt) => void generateScriptRows(contentNode.id, prompt)}
                        onModelChange={(model) => handleConfigNodeChange(contentNode.id, { model })}
                        onShotDurationChange={(duration: StoryboardShotDuration) => handleConfigNodeChange(contentNode.id, { storyboardShotDuration: duration })}
                        onAspectRatioChange={(size) => handleConfigNodeChange(contentNode.id, { size })}
                        aspectRatio={storyboardVideoScript(contentNode, nodes, connections, linkedProjectQuery.data?.project.aspectRatio || effectiveConfig.size).metadata.size}
                        onShotCountChange={(count: StoryboardShotCount) => handleConfigNodeChange(contentNode.id, { storyboardShotCount: count })}
                        workspaceMode={workspaceMode}
                        onComposerHeightChange={(height) => {
                            if (contentNode.metadata?.storyboardComposerHeight === height) return;
                            handleConfigNodeChange(contentNode.id, { storyboardComposerHeight: height });
                            const minHeight = storyboardMinNodeHeight(height);
                            if (contentNode.height < minHeight) handleNodeResize(contentNode.id, contentNode.width, minHeight);
                        }}
                        onCreatePrevis={async (rowId) => {
                            await createStoryboardPrevis(contentNode.id, rowId);
                        }}
                        onConnectStart={(event, rowId, handleType) => handleConnectStart(event, contentNode.id, handleType, rowId === "context" ? "storyboard:context" : `row:${rowId}`)}
                        onScrollTopChange={(scrollTop) => setScriptScrollTopById((current) => (current[contentNode.id] === scrollTop ? current : { ...current, [contentNode.id]: scrollTop }))}
                    />
                );
            }
            if (contentNode.metadata?.directorSceneId) {
                return (
                    <CanvasDirectorNodePanel
                        node={contentNode}
                        scene={currentProject?.directorScenes?.find((scene) => scene.id === contentNode.metadata?.directorSceneId) || null}
                        readNodeContent={(nodeId) => (nodeId ? nodeById.get(nodeId)?.metadata : undefined)}
                        professional={workspaceMode === "professional"}
                        scale={viewport.k}
                        onOpen={(target) => openDirectorWorkbench(contentNode.id, target)}
                        getConnectionTargets={() => directorConnectionTargets(nodesRef.current, contentNode.id)}
                        onConnect={(target) => connectDirector(contentNode.id, target)}
                        nodes={nodes}
                        onSelectShot={(shotId) => {
                            const scene = currentProject?.directorScenes.find((item) => item.id === contentNode.metadata?.directorSceneId);
                            const shot = scene?.shots.find((item) => item.id === shotId);
                            if (scene && shot) {
                                const selectedScene = directorSceneForShot(rememberDirectorActors(scene), shotId);
                                updateProject(projectId, { directorScenes: currentProject!.directorScenes.map((item) => (item.id === scene.id ? selectedScene : item)) });
                                handleConfigNodeChange(contentNode.id, {
                                    workflowTitle: shot.name,
                                    directorShotId: shotId,
                                    directorPreviewNodeId: shot.previewNodeId,
                                    directorClayVideoNodeId: contentNode.metadata?.directorShotId === shotId ? contentNode.metadata?.directorClayVideoNodeId : undefined,
                                    directorCharacterNodeIds: directorBoundReferenceIds(selectedScene),
                                    referenceAssetNodeIds: [...directorBoundReferenceIds(selectedScene), ...(selectedScene.environment?.sourceNodeId ? [selectedScene.environment.sourceNodeId] : [])],
                                    directorSourceStoryboardNodeId: shot.sourceStoryboardNodeId,
                                    directorSourceStoryboardRowId: shot.sourceStoryboardRowId,
                                });
                                const cardSize = directorCardSize(shot.aspectRatio, { availableHeight: size.height, scale: viewport.k, controlsHeight: 108 });
                                handleNodeResize(contentNode.id, cardSize.width, cardSize.height);
                            }
                        }}
                        onSync={() => {
                            if (contentNode.metadata?.directorSourceStoryboardNodeId && contentNode.metadata?.directorSourceStoryboardRowId)
                                createStoryboardPrevis(contentNode.metadata.directorSourceStoryboardNodeId, contentNode.metadata.directorSourceStoryboardRowId, true);
                        }}
                        onGenerate={() => {
                            const scene = currentProject?.directorScenes.find((item) => item.id === contentNode.metadata?.directorSceneId);
                            if (!scene) return message.error(t("directorDownstream.changed"));
                            try {
                                const next = ensureDirectorVideoTarget(contentNode, nodesRef.current, connectionsRef.current, scene);
                                nodesRef.current = next.nodes;
                                connectionsRef.current = next.connections;
                                setNodes(next.nodes);
                                setConnections(next.connections);
                                focusCanvasNode(next.targetId);
                            } catch (error) {
                                message.error(error instanceof Error ? error.message : t("directorDownstream.targetUnavailable"));
                            }
                        }}
                        onScheduleThumbnail={directorNodeId ? undefined : scheduleNodeThumbnail}
                    />
                );
            }
            return (
                <CanvasConfigNodePanel
                    node={contentNode}
                    isRunning={isCanvasNodeGenerating(contentNode, runningNodeId)}
                    inputSummary={getInputSummary(configInputsById.get(contentNode.id) || [])}
                    onConfigChange={handleConfigNodeChange}
                    onComposerToggle={() => setDialogNodeId((current) => (current === contentNode.id ? null : contentNode.id))}
                    onCreatePrevis={
                        contentNode.type === CanvasNodeType.Video && nodes.some((script) => script.metadata?.storyboard?.rows.some((row) => row.videoNodeId === contentNode.id))
                            ? () => {
                                  const script = nodesRef.current.find((script) => script.metadata?.storyboard?.rows.some((row) => row.videoNodeId === contentNode.id));
                                  const row = script?.metadata?.storyboard?.rows.find((row) => row.videoNodeId === contentNode.id);
                                  if (script && row) createStoryboardPrevis(script.id, row.id);
                              }
                            : undefined
                    }
                    onGenerate={(nodeId) => {
                        const target = nodesRef.current.find((item) => item.id === nodeId);
                        void handleGenerateNode(nodeId, target?.metadata?.generationMode || "image", target?.metadata?.composerContent ?? target?.metadata?.prompt ?? "");
                    }}
                    workspaceMode={workspaceMode}
                />
            );
        },
        [
            addBatchReferenceColumn,
            addBatchRow,
            addScriptRow,
            configInputsById,
            connections,
            createAndGenerateScriptVideos,
            createScriptActionBoards,
            createScriptImageNodes,
            createScriptVideoNodes,
            createStoryboardPrevis,
            currentProject?.directorScenes,
            directorNodeId,
            size.height,
            nodeById,
            projectId,
            updateProject,
            fillRowsFromConnections,
            generateBatchRows,
            generateScriptImages,
            generateScriptRows,
            generateScriptVideos,
            handleConfigNodeChange,
            handleConnectDrop,
            handleConnectStart,
            handleGenerateNode,
            handleNodeResize,
            mentionReferencesByNodeId,
            mergeVideosByIds,
            openDirectorWorkbench,
            connectDirector,
            focusCanvasNode,
            message,
            nodes,
            openStoryInput,
            openStoryboardAssetPicker,
            openScriptEditor,
            patchBatchTable,
            removeBatchRow,
            removeScriptRow,
            retryFailedBatchItems,
            runningNodeId,
            scheduleNodeThumbnail,
            stopRemainingBatchItems,
            theme,
            tourActive,
            updateBatchRow,
            updateScriptRow,
            viewport.k,
            workspaceMode,
        ],
    );

    const handleCanvasNodeHoverStart = useCallback(
        (nodeId: string) => {
            if (nodeDraggingRef.current) return;
            setHoveredNodeId(nodeId);
            keepNodeToolbar(nodeId);
        },
        [keepNodeToolbar],
    );
    const handleCanvasNodeHoverEnd = useCallback(
        (nodeId: string) => {
            setHoveredNodeId((current) => (current === nodeId ? null : current));
            hideNodeToolbar();
        },
        [hideNodeToolbar],
    );
    const retryCanvasNode = useCallback(
        (node: CanvasNodeData) => {
            if (node.metadata?.imageLayerWorkflow && !node.metadata.experimentalLayerPlan && !node.metadata.layerDecomposition) {
                const source = nodesRef.current.find((item) => item.id === node.metadata!.imageLayerWorkflow!.sourceNodeId);
                if (source?.metadata?.content) setLayerDecompositionNodeId(source.id);
                else message.error(upstreamText("upstream.v165.message051"));
                return;
            }
            if (node.type === CanvasNodeType.Script) {
                const prompt = (node.metadata?.composerContent || node.metadata?.prompt || "").trim();
                if (!prompt) {
                    message.warning(currentLocaleText("canvasExtra.canvas.scriptMissingContent"));
                    return;
                }
                void generateScriptRows(node.id, prompt);
                return;
            }
            if (node.metadata?.experimentalLayerPlan || node.metadata?.layerExtraction) {
                void handleRetryNode(node);
                return;
            }
            if (node.type === CanvasNodeType.Image && node.metadata?.isBatchRoot) {
                const failedChildren = failedImageBatchChildren(node, nodesRef.current);
                if (!failedChildren.length) {
                    message.info(currentLocaleText("canvasExtra.canvas.batchNoFailedImages"));
                    return;
                }
                message.info(currentLocaleText("canvasExtra.canvas.retryingFailedImages", { count: failedChildren.length }));
                retryImageBatchChildren(node.id, failedChildren);
                return;
            }
            if (node.type === CanvasNodeType.Image && node.metadata?.batchRootId) {
                retryImageBatchChildren(node.metadata.batchRootId, [node]);
                return;
            }
            void handleRetryNode(node);
        },
        [generateScriptRows, handleRetryNode, message, nodesRef, retryImageBatchChildren, setLayerDecompositionNodeId],
    );
    const openCanvasNodeTaskDetails = useCallback(
        (node: CanvasNodeData) => {
            void openNodeTaskDetails(node);
        },
        [openNodeTaskDetails],
    );
    const openCanvasNodeVersions = useCallback((node: CanvasNodeData) => setVersionCompareRootId(node.metadata?.versionOfNodeId || node.id), []);
    const viewCanvasNodeImage = useCallback((node: CanvasNodeData) => setPreviewNodeId(node.id), []);
    const editCanvasDirector = useCallback((node: CanvasNodeData) => openDirectorWorkbench(node.id), [openDirectorWorkbench]);
    const locateProjectStyleNode = useCallback(() => {
        const styleNode = nodesRef.current.find((node) => node.type === CanvasNodeType.Text && node.metadata?.workflowKind === "styleboard");
        if (!styleNode) {
            message.info(currentLocaleText("canvasExtra.canvas.styleNodeSyncing"));
            return;
        }
        focusCanvasNode(styleNode.id);
    }, [focusCanvasNode, message, nodesRef]);
    const storyboardAssetNode = nodes.find((node) => node.id === storyboardAssetTarget?.nodeId);
    const storyboardAssetRow = storyboardAssetNode?.metadata?.storyboard?.rows.find((row) => row.id === storyboardAssetTarget?.rowId);
    const storyboardAssetBindings =
        storyboardAssetNode && storyboardAssetRow
            ? normalizeStoryboardAssetBindings([
                  ...(storyboardAssetRow.assetBindings || []),
                  ...storyboardRowReferenceNodeIds(storyboardAssetNode, storyboardAssetRow, nodes, connections, false)
                      .filter((id) => !storyboardAssetNode.metadata?.storyboard?.referenceNodeIds.includes(id))
                      .flatMap((id) => {
                          const node = nodes.find((item) => item.id === id);
                          const binding = node && bindingForConnectedNode(node);
                          return binding ? [binding] : [];
                      }),
              ])
            : [];
    const freeformCreateCommands = useCanvasCreateCommands({
        workspaceMode,
        isProjectLinked: Boolean(shortDramaEnabled && currentProject?.projectId),
        handlers: {
            onAddText: () => createNode(CanvasNodeType.Text),
            onAddImage: () => createNode(CanvasNodeType.Image),
            onAddVideo: () => createNode(CanvasNodeType.Video),
            onAddAudio: () => createNode(CanvasNodeType.Audio),
            onAddScript: () => createNode(CanvasNodeType.Script),
            onAddFrame: () => createNode(CanvasNodeType.Frame),
            onAddFolder: createFolder,
            onAddDrawing: () => createNode(CanvasNodeType.Drawing),
            onAddWorkflow: () => createNode(CanvasNodeType.Config),
            onAddExtensionNode: (type) => createNode(type),
            onChooseStyle: () => setStylePickerOpen(true),
            onOpenDirector: () => setDirectorTemplateRequest({}),
            onUpload: () => handleUploadRequest(),
            onOpenMyAssets: () => openCanvasAssetLibrary(),
            onOpenProjectCharacters: () => openProjectAssets("character"),
        },
    });
    const emptyStateKind = resolveCanvasEmptyStateKind({
        nodeCount: nodes.length,
        shortDramaEnabled,
        isProjectLinked: Boolean(currentProject?.projectId),
        starterMode: currentProject?.starterMode,
    });
    const defaultTextModel = effectiveConfig.textModel || selectableModelsByCapability(effectiveConfig, "text")[0] || "";
    const onboarding = useCanvasOnboarding({
        active: projectLoaded && tourActive,
        nodes,
        connections,
        nodesRef,
        viewportRef,
        setNodes,
        setDialogNodeId,
        setSelectedNodeIds,
        moveViewportTo,
        defaultTextModel,
        config: effectiveConfig,
    });
    const { text: tourTextNode, script: tourScriptNode, image: tourImageNode, video: tourVideoNode } = onboarding;
    const emptyCanvasState =
        emptyStateKind === "freeform" && (!shortDramaEnabled || plainCanvasId === projectId) ? (
            <CanvasFreeformEmptyState
                commands={freeformCreateCommands}
                onOpenAgent={openAgent}
                agentOpen={assistantOpen}
                quickActions={[
                    { id: "image", label: t("canvasExtra.approval.type.image"), icon: <ImageIcon className="size-3.5" />, onClick: () => createNode(CanvasNodeType.Image) },
                    { id: "video", label: t("canvasExtra.approval.type.video"), icon: <VideoIcon className="size-3.5" />, onClick: () => createNode(CanvasNodeType.Video) },
                    { id: "text", label: t("canvasExtra.approval.type.text"), icon: <TypeIcon className="size-3.5" />, onClick: () => createNode(CanvasNodeType.Text) },
                    { id: "upload", label: t("shortDrama.importAssets"), icon: <Upload className="size-3.5" />, onClick: () => handleUploadRequest() },
                    { id: "storyboard", label: t("shortDrama.newBlankStoryboard"), icon: <Clapperboard className="size-3.5" />, onClick: () => createNode(CanvasNodeType.Script) },
                    { id: "previs", label: t("canvasExtra.tool.directorDesk"), icon: <Layers3 className="size-3.5" />, onClick: () => setDirectorTemplateRequest({}) },
                ]}
            />
        ) : emptyStateKind === "linked" ? (
            <CanvasLinkedProjectEmptyState
                projectName={linkedProjectQuery.data?.project.name || currentProject?.title || t("canvasExtra.canvas.projectCanvas")}
                hasChapter={Boolean(linkedProjectQuery.data?.units.length)}
                onAddFirstChapter={() => {
                    const first = linkedProjectQuery.data?.units.slice().sort((left, right) => left.position - right.position)[0];
                    if (first) void handleProjectChapterInsert({ id: first.id, projectId: linkedProjectId, title: first.title, position: first.position });
                }}
                onOpenAssets={() => openProjectAssets()}
                onAddText={() => createNode(CanvasNodeType.Text)}
            />
        ) : emptyStateKind === "guided" || emptyStateKind === "freeform" ? (
            <CanvasStoryWelcome
                onCreatePipeline={createShortDramaPipeline}
                onSubmitPrompt={(text) => {
                    setAgentPrefillRequest((current) => ({ id: (current?.id || 0) + 1, canvasId: projectId, text, autoSubmit: true }));
                    openAgent();
                }}
                onStartFreeform={() => {
                    setPlainCanvasId(projectId);
                    rememberFreeformStarter();
                    updateProject(projectId, { starterMode: "freeform" });
                }}
                onUpload={() => handleUploadRequest()}
                onAddText={() => createNode(CanvasNodeType.Text)}
                onAddScript={() => createNode(CanvasNodeType.Script)}
            />
        ) : null;
    if (!projectLoaded && loadError)
        return (
            <main className="flex h-full flex-col items-center justify-center gap-4">
                <p role="alert">{loadError}</p>
                <Button onClick={retryLoad}>{t("canvasExtra.canvas.reload")}</Button>
                <Link to="/canvas">{t("canvasExtra.canvas.backToCanvasLibrary")}</Link>
            </main>
        );
    if (!projectLoaded) return <CanvasRefreshShell />;

    return (
        <>
            <a
                href="#canvas-main"
                className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[var(--z-toast)] focus:rounded-md focus:border focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg"
            >
                {t("canvasExtra.canvas.skipToCanvasMain")}
            </a>
            <main
                id="canvas-main"
                tabIndex={-1}
                className={`relative flex h-full min-h-0 overflow-hidden outline-none ${!(directorNodeId && activeDirectorScene) && !focusMode && !versions.preview && !currentProject?.projectId ? `canvas-main-with-workspace ${workspaceOpen ? "canvas-workspace-expanded" : ""}` : ""}`}
                style={{ background: resolvedCanvasAppearance.background, color: theme.node.text }}
            >
                {!(directorNodeId && activeDirectorScene) && !focusMode && !versions.preview && !currentProject?.projectId && (
                    <CanvasWorkspacePanel
                        key={projectId}
                        projectId={projectId}
                        open={workspaceOpen}
                        onOpen={() => setWorkspaceOpen(true)}
                        onClose={() => setWorkspaceOpen(false)}
                        nodes={nodes}
                        selectedNodeIds={selectedNodeIds}
                        onInsertAssets={handleProjectAssetsInsert}
                        onAssets={openCanvasAssetLibrary}
                        onCancelTask={cancelCanvasTask}
                        onFocus={(id) => {
                            changeAssetView(false);
                            setSelectedNodeIds(new Set([id]));
                            focusCanvasNode(id);
                        }}
                    />
                )}
                {!focusMode && !versions.preview && shortDramaEnabled && currentProject?.projectId ? (
                    <CanvasProjectSidebar projectId={currentProject.projectId} detail={linkedProjectQuery.data} onAddChapter={handleProjectChapterInsert} onLocateStyle={locateProjectStyleNode} onOpenAssets={() => openProjectAssets()} />
                ) : null}
                <CanvasOverlayLayerProvider>
                    <div className="canvas-editor-shell relative flex min-w-0 flex-1">
                        <section
                            data-canvas-editor
                            inert={Boolean(versions.preview)}
                            style={{ visibility: versions.preview ? "hidden" : undefined, opacity: versions.preview ? 0 : undefined }}
                            className="relative min-w-0 flex-1 flex flex-col min-h-0 overflow-hidden"
                        >
                            {!focusMode ? (
                                <CanvasTopBar
                                    assetView={assetView}
                                    onAssetViewChange={(assets) => {
                                        setContextMenu(null);
                                        setDialogNodeId(null);
                                        changeAssetView(assets);
                                    }}
                                    syncStatus={signedIn ? <CanvasSyncStatus projectId={projectId} onLoadLatest={reloadLatestCanvasProject} onOpenVersions={openVersions} /> : null}
                                    versionsOpen={versions.open}
                                    onToggleVersions={
                                        signedIn
                                            ? () => {
                                                  closeAgent();
                                                  setVersionCompareRootId(null);
                                                  versions.toggle();
                                              }
                                            : undefined
                                    }
                                    title={(currentProject ? displayedShowcaseProjectTitle(currentProject, locale) : "") || t("canvasExtra.canvas.unnamedCanvas")}
                                    titleDraft={titleDraft}
                                    isTitleEditing={titleEditing}
                                    onTitleDraftChange={setTitleDraft}
                                    onStartTitleEditing={startTitleEditing}
                                    onFinishTitleEditing={finishTitleEditing}
                                    onCancelTitleEditing={() => setTitleEditing(false)}
                                    canUndo={historyState.canUndo}
                                    canRedo={historyState.canRedo}
                                    onCreateProject={createAndOpenProject}
                                    onDeleteProject={deleteCurrentProject}
                                    onSave={() => void saveCanvasProject()}
                                    onImportImage={() => handleUploadRequest()}
                                    onImportLibTV={() => setLibTVImportOpen(true)}
                                    onImportTapNow={() => setTapNowImportOpen(true)}
                                    onUndo={undoCanvas}
                                    onRedo={redoCanvas}
                                    onShare={() => setShareModalOpen(true)}
                                    shortcutRequestNonce={shortcutRequestNonce}
                                    mediaPerformanceMode={mediaPerformanceMode}
                                    onMediaPerformanceModeChange={setMediaPerformanceMode}
                                    onOpenSearch={() => setNodeSearchOpen(true)}
                                    projectContext={
                                        shortDramaEnabled && currentProject?.projectId
                                            ? {
                                                  ...canvasContext,
                                                  projectId: currentProject.projectId,
                                                  projectName: linkedProjectQuery.data?.project.name || currentProject.title,
                                              }
                                            : undefined
                                    }
                                    onEnterFocusMode={enterFocusMode}
                                    shortDramaGuide={shortDramaGuide}
                                />
                            ) : null}

                            {assetView && !focusMode && !versions.preview && (
                                <Suspense fallback={null}>
                                    <CanvasAssetView
                                        onBack={() => changeAssetView(false)}
                                        nodes={nodes}
                                        onLocate={(nodeId) => {
                                            changeAssetView(false);
                                            setSelectedNodeIds(new Set([nodeId]));
                                            focusCanvasNode(nodeId);
                                        }}
                                        onRename={async (nodeId, title) => {
                                            const scope = getActiveUserScope();
                                            try {
                                                if (signedIn) await acquireCanvasNodeEditLease(projectId, nodeId);
                                                if (getActiveUserScope() !== scope) return;
                                                const node = nodesRef.current.find((item) => item.id === nodeId);
                                                if (!node || node.metadata?.locked) return;
                                                handleNodeTitleChange(nodeId, title);
                                            } catch (error) {
                                                message.error(t("canvasCard.renameFailed"));
                                                throw error;
                                            }
                                        }}
                                        onPromote={async (version) => {
                                            const scope = getActiveUserScope();
                                            try {
                                                const target = nodesRef.current.find((node) => node.id === version.nodeId);
                                                if (!target || target.metadata?.locked || target.metadata?.status === "loading" || target.metadata?.fileUpload) return;
                                                const rootId = target.metadata?.versionOfNodeId || target.id;
                                                const affected = target.metadata?.batchRootId
                                                    ? nodesRef.current.filter((node) => node.id === target.metadata?.batchRootId)
                                                    : nodesRef.current.filter((node) => (node.metadata?.versionOfNodeId || node.id) === rootId);
                                                if (affected.some((node) => node.metadata?.locked || node.metadata?.status === "loading" || node.metadata?.fileUpload)) return;
                                                if (signedIn) await Promise.all(affected.map((node) => acquireCanvasNodeEditLease(projectId, node.id)));
                                                if (getActiveUserScope() !== scope) return;
                                                if (version.mediaVersionId) {
                                                    const { adoptMediaVersion } = await import("@/lib/canvas/canvas-media-versions");
                                                    setNodes((current) =>
                                                        current.map((node) => {
                                                            const adopted = node.id === target.id ? adoptMediaVersion(node, version.mediaVersionId!) || node : node;
                                                            return target.metadata?.versionOfNodeId && (node.metadata?.versionOfNodeId || node.id) === rootId
                                                                ? { ...adopted, metadata: { ...adopted.metadata, versionPrimary: node.id === target.id } }
                                                                : adopted;
                                                        }),
                                                    );
                                                } else if (target.metadata?.batchRootId) setBatchPrimary(target);
                                                else setPrimaryVersion(target.id);
                                            } catch (error) {
                                                message.error(t("canvasFeedback.saveFailed"));
                                                throw error;
                                            }
                                        }}
                                    />
                                </Suspense>
                            )}
                            <CanvasNodeSearchModal
                                open={nodeSearchOpen}
                                nodes={nodes}
                                onClose={() => setNodeSearchOpen(false)}
                                onFocus={(nodeId) => {
                                    const target = nodeById.get(nodeId);
                                    const parent = target?.parentId ? nodeById.get(target.parentId) : null;
                                    if (parent?.metadata?.frame?.collapsed) toggleFrameCollapsed(parent.id);
                                    const batchRoot = target?.metadata?.batchRootId ? nodeById.get(target.metadata.batchRootId) : null;
                                    if (batchRoot && !batchRoot.metadata?.imageBatchExpanded) toggleBatchExpanded(batchRoot.id);
                                    const selection = new Set([nodeId]);
                                    selectedNodeIdsRef.current = selection;
                                    setSelectedNodeIds(selection);
                                    setSelectedConnectionId(null);
                                    focusCanvasNode(nodeId);
                                }}
                            />

                            {!focusMode && shortDramaGuide ? (
                                <CanvasShortDramaGuide progress={shortDramaGuide.progress} collapsed={shortDramaGuide.collapsed} onToggle={shortDramaGuide.onToggle} onSkip={skipShortDramaGuide} onStepClick={activateShortDramaStep} />
                            ) : null}

                            <CanvasShareModal projectId={projectId} open={shareModalOpen} onClose={() => setShareModalOpen(false)} beforeCreate={saveCanvasProject} />
                            <LibTVImportDialog open={libTVImportOpen} projectId={projectId} viewport={viewport} viewportSize={size} onClose={() => setLibTVImportOpen(false)} onApply={applyLibTVImport} />
                            <TapNowImportDialog open={tapNowImportOpen} projectId={projectId} viewport={viewport} viewportSize={size} onClose={() => setTapNowImportOpen(false)} onApply={applyTapNowImport} />

                            <CanvasStylePickerModal open={stylePickerOpen} value={activeStylePresetId} applying={styleApplying} onClose={() => setStylePickerOpen(false)} onSelect={selectCanvasStyle} />

                            <CanvasDirectorTemplateModal
                                canvasId={projectId}
                                nodes={nodes}
                                onGenerated={(scene) => createDirectorShot("empty", directorTemplateRequest?.position, scene)}
                                open={Boolean(directorTemplateRequest)}
                                onClose={() => setDirectorTemplateRequest(null)}
                                onSelect={(templateId) => createDirectorShot(templateId, directorTemplateRequest?.position)}
                            />

                            <div className="relative flex min-h-0 min-w-0 flex-1">
                                <div className="relative min-w-0 flex-1 overflow-hidden">
                                    <InfiniteCanvas
                                        interactive={!versions.preview}
                                        containerRef={containerRef}
                                        viewport={viewport}
                                        appearance={canvasAppearance}
                                        backgroundMode={backgroundMode}
                                        graphicsLayer={
                                            <CanvasLeaferGraphicsLayer
                                                containerRef={containerRef}
                                                viewport={viewport}
                                                theme={theme}
                                                displayConnections={hideNodeConnections ? [] : displayConnections}
                                                selectedConnectionId={selectedConnectionId}
                                                relatedConnectionIds={relatedHighlight.connectionIds}
                                                scriptScrollTopById={scriptScrollTopById}
                                                connectingParams={connectingParams}
                                                batchConnectionPreview={batchConnectionPreview}
                                                mouseWorld={mouseWorld}
                                                connectionTargetNodeId={connectionTargetNodeId}
                                                connectionTargetAnchorRatio={connectionTargetAnchorRatio}
                                                nodeById={nodeById}
                                                selectionBox={selectionBox}
                                                selectedNodeBounds={selectedNodeBounds}
                                            />
                                        }
                                        onViewportChange={handleViewportChange}
                                        onViewportPreviewChange={previewCanvasGesture}
                                        onCanvasMouseDown={handleCanvasMouseDown}
                                        boxSelectEnabled={canvasTool === "box-select"}
                                        onCanvasDoubleClick={handleCanvasDoubleClick}
                                        onCanvasDeselect={deselectCanvas}
                                        onContextMenu={handleCanvasContextMenu}
                                        onDrop={handleDrop}
                                        onFileDragEnter={handleFileDragEnter}
                                        onFileDragLeave={handleFileDragLeave}
                                        onFileDragOver={handleFileDragOver}
                                    >
                                        <CanvasNodeActionContext.Provider value={canvasNodeActions}>
                                            <CanvasNodeGraphContext.Provider value={nodeGraphContext}>
                                                <CanvasProjectWorldLayers
                                                    connectionApproach={connectionApproach}
                                                    projectId={projectId}
                                                    viewportScale={viewport.k}
                                                    connectionLayerBounds={connectionLayerBounds}
                                                    displayConnections={hideNodeConnections ? [] : displayConnections}
                                                    selectedConnectionId={selectedConnectionId}
                                                    relatedConnectionIds={relatedHighlight.connectionIds}
                                                    scriptScrollTopById={scriptScrollTopById}
                                                    connectingParams={connectingParams}
                                                    mouseWorld={mouseWorld}
                                                    connectionTargetNodeId={connectionTargetNodeId}
                                                    nodeById={nodeById}
                                                    visibleNodes={displayedNodes}
                                                    nodeRenderLODById={nodeRenderLODById}
                                                    nodeStackOrder={nodeStackOrder}
                                                    frameChildrenById={frameChildrenById}
                                                    linkedFolderPreviewNodesById={linkedFolderPreviewNodesById}
                                                    dragPreview={dragPreview}
                                                    selectedNodeIds={selectedNodeIds}
                                                    frameDropTargetId={frameDropTargetId}
                                                    relatedNodeIds={relatedHighlight.nodeIds}
                                                    activeNodeId={activeNodeId}
                                                    selectionBox={selectionBox}
                                                    batchChildCountById={batchChildCountById}
                                                    collapsingBatchIds={collapsingBatchIds}
                                                    openingBatchIds={openingBatchIds}
                                                    batchMotionById={batchMotionById}
                                                    showImageInfo={showImageInfo}
                                                    reduceMediaEffects={reduceMediaEffects}
                                                    resourceReferenceByNodeId={resourceReferenceByNodeId}
                                                    mentionReferencesByNodeId={mentionReferencesByNodeId}
                                                    mediaEffectsDisabledNodeId={emotionNodeId}
                                                    selectedNodeBounds={selectedNodeBounds}
                                                    batchSourceNodeIds={batchSourceNodeIds}
                                                    batchConnectionPreview={batchConnectionPreview}
                                                    isNodeDragging={isNodeDragging}
                                                    selectionBoundsElementRef={selectionBoundsElementRef}
                                                    renderCanvasNodeContent={renderCanvasNodeContent}
                                                    onConnectionSelect={(connectionId) => {
                                                        setSelectedConnectionId(connectionId);
                                                        setSelectedNodeIds(new Set());
                                                        setContextMenu(null);
                                                    }}
                                                    onConnectionContextMenu={(event, connectionId) => {
                                                        setSelectedConnectionId(connectionId);
                                                        setSelectedNodeIds(new Set());
                                                        closeConnectionCreateMenu();
                                                        setContextMenu({ type: "connection", x: event.clientX, y: event.clientY, connectionId });
                                                    }}
                                                    onNodeMouseDown={handleNodeMouseDown}
                                                    onNodeHoverStart={handleCanvasNodeHoverStart}
                                                    onNodeHoverEnd={handleCanvasNodeHoverEnd}
                                                    onConnectStart={handleConnectStart}
                                                    onNodeResize={handleNodeResize}
                                                    onToggleFrame={handleFrameToggle}
                                                    onFolderStyleChange={handleFolderStyleChange}
                                                    onFolderThemeChange={handleFolderThemeChange}
                                                    onNodeTitleChange={handleNodeTitleChange}
                                                    onNodeContextMenu={handleNodeContextMenu}
                                                    onNodeContentChange={handleNodeContentChange}
                                                    onToggleBatch={toggleBatchExpanded}
                                                    onSetBatchPrimary={setBatchPrimary}
                                                    onRetry={retryCanvasNode}
                                                    onReloadResource={reloadCanvasNodeResource}
                                                    onOpenTaskDetails={openCanvasNodeTaskDetails}
                                                    onOpenVersions={openCanvasNodeVersions}
                                                    onViewImage={viewCanvasNodeImage}
                                                    onReplaceMedia={replaceCanvasNodeMedia}
                                                    onOpenTextEditor={openTextNodeEditor}
                                                    onOpenDirector={editCanvasDirector}
                                                    onOpenDrawing={openDrawingNode}
                                                    onStartBatchConnection={startBatchConnection}
                                                />
                                            </CanvasNodeGraphContext.Provider>
                                        </CanvasNodeActionContext.Provider>
                                    </InfiniteCanvas>

                                    <CanvasActiveTaskPanel tasks={activeTasks} onCancelTask={cancelCanvasTask} topInset={focusMode ? "var(--space-3)" : "var(--canvas-topbar-offset)"} />

                                    {focusMode ? (
                                        <CanvasFocusModeBar
                                            syncStatus={signedIn ? <CanvasSyncStatus projectId={projectId} onLoadLatest={reloadLatestCanvasProject} onOpenVersions={openVersions} /> : null}
                                            versionsOpen={versions.open}
                                            onToggleVersions={
                                                signedIn
                                                    ? () => {
                                                          closeAgent();
                                                          versions.toggle();
                                                      }
                                                    : undefined
                                            }
                                            dockRevealed={focusDockRevealed}
                                            zoomPercent={viewport.k}
                                            onToggleDock={() => setFocusDockRevealed((value) => !value)}
                                            onExit={exitFocusMode}
                                            onZoomIn={zoomCanvasIn}
                                            onZoomOut={zoomCanvasOut}
                                            onFit={fitCanvasContent}
                                        />
                                    ) : null}

                                    <CanvasFileDropOverlay active={fileDropActive} theme={theme} />

                                    {emptyCanvasState}

                                    {!focusMode || focusDockRevealed || tourActive ? (
                                        <CanvasToolbar
                                            selectedCount={selectedNodeIds.size}
                                            workspaceMode={workspaceMode}
                                            canvasTool={canvasTool}
                                            onToolChange={setCanvasTool}
                                            isProjectLinked={Boolean(shortDramaEnabled && currentProject?.projectId)}
                                            canUndo={historyState.canUndo}
                                            canRedo={historyState.canRedo}
                                            appearance={canvasAppearance}
                                            backgroundMode={backgroundMode}
                                            showImageInfo={showImageInfo}
                                            onAddImage={() => createNode(CanvasNodeType.Image)}
                                            onAddVideo={() => createNode(CanvasNodeType.Video)}
                                            onAddAudio={() => createNode(CanvasNodeType.Audio)}
                                            onAddText={() => createNode(CanvasNodeType.Text)}
                                            onChooseStyle={() => setStylePickerOpen(true)}
                                            onAddScript={() => createNode(CanvasNodeType.Script)}
                                            onAddFrame={() => createNode(CanvasNodeType.Frame)}
                                            onAddFolder={createFolder}
                                            onAddDrawing={() => createNode(CanvasNodeType.Drawing)}
                                            onAddExtensionNode={(type) => createNode(type)}
                                            onAddWorkflow={() => createNode(CanvasNodeType.Config)}
                                            onOpenDirector={() => setDirectorTemplateRequest({})}
                                            onUndo={undoCanvas}
                                            onRedo={redoCanvas}
                                            onUpload={() => handleUploadRequest()}
                                            onDelete={() => deleteNodes(new Set(selectedNodeIds))}
                                            onClear={() => setClearConfirmOpen(true)}
                                            onDeselect={deselectCanvas}
                                            onAppearanceChange={applyCanvasAppearance}
                                            onSaveAppearanceDefault={saveCanvasAppearanceDefault}
                                            onBackgroundModeChange={setBackgroundMode}
                                            onShowImageInfoChange={setShowImageInfo}
                                            onOpenMyAssets={() => {
                                                openCanvasAssetLibrary();
                                            }}
                                            onOpenProjectCharacters={() => openProjectAssets("character")}
                                        />
                                    ) : null}
                                    {tourActive ? (
                                        <CanvasOnboardingTour
                                            open={!inlineAuthOpen && !celebrationOpen}
                                            projectId={projectId}
                                            ids={{ text: tourTextNode?.id || null, script: tourScriptNode?.id || null, image: tourImageNode?.id || null, video: tourVideoNode?.id || null }}
                                            state={{
                                                hasText: Boolean(tourTextNode),
                                                textReady: Boolean(tourTextNode?.metadata?.content?.trim()),
                                                hasScript: Boolean(tourScriptNode),
                                                scriptReady: Boolean((tourScriptNode?.metadata?.storyboard?.rows[0]?.imageGenerationPrompt || tourScriptNode?.metadata?.storyboard?.rows[0]?.plotDescription || "").trim()),
                                                hasImage: Boolean(tourImageNode),
                                                imageReady: Boolean(tourImageNode?.metadata?.content),
                                                hasVideo: Boolean(tourVideoNode),
                                                videoReady: Boolean(tourVideoNode?.metadata?.content),
                                            }}
                                            generating={[tourTextNode, tourScriptNode, tourImageNode, tourVideoNode].some((node) => node && isCanvasNodeGenerating(node, runningNodeId))}
                                            onStepChange={onboarding.onStepChange}
                                            onOpenConnectionMenu={openTourConnectionCreateMenu}
                                            onReveal={onboarding.onReveal}
                                            onComplete={() => {
                                                closeTour();
                                                setCelebrationOpen(true);
                                            }}
                                            onClose={closeTour}
                                        />
                                    ) : null}
                                    <CanvasInlineAuthDialog
                                        open={inlineAuthOpen}
                                        onClose={() => {
                                            setInlineAuthOpen(false);
                                            setInlineAuthProceed(null);
                                        }}
                                        onConfirm={async () => {
                                            if (inlineAuthProceed) {
                                                await inlineAuthProceed();
                                            }
                                        }}
                                    />
                                    <CanvasOnboardingCelebrationDialog
                                        open={celebrationOpen}
                                        onClose={() => setCelebrationOpen(false)}
                                        videoUrl={tourVideoNode?.metadata?.content}
                                        usedCredits={initialBalanceRef.current !== null && remainingCredits !== null ? Math.max(1, initialBalanceRef.current - remainingCredits) : 3}
                                        remainingCredits={remainingCredits}
                                        onNextShot={() => {
                                            setCelebrationOpen(false);
                                            closeTour();
                                        }}
                                        onOpenStarterOffer={() => {
                                            window.dispatchEvent(new CustomEvent("dramacanva:open-campaign-offer"));
                                        }}
                                        onOpenInvite={() => {
                                            navigate("/account/referrals");
                                        }}
                                    />
                                </div>

                                {agentCreatedNodes?.length ? <CanvasAgentHUD nodes={nodes.length} edges={connections.length} theme={theme} /> : null}
                                <CanvasAgentActivityStatus canvasId={projectId} ready={projectLoaded && currentProject?.id === projectId} />
                                <CanvasAgentBinding
                                    hidden={versions.open}
                                    canvasId={projectId}
                                    domainProjectId={currentProject?.projectId}
                                    nodeCount={nodes.length}
                                    references={agentMentionReferences}
                                    legacySessions={chatSessions}
                                    prefillPrompt={agentPrefillPrompt}
                                    prefillRequest={agentPrefillRequest}
                                    onRecordDecision={async (id, title, content) => {
                                        const decisionScope = getActiveUserScope();
                                        const node = createCanvasNode(CanvasNodeType.Markdown, getCanvasCenter(), { content, status: NODE_STATUS_SUCCESS });
                                        node.id = id;
                                        node.title = title;
                                        node.width = 420;
                                        node.height = 360;
                                        const next = [...nodesRef.current.filter((existing) => existing.id !== id), node];
                                        nodesRef.current = next;
                                        setNodes(next);
                                        updateProject(projectId, { nodes: next });
                                        await flushCanvasStorePersistence();
                                        if (getActiveUserScope() !== decisionScope) throw new DOMException(currentLocaleText("runtimeSafety.accountChanged"), "AbortError");
                                        if (!(await saveCanvasProject({ requireRemote: true }))) throw new Error(currentLocaleText("canvasExtra.lifecycle.saveFailed"));
                                        if (getActiveUserScope() !== decisionScope) throw new DOMException(currentLocaleText("runtimeSafety.accountChanged"), "AbortError");
                                    }}
                                    onOpen={openAgent}
                                    onFocusNode={(nodeId) => {
                                        if (!nodesRef.current.some((node) => node.id === nodeId)) {
                                            message.info(currentLocaleText("canvasExtra.canvas.nodeMissing"));
                                            return;
                                        }
                                        focusCanvasNode(nodeId);
                                    }}
                                />
                            </div>

                            {angleNode?.metadata?.content && !isCanvasNodeMoving ? (
                                <CanvasNodePanelOverlay
                                    node={angleNode}
                                    viewport={viewport}
                                    containerRef={containerRef}
                                    panelWidth={640}
                                    panelHeight={540}
                                    allowOverflow
                                    dragOffset={dragPreview?.nodeIds.has(angleNode.id) ? { x: dragPreview.x, y: dragPreview.y } : null}
                                    isDragging={isNodeDragging && Boolean(dragPreview?.nodeIds.has(angleNode.id))}
                                >
                                    <CanvasNodeAnglePanel
                                        dataUrl={angleNode.metadata.content}
                                        onClose={() => setAngleNodeId(null)}
                                        onConfirm={(params) => {
                                            void generateAngleNode(angleNode, params);
                                        }}
                                    />
                                </CanvasNodePanelOverlay>
                            ) : null}

                            {lightingNode?.metadata?.content ? (
                                <AppModal flush open centered title={null} closable={false} footer={null} width={720} onCancel={() => setLightingNodeId(null)}>
                                    <CanvasNodeLightingPanel
                                        dataUrl={lightingNode.metadata.content}
                                        onClose={() => setLightingNodeId(null)}
                                        onConfirm={(options, prompt) => {
                                            generateLightingNode(lightingNode, options, prompt);
                                        }}
                                    />
                                </AppModal>
                            ) : null}

                            {emotionNode?.metadata?.content && !isCanvasNodeMoving ? (
                                <CanvasEmotionWorkspace
                                    node={emotionNode}
                                    viewport={viewport}
                                    containerRef={containerRef}
                                    dragOffset={dragPreview?.nodeIds.has(emotionNode.id) ? { x: dragPreview.x, y: dragPreview.y } : null}
                                    isDragging={isNodeDragging && Boolean(dragPreview?.nodeIds.has(emotionNode.id))}
                                    onClose={() => setEmotionNodeId(null)}
                                    onConfirm={(payload: CanvasImageEmotionPayload) => {
                                        void generateEmotionNode(emotionNode, payload);
                                    }}
                                />
                            ) : null}

                            {dialogNode &&
                            !directorNodeId &&
                            !isCanvasImageSourceNode(dialogNode) &&
                            !dialogNode.metadata?.fileUpload &&
                            dialogNode.type !== CanvasNodeType.Script &&
                            dialogNode.type !== CanvasNodeType.BatchTable &&
                            dialogNode.type !== CanvasNodeType.Drawing &&
                            dialogNode.type !== CanvasNodeType.Panorama &&
                            !selectionBox &&
                            !isCanvasNodeMoving ? (
                                <CanvasNodePanelOverlay
                                    node={dialogNode}
                                    viewport={viewport}
                                    containerRef={containerRef}
                                    allowOverflow={dialogNode.type !== CanvasNodeType.Config}
                                    dragOffset={dragPreview?.nodeIds.has(dialogNode.id) ? { x: dragPreview.x, y: dragPreview.y } : null}
                                    isDragging={isNodeDragging && Boolean(dragPreview?.nodeIds.has(dialogNode.id))}
                                >
                                    {renderCanvasNodePanel(dialogNode)}
                                </CanvasNodePanelOverlay>
                            ) : null}

                            {pendingConnectionCreate ? (
                                <CanvasConnectionCreateMenu
                                    pending={pendingConnectionCreate}
                                    viewport={viewport}
                                    viewportSize={size}
                                    containerRef={containerRef}
                                    canCreateDrawing={canCreateDrawingFromConnection}
                                    getDisabledReason={(type) => getConnectionCreateDisabledReason(type, pendingConnectionCreate)}
                                    onCreate={(type) => void createConnectedNode(type, pendingConnectionCreate)}
                                    onUploadFiles={(files) => {
                                        const targetNodeId = pendingConnectionCreate.connection.nodeId;
                                        const position = pendingConnectionCreate.position;
                                        cancelPendingConnectionCreate();
                                        void handleUploadReferenceFiles(targetNodeId, files, position);
                                    }}
                                    onClose={cancelPendingConnectionCreate}
                                />
                            ) : null}

                            {connectionReplaceHover ? (
                                <div
                                    className="pointer-events-none fixed z-[var(--z-dialog-popover)] flex select-none items-center gap-1.5 rounded-full border border-white/15 bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white/90 shadow-[0_8px_24px_rgba(0,0,0,0.4)] backdrop-blur-md transition-all"
                                    style={{
                                        left: connectionReplaceHover.clientX + 14,
                                        top: connectionReplaceHover.clientY + 14,
                                        transform: "translateY(-50%)",
                                    }}
                                >
                                    <ArrowLeftRight className="size-3 text-blue-400" />
                                    <span>{t("canvasExtra.canvas.releaseToReplace")}</span>
                                    <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold text-blue-200">@{connectionReplaceHover.referenceLabel}</span>
                                </div>
                            ) : null}

                            {selectedNodeBounds && !selectionBox && !isCanvasNodeMoving ? (
                                <CanvasProjectSelectionToolbar
                                    anchorRef={selectionBoundsElementRef}
                                    containerRef={containerRef}
                                    count={selectedNodeBounds.count}
                                    selectedVideoCount={selectedVideoNodes.length}
                                    mergingVideos={Boolean(mergeVideoProgress)}
                                    onAlign={alignSelectedNodes}
                                    onArrange={arrangeSelectedNodes}
                                    onCreateStoryboard={createStoryboardGroup}
                                    onCreateReferenceGroup={createReferenceGroup}
                                    onBatchConnect={() => beginBatchConnectionMode(Array.from(selectedNodeIds))}
                                    onMergeVideos={() => void mergeSelectedVideos()}
                                    onSendSelectionToAgent={() => sendSelectionToAgent()}
                                />
                            ) : null}

                            {uploadStatus ? <CanvasUploadStatusToast status={uploadStatus} theme={theme} /> : null}
                            {mergeVideoProgress ? <CanvasMergeStatusToast progress={mergeVideoProgress} theme={theme} /> : null}
                            {lastAgentChange ? (
                                <CanvasOperationChangeToast
                                    change={lastAgentChange}
                                    theme={theme}
                                    onView={viewLastAgentChange}
                                    onUndo={() => {
                                        undoAgentOps();
                                    }}
                                    onClose={dismissLastAgentChange}
                                />
                            ) : null}

                            <CanvasNodeToolbar
                                node={isCanvasNodeMoving || nodeImageSettingsOpen || emotionNodeId || angleNodeId ? null : toolbarNode}
                                workspaceMode={workspaceMode}
                                viewport={viewport}
                                containerRef={containerRef}
                                onKeep={keepNodeToolbar}
                                onLeave={hideNodeToolbar}
                                onInfo={(node) => (node.metadata?.workflowKind === "character" && node.metadata.characterAssetId ? openTextNodeEditor(node) : setInfoNodeId(node.id))}
                                onEditText={openTextNodeEditor}
                                onDecreaseFont={(node) => handleFontSizeChange(node.id, Math.max(10, (node.metadata?.fontSize || 14) - 2))}
                                onIncreaseFont={(node) => handleFontSizeChange(node.id, Math.min(32, (node.metadata?.fontSize || 14) + 2))}
                                onToggleDialog={(node) => setDialogNodeId((current) => (current === node.id ? null : node.id))}
                                onGenerateImage={generateImageFromTextNode}
                                onUpload={(node) => handleUploadRequest(node.id)}
                                onDownload={downloadNodeImage}
                                onSaveAsset={(node) => void saveNodeAsset(node)}
                                onAnnotate={(node) => setAnnotationNodeId(node.id)}
                                onMaskEdit={(node) => setMaskEditNodeId(node.id)}
                                onEmotion={(node) => {
                                    setDialogNodeId(null);
                                    setEmotionNodeId((current) => (current === node.id ? null : node.id));
                                }}
                                onPortraitTexture={openPortraitTextureEditor}
                                onCrop={(node) => setCropNodeId(node.id)}
                                onSplit={(node, params) => void splitImageNode(node, params)}
                                onUpscale={(node) => setUpscaleNodeId(node.id)}
                                onSuperResolve={(node) => setSuperResolveNodeId(node.id)}
                                onAngle={(node) => {
                                    setDialogNodeId(null);
                                    setAngleNodeId((current) => (current === node.id ? null : node.id));
                                }}
                                onLighting={(node) => {
                                    setDialogNodeId(null);
                                    setLightingNodeId((current) => (current === node.id ? null : node.id));
                                }}
                                onPanorama={openPanoramaConfig}
                                onViewImage={(node) => setPreviewNodeId(node.id)}
                                onExtractVideoFrames={openVideoFrameExtractor}
                                onExtractAudioFromVideo={(node) => void extractAudioFromVideo(node)}
                                onDepthCapture={extractVideoDepth}
                                onTrimVideoSegments={openVideoSegmentExtractor}
                                onRemakeVideo={(node) => {
                                    try {
                                        const draft = buildVideoRemakeDraft(node.id, nodesRef.current, connectionsRef.current, effectiveConfig);
                                        setNodes(draft.nodes);
                                        setConnections(draft.connections);
                                        setSelectedNodeIds(new Set([draft.target.id]));
                                        setDialogNodeId(draft.target.id);
                                        if (!draft.target.metadata?.model) message.info(currentLocaleText("canvasNov21.remake.model"));
                                    } catch (error) {
                                        message.error(error instanceof Error ? error.message : currentLocaleText("canvasNov21.remake.unavailable"));
                                    }
                                }}
                                onSubtitles={(node) => setSubtitleNodeId(node.id)}
                                onTimeline={(node) => setTimelineNodeId(node.id)}
                                extractingVideoFrames={toolbarNode?.id === extractingVideoFramesNodeId}
                                extractingAudio={segmentRunningMode === "audio"}
                                trimmingVideo={segmentRunningMode === "video"}
                                onReversePrompt={createImageReversePromptNodes}
                                onRetry={retryCanvasNode}
                                onToggleFreeResize={(node) => toggleNodeFreeResize(node.id)}
                                onToggleLocked={(node) => toggleNodeLocked(node.id)}
                                onDelete={(node) => deleteNodes(new Set([node.id]))}
                            />

                            <CanvasCollaborationLayer
                                canvasId={projectId}
                                scope={canvasStorageScope}
                                enabled={signedIn && projectLoaded}
                                containerRef={containerRef}
                                nodesRef={nodesRef}
                                viewport={viewport}
                                save={saveCanvasProject}
                                persist={persistLocalEdits}
                                onDiscard={(id) => {
                                    if (textEditorNodeId === id) setTextEditorNodeId(null);
                                }}
                                editNodeId={storyboardAssetTarget?.nodeId || textEditorNodeId || scriptEditorNodeId || undefined}
                            />
                            {isMiniMapOpen && !focusMode ? <Minimap nodes={nodes} viewport={viewport} viewportSize={size} canvasContainerRef={containerRef} onViewportPreviewChange={previewViewport} onViewportChange={handleViewportChange} /> : null}

                            {!focusMode ? (
                                <CanvasOverlayLayerContainer
                                    overlayId="asset-tray"
                                    fallbackZIndex="var(--z-panel)"
                                    className="absolute bottom-[calc(var(--canvas-inset-y)+var(--space-16))] left-[var(--canvas-inset-x)] flex items-end gap-2 lg:bottom-[var(--canvas-inset-y)]"
                                    onMouseDown={(event) => event.stopPropagation()}
                                    onPointerDown={(event) => event.stopPropagation()}
                                    onWheel={(event) => event.stopPropagation()}
                                >
                                    <CanvasZoomControls
                                        scale={viewport.k}
                                        containerRef={containerRef}
                                        onScaleChange={setZoomScale}
                                        onFitContent={fitCanvasContent}
                                        onAutoArrange={autoArrangeCanvasNodes}
                                        hideNodeConnections={hideNodeConnections}
                                        onHideNodeConnectionsChange={setHideNodeConnections}
                                        isMiniMapOpen={isMiniMapOpen}
                                        onToggleMiniMap={() => setIsMiniMapOpen((value) => !value)}
                                        onOpenShortcuts={() => setShortcutRequestNonce((value) => value + 1)}
                                    />
                                    <CanvasAssetTray
                                        assetImages={imageAssets}
                                        canvasImages={canvasImageNodes}
                                        showLibrary={!currentProject?.projectId}
                                        activeNodeId={selectedNodeIds.size === 1 ? Array.from(selectedNodeIds)[0] : null}
                                        onInsertAssetImage={(asset) => void createImageAssetNode(asset)}
                                        onFocusCanvasImage={focusCanvasImageNode}
                                    />
                                </CanvasOverlayLayerContainer>
                            ) : null}

                            <CanvasProjectContextMenu
                                menu={contextMenu}
                                node={contextMenuNode}
                                workspaceMode={workspaceMode}
                                isProjectLinked={Boolean(currentProject?.projectId)}
                                canUndo={historyState.canUndo}
                                canRedo={historyState.canRedo}
                                canPaste={hasCopiedNodes || Boolean(navigator.clipboard)}
                                selectedCount={selectedNodeIds.size}
                                screenToCanvas={screenToCanvas}
                                onClose={() => setContextMenu(null)}
                                onAddNode={(type, position) => createNode(type, position)}
                                onAddFolder={createFolder}
                                onChooseStyle={() => setStylePickerOpen(true)}
                                onOpenDirector={(position) => setDirectorTemplateRequest({ position })}
                                onUpload={(nodeId, position) => handleUploadRequest(nodeId, position)}
                                onOpenAssets={openCanvasAssetLibrary}
                                onOpenProjectCharacters={(position) => openProjectAssets("character", position)}
                                onUndo={undoCanvas}
                                onRedo={redoCanvas}
                                onPaste={pasteAtPosition}
                                onCopyNode={(nodeId) => copyNodesToClipboard(new Set([nodeId]))}
                                onCreateGenerationCopy={(nodeId) => duplicateNode(nodeId, "copy")}
                                onDuplicate={duplicateNode}
                                onDeleteNode={(nodeId) => deleteNodes(new Set([nodeId]))}
                                onDeleteConnection={deleteConnection}
                                onSaveAsset={(node) => {
                                    void saveNodeAsset(node);
                                }}
                                onViewMedia={(node) => setPreviewNodeId(node.id)}
                                onEditText={openTextNodeEditor}
                                onOpenDrawing={openDrawingNode}
                                onGenerateImage={generateImageFromTextNode}
                                onCopyContent={(node) => {
                                    void copyNodeContentToClipboard(node);
                                }}
                                onCopyMediaUrl={(node) => {
                                    void copyNodeMediaUrlToClipboard(node);
                                }}
                                onUploadToArkPrivateAsset={confirmUploadNodeImageToArkPrivateAsset}
                                onSetAssetCategory={(nodeId, assetCategory) => handleConfigNodeChange(nodeId, { assetCategory })}
                                onToggleFrame={(node) => handleFrameToggle(node.id)}
                                onSpreadSelection={spreadSelectedNodes}
                                onCopySelection={copySelectedNodes}
                                onDownloadSelection={() => void downloadNodesMedia(nodesRef.current.filter((node) => selectedNodeIds.has(node.id)))}
                                onDeleteSelection={() => deleteNodes(selectedNodeIds)}
                                onSendToAgent={() => sendSelectionToAgent(contextMenu?.type === "node" && selectedNodeIds.size <= 1 ? contextMenu.nodeId : undefined)}
                                onLayerSplit={() => {
                                    if (contextMenu?.type === "node") {
                                        const node = nodes.find((item) => item.id === contextMenu.nodeId);
                                        if (node) openLayerDecomposition(node);
                                    }
                                }}
                                onImageToDirector={() => {
                                    if (contextMenu?.type !== "node") return;
                                    const reference = agentMentionReferences.find((item) => item.nodeId === contextMenu.nodeId);
                                    if (!reference || reference.kind !== "image") {
                                        message.warning(t("previs.imageMissing"));
                                        return;
                                    }
                                    setAgentPrefillRequest((current) => ({
                                        id: (current?.id || 0) + 1,
                                        canvasId: projectId,
                                        text: buildImageToPrevisAgentPrompt(reference),
                                        displayText: buildImageToPrevisDisplayText(),
                                        requiresVision: true,
                                        autoSubmit: true,
                                    }));
                                    openAgent();
                                }}
                            />

                            <CanvasUploadModal open={uploadModalOpen} onClose={closeUploadModal} onUpload={handleUploadFiles} onChooseLibrary={chooseLibraryUpload} />
                            <CanvasUploadSourceModal open={uploadSourceOpen} onClose={closeUploadModal} onComputer={chooseComputerUpload} onLibrary={chooseLibraryUpload} />

                            <input ref={imageInputRef} type="file" accept="image/*,video/*,audio/mpeg,audio/wav,audio/x-wav,.mp3,.wav" className="hidden" onChange={handleImageInputChange} />

                            <CanvasNodeInfoModal
                                node={infoNode}
                                open={Boolean(infoNode)}
                                onClose={() => setInfoNodeId(null)}
                                onMetadataChange={handleConfigNodeChange}
                                onRetry={retryCanvasNode}
                                editGeneration={(node, field) => {
                                    setInfoNodeId(null);
                                    canvasNodeActions.editGeneration?.(node, field);
                                }}
                            />

                            {subtitleNode ? (
                                <CanvasSubtitleDialog
                                    node={subtitleNode}
                                    open={Boolean(subtitleNode)}
                                    projectId={projectId}
                                    config={effectiveConfig}
                                    onClose={() => setSubtitleNodeId(null)}
                                    onSave={(nodeId, patch) => {
                                        handleConfigNodeChange(nodeId, patch);
                                        const currentTimeline = currentProject?.timeline;
                                        if (currentTimeline) {
                                            const next = syncNodeSubtitlesToTimeline(currentTimeline, nodeId, patch.subtitleEntries || []);
                                            if (next !== currentTimeline) updateProject(projectId, { timeline: next });
                                        }
                                    }}
                                />
                            ) : null}

                            {frameNode ? <CanvasVideoFrameDialog node={frameNode} open={Boolean(frameNode)} onClose={closeFrameDialog} onConfirm={(params) => void extractVideoFrames(frameNode, params)} /> : null}

                            {segmentNode && segmentDialogMode ? (
                                <CanvasVideoSegmentDialog
                                    node={segmentNode}
                                    nodes={nodes}
                                    connections={connections}
                                    open={Boolean(segmentNode && segmentDialogMode)}
                                    mode={segmentDialogMode}
                                    config={effectiveConfig}
                                    timeline={currentProject?.timeline || null}
                                    onClose={closeSegmentDialog}
                                    onConfirm={(params) => void handleSegmentConfirm(segmentNode, params)}
                                />
                            ) : null}

                            {timelineNode ? (
                                <Suspense
                                    fallback={
                                        <div className="fixed inset-0 z-[var(--z-toast)] grid place-items-center px-5" style={{ background: theme.canvas.background, color: theme.node.text }}>
                                            <WorkspaceState icon="loading" title={t("canvasExtra.timeline.multiTrackTimeline")} />
                                        </div>
                                    }
                                >
                                    <CanvasTimelineDialog
                                        node={timelineNode}
                                        open={Boolean(timelineNode)}
                                        nodes={nodes}
                                        timeline={currentProject?.timeline || null}
                                        onClose={() => setTimelineNodeId(null)}
                                        onOpenSubtitleDialog={(subNodeId) => {
                                            setTimelineNodeId(null);
                                            setSubtitleNodeId(subNodeId);
                                        }}
                                        onSave={(next) => updateProject(projectId, { timeline: next })}
                                        onSaveSubtitles={(subNodeId, entries) =>
                                            handleConfigNodeChange(subNodeId, {
                                                subtitleEntries: entries,
                                                ...(entries.length ? {} : { subtitleHighlights: [] }),
                                                subtitleUpdatedAt: new Date().toISOString(),
                                            })
                                        }
                                        onOpenAssetLibrary={openTimelineAssetLibrary}
                                        onOpenProjectAssets={() => openProjectAssets("all", undefined, "timeline")}
                                        onUploadLocalFiles={uploadTimelineMedia}
                                        addNodeToTimelineRef={timelineAddNodeRef}
                                        addMediaToTimelineRef={timelineMediaAddRef}
                                        onCreateAssembledNode={createVideoNodeFromBlob}
                                    />
                                </Suspense>
                            ) : null}

                            <CanvasCharacterReferenceModal node={characterReferenceNode} open={Boolean(characterReferenceNode)} onClose={() => setCharacterReferenceNodeId(null)} />

                            {textEditorNode ? (
                                <Suspense
                                    fallback={
                                        <div className="fixed inset-0 z-[var(--z-toast)] grid place-items-center px-5" style={{ background: theme.canvas.background, color: theme.node.text }}>
                                            <WorkspaceState icon="loading" title={t("canvasText.defaultTitle")} />
                                        </div>
                                    }
                                >
                                    <CanvasTextEditorModal
                                        node={textEditorNode}
                                        open
                                        onClose={() => setTextEditorNodeId(null)}
                                        onDraft={(nodeId, draft) => checkpointCanvasTextModal(projectId, nodeId, draft)}
                                        onSave={async (nodeId, title, content, richText) => {
                                            const scope = getActiveUserScope();
                                            if (signedIn) await acquireCanvasNodeEditLease(projectId, nodeId);
                                            if (getActiveUserScope() !== scope) throw new Error(productionText(locale, 23));
                                            setNodes((current) => current.map((node) => (node.id === nodeId ? { ...node, title, metadata: { ...node.metadata, content, richText } } : node)));
                                        }}
                                    />
                                </Suspense>
                            ) : null}

                            {drawingNode ? (
                                <Suspense
                                    fallback={
                                        <div className="fixed inset-0 z-[var(--z-toast)] grid place-items-center px-5" style={{ background: theme.canvas.background, color: theme.node.text }}>
                                            <WorkspaceState icon="loading" title={t("canvasExtra.canvas.loadingDrawingEditor")} description={t("canvasExtra.canvas.loadingDrawingEditorDesc")} />
                                        </div>
                                    }
                                >
                                    <CanvasDrawingEditorModal
                                        node={drawingNode}
                                        projectId={projectId}
                                        open={Boolean(drawingNode)}
                                        onClose={() => setDrawingNodeId(null)}
                                        onSaved={(nodeId, summary) => {
                                            setNodes((current) =>
                                                current.map((node) =>
                                                    node.id === nodeId
                                                        ? {
                                                              ...node,
                                                              metadata: {
                                                                  ...node.metadata,
                                                                  drawingEngine: summary.engine,
                                                                  drawingRevision: summary.revision,
                                                                  drawingUpdatedAt: summary.updatedAt,
                                                                  drawingShapeCount: summary.shapeCount,
                                                                  drawingPageCount: summary.pageCount,
                                                              },
                                                          }
                                                        : node,
                                                ),
                                            );
                                            message.success(currentLocaleText("canvasExtra.canvas.drawingSaved"));
                                        }}
                                    />
                                </Suspense>
                            ) : null}

                            <AiArtCritiqueModal
                                startRequestId={artCritiqueStartRequest && artCritiqueStartRequest.nodeId === artCritiqueNode?.id ? artCritiqueStartRequest.id : undefined}
                                restartRequested={artCritiqueStartRequest?.nodeId === artCritiqueNode?.id && artCritiqueStartRequest?.restart}
                                onRunningChange={(running) => {
                                    artCritiqueRunningRef.current = running;
                                }}
                                node={artCritiqueNode}
                                upstreamNodes={artCritiqueInputs}
                                open={Boolean(artCritiqueNode)}
                                onClose={() => setArtCritiqueNodeId(null)}
                                onUpdateState={(nodeId, state) => handleConfigNodeChange(nodeId, { artCritique: state })}
                            />

                            <CanvasPanoramaConfigModal
                                open={Boolean(panoramaConfigNodeId)}
                                onCancel={() => setPanoramaConfigNodeId(null)}
                                onConfirm={(composedPrompt, config) => {
                                    const node = nodes.find((n) => n.id === panoramaConfigNodeId);
                                    if (node) {
                                        createPanoramaViewerWithConfig(node, composedPrompt, config);
                                    }
                                }}
                                onCopyPrompt={(prompt) => {
                                    void navigator.clipboard?.writeText(prompt).then(() => message.success(currentLocaleText("canvasExtra.canvas.panoramaPromptCopied")));
                                }}
                                previewImageUrl={panoramaConfigNodeId ? nodes.find((n) => n.id === panoramaConfigNodeId)?.metadata?.content : undefined}
                                nodes={nodes}
                            />

                            {storyboardAssetNode && storyboardAssetRow ? (
                                <StoryboardAssetPickerModal
                                    key={`${storyboardAssetNode.id}:${storyboardAssetRow.id}`}
                                    nodes={nodes}
                                    nodeId={storyboardAssetNode.id}
                                    bindings={storyboardAssetBindings}
                                    shotNumber={storyboardAssetRow.shotNumber}
                                    detail={linkedProjectQuery.data}
                                    onClose={() => setStoryboardAssetTarget(null)}
                                    onSave={async (bindings) => {
                                        const scope = getActiveUserScope();
                                        if (signedIn) await acquireCanvasNodeEditLease(projectId, storyboardAssetNode.id);
                                        if (getActiveUserScope() !== scope) throw new Error("canvas_edit_lease_conflict");
                                        const result = replaceStoryboardRowAssets(nodesRef.current, connectionsRef.current, storyboardAssetNode.id, storyboardAssetRow.id, bindings);
                                        setNodes(result.nodes);
                                        setConnections(result.connections);
                                        setStoryboardAssetTarget(null);
                                    }}
                                    onImport={async (payloads) => {
                                        const scope = getActiveUserScope();
                                        if (signedIn) await acquireCanvasNodeEditLease(projectId, storyboardAssetNode.id);
                                        if (getActiveUserScope() !== scope) throw new Error("canvas_edit_lease_conflict");
                                        const before = nodesRef.current.find((node) => node.id === storyboardAssetNode.id);
                                        if (before?.metadata?.locked || !before?.metadata?.storyboard?.rows.some((row) => row.id === storyboardAssetRow.id)) throw new Error(currentLocaleText("canvasExtra.assetModal.assetUnavailable"));
                                        const imported = await Promise.all(
                                            payloads.map(async (payload, index) => {
                                                const existing = payload.assetId ? nodesRef.current.find((node) => node.metadata?.assetId === payload.assetId || node.metadata?.characterAssetId === payload.assetId) : undefined;
                                                const resourceId = payload.kind !== "text" && payload.kind !== "character" ? resourceIdFromStorageKey(payload.storageKey) : "";
                                                const resource = resourceId ? await getStoryboardImportedResource(resourceId) : undefined;
                                                const prepared =
                                                    resource && payload.kind !== "text" && payload.kind !== "character"
                                                        ? {
                                                              ...payload,
                                                              width: resource.width ?? ("width" in payload ? payload.width : undefined),
                                                              height: resource.height ?? ("height" in payload ? payload.height : undefined),
                                                              durationMs: resource.durationMs ?? ("durationMs" in payload ? payload.durationMs : undefined),
                                                              bytes: resource.size,
                                                              mimeType: resource.mimeType,
                                                          }
                                                        : payload;
                                                if (getActiveUserScope() !== scope) throw new Error(currentLocaleText("canvasExtra.assetModal.assetUnavailable"));
                                                const node = existing || (await createAssetPayloadNode(prepared, { x: storyboardAssetNode.position.x - 440, y: storyboardAssetNode.position.y + index * 260 }));
                                                const source = linkedProjectQuery.data?.assets.find((asset) => asset.id === payload.assetId) || useAssetStore.getState().assets.find((asset) => asset.id === payload.assetId);
                                                return source ? { ...node, metadata: { ...node.metadata, assetCategory: storyboardImportedCategory(source.category) } } : node;
                                            }),
                                        );
                                        const target = nodesRef.current.find((node) => node.id === storyboardAssetNode.id);
                                        if (getActiveUserScope() !== scope || target?.metadata?.locked || !target?.metadata?.storyboard?.rows.some((row) => row.id === storyboardAssetRow.id))
                                            throw new Error(currentLocaleText("canvasExtra.assetModal.assetUnavailable"));
                                        const importedById = new Map(imported.map((node) => [node.id, node]));
                                        const next = nodesRef.current.map((node) => importedById.get(node.id) || node);
                                        for (const node of imported) {
                                            if (next.some((current) => current.id === node.id)) continue;
                                            const placed = { ...node, position: findAvailableGenerationGroupPosition(next, node.position, node) };
                                            next.push(placed);
                                            importedById.set(node.id, placed);
                                        }
                                        setNodes(next);
                                        return imported.map((node) => importedById.get(node.id)!);
                                    }}
                                />
                            ) : null}
                            <CanvasScriptEditor
                                node={activeScriptNode}
                                nodes={nodes}
                                connections={connections}
                                batch={activeScriptNode ? visibleGenerationBatch(activeScriptNode) : undefined}
                                onDiscuss={(request) => {
                                    setAgentPrefillRequest((current) => ({
                                        ...request,
                                        id: (current?.id || 0) + 1,
                                        canvasId: projectId,
                                        contextText: request.text,
                                    }));
                                    openAgent();
                                }}
                                onFocusOutput={(nodeId) => {
                                    setScriptEditorNodeId(null);
                                    focusCanvasNode(nodeId);
                                }}
                                onRetryBatchItem={(batchId, itemId) => activeScriptNode && retryFailedBatchItems(activeScriptNode.id, batchId, itemId)}
                                onStopBatch={(batchId) => activeScriptNode && stopRemainingBatchItems(activeScriptNode.id, batchId)}
                                open={Boolean(activeScriptNode)}
                                onClose={() => setScriptEditorNodeId(null)}
                                onUpdateRows={(rows) => activeScriptNode && replaceScriptRows(activeScriptNode.id, rows)}
                                onEditAssets={(rowId) => activeScriptNode && void openStoryboardAssetPicker(activeScriptNode.id, rowId)}
                                onVisibleColumnsChange={(visibleColumns: StoryboardColumn[]) => {
                                    if (!activeScriptNode || !visibleColumns.length) return;
                                    setNodes((prev) =>
                                        prev.map((node) =>
                                            node.id === activeScriptNode.id
                                                ? { ...node, metadata: { ...node.metadata, storyboard: { rows: node.metadata?.storyboard?.rows || [], visibleColumns, referenceNodeIds: node.metadata?.storyboard?.referenceNodeIds || [] } } }
                                                : node,
                                        ),
                                    );
                                }}
                                onGenerateImages={(rowIds) => activeScriptNode && void generateScriptImages(activeScriptNode.id, rowIds)}
                                onGenerateVideos={(rowIds) => {
                                    if (!activeScriptNode) return;
                                    if (activeScriptNode.metadata?.storyboardVideoInputMode === "keyframe") void generateScriptVideos(activeScriptNode.id, rowIds);
                                    else void createAndGenerateScriptVideos(activeScriptNode.id, rowIds);
                                }}
                                onVideoInputModeChange={(storyboardVideoInputMode) => activeScriptNode && handleConfigNodeChange(activeScriptNode.id, { storyboardVideoInputMode })}
                            />

                            {retainedDirectorNodeId && retainedDirectorScene ? (
                                <Suspense
                                    fallback={
                                        <div className="fixed inset-0 z-[var(--z-toast)] grid place-items-center px-5" style={{ background: theme.canvas.background, color: theme.node.text }}>
                                            <WorkspaceState icon="loading" title={t("canvasExtra.canvas.loadingDirector")} description={t("canvasExtra.canvas.loadingDirectorDesc")} />
                                        </div>
                                    }
                                >
                                    <CanvasDirectorWorkbench
                                        key={`${projectId}:${retainedDirectorNodeId}`}
                                        keepViewport
                                        open={Boolean(directorNodeId && activeDirectorScene)}
                                        canvasId={projectId}
                                        scene={retainedDirectorScene}
                                        nodes={nodes}
                                        connections={connections}
                                        nodeId={retainedDirectorNodeId}
                                        imageNodes={nodes.filter((node) => (node.type === CanvasNodeType.Image || node.metadata?.workflowKind === "character") && Boolean(node.metadata?.content))}
                                        onClose={() => {
                                            setClosedDirector({ projectId, nodeId: retainedDirectorNodeId, sceneId: retainedDirectorScene.id });
                                            setDirectorNodeId(null);
                                        }}
                                        onChange={saveDirectorScene}
                                        onPrevis={saveDirectorPrevis}
                                        onApply={async (output) => {
                                            await applyDirectorOutput(output);
                                            await flushWorldEngine();
                                        }}
                                        onAddToCanvas={async (output) => {
                                            await addPrevisToCanvas(output);
                                            if (output.kind === "screenshot") await flushWorldEngine();
                                        }}
                                        onPrompt={async (scene, shot, prompt) => {
                                            await applyDirectorPrompt(scene, shot, prompt);
                                            await flushWorldEngine();
                                        }}
                                        onDeleteImageNode={(nodeId) => deleteNodes(new Set([nodeId]))}
                                        onFlush={flushWorldEngine}
                                        onboardingScope={directorOnboardingScope}
                                    />
                                </Suspense>
                            ) : null}

                            <CanvasVersionCompareModal
                                open={Boolean(versionCompareRootId)}
                                versions={versionCompareNodes}
                                onClose={() => setVersionCompareRootId(null)}
                                onSetPrimary={setPrimaryVersion}
                                onFocus={(nodeId) => {
                                    setVersionCompareRootId(null);
                                    focusCanvasNode(nodeId);
                                }}
                            />

                            <CanvasProjectMediaDialogs
                                layerDecompositionNode={layerDecompositionNode}
                                onCloseLayerDecomposition={() => setLayerDecompositionNodeId(null)}
                                onLayerDecomposition={decomposeImageLayers}
                                cropNode={cropNode}
                                annotationNode={annotationNode}
                                maskEditNode={maskEditNode}
                                upscaleNode={upscaleNode}
                                onCloseCrop={() => setCropNodeId(null)}
                                onCloseAnnotation={() => setAnnotationNodeId(null)}
                                onCloseMaskEdit={() => setMaskEditNodeId(null)}
                                onCloseUpscale={() => setUpscaleNodeId(null)}
                                onCrop={(node, crop) => void cropImageNode(node, crop)}
                                onAnnotate={(node, dataUrl) => void saveAnnotatedImageNode(node, dataUrl)}
                                onMaskEdit={(node, payload) => void maskEditImageNode(node, payload)}
                                onUpscale={(node, params) => void upscaleImageNode(node, params)}
                                config={effectiveConfig}
                            />

                            <CanvasProjectStatusDialogs
                                theme={theme}
                                task={taskDetail}
                                taskLogs={taskDetailLogs}
                                taskLoading={taskDetailLoading}
                                onCloseTask={() => setTaskDetail(null)}
                                onCancelTask={cancelCanvasTask}
                                superResolveNode={superResolveNode}
                                onCloseSuperResolve={() => setSuperResolveNodeId(null)}
                                previewNode={previewNode}
                                onClosePreview={() => setPreviewNodeId(null)}
                                clearConfirmOpen={clearConfirmOpen}
                                onCancelClear={() => setClearConfirmOpen(false)}
                                onConfirmClear={clearCanvas}
                            />

                            <AssetPickerModal
                                open={assetPickerOpen}
                                multiple={!assetPickerNodeId && (assetPickerFromUpload || assetInsertScope === "canvas")}
                                mediaKind={assetPickerMediaKind}
                                onInsert={
                                    assetPickerFromUpload
                                        ? async (payloads) => {
                                              await handleAssetsInsert(payloads);
                                          }
                                        : handleLibraryAssetsInsert
                                }
                                onClose={closeAssetPicker}
                            />
                            <CanvasProjectAssetModal
                                open={projectAssetOpen}
                                detail={linkedProjectQuery.data}
                                initialCategory={projectAssetInitialCategory}
                                initialFolderId={projectAssetInitialFolderId}
                                onClose={closeProjectAssets}
                                onInsert={handleTimelineProjectAssetsInsert}
                                onInsertFolder={projectAssetScope === "canvas" ? handleProjectFolderInsert : undefined}
                            />
                        </section>
                        {versions.preview ? <CanvasVersionPreview key={versions.preview.key} preview={versions.preview} onReturn={versions.returnToCurrent} onShowVersions={versions.show} /> : null}
                    </div>
                </CanvasOverlayLayerProvider>
                <CanvasVersionHistory history={versions} />
            </main>
        </>
    );
}
