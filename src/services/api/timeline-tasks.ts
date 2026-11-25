import { apiClient, request } from "@/services/api/request";
import { observeGenerationTask } from "@/services/creation-analytics";
import type { GenerationTask } from "@/services/api/task-center";
import type { TimelineProject } from "@/types/timeline";
import { currentLocaleText as t } from "@/i18n/current-locale-text";
import { resourceIdFromStorageKey, resourceStorageKey, uploadResourceFile } from "@/services/api/resources";
import { getMediaBlob } from "@/services/file-storage";
import { getImageBlob } from "@/services/image-storage";

// 时间线字幕转写任务（M4.1，whisper.cpp 本地执行）。
// 创建入参与后端 TimelineTranscriptionCreateRequest 契约一致。

export type TimelineTranscriptionCreateRequest = {
    resourceId: string;
    language?: string;
    projectId?: string;
};

export type TimelineTranscriptionResult = {
    segments: TimelineTranscriptionSegment[];
    srt?: string;
    language?: string;
};

export type TimelineTranscriptionSegment = {
    startMs: number;
    endMs: number;
    text: string;
};

export async function createTimelineTranscriptionTask(payload: TimelineTranscriptionCreateRequest, signal?: AbortSignal): Promise<GenerationTask> {
    const task = await request<GenerationTask>(apiClient.post("/timeline/transcriptions", payload, { signal }));
    observeGenerationTask(task, true);
    return task;
}

// 时间线成片渲染任务（M4.2，后端 ffmpeg 合成）。
// 创建入参与后端 TimelineRenderCreateRequest 契约一致；timeline 直接传
// TimelineProject v2（后端 renderProject 与其字段同名同构，多余字段被忽略）。
// 任务完成后轮询 status，ResultJSON = TimelineRenderResult。

export type TimelineRenderCreateRequest = {
    projectId: string;
    timeline: TimelineProject;
};

export type TimelineRenderResult = {
    resourceId: string;
    fileName?: string;
    size?: number;
    durationMs?: number;
    subtitleSrt?: string;
};

export async function createTimelineRenderTask(payload: TimelineRenderCreateRequest, signal?: AbortSignal): Promise<GenerationTask> {
    // Mixed local/platform timelines must upload local inputs before moving
    // rendering to the server; otherwise those clips would become black gaps.
    const uploads = new Map<string, string>();
    const clips = [];
    for (const clip of payload.timeline.clips) {
        signal?.throwIfAborted();
        const source = clip.directMedia;
        if (!source || !["image", "video", "audio"].includes(clip.kind) || resourceIdFromStorageKey(source.storageKey)) {
            clips.push(clip);
            continue;
        }
        const key = source.storageKey || source.url || clip.nodeId;
        let storageKey = uploads.get(key);
        if (!storageKey) {
            const read = clip.kind === "image" ? getImageBlob : getMediaBlob;
            let blob = source.storageKey ? await read(source.storageKey) : null;
            if (!blob && source.url) {
                const response = await fetch(source.url, { signal, credentials: "same-origin" });
                if (!response.ok) throw new Error(t("editorTools.mediaHttp", { status: response.status }));
                blob = await response.blob();
            }
            if (!blob) throw new Error(t("assetPicker.readError"));
            const resource = await uploadResourceFile(blob, clip.kind as "image" | "video" | "audio", undefined, undefined, signal);
            storageKey = resourceStorageKey(resource.id);
            uploads.set(key, storageKey);
        }
        clips.push({ ...clip, directMedia: { ...source, storageKey } });
    }
    const task = await request<GenerationTask>(apiClient.post("/timeline/renders", { ...payload, timeline: { ...payload.timeline, clips } }, { signal }));
    observeGenerationTask(task, true);
    return task;
}
