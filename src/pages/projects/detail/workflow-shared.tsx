import { resolveAppLocale } from "@/i18n/app-locale";
import { translateMessage } from "@/i18n/messages";
import { useI18n } from "@/i18n/use-i18n";
import { getCategoryLabels } from "./shared";
import type { ReactNode } from "react";
import { Tag } from "antd";

import type { ProjectDetail, ProjectShot, ShotArtifact, ShotRevision } from "@/services/api/projects";
import type { TaskStatus } from "@/services/api/task-center";

export type ShortDramaWorkflowStage = "story" | "assets" | "storyboard" | "previz" | "video" | "delivery";

export const workflowStages: Array<{ key: ShortDramaWorkflowStage; labelKey: string; shortLabelKey: string }> = [
    { key: "story", labelKey: "workflowStatus.stageStory", shortLabelKey: "workflowStatus.stageStoryShort" },
    { key: "assets", labelKey: "workflowStatus.stageAssets", shortLabelKey: "workflowStatus.stageAssetsShort" },
    { key: "storyboard", labelKey: "workflowStatus.stageStoryboard", shortLabelKey: "workflowStatus.stageStoryboardShort" },
    { key: "previz", labelKey: "workflowStatus.stagePreviz", shortLabelKey: "workflowStatus.stagePrevizShort" },
    { key: "video", labelKey: "workflowStatus.stageVideo", shortLabelKey: "workflowStatus.stageVideoShort" },
    { key: "delivery", labelKey: "workflowStatus.stageDelivery", shortLabelKey: "workflowStatus.stageDeliveryShort" },
];

export function StageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
    return <div><div className="text-[var(--fs-micro)] font-medium uppercase tracking-[.18em] text-[var(--workspace-accent)]">{eyebrow}</div><h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-foreground/50">{description}</p></div>;
}

export function MetricCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
    return <div className="rounded-xl border border-border/70 bg-surface p-5"><div className="text-foreground/35">{icon}</div><div className="mt-4 text-2xl font-semibold">{value}</div><div className="mt-1 text-xs text-foreground/45">{label}</div></div>;
}

export function ArtifactStatus({ artifact, taskStatus, compact = false }: { artifact?: ShotArtifact; taskStatus?: TaskStatus; compact?: boolean }) {
    const { t } = useI18n();
    const className = `artifact-status-tag ${compact ? "!m-0" : ""}`;
    if (taskStatus === "queued" || taskStatus === "running" || (taskStatus === "succeeded" && !artifact)) {
        return <Tag className={`${className} is-running`} color="processing">{t("workflowStatus.running")}</Tag>;
    }
    if (taskStatus === "failed") return <Tag className={`${className} is-failed`} color="error">{t("workflowStatus.failed")}</Tag>;
    if (!artifact) return <Tag className={`${className} is-pending`}>{t("workflowStatus.pending")}</Tag>;
    const color = artifact.status === "ready" ? "success" : artifact.status === "failed" ? "error" : artifact.status === "stale" ? "warning" : "processing";
    const label = artifact.status === "ready" ? t("workflowStatus.ready") : artifact.status === "failed" ? t("workflowStatus.failed") : artifact.status === "stale" ? t("workflowStatus.stale") : t("workflowStatus.running");
    const tone = artifact.status === "ready" ? "ready" : artifact.status === "failed" ? "failed" : artifact.status === "stale" ? "stale" : "running";
    return <Tag className={`${className} is-${tone}`} color={color}>{label}</Tag>;
}

export function currentRevision(detail: ProjectDetail, shot?: ProjectShot): ShotRevision | undefined {
    if (!shot) return undefined;
    const revisions = detail.shotRevisions || [];
    return revisions.find((item) => item.id === shot.currentRevisionId)
        || revisions.filter((item) => item.shotId === shot.id).slice().sort((left, right) => right.version - left.version)[0];
}

export function currentArtifact(detail: ProjectDetail, shotId: string, type: string) {
    const artifacts = (detail.shotArtifacts || []).filter((item) => item.shotId === shotId && item.type === type).slice().sort((left, right) => right.version - left.version);
    return artifacts.find((item) => item.selected) || artifacts[0];
}

export function artifactTypeForStage(stage: ShortDramaWorkflowStage) {
    if (stage === "video") return "video";
    if (stage === "previz") return "action_board";
    return "storyboard";
}

type Translator = ReturnType<typeof useI18n>["t"];
const currentTranslator: Translator = (key, values) => translateMessage(resolveAppLocale(), key, values);

export function assetCategoryLabel(category: string, t: Translator = currentTranslator) {
    if (category === "accessory") return t("workflowStatus.accessory");
    const labels = getCategoryLabels(t);
    return Object.hasOwn(labels, category) ? labels[category] : category || t("projectLabels.category.other");
}

export function formatDuration(durationMs: number) {
    if (durationMs < 60_000) return `${Math.round(durationMs / 100) / 10}s`;
    const minutes = Math.floor(durationMs / 60_000);
    const seconds = Math.round((durationMs % 60_000) / 1000);
    return `${minutes}m ${seconds}s`;
}

