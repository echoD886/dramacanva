import { useState } from "react";
import { CoachMark } from "./coach-mark";
import { useI18n } from "@/i18n/use-i18n";

export function HomeOnboarding({ onStart, onDismiss }: { onStart: () => void; onDismiss: () => void }) {
    const { t } = useI18n();
    const [paused, setPaused] = useState(false);
    return (
        <CoachMark
            id="H1"
            title={t("coach.home.title")}
            description={t("coach.home.description", { label: t("homeShowcase.createCanvas") })}
            target={() => document.querySelector<HTMLElement>('[data-onboarding="create-canvas"]')}
            gestureTarget={() => document.querySelector<HTMLElement>('[data-onboarding="create-canvas"] .ll-home-create-plus')}
            action={{ label: t("coach.home.start"), onClick: onStart }}
            secondary={{ label: t("coach.home.later"), onClick: onDismiss }}
            paused={paused}
            onPause={() => setPaused(true)}
            onResume={() => setPaused(false)}
            onSkip={onDismiss}
        />
    );
}
