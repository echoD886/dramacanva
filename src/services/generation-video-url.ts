import { getResource, resourceFileUrl, resourceIdFromStorageKey } from "@/services/api/resources";
import { resolveMediaUrl } from "@/services/file-storage";
import { currentLocaleText } from "@/i18n/current-locale-text";

// Stored videos are playable before the browser has downloaded or decoded the entire file.
export async function resolveGenerationVideoUrl(storageKey: string, fallback = "") {
    const resourceId = resourceIdFromStorageKey(storageKey);
    if (!resourceId) return resolveMediaUrl(storageKey, fallback);
    const resource = await getResource(resourceId);
    if (resource.status !== "ready") throw new Error(currentLocaleText("creationRuntime.videoUnavailable"));
    return resourceFileUrl(resourceId);
}
