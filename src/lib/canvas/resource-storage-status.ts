import { currentLocaleText } from "@/i18n/current-locale-text";
import type { MessageKey } from "@/i18n/messages";

export type ResourceStorageLocation = "oss" | "local" | "none";
type Translate = (key: MessageKey) => string;

export function resourceStorageLocation(storageKey?: string): ResourceStorageLocation {
    if (!storageKey) return "none";
    return storageKey.startsWith("resource:") ? "oss" : "local";
}

export function resourceStorageLabel(storageKey?: string, t: Translate = currentLocaleText) {
    const location = resourceStorageLocation(storageKey);
    if (location === "oss") return t("resourceStorage.uploaded");
    if (location === "local") return t("resourceStorage.local");
    return t("resourceStorage.unsynced");
}

export function resourceStorageTitle(storageKey?: string, t: Translate = currentLocaleText) {
    const location = resourceStorageLocation(storageKey);
    if (location === "oss") return t("resourceStorage.uploadedTitle");
    if (location === "local") return t("resourceStorage.localTitle");
    return t("resourceStorage.unsyncedTitle");
}
