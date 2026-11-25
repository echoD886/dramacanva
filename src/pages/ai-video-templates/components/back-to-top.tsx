import { memo, useEffect, useState, type CSSProperties } from "react";
import { ArrowUp } from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";

export function scrollPageTop() {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    document.querySelector(".aivt-page-root")?.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
}

/**
 * Floating "back to top" for the page's own scroll root. Appears after ~1.5 screens and sits just left of the
 * floating chat companion (measured at runtime, so it never overlaps it), above the mobile make bar when present.
 */
export const BackToTop = memo(function BackToTop() {
    const { t } = useI18n();
    const [visible, setVisible] = useState(false);
    const [position, setPosition] = useState<CSSProperties>({});

    useEffect(() => {
        const root = document.querySelector<HTMLElement>(".aivt-page-root");
        if (!root) return;
        const place = () => {
            const gap = 12;
            const dock = document.querySelector<HTMLElement>(".dc-dock")?.getBoundingClientRect();
            const bar = document.querySelector<HTMLElement>(".aivt-mobile-bar");
            const barHeight = bar && getComputedStyle(bar).display !== "none" ? bar.getBoundingClientRect().height : 0;
            if (dock && dock.width > 0) {
                setPosition({ right: Math.max(gap, window.innerWidth - dock.left + gap), bottom: Math.max(gap + barHeight, window.innerHeight - dock.bottom) });
            } else {
                setPosition({ right: 20, bottom: 20 + barHeight });
            }
        };
        let shown = false;
        const onScroll = () => {
            const next = root.scrollTop > root.clientHeight * 1.5;
            if (next && !shown) place();
            shown = next;
            setVisible(next);
        };
        place();
        onScroll();
        root.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", place);
        return () => {
            root.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", place);
        };
    }, []);

    return (
        <button
            type="button"
            className={`aivt-to-top${visible ? " is-visible" : ""}`}
            style={position}
            onClick={scrollPageTop}
            aria-label={t("aiVideoTemplates.backToTop")}
            title={t("aiVideoTemplates.backToTop")}
            tabIndex={visible ? 0 : -1}
            aria-hidden={!visible}
        >
            <ArrowUp aria-hidden="true" />
        </button>
    );
});
