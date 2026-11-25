import { lightDescriptionStage } from "@/lib/canvas/director/director-description-staging";
import { quoteLogicalModel, type LogicalModelQuote } from "./api/logical-models";
import { createGenerationTask, waitForGenerationTask, type CreateTaskInput } from "./api/task-center";
import type { DirectorScene } from "@/types/director";
import { compilePlanDtoToPrevis } from "@/lib/canvas/director/director-plan-compiler";
import { PREVIS_TEMPLATES } from "@/lib/canvas/director/director-asset-registry";
import type { PrevisPlanActor } from "@/lib/canvas/director/director-plan-dto";

export async function generateDirectorDescription(
    input: { description: string; canvasId: string; modelId: string; protocol?: "previs-v2"; actors?: PrevisPlanActor[] },
    options: { signal: AbortSignal; assertCurrent: () => void; confirm: (quote: LogicalModelQuote) => Promise<boolean>; failed: (taskId: string, refunded: boolean) => void },
    api = { quote: quoteLogicalModel, create: createGenerationTask, wait: waitForGenerationTask },
) {
    if (!input.description.trim() || input.description.length > 2000 || !input.canvasId || !input.modelId) throw new Error("Invalid director description request");
    const { quote } = await api.quote(input.modelId, { capability: "text", operation: "canvas_text" }, options.signal);
    options.signal.throwIfAborted();
    options.assertCurrent();
    if (!(await options.confirm(quote))) return undefined;
    options.signal.throwIfAborted();
    options.assertCurrent();
    const request: CreateTaskInput & { confirmedQuote: LogicalModelQuote } = {
        projectId: input.canvasId,
        type: "canvas_text",
        operation: "director_scene",
        logicalModelId: input.modelId,
        prompt: input.description,
        confirmedQuote: quote,
        input: { mode: "text", ...(input.protocol ? { protocol: input.protocol, ...(input.actors !== undefined ? { actors: input.actors } : {}) } : {}) },
    };
    const task = await api.create(request);
    let latest = task;
    let result;
    try {
        result = await api.wait(task.id, {
            initialTask: task,
            signal: options.signal,
            onTaskUpdate: (value) => {
                latest = value;
            },
        });
    } catch (error) {
        options.signal.throwIfAborted();
        options.assertCurrent();
        if (latest.status !== "failed" && latest.status !== "cancelled") throw error;
        options.failed(task.id, latest.billing?.status === "refunded");
        return null;
    }
    options.signal.throwIfAborted();
    options.assertCurrent();
    if (result.status !== "succeeded") {
        options.failed(task.id, result.billing?.status === "refunded");
        return null;
    }
    let scene: DirectorScene;
    try {
        const output = JSON.parse(result.resultJson || "{}");
        if (input.protocol === "previs-v2") {
            if (typeof output.sceneId !== "string" || !output.sceneId) throw new Error("缺少预演场景 ID");
            scene = compilePlanDtoToPrevis(output.plan, PREVIS_TEMPLATES, { actors: input.actors, sceneId: output.sceneId }).scene;
        } else scene = output.scene;
    } catch {
        options.failed(task.id, result.billing?.status === "refunded");
        return null;
    }
    if (
        !scene ||
        scene.version !== 1 ||
        !Array.isArray(scene.objects) ||
        !Array.isArray(scene.shots) ||
        !Array.isArray(scene.lights) ||
        !Array.isArray(scene.cameras) ||
        !scene.shots.some((s) => s.id === scene.activeShotId) ||
        scene.shots.some((s) => !scene.cameras.some((c) => c.id === s.cameraId))
    ) {
        options.failed(task.id, result.billing?.status === "refunded");
        return null;
    }
    return lightDescriptionStage(scene, input.description, !scene.previs && scene.stageLook === "studio");
}
