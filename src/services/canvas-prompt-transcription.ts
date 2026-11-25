import { uploadResourceFile } from "@/services/api/resources";
import { waitForGenerationTask } from "@/services/api/task-center";
import { createTimelineTranscriptionTask, type TimelineTranscriptionResult } from "@/services/api/timeline-tasks";

/** Reuse the authenticated resource -> ffmpeg -> whisper.cpp task pipeline. */
export async function transcribeCanvasPrompt(blob: Blob, locale: string, signal: AbortSignal): Promise<string> {
    signal.throwIfAborted();
    const resource = await uploadResourceFile(blob, "audio", undefined, undefined, signal);
    signal.throwIfAborted();
    if (!resource.id) throw new Error("Missing transcription resource");
    const task = await createTimelineTranscriptionTask({ resourceId: resource.id, language: locale.startsWith("zh") ? locale : locale.split("-")[0] }, signal);
    if (!task.id) throw new Error("Missing transcription task");
    const completed = await waitForGenerationTask(task.id, { signal, initialTask: task, intervalMs: 1000, timeoutMs: 120_000 });
    signal.throwIfAborted();
    const result = JSON.parse(completed.resultJson || "{}") as TimelineTranscriptionResult;
    if (!Array.isArray(result.segments)) throw new Error("Invalid transcription result");
    return result.segments
        .map((segment) => (typeof segment.text === "string" ? segment.text.trim() : ""))
        .filter(Boolean)
        .join(" ");
}
