export const COPY_FEEDBACK_MS = 2_000;
export type CopyStatus = "idle" | "copied" | "failed";

export async function copyMcpCode(value: string, writeText: (value: string) => Promise<void>, feedback: (status: CopyStatus) => void, scheduleReset: (callback: () => void, delay: number) => void, isCurrent: () => boolean = () => true) {
    try {
        await writeText(value);
        if (!isCurrent()) return;
        feedback("copied");
        scheduleReset(() => {
            if (isCurrent()) feedback("idle");
        }, COPY_FEEDBACK_MS);
    } catch {
        if (isCurrent()) feedback("failed");
    }
}
