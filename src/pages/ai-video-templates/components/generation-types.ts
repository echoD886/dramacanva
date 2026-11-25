export type GenerationPhase = "idle" | "uploading" | "quoting" | "queued" | "generating" | "done" | "failed";

export type GenerationErrorState = {
    title?: string;
    message: string;
    isInsufficientCredits?: boolean;
    canRetry?: boolean;
};

export function isGenerationWorking(phase: GenerationPhase) {
    return phase === "uploading" || phase === "quoting" || phase === "queued" || phase === "generating";
}
