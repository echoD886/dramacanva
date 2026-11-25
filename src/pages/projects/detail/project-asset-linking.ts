import { currentLocaleText as t } from "@/i18n/current-locale-text";
export async function linkSelectedProjectAssets<T>(ids: string[], linkOne: (id: string) => Promise<T>) {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (!uniqueIds.length) throw new Error(t("creationRuntime.selectLinkAssets"));

    const results = await Promise.allSettled(uniqueIds.map(linkOne));
    const linked = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
    const failures = results.flatMap((result) => result.status === "rejected" ? [result.reason] : []);
    if (!linked.length) {
        const firstFailure = failures[0];
        throw firstFailure instanceof Error ? firstFailure : new Error(t("creationRuntime.linkAssetsFailed"));
    }
    return { linked, failedCount: failures.length };
}
