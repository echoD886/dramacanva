import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { listRemoteAssetsPage, listRemoteCanvasProjectsPage } from "@/services/api/user-data";

// Shared by session startup and the mounted hub so an early response does not
// start a second read while the route/local stores finish hydrating.
export function assetHubFoldersQueryOptions(userId?: string, sort = "updated", query = "") {
    return infiniteQueryOptions({
        queryKey: ["canvas-library", "assets-hub", userId, sort, query],
        queryFn: ({ pageParam, signal }) => listRemoteCanvasProjectsPage({ page: pageParam, pageSize: 40, sort: sort === "assetCount" ? "assets" : sort, query, assetsOnly: true, signal }),
        initialPageParam: 1,
        getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
        enabled: Boolean(userId),
        staleTime: 5_000,
        refetchOnWindowFocus: "always",
        refetchOnReconnect: "always",
    });
}

export function assetHubTotalsQueryOptions(userId?: string) {
    return queryOptions({
        queryKey: ["asset-library", "hub-totals", userId],
        queryFn: async ({ signal }) => {
            const [active, unfiled, trash] = await Promise.all([
                listRemoteAssetsPage({ page: 1, pageSize: 1, status: "active", signal }),
                listRemoteAssetsPage({ page: 1, pageSize: 1, status: "active", unfiled: true, signal }),
                listRemoteAssetsPage({ page: 1, pageSize: 1, status: "archived", signal }),
            ]);
            return { total: active.total, unfiled: unfiled.total, trash: trash.total };
        },
        enabled: Boolean(userId),
        staleTime: 5_000,
        refetchOnWindowFocus: "always",
        refetchOnReconnect: "always",
    });
}
