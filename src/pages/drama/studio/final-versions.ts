import type { DramaSegment, DramaWorldClip } from "@/services/api/drama";
import type { GenerationTask } from "@/services/api/task-center";

export type FinalClip = { segmentId: string; shotId?: string; index: number; resourceId?: string; startMs: number; durationMs: number; stale?: boolean };
export type FinalVersion = { id: string; resourceId?: string; durationMs: number; clips: FinalClip[]; createdAt?: string; task?: GenerationTask };

export function composeSummary(segments: DramaSegment[], worldClips: DramaWorldClip[] = []) {
    const count = new Map<string, number>();
    for (const clip of worldClips) count.set(clip.segmentId, (count.get(clip.segmentId) || 0) + 1);
    let ready = 0;
    let stale = 0;
    for (const segment of segments) {
        const worldComplete = count.get(segment.id) === segment.shotIds?.length && Boolean(segment.shotIds?.length);
        const hasVideo = segment.videoResourceId && (segment.videoStatus === "ready" || segment.videoStatus === "stale");
        if (worldComplete || hasVideo) ready++;
        if (hasVideo && segment.videoStatus === "stale" && !worldComplete) stale++;
    }
    return { ready, skipped: segments.length - ready, stale };
}

/** Use server-frozen starts and measured durations, never the current editable segment duration. */
export function taskFinalVersion(task: GenerationTask, segments: DramaSegment[]): FinalVersion | null {
    if (task.type !== "timeline_render") return null;
    try {
        const input = JSON.parse(task.inputJson || "{}");
        const source = input.timeline?.clips;
        if (!Array.isArray(source) || !source.length) return null;
        const clips: FinalClip[] = [];
        for (const clip of source) {
            if (typeof clip.id !== "string" || !clip.id.startsWith("v-")) return null;
            const [segmentId, shotId] = clip.id.slice(2).split(":shot:");
            const segment = segments.find((s) => s.id === segmentId);
            if (!segment) return null;
            clips.push({ segmentId: segment.id, ...(shotId ? { shotId } : {}), index: segment.index, resourceId: clip.directMedia?.id, startMs: clip.startMs, durationMs: clip.durationMs, stale: Boolean(clip.dramaStale) });
        }
        clips.sort((a, b) => a.startMs - b.startMs);
        const result = JSON.parse(task.resultJson || "{}");
        return { id: task.id, resourceId: task.status === "succeeded" ? result.resourceId : undefined, durationMs: result.durationMs || input.timeline.durationMs, clips, createdAt: task.createdAt, task };
    } catch {
        return null;
    }
}

export function versionMatchesReady(version: FinalVersion | undefined, segments: DramaSegment[]) {
    const ready = segments.filter((s) => s.videoResourceId && s.videoStatus === "ready");
    return Boolean(version?.resourceId && ready.length === version.clips.length && ready.every((s, i) => s.id === version.clips[i].segmentId && s.videoResourceId === version.clips[i].resourceId));
}
