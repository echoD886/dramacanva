import type { Asset, ImageAsset } from "@/stores/use-asset-store";

export function needsOriginalUpload(asset: Asset): asset is ImageAsset {
    return asset.kind === "image" && !asset.data.storageKey?.startsWith("resource:") && (Boolean(asset.data.storageKey?.startsWith("image:")) || asset.data.dataUrl.startsWith("data:image/"));
}

/** One original per idle turn. Locators remain durable until cloud confirmation. */
export function createAssetOriginalRecovery(options: {
    current: () => boolean;
    assets: () => readonly Asset[];
    upload: (asset: ImageAsset, signal: AbortSignal) => Promise<string>;
    commit: (asset: ImageAsset, storageKey: string) => Promise<void>;
    defer: (work: () => void, delay: number) => () => void;
}) {
    const controller = new AbortController();
    const failures = new Map<string, { attempts: number; after: number }>();
    const uploaded = new Map<string, string>();
    let cancel: (() => void) | undefined;
    let running = false;
    const current = () => !controller.signal.aborted && options.current();
    const identity = (asset: ImageAsset) => asset.data.storageKey || asset.data.dataUrl;
    const wake = () => {
        if (!current() || running || cancel) return;
        const candidates = options.assets().filter(needsOriginalUpload);
        if (!candidates.length) return;
        const delay = Math.max(5_000, Math.min(...candidates.map((asset) => (failures.get(identity(asset))?.after || 0) - Date.now())));
        cancel = options.defer(() => {
            cancel = undefined;
            void run();
        }, delay);
    };
    const run = async () => {
        if (!current() || running) return;
        const asset = options
            .assets()
            .filter(needsOriginalUpload)
            .find((item) => (failures.get(identity(item))?.after || 0) <= Date.now());
        if (!asset) {
            wake();
            return;
        }
        running = true;
        const key = identity(asset);
        try {
            const storageKey = uploaded.get(key) || (await options.upload(asset, controller.signal));
            if (!current()) return;
            uploaded.set(key, storageKey);
            await options.commit(asset, storageKey);
            failures.delete(key);
        } catch {
            // No user notification: the original stays local and resumes next session.
            const attempts = (failures.get(key)?.attempts || 0) + 1;
            failures.set(key, { attempts, after: Date.now() + Math.min(300_000, 2_000 * 2 ** Math.min(attempts, 8)) });
        } finally {
            running = false;
            wake();
        }
    };
    return {
        wake,
        stop: () => {
            controller.abort();
            cancel?.();
            cancel = undefined;
        },
    };
}

export function deferOriginalRecovery(work: () => void, delay: number) {
    let idle: number | undefined;
    let frame: number | undefined;
    const timer = window.setTimeout(() => {
        frame = window.requestAnimationFrame(() => {
            if (window.requestIdleCallback) idle = window.requestIdleCallback(work);
            else idle = window.setTimeout(work, 50);
        });
    }, delay);
    return () => {
        window.clearTimeout(timer);
        if (frame !== undefined) window.cancelAnimationFrame(frame);
        if (idle !== undefined) {
            if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
            else window.clearTimeout(idle);
        }
    };
}
