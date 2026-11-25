import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { BlogLocale } from "@/content/blog-locales";
import { BLOG_UI } from "@/content/blog-ui";
import { findScrollContainer } from "@/lib/scroll-container";

type GalleryImage = { src: string; webp?: string; alt: string; caption: string };
const GalleryContext = createContext<((button: HTMLButtonElement) => void) | null>(null);
export const useArticleGallery = () => useContext(GalleryContext);

export function ArticleGallery({ children, locale }: { children: ReactNode; locale: BlogLocale }) {
    const dialog = useRef<HTMLDialogElement>(null);
    const trigger = useRef<HTMLButtonElement | null>(null);
    const touch = useRef<{ x: number; y: number } | null>(null);
    const [album, setAlbum] = useState<GalleryImage[]>([]);
    const [index, setIndex] = useState(0);
    const [open, setOpen] = useState(false);
    const ui = BLOG_UI[locale];
    const current = album[index];
    const close = () => dialog.current?.close();
    const move = (delta: number) => setIndex((value) => (value + delta + album.length) % album.length);

    useEffect(() => {
        if (!open || !dialog.current) return;
        const root = findScrollContainer(dialog.current);
        const overflow = root.style.overflow;
        root.style.overflow = "hidden";
        dialog.current.showModal();
        return () => {
            root.style.overflow = overflow;
        };
    }, [open]);

    return (
        <GalleryContext.Provider
            value={(button) => {
                // Read the rendered order, including figures interleaved with steps.
                const buttons = [...(button.closest("article") ?? button.parentElement!).querySelectorAll<HTMLButtonElement>("[data-blog-image]")];
                setAlbum(
                    buttons.map((item) => {
                        const img = item.querySelector("img")!;
                        return { src: img.src, webp: item.querySelector<HTMLSourceElement>('source:not([media])')?.srcset, alt: img.alt, caption: item.closest("figure")?.querySelector("figcaption")?.textContent ?? "" };
                    }),
                );
                trigger.current = button;
                setIndex(buttons.indexOf(button));
                setOpen(true);
            }}
        >
            {children}
            <dialog
                ref={dialog}
                className="isa-blog-lightbox"
                aria-label={current?.alt ?? ui.zoom}
                onClose={() => {
                    setOpen(false);
                    trigger.current?.focus({ preventScroll: true });
                }}
                onClick={(event) => {
                    if (event.target === event.currentTarget) close();
                }}
                onKeyDown={(event) => {
                    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                        event.preventDefault();
                        move(event.key === "ArrowLeft" ? -1 : 1);
                    }
                }}
            >
                <div className="isa-blog-lightbox-content">
                    <div className="isa-blog-lightbox-controls">
                        <span aria-live="polite">{current ? `${index + 1} / ${album.length}` : ""}</span>
                        <button type="button" aria-label={ui.previous} disabled={album.length < 2} onClick={() => move(-1)}>
                            <ChevronLeft aria-hidden="true" />
                        </button>
                        <button type="button" aria-label={ui.next} disabled={album.length < 2} onClick={() => move(1)}>
                            <ChevronRight aria-hidden="true" />
                        </button>
                        <button type="button" aria-label={ui.close} onClick={close} autoFocus>
                            <X aria-hidden="true" />
                        </button>
                    </div>
                    {current ? (
                        <>
                            <picture
                                className="isa-blog-lightbox-image"
                                onTouchStart={(event) => {
                                    touch.current = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
                                }}
                                onTouchCancel={() => {
                                    touch.current = null;
                                }}
                                onTouchEnd={(event) => {
                                    if (!touch.current) return;
                                    const dx = event.changedTouches[0].clientX - touch.current.x;
                                    const dy = event.changedTouches[0].clientY - touch.current.y;
                                    touch.current = null;
                                    if (Math.abs(dy) > 72 && Math.abs(dy) > Math.abs(dx) * 1.5) close();
                                    else if (Math.abs(dx) > 72 && Math.abs(dx) > Math.abs(dy) * 1.5) move(dx > 0 ? -1 : 1);
                                }}
                            >
                                {current.webp ? <source srcSet={current.webp} type="image/webp" /> : null}
                                <img src={current.src} alt={current.alt} />
                            </picture>
                            <p className="isa-blog-lightbox-caption">{current.caption}</p>
                        </>
                    ) : null}
                </div>
            </dialog>
        </GalleryContext.Provider>
    );
}

export function ArticleHeading({ id, locale, children }: { id: string; locale: BlogLocale; children: ReactNode }) {
    const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
    const ui = BLOG_UI[locale];
    useEffect(() => {
        if (status === "idle") return;
        const timer = window.setTimeout(() => setStatus("idle"), 2500);
        return () => window.clearTimeout(timer);
    }, [status]);
    return (
        <h2 tabIndex={-1} className="isa-blog-section-heading">
            {children}
            <button
                type="button"
                className="isa-blog-heading-link"
                aria-label={`${ui.copy}: #${id}`}
                onClick={async () => {
                    const url = new URL(window.location.href);
                    url.hash = id;
                    try {
                        await navigator.clipboard.writeText(url.href);
                        setStatus("copied");
                    } catch {
                        setStatus("error");
                    }
                }}
            >
                #
            </button>
            <span className="isa-blog-heading-status" role="status">
                {status === "copied" ? ui.copied : status === "error" ? ui.copyError : ""}
            </span>
        </h2>
    );
}
