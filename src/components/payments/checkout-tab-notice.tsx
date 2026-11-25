import { useMemo } from "react";
import { reopenCheckout, useCheckoutTabStore } from "@/lib/checkout-tab";
import { getPaymentI18n } from "./payment-i18n";
import "./checkout-tab-notice.css";

/** Shown on the page that opened a hosted checkout in a new tab: the way back is simply this page. */
export function CheckoutTabNotice({ locale }: { locale?: string }) {
    const url = useCheckoutTabStore((s) => s.url);
    const dismiss = useCheckoutTabStore((s) => s.dismiss);
    const copy = useMemo(() => getPaymentI18n(locale).checkout, [locale]);
    if (!url) return null;
    return (
        <div className="dc-checkout-tab-notice" role="status" aria-live="polite">
            <div className="dc-checkout-tab-notice-text">
                <strong>{copy.openedTitle}</strong>
                <span>{copy.openedBody}</span>
            </div>
            <div className="dc-checkout-tab-notice-actions">
                <button type="button" className="dc-checkout-tab-notice-primary" onClick={() => reopenCheckout(url)}>
                    {copy.reopen}
                </button>
                <button type="button" className="dc-checkout-tab-notice-secondary" onClick={dismiss}>
                    {copy.dismiss}
                </button>
            </div>
        </div>
    );
}
