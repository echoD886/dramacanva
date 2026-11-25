# SEO in this frontend snapshot

The default preview is not intended to be indexed. `index.html` declares `noindex,nofollow`, and the preview head renderer enforces that boundary. It does not publish canonical links pointing at the hosted product.

The source retains reusable helpers:

- `src/lib/page-seo.ts`: page metadata, language alternates and structured-data builders.
- `src/lib/page-seo-head.ts`: safe HTML/JSON serialization and head updates.
- `src/lib/skill-page-seo.ts`: skill titles, descriptions, FAQs, how-to steps and Markdown output.
- `src/i18n/locale-routing.ts`: localized paths.

These helpers are source material for your own deployment. They do not provide the hosted service's server rendering, prerender pipeline, sitemaps, search-console access or analytics accounts.

Before enabling indexing, configure your own site identity and domain, restore only the metadata appropriate to your public routes, and render useful HTML for crawlers. Set canonical and language-alternate URLs consistently. Keep private workspaces and empty demo pages out of the index. Review structured data against visible page content; it does not guarantee rich results or search rankings.

The README uses descriptive terms such as AI filmmaking, short dramas, storyboards and creative workflows to explain the project. It makes no claim that this repository alone produces cinema-quality video or provides a complete AI generation service.
