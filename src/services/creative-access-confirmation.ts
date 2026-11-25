let confirm: (() => Promise<boolean>) | undefined;
export function registerCreativeAccessConfirmation(handler: () => Promise<boolean>) {
    confirm = handler;
    return () => {
        if (confirm === handler) confirm = undefined;
    };
}
export function requestCreativeAccessConfirmation() {
    return confirm?.() ?? Promise.resolve(false);
}
