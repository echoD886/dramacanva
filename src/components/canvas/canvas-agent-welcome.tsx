import { ArrowUpRight, Clapperboard, Layers3, Sparkles } from "lucide-react";
import type { CSSProperties } from "react";
import { useI18n } from "@/i18n/use-i18n";
import type { CanvasTheme } from "@/lib/canvas-theme";
import "./canvas-agent-entry.css";

export function AgentWelcome({ theme, nodeCount, disabled, onChooseSkill, onDraftPrompt }: { theme: CanvasTheme; nodeCount: number; disabled: boolean; onChooseSkill: () => void; onDraftPrompt: (prompt: string) => void }) {
    const { t } = useI18n();
    return (
        <section className="agent-welcome" style={{ "--agent-entry-ink": theme.node.text, "--agent-entry-muted": theme.node.muted, "--agent-entry-accent": theme.accent.primary, "--agent-entry-hover": theme.toolbar.itemHover } as CSSProperties}>
            <div className="agent-welcome-intro">
                <span className="agent-welcome-orb" aria-hidden="true" />
                <h2>{t("canvasAgentEntry.title")}</h2>
                <p>{t("canvasAgentEntry.description")}</p>
            </div>
            <div className="agent-welcome-actions">
                <button type="button" disabled={disabled} onClick={onChooseSkill}>
                    <Sparkles aria-hidden="true" />
                    <span>
                        <strong>{t("canvasAgentEntry.chooseSkills")}</strong>
                        <small>{t("canvasAgentEntry.skillsHint")}</small>
                    </span>
                    <ArrowUpRight aria-hidden="true" />
                </button>
                <button type="button" disabled={disabled} onClick={() => onDraftPrompt(t("canvasAgentEntry.storyPrompt"))}>
                    <Clapperboard aria-hidden="true" />
                    <span>
                        <strong>{t("canvasAgentEntry.story")}</strong>
                        <small>{t("canvasAgentEntry.storyHint")}</small>
                    </span>
                    <ArrowUpRight aria-hidden="true" />
                </button>
                <button type="button" disabled={disabled || nodeCount === 0} onClick={() => onDraftPrompt(t("canvasAgentEntry.canvasPrompt"))}>
                    <Layers3 aria-hidden="true" />
                    <span>
                        <strong>{t("canvasAgentEntry.organize")}</strong>
                        <small>{nodeCount ? t("canvasAgentEntry.canvasHint", { count: nodeCount }) : t("canvasAgentEntry.emptyCanvasHint")}</small>
                    </span>
                    <ArrowUpRight aria-hidden="true" />
                </button>
            </div>
            <p className="agent-welcome-footnote">{t("canvasAgentEntry.footnote")}</p>
        </section>
    );
}
