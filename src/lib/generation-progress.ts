/**
 * Shared generation progress contract (product studio tiles and canvas nodes):
 * starts at 0, never moves backwards, never shows 100 until the result is actually displayable.
 */
// Highest percent already shown per attempt, so remounts and noisy server values never move the bar backwards.
const shownProgress = new Map<string, number>();

/** Time-based estimate: ~90% at the expected duration, approaching but never reaching 99%. */
export function estimateProgress(elapsedMs: number, expectedMs: number) {
    if (!(elapsedMs > 0)) return 0;
    return Math.min(99, Math.round(99 * (1 - Math.exp((-2.3 * elapsedMs) / expectedMs))));
}

/** Monotonic 0..99 while running; 100 only once the caller says the media is fully displayable. */
export function nextProgress(key: string, elapsedMs: number, expectedMs: number, serverProgress?: number | null) {
    const server = typeof serverProgress === "number" && Number.isFinite(serverProgress) ? Math.min(99, Math.max(0, Math.floor(serverProgress))) : 0;
    const value = Math.max(shownProgress.get(key) ?? 0, estimateProgress(elapsedMs, expectedMs), server);
    shownProgress.set(key, value);
    return value;
}

const startTimes = new Map<string, number>();

/** First attempt starts at the record time (survives reloads); retries start when first seen. */
export function attemptStart(key: string, recordCreatedAt: string, attempt: number) {
    let start = startTimes.get(key);
    if (start === undefined) {
        const recorded = Date.parse(recordCreatedAt);
        start = attempt === 0 && Number.isFinite(recorded) ? Math.min(recorded, Date.now()) : Date.now();
        startTimes.set(key, start);
    }
    return start;
}

export function clearShownProgress(key: string) {
    shownProgress.delete(key);
    startTimes.delete(key);
}

export function hasShownProgress(key: string) {
    return shownProgress.has(key);
}
