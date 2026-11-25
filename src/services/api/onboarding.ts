import { apiClient, request } from "./request";

export type AccountOnboardingStatus = "unseen" | "started" | "skipped" | "closed" | "completed";
export type AccountOnboardingState = { status: AccountOnboardingStatus; claimed: boolean };

export function updateAccountOnboarding(status: Exclude<AccountOnboardingStatus, "unseen">) {
    return request<AccountOnboardingState>(apiClient.put("/onboarding", { status }));
}

// StrictMode can subscribe twice while the atomic server claim is in flight.
const firstDisplayRequests = new Map<string, Promise<AccountOnboardingState>>();
export function claimFirstOnboarding(userId: string) {
    if (!userId) return Promise.reject(new Error("Onboarding requires an authenticated account"));
    const existing = firstDisplayRequests.get(userId);
    if (existing) return existing;
    const pending = updateAccountOnboarding("started");
    firstDisplayRequests.set(userId, pending);
    const clear = () => firstDisplayRequests.delete(userId);
    void pending.then(clear, clear);
    return pending;
}
