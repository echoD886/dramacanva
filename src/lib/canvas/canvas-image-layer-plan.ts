import { currentLocaleText as upstreamText } from "@/i18n/current-locale-text";
import { modelCapabilityConfigFor } from "@/lib/model-capabilities";
import { canvasTextDetectionSupportError } from "./canvas-node-text-detection";
import { configuredModelMatchesCapability, type AiConfig } from "@/stores/use-config-store";
import type { GenerationTask } from "@/services/api/task-center";
import { imageLayerRegionInstructions, parseImageLayerGeneration, type ImageLayerGeneration } from "@/lib/canvas/canvas-image-layers";
import type { ImageLayerExtraction } from "@/lib/canvas/canvas-image-layer-strategy";

export type ImageLayerPlanningPurpose = "materials" | "recompose";
export type ImageLayerPlanningOptions = { input?: "preview" | "original"; history?: boolean; purpose?: ImageLayerPlanningPurpose };
type ImageSize = { width: number; height: number };

export type ImageLayerPlan = {
    layout?: "continuous" | "composition" | "mixed";
    layers: Array<{
        name: string;
        description: string;
        kind: "background" | "object";
        generation: ImageLayerGeneration;
        editUnit?: "scene" | "object" | "text" | "decoration" | "group";
        removeFromBackground?: boolean;
        bbox?: [number, number, number, number];
        extraction?: ImageLayerExtraction;
    }>;
    reasoning?: { structure: string; editingGoal: string; strategy: string };
    model?: string;
    taskId?: string;
    warnings?: string[];
};

export function imageLayerPlannerError(config: AiConfig, model: string) {
    if (!model) return upstreamText("upstream.v165.message145");
    if (!configuredModelMatchesCapability(config, model, "text")) return upstreamText("upstream.v165.message146");
    return canvasTextDetectionSupportError(config, model);
}

export function imageLayerPlanningPrompt(instructions: string, referenceSize?: ImageSize, purpose: ImageLayerPlanningPurpose = "recompose") {
    const coordinates = referenceSize ? upstreamText("upstream.v165.message148", { p0: referenceSize.width, p1: referenceSize.height, p2: referenceSize.width, p3: referenceSize.height }) : upstreamText("upstream.v165.message149");
    return [
        upstreamText("upstream.v165.message150"),
        purpose === "materials" ? upstreamText("upstream.v165.message151") : upstreamText("upstream.v165.message152"),
        upstreamText("upstream.v165.message153"),
        upstreamText("upstream.v165.message154"),
        upstreamText("upstream.v165.message155"),
        upstreamText("upstream.v165.message156"),
        coordinates + upstreamText("upstream.v165.message157"),
        upstreamText("upstream.v165.message158"),
        upstreamText("upstream.v165.message159"),
        upstreamText("upstream.v165.message160", { p0: JSON.stringify(instructions) }),
    ].join("\n");
}

/** 编辑目的约束执行计划；识别分类决定工具，旧规划也不能绕过当前选择。 */
export function applyImageLayerPlanningPurpose(plan: ImageLayerPlan, purpose: ImageLayerPlanningPurpose): ImageLayerPlan {
    const warnings = [...(plan.warnings || [])];
    let preservedBase = false;
    const eligible = plan.layers.filter((layer, index) => {
        if (index > 0 && plan.layout === "continuous" && (layer.extraction?.method === "source-region" || layer.editUnit === "scene")) {
            warnings.push(upstreamText("upstream.v165.message161", { p0: layer.name }));
            return false;
        }
        return true;
    });
    if (eligible.length < 2) throw new Error(upstreamText("upstream.v165.message162"));
    const layers = eligible.map((layer, index) => {
        if (index === 0 && purpose === "materials") {
            preservedBase = layer.extraction?.method !== "source" || plan.layers.some((item) => item.removeFromBackground);
            return { ...layer, name: upstreamText("upstream.v165.message163"), description: upstreamText("upstream.v165.message164"), extraction: { method: "source" as const } };
        }
        if (index === 0) {
            return { ...layer, name: upstreamText("upstream.v165.message165"), extraction: { method: "generate" as const } };
        }
        let extraction = layer.extraction;
        // 完整场景是可见区域的素材，不是需要补画或抠出内部主体的对象。
        if (index > 0 && layer.editUnit === "scene" && extraction?.method !== "source-region") {
            extraction = { method: "source-region" };
            warnings.push(upstreamText("upstream.v165.message166", { p0: layer.name }));
        }
        return { ...layer, removeFromBackground: purpose === "recompose", ...(extraction ? { extraction } : {}) };
    });
    if (preservedBase) warnings.push(upstreamText("upstream.v165.message167"));
    if (purpose === "recompose" && (plan.layers[0].extraction?.method === "source" || eligible.slice(1).some((layer) => !layer.removeFromBackground))) {
        warnings.push(upstreamText("upstream.v165.message168"));
    }
    return { ...plan, layers, ...(warnings.length ? { warnings } : {}) };
}

/** 节点标题只保留素材名称；完整描述与坐标继续留在生成计划中。 */
export function imageLayerTargetName(target: string) {
    return (
        target
            .replace(/<bbox>[^<]*<\/bbox>/g, "")
            .split(/[：:\n]/)[0]
            .trim()
            .slice(0, 48) || upstreamText("upstream.v165.message169")
    );
}

/** 语义计划必须有效；可选区域提示不能使已识别的整份计划失效，也不能猜测单位或裁剪坐标。 */
export function parseImageLayerPlan(text: string, referenceSize?: ImageSize): ImageLayerPlan {
    if (text.length > 32_000) throw new Error(upstreamText("upstream.v165.message170"));
    const raw = text
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "");
    let value: any;
    try {
        value = JSON.parse(raw);
    } catch {
        throw new Error(upstreamText("upstream.v165.message171"));
    }
    if (!value || typeof value !== "object" || value.canPlan !== true) throw new Error(upstreamText("upstream.v165.message172", { p0: typeof value?.reason === "string" ? `：${value.reason.slice(0, 300)}` : "" }));
    if (!Array.isArray(value.layers) || value.layers.length < 2 || value.layers.length > 8) throw new Error(upstreamText("upstream.v165.message173"));
    const names = new Set<string>();
    const warnings: string[] = [];
    const layers = value.layers.map((item: any, index: number) => {
        if (!item || typeof item.name !== "string" || typeof item.description !== "string") throw new Error(upstreamText("upstream.v165.message174"));
        const name = item.name.trim();
        const description = item.description.trim();
        if (!name || name.length > 80 || !description || description.length > 1200 || /[\r\n]/.test(name + description)) throw new Error(upstreamText("upstream.v165.message175"));
        if (names.has(name)) throw new Error(upstreamText("upstream.v165.message176"));
        names.add(name);
        const kind = index === 0 ? ("background" as const) : ("object" as const);
        if (item.kind !== kind) throw new Error(upstreamText("upstream.v165.message177"));
        const generation = parseImageLayerGeneration(item.generation, index);
        if (generation.prompt.length > 2400) throw new Error(upstreamText("upstream.v165.message178", { p0: index + 1 }));
        if (item.removeFromBackground !== undefined && typeof item.removeFromBackground !== "boolean") throw new Error(upstreamText("upstream.v165.message179"));
        let bbox: [number, number, number, number] | undefined;
        const nestedBbox = item.extraction?.bbox;
        const conflictingBbox = item.bbox !== undefined && nestedBbox !== undefined && JSON.stringify(item.bbox) !== JSON.stringify(nestedBbox);
        const regionBbox = conflictingBbox ? undefined : (item.bbox ?? nestedBbox);
        if (conflictingBbox) warnings.push(upstreamText("upstream.v165.message180", { p0: name }));
        if (regionBbox !== undefined) {
            const space = value.coordinateSpace ?? "normalized1000";
            const sizeMatches = !value.imageSize || (referenceSize && value.imageSize.width === referenceSize.width && value.imageSize.height === referenceSize.height);
            const scale = space === "normalized1000" ? [1, 1] : space === "relative" ? [1000, 1000] : space === "pixels" && referenceSize ? [1000 / referenceSize.width, 1000 / referenceSize.height] : null;
            if (scale && sizeMatches && Array.isArray(regionBbox) && regionBbox.length === 4 && regionBbox.every((number: unknown) => typeof number === "number" && Number.isFinite(number))) {
                const normalized = regionBbox.map((number: number, i: number) => number * scale[i % 2]);
                if (normalized.every((number: number) => number >= 0 && number <= 1000) && normalized[2] - normalized[0] >= 2 && normalized[3] - normalized[1] >= 2) bbox = normalized.map((number: number) => Math.round(number)) as typeof bbox;
            }
            if (!bbox) warnings.push(upstreamText("upstream.v165.message181", { p0: name }));
        }
        let extraction: ImageLayerExtraction | undefined;
        if (item.extraction !== undefined) {
            const method = item.extraction?.method;
            if (method === "generate") extraction = { method };
            else if (method === "source" && index === 0) extraction = { method };
            else if (method === "source-region" && index > 0) {
                const shape = item.extraction.shape;
                if (!["rect", "rounded-rect", "ellipse"].includes(shape)) throw new Error(upstreamText("upstream.v165.message182"));
                const radiusRatio = item.extraction.radiusRatio;
                // 保留可用的语义计划；显式选择原图区域却缺少几何坐标时，由编辑器阻止提交。
                extraction = { method, ...(bbox ? { region: { bbox, shape, ...(shape === "rounded-rect" ? { radiusRatio } : {}) } } : {}) };
                if (!bbox) warnings.push(upstreamText("upstream.v165.message183", { p0: name }));
            } else throw new Error(upstreamText("upstream.v165.message184"));
        }
        const editUnits = ["scene", "object", "text", "decoration", "group"] as const;
        const editUnit = editUnits.find((unit) => unit === item.editUnit);
        if (item.editUnit !== undefined && !editUnit) warnings.push(upstreamText("upstream.v165.message185", { p0: name }));
        return { name, description, kind, generation, ...(editUnit ? { editUnit } : {}), ...(index ? { removeFromBackground: item.removeFromBackground ?? false } : {}), ...(bbox ? { bbox } : {}), ...(extraction ? { extraction } : {}) };
    });
    const fields = ["structure", "editingGoal", "strategy"] as const;
    const reasoning =
        value.reasoning && fields.every((field) => typeof value.reasoning[field] === "string" && value.reasoning[field].trim().length > 0 && value.reasoning[field].length <= 400)
            ? (Object.fromEntries(fields.map((field) => [field, value.reasoning[field].trim()])) as ImageLayerPlan["reasoning"])
            : undefined;
    if (value.reasoning && !reasoning) warnings.push(upstreamText("upstream.v165.message186"));
    const layout = ["continuous", "composition", "mixed"].includes(value.layout) ? (value.layout as ImageLayerPlan["layout"]) : undefined;
    if (value.layout !== undefined && !layout) warnings.push(upstreamText("upstream.v165.message187"));
    return { layers, ...(layout ? { layout } : {}), ...(reasoning ? { reasoning } : {}), ...(warnings.length ? { warnings } : {}) };
}

/** 仅复用同画布同源节点的已完成结果；历史识图失败不覆盖更早的可用计划。 */
export function latestImageLayerPlan(tasks: GenerationTask[], projectId: string, sourceNodeId: string, sourceStorageKey?: string): ImageLayerPlan | undefined {
    for (const task of [...tasks].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
        if (task.projectId !== projectId || task.type !== "canvas_text" || task.status !== "succeeded") continue;
        try {
            const metadata = JSON.parse(task.inputJson || "{}").metadata;
            if (metadata?.edit !== "layer-planning" || metadata.sourceNodeId !== sourceNodeId) continue;
            if (metadata.sourceStorageKey && metadata.sourceStorageKey !== sourceStorageKey) continue;
            const plan = parseImageLayerPlan(JSON.parse(task.resultJson || "{}").text || "", metadata.planningReferenceSize);
            return {
                ...plan,
                taskId: task.id,
                model: task.model,
                warnings: [...(plan.warnings || []), upstreamText("upstream.v165.message188", { p0: task.createdAt }), ...(!metadata.sourceStorageKey ? [upstreamText("upstream.v165.message189")] : [])],
            };
        } catch {
            /* 跳过未形成可用计划的旧记录，不创建或重试任务。 */
        }
    }
}

export function imageLayerPlanTargets(plan: ImageLayerPlan) {
    return plan.layers.map((layer) => `${layer.name}：${layer.description}${layer.bbox ? upstreamText("upstream.v165.message190", { p0: layer.bbox.join(" ") }) : ""}`);
}

/** 尺寸来自源图，不能把未支持的比例静默回退成模型默认方图。 */
export function imageLayerOutputSize(config: AiConfig, model: string, source?: { width: number; height: number }) {
    const size = modelCapabilityConfigFor(config, model).image?.size;
    if (!source || !Number.isSafeInteger(source.width) || !Number.isSafeInteger(source.height) || source.width <= 0 || source.height <= 0) return "";
    if (!size || size.parameter === "none") return "auto";
    if (source && source.width > 0 && source.height > 0) {
        const exact = `${source.width}x${source.height}`;
        if (size.values.includes(exact)) return exact;
        if (size.allowCustom) return `${source.width}:${source.height}`;
        const match = size.values.find((value) => {
            const pair = value.match(/^(\d+)(?::|x)(\d+)$/);
            return pair && Math.abs(Number(pair[1]) / Number(pair[2]) / (source.width / source.height) - 1) < 0.01;
        });
        if (match) return match;
    }
    return size.values.includes("auto") ? "auto" : "";
}

export function imageLayerRemovalPrompt(target: string) {
    return upstreamText("upstream.v165.message191", { p0: target, p1: imageLayerRegionInstructions() });
}
