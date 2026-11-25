import { apiClient, request } from "./request";

export function getShowcaseFavorites() {
    return request<{ favorites: { templateId: string; createdAt: string }[] }>(apiClient.get("/showcase/favorites"));
}

export function setShowcaseFavorite(id: string, favorite: boolean) {
    const path = `/showcase/favorites/${encodeURIComponent(id)}`;
    return request<{ favorite: boolean }>(favorite ? apiClient.put(path) : apiClient.delete(path));
}
