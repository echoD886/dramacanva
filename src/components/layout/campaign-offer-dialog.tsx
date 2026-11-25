import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Clock, X } from "lucide-react";

import type { BlogLocale } from "@/content/blog-locales";
import { localizedPublicPath } from "@/i18n/locale-routing";
import { useI18n } from "@/i18n/use-i18n";
import { getLaunchOfferEligibility, getPaymentOptions, type FirstPeriodOffer, type PaymentProduct } from "@/services/api/wallet";
import { useUserStore } from "@/stores/use-user-store";
import { campaignOfferCopy } from "./campaign-offer-copy";
import { BlackFridayDialog } from "./black-friday-dialog";
import { blackFridayActive } from "@/pages/pricing/black-friday";

import "./campaign-offer-dialog.css";

const CAMPAIGN_ID = "first-month-1990-202610";
const DISMISS_KEY = `sayaction.campaign.${CAMPAIGN_ID}.dismissedAt`;
const SNOOZE_MS = 24 * 60 * 60 * 1000;
const OPEN_DELAY_MS = 2500;
// 与后端 firstMonthCampaignEndsAt 一致，仅在账号已用过首月优惠、接口不再返回截止时间时兜底展示。
const CAMPAIGN_ENDS_AT = Date.parse("2026-10-31T23:59:59Z");
const VIDEO_SRC = "/yingce-campaigns/motion/challenge-paper-bird-web.mp4";
const VIDEO_POSTER = "/yingce-campaigns/motion/challenge-paper-bird-poster-1600.webp";
// 价格页本身已展示活动；登录、后台与结账回跳页不打断用户。
// Working surfaces (canvas, creation, projects, account) never get interrupted by the offer.
const QUIET_SEGMENTS = new Set(["pricing", "login", "register", "admin", "reset-password", "forgot-password", "canvas", "create", "projects", "account", "wallet", "ai-video-templates"]);

export type CampaignOffer = {
    trial?: PaymentProduct;
    pack?: PaymentProduct;
    firstPeriod?: FirstPeriodOffer;
    monthly?: PaymentProduct;
    endsAt: number;
};

/** 活动内容完全来自后端公开价格表：后端活动窗口结束后弹窗自动消失，显示价与 Stripe 扣款一致。 */
export function resolveCampaignOffer(products: PaymentProduct[] = [], firstPeriodOffers: FirstPeriodOffer[] = []): CampaignOffer | null {
    const trial = products.find((product) => product.kind === "credits" && product.sku === "credits_trial_990");
    const pack = products.find((product) => product.kind === "credits" && product.sku === "credits_small" && Boolean(product.originalAmountMinor && product.originalAmountMinor > product.amountMinor));
    const firstPeriod = firstPeriodOffers[0];
    const monthly = firstPeriod ? products.find((product) => product.sku === firstPeriod.sku) : undefined;
    if (!trial && !pack && !(firstPeriod && monthly)) return null;
    return { trial, pack, firstPeriod: monthly ? firstPeriod : undefined, monthly, endsAt: firstPeriod?.endsAt ?? 0 };
}

/** 活动价统一显示为 $9.90 这类美元符号写法，比 “USD 9.90” 更醒目；结算币种在条款里说明。 */
export function formatCampaignPrice(amountMinor: number, locale: string) {
    return new Intl.NumberFormat(locale, { style: "currency", currency: "USD", currencyDisplay: "narrowSymbol", minimumFractionDigits: 2 }).format(amountMinor / 100);
}

export function campaignOfferQuietPath(pathname: string) {
    return pathname.split("/").some((segment) => QUIET_SEGMENTS.has(segment));
}

export function campaignOfferSnoozed(now: number, dismissedAt: string | null) {
    const value = Number(dismissedAt);
    return Number.isFinite(value) && value > 0 && now - value < SNOOZE_MS;
}

function otherDialogOpen() {
    return Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"], .ant-modal-wrap')).some((element) => !element.closest(".sa-campaign-backdrop") && element.getClientRects().length > 0);
}

/** During Black Friday the popup is the Black Friday offer; the October popup never returns after its end date. */
export function CampaignOfferDialog() {
    return blackFridayActive(Date.now()) ? <BlackFridayDialog /> : <LegacyCampaignOfferDialog />;
}

function LegacyCampaignOfferDialog() {
    const { locale, number, date } = useI18n();
    const { pathname } = useLocation();
    const copy = campaignOfferCopy(locale);
    const quiet = campaignOfferQuietPath(pathname);
    const [open, setOpen] = useState(false);
    const [forceOpen, setForceOpen] = useState(false);
    const closeRef = useRef<HTMLButtonElement>(null);
    const user = useUserStore((state) => state.user);
    // 与价格页共用按账号区分的查询键：登录态切换时 API 客户端会中止旧账号的请求，键随账号变化才会重新拉取。
    const optionsQuery = useQuery({ queryKey: ["payment-options", user?.id], queryFn: getPaymentOptions, staleTime: 30_000, retry: false, enabled: !quiet || forceOpen });
    const eligibilityQuery = useQuery({ queryKey: ["launch-offer", user?.id], queryFn: getLaunchOfferEligibility, staleTime: 30_000, retry: false, enabled: Boolean(user) && (!quiet || forceOpen) });
    // 已用过首月优惠的账号不再展示月付首月价，只保留积分包。
    const firstPeriodOffers = user ? (eligibilityQuery.data?.firstPeriod?.eligible ? [eligibilityQuery.data.firstPeriod] : []) : optionsQuery.data?.firstPeriodOffers;
    const offer = optionsQuery.data && (!user || eligibilityQuery.isFetched) ? resolveCampaignOffer(optionsQuery.data.products, firstPeriodOffers) : null;

    useEffect(() => {
        const handler = () => {
            setForceOpen(true);
            setOpen(true);
        };
        window.addEventListener("dramacanva:open-campaign-offer", handler);
        return () => window.removeEventListener("dramacanva:open-campaign-offer", handler);
    }, []);

    useEffect(() => {
        if (!offer || quiet) return;
        // 轮询而不是一次性定时器：首页预渲染接管时不会错过；其他弹窗（如本地素材目录）打开时先等它关闭，避免两层弹窗叠加。
        const startedAt = Date.now();
        const timer = window.setInterval(() => {
            if (Date.now() - startedAt < OPEN_DELAY_MS || otherDialogOpen()) return;
            window.clearInterval(timer);
            try {
                if (campaignOfferSnoozed(Date.now(), window.localStorage.getItem(DISMISS_KEY))) return;
                // Count a showing as seen, so visitors who navigate away instead of closing still get it once a day.
                window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
            } catch {
                /* Storage blocked: still show once per page view. */
            }
            setOpen(true);
        }, 500);
        return () => window.clearInterval(timer);
    }, [Boolean(offer), quiet]);

    const dismiss = () => {
        try {
            window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
        } catch {
            /* Current view still closes. */
        }
        setForceOpen(false);
        setOpen(false);
    };

    useEffect(() => {
        if (!open) return;
        closeRef.current?.focus();
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") dismiss();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open]);

    useEffect(() => {
        if (quiet && !forceOpen) setOpen(false);
    }, [quiet, forceOpen]);

    if (!offer || !open || (quiet && !forceOpen) || Date.now() >= CAMPAIGN_ENDS_AT) return null;
    const money = (amountMinor: number) => formatCampaignPrice(amountMinor, locale);
    const credits = (product: PaymentProduct) => copy.credits(number(product.creditsMicrocredits / 1_000_000));
    // 主推门槛最低的一档：体验包 → 入门积分包；其余优惠作为小卡片并列。
    const lead = offer.trial ?? offer.pack;
    const sidePack = lead !== offer.pack ? offer.pack : undefined;
    const pricing = localizedPublicPath("/pricing", locale as BlogLocale);
    const endsAtMs = (offer.endsAt || CAMPAIGN_ENDS_AT / 1000) * 1000;
    const endsAt = date(endsAtMs, { month: "long", day: "numeric", timeZone: "UTC" });
    const daysLeft = Math.max(1, Math.ceil((endsAtMs - Date.now()) / 86_400_000));
    const reducedMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    return (
        <div
            className="sa-campaign-backdrop"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) dismiss();
            }}
        >
            <section className="sa-campaign-dialog" role="dialog" aria-modal="true" aria-labelledby="sa-campaign-title" data-campaign={CAMPAIGN_ID}>
                <button ref={closeRef} type="button" className="sa-campaign-close" aria-label={copy.close} onClick={dismiss}>
                    <X aria-hidden />
                </button>
                <div className="sa-campaign-media">
                    <video src={VIDEO_SRC} poster={VIDEO_POSTER} autoPlay={!reducedMotion} muted loop playsInline preload="metadata" aria-hidden="true" />
                    <span className="sa-campaign-media-badge">Seedance · Nano Banana</span>
                </div>
                <div className="sa-campaign-body">
                    <div className="sa-campaign-tags">
                        <span className="sa-campaign-eyebrow">{copy.eyebrow}</span>
                        <span className="sa-campaign-countdown">
                            <Clock aria-hidden />
                            {copy.daysLeft(daysLeft)}
                        </span>
                    </div>
                    <h2 id="sa-campaign-title">{copy.title}</h2>
                    {lead ? (
                        <div className="sa-campaign-hero" data-sku={lead.sku}>
                            <strong className="sa-campaign-hero-price">{money(lead.amountMinor)}</strong>
                            <div className="sa-campaign-hero-detail">
                                <b>
                                    {credits(lead)}
                                    {lead.originalAmountMinor ? <s>{money(lead.originalAmountMinor)}</s> : null}
                                </b>
                                <span>{lead === offer.trial ? copy.trialNote : copy.packLabel}</span>
                            </div>
                        </div>
                    ) : null}
                    {sidePack || (offer.firstPeriod && offer.monthly) ? (
                        <div className="sa-campaign-tiles">
                            {sidePack ? (
                                <Link className="sa-campaign-tile" to={`${pricing}?purchase=credits`} onClick={dismiss}>
                                    <span>{copy.packLabel}</span>
                                    <b>
                                        {money(sidePack.amountMinor)}
                                        {sidePack.originalAmountMinor ? <s>{money(sidePack.originalAmountMinor)}</s> : null}
                                    </b>
                                    <small>{credits(sidePack)}</small>
                                </Link>
                            ) : null}
                            {offer.firstPeriod && offer.monthly ? (
                                <Link className="sa-campaign-tile" to={`${pricing}?cycle=monthly`} onClick={dismiss}>
                                    <span>{copy.monthlyLabel}</span>
                                    <b>{money(offer.firstPeriod.amountMinor)}</b>
                                    <small>{copy.monthlyRenewal(money(offer.monthly.amountMinor))}</small>
                                </Link>
                            ) : null}
                        </div>
                    ) : null}
                    <Link className="sa-campaign-primary" to={lead ? `${pricing}?purchase=credits` : `${pricing}?cycle=monthly`} onClick={dismiss}>
                        {copy.creditsCta(money(lead ? lead.amountMinor : offer.firstPeriod!.amountMinor))}
                        <ArrowRight aria-hidden />
                    </Link>
                    <Link className="sa-campaign-link" to={pricing} onClick={dismiss}>
                        {copy.monthlyCta}
                    </Link>
                    <p className="sa-campaign-fine">
                        {copy.sharedCredits}
                        <br />
                        {copy.terms(endsAt)}
                    </p>
                </div>
            </section>
        </div>
    );
}
