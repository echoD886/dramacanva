import type { StoryboardPipelineStage } from "@/lib/canvas/canvas-storyboard-progress";
import type { MessageKey, MessageValues } from "./messages";

export function localizedPipelineStatus(
    stage: StoryboardPipelineStage,
    t: (key: MessageKey, values?: MessageValues) => string,
    number: (value: number) => string,
) {
    if (!stage.total) return t("scriptBatch.awaitStart");
    if (stage.success >= stage.total) return t("generationTask.succeeded");
    const values = { done: number(stage.success), total: number(stage.total) };
    if (stage.loading) return t("scriptBatch.progress", values);
    if (stage.failed) return t("scriptBatch.failedProgress", { ...values, failed: number(stage.failed) });
    if (stage.created) return t("scriptBatch.createdProgress", { ...values, created: number(stage.created) });
    return `${number(0)}/${number(stage.total)}`;
}
