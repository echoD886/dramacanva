import { apiClient, request } from "./request";
import type { PaymentProviderId, Subscription } from "./wallet";
export type ByokConnection = { baseUrl: string; updatedAt: string };
export type ByokStatus = { subscription: Subscription | null; connection: ByokConnection | null; active: boolean; checkoutReady: boolean; trialEligible?: boolean; trialMonths?: number };
export type ByokAdapterInput = { channelName: string; docUrl: string; models: string; protocol: string; contact: string };
export type ByokAdapterRequest = ByokAdapterInput & { id: string; userId: string; status: "submitted" | "reviewing" | "supported" | "declined"; reply?: string; revision: number; createdAt: string };
export const getByokStatus = (signal?: AbortSignal) => request<ByokStatus>(apiClient.get("/wallet/byok", { signal }));
export const createByokCheckout = (sku: string, promo?: string, provider?: PaymentProviderId) =>
    request<{ subscription: Subscription; url: string; payableMinor?: number }>(apiClient.post("/wallet/byok/checkout", { sku, ...(promo === undefined ? {} : { promo }), ...(provider === undefined ? {} : { provider }) }));
export const createByokPortal = () => request<{ url: string }>(apiClient.post("/wallet/byok/portal"));
export const setByokCancellation = (cancelAtPeriodEnd: boolean) => request<{ subscription: Subscription }>(apiClient.patch("/wallet/byok/cancellation", { cancelAtPeriodEnd }));
export const setByokConnection = (baseUrl: string) => request<ByokConnection>(apiClient.put("/wallet/byok/channel", { baseUrl }));
export const getByokRequests = () => request<{ requests: ByokAdapterRequest[] }>(apiClient.get("/wallet/byok/requests"));
export const submitByokRequest = (input: ByokAdapterInput) => request<{ request: ByokAdapterRequest }>(apiClient.post("/wallet/byok/requests", input));
