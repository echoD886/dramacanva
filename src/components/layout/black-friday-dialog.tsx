import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { ArrowRight, Check, Clock, Copy, X } from "lucide-react";

import type { BlogLocale } from "@/content/blog-locales";
import { localizedPublicPath } from "@/i18n/locale-routing";
import { useI18n } from "@/i18n/use-i18n";
import { BLACK_FRIDAY, blackFridayClock, blackFridayHref } from "@/pages/pricing/black-friday";
import { campaignOfferQuietPath, campaignOfferSnoozed } from "./campaign-offer-dialog";

import "./black-friday-dialog.css";

const DISMISS_KEY = `sayaction.campaign.${BLACK_FRIDAY.id}.dismissedAt`;
const OPEN_DELAY_MS = 2500;
const ART = "/yingce-campaigns/black-friday-2026/key-art";

function otherDialogOpen() {
    return Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"], .ant-modal-wrap')).some((element) => !element.closest(".bf-dialog-backdrop") && element.getClientRects().length > 0);
}

/** Black Friday popup: same quiet pages and once-a-day rule as the previous campaign popup. */
export function BlackFridayDialog() {
    const { t, number, locale } = useI18n();
    const { pathname } = useLocation();
    const quiet = campaignOfferQuietPath(pathname);
    const [open, setOpen] = useState(false);
    const [forceOpen, setForceOpen] = useState(false);
    const [now, setNow] = useState(() => Date.now());
    const [copied, setCopied] = useState(false);
    const closeRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const handler = () => {
            setForceOpen(true);
            setOpen(true);
        };
        window.addEventListener("dramacanva:open-campaign-offer", handler);
        return () => window.removeEventListener("dramacanva:open-campaign-offer", handler);
    }, []);

    useEffect(() => {
        if (quiet) return;
        const startedAt = Date.now();
        const timer = window.setInterval(() => {
            if (Date.now() - startedAt < OPEN_DELAY_MS || otherDialogOpen()) return;
            window.clearInterval(timer);
            try {
                if (campaignOfferSnoozed(Date.now(), window.localStorage.getItem(DISMISS_KEY))) return;
                window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
            } catch {
                /* Storage blocked: still show once per page view. */
            }
            setOpen(true);
        }, 500);
        return () => window.clearInterval(timer);
    }, [quiet]);

    const dismiss = useCallback(() => {
        try {
            window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
        } catch {
            /* Current view still closes. */
        }
        setForceOpen(false);
        setOpen(false);
    }, []);

    useEffect(() => {
        if (!open) return;
        closeRef.current?.focus();
        const tick = window.setInterval(() => setNow(Date.now()), 1000);
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") dismiss();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => {
            window.clearInterval(tick);
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [open, dismiss]);

    useEffect(() => {
        if (quiet && !forceOpen) setOpen(false);
    }, [quiet, forceOpen]);

    useEffect(() => {
        if (!copied) return;
        const timer = window.setTimeout(() => setCopied(false), 2000);
        return () => window.clearTimeout(timer);
    }, [copied]);

    const clock = blackFridayClock(now);
    if (!open || clock.status !== "active" || (quiet && !forceOpen)) return null;

    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const narrow = window.matchMedia?.("(max-width: 720px)").matches;
    const pad = (value: number) => number(value, { minimumIntegerDigits: 2, useGrouping: false });
    const href = blackFridayHref(localizedPublicPath("/pricing", locale as BlogLocale));
    const copyCode = async () => {
        try {
            await navigator.clipboard.writeText(BLACK_FRIDAY.code);
            setCopied(true);
        } catch {
            /* Clipboard blocked: the code stays visible to type. */
        }
    };
    const units = [
        [clock.days, "campaign.days"],
        [clock.hours, "campaign.hours"],
        [clock.minutes, "campaign.minutes"],
        [clock.seconds, "campaign.seconds"],
    ] as const;

    return (
        <div
            className="bf-dialog-backdrop"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) dismiss();
            }}
        >
            <section className="bf-dialog" role="dialog" aria-modal="true" aria-labelledby="bf-dialog-title" data-campaign={BLACK_FRIDAY.id}>
                <button ref={closeRef} type="button" className="bf-dialog-close" aria-label={t("campaign.bf.close")} onClick={dismiss}>
                    <X aria-hidden />
                </button>
                <div className="bf-dialog-art">
                    {reducedMotion ? (
                        <img src={`${ART}-1536.webp`} srcSet={`${ART}-768.webp 768w, ${ART}-1536.webp 1536w`} sizes="(max-width: 720px) 100vw, 440px" alt="" aria-hidden="true" decoding="async" />
                    ) : (
                        <video poster={`${ART}-${narrow ? 768 : 1536}.webp`} autoPlay muted loop playsInline preload="auto" aria-hidden="true">
                            <source src={`${ART}-${narrow ? 720 : 1200}.webm`} type="video/webm" />
                            <source src={`${ART}-${narrow ? 720 : 1200}.mp4`} type="video/mp4" />
                        </video>
                    )}
                    <div className="bf-dialog-art-copy">
                        <span className="bf-dialog-badge">{t("campaign.bf.badge")}</span>
                        <strong className="bf-dialog-percent">-{BLACK_FRIDAY.percentOff}%</strong>
                    </div>
                </div>
                <div className="bf-dialog-body">
                    <div className="bf-dialog-countdown" role="timer" aria-live="off">
                        <Clock aria-hidden />
                        <span className="bf-dialog-countdown-label">{t("campaign.bf.endsIn")}</span>
                        <span className="bf-dialog-clock">
                            {units.map(([value, unit]) => (
                                <span key={unit}>
                                    <b>{pad(value)}</b>
                                    <em>{t(unit)}</em>
                                </span>
                            ))}
                        </span>
                    </div>
                    <h2 id="bf-dialog-title">{t("campaign.bf.headline", { percent: BLACK_FRIDAY.percentOff })}</h2>
                    <div className="bf-dialog-code">
                        <span className="bf-dialog-code-label">{t("campaign.bf.codeLabel")}</span>
                        <code>{BLACK_FRIDAY.code}</code>
                        <button type="button" onClick={copyCode} aria-live="polite">
                            {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
                            {copied ? t("campaign.bf.copied") : t("campaign.bf.copy")}
                        </button>
                    </div>
                    <div className="bf-dialog-actions">
                        <Link className="bf-dialog-primary" to={href} onClick={dismiss}>
                            {t("campaign.bf.cta")}
                            <ArrowRight aria-hidden />
                        </Link>
                        <button type="button" className="bf-dialog-secondary" onClick={dismiss}>
                            {t("campaign.bf.notNow")}
                        </button>
                    </div>
                    <p className="bf-dialog-terms">{t("campaign.bf.terms")}</p>
                </div>
            </section>
        </div>
    );
}
