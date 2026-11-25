import React, { useState, useMemo, useCallback } from "react";
import { App, Button, Input, Modal, Drawer } from "antd";
import { Folder, Inbox, Search, Check, AlertCircle, X, RefreshCw } from "lucide-react";

import { useCanvasStore } from "@/stores/canvas/use-canvas-store";
import { useAssetStore } from "@/stores/use-asset-store";
import { moveAssets, primaryLocationOf, samePrimaryLocation } from "@/services/asset-archive";
import type { AssetPrimaryLocation } from "@/types/asset-archive";
import { ASSET_ARCHIVE_BATCH_MAX } from "@/types/asset-archive";
import {
    archiveErrorActionKey,
    translateArchiveError,
    translateArchiveErrorAction,
} from "@/i18n/asset-archive-messages";
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

    React.useEffect(() => {
        const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        setIsMobile(mql.matches);
        mql.addEventListener("change", handler);
        return () => mql.removeEventListener("change", handler);
    }, [breakpoint]);

    return isMobile;
}

export type AssetMoveModalProps = {
    open: boolean;
    assetIds: string[];
    onClose: () => void;
    onSuccess?: () => void;
};

export function AssetMoveModal({ open, assetIds, onClose, onSuccess }: AssetMoveModalProps) {
    const { t, number } = useDialogI18n();
    const { message } = App.useApp();
    const isMobile = useIsMobile(768);

    const projects = useCanvasStore((state) => state.projects);
    const assets = useAssetStore((state) => state.assets);

    const [keyword, setKeyword] = useState("");
    const [selectedTarget, setSelectedTarget] = useState<AssetPrimaryLocation | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [errorBanner, setErrorBanner] = useState<{
        message: string;
        actionKey: MessageKey;
        actionText: string;
    } | null>(null);

    React.useEffect(() => {
        if (open) {
            setKeyword("");
            setSelectedTarget(null);
            setSubmitting(false);
            setErrorBanner(null);
        }
    }, [open]);

    const selectedAssetRecords = useMemo(() => {
        const idSet = new Set(assetIds);
        return assets.filter((asset) => idSet.has(asset.id));
    }, [assets, assetIds]);

    // Check if all selected assets share a common location
    const commonLocation = useMemo(() => {
        if (!selectedAssetRecords.length) return null;
        try {
            const first = primaryLocationOf(selectedAssetRecords[0]);
            const allSame = selectedAssetRecords.every((a) => {
                try {
                    return samePrimaryLocation(first, primaryLocationOf(a));
                } catch {
                    return false;
                }
            });
            return allSame ? first : null;
        } catch {
            return null;
        }
    }, [selectedAssetRecords]);

    const filteredProjects = useMemo(() => {
        const query = keyword.trim().toLowerCase();
        if (!query) return projects;
        return projects.filter((p) => (p.title || "").toLowerCase().includes(query));
    }, [projects, keyword]);

    const handleConfirm = async () => {
        if (!selectedTarget || !assetIds.length) return;
        setSubmitting(true);
        setErrorBanner(null);
        try {
            const expectedLocations: Record<string, AssetPrimaryLocation> = {};
            for (const asset of selectedAssetRecords) {
                expectedLocations[asset.id] = primaryLocationOf(asset);
            }

            const aggregated = {
                results: [] as Awaited<ReturnType<typeof moveAssets>>["results"],
                successCount: 0,
                conflictCount: 0,
                failedCount: 0,
            };

            // Chunk in batches of ASSET_ARCHIVE_BATCH_MAX (200)
            for (let i = 0; i < assetIds.length; i += ASSET_ARCHIVE_BATCH_MAX) {
                const chunkIds = assetIds.slice(i, i + ASSET_ARCHIVE_BATCH_MAX);
                const chunkExpected: Record<string, AssetPrimaryLocation> = {};
                for (const id of chunkIds) {
                    if (expectedLocations[id]) chunkExpected[id] = expectedLocations[id];
                }
                const response = await moveAssets({
                    assetIds: chunkIds,
                    target: selectedTarget,
                    expectedLocations: chunkExpected,
                });
                aggregated.results.push(...response.results);
                aggregated.successCount += response.successCount;
                aggregated.conflictCount += response.conflictCount;
                aggregated.failedCount += response.failedCount;
            }

            if (aggregated.conflictCount === aggregated.results.length) {
                const reason = "location-conflict";
                const errText = translateArchiveError(reason, t as any);
                const actionKey = archiveErrorActionKey(reason);
                const actionText = translateArchiveErrorAction(reason, t as any);
                setErrorBanner({ message: errText, actionKey, actionText });
                message.warning(t("assetMove.allConflict"));
                return;
            }

            if (aggregated.conflictCount > 0 || aggregated.failedCount > 0) {
                message.info(
                    t("assetMove.partialSuccess", {
                        success: number(aggregated.successCount),
                        conflict: number(aggregated.conflictCount),
                        failed: number(aggregated.failedCount),
                    }),
                );
                if (aggregated.successCount > 0) {
                    onSuccess?.();
                }
                return;
            }

            message.success(t("assetMove.success", { count: number(aggregated.successCount) }));
            onSuccess?.();
            onClose();
        } catch (error) {
            const reason =
                (error as { reason?: string })?.reason ||
                (error as { data?: { reason?: string } })?.data?.reason ||
                (error instanceof Error ? error.message : undefined);
            const errText = translateArchiveError(reason, t as any);
            const actionKey = archiveErrorActionKey(reason);
            const actionText = translateArchiveErrorAction(reason, t as any);
            setErrorBanner({ message: errText, actionKey, actionText });
            message.error(`${errText} (${actionText})`);
        } finally {
            setSubmitting(false);
        }
    };

    const handleActionRecovery = () => {
        if (!errorBanner) return;
        if (errorBanner.actionKey === "archiveAction.refresh") {
            setErrorBanner(null);
            onSuccess?.();
        } else if (errorBanner.actionKey === "archiveAction.reselect") {
            setSelectedTarget(null);
            setErrorBanner(null);
        } else {
            void handleConfirm();
        }
    };

    // Shared list content
    const renderListContent = () => (
        <div className="flex flex-col gap-3 py-1">
            {/* Search Input */}
            <Input
                prefix={<Search className="size-4 text-muted-foreground mr-1 shrink-0" />}
                placeholder={t("assetDialogs.moveFolderSearchPlaceholder")}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                allowClear
                className="h-10 sm:h-9 text-sm rounded-lg"
            />

            {/* Error Recovery Banner */}
            {errorBanner ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-500">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="size-4 shrink-0" />
                        <span>{errorBanner.message}</span>
                    </div>
                    <Button size="small" onClick={handleActionRecovery} className="shrink-0 text-xs">
                        {errorBanner.actionText}
                    </Button>
                </div>
            ) : null}

            <div className="max-h-80 overflow-y-auto space-y-4 pr-1">
                {/* 1. Canvas Projects Group */}
                <div>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("assetMove.canvasProjectsGroup")}
                    </div>
                    {filteredProjects.length === 0 ? (
                        <div className="py-4 text-center text-xs text-muted-foreground">
                            {keyword.trim() ? (
                                <div className="space-y-1.5">
                                    <p>{t("assetDialogs.moveFolderSearchEmpty")}</p>
                                    <button
                                        type="button"
                                        onClick={() => setKeyword("")}
                                        className="text-foreground underline cursor-pointer"
                                    >
                                        {t("common.cancel")}
                                    </button>
                                </div>
                            ) : (
                                <p>{t("assetDialogs.moveFolderNoProjects")}</p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredProjects.map((p) => {
                                const isCurrent = commonLocation?.kind === "canvas" && commonLocation.canvasId === p.id;
                                const isSelected = selectedTarget?.kind === "canvas" && selectedTarget.canvasId === p.id;
                                const title = p.title || t("folderPreview.unnamed");

                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        disabled={isCurrent}
                                        onClick={() => setSelectedTarget({ kind: "canvas", canvasId: p.id })}
                                        className={cn(
                                            "flex w-full items-center justify-between rounded-lg px-3.5 py-2.5 sm:py-2 text-left text-xs transition-colors cursor-pointer select-none min-h-[44px]",
                                            isSelected
                                                ? "bg-foreground text-background font-medium"
                                                : isCurrent
                                                  ? "opacity-45 cursor-not-allowed bg-accent/20"
                                                  : "hover:bg-accent text-foreground",
                                        )}
                                    >
                                        <div className="flex items-center gap-2.5 truncate">
                                            <Folder className="size-4 shrink-0" />
                                            <span className="truncate">{title}</span>
                                        </div>
                                        {isCurrent ? (
                                            <span className="text-[11px] text-muted-foreground">
                                                {t("assetMove.currentLocation")}
                                            </span>
                                        ) : isSelected ? (
                                            <Check className="size-4 shrink-0" />
                                        ) : null}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* 2. System Location Group (Move to Unfiled) */}
                <div>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("assetMove.systemLocationGroup")}
                    </div>
                    <div className="space-y-1">
                        {(() => {
                            const isCurrent = commonLocation?.kind === "unfiled";
                            const isSelected = selectedTarget?.kind === "unfiled";

                            return (
                                <button
                                    type="button"
                                    disabled={isCurrent}
                                    onClick={() => setSelectedTarget({ kind: "unfiled" })}
                                    className={cn(
                                        "flex w-full items-center justify-between rounded-lg px-3.5 py-2.5 sm:py-2 text-left text-xs transition-colors cursor-pointer select-none min-h-[44px]",
                                        isSelected
                                            ? "bg-foreground text-background font-medium"
                                            : isCurrent
                                              ? "opacity-45 cursor-not-allowed bg-accent/20"
                                              : "hover:bg-accent text-foreground",
                                    )}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <Inbox className="size-4 shrink-0" />
                                        <div>
                                            <div className="font-medium">{t("assetMove.moveToUnfiled")}</div>
                                            <div
                                                className={cn(
                                                    "text-[11px]",
                                                    isSelected ? "text-background/80" : "text-muted-foreground",
                                                )}
                                            >
                                                {t("assetMove.moveToUnfiledDesc")}
                                            </div>
                                        </div>
                                    </div>
                                    {isCurrent ? (
                                        <span className="text-[11px] text-muted-foreground">
                                            {t("assetMove.currentLocation")}
                                        </span>
                                    ) : isSelected ? (
                                        <Check className="size-4 shrink-0" />
                                    ) : null}
                                </button>
                            );
                        })()}
                    </div>
                </div>
            </div>
        </div>
    );

    // Mobile Sheet
    if (isMobile) {
        return (
            <Drawer
                open={open}
                onClose={onClose}
                placement="bottom"
                height="82%"
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
                        {t("assetDialogs.moveFolderMobileTitle")} ({number(assetIds.length)})
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent/40"
                    >
                        <X className="size-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-4 py-3">{renderListContent()}</div>

                {/* Sticky Safe-Area Action Button */}
                <div className="sticky bottom-0 left-0 right-0 p-4 border-t border-border/50 bg-background/80 backdrop-blur-md shrink-0 pb-safe">
                    <Button
                        type="primary"
                        loading={submitting}
                        disabled={!selectedTarget}
                        onClick={() => void handleConfirm()}
                        className="h-12 w-full text-base font-semibold rounded-xl"
                    >
                        {t("assetMove.confirmAction")}
                    </Button>
                </div>
            </Drawer>
        );
    }

    // Desktop Modal
    return (
        <Modal
            open={open}
            onCancel={onClose}
            title={t("assetMove.title", { count: number(assetIds.length) })}
            width={520}
            destroyOnHidden
            styles={{
                wrapper: { backdropFilter: "blur(16px)" },
                container: {
                    borderRadius: "16px",
                    background: "var(--background, #09090b)",
                    border: "1px solid var(--border, rgba(255, 255, 255, 0.1))",
                },
            }}
            footer={
                <div className="flex items-center justify-end gap-2 px-1 py-1">
                    <Button onClick={onClose} disabled={submitting}>
                        {t("common.cancel")}
                    </Button>
                    <Button
                        type="primary"
                        loading={submitting}
                        disabled={!selectedTarget}
                        onClick={() => void handleConfirm()}
                    >
                        {t("assetMove.confirmAction")}
                    </Button>
                </div>
            }
        >
            {renderListContent()}
        </Modal>
    );
}
