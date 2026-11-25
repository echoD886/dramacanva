import { BLOG_LOCALES } from "../content/blog-locales";
import { publicSkills, skillContent, skillPageForPath, skillPath } from "../content/skill-pages";
import { loadedSkillPage, readSkillPage } from "../content/skill-page-body";
import { skillPageCopy } from "../i18n/skill-page-copy";
import { SITE_NAME, SITE_URL, defaultShareImage } from "./site-identity";
import { localizedPublicPath } from "../i18n/locale-routing";
import type { PageSEO } from "./page-seo";
import { buildOrganizationSchema } from "./page-seo";

export function resolveSkillPageSEO(path: string, search = "", brand = SITE_NAME): PageSEO | undefined {
    const route = skillPageForPath(path);
    if (!route) return undefined;
    const { locale, page, pages } = route;
    const content = page ? skillContent(page, brand) : undefined;
    const fullPage = page ? loadedSkillPage(page) : undefined;
    const fullContent = fullPage ? skillContent(fullPage, brand) : undefined;
    const copy = skillPageCopy(locale);
    const canonical = SITE_URL + skillPath(locale, page?.slug);
    const title = `${content?.title || copy.library} | ${brand}`;
    const description = content?.metaDescription || pages.map((page) => skillContent(page, brand).oneLiner).join(" ");
    const locales = BLOG_LOCALES.filter((candidate) => (page ? publicSkills(candidate).some((other) => other.slug === page.slug) : publicSkills(candidate).length > 0));
    const alternates = locales.map((language) => ({ language: language as string, href: SITE_URL + skillPath(language, page?.slug) }));
    const defaultLocale = locales.includes("en-US") ? "en-US" : locales[0];
    if (defaultLocale) alternates.push({ language: "x-default", href: SITE_URL + skillPath(defaultLocale, page?.slug) });
    const index = [...new URLSearchParams(search).keys()].every((key) => /^(utm_[a-z0-9_]+|gclid|fbclid|msclkid|theme)$/.test(key));
    const graph: Record<string, unknown>[] = [
        { "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: `${SITE_URL}/`, name: brand, inLanguage: locale, publisher: { "@id": `${SITE_URL}/#organization` } },
        buildOrganizationSchema(locale),
        {
            "@type": "BreadcrumbList",
            itemListElement: [
                { "@type": "ListItem", position: 1, name: brand, item: SITE_URL + localizedPublicPath("/", locale) },
                { "@type": "ListItem", position: 2, name: copy.library, item: SITE_URL + skillPath(locale) },
                ...(content ? [{ "@type": "ListItem", position: 3, name: content.title, item: canonical }] : []),
            ],
        },
    ];
    if (fullContent)
        graph.push(
            { "@type": "FAQPage", "@id": canonical + "#faq", inLanguage: locale, mainEntity: fullContent.faq.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
            {
                "@type": "HowTo",
                "@id": canonical + "#how-to",
                name: fullContent.title,
                description: fullContent.oneLiner,
                inLanguage: locale,
                step: fullContent.steps.map((text, index) => ({ "@type": "HowToStep", position: index + 1, name: text, text })),
            },
        );
    else if (!page) graph.push({ "@type": "CollectionPage", name: copy.library, url: canonical, inLanguage: locale });
    return {
        title,
        description,
        keywords: (content?.keywords || pages.flatMap((page) => skillContent(page, brand).keywords)).join(", "),
        canonical,
        image: defaultShareImage(locale),
        index,
        follow: index,
        language: locale,
        alternates: index ? alternates : undefined,
        schema: index ? { "@context": "https://schema.org", "@graph": graph } : undefined,
    };
}

export function skillMarkdown(path: string, brand = SITE_NAME) {
    const route = skillPageForPath(path);
    if (!route) throw new Error(`Missing skill content: ${path}`);
    const copy = skillPageCopy(route.locale);
    const fullPage = readSkillPage(path);
    const content = fullPage ? skillContent(fullPage, brand) : undefined;
    return [
        `# ${content?.title || copy.library}`,
        "",
        `Source: ${SITE_URL}${skillPath(route.locale, route.page?.slug)}`,
        "",
        ...(content
            ? [
                  content.oneLiner,
                  "",
                  ...(content.intro?.length ? [`## ${copy.about}`, ...content.intro.flatMap((text) => [text, ""])] : []),
                  ...(content.example ? [`## ${copy.example}`, `- ${copy.input}: ${content.example.input}`, `- ${copy.output}: ${content.example.output}`, ""] : []),
                  `## ${copy.scenarios}`,
                  ...content.scenarios.map((text) => `- ${text}`),
                  "",
                  `## ${copy.problems}`,
                  ...content.problems.flatMap(({ pain, solve }) => [`### ${pain}`, "", solve, ""]),
                  `## ${copy.steps}`,
                  ...content.steps.map((text, index) => `${index + 1}. ${text}`),
                  "",
                  `## ${copy.faq}`,
                  ...content.faq.flatMap(({ q, a }) => [`### ${q}`, "", a, ""]),
              ]
            : route.pages.flatMap((page) => {
                  const content = skillContent(page, brand);
                  return [`- [${content.title}](${SITE_URL}${skillPath(route.locale, page.slug)}): ${content.oneLiner}`];
              })),
        "",
    ].join("\n");
}
