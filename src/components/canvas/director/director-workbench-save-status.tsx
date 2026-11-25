import { RotateCcw } from "lucide-react";
import { currentLocaleText as t } from "@/i18n/current-locale-text";
import type { DirectorSaveIndicator } from "@/lib/canvas/director/director-save-wiring";

export function DirectorWorkbenchSaveStatus({ indicator, retrying, onRetry }: { indicator: DirectorSaveIndicator; retrying: boolean; onRetry: () => void }) {
    const statusClass = indicator.tone === "danger" ? "is-danger" : indicator.busy ? "is-busy" : "";
    return (
        <>
            <span className={`director-desk-save ${statusClass}`} aria-live="polite" title={indicator.label}>
                {indicator.label}
            </span>
            {indicator.retryable ? (
                <button type="button" className="director-desk-header-action" aria-label={t("canvasExtra.directorWB.retrySave")} disabled={retrying || indicator.busy} onClick={onRetry}>
                    <RotateCcw className="size-3.5" />
                    {t("canvasExtra.directorWB.retrySave")}
                </button>
            ) : null}
        </>
    );
}
