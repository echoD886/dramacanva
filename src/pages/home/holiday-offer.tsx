import { useEffect, useState } from "react";
import { Link } from "react-router";
import { X } from "lucide-react";

import { useI18n } from "@/i18n/use-i18n";
import { localizedPublicPath } from "@/i18n/locale-routing";
import type { BlogLocale } from "@/content/blog-locales";
import { holidayOfferCopy } from "./holiday-offer-copy";

import "./holiday-offer.css";

export type HolidayOffer = {
    id: string;
    startsAt: string;
    endsAt: string;
    promotionCode: string;
    percentOff: number;
    name: string;
};

// A campaign is invisible until its live Stripe promotion code is configured.
// Stripe owns the discount, first-purchase restriction, and redemption expiry.
export const HOLIDAY_OFFERS: readonly HolidayOffer[] = [
    { id: "halloween-2026", startsAt: "2026-10-25T00:00:00Z", endsAt: "2026-11-01T00:00:00Z", promotionCode: "", percentOff: 15, name: "Halloween" },
    { id: "black-friday-2026", startsAt: "2026-11-23T00:00:00Z", endsAt: "2026-12-01T00:00:00Z", promotionCode: "", percentOff: 15, name: "Black Friday" },
    { id: "holiday-2026", startsAt: "2026-12-20T00:00:00Z", endsAt: "2027-01-02T00:00:00Z", promotionCode: "", percentOff: 15, name: "Holiday season" },
];

export function activeHolidayOffer(now = Date.now(), offers: readonly HolidayOffer[] = HOLIDAY_OFFERS): HolidayOffer | null {
    return offers.find((offer) => Boolean(offer.promotionCode.trim()) && offer.percentOff > 0 && now >= Date.parse(offer.startsAt) && now < Date.parse(offer.endsAt)) ?? null;
}

export function HolidayOfferDialog() {
    const { locale } = useI18n();
    const copy = holidayOfferCopy(locale);
    const offer = activeHolidayOffer();
    const key = offer ? `sayaction.holiday.${offer.id}.dismissed` : "";
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!offer) return;
        try { setOpen(window.localStorage.getItem(key) !== "1"); } catch { setOpen(true); }
    }, [key, offer]);

    const dismiss = () => {
        try { window.localStorage.setItem(key, "1"); } catch { /* Current view still closes. */ }
        setOpen(false);
    };

    useEffect(() => {
        if (!open) return;
        const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") dismiss(); };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, key]);

    if (!offer || !open) return null;
    const eventName = copy.eventNames[offer.id] ?? offer.name;
    return (
        <div className="sa-holiday-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) dismiss(); }}>
            <section className="sa-holiday-dialog" role="dialog" aria-modal="true" aria-label={`${eventName} ${copy.limitedOffer}`}>
                <div className="sa-holiday-art" aria-hidden="true" />
                <div className="sa-holiday-copy">
                    <button type="button" className="sa-holiday-close" aria-label={copy.close} onClick={dismiss}><X aria-hidden /></button>
                    <span className="sa-holiday-eyebrow">DramaCanvas · {eventName}</span>
                    <h2>{copy.title(offer.percentOff)}</h2>
                    <p>{copy.body}</p>
                    <div className="sa-holiday-code"><span>{copy.code}</span><strong>{offer.promotionCode}</strong></div>
                    <Link to={`${localizedPublicPath("/pricing", locale as BlogLocale)}?cycle=monthly`} onClick={dismiss}>{copy.cta}</Link>
                    <small>{copy.terms}</small>
                </div>
            </section>
        </div>
    );
}
