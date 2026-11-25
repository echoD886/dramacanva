import { useEffect, useRef, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type { DirectorScene } from "@/types/director";
import { DirectorViewport, type DirectorViewportHandle } from "./director-viewport";
import { directorSceneForShot } from "@/lib/canvas/director/director-storyboard";
import { currentLocaleText as t } from "@/i18n/current-locale-text";
import { encodeDirectorFrames, exportPrevisSequence, type PrevisExportProgress } from "@/lib/canvas/director/director-previs-export";
import { resolveDirectorAspectRatio } from "@/lib/canvas/director/director-scene-data";
import { renderDirectorPrevisFrame } from "./director-viewport-capture";
import { evaluatePrevisFrame, evaluatePrevisFrameMotions } from "@/lib/canvas/director/director-previs-evaluate";

const noop = () => {};
let queue: Promise<unknown> = Promise.resolve();

/** Detached local rendering survives closing the editor; serialize to one WebGL recording. */
export function recordDirectorPrevis(scene: DirectorScene, shotId: string): Promise<Blob> {
    return exportDirectorPrevis(scene, { shotId, maxDimension: 480 }).then((output) => output.video);
}

function renderDetachedDirector<T>(render: (finish: (result?: T, error?: unknown) => void) => ReactNode): Promise<T> {
    const record = () =>
        new Promise<T>((resolve, reject) => {
            const host = document.createElement("div");
            host.style.cssText = "position:fixed;left:-10000px;top:0;width:480px;height:480px;pointer-events:none";
            host.setAttribute("aria-hidden", "true");
            document.body.append(host);
            const root = createRoot(host);
            const finish = (result?: T, error?: unknown) => {
                setTimeout(() => {
                    root.unmount();
                    host.remove();
                }, 0);
                if (result) resolve(result);
                else reject(error);
            };
            root.render(render(finish));
        });
    const pending = queue.then(record, record);
    queue = pending.catch(noop);
    return pending;
}

type PrevisExportOptions = { shotId?: string; duration?: number; fps?: number; maxDimension?: number; signal?: AbortSignal; onProgress?: (progress: PrevisExportProgress) => void; frameRange?: { startFrame: number; endFrameExclusive: number } };
type PrevisExportResult = { video?: Blob; images: Blob[] };
type ExportFrameRequest = {
    scene: DirectorScene;
    playhead: number;
    actorMotion?: ReturnType<typeof evaluatePrevisFrameMotions>;
    resolve: (viewport: DirectorViewportHandle) => void;
    reject: (error: unknown) => void;
};

export function exportDirectorPrevis(scene: DirectorScene, options: PrevisExportOptions = {}): Promise<{ video: Blob; beauty: Blob }> {
    options.signal?.throwIfAborted();
    const frozenInput = structuredClone(scene);
    return renderDetachedDirector<PrevisExportResult>((finish) => <PrevisRecorder scene={frozenInput} options={options} finish={finish} />).then((result) => ({ video: result.video!, beauty: result.images[0] }));
}

export function captureDirectorPrevisFrames(scene: DirectorScene, frames: number[], options: PrevisExportOptions = {}): Promise<Blob[]> {
    options.signal?.throwIfAborted();
    const frozenInput = structuredClone(scene);
    return renderDetachedDirector<PrevisExportResult>((finish) => <PrevisRecorder scene={frozenInput} options={options} frames={frames} finish={finish} />).then((result) => result.images);
}

function PrevisRecorder({ scene, options, frames, finish }: { scene: DirectorScene; options: PrevisExportOptions; frames?: number[]; finish: (result?: PrevisExportResult, error?: unknown) => void }) {
    const viewport = useRef<DirectorViewportHandle>(null);
    const [request, setRequest] = useState<ExportFrameRequest>();
    const [controller] = useState(() => new AbortController());
    useEffect(() => {
        let active = true;
        const abort = () => controller.abort(options.signal?.reason);
        options.signal?.addEventListener("abort", abort, { once: true });
        if (options.signal?.aborted) abort();
        const run = async () => {
            try {
                controller.signal.throwIfAborted();
                const shotId = options.shotId ?? scene.activeShotId;
                const shot = scene.shots.find((item) => item.id === shotId);
                if (!scene.previs && !shot) throw new Error(t("previs.export.noSequence"));
                const aspect = resolveDirectorAspectRatio(scene.previs?.aspect ?? shot?.aspectRatio);
                const maxDimension = options.maxDimension ?? 1280;
                const width = Math.max(2, Math.floor((aspect >= 1 ? maxDimension : maxDimension * aspect) / 2) * 2);
                const height = Math.max(2, Math.floor((aspect >= 1 ? maxDimension / aspect : maxDimension) / 2) * 2);
                const images: Blob[] = [];
                const prepare = (scene: DirectorScene, playhead: number, actorMotion?: ExportFrameRequest["actorMotion"]) => new Promise<DirectorViewportHandle>((resolve, reject) => setRequest({ scene, playhead, actorMotion, resolve, reject }));
                const renderFrame = async (snapshot: ReturnType<typeof evaluatePrevisFrame>) =>
                    renderDirectorPrevisFrame({
                        scene,
                        snapshot,
                        width,
                        height,
                        signal: controller.signal,
                        prepare: (frozen, time) => prepare(frozen, time, evaluatePrevisFrameMotions(scene, scene.previs!, snapshot.frameIndex)),
                    });
                const stage = !scene.previs && shot ? directorSceneForShot(scene, shotId) : undefined;
                const fps = options.fps ?? shot?.fps ?? 24;
                const renderShotFrame = async (index: number) => {
                    if (!stage) throw new Error(t("previs.export.noSequence"));
                    const viewport = await prepare(stage, index / fps);
                    return viewport.capture("clay", { width, height });
                };
                if (frames) {
                    for (const frame of frames) {
                        images.push(scene.previs ? await renderFrame(evaluatePrevisFrame(scene, scene.previs, frame)) : await renderShotFrame(frame));
                    }
                    controller.signal.throwIfAborted();
                    if (active) finish({ images });
                    return;
                }
                const { createPrevisSequenceEncoder } = await import("@/lib/canvas/canvas-video-merge");
                const encoding = {
                    width,
                    height,
                    frameRange: options.frameRange,
                    signal: controller.signal,
                    onProgress: options.onProgress,
                    encoder: createPrevisSequenceEncoder(),
                };
                const rememberFirst = async (image: Promise<Blob>) => {
                    const png = await image;
                    if (!images.length) images.push(png);
                    return png;
                };
                let video: Blob;
                if (scene.previs) {
                    video = await exportPrevisSequence({
                        ...encoding,
                        scene,
                        sequence: scene.previs,
                        renderFrame: (snapshot) => rememberFirst(renderFrame(snapshot)),
                    });
                } else {
                    const duration = options.duration ?? shot!.duration;
                    video = await encodeDirectorFrames({
                        ...encoding,
                        fps,
                        sequenceFrames: Math.max(1, Math.round(fps * duration)),
                        renderFrame: (index) => rememberFirst(renderShotFrame(index)),
                    });
                }
                if (active) finish({ video, images });
            } catch (error) {
                if (active) finish(undefined, error);
            }
        };
        void run();
        return () => {
            active = false;
            options.signal?.removeEventListener("abort", abort);
            controller.abort();
        };
    }, [scene, options, frames, finish, controller]);
    useEffect(() => {
        if (!request) return;
        let timer: ReturnType<typeof setTimeout>;
        let attempts = 0;
        const abort = () => request.reject(controller.signal.reason);
        const wait = () => {
            if (controller.signal.aborted) return abort();
            if (viewport.current?.isReady()) return request.resolve(viewport.current);
            if (++attempts >= 150) return request.reject(new Error(t("previs.export.notReady")));
            timer = setTimeout(wait, 100);
        };
        controller.signal.addEventListener("abort", abort, { once: true });
        wait();
        return () => {
            clearTimeout(timer);
            controller.signal.removeEventListener("abort", abort);
        };
    }, [request, controller]);
    if (!request) return null;
    return (
        <DirectorViewport
            ref={viewport}
            scene={request.scene}
            actorMotion={request.actorMotion}
            selectedObjectId={null}
            selectedBone={null}
            transformMode="translate"
            renderMode="clay"
            playhead={request.playhead}
            playing={false}
            showMotionPaths={false}
            viewMode="camera"
            showNavigation={false}
            showModelLoadNotice={false}
            onSelectObject={noop}
            onSelectBone={noop}
            onObjectTransform={noop}
            onBoneTransform={noop}
            onActorRigReady={noop}
        />
    );
}
