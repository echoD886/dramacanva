// 模型积分定价预设表 —— 管理端「建议定价」与定价页积分参考的单一事实源。
// 1M 微积分 = 1 积分。这里的 $0.03/积分只是既有建议档的历史标定参数，
// 既不是对客固定积分价值，也不是美元/秒的收费承诺；实际扣费取后台价格档。
// evoLinkUsd 是用于成本对账的历史渠道数据，不是实时供应商报价。
// 本表的历史标定：渠道美元单位价 × 5 ÷ 0.03 = 积分单位价；与套餐汇率/折扣分开。
// 重要：EvoLink 各模型按自己的档位标价，档位支持不一致（如 Kling 3.0 无 480p、
// Seedream 5.0 Pro 无 4K、全站无 1440p 档）。已实测的模型在 preset 上直接记录
// resolutions/qualities 支持档位与 resolutionUsd/qualityUsd 各档实际美元价；
// 未实测的模型用倍率表估算，并按 resolutions/qualities 收敛展示档位。
// 视频模型统一 per_second 计费，图片模型 fixed_request（按张），文本模型 token 计价。

// 视频分辨率档：quality 按 720p 基准价折算。EvoLink 全站无 1440p 价格档，
// 1440p 仅作为后端能力枚举保留（如 MiniMax H3 的 2K 路线）。
// 与后端 arkVideoOutputPixels / price-tier vquality 选择器同一组规范键。
export const VIDEO_RESOLUTION_FACTORS: Record<string, number> = {
    "480p": 0.7,
    "720p": 1,
    "1080p": 1.3,
    "1440p": 1.5,
    "2160p": 2,
};

// 图片分辨率档：图片按张计费，quality（1k/2k/4k）越高成本越高。
// 与渠道模型 quality 选择器（grok-image / gpt-image 的 1k/2k/4k）同一组规范键。
export const IMAGE_QUALITY_FACTORS: Record<string, number> = {
    "1k": 1,
    "2k": 1.6,
    "4k": 2.5,
};

// 仅维持既有建议积分档计算，不能将此比例用于生成美元秒价宣传。
const USD_TO_CREDIT = 5 / 0.03;

function roundCredit(usd: number): number {
    return Math.round(usd * USD_TO_CREDIT * 100) / 100;
}

export type ModelPricePreset = {
    /** 模型显示名（用于定价页与提示文案） */
    label: string;
    capability: "video" | "image" | "text";
    /** 视频/图片：积分单位（积分/秒 或 积分/张）的基准价（720p / 1K 档）；文本不用 */
    unitPrice?: number;
    /** Approved customer credit price for each supported video resolution. */
    resolutionCredits?: Record<string, number>;
    /** 视频：该模型支持的分辨率档（缺省 = 全部档位）；如 Kling 3.0 只有 720p/1080p/4K */
    resolutions?: string[];
    /** 视频：已实测的各档实际 EvoLink 美元价（键同 VIDEO_RESOLUTION_FACTORS）；缺省用倍率估算 */
    resolutionUsd?: Record<string, number>;
    /** 图片：该模型支持的画质档（缺省 = 1k/2k/4k）；如 Seedream 5.0 Pro 只有 1k/2k */
    qualities?: string[];
    /** 已发布的各图片档用户积分价，优先于供应商成本推算。 */
    qualityCredits?: Record<string, number>;
    /** 图片：已实测的各档实际 EvoLink 美元价；缺省用倍率估算 */
    qualityUsd?: Record<string, number>;
    /** 文本：微积分 / 1M input token */
    inputTokenPrice?: number;
    /** 文本：微积分 / 1M output token */
    outputTokenPrice?: number;
    /** EvoLink 基准美元单价（美元/秒、美元/张 或 美元/1M），用于成本对账参考 */
    evoLinkUsd?: number;
};

/** 视频基准价按分辨率档折算；未知档位回退 720p 基准价。 */
export function videoPriceForResolution(preset: ModelPricePreset, resolution: string | undefined): number {
    const key = String(resolution || "").toLowerCase();
    const published = preset.resolutionCredits?.[key];
    if (published != null) return published;
    const measured = preset.resolutionUsd?.[key];
    if (measured != null) return roundCredit(measured);
    const base = preset.unitPrice || 0;
    const factor = VIDEO_RESOLUTION_FACTORS[key] ?? 1;
    return Math.round(base * factor * 100) / 100;
}

/** 图片基准价按质量档折算；未知档位回退 1K 基准价。 */
export function imagePriceForQuality(preset: ModelPricePreset, quality: string | undefined): number {
    const key = String(quality || "").toLowerCase();
    const published = preset.qualityCredits?.[key];
    if (published != null) return published;
    const measured = preset.qualityUsd?.[key];
    if (measured != null) return roundCredit(measured);
    const base = preset.unitPrice || 0;
    const factor = IMAGE_QUALITY_FACTORS[key] ?? 1;
    return Math.round(base * factor * 100) / 100;
}

// 命中键按 modelKey / providerModelKey 小写子串匹配（从上到下先到先得）。
// 带 resolutionUsd/qualityUsd 的是 2026-09-14 从 evolink.ai 模型页实测的价格；
// 用户扣分与渠道无关；以 v3 定价为基准，但必须满足：至尊档 $0.02/积分下最贵线路（含 EvoLink 兜底）毛利 ≥ 50%。
// 未实测的用倍率估算（720p/1K 基准 × VIDEO_RESOLUTION_FACTORS / IMAGE_QUALITY_FACTORS）。
export const MODEL_PRICE_PRESETS: Array<{ keys: string[]; preset: ModelPricePreset }> = [
    { keys: ["kling-4", "kling-video-v4"], preset: { label: "Kling 4", capability: "video", unitPrice: 4, resolutions: ["720p", "1080p"], resolutionCredits: { "720p": 4, "1080p": 5 } } },
    // 视频：per_second（unitPrice 为 720p 基准价，按档折算；支持档位收窄见各条 resolutions）
    // Kling 3.0 的 4K 与 720p/1080p 共用官方模型和按秒积分档。
    { keys: ["kling-3.0-pro", "kling_3_0_pro", "kling-3-pro"], preset: { label: "Kling 3.0 Pro", capability: "video", unitPrice: 8, resolutions: ["720p", "1080p", "2160p"], resolutionCredits: { "720p": 8, "1080p": 16, "2160p": 40 }, evoLinkUsd: 0.08 } },
    { keys: ["kling-3.0-turbo", "kling_3_0_turbo", "kling-3-turbo"], preset: { label: "Kling 3.0 Turbo", capability: "video", unitPrice: 11, resolutions: ["720p", "1080p"], resolutionCredits: { "720p": 11, "1080p": 22 }, evoLinkUsd: 0.106 } },
    { keys: ["kling"], preset: { label: "Kling 3.0", capability: "video", unitPrice: 8, resolutions: ["720p", "1080p", "2160p"], resolutionCredits: { "720p": 8, "1080p": 16, "2160p": 40 }, evoLinkUsd: 0.08 } },
    // Seedance 2.0 当前按已启用规格展示；Fast 只有 480p/720p。
    { keys: ["seedance-2.5", "seedance_2_5"], preset: { label: "Seedance 2.5", capability: "video", unitPrice: 30, resolutions: ["480p", "720p", "1080p"], resolutionCredits: { "480p": 14, "720p": 30, "1080p": 74 }, evoLinkUsd: 0.296 } },
    { keys: ["seedance-2.0-fast", "seedance_2_0_fast"], preset: { label: "Seedance 2.0 Fast", capability: "video", unitPrice: 17, resolutions: ["480p", "720p"], resolutionCredits: { "480p": 8, "720p": 17 }, evoLinkUsd: 0.161 } },
    { keys: ["seedance-2.0-mini", "seedance_2_0_mini"], preset: { label: "Seedance 2.0 Mini", capability: "video", unitPrice: 10, resolutions: ["480p", "720p"], resolutionCredits: { "480p": 7, "720p": 10 }, evoLinkUsd: 0.04 } },
    { keys: ["seedance-2.0", "seedance_2_0", "seedance-2", "seedance"], preset: { label: "Seedance 2.0", capability: "video", unitPrice: 20, resolutions: ["480p", "720p", "1080p"], resolutionCredits: { "480p": 10, "720p": 20, "1080p": 50 }, evoLinkUsd: 0.199 } },
    // Wan 3.0 按文档的用户售价计价；供应商 Prime 型号只作为内部线路。
    { keys: ["wan3.0", "wan-3.0", "wan_3_0", "wan3.0-prime", "wan-3.0-prime", "wan_3_0_prime"], preset: { label: "Wan 3.0", capability: "video", unitPrice: 12, resolutions: ["480p", "720p", "1080p"], resolutionCredits: { "480p": 6, "720p": 12, "1080p": 24 }, evoLinkUsd: 0.119 } },
    { keys: ["wan2.5", "wan-2.5", "wan_2_5"], preset: { label: "Wan 2.5", capability: "video", unitPrice: 6.33, resolutions: ["480p", "720p", "1080p"], evoLinkUsd: 0.038 } },
    { keys: ["minimax-h3-max", "minimax_h3_max"], preset: { label: "MiniMax H3 Max", capability: "video", unitPrice: 8, resolutions: ["480p", "768p"], resolutionCredits: { "480p": 5, "768p": 8 }, evoLinkUsd: 0.076 } },
    { keys: ["minimax-h3", "minimax_h3", "minimax"], preset: { label: "MiniMax H3", capability: "video", unitPrice: 8, resolutions: ["768p"], resolutionCredits: { "768p": 8 }, evoLinkUsd: 0.076 } },
    // Sora 2：实测完全不分分辨率档（只有 720p 一种尺寸），且 Pro 线已下架
    { keys: ["sora-2-pro", "sora_2_pro"], preset: { label: "Sora 2 Pro", capability: "video", unitPrice: 20, resolutions: ["720p"], evoLinkUsd: 0.12 } },
    { keys: ["sora-2", "sora_2", "sora2"], preset: { label: "Sora 2", capability: "video", unitPrice: 9, resolutions: ["720p"], resolutionCredits: { "720p": 9 }, evoLinkUsd: 0.085 } },
    // Veo 3.1 当前按已启用的 720p 与 1080p 展示。
    { keys: ["veo-3.1", "veo_3_1", "veo3.1"], preset: { label: "Veo 3.1", capability: "video", unitPrice: 12, resolutions: ["720p", "1080p"], resolutionCredits: { "720p": 12, "1080p": 30 }, evoLinkUsd: 0.298 } },
    { keys: ["grok-video-1.5", "grok_video_1_5"], preset: { label: "Grok Video 1.5", capability: "video", unitPrice: 9, resolutions: ["480p", "720p", "1080p"], evoLinkUsd: 0.054 } },
    { keys: ["grok-imagine-video", "grok-video", "grok_video"], preset: { label: "Grok Imagine Video 1.5", capability: "video", unitPrice: 10, resolutions: ["480p", "720p"], resolutionCredits: { "480p": 6, "720p": 10 }, evoLinkUsd: 0.098 } },
    { keys: ["hailuo", "hailuo_2_3"], preset: { label: "Hailuo 2.3", capability: "video", unitPrice: 9, resolutions: ["480p", "720p", "1080p"], evoLinkUsd: 0.054 } },
    { keys: ["omnihuman", "omni_human"], preset: { label: "OmniHuman 2", capability: "video", unitPrice: 8, evoLinkUsd: 0.048 } },
    { keys: ["topaz", "video-upscale", "video_upscale"], preset: { label: "Topaz Video Upscale", capability: "video", unitPrice: 10, evoLinkUsd: 0.06 } },
    // 图片：fixed_request 按张（unitPrice 为 1K 基准价，按档折算）
    { keys: ["nano-banana-pro", "nano_banana_pro", "nanobanana-pro"], preset: { label: "Nano Banana Pro", capability: "image", unitPrice: 16, qualities: ["1k"], qualityCredits: { "1k": 16 }, evoLinkUsd: 0.126 } },
    { keys: ["nano-banana-2.1"], preset: { label: "Nano Banana 2.1", capability: "image", unitPrice: 4, qualities: ["1k", "2k", "4k"], qualityCredits: { "1k": 4, "2k": 5, "4k": 6 } } },
    { keys: ["nano-banana-2", "nano_banana_2", "nanobanana-2"], preset: { label: "Nano Banana 2", capability: "image", unitPrice: 4, qualities: ["1k", "2k", "4k"], qualityCredits: { "1k": 4, "2k": 5, "4k": 6 }, evoLinkUsd: 0.141 } },
    { keys: ["nano-banana", "nano_banana", "nanobanana"], preset: { label: "Nano Banana", capability: "image", unitPrice: 4, qualities: ["1k", "2k", "4k"], qualityCredits: { "1k": 4, "2k": 5, "4k": 6 }, evoLinkUsd: 0.035 } },
    // Seedream 5.0 Pro：实测只有 1K/1.5K/2K（无 4K），2K 双倍
    { keys: ["seedream-5.0-pro", "seedream_5_0_pro"], preset: { label: "Seedream 5.0 Pro", capability: "image", unitPrice: 5.67, qualities: ["1k", "2k"], qualityUsd: { "1k": 0.034, "2k": 0.068 }, evoLinkUsd: 0.034 } },
    { keys: ["seedream-5.0", "seedream_5_0"], preset: { label: "Seedream 5.0", capability: "image", unitPrice: 4.67, qualities: ["1k", "2k", "4k"], evoLinkUsd: 0.028 } },
    { keys: ["seedream-4.5", "seedream_4_5"], preset: { label: "Seedream 4.5", capability: "image", unitPrice: 5, evoLinkUsd: 0.03 } },
    { keys: ["seedream", "seedream_4_0"], preset: { label: "Seedream", capability: "image", unitPrice: 3.83, evoLinkUsd: 0.023 } },
    { keys: ["grok-imagine-image", "grok-image", "grok_image"], preset: { label: "Grok Imagine Image 2.0", capability: "image", unitPrice: 3, qualities: ["1k"], qualityCredits: { "1k": 3 }, evoLinkUsd: 0.03 } },
    { keys: ["gpt-image-2.6", "gpt_image_2_6"], preset: { label: "GPT Image 2.6", capability: "image", unitPrice: 2, qualities: ["1k", "2k", "4k"], qualityCredits: { "1k": 2, "2k": 3, "4k": 4 } } },
    { keys: ["gpt-image-2.5", "gpt_image_2_5"], preset: { label: "GPT Image 2.5", capability: "image", unitPrice: 2, qualities: ["1k", "2k", "4k"], qualityCredits: { "1k": 2, "2k": 2, "4k": 4 }, evoLinkUsd: 0.035 } },
    { keys: ["gpt-image", "gpt_image"], preset: { label: "GPT Image 2", capability: "image", unitPrice: 5, qualities: ["1k"], qualityCredits: { "1k": 5 }, evoLinkUsd: 0.03 } },
    { keys: ["midjourney", "mid_journey"], preset: { label: "Midjourney V7", capability: "image", unitPrice: 4, qualities: ["standard"], qualityCredits: { "standard": 4 }, evoLinkUsd: 0.048 } },
    { keys: ["qwen-image", "qwen_image"], preset: { label: "Qwen Image", capability: "image", unitPrice: 4, evoLinkUsd: 0.024 } },
    { keys: ["krea", "z-image", "z_image"], preset: { label: "Krea / Z Image", capability: "image", unitPrice: 4, evoLinkUsd: 0.024 } },
    // 文本：token 计价（文本无分辨率维度，保持统一价）
    { keys: ["gpt-6", "gpt_6"], preset: { label: "GPT-6 级", capability: "text", inputTokenPrice: 10_000, outputTokenPrice: 40_000, evoLinkUsd: 1.2 } },
    { keys: ["claude-opus", "claude_opus"], preset: { label: "Claude Opus 级", capability: "text", inputTokenPrice: 8_350, outputTokenPrice: 41_700, evoLinkUsd: 1.25 } },
    { keys: ["claude"], preset: { label: "Claude Sonnet 级", capability: "text", inputTokenPrice: 8_350, outputTokenPrice: 33_400, evoLinkUsd: 1.0 } },
    { keys: ["deepseek-r1", "deepseek_r1", "deepseek-reasoner"], preset: { label: "推理模型（R1 类）", capability: "text", inputTokenPrice: 1_835, outputTokenPrice: 7_297, evoLinkUsd: 0.11 } },
    { keys: ["gpt-4o", "gpt_4o"], preset: { label: "普通模型（GPT-4o 级）", capability: "text", inputTokenPrice: 8_350, outputTokenPrice: 33_400, evoLinkUsd: 0.5 } },
    { keys: ["gemini", "deepseek-v4", "deepseek_v4"], preset: { label: "主流模型（Gemini/DeepSeek 级）", capability: "text", inputTokenPrice: 1_835, outputTokenPrice: 7_297, evoLinkUsd: 0.22 } },
    { keys: ["glm", "kimi", "qwen", "doubao", "grok-4"], preset: { label: "国产模型（GLM/Kimi/Qwen 级）", capability: "text", inputTokenPrice: 1_500, outputTokenPrice: 6_000, evoLinkUsd: 0.18 } },
];

export function matchModelPricePreset(modelKey: string | undefined): ModelPricePreset | undefined {
    const raw = String(modelKey || "").toLowerCase();
    if (!raw) return undefined;
    for (const entry of MODEL_PRICE_PRESETS) {
        if (entry.keys.some((key) => raw.includes(key))) return entry.preset;
    }
    return undefined;
}

// 视频分辨率/图片质量的建议价格档表：管理端一键填充按档展开，
// 定价页参考表按档位逐行展示，与渠道价格档的 vquality / quality 选择器对齐。
export type ResolutionPriceTierPreset = {
    /** 价格档选择器值：视频用 vquality（如 "720p"），图片用 quality（如 "2k"） */
    selectorValue: string;
    /** 该档积分单价（每秒 / 每张） */
    unitPrice: number;
};

export function videoTierPresets(preset: ModelPricePreset): ResolutionPriceTierPreset[] {
    const resolutions = preset.resolutions ?? Object.keys(VIDEO_RESOLUTION_FACTORS);
    return resolutions.map((resolution) => ({ selectorValue: resolution, unitPrice: videoPriceForResolution(preset, resolution) }));
}

export function imageTierPresets(preset: ModelPricePreset): ResolutionPriceTierPreset[] {
    const qualities = preset.qualities ?? Object.keys(IMAGE_QUALITY_FACTORS);
    return qualities.map((quality) => ({ selectorValue: quality, unitPrice: imagePriceForQuality(preset, quality) }));
}
