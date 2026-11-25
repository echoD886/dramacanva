import React from "react";
import { Dropdown } from "antd";
import { ChevronDown, Search, X } from "lucide-react";

import type { AssetCategory, AssetKind } from "@/stores/use-asset-store";
import type { AssetSection } from "@/types/asset-archive";
import { ASSET_SECTIONS } from "@/types/asset-archive";
import { assetSectionKey } from "@/i18n/asset-archive-messages";
import { useDetailI18n } from "./folder-detail-i18n";
import { cn } from "@/lib/utils";

export interface FolderDetailTabsProps {
    currentSection: AssetSection | "pending";
    onSectionChange: (section: AssetSection | "pending") => void;
    sectionCounts: Record<string, number>;
    kindFilter: AssetKind | "all";
    onKindChange: (kind: AssetKind | "all") => void;
    kindCounts: Record<string, number>;
    keyword: string;
    onKeywordChange: (keyword: string) => void;
}

export function FolderDetailTabs({
    currentSection,
    onSectionChange,
    sectionCounts,
    kindFilter,
    onKindChange,
    kindCounts,
    keyword,
    onKeywordChange,
}: FolderDetailTabsProps) {
    const { t, number } = useDetailI18n();

    const kindMenuItems = [
        { key: "all", label: `${t("assets.kindAll")} (${kindCounts.all || 0})` },
        { key: "image", label: `${t("assets.kindImage")} (${kindCounts.image || 0})` },
        { key: "video", label: `${t("assets.kindVideo")} (${kindCounts.video || 0})` },
        { key: "audio", label: `${t("assets.kindAudio")} (${kindCounts.audio || 0})` },
        { key: "text", label: `${t("assets.kindText")} (${kindCounts.text || 0})` },
    ];

    return (
        <div className="sticky top-0 z-20 flex flex-col gap-2.5 bg-background/85 py-2.5 backdrop-blur-md transition-colors">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                {/* 1. Category Section Pills (Smooth Horizontal scrolling on mobile) */}
                <nav
                    aria-label="Asset Sections"
                    className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 touch-pan-x flex-nowrap min-w-0"
                >
                    {ASSET_SECTIONS.map((sec) => {
                        const count = sectionCounts[sec] || 0;
                        const active = currentSection === sec;
                        return (
                            <button
                                key={sec}
                                type="button"
                                onClick={() => onSectionChange(sec)}
                                style={
                                    active
                                        ? {
                                              backgroundColor: "var(--foreground, #09090b)",
                                              color: "var(--background, #ffffff)",
                                          }
                                        : undefined
                                }
                                className={cn(
                                    "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all select-none cursor-pointer",
                                    active
                                        ? "bg-foreground text-background font-semibold shadow-xs"
                                        : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground",
                                )}
                            >
                                <span style={active ? { color: "var(--background, #ffffff)" } : undefined}>
                                    {t(assetSectionKey(sec))}
                                </span>
                                <span
                                    style={active ? { color: "var(--background, #ffffff)", opacity: 0.85 } : undefined}
                                    className={cn(
                                        "text-[10px] tabular-nums",
                                        active ? "font-bold" : "opacity-60",
                                    )}
                                >
                                    {count}
                                </span>
                            </button>
                        );
                    })}

                    {/* Pending Review Section Pill (shows amber indicator) */}
                    {sectionCounts.pending > 0 ? (
                        <button
                            type="button"
                            onClick={() => onSectionChange("pending")}
                            style={
                                currentSection === "pending"
                                    ? {
                                          backgroundColor: "var(--foreground, #09090b)",
                                          color: "var(--background, #ffffff)",
                                      }
                                    : undefined
                            }
                            className={cn(
                                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all select-none border cursor-pointer",
                                currentSection === "pending"
                                    ? "bg-foreground text-background border-foreground font-semibold shadow-xs"
                                    : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20",
                            )}
                        >
                            <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <span style={currentSection === "pending" ? { color: "var(--background, #ffffff)" } : undefined}>
                                {t("assetClassification.pendingReview")}
                            </span>
                            <span
                                style={currentSection === "pending" ? { color: "var(--background, #ffffff)", opacity: 0.85 } : undefined}
                                className="text-[10px] font-bold tabular-nums"
                            >
                                {sectionCounts.pending}
                            </span>
                        </button>
                    ) : null}
                </nav>

                {/* 2. Type Filter & Search Box */}
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                    <Dropdown
                        menu={{
                            items: kindMenuItems,
                            selectedKeys: [kindFilter],
                            onClick: ({ key }) => onKindChange(key as AssetKind | "all"),
                        }}
                        trigger={["click"]}
                        placement="bottomRight"
                    >
                        <button
                            type="button"
                            className={cn(
                                "flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs transition-colors outline-none cursor-pointer",
                                kindFilter !== "all"
                                    ? "border-foreground bg-accent/60 font-semibold text-foreground"
                                    : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent/40",
                            )}
                        >
                            <span>
                                {t("assets.labelKind")}:{" "}
                                {
                                    kindFilter === "all" ? t("assets.kindAll")
                                    : kindFilter === "image" ? t("assets.kindImage")
                                    : kindFilter === "video" ? t("assets.kindVideo")
                                    : kindFilter === "audio" ? t("assets.kindAudio")
                                    : t("assets.kindText")
                                }
                            </span>
                            <ChevronDown className="size-3 text-muted-foreground" />
                        </button>
                    </Dropdown>

                    <div className="relative flex-1 sm:w-56">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder={t("assets.searchInFolder")}
                            value={keyword}
                            onChange={(e) => onKeywordChange(e.target.value)}
                            className="h-8 w-full rounded-lg border border-border bg-card pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-foreground transition-all"
                        />
                        {keyword ? (
                            <button
                                type="button"
                                onClick={() => onKeywordChange("")}
                                aria-label="Clear search"
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="size-3.5" />
                            </button>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}
