import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { apiBaseURL } from "@/services/api/request";
import { getWallet } from "@/services/api/wallet";

// 顶栏和账户菜单共享同一个 Query。服务端在账户版本改变时经 SSE 推送一个无余额
// 的版本信号，页面再安全回源读取 /wallet；轮询只是流断开时的最终一致性兜底。
// 余额没有“仍然新鲜”的时间窗：预占、结算、退款和管理员调账都可能在任意时刻落库，
// 每个活跃屏幕首次挂载回源；同屏读者共享读取，不能拿缓存数字当作当前余额。
const WALLET_REFETCH_INTERVAL_MS = 15_000;
const walletBalanceQueryKey = (userId: string) => ["wallet-balance", userId] as const;

export async function readWalletBalance(userId: string, signal?: AbortSignal) {
    const wallet = await getWallet(1, 1, "all", signal);
    if (wallet.account.userId !== userId) throw new Error("积分账户与当前用户不一致");
    return wallet;
}

// The stream's version proves whether the already-read account includes that
// change. A read that was in flight before ready may need one further read.
export async function reconcileWalletVersion(client: QueryClient, userId: string, version?: number, connectedAt = 0) {
    const key = walletBalanceQueryKey(userId);
    const cached = client.getQueryData<Awaited<ReturnType<typeof readWalletBalance>>>(key);
    if (version !== undefined && cached && cached.account.version >= version && (client.getQueryState(key)?.dataUpdatedAt ?? 0) >= connectedAt) return;
    const read = () => client.fetchQuery({ queryKey: key, queryFn: ({ signal }) => readWalletBalance(userId, signal), staleTime: 0 });
    const wallet = await read();
    if (version !== undefined && wallet.account.version < version) await read();
}

type WalletEventListener = (version?: number, connectedAt?: number) => void;

type WalletEventSubscription = {
    listeners: Set<WalletEventListener>;
    source: EventSource | null;
};

const walletEventSubscriptions = new Map<string, WalletEventSubscription>();

function walletEventsURL(userId: string) {
    const base = String(apiBaseURL || "/api").replace(/\/+$/, "");
    return `${base}/wallet/events?${new URLSearchParams({ scope: userId }).toString()}`;
}

function closeWalletEventSource(subscription: WalletEventSubscription) {
    subscription.source?.close();
    subscription.source = null;
}

function connectWalletEventSource(userId: string, subscription: WalletEventSubscription) {
    if (subscription.source || typeof EventSource === "undefined" || document.visibilityState !== "visible") return;
    const source = new EventSource(walletEventsURL(userId), { withCredentials: true });
    let connectedAt = Date.now();
    const notify = (event: MessageEvent, ready = false) => {
        let version: number | undefined;
        try {
            const value = JSON.parse(event.data).version;
            if (Number.isSafeInteger(value) && value >= 0) version = value;
        } catch {
            /* An unversioned signal still forces a read. */
        }
        window.dispatchEvent(new CustomEvent("wallet:updated", { detail: { source: "wallet-stream" } }));
        for (const listener of subscription.listeners) listener(version, ready ? connectedAt : undefined);
    };
    // ready 只携带握手时刻的版本，服务端此后仅推送“变化”。断线期间发生的扣费或退款
    // 已经被算进这个初始版本，不会再单独推送一次，所以每次连上都必须核对该版本。
    source.addEventListener("ready", (event) => notify(event as MessageEvent, true));
    source.addEventListener("wallet_updated", (event) => notify(event as MessageEvent));
    source.addEventListener("error", () => {
        connectedAt = Date.now();
    });
    subscription.source = source;
}

// 一个用户在同一标签页可同时挂载首页顶栏和账户菜单。用单个 EventSource 复用连接，
// 并在页面转入后台时关闭它，避免每个隐藏标签页都持续占用一条服务端版本探测。
export function subscribeWalletEvents(userId: string, listener: WalletEventListener) {
    if (typeof window === "undefined" || typeof EventSource === "undefined") return () => undefined;
    const subscription = walletEventSubscriptions.get(userId) || { listeners: new Set<WalletEventListener>(), source: null };
    walletEventSubscriptions.set(userId, subscription);
    subscription.listeners.add(listener);
    const onVisibilityChange = () => {
        if (document.visibilityState === "visible") {
            connectWalletEventSource(userId, subscription);
            listener();
        } else {
            closeWalletEventSource(subscription);
        }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    connectWalletEventSource(userId, subscription);

    return () => {
        document.removeEventListener("visibilitychange", onVisibilityChange);
        subscription.listeners.delete(listener);
        if (subscription.listeners.size === 0) {
            closeWalletEventSource(subscription);
            walletEventSubscriptions.delete(userId);
        }
    };
}

export function useWalletBalance(userId?: string, enabled = true) {
    const activeUserId = enabled ? userId || "" : "";
    const queryClient = useQueryClient();
    const queryKey = walletBalanceQueryKey(activeUserId);
    const query = useQuery({
        queryKey,
        enabled: Boolean(activeUserId),
        queryFn: ({ signal }) => readWalletBalance(activeUserId, signal),
        staleTime: 0,
        // SSE 是即时路径；活跃页面最多 15 秒回源一次，以覆盖网络、代理或旧版
        // 浏览器不支持 EventSource 的情况。后台标签页不轮询。
        refetchInterval: WALLET_REFETCH_INTERVAL_MS,
        refetchIntervalInBackground: false,
        refetchOnMount: (query) => (query.getObserversCount() <= 1 ? "always" : false),
        refetchOnReconnect: "always",
        refetchOnWindowFocus: "always",
    });

    useEffect(() => {
        if (!activeUserId) return;
        const handleUpdated = (event: Event) => {
            // The shared stream notifies its subscribers directly. Broadcasting
            // also reaches media consumers, but must not cancel the same GET twice.
            if ((event as CustomEvent).detail?.source === "wallet-stream") return;
            void queryClient.invalidateQueries({ queryKey: walletBalanceQueryKey(activeUserId) });
            void queryClient.invalidateQueries({ queryKey: ["wallet-history", activeUserId] });
        };
        window.addEventListener("wallet:updated", handleUpdated);
        const unsubscribe = subscribeWalletEvents(activeUserId, (version, connectedAt) => {
            void reconcileWalletVersion(queryClient, activeUserId, version, connectedAt).catch((error) => console.warn("积分余额刷新失败", error));
            void queryClient.invalidateQueries({ queryKey: ["wallet-history", activeUserId] });
        });
        return () => {
            window.removeEventListener("wallet:updated", handleUpdated);
            unsubscribe();
        };
    }, [activeUserId, queryClient]);

    useEffect(() => {
        if (query.error) console.warn("积分余额刷新失败", query.error);
    }, [query.error]);

    return {
        account: query.data?.account ?? null,
        breakdown: query.data?.breakdown ?? [],
        spendingPolicy: query.data?.spendingPolicy ?? null,
        availableMicrocredits: query.data?.account.availableMicrocredits ?? null,
        usableMicrocredits: query.data?.usableMicrocredits ?? null,
        reservedMicrocredits: query.data?.account.reservedMicrocredits ?? null,
        refreshing: query.isFetching,
        refresh: () => {
            void queryClient.invalidateQueries({ queryKey: ["wallet-history", activeUserId] });
            return query.refetch();
        },
        data: query.data,
        error: query.error,
        isPending: query.isPending,
        checkedAt: query.dataUpdatedAt,
    };
}
