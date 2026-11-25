import { useEffect, useRef, useState, type ReactNode } from "react";
import { useI18n } from "@/i18n/use-i18n";
import { useWorldEngineTranslation } from "@/i18n/world-engine-text";
import { Box, Camera, Clapperboard, Lightbulb, LockKeyhole, Move3d, Timer } from "lucide-react";

import { CachedResourceImage } from "@/components/cached-resource-image";
import { currentDirectorThumbnail, WORLD_ENGINE_THUMBNAIL_RENDERER } from "@/lib/canvas/director/director-thumbnail";
import { previsAspectValue } from "@/lib/canvas/previs/previs-optics";
import { canvasThemes, type CanvasTheme } from "@/lib/canvas-theme";
import { gatePrevisPreviewFailure, resolvePrevisActiveShot, resolvePrevisPreviewSource, type PrevisNodeContentReader } from "@/lib/canvas/previs/previs-preview";
import { useActiveTheme } from "@/stores/canvas/use-canvas-theme-store";
import type { CanvasNodeData } from "@/types/canvas";
import type { DirectorScene } from "@/types/director";
import type { PrevisScene } from "@/types/previs";
import "./canvas-previs-node-card.css";

export function CanvasPrevisNodePanel({
    node,
    scene,
    readNodeContent,
    onOpen,
    professional = true,
    onScheduleThumbnail,
}: {
    node: CanvasNodeData;
    scene: PrevisScene | DirectorScene | null;
    readNodeContent: PrevisNodeContentReader;
    onOpen: () => void;
    professional?: boolean;
    /** Called when no camera-view thumbnail exists yet. Implementer queues an offscreen still-frame capture. */
    onScheduleThumbnail?: () => void;
}) {
    const { t, number } = useI18n();
    const { t: worldText } = useWorldEngineTranslation();
    const theme = canvasThemes[useActiveTheme()];
    const shot = resolvePrevisActiveShot(scene, node.metadata?.directorShotId);
    const previewId = node.metadata?.directorPreviewNodeId || shot?.previewNodeId;
    const media = shot?.aspectRatio === "auto" ? readNodeContent(previewId) : undefined;
    const mediaRatio = typeof media === "object" && media.naturalWidth && media.naturalHeight ? media.naturalWidth / media.naturalHeight : undefined;
    const ratio = previsAspectValue(shot?.aspectRatio, mediaRatio);
    const [failedUrl, setFailedUrl] = useState<string | null>(null);
    const previewRef = useRef<HTMLButtonElement>(null);
    const source = resolvePrevisPreviewSource({ scene, shot, previewNodeId: node.metadata?.directorPreviewNodeId, readNodeContent });
    const saved = currentDirectorThumbnail(node.metadata?.directorThumbnail, scene?.updatedAt, shot?.id);
    const thumbnail = saved?.renderer === WORLD_ENGINE_THUMBNAIL_RENDERER ? saved : null;
    const preview = gatePrevisPreviewFailure(thumbnail ? { kind: "image", url: thumbnail.url, storageKey: thumbnail.storageKey } : source, failedUrl);
    const title = node.metadata?.workflowTitle || node.title;
    const objectCount = scene?.objects.filter((item) => item.visible !== false).length || 0;
    const cameraCount = scene?.cameras.length || 0;
    const lightCount = scene?.lights.length || 0;

    useEffect(() => {
        const target = previewRef.current;
        if (!target || !scene || !onScheduleThumbnail || thumbnail) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (!entry.isIntersecting) return;
            observer.disconnect();
            onScheduleThumbnail();
        });
        observer.observe(target);
        return () => observer.disconnect();
    }, [onScheduleThumbnail, scene, thumbnail]);

    return (
        <div className="previs-node-card" style={{ color: theme.node.text }}>
            <header className="previs-node-card-header">
                <div className="previs-node-card-kicker">
                    <span className="previs-node-card-mark">
                        <Clapperboard className="size-3.5" />
                    </span>
                    <span>{t("previs.v165.message091")}</span>
                </div>
                <span className="previs-node-card-duration">
                    {shot?.aspectRatio !== "auto" && <span>{shot?.aspectRatio || "9:16"}</span>}
                    <Timer className="size-3" />
                    {number(shot?.duration ?? 0, { style: "unit", unit: "second", unitDisplay: "narrow" })}
                </span>
            </header>
            <div className="previs-node-stage">
                <button
                    ref={previewRef}
                    type="button"
                    className="previs-node-preview"
                    style={{ background: theme.node.fill, borderColor: theme.node.stroke, aspectRatio: ratio, width: `min(100cqw, ${ratio * 100}cqh)` }}
                    title={professional ? worldText("worldEngine.open") : t("canvasExtra.directorNP.needProfessional")}
                    aria-label={professional ? worldText("worldEngine.open") : t("canvasExtra.directorNP.needProfessional")}
                    disabled={!professional}
                    onMouseDown={(event) => event.stopPropagation()}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                        event.stopPropagation();
                        onOpen();
                    }}
                >
                    {preview.kind === "image" ? (
                        <CachedResourceImage
                            src={preview.url}
                            storageKey={preview.storageKey}
                            alt={t("canvasExtra.directorNP.previewAlt", { title })}
                            className="previs-node-preview-image"
                            draggable={false}
                            variant="thumbnail"
                            fallback={<PrevisPreviewState kind="empty" theme={theme} />}
                            onError={() => setFailedUrl(preview.url || preview.storageKey || "")}
                        />
                    ) : (
                        <PrevisPreviewState kind={onScheduleThumbnail ? "loading" : preview.kind} theme={theme} />
                    )}
                    <span className="previs-node-preview-cta" style={{ background: `${theme.toolbar.panel}e8`, color: theme.node.text }}>
                        {professional ? (
                            <>
                                <Move3d className="size-3.5" />
                                {worldText("worldEngine.open")}
                            </>
                        ) : (
                            <>
                                <LockKeyhole className="size-3.5" />
                                {t("canvasExtra.directorNP.professionalHint")}
                            </>
                        )}
                    </span>
                </button>
            </div>

            <footer className="previs-node-card-footer" style={{ borderColor: theme.node.stroke, color: theme.node.muted }}>
                <Stat icon={<Box className="size-3" />} value={objectCount} label={t(objectCount === 1 ? "canvasExtra.directorNP.statObject" : "canvasExtra.directorNP.statObjects")} />
                <Stat icon={<Camera className="size-3" />} value={cameraCount} label={t(cameraCount === 1 ? "canvasExtra.directorNP.statCamera" : "canvasExtra.directorNP.statCameras")} />
                <Stat icon={<Lightbulb className="size-3" />} value={lightCount} label={t(lightCount === 1 ? "canvasExtra.directorNP.statLight" : "canvasExtra.directorNP.statLights")} />
            </footer>
        </div>
    );
}

function PrevisPreviewState({ kind, theme }: { kind: "loading" | "empty"; theme: CanvasTheme }) {
    const { t } = useI18n();
    const loading = kind === "loading";
    return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-3 text-center">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl" style={{ background: theme.toolbar.activeBg }}>
                <Clapperboard className="size-4" style={{ color: theme.node.muted }} aria-hidden />
            </span>
            <span className="max-w-full truncate text-xs font-semibold" style={{ color: theme.node.text }}>
                {t(loading ? "canvasExtra.directorNP.preparingScene" : "canvasExtra.directorNP.noPreview")}
            </span>
            <span className="max-w-full text-[var(--fs-label)] leading-4" style={{ color: theme.node.muted }}>
                {t(loading ? "canvasExtra.directorNP.preparingSceneDesc" : "canvasExtra.directorNP.noPreviewDesc")}
            </span>
        </div>
    );
}

function Stat({ icon, value, label }: { icon: ReactNode; value: number; label: string }) {
    const { t } = useI18n();
    return (
        <span className="inline-flex min-w-0 items-center gap-1" title={t("canvasExtra.directorNP.statAria", { count: value, label })}>
            {icon}
            <b>{value}</b>
            <span>{label}</span>
        </span>
    );
}
