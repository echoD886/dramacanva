import { useEffect } from "react";
import { Link, useLocation } from "react-router";
import type { BlogLocale } from "@/content/blog-locales";
import { MODEL_PAGES, MODEL_COPY, modelDisplayName } from "@/content/model-pages";
import { localizedPublicPath } from "@/i18n/locale-routing";
import { cn } from "@/lib/utils";

export function SupportedModels({ locale, currentSlug }: { locale: BlogLocale; currentSlug?: string }) {
    const copy = MODEL_COPY[locale];
    const { hash } = useLocation();
    // Client-side navigation does not scroll to #fragments; the footer's "All models" link lands here.
    useEffect(() => {
        if (hash !== "#supported-models") return;
        const timer = window.setTimeout(() => document.getElementById("supported-models")?.scrollIntoView({ block: "start" }), 120);
        return () => window.clearTimeout(timer);
    }, [hash]);
    return (
        <section id="supported-models" className="mx-auto w-full max-w-5xl scroll-mt-24 px-6 py-12 text-foreground" aria-label={copy.supported}>
            <div className="mb-6 flex items-center justify-between border-b border-border/60 pb-4">
                <h2 className="text-xl font-bold tracking-tight text-foreground">{copy.supported}</h2>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {MODEL_PAGES.map((model) => {
                    const isCurrent = model.slug === currentSlug;
                    return (
                        <li key={model.slug}>
                            <Link
                                className={cn(
                                    "group flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition-all duration-150",
                                    isCurrent ? "border-foreground/30 bg-muted/80 text-foreground font-semibold shadow-xs" : "border-border/60 bg-card/40 text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground",
                                )}
                                to={localizedPublicPath("/" + model.slug, locale)}
                                aria-current={isCurrent ? "page" : undefined}
                            >
                                <span className="flex items-center gap-2 truncate">
                                    {isCurrent && <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" aria-hidden />}
                                    <span className="truncate">{modelDisplayName(model)}</span>
                                </span>
                                <span className="text-xs text-muted-foreground/80 shrink-0 ml-2">{copy[model.kind]}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
