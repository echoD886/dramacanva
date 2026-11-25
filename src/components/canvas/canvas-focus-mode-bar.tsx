import { Tooltip } from "@/components/ui/base/tooltip";
import { useI18n } from "@/i18n/use-i18n";
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { History, PanelBottom, X, ZoomIn, ZoomOut } from "lucide-react";


import { aceternityMotion } from "@/lib/aceternity-motion";
import { canvasThemes } from "@/lib/canvas-theme";
import { useActiveTheme } from "@/stores/canvas/use-canvas-theme-store";

type CanvasFocusModeBarProps = {
    versionsOpen: boolean;
    onToggleVersions?: () => void;
    syncStatus?: ReactNode;
    dockRevealed: boolean;
    zoomPercent: number;
    onToggleDock: () => void;
    onExit: () => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onFit: () => void;
};

export function CanvasFocusModeBar({ versionsOpen, onToggleVersions, syncStatus, dockRevealed, zoomPercent, onToggleDock, onExit, onZoomIn, onZoomOut, onFit }: CanvasFocusModeBarProps) {
    const theme = canvasThemes[useActiveTheme()];
    const reducedMotion = useReducedMotion();
    const { t } = useI18n();

    return (
        <motion.div
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reducedMotion ? { duration: 0 } : aceternityMotion.spring.panel}
            className="pointer-events-auto absolute left-1/2 top-2 z-[var(--z-toolbar)] -translate-x-1/2"
            role="toolbar"
            aria-label={t("canvasExtra.focusBar.aria")}
        >
            <div className="flex items-center gap-0.5 rounded-full p-1 backdrop-blur-2xl" style={{ background: theme.spatial.elevated, color: theme.node.text, boxShadow: "var(--workspace-overlay-shadow)" }}>
                <Tooltip title={t("canvasExtra.focusBar.exitShortcut")}>
                    <button
                        type="button"
                        onClick={onExit}
                        className="grid size-8 place-items-center rounded-full transition hover:bg-black/5 dark:hover:bg-white/10"
                        style={{ color: theme.node.text }}
                        aria-label={t("canvasExtra.focusBar.exit")}
                    >
                        <X className="size-4" />
                    </button>
                </Tooltip>
                {syncStatus}
                {onToggleVersions ? <Tooltip title={t("canvasTopBar.versionsTooltip")}>
                    <button type="button" onClick={onToggleVersions} className="grid size-8 place-items-center rounded-full transition hover:bg-black/5 dark:hover:bg-white/10" style={{ color: theme.node.text, background: versionsOpen ? theme.toolbar.itemHover : undefined }} aria-label={t("canvasTopBar.versionsAria")} aria-pressed={versionsOpen}>
                        <History className="size-4" />
                    </button>
                </Tooltip> : null}
                <span className="mx-0.5 h-4 w-px" style={{ background: theme.toolbar.border }} />
                <Tooltip title={dockRevealed ? t("canvasExtra.focusBar.hideTools") : t("canvasExtra.focusBar.tools")}>
                    <button
                        type="button"
                        onClick={onToggleDock}
                        className="grid size-8 place-items-center rounded-full transition hover:bg-black/5 dark:hover:bg-white/10"
                        style={{ color: theme.node.text, background: dockRevealed ? theme.toolbar.itemHover : undefined }}
                        aria-label={t("canvasExtra.focusBar.tools")}
                        aria-pressed={dockRevealed}
                    >
                        <PanelBottom className="size-4" />
                    </button>
                </Tooltip>
                <Tooltip title={t("canvasExtra.focusBar.zoomOut")}>
                    <button type="button" onClick={onZoomOut} className="grid size-8 place-items-center rounded-full transition hover:bg-black/5 dark:hover:bg-white/10" style={{ color: theme.node.text }} aria-label={t("canvasExtra.focusBar.zoomOut")}>
                        <ZoomOut className="size-4" />
                    </button>
                </Tooltip>
                <button
                    type="button"
                    onClick={onFit}
                    className="grid h-8 min-w-14 place-items-center rounded-full px-2 text-xs font-medium tabular-nums transition hover:bg-black/5 dark:hover:bg-white/10"
                    style={{ color: theme.node.text }}
                    title={t("canvasExtra.focusBar.fit")}
                >
                    {Math.round(zoomPercent * 100)}%
                </button>
                <Tooltip title={t("canvasExtra.focusBar.zoomIn")}>
                    <button type="button" onClick={onZoomIn} className="grid size-8 place-items-center rounded-full transition hover:bg-black/5 dark:hover:bg-white/10" style={{ color: theme.node.text }} aria-label={t("canvasExtra.focusBar.zoomIn")}>
                        <ZoomIn className="size-4" />
                    </button>
                </Tooltip>
            </div>
        </motion.div>
    );
}
