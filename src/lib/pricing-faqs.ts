import { BLOG_LOCALES, type BlogLocale } from "../content/blog-locales";
import { publicFaqs } from "../content/public-faqs";
import { byokRelayFaq } from "./byok-relay-copy";
import { SIGNUP_CREDITS_COPY } from "./signup-credits-copy";
import { fillPricingValues, pricingFaqValues, publicPricingFaqs } from "./pricing-public-copy";

// Lives outside page-seo so the pricing page does not pull the SEO registry and every blog article.

/** Authored pricing FAQs take live catalog amounts; the relay setup answer stays the shared BYOK sentence. */
function authoredPricingFaqs(locale: BlogLocale) {
    const authored = publicFaqs(locale, "pricing");
    if (!authored) return undefined;
    const values = pricingFaqValues(locale);
    return [SIGNUP_CREDITS_COPY[locale], ...authored.map((faq) => ({ question: faq.question, answer: fillPricingValues(faq.answer, values) })), byokRelayFaq(locale)];
}

export const PRICING_FAQS = Object.fromEntries(BLOG_LOCALES.map((locale) => [locale, (authoredPricingFaqs(locale) ?? [SIGNUP_CREDITS_COPY[locale], ...publicPricingFaqs(locale)]).map(({ question, answer }) => ({ question, answer }))])) as Record<
    BlogLocale,
    { question: string; answer: string }[]
>;
