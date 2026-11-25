type IdleWindow = Window & { requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number };

/**
 * Run non-essential work (third-party tags) once the page has loaded and the
 * main thread is idle, so it does not compete with first render and hydration.
 */
export function afterPageInteractive(task: () => void, target: IdleWindow | undefined = typeof window === "undefined" ? undefined : window) {
    if (!target) return;
    const idle = () => {
        if (target.requestIdleCallback) target.requestIdleCallback(task, { timeout: 4_000 });
        else target.setTimeout(task, 1_500);
    };
    if (target.document.readyState === "complete") idle();
    else target.addEventListener("load", idle, { once: true });
}
