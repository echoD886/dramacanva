import { recordCheckoutCancel } from "@/services/api/checkout";

// The entry script removes the fragment before analytics. Keep its captured
// credential until the POST and status query succeed, including across login.
export async function submitPendingCheckoutCancel(id: string, signal?: AbortSignal) {
    const captured = (window as Window & { __checkoutReturn?: { id: string; token: string } }).__checkoutReturn;
    let token = captured?.id === id ? captured.token : null;
    try {
        token ||= sessionStorage.getItem("checkout-return:" + id);
    } catch {
        // Memory capture also works with browser storage disabled.
    }
    if (!token) throw new Error("Missing return token");
    await recordCheckoutCancel(id, token, signal);
}
