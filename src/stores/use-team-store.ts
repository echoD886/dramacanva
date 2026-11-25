import { create } from "zustand";

import { appQueryClient } from "@/lib/query-client";
import { hydrateTeamContext, setActiveTeamContext } from "@/lib/team-context";

type TeamStore = {
    userId: string;
    activeTeamId: string;
    setUserScope: (userId?: string | null) => void;
    selectTeam: (teamId?: string | null) => void;
};

export const useTeamStore = create<TeamStore>()((set, get) => ({
    userId: "",
    activeTeamId: "",
    setUserScope: (userId) => {
        const normalized = userId || "";
        const activeTeamId = hydrateTeamContext(normalized);
        set({ userId: normalized, activeTeamId });
    },
    selectTeam: (teamId) => {
        const normalized = teamId || "";
        if (normalized === get().activeTeamId) return;
        setActiveTeamContext(normalized);
        set({ activeTeamId: normalized });
        void appQueryClient.invalidateQueries();
        if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("team:changed", { detail: { teamId: normalized } }));
    },
}));
