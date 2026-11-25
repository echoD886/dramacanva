import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button, Input, InputNumber, Modal, Select, Switch } from "antd";
import { AlertTriangle, Box, Check, FileImage, Link2, Plus, Save, SlidersHorizontal, Trash2 } from "lucide-react";
import { nanoid } from "nanoid";
import { useI18n } from "@/i18n/use-i18n";
import { styleAssetValidationDisplay } from "@/i18n/style-validation";

import {
    createStyleProfileSnapshot,
    MAX_STYLE_ASSETS,
    type StyleAssetBinding,
    type StyleAssetKind,
    type StyleAssetStatus,
    type StyleProfileSnapshot,
} from "@/lib/canvas/style-profile";

const kindOptions: Array<{ value: StyleAssetKind; label: string }> = [
    { value: "lora", label: "LoRA" },
    { value: "template", label: "图片模板" },
    { value: "reference", label: "参考图组" },
    { value: "prompt", label: "提示词模块" },
];

const statusOptions: Array<{ value: StyleAssetStatus; label: string }> = [
    { value: "draft", label: "待验证" },
    { value: "validated", label: "已验证" },
    { value: "unavailable", label: "不可用" },
];

const policyOptions: Array<{ value: NonNullable<StyleProfileSnapshot["executionPolicy"]>; label: string }> = [
    { value: "compatible-fallback", label: "兼容降级" },
    { value: "strict-assets", label: "严格阻止" },
];

const emptyAsset = (): StyleAssetBinding => ({
    id: nanoid(),
    kind: "lora",
    provider: "liblib",
    title: "",
    enabled: false,
    weight: 0.8,
    status: "draft",
});

type StyleAssetBindingModalProps = {
    open: boolean;
    profile: StyleProfileSnapshot | null;
    onClose: () => void;
    onApply: (profile: StyleProfileSnapshot) => void;
};

export function StyleAssetBindingModal({ open, profile, onClose, onApply }: StyleAssetBindingModalProps) {
    const { t, number } = useI18n();
    const [draft, setDraft] = useState<StyleProfileSnapshot | null>(profile);
    const [editingId, setEditingId] = useState("");

    useEffect(() => {
        if (!open) return;
        setDraft(profile ? createStyleProfileSnapshot(profile) : null);
        setEditingId(profile?.assets[0]?.id || "");
    }, [open, profile]);

    const editing = useMemo(() => draft?.assets.find((asset) => asset.id === editingId), [draft, editingId]);
    const issues = useMemo(() => draft?.assets.map((asset) => ({ id: asset.id, message: styleAssetValidationDisplay(asset, t) })).filter((issue) => issue.message) || [], [draft, t]);
    if (!draft) return null;

    const updateAsset = (patch: Partial<StyleAssetBinding>) => {
        setDraft((current) => current ? { ...current, assets: current.assets.map((asset) => asset.id === editingId ? { ...asset, ...patch } : asset) } : current);
    };
    const addAsset = () => {
        const asset = emptyAsset();
        setDraft((current) => current ? { ...current, assets: [...current.assets, asset] } : current);
        setEditingId(asset.id);
    };
    const deleteAsset = (id: string) => {
        setDraft((current) => current ? { ...current, assets: current.assets.filter((asset) => asset.id !== id) } : current);
        setEditingId((current) => current === id ? draft.assets.find((asset) => asset.id !== id)?.id || "" : current);
    };

    return (
        <Modal
            rootClassName="style-asset-binding-modal"
            open={open}
            title={null}
            footer={null}
            centered
            width="min(980px, calc(100vw - 24px))"
            onCancel={onClose}
            styles={{ container: { padding: 0 }, body: { padding: 0 } }}
        >
            <div className="flex max-h-dvh min-h-0 flex-col overflow-hidden bg-background text-foreground">
                <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3 pr-12 sm:items-center sm:px-5">
                    <div className="min-w-0">
                        <h2 className="text-sm font-semibold">{t("styleBinding.title")}</h2>
                        <p className="mt-0.5 text-[var(--fs-label)] text-foreground/45">{t("styleBinding.subtitle")}</p>
                    </div>
                    <Button className="shrink-0" icon={<Plus className="size-3.5" />} disabled={draft.assets.length >= MAX_STYLE_ASSETS} title={draft.assets.length >= MAX_STYLE_ASSETS ? t("styleBinding.limit", { count: number(MAX_STYLE_ASSETS) }) : undefined} onClick={addAsset}>{t("styleBinding.add")}</Button>
                </header>

                <div className="grid min-h-0 flex-1 md:grid-cols-3">
                    <aside className="thin-scrollbar max-h-52 min-h-0 overflow-y-auto border-b border-border md:col-span-1 md:max-h-none md:border-b-0 md:border-r">
                        <div className="sticky top-0 z-10 border-b border-border bg-background px-4 py-3">
                            <label className="flex items-center justify-between gap-3 text-xs">
                                <span className="min-w-0">
                                    <span className="block font-medium">{t("styleBinding.policy")}</span>
                                    <span className="mt-0.5 block text-[var(--fs-tiny)] text-foreground/42">{t("styleBinding.policyHelp")}</span>
                                </span>
                                <Select<NonNullable<StyleProfileSnapshot["executionPolicy"]>>
                                    className="shrink-0"
                                    size="small"
                                    value={draft.executionPolicy || "compatible-fallback"}
                                    options={policyOptions.map((option) => ({ ...option, label: t(option.value === "strict-assets" ? "styleBinding.strict" : "styleBinding.fallback") }))}
                                    onChange={(executionPolicy) => setDraft({ ...draft, executionPolicy })}
                                />
                            </label>
                        </div>

                        {draft.assets.length ? (
                            <div className="divide-y divide-border">
                                {draft.assets.map((asset) => {
                                    const issue = styleAssetValidationDisplay(asset, t);
                                    return (
                                        <button
                                            key={asset.id}
                                            type="button"
                                            className={`flex w-full items-start gap-3 px-4 py-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset ${editingId === asset.id ? "bg-foreground/10" : "hover:bg-foreground/5"}`}
                                            onClick={() => setEditingId(asset.id)}
                                        >
                                            <AssetKindIcon kind={asset.kind} />
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-xs font-medium">{asset.title || t("styleBinding.untitled")}</span>
                                                <span className="mt-1 block truncate text-[var(--fs-tiny)] text-foreground/42">{assetKindLabel(asset.kind, t)} · {assetStatusLabel(asset.status, t)}</span>
                                            </span>
                                            <span className={`mt-1 size-1.5 shrink-0 rounded-full ${issue ? "bg-red-500" : asset.enabled ? asset.status === "validated" ? "bg-emerald-500" : "bg-amber-500" : "bg-foreground/20"}`} />
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <EmptyAssetList />
                        )}
                    </aside>

                    <main className="thin-scrollbar min-h-0 overflow-y-auto p-4 sm:p-5 md:col-span-2">
                        {editing ? (
                            <AssetEditor asset={editing} onChange={updateAsset} onDelete={() => deleteAsset(editing.id)} />
                        ) : (
                            <div className="grid min-h-72 place-items-center text-center">
                                <div><Plus className="mx-auto size-5 text-foreground/25" /><p className="mt-2 text-xs text-foreground/50">{t("styleBinding.select")}</p></div>
                            </div>
                        )}
                    </main>
                </div>

                <footer className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div className="flex min-w-0 items-start gap-2 text-[var(--fs-tiny)] text-foreground/45">
                        {issues.length ? <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-red-500" /> : <Check className="mt-0.5 size-3.5 shrink-0" />}
                        <span className="min-w-0 leading-5">{issues.length ? t("styleBinding.issues", { count: number(issues.length), error: issues[0].message }) : t("styleBinding.counts", { total: number(draft.assets.length), enabled: number(draft.assets.filter((asset) => asset.enabled).length) })}</span>
                    </div>
                    <div className="flex shrink-0 justify-end gap-2">
                        <Button onClick={onClose}>{t("styleBinding.cancel")}</Button>
                        <Button
                            type="primary"
                            icon={<Save className="size-3.5" />}
                            disabled={issues.length > 0}
                            onClick={() => onApply(createStyleProfileSnapshot({ ...draft, source: "user", revision: draft.revision + 1 }))}
                        >
                            {t("styleBinding.apply")}
                        </Button>
                    </div>
                </footer>
            </div>
        </Modal>
    );
}

function AssetEditor({ asset, onChange, onDelete }: { asset: StyleAssetBinding; onChange: (patch: Partial<StyleAssetBinding>) => void; onDelete: () => void }) {
    const { t } = useI18n();
    const validationMessage = styleAssetValidationDisplay(asset, t);
    return (
        <div className="space-y-5">
            <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
                <div>
                    <h3 className="text-sm font-semibold">{t("styleBinding.config")}</h3>
                    <p className="mt-1 text-[var(--fs-label)] text-foreground/45">{t("styleBinding.configHelp")}</p>
                </div>
                <Button danger type="text" icon={<Trash2 className="size-3.5" />} onClick={onDelete}>{t("styleBinding.delete")}</Button>
            </div>

            {validationMessage ? (
                <div className="flex gap-2 border-l-2 border-red-500 bg-red-500/5 px-3 py-2 text-[var(--fs-label)] leading-5 text-foreground/65">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-red-500" />
                    <span>{validationMessage}</span>
                </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("styleBinding.kind")}>
                    <Select<StyleAssetKind> value={asset.kind} options={kindOptions.map((option) => ({ ...option, label: assetKindLabel(option.value, t) }))} onChange={(kind) => onChange({ kind })} />
                </Field>
                <Field label={t("styleBinding.enabled")}>
                    <div className="flex h-8 items-center justify-between border-b border-border">
                        <span className="text-xs text-foreground/55">{t("styleBinding.participate")}</span>
                        <Switch size="small" checked={asset.enabled !== false} onChange={(enabled) => onChange({ enabled })} />
                    </div>
                </Field>
                <Field label={t("styleBinding.name")}>
                    <Input value={asset.title} placeholder={t("styleBinding.nameExample")} onChange={(event) => onChange({ title: event.target.value })} />
                </Field>
                <Field label={t("styleBinding.status")}>
                    <Select<StyleAssetStatus> value={asset.status} options={statusOptions.map((option) => ({ ...option, label: assetStatusLabel(option.value, t) }))} onChange={(status) => onChange({ status })} />
                </Field>
                <Field label={t("styleBinding.provider")}>
                    <Input value={asset.provider} placeholder={t("styleBinding.providerHint")} onChange={(event) => onChange({ provider: event.target.value })} />
                </Field>
                <Field label={t("styleBinding.sourceId")}>
                    <Input value={asset.sourceId} placeholder={t("styleBinding.idHint")} onChange={(event) => onChange({ sourceId: event.target.value })} />
                </Field>
                <Field label={t("styleBinding.sourceUrl")} className="sm:col-span-2">
                    <Input value={asset.sourceUrl} placeholder={t("styleBinding.sourceHelp")} onChange={(event) => onChange({ sourceUrl: event.target.value })} />
                </Field>
                <Field label={t("styleBinding.model")}>
                    <Input value={asset.model} placeholder={t("styleBinding.modelHint")} onChange={(event) => onChange({ model: event.target.value })} />
                </Field>
                <Field label={t("styleBinding.version")}>
                    <Input value={asset.version} placeholder={t("styleBinding.versionHint")} onChange={(event) => onChange({ version: event.target.value })} />
                </Field>
                <Field label={t("styleBinding.baseModels")} className="sm:col-span-2">
                    <Select<string[]> mode="tags" value={asset.baseModels || []} tokenSeparators={[","]} placeholder={t("styleBinding.baseModelsHint")} onChange={(baseModels) => onChange({ baseModels })} />
                </Field>
            </div>

            {asset.kind === "lora" ? <LoraFields asset={asset} onChange={onChange} /> : null}
            {asset.kind === "reference" ? <ReferenceFields asset={asset} onChange={onChange} /> : null}
            {asset.kind === "prompt" || asset.kind === "template" ? <PromptFields asset={asset} onChange={onChange} /> : null}

            <GenerationParameterFields asset={asset} onChange={onChange} />
            <LicenseFields asset={asset} onChange={onChange} />

            {asset.enabled !== false && (asset.kind === "lora" || asset.kind === "reference") ? (
                <div className="flex gap-2 border-l-2 border-amber-500 bg-amber-500/5 px-3 py-2 text-[var(--fs-label)] leading-5 text-foreground/60">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                    <span>{t(asset.kind === "lora" ? "styleBinding.loraWarning" : "styleBinding.referenceWarning")}</span>
                </div>
            ) : null}
        </div>
    );
}

function LoraFields({ asset, onChange }: AssetFieldProps) {
    const { t } = useI18n();
    return (
        <section className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
            <Field label={t("styleBinding.weight")}>
                <InputNumber className="w-full" min={0} max={2} step={0.05} value={asset.weight} onChange={(weight) => onChange({ weight: weight ?? undefined })} />
            </Field>
            <Field label={t("styleBinding.triggers")}>
                <Select<string[]> mode="tags" value={asset.triggerWords || []} tokenSeparators={[","]} placeholder={t("styleBinding.enter")} onChange={(triggerWords) => onChange({ triggerWords })} />
            </Field>
        </section>
    );
}

function ReferenceFields({ asset, onChange }: AssetFieldProps) {
    const { t } = useI18n();
    return (
        <section className="grid gap-4 border-t border-border pt-4">
            <Field label={t("styleBinding.referenceUrls")}>
                <Select<string[]> mode="tags" value={asset.referenceUrls || []} tokenSeparators={[","]} placeholder={t("styleBinding.referenceHint")} onChange={(referenceUrls) => onChange({ referenceUrls })} />
            </Field>
            <Field label={t("styleBinding.resourceIds")}>
                <Select<string[]> mode="tags" value={asset.referenceResourceIds || []} tokenSeparators={[","]} placeholder={t("styleBinding.resourceHint")} onChange={(referenceResourceIds) => onChange({ referenceResourceIds })} />
            </Field>
        </section>
    );
}

function PromptFields({ asset, onChange }: AssetFieldProps) {
    const { t } = useI18n();
    return (
        <section className="border-t border-border pt-4">
            <Field label={t("styleBinding.prompt")}>
                <Input.TextArea autoSize={{ minRows: 4, maxRows: 8 }} value={asset.promptFragment} placeholder={t("styleBinding.promptHint")} onChange={(event) => onChange({ promptFragment: event.target.value })} />
            </Field>
        </section>
    );
}

function GenerationParameterFields({ asset, onChange }: AssetFieldProps) {
    const { t } = useI18n();
    const parameters = asset.parameters || {};
    const updateParameters = (patch: NonNullable<StyleAssetBinding["parameters"]>) => onChange({ parameters: { ...parameters, ...patch } });
    return (
        <section className="border-t border-border pt-4">
            <h4 className="mb-3 text-xs font-semibold">{t("styleBinding.parameters")}</h4>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label={t("canvasExtra.styleBinding.sampler")}><Input value={parameters.sampler} placeholder={t("styleBinding.optional")} onChange={(event) => updateParameters({ sampler: event.target.value })} /></Field>
                <Field label={t("canvasExtra.styleBinding.steps")}><InputNumber className="w-full" min={1} max={200} value={parameters.steps} onChange={(steps) => updateParameters({ steps: steps ?? undefined })} /></Field>
                <Field label="CFG"><InputNumber className="w-full" min={0} max={50} step={0.5} value={parameters.cfg} onChange={(cfg) => updateParameters({ cfg: cfg ?? undefined })} /></Field>
                <Field label={t("styleBinding.size")}><Input value={parameters.size} placeholder={t("styleBinding.sizeHint")} onChange={(event) => updateParameters({ size: event.target.value })} /></Field>
            </div>
        </section>
    );
}

function LicenseFields({ asset, onChange }: AssetFieldProps) {
    const { t } = useI18n();
    return (
        <section className="border-t border-border pt-4">
            <h4 className="mb-3 text-xs font-semibold">{t("styleBinding.license")}</h4>
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("styleBinding.commercial")}>
                    <Select
                        value={asset.license?.commercial === true ? "yes" : asset.license?.commercial === false ? "no" : "unknown"}
                        options={[{ value: "unknown", label: t("styleBinding.unknown") }, { value: "yes", label: t("styleBinding.allowed") }, { value: "no", label: t("styleBinding.notAllowed") }]}
                        onChange={(value: "unknown" | "yes" | "no") => onChange({ license: { ...asset.license, commercial: value === "unknown" ? undefined : value === "yes" } })}
                    />
                </Field>
                <Field label={t("styleBinding.licenseSource")}><Input value={asset.license?.source} placeholder={t("styleBinding.licenseSourceHint")} onChange={(event) => onChange({ license: { ...asset.license, source: event.target.value } })} /></Field>
                <Field label={t("styleBinding.licenseNote")} className="sm:col-span-2"><Input value={asset.license?.note} placeholder={t("styleBinding.licenseNoteHint")} onChange={(event) => onChange({ license: { ...asset.license, note: event.target.value } })} /></Field>
            </div>
        </section>
    );
}

type AssetFieldProps = {
    asset: StyleAssetBinding;
    onChange: (patch: Partial<StyleAssetBinding>) => void;
};

function AssetKindIcon({ kind }: { kind: StyleAssetKind }) {
    return (
        <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded bg-foreground/5 text-foreground/55">
            {kind === "lora" ? <SlidersHorizontal className="size-3.5" /> : kind === "reference" ? <FileImage className="size-3.5" /> : kind === "template" ? <Box className="size-3.5" /> : <Link2 className="size-3.5" />}
        </span>
    );
}

function EmptyAssetList() {
    const { t } = useI18n();
    return (
        <div className="grid min-h-52 place-items-center px-6 text-center">
            <div><Box className="mx-auto size-5 text-foreground/25" /><p className="mt-2 text-xs font-medium">{t("styleBinding.empty")}</p><p className="mt-1 text-[var(--fs-tiny)] leading-5 text-foreground/42">{t("styleBinding.emptyHelp")}</p></div>
        </div>
    );
}

function assetKindLabel(kind: StyleAssetKind, t: ReturnType<typeof useI18n>["t"]) {
    return kind === "lora" ? "LoRA" : kind === "template" ? t("styleBinding.template") : kind === "reference" ? t("styleBinding.reference") : kind === "prompt" ? t("styleBinding.prompt") : kind;
}

function assetStatusLabel(status: StyleAssetStatus, t: ReturnType<typeof useI18n>["t"]) {
    return status === "validated" ? t("styleBinding.validated") : status === "unavailable" ? t("styleBinding.unavailable") : status === "draft" ? t("styleBinding.draft") : status;
}

function Field({ label, className = "", children }: { label: string; className?: string; children: ReactNode }) {
    return <label className={`grid gap-1.5 text-xs ${className}`}><span className="font-medium text-foreground/60">{label}</span>{children}</label>;
}
