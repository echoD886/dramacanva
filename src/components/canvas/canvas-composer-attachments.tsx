import { App, Image as AntImage, Modal, Tooltip } from "antd";
import { ImagePlus, LoaderCircle, Maximize2, Minimize2, Music2, Plus, Video, X } from "lucide-react";
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { nanoid } from "nanoid";
import { useI18n } from "@/i18n/use-i18n";
import { uploadImage } from "@/services/image-storage";
import { resolveMediaUrl, uploadMediaFile } from "@/services/file-storage";
import type { CanvasComposerAttachment, CanvasGenerationMode } from "@/types/canvas";
import type { ModelReferenceLimits } from "@/lib/model-selection";
import type { CanvasResourceReference } from "@/lib/canvas/canvas-resource-references";
import { composerAttachmentReferences } from "@/lib/canvas/composer-attachments";
import { useResolvedCanvasResourceReferences } from "./use-resolved-canvas-resource-references";
import { useCanvasReferenceHoverPreview } from "./canvas-reference-hover-preview";
import "./canvas-composer-attachments.css";

export type ComposerAttachmentHandle = { open: (accept?: string) => void; upload: (files: File[]) => void };
const EMPTY_REFERENCES: CanvasResourceReference[] = [];

export function CanvasComposerAttachments({
    ref,
    mode,
    attachments,
    references = EMPTY_REFERENCES,
    attachmentReferences,
    limits,
    used,
    acceptsCounts,
    disabled,
    expanded: expandedEditor = false,
    onChange,
    onBusyChange,
    onRemoveReference,
    onReorderReferences,
    onReplaceReferenceFiles,
    onClear,
}: {
    ref?: Ref<ComposerAttachmentHandle>;
    mode?: CanvasGenerationMode;
    attachments: CanvasComposerAttachment[];
    limits: ModelReferenceLimits;
    used: ModelReferenceLimits;
    acceptsCounts?: (counts: ModelReferenceLimits) => boolean;
    disabled: boolean;
    onChange: (attachments: CanvasComposerAttachment[]) => void;
    onBusyChange: (busy: boolean) => void;
    references?: CanvasResourceReference[];
    attachmentReferences?: CanvasResourceReference[];
    expanded?: boolean;
    onRemoveReference?: (reference: CanvasResourceReference) => void;
    onReorderReferences?: (orderedNodeIds: string[]) => void;
    onReplaceReferenceFiles?: (reference: CanvasResourceReference, files: File[]) => void;
    onClear?: () => void;
}) {
    const { t } = useI18n();
    const { message } = App.useApp();
    const input = useRef<HTMLInputElement>(null);
    const busyRef = useRef(false);
    const [busy, setBusy] = useState(false);
    const [preview, setPreview] = useState<CanvasResourceReference | null>(null);
    const [expanded, setExpanded] = useState(expandedEditor);
    const [filter, setFilter] = useState<"all" | "image" | "video" | "audio">("all");
    const [urls, setUrls] = useState<Record<string, string>>({});
    const resolvedDirectReferences = useResolvedCanvasResourceReferences(attachmentReferences || composerAttachmentReferences(attachments, references));
    useEffect(() => {
        let disposed = false;
        void Promise.all([
            ...attachments.filter((item) => item.kind !== "image").map(async (item) => [item.id, await resolveMediaUrl(item.storageKey, item.url)] as const),
            ...references.filter((item) => item.kind === "video" || item.kind === "audio").map(async (item) => [item.id, await resolveMediaUrl(item.storageKey, item.mediaUrl || "")] as const),
        ])
            .then((entries) => {
                if (!disposed) setUrls(Object.fromEntries(entries));
            })
            .catch(() => {
                if (!disposed) setUrls({});
            });
        return () => {
            disposed = true;
        };
    }, [attachments, references]);
    const isVideoMode = mode === "video";
    const baseAccept = [limits.maxImages > 0 && "image/*", limits.maxVideos > 0 && "video/*", limits.maxAudios > 0 && "audio/*"].filter(Boolean).join(",");
    const accept = isVideoMode ? (baseAccept ? `${baseAccept},audio/*,.mp3,.wav` : "image/*,video/*,audio/*,.mp3,.wav") : baseAccept;
    const full = isVideoMode ? false : used.maxImages >= limits.maxImages && used.maxVideos >= limits.maxVideos && used.maxAudios >= limits.maxAudios;
    const directReferences = resolvedDirectReferences.map((item) => {
        const id = item.id.slice("attachment:".length);
        return { ...item, mediaUrl: urls[id] || item.mediaUrl };
    });
    const items = [...references.map((item) => ({ ...item, mediaUrl: urls[item.id] || item.mediaUrl })), ...directReferences];
    const hoverPreview = useCanvasReferenceHoverPreview(items);
    const visible = filter === "all" ? items : items.filter((item) => item.kind === filter);
    const remove = (item: CanvasResourceReference) => {
        if (item.id.startsWith("attachment:")) onChange(attachments.filter((attachment) => `attachment:${attachment.id}` !== item.id));
        else onRemoveReference?.(item);
    };
    const media = (item: CanvasResourceReference) =>
        item.kind !== "audio" && item.previewUrl ? (
            <img src={item.previewUrl} alt={item.title} className="size-full object-cover" />
        ) : item.kind === "video" ? (
            <Video className="size-5" />
        ) : item.kind === "audio" ? (
            <Music2 className="size-5" />
        ) : (
            <ImagePlus className="size-5" />
        );
    const upload = async (files: File[]) => {
        if (disabled || busyRef.current || !files.length) return;
        if (!isVideoMode) {
            const counts = { ...used };
            for (const file of files) {
                const isAudio = file.type.startsWith("audio/") || /\.(mp3|wav)$/i.test(file.name);
                const key = file.type.startsWith("image/") ? "maxImages" : file.type.startsWith("video/") ? "maxVideos" : isAudio ? "maxAudios" : null;
                if (!key || ++counts[key] > limits[key]) {
                    message.warning(t("generationFailure.reference"));
                    return;
                }
            }
            if (acceptsCounts && !acceptsCounts(counts)) {
                message.warning(t("generationFailure.reference"));
                return;
            }
        }
        busyRef.current = true;
        setBusy(true);
        onBusyChange(true);
        const next = [...attachments];
        try {
            for (const file of files) {
                const isAudio = file.type.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.name);
                const isImage = file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(file.name);
                const kind = isImage ? "image" : !isAudio && (file.type.startsWith("video/") || /\.(mp4|mov|webm|mkv)$/i.test(file.name)) ? "video" : isAudio ? "audio" : "video";
                const media = kind === "image" ? await uploadImage(file) : await uploadMediaFile(file, kind);
                // 本地降级不能冒充可跨设备恢复的参考素材。
                if (media.pendingRemoteUpload) throw new Error(media.remoteUploadError || t("canvasPrompt.referenceUploadFailed"));
                const poster = "preview" in media ? media.preview : undefined;
                next.push({
                    id: nanoid(),
                    kind,
                    name: file.name,
                    storageKey: media.storageKey,
                    url: media.url,
                    mimeType: media.mimeType,
                    bytes: media.bytes,
                    width: media.width,
                    height: media.height,
                    durationMs: "durationMs" in media ? media.durationMs : undefined,
                    previewUrl: poster?.url,
                    previewStorageKey: poster?.storageKey,
                });
                onChange([...next]);
            }
        } catch (error) {
            message.error(error instanceof Error ? error.message : t("canvasPrompt.referenceUploadFailed"));
        } finally {
            busyRef.current = false;
            setBusy(false);
            onBusyChange(false);
        }
    };
    useImperativeHandle(ref, () => ({
        open: (acceptOverride) => {
            if (input.current) {
                input.current.accept = acceptOverride || accept;
                input.current.click();
            }
        },
        upload: (files) => {
            void upload(files);
        },
    }));
    if (!accept && !items.length)
        return (
            <input
                ref={input}
                type="file"
                className="hidden"
                onChange={(event) => {
                    void upload(Array.from(event.target.files || []));
                    event.target.value = "";
                }}
            />
        );
    const uploadButton = (
        <Tooltip title={t("canvasPrompt.addReferences")}>
            <button type="button" disabled={disabled || busy || full} aria-label={t("canvasPrompt.addReferences")} className="canvas-composer-reference-add" onClick={() => input.current?.click()}>
                {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
            </button>
        </Tooltip>
    );
    return (
        <div
            {...hoverPreview.handlers}
            className={`canvas-composer-attachment-shelf ${expanded ? "is-expanded" : ""}`}
            role="group"
            aria-label={t("canvasPrompt.references")}
            data-canvas-no-zoom
            data-canvas-wheel-scroll
            onDragOver={(event) => {
                if (event.dataTransfer.types.includes("Files")) {
                    event.preventDefault();
                    event.stopPropagation();
                }
            }}
            onDrop={(event) => {
                if (event.dataTransfer.files.length) {
                    event.preventDefault();
                    event.stopPropagation();
                    void upload(Array.from(event.dataTransfer.files));
                }
            }}
        >
            {expanded ? (
                <div className="canvas-composer-reference-tabs">
                    <div role="tablist" aria-label={t("canvasPrompt.references")} className="flex min-w-0 gap-1 overflow-x-auto">
                        {(["all", "image", "video", "audio"] as const).map((kind) => {
                            const count = kind === "all" ? items.length : items.filter((item) => item.kind === kind).length;
                            return (
                                <button key={kind} type="button" role="tab" aria-selected={filter === kind} onClick={() => setFilter(kind)}>
                                    {t(`canvasPrompt.referenceTab.${kind}`)}
                                    {count || kind === "all" ? ` (${count})` : ""}
                                </button>
                            );
                        })}
                    </div>
                    <div className="ml-auto flex shrink-0 gap-2">
                        <button type="button" disabled={disabled || busy} onClick={() => (onClear ? onClear() : onChange([]))}>
                            {t("canvasPrompt.clearReferences")}
                        </button>
                        <button type="button" aria-label={t("canvasPrompt.collapseReferences")} title={t("canvasPrompt.collapseReferences")} onClick={() => setExpanded(false)}>
                            <Minimize2 className="size-4" />
                        </button>
                    </div>
                </div>
            ) : null}
            {!expanded ? (
                <div className={`canvas-composer-reference-collapsed ${items.length ? "has-items" : ""}`}>
                    {items.length ? (
                        <div className="canvas-composer-reference-stack">
                            <button type="button" data-media-preview-id={items[0].id} className="canvas-composer-reference-stacked-card" aria-label={t("canvasPrompt.preview", { title: items[0].title })} onClick={() => setPreview(items[0])}>
                                {media(items[0])}
                            </button>
                            <button
                                type="button"
                                disabled={disabled || busy || (!items[0].id.startsWith("attachment:") && !onRemoveReference)}
                                className="canvas-composer-reference-remove"
                                aria-label={t("canvasPrompt.remove", { label: items[0].title })}
                                onClick={() => remove(items[0])}
                            >
                                <X className="size-3" />
                            </button>
                            <Tooltip title={t("canvasPrompt.viewReferences", { count: items.length })}>
                                <button
                                    type="button"
                                    data-media-preview-id={(items[1] || items[0]).id}
                                    className="canvas-composer-reference-stacked-card canvas-composer-reference-view-all"
                                    aria-label={t("canvasPrompt.viewReferences", { count: items.length })}
                                    aria-expanded={false}
                                    onClick={() => setExpanded(true)}
                                >
                                    {media(items[1] || items[0])}
                                    <span className="canvas-composer-reference-stack-expand">
                                        <Maximize2 className="size-4" />
                                    </span>
                                </button>
                            </Tooltip>
                        </div>
                    ) : null}
                    {accept ? uploadButton : null}
                </div>
            ) : (
                <div className="canvas-composer-reference-grid thin-scrollbar" role="tabpanel" aria-label={t(`canvasPrompt.referenceTab.${filter}`)}>
                    {visible.map((item) => (
                        <div
                            key={item.id}
                            className="canvas-composer-reference-card"
                            draggable={!disabled && !busy}
                            onDragStart={(event) => {
                                event.stopPropagation();
                                event.dataTransfer.setData("application/x-canvas-composer-reference", item.id);
                            }}
                            onDragOver={(event) => {
                                if (!disabled && !busy) {
                                    event.preventDefault();
                                    event.stopPropagation();
                                }
                            }}
                            onDrop={(event) => {
                                if (disabled || busy) return;
                                const from = event.dataTransfer.getData("application/x-canvas-composer-reference");
                                if (from) {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    if (from === item.id) return;
                                    if (from.startsWith("attachment:") && item.id.startsWith("attachment:")) {
                                        const next = [...attachments];
                                        const source = next.findIndex((value) => `attachment:${value.id}` === from);
                                        const target = next.findIndex((value) => `attachment:${value.id}` === item.id);
                                        if (source >= 0 && target >= 0) {
                                            const [moved] = next.splice(source, 1);
                                            next.splice(target, 0, moved);
                                            onChange(next);
                                        }
                                    } else if (!from.startsWith("attachment:") && item.nodeId && onReorderReferences) {
                                        const next = [...references];
                                        const source = next.findIndex((value) => value.id === from);
                                        const target = next.findIndex((value) => value.id === item.id);
                                        if (source >= 0 && target >= 0) {
                                            const [moved] = next.splice(source, 1);
                                            next.splice(target, 0, moved);
                                            onReorderReferences(next.map((value) => value.nodeId));
                                        }
                                    }
                                } else if (event.dataTransfer.files.length && item.nodeId && onReplaceReferenceFiles) {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    onReplaceReferenceFiles(item, Array.from(event.dataTransfer.files));
                                }
                            }}
                        >
                            <button type="button" data-media-preview-id={item.id} className="canvas-composer-reference-thumbnail" aria-label={t("canvasPrompt.preview", { title: item.title })} onClick={() => setPreview(item)}>
                                {media(item)}
                            </button>
                            <button
                                type="button"
                                disabled={disabled || busy || (!item.id.startsWith("attachment:") && !onRemoveReference)}
                                className="canvas-composer-reference-remove"
                                aria-label={t("canvasPrompt.remove", { label: item.title })}
                                onClick={() => remove(item)}
                            >
                                <X className="size-3" />
                            </button>
                        </div>
                    ))}
                    {accept ? uploadButton : null}
                </div>
            )}
            <input
                ref={input}
                type="file"
                multiple
                accept={accept}
                className="hidden"
                onChange={(event) => {
                    const files = Array.from(event.target.files || []);
                    event.target.value = "";
                    void upload(files);
                }}
            />
            {hoverPreview.preview}
            {preview?.kind === "image" ? <AntImage src={preview.previewUrl} alt={preview.title} style={{ display: "none" }} preview={{ open: true, onOpenChange: (open) => !open && setPreview(null) }} /> : null}
            <Modal open={Boolean(preview && preview.kind !== "image")} title={preview?.title} footer={null} onCancel={() => setPreview(null)} destroyOnHidden>
                {preview?.kind === "video" ? <video src={preview.mediaUrl || preview.previewUrl} controls className="max-h-[65vh] w-full" /> : preview?.kind === "audio" ? <audio src={preview.mediaUrl} controls className="w-full" /> : null}
            </Modal>
        </div>
    );
}
