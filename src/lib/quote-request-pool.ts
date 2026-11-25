type Entry<T> = { pending?: Promise<T>; value?: T; error?: unknown; expires: number; attempts: number; retryAt: number };

// Renders, nodes and pickers share a request budget. Unmounting one subscriber
// must not cancel a request still needed by another subscriber.
export class QuoteRequestPool<T> {
    private entries = new Map<string, Entry<T>>();
    constructor(private now = Date.now) {}

    get(key: string, send: () => Promise<T>, retryable: (error: unknown) => boolean, signal?: AbortSignal): Promise<T> {
        if (signal?.aborted) return Promise.reject(new DOMException("Cancelled", "AbortError"));
        const now = this.now();
        for (const [id, item] of this.entries) if (!item.pending && item.expires <= now) this.entries.delete(id);
        let entry = this.entries.get(key);
        if (!entry) {
            if (this.entries.size >= 256) return Promise.reject(new Error("Quote request capacity reached"));
            entry = { expires: now + 60_000, attempts: 0, retryAt: 0 };
            this.entries.set(key, entry);
        }
        if (!entry.pending && entry.value === undefined && (!entry.error || (entry.attempts < 3 && now >= entry.retryAt))) {
            entry.attempts++;
            const current = entry;
            current.pending = send().then((value) => {
                current.value = value;
                current.expires = this.now() + 10_000;
                return value;
            }).catch((error: unknown) => {
                current.error = error;
                current.retryAt = retryable(error) ? this.now() + 1000 * 2 ** (current.attempts - 1) : current.expires;
                throw error;
            }).finally(() => { current.pending = undefined; });
        }
        const result = entry.pending || (entry.value !== undefined ? Promise.resolve(entry.value) : Promise.reject(entry.error));
        return new Promise<T>((resolve, reject) => {
            const abort = () => reject(new DOMException("Cancelled", "AbortError"));
            signal?.addEventListener("abort", abort, { once: true });
            result.then((value) => signal?.aborted ? abort() : resolve(value), reject)
                .finally(() => signal?.removeEventListener("abort", abort));
        });
    }
}
