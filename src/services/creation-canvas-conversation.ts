import type { CanvasAssistantMessage, CanvasAssistantSession } from "@/types/canvas";
import { currentLocaleText as t } from "@/i18n/current-locale-text";
import { getActiveUserScope } from "@/lib/user-scope";
import { flushCanvasStorePersistence, useCanvasStore } from "@/stores/canvas/use-canvas-store";
import { createCanvasProjectWithRemoteSync, hasRemoteUserDataSyncSession, loadCanvasProjectForEditing, saveRemoteUserDataNow } from "@/services/user-data-sync";

type SourceMessage = {
    id: string; role: "user" | "assistant"; content: string; createdAt: string;
    mode?: string; status?: string; taskIds?: string[]; error?: string; model?: string;
    settings?: unknown; attachments?: Array<{ name: string; storageKey?: string }>;
    references?: Array<{ id: string; label: string; kind: string }>;
};
type SourceConversation = { id: string; title: string; updatedAt: string; canvasId?: string; messages: SourceMessage[] };

// Same source IDs merge into the same canvas conversation, without replaying tasks
// or replacing messages produced by the canvas Agent after the handoff.
export async function continueCreationConversationOnCanvas(source: SourceConversation) {
    const scope = getActiveUserScope();
    const assertScope = () => { if (scope !== getActiveUserScope()) throw new DOMException(t("canvasExtra.handoff.accountChanged"), "AbortError"); };
    if (!source.id || !source.messages.length) throw new Error(t("canvasExtra.handoff.startFirst"));
    if (source.messages.some((item) => item.status === "pending" || item.status === "streaming")) throw new Error(t("canvasExtra.handoff.generationRunning"));
    if (!useCanvasStore.getState().hydrated) throw new Error(t("canvasExtra.handoff.canvasLoading"));
    const sessionId = `creation:${source.id}`;
    const messages: CanvasAssistantMessage[] = source.messages.map((item) => ({
        id: `creation:${source.id}:${item.id}`, role: item.role,
        text: item.content || t(item.status === "done" ? "canvasExtra.handoff.generated" : item.status === "error" ? "canvasExtra.handoff.failed" : item.status === "cancelled" ? "canvasExtra.handoff.stopped" : "canvasExtra.handoff.record"),
        meta: t("canvasExtra.handoff.fromHome"),
        detail: { kind: "creation-handoff", sourceConversationId: source.id, sourceMessageId: item.id, createdAt: item.createdAt,
            status: item.status, mode: item.mode, model: item.model, taskIds: item.taskIds, error: item.error, settings: item.settings,
            references: item.references?.map(({ id, label, kind }) => ({ id, label, kind })),
            attachments: item.attachments?.map(({ name, storageKey }) => ({ name, storageKey })),
        },
    }));
    const local = useCanvasStore.getState().projects.find((item) => item.chatSessions?.some((session) => session.id === sessionId));
    const existingId = source.canvasId || local?.id;
    let id: string;
    let syncError: unknown;
    if (existingId) {
        const project = await loadCanvasProjectForEditing(existingId);
        assertScope();
        if (!project) throw new Error(t("canvasExtra.handoff.canvasMissing"));
        const sessions = project.chatSessions || [];
        const previous = sessions.find((item) => item.id === sessionId);
        const incoming = new Map(messages.map((item) => [item.id, item]));
        const merged = (previous?.messages || []).map((item) => {
            const replacement = incoming.get(item.id);
            incoming.delete(item.id);
            return replacement || item;
        });
        const session: CanvasAssistantSession = { ...previous, id: sessionId, title: source.title, createdAt: previous?.createdAt || source.messages[0].createdAt, updatedAt: new Date().toISOString(), messages: [...merged, ...incoming.values()] };
        useCanvasStore.getState().updateProject(project.id, { chatSessions: [...sessions.filter((item) => item.id !== sessionId), session], activeChatId: sessionId });
        id = project.id;
        await flushCanvasStorePersistence();
        assertScope();
        try {
            if (!hasRemoteUserDataSyncSession()) throw new Error(t("canvasExtra.handoff.syncMissing"));
            await saveRemoteUserDataNow();
        } catch (cause) { syncError = cause; }
    } else {
        const session: CanvasAssistantSession = { id: sessionId, title: source.title, createdAt: source.messages[0].createdAt, updatedAt: source.updatedAt, messages };
        const created = await createCanvasProjectWithRemoteSync(source.title || t("canvasExtra.handoff.canvasTitle"), undefined, { chatSessions: [session], activeChatId: sessionId });
        id = created.id;
        syncError = created.syncError;
        await flushCanvasStorePersistence();
        assertScope();
        if (!syncError) {
            try {
                if (!hasRemoteUserDataSyncSession()) throw new Error(t("canvasExtra.handoff.syncMissing"));
                await saveRemoteUserDataNow();
            } catch (cause) { syncError = cause; }
        }
    }
    assertScope();
    return { id, sessionId, syncError };
}
