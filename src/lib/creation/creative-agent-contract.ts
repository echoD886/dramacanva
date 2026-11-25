export { CREATIVE_SCENARIOS, type CreativeScenario, type CreativeScenarioId } from "./creative-scenarios";

export type CreativeQuote = { id: string; title: string; items: { id: string; label: string; model: string; quantity: number; specification: string }[]; amountLabel: string; basis: string; expiresAt?: string; approvedQuantity?: number; externalBilling?: boolean };

