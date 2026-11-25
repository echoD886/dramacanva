import { lazy, useState, type ComponentType } from "react";
import { createRetryableModuleLoader } from "./retryable-module-loader";

/** Keep a page's component identity stable, including when first visited lazily. */
export function createPreloadablePage<Props extends object = Record<string, never>>(load: () => Promise<{ default: ComponentType<Props> }>) {
    let ready: ComponentType<Props> | undefined;
    const loadModule = createRetryableModuleLoader(async () => {
        const module = await load();
        ready = module.default;
        return module;
    });
    const LazyPage = lazy(loadModule);
    function PreloadablePage(props: Props) {
        const [Page] = useState<ComponentType<Props>>(() => ready ?? LazyPage);
        return <Page {...props} />;
    }
    PreloadablePage.preload = () => loadModule().then(() => undefined);
    return PreloadablePage;
}
