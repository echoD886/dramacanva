import { useEffect, useRef, useState } from "react";
import { App } from "antd";
import { ArrowRight, Clapperboard, FileText, Image, Video } from "lucide-react";
import { CoachMark, type CoachRevealArea } from "@/components/onboarding/coach-mark";
import { useI18n } from "@/i18n/use-i18n";
import type { MessageKey } from "@/i18n/messages";
import { availableOnboardingStep, transitionOnboarding, type CoreTourState, type OnboardingAction, type OnboardingSession, type OnboardingStep } from "@/lib/canvas/canvas-onboarding-flow";
import { getOnboardingProgress, saveOnboardingProgress } from "@/lib/canvas/canvas-onboarding-template";
import { trackOnboardingEvent } from "@/services/onboarding-analytics";
import { updateAccountOnboarding } from "@/services/api/onboarding";
import { useUserStore } from "@/stores/use-user-store";

export type TourNodeIds = { text: string | null; script: string | null; image: string | null; video: string | null };
export function onboardingTarget(step: OnboardingStep, ids: TourNodeIds, review = false, isVisible = (el: HTMLElement) => el.getClientRects().length > 0): HTMLElement | null {
    const find = (selector: string) => [...document.querySelectorAll<HTMLElement>(selector)].find(isVisible) || null;
    const node = (id: string | null, selector: string) => (id ? find(`[data-node-id="${CSS.escape(id)}"] ${selector}`) : null);
    if (step === 1) return find('[data-canvas-tour-command="text"]') || find('[data-canvas-tour="new-text"]') || find('[data-dock-id="tool-add"]');
    if (step === 3) return find('[data-canvas-tour-option="script"]') || node(ids.text, '[data-canvas-connection-rail="right"]');
    if (step === 4) return node(ids.script, review ? '[data-canvas-tour="script-first-shot"]' : '[data-canvas-tour="script-generate"]');
    if (step === 5) return find('[data-canvas-tour="shot-create-image"]')?.closest<HTMLElement>('[role="menuitem"]') || node(ids.script, '[data-canvas-tour="script-first-shot"] button[data-shot-actions]');
    if (step === 7) return find('[data-canvas-tour-option="video"]') || node(ids.image, '[data-canvas-connection-rail="right"]');
    if ([2, 6, 8].includes(step)) return find('[data-canvas-node-panel] [data-canvas-tour="composer-submit"]');
    return null;
}

export function OnboardingChain() {
    const { t } = useI18n();
    return (
        <div className="coach-chain" aria-hidden="true">
            {[
                { Icon: FileText, label: "canvasExtra.approval.type.text" },
                { Icon: Clapperboard, label: "nodeInfo.script" },
                { Icon: Image, label: "canvasExtra.approval.type.image" },
                { Icon: Video, label: "canvasExtra.approval.type.video" },
            ].map(({ Icon, label }, index) => (
                <div key={label} className="coach-chain-item">
                    <span className="coach-chain-node">
                        <Icon />
                        <span>{t(label as MessageKey)}</span>
                    </span>
                    {index < 3 && <ArrowRight size={12} />}
                </div>
            ))}
        </div>
    );
}

export type CanvasOnboardingTourProps = {
    open?: boolean;
    projectId: string;
    ids: TourNodeIds;
    state: CoreTourState;
    generating: boolean;
    onStepChange: (step: OnboardingStep) => void;
    onOpenConnectionMenu: (nodeId: string) => void;
    onReveal: (element: HTMLElement, area: CoachRevealArea) => void;
    onComplete: () => void;
    onClose: () => void;
};

export function CanvasOnboardingTour({ open = true, ...props }: CanvasOnboardingTourProps) {
    const { t } = useI18n();
    const { message, modal } = App.useApp();
    const userId = useUserStore((state) => state.user?.id);
    const latest = useRef(props);
    latest.current = props;
    const [session, setSession] = useState<OnboardingSession>(() => {
        const saved = getOnboardingProgress(props.projectId);
        return saved || { step: props.state.hasText ? availableOnboardingStep(props.state) : 0, status: "active" };
    });
    const { step, status } = session;
    const [confirming, setConfirming] = useState(false);
    const review = step === 4 && props.state.scriptReady && !props.generating;
    const dispatch = (action: OnboardingAction) => setSession((current) => transitionOnboarding(current, action, latest.current.state));
    const facts = JSON.stringify(props.state);
    useEffect(() => {
        trackOnboardingEvent("onboarding_canvas_entered");
    }, [props.projectId]);
    useEffect(() => {
        if (userId) void updateAccountOnboarding("started").catch((error: Error) => message.error(error.message));
    }, [userId, message]);
    useEffect(() => {
        if (open && !props.generating) setSession((current) => transitionOnboarding(current, "sync", latest.current.state));
    }, [facts, props.generating, open, status, step]);
    useEffect(() => {
        saveOnboardingProgress(props.projectId, { version: 2, ...session, updatedAt: Date.now() });
    }, [props.projectId, session]);
    useEffect(() => {
        if (status !== "completed") return;
        let active = true;
        const finish = async () => {
            if (userId) await updateAccountOnboarding("completed");
            if (active) latest.current.onComplete();
        };
        void finish().catch((error: Error) => {
            if (active) modal.error({ content: error.message, okText: t("common.retry"), onOk: finish });
        });
        return () => { active = false; };
    }, [status, userId, modal, t]);
    useEffect(() => {
        if (!open || status !== "active") return;
        latest.current.onStepChange(step);
        trackOnboardingEvent("onboarding_coach_step_viewed", { step });
        const legacy = step === 2 ? "onboarding_step1_viewed" : step === 6 ? "onboarding_step2_viewed" : step === 8 ? "onboarding_step3_viewed" : null;
        if (legacy) trackOnboardingEvent(legacy);
    }, [step, open, status]);
    useEffect(() => {
        if (!review || status !== "active" || !open || confirming) return;
        const timer = window.setTimeout(() => dispatch("reviewed"), 4000);
        return () => window.clearTimeout(timer);
    }, [review, status, open, confirming]);
    const previousGenerating = useRef(false);
    useEffect(() => {
        if (props.generating && !previousGenerating.current) {
            trackOnboardingEvent("onboarding_coach_generate_clicked", { step });
            const event = step === 2 ? "onboarding_step1_generate_clicked" : step === 6 ? "onboarding_step2_generate_clicked" : step === 8 ? "onboarding_step3_generate_click" : null;
            if (event) trackOnboardingEvent(event);
        }
        if (!props.generating && previousGenerating.current) {
            const ready = step === 2 ? props.state.textReady : step === 4 ? props.state.scriptReady : step === 6 ? props.state.imageReady : props.state.videoReady;
            if (ready) {
                trackOnboardingEvent("onboarding_coach_step_completed", { step });
                const event = step === 2 ? "onboarding_step1_completed" : step === 6 ? "onboarding_step2_completed" : step === 8 ? "onboarding_step3_completed" : null;
                if (event) trackOnboardingEvent(event);
            }
        }
        previousGenerating.current = props.generating;
    }, [props.generating, step, facts]);
    useEffect(() => {
        if (step !== 8 || !props.generating) return;
        const timer = window.setInterval(() => trackOnboardingEvent("onboarding_step3_waiting_heartbeat"), 30000);
        return () => window.clearInterval(timer);
    }, [step, props.generating]);

    if (!open || status === "skipped" || status === "completed") return null;
    const target = (isVisible?: (element: HTMLElement) => boolean) => onboardingTarget(step, props.ids, review, isVisible);
    const context = () => {
        const ids = step === 8 ? [props.ids.image, props.ids.video] : [step <= 3 ? props.ids.text : step <= 5 ? props.ids.script : props.ids.image];
        const elements = ids.flatMap((id) => id ? [...document.querySelectorAll<HTMLElement>(`[data-node-id="${CSS.escape(id)}"]`)] : []);
        if ([2, 6, 8].includes(step)) elements.push(...document.querySelectorAll<HTMLElement>("[data-canvas-node-panel]"));
        return elements;
    };
    const control = step === 1 ? document.querySelector<HTMLElement>('[data-canvas-tour-command="text"],[data-canvas-tour="new-text"],[data-dock-id="tool-add"]') : null;
    const label =
        step === 1
            ? control?.getAttribute("aria-label") || control?.textContent?.trim() || t("canvasExtra.approval.type.text")
            : step === 3
              ? t("nodeInfo.script")
              : step === 4
                ? t("scriptNode.generateScript")
                : step === 5
                  ? t("coach.createShotImage")
                  : step === 7
                    ? t("connectionMenu.video")
                    : t("canvasPrompt.generate");
    return (
        <CoachMark
            id={review ? "C4-review" : `C${step}`}
            step={step}
            title={t(step === 0 ? "coach.welcome.title" : review ? "coach.review.title" : (`coach.c${step}.title` as MessageKey))}
            description={t(step === 0 ? "coach.welcome.description" : review ? "coach.review.description" : (`coach.c${step}.description` as MessageKey), { label, menu: t("scriptNode.shotActions", { shot: 1 }) })}
            menuDescription={[3, 5, 7].includes(step) ? t("coach.menuDescription", { label }) : undefined}
            mobileDescription={review ? t("coach.review.mobileDescription") : undefined}
            target={step === 0 ? undefined : target}
            highlight={review ? () => [...document.querySelectorAll<HTMLElement>(`[data-node-id="${CSS.escape(props.ids.script || "")}"] [data-canvas-tour="script-table-header"], [data-node-id="${CSS.escape(props.ids.script || "")}"] [data-canvas-tour="script-first-shot"]`)] : undefined}
            highlightClip={review ? () => document.querySelector<HTMLElement>(`[data-node-id="${CSS.escape(props.ids.script || "")}"] .coach-script-table-scroll`) : undefined}
            highlightPadding={step === 1 || review ? 6 : undefined}
            minimumScale={step === 7 ? 0.8 : undefined}
            generationTarget={() => {
                const id = step === 2 ? props.ids.text : step === 4 ? props.ids.script : step === 6 ? props.ids.image : props.ids.video;
                return id ? document.querySelector<HTMLElement>(`[data-node-id="${CSS.escape(id)}"]`) : null;
            }}
            context={step > 1 ? context : undefined}
            vertical={step === 5}
            gesture={!review}
            generationLabel={t(step === 2 ? "canvasExtra.approval.type.text" : step === 4 ? "nodeInfo.script" : step === 6 ? "canvasExtra.approval.type.image" : "canvasExtra.approval.type.video")}
            paused={status === "paused"}
            generating={props.generating}
            onReveal={props.onReveal}
            onConfirmChange={setConfirming}
            onTargetActivate={(element) => {
                const nodeId = step === 3 ? props.ids.text : step === 7 ? props.ids.image : null;
                if (!nodeId || !element.matches('[data-canvas-connection-rail="right"]')) return false;
                props.onOpenConnectionMenu(nodeId);
                return true;
            }}
            onPause={() => {
                dispatch("pause");
                trackOnboardingEvent("onboarding_paused", { step });
            }}
            onResume={() => {
                dispatch("resume");
                trackOnboardingEvent("onboarding_resumed", { step });
            }}
            onSkip={(reason) => {
                void (async () => {
                    if (userId) await updateAccountOnboarding(reason);
                    saveOnboardingProgress(props.projectId, { version: 2, step, status: "skipped", updatedAt: Date.now() });
                    trackOnboardingEvent("onboarding_skipped", { step });
                    trackOnboardingEvent("onboarding_abandoned", { step });
                    props.onClose();
                })().catch((error: Error) => message.error(error.message));
            }}
            action={step === 0 ? { label: t("coach.start"), onClick: () => dispatch("start") } : review ? { label: t("coach.continue"), onClick: () => dispatch("reviewed") } : undefined}
        >
            {step === 0 && (
                <>
                    <OnboardingChain />
                    <ul className="coach-welcome-facts">
                        <li>{t("coach.welcome.nodes")}</li>
                        <li>{t("coach.welcome.edges")}</li>
                        <li>{t("coach.welcome.canvas")}</li>
                    </ul>
                </>
            )}
        </CoachMark>
    );
}
