import { REFERRAL_EXPERIENCE_COPY, REFERRAL_TRADITIONAL_COPY } from "./messages/referral-experience-copy";
import { HOME_POSITIONING } from "../lib/home-positioning";
import { SIGNUP_CREDITS_COPY } from "../lib/signup-credits-copy";
import { PUBLIC_MARKET_COPY, type MarketLocale } from "../lib/public-market-copy";
import { MCP_SPEND_COPY } from "../lib/mcp-spend-copy";
import { GENERATION_REFUND_COPY, PUBLIC_PAGE_TERMS, PUBLIC_BYOK_PRICE } from "../lib/public-product-copy";

/** Shared projection for visible public pages. Do not translate the approved market copy again. */
export function publicMarketMessages(locale: MarketLocale): Record<string, string> {
    const copy = PUBLIC_MARKET_COPY[locale];
    const home = HOME_POSITIONING[locale];
    return {
        ...copy.messages,
        ...REFERRAL_EXPERIENCE_COPY[locale],
        ...(locale === "zh-HK" || locale === "zh-TW" ? REFERRAL_TRADITIONAL_COPY[locale] : {}),
        ...MCP_SPEND_COPY[locale],
        "homeShowcase.byokBanner.price": PUBLIC_BYOK_PRICE[locale],
        "homeShowcase.pageH1": home.h1,
        "homeShowcase.faq.q1": copy.home.question,
        "homeShowcase.faq.a1": home.answer,
        "homeShowcase.faq.q2": SIGNUP_CREDITS_COPY[locale].question,
        "homeShowcase.faq.a2": SIGNUP_CREDITS_COPY[locale].answer,
        "homeShowcase.faq.a3": GENERATION_REFUND_COPY[locale],
        "homeShowcase.usageNote": home.usageNote,
        "homeShowcase.tool.nanoBananaDesc": copy.home.imageRole,
        "homeShowcase.tool.seedanceDesc": copy.home.videoRole,
        "homeShowcase.byokBanner.pill1Desc": copy.home.imageRole,
        "homeShowcase.byokBanner.pill2Desc": copy.home.videoRole,
        "homeShowcase.footer.pricing": PUBLIC_PAGE_TERMS[locale].pricingLink,
        "miscPages.helpHeroTitle": copy.help.title,
        "miscPages.helpHeroSubtitle": copy.help.description,
        "pricing.bannerTitle": copy.pricingTitle,
        "pricing.faq2t": copy.helpQuestions[1],
        "pricing.faq2b": GENERATION_REFUND_COPY[locale],
        "blog.guide": copy.blog.title,
        "blog.description": copy.blog.description,
    };
}
