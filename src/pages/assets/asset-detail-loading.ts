import { loadAssetLibraryPage } from "@/services/user-data-sync";

/** Yield a frame before idle work, so a populated first page can paint first. */
export function waitForAssetDetailIdle(signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        let frame: number | undefined;
        let idle: number | undefined;
        let timer: number | undefined;
        const finish = () => {
            signal.removeEventListener("abort", abort);
            resolve();
        };
        const abort = () => {
            if (frame !== undefined) window.cancelAnimationFrame(frame);
            if (idle !== undefined) window.cancelIdleCallback(idle);
            if (timer !== undefined) window.clearTimeout(timer);
            signal.removeEventListener("abort", abort);
            reject(new DOMException("The operation was aborted", "AbortError"));
        };
        if (signal.aborted) return abort();
        signal.addEventListener("abort", abort, { once: true });
        frame = window.requestAnimationFrame(() => {
            frame = undefined;
            if (window.requestIdleCallback) idle = window.requestIdleCallback(finish, { timeout: 250 });
            else timer = window.setTimeout(finish, 16);
        });
    });
}

export async function loadAssetDetailPages(options: Omit<Parameters<typeof loadAssetLibraryPage>[0], "page" | "pageSize"> & { signal: AbortSignal }) {
    let page = 1;
    for (;;) {
        const result = await loadAssetLibraryPage({ ...options, page, pageSize: 120 });
        if (!result.hasMore) return result.total;
        await waitForAssetDetailIdle(options.signal);
        page = result.page + 1;
    }
}
