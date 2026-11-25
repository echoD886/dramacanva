export type ByokCostInput = { outputs: number; providerUnitUSD: number; comparisonUnitUSD: number; serviceAmountMinor: number; months: number };

/** User-supplied assumptions, not a provider quote or checkout amount.
 * Negative savings remain visible; the calculator never promises a profit. */
export function estimateByokCost(input: ByokCostInput) {
    const { outputs, providerUnitUSD, comparisonUnitUSD, serviceAmountMinor, months } = input;
    if (
        !Number.isSafeInteger(outputs) ||
        outputs < 0 ||
        outputs > 1_000_000 ||
        !Number.isFinite(providerUnitUSD) ||
        providerUnitUSD < 0 ||
        providerUnitUSD > 1_000_000 ||
        !Number.isFinite(comparisonUnitUSD) ||
        comparisonUnitUSD < 0 ||
        comparisonUnitUSD > 1_000_000 ||
        !Number.isSafeInteger(serviceAmountMinor) ||
        serviceAmountMinor < 0 ||
        !Number.isSafeInteger(months) ||
        months < 1 ||
        months > 120
    )
        return null;
    const comparisonMinor = Math.round(outputs * comparisonUnitUSD * 100);
    const providerMinor = Math.round(outputs * providerUnitUSD * 100);
    const monthlyServiceMinor = Math.round(serviceAmountMinor / months);
    const totalMinor = providerMinor + monthlyServiceMinor;
    if (![comparisonMinor, providerMinor, monthlyServiceMinor, totalMinor].every(Number.isSafeInteger)) return null;
    return { comparisonMinor, providerMinor, monthlyServiceMinor, totalMinor, differenceMinor: comparisonMinor - totalMinor };
}
