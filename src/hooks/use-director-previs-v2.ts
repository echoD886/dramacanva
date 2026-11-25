import { useUserStore } from "@/stores/use-user-store";

export function selectDirectorPrevisV2(state: Pick<ReturnType<typeof useUserStore.getState>, "hydrated" | "user">): boolean {
    return state.hydrated && state.user?.status === "active" && state.user.features?.directorPrevisV2 === true;
}

export function useDirectorPrevisV2(): boolean {
    return useUserStore(selectDirectorPrevisV2);
}
