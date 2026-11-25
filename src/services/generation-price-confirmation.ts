import { trackOnboardingEvent } from "@/services/onboarding-analytics";
import type { TaskPriceConfirmation } from "@/lib/confirmed-generation";

// Prices come from a fixed published price table and the generate button already
// shows the cost, so clicking generate is the confirmation. The quote is still
// sent with the task so the charge matches the displayed amount.
export async function confirmGenerationPrice(quote: TaskPriceConfirmation, changed: boolean, count = 1) {
    if (changed) window.dispatchEvent(new Event("generation-price-changed"));
    trackOnboardingEvent("cost_quote_viewed", { task_count: count, amount_microcredits: quote.amountMicrocredits, changed });
    return true;
}
