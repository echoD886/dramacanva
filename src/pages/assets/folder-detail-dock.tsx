import React from "react";
import { Button } from "antd";
import { ExternalLink, FolderInput, Download, FolderMinus, Trash2, X } from "lucide-react";

import { useDetailI18n } from "./folder-detail-i18n";

export interface FolderDetailDockProps {
    mode: "folder" | "unfiled" | "trash";
    selectedCount: number;
    onUseInCanvas: () => void;
    onOpenMoveModal: () => void;
    onBatchExport: () => void;
    onMoveOutToUnfiled?: () => void;
    onBatchDelete: () => void;
    onClearSelection: () => void;
}

export function FolderDetailDock({
    mode,
    selectedCount,
    onUseInCanvas,
    onOpenMoveModal,
    onBatchExport,
    onMoveOutToUnfiled,
    onBatchDelete,
    onClearSelection,
}: FolderDetailDockProps) {
    const { t, dt, number } = useDetailI18n();

    if (selectedCount <= 0) return null;

    return (
        <aside
            role="toolbar"
            aria-label={dt("assetDetail.selectedCount", { count: number(selectedCount) })}
            className="folder-detail-floating-dock fixed bottom-6 left-1/2 z-40 flex max-w-[95vw] -translate-x-1/2 items-center gap-1.5 sm:gap-2 rounded-full border border-white/10 bg-neutral-900/90 px-3.5 py-2 text-white shadow-2xl dark:border-white/20"
        >
            {/* Selected Count Capsule */}
            <span className="shrink-0 text-xs font-semibold px-1 tabular-nums">
                {dt("assetDetail.selectedCount", { count: number(selectedCount) })}
            </span>

            <div className="h-4 w-px bg-white/20 shrink-0" aria-hidden="true" />

            {/* 1. Use in Canvas (Leader Correction: open folder canvas and handoff) */}
            <Button
                size="small"
                type="text"
                icon={<ExternalLink className="size-3.5" />}
                className="text-white hover:text-white hover:bg-white/15 transition-colors font-medium text-xs px-2 sm:px-2.5"
                onClick={onUseInCanvas}
            >
                <span>{dt("assetDetail.useInCanvas")}</span>
            </Button>

            {/* 2. Move to folder */}
            <Button
                data-batch-move="true"
                size="small"
                type="text"
                icon={<FolderInput className="size-3.5" />}
                className="text-white hover:text-white hover:bg-white/15 transition-colors font-medium text-xs px-2 sm:px-2.5"
                onClick={onOpenMoveModal}
            >
                <span>{t("assetMove.confirmAction")}...</span>
            </Button>

            {/* 3. Export */}
            <Button
                size="small"
                type="text"
                icon={<Download className="size-3.5" />}
                className="text-white hover:text-white hover:bg-white/15 transition-colors font-medium text-xs px-2 sm:px-2.5"
                onClick={onBatchExport}
            >
                {t("canvasCard.export")}
            </Button>

            {/* 4. Remove from folder (in folder mode) */}
            {mode === "folder" && onMoveOutToUnfiled ? (
                <Button
                    size="small"
                    type="text"
                    icon={<FolderMinus className="size-3.5" />}
                    className="text-white hover:text-white hover:bg-white/15 transition-colors font-medium text-xs px-2 sm:px-2.5"
                    onClick={onMoveOutToUnfiled}
                >
                    <span className="hidden sm:inline">{t("assets.removeFromFolder")}</span>
                    <span className="sm:hidden">{t("assets.unfiledTitle")}</span>
                </Button>
            ) : null}

            {/* 5. Batch Delete */}
            <Button
                size="small"
                type="text"
                danger
                icon={<Trash2 className="size-3.5" />}
                className="hover:bg-red-500/25 transition-colors font-medium text-xs px-2 sm:px-2.5"
                onClick={onBatchDelete}
            >
                {t("common.delete")}
            </Button>

            {/* 6. Cancel / Close selection */}
            <button
                type="button"
                onClick={onClearSelection}
                title={dt("assetDetail.exitSelect")}
                className="flex size-6 items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/20 transition-colors ml-1"
            >
                <X className="size-3.5" />
            </button>
        </aside>
    );
}
