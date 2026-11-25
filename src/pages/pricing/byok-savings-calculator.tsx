import { useId, useState } from "react";
import { useI18n } from "@/i18n/use-i18n";
import { formatDisplayMoney } from "@/lib/display-money";
import { RollingValue, RollingValueGroup } from "@/components/payments/rolling-value";
import { estimateByokCost } from "./byok-cost-estimate";
import { pricingUxCopy } from "./pricing-ux-copy";

export function ByokSavingsCalculator({ serviceAmountMinor, months, configured }: { serviceAmountMinor: number; months: number; configured: boolean }) {
    const { locale, number } = useI18n();
    const copy = pricingUxCopy(locale);
    const id = useId();
    const [outputs, setOutputs] = useState(150);
    const [providerRate, setProviderRate] = useState("");
    const [comparisonRate, setComparisonRate] = useState("");
    const complete = providerRate.trim() !== "" && comparisonRate.trim() !== "";
    const result = complete && configured ? estimateByokCost({ outputs, providerUnitUSD: Number(providerRate), comparisonUnitUSD: Number(comparisonRate), serviceAmountMinor, months }) : null;
    const money = (minor: number) => formatDisplayMoney(minor, "USD", locale);
    return (
        <section className="sa-byok-calculator" data-byok-calculator="true" aria-labelledby={`${id}-title`}>
            <header>
                <h2 id={`${id}-title`}>{copy.calculatorTitle}</h2>
                <p id={`${id}-note`}>{copy.calculatorNote}</p>
            </header>
            <div className="sa-byok-calc-controls">
                <div className="sa-byok-volume">
                    <label htmlFor={`${id}-volume`}>
                        {copy.volume}
                        <strong>
                            <RollingValue value={number(outputs)} />
                        </strong>
                    </label>
                    <input id={`${id}-volume`} type="range" min={0} max={1500} step={10} value={outputs} onChange={(event) => setOutputs(Number(event.target.value))} />
                    <div>
                        {[50, 150, 500, 1200].map((quantity) => (
                            <button key={quantity} type="button" aria-pressed={outputs === quantity} onClick={() => setOutputs(quantity)}>
                                {number(quantity)}
                            </button>
                        ))}
                    </div>
                </div>
                <label>
                    {copy.providerRate}
                    <input
                        data-provider-rate="true"
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={1000000}
                        step="any"
                        value={providerRate}
                        placeholder={copy.rateHint}
                        aria-describedby={`${id}-note`}
                        onChange={(event) => setProviderRate(event.target.value)}
                    />
                </label>
                <label>
                    {copy.comparisonRate}
                    <input
                        data-comparison-rate="true"
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={1000000}
                        step="any"
                        value={comparisonRate}
                        placeholder={copy.rateHint}
                        aria-describedby={`${id}-note`}
                        onChange={(event) => setComparisonRate(event.target.value)}
                    />
                </label>
            </div>
            <p className="sa-byok-calc-note">{copy.currencyNote}</p>
            {!configured ? <p className="sa-byok-calc-note">{copy.servicePreview}</p> : null}
            {result ? (
                <div aria-live="polite" aria-atomic="true">
                    <div className="sa-byok-comparison">
                        <RollingValueGroup>
                            <h3>{copy.comparisonCost}</h3>
                            <strong>
                                <RollingValue value={money(result.comparisonMinor)} />
                            </strong>
                        </RollingValueGroup>
                        <RollingValueGroup>
                            <h3>{copy.byokTotal}</h3>
                            <strong>
                                <RollingValue value={money(result.totalMinor)} />
                            </strong>
                            <dl>
                                <div>
                                    <dt>{copy.providerCost}</dt>
                                    <dd>{money(result.providerMinor)}</dd>
                                </div>
                                <div>
                                    <dt>{copy.serviceMonthly}</dt>
                                    <dd>{money(result.monthlyServiceMinor)}</dd>
                                </div>
                            </dl>
                        </RollingValueGroup>
                    </div>
                    <div className="sa-byok-difference" data-difference-minor={result.differenceMinor}>
                        <h3>{copy.difference}</h3>
                        <strong>
                            <RollingValue value={money(result.differenceMinor)} />
                        </strong>
                        {result.differenceMinor < 0 ? <p>{copy.moreExpensive}</p> : null}
                    </div>
                </div>
            ) : (
                <p role={complete ? "alert" : "status"} className="sa-byok-empty-estimate">
                    {complete ? copy.invalidRates : copy.fillRates}
                </p>
            )}
        </section>
    );
}
