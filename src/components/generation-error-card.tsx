import { Button } from "antd";
import { InsufficientCreditsModal } from "./payments/insufficient-credits-modal";
import { ChevronDown, CircleAlert, LoaderCircle, RotateCcw } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import type { MessageKey } from "@/i18n/messages";
import { useI18n } from "@/i18n/use-i18n";
import { formatCredits } from "@/constant/credits";
import { generationFailurePresentation, type GenerationErrorAction } from "@/lib/generation-failure";
import "@/components/canvas/canvas-agent-surfaces.css";
import "./generation-error-card.css";

type Presentation = ReturnType<typeof generationFailurePresentation>;
export type GenerationErrorActions = Partial<Record<GenerationErrorAction, () => void>>;

// The shared body retains E1c typography, amounts, disclosure, focus and motion.
export function GenerationErrorContent({
    error,
    showTitle = true,
    onRetry,
    retrying = false,
    actions = {},
    compact = false,
    agent = false,
}: {
    error: Presentation;
    showTitle?: boolean;
    onRetry?: () => void;
    retrying?: boolean;
    actions?: GenerationErrorActions;
    compact?: boolean;
    agent?: boolean;
}) {
    const { t } = useI18n();
    const [purchaseOpen, setPurchaseOpen] = useState(false);
    const [retrySeconds, setRetrySeconds] = useState(Math.ceil((error.detail.retryAfterMs || 0) / 1000));
    useEffect(() => {
        const deadline = Date.now() + (error.detail.retryAfterMs || 0);
        const tick = () => setRetrySeconds(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
        tick();
        if (deadline <= Date.now()) return;
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [error.detail.retryAfterMs]);
    const action = actions[error.action];
    const blockedRetry = ["inspectTask", "prompt", "reference", "model", "parameters", "permission", "credits", "login", "upgrade"].includes(error.action);
    return (
        <>
            {showTitle ? (
                <div className="agent-error-title" title={compact ? error.title : undefined}>
                    {error.title}
                </div>
            ) : null}
            {!compact ? <div className="agent-error-detail">{error.text}</div> : null}
            {error.detail.refundedMicrocredits !== undefined ? <div className="agent-error-detail generation-error-refund">{t("generationFailure.refunded", { amount: formatCredits(error.detail.refundedMicrocredits) })}</div> : null}
            {error.code === "insufficient_credits" ? (
                <>
                    <div className="agent-error-amounts">
                        {error.detail.requiredMicrocredits !== undefined ? (
                            <div>
                                {t("agentErrors.required", { amount: "" })}
                                <strong>{formatCredits(error.detail.requiredMicrocredits)}</strong>
                            </div>
                        ) : null}
                        {error.detail.availableMicrocredits !== undefined ? (
                            <div>
                                {t("agentErrors.available", { amount: "" })}
                                <strong>{formatCredits(error.detail.availableMicrocredits)}</strong>
                            </div>
                        ) : null}
                    </div>
                    <div className="agent-error-actions">
                        <Button onClick={() => setPurchaseOpen(true)}>{t("agentErrors.purchase")}</Button>
                        {!compact ? <Button href="/pricing">{t("agentErrors.prices")}</Button> : null}
                    </div>
                    {purchaseOpen && (
                        <InsufficientCreditsModal
                            open
                            onClose={() => setPurchaseOpen(false)}
                            need={error.detail.requiredMicrocredits === undefined ? undefined : error.detail.requiredMicrocredits / 1e6}
                            balance={error.detail.availableMicrocredits === undefined ? undefined : error.detail.availableMicrocredits / 1e6}
                        />
                    )}
                </>
            ) : null}
            {error.code === "auth_expired" ? (
                <Button type="primary" className="agent-error-login" href={`/login?next=${encodeURIComponent(typeof window === "undefined" ? "/workspace" : window.location.pathname + window.location.search)}`}>
                    {t("agentErrors.login")}
                </Button>
            ) : null}
            {error.code === "premium_capability_required" ? (
                <div className="agent-error-actions">
                    <Button type="primary" href="/pricing">
                        {t("generationFailure.upgrade")}
                    </Button>
                </div>
            ) : null}
            {action && !["credits", "login", "retry", "permission", "upgrade"].includes(error.action) ? (
                <div className="agent-error-actions">
                    <Button type="primary" onClick={action}>
                        {t(`generationFailure.${error.action}` as MessageKey)}
                    </Button>
                </div>
            ) : null}
            {onRetry && (!blockedRetry || (agent && error.code === "invalid_input")) ? (
                <div className="agent-error-actions">
                    <Button type="text" className="agent-error-retry" icon={retrying ? <LoaderCircle className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />} disabled={retrying || retrySeconds > 0} aria-busy={retrying} onClick={onRetry}>
                        {retrying ? t("canvasCloudAgentChat.error.retrying") : agent ? t("canvasCloudAgentChat.error.retryTurn") : t("generationFailure.retry")}
                    </Button>
                </div>
            ) : null}
            {retrySeconds > 0 ? <div className="agent-error-detail">{t("generationFailure.retryAfter", { seconds: retrySeconds })}</div> : null}
            <details className="agent-error-disclosure">
                <summary>
                    {t("agentErrors.details")}
                    <ChevronDown className="size-3.5" aria-hidden="true" />
                </summary>
                {compact ? (
                    <p>
                        <strong>{error.title}</strong>
                        <br />
                        {error.text}
                    </p>
                ) : null}
                <p>{t("agentErrors.supportDetails")}</p>
                {error.detail.taskId ? (
                    <>
                        <Button type="text" onClick={() => navigator.clipboard.writeText(`${error.detail.taskId} · ${error.code}`)}>
                            {t("generationFailure.copy")}
                        </Button>
                    </>
                ) : null}
            </details>
        </>
    );
}

export function GenerationErrorCard({ error, actions, onRetry, retrying, compact = false, showTitle = true }: { error: unknown; actions?: GenerationErrorActions; onRetry?: () => void; retrying?: boolean; compact?: boolean; showTitle?: boolean }) {
    const { t } = useI18n();
    const presentation = generationFailurePresentation(error, t);
    return (
        <div
            role="status"
            className="agent-error-message generation-error-card"
            data-canvas-no-zoom
            data-compact={compact || undefined}
            style={{ "--agent-ink": "var(--foreground)", "--agent-surface-base": "var(--background)", "--agent-surface-soft": "var(--muted)", "--agent-radius-surface": "var(--r-lg)", "--agent-focus-ring": "var(--foreground)" } as CSSProperties}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
        >
            <span className="agent-error-icon" aria-hidden="true">
                <CircleAlert className="size-3.5" />
            </span>
            <div className="generation-error-body">
                <GenerationErrorContent error={presentation} actions={actions} onRetry={onRetry} retrying={retrying} compact={compact} showTitle={showTitle} />
            </div>
        </div>
    );
}
