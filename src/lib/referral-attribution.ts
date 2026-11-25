import { captureReferralClick, getReferralAvailability } from "@/services/api/referral";
import { trackReferralReceiptTimeout } from "@/services/public-analytics";

let pending: Promise<"settled" | "timeout"> = Promise.resolve("settled");
let activeCode: string | null = null;
let enabled: boolean | undefined;
let attempt = 0;

// Read the current URL separately from marketing UTM's tab snapshot. Invalid
// codes never claim the server's window, and the HttpOnly receipt survives tabs.
export function rememberReferralClick(search = window.location.search) {
    const code = new URLSearchParams(search).get("ref");
    if (code && /^[A-Za-z0-9]{8,32}$/.test(code)) {
        activeCode = code;
        enabled = undefined;
        const currentAttempt = ++attempt;
        // Bound the whole optional operation, including public configuration.
        // The race also settles if a transport ignores cancellation.
        const controller = new AbortController();
        let timer: ReturnType<typeof setTimeout>;
        const timeout = new Promise<"timeout">((resolve) => {
            timer = setTimeout(() => {
                controller.abort();
                resolve("timeout");
            }, 1500);
        });
        // Attribution controls a cookie write: always verify the current rule,
        // while navigation may use the low-frequency display cache.
        const capture = getReferralAvailability(controller.signal, true)
            .then(({ enabled: available }) => {
                if (currentAttempt === attempt) enabled = available;
                if (available === true && !controller.signal.aborted) return captureReferralClick(code, controller.signal);
            })
            .catch(() => undefined)
            .then(() => "settled" as const);
        pending = Promise.race([capture, timeout]).finally(() => clearTimeout(timer));
    }
    return pending;
}

export function awaitReferralClick() {
    return pending;
}

export function navigateAfterReferralClick(event: { preventDefault(): void }, target: string) {
    event.preventDefault();
    if (!activeCode || enabled === false) {
        window.location.assign(target);
        return Promise.resolve();
    }
    // The completed response has installed the HttpOnly cookie before the
    // browser sends OAuth start, where it is snapshotted into server-side state.
    return pending.then((result) => {
        if (result === "timeout") trackReferralReceiptTimeout();
        window.location.assign(target);
    });
}
