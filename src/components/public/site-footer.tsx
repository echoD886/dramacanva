import type { ReactNode } from "react";
import { Link } from "react-router";
import type { BlogLocale } from "@/content/blog-locales";
import { SITE_FOOTER_COPY } from "./site-footer-copy";
import { MODEL_PAGES, modelDisplayName } from "@/content/model-pages";
import { rememberLocaleChoice } from "@/i18n/default-entry";
import { PUBLIC_LOCALE_OPTIONS } from "@/i18n/locale-options";
import { localizedPublicPath } from "@/i18n/locale-routing";
import { SUPPORT_EMAIL } from "@/lib/site-identity";
import { LibTVBrand } from "@/components/layout/libtv-navigation";
import "./site-footer.css";

export function SiteFooter({ locale, children }: { locale: BlogLocale; children?: ReactNode }) {
    const copy = SITE_FOOTER_COPY[locale];
    // Flagship models only, newest first; "All models" leads to the full grid on Pricing.
    const featuredVideo = ["seedance-2-5", "kling-4", "veo-3-1", "sora-2", "wan-3-0"];
    const featuredImage = ["gpt-image-2", "nano-banana", "midjourney-v7"];
    const pick = (slugs: string[]) => slugs.flatMap((slug) => MODEL_PAGES.filter((model) => model.slug === slug));
    const videoModels = pick(featuredVideo);
    const imageModels = pick(featuredImage);

    return (
        <footer className="dc-site-footer">
            <div className="dc-site-footer-inner">
                <div className="dc-site-footer-main">
                    <div className="dc-site-footer-brand-col">
                        <Link to={localizedPublicPath("/", locale)} className="dc-site-footer-brand" aria-label="DramaCanvas">
                            <LibTVBrand />
                        </Link>
                        <p className="dc-site-footer-tagline">{copy.tagline}</p>
                        <div className="dc-site-footer-contact">
                            <span className="dc-site-footer-contact-label">{copy.contact}</span>
                            <a href={`mailto:${SUPPORT_EMAIL}`} className="dc-site-footer-contact-link">
                                {SUPPORT_EMAIL}
                            </a>
                        </div>
                    </div>

                    <div className="dc-site-footer-grid">
                        <nav className="dc-site-footer-col dc-site-footer-links" aria-label={copy.product}>
                            <h3 className="dc-site-footer-heading">{copy.product}</h3>
                            <ul className="dc-site-footer-list">
                                <li>
                                    <a href={localizedPublicPath("/ai-video-templates", locale)}>AI Video Templates</a>
                                </li>
                                <li>
                                    <Link to={localizedPublicPath("/", locale)}>{copy.canvas}</Link>
                                </li>
                                <li>
                                    <Link to={localizedPublicPath("/mcp", locale)}>{copy.agent}</Link>
                                </li>
                                <li>
                                    <Link to={localizedPublicPath("/pricing", locale)}>{copy.pricing}</Link>
                                </li>
                            </ul>
                        </nav>

                        <nav className="dc-site-footer-col dc-site-footer-links" aria-label={copy.videoModels}>
                            <h3 className="dc-site-footer-heading">{copy.videoModels}</h3>
                            <ul className="dc-site-footer-list">
                                {videoModels.map((model) => (
                                    <li key={model.slug}>
                                        <Link to={localizedPublicPath("/" + model.slug, locale)}>{modelDisplayName(model)}</Link>
                                    </li>
                                ))}
                            </ul>
                        </nav>

                        <nav className="dc-site-footer-col dc-site-footer-links" aria-label={copy.imageModels}>
                            <h3 className="dc-site-footer-heading">{copy.imageModels}</h3>
                            <ul className="dc-site-footer-list">
                                {imageModels.map((model) => (
                                    <li key={model.slug}>
                                        <Link to={localizedPublicPath("/" + model.slug, locale)}>{modelDisplayName(model)}</Link>
                                    </li>
                                ))}
                                <li>
                                    <Link to={`${localizedPublicPath("/pricing", locale)}#supported-models`} className="dc-site-footer-more">
                                        {copy.allModels} →
                                    </Link>
                                </li>
                            </ul>
                        </nav>

                        <nav className="dc-site-footer-col dc-site-footer-links" aria-label={copy.resources}>
                            <h3 className="dc-site-footer-heading">{copy.resources}</h3>
                            <ul className="dc-site-footer-list">
                                <li>
                                    <Link to={localizedPublicPath("/blog", locale)}>{copy.blog}</Link>
                                </li>
                                <li>
                                    <Link to={localizedPublicPath("/help", locale)}>{copy.help}</Link>
                                </li>
                                <li>
                                    
                                </li>
                                <li>
                                    <a href={`${localizedPublicPath("/", locale)}#feedback`}>{copy.feedback}</a>
                                </li>
                            </ul>
                        </nav>

                        <nav className="dc-site-footer-col dc-site-footer-links" aria-label={copy.legal}>
                            <h3 className="dc-site-footer-heading">{copy.legal}</h3>
                            <ul className="dc-site-footer-list">
                                <li>
                                    <Link to={localizedPublicPath("/legal/terms", locale)}>{copy.terms}</Link>
                                </li>
                                <li>
                                    <Link to={localizedPublicPath("/legal/privacy", locale)}>{copy.privacy}</Link>
                                </li>
                                <li>
                                    <Link to={localizedPublicPath("/legal/refund", locale)}>{copy.refund}</Link>
                                </li>
                                <li>
                                    <Link to={localizedPublicPath("/legal/acceptable-use", locale)}>{copy.acceptableUse}</Link>
                                </li>
                            </ul>
                        </nav>
                    </div>
                </div>

                {children ? <div className="dc-site-footer-slot">{children}</div> : null}

                <div className="dc-site-footer-bottom">
                    <p className="dc-site-footer-copyright">{copy.copyright}</p>
                    <div className="dc-site-footer-locales" aria-label={copy.languages}>
                        <span className="dc-site-footer-locales-label" aria-hidden="true">
                            {copy.languages}
                        </span>
                        <div className="dc-site-footer-locales-list">
                            {PUBLIC_LOCALE_OPTIONS.map((option) => {
                                const isCurrent = option.value === locale;
                                return (
                                    <a
                                        key={option.value}
                                        href={option.href}
                                        onClick={() => rememberLocaleChoice(option.value)}
                                        hrefLang={option.value}
                                        lang={option.value}
                                        aria-current={isCurrent ? "true" : undefined}
                                        className={isCurrent ? "is-active" : undefined}
                                    >
                                        {option.label}
                                    </a>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
