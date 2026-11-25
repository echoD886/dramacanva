/** Content routes scroll inside the app shell, which is not the document viewport. */
export function findScrollContainer(element: HTMLElement): HTMLElement {
    let fallback: HTMLElement | null = null;
    for (let current: HTMLElement | null = element; current; current = current.parentElement) {
        if (!/(auto|scroll)/.test(getComputedStyle(current).overflowY)) continue;
        fallback ??= current;
        if (current.scrollHeight > current.clientHeight) return current;
    }
    return fallback ?? (document.scrollingElement as HTMLElement);
}
