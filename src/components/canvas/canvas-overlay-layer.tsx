import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type MouseEventHandler, type PointerEventHandler, type ReactNode, type WheelEventHandler } from "react";
import { createCanvasOverlayOrder } from "@/lib/canvas/canvas-overlay-order";

type CanvasOverlayLayerContextValue = ReturnType<typeof createCanvasOverlayOrder>;

const CanvasOverlayLayerContext = createContext<CanvasOverlayLayerContextValue | null>(null);

export function CanvasOverlayLayerProvider({ children }: { children: ReactNode }) {
    const value = useMemo(createCanvasOverlayOrder, []);

    return <CanvasOverlayLayerContext.Provider value={value}>{children}</CanvasOverlayLayerContext.Provider>;
}

export function useCanvasOverlayLayer(overlayId: string, fallbackZIndex: string) {
    const context = useContext(CanvasOverlayLayerContext);
    const bringToFrontFromContext = context?.bringToFront;
    const bringToFront = useCallback(() => bringToFrontFromContext?.(overlayId), [bringToFrontFromContext, overlayId]);
    const subscribe = useCallback((listener: () => void) => context?.subscribe(overlayId, listener) || (() => undefined), [context, overlayId]);
    const snapshot = useCallback(() => context?.isActive(overlayId) ?? false, [context, overlayId]);
    const active = useSyncExternalStore(subscribe, snapshot, () => false);
    const zIndex = active ? "var(--z-canvas-overlay-active)" : fallbackZIndex;

    return { bringToFront, zIndex };
}

export function CanvasOverlayLayerContainer({
    overlayId,
    fallbackZIndex,
    className,
    children,
    onMouseDown,
    onPointerDown,
    onWheel,
}: {
    overlayId: string;
    fallbackZIndex: string;
    className?: string;
    children: ReactNode;
    onMouseDown?: MouseEventHandler<HTMLDivElement>;
    onPointerDown?: PointerEventHandler<HTMLDivElement>;
    onWheel?: WheelEventHandler<HTMLDivElement>;
}) {
    const { bringToFront, zIndex } = useCanvasOverlayLayer(overlayId, fallbackZIndex);

    return (
        <div data-canvas-no-zoom className={className} style={{ zIndex }} onPointerDownCapture={bringToFront} onFocusCapture={bringToFront} onMouseDown={onMouseDown} onPointerDown={onPointerDown} onWheel={onWheel}>
            {children}
        </div>
    );
}
