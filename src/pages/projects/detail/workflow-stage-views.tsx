import { useI18n } from "@/i18n/use-i18n";
import { Button } from "antd";
import { useQuery } from "@tanstack/react-query";
import { Clock3, Film, Layers3, PackageCheck } from "lucide-react";
import { Link } from "react-router";

import { listProjectAssetsPage, type ProjectDetail } from "@/services/api/projects";

import { categoryLabel } from "./shared";
import { formatDuration, MetricCard, StageHeading } from "./workflow-shared";

export function StoryStage({ detail, projectId, unitId }: { detail: ProjectDetail; projectId: string; unitId: string }) {
    const { t } = useI18n();
    const unit = detail.units.find((item) => item.id === unitId)!;
    return <section className="mx-auto max-w-5xl"><StageHeading eyebrow={t("workflowOverview.storyEyebrow")} title={unit.title} description={t("workflowOverview.storyDescription")} /><div className="mt-6 rounded-xl border border-border/70 bg-surface p-5"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-medium text-foreground/55">{t("workflowOverview.original")}</span><Link to={`/projects/${projectId}/chapters/${unit.id}`}><Button size="small">{t("workflowOverview.edit")}</Button></Link></div><div className="max-h-[60vh] whitespace-pre-wrap text-sm leading-7 text-foreground/78">{unit.sourceText || t("workflowOverview.noStory")}</div></div></section>;
}

export function AssetsStage({ detail, projectId, unitId }: { detail: ProjectDetail; projectId: string; unitId: string }) {
    const { t, number } = useI18n();
    const candidates = detail.assetCandidates.filter((item) => !item.unitId || item.unitId === unitId);
    const assetCountsQuery = useQuery({ queryKey: ["project", projectId, "assets", "workflow-counts"], queryFn: () => listProjectAssetsPage(projectId, { page: 1, pageSize: 1 }) });
    const confirmedCounts = assetCountsQuery.data?.categoryCounts || {};
    const categories = ["character", "environment", "wardrobe", "prop", "weapon"];
    return <section className="mx-auto max-w-6xl"><StageHeading eyebrow={t("workflowOverview.assetsEyebrow")} title={t("workflowOverview.assetsTitle")} description={t("workflowOverview.assetsDescription")} /><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{categories.map((category) => { const confirmed = confirmedCounts[category] || 0; const pending = candidates.filter((item) => item.category === category && item.status === "pending_confirmation").length; return <div key={category} className="border-t border-border/70 py-4"><div className="text-xs font-medium text-foreground/55">{categoryLabel(category, t)}</div><div className="mt-3 text-2xl font-semibold">{assetCountsQuery.isLoading ? "—" : number(confirmed)}</div><div className="mt-1 text-[var(--fs-micro)] text-foreground/42">{t("workflowOverview.pending", { count: number(pending) })}</div></div>; })}</div><div className="mt-5 flex items-center justify-between border-y border-border/70 py-5"><div><h3 className="text-sm font-semibold">{t("workflowOverview.libraryTitle")}</h3><p className="mt-1 text-xs text-foreground/48">{t("workflowOverview.libraryHint")}</p></div><Link to={`/projects/${projectId}/assets`}><Button type="primary">{t("workflowOverview.openLibrary")}</Button></Link></div></section>;
}

export function DeliveryStage({ detail, unitId }: { detail: ProjectDetail; unitId: string }) {
    const { t, number } = useI18n();
    const shots = detail.shots.filter((item) => item.unitId === unitId);
    const readyVideos = shots.filter((shot) => detail.shotArtifacts.some((item) => item.shotId === shot.id && item.type === "video" && item.selected && item.status === "ready"));
    const stale = detail.shotArtifacts.filter((item) => item.unitId === unitId && item.status === "stale").length;
    return <section className="mx-auto max-w-5xl"><StageHeading eyebrow={t("workflowOverview.deliveryEyebrow")} title={t("workflowOverview.deliveryTitle")} description={t("workflowOverview.deliveryDescription")} /><div className="mt-6 grid gap-4 sm:grid-cols-3"><MetricCard icon={<Film className="size-5" />} label={t("workflowOverview.videosReady")} value={`${number(readyVideos.length)} / ${number(shots.length)}`} /><MetricCard icon={<Clock3 className="size-5" />} label={t("workflowOverview.duration")} value={formatDuration(shots.reduce((total, item) => total + item.durationMs, 0))} /><MetricCard icon={<Layers3 className="size-5" />} label={t("workflowOverview.stale")} value={number(stale)} /></div><div className="mt-5 border-y border-border/70 py-5"><div className="flex items-start gap-3"><PackageCheck className="mt-0.5 size-5 text-[var(--workspace-accent)]" /><div><h3 className="text-sm font-semibold">{t("workflowOverview.planned")}</h3><p className="mt-1 text-xs leading-5 text-foreground/48">{t("workflowOverview.contents")}</p></div></div><Button className="mt-5" disabled>{t("workflowOverview.unavailable")}</Button></div></section>;
}
