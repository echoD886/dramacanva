import { useEffect, useMemo, useState } from "react";
import { Button, Input, Pagination } from "antd";
import { ArrowLeft, FileText, FolderOpen, Image as ImageIcon, Music2, Pencil, Search, Video } from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";
import { useCanvasFeatureMessages } from "@/i18n/canvas-feature-messages";
import { useResourceDelivery } from "@/hooks/use-resource-delivery";
import { buildCanvasAssetCatalog, type CanvasAssetKind, type CanvasAssetVersion } from "@/lib/canvas/canvas-asset-catalog";
import { mediaVersionPreviewNode } from "@/lib/canvas/canvas-media-versions";
import { resolveImageUrl } from "@/services/image-storage";
import { resolveMediaUrl } from "@/services/file-storage";
import { CanvasNodeType, type CanvasNodeData } from "@/types/canvas";

import "./canvas-asset-catalog.css";

type Props = {
    nodes: CanvasNodeData[];
    onBack: () => void;
    onLocate: (nodeId: string) => void;
    onRename: (nodeId: string, title: string) => Promise<void>;
    onPromote: (version: CanvasAssetVersion) => Promise<void>;
};

const icons = { txt: FileText, markdown: FileText, image: ImageIcon, video: Video, audio: Music2 };
const pageSize = 24;

export default function CanvasAssetView({ nodes, onBack, onLocate, onRename, onPromote }: Props) {
    const { t, locale } = useI18n();
    const messagesReady = useCanvasFeatureMessages();
    const [query, setQuery] = useState("");
    const [kind, setKind] = useState<CanvasAssetKind | "all">("all");
    const [page, setPage] = useState(1);
    const [versionKey, setVersionKey] = useState("");
    const [selectedKey, setSelectedKey] = useState("");
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState("");
    const [saving, setSaving] = useState(false);
    const groups = useMemo(() => buildCanvasAssetCatalog(nodes, t), [nodes, locale, t]);
    const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
    const entries = useMemo(() => groups.flatMap((group) => group.entries), [groups]);
    const availableGroups = groups.filter((group) => group.entries.length || kind === group.kind);
    const search = query.trim().toLocaleLowerCase();
    const results = entries.filter((entry) => (kind === "all" || kind === entry.kind) && entry.title.toLocaleLowerCase().includes(search));
    const currentPage = Math.min(page, Math.max(1, Math.ceil(results.length / pageSize)));
    const entry = results.find((item) => item.key === selectedKey) ?? results[(currentPage - 1) * pageSize];
    const version = entry?.versions.find((item) => item.key === versionKey);
    const member = entry && nodeById.get(version?.nodeId ?? entry.nodeId);
    const media = version && member?.metadata?.mediaVersions?.find((item) => item.id === version.mediaVersionId);
    const selected = member && { node: media ? mediaVersionPreviewNode(member, media) : member, version };
    useEffect(() => {
        setEditing(false);
    }, [entry?.key, versionKey]);
    const submitRename = async () => {
        if (!selected || !draft.trim() || saving) return;
        setSaving(true);
        try {
            await onRename(selected.version?.nodeId || selected.node.id, draft.trim());
            setEditing(false);
        } catch {
            /* The canvas write handler presents the failure; retain the draft. */
        } finally {
            setSaving(false);
        }
    };
    if (!messagesReady) return null;
    return (
        <div className="canvas-asset-view-layer absolute inset-x-0 bottom-0 top-[var(--canvas-topbar-h)] z-[var(--z-panel-floating)] flex min-h-0 text-foreground" data-canvas-no-zoom data-canvas-wheel-scroll>
            <section aria-label={t("upstreamSix.assets")} className="asset-register-panel w-full min-w-0 overflow-auto">
                <div className="asset-register" data-detail={Boolean(selectedKey && selected)}>
                    <header className="asset-register-head">
                        <div>
                            <h2 className="flex items-baseline gap-3 font-semibold">
                                {t("upstreamSix.assets")}
                                <small>{entries.length.toString().padStart(2, "0")}</small>
                            </h2>
                            <p className="text-sm text-muted-foreground">{t("upstreamSix.catalogHint")}</p>
                        </div>
                        {entries.length > 0 && (
                            <Input
                                className="asset-register-search"
                                prefix={<Search size={15} />}
                                aria-label={t("upstreamSix.searchAssets")}
                                placeholder={t("upstreamSix.searchAssets")}
                                value={query}
                                onChange={(event) => {
                                    setSelectedKey("");
                                    setVersionKey("");
                                    setQuery(event.target.value);
                                    setPage(1);
                                }}
                                allowClear
                            />
                        )}
                    </header>
                    {entries.length ? (
                        <>
                            {(availableGroups.length > 1 || kind !== "all") && (
                                <div className="asset-register-tabs" role="group" aria-label={t("upstreamSix.assetCatalog")}>
                                    {[{ kind: "all" as const, label: t("common.all"), entries }, ...availableGroups].map((group) => (
                                        <button
                                            key={group.kind}
                                            aria-pressed={kind === group.kind}
                                            onClick={() => {
                                                setSelectedKey("");
                                                setVersionKey("");
                                                setKind(group.kind);
                                                setPage(1);
                                            }}
                                        >
                                            {group.label}
                                            <small>{group.entries.length}</small>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {results.length > 0 && (
                                <div className="asset-register-body">
                                    <div className="asset-register-list">
                                        {results.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((item) => {
                                            const Icon = icons[item.kind];
                                            const node = nodeById.get(item.nodeId)!;
                                            const label = groups.find((group) => group.kind === item.kind)?.label;
                                            const excerpt = (item.kind === "txt" || item.kind === "markdown") && node.metadata?.content;
                                            return (
                                                <button
                                                    key={item.key}
                                                    className="asset-register-row"
                                                    aria-pressed={entry?.key === item.key}
                                                    onClick={() => {
                                                        setSelectedKey(item.key);
                                                        setVersionKey("");
                                                    }}
                                                >
                                                    <span className="asset-register-thumb" data-kind={item.kind}>
                                                        <Icon size={22} strokeWidth={1.5} aria-hidden />
                                                        {item.kind === "image" && <AssetPreview node={node} />}
                                                    </span>
                                                    <span className="min-w-0">
                                                        <strong className="block truncate text-sm font-semibold">{item.title}</strong>
                                                        <span className="mt-1 block truncate text-xs text-muted-foreground">{excerpt || label}</span>
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {selected && entry && (
                                        <section className="asset-register-detail">
                                            <Button className="asset-detail-back" type="text" icon={<ArrowLeft size={16} />} onClick={() => setSelectedKey("")}>
                                                {t("upstreamSix.assetCatalog")}
                                            </Button>
                                            <div className="asset-detail-actions flex flex-wrap items-center gap-2">
                                                {editing ? (
                                                    <Input
                                                        autoFocus
                                                        aria-label={t("upstreamSix.renameAsset")}
                                                        value={draft}
                                                        disabled={saving}
                                                        onChange={(event) => setDraft(event.target.value)}
                                                        onPressEnter={() => void submitRename()}
                                                        onBlur={() => void submitRename()}
                                                        onKeyDown={(event) => {
                                                            if (event.key === "Escape") setEditing(false);
                                                        }}
                                                    />
                                                ) : (
                                                    <button
                                                        className="flex min-w-0 items-center gap-2 text-left font-medium"
                                                        onClick={() => {
                                                            setDraft(selected.node.title);
                                                            setEditing(true);
                                                        }}
                                                    >
                                                        <span className="truncate">{selected.node.title}</span>
                                                        <Pencil className="size-4 shrink-0" aria-label={t("upstreamSix.renameAsset")} />
                                                    </button>
                                                )}
                                                <Button onClick={() => onLocate(selected.version?.nodeId || selected.node.id)}>{t("upstreamSix.locate")}</Button>
                                                {selected.version?.promotable && !selected.version.primary && (
                                                    <Button
                                                        loading={saving}
                                                        disabled={Boolean(selected.node.metadata?.locked || selected.node.metadata?.status === "loading" || selected.node.metadata?.fileUpload)}
                                                        onClick={async () => {
                                                            setSaving(true);
                                                            try {
                                                                await onPromote(selected.version!);
                                                            } catch {
                                                                /* Presented by the canvas write handler. */
                                                            } finally {
                                                                setSaving(false);
                                                            }
                                                        }}
                                                    >
                                                        {t("upstreamSix.promote")}
                                                    </Button>
                                                )}
                                            </div>
                                            {entry && entry.versions.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {entry.versions.map((item) => (
                                                        <Button size="small" key={item.key} aria-pressed={versionKey === item.key} type={versionKey === item.key ? "primary" : "default"} onClick={() => setVersionKey(item.key)}>
                                                            {item.label}
                                                            {item.primary ? ` · ${t("upstreamSix.primary")}` : ""}
                                                        </Button>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="asset-detail-preview" data-kind={entry.kind}>
                                                <AssetPreview key={entry.key + versionKey} node={selected.node} />
                                            </div>
                                        </section>
                                    )}
                                </div>
                            )}
                            {!results.length && <p className="py-10 text-center text-muted-foreground">{t("assets.noMatch")}</p>}
                            {results.length > pageSize && (
                                <Pagination
                                    align="center"
                                    current={currentPage}
                                    pageSize={pageSize}
                                    total={results.length}
                                    onChange={(next) => {
                                        setPage(next);
                                        setSelectedKey("");
                                        setVersionKey("");
                                    }}
                                    showSizeChanger={false}
                                />
                            )}
                        </>
                    ) : (
                        <div className="asset-register-empty grid place-content-center justify-items-center gap-4 rounded-2xl border border-border text-center">
                            <span className="asset-register-folder">
                                <FolderOpen size={30} strokeWidth={1.45} aria-hidden />
                            </span>
                            <p className="font-medium">{t("upstreamSix.emptyAssets")}</p>
                            <Button type="primary" onClick={onBack}>
                                {t("upstreamSix.backToCanvas")}
                            </Button>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

function AssetPreview({ node }: { node: CanvasNodeData }) {
    const isText = node.type === CanvasNodeType.Text || node.type === CanvasNodeType.Markdown;
    const key = isText ? "" : node.metadata?.storageKey || "";
    const delivery = useResourceDelivery(key);
    const [localUrl, setLocalUrl] = useState("");
    const fallback = node.metadata?.content || "";
    useEffect(() => {
        if (isText || delivery.controlled) return;
        let active = true;
        const pending = node.type === CanvasNodeType.Image ? resolveImageUrl(key, fallback) : resolveMediaUrl(key, fallback);
        void pending
            .then((url) => {
                if (active) setLocalUrl(url);
            })
            .catch(() => {});
        return () => {
            active = false;
        };
    }, [isText, delivery.controlled, key, fallback, node.type]);
    const url = delivery.controlled ? delivery.url : localUrl;
    if (isText) return <pre className="whitespace-pre-wrap break-words">{fallback}</pre>;
    if (!url) return null;
    if (node.type === CanvasNodeType.Image) return <img src={url} alt={node.title} className="min-h-0 w-full flex-1 object-contain" />;
    if (node.type === CanvasNodeType.Video) return <video src={url} controls preload="metadata" className="min-h-0 w-full flex-1 object-contain" />;
    return <audio src={url} controls preload="metadata" />;
}
