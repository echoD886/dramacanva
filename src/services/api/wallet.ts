import { apiClient, request } from "@/services/api/request";
import { readLowFrequency } from "@/services/low-frequency-cache";

const api = apiClient;

export type CreditAccount = {
    userId: string;
    availableMicrocredits: number;
    reservedMicrocredits: number;
    version: number;
    createdAt: string;
    updatedAt: string;
};

export type CreditLedgerEntry = {
    id: string;
    userId: string;
    type: "redeem" | "admin_grant" | "consume" | "reserve" | "refund" | "admin_adjustment" | "signup_bonus" | "checkin_bonus" | "payment" | "subscription" | "team_transfer";
    amountMicrocredits: number;
    availableAfterMicrocredits: number;
    reservedAfterMicrocredits: number;
    billingOrderId?: string;
    model?: string;
    channelId?: string;
    scene?: string;
    note?: string;
    createdAt: string;
};

export type CreditSource = "membership" | "free" | "recharge" | "model_card" | "referral";

export type CreditBalanceBucket = {
    sourceType: CreditSource | "team";
    availableMicrocredits: number;
    reservedMicrocredits: number;
};

export type CreditSpendingPolicy = {
    revision: number;
    sources: CreditSource[];
};

export type WalletSummary = {
    account: CreditAccount;
    entries: CreditLedgerEntry[];
    breakdown: CreditBalanceBucket[];
    spendingPolicy: CreditSpendingPolicy;
    usableMicrocredits: number;
    total: number;
    page: number;
    limit: number;
    policy: {
        signupBonusMicrocredits: number;
        checkinBonusMicrocredits: number;
        checkedInToday: boolean;
    };
};

export type CreditPolicy = {
    signupBonusMicrocredits: number;
    checkinBonusMicrocredits: number;
    defaultMultiplierBasisPoints: number;
    modelMultiplierBasisPoints: Record<string, number>;
};

export type ChannelModel = {
    id: string;
    channelId: string;
    modelKey: string;
    providerModelKey: string;
    displayName: string;
    icon: string;
    capability: "text" | "image" | "video" | "audio" | "";
    protocol?: import("@/lib/model-protocols").ModelProtocol;
    billingMode: "fixed_request" | "per_second" | "token";
    unitPriceMicrocredits: number;
    inputTokenPriceMicrocredits: number;
    outputTokenPriceMicrocredits: number;
    cachedTokenPriceMicrocredits: number;
    priceConfigured: boolean;
    enabled: boolean;
    priceVersion: number;
    capabilityVersion?: number;
    capabilityConfig?: import("@/lib/model-capabilities").ModelCapabilityConfig;
    priceTiers: ChannelModelPriceTier[];
    createdAt: string;
    updatedAt: string;
};

export type ChannelModelPriceTier = {
    id: string;
    channelModelId: string;
    selector: Record<string, string>;
    selectorKey: string;
    resolution: string;
    videoSeconds: number;
    providerModelKey: string;
    billingMode: "fixed_request" | "per_second" | "token";
    unitPriceMicrocredits: number;
    inputTokenPriceMicrocredits: number;
    outputTokenPriceMicrocredits: number;
    cachedTokenPriceMicrocredits: number;
    priceConfigured: boolean;
    enabled: boolean;
    priceVersion: number;
    createdAt: string;
    updatedAt: string;
};

// 系统渠道模型的写入合同。标量价格只用于兼容旧管理请求；新的后台界面只提交 priceTiers。
export type ChannelModelMutation = {
    modelKey: string;
    providerModelKey?: string;
    displayName?: string;
    icon?: string;
    capability: ChannelModel["capability"];
    protocol?: ChannelModel["protocol"];
    enabled?: boolean;
    capabilityConfig?: ChannelModel["capabilityConfig"];
    priceTiers?: Array<Omit<ChannelModelPriceTier, "id" | "channelModelId" | "selectorKey" | "priceVersion" | "createdAt" | "updatedAt">>;
    billingMode?: ChannelModel["billingMode"];
    unitPriceMicrocredits?: number;
    inputTokenPriceMicrocredits?: number;
    outputTokenPriceMicrocredits?: number;
    cachedTokenPriceMicrocredits?: number;
    priceConfigured?: boolean;
};

export type LinuxDOSetting = {
    enabled: boolean;
    clientId: string;
    clientSecret?: string;
    hasClientSecret: boolean;
    authorizationUrl: string;
    tokenUrl: string;
    userInfoUrl: string;
    redirectUrl: string;
    scopes: string[];
    clientAuthMethod: "client_secret_post" | "client_secret_basic";
    subjectField: string;
    usernameField: string;
    displayNameField: string;
    emailField: string;
    avatarField: string;
    updatedAt?: string;
};

export type SocialOAuthProviderSetting = {
    enabled: boolean;
    clientId: string;
    clientSecret?: string;
    hasClientSecret: boolean;
    redirectUrl: string;
};

export type SocialOAuthSetting = {
    providers: Record<"google" | "github", SocialOAuthProviderSetting>;
    updatedBy?: string;
    createdAt?: string;
    updatedAt?: string;
};

export type RegistrationSetting = {
    enabled: boolean;
    updatedBy?: string;
    createdAt?: string;
    updatedAt?: string;
};

export type PaymentProduct = {
    sku: string;
    name: string;
    kind: "credits" | "subscription" | "byok";
    stripePriceId?: string;
    interval?: "month" | "year";
    intervalCount?: number;
    catalogKey?: string;
    amountMinor: number;
    originalAmountMinor?: number;
    currency: string;
    creditsMicrocredits: number;
    enabled: boolean;
};

export type CustomCreditDiscountTier = {
    minQuantity: number;
    discountBasisPoints: number;
};

export type CustomCreditPack = {
    enabled: boolean;
    sku: string;
    name: string;
    currency: string;
    unitAmountMinor: number;
    unitCreditsMicrocredits: number;
    minQuantity: number;
    maxQuantity: number;
    discountTiers?: CustomCreditDiscountTier[];
};

export type PaymentOrder = {
    id: string;
    userId: string;
    provider: string;
    productKind: "credits" | "subscription" | "byok" | "upgrade";
    productSku: string;
    productName: string;
    amountMinor: number;
    discountMinor?: number;
    currency: string;
    creditsMicrocredits: number;
    status: "pending" | "paid" | "fulfilled" | "failed" | "canceled" | "expired" | "refunded" | "disputed";
    checkoutSessionId?: string;
    providerPaymentId?: string;
    providerInvoiceId?: string;
    providerSubscriptionId?: string;
    invoiceUrl?: string;
    failureReason?: string;
    paidAt?: string;
    fulfilledAt?: string;
    createdAt: string;
    updatedAt: string;
};

export type Subscription = {
    entitlementKey?: "byok" | "team" | "";
    teamId?: string;
    seatQuantity?: number;
    pendingSeatQuantity?: number;
    intervalCount?: number;
    paidThrough?: string;
    id: string;
    userId: string;
    provider: "stripe" | PaymentProviderId;
    providerCustomerId?: string;
    providerSubscriptionId?: string;
    providerPriceId?: string;
    planSku: string;
    planName: string;
    interval: "month" | "year";
    amountMinor: number;
    currency: string;
    creditsMicrocredits: number;
    status: "checkout_pending" | "checkout_expired" | "checkout_failed" | "pending_activation" | "incomplete" | "incomplete_expired" | "trialing" | "active" | "past_due" | "unpaid" | "paused" | "canceled";
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
    cancelAtPeriodEnd: boolean;
    canceledAt?: string;
    endedAt?: string;
    latestInvoiceId?: string;
    /** 换档已付款 / 已确认但 Stripe 尚未完成换价时的目标套餐。 */
    pendingPlanSku?: string;
    periodPaidMinor?: number;
    periodCreditsMicrocredits?: number;
    createdAt: string;
    updatedAt: string;
};

/** 补差价报价：upgrade 需付 amountMinor 并立即补发 creditsMicrocredits；switch 不收费，下次续费生效。 */
export type SubscriptionChangeQuote = {
    currentSku: string;
    targetSku: string;
    targetName: string;
    kind: "upgrade" | "switch" | "cross_period";
    amountMinor: number;
    currency: string;
    creditsMicrocredits: number;
    renewalAmountMinor: number;
    renewalCreditsMicrocredits: number;
    periodPaidMinor: number;
    periodCreditsMicrocredits: number;
    renewsAt?: string;
    valueQuote?: { version: string; priceMinor: number; cashMinor: number; offsetMinor: number; inheritedMicrocredits: number; newGrantMicrocredits: number };
};

export type TrialUpgradeCredit = { orderId: string; amountMinor: number; currency: string; creditsMicrocredits: number };

export type AdminPaymentOrder = PaymentOrder & { username: string; displayName: string; email?: string };

export type PaymentSetting = {
    premiumCapabilityThresholdUSDMinor?: number;
    stripe: { enabled: boolean; secretKey?: string; webhookSecret?: string; hasSecretKey: boolean; hasWebhookSecret: boolean };
    successUrl: string;
    cancelUrl: string;
    products: PaymentProduct[];
    customCredits: CustomCreditPack;
    updatedAt?: string;
};

export type EmailSetting = {
    enabled: boolean;
    host: string;
    port: number;
    username: string;
    password?: string;
    encryption: "starttls" | "tls" | "none";
    fromEmail: string;
    fromName: string;
    hasPassword: boolean;
    updatedBy?: string;
    createdAt?: string;
    updatedAt?: string;
};

export type RedeemBatch = {
    id: string;
    amountMicrocredits: number;
    count: number;
    note?: string;
    createdBy: string;
    expiresAt?: string;
    createdAt: string;
    availableCount: number;
    redeemedCount: number;
    disabledCount: number;
    expiredCount: number;
};

export type AdminRedeemCode = {
    id: string;
    code?: string;
    codeSuffix: string;
    status: "unused" | "redeemed" | "disabled" | "expired";
    redeemedBy?: string;
    redeemedUsername?: string;
    redeemedDisplayName?: string;
    redeemedAt?: string;
    redeemedIp?: string;
    expiresAt?: string;
    amountMicrocredits: number;
};

export type AdminRedeemCodePage = {
    batch: RedeemBatch;
    codes: AdminRedeemCode[];
    plaintextAvailable: boolean;
    total: number;
    page: number;
    limit: number;
};

export type BillingOrder = {
    id: string;
    userId: string;
    taskId?: string;
    channelId: string;
    model: string;
    capability: string;
    scene: string;
    billingMode: "fixed_request" | "per_second" | "token";
    unitPriceMicrocredits: number;
    multiplierBasisPoints: number;
    quantity: number;
    amountMicrocredits: number;
    reservedAmountMicrocredits: number;
    actualAmountMicrocredits: number;
    refundedAmountMicrocredits: number;
    inputTokenPriceMicrocredits: number;
    outputTokenPriceMicrocredits: number;
    cachedTokenPriceMicrocredits: number;
    inputTokens: number;
    outputTokens: number;
    cachedTokens: number;
    usageAvailable: boolean;
    status: "reserved" | "running" | "settled" | "refunded" | "uncertain";
    providerRequestId?: string;
    error?: string;
    resolvedBy?: string;
    resolutionNote?: string;
    createdAt: string;
    updatedAt: string;
};

export function getWallet(page = 1, limit = 30, type = "all", signal?: AbortSignal) {
    return request<WalletSummary>(api.get("/wallet", { params: { type, page, limit }, signal }));
}

export function updateCreditSpendingPolicy(input: CreditSpendingPolicy) {
    return request<{ policy: CreditSpendingPolicy }>(api.patch("/wallet/spending-policy", input)).then((result) => result.policy);
}

export function redeemCredits(code: string) {
    return request<{ account: CreditAccount }>(api.post("/wallet/redeem", { code }));
}

export function checkinCredits() {
    return request<{ account: CreditAccount; granted: boolean }>(api.post("/wallet/checkin"));
}

export type PaymentProviderId = "waffo" | "creem";
export type PaymentProviderAvailability = {
    id: PaymentProviderId;
    ready: boolean;
    methods: string[];
    currencies: string[];
    merchantOfRecord: boolean;
    taxAddedAtCheckout: boolean;
    supports: { credits: boolean; customCredits: boolean; subscriptions: boolean; teams: boolean; byok: boolean };
};

export function getPaymentOptions() {
    return readLowFrequency<{
        stripeEnabled: boolean;
        /** 当前收款渠道能否接受新结账；购买按钮只看这一项。 */
        checkoutEnabled: boolean;
        checkoutProvider?: string;
        paymentProviders?: PaymentProviderAvailability[];
        creditCatalogConfigured?: boolean;
        products: PaymentProduct[];
        customCredits?: CustomCreditPack;
        byokProduct?: PaymentProduct;
        byokCheckoutReady?: boolean;
        firstPeriodOffers?: FirstPeriodOffer[];
        trialUpgradeCredit?: TrialUpgradeCredit;
    }>("/wallet/payment-options");
}

/** 月付档首期活动价（美分），续费按原价；eligible 为当前账号是否还能使用。 */
export type FirstPeriodOffer = { sku: string; amountMinor: number; currency: string; eligible: boolean; endsAt: number };
export type LaunchOfferEligibility = { active: boolean; eligible: boolean; discountPercent: number; endsAt: number; firstPeriod?: FirstPeriodOffer };
export function getLaunchOfferEligibility() {
    return request<LaunchOfferEligibility>(api.get("/wallet/launch-offer"));
}

export function createStripeCheckout(sku: string, requestKey: string, options?: { promo?: string; locale?: string; provider?: PaymentProviderId }) {
    return request<{ order: PaymentOrder; url: string; payableMinor: number }>(api.post("/wallet/checkout", { sku, requestKey, ...options }));
}

export function createStripeCustomCreditCheckout(quantity: number, requestKey: string, options?: { promo?: string; locale?: string; provider?: PaymentProviderId }) {
    return request<{ order: PaymentOrder; url: string; payableMinor: number }>(api.post("/wallet/custom-credit-checkout", { quantity, requestKey, ...options }));
}

export type UpgradeCreditQuote = {
    promo?: string;
    promotionDiscountMinor?: number;
    resumeCheckout?: boolean;
    version: string;
    expiresAt: number;
    sku: string;
    currency: string;
    renewalMinor: number;
    campaignKey: string;
    campaignDiscountMinor: number;
    firstPeriodMinor: number;
    offsetMinor: number;
    offsetMicrocredits: number;
    payableMinor: number;
    firstPeriodCreditsMicrocredits: number;
    newCreditsMicrocredits: number;
    availableMinor: number;
    remainingMinor: number;
    applyCredit: boolean;
    items: Array<{ orderId: string; name: string; amountMinor: number; creditsMicrocredits: number; usedMinor: number; usedMicrocredits?: number; availableMinor: number; offsetMinor: number; offsetMicrocredits: number }>;
};

/** 会员原价报价：首期与续费价格、每期积分（体验包抵扣与换档补差价已下线）。 */
export function getSubscriptionQuote(sku: string, signal?: AbortSignal) {
    return request<UpgradeCreditQuote>(api.get("/wallet/subscription/quote", { params: { sku }, signal }));
}

export function createSubscriptionCheckout(sku: string, promo?: string, provider?: PaymentProviderId) {
    return request<{ subscription: Subscription; url: string; payableMinor?: number }>(api.post("/wallet/subscription/checkout", { sku, ...(promo ? { promo } : {}), ...(provider === undefined ? {} : { provider }) }));
}

/** 从收银台没付款回来时的一次性专属优惠；不符合条件时为 null。claimBy 之后后端拒收该码。 */
export type CheckoutExitOffer = { code: string; provider: PaymentProviderId; sku: string; sourceKind: "order" | "subscription"; percentOff: number; claimBy: string; serverNow: string; listMinor: number; currency: string };
export function getCheckoutExitOffer(kind: "order" | "subscription", id: string) {
    return request<{ offer: CheckoutExitOffer | null }>(api.post("/wallet/checkout/exit-offer", { kind, id }));
}

export function getCurrentSubscription() {
    return request<{ subscription: Subscription | null }>(api.get("/wallet/subscription"));
}

export function createSubscriptionPortal() {
    return request<{ url: string }>(api.post("/wallet/subscription/portal"));
}

export function setSubscriptionCancellation(cancelAtPeriodEnd: boolean) {
    return request<{ subscription: Subscription }>(api.patch("/wallet/subscription/cancellation", { cancelAtPeriodEnd }));
}





























// 只预览上游模型目录；管理员选择并确认后才导入。
















export type AdminFinanceListParams = { keyword?: string; status?: string; validity?: string; page?: number; limit?: number };













export type AdminCreditSummary = {
    availableMicrocredits: number;
    reservedMicrocredits: number;
    usableMicrocredits: number;
    negativeAccounts: number;
    negativeMicrocredits: number;
    accountCount: number;
    typeTotals: Array<{ type: string; amountMicrocredits: number; entries: number }>;
    daily: Array<{ day: string; grantedMicrocredits: number; consumedMicrocredits: number; refundedMicrocredits: number }>;
    sources: Array<{ sourceType: string; availableMicrocredits: number; reservedMicrocredits: number }>;
    models: Array<{ model: string; consumedMicrocredits: number; refundedMicrocredits: number }>;
};

export type CreditBalanceLot = {
    id: string;
    sourceType: string;
    sourceReference: string;
    grantedMicrocredits: number;
    availableMicrocredits: number;
    reservedMicrocredits: number;
    expiresAt?: string;
    createdAt: string;
};












