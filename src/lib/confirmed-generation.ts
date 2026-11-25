export type TaskPriceConfirmation = { requestKey: string; amountMicrocredits: number };

// Each retry needs a new explicit approval. A transport failure is never retried:
// it may have created a task already.
export async function submitConfirmedGeneration<T extends object, R>(input: T, api: {
    quote: (input: T) => Promise<TaskPriceConfirmation>;
    create: (input: T & { priceConfirmation: TaskPriceConfirmation }) => Promise<R>;
    confirm: (quote: TaskPriceConfirmation, changed: boolean) => Promise<boolean>;
    assertCurrent: () => void;
    initialQuote?: TaskPriceConfirmation;
}) {
    const snapshot: T = structuredClone(input);
    for (let attempt = 0; attempt < 3; attempt++) {
        const alreadyConfirmed = attempt === 0 && api.initialQuote;
        const quote = alreadyConfirmed || await api.quote(snapshot);
        api.assertCurrent();
        if (!Number.isSafeInteger(quote.amountMicrocredits) || quote.amountMicrocredits < 0 || !quote.requestKey) throw new Error("Invalid generation price");
        if (!alreadyConfirmed && quote.amountMicrocredits > 0 && !await api.confirm(quote, attempt > 0)) throw new DOMException("Cancelled", "AbortError");
        api.assertCurrent();
        try { return await api.create({ ...snapshot, priceConfirmation: quote }); }
        catch (error) { if ((error as { reason?: string })?.reason !== "price_changed" || attempt === 2) throw error; }
    }
    throw new Error("Generation price changed");
}

export async function confirmGenerationBatch<T extends object>(inputs: T[], api: {
    quote: (input: T) => Promise<TaskPriceConfirmation>;
    confirm: (totalMicrocredits: number, count: number) => Promise<boolean>;
    assertCurrent: () => void;
}) {
    const snapshots: T[] = structuredClone(inputs);
    const quotes = await Promise.all(snapshots.map(api.quote));
    api.assertCurrent();
    const total = quotes.reduce((sum, quote) => {
        if (!quote.requestKey || !Number.isSafeInteger(quote.amountMicrocredits) || quote.amountMicrocredits < 0) throw new Error("Invalid generation price");
        return sum + quote.amountMicrocredits;
    }, 0);
    if (!Number.isSafeInteger(total)) throw new Error("Invalid batch total");
    if (total > 0 && !await api.confirm(total, snapshots.length)) throw new DOMException("Cancelled", "AbortError");
    api.assertCurrent();
    return snapshots.map((input, index) => ({ ...input, priceConfirmation: quotes[index] }));
}
