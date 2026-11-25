import { ownedPlan } from "@/lib/owned-pricing";
import { KLING4_COPY } from "@/content/kling4-copy";
import type { BlogLocale } from "@/content/blog-locales";
import { toTraditionalChinese } from "@/lib/i18n-traditional";

export const billingCurrencies = ["USD", "CNY", "HKD", "TWD", "EUR", "JPY", "KRW", "GBP"] as const;

export type BillingCurrency = (typeof billingCurrencies)[number];
export type BillingInterval = "monthly" | "annual";

export type CurrencyDefinition = {
    label: string;
    locale: string;
    rateFromUsd: number;
    maximumFractionDigits: number;
};

export type CreditTier = {
    productId: string;
    label: string;
    priceUsd: number;
    originalPriceUsd: number;
    baseCredits: number;
    bonusCredits: number;
};

export type SubscriptionPlan = {
    id: "starter" | "pro" | "studio";
    name: string;
    description: string;
    ribbon?: string;
    monthly: CreditTier[];
    annual: CreditTier[];
    benefits: string[];
    benefitNotes: string[];
};

export type CreditPack = {
    id: string;
    productId: string;
    name: string;
    priceUsd: number;
    originalPriceUsd: number;
    baseCredits: number;
    bonusCredits: number;
    featured?: boolean;
};

export type MembershipTierView = {
    key: "standard" | "advanced" | "premium" | "luxury" | "supreme";
    name: string;
    plan: SubscriptionPlan;
    tier: CreditTier;
};

export type GenerationExample = {
    id: string;
    model: string;
    specification: string;
    parameters: string;
    kind: "video" | "image";
};

export type PricingModelFamily = {
    label: string;
    kind: "video" | "image";
    models: string[];
    parameterSummary: string;
};

export type ModelRecommendation = {
    id: "quick-start" | "reference-to-video" | "ad-shot" | "consistent-assets" | "keyframe-edit" | "compare-video-styles";
    label: string;
    description: string;
    primaryModels: string[];
    alternativeModels: string[];
    rationale: string;
};

export const currencyDefinitions: Record<BillingCurrency, CurrencyDefinition> = {
    USD: { label: "美元 USD", locale: "en-US", rateFromUsd: 1, maximumFractionDigits: 2 },
    CNY: { label: "人民币 CNY", locale: "zh-CN", rateFromUsd: 7.15, maximumFractionDigits: 0 },
    HKD: { label: "港币 HKD", locale: "zh-HK", rateFromUsd: 7.8, maximumFractionDigits: 0 },
    TWD: { label: "新台币 TWD", locale: "zh-TW", rateFromUsd: 32.1, maximumFractionDigits: 0 },
    EUR: { label: "欧元 EUR", locale: "de-DE", rateFromUsd: 0.92, maximumFractionDigits: 2 },
    JPY: { label: "日元 JPY", locale: "ja-JP", rateFromUsd: 147, maximumFractionDigits: 0 },
    KRW: { label: "韩元 KRW", locale: "ko-KR", rateFromUsd: 1_350, maximumFractionDigits: 0 },
    GBP: { label: "英镑 GBP", locale: "en-GB", rateFromUsd: 0.77, maximumFractionDigits: 2 },
};

const starterBenefits = [
    "Seedance 视频起稿与常用图片生成",
    "短视频文生视频和轻量图生视频",
    "提交前查看模型参数与最终扣费",
    "比例与时长参数控制",
    "多参考图与主体 / 风格控制",
    "生成记录与积分流水",
    "上游明确失败时退回预留积分",
    "AI 编导可规划分镜，生成前逐项确认图片和视频费用",
    "参考图、分镜脚本与生成结果可在画布中串联",
];

const starterNotes = [
    "适合快速草稿、封面图、短镜头和低风险创意测试。",
    "只有文字时直接文生视频；上传参考图后，系统会进入更适合图片参考的生成方式。",
    "生成前会展示当前模型支持的参数和本次最终扣费。",
    "提交前可以选择常见比例和当前模型支持的时长。",
    "可以上传多张参考图，并在提示词里说明每张图负责主体、风格还是构图。",
    "生成记录会保留本次消耗和任务状态，方便回看。",
    "上游明确返回失败时，系统会退回本次预留积分；状态不明的任务进入待核对。",
];

const proBenefits = [
    "更高积分额度支持持续制作",
    "稳定短视频与广告素材生产",
    "文字、参考图、首帧与尾帧自动匹配",
    "首帧、首尾帧与多参考素材工作流",
    "参考提示词、比例、时长与清晰度控制",
    "720p 交付预览",
    "生成结果可继续添加到画布",
    "上游明确失败时退回预留积分",
    "任务中心同步生成状态",
    "AI 编导可拆解多镜头脚本并列出完整生成预算",
    "角色参考图、关键帧和视频镜头可接入同一画布",
];

const proNotes = [
    "按当前套餐的积分额度规划持续制作。",
    "面向持续短视频、广告变体和产品场景创作。",
    "系统会根据素材自动判断文字、图片、首帧或首尾帧输入方式。",
    "一张图可作首帧，两张图可作首尾帧，多张图可作为参考素材。",
    "生成前可设置参考模式、画面比例、时长和清晰度。",
    "需要更清晰的评审稿或客户预览时可以使用 720p。",
    "完成的生成结果可以直接带入画布继续编排。",
    "上游明确返回失败时，系统会退回本次预留积分；状态不明的任务进入待核对。",
    "任务中心统一展示排队、执行、结算和待核对状态。",
];

const studioBenefits = [
    "批量商业内容生产",
    "更高积分额度覆盖集中生产任务",
    "多项目参考素材工作流",
    "广告、商品与品牌素材批量补量",
    "Seedance、可灵、MiniMax、Wan、Grok 与图片模型共享积分",
    "可复用参考素材库",
    "积分历史与失败任务核对",
    "生成结果与画布项目联动",
    "AI 编导的分镜规划、素材报价与生成审批",
    "多镜头任务可在画布中继续编排和调整",
];

const studioNotes = [
    "适合团队、代理商和商业内容排期。",
    "适合商品图、营销变体和固定创意格式的批量生产。",
    "参考素材流程更适合复用产品、角色和品牌风格。",
    "更高积分档位适合集中制作广告变体、商品图和系列短视频。",
    "模型菜单会展示可用参数，提交前会更新本次消耗。",
    "复用参考素材可帮助多次生成保持视觉一致。",
    "生成结果可进入画布，并与项目、任务和素材记录继续联动。",
];

export const subscriptionPlans: SubscriptionPlan[] = [
    {
        id: "starter",
        name: "入门版",
        description: "入门基础创作通道",
        monthly: [
            {
                productId: "starter_monthly",
                label: String(ownedPlan("standard").monthly.credits),
                priceUsd: ownedPlan("standard").monthly.amountMinor / 100,
                originalPriceUsd: ownedPlan("standard").monthly.amountMinor / 100,
                baseCredits: ownedPlan("standard").monthly.credits,
                bonusCredits: 0,
            },
        ],
        annual: [
            {
                productId: "starter_yearly",
                label: String(ownedPlan("standard").annual.credits),
                priceUsd: ownedPlan("standard").annual.amountMinor / 100,
                originalPriceUsd: ownedPlan("standard").annual.amountMinor / 100,
                baseCredits: ownedPlan("standard").annual.credits,
                bonusCredits: 0,
            },
        ],
        benefits: starterBenefits,
        benefitNotes: starterNotes,
    },
    {
        id: "pro",
        name: "进阶版",
        description: "专业创作积分通道",
        ribbon: "高性价比档位",
        monthly: [
            {
                productId: "pro_monthly",
                label: String(ownedPlan("advanced").monthly.credits),
                priceUsd: ownedPlan("advanced").monthly.amountMinor / 100,
                originalPriceUsd: ownedPlan("advanced").monthly.amountMinor / 100,
                baseCredits: ownedPlan("advanced").monthly.credits,
                bonusCredits: 0,
            },
            {
                productId: "pro_monthly_plus",
                label: String(ownedPlan("premium").monthly.credits),
                priceUsd: ownedPlan("premium").monthly.amountMinor / 100,
                originalPriceUsd: ownedPlan("premium").monthly.amountMinor / 100,
                baseCredits: ownedPlan("premium").monthly.credits,
                bonusCredits: 0,
            },
            {
                productId: "pro_monthly_max",
                label: String(ownedPlan("luxury").monthly.credits),
                priceUsd: ownedPlan("luxury").monthly.amountMinor / 100,
                originalPriceUsd: ownedPlan("luxury").monthly.amountMinor / 100,
                baseCredits: ownedPlan("luxury").monthly.credits,
                bonusCredits: 0,
            },
        ],
        annual: [
            {
                productId: "pro_yearly",
                label: String(ownedPlan("advanced").annual.credits),
                priceUsd: ownedPlan("advanced").annual.amountMinor / 100,
                originalPriceUsd: ownedPlan("advanced").annual.amountMinor / 100,
                baseCredits: ownedPlan("advanced").annual.credits,
                bonusCredits: 0,
            },
            {
                productId: "pro_yearly_plus",
                label: String(ownedPlan("premium").annual.credits),
                priceUsd: ownedPlan("premium").annual.amountMinor / 100,
                originalPriceUsd: ownedPlan("premium").annual.amountMinor / 100,
                baseCredits: ownedPlan("premium").annual.credits,
                bonusCredits: 0,
            },
            {
                productId: "pro_yearly_max",
                label: String(ownedPlan("luxury").annual.credits),
                priceUsd: ownedPlan("luxury").annual.amountMinor / 100,
                originalPriceUsd: ownedPlan("luxury").annual.amountMinor / 100,
                baseCredits: ownedPlan("luxury").annual.credits,
                bonusCredits: 0,
            },
        ],
        benefits: proBenefits,
        benefitNotes: proNotes,
    },
    {
        id: "studio",
        name: "工作室版",
        description: "工作室批量生产通道",
        monthly: [
            {
                productId: "enterprise_monthly",
                label: String(ownedPlan("supreme").monthly.credits),
                priceUsd: ownedPlan("supreme").monthly.amountMinor / 100,
                originalPriceUsd: ownedPlan("supreme").monthly.amountMinor / 100,
                baseCredits: ownedPlan("supreme").monthly.credits,
                bonusCredits: 0,
            },
        ],
        annual: [
            {
                productId: "enterprise_yearly",
                label: String(ownedPlan("supreme").annual.credits),
                priceUsd: ownedPlan("supreme").annual.amountMinor / 100,
                originalPriceUsd: ownedPlan("supreme").annual.amountMinor / 100,
                baseCredits: ownedPlan("supreme").annual.credits,
                bonusCredits: 0,
            },
        ],
        benefits: studioBenefits,
        benefitNotes: studioNotes,
    },
];

export const creditPacks: CreditPack[] = [
    { id: "small", productId: "credits_small", name: "入门积分包", priceUsd: 29.9, originalPriceUsd: 54, baseCredits: 860, bonusCredits: 140 },
    { id: "medium", productId: "credits_medium", name: "项目积分包", priceUsd: 119.9, originalPriceUsd: 218, baseCredits: 3_900, bonusCredits: 600, featured: true },
    { id: "large", productId: "credits_large", name: "工作室积分包", priceUsd: 299, originalPriceUsd: 544, baseCredits: 10_000, bonusCredits: 1_600 },
];

export const channelServiceAnnualPriceUsd = 14.99;
export const teamSeatLimits = { min: 2, max: 50 } as const;

export const generationExamples: GenerationExample[] = [
    { id: "kling-4", model: "Kling 4", specification: KLING4_COPY["zh-CN"].specification, parameters: KLING4_COPY["zh-CN"].parameters + " " + KLING4_COPY["zh-CN"].price, kind: "video" },
    {
        id: "seedance-2-0",
        model: "Seedance 2.0",
        specification: "480p / 720p / 1080p · 4–15 秒；720p 最长 30 秒",
        parameters: "6 种比例；最多 9 张参考图、3 段参考视频、3 段参考音频",
        kind: "video",
    },
    {
        id: "seedance-2-5",
        model: "Seedance 2.5",
        specification: "480p / 720p / 1080p · 4–30 秒",
        parameters: "6 种比例；最多 30 张参考图、10 段参考音频；不支持参考视频",
        kind: "video",
    },
    {
        id: "kling-3",
        model: "Kling 3.0",
        specification: "720p / 1080p / 4K · 3–15 秒",
        parameters: "16:9 / 9:16 / 1:1；2 张图做首尾帧；无参考视频或音频；运动控制 3–30 秒；720p 可开声音",
        kind: "video",
    },
    { id: "kling-3-turbo", model: "Kling 3.0 Turbo", specification: "720p / 1080p · 3–15 秒", parameters: "16:9 / 9:16 / 1:1; 1 张图做首帧；不支持参考视频或音频；无声", kind: "video" },
    { id: "seedance-2-0-fast", model: "Seedance 2.0 Fast", specification: "480p / 720p · 4–15 秒", parameters: "6 种比例；最多 9 张参考图、3 段参考视频、3 段参考音频", kind: "video" },
    { id: "seedance-2-0-mini", model: "Seedance 2.0 Mini", specification: "480p / 720p · 4–15 秒", parameters: "6 种比例；最多 9 张参考图、3 段参考音频；不支持参考视频", kind: "video" },
    {
        id: "minimax-h3",
        model: "MiniMax H3",
        specification: "480p / 768p / 1080p · 4–30 秒；1080p 最长 15 秒",
        parameters: "6 种比例；1 张图做首帧；不支持参考视频或音频",
        kind: "video",
    },
    { id: "minimax-h3-max", model: "MiniMax H3 Max", specification: "480p / 720p / 768p · 4–15 秒", parameters: "6 种比例；1 张图做首帧；不支持参考视频或音频", kind: "video" },
    {
        id: "wan-3",
        model: "Wan 3.0",
        specification: "480p / 720p / 1080p · 2–30 秒",
        parameters: "6 种比例；最多 10 张参考图、5 段参考视频、5 段参考音频",
        kind: "video",
    },
    {
        id: "grok-imagine-video-1-5",
        model: "Grok Imagine Video 1.5",
        specification: "480p / 720p / 1080p · 4–15 秒",
        parameters: "6 种比例；最多 7 张参考图；不支持参考视频",
        kind: "video",
    },
    { id: "sora-2", model: "Sora 2", specification: "720p · 4 / 8 / 12 秒", parameters: "16:9 / 9:16; 最多 1 张参考图；不支持参考视频", kind: "video" },
    { id: "veo-3-1", model: "Veo 3.1", specification: "720p · 8 秒；1080p · 8 或 10 秒", parameters: "横 / 竖；1 张图做首帧；不支持参考视频或音频", kind: "video" },
    { id: "gpt-image-2", model: "GPT Image 2", specification: "1K / 2K / 4K", parameters: "15 种比例；最多 3 张参考图；不支持透明背景", kind: "image" },
    {
        id: "gpt-image-2-5",
        model: "GPT Image 2.5",
        specification: "1K / 2K / 4K",
        parameters: "15 种比例；最多 8 张参考图；支持透明背景",
        kind: "image",
    },
    {
        id: "gpt-image-2-6",
        model: "GPT Image 2.6",
        specification: "1K / 2K / 4K",
        parameters: "15 种比例；最多 8 张参考图；支持透明背景",
        kind: "image",
    },
    {
        id: "nano-banana",
        model: "Nano Banana",
        specification: "1K / 2K / 4K · 生成与编辑",
        parameters: "可选比例与参考图；具体参数在生成前展示",
        kind: "image",
    },
    { id: "nano-banana-2", model: "Nano Banana 2", specification: "1K / 2K / 4K", parameters: "10 种比例；最多 8 张参考图；不支持透明背景", kind: "image" },
    { id: "nano-banana-2.1", model: "Nano Banana 2.1", specification: "1K / 2K / 4K", parameters: "10 种比例；最多 8 张参考图；不支持透明背景", kind: "image" },
    { id: "nano-banana-pro", model: "Nano Banana Pro", specification: "1K / 2K / 4K", parameters: "10 种比例；最多 8 张参考图；不支持透明背景", kind: "image" },
    { id: "midjourney-v7", model: "Midjourney V7", specification: "8 种比例", parameters: "不支持透明背景", kind: "image" },
    {
        id: "grok-imagine-image",
        model: "Grok Imagine Image 2.0",
        specification: "1K · 1:1 画幅",
        parameters: "文生 / 图生图；最多 3 张参考图",
        kind: "image",
    },
];

type LocalizedGenerationCopy = Pick<GenerationExample, "specification" | "parameters">;

type DirectPricingLocale = "en-US" | "ja-JP" | "ko-KR" | "es-ES";

const localizedMembershipBenefitCopy: Record<DirectPricingLocale, Record<SubscriptionPlan["id"], string[]>> = {
    "en-US": {
        starter: [
            "Seedance video drafts and everyday image generation",
            "Short text-to-video and lightweight image-to-video workflows",
            "Review model settings and confirmed credit cost before submitting",
            "Plan storyboards with the AI director and approve image and video costs before generation",
            "Connect references, scripts and results on the canvas",
        ],
        pro: [
            "More period credits for ongoing production",
            "Reliable short-form video and ad-asset production",
            "Text, references, first frames and final frames work together",
            "Break down multi-shot scripts and review the full generation budget",
            "Use character references, keyframes and video shots on one canvas",
        ],
        studio: [
            "Batch production for commercial content",
            "Higher credit capacity for concentrated production runs",
            "Reference-asset workflows across multiple projects",
            "Review storyboard plans, asset quotes and generation approvals with the AI director",
            "Continue arranging and refining multi-shot work on the canvas",
        ],
    },
    "ja-JP": {
        starter: [
            "Seedance の動画初稿と定番画像生成",
            "短尺のテキスト動画・軽量な画像動画生成",
            "送信前にモデル設定と見込みクレジット消費を確認",
            "AI 監督で絵コンテを計画し、画像・動画の費用を生成前に確認",
            "参考画像、脚本、生成結果をキャンバス上で接続",
        ],
        pro: ["継続制作に使えるより多くのポイント", "安定した短尺動画・広告素材の継続制作", "テキスト・参考画像・開始／終了フレームをまとめて活用", "複数ショットの脚本と生成予算を確認", "キャラクター参考画像、キーフレーム、動画を同じキャンバスで活用"],
        studio: ["商用コンテンツをまとめて制作", "集中制作を支える高いクレジット枠", "複数プロジェクトの参照素材ワークフロー", "AI 監督の絵コンテ、素材見積もり、生成承認を確認", "複数ショットをキャンバス上で編集・調整"],
    },
    "ko-KR": {
        starter: [
            "Seedance 영상 초안과 일상 이미지 생성",
            "짧은 텍스트-투-비디오 및 가벼운 이미지-투-비디오 워크플로",
            "제출 전에 모델 설정과 확정 크레딧 비용 확인",
            "AI 감독으로 스토리보드를 계획하고 생성 전 이미지·영상 비용 확인",
            "참조 이미지, 대본, 생성 결과를 캔버스에서 연결",
        ],
        pro: ["지속적인 제작을 위한 더 많은 기간 크레딧", "안정적인 숏폼 영상 및 광고 에셋 제작", "텍스트·참조 이미지·시작/종료 프레임을 함께 활용", "여러 장면의 대본과 전체 생성 예산 확인", "캐릭터 참조 이미지, 키프레임, 영상을 한 캔버스에서 활용"],
        studio: ["상업용 콘텐츠 일괄 제작", "집중 제작을 위한 더 높은 크레딧 한도", "여러 프로젝트에 걸친 참조 에셋 워크플로", "AI 감독의 스토리보드, 에셋 견적, 생성 승인 확인", "여러 장면을 캔버스에서 계속 편집하고 조정"],
    },
    "es-ES": {
        starter: [
            "Borradores de vídeo Seedance y generación cotidiana de imágenes",
            "Flujos breves de texto a vídeo y de imagen a vídeo",
            "Revisa la configuración del modelo y el coste confirmado antes de enviar",
            "Planifica guiones gráficos con el agente y confirma el coste de imágenes y vídeos antes de generar",
            "Conecta referencias, guiones y resultados en el lienzo",
        ],
        pro: [
            "Más créditos del periodo para una producción continua",
            "Producción estable de vídeo corto y recursos publicitarios",
            "Texto, referencias y fotogramas iniciales/finales trabajan juntos",
            "Desglosa guiones de varias tomas y revisa el presupuesto completo",
            "Usa referencias de personajes, fotogramas clave y vídeos en un mismo lienzo",
        ],
        studio: [
            "Producción por lotes de contenido comercial",
            "Mayor capacidad de créditos para periodos de producción concentrada",
            "Flujos de recursos de referencia para varios proyectos",
            "Revisa planes, presupuestos y aprobaciones de generación con el agente",
            "Organiza y ajusta trabajos de varias tomas en el lienzo",
        ],
    },
};

const localizedGenerationCopy: Record<string, LocalizedGenerationCopy> = {
    "seedance-2-0": { specification: "480p / 720p / 1080p · 4–15 sec; 720p up to 30 sec", parameters: "6 aspect ratios; Up to 9 reference images, 3 reference videos, 3 reference audios" },
    "seedance-2-0-fast": { specification: "480p / 720p · 4–15 sec", parameters: "6 aspect ratios; Up to 9 reference images, 3 reference videos, 3 reference audios" },
    "seedance-2-0-mini": { specification: "480p / 720p · 4–15 sec", parameters: "6 aspect ratios; Up to 9 reference images, 3 reference audios; no reference video" },
    "seedance-2-5": { specification: "480p / 720p / 1080p · 4–30 sec", parameters: "6 aspect ratios; Up to 30 reference images, 10 reference audios; no reference video" },
    "kling-3": { specification: "720p / 1080p / 4K · 3–15 sec", parameters: "16:9 / 9:16 / 1:1; 2 images as start/end frames; no reference video or audio; motion control 3–30 sec; optional sound at 720p" },
    "kling-3-turbo": { specification: "720p / 1080p · 3–15 sec", parameters: "16:9 / 9:16 / 1:1; 1 image as start frame; no reference video or audio; No sound" },
    "minimax-h3": { specification: "480p / 768p / 1080p · 4–30 sec; 1080p up to 15 sec", parameters: "6 aspect ratios; 1 image as start frame; no reference video or audio" },
    "minimax-h3-max": { specification: "480p / 720p / 768p · 4–15 sec", parameters: "6 aspect ratios; 1 image as start frame; no reference video or audio" },
    "wan-3": { specification: "480p / 720p / 1080p · 2–30 sec", parameters: "6 aspect ratios; Up to 10 reference images, 5 reference videos, 5 reference audios" },
    "grok-imagine-video-1-5": { specification: "480p / 720p / 1080p · 4–15 sec", parameters: "6 aspect ratios; Up to 7 reference images; no reference video" },
    "sora-2": { specification: "720p · 4 / 8 / 12 sec", parameters: "16:9 / 9:16; Up to 1 reference image; no reference video" },
    "veo-3-1": { specification: "720p · 8 sec; 1080p · 8 or 10 sec", parameters: "Landscape / portrait; 1 image as start frame; no reference video or audio" },
    "gpt-image-2": { specification: "1K / 2K / 4K", parameters: "15 aspect ratios; Up to 3 reference images; No transparent background" },
    "gpt-image-2-5": { specification: "1K / 2K / 4K", parameters: "15 aspect ratios; Up to 8 reference images; Transparent background supported" },
    "gpt-image-2-6": { specification: "1K / 2K / 4K", parameters: "15 aspect ratios; Up to 8 reference images; Transparent background supported" },
    "nano-banana-2": { specification: "1K / 2K / 4K", parameters: "10 aspect ratios; Up to 8 reference images; No transparent background" },
    "nano-banana-2.1": { specification: "1K / 2K / 4K", parameters: "10 aspect ratios; Up to 8 reference images; No transparent background" },
    "nano-banana-pro": { specification: "1K / 2K / 4K", parameters: "10 aspect ratios; Up to 8 reference images; No transparent background" },
    "midjourney-v7": { specification: "8 aspect ratios", parameters: "No transparent background" },
    "nano-banana": { specification: "1K / 2K / 4K · generate and edit", parameters: "Aspect ratio and reference images; settings appear before generation" },
    "grok-imagine-image": { specification: "1K · 1:1 ratio", parameters: "Text or image to image; up to 3 reference images" },
};

const localizedCapabilityCopy: Record<"ja-JP" | "ko-KR" | "es-ES" | "pt-BR", Record<string, LocalizedGenerationCopy>> = {
    "ja-JP": {
        "seedance-2-0": { specification: "480p / 720p / 1080p · 4–15 秒；720pは最長30秒", parameters: "6種類の比率; 参考画像9枚・参考動画3本・参考音声3本まで" },
        "seedance-2-0-fast": { specification: "480p / 720p · 4–15 秒", parameters: "6種類の比率; 参考画像9枚・参考動画3本・参考音声3本まで" },
        "seedance-2-0-mini": { specification: "480p / 720p · 4–15 秒", parameters: "6種類の比率; 参考画像9枚・参考音声3本まで；参考動画非対応" },
        "seedance-2-5": { specification: "480p / 720p / 1080p · 4–30 秒", parameters: "6種類の比率; 参考画像30枚・参考音声10本まで；参考動画非対応" },
        "kling-3": { specification: "720p / 1080p / 4K · 3–15 秒", parameters: "16:9 / 9:16 / 1:1；開始・終了画像2枚；参考動画・音声非対応；モーション制御3–30秒；720pは音声出力を選択可能" },
        "kling-3-turbo": { specification: "720p / 1080p · 3–15 秒", parameters: "16:9 / 9:16 / 1:1; 開始画像1枚；参考動画・音声非対応; 音声出力なし" },
        "minimax-h3": { specification: "480p / 768p / 1080p · 4–30 秒；1080pは最長15秒", parameters: "6種類の比率; 開始画像1枚；参考動画・音声非対応" },
        "minimax-h3-max": { specification: "480p / 720p / 768p · 4–15 秒", parameters: "6種類の比率; 開始画像1枚；参考動画・音声非対応" },
        "wan-3": { specification: "480p / 720p / 1080p · 2–30 秒", parameters: "6種類の比率; 参考画像10枚・参考動画5本・参考音声5本まで" },
        "grok-imagine-video-1-5": { specification: "480p / 720p / 1080p · 4–15 秒", parameters: "6種類の比率; 参考画像7枚まで；参考動画非対応" },
        "sora-2": { specification: "720p · 4 / 8 / 12 秒", parameters: "16:9 / 9:16; 参考画像1枚まで；参考動画非対応" },
        "veo-3-1": { specification: "720p · 8秒；1080p · 8秒または10秒", parameters: "横 / 縦; 開始画像1枚；参考動画・音声非対応" },
        "gpt-image-2": { specification: "1K / 2K / 4K", parameters: "15種類の比率; 参考画像3枚まで; 透明背景非対応" },
        "gpt-image-2-5": { specification: "1K / 2K / 4K", parameters: "15種類の比率; 参考画像8枚まで; 透明背景対応" },
        "gpt-image-2-6": { specification: "1K / 2K / 4K", parameters: "15種類の比率; 参考画像8枚まで; 透明背景対応" },
        "nano-banana-2": { specification: "1K / 2K / 4K", parameters: "10種類の比率; 参考画像8枚まで; 透明背景非対応" },
        "nano-banana-2.1": { specification: "1K / 2K / 4K", parameters: "10種類の比率; 参考画像8枚まで; 透明背景非対応" },
        "nano-banana-pro": { specification: "1K / 2K / 4K", parameters: "10種類の比率; 参考画像8枚まで; 透明背景非対応" },
        "midjourney-v7": { specification: "8種類の比率", parameters: "透明背景非対応" },
    },
    "ko-KR": {
        "seedance-2-0": { specification: "480p / 720p / 1080p · 4–15초; 720p 최대 30초", parameters: "6가지 비율; 참조 이미지 최대 9장, 참조 영상 3개, 참조 음성 3개" },
        "seedance-2-0-fast": { specification: "480p / 720p · 4–15초", parameters: "6가지 비율; 참조 이미지 최대 9장, 참조 영상 3개, 참조 음성 3개" },
        "seedance-2-0-mini": { specification: "480p / 720p · 4–15초", parameters: "6가지 비율; 참조 이미지 최대 9장, 참조 음성 3개; 참조 영상 미지원" },
        "seedance-2-5": { specification: "480p / 720p / 1080p · 4–30초", parameters: "6가지 비율; 참조 이미지 최대 30장, 참조 음성 10개; 참조 영상 미지원" },
        "kling-3": { specification: "720p / 1080p / 4K · 3–15초", parameters: "16:9 / 9:16 / 1:1; 시작·종료 이미지 2장; 참조 영상·음성 미지원; 모션 제어 3–30초; 720p 음성 출력 선택 가능" },
        "kling-3-turbo": { specification: "720p / 1080p · 3–15초", parameters: "16:9 / 9:16 / 1:1; 시작 프레임 이미지 1장; 참조 영상·음성 미지원; 음성 출력 없음" },
        "minimax-h3": { specification: "480p / 768p / 1080p · 4–30초; 1080p 최대 15초", parameters: "6가지 비율; 시작 프레임 이미지 1장; 참조 영상·음성 미지원" },
        "minimax-h3-max": { specification: "480p / 720p / 768p · 4–15초", parameters: "6가지 비율; 시작 프레임 이미지 1장; 참조 영상·음성 미지원" },
        "wan-3": { specification: "480p / 720p / 1080p · 2–30초", parameters: "6가지 비율; 참조 이미지 최대 10장, 참조 영상 5개, 참조 음성 5개" },
        "grok-imagine-video-1-5": { specification: "480p / 720p / 1080p · 4–15초", parameters: "6가지 비율; 참조 이미지 최대 7장; 참조 영상 미지원" },
        "sora-2": { specification: "720p · 4 / 8 / 12초", parameters: "16:9 / 9:16; 참조 이미지 최대 1장; 참조 영상 미지원" },
        "veo-3-1": { specification: "720p · 8초; 1080p · 8초 또는 10초", parameters: "가로 / 세로; 시작 프레임 이미지 1장; 참조 영상·음성 미지원" },
        "gpt-image-2": { specification: "1K / 2K / 4K", parameters: "15가지 비율; 참조 이미지 최대 3장; 투명 배경 미지원" },
        "gpt-image-2-5": { specification: "1K / 2K / 4K", parameters: "15가지 비율; 참조 이미지 최대 8장; 투명 배경 지원" },
        "gpt-image-2-6": { specification: "1K / 2K / 4K", parameters: "15가지 비율; 참조 이미지 최대 8장; 투명 배경 지원" },
        "nano-banana-2": { specification: "1K / 2K / 4K", parameters: "10가지 비율; 참조 이미지 최대 8장; 투명 배경 미지원" },
        "nano-banana-2.1": { specification: "1K / 2K / 4K", parameters: "10가지 비율; 참조 이미지 최대 8장; 투명 배경 미지원" },
        "nano-banana-pro": { specification: "1K / 2K / 4K", parameters: "10가지 비율; 참조 이미지 최대 8장; 투명 배경 미지원" },
        "midjourney-v7": { specification: "8가지 비율", parameters: "투명 배경 미지원" },
    },
    "es-ES": {
        "seedance-2-0": { specification: "480p / 720p / 1080p · 4–15 s; 720p hasta 30 s", parameters: "6 proporciones; Hasta 9 imágenes, 3 vídeos y 3 audios de referencia" },
        "seedance-2-0-fast": { specification: "480p / 720p · 4–15 s", parameters: "6 proporciones; Hasta 9 imágenes, 3 vídeos y 3 audios de referencia" },
        "seedance-2-0-mini": { specification: "480p / 720p · 4–15 s", parameters: "6 proporciones; Hasta 9 imágenes y 3 audios de referencia; sin vídeo de referencia" },
        "seedance-2-5": { specification: "480p / 720p / 1080p · 4–30 s", parameters: "6 proporciones; Hasta 30 imágenes y 10 audios de referencia; sin vídeo de referencia" },
        "kling-3": { specification: "720p / 1080p / 4K · 3–15 s", parameters: "16:9 / 9:16 / 1:1; 2 imágenes como fotogramas inicial/final; sin vídeo ni audio de referencia; control de movimiento de 3–30 s; sonido opcional en 720p" },
        "kling-3-turbo": { specification: "720p / 1080p · 3–15 s", parameters: "16:9 / 9:16 / 1:1; 1 imagen como fotograma inicial; sin vídeo ni audio de referencia; Sin sonido" },
        "minimax-h3": { specification: "480p / 768p / 1080p · 4–30 s; 1080p hasta 15 s", parameters: "6 proporciones; 1 imagen como fotograma inicial; sin vídeo ni audio de referencia" },
        "minimax-h3-max": { specification: "480p / 720p / 768p · 4–15 s", parameters: "6 proporciones; 1 imagen como fotograma inicial; sin vídeo ni audio de referencia" },
        "wan-3": { specification: "480p / 720p / 1080p · 2–30 s", parameters: "6 proporciones; Hasta 10 imágenes, 5 vídeos y 5 audios de referencia" },
        "grok-imagine-video-1-5": { specification: "480p / 720p / 1080p · 4–15 s", parameters: "6 proporciones; Hasta 7 imágenes de referencia; sin vídeo de referencia" },
        "sora-2": { specification: "720p · 4 / 8 / 12 s", parameters: "16:9 / 9:16; Hasta 1 imagen de referencia; sin vídeo de referencia" },
        "veo-3-1": { specification: "720p · 8 s; 1080p · 8 o 10 s", parameters: "Horizontal / vertical; 1 imagen como fotograma inicial; sin vídeo ni audio de referencia" },
        "gpt-image-2": { specification: "1K / 2K / 4K", parameters: "15 proporciones; Hasta 3 imágenes de referencia; Sin fondo transparente" },
        "gpt-image-2-5": { specification: "1K / 2K / 4K", parameters: "15 proporciones; Hasta 8 imágenes de referencia; Fondo transparente disponible" },
        "gpt-image-2-6": { specification: "1K / 2K / 4K", parameters: "15 proporciones; Hasta 8 imágenes de referencia; Fondo transparente disponible" },
        "nano-banana-2": { specification: "1K / 2K / 4K", parameters: "10 proporciones; Hasta 8 imágenes de referencia; Sin fondo transparente" },
        "nano-banana-2.1": { specification: "1K / 2K / 4K", parameters: "10 proporciones; Hasta 8 imágenes de referencia; Sin fondo transparente" },
        "nano-banana-pro": { specification: "1K / 2K / 4K", parameters: "10 proporciones; Hasta 8 imágenes de referencia; Sin fondo transparente" },
        "midjourney-v7": { specification: "8 proporciones", parameters: "Sin fondo transparente" },
    },
    "pt-BR": {
        "seedance-2-0": { specification: "480p / 720p / 1080p · 4–15 s; 720p até 30 s", parameters: "6 proporções; Até 9 imagens, 3 vídeos e 3 áudios de referência" },
        "seedance-2-0-fast": { specification: "480p / 720p · 4–15 s", parameters: "6 proporções; Até 9 imagens, 3 vídeos e 3 áudios de referência" },
        "seedance-2-0-mini": { specification: "480p / 720p · 4–15 s", parameters: "6 proporções; Até 9 imagens e 3 áudios de referência; sem vídeo de referência" },
        "seedance-2-5": { specification: "480p / 720p / 1080p · 4–30 s", parameters: "6 proporções; Até 30 imagens e 10 áudios de referência; sem vídeo de referência" },
        "kling-3": { specification: "720p / 1080p / 4K · 3–15 s", parameters: "16:9 / 9:16 / 1:1; 2 imagens como quadros inicial/final; sem vídeo ou áudio de referência; controle de movimento de 3–30 s; som opcional em 720p" },
        "kling-3-turbo": { specification: "720p / 1080p · 3–15 s", parameters: "16:9 / 9:16 / 1:1; 1 imagem como quadro inicial; sem vídeo ou áudio de referência; Sem som" },
        "minimax-h3": { specification: "480p / 768p / 1080p · 4–30 s; 1080p até 15 s", parameters: "6 proporções; 1 imagem como quadro inicial; sem vídeo ou áudio de referência" },
        "minimax-h3-max": { specification: "480p / 720p / 768p · 4–15 s", parameters: "6 proporções; 1 imagem como quadro inicial; sem vídeo ou áudio de referência" },
        "wan-3": { specification: "480p / 720p / 1080p · 2–30 s", parameters: "6 proporções; Até 10 imagens, 5 vídeos e 5 áudios de referência" },
        "grok-imagine-video-1-5": { specification: "480p / 720p / 1080p · 4–15 s", parameters: "6 proporções; Até 7 imagens de referência; sem vídeo de referência" },
        "sora-2": { specification: "720p · 4 / 8 / 12 s", parameters: "16:9 / 9:16; Até 1 imagem de referência; sem vídeo de referência" },
        "veo-3-1": { specification: "720p · 8 s; 1080p · 8 ou 10 s", parameters: "Horizontal / vertical; 1 imagem como quadro inicial; sem vídeo ou áudio de referência" },
        "gpt-image-2": { specification: "1K / 2K / 4K", parameters: "15 proporções; Até 3 imagens de referência; Sem fundo transparente" },
        "gpt-image-2-5": { specification: "1K / 2K / 4K", parameters: "15 proporções; Até 8 imagens de referência; Fundo transparente disponível" },
        "gpt-image-2-6": { specification: "1K / 2K / 4K", parameters: "15 proporções; Até 8 imagens de referência; Fundo transparente disponível" },
        "nano-banana-2": { specification: "1K / 2K / 4K", parameters: "10 proporções; Até 8 imagens de referência; Sem fundo transparente" },
        "nano-banana-2.1": { specification: "1K / 2K / 4K", parameters: "10 proporções; Até 8 imagens de referência; Sem fundo transparente" },
        "nano-banana-pro": { specification: "1K / 2K / 4K", parameters: "10 proporções; Até 8 imagens de referência; Sem fundo transparente" },
        "midjourney-v7": { specification: "8 proporções", parameters: "Sem fundo transparente" },
    },
};

function pricingCopyLocale(locale: string): "zh-CN" | "zh-HK" | "zh-TW" | DirectPricingLocale {
    const normalized = locale.toLowerCase();
    if (normalized.startsWith("zh-hk") || normalized.startsWith("zh-mo")) return "zh-HK";
    if (normalized.startsWith("zh-tw")) return "zh-TW";
    if (normalized.startsWith("zh")) return "zh-CN";
    if (normalized.startsWith("ja")) return "ja-JP";
    if (normalized.startsWith("ko")) return "ko-KR";
    if (normalized.startsWith("es")) return "es-ES";
    return "en-US";
}

export function localizedMembershipBenefits(plan: SubscriptionPlan, locale: string) {
    const copyLocale = pricingCopyLocale(locale);
    const source = [plan.benefits[0], plan.benefits[1], plan.benefits[2], ...plan.benefits.slice(-2)];
    if (copyLocale === "zh-CN") return source;
    if (copyLocale === "zh-HK" || copyLocale === "zh-TW") return source.map((item) => toTraditionalChinese(item, copyLocale));
    return localizedMembershipBenefitCopy[copyLocale][plan.id];
}

export function localizedGenerationExamples(locale: string): GenerationExample[] {
    const kling4 = KLING4_COPY[locale as BlogLocale] || KLING4_COPY["en-US"];
    const examples = generationExamples.map((example) => (example.id === "kling-4" ? { ...example, specification: kling4.specification, parameters: kling4.parameters + " " + kling4.price } : example));
    const copyLocale = pricingCopyLocale(locale);
    if (copyLocale === "zh-CN") return examples;
    if (copyLocale === "zh-HK" || copyLocale === "zh-TW") {
        return examples.map((example) => ({
            ...example,
            specification: toTraditionalChinese(example.specification, copyLocale),
            parameters: toTraditionalChinese(example.parameters, copyLocale),
        }));
    }
    const capabilityLocale = locale.toLowerCase().startsWith("pt") ? "pt-BR" : copyLocale;
    const copy = capabilityLocale in localizedCapabilityCopy ? { ...localizedGenerationCopy, ...localizedCapabilityCopy[capabilityLocale as keyof typeof localizedCapabilityCopy] } : localizedGenerationCopy;
    return examples.map((example) => (copy[example.id] ? { ...example, ...copy[example.id] } : example));
}

export const pricingModelFamilies: PricingModelFamily[] = [
    {
        label: "Seedance 系列",
        kind: "video",
        models: ["Seedance 2.0", "Seedance 2.0 Fast", "Seedance 2.0 Mini", "Seedance 2.5"],
        parameterSummary: "480p–1080p · 4–30 秒 · 文生 / 图生视频",
    },
    {
        label: "视频模型",
        kind: "video",
        models: ["Kling 4", "Kling 3.0", "Kling 3.0 Turbo", "MiniMax H3", "MiniMax H3 Max", "Wan 3.0", "Grok Imagine Video 1.5", "Sora 2", "Veo 3.1"],
        parameterSummary: "比例、时长、清晰度与参考素材按所选模型展示",
    },
    {
        label: "图片模型",
        kind: "image",
        models: ["GPT Image 2", "GPT Image 2.5", "GPT Image 2.6", "Nano Banana", "Nano Banana 2", "Nano Banana 2.1", "Nano Banana Pro", "Midjourney V7", "Grok Imagine Image 2.0"],
        parameterSummary: "各模型支持的画幅、画质与参考素材在生成前展示",
    },
];

export const modelRecommendations: ModelRecommendation[] = [
    {
        id: "quick-start",
        label: "快速起稿",
        description: "只有一个想法，先找镜头与视觉方向",
        primaryModels: ["Seedance 2.0", "Nano Banana"],
        alternativeModels: ["GPT Image 2.5"],
        rationale: "短镜头先用 Seedance 2.0 起稿；需要快速做概念图或视觉变体时，用 Nano Banana。",
    },
    {
        id: "reference-to-video",
        label: "参考图成片",
        description: "已有主体、场景或关键帧，想把它动起来",
        primaryModels: ["Seedance 2.5", "Grok Imagine Video 1.5"],
        alternativeModels: ["Kling 3.0"],
        rationale: "Seedance 2.5 适合扩展参考素材；Grok Imagine Video 1.5 可从一张起始图生成视频。",
    },
    {
        id: "ad-shot",
        label: "广告镜头",
        description: "需要高规格短镜头、产品或品牌画面",
        primaryModels: ["Seedance 2.0", "Grok Imagine Video 1.5"],
        alternativeModels: ["Kling 3.0", "Wan 3.0"],
        rationale: "选择适合的 1080p 短镜头规格；可用时长与积分在提交前显示。",
    },
    {
        id: "consistent-assets",
        label: "角色 / 商品延续",
        description: "先固化人物、商品或品牌视觉，再连续生成",
        primaryModels: ["Nano Banana", "Seedance 2.5"],
        alternativeModels: ["GPT Image 2.5"],
        rationale: "先用 Nano Banana 整理角色或商品基准图，再用 Seedance 2.5 延展为连续镜头。",
    },
    {
        id: "keyframe-edit",
        label: "关键帧与修图",
        description: "需要生成 KV、修图、画面文字或单图参考",
        primaryModels: ["GPT Image 2.5", "Grok Imagine Image 2.0"],
        alternativeModels: ["Nano Banana"],
        rationale: "GPT Image 2.5 适合文字、版式或高分辨率静帧；Grok Imagine Image 2.0 当前提供 1K 文生图。",
    },
    {
        id: "compare-video-styles",
        label: "多方案比稿",
        description: "同一脚本想比较不同视频风格",
        primaryModels: ["MiniMax H3", "Wan 3.0"],
        alternativeModels: ["Kling 3.0"],
        rationale: "保留同一提示词与素材，按各模型可用的比例、时长和清晰度比较。",
    },
];

export function preferredBillingCurrency(locale = typeof navigator === "undefined" ? "zh-CN" : navigator.language): BillingCurrency {
    const normalized = locale.toLowerCase();
    if (normalized.startsWith("zh-cn") || normalized.startsWith("zh-sg")) return "CNY";
    if (normalized.startsWith("zh-hk") || normalized.startsWith("zh-mo")) return "HKD";
    if (normalized.startsWith("zh-tw")) return "TWD";
    if (normalized.startsWith("ja")) return "JPY";
    if (normalized.startsWith("ko")) return "KRW";
    if (normalized.startsWith("en-gb")) return "GBP";
    if (["de", "fr", "es", "it", "nl", "pt", "fi", "el", "sk", "sl"].some((prefix) => normalized.startsWith(prefix))) return "EUR";
    return "USD";
}

export function convertUsdAmount(amountUsd: number, currency: BillingCurrency) {
    return amountUsd * currencyDefinitions[currency].rateFromUsd;
}

// Intl renders TWD as a bare "$" in zh-TW, which makes it indistinguishable
// from USD at a glance. Keep the local number format but make the currency
// identity explicit wherever a price is shown.
const explicitCurrencySymbols: Partial<Record<BillingCurrency, string>> = {
    HKD: "HK$",
    TWD: "NT$",
};

function formatBillingCurrencyAmount(amount: number, currency: BillingCurrency, options: Pick<Intl.NumberFormatOptions, "minimumFractionDigits" | "maximumFractionDigits">) {
    const definition = currencyDefinitions[currency];
    const formatter = new Intl.NumberFormat(definition.locale, {
        style: "currency",
        currency,
        currencyDisplay: "symbol",
        ...options,
    });
    const explicitSymbol = explicitCurrencySymbols[currency];
    if (!explicitSymbol) return formatter.format(amount);
    return formatter
        .formatToParts(amount)
        .map((part) => (part.type === "currency" ? explicitSymbol : part.value))
        .join("");
}

export function formatBillingAmount(amountUsd: number, currency: BillingCurrency) {
    const definition = currencyDefinitions[currency];
    return formatBillingCurrencyAmount(convertUsdAmount(amountUsd, currency), currency, {
        minimumFractionDigits: currency === "USD" && !Number.isInteger(amountUsd) ? 2 : 0,
        maximumFractionDigits: definition.maximumFractionDigits,
    });
}

export function totalCredits(value: Pick<CreditTier, "baseCredits" | "bonusCredits">) {
    return value.baseCredits + value.bonusCredits;
}

export function selectedTier(plan: SubscriptionPlan, interval: BillingInterval, tierIndex: number) {
    const tiers = plan[interval];
    return tiers[Math.min(tiers.length - 1, Math.max(0, Math.round(tierIndex)))]!;
}

export function membershipTiers(interval: BillingInterval): MembershipTierView[] {
    const [starter, pro, studio] = subscriptionPlans;
    return [
        { key: "standard", name: "标准版", plan: starter, tier: starter[interval][0]! },
        { key: "advanced", name: "进阶版", plan: pro, tier: pro[interval][0]! },
        { key: "premium", name: "高级版", plan: pro, tier: pro[interval][1]! },
        { key: "luxury", name: "豪华版", plan: pro, tier: pro[interval][2]! },
        { key: "supreme", name: "至尊版", plan: studio, tier: studio[interval][0]! },
    ];
}

export function normalizeSeatCount(seatCount: number) {
    return Math.min(teamSeatLimits.max, Math.max(teamSeatLimits.min, Math.round(seatCount)));
}

export function teamPriceUsd(tier: CreditTier, seatCount: number) {
    return tier.priceUsd * normalizeSeatCount(seatCount);
}

export function teamCredits(tier: CreditTier, seatCount: number) {
    return totalCredits(tier) * normalizeSeatCount(seatCount);
}
