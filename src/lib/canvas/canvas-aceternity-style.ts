import type { CSSProperties } from "react";

import type { CanvasTheme } from "@/lib/canvas-theme";

export function canvasDockStyle(theme: CanvasTheme, color: string = theme.toolbar.item): CSSProperties {
    return {
        // 画布主题可以和站点主题不同（例如站点深色、画布浅色）。Dock 表面必须跟随画布主题，
        // 否则会出现“深色底 + 浅色主题文字”导致工具栏文字不可见。
        "--dock-surface": theme.spatial.surface,
        "--dock-border": theme.toolbar.border,
        background: "var(--dock-surface)",
        borderColor: "var(--dock-border)",
        color,
        boxShadow: "var(--elevation-overlay)",
        "--dock-command-bg": theme.spatial.surface,
        "--dock-command-hover": theme.toolbar.itemHover,
        "--dock-command-active": theme.toolbar.activeBg,
        "--dock-command-active-text": theme.toolbar.activeText,
        "--dock-command-danger": theme.accent.danger,
        "--dock-tooltip-bg": theme.spatial.elevated,
        "--dock-tooltip-border": theme.toolbar.border,
        "--dock-switch-track": "#000000",
        "--dock-switch-thumb": "#ffffff",
        "--dock-switch-thumb-text": "#000000",
    } as CSSProperties;
}
