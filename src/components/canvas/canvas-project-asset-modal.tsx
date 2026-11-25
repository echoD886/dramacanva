import { useMemo } from "react";
import { useI18n } from "@/i18n/use-i18n";
import { currentLocaleText } from "@/i18n/current-locale-text";

import { AssetLibraryPickerModal, type AssetLibraryPickerItem, type AssetPickerMediaKind } from "@/components/assets/asset-library-picker-modal";
import { useExternalAssetSources } from "@/hooks/use-external-asset-sources";
import { externalAssetToInsertPayload, type InsertAssetPayload } from "@/components/canvas/asset-picker-modal";
import { compileCharacterReferencePrompt } from "@/lib/canvas/canvas-character-reference";
import { normalizeAssetCategory } from "@/lib/asset-category";
import { resourceFileUrl, resourceIdFromStorageKey } from "@/services/api/resources";
import type { ProjectAsset, ProjectDetail } from "@/services/api/projects";
import { getRemoteAsset } from "@/services/api/user-data";
import { useAssetStore, type Asset } from "@/stores/use-asset-store";

type ProjectPickerItem = { id: string; category: string; folderId?: string; project?: ProjectAsset; character?: ProjectAsset; media?: Asset };

export function CanvasProjectAssetModal({
    open,
    detail,
    initialCategory = "all",
    initialFolderId = "all",
    onClose,
    onInsert,
    onInsertFolder,
}: {
    open: boolean;
    detail?: ProjectDetail;
    initialCategory?: string;
    initialFolderId?: string;
    onClose: () => void;
    onInsert: (payloads: InsertAssetPayload[]) => Promise<void> | void;
    onInsertFolder?: (folderId: string) => Promise<void> | void;
}) {
    const { t } = useI18n();
    const categoryLabels = {
        all: t("canvasExtra.assetModal.allAssets"),
        character: t("assets.catCharacter"),
        environment: t("assets.catEnvironment"),
        prop: t("assets.catProp"),
        material: t("canvasExtra.assetPicker.material"),
        other: t("assets.catOther"),
        wardrobe: t("assets.catWardrobe"),
        weapon: t("assets.catWeapon"),
        style: t("assets.catStyle"),
    };
    const mediaAssets = useAssetStore((state) => state.assets);
    const externalAssetSources = useExternalAssetSources(open);
    const items = useMemo<ProjectPickerItem[]>(() => {
        const mediaById = new Map(mediaAssets.map((asset) => [asset.id, asset]));
        const projectItems = (detail?.assets || []).flatMap((asset): ProjectPickerItem[] => {
            if (asset.category === "character" && asset.character) return [{ id: asset.id, category: "character", folderId: asset.folderId, project: asset, character: asset }];
            const media = mediaById.get(asset.id);
            if (media?.status === "archived") return [];
            return asset.mediaType === "model" || asset.mediaType === "entity" ? [] : [{ id: asset.id, category: normalizeAssetCategory(asset.category || media?.category), folderId: asset.folderId, project: asset, media }];
        });
        if (detail) return projectItems;
        // 自由画布未关联项目时回退到个人素材库。
        return mediaAssets.filter((asset) => asset.kind !== "model" && asset.kind !== "entity" && asset.status !== "archived").map((media): ProjectPickerItem => ({ id: media.id, category: normalizeAssetCategory(media.category), media }));
    }, [detail?.assets, mediaAssets]);
    const localPickerItems = useMemo<AssetLibraryPickerItem[]>(
        () =>
            items.map((item) => {
                const character = item.character;
                const project = item.project;
                const media = item.media;
                const coverRepresentation =
                    character?.character?.representations.find((representation) => representation.role === "turnaround_sheet") ||
                    character?.character?.representations.find((representation) => representation.role === "primary") ||
                    character?.character?.representations.find((representation) => representation.role === "front");
                const remoteResourceId = resourceIdFromStorageKey(project?.storageKey);
                // 项目资产可能只有服务端记录、没有本地素材，媒体类型要显式声明，筛选才能覆盖它们。
                const mediaKind = character ? undefined : pickerMediaKind(media?.kind || project?.mediaType);
                return {
                    id: item.id,
                    title: character?.title || project?.title || media?.title || t("canvasExtra.assetModal.untitled"),
                    category: item.category,
                    folderId: item.folderId,
                    kindLabel: character ? t("canvasExtra.assetModal.kindCharacter") : mediaKind === "video" ? t("canvasExtra.assetModal.kindVideo") : mediaKind === "audio" ? t("canvasExtra.assetModal.kindAudio") : mediaKind === "text" ? t("canvasExtra.assetModal.kindText") : t("canvasExtra.assetModal.kindImage"),
                    mediaKind,
                    asset: media,
                    imageUrl: coverRepresentation ? resourceFileUrl(coverRepresentation.resourceId) : project?.mediaType === "image" && remoteResourceId ? resourceFileUrl(remoteResourceId) : undefined,
                    imageStorageKey: coverRepresentation ? `resource:${coverRepresentation.resourceId}` : undefined,
                    imageFit: character ? "contain" : "cover",
                    description: character ? `${character.character?.visualStatus === "ready" ? t("canvasExtra.assetModal.visualReady") : t("canvasExtra.assetModal.visualPending")} · ${character.character?.voiceStatus === "ready" ? t("canvasExtra.assetModal.voiceBound") : t("canvasExtra.assetModal.voiceUnbound")}` : project?.previewText,
                    searchText: [media?.tags?.join(" ") || "", project?.previewText || ""].join(" "),
                };
            }),
        [items, t],
    );
    const pickerItems = useMemo<AssetLibraryPickerItem[]>(() => [...localPickerItems, ...externalAssetSources.items], [externalAssetSources.items, localPickerItems]);

    return (
        <AssetLibraryPickerModal
            remoteLibrary={!detail}
            acceptRemoteItems={!detail}
            open={open}
            mediaKinds={["image", "video", "audio", "text"]}
            items={pickerItems}
            categoryLabels={{ ...categoryLabels, ...externalAssetSources.categoryLabels }}
            initialCategory={initialCategory}
            initialFolderId={initialFolderId}
            folders={externalAssetSources.folders}
            folderActionSource="local"
            title={t("canvasExtra.assetModal.title")}
            confirmLabel={(count) => count ? t("canvasExtra.assetModal.confirmCount", { count }) : t("canvasExtra.assetModal.confirm")}
            emptyTitle={t("canvasExtra.assetModal.emptyTitle")}
            emptyDescription={detail ? t("canvasExtra.assetModal.emptyProject") : t("canvasExtra.assetModal.emptyFree")}
            footerNote={externalAssetSources.error || t("canvasExtra.assetModal.footerNote")}
            onFolderAction={
                onInsertFolder
                    ? async (folderId) => {
                          await onInsertFolder(folderId);
                          onClose();
                      }
                    : undefined
            }
            onClose={onClose}
            onConfirm={async (ids) => {
                const payloads = await Promise.all(
                    ids.map(async (id) => {
                        const external = externalAssetSources.items.find((item) => item.id === id)?.external;
                        if (external) return externalAssetToInsertPayload(external);
                        const item = items.find((candidate) => candidate.id === id);
                        if (!item && !detail) {
                            const { asset } = await getRemoteAsset(id);
                            if (asset.status !== "archived") return toInsertPayload({ id, category: normalizeAssetCategory(asset.category), media: asset });
                        }
                        if (!item) throw new Error(currentLocaleText("canvasExtra.assetModal.assetGone"));
                        if (item.media || item.character || !item.project) return toInsertPayload(item);
                        const { asset } = await getRemoteAsset(item.project.id);
                        return toInsertPayload({ ...item, media: asset });
                    }),
                );
                if (!payloads.length) return;
                await onInsert(payloads);
                onClose();
            }}
        />
    );
}

export function pickerMediaKind(value?: string): AssetPickerMediaKind {
    return value === "video" || value === "audio" || value === "text" ? value : "image";
}

function toInsertPayload(item: ProjectPickerItem): InsertAssetPayload {
    if (item.character?.character) {
        return projectCharacterToInsertPayload(item.character);
    }
    const asset = item.media;
    const project = item.project;
    if (!asset && project) {
        const resourceId = resourceIdFromStorageKey(project.storageKey);
        const remoteUrl = resourceId ? resourceFileUrl(resourceId) : "";
        if (project.mediaType === "text" && project.previewText) return { kind: "text", content: project.previewText, title: project.title, assetId: project.id };
        if (project.mediaType === "video" && remoteUrl) return { kind: "video", url: remoteUrl, storageKey: project.storageKey, title: project.title, assetId: project.id };
        if (project.mediaType === "audio" && remoteUrl) return { kind: "audio", url: remoteUrl, storageKey: project.storageKey, title: project.title, assetId: project.id };
        if (project.mediaType === "image" && remoteUrl) return { kind: "image", dataUrl: remoteUrl, storageKey: project.storageKey, title: project.title, assetId: project.id };
        throw new Error(currentLocaleText("canvasExtra.assetModal.contentUnavailable", { title: project.title }));
    }
    if (!asset) throw new Error(currentLocaleText("canvasExtra.assetModal.assetUnavailable"));
    if (asset.kind === "text") return { kind: "text", content: asset.data.content, title: asset.title, assetId: asset.id };
    if (asset.kind === "video")
        return {
            kind: "video",
            url: projectAssetMediaUrl(asset.data.storageKey, asset.data.url),
            storageKey: asset.data.storageKey,
            title: asset.title,
            width: asset.data.width,
            height: asset.data.height,
            durationMs: asset.data.durationMs,
            bytes: asset.data.bytes,
            mimeType: asset.data.mimeType,
            assetId: asset.id,
        };
    if (asset.kind === "audio")
        return {
            kind: "audio",
            url: projectAssetMediaUrl(asset.data.storageKey, asset.data.url),
            storageKey: asset.data.storageKey,
            title: asset.title,
            durationMs: asset.data.durationMs,
            bytes: asset.data.bytes,
            mimeType: asset.data.mimeType,
            assetId: asset.id,
        };
    if (asset.kind === "image") return { kind: "image", dataUrl: projectAssetMediaUrl(asset.data.storageKey, asset.data.dataUrl), storageKey: asset.data.storageKey, title: asset.title, assetId: asset.id };
    throw new Error(currentLocaleText("canvasExtra.assetModal.cannotInsert"));
}

function projectAssetMediaUrl(storageKey?: string, fallback = "") {
    const resourceId = resourceIdFromStorageKey(storageKey);
    return resourceId ? resourceFileUrl(resourceId) : fallback;
}

export function projectCharacterToInsertPayload(asset: ProjectAsset): InsertAssetPayload {
    if (!asset.character) throw new Error(currentLocaleText("canvasExtra.assetModal.characterIncomplete"));
    const card = asset.character;
    const definition = card.definition;
    const cover =
        card.representations.find((representation) => representation.role === "turnaround_sheet") ||
        card.representations.find((representation) => representation.role === "primary") ||
        card.representations.find((representation) => representation.role === "front");
    return {
        kind: "character",
        title: asset.title,
        assetId: asset.id,
        versionId: card.versionId,
        prompt: compileCharacterReferencePrompt(asset.title, definition),
        aliases: Array.isArray(definition.aliases) ? definition.aliases.filter((alias): alias is string => typeof alias === "string") : [],
        definition,
        coverUrl: cover ? resourceFileUrl(cover.resourceId) : undefined,
        visualStatus: card.visualStatus,
        voiceStatus: card.voiceStatus,
        voiceName: card.voice?.profile.name,
        voiceProfile: card.voice
            ? {
                  name: card.voice.profile.name,
                  provider: card.voice.profile.provider,
                  language: card.voice.profile.language,
                  timbre: card.voice.profile.timbre,
              }
            : undefined,
        voiceInstructions: card.voice?.instructions,
    };
}
