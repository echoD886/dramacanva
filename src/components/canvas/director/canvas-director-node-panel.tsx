import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Clapperboard, MoreHorizontal, Play, RefreshCw } from "lucide-react";
import { Popover, Select } from "antd";
import { useI18n } from "@/i18n/use-i18n";
import { useDirectorPrevisV2 } from "@/hooks/use-director-previs-v2";
import { CachedResourceImage } from "@/components/cached-resource-image";
import { canvasThemes, type CanvasTheme } from "@/lib/canvas-theme";
import { subscribeCanvasViewportPreview } from "@/lib/canvas/canvas-live-viewport";
import { resolveDirectorAspectRatio } from "@/lib/canvas/director/director-scene-data";
import { gateDirectorPreviewFailure, resolveDirectorActiveShot, resolveDirectorPreviewSource, type DirectorNodeContentReader } from "@/lib/canvas/director/director-preview";
import { currentDirectorThumbnail } from "@/lib/canvas/director/director-thumbnail";
import { computePrevisSequenceFingerprint, currentDirectorPrevis, directorPrevisFingerprint } from "@/lib/canvas/director/director-previs-cache";
import { directorRowFingerprint } from "@/lib/canvas/director/director-storyboard";
import type { DirectorConnectionTarget } from "@/lib/canvas/director/director-downstream";
import type { DirectorCardEditTarget } from "@/lib/canvas/director/director-node-card";
import { useActiveTheme } from "@/stores/canvas/use-canvas-theme-store";
import type { CanvasNodeData } from "@/types/canvas";
import type { DirectorScene } from "@/types/director";
import { DirectorMiniViewport } from "./director-mini-viewport";
import { DirectorCardPlayer } from "./director-card-player";
import "./canvas-director-node-card.css";

export function CanvasDirectorNodePanel({
    node,
    scene,
    readNodeContent,
    onOpen,
    professional = true,
    connectionTargets = [],
    onConnect,
    finalVideoUrl,
    onGenerate,
    nodes = [],
    onSync,
    onSelectShot,
    scale = 1,
}: {
    node: CanvasNodeData;
    scene: DirectorScene | null;
    readNodeContent: DirectorNodeContentReader;
    onOpen: (target?: DirectorCardEditTarget) => void;
    professional?: boolean;
    connectionTargets?: DirectorConnectionTarget[];
    onConnect?: (target: DirectorConnectionTarget) => void;
    finalVideoUrl?: string;
    onGenerate?: () => void;
    nodes?: CanvasNodeData[];
    onSync?: () => void;
    onSelectShot?: (shotId: string) => void;
    scale?: number;
}) {
    const { t } = useI18n();
    const previsV2 = useDirectorPrevisV2();
    const theme = canvasThemes[useActiveTheme()];
    const root = useRef<HTMLDivElement>(null);
    const [compact, setCompact] = useState(scale < 0.45);
    useEffect(() => setCompact(scale < 0.45), [scale]);
    useEffect(() => {
        const canvas = root.current?.closest<HTMLDivElement>("[data-canvas-viewport]");
        if (canvas) return subscribeCanvasViewportPreview(canvas, (viewport) => setCompact(viewport.k < 0.45));
    }, []);
    const shot = resolveDirectorActiveShot(scene, node.metadata?.directorShotId);
    const [failedUrl, setFailedUrl] = useState<string | null>(null);
    const [stage, setStage] = useState<"previs" | "composition" | "final">("previs");
    const [planView, setPlanView] = useState(false);
    const title = node.metadata?.workflowTitle || node.title;
    const thumbnail = currentDirectorThumbnail(node.metadata?.directorThumbnail, scene?.updatedAt, shot?.id);
    const preview = gateDirectorPreviewFailure(
        stage === "composition" && thumbnail
            ? { kind: "image", url: thumbnail.url, storageKey: thumbnail.storageKey }
            : stage === "composition" && node.metadata?.directorThumbnail
              ? { kind: scene ? "empty" : "loading" }
              : resolveDirectorPreviewSource({ scene, shot, previewNodeId: node.metadata?.directorPreviewNodeId, readNodeContent }),
        failedUrl,
    );
    const source = nodes.find((item) => item.id === shot?.sourceStoryboardNodeId);
    const row = source?.metadata?.storyboard?.rows.find((item) => item.id === shot?.sourceStoryboardRowId);
    const sourceChanged = row && shot?.sourceFingerprint !== directorRowFingerprint(row, source?.metadata?.size === "2.39:1" ? "2.39:1" : source?.metadata?.size === "16:9" ? "16:9" : "9:16");
    const previsCache = currentDirectorPrevis(node, shot?.id);
    const fingerprint = scene && shot ? (scene.previs ? computePrevisSequenceFingerprint(scene) : directorPrevisFingerprint(scene, shot.id)) : undefined;
    const freshPrevis = previsCache?.fingerprint === fingerprint ? previsCache : undefined;
    const fallback = scene ? <DirectorMiniViewport scene={scene} shotId={shot?.id} /> : <DirectorPreviewState kind={preview.kind === "loading" ? "loading" : "empty"} theme={theme} />;
    const still =
        preview.kind === "image" ? (
            <CachedResourceImage src={preview.url} storageKey={preview.storageKey} alt={title} className="director-node-preview-image" draggable={false} eager fallback={fallback} onError={() => setFailedUrl(preview.url || preview.storageKey || "")} />
        ) : (
            fallback
        );
    const cardStyle = {
        color: theme.node.text,
        background: theme.node.fill,
        "--director-shot-aspect": resolveDirectorAspectRatio(scene?.previs?.aspect ?? shot?.aspectRatio),
        "--director-card-border": theme.node.stroke,
        "--director-card-muted": theme.node.muted,
        "--director-card-selected": theme.accent.primarySoft,
        "--director-card-primary": theme.accent.primary,
        "--director-card-on-primary": theme.accent.onPrimary,
    } as CSSProperties;
    if (node.metadata?.importSource?.provider === "libtv" && node.metadata.importSource.projectUuid === "demo-reference-1" && scene) {
        return (
            <div ref={root} className="director-starter-entry" data-canvas-no-zoom onMouseDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
                <Clapperboard size={26} aria-hidden />
                <span>{t("miscPages.starterNodeStageCopy")}</span>
                <button
                    type="button"
                    data-canvas-no-zoom
                    disabled={!professional}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                        event.stopPropagation();
                        onOpen();
                    }}
                >
                    {t("miscPages.springEnter")}
                </button>
            </div>
        );
    }
    const menu = (
        <div
            className="director-node-menu"
            style={cardStyle}
            data-canvas-no-zoom
            onPointerDown={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            onWheel={(event) => event.stopPropagation()}
        >
            <div className="director-card-stages">
                {(["previs", "composition", "final"] as const).map((item) => (
                    <button key={item} type="button" aria-pressed={stage === item} onClick={() => setStage(item)}>
                        {t(`directorD4.${item}`)}
                        {item === "final" && finalVideoUrl ? " •" : ""}
                    </button>
                ))}
            </div>
            {stage === "previs" && (
                <div className="director-card-views">
                    <button type="button" aria-pressed={!planView} onClick={() => setPlanView(false)}>
                        {t("directorR3.cameraView")}
                    </button>
                    <button type="button" aria-pressed={planView} onClick={() => setPlanView(true)}>
                        {t("directorR3.planView")}
                    </button>
                </div>
            )}
            {scene && scene.shots.length > 1 && onSelectShot && <Select size="small" value={shot?.id} options={scene.shots.map((item) => ({ value: item.id, label: item.name }))} onChange={onSelectShot} />}
            {row && onSync && (
                <button type="button" onClick={onSync} title={sourceChanged ? `${t("directorD4.changed")} · ${t("directorD4.sync")}` : t("directorD4.sync")}>
                    <RefreshCw size={13} />
                    {t("directorD4.sync")}
                </button>
            )}
            {previsV2 && onConnect && (
                <Select
                    size="small"
                    aria-label={t("canvasDirector.connect")}
                    placeholder={t("canvasDirector.connect")}
                    value={null}
                    options={connectionTargets.map((target, index) => ({ value: index, label: target.label }))}
                    onChange={(index: number) => onConnect(connectionTargets[index])}
                />
            )}
        </div>
    );
    return (
        <div ref={root} className="director-node-card" data-director-detail={compact ? "compact" : "full"} style={cardStyle}>
            <header className="director-node-card-title-row">
                <h3 className="director-node-card-title" title={title}>
                    {title}
                </h3>
                {!compact && (
                    <Popover trigger="click" placement="bottomRight" content={menu}>
                        <button
                            type="button"
                            className="director-node-more"
                            aria-label={t("directorNode.more")}
                            data-canvas-no-zoom
                            onPointerDown={(event) => event.stopPropagation()}
                            onMouseDown={(event) => event.stopPropagation()}
                            onClick={(event) => event.stopPropagation()}
                        >
                            <MoreHorizontal size={18} />
                        </button>
                    </Popover>
                )}
            </header>
            {scene && shot ? (
                <DirectorCardPlayer
                    id={node.id}
                    scene={scene}
                    shotId={shot.id}
                    compact={compact}
                    plan={stage === "previs" && planView && !compact}
                    storageKey={stage === "previs" ? freshPrevis?.storageKey : undefined}
                    url={stage === "final" ? finalVideoUrl : freshPrevis?.url}
                    cacheFingerprint={freshPrevis?.fingerprint}
                    videoKind={stage === "final" ? "final" : "previs"}
                    preview={
                        stage === "composition" ? (
                            still
                        ) : stage === "final" && !finalVideoUrl && previsV2 && onGenerate ? (
                            <button type="button" onClick={onGenerate}>
                                {t("directorD4.generate")}
                            </button>
                        ) : scene.objects.every((object) => !object.visible) ? (
                            <DirectorPreviewState kind="empty" theme={theme} />
                        ) : undefined
                    }
                    status={stage === "previs" && !freshPrevis ? <span role="status">{t("directorD4.updating")}</span> : undefined}
                    editDisabled={!professional}
                    editTitle={!professional ? t("canvasExtra.directorNP.professionalHint") : undefined}
                    onEdit={onOpen}
                />
            ) : (
                <div className="director-card-player" data-canvas-no-zoom onPointerDown={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
                    <div className="director-node-preview" data-director-thumbnail>
                        {still}
                        {compact && (
                            <button type="button" className="director-card-compact-play" aria-label={t("directorD4.play")} disabled>
                                <Play size={20} />
                            </button>
                        )}
                    </div>
                    {!compact && (
                        <div className="director-playback-controls">
                            <button type="button" className="director-node-open" data-director-open disabled={!professional} onClick={() => onOpen()}>
                                {t("directorNode.openStudio")}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function DirectorPreviewState({ kind, theme }: { kind: "loading" | "empty"; theme: CanvasTheme }) {
    const { t } = useI18n();
    const loading = kind === "loading";
    return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-3 text-center">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl" style={{ background: theme.toolbar.activeBg }}>
                <Clapperboard className="size-4" style={{ color: theme.node.muted }} aria-hidden />
            </span>
            <span className="max-w-full truncate text-xs font-semibold" style={{ color: theme.node.text }}>
                {loading ? t("canvasExtra.directorNP.preparingScene") : t("canvasExtra.directorNP.noPreview")}
            </span>
            <span className="max-w-full text-[11px] leading-4" style={{ color: theme.node.muted }}>
                {loading ? t("canvasExtra.directorNP.preparingSceneDesc") : t("previs.v165.message006")}
            </span>
        </div>
    );
}
