import { apiClient, compactApiParams, request } from "./request";

export type ReferralRules = {
    tiers?: { paidFriends: number; rateBps: number }[];
    registrationCredits?: number;
    welcomeCredits?: number;
    inviteeFirstOrderRateBps?: number;
    inviteeFirstOrderCapCredits?: number;
    registrationWindowDays?: number;
    registrationMonthlyLimit?: number;
    registrationDailyLimit?: number;
    registrationRateWindowHours?: number;
    subnetWeeklyLimit?: number;
    subnetRateWindowDays?: number;
    lockExpiryDays?: number;
    rateBps: number;
    perInviteeCapCredits: number;
    monthlyCapCredits: number;
    lifetimeCapCredits: number;
    coolingDays: number;
    minNetCashMinor: number;
    currency: string;
    attributionDays: number;
    rewardExpiryDays: number;
};

export type ReferralStats = {
    effectiveCount?: number;
    paidCount?: number;
    lockedCredits?: number;
    invitedCount: number;
    qualifiedCount: number;
    pendingCredits: number;
    grantedCredits: number;
    revokedCredits: number;
};

export type ReferralSummary = {
    ownRewards?: { welcome: { status: "pending" | "granted" | "revoked"; credits: number }; firstOrder: { status: "pending" | "granted" | "revoked"; credits: number } };
    welcomePending?: boolean;
    frozen?: boolean;
    currentRateBps?: number;
    nextTierFriends?: number;
    nextRateBps?: number;
    enabled: boolean;
    code: string;
    link: string;
    rules: ReferralRules;
    stats: ReferralStats;
    monthUsedCredits: number;
};

export type ReferralEventStatus = "attributed" | "effective" | "risk_rejected" | "pending" | "granted" | "revoked" | "rejected";

export type ReferralEvent = {
    paymentStatus?: ReferralEventStatus;
    paymentCredits?: number;
    registrationStatus?: string;
    registrationCredits?: number;
    welcomeCredits?: number;
    id: string;
    inviteeMasked: string;
    status: ReferralEventStatus;
    credits: number;
    reason: string;
    createdAt: string;
    grantAt?: string | null;
};

export type ReferralEventsResponse = {
    items: ReferralEvent[];
    nextCursor?: string;
};

export type ReferralSettings = ReferralRules & {
    enabled: boolean;
    rateBps: number;
    perInviteeCapCredits: number;
    monthlyCapCredits: number;
    lifetimeCapCredits: number;
    coolingDays: number;
    minNetCashMinor: number;
    currency: string;
    attributionDays: number;
    rewardExpiryDays: number;
};

export type ReferralReviewItem = {
    inviterId?: string;
    id: string;
    attributionId: string;
    rewardId: string;
    paymentOrderId: string;
    cashEvidenceJSON: string;
    rulesJSON: string;
    dueMicrocredits: number;
    recoveredMicrocredits: number;
    debtMicrocredits: number;
    reason: string;
    status: string;
    createdAt: string;
    resolution: string;
    actorId: string;
    resolvedAt?: string | null;
};

export type ReferralInviter = { inviterId: string; effectiveCount: number; lockedCredits: number; riskRejectedCount: number; riskReasons?: string[]; frozen: boolean; freezeReason: string };



export const getReferralAvailability = (signal?: AbortSignal, fresh = false) =>
    fresh ? request<{ enabled: boolean }>(apiClient.get("/referrals/public-rules", { signal })) : import("@/services/low-frequency-cache").then(({ readLowFrequency }) => readLowFrequency<{ enabled: boolean }>("/referrals/public-rules", signal));
export const captureReferralClick = (code: string, signal?: AbortSignal) => request<{ captured: boolean }>(apiClient.post("/referrals/attribution", { code }, { signal }));
export const createReferralCode = () => request<{ code: string }>(apiClient.post("/referrals/code"));

export type ResolveReviewPayload = {
    action: "approve" | "reject";
    reason: string;
};

/**
 * 用户端：获取个人邀请统计、规则及链接
 */
export const getMyReferralSummary = (signal?: AbortSignal) => request<ReferralSummary>(apiClient.get("/referrals/me", { signal }));

/**
 * 用户端：分页获取邀请事件明细
 */
export const getMyReferralEvents = (params?: { cursor?: string; limit?: number }, signal?: AbortSignal) => request<ReferralEventsResponse>(apiClient.get("/referrals/me/events", { params: compactApiParams(params || {}), signal }));

/**
 * 管理端：获取全局邀请返积分配置
 */


/**
 * 管理端：更新全局邀请返积分配置
 */


/**
 * 管理端：获取待人工处置审核列表
 */


/**
 * 管理端：审核处置（通过/拒绝）
 */

