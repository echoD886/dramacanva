import { useMemo } from "react";
import { ShieldCheck } from "lucide-react";
import { PAYMENT_ICON_SVG } from "@/assets/payment-icons";
import type { PaymentProviderAvailability } from "@/services/api/wallet";
import { getPaymentI18n } from "./payment-i18n";
import { expandMethods } from "./payment-provider-popover";
import "./payment-methods-section.css";

const CARD_METHODS = new Set(["visa", "mastercard", "amex", "unionpay", "jcb"]);
const WALLET_METHODS = new Set(["apple_pay", "applepay", "google_pay", "googlepay", "paypal", "link"]);
const LOCAL_METHODS = new Set(["alipay", "wechat_pay", "wechatpay", "pix"]);

/**
 * Extracts and deduplicates all payment methods supported by any ready provider.
 * "card" is expanded into "visa" and "mastercard" (other networks must be listed explicitly once verified).
 */
export function getUnionReadyMethods(paymentProviders: PaymentProviderAvailability[]): string[] {
    const ready = (paymentProviders || []).filter((p) => p.ready);
    const seen = new Set<string>();
    const result: string[] = [];

    for (const provider of ready) {
        const expanded = expandMethods(provider.methods || []);
        for (const m of expanded) {
            if (!seen.has(m)) {
                seen.add(m);
                result.push(m);
            }
        }
    }

    return result;
}

export function categorizeMethods(methods: string[]) {
    const cards: string[] = [];
    const wallets: string[] = [];
    const local: string[] = [];

    for (const m of methods) {
        if (CARD_METHODS.has(m)) {
            cards.push(m);
        } else if (WALLET_METHODS.has(m)) {
            wallets.push(m);
        } else if (LOCAL_METHODS.has(m)) {
            local.push(m);
        } else {
            // Default any unclassified method to local
            local.push(m);
        }
    }

    return { cards, wallets, local };
}

export function getPreferredMiniMethods(unionMethods: string[], locale?: string): string[] {
    if (!unionMethods || unionMethods.length === 0) return [];
    const unionSet = new Set(unionMethods);

    let priority: string[];
    if (locale?.startsWith("zh-CN")) {
        priority = ["alipay", "wechat_pay", "visa", "mastercard", "apple_pay"];
    } else if (locale?.startsWith("zh-TW") || locale?.startsWith("zh-HK")) {
        priority = ["visa", "mastercard", "apple_pay", "alipay", "wechat_pay"];
    } else if (locale?.startsWith("pt-BR") || locale?.startsWith("pt")) {
        priority = ["pix", "visa", "mastercard", "paypal", "google_pay"];
    } else {
        priority = ["visa", "mastercard", "apple_pay", "google_pay", "paypal"];
    }

    const selected: string[] = [];
    for (const p of priority) {
        if (unionSet.has(p)) {
            selected.push(p);
        }
    }

    // Fill with remaining methods from union if under 5
    for (const m of unionMethods) {
        if (selected.length >= 5) break;
        if (!selected.includes(m)) {
            selected.push(m);
        }
    }

    return selected.slice(0, 5);
}

/**
 * Task B: Pricing Page "Supported Payment Methods" Section
 * Dynamic adaptive wall displaying union of ready providers' payment methods.
 * <= 4 methods: flat un-grouped layout
 * >= 5 methods: grouped into 3 categories (cards, wallets, local)
 * Empty union: renders nothing (returns null)
 */
export function PaymentMethodsSection({ paymentProviders = [], locale }: { paymentProviders: PaymentProviderAvailability[]; locale?: string }) {
    const i18n = useMemo(() => getPaymentI18n(locale), [locale]);
    const methods = useMemo(() => getUnionReadyMethods(paymentProviders), [paymentProviders]);

    if (methods.length === 0) {
        return null;
    }

    const shouldGroup = methods.length >= 5;
    const groups = categorizeMethods(methods);

    return (
        <section className="dramacanvas-payment-methods-section" aria-label={i18n.paymentMethods.title}>
            <div className="dramacanvas-methods-header">
                <h3>{i18n.paymentMethods.title}</h3>
                <p>{i18n.paymentMethods.subtitle}</p>
            </div>

            <div className="dramacanvas-methods-wall">
                {shouldGroup ? (
                    <div className="dramacanvas-methods-grouped">
                        {groups.cards.length > 0 ? (
                            <div className="dramacanvas-methods-group">
                                <div className="dramacanvas-methods-group-title">{i18n.paymentMethods.groups.cards}</div>
                                <div className="dramacanvas-methods-group-badges">
                                    {groups.cards.map((m) => (
                                        <MethodBadge key={m} method={m} name={i18n.paymentMethods.names[m] || m} />
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        {groups.wallets.length > 0 ? (
                            <div className="dramacanvas-methods-group">
                                <div className="dramacanvas-methods-group-title">{i18n.paymentMethods.groups.wallets}</div>
                                <div className="dramacanvas-methods-group-badges">
                                    {groups.wallets.map((m) => (
                                        <MethodBadge key={m} method={m} name={i18n.paymentMethods.names[m] || m} />
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        {groups.local.length > 0 ? (
                            <div className="dramacanvas-methods-group">
                                <div className="dramacanvas-methods-group-title">{i18n.paymentMethods.groups.local}</div>
                                <div className="dramacanvas-methods-group-badges">
                                    {groups.local.map((m) => (
                                        <MethodBadge key={m} method={m} name={i18n.paymentMethods.names[m] || m} />
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </div>
                ) : (
                    <div className="dramacanvas-methods-flat">
                        {methods.map((m) => (
                            <MethodBadge key={m} method={m} name={i18n.paymentMethods.names[m] || m} />
                        ))}
                    </div>
                )}
            </div>

            <div className="dramacanvas-methods-security">
                <ShieldCheck size={14} aria-hidden />
                <span>{i18n.paymentMethods.securityNotice}</span>
            </div>
        </section>
    );
}

function MethodBadge({ method, name }: { method: string; name: string }) {
    const svg = PAYMENT_ICON_SVG[method];
    return (
        <div className="dramacanvas-method-badge">
            {svg ? <span className="dramacanvas-method-logo" role="img" aria-label={name} dangerouslySetInnerHTML={{ __html: svg }} /> : null}
            <span className="dramacanvas-method-name">{name}</span>
        </div>
    );
}

/**
 * Mini Icon Row (task B, displayed under "Buy" buttons).
 * Up to 5 representative payment method chips from ready providers.
 * If union is empty, renders null.
 */
export function PaymentMethodsMiniRow({ paymentProviders = [], locale }: { paymentProviders: PaymentProviderAvailability[]; locale?: string }) {
    const i18n = useMemo(() => getPaymentI18n(locale), [locale]);
    const unionMethods = useMemo(() => getUnionReadyMethods(paymentProviders), [paymentProviders]);
    const miniMethods = useMemo(() => getPreferredMiniMethods(unionMethods, locale), [unionMethods, locale]);

    if (miniMethods.length === 0) {
        return null;
    }

    const tooltip = i18n.paymentMethods.ctaMiniLabel;

    return (
        <div className="dramacanvas-methods-mini-row" title={tooltip} aria-label={tooltip} role="note">
            {miniMethods.map((m) => {
                const svg = PAYMENT_ICON_SVG[m];
                const name = i18n.paymentMethods.names[m] || m;
                if (svg) {
                    return <span key={m} className="dramacanvas-mini-icon-chip" title={name} role="img" aria-label={name} dangerouslySetInnerHTML={{ __html: svg }} />;
                }
                return (
                    <span key={m} className="dramacanvas-mini-icon-chip dramacanvas-mini-text-chip" title={name}>
                        {name}
                    </span>
                );
            })}
        </div>
    );
}
