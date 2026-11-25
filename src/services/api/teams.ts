import { apiClient, request } from "@/services/api/request";
import type { PaymentProviderId, Subscription } from "./wallet";

export type TeamBillingSelection = { teamId: string; sku: string; seats: number };
export type TeamBillingQuote = { version: string; amountMinor: number; creditsMicrocredits: number; currency: string };
export function getTeamSubscriptionQuote(selection: TeamBillingSelection) {
    return request<TeamBillingQuote>(apiClient.post("/teams/subscription/quote", selection));
}
export function createTeamSubscriptionCheckout(selection: TeamBillingSelection, quoteVersion: string, provider?: PaymentProviderId) {
    return request<{ subscription: Subscription; url: string }>(apiClient.post("/teams/subscription/checkout", { ...selection, quoteVersion, ...(provider === undefined ? {} : { provider }) }));
}
export function getTeamSubscription(teamId: string) {
    return request<{ subscription: Subscription | null }>(apiClient.get(`/teams/${encodeURIComponent(teamId)}/subscription`));
}
export function manageTeamSubscription(teamId: string, input: { seats?: number; cancelAtPeriodEnd?: boolean }) {
    return request<{ subscription: Subscription }>(apiClient.post(`/teams/${encodeURIComponent(teamId)}/subscription`, input));
}

export type TeamRole = "owner" | "admin" | "member";
export type TeamMemberStatus = "active" | "suspended";
export type TeamInvitationStatus = "pending" | "accepted" | "declined" | "revoked" | "expired";

export type Team = {
    id: string;
    name: string;
	ownerUserId: string;
	status: "active" | "dissolved";
    sharedCreditsEnabled: boolean;
	sharedAssetsEnabled: boolean;
	monthlyBudgetMicrocredits: number;
    seatLimit: number;
    createdAt: string;
    updatedAt: string;
};

export type TeamCreditAccount = {
    teamId: string;
    availableMicrocredits: number;
    reservedMicrocredits: number;
    version: number;
    createdAt: string;
    updatedAt: string;
};

export type TeamStorageSummary = {
    usedBytes: number;
    totalBytes: number;
};

export type TeamSummary = {
    team: Team;
    role: TeamRole;
    memberCount: number;
    creditAccount: TeamCreditAccount;
	storage: TeamStorageSummary;
	usage: TeamUsageSummary;
};

export type TeamUsageSummary = {
	periodStart: string;
	budgetMicrocredits: number;
	reservedMicrocredits: number;
	consumedMicrocredits: number;
};

export type TeamMember = {
    userId: string;
    username: string;
    displayName: string;
    email?: string;
    avatarUrl?: string;
	role: TeamRole;
	status: TeamMemberStatus;
	monthlyLimitMicrocredits: number;
	usage: TeamUsageSummary;
	joinedAt: string;
};

export type TeamInvitation = {
	id: string;
	email: string;
	role: Exclude<TeamRole, "owner">;
	status: TeamInvitationStatus;
	invitedBy: string;
	expiresAt: string;
	createdAt: string;
};

export type TeamDetail = {
    summary: TeamSummary;
	members: TeamMember[];
	invitations: TeamInvitation[];
};

export type TeamCreditLedgerEntry = {
    id: string;
    teamId: string;
    actorUserId: string;
    type: string;
    amountMicrocredits: number;
    availableDeltaMicrocredits: number;
    reservedDeltaMicrocredits: number;
    availableAfterMicrocredits: number;
    reservedAfterMicrocredits: number;
    billingOrderId?: string;
    model?: string;
    scene?: string;
    note?: string;
    createdAt: string;
};

export type TeamWalletSummary = {
    account: TeamCreditAccount;
    entries: TeamCreditLedgerEntry[];
    total: number;
    page: number;
    limit: number;
};

export async function listTeams() {
    const data = await request<{ teams: TeamSummary[] }>(apiClient.get("/teams"));
    return data.teams;
}

export async function getTeam(id: string) {
    const data = await request<{ team: TeamDetail }>(apiClient.get(`/teams/${encodeURIComponent(id)}`));
    return data.team;
}

export async function createTeam(name: string) {
    const data = await request<{ team: TeamDetail }>(apiClient.post("/teams", { name }));
    return data.team;
}

export async function updateTeam(id: string, input: { name?: string; sharedCreditsEnabled?: boolean; sharedAssetsEnabled?: boolean; monthlyBudgetMicrocredits?: number }) {
    const data = await request<{ team: TeamDetail }>(apiClient.patch(`/teams/${encodeURIComponent(id)}`, input));
    return data.team;
}

export async function sendTeamInvitation(id: string, email: string, role: Exclude<TeamRole, "owner"> = "member") {
	const data = await request<{ team: TeamDetail }>(apiClient.post(`/teams/${encodeURIComponent(id)}/invitations`, { email, role }));
	return data.team;
}

export async function updateTeamMember(id: string, userId: string, input: { role?: Exclude<TeamRole, "owner">; status?: TeamMemberStatus; monthlyLimitMicrocredits?: number }) {
	const data = await request<{ team: TeamDetail }>(apiClient.patch(`/teams/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`, input));
	return data.team;
}

export async function resendTeamInvitation(id: string, invitationId: string) {
	const data = await request<{ team: TeamDetail }>(apiClient.post(`/teams/${encodeURIComponent(id)}/invitations/${encodeURIComponent(invitationId)}/resend`));
	return data.team;
}

export async function revokeTeamInvitation(id: string, invitationId: string) {
	const data = await request<{ team: TeamDetail }>(apiClient.delete(`/teams/${encodeURIComponent(id)}/invitations/${encodeURIComponent(invitationId)}`));
	return data.team;
}

export async function removeTeamMember(id: string, userId: string) {
    const data = await request<{ team: TeamDetail }>(apiClient.delete(`/teams/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`));
    return data.team;
}

export function transferCreditsToTeam(id: string, amountMicrocredits: number) {
    return request<TeamWalletSummary>(apiClient.post(`/teams/${encodeURIComponent(id)}/wallet/transfer`, { amountMicrocredits }));
}

export function leaveTeam(id: string) {
	return request<{ left: boolean }>(apiClient.post(`/teams/${encodeURIComponent(id)}/leave`));
}

export async function transferTeamOwnership(id: string, userId: string) {
	const data = await request<{ team: TeamDetail }>(apiClient.post(`/teams/${encodeURIComponent(id)}/ownership-transfer`, { userId }));
	return data.team;
}

export function dissolveTeam(id: string, confirmationName: string) {
	return request<{ dissolved: boolean }>(apiClient.post(`/teams/${encodeURIComponent(id)}/dissolve`, { confirmationName }));
}

export type TeamAuditEvent = {
	id: string;
	teamId: string;
	actorUserId: string;
	action: string;
	targetUserId?: string;
	summary: string;
	metadataJson: string;
	createdAt: string;
};

export function getTeamAudit(id: string, page = 1, limit = 30) {
	return request<{ events: TeamAuditEvent[]; total: number; page: number; limit: number }>(apiClient.get(`/teams/${encodeURIComponent(id)}/audit`, { params: { page, limit } }));
}

export type TeamInvitationPreview = {
	teamName: string;
	emailMasked: string;
	role: Exclude<TeamRole, "owner">;
	status: TeamInvitationStatus;
	expiresAt: string;
};

export async function getTeamInvitation(token: string) {
	const data = await request<{ invitation: TeamInvitationPreview }>(apiClient.get(`/team-invitations/${encodeURIComponent(token)}`));
	return data.invitation;
}

export async function acceptTeamInvitation(token: string) {
	const data = await request<{ team: TeamDetail }>(apiClient.post(`/team-invitations/${encodeURIComponent(token)}/accept`));
	return data.team;
}

export function declineTeamInvitation(token: string) {
	return request<{ declined: boolean }>(apiClient.post(`/team-invitations/${encodeURIComponent(token)}/decline`));
}
