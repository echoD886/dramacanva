import { useMutation, useQuery } from "@tanstack/react-query";
import { App, Button } from "antd";
import { useNavigate } from "react-router";
import { worldEngineText as t } from "@/i18n/world-engine-text";
import { useAppLocale } from "@/i18n/app-locale";
import { listProjectCanvases } from "@/services/api/projects";
import { getRemoteCanvasProject } from "@/services/api/user-data";
import { dramaEpisodeCanvasHref } from "@/services/drama-canvas-handoff";
import { dramaWorldEngineOutputs } from "@/lib/canvas/drama-world-engine";
import { listDramaWorldClips, type DramaSegment } from "@/services/api/drama";
import { useUserStore } from "@/stores/use-user-store";
import { dramaKeys } from "@/lib/drama/query-keys";
import { useResourceMediaUrl } from "../drama-shared";
import { currentLocaleText } from "@/i18n/current-locale-text";

function preloadCanvas() {
    void import("@/lib/workspace-route-modules").then(({ loadCanvasProjectPage }) => loadCanvasProjectPage()).catch(() => undefined);
}

export function SegmentWorldEngine({ projectId, episodeId, segment, shotId }: { projectId: string; episodeId: string; segment: DramaSegment; shotId?: string }) {
    useAppLocale();
    const navigate = useNavigate();
    const { message } = App.useApp();
    const scope = useUserStore((state) => state.user?.id);
    const generated = useQuery({
        queryKey: dramaKeys.worldClips(projectId, episodeId, scope),
        queryFn: ({ signal }) => listDramaWorldClips(projectId, episodeId, signal),
        refetchOnMount: "always",
    });
    const output = useQuery({
        queryKey: ["drama", projectId, "world-engine", episodeId, segment.id],
        queryFn: async () => {
            const page = await listProjectCanvases(projectId, 1, 1);
            const canvasId = page.canvases[0]?.id;
            if (!canvasId) return [];
            const { project } = await getRemoteCanvasProject(canvasId);
            return dramaWorldEngineOutputs(project.nodes, projectId, episodeId, segment.id);
        },
        refetchOnMount: "always",
        refetchOnWindowFocus: true,
    });
    const open = useMutation({
        mutationFn: () => dramaEpisodeCanvasHref(projectId, segment.title, episodeId, segment.id, shotId),
        onSuccess: (href) => navigate(href),
        onError: (error) => message.error(error instanceof Error ? error.message : t("worldEngine.handoffFailed")),
    });
    return (
        <section className="drama-sd-block" data-world-engine-segment>
            <Button
                onPointerEnter={preloadCanvas}
                onFocus={preloadCanvas}
                onClick={() => {
                    preloadCanvas();
                    void import("@/components/canvas/director/world-engine-workbench").catch(() => undefined);
                    open.mutate();
                }}
                loading={open.isPending}
            >
                {t("worldEngine.open")}
            </Button>
            {output.isError || generated.isError ? <p role="alert">{t("worldEngine.outputReadFailed")}</p> : null}
            {generated.data?.clips
                .filter((clip) => clip.segmentId === segment.id && (!shotId || clip.shotId === shotId))
                .map((clip) => (
                    <GeneratedWorldClip key={clip.shotId} resourceId={clip.resourceId} shotNumber={segment.shotIds.indexOf(clip.shotId) + 1} />
                ))}
            {(output.data || [])
                .filter((item) => !shotId || item.shotId === shotId)
                .map((item) => (
                    <div key={item.shotId}>
                        <strong>{item.title}</strong>
                        {item.image?.metadata?.content ? (
                            <a href={item.image.metadata.content} target="_blank" rel="noreferrer">
                                <img src={item.image.metadata.content} alt={t("worldEngine.composition")} style={{ width: "100%", objectFit: "contain" }} />
                            </a>
                        ) : null}
                        {item.video?.metadata?.content ? <video controls preload="metadata" src={item.video.metadata.content} aria-label={t("worldEngine.clayVideo")} style={{ width: "100%" }} /> : null}
                        {item.prompt ? (
                            <details>
                                <summary>{t("worldEngine.shotPrompt")}</summary>
                                <p style={{ whiteSpace: "pre-wrap" }}>{item.prompt}</p>
                            </details>
                        ) : null}
                    </div>
                ))}
        </section>
    );
}

function GeneratedWorldClip({ resourceId, shotNumber }: { resourceId: string; shotNumber: number }) {
    const url = useResourceMediaUrl(resourceId, "playback");
    return (
        <div>
            <strong>{currentLocaleText("nodeSearch.shot", { number: shotNumber })}</strong>
            {url && <video controls preload="metadata" src={url} aria-label={t("worldEngine.generatedVideo")} style={{ width: "100%" }} />}
        </div>
    );
}
