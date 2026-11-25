import { useEffect, useRef, useState, type ReactNode } from "react";
import { Alert, App, Button, Input } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, CalendarCheck, Coins, RefreshCw, Save, SlidersHorizontal, TicketCheck } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { WalletHistory } from "@/components/payments/wallet-history";
import { ExactCredits } from "@/components/payments/exact-credits";
import { useWalletBalance } from "@/hooks/use-wallet-balance";
import { useUserStore } from "@/stores/use-user-store";
import { formatAccountCredits } from "@/lib/account-credits";
import { formatCredits } from "@/constant/credits";
import { checkinCredits, redeemCredits, updateCreditSpendingPolicy, type CreditSource, type WalletSummary } from "@/services/api/wallet";
import { useI18n } from "@/i18n/use-i18n";
import { resolveWalletDataState } from "@/pages/wallet/wallet-route-state";

export function creditSourceLabels(t: (key: Parameters<ReturnType<typeof useI18n>["t"]>[0]) => string): Record<CreditSource, string> {
    return {
        membership: t("wallet.sourceMembership"),
        free: t("wallet.sourceFree"),
        recharge: t("wallet.sourceRecharge"),
        model_card: t("wallet.sourceModelCard"),
        referral: t("referral.navTitle"),
    };
}

export function CreditsSection() {
    const { message } = App.useApp();
    const { t, locale, date } = useI18n();
    const [searchParams, setSearchParams] = useSearchParams();
    const userId = useUserStore((state) => state.user?.id || "");
    const sharedBalance = useWalletBalance(userId);
    const queryClient = useQueryClient();

    const [storedWallet, setWallet] = useState<WalletSummary | null>(null);
    const wallet = storedWallet?.account.userId === userId ? storedWallet : null;
    const [code, setCode] = useState("");
    const [paymentConfirmationScope, setPaymentConfirmationScope] = useState("");
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [redeeming, setRedeeming] = useState(false);
    const [checkingIn, setCheckingIn] = useState(false);
    const [spendingOrder, setSpendingOrder] = useState<CreditSource[]>([]);
    const [savingSpendingOrder, setSavingSpendingOrder] = useState(false);
    const requestSequence = useRef(0);
    const spendingPanelRef = useRef<HTMLElement | null>(null);

    const reload = async () => {
        const sequence = ++requestSequence.current;
        setLoading(true);
        setLoadError("");
        try {
            const result = await sharedBalance.refresh();
            if (result.error) throw result.error;
            const nextWallet = result.data;
            if (!nextWallet) throw new Error(t("ledger.loadFailed"));
            if (nextWallet.account.userId !== userId) throw new Error(t("ledger.loadFailed"));
            if (sequence === requestSequence.current) {
                setWallet(nextWallet);
                setSpendingOrder(nextWallet.spendingPolicy.sources);
            }
        } catch (error) {
            if (sequence === requestSequence.current) {
                const detail = error instanceof Error ? error.message : t("wallet.loadFailed");
                setLoadError(detail);
                message.error(detail);
            }
        } finally {
            if (sequence === requestSequence.current) setLoading(false);
        }
    };

    useEffect(() => {
        setSpendingOrder([]);
        void reload();
        return () => {
            requestSequence.current += 1;
        };
    }, [userId]);

    useEffect(() => {
        if (searchParams.get("payment") !== "success") return;
        setPaymentConfirmationScope(userId);
        message.info(t("wallet.returnedInfo"));
        const next = new URLSearchParams(searchParams);
        next.delete("payment");
        setSearchParams(next, { replace: true });
        let attempts = 0;
        const refresh = () => {
            void sharedBalance.refresh();
            void queryClient.invalidateQueries({ queryKey: ["wallet-history", userId] });
            void queryClient.invalidateQueries({ queryKey: ["subscription-display", userId] });
            attempts += 1;
            if (attempts >= 10) window.clearInterval(timer);
        };
        const timer = window.setInterval(refresh, 3000);
        refresh();
        return () => window.clearInterval(timer);
    }, [userId]);

    useEffect(() => {
        if (searchParams.get("panel") !== "spending-order" || !wallet) return;
        window.requestAnimationFrame(() => spendingPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
    }, [searchParams, wallet]);

    const redeem = async () => {
        const normalized = code.trim().toLowerCase();
        if (normalized.length !== 32) {
            message.error(t("wallet.codeIncomplete"));
            return;
        }
        setRedeeming(true);
        try {
            await redeemCredits(normalized);
            setCode("");
            await reload();
            window.dispatchEvent(new CustomEvent("wallet:updated"));
            message.success(t("wallet.redeemSuccess"));
        } catch (error) {
            message.error(error instanceof Error ? error.message : t("wallet.redeemFailed"));
        } finally {
            setRedeeming(false);
        }
    };

    const checkin = async () => {
        setCheckingIn(true);
        try {
            await checkinCredits();
            await reload();
            window.dispatchEvent(new CustomEvent("wallet:updated"));
            message.success(t("wallet.checkinSuccess"));
        } catch (error) {
            message.error(error instanceof Error ? error.message : t("wallet.checkinFailed"));
        } finally {
            setCheckingIn(false);
        }
    };

    const moveSpendingSource = (index: number, direction: -1 | 1) => {
        const target = index + direction;
        if (target < 0 || target >= spendingOrder.length) return;
        setSpendingOrder((current) => {
            const next = [...current];
            [next[index], next[target]] = [next[target], next[index]];
            return next;
        });
    };

    const saveSpendingOrder = async () => {
        if (!wallet || spendingOrder.length < 4) return;
        setSavingSpendingOrder(true);
        try {
            const policy = await updateCreditSpendingPolicy({ revision: wallet.spendingPolicy.revision, sources: spendingOrder });
            setWallet((current) => (current ? { ...current, spendingPolicy: policy } : current));
            setSpendingOrder(policy.sources);
            message.success(t("wallet.orderSaved"));
        } catch (error) {
            message.error(error instanceof Error ? error.message : t("wallet.saveFailed"));
            await reload();
        } finally {
            setSavingSpendingOrder(false);
        }
    };

    useEffect(() => {
        if (sharedBalance.data) {
            setWallet(sharedBalance.data);
            setSpendingOrder((current) => (current.length ? current : sharedBalance.data!.spendingPolicy.sources));
        }
    }, [sharedBalance.data]);

    const account = sharedBalance.account ?? wallet?.account;
    const dataState = resolveWalletDataState(Boolean(wallet), loading, loadError);
    const usableMicrocredits = sharedBalance.usableMicrocredits;

    return (
        <div className="space-y-10 animate-fade-in max-w-4xl">
            {/* 1. 顶部余额概览与兑换码（轻量布局，不堆卡片） */}
            <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)] gap-8 pb-8 border-b border-border/35">
                {/* 余额指标 */}
                <div className="flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-foreground/50 tracking-wider uppercase">{t("wallet.availableCredits")}</span>
                            <Button size="small" icon={<RefreshCw className="size-3.5" />} loading={loading} onClick={() => void reload()} />
                        </div>

                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground tabular-nums account-tabular-nums">
                                {usableMicrocredits !== null && usableMicrocredits !== undefined ? <ExactCredits value={usableMicrocredits} /> : t("wallet.unavailable")}
                            </span>
                            <span className="text-xs text-foreground/50 font-medium">{t("wallet.creditsUnit")}</span>
                        </div>
                        <p className="text-xs text-foreground/45 mt-1">{sharedBalance.checkedAt ? t("wallet.lastUpdated", { time: date(sharedBalance.checkedAt, { hour12: false, dateStyle: "short", timeStyle: "short" }) }) : "--"}</p>

                        {/* 构成小标签 */}
                        {account && (
                            <div className="mt-4 pt-4 border-t border-border/30 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                {(wallet?.breakdown ?? (wallet as any)?.wallet?.breakdown ?? []).map((item: any) => (
                                    <div key={item.sourceType} className="p-2.5 rounded-lg bg-foreground/[.015] border border-border/30">
                                        <span className="text-foreground/50 block text-[11px] truncate mb-0.5">{(creditSourceLabels(t) as Record<string, string>)[item.sourceType] || item.sourceType}</span>
                                        <strong className="font-semibold text-foreground tabular-nums">{formatCredits(item.availableMicrocredits, 2)}</strong>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 每日签到按钮 */}
                    {wallet && (wallet.policy?.checkinBonusMicrocredits ?? 0) > 0 && (
                        <div className="mt-4 pt-3 border-t border-border/30">
                            <Button size="small" type={wallet.policy?.checkedInToday ? "default" : "default"} disabled={wallet.policy?.checkedInToday} loading={checkingIn} icon={<CalendarCheck className="size-3.5" />} onClick={() => void checkin()}>
                                {wallet.policy?.checkedInToday ? t("wallet.checkedInToday") : t("wallet.checkinBonus", { value: formatCredits(wallet.policy?.checkinBonusMicrocredits ?? 0) })}
                            </Button>
                        </div>
                    )}
                </div>

                {/* 兑换码面板 */}
                <div className="flex flex-col justify-between lg:border-l lg:border-border/35 lg:pl-8">
                    <div>
                        <h4 className="text-sm font-semibold text-foreground tracking-tight">{t("wallet.redeemTitle")}</h4>
                        <p className="text-xs text-foreground/50 mt-0.5">{t("wallet.redeemSubtitle")}</p>

                        <div className="mt-4">
                            <label className="text-xs font-medium text-foreground/70 block mb-1.5">{t("wallet.redeemCode")}</label>
                            <Input
                                size="middle"
                                className="font-mono text-xs tabular-nums"
                                value={code}
                                maxLength={32}
                                spellCheck={false}
                                autoComplete="off"
                                onChange={(e) => setCode(e.target.value.replace(/[-\s]/g, ""))}
                                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                onPressEnter={() => void redeem()}
                            />
                            <div className="mt-1.5 flex items-center justify-between text-[11px] text-foreground/45">
                                <span>{t("wallet.redeemInstant")}</span>
                                <span className="tabular-nums font-mono">{code.length} / 32</span>
                            </div>
                        </div>
                    </div>

                    <Button className="mt-4" type="primary" block loading={redeeming} disabled={code.length !== 32} onClick={() => void redeem()}>
                        {t("wallet.redeemButton")}
                    </Button>
                </div>
            </section>

            {/* 2. 扣费消耗顺序面板 */}
            <section ref={spendingPanelRef} className="account-section-group">
                <div className="account-group-header">
                    <div>
                        <h3 className="account-group-title">{t("wallet.spendingOrderTitle")}</h3>
                        <p className="account-group-desc">{t("wallet.spendingOrderDesc")}</p>
                    </div>

                    <Button type="primary" size="small" icon={<Save className="size-3.5" />} loading={savingSpendingOrder} disabled={!wallet || spendingOrder.join(",") === wallet.spendingPolicy.sources.join(",")} onClick={() => void saveSpendingOrder()}>
                        {t("wallet.saveOrder")}
                    </Button>
                </div>

                <Alert className="mb-4 text-xs" type="info" showIcon message={t("wallet.expiryFirst")} description={t("wallet.expiryFirstDesc")} />

                <div className="space-y-2">
                    {spendingOrder.map((source, index) => {
                        const breakdown = (wallet?.breakdown ?? (wallet as any)?.wallet?.breakdown ?? []) as any[];
                        const bucket = breakdown.find((item) => item.sourceType === source);
                        return (
                            <div key={source} className="flex items-center justify-between p-3 rounded-lg border border-border/35 bg-foreground/[.015]">
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="grid size-6 place-items-center rounded bg-foreground/[.05] text-xs font-semibold tabular-nums text-foreground">{index + 1}</span>
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium text-foreground">{creditSourceLabels(t)[source]}</p>
                                        <p className="text-[11px] text-foreground/45 tabular-nums">
                                            {t("wallet.availableFrozen", { available: formatCredits(bucket?.availableMicrocredits || 0, 2), frozen: formatCredits(bucket?.reservedMicrocredits || 0, 2) })}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-1 shrink-0">
                                    <Button type="text" size="small" icon={<ArrowUp className="size-3.5" />} disabled={index === 0} onClick={() => moveSpendingSource(index, -1)} />
                                    <Button type="text" size="small" icon={<ArrowDown className="size-3.5" />} disabled={index === spendingOrder.length - 1} onClick={() => moveSpendingSource(index, 1)} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* 3. 详细交易与流水日志 */}
            <section className="account-section-group">
                <div className="flex items-center justify-between gap-3 mb-4">
                    <h3 className="account-group-title">{t("accountCenter.overview.recentActivity")}</h3>
                    <Link to="/pricing?purchase=credits">
                        <Button type="primary" size="small">
                            {t("accountCenter.overview.topUp")}
                        </Button>
                    </Link>
                </div>
                <WalletHistory purchase={null} />
            </section>
        </div>
    );
}
