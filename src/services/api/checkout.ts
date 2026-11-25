import { http, compactApiParams } from "./request";
export interface CheckoutEvidenceReceipt {
    id: string;
    eventId: string;
    eventType: string;
    stripeAccountId: string;
    livemode: boolean;
    subscriptionId: string;
    orderId: string;
    disposition: string;
    errorCode: string;
    paymentEvidence: "unknown";
    createdAt: string;
}
export interface CheckoutEvidencePage {
    receipts: CheckoutEvidenceReceipt[];
    total: number;
    page: number;
    limit: number;
}


export interface CheckoutBehavior {
    id: string;
    kind: string;
    errorCode?: string;
    observedAt: string;
    failureCount: number;
}
export interface CheckoutAttempt {
    entitlementAppliedAt: string | null;
    id: string;
    userId: string;
    username: string;
    displayName: string;
    email: string;
    stripeAccountId: string;
    livemode: boolean;
    productKind: string;
    sku: string;
    creationState: string;
    sessionState: string;
    paymentState: string;
    quoteAmountMinor: number;
    currency: string;
    paidAmountMinor: number;
    paidCurrency: string;
    historical: boolean;
    createdAt: string;
    expiresAt?: string;
    sessionBoundAt?: string;
    completedAt?: string;
    succeededAt?: string;
    expiredAt?: string;
    sessionId?: string;
    customerId?: string;
    customerState?: string;
    customerErrorCode?: string;
    errorCode?: string;
    behaviors: CheckoutBehavior[];
}
export type CheckoutQuery = { timezone?: "UTC" | "Asia/Hong_Kong"; userId?: string; productKind?: string; stripeAccountId?: string; livemode?: "true" | "false"; from?: string; to?: string; asOf?: string; page?: number; limit?: number };
export interface CheckoutPage {
    attempts: CheckoutAttempt[];
    total: number;
    page: number;
    limit: number;
    timezone: string;
    asOf: string;
}
export interface CheckoutSummary {
    metrics: Record<string, { attempts: number; users: number; events: number }>;
    amounts: Record<string, Record<string, number>>;
    attemptConversion: number | null;
    userConversion: number | null;
    timezone: string;
    asOf: string;
}


export const recordCheckoutCancel = (id: string, returnToken: string, signal?: AbortSignal) => http.post<{ recorded: boolean }>(`/payments/checkout-attempts/${encodeURIComponent(id)}/cancel-return`, { returnToken }, { signal });
export interface CheckoutReceipt extends Pick<CheckoutAttempt, "id" | "productKind" | "paymentState" | "sessionState"> {
    creditsGranted?: number;
    planName?: string;
    billingCycle?: string;
    currentPeriodEnd?: string;
    balanceAfter?: number;
}
export const getCheckoutReturn = (id: string, signal?: AbortSignal) => http.get<CheckoutReceipt>(`/payments/checkout-attempts/${encodeURIComponent(id)}`, { signal });
