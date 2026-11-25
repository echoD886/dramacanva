import { useEffect, useRef, useState } from "react";

const subscribers = new Map<Element, (visible: boolean) => void>();
let observer: IntersectionObserver | undefined;

export function useFolderVisibility() {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const element = ref.current;
        if (!element) return;
        if (typeof IntersectionObserver === "undefined") { setVisible(true); return; }
        observer ??= new IntersectionObserver(entries => {
            for (const entry of entries) subscribers.get(entry.target)?.(entry.isIntersecting);
        }, { rootMargin: "0px", threshold: 0 });
        subscribers.set(element, setVisible);
        observer.observe(element);
        return () => {
            observer?.unobserve(element);
            subscribers.delete(element);
            if (!subscribers.size) { observer?.disconnect(); observer = undefined; }
        };
    }, []);
    return { ref, visible };
}
