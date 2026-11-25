import { apiClient, compactApiParams, request } from "./request";
import type { BillingOrder, PaymentOrder, Subscription } from "./wallet";

export type Association = {
    status: "linked" | "unbound" | "not_recorded" | "deleted" | "forbidden" | "query_failed" | "ambiguous";
    taskId?: string;
    taskOutcome?: "failed" | "cancelled" | "succeeded";
    canvasId?: string;
    canvasTitle?: string;
    projectId?: string;
    projectName?: string;
};
export type LedgerEvent = {
    scene?: string;
    id: string;
    eventKind: string;
    type: string;
    identification: string;
    amountMicrocredits: number;
    availableDeltaMicrocredits: number;
    reservedDeltaMicrocredits: number;
    availableAfterMicrocredits: number;
    reservedAfterMicrocredits: number;
    billingOrderId?: string;
    paymentOrderId?: string;
    model?: string;
    source: string;
    createdAt: string;
    association: Association;
};
export type ConsumptionOrder = {
    id: string;
    model: string;
    scene: string;
    capability?: string;
    source: string;
    status: BillingOrder["status"];
    reservedMicrocredits: number;
    consumedMicrocredits: number;
    releasedMicrocredits: number;
    refundedMicrocredits: number;
    netMicrocredits: number;
    unverifiedMicrocredits: number;
    needsReview: boolean;
    supplementMicrocredits: number;
    createdAt: string;
    association: Association;
};
export type PricingSnapshot = Pick<
    BillingOrder,
    "billingMode" | "unitPriceMicrocredits" | "multiplierBasisPoints" | "quantity" | "inputTokenPriceMicrocredits" | "outputTokenPriceMicrocredits" | "cachedTokenPriceMicrocredits" | "inputTokens" | "outputTokens" | "cachedTokens" | "usageAvailable"
> & { priceVersion: number; priceTierVersion: number; chargeLimitMicrocredits: number };
export type ConsumptionDetail = { order: ConsumptionOrder; events: LedgerEvent[]; pricingSnapshot: PricingSnapshot; association: Association };
export type PaymentHistory = Pick<PaymentOrder, "id" | "productKind" | "productName" | "amountMinor" | "currency" | "creditsMicrocredits" | "status" | "invoiceUrl" | "createdAt" | "paidAt" | "fulfilledAt"> & {
    cashRefundedMinor: number | null;
    cashDisputedMinor: number | null;
    dueClawbackMicrocredits: number;
    actualClawbackMicrocredits: number | null;
    shortfallMicrocredits: number | null;
};
export type HistoryPage<T> = { items: T[]; nextCursor: string | null; snapshotAt: string };
export type HistoryParams = { type?: string; from?: string; to?: string; model?: string; source?: string; status?: string; cursor?: string; limit?: number };
const read = <T>(path: string, params: HistoryParams, signal?: AbortSignal) => request<HistoryPage<T>>(apiClient.get(path, { params: compactApiParams(params), signal }));
export const getWalletLedger = (params: HistoryParams = {}, signal?: AbortSignal) => read<LedgerEvent>("/wallet/ledger", params, signal);
export const getConsumptionOrders = (params: HistoryParams = {}, signal?: AbortSignal) => read<ConsumptionOrder>("/wallet/consumption-orders", params, signal);
export const getPaymentHistory = (params: HistoryParams = {}, signal?: AbortSignal) => read<PaymentHistory>("/wallet/payment-orders/history", params, signal);
export const getConsumptionDetail = (id: string, signal?: AbortSignal) => request<ConsumptionDetail>(apiClient.get(`/wallet/consumption-orders/${encodeURIComponent(id)}`, { signal }));
export type SubscriptionDisplay = {
    premiumSubscriptionEligible?: boolean;
    status: Subscription["status"] | "none" | "expired";
    entitlementState: "unconfirmed" | "active" | "inactive" | "paid_period" | "ended";
    paidThrough: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    allowedActions: Array<"refresh" | "plans" | "portal" | "cancel" | "resume" | "continue">;
    checkedAt: string;
    planName: string;
    checkoutUrl?: string;
    /** 停用渠道上的老订阅：当期权益照常，到期后需通过新的支付方式续订。 */
    renewalMigration?: boolean;
};
export const getSubscriptionDisplay = (purpose = "", signal?: AbortSignal) => request<SubscriptionDisplay>(apiClient.get("/wallet/subscription/display", { params: compactApiParams({ purpose }), signal }));
