import { useCallback, useEffect, useRef, useState } from "react";
import { App } from "antd";
import { useUserStore } from "@/stores/use-user-store";
import { claimFirstOnboarding, updateAccountOnboarding } from "@/services/api/onboarding";

export function useAccountOnboarding(enabled: boolean) {
    const userId = useUserStore((state) => state.user?.id || "");
    const { message } = App.useApp();
    const [display, setDisplay] = useState({ userId: "", visible: false });
    const interactions = useRef(0);
    const manualUser = useRef<string | null>(null);
    useEffect(() => {
        if (!enabled || !userId || manualUser.current === userId) return;
        let active = true;
        const revision = interactions.current;
        void claimFirstOnboarding(userId)
            .then((state) => {
                if (active && interactions.current === revision) setDisplay({ userId, visible: state.claimed });
            })
            .catch((error: Error) => {
                if (active) void message.error(error.message);
            });
        return () => {
            active = false;
        };
    }, [enabled, userId, message]);
    const show = useCallback(() => {
        interactions.current++;
        manualUser.current = userId;
        if (!userId) setDisplay({ userId, visible: true });
        else
            void claimFirstOnboarding(userId)
                .then(() => setDisplay({ userId, visible: true }))
                .catch((error: Error) => message.error(error.message));
    }, [userId, message]);
    const hide = useCallback(() => {
        interactions.current++;
        setDisplay({ userId, visible: false });
    }, [userId]);
    const dismiss = useCallback(async () => {
        interactions.current++;
        if (userId) await updateAccountOnboarding("closed");
        hide();
    }, [hide, userId]);
    return { visible: display.userId === userId && display.visible, show, hide, dismiss };
}
