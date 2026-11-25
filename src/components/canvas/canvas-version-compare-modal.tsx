import { useI18n } from "@/i18n/use-i18n";
import { localizedCanvasMentionText } from "@/i18n/canvas-reference-label";
import { Button, Modal } from "antd";
import { Check, Star } from "lucide-react";

import { canvasThemes } from "@/lib/canvas-theme";
import { canvasNodeVideoPreviewUrl } from "@/lib/canvas/canvas-media-preview";
import { useActiveTheme } from "@/stores/canvas/use-canvas-theme-store";
import { modelDisplayName, useEffectiveConfig } from "@/stores/use-config-store";
import { CanvasNodeType, type CanvasNodeData } from "@/types/canvas";

export function CanvasVersionCompareModal({ open, versions, onClose, onSetPrimary, onFocus }: { open: boolean; versions: CanvasNodeData[]; onClose: () => void; onSetPrimary: (nodeId: string) => void; onFocus: (nodeId: string) => void }) {
    const { t } = useI18n();
    const config = useEffectiveConfig();
    const theme = canvasThemes[useActiveTheme()];
    const modalWidth = Math.min(1180, Math.max(440, 112 + versions.length * 340));
    return (
        <Modal title={t("versionCompare.title")} open={open} footer={null} width={modalWidth} centered onCancel={onClose} styles={{ body: { overflow: "hidden" } }}>
            <div className="thin-scrollbar grid max-h-[70vh] grid-flow-col auto-cols-[328px] gap-3 overflow-x-auto pb-2">
                {versions.map((node) => {
                    const videoPreview = canvasNodeVideoPreviewUrl(node);
                    return (
                    <article key={node.id} className="overflow-hidden rounded-[var(--r-lg)] border" style={{ borderColor: node.metadata?.versionPrimary ? theme.accent.primary : theme.node.stroke, background: theme.node.panel, boxShadow: node.metadata?.versionPrimary ? "0 0 0 2px " + theme.accent.primarySoft : undefined }}>
                        <div className="flex h-11 items-center justify-between gap-3 border-b px-3" style={{ borderColor: theme.node.stroke }}>
                            <div className="flex min-w-0 flex-1 items-center gap-2"><span className="grid size-7 shrink-0 place-items-center rounded-[var(--r-full)] border text-[var(--node-badge-fs)] font-semibold leading-none" style={{ background: node.metadata?.versionPrimary ? theme.accent.primarySoft : theme.toolbar.itemHover, borderColor: node.metadata?.versionPrimary ? theme.accent.primary : theme.node.stroke, color: node.metadata?.versionPrimary ? theme.accent.primary : theme.node.text }}>{node.metadata?.versionLabel || "-"}</span><span className="min-w-0 truncate text-xs font-semibold" title={node.title}>{node.title}</span></div>
                            {node.metadata?.versionPrimary ? <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[var(--fs-tiny)] font-medium" style={{ color: theme.accent.primary }}><Check className="size-3" />{t("versionCompare.primary")}</span> : null}
                        </div>
                        <button type="button" className="block h-52 w-full overflow-hidden" style={{ background: theme.node.fill }} onClick={() => onFocus(node.id)}>
                            {node.type === CanvasNodeType.Image && node.metadata?.content ? <img src={node.metadata.content} alt={node.title || t("versionCompare.image")} className="size-full object-contain" /> : videoPreview ? <img src={videoPreview} alt={node.title || t("versionCompare.video")} className="size-full object-contain" loading="lazy" decoding="async" /> : <span className="grid size-full place-items-center px-4 text-center text-xs" style={{ color: theme.node.muted }}>{t("versionCompare.focus")}</span>}
                        </button>
                        <div className="space-y-2 p-3 text-[var(--fs-label)]">
                            <Info label={t("versionCompare.model")} value={node.metadata?.model ? modelDisplayName(config, node.metadata.model) : t("versionCompare.defaultModel")} />
                            <Info label={t("versionCompare.size")} value={node.metadata?.size || t("versionCompare.defaultSize")} />
                            <div><div className="whitespace-nowrap opacity-45">{t("versionCompare.prompt")}</div><div className="mt-1 line-clamp-5 whitespace-pre-wrap break-words leading-5">{localizedCanvasMentionText(node.metadata?.composerContent || node.metadata?.prompt || t("versionCompare.empty"), t)}</div></div>
                            <Button block size="small" className="whitespace-nowrap" type={node.metadata?.versionPrimary ? "default" : "primary"} disabled={node.metadata?.versionPrimary} icon={<Star className="size-3.5" />} onClick={() => onSetPrimary(node.id)}>{node.metadata?.versionPrimary ? t("versionCompare.current") : t("versionCompare.set")}</Button>
                        </div>
                    </article>
                    );
                })}
            </div>
        </Modal>
    );
}

function Info({ label, value }: { label: string; value: string }) {
    return <div className="flex min-w-0 items-center gap-3"><span className="w-9 shrink-0 whitespace-nowrap opacity-45">{label}</span><span className="min-w-0 flex-1 truncate text-right font-medium" title={value}>{value}</span></div>;
}
