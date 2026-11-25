export type AgentFeedRecord = { id: string; role: string; text: string; title?: string; detail?: unknown; planItems?: readonly unknown[]; question?: unknown };
export type AgentFeedSegment<T> = { kind: "operations"; key: string; items: T[] } | { kind: "message"; key: string; item: T };

export function buildAgentFeedSegments<T extends AgentFeedRecord>(messages: readonly T[]): AgentFeedSegment<T>[] {
    const segments: AgentFeedSegment<T>[] = [];
    for (const item of messages) {
        // Plan and question carriers already have dedicated bars; never fold approvals into activity.
        if (item.role !== "user" && !item.text && !item.title && (item.planItems?.length || item.question)) continue;
        const detail = item.detail && typeof item.detail === "object" ? (item.detail as Record<string, unknown>) : {};
        if (item.role === "tool" && detail.status !== "pending") {
            const last = segments.at(-1);
            if (last?.kind === "operations") last.items.push(item);
            else segments.push({ kind: "operations", key: item.id, items: [item] });
        } else {
            segments.push({ kind: "message", key: item.id, item });
        }
    }
    return segments;
}
