import { ArrowRight, BookOpenText, CheckCircle2, CircleAlert, Clapperboard, Clock3, Film, PackageCheck, PlaySquare, UsersRound } from "lucide-react";
import { Link } from "react-router";

import { useI18n } from "@/i18n/use-i18n";

import { WorkspaceState } from "@/components/layout/workspace-state";
import type { ProjectStageCell, ProjectWorkbenchAction } from "@/lib/project-workbench";
import type { ProjectOverview, ProjectOverviewMetrics } from "@/services/api/projects";

import { type ProjectDetailViewProps } from "./shared";

export default function ProjectOverviewView({ detail, overview }: ProjectDetailViewProps & { overview: ProjectOverview }) {
    const { t, number, date } = useI18n();
    const formatCompactCount = (value: number) => number(value, value >= 10_000 ? { notation: "compact", maximumFractionDigits: 1 } : undefined);
    const { project } = detail;
    const metrics = overview.metrics;
    const completedUnits = metrics.completedUnitCount;
    const attentionCount = metrics.pendingCandidateCount + metrics.staleArtifactCount;
    const completion = metrics.unitCount ? Math.round((completedUnits / metrics.unitCount) * 100) : 0;
    const firstUnitId = detail.units.slice().sort((left, right) => left.position - right.position)[0]?.id || overview.units[0]?.unit.id;
    const workflowHref = (targetStage: string) => firstUnitId ? `/projects/${project.id}/workflow/${firstUnitId}/${targetStage}` : `/projects/${project.id}/chapters`;
    const stage = overviewStage(metrics, t);
    const actions = overviewActions(project.id, metrics, t, number, firstUnitId).slice(0, 3);
    const primaryAction = actions[0];
    const secondaryActions = actions.slice(1);
    const unitStages = overview.units.map((item) => ({
        unit: item.unit,
        content: stageCell(item.unit.wordCount > 0, item.unit.wordCount > 0 ? t("projectOverview.words", { count: formatCompactCount(item.unit.wordCount) }) : t("projectOverview.pendingContent")),
        assets: stageCell(item.candidateCount === 0 && item.shotCount > 0, item.candidateCount ? t("projectOverview.pendingCount", { count: number(item.candidateCount) }) : item.shotCount ? t("projectOverview.confirmed") : t("projectOverview.pendingSplit"), item.candidateCount > 0),
        storyboard: stageCell(item.shotCount > 0, item.shotCount ? t("projectOverview.shots", { count: number(item.shotCount) }) : t("projectOverview.pendingGeneration")),
        canvas: stageCell(item.canvasCount > 0, item.canvasCount ? t("projectOverview.canvases", { count: number(item.canvasCount) }) : t("projectOverview.unlinked")),
    }));
    const productionSteps = [
        { id: "story", icon: BookOpenText, label: t("projectOverview.story"), description: t("projectOverview.storyDescription"), metric: t("projectOverview.storyMetric", { chapters: number(metrics.unitCount), words: formatCompactCount(metrics.totalWordCount) }), href: `/projects/${project.id}/chapters`, complete: metrics.unitCount > 0 },
        { id: "assets", icon: UsersRound, label: t("projectOverview.assets"), description: t("projectOverview.assetsDescription"), metric: t("projectOverview.assetsMetric", { count: number(metrics.assetCount) }), href: `/projects/${project.id}/assets`, complete: metrics.assetCount > 0 },
        { id: "storyboard", icon: Clapperboard, label: t("projectOverview.storyboard"), description: t("projectOverview.storyboardDescription"), metric: t("projectOverview.storyboardMetric", { shots: number(metrics.shotCount), images: number(metrics.readyStoryboardCount) }), href: workflowHref("storyboard"), complete: metrics.shotCount > 0 },
        { id: "previz", icon: PlaySquare, label: t("projectOverview.previz"), description: t("projectOverview.previzDescription"), metric: t("projectOverview.shotRatio", { ready: number(metrics.readyPrevizCount), total: number(metrics.shotCount || 0) }), href: workflowHref("previz"), complete: metrics.shotCount > 0 && metrics.readyPrevizCount === metrics.shotCount },
        { id: "video", icon: Film, label: t("projectOverview.video"), description: t("projectOverview.videoDescription"), metric: t("projectOverview.shotRatio", { ready: number(metrics.readyVideoCount), total: number(metrics.shotCount || 0) }), href: workflowHref("video"), complete: metrics.shotCount > 0 && metrics.readyVideoCount === metrics.shotCount },
        { id: "delivery", icon: PackageCheck, label: t("projectOverview.delivery"), description: t("projectOverview.deliveryDescription"), metric: metrics.readyVideoCount && metrics.readyVideoCount === metrics.shotCount ? t("projectOverview.deliverable") : t("projectOverview.missingShots", { count: number(Math.max(0, metrics.shotCount - metrics.readyVideoCount)) }), href: workflowHref("delivery"), complete: metrics.shotCount > 0 && metrics.readyVideoCount === metrics.shotCount },
    ];
    const gaps = [
        metrics.unitCount === 0 ? t("projectOverview.noStory") : metrics.unitsWithoutText ? t("projectOverview.noText", { count: number(metrics.unitsWithoutText) }) : t("projectOverview.textReady"),
        metrics.pendingCandidateCount ? t("projectOverview.pendingAssets", { count: number(metrics.pendingCandidateCount) }) : metrics.assetCount ? t("projectOverview.assetsReady") : t("projectOverview.noAssets"),
        metrics.shotCount ? metrics.readyVideoCount === metrics.shotCount ? t("projectOverview.videosReady") : t("projectOverview.missingVideos", { count: number(metrics.shotCount - metrics.readyVideoCount) }) : t("projectOverview.noShots"),
    ];

    return (
        <div className="space-y-8">
            <section className="project-overview-focus">
                <div className="grid lg:grid-cols-[minmax(0,1fr)_308px]">
                    <div className="project-overview-primary">
                        <div className="project-overview-eyebrow">
                            <span>{t("projectOverview.currentTask")}</span>
                            <span className="project-overview-eyebrow-divider" aria-hidden>/</span>
                            <span className="project-overview-eyebrow-stage">{stage.label}</span>
                            {attentionCount ? <span className="project-overview-eyebrow-badge">{t("projectOverview.attentionCount", { count: number(attentionCount) })}</span> : null}
                        </div>
                        <h2 className="project-overview-title">{primaryAction.title}</h2>
                        <p className="project-overview-description">{primaryAction.description}</p>
                        <div className="project-overview-cta">
                            {/* 主按钮走 --btn-solid-* 配对色：原先是 bg-[--workspace-accent] + text-white，
                                而暗色下该 accent 是 #f5f5f5，等于白底白字。 */}
                            <Link to={primaryAction.href} className="project-overview-cta-primary">
                                <span className="truncate">{primaryAction.actionLabel}</span><ArrowRight className="size-4 shrink-0" />
                            </Link>
                            {secondaryActions[0] ? <Link to={secondaryActions[0].href} className="project-overview-cta-secondary">{t("projectOverview.next")}<ArrowRight className="size-3.5" /></Link> : null}
                        </div>
                    </div>

                    <aside className="project-overview-status" aria-label={t("projectOverview.progress")}>
                        <div className="project-overview-progress">
                            <div className="project-overview-progress-head">
                                <span className="project-overview-status-label">{t("projectOverview.chapterProgress")}</span>
                                <span className="project-overview-progress-percent">{number(completion / 100, { style: "percent" })}</span>
                            </div>
                            <div className="project-overview-progress-count">{number(completedUnits)}<span>/ {number(metrics.unitCount)}</span></div>
                            <div className="project-overview-progress-track" aria-label={t("projectOverview.completion", { percent: number(completion / 100, { style: "percent" }) })}><div style={{ width: `${completion}%` }} /></div>
                        </div>
                        <dl className="project-overview-facts">
                            <ProjectFact label={t("projectOverview.currentStage")} value={stage.label} />
                            <ProjectFact label={t("projectOverview.shotFact")} value={t("projectOverview.shotCount", { count: number(metrics.shotCount) })} />
                            <ProjectFact label={t("projectOverview.canvasFact")} value={t("projectOverview.canvases", { count: number(metrics.canvasCount) })} />
                            <ProjectFact label={t("projectOverview.attentionFact")} value={t("projectOverview.itemCount", { count: number(attentionCount) })} attention={attentionCount > 0} />
                        </dl>
                        {secondaryActions.length ? (
                            <div className="project-overview-next">
                                <span className="project-overview-status-label">{t("projectOverview.afterwards")}</span>
                                <div className="mt-2 space-y-0.5">{secondaryActions.map((action) => <SecondaryAction key={action.id} action={action} />)}</div>
                            </div>
                        ) : null}
                    </aside>
                </div>
            </section>

            <section className="project-standard-flow">
                <div className="project-standard-flow-head"><div><span>{t("projectOverview.flow")}</span><h2>{t("projectOverview.flowTitle")}</h2><p>{t("projectOverview.flowDescription")}</p></div><Link to={primaryAction.href}>{t("projectOverview.continueTask")}<ArrowRight /></Link></div>
                <div className="project-standard-flow-track">
                    {productionSteps.map((step, index) => { const Icon = step.icon; return <Link key={step.id} to={step.href} className={step.complete ? "is-complete" : ""}><span className="project-standard-flow-index">{step.complete ? <CheckCircle2 /> : number(index + 1)}</span><span className="project-standard-flow-icon"><Icon /></span><strong>{step.label}</strong><p>{step.description}</p><em>{step.metric}</em><ArrowRight className="project-standard-flow-arrow" /></Link>; })}
                </div>
                <div className="project-standard-flow-footer"><div><strong>{t("projectOverview.checks")}</strong>{gaps.map((gap, index) => <span key={gap}><i className={index === 2 && metrics.readyVideoCount !== metrics.shotCount ? "is-attention" : ""} />{gap}</span>)}</div><div><strong>{t("projectOverview.quickLinks")}</strong><Link to={`/projects/${project.id}/chapters`}>{t("projectOverview.organize")}</Link><Link to={`/projects/${project.id}/assets`}>{t("projectOverview.confirmAssets")}</Link><Link to={workflowHref("video")}>{t("projectOverview.continueShots")}</Link></div></div>
            </section>

            <section>
                <div className="project-pipeline-head">
                    <div className="min-w-0">
                        <h2 className="project-pipeline-title">{t("projectOverview.chapterProgress")}</h2>
                        <p className="project-pipeline-hint">{t("projectOverview.pipelineDescription")}</p>
                    </div>
                    <Link to={`/projects/${project.id}/chapters`} className="project-pipeline-more">{t("projectOverview.allChapters")}<ArrowRight className="size-3.5" /></Link>
                </div>

                {unitStages.length ? (
                    <div className="project-pipeline-surface">
                        {unitStages.map((item) => (
                            <Link key={item.unit.id} to={`/projects/${project.id}/chapters/${item.unit.id}`} className="project-pipeline-row group">
                                <span className="project-pipeline-chapter">
                                    <span className="project-pipeline-index">{number(item.unit.position + 1, { minimumIntegerDigits: 2, useGrouping: false })}</span>
                                    <span className="min-w-0"><span className="project-pipeline-chapter-title">{item.unit.title}</span><span className="project-pipeline-chapter-time">{t("projectOverview.updated", { time: item.unit.updatedAt ? date(item.unit.updatedAt, { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "-" })}</span></span>
                                </span>
                                <StagePipeline content={item.content} assets={item.assets} storyboard={item.storyboard} canvas={item.canvas} />
                                <ArrowRight className="project-pipeline-arrow size-4" />
                            </Link>
                        ))}
                    </div>
                ) : <div className="project-pipeline-surface p-2"><WorkspaceState icon="projects" compact title={t("projectOverview.noStory")} description={t("projectOverview.emptyDescription")} /></div>}
            </section>
        </div>
    );
}

function ProjectFact({ label, value, attention = false }: { label: string; value: string; attention?: boolean }) {
    return <div className="min-w-0"><dt>{label}</dt><dd className={attention ? "is-attention" : ""}>{value}</dd></div>;
}

function SecondaryAction({ action }: { action: ProjectWorkbenchAction }) {
    const Icon = action.tone === "danger" ? CircleAlert : action.tone === "attention" ? Clock3 : CheckCircle2;
    return <Link to={action.href} className="project-overview-next-item group"><Icon className={`size-3.5 shrink-0 ${action.tone === "danger" ? "text-foreground/80" : action.tone === "attention" ? "text-foreground/60" : "text-foreground/30"}`} /><span className="min-w-0 flex-1 truncate">{action.title}</span><ArrowRight className="size-3 shrink-0 text-foreground/25 transition group-hover:text-foreground/55" /></Link>;
}

function StagePipeline({ content, assets, storyboard, canvas }: { content: ProjectStageCell; assets: ProjectStageCell; storyboard: ProjectStageCell; canvas: ProjectStageCell }) {
    const { t } = useI18n();
    const stages = [{ label: t("projectOverview.contentStage"), cell: content }, { label: t("projectOverview.assetsStage"), cell: assets }, { label: t("projectOverview.storyboardStage"), cell: storyboard }, { label: t("projectOverview.canvasStage"), cell: canvas }];
    return (
        <span className="project-pipeline-stages">
            {stages.map(({ label, cell }) => <StageStep key={label} label={label} cell={cell} />)}
        </span>
    );
}

function StageStep({ label, cell }: { label: string; cell: ProjectStageCell }) {
    return (
        <span className={`project-pipeline-stage is-${cell.state}`}>
            <span className="project-pipeline-stage-label">{label}</span>
            <span className="project-pipeline-stage-track" />
            <span className="project-pipeline-stage-value">{cell.label}</span>
        </span>
    );
}

function overviewStage(metrics: ProjectOverviewMetrics, t: ReturnType<typeof useI18n>["t"]) {
    if (!metrics.unitCount) return { label: t("projectOverview.prepareStory") };
    if (metrics.pendingCandidateCount) return { label: t("projectOverview.assetConfirmation") };
    if (!metrics.shotCount || metrics.unitsWithoutShots) return { label: t("projectOverview.prepareStoryboard") };
    if (metrics.readyVideoCount < metrics.shotCount) return { label: t("projectOverview.shotProduction") };
    return { label: t("projectOverview.reviewDelivery") };
}

function overviewActions(projectId: string, metrics: ProjectOverviewMetrics, t: ReturnType<typeof useI18n>["t"], number: ReturnType<typeof useI18n>["number"], firstUnitId?: string): ProjectWorkbenchAction[] {
    const projectRoot = `/projects/${projectId}`;
    const workflowHref = firstUnitId ? `${projectRoot}/workflow/${firstUnitId}/video` : `${projectRoot}/chapters`;
    if (!metrics.unitCount) {
        return [{ id: "add-story", title: t("projectOverview.addStory"), description: t("projectOverview.addStoryDescription"), href: `${projectRoot}/chapters`, actionLabel: t("projectOverview.addChapter"), tone: "default" }];
    }
    const actions: ProjectWorkbenchAction[] = [];
    if (metrics.unitsWithoutText) {
        actions.push({ id: "complete-story", title: t("projectOverview.completeStory", { count: number(metrics.unitsWithoutText) }), description: t("projectOverview.completeStoryDescription"), href: `${projectRoot}/chapters`, actionLabel: t("projectOverview.organize"), tone: "attention" });
    }
    if (metrics.pendingCandidateCount) {
        actions.push({ id: "confirm-assets", title: t("projectOverview.confirmCandidates", { count: number(metrics.pendingCandidateCount) }), description: t("projectOverview.confirmCandidatesDescription"), href: `${projectRoot}/assets`, actionLabel: t("projectOverview.goConfirm"), tone: "attention" });
    }
    if (!metrics.shotCount || metrics.unitsWithoutShots) {
        actions.push({ id: "create-storyboards", title: t("projectOverview.createStoryboards", { count: number(metrics.unitsWithoutShots || metrics.unitCount) }), description: t("projectOverview.createStoryboardsDescription"), href: firstUnitId ? `${projectRoot}/chapters/${firstUnitId}` : `${projectRoot}/chapters`, actionLabel: t("projectOverview.createStoryboardAction"), tone: "default" });
    }
    if (metrics.shotCount && metrics.readyVideoCount < metrics.shotCount) {
        actions.push({ id: "continue-video", title: t("projectOverview.continueVideo", { count: number(metrics.shotCount - metrics.readyVideoCount) }), description: t("projectOverview.continueVideoDescription"), href: workflowHref, actionLabel: t("projectOverview.continueProduction"), tone: metrics.staleArtifactCount ? "attention" : "default" });
    }
    if (!metrics.canvasCount) {
        actions.push({ id: "create-canvas", title: t("projectOverview.createCanvas"), description: t("projectOverview.createCanvasDescription"), href: `${projectRoot}/canvases`, actionLabel: t("projectOverview.viewCanvas"), tone: "default" });
    }
    if (!actions.length) {
        actions.push({ id: "review-delivery", title: t("projectOverview.review"), description: t("projectOverview.reviewDescription"), href: workflowHref, actionLabel: t("projectOverview.reviewDelivery"), tone: "default" });
    }
    return actions;
}

function stageCell(complete: boolean, label: string, attention = false): ProjectStageCell {
    return { label, state: attention ? "attention" : complete ? "completed" : "idle" };
}
