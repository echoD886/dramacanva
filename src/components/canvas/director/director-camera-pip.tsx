import { currentLocaleText as t } from "@/i18n/current-locale-text";
import { useI18n } from "@/i18n/use-i18n";
import { type DirectorCamera, type DirectorScene, type DirectorShot } from "@/types/director";
import { resolveShotCameraState, warnShotCameraFallbackOnce } from "@/lib/canvas/director/director-shot-camera";
import { type DirectorViewMode } from "@/lib/canvas/director/director-view-modes";
import { ArrowLeftRight, Grip, ChevronDown, ChevronUp, Grid3X3, Square } from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";

export type DirectorCameraPipProps = {
    canvasRef: RefObject<HTMLCanvasElement | null>;
    camera: DirectorCamera | null;
    scene: DirectorScene;
    playhead: number;
    shot: DirectorShot;
    viewMode: DirectorViewMode;
    onSelectShot?: (id: string) => void;
    onSwapView: () => void;
    className?: string;
    scope: string;
};

export function DirectorCameraPip({ canvasRef, camera, scene, playhead, shot, onSelectShot, onSwapView, scope, className = "" }: DirectorCameraPipProps) {
    useI18n();
    const [collapsed, setCollapsed] = useState(false);
    const [showThirds, setShowThirds] = useState(false);
    const [showSafeArea, setShowSafeArea] = useState(false);
    const storageKey = `director-pip-corner:${scope}`;
    const [corner, setCorner] = useState(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (["top-left", "top-right", "bottom-left", "bottom-right"].includes(saved || "")) return saved!;
        } catch {}
        return "top-right";
    });
    const drag = useRef<{ x: number; y: number } | null>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    const [availableHeight, setAvailableHeight] = useState(180);
    useEffect(() => {
        const viewport = rootRef.current?.parentElement;
        if (!viewport) return;
        const measure = () => setAvailableHeight(Math.max(60, Math.min(180, viewport.clientHeight - 180)));
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(viewport);
        return () => observer.disconnect();
    }, []);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    useEffect(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            setCorner(["top-left", "top-right", "bottom-left", "bottom-right"].includes(saved || "") ? saved! : "top-right");
        } catch {
            setCorner("top-right");
        }
    }, [storageKey]);
    const rememberCorner = (next: string) => {
        setCorner(next);
        try {
            localStorage.setItem(storageKey, next);
        } catch {}
    };

    const shotState = resolveShotCameraState(scene, shot.id, playhead);
    useEffect(() => {
        warnShotCameraFallbackOnce(scene.id, shot.id, shotState.source);
    }, [scene.id, shot.id, shotState.source]);
    const ratio = scene.previs?.aspect || shot.aspectRatio || "9:16";
    const aspect = shotState.aspect;
    const height = Math.round(Math.min(availableHeight, 320 / aspect));
    const previewStyle = { width: Math.round(height * aspect), height };

    return (
        <div
            ref={rootRef}
            className={`director-camera-pip ${collapsed ? "is-collapsed" : ""} ${className}`}
            role="region"
            data-corner={corner}
            style={{ width: collapsed ? undefined : previewStyle.width + 2, transform: `translate(${offset.x}px, ${offset.y}px)`, transition: drag.current ? "none" : undefined }}
            aria-label={t("previs.v165.pipCamera")}
            data-canvas-no-zoom
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
        >
            <div
                className="director-camera-pip__header"
                title={t("previs.v165.dragPipCorner")}
                tabIndex={0}
                onKeyDown={(event) => {
                    if (event.target !== event.currentTarget || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
                    event.preventDefault();
                    const [vertical, horizontal] = corner.split("-");
                    rememberCorner(`${event.key === "ArrowUp" ? "top" : event.key === "ArrowDown" ? "bottom" : vertical}-${event.key === "ArrowLeft" ? "left" : event.key === "ArrowRight" ? "right" : horizontal}`);
                }}
                onPointerDown={(event) => {
                    if (event.button !== 0 || (event.target as HTMLElement).closest("button, select")) return;
                    event.currentTarget.setPointerCapture(event.pointerId);
                    drag.current = { x: event.clientX, y: event.clientY };
                }}
                onPointerMove={(event) => {
                    if (drag.current) setOffset({ x: event.clientX - drag.current.x, y: event.clientY - drag.current.y });
                }}
                onPointerUp={(event) => {
                    if (!drag.current) return;
                    const start = drag.current;
                    drag.current = null;
                    setOffset({ x: 0, y: 0 });
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) < 8) return;
                    const rect = event.currentTarget.closest(".pv-viewport-area")!.getBoundingClientRect();
                    const next = `${event.clientY < rect.top + rect.height / 2 ? "top" : "bottom"}-${event.clientX < rect.left + rect.width / 2 ? "left" : "right"}`;
                    rememberCorner(next);
                }}
                onPointerCancel={() => {
                    drag.current = null;
                    setOffset({ x: 0, y: 0 });
                }}
                onLostPointerCapture={() => {
                    drag.current = null;
                    setOffset({ x: 0, y: 0 });
                }}
            >
                <div className="director-camera-pip__title" title={camera?.name || t("previs.v165.pipCamera")}>
                    <Grip className="size-3.5 shrink-0 opacity-70" />
                    {onSelectShot ? (
                        <label className="director-pip-shot-picker">
                            {t("directorNode.shotArrangement")} ⌄
                            <select aria-label={t("creationStoryboard.list")} value={shot.id} onChange={(event) => onSelectShot(event.target.value)}>
                                {scene.shots.map((item, index) => (
                                    <option key={item.id} value={item.id}>
                                        {index + 1} · {item.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    ) : (
                        <span className="director-camera-pip__name">{camera?.name || t("previs.v165.pipCamera")}</span>
                    )}
                    <span className="director-camera-pip__focal">{Number(shotState.focalLength.toFixed(1))} mm</span>
                </div>
                <div className="director-camera-pip__actions">
                    {!collapsed && (
                        <>
                            <button
                                type="button"
                                className={`director-camera-pip__btn ${showThirds ? "is-active" : ""}`}
                                title={t("previs.v165.ruleOfThirds")}
                                aria-label={t("previs.v165.ruleOfThirds")}
                                aria-pressed={showThirds}
                                onClick={() => setShowThirds((v) => !v)}
                            >
                                <Grid3X3 className="size-3" />
                            </button>
                            <button
                                type="button"
                                className={`director-camera-pip__btn ${showSafeArea ? "is-active" : ""}`}
                                title={t("previs.v165.safeArea")}
                                aria-label={t("previs.v165.safeArea")}
                                aria-pressed={showSafeArea}
                                onClick={() => setShowSafeArea((v) => !v)}
                            >
                                <Square className="size-3" />
                            </button>
                            <button type="button" className="director-camera-pip__btn is-swap" title={t("previs.v165.swapView")} aria-label={t("previs.v165.swapView")} onClick={onSwapView}>
                                <ArrowLeftRight className="size-3" />
                            </button>
                        </>
                    )}
                    <button
                        type="button"
                        className="director-camera-pip__btn"
                        title={t(collapsed ? "previs.v165.expand" : "previs.v165.collapse")}
                        aria-label={t(collapsed ? "previs.v165.expand" : "previs.v165.collapse")}
                        onClick={() => setCollapsed((v) => !v)}
                    >
                        {collapsed ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />}
                    </button>
                </div>
            </div>

            {!collapsed && (
                <div className="director-camera-pip__screen relative overflow-hidden bg-black/90 cursor-pointer select-none" style={previewStyle} onDoubleClick={onSwapView} title={t("previs.v165.swapView")}>
                    <canvas ref={canvasRef} width={previewStyle.width} height={previewStyle.height} className="w-full h-full block object-cover" />

                    {/* Rule of Thirds Grid Overlay */}
                    {showThirds && (
                        <svg className="absolute inset-0 size-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                            <line x1="33.33%" y1="0%" x2="33.33%" y2="100%" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" strokeDasharray="3 3" />
                            <line x1="66.66%" y1="0%" x2="66.66%" y2="100%" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" strokeDasharray="3 3" />
                            <line x1="0%" y1="33.33%" x2="100%" y2="33.33%" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" strokeDasharray="3 3" />
                            <line x1="0%" y1="66.66%" x2="100%" y2="66.66%" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" strokeDasharray="3 3" />
                        </svg>
                    )}

                    {/* Safe Area Guideline Overlay */}
                    {showSafeArea && (
                        <svg className="absolute inset-0 size-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                            {/* Action Safe (90%) */}
                            <rect x="5%" y="5%" width="90%" height="90%" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.75" />
                            {/* Title Safe (80%) */}
                            <rect x="10%" y="10%" width="80%" height="80%" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.75" strokeDasharray="2 2" />
                            {/* Center Crosshair */}
                            <line x1="46%" y1="50%" x2="54%" y2="50%" stroke="rgba(255,255,255,0.4)" strokeWidth="0.75" />
                            <line x1="50%" y1="46%" x2="50%" y2="54%" stroke="rgba(255,255,255,0.4)" strokeWidth="0.75" />
                        </svg>
                    )}

                    {/* Ratio Badge */}
                    <div className="absolute bottom-1 right-1 pointer-events-none px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-mono text-white/80 leading-none">{ratio}</div>

                    {/* View Mode Indicator */}
                    <div className="absolute top-1 left-1 pointer-events-none px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-medium text-white/80 leading-none flex items-center gap-1">
                        <span>{t("previs.v165.pipCamera")}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
