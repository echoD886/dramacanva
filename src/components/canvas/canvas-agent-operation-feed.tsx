import { Activity } from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";
import { agentToolStatus, friendlyAgentToolSummary } from "@/lib/canvas/agent-tool-presentation";
import type { CanvasTheme } from "@/lib/canvas-theme";
import type { CanvasResourceReference } from "@/lib/canvas/canvas-resource-references";
import { AgentChatMessage, type CloudAgentChatMessage } from "./canvas-cloud-agent-chat-ui";
import "./canvas-agent-entry.css";
import { agentErrorPresentation, isHiddenAgentToolStep } from "@/lib/canvas/agent-error-presentation";

export function AgentOperationFeed({ items, theme, references, onFocusNode }: { items: CloudAgentChatMessage[]; theme: CanvasTheme; references: CanvasResourceReference[]; onFocusNode?: (id: string) => void }) {
    const { t } = useI18n();
    items = items.filter((item) => !isHiddenAgentToolStep(item.title || "", item.text, item.detail));
    if (!items.length) return null;
    const latest = items.at(-1)!;
    const failed = items.some((item) => ["failed", "rejected"].includes(agentToolStatus(item.title || "", item.text, item.detail)));
    const latestFailed = ["failed", "rejected"].includes(agentToolStatus(latest.title || "", latest.text, latest.detail));
    const summary = latestFailed ? agentErrorPresentation(latest.detail, undefined, t).title : friendlyAgentToolSummary(t, latest.title || "", latest.text, latest.detail);
    return (
        <details className="agent-operations" open={failed || undefined}>
            <summary>
                <Activity className="size-3.5 shrink-0" aria-hidden="true" />
                <span>{summary}</span>
                <small>{t("canvasAgentEntry.operations", { count: items.length })}</small>
            </summary>
            <div className="space-y-2">
                {items.map((item) => (
                    <AgentChatMessage key={item.id} item={item} theme={theme} references={references} onFocusNode={onFocusNode} />
                ))}
            </div>
        </details>
    );
}
