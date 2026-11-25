import { Check, CheckCircle2, ChevronDown, CircleAlert, Download, Image as ImageIcon, LoaderCircle, RefreshCw, Video, WandSparkles } from "lucide-react";
import { type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GenerationErrorCard } from "@/components/generation-error-card";

import { useI18n } from "@/i18n/use-i18n";
import { getNodeInputKind } from "@/lib/canvas/node-registry";
import type { CanvasTheme } from "@/lib/canvas-theme";
import {
    createDefaultMediaConversionState,
    isLocalImageOperation,
    mediaConversionOperationDescription,
    mediaConversionOperationLabel,
    mediaConversionSourceFingerprint,
    MEDIA_CONVERSION_OPERATION_LABELS,
    type MediaConversionNodeState,
    type MediaConversionOperation,
} from "@/lib/media-conversion/contracts";
import { convertImageLocally, LocalImageConversionError } from "@/lib/media-conversion/local-converter";
import { getActiveUserScope } from "@/lib/user-scope";
import { runLocalDepthEstimation } from "@/services/depth-runtime";
import { runLocalLineartEstimation } from "@/services/lineart-runtime";
import { runLocalPoseEstimation } from "@/services/pose-runtime";
import { resolveImageUrl, setImageBlob } from "@/services/image-storage";
import { resolveMediaUrl } from "@/services/file-storage";
import { videoMetadata } from "@/lib/canvas/canvas-generation-task-sync";
import { LocalRuntimeClientError } from "@/services/local-runtime-session";
import { useLocalRuntimeStore } from "@/stores/use-local-runtime-store";
import { CanvasNodeType, type CanvasNodeData } from "@/types/canvas";

import { useCanvasNodeActions } from "../canvas-node-action-context";
import { useUpstreamNodes } from "../canvas-node-graph-context";

type MediaConversionNodeContentProps = {
    node: CanvasNodeData;
    theme: CanvasTheme;
};

const OPERATIONS = Object.keys(MEDIA_CONVERSION_OPERATION_LABELS) as MediaConversionOperation[];

export function MediaConversionNodeContent({ node, theme }: MediaConversionNodeContentProps) {
    const { t } = useI18n();
    const { updateMetadata, updateNode, upload } = useCanvasNodeActions();
    const upstream = useUpstreamNodes(node.id);
    const localRuntimeConnection = useLocalRuntimeStore((runtime) => runtime.connection);
    const localRuntimeConnecting = useLocalRuntimeStore((runtime) => runtime.connecting);
    const reconnectLocalRuntime = useLocalRuntimeStore((runtime) => runtime.connect);
    const mediaInputs = upstream.filter((item) => item.type === CanvasNodeType.Image || item.type === CanvasNodeType.Video);
    const input = mediaInputs[0];
    const inputKind = input ? getNodeInputKind(input.type) : undefined;
    const storedState = node.metadata?.mediaConversion;
    const state = storedState || createDefaultMediaConversionState();
    const currentFingerprint = input ? mediaConversionSourceFingerprint(input) : "";
    const hasMultipleInputs = mediaInputs.length > 1;
    const isStale = Boolean(state.status === "completed" && (!currentFingerprint || state.sourceFingerprint !== currentFingerprint));
    const status = isStale ? "stale" : state.status;
    const [sourceUrl, setSourceUrl] = useState("");
    const [resultUrl, setResultUrl] = useState("");
    const [showResult, setShowResult] = useState(status === "completed" || status === "stale");
    const [notice, setNotice] = useState("");
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        let active = true;
        const fallback = input?.type === CanvasNodeType.Video ? input.metadata?.content || "" : input?.metadata?.previewContent || input?.metadata?.content || "";
        setSourceUrl(fallback);
        if (!input?.metadata?.storageKey)
            return () => {
                active = false;
            };
        const resolver = input.type === CanvasNodeType.Image ? resolveImageUrl : resolveMediaUrl;
        void resolver(input.metadata.storageKey, fallback)
            .then((resolved) => {
                if (active) setSourceUrl(resolved || fallback);
            })
            .catch(() => {
                if (active) setSourceUrl(fallback);
            });
        return () => {
            active = false;
        };
    }, [input?.id, input?.metadata?.content, input?.metadata?.previewContent, input?.metadata?.storageKey, input?.type]);

    useEffect(() => {
        let active = true;
        setResultUrl(state.outputKind === "video" ? node.metadata?.content || "" : "");
        if (!state.resultStorageKey)
            return () => {
                active = false;
            };
        const resolveResult = state.outputKind === "video" ? resolveMediaUrl : resolveImageUrl;
        void resolveResult(state.resultStorageKey)
            .then((resolved) => {
                if (active) setResultUrl(resolved);
            })
            .catch(() => {
                if (active) setResultUrl("");
            });
        return () => {
            active = false;
        };
    }, [state.resultStorageKey, state.outputKind, node.metadata?.content]);

    useEffect(() => {
        if ((!updateNode && !updateMetadata) || !currentFingerprint || state.status !== "completed" || state.sourceFingerprint === currentFingerprint) return;
        const markStale = (current: MediaConversionNodeState | undefined) => {
            if (!current || current.status !== "completed") return current;
            if (current.sourceFingerprint === currentFingerprint) return current;
            return { ...current, status: "stale" as const, updatedAt: new Date().toISOString() };
        };
        // 用最新 metadata 判状态，避免异步 stale 写入覆盖正在 processing 的结果。
        if (updateNode) {
            updateNode(node.id, (current) => {
                const next = markStale(current.metadata?.mediaConversion);
                if (!next || next === current.metadata?.mediaConversion) return current;
                return { ...current, metadata: { ...current.metadata, mediaConversion: next } };
            });
            return;
        }
        updateMetadata?.(node.id, {
            mediaConversion: { ...state, status: "stale", updatedAt: new Date().toISOString() },
        });
    }, [currentFingerprint, node.id, state, updateMetadata, updateNode]);

    useEffect(() => {
        if (status === "stale") setShowResult(false);
    }, [status]);

    useEffect(() => () => abortRef.current?.abort(), []);

    const updateState = (patch: Partial<MediaConversionNodeState>) => {
        if (updateNode) {
            updateNode(node.id, (current) => ({
                ...current,
                metadata: {
                    ...current.metadata,
                    mediaConversion: {
                        ...(current.metadata?.mediaConversion || createDefaultMediaConversionState()),
                        ...patch,
                        schemaVersion: 1,
                    },
                },
            }));
            return;
        }
        updateMetadata?.(node.id, { mediaConversion: { ...state, ...patch, schemaVersion: 1 } });
    };

    const selectOperation = (operation: MediaConversionOperation) => {
        if (operation === state.operation) return;
        setNotice("");
        updateState({
            operation,
            status: state.resultStorageKey ? "stale" : "idle",
            errorCode: undefined,
            errorMessage: undefined,
            updatedAt: new Date().toISOString(),
        });
        setShowResult(false);
    };

    const run = async () => {
        setNotice("");
        if (!input || !currentFingerprint) {
            setNotice(t("canvasExtra.mediaConv.connectInputFirst"));
            return;
        }
        if (hasMultipleInputs) {
            setNotice(t("canvasExtra.mediaConv.onlyOneInput"));
            return;
        }
        if (inputKind === "video" && state.operation !== "depth") {
            updateState({ status: "unavailable", outputKind: "video", errorCode: "video_not_ready", errorMessage: t("canvasExtra.mediaConv.videoNotReady"), updatedAt: new Date().toISOString() });
            setNotice(t("canvasExtra.mediaConv.videoUnavailableNotice"));
            return;
        }
        if (!isLocalImageOperation(state.operation) && state.operation !== "depth" && state.operation !== "lineart" && state.operation !== "pose") {
            updateState({ status: "unavailable", outputKind: "image", errorCode: "model_missing", errorMessage: t("canvasExtra.mediaConv.modelMissing"), updatedAt: new Date().toISOString() });
            setNotice(mediaConversionOperationDescription(state.operation));
            return;
        }
        if (!sourceUrl) {
            updateState({ status: "error", errorCode: "source_unreadable", errorMessage: t("canvasExtra.mediaConv.previewNotReady"), updatedAt: new Date().toISOString() });
            setNotice(t("canvasExtra.mediaConv.previewNotReady"));
            return;
        }

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        const startedAt = new Date().toISOString();
        updateState({ status: "processing", sourceNodeId: input.id, sourceFingerprint: currentFingerprint, errorCode: undefined, errorMessage: undefined, startedAt, updatedAt: startedAt });
        try {
            if (inputKind === "video") {
                const { captureDepthFromNode } = await import("@/services/video-depth-capture");
                const uploaded = await captureDepthFromNode(input, (percent) => setNotice(`${percent}%`), controller.signal);
                controller.signal.throwIfAborted();
                const patch = {
                    ...videoMetadata(uploaded),
                    mediaConversion: {
                        ...state,
                        status: "completed" as const,
                        outputKind: "video" as const,
                        resultStorageKey: uploaded.storageKey,
                        sourceNodeId: input.id,
                        sourceFingerprint: currentFingerprint,
                        resultWidth: uploaded.width,
                        resultHeight: uploaded.height,
                        startedAt,
                        updatedAt: new Date().toISOString(),
                        errorCode: undefined,
                        errorMessage: undefined,
                    },
                };
                if (updateNode) updateNode(node.id, (current) => ({ ...current, metadata: { ...current.metadata, ...patch } }));
                else updateMetadata?.(node.id, patch);
                setResultUrl(uploaded.url);
                setShowResult(true);
                setNotice("");
                return;
            }
            const result =
                state.operation === "depth"
                    ? await runLocalDepthEstimation(sourceUrl, controller.signal)
                    : state.operation === "lineart"
                      ? await runLocalLineartEstimation(sourceUrl, controller.signal)
                      : state.operation === "pose"
                        ? await runLocalPoseEstimation(sourceUrl, controller.signal)
                        : await convertImageLocally(sourceUrl, state.operation, { signal: controller.signal, maxDimension: 1024 });
            if (controller.signal.aborted) return;
            const storageKey = localConversionStorageKey(node.id, currentFingerprint, state.operation);
            const url = await setImageBlob(storageKey, result.blob);
            const completedAt = new Date().toISOString();
            const detectedPeople = state.operation === "pose" && "personCount" in result && typeof result.personCount === "number" ? result.personCount : undefined;
            const completedPatch = {
                content: "",
                previewContent: "",
                storageKey,
                mimeType: result.blob.type || "image/png",
                bytes: result.blob.size,
                naturalWidth: result.width,
                naturalHeight: result.height,
            } as const;
            const completedConversion = {
                schemaVersion: 1 as const,
                operation: state.operation,
                status: "completed" as const,
                sourceNodeId: input.id,
                sourceFingerprint: currentFingerprint,
                outputKind: "image" as const,
                resultStorageKey: storageKey,
                resultWidth: result.width,
                resultHeight: result.height,
                ...(detectedPeople !== undefined ? { detectedPeople } : {}),
                errorCode: undefined,
                errorMessage: undefined,
                startedAt,
                updatedAt: completedAt,
            };
            if (updateNode) {
                updateNode(node.id, (current) => ({
                    ...current,
                    metadata: {
                        ...current.metadata,
                        ...completedPatch,
                        mediaConversion: {
                            ...(current.metadata?.mediaConversion || createDefaultMediaConversionState()),
                            ...completedConversion,
                        },
                    },
                }));
            } else {
                updateMetadata?.(node.id, {
                    ...completedPatch,
                    mediaConversion: {
                        ...state,
                        ...completedConversion,
                    },
                });
            }
            setResultUrl(url);
            setShowResult(true);
        } catch (error) {
            if (controller.signal.aborted) return;
            const aborted = error instanceof LocalImageConversionError && error.code === "aborted";
            if (aborted) return;
            if (error instanceof LocalRuntimeClientError) {
                if (error.code === "pose_no_person") {
                    updateState({ status: "skipped", errorCode: error.code, errorMessage: error.message, detectedPeople: 0, updatedAt: new Date().toISOString() });
                    setNotice(t("canvasExtra.mediaConv.noPersonNotice"));
                    return;
                }
                const nextStatus = ["depth_model_missing", "depth_runtime_unavailable", "lineart_model_missing", "lineart_runtime_unavailable", "pose_model_missing", "pose_runtime_unavailable"].includes(error.code) ? "unavailable" : "error";
                updateState({ status: nextStatus, errorCode: error.code, errorMessage: error.message, updatedAt: new Date().toISOString() });
                setNotice(
                    localRuntimeNotice(error, useLocalRuntimeStore.getState().connection, {
                        unreachable: t("canvasExtra.mediaConv.runtimeUnreachable"),
                        depthMissing: t("canvasExtra.mediaConv.depthMissing"),
                        lineartMissing: t("canvasExtra.mediaConv.lineartMissing"),
                        poseMissing: t("canvasExtra.mediaConv.poseMissing"),
                    }),
                );
                return;
            }
            const conversionError = error instanceof LocalImageConversionError ? error : new LocalImageConversionError("source_unreadable", t("canvasExtra.mediaConv.conversionFailedError"));
            const nextStatus = conversionError.code === "model_missing" ? "unavailable" : "error";
            updateState({ status: nextStatus, errorCode: conversionError.code, errorMessage: conversionError.message, updatedAt: new Date().toISOString() });
            setNotice(conversionError.message);
        }
    };

    const downloadResult = () => {
        if (!resultUrl) return;
        const link = document.createElement("a");
        link.href = resultUrl;
        link.download = `${node.title || t("canvasExtra.mediaConv.resultTitle")}-${state.operation}.${state.outputKind === "video" ? "mp4" : "png"}`;
        link.click();
    };

    const effectiveResult = Boolean(resultUrl && (status === "completed" || status === "stale"));
    const displayResult = showResult && effectiveResult;
    const buttonDisabled = !input || hasMultipleInputs || (state.videoDepthOnly && inputKind !== "video") || status === "processing";
    const statusText = mediaConversionStatusLabel(status, t);
    const previewStatusText = state.operation === "pose" && status === "completed" && typeof state.detectedPeople === "number" ? `${statusText} · ${t("canvasExtra.mediaConv.detectedPeople", { count: state.detectedPeople })}` : statusText;
    const showRuntimeRecovery =
        !state.videoDepthOnly &&
        inputKind !== "video" &&
        (state.operation === "depth" || state.operation === "lineart" || state.operation === "pose") &&
        (localRuntimeConnection === "unreachable" || state.errorCode === "depth_runtime_unavailable" || state.errorCode === "lineart_runtime_unavailable" || state.errorCode === "pose_runtime_unavailable");
    const retryLocalRuntime = async () => {
        setNotice("");
        await reconnectLocalRuntime();
        const next = useLocalRuntimeStore.getState();
        if (next.connection === "connected") {
            setNotice(t("canvasExtra.mediaConv.runtimeConnectedNotice"));
        } else {
            setNotice(next.error || t("canvasExtra.mediaConv.runtimeNotConnectedNotice"));
        }
    };

    if (node.metadata?.depthReferenceVideo && state.videoDepthOnly && status === "completed" && resultUrl) {
        return (
            <div className="group relative size-full overflow-hidden rounded-[inherit]" style={{ background: theme.node.panel }}>
                <video src={showResult ? resultUrl : sourceUrl} poster={showResult ? node.metadata.previewContent : undefined} className="size-full object-contain" controls playsInline preload="metadata" />
                <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100" data-canvas-no-zoom onPointerDown={(event) => event.stopPropagation()}>
                    <button type="button" className="rounded bg-black/75 px-2 py-1 text-xs text-white" onClick={() => setShowResult(!showResult)}>
                        {t(showResult ? "canvasExtra.mediaConv.original" : "canvasExtra.mediaConv.resultTitle")}
                    </button>
                    <button type="button" className="rounded bg-black/75 p-1 text-white" aria-label={t("canvasExtra.mediaConv.reConvert")} disabled={buttonDisabled} onClick={() => void run()}>
                        <RefreshCw size={16} />
                    </button>
                    <button type="button" className="rounded bg-black/75 p-1 text-white" aria-label={t("canvasExtra.mediaConv.downloadAria")} onClick={downloadResult}>
                        <Download size={16} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            className="flex h-full min-h-0 w-full flex-col gap-2.5 overflow-hidden rounded-[inherit] p-3"
            style={{ background: theme.node.panel, color: theme.node.text }}
            onPointerDown={(event) => event.stopPropagation()}
            onWheel={(event) => event.stopPropagation()}
        >
            <div className="flex min-w-0 items-center gap-2">
                <span className="grid size-8 shrink-0 place-items-center rounded-[var(--r-md)]" style={{ background: theme.toolbar.itemHover, color: theme.accent.primary }}>
                    <WandSparkles className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                    <div className="truncate text-[var(--fs-label)] font-semibold">{node.title || t("canvasExtra.mediaConv.nodeTitle")}</div>
                    <div className="truncate text-[var(--fs-tiny)]" style={{ color: theme.node.muted }}>
                        {state.videoDepthOnly ? t("canvasExtra.mediaConv.depthVideoHint") : t("canvasExtra.mediaConv.nodeSubtitle")}
                    </div>
                </div>
                <StatusBadge status={status} />
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-2">
                <div className="relative min-h-0 flex-1 overflow-hidden rounded-[var(--r-md)] border" style={{ borderColor: theme.node.edge, background: theme.node.fill }}>
                    {displayResult && state.outputKind === "video" ? (
                        <video src={resultUrl} className="absolute inset-0 size-full object-contain" controls preload="metadata" />
                    ) : displayResult ? (
                        <img src={resultUrl} alt={t("canvasExtra.mediaConv.resultAlt", { label: mediaConversionOperationLabel(state.operation) })} className="absolute inset-0 size-full object-contain" draggable={false} />
                    ) : input?.type === CanvasNodeType.Image && sourceUrl ? (
                        <img src={sourceUrl} alt={t("canvasExtra.mediaConv.inputAlt")} className="absolute inset-0 size-full object-contain" draggable={false} />
                    ) : input?.type === CanvasNodeType.Video && sourceUrl ? (
                        <video src={sourceUrl} className="absolute inset-0 size-full object-contain" controls preload="metadata" />
                    ) : (
                        <div className="absolute inset-0 grid place-items-center" style={{ color: theme.node.muted }}>
                            {input?.type === CanvasNodeType.Video ? <Video className="size-8 opacity-35" aria-hidden="true" /> : <ImageIcon className="size-8 opacity-35" aria-hidden="true" />}
                        </div>
                    )}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/75 to-transparent px-2.5 pb-2 pt-8 text-white">
                        <div className="min-w-0">
                            <div className="truncate text-[var(--fs-micro)] font-semibold">
                                {displayResult ? (status === "stale" ? t("canvasExtra.mediaConv.lastResultStale") : t("canvasExtra.mediaConv.result")) : input?.title || t("canvasExtra.mediaConv.waitingInput")}
                            </div>
                            <div className="mt-0.5 truncate text-[var(--fs-micro)] opacity-75">
                                {hasMultipleInputs
                                    ? t("canvasExtra.mediaConv.multipleInputs")
                                    : input
                                      ? `${input.type === CanvasNodeType.Video ? t("canvasExtra.mediaConv.kindVideo") : t("canvasExtra.mediaConv.kindImage")} · ${previewStatusText}`
                                      : t("canvasExtra.mediaConv.connectHint")}
                            </div>
                        </div>
                        {state.resultWidth && state.resultHeight && displayResult ? (
                            <span className="shrink-0 text-[var(--fs-micro)] tabular-nums">
                                {state.resultWidth} × {state.resultHeight}
                            </span>
                        ) : null}
                    </div>
                </div>

                {effectiveResult ? (
                    <div className="flex gap-1" data-canvas-no-zoom>
                        <PreviewToggle theme={theme} pressed={!showResult} label={t("canvasExtra.mediaConv.original")} onClick={() => setShowResult(false)} />
                        <PreviewToggle theme={theme} pressed={showResult} label={t("canvasExtra.mediaConv.result")} onClick={() => setShowResult(true)} />
                        <button
                            type="button"
                            aria-label={t("canvasExtra.mediaConv.downloadAria")}
                            title={t("canvasExtra.mediaConv.downloadAria")}
                            className="grid h-6 w-8 shrink-0 place-items-center rounded-[var(--r-sm)] outline-none transition hover:bg-black/5 focus-visible:ring-2 dark:hover:bg-white/10"
                            style={{ color: theme.node.muted, outlineColor: theme.accent.primary }}
                            onClick={(event) => {
                                event.stopPropagation();
                                downloadResult();
                            }}
                            onMouseDown={(event) => event.stopPropagation()}
                        >
                            <Download className="size-3.5" aria-hidden="true" />
                        </button>
                    </div>
                ) : null}
            </div>

            <div className="flex flex-col gap-3" data-canvas-no-zoom onWheel={(event) => event.stopPropagation()}>
                {!state.videoDepthOnly && <OperationPicker theme={theme} nodeId={node.id} value={state.operation} disabled={status === "processing"} onSelect={selectOperation} />}
                <button
                    type="button"
                    data-canvas-no-zoom
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--r-md)] px-4 text-[var(--fs-label)] font-semibold outline-none transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ background: theme.accent.primary, color: theme.accent.onPrimary, outlineColor: theme.accent.primary }}
                    disabled={buttonDisabled}
                    onClick={(event) => {
                        event.stopPropagation();
                        void run();
                    }}
                    onMouseDown={(event) => event.stopPropagation()}
                >
                    {status === "processing" ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
                    {status === "processing" ? t("canvasExtra.mediaConv.processing") : status === "completed" || status === "stale" ? t("canvasExtra.mediaConv.reConvert") : t("canvasExtra.mediaConv.startConvert")}
                </button>
            </div>

            {status === "error" ? (
                <GenerationErrorCard
                    compact
                    error={{ code: state.errorCode === "source_unreadable" ? "reference_fetch_failed" : state.errorCode, message: state.errorMessage }}
                    onRetry={() => void run()}
                    actions={{ reference: () => input && upload?.(input) }}
                />
            ) : null}
            <div className="flex min-h-4 items-center gap-2 text-[var(--fs-micro)]" style={{ color: status === "unavailable" || status === "skipped" ? "var(--status-warning)" : notice || status === "error" ? "var(--status-error)" : theme.node.muted }}>
                <span className="min-w-0 flex-1 truncate" title={status === "error" ? undefined : notice || mediaConversionOperationDescription(state.operation)}>
                    {status === "error" ? null : notice || (state.videoDepthOnly ? t("canvasExtra.mediaConv.depthVideoHint") : mediaConversionOperationDescription(state.operation))}
                </span>
                {showRuntimeRecovery ? (
                    <button
                        type="button"
                        className="shrink-0 rounded-[var(--r-sm)] px-1.5 py-0.5 font-semibold outline-none transition hover:bg-black/5 focus-visible:ring-2 dark:hover:bg-white/10"
                        style={{ color: theme.accent.primary, outlineColor: theme.accent.primary }}
                        disabled={localRuntimeConnecting}
                        onClick={(event) => {
                            event.stopPropagation();
                            void retryLocalRuntime();
                        }}
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        {localRuntimeConnecting ? t("canvasExtra.mediaConv.connecting") : t("canvasExtra.mediaConv.retryConnect")}
                    </button>
                ) : null}
            </div>
        </div>
    );
}

function PreviewToggle({ theme, pressed, label, onClick }: { theme: CanvasTheme; pressed: boolean; label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            aria-pressed={pressed}
            className="h-7 flex-1 rounded-[var(--r-sm)] px-2 text-[var(--fs-micro)] font-medium outline-none transition focus-visible:ring-2"
            style={{ background: pressed ? theme.accent.primary : "color-mix(in oklch, var(--foreground-muted) 10%, transparent)", color: pressed ? theme.accent.onPrimary : "var(--foreground-muted)", outlineColor: theme.accent.primary }}
            onClick={(event) => {
                event.stopPropagation();
                onClick();
            }}
            onMouseDown={(event) => event.stopPropagation()}
        >
            {label}
        </button>
    );
}

const OPERATION_MENU_GAP = 8;
const OPERATION_MENU_MARGIN = 8;
const OPERATION_MENU_ITEM_HEIGHT = 44;

function OperationPicker({ theme, nodeId, value, disabled, onSelect }: { theme: CanvasTheme; nodeId: string; value: MediaConversionOperation; disabled: boolean; onSelect: (operation: MediaConversionOperation) => void }) {
    const { t } = useI18n();
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [position, setPosition] = useState<{ left: number; top: number; width: number; maxHeight: number } | null>(null);
    const selectedLabel = mediaConversionOperationLabel(value);

    const updatePosition = () => {
        const rect = triggerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const menuWidth = Math.max(280, Math.round(rect.width));
        const menuHeight = Math.min(300, OPERATIONS.length * OPERATION_MENU_ITEM_HEIGHT + 40);
        const spaceBelow = window.innerHeight - rect.bottom - OPERATION_MENU_MARGIN;
        const spaceAbove = rect.top - OPERATION_MENU_MARGIN;
        const openAbove = spaceBelow < menuHeight + OPERATION_MENU_GAP || spaceAbove >= spaceBelow;
        const maxLeft = Math.max(OPERATION_MENU_MARGIN, window.innerWidth - menuWidth - OPERATION_MENU_MARGIN);
        const maxTop = Math.max(OPERATION_MENU_MARGIN, window.innerHeight - menuHeight - OPERATION_MENU_MARGIN);
        const left = Math.min(Math.max(OPERATION_MENU_MARGIN, rect.left), maxLeft);
        const top = openAbove ? Math.max(OPERATION_MENU_MARGIN, rect.top - menuHeight - OPERATION_MENU_GAP) : Math.min(Math.max(OPERATION_MENU_MARGIN, rect.bottom + OPERATION_MENU_GAP), maxTop);
        setPosition({ left, top, width: menuWidth, maxHeight: menuHeight });
    };

    useLayoutEffect(() => {
        if (open) updatePosition();
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const close = (event: PointerEvent) => {
            const target = event.target instanceof Node ? event.target : null;
            if (target && (triggerRef.current?.contains(target) || menuRef.current?.contains(target))) return;
            setOpen(false);
        };
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };
        const reposition = () => updatePosition();
        document.addEventListener("pointerdown", close, true);
        document.addEventListener("keydown", closeOnEscape, true);
        window.addEventListener("resize", reposition);
        window.addEventListener("scroll", reposition, true);
        return () => {
            document.removeEventListener("pointerdown", close, true);
            document.removeEventListener("keydown", closeOnEscape, true);
            window.removeEventListener("resize", reposition);
            window.removeEventListener("scroll", reposition, true);
        };
    }, [open]);

    const menuStyle: CSSProperties | undefined = position
        ? {
              left: position.left,
              top: position.top,
              width: position.width,
              maxHeight: position.maxHeight,
              background: theme.node.panel,
              borderColor: theme.node.edge,
              color: theme.node.text,
              boxShadow: "0 16px 40px rgba(0,0,0,.28), 0 0 0 1px rgba(255,255,255,.06)",
          }
        : undefined;

    const menu =
        open && position && typeof document !== "undefined"
            ? createPortal(
                  <>
                      <div
                          className="fixed inset-0 z-[calc(var(--z-toast)-1)]"
                          aria-hidden="true"
                          onMouseDown={(event) => {
                              event.stopPropagation();
                              setOpen(false);
                          }}
                          onPointerDown={(event) => event.stopPropagation()}
                      />
                      <div
                          ref={menuRef}
                          id={`${nodeId}-operation-menu`}
                          role="listbox"
                          aria-label={t("canvasExtra.mediaConv.menuAria")}
                          data-canvas-no-zoom
                          className="fixed z-[var(--z-toast)] overflow-hidden rounded-[var(--r-lg)] border"
                          style={menuStyle}
                          onMouseDown={(event) => event.stopPropagation()}
                          onPointerDown={(event) => event.stopPropagation()}
                          onWheel={(event) => event.stopPropagation()}
                      >
                          <div className="border-b px-3 py-2 text-[var(--fs-micro)] font-semibold" style={{ borderColor: theme.node.edge, color: theme.node.muted }}>
                              {t("canvasExtra.mediaConv.selectOperation")}
                          </div>
                          <div className="thin-scrollbar overflow-y-auto p-1" style={{ maxHeight: Math.max(0, position.maxHeight - 36) }}>
                              {OPERATIONS.map((operation) => {
                                  const selected = operation === value;
                                  return (
                                      <button
                                          key={operation}
                                          type="button"
                                          role="option"
                                          aria-selected={selected}
                                          className="flex w-full min-w-0 items-center gap-2 rounded-[var(--r-md)] px-2.5 py-2 text-left transition"
                                          style={{ background: selected ? theme.toolbar.itemHover : "transparent", color: selected ? theme.toolbar.activeText : theme.node.text }}
                                          onMouseEnter={(event) => {
                                              event.currentTarget.style.background = theme.toolbar.itemHover;
                                          }}
                                          onMouseLeave={(event) => {
                                              event.currentTarget.style.background = selected ? theme.toolbar.itemHover : "transparent";
                                          }}
                                          onClick={() => {
                                              onSelect(operation);
                                              setOpen(false);
                                          }}
                                      >
                                          <span className="min-w-0 flex-1">
                                              <span className="block text-[var(--fs-tiny)] font-semibold leading-5">{mediaConversionOperationLabel(operation)}</span>
                                              <span className="mt-0.5 block text-[var(--fs-micro)] leading-relaxed" style={{ color: theme.node.muted }}>
                                                  {mediaConversionOperationDescription(operation)}
                                              </span>
                                          </span>
                                          {selected ? <Check className="size-3.5 shrink-0" aria-hidden="true" /> : null}
                                      </button>
                                  );
                              })}
                          </div>
                      </div>
                  </>,
                  document.body,
              )
            : null;

    return (
        <div className={`relative ${open ? "z-[var(--z-toast)]" : ""}`}>
            <div className="mb-1.5 px-0.5 text-[var(--fs-micro)] font-medium" style={{ color: theme.node.muted }}>
                {t("canvasExtra.mediaConv.operationLabel")}
            </div>
            <button
                ref={triggerRef}
                id={`${nodeId}-operation`}
                type="button"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={open ? `${nodeId}-operation-menu` : undefined}
                disabled={disabled}
                data-canvas-no-zoom
                className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-[var(--r-md)] border px-2.5 text-left outline-none transition hover:brightness-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                    borderColor: open ? theme.accent.primary : theme.node.edge,
                    background: open ? theme.toolbar.itemHover : theme.node.fill,
                    color: theme.node.text,
                    outlineColor: theme.accent.primary,
                    boxShadow: open ? `0 0 0 1px color-mix(in oklch, ${theme.accent.primary} 35%, transparent)` : undefined,
                }}
                onClick={() => {
                    if (!disabled) setOpen((current) => !current);
                }}
                onMouseDown={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
            >
                <span className="min-w-0 flex-1 truncate text-[var(--fs-tiny)] font-semibold">{selectedLabel}</span>
                <span
                    className="grid size-7 shrink-0 place-items-center rounded-[var(--r-sm)] border"
                    style={{
                        borderColor: open ? theme.accent.primary : theme.node.edge,
                        background: theme.node.panel,
                        color: open ? theme.accent.primary : theme.node.muted,
                    }}
                    aria-hidden="true"
                >
                    <ChevronDown className={`size-3.5 transition ${open ? "rotate-180" : ""}`} />
                </span>
            </button>
            {menu}
        </div>
    );
}

function StatusBadge({ status }: { status: MediaConversionNodeState["status"] | "stale" }) {
    const { t } = useI18n();
    if (status === "processing")
        return (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[var(--fs-micro)] font-semibold" style={{ color: "var(--status-info)", background: "color-mix(in oklch, var(--status-info) 15%, transparent)" }}>
                <LoaderCircle className="size-3 animate-spin" aria-hidden="true" />
                {t("canvasExtra.mediaConv.statusProcessing")}
            </span>
        );
    if (status === "completed")
        return (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[var(--fs-micro)] font-semibold" style={{ color: "var(--status-success)", background: "color-mix(in oklch, var(--status-success) 15%, transparent)" }}>
                <CheckCircle2 className="size-3" aria-hidden="true" />
                {t("canvasExtra.mediaConv.statusCompleted")}
            </span>
        );
    if (status === "stale")
        return (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[var(--fs-micro)] font-semibold" style={{ color: "var(--status-warning)", background: "color-mix(in oklch, var(--status-warning) 15%, transparent)" }}>
                <RefreshCw className="size-3" aria-hidden="true" />
                {t("canvasExtra.mediaConv.statusStale")}
            </span>
        );
    if (status === "error")
        return (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[var(--fs-micro)] font-semibold" style={{ color: "var(--status-error)", background: "color-mix(in oklch, var(--status-error) 15%, transparent)" }}>
                <CircleAlert className="size-3" aria-hidden="true" />
                {t("canvasExtra.mediaConv.statusFailed")}
            </span>
        );
    if (status === "unavailable")
        return (
            <span className="inline-flex shrink-0 items-center rounded-full px-2 py-1 text-[var(--fs-micro)] font-semibold" style={{ color: "var(--status-warning)", background: "color-mix(in oklch, var(--status-warning) 15%, transparent)" }}>
                {t("canvasExtra.mediaConv.statusUnavailable")}
            </span>
        );
    if (status === "skipped")
        return (
            <span className="inline-flex shrink-0 items-center rounded-full px-2 py-1 text-[var(--fs-micro)] font-semibold" style={{ color: "var(--status-warning)", background: "color-mix(in oklch, var(--status-warning) 15%, transparent)" }}>
                {t("canvasExtra.mediaConv.statusSkipped")}
            </span>
        );
    return (
        <span className="inline-flex shrink-0 items-center rounded-full px-2 py-1 text-[var(--fs-micro)] font-semibold" style={{ color: "var(--foreground-muted)", background: "color-mix(in oklch, var(--foreground-muted) 12%, transparent)" }}>
            {t("canvasExtra.mediaConv.statusIdle")}
        </span>
    );
}

function mediaConversionStatusLabel(status: MediaConversionNodeState["status"] | "stale", t: ReturnType<typeof useI18n>["t"]) {
    if (status === "processing") return t("canvasExtra.mediaConv.labelProcessing");
    if (status === "completed") return t("canvasExtra.mediaConv.labelCompleted");
    if (status === "stale") return t("canvasExtra.mediaConv.labelStale");
    if (status === "unavailable") return t("canvasExtra.mediaConv.labelUnavailable");
    if (status === "skipped") return t("canvasExtra.mediaConv.labelSkipped");
    if (status === "error") return t("canvasExtra.mediaConv.labelFailed");
    return t("canvasExtra.mediaConv.labelNotStarted");
}

function localRuntimeNotice(error: LocalRuntimeClientError, connection: ReturnType<typeof useLocalRuntimeStore.getState>["connection"], copy: { unreachable: string; depthMissing: string; lineartMissing: string; poseMissing: string }) {
    if (connection === "unreachable") return copy.unreachable;
    if (error.code === "depth_model_missing") return copy.depthMissing;
    if (error.code === "lineart_model_missing") return copy.lineartMissing;
    if (error.code === "pose_model_missing") return copy.poseMissing;
    return error.message;
}

function localConversionStorageKey(nodeId: string, fingerprint: string, operation: MediaConversionOperation) {
    return `image:${getActiveUserScope()}:media-conversion:${nodeId}:${fingerprint}:${operation}`;
}
