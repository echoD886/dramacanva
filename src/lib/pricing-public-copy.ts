import pt from "../i18n/messages/pricing.pt-BR";
import { BLOG_LOCALES, type BlogLocale } from "../content/blog-locales";
import { byokRelayFaq } from "./byok-relay-copy";
import { publicMarketMessages } from "../i18n/public-market-messages";
import { isMarketLocale } from "./public-market-copy";
import en from "../i18n/messages/pricing.en-US";
import zh from "../i18n/messages/pricing.zh-CN";
import ja from "../i18n/messages/pricing.ja-JP";
import ko from "../i18n/messages/pricing.ko-KR";
import es from "../i18n/messages/pricing.es-ES";
import {toTraditionalChinese} from "./i18n-traditional";
import {OWNED_PRICING,ownedQuote,ownedPlanKeys} from "./owned-pricing";
import {formatPaymentAmount} from "./payment-money";
export function pricingMessage(locale:string,key:string,values:Record<string,string|number>={}) {
    const catalogs:Record<string,Record<string,string>>={'en-US':en,'zh-CN':zh,'ja-JP':ja,'ko-KR':ko,'es-ES':es,'pt-BR':pt};
    const catalog=catalogs[locale]|| (locale.startsWith('zh')?zh:en);
    const marketText=isMarketLocale(locale)?publicMarketMessages(locale)[key]:undefined;
    let text=(marketText||catalog[key]||en[key as keyof typeof en]||key).replace(/\{(\w+)\}/g,(all,k)=>String(values[k]??all));
    if(!marketText&&(locale==='zh-HK'||locale==='zh-TW'))text=toTraditionalChinese(text,locale);
    return text;
}
/** Live catalog amounts for FAQ copy, formatted for the reader's locale (never hard-code prices in copy). */
export function pricingFaqValues(locale:string): Record<string,string> {
    const month=ownedQuote('standard','monthly'),year=ownedQuote('standard','annual');
    const number=(n:number)=>new Intl.NumberFormat(locale).format(n);
    const unit=(minor:number,credits:number)=>new Intl.NumberFormat(locale,{style:'currency',currency:'USD',minimumFractionDigits:4,maximumFractionDigits:4}).format(minor/100/credits);
    const values={plan:pricingMessage(locale,'pricing.planStandard'),monthly:formatPaymentAmount(month.amountMinor,'USD',locale),annual:formatPaymentAmount(year.amountMinor,'USD',locale),monthlyCredits:number(month.credits),annualCredits:number(year.credits),monthlyUnit:unit(month.amountMinor,month.credits),annualUnit:unit(year.amountMinor,year.credits)};
    return values;
}
export function fillPricingValues(text:string, values:Record<string,string>) {
    return text.replace(/\{(\w+)\}/g,(all,k)=>values[k]??all);
}
export function publicPricingFaqs(locale:string) {
    // 积分阶梯：以入门档为例说明周期越长越划算（价格不变、多送积分）。
    const values=pricingFaqValues(locale);
    return [{question:pricingMessage(locale,'pricing.parityQuestion'),answer:pricingMessage(locale,'pricing.parityAnswer',values)},
        ...[1,2,3,4,5,6].map(n=>({question:pricingMessage(locale,`pricing.faq${n}t`),answer:pricingMessage(locale,`pricing.faq${n}b`)})), byokRelayFaq(BLOG_LOCALES.find(candidate => candidate === locale) ?? "en-US")];
}
export function pricingMarkdown(locale: BlogLocale = "en-US") {
    if (locale !== "en-US") {
        const text = (key: string) => pricingMessage(locale, key);
        const month = text("pricing.perMonth"), year = text("pricing.perYear");
        const headers = [text("pricing.creditPackName"), `${text("pricing.billingTotal")} (${month})`, `${text("pricing.creditPackCredits")} (${month})`, `${text("pricing.billingTotal")} (${year})`, `${text("pricing.creditPackCredits")} (${year})`, `${text("pricing.includedUnitCost")} (USD)`];
        const number = (value: number) => new Intl.NumberFormat(locale).format(value);
        const rows = ownedPlanKeys.map(key => {
            const m = ownedQuote(key, "monthly"), y = ownedQuote(key, "annual");
            const name = text(OWNED_PRICING.plans.find(plan => plan.key === key)!.nameKey);
            return `| ${name} | ${formatPaymentAmount(m.amountMinor, "USD", locale)} | ${number(m.credits)} | ${formatPaymentAmount(y.amountMinor, "USD", locale)} | ${number(y.credits)} | ${new Intl.NumberFormat(locale, { minimumFractionDigits: 6, maximumFractionDigits: 6 }).format(m.unitAmount)} |`;
        });
        return [`## ${text("pricing.ownedPolicy")} (${OWNED_PRICING.version})`, "", `| ${headers.join(" | ")} |`, "|---|---:|---:|---:|---:|---:|", ...rows, "", publicPricingFaqs(locale)[0].answer, "", `${text("pricing.byokServiceFee")}: ${formatPaymentAmount(OWNED_PRICING.byok.amountMinor, "USD", locale)}.`, text("pricing.byokFeeBoundary"), "", text("pricing.policyMismatch"), text("pricing.topupSeparate"), ""].join("\n");
    }
    const rows=ownedPlanKeys.map(key=>{const m=ownedQuote(key,'monthly'),y=ownedQuote(key,'annual');return `| ${key} | USD ${(m.amountMinor/100).toFixed(2)} | ${m.credits} | USD ${(y.amountMinor/100).toFixed(2)} | ${y.credits} | USD ${m.unitAmount.toFixed(6)} |`;});
    return `## Site-owned membership pricing (${OWNED_PRICING.version})\n\n| Tier | Monthly total | Monthly-period credits | Annual total | Annual-period credits | Same USD/credit |\n|---|---:|---:|---:|---:|---:|\n${rows.join('\n')}\n\nBYOK Studio Pass is a separate workspace service: USD ${(OWNED_PRICING.byok.amountMinor/100).toFixed(2)} per ${OWNED_PRICING.byok.months} months, with no bundled model credits. Provider usage is paid separately.

Amounts are native USD, not a competitor currency conversion. Annual credits are a full-year total, not a monthly allowance. Same tier has the same USD/credit for each billing period. Checkout remains unavailable until the server product matches both amount and credits and payments are configured. One-time top-ups are separate products; the Supreme membership rate is not a universal recharge or model-per-second rate.\n`;
}
