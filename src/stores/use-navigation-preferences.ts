import { create } from "zustand";
import { persist } from "zustand/middleware";

type NavigationPreferences = {
    iconMotion: boolean;
    detailedHints: boolean;
    setIconMotion: (enabled: boolean) => void;
    setDetailedHints: (enabled: boolean) => void;
};

export const useNavigationPreferences = create<NavigationPreferences>()(
    persist(
        (set) => ({
            iconMotion: true,
            detailedHints: true,
            setIconMotion: (iconMotion) => set({ iconMotion }),
            setDetailedHints: (detailedHints) => set({ detailedHints }),
        }),
        {
            name: "infinite-canvas:navigation-preferences",
            partialize: ({ iconMotion, detailedHints }) => ({ iconMotion, detailedHints }),
            merge: (persisted, current) => {
                const saved = (persisted || {}) as Partial<NavigationPreferences>;
                return {
                    ...current,
                    iconMotion: typeof saved.iconMotion === "boolean" ? saved.iconMotion : true,
                    detailedHints: typeof saved.detailedHints === "boolean" ? saved.detailedHints : true,
                };
            },
        },
    ),
);
