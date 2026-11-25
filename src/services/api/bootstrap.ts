import type { AuthSessionPayload } from "./auth";
import type { ModelCatalogResponse } from "./logical-models";
import type { fetchPluginRuntimeState } from "./plugins";
import type { ProjectListPage, ProjectSummary } from "./projects";
import type { TeamSummary } from "./teams";
import type { getPaymentOptions, LaunchOfferEligibility, WalletSummary } from "./wallet";
import type { listRemoteCanvasProjectsPage, RemoteUserDataSnapshot } from "./user-data";

export type BootstrapPayload = AuthSessionPayload & {
    snapshotAcquiredAt?: number;
    catalog?: ModelCatalogResponse;
    snapshot?: RemoteUserDataSnapshot;
    settings?: { localMediaNotifications: { enabled: boolean; locale: string } };
    wallet?: WalletSummary;
    teams?: { teams: TeamSummary[] };
    projects?: { projects: ProjectSummary[] };
    projectsPage?: ProjectListPage;
    canvasPage?: Awaited<ReturnType<typeof listRemoteCanvasProjectsPage>>;
    plugins?: Awaited<ReturnType<typeof fetchPluginRuntimeState>>;
    paymentOptions?: Awaited<ReturnType<typeof getPaymentOptions>>;
    launchOffer?: LaunchOfferEligibility;
    referralAvailability?: { enabled: boolean };
};
