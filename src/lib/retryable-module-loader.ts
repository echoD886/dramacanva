/** Share concurrent imports without retaining a failed network request forever. */
export function createRetryableModuleLoader<T>(load: () => Promise<T>) {
    let request: Promise<T> | undefined;
    return () => {
        if (!request) {
            request = Promise.resolve()
                .then(load)
                .catch((error: unknown) => {
                    request = undefined;
                    throw error;
                });
        }
        return request;
    };
}
