import type { CloudAgentPlanItem, CloudAgentUserQuestion } from "@/components/canvas/canvas-cloud-agent-chat-ui";

type PlanCarrier = { planItems?: CloudAgentPlanItem[] };

/** A conversation can contain plans from several runs; only the latest one is current. */
export function latestAgentPlanItems(messages: readonly PlanCarrier[]): CloudAgentPlanItem[] {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
        const items = messages[index].planItems;
        if (items?.length) return items;
    }
    return [];
}

export function agentPlanVisible(items: readonly CloudAgentPlanItem[]): boolean {
    return items.length > 0 && items.some((entry) => entry.status !== "done");
}

type QuestionCarrier = { role: string; question?: CloudAgentUserQuestion };

/** A question is pending until the user has responded after that question. */
export function pendingAgentQuestion(messages: readonly QuestionCarrier[]): CloudAgentUserQuestion | undefined {
    let index = -1;
    for (let cursor = messages.length - 1; cursor >= 0; cursor -= 1) {
        if (messages[cursor].question) {
            index = cursor;
            break;
        }
    }
    if (index < 0) return undefined;
    for (let cursor = index + 1; cursor < messages.length; cursor += 1) {
        if (messages[cursor].role === "user") return undefined;
    }
    return messages[index].question;
}
