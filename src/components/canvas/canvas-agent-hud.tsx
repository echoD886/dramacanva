import { useI18n } from "@/i18n/use-i18n";
import { agentUpgradeText } from "@/i18n/agent-upgrade-copy";
import { persistCanvasAgentCameraFollow, useCanvasAgentCameraFollow } from "@/lib/canvas/canvas-agent-camera-follow";
import type { CanvasTheme } from "@/lib/canvas-theme";
export function CanvasAgentHUD({ nodes, edges, theme }: { nodes: number; edges: number; theme: CanvasTheme }) {
    const { locale } = useI18n();
    const follow = useCanvasAgentCameraFollow();
    return (
        <div data-canvas-no-zoom className="absolute left-4 top-16 z-[var(--z-toolbar)] flex items-center gap-3 rounded-lg border px-3 py-2 text-xs" style={{ background: theme.toolbar.panel, borderColor: theme.toolbar.border, color: theme.node.text }}>
            <span>
                {nodes} {agentUpgradeText(locale, "nodes")} · {edges} {agentUpgradeText(locale, "edges")}
            </span>
            <button type="button" aria-pressed={follow} className="rounded px-2 py-1 focus-visible:outline" style={{ background: follow ? theme.toolbar.itemHover : "transparent" }} onClick={() => persistCanvasAgentCameraFollow(!follow)}>
                {agentUpgradeText(locale, "follow")}
                {follow ? " ✓" : ""}
            </button>
        </div>
    );
}
