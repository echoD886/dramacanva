/** Superseded reads cannot refill the cache or return an obsolete identity. */
export function createVersionedAsyncCache<T>(load: () => Promise<T>, ttlMs: number, now = Date.now) {
    let version = 0;
    let cached: { value: T; expiresAt: number } | undefined;
    let pending: Promise<T> | undefined;
    function read(): Promise<T> {
        if (cached && cached.expiresAt > now()) return Promise.resolve(cached.value);
        if (pending) return pending;
        const startedVersion = version;
        const current = Promise.resolve()
            .then(load)
            .then(
                (value) => {
                    if (startedVersion !== version) return read();
                    cached = { value, expiresAt: now() + ttlMs };
                    return value;
                },
                (error: unknown) => {
                    if (startedVersion !== version) return read();
                    throw error;
                },
            )
            .finally(() => {
                if (pending === current) pending = undefined;
            });
        pending = current;
        return current;
    }
    return {
        read,
        invalidate() {
            version++;
            cached = undefined;
            pending = undefined;
        },
    };
}
