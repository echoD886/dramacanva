import { Modal, Button } from "antd";
import { Gift, Sparkles, X } from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";
import { useActiveTheme } from "@/stores/canvas/use-canvas-theme-store";
import "./canvas-inline-auth-dialog.css";

export type CanvasInlineAuthDialogProps = {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    credits?: number;
    loading?: boolean;
};

export function CanvasInlineAuthDialog({ open, onClose, onConfirm, credits, loading = false }: CanvasInlineAuthDialogProps) {
    const { t } = useI18n();
    const activeTheme = useActiveTheme();
    const isDark = activeTheme === "dark";

    const hasCredits = typeof credits === "number" && credits > 0;
    const title = hasCredits ? t("canvasTour.authDialog.titleWithCredits", { credits }) : t("canvasTour.authDialog.title");
    const desc = hasCredits ? t("canvasTour.authDialog.descWithCredits", { credits }) : t("canvasTour.authDialog.desc");

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            centered
            width={440}
            destroyOnHidden
            zIndex={2500}
            className={`canvas-inline-auth-modal ${isDark ? "is-dark dark" : "is-light"}`}
            styles={{
                container: {
                    padding: 0,
                    borderRadius: 16,
                    overflow: "hidden",
                    border: isDark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(0, 0, 0, 0.08)",
                    background: isDark ? "#1a1d24" : "#ffffff",
                    boxShadow: isDark ? "0 20px 48px rgba(0, 0, 0, 0.6)" : "0 20px 48px rgba(0, 0, 0, 0.12)",
                },
                body: {
                    padding: 0,
                    background: "transparent",
                },
            }}
            closeIcon={null}
        >
            <div className="canvas-inline-auth-content">
                <button type="button" className="canvas-inline-auth-close" aria-label={t("canvasTour.milestone.close")} onClick={onClose}>
                    <X className="size-4" />
                </button>

                <div className="canvas-inline-auth-header">
                    <div className="canvas-inline-auth-icon-wrap">
                        <Gift className="size-6 text-amber-500" />
                    </div>
                    <h3 className="canvas-inline-auth-title">{title}</h3>
                    <p className="canvas-inline-auth-desc">{desc}</p>
                </div>

                <div className="canvas-inline-auth-perks">
                    <div className="canvas-inline-auth-perk-item">
                        <Sparkles className="size-4 text-amber-500 shrink-0" />
                        <span>{hasCredits ? t("canvasTour.authDialog.perkCredits", { credits }) : t("canvasTour.authDialog.perkStarterCredits")}</span>
                    </div>
                    <div className="canvas-inline-auth-perk-item">
                        <span className="canvas-inline-auth-dot shrink-0" />
                        <span>{t("canvasTour.authDialog.perkNoCard")}</span>
                    </div>
                </div>

                <div className="canvas-inline-auth-actions">
                    <Button type="default" className="canvas-inline-auth-btn-cancel" onClick={onClose}>
                        {t("canvasTour.authDialog.exploreFirst")}
                    </Button>
                    <Button type="primary" loading={loading} className="canvas-inline-auth-btn-confirm" onClick={onConfirm}>
                        {t("canvasTour.authDialog.claimAndGenerate")}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
