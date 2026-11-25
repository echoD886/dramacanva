export type TurnstileAPI = {
    render(container: HTMLElement, options: { sitekey: string; action: string; cData: string; theme: "auto"; appearance: "always"; callback: (token: string) => void; "error-callback": () => void; "expired-callback": () => void; "timeout-callback": () => void }): string;
    remove(id: string): void;
};
declare global { interface Window { turnstile?: TurnstileAPI } }
let loading: Promise<TurnstileAPI> | undefined;

export function loadTurnstile(): Promise<TurnstileAPI> {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    if (loading) return loading;
    loading = new Promise<TurnstileAPI>((resolve, reject) => {
        const script = document.createElement("script");
        const timer = setTimeout(() => fail(), 15000);
        const fail = () => { clearTimeout(timer); script.remove(); loading = undefined; reject(new Error("Verification unavailable")); };
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        script.onerror = fail;
        script.onload = () => { clearTimeout(timer); if (window.turnstile) resolve(window.turnstile); else fail(); };
        document.head.appendChild(script);
    });
    return loading;
}
