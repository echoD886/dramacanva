import React, { useEffect, useState, useCallback } from "react";
import { App, Button, Modal, Drawer } from "antd";
import { AlertCircle, ShieldCheck, LoaderCircle, AlertTriangle, X } from "lucide-react";

import { useAssetStore } from "@/stores/use-asset-store";
import { useCanvasUiStore } from "@/stores/canvas/use-canvas-ui-store";
import { deleteCanvasProjectsWithRemoteSync } from "@/services/user-data-sync";
import { preflightCanvasDelete } from "@/services/asset-archive";
import type { CanvasDeletePreflightResponse } from "@/types/asset-archive";
import { useI18n } from "@/i18n/use-i18n";
import type { MessageKey } from "@/i18n/messages";

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

export function CanvasDeleteProjectsDialog() {
    const { t, number } = useDialogI18n();
    const { message } = App.useApp();
    const isMobile = useIsMobile(768);

    const ids = useCanvasUiStore((state) => state.deleteProjectIds);
    const setDeleteIds = useCanvasUiStore((state) => state.setDeleteProjectIds);
    const removeSelectedIds = useCanvasUiStore((state) => state.removeSelectedProjectIds);
    const cleanupImages = useAssetStore((state) => state.cleanupImages);

    const [deleting, setDeleting] = useState(false);
    const [preflightStatus, setPreflightStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
    const [preflight, setPreflight] = useState<CanvasDeletePreflightResponse | null>(null);
    const [preflightForIds, setPreflightForIds] = useState<string[]>([]);
    const [retryCount, setRetryCount] = useState(0);

    useEffect(() => {
        // Immediately clear old result when IDs change to avoid using outdated preflight
        setPreflight(null);
        setPreflightForIds([]);

        if (!ids.length) {
            setPreflightStatus("idle");
            return;
        }

        setPreflightStatus("loading");
        const currentIds = [...ids];
        const controller = new AbortController();
        let cancelled = false;

        void preflightCanvasDelete(currentIds, controller.signal)
            .then((result) => {
                if (!cancelled) {
                    setPreflight(result);
                    setPreflightForIds(currentIds);
                    setPreflightStatus("ready");
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setPreflight(null);
                    setPreflightForIds([]);
                    setPreflightStatus("error");
                }
            });

        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [ids, retryCount]);

    const handleRetryPreflight = () => {
        setRetryCount((c) => c + 1);
    };

    const confirm = async () => {
        if (!canConfirm) return;
        setDeleting(true);
        try {
            await deleteCanvasProjectsWithRemoteSync(ids);
            void cleanupImages();
            removeSelectedIds(ids);
            setDeleteIds([]);
        } catch (error) {
            message.error(
                error instanceof Error
                    ? t("canvasExtra.deleteProjects.failedWithReason", { reason: error.message })
                    : t("canvasExtra.deleteProjects.failed"),
            );
        } finally {
            setDeleting(false);
        }
    };

    const toUnfiledCount = preflight?.toUnfiledCount ?? 0;
    const hasBlocked = (preflight?.blocked?.length ?? 0) > 0;
    // Strict binding to current ids and ready status
    const isReady =
        preflightStatus === "ready" &&
        preflightForIds.length === ids.length &&
        ids.every((id, idx) => preflightForIds[idx] === id);
    // Explicitly block confirmation if preflight is not ready, has error, or is blocked by active tasks
    const canConfirm = !deleting && isReady && !hasBlocked;

    const renderDialogContent = () => (
        <div className="space-y-3.5 py-1">
            <p className="text-sm text-muted-foreground leading-relaxed">
                {t("canvasExtra.deleteProjects.description", { count: number(ids.length) })}
            </p>

            {/* Preflight status */}
            {preflightStatus === "loading" ? (
                <div className="flex items-center gap-2.5 rounded-xl border border-border bg-accent/20 p-3 text-xs text-muted-foreground">
                    <LoaderCircle className="size-4 animate-spin shrink-0 text-foreground" />
                    <span>{t("assetDialogs.deletePreflightLoading")}</span>
                </div>
            ) : preflightStatus === "error" ? (
                <div className="flex items-center justify-between gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="size-4 shrink-0" />
                        <span>{t("assetDialogs.deletePreflightError")}</span>
                    </div>
                    <Button size="small" onClick={handleRetryPreflight} className="shrink-0 text-xs">
                        {t("assetDialogs.deletePreflightRetry")}
                    </Button>
                </div>
            ) : isReady && !hasBlocked ? (
                /* Safe Preservation Notice (Design F.2 & G) */
                <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-300">
                    <ShieldCheck className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                    <div>
                        <div className="font-semibold">
                            {toUnfiledCount > 0
                                ? t("assetDialogs.deleteSafePreserveNotice", { count: number(toUnfiledCount) })
                                : t("canvasDelete.assetsSafeHint", { count: number(toUnfiledCount) })}
                        </div>
                    </div>
                </div>
            ) : null}

            {/* Blocked warning if any generation tasks are active */}
            {hasBlocked ? (
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <div className="space-y-1">
                        <div className="font-semibold">{t("canvasDelete.blockedWarning")}</div>
                        <p className="opacity-90 leading-normal">{t("assetDialogs.deleteBlockedNotice")}</p>
                    </div>
                </div>
            ) : null}
        </div>
    );

    // Mobile Action Sheet
    if (isMobile) {
        return (
            <Drawer
                open={ids.length > 0}
                onClose={() => setDeleteIds([])}
                placement="bottom"
                height="auto"
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
                        {t("assetDialogs.deleteModalMobileTitle")}
                    </span>
                    <button
                        type="button"
                        onClick={() => setDeleteIds([])}
                        className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent/40"
                    >
                        <X className="size-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="px-4 py-3">{renderDialogContent()}</div>

                {/* Actions */}
                <div className="flex flex-col gap-2 p-3.5 border-t border-border/50 bg-background/80 backdrop-blur-md pb-safe">
                    <Button
                        danger
                        type="primary"
                        loading={deleting}
                        disabled={!canConfirm}
                        onClick={() => void confirm()}
                        className="h-11 w-full text-sm font-semibold rounded-xl"
                    >
                        {toUnfiledCount > 0
                            ? t("canvasDelete.confirmWithPreserve")
                            : t("canvasExtra.deleteProjects.delete")}
                    </Button>
                    <Button
                        onClick={() => setDeleteIds([])}
                        disabled={deleting}
                        className="h-11 w-full text-sm rounded-xl"
                    >
                        {t("canvasExtra.deleteProjects.cancel")}
                    </Button>
                </div>
            </Drawer>
        );
    }

    // Desktop Modal
    return (
        <Modal
            title={t("canvasExtra.deleteProjects.title")}
            open={ids.length > 0}
            onCancel={() => setDeleteIds([])}
            width={480}
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
                    <Button onClick={() => setDeleteIds([])} disabled={deleting}>
                        {t("canvasExtra.deleteProjects.cancel")}
                    </Button>
                    <Button
                        danger
                        type="primary"
                        loading={deleting}
                        disabled={!canConfirm}
                        onClick={() => void confirm()}
                    >
                        {toUnfiledCount > 0
                            ? t("canvasDelete.confirmWithPreserve")
                            : t("canvasExtra.deleteProjects.delete")}
                    </Button>
                </div>
            }
        >
            {renderDialogContent()}
        </Modal>
    );
}
