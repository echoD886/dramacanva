export const ACTIVE_USER_SCOPE_KEY = "infinite-canvas:active-user-scope";
export const GUEST_SCOPE = "guest";
// localStorage is shared by tabs, but in-memory stores are not. Only an
// explicit, serialized session transition may switch this tab's data scope.
const windowScopes = new WeakMap<Window, string>();

export function getActiveUserScope() {
    if (typeof window === "undefined" || !window.localStorage) return GUEST_SCOPE;
    const selected = windowScopes.get(window);
    if (selected !== undefined) return selected;
    const initial = window.localStorage.getItem(ACTIVE_USER_SCOPE_KEY) || GUEST_SCOPE;
    windowScopes.set(window, initial);
    return initial;
}

export function setActiveUserScope(userId?: string | null) {
    if (typeof window === "undefined" || !window.localStorage) return;
    const next = userId || GUEST_SCOPE;
    // Do not change scope in memory after a failed persistence operation.
    window.localStorage.setItem(ACTIVE_USER_SCOPE_KEY, next);
    windowScopes.set(window, next);
}

export function scopedStorageKey(name: string, scope = getActiveUserScope()) {
    return `${name}:user:${scope}`;
}

export const scopedLocalStorage = {
    getItem: (name: string) => {
        if (typeof window === "undefined" || !window.localStorage) return null;
        return window.localStorage.getItem(scopedStorageKey(name));
    },
    setItem: (name: string, value: string) => {
        if (typeof window === "undefined" || !window.localStorage) return;
        window.localStorage.setItem(scopedStorageKey(name), value);
    },
    removeItem: (name: string) => {
        if (typeof window === "undefined" || !window.localStorage) return;
        window.localStorage.removeItem(scopedStorageKey(name));
    },
};
