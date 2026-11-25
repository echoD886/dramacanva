import { useEffect, useState } from "react";

export function usePriceRevision() {
    const [revision, setRevision] = useState(0);
    useEffect(() => {
        const refresh = () => setRevision((value) => value + 1);
        window.addEventListener("generation-price-changed", refresh);
        return () => window.removeEventListener("generation-price-changed", refresh);
    }, []);
    return revision;
}
