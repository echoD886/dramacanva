import { useState } from "react";
import { Camera } from "lucide-react";

import { AppModal } from "@/components/ui/product/app-modal/app-modal";
import type { CanvasTheme } from "@/lib/canvas-theme";
import type { CameraControlOptions } from "@/lib/canvas/camera-prompt-library";
import { CanvasNodeCameraPanel } from "./canvas-node-camera-dialog";
import { useI18n } from "@/i18n/use-i18n";

type CanvasCameraControlPopoverProps = {
    cameraControl?: CameraControlOptions;
    onCameraControlChange: (options: CameraControlOptions) => void;
    theme: CanvasTheme;
    compact?: boolean;
};

export function CanvasCameraControlPopover({ cameraControl, onCameraControlChange, theme, compact = false }: CanvasCameraControlPopoverProps) {
    const { t } = useI18n();
    const [open, setOpen] = useState(false);
    const cameraEnabled = cameraControl?.enabled === true;
    return (
        <>
            <button
                type="button"
                className={`canvas-node-composer-camera-tools-trigger inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 text-[var(--fs-tiny)] transition-colors ${compact ? "is-compact h-7" : "h-8"}`}
                style={{
                    background: cameraEnabled ? `${theme.node.activeStroke}66` : theme.node.fill,
                    color: cameraEnabled ? theme.node.panel : theme.node.text,
                }}
                aria-pressed={cameraEnabled}
                aria-label={t("canvasExtra.cameraControl.title")}
                title={cameraEnabled ? t("canvasExtra.cameraControl.enabledTitle") : t("canvasExtra.cameraControl.title")}
                onClick={() => setOpen(true)}
            >
                <Camera className="size-3.5" />
                {!compact ? <span>{t("canvasExtra.cameraControl.camera")}</span> : null}
            </button>
            {open ? (
                <AppModal title={null} closable={false} open centered footer={null} width={780} flush onCancel={() => setOpen(false)}>
                    <CanvasNodeCameraPanel
                        cameraControl={cameraControl}
                        onClose={() => setOpen(false)}
                        onConfirm={(options) => {
                            onCameraControlChange(options);
                            setOpen(false);
                        }}
                    />
                </AppModal>
            ) : null}
        </>
    );
}
