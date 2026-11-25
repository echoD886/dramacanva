import { useI18n } from "@/i18n/use-i18n";

export type LedgerFilter = "all" | "income" | "consume" | "refund";

export function normalizeWalletLedgerFilter(value: string | null | undefined): LedgerFilter {
    return value === "income" || value === "consume" || value === "refund" ? value : "all";
}

export function walletLedgerPath(filter: LedgerFilter) {
    return filter === "all" ? "/wallet" : `/wallet?type=${filter}`;
}

export type WalletDataState = "loading" | "ready" | "error";

/** 钱包接口返回前或失败后都不能把缺失数据投影成真实的 0 余额。 */
export function resolveWalletDataState(hasWallet: boolean, loading: boolean, error?: string | null): WalletDataState {
    if (hasWallet) return "ready";
    if (loading) return "loading";
    return error ? "error" : "loading";
}
