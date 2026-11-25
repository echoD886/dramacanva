import { lazy, Suspense } from "react";
import { useUserStore } from "@/stores/use-user-store";

const Guide = lazy(() => import("./model-setup-guide-content").then((module) => ({ default: module.ModelSetupGuide })));

export function ModelSetupGuide({ hidden = false }: { hidden?: boolean }) {
    const hydrated = useUserStore((state) => state.hydrated);
    const user = useUserStore((state) => state.user);
    if (hidden || !hydrated || !user || user.role === "admin") return null;
    return <Suspense fallback={null}><Guide hidden={hidden} /></Suspense>;
}
