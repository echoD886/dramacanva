export const AUTH_IDENTITY_EVENT_KEY = "infinite-canvas:auth-epoch";
const SCOPE_KEY = "infinite-canvas:active-user-scope";
const LOCAL_CHANGE_EVENT = "canvas:auth-epoch-local";

type AuthEventTarget = Pick<Window, "localStorage" | "addEventListener" | "removeEventListener" | "dispatchEvent">;

export function readSharedAuthEpoch(): string | undefined {
    try {
        return typeof window === "undefined" ? undefined : (window.localStorage.getItem(AUTH_IDENTITY_EVENT_KEY) ?? "");
    } catch {
        return undefined;
    }
}

// Broadcast only a nonce, never a session token, user record or private payload.
export function announceAuthIdentityChange(target: AuthEventTarget | undefined = typeof window === "undefined" ? undefined : window): boolean {
    if (!target) return false;
    try {
        target.localStorage.setItem(AUTH_IDENTITY_EVENT_KEY, crypto.randomUUID());
        target.dispatchEvent(new Event(LOCAL_CHANGE_EVENT));
        return true;
    } catch {
        // Persistence can be unavailable. Request identity binding still stops
        // stale-tab server writes; do not turn a successful login into failure.
        return false;
    }
}

export function observeRemoteAuthChanges(target: AuthEventTarget, onChange: () => void, currentScope?: () => string): () => void {
    const epoch = () => {
        try {
            return target.localStorage.getItem(AUTH_IDENTITY_EVENT_KEY) ?? "";
        } catch {
            return null;
        }
    };
    let observed = epoch();
    let disposed = false;
    const local = () => {
        observed = epoch();
    };
    const notify = () => {
        if (!disposed) onChange();
    };
    const storage = (event: Event) => {
        const changed = event as StorageEvent;
        if (changed.key !== null && changed.key !== AUTH_IDENTITY_EVENT_KEY && changed.key !== SCOPE_KEY) return;
        try {
            if (changed.storageArea && changed.storageArea !== target.localStorage) return;
        } catch {
            notify();
            return;
        }
        if (changed.key === SCOPE_KEY) {
            // Another tab finishing the same transition is an acknowledgement,
            // not a new cookie identity. Restarting here aborts local hydration.
            if (changed.newValue !== null && changed.newValue === currentScope?.()) return;
            if (changed.oldValue !== changed.newValue) notify();
            return;
        }
        const next = epoch();
        if (next !== observed || changed.key === null) {
            observed = next;
            notify();
        }
    };
    // A suspended tab may miss an event. Reconcile its epoch when it regains focus.
    const focus = () => {
        const next = epoch();
        if (next !== observed) {
            observed = next;
            notify();
        }
    };
    target.addEventListener("storage", storage);
    target.addEventListener("focus", focus);
    target.addEventListener(LOCAL_CHANGE_EVENT, local);
    return () => {
        disposed = true;
        target.removeEventListener("storage", storage);
        target.removeEventListener("focus", focus);
        target.removeEventListener(LOCAL_CHANGE_EVENT, local);
    };
}
