import { useState } from "react";
import { Link, useLocation } from "react-router";
import { ArrowRight, Check, ChevronDown, Copy, ExternalLink } from "lucide-react";
import { localizedPublicPath } from "@/i18n/locale-routing";
import { splitLocaleAndPath } from "@/lib/site-identity";
import { modelPageForPath, modelPageCopy } from "@/content/model-pages";
import { getModelCases, type ModelCase } from "@/content/model-cases";
import type { BlogLocale } from "@/content/blog-locales";
import { SupportedModels } from "@/components/public/supported-models";
import "./model-page.css";

const SHOW_MORE_LABELS: Record<BlogLocale, { more: string; less: string }> = {
    "en-US": { more: "Show more", less: "Show less" },
    "zh-CN": { more: "展开全部", less: "收起" },
    "zh-TW": { more: "展開全部", less: "收起" },
    "zh-HK": { more: "展開全部", less: "收起" },
    "ja-JP": { more: "もっと見る", less: "閉じる" },
    "ko-KR": { more: "더 보기", less: "접기" },
    "es-ES": { more: "Mostrar más", less: "Mostrar menos" },
    "pt-BR": { more: "Ver mais", less: "Ver menos" },
};

function ModelCaseCard({ item, locale, copy }: { item: ModelCase; locale: BlogLocale; copy: ReturnType<typeof modelPageCopy> }) {
    const [copied, setCopied] = useState(false);
    const [expanded, setExpanded] = useState(false);

    const title = item.title[locale] ?? item.title["en-US"] ?? item.title["zh-CN"] ?? "";
    const use = item.use[locale] ?? item.use["en-US"] ?? item.use["zh-CN"] ?? "";
    const alt = item.alt[locale] ?? item.alt["en-US"] ?? item.alt["zh-CN"] ?? title;
    const promptText = item.prompt[locale] ?? item.prompt.original;
    const isTranslated = Boolean(item.prompt[locale] && item.prompt[locale] !== item.prompt.original);
    const isLong = promptText.length > 120 || promptText.includes("\n\n");
    const labels = SHOW_MORE_LABELS[locale] ?? SHOW_MORE_LABELS["en-US"];

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(promptText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // ignore
        }
    };

    const authorDisplay = item.credit.author.startsWith("@") ? item.credit.author : `@${item.credit.author}`;

    return (
        <article id={`case-${item.id}`} className="model-cases-card">
            <div className="model-cases-image-wrap">
                <a href={item.image} target="_blank" rel="noopener noreferrer" className="model-cases-image-link" aria-label={`${title} (${item.modelVersion})`}>
                    <img src={item.image} alt={alt} width={item.width} height={item.height} loading="lazy" decoding="async" className="model-cases-image" />
                    <span className="model-cases-image-overlay" aria-hidden>
                        <ExternalLink className="h-4 w-4" />
                    </span>
                </a>
                <span className="model-cases-version-chip">{item.modelVersion}</span>
            </div>

            <div className="model-cases-card-body">
                <div className="model-cases-card-header">
                    <h3 className="model-cases-card-title">{title}</h3>
                    {use ? <p className="model-cases-card-use">{use}</p> : null}
                </div>

                <div className="model-cases-prompt-block">
                    <div className="model-cases-prompt-header">
                        <span className="model-cases-prompt-label">{copy.promptLabel}</span>
                        {isTranslated ? (
                            <span className="model-cases-translated-note" title={copy.translatedNote}>
                                {copy.translatedNote}
                            </span>
                        ) : null}
                    </div>

                    <p className={`model-cases-prompt-text ${expanded ? "model-cases-prompt-text--expanded" : ""}`}>{promptText}</p>

                    {isLong ? (
                        <button type="button" className="model-cases-expand-btn" onClick={() => setExpanded((prev) => !prev)} aria-expanded={expanded}>
                            <span>{expanded ? labels.less : labels.more}</span>
                            <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden />
                        </button>
                    ) : null}
                </div>

                <div className="model-cases-card-actions">
                    <button type="button" onClick={handleCopy} className={`model-cases-copy-btn ${copied ? "model-cases-copy-btn--copied" : ""}`} aria-label={copy.copyPrompt}>
                        {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
                        <span>{copied ? copy.copied : copy.copyPrompt}</span>
                    </button>
                    <Link to="/register?next=%2Fcanvas" className="model-cases-try-btn">
                        <span>{copy.tryPrompt}</span>
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                </div>

                <footer className="model-cases-credit">
                    <span className="model-cases-credit-prefix">{copy.creditBy}</span>{" "}
                    <a href={item.credit.authorUrl} target="_blank" rel="nofollow noopener noreferrer" className="model-cases-credit-link">
                        {authorDisplay}
                    </a>
                    <span className="model-cases-credit-sep" aria-hidden>
                        {" · "}
                    </span>
                    <span className="model-cases-credit-prefix">{copy.creditSource}:</span>{" "}
                    <a href={item.credit.sourceRepo} target="_blank" rel="nofollow noopener noreferrer" className="model-cases-credit-link">
                        {item.credit.sourceName}
                    </a>{" "}
                    <span className="model-cases-credit-license">({item.credit.license})</span>
                </footer>
            </div>
        </article>
    );
}

export default function ModelPage() {
    const { locale, cleanPath } = splitLocaleAndPath(useLocation().pathname);
    const model = modelPageForPath(cleanPath);
    if (!model) return null;
    const copy = modelPageCopy(model, locale);
    const cases = getModelCases(model.slug);
    const local = (path: string) => localizedPublicPath(path, locale);

    return (
        <main className="model-page-root">
            <div className="model-page-container">
                {/* 页面内面包屑：Home / Models / 当前模型 */}
                <nav aria-label="Breadcrumb" className="model-breadcrumb">
                    <ol className="model-breadcrumb-list">
                        <li className="model-breadcrumb-item">
                            <Link to={local("/")}>{copy.home}</Link>
                        </li>
                        <li className="model-breadcrumb-separator" aria-hidden>
                            /
                        </li>
                        <li className="model-breadcrumb-item">
                            <span>{copy.supported}</span>
                        </li>
                        <li className="model-breadcrumb-separator" aria-hidden>
                            /
                        </li>
                        <li className="model-breadcrumb-item">
                            <span aria-current="page" className="model-breadcrumb-current">
                                {model.name}
                            </span>
                        </li>
                    </ol>
                </nav>

                {/* Hero 区域：Eyebrow + 超大 H1 + Intro + CTA 组 + 规格面板 */}
                <section className="model-hero-section">
                    <div className="model-hero-grid">
                        <div className="model-hero-content">
                            <div className="model-hero-eyebrow">
                                <span className="model-provider-badge">{model.provider}</span>
                                <span className="model-eyebrow-divider" aria-hidden>
                                    ·
                                </span>
                                <span className="model-kind-badge">{copy[model.kind]}</span>
                                <span className="model-eyebrow-divider" aria-hidden>
                                    ·
                                </span>
                                <span className="model-status-badge">{copy.online}</span>
                            </div>

                            <h1 className="model-hero-title">{copy.h1}</h1>
                            <p className="model-hero-intro">{copy.intro}</p>

                            <div className="model-hero-actions">
                                <Link className="model-primary-btn" to="/register?next=%2Fcanvas">
                                    <span>{copy.cta}</span>
                                    <ArrowRight className="h-4 w-4" aria-hidden />
                                </Link>
                                <Link className="model-secondary-btn" to={local("/pricing")}>
                                    {copy.pricing}
                                </Link>
                                <Link className="model-text-link" to={local("/mcp")}>
                                    MCP / API
                                </Link>
                            </div>
                        </div>

                        {/* 克制的视觉规格面板 */}
                        <aside className="model-spec-panel" aria-label={copy.generationOptions}>
                            <div className="model-spec-header">
                                <div className="model-spec-header-title">
                                    <span className="model-spec-pulse" aria-hidden />
                                    <span>{copy.generationOptions}</span>
                                </div>
                                <span className="model-spec-badge">{copy[model.kind]}</span>
                            </div>

                            <div className="model-spec-rows">
                                <div className="model-spec-row">
                                    <span className="model-spec-label">{copy.provider}</span>
                                    <span className="model-spec-value font-semibold">{model.provider}</span>
                                </div>
                                <div className="model-spec-row">
                                    <span className="model-spec-label">{copy.versions}</span>
                                    <div className="model-spec-chips">
                                        {model.versions.map((version) => (
                                            <span key={version} className="model-spec-chip">
                                                {version}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="model-spec-row">
                                    <span className="model-spec-label">{copy.tiers}</span>
                                    <span className="model-spec-value font-mono text-xs sm:text-sm">{model.tiers}</span>
                                </div>
                            </div>

                            <p className="model-spec-note">{copy.controls}</p>
                        </aside>
                    </div>
                </section>

                {/* 短剧适用场景；规格已在首屏面板展示 */}
                <section className="model-details-section">
                    <div className="model-details-grid model-details-grid--single">
                        <div className="model-detail-block">
                            <h2 className="model-detail-heading">{copy.scenes}</h2>
                            <p className="model-detail-text">{copy.sceneText}</p>
                        </div>
                    </div>
                </section>

                {/* 核心能力 / 创作内容（仅当有数据时渲染） */}
                {copy.capabilities && copy.capabilities.length > 0 ? (
                    <section className="model-capabilities-section" aria-labelledby="model-capabilities-heading">
                        <div className="model-capabilities-header">
                            <h2 id="model-capabilities-heading" className="model-capabilities-title">
                                {copy.capabilitiesTitle}
                            </h2>
                            {copy.capabilitiesIntro ? <p className="model-capabilities-intro">{copy.capabilitiesIntro}</p> : null}
                        </div>
                        <div className="model-capabilities-grid">
                            {copy.capabilities.map((item, index) => {
                                const matchedCase = item.caseId ? cases.find((c) => c.id === item.caseId) : undefined;
                                return (
                                    <article key={item.title + index} className="model-capabilities-card">
                                        <h3 className="model-capabilities-card-title">{item.title}</h3>
                                        <p className="model-capabilities-card-body">{item.body}</p>
                                        {matchedCase ? (
                                            <a href={`#case-${item.caseId}`} className="model-capabilities-example-link">
                                                <span>{copy.seeExample}</span>
                                                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                                            </a>
                                        ) : null}
                                    </article>
                                );
                            })}
                        </div>
                    </section>
                ) : null}

                {/* 真实生成案例（仅当有案例数据时渲染） */}
                {cases.length > 0 ? (
                    <section className="model-cases-section" aria-labelledby="model-cases-heading">
                        <div className="model-cases-header">
                            <h2 id="model-cases-heading" className="model-cases-title">
                                {copy.casesTitle}
                            </h2>
                            <p className="model-cases-intro">{copy.casesIntro}</p>
                        </div>
                        <div className="model-cases-grid">
                            {cases.map((item) => (
                                <ModelCaseCard key={item.id} item={item} locale={locale} copy={copy} />
                            ))}
                        </div>
                    </section>
                ) : null}

                {/* 生产难题与解决方案（仅当有数据时渲染） */}
                {copy.problems && copy.problems.length > 0 ? (
                    <section className="model-problems-section" aria-labelledby="model-problems-heading">
                        <div className="model-problems-header">
                            <h2 id="model-problems-heading" className="model-problems-title">
                                {copy.problemsTitle}
                            </h2>
                            {copy.problemsIntro ? <p className="model-problems-intro">{copy.problemsIntro}</p> : null}
                        </div>
                        <div className="model-problems-list">
                            {copy.problems.map((item, index) => (
                                <div key={index} className="model-problems-item">
                                    <div className="model-problems-problem">{item.problem}</div>
                                    <div className="model-problems-solution">{item.solution}</div>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null}

                {/* 使用步骤（时间线/卡片列表） */}
                <section className="model-steps-section">
                    <div className="model-steps-header">
                        <h2 className="model-steps-title">{copy.stepsTitle}</h2>
                    </div>
                    <ol className="model-steps-grid">
                        {copy.steps.map((step, index) => (
                            <li key={step} className="model-step-card">
                                <span className="model-step-number" aria-hidden>
                                    0{index + 1}
                                </span>
                                <p className="model-step-desc">{step}</p>
                            </li>
                        ))}
                    </ol>
                </section>

                {/* FAQ（展开收起 details/summary，默认展开第一个，DOM 中完全保留） */}
                <section className="model-faq-section">
                    <div className="model-faq-header">
                        <h2 className="model-faq-title">{copy.faqTitle}</h2>
                    </div>
                    <div className="model-faq-list">
                        {copy.faq.map((faq, index) => (
                            <details key={faq.question} className="model-faq-item group" open={index === 0}>
                                <summary className="model-faq-summary">
                                    <h3 className="model-faq-question">{faq.question}</h3>
                                    <ChevronDown className="model-faq-chevron" aria-hidden />
                                </summary>
                                <div className="model-faq-content">
                                    <p className="model-faq-answer">{faq.answer}</p>
                                </div>
                            </details>
                        ))}
                    </div>

                    <div className="model-faq-footer-links">
                        <Link to={local("/pricing")}>{copy.pricing}</Link>
                        {" · "}
                        <Link to={local("/mcp")}>MCP / API</Link>
                    </div>
                </section>

                {/* 底部 CTA 区域 */}
                <section className="model-bottom-cta-section">
                    <div className="model-bottom-cta-card">
                        <h2 className="model-bottom-cta-title">{copy.cta}</h2>
                        <p className="model-bottom-cta-desc">{copy.intro}</p>
                        <div className="model-bottom-cta-actions">
                            <Link className="model-primary-btn" to="/register?next=%2Fcanvas">
                                <span>{copy.cta}</span>
                                <ArrowRight className="h-4 w-4" aria-hidden />
                            </Link>
                            <Link className="model-secondary-btn" to={local("/pricing")}>
                                {copy.pricing}
                            </Link>
                        </div>
                    </div>
                </section>

                {/* 其他模型互链（当前模型高亮） */}
                <SupportedModels locale={locale} currentSlug={model.slug} />
            </div>
        </main>
    );
}
