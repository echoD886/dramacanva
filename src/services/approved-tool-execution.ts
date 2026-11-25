import { nanoid } from "nanoid";
import { quoteLogicalModel } from "./api/logical-models";
import { prepareBackendToolGenerationTask, parseBackendGenerationResult, type runBackendToolGenerationTask } from "./api/generation-task";
import { createGenerationTask, waitForGenerationTask } from "./api/task-center";
import type { CreativeQuote } from "@/lib/creation/creative-agent-contract";
import { getActiveUserScope } from "@/lib/user-scope";
import { logicalModelIDForConfig, resolveModelRequestConfig } from "@/stores/use-config-store";
import { currentLocaleText as t } from "@/i18n/current-locale-text";
import { formatCredits } from "@/constant/credits";
import type { MessageKey } from "@/i18n/messages";

type Request = Parameters<typeof runBackendToolGenerationTask>[0];
type StageQuote = { model: string; quantity: number; amountMicrocredits: number; estimated: boolean; expiresAt: string };
type Submission = { id: string; quote: StageQuote; approvedAt?: string };
type Pending = { submission: Submission; request: Request; externalBilling: boolean; resolve: () => void; reject: (error: Error) => void };
export type ApprovedToolExecutionState = { quote?: CreativeQuote; busy: boolean; error?: string };

// A displayed quote expires after this long so the user never approves a stale price.
const QUOTE_TTL_MS = 10 * 60_000;

type ExecutionApi = {
    quote: typeof quoteLogicalModel;
    create: typeof createGenerationTask;
};

// Only this boundary approves and executes quoted tasks. Pipeline code never grants approval.
// The legacy /creation-runs lease endpoints were retired with the cloud Agent (they return 410),
// so each stage is quoted from the model catalog, held until the user approves, then created as
// a normal task; the backend still enforces balance and pricing when the task is created.
export class ApprovedToolExecution {
    private runId = `plugin:${nanoid()}`;
    private scope = getActiveUserScope();
    private pending = new Map<string, Pending>();
    private disposed = false;
    private busy = false;
    private error?: string;
    private stopReason?: string;
    private controller = new AbortController();

    constructor(private options: {
        clientKey: string; runId?: string; identity: Record<string, string>;
        signal: AbortSignal; onRun: (id: string) => void;
        onState: (state: ApprovedToolExecutionState) => void;
    }, private api: ExecutionApi = { quote: quoteLogicalModel, create: createGenerationTask }, private waitTask = waitForGenerationTask) {
        options.signal.addEventListener("abort", this.abort, { once: true });
        if (options.runId) this.runId = options.runId;
    }

    private assertLive() {
        if (this.disposed || this.options.signal.aborted || this.scope !== getActiveUserScope() || this.controller.signal.aborted) throw new DOMException(this.stopReason || t("canvasExtra.critiquePayment.stoppedRetry"), "AbortError");
    }

    execute = async (request: Request) => {
        // A control/quote failure must also unblock sibling stages waiting for approval.
        // Model task failures below keep the pipeline's existing partial-result handling.
        const task = await this.submit(request).catch((error: unknown) => {
            this.abort(error);
            throw new DOMException(error instanceof Error ? error.message : t("canvasExtra.critiquePayment.submissionFailed"), "AbortError");
        });
        if (this.scope === getActiveUserScope()) request.onTaskCreated?.(task);
        this.assertLive();
        const completed = await this.waitTask(task.id, { initialTask: task, signal: this.controller.signal, onTextDelta: request.onDelta });
        this.assertLive();
        const result = parseBackendGenerationResult(completed);
        return { content: result.text || "", toolCalls: result.toolCalls || [], ...(result.reasoning ? { reasoning: result.reasoning } : {}) };
    };

    private async quoteStage(request: Request): Promise<StageQuote> {
        const logicalModelId = logicalModelIDForConfig(request.config);
        const fallback = { model: request.config.model, quantity: 1, amountMicrocredits: 0, estimated: true, expiresAt: new Date(Date.now() + QUOTE_TTL_MS).toISOString() };
        if (!logicalModelId) return fallback;
        const { quote } = await this.api.quote(logicalModelId, { capability: "text" }, this.controller.signal);
        return { ...fallback, quantity: quote.quantity || 1, amountMicrocredits: quote.amountMicrocredits, estimated: quote.estimated };
    }

    private async submit(request: Request) {
        this.assertLive();
        this.options.onRun(this.runId);
        const stage = request.metadata?.stage;
        if (!stage) throw new Error(t("canvasExtra.critiquePayment.stageMissing"));
        const taskInput = prepareBackendToolGenerationTask(request);
        const submission: Submission = { id: `${this.runId}:${stage}`, quote: await this.quoteStage(request) };
        this.assertLive();
        await new Promise<void>((resolve, reject) => {
            const externalBilling = !logicalModelIDForConfig(request.config) && !resolveModelRequestConfig(request.config, request.config.model).channelId;
            this.pending.set(stage, { submission, request, externalBilling, resolve, reject });
            this.emit();
        });
        this.pending.delete(stage);
        this.emit();
        this.assertLive();
        return this.api.create(taskInput);
    }

    async approve(submissionIds: string[]) {
        if (this.busy || this.disposed || this.controller.signal.aborted) return;
        const ids = new Set(submissionIds);
        const batch = [...this.pending.values()].filter((item) => ids.has(item.submission.id) && !item.submission.approvedAt);
        if (batch.length !== ids.size) { this.error = t("canvasExtra.critiquePayment.quoteChanged"); this.emit(); return; }
        if (!batch.length) return;
        if (batch.some((item) => Date.parse(item.submission.quote.expiresAt) <= Date.now())) { this.error = t("canvasExtra.critiquePayment.quoteExpired"); this.emit(); return; }
        const approvedAt = new Date().toISOString();
        this.error = undefined;
        batch.forEach((item) => { item.submission = { ...item.submission, approvedAt }; item.resolve(); });
        this.emit();
    }

    async refresh() {
        if (this.busy || this.disposed || this.controller.signal.aborted) return;
        this.busy = true; this.error = undefined; this.emit();
        try {
            this.assertLive();
            for (const item of [...this.pending.values()]) {
                if (item.submission.approvedAt) continue;
                item.submission = { ...item.submission, quote: await this.quoteStage(item.request) };
                this.assertLive();
            }
        } catch (error) { this.error = error instanceof Error ? error.message : t("canvasExtra.critiquePayment.refreshFailed"); }
        finally { this.busy = false; this.emit(); }
    }

    relocalize() {
        this.emit();
    }

    private emit() {
        if (this.disposed || this.scope !== getActiveUserScope()) return;
        const items = [...this.pending.entries()].filter(([, item]) => !item.submission.approvedAt).map(([stage, item]) => ({ ...item.submission, stage }));
        const externalBilling = [...this.pending.values()].some((item) => !item.submission.approvedAt && item.externalBilling);
        const estimated = items.some((item) => item.quote.estimated);
        this.options.onState({ busy: this.busy, error: this.error, quote: items.length ? {
            id: items.map((item) => item.id).join(":"), title: t("canvasExtra.critiquePayment.title"),
            items: items.map((item) => ({ id: item.id, label: stageLabel(item.stage), model: item.quote.model, quantity: item.quote.quantity, specification: t(item.quote.estimated ? "canvasExtra.critiquePayment.specEstimated" : "canvasExtra.critiquePayment.spec", { amount: formatCredits(item.quote.amountMicrocredits) }) })),
            amountLabel: t(externalBilling ? estimated ? "canvasExtra.critiquePayment.amountEstimatedExternal" : "canvasExtra.critiquePayment.amountExternal" : estimated ? "canvasExtra.critiquePayment.amountEstimated" : "canvasExtra.critiquePayment.amount", { amount: formatCredits(items.reduce((sum, item) => sum + item.quote.amountMicrocredits, 0)) }),
            externalBilling,
            basis: t("canvasExtra.critiquePayment.basis"),
            expiresAt: items.map((item) => item.quote.expiresAt).sort()[0],
        } : undefined });
    }

    private abort = (reason?: unknown) => {
        if (!this.controller.signal.aborted && reason instanceof Error) this.stopReason = reason.message;
        this.controller.abort();
        for (const item of this.pending.values()) item.reject(new DOMException(this.stopReason || t("canvasExtra.critiquePayment.stopped"), "AbortError"));
    };
    dispose() {
        this.disposed = true; this.abort();
        this.options.signal.removeEventListener("abort", this.abort);
    }
}

function stageLabel(key: string) {
    const stageKeys: Record<string, MessageKey> = { analyze_art_scene: "canvasExtra.critiquePayment.stageScene", review_art_composition: "canvasExtra.critiquePayment.stageComposition", review_art_color: "canvasExtra.critiquePayment.stageColor", review_art_lighting: "canvasExtra.critiquePayment.stageLighting", review_art_structure: "canvasExtra.critiquePayment.stageStructure", aggregate_art_critique: "canvasExtra.critiquePayment.stageAggregate", ground_art_critique_issues: "canvasExtra.critiquePayment.stageGround", verify_art_critique: "canvasExtra.critiquePayment.stageVerify", generate_art_edit_prompts: "canvasExtra.critiquePayment.stageEditPrompts" };
    return t(stageKeys[key.replace(/^stage:/, "")] || "canvasExtra.critiquePayment.stageGeneric");
}
