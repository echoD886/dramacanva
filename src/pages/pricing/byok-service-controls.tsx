import { navigateToSettings } from "@/lib/settings-navigation";
import { ByokStatusNotice } from "@/components/byok-status";
import { useByokStatus } from "@/hooks/use-byok-status";
import { App } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useI18n } from "@/i18n/use-i18n";
import { useUserStore } from "@/stores/use-user-store";
import { getByokRequests, setByokCancellation, createByokPortal, setByokConnection } from "@/services/api/byok";

export const byokRequestStatusKey = { submitted: "pricing.byokStatusSubmitted", reviewing: "pricing.byokStatusReviewing", supported: "pricing.byokStatusSupported", declined: "pricing.byokStatusDeclined" } as const;
export function ByokServiceControls() {
    const { t } = useI18n();
    const { message } = App.useApp();
    const client = useQueryClient();
    const user = useUserStore((state) => state.user);
    const status = useByokStatus();
    const channelsEnabled = useUserStore((state) => state.featuresLoaded && state.features.customChannelsEnabled);
    const requests = useQuery({ queryKey: ["byok-requests", user?.id], queryFn: getByokRequests, enabled: Boolean(user) });
    const [baseUrl, setBaseUrl] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const lock = useRef(false);
    const lifetime = useRef(0);
    useEffect(() => {
        lifetime.current++;
        setBaseUrl(null);
        lock.current = false;
        setBusy(false);
        return () => {
            lifetime.current++;
        };
    }, [user?.id]);
    const subscription = status.data?.subscription;
    const run = async (work: () => Promise<unknown>, onSuccess?: (result: unknown) => void) => {
        if (lock.current) return;
        const requestLifetime = lifetime.current;
        const isCurrent = () => requestLifetime === lifetime.current && user?.id === useUserStore.getState().user?.id;
        lock.current = true;
        setBusy(true);
        try {
            const result = await work();
            if (!isCurrent()) return;
            onSuccess?.(result);
            await client.invalidateQueries({ queryKey: ["byok-status", user?.id] });
        } catch (error) {
            if (!isCurrent()) return;
            message.error(error instanceof Error ? error.message : t("pricing.checkoutFailed"));
            await client.invalidateQueries({ queryKey: ["byok-status", user?.id] });
        } finally {
            if (isCurrent()) {
                lock.current = false;
                setBusy(false);
            }
        }
    };
    if (!user)
        return (
            <section className="sa-byok-account">
                <p>{t("byok.privacy")}</p>
                <p>{t("byok.fees")}</p>
                <ByokStatusNotice />
                {channelsEnabled ? <Link to="/login?next=%2Fsettings%3Fsection%3Dchannels">{t("channels.title")}</Link> : null}
            </section>
        );
    return (
        <section className="sa-byok-account" aria-label={t("pricing.byokManageTitle")}>
            <h3>{t("pricing.byokManageTitle")}</h3>
            <p>{t("byok.privacy")}</p>
            <p>{t("byok.fees")}</p>
            <ByokStatusNotice />
            {status.isPending ? (
                <p role="status">…</p>
            ) : status.isError ? (
                <p role="alert">{t("pricing.catalogLoadError")}</p>
            ) : (
                <>
                    {subscription?.providerSubscriptionId && !subscription.cancelAtPeriodEnd && ["active", "past_due", "trialing", "unpaid", "paused"].includes(subscription.status) ? (
                        <button type="button" disabled={busy} onClick={() => void run(() => setByokCancellation(true))}>
                            {t("pricing.byokCancel")}
                        </button>
                    ) : null}
                    {subscription?.providerCustomerId && subscription.provider !== "stripe" ? (
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                                void run(
                                    async () => {
                                        const { url } = await createByokPortal();
                                        const target = new URL(url);
                                        if (target.protocol !== "https:") throw new Error(t("pricing.invalidCheckout"));
                                        return target.toString();
                                    },
                                    (url) => window.location.assign(String(url)),
                                )
                            }
                        >
                            {t("pricing.byokPortal")}
                        </button>
                    ) : null}
                    {status.data?.active && !status.isFetching ? (
                        <form
                            onSubmit={(event) => {
                                event.preventDefault();
                                void run(
                                    () => setByokConnection(baseUrl ?? status.data?.connection?.baseUrl ?? ""),
                                    () => {
                                        message.success(t("pricing.byokSaved"));
                                    },
                                );
                            }}
                        >
                            <label>
                                {t("pricing.byokChannelLabel")}
                                <input type="url" required maxLength={1024} value={baseUrl ?? status.data?.connection?.baseUrl ?? ""} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://provider.example" />
                            </label>
                            <small>{t("pricing.byokChannelHelp")}</small>
                            <button type="submit" disabled={busy}>
                                {t("pricing.byokSaveChannel")}
                            </button>
                        </form>
                    ) : null}
                </>
            )}
            <button
                type="button"
                disabled={status.isFetching || busy}
                onClick={() => {
                    void status.refetch();
                    void requests.refetch();
                }}
            >
                {t("pricing.byokRefresh")}
            </button>
            {channelsEnabled ? (
                <button type="button" onClick={() => navigateToSettings({ section: "channels" })}>
                    {t("channels.title")}
                </button>
            ) : null}
            <h3>{t("pricing.byokRequests")}</h3>
            {requests.isError ? (
                <p role="alert">{t("pricing.catalogLoadError")}</p>
            ) : requests.data?.requests.length ? (
                <ul className="sa-byok-request-list">
                    {requests.data.requests.map((request) => (
                        <li key={request.id}>
                            <strong>{request.channelName}</strong> · {t(byokRequestStatusKey[request.status])}
                            <small>{request.id}</small>
                            {request.reply ? (
                                <p>
                                    {t("pricing.byokReply")}: {request.reply}
                                </p>
                            ) : null}
                        </li>
                    ))}
                </ul>
            ) : (
                <p>{t("pricing.byokNoRequests")}</p>
            )}
        </section>
    );
}
