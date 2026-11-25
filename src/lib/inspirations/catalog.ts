import { currentLocaleText as upstreamText } from "@/i18n/current-locale-text";
import { CURATED_INSPIRATION_IDS } from "./identity";
type CreationMode = "text" | "image" | "video";
import { HIGHLIGHT_REVISIONS } from "./source-revisions";

export type InspirationSourceId = "original" | "chatgpt-prompts" | "seedance" | "haohaoxue" | "youmind";

export type InspirationSourceInfo = {
    /** 卡片来源行上的短标签。 */
    label: string;
    /** 页脚链接文本，通常是仓库短名或站点名。 */
    name?: string;
    /** 来源地址：仓库或站点首页。 */
    repository?: string;
    revision?: string;
    license?: string;
    notice?: string;
};

/** 来源表：新增外部灵感源时在这里加一项，卡片与页脚都按它渲染许可标识。 */
export const inspirationSources: Record<InspirationSourceId, InspirationSourceInfo> = {
    original: {
        get label() {
            return upstreamText("upstream.v165.message221");
        },
    },
    "chatgpt-prompts": {
        get label() {
            return upstreamText("upstream.v165.message222");
        },
        name: "awesome-chatgpt-prompts",
        repository: "https://github.com/f/awesome-chatgpt-prompts",
        revision: "f78a1c5136fa080155d928e0d7e2b4a41ddef03e",
        license: "CC0-1.0",
        get notice() {
            return upstreamText("upstream.v165.message223");
        },
    },
    seedance: {
        get label() {
            return upstreamText("upstream.v165.message224");
        },
        name: "awesome-seedance",
        repository: "https://github.com/LearnPrompt/awesome-seedance",
        revision: HIGHLIGHT_REVISIONS.seedance,
        license: "CC BY 4.0",
        get notice() {
            return upstreamText("upstream.v165.message225");
        },
    },
    haohaoxue: {
        get label() {
            return upstreamText("upstream.v165.message226");
        },
        get name() {
            return upstreamText("upstream.v165.message227");
        },
        repository: "https://www.haohaoxue.com/prompts/",
        revision: HIGHLIGHT_REVISIONS.haohaoxue,
        get license() {
            return upstreamText("upstream.v165.message228");
        },
        get notice() {
            return upstreamText("upstream.v165.message229");
        },
    },
    youmind: {
        get label() {
            return upstreamText("upstream.v165.message230");
        },
        name: "YouMind",
        repository: "https://github.com/YouMind-OpenLab/awesome-nano-banana-pro-prompts",
        revision: HIGHLIGHT_REVISIONS.youmind,
        license: "CC BY 4.0",
        get notice() {
            return upstreamText("upstream.v165.message231");
        },
    },
};

export function inspirationSourceOf(item: CreationInspiration): InspirationSourceInfo {
    return inspirationSources[item.sourceId ?? "original"];
}

/**
 * 灵感条目。
 * 外部来源的 id 是 "<来源>:<上游标识>"，本项目原创没有 id，由 catalogIdOf 按来源加标题兜底，
 * 两者合起来作为收藏、隐藏、改写的稳定键。
 */
export type CreationInspiration = {
    id?: string;
    title: string;
    description: string;
    image: string;
    mode: CreationMode;
    prompt: string;
    /** 中文正文，双语来源才有（好好学 AI 的中英双语条目）。 */
    promptZh?: string;
    /** 上游分类 id，标签表见 public/inspirations/manifest.json。 */
    category?: string;
    tags?: string[];
    /** 画面比例，例如 "4:5"；上游有才带。 */
    ratio?: string;
    featured?: boolean;
    /** 来源归属；缺省视为本项目原创。 */
    sourceId?: InspirationSourceId;
    /** 署名，例如外部案例的作者或提示词角色名。 */
    credit?: string;
    /** 回到上游原页的链接。 */
    sourceUrl?: string;
};

/** 条目在本地存储里的稳定键。 */
export function catalogIdOf(item: CreationInspiration): string {
    return item.id ?? `${item.sourceId ?? "original"}:${item.title}`;
}

/** 本项目编写的灵感，与外部导入的条目合并后展示。 */
const curatedWorks: CreationInspiration[] = [
    {
        id: CURATED_INSPIRATION_IDS["upstream.v165.message232"],
        get title() {
            return upstreamText("upstream.v165.message232");
        },
        get description() {
            return upstreamText("upstream.v165.message233");
        },
        image: "/short-drama-styles/cyberpunk-neon.jpg",
        mode: "video",
        get prompt() {
            return upstreamText("upstream.v165.message234");
        },
        featured: true,
    },
    {
        id: CURATED_INSPIRATION_IDS["upstream.v165.message235"],
        get title() {
            return upstreamText("upstream.v165.message235");
        },
        get description() {
            return upstreamText("upstream.v165.message236");
        },
        image: "/short-drama-styles/retro-hong-kong.jpg",
        mode: "video",
        get prompt() {
            return upstreamText("upstream.v165.message237");
        },
    },
    {
        id: CURATED_INSPIRATION_IDS["upstream.v165.message238"],
        get title() {
            return upstreamText("upstream.v165.message238");
        },
        get description() {
            return upstreamText("upstream.v165.message239");
        },
        image: "/short-drama-styles/suspense-noir.jpg",
        mode: "video",
        get prompt() {
            return upstreamText("upstream.v165.message240");
        },
    },
    {
        id: CURATED_INSPIRATION_IDS["upstream.v165.message241"],
        get title() {
            return upstreamText("upstream.v165.message241");
        },
        get description() {
            return upstreamText("upstream.v165.message242");
        },
        image: "/short-drama-styles/fantasy-3d.jpg",
        mode: "image",
        get prompt() {
            return upstreamText("upstream.v165.message243");
        },
    },
    {
        id: CURATED_INSPIRATION_IDS["upstream.v165.message244"],
        get title() {
            return upstreamText("upstream.v165.message244");
        },
        get description() {
            return upstreamText("upstream.v165.message245");
        },
        image: "/welcome/wing-it/barn.webp",
        mode: "text",
        get prompt() {
            return upstreamText("upstream.v165.message246");
        },
    },
    {
        id: CURATED_INSPIRATION_IDS["upstream.v165.message247"],
        get title() {
            return upstreamText("upstream.v165.message247");
        },
        get description() {
            return upstreamText("upstream.v165.message248");
        },
        image: "/short-drama-styles/storybook-fantasy.jpg",
        mode: "text",
        sourceId: "chatgpt-prompts",
        credit: "Storyteller",
        get prompt() {
            return upstreamText("upstream.v165.message249");
        },
    },
    {
        id: CURATED_INSPIRATION_IDS["upstream.v165.message250"],
        get title() {
            return upstreamText("upstream.v165.message250");
        },
        get description() {
            return upstreamText("upstream.v165.message251");
        },
        image: "/short-drama-styles/urban-live-action.jpg",
        mode: "text",
        sourceId: "chatgpt-prompts",
        credit: "Screenwriter",
        get prompt() {
            return upstreamText("upstream.v165.message252");
        },
    },
    {
        id: CURATED_INSPIRATION_IDS["upstream.v165.message253"],
        get title() {
            return upstreamText("upstream.v165.message253");
        },
        get description() {
            return upstreamText("upstream.v165.message254");
        },
        image: "/short-drama-styles/future-tech.jpg",
        mode: "text",
        sourceId: "chatgpt-prompts",
        credit: "Novelist",
        get prompt() {
            return upstreamText("upstream.v165.message255");
        },
    },
    {
        id: CURATED_INSPIRATION_IDS["upstream.v165.message256"],
        get title() {
            return upstreamText("upstream.v165.message256");
        },
        get description() {
            return upstreamText("upstream.v165.message257");
        },
        image: "/short-drama-styles/nature-healing.jpg",
        mode: "text",
        sourceId: "chatgpt-prompts",
        credit: "Poet",
        get prompt() {
            return upstreamText("upstream.v165.message258");
        },
    },
    {
        id: CURATED_INSPIRATION_IDS["upstream.v165.message259"],
        get title() {
            return upstreamText("upstream.v165.message259");
        },
        get description() {
            return upstreamText("upstream.v165.message260");
        },
        image: "/short-drama-styles/real-life.jpg",
        mode: "text",
        sourceId: "chatgpt-prompts",
        credit: "Advertiser",
        get prompt() {
            return upstreamText("upstream.v165.message261");
        },
    },
    {
        id: CURATED_INSPIRATION_IDS["upstream.v165.message262"],
        get title() {
            return upstreamText("upstream.v165.message262");
        },
        get description() {
            return upstreamText("upstream.v165.message263");
        },
        image: "/short-drama-styles/retro-hong-kong.jpg",
        mode: "text",
        sourceId: "chatgpt-prompts",
        credit: "Creative Branding Strategist",
        get prompt() {
            return upstreamText("upstream.v165.message264");
        },
    },
    {
        id: CURATED_INSPIRATION_IDS["upstream.v165.message265"],
        get title() {
            return upstreamText("upstream.v165.message265");
        },
        get description() {
            return upstreamText("upstream.v165.message266");
        },
        image: "/short-drama-styles/black-white-noir.jpg",
        mode: "text",
        sourceId: "chatgpt-prompts",
        credit: "Film Critic",
        get prompt() {
            return upstreamText("upstream.v165.message267");
        },
    },
    {
        id: CURATED_INSPIRATION_IDS["upstream.v165.message268"],
        get title() {
            return upstreamText("upstream.v165.message268");
        },
        get description() {
            return upstreamText("upstream.v165.message269");
        },
        image: "/short-drama-styles/period-live-action.jpg",
        mode: "text",
        sourceId: "chatgpt-prompts",
        credit: "Historian",
        get prompt() {
            return upstreamText("upstream.v165.message270");
        },
    },
    {
        id: CURATED_INSPIRATION_IDS["upstream.v165.message271"],
        get title() {
            return upstreamText("upstream.v165.message271");
        },
        get description() {
            return upstreamText("upstream.v165.message272");
        },
        image: "/short-drama-styles/space-opera.jpg",
        mode: "video",
        get prompt() {
            return upstreamText("upstream.v165.message273");
        },
    },
    {
        id: CURATED_INSPIRATION_IDS["upstream.v165.message274"],
        get title() {
            return upstreamText("upstream.v165.message274");
        },
        get description() {
            return upstreamText("upstream.v165.message275");
        },
        image: "/short-drama-styles/clay-stop-motion.jpg",
        mode: "video",
        get prompt() {
            return upstreamText("upstream.v165.message276");
        },
    },
    {
        id: CURATED_INSPIRATION_IDS["upstream.v165.message277"],
        get title() {
            return upstreamText("upstream.v165.message277");
        },
        get description() {
            return upstreamText("upstream.v165.message278");
        },
        image: "/short-drama-styles/ink-narrative.jpg",
        mode: "video",
        get prompt() {
            return upstreamText("upstream.v165.message279");
        },
    },
    {
        id: CURATED_INSPIRATION_IDS["upstream.v165.message280"],
        get title() {
            return upstreamText("upstream.v165.message280");
        },
        get description() {
            return upstreamText("upstream.v165.message281");
        },
        image: "/short-drama-styles/nature-healing.jpg",
        mode: "video",
        get prompt() {
            return upstreamText("upstream.v165.message282");
        },
    },
    {
        id: CURATED_INSPIRATION_IDS["upstream.v165.message283"],
        get title() {
            return upstreamText("upstream.v165.message283");
        },
        get description() {
            return upstreamText("upstream.v165.message284");
        },
        image: "/short-drama-styles/chinese-2d.jpg",
        mode: "image",
        get prompt() {
            return upstreamText("upstream.v165.message285");
        },
    },
    {
        id: CURATED_INSPIRATION_IDS["upstream.v165.message286"],
        get title() {
            return upstreamText("upstream.v165.message286");
        },
        get description() {
            return upstreamText("upstream.v165.message287");
        },
        image: "/short-drama-styles/surreal-dream.jpg",
        mode: "image",
        get prompt() {
            return upstreamText("upstream.v165.message288");
        },
    },
    {
        id: CURATED_INSPIRATION_IDS["upstream.v165.message289"],
        get title() {
            return upstreamText("upstream.v165.message289");
        },
        get description() {
            return upstreamText("upstream.v165.message290");
        },
        image: "/short-drama-styles/urban-live-action.jpg",
        mode: "image",
        get prompt() {
            return upstreamText("upstream.v165.message291");
        },
    },
    {
        id: CURATED_INSPIRATION_IDS["upstream.v165.message292"],
        get title() {
            return upstreamText("upstream.v165.message292");
        },
        get description() {
            return upstreamText("upstream.v165.message293");
        },
        image: "/short-drama-styles/comic-pop.jpg",
        mode: "image",
        get prompt() {
            return upstreamText("upstream.v165.message294");
        },
    },
    {
        id: CURATED_INSPIRATION_IDS["upstream.v165.message295"],
        get title() {
            return upstreamText("upstream.v165.message295");
        },
        get description() {
            return upstreamText("upstream.v165.message296");
        },
        image: "/short-drama-styles/three-d-cartoon.jpg",
        mode: "image",
        get prompt() {
            return upstreamText("upstream.v165.message297");
        },
    },
];

/** 本项目编写的条目，灵感页把它单独作为「原创」分类。 */
export const curatedInspirations: CreationInspiration[] = curatedWorks;
