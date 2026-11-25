import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Modal, Button, message } from "antd";
import { Download, Share2, Sparkles, Plus, Users, X, CreditCard } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/i18n/use-i18n";
import { useActiveTheme } from "@/stores/canvas/use-canvas-theme-store";
import { getPaymentOptions } from "@/services/api/wallet";
import { trackOnboardingEvent } from "@/services/onboarding-analytics";
import { observeWorkflowVideo } from "@/services/creation-analytics";
import "./canvas-onboarding-celebration-dialog.css";

export type CanvasOnboardingCelebrationDialogProps = {
    open: boolean;
    onClose: () => void;
    videoUrl?: string;
    usedCredits: number;
    remainingCredits: number | null;
    onNextShot: () => void;
    onOpenStarterOffer: () => void;
    onOpenInvite: () => void;
};

export function CanvasOnboardingCelebrationDialog({ open, onClose, videoUrl, usedCredits, remainingCredits, onNextShot, onOpenStarterOffer, onOpenInvite }: CanvasOnboardingCelebrationDialogProps) {
    const { t, number } = useI18n();
    const activeTheme = useActiveTheme();
    const isDark = activeTheme === "dark";
    const videoRef = useRef<HTMLVideoElement>(null);
    const [downloading, setDownloading] = useState(false);
    const swipeStart = useRef<number | null>(null);
    const [swipeOffset, setSwipeOffset] = useState(0);

    const optionsQuery = useQuery({
        queryKey: ["payment-options", "trial-pack"],
        queryFn: getPaymentOptions,
        staleTime: 60_000,
        retry: false,
        enabled: open,
    });
    const trialProduct = optionsQuery.data?.products?.find((product) => product.kind === "credits" && product.sku === "credits_trial_990");
    const trialCredits = trialProduct?.creditsMicrocredits ? Math.round(trialProduct.creditsMicrocredits / 1_000_000) : undefined;

    const offerBannerText = trialCredits ? t("canvasTour.milestone.offerBannerWithCredits", { credits: trialCredits }) : t("canvasTour.milestone.offerBanner");

    useEffect(() => {
        if (open) {
            setSwipeOffset(0);
            trackOnboardingEvent("onboarding_milestone_viewed");
        }
    }, [open, videoUrl]);
    if (!open) return null;

    const handleDownload = async () => {
        if (!videoUrl) return;
        setDownloading(true);
        try {
            const response = await fetch(videoUrl);
            if (!response.ok) throw new Error("Video download failed");
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = blobUrl;
            a.download = `sayaction-short-film-${Date.now()}.mp4`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
            trackOnboardingEvent("onboarding_action_share", { action: "download" });
            trackOnboardingEvent("export_completed", { export_type: "finished_video", completion: "browser_handoff" });
        } catch {
            trackOnboardingEvent("export_failed", { export_type: "finished_video", failure_stage: "download" });
            // Direct open fallback if blob download is blocked
            window.open(videoUrl, "_blank", "noopener,noreferrer");
        } finally {
            setDownloading(false);
        }
    };

    const handleCopyLink = async () => {
        trackOnboardingEvent("onboarding_action_share", { action: "share" });
        try {
            if (videoUrl) {
                await navigator.clipboard.writeText(videoUrl);
                message.success(t("canvasTour.milestone.copiedLink"));
            }
        } catch {
            // Clipboard blocked
        }
    };

    const formattedUsed = number(usedCredits);
    const hasRemaining = remainingCredits !== null && Number.isFinite(remainingCredits);

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            centered
            width={580}
            destroyOnHidden
            className={`canvas-celebration-modal ${isDark ? "is-dark dark" : "is-light"}`}
            wrapClassName="canvas-celebration-wrap"
            style={{ "--celebration-drag-y": `${swipeOffset}px` } as CSSProperties}
            styles={{
                container: { padding: 0, borderRadius: "var(--celebration-radius, var(--r-3xl))", overflow: "hidden", background: "var(--popover)", color: "var(--foreground)", boxShadow: "var(--elevation-overlay)" },
                body: { padding: 0 },
                mask: { background: isDark ? "rgba(8, 10, 14, .72)" : "rgba(8, 10, 14, .62)", backdropFilter: "none" },
            }}
            closeIcon={null}
        >
            <div className="canvas-celebration-container">
                <div
                    className="canvas-celebration-drag-handle"
                    aria-hidden="true"
                    onPointerDown={(event) => { swipeStart.current = event.clientY; event.currentTarget.setPointerCapture(event.pointerId); }}
                    onPointerMove={(event) => { if (swipeStart.current !== null) setSwipeOffset(Math.max(0, event.clientY - swipeStart.current)); }}
                    onPointerUp={(event) => { if (swipeStart.current !== null && event.clientY - swipeStart.current >= 48) onClose(); swipeStart.current = null; setSwipeOffset(0); }}
                    onPointerCancel={() => { swipeStart.current = null; setSwipeOffset(0); }}
                ><span /></div>
                <button type="button" className="canvas-celebration-close" aria-label={t("canvasTour.milestone.close")} onClick={onClose}>
                    <X className="size-4" />
                </button>

                <div className="canvas-celebration-head">
                    <span className="canvas-celebration-badge">
                        <Sparkles className="size-3.5 text-amber-500" />
                        {t("coach.ready")}
                    </span>
                    <h2 className="canvas-celebration-title">{t("canvasTour.milestone.title")}</h2>
                    <p className="canvas-celebration-cost">
                        {t(hasRemaining ? "canvasTour.milestone.costSummary" : "canvasTour.milestone.usedCredits", {
                            used: formattedUsed,
                            remaining: hasRemaining ? number(remainingCredits!) : "",
                        })}
                    </p>
                </div>

                {videoUrl ? (
                    <div className="canvas-celebration-video-wrap">
                        <video ref={videoRef} src={videoUrl} autoPlay loop muted playsInline controls className="canvas-celebration-video" onCanPlay={(event) => observeWorkflowVideo(event.currentTarget, "video_preview_ready")} onPlaying={(event) => observeWorkflowVideo(event.currentTarget, "playback_started")} />
                    </div>
                ) : null}

                <div className="canvas-celebration-primary-actions">
                    <Button
                        type="primary"
                        icon={<Plus className="size-4" />}
                        className="canvas-celebration-btn-next-shot"
                        onClick={() => {
                            trackOnboardingEvent("onboarding_action_next_shot", { action: "next_shot" });
                            onClose();
                            onNextShot();
                        }}
                    >
                        {t("canvasTour.milestone.actionNextShot")}
                    </Button>
                    <div className="canvas-celebration-secondary-btns">
                        <Button icon={<Download className="size-4" />} loading={downloading} className="canvas-celebration-btn-secondary" onClick={handleDownload}>
                            {t("canvasTour.milestone.actionDownload")}
                        </Button>
                        <Button icon={<Share2 className="size-4" />} className="canvas-celebration-btn-secondary" onClick={handleCopyLink}>
                            {t("canvasTour.milestone.actionShare")}
                        </Button>
                    </div>
                </div>

                <div className="canvas-celebration-bottom-row">
                    <div
                        className="canvas-celebration-offer-banner"
                        onClick={() => {
                            trackOnboardingEvent("onboarding_pay_card_clicked", { sku: "credits_trial_990", price: 9.9 });
                            onOpenStarterOffer();
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                onOpenStarterOffer();
                            }
                        }}
                    >
                        <div className="canvas-celebration-offer-info">
                            <div className="canvas-celebration-offer-tag">
                                <CreditCard className="size-3.5 text-amber-500" />
                                <strong>{offerBannerText}</strong>
                            </div>
                            <span>{t("canvasTour.milestone.offerSub")}</span>
                        </div>
                        <Button size="small" autoInsertSpace={false} className="canvas-celebration-offer-btn">
                            {t("canvasTour.milestone.offerButton")}
                        </Button>
                    </div>

                    <div className="canvas-celebration-invite-row">
                        <button
                            type="button"
                            className="canvas-celebration-invite-link"
                            onClick={() => {
                                onClose();
                                onOpenInvite();
                            }}
                        >
                            <Users className="size-3.5" />
                            {t("canvasTour.milestone.actionInvite")}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
