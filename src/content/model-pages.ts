import { publicFaqs } from "./public-faqs";
import { KLING4_COPY } from "./kling4-copy";
import type { BlogLocale } from "./blog-locales";
import { NATIVE_MODEL_SEO, type NativeModelSEO } from "./model-pages-native";
import { getModelPageOverride, type ModelPageOverride } from "./model-page-copy";
import { modelPriceTokens } from "./model-page-pricing";
import * as zh from "./model-copy/zh";
import * as ja from "./model-copy/ja-JP";
import * as ko from "./model-copy/ko-KR";
import * as es from "./model-copy/es-ES";
import * as pt from "./model-copy/pt-BR";

export interface ModelPage {
    slug: string;
    name: string;
    displayName?: string;
    provider: string;
    kind: "video" | "image";
    versions: string[];
    tiers: string;
    scene: "action" | "story" | "character" | "art";
    sources: string[];
}
const presetSource = "web/src/lib/canvas/model-price-presets.ts";
export const MODEL_PAGES: ModelPage[] = [
    { slug: "kling-4", name: "Kling 4", provider: "Kuaishou", kind: "video", versions: ["Kling 4"], tiers: "720p, 1080p", scene: "action", sources: [presetSource] },
    {
        slug: "seedance-2-0",
        name: "Seedance 2.0",
        provider: "ByteDance",
        kind: "video",
        versions: ["Seedance 2.0", "Seedance 2.0 Fast", "Seedance 2.0 Mini"],
        tiers: "Seedance 2.0: 480p, 720p, 1080p; Fast / Mini: 480p, 720p",
        scene: "action",
        sources: [presetSource],
    },
    { slug: "seedance-2-5", name: "Seedance 2.5", provider: "ByteDance", kind: "video", versions: ["Seedance 2.5"], tiers: "480p, 720p, 1080p", scene: "story", sources: [presetSource] },
    { slug: "sora-2", name: "Sora 2", provider: "OpenAI", kind: "video", versions: ["Sora 2"], tiers: "720p", scene: "story", sources: [presetSource] },
    { slug: "veo-3-1", name: "Veo 3.1", provider: "Google", kind: "video", versions: ["Veo 3.1"], tiers: "720p, 1080p; 8 s per clip", scene: "story", sources: [presetSource] },
    { slug: "kling-3-0", name: "Kling 3.0", provider: "Kuaishou", kind: "video", versions: ["Kling 3.0", "Kling 3.0 Turbo"], tiers: "Kling 3.0 / Turbo: 720p, 1080p", scene: "action", sources: [presetSource] },
    { slug: "minimax-h3", name: "MiniMax H3", provider: "MiniMax / Hailuo", kind: "video", versions: ["MiniMax H3", "MiniMax H3 Max"], tiers: "H3: 480p, 768p, 1080p; Max: 480p, 720p, 768p", scene: "character", sources: [presetSource] },
    { slug: "wan-3-0", name: "Wan 3.0", provider: "Alibaba", kind: "video", versions: ["Wan 3.0"], tiers: "480p, 720p, 1080p", scene: "action", sources: [presetSource] },
    {
        slug: "grok-imagine",
        name: "Grok Imagine Video 1.5",
        displayName: "Grok Imagine",
        provider: "xAI",
        kind: "video",
        versions: ["Grok Imagine Video 1.5"],
        tiers: "480p, 720p, 1080p",
        scene: "story",
        sources: [presetSource, "backend/internal/service/model_capability.go"],
    },
    {
        slug: "nano-banana",
        name: "Nano Banana",
        displayName: "Nano Banana Pro",
        provider: "Google",
        kind: "image",
        versions: ["Nano Banana 2", "Nano Banana 2.1", "Nano Banana Pro"],
        tiers: "Nano Banana 2 / 2.1 / Pro: 1K, 2K, 4K",
        scene: "character",
        sources: [presetSource],
    },
    {
        slug: "gpt-image-2",
        name: "GPT Image 2",
        displayName: "GPT Image 2.6",
        provider: "OpenAI",
        kind: "image",
        versions: ["GPT Image 2", "GPT Image 2.5", "GPT Image 2.6"],
        tiers: "GPT Image 2: 1K, 2K, 4K; 2.5: 1K, 2K, 4K; 2.6: 1K, 2K, 4K",
        scene: "character",
        sources: [presetSource],
    },
    { slug: "midjourney-v7", name: "Midjourney V7", provider: "Midjourney", kind: "image", versions: ["Midjourney V7"], tiers: "standard", scene: "art", sources: [presetSource] },
];
export const modelPageForPath = (path: string) => MODEL_PAGES.find((model) => path === "/" + model.slug);
export const modelDisplayName = (model: Pick<ModelPage, "name"> & { displayName?: string }) => model.displayName ?? model.name;

export interface ModelLocaleCopy {
    video: string;
    image: string;
    free: string;
    online: string;
    supported: string;
    versions: string;
    provider: string;
    generationOptions: string;
    capabilities: string;
    scenes: string;
    stepsTitle: string;
    faqTitle: string;
    pricing: string;
    home: string;
    cta: string;
    intro: string;
    controls: string;
    tiers: string;
    steps: string[];
    scene: Record<ModelPage["scene"], string>;
    faq: Array<{ question: string; answer: string }>;
    casesTitle: string;
    casesIntro: string;
    promptLabel: string;
    copyPrompt: string;
    copied: string;
    tryPrompt: string;
    translatedNote: string;
    creditBy: string;
    creditSource: string;
    capabilitiesTitle: string;
    capabilitiesIntro: string;
    problemsTitle: string;
    problemsIntro: string;
    seeExample: string;
}
const en: ModelLocaleCopy = {
    video: "AI Video Generator",
    image: "AI Image Generator",
    free: "Free",
    online: "Online",
    supported: "Supported models",
    versions: "Enabled versions",
    provider: "Model developer",
    generationOptions: "Generation options",
    capabilities: "Generation options",
    scenes: "Short drama scenes",
    stepsTitle: "How to use {model} in DramaCanvas",
    faqTitle: "Frequently asked questions",
    pricing: "Pricing",
    home: "Home",
    cta: "Try {model} free",
    intro: "Use {model} online in DramaCanvas to plan and generate short drama assets. Explore free canvas planning, API connections and pricing before generating.",
    controls: "Available controls follow the selected model version. Check the canvas model selector before submitting a generation.",
    tiers: "Registered output tiers",
    steps: [
        "Open the DramaCanvas canvas and organize your script into storyboard shots.",
        "Add a generation node, choose {model} and describe the shot. Add character or shot references only when the selected version supports them.",
        "Review the available settings and confirmed credits, then generate. Compare results with your storyboard.",
        "Keep useful images as shot references or arrange generated videos on the timeline to assemble your short drama.",
    ],
    scene: {
        action: "Plan movement, entrances and transitions as separate shots. Compare generated takes on the canvas before selecting clips for the timeline.",
        story: "Build establishing shots, dialogue coverage and episode transitions from your script. Review each take against the surrounding storyboard shots.",
        character: "Develop character looks, reaction shots and recurring scene references. Reuse approved references when the selected model supports them; consistency still needs review.",
        art: "Explore wardrobe, sets and visual direction for a short drama. Keep selected images alongside storyboard shots as production references.",
    },
    faq: [
        {
            question: "Can I use {model} free?",
            answer: "Canvas workspace, manual scriptwriting, and storyboard editing are free. Generating {model} images or videos uses credits, and AI scripts and AI storyboards are also billed with credits; free planning does not promise free model calls.",
        },
        {
            question: "Is there a {model} API workflow?",
            answer: "Use DramaCanvas MCP for supported workspace and generation operations, or connect compatible API keys through BYOK. This page does not provide the model developer's API or imply official affiliation.",
        },
        { question: "How does {model} pricing work?", answer: "Check the pricing page for current plans and credits. The canvas shows confirmed credits before generation. BYOK provider usage and workspace service are billed separately." },
        { question: "Which {model} versions are enabled?", answer: "{versions}. Availability and settings follow the live model selector; similarly named provider products are not automatically included." },
        { question: "Can {model} make an entire short drama?", answer: "Generate individual assets, review character continuity and assemble chosen clips on the timeline. A model call does not automatically produce a finished, consistent episode." },
    ],
    casesTitle: "{model} examples from the community",
    casesIntro: "Real images made with {model} and shared in open-source prompt libraries, with the original prompt and credit to each creator. Copy a prompt and adapt it on the canvas.",
    promptLabel: "Prompt",
    copyPrompt: "Copy prompt",
    copied: "Copied",
    tryPrompt: "Try this prompt",
    translatedNote: "Prompt translated from the original",
    creditBy: "by",
    creditSource: "source",
    capabilitiesTitle: "What you can make with {alias}",
    capabilitiesIntro: "Real jobs from short-drama work: what you give {alias}, what you get back, and where it fits in an episode.",
    problemsTitle: "Common snags when making short dramas with {alias}, and how they're handled here",
    problemsIntro: "Problems creators run into, and what DramaCanvas does about each one.",
    seeExample: "See example",
};
export const MODEL_COPY: Record<BlogLocale, ModelLocaleCopy> = {
    "en-US": en,
    "zh-CN": zh.zhCN,
    "zh-TW": zh.zhTW,
    "zh-HK": zh.zhHK,
    "ja-JP": ja.copy,
    "ko-KR": ko.copy,
    "es-ES": es.copy,
    "pt-BR": pt.copy,
};
const MODEL_ALIASES: Partial<Record<BlogLocale, Record<string, string>>> = { ...zh.aliases, "ja-JP": ja.aliases, "ko-KR": ko.aliases, "es-ES": es.aliases, "pt-BR": pt.aliases };

const PRICE_TOKEN_REGEX = /\{(?:signupCredits|minCredits|maxCredits|freeCount|unit)\}/;

function stringHasPriceToken(str: string): boolean {
    return PRICE_TOKEN_REGEX.test(str);
}

function overrideHasPriceToken(ov: ModelPageOverride): boolean {
    if (ov.intro && stringHasPriceToken(ov.intro)) return true;
    if (ov.controls && stringHasPriceToken(ov.controls)) return true;
    if (ov.sceneText && stringHasPriceToken(ov.sceneText)) return true;
    if (ov.steps && ov.steps.some(stringHasPriceToken)) return true;
    if (ov.faq && ov.faq.some((item) => stringHasPriceToken(item.question) || stringHasPriceToken(item.answer))) return true;
    if (ov.capabilities && ov.capabilities.some((item) => stringHasPriceToken(item.title) || stringHasPriceToken(item.body))) return true;
    if (ov.problems && ov.problems.some((item) => stringHasPriceToken(item.problem) || stringHasPriceToken(item.solution))) return true;
    return false;
}

export function modelPageCopy(model: ModelPage, locale: BlogLocale) {
    const copy = MODEL_COPY[locale];
    const alias = MODEL_ALIASES[locale]?.[model.slug] ?? model.name;
    const tokens = modelPriceTokens(model);

    let override = getModelPageOverride(model.slug, locale);
    if (!tokens && override && overrideHasPriceToken(override)) {
        if (process.env.NODE_ENV !== "production") {
            throw new Error(`Model "${model.slug}" has no live price tokens, but copy contains price token`);
        }
        override = undefined;
    }

    let native: NativeModelSEO | undefined = NATIVE_MODEL_SEO[model.slug]?.[locale];
    if (
        !tokens &&
        native &&
        ((native.title && stringHasPriceToken(native.title)) || (native.h1 && stringHasPriceToken(native.h1)) || (native.description && stringHasPriceToken(native.description)) || (native.keywords && stringHasPriceToken(native.keywords)))
    ) {
        if (process.env.NODE_ENV !== "production") {
            throw new Error(`Model "${model.slug}" has no live price tokens, but copy contains price token`);
        }
        native = undefined;
    }

    // Chinese/Japanese aliases (可灵, ソラ2) sit flush against surrounding text; Korean keeps word spacing, English fallbacks keep their spaces.
    const cjk = "[\\u3000-\\u30ff\\u3400-\\u9fff\\uff00-\\uffef]";
    const flushable = locale !== "ko-KR";
    const startsCjk = flushable && new RegExp(`^${cjk}`).test(alias);
    const endsCjk = flushable && new RegExp(`${cjk}$`).test(alias);
    const withAlias = (text: string) => {
        if (startsCjk) text = text.replace(new RegExp(`(?<=${cjk}) \\{alias\\}`, "g"), "{alias}");
        if (endsCjk) text = text.replace(new RegExp(`\\{alias\\} (?=${cjk})`, "g"), "{alias}");
        return text.replaceAll("{alias}", alias);
    };
    // Without a local alias, "{alias}（{model}）" would print the English name twice.
    const dedupe = (text: string) => (alias === model.name ? text.replace(/\{alias\}\s*[（(]\{model\}[）)](?=[\u3000-\u9fff\uac00-\ud7af])/g, "{model} ").replace(/\{alias\}\s*[（(]\{model\}[）)]/g, "{model}") : text);
    const fill = (text: string) => {
        if (!tokens && stringHasPriceToken(text)) {
            if (process.env.NODE_ENV !== "production") {
                throw new Error(`Model "${model.slug}" has no live price tokens, but copy contains price token: ${text}`);
            }
        }
        let result = withAlias(dedupe(text)).replaceAll("{model}", model.name).replaceAll("{versions}", model.versions.join(", "));
        if (tokens) {
            result = result
                .replaceAll("{signupCredits}", String(tokens.signupCredits))
                .replaceAll("{minCredits}", String(tokens.minCredits))
                .replaceAll("{maxCredits}", String(tokens.maxCredits))
                .replaceAll("{freeCount}", String(tokens.freeCount))
                .replaceAll("{unit}", tokens.unit);
        }
        return result;
    };
    const h1 = model.name + " " + copy[model.kind];
    let title = `${h1} ${copy.free} ${copy.online} | DramaCanvas`;
    if (title.length > 60) title = `${h1} ${copy.free} | DramaCanvas`;
    if (title.length > 60) {
        const compact = locale === "es-ES" ? (model.kind === "video" ? "Video IA" : "Imágenes IA") : locale === "pt-BR" ? (model.kind === "video" ? "Vídeo IA" : "Imagens IA") : copy[model.kind];
        title = `${model.name} ${compact} ${copy.free} | DramaCanvas`;
    }
    const descriptions: Record<BlogLocale, string> = {
        "en-US": "Try {model} free online as an KIND for short dramas. Plan scenes on a free canvas, generate clips, use the API and see pricing.",
        "zh-CN": "在线使用 {model} 制作短剧素材。了解免费画布、API 接入与价格，在 DramaCanvas 编排分镜并生成。",
        "zh-HK": "網上使用 {model} 製作短劇素材。了解免費畫布、API 接入及價格，在 DramaCanvas 編排分鏡並生成。",
        "zh-TW": "線上使用 {model} 製作短劇素材。了解免費畫布、API 串接與價格，在 DramaCanvas 編排分鏡並生成。",
        "ja-JP": "{model} でショートドラマの素材をオンライン生成。DramaCanvas の無料キャンバス、API 接続、料金をご確認ください。",
        "ko-KR": "{model} 온라인으로 숏드라마 소재를 만드세요. DramaCanvas의 무료 캔버스, API 연결과 요금을 확인하세요.",
        "es-ES": "{model} online para dramas cortos. Planifica gratis en el canvas de DramaCanvas y consulta las conexiones API y los precios.",
        "pt-BR": "{model} online para novela vertical. Planeje grátis no canvas do DramaCanvas e confira as conexões API e os preços.",
    };
    const description = fill(descriptions[locale]).replace("KIND", copy[model.kind].toLowerCase().replace(/\bai\b/g, "AI"));
    const baseFaqs = publicFaqs(locale, model.slug) ?? copy.faq;
    const resolvedFaq = override?.faq ? override.faq.map((item) => ({ question: fill(item.question), answer: fill(item.answer) })) : baseFaqs.map((faq) => ({ question: fill(faq.question), answer: fill(faq.answer) }));

    const resolvedIntro = override?.intro ? fill(override.intro) : model.slug === "kling-4" ? fill(KLING4_COPY[locale].description) : fill(copy.intro);

    const resolvedControls = override?.controls ? fill(override.controls) : model.slug === "kling-4" ? fill(KLING4_COPY[locale].specification + ". " + KLING4_COPY[locale].parameters + " " + KLING4_COPY[locale].price) : fill(copy.controls);

    const resolvedSceneText = override?.sceneText ? fill(override.sceneText) : fill(copy.scene[model.scene]);

    const resolvedSteps = override?.steps ? override.steps.map(fill) : copy.steps.map(fill);

    const resolvedCapabilities = override?.capabilities
        ? override.capabilities.map((item) => ({
              title: fill(item.title),
              body: fill(item.body),
              caseId: item.caseId,
          }))
        : undefined;

    const resolvedProblems = override?.problems
        ? override.problems.map((item) => ({
              problem: fill(item.problem),
              solution: fill(item.solution),
          }))
        : undefined;

    return {
        ...copy,
        h1: native?.h1 ? fill(native.h1) : fill(h1),
        title: native?.title ? fill(native.title) : fill(title),
        description: native?.description ? fill(native.description) : description,
        intro: resolvedIntro,
        controls: resolvedControls,
        cta: fill(copy.cta),
        stepsTitle: fill(copy.stepsTitle),
        casesTitle: fill(copy.casesTitle),
        casesIntro: fill(copy.casesIntro),
        capabilitiesTitle: fill(copy.capabilitiesTitle),
        capabilitiesIntro: fill(copy.capabilitiesIntro),
        problemsTitle: fill(copy.problemsTitle),
        problemsIntro: fill(copy.problemsIntro),
        seeExample: fill(copy.seeExample),
        capabilities: resolvedCapabilities,
        problems: resolvedProblems,
        steps: resolvedSteps,
        sceneText: resolvedSceneText,
        faq: resolvedFaq,
        keywords: native?.keywords ? fill(native.keywords) : fill([...new Set([model.name, ...model.versions, `${model.name} free`, `${model.name} online`, `${model.name} api`, copy[model.kind]])].join(", ")),
    };
}
