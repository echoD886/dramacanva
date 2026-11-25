import { isCanvasNodeGenerating } from "@/lib/canvas/canvas-node-task-state";
import { useI18n } from "@/i18n/use-i18n";
import { MODEL_STARTER_COPY } from "@/pages/showcase/model-starter-copy";
import type { CanvasNodeData, CanvasVideoEditOperation } from "@/types/canvas";
import "./canvas-node-starter-hints.css";

export const STARTER_HINT_EVENT = "canvas-starter-hint";
export type StarterHintAction = { nodeId: string; operation?: CanvasVideoEditOperation; upload: boolean };
export function CanvasNodeStarterHints({ node }: { node: CanvasNodeData }) {
    const { locale } = useI18n();
    const copy = MODEL_STARTER_COPY[locale as keyof typeof MODEL_STARTER_COPY] || MODEL_STARTER_COPY["en-US"];
    const key = node.metadata?.modelStarterKey;
    if (!key || node.metadata?.content || isCanvasNodeGenerating(node)) return null;
    const entries: { label: string; operation?: CanvasVideoEditOperation; upload: boolean }[] =
        key === "gpt-image"
            ? [
                  { label: copy.hintTextToImage, upload: false },
                  { label: copy.hintEditImage, upload: true },
              ]
            : key === "shot-breakdown" || key === "segment-remake"
              ? [{ label: copy.hintUploadVideo, upload: true }]
              : [
                    { label: copy.hintTextToVideo, operation: "text_to_video", upload: false },
                    { label: copy.hintFirstFrame, operation: "image_to_video", upload: true },
                    ...(key === "minimax-h3" ? [] : [{ label: copy.hintReferenceVideo, operation: "reference_to_video" as const, upload: true }]),
                ];
    return (
        <div className="canvas-starter-hints" data-canvas-no-drag onPointerDown={(event) => event.stopPropagation()}>
            <span className="canvas-starter-hints-label">{copy.tryLabel}</span>
            {entries.map((entry) => (
                <button
                    key={entry.label}
                    type="button"
                    className="canvas-starter-hints-button"
                    onClick={() => {
                        window.dispatchEvent(new CustomEvent<StarterHintAction>(STARTER_HINT_EVENT, { detail: { nodeId: node.id, operation: entry.operation, upload: entry.upload } }));
                    }}
                >
                    {entry.label}
                </button>
            ))}
        </div>
    );
}
