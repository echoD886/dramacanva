import { useRef, useState, memo } from "react";
import { ImagePlus, X, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";
import type { MessageKey } from "@/i18n/messages";
import type { AIVideoTemplateSlot, UploadSlotState } from "@/types/ai-video-template";

type UploadSlotsProps = {
    replacement?: string;
    slots: AIVideoTemplateSlot[];
    slotStates: Record<number, UploadSlotState>;
    onPickFile: (index: number, file: File) => void;
    onRemovePhoto: (index: number) => void;
    attention?: boolean;
};

const DEFAULT_SLOT: AIVideoTemplateSlot = { name: "image1", labelKey: "aiVideoTemplates.slots.yourPhoto", kind: "image", required: true };

export function effectiveSlots(slots: AIVideoTemplateSlot[], replacement = "person") {
    const base = slots.length > 0 ? slots : [DEFAULT_SLOT];
    if (replacement === "background") return [{ ...DEFAULT_SLOT, labelKey: "aiVideoTemplates.replacePhoto.background" }];
    // Every performer keeps their own photo; the place photo always comes last.
    if (replacement === "person_background") return [...base, { ...DEFAULT_SLOT, name: "place", labelKey: "aiVideoTemplates.replacePhoto.background" }];
    return base;
}

export const UploadSlots = memo(function UploadSlots({ replacement = "person", slots, slotStates, onPickFile, onRemovePhoto, attention = false }: UploadSlotsProps) {
    const all = effectiveSlots(slots, replacement);
    const people = replacement === "person_background" ? all.length - 1 : all.length;
    const list = all.map((slot, index) => {
        const place = replacement === "person_background" && index === people;
        return { ...slot, labelKey: `aiVideoTemplates.replacePhoto.${place ? "background" : replacement === "person_background" ? "person" : replacement}`, ordinal: !place && people > 1 ? index + 1 : undefined };
    });
    return (
        <div className={`aivt-drops is-${Math.min(list.length, 3)}`} data-attention={attention || undefined}>
            {list.map((slot, index) => (
                <DropTile key={slot.name || index} slot={slot} ordinal={slot.ordinal} index={index} total={list.length} state={slotStates[index]} onPick={(file) => onPickFile(index, file)} onRemove={() => onRemovePhoto(index)} />
            ))}
        </div>
    );
});

function DropTile({ slot, ordinal, index, total, state, onPick, onRemove }: { slot: AIVideoTemplateSlot; ordinal?: number; index: number; total: number; state?: UploadSlotState; onPick: (file: File) => void; onRemove: () => void }) {
    const { t } = useI18n();
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);
    const label = slot.labelKey?.startsWith("aiVideoTemplates.replacePhoto.")
        ? `${t(slot.labelKey as MessageKey)}${ordinal ? ` ${ordinal}` : ""}`
        : total === 1
          ? t("aiVideoTemplates.slots.yourPhoto")
          : t("aiVideoTemplates.slots.photoN", { index: slot.index ?? index + 1 });
    const hasPhoto = Boolean(state?.previewUrl);
    const uploading = state?.status === "uploading";
    const failed = state?.status === "error";

    const take = (file?: File | null) => {
        if (file && file.type.startsWith("image/")) onPick(file);
    };

    return (
        <div
            className={`aivt-drop${hasPhoto ? " has-photo" : ""}${dragging ? " is-dragging" : ""}${failed ? " is-error" : ""}`}
            onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                take(e.dataTransfer.files?.[0]);
            }}
        >
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="aivt-drop-input"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(e) => {
                    take(e.target.files?.[0]);
                    e.target.value = "";
                }}
            />
            {hasPhoto && state ? (
                <>
                    <img className="aivt-drop-photo" src={state.previewUrl} alt={label} />
                    <span className="aivt-drop-tag">{label}</span>
                    {uploading && (
                        <span className="aivt-drop-status" role="status">
                            <Loader2 className="aivt-spin" aria-hidden="true" />
                            {state.progress > 0 && <span>{state.progress}%</span>}
                        </span>
                    )}
                    {failed && (
                        <span className="aivt-drop-status is-error" role="alert">
                            <AlertCircle aria-hidden="true" />
                            <span>{t("aiVideoTemplates.uploadFailed")}</span>
                        </span>
                    )}
                    <span className="aivt-drop-actions">
                        <button type="button" onClick={() => inputRef.current?.click()} aria-label={`${t("aiVideoTemplates.replacePhoto")} · ${label}`} title={t("aiVideoTemplates.replacePhoto")}>
                            <RefreshCw aria-hidden="true" />
                        </button>
                        <button type="button" onClick={onRemove} aria-label={`${t("aiVideoTemplates.removePhoto")} · ${label}`} title={t("aiVideoTemplates.removePhoto")}>
                            <X aria-hidden="true" />
                        </button>
                    </span>
                </>
            ) : (
                <button type="button" className="aivt-drop-empty" onClick={() => inputRef.current?.click()}>
                    <ImagePlus aria-hidden="true" />
                    <span className="aivt-drop-label">{label}</span>
                    <span className="aivt-drop-hint">{t("aiVideoTemplates.dropPhotoOrClick")}</span>
                </button>
            )}
        </div>
    );
}
