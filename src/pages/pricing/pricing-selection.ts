import { allowanceOptions, defaultAllowance, type OfferCycle, type OfferPlan } from "./membership-offers";

export type PricingAudience = "creator" | "team" | "byok";
const planKeys: OfferPlan[] = ["standard", "advanced", "premium", "luxury", "supreme"];

/** URL-backed selection is read during render. Never mirror it into effects
 * that can replay an older cycle over a newer click. */
export function readPricingSelection(search: string) {
    const params = new URLSearchParams(search);
    const requested = params.get("cycle");
    const cycle: OfferCycle = requested === "monthly" || requested === "quarterly" ? requested : "annual";
    const creditPacksOpen = params.get("purchase") === "credits";
    const audience: PricingAudience = creditPacksOpen ? "creator" : params.get("plan") === "byok" ? "byok" : params.get("audience") === "team" ? "team" : "creator";
    const offerAudience = audience === "team" ? "team" : "creator";
    const allowances = {} as Record<OfferPlan, number>;
    const teamSeats = {} as Record<OfferPlan, number>;
    for (const plan of planKeys) {
        const raw = params.get(`tier.${offerAudience}.${plan}`) || "";
        const selected = /^\d+$/.test(raw) ? Number(raw) : NaN;
        allowances[plan] = allowanceOptions(offerAudience, plan).includes(selected) ? selected : defaultAllowance[plan];
        const rawSeats = params.get(`seats.team.${plan}`) || "";
        const seats = /^\d{1,2}$/.test(rawSeats) ? Number(rawSeats) : NaN;
        teamSeats[plan] = Number.isInteger(seats) && seats >= 2 && seats <= 50 ? seats : 2;
    }
    return { audience, cycle, creditPacksOpen, allowances, teamSeats, adapterRequested: audience === "byok" && params.get("adapter") === "1" };
}

export function patchPricingSearch(search: string, changes: Readonly<Record<string, string | null>>): string {
    const params = new URLSearchParams(search);
    for (const [key, value] of Object.entries(changes)) {
        if (value === null) params.delete(key);
        else params.set(key, value);
    }
    return params.toString();
}

/** Login return target that reopens the same pricing tab, cycle and tier after sign-in. */
export function pricingLoginNext(pathname: string, search: string, choice: { audience: PricingAudience; cycle: OfferCycle; plan: OfferPlan | "byok"; allowance?: number }): string {
    const changes: Record<string, string | null> = choice.plan === "byok"
        ? { plan: "byok", audience: null, purchase: null, adapter: null }
        : {
            plan: null,
            purchase: null,
            adapter: null,
            audience: choice.audience === "team" ? "team" : null,
            cycle: choice.cycle,
            [`tier.${choice.audience === "team" ? "team" : "creator"}.${choice.plan}`]: choice.allowance === undefined ? null : String(choice.allowance),
        };
    const query = patchPricingSearch(search, changes);
    return query ? `${pathname}?${query}` : pathname;
}
