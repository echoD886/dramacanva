import { useEffect, useMemo, useRef, useState } from "react";
import { App, Button, Input, InputNumber, Modal, Segmented, Select } from "antd";
import { AudioLines, Check, ListVideo, Plus, Scissors, SkipBack, SkipForward, Trash2 } from "lucide-react";
import { nanoid } from "nanoid";

import { ModelPicker } from "@/components/model-picker";
import { useI18n } from "@/i18n/use-i18n";
import { canvasThemes } from "@/lib/canvas-theme";
import { buildTimelineImportSegments, type CanvasTimelineSegmentItem } from "@/lib/canvas/canvas-video-timeline-segments";
import { listVideoReferenceModels } from "@/lib/canvas/canvas-video-regeneration";
import { modelCapabilityConfigFor } from "@/lib/model-capabilities";
import { modelRequestOptions, resolveCompatibleModel, type ModelRequirements } from "@/lib/model-selection";
import { navigateToSettings } from "@/lib/settings-navigation";
import { useActiveTheme } from "@/stores/canvas/use-canvas-theme-store";
import { resolveMediaUrl } from "@/services/file-storage";
import { cacheResourceObjectUrl } from "@/services/resource-blob-cache";
import { resourceIdFromStorageKey } from "@/services/api/resources";
import { modelDisplayName, type AiConfig } from "@/stores/use-config-store";
import { type CanvasConnection, type CanvasNodeData, type CanvasVideoEditOperation } from "@/types/canvas";
import type { TimelineProject } from "@/types/timeline";

export type CanvasVideoSegmentItem = CanvasTimelineSegmentItem;

export type CanvasVideoSegmentParams = {
    mode: "audio" | "video";
    action?: "extract" | "create-generation-nodes";
    startMs: number;
    endMs: number;
    prompt?: string;
    segments?: CanvasVideoSegmentItem[];
    model?: string;
    operation?: CanvasVideoEditOperation;
};

type CanvasVideoSegmentDialogProps = {
    node: CanvasNodeData;
    nodes: CanvasNodeData[];
    connections: CanvasConnection[];
    open: boolean;
    mode: "audio" | "video";
    config: AiConfig;
    timeline?: TimelineProject | null;
    onClose: () => void;
    onConfirm: (params: CanvasVideoSegmentParams) => void;
};

const MIN_SEGMENT_MS = 100;

export function CanvasVideoSegmentDialog({ node, nodes, connections, open, mode, config, timeline, onClose, onConfirm }: CanvasVideoSegmentDialogProps) {
    const { message } = App.useApp();
    const { t } = useI18n();
    const theme = canvasThemes[useActiveTheme()];
    const videoRef = useRef<HTMLVideoElement>(null);
    const segmentsSeededRef = useRef(false);
    const [videoUrl, setVideoUrl] = useState("");
    const [videoError, setVideoError] = useState(false);
    const [durationMs, setDurationMs] = useState(0);
    const [startSec, setStartSec] = useState(0);
    const [endSec, setEndSec] = useState(0);
    const [prompt, setPrompt] = useState("");
    const [segments, setSegments] = useState<CanvasVideoSegmentItem[]>([]);
    const [model, setModel] = useState("");
    const [operation, setOperation] = useState<CanvasVideoEditOperation>("extend");
    const [videoAction, setVideoAction] = useState<"extract" | "create-generation-nodes">("extract");
    const eligibleModels = useMemo(() => listVideoReferenceModels(config), [config]);

    // 打开弹窗时解析视频地址，读取时长并初始化起止时间。
    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        setVideoUrl("");
        setVideoError(false);
        setDurationMs(0);
        setStartSec(0);
        setEndSec(0);
        setPrompt("");
        setSegments([]);
        setVideoAction("extract");
        segmentsSeededRef.current = false;
        const defaultModel = config.videoModel || config.model || "";
        const initialModel = eligibleModels.includes(defaultModel) ? defaultModel : eligibleModels[0] || defaultModel;
        setModel(initialModel);
        const profile = initialModel ? modelCapabilityConfigFor(config, initialModel).video : undefined;
        setOperation(profile?.operations.includes("extend") ? "extend" : (profile?.operations[0] as CanvasVideoEditOperation | undefined) || "extend");
        const storageKey = node.metadata?.storageKey || "";
        const fallback = node.metadata?.content || "";
        const applyUrl = (url: string) => {
            if (!cancelled) setVideoUrl(url);
        };
        if (resourceIdFromStorageKey(storageKey)) {
            void cacheResourceObjectUrl(storageKey)
                .then((cached) => {
                    if (cancelled) return;
                    if (cached) setVideoUrl(cached);
                    else void resolveMediaUrl(storageKey, fallback).then(applyUrl);
                })
                .catch(() => {
                    if (!cancelled) void resolveMediaUrl(storageKey, fallback).then(applyUrl);
                });
        } else {
            void resolveMediaUrl(storageKey, fallback).then(applyUrl);
        }
        return () => {
            cancelled = true;
        };
    }, [config, eligibleModels, node, open]);

    // 视频模式等待时长元数据就绪后，默认放入一个完整时长的片段。
    useEffect(() => {
        if (!open || mode !== "video" || segmentsSeededRef.current || !durationMs) return;
        segmentsSeededRef.current = true;
        setSegments([{ id: nanoid(), startMs: 0, endMs: durationMs, sourceNodeId: node.id }]);
    }, [durationMs, mode, open]);

    const isVideoMode = mode === "video";
    const createsGenerationNodes = videoAction === "create-generation-nodes";
    const durationSec = durationMs > 0 ? durationMs / 1000 : 0;
    const hasTimelineVideoClips = Boolean(timeline?.clips.some((clip) => clip.kind === "video"));
    const hasPrompt = Boolean(prompt.trim());
    const modelRequirements = useMemo<ModelRequirements>(
        () => ({
            capability: "video",
            input: { textCount: createsGenerationNodes && hasPrompt ? 1 : 0, imageCount: 0, videoCount: createsGenerationNodes ? 1 : 0, audioCount: 0, characterCount: 0 },
            videoOperation: operation,
            videoSeconds: config.videoSeconds,
			options: modelRequestOptions(config, "video"),
        }),
        [config.videoSeconds, createsGenerationNodes, hasPrompt, operation],
    );
    const resolvedModel = resolveCompatibleModel(config, model, modelRequirements) || model;
    const videoProfile = useMemo(() => (resolvedModel ? modelCapabilityConfigFor(config, resolvedModel).video : undefined), [config, resolvedModel]);
    const defaultModel = config.videoModel || config.model || "";
    const defaultModelSupported = eligibleModels.includes(defaultModel);
    const hasEligibleModels = eligibleModels.length > 0;
    const firstEligibleModel = eligibleModels[0] || "";

    // 切换模型后保持所选模式仍然有效，优先回退到“视频续写”。
    useEffect(() => {
        if (!videoProfile?.operations.length || videoProfile.operations.includes(operation)) return;
        setOperation(videoProfile.operations.includes("extend") ? "extend" : (videoProfile.operations[0] as CanvasVideoEditOperation));
    }, [operation, videoProfile]);

    const operationOptions = (videoProfile?.operations || []).map((value) => {
        const operation = value as CanvasVideoEditOperation;
        return { value: operation, label: videoOperationLabel(t, operation) };
    });

    const rangeMs = useMemo(() => {
        const start = Math.max(0, Math.round((startSec || 0) * 1000));
        const end = durationMs > 0 ? Math.min(durationMs, Math.round((endSec || 0) * 1000)) : Math.round((endSec || 0) * 1000);
        return { startMs: start, endMs: Math.max(start, end) };
    }, [durationMs, endSec, startSec]);

    const addManualSegment = () => {
        const last = segments[segments.length - 1];
        const maxEndMs = durationMs || last?.endMs || 0;
        const startMs = last ? Math.min(maxEndMs, last.endMs) : 0;
        const endMs = Math.max(startMs + MIN_SEGMENT_MS, maxEndMs);
        setSegments((current) => [...current, { id: nanoid(), startMs, endMs, sourceNodeId: node.id }]);
    };

    const importTimelineSegments = () => {
        try {
            const result = buildTimelineImportSegments(node, nodes, connections, timeline, durationMs);
            if (!result.ok) {
                message.warning(result.error);
                return;
            }
            setSegments(result.segments);
            setPrompt((current) => current || t("canvasExtra.videoSeg.timelineImportPrompt", { count: result.segments.length }));
            message.success(t("canvasExtra.videoSeg.importedFromTimeline", { count: result.segments.length }));
        } catch (error) {
            console.warn("时间线片段导入失败", error);
            message.warning(t("canvasExtra.videoSeg.readTimelineFailed"));
        }
    };

    const updateSegment = (id: string, patch: Partial<Pick<CanvasVideoSegmentItem, "startMs" | "endMs">>) => {
        setSegments((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    };

    const removeSegment = (id: string) => {
        setSegments((current) => current.filter((item) => item.id !== id));
    };

    const handleConfirm = () => {
        if (isVideoMode) {
            if (createsGenerationNodes && !model) {
                message.warning(t("canvasExtra.videoSeg.selectVideoModel"));
                return;
            }
            if (!segments.length) {
                message.warning(t("canvasExtra.videoSeg.addAtLeastOneClip"));
                return;
            }
            for (const segment of segments) {
                if (segment.endMs - segment.startMs < MIN_SEGMENT_MS) {
                    message.warning(t("canvasExtra.videoSeg.minClipDuration"));
                    return;
                }
            }
            onConfirm({
                mode: "video",
                action: videoAction,
                startMs: 0,
                endMs: 0,
                segments: segments.map(({ id, startMs, endMs, sourceNodeId, sourceStorageKey, sourceUrl }) => ({ id, startMs, endMs, sourceNodeId, sourceStorageKey, sourceUrl })),
                model: createsGenerationNodes ? resolvedModel : undefined,
                operation: createsGenerationNodes ? operation : undefined,
                prompt: createsGenerationNodes ? prompt.trim() : undefined,
            });
            return;
        }
        if (!durationMs) {
            message.warning(t("canvasExtra.videoSeg.durationNotReady"));
            return;
        }
        if (rangeMs.endMs - rangeMs.startMs < MIN_SEGMENT_MS) {
            message.warning(t("canvasExtra.videoSeg.minClipDuration"));
            return;
        }
        onConfirm({ mode: "audio", startMs: rangeMs.startMs, endMs: rangeMs.endMs });
    };

    const title = (
        <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg" style={{ background: theme.accent.primarySoft, color: theme.accent.primary }}>
                {isVideoMode ? <Scissors className="size-4" /> : <AudioLines className="size-4" />}
            </span>
            <div className="min-w-0">
                <div className="truncate font-semibold leading-6">{isVideoMode ? t("canvasExtra.videoSeg.extractVideoClips") : t("canvasExtra.videoSeg.extractAudioFromVideo")}</div>
                <div className="truncate text-xs opacity-45">{node.title || t("canvasExtra.videoSeg.videoNode")}</div>
            </div>
        </div>
    );

    return (
        <Modal title={title} open={open} onCancel={onClose} footer={null} width={680} centered destroyOnHidden>
            <div className="space-y-4">
                <div className="flex min-h-0 items-center justify-center overflow-hidden rounded-xl border bg-black" style={{ borderColor: theme.toolbar.border }}>
                    {videoUrl ? (
                        <video
                            ref={videoRef}
                            src={videoUrl}
                            controls
                            playsInline
                            preload="metadata"
                            className="block max-h-[var(--video-segment-preview-max-height)] w-full"
                            onLoadedMetadata={(event) => {
                                const video = event.currentTarget;
                                if (Number.isFinite(video.duration) && video.duration > 0) {
                                    const totalMs = Math.round(video.duration * 1000);
                                    setDurationMs(totalMs);
                                    setEndSec(totalMs / 1000);
                                }
                            }}
                            onError={() => setVideoError(true)}
                        />
                    ) : (
                        <div className="grid h-40 w-full place-items-center text-xs opacity-60">{videoError ? t("canvasExtra.videoSeg.previewLoadFailed") : t("canvasExtra.videoSeg.loadingVideo")}</div>
                    )}
                </div>

                {isVideoMode ? (
                    <div className="space-y-2.5">
                        {createsGenerationNodes && !defaultModelSupported ? (
                            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs" style={{ background: theme.accent.primarySoft + "1a", borderColor: theme.accent.primarySoft, color: theme.node.muted }}>
                                <span className="min-w-0 flex-1">
                                    {hasEligibleModels
                                        ? t("canvasExtra.videoSeg.defaultModelNoRefVideo", { model: defaultModel ? `「${modelDisplayName(config, defaultModel)}」` : "", target: modelDisplayName(config, firstEligibleModel) })
                                        : t("canvasExtra.videoSeg.noRefVideoModels")}
                                </span>
                                {!hasEligibleModels ? (
                                    <Button size="small" type="primary" onClick={() => navigateToSettings({ section: "channels", continueCreation: true })}>
                                        {t("canvasExtra.videoSeg.goConfigureChannels")}
                                    </Button>
                                ) : null}
                            </div>
                        ) : null}

                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-sm">
                                <span className="opacity-60">{t("canvasExtra.videoSeg.duration")}</span>
                                <span>{durationSec ? formatSegmentTime(durationSec) : t("canvasExtra.videoSeg.unknown")}</span>
                                <span className="opacity-60">{t("canvasExtra.videoSeg.selected")}</span>
                                <span>{t("canvasExtra.videoSeg.segmentsCount", { count: segments.length })}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button size="small" icon={<Plus className="size-3.5" />} disabled={!durationSec} onClick={addManualSegment}>
                                    {t("canvasExtra.videoSeg.addClip")}
                                </Button>
                                <Button size="small" icon={<ListVideo className="size-3.5" />} disabled={!hasTimelineVideoClips} onClick={importTimelineSegments}>
                                    {t("canvasExtra.videoSeg.importFromTimeline")}
                                </Button>
                            </div>
                        </div>

                        {segments.length ? (
                            <div className="thin-scrollbar max-h-56 space-y-2 overflow-y-auto pr-1">
                                {segments.map((segment, index) => (
                                    <div key={segment.id} className="rounded-lg border px-2.5 py-2" style={{ borderColor: theme.toolbar.border }}>
                                        <div className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-2">
                                            <span className="w-14 shrink-0 text-xs font-medium">{t("canvasExtra.videoSeg.clipN", { index: index + 1 })}</span>
                                            <div className="flex min-w-0 items-center gap-1">
                                                <span className="shrink-0 text-xs opacity-60">{t("canvasExtra.videoSeg.start")}</span>
                                                <InputNumber
                                                    size="small"
                                                    min={0}
                                                    max={Math.max(0, durationSec - 0.1)}
                                                    step={0.1}
                                                    value={segment.startMs / 1000}
                                                    onChange={(value) => updateSegment(segment.id, { startMs: Math.round((value ?? 0) * 1000) })}
                                                    className="w-full"
                                                    aria-label={t("canvasExtra.videoSeg.ariaClipStart", { index: index + 1 })}
                                                />
                                            </div>
                                            <div className="flex min-w-0 items-center gap-1">
                                                <span className="shrink-0 text-xs opacity-60">{t("canvasExtra.videoSeg.end")}</span>
                                                <InputNumber
                                                    size="small"
                                                    min={0}
                                                    max={Math.max(0, durationSec)}
                                                    step={0.1}
                                                    value={segment.endMs / 1000}
                                                    onChange={(value) => updateSegment(segment.id, { endMs: Math.round((value ?? 0) * 1000) })}
                                                    className="w-full"
                                                    aria-label={t("canvasExtra.videoSeg.ariaClipEnd", { index: index + 1 })}
                                                />
                                            </div>
                                            <Button size="small" type="text" danger icon={<Trash2 className="size-3.5" />} aria-label={t("canvasExtra.videoSeg.ariaDeleteClip", { index: index + 1 })} onClick={() => removeSegment(segment.id)} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-lg border border-dashed px-3 py-3 text-xs opacity-55" style={{ borderColor: theme.toolbar.border }}>
                                {t("canvasExtra.videoSeg.emptyClips")}
                            </div>
                        )}

                        <div className="rounded-xl px-3 py-2.5" style={{ background: theme.toolbar.itemHover }}>
                            <div className="mb-2 flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-sm font-medium">{t("canvasExtra.videoSeg.afterExtract")}</div>
                                    <div className="mt-0.5 text-xs opacity-45">{t("canvasExtra.videoSeg.afterExtractHint")}</div>
                                </div>
                                <Segmented size="small" value={videoAction} options={[{ label: t("canvasExtra.videoSeg.extractOnly"), value: "extract" }, { label: t("canvasExtra.videoSeg.createGenerationNodes"), value: "create-generation-nodes" }]} onChange={(value) => setVideoAction(value as "extract" | "create-generation-nodes")} />
                            </div>
                        </div>

                        {createsGenerationNodes ? (
                            <>
                                <div className="grid gap-3 md:grid-cols-2">
                                    <label className="block min-w-0">
                                        <div className="mb-1.5 text-sm font-medium">{t("canvasExtra.videoSeg.generationModel")}</div>
                                        <ModelPicker config={config} value={resolvedModel} onChange={setModel} capability="video" requirements={modelRequirements} fullWidth onMissingConfig={() => message.warning(t("canvasExtra.videoSeg.missingRefVideoModel"))} />
                                    </label>
                                    <label className="block min-w-0">
                                        <div className="mb-1.5 text-sm font-medium">{t("canvasExtra.videoSeg.generationMode")}</div>
                                        <Select className="w-full" size="small" value={operation} options={operationOptions} placeholder={t("canvasExtra.videoSeg.selectGenerationMode")} onChange={(value) => setOperation(value as CanvasVideoEditOperation)} />
                                    </label>
                                </div>

                                <label className="block">
                                    <div className="mb-1.5 text-sm font-medium">{t("canvasExtra.videoSeg.generationPrompt")}</div>
                                    <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} value={prompt} placeholder={t("canvasExtra.videoSeg.promptPlaceholder")} onChange={(event) => setPrompt(event.target.value)} />
                                    <div className="mt-1 text-xs opacity-45">{t("canvasExtra.videoSeg.perClipHint")}</div>
                                </label>
                            </>
                        ) : (
                            <div className="text-xs opacity-45">{t("canvasExtra.videoSeg.extractOnlyHint")}</div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: theme.toolbar.border }}>
                        <div className="flex items-center gap-2">
                            <span className="opacity-60">{t("canvasExtra.videoSeg.duration")}</span>
                            <span>{durationSec ? formatSegmentTime(durationSec) : t("canvasExtra.videoSeg.unknown")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="opacity-60">{t("canvasExtra.videoSeg.start")}</span>
                            <InputNumber size="small" min={0} max={Math.max(0, durationSec - 0.1)} step={0.1} value={startSec} onChange={(value) => setStartSec(value ?? 0)} className="w-28" aria-label={t("canvasExtra.videoSeg.ariaClipStartSec")} />
                            <Button
                                size="small"
                                type="text"
                                icon={<SkipBack className="size-3.5" />}
                                aria-label={t("canvasExtra.videoSeg.jumpToStart")}
                                onClick={() => {
                                    if (videoRef.current) videoRef.current.currentTime = startSec;
                                }}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="opacity-60">{t("canvasExtra.videoSeg.end")}</span>
                            <InputNumber size="small" min={0} max={Math.max(0, durationSec)} step={0.1} value={endSec} onChange={(value) => setEndSec(value ?? 0)} className="w-28" aria-label={t("canvasExtra.videoSeg.ariaClipEndSec")} />
                            <Button
                                size="small"
                                type="text"
                                icon={<SkipForward className="size-3.5" />}
                                aria-label={t("canvasExtra.videoSeg.jumpToEnd")}
                                onClick={() => {
                                    if (videoRef.current) videoRef.current.currentTime = endSec;
                                }}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="opacity-60">{t("canvasExtra.videoSeg.clip")}</span>
                            <span>{formatSegmentTime((rangeMs.endMs - rangeMs.startMs) / 1000)}</span>
                        </div>
                        <Button
                            size="small"
                            disabled={!durationSec}
                            onClick={() => {
                                setStartSec(0);
                                setEndSec(durationSec);
                            }}
                        >
                            {t("canvasExtra.videoSeg.useAll")}
                        </Button>
                        <div className="w-full text-xs opacity-45">{t("canvasExtra.videoSeg.extractMp3Hint")}</div>
                    </div>
                )}

                <div className="flex items-center justify-end gap-2">
                    <Button onClick={onClose}>{t("canvasExtra.timeline.cancel")}</Button>
                    <Button type="primary" icon={<Check className="size-4" />} disabled={isVideoMode ? !segments.length : !durationSec} onClick={handleConfirm}>
                        {isVideoMode ? (createsGenerationNodes ? t("canvasExtra.videoSeg.extractNClipsAndCreate", { count: segments.length }) : t("canvasExtra.videoSeg.extractNClips", { count: segments.length })) : t("canvasExtra.videoSeg.extractAudio")}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

function videoOperationLabel(t: (key: Parameters<ReturnType<typeof useI18n>["t"]>[0]) => string, operation: CanvasVideoEditOperation) {
    const labels: Record<CanvasVideoEditOperation, string> = {
        text_to_video: t("canvasExtra.videoSeg.opTextToVideo"),
        image_to_video: t("canvasExtra.videoSeg.opImageToVideo"),
        reference_to_video: t("canvasExtra.videoSeg.opReferenceToVideo"),
        extend: t("canvasExtra.videoSeg.opExtend"),
        inpaint: t("canvasExtra.videoSeg.opInpaint"),
        replace_element: t("canvasExtra.videoSeg.opReplaceElement"),
        camera_motion: t("canvasExtra.videoSeg.opCameraMotion"),
        style_transfer: t("canvasExtra.videoSeg.opStyleTransfer"),
        audio_to_video: t("canvasExtra.videoSeg.opAudioToVideo"),
        compare_versions: t("canvasExtra.videoSeg.opCompareVersions"),
        concat: t("canvasExtra.videoSeg.opConcat"),
    };
    return labels[operation] || operation;
}

function formatSegmentTime(seconds: number) {
    const total = Math.max(0, seconds);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const rawSeconds = total % 60;
    const secs = rawSeconds % 1 === 0 ? String(Math.floor(rawSeconds)).padStart(2, "0") : rawSeconds.toFixed(1).padStart(4, "0");
    return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${secs}` : `${minutes}:${secs}`;
}
