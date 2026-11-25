import type { CSSProperties } from "react";
import "./canvas-file-upload.css";
import { AlertCircle, ImageUp, FileText, Film, Music2 } from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";
import { GenerationErrorCard } from "@/components/generation-error-card";
import { localizedGenerationError } from "@/i18n/generation-error";
import { CanvasNodeType, type CanvasNodeData } from "@/types/canvas";
import { uploadPreviewBlur, uploadVeilOpacity } from "@/lib/canvas/canvas-file-upload";
import { uploadPreviewUrl } from "@/services/canvas-upload-preview";
import type { CanvasTheme } from "@/lib/canvas-theme";
import { useCanvasNodeActions } from "./canvas-node-action-context";

export function CanvasFileUploadContent({ node, theme, reduceMotion = false }: { node: CanvasNodeData; theme: CanvasTheme; reduceMotion?: boolean }) {
    const { upload } = useCanvasNodeActions();
    const { t } = useI18n();
    const failed = node.metadata?.fileUpload === "error";
    const percent = node.metadata?.fileUploadProgress;
    const preview = uploadPreviewUrl(node.id);
    const label =
        node.type === CanvasNodeType.Image ? t("canvasRuntime.upload.image") : node.type === CanvasNodeType.Video ? t("canvasRuntime.upload.video") : node.type === CanvasNodeType.Audio ? t("canvasRuntime.upload.audio") : t("canvasRuntime.upload.text");
    const Icon = failed ? AlertCircle : node.type === CanvasNodeType.Video ? Film : node.type === CanvasNodeType.Audio ? Music2 : node.type === CanvasNodeType.Text ? FileText : ImageUp;
    if (failed)
        return (
            <div className="generation-node-error">
                <GenerationErrorCard compact error={{ ...node.metadata, code: node.metadata?.generationErrorCode || "reference_fetch_failed" }} actions={{ reference: () => upload?.(node) }} onRetry={() => upload?.(node)} />
            </div>
        );
    return (
        <div
            className="canvas-file-upload"
            data-preview={Boolean(preview) || undefined}
            data-static={reduceMotion || failed || undefined}
            style={{ "--upload-surface": theme.node.fill, "--upload-text": theme.node.text, "--upload-muted": theme.node.muted } as CSSProperties}
        >
            {preview &&
                (node.type === CanvasNodeType.Video ? (
                    <video className="canvas-file-upload-preview" src={preview} muted playsInline preload="metadata" aria-hidden style={{ filter: `blur(${uploadPreviewBlur(percent)}px)` }} />
                ) : (
                    <img className="canvas-file-upload-preview" src={preview} alt="" style={{ filter: `blur(${uploadPreviewBlur(percent)}px)` }} />
                ))}
            <div className="canvas-file-upload-glow" aria-hidden="true" style={{ opacity: uploadVeilOpacity(percent) }} />
            <div className="canvas-file-upload-frost" aria-hidden="true" style={{ opacity: uploadVeilOpacity(percent) }} />
            <div className="canvas-file-upload-copy" role="status" aria-live="polite" aria-busy={!failed}>
                <Icon className="size-5" aria-hidden="true" />
                <span className="canvas-file-upload-label">{failed ? t("canvasRuntime.upload.incomplete", { label }) : t("canvasRuntime.upload.uploading", { label })}</span>
                <span className="canvas-file-upload-detail">
                    {failed
                        ? node.metadata?.errorDetails
                            ? localizedGenerationError(node.metadata.errorDetails, t)
                            : t("canvasRuntime.upload.retry")
                        : percent === 100
                          ? t("canvasRuntime.upload.transferred")
                          : percent !== undefined
                            ? t("canvasRuntime.upload.progress", { percent })
                            : t("canvasRuntime.upload.preparing")}
                </span>
                {!failed && <span role="progressbar" aria-label={t("canvasRuntime.upload.ariaProgress", { label })} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="sr-only" />}
                {failed && upload ? (
                    <button
                        type="button"
                        data-canvas-no-zoom
                        className="canvas-file-upload-retry"
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                            event.stopPropagation();
                            upload(node);
                        }}
                    >
                        {t("canvasRuntime.upload.retry")}
                    </button>
                ) : null}
            </div>
        </div>
    );
}
