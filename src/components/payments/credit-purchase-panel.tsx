import { promoForSku } from "@/pages/pricing/black-friday";
import { checkoutErrorText, goToCheckout, releaseCheckoutTab } from "@/lib/checkout-tab";
import { rememberCheckoutSource } from "@/lib/checkout-exit-offer";
import { ownedQuote } from "@/lib/owned-pricing";
import { App } from "antd";
import { PromotionCode } from "./promotion-code";
import { promotionFromSearch, requiresCheckoutConfirmation } from "@/lib/checkout-confirmation";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useI18n } from "@/i18n/use-i18n";
import { useUserStore } from "@/stores/use-user-store";
import { createStripeCheckout, createStripeCustomCreditCheckout, getPaymentOptions, type PaymentProduct, type PaymentProviderId } from "@/services/api/wallet";
import { PaymentProviderPopover, filterSupportedProviders, type PaymentProductType } from "./payment-provider-popover";
import { PaymentMethodsMiniRow } from "./payment-methods-section";
import { creditCatalogWithDefaults, customCreditMinimum, customCreditMaximum, customCreditStep, customCreditDiscountTiers, defaultCustomCreditPack, formatDiscountPercent } from "@/lib/payment-currency";
import { quoteCreditPurchase } from "@/lib/credit-purchase-quote";
import { displayCurrency, formatDisplayMoney, formatDisplayUnitPrice } from "@/lib/display-money";
import { formatPaymentAmount, formatPaymentUnitPrice } from "@/lib/payment-money";
import { RollingValue, RollingValueGroup } from "./rolling-value";
import { pricingUxCopy } from "@/pages/pricing/pricing-ux-copy";
import { defaultScenario, type ValueScenario } from "@/pages/pricing/generation-value";
import { publicGenerationValue } from "@/lib/public-pricing";
import { getPublicCustomerPrices } from "@/services/api/logical-models";
import { ValueScenarioControls } from "@/pages/pricing/value-scenario-controls";
import { interpolateMessage } from "@/i18n/messages";
import "./credit-purchase.css";

/** One catalog and calculator power public pricing and the signed-in credit store. */
export function CreditPurchasePanel({ promo: sharedPromo, onPromoChange }: { promo?: string; onPromoChange?: (value: string) => void } = {}) {
    const { t, locale, number } = useI18n();
    const { message, modal } = App.useApp();
    const rangeId = useId();
    const copy = pricingUxCopy(locale);
    const [scenario, setScenario] = useState<ValueScenario>(defaultScenario);
    const memberQuote = ownedQuote("supreme", "monthly");
    const user = useUserStore((state) => state.user);
    const location = useLocation();
    const [localPromo, setLocalPromo] = useState(() => promotionFromSearch(location.search));
    const promo = sharedPromo ?? localPromo;
    const navigate = useNavigate();
    const query = useQuery({ queryKey: ["payment-options", user?.id], queryFn: getPaymentOptions, retry: false, staleTime: 30_000 });
    const data = query.data;
    const products = creditCatalogWithDefaults(
        (data?.products || []).filter((p) => p.kind === "credits"),
        data?.creditCatalogConfigured === true,
    );
    const configuredCustom = data?.customCredits?.enabled ? data.customCredits : null;
    const custom = configuredCustom || defaultCustomCreditPack;
    const [input, setInput] = useState<string | null>(() => new URLSearchParams(location.search).get("credits"));
    const amount = input === null ? customCreditMinimum(custom) : input.trim() === "" ? null : Number(input);
    const quote = quoteCreditPurchase(custom, amount, products);
    const preview = quote.preview;
    const configuredQuote = quote.fixedProduct ? Boolean(data?.products.some((p) => p.enabled && (p.kind || "credits") === "credits" && p.sku === quote.fixedProduct?.sku)) : Boolean(configuredCustom);
    const [busy, setBusy] = useState(false);
    // Only the button that started the checkout says "preparing"; the others are just disabled meanwhile.
    const [busyKey, setBusyKey] = useState<string | null>(null);
    const busyRef = useRef(false);
    const requestKeyRef = useRef("");
    const requestSelectionRef = useRef("");
    const [popoverTarget, setPopoverTarget] = useState<{
        itemType: PaymentProductType;
        itemTitle: string;
        amountMinor: number;
        currency: string;
        anchorElement: HTMLElement;
        product?: PaymentProduct;
        fromCustomButton?: boolean;
    } | null>(null);
    const [popoverSubmitting, setPopoverSubmitting] = useState(false);
    const [popoverError, setPopoverError] = useState<string | null>(null);
    const available = query.isSuccess && !query.isFetching && Boolean(data?.checkoutEnabled);
    const money = (value: number, currency: string) => formatDisplayMoney(value, currency, locale);
    const unit = (value: number, currency: string, microcredits: number) => formatDisplayUnitPrice(value, currency, microcredits / 1_000_000, locale);
    const tiers = customCreditDiscountTiers(custom);
    const nextTier = tiers.find((tier) => tier.minQuantity * customCreditStep(custom) > (amount || 0));
    const sliderValue = Number.isFinite(amount) ? Math.max(customCreditMinimum(custom), Math.min(customCreditMaximum(custom), amount || customCreditMinimum(custom))) : customCreditMinimum(custom);
    const chooseQuantity = (credits: number) => setInput(String(credits));
    const packKeys = { credits_trial_990: "pricing.creditPackTrial", credits_small: "pricing.creditPackSmall", credits_medium: "pricing.creditPackMedium", credits_large: "pricing.creditPackLarge" } as const;

    const checkout = async (product?: PaymentProduct, explicitProvider?: PaymentProviderId, fromCustomButton = false) => {
        if (busyRef.current || !available) return;
        if (!user) {
            const returnParams = new URLSearchParams(location.search);
            if (location.pathname.endsWith("/pricing")) returnParams.set("purchase", "credits");
            const selectedCredits = product ? product.creditsMicrocredits / 1_000_000 : amount;
            if (selectedCredits !== null) returnParams.set("credits", String(selectedCredits));
            if (promo.trim()) returnParams.set("promo", promo.trim());
            navigate(`/login?next=${encodeURIComponent(location.pathname + "?" + returnParams.toString())}`);
            return;
        }
        if (product ? !data?.products.some((p) => p.enabled && p.kind === "credits" && p.sku === product.sku) : !configuredCustom || !preview) return;

        const itemType: PaymentProductType = product ? "credits" : quote.fixedProduct ? "credits" : "customCredits";
        const providers = data?.paymentProviders || [];
        const supported = filterSupportedProviders(providers, itemType);

        let chosenProvider = explicitProvider;
        if (!chosenProvider) {
            if (supported.length === 1) {
                chosenProvider = supported[0].id;
            } else if (supported.length > 1) {
                const anchor = (product ? document.querySelector<HTMLElement>(`[data-pack-sku="${product.sku}"] .sa-credit-buy`) : document.querySelector<HTMLElement>(".sa-credit-custom .sa-credit-buy")) || document.body;
                const itemTitle = product ? (packKeys[product.sku as keyof typeof packKeys] ? t(packKeys[product.sku as keyof typeof packKeys]) : product.name) : t("pricing.creditPackCustom");
                const amountMinor = product ? product.amountMinor : (preview?.payableAmountMinor ?? 0);
                const currency = product?.currency || custom.currency;
                setPopoverError(null);
                setPopoverSubmitting(false);
                setPopoverTarget({
                    itemType,
                    itemTitle,
                    amountMinor,
                    currency,
                    anchorElement: anchor,
                    product,
                    fromCustomButton,
                });
                return;
            }
        }

        busyRef.current = true;
        setBusy(true);
        setBusyKey(fromCustomButton ? "custom" : product ? product.sku : "custom");
        if (popoverTarget) {
            setPopoverSubmitting(true);
            setPopoverError(null);
        }
        const selected = JSON.stringify([product?.sku, preview?.quantity, promo.trim(), locale, chosenProvider]);
        if (selected !== requestSelectionRef.current || !requestKeyRef.current) {
            requestKeyRef.current = crypto.randomUUID();
            requestSelectionRef.current = selected;
        }
        try {
            const options = { promo: promoForSku(promo, product?.sku), locale, ...(chosenProvider ? { provider: chosenProvider } : {}) };
            const result = product ? await createStripeCheckout(product.sku, requestKeyRef.current, options) : await createStripeCustomCreditCheckout(preview!.quantity, requestKeyRef.current, options);
            const listAmount = product?.amountMinor ?? preview!.payableAmountMinor;
            if (requiresCheckoutConfirmation(listAmount, result.payableMinor)) {
                const confirmed = await modal.confirm({
                    title: t("pricing.actualCharge", { amount: formatPaymentAmount(result.payableMinor, product?.currency || custom.currency, locale) }),
                    content: t("pricing.promoApplied"),
                    okText: t("pricing.offerConfirm"),
                    cancelText: t("pricing.changeCancel"),
                });
                if (!confirmed) {
                    releaseCheckoutTab();
                    busyRef.current = false;
                    setBusy(false);
                    setBusyKey(null);
                    setPopoverSubmitting(false);
                    return;
                }
            }
            rememberCheckoutSource({ kind: "order", id: result.order.id, sku: result.order.productSku, provider: result.order.provider, flow: product ? "credits" : "custom", quantity: product ? undefined : preview?.quantity });
            const target = new URL(result.url);
            if (target.protocol !== "https:") throw new Error(t("pricing.invalidCheckout"));
            // The cashier opens in a new tab when the click reserved one; this page stays and offers the way back.
            // Without a tab we stay busy while the browser leaves, so a second click cannot open another session.
            if (goToCheckout(target.toString()) === "tab") {
                busyRef.current = false;
                setBusy(false);
                setBusyKey(null);
                setPopoverSubmitting(false);
                setPopoverTarget(null);
            }
        } catch (error) {
            const errText = error instanceof Error ? error.message : t("pricing.checkoutFailed");
            releaseCheckoutTab();
            if (popoverTarget) {
                setPopoverError(checkoutErrorText(error, t("checkout.error")));
                setPopoverSubmitting(false);
            } else {
                message.error(errText);
            }
            busyRef.current = false;
            setBusy(false);
            setBusyKey(null);
        }
    };
    useEffect(() => {
        // Returning from the payment page via Back restores this page from bfcache while still busy.
        const onPageShow = (event: PageTransitionEvent) => {
            if (!event.persisted) return;
            requestKeyRef.current = "";
            busyRef.current = false;
            setBusy(false);
        };
        window.addEventListener("pageshow", onPageShow);
        return () => window.removeEventListener("pageshow", onPageShow);
    }, []);
    return (
        <section data-display-currency={displayCurrency(locale)} className="sa-credit-purchase" aria-label={t("pricing.creditPacksTitle")} data-catalog-state={query.isError ? "error" : available ? "ready" : "preview"}>
            <header className="sa-credit-heading">
                <h2>{t("pricing.creditPacksTitle")}</h2>
                <p>{copy.packNote}</p>
            </header>
            {sharedPromo === undefined ? <PromotionCode value={promo} onChange={onPromoChange || setLocalPromo} /> : null}
            <details className="sa-credit-output-controls">
                <summary>{copy.outputsTitle}</summary>
                <ValueScenarioControls value={scenario} onChange={setScenario} />
                <p>{copy.outputsNote}</p>
            </details>
            <p className="sa-credit-membership-distinction">
                {t("pricing.topupMembershipBoundary", {
                    monthly: formatPaymentAmount(memberQuote.amountMinor, "USD", locale),
                    credits: number(memberQuote.credits),
                    unitPrice: formatPaymentAmount(memberQuote.amountMinor / memberQuote.credits, "USD", locale),
                })}
            </p>
            {query.isPending ? (
                <p role="status">{t("pricing.creditPacksLoading")}</p>
            ) : query.isError ? (
                <p role="alert">
                    {t("pricing.catalogLoadError")}{" "}
                    <button type="button" onClick={() => void query.refetch()}>
                        {t("wallet.retry")}
                    </button>
                </p>
            ) : !available ? (
                <p role="status">{t("pricing.creditPacksCheckoutPlanned")}</p>
            ) : null}
            <div className="sa-credit-pack-grid">
                {products.map((product) => {
                    const referencePrice = product.originalAmountMinor;
                    const hasDiscount = Number.isSafeInteger(referencePrice) && referencePrice! > product.amountMinor && product.amountMinor > 0;
                    const discount = hasDiscount ? 1 - product.amountMinor / referencePrice! : 0;
                    const featured = product.sku === "credits_medium";
                    return (
                        <RollingValueGroup className={`sa-credit-pack${featured ? " is-featured" : ""}`} data-pack-sku={product.sku} key={product.sku}>
                            <div className="sa-credit-pack-badge">{featured ? copy.recommended : product.sku === "credits_trial_990" ? t("pricing.creditPackTrialBadge") : t("pricing.creditPacksOneTime")}</div>
                            <h3>{packKeys[product.sku as keyof typeof packKeys] ? t(packKeys[product.sku as keyof typeof packKeys]) : product.name}</h3>
                            <div className="sa-credit-pack-price-row">
                                <strong className="sa-credit-price">
                                    <RollingValue animateOnMount value={money(product.amountMinor, product.currency)} />
                                </strong>
                                {hasDiscount ? <s>{money(referencePrice!, product.currency)}</s> : null}
                            </div>
                            {hasDiscount ? (
                                <div className="sa-credit-discount">
                                    <span>{t("pricing.offerSavings", { percent: number(discount * 100, { maximumFractionDigits: 1 }) })}</span>
                                    <small>{copy.discountBasis}</small>
                                </div>
                            ) : null}
                            <p className="sa-credit-pack-quantity">
                                <b>
                                    <RollingValue value={number(product.creditsMicrocredits / 1_000_000)} />
                                </b>{" "}
                                {t("pricing.creditPacksCreditsUnit")}
                            </p>
                            <p>{t("pricing.creditPacksUnitPrice", { price: unit(product.amountMinor, product.currency, product.creditsMicrocredits) })}</p>
                            <p>{t("pricing.actualCharge", { amount: formatPaymentAmount(product.amountMinor, product.currency, locale) })}</p>
                            <CreditOutputEstimate credits={product.creditsMicrocredits / 1_000_000} scenario={scenario} />
                            <button className="sa-credit-buy" type="button" disabled={busy || !available} onClick={() => void checkout(product)}>
                                {t(busyKey === product.sku ? "pricing.creatingCheckout" : "pricing.offerSelect")}
                            </button>
                            <PaymentMethodsMiniRow paymentProviders={data?.paymentProviders || []} locale={locale} />
                        </RollingValueGroup>
                    );
                })}
            </div>
            <RollingValueGroup className="sa-credit-custom" data-custom-purchase="true" data-quote-source={quote.fixedProduct ? "fixed" : "custom"}>
                <div className="sa-credit-custom-entry">
                    <h3>{t("pricing.creditPackCustom")}</h3>
                    <p>{t("pricing.customCreditsMinimum", { min: number(customCreditMinimum(custom)) })}</p>
                    <p>{t("pricing.localDisplayNotice", { currency: displayCurrency(locale), settlement: custom.currency.toUpperCase() })}</p>
                    {quote.fixedProduct ? <p className="sa-credit-preview-note">{t("pricing.creditFixedMatch")}</p> : null}
                    {!configuredQuote ? (
                        <p className="sa-credit-preview-note" role="status">
                            {t("pricing.customPreviewOnly")}
                        </p>
                    ) : null}
                    <label className="sa-credit-quantity">
                        <span>{t("pricing.customCreditsInput")}</span>
                        <input
                            type="number"
                            inputMode="numeric"
                            min={customCreditMinimum(custom)}
                            max={customCreditMaximum(custom)}
                            step={customCreditStep(custom)}
                            value={input ?? String(customCreditMinimum(custom))}
                            onChange={(event) => setInput(event.target.value)}
                            aria-invalid={!preview}
                            aria-describedby={rangeId}
                        />
                    </label>
                    <input
                        className="sa-credit-slider"
                        type="range"
                        aria-label={t("pricing.customCreditsInput")}
                        min={customCreditMinimum(custom)}
                        max={customCreditMaximum(custom)}
                        step={customCreditStep(custom)}
                        value={sliderValue}
                        onChange={(event) => chooseQuantity(Number(event.target.value))}
                    />
                    <small id={rangeId}>
                        {t("pricing.customCreditsRange", { min: number(customCreditMinimum(custom)), max: number(customCreditMaximum(custom)) })} · {t("pricing.customCreditsStep", { step: number(customCreditStep(custom)) })}
                    </small>
                    <div className="sa-credit-presets" aria-label={t("pricing.customCreditsDiscountIntro")}>
                        {[customCreditMinimum(custom), ...tiers.map((tier) => tier.minQuantity * customCreditStep(custom))]
                            .filter((n, i, a) => a.indexOf(n) === i)
                            .map((credits) => (
                                <button key={credits} type="button" aria-pressed={amount === credits} onClick={() => chooseQuantity(credits)}>
                                    {number(credits)}
                                </button>
                            ))}
                    </div>
                    {nextTier && preview ? <p className="sa-credit-next-tier">{t("pricing.offerNextTier", { credits: number(nextTier.minQuantity * customCreditStep(custom) - (amount || 0)) })}</p> : null}
                    <p>{t("pricing.topupSeparate")}</p>
                </div>
                <div className="sa-credit-custom-total">
                    <h3>{copy.receiptTitle}</h3>
                    {preview ? (
                        <p className="sa-credit-receipt-quantity">
                            {copy.selectedCredits}:{" "}
                            <strong>
                                <RollingValue value={number(preview.creditsMicrocredits / 1_000_000)} />
                            </strong>
                        </p>
                    ) : null}
                    {preview ? (
                        <dl aria-live="polite" aria-atomic="true">
                            <div>
                                <dt>{t("pricing.customCreditsCurrentUnitPrice")}</dt>
                                <dd>
                                    <RollingValue animateOnMount value={unit(preview.payableAmountMinor, custom.currency, preview.creditsMicrocredits)} />
                                </dd>
                            </div>
                            <div>
                                <dt>{copy.discountBasis}</dt>
                                <dd>
                                    {preview.discountAmountMinor > 0 ? (
                                        <s>
                                            <RollingValue animateOnMount value={money(preview.baseAmountMinor, custom.currency)} />
                                        </s>
                                    ) : (
                                        <RollingValue value={money(preview.baseAmountMinor, custom.currency)} />
                                    )}
                                </dd>
                            </div>
                            <div>
                                <dt>
                                    {t("pricing.creditPacksSaving")} ({formatDiscountPercent(preview.discountBasisPoints)}%)
                                </dt>
                                <dd>
                                    <RollingValue animateOnMount value={money(preview.discountAmountMinor, custom.currency)} />
                                </dd>
                            </div>
                            <div className="sa-credit-payable">
                                <dt>{t(available && configuredQuote ? "pricing.creditPacksPayable" : "pricing.creditEstimatedTotal")}</dt>
                                <dd>
                                    <RollingValue animateOnMount value={money(preview.payableAmountMinor, custom.currency)} />
                                </dd>
                            </div>
                        </dl>
                    ) : (
                        <p role="alert">{t("pricing.customCreditsInvalid")}</p>
                    )}
                    {preview ? <CreditOutputEstimate credits={preview.creditsMicrocredits / 1_000_000} scenario={scenario} /> : null}
                    <button className="sa-credit-buy" type="button" disabled={busy || !preview || !available || !configuredQuote} onClick={() => void checkout(quote.fixedProduct || undefined, undefined, true)}>
                        {t(busyKey === "custom" ? "pricing.creatingCheckout" : "pricing.offerSelect")}
                    </button>
                    <PaymentMethodsMiniRow paymentProviders={data?.paymentProviders || []} locale={locale} />
                    <p>{t("pricing.customCreditsDiscountIntro")}</p>
                    <div className="sa-credit-tiers">
                        {tiers.map((tier) => (
                            <small key={tier.minQuantity}>{t("pricing.customCreditsTier", { credits: number(tier.minQuantity * customCreditStep(custom)), percent: formatDiscountPercent(tier.discountBasisPoints) })}</small>
                        ))}
                    </div>
                </div>
            </RollingValueGroup>
            {popoverTarget ? (
                <PaymentProviderPopover
                    open={Boolean(popoverTarget)}
                    onClose={() => {
                        setPopoverTarget(null);
                        setPopoverError(null);
                        setPopoverSubmitting(false);
                    }}
                    anchorElement={popoverTarget.anchorElement}
                    itemType={popoverTarget.itemType}
                    itemTitle={popoverTarget.itemTitle}
                    amountMinor={popoverTarget.amountMinor}
                    currency={popoverTarget.currency}
                    paymentProviders={data?.paymentProviders || []}
                    userId={user?.id}
                    locale={locale}
                    isSubmitting={popoverSubmitting}
                    submitError={popoverError}
                    onConfirm={(chosen) => checkout(popoverTarget.product, chosen, popoverTarget.fromCustomButton)}
                    onRetry={() => checkout(popoverTarget.product, undefined, popoverTarget.fromCustomButton)}
                />
            ) : null}
        </section>
    );
}

function CreditOutputEstimate({ credits, scenario }: { credits: number; scenario: ValueScenario }) {
    const { locale, t, number } = useI18n();
    const copy = pricingUxCopy(locale);
    const prices = useQuery({ queryKey: ["public-customer-prices"], queryFn: getPublicCustomerPrices, staleTime: 0 });
    const estimate = publicGenerationValue(prices.data?.prices || [], credits, scenario);
    if (!estimate) return null;
    return (
        <div className="sa-credit-output-estimate" data-price-source="model-catalog">
            <strong>{interpolateMessage(copy.outputsCount, { count: number(estimate.perPeriod) })}</strong>
            <span>
                {estimate.model.name} · {scenario.spec.toUpperCase()}
            </span>
            <small>{t("pricing.creditUsageExample", { credits: number(estimate.creditsPerResult), unit: t(estimate.model.kind === "video" ? "pricing.valuePerVideo" : "pricing.valuePerImage", { seconds: scenario.seconds }) })}</small>
            <small>{copy.outputsNote}</small>
        </div>
    );
}
