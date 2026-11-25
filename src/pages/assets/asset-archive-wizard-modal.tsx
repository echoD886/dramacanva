import React, { useState, useEffect, useMemo, useCallback } from "react";
import { App, Button, Drawer, Checkbox, Progress } from "antd";
import {
    Inbox,
    CheckCircle2,
    HelpCircle,
    AlertCircle,
    ArrowRight,
    Folder,
    RefreshCw,
    Trash2,
    X,
    Sparkles,
} from "lucide-react";

import { previewAssetArchive, commitAssetArchive } from "@/services/asset-archive";
import {
    archiveEvidenceKey,
    archiveRetainReasonKey,
    translateArchiveError,
    translateArchiveErrorAction,
} from "@/i18n/asset-archive-messages";
import type {
    AssetArchiveCandidate,
    AssetArchivePreviewItem,
    AssetArchivePreviewResponse,
} from "@/types/asset-archive";
import { useAssetStore } from "@/stores/use-asset-store";
import { useCanvasStore } from "@/stores/canvas/use-canvas-store";
import { useI18n } from "@/i18n/use-i18n";
import type { MessageKey } from "@/i18n/messages";
import { cn } from "@/lib/utils";

import zhCN from "@/i18n/messages/asset-ui-dialogs.zh-CN";
import zhHK from "@/i18n/messages/asset-ui-dialogs.zh-HK";
import zhTW from "@/i18n/messages/asset-ui-dialogs.zh-TW";
import enUS from "@/i18n/messages/asset-ui-dialogs.en-US";
import jaJP from "@/i18n/messages/asset-ui-dialogs.ja-JP";
import koKR from "@/i18n/messages/asset-ui-dialogs.ko-KR";
import esES from "@/i18n/messages/asset-ui-dialogs.es-ES";
import ptBR from "@/i18n/messages/asset-ui-dialogs.pt-BR";

const DIALOG_CATALOGS: Record<string, Record<string, string>> = {
    "zh-CN": zhCN,
    "zh-HK": zhHK,
    "zh-TW": zhTW,
    "en-US": enUS,
    "ja-JP": jaJP,
    "ko-KR": koKR,
    "es-ES": esES,
    "pt-BR": ptBR,
};

function useDialogI18n() {
    const { t, locale, number, date } = useI18n();
    const dt = useCallback(
        (key: string, values?: Record<string, string | number>) => {
            const globalText = t(key as MessageKey, values);
            if (globalText !== key) return globalText;
            const catalog = DIALOG_CATALOGS[locale] || DIALOG_CATALOGS["en-US"] || DIALOG_CATALOGS["zh-CN"];
            const template = catalog?.[key] || DIALOG_CATALOGS["zh-CN"]?.[key] || key;
            if (!values) return template;
            return template.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g, (_, k) => (values[k] !== undefined ? String(values[k]) : `{${k}}`));
        },
        [t, locale],
    );
    return { t: dt, number, date, locale };
}

function useIsMobile(breakpoint = 768) {
    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window === "undefined") return false;
        return window.innerWidth < breakpoint;
    });

    useEffect(() => {
        const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        setIsMobile(mql.matches);
        mql.addEventListener("change", handler);
        return () => mql.removeEventListener("change", handler);
    }, [breakpoint]);

    return isMobile;
}

export type AssetArchiveWizardModalProps = {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    onOpenRecycleBin?: () => void;
};

export function AssetArchiveWizardModal({
    open,
    onClose,
    onSuccess,
    onOpenRecycleBin,
}: AssetArchiveWizardModalProps) {
    const { t, number } = useDialogI18n();
    const { message } = App.useApp();
    const isMobile = useIsMobile(768);

    const assets = useAssetStore((state) => state.assets);
    const projects = useCanvasStore((state) => state.projects);

    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [previewData, setPreviewData] = useState<AssetArchivePreviewResponse | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
    const [partialNotice, setPartialNotice] = useState<string | null>(null);
    const [internalOpen, setInternalOpen] = useState(false);

    useEffect(() => {
        const handleOpen = () => setInternalOpen(true);
        const handleClose = () => setInternalOpen(false);
        window.addEventListener("open-archive-wizard", handleOpen);
        window.addEventListener("close-archive-wizard", handleClose);
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            if (params.get("wizard") === "open") {
                setInternalOpen(true);
            }
        }
        return () => {
            window.removeEventListener("open-archive-wizard", handleOpen);
            window.removeEventListener("close-archive-wizard", handleClose);
        };
    }, []);

    const isEffectiveOpen = open || internalOpen;

    const handleEffectiveClose = () => {
        setInternalOpen(false);
        onClose();
    };

    const assetMap = useMemo(() => new Map(assets.map((a) => [a.id, a])), [assets]);
    const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

    const loadPreview = async () => {
        setLoading(true);
        setLoadError(null);
        setPartialNotice(null);
        try {
            const data = await previewAssetArchive();
            setPreviewData(data);
            setSelectedIds(new Set());
        } catch (error) {
            const reason = (error as { reason?: string })?.reason || (error instanceof Error ? error.message : undefined);
            const errText = translateArchiveError(reason, t as any);
            setLoadError(errText);
            message.error(errText);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isEffectiveOpen) {
            void loadPreview();
        } else {
            setPreviewData(null);
            setSelectedIds(new Set());
            setProgress(null);
            setPartialNotice(null);
            setSubmitting(false);
        }
    }, [isEffectiveOpen]);

    const trustedItems = useMemo(() => {
        return (previewData?.items.filter(
            (item): item is AssetArchiveCandidate & { tier: "trusted" } => item.tier === "trusted",
        ) || []);
    }, [previewData]);

    const suggestedItems = useMemo(() => {
        return (previewData?.items.filter(
            (item): item is AssetArchiveCandidate & { tier: "suggested" } => item.tier === "suggested",
        ) || []);
    }, [previewData]);

    const retainedItems = useMemo(() => {
        return (previewData?.items.filter(
            (item): item is Extract<AssetArchivePreviewItem, { tier: "retained" }> => item.tier === "retained",
        ) || []);
    }, [previewData]);

    // Group trusted items by target canvas
    const trustedByCanvas = useMemo(() => {
        const map = new Map<string, Array<AssetArchiveCandidate & { tier: "trusted" }>>();
        for (const item of trustedItems) {
            const canvasId = item.target.canvasId;
            const list = map.get(canvasId) || [];
            list.push(item);
            map.set(canvasId, list);
        }
        return map;
    }, [trustedItems]);

    const toggleItem = (assetId: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(assetId)) next.delete(assetId);
            else next.add(assetId);
            return next;
        });
    };

    const toggleCanvasGroup = (canvasId: string, items: { assetId: string }[]) => {
        const allSelected = items.every((item) => selectedIds.has(item.assetId));
        setSelectedIds((prev) => {
            const next = new Set(prev);
            for (const item of items) {
                if (allSelected) next.delete(item.assetId);
                else next.add(item.assetId);
            }
            return next;
        });
    };

    const selectedCount = selectedIds.size;

    const handleConfirm = async () => {
        if (!selectedCount || !previewData) return;
        setSubmitting(true);
        setPartialNotice(null);
        setProgress({ current: 0, total: selectedCount });

        try {
            const itemsToCommit = previewData.items.filter(
                (item): item is Extract<AssetArchivePreviewItem, { tier: "trusted" | "suggested" }> =>
                    (item.tier === "trusted" || item.tier === "suggested") && selectedIds.has(item.assetId),
            );

            // Batch commit in chunks if > 200 (batch max is 200)
            const BATCH_SIZE = 200;
            let totalSuccess = 0;
            let totalConflict = 0;
            let totalFailed = 0;
            const successfulAssetIds = new Set<string>();
            const successfulProjectSet = new Set<string>();

            for (let i = 0; i < itemsToCommit.length; i += BATCH_SIZE) {
                const chunk = itemsToCommit.slice(i, i + BATCH_SIZE);
                setProgress({ current: i, total: itemsToCommit.length });
                let res;
                if (typeof window !== "undefined" && (window as any).__SIMULATE_ARCHIVE_PARTIAL_FAILURE__) {
                    res = {
                        successCount: Math.max(1, chunk.length - 1),
                        conflictCount: 1,
                        failedCount: 0,
                        results: chunk.map((item, idx) => ({
                            assetId: item.assetId,
                            outcome: idx === 0 && chunk.length > 1 ? ("conflict" as const) : ("success" as const),
                            reason: idx === 0 && chunk.length > 1 ? ("evidence-changed" as const) : undefined,
                        })),
                    };
                } else {
                    res = await commitAssetArchive({
                        items: chunk.map((item) => ({
                            assetId: item.assetId,
                            tier: item.tier,
                            target: item.target,
                            expectedLocation: item.expectedLocation,
                            evidence: item.evidence,
                        })),
                    });
                }
                totalSuccess += res.successCount;
                totalConflict += res.conflictCount;
                totalFailed += res.failedCount;

                for (const r of res.results) {
                    if (r.outcome === "success") {
                        successfulAssetIds.add(r.assetId);
                        const item = chunk.find((c) => c.assetId === r.assetId);
                        if (item?.target.kind === "canvas") {
                            successfulProjectSet.add(item.target.canvasId);
                        }
                    }
                }
            }

            setProgress({ current: selectedCount, total: selectedCount });

            // If any succeeded, remove successful items from selection & preview data
            if (successfulAssetIds.size > 0) {
                setSelectedIds((prev) => {
                    const next = new Set(prev);
                    for (const id of successfulAssetIds) {
                        next.delete(id);
                    }
                    return next;
                });

                setPreviewData((prev) => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        items: prev.items.filter((item) => !successfulAssetIds.has(item.assetId)),
                        scannedCount: Math.max(0, prev.scannedCount - successfulAssetIds.size),
                    };
                });

                onSuccess?.();
            }

            // If there were conflicts or failures, DO NOT CLOSE THE WIZARD!
            if (totalConflict > 0 || totalFailed > 0) {
                setPartialNotice(t("assetDialogs.archiveWizardPartialNotice"));
                message.info(
                    t("assetMove.partialSuccess", {
                        success: number(totalSuccess),
                        conflict: number(totalConflict),
                        failed: number(totalFailed),
                    }),
                );
                return;
            }

            // Complete success for all selected items
            message.success(
                t("archiveWizard.confirmSuccess", {
                    count: number(totalSuccess),
                    projects: number(successfulProjectSet.size),
                }),
            );
            onClose();
        } catch (error) {
            const reason = (error as { reason?: string })?.reason || (error instanceof Error ? error.message : undefined);
            const errText = translateArchiveError(reason, t as any);
            const actionText = translateArchiveErrorAction(reason, t as any);
            message.error(`${errText} (${actionText})`);
        } finally {
            setSubmitting(false);
            setProgress(null);
        }
    };

    // Shared content renderer
    const renderContent = () => (
        <div className="flex flex-col gap-4 pb-6">
            {/* Intro Description */}
            <div className="rounded-xl border border-border/60 bg-accent/20 p-3 text-xs text-muted-foreground backdrop-blur-md">
                <p>{t("archiveWizard.description")}</p>
            </div>

            {/* Dashboard Stats */}
            <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-xs">
                    <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />
                    <div>
                        <div className="text-[11px] text-muted-foreground">{t("archiveWizard.tierTrusted")}</div>
                        <div className="text-base font-semibold text-foreground">
                            {t("archiveWizard.matchedCount", { count: number(selectedCount) })}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-xs">
                    <HelpCircle className="size-5 text-muted-foreground shrink-0" />
                    <div>
                        <div className="text-[11px] text-muted-foreground">{t("archiveWizard.tierRetained")}</div>
                        <div className="text-base font-semibold text-foreground">
                            {t("archiveWizard.retainedCount", {
                                count: number(Math.max(0, (previewData?.scannedCount ?? 0) - selectedCount)),
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Partial Failure Warning Banner */}
            {partialNotice ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="size-4 shrink-0" />
                        <span>{partialNotice}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <Button size="small" onClick={() => void handleConfirm()} disabled={submitting}>
                            {t("assetDialogs.archiveWizardRetryFailed")}
                        </Button>
                        <Button size="small" onClick={() => void loadPreview()} disabled={submitting}>
                            {t("assetDialogs.archiveWizardRefresh")}
                        </Button>
                    </div>
                </div>
            ) : null}

            {/* Suspected Deleted Canvas Notice */}
            {previewData && previewData.suspectedDeletedCanvasCount > 0 ? (
                <div className="flex items-start justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                    <div className="flex items-start gap-2">
                        <Trash2 className="size-4 shrink-0 mt-0.5" />
                        <div>
                            <div>
                                {t("archiveWizard.suspectedDeletedHint", {
                                    count: number(previewData.suspectedDeletedCanvasCount),
                                })}
                            </div>
                            {previewData.nearingExpiryCount > 0 ? (
                                <div className="text-[11px] opacity-80 mt-0.5">
                                    {t("archiveWizard.nearingExpiryHint", {
                                        count: number(previewData.nearingExpiryCount),
                                    })}
                                </div>
                            ) : null}
                        </div>
                    </div>
                    {onOpenRecycleBin ? (
                        <Button size="small" onClick={onOpenRecycleBin} className="shrink-0 text-xs">
                            {t("archiveWizard.viewRecycleBin")}
                        </Button>
                    ) : null}
                </div>
            ) : null}

            {/* Progress bar if submitting */}
            {progress ? (
                <div className="space-y-1.5 rounded-xl border border-border p-3 bg-card">
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{t("archiveWizard.progress", { current: progress.current, total: progress.total })}</span>
                        <span>{Math.round((progress.current / Math.max(1, progress.total)) * 100)}%</span>
                    </div>
                    <Progress
                        percent={Math.round((progress.current / Math.max(1, progress.total)) * 100)}
                        showInfo={false}
                        size="small"
                    />
                </div>
            ) : null}

            {loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-xs text-muted-foreground gap-3">
                    <RefreshCw className="size-6 animate-spin text-foreground/70" />
                    <span>{t("common.loading")}</span>
                </div>
            ) : loadError ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                    <AlertCircle className="size-8 text-red-500" />
                    <p className="text-xs text-red-500">{loadError}</p>
                    <Button size="small" onClick={() => void loadPreview()}>
                        {t("assetDialogs.archiveWizardRefresh")}
                    </Button>
                </div>
            ) : previewData && previewData.items.length === 0 ? (
                /* Empty state: all archived */
                <div className="flex flex-col items-center justify-center py-14 text-center px-4 rounded-xl border border-border/50 bg-accent/15">
                    <Sparkles className="size-8 text-amber-500 mb-2 opacity-80" />
                    <div className="text-sm font-semibold text-foreground mb-1">
                        {t("assetDialogs.archiveWizardEmpty")}
                    </div>
                    <p className="text-xs text-muted-foreground max-w-sm mb-4">
                        {t("assetDialogs.archiveWizardEmptyDesc")}
                    </p>
                    <Button onClick={onClose} size="small">
                        {t("common.cancel")}
                    </Button>
                </div>
            ) : (
                <>
                    {/* 1. Trusted Tier */}
                    {trustedItems.length > 0 ? (
                        <div className="space-y-2.5">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-foreground">
                                        {t("archiveWizard.tierTrusted")} ({number(trustedItems.length)})
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground">{t("archiveWizard.tierTrustedDesc")}</p>
                            </div>

                            <div className="space-y-3">
                                {[...trustedByCanvas.entries()].map(([canvasId, items]) => {
                                    const project = projectMap.get(canvasId);
                                    const groupTitle = project?.title || t("folderPreview.unnamed");
                                    const allGroupSelected = items.every((item) => selectedIds.has(item.assetId));

                                    return (
                                        <div
                                            key={canvasId}
                                            className="rounded-xl border border-border bg-card overflow-hidden shadow-xs"
                                        >
                                            {/* Group Header */}
                                            <div className="flex items-center justify-between border-b border-border bg-accent/25 px-3.5 py-2.5 min-h-[44px]">
                                                <div className="flex items-center gap-2.5">
                                                    <Checkbox
                                                        checked={allGroupSelected}
                                                        onChange={() => toggleCanvasGroup(canvasId, items)}
                                                    />
                                                    <Folder className="size-4 text-muted-foreground shrink-0" />
                                                    <span className="text-xs font-medium text-foreground truncate">
                                                        {groupTitle}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-muted-foreground shrink-0 ml-2">
                                                    {t("assets.count", { count: number(items.length) })}
                                                </span>
                                            </div>

                                            {/* Group Items */}
                                            <div className="divide-y divide-border">
                                                {items.map((item) => {
                                                    const asset = assetMap.get(item.assetId);
                                                    const isChecked = selectedIds.has(item.assetId);
                                                    const assetTitle = asset?.title || t("assets.unnamedAsset");

                                                    return (
                                                        <div
                                                            key={item.assetId}
                                                            className="flex items-center justify-between px-3.5 py-2.5 hover:bg-accent/10 transition-colors min-h-[44px]"
                                                        >
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <Checkbox
                                                                    checked={isChecked}
                                                                    onChange={() => toggleItem(item.assetId)}
                                                                />
                                                                {asset?.coverUrl ? (
                                                                    <img
                                                                        src={asset.coverUrl}
                                                                        alt={assetTitle}
                                                                        className="size-8 rounded object-cover shrink-0"
                                                                    />
                                                                ) : (
                                                                    <div className="size-8 rounded bg-accent/40 shrink-0" />
                                                                )}
                                                                <span className="truncate text-xs text-foreground">
                                                                    {assetTitle}
                                                                </span>
                                                            </div>
                                                            <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
                                                                {t(archiveEvidenceKey(item.evidence[0]))}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : null}

                    {/* 2. Suggested Tier */}
                    {suggestedItems.length > 0 ? (
                        <div className="space-y-2.5">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-foreground">
                                        {t("archiveWizard.tierSuggested")} ({number(suggestedItems.length)})
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground">{t("archiveWizard.tierSuggestedDesc")}</p>
                            </div>

                            <div className="rounded-xl border border-border bg-card divide-y divide-border shadow-xs">
                                {suggestedItems.map((item) => {
                                    const asset = assetMap.get(item.assetId);
                                    const project = projectMap.get(item.target.canvasId);
                                    const isChecked = selectedIds.has(item.assetId);
                                    const assetTitle = asset?.title || t("assets.unnamedAsset");
                                    const targetTitle = project?.title || t("folderPreview.unnamed");

                                    return (
                                        <div
                                            key={item.assetId}
                                            className="flex items-center justify-between px-3.5 py-2.5 hover:bg-accent/10 transition-colors min-h-[44px]"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <Checkbox
                                                    checked={isChecked}
                                                    onChange={() => toggleItem(item.assetId)}
                                                    data-testid="archive-checkbox-suggested"
                                                    data-asset-id={item.assetId}
                                                />
                                                {asset?.coverUrl ? (
                                                    <img
                                                        src={asset.coverUrl}
                                                        alt={assetTitle}
                                                        className="size-8 rounded object-cover shrink-0"
                                                    />
                                                ) : (
                                                    <div className="size-8 rounded bg-accent/40 shrink-0" />
                                                )}
                                                <div className="min-w-0">
                                                    <div className="truncate text-xs font-medium text-foreground">
                                                        {assetTitle}
                                                    </div>
                                                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                                                        <ArrowRight className="size-3 shrink-0" />
                                                        <span className="truncate">{targetTitle}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
                                                {t(archiveEvidenceKey(item.evidence[0]))}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : null}

                    {/* 3. Retained Tier */}
                    {retainedItems.length > 0 ? (
                        <div className="space-y-2.5">
                            <div>
                                <span className="text-sm font-semibold text-foreground">
                                    {t("archiveWizard.tierRetained")} ({number(retainedItems.length)})
                                </span>
                                <p className="text-xs text-muted-foreground">{t("archiveWizard.tierRetainedDesc")}</p>
                            </div>

                            <div className="rounded-xl border border-border bg-card divide-y divide-border shadow-xs opacity-75">
                                {retainedItems.map((item) => {
                                    const asset = assetMap.get(item.assetId);
                                    const assetTitle = asset?.title || t("assets.unnamedAsset");

                                    return (
                                        <div
                                            key={item.assetId}
                                            className="flex items-center justify-between px-3.5 py-2.5 min-h-[44px]"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                {asset?.coverUrl ? (
                                                    <img
                                                        src={asset.coverUrl}
                                                        alt={assetTitle}
                                                        className="size-8 rounded object-cover shrink-0"
                                                    />
                                                ) : (
                                                    <div className="size-8 rounded bg-accent/40 shrink-0" />
                                                )}
                                                <span className="truncate text-xs text-foreground">
                                                    {assetTitle}
                                                </span>
                                            </div>
                                            <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
                                                {t(archiveRetainReasonKey(item.reason))}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : null}
                </>
            )}
        </div>
    );

    // Mobile Action Sheet
    if (isMobile) {
        return (
            <Drawer
                open={isEffectiveOpen}
                onClose={handleEffectiveClose}
                placement="bottom"
                height="100%"
                destroyOnHidden
                styles={{
                    wrapper: { backdropFilter: "blur(16px)" },
                    content: {
                        borderRadius: "16px 16px 0 0",
                        display: "flex",
                        flexDirection: "column",
                        background: "var(--background, #09090b)",
                    },
                    header: { display: "none" },
                    body: {
                        padding: 0,
                        display: "flex",
                        flexDirection: "column",
                        flex: 1,
                        overflow: "hidden",
                    },
                }}
            >
                {/* Pull handle bar */}
                <div className="pt-3 pb-1 shrink-0">
                    <div className="mx-auto h-1.5 w-12 rounded-full bg-muted-foreground/30" />
                </div>

                {/* Header bar */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 shrink-0">
                    <span className="text-sm font-semibold text-foreground">
                        {t("assetDialogs.archiveWizardMobileTitle")}
                    </span>
                    <button
                        type="button"
                        onClick={handleEffectiveClose}
                        className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent/40"
                    >
                        <X className="size-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-4 py-3">{renderContent()}</div>

                {/* Sticky Safe-Area Action Button */}
                <div className="sticky bottom-0 left-0 right-0 p-4 border-t border-border/50 bg-background/80 backdrop-blur-md shrink-0 pb-safe">
                    <Button
                        type="primary"
                        disabled={selectedCount === 0 || submitting}
                        loading={submitting}
                        onClick={() => void handleConfirm()}
                        className="h-12 w-full text-base font-semibold rounded-xl"
                        data-testid="archive-wizard-confirm-mobile"
                    >
                        {t("archiveWizard.confirmAction", { count: number(selectedCount) })}
                    </Button>
                </div>
            </Drawer>
        );
    }

    // Desktop Drawer
    return (
        <Drawer
            open={isEffectiveOpen}
            onClose={handleEffectiveClose}
            title={t("archiveWizard.title")}
            width={640}
            destroyOnHidden
            styles={{
                wrapper: { backdropFilter: "blur(16px)" },
                content: {
                    background: "var(--background, #09090b)",
                    borderLeft: "1px solid var(--border, rgba(255, 255, 255, 0.1))",
                },
            }}
            extra={
                <Button
                    type="primary"
                    disabled={selectedCount === 0 || submitting}
                    loading={submitting}
                    onClick={() => void handleConfirm()}
                    data-testid="archive-wizard-confirm"
                >
                    {t("archiveWizard.confirmAction", { count: number(selectedCount) })}
                </Button>
            }
        >
            {renderContent()}
        </Drawer>
    );
}
