import { Modal } from "antd";
import { Tooltip } from "@/components/ui/base/tooltip";
import { useEffect, useMemo, useState } from "react";

import { Image as ImageIcon, Music2, Play, Plus, UserRound } from "lucide-react";
import { useProductionText } from "@/i18n/production-tools";

import { canvasNodeVideoPreviewUrl } from "@/lib/canvas/canvas-media-preview";
import { isStoryboardPreviewAsset } from "@/lib/canvas/canvas-storyboard-materializer";
import { resolveMediaUrl } from "@/services/file-storage";
import { CanvasNodeType, type CanvasNodeData, type StoryboardAssetBinding } from "@/types/canvas";
import { useI18n } from "@/i18n/use-i18n";
import type { MessageKey } from "@/i18n/messages";

export const ROLE_LABELS: Record<StoryboardAssetBinding["role"], MessageKey> = {
    character: "storyboardAssets.character",
    environment: "storyboardAssets.environment",
    wardrobe: "storyboardAssets.wardrobe",
    prop: "storyboardAssets.prop",
    weapon: "storyboardAssets.weapon",
    style: "storyboardAssets.style",
    motion: "storyboardAssets.motion",
    audio: "storyboardAssets.audio",
};

export function StoryboardAssetsCell({ bindings, nodes, limit = 4, onEdit, disabled }: { bindings: StoryboardAssetBinding[]; nodes: CanvasNodeData[]; limit?: number; onEdit?: () => void; disabled?: boolean }) {
    const { t, number } = useI18n();
    const copy = useProductionText();
    const [previewNode, setPreviewNode] = useState<CanvasNodeData | null>(null);
    const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
    const assets = bindings.map((binding) => ({ binding, node: nodeById.get(binding.nodeId) })).filter((item) => !item.node || isStoryboardPreviewAsset(item.node));
    const visible = assets.slice(0, limit);
    const hiddenCount = Math.max(0, assets.length - visible.length);

    if (!assets.length && !onEdit) return <span className="text-[var(--fs-caption)] text-foreground/35">{t("storyboardAssets.unlinked")}</span>;
    return (
        <>
            <div className="flex min-w-0 items-center gap-1.5" aria-label={t("storyboardAssets.linked", { count: number(assets.length) })}>
                {visible.map(({ binding, node }) => (
                    <Tooltip key={binding.nodeId} title={`${node?.title || t("storyboardAssets.invalid")} · ${t(ROLE_LABELS[binding.role])}`}>
                        <button
                            type="button"
                            disabled={!node}
                            className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-md border border-foreground/10 bg-foreground/[0.035] text-foreground/45 outline-none transition enabled:hover:border-foreground/30 enabled:hover:text-foreground/70 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:cursor-not-allowed"
                            aria-label={t("storyboardAssets.preview", { title: node?.title || t("storyboardAssets.invalidAsset") })}
                            onMouseDown={(event) => event.stopPropagation()}
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                                event.stopPropagation();
                                if (node) setPreviewNode(node);
                            }}
                        >
                            {node ? <AssetThumbnail node={node} /> : <ImageIcon className="size-4" />}
                            <span className="absolute bottom-0.5 right-0.5 rounded bg-black/65 px-1 text-[8px] leading-3 text-white">{t(ROLE_LABELS[binding.role]).slice(0, 1)}</span>
                        </button>
                    </Tooltip>
                ))}
                {hiddenCount ? <span className="shrink-0 text-[var(--fs-caption)] font-medium text-foreground/45">+{number(hiddenCount)}</span> : null}
                {onEdit ? (
                    <button
                        type="button"
                        disabled={disabled}
                        aria-label={copy(16)}
                        className="grid size-9 shrink-0 place-items-center rounded-md border border-foreground/15 disabled:opacity-40"
                        onMouseDown={(event) => event.stopPropagation()}
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                            event.stopPropagation();
                            onEdit();
                        }}
                    >
                        <Plus className="size-4" />
                    </button>
                ) : null}
            </div>
            {previewNode && <AssetPreviewModal node={previewNode} onClose={() => setPreviewNode(null)} />}
        </>
    );
}

export function AssetThumbnail({ node }: { node: CanvasNodeData }) {
    const videoPreview = canvasNodeVideoPreviewUrl(node);
    const source = useNodeMediaSource(node.type === CanvasNodeType.Video ? null : node);
    if (node.type === CanvasNodeType.Audio) return <Music2 className="size-4" />;
    if (node.metadata?.workflowKind === "character" && !source) return <UserRound className="size-4" />;
    if (node.type === CanvasNodeType.Video) {
        return videoPreview ? (
            <>
                <img src={videoPreview} alt="" loading="lazy" decoding="async" draggable={false} className="size-full object-cover" />
                <span className="absolute inset-0 grid place-items-center bg-black/15">
                    <Play className="size-3.5 fill-white text-white" />
                </span>
            </>
        ) : (
            <Play className="size-4" />
        );
    }
    return source ? <img src={source} alt="" loading="lazy" decoding="async" draggable={false} className="size-full object-cover" /> : <ImageIcon className="size-4" />;
}

function AssetPreviewModal({ node, onClose }: { node: CanvasNodeData | null; onClose: () => void }) {
    const { t } = useI18n();
    const source = useNodeMediaSource(node);
    return (
        <Modal title={node?.title || t("storyboardAssets.previewTitle")} open={Boolean(node)} onCancel={onClose} footer={null} width={880} centered destroyOnHidden>
            {node ? (
                <div className="grid min-h-56 place-items-center overflow-hidden rounded-lg bg-black/[0.035] p-3 dark:bg-white/[0.035]" data-canvas-no-zoom>
                    {node.type === CanvasNodeType.Video && source ? (
                        <video src={source} controls autoPlay playsInline className="max-h-[68vh] max-w-full rounded-md" />
                    ) : node.type === CanvasNodeType.Audio && source ? (
                        <audio src={source} controls autoPlay className="w-full max-w-xl" />
                    ) : source ? (
                        <img src={source} alt={node.title || t("storyboardAssets.previewTitle")} className="max-h-[68vh] max-w-full object-contain" />
                    ) : (
                        <span className="text-sm text-foreground/45">{t("storyboardAssets.noMedia")}</span>
                    )}
                </div>
            ) : null}
        </Modal>
    );
}

function useNodeMediaSource(node: CanvasNodeData | null) {
    const fallback = node
        ? node.metadata?.workflowKind === "character"
            ? node.metadata.characterCoverUrl || ""
            : node.type === CanvasNodeType.Drawing
              ? node.metadata?.drawingPreviewUrl || node.metadata?.content || ""
              : node.metadata?.content || ""
        : "";
    const storageKey = node?.metadata?.storageKey;
    const [source, setSource] = useState(fallback);
    useEffect(() => {
        let cancelled = false;
        setSource(fallback);
        if (storageKey)
            void resolveMediaUrl(storageKey, fallback)
                .then((url) => {
                    if (!cancelled) setSource(url || fallback);
                })
                .catch(() => {
                    if (!cancelled) setSource(fallback);
                });
        return () => {
            cancelled = true;
        };
    }, [fallback, storageKey]);
    return source;
}
