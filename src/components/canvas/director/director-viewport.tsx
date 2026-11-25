import { currentLocaleText as t } from "@/i18n/current-locale-text";
import { sampleDirectorCamera, sampleDirectorTransform, sampleDirectorActorPose, sampleDirectorSeatedWeight } from "@/lib/canvas/director/director-playback";
import { applyShotCameraState, resolveShotCameraFrustum, resolveShotCameraState, warnShotCameraFallbackOnce, type ShotCameraState } from "@/lib/canvas/director/director-shot-camera";
import { DirectorClayActor } from "./director-mannequin";
import { samplePrevisMotion, type PrevisMotionState } from "@/lib/canvas/director/director-previs-motion-clips";
import { resolveNeutralMannequin, usesNeutralMannequin } from "@/lib/canvas/director/director-mannequin";
import { resolveSeatedPelvis } from "@/lib/canvas/director/director-clay-pose";
import { getDirectorAsset } from "@/lib/canvas/director/director-asset-registry";
import { DirectorStageProp } from "./director-stage-prop";
import { DirectorRouteOverlay, type DirectorRouteOverlayProps } from "./director-route-overlay";
import type { DirectorCameraPathEditor } from "./use-director-camera-path-editing";
import { samplePrevisActorPaths } from "@/lib/canvas/director/director-previs-path";
import { directorWorkbenchFrameAtTime } from "@/lib/canvas/director/director-workbench-layout";
import { useI18n } from "@/i18n/use-i18n";
import { PREVIS_EXPOSURE, PREVIS_LIGHTING, PREVIS_MATERIAL, PREVIS_OUTPUT_COLOR_SPACE, PREVIS_PALETTE, PREVIS_TONE_MAPPING, resolvePrevisPrimitiveColor, resolvePrevisQuality } from "@/lib/canvas/director/director-previs-look";
import { sampleDirectorLight } from "@/lib/canvas/director/director-timeline";
import { resolveDirectorBoneRotation } from "@/lib/canvas/director/director-animation-semantics";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Grid, Html, Line, OrbitControls, TransformControls } from "@react-three/drei";
import { Component, createContext, forwardRef, memo, Suspense, useCallback, useContext, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useReducer, useRef, useState, type ComponentRef, type ReactNode, type RefObject } from "react";
import {
    AnimationClip,
    AnimationMixer,
    Camera,
    Color,
    Matrix4,
    Euler,
    EquirectangularReflectionMapping,
    Group,
    LoopOnce,
    LoopRepeat,
    Mesh,
    MeshBasicMaterial,
    MeshDepthMaterial,
    MeshNormalMaterial,
    MOUSE,
    Object3D,
    OrthographicCamera,
    PerspectiveCamera,
    Plane,
    Quaternion,
    Raycaster,
    Scene,
    SkeletonHelper,
    SRGBColorSpace,
    Texture,
    TextureLoader,
    TOUCH,
    Vector2,
    Vector3,
    WebGLRenderer,
} from "three";
import { GLTFLoader, SkeletonUtils } from "three-stdlib";

import { applyClaySceneMaterials } from "@/lib/canvas/director/director-clay-materials";
import { createDirectorTransaction, installDirectorTerminalListeners } from "@/lib/canvas/director/director-gesture-transaction";
import { emptyDirectorPlacementIntent, finiteDirectorGroundPoint, type DirectorGroundPoint, type DirectorPlacementIntent } from "@/lib/canvas/director/director-placement";
import { directorDiagnosticObjectKind } from "@/lib/canvas/director/director-diagnostics";
import { recordDirectorDiagnostic } from "@/lib/canvas/director/director-diagnostics-recorder";
import { DIRECTOR_MIN_ORBIT_DISTANCE, resolveDirectorFrameBounds, resolveDirectorZoomMinDistance } from "@/lib/canvas/director/director-frame-bounds";
import {
    directorCaptureInitial,
    directorCaptureUsable,
    directorLoadIdentity,
    directorLoadInitial,
    installDirectorContextListeners,
    reduceDirectorCapture,
    reduceDirectorLoad,
    releaseDirectorCapture,
    resolveDirectorDisplay,
    restoreDirectorCapture,
    upsertDirectorFailedLoad,
    type DirectorFailedLoads,
    type DirectorLoadSignal,
} from "@/lib/canvas/director/director-recovery";
import { disposeDirectorAdoptionFailure, disposeDirectorHelper, disposeDirectorModelResources, disposeDirectorObject3D, resolveDirectorLoadOwnership } from "@/lib/canvas/director/director-resources";
import { DIRECTOR_DEFAULT_ACTOR_URL, directorActorProfileForArchetype, resolveDirectorActorColor, directorTransformPathLength, finiteDirectorTransformKeyframes, interpolateDirectorTransform } from "@/lib/canvas/director/director-scene";
import {
    DIRECTOR_DEFAULT_VIEW_MODE,
    directorViewFramingKey,
    resolveDirectorEffectiveViewport,
    resolveDirectorOrthographicFraming,
    resolveDirectorOrthographicFrustum,
    resolveDirectorViewFraming,
    type DirectorOrthographicFraming,
    type DirectorViewFraming,
    type DirectorViewMode,
} from "@/lib/canvas/director/director-view-modes";
import { DirectorViewToolbar } from "@/components/canvas/director/director-view-toolbar";
import { resolveMediaUrl } from "@/services/file-storage";
import type { DirectorCamera, DirectorEnvironment, DirectorHumanoidBone, DirectorLight, DirectorObject, DirectorQuat, DirectorRenderMode, DirectorRig, DirectorScene, DirectorTransform, DirectorVec3 } from "@/types/director";
import { applyActorReferenceMaterial, applyDirectorBoneTracks, directorFingerGroup, inferDirectorRig, normalizeModel, readRigRestRotations, screenPixelsToWorldRadius, updateActorReferenceColor } from "./director-viewport-rig";
import { captureFrame, captureViewportSnapshot, recordCanvas, createDirectorOutputSurface, installDirectorContactShadowIsolation } from "./director-viewport-capture";

export type DirectorOrbitControls = ComponentRef<typeof OrbitControls>;

export type DirectorViewportHandle = {
    capture: (mode: DirectorRenderMode, size?: { width: number; height: number }) => Promise<Blob>;
    isReady: () => boolean;
    captureSnapshot: () => Promise<Blob>;
    recordVideo: (duration: number, fps: number, maxDimension?: number) => Promise<Blob>;
    readViewCamera?: () => Camera | null;
    readCameraTransform: () => DirectorTransform | null;
    focusSelected: () => void;
    frameScene: () => void;
    resetCamera: () => void;
    zoom: (factor: number) => void;
    /** 只读放置意图。上下文不可用或从未产生合法点时返回空意图，绝不抛异常。 */
    readPlacementIntent: () => DirectorPlacementIntent;
};

type DirectorViewportProps = {
    panView?: boolean;
    scene: DirectorScene;
    actorMotion?: Record<string, PrevisMotionState | undefined>;
    selectedObjectId: string | null;
    selectedBone: string | null;
    transformMode: "translate" | "rotate" | "scale";
    renderMode: DirectorRenderMode;
    playhead: number;
    playing: boolean;
    /** 动画模式下显示演员与摄影机 Transform 关键帧形成的空间路径。 */
    showMotionPaths?: boolean;
    routeEditing?: DirectorRouteOverlayProps & { adding: boolean };
    cameraPathEditing?: DirectorCameraPathEditor;
    /** Plan overlay and renderer share this exact orthographic framing. */
    planFraming?: DirectorOrthographicFraming;
    /** 取景模式。省略即自由视角，保持接线前的行为不变。 */
    viewMode?: DirectorViewMode;
    /** 提供该回调即在视口内渲染 3D/CAM 切换器；不提供则不显示，视口仍按 viewMode 取景。 */
    onViewModeChange?: (mode: DirectorViewMode) => void;
    /** 宿主自带导航工具条时关闭内置的聚焦/缩放浮层，避免两套控件重叠。 */
    showNavigation?: boolean;
    /** 辅助监看不重复显示同一模型的错误提示；主视口保留唯一可操作重试入口。 */
    showModelLoadNotice?: boolean;
    onSelectObject: (id: string | null) => void;
    onSelectBone: (bone: string | null) => void;
    /** 点击地面直接落位；不提供则只保留视口观察行为。 */
    onGroundClick?: (point: DirectorGroundPoint) => void;
    /** 显式进入轨迹绘制态时，拖动地面会采样一条路径。 */
    trajectoryDrawing?: boolean;
    onTrajectoryComplete?: (points: DirectorGroundPoint[]) => void;
    onObjectTransform: (id: string, from: DirectorTransform, to: DirectorTransform) => void;
    onBoneTransform: (id: string, bone: string, rotation: DirectorQuat) => void;
    onActorRigReady: (id: string, rig: DirectorRig, animations: AnimationClip[]) => void;
    /** 选中的摄影机 id；导演视角中显示可拖动的摄影机 gizmo。 */
    selectedCameraId?: string | null;
    onSelectCamera?: (id: string) => void;
    onCameraTransform?: (id: string, from: DirectorTransform, to: DirectorTransform) => void;
    onNavigationReady?: (navigation: Pick<DirectorViewportHandle, "focusSelected" | "frameScene" | "resetCamera" | "zoom">) => void;
    pipCanvasRef?: RefObject<HTMLCanvasElement | null>;
};

export type CaptureContext = {
    gl: WebGLRenderer;
    scene: Scene;
    camera: Camera;
    shotCamera: PerspectiveCamera;
    shotAspect: number;
    shotCameraInfo: { sceneId: string; shotId: string; source: ShotCameraState["source"] } | null;
    suspendDisplayMaterialOverride: () => () => void;
};

export function createDirectorSnapshotReadiness() {
    let revision: object | null = null;
    let frames = 0;
    const pending = new Set<symbol>();
    const isReady = (current: object) => revision === current && pending.size === 0 && frames >= 2;
    return {
        isReady,
        commit(current: object | null) {
            revision = current;
            frames = 0;
        },
        resetFrames() {
            frames = 0;
        },
        beginResource() {
            const token = Symbol();
            pending.add(token);
            frames = 0;
            return () => {
                pending.delete(token);
                frames = 0;
            };
        },
        advanceFrame(current: object) {
            if (revision !== current || pending.size || frames >= 2) return false;
            frames += 1;
            return frames < 2;
        },
        async captureSnapshot(context: CaptureContext | null, current: object) {
            if (!isReady(current)) throw new Error("视口场景尚未就绪");
            return captureViewportSnapshot(context);
        },
    };
}

type DirectorSnapshotReadiness = ReturnType<typeof createDirectorSnapshotReadiness>;
const DirectorSnapshotContext = createContext<DirectorSnapshotReadiness | null>(null);

function useDirectorSnapshotResource(identity: unknown, ready: boolean) {
    const readiness = useContext(DirectorSnapshotContext);
    const invalidate = useThree((state) => state.invalidate);
    useLayoutEffect(() => {
        if (!readiness || ready) return;
        const complete = readiness.beginResource();
        invalidate();
        return () => {
            complete();
            invalidate();
        };
    }, [identity, invalidate, readiness, ready]);
}

function DirectorSnapshotReady({ readiness, revision }: { readiness: DirectorSnapshotReadiness; revision: object }) {
    const invalidate = useThree((state) => state.invalidate);
    // 哨兵只在整个 Suspense 子树提交后激活；非 Suspense 资源另行登记，直到模型、骨架和纹理提交。
    useLayoutEffect(() => {
        readiness.commit(revision);
        invalidate();
        return () => readiness.commit(null);
    }, [invalidate, readiness, revision]);
    // useFrame 先于绘制执行，第二次回调才放行，确保资源就绪后至少已有一次完整渲染。
    useFrame(() => {
        if (readiness.advanceFrame(revision)) invalidate();
    });
    return null;
}

// 稳定空值：identity 不匹配时返回同一引用，避免下游 effect 依赖每次 render 都变化。
const emptyAnimations: AnimationClip[] = [];
const emptyRestRotations: Partial<Record<DirectorHumanoidBone, DirectorQuat>> = {};

// Canvas 配置必须是稳定引用：inline literal 每次父级 render 都是新对象，
// context lost 的 dispatch 触发重渲染后 R3F 会 configure 并在失效 context 上
// 重建 WebGLRenderer，抛 getMaxPrecision / autoReset。稳定后 lost 只显示 notice。
const directorQuality = resolvePrevisQuality(typeof window === "undefined" ? 1 : window.devicePixelRatio);
const directorCanvasGl = { antialias: true, preserveDrawingBuffer: true, alpha: false, outputColorSpace: PREVIS_OUTPUT_COLOR_SPACE, toneMapping: PREVIS_TONE_MAPPING, toneMappingExposure: PREVIS_EXPOSURE } as const;
const directorCanvasCamera = { position: [4.8, 2.7, 6.8] as [number, number, number], fov: 50, near: 0.05, far: 500 } as const;
const directorShadowProps = {
    "shadow-mapSize-width": directorQuality.shadowMapSize,
    "shadow-mapSize-height": directorQuality.shadowMapSize,
    "shadow-radius": PREVIS_LIGHTING.shadow.radius,
    "shadow-normalBias": PREVIS_LIGHTING.shadow.normalBias,
    "shadow-camera-left": -PREVIS_LIGHTING.shadow.extent,
    "shadow-camera-right": PREVIS_LIGHTING.shadow.extent,
    "shadow-camera-top": PREVIS_LIGHTING.shadow.extent,
    "shadow-camera-bottom": -PREVIS_LIGHTING.shadow.extent,
} as const;
// 自由视角固定环绕焦点：free 是独立观察相机，不跟随 shot 摄影机的 target 走，
// 否则切换镜头/摄影机会连带把用户正在环绕的焦点也悄悄挪走。
const DIRECTOR_FREE_ORBIT_TARGET: DirectorVec3 = [0, 1, 0];

export const DirectorViewport = forwardRef<DirectorViewportHandle, DirectorViewportProps>(function DirectorViewport(props, ref) {
    // onViewModeChange 只服务 DOM 层的切换器，绝不进 Canvas 子树：它的身份每次父级
    // render 都可能变化，穿透到 memo 化的 Canvas 会触发 configure 重建 renderer。
    const { onViewModeChange, showModelLoadNotice = true, showNavigation = true, ...sceneProps } = props;
    const [panSurface, setPanSurface] = useState<HTMLDivElement | null>(null);
    const captureContext = useRef<CaptureContext | null>(null);
    const [snapshotReadiness] = useState(createDirectorSnapshotReadiness);
    const snapshotRevision = useMemo(() => ({}), [props.scene, props.actorMotion, props.playhead, props.renderMode, props.viewMode, props.planFraming, props.selectedCameraId]);
    const snapshotRevisionRef = useRef(snapshotRevision);
    snapshotRevisionRef.current = snapshotRevision;
    // 地面点连同 owner canvas 一起记录：owner 不是当前 renderer 的 canvas 就是陈旧值。
    const groundRef = useRef<{ owner: HTMLCanvasElement; point: DirectorGroundPoint } | null>(null);
    const orbitControlsRef = useRef<DirectorOrbitControls | null>(null);
    /** pointermove 高频路径只写 ref，不触发 render；清空只允许由该点的 owner 发起。 */
    const onGroundPoint = useCallback((owner: HTMLCanvasElement, point: DirectorGroundPoint | null) => {
        if (point) {
            groundRef.current = { owner, point };
            return;
        }
        if (groundRef.current?.owner === owner) groundRef.current = null;
    }, []);
    const onOrbitControls = useCallback((controls: DirectorOrbitControls | null) => {
        orbitControlsRef.current = controls;
    }, []);
    // retryKey 变化会真正重建 Canvas 与 ErrorBoundary，而不是只换文案。
    const [retryKey, setRetryKey] = useState(0);
    // capture 可用性：上下文丢失期间不得再使用失效 renderer；恢复后需重新登记。
    const [capture, dispatchCapture] = useReducer(reduceDirectorCapture, directorCaptureInitial);
    const captureRef = useRef(capture);
    captureRef.current = capture;
    // 加载失败的对象 id -> 该对象自己的 retry；Canvas 内部无法呈现可操作提示，统一提到 DOM 层。
    const [failedLoads, setFailedLoads] = useState<DirectorFailedLoads>({});
    const onCaptureContext = useCallback((context: CaptureContext) => {
        captureContext.current = context;
        dispatchCapture("register");
    }, []);
    /** 子树卸载 / boundary 捕获：清掉指向已销毁 renderer 的引用并打回不可用。 */
    const releaseCapture = useCallback(() => {
        releaseDirectorCapture({
            clearContext: () => {
                captureContext.current = null;
            },
            onAvailability: dispatchCapture,
        });
        // 地面点与 controls 都属于已销毁的 renderer，必须一并作废。
        groundRef.current = null;
        orbitControlsRef.current = null;
    }, []);
    const retry = useCallback(() => {
        releaseCapture();
        setFailedLoads({});
        setRetryKey((value) => value + 1);
    }, [releaseCapture]);
    const onLoadStateChange = useCallback((id: string, signal: DirectorLoadSignal, retryLoad: () => void) => {
        setFailedLoads((current) => upsertDirectorFailedLoad(current, id, signal, retryLoad));
    }, []);
    // 稳定引用：否则新的监听 effect 会在每次父级 render 时摘除重装。
    const onContextLost = useCallback(() => {
        // 上下文丢失后相机与射线结果都不可信，旧地面点必须作废，恢复后需重新移动 pointer。
        groundRef.current = null;
        snapshotReadiness.resetFrames();
        recordDirectorDiagnostic("DIRECTOR_VIEWPORT_CONTEXT_LOST");
        dispatchCapture("lost");
    }, [snapshotReadiness]);
    const onContextRestored = useCallback(() => {
        snapshotReadiness.resetFrames();
        recordDirectorDiagnostic("DIRECTOR_VIEWPORT_CONTEXT_RESTORED");
        dispatchCapture("restored");
    }, [snapshotReadiness]);
    const failedIds = Object.keys(failedLoads);
    // 上下文失效时 renderer 不可用：capture/record/readCamera 必须明确失败而不是画出脏帧。
    const usableContext = () => {
        if (!directorCaptureUsable(captureRef.current)) return null;
        return captureContext.current;
    };
    const navigationRef = useRef<Pick<DirectorViewportHandle, "focusSelected" | "frameScene" | "resetCamera" | "zoom"> | null>(null);
    const [navigation, setNavigation] = useState<Pick<DirectorViewportHandle, "focusSelected" | "frameScene" | "resetCamera" | "zoom"> | null>(null);
    const handleNavigationReady = useCallback((next: Pick<DirectorViewportHandle, "focusSelected" | "frameScene" | "resetCamera" | "zoom">) => {
        navigationRef.current = next;
        setNavigation(next);
    }, []);
    useImperativeHandle(
        ref,
        () => ({
            capture: (mode, size) => captureFrame(usableContext(), mode, size),
            isReady: () => Boolean(usableContext()) && snapshotReadiness.isReady(snapshotRevisionRef.current),
            captureSnapshot: () => snapshotReadiness.captureSnapshot(usableContext(), snapshotRevisionRef.current),
            recordVideo: (duration, fps, maxDimension) => recordCanvas(usableContext(), duration, fps, maxDimension),
            readViewCamera: () => usableContext()?.camera ?? null,
            readCameraTransform: () => {
                const camera = usableContext()?.camera;
                return camera ? { position: camera.position.toArray() as DirectorTransform["position"], rotation: [camera.rotation.x, camera.rotation.y, camera.rotation.z], scale: [1, 1, 1] } : null;
            },
            focusSelected: () => navigationRef.current?.focusSelected(),
            frameScene: () => navigationRef.current?.frameScene(),
            resetCamera: () => navigationRef.current?.resetCamera(),
            zoom: (factor) => navigationRef.current?.zoom(factor),
            readPlacementIntent: () => {
                const context = usableContext();
                if (!context) return emptyDirectorPlacementIntent;
                // owner 校验：上下文重建后，旧 renderer canvas 记录的点一律不采用。
                const tracked = groundRef.current;
                const pointer = tracked && tracked.owner === context.gl.domElement ? tracked.point : null;
                // 读实例当前 target，而不是 activeCamera.target prop；投影到 y=0 即取 x/z。
                const target = orbitControlsRef.current?.target;
                return { pointer, orbitTarget: finiteDirectorGroundPoint(target?.x, target?.z) };
            },
        }),
        [],
    );

    return (
        // data-renderer-ready 直接来自 directorCaptureUsable：capture context 已登记且未 lost。
        // 这是真实就绪信号，供 E2E 在触发 context loss 前确定监听器已安装。
        <div className="director-viewport-shell" data-renderer-ready={directorCaptureUsable(capture) ? "true" : "false"}>
            <DirectorViewportErrorBoundary key={`boundary-${retryKey}`} onRelease={releaseCapture} onRetry={retry}>
                <DirectorCanvasSurface
                    panSurface={panSurface}
                    snapshotReadiness={snapshotReadiness}
                    snapshotRevision={snapshotRevision}
                    scene={props.scene}
                    actorMotion={props.actorMotion}
                    selectedObjectId={props.selectedObjectId}
                    selectedBone={props.selectedBone}
                    transformMode={props.transformMode}
                    renderMode={props.renderMode}
                    playhead={props.playhead}
                    playing={props.playing}
                    showMotionPaths={props.showMotionPaths}
                    routeEditing={props.routeEditing}
                    cameraPathEditing={props.cameraPathEditing}
                    viewMode={props.viewMode}
                    planFraming={props.planFraming}
                    onSelectObject={props.onSelectObject}
                    onSelectBone={props.onSelectBone}
                    onGroundClick={props.onGroundClick}
                    trajectoryDrawing={props.trajectoryDrawing}
                    onTrajectoryComplete={props.onTrajectoryComplete}
                    onObjectTransform={props.onObjectTransform}
                    onBoneTransform={props.onBoneTransform}
                    onActorRigReady={props.onActorRigReady}
                    selectedCameraId={props.selectedCameraId}
                    onSelectCamera={props.onSelectCamera}
                    onCameraTransform={props.onCameraTransform}
                    showModelLoadNotice={props.showModelLoadNotice}
                    pipCanvasRef={props.pipCanvasRef}
                    onCaptureContext={onCaptureContext}
                    onRelease={releaseCapture}
                    onContextLost={onContextLost}
                    onContextRestored={onContextRestored}
                    onLoadStateChange={onLoadStateChange}
                    onGroundPoint={onGroundPoint}
                    onOrbitControls={onOrbitControls}
                    onNavigationReady={handleNavigationReady}
                />
            </DirectorViewportErrorBoundary>
            {props.panView && <div ref={setPanSurface} className="director-hand-surface" aria-hidden="true" onPointerDown={event => event.currentTarget.setPointerCapture(event.pointerId)} />}
            {/* 取景切换是纯视口状态：放在 DOM 层，不随 Canvas 重建而丢失。 */}
            {onViewModeChange ? <DirectorViewToolbar viewMode={props.viewMode ?? DIRECTOR_DEFAULT_VIEW_MODE} onViewModeChange={onViewModeChange} /> : null}
            {showNavigation ? <DirectorNavigationToolbar navigation={navigation} /> : null}
            {capture.contextLost ? <DirectorViewportNotice title={t("canvasExtra.directorVP.contextLostTitle")} description={t("canvasExtra.directorVP.contextLostDesc")} actionLabel={t("canvasExtra.directorVP.rebuildViewport")} onAction={retry} /> : null}
            {!capture.contextLost && showModelLoadNotice && failedIds.length ? (
                <DirectorViewportNotice
                    variant="corner"
                    title={t("previs.v165.message273", { p0: failedIds.length })}
                    description={t("canvasExtra.directorVP.failedLoadsDesc")}
                    actionLabel={t("canvasExtra.directorVP.retryLoads")}
                    onAction={() => {
                        // 重试触发新的 load generation，旧的晚到回调会被忽略并释放资源。
                        Object.values(failedLoads).forEach((retryLoad) => retryLoad());
                        setFailedLoads({});
                    }}
                />
            ) : null}
        </div>
    );
});

// onViewModeChange 被显式排除：切换器活在 DOM 层，Canvas 子树只需要 viewMode 取值。
type DirectorCanvasSurfaceProps = Omit<DirectorViewportProps, "onViewModeChange" | "panView"> & {
    panSurface: HTMLDivElement | null;
    onCaptureContext: (context: CaptureContext) => void;
    onRelease: () => void;
    onContextLost: () => void;
    onContextRestored: () => void;
    onLoadStateChange: (id: string, signal: DirectorLoadSignal, retry: () => void) => void;
    onGroundPoint: (owner: HTMLCanvasElement, point: DirectorGroundPoint | null) => void;
    onOrbitControls: (controls: DirectorOrbitControls | null) => void;
    onNavigationReady?: (navigation: Pick<DirectorViewportHandle, "focusSelected" | "frameScene" | "resetCamera" | "zoom">) => void;
};

/**
 * Canvas 表面独立 memo。
 *
 * R3F 本地 CanvasImpl 的 layout effect 没有依赖数组，父级每次 rerender 都会 configure。
 * context lost 时 DirectorViewport 会 dispatchCapture 触发 rerender，若 Canvas 跟着重渲染，
 * configure 就会在已失效的 canvas 上重建 WebGLRenderer 并抛 getMaxPrecision / autoReset。
 * 隔离在 memo 子组件后，contextLost / failedLoads 这类外层状态变化不再穿透到 Canvas；
 * 只有 props 真的变化才重渲染，retryKey 变化仍由外层 key 触发真正 remount。
 */
const DirectorCanvasSurface = memo(function DirectorCanvasSurface(props: DirectorCanvasSurfaceProps & { snapshotReadiness: DirectorSnapshotReadiness; snapshotRevision: object }) {
    const { snapshotReadiness, snapshotRevision, onCaptureContext, onRelease, onContextLost, onContextRestored, onLoadStateChange, onGroundPoint, onOrbitControls, onNavigationReady, ...sceneProps } = props;
    const onSelectObject = sceneProps.onSelectObject;
    const onPointerMissed = useCallback(() => {
        if (!props.routeEditing?.adding && !props.routeEditing?.dragging && !props.cameraPathEditing?.adding && !props.cameraPathEditing?.dragging) onSelectObject(null);
    }, [onSelectObject, props.routeEditing?.adding, props.routeEditing?.dragging, props.cameraPathEditing?.adding, props.cameraPathEditing?.dragging]);

    return (
        <Canvas shadows={props.scene.lights.some((light) => light.shadowRadius !== undefined) ? "percentage" : "soft"} frameloop="demand" dpr={directorQuality.dpr} camera={directorCanvasCamera} gl={directorCanvasGl} onPointerMissed={onPointerMissed}>
            <DirectorSnapshotContext.Provider value={snapshotReadiness}>
                <Suspense fallback={null}>
                    <DirectorSceneContent
                        panSurface={props.panSurface}
                        scene={props.scene}
                        actorMotion={props.actorMotion}
                        selectedObjectId={props.selectedObjectId}
                        selectedBone={props.selectedBone}
                        transformMode={props.transformMode}
                        renderMode={props.renderMode}
                        playhead={props.playhead}
                        playing={props.playing}
                        showMotionPaths={props.showMotionPaths}
                        routeEditing={props.routeEditing}
                        cameraPathEditing={props.cameraPathEditing}
                        viewMode={props.viewMode}
                        onSelectObject={props.onSelectObject}
                        planFraming={props.planFraming}
                        onSelectBone={props.onSelectBone}
                        onGroundClick={props.onGroundClick}
                        trajectoryDrawing={props.trajectoryDrawing}
                        onTrajectoryComplete={props.onTrajectoryComplete}
                        onObjectTransform={props.onObjectTransform}
                        onBoneTransform={props.onBoneTransform}
                        onActorRigReady={props.onActorRigReady}
                        selectedCameraId={props.selectedCameraId}
                        onSelectCamera={props.onSelectCamera}
                        onCameraTransform={props.onCameraTransform}
                        showModelLoadNotice={props.showModelLoadNotice}
                        pipCanvasRef={props.pipCanvasRef}
                        onCaptureContext={onCaptureContext}
                        onRelease={onRelease}
                        onContextLost={onContextLost}
                        onContextRestored={onContextRestored}
                        onLoadStateChange={onLoadStateChange}
                        onGroundPoint={onGroundPoint}
                        onOrbitControls={onOrbitControls}
                        onNavigationReady={onNavigationReady}
                    />
                    <DirectorSnapshotReady readiness={snapshotReadiness} revision={snapshotRevision} />
                </Suspense>
            </DirectorSnapshotContext.Provider>
        </Canvas>
    );
});

/** 本地失败隔离：3D 视口异常只替换视口本身，不影响画布/项目其余部分。 */
class DirectorViewportErrorBoundary extends Component<{ children: ReactNode; onRelease: () => void; onRetry: () => void }, { failed: boolean }> {
    state = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    componentDidCatch() {
        // 只记录稳定错误码：原始 error / componentStack 可能带素材 URL 或正文，不落日志。
        recordDirectorDiagnostic("DIRECTOR_VIEWPORT_RENDER_FAILED");
        // 子树已被 React 卸载，capture context 指向已销毁的 renderer，必须同步释放。
        this.props.onRelease();
    }

    render() {
        if (!this.state.failed) return this.props.children;
        return (
            <DirectorViewportNotice
                title={t("canvasExtra.directorVP.renderFailedTitle")}
                description={t("previs.v165.message142")}
                actionLabel={t("canvasExtra.directorVP.retryViewport")}
                onAction={() => {
                    this.setState({ failed: false });
                    this.props.onRetry();
                }}
            />
        );
    }
}

function DirectorNavigationToolbar({ navigation }: { navigation: Pick<DirectorViewportHandle, "focusSelected" | "frameScene" | "resetCamera" | "zoom"> | null }) {
    useI18n();
    const action = (run: () => void) => {
        run();
    };
    return (
        <div className="director-viewport-navigation" aria-label={t("previs.v165.message143")}>
            <button type="button" aria-label={t("previs.v165.message144")} title={t("previs.v165.message144")} disabled={!navigation} onClick={() => navigation && action(navigation.focusSelected)}>
                {t("previs.v165.message145")}
            </button>
            <button type="button" aria-label={t("previs.v165.message146")} title={t("previs.v165.message146")} disabled={!navigation} onClick={() => navigation && action(navigation.frameScene)}>
                {t("canvasDialog.angle.far")}
            </button>
            <button type="button" aria-label={t("canvasExtra.panorama.resetViewTitle")} title={t("canvasExtra.panorama.resetViewTitle")} disabled={!navigation} onClick={() => navigation && action(navigation.resetCamera)}>
                {t("canvasDialog.angle.reset")}
            </button>
            <span className="director-viewport-navigation-divider" />
            <button type="button" aria-label={t("previs.v165.message147")} title={t("previs.v165.message147")} disabled={!navigation} onClick={() => navigation && action(() => navigation.zoom(0.72))}>
                ＋
            </button>
            <button type="button" aria-label={t("previs.v165.message148")} title={t("previs.v165.message148")} disabled={!navigation} onClick={() => navigation && action(() => navigation.zoom(1.38))}>
                −
            </button>
        </div>
    );
}

function DirectorViewportNotice({ title, description, actionLabel, onAction, variant = "cover" }: { title: string; description: string; actionLabel: string; onAction: () => void; variant?: "cover" | "corner" }) {
    useI18n();
    return (
        <div className={`director-viewport-notice ${variant === "corner" ? "is-corner" : "is-cover"}`} role="alert">
            <div className="director-viewport-notice-title">{title}</div>
            <p className="director-viewport-notice-text">{description}</p>
            <button type="button" className="director-viewport-notice-action" onClick={onAction}>
                {actionLabel}
            </button>
        </div>
    );
}

function DirectorSceneContent({
    panSurface,
    scene,
    actorMotion,
    selectedObjectId,
    selectedBone,
    transformMode,
    renderMode,
    playhead,
    playing,
    showMotionPaths = false,
    routeEditing,
    cameraPathEditing,
    planFraming,
    viewMode = DIRECTOR_DEFAULT_VIEW_MODE,
    onSelectObject,
    onSelectBone,
    onGroundClick,
    trajectoryDrawing = false,
    onTrajectoryComplete,
    onObjectTransform,
    onBoneTransform,
    onActorRigReady,
    selectedCameraId,
    onSelectCamera,
    onCameraTransform,
    onCaptureContext,
    onRelease,
    onContextLost,
    onContextRestored,
    onLoadStateChange,
    onGroundPoint,
    onOrbitControls,
    onNavigationReady,
    pipCanvasRef,
}: DirectorCanvasSurfaceProps) {
    useI18n();
    const { gl, camera, scene: threeScene, invalidate, set, size } = useThree();
    useLayoutEffect(() => {
        gl.toneMappingExposure = scene.stageExposure ?? PREVIS_EXPOSURE;
        invalidate();
    }, [gl, invalidate, scene.stageExposure]);
    const whiteStage = scene.stageLook !== "studio" && (renderMode === "clay" || scene.objects.some((object) => object.stageProp));
    const studioBg = whiteStage ? PREVIS_PALETTE.background : scene.background || PREVIS_PALETTE.background;

    const renderTargetRef = useRef<ReturnType<typeof createDirectorOutputSurface> | null>(null);
    const lastPipRenderTimeRef = useRef<number>(0);

    useEffect(() => {
        let timer: number;
        let count = 0;
        const tick = () => {
            if (pipCanvasRef?.current) {
                invalidate();
                count++;
            }
            // Periodically keep PiP refreshed if active
            timer = window.setTimeout(tick, count < 10 ? 100 : 250);
        };
        timer = window.setTimeout(tick, 50);
        return () => window.clearTimeout(timer);
    }, [invalidate, pipCanvasRef]);

    useFrame(() => {
        const pipCanvas = pipCanvasRef?.current;
        if (!pipCanvas) return;
        const now = performance.now();
        if (now - lastPipRenderTimeRef.current < 45) return;
        lastPipRenderTimeRef.current = now;

        const width = pipCanvas.width;
        const height = pipCanvas.height;
        if (width <= 0 || height <= 0) return;

        if (!renderTargetRef.current || renderTargetRef.current.canvas.width !== width || renderTargetRef.current.canvas.height !== height) {
            renderTargetRef.current?.dispose();
            renderTargetRef.current = createDirectorOutputSurface(readCaptureContext(), { width, height });
        }
        const capture = readCaptureContext();
        const resumeDisplay = capture.suspendDisplayMaterialOverride();
        const displayMaterial = capture.scene.overrideMaterial;
        const restoreClayMaterials = renderMode === "clay" ? applyClaySceneMaterials(capture.scene) : null;
        try {
            capture.scene.overrideMaterial = null;
            renderTargetRef.current.render(capture.shotCamera, "monitor");
            const pipCtx = pipCanvas.getContext("2d");
            pipCtx?.drawImage(renderTargetRef.current.canvas, 0, 0);
        } catch (err) {
            console.error("Director camera preview failed", err);
        } finally {
            restoreClayMaterials?.();
            capture.scene.overrideMaterial = displayMaterial;
            resumeDisplay();
        }
    });

    useEffect(() => {
        return () => {
            renderTargetRef.current?.dispose();
            renderTargetRef.current = null;
        };
    }, []);

    const orbitRef = useRef<DirectorOrbitControls>(null);
    const [transforming, setTransforming] = useState(false);
    const [draftPath, setDraftPath] = useState<DirectorVec3[]>([]);
    const pointerHitRef = useRef(false);
    const displayClayRestoreRef = useRef<(() => void) | null>(null);
    // editorCamera 只负责自由观察；shotCamera 统一驱动当前镜头、监看和输出。
    // camCamera 保留非当前镜头的选中机位观察，正交观察由 orthoCamera 独立持有。
    const [editorCamera] = useState(() => {
        const instance = new PerspectiveCamera(directorCanvasCamera.fov, 1, directorCanvasCamera.near, directorCanvasCamera.far);
        instance.position.set(...directorCanvasCamera.position);
        instance.lookAt(...DIRECTOR_FREE_ORBIT_TARGET);
        return instance;
    });
    const [camCamera] = useState(() => new PerspectiveCamera(directorCanvasCamera.fov, 1, directorCanvasCamera.near, directorCanvasCamera.far));
    // R3F 的容器 resize 不能把拍摄画幅覆盖为编辑窗口比例。
    const [shotCamera] = useState(() => Object.assign(new PerspectiveCamera(), { manual: true }));
    const [orthoCamera] = useState(() => new OrthographicCamera(-1, 1, 1, -1, 0.05, 500));
    // CAM 与正交轴向的取景解算都是纯函数：mode 不匹配时各自返回 null，互不冲突。
    // 活动相机不直接看 viewMode：CAM 取景失败必须回落 free，否则会露出从未写入的 camCamera。
    const camFraming = resolveDirectorViewFraming({ scene, mode: "camera", playhead, cameraId: selectedCameraId });
    const outputFraming = resolveDirectorViewFraming({ scene, mode: "camera", playhead });
    const activeShot = scene.shots.find((item) => item.id === scene.activeShotId) ?? scene.shots[0];
    const activeSegment = scene.previs?.segments.find((segment) => segment.shotId === activeShot?.id);
    const displayStage = !planFraming ? (activeSegment?.initialStage ?? (activeSegment?.legacyShotId ? activeShot?.stage : undefined)) : undefined;
    const displayObjects = displayStage?.objects ?? scene.objects;
    const objectPlayhead = activeSegment && !activeSegment.legacyShotId && !activeSegment.initialStage && !planFraming ? activeSegment.startFrame / scene.previs!.fps + playhead : playhead;
    const shotState = useMemo(() => (activeShot && (scene.previs || outputFraming) ? resolveShotCameraState(scene, activeShot.id, playhead) : null), [scene, activeShot, playhead, Boolean(outputFraming)]);
    const selectedShot = activeShot?.cameraId === selectedCameraId ? activeShot : scene.shots.find((shot) => shot.cameraId === selectedCameraId);
    const selectedShotState = useMemo(() => (shotState && selectedShot ? (selectedShot.id === activeShot?.id ? shotState : resolveShotCameraState(scene, selectedShot.id, playhead)) : null), [scene, playhead, selectedShot, activeShot, shotState]);
    useEffect(() => {
        if (activeShot && shotState) warnShotCameraFallbackOnce(scene.id, activeShot.id, shotState.source);
        if (selectedShot && selectedShotState) warnShotCameraFallbackOnce(scene.id, selectedShot.id, selectedShotState.source);
    }, [scene.id, activeShot, shotState, selectedShot, selectedShotState]);
    const shotFrustum = useMemo(() => {
        if (shotState) applyShotCameraState(shotCamera, shotState);
        if (!selectedShotState) return null;
        const selectedCamera = selectedShotState === shotState ? shotCamera : new PerspectiveCamera();
        if (selectedCamera !== shotCamera) applyShotCameraState(selectedCamera, selectedShotState);
        return resolveShotCameraFrustum(selectedCamera);
    }, [selectedShotState, shotCamera, shotState]);
    const currentShotView = !selectedCameraId || selectedCameraId === activeShot?.cameraId;
    const orthoFraming = planFraming || resolveDirectorOrthographicFraming({ scene, mode: viewMode });
    const effectiveViewport = resolveDirectorEffectiveViewport({ mode: viewMode, framing: camFraming });
    const setTransformingState = useCallback(
        (active: boolean) => {
            setTransforming(active);
            if (orbitRef.current) orbitRef.current.enabled = !active && effectiveViewport.orbit;
        },
        [effectiveViewport.orbit],
    );
    const pathActors = useMemo(() => {
        if (!scene.previs?.paths?.length) return {};
        const actors = Object.fromEntries(displayObjects.filter((object) => object.kind === "actor").map((object) => [object.id, { transform: sampleDirectorTransform(object.transform, object.keyframes, objectPlayhead, object.motionPath) }]));
        return samplePrevisActorPaths(actors, scene.previs, directorWorkbenchFrameAtTime(scene, activeShot?.id, playhead));
    }, [scene, displayObjects, objectPlayhead, activeShot?.id, playhead]);
    const motions = useMemo(() => {
        const fps = scene.previs?.fps ?? activeShot?.fps ?? 24;
        const frame = activeSegment ? directorWorkbenchFrameAtTime(scene, activeShot?.id, playhead) : Math.round(objectPlayhead * fps);
        return Object.fromEntries(
            displayObjects
                .filter((object) => object.kind === "actor" || object.primitive === "character")
                .map((object) => [object.id, actorMotion?.[object.id] ?? samplePrevisMotion({ object, sequence: scene.previs, frame, fps, time: objectPlayhead, objects: displayObjects })]),
        );
    }, [actorMotion, displayObjects, scene, activeSegment, activeShot, playhead, objectPlayhead]);
    const cameraMotionPaths = useMemo(() => {
        if (!showMotionPaths) return [];
        return scene.cameras.filter((item) => {
            if (playing && item.id !== activeShot?.cameraId) return false;
            if (!playing && item.id === cameraPathEditing?.route?.segment.cameraId) return false;
            return directorTransformPathLength(item.keyframes) > 0.001 || (!item.keyframes.length && (item.motionPath?.points.length || 0) > 1);
        });
    }, [scene.cameras, activeShot?.cameraId, cameraPathEditing?.route?.segment.cameraId, showMotionPaths, playing]);
    const suspendDisplayMaterialOverride = useCallback(() => {
        const suspended = Boolean(displayClayRestoreRef.current);
        displayClayRestoreRef.current?.();
        displayClayRestoreRef.current = null;
        return () => {
            if (suspended) displayClayRestoreRef.current = applyClaySceneMaterials(threeScene);
        };
    }, [threeScene]);

    const readCaptureContext = useCallback((): CaptureContext => {
        if (shotState) applyShotCameraState(shotCamera, shotState);
        const shotAspect = shotState?.aspect ?? 9 / 16;
        const shotCameraInfo = activeShot && shotState ? { sceneId: scene.id, shotId: activeShot.id, source: shotState.source } : null;
        return { gl, camera: camera as Camera, shotCamera, shotAspect, shotCameraInfo, scene: threeScene, suspendDisplayMaterialOverride };
    }, [camera, gl, shotCamera, shotState, activeShot, scene.id, suspendDisplayMaterialOverride, threeScene]);

    useEffect(() => {
        onCaptureContext(readCaptureContext());
    }, [onCaptureContext, readCaptureContext]);

    // 子树卸载（重试重建、boundary 捕获后 React 卸载）时同步释放：
    // 此后 captureContext 指向已销毁的 renderer，必须清空并打回不可用。
    // 单独 effect 且只依赖稳定的 onRelease，不会被 readCaptureContext 变化连带触发。
    useEffect(() => () => onRelease(), [onRelease]);

    // 上下文丢失/恢复监听绑定在 renderer 自己的 canvas 上，随 renderer 与重试精确摘除。
    useEffect(
        () =>
            installDirectorContextListeners(gl.domElement, {
                onLost: onContextLost,
                // 恢复后 registered 会被置回 false，必须用当前 renderer 重新登记，
                // 否则 capture/record/readCameraTransform 会一直不可用。走与测试共用的序列 helper。
                onRestored: () =>
                    restoreDirectorCapture({
                        readContext: readCaptureContext,
                        onAvailability: onContextRestored,
                        onRegister: onCaptureContext,
                        invalidate,
                    }),
            }),
        [gl, invalidate, onCaptureContext, onContextLost, onContextRestored, readCaptureContext],
    );

    /**
     * 地面拾取：renderer 自己的 canvas 上做 pointer 监听，再用真实 Raycaster 与
     * 世界 y=0 Plane 求交。不走 mesh onPointerMove（会被物体 stopPropagation 截断），
     * 也不做 DOM 像素伪换算；因此 pointer 悬停在物体上方时射线仍与地面相交。
     * 高频路径只写 ref，绝不 setState。
     */
    useEffect(() => {
        const canvasElement = gl.domElement;
        const raycaster = new Raycaster();
        const groundPlane = new Plane(new Vector3(0, 1, 0), 0);
        const hit = new Vector3();
        const ndc = new Vector2();
        let pointerDown: { id: number; x: number; y: number; button: number } | null = null;
        let pathDrawing = false;
        let pathPoints: DirectorVec3[] = [];
        pointerHitRef.current = false;

        const resolveGroundPoint = (event: PointerEvent) => {
            const bounds = canvasElement.getBoundingClientRect();
            if (bounds.width <= 0 || bounds.height <= 0) return null;
            ndc.set(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1);
            raycaster.setFromCamera(ndc, camera);
            if (!raycaster.ray.intersectPlane(groundPlane, hit)) return null;
            return finiteDirectorGroundPoint(hit.x, hit.z);
        };

        const onPointerMove = (event: PointerEvent) => {
            const point = resolveGroundPoint(event);
            // 射线与地面平行或背离时保留上一个合法点，不写非法值。
            if (!point) return;
            onGroundPoint(canvasElement, point);
            if (!pathDrawing) return;
            const next: DirectorVec3 = [point.x, 0, point.z];
            const previous = pathPoints[pathPoints.length - 1];
            if (previous && Math.hypot(next[0] - previous[0], next[2] - previous[2]) < 0.04) return;
            pathPoints = [...pathPoints, next];
            setDraftPath(pathPoints);
        };

        const onPointerDown = (event: PointerEvent) => {
            // 原生 canvas 监听先于 R3F（挂在父容器）触发：先清零，命中对象时 R3F 再置位。
            pointerHitRef.current = false;
            if (!onGroundClick || event.isPrimary === false || event.button !== 0) return;
            pointerDown = { id: event.pointerId, x: event.clientX, y: event.clientY, button: event.button };
            if (!trajectoryDrawing) return;
            const point = resolveGroundPoint(event);
            if (!point) return;
            try {
                canvasElement.setPointerCapture(event.pointerId);
            } catch {
                /* pointer capture may be unavailable */
            }
            pathDrawing = true;
            pathPoints = [[point.x, 0, point.z]];
            setDraftPath(pathPoints);
            if (orbitRef.current) orbitRef.current.enabled = false;
        };

        const onPointerUp = (event: PointerEvent) => {
            const start = pointerDown;
            pointerDown = null;
            if (!start || start.id !== event.pointerId || start.button !== 0 || event.button !== 0) return;
            if (pathDrawing) {
                try {
                    if (canvasElement.hasPointerCapture(event.pointerId)) canvasElement.releasePointerCapture(event.pointerId);
                } catch {
                    /* pointer capture may already be gone */
                }
                pathDrawing = false;
                const completed = pathPoints;
                pathPoints = [];
                setDraftPath([]);
                if (orbitRef.current) orbitRef.current.enabled = !transforming && effectiveViewport.orbit;
                if (completed.length > 1) onTrajectoryComplete?.(completed.map(([x, , z]) => ({ x, z })));
                return;
            }
            // OrbitControls 旋转、平移或缩放结束时也会收到 pointerup，移动阈值避免误落位。
            const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y);
            if (distance > 5 || pointerHitRef.current) return;
            const point = resolveGroundPoint(event);
            if (point) onGroundClick?.(point);
        };

        const onPointerCancel = (event: PointerEvent) => {
            if (pointerDown?.id === event.pointerId) pointerDown = null;
            if (!pathDrawing) return;
            try {
                if (canvasElement.hasPointerCapture(event.pointerId)) canvasElement.releasePointerCapture(event.pointerId);
            } catch {
                /* pointer capture may already be gone */
            }
            pathDrawing = false;
            pathPoints = [];
            setDraftPath([]);
            if (orbitRef.current) orbitRef.current.enabled = !transforming && effectiveViewport.orbit;
        };

        canvasElement.addEventListener("pointermove", onPointerMove, { passive: true });
        canvasElement.addEventListener("pointerdown", onPointerDown, { passive: true });
        canvasElement.addEventListener("pointerup", onPointerUp, { passive: true });
        canvasElement.addEventListener("pointercancel", onPointerCancel, { passive: true });
        return () => {
            canvasElement.removeEventListener("pointermove", onPointerMove);
            canvasElement.removeEventListener("pointerdown", onPointerDown);
            canvasElement.removeEventListener("pointerup", onPointerUp);
            canvasElement.removeEventListener("pointercancel", onPointerCancel);
            if (pointerDown) {
                try {
                    if (canvasElement.hasPointerCapture(pointerDown.id)) canvasElement.releasePointerCapture(pointerDown.id);
                } catch {
                    /* pointer capture may already be gone */
                }
            }
            pointerDown = null;
            pathDrawing = false;
            pathPoints = [];
            setDraftPath([]);
            // 这个 renderer 的 canvas 卸载后，它记录的地面点不得再被读到。
            onGroundPoint(canvasElement, null);
        };
    }, [camera, effectiveViewport.orbit, gl, onGroundClick, onGroundPoint, onTrajectoryComplete, trajectoryDrawing, transforming]);

    // 滚轮/触控缩放与按钮缩放共用同一最近距离：环绕目标落在演员体内时不允许推进到身体内部。
    // 走 state 而不是直接写 controls.minDistance，否则 drei 每次 render 回写 props 会把它重置。
    const [orbitMinDistance, setOrbitMinDistance] = useState(DIRECTOR_MIN_ORBIT_DISTANCE);
    useEffect(() => {
        const controls = orbitRef.current;
        if (!controls) return;
        const sync = () => {
            const next = resolveDirectorZoomMinDistance(scene.objects, controls.target);
            setOrbitMinDistance((current) => (Math.abs(current - next) > 0.01 ? next : current));
        };
        sync();
        controls.addEventListener("end", sync);
        return () => controls.removeEventListener("end", sync);
    }, [scene.objects]);

    // 导航只改 free 相机，不写回场景坐标。初次挂载自动适配一次，避免对象出现在视口角落；之后由用户按钮控制取景。
    const initialFrameSceneRef = useRef<string | null>(null);
    useEffect(() => {
        const resetCamera = () => {
            const target = scene.editorView?.target ?? DIRECTOR_FREE_ORBIT_TARGET;
            editorCamera.position.set(...(scene.editorView?.position ?? directorCanvasCamera.position));
            editorCamera.lookAt(...target);
            orbitRef.current?.target.set(...target);
            orbitRef.current?.update();
            invalidate();
        };
        const frame = (ids?: Set<string>) => {
            const aspect = size.width / Math.max(size.height, 1);
            const bounds = resolveDirectorFrameBounds(scene.objects, ids, aspect, editorCamera.fov);
            if (!bounds) return resetCamera();

            const orbitTarget = orbitRef.current?.target || new Vector3(...DIRECTOR_FREE_ORBIT_TARGET);
            const direction = editorCamera.position.clone().sub(orbitTarget);
            if (direction.lengthSq() < 0.01) direction.set(4.8, 2.7, 6.8);
            direction.normalize();
            orbitRef.current?.target.copy(bounds.target);
            editorCamera.position.copy(bounds.target).add(direction.multiplyScalar(Math.max(1.8, bounds.fitDistance * 1.18)));
            editorCamera.lookAt(bounds.target);
            orbitRef.current?.update();
            invalidate();
        };
        const navigation = {
            focusSelected: () => (selectedObjectId ? frame(new Set([selectedObjectId])) : frame()),
            frameScene: () => frame(),
            resetCamera,
            zoom: (factor: number) => {
                const target = orbitRef.current?.target || new Vector3(...DIRECTOR_FREE_ORBIT_TARGET);
                const offset = editorCamera.position.clone().sub(target);
                const currentDistance = offset.length();
                const direction = currentDistance > 0.01 ? offset.multiplyScalar(1 / currentDistance) : new Vector3(4.8, 2.7, 6.8).normalize();
                const minDistance = resolveDirectorZoomMinDistance(scene.objects, target);
                const nextDistance = Math.max(minDistance, currentDistance * Math.max(0.2, Math.min(2, factor)));
                editorCamera.position.copy(target).add(direction.multiplyScalar(nextDistance));
                editorCamera.lookAt(target);
                orbitRef.current?.update();
                invalidate();
            },
        };
        onNavigationReady?.(navigation);
        if (initialFrameSceneRef.current !== scene.id) {
            initialFrameSceneRef.current = scene.id;
            if (scene.editorView) resetCamera();
            else frame();
        }
        return () => onNavigationReady?.({ focusSelected: () => undefined, frameScene: () => undefined, resetCamera: () => undefined, zoom: () => undefined });
    }, [editorCamera, invalidate, onNavigationReady, scene.id, scene.editorView, scene.objects, selectedObjectId, size.height, size.width]);

    useEffect(() => {
        threeScene.background = new Color(studioBg);
        invalidate();
    }, [invalidate, studioBg, threeScene]);

    useEffect(() => {
        const material = renderMode === "depth" ? new MeshDepthMaterial() : renderMode === "normal" ? new MeshNormalMaterial() : renderMode === "pose" ? new MeshBasicMaterial({ color: PREVIS_PALETTE.light, wireframe: true }) : null;
        if (renderMode === "clay") displayClayRestoreRef.current = applyClaySceneMaterials(threeScene);
        threeScene.overrideMaterial = material;
        invalidate();
        return () => {
            if (threeScene.overrideMaterial === material) threeScene.overrideMaterial = null;
            displayClayRestoreRef.current?.();
            displayClayRestoreRef.current = null;
            material?.dispose();
        };
    }, [invalidate, renderMode, scene.objects, threeScene]);

    // 透视相机（free/CAM）的宽高比随容器尺寸变化；正交相机的半范围在自己的同步 effect 里
    // 按水平/竖直跨度与 aspect 同时拟合，这里只负责两台透视相机的 aspect + 投影矩阵。
    useEffect(() => {
        const aspect = size.width / Math.max(size.height, 1);
        editorCamera.aspect = aspect;
        editorCamera.updateProjectionMatrix();
        camCamera.aspect = aspect;
        camCamera.updateProjectionMatrix();
        invalidate();
    }, [camCamera, editorCamera, invalidate, size]);

    // 当前镜头的 CAM 直接使用 shotCamera；其他观察模式保留独立的相机状态。
    useEffect(() => {
        const next = effectiveViewport.camera === "orthographic" ? orthoCamera : effectiveViewport.camera === "camera" ? (currentShotView && shotState ? shotCamera : camCamera) : editorCamera;
        set({ camera: next });
        if (shotState) applyShotCameraState(shotCamera, shotState);
        invalidate();
    }, [camCamera, effectiveViewport.camera, editorCamera, invalidate, orthoCamera, set, currentShotView, shotCamera, shotState, size]);

    return (
        <>
            {/* CAM 与正交轴向的取景各自独立同步到专属相机对象，互不干扰；free 完全交给
                下面的 OrbitControls，这里不对它做任何写入。 */}
            <DirectorShotCameraSync camera={camCamera} framing={camFraming} />
            <DirectorOrthoCameraSync camera={orthoCamera} framing={orthoFraming} aspect={size.width / Math.max(size.height, 1)} />
            <DirectorEnvironmentView environment={!whiteStage && directorQuality.environmentEffects ? scene.environment : undefined} fallbackColor={studioBg} />
            <ambientLight intensity={whiteStage ? PREVIS_LIGHTING.ambientIntensity : scene.environmentIntensity * PREVIS_LIGHTING.beautyAmbientScale} />
            <hemisphereLight args={[PREVIS_LIGHTING.hemisphere.skyColor, PREVIS_LIGHTING.hemisphere.groundColor, PREVIS_LIGHTING.hemisphere.intensity]} />
            {whiteStage ? (
                <>
                    <directionalLight {...PREVIS_LIGHTING.key} {...directorShadowProps} />
                    <directionalLight {...PREVIS_LIGHTING.fill} />
                </>
            ) : displayStage ? (
                displayStage.lights.map((light) => <DirectorLightView key={light.id} light={light} time={objectPlayhead} />)
            ) : (
                scene.lights.map((light) => <DirectorLightView key={light.id} light={light} time={objectPlayhead} />)
            )}
            {scene.gridVisible ? (
                <Grid
                    userData={{ directorEditorOnly: true, directorGroundGrid: true, directorNoMaterialOverride: true }}
                    position={[0, 0.003, 0]}
                    infiniteGrid
                    fadeDistance={60}
                    fadeStrength={1.5}
                    cellThickness={0.85}
                    sectionThickness={1.25}
                    cellSize={0.5}
                    sectionSize={5}
                    cellColor={scene.groundColor ? PREVIS_PALETTE.studioGrid : PREVIS_PALETTE.gridCell}
                    sectionColor={scene.groundColor ? PREVIS_PALETTE.studioGridSection : PREVIS_PALETTE.gridSection}
                />
            ) : null}
            <mesh userData={{ directorNoMaterialOverride: true }} rotation={[-Math.PI / 2, 0, 0]} visible={scene.groundVisible !== false} receiveShadow position={[0, -0.012, 0]}>
                <planeGeometry args={[scene.groundSize ?? 140, scene.groundSize ?? 140]} />
                <meshStandardMaterial opacity={scene.groundOpacity ?? 1} transparent={(scene.groundOpacity ?? 1) < 1} depthWrite={(scene.groundOpacity ?? 1) > 0} color={scene.groundColor ?? PREVIS_PALETTE.ground} {...PREVIS_MATERIAL} />
            </mesh>
            {directorQuality.contactShadows && scene.groundVisible !== false && (scene.groundOpacity ?? 1) > 0 && <DirectorContactShadows />}
            <group userData={{ directorEditorOnly: true }} visible={effectiveViewport.camera !== "camera"}>
                {draftPath.length > 1 ? <DirectorDraftPath points={draftPath} /> : null}
                {cameraMotionPaths.map((item) => (
                    <DirectorCameraTrail key={item.id} camera={item} />
                ))}
            </group>
            {showMotionPaths && !playing && routeEditing?.route && (
                <DirectorRouteOverlay
                    editor={routeEditing}
                    onDragging={(active) => {
                        if (active) pointerHitRef.current = true;
                        setTransformingState(active);
                    }}
                />
            )}
            {!playing && !planFraming && effectiveViewport.camera !== "camera" && cameraPathEditing?.route && (
                <DirectorRouteOverlay
                    editor={cameraPathEditing}
                    onDragging={(active) => {
                        if (active) pointerHitRef.current = true;
                        setTransformingState(active);
                    }}
                />
            )}
            {displayObjects
                .filter((item) => item.visible)
                .map((object) => (
                    <DirectorObjectView
                        key={object.id}
                        object={object}
                        renderedTransform={pathActors[object.id]?.transform}
                        motion={motions[object.id]}
                        previs={whiteStage}
                        seat={displayObjects.find((item) => item.id === (motions[object.id]?.seatId ?? object.seatObjectId) && item.visible)}
                        showLabel={!planFraming && effectiveViewport.camera !== "camera"}
                        selected={selectedObjectId === object.id && !routeEditing?.dragging && !routeEditing?.adding}
                        selectedBone={selectedObjectId === object.id ? selectedBone : null}
                        transformMode={transformMode}
                        playhead={objectPlayhead}
                        onSelect={() => {
                            pointerHitRef.current = true;
                            onSelectObject(object.id);
                        }}
                        onSelectBone={(bone) => {
                            onSelectObject(object.id);
                            onSelectBone(bone);
                        }}
                        onTransforming={setTransformingState}
                        onTransform={(from, to) => onObjectTransform(object.id, from, to)}
                        onBoneTransform={(bone, rotation) => onBoneTransform(object.id, bone, rotation)}
                        onActorRigReady={(rig, animations) => onActorRigReady(object.id, rig, animations)}
                        onLoadStateChange={onLoadStateChange}
                    />
                ))}
            {/* 导演视角下渲染每台摄影机，选中时显示 TransformControls；CAM 视角隐藏，避免挡住取景。 */}
            <group userData={{ directorEditorOnly: true }}>
                {effectiveViewport.camera === "camera" || planFraming
                    ? null
                    : scene.cameras.map((cam) => (
                          <DirectorCameraView
                              key={cam.id}
                              camera={sampleDirectorCamera(cam, playhead)}
                              shotState={cam.id === selectedCameraId ? selectedShotState : cam.id === activeShot?.cameraId ? shotState : null}
                              editable={!scene.previs?.segments.some((segment) => segment.cameraId === cam.id && !segment.legacyShotId)}
                              selected={selectedCameraId === cam.id}
                              transformMode={transformMode}
                              onSelect={() => {
                                  pointerHitRef.current = true;
                                  onSelectCamera?.(cam.id);
                              }}
                              onTransforming={setTransformingState}
                              onTransform={(from, to) => onCameraTransform?.(cam.id, from, to)}
                          />
                      ))}
                {selectedCameraId && !playing && effectiveViewport.camera !== "camera" && !planFraming && shotFrustum ? (
                    <group>
                        {shotFrustum.corners.map((corner, index) => (
                            <Line key={`shot-ray-${index}`} points={[shotFrustum.origin, corner]} color={PREVIS_PALETTE.camera} lineWidth={2} />
                        ))}
                        <Line points={[...shotFrustum.corners, shotFrustum.corners[0]]} color={PREVIS_PALETTE.camera} lineWidth={2} />
                    </group>
                ) : null}
            </group>
            {/* 只有有效 free 回落允许环绕：drei 只在 enabled 时调 controls.update()，CAM/正交下这是
                真正的锁定，不会有 controls 每帧把相机拽回自己 target 的回写竞争。
                camera 显式绑定 editorCamera：即使 state.camera 当前指向别的相机，也绝不会
                被这份环绕状态误伤。CAM 取景失败时 orbit 打开，用已有的自由视角，不改场景。 */}
            <OrbitControls
                ref={orbitRef}
                makeDefault
                camera={editorCamera}
                enabled={!transforming && effectiveViewport.orbit}
                target={DIRECTOR_FREE_ORBIT_TARGET}
                minDistance={orbitMinDistance}
                maxDistance={80}
                enableDamping
                dampingFactor={0.08}
                rotateSpeed={0.7}
                panSpeed={0.85}
                zoomSpeed={0.85}
                screenSpacePanning
                domElement={panSurface ?? undefined}
                mouseButtons={{ LEFT: panSurface ? MOUSE.PAN : MOUSE.ROTATE, MIDDLE: MOUSE.PAN, RIGHT: MOUSE.PAN }}
                touches={{ ONE: panSurface ? TOUCH.PAN : TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN }}
            />
        </>
    );
}

function DirectorEnvironmentView({ environment, fallbackColor }: { environment?: DirectorEnvironment; fallbackColor: string }) {
    useI18n();
    const { scene } = useThree();
    const textureRef = useRef<Texture | null>(null);
    const identity = useMemo(() => ({}), [environment?.mode, environment?.rotationY, environment?.url, fallbackColor]);
    const [loadedIdentity, setLoadedIdentity] = useState<object | null>(null);
    useDirectorSnapshotResource(identity, environment?.mode !== "panorama" || !environment.url || loadedIdentity === identity);
    useEffect(() => {
        scene.background = new Color(fallbackColor);
        const activeEnvironment = environment;
        const url = activeEnvironment?.mode === "panorama" ? activeEnvironment.url : undefined;
        if (!url) return;
        const loader = new TextureLoader();
        let disposed = false;
        loader.load(
            url,
            (texture) => {
                if (disposed) {
                    texture.dispose();
                    return;
                }
                texture.colorSpace = SRGBColorSpace;
                texture.mapping = EquirectangularReflectionMapping;
                texture.center.set(0.5, 0.5);
                texture.rotation = activeEnvironment?.rotationY || 0;
                textureRef.current = texture;
                scene.background = texture;
                setLoadedIdentity(identity);
            },
            undefined,
            () => {
                if (!disposed) scene.background = new Color(fallbackColor);
            },
        );
        return () => {
            disposed = true;
            if (scene.background === textureRef.current) scene.background = new Color(fallbackColor);
            textureRef.current?.dispose();
            textureRef.current = null;
        };
    }, [environment?.mode, environment?.rotationY, environment?.url, fallbackColor, identity, scene]);
    return null;
}

/** Each wire pyramid shows the lens direction at that key; a single draw call keeps dense tracks cheap. */
function DirectorCameraTrail({ camera }: { camera: DirectorCamera }) {
    const { points, markers, arrows } = useMemo(() => {
        const validKeys = new Set(finiteDirectorTransformKeyframes(camera.keyframes));
        const keys = camera.keyframes.filter((k) => validKeys.has(k)).toSorted((a, b) => a.time - b.time);
        const points = keys.length ? keys.map((k) => k.transform.position) : (camera.motionPath?.points ?? []);
        const vertices: number[] = [];
        points.forEach((position, i) => {
            const eye = new Vector3(...position);
            const orientation = new Matrix4().lookAt(eye, new Vector3(...(keys[i]?.target ?? camera.target)), new Vector3(0, 1, 0));
            const corners = [
                [-1, -1],
                [1, -1],
                [1, 1],
                [-1, 1],
            ].map(([x, y]) => new Vector3(x * 0.065, y * 0.04, -0.09).applyMatrix4(orientation).add(eye));
            corners.forEach((corner, j) => vertices.push(...eye.toArray(), ...corner.toArray(), ...corner.toArray(), ...corners[(j + 1) % 4].toArray()));
        });
        // The lens pyramids show what each camera sees. Chevrons follow the travel tangent.
        const arrows: number[] = [];
        const path = points.map((point) => new Vector3(...point));
        const lengths = path.slice(1).map((point, i) => point.distanceTo(path[i]));
        const length = lengths.reduce((sum, distance) => sum + distance, 0);
        for (const fraction of [0.2, 0.5, 0.8]) {
            let remaining = length * fraction;
            for (const [i, distance] of lengths.entries()) {
                if (distance < 0.0001) continue;
                if (remaining > distance) {
                    remaining -= distance;
                    continue;
                }
                const tangent = path[i + 1].clone().sub(path[i]).normalize();
                const tip = path[i].clone().addScaledVector(tangent, remaining);
                const normal = Math.abs(tangent.y) > 0.95 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
                const size = Math.min(0.14, length * 0.06);
                const wing = tangent
                    .clone()
                    .cross(normal)
                    .normalize()
                    .multiplyScalar(size * 0.48);
                const tail = tip.clone().addScaledVector(tangent, -size);
                arrows.push(...tail.clone().add(wing).toArray(), ...tip.toArray(), ...tip.toArray(), ...tail.sub(wing).toArray());
                break;
            }
        }
        return { points, markers: new Float32Array(vertices), arrows: new Float32Array(arrows) };
    }, [camera]);
    if (points.length < 2) return null;
    return (
        <group>
            <Line points={points} color={PREVIS_PALETTE.lensTrail} lineWidth={1} transparent opacity={0.8} depthWrite={false} depthTest={false} renderOrder={10} />
            <lineSegments renderOrder={11}>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" args={[arrows, 3]} />
                </bufferGeometry>
                <lineBasicMaterial color={PREVIS_PALETTE.lensTrail} transparent depthTest={false} depthWrite={false} toneMapped={false} />
            </lineSegments>
            <lineSegments renderOrder={11}>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" args={[markers, 3]} />
                </bufferGeometry>
                <lineBasicMaterial color={PREVIS_PALETTE.lensMarker} transparent opacity={0.95} depthWrite={false} depthTest={false} toneMapped={false} />
            </lineSegments>
        </group>
    );
}

function DirectorDraftPath({ points }: { points: DirectorVec3[] }) {
    useI18n();
    return (
        <group>
            <Line points={points} color={PREVIS_PALETTE.routeProgress} lineWidth={3} dashed dashSize={0.16} gapSize={0.08} />
            <mesh position={points[0]}>
                <sphereGeometry args={[0.13, 12, 8]} />
                <meshBasicMaterial color={PREVIS_PALETTE.route} />
            </mesh>
            <mesh position={points[points.length - 1]}>
                <sphereGeometry args={[0.15, 12, 8]} />
                <meshBasicMaterial color={PREVIS_PALETTE.routeProgress} />
            </mesh>
        </group>
    );
}

/**
 * CAM 取景：把 shot 摄影机的解算结果写进专属的机位相机对象。
 *
 * 这台相机独立持有，不是共享的视口默认相机：离开 CAM 模式后不需要任何快照/还原——
 * 没有人会在其他模式下碰它，回到 CAM 时上一次写入的状态原样还在，物理上不可能被污染。
 *
 * 只写这台相机对象，绝不触碰 DirectorScene：换一只眼睛看场景不是内容改动，
 * 因此不产生任何 undo/history 记录，也不会触发保存。
 */
function DirectorShotCameraSync({ camera, framing }: { camera: PerspectiveCamera; framing: DirectorViewFraming | null }) {
    useI18n();
    const invalidate = useThree((state) => state.invalidate);
    const framingKey = directorViewFramingKey(framing);
    useEffect(() => {
        if (!framing) return;
        // up 必须先写：lookAt 用当前 camera.up 解基向量，顺序颠倒会丢掉荷兰角。
        camera.up.set(...framing.up);
        camera.position.set(...framing.position);
        camera.fov = framing.fov;
        camera.near = framing.near;
        camera.far = framing.far;
        camera.lookAt(...framing.target);
        camera.updateProjectionMatrix();
        invalidate();
        // framing 只通过 framingKey 参与依赖：草稿对象身份变化不触发无谓回写。
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [framingKey, invalidate, camera]);
    return null;
}

/**
 * 正交轴向取景：把包围盒解算结果写进专属的正交相机对象，语义与 DirectorShotCameraSync
 * 完全对称——独立持有、无需快照还原、绝不碰 DirectorScene。
 *
 * 水平/竖直跨度由领域层给出；视口只传入运行时 aspect，半范围换算走
 * resolveDirectorOrthographicFrustum，同时装下两条轴，避免宽内容被裁切。
 */
function DirectorOrthoCameraSync({ camera, framing, aspect }: { camera: OrthographicCamera; framing: DirectorOrthographicFraming | null; aspect: number }) {
    useI18n();
    const invalidate = useThree((state) => state.invalidate);
    const framingKey = framing ? [...framing.position, ...framing.target, ...framing.up, framing.horizontalSpan, framing.verticalSpan, framing.near, framing.far].map((value) => value.toFixed(4)).join("|") : "";
    useEffect(() => {
        if (!framing) return;
        const frustum = resolveDirectorOrthographicFrustum({ horizontalSpan: framing.horizontalSpan, verticalSpan: framing.verticalSpan, aspect });
        camera.up.set(...framing.up);
        camera.position.set(...framing.position);
        camera.left = frustum.left;
        camera.right = frustum.right;
        camera.top = frustum.top;
        camera.bottom = frustum.bottom;
        camera.near = framing.near;
        camera.far = framing.far;
        camera.lookAt(...framing.target);
        camera.updateProjectionMatrix();
        invalidate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [framingKey, aspect, invalidate, camera]);
    return null;
}

function DirectorObjectView({
    object,
    renderedTransform,
    motion,
    previs,
    seat,
    showLabel = true,
    selected,
    selectedBone,
    transformMode,
    playhead,
    onSelect,
    onSelectBone,
    onTransforming,
    onTransform,
    onBoneTransform,
    onActorRigReady,
    onLoadStateChange,
}: {
    object: DirectorObject;
    renderedTransform?: DirectorTransform;
    motion?: PrevisMotionState;
    previs: boolean;
    seat?: DirectorObject;
    showLabel?: boolean;
    selected: boolean;
    selectedBone: string | null;
    transformMode: DirectorViewportProps["transformMode"];
    playhead: number;
    onSelect: () => void;
    onSelectBone: (bone: string | null) => void;
    onTransforming: (value: boolean) => void;
    onTransform: (from: DirectorTransform, to: DirectorTransform) => void;
    onBoneTransform: (bone: string, rotation: DirectorQuat) => void;
    onActorRigReady: (rig: DirectorRig, animations: AnimationClip[]) => void;
    onLoadStateChange: (id: string, signal: DirectorLoadSignal, retry: () => void) => void;
}) {
    useI18n();
    const [target, setTarget] = useState<Group | null>(null);
    const { camera, gl, invalidate } = useThree();
    const resolved = { ...(renderedTransform ?? sampleDirectorTransform(object.transform, object.keyframes, playhead, object.motionPath)) };
    if (motion?.yaw !== undefined) resolved.rotation = [resolved.rotation[0], motion.yaw, resolved.rotation[2]];
    const mannequin = resolveNeutralMannequin(object);
    const labelHeight = (1.88 - 0.35 * sampleDirectorSeatedWeight(object, playhead) + 0.15 * (mannequin.headRatio - 1)) * mannequin.height;
    const seated = motion?.kind === "sit" || sampleDirectorActorPose(object, playhead) === "sit";
    const seatTransform = seat && sampleDirectorTransform(seat.transform, seat.keyframes, playhead, seat.motionPath);
    const seatPelvis = seated && seat && seatTransform ? resolveSeatedPelvis({ ...seat, transform: seatTransform }) : null;
    if (seatPelvis && seatTransform) {
        resolved.position = [seatPelvis[0], seatTransform.position[1], seatPelvis[2]];
        resolved.rotation = [0, seatTransform.rotation[1] + (getDirectorAsset(seat!.stageProp!)!.anchors.seatAnchor.yaw || 0), 0];
    }
    // 手势进行中冻结声明式 transform，交由触摸拖动更新；终态后再由场景状态接管。
    const [frozen, setFrozen] = useState<DirectorTransform | null>(null);
    const transform = frozen || resolved;
    const groundPlane = useMemo(() => new Plane(new Vector3(0, 1, 0), 0), []);
    const raycaster = useMemo(() => new Raycaster(), []);
    const ndc = useMemo(() => new Vector2(), []);
    const hit = useMemo(() => new Vector3(), []);
    const dragRef = useRef<{ pointerId: number; startGround: Vector3; from: DirectorTransform; to: DirectorTransform; moved: boolean } | null>(null);
    const onTransformRef = useRef(onTransform);
    const onTransformingRef = useRef(onTransforming);
    onTransformRef.current = onTransform;
    onTransformingRef.current = onTransforming;

    const resolveGroundPoint = useCallback(
        (event: PointerEvent) => {
            const bounds = gl.domElement.getBoundingClientRect();
            if (bounds.width <= 0 || bounds.height <= 0) return null;
            ndc.set(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1);
            raycaster.setFromCamera(ndc, camera);
            if (!raycaster.ray.intersectPlane(groundPlane, hit)) return null;
            return finiteDirectorGroundPoint(hit.x, hit.z);
        },
        [camera, gl, groundPlane, hit, ndc, raycaster],
    );

    const releasePointerCapture = useCallback(
        (pointerId: number) => {
            const canvas = gl.domElement;
            if (!canvas.hasPointerCapture(pointerId)) return;
            try {
                canvas.releasePointerCapture(pointerId);
            } catch {
                /* pointer capture may already be gone */
            }
        },
        [gl],
    );

    const capturePointer = useCallback(
        (pointerId: number) => {
            try {
                gl.domElement.setPointerCapture(pointerId);
            } catch {
                /* browser may reject a stale pointer */
            }
        },
        [gl],
    );

    const finishDirectDrag = useCallback(
        (pointerId: number, cancel = false) => {
            const drag = dragRef.current;
            if (!drag || drag.pointerId !== pointerId) return;
            dragRef.current = null;
            releasePointerCapture(pointerId);
            onTransformingRef.current(false);
            if (!cancel && drag.moved) onTransformRef.current(drag.from, drag.to);
            setFrozen(null);
        },
        [releasePointerCapture],
    );

    // 命中对象后由视口级 Pointer Events 接管整段拖动，指针离开模型仍能持续更新。
    useEffect(() => {
        const onPointerMove = (event: PointerEvent) => {
            const drag = dragRef.current;
            if (!drag || drag.pointerId !== event.pointerId) return;
            event.preventDefault();
            const point = resolveGroundPoint(event);
            if (!point) return;
            const next: DirectorTransform = {
                ...drag.from,
                position: [drag.from.position[0] + point.x - drag.startGround.x, drag.from.position[1], drag.from.position[2] + point.z - drag.startGround.z],
            };
            drag.to = next;
            drag.moved = drag.moved || Math.hypot(point.x - drag.startGround.x, point.z - drag.startGround.z) > 0.01;
            setFrozen(next);
            invalidate();
        };
        const onPointerUp = (event: PointerEvent) => finishDirectDrag(event.pointerId);
        const onPointerCancel = (event: PointerEvent) => finishDirectDrag(event.pointerId, true);
        window.addEventListener("pointermove", onPointerMove, { passive: false });
        window.addEventListener("pointerup", onPointerUp);
        window.addEventListener("pointercancel", onPointerCancel);
        return () => {
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerUp);
            window.removeEventListener("pointercancel", onPointerCancel);
            if (dragRef.current) finishDirectDrag(dragRef.current.pointerId, true);
        };
    }, [finishDirectDrag, invalidate, resolveGroundPoint]);

    return (
        <>
            <group
                ref={setTarget}
                position={transform.position}
                rotation={transform.rotation}
                scale={transform.scale}
                onPointerDown={(event) => {
                    event.stopPropagation();
                    onSelect();
                    // 白膜对象摆位接受主鼠标或触摸指针；点击对象仍然会选中对象。
                    const nativeEvent = event.nativeEvent;
                    if (nativeEvent.isPrimary === false || nativeEvent.button !== 0 || transformMode !== "translate") return;
                    nativeEvent.preventDefault();
                    const startGround = event.ray.intersectPlane(groundPlane, new Vector3());
                    if (!startGround) return;
                    const from = target ? readObject3DTransform(target) : readObject3DTransform(event.object.parent || event.object);
                    dragRef.current = { pointerId: nativeEvent.pointerId, startGround: startGround.clone(), from, to: from, moved: false };
                    capturePointer(nativeEvent.pointerId);
                    setFrozen(from);
                    onTransforming(true);
                }}
            >
                <DirectorObjectVisual
                    object={{ ...object, pose: motion?.kind === "sit" ? "sit" : sampleDirectorActorPose(object, playhead) }}
                    motion={motion}
                    previs={previs}
                    seatPelvis={seatPelvis}
                    selected={selected}
                    selectedBone={selectedBone}
                    playhead={playhead}
                    onSelectBone={onSelectBone}
                    onBoneTransform={onBoneTransform}
                    onActorRigReady={onActorRigReady}
                    onLoadStateChange={onLoadStateChange}
                />
                {(object.kind === "actor" || object.primitive === "character") && showLabel && (
                    <Html
                        center
                        zIndexRange={[5, 0]}
                        userData={{ directorEditorOnly: true }}
                        position={[0, labelHeight, 0]}
                        style={{ pointerEvents: "none", whiteSpace: "nowrap", fontSize: 11, color: "var(--fg)", background: "var(--surface)", padding: "2px 6px", borderRadius: "var(--r-sm)" }}
                    >
                        <span>{object.name}</span>
                    </Html>
                )}
                {object.heldProp === "folded_umbrella" && (
                    <group position={[0, 1.24, 0.3]} rotation={[0, 0, -0.7]}>
                        <mesh castShadow>
                            <cylinderGeometry args={[0.018, 0.018, 1.1, 8]} />
                            <meshStandardMaterial color={PREVIS_PALETTE.propDetail} {...PREVIS_MATERIAL} />
                        </mesh>
                        <mesh position={[0, 0.12, 0]} castShadow>
                            <coneGeometry args={[0.085, 0.76, 8]} />
                            <meshStandardMaterial color={PREVIS_PALETTE.ground} {...PREVIS_MATERIAL} />
                        </mesh>
                        <mesh position={[0.055, -0.51, 0]} rotation={[0, 0, Math.PI]} castShadow>
                            <torusGeometry args={[0.055, 0.018, 6, 12, Math.PI]} />
                            <meshStandardMaterial color={PREVIS_PALETTE.propDetail} {...PREVIS_MATERIAL} />
                        </mesh>
                    </group>
                )}
            </group>
            {selected && target ? <DirectorObjectGizmo target={target} transformMode={transformMode} onFreeze={setFrozen} onTransforming={onTransforming} onTransform={onTransform} /> : null}
        </>
    );
}

function resolveDirectorCameraPalette(camera: DirectorCamera) {
    const seed = `${camera.id}:${camera.name}`;
    let hash = 0;
    for (let index = 0; index < seed.length; index += 1) hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
    const accentHex = PREVIS_PALETTE.cameraAccents[hash % PREVIS_PALETTE.cameraAccents.length];
    const accent = new Color(accentHex);
    return {
        accent,
        accentHex,
        bright: accent.clone().offsetHSL(0, 0.04, 0.14),
        deep: accent.clone().offsetHSL(0, -0.05, -0.24),
        tint: accent.clone().offsetHSL(0, -0.04, 0.25),
    };
}

/**
 * 场景内摄影机标记：导演视角中每台摄影机都保持可见；点击任意机位即可选中并调节位置、旋转或缩放。
 * 视觉上用分层的机身、镜头、取景器和热靴替代普通方盒，但交互仍由同一个 group/gizmo 承担。
 */
function DirectorCameraView({
    camera,
    shotState,
    editable,
    selected,
    transformMode,
    onSelect,
    onTransforming,
    onTransform,
}: {
    camera: DirectorCamera;
    shotState: ShotCameraState | null;
    editable: boolean;
    selected: boolean;
    transformMode: DirectorViewportProps["transformMode"];
    onSelect: () => void;
    onTransforming: (active: boolean) => void;
    onTransform: (from: DirectorTransform, to: DirectorTransform) => void;
}) {
    useI18n();
    const [target, setTarget] = useState<Group | null>(null);
    const [frozen, setFrozen] = useState<DirectorTransform | null>(null);
    const invalidate = useThree((state) => state.invalidate);

    useEffect(() => {
        // frozen != null 时 TransformControls 正在拖动，不覆盖 group 的实时位置
        if (frozen !== null || !target) return;
        const [x, y, z] = shotState?.position ?? camera.transform.position;
        target.position.set(x, y, z);
        // CAM 取景看向 camera.target，机位模型也必须朝向同一点，否则画面与模型方向不一致。
        const eye = new Vector3(x, y, z);
        const look = new Vector3(...camera.target);
        if (shotState) target.quaternion.set(...shotState.quaternion);
        else if (look.distanceToSquared(eye) > 1e-6) target.quaternion.setFromRotationMatrix(new Matrix4().lookAt(eye, look, new Vector3(0, 1, 0)));
        else target.rotation.set(...(camera.transform.rotation as [number, number, number]));
        target.scale.set(1, 1, 1);
        target.updateMatrixWorld(true);
        invalidate();
    }, [camera.target, camera.transform, shotState, frozen, invalidate, target]);

    const palette = useMemo(() => resolveDirectorCameraPalette(camera), [camera.id, camera.name]);
    const label = camera.name.trim() || t("canvasExtra.directorWB.camera");
    const lineColor = selected ? palette.bright : palette.accent;
    const bodyColor = selected ? PREVIS_PALETTE.cameraBodySelected : PREVIS_PALETTE.cameraBody;
    const bodyEdgeColor = selected ? palette.bright : PREVIS_PALETTE.cameraEdge;
    const lensColor = selected ? PREVIS_PALETTE.cameraLensSelected : PREVIS_PALETTE.cameraLens;

    return (
        <>
            <group
                ref={setTarget}
                onPointerDown={(event) => {
                    event.stopPropagation();
                    onSelect();
                }}
            >
                {selected ? (
                    <mesh position={[0, 0.2, 0.02]}>
                        <sphereGeometry args={[0.52, 20, 14]} />
                        <meshBasicMaterial color={palette.accent} transparent opacity={0.08} depthWrite={false} />
                    </mesh>
                ) : null}
                <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
                    <boxGeometry args={[0.68, 0.38, 0.5]} />
                    <meshStandardMaterial color={bodyColor} {...PREVIS_MATERIAL} />
                </mesh>
                <mesh position={[0, 0.2, -0.256]}>
                    <boxGeometry args={[0.47, 0.25, 0.018]} />
                    <meshStandardMaterial color={palette.deep} {...PREVIS_MATERIAL} />
                </mesh>
                <mesh position={[-0.3, 0.2, 0.04]}>
                    <boxGeometry args={[0.035, 0.29, 0.3]} />
                    <meshStandardMaterial color={palette.accent} {...PREVIS_MATERIAL} />
                </mesh>
                <mesh position={[0.31, 0.2, 0.03]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.056, 0.056, 0.03, 20]} />
                    <meshStandardMaterial color={palette.bright} {...PREVIS_MATERIAL} />
                </mesh>
                <mesh position={[0, 0.2, -0.37]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                    <cylinderGeometry args={[0.16, 0.145, 0.2, 32]} />
                    <meshStandardMaterial color={lensColor} {...PREVIS_MATERIAL} />
                </mesh>
                <mesh position={[0, 0.2, -0.475]}>
                    <torusGeometry args={[0.145, 0.024, 12, 36]} />
                    <meshStandardMaterial color={bodyEdgeColor} {...PREVIS_MATERIAL} />
                </mesh>
                <mesh position={[0, 0.2, -0.494]}>
                    <circleGeometry args={[0.109, 32]} />
                    <meshStandardMaterial color={palette.tint} {...PREVIS_MATERIAL} transparent opacity={0.94} />
                </mesh>
                <mesh position={[0, 0.2, -0.498]}>
                    <ringGeometry args={[0.071, 0.097, 32]} />
                    <meshBasicMaterial color={palette.bright} transparent opacity={selected ? 0.86 : 0.58} />
                </mesh>
                <mesh position={[-0.035, 0.242, -0.501]}>
                    <circleGeometry args={[0.019, 16]} />
                    <meshBasicMaterial color={PREVIS_PALETTE.cameraGlint} transparent opacity={selected ? 0.8 : 0.5} />
                </mesh>
                <mesh position={[0, 0.5, 0.02]} castShadow>
                    <boxGeometry args={[0.44, 0.075, 0.16]} />
                    <meshStandardMaterial color={bodyEdgeColor} {...PREVIS_MATERIAL} />
                </mesh>
                <mesh position={[-0.17, 0.39, 0.02]} castShadow>
                    <boxGeometry args={[0.06, 0.27, 0.12]} />
                    <meshStandardMaterial color={bodyEdgeColor} {...PREVIS_MATERIAL} />
                </mesh>
                <mesh position={[0.17, 0.39, 0.02]} castShadow>
                    <boxGeometry args={[0.06, 0.27, 0.12]} />
                    <meshStandardMaterial color={bodyEdgeColor} {...PREVIS_MATERIAL} />
                </mesh>
                <mesh position={[0, 0.536, 0.02]}>
                    <boxGeometry args={[0.28, 0.018, 0.17]} />
                    <meshBasicMaterial color={palette.accent} transparent opacity={selected ? 0.98 : 0.78} />
                </mesh>
                <mesh position={[0.15, 0.405, 0.12]} rotation={[0.12, 0.1, 0]} castShadow>
                    <boxGeometry args={[0.15, 0.13, 0.17]} />
                    <meshStandardMaterial color={PREVIS_PALETTE.cameraViewfinder} {...PREVIS_MATERIAL} />
                </mesh>
                <mesh position={[0, -0.035, 0.04]} castShadow>
                    <cylinderGeometry args={[0.064, 0.08, 0.17, 20]} />
                    <meshStandardMaterial color={bodyEdgeColor} {...PREVIS_MATERIAL} />
                </mesh>
                <mesh position={[0, -0.14, 0.04]} castShadow>
                    <boxGeometry args={[0.29, 0.06, 0.22]} />
                    <meshStandardMaterial color={PREVIS_PALETTE.cameraBase} {...PREVIS_MATERIAL} />
                </mesh>
                <Line
                    points={[
                        [0, 0.2, 0],
                        [0, 0.7, 0],
                    ]}
                    color={lineColor}
                    lineWidth={selected ? 2 : 1.2}
                    transparent
                    opacity={selected ? 0.85 : 0.46}
                />
                <Html center position={[0, 0.98, 0]} zIndexRange={[12, 0]} style={{ pointerEvents: "none", userSelect: "none" }}>
                    <div
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            maxWidth: 160,
                            padding: "4px 8px",
                            border: `1px solid ${palette.accentHex}40`,
                            borderRadius: 6,
                            background: "var(--pd-s1)",
                            boxShadow: "var(--pd-shadow-raised)",
                            color: "var(--pd-t0)",
                            fontFamily: "inherit",
                            fontSize: 10,
                            fontWeight: 600,
                            letterSpacing: "0.02em",
                            lineHeight: 1,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            opacity: selected ? 1 : 0.75,
                            transform: selected ? "scale(1)" : "scale(0.95)",
                            transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                        }}
                    >
                        <span style={{ width: 4, height: 4, flex: "0 0 auto", borderRadius: "50%", background: palette.accentHex, boxShadow: selected ? `0 0 6px ${palette.accentHex}` : "none" }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
                    </div>
                </Html>
            </group>
            {selected && editable && target ? <DirectorObjectGizmo target={target} transformMode={transformMode === "scale" ? "translate" : transformMode} onFreeze={setFrozen} onTransforming={onTransforming} onTransform={onTransform} /> : null}
        </>
    );
}

function DirectorObjectGizmo({
    target,
    transformMode,
    onFreeze,
    onTransforming,
    onTransform,
}: {
    target: Group;
    transformMode: DirectorViewportProps["transformMode"];
    onFreeze: (transform: DirectorTransform | null) => void;
    onTransforming: (value: boolean) => void;
    onTransform: (from: DirectorTransform, to: DirectorTransform) => void;
}) {
    useI18n();
    const transaction = useDirectorGizmoTransaction<DirectorTransform>({
        read: () => readObject3DTransform(target),
        restore: (snapshot) => applyObject3DTransform(target, snapshot),
        commit: onTransform,
        onActive: (active, snapshot) => {
            onFreeze(active ? snapshot : null);
            onTransforming(active);
        },
    });
    return (
        <group userData={{ directorEditorOnly: true }}>
            <TransformControls object={target} mode={transformMode} size={0.8} onMouseDown={() => transaction.begin()} onMouseUp={() => transaction.end("commit")} />
        </group>
    );
}

/**
 * gizmo 事务的统一接线：对象与骨骼共用，避免两套实现产生偏差。
 * 监听在挂载期间常驻安装（不以「当前是否有手势」为安装条件），
 * 非活跃时 end 自身是空操作。
 */
function useDirectorGizmoTransaction<TSnapshot>({
    read,
    restore,
    commit,
    onActive,
}: {
    read: () => TSnapshot | null;
    restore: (snapshot: TSnapshot) => void;
    commit: (from: TSnapshot, to: TSnapshot) => void;
    onActive: (active: boolean, snapshot: TSnapshot | null) => void;
}) {
    const hooksRef = useRef({ read, restore, commit, onActive });
    useEffect(() => {
        hooksRef.current = { read, restore, commit, onActive };
    }, [commit, onActive, read, restore]);

    const transaction = useMemo(
        () =>
            createDirectorTransaction<TSnapshot>({
                read: () => hooksRef.current.read(),
                restore: (snapshot) => hooksRef.current.restore(snapshot),
                commit: (from, to) => hooksRef.current.commit(from, to),
                setActive: (active) => hooksRef.current.onActive(active, active ? hooksRef.current.read() : null),
                // stdlib 在 domElement.ownerDocument 上注册 pointerup，其 pointerUp({button:0})
                // 会 dispatch mouseUp 后清 dragging=false / axis=null。因此用真实事件走它自己的
                // 收尾通道，而不是写它的私有字段（.d.ts 中 dragging/axis 均为 private）。
                terminateDrag: () => document.dispatchEvent(new PointerEvent("pointerup", { button: 0, bubbles: true })),
            }),
        [],
    );

    useEffect(
        () =>
            installDirectorTerminalListeners(transaction, {
                window,
                document,
                isHidden: () => document.visibilityState === "hidden",
            }),
        [transaction],
    );

    // 取消选中、删除对象、切换模型或卸载都必须回到快照并释放 transforming。
    useEffect(() => () => transaction.end("cancel"), [transaction]);

    return transaction;
}

function readObject3DTransform(target: Object3D): DirectorTransform {
    return { position: target.position.toArray() as DirectorVec3, rotation: [target.rotation.x, target.rotation.y, target.rotation.z], scale: target.scale.toArray() as DirectorVec3 };
}

function applyObject3DTransform(target: Object3D, transform: DirectorTransform) {
    target.position.set(...transform.position);
    target.rotation.set(...transform.rotation);
    target.scale.set(...transform.scale);
    target.updateMatrixWorld(true);
}

function DirectorObjectVisual({
    object,
    motion,
    previs,
    seatPelvis,
    selected,
    selectedBone,
    playhead,
    onSelectBone,
    onBoneTransform,
    onActorRigReady,
    onLoadStateChange,
}: {
    object: DirectorObject;
    motion?: PrevisMotionState;
    previs: boolean;
    seatPelvis?: DirectorVec3 | null;
    selected: boolean;
    selectedBone: string | null;
    playhead: number;
    onSelectBone: (bone: string | null) => void;
    onBoneTransform: (bone: string, rotation: DirectorQuat) => void;
    onActorRigReady: (rig: DirectorRig, animations: AnimationClip[]) => void;
    onLoadStateChange: (id: string, signal: DirectorLoadSignal, retry: () => void) => void;
}) {
    useI18n();
    if (object.stageProp) return <DirectorStageProp kind={object.stageProp} selected={selected} />;
    if (usesNeutralMannequin(object))
        return (
            <DirectorClayActor
                archetype={object.archetype || "adult"}
                motion={motion}
                actorProfile={object.actorProfile}
                pose={object.pose || "stand"}
                seatPelvis={seatPelvis}
                seatedWeight={object.poseKeyframes ? sampleDirectorSeatedWeight(object, playhead) : undefined}
                playhead={playhead}
                holdingUmbrella={object.heldProp === "folded_umbrella"}
                holdingScript={object.heldProp === "script"}
                boneOverrides={object.boneOverrides}
                boneTracks={object.boneTracks}
                selected={selected}
            />
        );
    if ((object.kind === "model" || object.kind === "actor" || object.primitive === "character") && (object.url || object.primitive === "character"))
        return <DirectorModel object={object} selected={selected} selectedBone={selectedBone} playhead={playhead} onSelectBone={onSelectBone} onBoneTransform={onBoneTransform} onActorRigReady={onActorRigReady} onLoadStateChange={onLoadStateChange} />;
    if (object.kind === "billboard" && object.url) return <DirectorBillboard object={object} selected={selected} />;
    const material = (
        <meshStandardMaterial
            userData={{ directorSelectionHighlight: true }}
            color={previs ? resolvePrevisPrimitiveColor(object) : object.color}
            {...PREVIS_MATERIAL}
            emissive={selected ? PREVIS_PALETTE.selected : PREVIS_PALETTE.shadow}
            emissiveIntensity={selected ? 0.12 : 0}
        />
    );
    return (
        <group>
            <mesh userData={{ directorPrevisColor: previs ? resolvePrevisPrimitiveColor(object) : object.color }} castShadow={object.castShadow} receiveShadow={object.receiveShadow}>
                {object.primitive === "sphere" ? (
                    <sphereGeometry args={[0.6, 32, 24]} />
                ) : object.primitive === "cylinder" ? (
                    <cylinderGeometry args={[0.5, 0.5, 1.2, 32]} />
                ) : object.primitive === "plane" ? (
                    <planeGeometry args={[1.6, 1]} />
                ) : (
                    <boxGeometry args={[1, 1, 1]} />
                )}
                {material}
            </mesh>
            {selected && (
                <mesh userData={{ directorEditorOnly: true }}>
                    {object.primitive === "sphere" ? (
                        <sphereGeometry args={[0.608, 16, 12]} />
                    ) : object.primitive === "cylinder" ? (
                        <cylinderGeometry args={[0.508, 0.508, 1.21, 16]} />
                    ) : object.primitive === "plane" ? (
                        <planeGeometry args={[1.62, 1.02]} />
                    ) : (
                        <boxGeometry args={[1.02, 1.02, 1.02]} />
                    )}
                    <meshBasicMaterial color={PREVIS_PALETTE.selected} wireframe transparent opacity={0.45} depthWrite={false} />
                </mesh>
            )}
        </group>
    );
}

function DirectorModel({
    object,
    selected,
    selectedBone,
    playhead,
    onSelectBone,
    onBoneTransform,
    onActorRigReady,
    onLoadStateChange,
}: {
    object: DirectorObject;
    selected: boolean;
    selectedBone: string | null;
    playhead: number;
    onSelectBone: (bone: string | null) => void;
    onBoneTransform: (bone: string, rotation: DirectorQuat) => void;
    onActorRigReady: (rig: DirectorRig, animations: AnimationClip[]) => void;
    onLoadStateChange: (id: string, signal: DirectorLoadSignal, retry: () => void) => void;
}) {
    useI18n();
    const actorColor = resolveDirectorActorColor(object.color);
    const [load, dispatchLoad] = useReducer(reduceDirectorLoad, directorLoadInitial);
    const loadRef = useRef(load);
    loadRef.current = load;
    const loadGeneration = load.generation;
    const modelUrl = object.kind === "actor" || object.primitive === "character" ? DIRECTOR_DEFAULT_ACTOR_URL : object.url;
    // 展示身份 = generation + 解析输入。render 阶段用它屏蔽旧资源，
    // 因此 prop/retry 变化的第一次 render 就已卸下上一代 model，随后 cleanup 才 dispose。
    const identity = directorLoadIdentity({ generation: loadGeneration, url: modelUrl, storageKey: object.storageKey, kind: object.kind });
    type LoadedModel = { model: Object3D; rig: DirectorRig; animations: AnimationClip[]; restRotations: Partial<Record<DirectorHumanoidBone, DirectorQuat>> };
    const [loaded, setLoaded] = useState<{ identity: string; value: LoadedModel } | null>(null);
    const display = resolveDirectorDisplay(loaded, identity);
    const model = display?.model ?? null;
    useDirectorSnapshotResource(identity, Boolean(model));
    const rig = display?.rig ?? null;
    const animations = display?.animations ?? emptyAnimations;
    const restRotations = display?.restRotations ?? emptyRestRotations;
    const setLoadPhase = useCallback((phase: "loading" | "ready" | "error") => {
        if (phase === "loading") dispatchLoad({ type: "start" });
        else dispatchLoad({ type: phase === "ready" ? "loaded" : "failed", generation: loadRef.current.generation });
    }, []);
    const mixerRef = useRef<AnimationMixer | null>(null);
    const ownedRef = useRef<{ model: Object3D | null; mixer: AnimationMixer | null }>({ model: null, mixer: null });
    const onActorRigReadyRef = useRef(onActorRigReady);
    const invalidate = useThree((state) => state.invalidate);
    // helper 只跟随「当前 identity 下真正要展示的 model」，不会挂在已卸下的旧 model 上。
    const helper = useMemo(() => (model ? new SkeletonHelper(model) : null), [model]);
    useEffect(() => () => disposeDirectorHelper(helper), [helper]);

    // 把 loading/error/ready 报到 DOM 层，Canvas 内部无法呈现可操作提示。
    // 依赖必须收敛到稳定原始值：object 每次场景编辑都是新引用，
    // 若挂在 [object] 上会让下面的注销 effect 每次编辑都误报 unmounted，
    // 失败模型的重试入口会随之消失。
    const objectId = object.id;
    const objectKind = directorDiagnosticObjectKind(object);
    const retryLoad = useCallback(() => {
        recordDirectorDiagnostic("DIRECTOR_MODEL_LOAD_RETRY", { objectId, objectKind, attempt: loadRef.current.generation, userInitiated: true });
        dispatchLoad({ type: "retry" });
    }, [objectId, objectKind]);
    const onLoadStateChangeRef = useRef(onLoadStateChange);
    useEffect(() => {
        onLoadStateChangeRef.current = onLoadStateChange;
    }, [onLoadStateChange]);
    useEffect(() => {
        onLoadStateChangeRef.current(object.id, load.phase, retryLoad);
    }, [load.phase, object.id, retryLoad]);

    // 卸载（删除、隐藏分支、换 URL/kind、Canvas 重建）必须注销自己，避免通知残留陈旧条目。
    // 单独 effect 且只依赖 id：phase 变化不会反复注销重登。
    useEffect(() => () => onLoadStateChangeRef.current(object.id, "unmounted", retryLoad), [object.id, retryLoad]);
    const selectedBoneObject = selectedBone && rig?.boneMap[selectedBone as DirectorHumanoidBone] ? model?.getObjectByName(rig.boneMap[selectedBone as DirectorHumanoidBone]!) : null;
    const motion = object.motionClips?.find((item) => item.id === object.activeMotionClipId);
    const activeAnimation = motion ? animations.find((item) => item.name === motion.sourceAnimation) : undefined;
    const handleModelPointerDown = useCallback(
        (event: ThreeEvent<PointerEvent>) => {
            if (!selected || !rig) return;
            let nearestBone: string | null = null;
            let nearestDistance = Number.POSITIVE_INFINITY;
            Object.entries(rig.boneMap).forEach(([bone, name]) => {
                if (!name) return;
                const target = model?.getObjectByName(name);
                if (!target) return;
                const distance = event.ray.distanceSqToPoint(target.getWorldPosition(new Vector3()));
                if (distance <= 0.12 ** 2 && distance < nearestDistance) {
                    nearestBone = bone;
                    nearestDistance = distance;
                }
            });
            if (!nearestBone) return;
            // 模型表面可能先于关节控制球被射线命中，用最近骨骼保证点击仍可选中。
            event.stopPropagation();
            onSelectBone(nearestBone);
        },
        [model, onSelectBone, rig, selected],
    );

    useEffect(() => {
        onActorRigReadyRef.current = onActorRigReady;
    }, [onActorRigReady]);

    useEffect(() => {
        const generation = loadRef.current.generation;
        let active = true;
        // render 阶段已由 identity 屏蔽旧资源；这里再清一次作为防御，不作为安全性依据。
        setLoaded(null);
        setLoadPhase("loading");
        const failLoad = () => {
            if (!active || generation !== loadRef.current.generation) return;
            // 只记录稳定码与安全枚举：URL / storageKey / 原始 error 都不落日志。
            recordDirectorDiagnostic("DIRECTOR_MODEL_LOAD_FAILED", { objectId: object.id, objectKind: directorDiagnosticObjectKind(object), attempt: generation });
            setLoadPhase("error");
        };
        const loader = new GLTFLoader();
        void resolveMediaUrl(object.storageKey, modelUrl)
            .then((url) => {
                // 解析完成时已失效：不再发起无意义的网络加载。
                if (!active || generation !== loadRef.current.generation) return;
                loader.load(
                    url,
                    (gltf) => {
                        const ownership = resolveDirectorLoadOwnership({ active, generation, currentGeneration: loadRef.current.generation });
                        if (!ownership.adopt) {
                            // 未被采纳的晚到 source 必须释放，否则孤儿泄漏。
                            if (ownership.disposeSource) disposeDirectorObject3D(gltf.scene);
                            return;
                        }
                        // 采纳流程整体包裹：clone / normalize / rig 推断 / 材质替换 / mixer /
                        // setLoaded / onActorRigReady 任一步抛错都不得逃出，也不得留下半采纳资源。
                        let clone: Object3D | null = null;
                        let mixer: AnimationMixer | null = null;
                        try {
                            // clone 与 source 共享 geometry/material/texture。
                            // 采纳后 source 的 Object3D 层级可被 GC，共享 GPU 资源由 owned clone 持有，
                            // 最终只在 clone 的 cleanup 里释放一次；这里绝不 dispose source。
                            clone = SkeletonUtils.clone(gltf.scene);
                            normalizeModel(clone, object.castShadow, object.receiveShadow);
                            const nextRig = inferDirectorRig(
                                clone,
                                gltf.animations.map((clip) => clip.name),
                            );
                            if (object.kind === "actor" || object.primitive === "character") applyActorReferenceMaterial(clone, actorColor);
                            mixer = new AnimationMixer(clone);
                            mixerRef.current = mixer;
                            ownedRef.current = { model: clone, mixer };
                            // 一次性写入带 identity 的展示记录，避免 model/rig/animations 之间出现中间态。
                            setLoaded({
                                identity,
                                value: { model: clone, rig: nextRig, animations: gltf.animations, restRotations: readRigRestRotations(clone, nextRig) },
                            });
                            setLoadPhase("ready");
                            onActorRigReadyRef.current(nextRig, gltf.animations);
                        } catch {
                            // 只记录稳定错误码：原始 error / URL / 素材正文都不落日志。
                            recordDirectorDiagnostic("DIRECTOR_MODEL_ADOPT_FAILED", { objectId: object.id, objectKind: directorDiagnosticObjectKind(object) });
                            // 先摘掉 owned 记录，避免 effect cleanup 二次释放同一批资源。
                            ownedRef.current = { model: null, mixer: null };
                            mixerRef.current = null;
                            setLoaded(null);
                            disposeDirectorAdoptionFailure({ clone, mixer, source: gltf.scene });
                            // 回到既有 error/retry/占位人偶路径。
                            failLoad();
                        }
                    },
                    undefined,
                    failLoad,
                );
            })
            // 地址解析失败与 GLTFLoader onError 走同一条 error/retry 通道。
            .catch(failLoad);
        return () => {
            active = false;
            // 替换/重试/卸载：释放本 generation 拥有的 clone 与 mixer（共享资源随之恰好释放一次）。
            const owned = ownedRef.current;
            ownedRef.current = { model: null, mixer: null };
            mixerRef.current = null;
            disposeDirectorModelResources({ model: owned.model, mixer: owned.mixer });
        };
    }, [identity, modelUrl, object.storageKey]);

    useEffect(() => {
        if (!model) return;
        model.traverse((child) => {
            const mesh = child as Mesh;
            if (!mesh.isMesh) return;
            mesh.castShadow = object.castShadow;
            mesh.receiveShadow = object.receiveShadow;
        });
        invalidate();
    }, [invalidate, model, object.castShadow, object.receiveShadow]);

    useEffect(() => {
        if (!model || (object.kind !== "actor" && object.primitive !== "character")) return;
        updateActorReferenceColor(model, actorColor);
        invalidate();
    }, [invalidate, model, object.color, object.kind]);

    useEffect(() => {
        if (!model || !mixerRef.current) return;
        const mixer = mixerRef.current;
        mixer.stopAllAction();
        if (!activeAnimation) return;
        mixer
            .clipAction(activeAnimation)
            .setLoop(motion?.loop ? LoopRepeat : LoopOnce, motion?.loop ? Infinity : 1)
            .play();
        return () => {
            mixer.stopAllAction();
        };
    }, [activeAnimation, model, motion?.loop]);

    useEffect(() => {
        if (!model || !mixerRef.current) return;
        if (activeAnimation && motion) {
            const localTime = Math.max(0, playhead - motion.start) * motion.playbackRate;
            const clipDuration = motion.duration || activeAnimation.duration;
            mixerRef.current.setTime(motion.loop && clipDuration > 0 ? localTime % clipDuration : localTime);
        }
        applyDirectorBoneTracks(model, object, playhead, rig, restRotations, Boolean(activeAnimation && motion));
        helper?.updateMatrixWorld(true);
        invalidate();
    }, [activeAnimation, helper, invalidate, model, motion, object.boneOverrides, object.boneTracks, object.pose, playhead, restRotations, rig]);

    useFrame(() => {
        if (selectedBoneObject && selected) selectedBoneObject.updateMatrixWorld(true);
    });

    if (!model)
        return (
            <DirectorClayActor
                archetype={object.archetype || "adult"}
                actorProfile={object.actorProfile}
                pose={object.pose || "stand"}
                playhead={playhead}
                holdingUmbrella={object.heldProp === "folded_umbrella"}
                holdingScript={object.heldProp === "script"}
                boneOverrides={object.boneOverrides}
                boneTracks={object.boneTracks}
                selected={selected}
            />
        );
    return (
        <group onPointerDown={handleModelPointerDown}>
            <primitive object={model} />
            {selected && selectedBone && helper ? <primitive object={helper} userData={{ directorEditorOnly: true }} /> : null}
            {selected && rig
                ? Object.entries(rig.boneMap)
                      .filter(([, name]) => Boolean(name))
                      .map(([bone, name]) => {
                          const fingerGroup = directorFingerGroup(bone);
                          const selectedFingerGroup = directorFingerGroup(selectedBone);
                          return (
                              <BoneController
                                  key={bone}
                                  bone={model.getObjectByName(name!)}
                                  selected={selectedBone === bone}
                                  dimmed={Boolean(fingerGroup && selectedFingerGroup && fingerGroup !== selectedFingerGroup)}
                                  onSelect={() => onSelectBone(bone)}
                              />
                          );
                      })
                : null}
            {selected && selectedBoneObject && selectedBone ? <DirectorBoneGizmo bone={selectedBoneObject} onCommit={(rotation) => onBoneTransform(selectedBone, rotation)} /> : null}
        </group>
    );
}

/** 骨骼 gizmo 与对象 gizmo 共用事务接线，取消时恢复骨骼 quaternion。 */
function DirectorBoneGizmo({ bone, onCommit }: { bone: Object3D; onCommit: (rotation: DirectorQuat) => void }) {
    useI18n();
    const transaction = useDirectorGizmoTransaction<DirectorQuat>({
        read: () => bone.quaternion.toArray() as DirectorQuat,
        restore: (snapshot) => {
            bone.quaternion.fromArray(snapshot);
            bone.updateMatrixWorld(true);
        },
        commit: (_from, to) => onCommit(to),
        onActive: () => undefined,
    });
    return (
        <group userData={{ directorEditorOnly: true }}>
            <TransformControls object={bone} mode="rotate" size={0.55} onMouseDown={() => transaction.begin()} onMouseUp={() => transaction.end("commit")} />
        </group>
    );
}

function BoneController({ bone, selected, dimmed, onSelect }: { bone: Object3D | undefined; selected: boolean; dimmed: boolean; onSelect: () => void }) {
    useI18n();
    const ref = useRef<Group>(null);
    const visibleRef = useRef<Mesh>(null);
    const hitRef = useRef<Mesh>(null);
    const world = useMemo(() => new Vector3(), []);
    const local = useMemo(() => new Vector3(), []);
    const cameraWorld = useMemo(() => new Vector3(), []);
    const { camera, size } = useThree();
    useFrame(() => {
        if (!bone || !ref.current) return;
        const parent = ref.current.parent;
        if (!parent) return;
        // 控制点与模型根节点是兄弟关系，必须转换到控制点父级坐标，否则点击区域会与骨骼错位。
        bone.getWorldPosition(world);
        camera.getWorldPosition(cameraWorld);
        local.copy(world);
        parent.worldToLocal(local);
        ref.current.position.copy(local);
        const distance = cameraWorld.distanceTo(world);
        const visualPixels = selected ? 5 : dimmed ? 2.5 : 3.5;
        const hitPixels = selected ? 12 : 10;
        visibleRef.current?.scale.setScalar(screenPixelsToWorldRadius(camera, distance, visualPixels, size.height));
        hitRef.current?.scale.setScalar(screenPixelsToWorldRadius(camera, distance, hitPixels, size.height));
    });
    if (!bone) return null;
    const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation();
        onSelect();
    };
    return (
        <group ref={ref} userData={{ directorEditorOnly: true }}>
            <mesh ref={visibleRef} onPointerDown={handlePointerDown} frustumCulled={false}>
                <sphereGeometry args={[1, 12, 8]} />
                <meshBasicMaterial color={selected ? PREVIS_PALETTE.selectedBone : PREVIS_PALETTE.camera} depthTest={false} transparent opacity={selected ? 1 : dimmed ? 0.14 : 0.68} />
            </mesh>
            {/* 可视点保持小尺寸，透明球只负责提供稳定的点击面积。 */}
            <mesh ref={hitRef} onPointerDown={handlePointerDown} frustumCulled={false}>
                <sphereGeometry args={[1, 8, 6]} />
                <meshBasicMaterial transparent opacity={0} depthTest={false} />
            </mesh>
        </group>
    );
}

function DirectorBillboard({ object, selected }: { object: DirectorObject; selected: boolean }) {
    useI18n();
    // 展示状态带 url 身份：只有与当前 object.url 匹配才交给 material，
    // 这样换 URL 的第一次 render 就卸下旧纹理，随后 cleanup 才 dispose。
    const [loaded, setLoaded] = useState<{ identity: string; value: Texture } | null>(null);
    const identity = object.url || "";
    const texture = resolveDirectorDisplay(loaded, identity);
    useDirectorSnapshotResource(identity, Boolean(texture));
    useEffect(() => {
        let active = true;
        let owned: Texture | null = null;
        setLoaded(null);
        const loader = new TextureLoader();
        loader.crossOrigin = "anonymous";
        loader.load(
            object.url!,
            (next) => {
                // 晚到的回调：本组件已换 URL 或卸载，直接释放这张纹理。
                if (!active) {
                    next.dispose();
                    return;
                }
                owned = next;
                setLoaded({ identity, value: next });
            },
            undefined,
            () => active && setLoaded(null),
        );
        return () => {
            active = false;
            owned?.dispose();
            owned = null;
        };
    }, [identity, object.url]);
    return (
        <mesh castShadow={object.castShadow}>
            <planeGeometry args={[1.6, 0.9]} />
            <meshBasicMaterial map={texture || undefined} color={texture ? PREVIS_PALETTE.light : selected ? PREVIS_PALETTE.selectedBone : object.color} toneMapped={false} transparent opacity={texture ? 1 : 0.6} />
        </mesh>
    );
}

function DirectorContactShadows() {
    const scene = useThree((state) => state.scene);
    const group = useRef<Group>(null);
    useLayoutEffect(() => {
        if (group.current) return installDirectorContactShadowIsolation(scene, group.current);
    }, [scene]);
    return (
        <group userData={{ directorNoMaterialOverride: true }}>
            <ContactShadows ref={group} {...PREVIS_LIGHTING.contact} resolution={directorQuality.contactResolution} smooth={directorQuality.contactSmooth} />
        </group>
    );
}

function DirectorLightView({ light: source, time }: { light: DirectorLight; time: number }) {
    useI18n();
    const light = sampleDirectorLight(source, time);
    const position = light.transform.position;
    if (light.type === "ambient") return <ambientLight color={light.color} intensity={light.intensity} />;
    if (light.type === "point") return <pointLight position={position} color={light.color} intensity={light.intensity} castShadow={light.castShadow} {...directorShadowProps} />;
    if (light.type === "spot") return <spotLight position={position} color={light.color} intensity={light.intensity} angle={light.angle} penumbra={light.penumbra} castShadow={light.castShadow} {...directorShadowProps} />;
    return <directionalLight position={position} color={light.color} intensity={light.intensity} castShadow={light.castShadow} {...directorShadowProps} shadow-radius={light.shadowRadius ?? PREVIS_LIGHTING.shadow.radius} />;
}
