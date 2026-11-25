import { useCallback, useEffect } from "react";
import { flushSync } from "react-dom";
import { useBlocker } from "react-router";
import { flushCanvasTextEdits, hasPendingCanvasTextEdits } from "@/services/canvas-text-edits";

// Flush buffered text before navigation and browser lifecycle checkpoints.
export function useCanvasTextCheckpoints() {
    const flushTextEdits = useCallback(async () => { flushSync(() => flushCanvasTextEdits()); }, []);
    useEffect(() => {
        const checkpoint = () => { flushSync(() => flushCanvasTextEdits()); };
        const hidden = () => { if (document.visibilityState === "hidden") checkpoint(); };
        document.addEventListener("visibilitychange", hidden);
        window.addEventListener("pagehide", checkpoint);
        return () => {
            document.removeEventListener("visibilitychange", hidden);
            window.removeEventListener("pagehide", checkpoint);
        };
    }, []);
    const blocker = useBlocker(useCallback(() => hasPendingCanvasTextEdits(), []));
    useEffect(() => {
        if (blocker.state !== "blocked") return;
        const timer = setTimeout(() => { void flushTextEdits().then(() => blocker.proceed()); }, 0);
        return () => clearTimeout(timer);
    }, [blocker, flushTextEdits]);
    return flushTextEdits;
}
