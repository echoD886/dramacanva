import { SITE_URL } from "@/lib/site-identity";
import config from "./annual-campaign.json";
import type { PaymentProduct } from "@/services/api/wallet";
import { allowanceOptions, resolveMembershipOffer, type OfferPlan } from "./membership-offers";
export const ANNUAL_CAMPAIGN = Object.freeze(config);
export function campaignClock(now: number) {
    const start=Date.parse(config.startsAt), end=Date.parse(config.endsAt);
    const status=now<start ? "upcoming" : now>=end ? "expired" : "active";
    const remaining=Math.max(0,Math.min(Math.ceil((end-now)/1000),config.durationDays*86400));
    return { status,remaining,days:Math.floor(remaining/86400),hours:Math.floor(remaining/3600)%24,minutes:Math.floor(remaining/60)%60,seconds:remaining%60 };
}
/** Marketing prices require this site's published products. The imported CNY
 * reference catalog is a design preview, not evidence of our credit value. */
export function annualCampaignQuote(locale: string, products: PaymentProduct[] = [], now=Date.now()) {
    const candidates=(["standard","advanced","premium","luxury","supreme"] as OfferPlan[]).flatMap(plan=>allowanceOptions("creator",plan).map(allowance=>({
        plan, allowance, offer:resolveMembershipOffer("creator",plan,"annual",allowance,locale,products),
    })));
    const offers=candidates; // All candidates are from the site-owned approved policy.
    const from=offers.length ? [...offers].sort((a,b)=>a.offer.amountMinor-b.offer.amountMinor)[0].offer : null;
    const bestValue=offers.length ? [...offers].sort((a,b)=>a.offer.unitAmount-b.offer.unitAmount || a.offer.amountMinor-b.offer.amountMinor)[0] : null;
    return { ...campaignClock(now), from, bestValue, maxDiscount:Math.max(0,...offers.map(candidate=>candidate.offer.discountPercent)), preview:!bestValue?.offer.product, endsAt:config.endsAt };
}

/** The banner CTA selects the same annual allowance as the advertised rate. */
export function annualCampaignHref(href: string, quote:ReturnType<typeof annualCampaignQuote>) {
    const url=new URL(href,SITE_URL);
    for(const key of ["purchase","audience","plan"])url.searchParams.delete(key);
    url.searchParams.set("cycle","annual");
    if (quote.bestValue) url.searchParams.set(`tier.creator.${quote.bestValue.plan}`,String(quote.bestValue.allowance));
    return url.pathname+url.search+url.hash;
}
