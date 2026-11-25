import { useI18n } from "@/i18n/use-i18n";
import { type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Film, LoaderCircle } from "lucide-react";
import { useReducedMotion } from "motion/react";

import { authDragProgress, authDragShouldSubmit } from "./auth-route-utils";

type DragEntryButtonProps = {
    disabled?: boolean;
    submitting: boolean;
    hasError?: boolean;
};

const HANDLE_SIZE = 40;
const TRACK_GUTTER = 6;
const KEYBOARD_STEP = 0.1;
const SUBMIT_HOLD_MS = 260;
const REVEAL_STILLS = [
    "/auth/login-reveal-rain.jpg",
    "/auth/login-reveal-desert.jpg",
    "/auth/login-reveal-stage.jpg",
    "/auth/login-reveal-eclipse.jpg",
] as const;

export function DragEntryButton({ disabled = false, submitting, hasError = false }: DragEntryButtonProps) {
    const { t } = useI18n();
    const reducedMotion = useReducedMotion();
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dragOriginRef = useRef(0);
    const dragOriginYRef = useRef(0);
    const travelRef = useRef(1);
    const progressRef = useRef(0);
    const pendingProgressRef = useRef<number | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const measurementFrameRef = useRef<number | null>(null);
    const submitTimerRef = useRef<number | null>(null);
    const dragStartedAtRef = useRef(0);
    const dragFrameTimesRef = useRef<number[]>([]);
    const longTaskBaselineRef = useRef(0);
    const draggingRef = useRef(false);
    const movedRef = useRef(false);
    const suppressClickRef = useRef(false);
    const readyFeedbackRef = useRef(false);
    const [ready, setReady] = useState(false);

    const measureTravel = useCallback(() => {
        const button = buttonRef.current;
        if (!button) return 1;
        // The gold leader is the physical handle. Its travel includes the gate so
        // the final pointer position lands flush with the real right-hand inset.
        const travel = Math.max(1, button.clientWidth - HANDLE_SIZE - TRACK_GUTTER);
        travelRef.current = travel;
        return travel;
    }, []);

    const commitProgress = useCallback((nextProgress: number) => {
        const button = buttonRef.current;
        if (!button) return;
        const progress = Math.min(1, Math.max(0, nextProgress));
        progressRef.current = progress;
        button.style.setProperty("--auth-drag-progress", progress.toFixed(4));
        button.style.setProperty("--auth-drag-progress-percent", `${(progress * 100).toFixed(2)}%`);
        button.style.setProperty("--auth-drag-offset", `${(progress * travelRef.current).toFixed(2)}px`);
        button.dataset.progress = progress.toFixed(2);

        const nextReady = authDragShouldSubmit(progress);
        if (nextReady !== readyFeedbackRef.current) {
            readyFeedbackRef.current = nextReady;
            setReady(nextReady);
            if (nextReady) navigator.vibrate?.(8);
        }
    }, []);

    const scheduleProgress = useCallback(
        (nextProgress: number) => {
            pendingProgressRef.current = nextProgress;
            if (animationFrameRef.current != null) return;
            animationFrameRef.current = window.requestAnimationFrame(() => {
                animationFrameRef.current = null;
                const pending = pendingProgressRef.current;
                pendingProgressRef.current = null;
                if (pending != null) commitProgress(pending);
            });
        },
        [commitProgress],
    );

    const rebound = useCallback(() => {
        const button = buttonRef.current;
        if (!button) return;
        button.dataset.rebounding = "true";
        window.requestAnimationFrame(() => {
            commitProgress(0);
            window.setTimeout(() => button.removeAttribute("data-rebounding"), 460);
        });
    }, [commitProgress]);

    const submitAfterHold = useCallback(() => {
        const button = buttonRef.current;
        if (!button || disabled || submitting || submitTimerRef.current != null) return;
        commitProgress(1);
        button.dataset.completing = "true";
        submitTimerRef.current = window.setTimeout(
            () => {
                submitTimerRef.current = null;
                button.removeAttribute("data-completing");
                button.form?.requestSubmit();
            },
            reducedMotion ? 0 : SUBMIT_HOLD_MS,
        );
    }, [commitProgress, disabled, reducedMotion, submitting]);

    const recordDragMetrics = useCallback(() => {
        const button = buttonRef.current;
        if (!button || !dragStartedAtRef.current) return;
        const finishedAt = performance.now();
        const duration = Math.max(1, finishedAt - dragStartedAtRef.current);
        const frames = dragFrameTimesRef.current;
        const sampledDuration = frames.length > 1 ? Math.max(1, frames.at(-1)! - frames[0]) : duration;
        const fps = frames.length > 1 ? ((frames.length - 1) * 1000) / sampledDuration : 0;
        const longTasks = performance
            .getEntriesByType("longtask")
            .slice(longTaskBaselineRef.current)
            .filter((entry) => entry.startTime >= dragStartedAtRef.current);
        const maxLongTask = longTasks.reduce((maximum, entry) => Math.max(maximum, entry.duration), 0);
        button.dataset.dragDurationMs = duration.toFixed(2);
        button.dataset.dragFps = fps.toFixed(1);
        button.dataset.dragFrames = String(frames.length);
        button.dataset.dragLongTasks = String(longTasks.length);
        button.dataset.dragMaxLongTaskMs = maxLongTask.toFixed(2);
        dragStartedAtRef.current = 0;
    }, []);

    useEffect(() => {
        const button = buttonRef.current;
        if (!button) return;
        const measure = () => {
            measureTravel();
            commitProgress(progressRef.current);
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(button);
        return () => observer.disconnect();
    }, [commitProgress, measureTravel]);

    useEffect(() => {
        if (submitting) commitProgress(1);
        else if (hasError) rebound();
    }, [commitProgress, hasError, rebound, submitting]);

    useEffect(
        () => () => {
            if (animationFrameRef.current != null) window.cancelAnimationFrame(animationFrameRef.current);
            if (measurementFrameRef.current != null) window.cancelAnimationFrame(measurementFrameRef.current);
            if (submitTimerRef.current != null) window.clearTimeout(submitTimerRef.current);
        },
        [],
    );

    const pointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
        if (disabled || submitting || reducedMotion || event.button !== 0) return;
        const button = buttonRef.current;
        if (!button) return;
        measureTravel();
        dragOriginRef.current = event.clientX - progressRef.current * travelRef.current;
        dragOriginYRef.current = event.clientY;
        draggingRef.current = true;
        movedRef.current = false;
        readyFeedbackRef.current = authDragShouldSubmit(progressRef.current);
        button.dataset.dragging = "true";
        button.removeAttribute("data-rebounding");
        button.setPointerCapture(event.pointerId);
        dragStartedAtRef.current = performance.now();
        dragFrameTimesRef.current = [];
        longTaskBaselineRef.current = performance.getEntriesByType("longtask").length;
        const sampleFrame = (timestamp: number) => {
            dragFrameTimesRef.current.push(timestamp);
            if (draggingRef.current) measurementFrameRef.current = window.requestAnimationFrame(sampleFrame);
            else measurementFrameRef.current = null;
        };
        measurementFrameRef.current = window.requestAnimationFrame(sampleFrame);
    };

    const pointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
        const button = buttonRef.current;
        if (!draggingRef.current || !button) return;
        const deltaX = event.clientX - dragOriginRef.current;
        const deltaY = event.clientY - dragOriginYRef.current;
        if (Math.abs(deltaY) > 22 && Math.abs(deltaY) > Math.abs(deltaX)) {
            draggingRef.current = false;
            button.removeAttribute("data-dragging");
            if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
            recordDragMetrics();
            rebound();
            return;
        }
        if (Math.abs(deltaX - progressRef.current * travelRef.current) > 5) movedRef.current = true;
        scheduleProgress(authDragProgress(deltaX, travelRef.current));
    };

    const finishDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
        const button = buttonRef.current;
        if (!draggingRef.current || !button) return;
        draggingRef.current = false;
        button.removeAttribute("data-dragging");
        if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
        recordDragMetrics();
        if (!movedRef.current) return;

        const finalProgress = authDragProgress(event.clientX - dragOriginRef.current, travelRef.current);
        if (animationFrameRef.current != null) {
            window.cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
            pendingProgressRef.current = null;
        }
        commitProgress(finalProgress);
        suppressClickRef.current = true;
        window.setTimeout(() => {
            suppressClickRef.current = false;
        }, 0);

        if (authDragShouldSubmit(finalProgress)) {
            submitAfterHold();
        } else rebound();
    };

    const cancelDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
        const button = buttonRef.current;
        if (!draggingRef.current || !button) return;
        draggingRef.current = false;
        button.removeAttribute("data-dragging");
        if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
        recordDragMetrics();
        rebound();
    };

    const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
        if (disabled || submitting) return;
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            event.preventDefault();
            const direction = event.key === "ArrowRight" ? 1 : -1;
            commitProgress(progressRef.current + direction * KEYBOARD_STEP);
            return;
        }
        if (event.key === "Enter") {
            event.preventDefault();
            submitAfterHold();
        }
    };

    const dragLabel = t(submitting ? "auth.verifying" : reducedMotion ? "auth.clickEntry" : ready ? "auth.releaseEntry" : "auth.dragEntry");

    return (
        <div className="auth-drag-control" data-error={hasError || undefined} data-ready={ready || undefined} data-reduced-motion={reducedMotion || undefined}>
            <button
                ref={buttonRef}
                type="button"
                className="auth-drag-button"
                disabled={disabled || submitting}
                onClick={(event) => {
                    if (suppressClickRef.current) {
                        event.preventDefault();
                        return;
                    }
                    submitAfterHold();
                }}
                onKeyDown={handleKeyDown}
                onPointerDown={pointerDown}
                onPointerMove={pointerMove}
                onPointerUp={finishDrag}
                onPointerCancel={cancelDrag}
                aria-label={reducedMotion ? t("auth.clickAccessible") : t("auth.dragAccessible")}
                data-progress="0.00"
            >
                <span className="auth-drag-film" aria-hidden>
                    <span className="auth-drag-stills">
                        {REVEAL_STILLS.map((src) => (
                            <img key={src} src={src} alt="" draggable={false} />
                        ))}
                    </span>
                    <span className="auth-drag-unexposed" />
                    <img className="auth-drag-film-overlay" src="/auth/film-strip-overlay.png" alt="" draggable={false} />
                </span>
                <span className="auth-drag-gate" aria-hidden>
                    <span>{t("auth.enter")}</span>
                    <ArrowRight />
                </span>
                <span className="auth-drag-handle" aria-hidden>
                    <Film className="auth-drag-handle-icon" />
                    <span className="auth-drag-handle-status">{submitting ? <LoaderCircle className="auth-spin" /> : ready ? <Check /> : null}</span>
                </span>
                <span className="auth-drag-label">{dragLabel}</span>
            </button>
            <p className="auth-drag-hint" aria-live="polite">
                {reducedMotion ? t("auth.clickHint") : t("auth.dragHint")}
            </p>
        </div>
    );
}
