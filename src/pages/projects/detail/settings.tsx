import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { App, Button, Input, Modal, Select } from "antd";
import { Archive, Check, Eye, FolderOpen, Image as ImageIcon, Palette, Pencil, Save, ShieldAlert, Trash2 } from "lucide-react";

import { AssetLibraryPickerModal, type AssetLibraryPickerItem } from "@/components/assets/asset-library-picker-modal";
import { CanvasStyleDetailModal, CanvasStylePickerModal, resolveProjectCanvasStyle, type CanvasStylePreset } from "@/components/canvas/canvas-style-picker-modal";
import { ModelPicker } from "@/components/model-picker";
import { createStyleProfileSnapshot, parseStyleProfile, resolveStyleExecutionPlan, serializeStyleProfile, type StyleExecutionReasonLabels } from "@/lib/canvas/style-profile";
import { resourceFileUrl, resourceIdFromStorageKey } from "@/services/api/resources";
import { listProjectAssetsPage, updateProject } from "@/services/api/projects";
import { uploadImage } from "@/services/image-storage";
import { resolveAssetIngest } from "@/services/asset-archive";
import { useAssetStore } from "@/stores/use-asset-store";
import { modelDisplayName, resolveModelRequestConfig, useEffectiveConfig } from "@/stores/use-config-store";

import { useI18n } from "@/i18n/use-i18n";
import { styleDisplayMetadata } from "@/i18n/style-metadata";

import type { ProjectDetailViewProps } from "./shared";

export default function ProjectSettingsView({ detail, refreshProject }: ProjectDetailViewProps) {
    const { t, number, locale } = useI18n();
    const { message } = App.useApp();
    const effectiveConfig = useEffectiveConfig();
    const { project } = detail;
    const personalAssets = useAssetStore((state) => state.assets);
    const addAsset = useAssetStore((state) => state.addAsset);
    const [name, setName] = useState(project.name);
    const [description, setDescription] = useState(project.description || "");
    const [aspectRatio, setAspectRatio] = useState(project.aspectRatio);
    const [sourceType, setSourceType] = useState(project.sourceType);
    const [stylePresetId, setStylePresetId] = useState(project.stylePresetId || "");
    const [styleProfileJson, setStyleProfileJson] = useState(project.styleProfileJson || "");
    const [defaultImageModel, setDefaultImageModel] = useState(project.defaultImageModel || "");
    const [defaultVideoModel, setDefaultVideoModel] = useState(project.defaultVideoModel || "");
    const [styleDetail, setStyleDetail] = useState<CanvasStylePreset | null>(null);
    const [stylePickerOpen, setStylePickerOpen] = useState(false);
    const [styleEditorRequested, setStyleEditorRequested] = useState(false);
    const [archiveOpen, setArchiveOpen] = useState(false);
    const [coverPickerOpen, setCoverPickerOpen] = useState(false);
    const [coverPage, setCoverPage] = useState(1);
    const [coverPageSize, setCoverPageSize] = useState(40);
    const coverAssetsQuery = useQuery({
        queryKey: ["project", project.id, "assets", "cover-picker", coverPage, coverPageSize],
        queryFn: () => listProjectAssetsPage(project.id, { page: coverPage, pageSize: coverPageSize, mediaType: "image" }),
        enabled: coverPickerOpen,
    });
    const projectCoverAssets = coverAssetsQuery.data?.assets || [];
    useEffect(() => { setName(project.name); setDescription(project.description || ""); setAspectRatio(project.aspectRatio); setSourceType(project.sourceType); setStylePresetId(project.stylePresetId || ""); setStyleProfileJson(project.styleProfileJson || ""); setDefaultImageModel(project.defaultImageModel || ""); setDefaultVideoModel(project.defaultVideoModel || ""); }, [project]);
    const dirty = useMemo(() => name.trim() !== project.name || description !== (project.description || "") || aspectRatio !== project.aspectRatio || sourceType !== project.sourceType || stylePresetId !== (project.stylePresetId || "") || styleProfileJson !== (project.styleProfileJson || "") || defaultImageModel !== (project.defaultImageModel || "") || defaultVideoModel !== (project.defaultVideoModel || ""), [aspectRatio, defaultImageModel, defaultVideoModel, description, name, project, sourceType, stylePresetId, styleProfileJson]);
    const selectedStyle = useMemo(() => resolveProjectCanvasStyle(stylePresetId, styleProfileJson), [stylePresetId, styleProfileJson]);
    const styleDisplay = selectedStyle ? styleDisplayMetadata(selectedStyle, t, locale) : null;
    const styleProfile = useMemo(() => parseStyleProfile(styleProfileJson) || selectedStyle?.profile || (selectedStyle ? createStyleProfileSnapshot(selectedStyle) : null), [selectedStyle, styleProfileJson]);
    const enabledStyleAssets = styleProfile?.assets.filter((asset) => asset.enabled !== false) || [];
    const styleExecutionPlans = useMemo(() => {
        if (!styleProfile) return null;
        const imageConfig = resolveModelRequestConfig(effectiveConfig, effectiveConfig.imageModel || effectiveConfig.model);
        const videoConfig = resolveModelRequestConfig(effectiveConfig, effectiveConfig.videoModel || effectiveConfig.model);
        const labels = projectStyleExecutionLabels(t);
        return {
            image: resolveStyleExecutionPlan(styleProfile, { mode: "image", model: imageConfig.model, interfaceType: imageConfig.interfaceType || imageConfig.apiFormat }, labels),
            video: resolveStyleExecutionPlan(styleProfile, { mode: "video", model: videoConfig.model, interfaceType: videoConfig.interfaceType || videoConfig.apiFormat }, labels),
        };
    }, [effectiveConfig, styleProfile, t]);
    const coverPickerItems = useMemo<AssetLibraryPickerItem[]>(() => {
        const result: AssetLibraryPickerItem[] = [];
        const seenResourceIds = new Set<string>();
        for (const asset of personalAssets) {
            if (asset.kind !== "image") continue;
            const resourceId = resourceIdFromStorageKey(asset.data.storageKey);
            if (!resourceId || seenResourceIds.has(resourceId)) continue;
            seenResourceIds.add(resourceId);
            result.push({ id: asset.id, title: asset.title, category: "image", kindLabel: t("projectSettings.image"), asset, description: asset.note || t("projectSettings.personalLibrary"), searchText: (asset.tags || []).join(" ") });
        }
        for (const asset of projectCoverAssets) {
            if (asset.mediaType !== "image") continue;
            const resourceId = resourceIdFromStorageKey(asset.storageKey);
            if (!resourceId || seenResourceIds.has(resourceId)) continue;
            seenResourceIds.add(resourceId);
            result.push({ id: `project:${asset.id}`, title: asset.title, category: "image", kindLabel: t("projectSettings.projectImage"), imageUrl: resourceFileUrl(resourceId), description: t("projectSettings.projectLibrary"), searchText: asset.title });
        }
        if (project.coverResourceId && !seenResourceIds.has(project.coverResourceId)) {
            result.unshift({ id: `current:${project.coverResourceId}`, title: t("projectSettings.currentCover"), category: "image", kindLabel: t("projectSettings.currentCoverShort"), imageUrl: resourceFileUrl(project.coverResourceId) });
        }
        return result;
    }, [personalAssets, project.coverResourceId, projectCoverAssets, t]);
    const coverResourceByItemId = useMemo(() => new Map(coverPickerItems.flatMap((item) => {
        if (item.id.startsWith("current:")) return [[item.id, item.id.slice("current:".length)] as const];
        if (item.id.startsWith("project:")) {
            const asset = projectCoverAssets.find((entry) => `project:${entry.id}` === item.id);
            const resourceId = resourceIdFromStorageKey(asset?.storageKey);
            return resourceId ? [[item.id, resourceId] as const] : [];
        }
        const asset = personalAssets.find((entry) => entry.id === item.id);
        const resourceId = asset?.kind === "image" ? resourceIdFromStorageKey(asset.data.storageKey) : "";
        return resourceId ? [[item.id, resourceId] as const] : [];
    })), [coverPickerItems, personalAssets, projectCoverAssets]);
    const coverResourceByItemIdRef = useRef(new Map<string, string>());
    useEffect(() => {
        for (const [itemId, resourceId] of coverResourceByItemId) coverResourceByItemIdRef.current.set(itemId, resourceId);
    }, [coverResourceByItemId]);
    const currentCoverItemId = coverPickerItems.find((item) => coverResourceByItemId.get(item.id) === project.coverResourceId)?.id;
    const saveMutation = useMutation({ mutationFn: () => updateProject(project.id, { name: name.trim(), description, aspectRatio, sourceType, stylePresetId, styleProfileJson, defaultImageModel, defaultVideoModel }), onSuccess: () => { refreshProject(); message.success(t("projectSettings.savedNotice")); }, onError: (error) => message.error(error instanceof Error ? error.message : t("projectSettings.saveError")) });
    const archiveMutation = useMutation({ mutationFn: () => updateProject(project.id, { status: project.status === "archived" ? "active" : "archived" }), onSuccess: () => { setArchiveOpen(false); refreshProject(); message.success(project.status === "archived" ? t("projectSettings.restored") : t("projectSettings.archived")); }, onError: (error) => message.error(error instanceof Error ? error.message : t("projectSettings.statusError")) });
    const coverMutation = useMutation({ mutationFn: (coverResourceId: string) => updateProject(project.id, { coverResourceId }), onSuccess: (_, coverResourceId) => { setCoverPickerOpen(false); refreshProject(); message.success(coverResourceId ? t("projectSettings.coverUpdated") : t("projectSettings.coverRemoved")); }, onError: (error) => message.error(error instanceof Error ? error.message : t("projectSettings.coverError")) });

    return (
        <div>
            <header className="flex items-end justify-between gap-3 pb-3"><div><h2 className="text-lg font-semibold">{t("projectSettings.title")}</h2><p className="mt-1 text-xs text-foreground/48">{t("projectSettings.description")}</p></div><Button type={dirty ? "primary" : "default"} icon={dirty ? <Save className="size-3.5" /> : <Check className="size-3.5" />} disabled={!dirty || !name.trim()} loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>{dirty ? t("projectSettings.save") : t("projectSettings.saved")}</Button></header>

            <section className="py-5">
                <h3 className="mb-3 text-sm font-semibold">{t("projectSettings.basic")}</h3>
                <div className="grid gap-x-4 gap-y-3 md:grid-cols-2 xl:grid-cols-4">
                    <Field label={t("projectSettings.name")} className="xl:col-span-2"><Input value={name} onChange={(event) => setName(event.target.value)} /></Field>
                    <Field label={t("projectSettings.ratio")}><Select className="w-full" value={aspectRatio} options={[{ label: t("projectSettings.portrait"), value: "9:16" }, { label: t("projectSettings.landscape"), value: "16:9" }, { label: t("projectSettings.square"), value: "1:1" }]} onChange={setAspectRatio} /></Field>
                    <Field label={t("projectSettings.source")}><Select className="w-full" value={sourceType} options={[{ label: t("projectSettings.blank"), value: "blank" }, { label: t("projectSettings.novel"), value: "novel" }, { label: t("projectSettings.text"), value: "text" }]} onChange={setSourceType} /></Field>
                    <Field label={t("projectSettings.summary")} className="md:col-span-2 xl:col-span-4"><Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder={t("projectSettings.summaryPlaceholder")} /></Field>
                </div>
            </section>

            <section className="border-t border-border/70 py-5">
                <div className="mb-3"><h3 className="text-sm font-semibold">{t("projectSettings.models")}</h3><p className="mt-0.5 text-[var(--fs-label)] text-foreground/45">{t("projectSettings.modelsHelp")}</p></div>
                <div className="grid gap-4 md:grid-cols-2">
                    <Field label={t("projectSettings.imageModel")}>
                        <div className="flex items-center gap-2">
                            <ModelPicker config={effectiveConfig} value={defaultImageModel} capability="image" onChange={setDefaultImageModel} fullWidth placeholder={t("projectSettings.globalModel", { model: modelDisplayName(effectiveConfig, effectiveConfig.imageModel) || t("projectSettings.notConfigured") })} showSelectedPrice />
                            {defaultImageModel ? <Button type="text" size="small" onClick={() => setDefaultImageModel("")}>{t("projectSettings.global")}</Button> : null}
                        </div>
                    </Field>
                    <Field label={t("projectSettings.videoModel")}>
                        <div className="flex items-center gap-2">
                            <ModelPicker config={effectiveConfig} value={defaultVideoModel} capability="video" onChange={setDefaultVideoModel} fullWidth placeholder={t("projectSettings.globalModel", { model: modelDisplayName(effectiveConfig, effectiveConfig.videoModel) || t("projectSettings.notConfigured") })} showSelectedPrice />
                            {defaultVideoModel ? <Button type="text" size="small" onClick={() => setDefaultVideoModel("")}>{t("projectSettings.global")}</Button> : null}
                        </div>
                    </Field>
                </div>
            </section>

            <section className="border-t border-border/70 py-5">
                <div className="mb-3 flex items-center justify-between gap-3"><div><h3 className="text-sm font-semibold">{t("projectSettings.cover")}</h3><p className="mt-0.5 text-[var(--fs-label)] text-foreground/45">{t("projectSettings.coverHelp")}</p></div><span className="text-[var(--fs-label)] text-foreground/40">{t("projectSettings.coverHint")}</span></div>
                <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-surface-active p-3 sm:flex-row sm:items-center">
                    {project.coverResourceId ? <img src={resourceFileUrl(project.coverResourceId)} alt={t("projectSettings.coverAlt", { name: project.name })} className="aspect-video w-full shrink-0 rounded-md bg-foreground/5 object-cover sm:w-52" /> : <span className="grid aspect-video w-full shrink-0 place-items-center rounded-md bg-foreground/5 text-foreground/30 sm:w-52"><ImageIcon className="size-6" /></span>}
                    <div className="min-w-0 flex-1"><div className="text-sm font-medium">{project.coverResourceId ? t("projectSettings.coverSet") : t("projectSettings.coverUnset")}</div><p className="mt-1 text-xs leading-5 text-foreground/48">{t("projectSettings.chooseHelp")}</p></div>
                    <div className="flex shrink-0 gap-2"><Button icon={<FolderOpen className="size-3.5" />} onClick={() => { setCoverPage(1); setCoverPickerOpen(true); }}>{project.coverResourceId ? t("projectSettings.replaceCover") : t("projectSettings.setCover")}</Button>{project.coverResourceId ? <Button danger type="text" icon={<Trash2 className="size-3.5" />} loading={coverMutation.isPending} onClick={() => coverMutation.mutate("")}>{t("projectSettings.remove")}</Button> : null}</div>
                </div>
            </section>

            <section className="border-t border-border/70 py-5">
                <div className="mb-3 flex items-center justify-between gap-3"><div><h3 className="text-sm font-semibold">{t("projectSettings.style")}</h3><p className="mt-0.5 text-[var(--fs-label)] text-foreground/45">{t("projectSettings.styleHelp")}</p></div>{styleProfile ? <span className="text-[var(--fs-label)] text-foreground/52">{styleProfile.source === "user" ? t("projectSettings.myStyle") : styleProfile.source === "external" ? t("projectSettings.external") : t("projectSettings.builtin")}</span> : <span className="text-[var(--fs-label)] text-foreground/40">{t("projectSettings.unset")}</span>}</div>
                <div className="flex flex-col gap-3 rounded-lg bg-surface-active p-3 lg:flex-row lg:items-center">
                    {selectedStyle ? <img src={selectedStyle.imageUrl} width="160" height="90" alt={t("projectSettings.styleAlt", { name: styleDisplay?.title || selectedStyle.title })} className="aspect-video w-40 shrink-0 rounded-md object-cover" /> : <span className="grid aspect-video w-40 shrink-0 place-items-center rounded-md bg-foreground/5 text-foreground/35"><Palette className="size-5" /></span>}
                    <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold">{styleDisplay?.title || styleProfile?.title || t("projectSettings.noStyle")}</div>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-foreground/48">{styleDisplay?.description || styleProfile?.description || t("projectSettings.styleEmptyHelp")}</p>
                        {styleProfile ? <div className="mt-2 flex flex-wrap gap-1">{(styleDisplay?.tags || styleProfile.tags).map((tag) => <span key={tag} className="rounded bg-foreground/10 px-1.5 py-0.5 text-[var(--fs-tiny)] text-foreground/55">{tag}</span>)}</div> : null}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2"><Button icon={<Eye className="size-3.5" />} disabled={!selectedStyle} onClick={() => setStyleDetail(selectedStyle || null)}>{t("projectSettings.viewStyle")}</Button><Button icon={<Pencil className="size-3.5" />} disabled={!styleProfile} onClick={() => { setStyleEditorRequested(true); setStylePickerOpen(true); }}>{t("projectSettings.editStyle")}</Button><Button icon={<Palette className="size-3.5" />} onClick={() => { setStyleEditorRequested(false); setStylePickerOpen(true); }}>{selectedStyle ? t("projectSettings.changeStyle") : t("projectSettings.chooseStyle")}</Button></div>
                </div>
                {styleProfile ? <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-5"><StyleMetric label={t("projectSettings.policy")} value={styleProfile.executionPolicy === "strict-assets" ? t("projectSettings.strict") : t("projectSettings.fallback")} /><StyleMetric label={t("projectSettings.assets")} value={t("projectSettings.count", { count: number(styleProfile.assets.length) })} /><StyleMetric label={t("projectSettings.enabled")} value={t("projectSettings.count", { count: number(enabledStyleAssets.length) })} /><StyleMetric label={t("projectSettings.imageExecution")} value={styleExecutionStatusLabel(t, styleExecutionPlans?.image.status)} /><StyleMetric label={t("projectSettings.videoExecution")} value={styleExecutionStatusLabel(t, styleExecutionPlans?.video.status)} /></div> : null}
                {styleExecutionPlans && (styleExecutionPlans.image.warnings.length || styleExecutionPlans.video.warnings.length) ? <div className="mt-2 grid gap-1 rounded-md bg-amber-500/5 px-3 py-2 text-[var(--fs-label)] leading-5 text-amber-600 dark:text-amber-400">{styleExecutionPlans.image.warnings.length ? <p>{t("projectSettings.imageWarnings", { warnings: styleExecutionPlans.image.warnings.join("; ") })}</p> : null}{styleExecutionPlans.video.warnings.length ? <p>{t("projectSettings.videoWarnings", { warnings: styleExecutionPlans.video.warnings.join("; ") })}</p> : null}</div> : null}
            </section>

            <section className="py-4">
                <div className="flex flex-col gap-3 rounded-lg bg-red-500/5 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-2.5"><span className="grid size-7 shrink-0 place-items-center rounded bg-red-500/10 text-red-500"><Archive className="size-3.5" /></span><div className="min-w-0"><h3 className="text-sm font-medium">{project.status === "archived" ? t("projectSettings.restore") : t("projectSettings.archive")}</h3><p className="mt-0.5 text-[var(--fs-label)] text-foreground/48">{project.status === "archived" ? t("projectSettings.restoreHelp") : t("projectSettings.archiveHelp")}</p></div></div>
                    <Button size="small" danger={project.status !== "archived"} icon={project.status === "archived" ? <Check className="size-3.5" /> : <ShieldAlert className="size-3.5" />} onClick={() => setArchiveOpen(true)}>{project.status === "archived" ? t("projectSettings.restore") : t("projectSettings.archive")}</Button>
                </div>
            </section>

            <Modal className="workspace-modal workspace-modal-compact" title={project.status === "archived" ? t("projectSettings.restore") : t("projectSettings.archive")} open={archiveOpen} okText={project.status === "archived" ? t("projectSettings.confirmRestore") : t("projectSettings.confirmArchive")} cancelText={t("projectSettings.cancel")} okButtonProps={{ danger: project.status !== "archived", loading: archiveMutation.isPending }} onCancel={() => setArchiveOpen(false)} onOk={() => archiveMutation.mutate()} styles={{ body: { paddingTop: 12 } }}><p className="m-0 text-sm leading-6 text-foreground/65">{project.status === "archived" ? t("projectSettings.restoreConfirm") : t("projectSettings.archiveConfirm")}</p></Modal>
            <AssetLibraryPickerModal
                open={coverPickerOpen}
                items={coverPickerItems}
                categoryLabels={{ all: t("projectSettings.allImages"), image: t("projectSettings.image") }}
                initialCategory="image"
                initialSelectedIds={currentCoverItemId ? [currentCoverItemId] : []}
                multiple={false}
                eyebrow={t("projectSettings.title")}
                title={t("projectSettings.chooseCover")}
                confirmLabel={() => t("projectSettings.confirmCover")}
                emptyTitle={t("projectSettings.emptyImages")}
                emptyDescription={t("projectSettings.uploadHelp")}
                loading={coverAssetsQuery.isLoading}
                pagination={{ current: coverPage, pageSize: coverPageSize, total: coverAssetsQuery.data?.total || 0, onChange: (nextPage, nextPageSize) => { setCoverPage(nextPageSize !== coverPageSize ? 1 : nextPage); setCoverPageSize(nextPageSize); } }}
                upload={{ accept: "image/png,image/jpeg,image/webp,image/avif", description: t("projectSettings.formats"), onUpload: async (files) => {
                    const file = Array.from(files)[0];
                    if (!file?.type.startsWith("image/")) throw new Error(t("projectSettings.imageRequired"));
                    const uploaded = await uploadImage(file);
                    const resourceId = resourceIdFromStorageKey(uploaded.storageKey);
                    if (!resourceId) throw new Error(t("projectSettings.uploadSyncError"));
                    const id = addAsset(resolveAssetIngest({ kind: "image", title: file.name.replace(/\.[^.]+$/, "") || "项目主图", coverUrl: uploaded.url, tags: ["项目主图"], status: "confirmed", source: "项目设置", category: "other", categorySource: "ai_pending", data: { dataUrl: uploaded.url, storageKey: uploaded.storageKey, width: uploaded.width, height: uploaded.height, bytes: uploaded.bytes, mimeType: uploaded.mimeType } }, { domainProjectId: detail.project.id, sourceCode: "project-upload" }));
                    return [id];
                } }}
                onClose={() => setCoverPickerOpen(false)}
                onConfirm={async (ids) => {
                    const id = ids[0];
                    let resourceId = coverResourceByItemIdRef.current.get(id);
                    if (!resourceId) {
                        const asset = useAssetStore.getState().assets.find((entry) => entry.id === id);
                        resourceId = asset?.kind === "image" ? resourceIdFromStorageKey(asset.data.storageKey) : "";
                    }
                    if (!resourceId) throw new Error(t("projectSettings.selectionSyncError"));
                    await coverMutation.mutateAsync(resourceId);
                }}
            />
            <CanvasStylePickerModal open={stylePickerOpen} value={stylePresetId} currentProfile={styleProfile} startInEditor={styleEditorRequested} onClose={() => { setStylePickerOpen(false); setStyleEditorRequested(false); }} onSelect={(preset) => { applyStyle(preset); setStylePickerOpen(false); setStyleEditorRequested(false); }} />
            <CanvasStyleDetailModal open={Boolean(styleDetail)} preset={styleDetail} selected={styleDetail?.id === stylePresetId} onClose={() => setStyleDetail(null)} onSelect={(preset) => { applyStyle(preset); setStyleDetail(null); }} />
        </div>
    );

    function applyStyle(preset: CanvasStylePreset) {
        setStylePresetId(preset.id);
        setStyleProfileJson(serializeStyleProfile(preset.profile || createStyleProfileSnapshot(preset)));
    }
}

function StyleMetric({ label, value }: { label: string; value: string }) {
    return <div className="min-w-0 rounded-md bg-surface-active px-3 py-2"><span className="block text-[var(--fs-tiny)] text-foreground/40">{label}</span><span className="mt-0.5 block truncate font-medium text-foreground/65">{value}</span></div>;
}

export function projectStyleExecutionLabels(t: ReturnType<typeof useI18n>["t"]): StyleExecutionReasonLabels {
    return {
        unavailable: t("projectSettings.assetUnavailable"),
        unvalidated: t("projectSettings.assetUnvalidated"),
        incompatible: (models) => t("projectSettings.compatibleModels", { models: models.join(", ") }),
        prompt: t("projectSettings.appendPrompt"),
        template: t("projectSettings.templatePrompt"),
        reference: t("projectSettings.referenceAdapter"),
        lora: (protocol) => t("projectSettings.loraAdapter", { protocol: protocol || t("projectSettings.image") }),
        unsupported: t("projectSettings.unsupportedAsset"),
        warning: (title, reason) => t("projectSettings.assetWarning", { title, reason }),
    };
}

function styleExecutionStatusLabel(t: ReturnType<typeof useI18n>["t"], status?: "ready" | "degraded" | "blocked") {
    return status === "blocked" ? t("projectSettings.blocked") : status === "degraded" ? t("projectSettings.degraded") : t("projectSettings.ready");
}

function Field({ label, className = "", children }: { label: string; className?: string; children: ReactNode }) {
    return <label className={`grid gap-1.5 text-xs ${className}`}><span className="font-medium text-foreground/62">{label}</span>{children}</label>;
}
