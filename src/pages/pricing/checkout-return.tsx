import { Button, Modal } from "antd";
import { Check, Clock3, CircleAlert, CircleMinus, LoaderCircle } from "lucide-react";
import { animate, m, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useI18n } from "@/i18n/use-i18n";
import { useUserStore } from "@/stores/use-user-store";
import { getCheckoutReturn, type CheckoutReceipt } from "@/services/api/checkout";
import { motionDialog, motionEase, motionNumber } from "@/lib/motion";
import { checkoutOrigin, checkoutPollDelay, checkoutPollLimit, checkoutReturnState, paymentCopy, pendingCheckoutKey } from "@/lib/payment-ux";
import { SUPPORT_EMAIL } from "@/lib/site-identity";
import { submitPendingCheckoutCancel } from "./checkout-return-action";
import { clearCheckoutReturn } from "./checkout-return-params";
import "./checkout-return.css";
import { markCheckoutPaid } from "@/lib/checkout-exit-offer";

function ReceiptBalance({ value, previous }: { value: number; previous: number }) {
    const { number } = useI18n();
    const reduced = useReducedMotion();
    const [display, setDisplay] = useState(previous);
    useEffect(() => {
        if (reduced) {
            setDisplay(value);
            return;
        }
        const control = animate(previous, value, { duration: motionNumber, ease: motionEase, onUpdate: setDisplay });
        return () => control.stop();
    }, [value, previous, reduced]);
    return <span aria-label={number(value)}>{number(display === value ? value : Math.round(display))}</span>;
}

export function CheckoutReturnNotice() {
    const { t, locale, number, date } = useI18n();
    const copy = paymentCopy(locale);
    const user = useUserStore((s) => s.user);
    const location = useLocation();
    const navigate = useNavigate();
    const reduced = useReducedMotion();
    const [revision, setRevision] = useState(0);
    const [state, setState] = useState<"confirming" | "success" | "delayed" | "cancelled" | "error">("confirming");
    const [receipt, setReceipt] = useState<CheckoutReceipt>();
    const [confetti, setConfetti] = useState(false);
    const params = new URLSearchParams(location.search);
    const payment = params.get("payment");
    const id = params.get("attempt_id");
    const origin = checkoutOrigin(typeof window === "undefined" ? null : sessionStorage.getItem("checkout-origin"));
    useEffect(() => {
        // Tell the page that opened this cashier (another tab) not to offer a discount on a paid order.
        if (payment === "success") markCheckoutPaid();
        if (!payment || !user) return;
        if (!id) {
            setState(payment === "cancelled" || payment === "cancel" ? "cancelled" : "error");
            return;
        }
        const controller = new AbortController();
        let timer: ReturnType<typeof setTimeout>;
        const started = Date.now();
        let index = 0;
        setState("confirming");
        const poll = async () => {
            try {
                const status = await getCheckoutReturn(id, controller.signal);
                if (controller.signal.aborted) return;
                setReceipt(status);
                if (status.paymentState === "succeeded") markCheckoutPaid();
                const next = checkoutReturnState(status.paymentState, payment, Date.now() - started);
                if (next === "success") {
                    const originNode = sessionStorage.getItem("checkout-origin-node");
                    if (originNode) {
                        sessionStorage.setItem("checkout-credits-ready", originNode);
                        sessionStorage.setItem("checkout-focus-node", originNode);
                        sessionStorage.removeItem("checkout-origin-node");
                    }
                    setState("success");
                    sessionStorage.removeItem(pendingCheckoutKey);
                    window.dispatchEvent(new CustomEvent("wallet:updated"));
                    return;
                }
                if (next === "cancelled") {
                    setState("cancelled");
                    return;
                }
                if (next === "delayed") {
                    setState("delayed");
                    sessionStorage.setItem(pendingCheckoutKey, JSON.stringify({ id, userId: user.id, started: Date.now() }));
                    return;
                }
                timer = setTimeout(poll, Math.min(checkoutPollDelay(index++), checkoutPollLimit - (Date.now() - started)));
            } catch {
                if (!controller.signal.aborted) setState("error");
            }
        };
        void (async () => {
            if (payment === "cancel" || payment === "cancelled") await submitPendingCheckoutCancel(id, controller.signal);
            if (!controller.signal.aborted) await poll();
        })().catch(() => {
            if (!controller.signal.aborted) setState("error");
        });
        return () => {
            controller.abort();
            clearTimeout(timer);
        };
    }, [id, payment, user?.id, revision]);
    useEffect(() => {
        if (state !== "success" || reduced) return;
        setConfetti(true);
        const timer = setTimeout(() => setConfetti(false), motionNumber * 2000);
        return () => clearTimeout(timer);
    }, [state, reduced]);
    if (!payment) return null;
    const close = () => {
        if (state !== "delayed") {
            sessionStorage.removeItem("checkout-origin");
            sessionStorage.removeItem("checkout-origin-node");
        }
        navigate({ pathname: location.pathname, search: clearCheckoutReturn(location.search), hash: location.hash }, { replace: true });
    };
    const Icon = state === "success" ? Check : state === "delayed" ? Clock3 : state === "error" ? CircleAlert : state === "cancelled" ? CircleMinus : LoaderCircle;
    const title = state === "success" && receipt?.planName ? copy.welcome.replace("{plan}", receipt.planName) : copy[state];
    return (
        <Modal
            open
            centered
            transitionName={reduced ? "ant-fade" : undefined}
            width={440}
            footer={null}
            closable={state !== "confirming"}
            mask={{ closable: false }}
            onCancel={close}
            rootClassName="payment-return-root"
            className="payment-return-modal"
            styles={{ mask: { background: "rgba(0,0,0,.4)", backdropFilter: "blur(8px)" } }}
        >
            <m.div className="payment-receipt" initial={{ opacity: 0, y: reduced ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: motionDialog, ease: motionEase }}>
                <m.div className={`payment-receipt-icon is-${state}`} initial={{ scale: reduced ? 1 : 0.6 }} animate={{ scale: 1 }}>
                    <Icon aria-hidden className={state === "confirming" ? "animate-spin" : ""} />
                </m.div>
                {confetti && !reduced && (
                    <div className="payment-confetti" aria-hidden>
                        {Array.from({ length: 18 }, (_, i) => (
                            <m.i key={i} initial={{ x: 0, y: 0, opacity: 1 }} animate={{ x: Math.cos(i) * 160, y: Math.sin(i) * 120 + 80, opacity: 0, rotate: i * 45 }} transition={{ duration: motionNumber * 2 }} />
                        ))}
                    </div>
                )}
                <h2 role="status">{title}</h2>
                {!user ? (
                    <Button onClick={() => navigate(`/login?next=${encodeURIComponent(location.pathname + location.search + location.hash)}`)}>{t("checkout.loginReturn")}</Button>
                ) : (
                    <>
                        {state === "confirming" && (
                            <>
                                <p>{copy.confirmingNote}</p>
                                <ol className="payment-steps">
                                    <li>✓ {copy.paid}</li>
                                    <li aria-current="step">{copy.adding}</li>
                                    <li>{copy.done}</li>
                                </ol>
                            </>
                        )}
                        {state === "delayed" && <p>{copy.delayedNote}</p>}
                        {state === "success" && receipt && (
                            <dl className="payment-receipt-facts">
                                {receipt.creditsGranted !== undefined && (
                                    <div className="payment-granted">
                                        <dt className="sr-only">{copy.credits}</dt>
                                        <dd>
                                            +{number(receipt.creditsGranted)} {copy.credits}
                                        </dd>
                                    </div>
                                )}
                                {receipt.balanceAfter !== undefined && (
                                    <div>
                                        <dt>{copy.balance}</dt>
                                        <dd>
                                            <ReceiptBalance value={receipt.balanceAfter} previous={Math.max(0, receipt.balanceAfter - (receipt.creditsGranted || 0))} />
                                        </dd>
                                    </div>
                                )}
                                {receipt.planName && (
                                    <div>
                                        <dt>{receipt.planName}</dt>
                                        <dd>{receipt.billingCycle ? t(receipt.billingCycle === "year" ? "pricing.cycleAnnualCreator" : receipt.billingCycle === "quarter" ? "pricing.offerQuarterly" : "pricing.cycleMonthlyCreator") : null}</dd>
                                    </div>
                                )}
                                {receipt.currentPeriodEnd && (
                                    <div>
                                        <dt>{copy.renewal}</dt>
                                        <dd>{date(receipt.currentPeriodEnd)}</dd>
                                    </div>
                                )}
                            </dl>
                        )}
                        <div className="payment-receipt-actions">
                            {state === "success" && (
                                <>
                                    <Button
                                        type="primary"
                                        size="large"
                                        block
                                        onClick={() => {
                                            close();
                                            navigate(origin);
                                        }}
                                    >
                                        {origin === "/canvas" ? copy.start : copy.back}
                                    </Button>
                                    <Button
                                        type="text"
                                        block
                                        onClick={() => {
                                            close();
                                            navigate("/account/billing");
                                        }}
                                    >
                                        {copy.bill}
                                    </Button>
                                </>
                            )}
                            {state === "error" && (
                                <Button type="primary" block onClick={() => setRevision((n) => n + 1)}>
                                    {copy.retry}
                                </Button>
                            )}
                            {state === "cancelled" && (
                                <Button block onClick={close}>
                                    {copy.choose}
                                </Button>
                            )}
                            {state === "delayed" && (
                                <>
                                    <Button type="primary" block onClick={close}>
                                        {copy.okay}
                                    </Button>
                                    <Button type="text" href={`mailto:${SUPPORT_EMAIL}`} block>
                                        {copy.contact}
                                    </Button>
                                </>
                            )}
                        </div>
                    </>
                )}
            </m.div>
        </Modal>
    );
}
