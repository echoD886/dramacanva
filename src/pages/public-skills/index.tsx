import { Link, useLocation } from "react-router";
import { useEffect, useSyncExternalStore } from "react";
import { applyPageSEO } from "@/lib/page-seo";
import { resolveSkillPageSEO } from "@/lib/skill-page-seo";
import { skillContent, skillPageForPath, skillPath, skillUseTarget, type SkillPageIndex } from "@/content/skill-pages";
import { readSkillPage } from "@/content/skill-page-body";
import { publicSkillCover } from "./skill-cover";
import { normalizePublicAppearance, useAppearanceStore } from "@/stores/use-appearance-store";
import { getPublicAppearance } from "@/services/api/appearance";
import { usePublicSkillBrandStore } from "@/stores/use-public-skill-brand-store";
import { splitLocaleAndPath } from "@/lib/site-identity";
import { skillPageCopy } from "@/i18n/skill-page-copy";
import "../blog/blog.css";
import "./skill-pages.css";

export default function PublicSkillsPage() {
    const { pathname, search } = useLocation();
    const { locale } = splitLocaleAndPath(pathname);
    const copy = skillPageCopy(locale);
    const route = skillPageForPath(pathname);
    const storedBrand = useSyncExternalStore(
        useAppearanceStore.subscribe,
        () => useAppearanceStore.getState().appearance.brandName,
        () => useAppearanceStore.getState().appearance.brandName,
    );
    const publicBrand = usePublicSkillBrandStore((state) => state.brandName);
    const brand = publicBrand || storedBrand;
    useEffect(() => {
        const controller = new AbortController();
        getPublicAppearance(controller.signal)
            .then((appearance) => {
                if (!controller.signal.aborted) usePublicSkillBrandStore.setState({ brandName: normalizePublicAppearance(appearance).brandName });
            })
            .catch(() => {
                // Public settings are optional during static rendering/offline reading; use the shared appearance default.
            });
        return () => controller.abort();
    }, []);
    useEffect(() => {
        const seo = resolveSkillPageSEO(pathname, search, brand);
        if (seo) applyPageSEO(seo);
    }, [pathname, search, brand]);
    const card = (page: SkillPageIndex) => {
        const content = skillContent(page, brand);
        const cover = publicSkillCover(page);
        return (
            <article key={page.slug}>
                {cover && <img className="public-skill-cover" src={cover} alt="" loading="lazy" />}
                <h2>
                    <Link to={skillPath(locale, page.slug)}>{content.title}</Link>
                </h2>
                <p>{content.oneLiner}</p>
                <Link className="isa-blog-read" to={skillPath(locale, page.slug)}>
                    {copy.read} →
                </Link>
            </article>
        );
    };
    if (!route)
        return (
            <main className="yingce-blog-page">
                <h1>{copy.unavailable}</h1>
            </main>
        );
    if (!route.page)
        return (
            <main className="yingce-blog-page public-skill-library">
                <header className="yingce-blog-hero">
                    <div>
                        <span>{brand}</span>
                        <h1>{copy.library}</h1>
                    </div>
                </header>
                <section className="yingce-blog-grid">{route.pages.map(card)}</section>
            </main>
        );
    const page = readSkillPage(pathname)!;
    const content = skillContent(page, brand);
    const target = skillUseTarget(page);
    const related = route.pages.filter((candidate) => candidate.slug !== page.slug && candidate.tag === page.tag).slice(0, 6);
    return (
        <main className="yingce-blog-page isa-blog-article public-skill-page">
            <article>
                <Link to={skillPath(locale)}>{copy.library}</Link>
                <h1>{content.title}</h1>
                <p className="public-skill-intro">{content.oneLiner}</p>
                <Link className="isa-blog-cta" to={target} rel="nofollow">
                    {copy.use}
                </Link>
                <img className="public-skill-cover" src={publicSkillCover(page)} alt="" />
                {content.intro?.length ? (
                    <section>
                        <h2>{copy.about}</h2>
                        {content.intro.map((text) => (
                            <p key={text}>{text}</p>
                        ))}
                    </section>
                ) : null}
                {content.example ? (
                    <section>
                        <h2>{copy.example}</h2>
                        <dl className="public-skill-example">
                            <div>
                                <dt>{copy.input}</dt>
                                <dd>{content.example.input}</dd>
                            </div>
                            <div>
                                <dt>{copy.output}</dt>
                                <dd>{content.example.output}</dd>
                            </div>
                        </dl>
                    </section>
                ) : null}
                <section>
                    <h2>{copy.scenarios}</h2>
                    <ul className="public-skill-scenarios">
                        {content.scenarios.map((text) => (
                            <li key={text}>{text}</li>
                        ))}
                    </ul>
                </section>
                <section>
                    <h2>{copy.problems}</h2>
                    <div className="public-skill-problems">
                        {content.problems.map(({ pain, solve }) => (
                            <div key={pain}>
                                <h3>{pain}</h3>
                                <p>{solve}</p>
                            </div>
                        ))}
                    </div>
                </section>
                <section>
                    <h2>{copy.steps}</h2>
                    <ol className="public-skill-steps">
                        {content.steps.map((step) => (
                            <li key={step}>{step}</li>
                        ))}
                    </ol>
                </section>
                <section className="isa-faq">
                    <h2>{copy.faq}</h2>
                    {content.faq.map(({ q, a }) => (
                        <details key={q}>
                            <summary>{q}</summary>
                            <p>{a}</p>
                        </details>
                    ))}
                </section>
                {related.length > 0 && (
                    <section className="isa-blog-related">
                        <h2>{copy.related}</h2>
                        <ul>
                            {related.map((other) => (
                                <li key={other.slug}>
                                    <Link to={skillPath(locale, other.slug)}>{skillContent(other, brand).title} →</Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
                <footer>
                    <Link className="isa-blog-cta" to={target} rel="nofollow">
                        {copy.use}
                    </Link>
                </footer>
            </article>
        </main>
    );
}
