import type { BlogLocale } from "../blog-locales";

export interface ModelPageOverride {
    intro: string; // hero intro paragraph (also reused in the bottom CTA, as today)
    controls: string; // the small note under the spec card
    sceneText: string; // "short drama scenes" paragraph
    steps: [string, string, string, string]; // EXACTLY 4: the steps grid has 4 columns
    faq: { question: string; answer: string }[]; // 6-10 items
    capabilities?: { title: string; body: string; caseId?: string }[]; // "What you can make" (6-8)
    problems?: { problem: string; solution: string }[]; // "Problems it solves" (4-5)
}

export type ModelPageOverrides = Partial<Record<BlogLocale, ModelPageOverride>>;
