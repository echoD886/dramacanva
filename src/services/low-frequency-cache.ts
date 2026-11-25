import { localForageStorageForScope } from "@/lib/localforage-storage";
import { getActiveUserScope } from "@/lib/user-scope";
import { apiClient, request } from "@/services/api/request";
import { useUserStore } from "@/stores/use-user-store";

type CachePath = "/model-catalog" | "/referrals/public-rules" | "/wallet/payment-options";
type Entry<T> = { value: T; etag?: string; savedAt: number };
const listeners = new Set<(path: CachePath, scope: string, value: unknown) => void>();
const inFlight = new Map<string, Promise<unknown>>();
const MAX_AGE = 24 * 60 * 60 * 1000;

export function observeLowFrequencyRefresh(listener: (path: CachePath, scope: string, value: unknown) => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export async function seedLowFrequencyCache(path: CachePath, scope: string, value: unknown) {
    await localForageStorageForScope(scope).setItem(`boot-cache:${path}`, JSON.stringify({ value, savedAt: Date.now() }));
}

// Only low-frequency display data may use SWR. Session, permissions, balances,
// private entities and the writable cloud baseline must always reach the server.
export async function readLowFrequency<T>(path: CachePath, signal?: AbortSignal): Promise<T> {
    const scope = getActiveUserScope();
    const storage = localForageStorageForScope(scope);
    const key = `boot-cache:${path}`;
    const raw = await Promise.resolve(storage.getItem(key)).catch(() => null);
    if (scope !== getActiveUserScope() || signal?.aborted) throw new DOMException("Account changed", "AbortError");
    let cached: Entry<T> | undefined;
    try {
        if (raw) cached = JSON.parse(raw) as Entry<T>;
    } catch {
        /* Invalid caches are disposable. */
    }
    if (cached && (!Number.isFinite(cached.savedAt) || Date.now() - cached.savedAt > MAX_AGE)) cached = undefined;
    const identityVerified = () => {
        const state = useUserStore.getState();
        return state.hydrated && (state.user?.id || "guest") === scope;
    };
    // A persisted scope is not proof of the current Cookie identity. Public
    // rules are global; private display caches wait for identity recovery.
    if (path !== "/referrals/public-rules" && !identityVerified()) cached = undefined;
    const flightKey = `${scope}:${path}`;
    const refresh = async () => {
        const response = await apiClient.get(path, {
            signal,
            headers: cached?.etag ? { "If-None-Match": cached.etag } : undefined,
            validateStatus: (status) => (status >= 200 && status < 300) || status === 304,
        });
        const result = await request<T | { notModified: true }>(Promise.resolve(response), { allowNotModified: true });
        const value = response.status === 304 && cached ? cached.value : (result as T);
        if (scope !== getActiveUserScope() || signal?.aborted) throw new DOMException("Account changed", "AbortError");
        const entry: Entry<T> = { value, etag: String(response.headers.etag || cached?.etag || ""), savedAt: Date.now() };
        await Promise.resolve(storage.setItem(key, JSON.stringify(entry))).catch(() => undefined);
        if (scope === getActiveUserScope()) for (const listener of listeners) listener(path, scope, value);
        return value;
    };
    // Signal-bearing callers own cancellation and cannot share another caller's signal.
    let pending = !signal ? (inFlight.get(flightKey) as Promise<T> | undefined) : undefined;
    if (!pending) {
        pending = refresh();
        if (!signal) {
            inFlight.set(flightKey, pending);
            void pending
                .finally(() => {
                    if (inFlight.get(flightKey) === pending) inFlight.delete(flightKey);
                })
                .catch(() => undefined);
        }
    }
    if (cached) {
        void pending.catch(() => undefined);
        if (scope !== getActiveUserScope() || signal?.aborted) throw new DOMException("Account changed", "AbortError");
        if (path !== "/referrals/public-rules" && !identityVerified()) return pending;
        return cached.value;
    }
    return pending;
}
