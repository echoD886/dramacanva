import type { BootstrapPayload } from "@/services/api/bootstrap";

type SessionRuntime = {
    apply: (payload: BootstrapPayload) => Promise<void>;
    invalidate: () => void;
    revision: () => number;
};

let runtime: SessionRuntime | undefined;

export function registerSessionRuntime(value: SessionRuntime) {
    runtime = value;
}

export function getSessionRuntime() {
    return runtime;
}
