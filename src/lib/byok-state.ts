import type { ByokStatus } from "@/services/api/byok";

export const BYOK_SETTINGS_PATH = "/settings?section=channels";
export function byokEntryPath(loggedIn: boolean) {
    return loggedIn ? BYOK_SETTINGS_PATH : `/login?next=${encodeURIComponent(BYOK_SETTINGS_PATH)}`;
}
export function byokState(data: ByokStatus, now = Date.now()) {
    if (!data.checkoutReady) return "gateOff";
    if (["checkout_pending", "pending_activation"].includes(data.subscription?.status || "")) return "pending";
    if (data.active) return data.connection ? "bound" : "unbound";
    const paidThrough = data.subscription?.paidThrough;
    return paidThrough && Date.parse(paidThrough) <= now ? "expired" : "required";
}
export function byokChannelState(data: ByokStatus | undefined, baseUrl: string, local: boolean) {
    if (local) return "local";
    if (!data?.checkoutReady) return null;
    let origin: string;
    try {
        const parsed = new URL(baseUrl.trim());
        if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash) return "https";
        // Preserve explicit ports (including :443), as the backend does.
        origin = `https://${baseUrl.trim().split("/")[2].toLowerCase()}`;
    } catch {
        return "https";
    }
    if (!data.active) return null;
    if (!data.connection) return "unbound";
    return data.connection.baseUrl === origin ? "matched" : "mismatch";
}
