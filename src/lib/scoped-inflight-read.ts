/** Deduplicate concurrent reads, never completed data, and never across scopes. */
export function createScopedInflightRead<T>() {
    const pending = new Map<string, Promise<T>>();
    return {
        peek(scope: string): Promise<T> | undefined {
            return pending.get(scope);
        },
        read(scope: string, load: () => Promise<T>): Promise<T> {
            const existing = pending.get(scope);
            if (existing) return existing;
            const request = Promise.resolve().then(load);
            pending.set(scope, request);
            const settled = () => {
                if (pending.get(scope) === request) pending.delete(scope);
            };
            // Both branches handle the cleanup promise, including a failed read.
            void request.then(settled, settled);
            return request;
        },
        invalidate() {
            pending.clear();
        },
    };
}
