export type CoreTourState = {
    hasText: boolean;
    textReady: boolean;
    hasScript: boolean;
    scriptReady: boolean;
    hasImage: boolean;
    imageReady: boolean;
    hasVideo: boolean;
    videoReady: boolean;
};

export type OnboardingStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type OnboardingStatus = "active" | "paused" | "skipped" | "completed";
export type OnboardingSession = { step: OnboardingStep; status: OnboardingStatus };
export type OnboardingAction = "start" | "sync" | "reviewed" | "pause" | "resume" | "skip";

/** Derive progress only from the connected chain, including recovery after deleted nodes. */
export function availableOnboardingStep(state: CoreTourState): OnboardingStep {
    if (!state.hasText) return 1;
    if (!state.textReady) return 2;
    if (!state.hasScript) return 3;
    if (!state.scriptReady) return 4;
    if (!state.hasImage) return 5;
    if (!state.imageReady) return 6;
    if (!state.hasVideo) return 7;
    if (!state.videoReady) return 8;
    return 9;
}

export function transitionOnboarding(session: OnboardingSession, action: OnboardingAction, state: CoreTourState): OnboardingSession {
    if (session.status === "skipped" || session.status === "completed") return session;
    if (action === "skip") return { ...session, status: "skipped" };
    if (action === "pause") return { ...session, status: "paused" };
    if (action === "resume") return { ...session, status: "active" };
    if (session.status === "paused") return session;
    const available = availableOnboardingStep(state);
    if (session.step === 0 && action !== "start") return session;
    // C4 stays on the real table for a brief review before moving to the first shot.
    const step = session.step === 4 && available >= 5 && action !== "reviewed" ? 4 : available;
    return { step, status: step === 9 ? "completed" : "active" };
}

export type RafThrottledBatcher = {
    schedule: () => void;
    cancel: () => void;
    isPending: () => boolean;
};

/**
 * Coalesces multiple update requests within a single animation frame so the callback fires at most once per frame.
 */
export function createFrameThrottledUpdate(
    callback: () => void,
    raf: (cb: () => void) => number = typeof requestAnimationFrame === "function" ? requestAnimationFrame : (cb) => setTimeout(cb, 16) as unknown as number,
    caf: (id: number) => void = typeof cancelAnimationFrame === "function" ? cancelAnimationFrame : (id) => clearTimeout(id as unknown as ReturnType<typeof setTimeout>),
): RafThrottledBatcher {
    let rafId: number | null = null;

    const schedule = () => {
        if (rafId !== null) {
            return;
        }
        rafId = raf(() => {
            rafId = null;
            callback();
        });
    };

    const cancel = () => {
        if (rafId !== null) {
            caf(rafId);
            rafId = null;
        }
    };

    const isPending = () => rafId !== null;

    return { schedule, cancel, isPending };
}
