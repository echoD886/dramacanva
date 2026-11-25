import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { clearOnboardingProgress, getOnboardingProgress } from "@/lib/canvas/canvas-onboarding-template";

export function useCanvasOnboardingEntry(projectId: string) {
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeProject, setActiveProject] = useState<string | null>(null);
    useEffect(() => {
        if (!projectId || searchParams.get("tour") !== "1") return;
        const saved = getOnboardingProgress(projectId);
        if (saved?.status === "completed" || saved?.status === "skipped") clearOnboardingProgress(projectId);
        setActiveProject(projectId);
        // The URL is a manual command, not a durable instruction to replay on reload.
        const next = new URLSearchParams(searchParams);
        next.delete("tour");
        setSearchParams(next, { replace: true });
    }, [projectId, searchParams, setSearchParams]);
    const close = useCallback(() => setActiveProject(null), []);
    return { active: activeProject === projectId, close };
}
