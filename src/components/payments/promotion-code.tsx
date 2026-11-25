import { useId } from "react";
import { useI18n } from "@/i18n/use-i18n";

export function PromotionCode({ value, onChange }: { value: string; onChange: (value: string) => void }) {
    const { t } = useI18n();
    const id = useId();
    return (
        <details open={value ? true : undefined}>
            <summary>{t("pricing.promoLink")}</summary>
            <label htmlFor={id}>{t("pricing.promoLabel")}</label> <input id={id} type="text" autoComplete="off" maxLength={200} value={value} onChange={(event) => onChange(event.target.value)} />
            <p>{t("pricing.promoHint")}</p>
        </details>
    );
}
