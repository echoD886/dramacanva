import { Button, Skeleton } from "antd";
import type { ReactNode } from "react";

import { WorkspaceSignalIcon, type WorkspaceSignalIconVariant } from "@/components/ui/aceternity/workspace-signal-icon";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/use-i18n";
import { EmptyState } from "@/components/ui/product/empty-state";
import { Inbox, TriangleAlert } from "lucide-react";

export function WorkspaceState({ icon = "empty", title, description, action, compact = false, className }: { icon?: WorkspaceSignalIconVariant; title: string; description?: string; action?: ReactNode; compact?: boolean; className?: string }) {
    return (
        <section className={cn("workspace-state flex flex-col items-center justify-center text-center", compact ? "min-h-44 py-8" : "min-h-[320px] py-12", className)}>
            <EmptyState size={compact ? "compact" : "default"} icon={icon === "error" ? TriangleAlert : Inbox} title={title} description={description} action={action} />
        </section>
    );
}

export function WorkspaceErrorState({ title, description, actionLabel, onRetry, compact = false }: { title?: string; description?: string; actionLabel?: string; onRetry?: () => void; compact?: boolean }) {
    const { t } = useI18n();
    return (
        <WorkspaceState icon="error" title={title ?? t("common.loadFailure")} description={description || t("common.networkRetry")} compact={compact} action={onRetry ? <Button onClick={onRetry}>{actionLabel ?? t("common.reload")}</Button> : undefined} />
    );
}

export function WorkspaceLoadingState({ label, detail, rows = 3, className }: { label?: string; detail?: string; rows?: number; className?: string }) {
    const { t } = useI18n();
    label ??= t("common.loading");
    return (
        <section className={cn("workspace-loading-state py-8", className)} aria-busy="true" aria-live="polite">
            <div className="mb-5 flex items-center gap-3">
                <WorkspaceSignalIcon variant="loading" size="sm" />
                <div>
                    <div className="text-sm font-medium">{label}</div>
                    {detail ? <div className="mt-0.5 text-xs text-foreground/50">{detail}</div> : null}
                </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: rows }, (_, index) => (
                    <div key={index} className="rounded-md bg-surface-active p-4">
                        <Skeleton active title={{ width: `${48 + index * 8}%` }} paragraph={{ rows: 3 }} />
                    </div>
                ))}
            </div>
        </section>
    );
}
