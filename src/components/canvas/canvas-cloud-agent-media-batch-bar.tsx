import { useI18n } from "@/i18n/use-i18n";
import { agentUpgradeText } from "@/i18n/agent-upgrade-copy";
import { agentMediaBatchCounts, type CloudAgentMediaBatchProgress } from "@/lib/canvas/cloud-agent-media-batch";
import type { canvasThemes } from "@/lib/canvas-theme";

export function AgentMediaBatchBar({ batch, theme, onFocusNode }: { batch: CloudAgentMediaBatchProgress; theme: (typeof canvasThemes)[keyof typeof canvasThemes]; onFocusNode?: (id: string) => void }) {
    const { locale } = useI18n();
    const counts = agentMediaBatchCounts(batch);
    const text = (key: Parameters<typeof agentUpgradeText>[1]) => agentUpgradeText(locale, key);
    return (
        <section className="agent-batch-progress rounded-lg border p-3 text-xs" style={{ background: theme.node.fill, borderColor: theme.node.stroke, color: theme.node.text }}>
            <div className="flex justify-between gap-2" aria-live="polite">
                <strong>{text("batchTitle")}</strong>
                <span>{text(batch.phase)}</span>
            </div>
            <progress className="my-2 w-full" style={{ accentColor: theme.accent.primary }} value={counts.succeeded + counts.failed + counts.cancelled} max={batch.total} aria-label={text("batchTitle")} />
            <div>
                {text("succeeded")} {counts.succeeded}/{batch.total} · {text("submitted")} {counts.submitted} · {text("failed")} {counts.failed}
            </div>
            <details className="mt-2">
                <summary className="cursor-pointer">
                    {text("nodes")} ({batch.total})
                </summary>
                <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto" data-canvas-wheel-scroll>
                    {batch.items.map((item) => (
                        <li key={item.index} className="flex items-center justify-between gap-2">
                            <button type="button" className="truncate text-left underline focus-visible:outline" onClick={() => onFocusNode?.(item.nodeId)}>
                                {item.title || `#${item.index + 1}`}
                            </button>
                            <span>{text(item.status)}</span>
                        </li>
                    ))}
                </ul>
            </details>
        </section>
    );
}
