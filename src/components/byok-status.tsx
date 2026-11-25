import { Link } from "react-router";
import { useI18n } from "@/i18n/use-i18n";
import { useByokStatus } from "@/hooks/use-byok-status";
import { byokState } from "@/lib/byok-state";
import { useUserStore } from "@/stores/use-user-store";
import type { ByokStatus } from "@/services/api/byok";

export function ByokStatusNotice({ compact = false }: { compact?: boolean }) {
    const user = useUserStore((state) => state.user);
    const hydrated = useUserStore((state) => state.hydrated);
    const status = useByokStatus();
    return <ByokStatusContent compact={compact} signedIn={Boolean(user)} loading={!hydrated || status.isFetching || status.isPending} failed={status.isError} data={status.data} onRetry={() => void status.refetch()} />;
}

export function ByokStatusContent({ signedIn, loading, failed, data, onRetry, compact = false }: { signedIn: boolean; loading: boolean; failed: boolean; data?: ByokStatus; onRetry: () => void; compact?: boolean }) {
    const { t, date } = useI18n();
    if (!signedIn) return <p role="status">{t("byok.login")}</p>;
    if (loading) return <p role="status">{t("byok.loading")}</p>;
    if (failed || !data)
        return (
            <p role="alert">
                {t("byok.failed")}{" "}
                <button type="button" onClick={onRetry}>
                    {t("pricing.byokRefresh")}
                </button>
            </p>
        );
    const state = byokState(data);
    if (compact)
        return (
            <span role="status" data-byok-state={state}>
                {t(state === "gateOff" ? "byok.introGateOff" : state === "unbound" ? "byok.introUnbound" : state === "bound" ? "byok.introBound" : `byok.${state}`)}
                {state === "required" || state === "expired" ? (
                    <>
                        {" "}
                        · <Link to="/pricing?plan=byok">{t("byok.openPass")}</Link>
                    </>
                ) : null}
            </span>
        );
    return (
        <div role="status" data-byok-state={state}>
            <p>{t(`byok.${state}`)}</p>
            {data.subscription?.paidThrough ? <p>{t("pricing.byokPaidUntil", { date: date(data.subscription.paidThrough) })}</p> : null}
            {data.connection ? <p>{data.connection.baseUrl}</p> : null}
            {state === "required" || state === "expired" ? <Link to="/pricing?plan=byok">{t("byok.openPass")}</Link> : null}
        </div>
    );
}

export function ByokSetupGuide() {
    const { t } = useI18n();
    return (
        <>
            <ol>
                <li>{t("byok.step1")}</li>
                <li>{t("byok.step2")}</li>
                <li>{t("byok.step3")}</li>
            </ol>
            <p>{t("byok.privacy")}</p>
            <p>{t("byok.fees")}</p>
        </>
    );
}
