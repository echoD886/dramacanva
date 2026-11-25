/** Notify only the overlays whose stacking position actually changes. */
export function createCanvasOverlayOrder() {
    let active: string | null = null;
    const listeners = new Map<string, Set<() => void>>();
    return {
        isActive: (id: string) => active === id,
        subscribe(id: string, listener: () => void) {
            const group = listeners.get(id) || new Set();
            listeners.set(id, group);
            group.add(listener);
            return () => {
                group.delete(listener);
                if (!group.size) listeners.delete(id);
            };
        },
        bringToFront(id: string) {
            if (active === id) return;
            const previous = active;
            active = id;
            if (previous) for (const listener of listeners.get(previous) || []) listener();
            for (const listener of listeners.get(id) || []) listener();
        },
    };
}
