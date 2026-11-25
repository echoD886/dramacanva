import { useQuery } from "@tanstack/react-query";
import { getPaymentOptions } from "@/services/api/wallet";

/**
 * Payment options load on the client only (the SSR/prerender QueryClient is
 * disabled), so "no data yet" must never be rendered as "payments are not
 * configured". Only a successful response can prove checkout is unavailable.
 */
export type PaymentOptionsState = { status: "pending" } | { status: "error" } | { status: "loaded"; checkoutEnabled: boolean };

export function paymentOptionsState(query: { isSuccess: boolean; isError: boolean; data?: { checkoutEnabled?: boolean } }): PaymentOptionsState {
    if (query.isSuccess && query.data) return { status: "loaded", checkoutEnabled: query.data.checkoutEnabled === true };
    if (query.isError) return { status: "error" };
    return { status: "pending" };
}

export function membershipCheckoutAvailability(state: PaymentOptionsState, hasProduct: boolean) {
    if (state.status === "pending") return { enabled: true, notConfigured: false };
    if (state.status === "error") return { enabled: false, notConfigured: false };
    const ready = state.checkoutEnabled && hasProduct;
    return { enabled: ready, notConfigured: !ready };
}

export function usePaymentProviders(userId?: string) {
    const query = useQuery({ queryKey: ["payment-options", userId], queryFn: getPaymentOptions, staleTime: 60_000 });
    return { paymentProviders: query.data?.paymentProviders ?? [], isPending: query.isPending, isError: query.isError };
}
