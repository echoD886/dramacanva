import type { ComponentProps } from "react";
import { Coins } from "lucide-react";
import { resolveAppLocale } from "@/i18n/app-locale";
import { formatCreditQuantity } from "@/lib/display-format";

export { requestCreditCost } from "@/lib/model-pricing";

export function CreditSymbol({ className, ...props }: ComponentProps<"span">) {
    return (
        <span {...props} className={`inline-flex items-center justify-center ${className || ""}`}>
            <Coins className="size-[1em]" strokeWidth={2.2} />
        </span>
    );
}

export function formatCredits(value: number, maximumFractionDigits = 2) {
    return formatCreditQuantity(value / 1_000_000, resolveAppLocale(), maximumFractionDigits);
}
