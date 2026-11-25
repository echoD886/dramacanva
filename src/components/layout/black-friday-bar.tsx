import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import { Sparkles, Copy, Check, X, ArrowRight } from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";
import { usePrerenderTime } from "@/lib/prerender-state";
import { BLACK_FRIDAY, blackFridayClock, blackFridayHref } from "@/pages/pricing/black-friday";
import "./black-friday-bar.css";

export function BlackFridayBar({ href, onClose }: { href: string; onClose: () => void }) {
    const { t, number } = useI18n();
    const renderedAt = usePrerenderTime();
    const [now, setNow] = useState(() => renderedAt ?? Date.now());
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const update = () => setNow(Date.now());
        const timer = setInterval(update, 1000);
        const handleVisibility = () => {
            if (document.visibilityState === "visible") {
                update();
            }
        };
        document.addEventListener("visibilitychange", handleVisibility);
        return () => {
            clearInterval(timer);
            document.removeEventListener("visibilitychange", handleVisibility);
        };
    }, []);

    const handleCopy = useCallback(() => {
        if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
            return;
        }
        navigator.clipboard
            .writeText(BLACK_FRIDAY.code)
            .then(() => {
                setCopied(true);
                setTimeout(() => {
                    setCopied(false);
                }, 2000);
            })
            .catch(() => {
                // 失败静默
            });
    }, []);

    const clock = blackFridayClock(now);

    if (clock.status === "expired") {
        return null;
    }

    const daysStr = number(clock.days, { minimumIntegerDigits: 2, useGrouping: false });
    const hoursStr = number(clock.hours, { minimumIntegerDigits: 2, useGrouping: false });
    const minutesStr = number(clock.minutes, { minimumIntegerDigits: 2, useGrouping: false });
    const secondsStr = number(clock.seconds, { minimumIntegerDigits: 2, useGrouping: false });

    return (
        <aside className="ll-home-campaign" data-campaign="black-friday" aria-label={t("campaign.bf.label")}>
            <div className="ll-home-campaign-inner">
                <div className="ll-bf-left">
                    <div className={`ll-bf-badge${t("campaign.bf.badge").length > 4 ? " ll-bf-badge-long" : ""}`}>
                        <Sparkles className="ll-bf-badge-icon" aria-hidden="true" />
                        <span>{t("campaign.bf.badge")}</span>
                    </div>
                    <span className="ll-bf-discount">-{BLACK_FRIDAY.percentOff}%</span>
                    <div className="ll-bf-text-group">
                        <span className="ll-bf-headline">{t("campaign.bf.headline", { percent: BLACK_FRIDAY.percentOff })}</span>
                        <span className="ll-bf-terms">{t("campaign.bf.terms")}</span>
                    </div>
                </div>

                <div className="ll-bf-center">
                    <div className="ll-bf-countdown" role="timer" aria-label={t("campaign.bf.endsIn")}>
                        <span className="ll-bf-countdown-label">{t("campaign.bf.endsIn")}</span>
                        <div className="ll-bf-countdown-boxes">
                            <div className="ll-bf-countdown-box">
                                <span className="ll-bf-num">{daysStr}</span>
                                <span className="ll-bf-unit">{t("campaign.days")}</span>
                            </div>
                            <span className="ll-bf-countdown-colon" aria-hidden="true">
                                :
                            </span>
                            <div className="ll-bf-countdown-box">
                                <span className="ll-bf-num">{hoursStr}</span>
                                <span className="ll-bf-unit">{t("campaign.hours")}</span>
                            </div>
                            <span className="ll-bf-countdown-colon" aria-hidden="true">
                                :
                            </span>
                            <div className="ll-bf-countdown-box">
                                <span className="ll-bf-num">{minutesStr}</span>
                                <span className="ll-bf-unit">{t("campaign.minutes")}</span>
                            </div>
                            <span className="ll-bf-countdown-colon ll-bf-hide-mobile" aria-hidden="true">
                                :
                            </span>
                            <div className="ll-bf-countdown-box ll-bf-hide-mobile">
                                <span className="ll-bf-num">{secondsStr}</span>
                                <span className="ll-bf-unit">{t("campaign.seconds")}</span>
                            </div>
                        </div>
                    </div>

                    <div className="ll-bf-coupon">
                        <span className="ll-bf-coupon-label">{t("campaign.bf.codeLabel")}</span>
                        <code className="ll-bf-coupon-code">{BLACK_FRIDAY.code}</code>
                        <button type="button" className="ll-bf-coupon-copy" onClick={handleCopy} aria-live="polite" aria-label={copied ? t("campaign.bf.copied") : t("campaign.bf.copy")}>
                            {copied ? (
                                <>
                                    <Check className="ll-bf-copy-icon" aria-hidden="true" />
                                    <span className="ll-bf-copy-text">{t("campaign.bf.copied")}</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="ll-bf-copy-icon" aria-hidden="true" />
                                    <span className="ll-bf-copy-text">{t("campaign.bf.copy")}</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <div className="ll-bf-right">
                    <Link to={blackFridayHref(href)} className="ll-bf-cta">
                        <span>{t("campaign.bf.cta")}</span>
                        <ArrowRight className="ll-bf-cta-arrow" aria-hidden="true" />
                    </Link>
                    <button type="button" className="ll-bf-close" aria-label={t("campaign.bf.close")} onClick={onClose}>
                        <X className="ll-bf-close-icon" aria-hidden="true" />
                    </button>
                </div>
            </div>
        </aside>
    );
}
