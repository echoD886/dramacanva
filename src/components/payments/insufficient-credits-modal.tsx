import { Button, Modal, Segmented, Alert } from "antd";
import { useState } from "react";
import { useReducedMotion } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { useI18n } from "@/i18n/use-i18n";
import { useUserStore } from "@/stores/use-user-store";
import { getPaymentOptions, createStripeCheckout } from "@/services/api/wallet";
import { paymentCopy } from "@/lib/payment-ux";
import { goToCheckout } from "@/lib/checkout-tab";
import { formatPaymentAmount, formatPaymentUnitPrice } from "@/lib/payment-money";
import { defaultAllowance, resolveMembershipOffer, type OfferPlan } from "@/pages/pricing/membership-offers";
import "./insufficient-credits.css";

export function InsufficientCreditsModal({ open, onClose, need, balance }: { open: boolean; onClose: () => void; need?: number; balance?: number }) {
    const { locale, t, number } = useI18n();
    const copy = paymentCopy(locale);
    const reduced = useReducedMotion();
    const user = useUserStore((s) => s.user);
    const query = useQuery({ queryKey: ["payment-options", user?.id], queryFn: getPaymentOptions, enabled: open });
    const [tab, setTab] = useState("packs");
    const [selected, setSelected] = useState<string>();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(false);
    const navigate = useNavigate();
    const packs = (query.data?.products || []).filter((p) => p.kind === "credits" && p.enabled).sort((a, b) => a.creditsMicrocredits - b.creditsMicrocredits);
    const knownShortfall = need !== undefined && balance !== undefined;
    const recommended = knownShortfall ? packs.find((p) => p.creditsMicrocredits / 1e6 >= need - balance) || packs.at(-1) : undefined;
    const chosen = packs.find((p) => p.sku === selected) || recommended || packs[0];
    const pay = async () => {
        if (!chosen || busy) return;
        sessionStorage.setItem("checkout-origin", location.pathname + location.search + location.hash);
        if (!user) {
            navigate(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
            return;
        }
        setBusy(true);
        setError(false);
        try {
            const result = await createStripeCheckout(chosen.sku, crypto.randomUUID(), { locale });
            goToCheckout(result.url);
        } catch {
            setError(true);
            setBusy(false);
        }
    };
    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            width={520}
            centered
            transitionName={reduced ? "ant-fade" : undefined}
            title={knownShortfall ? copy.short.replace("{n}", number(Math.max(0, need - balance))) : copy.packs}
            className="insufficient-credits-modal"
        >
            {knownShortfall && <p>{copy.need.replace("{need}", number(need)).replace("{balance}", number(balance))}</p>}
            {knownShortfall && <progress className="credit-shortfall-progress" max={Math.max(1, need)} value={Math.min(balance, need)} />}
            <Segmented
                block
                value={tab}
                onChange={setTab}
                options={[
                    { label: copy.packs, value: "packs" },
                    { label: copy.upgrade, value: "membership" },
                ]}
            />
            {tab === "packs" ? (
                <div className="credit-shortfall-packs">
                    {packs.map((p) => (
                        <button type="button" key={p.sku} aria-pressed={chosen?.sku === p.sku} onClick={() => setSelected(p.sku)}>
                            <small>{recommended?.sku === p.sku ? copy.enough : copy.credits}</small>
                            <strong>{number(p.creditsMicrocredits / 1e6)}</strong>
                            <span>{formatPaymentAmount(p.amountMinor, p.currency, locale)}</span>
                            <small>
                                {formatPaymentUnitPrice(p.amountMinor, p.currency, p.creditsMicrocredits / 1e6, locale, 4)} / {copy.perCredit}
                            </small>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="credit-shortfall-members">
                    {["standard", "advanced", "premium", "luxury", "supreme"].map((key) => (
                        <Button
                            key={key}
                            block
                            onClick={() => {
                                sessionStorage.setItem("checkout-origin", location.pathname + location.search + location.hash);
                                navigate(`/pricing?plan=${key}`);
                            }}
                        >
                            {t(`pricing.plan${key[0].toUpperCase() + key.slice(1)}` as Parameters<typeof t>[0])}
                            {" · "}
                            {resolveMembershipOffer("creator", key as OfferPlan, "monthly", defaultAllowance[key as OfferPlan], locale, query.data?.products || []).price}
                            {" · "}
                            {number(defaultAllowance[key as OfferPlan])} {copy.credits}
                        </Button>
                    ))}
                </div>
            )}
            {query.isError && <Alert type="warning" title={copy.error} action={<Button onClick={() => void query.refetch()}>{copy.retry}</Button>} />}
            {error && <Alert type="warning" title={copy.error} />}
            {tab === "packs" && (
                <Button block size="large" type="primary" loading={busy} disabled={!chosen || !query.data?.checkoutEnabled} onClick={() => void pay()}>
                    {copy.pay.replace("{price}", chosen ? formatPaymentAmount(chosen.amountMinor, chosen.currency, locale) : "")}
                </Button>
            )}
            <p className="credit-shortfall-note">{copy.continue}</p>
        </Modal>
    );
}
