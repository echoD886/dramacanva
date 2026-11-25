import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { ArrowUp, Clapperboard, LayoutGrid, Type, Upload, Workflow } from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";
import { canvasThemes } from "@/lib/canvas-theme";
import { useActiveTheme } from "@/stores/canvas/use-canvas-theme-store";
import "./canvas-story-welcome.css";

const ENTRY_SUGGESTIONS = ["shortDrama.suggestionCat", "shortDrama.suggestionCity", "shortDrama.suggestionBell"] as const;

export function CanvasStoryWelcome({
    onCreatePipeline,
    onSubmitPrompt,
    onStartFreeform,
    onUpload,
    onAddText,
    onAddScript,
}: {
    onCreatePipeline: () => void;
    /** 空字符串表示只打开 Agent，不自动提交。 */
    onSubmitPrompt: (prompt: string) => void;
    onStartFreeform: () => void;
    onUpload: () => void;
    onAddText: () => void;
    onAddScript: () => void;
}) {
    const { t } = useI18n();
    const theme = canvasThemes[useActiveTheme()];
    const [prompt, setPrompt] = useState("");
    const stageRef = useRef<HTMLDivElement>(null);
    const entryStyle = {
        "--canvas-story-entry-text": theme.node.text,
        "--canvas-story-entry-muted": theme.node.muted,
        "--canvas-story-entry-accent": theme.accent.primary,
        "--canvas-story-entry-on-accent": theme.accent.onPrimary,
        "--canvas-story-entry-surface": theme.spatial.elevated,
        "--canvas-story-entry-border": theme.toolbar.border,
        "--canvas-story-entry-shadow": theme.spatial.shadow,
    } as CSSProperties;
    const submit = () => {
        const value = prompt.trim();
        if (!value) return;
        onSubmitPrompt(value);
        setPrompt("");
    };
    useCanvasEntryClickRipple(stageRef);
    return (
        <div ref={stageRef} className="canvas-story-entry-stage" style={entryStyle}>
            <CanvasEntryAmbientRipple />
            <div data-canvas-tour="empty-state" className="canvas-story-entry-shell" data-canvas-no-zoom data-canvas-wheel-scroll>
                <span className="canvas-story-entry-eyebrow">
                    <Clapperboard aria-hidden="true" />
                    {t("shortDrama.studio")}
                </span>
                <h2 className="canvas-story-entry-title">
                    {t("canvasAgentEntry.inspiration")}
                    <strong>{t("canvasAgentEntry.startFilm")}</strong>
                </h2>
                <p className="canvas-story-entry-subtitle">{t("shortDrama.composerHint")}</p>
                <form
                    className="canvas-story-entry-composer"
                    onSubmit={(event) => {
                        event.preventDefault();
                        submit();
                    }}
                >
                    <textarea
                        value={prompt}
                        rows={2}
                        placeholder={t("shortDrama.storyInput")}
                        aria-label={t("shortDrama.storyInput")}
                        onChange={(event) => setPrompt(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                                event.preventDefault();
                                submit();
                            }
                        }}
                    />
                    <div className="canvas-story-entry-composer-bar">
                        <button type="button" className="canvas-story-entry-ghost" onClick={onUpload}>
                            <Upload aria-hidden="true" />
                            {t("shortDrama.importAssets")}
                        </button>
                        <span className="canvas-story-entry-hint">{t("shortDrama.sendHint")}</span>
                        <button type="submit" className="canvas-story-entry-send" disabled={!prompt.trim()} aria-label={t("shortDrama.letAgent")}>
                            <ArrowUp aria-hidden="true" />
                        </button>
                    </div>
                </form>
                <div className="canvas-story-entry-suggestions" role="list" aria-label={t("shortDrama.suggestions")}>
                    {ENTRY_SUGGESTIONS.map((item) => (
                        <button key={item} type="button" role="listitem" onClick={() => setPrompt(t(item))}>
                            {t(item)}
                        </button>
                    ))}
                </div>
                <div className="canvas-story-entry-paths">
                    <button type="button" onClick={onCreatePipeline}>
                        <Workflow aria-hidden="true" />
                        <span>
                            <strong>{t("shortDrama.createYourself")}</strong>
                            <small>{t("shortDrama.createYourselfDesc")}</small>
                        </span>
                    </button>
                    <button type="button" onClick={onAddScript}>
                        <Clapperboard aria-hidden="true" />
                        <span>
                            <strong>{t("shortDrama.newBlankStoryboard")}</strong>
                            <small>{t("shortDrama.shotHint")}</small>
                        </span>
                    </button>
                    <button type="button" data-canvas-tour="new-text" onClick={onAddText}>
                        <Type aria-hidden="true" />
                        <span>
                            <strong>{t("shortDrama.newText")}</strong>
                            <small>{t("shortDrama.textHint")}</small>
                        </span>
                    </button>
                    <button type="button" onClick={onStartFreeform}>
                        <LayoutGrid aria-hidden="true" />
                        <span>
                            <strong>{t("shortDrama.freeCanvas")}</strong>
                            <small>{t("shortDrama.noPreset")}</small>
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}

/** 背景常驻涟漪：只动 transform/opacity，走合成层，不触发布局。 */
function CanvasEntryAmbientRipple() {
    return (
        <div className="canvas-story-entry-ripple" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
        </div>
    );
}

/** 点击画布空白处时从点击位置扩散一圈涟漪；入口卡片内部的点击不触发。 */
function useCanvasEntryClickRipple(stageRef: RefObject<HTMLDivElement | null>) {
    useEffect(() => {
        const stage = stageRef.current;
        const viewport = stage?.closest<HTMLElement>("[data-canvas-viewport]") ?? stage?.parentElement;
        if (!stage || !viewport) return;
        if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
        const handle = (event: PointerEvent) => {
            const target = event.target instanceof Element ? event.target : null;
            if (target?.closest(".canvas-story-entry-shell,[data-canvas-no-zoom]") || event.button !== 0) return;
            const rect = stage.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
            const wave = document.createElement("span");
            wave.className = "canvas-story-entry-click-ripple";
            wave.style.left = `${x}px`;
            wave.style.top = `${y}px`;
            stage.appendChild(wave);
            wave.addEventListener("animationend", () => wave.remove(), { once: true });
        };
        viewport.addEventListener("pointerdown", handle);
        return () => viewport.removeEventListener("pointerdown", handle);
    }, [stageRef]);
}
