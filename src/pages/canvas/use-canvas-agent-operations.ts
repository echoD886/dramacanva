import { nodeGenerationPrompt } from "@/lib/canvas/generation-contract";
import { type Dispatch, type SetStateAction } from "react";

import type { CanvasNodeGenerationMode } from "@/components/canvas/canvas-node-prompt-panel";
import { type CanvasAgentOp } from "@/lib/canvas/canvas-agent-ops";
import { createGenerationRetryContext } from "@/lib/canvas/canvas-project-generation";
import { subscribeGenerationTasks, type GenerationTask } from "@/services/api/task-center";
import { persistCanvasAgentGenerationContinuationEffect } from "@/services/canvas-generation-consumer";
import { consumeGenerationTaskAgent } from "@/services/project-asset-sync";
import type { CanvasNodeData } from "@/types/canvas";
import { currentLocaleText } from "@/i18n/current-locale-text";

import type { CanvasNodeGenerationOptions } from "./use-canvas-generation-executor";

export type CanvasAgentGenerationContext = { conversationId?: string; messageId?: string; source?: "online" | "local" };
type CanvasAgentGenerationContinuation = NonNullable<NonNullable<CanvasNodeData["metadata"]>["agentGenerationContinuation"]>;
type CanvasAgentGenerationOptions = Pick<CanvasNodeGenerationOptions, "context" | "retryContext" | "onTaskUpdate" | "skipDuplicateConfirmation">;
type CanvasAgentGenerationContinuationDependencies = {
    consumeAgent?: typeof consumeGenerationTaskAgent;
    persistContinuation?: typeof persistCanvasAgentGenerationContinuationEffect;
    projectId?: string;
    nodeId?: string;
    previousNodes?: CanvasNodeData[];
    nodesRef?: { current: CanvasNodeData[] };
    setNodes?: Dispatch<SetStateAction<CanvasNodeData[]>>;
};

type RunCanvasAgentGenerationOpsInput = {
    generationOps: Array<Extract<CanvasAgentOp, { type: "run_generation" }>>;
    nodes: CanvasNodeData[];
    context?: CanvasAgentGenerationContext;
    generate: (nodeId: string, mode: CanvasNodeGenerationMode, prompt: string, options: CanvasAgentGenerationOptions) => Promise<void>;
    subscribeTasks?: (ids: readonly string[], listener: (task: GenerationTask) => void) => () => void;
    consumeTask?: typeof consumeGenerationTaskAgent;
    resumeAgent?: (task: GenerationTask) => Promise<void>;
    onContinuation?: (nodeId: string, continuation: CanvasAgentGenerationContinuation) => Promise<void> | void;
};

export async function runCanvasAgentGenerationOps({
    generationOps,
    nodes,
    context,
    generate,
    subscribeTasks = subscribeGenerationTasks,
    consumeTask = consumeGenerationTaskAgent,
    resumeAgent = async () => undefined,
    onContinuation,
}: RunCanvasAgentGenerationOpsInput) {
    const observations = new Map<string, Promise<void>>();
    const observe = (taskId: string, nodeId: string, continuationIdPromise?: Promise<string>) => {
        const existing = observations.get(taskId);
        if (existing) return existing;
        const observation = new Promise<void>((resolve, reject) => {
            let unsubscribe: (() => void) | undefined;
            let settled = false;
            unsubscribe = subscribeTasks([taskId], (task) => {
                if (settled || (task.status !== "succeeded" && task.status !== "failed" && task.status !== "cancelled")) return;
                settled = true;
                queueMicrotask(() => {
                    void (async () => {
                        const taskContext = {
                            conversationId: task.clientContext?.conversationId || context?.conversationId,
                            messageId: task.clientContext?.messageId || context?.messageId,
                        };
                        const continuationId = await (continuationIdPromise ?? canvasAgentGenerationContinuationId(task.clientContext?.nodeId || nodeId, taskContext));
                        const continuation: CanvasAgentGenerationContinuation = {
                            id: continuationId,
                            taskId: task.id,
                            ...(taskContext.conversationId ? { conversationId: taskContext.conversationId } : {}),
                            ...(taskContext.messageId ? { messageId: taskContext.messageId } : {}),
                            ...(context?.source ? { source: context.source } : {}),
                            status: task.status === "succeeded" ? "pending" : "failed",
                        };
                        if (task.status !== "succeeded") {
                            await onContinuation?.(nodeId, continuation);
                            await resumeAgent(task);
                            return;
                        }
                        await consumeTask(task, continuationId, async (effect?: { effectKey?: string }) => {
                            await onContinuation?.(nodeId, {
                                ...continuation,
                                status: "completed",
                                ...(effect?.effectKey ? { effectKey: effect.effectKey } : {}),
                            });
                            await resumeAgent(task);
                        });
                    })()
                        .then(resolve, reject)
                        .finally(() => unsubscribe?.());
                });
            });
        });
        observations.set(taskId, observation);
        return observation;
    };

    if (!generationOps.length) {
        const taskNodes = nodes.filter((node) => node.metadata?.agentGenerationContinuation?.status === "pending" && (node.metadata?.taskId || node.metadata.agentGenerationContinuation.taskId));
        await Promise.all(
            taskNodes.map((node) => {
                const continuation = node.metadata!.agentGenerationContinuation!;
                return observe(node.metadata?.taskId || continuation.taskId, node.id, Promise.resolve(continuation.id));
            }),
        );
        return;
    }

    await Promise.all(
        generationOps.map(async (op) => {
            const target = nodes.find((node) => node.id === op.nodeId);
            const prompt = op.prompt?.trim() ? op.prompt : (target ? nodeGenerationPrompt(target) : "");
            const retryOf = op.retry ? target?.metadata?.taskId : undefined;
            if (op.retry && !retryOf) throw new Error(currentLocaleText("canvasExtra.operations.retryUnavailable"));
            const retryContext = retryOf ? await createGenerationRetryContext(retryOf, target?.metadata?.attemptGroupId) : undefined;
            const continuationIdPromise = canvasAgentGenerationContinuationId(op.nodeId, context);
            let observation: Promise<void> | undefined;
            let continuationTaskId = "";
            const generationPromise = generate(op.nodeId, op.mode || target?.metadata?.generationMode || "image", prompt, {
                context: context ? {
                    conversationId: context.conversationId,
                    messageId: context.messageId,
                    ...(context.source === "online" ? { sourceCode: "cloud-agent" as const } : {}),
                } : undefined,
                skipDuplicateConfirmation: true,
                ...(retryContext ? { retryContext } : {}),
                onTaskUpdate: (task) => {
                    if (continuationTaskId) return;
                    continuationTaskId = task.id;
                    observation = observe(task.id, op.nodeId, continuationIdPromise);
                    void continuationIdPromise.then((continuationId) => {
                        onContinuation?.(op.nodeId, {
                            id: continuationId,
                            taskId: task.id,
                            ...(context?.conversationId ? { conversationId: context.conversationId } : {}),
                            ...(context?.messageId ? { messageId: context.messageId } : {}),
                            ...(context?.source ? { source: context.source } : {}),
                            status: "pending",
                        });
                    });
                },
            });
            await generationPromise;
            if (observation) await observation;
        }),
    );
}

export async function consumeCanvasAgentGenerationContinuation(
    task: GenerationTask,
    continuation: CanvasAgentGenerationContinuation,
    onCompleted: (continuation: CanvasAgentGenerationContinuation, signal?: AbortSignal) => Promise<void> | void,
    dependencies: CanvasAgentGenerationContinuationDependencies = {},
    signal?: AbortSignal,
) {
    if (continuation.status !== "pending" || continuation.taskId !== task.id || task.status !== "succeeded") return task;
    const consumeAgent = dependencies.consumeAgent ?? consumeGenerationTaskAgent;
    return consumeAgent(
        task,
        continuation.id,
        async ({ effectKey, signal: leaseSignal }) => {
            const completed = { ...continuation, status: "completed" as const, effectKey };
            if (dependencies.projectId && dependencies.nodeId && dependencies.nodesRef && dependencies.setNodes) {
                await (dependencies.persistContinuation ?? persistCanvasAgentGenerationContinuationEffect)({
                    projectId: dependencies.projectId,
                    nodeId: dependencies.nodeId,
                    continuation: completed,
                    effectKey,
                    signal: leaseSignal,
                    previousNodes: dependencies.previousNodes,
                    nodesRef: dependencies.nodesRef,
                    setNodes: dependencies.setNodes,
                });
            }
            await onCompleted(completed, leaseSignal);
        },
        { signal },
    );
}

async function canvasAgentGenerationContinuationId(nodeId: string, context?: CanvasAgentGenerationContext) {
    const seed = new TextEncoder().encode(`canvas-agent-generation\0${context?.source || ""}\0${context?.conversationId || ""}\0${context?.messageId || ""}\0${nodeId}`);
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", seed));
    return `agent:${Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}
