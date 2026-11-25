import { Button, Tooltip } from "antd";
import type { ReactNode } from "react";
import { CachedResourceImage } from "@/components/cached-resource-image";
import { AppModal } from "@/components/ui/product/app-modal";
import { WorkspaceState } from "@/components/layout/workspace-state";
import { formatReviewAbsoluteDateTime, formatReviewRelativeTime, reviewText, useReviewLocale } from "@/i18n/drama-messages";
export function CollectionToolbar({ children, trailing, active, onReset, label }: { children: ReactNode; trailing?: ReactNode; active?: boolean; onReset?: () => void; label?: string }) {
    return (
        <section aria-label={label} className="flex flex-wrap items-center gap-3 py-4">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">{children}</div>
            {active && onReset && <Button onClick={onReset}>{reviewText("重置")}</Button>}
            {trailing}
        </section>
    );
}
export function RelativeTime({ value }: { value?: string }) {
    useReviewLocale();
    return (
        <Tooltip title={formatReviewAbsoluteDateTime(value)}>
            <time dateTime={value}>{formatReviewRelativeTime(value)}</time>
        </Tooltip>
    );
}
export function WorkspaceNoResultsState({ description, onClear }: { icon?: string; query?: string; description?: string; onClear: () => void }) {
    return <WorkspaceState icon="projects" title={reviewText("没有匹配的作品")} description={description} action={<Button onClick={onClear}>{reviewText("重置")}</Button>} />;
}
export function CanvasImagePreview({ storageKey, alt, onClose }: { storageKey: string; alt: string; onClose: () => void }) {
    return (
        <AppModal open title={alt} onCancel={onClose} footer={null} width="min(1080px, calc(100vw - 32px))">
            <CachedResourceImage storageKey={storageKey} alt={alt} className="max-h-[75vh] w-full object-contain" />
        </AppModal>
    );
}
