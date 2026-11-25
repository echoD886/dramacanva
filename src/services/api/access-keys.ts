import { apiClient, request } from "@/services/api/request";

export type OAuthConnectionInfo = {
    clientName: string;
    identitySource: "cimd" | "dcr" | "agent_auth";
    clientHost: string;
    resource: string;
    offlineAccess: boolean;
    refreshExpiresAt?: string;
};

export type UserAccessKey = {
    credentialKind?: "api_key" | "oauth_connection";
    oauthConnection?: OAuthConnectionInfo;
    mcpToolProfile: "default" | "expert";
    id: string;
    name: string;
    keyPrefix: string;
    scopes: string[];
    lastUsedAt?: string;
    expiresAt?: string;
    revokedAt?: string;
    createdAt: string;
    spendLimitMicrocredits: number | null;
    spentMicrocredits: number;
};

export type CreatedUserAccessKey = UserAccessKey & { secret: string };

export type AccessKeyScopeOption = {
    value: string;
    label: string;
    default: boolean;
};

export function listUserAccessKeys() {
    return request<{ keys: UserAccessKey[] }>(apiClient.get("/access-keys")).then((result) => result.keys);
}

export function getUserAccessKeyScopes() {
    return request<{ scopes: AccessKeyScopeOption[] }>(apiClient.get("/access-keys/scopes")).then((result) => result.scopes);
}

export function createUserAccessKey(input: { name: string; scopes: string[]; expiresAt?: string; spendLimitMicrocredits?: number | null; mcpToolProfile?: "default" | "expert" }) {
    return request<{ key: CreatedUserAccessKey }>(apiClient.post("/access-keys", input)).then((result) => result.key);
}

export function updateUserAccessKeyProfile(id: string, mcpToolProfile: "default" | "expert") {
    return request<{ key: UserAccessKey }>(apiClient.patch(`/access-keys/${encodeURIComponent(id)}`, { mcpToolProfile })).then((result) => result.key);
}

export function updateUserAccessKeySpendLimit(id: string, spendLimitMicrocredits: number | null) {
    return request<{ key: UserAccessKey }>(apiClient.patch(`/access-keys/${encodeURIComponent(id)}`, { spendLimitMicrocredits })).then((result) => result.key);
}

export function updateUserAccessKey(
    id: string,
    input: {
        name?: string;
        spendLimitMicrocredits?: number | null;
        scopes?: string[];
        mcpToolProfile?: "default" | "expert";
    },
) {
    return request<{ key: UserAccessKey }>(apiClient.patch(`/access-keys/${encodeURIComponent(id)}`, input)).then((result) => result.key);
}

export function revokeUserAccessKey(id: string) {
    return request<{ ok: boolean }>(apiClient.delete(`/access-keys/${encodeURIComponent(id)}`));
}

export function rotateUserAccessKey(id: string) {
    return request<{ key: CreatedUserAccessKey }>(apiClient.post(`/access-keys/${encodeURIComponent(id)}/rotate`)).then((result) => result.key);
}
