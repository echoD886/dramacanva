import { create } from "zustand";

/**
 * Hosted checkouts (Waffo, Creem) have no "back to store" link and ignore cancel URLs, so the cashier opens in a
 * new tab while the pricing page stays put. The tab must be opened synchronously inside the click handler (before
 * any await) or the browser blocks it; the checkout URL is filled in once the session exists.
 */

let reserved: Window | null = null;

type CheckoutTabState = { url: string | null; show: (url: string) => void; dismiss: () => void };
export const useCheckoutTabStore = create<CheckoutTabState>((set) => ({
    url: null,
    show: (url) => set({ url }),
    dismiss: () => set({ url: null }),
}));

/** Call at the very start of the click handler that will lead to a checkout. */
export function reserveCheckoutTab(loadingText: string) {
    if (!window.location.pathname.endsWith("/pricing")) {
        sessionStorage.setItem("checkout-origin", window.location.pathname + window.location.search + window.location.hash);
    }
    releaseCheckoutTab();
    try {
        const tab = window.open("", "_blank");
        if (!tab) return;
        tab.opener = null;
        const doc = tab.document;
        doc.title = "DramaCanvas";
        const dark = document.documentElement.classList.contains("dark");
        doc.body.style.cssText = `margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:${dark ? "#0f0f10" : "#ffffff"};color:${dark ? "#a1a1aa" : "#52525b"}`;
        doc.body.textContent = loadingText;
        reserved = tab;
    } catch {
        reserved = null;
    }
}

/** Close a reserved tab when the checkout could not be created. */
export function releaseCheckoutTab() {
    if (reserved && !reserved.closed) reserved.close();
    reserved = null;
}

/** Sends the reserved tab to the cashier; falls back to the current tab when no tab could be opened. */
export function goToCheckout(url: string) {
    if (!window.location.pathname.endsWith("/pricing")) {
        sessionStorage.setItem("checkout-origin", window.location.pathname + window.location.search + window.location.hash);
    }
    const tab = reserved;
    reserved = null;
    if (tab && !tab.closed) {
        tab.location.href = url;
        useCheckoutTabStore.getState().show(url);
        return "tab" as const;
    }
    window.location.assign(url);
    return "same" as const;
}

/** Reopen the cashier from the notice on the pricing page. */
export function reopenCheckout(url: string) {
    // "noopener" makes window.open return null, so detach the opener manually instead.
    const tab = window.open(url, "_blank");
    if (tab) tab.opener = null;
    else window.location.assign(url);
}

/** Business rejections (4xx) explain themselves; transport/server failures fall back to the generic retry text. */
export function checkoutErrorText(error: unknown, fallback: string) {
    const status = (error as { status?: number } | null)?.status;
    const message = error instanceof Error ? error.message.trim() : "";
    return status && status >= 400 && status < 500 && message ? message : fallback;
}
