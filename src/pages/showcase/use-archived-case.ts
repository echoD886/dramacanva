import { useQuery } from "@tanstack/react-query";
import { appQueryClient } from "@/lib/query-client";
import { hasArchivedShowcaseGraph, loadArchivedShowcaseCase } from "./archive-loader";

const archivedShowcaseQuery = (templateUuid: string) => ({
    queryKey: ["archived-showcase", templateUuid],
    queryFn: () => loadArchivedShowcaseCase(templateUuid),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    retry: false,
});

export function useArchivedShowcaseCase(templateUuid: string, requested = true) {
    const enabled = requested && hasArchivedShowcaseGraph(templateUuid);
    const query = useQuery({ ...archivedShowcaseQuery(templateUuid), enabled });
    return { data: query.data, loading: enabled && query.isPending, error: query.error };
}

/** Starts the case download on hover so the canvas import finds it in the shared cache. */
export function prefetchArchivedShowcaseCase(templateUuid: string) {
    if (!hasArchivedShowcaseGraph(templateUuid)) return;
    void appQueryClient.prefetchQuery(archivedShowcaseQuery(templateUuid));
}
