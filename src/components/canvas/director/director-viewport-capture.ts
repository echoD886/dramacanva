import { currentLocaleText as t } from "@/i18n/current-locale-text";
// 预演台画面截帧与预演录制（MediaRecorder），以及录制时长探测。

import { type DirectorRenderMode, type DirectorScene } from "@/types/director";
import { MeshBasicMaterial, MeshDepthMaterial, MeshNormalMaterial, WebGLRenderTarget, HalfFloatType, type Camera, type Scene, type Object3D, type Mesh, type MeshStandardMaterial, type Material } from "three";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { applyClaySceneMaterials } from "@/lib/canvas/director/director-clay-materials";
import { warnShotCameraFallbackOnce } from "@/lib/canvas/director/director-shot-camera";
import { buildFrozenSceneFromSnapshot, type PrevisFrameSnapshot } from "@/lib/canvas/director/director-previs-evaluate";
import type { CaptureContext, DirectorViewportHandle } from "./director-viewport";

export async function renderDirectorPrevisFrame({
    scene,
    snapshot,
    width,
    height,
    prepare,
    signal,
}: {
    scene: DirectorScene;
    snapshot: PrevisFrameSnapshot;
    width: number;
    height: number;
    prepare: (scene: DirectorScene, playhead: number) => Promise<Pick<DirectorViewportHandle, "isReady" | "capture">>;
    signal?: AbortSignal;
}) {
    signal?.throwIfAborted();
    const frozen = buildFrozenSceneFromSnapshot(scene, snapshot);
    const viewport = await prepare(frozen, snapshot.animationTime);
    signal?.throwIfAborted();
    if (!viewport.isReady()) throw new Error(t("previs.export.notReady"));
    return viewport.capture("clay", { width, height });
}

/** Read the preserved display buffer without changing its camera or materials. */
export async function captureViewportSnapshot(context: CaptureContext | null) {
    if (!context) throw new Error(t("canvasExtra.directorVP.viewportNotReady"));
    return canvasToBlob(context.gl.domElement);
}

export async function captureFrame(context: CaptureContext | null, mode: DirectorRenderMode, size?: { width: number; height: number }) {
    if (!context) throw new Error(t("canvasExtra.directorVP.viewportNotReady"));
    const { gl, scene, camera } = context;
    const resumeDisplayMaterialOverride = context.suspendDisplayMaterialOverride();
    const previous = scene.overrideMaterial;
    const override = mode === "depth" ? new MeshDepthMaterial() : mode === "normal" ? new MeshNormalMaterial() : mode === "pose" ? new MeshBasicMaterial({ color: "#ffffff", wireframe: true }) : null;
    const restoreClayMaterials = mode === "clay" ? applyClaySceneMaterials(scene) : null;
    try {
        scene.overrideMaterial = override;
        const output = createDirectorOutputSurface(context, size);
        try {
            output.render();
            return await canvasToBlob(output.canvas);
        } finally {
            output.dispose();
        }
    } finally {
        scene.overrideMaterial = previous;
        restoreClayMaterials?.();
        override?.dispose();
        resumeDisplayMaterialOverride();
        gl.render(scene, camera);
    }
}

export async function recordCanvas(context: CaptureContext | null, duration: number, fps: number, maxDimension?: number) {
    if (!context) throw new Error(t("canvasExtra.directorVP.viewportNotReady"));
    if (!context.gl.domElement.captureStream || typeof MediaRecorder === "undefined") throw new Error(t("canvasExtra.directorVP.recordingUnsupported"));
    const resumeDisplayMaterialOverride = context.suspendDisplayMaterialOverride();
    const previousMaterial = context.scene.overrideMaterial;
    const restoreClayMaterials = applyClaySceneMaterials(context.scene);
    context.scene.overrideMaterial = null;
    let outputSurface: ReturnType<typeof createDirectorOutputSurface> | undefined;
    let streamResource: MediaStream | undefined;
    try {
        const aspect = context.shotCamera.aspect;
        const size = maxDimension ? { width: Math.round(aspect >= 1 ? maxDimension : maxDimension * aspect), height: Math.round(aspect >= 1 ? maxDimension / aspect : maxDimension) } : undefined;
        const output = (outputSurface = createDirectorOutputSurface(context, size));
        output.render();
        const stream = (streamResource = output.canvas.captureStream(fps));
        const mimeType = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((type) => MediaRecorder.isTypeSupported(type)) || "";
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        const chunks: Blob[] = [];
        // captureStream 依赖渲染循环持续产出新帧；循环里任何未捕获异常都会让剩余录制变成空帧，
        // 与其 5 秒后静默产出残缺视频回写画布，不如捕获到首个错误就立刻中止并报错。
        let renderError: Error | null = null;
        const onRenderError = () => {
            renderError ??= new Error(t("previs.v165.message246"));
            if (recorder.state !== "inactive") recorder.stop();
        };
        window.addEventListener("error", onRenderError);
        const result = new Promise<Blob>((resolve, reject) => {
            recorder.ondataavailable = (event) => {
                if (event.data.size) chunks.push(event.data);
            };
            recorder.onerror = () => reject(new Error(t("canvasExtra.directorVP.clayRecordFailed")));
            recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || "video/webm" }));
        });
        let renderFrame = 0;
        const render = () => {
            try {
                output.render();
                if (recorder.state !== "inactive") renderFrame = requestAnimationFrame(render);
            } catch {
                onRenderError();
            }
        };
        let stopTimer = 0;
        try {
            recorder.start(250);
            renderFrame = requestAnimationFrame(render);
            stopTimer = window.setTimeout(
                () => {
                    if (recorder.state !== "inactive") recorder.stop();
                },
                Math.max(250, duration * 1000 + 120),
            );
            const blob = await result;
            if (renderError) throw renderError;
            const recorded = await probeRecordedDuration(blob);
            if (!Number.isFinite(recorded) || recorded < Math.max(0.25, duration * 0.8)) throw new Error(t("previs.v165.message247"));
            return blob;
        } finally {
            window.clearTimeout(stopTimer);
            cancelAnimationFrame(renderFrame);
            window.removeEventListener("error", onRenderError);
            if (recorder.state !== "inactive") recorder.stop();
        }
    } finally {
        streamResource?.getTracks().forEach((track) => track.stop());
        outputSurface?.dispose();
        restoreClayMaterials();
        context.scene.overrideMaterial = previousMaterial;
        resumeDisplayMaterialOverride();
        context.gl.render(context.scene, context.camera);
    }
}

/** Output is independent of the editor's camera, viewport dimensions and display buffer. */
export function createDirectorOutputSurface(context: CaptureContext, size?: { width: number; height: number }) {
    const info = context.shotCameraInfo;
    if (info) warnShotCameraFallbackOnce(info.sceneId, info.shotId, info.source);
    const aspect = context.shotCamera.aspect;
    const width = size?.width || Math.round(aspect >= 1 ? 1280 : 1280 * aspect);
    const height = size?.height || Math.round(aspect >= 1 ? 1280 / aspect : 1280);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error(t("canvasExtra.directorVP.previewExportFailed"));
    const target = new WebGLRenderTarget(width, height, { type: HalfFloatType });
    const displayTarget = new WebGLRenderTarget(width, height);
    const outputPass = new OutputPass();
    const buffer = new Uint8Array(width * height * 4);
    const pixels = ctx.createImageData(width, height);
    return {
        canvas,
        render(camera: Camera = context.shotCamera, view: "export" | "monitor" = "export") {
            const previous = context.gl.getRenderTarget();
            const restoreOverlays = suspendDirectorEditorOverlays(context.scene, view === "monitor");
            try {
                context.gl.setRenderTarget(target);
                camera.updateMatrixWorld(true);
                context.gl.render(context.scene, camera);
                // Three render targets are linear; apply the renderer's display tone mapping and transfer.
                outputPass.render(context.gl, displayTarget, target, 0, false);
                context.gl.readRenderTargetPixels(displayTarget, 0, 0, width, height, buffer);
                for (let y = 0; y < height; y++) pixels.data.set(buffer.subarray((height - 1 - y) * width * 4, (height - y) * width * 4), y * width * 4);
                ctx.putImageData(pixels, 0, 0);
            } finally {
                restoreOverlays();
                context.gl.setRenderTarget(previous);
            }
        },
        dispose: () => {
            outputPass.dispose();
            target.dispose();
            displayTarget.dispose();
        },
    };
}

export function suspendDirectorEditorOverlays(scene: Scene, keepGrid = false) {
    const hidden: Object3D[] = [];
    const highlights: Array<{ material: MeshStandardMaterial; intensity: number }> = [];
    const visited = new Set<Material>();
    scene.traverse((object) => {
        if (object.visible && ((object.userData.directorEditorOnly && !(keepGrid && object.userData.directorGroundGrid)) || (object as Object3D & { isTransformControlsRoot?: boolean }).isTransformControlsRoot)) {
            hidden.push(object);
            object.visible = false;
        }
        const mesh = object as Mesh;
        if (mesh.isMesh) {
            for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
                const standard = material as MeshStandardMaterial;
                if (!standard.isMeshStandardMaterial || !standard.userData.directorSelectionHighlight || visited.has(material)) continue;
                visited.add(material);
                highlights.push({ material: standard, intensity: standard.emissiveIntensity });
                standard.emissiveIntensity = 0;
            }
        }
    });
    return () => {
        hidden.forEach((object) => {
            object.visible = true;
        });
        highlights.forEach(({ material, intensity }) => {
            material.emissiveIntensity = intensity;
        });
    };
}

/** 接触阴影在截帧前已烘焙：必须在其深度通道就排除编辑辅助物。 */
export function installDirectorContactShadowIsolation(scene: Scene, contactGroup: Object3D) {
    const before = scene.onBeforeRender;
    const after = scene.onAfterRender;
    let restore: (() => void) | undefined;
    const onBefore: typeof before = function (...args) {
        if (args[2].parent === contactGroup) restore = suspendDirectorEditorOverlays(scene);
        before.apply(scene, args);
    };
    const onAfter: typeof after = function (...args) {
        if (args[2].parent === contactGroup) {
            restore?.();
            restore = undefined;
        }
        after.apply(scene, args);
    };
    scene.onBeforeRender = onBefore;
    scene.onAfterRender = onAfter;
    return () => {
        restore?.();
        if (scene.onBeforeRender === onBefore) scene.onBeforeRender = before;
        if (scene.onAfterRender === onAfter) scene.onAfterRender = after;
    };
}

export async function probeRecordedDuration(blob: Blob) {
    // Chrome MediaRecorder 产出的 webm 不带时长头，loaded metadata 时 duration 是 Infinity，
    // 只有 seek 到末尾触发收尾后 duration 才是真实值；这是校验录制完整性的唯一途径。
    const url = URL.createObjectURL(blob);
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "metadata";
    try {
        video.src = url;
        await new Promise<void>((resolve, reject) => {
            video.onloadedmetadata = () => resolve();
            video.onerror = () => reject(new Error(t("previs.v165.message248")));
        });
        if (video.duration !== Infinity) return video.duration;
        await new Promise<void>((resolve) => {
            const finish = () => {
                video.removeEventListener("seeked", finish);
                resolve();
            };
            video.addEventListener("seeked", finish);
            video.currentTime = 1e6;
            window.setTimeout(finish, 1000);
        });
        return video.duration;
    } finally {
        URL.revokeObjectURL(url);
    }
}

export function canvasToBlob(canvas: HTMLCanvasElement) {
    return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error(t("canvasExtra.directorVP.previewExportFailed")))), "image/png"));
}
