export function frameAtElapsed({ startFrame, elapsedMs, fps, rate }: { startFrame: number; elapsedMs: number; fps: number; rate: number }): number {
    return startFrame + Math.floor((elapsedMs / 1000) * fps * rate);
}

export function resolvePlaybackFrame(frame: number, totalFrames: number, loop: boolean): { frame: number; ended: boolean } {
    if (totalFrames <= 0) return { frame: 0, ended: true };
    if (loop) return { frame: ((frame % totalFrames) + totalFrames) % totalFrames, ended: false };
    return { frame: Math.max(0, Math.min(totalFrames - 1, frame)), ended: frame >= totalFrames };
}

export function stepPrevisFrame(frame: number, delta: -1 | 1, totalFrames: number): number {
    return Math.max(0, Math.min(Math.max(0, totalFrames - 1), frame + delta));
}

export function shouldHandlePlayerKey(event: { key: string; target: EventTarget | null }, playerHasFocus: boolean): boolean {
    if (!playerHasFocus || ![" ", "ArrowLeft", "ArrowRight"].includes(event.key)) return false;
    const target = event.target as HTMLElement | null;
    return !["input", "textarea", "select"].includes(target?.tagName?.toLowerCase() ?? "") && !target?.isContentEditable && !target?.closest?.("[contenteditable]:not([contenteditable='false'])");
}
