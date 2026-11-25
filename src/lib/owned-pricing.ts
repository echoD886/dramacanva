import policy from "@/demo/pricing.json";
import type { PaymentProduct } from "@/services/api/wallet";
export const OWNED_PRICING = policy;
export type OwnedPlanKey = "standard" | "advanced" | "premium" | "luxury" | "supreme";
export type OwnedCycle = "monthly" | "quarterly" | "annual";
export const ownedPlanKeys = policy.plans.map(plan => plan.key as OwnedPlanKey);
export function ownedPlan(key: OwnedPlanKey) {
    const plan = policy.plans.find(item => item.key === key);
    if (!plan) throw new RangeError("Unknown site plan");
    return plan;
}
/** 季付价格固定为 3 个月月付价；积分按阶梯多送（目录里的 quarterly.credits，缺省为 3 倍月付积分）。 */
export function ownedQuarterlyCredits(plan: ReturnType<typeof ownedPlan>) {
    return "quarterly" in plan && plan.quarterly?.credits ? plan.quarterly.credits : plan.monthly.credits * 3;
}
export function ownedQuote(key: OwnedPlanKey, cycle: OwnedCycle) {
    const plan=ownedPlan(key), months=cycle==='annual'?12:cycle==='quarterly'?3:1;
    const source=cycle==='annual'?plan.annual:plan.monthly;
    const multiplier=cycle==='quarterly'?3:1;
    return {key,cycle,months,currency:'USD' as const,sku:cycle==='quarterly'?`${plan.monthly.sku}_quarterly`:source.sku,
        amountMinor:source.amountMinor*multiplier,credits:cycle==='quarterly'?ownedQuarterlyCredits(plan):source.credits,
        interval:cycle==='annual'?'year' as const:'month' as const,intervalCount:cycle==='quarterly'?3:1,
        catalogKey:`creator.${key}.${cycle==='annual'?'year':'month'}`,
        monthlySelection:plan.monthly.credits,unitAmount:plan.monthly.amountMinor/100/plan.monthly.credits,
        version:policy.version};
}
export function matchesOwnedQuote(product: PaymentProduct, quote: ReturnType<typeof ownedQuote>, audience='creator') {
    const key=quote.catalogKey.replace('creator.',`${audience}.`);
    const identified=product.catalogKey===key || product.catalogKey===`${key}.${quote.months}.${quote.monthlySelection}` || (!product.catalogKey&&audience==='creator'&&product.sku===quote.sku);
    return identified && product.enabled && product.kind==='subscription' && product.currency?.toUpperCase()==='USD' && product.interval===quote.interval && (product.intervalCount||1)===quote.intervalCount
        && product.amountMinor===quote.amountMinor && product.creditsMicrocredits===quote.credits*1_000_000;
}
