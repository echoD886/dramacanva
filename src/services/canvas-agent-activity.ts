import type { AgentEvent, CanvasAgentActivity, CanvasAgentActivityRun, subscribeAgentEvents } from "./api/agent";

type Options = {
    discover: (after: string, signal: AbortSignal) => Promise<CanvasAgentActivity>;
    subscribe: typeof subscribeAgentEvents;
    sync: { receive: (event: AgentEvent) => void; reconcile: () => void };
    revision: () => number | undefined;
    onEditing: (editing: boolean) => void;
    onError: (error: unknown) => void;
    visible: () => boolean;
    onVisibility: (listener: () => void) => () => void;
    pollMs?: number;
};
type Run = { seq: number; revision: number; latest: number; stop?: () => void; updatedAt: string; status: string; cleanup: boolean };
const active = (run: Run) => run.cleanup || ["idle", "queued", "running", "waiting_approval"].includes(run.status);

/** Discovery survives short-lived runs; streams keep independent sequence cursors. */
export function createCanvasAgentActivity(options: Options) {
    const runs = new Map<string, Run>();
    let cursor = "";
    let disposed = false;
    let generation = 0;
    let request: AbortController | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const editing = () => options.onEditing([...runs.values()].some((run) => run.cleanup || ["queued", "running"].includes(run.status)));
    const connect = (id: string, run: Run) => {
        if (run.stop || disposed || !options.visible()) return;
        const epoch = generation;
        let stopped = false;
        let unsubscribe: (() => void) | undefined;
        const stop = () => {
            stopped = true;
            unsubscribe?.();
            if (run.stop === stop) run.stop = undefined;
        };
        run.stop = stop;
        unsubscribe = options.subscribe(
            id,
            (event) => {
                if (disposed || stopped || epoch !== generation || event.runId !== id) return;
                if (event.type === "run_status" && typeof event.payload.revision === "number" && event.payload.revision < run.revision) return;
                if (event.seq > 0) {
                    if (event.seq <= run.seq) return;
                    if (event.seq !== run.seq + 1) options.sync.reconcile();
                    run.seq = event.seq;
                }
                options.sync.receive(event);
                if (event.type === "run_status") {
                    if (typeof event.payload.status === "string") run.status = event.payload.status;
                    run.cleanup = Boolean(event.payload.cleanupPending);
                    if (typeof event.payload.revision === "number") run.revision = event.payload.revision;
                    if (!active(run)) stop();
                    editing();
                }
            },
            {
                after: run.seq,
                onError: (error) => {
                    if (disposed || stopped || epoch !== generation) return;
                    stop();
                    options.sync.reconcile();
                    options.onError(error);
                },
            },
        );
        if (stopped) unsubscribe();
    };
    const observe = (item: CanvasAgentActivityRun) => {
        let run = runs.get(item.id);
        const changed = !run || item.revision > run.revision;
        if (!run) {
            run = { seq: 0, revision: item.revision, latest: item.latestEventSeq, updatedAt: item.updatedAt, status: item.status, cleanup: item.cleanupPending };
            runs.set(item.id, run);
        } else if (item.revision >= run.revision) {
            Object.assign(run, { revision: item.revision, latest: item.latestEventSeq, updatedAt: item.updatedAt, status: item.status, cleanup: item.cleanupPending });
        }
        if (active(run) || changed || run.seq < run.latest) connect(item.id, run);
    };
    const poll = async () => {
        if (disposed || !options.visible() || request) return;
        const controller = new AbortController();
        request = controller;
        const epoch = generation;
        try {
            let more = true;
            while (more && !controller.signal.aborted) {
                const page = await options.discover(cursor, controller.signal);
                if (disposed || epoch !== generation || controller.signal.aborted) return;
                page.runs.forEach(observe);
                // The snapshot path shares the patch queue and existing three-way merge.
                // It also catches writes whose run/events have left the retention window.
                if (page.requiresRefresh || page.canvasRevision > (options.revision() ?? -1)) options.sync.reconcile();
                cursor = page.nextCursor;
                more = page.hasMore;
            }
            for (const [id, run] of runs) {
                if (!active(run) && Date.parse(run.updatedAt) < Date.now() - 600_000) {
                    run.stop?.();
                    runs.delete(id);
                }
            }
            editing();
        } catch (error) {
            if (!controller.signal.aborted && !disposed) options.onError(error);
        } finally {
            if (request === controller) request = undefined;
            if (!disposed && epoch === generation && options.visible())
                timer = setTimeout(() => {
                    timer = undefined;
                    void poll();
                }, options.pollMs ?? 2000);
        }
    };
    const pause = () => {
        generation++;
        if (timer) clearTimeout(timer);
        timer = undefined;
        request?.abort();
        request = undefined;
        runs.forEach((run) => {
            run.stop?.();
            run.stop = undefined;
        });
        options.onEditing(false);
    };
    const removeVisibility = options.onVisibility(() => {
        pause();
        if (options.visible()) {
            options.sync.reconcile();
            void poll();
        }
    });
    void poll();
    return {
        dispose() {
            if (disposed) return;
            disposed = true;
            pause();
            removeVisibility();
            runs.clear();
        },
    };
}
