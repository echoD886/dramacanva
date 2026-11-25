import { markdownPlainText } from "@/lib/markdown-plain-text";
import type { CloudAgentConversation, CloudAgentConversationMessage } from "@/services/cloud-agent-conversations";

const messageTextCache = new WeakMap<CloudAgentConversationMessage, string>();
const dateFormatters = new Map<string, Intl.DateTimeFormat>();

function historyMessageText(message: CloudAgentConversationMessage) {
    if (message.role !== "user" && message.role !== "assistant") return "";
    const cached = messageTextCache.get(message);
    if (cached !== undefined) return cached;
    const text = markdownPlainText(message.text) || message.attachments?.map((attachment) => attachment.name).join(", ") || "";
    messageTextCache.set(message, text);
    return text;
}

export function conversationSummary(conversation: CloudAgentConversation) {
    for (let i = conversation.messages.length - 1; i >= 0; i--) {
        const text = historyMessageText(conversation.messages[i]);
        if (text) return text;
    }
    return "";
}

export function sortAgentHistory(conversations: CloudAgentConversation[]) {
    return conversations.toSorted((a, b) => (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0));
}

export async function filterAgentHistory(conversations: CloudAgentConversation[], query: string, signal?: AbortSignal) {
    if (signal?.aborted) return;
    const needle = query.trim().toLowerCase();
    if (!needle) return sortAgentHistory(conversations);
    const matches: CloudAgentConversation[] = [];
    let sliceStart = performance.now();
    for (const conversation of conversations) {
        if (conversation.title.toLowerCase().includes(needle)) {
            matches.push(conversation);
            continue;
        }
        for (const message of conversation.messages) {
            if (performance.now() - sliceStart >= 8) {
                await new Promise<void>((resolve) => setTimeout(resolve, 0));
                if (signal?.aborted) return;
                sliceStart = performance.now();
            }
            if (!historyMessageText(message).toLowerCase().includes(needle)) continue;
            matches.push(conversation);
            break;
        }
    }
    return sortAgentHistory(matches);
}

export function agentHistoryDate(timestamp: string, locale: string) {
    const date = new Date(timestamp);
    if (!Number.isFinite(date.getTime())) return "—";
    let formatter = dateFormatters.get(locale);
    if (!formatter) {
        formatter = new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", day: "numeric" });
        dateFormatters.set(locale, formatter);
    }
    return formatter.format(date);
}
