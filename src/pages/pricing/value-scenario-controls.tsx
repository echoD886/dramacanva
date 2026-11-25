import { useI18n } from "@/i18n/use-i18n";
import { valueModels, type ValueScenario } from "./generation-value";

export function ValueScenarioControls({ value, onChange }: { value: ValueScenario; onChange: (next: ValueScenario) => void }) {
    const { t } = useI18n();
    const model = valueModels.find((entry) => entry.key === value.model)!;
    return <section className="sa-value-controls" aria-label={t("pricing.valueTitle")}>
        <div><h2>{t("pricing.valueTitle")}</h2><p>{t("pricing.modelNamesNote")}</p></div>
        <div className="sa-value-selectors">
            <label>{t("pricing.valueModel")}<select value={value.model} onChange={(event) => {
                const selected = valueModels.find((entry) => entry.key === event.target.value)!;
                onChange({ ...value, model: selected.key, spec: selected.tiers.some((tier) => tier.selectorValue === value.spec) ? value.spec : selected.tiers[0].selectorValue });
            }}>{valueModels.map((entry) => <option key={entry.key} value={entry.key}>{entry.name}</option>)}</select></label>
            <label>{t("pricing.valueSpec")}<select value={value.spec} onChange={(event) => onChange({ ...value, spec: event.target.value })}>{model.tiers.map((tier) => <option key={tier.selectorValue} value={tier.selectorValue}>{tier.selectorValue.toUpperCase()}</option>)}</select></label>
            {model.kind === "video" ? <label>{t("pricing.valueDuration")}<select value={value.seconds} onChange={(event) => onChange({ ...value, seconds: Number(event.target.value) })}>{[5,10,15].map((seconds) => <option key={seconds} value={seconds}>{t("pricing.valuePerVideo", { seconds })}</option>)}</select></label> : null}
        </div>
        <p className="sa-value-caveat">{t("pricing.valueNote")}</p>
    </section>;
}
