import { DirectorOrientation } from "./director-orientation";
import { directorCameraMotionFrames } from "@/lib/canvas/director/director-camera-motion";
import { directorPropLabel, createDirectorPropPreset, DIRECTOR_SCENE_PRESETS, createDirectorScenePreset, DIRECTOR_MANNEQUIN_PRESETS, createDirectorMannequinPreset } from "@/lib/canvas/director/director-presets";
import DirectorPlanViewport from "./director-plan-viewport";
import { DirectorWorkbenchTimeline } from "./director-workbench-timeline";
import { DirectorContextPanel } from "./director-context-panel";
import { useDirectorRouteEditing } from "./use-director-route-editing";
import { useDirectorCameraPathEditing } from "./use-director-camera-path-editing";
import { useDirectorPrevisV2 } from "@/hooks/use-director-previs-v2";
import { DIRECTOR_ACTOR_DRAG_TYPE, DirectorActorDrawer, DirectorPropDrawer } from "./director-placement-drawer";
import { DirectorActorRemovalList } from "./director-segment-inspector";
import { addDirectorSceneObject, createDirectorDrawerActor, removeDirectorActor } from "@/lib/canvas/director/director-segment-settings";
import { DirectorWorkbenchSaveStatus } from "./director-workbench-save-status";
import { sampleDirectorTransform } from "@/lib/canvas/director/director-playback";
import { currentLocaleText as t } from "@/i18n/current-locale-text";
import { resolveAssetIngest } from "@/services/asset-archive";
import { rememberDirectorStage, switchDirectorShot, sampleDirectorLight, recordDirectorLight } from "@/lib/canvas/director/director-timeline";
import { useI18n } from "@/i18n/use-i18n";
import { cameraMoveOptions, shotSizeOptions } from "./director-inspectors";
import { snapDirectorTime, resolveDirectorKeyframeRecord, resolveDirectorObjectTransformEdit, resolveDirectorCameraMoveKeyframes, resolveDirectorCameraAlignment } from "@/lib/canvas/director/director-animation-semantics";
import {
    interpolateDirectorTransform,
    touchDirectorScene,
    createDirectorObject,
    createDirectorActor,
    DIRECTOR_ACTOR_COLORS,
    resolveDirectorActorColor,
    createDirectorModel,
    createDirectorBillboard,
    createDirectorCamera,
    createDirectorLight,
    upsertDirectorBoneKeyframe,
    removeDirectorSceneKeyframe,
    setDirectorSceneKeyframeEasing,
    directorPoseLabel,
    directorBoneLabel,
    directorActorProfileForArchetype,
    directorActorArchetypeLabel,
    uniqueDirectorName,
    resolveDirectorAspectRatio,
} from "@/lib/canvas/director/director-scene";
import {
    type DirectorObject,
    type DirectorCamera,
    type DirectorLight,
    type DirectorShot,
    type DirectorHumanoidBone,
    type DirectorQuat,
    type DirectorKeyframeDeleteTarget,
    type DirectorKeyframeEasing,
    type DirectorRig,
    type DirectorShotSize,
    type DirectorActorProfile,
} from "@/types/director";
import { resolveDirectorPlacementAnchor, resolveDirectorPlacement, type DirectorGroundPoint } from "@/lib/canvas/director/director-placement";
import { uploadMediaFile } from "@/services/file-storage";
import { saveRemoteUserDataNow, localSavedRemotePendingMessage } from "@/services/user-data-sync";
import {
    Camera,
    Lightbulb,
    LampDesk,
    UserRound,
    Box,
    Circle,
    Cuboid,
    Square,
    FileUp,
    X,
    Undo2,
    Redo2,
    Video,
    Save,
    Plus,
    WandSparkles,
    BoxSelect,
    Image as ImageIcon,
    Users,
    Route,
    Search,
    Maximize2,
    Minimize2,
    Eye,
    EyeOff,
    Lock,
    Unlock,
    Layers,
    Boxes,
    ChevronLeft,
    ChevronRight,
    Check,
    Edit2,
    Hand,
    MousePointer2,
    Rotate3d,
    Scale3d,
    ArrowLeft,
    SlidersHorizontal,
} from "lucide-react";
import { PropSilhouette } from "./director-prop-icons";
import { DirectorCameraPip } from "./director-camera-pip";
import { DirectorCanvasDock } from "./director-canvas-dock";
import { Dropdown } from "antd";
import { nanoid } from "nanoid";
import { type DirectorShortcutAction, resolveDirectorShortcut, blocksDirectorShortcut, releaseDirectorFocusAfterPointer } from "@/lib/canvas/director/director-shortcuts";
import { Euler, Vector3, type AnimationClip } from "three";
import { compileDirectorPrompt } from "@/lib/canvas/director/director-prompt-compiler";
import { Select } from "antd";
import { DirectorViewport } from "./director-viewport";
import { CanvasDirectorOnboarding } from "@/components/canvas/director/canvas-director-onboarding";
import { App, type MenuProps, Input, Button } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent, type KeyboardEvent } from "react";
import { useDirectorWindow } from "./use-director-window";
import { DIRECTOR_WINDOW_EDGES } from "@/lib/canvas/director/director-window";
import { type DirectorViewportHandle } from "@/components/canvas/director/director-viewport";
import { computePrevisSequenceFingerprint } from "@/lib/canvas/director/director-previs-cache";
import { canvasThemes } from "@/lib/canvas-theme";
import { type DirectorTransaction, createDirectorTransaction, installDirectorTerminalListeners } from "@/lib/canvas/director/director-gesture-transaction";
import { buildDirectorPathKeyframes } from "@/lib/canvas/director/director-path";
import { recordDirectorDiagnostic } from "@/lib/canvas/director/director-diagnostics-recorder";
import { shouldReinitializeDirectorSession, isDirectorOutputSnapshotCurrent } from "@/lib/canvas/director/director-session";
import { isDirectorPreviewRequestForWorkbench, directorPreviewRequestKey, pendingDirectorPreview, consumeDirectorPreview, type DirectorPreviewRequest } from "@/lib/canvas/director/director-preview";
import { describeDirectorSaveStatus, shouldOfferDirectorDraftRecovery, shouldBlockDirectorUnload, resolveDirectorCloseOutcome } from "@/lib/canvas/director/director-save-wiring";
import { useDirectorSaveCoordinator } from "@/components/canvas/director/use-director-save-coordinator";
import "./canvas-director-workbench.css";
import "./director-workbench-layout.css";
import { DIRECTOR_WORKBENCH_LAYOUT, directorWorkbenchFrameAtTime, directorWorkbenchLayoutMode, directorWorkbenchSegments, directorWorkbenchSequence, resolveDirectorWorkbenchFrame } from "@/lib/canvas/director/director-workbench-layout";
import { frameAtElapsed, resolvePlaybackFrame } from "@/lib/canvas/director/director-previs-clock";
import { getPrevisTotalFrames, timeToFrame } from "@/lib/canvas/director/director-previs-sequence";
import { useAssetStore, type ModelAsset } from "@/stores/use-asset-store";
import { useDirectorWorkbenchStore } from "@/stores/canvas/use-director-workbench-store";
import { DIRECTOR_MODES, directorModeCapabilities } from "@/lib/canvas/director/director-modes";

import type { CanvasNodeData, CanvasConnection } from "@/types/canvas";
import { directorSceneForShot, rememberDirectorActors } from "@/lib/canvas/director/director-storyboard";
import { DirectorDescriptionForm } from "./director-description-form";
import { DirectorPlanForm } from "./director-plan-form";
import type { DirectorCameraMove, DirectorRenderMode, DirectorScene, DirectorSceneOutput, DirectorTransform, DirectorVec3 } from "@/types/director";
export { cameraMoveOptions, poseOptions, shotSizeOptions } from "./director-inspectors";

// Scene controls finish their drags on document/window. The outer canvas
// never received their pointerdown, so these continuations belong to the scene.
function containWorkbenchDrag(event: PointerEvent) {
    if (!(event.target instanceof Element && event.target.closest(".director-viewport-shell"))) event.stopPropagation();
}

export function CanvasDirectorWorkbench({
    open,
    canvasId,
    scene,
    imageNodes,
    nodes = imageNodes,
    connections = [],
    nodeId,
    onboardingScope,
    onClose,
    onChange,
    onApply,
    onDeleteImageNode,
    onFlush,
    onThumbnail,
    onPrevis,
}: {
    open: boolean;
    canvasId?: string;
    scene: DirectorScene | null;
    imageNodes: CanvasNodeData[];
    nodes?: CanvasNodeData[];
    connections?: CanvasConnection[];
    nodeId?: string;
    onboardingScope: string;
    onClose: () => void;
    onChange: (scene: DirectorScene) => void;
    onApply: (output: DirectorSceneOutput) => Promise<void>;
    onDeleteImageNode: (nodeId: string) => void;
    onFlush?: () => void | Promise<void>;
    onThumbnail?: (frame: Blob, scene: DirectorScene, shot: DirectorShot) => Promise<void>;
    onPrevis?: (scene: DirectorScene, shot: DirectorShot) => void;
}) {
    useI18n();
    const previsV2 = useDirectorPrevisV2();
    const { message, modal } = App.useApp();
    const theme = canvasThemes.dark;
    const isDark = true;
    const directorWindow = useDirectorWindow(onboardingScope);
    const effectiveCanvasId = useMemo(() => {
        const explicit = canvasId?.trim();
        if (explicit) return explicit;
        if (typeof window === "undefined") return undefined;
        const match = window.location.pathname.match(/^\/canvas\/([^/]+)/u);
        return match ? decodeURIComponent(match[1]) : undefined;
    }, [canvasId]);
    const viewportRef = useRef<DirectorViewportHandle>(null);
    const pipCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const framedOnOpenRef = useRef(false);
    const modelInputRef = useRef<HTMLInputElement>(null);
    const [draft, setDraft] = useState<DirectorScene | null>(null);
    const [history, setHistory] = useState<DirectorScene[]>([]);
    const [future, setFuture] = useState<DirectorScene[]>([]);
    const [saving, setSaving] = useState(false);
    const [outputFailure, setOutputFailure] = useState<{ error: unknown; recording: boolean } | null>(null);
    const [recording, setRecording] = useState(false);
    const [loopPlayback, setLoopPlayback] = useState(true);
    const [lastClayExport, setLastClayExport] = useState<{ shotId: string; at: number } | null>(null);
    const [trajectoryDrawing, setTrajectoryDrawing] = useState(false);
    const [inspectorOpen, setInspectorOpen] = useState(false);
    const [scenePanelOpen, setScenePanelOpen] = useState(false);
    // 人物和素材共用固定宽度区域，窄屏属性面板由 inspectorOpen 控制。
    const [sceneDocked, setSceneDocked] = useState(true);
    const [inspectorDocked, setInspectorDocked] = useState(true);
    const [leftPanelTab, setLeftPanelTab] = useState<"scene" | "assets" | "actors">("assets");
    useEffect(() => { if (!previsV2 && leftPanelTab === "actors") setLeftPanelTab("scene"); }, [previsV2, leftPanelTab]);
    const [assistOpen, setAssistOpen] = useState(false);
    const [assetQuery, setAssetQuery] = useState("");
    const [assetCategory, setAssetCategory] = useState<string>("actors");
    const [editingEntityId, setEditingEntityId] = useState<string | null>(null);
    const [editingEntityName, setEditingEntityName] = useState("");
    const [lockedIds, setLockedIds] = useState<Set<string>>(() => new Set());
    const layoutMode = directorWorkbenchLayoutMode(directorWindow.width);
    const compactLayout = layoutMode === "drawer";
    const sceneTitleRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (open && draft) directorWindow.rootRef.current?.focus({ preventScroll: true });
    }, [open, draft?.id]);
    const [onboardingRestartSignal, setOnboardingRestartSignal] = useState(0);
    const mode = useDirectorWorkbenchStore((state) => state.mode);
    const setMode = useDirectorWorkbenchStore((state) => state.setMode);
    const viewMode = useDirectorWorkbenchStore((state) => state.viewMode);
    const setViewMode = useDirectorWorkbenchStore((state) => state.setViewMode);
    const selectedObjectId = useDirectorWorkbenchStore((state) => state.selectedObjectId);
    const selectedLightId = useDirectorWorkbenchStore((state) => state.selectedLightId);
    const transformMode = useDirectorWorkbenchStore((state) => state.transformMode);
    const renderMode = useDirectorWorkbenchStore((state) => state.renderMode);
    const playhead = useDirectorWorkbenchStore((state) => state.playhead);
    const playing = useDirectorWorkbenchStore((state) => state.playing);
    const selectedBone = useDirectorWorkbenchStore((state) => state.selectedBone);
    const autoKey = useDirectorWorkbenchStore((state) => state.autoKey);
    const sequencerHeight = useDirectorWorkbenchStore((state) => state.sequencerHeight);
    const sequencerVisible = useDirectorWorkbenchStore((state) => state.sequencerVisible);
    const setSelectedObjectId = useDirectorWorkbenchStore((state) => state.setSelectedObjectId);
    const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
    const [sceneQuery, setSceneQuery] = useState("");
    const setSelectedLightId = useDirectorWorkbenchStore((state) => state.setSelectedLightId);
    const changeTransformMode = useDirectorWorkbenchStore((state) => state.setTransformMode);
    const [handTool, setHandTool] = useState(false);
    const panView = handTool && viewMode === "free" && !trajectoryDrawing;
    const setTransformMode = useCallback((mode: typeof transformMode) => {
        setHandTool(false);
        changeTransformMode(mode);
    }, [changeTransformMode]);
    const setRenderMode = useDirectorWorkbenchStore((state) => state.setRenderMode);
    const setPlayhead = useDirectorWorkbenchStore((state) => state.setPlayhead);
    const setPlaying = useDirectorWorkbenchStore((state) => state.setPlaying);
    const setSelectedBone = useDirectorWorkbenchStore((state) => state.setSelectedBone);
    const setAutoKey = useDirectorWorkbenchStore((state) => state.setAutoKey);
    const setSequencerHeight = useDirectorWorkbenchStore((state) => state.setSequencerHeight);
    const setSequencerVisible = useDirectorWorkbenchStore((state) => state.setSequencerVisible);
    const resetWorkbench = useDirectorWorkbenchStore((state) => state.reset);
    const stopDirectorEntityPointer = useCallback((event: MouseEvent | PointerEvent) => {
        event.stopPropagation();
    }, []);
    const selectSceneObject = useCallback(
        (id: string) => {
            setSelectedObjectId(id);
            setSelectedCameraId(null);
            setSelectedBone(null);
            setInspectorOpen(true);
            setInspectorDocked(true);
        },
        [setSelectedBone, setSelectedObjectId],
    );
    const selectSceneCamera = useCallback(
        (id: string) => {
            setSelectedObjectId(null);
            setSelectedLightId(null);
            setSelectedCameraId(id);
            setSelectedBone(null);
            // CAM hides camera gizmos; keep the editable scene view so the selected camera is visible.
            setViewMode("free");
            setInspectorOpen(true);
            setInspectorDocked(true);
        },
        [setSelectedBone, setSelectedLightId, setSelectedObjectId, setViewMode],
    );
    const assets = useAssetStore((state) => state.assets);
    const selectSceneLight = (id: string) => {
        setSelectedObjectId(null);
        setSelectedCameraId(null);
        setSelectedLightId(id);
        setInspectorOpen(true);
        setInspectorDocked(true);
    };
    const addAsset = useAssetStore((state) => state.addAsset);
    const modelAssets = useMemo(() => assets.filter((asset): asset is ModelAsset => asset.kind === "model"), [assets]);

    const capabilities = directorModeCapabilities(mode);
    const renderModeOptions = DIRECTOR_RENDER_MODE_LABELS.filter((option) => capabilities.renderModes.includes(option.value));

    const draftRef = useRef<DirectorScene | null>(null);
    const stagedRef = useRef<DirectorTransaction | null>(null);
    const initializedSceneIdRef = useRef<string | null>(null);
    const onChangeRef = useRef(onChange);
    const onFlushRef = useRef(onFlush);
    useEffect(() => {
        onChangeRef.current = onChange;
        onFlushRef.current = onFlush;
    }, [onChange, onFlush]);

    const closingRef = useRef(false);
    const recoveryPromptedRef = useRef<string | null>(null);
    const [retrying, setRetrying] = useState(false);
    const handledPreviewRequestsRef = useRef(new Set<string>());

    // 按 scene.id 持有唯一 coordinator：flush 先把 request.scene 写回项目，再等持久化完成。
    const saveController = useDirectorSaveCoordinator({
        sceneId: scene?.id ?? null,
        initialScene: scene,
        persistScene: (next) => onChangeRef.current(next),
        flushPersistence: () => onFlushRef.current?.(),
    });
    const saveControllerRef = useRef(saveController);
    saveControllerRef.current = saveController;
    const saveIndicator = describeDirectorSaveStatus(saveController.progress);

    const retrySave = async () => {
        setRetrying(true);
        try {
            if (await saveController.retry()) {
                recordDirectorDiagnostic("DIRECTOR_SAVE_RETRY_RECOVERED", { sceneId: draftRef.current?.id, revision: saveController.progress.revision, userInitiated: true });
                message.success(t("canvasExtra.directorWB.savedToProject"));
                return;
            }
            // 只有真的存在合法本地候选才敢说草稿已保留。
            const draftStored = Boolean(saveController.restoreCandidate());
            recordDirectorDiagnostic("DIRECTOR_SAVE_RETRY_FAILED", { sceneId: draftRef.current?.id, revision: saveController.progress.revision, draftStored, userInitiated: true });
            if (!draftStored) recordDirectorDiagnostic("DIRECTOR_SAVE_DRAFT_UNAVAILABLE", { sceneId: draftRef.current?.id, revision: saveController.progress.revision });
            if (draftStored) message.error(t("canvasExtra.directorWB.remoteSaveLocalDraft"));
            else message.error(t("previs.v165.message008"));
        } finally {
            setRetrying(false);
        }
    };

    const writeDraft = useCallback((next: DirectorScene | null) => {
        draftRef.current = next;
        setDraft(next);
    }, []);

    // 播放、逐帧、拖动和节点入口共用同一段边界与镜头切换路径。
    const seekGlobalFrame = useCallback((frame: number) => {
        const current = draftRef.current;
        if (!current) return;
        const target = resolveDirectorWorkbenchFrame(current, frame);
        if (!target) return;
        if (target.shotId && target.shotId !== current.activeShotId) writeDraft(current.previs?.segments.some((segment) => !segment.legacyShotId) ? { ...current, activeShotId: target.shotId } : switchDirectorShot(current, target.shotId));
        setPlayhead(target.time);
    }, [setPlayhead, writeDraft]);

    const togglePlayback = useCallback(() => {
        const current = draftRef.current;
        if (!current) return;
        const state = useDirectorWorkbenchStore.getState();
        const totalFrames = getPrevisTotalFrames(directorWorkbenchSequence(current));
        if (!totalFrames) return;
        if (!state.playing && directorWorkbenchFrameAtTime(current, current.activeShotId, state.playhead) === totalFrames - 1) seekGlobalFrame(0);
        setPlaying(!state.playing);
    }, [seekGlobalFrame, setPlaying]);

    /**
     * 仅镜像当前 draft 到项目 directorScenes，不产生 canonical 提交。
     * 用于取消预览、idle pagehide、卸载兜底 —— 这些都不是新的用户改动。
     */
    const mirrorDraft = useCallback(() => {
        const current = draftRef.current;
        if (!current || initializedSceneIdRef.current !== current.id) return;
        onChangeRef.current(current);
    }, []);

    /** 真实 canonical 提交：先交给 coordinator（本地草稿 + 远端保存），再镜像到项目。 */
    const commitDraft = useCallback(() => {
        const current = draftRef.current;
        if (!current || initializedSceneIdRef.current !== current.id) return;
        saveControllerRef.current?.commitScene(current);
        onChangeRef.current(current);
    }, []);

    const writeAndPublish = useCallback(
        (next: DirectorScene) => {
            // 预演保留全局动作；段内舞台与 actorStates 由编译器统一派生。
            if (!next.previs?.segments.some((segment) => !segment.legacyShotId)) {
                next = rememberDirectorActors(next);
                next = rememberDirectorStage(next);
            }
            writeDraft(next);
            saveControllerRef.current?.commitScene(next);
            onChangeRef.current(next);
            return next;
        },
        [writeDraft],
    );

    const previouslyPlaying = useRef(false);
    useEffect(() => {
        if (previouslyPlaying.current && !playing) commitDraft();
        previouslyPlaying.current = playing;
    }, [playing, commitDraft]);

    // 会话初始化只认 scene id：同 id 的父级镜像回流不得重建会话。
    useEffect(() => {
        if (!open || !scene) return;
        if (!shouldReinitializeDirectorSession({ initializedSceneId: initializedSceneIdRef.current, nextSceneId: scene.id })) return;
        const next = structuredClone(scene);
        next.objects = next.objects.map((object) => (object.kind === "actor" || object.primitive === "character" ? { ...object, color: resolveDirectorActorColor(object.color), archetype: object.archetype || "adult" } : object));
        next.shots = next.shots.map((shot) => ({ ...shot, fps: shot.fps || 24 }));
        stagedRef.current?.end("cancel");
        initializedSceneIdRef.current = scene.id;
        writeDraft(next);
        setHistory([]);
        setFuture([]);
        const entry = useDirectorWorkbenchStore.getState().openTarget;
        resetWorkbench();
        if (scene.cameras.some(camera => (camera.keyframes?.length ?? 0) > 1)) {
            setMode("animate");
            setSequencerVisible(true);
        }
        if (entry?.sceneId === scene.id) seekGlobalFrame(entry.globalFrame);
        if (scene.shots.some((shot) => shot.sourceStoryboardRowId)) {
            setViewMode("camera");
            useDirectorWorkbenchStore.getState().setRenderMode("clay");
        }
    }, [open, resetWorkbench, scene, writeDraft, setViewMode, seekGlobalFrame, setMode, setSequencerVisible]);

    // 父级项目收到 Agent 的预演台语义补丁后，scene.id 不变但 updatedAt 会变化；
    // 不能只按 scene.id 忽略，否则打开着的工作台永远看不到 Agent 的修改。
    useEffect(() => {
        if (!open || !scene || initializedSceneIdRef.current !== scene.id) return;
        const current = draftRef.current;
        if (!current || scene.updatedAt === current.updatedAt) return;
        stagedRef.current?.end("cancel");
        const next = structuredClone(scene);
        writeDraft(next);
        setHistory([]);
        setFuture([]);
        setSelectedObjectId(null);
        setSelectedLightId(null);
        setSelectedBone(null);
        setPlayhead(0);
        message.info(t("previs.v165.message009"));
    }, [message, open, scene, setPlayhead, setSelectedBone, setSelectedLightId, setSelectedObjectId, writeDraft]);

    // 首次打开自动取景（frame all）
    useEffect(() => {
        if (open && draft && !draft.editorView && !framedOnOpenRef.current) {
            framedOnOpenRef.current = true;
            const timer = setTimeout(() => {
                viewportRef.current?.frameScene();
            }, 350);
            return () => clearTimeout(timer);
        }
        if (!open) {
            framedOnOpenRef.current = false;
        }
    }, [open, draft?.id]);

    // 打开会话时检查合法本地恢复候选：同一场景只提示一次，恢复/放弃都必须有明确结果。
    useEffect(() => {
        if (!open || !scene) return;
        if (recoveryPromptedRef.current === scene.id) return;
        recoveryPromptedRef.current = scene.id;

        const controller = saveControllerRef.current;
        const candidate = controller?.restoreCandidate() ?? null;
        if (!controller || !candidate) return;
        if (!shouldOfferDirectorDraftRecovery({ candidate, authoritativeScene: scene })) return;

        modal.confirm({
            title: t("canvasExtra.directorWB.draftFoundTitle"),
            content: t("previs.v165.message255", { p0: candidate.revision }),
            okText: t("canvasExtra.directorWB.draftRestoreOk"),
            cancelText: t("canvasExtra.directorWB.draftDiscardCancel"),
            closable: false,
            mask: { closable: false },
            keyboard: false,
            onOk: () => {
                if (!controller.restoreDraft(candidate)) {
                    message.error(t("canvasExtra.directorWB.draftRestoreFailed"));
                    return;
                }
                writeDraft(candidate.scene);
                message.success(t("canvasExtra.directorWB.draftRestored"));
            },
            onCancel: () => {
                if (controller.discardDraft()) message.success(t("canvasExtra.directorWB.draftDiscarded"));
                else message.error(t("canvasExtra.directorWB.draftDiscardFailed"));
            },
        });
    }, [message, modal, open, scene, writeDraft]);

    const activeShot = draft?.shots?.find((item) => item.id === draft.activeShotId) || draft?.shots?.[0] || null;
    const globalFrame = draft ? directorWorkbenchFrameAtTime(draft, activeShot?.id, playhead) : 0;
    const playbackSequence = useMemo(() => draft ? directorWorkbenchSequence(draft) : null, [draft]);
    // 单镜头导出仍在该镜头内录制；交互播放始终跨全部段落。
    const clockFps = recording ? activeShot?.fps ?? 24 : playbackSequence?.fps ?? 24;
    const clockTotalFrames = recording ? Math.round((activeShot?.duration ?? 0) * clockFps) : playbackSequence ? getPrevisTotalFrames(playbackSequence) : 0;
    const activeCamera = draft?.cameras?.find((item) => item.id === activeShot?.cameraId) || draft?.cameras?.[0] || null;
    useEffect(() => {
        const cameras = draft?.cameras || [];
        if (!cameras.length) {
            setSelectedCameraId(null);
            return;
        }
        if (!selectedCameraId || !cameras.some((camera) => camera.id === selectedCameraId)) {
            setSelectedCameraId(null);
        }
    }, [activeCamera?.id, draft?.cameras, selectedCameraId]);
    useEffect(() => {
        setSelectedCameraId(null);
    }, [activeShot?.id, activeShot?.cameraId]);
    const compiledPrompt = useMemo(() => (draft && activeShot ? compileDirectorPrompt(draft, activeShot) : ""), [activeShot, draft]);
    const selectedObject = draft?.objects?.find((item) => item.id === selectedObjectId) || null;
    const selectedLightSource = draft?.lights?.find((item) => item.id === selectedLightId) || null;
    const selectedLight = selectedLightSource ? sampleDirectorLight(selectedLightSource, playhead) : null;
    const selectedCamera = draft?.cameras?.find((item) => item.id === selectedCameraId) || null;
    const inspectorCamera = selectedCamera || activeCamera;
    // 写入关键帧的目的时间用吸附值；取值/显示/手势起点一律用 raw playhead，
    // 否则处在两个帧格之间时 AutoKey OFF 的增量会从错误起点计算而产生漂移。
    const snappedPlayhead = snapDirectorTime(playhead, activeShot?.fps || 24);
    const selectedObjectRendered = selectedObject ? sampleDirectorTransform(selectedObject.transform, selectedObject.keyframes, playhead, selectedObject.motionPath) : null;

    useEffect(() => {
        const current = draftRef.current;
        if (!open || !playing || !current || !clockTotalFrames) return;
        let request = 0;
        const startedAt = performance.now();
        const localTime = useDirectorWorkbenchStore.getState().playhead;
        const startFrame = recording ? timeToFrame(localTime, clockFps) : directorWorkbenchFrameAtTime(current, current.activeShotId, localTime);
        let lastFrame = startFrame;
        const tick = (now: number) => {
            const next = resolvePlaybackFrame(frameAtElapsed({ startFrame, elapsedMs: now - startedAt, fps: clockFps, rate: 1 }), clockTotalFrames, recording || loopPlayback);
            if (next.frame !== lastFrame) {
                lastFrame = next.frame;
                if (recording) setPlayhead(next.frame / clockFps);
                else seekGlobalFrame(next.frame);
            }
            if (next.ended) setPlaying(false);
            else request = requestAnimationFrame(tick);
        };
        request = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(request);
    }, [open, playing, clockFps, clockTotalFrames, loopPlayback, recording, seekGlobalFrame, setPlayhead, setPlaying]);

    const commit = useCallback(
        (updater: (current: DirectorScene) => DirectorScene) => {
            // 普通提交前先终结暂存手势，避免新动作消费旧 base。
            stagedRef.current?.end("commit");
            const current = draftRef.current;
            if (!current) return;
            setHistory((items) => [...items.slice(-49), structuredClone(current)]);
            setFuture([]);
            writeAndPublish(touchDirectorScene(updater(current)));
        },
        [writeAndPublish],
    );

    /** 暂存型手势（数值滑杆）：实时预览写草稿但不产生历史，也不镜像到项目。 */
    const stagedTransaction = useMemo(
        () =>
            createDirectorTransaction<DirectorScene>({
                read: () => draftRef.current,
                // 取消：恢复快照且绝不发布被取消的值。
                restore: (snapshot) => writeDraft(snapshot),
                commit: (from) => {
                    setHistory((items) => [...items.slice(-49), from]);
                    setFuture([]);
                    // 手势成功终态是真实 canonical 提交。
                    commitDraft();
                },
                setActive: () => undefined,
            }),
        [commitDraft, writeDraft],
    );
    stagedRef.current = stagedTransaction;

    const stageGesture = useCallback(
        (updater: (current: DirectorScene) => DirectorScene) => {
            const current = draftRef.current;
            if (!current) return;
            stagedTransaction.begin();
            writeDraft(touchDirectorScene(updater(current)));
        },
        [stagedTransaction, writeDraft],
    );

    const cameraPathSegment = !selectedObject && !selectedLight ? playbackSequence?.segments.find((segment) => selectedCameraId ? segment.cameraId === selectedCameraId : segment.shotId === activeShot?.id && segment.move === "path") : undefined;
    const cameraPathEditor = useDirectorCameraPathEditing({ scene: previsV2 ? draft : null, segmentId: cameraPathSegment?.id ?? null, frame: globalFrame, playing, open: open && previsV2, pause: () => setPlaying(false), commit });
    const routeEditor = useDirectorRouteEditing({ scene: previsV2 ? cameraPathEditor.scene ?? draft : null, actorId: selectedObject?.kind === "actor" ? selectedObject.id : null, frame: globalFrame, playing, open: open && previsV2, pause: () => setPlaying(false), commit });

    /** 无历史但持久的变化（标题、rig/motionClips 等）同样要镜像。 */
    const replaceWithoutHistory = useCallback(
        (updater: (current: DirectorScene) => DirectorScene) => {
            const current = draftRef.current;
            if (current) writeAndPublish(touchDirectorScene(updater(current)));
        },
        [writeAndPublish],
    );

    // 暂存手势的终止生命周期：常驻安装，非活跃时 end 为空操作。
    useEffect(
        () =>
            installDirectorTerminalListeners(stagedTransaction, {
                window,
                document,
                isHidden: () => document.visibilityState === "hidden",
            }),
        [stagedTransaction],
    );

    // 切换选择/骨骼、关闭或卸载前必须先终止旧手势，不能让新选择消费旧 base。
    useEffect(() => () => stagedTransaction.end("cancel"), [open, selectedBone, selectedObjectId, stagedTransaction]);

    // 离开页面：active 预览由 end("commit") 完成真实提交，idle 只镜像；落盘统一交给 controller。
    useEffect(() => {
        const onPageHide = () => {
            if (stagedTransaction.active()) stagedTransaction.end("commit");
            else mirrorDraft();
            // 只调用 handlePageHide：dirty 时它自己会 persist + flush，组件再叠一次就是重复落盘。
            void saveControllerRef.current?.handlePageHide();
        };
        // 异步 flush 不可能阻塞卸载：这里只同步声明「仍有未确认改动」，让浏览器自己弹保护。
        const onBeforeUnload = (event: BeforeUnloadEvent) => {
            const controller = saveControllerRef.current;
            if (!controller || !shouldBlockDirectorUnload(controller.progress)) return;
            event.preventDefault();
            event.returnValue = "";
        };
        window.addEventListener("pagehide", onPageHide);
        window.addEventListener("beforeunload", onBeforeUnload);
        return () => {
            window.removeEventListener("pagehide", onPageHide);
            window.removeEventListener("beforeunload", onBeforeUnload);
        };
    }, [mirrorDraft, stagedTransaction]);

    // 卸载兜底：只把最新 draft 镜像回项目，不制造新的 canonical revision。
    useEffect(
        () => () => {
            stagedRef.current?.end("cancel");
            mirrorDraft();
        },
        [mirrorDraft],
    );

    const undo = () => {
        const previous = history.at(-1);
        if (!previous || !draft) return;
        setHistory((items) => items.slice(0, -1));
        setFuture((items) => [structuredClone(draft), ...items].slice(0, 50));
        writeAndPublish(previous);
    };
    const redo = () => {
        const next = future[0];
        if (!next || !draft) return;
        setFuture((items) => items.slice(1));
        setHistory((items) => [...items, structuredClone(draft)].slice(-50));
        writeAndPublish(next);
    };

    const cacheThumbnail = async (frame: Blob, current: DirectorScene, shot: DirectorShot) => {
        try {
            await onThumbnail?.(frame, current, shot);
        } catch (error) {
            console.warn(t("previs.v165.message010"), error);
        }
    };

    /**
     * 关闭统一入口：取消未结束的预览、镜像当前 draft，再按 prepareClose 决策是否真的退出。
     * 这里只镜像不提交：取消预览不是新的 canonical 变化。
     */
    const finishWorkbench = (requireSaved: boolean) => {
        if (closingRef.current) return;
        if (recording) return;
        closingRef.current = true;
        setPlaying(false);
        stagedTransaction.end("cancel");
        commitDraft();
        mirrorDraft();

        return (async () => {
            // Capture before unmount. A thumbnail failure must never block saving the scene.
            const currentScene = draftRef.current;
            const currentShot = currentScene?.shots.find((shot) => shot.id === currentScene.activeShotId) || currentScene?.shots[0];
            if (onThumbnail && viewportRef.current && currentScene && currentShot) {
                try {
                    const thumbnail = await viewportRef.current.captureSnapshot();
                    if (isDirectorOutputSnapshotCurrent(draftRef.current, { scene: currentScene, shotId: currentShot.id })) await cacheThumbnail(thumbnail, currentScene, currentShot);
                } catch (error) {
                    console.warn(t("previs.v165.message010"), error);
                }
            }
            let decision;
            try {
                decision = resolveDirectorCloseOutcome(await saveController.prepareClose());
            } catch {
                message.error(t("canvasExtra.directorWB.closeCheckFailed"));
                closingRef.current = false;
                return;
            }

            if (decision.kind === "close") {
                if (currentScene && currentShot) onPrevis?.(currentScene, currentShot);
                onClose();
                return;
            }
            if (decision.kind === "blocked") {
                recordDirectorDiagnostic("DIRECTOR_CLOSE_BLOCKED", { sceneId: draftRef.current?.id, saveOutcome: "stay", revision: saveController.progress.revision, draftStored: saveController.progress.draftStored });
                message.error(decision.message);
                closingRef.current = false;
                return;
            }

            // “完成”只在保存确认后退出；返回仍保留原有草稿退出确认。
            if (requireSaved) {
                message.error(decision.message);
                closingRef.current = false;
                return;
            }

            // 确认框存续期间保持上锁，否则重复点击会叠出多个弹窗。
            modal.confirm({
                title: t("canvasExtra.directorWB.remoteSaveFailedTitle"),
                content: decision.message,
                okText: t("canvasExtra.directorWB.leaveAnyway"),
                cancelText: t("canvasExtra.directorWB.stayInDirector"),
                closable: false,
                mask: { closable: false },
                keyboard: false,
                // 预演视口持续占用主线程时，zoom 离场要等 rAF 和 transitionend。
                // 动画停在可见态后，点「留在预演台」确认框也不会消失。
                transitionName: "",
                maskTransitionName: "",
                onOk: () => {
                    if (currentScene && currentShot) onPrevis?.(currentScene, currentShot);
                    onClose();
                },
                onCancel: () => {
                    closingRef.current = false;
                },
            });
        })();
    };

    const closeWorkbench = () => finishWorkbench(false);

    const updateObject = (id: string, patch: Partial<DirectorObject>) => commit((current) => ({ ...current, objects: current.objects.map((item) => (item.id === id ? { ...item, ...patch } : item)) }));
    const duplicateObject = (id: string) => {
        const source = draft?.objects.find((item) => item.id === id);
        if (!source) return;
        const copy = structuredClone(source);
        copy.id = nanoid();
        copy.name = t("previs.v165.message256", { p0: source.name });
        copy.transform = { ...copy.transform, position: [source.transform.position[0] + 0.8, source.transform.position[1], source.transform.position[2] + 0.8] };
        copy.keyframes = copy.keyframes.map((keyframe) => ({ ...keyframe, id: nanoid() }));
        copy.boneTracks = copy.boneTracks?.map((track) => ({ ...track, keyframes: track.keyframes.map((keyframe) => ({ ...keyframe, id: nanoid() })) }));
        commit((current) => ({ ...current, objects: [...current.objects, copy] }));
        setSelectedObjectId(copy.id);
        setSelectedBone(null);
        message.success(t("previs.v165.message013"));
    };
    const updateLight = (id: string, patch: Partial<DirectorLight>) =>
        commit((current) => ({
            ...current,
            lights: current.lights.map((item) => {
                if (item.id !== id) return item;
                const animatedEdit = patch.transform || patch.intensity !== undefined || patch.color !== undefined;
                if (animatedEdit && autoKey) return recordDirectorLight(item, snappedPlayhead, { ...sampleDirectorLight(item, playhead), ...patch });
                // Auto Key off moves the authored curve as a whole, matching object transform editing.
                if (animatedEdit && item.keyframes?.length) {
                    const displayed = sampleDirectorLight(item, playhead);
                    return {
                        ...item,
                        ...patch,
                        keyframes: item.keyframes.map((key) => ({
                            ...key,
                            intensity: patch.intensity === undefined ? key.intensity : Math.max(0, Math.min(100, key.intensity + patch.intensity - displayed.intensity)),
                            color: patch.color ?? key.color,
                            transform: patch.transform
                                ? {
                                      ...key.transform,
                                      position: key.transform.position.map((v, i) => v + patch.transform!.position[i] - displayed.transform.position[i]) as DirectorVec3,
                                      rotation: key.transform.rotation.map((v, i) => v + patch.transform!.rotation[i] - displayed.transform.rotation[i]) as DirectorVec3,
                                  }
                                : key.transform,
                        })),
                    };
                }
                return { ...item, ...patch };
            }),
        }));
    const updateShot = (id: string, patch: Partial<DirectorShot>) => commit((current) => ({ ...current, shots: current.shots.map((item) => (item.id === id ? { ...item, ...patch } : item)) }));
    const updateCamera = (id: string, patch: Partial<DirectorCamera>) => commit((current) => ({ ...current, cameras: current.cameras.map((item) => (item.id === id ? { ...item, ...patch } : item)) }));
    const removeObject = (id: string) => {
        const remove = () => {
            commit((current) => current.objects.find((object) => object.id === id)?.kind === "actor" ? removeDirectorActor(current, id) : { ...current, objects: current.objects.filter((item) => item.id !== id) });
            if (selectedObjectId === id) {
                setSelectedObjectId(null);
                setSelectedBone(null);
            }
        };
        const actor = draftRef.current?.objects.find((object) => object.id === id && object.kind === "actor");
        if (actor && draftRef.current) modal.confirm({ title: t("directorP10.deleteConfirm", { name: actor.name }), content: previsV2 ? <DirectorActorRemovalList scene={draftRef.current} actorId={id} /> : undefined, onOk: remove });
        else remove();
    };
    const removeLight = (id: string) => {
        commit((current) => ({ ...current, lights: current.lights.filter((item) => item.id !== id) }));
        if (selectedLightId === id) setSelectedLightId(null);
    };
    const removeCamera = (id: string) => {
        if (!draft || draft.cameras.length <= 1) {
            message.warning(t("canvasExtra.directorWB.keepOneCamera"));
            return;
        }
        const fallback = draft.cameras.find((item) => item.id !== id);
        if (!fallback) return;
        commit((current) => ({
            ...current,
            cameras: current.cameras.filter((item) => item.id !== id),
            shots: current.shots.map((shot) => (shot.cameraId === id ? { ...shot, cameraId: fallback.id } : shot)),
        }));
    };

    /**
     * 所有「新增到场景」的唯一入口。
     * 在 commit 内读取一次 placement intent：因此模型上传等异步路径拿到的是
     * 「点击添加完成那一刻」的意图，而不是发起上传时捕获的过时坐标。
     * 锚点只提供 XZ，Y 严格保留构造器给定值，再交给 resolveDirectorPlacement 做碰撞避让。
     */
    const addObject = (object: DirectorObject) => {
        commit((current) => {
            const anchored = resolveDirectorPlacementAnchor({
                intent: viewportRef.current?.readPlacementIntent() ?? null,
                fallback: object.transform.position,
            });
            const position = resolveDirectorPlacement({ object: { ...object, transform: { ...object.transform, position: anchored } }, existing: current.objects });
            return addDirectorSceneObject(current, { ...object, transform: { ...object.transform, position } });
        });
        setSelectedObjectId(object.id);
    };

    const addPrimitive = (primitive: DirectorObject["primitive"], name: string) => addObject(createDirectorObject(primitive, name));

    const addActor = () => {
        const existingActors = draft?.objects.filter((item) => item.kind === "actor" || item.primitive === "character") || [];
        const colorIndex = existingActors.length % DIRECTOR_ACTOR_COLORS.length;
        addObject(createDirectorActor(t("previs.v165.message257", { p0: existingActors.length + 1 }), [0, 0, 0], DIRECTOR_ACTOR_COLORS[colorIndex]));
    };

    const addModelAsset = (asset: ModelAsset) => addObject(createDirectorModel({ name: asset.title, assetId: asset.id, storageKey: asset.data.storageKey, url: asset.data.url, mimeType: asset.data.mimeType }));
    const addDrawerActor = (sourceId?: string) => {
        const current = draftRef.current;
        if (current) addObject(createDirectorDrawerActor(current, (letter) => t("directorP10.actorName", { letter }), sourceId));
    };

    const uploadModel = async (file?: File) => {
        if (!file || !/\.(glb|gltf)$/i.test(file.name)) return;
        const uploaded = await uploadMediaFile(file, "model");
        const assetId = addAsset(
            resolveAssetIngest(
                {
                    kind: "model",
                    title: file.name.replace(/\.(glb|gltf)$/i, ""),
                    coverUrl: "",
                    tags: [t("canvasExtra.directorWB.tag3dModel")],
                    source: t("previs.v165.message014"),
                    data: { url: uploaded.url, storageKey: uploaded.storageKey, bytes: uploaded.bytes, mimeType: uploaded.mimeType, fileName: file.name },
                    metadata: { source: "director" },
                },
                { canvasId: effectiveCanvasId, sourceCode: "canvas-upload" },
            ),
        );
        const asset = useAssetStore.getState().assets.find((item): item is ModelAsset => item.id === assetId && item.kind === "model");
        if (asset) addModelAsset(asset);
        try {
            await saveRemoteUserDataNow();
            message.success(t("canvasExtra.directorWB.modelAddedToScene"));
        } catch (error) {
            message.warning(localSavedRemotePendingMessage(t("previs.v165.message015"), error));
        }
    };

    const addBillboard = async (node: CanvasNodeData) => {
        const url = node.metadata?.content || node.metadata?.storageKey;
        if (!url) {
            message.warning(t("previs.v165.message016"));
            return;
        }
        // 如果是 storageKey，需要解析成实际URL
        let actualUrl = url;
        if (node.metadata?.storageKey && !url.startsWith("http") && !url.startsWith("blob:") && !url.startsWith("data:")) {
            try {
                const { resolveImageUrl } = await import("@/services/image-storage");
                actualUrl = await resolveImageUrl(node.metadata.storageKey, url);
            } catch (error) {
                console.warn(t("previs.v165.message017"), error);
            }
        }
        const billboard = createDirectorBillboard(node.title || t("canvasContextMenu.backdrop"), actualUrl, node.metadata?.storageKey, node.id);
        addObject(billboard);
        message.success(t("previs.v165.message258", { p0: node.title || "图片" }));
    };
    const setPanoramaEnvironment = (node: CanvasNodeData) => {
        const url = node.metadata?.content;
        if (!url) return;
        commit((current) => ({ ...current, environment: { mode: "panorama", url, storageKey: node.metadata?.storageKey, sourceNodeId: node.id, rotationY: 0, opacity: 1, exposure: 0, useAsLighting: false, lightingIntensity: 0.2 } }));
        message.success(t("previs.v165.message018"));
    };
    const clearPanoramaEnvironment = () => commit((current) => ({ ...current, environment: { mode: "color" } }));

    const copyCompiledPrompt = async () => {
        if (!compiledPrompt) return;
        try {
            await navigator.clipboard.writeText(compiledPrompt);
            message.success(t("previs.v165.message019"));
        } catch {
            message.warning(t("previs.v165.message020"));
        }
    };

    const addCamera = () => {
        const camera = createDirectorCamera(t("previs.v165.message259", { p0: draft?.cameras.length ? draft.cameras.length + 1 : 1 }));
        commit((current) => ({ ...current, cameras: [...current.cameras, camera] }));
        if (activeShot) updateShot(activeShot.id, { cameraId: camera.id });
    };

    const addLight = (type: DirectorLight["type"] = "point", label = t("canvasExtra.directorWB.lightDefaultName"), position: DirectorVec3 = [2, 3, 2], intensity = 1.5) => {
        const light = createDirectorLight(type, `${label} ${draft?.lights.length ? draft.lights.length + 1 : 1}`, position, intensity);
        commit((current) => ({ ...current, lights: [...current.lights, light] }));
        setSelectedLightId(light.id);
    };

    const addCameraMenuItems: MenuProps["items"] = [{ key: "camera", icon: <Camera className="size-3.5" />, label: t("canvasExtra.directorWB.addCamera"), onClick: addCamera }];
    const addLightMenuItems: MenuProps["items"] = [
        { key: "directional", icon: <Lightbulb className="size-3.5" />, label: t("canvasExtra.directorWB.lightDirectional"), onClick: () => addLight("directional", t("canvasExtra.directorWB.lightDirectional"), [4, 6, 4], 2.4) },
        { key: "point", icon: <Lightbulb className="size-3.5" />, label: t("canvasExtra.directorWB.lightPoint"), onClick: () => addLight("point", t("canvasExtra.directorWB.lightPoint")) },
        { key: "spot", icon: <Lightbulb className="size-3.5" />, label: t("canvasExtra.directorWB.lightSpot"), onClick: () => addLight("spot", t("canvasExtra.directorWB.lightSpot"), [2, 4, 2], 2) },
        { key: "ambient", icon: <LampDesk className="size-3.5" />, label: t("canvasExtra.directorWB.lightAmbient"), onClick: () => addLight("ambient", t("canvasExtra.directorWB.lightAmbient"), [0, 0, 0], 0.65) },
    ];
    const addObjectMenuItems: MenuProps["items"] = [
        { key: "actor", icon: <UserRound className="size-3.5" />, label: t("canvasExtra.directorWB.actor"), onClick: addActor },
        { key: "box", icon: <Box className="size-3.5" />, label: t("canvasExtra.directorWB.cube"), onClick: () => addPrimitive("box", t("canvasExtra.directorWB.cube")) },
        { key: "sphere", icon: <Circle className="size-3.5" />, label: t("canvasExtra.directorWB.sphere"), onClick: () => addPrimitive("sphere", t("canvasExtra.directorWB.sphere")) },
        { key: "cylinder", icon: <Cuboid className="size-3.5" />, label: t("canvasExtra.directorWB.cylinder"), onClick: () => addPrimitive("cylinder", t("canvasExtra.directorWB.cylinder")) },
        { key: "model", icon: <FileUp className="size-3.5" />, label: t("canvasExtra.directorWB.uploadModel"), onClick: () => modelInputRef.current?.click() },
    ];

    const addShot = () => {
        if (!activeCamera) return;
        const camera = { ...structuredClone(activeCamera), id: nanoid() };
        const shot: DirectorShot = { id: nanoid(), name: t("previs.v165.message260", { p0: (draft?.shots.length || 0) + 1 }), cameraId: camera.id, duration: 5, fps: 24, shotSize: "medium", cameraMove: "static", prompt: "" };
        commit((current) => {
            const saved = rememberDirectorStage(current);
            return { ...saved, cameras: [...saved.cameras, camera], shots: [...saved.shots, shot], activeShotId: shot.id };
        });
        setPlayhead(0);
    };

    const addObjectKeyframe = () => {
        if (!selectedObject) return;
        // 取值用 raw playhead（视口真正渲染的时间），写入用 snapped 目的时间。
        const record = resolveDirectorKeyframeRecord({ base: selectedObject.transform, keyframes: selectedObject.keyframes, rawTime: playhead, snappedTime: snappedPlayhead });
        updateObject(selectedObject.id, { keyframes: record.keyframes });
    };

    const addCameraKeyframe = () => {
        if (!activeCamera) return;
        commit((current) => ({
            ...current,
            cameras: current.cameras.map((item) =>
                item.id === activeCamera.id ? { ...item, keyframes: resolveDirectorKeyframeRecord({ base: item.transform, keyframes: item.keyframes, rawTime: playhead, snappedTime: snappedPlayhead }).keyframes } : item,
            ),
        }));
    };

    const recordSelectedKeyframe = () => {
        if (selectedLightSource) {
            commit((current) => ({ ...current, lights: current.lights.map((light) => (light.id === selectedLightSource.id ? recordDirectorLight(light, snappedPlayhead, sampleDirectorLight(light, playhead)) : light)) }));
            return;
        }
        if (selectedObject && selectedBone) {
            const rotation = selectedObject.boneOverrides?.[selectedBone as DirectorHumanoidBone] || ([0, 0, 0, 1] as DirectorQuat);
            updateObject(selectedObject.id, { boneTracks: upsertDirectorBoneKeyframe(selectedObject.boneTracks || [], selectedBone as DirectorHumanoidBone, snappedPlayhead, rotation) });
            return;
        }
        if (selectedObject) addObjectKeyframe();
        else addCameraKeyframe();
    };

    /**
     * 时间轴删除关键帧的唯一入口。
     *
     * 未命中（对象/摄影机/关键帧已不存在）时 removeDirectorSceneKeyframe 返回同一引用，
     * 此时不进 commit：不记历史、不产生修订、不触发保存。
     */
    const deleteKeyframe = useCallback(
        (target: DirectorKeyframeDeleteTarget) => {
            const current = draftRef.current;
            if (!current || removeDirectorSceneKeyframe(current, target) === current) return;
            commit((scene) => removeDirectorSceneKeyframe(scene, target));
        },
        [commit],
    );

    const setKeyframeEasing = useCallback(
        (target: DirectorKeyframeDeleteTarget, easing: DirectorKeyframeEasing) => {
            const current = draftRef.current;
            if (!current || setDirectorSceneKeyframeEasing(current, target, easing) === current) return;
            commit((scene) => setDirectorSceneKeyframeEasing(scene, target, easing));
        },
        [commit],
    );

    /**
     * 快捷键执行器。放在 ref 里：监听只在 open 变化时注册一次，
     * 但每次渲染都能拿到最新的选择、历史和 draft，避免闭包读到过期状态。
     *
     * 返回值表示「动作真的执行了」，只有执行了才 preventDefault：
     * 没有选中对象时的 Delete 仍然交还给浏览器。
     */
    const runShortcut = (action: DirectorShortcutAction): boolean => {
        switch (action.kind) {
            case "transform-mode":
                setTransformMode(action.mode);
                return true;
            case "delete-selected":
                if (cameraPathEditor.deleteSelected()) return true;
                if (routeEditor.deleteSelected()) return true;
                if (selectedObject) {
                    removeObject(selectedObject.id);
                    return true;
                }
                if (selectedLight) {
                    removeLight(selectedLight.id);
                    return true;
                }
                return false;
            case "undo":
                cameraPathEditor.cancel();
                routeEditor.cancel();
                if (!history.length) return false;
                undo();
                return true;
            case "redo":
                cameraPathEditor.cancel();
                routeEditor.cancel();
                if (!future.length) return false;
                redo();
                return true;
            case "toggle-visibility":
                if (!selectedObject) return false;
                updateObject(selectedObject.id, { visible: !selectedObject.visible });
                return true;
            case "deselect":
                if (!selectedObjectId && !selectedLightId && !selectedBone) return false;
                setSelectedObjectId(null);
                setSelectedLightId(null);
                setSelectedBone(null);
                return true;
            case "toggle-play":
                togglePlayback();
                return true;
        }
    };
    const runShortcutRef = useRef(runShortcut);
    runShortcutRef.current = runShortcut;

    // Shortcuts belong to this window; canvas shortcuts must never receive its keys.
    const onDirectorKeyDown = (event: KeyboardEvent) => {
        event.stopPropagation();
        if (!blocksDirectorShortcut(event.target) && event.key === "Escape" && (cameraPathEditor.dragging || cameraPathEditor.adding || cameraPathEditor.selectedPointId)) {
            cameraPathEditor.cancel();
            event.preventDefault();
            return;
        }
        if (!blocksDirectorShortcut(event.target) && event.key === "Escape" && (routeEditor.dragging || routeEditor.adding || routeEditor.selectedPointId)) {
            routeEditor.cancel();
            event.preventDefault();
            return;
        }
        if (event.key === "Escape") stagedTransaction.end("cancel");
        const action = resolveDirectorShortcut({
            key: event.key,
            ctrlKey: event.ctrlKey,
            metaKey: event.metaKey,
            shiftKey: event.shiftKey,
            altKey: event.altKey,
            isInteractiveTarget: blocksDirectorShortcut(event.target),
        });
        if (!action) return;
        if (runShortcutRef.current(action)) event.preventDefault();
    };

    /** 对象 transform 编辑的唯一入口：gizmo 与检查器共用同一套静态/动画语义。 */
    const handleObjectTransform = useCallback(
        (id: string, from: DirectorTransform, to: DirectorTransform) => {
            commit((current) => ({
                ...current,
                objects: current.objects.map((item) => {
                    if (item.id !== id) return item;
                    const edit = resolveDirectorObjectTransformEdit({ base: item.transform, keyframes: item.keyframes, rendered: from, edited: to, autoKey, time: snappedPlayhead });
                    return { ...item, transform: edit.transform, keyframes: edit.keyframes };
                }),
            }));
        },
        [autoKey, commit, snappedPlayhead],
    );

    /** 摄影机 transform gizmo 写入：直接覆盖摄影机 transform（不走 object autoKey 逻辑）。 */
    const handleCameraTransform = useCallback(
        (id: string, from: DirectorTransform, to: DirectorTransform) => {
            commit((current) => ({
                ...current,
                cameras: current.cameras.map((item) => {
                    if (item.id !== id) return item;
                    // 机位取景由 target 决定：平移时保持盯住原焦点；旋转时按新朝向把焦点推到同样距离。
                    const rotated = to.rotation.some((value, index) => Math.abs(value - from.rotation[index]) > 1e-4);
                    if (!rotated) return { ...item, transform: { ...to, scale: [1, 1, 1] } };
                    const distance = Math.max(0.5, new Vector3(...item.target).distanceTo(new Vector3(...from.position)));
                    const forward = new Vector3(0, 0, -1).applyEuler(new Euler(...to.rotation)).multiplyScalar(distance);
                    const target: DirectorVec3 = [to.position[0] + forward.x, to.position[1] + forward.y, to.position[2] + forward.z];
                    return { ...item, transform: { ...to, scale: [1, 1, 1] }, target };
                }),
            }));
        },
        [commit],
    );

    /** 骨骼写入语义：静态覆盖 + autoKey 时在吸附播放头补关键帧。gizmo 与数值编辑器共用。 */
    const writeBoneRotation = useCallback(
        (id: string, bone: string, rotation: DirectorQuat, mode: "stage" | "commit") => {
            const write = mode === "stage" ? stageGesture : commit;
            write((current) => ({
                ...current,
                objects: current.objects.map((item) =>
                    item.id === id
                        ? {
                              ...item,
                              boneOverrides: { ...item.boneOverrides, [bone]: rotation },
                              boneTracks: autoKey ? upsertDirectorBoneKeyframe(item.boneTracks || [], bone as DirectorHumanoidBone, snappedPlayhead, rotation) : item.boneTracks,
                          }
                        : item,
                ),
            }));
        },
        [autoKey, commit, snappedPlayhead, stageGesture],
    );

    const handleBoneTransform = useCallback((id: string, bone: string, rotation: DirectorQuat) => writeBoneRotation(id, bone, rotation, "commit"), [writeBoneRotation]);

    const handleActorRigReady = useCallback(
        (id: string, rig: DirectorRig, animations: AnimationClip[]) => {
            replaceWithoutHistory((current) => ({
                ...current,
                objects: current.objects.map((item) => {
                    if (item.id !== id) return item;
                    const existing = item.motionClips || [];
                    const motionClips = existing.length
                        ? existing
                        : animations.map((clip) => ({ id: nanoid(), name: clip.name || t("canvasExtra.directorSeq.motionClipsRow"), sourceAnimation: clip.name, start: 0, duration: Math.max(0.1, clip.duration), playbackRate: 1, loop: true }));
                    return { ...item, rig, motionClips };
                }),
            }));
        },
        [replaceWithoutHistory],
    );

    const applyCameraMove = () => {
        if (!activeCamera || !activeShot) return;
        const cameraId = activeCamera.id;
        const move = activeShot.cameraMove;
        const duration = activeShot.duration;
        commit((current) => ({
            ...current,
            cameras: current.cameras.map((item) => (item.id === cameraId ? { ...item, keyframes: move.startsWith("orbit") ? directorCameraMotionFrames(item, move, duration) : resolveDirectorCameraMoveKeyframes(item.keyframes, item.transform, directorCameraMotionFrames(item, move, duration).at(-1)!.transform, duration) } : item)),
        }));
        message.success(t("canvasExtra.directorWB.cameraMoveUpdated"));
    };

    const alignCameraToView = () => {
        if (!activeCamera) return;
        const transform = viewportRef.current?.readCameraTransform();
        if (!transform) return;
        commit((current) => ({ ...current, cameras: current.cameras.map((item) => (item.id === activeCamera.id ? resolveDirectorCameraAlignment(item, transform, snappedPlayhead) : item)) }));
        message.success(t("canvasExtra.directorWB.cameraAligned"));
    };

    const applyToCanvas = async () => {
        stagedTransaction.end("commit");
        const current = draftRef.current;
        if (!current || !activeShot || !viewportRef.current) return;
        const expected = { scene: current, shotId: activeShot.id };
        setSaving(true);
        setOutputFailure(null);
        try {
            const beauty = await viewportRef.current.capture("beauty");
            if (!isDirectorOutputSnapshotCurrent(draftRef.current, expected)) throw new Error(t("canvasExtra.directorWB.outputStale"));
            const prompt = compileDirectorPrompt(current, activeShot);
            // 先镜像最新 scene，再做 canvas 输出；失败时 draft 保留可继续重试。
            const next = writeAndPublish(touchDirectorScene(current));
            await cacheThumbnail(beauty, next, activeShot);
            await onApply({ scene: next, shot: activeShot, prompt, beauty });
            onPrevis?.(next, activeShot);
            message.success(t("previs.v165.message021"));
        } catch (error) {
            setOutputFailure({ error, recording: false });
        } finally {
            setSaving(false);
        }
    };

    const exportClayVideo = async (request?: DirectorPreviewRequest) => {
        stagedTransaction.end("commit");
        const current = draftRef.current;
        if (!current || !activeShot || !viewportRef.current || recording) return;
        if (current.previs && !previsV2) return;
        const expected = { scene: current, shotId: activeShot.id };
        setRecording(true);
        setOutputFailure(null);
        const wasPlaying = playing;
        const previousPlayhead = playhead;
        const controller = new AbortController();
        const progressKey = `director-export-${current.id}`;
        setPlayhead(0);
        setPlaying(false);
        try {
            const previsSequenceFingerprint = current.previs ? computePrevisSequenceFingerprint(current) : undefined;
            const onProgress = ({ phase, progress }: { phase: "rendering" | "encoding"; progress: number }) => message.open({
                key: progressKey, type: "loading", duration: 0,
                content: <span>{t(phase === "rendering" ? "previs.export.rendering" : "previs.export.encoding", { percent: Math.floor(progress * 100) })} <Button size="small" onClick={() => controller.abort()}>{t("previs.export.cancel")}</Button></span>,
            });
            onProgress({ phase: "rendering", progress: 0 });
            const { exportDirectorPrevis } = await import("./director-background-recorder");
            const { video: clayVideo, beauty } = await exportDirectorPrevis(current, {
                shotId: activeShot.id, duration: request?.duration, fps: request?.fps, signal: controller.signal, onProgress,
            });
            controller.signal.throwIfAborted();
            message.open({ key: progressKey, type: "loading", duration: 0, content: t("previs.export.applying") });
            if (!isDirectorOutputSnapshotCurrent(draftRef.current, expected)) throw new Error(t("canvasExtra.directorWB.recordStale"));
            const next = writeAndPublish(touchDirectorScene(draftRef.current || current));
            if (!isDirectorOutputSnapshotCurrent(draftRef.current, { scene: next, shotId: expected.shotId })) throw new Error(t("canvasExtra.directorWB.outputStale"));
            await cacheThumbnail(beauty, next, activeShot);
            await onApply({ scene: next, shot: activeShot, prompt: compileDirectorPrompt(next, activeShot), beauty, clayVideo, clayVideoMimeType: clayVideo.type, previsSequenceFingerprint });
            setLastClayExport({ shotId: expected.shotId, at: Date.now() });
            message.success(t(current.previs ? "previs.v165.message023" : "previs.export.previewDone"));
        } catch (error) {
            if (controller.signal.aborted) message.info(t("previs.export.cancelled"));
            else setOutputFailure({ error, recording: true });
        } finally {
            message.destroy(progressKey);
            setPlaying(wasPlaying);
            setPlayhead(previousPlayhead);
            setRecording(false);
        }
    };

    const sceneActors = draft?.objects.filter((item) => item.kind === "actor" || item.primitive === "character") || [];
    const sceneProps = draft?.objects.filter((item) => item.kind !== "actor" && item.primitive !== "character") || [];
    const normalizedSceneQuery = sceneQuery.trim().toLowerCase();
    const matchesSceneQuery = (name: string, meta = "") => !normalizedSceneQuery || `${name} ${meta}`.toLowerCase().includes(normalizedSceneQuery);
    const visibleSceneActors = sceneActors.filter((actor) => matchesSceneQuery(actor.name, `${actor.archetype || ""} ${actor.pose || ""}`));
    const visibleSceneProps = sceneProps.filter((object) => matchesSceneQuery(object.name, `${object.kind} ${object.primitive || ""}`));
    const visibleCameras = draft?.cameras.filter((camera) => matchesSceneQuery(camera.name, `${camera.focalLength}mm`)) || [];
    const visibleLights = draft?.lights.filter((light) => matchesSceneQuery(light.name, light.type)) || [];
    const selectedActor = sceneActors.find((item) => item.id === selectedObjectId) ?? null;
    const handleGroundClick = useCallback(
        (point: DirectorGroundPoint) => {
            if (!selectedActor || !selectedObjectId) {
                message.info(t("previs.v165.message024"));
                return;
            }
            setSelectedObjectId(selectedActor.id);
            handleObjectTransform(selectedActor.id, selectedActor.transform, {
                ...selectedActor.transform,
                position: [point.x, selectedActor.transform.position[1], point.z],
            });
            message.success(t("previs.v165.message025"));
        },
        [handleObjectTransform, message, selectedActor],
    );
    const addActorToScene = () => {
        addActor();
        message.success(t("previs.v165.message026"));
    };

    const trajectoryTarget = selectedActor ? { kind: "actor" as const, id: selectedActor.id, name: selectedActor.name } : selectedCamera ? { kind: "camera" as const, id: selectedCamera.id, name: selectedCamera.name } : null;
    const trajectoryPreviousViewModeRef = useRef(viewMode);
    const trajectorySessionRef = useRef(false);
    useEffect(() => {
        if (trajectoryDrawing && !trajectorySessionRef.current) {
            trajectorySessionRef.current = true;
            trajectoryPreviousViewModeRef.current = viewMode;
            if (viewMode !== "top") setViewMode("top");
            message.info(trajectoryTarget ? t("previs.v165.message261", { p0: t(trajectoryTarget.kind === "camera" ? "previs.v165.message027" : "previs.v165.message028") }) : t("previs.v165.message029"));
            return;
        }
        if (!trajectoryDrawing && trajectorySessionRef.current) {
            trajectorySessionRef.current = false;
            setViewMode(trajectoryPreviousViewModeRef.current);
        }
    }, [message, setViewMode, trajectoryDrawing, trajectoryTarget, viewMode]);
    const handleTrajectoryComplete = useCallback(
        (points: DirectorGroundPoint[]) => {
            const current = draftRef.current;
            const shot = current?.shots.find((item) => item.id === current.activeShotId) || current?.shots[0];
            if (!current || !shot || points.length < 2) {
                setTrajectoryDrawing(false);
                if (points.length >= 2 && !trajectoryTarget) message.info(t("previs.v165.message030"));
                return;
            }
            if (selectedActor) {
                const y = selectedActor.transform.position[1];
                const path = [[selectedActor.transform.position[0], y, selectedActor.transform.position[2]] as DirectorVec3, ...points.map((point) => [point.x, y, point.z] as DirectorVec3)];
                const keyframes = buildDirectorPathKeyframes({ base: selectedActor.transform, points: path, duration: shot.duration, orientToPath: true });
                commit((scene) => ({ ...scene, objects: scene.objects.map((object) => (object.id === selectedActor.id ? { ...object, keyframes, motionPath: { points: path, speed: "walk", startDelay: 0, orientToPath: true } } : object)) }));
                message.success(t("previs.v165.message031"));
            } else if (selectedCamera) {
                const y = selectedCamera.transform.position[1];
                const path = [[selectedCamera.transform.position[0], y, selectedCamera.transform.position[2]] as DirectorVec3, ...points.map((point) => [point.x, y, point.z] as DirectorVec3)];
                const keyframes = buildDirectorPathKeyframes({ base: selectedCamera.transform, points: path, duration: shot.duration });
                commit((scene) => ({ ...scene, cameras: scene.cameras.map((camera) => (camera.id === selectedCamera.id ? { ...camera, keyframes, motionPath: { points: path, speed: "walk", startDelay: 0, orientToPath: false } } : camera)) }));
                message.success(t("previs.v165.message032"));
            }
            setTrajectoryDrawing(false);
        },
        [commit, message, selectedActor, selectedCamera, trajectoryTarget],
    );

    // ── 演员体型模板 ──────────────────────────────────────────────────────────
    /** 每个模板：name 显示名、archetype、体型 overrides（可覆盖 directorActorProfileForArchetype 默认值）*/
    const ACTOR_TEMPLATES: Array<{ key: string; label: string; archetype: import("@/types/director").DirectorActorArchetype; profileOverrides?: Partial<DirectorActorProfile>; crowd?: boolean }> = [
        { key: "std-male", label: t("previs.v165.message033"), archetype: "man" },
        { key: "std-female", label: t("previs.v165.message034"), archetype: "woman" },
        { key: "muscular", label: t("previs.v165.message035"), archetype: "man", profileOverrides: { shoulderWidth: 1.32, torsoRatio: 1.12, height: 1.06 } },
        { key: "slim", label: t("previs.v165.message036"), archetype: "woman", profileOverrides: { shoulderWidth: 0.78, torsoRatio: 0.88, height: 0.98 } },
        { key: "teen", label: t("previs.v165.message037"), archetype: "child", profileOverrides: { height: 0.86, headRatio: 1.12 } },
        { key: "child", label: t("previs.v165.message038"), archetype: "child" },
        { key: "stocky", label: t("previs.v165.message039"), archetype: "man", profileOverrides: { shoulderWidth: 1.18, torsoRatio: 1.24, height: 0.96 } },
        { key: "chibi", label: t("previs.v165.message040"), archetype: "adult", profileOverrides: { height: 0.62, headRatio: 1.68 } },
    ];

    const addActorFromTemplate = (template: (typeof ACTOR_TEMPLATES)[number]) => {
        const existingActors = draft?.objects.filter((item) => item.kind === "actor" || item.primitive === "character") || [];
        const colorIndex = existingActors.length % DIRECTOR_ACTOR_COLORS.length;
        const baseProfile = directorActorProfileForArchetype(template.archetype);
        const actorProfile = template.profileOverrides ? { ...baseProfile, ...template.profileOverrides } : baseProfile;
        const actor = { ...createDirectorActor(`${template.label} ${existingActors.length + 1}`, [0, 0, 0], DIRECTOR_ACTOR_COLORS[colorIndex], template.archetype), actorProfile: { ...actorProfile, mannequinVersion: 2 as const } };
        addObject(actor);
        message.success(t("previs.v165.message262", { p0: template.label }));
    };

    const addCrowdActors = () => {
        const existingActors = draft?.objects.filter((item) => item.kind === "actor" || item.primitive === "character") || [];
        const base = existingActors.length;
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                const idx = base + row * 3 + col;
                const colorIndex = idx % DIRECTOR_ACTOR_COLORS.length;
                const actor = createDirectorActor(t("previs.v165.message263", { p0: idx + 1 }), [col * 1.1 - 1.1, 0, row * 1.1 - 1.1], DIRECTOR_ACTOR_COLORS[colorIndex]);
                addObject(actor);
            }
        }
        message.success(t("previs.v165.message041"));
    };

    const actorTemplateMenuItems: MenuProps["items"] = [
        { key: "upload", icon: <FileUp className="size-3.5" />, label: t("homeShowcase.localUpload"), onClick: () => modelInputRef.current?.click() },
        { type: "divider" },
        ...ACTOR_TEMPLATES.map((template) => ({
            key: template.key,
            icon: <UserRound className="size-3.5" />,
            label: template.label,
            onClick: () => addActorFromTemplate(template),
        })),
        { type: "divider" },
        { key: "crowd", icon: <Users className="size-3.5" />, label: t("previs.v165.message042"), onClick: addCrowdActors },
        {
            key: "geometry",
            icon: <Box className="size-3.5" />,
            label: t("previs.v165.message043"),
            children: [
                { key: "geo-upload", icon: <FileUp className="size-3.5" />, label: t("canvasTransfer.upload"), onClick: () => modelInputRef.current?.click() },
                { key: "geo-box", icon: <Box className="size-3.5" />, label: t("canvasExtra.directorWB.cube"), onClick: () => addPrimitive("box", t("canvasExtra.directorWB.cube")) },
                { key: "geo-sphere", icon: <Circle className="size-3.5" />, label: t("canvasExtra.directorWB.sphere"), onClick: () => addPrimitive("sphere", t("canvasExtra.directorWB.sphere")) },
                { key: "geo-cyl", icon: <Cuboid className="size-3.5" />, label: t("previs.v165.message044"), onClick: () => addPrimitive("cylinder", t("previs.v165.message044")) },
                { key: "geo-torus", icon: <Circle className="size-3.5" />, label: t("previs.v165.message045"), onClick: () => addPrimitive("sphere", t("previs.v165.message045")) },
                { key: "geo-cone", icon: <Square className="size-3.5" />, label: t("previs.v165.message046"), onClick: () => addPrimitive("plane", t("previs.v165.message046")) },
                { key: "geo-plane", icon: <Square className="size-3.5" />, label: t("previs.v165.message047"), onClick: () => addPrimitive("plane", t("previs.v165.message047")) },
                { key: "geo-null", icon: <Plus className="size-3.5" />, label: t("previs.v165.message048"), onClick: () => addPrimitive("box", t("previs.v165.message049")) },
            ],
        },
    ];

    // ── 机位预设 ────────────────────────────────────────────────────────────────
    type CameraPreset = {
        key: string;
        label: string;
        position: [number, number, number];
        target: [number, number, number];
        fov: number;
        isCurrentView?: boolean;
    };
    const CAMERA_PRESETS: CameraPreset[] = [
        { key: "current", label: t("canvasDialog.angle.currentView"), position: [4.8, 2.7, 6.8], target: [0, 1, 0], fov: 50, isCurrentView: true },
        { key: "front-medium", label: t("previs.v165.message050"), position: [0, 1.4, 4.0], target: [0, 1, 0], fov: 50 },
        { key: "front-cu", label: t("previs.v165.message051"), position: [0, 1.65, 1.8], target: [0, 1.6, 0], fov: 40 },
        { key: "front-wide", label: t("previs.v165.message052"), position: [0, 2.0, 7.5], target: [0, 1, 0], fov: 60 },
        { key: "side-follow", label: t("previs.v165.message053"), position: [3.8, 1.4, 0], target: [0, 1, 0], fov: 50 },
        { key: "side-cu", label: t("previs.v165.message054"), position: [2.0, 1.65, 0], target: [0, 1.6, 0], fov: 45 },
        { key: "back-medium", label: t("previs.v165.message055"), position: [0, 1.4, -4.0], target: [0, 1, 0], fov: 50 },
        { key: "bird-wide", label: t("previs.v165.message056"), position: [0, 6.5, 3.5], target: [0, 0, 0], fov: 65 },
        { key: "angle-45", label: t("previs.v165.message057"), position: [3.0, 4.5, 4.5], target: [0, 0.8, 0], fov: 55 },
        { key: "low-uptilt", label: t("previs.v165.message058"), position: [0, 0.3, 3.5], target: [0, 2.2, 0], fov: 55 },
        { key: "low-wide", label: t("previs.v165.message059"), position: [0, 0.5, 4.5], target: [0, 1.2, 0], fov: 75 },
        { key: "ots-left", label: t("previs.v165.message060"), position: [-1.1, 1.75, 2.2], target: [0.6, 1.65, 0], fov: 50 },
        { key: "ots-right", label: t("previs.v165.message061"), position: [1.1, 1.75, 2.2], target: [-0.6, 1.65, 0], fov: 50 },
        { key: "birds-eye", label: t("previs.v165.message062"), position: [0, 9.0, 0.1], target: [0, 0, 0], fov: 70 },
        { key: "dutch", label: t("previs.v165.message063"), position: [2.8, 1.7, 4.0], target: [0, 1.2, 0], fov: 52 },
    ];

    const addCameraPreset = (preset: CameraPreset) => {
        if (preset.isCurrentView) {
            const transform = viewportRef.current?.readCameraTransform();
            if (transform) {
                const cam = { ...createDirectorCamera(t("previs.v165.message264", { p0: (draft?.cameras.length || 0) + 1 })), transform, target: preset.target };
                commit((current) => ({ ...current, cameras: [...current.cameras, cam] }));
                if (activeShot) updateShot(activeShot.id, { cameraId: cam.id });
                setViewMode("camera");
                message.success(t("previs.v165.message064"));
            } else {
                addCamera();
                message.info(t("previs.v165.message065"));
            }
            return;
        }
        const cam = {
            ...createDirectorCamera(t("previs.v165.message264", { p0: (draft?.cameras.length || 0) + 1 })),
            transform: { position: preset.position, rotation: [0, 0, 0] as [number, number, number], scale: [1, 1, 1] as [number, number, number] },
            target: preset.target,
            fov: preset.fov,
        };
        commit((current) => ({ ...current, cameras: [...current.cameras, cam] }));
        if (activeShot) updateShot(activeShot.id, { cameraId: cam.id });
        setViewMode("camera");
        message.success(t("previs.v165.message265", { p0: preset.label }));
    };

    const cameraPresetMenuItems: MenuProps["items"] = CAMERA_PRESETS.map((preset) => ({
        key: preset.key,
        icon: <Camera className="size-3.5" />,
        label: preset.label,
        onClick: () => addCameraPreset(preset),
    }));

    // ── 道具库 (语义化尺寸，单位米) ─────────────────────────────────────────

    const enterAnimationMode = useCallback(() => {
        stagedTransaction.end("commit");
        if (selectedActor) {
            setSelectedObjectId(selectedActor.id);
            setSelectedLightId(null);
            setSelectedBone(null);
        }
        setPlaying(false);
        setMode("animate");
        setSequencerVisible(true);
    }, [selectedActor, setMode, setPlaying, setSelectedBone, setSelectedLightId, setSelectedObjectId, setSequencerVisible, stagedTransaction]);

    useEffect(() => {
        const onPreviewRequested = (event: Event) => {
            const detail = (event as CustomEvent<DirectorPreviewRequest>).detail;
            if (!isDirectorPreviewRequestForWorkbench({ request: detail, canvasId: effectiveCanvasId, sceneId: draft?.id, activeShotId: activeShot?.id })) return;
            consumeDirectorPreview(detail);
            const requestKey = directorPreviewRequestKey(detail);
            if (handledPreviewRequestsRef.current.has(requestKey)) return;
            // 标记发生在 recording 判断之前：录制期间的重复/并发事件也不能在录制结束后再次执行。
            handledPreviewRequestsRef.current.add(requestKey);
            if (handledPreviewRequestsRef.current.size > 64) {
                const oldest = handledPreviewRequestsRef.current.values().next().value;
                if (typeof oldest === "string") handledPreviewRequestsRef.current.delete(oldest);
            }
            if (recording) return;
            void exportClayVideo(detail);
        };
        window.addEventListener("director:preview-requested", onPreviewRequested);
        const pending = pendingDirectorPreview();
        if (pending) onPreviewRequested(new CustomEvent("director:preview-requested", { detail: pending }));
        return () => window.removeEventListener("director:preview-requested", onPreviewRequested);
    }, [activeShot?.id, draft?.id, effectiveCanvasId, exportClayVideo]);

    if (!open || !draft || !activeShot) return null;

    // 位于 early return 之后，不能使用 Hook；每次渲染直接派生主题变量。
    const workbenchThemeStyle = {
        "--pd-s0": theme.canvas.background,
        "--pd-s1": theme.toolbar.panel,
        "--pd-s2": theme.toolbar.activeBg,
        "--pd-s3": theme.toolbar.itemHover,
        "--pd-s4": theme.toolbar.activeBg,
        "--pd-s5": theme.spatial.elevated,
        "--pd-b0": theme.toolbar.border,
        "--pd-b1": theme.node.stroke,
        "--pd-b2": theme.node.activeStroke,
        "--pd-t0": theme.node.text,
        "--pd-t1": theme.node.muted,
        "--pd-t2": theme.node.muted,
        "--pd-t3": theme.node.faint,
        "--pd-a0": theme.accent.primary,
        "--pd-a1": theme.accent.primary,
        "--pd-a-bg": theme.accent.primarySoft,
        "--pd-a-bd": theme.node.activeStroke,
        "--pd-a-on": theme.accent.onPrimary,
        "--pd-accent-rgb": "255 255 255",
        "--director-accent": theme.accent.primary,
        "--pd-a-on-theme": theme.accent.onPrimary,
        "--pd-a-bg-theme": theme.accent.primarySoft,
        "--pd-a-bd-theme": theme.node.activeStroke,
        "--pd-topbar": `${directorWindow.maximized && !compactLayout && mode === "animate" ? 47 : DIRECTOR_WORKBENCH_LAYOUT.topbar}px`,
        "--pd-toolrail": `${DIRECTOR_WORKBENCH_LAYOUT.toolbar}px`,
        "--pd-drawer": `${DIRECTOR_WORKBENCH_LAYOUT.drawer}px`,
        "--pd-inspector-min": `${DIRECTOR_WORKBENCH_LAYOUT.inspectorMin}px`,
        "--pd-inspector-max": `${DIRECTOR_WORKBENCH_LAYOUT.inspectorMax}px`,
        "--pd-bottom-min": `${DIRECTOR_WORKBENCH_LAYOUT.bottomMin}px`,
        "--pd-bottom-max": `${DIRECTOR_WORKBENCH_LAYOUT.bottomMax}px`,
        "--pd-done-bg": canvasThemes.light.accent.primary,
        "--pd-done-text": canvasThemes.light.accent.onPrimary,
    } as CSSProperties;

    const basicPrimitives: Array<{ name: string; size: string; primitive: "box" | "sphere" | "cylinder" | "plane"; scale: [number, number, number]; category: string }> = [
        { name: t("canvasExtra.directorWB.cube"), size: "1.0×1.0×1.0m", primitive: "box", scale: [1, 1, 1], category: "primitives" },
        { name: t("canvasExtra.directorWB.sphere"), size: "1.0×1.0×1.0m", primitive: "sphere", scale: [1, 1, 1], category: "primitives" },
        { name: t("canvasExtra.directorWB.cylinder"), size: "1.0×1.0×1.0m", primitive: "cylinder", scale: [1, 1, 1], category: "primitives" },
        { name: t("previs.v165.message047"), size: "2.0×0.05×2.0m", primitive: "plane", scale: [2, 0.05, 2], category: "primitives" },
    ];
    const allAssetItems: Array<{ name: string; size: string; primitive: "box" | "sphere" | "cylinder" | "plane"; scale: [number, number, number]; category: string; stageProp?: DirectorObject["stageProp"] }> = basicPrimitives;
    const filteredAssetItems = assetCategory === "all" ? allAssetItems : allAssetItems.filter((item) => item.category === assetCategory);
    const ASSET_CATEGORIES = [
        { id: "actors", label: t("directorR3.actorPreset") },
        { id: "all", label: t("common.all") },
        { id: "primitives", label: t("previs.v165.categoryPrimitives") },
        { id: "furniture", label: t("previs.v165.categoryFurniture") },
        { id: "architecture", label: t("previs.v165.categoryArchitecture") },
        { id: "space", label: t("previs.v165.categorySpace") },
        { id: "props", label: t("previs.v165.categoryProps") },
        { id: "custom", label: t("previs.v165.categoryCustom") },
    ];

    const selectWorkbenchShot = (id: string) => {
        setPlaying(false);
        setSelectedObjectId(null);
        setSelectedLightId(null);
        const segment = directorWorkbenchSegments(draft).find((item) => item.shotId === id);
        if (segment) {
            seekGlobalFrame(segment.startFrame);
            return;
        }
        commit((current) => directorSceneForShot(switchDirectorShot(rememberDirectorActors(current), id), id));
        setPlayhead(0);
    };
    return (
        <div
            ref={directorWindow.rootRef}
            role="dialog"
            aria-label={t("canvasExtra.tool.directorDesk")}
            tabIndex={-1}
            data-canvas-director-workbench
            data-canvas-no-zoom
            data-canvas-wheel-scroll
            data-maximized={directorWindow.maximized}
            data-theme={isDark ? "dark" : "light"}
            data-layout-mode={layoutMode}
            data-dynamic-rehearsal={capabilities.timeline && sequencerVisible}
            className={`director-desk director-window director-workbench-layout fixed z-[var(--z-toast)] min-h-0 min-w-0 overflow-hidden ${isDark ? "dark" : "light"}`}
            style={{ ...workbenchThemeStyle, ...directorWindow.style }}
            onKeyDown={onDirectorKeyDown}
            onKeyUp={(event) => event.stopPropagation()}
            onWheel={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
            onContextMenu={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            onMouseUp={(event) => event.stopPropagation()}
            onPointerMove={(event) => {
                directorWindow.move(event);
                containWorkbenchDrag(event);
            }}
            onPointerUp={(event) => {
                directorWindow.finish(event.pointerId);
                containWorkbenchDrag(event);
            }}
            onPointerCancel={(event) => {
                directorWindow.finish(event.pointerId);
                containWorkbenchDrag(event);
            }}
        >
            <input
                ref={modelInputRef}
                type="file"
                accept=".glb,.gltf"
                className="hidden"
                onChange={async (event) => {
                    const input = event.currentTarget;
                    try {
                        await uploadModel(input.files?.[0]);
                    } finally {
                        input.value = "";
                    }
                }}
            />
            {assistOpen && (
                <div className="director-assist-panel" id="director-assist-panel">
                    <DirectorDescriptionForm
                        canvasId={effectiveCanvasId}
                        nodes={imageNodes}
                        scene={draft}
                        onGenerated={(next) => {
                            setHistory((items) => [...items, structuredClone(draft)]);
                            setFuture([]);
                            setPlaying(false);
                            setPlayhead(0);
                            writeAndPublish(next);
                        }}
                    />
                    <DirectorPlanForm
                        key={draft.id}
                        canvasId={effectiveCanvasId}
                        nodeId={nodeId}
                        nodes={nodes}
                        connections={connections}
                        scene={draft}
                        prepare={async () => {
                            setPlaying(false);
                            stagedTransaction.end("commit");
                            const current = draftRef.current;
                            if (!current || recording) throw new Error(t("previs.ai.saveFirst"));
                            writeAndPublish(current);
                            if (!(await saveController.retry()) || !draftRef.current) throw new Error(t("previs.ai.saveFirst"));
                            return structuredClone(draftRef.current);
                        }}
                        onGenerated={(next) => {
                            setPlaying(false);
                            commit(() => next);
                            setPlayhead(0);
                        }}
                    />
                </div>
            )}
            <header
                className="director-window-titlebar director-desk-header thin-scrollbar overflow-x-auto overflow-y-hidden"
                onPointerDown={(event) => {
                    if (!(event.target as Element).closest("button, input, select, .ant-select, [role='button']")) directorWindow.begin(event);
                }}
                onDoubleClick={(event) => {
                    if (!(event.target as Element).closest("button, input, select, .ant-select, [role='button']")) directorWindow.toggleMaximized();
                }}
            >
                <div className="director-workbench-title-group">
                    <button type="button" className="director-desk-icon-button" aria-label={t("canvasExtra.directorWB.closeDirector")} title={t("canvasExtra.directorWB.closeDirector")} onClick={closeWorkbench}><ArrowLeft className="size-4" /></button>
                    <input ref={sceneTitleRef} className="director-desk-scene-title" aria-label={t("previs.v165.message092")} value={draft.title} onChange={(event) => replaceWithoutHistory((current) => ({ ...current, title: event.target.value }))} />
                    <button type="button" className="director-desk-icon-button" aria-label={t("previs.v165.message092")} title={t("previs.v165.message092")} onClick={() => { sceneTitleRef.current?.focus(); sceneTitleRef.current?.select(); }}><Edit2 className="size-3.5" /></button>
                    <DirectorWorkbenchSaveStatus indicator={saveIndicator} retrying={retrying} onRetry={() => void retrySave()} />
                </div>

                <nav className="director-mode-switch" aria-label={t("canvasExtra.directorWB.modeNavAria")}>
                    {DIRECTOR_MODES.map((item) => item.mode === "pose" || item.mode === "camera" ? null : (
                        <button
                            key={item.mode}
                            type="button"
                            className={`director-mode-switch-button ${mode === item.mode ? "is-active" : ""}`}
                            aria-pressed={mode === item.mode}
                            data-mode={item.mode}
                            title={item.hint}
                            onClick={(event) => {
                                setMode(item.mode);
                                releaseDirectorFocusAfterPointer(event);
                            }}
                        >
                            {item.mode === "layout" ? t("miscPages.staticRehearsal") : item.mode === "animate" ? t("miscPages.dynamicRehearsal") : item.label}
                        </button>
                    ))}

                </nav>

                <div className="director-desk-header-spacer" />

                <div className="director-desk-actions flex items-center gap-2 shrink-0">
                    <Dropdown trigger={["click"]} menu={{ items: DIRECTOR_MODES.filter(item => item.mode === "pose" || item.mode === "camera").map(item => ({ key: item.mode, label: item.label, onClick: () => setMode(item.mode) })) }}>
                        <button type="button" aria-label={t("directorNode.more")} className="director-desk-icon-button" data-director-secondary-modes>{mode === "pose" || mode === "camera" ? DIRECTOR_MODES.find(item => item.mode === mode)?.label : "⋯"}</button>
                    </Dropdown>
                    <button type="button" className="director-desk-icon-button" aria-label={t("canvasExtra.directorWB.undo")} title={t("canvasExtra.directorWB.undo")} onClick={undo} disabled={!history.length}><Undo2 className="size-4" /></button>
                    <button type="button" className="director-desk-icon-button" aria-label={t("canvasExtra.directorWB.redo")} title={t("canvasExtra.directorWB.redo")} onClick={redo} disabled={!future.length}><Redo2 className="size-4" /></button>
                    <button type="button" className="director-desk-icon-button" data-director-maximize aria-label={t(directorWindow.maximized ? "previs.v165.restore" : "previs.v165.maximize")} title={t(directorWindow.maximized ? "previs.v165.restore" : "previs.v165.maximize")} onClick={directorWindow.toggleMaximized}>{directorWindow.maximized ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}</button>
                    <button type="button" className="director-desk-header-action" aria-expanded={assistOpen} aria-controls="director-assist-panel" onClick={() => setAssistOpen((value) => !value)}>
                        <WandSparkles className="size-3.5" />
                        {t("directorD5.title")}
                    </button>
                    {onboardingScope ? (
                        <button
                            type="button"
                            className="director-desk-icon-button"
                            aria-label={t("canvasExtra.directorWB.restartOnboarding")}
                            title={t("canvasExtra.directorWB.restartOnboarding")}
                            onClick={() => setOnboardingRestartSignal((value) => value + 1)}
                        >
                            <Lightbulb className="size-3.5" />
                        </button>
                    ) : null}
                    <Select className="director-desk-header-select" aria-label={t("previs.v165.message097")} value={renderMode} options={renderModeOptions} onChange={(value: DirectorRenderMode) => setRenderMode(value)} size="small" />
                    {(previsV2 || !draft.previs) && <button type="button" className="director-desk-header-action is-secondary" title={t(draft?.previs ? "previs.export.exact" : "previs.export.preview")} aria-label={t(draft?.previs ? "previs.export.exact" : "previs.export.preview")} onClick={() => void exportClayVideo()} disabled={recording}>
                        <Video className="size-3.5" />
                        <span>{t("miscPages.springExport")}</span>
                    </button>}
                    <button type="button" className="director-desk-header-action is-secondary" title={t("previs.v165.message099")} aria-label={t("previs.v165.message099")} onClick={() => void applyToCanvas()} disabled={saving}>
                        <Save className="size-3.5" />
                        <span className="sr-only">{t("previs.v165.message099")}</span>
                    </button>
                    <button type="button" className="director-desk-header-action director-workbench-done" data-director-complete onClick={() => finishWorkbench(true)} disabled={recording || retrying || saveIndicator.busy}>
                        {t("creationStoryboard.done")}
                    </button>
                </div>
            </header>

            <div
                className="pv-layout director-workbench-body"
                data-scene-open={compactLayout ? scenePanelOpen : sceneDocked}
                data-inspector-open={compactLayout ? inspectorOpen : inspectorDocked}
            >
                <nav className="director-workbench-tools thin-scrollbar" aria-label={t("canvasExtra.directorWB.addSceneObject")}>
                    <button
                        type="button"
                        title={t(panView || transformMode !== "translate" ? "canvasExtra.directorDock.move" : "canvasExtra.shortcut.pan.title")}
                        aria-label={t("canvasExtra.tool.handTool")}
                        aria-pressed={panView}
                        onClick={() => {
                            if (panView || transformMode !== "translate") {
                                setTransformMode("translate");
                                return;
                            }
                            if (trajectoryDrawing) trajectoryPreviousViewModeRef.current = "free";
                            setTrajectoryDrawing(false);
                            setViewMode("free");
                            setHandTool(true);
                        }}
                    >{panView ? <Hand /> : <MousePointer2 />}</button>
                    <button type="button" title={t("canvasExtra.directorDock.rotate")} aria-label={t("canvasExtra.directorDock.rotate")} aria-pressed={!panView && transformMode === "rotate"} onClick={() => setTransformMode("rotate")}><Rotate3d /></button>
                    <button type="button" title={t("canvasExtra.directorDock.scale")} aria-label={t("canvasExtra.directorDock.scale")} aria-pressed={!panView && transformMode === "scale"} onClick={() => setTransformMode("scale")}><Scale3d /></button>
                    {previsV2 && <button type="button" title={t("directorP10.actors")} aria-label={t("directorP10.actors")} aria-expanded={compactLayout ? scenePanelOpen && leftPanelTab === "actors" : sceneDocked && leftPanelTab === "actors"} aria-controls="director-workbench-library" onClick={() => { setLeftPanelTab("actors"); if (compactLayout) setScenePanelOpen((value) => leftPanelTab !== "actors" || !value); else setSceneDocked((value) => leftPanelTab !== "actors" || !value); }}><UserRound /></button>}
                    <button type="button" title={t("previs.v165.tabAssets")} aria-label={t("previs.v165.tabAssets")} aria-expanded={compactLayout ? scenePanelOpen && leftPanelTab === "assets" : sceneDocked && leftPanelTab === "assets"} aria-controls="director-workbench-library" onClick={() => { setLeftPanelTab("assets"); if (compactLayout) setScenePanelOpen((value) => leftPanelTab !== "assets" || !value); else setSceneDocked((value) => leftPanelTab !== "assets" || !value); }}><Box /></button>
                    <button type="button" title={t("canvasExtra.directorWB.addCamera")} aria-label={t("canvasExtra.directorWB.addCamera")} onClick={addCamera}><Camera /></button>
                    <Dropdown menu={{ items: addLightMenuItems }} trigger={["click"]} placement="bottomLeft" classNames={{ root: "director-add-menu-overlay" }}>
                        <button type="button" title={t("canvasExtra.directorWB.addLight")} aria-label={t("canvasExtra.directorWB.addLight")}><Lightbulb /></button>
                    </Dropdown>
                    <button type="button" title={t("previs.v165.tabScene")} aria-label={t("previs.v165.tabScene")} aria-expanded={compactLayout ? scenePanelOpen && leftPanelTab === "scene" : sceneDocked && leftPanelTab === "scene"} aria-controls="director-workbench-library" onClick={() => { setLeftPanelTab("scene"); if (compactLayout) setScenePanelOpen((value) => leftPanelTab !== "scene" || !value); else setSceneDocked((value) => leftPanelTab !== "scene" || !value); }}><Layers /></button>
                    <button type="button" title={t("previs.v165.tabAssets")} aria-label={t("previs.v165.tabAssets")} aria-expanded={compactLayout ? scenePanelOpen && leftPanelTab === "assets" : sceneDocked && leftPanelTab === "assets"} aria-controls="director-workbench-library" onClick={() => { setLeftPanelTab("assets"); if (compactLayout) setScenePanelOpen((value) => leftPanelTab !== "assets" || !value); else setSceneDocked((value) => leftPanelTab !== "assets" || !value); }}><Boxes /></button>
                    <button type="button" title={t("canvasExtra.directorWB.inspectorSettings")} aria-label={t("canvasExtra.directorWB.inspectorSettings")} aria-expanded={compactLayout ? inspectorOpen : inspectorDocked} aria-controls="director-workbench-context" onClick={() => compactLayout ? setInspectorOpen((value) => !value) : setInspectorDocked((value) => !value)}><SlidersHorizontal /></button>
                </nav>
                {/* LEFT: Scene Entity List & Assets */}
                <aside id="director-workbench-library" className={`pv-panel pv-panel--left thin-scrollbar ${scenePanelOpen ? "is-open" : ""}`}>
                    <div className="pv-panel-header">
                        <div className="pv-panel-tabs flex items-center p-0.5 rounded-lg bg-[var(--pd-s2)] border border-[var(--pd-b0)]">
                            {previsV2 && <button type="button" className={`pv-panel-tab ${leftPanelTab === "actors" ? "is-active" : ""}`} aria-pressed={leftPanelTab === "actors"} onClick={() => setLeftPanelTab("actors")}>{t("directorP10.actors")}</button>}
                            <button type="button" className={`pv-panel-tab ${leftPanelTab === "scene" ? "is-active" : ""}`} onClick={() => setLeftPanelTab("scene")}>
                                <span className="flex items-center gap-1.5">
                                    <Layers className="size-3.5" />
                                    <span>{t("previs.v165.tabScene")}</span>
                                </span>
                            </button>
                            <button type="button" className={`pv-panel-tab ${leftPanelTab === "assets" ? "is-active" : ""}`} onClick={() => setLeftPanelTab("assets")}>
                                <span className="flex items-center gap-1.5">
                                    <Boxes className="size-3.5" />
                                    <span>{t("previs.v165.tabAssets")}</span>
                                </span>
                            </button>
                        </div>
                        <div className="pv-panel-header__actions flex items-center gap-1">
                            {leftPanelTab === "scene" ? (
                                <Dropdown
                                    menu={{
                                        items: [
                                            { key: "actors", label: t("previs.v165.message100"), icon: <UserRound className="size-4" />, children: actorTemplateMenuItems },
                                            { key: "objects", label: t("previs.v165.message101"), icon: <Box className="size-4" />, children: addObjectMenuItems },
                                            { key: "lights", label: t("canvasExtra.directorWB.addLight"), icon: <Lightbulb className="size-4" />, children: addLightMenuItems },
                                            { key: "camera", label: t("canvasExtra.directorWB.camera"), icon: <Camera className="size-4" />, onClick: addCamera },
                                        ],
                                    }}
                                    trigger={["click"]}
                                    placement="bottomRight"
                                    classNames={{ root: "director-add-menu-overlay" }}
                                >
                                    <button type="button" aria-label={t("scriptEditor.add")} className="pv-icon-btn" title={t("scriptEditor.add")}>
                                        <Plus className="size-4" />
                                    </button>
                                </Dropdown>
                            ) : (
                                <button type="button" className="pv-icon-btn" aria-label={t("previs.v165.message109")} title={t("previs.v165.message109")} onClick={() => modelInputRef.current?.click()}>
                                    <FileUp className="size-3.5" />
                                </button>
                            )}
                            <button type="button" className="pv-icon-btn pv-panel-collapse-btn" aria-label={t("previs.v165.collapse")} title={t("previs.v165.collapse")} onClick={() => (compactLayout ? setScenePanelOpen(false) : setSceneDocked(false))}>
                                <ChevronLeft className="size-3.5" />
                            </button>
                        </div>
                    </div>

                    {previsV2 && leftPanelTab === "actors" ? <DirectorActorDrawer scene={draft} onPlace={addDrawerActor} /> : leftPanelTab === "scene" || leftPanelTab === "actors" ? (
                        <>
                            <label className="pv-scene-search">
                                <Search className="size-3.5" />
                                <input aria-label={t("previs.v165.message104")} value={sceneQuery} onChange={(event) => setSceneQuery(event.target.value)} placeholder={t("previs.v165.message105")} />
                                {sceneQuery ? (
                                    <button type="button" aria-label={t("canvasLibrary.clearSearch")} onClick={() => setSceneQuery("")}>
                                        <X className="size-3" />
                                    </button>
                                ) : null}
                            </label>

                            {visibleSceneActors.length > 0 ? (
                                <section className="pv-entity-section">
                                    <div className="pv-entity-section__label">
                                        {t("storyboardAssets.character")}{" "}
                                        <span>
                                            {visibleSceneActors.length}
                                            {visibleSceneActors.length !== sceneActors.length ? `/${sceneActors.length}` : ""}
                                        </span>
                                    </div>
                                    {visibleSceneActors.map((actor) => {
                                        const isSelected = selectedActor?.id === actor.id;
                                        const color = resolveDirectorActorColor(actor.color);
                                        return (
                                            <div key={actor.id} className={`pv-entity-row ${isSelected ? "pv-entity-row--active" : ""}`}>
                                                <button type="button" className="pv-entity-row__main" onMouseDown={stopDirectorEntityPointer} onPointerDown={stopDirectorEntityPointer} onClick={() => selectSceneObject(actor.id)} aria-pressed={isSelected}>
                                                    <span className="pv-entity-row__avatar" style={{ background: color }}>
                                                        <UserRound className="size-3" />
                                                    </span>
                                                    <span className="pv-entity-row__info">
                                                        {editingEntityId === actor.id ? (
                                                            <input
                                                                className="pv-entity-inline-input"
                                                                value={editingEntityName}
                                                                autoFocus
                                                                onClick={(e) => e.stopPropagation()}
                                                                onChange={(e) => setEditingEntityName(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === "Enter") {
                                                                        updateObject(actor.id, { name: editingEntityName.trim() || actor.name });
                                                                        setEditingEntityId(null);
                                                                    } else if (e.key === "Escape") {
                                                                        setEditingEntityId(null);
                                                                    }
                                                                }}
                                                                onBlur={() => {
                                                                    updateObject(actor.id, { name: editingEntityName.trim() || actor.name });
                                                                    setEditingEntityId(null);
                                                                }}
                                                            />
                                                        ) : (
                                                            <span
                                                                className="pv-entity-row__name"
                                                                onDoubleClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditingEntityId(actor.id);
                                                                    setEditingEntityName(actor.name);
                                                                }}
                                                            >
                                                                {actor.name}
                                                            </span>
                                                        )}
                                                        <span className="pv-entity-row__meta">
                                                            {directorActorArchetypeLabel(actor.archetype)} · {actor.pose ? directorPoseLabel(actor.pose) : t("canvasExtra.directorWB.poseStand")}
                                                        </span>
                                                    </span>
                                                </button>
                                                <div className="pv-entity-row__tools">
                                                    <button
                                                        type="button"
                                                        className="pv-icon-btn-ghost"
                                                        title={t(actor.visible !== false ? "canvasToolbar.hide" : "canvasToolbar.show", { label: actor.name })}
                                                        aria-label={t(actor.visible !== false ? "canvasToolbar.hide" : "canvasToolbar.show", { label: actor.name })}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            updateObject(actor.id, { visible: actor.visible === false });
                                                        }}
                                                    >
                                                        {actor.visible !== false ? <Eye className="size-3 text-[var(--pd-t2)]" /> : <EyeOff className="size-3 text-[var(--accent-danger)]" />}
                                                    </button>
                                                    <button type="button" className="pv-entity-row__del" aria-label={t("cloudAgent.deletedP0", { p0: actor.name })} onClick={() => removeObject(actor.id)}>
                                                        <X className="size-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </section>
                            ) : (
                                <div className="pv-empty-hint">
                                    <UserRound className="size-5 opacity-30" />
                                    <span>{t("previs.v165.message106")}</span>
                                    <Dropdown menu={{ items: actorTemplateMenuItems }} trigger={["click"]} placement="bottom" classNames={{ root: "director-add-menu-overlay" }}>
                                        <button type="button" className="pv-btn pv-btn--sm">
                                            {t("previs.v165.message100")}
                                        </button>
                                    </Dropdown>
                                </div>
                            )}

                            <section className="pv-entity-section">
                                <div className="pv-entity-section__label">
                                    <span>
                                        {t("canvasExtra.directorNP.statCameras")}{" "}
                                        <span className="pv-entity-section__count">
                                            {visibleCameras.length}
                                            {visibleCameras.length !== draft.cameras.length ? `/${draft.cameras.length}` : ""}
                                        </span>
                                    </span>
                                </div>
                                {visibleCameras.map((camera) => {
                                    const isViewed = (selectedCameraId || activeShot?.cameraId) === camera.id;
                                    const isActiveShotCamera = activeShot?.cameraId === camera.id;
                                    return (
                                        <div key={camera.id} className={`pv-entity-row ${isViewed && !selectedObjectId ? "pv-entity-row--active" : ""}`}>
                                            <button type="button" className="pv-entity-row__main" onMouseDown={stopDirectorEntityPointer} onPointerDown={stopDirectorEntityPointer} onClick={() => selectSceneCamera(camera.id)} aria-pressed={isViewed}>
                                                <span className="pv-entity-row__icon">
                                                    <Camera className="size-3.5" />
                                                </span>
                                                <span className="pv-entity-row__info">
                                                    {editingEntityId === camera.id ? (
                                                        <input
                                                            className="pv-entity-inline-input"
                                                            value={editingEntityName}
                                                            autoFocus
                                                            onClick={(e) => e.stopPropagation()}
                                                            onChange={(e) => setEditingEntityName(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter") {
                                                                    updateCamera(camera.id, { name: editingEntityName.trim() || camera.name });
                                                                    setEditingEntityId(null);
                                                                } else if (e.key === "Escape") {
                                                                    setEditingEntityId(null);
                                                                }
                                                            }}
                                                            onBlur={() => {
                                                                updateCamera(camera.id, { name: editingEntityName.trim() || camera.name });
                                                                setEditingEntityId(null);
                                                            }}
                                                        />
                                                    ) : (
                                                        <span
                                                            className="pv-entity-row__name"
                                                            onDoubleClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingEntityId(camera.id);
                                                                setEditingEntityName(camera.name);
                                                            }}
                                                        >
                                                            {camera.name}
                                                        </span>
                                                    )}
                                                    <span className="pv-entity-row__meta">
                                                        {camera.focalLength}mm · f/{camera.aperture}
                                                    </span>
                                                </span>
                                                {isViewed ? <span className="pv-entity-row__badge">{isActiveShotCamera ? t("workflowNavigator.current") : t("cloudAgent.view")}</span> : null}
                                            </button>
                                            {draft.cameras.length > 1 ? (
                                                <button type="button" className="pv-entity-row__del" aria-label={t("cloudAgent.deletedP0", { p0: camera.name })} onClick={() => removeCamera(camera.id)}>
                                                    <X className="size-3" />
                                                </button>
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </section>

                            {visibleLights.length > 0 ? (
                                <section className="pv-entity-section">
                                    <div className="pv-entity-section__label">
                                        {t("canvasExtra.directorWB.lightDefaultName")}{" "}
                                        <span>
                                            {visibleLights.length}
                                            {visibleLights.length !== draft.lights.length ? `/${draft.lights.length}` : ""}
                                        </span>
                                    </div>
                                    {visibleLights.map((light) => (
                                        <div key={light.id} className={`pv-entity-row ${selectedLightId === light.id ? "pv-entity-row--active" : ""}`}>
                                            <button
                                                type="button"
                                                className="pv-entity-row__main"
                                                onClick={() => selectSceneLight(light.id)}
                                            >
                                                <Lightbulb className="size-3.5 opacity-50 flex-shrink-0" />
                                                <span className="pv-entity-row__info">
                                                    {editingEntityId === light.id ? (
                                                        <input
                                                            className="pv-entity-inline-input"
                                                            value={editingEntityName}
                                                            autoFocus
                                                            onClick={(e) => e.stopPropagation()}
                                                            onChange={(e) => setEditingEntityName(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter") {
                                                                    updateLight(light.id, { name: editingEntityName.trim() || light.name });
                                                                    setEditingEntityId(null);
                                                                } else if (e.key === "Escape") {
                                                                    setEditingEntityId(null);
                                                                }
                                                            }}
                                                            onBlur={() => {
                                                                updateLight(light.id, { name: editingEntityName.trim() || light.name });
                                                                setEditingEntityId(null);
                                                            }}
                                                        />
                                                    ) : (
                                                        <span
                                                            className="pv-entity-row__name"
                                                            onDoubleClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingEntityId(light.id);
                                                                setEditingEntityName(light.name);
                                                            }}
                                                        >
                                                            {light.name}
                                                        </span>
                                                    )}
                                                    <span className="pv-entity-row__meta">
                                                        {light.type === "directional"
                                                            ? t("previs.v165.message116")
                                                            : light.type === "point"
                                                              ? t("canvasExtra.directorWB.lightPoint")
                                                              : light.type === "spot"
                                                                ? t("previs.v165.message117")
                                                                : t("checkout.environment")}{" "}
                                                        × {light.intensity.toFixed(1)}
                                                    </span>
                                                </span>
                                            </button>
                                            <button type="button" className="pv-entity-row__del" aria-label={t("cloudAgent.deletedP0", { p0: light.name })} onClick={() => removeLight(light.id)}>
                                                <X className="size-3" />
                                            </button>
                                        </div>
                                    ))}
                                </section>
                            ) : null}

                            {visibleSceneProps.length > 0 ? (
                                <section className="pv-entity-section">
                                    <div className="pv-entity-section__label">
                                        {t("storyboardAssets.prop")}{" "}
                                        <span>
                                            {visibleSceneProps.length}
                                            {visibleSceneProps.length !== sceneProps.length ? `/${sceneProps.length}` : ""}
                                        </span>
                                    </div>
                                    {visibleSceneProps.map((obj) => (
                                        <div key={obj.id} className={`pv-entity-row ${selectedObjectId === obj.id ? "pv-entity-row--active" : ""}`}>
                                            <button
                                                type="button"
                                                className="pv-entity-row__main"
                                                aria-pressed={selectedObjectId === obj.id}
                                                onMouseDown={stopDirectorEntityPointer}
                                                onPointerDown={stopDirectorEntityPointer}
                                                onClick={() => selectSceneObject(obj.id)}
                                            >
                                                <span className="pv-entity-row__color-dot" style={{ background: obj.color }} />
                                                <span className="pv-entity-row__info">
                                                    {editingEntityId === obj.id ? (
                                                        <input
                                                            className="pv-entity-inline-input"
                                                            value={editingEntityName}
                                                            autoFocus
                                                            onClick={(e) => e.stopPropagation()}
                                                            onChange={(e) => setEditingEntityName(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter") {
                                                                    updateObject(obj.id, { name: editingEntityName.trim() || obj.name });
                                                                    setEditingEntityId(null);
                                                                } else if (e.key === "Escape") {
                                                                    setEditingEntityId(null);
                                                                }
                                                            }}
                                                            onBlur={() => {
                                                                updateObject(obj.id, { name: editingEntityName.trim() || obj.name });
                                                                setEditingEntityId(null);
                                                            }}
                                                        />
                                                    ) : (
                                                        <span
                                                            className="pv-entity-row__name"
                                                            onDoubleClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingEntityId(obj.id);
                                                                setEditingEntityName(obj.name);
                                                            }}
                                                        >
                                                            {obj.name}
                                                        </span>
                                                    )}
                                                    <span className="pv-entity-row__meta">
                                                        {obj.kind === "billboard"
                                                            ? t("canvasContextMenu.backdrop")
                                                            : obj.kind === "model"
                                                              ? t("ledger.model")
                                                              : obj.primitive === "plane"
                                                                ? t("previs.v165.message047")
                                                                : obj.primitive === "sphere"
                                                                  ? t("canvasExtra.directorWB.sphere")
                                                                  : obj.primitive === "cylinder"
                                                                    ? t("canvasExtra.directorWB.cylinder")
                                                                    : t("previs.v165.message107")}{" "}
                                                        · {obj.transform.scale.map((v) => v.toFixed(1)).join("×")}m
                                                    </span>
                                                </span>
                                            </button>
                                            <div className="pv-entity-row__tools">
                                                <button
                                                    type="button"
                                                    className="pv-icon-btn-ghost"
                                                    title={t(obj.visible !== false ? "canvasToolbar.hide" : "canvasToolbar.show", { label: obj.name })}
                                                    aria-label={t(obj.visible !== false ? "canvasToolbar.hide" : "canvasToolbar.show", { label: obj.name })}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        updateObject(obj.id, { visible: obj.visible === false });
                                                    }}
                                                >
                                                    {obj.visible !== false ? <Eye className="size-3 text-[var(--pd-t2)]" /> : <EyeOff className="size-3 text-[var(--accent-danger)]" />}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="pv-entity-row__del"
                                                    aria-label={t("canvasExtra.directorWB.deleteLabel", { label: obj.name })}
                                                    title={t("canvasExtra.directorWB.deleteLabel", { label: obj.name })}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        removeObject(obj.id);
                                                        releaseDirectorFocusAfterPointer(event);
                                                    }}
                                                >
                                                    <X className="size-3" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </section>
                            ) : null}

                            {imageNodes.length > 0 ? (
                                <section className="pv-entity-section">
                                    <div className="pv-entity-section__label">{t("previs.v165.message112")}</div>
                                    <div className="pv-bg-list">
                                        {imageNodes.slice(0, 4).map((node) => {
                                            const linked = draft.objects.find((o) => o.sourceNodeId === node.id);
                                            const isPanorama = draft.environment?.sourceNodeId === node.id;
                                            return (
                                                <div key={node.id} className="pv-bg-row">
                                                    <button
                                                        type="button"
                                                        className="pv-bg-row__thumb"
                                                        onMouseDown={stopDirectorEntityPointer}
                                                        onPointerDown={stopDirectorEntityPointer}
                                                        onClick={() => (linked ? selectSceneObject(linked.id) : void addBillboard(node))}
                                                        title={node.title || t("canvasExtra.nodeAsset.image")}
                                                    >
                                                        {node.metadata?.content ? <img src={node.metadata.content} alt="" className="pv-bg-row__img" /> : <ImageIcon className="size-3.5 opacity-50" />}
                                                        <span className="pv-bg-row__name">{node.title || t("editorTools.image")}</span>
                                                    </button>
                                                    <div className="pv-bg-row__btns">
                                                        <button type="button" className={`pv-bg-btn ${isPanorama ? "pv-bg-btn--active" : ""}`} title={t("previs.v165.message113")} onClick={() => setPanoramaEnvironment(node)}>
                                                            360°
                                                        </button>
                                                        {linked ? (
                                                            <button type="button" className="pv-bg-btn pv-bg-btn--danger" title={t("projectSettings.remove")} onClick={() => removeObject(linked.id)}>
                                                                <X className="size-3" />
                                                            </button>
                                                        ) : (
                                                            <button type="button" className="pv-bg-btn" title={t("previs.v165.message114")} onClick={() => void addBillboard(node)}>
                                                                {t("cloudAgent.add_451755")}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {draft.environment?.mode === "panorama" ? (
                                        <div className="pv-panorama-badge">
                                            <span>{t("previs.v165.message115")}</span>
                                            <button type="button" onClick={clearPanoramaEnvironment}>
                                                {t("projectSettings.remove")}
                                            </button>
                                        </div>
                                    ) : null}
                                </section>
                            ) : null}
                        </>
                    ) : (
                        <div className="pv-assets-container">
                            <nav className="director-library-tabs" aria-label={t("previs.v165.tabAssets")}>
                                {([
                                    ["actors", t("canvasExtra.directorWB.actor"), UserRound], ["primitives", t("previs.v165.categoryProps"), Box],
                                    ["background", t("canvasAppearance.background"), ImageIcon], ["cameras", t("canvasExtra.directorWB.camera"), Camera],
                                ] as const).map(([id,label,Icon]) => <button key={id} type="button" aria-label={label} title={label} aria-pressed={assetCategory === id}
                                    onClick={() => { setAssetQuery(""); setAssetCategory(id); }}><Icon size={17}/></button>)}
                            </nav>
                            <input type="search" className="director-library-search" aria-label={t("common.search")} placeholder={t("common.search")} value={assetQuery} onChange={event => setAssetQuery(event.target.value)} />
                            {assetCategory === "background" ? <label className="director-studio-field">{t("canvasAppearance.background")}<input type="color" value={draft.background}
                                onChange={event => { const background = event.target.value; commit(current => ({ ...current, background })); }} /></label> :
                            assetCategory === "cameras" ? <div className="pv-asset-grid">{CAMERA_PRESETS.filter(preset => preset.label.toLocaleLowerCase().includes(assetQuery.trim().toLocaleLowerCase())).map(preset =>
                                <button type="button" className="pv-asset-card" key={preset.key} onClick={() => addCameraPreset(preset)}><Camera size={20}/>{preset.label}</button>)}</div> : <>
                            <details className="director-preset-options"><summary>{t("directorR3.template")}</summary>
                            <Select<string> className="w-full" placeholder={t("directorR3.actorPreset")} value={undefined} options={DIRECTOR_MANNEQUIN_PRESETS.map((preset) => ({ value: preset.id, label: `${directorActorArchetypeLabel(preset.archetype)} · ${preset.heldProp ? directorPropLabel("document") : directorPoseLabel(preset.pose)}` }))} onChange={(id) => addObject(createDirectorMannequinPreset(id, t("canvasExtra.directorWB.actor")))} />
                            <Select<keyof typeof DIRECTOR_SCENE_PRESETS> className="w-full" placeholder={t("directorR3.template")} value={undefined} options={(Object.keys(DIRECTOR_SCENE_PRESETS) as (keyof typeof DIRECTOR_SCENE_PRESETS)[]).map((id) => ({ value: id, label: t(`directorR3.${id}`) }))} onChange={(id) => commit((current) => ({ ...current, objects: [...current.objects.filter((object) => object.kind === "actor"), ...createDirectorScenePreset(id)] }))} />
                            </details>
                            <div className="pv-asset-categories thin-scrollbar">
                                {ASSET_CATEGORIES.map((cat) => (
                                    <button key={cat.id} type="button" aria-pressed={assetCategory === cat.id} className={`pv-asset-category-chip ${assetCategory === cat.id ? "is-active" : ""}`} onClick={() => setAssetCategory(cat.id)}>
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                            <div className="pv-asset-upload-dropzone" onClick={() => modelInputRef.current?.click()} role="button" tabIndex={0}>
                                <FileUp className="size-4 text-[var(--accent-primary)] opacity-80" />
                                <div className="pv-asset-upload-dropzone__text">
                                    <span className="pv-asset-upload-dropzone__title">{t("previs.v165.message109")}</span>
                                    <span className="pv-asset-upload-dropzone__sub">GLB / GLTF · &lt; 50MB</span>
                                </div>
                            </div>
                            <div className="pv-asset-grid">
                                {(assetCategory === "actors" || assetCategory === "all") && ACTOR_TEMPLATES.filter(item => ["std-male", "std-female", "teen", "child"].includes(item.key) && item.label.toLocaleLowerCase().includes(assetQuery.trim().toLocaleLowerCase())).map(item => (
                                    <button type="button" className="pv-asset-card director-actor-preset-card" key={item.key} onClick={() => addActorFromTemplate(item)}>
                                        <img src={`/examples/spring-record/actor-${item.key}.png`} alt="" />
                                        <span>{item.label}</span>
                                    </button>
                                ))}
                                {filteredAssetItems.filter(item => item.name.toLocaleLowerCase().includes(assetQuery.trim().toLocaleLowerCase())).map((item) => (
                                    <button
                                        key={`${item.category}-${item.name}`}
                                        type="button"
                                        className="pv-asset-card"
                                        draggable
                                        onDragStart={(e) => {
                                            e.dataTransfer.setData("application/json", JSON.stringify({ primitive: item.primitive, name: item.name, scale: item.scale, stageProp: item.stageProp }));
                                            e.dataTransfer.effectAllowed = "copy";
                                        }}
                                        onClick={() => {
                                            const obj = item.stageProp ? createDirectorPropPreset(item.stageProp) : createDirectorObject(item.primitive, item.name);
                                            addObject({ ...obj, stageProp: item.stageProp, transform: { ...obj.transform, scale: item.scale } });
                                            message.success(`${t("cloudAgent.add_451755")}: ${item.name}`);
                                        }}
                                        title={`${item.name} (${item.size})`}
                                    >
                                        <div className="pv-asset-card__thumb">
                                            <PropSilhouette name={item.name} primitive={item.primitive} />
                                        </div>
                                        <div className="pv-asset-card__info">
                                            <span className="pv-asset-card__name">{item.name}</span>
                                            <span className="pv-asset-card__size">{item.size}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            {previsV2 && <DirectorPropDrawer query={assetQuery} category={assetCategory} onPlace={addObject} />}
                            {modelAssets.length > 0 && (assetCategory === "all" || assetCategory === "custom") ? (
                                <section className="pv-entity-section" style={{ marginTop: 12 }}>
                                    <div className="pv-entity-section__label">
                                        {t("previs.v165.message110")}
                                        <span>{modelAssets.length}</span>
                                    </div>
                                    <div className="pv-asset-grid">
                                        {modelAssets.filter(asset => asset.title.toLocaleLowerCase().includes(assetQuery.trim().toLocaleLowerCase())).map((asset) => (
                                            <button key={asset.id} type="button" className="pv-asset-card" onClick={() => addModelAsset(asset)} title={asset.title}>
                                                <div className="pv-asset-card__thumb">
                                                    <BoxSelect className="size-6 text-[var(--accent-primary)] opacity-80" />
                                                </div>
                                                <div className="pv-asset-card__info">
                                                    <span className="pv-asset-card__name">{asset.title}</span>
                                                    <span className="pv-asset-card__size">{t("ledger.model")}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            ) : null}
                            </>}
                        </div>
                    )}
                </aside>

                {/* CENTER: Single viewport with contextual tool layer */}
                <main
                    className={`pv-viewport-area ${viewMode === "camera" ? "has-plan" : ""}`}
                    onDragOver={(e) => {
                        if (e.dataTransfer.types.includes("application/json") || e.dataTransfer.types.includes(DIRECTOR_ACTOR_DRAG_TYPE)) {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "copy";
                        }
                    }}
                    onDrop={(e) => {
                        e.preventDefault();
                        try {
                            const actorSource = e.dataTransfer.getData(DIRECTOR_ACTOR_DRAG_TYPE);
                            if (actorSource) {
                                if (actorSource === "new" || draft.objects.some((object) => object.id === actorSource && object.kind === "actor")) addDrawerActor(actorSource === "new" ? undefined : actorSource);
                                return;
                            }
                            const raw = e.dataTransfer.getData("application/json");
                            if (raw) {
                                const data = JSON.parse(raw);
                                if (data?.primitive && data?.name) {
                                    const obj = data.stageProp ? createDirectorPropPreset(data.stageProp) : createDirectorObject(data.primitive, data.name);
                                    addObject({ ...obj, stageProp: data.stageProp, transform: { ...obj.transform, scale: data.scale || [1, 1, 1] } });
                                    message.success(`${t("cloudAgent.add_451755")}: ${data.name}`);
                                }
                            }
                        } catch {
                            // ignore malformed drag data
                        }
                    }}
                >
                    <div className="director-shot-context">
                        <span className="director-shot-context-mark">
                            <Video className="size-3.5" />
                            {t("directorD4.previs")}
                        </span>
                        <strong>{activeShot.name}</strong>
                        <span className="director-shot-context-cast">
                            {draft.objects
                                .filter((object) => object.kind === "actor" && object.visible !== false)
                                .map((object) => object.characterBinding?.characterName || object.name)
                                .join(" · ")}
                        </span>
                        <span>{activeCamera && `${Number(activeCamera.focalLength.toFixed(1))} mm`}</span>
                        <span>{activeShot.aspectRatio}</span>
                        <span>{activeShot.duration}s</span>
                    </div>

                    <div className={viewMode === "camera" ? "director-lens-pane" : "director-editor-pane"}>
                    {viewMode === "camera" && <span className="director-lens-heading">{t("directorR3.cameraView")}</span>}
                    <div className={viewMode === "camera" ? "director-shot-stage" : "director-editor-stage"} style={{ "--director-shot-aspect": resolveDirectorAspectRatio(draft.previs?.aspect ?? activeShot.aspectRatio) } as CSSProperties}>
                        <DirectorViewport
                            ref={viewportRef}
                            panView={panView}
                            scene={previsV2 ? routeEditor.scene ?? draft : draft}
                            selectedObjectId={selectedObjectId}
                            selectedBone={null}
                            transformMode={transformMode}
                            renderMode={renderMode}
                            playhead={playhead}
                            playing={playing}
                            showMotionPaths
                            routeEditing={previsV2 ? routeEditor : undefined}
                            cameraPathEditing={previsV2 ? cameraPathEditor : undefined}
                            trajectoryDrawing={trajectoryDrawing}
                            onTrajectoryComplete={handleTrajectoryComplete}
                            viewMode={viewMode}
                            onSelectObject={setSelectedObjectId}
                            onSelectBone={setSelectedBone}
                            onGroundClick={previsV2 && cameraPathEditor.adding ? cameraPathEditor.addAt : previsV2 && routeEditor.adding ? routeEditor.addAt : handleGroundClick}
                            onObjectTransform={handleObjectTransform}
                            onBoneTransform={handleBoneTransform}
                            onActorRigReady={handleActorRigReady}
                            selectedCameraId={selectedCameraId}
                            onSelectCamera={selectSceneCamera}
                            onCameraTransform={handleCameraTransform}
                            showModelLoadNotice
                            showNavigation={false}
                            pipCanvasRef={pipCanvasRef}
                        />
                    </div>
                    </div>
                    <aside className="director-plan-pane" data-director-plan><header>{t("directorR3.planView")}</header><DirectorPlanViewport scene={previsV2 ? routeEditor.scene ?? draft : draft} shotId={activeShot.id} time={playhead} playing={playing} onSelectObject={setSelectedObjectId} selectedActorId={selectedObject?.kind === "actor" ? selectedObject.id : null} routeEditing={previsV2 ? routeEditor : undefined} /></aside>
                    <CanvasDirectorOnboarding scope={onboardingScope} open={open} restartSignal={onboardingRestartSignal} className="pv-onboarding" />
                    {viewMode !== "camera" && <DirectorCameraPip scope={onboardingScope} canvasRef={pipCanvasRef} camera={activeCamera} scene={draft} playhead={playhead} shot={activeShot} viewMode={viewMode} onSelectShot={selectWorkbenchShot} onSwapView={() => setViewMode("camera")} />}
                    {viewMode === "camera" && (selectedCamera || activeCamera) ? (
                        <div className="pv-cam-hud" role="status">
                            <Camera className="size-3" />
                            <span>{(selectedCamera || activeCamera)?.name}</span>
                            <span className="pv-cam-hud__meta">{(selectedCamera || activeCamera)?.focalLength}mm</span>
                        </div>
                    ) : null}
                    {!compactLayout && <DirectorOrientation viewport={viewportRef} onView={setViewMode} onReset={() => { setViewMode("free"); viewportRef.current?.resetCamera(); }} />}
                    {trajectoryDrawing ? (
                        <div className="pv-trajectory-guide" role="status">
                            <Route className="size-3.5" />
                            {trajectoryTarget ? (
                                <>
                                    <span>
                                        {t("previs.v165.message118")}
                                        {trajectoryTarget.name}
                                        {t("previs.v165.message119")}
                                        {trajectoryTarget.kind === "camera" ? t("previs.v165.message120") : t("previs.v165.message121")}
                                    </span>
                                    <small>{t("previs.v165.message122")}</small>
                                </>
                            ) : (
                                <>
                                    <span>{t("previs.v165.message123")}</span>
                                    <small>{t("previs.v165.message124")}</small>
                                </>
                            )}
                        </div>
                    ) : null}
                </main>

                <DirectorContextPanel
                    objectList={!compactLayout && (
                        <>
                        <section className="director-context-objects">
                            <strong>{t("directorNode.objects")}</strong>
                            <input aria-label={t("previs.v165.message104")} placeholder={t("previs.v165.message105")} value={sceneQuery} onChange={event => setSceneQuery(event.target.value)} />
                            {[
                                { title: t("canvasExtra.directorWB.camera"), items: visibleCameras, select: selectSceneCamera },
                                { title: t("canvasExtra.directorWB.actor"), items: visibleSceneActors, select: selectSceneObject },
                                { title: t("previs.v165.categoryProps"), items: visibleSceneProps, select: selectSceneObject },
                                { title: t("canvasExtra.directorWB.lightDefaultName"), items: visibleLights, select: selectSceneLight },
                            ].map((group, index) => (
                                <details key={group.title} open={index < 2 || Boolean(sceneQuery)}>
                                    <summary>{[<Camera size={14} />, <UserRound size={14} />, <Box size={14} />, <Lightbulb size={14} />][index]} {group.title} <small>{group.items.length}</small></summary>
                                    {group.items.map(item => <div className="director-object-line" key={item.id}><button key={item.id} type="button" aria-pressed={selectedCameraId === item.id || selectedObjectId === item.id || selectedLightId === item.id} onClick={() => group.select(item.id)}>{item.name}</button>
                                        {"primitive" in item || "kind" in item ? <button type="button" className="director-object-eye" aria-label={t(item.visible ? "canvasToolbar.hide" : "canvasToolbar.show", {label:item.name})} onClick={() => updateObject(item.id, { visible: !item.visible })}>{item.visible ? <Eye size={14} /> : <EyeOff size={14} />}</button> : null}</div>)}
                                </details>
                            ))}
                        </section>
                        {!selectedObject && !selectedLight && !selectedCameraId && <section className="director-studio-controls">
                            <strong>{t("directorNode.properties")}</strong>
                            <label className="director-studio-preset">{t("directorNode.environmentPreset")}
                                <select value={draft.background === "#eeeeee" && draft.groundColor === "#d5d5d5" ? "clay" : draft.background === "#5a605f" && draft.groundColor === "#a79b88" ? "studio" : "custom"}
                                    onChange={event => { const clay = event.target.value === "clay"; commit(current => ({ ...current, stageLook: "studio", environment: { ...current.environment, mode: "color" }, background: clay ? "#eeeeee" : "#5a605f", groundColor: clay ? "#d5d5d5" : "#a79b88" })); }}>
                                    <option value="custom" disabled>{t("previs.v165.categoryCustom")}</option><option value="studio">{t("directorNode.studio")}</option><option value="clay">{t("canvasExtra.directorWB.renderClay")}</option>
                                </select>
                            </label>
                            <label className="director-studio-field">{t("canvasAppearance.background")}<output>{draft.background.toUpperCase()}</output><input type="color" value={draft.background} onChange={event => { const background = event.target.value; commit(current => ({ ...current, background })); }} /></label>
                            <label className="director-studio-field">{t("directorR3.part.platform-ground")}<output>{(draft.groundColor ?? "#d5d5d5").toUpperCase()}</output><input type="color" value={draft.groundColor ?? "#d5d5d5"} onChange={event => { const groundColor = event.target.value; commit(current => ({ ...current, groundColor })); }} /></label>
                            <label className="director-studio-field">{t("directorNode.showFloor")}<input type="checkbox" checked={draft.groundVisible !== false} onChange={e => { const groundVisible = e.target.checked; commit(current => ({ ...current, groundVisible })); }} /></label>
                            <label className="director-studio-field">{t("directorNode.floorOpacity")}<input aria-label={t("directorNode.floorOpacity")} type="number" min={0} max={100} disabled={draft.groundVisible === false} value={Math.round((draft.groundOpacity ?? 1) * 100)} onChange={e => { const n = e.target.valueAsNumber; if (Number.isFinite(n)) commit(current => ({ ...current, groundOpacity: Math.max(0, Math.min(n, 100)) / 100 })); }} />%</label>
                            <label className="director-studio-field">{t("directorNode.exposure")}<input type="number" min={0.1} max={4} step={0.05} value={draft.stageExposure ?? 1} onChange={e => { const n = e.target.valueAsNumber; if (Number.isFinite(n)) commit(current => ({ ...current, stageExposure: Math.max(0.1, Math.min(4, n)) })); }} /></label>
                            <label className="director-studio-field">{t("canvasAppearance.grid")}<input type="checkbox" checked={draft.gridVisible} onChange={() => commit(current => ({ ...current, gridVisible: !current.gridVisible }))} /></label>
                        </section>}</>
                    )}
                    previsV2={previsV2}
                    routeEditor={previsV2 ? routeEditor : undefined}
                    cameraPathEditor={previsV2 ? cameraPathEditor : undefined}
                    draft={previsV2 ? cameraPathEditor.scene ?? draft : draft}
                    activeShot={activeShot}
                    selectedObject={selectedObject}
                    selectedLight={selectedLight}
                    selectedActor={selectedActor}
                    inspectorCamera={inspectorCamera}
                    selectedCameraId={selectedCameraId}
                    selectedBone={selectedBone}
                    selectedObjectRendered={selectedObjectRendered}
                    snappedPlayhead={snappedPlayhead}
                    capabilities={capabilities}
                    inspectorOpen={inspectorOpen}
                    imageNodes={imageNodes}
                    recording={recording}
                    saving={saving}
                    lastClayExport={lastClayExport}
                    outputFailure={outputFailure}
                    compiledPrompt={compiledPrompt}
                    onCollapse={() => (compactLayout ? setInspectorOpen(false) : setInspectorDocked(false))}
                    updateShot={updateShot}
                    setSelectedCameraId={setSelectedCameraId}
                    addShot={addShot}
                    enterAnimationMode={enterAnimationMode}
                    updateObject={updateObject}
                    setSelectedBone={setSelectedBone}
                    writeBoneRotation={writeBoneRotation}
                    stagedTransaction={stagedTransaction}
                    handleObjectTransform={handleObjectTransform}
                    recordSelectedKeyframe={recordSelectedKeyframe}
                    duplicateObject={duplicateObject}
                    removeObject={removeObject}
                    updateLight={updateLight}
                    removeLight={removeLight}
                    commit={commit}
                    addCameraKeyframe={addCameraKeyframe}
                    applyCameraMove={applyCameraMove}
                    alignCameraToView={alignCameraToView}
                    exportClayVideo={exportClayVideo}
                    applyToCanvas={applyToCanvas}
                    setSelectedObjectId={setSelectedObjectId}
                    copyCompiledPrompt={copyCompiledPrompt}
                />
                <DirectorCanvasDock
                    theme={theme}
                    transformMode={transformMode}
                    onTransformModeChange={setTransformMode}
                    renderMode={renderMode}
                    renderModes={capabilities.renderModes}
                    onRenderModeChange={setRenderMode}
                    onAddActor={addActor}
                    onAddBox={() => addPrimitive("box", t("canvasExtra.directorWB.cube"))}
                    onAddLight={addLight}
                    onAddCamera={addCamera}
                    onAlignCamera={alignCameraToView}
                    trajectoryDrawing={trajectoryDrawing}
                    trajectoryKind={trajectoryTarget?.kind ?? null}
                    onToggleTrajectory={() => setTrajectoryDrawing((active) => !active)}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    cameras={draft.cameras}
                    viewedCameraId={selectedCameraId || activeShot.cameraId || null}
                    onViewCamera={(id) => {
                        setSelectedCameraId(id);
                        setSelectedObjectId(null);
                        setSelectedLightId(null);
                        setViewMode("camera");
                    }}
                    onFocusSelected={() => viewportRef.current?.focusSelected()}
                    onFrameScene={() => viewportRef.current?.frameScene()}
                    onZoom={(factor) => viewportRef.current?.zoom(factor)}
                    timelineOpen={capabilities.timeline && sequencerVisible}
                    onOpenTimeline={enterAnimationMode}
                    scenePanelOpen={compactLayout ? scenePanelOpen : sceneDocked}
                    onToggleScenePanel={() => (compactLayout ? setScenePanelOpen((value) => !value) : setSceneDocked((value) => !value))}
                    inspectorOpen={compactLayout ? inspectorOpen : inspectorDocked}
                    onToggleInspector={() => (compactLayout ? setInspectorOpen((value) => !value) : setInspectorDocked((value) => !value))}
                    canUndo={history.length > 0}
                    canRedo={future.length > 0}
                    onUndo={undo}
                    onRedo={redo}
                />
            </div>
            <DirectorWorkbenchTimeline
                timeline={capabilities.timeline}
                globalFrame={globalFrame}
                onGlobalFrameChange={(frame) => {
                    setPlaying(false);
                    seekGlobalFrame(frame);
                }}
                scene={draft}
                shot={activeShot}
                camera={activeCamera}
                objects={draft.objects}
                selectedObjectId={selectedObjectId}
                selectedBone={selectedBone}
                playhead={playhead}
                playing={playing}
                autoKey={autoKey}
                height={sequencerHeight}
                visible={sequencerVisible}
                loopPlayback={loopPlayback}
                onLoopPlaybackChange={setLoopPlayback}
                selectedLightId={selectedLightId}
                onSelectLight={(id) => {
                    setSelectedObjectId(null);
                    setSelectedBone(null);
                    setSelectedLightId(id);
                }}
                onPlayToggle={togglePlayback}
                onPlayheadChange={(time) => {
                    setPlaying(false);
                    setPlayhead(time);
                }}
                onAutoKeyChange={setAutoKey}
                onHeightChange={setSequencerHeight}
                onVisibilityChange={setSequencerVisible}
                onSelectObject={(id) => {
                    setSelectedLightId(null);
                    setSelectedObjectId(id);
                }}
                onSelectBone={setSelectedBone}
                onRecordKeyframe={recordSelectedKeyframe}
                onAddShot={addShot}
                onDeleteKeyframe={deleteKeyframe}
                onSetKeyframeEasing={setKeyframeEasing}
                onSelectShot={selectWorkbenchShot}
            />
            {!directorWindow.maximized &&
                DIRECTOR_WINDOW_EDGES.map((edge) => (
                    <span
                        key={edge}
                        data-director-resize={edge}
                        className={`director-window-resize director-window-resize--${edge}`}
                        title={t("previs.v165.resize")}
                        onPointerDown={(event) => directorWindow.begin(event, edge)}
                        onLostPointerCapture={(event) => directorWindow.finish(event.pointerId)}
                    />
                ))}
        </div>
    );
}

/** 渲染视图全集。实际可选项由当前模式的 capabilities.renderModes 过滤。 */
const DIRECTOR_RENDER_MODE_LABELS: Array<{ label: string; value: DirectorRenderMode }> = [
    {
        get label() {
            return t("imageToolbar.preview");
        },
        value: "beauty",
    },
    {
        get label() {
            return t("canvasExtra.directorWB.renderClay");
        },
        value: "clay",
    },
    {
        get label() {
            return t("canvasExtra.directorWB.renderPose");
        },
        value: "pose",
    },
    {
        get label() {
            return t("canvasExtra.directorWB.renderDepth");
        },
        value: "depth",
    },
    {
        get label() {
            return t("canvasExtra.directorWB.renderNormal");
        },
        value: "normal",
    },
];
