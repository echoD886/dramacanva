import { useI18n } from "@/i18n/use-i18n";
import type { GenerationPhase } from "@/lib/generation-task-display";
import { progressFillStyle } from "@/lib/progress-fill";
import type { CSSProperties } from "react";

const labels = ["generationTask.queued", "generationTask.running", "generationTask.phaseSaving"] as const;

export function GenerationPhaseSteps({ step, progress, style }: { step: GenerationPhase | 3; progress?: number | null; style?: CSSProperties }) {
    const { t, number } = useI18n();
    const value = typeof progress === "number" && Number.isFinite(progress) ? Math.max(0, Math.min(100, Math.round(progress))) : null;
    return (
        <ol className="grid w-full grid-cols-3 gap-1.5 text-center text-[var(--fs-tiny)]" style={style}>
            {labels.map((label, index) => {
                const active = index === step;
                const determinate = active && value !== null;
                return (
                    <li key={label} className="min-w-0" aria-current={active ? "step" : undefined}>
                        <span className="mb-1 block h-1 overflow-hidden rounded-full" style={{ background: "var(--gen-steps-track, var(--border))" }}>
                            {index <= step && (
                                <span
                                    className={`block h-full rounded-full ${active && !determinate ? "w-1/2 motion-safe:animate-pulse" : "w-full"}`}
                                    style={determinate ? progressFillStyle(value, { background: "var(--gen-steps-fill, var(--status-loading))" }) : { background: "var(--gen-steps-fill, var(--status-loading))" }}
                                />
                            )}
                        </span>
                        <span className="block truncate" title={t(label)}>
                            {t(label)}
                            {determinate ? ` · ${number(value)}%` : ""}
                        </span>
                    </li>
                );
            })}
        </ol>
    );
}
