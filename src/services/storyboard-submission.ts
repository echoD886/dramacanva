import { createGenerationTask, type CreateTaskInput } from "./api/task-center";

// Clicking generate confirms submission. The backend enforces balance and pricing.
export async function submitStoryboardTask(
    request: CreateTaskInput,
    options: {
        signal: AbortSignal;
        assertCurrent: () => void;
    },
    api = { create: createGenerationTask },
) {
    options.signal.throwIfAborted();
    options.assertCurrent();
    return api.create(request);
}
