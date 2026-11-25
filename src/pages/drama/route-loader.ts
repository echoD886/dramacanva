import { resolveAppLocale } from "@/i18n/app-locale";
import { loadDramaMessages } from "@/i18n/drama-messages";

export async function loadDramaCreatePage() {
    const [page] = await Promise.all([import("./create"), loadDramaMessages(resolveAppLocale())]);
    return page;
}
export async function loadDramaListPage() {
    const [page] = await Promise.all([import("./index"), loadDramaMessages(resolveAppLocale())]);
    return page;
}
export async function loadDramaStudioPage() {
    const [page] = await Promise.all([import("./detail"), loadDramaMessages(resolveAppLocale())]);
    return page;
}
