import { Button, Modal } from "antd";
import { useI18n } from "@/i18n/use-i18n";

export function CanvasUploadSourceModal({ open, onClose, onComputer, onLibrary }: { open: boolean; onClose: () => void; onComputer: () => void; onLibrary: () => void }) {
    const { t } = useI18n();
    return (
        <Modal open={open} title={t("canvasTransfer.upload")} footer={null} width="min(360px, calc(100vw - 24px))" onCancel={onClose}>
            <div className="flex flex-col gap-3">
                <Button block onClick={onComputer}>
                    {t("canvasTransfer.fromComputer")}
                </Button>
                <Button block onClick={onLibrary}>
                    {t("canvasTransfer.fromLibrary")}
                </Button>
            </div>
        </Modal>
    );
}
