import { memo, useId, useMemo, useState } from "react";
import { CanvasResourceMentionTextarea } from "@/components/canvas/canvas-resource-mention-textarea";
import type { CanvasResourceReference } from "@/lib/canvas/canvas-resource-references";
import { useI18n } from "@/i18n/use-i18n";
import type { AIVideoTemplateClip, AIVideoTemplatePrompt, AIVideoTemplateSlot, UploadSlotState } from "@/types/ai-video-template";

export const EXTRA_MAX = 200;

type PromptCardProps = {
    prompt: AIVideoTemplatePrompt;
    activeClip: AIVideoTemplateClip;
    slots: AIVideoTemplateSlot[];
    slotStates: Record<number, UploadSlotState>;
};

/** Slot index for an image reference ("image2" → the slot named image2, else the 2nd slot). */
function slotIndexFor(ref: { slot?: string; token: string }, slots: AIVideoTemplateSlot[]) {
    const named = slots.findIndex((slot) => slot.name && slot.name === ref.slot);
    if (named >= 0) return named;
    const n = Number(/(\d+)/.exec(ref.slot || ref.token)?.[1]);
    return Number.isFinite(n) && n > 0 ? n - 1 : 0;
}

/**
 * Public template prompt rendered with the app's own @-mention editor (read-only): the same inline chips
 * (thumbnail + name) and the same large hover preview as the home/canvas composer.
 * @Video = the selected clip; @ImageN = the user's photo for that slot (the editor's empty chip until uploaded).
 * Shows the localized display copy when the backend provides it; otherwise the English prompt, labelled as such.
 */
export const PromptCard = memo(function PromptCard({ prompt, activeClip, slots, slotStates }: PromptCardProps) {
    const { t, locale } = useI18n();
    const [expanded, setExpanded] = useState(false);
    const textId = useId();
    const display = prompt.displayText?.trim() || prompt.text;
    const englishOnly = !prompt.displayText?.trim() && !locale.startsWith("en");

    const references = useMemo<CanvasResourceReference[]>(
        () =>
            prompt.references
                .filter((ref) => /^@\w+$/.test(ref.token))
                .map((ref) => {
                    const label = ref.token.slice(1);
                    if (ref.kind === "video") {
                        return { id: `aivt-${label}`, nodeId: "", kind: "video", label, title: activeClip.title || label, previewUrl: activeClip.coverUrl, mediaUrl: activeClip.previewUrl, durationMs: activeClip.durationMs, active: true };
                    }
                    const index = slotIndexFor(ref, slots);
                    const slot = slots[index];
                    const slotLabel = slots.length <= 1 ? t("aiVideoTemplates.slots.yourPhoto") : t("aiVideoTemplates.slots.photoN", { index: slot?.index ?? index + 1 });
                    return { id: `aivt-${label}`, nodeId: "", kind: "image", label, title: slotLabel, previewUrl: slotStates[index]?.previewUrl, active: true };
                }),
        [prompt.references, activeClip, slots, slotStates, t],
    );

    const long = display.length > 90;

    return (
        <section className="aivt-glass aivt-prompt" aria-labelledby={`${textId}-label`}>
            <p id={`${textId}-label`} className="aivt-prompt-head">
                <span className="aivt-label">{t("aiVideoTemplates.promptLabel")}</span>
                {englishOnly && <span className="aivt-prompt-note">{t("aiVideoTemplates.promptEnglishNote")}</span>}
            </p>
            <div id={textId} lang={englishOnly ? "en" : undefined} className={`aivt-prompt-body${long && !expanded ? " is-clamped" : ""}`}>
                <CanvasResourceMentionTextarea
                    value={display}
                    references={references}
                    onChange={NOOP}
                    readOnly
                    highlightLabels
                    containerClassName="h-auto"
                    className="aivt-prompt-text"
                    style={{ color: "var(--aivt-fg-2)" }}
                    aria-label={t("aiVideoTemplates.promptLabel")}
                />
            </div>
            {long && (
                <button type="button" className="aivt-link-btn" aria-expanded={expanded} aria-controls={textId} onClick={() => setExpanded((v) => !v)}>
                    {expanded ? t("aiVideoTemplates.showLess") : t("aiVideoTemplates.showFullPrompt")}
                </button>
            )}
        </section>
    );
});

const NOOP = () => undefined;

export function ExtraField({ id, value, length, onChange }: { id: string; value: string; length: number; onChange: (value: string) => void }) {
    const { t } = useI18n();
    return (
        <div className="aivt-extra">
            <div className="aivt-extra-head">
                <label htmlFor={id}>{t("aiVideoTemplates.addDetails")}</label>
                <span aria-live="polite">
                    {length}/{EXTRA_MAX}
                </span>
            </div>
            <textarea id={id} rows={2} value={value} placeholder={t("aiVideoTemplates.extraPlaceholder")} onChange={(e) => onChange(Array.from(e.target.value).slice(0, EXTRA_MAX).join(""))} />
        </div>
    );
}
