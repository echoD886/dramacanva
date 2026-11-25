import { createRoot, extend } from "@react-three/fiber";
import * as THREE from "three";
import { isPrevisStandardActor } from "@/lib/canvas/previs/previs-mannequin";
import { groundPrevisScene } from "@/lib/canvas/previs/previs-grounding";
import type { PrevisScene } from "@/types/previs";
import { PREVIS_PANORAMA_LOAD_ID, PrevisSceneContent, type PrevisRendererContext } from "./previs-viewport";
import { canvasToBlob, createPrevisShotSurface, exportShotVideo } from "./previs-viewport-capture";

export type PrevisThumbnailRequest = { scene: PrevisScene; longEdge: number; viewportAspect: number };
export type PrevisReferenceRequest = PrevisThumbnailRequest & { reference: { kind: "video" } | { kind: "keyframes"; times: number[] } };

const noop = () => {};
// Use the same intrinsic scene catalogue as R3F's DOM Canvas.
extend(THREE as unknown as Parameters<typeof extend>[0]);

// Keep the renderer and its shader cache for the queued stills. Rendering to an
// explicit target skips the interactive viewport's draw and pixel readback.
const root = createRoot(new OffscreenCanvas(1, 1) as unknown as HTMLCanvasElement);
const configured = root.configure({ frameloop: "never", dpr: 1, size: { width: 1, height: 1, top: 0, left: 0 }, shadows: true, gl: { alpha: false } });

async function render({ scene: input, longEdge, viewportAspect, ...request }: PrevisThumbnailRequest | PrevisReferenceRequest) {
    await configured;
    const { scene } = groundPrevisScene(input);
    const loads = new Set(scene.objects.filter((object) => object.visible && !object.stageProp && (isPrevisStandardActor(object) || (object.url && ["model", "actor", "billboard"].includes(object.kind)))).map((object) => object.id));
    if (scene.environment?.mode === "panorama" && scene.environment.url) loads.add(PREVIS_PANORAMA_LOAD_ID);

    const context = await new Promise<PrevisRendererContext>((resolve, reject) => {
        let current: PrevisRendererContext | undefined;
        const timeout = setTimeout(() => reject(new Error("World engine thumbnail assets did not settle")), 15000);
        const complete = () => {
            if (!current || loads.size) return;
            clearTimeout(timeout);
            resolve(current);
        };
        root.render(
            <PrevisSceneContent
                key={crypto.randomUUID()}
                detached
                scene={scene}
                selectedObjectId={null}
                selectedBone={null}
                transformMode="select"
                renderMode="beauty"
                viewMode="camera"
                playhead={0}
                playing={false}
                onSelectObject={noop}
                onSelectBone={noop}
                onObjectTransform={noop}
                onBoneTransform={noop}
                onActorRigReady={noop}
                onCaptureContext={(next) => {
                    current = next;
                    complete();
                }}
                onLoadStateChange={(id, state) => {
                    if (state === "ready" || state === "error") loads.delete(id);
                    complete();
                }}
                onRelease={noop}
                onContextLost={noop}
                onContextRestored={noop}
                onGroundPoint={noop}
                onOrbitControls={noop}
            />,
        );
    });

    const source = () => ({ ...context, document: scene, playhead: 0 });
    const options = { longEdge, viewportAspect };
    const canvas = new OffscreenCanvas(1, 1);
    const reference = "reference" in request ? request.reference : undefined;
    try {
        const shot = scene.shots.find((item) => item.id === scene.activeShotId);
        if (reference?.kind === "video" && shot) return { blobs: [await exportShotVideo(source, shot.duration, shot.fps, "clay", options, canvas)] };
        const surface = createPrevisShotSurface(source, options, canvas);
        try {
            if (reference?.kind === "keyframes") {
                const blobs: Blob[] = [];
                for (const time of reference.times) blobs.push(await canvasToBlob(surface.render("clay", time)));
                return { blobs };
            }
            return { blob: await surface.render("beauty").convertToBlob({ type: "image/jpeg", quality: 0.75 }) };
        } finally {
            surface.dispose();
        }
    } finally {
        root.render(null);
    }
}

self.onmessage = ({ data }: MessageEvent<PrevisThumbnailRequest | PrevisReferenceRequest>) => {
    void render(data).then(
        (result) => self.postMessage(result),
        () => self.postMessage({}),
    );
};
