import { BLOG_LOCALES, blogPath, type BlogLocale } from "./blog-locales";
import { GENERATED_BLOG_REDIRECTS } from "./generated/blog-redirects";

export type BlogRedirect = { from: string; to: string; locales?: BlogLocale[] };

const CANVAS_GUIDE = "infinite-canvas-guide";

/** Retired slug → closest live article. Unrelated or product-news slugs fall back to the canvas guide. */
const RETIRED_TO: Record<string, string> = {
    "seedance-character-consistency": "ai-character-generator",
    "seedance-camera-movement-prompts": "seedance-2",
    "kling-vs-seedance-vs-minimax": "best-ai-video-generator-2026",
    "minimax-hailuo-image-to-video-tips": "image-to-video-ai",
    "kling-camera-control-prompt-guide": "kling-ai-guide-2026",
    "wan-video-prompt-guide-short-drama": "wan-3-guide",
    "first-last-frame-video-transition-guide": "image-to-video-ai",
    "ltx-studio-alternative": "canva-ai-video-alternative",
    "higgsfield-alternative": "higgsfield-ai-review",
    "runway-for-storyboards": "storyboard-template",
    "katalist-alternative": "storyboard-template",
    "boords-alternative": "storyboard-template",
    "best-ai-storyboard-generator": "storyboard-template",
    "ai-video-generator-from-script": "ai-short-drama-workflow",
    "storyboard-with-ai-agents-mcp": "claude-video-generation-mcp",
    "bring-your-own-api-key-ai-video": CANVAS_GUIDE,
    "camera-shot-types-guide": "storyboard-template",
    "vertical-video-9-16-framing": "seedance-2",
    "save-ai-videos-locally": CANVAS_GUIDE,
    "local-first-creative-assets": CANVAS_GUIDE,
    "story-to-canvas": "ai-short-drama-workflow",
    "team-invitation-workflow": CANVAS_GUIDE,
    "script-to-storyboard": "storyboard-template",
    "shot-list-generator": "storyboard-template",
    "ai-short-drama": "ai-short-drama-workflow",
    "complete-ai-short-drama-workflow": "ai-short-drama-workflow",
    "vertical-drama-production": "ai-short-drama-workflow",
    "novelas-cortas-microseries-verticales-ia": "ai-short-drama-workflow",
    "mininovelas-verticais-roteiro-storyboard-ia": "ai-short-drama-workflow",
    "tategata-dorama-ekonte-ai": "ai-short-drama-workflow",
    "syotpom-deurama-ai-konti": "ai-short-drama-workflow",
    "multi-character-dialogue-ai-storyboard": "ai-character-generator",
    "tategata-dorama-hook-pacing": "ai-short-drama-workflow",
    "syotpom-deurama-character-sheet": "ai-character-generator",
    "duanju-juben-chaifen-guize": "ai-short-drama-workflow",
    "presupuesto-microserie-ia-costes-creditos": "ai-short-drama-workflow",
    "equipe-mininovelas-canvas-papeis-creditos": "ai-short-drama-workflow",
    "claude-code-mcp-syotpom-konti-jadonghwa": "claude-video-generation-mcp",
    "say-action-is-now-dramacanva": "build-log-01",
    "codex-claude-code-mcp-storyboard": "claude-video-generation-mcp",
};

/**
 * Owner decision (2026-10-22): only the rewritten blog stays public. Every pre-rewrite article
 * 301s to the closest rewritten article that is published in the same locale (2026-11-17: per-article
 * targets instead of one shared guide, so search engines do not read the redirects as soft 404s).
 */
export const RETIRED_BLOG_ARTICLES: { from: string; prefer: string[] }[] = Object.entries(RETIRED_TO).map(([from, to]) => ({ from, prefer: to === CANVAS_GUIDE ? [CANVAS_GUIDE] : [to, CANVAS_GUIDE] }));

/**
 * Rewritten targets live per locale. Kept as a small constant so public pages and the workspace do not import
 * the full generated article bodies; content-toolbox/blog tests assert every target is actually published.
 */
export const RETIREMENT_TARGETS: Record<BlogLocale, readonly string[]> = Object.fromEntries(BLOG_LOCALES.map((locale) => [locale, [...new Set(Object.values(RETIRED_TO))]])) as unknown as Record<BlogLocale, readonly string[]>;

export function retiredBlogRedirects(generated: BlogRedirect[] = GENERATED_BLOG_REDIRECTS, targets: Record<BlogLocale, readonly string[]> = RETIREMENT_TARGETS): BlogRedirect[] {
    const covered = new Set(generated.flatMap((redirect) => (redirect.locales ?? BLOG_LOCALES).map((locale) => `${locale}:${redirect.from}`)));
    return RETIRED_BLOG_ARTICLES.flatMap(({ from, prefer }) =>
        BLOG_LOCALES.flatMap((locale) => {
            if (covered.has(`${locale}:${from}`)) return [];
            const to = prefer.find((slug) => targets[locale].includes(slug));
            return to ? [{ from, to, locales: [locale] }] : [];
        }),
    );
}

/** Slugs only. Content migrations populate this registry, never client-side redirects. */
export const BLOG_REDIRECTS: BlogRedirect[] = [...GENERATED_BLOG_REDIRECTS, ...retiredBlogRedirects()];

let defaultRedirectSignature: string | undefined;
let defaultRedirectPaths: Map<string, string> | undefined;

export function blogRedirectPaths(redirects: BlogRedirect[] = BLOG_REDIRECTS) {
    // SEO queries reuse this registry; keep mutation detection and isolate returned maps.
    const signature = redirects === BLOG_REDIRECTS ? JSON.stringify(redirects) : undefined;
    if (signature !== undefined && signature === defaultRedirectSignature && defaultRedirectPaths) return new Map(defaultRedirectPaths);
    const paths = new Map<string, string>();
    for (const redirect of redirects) {
        if (![redirect.from, redirect.to].every((slug) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) || redirect.from === redirect.to) throw new Error("Invalid blog redirect slugs");
        for (const locale of redirect.locales ?? BLOG_LOCALES) {
            if (!BLOG_LOCALES.includes(locale)) throw new Error("Invalid blog redirect locale");
            for (const prefix of [blogPath(locale, redirect.from), ...(locale === "en-US" ? [`/en/blog/${redirect.from}`] : [])]) {
                if (paths.has(prefix)) throw new Error(`Duplicate blog redirect: ${prefix}`);
                paths.set(prefix, blogPath(locale, redirect.to));
                paths.set(prefix + "/", blogPath(locale, redirect.to));
            }
        }
    }
    for (const target of paths.values()) if (paths.has(target)) throw new Error("Chained blog redirects are not allowed");
    if (signature !== undefined) {
        defaultRedirectSignature = signature;
        defaultRedirectPaths = new Map(paths);
    }
    return paths;
}

export function excludeBlogRedirects(paths: string[], redirects: BlogRedirect[] = BLOG_REDIRECTS) {
    const sources = blogRedirectPaths(redirects);
    return paths.filter((path) => !sources.has(path));
}

export function blogRedirectNginx(redirects: BlogRedirect[] = BLOG_REDIRECTS, canonicalPaths?: string[]) {
    return (
        [...blogRedirectPaths(redirects)]
            .map(([from, to]) => {
                if (canonicalPaths && !canonicalPaths.includes(to)) throw new Error(`Unpublished blog redirect target: ${to}`);
                return `"${from}" "${to}";`;
            })
            .join("\n") + "\n"
    );
}
