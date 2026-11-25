import type { useI18n } from "@/i18n/use-i18n";
import type { MessageKey } from "@/i18n/messages";
import type { LedgerEvent } from "@/services/api/wallet-history";

type Translate = ReturnType<typeof useI18n>["t"];
export const eventKeys: Record<string, MessageKey> = {
    reserve: "ledger.reserve",
    consume: "ledger.consume",
    reservation_release: "ledger.release",
    consumption_refund: "ledger.refund",
    payment_clawback: "ledger.clawback",
    adjustment: "ledger.adjustment",
    transfer: "ledger.transfer",
    income: "ledger.income",
    unknown: "ledger.unknown",
};
export function eventLabel(event: LedgerEvent, t: Translate) {
    if (event.identification === "recovery_supplement") return t("ledger.recovery");
    if (event.eventKind === "adjustment") return t(event.amountMicrocredits < 0 ? "ledger.adjustmentDown" : "ledger.adjustmentUp");
    if (event.eventKind === "transfer") return t(event.amountMicrocredits < 0 ? "ledger.toTeam" : "ledger.fromTeam");
    return t(eventKeys[event.eventKind] || "ledger.unknown");
}
/** Ledger type describes the business action; identification is only a diagnostic reference. */
export function ledgerTitle(event: LedgerEvent, t: Translate) {
    const incomeKeys: Record<string, MessageKey> = {
        payment: "ledger.topup",
        payment_topup: "ledger.topup",
        recharge: "ledger.topup",
        subscription: "ledger.subscriptionGrant",
        subscription_monthly: "ledger.subscriptionGrant",
        redeem: "ledger.redeemGrant",
        signup_bonus: "ledger.signupGrant",
        checkin_bonus: "ledger.checkinGrant",
        admin_grant: "ledger.adminGrant",
        referral_bonus: "ledger.referralGrant",
        referral_grant: "ledger.referralGrant",
        referral_recover: "ledger.clawback",
        referral_restore: "ledger.refund",
    };
    if (incomeKeys[event.type]) return t(incomeKeys[event.type]);
    if (event.model && !/^(ord_|sub_|task_|usr_|channel:)/i.test(event.model)) {
        return t(event.scene?.includes("video") ? "ledger.videoGeneration" : event.scene?.includes("image") ? "ledger.imageGeneration" : "ledger.modelUsage", { model: event.model });
    }
    return eventLabel(event, t);
}
