import { appendTaskTextDelta, completeTextReplayTask, createGenerationTask, failTextReplayTask } from "@/services/api/task-center";
import type { AiConfig } from "@/stores/use-config-store";

/** Serializes replay writes; terminal events wait for task creation and pending deltas. */
export function createTextReplayPublisher(config: AiConfig, prompt: string) {
    let taskId: string | null = null;
    let starting: Promise<void> | undefined;
    let writes = Promise.resolve();
    let lastLen = 0;
    let buffered = "";
    let timer: ReturnType<typeof setTimeout> | undefined;
    let closed = false;

    const start = () => starting ??= (async () => {
        try {
            const task = await createGenerationTask({ type: "text", prompt: prompt.trim() || "文本创作", model: config.model,
                input: { mode: "text", replay: true, prompt: prompt.trim() || "文本创作",
                    config: { model: config.model, baseUrl: config.baseUrl, apiKey: config.apiKey, apiFormat: config.apiFormat } } });
            taskId = task?.id || null;
        } catch { taskId = null; }
    })();
    const enqueue = (operation: (id: string) => Promise<unknown>) => {
        writes = writes.then(async () => {
            await starting;
            if (taskId) await operation(taskId);
        }).catch(() => undefined);
        return writes;
    };
    const flush = () => {
        clearTimeout(timer);
        timer = undefined;
        const chunk = buffered;
        buffered = "";
        if (chunk.trim()) enqueue((id) => appendTaskTextDelta(id, chunk));
    };
    const publish = (fullText: string) => {
        if (closed || fullText.length <= lastLen) return;
        buffered += fullText.slice(lastLen);
        lastLen = fullText.length;
        if (buffered.length >= 2048) flush();
        else if (!timer) timer = setTimeout(flush, 1000);
    };
    const finish = (text: string) => {
        if (closed) return writes;
        closed = true;
        flush();
        return enqueue((id) => text.trim() ? completeTextReplayTask(id, text) : failTextReplayTask(id));
    };
    const fail = (cancelled = false) => {
        if (closed) return writes;
        closed = true;
        flush();
        return enqueue((id) => failTextReplayTask(id, cancelled));
    };
    return { start, publish, finish, fail };
}
