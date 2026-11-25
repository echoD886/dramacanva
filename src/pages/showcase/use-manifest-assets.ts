import { useEffect, useState } from "react";

import { loadManifestAssetIndex, type ManifestAssetIndex } from "./data";

export function useManifestAssets(enabled = true) {
    const [index, setIndex] = useState<ManifestAssetIndex>();
    const [error, setError] = useState<Error>();

    useEffect(() => {
        if (!enabled) return;
        let active = true;
        void loadManifestAssetIndex()
            .then((nextIndex) => {
                if (active) setIndex(nextIndex);
            })
            .catch((reason: unknown) => {
                if (active) setError(reason instanceof Error ? reason : new Error(String(reason)));
            });
        return () => {
            active = false;
        };
    }, [enabled]);

    return { index, error, loading: enabled && !index && !error };
}
