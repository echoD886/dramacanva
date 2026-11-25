import { useQuery } from "@tanstack/react-query";
import { useUserStore } from "@/stores/use-user-store";
import { getByokStatus } from "@/services/api/byok";

export function useByokStatus() {
    const userId = useUserStore((state) => state.user?.id);
    const hydrated = useUserStore((state) => state.hydrated);
    return useQuery({
        queryKey: ["byok-status", userId],
        queryFn: ({ signal }) => getByokStatus(signal),
        enabled: Boolean(userId && hydrated),
        refetchOnMount: "always",
        refetchOnWindowFocus: "always",
        refetchInterval: (query) => (["checkout_pending", "pending_activation"].includes(query.state.data?.subscription?.status || "") ? 5000 : false),
    });
}
