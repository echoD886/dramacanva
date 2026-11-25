import { useRef, type ComponentProps, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import "./showcase-stage.css";

/** Shared immersive media layers and controls used by public cases and episode finals. */
export function ShowcaseStage({ posterUrl, cover, media, children, className = "", ...props }: ComponentProps<"main"> & { posterUrl?: string; cover?: ReactNode; media?: ReactNode }) {
    return (
        <main {...props} className={`ll-detail-stage ${className}`}>
            <div className="ll-detail-backdrop" style={posterUrl ? { backgroundImage: `url(${posterUrl})` } : undefined} aria-hidden />
            {cover}
            {media}
            <div className="ll-detail-vignette" aria-hidden />
            {children}
        </main>
    );
}

export function ShowcaseActions(props: ComponentProps<"div">) {
    return <div {...props} className={`ll-detail-actions ${props.className || ""}`} />;
}

export function ShowcaseRail({ label, previousLabel, nextLabel, children, railProps = {} }: { label: string; previousLabel: string; nextLabel: string; children: ReactNode; railProps?: ComponentProps<"div"> }) {
    const localRef = useRef<HTMLDivElement>(null);
    const drag = useRef<{ x: number; scroll: number; moved: boolean } | null>(null);
    const ref = railProps.ref || localRef;
    const scroll = (left: number) => {
        const element = typeof ref === "object" ? ref.current : localRef.current;
        element?.scrollBy({ left, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    };
    return (
        <section className="ll-detail-rail-shell" aria-label={label}>
            <button type="button" className="ll-detail-rail-arrow is-left" aria-label={previousLabel} onClick={() => scroll(-244)}>
                <ChevronLeft aria-hidden />
            </button>
            <div
                onPointerDown={(event) => {
                    if (event.button === 0) drag.current = { x: event.clientX, scroll: event.currentTarget.scrollLeft, moved: false };
                }}
                onPointerMove={(event) => {
                    const start = drag.current;
                    if (!start || !event.buttons) return;
                    const delta = event.clientX - start.x;
                    if (Math.abs(delta) > 6) {
                        start.moved = true;
                        event.currentTarget.setPointerCapture(event.pointerId);
                        event.currentTarget.scrollLeft = start.scroll - delta;
                    }
                }}
                onPointerUp={(event) => {
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                    setTimeout(() => {
                        drag.current = null;
                    }, 0);
                }}
                onPointerCancel={() => {
                    drag.current = null;
                }}
                onClickCapture={(event) => {
                    if (drag.current?.moved) {
                        event.preventDefault();
                        event.stopPropagation();
                    }
                }}
                {...railProps}
                ref={ref}
                className={`ll-detail-rail ${railProps.className || ""}`}
            >
                {children}
            </div>
            <button type="button" className="ll-detail-rail-arrow is-right" aria-label={nextLabel} onClick={() => scroll(244)}>
                <ChevronRight aria-hidden />
            </button>
        </section>
    );
}
