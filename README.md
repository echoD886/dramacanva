<p align="center"><img src="public/brand/logo.png" width="76" alt="DramaCanvas logo" /></p>

# DramaCanvas

**An open-source frontend for AI filmmaking, short dramas and visual storytelling.**

[Try DramaCanvas](https://dramacanva.com/) · [Quick start](#quick-start) · [API integration](docs/api.md) · [Release scope](docs/scope.md)

English · [简体中文](README.zh-CN.md) · [Français](README.fr.md) · [日本語](README.ja.md)

![DramaCanvas — From story to screen](docs/assets/cover.png)

DramaCanvas brings story planning, an infinite canvas and reusable creative skills into one workspace. This repository shares selected frontend pages and components from the product: a starting point for studying the interface, building your own creative tools, or connecting your own backend.

**This is a frontend preview, not the complete hosted service.** The local version uses isolated demo data. AI generation, cloud accounts, payments and server-side storage are not included. To try the full product, visit [dramacanva.com](https://dramacanva.com/).

## What can you do on DramaCanvas?

On [dramacanva.com](https://dramacanva.com/), you can develop a story into a short-drama project, plan characters and storyboard shots, generate images and video clips with AI models, and organize your material on an infinite canvas. Creative skills and video templates help you reuse workflows for short dramas, short films, music videos and other visual stories. Available generation options depend on the model and your account.

**[Open the online workspace →](https://dramacanva.com/)**

## Explore the workspace

| Area | What you can explore |
| --- | --- |
| Home | The landing page, creation entry points and a fictional showcase |
| Short dramas | Project navigation and the story-creation interface |
| Canvas | The visual workspace, node components and editing code |
| Creative skills | A multilingual skill directory, detail pages and reusable UI |
| Video templates | Template browsing and generation-input interfaces |
| Content tools | The toolbox, asset-library interface and selected public pages |

Original artwork and production project records are replaced or omitted. Empty states are intentional where a page normally receives server data. Product Studio and About are outside this release.

## Quick start

Use Node.js 22.12+ and Bun 1.3+.

```bash
git clone https://github.com/echoD886/dramacanva.git
cd dramacanva
bun install
bun run dev
```

Open **http://127.0.0.1:5173**. No account, API key or backend configuration is required.

```bash
bun run build       # Build the frontend
bun run preview     # Preview the build at http://127.0.0.1:4173
bun run typecheck
bun run test
bun run audit:public
```

This preview does not accept real generation or payment requests. Unsupported actions return a backend-required error; they do not simulate a completed job.

## Connect your own backend

The frontend includes TypeScript request and response types. [API integration](docs/api.md) explains the inputs for projects, skills, templates and generation tasks, the response envelope, and where to replace the demo transport.

Keep provider credentials on your server. Replacing the transport is an integration task: authentication, authorization, storage and task execution are not supplied by this repository. The public build does not connect to the hosted DramaCanvas API.

## Languages and SEO

English is the default. This README is also available in Chinese, French and Japanese. Existing public-page content covers English, Simplified Chinese, Traditional Chinese, Japanese, Korean, Spanish and Portuguese; translation coverage varies by page. A French README does not imply a complete French application translation.

The source includes page-title and description helpers, canonical and language-alternate helpers, and structured data for skill descriptions, FAQs and how-to steps. These are useful when adapting a multilingual site for search engines. The local preview is **noindex**; this release does not include the hosted site's prerendering, sitemap submission or analytics setup. See [SEO notes](docs/seo.md) before deploying your own version.

## Frequently asked questions

### How do I turn a novel or script into an AI short drama?

Start with one scene: identify its characters, action and dialogue, then plan the shots before generating media. DramaCanvas brings project planning, storyboards and image/video tools into one workspace. The [AI short-drama workflow guide](https://dramacanva.com/blog/ai-short-drama-workflow) walks through the process on the hosted product.

### How can I keep AI characters consistent across shots?

Establish character references and reuse them when planning and generating each shot. Keep appearance, clothing and scene notes together on the canvas. Review each result before continuing: reference images help guide generation, but consistency still depends on the model and your choices.

### Can I make an AI video from a single photo?

The hosted [AI Video Templates](https://dramacanva.com/ai-video-templates) page offers photo-based video workflows. Choose a template, check its required inputs and upload a suitable photo. This repository includes the template interfaces; it does not include the generation service or the original template media.

### Is this an open-source AI short-drama generator I can self-host?

You can run and adapt the frontend. It is not a complete self-hosted generator: model execution, accounts, billing and cloud storage require your own backend. Follow [Quick start](#quick-start) to explore locally, or [try the hosted product](https://dramacanva.com/) for the connected workflow.

### Where can I find React code for an AI storyboard or infinite canvas?

See [`src/pages/canvas`](src/pages/canvas), [`src/components/canvas`](src/components/canvas) and [`src/pages/drama`](src/pages/drama). These contain the selected canvas, node and story-creation interfaces. The [API guide](docs/api.md) explains the integration boundary.

### Does cloning this repository give me access to private projects or API keys?

No. The release uses fictional showcase records and isolated demo responses. It contains no production account export or private repository history. Bring your own data and backend; do not put credentials or private media in public issues.

## Project structure

```text
src/pages/        Selected product pages
src/components/   Shared UI and canvas components
src/content/      Public skill content and selected articles
src/i18n/         Existing interface translations
src/services/api/ Frontend API contracts and clients
src/demo/         Isolated transport and example data
public/           Logo and placeholder artwork
docs/             Integration, SEO and release notes
```

Built with React, TypeScript, Vite, Ant Design, Tailwind CSS and Zustand.

## Contributing

Bug reports, clearer documentation and translation improvements are welcome. Include the route, steps to reproduce and expected behavior. Use fictional examples in issues and pull requests; do not attach account exports, private prompts, API keys or personal media. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License and acknowledgments

Code is distributed under the [MIT License](LICENSE), with upstream notices preserved in [NOTICE](NOTICE). This frontend builds on Open AI Canvas and Infinite Canvas. Third-party packages retain their own licenses. The DramaCanvas name and logo identify the project and do not imply endorsement of derivatives.
