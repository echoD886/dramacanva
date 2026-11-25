import { localForageStorageForScope, scopedLocalForageKeys } from "@/lib/localforage-storage";
import { markdownPlainText } from "@/lib/markdown-plain-text";
import { getActiveUserScope } from "@/lib/user-scope";
import { currentLocaleText as t } from "@/i18n/current-locale-text";
import type { AgentPermissionMode, AgentRun } from "@/services/api/agent";
import type { CloudAgentPlanItem, CloudAgentUserQuestion } from "@/components/canvas/canvas-cloud-agent-chat-ui";
import type { CanvasAssistantSession } from "@/types/canvas";

export type CloudAgentConversationMessage = {
    id: string;
    role: "user" | "assistant" | "system" | "tool" | "error";
    title?: string;
    text: string;
    meta?: string;
    detail?: unknown;
    planItems?: CloudAgentPlanItem[];
    question?: CloudAgentUserQuestion;
    interjection?: "sent" | "undelivered";
    attachments?: Array<{ id: string; name: string; url: string }>;
};

export type CloudAgentConversation = {
    legacy?: boolean;
    id: string;
    title: string;
    messages: CloudAgentConversationMessage[];
    run: AgentRun | null;
    model?: string;
    permissionMode: AgentPermissionMode;
    skillIds?: string[];
    createdAt: string;
    updatedAt: string;
};

type CloudAgentConversationDocument = {
    version: 1;
    legacyImported?: boolean;
    legacySources?: string[];
    activeId: string | null;
    conversations: CloudAgentConversation[];
};

export type CloudAgentPendingSubmission = {
    fingerprint: string;
    key: string;
    request?: import("@/services/api/agent").CreateAgentRunInput;
    parentRunId?: string;
    messageId?: string;
};

const CLOUD_AGENT_CONVERSATIONS_KEY = "cloud-agent-conversations-v1";

const ACCOUNT_HISTORY = "cloud-agent-conversations-v2";

function parseHistory(value: string) {
    let parsed: unknown;
    try { parsed = JSON.parse(value); } catch { throw new Error(t("canvasExtra.cloudHistory.corrupt")); }
    if (!isConversationDocument(parsed)) throw new Error(t("canvasExtra.cloudHistory.invalid"));
    return parsed;
}

export async function loadCloudAgentConversations(initialCanvasId: string): Promise<CloudAgentConversationDocument> {
    const scope = getActiveUserScope();
    const storage = localForageStorageForScope(scope);
    const saved = await storage.getItem(ACCOUNT_HISTORY);
    assertStorageScope(scope);
    if (saved) return parseHistory(saved);

    // Copy v1 history and frozen retry requests before publishing the unified document.
    const prefix = CLOUD_AGENT_CONVERSATIONS_KEY + ":";
    const keys = await scopedLocalForageKeys(prefix, scope);
    const chats = new Map<string, CloudAgentConversation>();
    const legacySources: string[] = [];
    let activeId: string | null = null;
    for (const key of keys) {
        const raw = await storage.getItem(key);
        if (!raw) continue;
        const tail = key.slice(prefix.length);
        if (tail.startsWith("pending:")) {
            const [, , id] = tail.split(":");
            if (id) await storage.setItem(ACCOUNT_HISTORY + ":pending:" + id, raw);
            continue;
        }
        const doc = parseHistory(raw);
        if (doc.legacyImported) legacySources.push(decodeURIComponent(tail));
        for (const chat of doc.conversations) {
            if ((chats.get(chat.id)?.updatedAt ?? "") <= chat.updatedAt) chats.set(chat.id, chat);
        }
        if (tail === encodeURIComponent(initialCanvasId)) activeId = doc.activeId;
    }
    const conversations = [...chats.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const doc = { ...emptyDocument(), legacySources, activeId: activeId ?? conversations[0]?.id ?? null, conversations };
    assertStorageScope(scope);
    await storage.setItem(ACCOUNT_HISTORY, JSON.stringify(doc));
    return doc;
}

export async function saveCloudAgentConversations(activeId: string | null, conversations: CloudAgentConversation[], legacySources: string[], scope = getActiveUserScope()) {
    const document: CloudAgentConversationDocument = { version: 1, activeId, conversations, legacySources };
    await localForageStorageForScope(scope).setItem(ACCOUNT_HISTORY, JSON.stringify(document));
}

// Keep the retry key outside the chat snapshot. If the response is lost, a
// page refresh can safely repeat the same request without creating another
// billed Agent turn.
export async function loadCloudAgentPendingSubmission(conversationId: string, scope = getActiveUserScope()) {
    if (!conversationId) return null;
    const value = await localForageStorageForScope(scope).getItem(pendingStorageKey(conversationId));
    if (value === null || value === undefined) return null;
    // A corrupt recovery record is not proof that the previous POST never ran.
    // Fail closed rather than discarding its identity and risking another charge.
    try {
        const parsed = JSON.parse(value) as Partial<CloudAgentPendingSubmission> | null;
        if (!parsed || typeof parsed.fingerprint !== "string" || typeof parsed.key !== "string" || parsed.key.length < 8) throw new Error("invalid identity");
        if (parsed.request !== undefined && (!parsed.request || parsed.request.idempotencyKey !== parsed.key || typeof parsed.request.canvasId !== "string" || typeof parsed.request.prompt !== "string")) throw new Error("invalid request");
        if (parsed.parentRunId !== undefined && typeof parsed.parentRunId !== "string") throw new Error("invalid parent");
        if (parsed.messageId !== undefined && typeof parsed.messageId !== "string") throw new Error("invalid message");
        return { fingerprint: parsed.fingerprint, key: parsed.key, request: parsed.request, parentRunId: parsed.parentRunId, messageId: parsed.messageId } satisfies CloudAgentPendingSubmission;
    } catch {
        throw new Error(t("canvasExtra.cloudHistory.pendingCorrupt"));
    }
}

export async function saveCloudAgentPendingSubmission(conversationId: string, pending: CloudAgentPendingSubmission, scope = getActiveUserScope()) {
    if (!conversationId) throw new Error(t("canvasExtra.cloudHistory.scopeMissing"));
    await localForageStorageForScope(scope).setItem(pendingStorageKey(conversationId), JSON.stringify(pending));
}

export async function clearCloudAgentPendingSubmission(conversationId: string, scope = getActiveUserScope()) {
    if (!conversationId) return;
    await localForageStorageForScope(scope).removeItem(pendingStorageKey(conversationId));
}

export function cloudAgentConversationTitle(messages: CloudAgentConversationMessage[]) {
    const firstPrompt = displayConversationTitle(messages.find((message) => message.role === "user")?.text || "");
    return firstPrompt.length > 28 ? `${firstPrompt.slice(0, 28)}...` : firstPrompt;
}

function displayConversationTitle(value: string) {
    return markdownPlainText(value.replace(/@\[skill:[^\]]+\]/gu, t("canvasExtra.cloudHistory.skillPackage"))) || t("canvasCloudAgent.newConversation");
}

function pendingStorageKey(conversationId: string) {
    return ACCOUNT_HISTORY + ":pending:" + encodeURIComponent(conversationId);
}

function emptyDocument(): CloudAgentConversationDocument {
    return { version: 1, activeId: null, conversations: [] };
}

function assertStorageScope(scope: string) {
    if (scope !== getActiveUserScope()) throw new DOMException("Agent identity changed", "AbortError");
}

/** Old tool traces remain readable but cannot be resumed as paid or executable runs. */
export function legacyAgentConversations(sessions: CanvasAssistantSession[]): CloudAgentConversation[] {
    return sessions.filter((session) => session.id && Array.isArray(session.messages)).map((session) => ({
        id: `legacy:${session.id}`,
        title: session.title || t("canvasCloudAgent.newConversation"),
        legacy: true,
        messages: session.messages.filter((message) => typeof message.text === "string").map((message) => ({
            id: `legacy:${message.id}`,
            role: message.role === "user" ? "user" as const : message.role === "assistant" ? "assistant" as const : "system" as const,
            text: message.text,
            title: message.title,
        })),
        run: null,
        permissionMode: "read_only" as const,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
    }));
}

function isConversationDocument(value: unknown): value is CloudAgentConversationDocument {
    if (!value || typeof value !== "object") return false;
    const document = value as Partial<CloudAgentConversationDocument>;
    if (document.version !== 1 || !Array.isArray(document.conversations)) return false;
    return document.conversations.every((conversation) => {
        if (!conversation || typeof conversation !== "object") return false;
        const candidate = conversation as Partial<CloudAgentConversation>;
        return typeof candidate.id === "string"
            && typeof candidate.title === "string"
            && Array.isArray(candidate.messages)
            && typeof candidate.createdAt === "string"
            && typeof candidate.updatedAt === "string"
            && ["read_only", "auto", "request_approval"].includes(candidate.permissionMode || "");
    });
}
