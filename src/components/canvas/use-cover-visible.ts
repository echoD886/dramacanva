import { useEffect, useRef, useState } from "react";

const pending = new Set<() => void>();
let frame: number | undefined;
function mountNext() {
    frame = undefined;
    for (const reveal of [...pending].slice(0, 2)) { pending.delete(reveal); reveal(); }
    if (pending.size) frame = requestAnimationFrame(mountNext);
}

export function useCoverVisible(beforeReveal?: () => void) {
    const ref = useRef<HTMLDivElement>(null);
    const beforeRevealRef = useRef(beforeReveal);
    beforeRevealRef.current = beforeReveal;
    const [visible, setVisible] = useState(typeof IntersectionObserver === "undefined");
    useEffect(() => {
        if (!ref.current || typeof IntersectionObserver === "undefined") return;
        const reveal = () => setVisible(true);
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                // Start metadata reads before the bounded DOM mount queue.
                beforeRevealRef.current?.();
                // Bound DOM/media work per frame when an entire row enters at once.
                pending.add(reveal);
                frame ??= requestAnimationFrame(mountNext);
            } else { pending.delete(reveal); setVisible(false); }
        });
        observer.observe(ref.current);
        return () => { pending.delete(reveal); observer.disconnect(); };
    }, []);
    return { ref, visible };
}
