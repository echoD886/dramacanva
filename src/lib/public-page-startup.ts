import { parseBlogPath } from "../content/blog-locales";
import { isGuidePath } from "../content/guide-pages/slugs";
import publicRoutes from "./public-route-index.generated.json";
import { splitLocaleAndPath } from "./site-identity";
const modelPaths = new Set(publicRoutes.models.map((slug) => "/" + slug));
const templateIds = new Set<string>(publicRoutes.templates);
const workSlugs = new Set<string>(publicRoutes.workSlugs);
export type PublicPageKind = "changelog" | "home" | "blog" | "article" | "pricing" | "help" | "legal" | "detail" | "mcp" | "model" | "guide" | "skill" | "ecommerce" | "aiVideoTemplates" | "aiVideoTemplateDetail";

export function initialPublicPage(pathname: string): PublicPageKind | undefined {
    const { cleanPath } = splitLocaleAndPath(pathname);
    if (cleanPath === "/changelog") return "changelog";
    if (cleanPath === "/ai-video-templates" || cleanPath.startsWith("/ai-video-templates/category/")) return "aiVideoTemplates";
    if (/^\/ai-video-templates\/[a-z0-9-]+$/.test(cleanPath)) return "aiVideoTemplateDetail";
    if (/^\/skills\/[a-z0-9-]+$/.test(cleanPath)) return "skill";
    if (modelPaths.has(cleanPath)) return "model";
    if (isGuidePath(cleanPath)) return "guide";
    if (/^(?:\/|\/home\/?)$/.test(cleanPath)) return "home";
    if (/^\/pricing\/?$/.test(cleanPath)) return "pricing";
    if (cleanPath === "/help") return "help";
    if (cleanPath === "/mcp") return "mcp";
    if (cleanPath === "/legal/terms" || cleanPath === "/legal/privacy" || cleanPath === "/legal/refund" || cleanPath === "/legal/acceptable-use") return "legal";
    const detail = cleanPath.match(/^\/detail\/([a-f0-9-]+)$/i);
    if (detail && templateIds.has(detail[1])) return "detail";
    const work = cleanPath.match(/^\/works\/([a-z0-9-]+)$/);
    if (work && workSlugs.has(work[1])) return "detail";
    const blog = parseBlogPath(pathname);
    if (blog) return blog.slug ? "article" : "blog";
    return undefined;
}

/** A public-page warmup may fail; normal routing must still display its error UI. */
export async function prepareInitialPublicPage(pathname: string, loaders: Record<PublicPageKind, () => Promise<void>>, maxWaitMs = 8_000, messagesReady?: Promise<void>) {
    const page = initialPublicPage(pathname);
    if (!page && !messagesReady) return;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
        await Promise.race([
            Promise.all([messagesReady, page ? loaders[page]() : undefined]),
            new Promise<void>((resolve) => {
                timeout = setTimeout(resolve, maxWaitMs);
            }),
        ]);
    } catch {
        // Do not turn an optional warmup failure into a permanently inert SSR page.
    } finally {
        clearTimeout(timeout);
    }
}
