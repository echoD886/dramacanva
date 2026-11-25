import { lazy, Suspense, useLayoutEffect, type ReactNode } from "react";
import { useLocation } from "react-router";

import { useCanvasUiStore } from "@/stores/canvas/use-canvas-ui-store";
import { AppWorkspaceShell } from "@/components/layout/app-top-nav";
import { CampaignOfferDialog } from "@/components/layout/campaign-offer-dialog";
import { cn } from "@/lib/utils";
import { WorkspaceRebrandNotice } from "@/components/layout/rebrand-announcement";
import { isSpatialWorkbenchPath } from "@/lib/workspace-routes";

const CanvasDeleteProjectsDialog = lazy(() => import("@/components/canvas/canvas-delete-projects-dialog").then((module) => ({ default: module.CanvasDeleteProjectsDialog })));

export default function UserLayout({ children }: { children: ReactNode }) {
    const { pathname } = useLocation();
    const spatialWorkbench = isSpatialWorkbenchPath(pathname);
    const deleteDialogOpen = useCanvasUiStore((state) => state.deleteProjectIds.length > 0);

    useLayoutEffect(() => {
        // Ant Design 浮层挂载在 body，必须用路由级标记隔离用户工作台与画布编辑器、运营后台。
        document.body.classList.toggle("app-spatial-overlays", spatialWorkbench);
        return () => document.body.classList.remove("app-spatial-overlays");
    }, [spatialWorkbench]);

    return (
        <div className={cn("app-user-workspace h-dvh overflow-hidden text-foreground", spatialWorkbench && "app-spatial-workspace")}>
            <AppWorkspaceShell>{children}</AppWorkspaceShell>
            {deleteDialogOpen ? (
                <Suspense fallback={null}>
                    <CanvasDeleteProjectsDialog />
                </Suspense>
            ) : null}
            <WorkspaceRebrandNotice pathname={pathname} />
            <CampaignOfferDialog />
        </div>
    );
}
