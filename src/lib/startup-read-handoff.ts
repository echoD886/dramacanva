/** A single startup consumer may take the prefetched read after the normal TTL.
 * Identity revision and a short deadline bound reuse; ordinary reads keep their
 * existing TTL. Values (including snapshot timestamps) are never re-stamped.
 */
export function createStartupReadHandoff<T>(
    load: () => Promise<T>,
    options: {
        revision: () => string | undefined;
        onSuperseded: () => void;
        maxAgeMs?: number;
        now?: () => number;
    },
) {
    const now = options.now ?? Date.now;
    let slot: { revision: string; at: number; promise: Promise<T> } | undefined;
    function current(value: NonNullable<typeof slot>) {
        const age = now() - value.at;
        return value.revision === options.revision() && age >= 0 && age < (options.maxAgeMs ?? 30_000);
    }
    async function take(value: NonNullable<typeof slot>) {
        if (value.revision !== options.revision()) {
            options.onSuperseded();
            return load();
        }
        let result: T;
        try {
            result = await value.promise;
        } catch (error) {
            if (value.revision !== options.revision()) {
                options.onSuperseded();
                return load();
            }
            throw error;
        }
        // The promise may have settled before another tab changed the cookie.
        if (value.revision !== options.revision()) {
            options.onSuperseded();
            return load();
        }
        return result;
    }
    return {
        prefetch() {
            if (slot && current(slot)) return take(slot);
            const revision = options.revision();
            const promise = load();
            if (revision === undefined) return promise;
            const value = { revision, at: now(), promise };
            slot = value;
            // Do not retain rejected startup reads for the later consumer.
            void promise.catch(() => {
                if (slot === value) slot = undefined;
            });
            return take(value);
        },
        read() {
            const value = slot;
            slot = undefined;
            if (!value) return load();
            if (!current(value)) {
                if (value.revision !== options.revision()) options.onSuperseded();
                return load();
            }
            return take(value);
        },
        invalidate() {
            slot = undefined;
        },
    };
}
