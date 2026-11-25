import { displayCurrency, formatDisplayMoney, formatDisplayUnitPrice } from "@/lib/display-money";
import { OWNED_PRICING, ownedPlan, ownedQuote, matchesOwnedQuote, type OwnedCycle, type OwnedPlanKey } from "@/lib/owned-pricing";
import type { PaymentProduct } from "@/services/api/wallet";
import { formatPaymentAmount } from "@/lib/payment-money";
export type OfferCycle = OwnedCycle;
export type OfferPlan = OwnedPlanKey;
export type OfferAudience = "creator" | "team";
export const cycleUnitKeys = {annual:"pricing.perYear",quarterly:"pricing.offerQuarter",monthly:"pricing.perMonth"} as const;
export const displayedPriceRatio: Record<OfferCycle, number> = {annual:55,quarterly:66,monthly:77};
/** 相对月付的每积分节省比例（向下取整，只说真实优惠）；不传 plan 时取所有档位的最高值。 */
export function cycleSavingPercent(cycle: OfferCycle, plan?: OfferPlan) {
    if (cycle === 'monthly') return 0;
    const keys = plan ? [plan] : (OWNED_PRICING.plans.map(item => item.key) as OfferPlan[]);
    return Math.max(0, ...keys.map(key => {
        const monthly = ownedQuote(key, 'monthly'), quote = ownedQuote(key, cycle);
        return Math.floor((1 - (quote.amountMinor / quote.credits) / (monthly.amountMinor / monthly.credits)) * 100 + 1e-9);
    }));
}
export const defaultAllowance = Object.fromEntries(OWNED_PRICING.plans.map(plan=>[plan.key,plan.monthly.credits])) as Record<OfferPlan,number>;
export function allowanceOptions(_audience: OfferAudience, plan: OfferPlan) { return [ownedPlan(plan).monthly.credits]; }
/** Legacy public helper now resolves only this site's USD policy, not imported prices. */
export function referenceOffer(audience: OfferAudience, plan: OfferPlan, cycle: OfferCycle, allowance=defaultAllowance[plan]) {
    if(allowance!==defaultAllowance[plan])throw new RangeError("Unsupported site plan allowance");
    const quote=ownedQuote(plan,cycle);
    return {audience,plan,months:quote.months,creditsPerMonth:defaultAllowance[plan],amountMinor:quote.amountMinor,originalAmountMinor:quote.amountMinor,renewalAmountMinor:null,autoRenew:false};
}
export function matchOfferProduct(products: PaymentProduct[], audience: OfferAudience, plan: OfferPlan, cycle: OfferCycle, allowance: number) {
    if(allowance!==defaultAllowance[plan])return undefined;
    const quote=ownedQuote(plan,cycle);
    // Teams use the published per-seat creator Price with Stripe quantity.
    return products.find(product=>matchesOwnedQuote(product,quote,audience === "team" ? "creator" : audience));
}
export function resolveMembershipOffer(audience: OfferAudience, plan: OfferPlan, cycle: OfferCycle, allowance: number, locale: string, products: PaymentProduct[] = [], seats = 1) {
    const quote=ownedQuote(plan,cycle);
    const product=matchOfferProduct(products,audience,plan,cycle,allowance);
    // 月付与季付共用 catalogKey（creator.x.month），只比较同一计费周期（interval + intervalCount）的商品，
    // 否则季付商品会让月付卡片误报「后台商品未同步」。
    const stale=products.some(p=>p.enabled&&p.kind==='subscription'&&(p.sku===quote.sku||(p.catalogKey===quote.catalogKey.replace('creator.',`${audience}.`)&&p.interval===quote.interval&&(p.intervalCount||1)===quote.intervalCount))&&!matchesOwnedQuote(p,quote,audience));
    const quantity=audience==='team'?Math.max(2,Math.min(50,Number.isFinite(seats)?Math.trunc(seats):2)):1;
    // The agreed Stripe amount remains the charge. The comparison price is
    // derived from the displayed 55/66/77-percent price ratio for this cycle.
    const original=Math.round(quote.amountMinor*100/displayedPriceRatio[cycle]);
    const discountPercent=100-displayedPriceRatio[cycle];
    return {
        policyVersion:OWNED_PRICING.version,priceMismatch:stale,fx:null,sourceAmountMinor:quote.amountMinor,sourceCurrency:'USD',
        product,source:product?'configured':'policy',currency:'USD',amountMinor:quote.amountMinor,
        credits:quote.credits,periodCredits:quote.credits,months:quote.months,quantity,delivery:'billing-period',
        displayCurrency:displayCurrency(locale),
        settlementPrice:formatPaymentAmount(quote.amountMinor,'USD',locale),
        settlementTotal:formatPaymentAmount(quote.amountMinor*quantity,'USD',locale),
        price:formatDisplayMoney(quote.amountMinor,'USD',locale),
        total:formatDisplayMoney(quote.amountMinor*quantity,'USD',locale),
        original:formatDisplayMoney(original,'USD',locale),
        monthlyEquivalent:formatDisplayMoney(quote.amountMinor/quote.months,'USD',locale),
        unitPrice:formatDisplayUnitPrice(quote.amountMinor,'USD',quote.credits,locale),
        unitAmount:quote.amountMinor/100/quote.credits,discountPercent,
        renewal:undefined as string|undefined,autoRenew:null as boolean|null,
    };
}
