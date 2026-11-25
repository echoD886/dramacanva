import {ownedQuote} from "@/lib/owned-pricing";
import { cycleSavingPercent } from "@/pages/pricing/membership-offers";
import {formatDisplayMoney} from "@/lib/display-money";
import { useEffect, useState } from "react";
import { usePrerenderTime } from "@/lib/prerender-state";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/i18n/use-i18n";
import { useUserStore } from "@/stores/use-user-store";
import { getPaymentOptions } from "@/services/api/wallet";
import { ANNUAL_CAMPAIGN, annualCampaignQuote, campaignClock } from "@/pages/pricing/annual-campaign";
export function useAnnualOffer() {
    const renderedAt = usePrerenderTime();
    const {locale}=useI18n(); const user=useUserStore(s=>s.user);
    const query=useQuery({queryKey:["payment-options",user?.id],queryFn:getPaymentOptions,retry:false,staleTime:30000});
    const [now,setNow]=useState(()=>renderedAt ?? Date.now());
    useEffect(()=>{const tick=()=>setNow(Date.now());tick();const id=setInterval(tick,1000);document.addEventListener("visibilitychange",tick);return()=>{clearInterval(id);document.removeEventListener("visibilitychange",tick);};},[]);
    return {clock:campaignClock(now),quote:annualCampaignQuote(locale,query.data?.products||[],now)};
}
export function AnnualCountdown({clock}: {clock:ReturnType<typeof campaignClock>}) {
    const {t,number}=useI18n();
    // 活动结束后不再挂一个“优惠已结束”的标签，避免与正在进行的其他活动冲突。
    if (clock.status==='expired') return null;
    return <span className="sa-annual-countdown" role="timer" aria-live="off" data-deadline={ANNUAL_CAMPAIGN.endsAt} data-remaining={clock.remaining}>
        <span>{t(clock.status==='expired'?"campaign.ended":"campaign.endsIn")}</span>
        {clock.status!=='expired' ? ([['days',clock.days],['hours',clock.hours],['minutes',clock.minutes],['seconds',clock.seconds]] as const).map(([unit,value])=><span key={unit}><b>{number(value,{minimumIntegerDigits:2,useGrouping:false})}</b> {t(`campaign.${unit}`)}</span>) : null}
    </span>;
}
const campaignPlanNames = {standard:"pricing.planStandard",advanced:"pricing.planAdvanced",premium:"pricing.planPremium",luxury:"pricing.planLuxury",supreme:"pricing.planSupreme"} as const;
export function AnnualOfferCopy({quote, campaignActive=false}: {quote:ReturnType<typeof annualCampaignQuote>; campaignActive?: boolean}) {
    const {t,number,locale}=useI18n();
    // Unconfigured or unavailable pricing must not promote competitor-derived values.
    if (!quote.bestValue) return <span className="sa-annual-copy" data-campaign-price-status="unconfirmed">
        <strong>{t("campaign.priceReviewTitle")}</strong>
        <small>{t("campaign.priceReviewDetails")}</small>
    </span>;
    const {plan,allowance,offer}=quote.bestValue;
    // 积分阶梯后各周期单价不同：横幅讲真实的年付优惠，示例用入门档（标准版），十月活动期间再补一句首月价。
    const example="standard" as const;
    const monthly=ownedQuote(example,"monthly"),annual=ownedQuote(example,"annual");
    const planName=t(campaignPlanNames[example]);
    return <span className="sa-annual-copy" data-annual-usd-cents={offer.amountMinor} data-campaign-plan={plan} data-campaign-allowance={allowance} data-campaign-credit-rate={offer.unitAmount}>
        <strong>{t("campaign.ladderHeadline",{percent:cycleSavingPercent("annual")})}</strong>
        <small>{t("campaign.ladderDetails",{plan:planName,monthly:formatDisplayMoney(monthly.amountMinor,"USD",locale),annual:formatDisplayMoney(annual.amountMinor,"USD",locale),monthlyCredits:number(monthly.credits),annualCredits:number(annual.credits)})}{campaignActive ? " "+t("campaign.firstMonthNote",{plan:planName,amount:formatDisplayMoney(1990,"USD",locale)}) : ""}</small>
    </span>;
}
