import { formatRelativeTime } from "@/lib/display-format";
import { resolveAppLocale, type AppLocale } from "@/i18n/app-locale";
import { translateMessage, type MessageKey } from "@/i18n/messages";
import { useI18n } from "@/i18n/use-i18n";
import { Tag } from "antd";
import type { ReactNode } from "react";

import type { ProjectDetail } from "@/services/api/projects";

export type ProjectDetailViewProps = {
    detail: ProjectDetail;
    refreshProject: () => void;
    onCreateCanvas: () => void;
};

const categoryKeys: Record<string, MessageKey> = {
    character: "projectLabels.category.character",
    environment: "projectLabels.category.environment",
    wardrobe: "projectLabels.category.wardrobe",
    prop: "projectLabels.category.prop",
    weapon: "projectLabels.category.weapon",
    style: "projectLabels.category.style",
    other: "projectLabels.category.other",
};

const mediaKeys: Record<string, MessageKey> = {
    image: "projectLabels.media.image",
    video: "projectLabels.media.video",
    audio: "projectLabels.media.audio",
    text: "projectLabels.media.text",
    model: "projectLabels.media.model",
    entity: "projectLabels.media.entity",
};

const statusLabels: Record<string, MessageKey> = {
    active: "projectStatus.active",
    archived: "projectStatus.archived",
    draft: "projectStatus.draft",
    ready: "projectStatus.ready",
    completed: "projectStatus.completed",
    review: "projectStatus.review",
    confirmed: "projectStatus.confirmed",
    pending: "projectStatus.pending",
    pending_confirmation: "projectStatus.pending_confirmation",
    running: "projectStatus.active",
    failed: "projectStatus.failed",
    ignored: "projectStatus.ignored",
    skipped: "projectStatus.skipped",
    cancelled: "projectStatus.cancelled",
    succeeded: "projectStatus.completed",
    disabled: "projectStatus.disabled",
    idle: "projectStatus.idle",
    loading: "projectStatus.loading",
    queued: "projectStatus.queued",
    success: "projectStatus.completed",
    error: "projectStatus.error",
    deleted: "projectStatus.deleted",
    reserved: "projectStatus.reserved",
    settled: "projectStatus.settled",
    refunded: "projectStatus.refunded",
    uncertain: "projectStatus.uncertain",
};

const sourceTypeKeys: Record<string, MessageKey> = {
    blank: "projectLabels.source.blank",
    novel: "projectLabels.source.novel",
    text: "projectLabels.source.text",
};

type Translator = ReturnType<typeof useI18n>["t"];
const currentTranslator: Translator = (key, values) => translateMessage(resolveAppLocale(), key, values);

export function getCategoryLabels(t: Translator): Record<string, string> {
    return Object.fromEntries(Object.entries(categoryKeys).map(([value, key]) => [value, t(key)]));
}

export function categoryLabel(value: string, t: Translator = currentTranslator) {
    return t(Object.hasOwn(categoryKeys, value) ? categoryKeys[value] : "projectLabels.category.other");
}

export function statusLabel(value: string, t: ReturnType<typeof useI18n>["t"] = (key, values) => translateMessage(resolveAppLocale(), key, values)) {
    return t(Object.hasOwn(statusLabels, value) ? statusLabels[value] : "projectStatus.unknown");
}

export function mediaLabel(value: string, t: Translator = currentTranslator) {
    return t(Object.hasOwn(mediaKeys, value) ? mediaKeys[value] : "projectLabels.media.other");
}

export function sourceTypeLabel(value: string, t: Translator = currentTranslator) {
    return t(Object.hasOwn(sourceTypeKeys, value) ? sourceTypeKeys[value] : "projectLabels.source.other");
}

export function StatusPill({ status }: { status: string }) {
    const { t } = useI18n();
    const color = status === "completed" || status === "confirmed" || status === "succeeded" ? "success" : status === "failed" ? "error" : status === "running" || status === "active" ? "processing" : status === "review" || status === "pending_confirmation" ? "warning" : "default";
    return <Tag color={color} className="m-0 !rounded-full !px-2 !text-[var(--fs-label)]">{statusLabel(status, t)}</Tag>;
}

export function SectionTitle({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
    return (
        <div className="flex flex-col gap-2 border-b border-border/70 pb-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                {eyebrow ? <div className="mb-1 text-[var(--fs-tiny)] font-semibold text-foreground/40">{eyebrow}</div> : null}
                <h2 className="text-lg font-semibold tracking-normal">{title}</h2>
                {description ? <p className="mt-1 text-sm leading-5 text-foreground/55">{description}</p> : null}
            </div>
            {action ? <div className="shrink-0">{action}</div> : null}
        </div>
    );
}

export function formatTime(value?: string, locale: AppLocale = "zh-CN") {
    if (!value) return "-";
    return formatRelativeTime(value, locale);
}

export function textValue(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}
