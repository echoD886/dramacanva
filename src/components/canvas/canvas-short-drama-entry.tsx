import { Fragment, useEffect, useId, useState, type CSSProperties, type ReactNode } from "react";
import { Popover } from "antd";
import { AlignLeft, ArrowUpRight, Check, ChevronUp, Clapperboard, FolderKanban, Images, Palette, Pencil, Plus, Sparkles, Type, Upload, X } from "lucide-react";

import { canvasThemes } from "@/lib/canvas-theme";
import { useI18n } from "@/i18n/use-i18n";
import { CanvasCreateMenu, type CanvasCreateCommand } from "@/components/canvas/canvas-create-menu";
import type { CanvasShortDramaProgress, CanvasShortDramaStepId } from "@/lib/canvas/canvas-short-drama";
import { useActiveTheme } from "@/stores/canvas/use-canvas-theme-store";
import type { CanvasNodeData } from "@/types/canvas";
import "./canvas-short-drama-entry.css";

export function CanvasLinkedProjectEmptyState({ projectName, hasChapter, onAddFirstChapter, onOpenAssets, onAddText }: { projectName: string; hasChapter: boolean; onAddFirstChapter: () => void; onOpenAssets: () => void; onAddText: () => void }) {
    const { t } = useI18n();
    const theme = canvasThemes[useActiveTheme()];
    return (
        <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center px-4 pb-16 pt-20">
            <div className="pointer-events-auto w-full max-w-[440px] rounded-lg border p-3 shadow-sm backdrop-blur" data-canvas-no-zoom style={{ background: theme.toolbar.panel, borderColor: theme.toolbar.border, color: theme.node.text }}>
                <div className="flex items-center gap-2.5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-md" style={{ background: theme.toolbar.itemHover, color: theme.node.muted }}>
                        <FolderKanban className="size-4" />
                    </span>
                    <div className="min-w-0">
                        <h2 className="truncate text-sm font-semibold">{projectName}</h2>
                        <p className="mt-0.5 text-[var(--fs-label)]" style={{ color: theme.node.muted }}>
                            {t("shortDrama.projectCanvasEmpty")}
                        </p>
                    </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-1.5">
                    <button
                        type="button"
                        disabled={!hasChapter}
                        onClick={onAddFirstChapter}
                        className="flex h-9 min-w-0 items-center justify-center gap-1 rounded-md border px-2 text-[var(--fs-label)] font-medium disabled:opacity-35"
                        style={{ borderColor: theme.node.stroke, background: theme.node.fill }}
                    >
                        <Plus className="size-3.5 shrink-0" />
                        <span className="truncate">{t("shortDrama.addFirstChapter")}</span>
                    </button>
                    <button
                        type="button"
                        onClick={onOpenAssets}
                        className="flex h-9 min-w-0 items-center justify-center gap-1 rounded-md border px-2 text-[var(--fs-label)] font-medium"
                        style={{ borderColor: theme.node.stroke, background: theme.node.fill }}
                    >
                        <Images className="size-3.5 shrink-0" />
                        <span className="truncate">{t("shortDrama.projectAssets")}</span>
                    </button>
                    <button
                        type="button"
                        data-canvas-tour="new-text"
                        data-canvas-tour-quick="text"
                        onClick={onAddText}
                        className="flex h-9 min-w-0 items-center justify-center gap-1 rounded-md border px-2 text-[var(--fs-label)] font-medium"
                        style={{ borderColor: theme.node.stroke, background: theme.node.fill }}
                    >
                        <Type className="size-3.5 shrink-0" />
                        <span className="truncate">{t("shortDrama.newText")}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

export function CanvasShortDramaEmptyState({
    onCreatePipeline,
    onOpenAgent,
    onStartFreeform,
    onUpload,
    onAddText,
    onAddScript,
    agentOpen = false,
}: {
    onCreatePipeline: () => void;
    onOpenAgent: () => void;
    onStartFreeform: () => void;
    onUpload: () => void;
    onAddText: () => void;
    onAddScript: () => void;
    agentOpen?: boolean;
}) {
    const { t } = useI18n();
    const theme = canvasThemes[useActiveTheme()];
    const entryStyle = {
        "--canvas-entry-text": theme.node.text,
        "--canvas-entry-muted": theme.node.muted,
        "--canvas-entry-accent": theme.accent.primary,
    } as CSSProperties;
    return (
        <div className="canvas-entry-stage" style={entryStyle} data-agent-open={agentOpen}>
            <div className="canvas-entry-shell" data-canvas-tour="empty-state" data-canvas-no-zoom data-canvas-wheel-scroll>
                <header className="canvas-entry-header">
                    <div className="canvas-entry-heading-copy">
                        <h2>
                            <span>{t("canvasAgentEntry.inspiration")}</span>
                            <strong>{t("canvasAgentEntry.startFilm")}</strong>
                        </h2>
                        <p>{t("canvasAgentEntry.entryHint")}</p>
                    </div>
                    <CanvasEntryFilmMark />
                </header>
                <div className="canvas-entry-actions">
                    <button type="button" className="canvas-entry-agent" onClick={onOpenAgent}>
                        <span className="canvas-entry-agent-label">{t("shortDrama.letAgent")}</span>
                        <span className="canvas-entry-agent-arrow">
                            <ArrowUpRight aria-hidden="true" />
                        </span>
                    </button>
                    <div className="canvas-entry-secondary-actions">
                        <button type="button" onClick={onCreatePipeline}>
                            {t("shortDrama.createYourself")}
                            <ArrowUpRight aria-hidden="true" />
                        </button>
                        <button type="button" onClick={onStartFreeform}>
                            {t("shortDrama.freeCanvas")}
                            <ArrowUpRight aria-hidden="true" />
                        </button>
                    </div>
                </div>
                <div className="canvas-entry-footer">
                    <div className="canvas-entry-quick-actions">
                        <button type="button" onClick={onUpload}>
                            <Upload aria-hidden="true" />
                            {t("shortDrama.importAssets")}
                        </button>
                        <button type="button" data-canvas-tour="new-text" data-canvas-tour-quick="text" onClick={onAddText}>
                            <Type aria-hidden="true" />
                            {t("shortDrama.newText")}
                        </button>
                        <button type="button" onClick={onAddScript}>
                            <Clapperboard aria-hidden="true" />
                            {t("shortDrama.newBlankStoryboard")}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function CanvasEntryFilmMark() {
    const id = useId();
    return (
        <svg className="canvas-entry-film-mark" viewBox="0 0 112 112" fill="none" aria-hidden="true" focusable="false">
            <defs>
                <linearGradient id={`${id}-front`} x1="27" y1="18" x2="76" y2="91" gradientUnits="userSpaceOnUse">
                    <stop stopColor="var(--canvas-entry-metal-highlight)" />
                    <stop offset="0.42" stopColor="var(--canvas-entry-metal-mid)" />
                    <stop offset="0.66" stopColor="var(--canvas-entry-metal-highlight)" />
                    <stop offset="1" stopColor="var(--canvas-entry-metal-shadow)" />
                </linearGradient>
                <linearGradient id={`${id}-edge`} x1="36" y1="21" x2="86" y2="83" gradientUnits="userSpaceOnUse">
                    <stop stopColor="var(--canvas-entry-metal-mid)" />
                    <stop offset="1" stopColor="var(--canvas-entry-metal-shadow)" />
                </linearGradient>
            </defs>
            <path d="M35 17 92 50Q98 54 92 58L35 91 26 86 82 54 26 22Z" fill={`url(#${id}-edge)`} />
            <path d="M26 22 82 54 26 86V22ZM36 39V69L62 54 36 39Z" fill={`url(#${id}-front)`} fillRule="evenodd" />
            <path d="M26 22 82 54 26 86V22Z" stroke="var(--canvas-entry-metal-highlight)" strokeOpacity="0.45" strokeWidth="0.6" strokeLinejoin="round" />
            <path d="M36 39V69L62 54" stroke="var(--canvas-entry-metal-shadow)" strokeWidth="1" strokeLinejoin="round" />
            <path d="m35 17 57 33" stroke="var(--canvas-entry-metal-highlight)" strokeOpacity="0.5" strokeWidth="0.6" />
        </svg>
    );
}

export type CanvasQuickCreateAction = { id: string; label: string; icon: ReactNode; onClick: () => void };

export function CanvasFreeformEmptyState({
    commands,
    quickActions = [],
    onOpenAgent,
    agentOpen = false,
    tourCreateOpen = false,
    onTourCreateOpen,
}: {
    commands: CanvasCreateCommand[];
    quickActions?: CanvasQuickCreateAction[];
    onOpenAgent?: () => void;
    agentOpen?: boolean;
    tourCreateOpen?: boolean;
    onTourCreateOpen?: () => void;
}) {
    const { t } = useI18n();
    const theme = canvasThemes[useActiveTheme()];
    const [createOpen, setCreateOpen] = useState(false);
    useEffect(() => setCreateOpen(tourCreateOpen), [tourCreateOpen]);
    const createCommands = commands.map((command) => ({
        ...command,
        onClick: () => {
            setCreateOpen(false);
            command.onClick();
        },
    }));
    return (
        <div className="canvas-entry-stage" data-agent-open={agentOpen} style={{ "--canvas-entry-text": theme.node.text, "--canvas-entry-muted": theme.node.muted, "--canvas-entry-accent": theme.accent.primary } as CSSProperties}>
            <div className="canvas-entry-shell" data-canvas-tour="empty-state" data-canvas-no-zoom data-canvas-wheel-scroll>
                <header className="canvas-entry-header">
                    <div className="canvas-entry-heading-copy">
                        <h2>
                            <span>{t("canvasAgentEntry.inspiration")}</span>
                            <strong>{t("canvasAgentEntry.startFilm")}</strong>
                        </h2>
                        <p>{t("shortDrama.freeCanvasHint")}</p>
                    </div>
                    <CanvasEntryFilmMark />
                </header>
                <div className="canvas-entry-actions">
                    {onOpenAgent ? (
                        <button type="button" className="canvas-entry-agent" data-canvas-tour="agent-entry" onClick={onOpenAgent}>
                            <span className="canvas-entry-agent-label">{t("shortDrama.letAgent")}</span>
                            <span className="canvas-entry-agent-arrow">
                                <ArrowUpRight aria-hidden="true" />
                            </span>
                        </button>
                    ) : null}
                    <Popover
                        arrow={false}
                        open={createOpen}
                        onOpenChange={(open) => {
                            setCreateOpen(open);
                            if (open) onTourCreateOpen?.();
                        }}
                        placement="top"
                        trigger="click"
                        content={
                            <div className="max-h-[calc(100dvh-48px)] w-[420px] max-w-[calc(100vw-48px)] overflow-y-auto p-1" onWheel={(event) => event.stopPropagation()}>
                                <CanvasCreateMenu commands={createCommands} />
                            </div>
                        }
                    >
                        <button type="button" aria-label={t("shortDrama.addFirstItem")} data-canvas-tour="add-first" className="canvas-entry-agent">
                            <Plus className="size-4" />
                            {t("shortDrama.addFirstItem")}
                        </button>
                    </Popover>
                </div>
                <p className="mt-4 text-[var(--fs-label)]" style={{ color: theme.node.muted }}>
                    {t("shortDrama.plusHint")}
                </p>
                {/* 常用节点一键创建：省掉“点 + → 再选类型”两步，直接进入输入。 */}
                {quickActions.length ? (
                    <div className="canvas-entry-footer">
                        <div className="canvas-entry-quick-actions" data-canvas-quick-create>
                            {quickActions.map((action) => (
                                <button key={action.id} type="button" data-canvas-tour-quick={action.id} data-canvas-tour={action.id === "text" ? "new-text" : undefined} onClick={action.onClick}>
                                    {action.icon}
                                    {action.label}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

export function CanvasShortDramaGuide({ progress, collapsed, onToggle, onSkip, onStepClick }: { progress: CanvasShortDramaProgress; collapsed: boolean; onToggle: () => void; onSkip: () => void; onStepClick: (stepId: CanvasShortDramaStepId) => void }) {
    const { t } = useI18n();
    const theme = canvasThemes[useActiveTheme()];
    if (!progress.active || collapsed) return null;
    return (
        <div
            data-canvas-no-zoom
            className="absolute left-1/2 top-[var(--canvas-topbar-offset)] z-[var(--z-toolbar)] flex max-w-[calc(100%_-_24px)] -translate-x-1/2 items-center gap-1 rounded-lg border p-1 shadow-sm backdrop-blur"
            style={{ background: theme.toolbar.panel, borderColor: theme.toolbar.border, color: theme.node.text }}
        >
            <div className="hide-scrollbar flex min-w-0 flex-1 items-center overflow-x-auto">
                <div className="flex shrink-0 items-center px-[var(--space-1)]">
                    {progress.steps.map((step, index) => (
                        <Fragment key={step.id}>
                            {index ? (
                                <span
                                    aria-hidden
                                    className="shrink-0 rounded-full transition-colors duration-150 motion-reduce:transition-none"
                                    style={{ width: "var(--flow-step-track-width)", height: "var(--flow-step-track-height)", background: step.status === "pending" ? theme.node.stroke : theme.accent.primary }}
                                />
                            ) : null}
                            <button
                                type="button"
                                aria-current={step.status === "current" ? "step" : undefined}
                                className="flex h-8 shrink-0 items-center gap-[var(--flow-step-gap)] rounded-md px-[var(--space-1-half)] outline-none transition-colors motion-reduce:transition-none hover:bg-black/5 focus-visible:ring-1 focus-visible:ring-inset dark:hover:bg-white/10"
                                style={{ "--tw-ring-color": theme.accent.primary } as CSSProperties}
                                onClick={() => onStepClick(step.id)}
                            >
                                <span
                                    className="grid shrink-0 place-items-center rounded-full font-semibold transition-all duration-150 motion-reduce:transition-none"
                                    style={{
                                        width: step.status === "current" ? "var(--flow-step-node-current)" : "var(--flow-step-node)",
                                        height: step.status === "current" ? "var(--flow-step-node-current)" : "var(--flow-step-node)",
                                        background: step.status === "pending" ? "transparent" : theme.accent.primary,
                                        border: step.status === "pending" ? "var(--stroke-2) solid var(--cn-stroke)" : "none",
                                        color: step.status === "pending" ? theme.node.muted : theme.accent.onPrimary,
                                        boxShadow: step.status === "current" ? "var(--flow-step-current-glow)" : undefined,
                                        fontSize: step.status === "current" ? "var(--fs-body)" : "var(--fs-caption)",
                                    }}
                                >
                                    {step.status === "completed" ? <Check className="size-3.5" /> : index + 1}
                                </span>
                                <span
                                    className="whitespace-nowrap text-[var(--fs-caption)] font-semibold transition-colors duration-150 motion-reduce:transition-none"
                                    style={{ color: step.status === "current" ? theme.accent.primary : step.status === "completed" ? theme.node.text : theme.node.muted }}
                                >
                                    {step.label}
                                </span>
                            </button>
                        </Fragment>
                    ))}
                </div>
            </div>
            <span className="mx-1 h-4 w-px shrink-0" style={{ background: theme.toolbar.border }} />
            {!progress.completed ? (
                <button
                    type="button"
                    className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md px-2 text-[var(--fs-label)] outline-none transition hover:bg-black/5 focus-visible:ring-2 dark:hover:bg-white/10"
                    style={{ color: theme.node.muted, "--tw-ring-color": theme.accent.primary } as CSSProperties}
                    onClick={onSkip}
                >
                    <X className="size-3" />
                    {t("shortDrama.skipGuide")}
                </button>
            ) : null}
            <button
                type="button"
                className="grid size-8 shrink-0 place-items-center rounded-md outline-none transition hover:bg-black/5 focus-visible:ring-2 dark:hover:bg-white/10"
                style={{ color: theme.node.muted, "--tw-ring-color": theme.accent.primary } as CSSProperties}
                onClick={onToggle}
                aria-label={t("shortDrama.collapseFlow")}
            >
                <ChevronUp className="size-3.5" />
            </button>
        </div>
    );
}

export function CanvasStylePlaceholderNodeContent({ onChoose }: { onChoose: () => void }) {
    const { t } = useI18n();
    const theme = canvasThemes[useActiveTheme()];
    return (
        <div className="flex h-full w-full flex-col items-center justify-center px-6 text-center" style={{ color: theme.node.text }}>
            <span className="grid size-10 place-items-center rounded-md" style={{ background: `${theme.accent.primary}16`, color: theme.accent.primary }}>
                <Palette className="size-5" />
            </span>
            <div className="mt-3 text-sm font-semibold">{t("shortDrama.projectStyle")}</div>
            <div className="mt-1 text-xs" style={{ color: theme.node.muted }}>
                {t("shortDrama.pendingChoice")}
            </div>
            <button
                type="button"
                className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium outline-none transition hover:brightness-105 focus-visible:ring-2"
                style={{ background: theme.toolbar.panel, borderColor: theme.node.stroke, "--tw-ring-color": theme.accent.primary } as CSSProperties}
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                    event.stopPropagation();
                    onChoose();
                }}
            >
                <Sparkles className="size-3.5" />
                {t("shortDrama.chooseStyle")}
            </button>
        </div>
    );
}

export function CanvasStoryInputNodeContent({ node, onEdit }: { node: CanvasNodeData; onEdit: () => void }) {
    const { t } = useI18n();
    const theme = canvasThemes[useActiveTheme()];
    const content = (node.metadata?.content || "").replace(/\s+/g, " ").trim();
    return (
        <div className="flex h-full w-full flex-col overflow-hidden p-4" style={{ color: theme.node.text }}>
            <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                    <span className="grid size-8 shrink-0 place-items-center rounded-md" style={{ background: theme.toolbar.itemHover, color: theme.node.muted }}>
                        <AlignLeft className="size-4" />
                    </span>
                    <span className="truncate text-sm font-semibold">{t("shortDrama.storyOutline")}</span>
                </div>
            </div>
            <div className="mt-4 min-h-0 flex-1 overflow-hidden border-t pt-3 text-xs leading-6" style={{ borderColor: theme.node.stroke, color: content ? theme.node.muted : theme.node.placeholder }}>
                {content || t("shortDrama.storyPlaceholder")}
            </div>
            <button
                type="button"
                className="mt-3 inline-flex h-8 w-fit items-center gap-1.5 rounded-md px-2 text-xs font-medium outline-none transition hover:bg-black/5 focus-visible:ring-2 dark:hover:bg-white/10"
                style={{ color: theme.node.text, "--tw-ring-color": theme.accent.primary } as CSSProperties}
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                    event.stopPropagation();
                    onEdit();
                }}
            >
                <Pencil className="size-3.5" />
                {t("shortDrama.editStory")}
            </button>
        </div>
    );
}
