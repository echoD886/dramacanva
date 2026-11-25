export type SupplierCostAmount = { currency: string; amountMicros: number; amountMicrosExact?: string; requests: number };
export type SupplierPayerCosts = {
    payer: "platform" | "user" | "unknown";
    amounts: SupplierCostAmount[];
    costedRequests: number;
    uncostedRequests: number;
    snapshotCostRequests?: number;
    legacyCostRequests?: number;
};

// Absence of payer evidence must never fall back to the all-channel total.
export function platformSupplierCost(groups?: SupplierPayerCosts[]) {
    return groups?.find((group) => group.payer === "platform");
}

export function formatSupplierCost(amount: SupplierCostAmount, locale: string) {
    const value = amount.amountMicrosExact ?? (Number.isSafeInteger(amount.amountMicros) ? String(amount.amountMicros) : "");
    if (!/^\d+$/.test(value) || !/^[A-Z]{3}$/.test(amount.currency) || ["MIXED", "UNKNOWN"].includes(amount.currency)) return "—";
    const micros = BigInt(value);
    const unit = BigInt(1_000_000);
    const fraction = (micros % unit).toString().padStart(6, "0").replace(/0+$/, "").padEnd(2, "0");
    const separator = new Intl.NumberFormat(locale).formatToParts(1.1).find((part) => part.type === "decimal")?.value ?? ".";
    return `${amount.currency} ${new Intl.NumberFormat(locale).format(micros / unit)}${separator}${fraction}`;
}

// Compare only the known platform spend, keeping each currency independent.
export function largestChannelCostChanges(current: Array<{ channelId: string; costsByPayer: SupplierPayerCosts[] }>, previous: Array<{ channelId: string; costsByPayer: SupplierPayerCosts[] }>) {
    const changes = new Map<string, Map<string, bigint>>();
    for (const [rows, sign] of [
        [current, BigInt(1)],
        [previous, BigInt(-1)],
    ] as const) {
        for (const row of rows) {
            for (const amount of platformSupplierCost(row.costsByPayer)?.amounts ?? []) {
                const exact = amount.amountMicrosExact ?? (Number.isSafeInteger(amount.amountMicros) ? String(amount.amountMicros) : "");
                if (!/^\d+$/.test(exact) || !/^[A-Z]{3}$/.test(amount.currency)) continue;
                const channels = changes.get(amount.currency) ?? new Map<string, bigint>();
                changes.set(amount.currency, channels);
                channels.set(row.channelId, (channels.get(row.channelId) ?? BigInt(0)) + sign * BigInt(exact));
            }
        }
    }
    return [...changes]
        .sort(([a], [b]) => a.localeCompare(b))
        .flatMap(([currency, channels]) => {
            const magnitude = (n: bigint) => (n < BigInt(0) ? -n : n);
            const largest = [...channels.values()].reduce((max, n) => (magnitude(n) > max ? magnitude(n) : max), BigInt(0));
            if (!largest) return [];
            return [...channels].filter(([, n]) => magnitude(n) === largest).map(([channelId, delta]) => ({ currency, channelId, delta }));
        });
}
