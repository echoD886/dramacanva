export type HCaptchaAPI = {
    render(container: HTMLElement, options: { sitekey: string; callback: (token: string) => void; "error-callback": () => void; "expired-callback": () => void }): number;
    remove(id: number): void;
};
declare global {
    interface Window {
        hcaptcha?: HCaptchaAPI;
    }
}
let loading: Promise<HCaptchaAPI> | undefined;
let attempt = 0;

export function loadHCaptcha(): Promise<HCaptchaAPI> {
    if (loading) return loading;
    loading = new Promise<HCaptchaAPI>((resolve, reject) => {
        const script = document.createElement("script");
        const callbackName = `sayActionHCaptchaReady${++attempt}`;
        const callbacks = window as unknown as Record<string, (() => void) | undefined>;
        let settled = false;
        const cleanup = () => {
            clearTimeout(timer);
            script.onerror = null;
            delete callbacks[callbackName];
        };
        const fail = () => {
            if (settled) return;
            settled = true;
            cleanup();
            script.remove();
            reject(new Error("Verification unavailable"));
        };
        callbacks[callbackName] = () => {
            if (settled) return;
            if (!window.hcaptcha) {
                fail();
                return;
            }
            settled = true;
            cleanup();
            resolve(window.hcaptcha);
        };
        const timer = setTimeout(fail, 15000);
        // The SDK callback fires after setup; script.onload can fire too early.
        try {
            script.src = `https://js.hcaptcha.com/1/api.js?render=explicit&onload=${callbackName}`;
            script.async = true;
            script.defer = true;
            script.onerror = fail;
            document.head.appendChild(script);
        } catch {
            fail();
        }
    }).catch((error: unknown) => {
        loading = undefined;
        throw error;
    });
    return loading;
}
