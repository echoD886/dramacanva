import type { PageSEO } from "./page-seo";
import { SITE_NAME, SITE_URL, SHARE_IMAGE, CHINESE_SHARE_IMAGE } from "./site-identity";
import { blogFeedPath } from "../content/blog-locales";
import { OFFICIAL_TWITTER_HANDLE } from "../content/public-trust";

export function escapeHTML(value: string) {
    return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;" })[character]!);
}

export function safeJSON(value: unknown) {
    return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function renderSEOHead(seo: PageSEO) {
    // A frontend snapshot must not impersonate the hosted site's indexed pages.
    seo = { ...seo, index: false, follow: false, canonical: undefined, alternates: undefined, schema: undefined };
    const meta = (key: string, value: string, property = false) => `<meta ${property ? "property" : "name"}="${key}" content="${escapeHTML(value)}">`;
    const image = seo.image;
    return (
        `<title>${escapeHTML(seo.title)}</title>\n` +
        meta("description", seo.description) +
        (seo.keywords ? meta("keywords", seo.keywords) : "") +
        meta("robots", seo.index ? "index,follow,max-image-preview:large" : `noindex,${seo.follow === false ? "nofollow" : "follow"}`) +
        (seo.canonical ? `<link rel="canonical" href="${escapeHTML(seo.canonical)}">` + meta("og:url", seo.canonical, true) : "") +
        (seo.index && seo.canonical ? `<link rel="describedby" href="${SITE_URL}/llms.txt">` : "") +
        (seo.alternates || []).map((alternate) => `<link rel="alternate" hreflang="${escapeHTML(alternate.language)}" href="${escapeHTML(alternate.href)}">`).join("") +
        (seo.blogFeedLocale
            ? (["rss", "atom"] as const).map((format) => `<link rel="alternate" type="application/${format}+xml" title="${format === "rss" ? "RSS 2.0" : "Atom"}" href="${SITE_URL}${blogFeedPath(seo.blogFeedLocale!, format)}">`).join("")
            : "") +
        meta("og:title", seo.title, true) +
        meta("og:description", seo.description, true) +
        meta("og:site_name", SITE_NAME, true) +
        meta("og:type", seo.type || "website", true) +
        meta("og:locale", (seo.language || "zh-CN").replace("-", "_"), true) +
        (image ? meta("og:image", image, true) + (image === SHARE_IMAGE || image === CHINESE_SHARE_IMAGE ? meta("og:image:width", "1200", true) + meta("og:image:height", "630", true) : "") + meta("og:image:alt", seo.title, true) : "") +
        meta("twitter:card", image ? "summary_large_image" : "summary") +
        (OFFICIAL_TWITTER_HANDLE ? meta("twitter:site", OFFICIAL_TWITTER_HANDLE) : "") +
        meta("twitter:title", seo.title) +
        meta("twitter:description", seo.description) +
        (image ? meta("twitter:image", image) : "") +
        (seo.schema ? `<script id="page-schema" type="application/ld+json">${safeJSON(seo.schema)}</script>` : "")
    );
}

export function applyPageSEO(seo: PageSEO, target: Document = document) {
    const parsed = new DOMParser().parseFromString(renderSEOHead(seo), "text/html");
    const current = Array.from(target.head
        .querySelectorAll(
            'title,meta[name="description"],meta[name="keywords"],meta[name="robots"],meta[name^="twitter:"],meta[property^="og:"],link[rel="canonical"],link[rel="describedby"],link[rel="alternate"][hreflang],link[rel="alternate"][type="application/rss+xml"],link[rel="alternate"][type="application/atom+xml"],#page-schema',
        ));
    const key = (node: Element) => [node.tagName, node.getAttribute("name"), node.getAttribute("property"), node.getAttribute("rel"), node.getAttribute("hreflang"), node.getAttribute("type"), node.id].join("|");
    const remaining = new Set(current);
    // Update matching nodes in place. New tags exist before obsolete ones are removed.
    for (const desired of Array.from(parsed.head.children)) {
        const existing = current.find((node) => remaining.has(node) && key(node) === key(desired));
        if (!existing) {
            target.head.appendChild(target.importNode(desired, true));
            continue;
        }
        remaining.delete(existing);
        for (const attribute of Array.from(existing.attributes)) if (!desired.hasAttribute(attribute.name)) existing.removeAttribute(attribute.name);
        for (const attribute of Array.from(desired.attributes)) if (existing.getAttribute(attribute.name) !== attribute.value) existing.setAttribute(attribute.name, attribute.value);
        if (existing.textContent !== desired.textContent) existing.textContent = desired.textContent;
    }
    for (const node of remaining) node.remove();
    if (seo.language) target.documentElement.lang = seo.language;
}
