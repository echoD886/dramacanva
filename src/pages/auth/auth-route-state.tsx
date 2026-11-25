import { useEffect, useState } from "react";

import { authCountdownRemaining } from "./auth-route-utils";

export function useAuthCountdown(expiresAt: number) {
    const [remaining, setRemaining] = useState(() => authCountdownRemaining(expiresAt));

    useEffect(() => {
        const update = () => setRemaining(authCountdownRemaining(expiresAt));
        update();
        if (expiresAt <= Date.now()) return;
        const timer = window.setInterval(update, 250);
        return () => window.clearInterval(timer);
    }, [expiresAt]);

    return remaining;
}
