import { currentLocaleText as t } from "@/i18n/current-locale-text";
import { modelCapabilityConfigFor } from "@/lib/model-capabilities";
import { DirectorReferenceError, directorAppearanceReferences, planDownstreamReference, splitPrevisForDownstream, type DownstreamPrevisGroup } from "@/lib/canvas/director/director-downstream";
import { blobToDataUrl } from "@/services/api/video-response";
import { directorToWorldEngine } from "@/lib/canvas/director/director-world-engine";
import { savedWorldEngineShot } from "@/lib/canvas/director/director-shot-state";
import { PREVIS_ASPECT_RATIOS, PREVIS_DEFAULT_ASPECT_RATIO } from "@/lib/canvas/previs/previs-optics";
import { worldEngineText } from "@/i18n/world-engine-text";
import type { PrevisScene } from "@/types/previs";
import type { AiConfig } from "@/stores/use-config-store";
import type { DirectorScene } from "@/types/director";
import type { ReferenceImage } from "@/types/image";
import type { ReferenceVideo } from "@/types/media";
import type { NodeGenerationContext } from "@/components/canvas/canvas-node-generation";
import type { CanvasNodeMetadata } from "@/types/canvas";

type ReferenceRenderOptions = { maxDimension: number; signal?: AbortSignal };
type WorldRecording = CanvasNodeMetadata["directorWorldRecording"];
type DownstreamDependencies = {
    exportVideo: (scene: DirectorScene, group: DownstreamPrevisGroup, options: ReferenceRenderOptions) => Promise<Blob>;
    captureKeyframes: (scene: DirectorScene, frames: number[], options: ReferenceRenderOptions) => Promise<Blob[]>;
    toDataUrl: (blob: Blob) => Promise<string>;
    readRecording: (storageKey: string) => Promise<Blob | null | undefined>;
    renderWorld?: typeof import("@/components/canvas/previs/previs-thumbnail-jobs").renderWorldEngineReference;
};

const dependencies: DownstreamDependencies = {
    exportVideo: async (scene, frameRange, options) => {
        const { exportDirectorPrevis } = await import("@/components/canvas/director/director-background-recorder");
        return (await exportDirectorPrevis(scene, { ...options, frameRange })).video;
    },
    captureKeyframes: async (scene, frames, options) => {
        const { captureDirectorPrevisFrames } = await import("@/components/canvas/director/director-background-recorder");
        return captureDirectorPrevisFrames(scene, frames, options);
    },
    toDataUrl: blobToDataUrl,
    readRecording: async (storageKey) => {
        const { getMediaBlob } = await import("@/services/file-storage");
        return getMediaBlob(storageKey);
    },
};

export type PreparedDirectorReference = {
    group: DownstreamPrevisGroup;
    plan: ReturnType<typeof planDownstreamReference>;
    prompt: string;
    config: AiConfig;
    referenceImages: ReferenceImage[];
    referenceVideos: ReferenceVideo[];
    appearances: ReturnType<typeof directorAppearanceReferences>;
    firstFrameNodeId?: string;
};

export function applyDirectorDownstreamReference(context: NodeGenerationContext, reference: PreparedDirectorReference, excludedIds: string[]): NodeGenerationContext {
    const excluded = new Set(excludedIds);
    if (reference.firstFrameNodeId) {
        for (const image of context.referenceImages) if (image.id !== reference.firstFrameNodeId) excluded.add(image.id);
        for (const video of context.referenceVideos) excluded.add(video.id);
    }
    const referenceImages = [...context.referenceImages.filter((item) => !excluded.has(item.id)), ...reference.referenceImages];
    const referenceVideos = [...context.referenceVideos.filter((item) => !excluded.has(item.id)), ...reference.referenceVideos];
    if (reference.firstFrameNodeId && !referenceImages.some((image) => image.id === reference.firstFrameNodeId)) throw new DirectorReferenceError(worldEngineText("worldEngine.firstFrameRequired"));
    const referenceLabels = reference.firstFrameNodeId
        ? "@图片1"
        : [...reference.referenceImages.map((image) => `@图片${referenceImages.indexOf(image) + 1}`), ...reference.referenceVideos.map((video) => `@视频${referenceVideos.indexOf(video) + 1}`)].join("、");
    // 旧整段白模被替换后，保留下来的外观/场景引用编号也会移动，必须同步改写提示词。
    const prompt = context.prompt.replace(/@(图片|视频)(\d+)(?!\d)/gu, (token, kind: string, number: string) => {
        const original = (kind === "图片" ? context.referenceImages : context.referenceVideos)[Number(number) - 1];
        if (!original) return token;
        if (excluded.has(original.id)) return referenceLabels;
        const index = (kind === "图片" ? referenceImages : referenceVideos).findIndex((item) => item.id === original.id);
        return `@${kind}${index + 1}`;
    });
    const characterReferences = reference.firstFrameNodeId ? [] : [...context.characterReferences];
    for (const appearance of reference.appearances) {
        if (!appearance.characterAssetId || referenceImages.some((image) => image.id === appearance.referenceNodeId) || characterReferences.some((item) => item.assetId === appearance.characterAssetId)) continue;
        characterReferences.push({ nodeId: appearance.referenceNodeId || appearance.actorId, assetId: appearance.characterAssetId, requestedVersionId: appearance.characterVersionId });
    }
    return {
        ...context,
        prompt: [prompt, reference.firstFrameNodeId ? worldEngineText("worldEngine.firstFrameReference", { reference: referenceLabels }) : t("directorDownstream.reference", { reference: referenceLabels })].filter(Boolean).join("\n"),
        referenceImages,
        referenceVideos,
        characterReferences,
        imageCount: referenceImages.length,
        videoCount: referenceVideos.length,
    };
}

/** 这里只准备参考；报价、任务创建和版本保存继续由画布生成器负责。 */
export async function prepareDirectorDownstreamReferences(
    input: {
        scene: DirectorScene;
        config: AiConfig;
        shotId?: string;
        recording?: WorldRecording;
        firstFrameNodeId?: string;
        segmentIds?: string[];
        signal?: AbortSignal;
        assertCurrent: () => void;
        onDiagnostic?: (message: string) => void;
    },
    api: DownstreamDependencies = dependencies,
): Promise<PreparedDirectorReference[]> {
    const scene = structuredClone(input.scene);
    const shotId = input.shotId || scene.activeShotId;
    if (!scene.previs || savedWorldEngineShot(scene, shotId)) return prepareWorldEngineReference({ ...input, scene, shotId }, api);
    const capability = modelCapabilityConfigFor(input.config, input.config.model).video;
    if (!capability) throw new Error(t("productionFeedback.configureVideo"));
    const allGroups = splitPrevisForDownstream(scene.previs);
    const groups = input.segmentIds ? allGroups.filter((group) => JSON.stringify(group.segmentIds) === JSON.stringify(input.segmentIds)) : allGroups;
    if (!groups.length) throw new Error(t("directorDownstream.changed"));
    const plans = groups.map((group) => planDownstreamReference(group, capability, input.config.vquality || capability.defaultResolution));
    for (const plan of plans) {
        plan.diagnostics.forEach((message) => input.onDiagnostic?.(message));
        if (capability.resolutions.length && !capability.resolutions.includes(plan.resolution)) throw new Error(t("directorDownstream.resolutionUnsupported"));
        // 不把原时长对齐到模型枚举或步长；否则报价和提交会描述另一段视频。
        if (!plan.durationAllowed) throw new Error(t("directorDownstream.durationUnsupported", { seconds: plan.durationSec }));
        if (plan.kind === "keyframes" && capability.references.maxImages < 3) throw new Error(t("creationRuntime.referenceLimit"));
    }
    const [{ compilePrevisToDirectorShots }, { compileDirectorPrompt }] = await Promise.all([import("@/lib/canvas/director/director-sequence-compiler"), import("@/lib/canvas/director/director-prompt-compiler")]);
    const compiled = compilePrevisToDirectorShots(scene, scene.previs);
    if (compiled.diagnostics.length) throw new Error(compiled.diagnostics.map((item) => item.message).join("\n"));
    const appearances = directorAppearanceReferences(scene);
    const prepared: PreparedDirectorReference[] = [];
    for (const plan of plans) {
        input.signal?.throwIfAborted();
        input.assertCurrent();
        const group = groups[prepared.length];
        const [aspectWidth, aspectHeight] = scene.previs.aspect.split(":").map(Number);
        const resolution = plan.resolution === "4k" ? 2160 : plan.resolution === "2k" ? 1440 : Number.parseInt(plan.resolution) || 720;
        const options = { maxDimension: Math.round(resolution * Math.max(aspectWidth / aspectHeight, aspectHeight / aspectWidth)), signal: input.signal };
        const referenceImages: ReferenceImage[] = [];
        const referenceVideos: ReferenceVideo[] = [];
        if (plan.kind === "video") {
            const video = await api.exportVideo(scene, group, options);
            referenceVideos.push({
                id: `previs-${scene.id}-${group.startFrame}-${group.endFrameExclusive}`,
                name: `${t("directorD4.generate")}.mp4`,
                type: video.type,
                url: await api.toDataUrl(video),
                bytes: video.size,
                durationMs: group.durationSec * 1000,
            });
        } else {
            const images = await api.captureKeyframes(scene, plan.keyframeFrames, options);
            if (images.length !== 3) throw new Error(t("directorDownstream.keyframesIncomplete"));
            for (const [index, image] of images.entries())
                referenceImages.push({ id: `previs-${scene.id}-${plan.keyframeFrames[index]}-${index}`, name: `previs-${plan.keyframeFrames[index]}.png`, type: image.type, dataUrl: await api.toDataUrl(image), bytes: image.size });
        }
        input.signal?.throwIfAborted();
        input.assertCurrent();
        const prompt = group.segmentIds
            .map((id) => {
                const segment = compiled.scene.previs!.segments.find((item) => item.id === id)!;
                const shot = compiled.scene.shots.find((item) => item.id === segment.shotId)!;
                return compileDirectorPrompt(compiled.scene, shot);
            })
            .join("\n\n");
        prepared.push({ group, plan, prompt, config: { ...input.config, videoSeconds: String(group.durationSec), size: scene.previs.aspect, vquality: plan.resolution }, referenceImages, referenceVideos, appearances });
    }
    return prepared;
}

async function prepareWorldEngineReference(
    input: { scene: DirectorScene; shotId: string; recording?: WorldRecording; firstFrameNodeId?: string; config: AiConfig; segmentIds?: string[]; signal?: AbortSignal; assertCurrent: () => void; onDiagnostic?: (message: string) => void },
    api: DownstreamDependencies,
): Promise<PreparedDirectorReference[]> {
    const world: PrevisScene = directorToWorldEngine({ ...input.scene, activeShotId: input.shotId });
    const shot = world.shots.find((item) => item.id === input.shotId);
    if (!shot || (input.segmentIds && (input.segmentIds.length !== 1 || input.segmentIds[0] !== shot.id))) throw new DirectorReferenceError(t("directorDownstream.changed"));
    const capability = modelCapabilityConfigFor(input.config, input.config.model).video;
    if (!capability) throw new DirectorReferenceError(t("productionFeedback.configureVideo"));
    const size = shot.aspectRatio && shot.aspectRatio !== "auto" ? shot.aspectRatio : input.config.size || PREVIS_DEFAULT_ASPECT_RATIO;
    const aspect = PREVIS_ASPECT_RATIOS.find((option) => option.value === size && option.ratio);
    if (!aspect?.ratio || (capability.ratios.length && !capability.ratios.includes(size))) throw new DirectorReferenceError(worldEngineText("worldEngine.aspectUnsupported", { ratio: size }));
    shot.aspectRatio = aspect.value;
    const appearances = directorAppearanceReferences(world);
    const appearanceCount = new Set(appearances.map((item) => item.referenceNodeId || item.characterAssetId)).size;
    const group = { startFrame: 0, endFrameExclusive: Math.round(shot.duration * shot.fps), segmentIds: [shot.id], durationSec: shot.duration };
    const maxImages = Math.min(capability.references.maxImages, capability.operations.includes("reference_to_video") ? Infinity : 2);
    const videoCapability = capability.operations.includes("reference_to_video") ? capability : { ...capability, references: { ...capability.references, maxVideos: 0 } };
    const plan = planDownstreamReference(group, videoCapability, input.config.vquality || capability.defaultResolution);
    if (capability.resolutions.length && !capability.resolutions.includes(plan.resolution)) throw new DirectorReferenceError(t("directorDownstream.resolutionUnsupported"));
    if (!plan.durationAllowed) throw new DirectorReferenceError(t("directorDownstream.durationUnsupported", { seconds: group.durationSec }));
    const config = { ...input.config, videoSeconds: String(shot.duration), size, vquality: plan.resolution };
    const { compilePrevisPrompt } = await import("@/lib/canvas/previs/previs-prompt-compiler");
    const prompt = compilePrevisPrompt(world, shot);
    if (plan.kind === "keyframes") {
        const available = maxImages - appearanceCount;
        if (input.firstFrameNodeId && capability.operations.includes("image_to_video") && maxImages >= 1) {
            return [{ group, plan, prompt, config, referenceImages: [], referenceVideos: [], appearances: [], firstFrameNodeId: input.firstFrameNodeId }];
        }
        if (appearanceCount && (available < 1 || !capability.operations.includes("reference_to_video") || maxImages < 3)) throw new DirectorReferenceError(worldEngineText("worldEngine.firstFrameRequired"));
        if (available < 1) throw new DirectorReferenceError(t("creationRuntime.referenceLimit"));
        const last = group.endFrameExclusive - 1;
        plan.keyframeFrames = [...new Set(available === 1 ? [0] : available === 2 ? [0, last] : [0, Math.floor(group.endFrameExclusive / 2), last])];
    } else if (appearanceCount > capability.references.maxImages) throw new DirectorReferenceError(t("creationRuntime.referenceLimit"));
    plan.diagnostics.forEach((message) => input.onDiagnostic?.(message));
    const recording = input.recording;
    if (plan.kind === "video" && recording?.shotId === shot.id && recording.sceneUpdatedAt === world.updatedAt) {
        const blob = await api.readRecording(recording.storageKey).catch(() => null);
        input.signal?.throwIfAborted();
        input.assertCurrent();
        if (blob?.size && (!capability.references.maxVideoBytes || blob.size <= capability.references.maxVideoBytes)) {
            const video = { id: `previs-${shot.id}-recording`, name: `${t("directorD4.generate")}.mp4`, type: blob.type || "video/mp4", url: "", storageKey: recording.storageKey, bytes: blob.size, durationMs: shot.duration * 1000 };
            return [{ group, plan, prompt, config, referenceImages: [], referenceVideos: [video], appearances }];
        }
    }
    const pixels = plan.resolution === "4k" ? 2160 : plan.resolution === "2k" ? 1440 : Number.parseInt(plan.resolution) || 720;
    const longEdge = Math.round(pixels * Math.max(aspect.ratio, 1 / aspect.ratio));
    const renderWorld = api.renderWorld ?? (await import("@/components/canvas/previs/previs-thumbnail-jobs")).renderWorldEngineReference;
    input.assertCurrent();
    const blobs = await renderWorld(world, longEdge, plan.kind === "video" ? { kind: "video" } : { kind: "keyframes", times: plan.keyframeFrames.map((frame) => frame / shot.fps) }, input.signal);
    input.signal?.throwIfAborted();
    input.assertCurrent();
    const expected = plan.kind === "video" ? 1 : plan.keyframeFrames.length;
    if (blobs.length !== expected) throw new DirectorReferenceError(t("directorDownstream.keyframesIncomplete"));
    const references = await Promise.all(blobs.map(async (blob, index) => ({ id: `previs-${shot.id}-${index}`, type: blob.type, bytes: blob.size, url: await api.toDataUrl(blob) })));
    return [
        {
            group,
            plan,
            prompt,
            config,
            referenceImages: plan.kind === "keyframes" ? references.map(({ url, ...image }) => ({ ...image, name: `${t("directorD4.generate")}.png`, dataUrl: url })) : [],
            referenceVideos: plan.kind === "video" ? references.map((video) => ({ ...video, name: `${t("directorD4.generate")}.mp4`, durationMs: shot.duration * 1000 })) : [],
            appearances,
        },
    ];
}
