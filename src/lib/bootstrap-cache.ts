import { appQueryClient } from "./query-client";
import type { BootstrapPayload } from "@/services/api/bootstrap";
import { observeLowFrequencyRefresh, seedLowFrequencyCache } from "@/services/low-frequency-cache";
import { getActiveUserScope } from "./user-scope";
import type { CanvasProject } from "@/stores/canvas/use-canvas-store";

export type BootCanvasSeed = { project: CanvasProject; revision: number; acquiredAt: number };

// The project library keys its first page by sign-in state; the bootstrap seed must use the same key.
export const projectsPageQueryKey = (signedIn: boolean) => ["projects", "paged", signedIn] as const;

export function invalidateBootCanvasSeed(userId: string | undefined, id: string) {
    appQueryClient.removeQueries({ queryKey: ["boot-canvas", userId, id], exact: true });
}

observeLowFrequencyRefresh((path, scope, value) => {
    if (scope !== getActiveUserScope()) return;
    if (path === "/wallet/payment-options") appQueryClient.setQueryData(["payment-options", scope === "guest" ? undefined : scope], value);
    if (path === "/referrals/public-rules") appQueryClient.setQueryData(["referral-availability", scope === "guest" ? undefined : scope], value);
});

// Called only after the authoritative identity selected and hydrated its scope.
// Private identity, wallet, permissions and entity baselines never go to disk.
export function seedBootstrapQueries(payload: BootstrapPayload, pathname = "") {
    const userId = payload.user?.id;
    if (!userId) return;
    const seed = (key: readonly unknown[], data: unknown) => {
        if (data !== undefined) appQueryClient.setQueryData(key, data);
    };
    seed(["teams", userId], payload.teams?.teams);
    seed(["projects"], payload.projects);
    seed(projectsPageQueryKey(true), payload.projectsPage && { pages: [payload.projectsPage], pageParams: [1] });
    seed(["canvas-library", userId, "all", "updated", ""], payload.canvasPage && { pages: [payload.canvasPage], pageParams: [1] });
    seed(["payment-options", userId], payload.paymentOptions);
    seed(["launch-offer", userId], payload.launchOffer);
    seed(["referral-availability", userId], payload.referralAvailability);
    seed(["plugin-runtime", userId], payload.plugins);
    seed(["boot-features", userId], payload.features);
    seed(["local-media-preference", userId], payload.settings?.localMediaNotifications);
    // Wallet consumers deliberately still revalidate on mount and SSE ready.
    if (payload.wallet?.account.userId === userId) seed(["wallet-balance", userId], payload.wallet);
    const id = pathname.match(/^\/canvas\/([^/]+)\/?$/)?.[1];
    const scene = id && payload.snapshot?.projects.find((project) => project.id === id);
    if (scene && Number.isSafeInteger(scene.revision) && payload.snapshotAcquiredAt !== undefined) {
        seed(["boot-canvas", userId, id], { project: scene, revision: scene.revision!, acquiredAt: payload.snapshotAcquiredAt } satisfies BootCanvasSeed);
    }
    for (const [path, value] of [
        ["/model-catalog", payload.catalog],
        ["/wallet/payment-options", payload.paymentOptions],
        ["/referrals/public-rules", payload.referralAvailability],
    ] as const) {
        if (value !== undefined) void seedLowFrequencyCache(path, userId, value).catch(() => undefined);
    }
}
