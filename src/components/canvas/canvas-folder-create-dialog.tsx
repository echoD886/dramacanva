import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { App, Button, Input, Modal, Drawer } from "antd";
import { Upload, Check, AlertCircle, X, Loader2 } from "lucide-react";

import type { CanvasFolderStyle } from "@/types/canvas";
import type { FolderCover, FolderPresentation, FolderPreviewItem } from "@/types/asset-archive";
import { DEFAULT_FOLDER_STYLE } from "@/types/asset-archive";
import { createCanvasFolderCommand } from "@/services/canvas-folder-create";
import { uploadImage } from "@/services/image-storage";
import { useAssetStore, type NewAsset } from "@/stores/use-asset-store";
import { useI18n } from "@/i18n/use-i18n";
import type { MessageKey } from "@/i18n/messages";
import { cn } from "@/lib/utils";
import { ProjectFolderPresentation } from "./project-folder-preview";
import { FOLDER_STYLES } from "@/lib/canvas/folder-presentation";
import { getHubText } from "./project-folder-i18n";

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

export type CanvasFolderCreateDialogProps = {
    open: boolean;
    onClose: () => void;
    onCreated?: (projectId: string) => void;
    initialTitle?: string;
    initialStyle?: CanvasFolderStyle;
    projectId?: string;
};


const PREVIEW_SAMPLE_ITEMS: FolderPreviewItem[] = [
    {
        assetId: "sample-preview-1",
        thumbnailUrl: "/images/folders/previews/canyon.webp",
        kind: "image",
    },
    {
        assetId: "sample-preview-2",
        thumbnailUrl: "/images/folders/previews/mountain.webp",
        kind: "image",
    },
    {
        assetId: "sample-preview-3",
        thumbnailUrl: "/images/folders/previews/dunes.webp",
        kind: "image",
    },
];


export function CanvasFolderCreateDialog({
    open,
    onClose,
    onCreated,
    initialTitle = "",
    initialStyle,
    projectId,
}: CanvasFolderCreateDialogProps) {
    const { t, locale } = useDialogI18n();
    const { message } = App.useApp();
    const isMobile = useIsMobile(768);
    const assets = useAssetStore((state) => state.assets);

    const [title, setTitle] = useState(initialTitle);
    const [style, setStyle] = useState<CanvasFolderStyle>(initialStyle || DEFAULT_FOLDER_STYLE);
    const [coverMode, setCoverMode] = useState<"auto" | "upload" | "asset">("auto");
    const [uploadedCover, setUploadedCover] = useState<NewAsset | null>(null);
    const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState<string>("");
    const [selectedAssetId, setSelectedAssetId] = useState<string>("");
    const [uploadError, setUploadError] = useState<string>("");
    const [isUploadingCover, setIsUploadingCover] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => () => { if (uploadedPreviewUrl.startsWith("blob:")) URL.revokeObjectURL(uploadedPreviewUrl); }, [uploadedPreviewUrl]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    // Keep draft command across retry attempts to preserve created project ID and prevent duplicates
    const draftCommandRef = useRef<ReturnType<typeof createCanvasFolderCommand> | null>(null);

    // Available image assets for picking
    const availableImageAssets = useMemo(() => {
        return assets.filter((asset) => asset.kind === "image" && asset.status !== "archived" && asset.coverUrl);
    }, [assets]);

    const selectedAsset = useMemo(() => {
        return availableImageAssets.find((a) => a.id === selectedAssetId);
    }, [availableImageAssets, selectedAssetId]);

    // Live preview cover calculation
    const previewCoverUrl = useMemo(() => {
        if (coverMode === "upload") return uploadedPreviewUrl;
        if (coverMode === "asset") return selectedAsset?.coverUrl;
        return undefined; // auto uses theme background in preview
    }, [coverMode, uploadedPreviewUrl, selectedAsset]);

    useEffect(() => {
        if (open) {
            setTitle(initialTitle);
            setStyle(initialStyle || DEFAULT_FOLDER_STYLE);
            setCoverMode("auto");
            setUploadedCover(null);
            setUploadedPreviewUrl("");
            setSelectedAssetId("");
            setUploadError("");
            setIsUploadingCover(false);
            setSubmitting(false);
        } else {
            draftCommandRef.current = null;
        }
    }, [open, initialTitle, initialStyle]);

    const handleClose = () => {
        draftCommandRef.current = null;
        onClose();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadError("");
        setUploadedCover(null);
        setUploadedPreviewUrl(URL.createObjectURL(file));
        setIsUploadingCover(true);
        try {
            const uploaded = await uploadImage(file);
            if (!uploaded.storageKey || /^(blob:|data:|https?:)/.test(uploaded.storageKey)) {
                throw new Error(t("assetDialogs.coverUploadInvalidFormat"));
            }
            const dataUrl = uploaded.url;
            setUploadedCover({
                kind: "image",
                title: file.name,
                coverUrl: uploaded.url || dataUrl,
                tags: [],
                data: {
                    dataUrl,
                    storageKey: uploaded.storageKey,
                    mimeType: file.type || "image/jpeg",
                    width: uploaded.width,
                    height: uploaded.height,
                    bytes: file.size,
                },
            });
        } catch {
            setUploadError(t("canvasCreate.uploadError"));
        } finally {
            setIsUploadingCover(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleCreate = async () => {
        const trimmedTitle = title.trim() || t("folderPreview.unnamed");

        if (coverMode === "upload") {
            if (isUploadingCover) {
                message.info(t("assetDialogs.coverUploading"));
                return;
            }
            if (
                !uploadedCover ||
                uploadedCover.kind !== "image" ||
                !uploadedCover.data.storageKey ||
                /^(blob:|data:|https?:)/.test(uploadedCover.data.storageKey)
            ) {
                message.warning(t("assetDialogs.coverUploadRequired"));
                return;
            }
        }

        setSubmitting(true);
        try {
            let command = draftCommandRef.current;
            if (!command) {
                let cover: FolderCover | undefined;
                if (coverMode === "upload" && uploadedCover && uploadedCover.kind === "image" && uploadedCover.data.storageKey) {
                    cover = { mode: "upload", storageKey: uploadedCover.data.storageKey };
                } else if (coverMode === "asset" && selectedAssetId) {
                    cover = { mode: "asset", assetId: selectedAssetId };
                }

                const folderPresentation: FolderPresentation = {
                    style,
                    ...(cover ? { cover } : {}),
                };

                command = createCanvasFolderCommand({
                    title: trimmedTitle,
                    projectId,
                    folderPresentation,
                    uploadedCover: coverMode === "upload" && uploadedCover ? uploadedCover : undefined,
                });
                draftCommandRef.current = command;
            }

            const result = await command.create();
            draftCommandRef.current = null;
            onClose();
            onCreated?.(result.id);
        } catch (error) {
            message.error(error instanceof Error ? error.message : t("canvasExtra.cloudSync.syncFailedRetry"));
        } finally {
            setSubmitting(false);
        }
    };

    // Shared Form Body
    const renderFormBody = () => (
        <div className="flex flex-col gap-4 py-1">
            {/* 1. Name */}
            <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("projectAssetFolder.nameLabel")} <span className="text-red-500">*</span>
                </label>
                <Input
                    placeholder={t("projectAssetFolder.namePlaceholder")}
                    value={title}
                    maxLength={60}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && title.trim()) {
                            e.preventDefault();
                            void handleCreate();
                        }
                    }}
                    autoFocus
                    className="h-10 sm:h-9 text-sm rounded-lg"
                />
            </div>

            {/* 2. Style Preset */}
            <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {getHubText(locale, "assetHub.folderTheme")}
                </label>
                <div className="grid grid-cols-2 gap-2">
                    {FOLDER_STYLES.map((key) => {
                        const isSelected = style === key;
                        return (
                            <button
                                key={key}
                                type="button"
                                data-folder-style={key}
                                onClick={() => setStyle(key)}
                                aria-pressed={isSelected}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-medium transition-all cursor-pointer select-none",
                                    isSelected
                                        ? "border-foreground bg-accent/40 font-semibold ring-2 ring-foreground/20 shadow-xs"
                                        : "border-border bg-card/60 text-foreground hover:bg-accent/25 hover:border-foreground/30",
                                )}
                            >
                                <div className="w-28 max-w-full flex items-center justify-center pointer-events-none py-1 overflow-visible" aria-hidden="true">
                                    <ProjectFolderPresentation style={key} previewItems={PREVIEW_SAMPLE_ITEMS} hideBadges />
                                </div>
                                <span className="min-w-0 w-full whitespace-normal break-words text-center text-[11px] font-medium">
                                    {getHubText(locale, `assetHub.style.${key}`)}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 3. Cover Mode */}
            <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("projectAssetFolder.coverTitle")}
                </label>
                <div className="flex flex-col gap-2">
                    {/* Auto Option */}
                    <label
                        className={cn(
                            "flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 transition-colors",
                            coverMode === "auto" ? "border-foreground bg-accent/30" : "border-border hover:bg-accent/15",
                        )}
                    >
                        <input
                            type="radio"
                            name="coverMode"
                            checked={coverMode === "auto"}
                            onChange={() => setCoverMode("auto")}
                            className="size-4 shrink-0 text-foreground"
                        />
                        <div className="text-xs font-medium text-foreground">{t("assetDialogs.createEmpty")}</div>
                    </label>

                    {/* Upload Option */}
                    <label
                        className={cn(
                            "flex min-h-[44px] cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition-colors",
                            coverMode === "upload" ? "border-foreground bg-accent/30" : "border-border hover:bg-accent/15",
                        )}
                    >
                        <input
                            type="radio"
                            name="coverMode"
                            checked={coverMode === "upload"}
                            onChange={() => setCoverMode("upload")}
                            className="size-4 shrink-0 mt-0.5 text-foreground"
                        />
                        <div className="w-full text-xs">
                            <div className="font-medium text-foreground">{t("canvasCreate.coverUpload")}</div>
                            {coverMode === "upload" ? (
                                <div className="mt-2.5">
                                    {isUploadingCover ? (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                                            <Loader2 className="size-4 animate-spin text-foreground shrink-0" />
                                            <span>{t("assetDialogs.coverUploading")}</span>
                                        </div>
                                    ) : uploadedPreviewUrl ? (
                                        <div className="flex items-center gap-3">
                                            <img
                                                src={uploadedPreviewUrl}
                                                alt={t("canvasCreate.coverUpload")}
                                                className="size-12 rounded-lg object-cover border border-border shadow-xs"
                                            />
                                            <Button
                                                size="small"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="h-8 text-xs"
                                            >
                                                {uploadError ? t("canvasCreate.retryUpload") : t("assetDialogs.replaceCover")}
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            size="small"
                                            icon={<Upload className="size-3.5" />}
                                            onClick={() => fileInputRef.current?.click()}
                                            className="h-8 text-xs"
                                        >
                                            {t("canvasCreate.coverUpload")}
                                        </Button>
                                    )}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => void handleFileChange(e)}
                                    />
                                </div>
                            ) : null}
                        </div>
                    </label>

                    {/* Pick from Asset Option */}
                    <label
                        className={cn(
                            "flex min-h-[44px] cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition-colors",
                            coverMode === "asset" ? "border-foreground bg-accent/30" : "border-border hover:bg-accent/15",
                        )}
                    >
                        <input
                            type="radio"
                            name="coverMode"
                            checked={coverMode === "asset"}
                            onChange={() => setCoverMode("asset")}
                            className="size-4 shrink-0 mt-0.5 text-foreground"
                        />
                        <div className="w-full text-xs">
                            <div className="font-medium text-foreground">{t("canvasCreate.coverFromAsset")}</div>
                            {coverMode === "asset" ? (
                                <div className="mt-2.5">
                                    {availableImageAssets.length > 0 ? (
                                        <div className="grid max-h-36 grid-cols-4 gap-2 overflow-y-auto rounded-lg border border-border p-2 bg-card">
                                            {availableImageAssets.map((asset) => (
                                                <button
                                                    key={asset.id}
                                                    type="button"
                                                    onClick={() => setSelectedAssetId(asset.id)}
                                                    className={cn(
                                                        "relative aspect-square overflow-hidden rounded-md transition-all cursor-pointer",
                                                        selectedAssetId === asset.id
                                                            ? "ring-2 ring-foreground"
                                                            : "opacity-80 hover:opacity-100",
                                                    )}
                                                >
                                                    <img
                                                        src={asset.coverUrl}
                                                        alt={asset.title || t("assets.unnamedAsset")}
                                                        className="size-full object-cover"
                                                    />
                                                    {selectedAssetId === asset.id ? (
                                                        <span className="absolute bottom-1 right-1 flex size-4 items-center justify-center rounded-full bg-foreground text-background shadow-xs">
                                                            <Check className="size-2.5" />
                                                        </span>
                                                    ) : null}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-muted-foreground py-2 text-xs">{t("resourceMention.empty")}</div>
                                    )}
                                </div>
                            ) : null}
                        </div>
                    </label>

                    {/* Upload Error Alert */}
                    {uploadError ? (
                        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-500">
                            <AlertCircle className="size-4 shrink-0" />
                            <span>{uploadError}</span>
                            <button
                                type="button"
                                onClick={() => setCoverMode("auto")}
                                className="ml-auto underline cursor-pointer"
                            >
                                {t("canvasCreate.resetToAutoCover")}
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );

    const renderPreview = (compact = false) => (
        <div className="flex w-full flex-col items-center gap-3 rounded-xl border border-border bg-card p-4 overflow-visible">
            <span className="text-xs text-muted-foreground">{t("assetDialogs.livePreview")}</span>
            <div className="dialog-folder-preview w-full flex flex-col items-center overflow-visible" style={{ maxWidth: compact ? 220 : 280 }}>
                <ProjectFolderPresentation
                    style={style}
                    coverUrl={previewCoverUrl}
                    previewItems={PREVIEW_SAMPLE_ITEMS}
                />
                <div className="project-folder-caption-mobile w-full text-center">
                    <span className="mobile-title">{title.trim() || t("folderPreview.unnamed")}</span>
                </div>
            </div>
        </div>
    );

    // Mobile Form Render (Full Screen Drawer with top Pull Handle & embedded compact preview)
    if (isMobile) {
        return (
            <Drawer
                open={open}
                onClose={handleClose}
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
                {/* Pull Handle Bar */}
                <div className="pt-3 pb-1 shrink-0">
                    <div className="mx-auto h-1.5 w-12 rounded-full bg-muted-foreground/30" />
                </div>

                {/* Header bar */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 shrink-0">
                    <span className="text-sm font-semibold text-foreground">
                        {t("assetDialogs.createFolderMobileTitle")}
                    </span>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent/40"
                    >
                        <X className="size-4" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                    {/* Compact Live Preview at top */}
                    {renderPreview(true)}

                    {/* Form Controls */}
                    {renderFormBody()}
                </div>

                {/* Fixed Safe-Area Floating Bottom Action Bar */}
                <div className="sticky bottom-0 left-0 right-0 p-4 border-t border-border/50 bg-background/80 backdrop-blur-md shrink-0 pb-safe">
                    <Button
                        type="primary"
                        loading={submitting}
                        disabled={isUploadingCover}
                        onClick={() => void handleCreate()}
                        className="h-12 w-full text-base font-semibold rounded-xl"
                    >
                        {draftCommandRef.current ? t("assetDialogs.retryCreate") : t("projectAssetFolder.create")}
                    </Button>
                </div>
            </Drawer>
        );
    }

    // Desktop Form Render (Centered AppModal with 3D Preview)
    return (
        <Modal
            open={open}
            onCancel={handleClose}
            title={t("projectAssetFolder.createTitle")}
            width={820}
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
                    <Button onClick={handleClose} disabled={submitting}>
                        {t("projectAssetFolder.cancel")}
                    </Button>
                    <Button
                        type="primary"
                        loading={submitting}
                        disabled={isUploadingCover}
                        onClick={() => void handleCreate()}
                    >
                        {draftCommandRef.current ? t("assetDialogs.retryCreate") : t("projectAssetFolder.create")}
                    </Button>
                </div>
            }
        >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_320px]">
                {/* Left: Form Area */}
                {renderFormBody()}

                {/* Right: Live Preview */}
                <div className="flex flex-col items-center justify-center">{renderPreview(false)}</div>
            </div>
        </Modal>
    );
}
