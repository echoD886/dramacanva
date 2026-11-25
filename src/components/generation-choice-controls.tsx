import { type CSSProperties, type ReactNode } from "react";
import { Sparkles } from "lucide-react";

import { type CanvasTheme } from "@/lib/canvas-theme";

// 画布内生成参数（画幅、质量、清晰度、张数、时长）的统一外观：浅色托盘 + 选中项浮起卡片，
// 与创作页参数面板保持同一视觉语言。颜色全部从画布主题推导，明暗主题各自成立。
export function choiceTone(theme: CanvasTheme) {
    const dark = isLightColor(theme.node.text);
    return dark
        ? { tray: "rgba(255,255,255,.045)", hover: "rgba(255,255,255,.06)", selected: "rgba(255,255,255,.13)", shadow: "0 1px 2px rgba(0,0,0,.28), 0 4px 12px rgba(0,0,0,.22), inset 0 0 0 1px rgba(255,255,255,.06)" }
        : { tray: "rgba(17,24,39,.05)", hover: "rgba(17,24,39,.06)", selected: "#ffffff", shadow: "0 1px 2px rgba(15,23,42,.08), 0 4px 12px rgba(15,23,42,.08)" };
}

export function ChoiceTray({ theme, columns, className = "", children }: { theme: CanvasTheme; columns: string; className?: string; children: ReactNode }) {
    return (
        <div className={`grid gap-1 rounded-[14px] p-[5px] ${className}`} style={{ background: choiceTone(theme).tray, gridTemplateColumns: columns }}>
            {children}
        </div>
    );
}

export function ChoiceButton({ selected, disabled = false, theme, className = "h-8", fontSize = 12, title, onClick, children }: { selected: boolean; disabled?: boolean; theme: CanvasTheme; className?: string; fontSize?: number; title?: string; onClick: () => void; children: ReactNode }) {
    const tone = choiceTone(theme);
    // 全局 button 重置（font: inherit）不在 Tailwind 层里，会盖过 text-xs 等工具类；字号、字重、行高必须内联。
    const style: CSSProperties = {
        fontSize,
        fontWeight: 600,
        lineHeight: 1,
        background: selected ? tone.selected : "transparent",
        boxShadow: selected ? tone.shadow : "none",
        color: selected ? theme.node.text : theme.node.muted,
        outlineColor: theme.node.muted,
    };
    return (
        <button
            type="button"
            title={title}
            disabled={disabled}
            aria-pressed={selected}
            className={`min-w-0 cursor-pointer whitespace-nowrap rounded-[9px] px-1 tabular-nums transition-[background-color,box-shadow,color] duration-150 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-1 disabled:cursor-not-allowed disabled:opacity-35 ${className}`}
            style={style}
            onMouseEnter={(event) => {
                if (!selected && !disabled) event.currentTarget.style.background = tone.hover;
            }}
            onMouseLeave={(event) => {
                if (!selected) event.currentTarget.style.background = "transparent";
            }}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={onClick}
        >
            {children}
        </button>
    );
}

/** 画幅瓦片：上方是按比例缩放的圆角框（“自动”为星芒图标），下方是比例文字。 */
export function RatioTile({ label, width, height, automatic = false, selected, disabled, theme, onClick }: { label: string; width: number; height: number; automatic?: boolean; selected: boolean; disabled?: boolean; theme: CanvasTheme; onClick: () => void }) {
    return (
        <ChoiceButton selected={selected} disabled={disabled} theme={theme} className="flex h-[58px] flex-col items-center justify-center gap-1.5 rounded-[10px]" fontSize={11.5} title={label} onClick={onClick}>
            <RatioGlyph width={width} height={height} automatic={automatic} />
            <span className="max-w-full overflow-hidden text-ellipsis">{label}</span>
        </ChoiceButton>
    );
}

export function RatioGlyph({ width, height, automatic = false }: { width: number; height: number; automatic?: boolean }) {
    if (automatic || !width || !height) {
        return (
            <span className="grid h-5 w-5 place-items-center rounded-md border-[1.75px] border-current">
                <Sparkles className="size-3" strokeWidth={2.2} aria-hidden />
            </span>
        );
    }
    const scale = Math.min(20 / width, 18 / height);
    return (
        <span className="grid h-5 w-[22px] place-items-center">
            <span className="block rounded-[4px] border-[1.75px] border-current" style={{ width: Math.max(8, Math.round(width * scale)), height: Math.max(8, Math.round(height * scale)) }} />
        </span>
    );
}

function isLightColor(color: string) {
    const hex = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)?.[1];
    if (!hex) return false;
    const full = hex.length === 3 ? hex.split("").map((part) => part + part).join("") : hex;
    const [red, green, blue] = [0, 2, 4].map((offset) => parseInt(full.slice(offset, offset + 2), 16));
    return (red * 299 + green * 587 + blue * 114) / 1000 > 150;
}
