import { lazy, startTransition, Suspense, useEffect, useRef, useState, type ComponentType } from "react";

// A local boundary prevents a newly opened tool from suspending the whole route.
export function deferredCanvasComponent<P extends object>(load: () => Promise<{ default: ComponentType<P> }>, active: (props: NoInfer<P>) => boolean = () => true) {
    let ready: ComponentType<P> | undefined;
    let pending: Promise<{ default: ComponentType<P> }> | undefined;
    const preload = () => pending ||= load().then((module) => {
        ready = module.default;
        return module;
    }).catch((error) => { pending = undefined; throw error; });
    const Component = lazy(preload);
    function DeferredCanvasComponent({ deferMount = false, ...rest }: P & { deferMount?: boolean }) {
        const props = rest as P;
        const visible = active(props);
        const [activated, setActivated] = useState(visible && !deferMount);
        const mounted = useRef<ComponentType<P> | typeof Component | null>(null);
        // Preloading removes network waits; the guide also separates the first
        // heavy render from the click commit without changing later identity.
        useEffect(() => {
            if (visible && !activated && deferMount) startTransition(() => setActivated(true));
        }, [activated, deferMount, visible]);
        // Defer the first mount, then retain the tool's existing close/reset
        // lifecycle and local selections across subsequent opens.
        if (visible && !activated && !deferMount) setActivated(true);
        if (!activated && (!visible || deferMount)) return null;
        // A preloaded tool never suspends on its first interaction. Retain the
        // chosen component identity so later renders cannot reset its state.
        const Content = mounted.current ||= ready || Component;
        return (
            <Suspense fallback={null}>
                <Content {...props} />
            </Suspense>
        );
    }
    return Object.assign(DeferredCanvasComponent, { preload });
}
