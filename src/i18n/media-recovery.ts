import { currentLocaleText as t } from "./current-locale-text";
import type { MessageKey } from "./messages";

const reasons: Record<string, MessageKey> = {
    media_recovery_unavailable: "mediaRecovery.unavailable",
    media_recovery_noCheckpoint: "mediaRecovery.noCheckpoint",
    media_recovery_notFailed: "mediaRecovery.notFailed",
    media_recovery_billingMismatch: "mediaRecovery.billingMismatch",
    media_recovery_refunded: "mediaRecovery.refunded",
    media_recovery_limit: "mediaRecovery.limit",
    media_recovery_cooldown: "mediaRecovery.cooldown",
    media_recovery_projectMissing: "mediaRecovery.projectMissing",
    media_recovery_archived: "mediaRecovery.archived",
};

export function mediaRecoveryAPIMessage(reason: string | undefined, fallback: string) {
    return reason && reasons[reason] ? t(reasons[reason]) : fallback;
}
