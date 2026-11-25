import { useI18n } from "@/i18n/use-i18n";

// Only tell the creator how many credits they are short. Model choice stays theirs;
// the composer never nudges them toward a different model.
export function GenerationBudgetHint({ credits, balance }: { credits: number | null; balance: number | null }) {
    const { t, number } = useI18n();
    const missing = credits !== null && balance !== null ? Math.max(0, credits - balance) : 0;
    if (!missing) return null;
    return (
        <div className="flex max-w-64 flex-col gap-1 text-xs" role="status">
            <span>{t("modelPickerPrice.shortfall", { amount: number(missing, { maximumFractionDigits: 2 }) })}</span>
        </div>
    );
}
