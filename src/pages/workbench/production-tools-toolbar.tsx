import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { Button, Input, Modal, Segmented, Select } from "antd";
import { useI18n } from "@/i18n/use-i18n";
import { useProductionText } from "@/i18n/production-tools";
import { productionTools, productionToolName, type ProductionTool } from "./catalog";

export function ProductionToolsToolbar({ selected, onSelect }: { selected?: ProductionTool; onSelect: (tool: ProductionTool, preset: number) => void }) {
    const { locale } = useI18n();
    const copy = useProductionText();
    const [open, setOpen] = useState(!selected);
    const [query, setQuery] = useState("");
    const [kind, setKind] = useState("all");
    const [preset, setPreset] = useState(0);
    const [searchParams] = useSearchParams();
    const routePreset = Number(searchParams.get("preset") || 0);
    useEffect(() => {
        setPreset(Number.isInteger(routePreset) && routePreset >= 0 && routePreset <= 2 ? routePreset : 0);
    }, [routePreset]);
    const tools = useMemo(() => productionTools.filter((tool) => (kind === "all" || tool.kind === kind) && productionToolName(tool, locale).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())), [query, kind, locale]);
    return (
        <>
            <header className="flex flex-wrap items-center gap-3 border-b border-foreground/10 px-4 py-3">
                <h1 className="mr-auto text-sm font-medium">{selected ? productionToolName(selected, locale) : copy(0)}</h1>
                {selected && <span className="max-w-sm text-xs text-foreground/60">{copy(30)}</span>}
                <Select
                    aria-label={copy(24)}
                    value={preset}
                    options={[0, 1, 2].map((value) => ({ value, label: copy(7 + value) }))}
                    onChange={(value) => {
                        setPreset(value);
                        if (selected) onSelect(selected, value);
                    }}
                />
                <Button onClick={() => setOpen(true)}>
                    {copy(0)} · {productionTools.length}
                </Button>
            </header>
            <Modal open={open} onCancel={() => setOpen(false)} footer={null} title={copy(0)} width={1000} centered>
                <div className="mb-4 flex flex-wrap gap-3">
                    <Input className="min-w-40 flex-1" aria-label={copy(1)} placeholder={copy(1)} value={query} onChange={(event) => setQuery(event.target.value)} allowClear />
                    <Segmented
                        value={kind}
                        onChange={(value) => setKind(String(value))}
                        options={[
                            { value: "all", label: copy(2) },
                            { value: "image", label: copy(3) },
                            { value: "video", label: copy(4) },
                        ]}
                    />
                </div>
                <div className="grid max-h-[65vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
                    {tools.map((tool) => (
                        <button
                            key={tool.key}
                            type="button"
                            className="overflow-hidden rounded-lg border border-foreground/15 text-left transition hover:border-foreground/40 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                            aria-label={`${copy(5)}: ${productionToolName(tool, locale)}`}
                            onClick={() => {
                                onSelect(tool, preset);
                                setOpen(false);
                            }}
                        >
                            <img src={`/images/production-tools/${tool.key}.jpg`} alt="" className="aspect-[3/2] w-full object-cover" loading="lazy" decoding="async" />
                            <span className="block px-3 pb-1 pt-3 text-sm font-medium">{productionToolName(tool, locale)}</span>
                            <span className="block px-3 pb-3 text-xs text-foreground/60">{tool.kind === "image" ? copy(3) : copy(4)}</span>
                        </button>
                    ))}
                    {!tools.length && <p className="col-span-full p-6 text-center">{copy(25)}</p>}
                </div>
            </Modal>
        </>
    );
}
