import { apiClient, compactApiParams, request } from "@/services/api/request";

export type LocalMediaVariant = { variant: "original" | "playback"; bytes: number; sha256: string };
export type LocalMediaItem = {
    resourceId: string;
    objectVersion: number;
    sequence: number;
    taskId: string;
    outputIndex: number;
    projectId: string;
    teamId: string;
    kind: string;
    mimeType: string;
    variants: LocalMediaVariant[];
    serverCopyState: string;
    eligibleAt: string | null;
    retainUntil: string;
    extendedAt: string | null;
};
export type LocalMediaPage = { items: LocalMediaItem[]; nextCursor: string; highWatermark: number };

export function pendingLocalMedia(deviceId: string, cursor = "", signal?: AbortSignal) {
    return request<LocalMediaPage>(apiClient.get("/resources/pending-local", { params: compactApiParams({ deviceId, cursor, limit: 20 }), signal }));
}

export function localMediaManifest(resourceId: string, signal?: AbortSignal) {
    return request<LocalMediaItem>(apiClient.get(`/resources/${encodeURIComponent(resourceId)}/local-manifest`, { signal }));
}

export function acknowledgeLocalMediaNotice(item: ExpiringLocalMedia) {
    return request(apiClient.post(`/resources/${encodeURIComponent(item.resourceId)}/local-notice-ack`, { retainUntil: item.retainUntil }));
}

export function sendLocalMediaReceipt(item: LocalMediaItem, deviceId: string, signal?: AbortSignal) {
    return request<{ acceptedAt: string; cleanupEligible: boolean }>(
        apiClient.post(
            `/resources/${encodeURIComponent(item.resourceId)}/local-receipt`,
            {
                deviceId,
                objectVersion: item.objectVersion,
                variants: item.variants,
                idempotencyKey: `${deviceId}:${item.resourceId}:${item.objectVersion}`,
            },
            { signal },
        ),
    );
}

export function extendLocalMedia(resourceId: string) {
    return request(apiClient.post(`/resources/${encodeURIComponent(resourceId)}/local-retention-extension`));
}

export type ExpiringLocalMedia = Pick<LocalMediaItem, "resourceId" | "projectId" | "retainUntil" | "extendedAt" | "serverCopyState"> & { title: string; projectTitle: string };
export function expiringLocalMedia(signal?: AbortSignal) {
    return request<{ items: ExpiringLocalMedia[] }>(apiClient.get("/resources/expiring-local", { signal }));
}
export function localMediaNotificationPreference() {
    return request<{ enabled: boolean; locale: string }>(apiClient.get("/settings/local-media-notifications"));
}
export function updateLocalMediaNotifications(enabled: boolean, locale: string) {
    return request(apiClient.patch("/settings/local-media-notifications", { enabled, locale }));
}
