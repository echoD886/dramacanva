import { apiClient, apiBaseURL, request } from "./request";

export type ReleaseEntry = { id: string; type: "new" | "improved" | "fixed" | "model"; text: Record<string, string>; important: boolean; path?: string; imageResourceId?: string };
export const releaseImageURL = (release: string, entry: string) => `${apiBaseURL}/changelog/${encodeURIComponent(release)}/entries/${encodeURIComponent(entry)}/image`;
export type Release = { id: string; releaseDate: string; status: "active" | "draft"; weeklyEmail: boolean; entries: ReleaseEntry[] };
export type ReleasePage = { releases: Release[]; total: number; stats: { updates: number; items: number; types: Record<string, number>; days: Record<string, number> } };
export type ReleaseFeedback = { id: string; rating: string; message: string; email: string; createdAt: string };

export async function getReleases(_page = 1, _admin = false, _signal?: AbortSignal): Promise<ReleasePage> {
    return { releases: [], total: 0, stats: { updates: 0, items: 0, types: {}, days: {} } };
}

export const getReleaseReads = () => request<{ readIds: string[]; unreadCount: number }>(apiClient.get("/changelog/read"));
export const getReleaseReminders = () => request<{ seenIds: string[] }>(apiClient.get("/changelog/reminders"));
export const markReleaseReminder = (id: string) => request(apiClient.post("/changelog/reminders", { ids: [id] }));
export const markReleaseRead = (ids: string[]) => request(apiClient.post("/changelog/read", { ids }));
export const sendReleaseFeedback = (id: string, rating: string, message = "", email = "") => request(apiClient.post(`/changelog/${encodeURIComponent(id)}/feedback`, { rating, message, email }));



