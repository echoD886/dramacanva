import { listProjectCanvases } from "@/services/api/projects";
import { createCanvasProjectWithRemoteSync } from "@/services/user-data-sync";

export async function dramaEpisodeCanvasHref(projectId: string, title: string, episodeId: string, segmentId?: string, shotId?: string) {
    const page = await listProjectCanvases(projectId, 1, 1);
    let canvasId = page.canvases[0]?.id;
    if (!canvasId) {
        const created = await createCanvasProjectWithRemoteSync(title, projectId);
        if (created.syncError) throw created.syncError;
        canvasId = created.id;
    }
    const params = new URLSearchParams({ dramaEpisode: episodeId });
    if (segmentId) params.set("dramaSegment", segmentId);
    if (shotId) params.set("dramaShot", shotId);
    return `/canvas/${encodeURIComponent(canvasId)}?${params}`;
}
