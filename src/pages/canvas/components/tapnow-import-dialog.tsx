import { App, Button, Input, Modal, Tag } from "antd";
import { CircleAlert, ExternalLink, Import, LoaderCircle } from "lucide-react";
import { useMemo, useState } from "react";

import { useI18n } from "@/i18n/use-i18n";
import { GenerationErrorCard } from "@/components/generation-error-card";
import { formatTapNowBatchTime, parseTapNowShareID } from "@/lib/canvas/tapnow-import";
import { importTapNowCanvas, type TapNowImportResult } from "@/services/api/tapnow";
import { CanvasNodeType, type CanvasConnection, type CanvasNodeData, type ViewportTransform } from "@/types/canvas";

type Props = {
    open: boolean;
    projectId: string;
    viewport: ViewportTransform;
    viewportSize: { width: number; height: number };
    onClose: () => void;
    onApply: (nodes: CanvasNodeData[], connections: CanvasConnection[]) => Promise<void>;
};

function buildCanvasNodes(result: TapNowImportResult, viewport: ViewportTransform, viewportSize: { width: number; height: number }) {
    const minX = Math.min(...result.nodes.map((node) => node.x));
    const minY = Math.min(...result.nodes.map((node) => node.y));
    const maxX = Math.max(...result.nodes.map((node) => node.x + node.width));
    const maxY = Math.max(...result.nodes.map((node) => node.y + node.height));
    const offsetX = (viewportSize.width / 2 - viewport.x) / viewport.k - (minX + maxX) / 2;
    const offsetY = (viewportSize.height / 2 - viewport.y) / viewport.k - (minY + maxY) / 2;
    return result.nodes.map<CanvasNodeData>((node) => ({
        id: node.id,
        type: node.type === "video" ? CanvasNodeType.Video : node.type === "audio" ? CanvasNodeType.Audio : node.type === "text" ? CanvasNodeType.Text : CanvasNodeType.Image,
        title: node.title,
        position: { x: node.x + offsetX, y: node.y + offsetY },
        width: node.width,
        height: node.height,
        metadata: {
            content: node.content,
            prompt: node.prompt,
            model: node.model,
            size: node.size,
            quality: node.quality,
            seconds: node.seconds,
            vquality: node.vquality,
            generateAudio: node.generateAudio,
            status: node.status || "idle",
            errorDetails: node.errorDetails,
            naturalWidth: node.naturalWidth,
            naturalHeight: node.naturalHeight,
            durationMs: node.durationMs,
            mimeType: node.mimeType,
            importSource: node.metadata,
        },
    }));
}

export function TapNowImportDialog({ open, projectId, viewport, viewportSize, onClose, onApply }: Props) {
    const { message } = App.useApp();
    const { t } = useI18n();
    const [value, setValue] = useState("");
    const [loading, setLoading] = useState(false);
    const [failure, setFailure] = useState<unknown>(null);
    const [result, setResult] = useState<TapNowImportResult | null>(null);
    const shareID = useMemo(() => parseTapNowShareID(value), [value]);

    const reset = () => {
        setValue("");
        setResult(null);
        setFailure(null);
    };

    const close = () => {
        if (loading) return;
        reset();
        onClose();
    };

    const changeValue = (nextValue: string) => {
        setValue(nextValue);
        setResult(null);
    };

    const load = async () => {
        if (!shareID) {
            message.error(t("canvasRuntime.import.invalidTapNow"));
            return;
        }
        setLoading(true);
        setFailure(null);
        try {
            setResult(await importTapNowCanvas(projectId, shareID));
        } catch (error) {
            setFailure(error);
        } finally {
            setLoading(false);
        }
    };

    const apply = async () => {
        if (!result) return;
        setLoading(true);
        setFailure(null);
        try {
            await onApply(buildCanvasNodes(result, viewport, viewportSize), result.connections);
            reset();
            onClose();
            message.success(t("canvasRuntime.import.imported", { nodes: result.importedNodeCount, connections: result.importedConnectionCount }));
        } catch (error) {
            setFailure(error);
        } finally {
            setLoading(false);
        }
    };

    const hasWarnings = result ? Boolean(result.skippedNodes.length || result.skippedConnections.length || result.multiResultNodeCount || result.reusedFailedNodeCount || result.placeholderNodeCount || result.warnings.length) : false;

    return (
        <Modal
            className="workspace-modal"
            open={open}
            onCancel={close}
            title={t("canvasRuntime.import.title", { platform: "TapNow" })}
            width={620}
            footer={
                result ? (
                    [
                        <Button key="close" onClick={close}>
                            {t("canvasRuntime.import.close")}
                        </Button>,
                        <Button key="apply" type="primary" icon={<Import className="size-4" />} loading={loading} onClick={() => void apply()}>
                            {t("canvasRuntime.import.confirm")}
                        </Button>,
                    ]
                ) : (
                    <Button type="primary" loading={loading} onClick={() => void load()}>
                        {t("canvasRuntime.import.read")}
                    </Button>
                )
            }
        >
            {failure ? <GenerationErrorCard error={failure} onRetry={() => void (result ? apply() : load())} retrying={loading} /> : null}
            <div className="space-y-4">
                <div>
                    <label className="mb-2 block text-sm font-medium">{t("canvasRuntime.import.tapNowLabel")}</label>
                    <Input
                        value={value}
                        onChange={(event) => changeValue(event.target.value)}
                        placeholder={t("canvasRuntime.import.tapNowPlaceholder")}
                        disabled={loading}
                        suffix={shareID && value !== shareID ? <ExternalLink className="size-4 text-foreground/35" /> : null}
                    />
                </div>
                {loading && !result ? (
                    <div className="flex items-center gap-2 text-sm text-foreground/55">
                        <LoaderCircle className="size-4 animate-spin" />
                        {t("canvasRuntime.import.loading", { platform: "TapNow" })}
                    </div>
                ) : null}
                {result ? (
                    <div className="space-y-3">
                        <div className="rounded-xl p-4" style={{ background: "var(--library-surface)" }}>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <div className="text-sm font-semibold">{result.projectName || t("canvasRuntime.import.title", { platform: "TapNow" })}</div>
                                    <div className="mt-1 text-sm text-foreground/60">{t("canvasRuntime.import.importable", { nodes: result.importedNodeCount, connections: result.importedConnectionCount })}</div>
                                </div>
                                <Tag color="blue">{t("canvasRuntime.import.batch", { time: formatTapNowBatchTime(result.batchCreatedAt) })}</Tag>
                            </div>
                            <div className="mt-3 text-xs leading-5 text-foreground/50">{t("canvasRuntime.import.tapNowDescription")}</div>
                        </div>
                        {hasWarnings ? (
                            <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs leading-5 text-foreground/60" style={{ background: "var(--surface-hover)" }}>
                                <CircleAlert className="mt-0.5 size-4 shrink-0" />
                                <div>
                                    {result.skippedNodes.length ? <div>{t("canvasRuntime.import.unsupportedNodes", { count: result.skippedNodes.length })}</div> : null}
                                    {!result.skippedNodes.length && result.skippedConnections.length ? <div>{t("canvasRuntime.import.invalidConnections", { count: result.skippedConnections.length })}</div> : null}
                                    {result.reusedFailedNodeCount ? <div>{t("canvasRuntime.import.reusedFailed", { count: result.reusedFailedNodeCount })}</div> : null}
                                    {result.placeholderNodeCount ? <div>{t("canvasRuntime.import.placeholders", { count: result.placeholderNodeCount })}</div> : null}
                                    {result.multiResultNodeCount ? <div>{t("canvasRuntime.import.firstResult", { count: result.multiResultNodeCount })}</div> : null}
                                    {result.warnings.map((warning, index) => (
                                        <div key={`${warning.id || "warning"}-${index}`}>{warning.message}</div>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                        <div className="flex flex-wrap gap-2">
                            <Tag>{t("canvasRuntime.import.waiting")}</Tag>
                        </div>
                    </div>
                ) : null}
            </div>
        </Modal>
    );
}
