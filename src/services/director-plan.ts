import { quoteLogicalModel, type LogicalModelQuote } from "./api/logical-models";
import { createGenerationTask, waitForGenerationTask, type CreateTaskInput } from "./api/task-center";
import type { DirectorScene } from "@/types/director";
import { currentLocaleText as t } from "@/i18n/current-locale-text";
import { compilePlanDtoToPrevis } from "@/lib/canvas/director/director-plan-compiler";
import { PREVIS_TEMPLATES } from "@/lib/canvas/director/director-asset-registry";
import { applyPrevisEditIntents } from "@/lib/canvas/director/director-plan-edit";

type PlanInput = { canvasId: string; nodeId?: string; scene: DirectorScene; modelId: string; prompt: string; sourceNodeId: string; sourceRowId: string; protocol?: "previs-v2" | "previs-v2-edit" };
type PlanOptions = { signal: AbortSignal; assertCurrent: () => void; confirm: (quote: LogicalModelQuote) => Promise<boolean> };
type PlanApi = { quote: typeof quoteLogicalModel; create: typeof createGenerationTask; wait: typeof waitForGenerationTask };
type EditResult = { scene: DirectorScene; warnings: string[] };
export function generateDirectorPlan(input: PlanInput & { protocol: "previs-v2-edit" }, options: PlanOptions, api?: PlanApi): Promise<EditResult | null>;
export function generateDirectorPlan(input: PlanInput & { protocol?: "previs-v2" }, options: PlanOptions, api?: PlanApi): Promise<DirectorScene | null>;
export function generateDirectorPlan(input: PlanInput, options: PlanOptions, api?: PlanApi): Promise<DirectorScene | EditResult | null>;
export async function generateDirectorPlan(input: PlanInput, options: PlanOptions, api: PlanApi = { quote: quoteLogicalModel, create: createGenerationTask, wait: waitForGenerationTask }) {
    const { quote } = await api.quote(input.modelId, { capability: "text", operation: "canvas_text" }, options.signal);
    options.assertCurrent();
    if (!(await options.confirm(quote))) return null;
    options.assertCurrent();
    const request: CreateTaskInput & { confirmedQuote: LogicalModelQuote } = {
        projectId: input.canvasId, type: "canvas_text", operation: "director_plan", logicalModelId: input.modelId, prompt: input.prompt, confirmedQuote: quote,
        input: { mode: "text", directorSceneId: input.scene.id, directorNodeId: input.nodeId, directorSnapshot: input.scene, sourceNodeId: input.sourceNodeId, sourceRowId: input.sourceRowId, ...(input.protocol ? { protocol: input.protocol } : {}) },
    };
    const task = await api.create(request);
    let latest = task;
    const result = await api.wait(task.id, { initialTask: task, signal: options.signal, onTaskUpdate: (value) => { latest = value; } }).catch((error) => {
        if (latest.status === "failed" || latest.status === "cancelled") throw new Error(t(latest.billing?.status === "refunded" ? "previs.ai.refunded" : "previs.ai.failed"));
        throw error;
    });
    options.assertCurrent();
    if (result.status !== "succeeded") throw new Error(t(result.billing?.status === "refunded" ? "previs.ai.refunded" : "previs.ai.failed"));
    const output = JSON.parse(result.resultJson || "{}");
    if (input.protocol === "previs-v2-edit") {
        if (output.sceneId !== input.scene.id || output.edit?.baseRevision !== input.scene.previs?.revision) throw new Error(t("previs.ai.changed"));
        return applyPrevisEditIntents(input.scene, output.edit);
    }
    if (input.protocol === "previs-v2") {
        if (output.sceneId !== input.scene.id) throw new Error("预演计划不属于当前场景");
        return compilePlanDtoToPrevis(output.plan, PREVIS_TEMPLATES, { scene: input.scene }).scene;
    }
    const scene = output.scene as DirectorScene | undefined;
    if (!scene || scene.id !== input.scene.id || scene.version !== 1 || !Array.isArray(scene.objects) || !Array.isArray(scene.lights) || !scene.shots?.some((shot) => shot.id === scene.activeShotId && scene.cameras?.some((camera) => camera.id === shot.cameraId))) throw new Error(t("previs.ai.failed"));
    return input.scene.previs ? { ...scene, previs: input.scene.previs } : scene;
}
