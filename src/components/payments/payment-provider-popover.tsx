import { reserveCheckoutTab } from "@/lib/checkout-tab";
import { useEffect, useLayoutEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { PAYMENT_ICON_SVG } from "@/assets/payment-icons";
import { formatPaymentAmount } from "@/lib/payment-money";
import type { PaymentProviderAvailability, PaymentProviderId } from "@/services/api/wallet";
import { getPaymentI18n } from "./payment-i18n";
import "./payment-provider-popover.css";

export type PaymentProductType = "subscriptions" | "credits" | "customCredits" | "teams" | "byok";

const LAST_PROVIDER_STORAGE_PREFIX = "dramacanvas_last_provider_";

export function getLastUsedProvider(userId?: string): PaymentProviderId | null {
    if (typeof window === "undefined" || !window.localStorage) return null;
    try {
        const key = `${LAST_PROVIDER_STORAGE_PREFIX}${userId || "guest"}`;
        const val = window.localStorage.getItem(key);
        if (val === "waffo" || val === "creem") return val;
        return null;
    } catch {
        return null;
    }
}

export function setLastUsedProvider(providerId: PaymentProviderId, userId?: string): void {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
        const key = `${LAST_PROVIDER_STORAGE_PREFIX}${userId || "guest"}`;
        window.localStorage.setItem(key, providerId);
    } catch {
        /* storage may be quota restricted or blocked in private mode */
    }
}

/**
 * Filter providers that are both ready and support the requested product type.
 */
export function filterSupportedProviders(providers: PaymentProviderAvailability[], itemType: PaymentProductType): PaymentProviderAvailability[] {
    return (providers || []).filter((p) => p.ready && Boolean(p.supports?.[itemType]));
}

/**
 * Expands "card" into visa, mastercard, and amex.
 */
export function expandMethods(methods: string[]): string[] {
    const result: string[] = [];
    const seen = new Set<string>();
    for (const m of methods || []) {
        if (m === "card") {
            // Only the networks verified on our checkouts; list "amex"/"unionpay"/"jcb" explicitly once confirmed.
            for (const cardBrand of ["visa", "mastercard"]) {
                if (!seen.has(cardBrand)) {
                    seen.add(cardBrand);
                    result.push(cardBrand);
                }
            }
        } else if (!seen.has(m)) {
            seen.add(m);
            result.push(m);
        }
    }
    return result;
}

export function providerDisplayName(id: PaymentProviderId): string {
    if (id === "creem") return "Creem";
    if (id === "waffo") return "Waffo";
    return id;
}

export interface PaymentProviderPopoverProps {
    open: boolean;
    onClose: () => void;
    anchorElement: HTMLElement | null;
    itemType: PaymentProductType;
    itemTitle: string;
    amountMinor: number;
    currency?: string;
    paymentProviders: PaymentProviderAvailability[];
    userId?: string;
    locale?: string;
    onConfirm: (provider: PaymentProviderId) => Promise<void> | void;
    isSubmitting?: boolean;
    submitError?: string | null;
    onRetry?: () => void;
}

export function PaymentProviderPopover({
    open,
    onClose,
    anchorElement,
    itemType,
    itemTitle,
    amountMinor,
    currency = "USD",
    paymentProviders = [],
    userId,
    locale,
    onConfirm,
    isSubmitting = false,
    submitError = null,
    onRetry,
}: PaymentProviderPopoverProps) {
    const popoverRef = useRef<HTMLDivElement>(null);
    const radioGroupRef = useRef<HTMLDivElement>(null);
    const titleId = useId();
    const radiogroupId = useId();

    const i18n = useMemo(() => getPaymentI18n(locale), [locale]);
    const lastUsed = useMemo(() => getLastUsedProvider(userId), [userId, open]);

    const availableProviders = useMemo(() => filterSupportedProviders(paymentProviders, itemType), [paymentProviders, itemType]);

    // Initial pre-selection rule:
    // If last-used provider is available for this product, pre-select it.
    // Otherwise select the first available provider.
    const [selectedProvider, setSelectedProvider] = useState<PaymentProviderId>(() => {
        if (lastUsed && availableProviders.some((p) => p.id === lastUsed)) {
            return lastUsed;
        }
        return availableProviders[0]?.id || paymentProviders[0]?.id || "waffo";
    });

    useEffect(() => {
        if (!open) return;
        if (lastUsed && availableProviders.some((p) => p.id === lastUsed)) {
            setSelectedProvider(lastUsed);
        } else if (availableProviders.length > 0) {
            setSelectedProvider(availableProviders[0].id);
        } else if (paymentProviders.length > 0) {
            setSelectedProvider(paymentProviders[0].id);
        }
    }, [open, lastUsed, availableProviders, paymentProviders]);

    // Positioning calculations on desktop
    const [positionStyle, setPositionStyle] = useState<React.CSSProperties>({});
    const [isFlipped, setIsFlipped] = useState(false);

    useLayoutEffect(() => {
        if (!open || !anchorElement) return;

        const updatePosition = () => {
            if (window.innerWidth < 768) {
                // Mobile sheet mode
                setPositionStyle({});
                setIsFlipped(false);
                return;
            }

            const rect = anchorElement.getBoundingClientRect();
            const popoverWidth = 360;
            const popoverHeight = popoverRef.current?.offsetHeight || 280;

            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            const shouldFlip = spaceBelow < 280 && spaceAbove > spaceBelow;

            let top = shouldFlip ? rect.top - popoverHeight - 8 : rect.bottom + 8;
            if (top < 8) top = 8;

            const idealLeft = rect.left + rect.width / 2 - popoverWidth / 2;
            const left = Math.max(16, Math.min(window.innerWidth - popoverWidth - 16, idealLeft));

            setIsFlipped(shouldFlip);
            setPositionStyle({
                position: "fixed",
                top: `${Math.round(top)}px`,
                left: `${Math.round(left)}px`,
                width: `${popoverWidth}px`,
            });
        };

        updatePosition();
        window.addEventListener("resize", updatePosition);
        return () => window.removeEventListener("resize", updatePosition);
    }, [open, anchorElement, paymentProviders]);

    // Focus management & keyboard navigation
    useEffect(() => {
        if (!open) return;

        // Focus the selected radio when opening
        const timer = setTimeout(() => {
            const selectedRadio = popoverRef.current?.querySelector<HTMLElement>(`[role="radio"][data-provider="${selectedProvider}"]`);
            selectedRadio?.focus();
        }, 30);

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                if (!isSubmitting) {
                    onClose();
                    anchorElement?.focus();
                }
                return;
            }

            if (["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"].includes(event.key)) {
                // Navigate among available (enabled) providers
                if (availableProviders.length <= 1) return;
                event.preventDefault();

                const currentIndex = availableProviders.findIndex((p) => p.id === selectedProvider);
                let nextIndex = currentIndex;

                if (event.key === "ArrowDown" || event.key === "ArrowRight") {
                    nextIndex = (currentIndex + 1) % availableProviders.length;
                } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
                    nextIndex = (currentIndex - 1 + availableProviders.length) % availableProviders.length;
                }

                const nextProvider = availableProviders[nextIndex]?.id;
                if (nextProvider) {
                    setSelectedProvider(nextProvider);
                    const nextEl = popoverRef.current?.querySelector<HTMLElement>(`[role="radio"][data-provider="${nextProvider}"]`);
                    nextEl?.focus();
                }
            }
        };

        const handlePointerDown = (event: MouseEvent | TouchEvent) => {
            const target = event.target as Node;
            if (popoverRef.current && !popoverRef.current.contains(target) && anchorElement && !anchorElement.contains(target)) {
                if (!isSubmitting) {
                    onClose();
                }
            }
        };

        const handleScroll = () => {
            if (!isSubmitting) {
                onClose();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        document.addEventListener("pointerdown", handlePointerDown);
        window.addEventListener("scroll", handleScroll, { passive: true });

        return () => {
            clearTimeout(timer);
            document.removeEventListener("keydown", handleKeyDown);
            document.removeEventListener("pointerdown", handlePointerDown);
            window.removeEventListener("scroll", handleScroll);
        };
    }, [open, isSubmitting, selectedProvider, availableProviders, onClose, anchorElement]);

    if (!open) return null;

    const formattedAmount = formatPaymentAmount(amountMinor, currency, locale);

    const handleContinue = () => {
        if (isSubmitting) return;
        setLastUsedProvider(selectedProvider, userId);
        // Must run inside the click (before any await) or the browser blocks the new tab.
        reserveCheckoutTab(i18n.checkout.openingTab);
        void onConfirm(selectedProvider);
    };

    const handleRetry = () => {
        if (isSubmitting) return;
        if (onRetry) {
            onRetry();
        } else {
            handleContinue();
        }
    };

    const content = (
        <div className="dramacanvas-popover-portal">
            {/* Mobile backdrop */}
            <div
                className="dramacanvas-popover-backdrop"
                aria-hidden="true"
                onClick={() => {
                    if (!isSubmitting) onClose();
                }}
            />

            <div ref={popoverRef} className={`dramacanvas-popover-surface ${isFlipped ? "is-flipped" : ""}`} style={positionStyle} role="dialog" aria-modal="false" aria-labelledby={titleId}>
                {/* Drag Handle (Mobile Sheet) */}
                <div className="dramacanvas-sheet-handle" aria-hidden="true" />

                {/* Header: Item Title · Amount [X] */}
                <div className="dramacanvas-popover-header">
                    <span id={titleId} className="dramacanvas-popover-item-info">
                        {itemTitle} · {formattedAmount}
                    </span>
                    <button
                        type="button"
                        className="dramacanvas-popover-close"
                        aria-label={i18n.checkout.closeAria}
                        disabled={isSubmitting}
                        onClick={() => {
                            onClose();
                            anchorElement?.focus();
                        }}
                    >
                        <X size={16} aria-hidden />
                    </button>
                </div>

                {/* Radiogroup: List of Providers */}
                <div ref={radioGroupRef} className="dramacanvas-provider-radiogroup" role="radiogroup" id={radiogroupId} aria-label={i18n.checkout.choose}>
                    {paymentProviders.map((provider) => {
                        const isSupported = Boolean(provider.supports?.[itemType]);
                        const isReady = provider.ready;
                        const isAvailable = isReady && isSupported;
                        const isSelected = selectedProvider === provider.id;
                        const isPrevious = lastUsed === provider.id;
                        const methodsList = expandMethods(provider.methods);

                        let disabledReason = "";
                        if (!isReady) {
                            disabledReason = i18n.checkout.unavailable;
                        } else if (!isSupported) {
                            disabledReason = i18n.checkout.notSupported;
                        }

                        return (
                            <div
                                key={provider.id}
                                role="radio"
                                data-provider={provider.id}
                                aria-checked={isSelected}
                                aria-disabled={!isAvailable}
                                tabIndex={isSelected && isAvailable ? 0 : -1}
                                className={["dramacanvas-provider-option", isSelected && "is-selected", !isAvailable && "is-disabled"].filter(Boolean).join(" ")}
                                onClick={() => {
                                    if (isAvailable && !isSubmitting) {
                                        setSelectedProvider(provider.id);
                                    }
                                }}
                            >
                                <div className="dramacanvas-provider-row-top">
                                    <div className="dramacanvas-provider-row-left">
                                        <div className="dramacanvas-radio-indicator" aria-hidden="true">
                                            {isSelected ? <div className="dramacanvas-radio-dot" /> : null}
                                        </div>
                                        <span className="dramacanvas-provider-name">{providerDisplayName(provider.id)}</span>
                                    </div>
                                    {isPrevious ? <span className="dramacanvas-tag-lastused">{i18n.checkout.lastUsed}</span> : null}
                                </div>

                                {isAvailable ? (
                                    <>
                                        <div className="dramacanvas-provider-methods">
                                            {methodsList.map((m) => {
                                                const svg = PAYMENT_ICON_SVG[m];
                                                const name = i18n.paymentMethods.names[m] || m;
                                                if (svg) {
                                                    return <span key={m} className="dramacanvas-provider-icon-badge" title={name} role="img" aria-label={name} dangerouslySetInnerHTML={{ __html: svg }} />;
                                                }
                                                return (
                                                    <span key={m} className="dramacanvas-provider-text-badge">
                                                        {name}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                        {/* Tax-exclusive providers add sales tax/VAT on their checkout page; say so before the user goes there. */}
                                        {provider.taxAddedAtCheckout ? <div className="dramacanvas-provider-mor-hint">{i18n.checkout.taxAtCheckout}</div> : null}
                                    </>
                                ) : (
                                    <div className="dramacanvas-provider-disabled-reason">{disabledReason}</div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Primary Action Button & Error State */}
                <div className="dramacanvas-popover-action-area">
                    {submitError ? (
                        <p className="dramacanvas-popover-error" role="alert">
                            {submitError}
                        </p>
                    ) : null}

                    {submitError ? (
                        <button type="button" className="dramacanvas-popover-cta" disabled={isSubmitting} onClick={handleRetry}>
                            {isSubmitting ? (
                                <>
                                    <span className="dramacanvas-spinner" aria-hidden="true" />
                                    <span>{i18n.checkout.redirecting}</span>
                                </>
                            ) : (
                                <span>{i18n.checkout.retry}</span>
                            )}
                        </button>
                    ) : (
                        <button type="button" className="dramacanvas-popover-cta" disabled={isSubmitting || availableProviders.length === 0} onClick={handleContinue}>
                            {isSubmitting ? (
                                <>
                                    <span className="dramacanvas-spinner" aria-hidden="true" />
                                    <span>{i18n.checkout.redirecting}</span>
                                </>
                            ) : (
                                <span>
                                    {i18n.checkout.continue} · {formattedAmount}
                                </span>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(content, document.body);
}
