import { currentLocaleText as t } from "@/i18n/current-locale-text";
import { useI18n } from "@/i18n/use-i18n";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Bone, Box, Camera, Check, Compass, Crosshair, Focus, Layers, Lightbulb, Minus, Move3d, Palette, PanelLeft, Plus, Redo2, Rotate3d, Route, Scale3d, Scan, SlidersHorizontal, Undo2, UserRound, WandSparkles } from "lucide-react";

import { FloatingDock, type FloatingDockEntry } from "@/components/ui/aceternity/floating-dock";
import { aceternityMotion } from "@/lib/aceternity-motion";
import { canvasDockStyle } from "@/lib/canvas/canvas-aceternity-style";
import type { CanvasTheme } from "@/lib/canvas-theme";
import { DIRECTOR_VIEW_MODES, type DirectorViewMode } from "@/lib/canvas/director/director-view-modes";
import type { DirectorCamera, DirectorRenderMode } from "@/types/director";
import { releaseDirectorFocusAfterPointer } from "@/lib/canvas/director/director-shortcuts";

type TransformMode = "translate" | "rotate" | "scale";

export type DirectorCanvasDockProps = {
    theme: CanvasTheme;
    transformMode: TransformMode;
    onTransformModeChange: (mode: TransformMode) => void;
    renderMode: DirectorRenderMode;
    renderModes: DirectorRenderMode[];
    onRenderModeChange: (mode: DirectorRenderMode) => void;
    onAddActor: () => void;
    onAddBox: () => void;
    onAddLight: () => void;
    onAddCamera: () => void;
    onAlignCamera: () => void;
    trajectoryDrawing: boolean;
    trajectoryKind: "actor" | "camera" | null;
    onToggleTrajectory: () => void;
    viewMode: DirectorViewMode;
    onViewModeChange: (mode: DirectorViewMode) => void;
    cameras: DirectorCamera[];
    viewedCameraId: string | null;
    onViewCamera: (id: string) => void;
    onFocusSelected: () => void;
    onFrameScene: () => void;
    onZoom: (factor: number) => void;
    timelineOpen: boolean;
    onOpenTimeline: () => void;
    scenePanelOpen: boolean;
    onToggleScenePanel: () => void;
    inspectorOpen: boolean;
    onToggleInspector: () => void;
    canUndo?: boolean;
    canRedo?: boolean;
    onUndo?: () => void;
    onRedo?: () => void;
};

/**
 * 预演台视口工具条：与画布主工具条共用 FloatingDock 组件、dock token 与提示/动效。
 * 单一整合 dock 聚合选择、变换、创建、视图、取景导航、撤销重做与面板开关。
 */
export function DirectorCanvasDock(props: DirectorCanvasDockProps) {
    useI18n();
    const { theme } = props;
    const rootRef = useRef<HTMLDivElement>(null);
    const [toolsOpen, setToolsOpen] = useState(false);
    const [viewMenuOpen, setViewMenuOpen] = useState(false);
    const [createMenuOpen, setCreateMenuOpen] = useState(false);

    useEffect(() => {
        if (!viewMenuOpen && !createMenuOpen && !toolsOpen) return;
        const close = (event: PointerEvent) => {
            if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
                setViewMenuOpen(false);
                setCreateMenuOpen(false);
                setToolsOpen(false);
            }
        };
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setViewMenuOpen(false);
                setCreateMenuOpen(false);
                setToolsOpen(false);
            }
        };
        document.addEventListener("pointerdown", close, true);
        document.addEventListener("keydown", closeOnEscape);
        return () => {
            document.removeEventListener("pointerdown", close, true);
            document.removeEventListener("keydown", closeOnEscape);
        };
    }, [viewMenuOpen, createMenuOpen, toolsOpen]);

    const currentView = DIRECTOR_VIEW_MODES.find((item) => item.mode === props.viewMode) ?? DIRECTOR_VIEW_MODES[0];
    const trajectoryLabel = props.trajectoryDrawing ? t("previs.v165.message221") : props.trajectoryKind === "camera" ? t("previs.v165.message222") : t("previs.v165.message223");
    const renderViews = [
        { mode: "beauty", label: t("canvasExtra.directorDock.viewBeauty"), icon: <Camera /> },
        { mode: "clay", label: t("canvasExtra.directorWB.renderClay"), icon: <Palette /> },
        { mode: "pose", label: t("canvasExtra.directorDock.viewPose"), icon: <Bone /> },
        { mode: "depth", label: t("canvasExtra.directorDock.viewDepth"), icon: <Layers /> },
        { mode: "normal", label: t("canvasExtra.directorDock.viewNormal"), icon: <Compass /> },
    ] satisfies Array<{ mode: DirectorRenderMode; label: string; icon: ReactNode }>;

    const navigationItems: FloatingDockEntry[] = [
        { id: "director-align-camera", label: t("canvasExtra.directorWB.alignCameraToView"), icon: <Crosshair />, onClick: props.onAlignCamera },
        { id: "director-focus", label: t("previs.v165.message144"), icon: <Focus />, onClick: props.onFocusSelected },
        { id: "director-frame", label: t("previs.v165.message146"), icon: <Scan />, onClick: props.onFrameScene },
        { id: "director-zoom-out", label: t("previs.v165.message148"), icon: <Minus />, onClick: () => props.onZoom(1.38) },
        { id: "director-zoom-in", label: t("previs.v165.message147"), icon: <Plus />, onClick: () => props.onZoom(0.72) },
        ...renderViews
            .filter((item) => props.renderModes.includes(item.mode))
            .map((item) => ({
                id: `director-render-${item.mode}`,
                label: item.label,
                icon: item.icon,
                active: props.renderMode === item.mode,
                onClick: () => props.onRenderModeChange(item.mode),
            })),
    ];
    // Keep frequent editing commands visible; navigation and render tools live with view selection.
    const sceneItems: FloatingDockEntry[] = [
        { id: "director-scene-panel", label: props.scenePanelOpen ? t("previs.v165.message224") : t("previs.v165.message225"), icon: <PanelLeft />, active: props.scenePanelOpen, expands: true, onClick: props.onToggleScenePanel },
        { kind: "separator", id: "director-sep-scene" },
        {
            kind: "switch",
            id: "director-transform",
            label: t("previs.v165.message226"),
            value: props.transformMode,
            onChange: (value) => props.onTransformModeChange(value as TransformMode),
            options: [
                { value: "translate", label: t("canvasExtra.directorDock.move"), icon: <Move3d /> },
                { value: "rotate", label: t("canvasExtra.directorDock.rotate"), icon: <Rotate3d /> },
                { value: "scale", label: t("canvasExtra.directorDock.scale"), icon: <Scale3d /> },
            ],
        },
        { id: "director-trajectory", label: trajectoryLabel, icon: <Route />, active: props.trajectoryDrawing, onClick: props.onToggleTrajectory },
        { kind: "separator", id: "director-sep-create" },
        {
            id: "director-create",
            label: t("canvasExtra.directorWB.addSceneObject"),
            icon: <Plus />,
            active: createMenuOpen,
            expands: true,
            onClick: () => {
                setCreateMenuOpen((value) => !value);
                setViewMenuOpen(false);
            },
        },
        ...(props.onUndo && props.onRedo
            ? [
                  { kind: "separator" as const, id: "director-sep-history" },
                  { id: "director-undo", label: t("canvasContextMenu.undo"), icon: <Undo2 />, disabled: !props.canUndo, onClick: props.onUndo },
                  { id: "director-redo", label: t("canvasContextMenu.redo"), icon: <Redo2 />, disabled: !props.canRedo, onClick: props.onRedo },
              ]
            : []),
        { kind: "separator", id: "director-sep-panels" },
        { id: "director-timeline", label: t("previs.v165.message230"), icon: <WandSparkles />, active: props.timelineOpen, onClick: props.onOpenTimeline },
        { id: "director-inspector", label: props.inspectorOpen ? t("previs.v165.message231") : t("previs.v165.message232"), icon: <SlidersHorizontal />, active: props.inspectorOpen, expands: true, onClick: props.onToggleInspector },
    ];

    return (
        <div
            ref={rootRef}
            data-canvas-no-zoom
            className="pv-canvas-dock"
            onPointerDown={(event) => event.stopPropagation()}
            onWheel={(event) => event.stopPropagation()}
            onClick={(event) => {
                const button = event.target instanceof Element ? event.target.closest("button") : null;
                if (button) releaseDirectorFocusAfterPointer({ detail: event.detail, currentTarget: button });
            }}
        >
            <AnimatePresence>
                {createMenuOpen && (
                    <motion.div
                        role="dialog"
                        aria-label={t("canvasExtra.directorWB.addSceneObject")}
                        className="pv-canvas-dock__menu aceternity-floating-panel"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={aceternityMotion.spring.panel}
                        style={{ background: theme.spatial.elevated, color: theme.node.text }}
                    >
                        <div className="pv-canvas-dock__menu-title">{t("canvasExtra.directorWB.addSceneObject")}</div>
                        <div className="pv-canvas-dock__view-grid">
                            {[
                                { label: t("canvasExtra.directorDock.addActor"), icon: <UserRound className="size-4" />, action: props.onAddActor },
                                { label: t("canvasExtra.directorDock.addBox"), icon: <Box className="size-4" />, action: props.onAddBox },
                                { label: t("canvasExtra.directorWB.addLight"), icon: <Lightbulb className="size-4" />, action: props.onAddLight },
                                { label: t("canvasExtra.directorWB.addCamera"), icon: <Camera className="size-4" />, action: props.onAddCamera },
                            ].map((item) => (
                                <button
                                    key={item.label}
                                    type="button"
                                    aria-label={item.label}
                                    onClick={() => {
                                        item.action();
                                        setCreateMenuOpen(false);
                                    }}
                                >
                                    {item.icon}
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
                {viewMenuOpen ? (
                    <motion.div
                        role="dialog"
                        aria-label={t("previs.v165.message233")}
                        initial={{ opacity: 0, y: 14, scale: 0.92 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 9, scale: 0.96 }}
                        transition={aceternityMotion.spring.panel}
                        className="pv-canvas-dock__menu aceternity-floating-panel"
                        style={{ background: theme.spatial.elevated, color: theme.node.text, boxShadow: `0 28px 80px ${theme.spatial.shadow}` }}
                    >
                        <div className="pv-canvas-dock__menu-title">
                            <span>{t("previs.v165.message234")}</span>
                            <small style={{ color: theme.node.muted }}>{t("previs.v165.message235")}</small>
                        </div>
                        <div className="pv-canvas-dock__view-grid" role="radiogroup" aria-label={t("previs.v165.message233")}>
                            {DIRECTOR_VIEW_MODES.map((item) => {
                                const checked = item.mode === props.viewMode;
                                return (
                                    <button
                                        key={item.mode}
                                        type="button"
                                        role="radio"
                                        aria-checked={checked}
                                        aria-label={`${item.label} ${item.hint}`}
                                        title={item.hint}
                                        className={checked ? "is-active" : undefined}
                                        onClick={() => {
                                            props.onViewModeChange(item.mode);
                                            setViewMenuOpen(false);
                                        }}
                                    >
                                        {item.label}
                                    </button>
                                );
                            })}
                        </div>
                        {props.cameras.length ? (
                            <>
                                <div className="pv-canvas-dock__menu-title is-sub">
                                    <span>{t("canvasExtra.directorNP.statCameras")}</span>
                                </div>
                                <div className="pv-canvas-dock__camera-list">
                                    {props.cameras.map((camera) => {
                                        const current = props.viewMode === "camera" && camera.id === props.viewedCameraId;
                                        return (
                                            <button
                                                key={camera.id}
                                                type="button"
                                                aria-pressed={current}
                                                className={current ? "is-active" : undefined}
                                                onClick={() => {
                                                    props.onViewCamera(camera.id);
                                                    setViewMenuOpen(false);
                                                }}
                                            >
                                                <Camera className="size-3.5" />
                                                <span>{camera.name}</span>
                                                <small>{camera.focalLength}mm</small>
                                                {current ? <Check className="size-3.5" /> : null}
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        ) : null}
                        <FloatingDock canvasChrome items={navigationItems} style={canvasDockStyle(theme)} ariaLabel={t("previs.v165.message233")} />
                    </motion.div>
                ) : null}
            </AnimatePresence>
            {toolsOpen && <FloatingDock canvasChrome items={sceneItems} className="canvas-floating-dock" style={canvasDockStyle(theme)} ariaLabel={t("canvasExtra.directorWB.addSceneObject")} />}
            <div className="director-view-picker">
                <button
                    type="button"
                    id="director-view-mode"
                    aria-expanded={viewMenuOpen}
                    onClick={() => {
                        setViewMenuOpen(!viewMenuOpen);
                        setToolsOpen(false);
                        setCreateMenuOpen(false);
                    }}
                >
                    <Compass size={14} />
                    {props.viewMode === "free" ? t("directorNode.directorView") : currentView.label} ▾
                </button>
                <button
                    type="button"
                    aria-label={t("canvasExtra.directorWB.addSceneObject")}
                    aria-expanded={toolsOpen}
                    onClick={() => {
                        setToolsOpen(!toolsOpen);
                        setViewMenuOpen(false);
                        setCreateMenuOpen(false);
                    }}
                >
                    <SlidersHorizontal size={14} />
                </button>
            </div>
        </div>
    );
}
