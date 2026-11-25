import { SUPPORT_EMAIL } from "@/lib/site-identity";
import { SupportedModels } from "@/components/public/supported-models";
import { SiteFooter } from "@/components/public/site-footer";
import { localizedPublicPath } from "@/i18n/locale-routing";
import { CheckoutReturnNotice } from "./checkout-return";
import { templatePaymentReturn } from "./template-payment-return";
import type { BlogLocale } from "@/content/blog-locales";
import { LocalePicker } from "@/i18n/locale-picker";
import { AnnualOfferCopy, useAnnualOffer } from "@/components/payments/annual-offer";
import { App, Select } from "antd";
import { createTeamSubscriptionCheckout, getTeamSubscriptionQuote, listTeams } from "@/services/api/teams";
import { useTeamStore } from "@/stores/use-team-store";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Gift, KeyRound, Minus, Plus, ReceiptText, Sparkles, Users, Wrench, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";

import { createSubscriptionCheckout, getCurrentSubscription, getLaunchOfferEligibility, getPaymentOptions, type FirstPeriodOffer, type PaymentProduct, type PaymentProviderId, type PaymentProviderAvailability } from "@/services/api/wallet";
import { usePaymentProviders } from "./payment-availability";
import { PaymentProviderPopover, filterSupportedProviders, type PaymentProductType } from "@/components/payments/payment-provider-popover";
import { PaymentMethodsSection, PaymentMethodsMiniRow } from "@/components/payments/payment-methods-section";
import { CheckoutTabNotice } from "@/components/payments/checkout-tab-notice";
import { CheckoutExitOfferHost } from "@/components/payments/checkout-exit-offer";
import { rememberCheckoutSource } from "@/lib/checkout-exit-offer";
import { checkoutErrorText, goToCheckout, releaseCheckoutTab } from "@/lib/checkout-tab";
import { formatPaymentAmount } from "@/lib/payment-money";
import { useUserStore } from "@/stores/use-user-store";
import { useI18n } from "@/i18n/use-i18n";
import { PRICING_FAQS } from "@/lib/pricing-faqs";

type PricingKey = Parameters<ReturnType<typeof useI18n>["t"]>[0];
import { generationExamples, localizedGenerationExamples, localizedMembershipBenefits, membershipTiers, type BillingCurrency, type MembershipTierView } from "./pricing-catalog";
import { getPublicCustomerPrices } from "@/services/api/logical-models";
import { publicGenerationValue, publicPriceSpecification } from "@/lib/public-pricing";
import { ByokPlanCard, ByokAdapterModal, ByokCostModal } from "./byok-pricing-section";
import { createByokCheckout } from "@/services/api/byok";
import { CreditPurchasePanel } from "@/components/payments/credit-purchase-panel";
import { RollingValue, RollingValueGroup } from "@/components/payments/rolling-value";
import { allowanceOptions, cycleSavingPercent, cycleUnitKeys, resolveMembershipOffer, type OfferCycle, type OfferPlan } from "./membership-offers";
import "./libtv-pricing.css";
import { trackAudienceAction, flushAudienceObservation } from "@/services/first-party-audience";
import { TEMPLATE_RECHARGE_RETURN_KEY } from "@/pages/ai-video-templates/utils";
import "./pricing-interactions.css";
import "./usd-benefits.css";
import "./pricing-glass.css";
import "./pricing-refinements.css";
import { ValueScenarioControls } from "./value-scenario-controls";
import { defaultScenario, type ValueScenario } from "./generation-value";
import { displayCurrency, DISPLAY_FX } from "@/lib/display-money";
import { promotionFromSearch, requiresCheckoutConfirmation } from "@/lib/checkout-confirmation";

import { readPricingSelection, patchPricingSearch, pricingLoginNext, type PricingAudience } from "./pricing-selection";
import { membershipCheckoutAvailability, paymentOptionsState, type PaymentOptionsState } from "./payment-availability";

type Audience = PricingAudience;
type Cycle = OfferCycle;
type PlanKey = "byok" | "standard" | "advanced" | "premium" | "luxury" | "supreme";

type Plan = {
    key: PlanKey;
    nameKey: string;
};

// shortKey is what the cycle switch shows; labelKey stays as the accessible full name.
const creatorCycles: Array<{ key: Cycle; labelKey: string; shortKey: string; discountKey: string }> = [
    { key: "annual", labelKey: "pricing.cycleAnnualCreator", shortKey: "pricing.cycleShortAnnual", discountKey: "pricing.discountAnnual" },
    { key: "quarterly", labelKey: "pricing.offerQuarterly", shortKey: "pricing.cycleShortQuarterly", discountKey: "pricing.offerQuarter" },
    { key: "monthly", labelKey: "pricing.cycleMonthlyCreator", shortKey: "pricing.cycleShortMonthly", discountKey: "pricing.discountMonthly" },
];

const teamCycles: Array<{ key: Cycle; labelKey: string; shortKey: string; discountKey: string }> = [
    { key: "annual", labelKey: "pricing.cycleAnnualTeam", shortKey: "pricing.cycleShortAnnual", discountKey: "pricing.discountAnnual" },
    { key: "quarterly", labelKey: "pricing.offerQuarterly", shortKey: "pricing.cycleShortQuarterly", discountKey: "pricing.offerQuarter" },
    { key: "monthly", labelKey: "pricing.cycleMonthlyTeam", shortKey: "pricing.cycleShortMonthly", discountKey: "pricing.discountMonthly" },
];

const creatorPlans: Plan[] = [
    { key: "standard", nameKey: "pricing.planStandard" },
    { key: "advanced", nameKey: "pricing.planAdvanced" },
    { key: "premium", nameKey: "pricing.planPremium" },
    { key: "luxury", nameKey: "pricing.planLuxury" },
    { key: "supreme", nameKey: "pricing.planSupreme" },
];

const teamPlans: Plan[] = [
    { key: "standard", nameKey: "pricing.planStandard" },
    { key: "advanced", nameKey: "pricing.planAdvanced" },
    { key: "premium", nameKey: "pricing.planPremium" },
    { key: "luxury", nameKey: "pricing.planLuxury" },
    { key: "supreme", nameKey: "pricing.planSupreme" },
];

const campaignBenefitKeys = ["pricing.campaign1", "pricing.campaign2", "pricing.campaign3"];

const creatorCoreBenefitKeys = ["pricing.benefit1", "pricing.benefit2", "pricing.benefit3", "pricing.benefit4"];

const creatorExclusiveBenefitKeys = [
    "pricing.exclusive1",
    "pricing.exclusive2",
    "pricing.exclusive3",
    "pricing.exclusive4",
    "pricing.exclusive5",
    "pricing.exclusive6",
    "pricing.exclusive7",
    "pricing.exclusive8",
    "pricing.exclusive9",
    "pricing.exclusive10",
];

// 与后端 firstMonthCampaignCreditsMicrocredits 一致：首月 $19.90 活动首期发 1000 积分，续费起按套餐积分。
const FIRST_MONTH_CAMPAIGN_CREDITS = 1000;

export default function PricingPage() {
    const { message, modal } = App.useApp();
    const { t, locale, number } = useI18n();
    const navigate = useNavigate();
    const user = useUserStore((state) => state.user);
    const location = useLocation();
    useEffect(() => {
        let target: ReturnType<typeof templatePaymentReturn> = null;
        try {
            target = templatePaymentReturn(location.search, sessionStorage, TEMPLATE_RECHARGE_RETURN_KEY);
        } catch {
            return;
        }
        if (!target) return;
        if (target.close) {
            window.close();
            const path = target.path;
            const timer = window.setTimeout(() => navigate(path, { replace: true }), 400);
            return () => window.clearTimeout(timer);
        }
        navigate(target.path, { replace: true });
    }, [location.search, navigate]);
    const [promo, setPromo] = useState(() => promotionFromSearch(location.search));
    const selection = useMemo(() => readPricingSelection(location.search), [location.search]);
    const { audience, cycle, creditPacksOpen, allowances, teamSeats, adapterRequested } = selection;
    const [scenario, setScenario] = useState<ValueScenario>(defaultScenario);
    // Plan whose Stripe checkout is being created; the card shows progress, others are locked.
    const [checkoutPlanKey, setCheckoutPlanKey] = useState<Plan["key"] | null>(null);
    const [railBounds, setRailBounds] = useState({ start: true, end: true });
    const [adapterModalOpen, setAdapterModalOpen] = useState(false);
    const [costModalOpen, setCostModalOpen] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [checkoutBusy, setCheckoutBusy] = useState(false);
    const railRef = useRef<HTMLDivElement>(null);
    const pricingRef = useRef<HTMLElement>(null);
    useEffect(() => {
        pricingRef.current?.scrollTo({ top: 0, behavior: "auto" });
    }, [audience, creditPacksOpen]);
    const paymentOptionsQuery = useQuery({
        queryKey: ["payment-options", user?.id],
        queryFn: getPaymentOptions,
        staleTime: 30_000,
        retry: false,
    });
    const launchOfferQuery = useQuery({
        queryKey: ["launch-offer", user?.id],
        queryFn: getLaunchOfferEligibility,
        enabled: Boolean(user),
        staleTime: 30_000,
        retry: false,
    });

    const { paymentProviders } = usePaymentProviders(user?.id);
    const [popoverTarget, setPopoverTarget] = useState<{
        itemType: PaymentProductType;
        itemTitle: string;
        amountMinor: number;
        currency: string;
        anchorElement: HTMLElement;
        onConfirm: (provider: PaymentProviderId) => Promise<void>;
    } | null>(null);
    const [popoverSubmitting, setPopoverSubmitting] = useState(false);
    const [popoverError, setPopoverError] = useState<string | null>(null);

    const subscriptionQuery = useQuery({
        queryKey: ["current-subscription", user?.id],
        queryFn: getCurrentSubscription,
        enabled: Boolean(user),
        staleTime: 30_000,
        retry: false,
    });
    // 已有生效中的个人订阅时不再开新订阅，也不做补差价换档；停用渠道上已设为到期不续费的老订阅
    // 不算在内，老用户可直接改用新的支付方式续订。
    const current = subscriptionQuery.data?.subscription;
    const activeSubscription = current?.status === "active" && !current.entitlementKey && !(current.provider === "stripe" && current.cancelAtPeriodEnd) ? current : null;
    const plans = audience === "team" ? teamPlans : creatorPlans;
    const cycles = audience === "creator" ? creatorCycles : teamCycles;
    const billingCurrency: BillingCurrency = "USD";
    const allowanceFor = (key: OfferPlan) => allowances[key];
    const offerFor = (key: OfferPlan) => resolveMembershipOffer(audience === "team" ? "team" : "creator", key, cycle, allowanceFor(key), locale, paymentOptionsQuery.data?.products || [], teamSeats[key]);
    const launchOfferApplies = Boolean(user && audience === "creator" && launchOfferQuery.data?.active && launchOfferQuery.data?.eligible);
    // 首月活动价：未登录展示公开活动，登录后以账号资格为准（每个账号限一次），与 Stripe 实际扣款一致。
    const personalFirstPeriod = launchOfferQuery.data?.firstPeriod;
    const firstPeriodOffers: FirstPeriodOffer[] = audience !== "creator" ? [] : user ? (personalFirstPeriod?.eligible ? [personalFirstPeriod] : []) : paymentOptionsQuery.data?.firstPeriodOffers || [];
    // 只展示真实优惠：按积分单价相对月付的最高节省比例，不再用虚构原价算“几折”。
    const cyclesLocalized = cycles.map((option) => {
        const percent = cycleSavingPercent(option.key);
        return { key: option.key, label: t(option.labelKey as PricingKey), short: t(option.shortKey as PricingKey), discount: percent > 0 ? t("pricing.cycleSaveUpTo", { percent }) : "" };
    });
    const updateSearch = (values: Record<string, string | null>) => {
        // An early click may precede the router's post-hydration restoration
        // of the query and fragment. The address bar already has both.
        const address = window.location;
        const search = patchPricingSearch(address.search, values);
        void navigate({ pathname: location.pathname, search, hash: address.hash }, { replace: true, preventScrollReset: true, flushSync: true });
    };
    const updateRail = () => {
        const rail = railRef.current;
        if (rail) setRailBounds({ start: rail.scrollLeft <= 2, end: rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 2 });
    };
    useEffect(() => {
        const rail = railRef.current;
        if (!rail) return;
        const resize = new ResizeObserver(updateRail);
        resize.observe(rail);
        updateRail();
        return () => resize.disconnect();
    }, [audience, creditPacksOpen, locale]);
    const changeCycle = (value: Cycle) => {
        updateSearch({ cycle: value, purchase: null });
    };
    const openCredits = () => {
        updateSearch({ purchase: "credits", plan: null, audience: null, adapter: null });
    };
    const tabKeyboard = (event: React.KeyboardEvent<HTMLElement>) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        const tabs = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
        const index = tabs.indexOf(document.activeElement as HTMLButtonElement);
        if (index < 0) return;
        event.preventDefault();
        const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
        tabs[next]?.focus();
        tabs[next]?.click();
    };

    useEffect(() => {
        if (adapterRequested) setAdapterModalOpen(true);
    }, [adapterRequested, location.search]);

    const changeAudience = (next: Audience) => {
        setExpanded(false);
        updateSearch({ plan: next === "byok" ? "byok" : null, audience: next === "team" ? "team" : null, purchase: null, adapter: null });
    };

    const scrollRail = (direction: -1 | 1) => {
        railRef.current?.scrollBy({ left: direction * Math.max(320, railRef.current.clientWidth * 0.72), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    };

    const checkoutLock = useRef(false);
    const releaseCheckout = () => {
        checkoutLock.current = false;
        setCheckoutBusy(false);
        setCheckoutPlanKey(null);
    };
    useEffect(() => {
        // Returning from the payment page via Back restores this page from bfcache with the lock still held.
        const onPageShow = (event: PageTransitionEvent) => {
            if (event.persisted) releaseCheckout();
        };
        window.addEventListener("pageshow", onPageShow);
        return () => window.removeEventListener("pageshow", onPageShow);
    }, []);
    const openCheckout = async (rawURL: string) => {
        const checkoutURL = new URL(rawURL);
        if (checkoutURL.protocol !== "https:") throw new Error(t("pricing.invalidCheckout"));
        trackAudienceAction("checkout_started");
        await Promise.race([flushAudienceObservation(), new Promise<void>((resolve) => setTimeout(resolve, 180))]);
        // The cashier opens in a new tab when the click reserved one; this page stays and offers the way back.
        if (goToCheckout(checkoutURL.toString()) === "tab") {
            setPopoverTarget(null);
            setPopoverSubmitting(false);
            releaseCheckout();
        }
    };
    // Our own quote-changed notice and 4xx business messages are safe to show; anything else gets the generic text.
    const planCheckoutError = (error: unknown) => (error instanceof Error && error.message === t("pricing.creditQuoteChanged") ? error.message : checkoutErrorText(error, t("pricing.checkoutFailed")));

    const choosePlan = async (plan: Plan) => {
        if (checkoutLock.current) return;
        trackAudienceAction("plan_selected");
        if (!user) {
            const next = pricingLoginNext(
                location.pathname,
                patchPricingSearch(location.search, { promo: promo.trim() || null }),
                plan.key === "byok" ? { audience, cycle, plan: "byok" } : { audience, cycle, plan: plan.key, allowance: allowanceFor(plan.key) },
            );
            navigate(`/login?next=${encodeURIComponent(next)}`);
            return;
        }
        if (audience === "team") {
            if (plan.key === "byok") return;
            const offer = offerFor(plan.key);
            if (!offer.product || !paymentOptionsQuery.data?.checkoutEnabled) {
                message.warning(t("pricing.noStripeProduct"));
                return;
            }
            checkoutLock.current = true;
            setCheckoutBusy(true);
            setCheckoutPlanKey(plan.key);
            try {
                const owned = (await listTeams()).filter((item) => item.role === "owner");
                const currentTeam = new URLSearchParams(location.search).get("teamId") || useTeamStore.getState().activeTeamId;
                let teamId = owned.find((item) => item.team.id === currentTeam)?.team.id || owned[0]?.team.id || "";
                if (owned.length) {
                    const confirmed = await modal.confirm({
                        title: t("teams.billingTarget"),
                        content: (
                            <Select
                                className="w-full"
                                defaultValue={teamId}
                                options={[...owned.map((item) => ({ value: item.team.id, label: item.team.name })), { value: "", label: t("teams.billingNew") }]}
                                onChange={(value) => {
                                    teamId = value;
                                }}
                            />
                        ),
                        okText: t("pricing.offerConfirm"),
                        cancelText: t("pricing.changeCancel"),
                    });
                    if (!confirmed) {
                        releaseCheckoutTab();
                        releaseCheckout();
                        return;
                    }
                }
                const selected = { teamId, sku: offer.product.sku, seats: offer.quantity };
                const quote = await getTeamSubscriptionQuote(selected);
                if (quote.amountMinor !== offer.sourceAmountMinor * offer.quantity || quote.creditsMicrocredits !== offer.periodCredits * offer.quantity * 1_000_000) throw new Error(t("pricing.creditQuoteChanged"));
                const executeTeamCheckout = async (chosenProvider?: PaymentProviderId) => {
                    const result = chosenProvider ? await createTeamSubscriptionCheckout(selected, quote.version, chosenProvider) : await createTeamSubscriptionCheckout(selected, quote.version);
                    await openCheckout(result.url);
                };

                const supported = filterSupportedProviders(paymentProviders, "teams");
                if (supported.length === 1) {
                    await executeTeamCheckout(supported[0].id);
                } else if (supported.length > 1) {
                    const anchor = document.querySelector<HTMLElement>(`.libtv-plan--${plan.key} .libtv-open-button`) || document.body;
                    // The card is not "creating checkout" while the user is still choosing how to pay.
                    releaseCheckout();
                    setPopoverError(null);
                    setPopoverSubmitting(false);
                    setPopoverTarget({
                        itemType: "teams",
                        itemTitle: t(plan.nameKey as PricingKey),
                        amountMinor: quote.amountMinor,
                        currency: "USD",
                        anchorElement: anchor,
                        onConfirm: async (chosenProvider) => {
                            checkoutLock.current = true;
                            setCheckoutBusy(true);
                            setCheckoutPlanKey(plan.key);
                            setPopoverSubmitting(true);
                            setPopoverError(null);
                            try {
                                await executeTeamCheckout(chosenProvider);
                            } catch (err) {
                                releaseCheckoutTab();
                                setPopoverError(checkoutErrorText(err, t("checkout.error")));
                                setPopoverSubmitting(false);
                                releaseCheckout();
                            }
                        },
                    });
                } else {
                    await executeTeamCheckout();
                }
            } catch (error) {
                message.error(planCheckoutError(error));
                releaseCheckout();
            }
            return;
        }
        // Prerendered HTML and first paint have no payment options yet; wait for them instead of reporting a missing product.
        if (paymentOptionsQuery.isPending || paymentOptionsQuery.isFetching) {
            message.info(t("pricing.paymentOptionsLoading"));
            return;
        }
        const product = plan.key === "byok" ? paymentOptionsQuery.data?.byokProduct : offerFor(plan.key).product;
        const ready = plan.key === "byok" ? paymentOptionsQuery.data?.byokCheckoutReady : paymentOptionsQuery.data?.checkoutEnabled;
        if (paymentOptionsQuery.isError || !ready || !product) {
            message.warning(t("pricing.noStripeProduct"));
            return;
        }
        if (plan.key !== "byok" && activeSubscription) {
            message.info(t(activeSubscription.planSku === product.sku ? "pricing.currentPlan" : "pricing.switchAfterPeriod"));
            return;
        }
        checkoutLock.current = true;
        setCheckoutBusy(true);
        setCheckoutPlanKey(plan.key);
        try {
            const itemType: PaymentProductType = plan.key === "byok" ? "byok" : "subscriptions";
            const executeProductCheckout = async (chosenProvider?: PaymentProviderId) => {
                const result =
                    plan.key === "byok"
                        ? chosenProvider
                            ? await createByokCheckout(product.sku, promo.trim(), chosenProvider)
                            : await createByokCheckout(product.sku, promo.trim())
                        : chosenProvider
                          ? await createSubscriptionCheckout(product.sku, promo.trim(), chosenProvider)
                          : await createSubscriptionCheckout(product.sku, promo.trim());
                if (plan.key === "byok" && result.payableMinor !== undefined && requiresCheckoutConfirmation(product.amountMinor, result.payableMinor)) {
                    const confirmed = await modal.confirm({ title: t("pricing.actualCharge", { amount: formatPaymentAmount(result.payableMinor, product.currency, locale) }), okText: t("pricing.offerConfirm"), cancelText: t("pricing.changeCancel") });
                    if (!confirmed) {
                        releaseCheckoutTab();
                        releaseCheckout();
                        return;
                    }
                }
                if (plan.key !== "byok" && "subscription" in result && result.subscription?.id) {
                    rememberCheckoutSource({ kind: "subscription", id: result.subscription.id, sku: product.sku, provider: result.subscription.provider, flow: "subscription" });
                }
                await openCheckout(result.url);
            };

            const supported = filterSupportedProviders(paymentProviders, itemType);
            if (supported.length === 1) {
                await executeProductCheckout(supported[0].id);
            } else if (supported.length > 1) {
                const anchor = (plan.key === "byok" ? document.querySelector<HTMLElement>(".sa-byok-primary") : document.querySelector<HTMLElement>(`.libtv-plan--${plan.key} .libtv-open-button`)) || document.body;
                const firstPeriod = plan.key !== "byok" ? firstPeriodOffers.find((offer) => offer.sku === product.sku) : undefined;
                const chargeMinor = firstPeriod?.amountMinor ?? product.amountMinor;
                // The card is not "creating checkout" while the user is still choosing how to pay.
                releaseCheckout();
                setPopoverError(null);
                setPopoverSubmitting(false);
                setPopoverTarget({
                    itemType,
                    itemTitle: plan.key === "byok" ? "BYOK · Studio Pass" : t(plan.nameKey as PricingKey),
                    amountMinor: chargeMinor,
                    currency: product.currency || "USD",
                    anchorElement: anchor,
                    onConfirm: async (chosenProvider) => {
                        checkoutLock.current = true;
                        setCheckoutBusy(true);
                        setCheckoutPlanKey(plan.key);
                        setPopoverSubmitting(true);
                        setPopoverError(null);
                        try {
                            await executeProductCheckout(chosenProvider);
                        } catch (err) {
                            releaseCheckoutTab();
                            setPopoverError(checkoutErrorText(err, t("checkout.error")));
                            setPopoverSubmitting(false);
                            releaseCheckout();
                        }
                    },
                });
            } else {
                await executeProductCheckout();
            }
        } catch (error) {
            message.error(planCheckoutError(error));
            releaseCheckout();
        }
    };

    const credits = (micro: number) => number(Math.round(micro / 1_000_000));
    return (
        <main
            ref={pricingRef}
            data-pricing-cycle={cycle}
            data-pricing-audience={audience}
            data-audience-page="pricing"
            className={"libtv-pricing-page " + (audience === "team" ? "is-team" : audience === "byok" ? "is-byok" : "is-creator") + (expanded ? " benefits-expanded" : "")}
            aria-label={t("pricing.pageAria")}
        >
            <Link className="libtv-pricing-close" aria-label={t("pricing.closeAria")} to={localizedPublicPath("/", locale as BlogLocale)}>
                <X aria-hidden />
            </Link>

            <div className="libtv-pricing-content">
                <CheckoutReturnNotice />
                <div className="sa-pricing-toolbar">
                    <span>{t("pricing.languageAndCurrency")}</span>
                    <LocalePicker />
                </div>
                <PromoBanner />

                <div className="libtv-membership-tabs" role="tablist" onKeyDown={tabKeyboard} aria-label={t("pricing.tabCreator")}>
                    <button type="button" role="tab" aria-selected={audience === "creator"} className={audience === "creator" ? "is-active" : ""} onClick={() => changeAudience("creator")}>
                        {t("pricing.tabCreator")}
                    </button>
                    <button type="button" role="tab" aria-selected={audience === "team"} className={audience === "team" ? "is-active" : ""} onClick={() => changeAudience("team")}>
                        {t("pricing.tabTeam")}
                    </button>
                    <button type="button" role="tab" aria-selected={audience === "byok"} className={audience === "byok" ? "is-active" : ""} onClick={() => changeAudience("byok")}>
                        {t("pricing.planByok")}
                    </button>
                </div>

                {audience === "byok" ? (
                    <nav className="sa-pricing-plan-overview" aria-label={t("pricing.tabCreator")}>
                        {creatorPlans.map((plan) => (
                            <button key={plan.key} type="button" onClick={() => changeAudience("creator")}>
                                <span>{t(plan.nameKey as PricingKey)}</span>
                                <strong>{resolveMembershipOffer("creator", plan.key as OfferPlan, cycle, allowanceFor(plan.key as OfferPlan), locale, paymentOptionsQuery.data?.products || []).price}</strong>
                            </button>
                        ))}
                    </nav>
                ) : null}

                {audience !== "byok" ? (
                    <section className="libtv-pricing-controls" aria-label={t("pricing.discountAnnual")}>
                        <div className="libtv-cycle-switch" role="tablist" aria-label={t("pricing.offerSummary")} onKeyDown={tabKeyboard}>
                            {cyclesLocalized.map((option) => (
                                <button
                                    key={option.key}
                                    type="button"
                                    role="tab"
                                    aria-selected={!creditPacksOpen && cycle === option.key}
                                    className={!creditPacksOpen && cycle === option.key ? "is-active" : ""}
                                    onClick={() => changeCycle(option.key)}
                                    aria-label={option.discount ? `${option.label} · ${option.discount}` : option.label}
                                    title={option.label}
                                >
                                    <span>{option.short}</span>
                                    {option.discount ? <small className="libtv-cycle-discount">{option.discount}</small> : null}
                                </button>
                            ))}
                        </div>
                        <button className="libtv-credit-store" type="button" aria-pressed={creditPacksOpen} onClick={openCredits}>
                            {t("pricing.buyCreditPacks")}
                            <ChevronRight aria-hidden />
                        </button>
                    </section>
                ) : null}

                {audience !== "byok" && !creditPacksOpen ? (
                    <p className="libtv-billing-display-note" data-display-currency={displayCurrency(locale)}>
                        {t("pricing.localDisplayNotice", { currency: displayCurrency(locale), settlement: "USD" })} <span className="sa-fx-reference">{t("pricing.displayRateNote", { date: DISPLAY_FX.asOf })}</span>
                    </p>
                ) : null}

                {audience !== "byok" && !creditPacksOpen ? (
                    <p className="sa-billing-explainer">
                        {t("pricing.billingRenewal")} · {t("pricing.topupSeparate")}
                    </p>
                ) : null}

                {audience === "byok" ? (
                    <ByokPlanCard
                        t={t as (key: string, values?: Record<string, string | number>) => string}
                        checkoutBusy={checkoutBusy}
                        onChoose={() => void choosePlan({ key: "byok", nameKey: "pricing.planByok" })}
                        onRequestAdapter={() => setAdapterModalOpen(true)}
                        onViewCost={() => setCostModalOpen(true)}
                        exclusiveBenefitKeys={creatorExclusiveBenefitKeys}
                    />
                ) : null}
                {creditPacksOpen && audience === "creator" ? (
                    <CreditPurchasePanel promo={promo} onPromoChange={setPromo} />
                ) : (
                    <section className="libtv-plan-carousel" role="region" aria-label={audience === "creator" ? t("pricing.tabCreator") : t("pricing.tabTeam")}>
                        <button className="libtv-rail-arrow is-left" type="button" disabled={railBounds.start} aria-label={t("pricing.railPrevAria")} onClick={() => scrollRail(-1)}>
                            <ChevronLeft aria-hidden />
                        </button>
                        <div className="libtv-plan-rail" ref={railRef} onScroll={updateRail}>
                            {plans.map((plan) => (
                                <PricingPlanCard
                                    key={plan.key}
                                    plan={plan}
                                    t={t as (key: string, values?: Record<string, string | number>) => string}
                                    audience={audience}
                                    cycle={cycle}
                                    currency={billingCurrency}
                                    scenario={scenario}
                                    allowance={plan.key === "byok" ? 0 : allowanceFor(plan.key)}
                                    setAllowance={(credits) => updateSearch({ [`tier.${audience}.${plan.key}`]: String(credits) })}
                                    checkingOut={checkoutPlanKey === plan.key}
                                    launchOfferApplies={launchOfferApplies}
                                    firstPeriodOffers={firstPeriodOffers}
                                    currentPlanSku={audience === "creator" ? activeSubscription?.planSku : undefined}
                                    hasActiveSubscription={audience === "creator" && Boolean(activeSubscription)}
                                    products={paymentOptionsQuery.data?.products || []}
                                    seats={plan.key !== "byok" ? teamSeats[plan.key] : 2}
                                    setSeats={(nextSeats) => {
                                        if (plan.key !== "byok") {
                                            updateSearch({ [`seats.team.${plan.key}`]: String(Math.min(50, Math.max(2, Math.trunc(nextSeats)))) });
                                        }
                                    }}
                                    checkoutBusy={checkoutBusy}
                                    paymentOptions={paymentOptionsState(paymentOptionsQuery)}
                                    paymentProviders={paymentProviders}
                                    onChoose={() => void choosePlan(plan)}
                                    onContact={() => {
                                        window.location.href = `mailto:${SUPPORT_EMAIL}`;
                                    }}
                                    onRequestAdapter={() => setAdapterModalOpen(true)}
                                    onViewCost={() => setCostModalOpen(true)}
                                />
                            ))}
                        </div>
                        <button className="libtv-rail-arrow is-right" type="button" disabled={railBounds.end} aria-label={t("pricing.railNextAria")} onClick={() => scrollRail(1)}>
                            <ChevronRight aria-hidden />
                        </button>
                    </section>
                )}

                {audience !== "byok" && !creditPacksOpen ? (
                    <section className="libtv-more-benefits">
                        <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
                            {expanded ? t("pricing.collapse") : t("pricing.moreBenefits")}
                            <ChevronDown aria-hidden />
                        </button>
                        <p>{t("pricing.benefitsNote")}</p>
                    </section>
                ) : null}

                {/* Prices come first; the model picker that drives each card's "how many generations" line sits below them. */}
                {audience !== "byok" && !creditPacksOpen ? <ValueScenarioControls value={scenario} onChange={setScenario} /> : null}

                {audience === "team" ? (
                    <>
                        <EnterpriseStrip
                            onContact={() => {
                                window.location.href = `mailto:${SUPPORT_EMAIL}`;
                            }}
                        />
                        <section className="libtv-team-supplemental" aria-label={t("pricing.teamSupplemental")}>
                            <p>
                                {t("pricing.teamSupplemental")}
                                <br />
                                {t("pricing.invoicePath")}
                                <br />
                                {t("pricing.enterpriseContactNote")}
                            </p>
                        </section>
                    </>
                ) : null}
                <div className="sa-pricing-reference-groups">
                    <details className="sa-pricing-reference-group">
                        <summary>
                            {t("pricing.creditReferenceTitle")}
                            <ChevronDown aria-hidden />
                        </summary>
                        <CreditReferenceTable />
                    </details>
                    <details className="sa-pricing-reference-group">
                        <summary>
                            {audience === "team" ? t("pricing.tableTitleTeam") : t("pricing.tableTitle")}
                            <ChevronDown aria-hidden />
                        </summary>
                        <GenerationTable audience={audience} />
                    </details>
                </div>
                <PaymentMethodsSection paymentProviders={paymentProviders} locale={locale} />
                <CheckoutTabNotice locale={locale} />
                {user && <CheckoutExitOfferHost locale={locale} />}
                <PricingFaq onAction={() => setNotice(t("pricing.faqActionNotice"))} />
                <SupportedModels locale={locale as BlogLocale} />
                <SiteFooter locale={locale as BlogLocale}>
                    <div className="libtv-pricing-footer">
                        <p className="sa-checkout-privacy">{t("checkout.notice")}</p>
                    </div>
                </SiteFooter>
            </div>

            {notice ? (
                <div className="libtv-pricing-notice" role="dialog" aria-modal="true" aria-label={t("pricing.noticeAria")}>
                    <div>
                        <button type="button" aria-label={t("pricing.noticeCloseAria")} onClick={() => setNotice(null)}>
                            <X aria-hidden />
                        </button>
                        <Sparkles aria-hidden />
                        <p>{notice}</p>
                    </div>
                </div>
            ) : null}

            <ByokAdapterModal
                open={adapterModalOpen}
                onClose={() => {
                    setAdapterModalOpen(false);
                    if (adapterRequested) updateSearch({ adapter: null });
                }}
                onSuccess={(msg) => setNotice(msg)}
            />
            <ByokCostModal open={costModalOpen} onClose={() => setCostModalOpen(false)} />

            {popoverTarget ? (
                <PaymentProviderPopover
                    open={Boolean(popoverTarget)}
                    onClose={() => {
                        setPopoverTarget(null);
                        setPopoverError(null);
                        setPopoverSubmitting(false);
                        releaseCheckout();
                    }}
                    anchorElement={popoverTarget.anchorElement}
                    itemType={popoverTarget.itemType}
                    itemTitle={popoverTarget.itemTitle}
                    amountMinor={popoverTarget.amountMinor}
                    currency={popoverTarget.currency}
                    paymentProviders={paymentProviders}
                    userId={user?.id}
                    locale={locale}
                    isSubmitting={popoverSubmitting}
                    submitError={popoverError}
                    onConfirm={popoverTarget.onConfirm}
                    onRetry={() => {
                        if (popoverTarget) {
                            void popoverTarget.onConfirm(popoverTarget.anchorElement ? (popoverTarget as unknown as { selectedProvider: PaymentProviderId }).selectedProvider || "waffo" : "waffo");
                        }
                    }}
                />
            ) : null}
        </main>
    );
}

function PromoBanner() {
    const { t } = useI18n();
    const { clock, quote } = useAnnualOffer();
    return (
        <section className="libtv-promo-banner" aria-label={t("pricing.bannerTitle")}>
            <div className="libtv-promo-copy">
                <h1>{t("pricing.bannerTitle")}</h1>
                <AnnualOfferCopy quote={quote} campaignActive={clock.status !== "expired"} />
            </div>
        </section>
    );
}

function PricingPlanCard({
    plan,
    t,
    audience,
    cycle,
    currency,
    scenario,
    allowance,
    setAllowance,
    checkingOut,
    launchOfferApplies,
    firstPeriodOffers,
    currentPlanSku,
    hasActiveSubscription,
    products,
    seats,
    setSeats,
    checkoutBusy,
    paymentOptions,
    paymentProviders,
    onChoose,
    onContact,
    onRequestAdapter,
    onViewCost,
}: {
    plan: Plan;
    t: (key: string, values?: Record<string, string | number>) => string;
    audience: Audience;
    cycle: Cycle;
    currency: BillingCurrency;
    scenario: ValueScenario;
    allowance: number;
    setAllowance: (value: number) => void;
    checkingOut: boolean;
    launchOfferApplies: boolean;
    firstPeriodOffers: FirstPeriodOffer[];
    currentPlanSku?: string;
    hasActiveSubscription: boolean;
    products: PaymentProduct[];
    seats?: number;
    setSeats?: (value: number) => void;
    checkoutBusy: boolean;
    paymentOptions: PaymentOptionsState;
    paymentProviders?: PaymentProviderAvailability[];
    onChoose: () => void;
    onContact: () => void;
    onRequestAdapter?: () => void;
    onViewCost?: () => void;
}) {
    const { locale, number } = useI18n();
    const publicPrices = useQuery({ queryKey: ["public-customer-prices"], queryFn: getPublicCustomerPrices, staleTime: 0 });
    if (plan.key === "byok") return null; // The studio is rendered once, outside the membership rail.

    const isTeam = audience === "team";
    const offerAudience = isTeam ? "team" : "creator";
    const catalogView = membershipTiers(cycle === "quarterly" ? "monthly" : cycle).find((item) => item.key === plan.key)!;
    const billing = resolveMembershipOffer(offerAudience, plan.key, cycle, allowance, locale, products, seats);
    const estimate = publicGenerationValue(publicPrices.data?.prices || [], billing.credits, scenario);
    const resultUnit = t(estimate?.model.kind === "video" ? "pricing.valuePerVideo" : "pricing.valuePerImage", { seconds: scenario.seconds });
    const resultCredits = estimate ? number(estimate.creditsPerResult) : "—";
    const options = allowanceOptions(offerAudience, plan.key);
    const showSeedanceCampaign = !isTeam || cycle === "annual";
    const visibleCampaigns = (showSeedanceCampaign ? campaignBenefitKeys : campaignBenefitKeys.slice(2)).map((key) => t(key));
    const unit = t(cycleUnitKeys[cycle]);
    const featured = plan.key === "luxury" || plan.key === "supreme";
    const cardClass = ["libtv-plan", "libtv-plan--" + plan.key, featured ? "is-featured has-banner" : "", checkingOut ? "is-selected" : ""].filter(Boolean).join(" ");
    // What the Buy button will charge on Stripe (USD settlement, launch discount on the first period).
    // The first-month campaign replaces the launch discount on its plan; the two never stack.
    const firstPeriod = billing.product ? firstPeriodOffers.find((offer) => offer.sku === billing.product?.sku) : undefined;
    const chargeMinor = firstPeriod?.amountMinor ?? billing.product?.amountMinor ?? billing.amountMinor;
    const isCurrentPlan = Boolean(currentPlanSku && billing.product?.sku === currentPlanSku);
    const chargeLabel = formatPaymentAmount(chargeMinor, "USD", locale);
    const checkout = membershipCheckoutAvailability(paymentOptions, Boolean(billing.product));
    const checkoutAvailable = isTeam || checkout.enabled;
    // 已有会员时不提供换档按钮：更换套餐在当前周期结束后重新订阅。
    const switchLater = hasActiveSubscription && !isTeam && !isCurrentPlan;
    return (
        <RollingValueGroup className={cardClass} data-billing-source={billing.source} data-plan={plan.key} data-allowance={allowance}>
            {featured ? (
                <div className="libtv-plan-banner" data-billing-unit="credits" data-price-source="model-catalog">
                    <span>
                        {estimate?.model.name} · {scenario.spec.toUpperCase()}
                    </span>
                    <strong>{t("pricing.creditUsageExample", { credits: resultCredits, unit: resultUnit })}</strong>
                </div>
            ) : (
                <div className="sa-plan-banner-spacer" aria-hidden="true" />
            )}
            <div className="libtv-plan-hero">
                <div className="libtv-plan-name-row">
                    <h2>{t(plan.nameKey)}</h2>
                    {cycleSavingPercent(cycle, plan.key) > 0 ? <span>{t("pricing.planSaveVsMonthly", { percent: cycleSavingPercent(cycle, plan.key) })}</span> : null}
                </div>
                <div className="libtv-plan-price">
                    <strong>
                        <RollingValue value={billing.price} />
                    </strong>
                    <em>
                        /{unit}
                        {isTeam ? `/${t("pricing.perSeat")}` : ""}
                    </em>
                </div>
                {cycle === "annual" ? <p className="sa-plan-monthly-equivalent">{t("pricing.billingMonthlyEquivalent", { value: billing.monthlyEquivalent })}</p> : null}
                <div className="sa-plan-detail-disclosure">
                    <div className="libtv-plan-meta">
                        <span className="sa-policy-rule">{t("pricing.sameRateRule")}</span>
                        {billing.priceMismatch ? <span role="alert">{t("pricing.policyMismatch")}</span> : null}
                        <span>{billing.renewal ? t("pricing.offerRenewal", { amount: billing.renewal }) : billing.autoRenew === false ? t("pricing.offerNoRenewal") : t("pricing.billingRenewal")}</span>
                        {cycle !== "annual" ? <span>{t("pricing.billingMonthlyEquivalent", { value: billing.monthlyEquivalent })}</span> : null}
                        <span>
                            {t("pricing.offerCreditUnit")}:{" "}
                            <b>
                                <RollingValue value={billing.unitPrice} />
                            </b>
                        </span>
                        <span className="sa-offer-annual-saving">{cycle === "monthly" ? t("pricing.billingMonthly") : t("pricing.offerCycleCharge", { months: billing.months })}</span>
                    </div>
                </div>
                <div className="sa-offer-allowance">
                    <p className="sa-period-credit-total">
                        <RollingValue value={number(billing.periodCredits)} />
                        <span>{t("pricing.creditsLabel", { unit, seat: isTeam ? t("pricing.perSeat") : "" })}</span>
                    </p>
                    {options.length > 1 ? (
                        <div className="libtv-credit-options" role="group" aria-label={t("pricing.offerSwitchTier")}>
                            {options.map((credits) => {
                                const choice = resolveMembershipOffer(offerAudience, plan.key as OfferPlan, cycle, credits, locale, products);
                                return (
                                    <button key={credits} type="button" aria-pressed={allowance === credits} className={allowance === credits ? "is-active" : ""} onClick={() => setAllowance(credits)}>
                                        {t(choice.product ? "pricing.offerInvoiceGrant" : "pricing.offerMonthlyGrant", { credits: number(choice.credits) })}
                                    </button>
                                );
                            })}
                        </div>
                    ) : null}
                    <p className="libtv-generation-note">{t("pricing.offerInvoiceGrant", { credits: number(billing.credits) })}</p>
                    {estimate ? (
                        <div className="sa-result-estimate" data-billing-unit="credits" data-price-source="model-catalog" data-result-kind={estimate.model.kind} data-result-count={estimate.perPeriod}>
                            <strong>{t(estimate.model.kind === "video" ? "pricing.valuePeriodVideos" : "pricing.valuePeriodImages", { count: number(estimate.perPeriod) })}</strong>
                            <span>
                                {estimate.model.name} · {scenario.spec.toUpperCase()} · {resultUnit}
                            </span>
                            <span>{t("pricing.creditUsageExample", { credits: resultCredits, unit: resultUnit })}</span>
                            <small>{t("pricing.valueTerm", { count: number(estimate.termResults) })}</small>
                            <small>{t("pricing.creditReferenceNote")}</small>
                        </div>
                    ) : null}
                </div>
                {isTeam && setSeats ? (
                    <div className="sa-offer-seats">
                        <div className="libtv-seat-stepper">
                            <button type="button" aria-label={t("pricing.seatMinusAria")} disabled={billing.quantity <= 2} onClick={() => setSeats(billing.quantity - 1)}>
                                <Minus />
                            </button>
                            <span>{t("pricing.seats", { count: number(billing.quantity) })}</span>
                            <button type="button" aria-label={t("pricing.seatPlusAria")} disabled={billing.quantity >= 50} onClick={() => setSeats(billing.quantity + 1)}>
                                <Plus />
                            </button>
                        </div>
                        <strong>{t("pricing.offerTotalSeats", { seats: billing.quantity, amount: billing.total })}</strong>
                    </div>
                ) : null}
                {!isTeam ? (
                    <div className="sa-plan-charge" data-settlement-currency="USD">
                        <p className="sa-plan-actual-charge">{t("pricing.actualCharge", { amount: chargeLabel })}</p>
                    </div>
                ) : null}
                {switchLater ? (
                    <p role="status" className="sa-plan-payment-later">
                        {t("pricing.switchAfterPeriod")}
                    </p>
                ) : (
                    <>
                        <button className="libtv-open-button" type="button" disabled={checkoutBusy || !checkoutAvailable || isCurrentPlan} aria-busy={checkingOut} onClick={onChoose}>
                            {t(checkingOut ? "pricing.creatingCheckout" : isCurrentPlan ? "pricing.currentPlan" : "pricing.offerSelect")}
                        </button>
                        <PaymentMethodsMiniRow paymentProviders={paymentProviders || []} locale={locale} />
                    </>
                )}
                {!isTeam && checkout.notConfigured ? (
                    <p role="status" className="sa-plan-payment-later">
                        {t("pricing.offerPaymentLater")}
                    </p>
                ) : null}
                {!isTeam ? <small className="sa-plan-topup-note">{t("pricing.topupSeparate")}</small> : null}
                {isTeam ? <TeamBenefitTabs /> : null}
                {plan.key === "supreme" ? (
                    <button className="libtv-contact-button" type="button" onClick={onContact}>
                        {t("pricing.contactSales")}
                        <ChevronRight aria-hidden />
                    </button>
                ) : (
                    <span className="sa-contact-spacer" aria-hidden="true" />
                )}
            </div>

            <section className="libtv-plan-benefits sa-plan-benefit-disclosure" aria-label={t("pricing.coreBenefits")}>
                <p className="libtv-benefit-title">
                    <Gift aria-hidden />
                    {t("pricing.coreBenefits")}
                </p>

                {showSeedanceCampaign ? (
                    <div className="libtv-campaign-box">
                        <strong>{t("pricing.currentPlanNote")}</strong>
                        <ul>
                            {visibleCampaigns.slice(0, 2).map((item) => (
                                <li key={item}>
                                    <Sparkles aria-hidden />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null}

                <ul className="libtv-campaign-list">
                    {(showSeedanceCampaign ? visibleCampaigns.slice(2) : visibleCampaigns).map((item) => (
                        <li key={item}>
                            <Sparkles aria-hidden />
                            {item}
                        </li>
                    ))}
                </ul>

                <section className="sa-model-benefits">
                    <h3>{t("pricing.modelBenefitTitle")}</h3>
                    <ul>
                        {["pricing.modelBenefitVideo", "pricing.modelBenefitImage", "pricing.modelBenefitText", "pricing.modelBenefitWorkflow"].map((key) => (
                            <li key={key}>
                                <Check aria-hidden />
                                {t(key)}
                            </li>
                        ))}
                    </ul>
                    <p>{t("pricing.modelBenefitNote")}</p>
                </section>
                {isTeam ? (
                    <TeamBenefits t={t as (key: string, values?: Record<string, string | number>) => string} plan={plan} />
                ) : (
                    <CreatorBenefits t={t as (key: string, values?: Record<string, string | number>) => string} plan={plan} view={catalogView} />
                )}
            </section>
        </RollingValueGroup>
    );
}

function CreatorBenefits({ t, view }: { plan: Plan; t: (key: string) => string; view: MembershipTierView }) {
    const { locale } = useI18n();
    const benefits = [...creatorCoreBenefitKeys.map((key) => t(key)), ...localizedMembershipBenefits(view.plan, locale)];
    return (
        <>
            <ul className="libtv-standard-benefits">
                {benefits.map((item) => (
                    <li key={item}>
                        <Check aria-hidden />
                        {item}
                    </li>
                ))}
            </ul>
            <p className="libtv-exclusive-title">{t("pricing.exclusiveFeatures")}</p>
            <ul className="libtv-exclusive-benefits">
                {creatorExclusiveBenefitKeys.map((key) => (
                    <li key={key}>
                        <Check aria-hidden />
                        {t(key)}
                    </li>
                ))}
            </ul>
        </>
    );
}

function TeamBenefitTabs() {
    const { t } = useI18n();
    return (
        <div className="libtv-team-benefit-tabs" aria-label={t("pricing.teamCollabTitle")}>
            <span>
                <Users aria-hidden />
                {t("pricing.benefitCollab")}
            </span>
            <span>
                <KeyRound aria-hidden />
                {t("pricing.benefitPerms")}
            </span>
            <span>
                <Wrench aria-hidden />
                {t("pricing.benefitAdmin")}
            </span>
            <span>
                <ReceiptText aria-hidden />
                {t("pricing.benefitInvoice")}
            </span>
        </div>
    );
}

function TeamBenefits({ t, plan: _plan }: { t: (key: string) => string; plan: Plan }) {
    const sections: Array<[string, string[]]> = [
        [t("pricing.teamCollabTitle"), [t("pricing.teamCollab1"), t("pricing.teamCollab2"), t("pricing.teamCollab3")]],
        [t("pricing.teamAdminTitle"), [t("pricing.teamAdmin1"), t("pricing.teamAdmin2"), t("pricing.teamAdmin3"), t("pricing.teamAdmin4")]],
        [t("pricing.teamSafetyTitle"), [t("pricing.teamSafety1"), t("pricing.teamSafety2"), t("pricing.teamSafety3")]],
        [t("pricing.teamExclusiveTitle"), [t("pricing.teamExclusive1")]],
    ];
    const visible = sections;

    return (
        <div className="libtv-team-benefits">
            {visible.map(([title, items]) => (
                <section key={title}>
                    <strong>{title}</strong>
                    <ul>
                        {items.map((item) => (
                            <li key={item}>
                                <Check aria-hidden />
                                {item}
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
        </div>
    );
}

function EnterpriseStrip({ onContact }: { onContact: () => void }) {
    const { t } = useI18n();
    return (
        <section className="libtv-enterprise-strip">
            <div>
                <strong>{t("pricing.enterpriseTitle")}</strong>
                <p>{t("pricing.enterpriseDesc")}</p>
            </div>
            <button type="button" onClick={onContact}>
                {t("pricing.contactUs")}
            </button>
        </section>
    );
}

function GenerationTable({ audience }: { audience: Audience }) {
    const { t, locale } = useI18n();
    const examples = localizedGenerationExamples(locale);
    return (
        <section className="libtv-generation-table">
            <h2>{audience === "team" ? t("pricing.tableTitleTeam") : t("pricing.tableTitle")}</h2>
            <div className="libtv-generation-scroll">
                <table>
                    <thead>
                        <tr>
                            <th>{t("pricing.colModel")}</th>
                            <th>{t("pricing.colSpec")}</th>
                            <th>{t("pricing.colParams")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="libtv-table-section">
                            <th colSpan={3}>{t("pricing.videoModels")}</th>
                        </tr>
                        {examples
                            .filter((item) => item.kind === "video")
                            .map((item) => (
                                <ModelTableRow key={item.id} item={item} />
                            ))}
                        <tr className="libtv-table-section">
                            <th colSpan={3}>{t("pricing.imageModels")}</th>
                        </tr>
                        {examples
                            .filter((item) => item.kind === "image")
                            .map((item) => (
                                <ModelTableRow key={item.id} item={item} />
                            ))}
                    </tbody>
                </table>
            </div>
            <p>{t("pricing.tableNote")}</p>
        </section>
    );
}

function ModelTableRow({ item }: { item: (typeof generationExamples)[number] }) {
    return (
        <tr>
            <th>{item.model}</th>
            <td>{item.specification}</td>
            <td>{item.parameters}</td>
        </tr>
    );
}

export function CreditReferenceTable() {
    const { t, number } = useI18n();
    const prices = useQuery({ queryKey: ["public-customer-prices"], queryFn: getPublicCustomerPrices, staleTime: 0 });
    const operations: Record<string, PricingKey> = {
        text_to_image: "modelPickerPrice.textImage",
        image_to_image: "modelPickerPrice.imageImage",
        text_to_video: "modelPickerPrice.textVideo",
        image_to_video: "modelPickerPrice.imageVideo",
        reference_to_video: "modelPickerPrice.imageVideo",
        video_to_video: "modelPickerPrice.videoVideo",
        video_edit: "modelPickerPrice.videoVideo",
        video_extend: "modelPickerPrice.videoVideo",
    };
    return (
        <section className="libtv-generation-table">
            <h2>{t("pricing.creditReferenceTitle")}</h2>
            <div className="libtv-generation-scroll">
                <table>
                    <thead>
                        <tr>
                            <th>{t("pricing.colModel")}</th>
                            <th>{t("pricing.creditReferenceSpec")}</th>
                            <th>{t("pricing.creditReferenceCost")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {prices.data?.prices.map((row, index) => (
                            <tr key={index}>
                                <th>{row.modelName}</th>
                                <td>
                                    {operations[row.intent.operation || ""] ? `${t(operations[row.intent.operation || ""])} · ` : ""}
                                    {publicPriceSpecification(row)}
                                    {row.intent.options?.videoGenerateAudio === true ? ` · ${t("canvasPrompt.referenceTab.audio")}` : ""}
                                </td>
                                <td>{t("modelPickerPrice.cost", { amount: number(row.quote.amountMicrocredits / 1_000_000, { maximumFractionDigits: 2 }) })}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {prices.isError ? <p role="alert">{t("common.requestFailed")}</p> : null}
            <p>{t("pricing.creditReferenceNote")}</p>
        </section>
    );
}

function PricingFaq({ onAction }: { onAction: () => void }) {
    const { t, locale } = useI18n();
    const faqs = PRICING_FAQS[locale as keyof typeof PRICING_FAQS] || PRICING_FAQS["en-US"];
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <section className="libtv-faq">
            <h2>{t("pricing.faqTitle")}</h2>
            <div>
                {faqs.map((faq, index) => {
                    const isOpen = openIndex === index;
                    return (
                        <section key={index} className={"libtv-faq-item " + (isOpen ? "is-open" : "")}>
                            <button type="button" aria-expanded={isOpen} onClick={() => setOpenIndex(isOpen ? null : index)}>
                                <span>{faq.question}</span>
                                <ChevronDown aria-hidden />
                            </button>
                            {/* Answers stay in the prerendered DOM so the FAQPage schema matches visible text. */}
                            <div className="libtv-faq-answer" hidden={!isOpen}>
                                <p>{faq.answer}</p>
                            </div>
                        </section>
                    );
                })}
            </div>
        </section>
    );
}
