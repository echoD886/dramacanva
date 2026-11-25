import { resolveAppLocale } from "../../i18n/app-locale";
import { translateMessage, type MessageKey } from "../../i18n/messages";
import archiveIndex from "./fixtures/recovered-case-index.local.json";
import type { ShowcaseCase } from "./data";

export const ARCHIVED_CASE_INDEX = new Map((archiveIndex as { templateUuid: string; title: string; nodes: number; edges: number }[]).map((item) => [item.templateUuid, item]));

export function hasArchivedShowcaseGraph(templateUuid: string | undefined) {
    return Boolean(templateUuid && (ARCHIVED_CASE_INDEX.get(templateUuid)?.nodes ?? 0) > 0);
}

type ArchivedTranslator = (key: MessageKey, values?: Record<string, string | number>) => string;

const currentTranslator: ArchivedTranslator = (key, values) => translateMessage(resolveAppLocale(), key, values);

const pendingCases = new Map<string, Promise<ShowcaseCase>>();

async function fetchArchivedCase(templateUuid: string, cache: RequestCache, t: ArchivedTranslator): Promise<ShowcaseCase | undefined> {
    const response = await fetch(`/liblib-clone/cases/${templateUuid}.json`, { cache });
    if (!response.ok) throw new Error(t("miscPages.starterErrorLoadFailed", { status: response.status }));
    const value = await response.json() as ShowcaseCase;
    const expected = ARCHIVED_CASE_INDEX.get(templateUuid);
    const complete = value.templateUuid === templateUuid && value.detail?.templateUuid === templateUuid
        && Array.isArray(value.graph?.nodes) && Array.isArray(value.graph?.edges)
        && value.graph.nodes.length === expected?.nodes
        && value.graph.edges.length === expected?.edges;
    return complete ? value : undefined;
}

export function loadArchivedShowcaseCase(templateUuid: string, t: ArchivedTranslator = currentTranslator): Promise<ShowcaseCase> {
    if (!hasArchivedShowcaseGraph(templateUuid)) return Promise.reject(new Error(t("miscPages.starterErrorNoCanvas")));
    const pending = pendingCases.get(templateUuid);
    if (pending) return pending;
    // Normal HTTP caching skips a revalidation round trip; a copy that no longer
    // matches this build's index (archive republished) is refetched once fresh.
    const request = fetchArchivedCase(templateUuid, "default", t)
        .then((value) => value ?? fetchArchivedCase(templateUuid, "reload", t))
        .then((value) => {
            if (!value) throw new Error(t("miscPages.starterErrorIncomplete"));
            return value;
        });
    pendingCases.set(templateUuid, request);
    // Only deduplicate requests in flight; React Query owns the bounded cache.
    const clear = () => { if (pendingCases.get(templateUuid) === request) pendingCases.delete(templateUuid); };
    void request.then(clear, clear);
    return request;
}
