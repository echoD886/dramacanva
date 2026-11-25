import { useCallback, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { Link } from "react-router";
import { AnnualCountdown, AnnualOfferCopy, useAnnualOffer } from "@/components/payments/annual-offer";
import { annualCampaignHref } from "@/pages/pricing/annual-campaign";
import "./annual-campaign.css";
import { BlackFridayBar } from "./black-friday-bar";
import { blackFridayActive } from "@/pages/pricing/black-friday";
import { usePrerenderTime } from "@/lib/prerender-state";
import { useI18n } from "@/i18n/use-i18n";
import { useHydrated } from "@/lib/prerender-state";

const CAMPAIGN_DISMISSED_KEY = "sayaction.black-friday-2026.dismissed";

export function useLibTVCampaignVisibility() {
    const hydrated = useHydrated();
    const [campaignOpen, setCampaignOpen] = useState(() => {
        try {
            return typeof window === "undefined" || window.sessionStorage.getItem(CAMPAIGN_DISMISSED_KEY) !== "1";
        } catch {
            return true;
        }
    });
    const dismissCampaign = useCallback(() => {
        try {
            window.sessionStorage.setItem(CAMPAIGN_DISMISSED_KEY, "1");
        } catch {
            /* Current view still dismisses. */
        }
        setCampaignOpen(false);
    }, []);
    return { campaignOpen: !hydrated || campaignOpen, dismissCampaign };
}

export function LibTVCampaignBar({ href, onClose }: { href: string; onClose: () => void }) {
    const renderedAt = usePrerenderTime();
    return blackFridayActive(renderedAt ?? Date.now()) ? <BlackFridayBar href={href} onClose={onClose} /> : <AnnualCampaignBar href={href} onClose={onClose} />;
}

function AnnualCampaignBar({ href, onClose }: { href: string; onClose: () => void }) {
    const { t } = useI18n();
    const { clock, quote } = useAnnualOffer();

    return (
        <aside className="ll-home-campaign" data-billing-unit="credits" aria-label={t("campaign.label")}>
            <div className="ll-home-campaign-inner">
                <span className="ll-home-countdown">
                    <Sparkles aria-hidden="true" />
                    <AnnualCountdown clock={clock} />
                </span>
                <AnnualOfferCopy quote={quote} />
                <span className="ll-home-campaign-actions">
                    <Link to={annualCampaignHref(href, quote)}>{t("campaign.valueCta")}</Link>
                    <button type="button" aria-label={t("campaign.close")} onClick={onClose}>
                        <X aria-hidden />
                    </button>
                </span>
            </div>
        </aside>
    );
}
