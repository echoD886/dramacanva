import type { BlogLocale } from "../blog-locales";

export interface ModelCase {
    id: string;
    image: string;
    width: number;
    height: number;
    modelVersion: string;
    title: Partial<Record<BlogLocale, string>>; // localized card title
    use: Partial<Record<BlogLocale, string>>; // one line: what this does for a short drama
    alt: Partial<Record<BlogLocale, string>>;
    prompt: Partial<Record<BlogLocale, string>> & { original: string }; // localized prompt; falls back to original
    credit: {
        author: string;
        authorUrl: string;
        postUrl: string;
        sourceRepo: string;
        sourceName: string;
        license: string;
    };
}
