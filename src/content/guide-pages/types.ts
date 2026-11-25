export interface GuideStep {
    title: string;
    text: string;
}

export interface GuideSection {
    id: string;
    h2: string;
    paragraphs?: string[];
    steps?: GuideStep[];
    list?: string[];
    /** One of the page's real-interface screenshot ids; the file is chosen per locale. */
    image?: string;
}

export interface GuideContent {
    seo: { title: string; description: string; keywords: string };
    hero: { eyebrow?: string; h1: string; intro: string };
    sections: GuideSection[];
    faq: { q: string; a: string }[];
    cta: { h2: string; text: string; primary: string };
}
