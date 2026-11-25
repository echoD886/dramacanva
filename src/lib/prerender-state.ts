import { createContext, useContext, useSyncExternalStore } from "react";

export type PrerenderState = { renderedAt: number };
export const PrerenderContext = createContext<PrerenderState | undefined>(undefined);
const subscribe = () => () => {};
const client = () => true;
const server = () => false;

/** Browser preferences apply after hydration; ordinary client routes use them immediately. */
export function useHydrated() {
    return useSyncExternalStore(subscribe, client, server);
}

export function usePrerenderTime() {
    return useContext(PrerenderContext)?.renderedAt;
}

export function readPrerenderState(target: Document): PrerenderState | undefined {
    const content = target.getElementById("prerender-state")?.textContent;
    if (!content) return;
    const value: unknown = JSON.parse(content);
    if (!value || typeof value !== "object" || !("renderedAt" in value) || typeof value.renderedAt !== "number" || !Number.isFinite(value.renderedAt)) throw new Error("Invalid prerender state");
    return { renderedAt: value.renderedAt };
}
