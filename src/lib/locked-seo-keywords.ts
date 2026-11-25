import { PUBLIC_MARKET_COPY } from "./public-market-copy";
/** Reviewed category-led homepage positioning. Update visible copy and SEO together. */
import type { BlogLocale } from "../content/blog-locales";
import { HOME_POSITIONING } from "./home-positioning";

export interface LockedLocaleSEO {
    locale: BlogLocale;
    /** 页面 H1：保留字段名兼容现有调用，内容以已确认的品类定位为准 */
    colloquialPainPointH1: string;
    /** 定价页痛点 H1 */
    pricingPainPointH1: string;
    /** 帮助中心痛点 H1 */
    helpPainPointH1: string;
    /** 页面 Title：品类词 + 品牌词 */
    pageTitle: string;
    /** Meta 描述：问题解决与能力阐释 */
    pageDescription: string;
    pageKeywords: string;
    /** 副标题 / 动作说明：品类词 + 动作指导 */
    subtitleDescription: string;
    /** 调研与考证依据 */
    intentNotes: string;
    /** 受保护的高价值关键词清单 */
    protectedKeywords: string[];
}

export const LOCKED_SEO_REGISTRY: Record<BlogLocale, LockedLocaleSEO> = {
    "pt-BR": {
        locale: "pt-BR",
        colloquialPainPointH1: HOME_POSITIONING["pt-BR"].h1,
        pricingPainPointH1: PUBLIC_MARKET_COPY["pt-BR"].pricingTitle,
        helpPainPointH1: PUBLIC_MARKET_COPY["pt-BR"].help.title,
        pageTitle: HOME_POSITIONING["pt-BR"].title,
        pageKeywords: HOME_POSITIONING["pt-BR"].keywords,
        pageDescription: HOME_POSITIONING["pt-BR"].description,
        subtitleDescription: HOME_POSITIONING["pt-BR"].imageRole,
        intentNotes: "巴西葡语公开文案；不宣称搜索量、绝对角色一致性或即时退款。",
        protectedKeywords: HOME_POSITIONING["pt-BR"].keywords.split(", "),
    },
    "zh-CN": {
        locale: "zh-CN",
        colloquialPainPointH1: HOME_POSITIONING["zh-CN"].h1,
        pricingPainPointH1: "AI影视创作价格与积分方案",
        helpPainPointH1: "帮助中心：AI影视创作教程",
        pageTitle: HOME_POSITIONING["zh-CN"].title,
        pageKeywords: HOME_POSITIONING["zh-CN"].keywords,
        pageDescription: HOME_POSITIONING["zh-CN"].description,
        subtitleDescription: HOME_POSITIONING["zh-CN"].imageRole,
        intentNotes: "已确认的免费分镜、视频画布、BYOK 与双主力模型定位；不宣称未经核验的搜索量或排名。",
        protectedKeywords: HOME_POSITIONING["zh-CN"].keywords.split(", "),
    },
    "zh-HK": {
        locale: "zh-HK",
        colloquialPainPointH1: HOME_POSITIONING["zh-HK"].h1,
        pricingPainPointH1: PUBLIC_MARKET_COPY["zh-HK"].pricingTitle,
        helpPainPointH1: PUBLIC_MARKET_COPY["zh-HK"].help.title,
        pageTitle: HOME_POSITIONING["zh-HK"].title,
        pageKeywords: HOME_POSITIONING["zh-HK"].keywords,
        pageDescription: HOME_POSITIONING["zh-HK"].description,
        subtitleDescription: HOME_POSITIONING["zh-HK"].imageRole,
        intentNotes: "已确认的免费分镜、视频画布、BYOK 与双主力模型定位；不宣称未经核验的搜索量或排名。",
        protectedKeywords: HOME_POSITIONING["zh-HK"].keywords.split(", "),
    },
    "zh-TW": {
        locale: "zh-TW",
        colloquialPainPointH1: HOME_POSITIONING["zh-TW"].h1,
        pricingPainPointH1: PUBLIC_MARKET_COPY["zh-TW"].pricingTitle,
        helpPainPointH1: PUBLIC_MARKET_COPY["zh-TW"].help.title,
        pageTitle: HOME_POSITIONING["zh-TW"].title,
        pageKeywords: HOME_POSITIONING["zh-TW"].keywords,
        pageDescription: HOME_POSITIONING["zh-TW"].description,
        subtitleDescription: HOME_POSITIONING["zh-TW"].imageRole,
        intentNotes: "已确认的免费分镜、视频画布、BYOK 与双主力模型定位；不宣称未经核验的搜索量或排名。",
        protectedKeywords: HOME_POSITIONING["zh-TW"].keywords.split(", "),
    },
    "en-US": {
        locale: "en-US",
        colloquialPainPointH1: HOME_POSITIONING["en-US"].h1,
        pricingPainPointH1: "AI Filmmaking Pricing & Credit Plans",
        helpPainPointH1: "Help Center & AI Filmmaking Tutorials",
        pageTitle: HOME_POSITIONING["en-US"].title,
        pageKeywords: HOME_POSITIONING["en-US"].keywords,
        pageDescription: HOME_POSITIONING["en-US"].description,
        subtitleDescription: HOME_POSITIONING["en-US"].imageRole,
        intentNotes: "已确认的免费分镜、视频画布、BYOK 与双主力模型定位；不宣称未经核验的搜索量或排名。",
        protectedKeywords: HOME_POSITIONING["en-US"].keywords.split(", "),
    },
    "ja-JP": {
        locale: "ja-JP",
        colloquialPainPointH1: HOME_POSITIONING["ja-JP"].h1,
        pricingPainPointH1: PUBLIC_MARKET_COPY["ja-JP"].pricingTitle,
        helpPainPointH1: PUBLIC_MARKET_COPY["ja-JP"].help.title,
        pageTitle: HOME_POSITIONING["ja-JP"].title,
        pageKeywords: HOME_POSITIONING["ja-JP"].keywords,
        pageDescription: HOME_POSITIONING["ja-JP"].description,
        subtitleDescription: HOME_POSITIONING["ja-JP"].imageRole,
        intentNotes: "已确认的免费分镜、视频画布、BYOK 与双主力模型定位；不宣称未经核验的搜索量或排名。",
        protectedKeywords: HOME_POSITIONING["ja-JP"].keywords.split(", "),
    },
    "ko-KR": {
        locale: "ko-KR",
        colloquialPainPointH1: HOME_POSITIONING["ko-KR"].h1,
        pricingPainPointH1: PUBLIC_MARKET_COPY["ko-KR"].pricingTitle,
        helpPainPointH1: PUBLIC_MARKET_COPY["ko-KR"].help.title,
        pageTitle: HOME_POSITIONING["ko-KR"].title,
        pageKeywords: HOME_POSITIONING["ko-KR"].keywords,
        pageDescription: HOME_POSITIONING["ko-KR"].description,
        subtitleDescription: HOME_POSITIONING["ko-KR"].imageRole,
        intentNotes: "已确认的免费分镜、视频画布、BYOK 与双主力模型定位；不宣称未经核验的搜索量或排名。",
        protectedKeywords: HOME_POSITIONING["ko-KR"].keywords.split(", "),
    },
    "es-ES": {
        locale: "es-ES",
        colloquialPainPointH1: HOME_POSITIONING["es-ES"].h1,
        pricingPainPointH1: PUBLIC_MARKET_COPY["es-ES"].pricingTitle,
        helpPainPointH1: PUBLIC_MARKET_COPY["es-ES"].help.title,
        pageTitle: HOME_POSITIONING["es-ES"].title,
        pageKeywords: HOME_POSITIONING["es-ES"].keywords,
        pageDescription: HOME_POSITIONING["es-ES"].description,
        subtitleDescription: HOME_POSITIONING["es-ES"].imageRole,
        intentNotes: "已确认的免费分镜、视频画布、BYOK 与双主力模型定位；不宣称未经核验的搜索量或排名。",
        protectedKeywords: HOME_POSITIONING["es-ES"].keywords.split(", "),
    },
};
