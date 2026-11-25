import type { CloudAgentChatMessage } from "@/components/canvas/canvas-cloud-agent-chat-ui";
import type { AgentEvent } from "@/services/api/agent";
import { agentErrorPresentation } from "@/lib/canvas/agent-error-presentation";

/** A terminal snapshot and its replayed failure event describe one run failure. */
export function upsertAgentRunFailure(current: CloudAgentChatMessage[], event: Pick<AgentEvent, "runId" | "eventId" | "type">, text: string, detail?: unknown) {
    const id = `terminal-${event.runId}`;
    const message: CloudAgentChatMessage = { id, role: "error", ...agentErrorPresentation({ ...(detail && typeof detail === "object" ? detail : {}), text }) };
    const next = current.filter((item) => item.role !== "error" || item.id === id || (item.id !== event.eventId && !(item.id.startsWith(`${event.runId}:`) && /^\d+$/.test(item.id.slice(event.runId.length + 1)))));
    const index = next.findIndex((item) => item.id === id);
    if (index < 0) return [...next, message];
    const previous = next[index];
    // A generic replay cannot erase the detailed public reason in the snapshot.
    if ((text || detail) && !(previous.errorCategory && previous.errorCategory !== "unknown" && message.errorCategory === "unknown") && (event.type === "run_status" || previous.errorCategory === "unknown" || message.errorCategory !== "unknown"))
        next[index] = message;
    return next;
}
