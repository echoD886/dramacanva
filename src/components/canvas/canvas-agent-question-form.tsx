import { useState } from "react";
import { Button, Input } from "antd";
import { useI18n } from "@/i18n/use-i18n";
import { agentUpgradeText } from "@/i18n/agent-upgrade-copy";

export type AgentQuestionField = {
    id: string;
    title: string;
    section?: string;
    type: "single_select" | "multi_select" | "segmented" | "text" | "textarea" | "model_picker";
    options?: { id?: string; label: string; detail?: string; recommended?: boolean }[];
    defaultValue?: string | string[];
    required?: boolean;
    allowCustom?: boolean;
    placeholder?: string;
};
export type AgentFormQuestion = { question: string; fields?: AgentQuestionField[]; recordDecision?: boolean; allowFreeform?: boolean };

export function agentQuestionDefaults(fields: AgentQuestionField[]) {
    return Object.fromEntries(
        fields.map((field) => [
            field.id,
            field.defaultValue ?? (field.type === "multi_select" ? (field.options ?? []).filter((o) => o.recommended).map((o) => o.id ?? o.label) : (field.options?.find((o) => o.recommended)?.id ?? field.options?.find((o) => o.recommended)?.label ?? "")),
        ]),
    );
}

export function agentQuestionAnswer(question: AgentFormQuestion, values: Record<string, string | string[]>, notes: string) {
    const lines = (question.fields ?? [])
        .map((field) => {
            const raw = values[field.id];
            const selected = Array.isArray(raw) ? raw : raw ? [raw] : [];
            return selected.length ? `${field.title}: ${selected.map((value) => field.options?.find((option) => (option.id ?? option.label) === value)?.label ?? value).join(", ")}` : "";
        })
        .filter(Boolean);
    if (notes.trim()) lines.push(notes.trim());
    return `${question.question}\n${lines.join("\n")}`;
}

export function AgentQuestionForm({ question, disabled, onAnswer }: { question: AgentFormQuestion; disabled: boolean; onAnswer: (answer: string) => void }) {
    const { locale } = useI18n();
    const text = (key: Parameters<typeof agentUpgradeText>[1]) => agentUpgradeText(locale, key);
    const fields = question.fields ?? [];
    const [values, setValues] = useState(() => agentQuestionDefaults(fields));
    const [notes, setNotes] = useState("");
    const update = (id: string, value: string | string[]) => setValues((previous) => ({ ...previous, [id]: value }));
    const complete = fields.every((field) => !field.required || (Array.isArray(values[field.id]) ? values[field.id].length > 0 : String(values[field.id] ?? "").trim().length > 0));
    return (
        <form
            className="space-y-3 p-3"
            onSubmit={(event) => {
                event.preventDefault();
                if (!disabled && complete) onAnswer(agentQuestionAnswer(question, values, notes));
            }}
        >
            <div className="max-h-80 space-y-3 overflow-y-auto" data-canvas-wheel-scroll>
                {fields.map((field, index) => (
                    <fieldset key={field.id} disabled={disabled} className="space-y-2">
                        {field.section && field.section !== fields[index - 1]?.section ? <legend className="pt-2 text-sm font-semibold">{field.section}</legend> : null}
                        <label htmlFor={`agent-field-${field.id}`} className="block text-xs font-medium">
                            {field.title} {!field.required ? <span className="opacity-60">· {text("optional")}</span> : null}
                        </label>
                        {field.type === "text" || field.type === "textarea" || !field.options?.length ? (
                            field.type === "textarea" ? (
                                <Input.TextArea id={`agent-field-${field.id}`} value={String(values[field.id] ?? "")} placeholder={field.placeholder} maxLength={4000} onChange={(event) => update(field.id, event.target.value)} />
                            ) : (
                                <Input id={`agent-field-${field.id}`} value={String(values[field.id] ?? "")} placeholder={field.placeholder} maxLength={1000} onChange={(event) => update(field.id, event.target.value)} />
                            )
                        ) : (
                            <>
                                <div className="flex flex-wrap gap-2" role="group" aria-label={field.title}>
                                    {(field.options ?? []).map((option) => {
                                        const value = option.id ?? option.label;
                                        const current = values[field.id];
                                        const selected = Array.isArray(current) ? current.includes(value) : current === value;
                                        return (
                                            <button
                                                key={value}
                                                type="button"
                                                aria-pressed={selected}
                                                title={option.detail}
                                                className="rounded border px-2 py-1 text-xs focus-visible:outline disabled:opacity-50"
                                                style={{ background: selected ? "var(--surface-active)" : "transparent", borderColor: "var(--border)", fontWeight: selected ? 600 : 400 }}
                                                onClick={() => update(field.id, field.type === "multi_select" ? (selected ? (Array.isArray(current) ? current : []).filter((v) => v !== value) : [...(Array.isArray(current) ? current : []), value]) : value)}
                                            >
                                                {option.label}
                                                {selected ? " ✓" : ""}
                                            </button>
                                        );
                                    })}
                                </div>
                                {field.allowCustom ? (
                                    <Input
                                        id={`agent-field-${field.id}`}
                                        aria-label={text("custom")}
                                        placeholder={text("custom")}
                                        maxLength={1000}
                                        onChange={(event) => update(field.id, field.type === "multi_select" ? [event.target.value].filter(Boolean) : event.target.value)}
                                    />
                                ) : null}
                            </>
                        )}
                    </fieldset>
                ))}
                {question.allowFreeform !== false ? <Input.TextArea value={notes} aria-label={text("notes")} placeholder={text("notes")} maxLength={2000} onChange={(event) => setNotes(event.target.value)} /> : null}
            </div>
            <div className="flex flex-wrap gap-2">
                <Button disabled={disabled} onClick={() => setValues(agentQuestionDefaults(fields))}>
                    {text("recommended")}
                </Button>
                <Button type="primary" htmlType="submit" disabled={disabled || !complete}>
                    {text("submit")}
                </Button>
            </div>
        </form>
    );
}
