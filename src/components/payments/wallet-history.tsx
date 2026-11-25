import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Alert, Button, Input, Modal, Select, Tabs } from "antd";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useI18n } from "@/i18n/use-i18n";
import type { MessageKey } from "@/i18n/messages";
import { useUserStore } from "@/stores/use-user-store";
import { ApiError } from "@/services/api/request";
import { getConsumptionDetail, getConsumptionOrders, getPaymentHistory, getWalletLedger, type Association, type ConsumptionOrder, type HistoryPage, type HistoryParams, type LedgerEvent, type PaymentHistory } from "@/services/api/wallet-history";
import { defaultHistoryWindow, formatCashMinor, historyDateBoundary } from "@/lib/account-credits";
import { ExactCredits } from "./exact-credits";
import { eventKeys, eventLabel, ledgerTitle } from "@/lib/ledger-labels";
export { eventLabel, ledgerTitle } from "@/lib/ledger-labels";

type HistoryItem = LedgerEvent | ConsumptionOrder | PaymentHistory;
const paymentStatusKeys: Record<string, MessageKey> = {
    pending: "ledger.paymentPending",
    paid: "ledger.paymentPaid",
    fulfilled: "ledger.paymentFulfilled",
    failed: "ledger.paymentFailed",
    canceled: "ledger.paymentCanceled",
    expired: "ledger.paymentExpired",
    refunded: "ledger.cashRefund",
    disputed: "ledger.dispute",
};
const consumptionStatusKeys: Record<string, MessageKey> = { reserved: "ledger.reserve", running: "ledger.running", uncertain: "ledger.needsReview", settled: "ledger.settled", refunded: "ledger.release" };
type Translate = ReturnType<typeof useI18n>["t"];
export function AssociationLinks({ association }: { association: Association }) {
    const { t } = useI18n();
    const taskCenterEnabled = useUserStore((state) => state.features.taskCenterEnabled);
    const keys: Record<Association["status"], MessageKey> = {
        linked: "ledger.linked",
        unbound: "ledger.unbound",
        not_recorded: "ledger.notRecorded",
        deleted: "ledger.deleted",
        forbidden: "ledger.forbidden",
        query_failed: "ledger.queryFailed",
        ambiguous: "ledger.ambiguous",
    };
    return (
        <div className="flex flex-wrap gap-2 text-xs">
            {t(keys[association.status])}
            {association.status === "linked" ? (
                <>
                    {association.canvasId ? <Link to={`/canvas/${encodeURIComponent(association.canvasId)}`}>{association.canvasTitle || t("ledger.canvas")}</Link> : null}
                    {association.projectId ? <Link to={`/projects/${encodeURIComponent(association.projectId)}`}>{association.projectName || t("ledger.project")}</Link> : null}
                </>
            ) : null}
            {taskCenterEnabled && association.taskId && (association.status === "linked" || association.status === "unbound") ? (
                <Link to="/tasks">
                    {t("ledger.task")}
                </Link>
            ) : null}
        </div>
    );
}
export function LedgerEventRow({ event }: { event: LedgerEvent }) {
    const { t, date } = useI18n();
    const [open, setOpen] = useState(false);
    return (
        <article className="border-b border-border/50 py-3">
            <div className="flex flex-wrap justify-between gap-2">
                <Button type="text" onClick={() => setOpen(true)}>
                    {ledgerTitle(event, t)}
                </Button>
                <ExactCredits value={event.eventKind === "reserve" ? event.reservedDeltaMicrocredits : event.amountMicrocredits} signed={event.eventKind !== "reserve"} />
            </div>
            <time className="text-xs text-foreground/60" dateTime={event.createdAt}>
                {date(event.createdAt, { dateStyle: "short", timeStyle: "short" })}
            </time>
            <Modal open={open} onCancel={() => setOpen(false)} footer={null} title={eventLabel(event, t)}>
                <p>
                    {t("ledger.historicalBalance")}: <ExactCredits value={event.availableAfterMicrocredits} />
                </p>
                <p>
                    {t("ledger.historicalReserved")}: <ExactCredits value={event.reservedAfterMicrocredits} />
                </p>
                <p>
                    {t("ledger.identification")}: {event.identification === "unverified" ? t("ledger.unknown") : t("ledger.verified")}
                </p>
                <AssociationLinks association={event.association} />
                {event.billingOrderId ? <ConsumptionDetailButton id={event.billingOrderId} /> : null}
            </Modal>
        </article>
    );
}
export function ConsumptionDetailButton({ id }: { id: string }) {
    const { t, number } = useI18n();
    const userId = useUserStore((state) => state.user?.id || "");
    const [open, setOpen] = useState(false);
    const query = useQuery({ queryKey: ["wallet-history", userId, "detail", id], enabled: open && Boolean(userId), queryFn: ({ signal }) => getConsumptionDetail(id, signal) });
    const detail = query.data;
    const price = detail?.pricingSnapshot;
    return (
        <>
            <Button type="text" onClick={() => setOpen(true)}>
                {t("ledger.details")}
            </Button>
            <Modal open={open} onCancel={() => setOpen(false)} footer={null} title={t("ledger.consumption")} width={720}>
                {query.error ? <Alert type="error" showIcon message={t("ledger.loadFailed")} action={<Button onClick={() => void query.refetch()}>{t("wallet.retry")}</Button>} /> : null}
                {detail ? (
                    <>
                        <OrderAmounts order={detail.order} />
                        <ReleaseOutcome order={detail.order} />
                        <AssociationLinks association={detail.association} />
                        {detail.order.needsReview ? <Alert className="my-3" type="warning" message={t("ledger.needsReview")} description={t("ledger.recoveryHint")} /> : null}
                        <h3 className="mt-4 font-semibold">{t("ledger.pricing")}</h3>
                        {price &&
                        ["fixed_request", "token", "per_second"].includes(price.billingMode) &&
                        (price.priceVersion > 0 || price.unitPriceMicrocredits > 0 || price.inputTokenPriceMicrocredits > 0 || price.outputTokenPriceMicrocredits > 0 || price.cachedTokenPriceMicrocredits > 0) ? (
                            <dl className="grid grid-cols-2 gap-2 text-sm my-3">
                                <dt>{t("ledger.billingMode")}</dt>
                                <dd>{t(price.billingMode === "token" ? "ledger.token" : price.billingMode === "per_second" ? "ledger.second" : "ledger.request")}</dd>
                                <dt>{t("ledger.priceVersion")}</dt>
                                <dd>
                                    {price.priceVersion ? number(price.priceVersion) : t("ledger.notRecorded")} / {price.priceTierVersion ? number(price.priceTierVersion) : t("ledger.notRecorded")}
                                </dd>
                                <dt>{t("ledger.multiplier")}</dt>
                                <dd>{number(price.multiplierBasisPoints / 10000)}×</dd>
                                <dt>{t("ledger.quantity")}</dt>
                                <dd>{number(price.quantity)}</dd>
                                <dt>{t("ledger.unitPrice")}</dt>
                                <dd>
                                    <ExactCredits value={price.unitPriceMicrocredits} />
                                </dd>
                                {price.billingMode === "token" ? (
                                    <>
                                        <dt>{t("ledger.tokenPrices")}</dt>
                                        <dd>
                                            {[price.inputTokenPriceMicrocredits, price.outputTokenPriceMicrocredits, price.cachedTokenPriceMicrocredits].map((v, i) => (
                                                <span key={i}>
                                                    <ExactCredits value={v} />
                                                    {i < 2 ? " / " : ""}
                                                </span>
                                            ))}
                                        </dd>
                                        <dt>{t("ledger.usage")}</dt>
                                        <dd>{price.usageAvailable ? [price.inputTokens, price.outputTokens, price.cachedTokens].map((v) => number(v)).join(" / ") : t("ledger.priceMissing")}</dd>
                                    </>
                                ) : null}
                                <dt>{t("ledger.ceiling")}</dt>
                                <dd>{price.chargeLimitMicrocredits === -1 ? t("ledger.actualUsage") : price.chargeLimitMicrocredits ? <ExactCredits value={price.chargeLimitMicrocredits} /> : t("ledger.notRecorded")}</dd>
                            </dl>
                        ) : (
                            <p>{t("ledger.priceMissing")}</p>
                        )}
                        <h3 className="mt-4 font-semibold">{t("ledger.events")}</h3>
                        {detail.events.map((event) => (
                            <LedgerEventRow key={event.id} event={event} />
                        ))}
                    </>
                ) : (
                    <p>{t("common.loadingShort")}</p>
                )}
            </Modal>
        </>
    );
}
function OrderAmounts({ order }: { order: ConsumptionOrder }) {
    const { t } = useI18n();
    const amounts: Array<[MessageKey, number]> = [
        ["ledger.reserve", order.reservedMicrocredits],
        ["ledger.consume", order.consumedMicrocredits],
        ["ledger.release", order.releasedMicrocredits],
        ["ledger.refund", order.refundedMicrocredits],
        ["ledger.net", order.netMicrocredits],
        ["ledger.supplement", order.supplementMicrocredits],
    ];
    if (order.needsReview) amounts.push(["ledger.unverifiedAmount", order.unverifiedMicrocredits]);
    return (
        <dl className="flex flex-wrap gap-x-5 gap-y-2 my-3">
            {amounts.map(([key, value]) => (
                <div key={key}>
                    <dt className="text-xs text-foreground/60">{t(key)}</dt>
                    <dd>
                        <ExactCredits value={value} />
                    </dd>
                </div>
            ))}
        </dl>
    );
}
function sourceLabel(source: string, t: Translate) {
    const keys: Record<string, MessageKey> = { web: "ledger.sourceWeb", cloud_agent: "ledger.sourceAgent", mcp: "ledger.sourceMCP", api: "ledger.sourceAPI", unknown: "ledger.sourceUnknown", "": "ledger.sourceMissing" };
    return t(keys[source] || "ledger.sourceUnknown");
}
function ReleaseOutcome({ order }: { order: ConsumptionOrder }) {
    const { t } = useI18n();
    return order.status === "refunded" ? (
        <p className="text-xs">
            {t("ledger.releaseOutcome")}:{" "}
            {t(order.association.taskOutcome === "failed" ? "ledger.taskFailed" : order.association.taskOutcome === "cancelled" ? "ledger.taskCanceled" : order.association.taskOutcome === "succeeded" ? "ledger.needsReview" : "ledger.notRecorded")}
        </p>
    ) : null;
}
export function ConsumptionRow({ order }: { order: ConsumptionOrder }) {
    const { t, date } = useI18n();
    const statusKeys: Record<ConsumptionOrder["status"], MessageKey> = { reserved: "ledger.reserve", running: "ledger.running", uncertain: "ledger.needsReview", settled: "ledger.settled", refunded: "ledger.release" };
    const purposeKeys: Record<string, MessageKey> = {
        text_to_image: "ledger.textToImage",
        image_to_image: "ledger.imageToImage",
        image: "wallet.sceneImage",
        canvas_image: "wallet.sceneImage",
        text_to_video: "wallet.sceneVideo",
        image_to_video: "wallet.sceneVideo",
        reference_to_video: "wallet.sceneVideo",
        audio_to_video: "wallet.sceneVideo",
        video: "wallet.sceneVideo",
        canvas_video: "wallet.sceneVideo",
        text_to_audio: "wallet.sceneAudio",
        text_to_speech: "wallet.sceneAudio",
        audio: "wallet.sceneAudio",
        speech: "wallet.sceneAudio",
        canvas_audio: "wallet.sceneAudio",
        text: "wallet.sceneText",
        chat: "wallet.sceneText",
        canvas_text: "wallet.sceneText",
        agent: "ledger.agent",
        cloud_agent: "ledger.agent",
        cloud_agent_step: "ledger.agent",
        storyboard: "wallet.sceneStoryboard",
        agent_storyboard: "wallet.sceneStoryboard",
        agent_storyboard_rows: "wallet.sceneStoryboard",
    };
    const statusKey = order.needsReview || order.status === "uncertain" ? "ledger.needsReview" : order.refundedMicrocredits > 0 ? (order.netMicrocredits > 0 ? "ledger.partialRefund" : "ledger.refunded") : statusKeys[order.status];
    return (
        <article className="border-b border-border/50 py-3">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 sm:flex sm:flex-wrap sm:items-center">
                <div className="min-w-0 flex flex-wrap items-center gap-x-3 gap-y-1 sm:contents">
                    <time className="text-xs text-foreground/60" dateTime={order.createdAt}>
                        {date(order.createdAt, { dateStyle: "short", timeStyle: "short" })}
                    </time>
                    <span>{t(purposeKeys[order.scene] || purposeKeys[order.capability || ""] || "wallet.sceneOther")}</span>
                    <strong className="break-all">{order.model || t("ledger.notRecorded")}</strong>
                </div>
                <div className="row-start-2 min-w-0 flex flex-wrap items-center gap-2 sm:contents">
                    <AssociationLinks association={order.association} />
                    <span className="rounded border border-border px-2 py-0.5 text-xs">{sourceLabel(order.source, t)}</span>
                    <span className="text-sm">{t(statusKey)}</span>
                </div>
                <div className="col-start-2 row-span-2 row-start-1 flex flex-col items-end justify-center gap-1 sm:ml-auto sm:flex-row sm:items-center">
                    <ExactCredits value={-order.netMicrocredits} signed />
                    <ConsumptionDetailButton id={order.id} />
                </div>
            </div>
        </article>
    );
}
function CashAmount({ amount, currency }: { amount: number; currency: string }) {
    const { t, locale, number } = useI18n();
    return formatCashMinor(amount, currency, locale) ?? t("ledger.cashUnrecorded", { amount: number(amount) });
}
function PaymentRow({ order }: { order: PaymentHistory }) {
    const { t, date } = useI18n();
    return (
        <article className="border-b border-border/50 py-3">
            <div className="flex flex-wrap justify-between gap-2">
                <strong>{order.productName}</strong>
                <span>
                    <CashAmount amount={order.amountMinor} currency={order.currency} />
                </span>
            </div>
            <p>
                {t(paymentStatusKeys[order.status] || "ledger.notRecorded")} · {date(order.createdAt, { dateStyle: "short", timeStyle: "short" })}
            </p>
            <p>
                {order.productKind === "byok" && !order.creditsMicrocredits ? t("ledger.servicePurchase") : order.status === "fulfilled" ? t("ledger.issued") : order.fulfilledAt ? t("ledger.previouslyIssued") : t("ledger.pendingCredits")}{" "}
                {order.creditsMicrocredits ? <ExactCredits value={order.creditsMicrocredits} /> : null}
            </p>
            {order.status === "refunded" || order.status === "disputed" || order.cashRefundedMinor != null || order.cashDisputedMinor != null ? (
                <dl className="flex flex-wrap gap-3">
                    {(
                        [
                            ["ledger.cashRefund", order.cashRefundedMinor],
                            ["ledger.dispute", order.cashDisputedMinor],
                        ] as const
                    ).map(([key, value]) => (
                        <div key={key}>
                            <dt>{t(key)}</dt>
                            <dd>{value == null ? t("ledger.notRecorded") : <CashAmount amount={value} currency={order.currency} />}</dd>
                        </div>
                    ))}
                </dl>
            ) : null}
            <dl className="flex flex-wrap gap-3">
                {(
                    [
                        ["ledger.clawbackDue", order.dueClawbackMicrocredits],
                        ["ledger.clawbackActual", order.actualClawbackMicrocredits],
                        ["ledger.shortfall", order.shortfallMicrocredits],
                    ] as const
                ).map(([key, value]) => (
                    <div key={key}>
                        <dt>{t(key)}</dt>
                        <dd>{value === null ? t("ledger.notRecorded") : <ExactCredits value={value} />}</dd>
                    </div>
                ))}
            </dl>
            {order.invoiceUrl ? (
                <a href={order.invoiceUrl} target="_blank" rel="noreferrer">
                    {t("ledger.invoice")}
                </a>
            ) : null}
        </article>
    );
}
export function RecentWalletHistory() {
    const { t, date } = useI18n();
    const userId = useUserStore((state) => state.user?.id || "");

    const query = useQuery({
        queryKey: ["wallet-history", userId, "recent"],
        queryFn: ({ signal }) => getWalletLedger({ ...defaultHistoryWindow(), limit: 8 }, signal),
        enabled: Boolean(userId),
        refetchInterval: 15000,
        refetchIntervalInBackground: false,
    });
    return (
        <section className="account-center-card mt-4">
            <h2 className="font-semibold">{t("accountPage.ledgerTitle")}</h2>
            {query.dataUpdatedAt ? <time className="text-xs text-foreground/60">{date(query.dataUpdatedAt, { dateStyle: "short", timeStyle: "short" })}</time> : null}
            {query.error ? <Alert type="error" message={t("ledger.loadFailed")} action={<Button onClick={() => void query.refetch()}>{t("wallet.retry")}</Button>} /> : null}
            {query.data ? query.data.items.length ? query.data.items.map((event) => <LedgerEventRow key={event.id} event={event} />) : <p>{t("wallet.noRecords")}</p> : !query.error ? <p>{t("common.loadingShort")}</p> : null}
            <Link to="/wallet">{t("accountPage.viewAllLedger")}</Link>
        </section>
    );
}
export function WalletHistory({ purchase }: { purchase: React.ReactNode }) {
    const { t, date } = useI18n();
    const userId = useUserStore((state) => state.user?.id || "");
    const [searchParams, setSearchParams] = useSearchParams();
    const [tab, setTab] = useState(() => (searchParams.get("type") === "consume" ? "consumption" : "ledger"));
    const [window, setWindow] = useState<{ from: string; to: string } | undefined>();
    const [dates, setDates] = useState({ from: "", to: "" });
    const changeDate = (boundary: "from" | "to", value: string) => {
        if (!value) {
            setDates({ from: "", to: "" });
            setWindow(undefined);
            return;
        }
        setDates((current) => ({ ...current, [boundary]: value }));
        setWindow((current) => ({ ...(current ?? defaultHistoryWindow(new Date(), timeZone)), [boundary]: historyDateBoundary(value, timeZone, boundary === "to") }));
    };
    const [model, setModel] = useState("");
    const [source, setSource] = useState("");
    const [status, setStatus] = useState("");
    const [limit, setLimit] = useState(30);
    const requestedFilter = searchParams.get("type");
    const filter = requestedFilter && ["income", "consume", "refund", "adjustment", "transfer", "reserve"].includes(requestedFilter) ? requestedFilter : "all";
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const params: HistoryParams = { ...window, limit, ...(tab === "ledger" ? { type: filter, model, source } : tab === "consumption" ? { model, source, status } : { status }) };
    const [generation, setGeneration] = useState(0);
    const query = useInfiniteQuery({
        queryKey: ["wallet-history", userId, tab, params, timeZone, generation],
        initialPageParam: null as { cursor: string; window: { from: string; to: string } } | null,
        enabled: Boolean(userId),
        queryFn: ({ pageParam, signal }): Promise<HistoryPage<HistoryItem> & { queryWindow: { from: string; to: string } }> => {
            const queryWindow = pageParam?.window ?? window ?? defaultHistoryWindow(new Date(), timeZone);
            const input = { ...params, ...queryWindow, cursor: pageParam?.cursor };
            const pending: Promise<HistoryPage<HistoryItem>> = tab === "ledger" ? getWalletLedger(input, signal) : tab === "consumption" ? getConsumptionOrders(input, signal) : getPaymentHistory(input, signal);
            return pending.then((page) => ({ ...page, queryWindow }));
        },
        getNextPageParam: (page) => (page.nextCursor ? { cursor: page.nextCursor, window: page.queryWindow } : undefined),
        refetchInterval: 15000,
        refetchIntervalInBackground: false,
        retry: (count, error) => !(error instanceof ApiError && error.status === 400) && count < 2,
    });
    const restart = () => setGeneration((value) => value + 1);
    const cursorError = query.error instanceof ApiError && ["history_cursor_invalid", "history_cursor_expired", "history_cursor_mismatch"].includes(query.error.reason || "");
    useEffect(() => {
        if (cursorError) restart();
    }, [cursorError]);
    const statusOptions = tab === "consumption" ? ["reserved", "running", "uncertain", "settled", "refunded"] : ["pending", "paid", "fulfilled", "failed", "canceled", "expired", "refunded", "disputed"];
    return (
        <section className="wallet-ledger-panel app-workspace-surface mt-6 rounded-lg p-4 sm:p-5">
            <Tabs
                activeKey={tab}
                onChange={(value) => {
                    setTab(value);
                    setStatus("");
                }}
                items={[
                    { key: "ledger", label: t("ledger.all") },
                    { key: "consumption", label: t("ledger.consumption") },
                    { key: "payment", label: t("ledger.purchases") },
                ]}
            />
            {tab === "payment" ? purchase : null}
            <div className="flex flex-wrap gap-2 my-3">
                <label>
                    {t("ledger.from")}
                    <input
                        type="date"
                        value={dates.from}
                        className="block bg-transparent border border-border rounded p-1"
                        onChange={(event) => {
                            changeDate("from", event.target.value);
                        }}
                    />
                </label>
                <label>
                    {t("ledger.to")}
                    <input
                        type="date"
                        value={dates.to}
                        className="block bg-transparent border border-border rounded p-1"
                        onChange={(event) => {
                            changeDate("to", event.target.value);
                        }}
                    />
                </label>
                {tab !== "payment" ? (
                    <>
                        <Input className="max-w-44" aria-label={t("ledger.model")} placeholder={t("ledger.model")} value={model} onChange={(event) => setModel(event.target.value)} />
                        <Select
                            className="min-w-36"
                            aria-label={t("ledger.source")}
                            value={source}
                            onChange={setSource}
                            options={[{ value: "", label: t("ledger.allSources") }, ...["web", "cloud_agent", "mcp", "api", "unknown", "not_recorded"].map((value) => ({ value, label: sourceLabel(value === "not_recorded" ? "" : value, t) }))]}
                        />
                    </>
                ) : null}
                {tab === "ledger" ? (
                    <Select
                        className="min-w-36"
                        aria-label={t("ledger.type")}
                        value={filter}
                        onChange={(value) => {
                            const next = new URLSearchParams(searchParams);
                            if (value === "all") next.delete("type");
                            else next.set("type", value);
                            setSearchParams(next, { replace: true });
                        }}
                        options={["all", "income", "consume", "refund", "adjustment", "transfer", "reserve"].map((value) => ({ value, label: t(value === "all" ? "ledger.all" : eventKeys[value] || "ledger.unknown") }))}
                    />
                ) : (
                    <Select
                        className="min-w-36"
                        aria-label={t("ledger.status")}
                        value={status}
                        onChange={setStatus}
                        options={[{ value: "", label: t("ledger.allStatuses") }, ...statusOptions.map((value) => ({ value, label: t((tab === "consumption" ? consumptionStatusKeys : paymentStatusKeys)[value]) }))]}
                    />
                )}
                <Select aria-label={t("ledger.pageSize")} value={limit} onChange={setLimit} options={[30, 50, 100].map((value) => ({ value, label: String(value) }))} />
                <Button onClick={restart}>{t("wallet.refreshBalance")}</Button>
            </div>
            <p className="text-xs text-foreground/60">
                {timeZone} · {query.data ? `${date(query.data.pages[0].queryWindow.from, { dateStyle: "short", timeStyle: "short" })} – ${date(query.data.pages[0].queryWindow.to, { dateStyle: "short", timeStyle: "short" })}` : ""} ·{" "}
                {t("ledger.windowHint")} {query.data ? date(query.data.pages[0].snapshotAt, { dateStyle: "short", timeStyle: "short" }) : null}
            </p>
            {query.error ? (
                <Alert type="error" message={t("ledger.loadFailed")} action={<Button onClick={() => (cursorError ? restart() : query.isFetchNextPageError ? void query.fetchNextPage() : void query.refetch())}>{t("wallet.retry")}</Button>} />
            ) : null}
            {query.isPending && !query.error ? <p>{t("common.loadingShort")}</p> : null}
            {query.data?.pages
                .flatMap((page) => page.items)
                .map((item) =>
                    tab === "ledger" ? <LedgerEventRow key={item.id} event={item as LedgerEvent} /> : tab === "consumption" ? <ConsumptionRow key={item.id} order={item as ConsumptionOrder} /> : <PaymentRow key={item.id} order={item as PaymentHistory} />,
                )}
            {query.data?.pages[0].items.length === 0 ? <p>{t("wallet.noRecords")}</p> : null}
            {query.hasNextPage ? (
                <Button className="mt-3" loading={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
                    {t("ledger.more")}
                </Button>
            ) : null}
        </section>
    );
}
