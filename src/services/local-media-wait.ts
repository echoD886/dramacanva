// Optional filesystem/index reads cannot indefinitely delay a server fallback.
// This does not cancel the underlying operation, so writes must check the abort
// signal again before publishing a file or sending a receipt.
export async function waitForLocalMedia<T>(operation: Promise<T>, milliseconds: number | null = 1_000, signal?: AbortSignal): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let abort: (() => void) | undefined;
    try {
        return await Promise.race([
            operation,
            new Promise<never>((_, reject) => {
                abort = () => reject(signal?.reason ?? new DOMException("Aborted", "AbortError"));
                if (signal?.aborted) return abort();
                signal?.addEventListener("abort", abort, { once: true });
                if (milliseconds !== null) timer = setTimeout(() => reject(new Error("LOCAL_MEDIA_STORAGE_TIMEOUT")), milliseconds);
            }),
        ]);
    } finally {
        clearTimeout(timer);
        if (abort) signal?.removeEventListener("abort", abort);
    }
}
