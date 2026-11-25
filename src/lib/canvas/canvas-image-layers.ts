import { currentLocaleText as upstreamText } from "@/i18n/current-locale-text";
import { configuredModelMatchesCapability, resolveModelRequestConfig, type AiConfig } from "@/stores/use-config-store";
import { modelCapabilityConfigFor } from "@/lib/model-capabilities";
import type { CanvasNodeData, CanvasNodeMetadata } from "@/types/canvas";

export const LAYER_DECOMPOSITION_PROTOCOL = "image-tools-layer-decomposition";
export const MAX_IMAGE_LAYERS = 32;
export const MAX_LAYER_PIXELS = 16_777_216;
export const MAX_GROUP_PIXELS = 67_108_864;
export function imageLayerRegionInstructions() {
    return upstreamText("upstream.v165.message202");
}

export function supportsLayerDecomposition(config: AiConfig, model: string) {
    return Boolean(model) && resolveModelRequestConfig(config, model).interfaceType === LAYER_DECOMPOSITION_PROTOCOL;
}

export function supportsExperimentalLayerExtraction(config: AiConfig, model: string) {
    return Boolean(model) && configuredModelMatchesCapability(config, model, "image") && (modelCapabilityConfigFor(config, model).image?.references.maxImages || 0) >= 1;
}

export function parseExperimentalLayerTargets(text: string) {
    const targets = text
        .split(/\r?\n/)
        .map((value) => value.trim())
        .filter(Boolean);
    if (targets.length < 2 || targets.length > 8) throw new Error(upstreamText("upstream.v165.message203"));
    if (new Set(targets).size !== targets.length) throw new Error(upstreamText("upstream.v165.message204"));
    return targets;
}

export type ImageLayerGeneration = { prompt: string; background: "opaque" | "transparent" };

/** 每层只有本层提示词和透明度；模型、尺寸、质量和张数仍由用户配置及源图决定。 */
export function parseImageLayerGeneration(value: unknown, index: number): ImageLayerGeneration {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(upstreamText("upstream.v165.message205", { p0: index + 1 }));
    const item = value as Record<string, unknown>;
    if (typeof item.prompt !== "string" || !item.prompt.trim() || item.prompt.length > 3200) throw new Error(upstreamText("upstream.v165.message206", { p0: index + 1 }));
    const background = index === 0 ? "opaque" : "transparent";
    if (item.background !== background) throw new Error(upstreamText("upstream.v165.message207", { p0: index + 1 }));
    if (Object.keys(item).some((key) => key !== "prompt" && key !== "background")) throw new Error(upstreamText("upstream.v165.message208", { p0: index + 1 }));
    return { prompt: item.prompt.trim(), background };
}

export function imageLayerGenerationConfig(config: AiConfig, generation: ImageLayerGeneration, index: number): AiConfig {
    const validated = parseImageLayerGeneration(generation, index);
    return { ...config, count: "1", transparentBackground: validated.background === "transparent" ? "true" : "false" };
}

export function experimentalLayerPrompt(generation: ImageLayerGeneration, bbox?: [number, number, number, number]) {
    const contract = generation.background === "opaque" ? upstreamText("upstream.v165.message209") : upstreamText("upstream.v165.message210");
    return upstreamText("upstream.v165.message211", { p0: contract, p1: generation.prompt, p2: bbox ? upstreamText("upstream.v165.message212", { p0: bbox.join(" ") }) : "", p3: imageLayerRegionInstructions() });
}

/** OpenAI Images 的 false 默认可能仍是 auto；拆层底图明确请求 opaque。 */
export function imageLayerProviderMetadata(config: AiConfig, index: number) {
    const protocol = resolveModelRequestConfig(config, config.model).interfaceType;
    return protocol === "openai-image" ? { providerOptions: { [protocol]: { background: index === 0 ? "opaque" : "transparent" } } } : {};
}

export function experimentalLayerSignature(root: CanvasNodeData, nodes: CanvasNodeData[]) {
    return JSON.stringify(
        root.metadata?.experimentalLayerPlan?.requests.map((request) => {
            const child = nodes.find((node) => node.id === request.nodeId);
            return [request.nodeId, request.target, child?.metadata?.status, child?.metadata?.layerExtraction?.phase, child?.metadata?.storageKey || child?.metadata?.content];
        }),
    );
}

export function layerDecompositionConfig(config: AiConfig, model: string, parameters?: Partial<Pick<AiConfig, "size" | "quality">>): AiConfig {
    return { ...config, ...parameters, model, imageModel: model, count: "1", taskWorkflowProvider: "model" };
}

export type LayerRasterInfo = { width: number; height: number; transparent: boolean; nonempty: boolean; opaque?: boolean; transparentPixels?: number };

export function inspectLayerAlpha(width: number, height: number, rgba: Uint8ClampedArray): LayerRasterInfo {
    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0 || width * height > MAX_LAYER_PIXELS || rgba.length !== width * height * 4) {
        throw new Error(upstreamText("upstream.v165.message213"));
    }
    let transparent = false;
    let nonempty = false;
    let opaque = true;
    let transparentPixels = 0;
    for (let index = 3; index < rgba.length; index += 4) {
        if (rgba[index] === 0) {
            transparent = true;
            transparentPixels += 1;
        }
        if (rgba[index] > 0) nonempty = true;
        if (rgba[index] !== 255) opaque = false;
    }
    return { width, height, transparent, nonempty, opaque, transparentPixels };
}

export function hasUsableLayerTransparency(info: LayerRasterInfo) {
    return info.transparent && (info.transparentPixels === undefined || info.transparentPixels >= Math.max(1, Math.ceil(info.width * info.height * 0.001)));
}

/** 最终产出保留原始 alpha；透明度只决定是否走既有去背景流程，不阻止显示和合成。 */
export function validateImageLayerOutput(info: LayerRasterInfo) {
    if (!info.nonempty) throw new Error(upstreamText("upstream.v165.message009"));
}

/** 原图底板修补的输入仍要求完整不透明，避免改变区域外原像素。 */
export function validateImageLayerRole(info: LayerRasterInfo, index: number) {
    if (!info.nonempty) throw new Error(upstreamText("upstream.v165.message009"));
    if (index === 0 && info.opaque !== true) throw new Error(upstreamText("upstream.v165.message214"));
    if (index > 0 && !hasUsableLayerTransparency(info)) throw new Error(upstreamText("upstream.v165.message215"));
}

/** 最终图层只按资源、尺寸和数量验收，保留其真实 alpha。 */
export function validateLayerRasters(layers: LayerRasterInfo[]) {
    if (layers.length < 2) throw new Error(upstreamText("upstream.v165.message216"));
    if (layers.length > MAX_IMAGE_LAYERS) throw new Error(upstreamText("upstream.v165.message217", { p0: MAX_IMAGE_LAYERS }));
    const { width, height } = layers[0];
    if (layers.some((layer) => !layer.nonempty)) throw new Error(upstreamText("upstream.v165.message218"));
    if (layers.some((layer) => layer.width !== width || layer.height !== height)) throw new Error(upstreamText("upstream.v165.message219"));
    if (width * height > MAX_LAYER_PIXELS || width * height * layers.length > MAX_GROUP_PIXELS) throw new Error(upstreamText("upstream.v165.message220"));
    const opaque = layers.flatMap((layer, index) => (layer.transparent ? [] : [index]));
    // 只有唯一候选底图时沿用置底规则；多张候选不猜角色，保留模型输出顺序。
    if (opaque.length !== 1) return layers.map((_, index) => index);
    return [...opaque, ...layers.flatMap((layer, index) => (layer.transparent ? [index] : []))];
}

export function imageLayerCompositeSignature(group: NonNullable<CanvasNodeMetadata["imageLayerGroup"]>, nodes: CanvasNodeData[]) {
    const byId = new Map(nodes.map((node) => [node.id, node]));
    return JSON.stringify([
        group.width,
        group.height,
        group.layers.map((layer) => {
            const node = byId.get(layer.nodeId);
            return [layer.nodeId, layer.x, layer.y, layer.visible, node?.metadata?.storageKey || node?.metadata?.content || "", node?.metadata?.naturalWidth, node?.metadata?.naturalHeight];
        }),
    ]);
}

export function copyImageLayerSources(source: CanvasNodeData, nodes: CanvasNodeData[]) {
    if (!source.metadata?.imageLayerGroup) return [source];
    const ids = new Set(source.metadata.imageLayerGroup.layers.map((layer) => layer.nodeId));
    return [source, ...nodes.filter((node) => ids.has(node.id))];
}
