import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { flushSync } from "react-dom";
import { ArrowUp } from "lucide-react";
import { findScrollContainer } from "@/lib/scroll-container";
import { useI18n } from "@/i18n/use-i18n";
import "./scroll-experience.css";

const reducedQuery = "(prefers-reduced-motion: reduce)";
const clamp = (value: number) => Math.max(0, Math.min(1, value));

export function useScrollExperience(page: RefObject<HTMLElement | null>, contentKey: string) {
    const seen = useRef(new Set<string>());
    const [showTop, setShowTop] = useState(false);

    useEffect(() => {
        const element = page.current;
        if (!element) return;
        const root = findScrollContainer(element);
        const eventTarget = root === document.scrollingElement ? window : root;
        const motion = window.matchMedia(reducedQuery);
        const cards = [...element.querySelectorAll<HTMLElement>("[data-scroll-reveal]")];
        const toolbar = element.querySelector<HTMLElement>("[data-scroll-toolbar]");
        const effects = [...element.querySelectorAll<HTMLElement>("[data-scroll-parallax], [data-scroll-fade]")].map((node) => ({ node, top: 0, height: 1, travel: 0 }));
        let frame = 0;
        let observer: IntersectionObserver | undefined;

        const reveal = (node: HTMLElement, animate: boolean) => {
            seen.current.add(node.dataset.scrollReveal!);
            node.dataset.revealState = animate ? "revealed" : "visible";
            observer?.unobserve(node);
        };
        const prepare = () => {
            observer?.disconnect();
            if (!motion.matches && "IntersectionObserver" in window) {
                observer = new IntersectionObserver(
                    (entries) => {
                        for (const entry of entries) if (entry.isIntersecting) reveal(entry.target as HTMLElement, true);
                    },
                    { root: root === document.scrollingElement ? null : root, threshold: 0.08 },
                );
            }
            const viewportBottom = root.getBoundingClientRect().top + root.clientHeight;
            // Read the whole grid before revealing cards: interleaved reads and
            // dataset/style writes force a fresh layout for each remaining card.
            const columns = new Map<Element, number>();
            const positions = cards.map((card) => {
                const visible = motion.matches || !observer || seen.current.has(card.dataset.scrollReveal!) || card.getBoundingClientRect().top < viewportBottom;
                if (visible) return { card, visible, delay: 0 };
                const parent = card.parentElement!;
                if (!columns.has(parent)) columns.set(parent, getComputedStyle(parent).gridTemplateColumns.split(" ").length);
                const column = [...parent.children].indexOf(card) % columns.get(parent)!;
                return { card, visible, delay: column * 50 };
            });
            for (const { card, visible, delay } of positions) {
                // Never hide first-paint content, restored scroll positions, or already seen cards.
                if (visible) {
                    reveal(card, false);
                } else {
                    card.style.setProperty("--reveal-delay", `${delay}ms`);
                    card.dataset.revealState = "pending";
                    observer?.observe(card);
                }
            }
        };
        const measure = () => {
            const rootTop = root === document.scrollingElement ? 0 : root.getBoundingClientRect().top;
            for (const effect of effects) {
                const scene = effect.node.closest<HTMLElement>("[data-scroll-scene]") ?? effect.node;
                const rect = scene.getBoundingClientRect();
                effect.top = rect.top - rootTop + root.scrollTop;
                effect.height = rect.height;
                effect.travel = Math.min(32, effect.node.clientHeight * 0.05);
            }
            schedule();
        };
        const update = () => {
            frame = 0;
            const y = root.scrollTop;
            setShowTop(y > root.clientHeight * 2);
            if (toolbar) toolbar.dataset.compact = String(y > 24);
            for (const { node, top, height, travel } of effects) {
                if (motion.matches) {
                    node.style.removeProperty("transform");
                    node.style.removeProperty("opacity");
                    continue;
                }
                const progress = clamp(y / Math.max(1, top + height));
                if (node.hasAttribute("data-scroll-parallax")) node.style.transform = `translate3d(0,${(progress - 0.5) * travel}px,0) scale(${1.06 + progress * 0.02})`;
                else node.style.opacity = String(1 - clamp((y - top) / Math.max(1, height)));
            }
        };
        function schedule() {
            if (!frame) frame = requestAnimationFrame(update);
        }
        const onMotion = () => {
            prepare();
            schedule();
        };
        const onFocus = (event: FocusEvent) => {
            const card = (event.target as HTMLElement).closest<HTMLElement>("[data-scroll-reveal]");
            if (card) reveal(card, false);
        };
        prepare();
        measure();
        const resize = new ResizeObserver(measure);
        resize.observe(root);
        resize.observe(element);
        for (const effect of effects) resize.observe(effect.node);
        eventTarget.addEventListener("scroll", schedule, { passive: true });
        element.addEventListener("focusin", onFocus);
        motion.addEventListener("change", onMotion);
        return () => {
            cancelAnimationFrame(frame);
            observer?.disconnect();
            resize.disconnect();
            eventTarget.removeEventListener("scroll", schedule);
            element.removeEventListener("focusin", onFocus);
            motion.removeEventListener("change", onMotion);
            cards.forEach((card) => delete card.dataset.revealState);
            effects.forEach(({ node }) => {
                node.style.removeProperty("transform");
                node.style.removeProperty("opacity");
            });
        };
    }, [page, contentKey]);

    return showTop;
}

/** Snapshot only the changing results. The navigation and sticky controls stay still. */
export function useFilterTransition(region: RefObject<HTMLElement | null>, snapshot = true) {
    const current = useRef<ViewTransition | null>(null);
    useEffect(() => () => current.current?.skipTransition(), []);
    return useCallback(
        (change: () => void) => {
            const node = region.current;
            if (!node || window.matchMedia(reducedQuery).matches) {
                change();
                return;
            }
            current.current?.skipTransition();
            const root = findScrollContainer(node);
            const toolbar = root.querySelector<HTMLElement>("[data-scroll-toolbar]");
            const filterTop = toolbar ? toolbar.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop : root.scrollTop;
            const commit = () => {
                flushSync(change);
                if (toolbar && root.scrollTop > filterTop) root.scrollTo({ top: filterTop, behavior: "instant" });
            };
            if (!snapshot || !document.startViewTransition) {
                commit();
                node.animate(
                    [
                        { opacity: 0, transform: "translateY(8px)" },
                        { opacity: 1, transform: "none" },
                    ],
                    { duration: 240, easing: "cubic-bezier(.16,1,.3,1)" },
                );
                return;
            }
            node.style.viewTransitionName = "content-results";
            document.documentElement.dataset.contentTransition = "true";
            const transition = document.startViewTransition(commit);
            current.current = transition;
            void transition.ready.catch(() => {}); // Rapid filter changes can legitimately skip an earlier snapshot.
            void transition.finished.finally(() => {
                if (current.current !== transition) return;
                node.style.removeProperty("view-transition-name");
                delete document.documentElement.dataset.contentTransition;
                current.current = null;
            });
        },
        [region, snapshot],
    );
}

const topLabels: Record<string, string> = { "zh-CN": "回到顶部", "zh-HK": "回到頂部", "zh-TW": "回到頂部", "en-US": "Back to top", "ja-JP": "トップに戻る", "ko-KR": "맨 위로", "es-ES": "Volver arriba", "pt-BR": "Voltar ao topo" };

export function BackToTop({ page, visible }: { page: RefObject<HTMLElement | null>; visible: boolean }) {
    const { locale } = useI18n();
    const button = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        if (!visible || !button.current) return;
        const launchers = [...document.querySelectorAll<HTMLElement>(".sa-feedback-ticket-launcher, .canvas-agent-launcher, .dc-dock, .sa-language-suggestion")];
        const position = () => {
            const bottoms = launchers.filter((node) => node.getClientRects().length).map((node) => window.innerHeight - node.getBoundingClientRect().top + 16);
            button.current?.style.setProperty("--scroll-top-bottom", `${Math.max(20, ...bottoms)}px`);
        };
        const resize = new ResizeObserver(position);
        launchers.forEach((node) => resize.observe(node));
        window.addEventListener("resize", position);
        position();
        return () => {
            resize.disconnect();
            window.removeEventListener("resize", position);
        };
    }, [visible]);
    const label = topLabels[locale] ?? topLabels["en-US"];
    return (
        <button
            ref={button}
            type="button"
            className="content-back-to-top"
            hidden={!visible}
            aria-label={label}
            title={label}
            onClick={() => {
                if (!page.current) return;
                findScrollContainer(page.current).scrollTo({ top: 0, behavior: window.matchMedia(reducedQuery).matches ? "instant" : "smooth" });
                const heading = page.current.querySelector<HTMLElement>("h1");
                if (heading) {
                    heading.tabIndex = -1;
                    heading.focus({ preventScroll: true });
                }
            }}
        >
            <ArrowUp aria-hidden="true" />
        </button>
    );
}
