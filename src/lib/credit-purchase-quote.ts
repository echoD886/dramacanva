import type { CustomCreditPack, PaymentProduct } from "@/services/api/wallet";
import { customCreditPreview } from "./payment-currency";

/** Prefer an existing, no-more-expensive pack for exactly the requested credit count.
 * This selects a real SKU; it never invents a discount or changes checkout amounts. */
export function quoteCreditPurchase(config: CustomCreditPack, credits: number | null, products: PaymentProduct[]) {
    const preview = customCreditPreview(config, credits);
    if (!preview) return { preview: null, fixedProduct: null };
    const fixedProduct = products.filter((product) => product.enabled
        && (product.kind || "credits") === "credits"
        && product.currency.trim().toUpperCase() === config.currency.trim().toUpperCase()
        && product.creditsMicrocredits === preview.creditsMicrocredits
        && Number.isSafeInteger(product.amountMinor) && product.amountMinor > 0
        && product.amountMinor <= preview.payableAmountMinor)
        .sort((left, right) => left.amountMinor - right.amountMinor)[0];
    if (!fixedProduct) return { preview, fixedProduct: null };
    const original = fixedProduct.originalAmountMinor;
    const baseAmountMinor = original && Number.isSafeInteger(original) && original > fixedProduct.amountMinor ? original : fixedProduct.amountMinor;
    const discountAmountMinor = baseAmountMinor - fixedProduct.amountMinor;
    return {
        fixedProduct,
        preview: {
            ...preview, baseAmountMinor, discountAmountMinor,
            payableAmountMinor: fixedProduct.amountMinor,
            discountBasisPoints: Math.round(discountAmountMinor / baseAmountMinor * 10_000),
        },
    };
}
