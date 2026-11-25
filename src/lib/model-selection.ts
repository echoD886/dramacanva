import { defaultImageCapabilityConfig, modelCapabilityConfigFor, normalizeImageValue, normalizeVideoValue, STANDARD_IMAGE_SIZE_VALUES, videoDurationAllowed, videoSelectionAllowed, type ImageCapabilityConfig } from "@/lib/model-capabilities";
import { videoResolutionComparisonKey } from "@/lib/video-generation-options";
import { currentLocaleText } from "@/i18n/current-locale-text";
import { upstreamText } from "@/i18n/ddcat-updates";
import { selectedModelParameters } from "@/lib/model-documented-parameters";
import { configuredModelMatchesCapability, isMusicModelConfig, modelOptionName, resolveModelChannel, resolveModelRequestConfig, selectableModelsByCapability, type AiConfig, type ModelCapability } from "@/stores/use-config-store";

export type ModelInputSummary = {
    textCount: number;
    imageCount: number;
    videoCount: number;
    audioCount: number;
    characterCount: number;
};

export type ModelRequirements = {
    capability?: ModelCapability;
    input?: ModelInputSummary;
    videoOperation?: string;
    videoSeconds?: string;
    imageSize?: string;
    options?: Record<string, unknown>;
    // Draft controls may be used before required reference slots are filled.
    allowIncompleteInputs?: boolean;
};

export type DisplayModelGroup = {
    key: string;
    label: string;
    models: string[];
};

export type ModelReferenceLimits = {
    maxImages: number;
    maxVideos: number;
    maxAudios: number;
};

export function groupModelsByDisplayName(config: AiConfig, models: string[]): DisplayModelGroup[] {
    const groups = new Map<string, DisplayModelGroup>();
    models.forEach((model) => {
        const channel = resolveModelChannel(config, model);
        const label = configuredModelDisplayName(config, model);
        // 系统渠道是后台路由和兜底实现，不是用户可选的产品分组。
        // 不同逻辑模型即使同名也不能合并；同一逻辑 ID 的供应渠道只显示一次。
        const logicalId = channel.modelCosts?.find((item) => item.model === modelOptionName(model))?.logicalModelId;
        const key = channel.scope === "system" ? `official\u0000${logicalId || modelOptionName(model)}` : `${channel.id}\u0000${label.toLocaleLowerCase()}`;
        const current = groups.get(key);
        if (current) {
            if (!current.models.includes(model)) current.models.push(model);
        } else groups.set(key, { key, label, models: [model] });
    });
    return Array.from(groups.values());
}

export function isOfficialPlatformModel(config: AiConfig, model: string) {
    return resolveModelChannel(config, model).scope === "system";
}

export function configuredModelDisplayName(config: AiConfig, value: string) {
    const model = modelOptionName(value);
    const channel = resolveModelChannel(config, value);
    return channel.modelCosts?.find((item) => item.model === model)?.displayName?.trim() || model;
}

export function supportsAudioReferenceVoice(config: AiConfig, value = config.model || config.audioModel || "") {
    if (isMusicModelConfig(config, value)) return false;
    if (["doubao-streaming-tts", "evolink-seed-audio"].includes(resolveModelRequestConfig(config, value).interfaceType || "")) return true;
    const channel = resolveModelChannel(config, value);
    const cost = channel.modelCosts?.find((item) => item.model === modelOptionName(value));
    const specs = [cost?.logicalCapabilitySpec, ...(cost?.logicalCapabilityProfiles || [])].filter(Boolean);
    return specs.some((spec) => spec?.options?.audioMode?.values?.some((candidate) => String(candidate).trim().toLowerCase() === "unified_edit"));
}

export function effectiveAudioMode(config: AiConfig, value?: string): "tts" | "unified_edit" | undefined {
    const target = value ?? (config.model && configuredModelMatchesCapability(config, config.model, "audio") ? config.model : config.audioModel || config.model || "");
    if ((config.taskWorkflowProvider && config.taskWorkflowProvider !== "model") || isMusicModelConfig(config, target) || !supportsAudioReferenceVoice(config, target)) return undefined;
    return config.audioMode === "unified_edit" ? "unified_edit" : "tts";
}

export function modelCompatibilityError(config: AiConfig, model: string, requirements?: ModelRequirements) {
    const channel = resolveModelChannel(config, model);
    const logicalCost = channel.modelCosts?.find((item) => item.model === modelOptionName(model));
    if (logicalCost?.logicalAvailable === false) return "模型暂不可用，请稍后重试";
    const capability = requirements?.capability;
    if (!capability) return "";
    const input = requirements?.input;
    const visualInputCount = input ? input.imageCount + input.characterCount : 0;
    if (capability === "video" && input && [modelOptionName(model), logicalCost?.displayName?.toLowerCase().replaceAll(" ", "-")].some((key) => key === "kling-4" || key === "kling-video-v4")) {
        if (visualInputCount + input.videoCount + input.audioCount > 15 || (input.videoCount + input.audioCount === 0 && visualInputCount > 2)) return currentLocaleText("generationFailure.reference");
    }
    const logicalSpecs = logicalCost?.logicalCapabilityProfiles?.length ? logicalCost.logicalCapabilityProfiles : logicalCost?.logicalCapabilitySpec ? [logicalCost.logicalCapabilitySpec] : [];
    if (logicalSpecs.length) {
        const logicalRequirements = {
            ...requirements,
            options: requirements.options || {},
        };
        const audioModelSupportsReferenceVoice = capability === "audio" && supportsAudioReferenceVoice(config, model);
        if (audioModelSupportsReferenceVoice) {
            const audioMode = String(logicalRequirements.options.audioMode || config.audioMode || "tts").trim() === "unified_edit" ? "unified_edit" : "tts";
            if (input) {
                if (input.videoCount > 0) return currentLocaleText("generationFailure.reference");
                if (audioMode === "unified_edit") {
                    if (!requirements.allowIncompleteInputs && input.audioCount === 0) return upstreamText("全能配音需要连接参考音频");
                    if (input.audioCount > 3) return currentLocaleText("generationFailure.reference");
                } else if (input.characterCount > 1) {
                    return "角色配音一次只能引用一个角色卡";
                }
            }
            const errors = logicalSpecs.map((spec) => {
                const nextOptions = spec.options?.audioMode || audioMode === "unified_edit" ? { ...logicalRequirements.options, audioMode } : logicalRequirements.options;
                return logicalModelCompatibilityError(
                    spec,
                    input ? { ...logicalRequirements, options: nextOptions, input: { ...input, imageCount: 0, characterCount: 0, ...(audioMode === "tts" ? { audioCount: 0 } : {}) } } : { ...logicalRequirements, options: nextOptions },
                    0,
                );
            });
            return errors.some((error) => !error) ? "" : errors[0] || "当前输入不受支持";
        }
        const errors = logicalSpecs.map((spec) => {
            if (capability === "audio") {
                if (input) {
                    if (input.characterCount > 1) return "角色配音一次只能引用一个角色卡";
                    if ((!spec.inputs?.image && input.imageCount > 0) || (!spec.inputs?.video && input.videoCount > 0) || (!spec.inputs?.audio && input.audioCount > 0)) {
                        return "音频模型只接受文本或单个角色卡输入";
                    }
                }
                const singleCharacterAudio = Boolean(input && input.characterCount === 1 && !isMusicModelConfig(config, model));
                const nextOptions = spec.options?.audioMode ? logicalRequirements.options : Object.fromEntries(Object.entries(logicalRequirements.options).filter(([key]) => key !== "audioMode"));
                const nextRequirements = {
                    ...logicalRequirements,
                    options: nextOptions,
                    ...(singleCharacterAudio && input ? { input: { ...input, characterCount: 0 } } : {}),
                };
                return logicalModelCompatibilityError(spec, nextRequirements, singleCharacterAudio ? input!.imageCount : visualInputCount);
            }
            return logicalModelCompatibilityError(spec, logicalRequirements, visualInputCount);
        });
        return errors.some((error) => !error) ? "" : errors[0] || "当前输入不受支持";
    }

    if (capability === "image") {
        const image = modelCapabilityConfigFor(config, model).image!;
        // 尺寸兼容不依赖输入摘要：无输入时（如画布重试/工具链）也要按尺寸过滤组内模型。
        if (requirements.imageSize && !image.size.allowCustom && !image.size.values.includes(requirements.imageSize)) return "不支持当前尺寸";
        const options = requirements.options || {};
        const checks: Array<[string, boolean]> = [
            ["size", image.size.parameter === "none" || !options.size || image.size.allowCustom || image.size.values.includes(String(options.size))],
            ["quality", !image.quality.supported || !options.quality || image.quality.values.includes(String(options.quality))],
            ["imageResolution", !image.resolution?.supported || !options.imageResolution || image.resolution.values.includes(String(options.imageResolution))],
            ["count", options.count === undefined || (Number(options.count) >= 1 && Number(options.count) <= image.maxOutputs)],
            ["transparentBackground", image.transparentBackground.supported || String(options.transparentBackground) !== "true"],
        ];
        const invalid = checks.find(([, valid]) => !valid);
        if (invalid) return logicalOptionError(invalid[0]);
        if (!input) return "";
        if (input.videoCount > 0) return "图片模型不支持参考视频";
        if (input.audioCount > 0) return "图片模型不支持参考音频";
        if (visualInputCount > image.references.maxImages) return currentLocaleText("generationFailure.reference");
        return "";
    }

    if (capability === "video") {
        const profile = modelCapabilityConfigFor(config, model).video!;
        if (!videoSelectionAllowed(profile, String(requirements.options?.vquality || profile.defaultResolution), Number(requirements.options?.videoSeconds || requirements.videoSeconds || profile.duration.default))) return "不支持当前分辨率与视频时长组合";
        if (requirements.videoSeconds && !videoDurationAllowed(profile, Number(requirements.videoSeconds))) return "不支持当前视频时长";
        const options = requirements.options || {};
        const checks: Array<[string, boolean]> = [
            ["videoSeconds", options.videoSeconds === undefined || videoDurationAllowed(profile, Number(options.videoSeconds))],
            ["size", !profile.ratios.length || !options.size || profile.ratios.includes(String(options.size))],
            ["vquality", !profile.resolutions.length || !options.vquality || profile.resolutions.some((value) => videoResolutionComparisonKey(value) === videoResolutionComparisonKey(String(options.vquality)))],
            ["videoGenerateAudio", profile.generateAudio.supported || String(options.videoGenerateAudio) !== "true"],
            ["videoWatermark", profile.watermark.supported || String(options.videoWatermark) !== "true"],
        ];
        const invalid = checks.find(([, valid]) => !valid);
        if (invalid) return logicalOptionError(invalid[0]);
        if (!input) return "";
        if (!requirements.allowIncompleteInputs && visualInputCount < profile.references.minImages) return currentLocaleText("generationFailure.reference");
        if (visualInputCount > profile.references.maxImages || input.videoCount > profile.references.maxVideos || input.audioCount > profile.references.maxAudios) return currentLocaleText("generationFailure.reference");
        const operation = resolveVideoOperation(input, requirements.videoOperation);
        if (!(requirements.allowIncompleteInputs && visualInputCount + input.videoCount + input.audioCount === 0) && operation !== "concat" && !profile.operations.includes(operation)) return `不支持${videoOperationLabel(operation)}`;
        return "";
    }

    if (!input) return "";

    if (capability === "text") {
        return input.audioCount > 0 ? "文本模型不支持参考音频" : "";
    }

    if (capability === "audio") {
        if (supportsAudioReferenceVoice(config, model)) {
            const audioMode = (requirements.options?.audioMode || config.audioMode || "tts") === "unified_edit" ? "unified_edit" : "tts";
            if (audioMode === "unified_edit") {
                if (input.videoCount > 0 || input.audioCount > 3) return currentLocaleText("generationFailure.reference");
                if (!requirements.allowIncompleteInputs && input.audioCount === 0) return upstreamText("全能配音需要连接参考音频");
                return "";
            }
            if (input.videoCount > 0) return currentLocaleText("generationFailure.reference");
            if (input.characterCount > 1) return "角色配音一次只能引用一个角色卡";
            return "";
        }
        if (input.characterCount > 1) return "角色配音一次只能引用一个角色卡";
        return input.imageCount > 0 || input.videoCount > 0 || input.audioCount > 0 ? "音频模型只接受文本或单个角色卡输入" : "";
    }
    return "";
}

export function modelPromptLengthError(config: AiConfig, model: string, capability: ModelCapability, prompt: string) {
    const channel = resolveModelChannel(config, model);
    const configuredProfile = channel.modelCosts?.find((item) => item.model === modelOptionName(model))?.capabilityConfig;
    if (!configuredProfile) return "";
    const profile = modelCapabilityConfigFor(config, model);
    const maxChars = capability === "text" ? profile.text?.references.promptMaxChars : capability === "image" ? profile.image?.references.promptMaxChars : capability === "video" ? profile.video?.references.promptMaxChars : undefined;
    if (!maxChars || maxChars <= 0) return "";
    const actualChars = Array.from(prompt).length;
    if (actualChars <= maxChars) return "";
    const label = capability === "text" ? "文本" : capability === "image" ? "图片" : "视频";
    return `当前${label}模型提示词最多 ${maxChars} 个字符，完整提示词为 ${actualChars} 个字符。系统不会自动截断，请精简当前输入、连线内容或技能上下文后重试`;
}

export function modelRequestOptions(config: AiConfig, capability: ModelCapability, model?: string) {
    const additional = Object.fromEntries(Object.entries(selectedModelParameters(config, capability)).map(([name, value]) => [`parameter.${name}`, value]));
    switch (capability) {
        case "image":
            return {
                ...additional,
                size: config.size,
                ...(!["auto", "any", ""].includes(config.quality.trim().toLowerCase()) ? { quality: config.quality } : {}),
                ...(config.imageResolution ? { imageResolution: config.imageResolution } : {}),
                transparentBackground: config.transparentBackground === "true",
                count: Number(config.count),
            };
        case "video":
            return { ...additional, size: config.size, videoSeconds: Number(config.videoSeconds), vquality: config.vquality, videoGenerateAudio: config.videoGenerateAudio === "true", videoWatermark: config.videoWatermark === "true" };
        case "audio": {
            const audioMode = effectiveAudioMode(config, model || undefined);
            return { ...additional, ...(audioMode ? { audioMode } : {}), audioVoice: config.audioVoice, audioFormat: config.audioFormat, audioSpeed: Number(config.audioSpeed) };
        }
        default:
            return additional;
    }
}

function logicalModelCompatibilityError(spec: NonNullable<NonNullable<AiConfig["channels"][number]["modelCosts"]>[number]["logicalCapabilitySpec"]>, requirements: ModelRequirements, visualInputCount: number) {
    if (requirements.capability && spec.capability !== requirements.capability) return "不支持当前生成类型";
    const input = requirements.input;
    const counts: Record<string, number> = {
        text: 0,
        image: visualInputCount,
        video: input?.videoCount || 0,
        audio: input?.audioCount || 0,
    };
    for (const [kind, count] of Object.entries(counts)) {
        const constraint = spec.inputs?.[kind];
        if (!constraint && count > 0) return `不支持${kind}输入`;
        if (constraint && ((!requirements.allowIncompleteInputs && count < constraint.min) || count > constraint.max)) return currentLocaleText("generationFailure.reference");
    }
    const operation = requirements.capability === "video" && input ? resolveVideoOperation(input, requirements.videoOperation) : requirements.videoOperation;
    const emptyDraft = requirements.allowIncompleteInputs && visualInputCount + counts.video + counts.audio === 0;
    if (!emptyDraft && operation && spec.operations?.length && !spec.operations.includes(operation)) return "不支持当前生成模式";
    // 图片创作状态也会携带全局默认视频时长；这个字段只对视频模型有意义，
    // 不能把它拼进图片逻辑模型的能力匹配，否则图片模型会被误判为“不支持当前时长”。
    const options: Record<string, unknown> = {
        ...requirements.options,
        ...(requirements.capability === "video" && requirements.videoSeconds ? { videoSeconds: requirements.videoSeconds } : {}),
        ...(requirements.capability === "image" && requirements.imageSize ? { size: requirements.imageSize } : {}),
    };
    const resolution = videoResolutionComparisonKey(String(options.vquality || ""));
    const limits = spec.imageSizeLimits;
    const pixels = /^(\d+)x(\d+)$/.exec(String(options.size || ""));
    if (limits && pixels) {
        const w = Number(pixels[1]),
            h = Number(pixels[2]);
        if (
            (limits.maxEdge && Math.max(w, h) > limits.maxEdge) ||
            (limits.multiple && (w % limits.multiple || h % limits.multiple)) ||
            (limits.minPixels && w * h < limits.minPixels) ||
            (limits.maxPixels && w * h > limits.maxPixels) ||
            (limits.maxAspectRatio && Math.max(w, h) > Math.min(w, h) * limits.maxAspectRatio)
        )
            return "不支持当前尺寸";
    }
    for (const [value, max] of Object.entries(spec.maxDurationByResolution || {})) {
        if (videoResolutionComparisonKey(value) === resolution && Number(options.videoSeconds) > max) return "不支持当前分辨率与视频时长组合";
    }
    for (const [value, max] of Object.entries(spec.maxImagesByResolution || {})) {
        if (videoResolutionComparisonKey(value) === resolution && visualInputCount > max) return "不支持当前分辨率与参考图数量组合";
    }
    for (const [name, originalValue] of Object.entries(options)) {
        let value = originalValue;
        if (value === undefined || value === null || value === "") continue;
        // The backend treats automatic image quality as no preference too.
        if (requirements.capability === "image" && name === "quality" && ["auto", "any"].includes(String(value).trim().toLowerCase())) continue;
        const constraint = spec.options?.[name];
        if (spec.capability === "image") {
            const quality = spec.options?.quality,
                resolution = spec.options?.imageResolution;
            if (name === "quality" && !quality && resolution) continue;
            if (quality && !resolution) {
                const mapped = imageTierQuality(options.imageResolution);
                if (name === "imageResolution" && mapped && logicalOptionMatches("quality", quality, mapped)) continue;
                if (name === "quality" && mapped) value = mapped;
            }
        }
        if (!constraint && ["transparentBackground", "videoGenerateAudio", "videoWatermark"].includes(name) && String(value) === "false") continue;
        if (!constraint || !logicalOptionMatches(name, constraint, value)) return logicalOptionError(name);
    }
    return "";
}

function imageTierQuality(value: unknown) {
    return ({ "1k": "low", "2k": "medium", "4k": "high" } as Record<string, string>)[String(value).trim().toLowerCase()];
}

function logicalOptionMatches(name: string, constraint: { values?: unknown[]; min?: number; max?: number; step?: number }, value: unknown) {
    if (constraint.values?.length) {
        const requested = normalizeLogicalOptionValue(name, value);
        return constraint.values.some((candidate) => candidate === "*" || normalizeLogicalOptionValue(name, candidate) === requested);
    }
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return false;
    if (constraint.min !== undefined && numeric < constraint.min) return false;
    if (constraint.max !== undefined && numeric > constraint.max) return false;
    if (constraint.step !== undefined && constraint.min !== undefined) return Math.abs((numeric - constraint.min) / constraint.step - Math.round((numeric - constraint.min) / constraint.step)) < 1e-9;
    return true;
}

function normalizeLogicalOptionValue(name: string, value: unknown) {
    const normalized = String(value).trim().toLowerCase();
    if (name !== "vquality" && name !== "resolution") return normalized;
    return videoResolutionComparisonKey(normalized);
}

function logicalOptionError(name: string) {
    const label: Record<string, string> = {
        size: "尺寸",
        quality: "质量",
        imageResolution: "分辨率",
        transparentBackground: "透明背景",
        count: "输出数量",
        videoSeconds: "时长",
        vquality: "分辨率",
        videoGenerateAudio: "同步音频",
        videoWatermark: "水印设置",
        audioMode: "配音方式",
        audioVoice: "音色",
        audioFormat: "音频格式",
        audioSpeed: "语速",
    };
    return `不支持当前${label[name] || name}`;
}

export function compatibleModelInGroup(config: AiConfig, models: string[], requirements?: ModelRequirements, preferred?: string) {
    const compatible = models.filter((model) => !modelCompatibilityError(config, model, requirements));
    if (!compatible.length) return "";
    if (compatible.length === 1) return compatible[0];
    const priceOf = (model: string) => {
        const channel = resolveModelChannel(config, model);
        const cost = channel.modelCosts?.find((item) => item.model === modelOptionName(model));
        return cost && Number.isFinite(cost.unitPriceMicrocredits) ? cost.unitPriceMicrocredits : Number.POSITIVE_INFINITY;
    };
    return compatible.sort((left, right) => priceOf(left) - priceOf(right) || (left === preferred ? -1 : right === preferred ? 1 : 0))[0];
}

export function resolveCompatibleModel(config: AiConfig, selected: string, requirements?: ModelRequirements) {
    if (!requirements?.capability) return selected;
    const options = selectableModelsByCapability(config, requirements.capability);
    if (!options.length) return "";
    const selectedGroup = groupModelsByDisplayName(config, options).find((group) => group.models.includes(selected));
    if (!selectedGroup) return compatibleModelInGroup(config, options, requirements);
    return compatibleModelInGroup(config, selectedGroup.models, requirements, selected);
}

export function resolveCompatibleModelInSameGroup(config: AiConfig, selected: string, requirements: ModelRequirements) {
    if (!requirements.capability) return selected;
    if (!modelCompatibilityError(config, selected, requirements)) return selected;
    const options = selectableModelsByCapability(config, requirements.capability);
    const group = groupModelsByDisplayName(config, options).find((item) => item.models.includes(selected));
    return group ? compatibleModelInGroup(config, group.models, requirements, selected) : "";
}

// 同显示名分组的模型族：尺寸/比例/分辨率选项取组内全部模型配置的并集，
// 让用户能看到并选择任意成员支持的能力，选中后由兼容路由落到具体模型。
// 质量、透明背景等其余能力取当前选中（路由后）模型的配置，与创作页面一致。
export function mergedImageCapabilityConfig(config: AiConfig, selected: string): ImageCapabilityConfig {
    const options = selectableModelsByCapability(config, "image");
    const group = options.length ? groupModelsByDisplayName(config, options).find((item) => item.models.includes(selected)) : undefined;
    const models = group?.models.length ? group.models : [selected];
    const selectedProfile = modelCapabilityConfigFor(config, selected).image;
    const profiles = models.map((model) => modelCapabilityConfigFor(config, model).image).filter((profile): profile is ImageCapabilityConfig => Boolean(profile));
    if (profiles.length <= 1) return selectedProfile || defaultImageCapabilityConfig();
    const concreteValues = Array.from(new Set(profiles.flatMap((profile) => profile.size.values).filter((value) => value !== "*")));
    const allowCustom = profiles.some((profile) => profile.size.allowCustom || profile.size.values.includes("*"));
    const values = concreteValues.length ? concreteValues : allowCustom ? [...STANDARD_IMAGE_SIZE_VALUES] : [];
    const base = selectedProfile || profiles[0];
    return { ...base, size: { ...base.size, values, allowCustom } };
}

// 切换模型后初始化图片参数为该模型能力默认值，避免旧参数在目标模型族不兼容导致无法切换。
export function defaultImageParamsForModel(config: AiConfig, model: string): Pick<AiConfig, "size" | "quality" | "imageResolution" | "transparentBackground"> {
    const cost = resolveModelChannel(config, model).modelCosts?.find((item) => item.model === modelOptionName(model));
    if (cost?.logicalCapabilityProfiles?.length) {
        const defaults = resolveModelGenerationDefaults(config, model, "image");
        return { size: defaults.size || "auto", quality: defaults.quality || "auto", imageResolution: defaults.imageResolution || "", transparentBackground: defaults.transparentBackground || "false" };
    }
    const image = modelCapabilityConfigFor(config, model).image;
    if (!image) return { size: "1:1", quality: "auto", transparentBackground: "false" };
    const sizeValues = image.size.values.filter((value) => value !== "*");
    const sizeDefault = image.size.default !== "*" && image.size.default ? image.size.default : sizeValues[0] || "1:1";
    return {
        size: sizeDefault,
        quality: image.quality.default || "auto",
        ...(image.resolution?.supported ? { imageResolution: image.resolution.default } : {}),
        transparentBackground: String(image.transparentBackground.default ?? false),
    };
}

export type ModelGenerationDefaults = Pick<AiConfig, "size" | "quality" | "imageResolution" | "transparentBackground" | "count" | "videoSeconds" | "vquality" | "videoGenerateAudio" | "videoWatermark">;

export function resolveModelGenerationDefaults(
    config: AiConfig,
    model: string,
    capability: "image" | "video" | undefined,
    explicit: Partial<ModelGenerationDefaults> = {},
    fallback: Partial<ModelGenerationDefaults> = {},
): Partial<ModelGenerationDefaults> {
    if (!capability) return {};
    const channel = resolveModelChannel(config, model);
    const cost = channel.modelCosts?.find((item) => item.model === modelOptionName(model));
    const isManagedModel = Boolean(cost?.logicalModelId || cost?.logicalCapabilitySpec);
    // A channel model capability profile is an explicit per-model contract too.
    // The persisted global values are legacy defaults and must not override a
    // model's configured duration, ratio, or resolution on a new canvas node.
    const hasModelCapabilityProfile = Boolean(cost?.capabilityConfig);
    const starter = cost?.starterPreset?.options;
    const source = (key: keyof ModelGenerationDefaults) => explicit[key] ?? (starter?.[key] == null ? undefined : String(starter[key])) ?? (isManagedModel || hasModelCapabilityProfile ? undefined : fallback[key]);
    const profile = modelCapabilityConfigFor(config, model);

    if (capability === "image" && profile.image) {
        const normalized = normalizeImageValue(profile.image, {
            size: source("size"),
            quality: source("quality"),
            imageResolution: source("imageResolution"),
            count: source("count"),
            transparentBackground: source("transparentBackground"),
        });
        const specs = cost?.logicalCapabilityProfiles || [];
        const requirements: ModelRequirements = { capability: "image", options: normalized };
        if (specs.length && !specs.some((spec) => !logicalModelCompatibilityError(spec, requirements, 0))) {
            for (const spec of specs) {
                const patch = imageOptionsForProfile(spec, normalized);
                if (!logicalModelCompatibilityError(spec, { ...requirements, options: patch }, 0)) return patch;
            }
        }
        return normalized;
    }

    if (capability === "video" && profile.video) {
        const normalized = normalizeVideoValue(profile.video, {
            seconds: source("videoSeconds"),
            ratio: source("size"),
            resolution: source("vquality"),
        });
        return {
            videoSeconds: normalized.seconds,
            size: normalized.ratio,
            vquality: normalized.resolution.replace(/p$/i, ""),
            videoGenerateAudio: profile.video.generateAudio.supported && ["true", "false"].includes(source("videoGenerateAudio") || "") ? source("videoGenerateAudio") : String(profile.video.generateAudio.default),
            videoWatermark: profile.video.watermark.supported && ["true", "false"].includes(source("videoWatermark") || "") ? source("videoWatermark") : String(profile.video.watermark.default),
        };
    }

    return {};
}

export function maxModelInputCapacity(config: AiConfig, capability: "image" | "video", kind: "image" | "video" | "audio") {
    const options = selectableModelsByCapability(config, capability);
    if (!options.length) return null;
    return options.reduce((maximum, model) => {
        const profile = modelCapabilityConfigFor(config, model);
        const value =
            capability === "image" ? (kind === "image" ? profile.image!.references.maxImages : 0) : kind === "image" ? profile.video!.references.maxImages : kind === "video" ? profile.video!.references.maxVideos : profile.video!.references.maxAudios;
        return Math.max(maximum, value);
    }, 0);
}

export function modelGroupReferenceLimits(config: AiConfig, selected: string, capability: ModelCapability, requirements?: ModelRequirements): ModelReferenceLimits | undefined {
    if (capability !== "image" && capability !== "video") return undefined;
    const options = selectableModelsByCapability(config, capability);
    const selectedGroup = groupModelsByDisplayName(config, options).find((group) => group.models.includes(selected));
    const groupModels = selectedGroup?.models || (selected ? [selected] : []);
    if (!groupModels.length) return undefined;
    return groupModels.reduce<ModelReferenceLimits>(
        (limits, model) => {
            const profile = modelCapabilityConfigFor(config, model);
            const references = capability === "image" ? { maxImages: profile.image!.references.maxImages, maxVideos: 0, maxAudios: 0 } : profile.video!.references;
            if (!requirements) return { maxImages: Math.max(limits.maxImages, references.maxImages), maxVideos: Math.max(limits.maxVideos, references.maxVideos), maxAudios: Math.max(limits.maxAudios, references.maxAudios) };
            const cost = resolveModelChannel(config, model).modelCosts?.find((item) => item.model === modelOptionName(model));
            const specs = cost?.logicalCapabilityProfiles?.length ? cost.logicalCapabilityProfiles : cost?.logicalCapabilitySpec ? [cost.logicalCapabilitySpec] : [];
            for (const [key, kind, countKey] of [
                ["maxImages", "image", "imageCount"],
                ["maxVideos", "video", "videoCount"],
                ["maxAudios", "audio", "audioCount"],
            ] as const) {
                const input = requirements.input || { textCount: 0, imageCount: 0, videoCount: 0, audioCount: 0, characterCount: 0 };
                // Evaluate each real profile, not a Cartesian product of its union.
                // 1/2/3 cover the automatic video-operation boundaries.
                const candidates = [references[key], ...specs.map((spec) => spec.inputs?.[kind]?.max ?? 0), 1, 2, 3];
                for (const total of candidates) {
                    if (total <= limits[key] || total > references[key]) continue;
                    const count = total - (kind === "image" ? input.characterCount : 0);
                    if (count < 0) continue;
                    if (!modelCompatibilityError(config, model, { ...requirements, capability, allowIncompleteInputs: true, input: { ...input, [countKey]: count } })) limits[key] = total;
                }
            }
            return limits;
        },
        { maxImages: 0, maxVideos: 0, maxAudios: 0 },
    );
}

export function modelOptionAvailable(config: AiConfig, selected: string, requirements: ModelRequirements, name: string, value: unknown) {
    return Boolean(modelOptionSelection(config, selected, requirements, name, value));
}

/** Change coupled settings together in the editor; never rewrite them only at submission. */
export function modelOptionSelection(config: AiConfig, selected: string, requirements: ModelRequirements, name: string, value: unknown): Record<string, unknown> | undefined {
    const cost = resolveModelChannel(config, selected).modelCosts?.find((item) => item.model === modelOptionName(selected));
    const tierPriced = requirements.capability === "image" && cost?.logicalPriceTiers?.some((tier) => tier.selector.imageSizeTier) && cost.logicalPriceTiers.every((tier) => !tier.selector.quality);
    const coupled: Record<string, unknown> = { [name]: value };
    if (tierPriced) {
        if (name === "imageResolution" && imageTierQuality(value) && cost?.logicalCapabilitySpec?.options?.quality?.values?.includes(imageTierQuality(value))) coupled.quality = imageTierQuality(value);
        if (name === "quality") {
            const resolution = ({ low: "1K", medium: "2K", high: "4K" } as Record<string, string>)[String(value).toLowerCase()];
            if (resolution && cost?.logicalCapabilitySpec?.options?.imageResolution) coupled.imageResolution = resolution;
        }
    }
    const next = {
        ...requirements,
        allowIncompleteInputs: true,
        ...(name === "size" && requirements.capability === "image" ? { imageSize: String(value) } : {}),
        ...(name === "videoSeconds" ? { videoSeconds: String(value) } : {}),
        options: { ...requirements.options, ...coupled },
    };
    if (resolveCompatibleModel(config, selected, next)) return coupled;
    if (!requirements.capability) return undefined;
    const group = groupModelsByDisplayName(config, selectableModelsByCapability(config, requirements.capability)).find((item) => item.models.includes(selected));
    const patches: Record<string, unknown>[] = [];
    for (const model of group?.models || []) {
        const cost = resolveModelChannel(config, model).modelCosts?.find((item) => item.model === modelOptionName(model));
        const specs = cost?.logicalCapabilityProfiles || [];
        for (const spec of specs) {
            if (!spec.options?.[name] || !logicalOptionMatches(name, spec.options[name], value)) continue;
            const publicOptions = cost?.logicalCapabilitySpec?.options || {};
            const options: Record<string, unknown> = Object.fromEntries(Object.entries(next.options).filter(([key]) => Boolean(publicOptions[key])));
            const patch: Record<string, unknown> = { ...coupled };
            if (requirements.capability === "image") {
                const repaired = imageOptionsForProfile(spec, next.options);
                repaired[name] = String(value);
                if (logicalModelCompatibilityError(spec, { ...next, options: repaired, imageSize: String(repaired.size || "") }, (next.input?.imageCount || 0) + (next.input?.characterCount || 0))) continue;
                for (const [key, entry] of Object.entries(repaired)) if (entry !== next.options[key]) patch[key] = entry;
                patches.push(patch);
                continue;
            }
            for (const [key, constraint] of Object.entries(spec.options)) {
                if (key === name || options[key] === undefined || logicalOptionMatches(key, constraint, options[key])) continue;
                const fallback = constraint.values?.find((entry) => entry !== "*") ?? constraint.min;
                if (fallback === undefined) continue;
                options[key] = patch[key] = fallback;
            }
            const candidate = {
                ...next,
                options,
                videoSeconds: options.videoSeconds === undefined ? undefined : String(options.videoSeconds),
            };
            if (!logicalModelCompatibilityError(spec, candidate, (candidate.input?.imageCount || 0) + (candidate.input?.characterCount || 0))) patches.push(patch);
        }
    }
    return patches.sort((a, b) => Object.keys(a).length - Object.keys(b).length)[0];
}

function imageOptionsForProfile(spec: NonNullable<NonNullable<AiConfig["channels"][number]["modelCosts"]>[number]["logicalCapabilitySpec"]>, current: Record<string, unknown>): Record<string, string> {
    const result = Object.fromEntries(Object.entries(current).map(([name, value]) => [name, String(value)]));
    for (const name of ["size", "quality", "imageResolution", "count", "transparentBackground"]) {
        const constraint = spec.options?.[name];
        if (!constraint) {
            if (name === "quality" && spec.options?.imageResolution) continue;
            if (name === "imageResolution" && spec.options?.quality && imageTierQuality(result[name])) {
                result.quality = imageTierQuality(result[name]);
                continue;
            }
            result[name] = name === "quality" ? "auto" : name === "transparentBackground" ? "false" : "";
        } else if (!logicalOptionMatches(name, constraint, result[name])) {
            result[name] = String(constraint.values?.find((value) => value !== "*") ?? constraint.min ?? "");
        }
    }
    return result;
}

export function inferVideoOperation(input: ModelInputSummary) {
    const visualInputCount = input.imageCount + input.characterCount;
    // 图片或角色决定图生视频主模式，音频只作为附加参考，不应把组合请求
    // 提升为全模态参考；纯音频输入才使用独立的 audio_to_video 能力。
    if (input.videoCount > 0 || visualInputCount > 2) return "reference_to_video";
    if (visualInputCount > 0) return "image_to_video";
    if (input.audioCount > 0) return "audio_to_video";
    return "text_to_video";
}

export function resolveVideoOperation(input: ModelInputSummary, storedOperation?: string) {
    if (storedOperation && !["text_to_video", "image_to_video", "audio_to_video", "extend", "reference_to_video"].includes(storedOperation)) return storedOperation;
    return inferVideoOperation(input);
}

function videoOperationLabel(operation: string) {
    if (operation === "text_to_video") return "文生视频";
    if (operation === "image_to_video") return "图生视频";
    if (operation === "audio_to_video") return "音频生视频";
    if (operation === "reference_to_video") return "全模态参考";
    if (operation === "extend") return "视频续写";
    return "当前生成模式";
}
