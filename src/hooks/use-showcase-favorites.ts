import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getShowcaseFavorites, setShowcaseFavorite } from "@/services/api/showcase";
import { useUserStore } from "@/stores/use-user-store";
import { useState } from "react";
import { useHydrated } from "@/lib/prerender-state";

const GUEST_FAVORITES_KEY = "showcase-favorites.guest";
type Favorite = { templateId: string; createdAt: string };

function readGuestFavorites(): Favorite[] {
    if (typeof window === "undefined") return [];
    try {
        const stored: unknown = JSON.parse(window.localStorage.getItem(GUEST_FAVORITES_KEY) || "[]");
        return Array.isArray(stored) ? stored.filter((item): item is Favorite => typeof item?.templateId === "string" && typeof item?.createdAt === "string") : [];
    } catch {
        return [];
    }
}

export function useShowcaseFavorites() {
    const hydrated = useHydrated();
    const userId = useUserStore((state) => state.user?.id);
    const client = useQueryClient();
    const [guestFavorites, setGuestFavorites] = useState<Favorite[]>(readGuestFavorites);
    const queryKey = ["showcase-favorites", userId];
    const query = useQuery({ queryKey, queryFn: getShowcaseFavorites, enabled: Boolean(userId) });
    const mutation = useMutation({
        mutationFn: ({ id, favorite }: { id: string; favorite: boolean }) => (userId ? setShowcaseFavorite(id, favorite) : Promise.resolve({ favorite })),
        onSuccess: (_, { id, favorite }) => {
            if (!userId) {
                setGuestFavorites((current) => {
                    const next = [...current.filter((item) => item.templateId !== id), ...(favorite ? [{ templateId: id, createdAt: new Date().toISOString() }] : [])];
                    try {
                        window.localStorage.setItem(GUEST_FAVORITES_KEY, JSON.stringify(next));
                    } catch {
                        /* Keep the current page state if browser storage is unavailable. */
                    }
                    return next;
                });
                return;
            }
            client.setQueryData<Awaited<ReturnType<typeof getShowcaseFavorites>>>(queryKey, (old) => ({
                favorites: [...(old?.favorites || []).filter((item) => item.templateId !== id), ...(favorite ? [{ templateId: id, createdAt: new Date().toISOString() }] : [])],
            }));
            void client.invalidateQueries({ queryKey });
        },
    });
    return { ...query, favorites: userId ? query.data?.favorites || [] : hydrated ? guestFavorites : [], mutation };
}
