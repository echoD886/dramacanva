import { useMemo, useState } from "react";
import { Button, Input, Modal, Select } from "antd";
import { X } from "lucide-react";
import { CanvasProjectAssetModal } from "./canvas-project-asset-modal";
import { AssetThumbnail, ROLE_LABELS } from "./storyboard-assets-cell";
import type { InsertAssetPayload } from "./asset-picker-modal";
import { useI18n } from "@/i18n/use-i18n";
import { useProductionText } from "@/i18n/production-tools";
import { ApiError } from "@/services/api/request";
import { bindingForConnectedNode, isStoryboardPreviewAsset } from "@/lib/canvas/canvas-storyboard-materializer";
import { normalizeStoryboardAssetBindings } from "@/lib/canvas/canvas-storyboard-assets";
import type { ProjectDetail } from "@/services/api/projects";
import type { CanvasNodeData, StoryboardAssetBinding } from "@/types/canvas";

export function StoryboardAssetPickerModal({
    nodes,
    nodeId,
    bindings,
    shotNumber,
    detail,
    onClose,
    onSave,
    onImport,
}: {
    nodes: CanvasNodeData[];
    nodeId: string;
    bindings: StoryboardAssetBinding[];
    shotNumber: number;
    detail?: ProjectDetail;
    onClose: () => void;
    onSave: (bindings: StoryboardAssetBinding[]) => void | Promise<void>;
    onImport: (payloads: InsertAssetPayload[]) => Promise<CanvasNodeData[]>;
}) {
    const { t } = useI18n();
    const copy = useProductionText();
    const [draft, setDraft] = useState(() => normalizeStoryboardAssetBindings(bindings));
    const [query, setQuery] = useState("");
    const [role, setRole] = useState("all");
    const [libraryOpen, setLibraryOpen] = useState(false);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
    const roles = Object.entries(ROLE_LABELS).map(([value, key]) => ({ value, label: t(key) }));
    const selected = new Set(draft.map((binding) => binding.nodeId));
    const candidates = nodes.filter(
        (node) =>
            isStoryboardPreviewAsset(node) &&
            (selected.has(node.id) || !["shot", "action_board", "final"].includes(node.metadata?.workflowKind || "")) &&
            Boolean(node.metadata?.content || node.metadata?.storageKey || node.metadata?.drawingPreviewUrl || node.metadata?.characterAssetId),
    );
    const filtered = candidates.filter((node) => (role === "all" || bindingForConnectedNode(node)?.role === role) && `${node.title} ${(node.metadata?.assetTags || []).join(" ")}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
    return (
        <>
            <Modal open title={copy(11, { shot: shotNumber })} onCancel={onClose} footer={null} width={760} centered>
                <div data-node-id={nodeId} data-canvas-no-zoom data-canvas-wheel-scroll onPointerDown={(event) => event.stopPropagation()} onWheel={(event) => event.stopPropagation()}>
                    <p className="mb-4 text-sm text-foreground/60">{copy(10)}</p>
                    <div className="mb-4 flex flex-wrap gap-2">
                        <Input aria-label={copy(12)} placeholder={copy(12)} value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-40 flex-1" />
                        <Select aria-label={copy(29)} value={role} onChange={setRole} options={[{ value: "all", label: copy(2) }, ...roles]} className="min-w-32" />
                        <Button onClick={() => setLibraryOpen(true)}>{copy(13)}</Button>
                    </div>
                    <div className="grid max-h-[38vh] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
                        {filtered.map((node) => (
                            <button
                                key={node.id}
                                type="button"
                                aria-pressed={selected.has(node.id)}
                                className={`flex items-center gap-2 rounded-lg border p-2 text-left ${selected.has(node.id) ? "border-foreground/50 bg-foreground/10" : "border-foreground/15"}`}
                                onClick={() =>
                                    setDraft((current) =>
                                        selected.has(node.id) ? current.filter((binding) => binding.nodeId !== node.id) : [...current, ...[bindingForConnectedNode(node)].filter((binding): binding is StoryboardAssetBinding => Boolean(binding))],
                                    )
                                }
                            >
                                <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded">
                                    <AssetThumbnail node={node} />
                                </span>
                                <span className="min-w-0 truncate">{node.title}</span>
                            </button>
                        ))}
                        {!filtered.length && <p className="col-span-full p-6 text-center text-foreground/60">{copy(25)}</p>}
                    </div>
                    <div className="my-4 flex items-center justify-between">
                        <span>{copy(27, { count: draft.length })}</span>
                        <Button size="small" onClick={() => setDraft([])}>
                            {copy(15)}
                        </Button>
                    </div>
                    <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto">
                        {draft.map((binding) => (
                            <div key={binding.nodeId} className="flex items-center gap-2 rounded border border-foreground/15 p-2 text-sm">
                                <span className="max-w-40 truncate">{byId.get(binding.nodeId)?.title || copy(18)}</span>
                                <Select aria-label={copy(24)} value={binding.role} options={roles} onChange={(value) => setDraft((current) => current.map((item) => (item.nodeId === binding.nodeId ? { ...item, role: value } : item)))} />
                                <button type="button" aria-label={copy(17)} onClick={() => setDraft((current) => current.filter((item) => item.nodeId !== binding.nodeId))}>
                                    <X className="size-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                    {error && (
                        <p role="alert" className="mt-3 text-[var(--color-danger)]">
                            {error}
                        </p>
                    )}
                    <div className="mt-4 flex justify-end gap-2">
                        <Button onClick={onClose}>{copy(26)}</Button>
                        <Button
                            type="primary"
                            loading={saving}
                            onClick={async () => {
                                setSaving(true);
                                setError("");
                                try {
                                    await onSave(draft);
                                } catch (error) {
                                    setError(error instanceof ApiError ? error.message : error instanceof Error && error.message === "canvas_edit_lease_conflict" ? copy(23) : copy(18));
                                } finally {
                                    setSaving(false);
                                }
                            }}
                        >
                            {copy(14)}
                        </Button>
                    </div>
                </div>
            </Modal>
            {libraryOpen && (
                <CanvasProjectAssetModal
                    open
                    detail={detail}
                    onClose={() => setLibraryOpen(false)}
                    onInsert={async (payloads) => {
                        if (payloads.some((payload) => payload.kind === "text")) throw new Error(copy(28));
                        const imported = await onImport(payloads);
                        setDraft((current) =>
                            normalizeStoryboardAssetBindings([
                                ...current,
                                ...imported.flatMap((node) => {
                                    const binding = bindingForConnectedNode(node);
                                    return binding ? [binding] : [];
                                }),
                            ]),
                        );
                    }}
                />
            )}
        </>
    );
}
