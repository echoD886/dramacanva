import React from "react";
import { Button } from "antd";
import { Folder, Search, Upload, ExternalLink, RefreshCw, AlertCircle, WifiOff } from "lucide-react";

import { useDetailI18n } from "./folder-detail-i18n";
import { assetSectionKey } from "@/i18n/asset-archive-messages";
import type { AssetSection } from "@/types/asset-archive";

export interface FolderDetailEmptyProps {
    type: "folder" | "unfiled" | "search" | "section";
    searchQuery?: string;
    section?: AssetSection | "pending";
    onUpload?: () => void;
    onOpenCanvas?: () => void;
    onClearSearch?: () => void;
}

export function FolderDetailEmpty({
    type,
    searchQuery,
    section,
    onUpload,
    onOpenCanvas,
    onClearSearch,
}: FolderDetailEmptyProps) {
    const { t, dt } = useDetailI18n();

    if (type === "search") {
        return (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted/50 border border-border/60 text-muted-foreground shadow-xs">
                    <Search className="size-6 stroke-[1.5]" />
                </div>
                <h3 className="text-base font-semibold text-foreground">
                    {dt("assetDetail.emptySearchTitle")}
                </h3>
                <p className="mt-1.5 max-w-sm text-xs text-muted-foreground leading-relaxed">
                    {dt("assetDetail.emptySearchDesc", { query: searchQuery || "" })}
                </p>
                {onClearSearch ? (
                    <Button size="small" onClick={onClearSearch} className="mt-4 font-medium">
                        {dt("assetDetail.clearSearch")}
                    </Button>
                ) : null}
            </div>
        );
    }

    if (type === "section" && section) {
        const sectionName = section === "pending" ? t("assetClassification.pendingReview") : t(assetSectionKey(section));
        return (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted/50 border border-border/60 text-muted-foreground shadow-xs">
                    <Folder className="size-6 stroke-[1.5]" />
                </div>
                <h3 className="text-base font-semibold text-foreground">
                    {dt("assetDetail.emptySectionTitle", { section: sectionName })}
                </h3>
                <p className="mt-1.5 max-w-sm text-xs text-muted-foreground leading-relaxed">
                    {dt("assetDetail.emptySectionDesc")}
                </p>
                {onOpenCanvas ? (
                    <Button
                        type="primary"
                        size="small"
                        icon={<ExternalLink className="size-3.5" />}
                        onClick={onOpenCanvas}
                        className="mt-4 font-medium"
                    >
                        {dt("assetDetail.createInCanvas")}
                    </Button>
                ) : null}
            </div>
        );
    }

    if (type === "unfiled") {
        return (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted/50 border border-border/60 text-muted-foreground shadow-xs">
                    <Folder className="size-6 stroke-[1.5]" />
                </div>
                <h3 className="text-base font-semibold text-foreground">
                    {dt("assetDetail.emptyUnfiledTitle")}
                </h3>
                <p className="mt-1.5 max-w-sm text-xs text-muted-foreground leading-relaxed">
                    {dt("assetDetail.emptyUnfiledDesc")}
                </p>
                {onOpenCanvas ? (
                    <Button
                        type="primary"
                        size="small"
                        icon={<ExternalLink className="size-3.5" />}
                        onClick={onOpenCanvas}
                        className="mt-4 font-medium"
                    >
                        {dt("assetDetail.createInCanvas")}
                    </Button>
                ) : null}
            </div>
        );
    }

    // Default: Entire Folder is Empty
    return (
        <div className="folder-detail-glass-panel flex flex-col items-center justify-center rounded-2xl py-16 px-6 text-center shadow-xs">
            {/* Translucent Line-drawn Frosted Glass Folder Icon */}
            <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-background/60 border border-white/20 text-muted-foreground shadow-sm backdrop-blur-md">
                <Folder className="size-8 stroke-[1.2] text-foreground/70" />
            </div>

            <h3 className="text-base sm:text-lg font-semibold text-foreground">
                {dt("assetDetail.emptyFolderTitle")}
            </h3>
            <p className="mt-1 max-w-md text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {dt("assetDetail.emptyFolderDesc")}
            </p>

            {/* Action Buttons: Upload Assets & Create in Canvas */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                {onUpload ? (
                    <Button
                        type="primary"
                        icon={<Upload className="size-3.5" />}
                        onClick={onUpload}
                        className="font-medium shadow-sm"
                    >
                        {dt("assetDetail.uploadNew")}
                    </Button>
                ) : null}
                {onOpenCanvas ? (
                    <Button
                        icon={<ExternalLink className="size-3.5" />}
                        onClick={onOpenCanvas}
                        className="font-medium"
                    >
                        {dt("assetDetail.createInCanvas")}
                    </Button>
                ) : null}
            </div>
        </div>
    );
}

/**
 * 3:4 Aspect Ratio Shimmer Skeleton Grid (Design G.2)
 */
export function FolderDetailSkeletonGrid({ count = 10 }: { count?: number }) {
    const items = Array.from({ length: count }, (_, i) => i);
    return (
        <div
            data-testid="folder-detail-skeleton-grid"
            className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
        >
            {items.map((i) => (
                <div key={i} className="flex flex-col gap-2">
                    <div className="folder-detail-shimmer aspect-[3/4] w-full rounded-xl" />
                    <div className="folder-detail-shimmer h-3.5 w-3/4 rounded-md" />
                    <div className="folder-detail-shimmer h-2.5 w-1/2 rounded-md" />
                </div>
            ))}
        </div>
    );
}

/**
 * Error Boundary & Friendly Recovery Banner (Design G.3)
 */
export function FolderDetailErrorRecovery({
    reason,
    onRetry,
    onRefresh,
    onReturn,
}: {
    reason: string;
    onRetry?: () => void;
    onRefresh?: () => void;
    onReturn?: () => void;
}) {
    const { dt } = useDetailI18n();

    let message = dt("assetDetail.errGeneric");
    let actionBtn: React.ReactNode = null;

    if (reason === "offline") {
        message = dt("assetDetail.errOffline");
        actionBtn = onRetry ? (
            <Button size="small" type="primary" icon={<WifiOff className="size-3.5" />} onClick={onRetry}>
                {dt("assetDetail.reconnect")}
            </Button>
        ) : null;
    } else if (reason === "location-conflict" || reason === "classification-conflict") {
        message = dt("assetDetail.errConflict");
        actionBtn = onRefresh ? (
            <Button size="small" type="primary" icon={<RefreshCw className="size-3.5" />} onClick={onRefresh}>
                {dt("assetDetail.refreshStatus")}
            </Button>
        ) : null;
    } else if (reason === "target-not-found" || reason === "asset-not-found") {
        message = dt("assetDetail.errNotFound");
        actionBtn = onReturn ? (
            <Button size="small" onClick={onReturn}>
                {dt("assetDetail.returnToLibrary")}
            </Button>
        ) : null;
    } else if (reason === "storage-failed") {
        message = dt("assetDetail.errQuota");
        actionBtn = onRetry ? (
            <Button size="small" onClick={onRetry}>
                {dt("assetDetail.retry")}
            </Button>
        ) : null;
    } else {
        actionBtn = onRetry ? (
            <Button size="small" type="primary" onClick={onRetry}>
                {dt("assetDetail.retry")}
            </Button>
        ) : null;
    }

    return (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-600 dark:text-red-400">
            <div className="flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{message}</span>
            </div>
            {actionBtn}
        </div>
    );
}
